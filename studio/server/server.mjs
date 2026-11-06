import { createServer } from 'node:http';
import { readFile, stat, mkdir, open, unlink } from 'node:fs/promises';
import { join, resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { Database, StudioError, fail, uid, digest, passwordHash, passwordMatches, email, text, contained, atomic, files, identifier } from './storage.mjs';
import { readFrontmatter } from '../../tools/compiler.mjs';
import { zipSync } from 'fflate';
import { GitCredentials } from './credentials.mjs';
import { Workspace } from './workspace.mjs';
import { Collaboration } from './collaboration.mjs';
import { gitAction, gitStatus } from './git.mjs';

const studioRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.woff2': 'font/woff2' };
export async function startStudio({ directory, host = '127.0.0.1', port = 4310, publicOrigin, localOnly = false, allowRoots = [], allowRootsFile, setupSecret = uid() } = {}) {
  if (!directory) throw new Error('A private Studio data directory is required.');
  if (localOnly) {
    if (publicOrigin || !['127.0.0.1', 'localhost', '::1'].includes(host)) throw new Error('Account-free local mode requires a loopback host and cannot use a public origin.');
    if (host === 'localhost') host = '127.0.0.1';
  }
  if (publicOrigin) { const parsed = new URL(publicOrigin); if (parsed.username || parsed.password || parsed.origin !== publicOrigin.replace(/\/$/, '') || !['http:','https:'].includes(parsed.protocol)) throw new Error('Use a valid public origin without credentials, path or query.'); publicOrigin = parsed.origin; }
  if (!['127.0.0.1', 'localhost', '::1'].includes(host) && (!publicOrigin || !publicOrigin.startsWith('https:'))) throw new Error('Online hosting requires an explicit HTTPS publicOrigin behind a TLS reverse proxy.');
  await mkdir(directory, { recursive: true });
  const lockFile = join(directory, 'server.lock'); let lock;
  try { lock = await open(lockFile, 'wx'); await lock.writeFile(String(process.pid)); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const pid = Number(await readFile(lockFile, 'utf8')); let alive = false;
    try { process.kill(pid, 0); alive = true; } catch (error) { if (error.code === 'EPERM') alive = true; }
    if (alive) throw new Error('Another Studio server owns this data directory.');
    await unlink(lockFile); lock = await open(lockFile, 'wx'); await lock.writeFile(String(process.pid));
  }
  const db = await new Database(directory).open(), workspace = new Workspace(db, { allowRoots,allowRootsFile });
  // An in-memory operator identity, never a registered account or a persisted session.
  if (localOnly) db.localUser = Object.freeze({ id: 'local-workspace', name: 'Local workspace', email: '', administrator: true, local: true });
  const cookieName = `cydoc_session_${digest(resolve(directory)).slice(0,12)}`;
  const collaboration = new Collaboration(db, workspace), sockets = new WebSocketServer({ noServer: true, maxPayload: 4 * 1024 * 1024 });
  const credentials = await new GitCredentials(directory).open();
  workspace.credentials = credentials;
  let origin = publicOrigin, secure = publicOrigin?.startsWith('https:') || false;
  const attempts = new Map();
  let closing=false;
  let pendingRequests=0;const drainWaiters=[];
  function secret(request) {
    const bearer = request.headers.authorization?.match(/^Bearer ([a-f0-9]{32,128})$/)?.[1];
    return bearer || request.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  }
  function actor(request) { const user = db.userFromSecret(secret(request)); if (!user) fail(401, 'Sign in to continue.'); return user; }
  function publicUser(user) { return { id: user.id, name: user.name, email: user.email, ...(localOnly ? { local: true } : {}) }; }
  function checkRequest(request) {
    if (localOnly && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress)) fail(403, 'Local connections only.');
    if (localOnly && request.headers['sec-fetch-site'] === 'cross-site') fail(403, 'Cross-site local access is not allowed.');
    if (request.headers.origin && request.headers.origin !== origin) fail(403, 'This origin is not allowed.');
    if (request.headers.host !== new URL(origin).host && !publicOrigin) fail(403, 'This host is not allowed.');
  }
  async function session(response, user) {
    const token = uid() + uid();
    await db.change(data => { data.sessions[digest(token)] = { userId: user.id, expires: Date.now() + 7 * 86400000 }; });
    response.setHeader('Set-Cookie', `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${secure ? '; Secure' : ''}`);
    return publicUser(user);
  }
  async function body(request, limit = 3 * 1024 * 1024, binary = false) {
    const parts = []; let size = 0;
    for await (const part of request) { size += part.length; if (size > limit) fail(413, 'Request is too large.'); parts.push(part); }
    const bytes = Buffer.concat(parts); if (binary) return bytes;
    try { return bytes.length ? JSON.parse(bytes.toString('utf8')) : {}; } catch { fail(400, 'Invalid JSON request.'); }
  }
  function headers(response) {
    response.setHeader('X-Content-Type-Options', 'nosniff'); response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self' ${origin?.replace(/^http/, 'ws')}; frame-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'`);
  }
  function send(response, value, status = 200) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(value)); }
  async function serve(request, response, file, sandbox = false) {
    const info = await stat(file); if (!info.isFile()) fail(404, 'File not found.');
    const bytes = await readFile(file); response.setHeader('Content-Type', types[extname(file).toLowerCase()] || 'application/octet-stream');
    if (sandbox || extname(file).toLowerCase() === '.svg') response.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; style-src 'unsafe-inline'");
    if (request.headers.range && /^(video|audio)\//.test(types[extname(file)] || '')) {
      const match = request.headers.range.match(/^bytes=(\d+)-(\d*)$/); if (!match) fail(416, 'Unsupported byte range.');
      const first = Number(match[1]), last = Math.min(Number(match[2] || bytes.length - 1), bytes.length - 1);
      if (first > last || first >= bytes.length) fail(416, 'Invalid byte range.');
      response.writeHead(206, { 'Content-Range': `bytes ${first}-${last}/${bytes.length}`, 'Content-Length': last - first + 1, 'Accept-Ranges': 'bytes' }); response.end(bytes.subarray(first, last + 1));
    } else { response.setHeader('Content-Length', bytes.length); response.end(request.method === 'HEAD' ? undefined : bytes); }
  }
  const server = createServer(async (request, response) => {
    pendingRequests++;
    headers(response);
    try {
      if(closing)fail(503,'The editor service is shutting down.');
      checkRequest(request);
      const url = new URL(request.url, origin), path = url.pathname.split('/').filter(Boolean).map(decodeURIComponent), method = request.method;
      if (path[0] !== 'api') {
        if (!['GET', 'HEAD'].includes(method)) fail(405, 'Method not allowed.');
        if (path[0] === 'published') {
          const project = db.access(actor(request), path[1]);
          const publicRoot=await contained(project.root,'Documentation');
          return await serve(request, response, await contained(publicRoot,path.slice(2).join('/') || 'Documentation.html'));
        }
        if (path[0] === 'preview') return await serve(request, response, join(studioRoot, 'dist/preview.html'));
        return await serve(request, response, await contained(join(studioRoot, 'dist'), path.join('/') || 'index.html'));
      }
      if (path[1] === 'bootstrap' && method === 'GET') return send(response, { needsSetup: !localOnly && !Object.keys(db.data.users).length, mode: localOnly ? 'local' : 'accounts' });
      if (localOnly && (['setup', 'login', 'register', 'logout', 'tokens', 'accept-invitation'].includes(path[1]) || path[3] === 'members')) fail(409, 'Accounts and invitations are unavailable in local mode.');
      if (['setup', 'login', 'register'].includes(path[1]) && method === 'POST') {
        const key = `${request.socket.remoteAddress}:${path[1]}`, attempt = attempts.get(key) || { count: 0, until: Date.now() + 60000 };
        if (attempt.until < Date.now()) { attempt.count = 0; attempt.until = Date.now() + 60000; }
        attempts.set(key, attempt); if (++attempt.count > 12) fail(429, 'Too many attempts. Try again in one minute.');
        const input = await body(request), address = email(input.email);
        if (path[1] === 'login') {
          const user = Object.values(db.data.users).find(user => user.email === address);
          if (!user || !passwordMatches(input.password, user.password)) fail(401, 'Email or password is incorrect.');
          return send(response, await session(response, user));
        }
        const password = passwordHash(input.password), name = text(input.name, 100).trim(); if (!name) fail(400, 'A display name is required.');
        const user = await db.change(data => {
          if (Object.values(data.users).some(user => user.email === address)) fail(409, 'This account exists. Sign in and accept the invitation.');
          if (path[1] === 'setup') {
            if (Object.keys(data.users).length || digest(input.code || '') !== digest(setupSecret)) fail(403, 'Use the setup code printed by the server operator.');
          } else {
            const invitation = data.invitations[digest(input.code || '')];
            if (!invitation || invitation.email !== address || invitation.expires < Date.now()) fail(403, 'This invitation is invalid or expired.');
          }
          const id = uid(), user = { id, name, email: address, password, administrator: path[1] === 'setup', created: Date.now() }; data.users[id] = user;
          if (path[1] === 'register') { const invitation = data.invitations[digest(input.code)]; data.projects[invitation.projectId].members[id] = invitation.role; delete data.invitations[digest(input.code)]; }
          return user;
        });
        return send(response, await session(response, user), 201);
      }
      const user = actor(request);
      if (path[1] === 'me') return send(response, publicUser(user));
      if (path[1] === 'logout' && method === 'POST') {
        await db.change(data => { delete data.sessions[digest(secret(request))]; });
        response.setHeader('Set-Cookie', `${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? '; Secure' : ''}`); return send(response, { signedOut: true });
      }
      if (path[1] === 'tokens' && method === 'POST') {
        const token = uid() + uid(), input = await body(request);
        await db.change(data => { data.tokens[digest(token)] = { userId: user.id, expires: Date.now() + 30 * 86400000, name: text(input.name || 'Local SDK', 100) }; });
        return send(response, { token, expiresInDays: 30 });
      }
      if (path[1] === 'tokens' && method === 'DELETE') {
        await db.change(data => { for (const [key, token] of Object.entries(data.tokens)) if (token.userId === user.id) delete data.tokens[key]; });
        return send(response, { revoked: true });
      }
      if (path[1] === 'accept-invitation' && method === 'POST') {
        const input = await body(request);
        await db.change(data => { const key = digest(input.code || ''), invitation = data.invitations[key]; if (!invitation || invitation.email !== user.email || invitation.expires < Date.now()) fail(403, 'Invalid invitation.'); data.projects[invitation.projectId].members[user.id] = invitation.role; delete data.invitations[key]; });
        return send(response, { accepted: true });
      }
      if (path[1] !== 'projects') fail(404, 'Unknown endpoint.');
      if (path.length === 2) {
        if (method === 'GET') return send(response, Object.values(db.data.projects).filter(project => db.role(user, project)).map(project => workspace.summary(project, user)));
        if (method === 'POST') return send(response, await workspace.create(user, await body(request)), 201);
      }
      const project = db.access(user, path[2], method === 'GET' ? 'viewer' : 'editor');
      if (path.length === 3 && method === 'GET') {
        await collaboration.flushProject(project);
        const { config } = await workspace.config(project);
        return send(response, { ...workspace.summary(project, user), config, pages: await workspace.pages(project) });
      }
      if (path[3] === 'members') {
        db.access(user, project.id, 'owner');
        if (method === 'GET') return send(response, Object.entries(project.members).map(([id, role]) => ({ ...publicUser(db.data.users[id]), role })));
        const input = await body(request);
        if (method === 'POST') {
          const address = email(input.email), role = input.role;
          if (!['viewer', 'editor'].includes(role)) fail(400, 'Choose viewer or editor.');
          const code = uid() + uid();
          await db.change(data => { data.invitations[digest(code)] = { email: address, role, projectId: project.id, expires: Date.now() + 7 * 86400000 }; });
          return send(response, { code, invitationUrl: `${origin}/#invite=${code}` }, 201);
        }
        if (method === 'DELETE') { if (input.userId === user.id || project.members[input.userId] === 'owner') fail(400, 'The project owner cannot be removed.'); await db.change(data => { delete data.projects[project.id].members[input.userId]; }); return send(response, { removed: true }); }
      }
      if (path[3] === 'settings' && method === 'PATCH') { db.access(user, project.id, 'owner'); return send(response, await workspace.settings(project, await body(request))); }
      if (path[3] === 'pages') {
        if (method === 'POST' && path.length === 4) return send(response, await workspace.createPage(project, await body(request)), 201);
        const [locale, id] = path.slice(4);
        if (method === 'GET') { const room = await collaboration.room(project, locale, id); await collaboration.flush(room); return send(response, room.page); }
        if (method === 'PUT') { const input = await body(request); return send(response, await collaboration.updateBody(project, locale, id, text(input.body, 2 * 1024 * 1024), input.revisionToken)); }
        if (method === 'PATCH') return send(response, await collaboration.refreshMetadata(project, locale, id, await body(request)));
        if (method === 'DELETE') { db.access(user, project.id, 'owner'); await collaboration.flushProject(project); const live = [...collaboration.rooms.values()].find(room => room.project.id === project.id && room.id === id && room.clients.size); if (live) fail(409, 'Close this page in all editors before archiving it.'); const result=await workspace.deletePage(project,id);collaboration.forget(project,id);return send(response,result); }
      }
      if (path[3] === 'reload' && method === 'POST') { db.access(user,project.id,'owner'); const input=await body(request); return send(response,await collaboration.reload(project,input.locale,input.pageId)); }
      if (path[3] === 'assets') {
        if (method === 'GET' && path.length === 4) return send(response, await workspace.assetList(project));
        if (method === 'GET') { const { assets } = await workspace.config(project); return await serve(request, response, await contained(assets, path.slice(4).join('/'))); }
        if (method === 'POST') return send(response, await workspace.upload(project, url.searchParams.get('name') || '', await body(request, 64 * 1024 * 1024, true)), 201);
      }
      if (path[3] === 'preview' && method === 'GET') { await collaboration.flushProject(project); return send(response, await workspace.preview(project, url.searchParams.get('locale'), url.searchParams.get('page'))); }
      if (path[3] === 'history') {
        const [locale, id] = path.slice(4); await workspace.page(project, locale, identifier(id));
        const { privateRoot } = await workspace.config(project);
        const directory = await contained(privateRoot, `internal/studio-history/${locale}/${id}`);
        await mkdir(directory, { recursive: true });
        if (method === 'GET') return send(response, (await files(directory, /\.md$/)).reverse().map(file => ({ name: file.split(/[\\/]/).at(-1), time: Number(file.split(/[\\/]/).at(-1).split('-')[0]) })));
        if (method === 'POST') {
          const input = await body(request); if (!/^\d+-[a-f0-9]{6}\.md$/.test(input.name || '')) fail(400, 'Invalid revision.');
          const revision = readFrontmatter(await readFile(await contained(directory, input.name), 'utf8'));
          return send(response, await collaboration.updateBody(project, locale, id, revision.body, input.revisionToken));
        }
      }
      if (path[3] === 'publish' && method === 'POST') { db.access(user, project.id, 'owner'); await collaboration.flushProject(project); return send(response, await workspace.publish(project)); }
      if (path[3] === 'download' && method === 'GET') {
        const directory = await contained(project.root, 'Documentation'), entries = {}; let total = 0;
        for (const file of await files(directory)) { const bytes = await readFile(file); total += bytes.length; if (total > 256 * 1024 * 1024) fail(413, 'This export exceeds the 256 MiB web download limit. Copy it from server storage.'); const name = file.slice(directory.length + 1).replaceAll('\\','/'); entries[`Documentation/${name}`] = bytes; }
        response.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="Documentation.zip"' }); return response.end(zipSync(entries, { level: 3 }));
      }
      if (path[3] === 'git') {
        if (method === 'GET') return send(response, await gitStatus(project));
        db.access(user, project.id, 'owner'); await collaboration.flushProject(project);
        const input = await body(request);
        if (path[4] === 'credentials') { await credentials.save(project.id, input.username, input.token); return send(response, { configured: true }); }
        if (['pull','branch','switch'].includes(path[4]) && [...collaboration.rooms.values()].some(room => room.project.id === project.id && room.clients.size)) fail(409, 'Close the project in connected editors before changing its checked-out files.');
        const result = await workspace.lock(project.id, () => gitAction(project, path[4], input, credentials));
        if(['pull','branch','switch'].includes(path[4]))collaboration.forget(project);
        if (path[4] === 'enable') await db.change(data => { data.projects[project.id].git = true; });
        return send(response, result);
      }
      fail(404, 'Unknown endpoint.');
    } catch (error) {
      if (response.headersSent) return response.destroy();
      const status = error.status || (error.code === 'ENOENT' ? 404 : 500);
      send(response, { error: status < 500 ? error.message : 'The server could not complete this action. Check its private logs.' }, status);
      if (status >= 500) console.error('[CyDoc Studio]', error.message);
    }finally{pendingRequests--;if(!pendingRequests)for(const done of drainWaiters.splice(0))done();}
  });
  server.requestTimeout = 30000; server.headersTimeout = 15000;
  server.on('upgrade', async (request, socket, head) => {
    try {
      if(closing)fail(503,'Shutting down.');
      checkRequest(request);
      if (request.headers.origin !== origin) fail(403, 'Origin rejected.');
      const url = new URL(request.url, origin);
      if (url.pathname !== '/collaboration') fail(404, 'Unknown socket.');
      const user = actor(request), project = db.access(user, url.searchParams.get('project'));
      const locale = url.searchParams.get('locale'), id = url.searchParams.get('page');
      await workspace.page(project, locale, id);
      sockets.handleUpgrade(request, socket, head, ws => { collaboration.connect(ws, user, secret(request), project, locale, id).catch(() => ws.close(1008, 'Page unavailable.')); });
    } catch { socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); socket.destroy(); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
  const address = server.address(); origin ||= `http://${host === '::1' ? '[::1]' : host}:${address.port}`;
  const timer = setInterval(() => {
    for (const room of collaboration.rooms.values()) for (const [socket, client] of room.clients) {
      try { db.access(db.userFromSecret(client.secret), room.project.id); } catch { socket.close(1008, 'Session expired or access removed.'); }
    }
  }, 30000); timer.unref();
  return { origin, localOnly, setupSecret: localOnly ? undefined : setupSecret, db, workspace, collaboration, server, async close() {
    if(closing)return;closing=true;
    clearInterval(timer);if(pendingRequests)await new Promise(done=>drainWaiters.push(done));await collaboration.close();
    await Promise.allSettled([...workspace.locks.values()]);
    for (const socket of sockets.clients) socket.terminate(); sockets.close();
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    await lock.close(); await unlink(lockFile);
  } };
}
