import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from '../../node_modules/happy-dom/lib/index.js';
import { arrangeDiagram, diagramPreset, diagramPreview, mountDiagramBuilder } from '../web/diagram-builder.mjs';
import { compileMarkdown } from '../../tools/compiler.mjs';
import { diagramNodeGeometry } from '../../tools/diagrams.mjs';

test('model content follows the page language independently of the Studio interface language',async t=>{
  const window=new Window({settings:{enableJavaScriptEvaluation:false,disableJavaScriptFileLoading:true}});t.after(()=>window.happyDOM.close());
  const host=window.document.createElement('div'),textarea=window.document.createElement('textarea');window.document.body.append(host,textarea);
  textarea.value=JSON.stringify(diagramPreset('flow','en'));
  const builder=mountDiagramBuilder(host,textarea,{locale:'fr',contentLocale:'en'});
  assert.match(host.textContent,/Modèle de schéma/);assert.equal(host.querySelector('[data-node=start]').value,'Start');
  const model=host.querySelector('[data-model]');model.value='sequence';model.dispatchEvent(new window.Event('change',{bubbles:true}));
  assert.equal(JSON.parse(textarea.value).actors[1].label,'Reader');assert.match(host.querySelector('[data-diagram-preview]').textContent,/Read the diagram explanation/);
  host.querySelector('[data-add-node]').click();assert.equal(JSON.parse(textarea.value).actors.at(-1).label,'New participant');builder.destroy();
});

test('long decision labels wrap and automatic placement leaves room for their full shape',()=>{
  const value=diagramPreset('decision','fr');value.nodes.find(node=>node.id==='check').label='Les traductions sont-elles complètes et prêtes pour la publication ?';
  const arranged=arrangeDiagram(value),check=arranged.nodes.find(node=>node.id==='check'),yes=arranged.nodes.find(node=>node.id==='yes');
  const geometry=diagramNodeGeometry(check,arranged.type);
  assert.ok(geometry.lines.length>1);assert.ok(yes.y>check.y+geometry.h);
  const html=diagramPreview(arranged,'wrapped','fr');assert.match(html,/<tspan/);assert.match(html,/Les traductions sont-elles complètes et prêtes pour la publication/);
});

test('diagram presets compile offline in both languages and arrange branches without changing IDs or links',()=>{
  for(const locale of ['en','fr'])for(const model of ['flow','decision','sequence']){
    const config=diagramPreset(model,locale), original=structuredClone(config);
    const output=compileMarkdown('```diagram\n'+JSON.stringify(config)+'\n```',{locale,pageId:'example'});
    assert.match(output.html,/class="diagram-description"/);assert.match(output.html,/aria-describedby="diagram-description-example-0"/);
    assert.doesNotMatch(output.html,/<script|https?:\/\/(?!www.w3.org)/);
    const arranged=arrangeDiagram(config);
    assert.deepEqual(config,original);
    if(config.nodes){assert.deepEqual(arranged.nodes.map(node=>node.id),config.nodes.map(node=>node.id));assert.deepEqual(arranged.edges,config.edges);assert.ok(arranged.nodes.every(node=>Number.isFinite(node.x)&&Number.isFinite(node.y)));}
  }
});

test('the guided form edits stable nodes, descriptions and relations, and retains drafts when changing models',async t=>{
  const window=new Window({settings:{disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:false,enableImageFileLoading:false,enableCSSFileLoading:false}});
  t.after(()=>window.happyDOM.close());
  const host=window.document.createElement('div'),textarea=window.document.createElement('textarea');window.document.body.append(host,textarea);
  textarea.value=JSON.stringify(diagramPreset('flow','fr'));
  let valid;const builder=mountDiagramBuilder(host,textarea,{locale:'fr',onValidity:value=>{valid=value;}});
  const input=(selector,value)=>{const element=host.querySelector(selector);element.value=value;element.dispatchEvent(new window.Event('input',{bubbles:true}));return element;};
  const select=model=>{const element=host.querySelector('[data-model]');element.value=model;element.dispatchEvent(new window.Event('change',{bubbles:true}));};
  assert.equal(valid,true);assert.match(host.textContent,/Modèle de schéma/);
  input('[data-field=title]','Mon parcours');input('[data-field=description]','Comprendre chaque décision.');
  const label=input('[data-node=start]','<img src=x onerror=bad()>');label.focus();input('[data-node=start]','Départ');assert.equal(window.document.activeElement,label);
  assert.equal(host.querySelector('[data-diagram-preview] img'),null);
  assert.equal(JSON.parse(textarea.value).nodes[0].id,'start');
  assert.match(host.querySelector('[data-diagram-preview]').textContent,/Comprendre chaque décision/);
  host.querySelector('[data-add-node]').click();const added=JSON.parse(textarea.value).nodes.at(-1).id;
  host.querySelector('[data-add-edge]').click();assert.ok(JSON.parse(textarea.value).edges.some(edge=>edge.to===added));
  host.querySelector(`[data-remove-node="${added}"]`).click();assert.ok(JSON.parse(textarea.value).edges.every(edge=>edge.from!==added&&edge.to!==added));
  select('decision');assert.equal(JSON.parse(textarea.value).nodes.find(node=>node.id==='check').kind,'decision');
  select('sequence');assert.equal(JSON.parse(textarea.value).actors.length,2);
  select('flow');assert.equal(JSON.parse(textarea.value).title,'Mon parcours');
  assert.equal(builder.valid,true);builder.destroy();assert.equal(host.childElementCount,0);
});

test('advanced JSON reports invalid input and previews valid configurations without activating authored links',async t=>{
  const window=new Window({settings:{disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:false,enableImageFileLoading:false,enableCSSFileLoading:false}});t.after(()=>window.happyDOM.close());
  const host=window.document.createElement('div'),textarea=window.document.createElement('textarea');window.document.body.append(host,textarea);
  textarea.value=JSON.stringify(diagramPreset());let valid;
  const builder=mountDiagramBuilder(host,textarea,{onValidity:value=>{valid=value;}});
  textarea.value='{';textarea.dispatchEvent(new window.Event('input'));
  assert.equal(valid,false);assert.match(host.querySelector('[role=alert]').textContent,/incomplete or invalid/);
  const value=diagramPreset();value.nodes[0].href='javascript:bad()';value.description='<script>bad()</script>';
  textarea.value=JSON.stringify(value);textarea.dispatchEvent(new window.Event('input'));
  assert.equal(valid,true);assert.equal(host.querySelector('[data-diagram-preview] a'),null);assert.equal(host.querySelector('[data-diagram-preview] script'),null);
  assert.equal(JSON.parse(textarea.value).nodes[0].href,'javascript:bad()');
  assert.doesNotMatch(diagramPreview(value,'preview','en'),/<script|href="javascript:/);
  builder.destroy();
});
