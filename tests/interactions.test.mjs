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
import { mediaPresentation, commonStyles, expandButton, watchExpansion } from '../dist/modules/shared.js';
import { captureReadingView, restoreReadingView, restoreScroll } from '../dist/reading-view.js';

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
  const expand = host.querySelector('[data-action=expand]');
  assert.equal(expand.textContent, ''); assert.ok(expand.querySelector('svg')); assert.equal(expand.getAttribute('aria-label'), 'Agrandir dans la fenêtre');
  let nativeCalls = 0;
  host.requestFullscreen = async () => { nativeCalls++; };
  expand.click(); await settle();
  assert.equal(host.classList.contains('media-expanded'), true);
  assert.equal(nativeCalls, 0); assert.ok(host.previousElementSibling.matches('.media-placeholder'));
  assert.equal(expand.getAttribute('aria-label'), 'Réduire');
  assert.equal(expand.getAttribute('aria-expanded'), 'true');
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(host.classList.contains('media-expanded'), false);
  assert.equal(host.previousElementSibling, null);
  assert.equal(expand.getAttribute('aria-label'), 'Agrandir dans la fenêtre');
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


test('page changes preserve the menu, reading positions and selected code tabs; explicit targets still win', t => {
  const { host, window } = dom(t);
  // Inject route input and scroll coordinates into a component fixture, without browser navigation.
  const route = { hash: '#/fr/first', href: '#/fr/first' };
  Object.defineProperty(globalThis, 'location', { configurable: true, value: route });
  let top = 0;
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => top });
  window.scrollTo = options => { top = options.top; };
  const content = compileMarkdown('```tabs\n{"items":[{"label":"C++","code":"hello();"},{"label":"Python","code":"hello()"}]}\n```\n\n## Target {#target}', { locale: 'fr', pageId: 'first' });
  const data = { schemaVersion: 1, name: 'Scroll fixture', version: '1', defaultLocale: 'fr', locales: [{code:'fr',label:'Français'}], pages: [
    { id:'first',locale:'fr',title:'First',description:'',section:'Guides',order:0,...content },
    { id:'second',locale:'fr',title:'Second',description:'',section:'Other',order:1,html:'<p>Second</p>',text:'Second',headings:[] }
  ] };
  const viewer = mountViewer(host, data);
  const input = hash => { route.hash = hash; window.dispatchEvent(new window.Event('hashchange')); };
  host.querySelectorAll('[data-tabs] [role=tab]')[1].click();
  const nav = host.querySelector('.side-nav'); nav.scrollTop = 285;
  host.querySelectorAll('.nav-group')[1].open = false;
  top = 930;
  input('#/fr/second'); assert.equal(top,0);
  assert.equal(host.querySelector('.side-nav').scrollTop,285);
  assert.equal(host.querySelectorAll('.nav-group')[1].open,false);
  top = 470;
  input('#/fr/first'); assert.equal(top,930);
  assert.equal(host.querySelectorAll('[data-tabs] [role=tab]')[1].getAttribute('aria-selected'),'true');
  input('#/fr/first'); assert.equal(top,930);
  host.querySelector('#target').scrollIntoView = () => { top = 1500; };
  input('#/fr/first/target'); assert.equal(top,1500);
  input('#/fr/second'); assert.equal(top,470);
  viewer.destroy();
});

test('reading snapshots restore code scroll and late scroll restoration yields to user input', t => {
  const { host, window, context } = dom(t);
  host.innerHTML = '<main><figure class="cy-media"><details open><summary>Settings</summary></details></figure><details open><summary>More</summary><pre>Code</pre></details></main>';
  host.querySelector('pre').scrollLeft = 130;
  const view = captureReadingView(host);
  assert.equal(view.details.length,1);host.querySelector('figure').remove();
  host.querySelector('details').open = false; host.querySelector('pre').scrollLeft = 0;
  restoreReadingView(host,view);
  assert.equal(host.querySelector('pre').scrollLeft,130); assert.equal(host.querySelector('details').open,true);
  let resize, disconnected = 0, calls = 0;
  Object.defineProperty(globalThis,'ResizeObserver',{configurable:true,value:class { constructor(callback){resize=callback;} observe(){} disconnect(){disconnected++;} }});
  window.scrollTo = () => { calls++; };
  restoreScroll(900,0,host,context.signal);
  assert.equal(calls,1);
  resize(); assert.equal(calls,2);
  window.dispatchEvent(new window.Event('wheel'));
  assert.equal(disconnected,1);
  resize(); assert.equal(calls,2);
});

