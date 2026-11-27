"""Copy installed component notices without local pip provenance/configuration."""
from pathlib import Path
import importlib.metadata
import shutil
import sys
import json
import hashlib
import re
import subprocess

destination = Path(sys.argv[1]).resolve()
destination.mkdir(parents=True, exist_ok=True)
python_notice = Path(sys.base_prefix)/'LICENSE.txt'
if not python_notice.exists() and sys.platform == 'linux':
    python_notice = Path('/usr/share/doc')/('python'+'.'.join(map(str,sys.version_info[:2])))/'copyright'
if python_notice.exists():
    shutil.copyfile(python_notice, destination/'Python.txt')
if sys.platform == 'linux' and len(sys.argv) > 2:
    # Preserve distro notices for exact system-library copies collected by PyInstaller.
    runtime = Path(sys.argv[2]).resolve(strict=True)
    cached = subprocess.check_output(['ldconfig', '-p'], text=True)
    libraries = {}
    for line in cached.splitlines():
        match = re.match(r'\s*(\S+)\s+.*=>\s+(.+)$', line)
        if match:libraries.setdefault(match[1], []).append(Path(match[2]))
    def digest(path):
        with path.open('rb') as stream:return hashlib.file_digest(stream, 'sha256').digest()
    records = []
    for copied in runtime.rglob('*'):
        if not copied.is_file() or copied.name not in libraries:continue
        for original in libraries[copied.name]:
            if not original.is_file() or digest(copied) != digest(original):continue
            canonical = original.resolve()
            candidates = [str(canonical), str(original)]
            if str(canonical).startswith('/usr/'):candidates.append(str(canonical)[4:])
            package = None
            for candidate in candidates:
                result = subprocess.run(['dpkg-query', '-S', candidate], capture_output=True, text=True)
                if result.returncode == 0:
                    package = result.stdout.splitlines()[0].split(': ', 1)[0].split(':')[0];break
            if not package:raise RuntimeError('No package notice found for '+copied.name)
            notice = Path('/usr/share/doc')/package/'copyright'
            if not notice.is_file():raise RuntimeError('Missing system library copyright: '+package)
            target = destination/'System-libraries'/package/'copyright';target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(notice, target)
            records.append({'file':copied.relative_to(runtime).as_posix(), 'package':package})
            break
    shutil.copytree('/usr/share/common-licenses', destination/'System-license-texts', dirs_exist_ok=True)
    (destination/'System-libraries.json').write_text(json.dumps(records, indent=2)+'\n', encoding='utf-8')
for distribution in importlib.metadata.distributions():
    name = ''.join(character for character in distribution.metadata['Name'] if character.isalnum() or character in '-_.')
    # Never reintroduce the removed runtime's notices from an older build environment.
    if name.lower().replace('_', '-') == 'cytools-core':
        continue
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
