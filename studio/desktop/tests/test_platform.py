"""Native platform paths and graceful POSIX close; no window or signal is sent."""
import os
from pathlib import Path
import signal
import sys
import pytest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'app'))
from platform_paths import executable_name, default_data_directory, cef_files
from shutdown import close_signals


def test_platform_runtime_names_and_user_data_follow_the_target():
    assert executable_name('cyinstall','win32')=='cyinstall.exe'
    assert executable_name('cyinstall','linux')=='cyinstall'
    assert default_data_directory({'LOCALAPPDATA':'C:/Profile'},'/home/test','win32')==Path('C:/Profile/CyDocStudio')
    assert default_data_directory({},'/home/test','linux')==Path('/home/test/.local/share/CyDocStudio')
    assert default_data_directory({'XDG_DATA_HOME':'/data'},'/home/test','linux')==Path('/data/CyDocStudio')
    assert default_data_directory({'XDG_DATA_HOME':'relative'},'/home/test','linux')==Path('/home/test/.local/share/CyDocStudio')
    assert cef_files('/cef','linux')==(Path('/cef/libcyui_webcef_bridge.so'),Path('/cef/cyui_webcef_helper'))
    assert cef_files('/cef','win32')==(Path('/cef/cyui_webcef_bridge.dll'),Path('/cef/cyui_webcef_helper.exe'))


@pytest.mark.skipif(os.name=='nt',reason='POSIX signal handler contract')
def test_update_signal_requests_durable_close_and_restores_handlers():
    previous=signal.getsignal(signal.SIGTERM)
    calls=[]
    with close_signals(lambda:calls.append('requested')):
        handler=signal.getsignal(signal.SIGTERM)
        handler(signal.SIGTERM,None)
        assert calls==['requested']
    assert signal.getsignal(signal.SIGTERM)==previous