test('minimal media expose icon controls and keep advanced tools in an accessible settings panel', t => {
  const {host,context} = dom(t);
  imageModule.mount(host,{src:'assets/a.svg',controls:'minimal'},context);
  assert.ok(host.classList.contains('media-minimal'));
  assert.equal(host.querySelector('.media-settings summary').getAttribute('aria-label'),'Réglages du média');
  assert.ok(host.querySelector('.media-settings-panel .image-tool'));
  assert.ok(host.querySelector('.media-toolbar > [data-action=expand]'));
  assert.ok(host.querySelector('.media-settings-panel [data-action=in]'));
  assert.match(commonStyles, /media-minimal:focus-within/);
  assert.match(commonStyles, /pointer:coarse/);
  assert.match(commonStyles, /inset:24px/);
});

test('in-window expansion is exclusive and abort removes the placeholder', t => {
  const {host,context,window,abort} = dom(t);
  const other = window.document.createElement('div'); host.after(other);
  for (const element of [host,other]) {
    element.className='cy-media cy-mesh'; element.innerHTML='<div class="media-toolbar">'+expandButton('en')+'</div><div class="media-stage"></div><form class="annotation-form"><input></form>';
    watchExpansion(element,context.signal); mediaPresentation(element,{controls:'minimal'},context);
  }
  host.querySelector('[data-action=expand]').click();
  other.querySelector('[data-action=expand]').click();
  assert.equal(host.classList.contains('media-expanded'),false);
  assert.equal(other.classList.contains('media-expanded'),true);
  abort.abort();
  assert.equal(window.document.querySelectorAll('.media-placeholder,.media-expanded').length,0);
});

test('selecting the active gallery tab keeps its reader mounted and minimal mode reaches children', async t => {
  const {host,context}=dom(t); let mounts=0;
  context.loadModule=async()=>({mount(element,config){mounts++;assert.equal(config.controls,'minimal');}});
  const cleanup=galleryModule.mount(host,{controls:'minimal',items:[{type:'image',src:'assets/a.svg'}]},context);
  await settle();host.querySelector('[role=tab]').click();await settle();
  assert.equal(mounts,1);cleanup();
});

test('minimal GIF autoplay pauses offscreen, respects manual pause, reduced motion and explicit frames', async t => {
  const {host,context,window}=dom(t);
  const previous=Object.getOwnPropertyDescriptor(globalThis,'ImageData');
  Object.defineProperty(globalThis,'ImageData',{configurable:true,value:class {constructor(data,width,height){Object.assign(this,{data,width,height});}}});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,'ImageData',previous);else delete globalThis.ImageData;});
  Object.defineProperty(window.document,'hidden',{configurable:true,value:false});
  window.HTMLCanvasElement.prototype.getContext=()=>({putImageData(){}});
  const base64=(await readFile('assets/steps-a.gif')).toString('base64');context.loadAsset=async()=>({base64});
  let visibility;
  Object.defineProperty(globalThis,'IntersectionObserver',{configurable:true,value:class {constructor(callback){visibility=callback;}observe(){}disconnect(){}}});
  let cleanup=await gifModule.mount(host,{src:'assets/steps-a.gif',controls:'minimal'},context);await settle();
  assert.match(host.querySelector('[data-gif=play]').textContent,/Pause/);
  visibility([{isIntersecting:false}]);assert.match(host.querySelector('[data-gif=play]').textContent,/Lire/);
  visibility([{isIntersecting:true}]);assert.match(host.querySelector('[data-gif=play]').textContent,/Pause/);
  host.querySelector('[data-gif=play]').click();visibility([{isIntersecting:false}]);visibility([{isIntersecting:true}]);
  assert.match(host.querySelector('[data-gif=play]').textContent,/Lire/);cleanup();
  window.matchMedia=()=>({matches:true});
  cleanup=await gifModule.mount(host,{src:'assets/steps-a.gif',controls:'minimal'},context);await settle();
  assert.match(host.querySelector('[data-gif=play]').textContent,/Lire/);cleanup();
  window.matchMedia=()=>({matches:false});context.state={frame:'0'};
  cleanup=await gifModule.mount(host,{src:'assets/steps-a.gif',controls:'minimal'},context);await settle();
  assert.match(host.querySelector('[data-gif=play]').textContent,/Lire/);cleanup();
});


