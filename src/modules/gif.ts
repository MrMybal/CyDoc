import type { MediaModule } from '../types.js';
import { decodeGif, type GifAnimation } from './gif-decode.js';
import { unpackAsset } from './mesh-assets.js';
import { addStyles, commonStyles, escape, localAsset, expandButton, watchExpansion, mediaPresentation, comparisonHandle, bindMediaState, clamp } from './shared.js';

const gifModule: MediaModule = {
  async mount(host, config, context) {
    const { locale, signal } = context, fr = locale.startsWith('fr'), t = (a: string, b: string) => fr ? a : b;
    const sources = [localAsset(config.src), ...(config.compare ? [localAsset(config.compare)] : [])];
    addStyles('cydoc-gif-style', commonStyles + `.cy-gif .gif-layer{position:absolute;inset:0;display:grid;place-items:center;overflow:hidden}.cy-gif canvas{width:100%;height:100%;object-fit:contain;max-height:none!important;transform-origin:center;image-rendering:auto}.cy-gif .media-stage{touch-action:none;cursor:grab}.cy-gif .gif-controls{display:flex;align-items:center;gap:8px;padding:12px;flex-wrap:wrap}.cy-gif .gif-controls input{flex:1;min-width:70px}.cy-gif .gif-controls output{font-size:10px;font-variant-numeric:tabular-nums}`);
    host.className = 'cy-media cy-gif';
    host.innerHTML = `<div class="media-toolbar"><span class="media-title">${escape(config.title || 'GIF')}</span><button type="button" data-gif="out" aria-label="${t('Dézoomer', 'Zoom out')}">−</button><button type="button" data-gif="in" aria-label="${t('Zoomer', 'Zoom in')}">+</button><button type="button" data-gif="reset">${t('Recentrer', 'Reset view')}</button>${expandButton(locale)}</div><div class="media-stage" tabindex="0" aria-label="${t('GIF contrôlable', 'Controllable GIF')}">${sources.map((_, i) => `<div class="gif-layer ${i ? 'gif-compare' : ''}"><canvas aria-label="GIF ${i ? 'B' : 'A'}"></canvas></div>`).join('')}${sources.length > 1 ? '<span class="compare-label left">A</span><span class="compare-label right">B</span><div class="compare-divider"></div>' : ''}</div><div class="gif-controls"><button type="button" data-gif="play">▶ ${t('Lire', 'Play')}</button><button type="button" data-gif="previous" aria-label="${t('Image précédente', 'Previous frame')}">Ⅰ◀</button><button type="button" data-gif="next" aria-label="${t('Image suivante', 'Next frame')}">▶Ⅰ</button><input type="range" min="0" max="0" value="0" step="1" aria-label="${t('Image du GIF', 'GIF frame')}"><output>…</output></div>${sources.length > 1 ? `<label class="media-compare-control"><span>A</span><input class="gif-wipe" type="range" min="0" max="100" value="50" aria-label="${t('Comparaison des GIF', 'GIF comparison')}"><span>B</span></label>` : ''}<div class="media-caption">${t('Lecture synchronisée en temps · Pause et pas image par image · Molette : zoom · Glisser : déplacer', 'Time-synchronized playback · Pause and frame stepping · Scroll: zoom · Drag: pan')}</div><div class="media-error" role="status"></div>`;
    watchExpansion(host, signal);
    const stage = host.querySelector<HTMLElement>('.media-stage')!, canvases = [...host.querySelectorAll('canvas')];
    const slider = host.querySelector<HTMLInputElement>('.gif-controls input')!, output = host.querySelector('output')!;
    let animations: GifAnimation[] = [], index = 0, playing = false, timer: ReturnType<typeof setTimeout> | undefined, zoom = 1, x = 0, y = 0, disposed = false, completedLoops = 0;
    let wantsPlayback = false, visible = true;
    let pending = context.state;
    function transform() { canvases.forEach(canvas => canvas.style.transform = `translate(${x}px,${y}px) scale(${zoom})`); }
    function pause(remember = false) { if (!remember) wantsPlayback = false; playing = false; clearTimeout(timer); host.querySelector('[data-gif=play]')!.textContent = `▶ ${t('Lire', 'Play')}`; }
    function play() {
      wantsPlayback = true;
      if (playing || !visible || document.hidden || !animations.length || disposed || signal.aborted) return;
      playing = true; completedLoops = 0; host.querySelector('[data-gif=play]')!.textContent = `Ⅱ ${t('Pause', 'Pause')}`; tick();
    }
    function draw() {
      const main = animations[0]; if (!main || disposed || signal.aborted) return;
      index = clamp(Math.trunc(index), 0, main.frames.length - 1);
      const time = main.frames.slice(0, index).reduce((sum, frame) => sum + frame.duration, 0);
      animations.forEach((animation, i) => {
        let frameIndex = index;
        if (i) { let remaining = time % animation.frames.reduce((sum, frame) => sum + frame.duration, 0); frameIndex = 0; while (frameIndex < animation.frames.length - 1 && remaining >= animation.frames[frameIndex]!.duration) remaining -= animation.frames[frameIndex++]!.duration; }
        const canvas = canvases[i]!, frame = animation.frames[frameIndex]!;
        canvas.width = animation.width; canvas.height = animation.height;
        const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas 2D is unavailable');
        ctx.putImageData(new ImageData(new Uint8ClampedArray(frame.rgba), animation.width, animation.height), 0, 0);
      });
      slider.value = String(index); output.textContent = `${index + 1} / ${main.frames.length} · ${(time / 1000).toFixed(2)} s`;
    }
    function tick() {
      if (!playing || disposed || signal.aborted || !animations[0]) return;
      draw(); timer = setTimeout(() => { if (++index >= animations[0]!.frames.length) { index = 0; completedLoops++; if (animations[0]!.loops > 0 && completedLoops > animations[0]!.loops) { index = animations[0]!.frames.length - 1; pause(); draw(); return; } } tick(); }, animations[0].frames[index]!.duration);
    }
    const wipe = host.querySelector<HTMLInputElement>('.gif-wipe');
    const setWipe = wipe ? comparisonHandle(host, wipe, locale, signal, value => { host.querySelector<HTMLElement>('.gif-compare')!.style.clipPath = `inset(0 0 0 ${value}%)`; }) : undefined;
    bindMediaState(host, context, state => { pending = state; if (state.frame !== undefined) { pause(); index = Math.max(0, Math.trunc(Number(state.frame) || 0)); } if (state.zoom !== undefined) zoom = clamp(Number(state.zoom) || 1, .25, 12); if(state.x!==undefined)x=(Number(state.x)||0)*stage.clientWidth;if(state.y!==undefined)y=(Number(state.y)||0)*stage.clientHeight; if (state.wipe !== undefined) setWipe?.(Number(state.wipe) || 0); transform(); draw(); }, () => ({ frame: String(index), zoom: String(zoom), x:String(x/Math.max(stage.clientWidth,1)),y:String(y/Math.max(stage.clientHeight,1)), ...(wipe ? { wipe: wipe.value } : {}) }));
    host.addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button'); if (!button) return;
      const action = button.dataset.gif;
      if (action === 'play' && animations.length) { if (playing) pause(); else play(); }
      if (action === 'next' || action === 'previous') { pause(); index += action === 'next' ? 1 : -1; draw(); }
      if (action === 'in' || action === 'out') { zoom = clamp(zoom * (action === 'in' ? 1.25 : .8), .25, 12); transform(); }
      if (action === 'reset') { x = y = 0; zoom = 1; transform(); }
    }, { signal });
    slider.addEventListener('input', () => { pause(); index = Number(slider.value); draw(); }, { signal });
    stage.addEventListener('wheel', event => { event.preventDefault(); zoom = clamp(zoom * Math.exp(-event.deltaY * .002), .25, 12); transform(); }, { passive: false, signal });
    let pointer: { id: number; x: number; y: number } | undefined;
    stage.addEventListener('pointerdown', event => { pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; stage.setPointerCapture?.(event.pointerId); }, { signal });
    stage.addEventListener('pointermove', event => { if (pointer?.id !== event.pointerId) return; x += event.clientX - pointer.x; y += event.clientY - pointer.y; pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; transform(); }, { signal });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) stage.addEventListener(type, () => { pointer = undefined; }, { signal });
    stage.addEventListener('keydown', event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); pause(); index += event.key === 'ArrowRight' ? 1 : -1; draw(); } }, { signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true); else if (wantsPlayback) play(); }, { signal });
    const visibility = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (!visible) pause(true); else if (wantsPlayback) play();
    }) : undefined;
    visibility?.observe(host);
    void Promise.all(sources.map(async src => {
      if (!context.loadAsset) throw new Error('GIF controls require the local asset provider');
      const packed = await context.loadAsset(src); if (disposed || signal.aborted) return;
      return decodeGif(new Uint8Array(unpackAsset(packed)), Number(config.maxDecodedMiB) > 0 ? Math.min(Number(config.maxDecodedMiB), 256) * 1024 * 1024 : 64 * 1024 * 1024);
    })).then(result => {
      if (disposed || signal.aborted) return;
      animations = result.filter(Boolean) as GifAnimation[]; slider.max = String(animations[0]!.frames.length - 1);
      if (pending?.frame !== undefined) index = Number(pending.frame) || 0;
      draw();
      const autoplay = config.autoplay === true || (config.controls === 'minimal' && config.autoplay !== false);
      if (autoplay && pending?.frame === undefined && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) play();
    }).catch(error => { if (!disposed && !signal.aborted) host.querySelector('.media-error')!.textContent = error instanceof Error ? error.message : String(error); });
    mediaPresentation(host, config, context);
    const cleanup = () => { if (disposed) return; disposed = true; pause(); visibility?.disconnect(); animations = []; canvases.forEach(canvas => { canvas.width = canvas.height = 0; }); };
    signal.addEventListener('abort', cleanup, { once: true });
    return cleanup;
  }
};
export default gifModule;
