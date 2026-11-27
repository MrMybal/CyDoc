"""Private business bridge and lifecycle for the native CyMCPSDK host.

No provider or MCP implementation lives here. The C++ Registry validates and
authorizes every public call. SQLite keeps existing jobs and output paths intact.
"""
import concurrent.futures
import contextlib
import hmac
import json
import os
from pathlib import Path
import secrets
import shutil
import sqlite3
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from uuid import uuid4
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from business import invoke

TERMINAL = {'Completed', 'Failed', 'Cancelled'}


def now():
    return datetime.now(timezone.utc).isoformat()


class OperationError(RuntimeError):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


class Context:
    def __init__(self, workspace, cancelled):
        self.workspace, self.cancelled = workspace, cancelled

    def check(self):
        if self.cancelled.is_set():
            raise OperationError('Cancelled', 'Operation cancelled.')

    def path(self, name):
        target = self.workspace / name
        target.parent.mkdir(parents=True, exist_ok=True)
        return target


class Jobs:
    def __init__(self, root, descriptor):
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.ownership = sqlite3.connect(self.root/'runtime.lock.sqlite3', timeout=0, check_same_thread=False)
        try:
            self.ownership.execute('BEGIN EXCLUSIVE')
        except sqlite3.OperationalError:
            self.ownership.close()
            raise OperationError('Busy', 'This job directory is already owned by a running Studio host.') from None
        self.db = sqlite3.connect(self.root/'state.sqlite3', check_same_thread=False)
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.execute('CREATE TABLE IF NOT EXISTS records(kind TEXT,id TEXT,value TEXT,PRIMARY KEY(kind,id))')
        identity = self.db.execute("SELECT value FROM records WHERE kind='settings' AND id='identity'").fetchone()
        if identity and json.loads(identity[0]).get('toolId') != descriptor['id']:
            self.db.close(); self.ownership.rollback(); self.ownership.close()
            raise OperationError('InvalidState', 'This data directory belongs to another application.')
        if not identity:
            with self.db:
                self.db.execute('INSERT INTO records VALUES(?,?,?)', ('settings', 'identity', json.dumps({'toolId': descriptor['id'], 'protocolVersion': '1.0'})))
        self.lock = threading.RLock()
        self.operations = {op['id']: op for op in descriptor['operations']}
        self.jobs = {key: json.loads(value) for key, value in self.db.execute("SELECT id,value FROM records WHERE kind='jobs'")}
        self.cancellations = {}
        for job in self.jobs.values():
            if job['state'] not in TERMINAL:
                job.update(state='Failed', finishedAt=now(), error={'code': 'Interrupted', 'message': 'The previous host stopped before completion; this job was not replayed.'})
                self.save(job)
        self.executor = concurrent.futures.ThreadPoolExecutor(max_workers=1, thread_name_prefix='studio-business')
        self.futures = {}

    def save(self, job):
        with self.lock, self.db:
            self.db.execute('INSERT OR REPLACE INTO records VALUES(?,?,?)', ('jobs', job['jobId'], json.dumps(job)))

    def submit(self, operation, parameters):
        if operation not in self.operations:
            raise OperationError('UnknownOperation', 'Unknown Studio operation.')
        identifier = str(uuid4())
        workspace = self.root/'Workspaces'/'cymcp'/identifier
        workspace.mkdir(parents=True)
        parameters = dict(parameters)
        # Stage on the submitting thread, before the caller can remove its input.
        if operation == 'import_asset':
            source = Path(parameters['source']).resolve(strict=True)
            if not source.is_file() or source.stat().st_size > 64*1024**2:
                raise OperationError('InvalidArgument', 'Import a regular file of at most 64 MiB.')
            staged = workspace/'inputs'/source.name
            staged.parent.mkdir()
            shutil.copyfile(source, staged)
            parameters['source'] = str(staged)
        job = {'jobId': identifier, 'operationId': operation, 'workspace': str(workspace),
               'parameters': parameters, 'state': 'Queued', 'outputs': None, 'error': None,
               'createdAt': now(), 'startedAt': None, 'finishedAt': None, 'progress': {'percent': 0}}
        with self.lock:
            self.jobs[identifier] = job
            self.cancellations[identifier] = threading.Event()
            self.save(job)
            self.futures[identifier] = self.executor.submit(self.execute, identifier)
        return {'jobId': identifier}

    def execute(self, identifier):
        with self.lock:
            job = self.jobs[identifier]
            context = Context(Path(job['workspace']), self.cancellations[identifier])
            job.update(state='Running', startedAt=now())
            self.save(job)
        try:
            context.check()
            result = invoke(job['operationId'], context, job['parameters'])
            context.check()
            with self.lock:
                job.update(state='Completed', outputs=result, progress={'percent': 100})
        except Exception as error:
            with self.lock:
                job.update(state='Cancelled' if getattr(error, 'code', '') == 'Cancelled' else 'Failed',
                           error={'code': getattr(error, 'code', 'OperationFailed'), 'message': str(error)})
        finally:
            inputs = Path(job['workspace'])/'inputs'
            # Only this newly created job's own staging directory is removed.
            if inputs.is_dir() and inputs.resolve().is_relative_to(self.root):
                shutil.rmtree(inputs)
            with self.lock:
                job['finishedAt'] = now()
                self.save(job)

    def dispatch(self, name, parameters):
        if name == 'submit':
            return self.submit(parameters['operationId'], parameters['parameters'])
        with self.lock:
            if name == 'cy_list_jobs':
                return {'jobs': json.loads(json.dumps(list(self.jobs.values())))}
            if name in ('cy_get_job', 'cy_cancel_job'):
                identifier = parameters['jobId']
                if identifier not in self.jobs:
                    raise OperationError('NotFound', 'Job not found.')
                job = self.jobs[identifier]
                if name == 'cy_cancel_job' and job['state'] not in TERMINAL:
                    if not self.operations[job['operationId']]['canCancel']:
                        raise OperationError('Unsupported', 'This write cannot be cancelled after submission.')
                    self.cancellations[identifier].set()
                return json.loads(json.dumps(job))
        submitted = self.submit(name, parameters)
        identifier = submitted['jobId']
        self.futures[identifier].result()
        job = self.dispatch('cy_get_job', submitted)
        if job['state'] != 'Completed':
            raise OperationError(job['error']['code'], job['error']['message'])
        return job['outputs']

    def close(self):
        for identifier, cancelled in self.cancellations.items():
            if self.operations[self.jobs[identifier]['operationId']]['canCancel']:
                cancelled.set()
        self.executor.shutdown(wait=True)
        self.db.close()
        self.ownership.rollback()
        self.ownership.close()


