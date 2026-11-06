import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, readFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { buildExample } from '../build-example.mjs';
import { startStudio } from '../server/server.mjs';
import { StudioClient } from '../sdk/client.mjs';

test('bundled CyDoc example is an isolated editable bilingual manual with linked API pages and media', async t => {
  const template = resolve('dist/example');
  await buildExample(template);
  await mkdir(resolve('.tmp'), { recursive: true });
  const directory = await mkdtemp(resolve('.tmp/studio-example-'));
  const app = await startStudio({ directory, port: 0, localOnly: true });
  t.after(async () => { await app.close(); await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); });
  const sdk = new StudioClient(app.origin);
  const created = await sdk.createProject({ name: 'CyDoc Example', template: 'cydoc' });
  const project = await sdk.project(created.id);
  assert.equal(project.git, false);
  assert.ok(project.pages.length > 100);
  for (const id of ['overview', 'image-viewer', 'video-viewer', 'mesh-viewer', 'galleries', 'diagrams', 'blueprints', 'source-examples-cpp-include-cydoc-help-hpp', 'doxygen-cydoc-helpsession-session']) {
    assert.ok(project.pages.some(page => page.id === id && page.locale === 'en'), id);
    assert.ok(project.pages.some(page => page.id === id && page.locale === 'fr'), id);
  }
  const source = await readFile(join(template, 'manual/en/overview.md'), 'utf8');
  const page = await sdk.page(project.id, 'en', 'overview');
  await sdk.updatePage(project.id, 'en', 'overview', page.body + '\nMy private draft.\n', page.revisionToken);
  assert.equal(await readFile(join(template, 'manual/en/overview.md'), 'utf8'), source);
  await assert.rejects(sdk.publish(project.id), error => error.status === 422);
  const french = await sdk.page(project.id, 'fr', 'overview');
  await sdk.updateMetadata(project.id, 'fr', 'overview', { revisionToken: french.revisionToken, translationReviewed: true });
  await sdk.publish(project.id);
  const record = app.db.data.projects[project.id];
  assert.ok((await stat(join(record.root, 'Documentation/Documentation.html'))).isFile());
  const manifest = JSON.parse(await readFile(join(record.root, 'Documentation/DocData/manifest.json'), 'utf8'));
  assert.deepEqual(manifest.locales.map(locale => locale.code), ['en', 'fr']);
  assert.ok(manifest.pages.some(page => page.id === 'api-cpp'));
  assert.ok((await sdk.assets(project.id)).some(asset => asset.name.endsWith('.glb')));
  await assert.rejects(sdk.createProject({ name: 'Invalid', template: '../../private' }), error => error.status === 400);
});
