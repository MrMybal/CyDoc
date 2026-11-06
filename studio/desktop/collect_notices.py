"""Copy installed component notices without local pip provenance/configuration."""
from pathlib import Path
import importlib.metadata
import shutil
import sys

destination = Path(sys.argv[1]).resolve()
destination.mkdir(parents=True, exist_ok=True)
python_notice = Path(sys.base_prefix)/'LICENSE.txt'
if python_notice.exists():
    shutil.copyfile(python_notice, destination/'Python.txt')
for distribution in importlib.metadata.distributions():
    name = ''.join(character for character in distribution.metadata['Name'] if character.isalnum() or character in '-_.')
    for entry in distribution.files or []:
        path = Path(str(entry))
        if path.name.lower().startswith(('license','licence','copying','notice','copyright')) or ('.dist-info' in str(path) and 'licenses' in path.parts):
            if '__pycache__' in path.parts or path.suffix.lower() in {'.py', '.pyc', '.pyo'}:
                continue
            source = Path(distribution.locate_file(entry))
            if source.is_file():
                # A bounded relative name, independent of the build machine's install path.
                relative = Path(*[part for part in path.parts if part not in ('.','..')])
                target = destination/name/relative
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, target)
