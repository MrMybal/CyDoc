"""Render the real native panels, triggering their button handlers in a GUI fixture.

This is a rendering integration check, not Windows input automation.
Run with the prepared Studio Python and a matching CyUI CEF runtime.
"""
import argparse
import json
from pathlib import Path
import sys
import time

parser = argparse.ArgumentParser()
parser.add_argument('--cef', type=Path, required=True)
parser.add_argument('--data', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--theme-switch', action='store_true')
args = parser.parse_args()
args.data.mkdir(parents=True, exist_ok=True)
args.output.mkdir(parents=True, exist_ok=True)
(args.data/'desktop-settings.json').write_text(json.dumps({'language': 'fr', 'port': 0}), 'utf-8')

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'app'))
from imgui_bundle import hello_imgui, imgui
from OpenGL import GL
from PIL import Image
import cyui
from main import main

original_tab = imgui.begin_tab_item
original_combo = imgui.combo
pending_theme = None
theme_changed = []
theme_ids = [theme['id'] for theme in json.loads((Path(__file__).resolve().parents[2]/'dist/themes.json').read_text('utf-8'))]
original_run = hello_imgui.run
pending = None
completed = []


def tab(label, *a, **kw):
    global pending
    if pending and label == cyui.tr_label(pending):
        kw['flags'] = int(kw.get('flags',0)) | int(imgui.TabItemFlags_.set_selected)
        completed.append(pending)
        pending = None
    return original_tab(label, *a, **kw)


def combo(label, current, items, *a, **kw):
    global pending_theme, theme_changed
    result = original_combo(label, current, items, *a, **kw)
    if label == '##theme' and pending_theme is not None:
        index=pending_theme
        pending_theme=None
        theme_changed.append(theme_ids[index])
        return True, index
    return result


def run(parameters, *a, **kw):
    start = time.monotonic()
    show = parameters.callbacks.show_gui
    swap = parameters.callbacks.before_swap
    steps = [(4, 'Options', 'options'), (6, 'Documentation', 'documentation'),
             (9, 'Local MCP / SDK', 'mcp'), (11, 'Editor', 'editor')]
    selected = 0
    capture = None

    def draw():
        nonlocal selected, capture
        global pending, pending_theme
        if args.theme_switch and len(theme_changed)<len(theme_ids) and time.monotonic()-start > 4.2+len(theme_changed)*.25:
            pending_theme = len(theme_changed)
        if selected < len(steps) and time.monotonic()-start >= steps[selected][0]:
            _, pending, name = steps[selected]
            capture = (time.monotonic()+1.1, name)
            selected += 1
        show()
        if time.monotonic()-start > 14:
            parameters.app_shall_exit = True

    def before_swap():
        nonlocal capture
        swap()
        if capture and time.monotonic() >= capture[0]:
            width, height = map(int, imgui.get_io().display_size)
            pixels = GL.glReadPixels(0, 0, width, height, GL.GL_RGBA, GL.GL_UNSIGNED_BYTE)
            Image.frombytes('RGBA', (width, height), pixels).transpose(Image.Transpose.FLIP_TOP_BOTTOM).save(args.output/(capture[1]+'.png'))
            capture = None

    parameters.callbacks.show_gui = draw
    parameters.callbacks.before_swap = before_swap
    return original_run(parameters, *a, **kw)


imgui.begin_tab_item = tab
imgui.combo = combo
hello_imgui.run = run
sys.argv = ['main.py', '--data', str(args.data.resolve()), '--cef', str(args.cef.resolve()), '--exit-after', '16']
try:
    main()
finally:
    imgui.begin_tab_item = original_tab
    imgui.combo = original_combo
    hello_imgui.run = original_run
assert completed == ['Options', 'Documentation', 'Local MCP / SDK', 'Editor'], completed
assert all((args.output/(name+'.png')).exists() for name in ['options', 'mcp', 'documentation'])
assert not (args.data/'workspace/server.lock').exists()
if args.theme_switch:
    assert theme_changed == theme_ids, theme_changed
    log=(args.data/'desktop.log').read_text('utf-8')
    for theme in theme_ids:
        assert "'theme': '"+theme+"'" in log, theme
print('Native full-page Options/MCP, standalone Documentation and Editor tabs rendered successfully; service closed cleanly.')
