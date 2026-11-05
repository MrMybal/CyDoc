import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { MediaModule } from '../types.js';
import { addStyles, commonStyles, comparisonHandle, expandButton, watchExpansion, escape, localAsset, mediaPresentation, saveJson, readSaved, writeSaved, bindMediaState } from './shared.js';
import { unpackAsset } from './mesh-assets.js';

interface MeshNote { id: string; text: string; position: [number, number, number]; scene: number; side?: string }
function validNotes(value: unknown): MeshNote[] {
  if (!Array.isArray(value)) return [];
  return value.filter(note => note && typeof note.text === 'string' && Array.isArray(note.position) && note.position.length === 3 && note.position.every(Number.isFinite)).map((note, i) => ({ id: String(note.id || `note-${i}`), text: note.text.slice(0, 500), position: note.position, scene: Number.isInteger(note.scene) ? note.scene : 0, side: note.side }));
}
const meshModule: MediaModule = {
  async mount(host, config, context) {
    const { locale, signal, storageKey, loadAsset } = context;
    const fr = locale.startsWith('fr'); const t = (a: string, b: string) => fr ? a : b;
    const src = localAsset(config.src); const compare = config.compare ? localAsset(config.compare) : '';
    addStyles('cydoc-mesh-style', commonStyles + `.cy-mesh canvas{display:block;width:100%;height:100%;touch-action:none}.cy-mesh .mesh-labels{position:absolute;inset:0;pointer-events:none;z-index:5}.cy-mesh .mesh-label{position:absolute;transform:translate(-50%,-100%);background:#142d2bd9;border:1px solid #91e3c3;border-radius:5px;padding:4px 8px;color:#dff9ee;max-width:180px;font-size:10px;white-space:normal}.cy-mesh .mesh-label:after{content:'';display:block;width:5px;height:5px;border-radius:50%;background:#91e3c3;position:absolute;bottom:-8px;left:50%}.cy-mesh .mesh-loading{position:absolute;inset:0;display:grid;place-items:center;color:#afbfce;font-size:12px;pointer-events:none}.cy-mesh .mesh-stats{font-size:10px;font-variant-numeric:tabular-nums}.cy-mesh .mesh-file{font-size:10px}.cy-mesh .mesh-file input{max-width:180px;font-size:10px}`);
    host.className = 'cy-media cy-mesh';
    host.innerHTML = `<div class="media-toolbar"><span class="media-title">${escape(config.title || t('Mesh statique · PBR', 'Static mesh · PBR'))}</span><select class="mesh-environment" aria-label="${t('Environnement lumineux', 'Lighting environment')}"><option value="studio">Studio</option><option value="daylight">${t('Lumière du jour', 'Daylight')}</option><option value="dark">${t('Sombre', 'Dark')}</option></select><select class="mesh-scene" aria-label="${t('Scène du modèle', 'Model scene')}"><option>Scene 1</option></select><button type="button" data-action="wireframe" aria-pressed="false">${t('Triangles', 'Wireframe')}</button><button type="button" data-action="reset">${t('Recentrer', 'Reset view')}</button>${expandButton(locale)}</div><div class="media-stage"><div class="mesh-labels"></div><div class="mesh-loading">${t('Chargement du modèle 3D…', 'Loading 3D model…')}</div>${compare ? '<span class="compare-label left">A</span><span class="compare-label right">B</span><div class="compare-divider"></div>' : ''}</div>${compare ? `<label class="media-compare-control"><span>A</span><input type="range" min="0" max="100" value="50" aria-label="${t('Comparaison des meshes', 'Mesh comparison')}"><span>B</span></label>` : ''}<div class="media-caption"><span>${t('Glisser : orbite · Molette : zoom · Clic droit : déplacement', 'Drag: orbit · Scroll: zoom · Right drag: pan')}</span><span class="mesh-stats"></span></div><form class="annotation-form"><input required maxlength="500" placeholder="${t('Texte puis double-clic sur la surface…', 'Type a note, then double-click the surface…')}" aria-label="${t('Annotation du mesh', 'Mesh annotation')}"><button type="button" data-action="export">${t('Exporter les annotations', 'Export annotations')}</button></form><div class="annotation-list"></div><label class="media-caption mesh-file">${t('Ouvrir un GLB local', 'Open a local GLB')}<input type="file" accept=".glb" aria-label="${t('Fichier mesh local', 'Local mesh file')}"></label><div class="media-error" role="status"></div>`;
    watchExpansion(host, signal);
    const stage = host.querySelector<HTMLElement>('.media-stage')!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' }); }
    catch { throw new Error(t('WebGL 2 est requis pour le module mesh.', 'The mesh module requires WebGL 2.')); }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    stage.prepend(renderer.domElement);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 1000);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = false;
    const scenes = [new THREE.Scene(), new THREE.Scene()];
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room).texture; room.dispose(); pmrem.dispose();
    for (const scene of scenes) {
      scene.environment = environment;
      scene.background = new THREE.Color('#18242d');
      scene.add(new THREE.HemisphereLight('#c4e3fa', '#33322d', 1.5));
      const light = new THREE.DirectionalLight('#ffffff', 3); light.position.set(4, 6, 3); scene.add(light);
    }
    const groups = [new THREE.Group(), new THREE.Group()]; scenes.forEach((scene, i) => scene.add(groups[i]!));
    let loaded: Array<GLTF | undefined> = [], activeScene = 0, wipe = 50, wireframe = false, disposed = false;
    const resources = new Set<THREE.Object3D>();
    const key = `cydoc:annotations:mesh:${storageKey}:${src}`;
    let notes = validNotes(readSaved(key, config.annotations));
    let selectedNote = '', pendingState = context.state;
    type View = { name:string; camera:[number,number,number]; target:[number,number,number]; scene:number; wire:boolean; environment:string };
    const validViews=(value:unknown):View[]=>Array.isArray(value)?value.filter(view=>view && typeof view.name==='string' && Array.isArray(view.camera) && view.camera.length===3 && view.camera.every(Number.isFinite) && Array.isArray(view.target) && view.target.length===3 && view.target.every(Number.isFinite)).slice(0,100):[];
    const viewKey=`cydoc:mesh-views:${storageKey}:${src}`;
    const builtInViews=validViews(config.views), savedViews=validViews(readSaved(viewKey,[]));
    const viewbar=document.createElement('div');viewbar.className='annotation-form mesh-views';
    viewbar.innerHTML=`<select aria-label="${t('Vues enregistrées','Saved views')}"></select><input maxlength="80" aria-label="${t('Nom de la vue','View name')}" placeholder="${t('Nom de cette vue…','Name this view…')}"><button type="button" data-save-view>${t('Enregistrer la vue','Save view')}</button>`;
    host.querySelector('.media-toolbar')!.after(viewbar);
    function viewMenu(){viewbar.querySelector('select')!.innerHTML=`<option value="">${t('Vues enregistrées','Saved views')}</option>`+[...builtInViews,...savedViews].map((view,i)=>`<option value="${i}">${escape(view.name)}</option>`).join('');}
    viewMenu();
    function captureView(name:string):View{return {name,camera:camera.position.toArray(),target:controls.target.toArray(),scene:activeScene,wire:wireframe,environment:host.querySelector<HTMLSelectElement>('.mesh-environment')!.value};}
    function restoreState(state:import('../types.js').ReaderState){
      pendingState=state;if(!loaded[0])return;
      if(state.scene!==undefined){const index=Math.max(0,Math.min(loaded[0].scenes.length-1,Math.trunc(Number(state.scene)||0)));if(index!==activeScene)chooseScene(index);host.querySelector<HTMLSelectElement>('.mesh-scene')!.value=String(index);}
      const vector=(value:string|undefined)=>{const numbers=value?.split(',').map(Number);return numbers?.length===3&&numbers.every(n=>Number.isFinite(n)&&Math.abs(n)<1e8)?numbers:undefined;};
      const position=vector(state.camera),target=vector(state.target);
      if(position)camera.position.fromArray(position);if(target)controls.target.fromArray(target);
      if(state.wire!==undefined){wireframe=state.wire==='true';host.querySelector('[data-action=wireframe]')!.setAttribute('aria-pressed',String(wireframe));materials();}
      if(state.note){const note=notes.find(note=>note.id===state.note);if(note){selectedNote=note.id;if(!position){const offset=camera.position.clone().sub(controls.target);controls.target.fromArray(note.position);camera.position.copy(controls.target).add(offset);}}}
      if(state.wipe!==undefined)setWipe?.(Number(state.wipe)||0);
      if(state.environment && ['studio','daylight','dark'].includes(state.environment)){const menu=host.querySelector<HTMLSelectElement>('.mesh-environment')!;menu.value=state.environment;menu.dispatchEvent(new window.Event('change'));}
      controls.update();render();
    }
    viewbar.querySelector('select')!.addEventListener('change',event=>{const value=(event.target as HTMLSelectElement).value;if(value==='')return;const view=[...builtInViews,...savedViews][Number(value)];if(!view)return;restoreState({camera:view.camera.join(','),target:view.target.join(','),scene:String(view.scene||0),wire:String(!!view.wire)});const environmentMenu=host.querySelector<HTMLSelectElement>('.mesh-environment')!;environmentMenu.value=view.environment||'studio';environmentMenu.dispatchEvent(new window.Event('change'));},{signal});
    viewbar.querySelector('[data-save-view]')!.addEventListener('click',()=>{const input=viewbar.querySelector('input')!;const name=input.value.trim();if(!name)return;const existing=savedViews.findIndex(view=>view.name===name);const view=captureView(name);if(existing>=0)savedViews[existing]=view;else if(savedViews.length<100)savedViews.push(view);writeSaved(viewKey,savedViews);viewMenu();input.value='';},{signal});
    function labels() {
      const width = stage.clientWidth, height = stage.clientHeight;
      host.querySelector('.mesh-labels')!.innerHTML = notes.map(note => {
        if (note.scene !== activeScene) return '';
        const point = new THREE.Vector3(...note.position).project(camera);
        if (point.z < -1 || point.z > 1 || Math.abs(point.x) > 1 || Math.abs(point.y) > 1) return '';
        const percent = (point.x + 1) * 50;
        if (compare && ((note.side === 'a' && percent > wipe) || (note.side === 'b' && percent < wipe))) return '';
        return `<span class="mesh-label" style="left:${(point.x + 1) * width / 2}px;top:${(1 - point.y) * height / 2}px">${escape(note.text)}</span>`;
      }).join('');
    }
    function render() {
      if (disposed || signal.aborted) return;
      const width = Math.max(stage.clientWidth, 1), height = Math.max(stage.clientHeight, 1);
      renderer.setScissorTest(false); renderer.setViewport(0, 0, width, height); renderer.clear();
      if (compare) {
        const boundary = Math.round(width * wipe / 100);
        renderer.setScissorTest(true);
        renderer.setScissor(0, 0, boundary, height); renderer.render(scenes[0]!, camera);
        renderer.setScissor(boundary, 0, width - boundary, height); renderer.render(scenes[1]!, camera);
        renderer.setScissorTest(false);
      } else renderer.render(scenes[0]!, camera);
      labels();
    }
    function resize() { if (disposed) return; const width = Math.max(stage.clientWidth, 1), height = Math.max(stage.clientHeight, 1); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); render(); }
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(stage);
    controls.addEventListener('change', render);
    function frame() {
      const box = new THREE.Box3(); groups.forEach(group => box.expandByObject(group));
      if (box.isEmpty()) return;
      const center = box.getCenter(new THREE.Vector3()); const size = box.getSize(new THREE.Vector3()).length();
      camera.near = Math.max(size / 1000, 0.001); camera.far = size * 100; camera.updateProjectionMatrix();
      camera.position.copy(center).add(new THREE.Vector3(size * 0.7, size * 0.4, size * 0.9)); controls.target.copy(center); controls.update(); render();
    }
    function materials() {
      let triangles = 0;
      groups.forEach(group => group.traverse(object => {
        const mesh = object as THREE.Mesh; if (!mesh.isMesh) return;
        triangles += (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3;
        const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        list.forEach(material => { if ('wireframe' in material) (material as THREE.MeshStandardMaterial).wireframe = wireframe; });
      }));
      host.querySelector('.mesh-stats')!.textContent = `${Math.round(triangles).toLocaleString(locale)} ${t('triangles', 'triangles')} · ${wireframe ? t('maillage', 'wireframe') : 'PBR'}`;
    }
    function chooseScene(index: number) {
      activeScene = index;
      groups.forEach((group, i) => { group.clear(); const gltf = loaded[i]; if (gltf) group.add(gltf.scenes[index] || gltf.scene); });
      materials(); frame();
    }
    function updateSceneMenu() {
      const scenes = loaded[0]?.scenes || [];
      host.querySelector('.mesh-scene')!.innerHTML = scenes.map((scene, i) => `<option value="${i}">${escape(scene.name || `Scene ${i + 1}`)}</option>`).join('');
      chooseScene(0);
    }
    function disposeObject(object: THREE.Object3D) {
      object.traverse(child => {
        const mesh = child as THREE.Mesh; if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) { const data = value.source?.data; if (typeof ImageBitmap !== 'undefined' && data instanceof ImageBitmap) data.close(); value.dispose(); }
          material.dispose();
        }
      });
    }
    const manager = new THREE.LoadingManager();
    const packedResources = new Map<string, string>();
    manager.setURLModifier(url => {
      if (/^(data|blob):/.test(url)) return url;
      const target = new URL(url, location.href), assetRoot = new URL('assets/', location.href);
      if (target.origin !== assetRoot.origin || !target.pathname.startsWith(assetRoot.pathname)) throw new Error('Mesh resources must stay local to assets/');
      const packed = packedResources.get(target.href);
      if (packed) return packed;
      if (location.protocol === 'file:') throw new Error('Mesh resource was not included in the local export');
      return url;
    });
    const loader = new GLTFLoader(manager);
    const load = async (value: string, index: number) => {
      let gltf: GLTF;
      if (loadAsset) {
        const packed = await loadAsset(value);
        if (disposed || signal.aborted) return;
        for (const [path, data] of Object.entries(packed.resources || {})) packedResources.set(new URL(path, location.href).href, data);
        const directory = new URL('.', new URL(value, location.href)).href;
        gltf = await loader.parseAsync(unpackAsset(packed), directory);
      } else {
        if (location.protocol === 'file:') throw new Error('Provide loadAsset when embedding the mesh module directly from local files');
        gltf = await loader.loadAsync(value);
      }
      if (disposed || signal.aborted) { gltf.scenes.forEach(disposeObject); return; }
      loaded[index] = gltf; gltf.scenes.forEach(scene => resources.add(scene));
    };
    const fail = (error: unknown) => { if (!signal.aborted) host.querySelector('.media-error')!.textContent = `${t('Modèle local indisponible. Régénérez la documentation ou ouvrez un GLB avec le sélecteur de fichier.', 'Local model unavailable. Rebuild the documentation or open a GLB with the file picker.')} ${error instanceof Error ? error.message : ''}`; };
    // Begin requests without blocking mount, so teardown is immediately available.
    void Promise.all([load(src, 0), ...(compare ? [load(compare, 1)] : [])]).then(() => {
      if (disposed || signal.aborted) return;
      packedResources.clear(); host.querySelector('.mesh-loading')?.remove(); updateSceneMenu(); if(pendingState)restoreState(pendingState);
    }).catch(error => { host.querySelector('.mesh-loading')?.remove(); fail(error); });
    host.addEventListener('click', event => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('button'); if (!target) return;
      if (target.dataset.action === 'wireframe') { wireframe = !wireframe; target.setAttribute('aria-pressed', String(wireframe)); materials(); render(); }
      if (target.dataset.action === 'reset') frame();
      if (target.dataset.action === 'export') saveJson({ type: 'cydoc-mesh-annotations', version: 1, src, scene: activeScene, annotations: notes, views:[...builtInViews,...savedViews] }, 'mesh-annotations.json');
      if(target.dataset.meshNote)restoreState({note:target.dataset.meshNote,scene:String(notes.find(note=>note.id===target.dataset.meshNote)?.scene||0)});
      if (target.dataset.delete) { notes = notes.filter(note => note.id !== target.dataset.delete); list(); }
    }, { signal });
    host.querySelector('.mesh-environment')!.addEventListener('change', event => {
      const value = (event.target as HTMLSelectElement).value;
      for (const scene of scenes) { scene.background = new THREE.Color(value === 'daylight' ? '#c6d5df' : value === 'dark' ? '#090d12' : '#18242d'); scene.environmentIntensity = value === 'daylight' ? 2 : value === 'dark' ? 0.35 : 1; }
      render();
    }, { signal });
    host.querySelector('.mesh-scene')!.addEventListener('change', event => chooseScene(Number((event.target as HTMLSelectElement).value)), { signal });
    const wipeSlider = host.querySelector<HTMLInputElement>('input[type=range]');
    const setWipe = wipeSlider ? comparisonHandle(host, wipeSlider, locale, signal, value => { wipe = value; render(); }) : undefined;
    host.querySelector('form')!.addEventListener('submit', event => event.preventDefault(), { signal });
    function list() { writeSaved(key, notes); host.querySelector('.annotation-list')!.innerHTML = notes.map(note => `<span class="annotation-chip"><button type="button" data-mesh-note="${escape(note.id)}">${escape(note.text)}</button><button type="button" data-delete="${escape(note.id)}" aria-label="${t('Supprimer', 'Delete')} ${escape(note.text)}">×</button></span>`).join(''); render(); }
    renderer.domElement.addEventListener('dblclick', event => {
      const input = host.querySelector<HTMLInputElement>('.annotation-form input')!; const text = input.value.trim(); if (!text) { input.focus(); return; }
      const bounds = renderer.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
      const ray = new THREE.Raycaster(); ray.setFromCamera(pointer, camera);
      const group = compare && (event.clientX - bounds.left) / bounds.width * 100 > wipe ? groups[1]! : groups[0]!;
      const hit = ray.intersectObject(group, true)[0]; if (!hit) return;
      notes.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, text, position: hit.point.toArray(), scene: activeScene, side: group === groups[1] ? 'b' : 'a' }); input.value = ''; list();
    }, { signal });
    host.querySelector<HTMLInputElement>('input[type=file]')!.addEventListener('change', async event => {
      const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
      try { const gltf = await loader.parseAsync(await file.arrayBuffer(), ''); if (disposed) { gltf.scenes.forEach(disposeObject); return; } loaded[0] = gltf; gltf.scenes.forEach(scene => resources.add(scene)); host.querySelector('.mesh-loading')?.remove(); updateSceneMenu(); } catch (error) { fail(error); }
    }, { signal });
    list(); resize();
    bindMediaState(host,context,restoreState,()=>({camera:camera.position.toArray().map(n=>Number(n.toFixed(6))).join(','),target:controls.target.toArray().map(n=>Number(n.toFixed(6))).join(','),scene:String(activeScene),wire:String(wireframe),environment:host.querySelector<HTMLSelectElement>('.mesh-environment')!.value,...(compare?{wipe:String(wipe)}:{}),...(selectedNote?{note:selectedNote}:{})}));
    mediaPresentation(host, config, context);
    return () => { disposed = true; resizeObserver.disconnect(); controls.removeEventListener('change', render); controls.dispose(); resources.forEach(disposeObject); resources.clear(); packedResources.clear(); environment.dispose(); renderer.dispose(); renderer.forceContextLoss(); loaded = []; };
  }
};
export default meshModule;
