import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { request } from 'node:http';
import { WebSocket } from 'ws';
import * as Y from 'yjs';
import { startStudio } from '../server/server.mjs';
import { StudioClient } from '../sdk/client.mjs';

async function fixture(t) {
  await mkdir(resolve('.tmp'), { recursive: true });
  const directory = await mkdtemp(resolve('.tmp/studio-local-'));
  const app = await startStudio({ directory, port: 0, localOnly: true });
  t.after(async () => { await app.close(); await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); });
  return { app, directory, sdk: new StudioClient(app.origin) };
}
const call = (app, path, options = {}) => fetch(`${app.origin}/api/${path}`, options);

test('local workspace edits and publishes without creating accounts, sessions or SDK tokens', async t => {
  const { app, directory, sdk } = await fixture(t);
  assert.deepEqual(await (await call(app, 'bootstrap')).json(), { needsSetup: false, mode: 'local' });
  const me = await call(app, 'me');
  assert.equal(me.headers.get('set-cookie'), null);
  assert.equal((await me.json()).local, true);
  const project = await sdk.createProject({ name: 'Local Manual', git: false });
  assert.equal(project.role, 'owner');
  assert.equal((await sdk.projects())[0].id, project.id);
  const page = await sdk.page(project.id, 'en', 'overview');
  await sdk.updatePage(project.id, 'en', 'overview', page.body + '\nA local instruction.\n', page.revisionToken);
  const translated = await sdk.page(project.id, 'fr', 'overview');
  const updated = await sdk.updatePage(project.id, 'fr', 'overview', translated.body + '\nUne instruction locale.\n', translated.revisionToken);
  await sdk.updateMetadata(project.id, 'fr', 'overview', { ...updated.metadata, revisionToken: updated.revisionToken, translationReviewed: true });
  await sdk.importAsset(project.id, 'local.png', new Uint8Array([137,80,78,71,13,10,26,10]));
  assert.equal((await sdk.assets(project.id)).length, 1);
  assert.equal((await sdk.preview(project.id, 'en', 'overview')).manifest.name, 'Local Manual');
  await sdk.publish(project.id);
  assert.equal((await sdk.download(project.id))[0], 80);
  const published = await fetch(`${app.origin}/published/${project.id}/Documentation.html`);
  assert.equal(published.status, 200);
  for (const path of ['setup', 'login', 'register', 'logout', 'tokens', 'accept-invitation', `projects/${project.id}/members`]) {
    assert.equal((await call(app, path, { method: 'POST' })).status, 409, path);
  }
  const persisted = JSON.parse(await readFile(join(directory, 'studio.json'), 'utf8'));
  for (const key of ['users', 'sessions', 'tokens', 'invitations']) assert.deepEqual(persisted[key], {});
  assert.deepEqual(persisted.projects[project.id].members, {});
});

test('account-free local editing sockets save changes without a session cookie', async t => {
  const { app, sdk } = await fixture(t);
  const project = await sdk.createProject({ name: 'Socket Manual' });
  const socket = new WebSocket(`${app.origin.replace('http', 'ws')}/collaboration?project=${project.id}&locale=en&page=overview`, { origin: app.origin });
  const doc = new Y.Doc();
  t.after(() => { socket.terminate(); doc.destroy(); });
  const initialized = await new Promise((done, reject) => {
    socket.on('error', reject);
    socket.on('message', raw => {
      const message = JSON.parse(raw);
      if (message.type === 'init') { Y.applyUpdate(doc, Buffer.from(message.update, 'base64')); done(message); }
    });
  });
  assert.equal(initialized.role, 'owner');
  const text = doc.getText('markdown');
  const previous = Y.encodeStateVector(doc);
  text.insert(text.length, '\nSaved without an account.');
  socket.send(JSON.stringify({ type: 'update', update: Buffer.from(Y.encodeStateAsUpdate(doc, previous)).toString('base64') }));
  await new Promise((done, reject) => {
    const timer = setTimeout(() => reject(new Error('Local socket did not save.')), 5000);
    socket.on('message', raw => { if (JSON.parse(raw).type === 'saved') { clearTimeout(timer); done(); } });
    socket.on('close', () => { clearTimeout(timer); reject(new Error('Local socket was rejected.')); });
  });
  assert.match((await sdk.page(project.id, 'en', 'overview')).body, /Saved without an account/);
});

test('local mode rejects public hosting, foreign origins, host rebinding and cross-site requests', async t => {
  for (const input of [{ host: '0.0.0.0' }, { host: '192.168.1.1' }, { publicOrigin: 'https://studio.example.com' }]) {
    await assert.rejects(startStudio({ directory: resolve('.tmp/unused-local-mode'), localOnly: true, ...input }), /loopback host/);
  }
  const { app } = await fixture(t);
  for (const headers of [{ Origin: 'https://foreign.example' }, { Host: 'rebound.example' }, { 'Sec-Fetch-Site': 'cross-site' }]) {
    const status = await new Promise((done, reject) => { const req = request(`${app.origin}/api/me`, { headers }, response => { response.resume(); done(response.statusCode); }); req.on('error', reject); req.end(); });
    assert.equal(status, 403, JSON.stringify(headers));
  }
  assert.throws(() => new StudioClient('https://studio.example.com'), /token is required/);
  const socket = new WebSocket(`${app.origin.replace('http', 'ws')}/collaboration`, { origin: 'https://foreign.example' });
  await new Promise((done, reject) => {
    socket.on('unexpected-response', (request, response) => { response.resume(); request.destroy(); assert.equal(response.statusCode, 403); done(); });
    socket.on('open', () => { socket.terminate(); reject(new Error('Foreign socket was accepted.')); });
    socket.on('error', () => {});
  });
});

test('local mode reopens previous projects without changing accounts or enabling bypass on hosted startup', async t => {
  await mkdir(resolve('.tmp'), { recursive: true });
  const directory = await mkdtemp(resolve('.tmp/studio-local-migration-'));
  let app;
  t.after(async () => { await app?.close(); await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); });
  app = await startStudio({ directory, port: 0 });
  const setup = await call(app, 'setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Previous owner', email: 'owner@example.com', password: 'example-password', code: app.setupSecret }) });
  const cookie = setup.headers.get('set-cookie').split(';')[0];
  const previous = await (await call(app, 'projects', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Existing manual' }) })).json();
  const accounts = structuredClone(app.db.data.users);
  await app.close(); app = await startStudio({ directory, port: 0, localOnly: true });
  const sdk = new StudioClient(app.origin);
  assert.equal((await sdk.projects())[0].id, previous.id);
  assert.equal((await sdk.project(previous.id)).role, 'owner');
  const local = await sdk.createProject({ name: 'New local manual' });
  assert.deepEqual(app.db.data.users, accounts);
  await app.close(); app = await startStudio({ directory, port: 0 });
  assert.equal((await call(app, 'me')).status, 401);
  assert.equal((await call(app, 'projects')).status, 401);
  const allowed = await (await call(app, 'projects', { headers: { Cookie: cookie } })).json();
  assert.deepEqual(allowed.map(project => project.id), [previous.id]);
  assert.equal((await call(app, `projects/${local.id}`, { headers: { Cookie: cookie } })).status, 403);
});
