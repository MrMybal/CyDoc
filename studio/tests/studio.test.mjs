import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, mkdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { WebSocket } from 'ws';
import * as Y from 'yjs';
import { startStudio } from '../server/server.mjs';
import { StudioClient } from '../sdk/client.mjs';
import { contained } from '../server/storage.mjs';
import { GitCredentials } from '../server/credentials.mjs';
import { git, remoteUrl } from '../server/git.mjs';

async function fixture(t) {
  await mkdir(resolve('.tmp'), { recursive: true });
  const directory = await mkdtemp(resolve('.tmp/studio-test-'));
  const app = await startStudio({ directory, port: 0, setupSecret: 'test-administrator-setup-code' });
  t.after(async () => { await app.close(); await rm(directory, { recursive: true, force: true,maxRetries:5,retryDelay:50 }); });
  const call = async (path, method = 'GET', input, cookie, headers = {}) => {
    const response = await fetch(`${app.origin}/api/${path}`, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: input === undefined ? undefined : JSON.stringify(input) });
    const result = await response.json();
    return { status: response.status, result, cookie: response.headers.get('set-cookie')?.split(';')[0] };
  };
  const setup = await call('setup','POST',{ name:'Demo Owner',email:'owner@example.com',password:'example-passphrase-123',code:app.setupSecret });
  assert.equal(setup.status,201);
  const created = await call('projects','POST',{name:'Demo Manual'},setup.cookie);
  assert.equal(created.status,201);
  return { app, call, directory, owner: setup, project: created.result };
}
async function invited(f, role = 'editor', name = 'second') {
  const invitation = await f.call(`projects/${f.project.id}/members`,'POST',{email:`${name}@example.com`,role},f.owner.cookie);
  assert.equal(invitation.status,201);
  const result = await f.call('register','POST',{name:`Demo ${name}`,email:`${name}@example.com`,password:'example-passphrase-456',code:invitation.result.code});
  assert.equal(result.status,201); return result;
}
async function peer(f, cookie, locale = 'en') {
  const socket = new WebSocket(`${f.app.origin.replace('http','ws')}/collaboration?project=${f.project.id}&locale=${locale}&page=overview`,{headers:{Cookie:cookie,Origin:f.app.origin}});
  const doc = new Y.Doc(); let ready;
  const initialized = new Promise(resolve => ready = resolve);
  socket.on('message', raw => { const value=JSON.parse(raw); if (['init','update'].includes(value.type)) Y.applyUpdate(doc,Buffer.from(value.update,'base64'),'server');if(value.type==='init')ready(); });
  doc.on('update',(update,origin)=>{if(origin!=='server' && socket.readyState===1)socket.send(JSON.stringify({type:'update',update:Buffer.from(update).toString('base64')}));});
  await initialized; return {socket,doc,text:doc.getText('markdown')};
}
const eventually = async fn => { const end=Date.now()+5000;while(Date.now()<end){if(await fn())return;await new Promise(resolve=>setTimeout(resolve,20));}assert.fail('Condition did not become true.'); };

test('accounts, closed registration, project permissions, invitation ownership and CSRF',async t=>{
  const f=await fixture(t), viewer=await invited(f,'viewer','reader');
  assert.equal((await f.call('projects')).status,401);
  assert.equal((await f.call('setup','POST',{email:'other@example.com',name:'Other',password:'example-passphrase-789',code:f.app.setupSecret})).status,403);
  assert.equal((await f.call('register','POST',{email:'random@example.com',name:'Other',password:'example-passphrase-789',code:'invalid'})).status,403);
  assert.equal((await f.call(`projects/${f.project.id}/pages/en/overview`,'PUT',{body:'forbidden',revisionToken:'invalid'},viewer.cookie)).status,403);
  assert.equal((await f.call('projects','GET',undefined,f.owner.cookie,{Origin:'https://untrusted.example'})).status,403);
  assert.equal((await f.call(`projects/${f.project.id}/members`,'GET',undefined,viewer.cookie)).status,403);
  assert.equal((await f.call(`projects/${f.project.id}/settings`,'PATCH',{name:'hijacked'},viewer.cookie)).status,403);
});

