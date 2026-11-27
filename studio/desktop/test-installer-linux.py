"""Native Linux setup/update/relaunch/rollback on private Xvfb and isolated CyInstaller state."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shlex
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import zipfile
from uuid import uuid4
sys.path.insert(0,str(Path(__file__).resolve().parent/'app'))
from sdk import StudioClient


def digest(path):
    with path.open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--release',type=Path,required=True)
    parser.add_argument('--engine',type=Path,required=True)
    parser.add_argument('--work',type=Path,required=True)
    parser.add_argument('--storage',type=Path,required=True,help='Fresh disposable directory for the large fixture files.')
    parser.add_argument('--worker',action='store_true',help=argparse.SUPPRESS)
    parser.add_argument('--resume-setup',action='store_true',help='Reuse only the completed production setup in this test directory.')
    args=parser.parse_args()
    if sys.platform!='linux':parser.error('Run on Linux with Xvfb installed.')
    repo=Path(__file__).resolve().parents[2]
    work,storage=args.work.resolve(),args.storage.resolve()
    if not work.is_relative_to(repo/'.tmp') or work.exists()!=args.resume_setup or storage.exists()!=args.resume_setup:parser.error('Use fresh work and storage directories or explicitly resume their setup.')
    if not args.worker:
        environment=dict(os.environ,CYDOC_INSTALLER_XVFB=uuid4().hex)
        result=subprocess.run(['xvfb-run','-a','-s','-screen 0 1600x1000x24 -nolisten tcp',sys.executable,__file__,
                               '--release',str(args.release.resolve()),'--engine',str(args.engine.resolve()),
                               '--work',str(work),'--storage',str(storage),'--worker',*(['--resume-setup'] if args.resume_setup else [])],env=environment)
        raise SystemExit(result.returncode)
    assert os.environ.get('CYDOC_INSTALLER_XVFB') and os.environ.get('DISPLAY')
    work.mkdir(parents=True,exist_ok=args.resume_setup);storage.mkdir(parents=True,exist_ok=args.resume_setup)
    release=args.release.resolve(strict=True);engine=args.engine.resolve(strict=True)
    production=json.loads((release/'cyinstaller.json').read_text());app_id=production['app']['id']
    trust=digest(repo/'.cyinstaller/cyinstaller.json')
    sandbox=storage/'sandbox';home=sandbox/'home';data=home/'.local/share';state=data/'cyinstaller/apps'/app_id
    installed=home/'.local/opt/CyDocStudio-CyInstaller';profile=data/'CyDocStudio';feed=storage/'releases/MrMybal/CyDoc'
    feed.mkdir(parents=True,exist_ok=args.resume_setup)
    environment={key:value for key,value in os.environ.items() if key not in
                 ('CYI_RELEASES_DIR','CYI_CAPTURE_LAUNCH','CYI_TEST_FAIL','CYDOC_CYMCP_HOST','CYDOC_STUDIO_ORIGIN','CYDOC_STUDIO_TOKEN',
                  'PYTHONHOME','PYTHONPATH','LD_LIBRARY_PATH','LD_LIBRARY_PATH_ORIG') and not key.startswith('_PYI_')}
    environment.update(CYI_SANDBOX=str(sandbox),HOME=str(home),XDG_DATA_HOME=str(data),XDG_CONFIG_HOME=str(home/'.config'),
                       XDG_CACHE_HOME=str(home/'.cache'),XDG_STATE_HOME=str(home/'.local/state'),LIBGL_ALWAYS_SOFTWARE='1',PATH='/usr/bin:/bin')
    environment['CYI_RELEASES_DIR']=str(storage/'releases')
    checks=[];owned=[]
    def checked(name,condition=True):
        assert condition,name
        checks.append(name);(work/'checks.json').write_text(json.dumps(checks,indent=2));print('PASS '+name,flush=True)
    def run(arguments,expected=(0,),executable=engine,protocol=True,timeout=900):
        result=subprocess.run([str(executable),*(['--json','--no-elevate'] if protocol else []),*map(str,arguments)],
                              env=environment,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=timeout)
        values=[]
        for line in result.stdout.splitlines():
            try:
                value=json.loads(line)
                if value.get('type')=='result':values.append(value)
            except (ValueError,AttributeError):pass
        value=values[-1] if values else {}
        with (work/'engine.log').open('a') as log:log.write(json.dumps({'command':str(arguments[0]),'exit':result.returncode,'result':value,'stderr':result.stderr[-2000:]})+'\n')
        assert result.returncode in expected,(arguments[0],result.returncode,value or result.stderr[-2000:])
        return value
    def receipt():return json.loads((state/'receipt.json').read_text())
    def wait_health(path,process=None):
        deadline=time.monotonic()+60
        while not path.exists():
            assert time.monotonic()<deadline and (process is None or process.poll() is None),'Native startup failed: '+str(path)
            time.sleep(.1)
        value=json.loads(path.read_text());assert value['ready'] and value['confirmed'] and value['updateMode']=='managed'
        return value
    def launch(name,tab='editor'):
        health=work/(name+'-health.json')
        log=(work/(name+'.log')).open('w')
        process=subprocess.Popen([str(installed/'CyDocStudio'),'--data',str(profile),'--health-report',str(health),'--tab',tab,'--exit-after','180'],
                                 env=environment,cwd=installed,stdout=log,stderr=log)
        owned.append(process)
        return process,wait_health(health,process)
    def stop(process):
        process.send_signal(signal.SIGTERM);assert process.wait(timeout=45)==0
    version=json.loads((release/'update.json').read_text())['version']
    major,minor,patch=map(int,version.split('.'));future=f'{major}.{minor}.{patch+1}'
    try:
        # Actual production setup, unchanged, first. Capture mode never launches Studio itself.
        setup=release/f'CyDocStudio-{version}-linux-x64-setup.run'
        if not args.resume_setup:run(['--lang','fr','--capture-dir',work/'setup-captures'],executable=setup,protocol=False)
        assert Path(receipt()['install_dir']).resolve()==installed
        checked('actual production offline setup completes on private Xvfb',receipt()['version']==version and len(list((work/'setup-captures').glob('*.png')))>=4)
        (profile/'config').mkdir(parents=True,exist_ok=True)
        (profile/'config/desktop-settings.json').write_text(json.dumps({'language':'fr','theme':'light','textScale':1.0,'port':0}))
        first,health=launch('production')
        checked('production installation initializes the native CEF editor and confirms startup',health['version']==version)
        client=StudioClient(health['origin']);project=client.create_project(name='Manuel conservé',git=False)
        page=client.page(project['id'],'en','overview')
        client.update_page(project['id'],'en','overview',page['body']+'\nSaved before the Linux update.\n',page['revisionToken'])
        root=profile/'workspace/projects'/project['id']/'.CyDocBuild';config=json.loads((root/'cydoc.config.json').read_text())
        document=root/config['content']/'en/overview.md'
        markers=[profile/'jobs/Workspaces/retained.txt',profile/'browser-profile/retained.txt']
        for path in markers:path.parent.mkdir(parents=True,exist_ok=True);path.write_text('Retained Linux work')
        retained={str(path):digest(path) for path in [document,*markers]}
        stop(first)
        run(['verify','--app',app_id])
        run(['uninstall','--app',app_id,'--clean','--keep','config,data','--yes'])
        checked('production uninstall preserves user documents and jobs',all(digest(Path(path))==value for path,value in retained.items()))
        # Uninstall can retain empty parent directories. The fixture uses its own empty destination.
        installed=home/'.local/opt/CyDocStudio-Fixture'
        with tempfile.TemporaryDirectory(prefix='cydoc-linux-fixture-key-') as private:
            private=Path(private).resolve();assert not private.is_relative_to(repo)
            key=run(['keygen','--out',private/'keys'])
            manifest=json.loads(json.dumps(production));manifest['signing']['publisher_key']=key['public_key'];manifest['update']['confirm_attempts']=1
            source=work/'source';shutil.copytree(repo/'.cyinstaller/assets',source/'assets')
            source_manifest=source/'cyinstaller.json';source_manifest.write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
            changelog=source/'CHANGELOG.md';changelog.write_text(f'# Local fixture only\n\n## [{future}]\n- Never publish.\n\n## [{version}]\n- Actual payload.\n')
            previous=None
            for selected in (version,future):
                target=feed/f'v{selected}';target.mkdir()
                shutil.copy2(source_manifest,target/'cyinstaller.json')
                os.link(release/'cyinstall-linux-x64.zip',target/'cyinstall-linux-x64.zip')
                archive=target/f'CyDocStudio-{selected}-linux-x64.zip'
                if selected==version:os.link(release/f'CyDocStudio-{version}-linux-x64.zip',archive)
                else:
                    with zipfile.ZipFile(release/f'CyDocStudio-{version}-linux-x64.zip') as original,zipfile.ZipFile(archive,'w') as output:
                        for item in original.infolist():
                            content=original.read(item)
                            if item.filename in ('app/cydoc/studio/package.json','runtime/desktop/_internal/CyMCP.json'):
                                value=json.loads(content);value['version']=future;content=json.dumps(value).encode()
                            output.writestr(item,content)
                        output.writestr('fixture-next-version.txt','Local acceptance fixture; never publish.')
                arguments=['release-manifest','--manifest',source_manifest,'--changelog',changelog,'--version',selected,'--assets',target]
                if previous:arguments+=['--previous',previous]
                run(arguments);run(['sign',target/'update.json','--key',private/'keys/publisher.key']);previous=target/'update.json'
            environment['CYI_RELEASES_DIR']=str(storage/'releases')
            run(['install','--repo','MrMybal/CyDoc','--version',version,'--dir',installed,'--defaults'])
            checked('isolated update fixture installs the exact production payload with separate test trust',receipt()['version']==version)
            waiting,before=launch('before-update','assistant')
            client=StudioClient(before['origin']);assert any(row['id']==project['id'] for row in client.projects())
            available=run(['check','--app',app_id],expected=(100,102));assert available['latest_version']==future
            metadata=feed/f'v{future}'/'update.json';content=metadata.read_bytes();metadata.write_bytes(content+b' ')
            try:run(['check','--app',app_id],expected=(4,))
            finally:metadata.write_bytes(content)
            checked('modified signed update metadata is rejected')
            run(['update','--app',app_id,'--download-only'],expected=(102,))
            after_path=work/'after-update-health.json'
            arguments=shlex.join(['--data',str(profile),'--health-report',str(after_path),'--exit-after','20'])
            applied=run(['update','--app',app_id,'--apply','--relaunch','--relaunch-args',arguments],executable=installed/'_cyinstall/cyinstall')
            assert waiting.wait(timeout=45)==0
            after=wait_health(after_path)
            checked('engine gracefully closes native Studio, replaces files, relaunches and receives confirmation',receipt()['version']==future and after['version']==future and after['updatedFrom']==version)
            deadline=time.monotonic()+90
            while Path('/proc',str(after['pid'])).exists():
                assert time.monotonic()<deadline,'Relaunched Studio did not close normally'
                time.sleep(.2)
            checked('saved documents, jobs and browser files survive update',all(digest(Path(path))==value for path,value in retained.items()))
            run(['verify','--app',app_id]);run(['rollback','--app',app_id]);run(['verify','--app',app_id])
            checked('rollback restores the actual 0.2.0 payload',receipt()['version']==version and not (installed/'fixture-next-version.txt').exists())
            restored,health=launch('after-rollback');assert health['version']==version;stop(restored)
            run(['update','--app',app_id,'--apply']);run(['startup','--app',app_id]);recovery=run(['startup','--app',app_id],expected=(103,))
            checked('unconfirmed startup requests recovery through code 103',recovery['status']=='rollback_suggested')
            run(['rollback','--app',app_id])
            run(['uninstall','--app',app_id,'--clean','--keep','config,data','--yes'])
            checked('uninstall retains user work after update and rollback',all(digest(Path(path))==value for path,value in retained.items()))
        checked('production source trust remains unchanged',digest(repo/'.cyinstaller/cyinstaller.json')==trust)
        report={'checks':checks,'version':version,'fixtureVersion':future,'fixtureNeverPublished':True,'desktopControlled':False,
                'privateXvfb':True,'realProductionSetupTested':True,'nativeCefTested':True,'nativeAssistantStarted':True,'realProviderTested':False}
        (work/'result.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report),flush=True)
    finally:
        for process in owned:
            if process.poll() is None:
                process.terminate()
                try:process.wait(timeout=20)
                except subprocess.TimeoutExpired:process.kill();process.wait()


if __name__=='__main__':main()
