"""The single Studio adapter for the installed CyInstaller process protocol."""
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
import json
import os
from pathlib import Path
import subprocess
import time
import threading

APP_ID = 'mrmybal.cydocstudio'


@dataclass
class EngineResult:
    operation: str
    code: int
    result: dict = field(default_factory=dict)
    diagnostic: str = ''

    @property
    def success(self):
        return self.code in (0, 100, 102, 103) and bool(self.result) and self.result.get('code') == self.code


class UpdateService:
    def __init__(self, installation_root=None, relaunch_arguments=()):
        self.root = Path(installation_root).resolve() if installation_root else None
        self.relaunch_arguments = list(relaunch_arguments)
        self.executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix='cyinstaller')
        self.pending = None
        self.window = None
        self.last = None
        self.confirmed = False
        self.startup_ok = False
        self.next_check = float('inf')
        self.process_lock = threading.Lock()
        self.process = None
        self.closing = False
        self.mode = 'development' if self.root is None else 'portable'
        if self.root:
            directory = self.root/'_cyinstall'
            self.cli, self.ui = directory/'cyinstall.exe', directory/'cyinstall-ui.exe'
            if directory.exists():
                self.mode = 'repair'
                try:
                    pointer = json.loads((directory/'app-install.json').read_text('utf-8-sig'))
                    manifest = json.loads((directory/'cyinstaller.json').read_text('utf-8-sig'))
                    if pointer.get('app_id') == APP_ID and manifest.get('app', {}).get('id') == APP_ID and self.cli.is_file() and self.ui.is_file():
                        self.mode = 'managed'
                except (OSError, ValueError):
                    pass

    @property
    def busy(self):
        return self.pending is not None or self.window is not None and self.window.poll() is None

    def _execute(self, arguments, **options):
        timeout = options.pop('timeout')
        with self.process_lock:
            if self.closing:
                raise OSError('Studio is closing.')
            process = self.process = subprocess.Popen(arguments, stdout=subprocess.PIPE, stderr=subprocess.PIPE, **options)
        try:
            stdout, stderr = process.communicate(timeout=timeout)
            return subprocess.CompletedProcess(arguments, process.returncode, stdout, stderr)
        except subprocess.TimeoutExpired:
            process.terminate(); process.communicate(timeout=5)
            raise
        finally:
            with self.process_lock:
                self.process = None

    def _run(self, operation, arguments):
        try:
            response = self._execute([str(self.cli), '--json', *arguments], cwd=self.cli.parent,
                                      encoding='utf-8', errors='replace', timeout=90,
                                      creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
            events = []
            for line in response.stdout.splitlines():
                try:
                    event = json.loads(line)
                    if isinstance(event, dict) and event.get('type') == 'result':
                        events.append(event)
                except ValueError:
                    continue
            result = events[-1] if events else {}
            diagnostic = str(result.get('message') or response.stderr.strip() or ('CyInstaller did not return a result event.' if not result else ''))[:2000]
            return EngineResult(operation, response.returncode, result, diagnostic)
        except (OSError, subprocess.TimeoutExpired) as error:
            return EngineResult(operation, -1, diagnostic=str(error)[:2000])

    def _submit(self, operation, arguments):
        if self.mode != 'managed' or self.busy:
            return False
        self.pending = self.executor.submit(self._run, operation, arguments)
        return True

    def startup(self):
        """Pre-window startup gate; process work itself is owned by the worker."""
        if not self._submit('startup', ['startup']):
            return None
        result = self.pending.result(timeout=95)
        self.pending = None
        self.last = result
        self.startup_ok = result.success and result.code == 0
        if result.code == 11:
            self.mode = 'repair'
        return result

    def confirm(self):
        return self.startup_ok and not self.confirmed and self._submit('confirm', ['confirm'])

    def check(self, automatic=False):
        return self._submit('check', ['check', *(['--auto'] if automatic else [])])

    def configure(self, key, value):
        if key not in ('channel', 'auto_check', 'auto_download'):
            raise ValueError('Unsupported CyInstaller setting.')
        return self._submit('config', ['config', 'set', key, str(value).lower()])

    def poll(self):
        if self.pending is None or not self.pending.done():
            return None
        result = self.pending.result()
        self.pending = None
        self.last = result
        if result.operation == 'confirm' and result.success and result.code == 0:
            self.confirmed = True
            self.next_check = time.monotonic()
        if result.operation == 'check':
            self.next_check = time.monotonic()+3600
        return result

    def tick(self):
        if self.confirmed and not self.busy and time.monotonic() >= self.next_check:
            self.check(automatic=True)

    def open_window(self, recovery=False):
        if self.mode != 'managed' or self.busy:
            return False
        arguments = ['startup'] if recovery else ['update', 'ui']
        arguments += ['--wait-pid', str(os.getpid()), '--relaunch']
        if self.relaunch_arguments:
            arguments += ['--relaunch-args', subprocess.list2cmdline(self.relaunch_arguments)]
        flags = getattr(subprocess, 'DETACHED_PROCESS', 0) | getattr(subprocess, 'CREATE_NEW_PROCESS_GROUP', 0)
        try:
            self.window = subprocess.Popen([str(self.ui), *arguments],
                                           cwd=self.ui.parent, creationflags=flags, start_new_session=os.name != 'nt')
            return True
        except OSError as error:
            self.last = EngineResult('window', -1, diagnostic=str(error))
            return False

    def close(self):
        with self.process_lock:
            self.closing = True
            if self.process is not None and self.process.poll() is None:
                try:
                    self.process.terminate()  # Only owned check/config/confirmation commands; never the update UI/apply process.
                except OSError:
                    pass  # The child may have exited between poll and terminate.
        self.executor.shutdown(wait=True, cancel_futures=True)
