import { createLink, parseLink } from './index.js';
import type { Documentation, DocPage, DocRoute } from './types.js';
import { icon } from './icons.js';

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export function activateTab(button: HTMLElement) {
  const group = button.closest<HTMLElement>('[data-tabs]'); if (!group) return;
  for (const tab of group.querySelectorAll<HTMLElement>(':scope > [role=tablist] > [role=tab]')) { const active = tab === button; tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; }
  for (const panel of group.querySelectorAll<HTMLElement>(':scope > [role=tabpanel]')) panel.hidden = panel.id !== button.getAttribute('aria-controls');
}
export function revealTarget(element: HTMLElement) {
  for (let parent: HTMLElement | null = element; parent; parent = parent.parentElement) {
    if (parent.matches('details')) (parent as HTMLDetailsElement).open = true;
    if (parent.getAttribute('role') === 'tabpanel') {
      const button = document.getElementById(parent.getAttribute('aria-labelledby') || ''); if (button) activateTab(button);
    }
  }
}
interface SavedPage { id: string; locale: string; title: string; href: string; time: number }
interface ReadingData { bookmarks: SavedPage[]; history: SavedPage[]; notes: Record<string, string>; positions: Record<string, number> }
export function readingStore(namespace: string) {
  const key = `cydoc:reading:${namespace}`;
  const empty = (): ReadingData => ({ bookmarks: [], history: [], notes: {}, positions: {} });
  let data = empty();
  try {
    const raw = JSON.parse(localStorage.getItem(key) || 'null');
    if (raw) data = { bookmarks: Array.isArray(raw.bookmarks) ? raw.bookmarks.filter(validPage).slice(0, 500) : [], history: Array.isArray(raw.history) ? raw.history.filter(validPage).slice(0, 30) : [], notes: Object.fromEntries((Object.entries(raw.notes || {}) as Array<[string, string]>).filter(([, value]) => typeof value === 'string' && value.length <= 10000)), positions: Object.fromEntries((Object.entries(raw.positions || {}) as Array<[string, number]>).filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value >= 0)) };
  } catch { /* A file origin may not grant persistent storage. The UI still works in memory. */ }
  function validPage(value: SavedPage) { return value && typeof value.id === 'string' && typeof value.locale === 'string' && typeof value.title === 'string' && typeof value.href === 'string' && /^(file:|https?:|#\/)/.test(value.href); }
  return { data, save() { try { localStorage.setItem(key, JSON.stringify(data)); return true; } catch { return false; } } };
}

export function mountReaderTools(root: HTMLElement, data: Documentation, page: DocPage, route: DocRoute, options: { signal: AbortSignal; storageId?: string; toast: (text: string) => void }) {
  const { signal } = options, fr = route.locale.startsWith('fr'), t = (a: string, b: string) => fr ? a : b;
  const store = readingStore(options.storageId || data.name), saved = store.data;
  const pageKey = `${route.locale}:${page.id}`;
  const current: SavedPage = { id: page.id, locale: route.locale, title: page.title, href: createLink({ ...route, pageId: page.id }, location.href), time: Date.now() };
  saved.history = [current, ...saved.history.filter(item => item.id !== page.id || item.locale !== route.locale)].slice(0, 30); store.save();
  const versions = data.versions || [];
  if (versions.length) {
    const label = document.createElement('label'); label.className = 'version-control';
    label.innerHTML = `<span class="sr-only">${t('Version de la documentation', 'Documentation version')}</span><select aria-label="${t('Version de la documentation', 'Documentation version')}">${versions.map(version => `<option value="${esc(version.id)}" ${version.id === data.version ? 'selected' : ''}>${esc(version.label)}</option>`).join('')}</select>`;
    root.querySelector('.locale-control')?.before(label);
    label.querySelector('select')!.addEventListener('change', event => {
      const version = versions.find(version => version.id === (event.target as HTMLSelectElement).value);
      if (version) { const url = new URL(version.base, location.href); const latest=parseLink(location.hash,route.locale,page.id); if (url.protocol === 'file:' || url.origin === location.origin) location.href = createLink(latest, url.href); }
    }, { signal });
  }
  const personalButton = document.createElement('button'); personalButton.type = 'button'; personalButton.className = 'personal-trigger'; personalButton.dataset.personal = '';
  personalButton.innerHTML = `${icon('book')}<span>${t('Mon espace', 'My space')}</span><small>${t('Favoris et notes', 'Bookmarks & notes')}</small>`;
  root.querySelector('.side-nav')?.before(personalButton);
  const bookmark = document.createElement('button'); bookmark.type = 'button'; bookmark.className = 'icon-button'; bookmark.dataset.bookmark = ''; bookmark.innerHTML = icon('heart'); bookmark.title = t('Ajouter aux favoris', 'Bookmark page'); bookmark.setAttribute('aria-label', bookmark.title);
  (root.querySelector('.article-title') || root.querySelector('.topbar-actions'))?.append(bookmark);
  const updateBookmark = () => bookmark.setAttribute('aria-pressed', String(saved.bookmarks.some(item => item.id === page.id && item.locale === route.locale)));
  updateBookmark();
  const dialog = document.createElement('dialog'); dialog.className = 'personal-dialog'; dialog.setAttribute('aria-label', t('Mon espace local', 'My local space')); root.append(dialog);
  function drawPersonal() {
    const list = (items: SavedPage[]) => items.length ? `<ul>${items.map(item => `<li><a href="${esc(item.href)}">${esc(item.title)}</a><small>${esc(item.locale)}</small></li>`).join('')}</ul>` : `<p class="muted">${t('Aucune page enregistrée.', 'No saved pages.')}</p>`;
    dialog.innerHTML = `<div class="personal-header"><h2>${t('Mon espace', 'My space')}</h2><button type="button" data-personal-close aria-label="${t('Fermer', 'Close')}">${icon('close')}</button></div><p class="personal-local">${t('Conservé sur cet appareil. Exportez vos données pour les sauvegarder.', 'Stored on this device. Export your data to back it up.')}</p><h3>${t('Favoris', 'Bookmarks')}</h3>${list(saved.bookmarks)}<h3>${t('Pages récentes', 'Recent pages')}</h3>${list(saved.history)}<h3>${t('Notes personnelles', 'Personal notes')}</h3><ul>${Object.entries(saved.notes).filter(([, note]) => note.trim()).map(([key, note]) => `<li><strong>${esc(key)}</strong><p>${esc(note)}</p></li>`).join('')}</ul><button type="button" data-personal-export>${t('Exporter favoris et notes', 'Export bookmarks and notes')}</button>`;
  }
  const notes = document.createElement('details'); notes.className = 'personal-notes';
  notes.innerHTML = `<summary>${icon('file')}${t('Mes notes sur cette page', 'My notes on this page')}</summary><label><span>${t('Notes privées, conservées localement', 'Private notes, stored locally')}</span><textarea maxlength="10000" rows="5" placeholder="${t('Écrivez votre note…', 'Write your note…')}">${esc(saved.notes[pageKey] || '')}</textarea></label><div class="note-actions"><button type="button" data-save-note>${t('Enregistrer', 'Save')}</button><span role="status"></span></div>`;
  root.querySelector('.page-feedback')?.before(notes);
  const saveNote = () => { saved.notes[pageKey] = notes.querySelector('textarea')!.value; const persisted = store.save(); notes.querySelector('[role=status]')!.textContent = persisted ? t('Enregistré sur cet appareil.', 'Saved on this device.') : t('Stockage indisponible : exportez vos notes avant de fermer.', 'Storage unavailable: export your notes before closing.'); };
  notes.querySelector('[data-save-note]')!.addEventListener('click', saveNote, { signal });
  notes.querySelector('textarea')!.addEventListener('change', saveNote, { signal });
  root.addEventListener('click', event => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('button,a'); if (!target) return;
    if (target.hasAttribute('data-personal')) { drawPersonal(); dialog.showModal(); }
    if (target.hasAttribute('data-personal-close') || target.closest('.personal-dialog') && target.matches('a')) dialog.close();
    if (target.hasAttribute('data-bookmark')) { const exists = bookmark.getAttribute('aria-pressed') === 'true'; saved.bookmarks = exists ? saved.bookmarks.filter(item => item.id !== page.id || item.locale !== route.locale) : [current, ...saved.bookmarks].slice(0, 500); store.save(); updateBookmark(); options.toast(exists ? t('Favori retiré', 'Bookmark removed') : t('Page ajoutée aux favoris', 'Page bookmarked')); }
    if (target.hasAttribute('data-personal-export')) {
      const url = URL.createObjectURL(new Blob([JSON.stringify({ type: 'cydoc-reading-data', schemaVersion: 1, documentation: data.name, ...saved }, null, 2)], { type: 'application/json' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'cydoc-personal.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    if (target.getAttribute('role') === 'tab' && target.closest('[data-tabs]')) activateTab(target);
    if (target.hasAttribute('data-term')) { const tooltip = document.getElementById(target.getAttribute('aria-describedby') || ''); if (tooltip) { tooltip.hidden = !tooltip.hidden; target.setAttribute('aria-expanded', String(!tooltip.hidden)); } }
  }, { signal });
  root.addEventListener('keydown', event => {
    const target = event.target as HTMLElement;
    if (target.matches('[data-tabs] [role=tab]') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); const tabs = [...target.parentElement!.querySelectorAll<HTMLElement>('[role=tab]')];
      const currentIndex = tabs.indexOf(target), next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (currentIndex + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
      activateTab(tabs[next]!); tabs[next]!.focus({ preventScroll: true });
    }
    if (event.key === 'Escape') root.querySelectorAll<HTMLElement>('[data-term][aria-expanded=true]').forEach(button => { button.setAttribute('aria-expanded', 'false'); const tooltip = document.getElementById(button.getAttribute('aria-describedby') || ''); if (tooltip) tooltip.hidden = true; });
  }, { signal });
  let timer: ReturnType<typeof setTimeout>;
  const remember = () => { saved.positions[pageKey] = Math.max(0, window.scrollY || 0); store.save(); };
  window.addEventListener('scroll', () => { clearTimeout(timer); timer = setTimeout(remember, 200); }, { passive: true, signal });
  const position = saved.positions[pageKey];
  if (!route.anchor && !route.state && position && position > 100) {
    const resume = document.createElement('button'); resume.type = 'button'; resume.className = 'resume-reading'; resume.textContent = t('Reprendre ma lecture', 'Resume reading');
    root.querySelector('.toc')?.append(resume); resume.addEventListener('click', () => window.scrollTo({ top: position, behavior: 'smooth' }), { signal });
  }
  signal.addEventListener('abort', () => { clearTimeout(timer); remember(); dialog.remove(); }, { once: true });
}
