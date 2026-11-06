"""Real CyToolsCore SDK and official MCP transport checks against a disposable Studio."""
import asyncio
import json
import os
from pathlib import Path
import sys
import time
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'app'))
from tool import create_runtime
from sdk import StudioClient
from cytools_core import CyToolError


@pytest.fixture
def fixture():
    path = os.environ.get('CYDOC_STUDIO_TEST_FIXTURE')
    if not path:
        pytest.skip('Run node studio/desktop/test.mjs to create an isolated Studio fixture.')
    config = json.loads(Path(path).read_text('utf-8'))
    os.environ['CYDOC_STUDIO_ORIGIN'] = config['origin']
    os.environ['CYDOC_STUDIO_TOKEN'] = config['token']
    if config.get('localOnly'):
        assert not config['token']
        assert StudioClient(config['origin']).request('me')['local']
    return config


def test_sdk_real_jobs_revisions_and_automatic_local_asset_import(fixture, tmp_path):
    with create_runtime(tmp_path/'jobs') as runtime:
        actor = runtime.authenticate(runtime.create_client('SDK test')['token'])
        with runtime.task(actor) as session:
            def invoke(operation, parameters):
                job = runtime.wait(actor, runtime.submit(actor, session, operation, parameters)['jobId'])
                assert job['state'] == 'Completed', job
                return job['outputs']['result']
            project = invoke('create_project', {'name': 'SDK-authored manual', 'git': False})
            identifier = project['id']
            assert any(item['id'] == identifier for item in invoke('list_projects', {}))
            page = invoke('get_page', {'projectId': identifier, 'locale': 'en', 'pageId': 'overview'})
            updated = invoke('update_page', {'projectId': identifier, 'locale': 'en', 'pageId': 'overview', 'revisionToken': page['revisionToken'], 'body': page['body']+'\nAn SDK-authored instruction.\n'})
            assert 'SDK-authored instruction' in updated['body']
            source = tmp_path/'external.png'
            source.write_bytes(bytes.fromhex('89504e470d0a1a0a'))
            result = invoke('import_asset', {'projectId': identifier, 'source': str(source)})
            assert result['src'].endswith('external.png')
            assert source.exists()
            with pytest.raises(CyToolError):
                runtime.submit(actor, session, 'update_page', {'projectId': identifier, 'locale': 'en', 'pageId': 'overview', 'body': 'missing revision'})
        assert source.exists()
        assert not list((tmp_path/'jobs/inputs').rglob('*.png'))


def test_official_mcp_discovery_execution_and_validation(fixture, tmp_path):
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client
    async def scenario():
        executable = os.environ.get('CYDOC_TEST_EXECUTABLE')
        parameters = StdioServerParameters(command=executable or sys.executable,
            args=([ '--tool' ] if executable else [str(Path(__file__).resolve().parents[1]/'app/tool.py')])+['--data-dir', str(tmp_path/'mcp'), 'mcp'], env=dict(os.environ))
        async with stdio_client(parameters) as (reader, writer):
            async with ClientSession(reader, writer) as session:
                await session.initialize()
                tools = await session.list_tools()
                names = {tool.name for tool in tools.tools}
                assert {'op_create_project','op_update_page','op_import_asset','op_publish_project','op_git_action','op_preview_page','op_export_manual','op_reload_external','cy_get_job'} <= names
                called = await session.call_tool('op_create_project', {'parameters': {'name': 'MCP-authored manual'}})
                assert not called.isError
                job = json.loads(called.content[0].text)
                deadline = time.monotonic()+20
                while time.monotonic()<deadline:
                    status = await session.call_tool('cy_get_job', {'jobId': job['jobId']})
                    job = json.loads(status.content[0].text)
                    if job['state'] in ('Completed','Failed','Cancelled'):
                        break
                    await asyncio.sleep(.03)
                assert job['state']=='Completed', job
                assert job['outputs']['result']['name']=='MCP-authored manual'
                project_id=job['outputs']['result']['id']
                async def invoke(operation, parameters):
                    called=await session.call_tool(operation,{'parameters':parameters});assert not called.isError
                    result=json.loads(called.content[0].text);deadline=time.monotonic()+30
                    while time.monotonic()<deadline:
                        polled=await session.call_tool('cy_get_job',{'jobId':result['jobId']});result=json.loads(polled.content[0].text)
                        if result['state'] in ('Completed','Failed','Cancelled'):
                            break
                        await asyncio.sleep(.03)
                    assert result['state']=='Completed',result
                    return result['outputs']['result']
                preview=await invoke('op_preview_page',{'projectId':project_id,'locale':'en','pageId':'overview'})
                assert preview['manifest']['name']=='MCP-authored manual'
                await invoke('op_publish_project',{'projectId':project_id})
                archive=await invoke('op_export_manual',{'projectId':project_id})
                import zipfile
                with zipfile.ZipFile(archive['file']) as exported:
                    assert 'Documentation/Documentation.html' in exported.namelist()
                    assert 'Documentation/DocAI.md' in exported.namelist()
                    assert not any('.CyDocBuild' in name for name in exported.namelist())
                invalid = await session.call_tool('op_update_page', {'parameters': {'projectId':'missing'}})
                assert invalid.isError
    asyncio.run(scenario())
