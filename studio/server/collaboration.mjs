import * as Y from 'yjs';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { atomic, digest, uid } from './storage.mjs';

export class Collaboration {
  constructor(db, workspace) { this.db = db; this.workspace = workspace; this.rooms = new Map(); this.pending = new Map(); }
  key(project, locale, id) { return `${project.id}/${locale}/${id}`; }
  async room(project, locale, id) {
    if(this.closing)throw new Error('The collaboration service is closing.');
    const key = this.key(project, locale, id);
    if (this.rooms.has(key)) return this.rooms.get(key);
    if (this.pending.has(key)) return this.pending.get(key);
    const loading = (async () => {
      const page = await this.workspace.page(project, locale, id), doc = new Y.Doc();
      const file = join(this.db.directory, 'collaboration', `${digest(key)}.bin`);
      try { Y.applyUpdate(doc, await readFile(file)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      let shared = doc.getText('markdown');
      if (shared.toString() !== page.body) { doc.destroy(); return this.initialize(project, locale, id, key, file, page, new Y.Doc()); }
      return this.initialize(project, locale, id, key, file, page, doc);
    })();
    this.pending.set(key, loading);
    try { return await loading; } finally { this.pending.delete(key); }
  }
  async initialize(project, locale, id, key, file, page, doc) {
    if (!doc.getMap('system').get('epoch')) doc.getMap('system').set('epoch',uid());
    const shared = doc.getText('markdown'); if (!shared.length) shared.insert(0, page.body);
    const room = { key, project, locale, id, file, doc, shared, page, clients: new Map(), dirty: false, timer: null, error: null, saving: Promise.resolve() };
    doc.on('update', (update, origin) => {
      room.dirty = true;
      this.broadcast(room, { type: 'update', update: Buffer.from(update).toString('base64') }, origin);
      clearTimeout(room.timer);if(!this.closing)room.timer = setTimeout(() => this.flush(room).catch(() => {}), 500);
    });
    this.rooms.set(key, room); await atomic(room.file,Y.encodeStateAsUpdate(room.doc));return room;
  }
  broadcast(room, message, except) {
    const data = JSON.stringify(message);
    for (const [socket] of room.clients) if (socket !== except && socket.readyState === 1) socket.send(data);
  }
  presence(room) {
    this.broadcast(room, { type: 'presence', users: [...room.clients.values()].map(client => ({ id: client.user.id, name: client.user.name, role: this.db.role(client.user, room.project) })) });
  }
  async connect(socket, user, secret, project, locale, id) {
    const room = await this.room(project, locale, id);
    if(socket.readyState!==1||this.closing){socket.close(1001);return;}
    if (room.error) throw room.error;
    room.clients.set(socket, { user, secret });
    socket.send(JSON.stringify({ type: 'init', update: Buffer.from(Y.encodeStateAsUpdate(room.doc)).toString('base64'), page: room.page, role: this.db.role(user, project) }));
    this.presence(room);
    let count = 0, resetAt = Date.now();
    socket.on('message', data => {
      try {
        if(this.closing)return socket.close(1001);
        if (Date.now() - resetAt > 1000) { resetAt = Date.now(); count = 0; }
        if (++count > 100) return socket.close(1008, 'Too many updates.');
        const current = this.db.userFromSecret(secret);
        this.db.access(current, project.id, 'editor');
        if (room.error) return socket.close(1011, 'Saving is blocked.');
        const message = JSON.parse(data.toString());
        if (message.type !== 'update' || typeof message.update !== 'string' || message.update.length > 4 * 1024 * 1024) return socket.close(1008, 'Invalid update.');
        const update = Buffer.from(message.update, 'base64');
        const trial = new Y.Doc(); Y.applyUpdate(trial, Y.encodeStateAsUpdate(room.doc)); Y.applyUpdate(trial, update);
        const length = trial.getText('markdown').length; trial.destroy();
        if (length > 2 * 1024 * 1024) return socket.close(1009, 'Page is too large.');
        Y.applyUpdate(room.doc, update, socket);
      } catch { socket.close(1008, 'Editing is not permitted.'); }
    });
    socket.on('close', () => { room.clients.delete(socket); this.presence(room); });
  }
  async flush(room) {
    clearTimeout(room.timer);
    room.saving = room.saving.catch(() => {}).then(async () => {
      if (room.error) throw room.error;
      if (!room.dirty) return room.page;
      const body = room.shared.toString(), update = Y.encodeStateAsUpdate(room.doc), vector = Buffer.from(Y.encodeStateVector(room.doc)).toString('base64');
      room.dirty = false;
      try {
        room.page = await this.workspace.writeBody(room.project, room.locale, room.id, body, room.page.revisionToken);
        await atomic(room.file, update);
        this.broadcast(room, { type: 'saved', revisionToken: room.page.revisionToken, revision: room.page.revision,sourceRevision:room.page.sourceRevision||null,vector });
        if(room.locale==='en')for(const related of this.rooms.values())if(related.project.id===room.project.id&&related.id===room.id&&related.locale==='fr')this.broadcast(related,{type:'original-revision',id:room.id,revision:room.page.revision});
        return room.page;
      } catch (error) {
        room.dirty = true; room.error = error;
        this.broadcast(room, { type: 'error', message: error.message });
        throw error;
      }
    });
    return room.saving;
  }
  async flushProject(project) { for (const room of this.rooms.values()) if (room.project.id === project.id) await this.flush(room); }
  async updateBody(project, locale, id, body, revisionToken) {
    const room = await this.room(project, locale, id); await this.flush(room);
    if (revisionToken !== room.page.revisionToken) { const error = new Error('The page changed. Read its current revision before updating it.'); error.status = 409; throw error; }
    room.doc.transact(() => { room.shared.delete(0, room.shared.length); room.shared.insert(0, body); }, 'sdk');
    return this.flush(room);
  }
  async refreshMetadata(project, locale, id, input) {
    const room = await this.room(project, locale, id); await this.flushProject(project);
    room.page = await this.workspace.metadata(project, locale, id, input);
    for(const related of this.rooms.values())if(related.project.id===project.id&&related.id===id){related.page=await this.workspace.page(project,related.locale,id);this.broadcast(related,{type:'metadata',page:related.page});}
    return room.page;
  }
  async reload(project, locale, id) {
    const key=this.key(project,locale,id),room=this.rooms.get(key);
    if(room){clearTimeout(room.timer);await room.saving.catch(()=>{});for(const socket of room.clients.keys())socket.close(1012,'External file reloaded.');room.doc.destroy();this.rooms.delete(key);}
    return (await this.room(project,locale,id)).page;
  }
  forget(project, id) {
    for(const [key,room] of this.rooms)if(room.project.id===project.id&&(!id||room.id===id)){clearTimeout(room.timer);for(const socket of room.clients.keys())socket.close(1012,'Project refreshed.');room.doc.destroy();this.rooms.delete(key);}
  }
  async close() { this.closing=true;await Promise.allSettled([...this.pending.values()]);for (const room of this.rooms.values()) { await this.flush(room).catch(() => {});clearTimeout(room.timer);for (const socket of room.clients.keys()) socket.close(1001); room.doc.destroy(); }this.rooms.clear(); }
}
