"""CyToolsCore-backed local CLI, JSONL, SDK and MCP entry point for Studio."""
import os
from pathlib import Path
from cytools_core import Runtime, load_manifest, CyToolError
from cytools_core.transports.cli import run_cli
from sdk import StudioClient


def create_runtime(data_dir, **options):
    runtime = Runtime(load_manifest(Path(__file__).with_name('CyTool.json')), data_dir, **options)
    runtime.configure_inputs(Path(data_dir).resolve() / 'inputs', fields={'import_asset': ['source']})

    def invoke(operation, context, p):
        context.cancellation.check()
        client = StudioClient(os.environ.get('CYDOC_STUDIO_ORIGIN', 'http://127.0.0.1:4310'), os.environ.get('CYDOC_STUDIO_TOKEN', ''))
        project = p.get('projectId')
        route = client.route
        if operation == 'list_projects':
            value = client.projects()
        elif operation == 'create_project':
            value = client.create_project(**p)
        elif operation == 'get_project':
            value = client.project(project)
        elif operation == 'get_page':
            value = client.page(project, p['locale'], p['pageId'])
        elif operation == 'update_page':
            value = client.update_page(project, p['locale'], p['pageId'], p['body'], p['revisionToken'])
        elif operation == 'import_asset':
            value = client.import_asset(project, p['source'], p.get('name'))
        elif operation == 'export_manual':
            output=context.path('outputs/Documentation.zip')
            output.write_bytes(client.download(project))
            value={'file':str(output),'mimeType':'application/zip','sizeBytes':output.stat().st_size}
        elif operation == 'preview_page':
            from urllib.parse import urlencode
            value=client.request(route('projects',project,'preview')+'?'+urlencode({'locale':p['locale'],'page':p['pageId']}))
        else:
            routes = {
                'create_page': ('POST', route('projects', project, 'pages'), p['input'] if 'input' in p else {}),
                'update_metadata': ('PATCH', route('projects', project, 'pages', p.get('locale', 'en'), p.get('pageId', 'overview')), p.get('input', {})),
                'archive_page': ('DELETE', route('projects', project, 'pages', p.get('locale', 'en'), p.get('pageId', 'overview')), {}),
                'update_settings': ('PATCH', route('projects', project, 'settings'), p.get('input', {})),
                'list_assets': ('GET', route('projects', project, 'assets'), None),
                'publish_project': ('POST', route('projects', project, 'publish'), {}),
                'git_status': ('GET', route('projects', project, 'git'), None),
                'git_action': ('POST', route('projects', project, 'git', p.get('action', 'diff')), p.get('input', {})),
                'list_members': ('GET', route('projects', project, 'members'), None),
                'invite_member': ('POST', route('projects', project, 'members'), p.get('input', {})),
                'remove_member': ('DELETE', route('projects', project, 'members'), {'userId': p.get('userId')}),
                'page_history': ('GET', route('projects', project, 'history', p.get('locale', 'en'), p.get('pageId', 'overview')), None),
                'restore_page': ('POST', route('projects', project, 'history', p.get('locale', 'en'), p.get('pageId', 'overview')), p.get('input', {})),
                'reload_external': ('POST', route('projects',project,'reload'),{'locale':p.get('locale'),'pageId':p.get('pageId')}),
            }
            method, path, parameters = routes[operation]
            value = client.request(path, method, parameters)
        context.cancellation.check()
        return {'result': value}

    for operation in runtime.descriptor['operations']:
        name = operation['id']
        def handler(context, parameters, operation=name):
            try:
                return invoke(operation, context, parameters)
            except (RuntimeError, ValueError, OSError) as error:
                raise CyToolError('OperationFailed', str(error), recoverable=True) from None
        runtime.register(name, handler)
    return runtime


if __name__ == '__main__':
    raise SystemExit(run_cli(create_runtime))
