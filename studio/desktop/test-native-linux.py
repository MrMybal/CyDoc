"""Test a Linux payload in a private Xvfb screen; never captures the user's desktop."""
import argparse
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
from uuid import uuid4


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--package', type=Path, required=True)
    parser.add_argument('--work', type=Path, required=True)
    parser.add_argument('--worker', action='store_true', help=argparse.SUPPRESS)
    args = parser.parse_args()
    if sys.platform != 'linux':parser.error('Run on Linux with Xvfb, python-xlib and Pillow installed.')
    repo = Path(__file__).resolve().parents[2]
    work, package = args.work.resolve(), args.package.resolve(strict=True)
    if not work.is_relative_to(repo/'.tmp') or work.exists():parser.error('Use a fresh directory under the checkout .tmp/.')
    if not args.worker:
        environment = dict(os.environ, CYDOC_NATIVE_TEST_WORKER=uuid4().hex)
        result = subprocess.run(['xvfb-run', '-a', '-s', '-screen 0 1600x1000x24 -nolisten tcp', sys.executable, __file__,
                                 '--package', str(package), '--work', str(work), '--worker'], env=environment)
        raise SystemExit(result.returncode)
    if not os.environ.get('CYDOC_NATIVE_TEST_WORKER') or not os.environ.get('DISPLAY'):
        parser.error('The worker must be launched through this script’s private Xvfb server.')
    from Xlib import X, display
    from PIL import Image
    for name in ('CyDocStudioRuntime', 'CyDocStudioHost'):
        with (package/'runtime/desktop'/name).open('rb') as stream:assert stream.read(4)==b'\x7fELF'
    work.mkdir(parents=True)
    def inventory():
        return {path.relative_to(package).as_posix():(path.stat().st_size,path.stat().st_mtime_ns)
                for path in package.rglob('*') if path.is_file()}
    before = inventory()
    environment = {key:value for key,value in os.environ.items() if key not in
                   ('CYDOC_CYMCP_HOST','CYDOC_STUDIO_ORIGIN','CYDOC_STUDIO_TOKEN','CYDOC_CEF_DIR','PYTHONPATH','PYTHONHOME','LD_LIBRARY_PATH','LD_LIBRARY_PATH_ORIG')
                   and not key.startswith('_PYI_')}
    environment.update(LIBGL_ALWAYS_SOFTWARE='1', PATH='/usr/bin:/bin')
    checks = []
    cases = [(tab,'fr','light') for tab in ('editor','documentation','assistant','updates','options','mcp')]
    cases += [('editor','en','dark'),('assistant','en','dark')]
    for tab,locale,theme in cases:
        name = f'{tab}-{locale}-{theme}'
        profile = work/name;config = profile/'config';config.mkdir(parents=True)
        (config/'desktop-settings.json').write_text(json.dumps({'language':locale,'theme':theme,'textScale':1.0,'allowedFolders':[],'port':0}))
        health = profile/'health.json'
        with (profile/'stdout.log').open('w') as log:
            process = subprocess.Popen([str(package/'CyDocStudio'),'--data',str(profile),'--tab',tab,'--health-report',str(health),
                                        '--exit-after','60'], env=environment, cwd=work, stdout=log, stderr=log)
            try:
                deadline = time.monotonic()+40
                while not health.exists():
                    assert process.poll() is None and time.monotonic()<deadline,'Native startup failed: '+name
                    time.sleep(.1)
                state = json.loads(health.read_text());assert state['ready']
                time.sleep(2)
                connection = display.Display()
                info = json.loads((profile/'jobs/assistant-window.json').read_text())
                parent = connection.create_resource_object('window',info['parent'])
                child = connection.create_resource_object('window',info['handle'])
                assert child.query_tree().parent.id==parent.id
                if tab=='assistant':assert child.get_attributes().map_state==X.IsViewable
                root = connection.screen().root;geometry = root.get_geometry()
                pixels = root.get_image(0,0,geometry.width,geometry.height,X.ZPixmap,0xffffffff)
                screen = Image.frombytes('RGB',(geometry.width,geometry.height),pixels.data,'raw','BGRX')
                def capture(window,path):
                    location = root.translate_coords(window,0,0);size = window.get_geometry()
                    screen.crop((location.x,location.y,location.x+size.width,location.y+size.height)).save(path)
                capture(parent,work/(name+'.png'))
                if tab=='assistant':capture(child,work/(name+'-child.png'))
                connection.close()
                process.send_signal(signal.SIGTERM)
                assert process.wait(timeout=35)==0,'Durable SIGTERM close failed: '+name
                checks.append({'view':tab,'locale':locale,'theme':theme,'initialized':True,'normalClose':True,'version':state['version']})
                print('PASS native '+name,flush=True)
            finally:
                if process.poll() is None:
                    process.terminate()
                    try:process.wait(timeout=15)
                    except subprocess.TimeoutExpired:process.kill();process.wait()
    assert inventory()==before,'Native startup wrote into the application payload'
    report = {'checks':checks,'headlessDisplay':True,'desktopControlled':False,'nativeCefTested':True,'nativeAssistantTested':True,
              'softwareOpenGL':True,'payloadUnchanged':True,'realProviderTested':False}
    (work/'result.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report),flush=True)


if __name__=='__main__':main()
