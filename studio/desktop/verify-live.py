"""Explicit opt-in live Codex check. Creates only a disposable local Studio project.

This is intentionally outside pytest: it uses the installed provider account.
"""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
sys.path.insert(0, str(Path(__file__).resolve().parent/'app'))
from host import NativeHost
from sdk import StudioClient


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    repository = Path(__file__).resolve().parents[2]
    temporary = repository/'.tmp'
    temporary.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='cymcp-live-', dir=temporary) as directory:
        root = Path(directory)
        ready = root/'ready.json'
        with (root/'service.log').open('w', encoding='utf-8') as log:
            service = subprocess.Popen([shutil.which('node'), str(repository/'studio/server/cli.mjs'), '--local', '--data', str(root/'service'), '--port', '0', '--ready', str(ready)],
                                       stdin=subprocess.PIPE, stdout=log, stderr=log, text=True, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
            try:
                deadline = time.monotonic()+20
                while not ready.exists():
                    if service.poll() is not None or time.monotonic() > deadline:
                        raise RuntimeError('Disposable service did not start.')
                    time.sleep(.03)
                origin = json.loads(ready.read_text('utf-8'))['origin']
                os.environ['CYDOC_STUDIO_ORIGIN'] = origin
                os.environ.pop('CYDOC_STUDIO_TOKEN', None)
                with NativeHost(root/'jobs') as host:
                    prompt = 'Use the Studio create_project operation exactly once with name "CyMCPSDK live verification" and git false. Discover its schema if needed. Then read it back with get_project and reply CYDOC_TOOL_OK. Do not access files or run commands.'
                    written = subprocess.run(host.command+['--chat-prompt', prompt, '--provider', 'codex'], env=host.environment, capture_output=True, text=True, timeout=90)
                    if written.returncode:
                        raise RuntimeError(written.stderr[:1600])
                    reply = json.loads(written.stdout)
                    projects = StudioClient(origin).projects()
                    created = [project for project in projects if project['name'] == 'CyMCPSDK live verification']
                    if len(created) != 1 or 'CYDOC_TOOL_OK' not in reply['text']:
                        raise RuntimeError('Live tool mutation was not verified.')
                    cancelled = subprocess.run(host.command+['--chat-prompt', 'Immediately begin writing the numbers 1 through 5000, one per line. Do not use tools or commands. Continue until stopped.', '--provider', 'codex', '--cancel-after', '30000', '--cancel-deltas', '2'],
                                               env=host.environment, capture_output=True, text=True, timeout=40)
                    cancellation = json.loads(cancelled.stderr)
                    if cancelled.returncode == 0 or cancellation['error']['code'] != 'Cancelled' or cancellation['textDeltas'] < 2:
                        raise RuntimeError('Live provider cancellation was not verified.')
                    summary = {'provider': 'codex', 'sdkVersion': '0.7.5', 'sdkRevision': '35d2d4fd85982d3d0ba278594e85fa37f325b4f2',
                               'realProvider': True, 'toolWriteCount': len(created), 'textDeltas': reply['textDeltas'],
                               'cancelCode': cancellation['error']['code'], 'cancelTextDeltas': cancellation['textDeltas']}
                    args.report.parent.mkdir(parents=True, exist_ok=True)
                    args.report.write_text(json.dumps(summary, indent=2)+'\n', 'utf-8')
                    print(json.dumps(summary))
            finally:
                if service.poll() is None:
                    service.communicate('cydoc:shutdown\n', timeout=20)


if __name__ == '__main__':
    main()
