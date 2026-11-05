import type { MediaModule } from '../types.js';
import { addStyles, commonStyles, comparisonHandle, fullscreenButton, watchFullscreen, escape, localAsset, clamp, fullscreen, bindMediaState, readSaved, writeSaved, saveJson } from './shared.js';

const imageModule: MediaModule = {
  mount(host, config, context) {
    const { locale, signal, storageKey } = context;
    const fr = locale.startsWith('fr'); const t = (a: string, b: string) => fr ? a : b;
    const src = localAsset(config.src); const compare = config.compare ? localAsset(config.compare) : '';
    const labels = Array.isArray(config.labels) ? config.labels.map(String) : [t('Avant', 'Before'), t('Après', 'After')];
    addStyles('cydoc-image-style', commonStyles + `.cy-image .image-pan{position:absolute;inset:0;touch-action:none;cursor:grab}.cy-image .image-pan:active{cursor:grabbing}.cy-image .image-layer{position:absolute;inset:0}.cy-image .image-layer img{width:100%;height:100%;object-fit:contain;max-height:none!important;border:0!important;border-radius:0!important;background:transparent!important;pointer-events:none;user-select:none;transform-origin:center}.cy-image .zoom-value{font-variant-numeric:tabular-nums;font-size:10px;min-width:35px;text-align:center}`);
    host.className = 'cy-media cy-image';
    host.innerHTML = `<div class="media-toolbar"><span class="media-title">${escape(config.title || config.alt || t('Image interactive', 'Interactive image'))}</span><button type="button" data-action="out" aria-label="${t('Dézoomer', 'Zoom out')}">−</button><output class="zoom-value">100%</output><button type="button" data-action="in" aria-label="${t('Zoomer', 'Zoom in')}">+</button><button type="button" data-action="reset">${t('Recentrer', 'Reset view')}</button>${fullscreenButton(locale)}</div><div class="media-stage" tabindex="0" aria-label="${t('Image : molette pour zoomer, glisser pour déplacer', 'Image: scroll to zoom, drag to pan')}"><div class="image-pan"><div class="image-layer"><img src="${escape(src)}" alt="${escape(config.alt)}" draggable="false"></div>${compare ? `<div class="image-layer image-compare"><img src="${escape(compare)}" alt="${escape(labels[1])}" draggable="false"></div>` : ''}</div>${compare ? `<span class="compare-label left">${escape(labels[0])}</span><span class="compare-label right">${escape(labels[1])}</span><div class="compare-divider"></div>` : ''}</div>${compare ? `<label class="media-compare-control"><span>${escape(labels[0])}</span><input type="range" min="0" max="100" value="50" aria-label="${t('Comparaison des images', 'Image comparison')}"><span>${escape(labels[1])}</span></label>` : ''}<div class="media-caption"><span>${t('Molette : zoom · Glisser : déplacer · Double-clic : recentrer', 'Scroll: zoom · Drag: pan · Double-click: reset')}</span><span>${compare ? 'A / B' : ''}</span></div><div class="media-error" role="status"></div>`;
    watchFullscreen(host, signal);
    const stage = host.querySelector<HTMLElement>('.media-stage')!;
    const pan = host.querySelector<HTMLElement>('.image-pan')!;
    const images = [...host.querySelectorAll<HTMLImageElement>('.image-layer img')];
    let zoom = 1, x = 0, y = 0;
    type Mark = { id: string; type: string; x: number; y: number; toX: number; toY: number; label: string };
    const noteKey = `cydoc:image-marks:${storageKey}:${src}`;
    const rawNotes = readSaved<unknown>(noteKey, config.annotations || []);
    let marks: Mark[] = Array.isArray(rawNotes) ? rawNotes.filter(note => note && ['arrow', 'rect'].includes(note.type) && [note.x, note.y, note.toX, note.toY].every(Number.isFinite)).map((note, i) => ({ ...note, id: String(note.id || `mark-${i}`), label: String(note.label || '') })) : [];
    let selectedMark = '';
    const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); overlay.classList.add('image-markup');
    overlay.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;transform-origin:center'; pan.append(overlay);
    const tools = document.createElement('div'); tools.className = 'annotation-form';
    tools.innerHTML = `<select class="image-tool" aria-label="${t('Outil image', 'Image tool')}"><option value="pan">${t('Déplacer', 'Pan')}</option><option value="arrow">${t('Dessiner une flèche', 'Draw arrow')}</option><option value="rect">${t('Tracer une zone', 'Draw area')}</option></select><input class="image-note-text" maxlength="500" placeholder="${t('Libellé de la flèche ou de la zone…', 'Arrow or area label…')}" aria-label="${t('Libellé de l’annotation', 'Annotation label')}"><button type="button" data-image-export>${t('Exporter', 'Export')}</button>`;
    host.querySelector('.media-caption')!.before(tools);
    const markList = document.createElement('div'); markList.className = 'annotation-list'; tools.after(markList);
    const dimensions = () => ({ w: images[0]!.naturalWidth || stage.clientWidth || 1000, h: images[0]!.naturalHeight || stage.clientHeight || 600 });
    function paintMarks(preview?: Mark) {
      const { w, h } = dimensions(), unit = Math.max(w, h) / 400;
      overlay.setAttribute('viewBox', `0 0 ${w} ${h}`);
      overlay.innerHTML = [...marks, ...(preview ? [preview] : [])].map(note => {
        const a = { x: note.x * w, y: note.y * h }, b = { x: note.toX * w, y: note.toY * h }, color = note.id === selectedMark ? '#ffe28b' : '#80e1bc';
        const angle = Math.atan2(b.y - a.y, b.x - a.x), size = unit * 7;
        const shape = note.type === 'rect' ? `<rect x="${Math.min(a.x,b.x)}" y="${Math.min(a.y,b.y)}" width="${Math.abs(b.x-a.x)}" height="${Math.abs(b.y-a.y)}" fill="#7fe1bb19"/>` : `<path d="M${a.x},${a.y} L${b.x},${b.y} M${b.x-size*Math.cos(angle-.5)},${b.y-size*Math.sin(angle-.5)} L${b.x},${b.y} L${b.x-size*Math.cos(angle+.5)},${b.y-size*Math.sin(angle+.5)}"/>`;
        return `<g stroke="${color}" stroke-width="${unit}" fill="none">${shape}<text x="${a.x}" y="${Math.max(unit*12,a.y-unit*5)}" fill="${color}" stroke="#14242d" stroke-width="${unit}" paint-order="stroke" font-size="${unit*8}" font-family="system-ui">${escape(note.label)}</text></g>`;
      }).join('');
    }
    function listMarks() {
      writeSaved(noteKey, marks);
      markList.innerHTML = marks.map(note => `<span class="annotation-chip"><button type="button" data-image-note="${escape(note.id)}" aria-pressed="${selectedMark === note.id}">${escape(note.label || note.type)}</button><button type="button" data-image-delete="${escape(note.id)}" aria-label="${t('Supprimer', 'Delete')}">×</button></span>`).join(''); paintMarks();
    }
    const point = (event: PointerEvent) => {
      const box = stage.getBoundingClientRect(), {w,h} = dimensions(), fit = Math.min(box.width/w,box.height/h);
      return { x: clamp(((event.clientX-box.left-box.width/2-x)/zoom + w*fit/2)/(w*fit),0,1), y: clamp(((event.clientY-box.top-box.height/2-y)/zoom + h*fit/2)/(h*fit),0,1) };
    };
    let drawing: Mark | undefined, drawingPointer: number | undefined;
    pan.addEventListener('pointerdown', event => {
      const type = tools.querySelector<HTMLSelectElement>('select')!.value; if (type === 'pan') return;
      event.preventDefault(); event.stopImmediatePropagation(); pan.setPointerCapture?.(event.pointerId); drawingPointer = event.pointerId;
      const start = point(event); drawing = { id: `mark-${Date.now()}`, type, ...start, toX:start.x, toY:start.y, label: tools.querySelector<HTMLInputElement>('input')!.value.trim() }; paintMarks(drawing);
    }, { signal, capture:true });
    pan.addEventListener('pointermove', event => { if (drawing && drawingPointer === event.pointerId) { event.stopImmediatePropagation(); const end = point(event); drawing.toX=end.x; drawing.toY=end.y; paintMarks(drawing); } }, { signal, capture:true });
    for (const eventName of ['pointerup','pointercancel']) pan.addEventListener(eventName, ((event: PointerEvent) => {
      if (!drawing || drawingPointer !== event.pointerId) return; event.stopImmediatePropagation();
      if (event.type === 'pointerup' && Math.hypot(drawing.toX-drawing.x,drawing.toY-drawing.y) > .005) { marks.push(drawing); selectedMark=drawing.id; }
      drawing=undefined; drawingPointer=undefined; listMarks();
    }) as EventListener, { signal, capture:true });
    for (const image of images) image.addEventListener('load', () => paintMarks(), { signal });
    host.addEventListener('click', event => {
      const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button'); if(!button)return;
      if(button.dataset.imageNote){selectedMark=button.dataset.imageNote;listMarks();}
      if(button.dataset.imageDelete){marks=marks.filter(note=>note.id!==button.dataset.imageDelete);listMarks();}
      if(button.hasAttribute('data-image-export')) saveJson({type:'cydoc-image-annotations',version:1,src,annotations:marks},'image-annotations.json');
    },{signal});
    const pointers = new Map<number, { x: number; y: number }>();
    let previousDistance = 0;
    function draw() {
      const box = stage.getBoundingClientRect();
      x = clamp(x, -box.width * Math.max(zoom, 1), box.width * Math.max(zoom, 1));
      y = clamp(y, -box.height * Math.max(zoom, 1), box.height * Math.max(zoom, 1));
      [...images, overlay].forEach(image => image.style.transform = `translate(${x}px,${y}px) scale(${zoom})`);
      host.querySelector('output')!.textContent = `${Math.round(zoom * 100)}%`;
    }
    function setZoom(value: number, cx = stage.clientWidth / 2, cy = stage.clientHeight / 2) {
      const next = clamp(value, 0.25, 12), ratio = next / zoom;
      x = (x - cx + stage.clientWidth / 2) * ratio + cx - stage.clientWidth / 2;
      y = (y - cy + stage.clientHeight / 2) * ratio + cy - stage.clientHeight / 2;
      zoom = next; draw();
    }
    const reset = () => { zoom = 1; x = y = 0; draw(); };
    host.addEventListener('click', event => {
      const action = (event.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
      if (action === 'in') setZoom(zoom * 1.25);
      if (action === 'out') setZoom(zoom / 1.25);
      if (action === 'reset') reset();
      if (action === 'fullscreen') void fullscreen(host).catch(() => host.classList.toggle('media-expanded'));
    }, { signal });
    stage.addEventListener('wheel', event => { event.preventDefault(); const bounds = stage.getBoundingClientRect(); setZoom(zoom * Math.exp(-event.deltaY * 0.002), event.clientX - bounds.left, event.clientY - bounds.top); }, { passive: false, signal });
    stage.addEventListener('dblclick', reset, { signal });
    stage.addEventListener('keydown', event => {
      if (['+', '=', '-', '0', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) event.preventDefault();
      if (event.key === '+' || event.key === '=') setZoom(zoom * 1.25);
      if (event.key === '-') setZoom(zoom / 1.25);
      if (event.key === '0') reset();
      if (event.key === 'ArrowLeft') x -= 25; if (event.key === 'ArrowRight') x += 25;
      if (event.key === 'ArrowUp') y -= 25; if (event.key === 'ArrowDown') y += 25; draw();
    }, { signal });
    pan.addEventListener('pointerdown', event => { pan.setPointerCapture(event.pointerId); pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); previousDistance = 0; }, { signal });
    pan.addEventListener('pointermove', event => {
      const previous = pointers.get(event.pointerId); if (!previous) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]; const distance = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        if (previousDistance) setZoom(zoom * distance / previousDistance); previousDistance = distance;
      } else { x += event.clientX - previous.x; y += event.clientY - previous.y; draw(); }
    }, { signal });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) pan.addEventListener(event, ((event: PointerEvent) => { pointers.delete(event.pointerId); previousDistance = 0; }) as EventListener, { signal });
    const slider = host.querySelector<HTMLInputElement>('input[type=range]');
    const setWipe = slider ? comparisonHandle(host, slider, locale, signal, value => {
      host.querySelector<HTMLElement>('.image-compare')!.style.clipPath = `inset(0 0 0 ${value}%)`;
    }) : undefined;
    listMarks();
    bindMediaState(host, context, state => {
      if (Number.isFinite(Number(state.zoom))) zoom = clamp(Number(state.zoom), .25, 12);
      if (state.x !== undefined) x = (Number(state.x) || 0) * stage.clientWidth;
      if (state.y !== undefined) y = (Number(state.y) || 0) * stage.clientHeight;
      if (state.wipe !== undefined) setWipe?.(Number(state.wipe) || 0);
      if (state.note) selectedMark = state.note;
      draw(); listMarks();
    }, () => ({ zoom:String(zoom), x:String(x/Math.max(stage.clientWidth,1)), y:String(y/Math.max(stage.clientHeight,1)), ...(slider ? {wipe:slider.value} : {}), ...(selectedMark ? {note:selectedMark} : {}) }));
    for (const image of images) image.addEventListener('error' , () => { host.querySelector('.media-error')!.textContent = t('Impossible de charger une image locale.', 'A local image could not be loaded.'); }, { signal });
  }
};
export default imageModule;
