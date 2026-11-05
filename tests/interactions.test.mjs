import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import imageModule from '../dist/modules/image.js';
import videoModule from '../dist/modules/video.js';
import galleryModule from '../dist/modules/gallery.js';
import graphModule from '../dist/modules/graph.js';
import { mountViewer } from '../dist/viewer.js';
import gifModule from '../dist/modules/gif.js';
import { compileMarkdown } from '../tools/compiler.mjs';
import { readFile } from 'node:fs/promises';

function dom(t) {
  // Unit fixtures only. No navigation, script evaluation, resource fetching, or server.
  const window = new Window({ settings: { disableJavaScriptFileLoading: true, enableJavaScriptEvaluation: false, enableImageFileLoading: false, enableCSSFileLoading: false } });
  const bindings = { window, document: window.document, localStorage: window.localStorage, location: window.location, navigator: window.navigator, ResizeObserver: window.ResizeObserver, IntersectionObserver: window.IntersectionObserver, matchMedia: window.matchMedia.bind(window), requestAnimationFrame: window.requestAnimationFrame.bind(window), cancelAnimationFrame: window.cancelAnimationFrame.bind(window) };
  const previous = new Map();
  for (const [name, value] of Object.entries(bindings)) { previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { configurable: true, writable: true, value }); }
  const host = window.document.createElement('div'); window.document.body.append(host);
  const abort = new window.AbortController();
  const context = { locale: 'fr', storageKey: 'unit-test', signal: abort.signal };
  t.after(async () => {
    abort.abort(); await window.happyDOM.abort(); window.close();
    for (const [name, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
  });
  return { window, host, context, abort };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('comparison grab moves on the image, keeps the range in sync, and is keyboard accessible', async t => {
  const { window, host, context } = dom(t);
  imageModule.mount(host, { src: 'assets/a.svg', compare: 'assets/b.svg', alt: 'Compare' }, context);
  const stage = host.querySelector('.media-stage');
  stage.getBoundingClientRect = () => ({ left: 100, top: 0, width: 400, height: 240 });
  const grab = host.querySelector('.compare-grab'); grab.setPointerCapture = () => {};
  grab.dispatchEvent(new window.PointerEvent('pointerdown', { pointerId: 7, clientX: 300, bubbles: true }));
  grab.dispatchEvent(new window.PointerEvent('pointermove', { pointerId: 7, clientX: 420, bubbles: true }));
  assert.equal(host.querySelector('input[type=range]').value, '80');
  assert.equal(grab.getAttribute('aria-valuenow'), '80');
  assert.match(host.querySelector('.image-compare').style.clipPath, /80%/);
  grab.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
  assert.equal(grab.getAttribute('aria-valuenow'), '79');
  grab.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
  assert.equal(host.querySelector('input[type=range]').value, '0');
  const fullscreen = host.querySelector('[data-action=fullscreen]');
  assert.equal(fullscreen.textContent, ''); assert.ok(fullscreen.querySelector('svg')); assert.equal(fullscreen.getAttribute('aria-label'), 'Plein écran');
  host.requestFullscreen = async () => { throw new Error('Native fullscreen unavailable in this fixture'); };
  fullscreen.click(); await settle();
  assert.equal(host.classList.contains('media-expanded'), true);
  assert.equal(fullscreen.getAttribute('aria-label'), 'Quitter le plein écran');
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(host.classList.contains('media-expanded'), false);
  assert.equal(fullscreen.getAttribute('aria-label'), 'Plein écran');
});

test('galleries load only the selected viewer and dispose the previous item', async t => {
  const { host, context } = dom(t);
  const mounts = [], disposals = [], loads = [], signals = [];
  context.loadModule = async kind => { loads.push(kind); return { mount(element, config, child) { mounts.push(config.src); signals.push(child.signal); element.textContent = kind; return () => disposals.push(config.src); } }; };
  const cleanup = galleryModule.mount(host, { items: [{ type: 'image', src: 'assets/a.svg' }, { type: 'video', src: 'assets/b.webm' }, { type: 'mesh', src: 'assets/c.glb' }] }, context);
  await settle(); assert.deepEqual(loads, ['image']);
  host.querySelector('[data-gallery=next]').click(); await settle();
  assert.deepEqual(loads, ['image', 'video']); assert.deepEqual(disposals, ['assets/a.svg']); assert.equal(signals[0].aborted, true);
  assert.equal(host.querySelector('output').textContent, '2 / 3');
  assert.equal(host.querySelectorAll('[role=tab][aria-selected=true]').length, 1);
  cleanup(); assert.equal(signals[1].aborted, true); assert.deepEqual(disposals, ['assets/a.svg', 'assets/b.webm']);
});

test('a delayed gallery module cannot replace a newer selection', async t => {
  const { host, context } = dom(t);
  const mounts = [];
  let finishImage;
  context.loadModule = kind => kind === 'image'
    ? new Promise(resolve => { finishImage = resolve; })
    : Promise.resolve({ mount(element) { mounts.push(kind); element.textContent = kind; } });
  const cleanup = galleryModule.mount(host, { items: [{ type: 'image', src: 'assets/a.svg' }, { type: 'video', src: 'assets/b.webm' }] }, context);
  host.querySelector('[data-gallery=next]').click(); await settle();
  finishImage({ mount() { mounts.push('stale image'); } }); await settle();
  assert.deepEqual(mounts, ['video']);
  assert.equal(host.querySelector('.gallery-content').textContent, 'video');
  cleanup();
});

test('graph selection exposes a documentation link and zoom changes the viewport', t => {
  const { host, context } = dom(t);
  const cleanup = graphModule.mount(host, { nodes: [{ id: 'a', title: 'Event', x: 0, y: 0, outputs: [{ id: 'exec', label: '', type: 'exec' }] }, { id: 'b', title: 'Help', x: 330, y: 0, inputs: [{ id: 'exec', label: '', type: 'exec' }], href: '#/fr/api-cpp/signature' }], links: [{ from: ['a', 'exec'], to: ['b', 'exec'] }] }, context);
  assert.equal(host.querySelectorAll('.graph-node').length, 2); assert.equal(host.querySelectorAll('.graph-wires path').length, 1);
  host.querySelector('[data-node=b]').click();
  assert.equal(host.querySelector('.graph-details a').getAttribute('href'), '#/fr/api-cpp/signature');
  assert.equal(host.querySelector('[data-node=b]').getAttribute('aria-pressed'), 'true');
  const before = host.querySelector('output').textContent; host.querySelector('[data-graph=out]').click();
  assert.notEqual(host.querySelector('output').textContent, before); cleanup();
});

test('video notes are added at the current playback time with no comparison track required', t => {
  const { window, host, context } = dom(t);
  const cleanup = videoModule.mount(host, { src: 'assets/a.webm' }, context);
  const videos = host.querySelectorAll('video'); assert.equal(videos.length, 1); assert.equal(host.querySelector('.compare-grab'), null);
  videos[0].currentTime = 2.5;
  host.querySelector('.annotation-form input').value = 'Observe this detail';
  host.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert.match(host.querySelector('.annotation-list').textContent, /0:02 · Observe this detail/);
  assert.match(host.querySelector('.video-annotations').textContent, /Observe this detail/);
  cleanup();
});

test('all six themes can be selected and persisted through the viewer UI', t => {
  const { host, window } = dom(t);
  const data = { schemaVersion: 1, name: 'Unit', version: '1', defaultLocale: 'fr', locales: [{ code: 'fr', label: 'Français' }], pages: [{ id: 'test', locale: 'fr', title: 'Test', description: '', section: 'Guide', order: 0, html: '<p>Content</p>', text: 'Content', headings: [] }] };
  const viewer = mountViewer(host, data, { homePage: 'test', initialTheme: 'nord' });
  assert.equal(host.dataset.theme, 'nord');
  for (const theme of ['light', 'dark', 'midnight', 'nord', 'paper', 'contrast']) { host.querySelector(`[data-set-theme=${theme}]`).click(); assert.equal(host.dataset.theme, theme); assert.equal(window.localStorage.getItem('cydoc:theme'), theme); }
  viewer.destroy(); assert.equal(host.innerHTML, '');
});

test('image arrows and areas are editable, persistent, and linked with the current view', t => {
  const {host,context,window}=dom(t);let shared;
  context.linkState=state=>{shared=state;};
  imageModule.mount(host,{src:'assets/a.svg',annotations:[{id:'area',type:'rect',x:.2,y:.2,toX:.8,toY:.8,label:'Area'}]},context);
  const stage=host.querySelector('.media-stage');stage.getBoundingClientRect=()=>({left:100,top:20,width:400,height:240});
  Object.defineProperty(stage,'clientWidth',{value:400});Object.defineProperty(stage,'clientHeight',{value:240});
  const pan=host.querySelector('.image-pan');pan.setPointerCapture=()=>{};
  host.querySelector('.image-tool').value='arrow';host.querySelector('.image-note-text').value='Look here';
  pan.dispatchEvent(new window.PointerEvent('pointerdown',{pointerId:1,clientX:150,clientY:70,bubbles:true}));
  pan.dispatchEvent(new window.PointerEvent('pointermove',{pointerId:1,clientX:300,clientY:150,bubbles:true}));
  pan.dispatchEvent(new window.PointerEvent('pointerup',{pointerId:1,clientX:300,clientY:150,bubbles:true}));
  assert.equal(host.querySelectorAll('[data-image-note]').length,2);assert.match(host.querySelector('.image-markup').textContent,/Look here/);
  host.dispatchEvent(new window.CustomEvent('cydoc:state',{detail:{zoom:'2',note:'area'}}));
  host.querySelector('[data-action=permalink]').click();assert.equal(shared.zoom,'2');assert.equal(shared.note,'area');
  assert.equal(JSON.parse(window.localStorage.getItem('cydoc:image-marks:unit-test:assets/a.svg')).length,2);
});

test('video deep links wait for metadata and frame stepping uses the configured rate', t => {
  const {host,context,window}=dom(t);let shared;
  context.state={time:'1.25',note:'intro'};context.linkState=state=>{shared=state;};
  const cleanup=videoModule.mount(host,{src:'assets/a.webm',fps:24,annotations:[{id:'intro',time:1,text:'Intro'}]},context);
  const primary=host.querySelector('video');Object.defineProperty(primary,'duration',{value:10});
  primary.dispatchEvent(new window.Event('loadedmetadata'));assert.equal(primary.currentTime,1.25);
  host.querySelector('[data-action=next-frame]').click();assert.ok(Math.abs(primary.currentTime-(1.25+1/24))<.00001);
  host.querySelector('[data-action=permalink]').click();assert.equal(shared.note,'intro');assert.equal(shared.time,'1.292');cleanup();
});

test('graph and gallery restore targeted nodes and items without loading unrelated readers', async t => {
  const {host,context,window}=dom(t);let shared;
  context.state={node:'b',zoom:'2'};context.linkState=state=>{shared=state;};
  const cleanup=graphModule.mount(host,{nodes:[{id:'a',title:'A',x:0,y:0},{id:'b',title:'B',x:300,y:0}]},context);
  assert.equal(host.querySelector('[data-node=b]').getAttribute('aria-pressed'),'true');host.querySelector('[data-action=permalink]').click();assert.equal(shared.node,'b');assert.equal(shared.zoom,'2');cleanup();
  const loads=[];context.state={item:'1',time:'2'};context.loadModule=async kind=>({mount(element,config,child){loads.push([kind,child.state.time]);element.textContent=kind;}});
  const galleryCleanup=galleryModule.mount(host,{items:[{type:'image',src:'assets/a.svg'},{type:'video',src:'assets/b.webm'}]},context);
  await settle();assert.deepEqual(loads,[['video','2']]);assert.equal(host.querySelector('output').textContent,'2 / 2');galleryCleanup();
});

test('GIF controls seek, step, pause and share frames with a local binary provider', async t => {
  const {host,context,window}=dom(t);let shared;const paints=[];
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'ImageData');
  Object.defineProperty(globalThis,'ImageData',{configurable:true,value:class{constructor(data,width,height){Object.assign(this,{data,width,height});}}});
  t.after(()=>{if(descriptor)Object.defineProperty(globalThis,'ImageData',descriptor);else delete globalThis.ImageData;});
  window.HTMLCanvasElement.prototype.getContext=function(){return{putImageData:image=>paints.push(image.width)};};
  const base64=(await readFile('assets/steps-a.gif')).toString('base64');
  context.loadAsset=async()=>({base64});context.linkState=state=>{shared=state;};context.state={frame:'5'};
  const cleanup=await gifModule.mount(host,{src:'assets/steps-a.gif'},context);await settle();
  assert.match(host.querySelector('output').textContent,/6 \/ 12/);assert.ok(paints.length>0);
  host.querySelector('[data-gif=next]').click();host.querySelector('[data-action=permalink]').click();assert.equal(shared.frame,'6');
  host.querySelector('[data-gif=play]').click();assert.match(host.querySelector('[data-gif=play]').textContent,/Pause/);
  host.querySelector('[data-gif=play]').click();assert.match(host.querySelector('[data-gif=play]').textContent,/Lire/);
  cleanup();assert.equal(host.querySelector('canvas').width,0);
});

test('reader tabs, glossary, bookmarks and note UI work using local widget fixtures', t => {
  const {host,window}=dom(t);
  const content=compileMarkdown('```tabs\n{"items":[{"label":"C++","code":"hello();","lang":"cpp"},{"label":"Python","code":"hello()","lang":"python"}]}\n```\n\n[[PBR]]',{locale:'fr',pageId:'test',glossary:{PBR:'Physical materials'}});
  const data={schemaVersion:1,name:'Reading fixture',version:'1',defaultLocale:'fr',locales:[{code:'fr',label:'Français'}],pages:[{id:'test',locale:'fr',title:'Test',description:'',section:'Guide',order:0,...content}]};
  const viewer=mountViewer(host,data,{homePage:'test'});
  const tabs=host.querySelectorAll('[data-tabs] [role=tab]');tabs[1].dispatchEvent(new window.KeyboardEvent('keydown',{key:'Home',bubbles:true}));assert.equal(tabs[0].getAttribute('aria-selected'),'true');
  tabs[1].click();assert.equal(host.querySelectorAll('[data-tabs] [role=tabpanel]')[1].hidden,false);
  host.querySelector('[data-term]').click();assert.equal(host.querySelector('[role=tooltip]').hidden,false);
  host.querySelector('[data-bookmark]').click();assert.equal(host.querySelector('[data-bookmark]').getAttribute('aria-pressed'),'true');
  host.querySelector('.personal-notes textarea').value='My private note';host.querySelector('[data-save-note]').click();
  const saved=JSON.parse(window.localStorage.getItem('cydoc:reading:Reading fixture'));assert.equal(saved.notes['fr:test'],'My private note');assert.equal(saved.bookmarks.length,1);
  host.querySelector('[data-personal]').click();assert.match(host.querySelector('.personal-dialog').textContent,/My private note/);viewer.destroy();
});
