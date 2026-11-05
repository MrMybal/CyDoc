import type { MediaModule } from '../types.js';
import { addStyles, commonStyles, escape, localAsset, fullscreen, fullscreenButton, watchFullscreen, mediaIcon, bindMediaState } from './shared.js';

const galleryModule: MediaModule = {
  mount(host, config, context) {
    const { locale, signal } = context;
    const fr = locale.startsWith('fr'); const t = (a: string, b: string) => fr ? a : b;
    if (!Array.isArray(config.items) || !config.items.length) throw new Error('Gallery needs at least one item');
    const items = config.items as Array<Record<string, unknown>>;
    addStyles('cydoc-gallery-style', commonStyles + `.cy-gallery .gallery-content>.cy-media{margin:0;border:0;border-radius:0}.cy-gallery .gallery-tabs{display:flex;gap:8px;padding:12px;overflow:auto;background:var(--bg,#fff);border-top:1px solid var(--line,#ddd)}.cy-gallery .gallery-tab{width:120px;min-width:95px;display:flex;flex-direction:column;align-items:center;gap:6px;padding:7px;font-size:10px}.cy-gallery .gallery-tab[aria-selected=true]{border-color:var(--accent,#278169);background:var(--accent-bg,#e8f4ef)}.cy-gallery .gallery-tab img{height:48px;max-height:48px;width:90px;object-fit:contain;border:0;border-radius:3px;background:#18242d;margin:0}.cy-gallery .gallery-kind{display:grid;place-items:center;height:48px;width:90px;background:var(--surface,#eee);border-radius:3px;font-size:18px}.cy-gallery .gallery-tab span:last-child{display:block;max-width:105px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cy-gallery .gallery-counter{font-size:11px;color:var(--muted,#647386);font-variant-numeric:tabular-nums}.cy-gallery .gallery-fallback{padding:30px;text-align:center}.cy-gallery:fullscreen .gallery-content,.cy-gallery.media-expanded .gallery-content{flex:1;min-height:0;overflow:auto}.cy-gallery:fullscreen .gallery-content>.cy-media,.cy-gallery.media-expanded .gallery-content>.cy-media{height:100%;display:flex;flex-direction:column}.cy-gallery:fullscreen .gallery-content .media-stage,.cy-gallery.media-expanded .gallery-content .media-stage{flex:1;min-height:200px;height:auto}`);
    host.className = 'cy-media cy-gallery';
    host.innerHTML = `<div class="media-toolbar"><span class="media-title">${escape(config.title || t('Galerie', 'Gallery'))}</span><button type="button" class="media-icon-button" data-gallery="previous" aria-label="${t('Média précédent', 'Previous media')}">${mediaIcon('previous')}</button><output class="gallery-counter" aria-live="polite"></output><button type="button" class="media-icon-button" data-gallery="next" aria-label="${t('Média suivant', 'Next media')}">${mediaIcon('next')}</button>${fullscreenButton(locale)}</div><div class="gallery-content" role="tabpanel" aria-label="${t('Média sélectionné', 'Selected media')}"></div><div class="gallery-tabs" role="tablist" aria-label="${t('Éléments de la galerie', 'Gallery items')}">${items.map((item, i) => `<button type="button" role="tab" class="gallery-tab" data-index="${i}" aria-selected="false">${['image','gif'].includes(String(item.type)) ? `<img src="${escape(localAsset(item.src))}" alt="" loading="lazy">` : `<span class="gallery-kind" aria-hidden="true">${item.type === 'mesh' ? '◇' : '▷'}</span>`}<span>${escape(item.title || item.alt || `${item.type} ${i + 1}`)}</span></button>`).join('')}</div>`;
    watchFullscreen(host, signal);
    const pane = host.querySelector<HTMLElement>('.gallery-content')!;
    let index = 0, generation = 0;
    let childAbort: AbortController | undefined;
    let cleanup: (() => void) | undefined;
    const teardown = () => { childAbort?.abort(); cleanup?.(); cleanup = undefined; };
    async function show(next: number) {
      const token = ++generation;
      teardown(); index = (next + items.length) % items.length;
      const item = items[index]!;
      childAbort = new AbortController(); const childSignal = childAbort.signal;
      pane.innerHTML = ''; const child = document.createElement('div'); pane.append(child);
      host.querySelector('output')!.textContent = `${index + 1} / ${items.length}`;
      host.querySelectorAll<HTMLButtonElement>('[role=tab]').forEach((button, i) => { button.setAttribute('aria-selected', String(i === index)); button.tabIndex = i === index ? 0 : -1; });
      try {
        if (!context.loadModule) throw new Error('Gallery requires a module provider');
        const module = await context.loadModule(String(item.type));
        if (signal.aborted || childSignal.aborted || token !== generation) return;
        const dispose = await module.mount(child, item, { ...context, signal: childSignal, state:context.state, linkState:context.linkState ? state=>context.linkState!({...state,item:String(index)}) : undefined, storageKey: `${context.storageKey}:gallery:${index}` });
        if (dispose) { if (childSignal.aborted || token !== generation) dispose(); else cleanup = dispose; }
      } catch (error) {
        if (childSignal.aborted || token !== generation) return;
        child.className = 'gallery-fallback';
        child.innerHTML = `<p>${t('Activez le module de ce média dans votre application.', 'Enable this media module in the host application.')}</p><a href="${escape(localAsset(item.src))}">${escape(item.title || item.type)}</a>`;
      }
    }
    host.addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button'); if (!button) return;
      if (button.hasAttribute('data-index')) void show(Number(button.dataset.index));
      if (button.dataset.gallery === 'previous') void show(index - 1);
      if (button.dataset.gallery === 'next') void show(index + 1);
      if (button.dataset.action === 'fullscreen' && button.closest('.cy-media') === host) void fullscreen(host).catch(() => host.classList.toggle('media-expanded'));
    }, { signal });
    host.querySelector('.gallery-tabs')!.addEventListener('keydown', ((event: KeyboardEvent) => {
      const next = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : undefined;
      if (next !== undefined) { event.preventDefault(); void show(next); host.querySelector<HTMLButtonElement>(`[data-index="${index}"]`)?.focus(); }
    }) as EventListener, { signal });
    const first = Math.max(0, Math.min(items.length-1, Number(context.state?.item)||0));
    void show(first);
    bindMediaState(host, {...context, linkState:undefined}, state => {
      const next=Math.max(0,Math.min(items.length-1,Number(state.item)||0));
      context={...context,state};
      if(next!==index)void show(next);else pane.firstElementChild?.dispatchEvent(new window.CustomEvent('cydoc:state',{detail:state}));
    },()=>({item:String(index)}));
    return () => { ++generation; teardown(); };
  }
};
export default galleryModule;
