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
import { mountTooltips } from '../dist/tooltips.js';

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

test('static diagrams enlarge inside the reader, preserve SVG identity and links, and restore focus on close or navigation', t => {
  const {host,window}=dom(t);
  const route={hash:'#/en/first',href:'file:///manual/Documentation.html#/en/first'};
  Object.defineProperty(globalThis,'location',{configurable:true,value:route});
  const content=compileMarkdown('## Diagram {#diagram}\n\n```diagram\n'+JSON.stringify({type:'flow',title:'Open help',description:'Open the manual from the application.',nodes:[{id:'app',label:'Application',x:0,y:0,link:'doc:first#diagram'},{id:'reader',label:'Reader',x:260,y:0}],edges:[{from:'app',to:'reader',label:'Help'}]})+'\n```',{locale:'en',pageId:'first'});
  const data={schemaVersion:1,name:'Diagram fixture',version:'1',defaultLocale:'en',locales:[{code:'en',label:'English'}],pages:[{id:'first',locale:'en',title:'First',description:'',section:'Guide',order:0,...content},{id:'second',locale:'en',title:'Second',description:'',section:'Guide',order:1,html:'<p>Other page</p>',text:'Other page',headings:[]}]};
  let top=0,nativeCalls=0;Object.defineProperty(window,'scrollY',{configurable:true,get:()=>top});window.scrollTo=options=>{top=options.top;};
  const viewer=mountViewer(host,data),svg=host.querySelector('article svg'),button=host.querySelector('.diagram-expand'),description=svg.getAttribute('aria-describedby');
  svg.requestFullscreen=()=>{nativeCalls++;};top=430;button.click();
  let dialog=host.querySelector('.diagram-dialog');assert.equal(dialog.open,true);assert.equal(dialog.querySelector('svg'),svg);
  assert.equal(dialog.querySelector('svg a').getAttribute('href'),'#/en/first/diagram');
  assert.match(dialog.querySelector('.diagram-description').textContent,/Application → Reader: Help/);
  assert.equal(host.querySelectorAll('.diagram-placeholder').length,1);
  dialog.querySelector('button').click();assert.equal(dialog.open,false);assert.equal(host.querySelector('article svg'),svg);
  assert.equal(svg.getAttribute('aria-describedby'),description);assert.equal(window.document.activeElement,button);assert.equal(top,430);
  button.click();dialog.dispatchEvent(new window.Event('cancel',{cancelable:true}));assert.equal(dialog.open,false);assert.equal(host.querySelector('article svg'),svg);
  button.click();route.hash='#/en/second';window.dispatchEvent(new window.Event('hashchange'));
  assert.equal(host.querySelector('.diagram-dialog'),null);assert.equal(host.querySelector('.diagram-placeholder'),null);assert.equal(nativeCalls,0);viewer.destroy();
});

test('notes and bookmarks survive navigation without persistent storage and stay scoped to the mounted reader', t => {
  const {host,window}=dom(t);
  const route={hash:'#/en/first',href:'file:///manual/Documentation.html#/en/first'};
  Object.defineProperty(globalThis,'location',{configurable:true,value:route});
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem(){throw new Error('Storage denied');},setItem(){throw new Error('Storage denied');}}});
  const data={schemaVersion:1,name:'Session fixture',version:'1',defaultLocale:'en',locales:[{code:'en',label:'English'}],pages:['first','second'].map((id,i)=>({id,locale:'en',title:id,description:'',section:'Guide',order:i,html:'<p>Help</p>',text:'Help',headings:[]}))};
  const viewer=mountViewer(host,data);
  host.querySelector('.personal-notes textarea').value='Keep this draft through navigation';
  host.querySelector('[data-bookmark]').click();assert.match(host.querySelector('.toast').textContent,/this session/);
  route.hash='#/en/second';window.dispatchEvent(new window.Event('hashchange'));
  host.querySelector('[data-personal]').click();
  const personal=host.querySelector('.personal-dialog');
  assert.match(personal.querySelector('.personal-local').textContent,/this session only/);
  assert.ok([...personal.querySelectorAll('a')].some(link=>link.textContent==='first'));
  assert.match(personal.textContent,/Keep this draft through navigation/);
  route.hash='#/en/first';window.dispatchEvent(new window.Event('hashchange'));
  assert.equal(host.querySelector('.personal-notes textarea').value,'Keep this draft through navigation');
  assert.equal(host.querySelector('[data-bookmark]').getAttribute('aria-pressed'),'true');
  viewer.destroy();
  const fresh=mountViewer(host,data);
  assert.equal(host.querySelector('[data-bookmark]').getAttribute('aria-pressed'),'false');
  assert.equal(host.querySelector('.personal-notes textarea').value,'');fresh.destroy();
});

