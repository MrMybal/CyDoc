import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { atomic, uid, fail, text } from './storage.mjs';

export class GitCredentials {
  constructor(directory) { this.directory = join(directory, 'git-credentials'); }
  async open() {
    await mkdir(this.directory, { recursive: true }); const file = join(this.directory, 'key');
    try { this.key = await readFile(file); }
    catch (error) { if (error.code !== 'ENOENT') throw error; this.key = randomBytes(32); await writeFile(file, this.key, { mode: 0o600, flag: 'wx' }); }
    return this;
  }
  async save(projectId, username, token) {
    if (!/^[a-f0-9]{32}$/.test(projectId)) fail(400, 'Invalid project.');
    text(username, 200); text(token, 4000);
    if (!username || !token || /[\r\n\u0000]/.test(username + token)) fail(400, 'A Git username and access token are required.');
    const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.key, nonce);
    cipher.setAAD(Buffer.from(projectId));
    const payload = Buffer.concat([cipher.update(JSON.stringify({ username, token }), 'utf8'), cipher.final()]);
    await atomic(join(this.directory, projectId), Buffer.concat([nonce, cipher.getAuthTag(), payload]));
  }
  async get(projectId) {
    try {
      const payload = await readFile(join(this.directory, projectId)), decipher = createDecipheriv('aes-256-gcm', this.key, payload.subarray(0,12));
      decipher.setAAD(Buffer.from(projectId)); decipher.setAuthTag(payload.subarray(12,28));
      return JSON.parse(Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString('utf8'));
    } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
}
