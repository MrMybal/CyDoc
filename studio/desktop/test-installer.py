"""Real CyInstaller acceptance checks against a disposable, signed Studio installation.

Uses the official engine sandbox/release-directory mechanism. It does not alter
the production signing key, install prerequisites or publish the fixture version.
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
sys.path.insert(0, str(Path(__file__).resolve().parent/'app'))
from sdk import StudioClient

APP_ID = 'mrmybal.cydocstudio'


def read_when_ready(path, timeout=40):
    deadline = time.monotonic()+timeout
    while time.monotonic() < deadline:
        try:
            return json.loads(path.read_text('utf-8-sig'))
        except (OSError, ValueError):
            time.sleep(.05)
    raise RuntimeError('Timed out waiting for application health: '+str(path))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--payload', type=Path, required=True)
    parser.add_argument('--engine', type=Path, default=Path('D:/_Project/CyInstaller/build/bin/Release/cyinstall.exe'))
    parser.add_argument('--work', type=Path, required=True)
    parser.add_argument('--reuse-releases', type=Path, help='Copy an earlier isolated fixture feed into the fresh work directory.')
    parser.add_argument('--prepare-only', action='store_true', help='Build isolated signed fixtures without installing them.')
    parser.add_argument('--resume-after-update', action='store_true', help='Continue a confirmed update using its pre-update hashes.')
    parser.add_argument('--resume-log', type=Path, help='Original captured PASS log for --resume-after-update.')
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[2]
    work, payload, engine = args.work.resolve(), args.payload.resolve(), args.engine.resolve()
    assert work.is_relative_to(repo/'.tmp') and work.exists()==args.resume_after_update, 'Use a fresh fixture directory, or explicitly resume its recorded update.'
    assert not (payload/'_cyinstall').exists() and (payload/'CyDocStudio.exe').is_file()
    work.mkdir(parents=True,exist_ok=args.resume_after_update)
    sandbox, releases = work/'sandbox', work/'releases'
    environment = dict(os.environ)
    for key in ('CYI_CAPTURE_LAUNCH', 'CYI_TEST_FAIL', 'CYI_SANDBOX', 'CYI_RELEASES_DIR', 'CYDOC_STUDIO_TOKEN', 'CYDOC_STUDIO_ORIGIN', 'CYDOC_CYMCP_HOST'):
        environment.pop(key, None)
    environment.update(CYI_SANDBOX=str(sandbox), CYI_RELEASES_DIR=str(releases),
                       LOCALAPPDATA=str(sandbox/'LocalAppData'), APPDATA=str(sandbox/'AppData'))
    installed = sandbox/'LocalAppData/Programs/CyDocStudio-CyInstaller'
    profile = sandbox/'LocalAppData/CyDocStudio'
    state = sandbox/'LocalAppData/CyInstaller/apps'/APP_ID
    feed = releases/'MrMybal/CyDoc'
    feed.mkdir(parents=True,exist_ok=args.resume_after_update)
    manifest = json.loads((repo/'.cyinstaller/cyinstaller.json').read_text('utf-8'))
    base = json.loads((payload/'app/cydoc/studio/package.json').read_text('utf-8'))['version']
    major, minor, patch = map(int, base.split('.'))
    future = f'{major}.{minor}.{patch+1}'
    checks = []
    def checked(name, condition=True):
        if not condition:
            raise AssertionError(name)
        checks.append(name)
        (work/'checks.json').write_text(json.dumps(checks,indent=2),'utf-8')
        print('PASS '+name, flush=True)
    def run(arguments, executable=engine, expected=(0,), timeout=900, protocol=True):
        process = subprocess.run([str(executable), *(['--json', '--no-elevate'] if protocol else []), *arguments], env=environment,
                                 capture_output=True, encoding='utf-8', errors='replace', timeout=timeout,
                                 creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        events = []
        for line in process.stdout.splitlines():
            try:
                value = json.loads(line)
                if value.get('type') == 'result': events.append(value)
            except (ValueError, AttributeError):
                pass
        result = events[-1] if events else {}
        with (work/'engine.log').open('a', encoding='utf-8') as log:
            log.write(json.dumps({'arguments': [str(x) for x in arguments if 'publisher.key' not in str(x)], 'exit': process.returncode, 'result': result})+'\n')
        if process.returncode not in expected:
            raise RuntimeError(f'CyInstaller exited {process.returncode}: {result or process.stderr[-1000:]}')
        return process.returncode, result
    def receipt():
        return json.loads((state/'receipt.json').read_text('utf-8'))
    def wait_for_exit(pid, timeout=90):
        # Engine wait-pid provides the actual wait during update. For an unowned
        # relaunch, wait for its health marker and let the app's test timer close it.
        deadline=time.monotonic()+timeout
        import ctypes
        kernel=ctypes.windll.kernel32
        kernel.OpenProcess.argtypes=[ctypes.c_ulong,ctypes.c_bool,ctypes.c_ulong]
        kernel.OpenProcess.restype=ctypes.c_void_p
        kernel.CloseHandle.argtypes=[ctypes.c_void_p]
        kernel.WaitForSingleObject.argtypes=[ctypes.c_void_p,ctypes.c_ulong]
        handle=kernel.OpenProcess(0x00100000,False,pid)
        if not handle:return
        try:
            while time.monotonic()<deadline:
                if kernel.WaitForSingleObject(handle,100)==0:return
            raise RuntimeError('The owned fixture application did not close normally.')
        finally:kernel.CloseHandle(handle)

    def finish(after,document,original_digest,draft,job_output,retained_files):
        wait_for_exit(after['pid'])
        run(['rollback','--app',APP_ID])
        run(['verify','--app',APP_ID])
        checked('rollback restores the prior payload without changing user work',receipt()['version']==base and json.loads((installed/'app/cydoc/studio/package.json').read_text('utf-8'))['version']==base and not (installed/'fixture-next-version.txt').exists() and hashlib.sha256(document.read_bytes()).hexdigest()==original_digest)
        run(['update','--app',APP_ID,'--apply'])
        run(['startup','--app',APP_ID])
        _, suggestion=run(['startup','--app',APP_ID],expected=(103,))
        checked('unconfirmed startup triggers the separate 103 recovery protocol',suggestion['status']=='rollback_suggested')
        run(['rollback','--app',APP_ID])
        offline=work/'releases-offline'
        assert releases.resolve().is_relative_to(work) and offline.resolve().is_relative_to(work)
        releases.rename(offline)
        try:
            _, cached=run(['check','--app',APP_ID],expected=(0,100,102))
            checked('offline checks are explicitly identified as cached',cached.get('offline') is True)
        finally:offline.rename(releases)
        run(['uninstall','--app',APP_ID,'--clean','--keep','config,data','--yes'])
        checked('uninstall with retained configuration keeps preferences, jobs and personal files',
                not (installed/'CyDocStudio.exe').exists() and (profile/'config/desktop-settings.json').is_file() and document.is_file() and draft.is_file() and job_output.read_text('utf-8')=='Existing job output')
        checked('retained documents, original settings and output files match their recorded pre-update hashes',
                all(hashlib.sha256(Path(path).read_bytes()).hexdigest()==digest for path,digest in retained_files.items()))
        summary={'appId':APP_ID,'baseVersion':base,'fixtureVersion':future,'checks':checks,'realInstalledStudio':True,'productionTrustUnchanged':True,
                 'sandbox':str(sandbox),'resumedAfterUpdate':args.resume_after_update,'guiVisuallyValidated':False,'onlineGithubValidated':False}
        (work/'result.json').write_text(json.dumps(summary,indent=2)+'\n','utf-8')
        print(json.dumps(summary),flush=True)

    if args.resume_after_update:
        assert args.resume_log and args.resume_log.is_file(), 'Supply the original captured PASS log.'
        checks=[line[5:] for line in args.resume_log.read_text('utf-8-sig').splitlines() if line.startswith('PASS ')]
        retained_files=json.loads((work/'before-update.json').read_text('utf-8'))
        assert len(retained_files)>=4 and all(Path(path).resolve().is_relative_to(profile) for path in retained_files)
        document=next(Path(path) for path in retained_files if Path(path).name=='overview.md' and Path(path).parent.name=='en')
        original_digest=retained_files[str(document)]
        draft=profile/'browser-profile/installer-test-draft.txt'
        job_output=profile/'jobs/Workspaces/retained-export.txt'
        after=json.loads((work/'health-after.json').read_text('utf-8'))
        checked('resumed update matches confirmed startup and recorded pre-update file hashes',
                receipt()['version']==future and after['version']==future and after['confirmed'] and after['updatedFrom']==base
                and all(hashlib.sha256(Path(path).read_bytes()).hexdigest()==digest for path,digest in retained_files.items()))
        finish(after,document,original_digest,draft,job_output,retained_files)
        return

    with tempfile.TemporaryDirectory(prefix='cydoc-installer-fixture-keys-') as private:
        private_root=Path(private).resolve()
        assert private_root.is_relative_to(Path(tempfile.gettempdir()).resolve()) and not private_root.is_relative_to(repo)
        if args.reuse_releases:
            previous_feed=args.reuse_releases.resolve()
            assert previous_feed.is_relative_to(repo/'.tmp') and not previous_feed.is_relative_to(work)
            old_manifest=json.loads((previous_feed/'MrMybal/CyDoc'/f'v{base}'/'cyinstaller.json').read_text('utf-8'))
            assert old_manifest['app']['id']==APP_ID and old_manifest['signing']['publisher_key']!=manifest['signing']['publisher_key']
            manifest['signing']['publisher_key']=old_manifest['signing']['publisher_key']
            shutil.copytree(previous_feed,releases,dirs_exist_ok=True)
        else:
            _, key = run(['keygen','--out',str(private_root/'keys')])
            manifest['signing']['publisher_key'] = key['public_key']
        manifest['update']['confirm_attempts'] = 1
        source = work/'source';source.mkdir()
        shutil.copytree(repo/'.cyinstaller/assets', source/'assets')
        source_manifest = source/'cyinstaller.json'
        source_manifest.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),'utf-8')
        changelog = source/'CHANGELOG.md'
        changelog.write_text(f'# Disposable Studio update fixture\n\n## [{future}] - 2026-11-27\n<!-- cyinstaller: severity=recommended -->\n- Test-only next version; never publish.\n\n## [{base}] - 2026-11-27\n- Actual Studio payload.\n','utf-8')
        signing = private_root/'keys/publisher.key'
        base_release = feed/f'v{base}'
        next_release = feed/f'v{future}'
        if not args.reuse_releases:
            run(['release','--manifest',str(source_manifest),'--changelog',str(changelog),'--app-dir',str(payload),
                 '--version',base,'--out',str(base_release),'--key',str(signing),'--no-websetup'])
            next_payload = work/'next-payload'
            shutil.copytree(payload, next_payload)
            for relative in ('app/cydoc/studio/package.json','runtime/desktop/_internal/CyMCP.json'):
                path = next_payload/relative
                value = json.loads(path.read_text('utf-8'));value['version']=future
                path.write_text(json.dumps(value,ensure_ascii=False,indent=2),'utf-8')
            (next_payload/'fixture-next-version.txt').write_text('Only an isolated acceptance-test version.','utf-8')
            run(['release','--manifest',str(source_manifest),'--changelog',str(changelog),'--app-dir',str(next_payload),
                 '--version',future,'--out',str(next_release),'--key',str(signing),'--previous',str(base_release/'update.json'),'--no-websetup'])
        checked('two signed releases use the real Studio layout and isolated fixture trust')
        if args.prepare_only:
            print('Fixture feed prepared: '+str(releases),flush=True)
            return
        setup = base_release/f'CyDocStudio-{base}-win-x64-setup.exe'
        occupied = sandbox/'occupied';occupied.mkdir(parents=True);marker=occupied/'keep.txt';marker.write_text('Keep me','utf-8')
        occupied_log=work/'occupied-setup.jsonl'
        run(['--silent','--dir',str(occupied),'--log',str(occupied_log)],executable=setup,expected=(2,),protocol=False)
        checked('occupied destination is refused before data changes', marker.read_text('utf-8')=='Keep me' and 'empty' in occupied_log.read_text('utf-8').lower())
        profile.mkdir(parents=True,exist_ok=True)
        legacy_preferences=json.dumps({'language':'fr','theme':'nord','textScale':1.0,'allowedFolders':[],'port':0})
        (profile/'desktop-settings.json').write_text(legacy_preferences,'utf-8')
        draft=profile/'browser-profile/installer-test-draft.txt';draft.parent.mkdir();draft.write_text('Private local draft','utf-8')
        job_output=profile/'jobs/Workspaces/retained-export.txt';job_output.parent.mkdir(parents=True);job_output.write_text('Existing job output','utf-8')
        run(['--silent','--dir',str(installed),'--log',str(work/'setup.jsonl')],executable=setup,protocol=False)
        checked('setup registers the actual app, engine and receipt', receipt()['version']==base and (installed/'_cyinstall/app-install.json').is_file())
        installed_engine=installed/'_cyinstall/cyinstall.exe'
        health1=work/'health-before.json'
        first=subprocess.Popen([str(installed/'runtime/desktop/CyDocStudioRuntime.exe'),'--data',str(profile),'--health-report',str(health1),'--exit-after','45'],
                               env=environment,cwd=installed,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        information=read_when_ready(health1)
        checked('installed Studio initializes and confirms startup', information['confirmed'] and information['version']==base and information['updateMode']=='managed')
        client=StudioClient(information['origin'])
        project=client.create_project(name='Installer migration manual',template='cydoc',git=False)
        built=client.request(client.route('projects',project['id'],'publish'),'POST',{})
        import io, zipfile
        with zipfile.ZipFile(io.BytesIO(client.download(project['id']))) as archive:
            checked('the packaged service exports the bilingual example with optional media and bundled Node dependencies',
                    'Documentation/Documentation.html' in archive.namelist() and 'Documentation/DocAI.md' in archive.namelist() and built.get('entry'))
        page=client.page(project['id'],'en','overview')
        client.update_page(project['id'],'en','overview',page['body']+'\nWork retained across installer updates.\n',page['revisionToken'])
        authoring=profile/'workspace/projects'/project['id']/'.CyDocBuild'
        configuration=json.loads((authoring/'cydoc.config.json').read_text('utf-8'))
        document=authoring/configuration['content']/'en/overview.md'
        original_digest=hashlib.sha256(document.read_bytes()).hexdigest()
        retained_files={str(path):hashlib.sha256(path.read_bytes()).hexdigest() for path in (document,draft,job_output,profile/'desktop-settings.json')}
        (work/'before-update.json').write_text(json.dumps(retained_files,indent=2),'utf-8')
        first.wait(timeout=70)
        checked('normal shutdown retains saved project content and original preferences', first.returncode==0 and (profile/'desktop-settings.json').read_text('utf-8')==legacy_preferences)
        _, available=run(['check','--app',APP_ID],expected=(100,102))
        checked('engine discovers the signed next version', available['latest_version']==future)
        update_file=next_release/'update.json';signed_bytes=update_file.read_bytes()
        update_file.write_bytes(signed_bytes+b' ')
        run(['check','--app',APP_ID],expected=(4,))
        update_file.write_bytes(signed_bytes)
        checked('a changed signed manifest is rejected without changing the installed version',receipt()['version']==base)
        asset=next_release/f'CyDocStudio-{future}-win-x64.zip';size=asset.stat().st_size
        with asset.open('ab') as stream:stream.write(b'tamper')
        run(['update','--app',APP_ID,'--download-only'],expected=(4,))
        with asset.open('r+b') as stream:stream.truncate(size)
        checked('a damaged payload is rejected and user work is preserved',receipt()['version']==base and hashlib.sha256(document.read_bytes()).hexdigest()==original_digest)
        run(['update','--app',APP_ID,'--download-only'],expected=(102,))
        health_wait=work/'health-wait.json'
        waiting=subprocess.Popen([str(installed/'runtime/desktop/CyDocStudioRuntime.exe'),'--data',str(profile),'--health-report',str(health_wait),'--exit-after','120'],
                                 env=environment,cwd=installed,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        current=read_when_ready(health_wait)
        health2=work/'health-after.json'
        relaunch=subprocess.list2cmdline(['--data',str(profile),'--health-report',str(health2),'--exit-after','20'])
        assert waiting.poll() is None
        # The CLI's graceful process strategy exercises the actual close callback.
        # The long timer is only a fallback; no OS automation or force-close here.
        _,applied=run(['update','--app',APP_ID,'--apply','--relaunch','--relaunch-args',relaunch],executable=installed_engine)
        waiting.wait(timeout=30)
        after=read_when_ready(health2)
        # Operation logs are human-readable text; stdout is the JSON protocol.
        close_logged=any(' step close_processes done' in line for line in Path(applied['log']).read_text('utf-8-sig').splitlines())
        checked('engine requests normal app closure, updates, relaunches and receives confirmation',
                waiting.returncode==0 and close_logged
                and receipt()['version']==future and after['version']==future and after['updatedFrom']==base and after['confirmed'])
        checked('actual project files, job outputs and browser profile survive update',hashlib.sha256(document.read_bytes()).hexdigest()==original_digest and draft.read_text('utf-8')=='Private local draft' and job_output.read_text('utf-8')=='Existing job output')
        finish(after,document,original_digest,draft,job_output,retained_files)


if __name__=='__main__':
    main()
