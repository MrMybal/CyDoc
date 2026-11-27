import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';
import * as Y from 'yjs';
import { StudioClient } from '../sdk/client.mjs';
import { bodyDigest, acknowledgesSavedState } from '../web/save-ack.mjs';
const { startStudio } = await import(process.env.CYDOC_TEST_STUDIO_DIRECTORY
  ? pathToFileURL(resolve(process.env.CYDOC_TEST_STUDIO_DIRECTORY,'server/server.mjs')).href
  : '../server/server.mjs');

async function bounded(promise) {
  let timer;
  try { return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Save test timed out')),5000);})]); }
  finally { clearTimeout(timer); }
}

const encode = bytes => Buffer.from(bytes).toString('base64');
const snapshot = doc => ({document:doc,vector:encode(Y.encodeStateVector(doc)),body:doc.getText('markdown').toString()});
function message(socket, type) {
  return new Promise((resolve,reject) => {
    const timer=setTimeout(()=>{socket.off('message',receive);reject(new Error('Missing '+type+' message'));},5000);
    function receive(raw) { const value=JSON.parse(raw);if(value.type===type){clearTimeout(timer);socket.off('message',receive);resolve(value);} }
    socket.on('message',receive);
  });
}
async function fixture(t) {
  await mkdir(resolve('.tmp'),{recursive:true});
  const directory=await mkdtemp(resolve('.tmp/save-ack-'));
  const app=await startStudio({directory,port:0,localOnly:true}),sdk=new StudioClient(app.origin);
  t.after(async()=>{await app.close();await rm(directory,{recursive:true,force:true,maxRetries:5,retryDelay:50});});
  const project=await sdk.createProject({name:'Save acknowledgement'});
  const socket=new WebSocket(`${app.origin.replace('http','ws')}/collaboration?project=${project.id}&locale=en&page=overview`,{origin:app.origin});
  const initial=await message(socket,'init'),doc=new Y.Doc();Y.applyUpdate(doc,Buffer.from(initial.update,'base64'));
  t.after(()=>{socket.terminate();doc.destroy();});
  return {app,sdk,project,socket,initial,doc,send:()=>socket.send(JSON.stringify({type:'update',update:encode(Y.encodeStateAsUpdate(doc))}))};
}

test('initial no-op sync is acknowledged without rewriting the document or revision',async t=>{
  const {app,socket,doc,initial,send}=await fixture(t);
  let writes=0;const write=app.workspace.writeBody.bind(app.workspace);
  app.workspace.writeBody=(...args)=>{writes++;return write(...args);};
  const saved=message(socket,'saved');send();const ack=await saved;
  assert.equal(ack.revisionToken,initial.page.revisionToken);assert.equal(writes,0);
  assert.ok(await acknowledgesSavedState(ack,()=>snapshot(doc)));
});

test('a duplicate sync waits for an in-flight disk save before acknowledging it',async t=>{
  const {app,project,socket,doc,send}=await fixture(t);
  const room=await app.collaboration.room(app.db.data.projects[project.id],'en','overview');
  let release,entered;const gate=new Promise(resolve=>release=resolve),writing=new Promise(resolve=>entered=resolve);
  const write=app.workspace.writeBody.bind(app.workspace);
  app.workspace.writeBody=async(...args)=>{entered();await gate;return write(...args);};
  let saving;
  try {
  const changed=new Promise(resolve=>{const listener=()=>{room.doc.off('update',listener);resolve();};room.doc.on('update',listener);});
  doc.getText('markdown').insert(0,'A durable edit.\n');send();await bounded(changed);
  const flush=app.collaboration.flush.bind(app.collaboration);saving=flush(room);await bounded(writing);
  let duplicateSeen;const duplicated=new Promise(resolve=>duplicateSeen=resolve);
  app.collaboration.flush=(...args)=>{duplicateSeen();return flush(...args);};
  const acknowledgements=[];socket.on('message',raw=>{const value=JSON.parse(raw);if(value.type==='saved')acknowledgements.push(value);});
  send();await bounded(duplicated);await delay(30);assert.equal(acknowledgements.length,0);
  const saved=message(socket,'saved');release();await saving;
  assert.ok(await acknowledgesSavedState(await saved,()=>snapshot(doc)));
  } finally { release();await saving?.catch(()=>{}); }
});

test('a deletion rejects an older save even when the Yjs state vector is unchanged',async()=>{
  const doc=new Y.Doc();try{
    doc.getText('markdown').insert(0,'Keep this sentence.');
    const before=snapshot(doc),old={vector:before.vector,bodyHash:await bodyDigest(before.body)};
    doc.getText('markdown').delete(0,5);
    assert.equal(snapshot(doc).vector,before.vector);
    assert.equal(await acknowledgesSavedState(old,()=>snapshot(doc)),false);
    assert.equal(await acknowledgesSavedState({vector:before.vector,bodyHash:await bodyDigest(snapshot(doc).body)},()=>snapshot(doc)),true);
  }finally{doc.destroy();}
});

test('an edit or page change during asynchronous hashing cannot clear its draft',async()=>{
  const document={},other={},ack={vector:'v',bodyHash:'hash'};
  for(const change of [{document,vector:'v',body:'changed'},{document:other,vector:'v',body:'text'}]){
    let current={document,vector:'v',body:'text'};
    assert.equal(await acknowledgesSavedState(ack,()=>current,async()=>{current=change;return 'hash';}),false);
  }
  assert.equal(await acknowledgesSavedState({vector:'v'},()=>({document,vector:'v',body:'text'})),false);
});
