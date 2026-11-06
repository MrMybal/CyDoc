"""Distribution copies keep runtime content and notices, without developer artifacts."""
from pathlib import Path
import runpy


def test_prepare_package_retains_runtime_and_notices(tmp_path, monkeypatch):
    root = tmp_path/'distribution'
    files = [
        'app/cydoc/studio/server/server.mjs',
        'runtime/desktop/_internal/component/module.py',
        'runtime/desktop/_internal/component/api.pyi',
        'runtime/desktop/_internal/component/__pycache__/module.pyc',
        'runtime/desktop/_internal/component.dist-info/direct_url.json',
        'app/cydoc/studio/node_modules/lib0/.playwright-mcp/console.log',
        'LICENCES/component/LICENSE.txt',
    ]
    for name in files:
        file = root/name
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text('fixture', 'utf-8')
    script = Path(__file__).resolve().parents[1]/'prepare_package.py'
    monkeypatch.setattr('sys.argv', [str(script), str(root)])
    runpy.run_path(str(script), run_name='__main__')
    remaining = {p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
    assert remaining == {files[0], files[1], files[-1]}
