"""Real CyInstaller update/rollback with real Studio payloads, without opening any UI.

Uses a unique test app ID, isolated engine state and a temporary signing key.
The installed desktop executable and cyinstall-ui are never launched.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
from uuid import uuid4
sys.path.insert(0,str(Path(__file__).resolve().parent/'app'))
import updater
from sdk import StudioClient


def digest(path):
    with path.open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--previous-release',type=Path,required=True)
    parser.add_argument('--next-release',type=Path,required=True)
    parser.add_argument('--work',type=Path,required=True)
    parser.add_argument('--engine',type=Path,default=Path('D:/_Project/CyInstaller/build/bin/Release/cyinstall.exe'))
    args=parser.parse_args()
    repo=Path(__file__).resolve().parents[2]
    work=args.work.resolve();assert work.is_relative_to(repo/'.tmp') and not work.exists()
    work.mkdir(parents=True)
    app_id='mrmybal.cydocstudio.test.v'+uuid4().hex[:12]
    updater.APP_ID=app_id  # Namespace isolation in this test process only; production code is unchanged.
    sandbox=work/'sandbox';releases=work/'releases';feed=releases/'MrMybal/CyDoc';feed.mkdir(parents=True)
    environment=dict(os.environ)
    for name in ('CYI_CAPTURE_LAUNCH','CYI_TEST_FAIL','CYDOC_STUDIO_ORIGIN','CYDOC_STUDIO_TOKEN','CYDOC_CYMCP_HOST'):
        environment.pop(name,None)
    environment.update(CYI_SANDBOX=str(sandbox),CYI_RELEASES_DIR=str(releases),LOCALAPPDATA=str(sandbox/'LocalAppData'),APPDATA=str(sandbox/'AppData'))
    os.environ.update(environment)
    installed=sandbox/'LocalAppData/Programs/CyDocStudio'
    state=sandbox/'LocalAppData/CyInstaller/apps'/app_id
    profile=sandbox/'LocalAppData/CyDocStudio'
    engine=args.engine.resolve();checks=[];service=None;log=None;adapter=None
    trust_before=digest(repo/'.cyinstaller/cyinstaller.json')
    def checked(name,condition=True):
        assert condition,name
        checks.append(name);print('PASS '+name,flush=True)
        (work/'checks.json').write_text(json.dumps(checks,indent=2),'utf-8')
    def run(arguments,expected=(0,)):
        result=subprocess.run([str(engine),'--json','--no-elevate',*map(str,arguments)],env=environment,capture_output=True,
                              encoding='utf-8',errors='replace',timeout=900,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        events=[]
        for line in result.stdout.splitlines():
            try:
                value=json.loads(line)
                if value.get('type')=='result':events.append(value)
            except (ValueError,AttributeError):pass
        value=events[-1] if events else {}
        with (work/'engine.log').open('a',encoding='utf-8') as stream:
            stream.write(json.dumps({'command':arguments[0],'code':result.returncode,'result':value})+'\n')
        assert result.returncode in expected,(arguments[0],result.returncode,value or result.stderr[-1200:])
        return value
    def receipt():return json.loads((state/'receipt.json').read_text('utf-8'))
    def complete():
        adapter.pending.result(timeout=95)
        return adapter.poll()
    def stop_service():
        nonlocal service,log
        if service and service.poll() is None:service.communicate('cydoc:shutdown\n',timeout=60)
        if log:log.close()
        service=log=None
    def start_service():
        nonlocal service,log
        ready=work/'service-ready.json';ready.unlink(missing_ok=True)
        log=(work/'service.log').open('a',encoding='utf-8')
        service=subprocess.Popen([str(installed/'runtime/node.exe'),str(installed/'app/cydoc/studio/server/cli.mjs'),'--local',
                                  '--data',str(profile/'workspace'),'--port','0','--ready',str(ready)],env=environment,
                                 stdin=subprocess.PIPE,stdout=log,stderr=log,text=True,encoding='utf-8',creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        deadline=time.monotonic()+30
        while not ready.exists():
            assert service.poll() is None and time.monotonic()<deadline,'Packaged service did not initialize'
            time.sleep(.05)
        return StudioClient(json.loads(ready.read_text('utf-8'))['origin'])
    try:
        with tempfile.TemporaryDirectory(prefix='cydoc-headless-signing-') as private:
            private=Path(private).resolve();assert not private.is_relative_to(repo)
            key=run(['keygen','--out',private/'keys'])
            versions=[];previous=None
            for source in (args.previous_release.resolve(),args.next_release.resolve()):
                production=json.loads((source/'update.json').read_text('utf-8'));version=production['version'];versions.append(version)
                target=feed/f'v{version}';target.mkdir()
                for name in (f'CyDocStudio-{version}-win-x64.zip','cyinstall-win-x64.zip'):shutil.copy2(source/name,target/name)
                manifest=json.loads((source/'cyinstaller.json').read_text('utf-8'))
                assert manifest['signing']['publisher_key']!=key['public_key']
                manifest['app']['id']=app_id;manifest['app']['name']='CyDoc Studio headless '+app_id.rsplit('.',1)[1]
                manifest['signing']['publisher_key']=key['public_key']
                assert not manifest.get('processes',{}).get('extra_names')
                path=target/'cyinstaller.json';path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),'utf-8')
                arguments=['release-manifest','--manifest',path,'--changelog',repo/'CHANGELOG.md','--version',version,'--assets',target]
                if previous:arguments+=['--previous',previous]
                run(arguments);run(['sign',target/'update.json','--key',private/'keys/publisher.key']);previous=target/'update.json'
            base,future=versions
            checked('real Studio payloads use isolated test trust and a unique app registration')
            run(['install','--repo','MrMybal/CyDoc','--version',base,'--dir',installed,'--defaults'])
            checked('non-interactive CLI install succeeds without launching Studio',receipt()['version']==base)
            adapter=updater.UpdateService(installed)
            assert adapter.mode=='managed' and adapter.startup().success
            client=start_service();project=client.create_project(name='Manuel préservé',git=False)
            page=client.page(project['id'],'en','overview')
            client.update_page(project['id'],'en','overview',page['body']+'\nRetained through a background update.\n',page['revisionToken'])
            root=profile/'workspace/projects'/project['id']/'.CyDocBuild'
            config=json.loads((root/'cydoc.config.json').read_text('utf-8'))
            document=root/config['content']/'en/overview.md'
            markers=[profile/'config/desktop-settings.json',profile/'jobs/Workspaces/retained.txt',profile/'browser-profile/retained.txt']
            for marker in markers:marker.parent.mkdir(parents=True,exist_ok=True);marker.write_text('Preserved test data','utf-8')
            markers[0].write_text(json.dumps({'language':'fr','theme':'light','textScale':1.0,'port':0}),encoding='utf-8')
            retained={str(path):digest(path) for path in [document,*markers]}
            stop_service()
            assert adapter.check();available=complete();assert available.success and available.code in (100,102)
            checked('the actual Studio adapter discovers the next signed version',available.result['latest_version']==future)
            assert adapter.configure('auto_check',False);assert complete().success
            unavailable=work/'releases-unavailable';releases.rename(unavailable)
            try:
                assert adapter.check(automatic=True);automatic=complete();assert automatic.success
            finally:unavailable.rename(releases)
            checked('automatic checks respect disabled configuration without contacting the feed')
            assert adapter.configure('auto_check',True);assert complete().success
            metadata=feed/f'v{future}'/'update.json';original=metadata.read_bytes()
            metadata.write_bytes(original+b' ')
            try:
                assert adapter.check();rejected=complete();assert not rejected.success and rejected.code==4
            finally:metadata.write_bytes(original)
            checked('an invalid update signature is rejected as an error')
            asset=feed/f'v{future}'/f'CyDocStudio-{future}-win-x64.zip';size=asset.stat().st_size
            with asset.open('ab') as stream:stream.write(b'corruption')
            try:run(['update','--app',app_id,'--download-only'],expected=(4,))
            finally:
                with asset.open('r+b') as stream:stream.truncate(size)
            checked('a corrupt payload leaves the installed version and user files intact',receipt()['version']==base and all(digest(Path(path))==value for path,value in retained.items()))
            run(['update','--app',app_id,'--download-only'],expected=(102,))
            adapter.close();adapter=None
            run(['update','--app',app_id,'--apply'])  # Intentionally no --relaunch or UI command.
            run(['verify','--app',app_id])
            checked('actual payload replacement succeeds without relaunch or desktop interaction',receipt()['version']==future)
            adapter=updater.UpdateService(installed);assert adapter.startup().success
            client=start_service();assert any(row['id']==project['id'] for row in client.projects())
            browser=subprocess.run(['node',str(repo/'studio/desktop/test-browser.mjs'),'--studio',str(installed/'app/cydoc/studio'),
                                    '--origin',client.origin,'--work',str(work/'browser')],env=environment,
                                   stdout=(work/'browser.log').open('w',encoding='utf-8'),stderr=subprocess.STDOUT,
                                   timeout=180,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
            assert browser.returncode==0,'Headless browser failed; read browser.log'
            browser_report=json.loads((work/'browser/result.json').read_text('utf-8'));assert browser_report['editorInitialized']
            assert adapter.confirm();assert complete().success and adapter.confirmed
            checked('startup is confirmed only after the packaged service and headless editor initialize')
            checked('existing documents, preferences, job outputs and profile files survive update',all(digest(Path(path))==value for path,value in retained.items()))
            stop_service();adapter.close();adapter=None
            run(['rollback','--app',app_id]);run(['verify','--app',app_id])
            checked('rollback restores the previous real payload',receipt()['version']==base and json.loads((installed/'app/cydoc/studio/package.json').read_text('utf-8'))['version']==base)
            client=start_service();assert any(row['id']==project['id'] for row in client.projects());stop_service()
            unavailable=work/'releases-unavailable';releases.rename(unavailable)
            try:cached=run(['check','--app',app_id],expected=(0,100,102));assert cached.get('offline') is True
            finally:unavailable.rename(releases)
            checked('offline update information is explicitly marked as cached')
            run(['uninstall','--app',app_id,'--clean','--keep','config,data','--yes'])
            checked('uninstall preserves recorded user data hashes',not (installed/'CyDocStudio.exe').exists() and all(digest(Path(path))==value for path,value in retained.items()))
            checked('production signing trust is unchanged',digest(repo/'.cyinstaller/cyinstaller.json')==trust_before)
            report={'appId':app_id,'baseVersion':base,'updatedVersion':future,'checks':checks,'desktopControlled':False,
                    'nativeWindowsLaunched':False,'realStudioPayloads':True,'productionTrustUnchanged':True,
                    'nativeCefTested':False,'recoveryCode103Tested':False,'browser':browser_report}
            (work/'result.json').write_text(json.dumps(report,indent=2)+'\n','utf-8');print(json.dumps(report),flush=True)
    finally:
        stop_service()
        if adapter:adapter.close()


if __name__=='__main__':main()
