"""Check native calls against the installed CyUI API, without mocking its signatures."""
import ast
import inspect
from pathlib import Path
import cyui


def test_native_shell_uses_supported_cyui_calls():
    source = Path(__file__).resolve().parents[1] / 'app/main.py'
    for call in ast.walk(ast.parse(source.read_text('utf-8'))):
        if not isinstance(call, ast.Call) or not isinstance(call.func, ast.Attribute):
            continue
        if not isinstance(call.func.value, ast.Name) or call.func.value.id != 'c':
            continue
        function = getattr(cyui, call.func.attr)
        signature = inspect.signature(function)
        try:
            signature.bind(*[None for _ in call.args], **{arg.arg: None for arg in call.keywords})
        except TypeError as error:
            raise AssertionError(f'main.py:{call.lineno}: cyui.{call.func.attr}{signature}: {error}') from error