def executable():
    configured = os.environ.get('CYDOC_CYMCP_HOST')
    candidates = [Path(configured)] if configured else [
        Path(sys.executable).parent/'CyDocStudioHost.exe',
        Path(__file__).resolve().parents[3]/'.tmp/cymcp-native/Release/CyDocStudioHost.exe']
    for candidate in candidates:
        if candidate.is_file():
            return str(candidate.resolve())
    raise OperationError('HostNotBuilt', 'Build the native CyMCPSDK host with studio/desktop/build-native.ps1, or set CYDOC_CYMCP_HOST.')


class NativeHost:
    def __init__(self, data, *, chat=False, parent=0, language='en'):
        binary = executable()
        self.data = Path(data).resolve()
        manifest = Path(__file__).with_name('CyMCP.json')
        descriptor = json.loads(manifest.read_text('utf-8'))
        self.jobs = Jobs(self.data, descriptor)
        self.secret = secrets.token_hex(32)
        bridge_secret = secrets.token_hex(32)
        jobs = self.jobs
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_):
                pass

            def do_POST(self):
                if self.path != '/invoke' or not hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer '+bridge_secret):
                    self.send_error(403)
                    return
                try:
                    length = int(self.headers.get('Content-Length', 0))
                    if not 0 < length <= 8*1024**2:
                        raise OperationError('InvalidArgument', 'Invalid request size.')
                    request = json.loads(self.rfile.read(length))
                    value = jobs.dispatch(request['operation'], request['parameters'])
                    status = 200
                except Exception as error:
                    value = {'code': getattr(error, 'code', 'OperationFailed'), 'error': str(error)}
                    status = 400
                body = json.dumps(value).encode()
                with contextlib.suppress(ConnectionError):
                    self.send_response(status)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Content-Length', str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
        self.bridge = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.thread = threading.Thread(target=self.bridge.serve_forever, daemon=True)
        self.thread.start()
        self.environment = {**os.environ, 'CYDOC_BRIDGE_ORIGIN': 'http://127.0.0.1:'+str(self.bridge.server_port),
                            'CYDOC_BRIDGE_TOKEN': bridge_secret, 'CYDOC_HOST_TOKEN': self.secret}
        self.command = [binary, '--data', str(self.data), '--manifest', str(manifest)]
        self.process = None
        self.ready = None
        self.closed = False
        if chat:
            self.start(chat=True, parent=parent, language=language)

    def start(self, *, chat=False, parent=0, language='en'):
        ready_file = self.data/'host-ready.json'
        ready_file.unlink(missing_ok=True)
        (self.data/'assistant-window.json').unlink(missing_ok=True)
        self.log = (self.data/'host.log').open('a', encoding='utf-8')
        command = self.command+['--ready', str(ready_file), '--language', language]
        if chat:
            command += ['--chat', '--parent', str(parent)]
        self.process = subprocess.Popen(command, env=self.environment, stdout=self.log, stderr=self.log,
                                        creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        deadline = time.monotonic()+30
        while True:
            if self.process.poll() is not None or time.monotonic() > deadline:
                self.close()
                raise OperationError('HostFailed', 'CyMCPSDK host did not start. Read host.log in the private Studio data directory.')
            if ready_file.exists():
                try:
                    self.ready = json.loads(ready_file.read_text('utf-8'))
                    break
                except (ValueError, OSError):
                    pass  # The native private stream may still be publishing readiness.
            time.sleep(.03)
        return self.ready

    def request(self, value):
        if not self.ready or self.process.poll() is not None:
            raise OperationError('NotConnected', 'Start the native host first.')
        url = self.ready['endpoint'].removesuffix('/mcp')+'/v1'
        request = Request(url, json.dumps(value).encode(), headers={'Content-Type': 'application/json', 'Authorization': 'Bearer '+self.secret})
        try:
            with urlopen(request, timeout=190) as response:
                return json.load(response)
        except HTTPError as error:
            value = json.load(error)
            detail = value.get('error', value)
            if isinstance(detail, dict):
                raise OperationError(detail.get('code', 'OperationFailed'), detail.get('message', 'Studio operation failed.')) from None
            raise OperationError('OperationFailed', str(detail)) from None

    def run(self, arguments):
        return subprocess.call(self.command+arguments, env=self.environment)

    def close(self):
        if self.closed:
            return
        self.closed = True
        if self.process is not None and self.process.poll() is None:
            with contextlib.suppress(Exception):
                self.request({'command': 'stop'})
            try:
                self.process.wait(timeout=15)
            except subprocess.TimeoutExpired:
                self.process.terminate()
                self.process.wait(timeout=5)
        if hasattr(self, 'log'):
            self.log.close()
        self.bridge.shutdown()
        self.bridge.server_close()
        self.thread.join(timeout=2)
        self.jobs.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()
