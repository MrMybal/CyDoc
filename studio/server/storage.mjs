import { readFile, writeFile, mkdir, rename, lstat, readdir, realpath, stat } from 'node:fs/promises';
import { resolve, relative, dirname, join, isAbsolute } from 'node:path';
import { randomBytes, createHash, scryptSync, timingSafeEqual } from 'node:crypto';

export class StudioError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const fail = (status, message) => { throw new StudioError(status, message); };
export const uid = () => randomBytes(16).toString('hex');
export const digest = value => createHash('sha256').update(value).digest('hex');
export async function atomic(file, value) {
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.${uid()}.tmp`;
  await writeFile(temporary, value, { mode: 0o600 });
  await rename(temporary, file);
}
export async function json(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return structuredClone(fallback); throw error; }
}
export function passwordHash(password, salt = uid()) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) fail(400, 'Use a password containing 12–256 characters.');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function passwordMatches(password, stored) {
  try { const [salt, hash] = stored.split(':'); const test = passwordHash(password, salt).split(':')[1]; return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex')); }
  catch { return false; }
}
export function identifier(value) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{0,95}$/.test(value)) fail(400, 'Use a stable ID containing lowercase letters, numbers and hyphens.');
  return value;
}
export function email(value) {
  if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 254) fail(400, 'A valid email address is required.');
  return value.trim().toLowerCase();
}
export function text(value, maximum = 500) {
  if (typeof value !== 'string' || value.length > maximum || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) fail(400, 'Invalid text.');
  return value;
}
// Resolve each component, rejecting junctions/symlinks including existing ancestors.
export async function contained(root, path = '') {
  const base = await realpath(root), destination = resolve(base, path);
  const delta = relative(base, destination);
  if (isAbsolute(delta) || delta === '..' || delta.startsWith(`..\\`) || delta.startsWith('../')) fail(400, 'Path is outside the selected project.');
  let cursor = base;
  for (const part of delta.split(/[\\/]/).filter(Boolean)) {
    cursor = join(cursor, part);
    try { if ((await lstat(cursor)).isSymbolicLink()) fail(400, 'Symbolic links are not supported in managed paths.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return destination;
}
export async function files(root, extension) {
  const result = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.isSymbolicLink()) continue;
      const file = join(directory, entry.name);
      if (entry.isDirectory()) await visit(file); else if (!extension || extension.test(entry.name)) result.push(file);
    }
  }
  await visit(root); return result.sort();
}
export async function rejectLinks(root, compilerWalk = false) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (compilerWalk && (entry.name.startsWith('.') || ['node_modules','dist'].includes(entry.name))) continue;
    if (entry.isSymbolicLink()) fail(400, 'Managed documentation inputs cannot contain symbolic links.');
    if (entry.isDirectory()) await rejectLinks(join(root, entry.name), compilerWalk);
  }
}
export class Database {
  constructor(directory) { this.directory = resolve(directory); this.tail = Promise.resolve(); }
  async open() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    this.file = join(this.directory, 'studio.json');
    this.data = await json(this.file, { version: 1, users: {}, sessions: {}, projects: {}, invitations: {}, tokens: {} });
    return this;
  }
  async change(fn) {
    const next = this.tail.then(async () => {
      const copy = structuredClone(this.data), result = await fn(copy);
      await atomic(this.file, JSON.stringify(copy, null, 2)); this.data = copy; return result;
    });
    this.tail = next.catch(() => {}); return next;
  }
  userFromSecret(secret) {
    if (this.localUser) return this.localUser;
    if (!secret) return null;
    const hash = digest(secret), session = this.data.sessions[hash] || this.data.tokens[hash];
    if (!session || session.expires <= Date.now()) return null;
    return this.data.users[session.userId] || null;
  }
  role(user, project) { return this.localUser && user === this.localUser ? 'owner' : project?.members[user?.id]; }
  access(user, projectId, minimum = 'viewer') {
    const project = this.data.projects[projectId];
    const role = user && this.role(user, project);
    if (!project || !role || ({ viewer: 1, editor: 2, owner: 3 }[role] < { viewer: 1, editor: 2, owner: 3 }[minimum])) fail(403, 'You do not have access to this project or action.');
    return project;
  }
}
