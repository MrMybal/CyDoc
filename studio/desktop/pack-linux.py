"""Prepare Linux CyInstaller assets locally; sign the final merged feed on the signing machine."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import zipfile


def archive_files(output, entries):
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for name, path in entries:
            if path.is_symlink() or not path.is_file():raise ValueError('Expected a regular payload file: '+str(path))
            archive.write(path, name)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--payload', type=Path, required=True)
    parser.add_argument('--engine-dir', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    repo = Path(__file__).resolve().parents[2]
    parser.add_argument('--manifest', type=Path, default=repo/'.cyinstaller/cyinstaller.json')
    parser.add_argument('--changelog', type=Path, default=repo/'CHANGELOG.md')
    args = parser.parse_args()
    if sys.platform != 'linux':parser.error('Use the actual Linux engine and payload on Linux.')
    payload, engines = args.payload.resolve(strict=True), args.engine_dir.resolve(strict=True)
    output = args.out.resolve()
    if output.is_relative_to(payload) or output.exists() and any(output.iterdir()):
        parser.error('Use a fresh output directory outside the payload.')
    if (payload/'_cyinstall').exists():parser.error('A compiled payload must not contain an installed engine registration.')
    version = json.loads((payload/'app/cydoc/studio/package.json').read_text())['version']
    manifest = json.loads(args.manifest.read_text(encoding='utf-8'))
    name = manifest['app']['file_name']
    for executable in [payload/'runtime/desktop/CyDocStudioRuntime',payload/'runtime/desktop/CyDocStudioHost',payload/'runtime/node',
                       engines/'cyinstall',engines/'cyinstall-ui']:
        with executable.open('rb') as stream:
            if stream.read(4)!=b'\x7fELF':parser.error('Expected a native Linux ELF: '+str(executable))
    subprocess.run([str(engines/'cyinstall'),'manifest','validate',str(args.manifest)],check=True)
    output.mkdir(parents=True,exist_ok=True)
    archive = output/f'{name}-{version}-linux-x64.zip'
    archive_files(archive,[(path.relative_to(payload).as_posix(),path) for path in sorted(payload.rglob('*')) if path.is_file()])
    archive_files(output/'cyinstall-linux-x64.zip',[(name,engines/name) for name in ('cyinstall','cyinstall-ui')])
    shutil.copyfile(args.manifest,output/'cyinstaller.json')
    common = [str(engines/'cyinstall'),'pack','--manifest',str(args.manifest),'--version',version,'--ui',str(engines/'cyinstall-ui')]
    subprocess.run(common+['--payload',str(archive),'--out',str(output/f'{name}-{version}-linux-x64-setup.run')],check=True)
    subprocess.run(common+['--online','--out',str(output/f'{name}-linux-x64-websetup.run')],check=True)
    subprocess.run([str(engines/'cyinstall'),'release-manifest','--manifest',str(args.manifest),'--changelog',str(args.changelog),
                    '--version',version,'--assets',str(output)],check=True)
    sums = []
    for path in sorted(output.iterdir()):
        with path.open('rb') as stream:digest = hashlib.file_digest(stream,'sha256').hexdigest()
        sums.append(digest+'  '+path.name+'\n')
    (output/'SHA256SUMS.txt').write_text(''.join(sums),encoding='utf-8')
    print('Linux assets prepared without a private signing key. Merge platforms and sign update.json before publication.',flush=True)


if __name__=='__main__':main()
