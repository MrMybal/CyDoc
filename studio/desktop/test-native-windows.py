"""Check native Studio and setup on a private Windows desktop, never the input desktop."""
import argparse
import ctypes
from ctypes import wintypes
import json
import os
from pathlib import Path
import subprocess
import sys
import time
from uuid import uuid4


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--release',type=Path,required=True)
    parser.add_argument('--work',type=Path,required=True)
    parser.add_argument('--worker',action='store_true',help=argparse.SUPPRESS)
    parser.add_argument('--resume-setup',action='store_true',help='Reuse a completed setup from this same test directory.')
    args=parser.parse_args()
    if sys.platform!='win32':parser.error('Run on Windows.')
    repo=Path(__file__).resolve().parents[2]
    work=args.work.resolve();release=args.release.resolve(strict=True)
    if not work.is_relative_to(repo/'.tmp') or work.exists()!=args.resume_setup:parser.error('Use a fresh .tmp directory or explicitly resume its setup.')
    user=ctypes.WinDLL('user32',use_last_error=True)
    user.GetThreadDesktop.argtypes=[wintypes.DWORD];user.GetThreadDesktop.restype=wintypes.HANDLE
    user.GetUserObjectInformationW.argtypes=[wintypes.HANDLE,ctypes.c_int,ctypes.c_void_p,wintypes.DWORD,ctypes.c_void_p]
    user.OpenInputDesktop.argtypes=[wintypes.DWORD,wintypes.BOOL,wintypes.DWORD];user.OpenInputDesktop.restype=wintypes.HANDLE
    user.CloseDesktop.argtypes=[wintypes.HANDLE]
    def name(handle):
        value=ctypes.create_unicode_buffer(256)
        if not user.GetUserObjectInformationW(handle,2,value,ctypes.sizeof(value),None):raise ctypes.WinError(ctypes.get_last_error())
        return value.value
    if not args.worker:
        desktop_name='CyDocValidation'+uuid4().hex
        user.CreateDesktopW.argtypes=[wintypes.LPCWSTR,wintypes.LPCWSTR,ctypes.c_void_p,wintypes.DWORD,wintypes.DWORD,ctypes.c_void_p]
        user.CreateDesktopW.restype=wintypes.HANDLE
        desktop=user.CreateDesktopW(desktop_name,None,None,0,0x01ff,None)
        if not desktop:raise ctypes.WinError(ctypes.get_last_error())
        try:
            startup=subprocess.STARTUPINFO();startup.lpDesktop='winsta0\\'+desktop_name
            environment=dict(os.environ,CYDOC_PRIVATE_DESKTOP=desktop_name)
            with work.with_suffix('.worker.log').open('w',encoding='utf-8') as log:
                result=subprocess.run([sys.executable,__file__,'--release',str(release),'--work',str(work),'--worker',*(['--resume-setup'] if args.resume_setup else [])],
                                      env=environment,startupinfo=startup,stdout=log,stderr=log,creationflags=subprocess.CREATE_NO_WINDOW)
            print('Private desktop worker exit: '+str(result.returncode),flush=True)
            raise SystemExit(result.returncode)
        finally:user.CloseDesktop(desktop)
    expected=os.environ.get('CYDOC_PRIVATE_DESKTOP')
    kernel=ctypes.WinDLL('kernel32');kernel.GetCurrentThreadId.restype=wintypes.DWORD
    assert expected
    user.OpenDesktopW.argtypes=[wintypes.LPCWSTR,wintypes.DWORD,wintypes.BOOL,wintypes.DWORD];user.OpenDesktopW.restype=wintypes.HANDLE
    user.SetThreadDesktop.argtypes=[wintypes.HANDLE]
    private=user.OpenDesktopW(expected,0,False,0x01ff)
    if not private:raise ctypes.WinError(ctypes.get_last_error())
    if not user.SetThreadDesktop(private):raise ctypes.WinError(ctypes.get_last_error())
    assert name(user.GetThreadDesktop(kernel.GetCurrentThreadId())).casefold()==expected.casefold()
    input_desktop=user.OpenInputDesktop(0,False,1)
    if not input_desktop:raise ctypes.WinError(ctypes.get_last_error())
    try:assert name(input_desktop)!=expected,'Never run on the input desktop.'
    finally:user.CloseDesktop(input_desktop)
    work.mkdir(parents=True,exist_ok=args.resume_setup)
    sandbox=work/'sandbox';installed=sandbox/'LocalAppData/Programs/CyDocStudio-CyInstaller';profile=sandbox/'LocalAppData/CyDocStudio'
    environment=dict(os.environ,CYI_SANDBOX=str(sandbox),LOCALAPPDATA=str(sandbox/'LocalAppData'),APPDATA=str(sandbox/'AppData'))
    for key in ('CYI_RELEASES_DIR','CYI_CAPTURE_LAUNCH','CYI_TEST_FAIL','CYDOC_CYMCP_HOST','CYDOC_STUDIO_ORIGIN','CYDOC_STUDIO_TOKEN'):
        environment.pop(key,None)
    environment['CYI_RELEASES_DIR']=str(work/'offline-releases')
    version=json.loads((release/'update.json').read_text('utf-8'))['version']
    setup=release/f'CyDocStudio-{version}-win-x64-setup.exe'
    checks=[]
    startup=subprocess.STARTUPINFO();startup.lpDesktop='winsta0\\'+expected
    if not args.resume_setup:
        with (work/'setup.log').open('w',encoding='utf-8') as log:
            result=subprocess.run([str(setup),'--lang','fr','--capture-dir',str(work/'setup-captures')],
                                  env=environment,startupinfo=startup,stdout=log,stderr=log,timeout=900,creationflags=subprocess.CREATE_NO_WINDOW)
        assert result.returncode==0,'Read setup.log and captured Finish page.'
    receipt=json.loads((sandbox/'LocalAppData/CyInstaller/apps/mrmybal.cydocstudio/receipt.json').read_text('utf-8'))
    assert receipt['version']==version and Path(receipt['install_dir']).resolve()==installed
    assert len(list((work/'setup-captures').glob('*.png')))>=4
    checks.append('actual offline setup completes on an invisible private desktop')
    (profile/'config').mkdir(parents=True,exist_ok=True)
    for tab,locale,theme in [('editor','fr','light'),('assistant','fr','light'),('updates','en','dark')]:
        (profile/'config/desktop-settings.json').write_text(json.dumps({'language':locale,'theme':theme,'textScale':1.0,'port':0}),encoding='utf-8')
        health=work/(tab+'-health.json')
        with (work/(tab+'.log')).open('w',encoding='utf-8') as log:
            process=subprocess.Popen([str(installed/'runtime/desktop/CyDocStudioRuntime.exe'),'--data',str(profile),'--tab',tab,
                                      '--health-report',str(health),'--capture',str(work/(tab+'.png')),'--exit-after','12'],
                                     env=environment,startupinfo=startup,cwd=installed,stdout=log,stderr=log,creationflags=subprocess.CREATE_NO_WINDOW)
            try:
                deadline=time.monotonic()+60
                while not health.exists():
                    assert process.poll() is None and time.monotonic()<deadline,'Native startup failed: '+tab
                    time.sleep(.1)
                state=json.loads(health.read_text())
                assert state['version']==version and state['confirmed'] and state['updateMode']=='managed'
                assert process.wait(timeout=75)==0
                checks.append('native '+tab+' initializes, confirms and closes normally: '+locale+'/'+theme)
                print('PASS '+checks[-1],flush=True)
            finally:
                if process.poll() is None:process.terminate();process.wait(timeout=15)
    engine=installed/'_cyinstall/cyinstall.exe'
    result=subprocess.run([str(engine),'--json','--no-elevate','uninstall','--app','mrmybal.cydocstudio','--clean','--keep','config,data','--yes'],
                          env=environment,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=900,creationflags=subprocess.CREATE_NO_WINDOW)
    (work/'uninstall.log').write_text(result.stdout+result.stderr,encoding='utf-8')
    assert result.returncode==0 and not (installed/'CyDocStudio.exe').exists()
    report={'checks':checks,'version':version,'privateDesktop':expected,'desktopControlled':False,'inputDesktopUsed':False,
            'nativeCefTested':True,'nativeAssistantStarted':True,'realProviderTested':False,'uninstalled':True}
    (work/'result.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report),flush=True)


if __name__=='__main__':main()
