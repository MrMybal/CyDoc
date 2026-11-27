"""Win32 child-panel placement for the Studio shell (no shared ImGui ABI)."""
import ctypes
from ctypes import wintypes
import os


def studio_window(title):
    user = ctypes.windll.user32
    user.GetWindowThreadProcessId.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.DWORD)]
    user.GetWindowTextW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
    callback_type = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    matches = []
    def inspect(window, _):
        process = wintypes.DWORD()
        user.GetWindowThreadProcessId(window, ctypes.byref(process))
        if process.value == os.getpid():
            text = ctypes.create_unicode_buffer(1024)
            user.GetWindowTextW(window, text, len(text))
            if text.value == title:
                matches.append(window)
        return True
    user.EnumWindows(callback_type(inspect), 0)
    if len(matches) != 1:
        raise RuntimeError('Cannot identify the Studio window for its native assistant panel.')
    window = matches[0]
    user.GetWindowLongPtrW.argtypes = [wintypes.HWND, ctypes.c_int]
    user.GetWindowLongPtrW.restype = ctypes.c_ssize_t
    user.SetWindowLongPtrW.argtypes = [wintypes.HWND, ctypes.c_int, ctypes.c_ssize_t]
    user.SetWindowLongPtrW.restype = ctypes.c_ssize_t
    user.SetWindowLongPtrW(window, -16, user.GetWindowLongPtrW(window, -16) | 0x02000000)  # WS_CLIPCHILDREN
    return window


def panel_bounds(parent, position, size, viewport, display_size):
    rectangle = wintypes.RECT()
    user = ctypes.windll.user32
    user.GetClientRect.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.RECT)]
    if not user.GetClientRect(parent, ctypes.byref(rectangle)):
        raise RuntimeError('Cannot read the Studio client rectangle.')
    x_scale = (rectangle.right-rectangle.left)/max(1, display_size.x)
    y_scale = (rectangle.bottom-rectangle.top)/max(1, display_size.y)
    return (round((position.x-viewport.pos.x)*x_scale), round((position.y-viewport.pos.y)*y_scale),
            max(1, round(size.x*x_scale)), max(1, round(size.y*y_scale)))
