"""CyDoc Studio SDK. Authentication is configured by the host, never by job arguments."""
import json
from urllib.parse import urlparse, quote, urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError


class StudioClient:
    def __init__(self, origin, token=''):
        parsed = urlparse(origin)
        if parsed.scheme not in ('http', 'https') or parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError('Use an HTTP(S) Studio origin without credentials.')
        if parsed.scheme == 'http' and parsed.hostname not in ('127.0.0.1', 'localhost', '::1'):
            raise ValueError('Remote Studio connections require HTTPS.')
        if not token and parsed.hostname not in ('127.0.0.1', 'localhost', '::1'):
            raise ValueError('Set CYDOC_STUDIO_TOKEN to a token created in the Studio account panel.')
        self.origin, self.token = origin.rstrip('/'), token

    def headers(self):
        return {'Authorization': 'Bearer ' + self.token} if self.token else {}

    def request(self, path, method='GET', value=None, *, binary=None):
        data = binary if binary is not None else json.dumps(value).encode() if value is not None else None
        request = Request(self.origin + '/api/' + path, data=data, method=method,
                          headers={**self.headers(), 'Content-Type': 'application/octet-stream' if binary is not None else 'application/json'})
        try:
            with urlopen(request, timeout=180) as response:
                return json.load(response)
        except HTTPError as error:
            try:
                message = json.load(error).get('error', 'Studio request failed.')
            except (ValueError, AttributeError):
                message = 'Studio request failed.'
            raise RuntimeError(f'HTTP {error.code}: {message}') from None

    @staticmethod
    def route(*parts):
        return '/'.join(quote(str(part), safe='') for part in parts)

    def projects(self):
        return self.request('projects')

    def create_project(self, **options):
        return self.request('projects', 'POST', options)

    def project(self, project_id):
        return self.request(self.route('projects', project_id))

    def page(self, project_id, locale, page_id):
        return self.request(self.route('projects', project_id, 'pages', locale, page_id))

    def update_page(self, project_id, locale, page_id, body, revision_token):
        return self.request(self.route('projects', project_id, 'pages', locale, page_id), 'PUT', {'body': body, 'revisionToken': revision_token})

    def import_asset(self, project_id, path, name=None):
        from pathlib import Path
        path = Path(path)
        if path.stat().st_size > 64 * 1024**2:
            raise ValueError('Media imports are limited to 64 MiB.')
        return self.request(self.route('projects', project_id, 'assets') + '?' + urlencode({'name': name or path.name}), 'POST', binary=path.read_bytes())

    def download(self, project_id):
        request = Request(self.origin+'/api/'+self.route('projects',project_id,'download'), headers=self.headers())
        with urlopen(request,timeout=180) as response:
            data=response.read(256*1024**2+1)
            if len(data)>256*1024**2:
                raise ValueError('The export exceeds the download limit.')
            return data
