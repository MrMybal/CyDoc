"""Native Registry/transport integration; all workspaces are disposable."""
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
from urllib.error import HTTPError
from urllib.request import Request, urlopen
import pytest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'app'))
from host import NativeHost, Jobs, OperationError, executable


def rpc(endpoint, method, parameters=None, token=''):
    headers = {'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'}
    if token:
        headers['Authorization'] = 'Bearer '+token
    request = Request(endpoint, json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': method, 'params': parameters or {}}).encode(), headers=headers)
    with urlopen(request, timeout=20) as response:
        return json.load(response)


def test_free_advertisement_and_protected_profiles(tmp_path, monkeypatch):
    for profile in ('free', 'local-controlled', 'token-only', 'protected'):
        data = tmp_path/profile
        data.mkdir()
        saved = {'profile': profile, 'port': 0, 'operatorSetting': 'preserved'}
        (data/'mcp-settings.json').write_text(json.dumps(saved), 'utf-8')
        # Ephemeral fixture credential, not a provider or user secret.
        token = 'test-only-'+'x'*40
        monkeypatch.setenv('CYDOC_MCP_TOKEN', token)
        with NativeHost(data) as host:
            ready = host.start()
            base = ready['endpoint'].removesuffix('/mcp')
            with urlopen(base+'/.well-known/cymcp') as response:
                advertised = json.load(response)
            assert 'CyDoc Studio' in json.dumps(advertised)
            assert token not in json.dumps(advertised)
            assert 'tools' not in advertised
            requires = profile in ('token-only', 'protected')
            assert advertised['requiresToken'] == requires
            probe = subprocess.run([executable(), '--probe', ready['endpoint']], capture_output=True, text=True, check=True)
            result = json.loads(probe.stdout)
            assert result['name'] == 'CyDoc Studio'
            assert result['status'] == ('authentication_required' if requires else 'active')
            if requires:
                with pytest.raises(HTTPError) as denied:
                    rpc(ready['endpoint'], 'initialize', {'protocolVersion': '2025-11-25', 'capabilities': {}, 'clientInfo': {'name': 'fixture', 'version': '1'}})
                assert denied.value.code in (401, 403)
            else:
                assert 'result' in rpc(ready['endpoint'], 'initialize', {'protocolVersion': '2025-11-25', 'capabilities': {}, 'clientInfo': {'name': 'fixture', 'version': '1'}})
            with pytest.raises(HTTPError):
                urlopen(Request(base+'/v1', b'{"method":"describe"}', headers={'Content-Type': 'application/json'}))
            if profile in ('local-controlled', 'protected'):
                with pytest.raises(OperationError):
                    host.request({'method': 'invoke', 'name': 'create_project', 'arguments': {'name': 'denied'}})
        assert json.loads((data/'mcp-settings.json').read_text('utf-8')) == saved


def test_existing_jobs_and_outputs_are_retained_without_replaying(tmp_path):
    root = tmp_path/'jobs'
    root.mkdir()
    output = root/'Workspaces'/'old-client'/'old-job'/'outputs'/'Documentation.zip'
    output.parent.mkdir(parents=True)
    output.write_bytes(b'old export fixture')
    completed = {'jobId': 'old-job', 'state': 'Completed', 'operationId': 'export_manual', 'outputs': {'result': {'file': str(output)}}}
    interrupted = {'jobId': 'interrupted', 'state': 'Running', 'operationId': 'create_project', 'outputs': None}
    with sqlite3.connect(root/'state.sqlite3') as db:
        db.execute('CREATE TABLE records(kind TEXT,id TEXT,value TEXT,PRIMARY KEY(kind,id))')
        for job in (completed, interrupted):
            db.execute('INSERT INTO records VALUES(?,?,?)', ('jobs', job['jobId'], json.dumps(job)))
    with NativeHost(root) as host:
        host.start()
        assert host.request({'method': 'invoke', 'name': 'cy_get_job', 'arguments': {'jobId': 'old-job'}}) == completed
        recovered = host.request({'method': 'invoke', 'name': 'cy_get_job', 'arguments': {'jobId': 'interrupted'}})
        assert recovered['state'] == 'Failed'
        assert recovered['error']['code'] == 'Interrupted'
        assert recovered['finishedAt'].endswith('+00:00')
    assert output.read_bytes() == b'old export fixture'


def test_foreign_job_database_is_refused_without_changing_records(tmp_path):
    import host as module
    descriptor = json.loads((Path(module.__file__).with_name('CyMCP.json')).read_text('utf-8'))
    root = tmp_path/'foreign'; root.mkdir()
    records = [('settings', 'identity', json.dumps({'toolId': 'another.application', 'protocolVersion': '1.0'})),
               ('jobs', 'foreign-job', json.dumps({'jobId': 'foreign-job', 'state': 'Running'}))]
    with sqlite3.connect(root/'state.sqlite3') as db:
        db.execute('CREATE TABLE records(kind TEXT,id TEXT,value TEXT,PRIMARY KEY(kind,id))')
        db.executemany('INSERT INTO records VALUES(?,?,?)', records)
    with pytest.raises(OperationError, match='another application'):
        Jobs(root, descriptor)
    with sqlite3.connect(root/'state.sqlite3') as db:
        assert sorted(db.execute('SELECT kind,id,value FROM records').fetchall()) == sorted(records)


def test_job_cancellation_and_single_owner(tmp_path, monkeypatch):
    import host as module
    descriptor = json.loads((Path(module.__file__).with_name('CyMCP.json')).read_text('utf-8'))
    started = __import__('threading').Event()
    def slow(operation, context, parameters):
        started.set()
        while not context.cancelled.wait(.005):
            context.check()
        context.check()
    monkeypatch.setattr(module, 'invoke', slow)
    jobs = Jobs(tmp_path/'jobs', descriptor)
    try:
        with pytest.raises(OperationError, match='already owned'):
            Jobs(tmp_path/'jobs', descriptor)
        job = jobs.submit('list_projects', {})
        assert started.wait(5)
        jobs.dispatch('cy_cancel_job', job)
        jobs.futures[job['jobId']].result(timeout=5)
        assert jobs.dispatch('cy_get_job', job)['state'] == 'Cancelled'
    finally:
        jobs.close()


def test_cli_discovery_is_json_and_does_not_need_mcp(tmp_path):
    tool = Path(__file__).resolve().parents[1]/'app/tool.py'
    result = subprocess.run([sys.executable, str(tool), '--data-dir', str(tmp_path/'cli'), 'list'], capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stderr
    tools = json.loads(result.stdout)
    assert any(tool['name'] == 'update_page' and not tool['annotations']['readOnlyHint'] for tool in tools)
    assert not (tmp_path/'cli/host-ready.json').exists()
    bad = subprocess.run([sys.executable, str(tool), '--data-dir', str(tmp_path/'cli'), 'call', 'update_page', '--json', '{}'], capture_output=True, text=True, timeout=30)
    assert bad.returncode != 0
    assert not bad.stdout.strip()
    assert json.loads(bad.stderr)['error']['code']
