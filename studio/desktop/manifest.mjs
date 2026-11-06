// Portable CyTools contract; consumed unchanged by CLI, JSONL and real MCP discovery.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const string = { type: 'string' }, project = { projectId: string }, page = { ...project, locale: { type: 'string', enum: ['en', 'fr'] }, pageId: string };
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const optional = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const metadata = optional({ revisionToken: string, title: string, description: string, section: string, parent: string, order: { type: ['number','string'] }, translationReviewed: { type: 'boolean' } }, ['revisionToken']);
const settings = optional({ name: string, version: string, homePage: string, logo: string, modules: { type: 'array', items: { type: 'string', enum: ['image','video','gallery','gif','mesh','graph'] }, uniqueItems: true } });
const gitInput = optional({ message: string, name: string, email: string, url: string, remote: string, branch: string });
const specs = {
  list_projects: {}, create_project: { name: string }, get_project: project,
  create_page: { ...project, input: object({ id: string, titles: object({ en: string, fr: string }) }) },
  get_page: page, update_page: { ...page, body: { type: 'string', maxLength: 2097152 }, revisionToken: string },
  update_metadata: { ...page, input: metadata }, archive_page: page, update_settings: { ...project, input: settings },
  list_assets: project, import_asset: { ...project, source: { type: 'string', 'x-cy-kind': 'File' } },
  publish_project: project, git_status: project,
  git_action: { ...project, action: { type: 'string', enum: ['enable','diff','commit','remote','fetch','pull','push','history','branch','switch'] }, input: gitInput },
  list_members: project, invite_member: { ...project, input: object({ email: string, role: { type: 'string', enum: ['editor','viewer'] } }) }, remove_member: { ...project, userId: string },
  page_history: page, restore_page: { ...page, input: object({ name: string, revisionToken: string }) }
  ,preview_page:page,reload_external:page,export_manual:project
};
const descriptions = {
  create_project: 'Create a persistent documentation workspace, optionally with Git, a cloned HTTPS remote or an operator-allowed application path.',
  update_page: 'Update Markdown using the revisionToken returned by get_page. Conflicting writes fail without replacing another editor’s work.',
  update_metadata: 'Update title, description, section, parent, order or translationReviewed using the current revisionToken.',
  update_settings: 'Set name, version, homePage, local logo and enabled optional modules.',
  import_asset: 'Import a local media file automatically through CyToolsCore task input staging. Original files are preserved.',
  publish_project: 'Build the human reader. English originals and current complete French translations are mandatory. Does not push Git.',
  git_action: 'Explicit Git action. Commit uses message/name/email, remote uses url. Pull is fast-forward only; no force/reset.',
  restore_page: 'Restore a private working revision through the same conflict-checked collaboration state.'
};
const manifest = { schemaVersion: 1, protocolVersion: '1.0', id: 'cy.doc.studio', name: 'CyDocStudio', version: '0.1.2', description: 'Create, edit and publish local or online CyDoc projects.', vendor: 'Cyberalien', author: 'Cyberalien', executable: 'runtime/python/Scripts/python.exe app/tool.py', categories: ['documentation'], tags: ['documentation', 'editor'], capabilities: ['jobs','cancellation'], backends: [], platforms: [{ os: 'Windows', architecture: 'x64', status: 'Experimental', computeBackends: ['CPU'] }], interfaces: ['Native','CLI','JSONL','HTTP','MCP','ImGui'], runtimeRequirements: [], concurrency: { policy: 'Sequential', maxWorkers: 1 }, operations: Object.entries(specs).map(([id, properties]) => ({ id, name: id.replaceAll('_',' '), description: descriptions[id] || id.replaceAll('_',' '), inputSchema: object(properties), outputSchema: object({ result: {} }), resourceRequirements: { ramBytes: 134217728 }, supportedBackends: [], permissions: [], canRunAsync: true, canCancel: true, supportsProgress: false })) };
// Full project options, identical to the interactive form, remain accessible to automation.
Object.assign(manifest.operations.find(op => op.id === 'create_project').inputSchema.properties, { path: string, remote: string, git: { type: 'boolean' }, template: { type: 'string', enum: ['cydoc'] } });
Object.assign(manifest.operations.find(op => op.id === 'import_asset').inputSchema.properties, { name: string });
manifest.operations.find(op => op.id === 'create_page').inputSchema.properties.input.properties.parent = string;
manifest.operations.find(op => op.id === 'create_page').inputSchema.properties.input.properties.section = string;
for(const operation of manifest.operations){
  operation.canCancel=/^(?:list_|get_|page_history|git_status|preview_page|export_manual)/.test(operation.id);
  if(operation.id==='export_manual'){operation.description='Download the last successful published manual into a task-owned ZIP. Export it before finishing the task to keep it.';operation.resourceRequirements={ramBytes:536870912,diskBytes:268435456};}
}
await writeFile(fileURLToPath(new URL('./app/CyTool.json', import.meta.url)), JSON.stringify(manifest, null, 2) + '\n');