test('two real websocket clients merge simultaneous changes and persist canonical Markdown',async t=>{
  const f=await fixture(t), second=await invited(f), a=await peer(f,f.owner.cookie),b=await peer(f,second.cookie);
  t.after(()=>{a.socket.terminate();b.socket.terminate();a.doc.destroy();b.doc.destroy();});
  a.text.insert(a.text.length,'\n\nOwner contribution.'); b.text.insert(b.text.length,'\n\nSecond contribution.');
  await eventually(()=>a.text.toString()===b.text.toString()&&a.text.toString().includes('Second contribution.'));
  await f.app.collaboration.flushProject(f.app.db.data.projects[f.project.id]);
  const page=await f.call(`projects/${f.project.id}/pages/en/overview`,'GET',undefined,f.owner.cookie);
  assert.match(page.result.body,/Owner contribution/);assert.match(page.result.body,/Second contribution/);
  const file=join(f.app.db.data.projects[f.project.id].root,'.CyDocBuild/manual/en/overview.md');
  assert.match(await readFile(file,'utf8'),/Second contribution/);
});

test('read-only websocket cannot inject updates and revoked members lose access',async t=>{
  const f=await fixture(t), viewer=await invited(f,'viewer','reader'),a=await peer(f,viewer.cookie);
  const original=a.text.toString();a.text.insert(0,'forbidden');
  await new Promise(resolve=>a.socket.once('close',resolve));
  const current=await f.call(`projects/${f.project.id}/pages/en/overview`,'GET',undefined,f.owner.cookie);assert.equal(current.result.body,original);
  await f.call(`projects/${f.project.id}/members`,'DELETE',{userId:viewer.result.id},f.owner.cookie);
  assert.equal((await f.call(`projects/${f.project.id}`,'GET',undefined,viewer.cookie)).status,403);a.doc.destroy();
});

test('SDK conflicts preserve another editor and external file changes stop autosaving',async t=>{
  const f=await fixture(t), token=await f.call('tokens','POST',{name:'Test SDK'},f.owner.cookie),sdk=new StudioClient(f.app.origin,token.result.token);
  const first=await sdk.page(f.project.id,'en','overview');
  await sdk.updatePage(f.project.id,'en','overview',first.body+'\nSDK change.',first.revisionToken);
  await assert.rejects(sdk.updatePage(f.project.id,'en','overview','lost update',first.revisionToken),error=>error.status===409);
  const current=await sdk.page(f.project.id,'en','overview'),root=f.app.db.data.projects[f.project.id].root,file=join(root,'.CyDocBuild/manual/en/overview.md');
  await writeFile(file,(await readFile(file,'utf8'))+'\nExternal change.');
  await assert.rejects(sdk.updatePage(f.project.id,'en','overview','must not overwrite',current.revisionToken),/outside this editing session/);
  assert.match(await readFile(file,'utf8'),/External change/);
});

