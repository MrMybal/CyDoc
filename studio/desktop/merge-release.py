"""Merge verified Windows/Linux assets and sign the final feed locally with CyInstaller."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess


def digest(path):
    with path.open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()


def main():
    repo=Path(__file__).resolve().parents[2]
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--windows',type=Path,required=True)
    parser.add_argument('--linux',type=Path,required=True)
    parser.add_argument('--engine',type=Path,required=True)
    parser.add_argument('--key',type=Path,required=True)
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--previous',type=Path)
    args=parser.parse_args()
    key=args.key.resolve(strict=True)
    if key.is_relative_to(repo):parser.error('Keep the signing private key outside the checkout.')
    output=args.out.resolve()
    if output.exists() and any(output.iterdir()):parser.error('Use a fresh output directory.')
    manifest=repo/'.cyinstaller/cyinstaller.json'
    expected_manifest=digest(manifest)
    version=json.loads((repo/'studio/package.json').read_text())['version']
    app=json.loads(manifest.read_text())['app']
    selected=[]
    for source,platform in [(args.windows.resolve(strict=True),'win-x64'),(args.linux.resolve(strict=True),'linux-x64')]:
        if output.is_relative_to(source) or source.is_relative_to(output):parser.error('Keep merged output separate from platform staging directories.')
        metadata=json.loads((source/'update.json').read_text())
        if metadata['version']!=version or metadata['app_id']!=app['id'] or digest(source/'cyinstaller.json')!=expected_manifest:
            parser.error('Platform version, identity or manifest differs from the source checkout.')
        assets=metadata['assets'][platform]
        for kind in ('payload','engine','setup'):
            asset=assets[kind]
            if Path(asset['file']).name!=asset['file']:parser.error('Asset names must be flat release filenames.')
            path=source/asset['file']
            if path.stat().st_size!=asset['size'] or digest(path)!=asset['sha256']:parser.error('Invalid platform asset: '+path.name)
            selected.append(path)
        bootstrap=source/(app['file_name']+'-'+platform+'-websetup'+('.exe' if platform.startswith('win') else '.run'))
        if not bootstrap.is_file():parser.error('Missing online bootstrap: '+bootstrap.name)
        # Bootstrap files are covered by their platform's SHA256SUMS rather than update.json.
        sums={name:value for value,name in (line.split('  ',1) for line in (source/'SHA256SUMS.txt').read_text().splitlines())}
        if digest(bootstrap)!=sums.get(bootstrap.name):parser.error('Invalid bootstrap checksum: '+bootstrap.name)
        selected.append(bootstrap)
    output.mkdir(parents=True,exist_ok=True)
    for path in selected:shutil.copy2(path,output/path.name)
    shutil.copyfile(manifest,output/'cyinstaller.json')
    command=[str(args.engine.resolve(strict=True)),'release-manifest','--manifest',str(manifest),'--changelog',str(repo/'CHANGELOG.md'),
             '--version',version,'--assets',str(output)]
    if args.previous:command+=['--previous',str(args.previous.resolve(strict=True))]
    subprocess.run(command,check=True)
    subprocess.run([str(args.engine.resolve()),'sign',str(output/'update.json'),'--key',str(key)],check=True)
    sums=''.join(digest(path)+'  '+path.name+'\n' for path in sorted(output.iterdir()) if path.is_file() and path.name!='SHA256SUMS.txt')
    (output/'SHA256SUMS.txt').write_text(sums,encoding='utf-8')
    print('Signed Windows/Linux release prepared locally. Nothing uploaded or published.',flush=True)


if __name__=='__main__':main()
