import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from '../../node_modules/happy-dom/lib/index.js';
import { mountStepsBuilder, stepsTemplate } from '../web/steps-builder.mjs';

function fixture(t,value=stepsTemplate(),locale='fr') {
  const window=new Window({settings:{enableJavaScriptEvaluation:false,disableJavaScriptFileLoading:true}});t.after(()=>window.happyDOM.close());
  const host=window.document.createElement('div'),textarea=window.document.createElement('textarea');window.document.body.append(host,textarea);textarea.value=JSON.stringify(value);
  let valid;const builder=mountStepsBuilder(host,textarea,{locale,onValidity:value=>{valid=value;}});
  const input=(index,key,value)=>{const field=host.querySelector(`[data-step-index="${index}"] [data-step-field="${key}"]`);field.value=value;field.dispatchEvent(new window.Event('input',{bubbles:true}));return field;};
  return {window,host,textarea,builder,input,get valid(){return valid;},read:()=>JSON.parse(textarea.value)};
}

test('guided steps require an action and title, keep focus while typing and keep UI prompts out of authored content',t=>{
  const f=fixture(t);assert.equal(f.valid,false);assert.match(f.host.textContent,/Résultat et dépannage/);
  assert.match(f.host.querySelector('[role=status]').textContent,/Donnez un titre et une action/);assert.equal(f.host.querySelector('[role=status]').className,'muted');
  const field=f.input(0,'title','Open settings');field.focus();f.input(0,'title','Open the settings');assert.equal(f.window.document.activeElement,field);
  f.input(0,'body','Choose **Settings**.');assert.equal(f.valid,true);
  f.input(0,'result','The panel opens.');f.input(0,'troubleshooting','[Read help](doc:troubleshooting#reader).');
  assert.equal(f.read().items[0].title,'Open the settings');assert.doesNotMatch(f.textarea.value,/Décrivez|Résultat|facultatif/);
  f.builder.destroy();assert.equal(f.host.childElementCount,0);
});

test('moving, adding and removing steps preserves complete items and authored identifiers',t=>{
  const original={custom:'keep',items:[{id:'first',title:'First',body:'One',result:'Visible',custom:{value:1}},{id:'second',title:'Second',body:'Two',troubleshooting:'Help'}]};
  const f=fixture(t,original);
  f.host.querySelector('[data-step-index="1"] [data-step-move="-1"]').click();
  assert.deepEqual(f.read().items,[original.items[1],original.items[0]]);assert.equal(f.read().custom,'keep');
  assert.equal(f.window.document.activeElement.value,'Second');
  f.host.querySelector('[data-step-add]').click();assert.equal(f.read().items.length,3);assert.equal(f.valid,false);
  f.input(2,'title','Third');f.input(2,'body','Three');assert.equal(f.valid,true);
  f.host.querySelector('[data-step-index="2"] [data-step-remove]').click();assert.equal(f.read().items.length,2);
  f.host.querySelector('[data-step-index="1"] [data-step-remove]').click();assert.equal(f.read().items[0].id,'second');
  assert.equal(f.host.querySelector('[data-step-remove]').disabled,true);assert.equal(f.host.querySelector('[data-step-move="1"]').disabled,true);
  f.builder.destroy();
});

test('advanced JSON disables stale fields until corrected and never interprets authored HTML',t=>{
  const f=fixture(t,{items:[{title:'First',body:'An action'}]},'en');
  const raw=value=>{f.textarea.value=value;f.textarea.dispatchEvent(new f.window.Event('input'));};
  raw('{');assert.equal(f.valid,false);assert.equal(f.host.querySelector('fieldset').disabled,true);assert.equal(f.textarea.value,'{');assert.equal(f.host.querySelector('[role=status]').className,'error');
  raw(JSON.stringify({items:[{title:'<script>bad()</script>',body:'<img src=x onerror=bad()>',result:'<b>text</b>'}]}));
  assert.equal(f.valid,true);assert.equal(f.host.querySelector('fieldset').disabled,false);assert.equal(f.host.querySelector('script,img,b'),null);
  assert.equal(f.host.querySelector('[data-step-field=result]').value,'<b>text</b>');assert.equal(f.host.querySelector('details').open,true);
  raw('{"items":[]}');assert.equal(f.valid,false);f.host.querySelector('[data-step-add]').click();assert.equal(f.read().items.length,1);
  raw(JSON.stringify({items:Array.from({length:51},()=>({title:'Step',body:'Action'}))}));assert.equal(f.valid,false);
  f.builder.destroy();
});