test('publication requires reviewed French and keeps Studio state outside the reader',async t=>{
  const f=await fixture(t),base=`projects/${f.project.id}`;
  let page=await f.call(`${base}/pages/en/overview`,'GET',undefined,f.owner.cookie);
  await f.call(`${base}/pages/en/overview`,'PUT',{body:page.result.body+'\nUpdated instructions.',revisionToken:page.result.revisionToken},f.owner.cookie);
  assert.equal((await f.call(`${base}/publish`,'POST',{},f.owner.cookie)).status,422);
  const french=await f.call(`${base}/pages/fr/overview`,'GET',undefined,f.owner.cookie);
  assert.equal((await f.call(`${base}/pages/fr/overview`,'PATCH',{translationReviewed:true,revisionToken:french.result.revisionToken},f.owner.cookie)).status,200);
  assert.equal((await f.call(`${base}/publish`,'POST',{},f.owner.cookie)).status,200);
  const root=f.app.db.data.projects[f.project.id].root;
  const html=await readFile(join(root,'Documentation/Documentation.html'),'utf8');assert.match(html,/DocData\/viewer\.js/);
  const data=await readFile(join(root,'Documentation/DocData/data.js'),'utf8');assert.doesNotMatch(data,/studio-history|example-passphrase|invitationUrl/);
  assert.match(await readFile(join(root,'Documentation/DocAI.md'),'utf8'),/CyDoc/);
  await writeFile(join(root,'application-private.txt'),'PRIVATE_APPLICATION_CONTENT');
  const traversal=await fetch(`${f.app.origin}/published/${f.project.id}/..%2fapplication-private.txt`,{headers:{Cookie:f.owner.cookie}});
  assert.equal(traversal.status,400);assert.doesNotMatch(await traversal.text(),/PRIVATE_APPLICATION_CONTENT/);
  await f.call(`${base}/pages`,'POST',{id:'new-guide',titles:{en:'A new guide',fr:'Un nouveau guide'}},f.owner.cookie);
  for(const locale of ['en','fr']){const row=await f.call(`${base}/pages/${locale}/new-guide`,'GET',undefined,f.owner.cookie);await f.call(`${base}/pages/${locale}/new-guide`,'PUT',{body:locale==='en'?'An English instruction.':'Une instruction française.',revisionToken:row.result.revisionToken},f.owner.cookie);}
  assert.equal((await f.call(`${base}/publish`,'POST',{},f.owner.cookie)).status,422,'A nonempty but unreviewed French page must still block publication.');
  assert.equal(await readFile(join(root,'Documentation/DocData/data.js'),'utf8'),data,'A blocked publication preserves the previous reader.');
});

test('stable IDs, metadata tree cycles and media paths are validated',async t=>{
  const f=await fixture(t),base=`projects/${f.project.id}`;
  assert.equal((await f.call(`${base}/pages`,'POST',{id:'../bad',titles:{en:'Bad',fr:'Mauvais'}},f.owner.cookie)).status,400);
  assert.equal((await f.call(`${base}/pages`,'POST',{id:'child',titles:{en:'Child',fr:'Enfant'},parent:'overview'},f.owner.cookie)).status,201);
  const page=await f.call(`${base}/pages/en/overview`,'GET',undefined,f.owner.cookie);
  assert.equal((await f.call(`${base}/pages/en/overview`,'PATCH',{parent:'child',revisionToken:page.result.revisionToken},f.owner.cookie)).status,400);
  assert.equal((await f.call(`${base}/assets?name=../outside.png`,'POST',{},f.owner.cookie)).status,400);
  await assert.rejects(contained(f.directory,'../outside'),/outside/);
  assert.equal((await f.call(`${base}/pages/en/child`,'DELETE',{},f.owner.cookie)).status,200);
  const updated=await f.call(base,'GET',undefined,f.owner.cookie);assert.equal(updated.result.config.aliases.child,'overview');
});

test('Git remains opt-in and does not touch other staged application changes',async t=>{
  const f=await fixture(t),base=`projects/${f.project.id}`;
  assert.equal((await f.call(`${base}/git`,'GET',undefined,f.owner.cookie)).result.enabled,false);
  assert.equal((await f.call(`${base}/git/push`,'POST',{},f.owner.cookie)).status,400);
  assert.equal((await f.call(`${base}/git/enable`,'POST',{},f.owner.cookie)).status,200);
  const commit=await f.call(`${base}/git/commit`,'POST',{message:'Document the example application',name:'Example Author',email:'author@example.com'},f.owner.cookie);
  assert.equal(commit.status,200);assert.match(commit.result.commit,/^[a-f0-9]{40}$/);
  const root=f.app.db.data.projects[f.project.id].root;await writeFile(join(root,'application.txt'),'Unrelated application work.');await git(root,['add','--','application.txt']);
  assert.equal((await f.call(`${base}/git/commit`,'POST',{message:'Must not include application work',name:'Example Author',email:'author@example.com'},f.owner.cookie)).status,409);
  assert.equal((await git(root,['rev-parse','HEAD'])).trim(),commit.result.commit);
});

