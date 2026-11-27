"""A nonce-bound close handshake; a missing renderer response never discards work."""
import secrets
import time
import contextlib
import os


@contextlib.contextmanager
def close_signals(callback):
    """Linux updater SIGTERM requests the same durable close as the window button."""
    previous = {}
    if os.name != 'nt':
        import signal
        for number in (signal.SIGTERM, signal.SIGINT):
            previous[number] = signal.signal(number, lambda *_: callback())
    try:
        yield
    finally:
        if previous:
            import signal
            for number, handler in previous.items():
                signal.signal(number, handler)


class CloseGuard:
    def __init__(self):
        self.request_id = None
        self.sent = False
        self.deadline = 0

    def request(self):
        if not self.request_id:
            self.request_id = secrets.token_hex(16)
            self.sent = False
            self.deadline = time.monotonic()+12
        return False  # Hello ImGui's confirm_exit callback defers the close.

    def reply(self, payload):
        if not self.request_id or payload.get('requestId') != self.request_id:
            return None
        self.request_id = None
        return payload.get('ready') is True

    def expired(self):
        if self.request_id and time.monotonic() >= self.deadline:
            request = self.request_id
            self.request_id = None
            return request
        return None
