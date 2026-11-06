import { createDocumentation, createLink, parseLink } from './index.js';
import type { Documentation, DocPage, ViewerOptions, DocRoute } from './types.js';
import { mountReaderTools, revealTarget } from './reader-tools.js';
import { captureReadingView, restoreReadingView, restoreScroll } from './reading-view.js';
import { navigationTree, containsPage, type NavigationNode } from './navigation.js';

import { icon } from './icons.js';
import { themes, validTheme } from './themes.js';
const esc = (text: string) => text.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
const storage = {
  get(key: string) { try { return localStorage.getItem(`cydoc:${key}`); } catch { return null; } },
  set(key: string, value: string) { try { localStorage.setItem(`cydoc:${key}`, value); } catch { /* Private WebViews can disable storage. */ } }
};

export function mountViewer(root: HTMLElement, data: Documentation, options: ViewerOptions = {}) {
  const docs = createDocumentation(data);
  root.classList.add('cydoc-viewer');
  const home = options.homePage || (data.pages.some(page => page.id === 'overview') ? 'overview' : data.pages[0]?.id || 'overview');
  const abort = new AbortController();
  const { signal } = abort;
  let pageAbort: AbortController | undefined;
  let observer: IntersectionObserver | undefined;
  let mediaObserver: IntersectionObserver | undefined;
  let mediaAbort: AbortController | undefined;
  let mediaCleanup: Array<() => void> = [];
  const moduleCache = new Map<string, Promise<import('./types.js').MediaModule>>();
  let locale = options.initialLocale || data.defaultLocale;
  let current: DocPage | undefined;
  let activeRoute: DocRoute = { locale, pageId: home };
  const readingViews = new Map<string, ReturnType<typeof captureReadingView>>();
  const navigationViews = new Map<string, { top: number; groups: Record<string, boolean> }>();
  let cancelScrollRestore: (() => void) | undefined;
  const previousScrollRestoration = window.history.scrollRestoration;
  window.history.scrollRestoration = 'manual';
  const mountedHosts = new WeakSet<HTMLElement>();
  const mediaMounts = new Map<string, () => void>();
  let searchIndex = 0;
  let lastFocus: HTMLElement | null = null;
  let searchMode: 'modal' | 'popover' = 'modal';
  let searchQuery = '';
  let suppressSearchFocus = false;
  const preferredTheme = options.initialTheme || storage.get('theme');
  const initialTheme = (validTheme(preferredTheme) ? preferredTheme : null) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  root.dataset.theme = initialTheme;
  const fr = () => locale.startsWith('fr');
  const t = (a: string, b: string) => fr() ? a : b;
  const href = (id: string, anchor?: string) => createLink({ locale, pageId: id, anchor });
  const navIcon: Record<string, string> = { overview: 'book', quickstart: 'bolt', architecture: 'layers', writing: 'file', media: 'image', languages: 'globe', integration: 'plug', extraction: 'terminal', 'api-links': 'code', 'image-viewer': 'image', 'video-viewer': 'image', 'mesh-viewer': 'layers', galleries: 'image', blueprints: 'layers', diagrams: 'layers', 'code-languages': 'code', 'api-tour': 'code', themes: 'palette', changelog: 'layers' };

  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); }
    catch {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      root.append(textarea); textarea.select();
      const success = document.execCommand('copy'); textarea.remove();
      if (!success) throw new Error('Clipboard unavailable');
    }
  }

  function renderNavigation(nodes: NavigationNode[], depth = 0): string {
    return `<ul class="${depth ? 'nav-children' : 'nav-tree'}">${nodes.map(node => {
      const link = node.page ? `<a href="${href(node.page.id)}" data-page="${esc(node.page.id)}" title="${esc(node.page.description)}">${icon(navIcon[node.page.id] || 'file')}<span>${esc(node.label)}</span></a>` : '';
      if (!node.children.length) return `<li class="nav-leaf">${link}</li>`;
      const saved = navigationViews.get(locale)?.groups[node.key];
      const open = saved ?? (containsPage(node, current?.id) || (!node.page && depth === 0 && !['Fichiers source', 'Source files'].includes(node.label)));
      return `<li class="nav-branch"><details class="nav-group" data-nav-key="${esc(node.key)}" ${open ? 'open' : ''}><summary>${icon('chevron', 'nav-chevron')}${node.page ? link : `${icon('folder')}<span>${esc(node.label)}</span>`}</summary>${renderNavigation(node.children, depth + 1)}</details></li>`;
    }).join('')}</ul>`;
  }

  function shell() {
    pageAbort?.abort();
    pageAbort = new AbortController();
    const pageSignal = pageAbort.signal;
    const allPages = docs.pages(locale);
    root.innerHTML = `<a class="skip-link" href="#main-content">${t('Aller au contenu', 'Skip to content')}</a><div class="sidebar-backdrop" data-dismiss-menu></div>
      <aside class="sidebar" aria-label="${t('Navigation principale', 'Main navigation')}"><a class="brand" href="${href(home)}"><span class="brand-mark">${icon('book')}</span><span>${esc(data.name)}<small>DOCUMENTATION</small></span><span class="brand-version">v${esc(data.version)}</span></a>
      <nav class="side-nav" aria-label="${t('Sommaire de la documentation', 'Documentation contents')}">${renderNavigation(navigationTree(allPages))}</nav></aside>
      <div class="workspace"><header class="topbar"><div class="topbar-start"><button type="button" class="icon-button mobile-menu" data-menu aria-label="${t('Ouvrir le menu', 'Open menu')}" aria-expanded="false">${icon('menu')}</button><span class="breadcrumb-root">Documentation</span>${icon('chevron')}<span id="breadcrumb"></span></div><form class="header-search" role="search">${icon('search')}<input data-header-search type="search" autocomplete="off" placeholder="${t('Rechercher dans la documentation…', 'Search documentation…')}" aria-label="${t('Rechercher dans la documentation', 'Search documentation')}" aria-controls="search-results" aria-haspopup="dialog" aria-expanded="false" value="${esc(searchQuery)}"><kbd>Ctrl K</kbd></form><div class="topbar-actions"><label class="locale-control">${icon('globe')}<select aria-label="${t('Langue de la documentation', 'Documentation language')}">${data.locales.map(item => `<option value="${esc(item.code)}" ${item.code === locale ? 'selected' : ''}>${esc(item.label)}</option>`).join('')}</select></label><details class="theme-picker"><summary class="icon-button" aria-label="${t('Choisir un thème', 'Choose theme')}" title="${t('Choisir un thème', 'Choose theme')}">${icon('palette')}</summary><div class="theme-menu">${themes.map(theme => `<button type="button" data-set-theme="${theme.id}" aria-pressed="${root.dataset.theme === theme.id}"><span style="background:${theme.color}"></span>${fr() ? theme.fr : theme.en}</button>`).join('')}</div></details></div></header>
      <div class="page-layout"><main id="main-content" tabindex="-1"></main><aside class="page-aside" aria-label="${t('Sur cette page', 'On this page')}"></aside></div><footer class="footer"><span>${esc(data.name)} <span class="footer-dot">·</span> ${t('La connaissance, à portée de main.', 'Knowledge, within reach.')}</span><div><a href="${href(docs.resolve('changelog',locale)?'changelog':home)}">v${esc(data.version)}</a><span>${t('Libre sous licence MIT', 'Open source under MIT')}</span></div></footer></div>
      <dialog id="documentation-search" class="search-dialog" aria-label="${t('Recherche dans la documentation', 'Search documentation')}"><form method="dialog" class="search-form">${icon('search')}<input type="search" autocomplete="off" placeholder="${t('Que cherchez-vous ?', 'What are you looking for?')}" aria-label="${t('Rechercher', 'Search')}" aria-controls="search-results"><button value="cancel" class="search-close" aria-label="${t('Fermer', 'Close')}">Esc</button></form><div id="search-results" class="search-results"></div><div class="search-footer"><span>↑ ↓ ${t('naviguer', 'navigate')} <b>↵</b> ${t('ouvrir', 'open')}</span><span>${t('Échap pour fermer', 'Esc to close')}</span></div></dialog><div class="toast" role="status" aria-live="polite"></div>`;
    root.querySelector<HTMLSelectElement>('select')!.addEventListener('change', event => {
      const value = (event.target as HTMLSelectElement).value;
      const route = parseLink(location.hash, locale, home);
      storage.set('locale', value);
      location.hash = createLink({ ...route, locale: value });
    }, { signal: pageSignal });
    const filters = document.createElement('div'); filters.className = 'search-filters';
    const languages = [...new Set(data.pages.flatMap(page => page.languages || []))].sort();
    filters.innerHTML = `<select data-search-kind aria-label="${t('Type de contenu', 'Content type')}"><option value="">${t('Tous les contenus', 'All content')}</option><option value="guide">Guides</option><option value="api">API</option><option value="source">${t('Code source', 'Source code')}</option><option value="media">${t('Médias', 'Media')}</option></select><select data-search-language aria-label="${t('Langage du code', 'Code language')}"><option value="">${t('Tous les langages', 'All languages')}</option>${languages.map(language => `<option>${esc(language)}</option>`).join('')}</select>`;
    root.querySelector('#search-results')!.before(filters);
    filters.addEventListener('change', () => { searchIndex = 0; renderSearch(searchQuery); }, { signal: pageSignal });
    const input = root.querySelector<HTMLInputElement>('.search-form input')!;
    const headerInput = root.querySelector<HTMLInputElement>('[data-header-search]')!;
    input.value = searchQuery;
    const searchKeydown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      const links = [...root.querySelectorAll<HTMLAnchorElement>('.search-result')];
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!root.querySelector<HTMLDialogElement>('.search-dialog')!.open) openSearch('popover');
        searchIndex = (searchIndex + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % Math.max(1, links.length);
        highlightSearch();
      } else if (event.key === 'Enter') { event.preventDefault(); links[searchIndex]?.click(); }
      else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeSearch(true); }
      else if (event.key === 'Tab' && !event.shiftKey && event.target === headerInput && root.querySelector<HTMLDialogElement>('.search-dialog')!.open) { event.preventDefault(); filters.querySelector('select')?.focus(); }
    };
    for (const field of [input, headerInput]) {
      field.addEventListener('input', () => { searchQuery = field.value; input.value = headerInput.value = searchQuery; searchIndex = 0; if (field === headerInput) openSearch('popover'); renderSearch(searchQuery); }, { signal: pageSignal });
      field.addEventListener('keydown', searchKeydown, { signal: pageSignal });
    }
    headerInput.addEventListener('focus', () => { if (!suppressSearchFocus) openSearch('popover'); }, { signal: pageSignal });
    root.querySelector('.header-search')!.addEventListener('submit', event => event.preventDefault(), { signal: pageSignal });
    const dialog = root.querySelector<HTMLDialogElement>('.search-dialog')!;
    dialog.addEventListener('close', () => headerInput.setAttribute('aria-expanded', String(dialog.open)), { signal: pageSignal });
    dialog.addEventListener('cancel', event => { event.preventDefault(); closeSearch(true); }, { signal: pageSignal });
    dialog.addEventListener('click', event => { if (event.target === dialog) closeSearch(true); }, { signal: pageSignal });
    document.addEventListener('pointerdown', event => {
      if (searchMode === 'popover' && dialog.open && !dialog.contains(event.target as Node) && !headerInput.closest('form')!.contains(event.target as Node)) closeSearch();
    }, { signal: pageSignal });
    window.addEventListener('resize', () => { if (dialog.open && searchMode === 'popover') positionSearch(); }, { signal: pageSignal });
    root.querySelector('.side-nav')!.addEventListener('keydown', ((event: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      const target = event.target as HTMLElement, group = target.closest<HTMLDetailsElement>('.nav-group'); if (!group) return;
      event.preventDefault();
      const summary = target.closest('summary');
      if (!summary) { if (event.key === 'ArrowLeft') group.querySelector<HTMLElement>('summary')?.focus({ preventScroll: true }); return; }
      if (event.key === 'ArrowRight') { if (!group.open) group.open = true; else group.querySelector<HTMLElement>(':scope > .nav-children summary,:scope > .nav-children a')?.focus({ preventScroll: true }); }
      else if (group.open) group.open = false;
      else group.parentElement?.closest('details')?.querySelector<HTMLElement>('summary')?.focus({ preventScroll: true });
    }) as EventListener, { signal: pageSignal });
  }

  function highlightSearch() {
    const results = root.querySelectorAll<HTMLAnchorElement>('.search-result');
    results.forEach((result, i) => result.classList.toggle('selected', i === searchIndex));
    for (const field of root.querySelectorAll<HTMLInputElement>('[data-header-search],.search-form input')) {
      if (results[searchIndex]) field.setAttribute('aria-activedescendant', results[searchIndex]!.id); else field.removeAttribute('aria-activedescendant');
    }
    results[searchIndex]?.scrollIntoView({ block: 'nearest' });
  }
  function renderSearch(query: string) {
    const filters = { kind: root.querySelector<HTMLSelectElement>('[data-search-kind]')?.value, language: root.querySelector<HTMLSelectElement>('[data-search-language]')?.value };
    const results = query.trim() ? docs.search(query, locale, 30, filters) : docs.pages(locale).filter(page => (!filters.kind || (page.kind || (page.sourcePageId ? 'api' : 'guide')) === filters.kind) && (!filters.language || page.languages?.includes(filters.language))).slice(0, 5).map(page => ({ page, excerpt: page.description, anchor: undefined }));
    root.querySelector('#search-results')!.innerHTML = `<div class="search-caption" role="status" aria-live="polite">${query.trim() ? `${results.length} ${t('résultat(s)', 'result(s)')}` : t('POUR COMMENCER', 'GET STARTED')}</div>${results.length ? results.map(({ page, excerpt, anchor }, i) => `<a id="search-result-${i}" class="search-result" href="${href(page.id, anchor)}">${icon(navIcon[page.id] || 'file')}<div><strong>${esc(page.title)}</strong><p>${esc(excerpt)}</p><small>${esc(page.kind || 'guide')} ${esc((page.languages || []).join(' · '))}</small></div>${icon('arrow')}</a>`).join('') : `<div class="search-empty">${icon('search')}<strong>${t('Aucun résultat', 'No results')}</strong><p>${t('Essayez un autre mot ou une expression plus courte.', 'Try another word or a shorter phrase.')}</p></div>`}`;
    highlightSearch();
  }
  function positionSearch() {
    const dialog = root.querySelector<HTMLDialogElement>('.search-dialog')!;
    const bounds = root.querySelector('.header-search')!.getBoundingClientRect();
    const width = Math.min(Math.max(bounds.width, 440), window.innerWidth - 32);
    dialog.style.setProperty('--search-left', `${Math.max(16, Math.min(bounds.left, window.innerWidth - width - 16))}px`);
    dialog.style.setProperty('--search-top', `${bounds.bottom + 8}px`);
    dialog.style.setProperty('--search-width', `${width}px`);
  }
  function closeSearch(restoreFocus = false) {
    const dialog = root.querySelector<HTMLDialogElement>('.search-dialog')!;
    const modal = searchMode === 'modal';
    dialog.close();
    root.querySelector('[data-header-search]')?.setAttribute('aria-expanded', 'false');
    if (restoreFocus) {
      const target = modal ? lastFocus : root.querySelector<HTMLElement>('[data-header-search]');
      suppressSearchFocus = true;
      try { target?.focus({ preventScroll: true }); } finally { suppressSearchFocus = false; }
    }
  }
  function openSearch(mode: 'modal' | 'popover' = 'modal') {
    const dialog = root.querySelector<HTMLDialogElement>('.search-dialog')!;
    if (dialog.open && searchMode === mode) return;
    if (mode === 'modal') lastFocus = document.activeElement as HTMLElement;
    if (dialog.open) dialog.close();
    searchMode = mode;
    searchIndex = 0;
    dialog.classList.toggle('search-popover', mode === 'popover');
    if (mode === 'popover') { positionSearch(); dialog.show(); } else dialog.showModal();
    root.querySelector('[data-header-search]')?.setAttribute('aria-expanded', 'true');
    const input = root.querySelector<HTMLInputElement>('.search-form input')!;
    input.value = searchQuery; renderSearch(searchQuery);
    if (mode === 'modal') input.focus();
  }
  let toastTimeout: ReturnType<typeof setTimeout>;
  function disposeMedia() {
    mediaAbort?.abort(); mediaObserver?.disconnect();
    for (const cleanup of mediaCleanup) cleanup();
    mediaCleanup = [];
    mediaMounts.clear();
  }
  function loadModule(name: string) {
    const loader = options.modules?.[name];
    if (!loader) return Promise.reject(new Error(`Module not enabled: ${name}`));
    let pending = moduleCache.get(name);
    if (!pending) { pending = loader().catch(error => { moduleCache.delete(name); throw error; }); moduleCache.set(name, pending); }
    return pending;
  }
  function mountMedia(page: DocPage) {
    mediaAbort = new AbortController();
    const moduleSignal = mediaAbort.signal;
    const mount = async (host: HTMLElement) => {
      if (mountedHosts.has(host)) return; mountedHosts.add(host);
      const kind = host.dataset.cydocModule!;
      const loader = options.modules?.[kind];
      if (!loader) return;
      try {
        const module = await loadModule(kind);
        if (moduleSignal.aborted) return;
        const id = host.dataset.cydocId || kind;
        const state = activeRoute.state?.media === id ? activeRoute.state : undefined;
        const cleanup = await module.mount(host, JSON.parse(host.dataset.config || '{}'), { locale, signal: moduleSignal, storageKey: `${options.storageId || data.name}:${page.id}:${id}`, loadAsset: options.loadAsset, loadModule, state, linkState: state => {
          const url = createLink({ locale, pageId: page.id, state: { ...state, media: id } }, location.href);
          void copy(url).then(() => toast(t('Lien vers cette vue copié', 'Link to this view copied'))).catch(() => toast(t('Le presse-papiers est indisponible.', 'Clipboard is unavailable.')));
        } });
        if (cleanup) { if (moduleSignal.aborted) cleanup(); else mediaCleanup.push(cleanup); }
      } catch (error) {
        moduleCache.delete(kind);
        if (!moduleSignal.aborted) { const notice = document.createElement('p'); notice.className = 'callout'; notice.textContent = `${t('Module indisponible', 'Module unavailable')} (${kind}): ${error instanceof Error ? error.message : String(error)}`; host.append(notice); }
      }
    };
    const hosts = [...root.querySelectorAll<HTMLElement>('[data-cydoc-module]')];
    for (const host of hosts) mediaMounts.set(host.dataset.cydocId || host.dataset.cydocModule!, () => { void mount(host); });
    if ('IntersectionObserver' in window) {
      mediaObserver = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) { mediaObserver!.unobserve(entry.target); void mount(entry.target as HTMLElement); } }, { rootMargin: '200px' });
      hosts.forEach(host => mediaObserver!.observe(host));
    } else hosts.forEach(host => void mount(host));
    applyMediaRoute();
  }
  function applyMediaRoute() {
    const id = activeRoute.state?.media; if (!id) return;
    const host = [...root.querySelectorAll<HTMLElement>('[data-cydoc-id]')].find(element => element.dataset.cydocId === id);
    if (host) { revealTarget(host); host.scrollIntoView({ block: 'center' }); mediaMounts.get(id)?.(); host.dispatchEvent(new window.CustomEvent('cydoc:state', { detail: activeRoute.state })); }
  }
  function toast(message: string) {
    const element = root.querySelector<HTMLElement>('.toast')!;
    element.textContent = message; element.classList.add('visible');
    clearTimeout(toastTimeout); toastTimeout = setTimeout(() => element.classList.remove('visible'), 2600);
  }

  function render() {
    cancelScrollRestore?.();
    const route = docs.canonicalRoute(parseLink(location.hash, options.initialLocale || storage.get('locale') || data.defaultLocale, home));
    activeRoute = route;
    const nextLocale = data.locales.some(item => item.code === route.locale) ? route.locale : data.defaultLocale;
    if (current?.id === route.pageId && locale === nextLocale && root.querySelector('main')) {
      const heading = route.anchor ? [...root.querySelectorAll<HTMLElement>('main [id]')].find(item => item.id === route.anchor) : undefined;
      if (heading) { revealTarget(heading); heading.scrollIntoView({ block: 'start' }); heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
      applyMediaRoute();
      return;
    }
    if (current) readingViews.set(`${locale}:${current.id}`, captureReadingView(root));
    const navigation = root.querySelector<HTMLElement>('.side-nav');
    if (navigation) navigationViews.set(locale, { top: navigation.scrollTop, groups: Object.fromEntries([...navigation.querySelectorAll<HTMLDetailsElement>('[data-nav-key]')].map(group => [group.dataset.navKey!, group.open])) });
    pageAbort?.abort();
    disposeMedia();
    locale = nextLocale;
    const resolved = docs.resolve(route.pageId, locale);
    current = resolved?.page;
    observer?.disconnect();
    shell();
    const navView = navigationViews.get(locale);
    if (navView) {
      root.querySelector<HTMLElement>('.side-nav')!.scrollTop = navView.top;
    }
    document.documentElement.lang = locale;
    document.title = `${current?.title || t('Page introuvable', 'Page not found')} — ${data.name}`;
    root.querySelector('#breadcrumb')!.textContent = current?.title || '404';
    root.querySelectorAll<HTMLAnchorElement>('[data-page]').forEach(link => {
      if (link.dataset.page === current?.id) { link.classList.add('active'); link.setAttribute('aria-current', 'page'); }
    });
    const main = root.querySelector<HTMLElement>('main')!;
    const aside = root.querySelector<HTMLElement>('.page-aside')!;
    if (!current) {
      main.innerHTML = `<div class="not-found"><span class="eyebrow">404</span><h1>${t('Cette page est introuvable.', 'This page could not be found.')}</h1><p>${t('Le lien ne correspond à aucune page de cette documentation.', 'This link does not match a page in this documentation.')}</p><a class="button primary" href="${href(home)}">${t('Revenir à l’accueil', 'Back to overview')}${icon('arrow')}</a></div>`;
      return;
    }
    const isHome = current.id === home && !!options.renderHome;
    main.classList.toggle('home-page', isHome);
    root.querySelector('.page-layout')!.classList.toggle('is-home', isHome);
    const page = current;
    const ordered = docs.pages(locale);
    const index = ordered.findIndex(item => item.id === page.id);
    const previous = ordered[index - 1]; const next = ordered[index + 1];
    main.innerHTML = isHome ? options.renderHome!(locale) : `<div class="article-header"><div class="eyebrow">${esc(page.section)}</div><div class="article-title"><h1>${esc(page.title)}</h1><button class="icon-button" type="button" data-copy-link aria-label="${t('Copier le lien de la page', 'Copy page link')}">${icon('link')}</button></div><p>${esc(page.description)}</p>${page.source ? `<span class="source-badge">${icon('terminal')}${t('Extraite du code', 'Extracted from source')} ${page.sourcePageId && page.sourcePageId !== page.id ? `<a href="${href(page.sourcePageId, `L${page.source.match(/:(\d+)$/)?.[1] || 1}`)}"><code>${esc(page.source)}</code></a>` : `<code>${esc(page.source)}</code>`}</span>` : ''}</div>${resolved?.fallback ? `<div class="callout">${t('Traduction indisponible. Cette page est affichée dans la langue par défaut.', 'Translation unavailable. This page is shown in the default language.')}</div>` : ''}<article class="prose" lang="${esc(page.locale)}">${page.html}</article><div class="page-feedback"><span>${t('Cette page vous a été utile ?', 'Was this page helpful?')}</span><button type="button" data-feedback="yes">${t('Oui, merci', 'Yes, thanks')}${icon('check')}</button><button type="button" data-feedback="no">${t('À améliorer', 'Needs work')}</button></div><nav class="page-pagination" aria-label="${t('Pages voisines', 'Adjacent pages')}">${previous ? `<a href="${href(previous.id)}"><span>← ${t('Précédent', 'Previous')}</span><strong>${esc(previous.title)}</strong></a>` : '<span></span>'}${next ? `<a href="${href(next.id)}"><span>${t('Suivant', 'Next')} →</span><strong>${esc(next.title)}</strong></a>` : ''}</nav>`;
    aside.innerHTML = isHome ? '' : `<div class="toc"><span class="toc-label">${t('SUR CETTE PAGE', 'ON THIS PAGE')}</span>${page.headings.filter(heading => heading.level <= 3).map(heading => `<a href="${href(page.id, heading.id)}" data-heading="${esc(heading.id)}" class="level-${heading.level}">${esc(heading.text)}</a>`).join('')}<div class="toc-actions"><button type="button" data-copy-link>${icon('link')}${t('Copier le lien', 'Copy link')}</button><button type="button" data-print>${icon('file')}${t('Imprimer la page', 'Print page')}</button></div></div>`;
    mountReaderTools(root, data, page, route, { signal: pageAbort!.signal, storageId: options.storageId, toast });
    const readingView = readingViews.get(`${locale}:${page.id}`);
    if (readingView) restoreReadingView(root, readingView);
    mountMedia(page);
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        const visible = entries.find(entry => entry.isIntersecting);
        if (visible) root.querySelectorAll<HTMLElement>('[data-heading]').forEach(link => link.classList.toggle('current', link.dataset.heading === visible.target.id));
      }, { rootMargin: '-90px 0px -65% 0px' });
      main.querySelectorAll('h2,h3').forEach(heading => observer!.observe(heading));
    }
    if (route.anchor) {
      const heading = [...main.querySelectorAll<HTMLElement>('[id]')].find(item => item.id === route.anchor);
      if (heading) { revealTarget(heading); heading.scrollIntoView({ block: 'start' }); }
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    } else if (!route.state) cancelScrollRestore = restoreScroll(readingView?.top || 0, readingView?.left || 0, main, pageAbort!.signal);
  }

  root.addEventListener('click', async event => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('button,a,[data-dismiss-menu]');
    if (!target) return;
    if (target.matches('.skip-link')) { event.preventDefault(); root.querySelector<HTMLElement>('main')?.focus(); return; }
    if (target.hasAttribute('data-search')) openSearch();
    if (target.matches('.search-close')) { event.preventDefault(); closeSearch(true); }
    if (target.dataset.setTheme && validTheme(target.dataset.setTheme)) {
      root.dataset.theme = target.dataset.setTheme; storage.set('theme', target.dataset.setTheme);
      root.querySelectorAll('[data-set-theme]').forEach(button => button.setAttribute('aria-pressed', String((button as HTMLElement).dataset.setTheme === root.dataset.theme)));
      root.querySelector<HTMLDetailsElement>('.theme-picker')!.open = false;
    }
    if (target.hasAttribute('data-menu')) {
      root.classList.toggle('menu-open'); target.setAttribute('aria-expanded', String(root.classList.contains('menu-open')));
    }
    if (target.hasAttribute('data-dismiss-menu')) root.classList.remove('menu-open');
    if (target.hasAttribute('data-copy-link') || target.hasAttribute('data-copy-code')) {
      try {
        const lines = [...(target.closest('.code-block')?.querySelectorAll<HTMLElement>('.code-line') || [])];
        await copy(target.hasAttribute('data-copy-code') ? lines.length ? lines.map(line => line.textContent || '').join('\n') : target.closest('.code-block')?.querySelector('code')?.textContent || '' : location.href);
        toast(t('Copié dans le presse-papiers', 'Copied to clipboard'));
      } catch { toast(t('Le presse-papiers est indisponible dans cet environnement.', 'Clipboard is unavailable in this environment.')); }
    }
    if (target.hasAttribute('data-print')) window.print();
    if (target.hasAttribute('data-feedback')) {
      storage.set(`feedback:${locale}:${current?.id}`, target.dataset.feedback!);
      root.querySelector('.page-feedback')!.innerHTML = `${icon('check')}<span>${t('Merci ! Votre avis est enregistré sur cet appareil.', 'Thank you! Your feedback is saved on this device.')}</span>`;
    }
    if (target.matches('a[href^="#/"]')) {
      closeSearch(); root.classList.remove('menu-open');
    }
  }, { signal });
  window.addEventListener('hashchange', render, { signal });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); }
    if (event.key === 'Escape') { if (root.querySelector<HTMLDialogElement>('.search-dialog')?.open) closeSearch(true); const picker = root.querySelector<HTMLDetailsElement>('.theme-picker'); if (picker) picker.open = false; root.classList.remove('menu-open'); root.querySelector('[data-menu]')?.setAttribute('aria-expanded', 'false'); }
  }, { signal });
  render();
  return { ...docs, destroy() { pageAbort?.abort(); disposeMedia(); abort.abort(); observer?.disconnect(); clearTimeout(toastTimeout); window.history.scrollRestoration = previousScrollRestoration; root.innerHTML = ''; root.classList.remove('cydoc-viewer', 'menu-open'); } };
}
