"""Native runtime names and user data paths; no graphical imports."""
import os
from pathlib import Path, PurePosixPath
import sys


def executable_name(name, platform=None):
    return name + ('.exe' if (platform or sys.platform) == 'win32' else '')


def default_data_directory(environment=None, home=None, platform=None):
    environment = os.environ if environment is None else environment
    home = Path.home() if home is None else Path(home)
    if (platform or sys.platform) == 'win32':
        base = Path(environment.get('LOCALAPPDATA', home))
    else:
        value = environment.get('XDG_DATA_HOME', '')
        base = Path(value) if value and PurePosixPath(value).is_absolute() else home/'.local/share'
    return base/'CyDocStudio'


def cef_files(directory, platform=None):
    windows = (platform or sys.platform) == 'win32'
    directory = Path(directory)
    return (directory/('cyui_webcef_bridge.dll' if windows else 'libcyui_webcef_bridge.so'),
            directory/executable_name('cyui_webcef_helper', platform))