test('page navigation focuses content, reveals collapsed target ancestors and preserves explicit anchors', t => {
  const {host,window}=dom(t);
  const route={hash:'#/en/other',href:'file:///manual/Documentation.html#/en/other'};
  Object.defineProperty(globalThis,'location',{configurable:true,value:route});
  const page=(id,extra={})=>({id,locale:'en',title:id,description:'',section:'Guides / Editor',order:0,html:'<h2 id="target">Target</h2>',text:'Target',headings:[{id:'target',text:'Target',level:2}],...extra});
  const data={schemaVersion:1,name:'Focus fixture',version:'1',defaultLocale:'en',locales:[{code:'en',label:'English'}],pages:[page('guide'),page('child',{parent:'guide',order:1}),page('other',{section:'Other',order:2})]};
  const viewer=mountViewer(host,data);
  for(const branch of host.querySelectorAll('[data-nav-key^="section:/Guides"],[data-nav-key="page:guide"]'))branch.open=false;
  host.querySelector('[data-page=child]').focus();
  route.hash='#/en/child';window.dispatchEvent(new window.Event('hashchange'));
  assert.equal(window.document.activeElement,host.querySelector('main'));
  for(const branch of host.querySelectorAll('[data-nav-key^="section:/Guides"],[data-nav-key="page:guide"]'))assert.equal(branch.open,true);
  assert.equal(host.querySelector('[data-page=child]').getAttribute('aria-current'),'page');
  route.hash='#/en/child/target';window.dispatchEvent(new window.Event('hashchange'));
  assert.equal(window.document.activeElement,host.querySelector('#target'));
  route.hash='#/en/missing';window.dispatchEvent(new window.Event('hashchange'));
  assert.ok(host.querySelector('.not-found'));assert.equal(window.document.activeElement,host.querySelector('main'));
  viewer.destroy();
});

test('all menu dismissal paths synchronize their accessible state and return focus when dismissed', t => {
  const {host,window}=dom(t);
  const route={hash:'#/en/first',href:'file:///manual/Documentation.html#/en/first'};
  Object.defineProperty(globalThis,'location',{configurable:true,value:route});
  const data={schemaVersion:1,name:'Menu fixture',version:'1',defaultLocale:'en',locales:[{code:'en',label:'English'}],pages:['first','second'].map((id,i)=>({id,locale:'en',title:id,description:'',section:'Guide',order:i,html:'<p>Help</p>',text:'Help',headings:[]}))};
  const viewer=mountViewer(host,data);
  let menu=host.querySelector('[data-menu]');menu.click();
  assert.equal(menu.getAttribute('aria-expanded'),'true');host.querySelector('[data-dismiss-menu]').click();
  assert.equal(menu.getAttribute('aria-expanded'),'false');assert.equal(window.document.activeElement,menu);
  menu.click();window.document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(menu.getAttribute('aria-expanded'),'false');assert.equal(host.classList.contains('menu-open'),false);
  menu.click();route.hash='#/en/second';window.dispatchEvent(new window.Event('hashchange'));
  menu=host.querySelector('[data-menu]');assert.equal(menu.getAttribute('aria-expanded'),'false');assert.equal(host.classList.contains('menu-open'),false);
  viewer.destroy();
});

