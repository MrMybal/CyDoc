"""Keep legacy user work in place and copy only known preference files once."""
from pathlib import Path
import shutil


def prepare_preferences(data):
    root = Path(data).resolve()
    directory = root/'config'
    directory.mkdir(parents=True, exist_ok=True)
    for name in ('desktop-settings.json', 'desktop.ini', 'allowed-folders.json'):
        old, target = root/name, directory/name
        if old.is_file() and not target.exists():
            # Exclusive creation: another Studio startup can never overwrite the winner.
            try:
                with old.open('rb') as source, target.open('xb') as output:
                    shutil.copyfileobj(source, output)
            except FileExistsError:
                pass
    return directory
