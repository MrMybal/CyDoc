import * as Y from 'yjs';
import { applyTheme, themes } from './appearance.mjs';
import { bindEditor } from './editor.mjs';
import { t, locale as uiLocale, setLocale } from './i18n.mjs';

const app = document.querySelector('#app'), dialog = document.querySelector('#dialog');
const icons = {
  book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Z"/><path d="M12 5v15"/>',
  page: '<path d="M6 3h8l4 4v14H6Z"/><path d="M14 3v5h4M9 12h6M9 16h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', chevron: '<path d="m9 5 7 7-7 7"/>', menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  media: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1"/><path d="m3 17 5-5 4 4 3-3 6 5"/>',
  git: '<circle cx="6" cy="5" r="2"/><circle cx="18" cy="7" r="2"/><circle cx="6" cy="19" r="2"/><path d="M6 7v10M18 9c0 5-12 1-12 8"/>',
  team: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2c0-5 12-5 12 0v2M16 5c5 0 5 6 0 6M18 15c3 0 4 2 4 5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m10 2-1 3-3 1-3-1-2 4 2 3-1 3 3 3 3-1 3 2 4-1 1-3 3-1 2-4-2-3-3-1-1-3Z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 22v-3c0-6 16-6 16 0v3"/>',
  preview: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  publish: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>', undo: '<path d="M4 10h10c9 0 7 10 1 10M4 10l5-5M4 10l5 5"/>', redo: '<path d="M20 10H10c-9 0-7 10-1 10M20 10l-5-5M20 10l-5 5"/>',
  link: '<path d="m10 14 4-4M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 8l2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.page}</svg>`;
const e = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const button = (id, key, symbol, extra = '') => `<button type="button" data-action="${id}" title="${e(t(key))}" aria-label="${e(t(key))}" ${extra}>${symbol ? icon(symbol) : e(t(key))}</button>`;
const field = (name, key, value = '', type = 'text', extra = '') => `<label>${e(t(key))}<input name="${name}" type="${type}" value="${e(value)}" ${extra}></label>`;
const preferences = () => `<div class="auth-preferences"><select data-preference="language" aria-label="${e(t('language'))}"><option value="en" ${uiLocale === 'en' ? 'selected' : ''}>English</option><option value="fr" ${uiLocale === 'fr' ? 'selected' : ''}>Français</option></select><select data-preference="theme" aria-label="${e(t('theme'))}">${themes.map(theme=>`<option value="${theme.id}" ${document.documentElement.dataset.theme===theme.id?'selected':''}>${e(theme[uiLocale])}</option>`).join('')}</select></div>`;
const brand = () => `<div class="brand"><span class="brand-mark">${icon('book')}</span><div><strong>CyDoc <span style="font-weight:400">Studio</span></strong><small>${e(t('studio'))}</small></div></div>`;
const navButton = (id, key, symbol) => `<button type="button" data-action="${id}" title="${e(t(key))}">${icon(symbol)}<span>${e(t(key))}</span></button>`;
let user, projects = [], project, page, contentLocale = 'en', editor, socket, connection = '', sourceMode = false, pageSearch = '', collapsed = new Set(), pageGeneration = 0, saveTimer, reconnectTimer;
let invitation = new URLSearchParams(location.hash.slice(1)).get('invite') || '';
let setupCode = new URLSearchParams(location.hash.slice(1)).get('setup') || '';
let nativeFolder;
let desktopLocal=false;
function readRoute(){const match=location.hash.match(/^#\/project\/([a-f0-9]{32})\/(en|fr)\/([a-z0-9][a-z0-9-]*)$/);return match?{project:match[1],locale:match[2],page:match[3]}:undefined;}
let initialRoute=readRoute();
const writingPositions=new Map();let navigationScroll=0;
function savePositions(){const writing=document.querySelector('.writing');if(writing?.dataset.positionKey)writingPositions.set(writing.dataset.positionKey,writing.scrollTop);const tree=document.querySelector('.tree');if(tree)navigationScroll=tree.scrollTop;}
if (invitation || setupCode) history.replaceState(null, '', location.pathname);
applyTheme(localStorage.getItem('cydoc-studio-theme') || 'dark'); setLocale(uiLocale);
async function api(path, input, method = 'GET') {
  const response = await fetch(`/api/${path}`, { method, headers: input instanceof File ? {} : { 'Content-Type': 'application/json' }, body: input === undefined ? undefined : input instanceof File ? input : JSON.stringify(input) });
  const value = await response.json(); if (!response.ok) throw new Error(value.error || `HTTP ${response.status}`); return value;
}
function notice(value, error = false) { const node = document.querySelector('#notification'); node.textContent = value; node.className = `show${error ? ' error' : ''}`; clearTimeout(node.timer); node.timer = setTimeout(() => node.className = '', error ? 10000 : 4500); }
function state(key) { connection = key; const node = document.querySelector('#save-state'); if (node) node.textContent = t(key); }
function modal(title, contents, { wide = false } = {}) {
  dialog.className = wide ? 'modal-wide' : ''; dialog.innerHTML = `<div class="row" style="margin-bottom:20px"><h2 class="grow" style="margin:0">${e(title)}</h2>${button('close-dialog', 'close', 'close', 'class="icon"')}</div>${contents}<p class="error" id="modal-error" role="alert"></p>`;
  if (!dialog.open) dialog.showModal();
}
async function run(fn) { try { await fn(); } catch (error) { const target = dialog.open && dialog.querySelector('#modal-error'); if (target) target.textContent = error.message; else notice(error.message, true); } }
function localeOptions() { return `<option value="en" ${contentLocale === 'en' ? 'selected' : ''}>English</option><option value="fr" ${contentLocale === 'fr' ? 'selected' : ''}>Français</option>`; }
function openDocumentation() { modal(t('documentation'), `<iframe class="preview-frame" title="${e(t('documentation'))}" src="/help/Documentation.html#/${uiLocale}/overview"></iframe>`, {wide:true}); }
async function auth(mode) {
  disconnect(); const bootstrap = await api('bootstrap');
  if (bootstrap.mode === 'local') { invitation = ''; user = await api('me'); return loadProjects(); }
  mode ||= bootstrap.needsSetup ? 'setup' : invitation ? 'register' : 'login';
  app.innerHTML = `<main class="auth"><section class="auth-card">${brand()}<h1>${e(t(mode === 'login' ? 'signIn' : mode))}</h1><form id="auth-form" class="stack">${mode !== 'login' ? field('name', 'name', '', 'text', 'required autocomplete="name"') : ''}${field('email', 'email', '', 'email', 'required autocomplete="username"')}${field('password', 'password', '', 'password', `required minlength="12" maxlength="256" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}"`)}${mode !== 'login' ? field('code', 'code', mode === 'setup' ? setupCode : invitation, 'password', 'required') : ''}<p id="auth-error" class="error" role="alert"></p><button class="primary" type="submit">${e(t('submit'))}</button></form><button class="switch" data-action="auth-switch" data-mode="${mode === 'login' ? 'register' : 'login'}">${e(t(mode === 'login' ? 'inviteInstead' : 'loginInstead'))}</button>${preferences()}</section></main>`;
  document.querySelector('#auth-form').onsubmit = event => { event.preventDefault(); run(async () => {
    const input = Object.fromEntries(new FormData(event.currentTarget));
    try { user = await api(mode, input, 'POST'); invitation = ''; await loadProjects(); }
    catch (error) { document.querySelector('#auth-error').textContent = error.message; }
  }); };
}
async function loadProjects() {
  projects = await api('projects'); project = undefined; page = undefined; disconnect(); renderShell();
  if (invitation) { await api('accept-invitation', { code: invitation }, 'POST'); invitation = ''; projects = await api('projects'); renderShell(); notice(t('accepted')); }
  if(nativeFolder){await newProject();document.querySelector('#create-project').elements.path.value=nativeFolder.path;document.querySelector('#create-project').elements.name.value=nativeFolder.name;nativeFolder=undefined;}
  if(initialRoute){const route=initialRoute;initialRoute=undefined;if(projects.some(item=>item.id===route.project)){contentLocale=route.locale;await openProject(route.project,route.page);}}
}
function renderShell() {
  savePositions();
  app.innerHTML = `<div class="studio"><aside class="sidebar">${brand()}<div class="project-select"><select id="project-select" aria-label="${e(t('projects'))}"><option value="">${e(t('projects'))}</option>${projects.map(item => `<option value="${item.id}" ${project?.id === item.id ? 'selected' : ''}>${e(item.name)}</option>`).join('')}</select></div><div class="nav-search"><input id="page-search" type="search" placeholder="${e(t('search'))}" aria-label="${e(t('searchContent'))}" value="${e(pageSearch)}"></div><div class="nav-heading"><span>${e(t('pages'))}</span>${button('new-page', 'addPage', 'plus', `class="icon" ${!project || project.role === 'viewer' ? 'disabled' : ''}`)}</div><nav class="tree" aria-label="${e(t('pages'))}"></nav><div class="side-bottom">${navButton('projects', 'projects', 'book')}${navButton('new-project', 'newProject', 'plus')}${navButton('media', 'media', 'media')}${navButton('git', 'git', 'git')}${user.local ? '' : navButton('team', 'team', 'team')}${navButton('settings', 'settings', 'settings')}${navButton('account', user.local ? 'workspacePreferences' : 'account', user.local ? 'settings' : 'user')}</div></aside><main class="main"><header class="topbar">${button('mobile-menu', 'pages', 'menu', 'class="icon mobile-menu"')}<div class="breadcrumb grow"><span>${e(project?.name || 'CyDoc Studio')}</span>${page ? ` &nbsp; / &nbsp; <strong>${e(page.title)}</strong>` : ''}</div><div class="presence"></div><span class="save-state" id="save-state">${e(connection ? t(connection) : '')}</span>${project ? `<select id="content-locale" style="width:110px" aria-label="${e(t('translation'))}">${localeOptions()}</select>${button('preview', 'preview', 'preview', 'class="icon"')}${button('publish', 'publish', 'publish', `class="primary" ${project.role !== 'owner' ? 'disabled' : ''}`)}` : ''}${button('studio-documentation', 'documentation', 'book', 'class="icon"')}${button('account', user.local ? 'workspacePreferences' : 'account', user.local ? 'settings' : 'user', 'class="icon"')}</header><div id="main-content" class="grow" style="min-height:0;display:flex;flex-direction:column"></div></main></div>`;
  renderTree();
  document.querySelector('#project-select').onchange = event => event.target.value && run(() => openProject(event.target.value));
  document.querySelector('#page-search').oninput = event => { pageSearch = event.target.value; renderTree(); };
  document.querySelector('#content-locale')?.addEventListener('change', event => { contentLocale = event.target.value; if (page) run(() => openPage(page.id)); else renderTree(); });
  if (!project) {
    document.querySelector('#main-content').innerHTML = `<div class="welcome"><span class="pill">CyDoc Studio</span><h1 style="margin-top:18px">${e(t('projects'))}</h1><p class="muted">${e(t('newProjectHelp'))}</p><div class="row">${button('new-project', 'newProject', undefined, 'class="primary"')}${button('example-project', 'exampleProject')}</div><p class="muted small">${e(t('exampleHelp'))}</p><div class="project-grid">${projects.map(item => `<button class="project-card" data-action="open-project" data-id="${item.id}"><strong>${e(item.name)}</strong><span class="pill">${e(t(item.role))}</span> <span class="muted small">${item.git ? 'Git' : e(t('noGit'))}</span></button>`).join('')}</div></div>`;
  }
}
function renderTree() {
  const target = document.querySelector('.tree'); if (!target || !project) return;
  const previousScroll=target.scrollTop||navigationScroll;
  const rows = project.pages.filter(item => item.locale === contentLocale), query = pageSearch.toLocaleLowerCase();
  const visible = query ? rows.filter(item => `${item.title} ${item.description} ${item.body}`.toLocaleLowerCase().includes(query)) : rows;
  function itemHtml(item, depth = 0, ancestors = new Set()) {
    if (ancestors.has(item.id)) return ''; const next = new Set([...ancestors, item.id]);
    const children = rows.filter(child => child.parent === item.id), expanded = !collapsed.has(item.id);
    const original = project.pages.find(row => row.id === item.id && row.locale === 'en');
    const stale = !item.body.trim() || contentLocale === 'fr' && (!item.sourceRevision || original?.revision && item.sourceRevision !== original.revision);
    return `<div class="tree-item ${page?.id === item.id ? 'selected' : ''}" style="padding-left:${depth * 15}px">${children.length && !query ? `<button class="icon fold" data-action="fold" data-id="${item.id}" aria-expanded="${expanded}" title="${e(item.title)}" style="transform:rotate(${expanded ? 90 : 0}deg)">${icon('chevron')}</button>` : '<span style="width:22px;flex-shrink:0"></span>'}<button class="page" data-action="page" data-id="${item.id}" title="${e(item.title + (item.description ? '\n' + item.description : ''))}">${icon('page')}<span>${e(item.title)}</span>${stale ? `<i class="dot" title="${e(t('outdated'))}"></i>` : ''}</button></div>${!query && expanded ? children.map(child => itemHtml(child, depth + 1, next)).join('') : ''}`;
  }
  const sections = [...new Set(visible.filter(item => query || !item.parent).map(item => item.section))];
  target.innerHTML = sections.map(section => `<div class="tree-section">${e(section)}</div>${visible.filter(item => item.section === section && (query || !item.parent)).map(item => itemHtml(item)).join('')}`).join('');
  target.scrollTop=previousScroll;target.onscroll=()=>{navigationScroll=target.scrollTop;};
}
async function openProject(id,requestedPage) {
  disconnect(); project = await api(`projects/${id}`); page = undefined; pageSearch = ''; renderShell();
  const home = project.pages.find(row => row.locale === contentLocale && row.id === (requestedPage||project.config.homePage)) || project.pages.find(row => row.locale === contentLocale);
  if (home) await openPage(home.id);
}
function disconnect() { savePositions();const previousWriting=document.querySelector('.writing');if(previousWriting)delete previousWriting.dataset.positionKey;pageGeneration++; clearTimeout(reconnectTimer); clearTimeout(saveTimer); if (socket) { socket.onclose = null; socket.close(); socket = null; } editor?.destroy(); editor = null; }
async function openPage(id) {
  disconnect(); const generation=pageGeneration, projectId=project.id;
  const loadedProject=await api(`projects/${projectId}`);if(generation!==pageGeneration)return;
  const loadedPage=await api(`projects/${projectId}/pages/${contentLocale}/${id}`);if(generation!==pageGeneration)return;
  project=loadedProject;page=loadedPage;const writable = project.role !== 'viewer';
  const route=`#/project/${project.id}/${contentLocale}/${id}`;if(location.hash!==route)history.pushState(null,'',route);
  renderShell(); const original = project.pages.find(row => row.id === id && row.locale === 'en');
  const parentOptions = project.pages.filter(row => row.locale === contentLocale && row.id !== id).map(row => `<option value="${row.id}" ${page.parent === row.id ? 'selected' : ''}>${e(row.title)}</option>`).join('');
  const tool = (command, key, label) => `<button type="button" class="icon" data-command="${command}" title="${e(t(key))}" aria-label="${e(t(key))}">${label}</button>`;
  document.querySelector('#main-content').innerHTML = `<div class="toolbar">${button('undo', 'undo', 'undo', 'class="icon"')}${button('redo', 'redo', 'redo', 'class="icon"')}<span class="separator"></span>${tool('h2','title','H₂')}${tool('bold','bold','<b>B</b>')}${tool('italic','italic','<i>I</i>')}${tool('bullet','bullet','≡')}${tool('ordered','ordered','1.')}${tool('quote','quote','❞')}${tool('code','codeBlock','&lt;/&gt;')}${tool('link','link',icon('link'))}${tool('table','table','▦')}<span class="separator"></span>${button('insert-block', 'insert', 'plus', 'class="icon"')}<div class="modes"><button data-action="mode-visual" class="${!sourceMode ? 'active' : ''}">${e(t('visual'))}</button><button data-action="mode-source" class="${sourceMode ? 'active' : ''}">${e(t('source'))}</button></div></div><div class="workspace"><section class="writing"><div class="document-heading"><div class="eyebrow">${e(page.section)}</div><h1>${e(page.title)}</h1><p>${e(page.description)}</p></div><div id="visual"></div><div id="source" hidden></div></section><aside class="properties"><h3>${e(t('properties'))}</h3><div class="id">${e(t('stableId'))}<br><strong>${e(page.id)}</strong></div><form id="properties-form">${field('title','title',page.title)}<label>${e(t('description'))}<textarea name="description" rows="3">${e(page.description)}</textarea></label>${field('section','section',page.section)}<label>${e(t('parent'))}<select name="parent"><option value="">${e(t('noParent'))}</option>${parentOptions}</select></label>${field('order','order',page.order || 0,'number')}<h3 style="margin-top:25px">${e(t('translation'))}</h3><div class="status">${e(translationLabel(page))}</div>${contentLocale === 'fr' ? `<label class="check"><input type="checkbox" name="translationReviewed">${e(t('reviewed'))}</label>` : ''}<button class="primary" style="width:100%;font-size:12px" ${writable ? '' : 'disabled'}>${e(t('saveProperties'))}</button></form><div class="stack" style="margin-top:25px">${button('history','history')}${button('archive','archive',undefined,`class="danger" ${project.role === 'owner' ? '' : 'disabled'}`)}</div></aside></div>`;
  const draftKey = `cydoc-draft:${user.id}:${project.id}:${contentLocale}:${id}`;
  editor = bindEditor({ visual: document.querySelector('#visual'), source: document.querySelector('#source'), body: page.body, writable, assetBase: `/api/projects/${project.id}/`, labels: { placeholder: t('empty'), configuration: t('blockSettings'), code: t('codeBlock') }, onChange: (update, value) => {
    try { localStorage.setItem(draftKey, JSON.stringify({ update: encode(Y.encodeStateAsUpdate(editor.doc)), epoch:editor.doc.getMap('system').get('epoch'), body:value, at: Date.now() })); } catch { /* Browser storage can be unavailable; the UI still shows unsaved state. */ }
    state('saving');document.querySelector('[data-action="preview"]').disabled=!value.trim(); if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'update', update: encode(update) }));
  } });
  editor.setMode(sourceMode ? 'source' : 'visual');
  document.querySelector('.writing').dataset.positionKey=`${project.id}/${contentLocale}/${id}`;
  document.querySelector('[data-action="preview"]').disabled=!page.body.trim();
  document.querySelectorAll('[data-command]').forEach(node=>node.disabled=sourceMode||!writable);
  document.querySelector('.writing').inert = true;
  if (!writable) document.querySelectorAll('[data-command], [data-action="insert-block"]').forEach(node => node.disabled = true);
  state('connecting');
  function connect() {
    socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/collaboration?${new URLSearchParams({ project: project.id, locale: contentLocale, page: id })}`);
    socket.onmessage = event => run(async () => {
      if (pageGeneration !== generation) return;
      const value = JSON.parse(event.data);
      if (value.type === 'init') {
        editor.initialize(decode(value.update)); page = value.page;
        const draft = localStorage.getItem(draftKey);
        if (draft && writable) { try { const saved = JSON.parse(draft); if(saved.epoch===editor.doc.getMap('system').get('epoch'))editor.initialize(decode(saved.update));else notice(t('draftConflict'),true); } catch { /* A corrupt local draft must not replace server content. */ } }
        if (writable) socket.send(JSON.stringify({ type: 'update', update: encode(Y.encodeStateAsUpdate(editor.doc)) }));
        document.querySelector('.writing').inert = false;
        requestAnimationFrame(()=>{if(pageGeneration===generation)document.querySelector('.writing').scrollTop=writingPositions.get(`${project.id}/${contentLocale}/${id}`)||0;});
        state(writable ? 'saved' : 'readOnly');
      }
      if (value.type === 'update') { editor.apply(decode(value.update)); if (writable) state('saving'); }
      if (value.type === 'saved') { page.revisionToken = value.revisionToken; page.revision = value.revision; page.sourceRevision=value.sourceRevision; page.body = editor.shared.toString(); updatePageInProject(page);document.querySelector('.properties .status').textContent=translationLabel(page); if (value.vector === encode(Y.encodeStateVector(editor.doc))) { localStorage.removeItem(draftKey); state(writable ? 'saved' : 'readOnly'); } }
      if(value.type==='original-revision'){const original=project.pages.find(row=>row.id===value.id&&row.locale==='en');if(original)original.revision=value.revision;renderTree();document.querySelector('.properties .status').textContent=translationLabel(page);}
      if (value.type === 'metadata') { page = value.page; updatePageInProject(page); }
      if (value.type === 'error') { state('disconnected'); modal(t('unsavedWarning'),`<p class="error">${e(value.message)}</p><div class="actions">${button('download-draft','downloadDraft')}${button('reload-external','reloadExternal',undefined,project.role==='owner'?'':'disabled')}</div>`); }
      if (value.type === 'presence' && !user.local) document.querySelector('.presence').innerHTML = [...new Map(value.users.map(person => [person.id, person])).values()].slice(0, 5).map(person => `<span class="avatar" title="${e(person.name)}">${e(person.name.slice(0, 2).toUpperCase())}</span>`).join('');
    });
    socket.onclose = event => { if (generation !== pageGeneration) return; state('disconnected'); if(event.code!==1008&&event.code!==1011)reconnectTimer = setTimeout(connect, 2000); };
  }
  connect();
  document.querySelector('#properties-form').onsubmit = event => { event.preventDefault(); run(async () => {
    const input = Object.fromEntries(new FormData(event.currentTarget)); input.translationReviewed = input.translationReviewed === 'on';
    const current = await api(`projects/${project.id}/pages/${contentLocale}/${id}`);
    page = await api(`projects/${project.id}/pages/${contentLocale}/${id}`, { ...input, revisionToken: current.revisionToken }, 'PATCH');
    updatePageInProject(page); document.querySelector('.properties .status').textContent=translationLabel(page);document.querySelector('.document-heading h1').textContent = page.title; document.querySelector('.document-heading p').textContent = page.description; notice(t('saved'));
  }); };
}
function updatePageInProject(value) { const index = project.pages.findIndex(row => row.id === value.id && row.locale === value.locale); if (index >= 0) project.pages[index] = value; renderTree(); }
function translationLabel(row){const original=project?.pages.find(item=>item.id===row.id&&item.locale==='en');return !row.body.trim()?t('draft'):row.locale==='en'||row.sourceRevision&&(original?.revision?row.sourceRevision===original.revision:true)?t('current'):t('outdated');}
function encode(bytes) { let value = ''; for (let i = 0; i < bytes.length; i += 32768) value += String.fromCharCode(...bytes.subarray(i, i + 32768)); return btoa(value); }
function decode(value) { return Uint8Array.from(atob(value), char => char.charCodeAt(0)); }
async function newProject() {
  modal(t('newProject'), `<p class="muted small">${e(t('newProjectHelp'))}</p><form id="create-project" class="stack">${field('name','projectName','','text','required')}${field('path','folder')}${field('remote','remote')}${field('gitUsername','gitUsername')}${field('gitToken','gitToken','','password','autocomplete="off"')}<label class="check"><input type="checkbox" name="git">${e(t('useGit'))}</label><div class="actions"><button class="primary">${e(t('create'))}</button></div></form>`);
  document.querySelector('#create-project').onsubmit = event => { event.preventDefault(); run(async () => { const input = Object.fromEntries(new FormData(event.currentTarget)); input.git = !!input.git; const created = await api('projects',input,'POST'); projects = await api('projects'); dialog.close(); await openProject(created.id); }); };
}
async function newPage() {
  if (!project) return;
  modal(t('addPage'), `<form id="create-page" class="stack">${field('id','stableId','','text','required pattern="[a-z0-9][a-z0-9-]*"')}${field('en','englishTitle','','text','required')}${field('fr','frenchTitle','','text','required')}<label>${e(t('parent'))}<select name="parent"><option value="">${e(t('noParent'))}</option>${project.pages.filter(row => row.locale === 'en').map(row => `<option value="${row.id}">${e(row.title)}</option>`).join('')}</select></label><div class="actions"><button class="primary">${e(t('create'))}</button></div></form>`);
  document.querySelector('#create-page').onsubmit = event => { event.preventDefault(); run(async () => { const input = Object.fromEntries(new FormData(event.currentTarget)); await api(`projects/${project.id}/pages`, { id: input.id, titles: { en: input.en, fr: input.fr }, parent: input.parent }, 'POST'); project = await api(`projects/${project.id}`); dialog.close(); await openPage(input.id); }); };
}
const templates = {
  image: { id: 'screenshot', src: 'assets/screenshot.png', alt: '', controls: 'minimal' }, video: { id: 'walkthrough', src: 'assets/walkthrough.webm', title: '', controls: 'minimal', annotations: [] }, gif: { id: 'animation', src: 'assets/animation.gif', title: '', controls: 'minimal', autoplay: true }, mesh: { id: 'model', src: 'assets/model.glb', title: '', controls: 'minimal' }, gallery: { id: 'gallery', controls: 'minimal', items: [] }, graph: { id: 'graph', nodes: [], links: [] }, diagram: { type: 'flow', title: '', nodes: [{ id: 'start', label: '', x: 0, y: 0 }], edges: [] }, callout: { type: 'tip', title: '', body: '' }, steps: { items: [{ title: '', body: '' }] }, details: { title: '', body: '' }, tabs: { items: [{ label: 'C++', lang: 'cpp', code: '' }] }, diff: { lang: 'cpp', before: '', after: '' }, glossary: { items: [{ term: '', definition: '' }] }
};
function insertBlock() {
  if (!editor) return;
  modal(t('insert'), `<form id="insert-block-form" class="stack"><label>${e(t('blockType'))}<select name="type">${Object.keys(templates).map(type => `<option>${type}</option>`).join('')}</select></label><label>${e(t('json'))}<textarea name="json" rows="14" spellcheck="false">${e(JSON.stringify(templates.image,null,2))}</textarea></label><div class="actions"><button class="primary">${e(t('insertBlock'))}</button></div></form>`);
  const form = document.querySelector('#insert-block-form'); form.elements.type.onchange = () => form.elements.json.value = JSON.stringify(templates[form.elements.type.value], null, 2);
  form.onsubmit = event => { event.preventDefault(); run(async () => { const type = form.elements.type.value; const value = JSON.parse(form.elements.json.value); if (['image','video','gallery','gif','mesh','graph'].includes(type) && !project.config.modules.includes(type)) throw new Error(`${t('modules')}: ${type}`); editor.insert(`\n\n\`\`\`${type}\n${JSON.stringify(value,null,2)}\n\`\`\`\n\n`); dialog.close(); }); };
}
async function media() {
  if (!project) return;
  const assets = await api(`projects/${project.id}/assets`);
  modal(t('media'), `<label>${e(t('upload'))}<input id="asset-upload" type="file" accept="image/*,video/*,.glb,.gltf,.bin,.ktx2"></label><div>${assets.map(asset => `<div class="asset">${/\.(png|jpe?g|webp|avif|gif|svg)$/i.test(asset.name) ? `<img loading="lazy" src="/api/projects/${project.id}/assets/${asset.name.split('/').map(encodeURIComponent).join('/')}" alt="">` : icon('media')}<div class="filename">${e(asset.name)}<div class="muted small">${(asset.size/1024).toFixed(1)} KiB</div></div><button data-action="insert-asset" data-name="${e(asset.name)}" ${!editor || project.role === 'viewer' ? 'disabled' : ''}>${e(t('insertAsset'))}</button></div>`).join('')}</div>`);
  document.querySelector('#asset-upload').onchange = event => run(async () => { const file = event.target.files[0]; if (file) { await api(`projects/${project.id}/assets?name=${encodeURIComponent(file.name)}`, file, 'POST'); await media(); } });
}
async function settings() {
  if (!project) return;
  const config = project.config;
  modal(t('settings'), `<form id="settings-form" class="stack">${field('name','projectName',config.name)}${field('version','version',config.version)}${field('homePage','homePage',config.homePage)}${field('logo','logo',config.logo)}<label>${e(t('modules'))}</label><div class="checkboxes">${['image','video','gallery','gif','mesh','graph'].map(name => `<label class="check"><input type="checkbox" name="module" value="${name}" ${config.modules.includes(name) ? 'checked' : ''}>${name}</label>`).join('')}</div><div class="actions"><button class="primary" ${project.role === 'owner' ? '' : 'disabled'}>${e(t('save'))}</button></div></form>`);
  document.querySelector('#settings-form').onsubmit = event => { event.preventDefault(); run(async () => { const data = new FormData(event.currentTarget); project.config = await api(`projects/${project.id}/settings`, { ...Object.fromEntries(data), modules: data.getAll('module') },'PATCH'); dialog.close(); notice(t('saved')); }); };
}
async function team() {
  if (!project) return;
  const members = await api(`projects/${project.id}/members`);
  modal(t('team'), `<div>${members.map(member => `<div class="asset"><div class="grow"><strong>${e(member.name)}</strong><div class="muted small">${e(member.email)} · ${e(t(member.role))}</div></div>${member.role !== 'owner' ? `<button class="danger" data-action="remove-member" data-id="${member.id}">${e(t('remove'))}</button>` : ''}</div>`).join('')}</div><form id="invite-form" class="stack" style="margin-top:24px">${field('email','email','','email','required')}<label>${e(t('role'))}<select name="role"><option value="editor">${e(t('editor'))}</option><option value="viewer">${e(t('viewer'))}</option></select></label><button class="primary">${e(t('invite'))}</button></form>`);
  document.querySelector('#invite-form').onsubmit = event => { event.preventDefault(); run(async () => { const result = await api(`projects/${project.id}/members`,Object.fromEntries(new FormData(event.currentTarget)),'POST'); modal(t('invite'), `<p>${e(t('invitation'))}</p><textarea readonly rows="3">${e(result.invitationUrl)}</textarea>`); }); };
}
async function gitPanel() {
  if (!project) return;
  const status = await api(`projects/${project.id}/git`);
  if (!status.enabled) return modal('Git', `<p>${e(t('noGit'))}</p>${button('enable-git','enableGit',undefined,`class="primary" ${project.role !== 'owner' ? 'disabled' : ''}`)}`);
  modal('Git', `<div class="row"><span class="pill">${e(t('branch'))}: ${e(status.branch)}</span>${button('refresh-git','refresh')}</div><h3 style="margin-top:20px">${e(t('changes'))}</h3><pre>${e(status.changes.map(item => `${item.status} ${item.file}`).join('\n') || '—')}</pre><div class="popover-actions">${button('git-diff','diff')}${button('git-history','gitHistory')}${button('git-fetch','fetch')}${button('git-pull','pull')}${button('git-push','push')}</div><form id="commit-form" class="stack" style="margin-top:24px">${field('message','commitMessage','','text','required')}${field('name','authorName',user.name,'text','required')}${field('email','authorEmail','','email','required')}<button class="primary" ${project.role === 'owner' ? '' : 'disabled'}>${e(t('commit'))}</button></form>${!status.remotes.length ? `<form id="remote-form" class="stack" style="margin-top:24px">${field('url','remoteUrl','','url','required')}<button>${e(t('addRemote'))}</button></form>` : ''}`);
  dialog.querySelector('#modal-error').insertAdjacentHTML('beforebegin', `<form id="branch-form" class="stack" style="margin-top:24px">${field('branch','branch','','text','required')}<div class="row"><button name="mode" value="branch">${e(t('newBranch'))}</button><button name="mode" value="switch">${e(t('switchBranch'))}</button></div></form>`);
  document.querySelector('#branch-form').onsubmit=event=>{event.preventDefault();run(async()=>{const selected=page?.id,mode=event.submitter.value,input=Object.fromEntries(new FormData(event.currentTarget));disconnect();try{await api(`projects/${project.id}/git/${mode}`,input,'POST');}finally{if(selected)await openPage(selected);}await gitPanel();});};
  dialog.querySelector('#modal-error').insertAdjacentHTML('beforebegin', `<form id="git-credentials" class="stack" style="margin-top:24px"><p class="muted small">${e(t('credentialsHelp'))}</p>${field('username','gitUsername','','text','required')}${field('token','gitToken','','password','required autocomplete="off"')}<button>${e(t('gitCredentials'))}</button></form>`);
  document.querySelector('#git-credentials').onsubmit = event => { event.preventDefault(); run(async () => { await api(`projects/${project.id}/git/credentials`, Object.fromEntries(new FormData(event.currentTarget)), 'POST'); event.target.reset(); notice(t('saved')); }); };
  document.querySelector('#commit-form').onsubmit = event => { event.preventDefault(); run(async () => { await api(`projects/${project.id}/git/commit`,Object.fromEntries(new FormData(event.currentTarget)),'POST'); await gitPanel(); }); };
  document.querySelector('#remote-form')?.addEventListener('submit', event => { event.preventDefault(); run(async () => { await api(`projects/${project.id}/git/remote`,Object.fromEntries(new FormData(event.currentTarget)),'POST'); await gitPanel(); }); });
}
function account() {
  if (user.local) return modal(t('workspacePreferences'), `<p>${e(t('localWorkspaceHelp'))}</p>${preferences()}`);
  modal(t('account'), `<p><strong>${e(user.name)}</strong><br><span class="muted">${e(user.email)}</span></p>${preferences()}<div class="stack" style="margin-top:24px">${button('create-token','token')}${button('revoke-tokens','deleteToken')}${invitation ? button('accept-invitation','accept') : ''}${button('logout','logout',undefined,'class="danger"')}</div>`);
}
async function action(name, node) {
  if (name === 'close-dialog') return dialog.close();
  if (name === 'mobile-menu') return document.querySelector('.studio').classList.toggle('nav-open');
  if (name === 'auth-switch') return auth(node.dataset.mode);
  if (name === 'projects') {history.pushState(null,'',location.pathname);return loadProjects();}
  if (name === 'new-project') return newProject();
  if (name === 'open-project') return openProject(node.dataset.id);
  if (name === 'new-page') return newPage();
  if (name === 'page') return openPage(node.dataset.id);
  if (name === 'fold') { collapsed.has(node.dataset.id) ? collapsed.delete(node.dataset.id) : collapsed.add(node.dataset.id); return renderTree(); }
  if (name === 'undo') return editor?.undo.undo(); if (name === 'redo') return editor?.undo.redo();
  if (name.startsWith('mode-')) { sourceMode = name === 'mode-source'; editor?.setMode(sourceMode ? 'source' : 'visual');document.querySelectorAll('[data-command]').forEach(node=>node.disabled=sourceMode||project.role==='viewer'); document.querySelectorAll('.modes button').forEach(item => item.classList.toggle('active', item.dataset.action === name)); return; }
  if (name === 'insert-block') return insertBlock(); if (name === 'media') return media(); if (name === 'settings') return settings(); if (name === 'team') return team(); if (name === 'git' || name === 'refresh-git') return gitPanel(); if (name === 'account') return account();
  if (name === 'studio-documentation') return openDocumentation();
  if (name === 'preview' && page) { await api(`projects/${project.id}/pages/${contentLocale}/${page.id}`); return modal(t('preview'), `<iframe class="preview-frame" title="${e(t('preview'))}" src="/preview/?${new URLSearchParams({project:project.id,page:page.id,locale:contentLocale})}"></iframe>`,{wide:true}); }
  if (name === 'publish' && project) { const result = await api(`projects/${project.id}/publish`,{},'POST'); modal(t('publishSuccess'), `<p>${e(result.entry)}</p><div class="stack">${button('open-reader','openReader')}${desktopLocal?button('reveal-output','openOutput'):globalThis.cyuiNative?`<input readonly value="${e(location.origin+'/api/projects/'+project.id+'/download')}">`:`<a href="/api/projects/${project.id}/download" download>Documentation.zip</a>`}</div>`); return; }
  if(name==='open-reader'&&project)return modal(t('openReader'),`<iframe class="preview-frame" title="${e(t('openReader'))}" src="/published/${project.id}/Documentation.html#/${contentLocale}/${page?.id||project.config.homePage}"></iframe>`,{wide:true});
  if(name==='reveal-output'&&project&&desktopLocal){globalThis.cyuiNative?.postMessage({protocol:'cyui.web',version:1,type:'open-documentation-folder',payload:{projectId:project.id}});return;}
  if (name === 'insert-asset') { const src = `assets/${node.dataset.name}`, type = /\.gif$/i.test(src) ? 'image' : /\.(mp4|webm|ogv)$/i.test(src) ? 'video' : /\.(glb|gltf)$/i.test(src) ? 'mesh' : 'image'; if (!project.config.modules.includes(type)) throw new Error(`${t('modules')}: ${type}`); editor.insert(`\n\n\`\`\`${type}\n${JSON.stringify({ id: `media-${Date.now()}`, src, controls: 'minimal', ...(type === 'image' ? {alt:node.dataset.name} : {title:node.dataset.name}) },null,2)}\n\`\`\`\n\n`); return dialog.close(); }
  if (name === 'remove-member') { await api(`projects/${project.id}/members`,{userId:node.dataset.id},'DELETE'); return team(); }
  if (name === 'enable-git') { await api(`projects/${project.id}/git/enable`,{},'POST'); project.git=true; return gitPanel(); }
  if (name.startsWith('git-')) { const currentPage = page?.id; if (name==='git-pull') disconnect(); const result = await api(`projects/${project.id}/git/${name.slice(4)}`,{},'POST'); if(result.history!==undefined)return modal(t('gitHistory'),`<pre>${e(result.history||'—')}</pre>`);if (result.diff !== undefined) return modal(t('diff'),`<pre>${e(result.diff || '—')}</pre>`,{wide:true}); if(name==='git-pull'&&currentPage)await openPage(currentPage);await gitPanel(); return; }
  if (name === 'create-token') { const result = await api('tokens',{name:'Local SDK / MCP'},'POST'); return modal(t('token'), `<p>${e(t('tokenNotice'))}</p><textarea readonly rows="3">${e(result.token)}</textarea>`); }
  if (name === 'revoke-tokens') { await api('tokens',{},'DELETE'); return notice(t('saved')); }
  if (name === 'accept-invitation') { await api('accept-invitation',{code:invitation},'POST'); invitation='';dialog.close();return loadProjects(); }
  if (name === 'example-project') { node.disabled=true; try { const created=await api('projects',{name:t('exampleProjectName'),template:'cydoc'},'POST'); projects=await api('projects'); contentLocale=uiLocale; return await openProject(created.id); } finally { if(node.isConnected)node.disabled=false; } }
  if (name === 'logout' && !user.local) { await api('logout',{},'POST');dialog.close();user=undefined;return auth('login'); }
  if (name === 'archive' && page && confirm(t('archiveConfirm'))) { const id=page.id;disconnect();await api(`projects/${project.id}/pages/${contentLocale}/${id}`,{},'DELETE');dialog.close();return openProject(project.id); }
  if (name === 'history' && page) { const result=await api(`projects/${project.id}/history/${contentLocale}/${page.id}`); return modal(t('history'),result.map(item=>`<div class="asset"><span class="grow small">${e(new Date(item.time).toLocaleString(uiLocale))}</span><button data-action="restore" data-id="${e(item.name)}">${e(t('restore'))}</button></div>`).join('')||'—'); }
  if (name === 'restore') { const current = await api(`projects/${project.id}/pages/${contentLocale}/${page.id}`);await api(`projects/${project.id}/history/${contentLocale}/${page.id}`,{name:node.dataset.id,revisionToken:current.revisionToken},'POST');dialog.close();return openPage(page.id); }
  if (name === 'download-draft') { const blob=new Blob([editor?.shared.toString()||''],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${page.id}-${contentLocale}-draft.md`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return; }
  if (name === 'reload-external') { await api(`projects/${project.id}/reload`,{locale:contentLocale,pageId:page.id},'POST');dialog.close();return openPage(page.id); }
}
document.addEventListener('click', event => { const node = event.target.closest('[data-action]'); if (node && !node.disabled) run(() => action(node.dataset.action,node)); const command = event.target.closest('[data-command]')?.dataset.command; if (command && editor && project.role !== 'viewer' && connection !== 'connecting') run(async () => {
  const chain = editor.rich.chain().focus();
  if (command === 'h2') chain.toggleHeading({level:2}).run(); if (command === 'bold') chain.toggleBold().run(); if (command === 'italic') chain.toggleItalic().run(); if (command === 'bullet') chain.toggleBulletList().run(); if (command === 'ordered') chain.toggleOrderedList().run(); if (command === 'quote') chain.toggleBlockquote().run(); if (command === 'code') chain.toggleCodeBlock({language:'cpp'}).run(); if (command === 'table') chain.insertTable({rows:3,cols:3,withHeaderRow:true}).run(); if (command === 'link') { const url = prompt(t('link'),'doc:overview#getting-started'); if (url) chain.setLink({href:url}).run(); }
}); });
document.addEventListener('change', event => { const kind=event.target.dataset.preference;if(!kind)return;run(async()=>{if(kind==='theme'){const theme=applyTheme(event.target.value);globalThis.cyuiNative?.postMessage({protocol:'cyui.web',version:1,type:'appearance',payload:{theme}});}else{setLocale(event.target.value);dialog.close();if(user){if(project){const id=page?.id;renderShell();if(id)await openPage(id);}else renderShell();}else await auth();}}); });
document.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase()==='s'){event.preventDefault();if(project)run(async()=>{await api(`projects/${project.id}`);state('saved');});}if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();document.querySelector('#page-search')?.focus();} });
window.addEventListener('beforeunload', event => { if(connection==='saving'){event.preventDefault();event.returnValue='';} });
window.addEventListener('popstate',()=>{if(!user)return;const route=readRoute();if(!route)return run(()=>loadProjects());if(route.project===project?.id&&route.page===page?.id&&route.locale===contentLocale)return;contentLocale=route.locale;run(()=>openProject(route.project,route.page));});
async function initialize() { try { user=await api('me');await loadProjects(); } catch { await auth(); } }
if (globalThis.cyuiNative?.addEventListener) {
  globalThis.cyuiNative.addEventListener('message', event => {
    const message = event.data;
    if (message?.protocol !== 'cyui.web' || message.version !== 1) return;
    if(message.type==='open-studio-documentation'||message.type==='focus-documentation'){openDocumentation();return;}
    if(message.type==='open-project-folder'&&typeof message.payload?.path==='string'){nativeFolder=message.payload;if(user)run(async()=>{await newProject();document.querySelector('#create-project').elements.path.value=nativeFolder.path;document.querySelector('#create-project').elements.name.value=nativeFolder.name||'';nativeFolder=undefined;});return;}
    if(message.type!=='theme')return;
    const payload = message.payload;
    desktopLocal=payload?.localWorkspace===true;
    if(Number.isFinite(payload?.textScale)&&payload.textScale>=.8&&payload.textScale<=1.5)document.body.style.zoom=String(payload.textScale);
    if (payload?.theme) applyTheme(payload.theme);
    globalThis.cyuiNative?.postMessage({protocol:'cyui.web',version:1,type:'appearance-applied',payload:{theme:document.documentElement.dataset.theme,background:getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()}});
    if (payload?.locale && payload.locale !== uiLocale) {
      setLocale(payload.locale);
      if (user) { const id = page?.id; renderShell(); if (id) run(() => openPage(id)); } else run(() => auth());
    }
  });
  globalThis.cyuiNative.postMessage({protocol:'cyui.web',version:1,type:'editor-ready'});
}
initialize();
