"""Remove development-only files from a completed runtime copy, preserving notices."""
from pathlib import Path
import os
import sys

root = Path(sys.argv[1]).resolve()
if not (root/'app/cydoc/studio').is_dir() or not (root/'runtime/desktop').is_dir():
    raise SystemExit('Expected a copied Studio distribution.')
excluded = {'.git', '.github', '.playwright-mcp', '__pycache__'}
suffixes = {'.pyi', '.pyc', '.pyo', '.pdb', '.log', '.map', '.tsbuildinfo'}
for directory, folders, files in os.walk(root, topdown=False, followlinks=False):
    for name in files:
        path = Path(directory)/name
        if path.is_symlink() or not path.resolve().is_relative_to(root):
            raise SystemExit('Unexpected linked distribution file.')
        if excluded.intersection(path.relative_to(root).parts) or path.suffix.lower() in suffixes or name in {'direct_url.json', '.DS_Store', 'Thumbs.db'}:
            path.unlink()
    for name in folders:
        path = Path(directory)/name
        if path.is_symlink() or not path.resolve().is_relative_to(root):
            raise SystemExit('Unexpected linked distribution directory.')
        if excluded.intersection(path.relative_to(root).parts):
            path.rmdir()
