"""X11 child-panel placement. Only the Studio process's own parent is selected."""
import os


class X11Panel:
    def __init__(self):
        if not os.environ.get('DISPLAY'):
            raise RuntimeError('Native Linux Studio requires an X11 display (or XWayland).')
        from Xlib import display
        self.connection = display.Display()

    def find(self, title):
        from Xlib import X, error
        atom = self.connection.intern_atom('_NET_WM_PID')
        matches = []
        pending = [(self.connection.screen().root, 0)]
        visited = 0
        while pending and visited < 10000:
            window, depth = pending.pop(); visited += 1
            try:
                pid = window.get_full_property(atom, X.AnyPropertyType)
                if pid is not None and len(pid.value) and pid.value[0] == os.getpid() and window.get_wm_name() == title:
                    matches.append(window.id)
                if depth < 12:
                    pending.extend((child, depth+1) for child in window.query_tree().children)
            except error.BadWindow:
                continue
        if len(matches) != 1:
            raise RuntimeError('Cannot identify the Studio X11 window for its native assistant panel.')
        return matches[0]

    def _window(self, handle):
        return self.connection.create_resource_object('window', handle)

    def bounds(self, parent, position, size, viewport, display_size):
        geometry = self._window(parent).get_geometry()
        x_scale, y_scale = geometry.width/max(1, display_size.x), geometry.height/max(1, display_size.y)
        return (round((position.x-viewport.pos.x)*x_scale), round((position.y-viewport.pos.y)*y_scale),
                max(1, round(size.x*x_scale)), max(1, round(size.y*y_scale)))

    def move(self, handle, bounds):
        x, y, width, height = bounds
        self._window(handle).configure(x=x, y=y, width=width, height=height)
        self.connection.flush()

    def show(self, handle, visible):
        window = self._window(handle)
        window.map() if visible else window.unmap()
        self.connection.flush()

    def close(self):
        self.connection.close()
