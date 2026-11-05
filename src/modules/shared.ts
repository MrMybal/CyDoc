export const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
export const localAsset = (value: unknown): string => {
  const url = String(value || '');
  let decoded = '';
  try { decoded = decodeURIComponent(url); } catch { throw new Error('Invalid asset URL'); }
  if (!/^(?:\.\/)?assets\/[a-zA-Z0-9_./%~-]+$/.test(url) || /(?:^|\/)\.\.(?:\/|$)|[\\\u0000-\u0020]/.test(decoded)) throw new Error('Media must stay inside assets/');
  return url;
};
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const mediaIcon = (name: 'expand' | 'collapse' | 'grab' | 'previous' | 'next' | 'link') => `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${{
  link: '<path d="m10 14 4-4m-5 7-1 1a4.2 4.2 0 0 1-6-6l4-4a4 4 0 0 1 6 0m0 8a4 4 0 0 0 6 0l4-4a4.2 4.2 0 0 0-6-6l-1 1"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  collapse: '<path d="M3 8h5V3m8 0v5h5M8 21v-5H3m13 5v-5h5"/>',
  grab: '<path d="m7 8-4 4 4 4m10-8 4 4-4 4M3 12h18M10 6v12m4-12v12"/>',
  previous: '<path d="m15 5-7 7 7 7"/>', next: '<path d="m9 5 7 7-7 7"/>'
}[name]}</svg>`;
export function fullscreenButton(locale: string) {
  const label = locale.startsWith('fr') ? 'Plein écran' : 'Fullscreen';
  const exit = locale.startsWith('fr') ? 'Quitter le plein écran' : 'Exit fullscreen';
  return `<button type="button" class="media-icon-button" data-action="fullscreen" data-enter-label="${label}" data-exit-label="${exit}" title="${label}" aria-label="${label}">${mediaIcon('expand')}</button>`;
}
/** Media-specific state stays outside the DOM-free router. No codec or 3D imports in the viewer. */
export function bindMediaState(host: HTMLElement, context: import('../types.js').MediaContext, apply: (state: import('../types.js').ReaderState) => void, read: () => import('../types.js').ReaderState) {
  host.addEventListener('cydoc:state', event => apply((event as CustomEvent).detail || {}), { signal: context.signal });
  if (context.linkState) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'media-icon-button';
    button.dataset.action = 'permalink'; button.innerHTML = mediaIcon('link');
    button.title = context.locale.startsWith('fr') ? 'Copier le lien vers cette vue' : 'Copy link to this view'; button.setAttribute('aria-label', button.title);
    button.addEventListener('click', () => context.linkState!(read()), { signal: context.signal });
    host.querySelector('.media-toolbar')?.append(button);
  }
  if (context.state && Object.keys(context.state).length) apply(context.state);
}
function syncFullscreen(element: HTMLElement) {
  const expanded = document.fullscreenElement === element || element.classList.contains('media-expanded');
  for (const button of element.querySelectorAll<HTMLButtonElement>('[data-action=fullscreen]')) {
    if (button.closest('.cy-media') !== element) continue;
    button.innerHTML = mediaIcon(expanded ? 'collapse' : 'expand');
    const label = (expanded ? button.dataset.exitLabel : button.dataset.enterLabel) || 'Fullscreen';
    button.setAttribute('aria-label', label); button.title = label;
  }
}
export function watchFullscreen(element: HTMLElement, signal: AbortSignal) {
  document.addEventListener('fullscreenchange', () => syncFullscreen(element), { signal });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { element.classList.remove('media-expanded'); syncFullscreen(element); } }, { signal });
}
/** One accessible slider drives both the in-frame grab handle and the range below. */
export function comparisonHandle(host: HTMLElement, input: HTMLInputElement, locale: string, signal: AbortSignal, update: (value: number) => void) {
  const stage = host.querySelector<HTMLElement>('.media-stage')!;
  const divider = host.querySelector<HTMLElement>('.compare-divider')!;
  const handle = document.createElement('button');
  handle.type = 'button'; handle.className = 'compare-grab'; handle.setAttribute('role', 'slider');
  handle.setAttribute('aria-label', locale.startsWith('fr') ? 'Déplacer la séparation de comparaison' : 'Drag the comparison divider');
  handle.setAttribute('aria-valuemin', '0'); handle.setAttribute('aria-valuemax', '100');
  handle.innerHTML = mediaIcon('grab'); divider.append(handle);
  const apply = (value: number) => {
    value = clamp(value, 0, 100); input.value = String(value);
    divider.style.left = `${value}%`; handle.setAttribute('aria-valuenow', String(Math.round(value)));
    update(value);
  };
  input.addEventListener('input', () => apply(Number(input.value)), { signal });
  let pointer: number | undefined;
  const move = (event: PointerEvent) => {
    const bounds = stage.getBoundingClientRect();
    apply((event.clientX - bounds.left) / Math.max(bounds.width, 1) * 100);
  };
  handle.addEventListener('pointerdown', event => {
    event.preventDefault(); event.stopPropagation(); pointer = event.pointerId;
    handle.setPointerCapture?.(event.pointerId); move(event);
  }, { signal });
  handle.addEventListener('pointermove', event => { if (pointer === event.pointerId) { event.stopPropagation(); move(event); } }, { signal });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) handle.addEventListener(type, () => { pointer = undefined; }, { signal });
  for (const type of ['click', 'dblclick']) handle.addEventListener(type, event => event.stopPropagation(), { signal });
  handle.addEventListener('keydown', event => {
    const value = Number(input.value);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 100 : ['ArrowLeft', 'ArrowDown'].includes(event.key) ? value - (event.shiftKey ? 10 : 1) : ['ArrowRight', 'ArrowUp'].includes(event.key) ? value + (event.shiftKey ? 10 : 1) : undefined;
    if (next !== undefined) { event.preventDefault(); event.stopPropagation(); apply(next); }
  }, { signal });
  apply(Number(input.value));
  return apply;
}
export function addStyles(id: string, css: string) {
  if (document.getElementById(id)) return;
  const style = document.createElement('style'); style.id = id; style.textContent = css; document.head.append(style);
}
export async function fullscreen(element: HTMLElement) {
  if (element.classList.contains('media-expanded')) element.classList.remove('media-expanded');
  else if (document.fullscreenElement) await document.exitFullscreen();
  else if (element.requestFullscreen) { try { await element.requestFullscreen(); } catch { element.classList.add('media-expanded'); } }
  else element.classList.add('media-expanded');
  syncFullscreen(element);
}
export function saveJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function readSaved<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}
export function writeSaved(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage can be disabled by the host. */ }
}
export const commonStyles = `
.cy-media{border:1px solid var(--line,#dce3e9);border-radius:10px;overflow:hidden;background:var(--surface,#f6f8fa);margin:24px 0;font:12px/1.6 system-ui;color:var(--text,#253341);text-align:left;position:relative}
.cy-media .media-toolbar{display:flex;align-items:center;gap:7px;padding:10px 12px;flex-wrap:wrap;border-bottom:1px solid var(--line,#dce3e9);background:var(--bg,#fff)}
.cy-media button,.cy-media select{font:11px system-ui;min-height:32px;background:var(--bg,#fff);border:1px solid var(--line,#dce3e9);border-radius:5px;padding:5px 9px;color:inherit;cursor:pointer}
.cy-media button:hover{border-color:var(--accent,#278169)}.cy-media button[aria-pressed=true]{background:var(--accent-bg,#e8f4ef);color:var(--accent,#278169)}
.cy-media .media-title{font-size:11px;font-weight:600;margin-right:auto}.cy-media .media-stage{height:340px;position:relative;overflow:hidden;background:#18242d;isolation:isolate}
.cy-media .media-caption{padding:9px 12px;font-size:11px;color:var(--muted,#647386);display:flex;justify-content:space-between;gap:12px}
.cy-media input[type=range]{accent-color:var(--accent,#278169);cursor:ew-resize}.cy-media .media-compare-control{display:flex;gap:10px;align-items:center;padding:9px 12px;border-top:1px solid var(--line,#dce3e9)}
.cy-media .media-compare-control input{width:100%;min-width:50px}.cy-media .media-compare-control span{font-size:10px;white-space:nowrap}.cy-media .compare-divider{position:absolute;inset:0 auto 0 50%;width:2px;background:#fff;pointer-events:none;z-index:4;box-shadow:0 0 4px #0008}
.cy-media .compare-label{position:absolute;top:12px;padding:3px 8px;background:#101b27bd;color:white;border-radius:4px;font-size:10px;z-index:3}.cy-media .compare-label.left{left:12px}.cy-media .compare-label.right{right:12px}
.cy-media .media-icon-button{display:inline-grid;place-items:center;width:34px;height:32px;padding:5px}.cy-media .compare-divider{z-index:7}.cy-media .compare-grab{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border:1px solid #ffffffb0;background:#233746e8;color:#fff;box-shadow:0 2px 12px #0005;border-radius:50%;width:44px;height:44px;padding:0;display:grid;place-items:center;cursor:ew-resize;touch-action:none;pointer-events:auto}.cy-media .compare-grab:hover,.cy-media .compare-grab:focus-visible{background:#267b67;border-color:#fff;outline:2px solid #a4efd3;outline-offset:3px}.cy-media .compare-grab:active{cursor:grabbing}
.cy-media:fullscreen,.cy-media.media-expanded{border:0;border-radius:0;display:flex;flex-direction:column;width:100vw;height:100vh;margin:0;background:var(--bg,#fff)}.cy-media.media-expanded{position:fixed;inset:0;z-index:2000}.cy-media:fullscreen .media-stage,.cy-media.media-expanded .media-stage{height:auto;flex:1;min-height:0}
.cy-media .media-error{color:#c45f54;font-size:11px;padding:8px 12px}.cy-media .annotation-form{display:flex;gap:8px;padding:10px 12px;flex-wrap:wrap}.cy-media .annotation-form input{flex:1;min-width:120px;border:1px solid var(--line,#ddd);border-radius:5px;padding:8px;background:var(--bg,#fff);color:inherit;font:12px system-ui}.cy-media .annotation-list{max-height:140px;overflow:auto;display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 10px}.cy-media .annotation-chip{font-size:10px;display:flex;align-items:center;gap:6px}.cy-media .annotation-chip button{min-height:25px;font-size:10px}.cy-media .annotation-chip button:last-child{padding:2px 5px}
@media(max-width:540px){.cy-media .media-stage{height:270px}.cy-media .media-toolbar{gap:5px;padding:8px}.cy-media button,.cy-media select{font-size:10px;padding:5px 7px}.cy-media .media-title{flex-basis:100%}}
`;