test('mobile page tools, reading mode and reading resume remain available with bilingual section links', t => {
  const {host,window}=dom(t);
  const route={hash:'#/en/first',href:'file:///manual/Documentation.html#/en/first'};
  Object.defineProperty(globalThis,'location',{configurable:true,value:route});
  window.localStorage.setItem('cydoc:reading:Page tools fixture',JSON.stringify({positions:{'en:first':420}}));
  const data={schemaVersion:1,name:'Page tools fixture',version:'1',defaultLocale:'en',locales:[{code:'en',label:'English'},{code:'fr',label:'Français'}],pages:['en','fr'].map(locale=>({id:'first',locale,title:locale==='fr'?'Première page':'First page',description:'',section:'Guide',order:0,html:'<h2 id="target">Target</h2>',text:'Target',headings:[{id:'target',text:'Target',level:2}]}))};
  const viewer=mountViewer(host,data);
  assert.ok(host.querySelector('.article-header .resume-reading'));
  const mobile=host.querySelector('.mobile-toc');
  assert.equal(mobile.querySelector('a').getAttribute('href'),'#/en/first/target');assert.ok(mobile.querySelector('[data-print]'));
  host.addEventListener('click',event=>{if(event.target.closest('a'))event.preventDefault();});
  mobile.open=true;mobile.querySelector('a').click();assert.equal(mobile.open,false);
  host.querySelector('[data-reading-mode]').click();assert.equal(host.classList.contains('reading-mode'),true);
  assert.equal(window.localStorage.getItem('cydoc:reading-mode'),'true');
  route.hash='#/fr/first';window.dispatchEvent(new window.Event('hashchange'));
  assert.equal(host.querySelector('[data-reading-mode]').getAttribute('aria-pressed'),'true');
  assert.equal(host.querySelector('[data-reading-mode]').getAttribute('aria-label'),'Mode lecture');
  assert.equal(host.querySelector('.mobile-toc a').getAttribute('href'),'#/fr/first/target');
  host.querySelector('[data-menu]').click();assert.equal(host.classList.contains('reading-mode'),false);
  assert.equal(host.querySelector('[data-reading-mode]').getAttribute('aria-pressed'),'false');
  viewer.destroy();assert.equal(host.classList.contains('reading-mode'),false);
});

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

test('graph reading leaves scrolling free and exploration enables keyboard pan, zoom and deliberate Escape',t=>{
  const {host,context,window}=dom(t);const cleanup=graphModule.mount(host,{nodes:[{id:'a',title:'A',x:0,y:0}]},context);
  const stage=host.querySelector('.media-stage'),world=host.querySelector('.graph-world'),button=host.querySelector('[data-graph=explore]');
  const wheel=options=>{const event=new window.WheelEvent('wheel',{deltaY:120,bubbles:true,cancelable:true});if(options?.ctrlKey)Object.defineProperty(event,'ctrlKey',{value:true});stage.dispatchEvent(event);return event;};
  const before=world.style.transform;assert.equal(wheel().defaultPrevented,false);assert.equal(world.style.transform,before);
  const readingArrow=new window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true});stage.dispatchEvent(readingArrow);assert.equal(readingArrow.defaultPrevented,false);
  button.click();assert.equal(button.getAttribute('aria-pressed'),'true');assert.equal(window.document.activeElement,stage);
  stage.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));assert.notEqual(world.style.transform,before);
  assert.equal(wheel().defaultPrevented,true);assert.equal(wheel({ctrlKey:true}).defaultPrevented,false);
  const zoom=host.querySelector('output').textContent;stage.dispatchEvent(new window.KeyboardEvent('keydown',{key:'+',bubbles:true,cancelable:true}));assert.notEqual(host.querySelector('output').textContent,zoom);
  let escapes=0;window.document.addEventListener('keydown',event=>{if(event.key==='Escape')escapes++;});
  stage.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(escapes,0);assert.equal(button.getAttribute('aria-pressed'),'false');assert.equal(window.document.activeElement,button);assert.equal(wheel().defaultPrevented,false);cleanup();
});

test('graph text view exposes ports and relationships, filters safely and locates a selected node',t=>{
  const {host,context,window}=dom(t);const cleanup=graphModule.mount(host,{nodes:[{id:'a',title:'Départ <script>',description:'Première étape',x:0,y:0,outputs:[{id:'exec',label:'',type:'exec'}]},{id:'b',title:'Ouvrir',description:'Deuxième étape',x:500,y:0,inputs:[{id:'exec',label:'',type:'exec'}],href:'#/fr/help'}],links:[{from:['a','exec'],to:['b','exec']}]},context);
  const details=host.querySelector('.graph-text-view');assert.equal(details.querySelectorAll('li').length,0);details.open=true;details.dispatchEvent(new window.Event('toggle'));
  assert.match(details.textContent,/Exécution → Ouvrir/);assert.match(details.textContent,/Première étape/);assert.equal(details.querySelector('script'),null);
  const input=details.querySelector('input');input.value='deuxieme';input.dispatchEvent(new window.Event('input'));assert.equal(details.querySelectorAll('[data-locate-node]').length,1);
  details.querySelector('[data-locate-node=b]').click();assert.equal(host.querySelector('[data-node=b]').getAttribute('aria-pressed'),'true');assert.equal(window.document.activeElement,host.querySelector('[data-node=b]'));
  assert.equal(details.querySelector('a').getAttribute('href'),'#/fr/help');assert.equal(details.querySelector('input'),input);cleanup();
});

