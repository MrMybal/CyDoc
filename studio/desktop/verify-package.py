"""Verify an assembled Windows package without launching the graphical editor."""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile
from PyInstaller.archive.readers import CArchiveReader


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    root = args.directory.resolve()
    runtime = root/'runtime/desktop/CyDocStudioRuntime.exe'
    native = root/'runtime/desktop/CyDocStudioHost.exe'
    required = ['CyDocStudio.exe', 'LICENCES/CyMCPSDK-MIT.txt', 'LICENCES/CyMCPSDK-curl-COPYING',
                'LICENCES/CyMCPSDK-httplib-LICENSE', 'LICENCES/CyMCPSDK-nlohmann-LICENSE.MIT',
                'LICENCES/CyMCPSDK-picosha2-LICENSE', 'LICENCES/CyMCPSDK-revision.txt',
                'app/cydoc/src/viewer.css', 'LICENCES/CyInstaller/LICENSE.txt']
    assert runtime.is_file() and native.is_file()
    assert all((root/name).is_file() for name in required)
    archive = CArchiveReader(str(runtime))
    modules = archive.open_embedded_archive('PYZ.pyz').toc
    assert not any(name.lower().startswith('cytools') for name in modules)
    private_names = {'state.sqlite3', 'desktop-settings.json', 'assistant-settings.json', 'host-ready.json', 'server-ready.json'}
    for path in root.rglob('*'):
        assert 'cytools' not in path.name.lower() and path.name != 'CyTool.json', path
        assert path.name not in private_names, path
    with tempfile.TemporaryDirectory(prefix='cydoc-package-check-') as data:
        base = [str(runtime), '--tool', '--data-dir', data]
        listed = subprocess.run(base+['list'], capture_output=True, encoding='utf-8', timeout=30)
        assert listed.returncode == 0, listed.stderr
        catalogue = json.loads(listed.stdout)
        assert {'create_project', 'update_page', 'op_export_manual', 'cy_get_job'} <= {item['name'] for item in catalogue}
        invalid = subprocess.run(base+['call', 'update_page', '--json', '{}'], capture_output=True, encoding='utf-8', timeout=30)
        assert invalid.returncode != 0 and not invalid.stdout.strip()
        assert json.loads(invalid.stderr)['error']['code']
        assert not (Path(data)/'host-ready.json').exists()
        # Use only the packaged Node/compiler, including optional Three.js media.
        fixture=Path(data)/'consumer/.CyDocBuild'
        for locale in ('en','fr'):
            content=fixture/'manual'/locale;content.mkdir(parents=True)
            revision='revision' if locale=='en' else 'sourceRevision'
            title,heading,body=('Help','Start','Local manual.') if locale=='en' else ('Aide','Démarrer','Manuel local.')
            (content/'overview.md').write_text(f'---\nid: overview\ntitle: {title}\nsection: Guides\norder: 0\n{revision}: "1"\n---\n\n## {heading} {{#start}}\n\n{body}\n','utf-8')
        configuration={'name':'Packaged consumer','version':'1.0.0','defaultLocale':'en','locales':[{'code':'en','label':'English'},{'code':'fr','label':'Français'}],
                       'homePage':'overview','content':'manual','out':'../Documentation','modules':['image','video','mesh','gallery','graph','gif']}
        (fixture/'assets').mkdir()
        config=fixture/'cydoc.config.json';config.write_text(json.dumps(configuration),'utf-8')
        exported=subprocess.run([str(root/'runtime/node.exe'),str(root/'app/cydoc/tools/cli.mjs'),'build',str(config)],
                                capture_output=True,encoding='utf-8',errors='replace',timeout=90)
        assert exported.returncode==0,exported.stderr
        manual=fixture.parent/'Documentation'
        assert (manual/'Documentation.html').is_file() and (manual/'DocAI.md').is_file()
        assert all((manual/'DocData'/f'media-{module}.js').is_file() for module in configuration['modules'])
    summary = {'sdkRevision': (root/'LICENCES/CyMCPSDK-revision.txt').read_text('utf-8-sig').strip(),
               'registryOperations': len(catalogue), 'pythonModulesInspected': len(modules),
               'legacyRuntimeAbsent': True, 'privateStateAbsent': True, 'cliValidationPassed': True,'packagedExportPassed':True}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(summary, indent=2)+'\n', 'utf-8')
    print(json.dumps(summary))


if __name__ == '__main__':
    main()
