"""Deterministic provider simulation. These tests are not real AI-provider validation."""
import contextlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import subprocess
import sys
import threading
import time
import pytest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'app'))
from host import NativeHost, OperationError
from sdk import StudioClient


@pytest.fixture
def studio_fixture(monkeypatch):
    path = os.environ.get('CYDOC_STUDIO_TEST_FIXTURE')
    if not path:
        pytest.skip('Run node studio/desktop/test.mjs for the disposable Studio service.')
    config = json.loads(Path(path).read_text('utf-8'))
    monkeypatch.setenv('CYDOC_STUDIO_ORIGIN', config['origin'])
    monkeypatch.setenv('CYDOC_STUDIO_TOKEN', config['token'])
    return StudioClient(config['origin'], config['token'])


@contextlib.contextmanager
def simulated_provider():
    observed = {'requests': [], 'frames': 0}
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def do_GET(self):
            body = json.dumps({'data': [{'id': 'fixture-model', 'object': 'model'}]}).encode()
            self.send_response(200); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)

        def do_POST(self):
            data = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            observed['requests'].append(data)
            cancel = any('cancel-stream' in str(message.get('content', '')) for message in data['messages'])
            completed = any(message['role'] == 'tool' for message in data['messages'])
            frames = []
            if cancel:
                frames = [({'content': 'streaming '}, None)]*100
            elif completed:
                frames = [({'content': 'Created '}, None), ({'content': 'fixture manual.'}, None), ({}, 'stop')]
            else:
                assert any(tool['function']['name'] == 'cy_tools_call' for tool in data['tools'])
                arguments = json.dumps({'name': 'create_project', 'arguments': {'name': 'Assistant fixture manual', 'git': False}})
                frames = [({'tool_calls': [{'index': 0, 'id': 'studio-write', 'type': 'function', 'function': {'name': 'cy_tools_call', 'arguments': arguments[:30]}}]}, None),
                          ({'tool_calls': [{'index': 0, 'function': {'arguments': arguments[30:]}}]}, None), ({}, 'tool_calls')]
            self.send_response(200); self.send_header('Content-Type', 'text/event-stream'); self.send_header('Connection', 'close'); self.end_headers()
            with contextlib.suppress(ConnectionError):
                for delta, finish in frames:
                    chunk = {'choices': [{'index': 0, 'delta': delta, 'finish_reason': finish}]}
                    self.wfile.write(('data: '+json.dumps(chunk)+'\n\n').encode()); self.wfile.flush()
                    observed['frames'] += 1
                    time.sleep(.03)
                self.wfile.write(b'data: [DONE]\n\n'); self.wfile.flush()
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    worker = threading.Thread(target=server.serve_forever, daemon=True); worker.start()
    try:
        yield 'http://127.0.0.1:'+str(server.server_port)+'/v1', observed
    finally:
        server.shutdown(); server.server_close(); worker.join(timeout=3)


def test_simulated_streaming_chat_executes_real_studio_write(studio_fixture, tmp_path):
    with simulated_provider() as (endpoint, observed), NativeHost(tmp_path/'chat') as host:
        result = subprocess.run(host.command+['--chat-prompt', 'Create the fixture manual.', '--provider', 'openai-compatible', '--base-url', endpoint],
                                env=host.environment, capture_output=True, text=True, timeout=30)
        assert result.returncode == 0, result.stderr
        reply = json.loads(result.stdout)
        assert reply['text'] == 'Created fixture manual.'
        assert reply['events'] >= 4
        assert reply['textDeltas'] >= 2
        assert len(observed['requests']) == 2
        projects = studio_fixture.projects()
        assert any(project['name'] == 'Assistant fixture manual' for project in projects)
        messages = observed['requests'][1]['messages']
        assert any(message['role'] == 'tool' and 'Assistant fixture manual' in message['content'] for message in messages)


def test_simulated_stream_cancellation(studio_fixture, tmp_path):
    with simulated_provider() as (endpoint, observed), NativeHost(tmp_path/'cancel') as host:
        start = time.monotonic()
        result = subprocess.run(host.command+['--chat-prompt', 'cancel-stream', '--provider', 'openai-compatible', '--base-url', endpoint, '--cancel-after', '250'],
                                env=host.environment, capture_output=True, text=True, timeout=20)
        assert result.returncode != 0
        assert json.loads(result.stderr)['error']['code'] == 'Cancelled'
        assert 0 < observed['frames'] < 100
        assert time.monotonic()-start < 8


def test_configured_remote_tools_and_remote_error(studio_fixture, tmp_path):
    with NativeHost(tmp_path/'peer') as peer:
        peer.start()
        data = tmp_path/'client'; data.mkdir()
        (data/'remote-mcp.json').write_text(json.dumps([{'id': 'peer', 'url': peer.ready['endpoint']}]), 'utf-8')
        with NativeHost(data) as client:
            client.start()
            status = client.request({'method': 'invoke', 'name': 'remote_refresh', 'arguments': {}})
            assert status['connections'][0]['state'] == 'connected', status
            response = client.request({'method': 'invoke', 'name': 'remote.peer.list_projects', 'arguments': {}})
            assert not response['result']['isError']
            assert isinstance(response['result']['structuredContent']['result'], list)
            with pytest.raises(OperationError, match='remote application reported an error'):
                client.request({'method': 'invoke', 'name': 'remote.peer.get_project', 'arguments': {'projectId': 'missing'}})


def test_cli_read_and_write_without_mcp(studio_fixture, tmp_path):
    tool = Path(__file__).resolve().parents[1]/'app/tool.py'
    arguments = [sys.executable, str(tool), '--data-dir', str(tmp_path/'cli')]
    created = subprocess.run(arguments+['call', 'create_project', '--json', json.dumps({'name': 'Manuel créé par le CLI', 'git': False}, ensure_ascii=False)], capture_output=True, text=True, encoding='utf-8', timeout=30)
    assert created.returncode == 0, created.stderr
    project = json.loads(created.stdout)['result']
    assert project['name'] == 'Manuel créé par le CLI'
    read = subprocess.run(arguments+['call', 'get_page', '--json', json.dumps({'projectId': project['id'], 'locale': 'en', 'pageId': 'overview'})], capture_output=True, text=True, timeout=30)
    assert read.returncode == 0, read.stderr
    page = json.loads(read.stdout)['result']
    parameters = {'projectId': project['id'], 'locale': 'en', 'pageId': 'overview', 'revisionToken': page['revisionToken'], 'body': page['body']+'\nCLI change persisted.\n'}
    written = subprocess.run(arguments+['call', 'update_page', '--json', json.dumps(parameters)], capture_output=True, text=True, timeout=30)
    assert written.returncode == 0, written.stderr
    assert 'CLI change persisted.' in studio_fixture.page(project['id'], 'en', 'overview')['body']
    assert not (tmp_path/'cli/host-ready.json').exists()