test('page breadcrumbs expose translated ancestors and authored previous/next links override global order',t=>{
  const {host}=dom(t);Object.defineProperty(globalThis,'location',{configurable:true,value:{hash:'#/fr/task',href:'file:///manual/Documentation.html#/fr/task'}});
  const pages=['home','parent','unrelated','task','finish'].map((id,i)=>({id,locale:'fr',title:{home:'Accueil',parent:'Apprendre',task:'Exercice',finish:'Terminer'}[id]||'Autre',description:'',section:'Guides',order:i,html:id==='finish'?'<h2 id="done">Fin</h2>':'<p>Guide</p>',text:'Guide',headings:id==='finish'?[{id:'done',text:'Fin',level:2}]:[]}));
  Object.assign(pages[3],{parent:'parent',previous:'',next:'finish#done'});
  const viewer=mountViewer(host,{schemaVersion:1,name:'Parcours',version:'1',defaultLocale:'fr',locales:[{code:'fr',label:'Français'}],pages},{homePage:'home'});
  assert.deepEqual([...host.querySelectorAll('.page-breadcrumb a')].map(a=>a.textContent),['Accueil','Apprendre']);assert.equal(host.querySelector('.page-breadcrumb [aria-current=page]').textContent,'Exercice');
  assert.equal(host.querySelector('.pagination-previous'),null);assert.equal(host.querySelector('.pagination-next').getAttribute('href'),'#/fr/finish/done');assert.equal(host.querySelector('.page-pagination').getAttribute('aria-label'),'Suite du parcours');viewer.destroy();
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
  // Navigation reveals the current target even when its branch was previously closed.
  assert.equal(host.querySelectorAll('.nav-group')[1].open,true);
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


test('header search finds terms and API symbols, filters results and keeps typing focus', t => {
  const {host,window}=dom(t);
  const data={schemaVersion:1,name:'Search fixture',version:'1',defaultLocale:'fr',locales:[{code:'fr',label:'Français'}],pages:[
    {id:'home',locale:'fr',title:'Accueil',description:'',section:'Guide',order:0,html:'<p>Home</p>',text:'Home',headings:[]},
    {id:'lighting',locale:'fr',title:'Éclairage',description:'PBR configuration',section:'Guide',order:1,html:'<p>PBR</p>',text:'Éclairage PBR',headings:[]},
    {id:'source',locale:'fr',title:'session.hpp',description:'API configuration',section:'API',order:2,html:'<p>Code</p>',text:'Header configure();',kind:'api',languages:['cpp'],source:'src/session.cpp:1',headings:[]}
  ]};
  const viewer=mountViewer(host,data,{homePage:'home'});
  const input=host.querySelector('[data-header-search]'),dialog=host.querySelector('.search-dialog');
  assert.ok(input.closest('.topbar'));input.focus();
  const query=value=>{input.value=value;input.dispatchEvent(new window.Event('input',{bubbles:true}));};
  query('eclairage');
  assert.equal(dialog.open,true);assert.ok(dialog.classList.contains('search-popover'));
  assert.equal(window.document.activeElement,input);assert.equal(input.getAttribute('aria-expanded'),'true');
  assert.equal(host.querySelectorAll('.search-result').length,1);assert.equal(host.querySelector('.search-result').getAttribute('href'),'#/fr/lighting');
  query('configure');host.querySelector('[data-search-kind]').value='api';host.querySelector('[data-search-language]').value='cpp';
  host.querySelector('[data-search-language]').dispatchEvent(new window.Event('change',{bubbles:true}));
  assert.equal(host.querySelector('.search-result').getAttribute('href'),'#/fr/source');
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

test('search presents safe highlighted sections and recovers from filters without losing the query or focus', t => {
  const {host,window}=dom(t);
  const content=compileMarkdown('## Dépanner {#repair}\n\nLe panneau noir se ferme. <script>texte</script>',{locale:'fr',pageId:'guide'});
  const data={schemaVersion:1,name:'Section search',version:'1',defaultLocale:'fr',locales:[{code:'fr',label:'Français'}],pages:[{id:'guide',locale:'fr',title:'Aide du lecteur',description:'',section:'Guides',order:0,...content}]};
  const viewer=mountViewer(host,data);
  const input=host.querySelector('[data-header-search]'),kind=host.querySelector('[data-search-kind]'),status=host.querySelector('.search-caption');
  const query=value=>{input.value=value;input.dispatchEvent(new window.Event('input',{bubbles:true}));};
  input.focus();query('panneau');
  assert.equal(host.querySelector('.search-result').getAttribute('href'),'#/fr/guide/repair');
  assert.match(host.querySelector('.search-result-section').textContent,/Dépanner/);assert.equal(host.querySelector('.search-result mark').textContent,'panneau');
  assert.equal(status.textContent,'1 résultat');
  kind.value='api';kind.dispatchEvent(new window.Event('change',{bubbles:true}));
  assert.ok(host.querySelector('.search-empty'));host.querySelector('.search-empty [data-reset-search-filters]').click();
  assert.equal(kind.value,'');assert.equal(input.value,'panneau');assert.equal(window.document.activeElement,input);assert.ok(host.querySelector('.search-result'));
  assert.equal(host.querySelector('.search-caption'),status);
  query('<script>');assert.equal(host.querySelector('.search-result script'),null);assert.match(host.querySelector('.search-result').textContent,/<script>/);
  query('zz-no-match');host.querySelector('[data-clear-search]').click();assert.equal(input.value,'');assert.equal(window.document.activeElement,input);assert.match(status.textContent,/Pour commencer/);
  host.querySelector('[data-bookmark]').focus();assert.equal(host.querySelector('.search-dialog').open,false);assert.equal(input.hasAttribute('aria-activedescendant'),false);
  viewer.destroy();
});

test('search announces capped results and retains explicit filters across page navigation', t => {
  const {host,window}=dom(t);
  const route={hash:'#/en/page-0',href:'file:///manual/Documentation.html#/en/page-0'};Object.defineProperty(globalThis,'location',{configurable:true,value:route});
  const data={schemaVersion:1,name:'Many results',version:'1',defaultLocale:'en',locales:[{code:'en',label:'English'}],pages:Array.from({length:35},(_,i)=>({id:`page-${i}`,locale:'en',title:`Page ${i}`,description:'Common help',section:'Guides',order:i,kind:'api',languages:['cpp'],html:'<p>Common help</p>',text:'Common help',headings:[]}))};
  const viewer=mountViewer(host,data),input=host.querySelector('[data-header-search]');input.focus();input.value='common';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  assert.equal(host.querySelectorAll('.search-result').length,30);assert.match(host.querySelector('.search-caption').textContent,/More than 30 results/);
  const kind=host.querySelector('[data-search-kind]');kind.value='api';kind.dispatchEvent(new window.Event('change',{bubbles:true}));
  route.hash='#/en/page-1';window.dispatchEvent(new window.Event('hashchange'));
  assert.equal(host.querySelector('[data-search-kind]').value,'api');
  host.querySelector('[data-header-search]').focus();assert.equal(host.querySelector('.search-filters [data-reset-search-filters]').hidden,false);
  viewer.destroy();
});

test('nested page navigation preserves routes, opens active ancestors and exposes keyboard disclosures', t => {
  const {host,window}=dom(t);
  const data={schemaVersion:1,name:'Tree fixture',version:'1',defaultLocale:'en',locales:[{code:'en',label:'English'}],pages:[
    {id:'guide',locale:'en',title:'Workspace',description:'',section:'Guides / Editor',order:0,html:'<p>Example help.</p>',text:'Example help.',headings:[]},
    {id:'install',parent:'guide',locale:'en',title:'Install',description:'',section:'Other',order:1,html:'<p>Example help.</p>',text:'Example help.',headings:[]},
    {id:'cpp-source',locale:'en',title:'doc.hpp',description:'',section:'Source files',kind:'source',source:'include/editor/doc.hpp:1',order:2,html:'<p>Example help.</p>',text:'Example help.',headings:[]}
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


test('application branding retains its full name and version, falls back gracefully and keeps personal tools in the header', t => {
  const {host,window}=dom(t);
  const data={schemaVersion:1,name:'Example App',version:'1',defaultLocale:'en',locales:[{code:'en',label:'English'}],pages:[{id:'home',locale:'en',title:'Home',description:'',section:'Guides',order:0,html:'<p>Example content.</p>',text:'Example content.',headings:[]}]};
  let viewer=mountViewer(host,data);
  assert.ok(host.querySelector('.brand-mark > .icon'));
  assert.equal(host.querySelector('.sidebar [data-personal]'),null);
  const personal=host.querySelector('.topbar [data-personal]');assert.ok(personal.querySelector('svg'));assert.equal(personal.textContent,'');assert.match(personal.getAttribute('aria-label'),/bookmarks and notes/);
  personal.click();assert.equal(host.querySelector('.personal-dialog').open,true);
  assert.doesNotMatch(host.querySelector('.footer').textContent,/MIT/);
  viewer.destroy();
  const name='CyTools_MeshStudio <Preview> & Tools';
  viewer=mountViewer(host,{...data,name,version:'0.1.3',logo:'assets/app-logo.svg'});
  const brand=host.querySelector('.brand');
  assert.equal(brand.querySelector('.brand-name').textContent,name);
  assert.equal(brand.querySelector('.brand-name').childElementCount,0);
  assert.equal(brand.querySelector('.brand-meta .brand-version').textContent,'v0.1.3');
  assert.equal(brand.getAttribute('aria-label'),`${name} — Documentation, v0.1.3`);
  brand.focus();
  const tooltip=host.querySelector('.reader-tooltip');
  assert.equal(tooltip.hidden,false);
  assert.equal(tooltip.querySelector('.reader-tooltip-title').textContent,name);
  assert.equal(tooltip.querySelector('.reader-tooltip-description').textContent,'v0.1.3');
  assert.equal(brand.getAttribute('aria-describedby'),tooltip.id);
  const logo=host.querySelector('.brand-logo');assert.equal(logo.getAttribute('src'),'assets/app-logo.svg');assert.equal(logo.getAttribute('alt'),'');assert.ok(host.querySelector('.brand-mark.has-logo'));
  logo.dispatchEvent(new window.Event('error'));
  assert.equal(host.querySelector('.brand-logo'),null);assert.equal(host.querySelector('.brand-mark.has-logo'),null);assert.equal(host.querySelector('.brand-fallback').hidden,false);assert.ok(host.querySelector('.brand-fallback .icon'));
  viewer.destroy();
});


test('reader assets resolve from DocData while routes and authored paths remain stable', t => {
  const {host}=dom(t);
  const compiled=compileMarkdown('![Example](assets/image.svg)\n\n```video\n{"src":"assets/movie.webm"}\n```\n\n[Section](doc:home#details)\n\n## Details {#details}',{locale:'en',pageId:'home'});
  const data={schemaVersion:1,name:'Example',logo:'assets/logo.svg',version:'1',defaultLocale:'en',locales:[{code:'en',label:'English'}],pages:[{id:'home',locale:'en',title:'Home',description:'',section:'Guides',order:0,...compiled}]};
  const viewer=mountViewer(host,data,{assetBase:'DocData/'});
  assert.equal(host.querySelector('.brand-logo').getAttribute('src'),'DocData/assets/logo.svg');
  assert.equal(host.querySelector('article img').getAttribute('src'),'DocData/assets/image.svg');
  assert.equal(host.querySelector('[data-cydoc-module] a').getAttribute('href'),'DocData/assets/movie.webm');
  assert.equal(host.querySelector('article > p > a').getAttribute('href'),'#/en/home/details');
  assert.equal(JSON.parse(host.querySelector('[data-cydoc-module=video]').dataset.config).src,'assets/movie.webm');
  assert.equal(data.logo,'assets/logo.svg');assert.match(data.pages[0].html,/src="assets\/image.svg"/);
  viewer.destroy();
});

test('the human reader withholds partial languages and normalizes their deep links without mixing languages', t => {
  const {host,window}=dom(t);
  const page=(id,locale,title)=>({id,locale,title,description:'',section:'Guide',order:0,html:`<h2 id="details">${title}</h2>`,text:title,headings:[{id:'details',text:title,level:2}]});
  const data={schemaVersion:1,name:'Example',version:'1',defaultLocale:'fr',locales:[{code:'fr',label:'Français'},{code:'en',label:'English'}],pages:[page('start','fr','Démarrer'),page('settings','fr','Paramètres'),page('start','en','Get started')]};
  window.history.replaceState(null,'','#/en/settings/details?media=demo');
  let viewer=mountViewer(host,data);
  assert.equal(host.querySelector('.locale-control'),null);
  assert.equal(window.document.documentElement.lang,'fr');
  assert.equal(window.location.hash,'#/fr/settings/details?media=demo');
  assert.match(host.querySelector('main').textContent,/Paramètres/);
  assert.doesNotMatch(host.textContent,/Translation unavailable|Traduction indisponible/);
  assert.deepEqual(viewer.availableLocales().map(locale=>locale.code),['fr']);
  viewer.destroy();
  data.pages.push(page('settings','en','Settings'));
  viewer=mountViewer(host,data);
  assert.deepEqual([...host.querySelectorAll('.locale-control option')].map(option=>option.value),['fr','en']);
  viewer.destroy();
});

test('media display URLs use the asset provider without changing annotation or binary asset identities', async t => {
  const {host,context}=dom(t);
  context.assetUrl=src=>`DocData/${src.replace(/^\.\//,'')}`;
  const image=host.ownerDocument.createElement('div');host.append(image);
  imageModule.mount(image,{src:'assets/a.svg',compare:'./assets/b.svg'},context);
  assert.deepEqual([...image.querySelectorAll('.image-layer img')].map(img=>img.getAttribute('src')),['DocData/assets/a.svg','DocData/assets/b.svg']);
  const video=host.ownerDocument.createElement('div');host.append(video);
  const dispose=videoModule.mount(video,{src:'assets/a.webm',sources:[{src:'assets/a.webm',type:'video/webm'},{src:'assets/a.mp4',type:'video/mp4'}],compare:'assets/b.webm'},context);
  assert.deepEqual([...video.querySelectorAll('source')].map(source=>source.getAttribute('src')),['DocData/assets/a.webm','DocData/assets/a.mp4','DocData/assets/b.webm']);
  const gallery=host.ownerDocument.createElement('div');host.append(gallery);
  let mountedSrc;
  context.loadModule=async()=>({mount(_host,config,child){mountedSrc=config.src;assert.equal(child.assetUrl(config.src),'DocData/assets/a.svg');}});
  const cleanup=galleryModule.mount(gallery,{items:[{type:'image',src:'assets/a.svg'}]},context);await settle();
  assert.equal(gallery.querySelector('img').getAttribute('src'),'DocData/assets/a.svg');assert.equal(mountedSrc,'assets/a.svg');
  let binarySrc;const gif=host.ownerDocument.createElement('div');host.append(gif);
  context.loadAsset=async src=>{binarySrc=src;return {base64:(await readFile('assets/steps-a.gif')).toString('base64')};};
  const gifCleanup=await gifModule.mount(gif,{src:'assets/steps-a.gif',autoplay:false},context);await settle();
  assert.equal(binarySrc,'assets/steps-a.gif');
  cleanup?.();dispose?.();gifCleanup?.();
});

test('fast tooltips show complete text safely outside clipped navigation and preserve existing descriptions', async t => {
  const {host,window,context}=dom(t);
  host.innerHTML='<nav class="side-nav" style="overflow:hidden"><a data-tooltip-title="Very long complete documentation name" data-tooltip-description="Optional description" aria-describedby="existing-help"><span>Very long…</span></a></nav><span id="existing-help">Existing help</span>';
  mountTooltips(host,context.signal,10);
  const link=host.querySelector('a'),tooltip=host.querySelector('[role=tooltip]');
  link.dataset.tooltipTitle='Full <name> & complete path';link.dataset.tooltipDescription='Description <img src=x> is text';
  tooltip.getBoundingClientRect=()=>({width:320,height:90});
  link.getBoundingClientRect=()=>({left:185,right:220,top:200,bottom:234,height:34,width:35});
  Object.defineProperty(window,'innerWidth',{configurable:true,value:540});Object.defineProperty(window,'innerHeight',{configurable:true,value:280});
  link.querySelector('span').dispatchEvent(new window.PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));
  assert.equal(tooltip.hidden,true);
  await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal(tooltip.hidden,false);assert.equal(tooltip.querySelector('strong').textContent,'Full <name> & complete path');
  assert.equal(tooltip.querySelector('.reader-tooltip-description').textContent,'Description <img src=x> is text');assert.equal(tooltip.querySelector('img'),null);
  assert.equal(tooltip.parentElement,host);assert.equal(tooltip.closest('.side-nav'),null);
  assert.equal(tooltip.style.left,'8px');assert.equal(tooltip.style.top,'172px');assert.equal(link.getAttribute('aria-describedby'),`existing-help ${tooltip.id}`);
  link.dispatchEvent(new window.PointerEvent('pointerout',{bubbles:true,relatedTarget:tooltip}));tooltip.dispatchEvent(new window.PointerEvent('pointerenter'));
  await new Promise(resolve=>setTimeout(resolve,120));assert.equal(tooltip.hidden,false);
  tooltip.dispatchEvent(new window.PointerEvent('pointerleave'));
  await new Promise(resolve=>setTimeout(resolve,120));assert.equal(tooltip.hidden,true);assert.equal(link.getAttribute('aria-describedby'),'existing-help');
});

test('tooltip timers cancel on departure, Escape, scroll, resize and disposal', async t => {
  const {host,window,context,abort}=dom(t);
  host.innerHTML='<button role="tab">Full tab label</button><span>Outside</span>';
  mountTooltips(host,context.signal,10);
  const tab=host.querySelector('button'),tooltip=host.querySelector('[role=tooltip]');
  const enter=()=>tab.dispatchEvent(new window.PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));
  const leave=()=>tab.dispatchEvent(new window.PointerEvent('pointerout',{bubbles:true,relatedTarget:host.querySelector('span')}));
  enter();leave();await new Promise(resolve=>setTimeout(resolve,30));assert.equal(tooltip.hidden,true);
  tab.focus();assert.equal(tooltip.hidden,false);assert.equal(tooltip.querySelector('.reader-tooltip-description').hidden,true);
  window.dispatchEvent(new window.Event('scroll'));assert.equal(tooltip.hidden,false);
  window.document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(tooltip.hidden,true);assert.equal(tab.hasAttribute('aria-describedby'),false);
  enter();await new Promise(resolve=>setTimeout(resolve,30));assert.equal(tooltip.hidden,true);
  leave();enter();await new Promise(resolve=>setTimeout(resolve,30));assert.equal(tooltip.hidden,false);
  window.dispatchEvent(new window.Event('resize'));assert.equal(tooltip.hidden,true);
  leave();enter();await new Promise(resolve=>setTimeout(resolve,30));assert.equal(tooltip.hidden,false);
  window.dispatchEvent(new window.Event('hashchange'));assert.equal(tooltip.hidden,true);
  enter();window.dispatchEvent(new window.Event('scroll'));await new Promise(resolve=>setTimeout(resolve,30));assert.equal(tooltip.hidden,true);
  leave();enter();abort.abort();await new Promise(resolve=>setTimeout(resolve,30));assert.equal(host.querySelector('[role=tooltip]'),null);assert.equal(tab.hasAttribute('aria-describedby'),false);
});

test('navigation folders, parent pages, code tabs and gallery tabs expose full names and descriptions', async t => {
  const {host,window,context}=dom(t);
  const content=compileMarkdown('```tabs\n{"items":[{"label":"Complete C++ example title","description":"C++ details","code":"open();","lang":"cpp"},{"label":"Python","code":"open()","lang":"python"}]}\n```',{locale:'en',pageId:'parent'});
  const data={schemaVersion:1,name:'Tooltip fixture',version:'1',defaultLocale:'en',locales:[{code:'en',label:'English'}],pages:[
    {id:'parent',locale:'en',title:'The complete parent title',description:'Parent description',section:'Guides / Workspace',order:0,...content},
    {id:'child',parent:'parent',locale:'en',title:'The complete child title',description:'Child description',section:'Guides',order:1,html:'<p>Example help.</p>',text:'Example help.',headings:[]}
  ]};
  const viewer=mountViewer(host,data,{homePage:'parent'});await settle();
  const tooltip=host.querySelector('.reader-tooltip');
  const folder=host.querySelector('[data-nav-key="section:/Guides/Workspace"] > summary');folder.focus();
  assert.equal(tooltip.hidden,false);assert.equal(tooltip.querySelector('strong').textContent,'Guides / Workspace');
  const parent=host.querySelector('[data-nav-key="page:parent"] > summary');parent.focus();
  assert.equal(tooltip.querySelector('strong').textContent,'The complete parent title');assert.equal(tooltip.querySelector('.reader-tooltip-description').textContent,'Parent description');
  const child=host.querySelector('[data-page=child]');child.focus();assert.equal(child.hasAttribute('title'),false);assert.equal(tooltip.querySelector('strong').textContent,'The complete child title');
  host.querySelector('[data-tabs] [role=tab]').focus();assert.equal(tooltip.querySelector('strong').textContent,'Complete C++ example title');assert.equal(tooltip.querySelector('.reader-tooltip-description').textContent,'C++ details');
  const gallery=window.document.createElement('div');host.querySelector('main').append(gallery);context.loadModule=async()=>({mount(){}});
  const cleanup=galleryModule.mount(gallery,{items:[{type:'image',src:'assets/a.svg',title:'Complete gallery item title',description:'Gallery item details'}]},context);await settle();
  gallery.querySelector('[role=tab]').focus();assert.equal(tooltip.querySelector('strong').textContent,'Complete gallery item title');assert.equal(tooltip.querySelector('.reader-tooltip-description').textContent,'Gallery item details');
  cleanup();viewer.destroy();assert.equal(host.querySelector('.reader-tooltip'),null);
});
