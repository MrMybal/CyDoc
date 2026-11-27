// Operation schemas consumed by the native CyMCPSDK Registry for chat, CLI and MCP.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const { version: studioVersion } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
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
  list_assets: project, import_asset: { ...project, source: { type: 'string' } },
  publish_project: project, git_status: project,
  git_action: { ...project, action: { type: 'string', enum: ['enable','diff','commit','remote','fetch','pull','push','history','branch','switch'] }, input: gitInput },
  list_members: project, invite_member: { ...project, input: object({ email: string, role: { type: 'string', enum: ['editor','viewer'] } }) }, remove_member: { ...project, userId: string },
  page_history: page, restore_page: { ...page, input: object({ name: string, revisionToken: string }) }
  ,preview_page:page,reload_external:page,export_manual:project
};
const descriptions = {
  list_projects: 'List documentation projects visible to the configured Studio account or local workspace.',
  get_project: 'Read a project, its page tree, available languages and publication state.',
  create_page: 'Create a bilingual page with a stable page ID and optional navigation parent or section.',
  get_page: 'Read Markdown and its revisionToken before editing a page.',
  archive_page: 'Archive a page in the project; existing saved revisions remain available.',
  list_assets: 'List imported project media and logical asset paths.',
  git_status: 'Read Git status without changing the repository.',
  list_members: 'Read project members and their roles on an account-based service.',
  invite_member: 'Invite an editor or viewer to a project using the configured account permissions.',
  remove_member: 'Remove a user from a project using the configured account permissions.',
  page_history: 'List saved private revisions for one page and locale.',
  preview_page: 'Compile a working page preview without publishing the manual.',
  reload_external: 'Reload externally edited source files into the collaborative working state.',
  create_project: 'Create a persistent documentation workspace, optionally with Git, a cloned HTTPS remote or an operator-allowed application path.',
  update_page: 'Update Markdown using the revisionToken returned by get_page. Conflicting writes fail without replacing another editor’s work.',
  update_metadata: 'Update title, description, section, parent, order or translationReviewed using the current revisionToken.',
  update_settings: 'Set name, version, homePage, local logo and enabled optional modules.',
  import_asset: 'Import a local media file automatically through private job input staging. Original files are preserved.',
  publish_project: 'Build the human reader. English originals and current complete French translations are mandatory. Does not push Git.',
  git_action: 'Explicit Git action. Commit uses message/name/email, remote uses url. Pull is fast-forward only; no force/reset.',
  restore_page: 'Restore a private working revision through the same conflict-checked collaboration state.'
};
const manifest = { schemaVersion: 1, id: 'cy.doc.studio', name: 'CyDocStudio', version: studioVersion, sdk: { name: 'CyMCPSDK', version: '0.7.5', revision: '35d2d4fd85982d3d0ba278594e85fa37f325b4f2' }, operations: Object.entries(specs).map(([id, properties]) => ({ id, description: descriptions[id] || id.replaceAll('_',' '), inputSchema: object(properties), outputSchema: object({ result: {} }), readOnly: /^(?:list_|get_|page_history$|git_status$|preview_page$)/.test(id), canCancel: /^(?:list_|get_|page_history$|git_status$|preview_page$|export_manual$)/.test(id) })) };
// Full project options, identical to the interactive form, remain accessible to automation.
Object.assign(manifest.operations.find(op => op.id === 'create_project').inputSchema.properties, { path: string, remote: string, git: { type: 'boolean' }, template: { type: 'string', enum: ['cydoc'] } });
Object.assign(manifest.operations.find(op => op.id === 'import_asset').inputSchema.properties, { name: string });
manifest.operations.find(op => op.id === 'create_page').inputSchema.properties.input.properties.parent = string;
manifest.operations.find(op => op.id === 'create_page').inputSchema.properties.input.properties.section = string;
for(const operation of manifest.operations){
  operation.canCancel=/^(?:list_|get_|page_history|git_status|preview_page|export_manual)/.test(operation.id);
  if(operation.id==='export_manual'){operation.description='Download the last successful published manual into a task-owned ZIP. Export it before finishing the task to keep it.';}
}
await writeFile(fileURLToPath(new URL('./app/CyMCP.json', import.meta.url)), JSON.stringify(manifest, null, 2) + '\n');
