"""Process-adapter fixtures, distinct from real CyInstaller end-to-end validation."""
import json
from pathlib import Path
import subprocess
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'app'))
from updater import UpdateService, APP_ID
from storage import prepare_preferences
from shutdown import CloseGuard


def managed(root):
    engine=root/'_cyinstall';engine.mkdir(parents=True)
    for name in ('cyinstall.exe','cyinstall-ui.exe'):(engine/name).write_bytes(b'fixture')
    (engine/'app-install.json').write_text(json.dumps({'app_id':APP_ID}),encoding='utf-8')
    (engine/'cyinstaller.json').write_text(json.dumps({'app':{'id':APP_ID}}),encoding='utf-8')
    return UpdateService(root)


def complete(service):
    service.pending.result(timeout=5)
    return service.poll()


def test_updater_development_portable_and_broken_registration(tmp_path):
    for root,mode in ((None,'development'),(tmp_path/'portable','portable')):
        service=UpdateService(root)
        try:assert service.mode==mode and not service.check()
        finally:service.close()
    (tmp_path/'broken/_cyinstall').mkdir(parents=True)
    service=UpdateService(tmp_path/'broken')
    try:assert service.mode=='repair' and not service.open_window()
    finally:service.close()


def test_lifecycle_and_manual_automatic_checks_use_the_installed_engine(tmp_path,monkeypatch):
    calls=[]
    def run(arguments,**options):
        calls.append((arguments,options))
        code=100 if 'check' in arguments else 0
        text=json.dumps({'type':'result','code':code,'status':'update_available' if code else 'ok','latest_version':'0.1.4'})
        return subprocess.CompletedProcess(arguments,code,'{"type":"progress"}\n'+text+'\n','')
    monkeypatch.setattr(UpdateService,'_execute',staticmethod(run))
    service=managed(tmp_path/'Studio with spaces')
    try:
        assert service.startup().success
        assert not service.confirmed
        assert service.confirm();assert not service.check()
        assert complete(service).success and service.confirmed
        service.tick();assert complete(service).code==100
        assert calls[-1][0][-2:]==['check','--auto']
        assert service.check();assert complete(service).success
        assert calls[-1][0][-1]=='check' and '--auto' not in calls[-1][0]
        assert all(Path(arguments[0])==service.cli and options['cwd']==service.cli.parent for arguments,options in calls)
    finally:service.close()


def test_protocol_errors_never_become_up_to_date(tmp_path,monkeypatch):
    service=managed(tmp_path/'app')
    try:
        monkeypatch.setattr(UpdateService,'_execute',staticmethod(lambda args,**kw:subprocess.CompletedProcess(args,5,json.dumps({'type':'result','code':5,'message':'offline without cache'}),'')))
        service.check();result=complete(service)
        assert not result.success and 'offline without cache' in result.diagnostic
        monkeypatch.setattr(UpdateService,'_execute',staticmethod(lambda args,**kw:subprocess.CompletedProcess(args,0,'not JSON','')))
        service.check();assert not complete(service).success
        monkeypatch.setattr(UpdateService,'_execute',staticmethod(lambda args,**kw:subprocess.CompletedProcess(args,0,json.dumps({'type':'result','code':5}),'')))
        service.check();assert not complete(service).success
    finally:service.close()


def test_recovery_and_update_windows_use_the_actual_host_pid_without_quitting(tmp_path,monkeypatch):
    import os
    calls=[]
    class Window:
        def poll(self):return None
    monkeypatch.setattr(subprocess,'Popen',lambda args,**options:(calls.append((args,options)) or Window()))
    service=managed(tmp_path/'app')
    try:
        monkeypatch.setattr(UpdateService,'_execute',staticmethod(lambda args,**kw:subprocess.CompletedProcess(args,103,json.dumps({'type':'result','code':103,'status':'rollback_suggested'}),'')))
        assert service.startup().code==103 and not service.startup_ok and not service.confirm()
        assert service.open_window(recovery=True)
        assert calls[0][0][1:]==['startup','--wait-pid',str(os.getpid()),'--relaunch']
        assert not service.check()  # No concurrent update/check while its window is active.
        service.window=None
        assert service.open_window()
        assert calls[-1][0][1:3]==['update','ui']
        service.window=None
        service.relaunch_arguments=['--data','D:/My docs/Préférences','--origin','https://studio.example.com']
        assert service.open_window()
        assert calls[-1][0][-2:]==['--relaunch-args',subprocess.list2cmdline(service.relaunch_arguments)]
    finally:service.close()


def test_closing_stops_an_owned_check_process_without_waiting_for_network(tmp_path):
    import time
    service=UpdateService()
    future=service.executor.submit(service._execute,[sys.executable,'-c','import time; time.sleep(30)'],encoding='utf-8',timeout=40,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
    deadline=time.monotonic()+5
    while service.process is None and time.monotonic()<deadline:time.sleep(.01)
    assert service.process is not None
    start=time.monotonic();service.close()
    assert time.monotonic()-start<3
    assert future.result().returncode!=0


def test_settings_are_copied_once_and_projects_drafts_keep_their_paths(tmp_path):
    original='{"language":"fr","theme":"nord"}'
    (tmp_path/'desktop-settings.json').write_text(original,'utf-8')
    project=tmp_path/'workspace/projects/manual/page.md';project.parent.mkdir(parents=True);project.write_text('User work','utf-8')
    draft=tmp_path/'browser-profile/draft';draft.parent.mkdir();draft.write_text('Local draft','utf-8')
    preferences=prepare_preferences(tmp_path)
    assert (preferences/'desktop-settings.json').read_text('utf-8')==original
    (preferences/'desktop-settings.json').write_text('{"language":"en"}','utf-8')
    prepare_preferences(tmp_path)
    assert (preferences/'desktop-settings.json').read_text('utf-8')=='{"language":"en"}'
    assert (tmp_path/'desktop-settings.json').read_text('utf-8')==original
    assert project.read_text('utf-8')=='User work' and draft.read_text('utf-8')=='Local draft'


def test_close_handshake_ignores_stale_responses_and_times_out_without_approval(monkeypatch):
    import shutdown
    clock=[0]
    monkeypatch.setattr(shutdown.time,'monotonic',lambda:clock[0])
    guard=CloseGuard();assert guard.request() is False
    request=guard.request_id
    assert guard.reply({'requestId':'stale','ready':True}) is None
    assert guard.request_id==request
    clock[0]=13
    assert guard.expired()==request and guard.request_id is None
    guard.request();assert guard.reply({'requestId':guard.request_id,'ready':False}) is False
