import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareShutdown } from '../web/shutdown.mjs';

test('native close waits for the acknowledged document and outstanding actions, then flushes', async()=>{
  let pending=1,state='saving',clock=0,flushed=false;
  await prepareShutdown({pendingRequests:()=>pending,state:()=>state,hasDocument:()=>true,
    flush:async()=>{assert.equal(state,'saved');assert.equal(pending,0);flushed=true;},
    now:()=>clock,wait:async ms=>{clock+=ms;pending=0;state='saved';}});
  assert.ok(flushed);
});

test('native close refuses an unacknowledged offline draft', async()=>{
  let clock=0;
  await assert.rejects(prepareShutdown({pendingRequests:()=>0,state:()=>'disconnected',hasDocument:()=>true,
    flush:async()=>assert.fail('must not claim a flush'),now:()=>clock,wait:async ms=>{clock+=ms;},timeout:100}),/UnsavedChanges/);
});

test('native close propagates a failed service flush',async()=>{
  await assert.rejects(prepareShutdown({pendingRequests:()=>0,state:()=>'saved',hasDocument:()=>true,flush:async()=>{throw new Error('HTTP 409');}}),/409/);
});

test('native close rejects another edit arriving during the final flush',async()=>{
  let state='saved',clock=0;
  await assert.rejects(prepareShutdown({pendingRequests:()=>0,state:()=>state,hasDocument:()=>true,flush:async()=>{state='saving';},
    now:()=>clock,wait:async ms=>{clock+=ms;},timeout:100}),/UnsavedChanges/);
});

test('native close drains an acknowledgement still being processed after the final flush',async()=>{
  let pending=0;
  await prepareShutdown({pendingRequests:()=>pending,state:()=>'saved',hasDocument:()=>true,
    flush:async()=>{pending=1;},wait:async()=>{pending=0;}});
  assert.equal(pending,0);
});

test('an empty workspace closes without inventing an editable document',async()=>{
  await prepareShutdown({pendingRequests:()=>0,state:()=>'connecting',hasDocument:()=>false,flush:async()=>{}});
});
