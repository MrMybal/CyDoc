import type { MediaModule } from '../types.js';
import { addStyles, commonStyles, comparisonHandle, fullscreenButton, watchFullscreen, escape, localAsset, fullscreen, clamp, readSaved, writeSaved, saveJson, bindMediaState } from './shared.js';

interface Annotation { id: string; time: number; duration: number; text: string; x: number; y: number }
function annotations(value: unknown): Annotation[] {
  if (!Array.isArray(value)) return [];
  return value.filter(item => item && Number.isFinite(item.time) && typeof item.text === 'string').map((item, i) => ({ id: String(item.id || `note-${i}`), time: Math.max(0, item.time), duration: Math.max(0.2, Number(item.duration) || 4), text: item.text.slice(0, 500), x: clamp(Number(item.x) || 0.5, 0, 1), y: clamp(Number(item.y) || 0.2, 0, 1) }));
}
const timeLabel = (time: number) => `${Math.floor(time / 60)}:${Math.floor(time % 60).toString().padStart(2, '0')}`;
const videoModule: MediaModule = {
  mount(host, config, context) {
    const { locale, signal, storageKey } = context;
    const fr = locale.startsWith('fr'); const t = (a: string, b: string) => fr ? a : b;
    const src = localAsset(config.src); const compare = config.compare ? localAsset(config.compare) : '';
    const sourceTag = (source: string, variants: unknown) => {
      const list = Array.isArray(variants) && variants.length ? variants : [{ src: source }];
      return list.map(item => `<source src="${escape(localAsset(item.src))}"${item.type ? ` type="${escape(item.type)}"` : ''}>`).join('');
    };
    addStyles('cydoc-video-style', commonStyles + `.cy-video .video-layer{position:absolute;inset:0;pointer-events:none}.cy-video .video-layer video{width:100%;height:100%;max-height:none!important;object-fit:contain;border:0!important;border-radius:0!important;background:transparent!important}.cy-video .video-annotations{position:absolute;inset:0;pointer-events:none;z-index:5}.cy-video .video-note{position:absolute;max-width:70%;transform:translateX(-50%);background:#102a24e8;border:1px solid #7adab1;border-radius:6px;color:#e0ffef;padding:7px 12px;font-size:12px;box-shadow:0 3px 10px #0004}.cy-video .video-controls{display:flex;gap:8px;padding:10px 12px;align-items:center;flex-wrap:wrap}.cy-video .video-timeline{flex:1;min-width:90px}.cy-video .video-time{font-size:10px;font-variant-numeric:tabular-nums}.cy-video .video-controls select{max-width:75px}.cy-video .video-hint{font-size:10px;color:var(--muted,#647386);padding:0 12px 8px}`);
    host.className = 'cy-media cy-video';
    host.innerHTML = `<div class="media-toolbar"><span class="media-title">${escape(config.title || t('Vidéo annotée', 'Annotated video'))}</span><button type="button" data-action="export">${t('Exporter les annotations', 'Export annotations')}</button>${fullscreenButton(locale)}</div><div class="media-stage"><div class="video-layer"><video playsinline preload="metadata" aria-label="${t('Vidéo principale', 'Primary video')}">${sourceTag(src, config.sources)}</video></div>${compare ? `<div class="video-layer video-compare"><video playsinline preload="metadata" muted aria-label="${t('Vidéo comparée', 'Comparison video')}">${sourceTag(compare, config.compareSources)}</video></div><span class="compare-label left">A</span><span class="compare-label right">B</span><div class="compare-divider"></div>` : ''}<div class="video-annotations"></div></div><div class="video-controls"><button type="button" data-action="play">▶ ${t('Lire', 'Play')}</button><button type="button" data-action="previous-frame" aria-label="${t('Image précédente', 'Previous frame')}">Ⅰ◀</button><button type="button" data-action="next-frame" aria-label="${t('Image suivante', 'Next frame')}">▶Ⅰ</button><input class="video-timeline" type="range" min="0" max="100" step="0.01" value="0" aria-label="${t('Position de lecture', 'Playback position')}"><output class="video-time">0:00 / 0:00</output><select aria-label="${t('Vitesse de lecture', 'Playback speed')}"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select><button type="button" data-action="mute" aria-pressed="false">${t('Son', 'Sound')}</button></div>${compare ? `<label class="media-compare-control"><span>A</span><input class="video-wipe" type="range" min="0" max="100" value="50" aria-label="${t('Comparaison des vidéos', 'Video comparison')}"><span>B</span></label>` : ''}<form class="annotation-form"><input name="text" maxlength="500" required placeholder="${t('Annotation au moment actuel…', 'Annotation at the current time…')}" aria-label="${t('Texte de l’annotation', 'Annotation text')}"><button type="submit">＋ ${t('Annoter', 'Annotate')}</button></form><p class="video-hint">${t('Cliquez dans la vidéo pour placer la prochaine annotation. Notes conservées sur cet appareil.', 'Click the video to position the next annotation. Notes are saved on this device.')}</p><div class="annotation-list"></div><div class="media-error" role="status"></div>`;
    const videos = [...host.querySelectorAll<HTMLVideoElement>('video')]; const primary = videos[0]!; const secondary = videos[1];
    const timeline = host.querySelector<HTMLInputElement>('.video-timeline')!;
    watchFullscreen(host, signal);
    const stage = host.querySelector<HTMLElement>('.media-stage')!;
    const key = `cydoc:annotations:video:${storageKey}:${src}`;
    let notes = annotations(readSaved(key, config.annotations));
    let position = { x: 0.5, y: 0.2 };
    let frame = 0, selectedNote = '';
    let pendingTime: number | undefined;
    const fps = clamp(Number(config.fps) || 30, 1, 240);
    host.querySelector('[data-action=next-frame]')!.setAttribute('title', `1 / ${fps} s`);
    const showError = (message: string) => { host.querySelector('.media-error')!.textContent = message; };
    function paint() {
      host.querySelector('.video-annotations')!.innerHTML = notes.filter(note => primary.currentTime >= note.time && primary.currentTime <= note.time + note.duration).map(note => `<span class="video-note" style="left:${note.x * 100}%;top:${note.y * 100}%">${escape(note.text)}</span>`).join('');
      timeline.value = String(primary.currentTime);
      host.querySelector('.video-time')!.textContent = `${timeLabel(primary.currentTime)} / ${timeLabel(Number.isFinite(primary.duration) ? primary.duration : 0)}`;
    }
    function list() {
      writeSaved(key, notes);
      host.querySelector('.annotation-list')!.innerHTML = notes.map(note => `<span class="annotation-chip"><button type="button" data-note="${escape(note.id)}">${timeLabel(note.time)} · ${escape(note.text)}</button><button type="button" data-delete="${escape(note.id)}" aria-label="${t('Supprimer', 'Delete')} ${escape(note.text)}">×</button></span>`).join(''); paint();
    }
    function tick() {
      if (signal.aborted || primary.paused) return;
      if (secondary && Number.isFinite(secondary.duration) && Math.abs(secondary.currentTime - primary.currentTime) > 0.12) secondary.currentTime = Math.min(primary.currentTime, secondary.duration);
      paint(); frame = requestAnimationFrame(tick);
    }
    function pause() { videos.forEach(video => video.pause()); cancelAnimationFrame(frame); host.querySelector('[data-action=play]')!.textContent = `▶ ${t('Lire', 'Play')}`; }
    const seek = (time: number) => { if(!Number.isFinite(primary.duration))pendingTime=time; videos.forEach(video => { if (Number.isFinite(video.duration)) video.currentTime = Math.max(0,Math.min(time, video.duration)); }); paint(); };
    host.addEventListener('click', event => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('button'); if (!target) return;
      const action = target.dataset.action;
      if (action === 'play') {
        if (!primary.paused) pause();
        else void Promise.all(videos.map(video => video.play())).then(() => { if(signal.aborted){pause();return;} target.textContent = `Ⅱ ${t('Pause', 'Pause')}`; tick(); }).catch(() => { pause(); if(!signal.aborted)showError(t('Lecture impossible : vérifiez le codec ou choisissez une autre source.', 'Playback failed: check the codec or select another source.')); });
      }
      if (action === 'previous-frame' || action === 'next-frame') { pause(); seek(Math.max(0, primary.currentTime + (action === 'next-frame' ? 1 : -1) / fps)); }
      if (action === 'mute') { primary.muted = !primary.muted; target.setAttribute('aria-pressed', String(primary.muted)); target.textContent = primary.muted ? t('Muet', 'Muted') : t('Son', 'Sound'); }
      if (action === 'fullscreen') void fullscreen(host).catch(() => host.classList.toggle('media-expanded'));
      if (action === 'export') saveJson({ type: 'cydoc-video-annotations', version: 1, src, annotations: notes }, 'video-annotations.json');
      if (target.dataset.note) { const note = notes.find(note => note.id === target.dataset.note); if (note) { selectedNote = note.id; seek(note.time); } }
      if (target.dataset.delete) { notes = notes.filter(note => note.id !== target.dataset.delete); list(); }
    }, { signal });
    primary.addEventListener('loadedmetadata', () => { timeline.max = String(primary.duration); if (pendingTime !== undefined) {seek(pendingTime);pendingTime=undefined;} paint(); }, { signal });
    secondary?.addEventListener('loadedmetadata',()=>seek(primary.currentTime),{signal});
    primary.addEventListener('timeupdate', paint, { signal });
    primary.addEventListener('ended', pause, { signal });
    for (const video of videos) video.addEventListener('error', () => showError(t('Aucun codec compatible pour cette vidéo. Proposez un MP4 H.264 de repli.', 'No compatible codec for this video. Provide an H.264 MP4 fallback.')), { signal });
    timeline.addEventListener('input', () => seek(Number(timeline.value)), { signal });
    host.querySelector('select')!.addEventListener('change', event => videos.forEach(video => video.playbackRate = Number((event.target as HTMLSelectElement).value)), { signal });
    const wipeSlider = host.querySelector<HTMLInputElement>('.video-wipe');
    const setWipe = wipeSlider ? comparisonHandle(host, wipeSlider, locale, signal, value => {
      host.querySelector<HTMLElement>('.video-compare')!.style.clipPath = `inset(0 0 0 ${value}%)`;
    }) : undefined;
    stage.addEventListener('click', event => { const rect = stage.getBoundingClientRect(); position = { x: clamp((event.clientX - rect.left) / rect.width, 0.1, 0.9), y: clamp((event.clientY - rect.top) / rect.height, 0.05, 0.85) }; }, { signal });
    host.querySelector('form')!.addEventListener('submit', event => {
      event.preventDefault(); const input = host.querySelector<HTMLInputElement>('.annotation-form input')!;
      const text = input.value.trim(); if (!text) return;
      pause(); notes.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, time: primary.currentTime, duration: 4, text, ...position }); notes.sort((a, b) => a.time - b.time); input.value = ''; list();
    }, { signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); }, { signal });
    list();
    bindMediaState(host, context, state => {
      if(state.note){const note=notes.find(note=>note.id===state.note);if(note){selectedNote=note.id;pendingTime=note.time;}}
      if(state.time !== undefined && Number.isFinite(Number(state.time))) pendingTime=Math.max(0,Number(state.time));
      if(pendingTime !== undefined){pause();seek(pendingTime);}
      if(state.wipe !== undefined) setWipe?.(Number(state.wipe)||0);
    }, () => ({time:String(Math.round(primary.currentTime*1000)/1000), ...(wipeSlider?{wipe:wipeSlider.value}:{}), ...(selectedNote?{note:selectedNote}:{})}));
    return () => { pause(); videos.forEach(video => { video.removeAttribute('src'); video.querySelectorAll('source').forEach(source => source.remove()); video.load(); }); };
  }
};
export default videoModule;