test('Git credentials stay encrypted outside projects and are never returned to project readers',async t=>{
  const f=await fixture(t),base=`projects/${f.project.id}`,token='fictional-git-credential-for-encryption-test';
  assert.equal((await f.call(`${base}/git/credentials`,'POST',{username:'example',token},f.owner.cookie)).status,200);
  const disk=await readFile(join(f.directory,'git-credentials',f.project.id));assert.equal(disk.includes(Buffer.from(token)),false);
  const vault=await new GitCredentials(f.directory).open();assert.equal((await vault.get(f.project.id)).token,token);
  const details=await f.call(base,'GET',undefined,f.owner.cookie);assert.equal(JSON.stringify(details).includes(token),false);
  assert.throws(()=>remoteUrl('https://unapproved.example/repo.git'),/not been allowed/);
  assert.throws(()=>remoteUrl('https://secret@github.com/example/repo.git'),/without credentials/);
});

test('tree moves update both locales and metadata changes invalidate French review',async t=>{
  const f=await fixture(t),base=`projects/${f.project.id}`;
  await f.call(`${base}/pages`,'POST',{id:'child',titles:{en:'Child',fr:'Enfant'}},f.owner.cookie);
  let child=await f.call(`${base}/pages/en/child`,'GET',undefined,f.owner.cookie);
  assert.equal((await f.call(`${base}/pages/en/child`,'PATCH',{parent:'overview',order:7,revisionToken:child.result.revisionToken},f.owner.cookie)).status,200);
  const frenchChild=await f.call(`${base}/pages/fr/child`,'GET',undefined,f.owner.cookie);assert.equal(frenchChild.result.parent,'overview');assert.equal(Number(frenchChild.result.order),7);
  let english=await f.call(`${base}/pages/en/overview`,'GET',undefined,f.owner.cookie);
  const previous=english.result.revision;english=await f.call(`${base}/pages/en/overview`,'PATCH',{title:'Updated English title',revisionToken:english.result.revisionToken},f.owner.cookie);
  assert.notEqual(english.result.revision,previous);const french=await f.call(`${base}/pages/fr/overview`,'GET',undefined,f.owner.cookie);assert.notEqual(french.result.sourceRevision,english.result.revision);
});

test('room persistence reuses its CRDT identity and recovery preserves external changes',async t=>{
  const f=await fixture(t),project=f.app.db.data.projects[f.project.id];
  const room=await f.app.collaboration.room(project,'en','overview'),epoch=room.doc.getMap('system').get('epoch');
  room.shared.insert(room.shared.length,'\nPersisted collaboration.');await f.app.collaboration.flush(room);
  f.app.collaboration.forget(project);const restored=await f.app.collaboration.room(project,'en','overview');assert.equal(restored.doc.getMap('system').get('epoch'),epoch);assert.match(restored.shared.toString(),/Persisted collaboration/);
  const file=join(project.root,'.CyDocBuild/manual/en/overview.md');await writeFile(file,(await readFile(file,'utf8'))+'\nExternally edited.');
  restored.shared.insert(0,'Conflicting local draft.');await assert.rejects(f.app.collaboration.flush(restored),/outside/);
  const reset=await f.app.collaboration.reload(project,'en','overview');assert.match(reset.body,/Externally edited/);assert.doesNotMatch(reset.body,/Conflicting local draft/);
});

test('shutdown drains autosaves and leaves no delayed writer after closing',async t=>{
  const f=await fixture(t),peerClient=await peer(f,f.owner.cookie);
  peerClient.text.insert(peerClient.text.length,'\nThe final edit before closing.');
  await eventually(()=>[...f.app.collaboration.rooms.values()][0].shared.toString().includes('final edit'));
  await f.app.close();peerClient.socket.terminate();peerClient.doc.destroy();
  const project=f.app.db.data.projects[f.project.id];assert.match(await readFile(join(project.root,'.CyDocBuild/manual/en/overview.md'),'utf8'),/final edit/);
  await rm(join(f.directory,'collaboration'),{recursive:true,force:true,maxRetries:5,retryDelay:50});
  await new Promise(resolve=>setTimeout(resolve,600));
  await assert.rejects(stat(join(f.directory,'collaboration')),error=>error.code==='ENOENT');
  await assert.rejects(readFile(join(f.directory,'server.lock')),error=>error.code==='ENOENT');
});
