"""Build the native Linux x64 Studio payload locally, without publishing or opening a window."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from uuid import uuid4

SDK_REVISION = '35d2d4fd85982d3d0ba278594e85fa37f325b4f2'


def run(arguments, **options):
    subprocess.run(list(map(str, arguments)), check=True, **options)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sdk-root', type=Path, required=True)
    parser.add_argument('--cyui-root', type=Path, required=True)
    parser.add_argument('--cef-root', type=Path, required=True)
    parser.add_argument('--cyinstaller-root', type=Path, required=True)
    parser.add_argument('--python', default=sys.executable)
    parser.add_argument('--node', default=shutil.which('node'))
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--work', type=Path)
    parser.add_argument('--native-build-directory', type=Path)
    parser.add_argument('--cef-build-directory', type=Path)
    parser.add_argument('--sdk-snapshot-revision', help='Exact revision of a separately verified git archive without .git')
    parser.add_argument('--install', action='store_true', help='Install into the specified private Python environment and run both npm lockfiles')
    parser.add_argument('--jobs', type=int, default=2)
    args = parser.parse_args()
    if sys.platform != 'linux' or os.uname().machine not in ('x86_64', 'amd64'):
        parser.error('Build on a Linux x64 host; this does not cross-compile Windows files.')
    repo = Path(__file__).resolve().parents[2]
    sdk, cyui, cef, installer = (path.resolve(strict=True) for path in (args.sdk_root, args.cyui_root, args.cef_root, args.cyinstaller_root))
    if not (installer/'licenses').is_dir() or not (installer/'LICENSE').is_file():
        parser.error('Supply the complete matching CyInstaller source checkout with LICENSE and licenses/.')
    revision = args.sdk_snapshot_revision
    if not revision:
        revision = subprocess.check_output(['git', '-C', str(sdk), 'rev-parse', 'HEAD'], text=True).strip()
    if revision != SDK_REVISION:
        parser.error('Use the validated CyMCPSDK 0.7.5 revision '+SDK_REVISION)
    if not args.node or not 1 <= args.jobs <= 16:
        parser.error('Supply Node.js 22+ and 1..16 build jobs.')
    node = Path(args.node).resolve(strict=True)
    if int(subprocess.check_output([str(node), '--version'], text=True).lstrip('v').split('.')[0]) < 22:
        parser.error('Node.js 22 or later is required.')
    output = args.out.resolve()
    if output == repo or output in repo.parents or output.exists() and any(output.iterdir()):
        parser.error('Use a fresh, empty payload directory outside the source inputs.')
    for source in (sdk, cyui, cef, installer, *(repo/name for name in ('tools','web','ai','dist','src','studio'))):
        if output == source or output in source.parents or output.is_relative_to(source):
            parser.error('Keep the payload separate from build inputs.')
    work = (args.work or repo/'.tmp'/('linux-build-'+uuid4().hex)).resolve()
    if work == output or work.is_relative_to(output) or output.is_relative_to(work):
        parser.error('Keep work files and the payload in separate directories.')
    if work.exists() and any(work.iterdir()):
        parser.error('Use a fresh work directory; native and CEF build directories may be reused separately.')
    work.mkdir(parents=True, exist_ok=True)
    output.mkdir(parents=True, exist_ok=True)
    environment = dict(os.environ, PATH=str(node.parent)+os.pathsep+os.environ.get('PATH', ''))
    if args.install:
        run([args.python, '-c', 'import sys; assert sys.prefix != sys.base_prefix, "Use a private Python environment"'])
        run([args.python, '-m', 'pip', 'install', '--no-cache-dir', '-r', repo/'studio/desktop/requirements-linux.txt', cyui])
        run(['npm', 'ci'], cwd=repo, env=environment)
        run(['npm', 'ci', '--prefix', 'studio'], cwd=repo, env=environment)
    run(['npm', 'run', 'build'], cwd=repo, env=environment)
    run(['npm', 'run', 'build', '--prefix', 'studio'], cwd=repo, env=environment)
    run([node, repo/'studio/desktop/manifest.mjs'], cwd=repo)
    native = (args.native_build_directory or work/'native').resolve()
    cef_build = (args.cef_build_directory or work/'cef').resolve()
    run(['cmake', '-S', repo/'studio/desktop/native', '-B', native, '-G', 'Ninja', '-DCMAKE_BUILD_TYPE=Release',
         '-DCYDOC_CYMCP_SOURCE_DIR='+str(sdk), '-DCYMCP_CYUI_SOURCE_DIR='+str(cyui)])
    run(['cmake', '--build', native, '--parallel', args.jobs])
    run(['ctest', '--test-dir', native/'sdk', '--output-on-failure'])
    run(['cmake', '-S', repo/'studio/desktop/cef', '-B', cef_build, '-G', 'Ninja', '-DCMAKE_BUILD_TYPE=Release',
         '-DCYDOC_CYUI_SOURCE_DIR='+str(cyui), '-DCYUI_CEF_ROOT='+str(cef)])
    run(['cmake', '--build', cef_build, '--target', 'cyui_webcef_bridge', 'cyui_webcef_helper', '--parallel', args.jobs])
    freeze = [args.python, '-m', 'PyInstaller', '--noconfirm', '--clean', '--console', '--onedir', '--name', 'CyDocStudioRuntime',
              '--contents-directory', '_internal', '--distpath', work/'frozen', '--workpath', work/'pyinstaller', '--specpath', work,
              '--paths', repo/'studio/desktop/app', '--collect-all', 'cyui_modules', '--collect-all', 'imgui_bundle',
              '--collect-submodules', 'OpenGL', '--copy-metadata', 'PyOpenGL', '--exclude-module', 'Xlib', '--hidden-import', 'six',
              '--add-data', str(repo/'studio/desktop/app/CyMCP.json')+':.', repo/'studio/desktop/app/entry.py']
    with (work/'pyinstaller.log').open('w') as log:
        run(freeze, cwd=repo, env=dict(environment, PYINSTALLER_CONFIG_DIR=str(work/'pyinstaller-cache')), stdout=log, stderr=subprocess.STDOUT)
    runtime = output/'runtime/desktop';runtime.parent.mkdir()
    shutil.move(work/'frozen/CyDocStudioRuntime', runtime)
    shutil.copy2(native/'CyDocStudioHost', runtime)
    # Flatten only links whose targets are inside the frozen payload.
    for link in list(runtime.rglob('*')):
        if link.is_symlink():
            target = link.resolve(strict=True)
            if not target.is_relative_to(runtime):
                raise RuntimeError('Unexpected external frozen runtime link: '+str(link))
            link.unlink()
            if target.is_dir():shutil.copytree(target, link)
            else:shutil.copy2(target, link)
    # Keep LGPL python-xlib as ordinary replaceable Python source, outside the frozen archive.
    xlib = Path(subprocess.check_output([args.python, '-c', 'import Xlib; print(Xlib.__path__[0])'], text=True).strip())
    shutil.copytree(xlib, runtime/'_internal/Xlib', ignore=shutil.ignore_patterns('__pycache__', '*.pyc', '*.pyo'))
    shutil.copy2(node, output/'runtime/node')
    browser = output/'runtime/cef';browser.mkdir()
    for folder in ('Release', 'Resources'):
        for source in (cef/folder).iterdir():
            if source.name in ('chrome-sandbox', 'chrome_sandbox') or source.suffix in ('.a', '.debug', '.sym'):
                continue
            if source.is_dir():shutil.copytree(source, browser/source.name)
            else:shutil.copy2(source, browser/source.name)
    for name in ('libcyui_webcef_bridge.so', 'cyui_webcef_helper'):
        shutil.copy2(cef_build/'cyui'/name, browser/name)
    app = output/'app/cydoc';app.mkdir(parents=True)
    for name in ('tools', 'web', 'ai', 'dist'):shutil.copytree(repo/name, app/name)
    for name in ('package.json', 'LICENSE'):shutil.copy2(repo/name, app/name)
    (app/'src').mkdir();shutil.copy2(repo/'src/viewer.css', app/'src/viewer.css')
    run([node, repo/'studio/desktop/copy-runtime.mjs', repo, app, 'marked', 'prismjs', 'esbuild', 'three'])
    studio = app/'studio';studio.mkdir()
    for name in ('server', 'dist', 'sdk'):shutil.copytree(repo/'studio'/name, studio/name)
    shutil.copy2(repo/'studio/package.json', studio/'package.json')
    run([node, repo/'studio/desktop/copy-runtime.mjs', repo/'studio', studio, 'yjs', 'ws', 'fflate'])
    notices = output/'LICENCES';notices.mkdir()
    for source, name in [(sdk/'LICENSE', 'CyMCPSDK-MIT.txt'), (sdk/'THIRD_PARTY_NOTICES.md', 'CyMCPSDK-third-party.md'),
                         (cyui/'LICENSE', 'CyUI-MIT.txt'), (repo/'LICENSE', 'CyDoc-MIT.txt'), (node.parent.parent/'LICENSE', 'Node.js.txt'),
                         (cef/'LICENSE.txt', 'CEF.txt'), (cef/'CREDITS.html', 'Chromium-CREDITS.html'), (repo/'studio/LICENCES.md', 'LICENCES.md')]:
        shutil.copy2(source, notices/name)
    for name in ('nlohmann/LICENSE.MIT', 'httplib/LICENSE', 'picosha2/LICENSE', 'curl/COPYING'):
        shutil.copy2(sdk/'third_party'/name, notices/('CyMCPSDK-'+name.replace('/', '-')))
    for name in ('THIRD_PARTY_NOTICES.md', 'third_party/imgui/LICENSE.txt', 'third_party/md4c/LICENSE.md', 'third_party/lexilla/License.txt',
                 'third_party/scintilla/License.txt', 'third_party/SciTE-Properties-License.txt', 'third_party/jetbrains-mono/OFL.txt'):
        shutil.copy2(cyui/name, notices/('CyUI-'+name.replace('/', '-')))
    (notices/'CyMCPSDK-revision.txt').write_text('CyMCPSDK 0.7.5 / '+SDK_REVISION+'\n')
    shutil.copytree(installer/'licenses', notices/'CyInstaller/third-party')
    shutil.copy2(installer/'LICENSE', notices/'CyInstaller/LICENSE.txt')
    run([args.python, repo/'studio/desktop/collect_notices.py', notices/'Python-components', runtime])
    run([args.python, repo/'studio/desktop/prepare_package.py', output])
    (output/'assets').mkdir();shutil.copy2(repo/'assets/branding/cydoc-logo-v1.png', output/'assets/cydoc.png')
    launcher = output/'CyDocStudio'
    launcher.write_text('#!/bin/sh\nset -eu\nroot=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)\nexec "$root/runtime/desktop/CyDocStudioRuntime" "$@"\n')
    launcher.chmod(0o755)
    (output/'README.md').write_text('# CyDoc Studio for Linux x64\n\nStart `./CyDocStudio`. Keep `app/`, `runtime/`, `assets/` and `LICENCES/` beside it.\n\n'
        'Requires an X11 display (or XWayland), OpenGL 3.3, GTK 3, libcurl and GLFW 3. Ubuntu 24.04 x64 is the validation target; other distributions need their own checks. '
        'This CEF integration currently runs without its process sandbox.\n\n'
        'Local editing needs no account. Data defaults to `$XDG_DATA_HOME/CyDocStudio` or `~/.local/share/CyDocStudio`; `--data PATH` selects another private directory. '
        'Editor, Documentation, Assistant, Updates, Options and Local MCP / SDK use the same service and CyMCPSDK Registry. '
        'Install the CyInstaller setup for managed updates; a portable payload has no `_cyinstall` registration.\n\n'
        'CLI: `runtime/desktop/CyDocStudioRuntime --tool`. Exported manuals remain offline HTML. See `LICENCES/` and the source Studio guide.\n', encoding='utf-8')
    print('Linux native payload: '+str(output), flush=True)


if __name__ == '__main__':main()