test('header search finds terms and source lines, filters results and keeps typing focus', t => {
  const {host,window}=dom(t);
  const data={schemaVersion:1,name:'Search fixture',version:'1',defaultLocale:'fr',locales:[{code:'fr',label:'Français'}],pages:[
    {id:'home',locale:'fr',title:'Accueil',description:'',section:'Guide',order:0,html:'<p>Home</p>',text:'Home',headings:[]},
    {id:'lighting',locale:'fr',title:'Éclairage',description:'PBR configuration',section:'Guide',order:1,html:'<p>PBR</p>',text:'Éclairage PBR',headings:[]},
    {id:'source',locale:'fr',title:'session.cpp',description:'Source configuration',section:'Source files',order:2,html:'<p>Code</p>',text:'Header configure();',code:'Header\nconfigure();',kind:'source',languages:['cpp'],source:'src/session.cpp:1',headings:[]}
  ]};
  const viewer=mountViewer(host,data,{homePage:'home'});
  const input=host.querySelector('[data-header-search]'),dialog=host.querySelector('.search-dialog');
  assert.ok(input.closest('.topbar'));input.focus();
  const query=value=>{input.value=value;input.dispatchEvent(new window.Event('input',{bubbles:true}));};
  query('eclairage');
  assert.equal(dialog.open,true);assert.ok(dialog.classList.contains('search-popover'));
  assert.equal(window.document.activeElement,input);assert.equal(input.getAttribute('aria-expanded'),'true');
  assert.equal(host.querySelectorAll('.search-result').length,1);assert.equal(host.querySelector('.search-result').getAttribute('href'),'#/fr/lighting');
  query('configure');host.querySelector('[data-search-kind]').value='source';host.querySelector('[data-search-language]').value='cpp';
  host.querySelector('[data-search-language]').dispatchEvent(new window.Event('change',{bubbles:true}));
  assert.equal(host.querySelector('.search-result').getAttribute('href'),'#/fr/source/L2');
  query('term-with-no-match');assert.ok(host.querySelector('.search-empty'));assert.equal(input.hasAttribute('aria-activedescendant'),false);
  input.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(dialog.open,false);assert.equal(window.document.activeElement,input);
  assert.equal(host.querySelector('.sidebar-bottom,.local-note,.sidebar-foot,.aside-note,.workspace-label'),null);
  assert.ok(host.querySelector('[data-personal]'));viewer.destroy();
});

test('header results support keyboard selection, modal shortcut and deliberate dismissal', async t => {
  const {host,window}=dom(t);
  const data={schemaVersion:1,name:'Keyboard search fixture',version:'1',defaultLocale:'en',locales:[{code:'en',label:'English'}],pages:['first','second'].map((id,i)=>({id,locale:'en',title:id,description:'Workspace help',section:'Guides',order:i,html:'<p>Workspace</p>',text:'Workspace',headings:[]}))};
  const viewer=mountViewer(host,data);
  const input=host.querySelector('[data-header-search]'),dialog=host.querySelector('.search-dialog');
  input.focus();input.value='Workspace';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  let activated;
  host.addEventListener('click',event=>{const result=event.target.closest('.search-result');if(result){event.preventDefault();activated=result.getAttribute('href');}});
  input.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
  assert.equal(host.querySelector('.search-result.selected').getAttribute('href'),'#/en/second');
  input.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  assert.equal(activated,'#/en/second');assert.equal(dialog.open,false);
  window.document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}));
  assert.equal(dialog.open,true);assert.equal(dialog.classList.contains('search-popover'),false);
  assert.equal(window.document.activeElement,host.querySelector('.search-form input'));
  host.querySelector('.search-close').click();await settle();
  assert.equal(dialog.open,false);assert.equal(input.getAttribute('aria-expanded'),'false');
  assert.equal(window.document.activeElement,input);
  input.blur();input.focus();assert.equal(dialog.open,true);
  window.document.body.dispatchEvent(new window.PointerEvent('pointerdown',{bubbles:true}));assert.equal(dialog.open,false);
  viewer.destroy();
});

test('nested page navigation preserves routes, opens active ancestors and exposes keyboard disclosures', t => {
  const {host,window}=dom(t);
  const data={schemaVersion:1,name:'Tree fixture',version:'1',defaultLocale:'en',locales:[{code:'en',label:'English'}],pages:[
    {id:'guide',locale:'en',title:'Workspace',description:'',section:'Guides / Editor',order:0,html:'',text:'',headings:[]},
    {id:'install',parent:'guide',locale:'en',title:'Install',description:'',section:'Other',order:1,html:'',text:'',headings:[]},
    {id:'cpp-source',locale:'en',title:'doc.hpp',description:'',section:'Source files',kind:'source',source:'include/editor/doc.hpp:1',order:2,html:'',text:'',headings:[]}
  ]};
  const viewer=mountViewer(host,data,{homePage:'install'});
  const parent=host.querySelector('[data-nav-key="page:guide"]');
  assert.ok(parent.open);assert.equal(parent.querySelector('[data-page=install]').getAttribute('href'),'#/en/install');
  assert.equal(parent.querySelector('[data-page=install]').getAttribute('aria-current'),'page');
  assert.ok(host.querySelector('[data-nav-key="section:/Guides/Editor"]'));
  assert.ok(host.querySelector('[data-nav-key="section:/Source files/include/editor"] [data-page=cpp-source]'));
  const summary=parent.querySelector('summary');summary.focus();summary.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
  assert.equal(parent.open,false);
  summary.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(parent.open,true);
  summary.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(window.document.activeElement,parent.querySelector('[data-page=install]'));
  viewer.destroy();
});


test('application branding falls back gracefully and personal tools occupy only a header icon', t => {
  const {host,window}=dom(t);
  const data={schemaVersion:1,name:'Example App',version:'1',defaultLocale:'en',locales:[{code:'en',label:'English'}],pages:[{id:'home',locale:'en',title:'Home',description:'',section:'Guides',order:0,html:'<p>Example content.</p>',text:'Example content.',headings:[]}]};
  let viewer=mountViewer(host,data);
  assert.ok(host.querySelector('.brand-mark > .icon'));
  assert.equal(host.querySelector('.sidebar [data-personal]'),null);
  const personal=host.querySelector('.topbar [data-personal]');assert.ok(personal.querySelector('svg'));assert.equal(personal.textContent,'');assert.match(personal.getAttribute('aria-label'),/bookmarks and notes/);
  personal.click();assert.equal(host.querySelector('.personal-dialog').open,true);
  assert.doesNotMatch(host.querySelector('.footer').textContent,/MIT/);
  viewer.destroy();
  viewer=mountViewer(host,{...data,logo:'assets/app-logo.svg'});
  const logo=host.querySelector('.brand-logo');assert.equal(logo.getAttribute('src'),'assets/app-logo.svg');assert.equal(logo.getAttribute('alt'),'');assert.ok(host.querySelector('.brand-mark.has-logo'));
  logo.dispatchEvent(new window.Event('error'));
  assert.equal(host.querySelector('.brand-logo'),null);assert.equal(host.querySelector('.brand-mark.has-logo'),null);assert.equal(host.querySelector('.brand-fallback').hidden,false);assert.ok(host.querySelector('.brand-fallback .icon'));
  viewer.destroy();
});
