import { mountViewer } from '../../src/viewer.ts';
async function renderPreview(){
const params = new URLSearchParams(location.search), project = params.get('project');
const prefix = `/api/projects/${encodeURIComponent(project)}/`;
const result = await fetch(`${prefix}preview?${new URLSearchParams({ page: params.get('page'), locale: params.get('locale') })}`).then(async response => { const value = await response.json(); if (!response.ok) throw new Error(value.error); return value; });
const moduleNames = { image: () => import('../../src/modules/image.ts'), video: () => import('../../src/modules/video.ts'), gallery: () => import('../../src/modules/gallery.ts'), gif: () => import('../../src/modules/gif.ts'), mesh: () => import('../../src/modules/mesh.ts'), graph: () => import('../../src/modules/graph.ts') };
mountViewer(document.querySelector('#app'), result.manifest, {
  homePage: params.get('page'), initialLocale: params.get('locale'), assetBase: prefix,
  modules: Object.fromEntries(result.modules.map(name => [name, () => moduleNames[name]().then(value => value.default)])),
  async loadAsset(src) {
    const response = await fetch(prefix + src); if (!response.ok) throw new Error('Asset unavailable.');
    const bytes = new Uint8Array(await response.arrayBuffer()); let value = ''; for (let i = 0; i < bytes.length; i += 32768) value += String.fromCharCode(...bytes.subarray(i, i + 32768));
    const resources = {};
    // Self-contained GLB needs no supporting resource map. glTF files use their local companions.
    if (src.endsWith('.gltf')) { const data = JSON.parse(new TextDecoder().decode(bytes)); for (const item of [...(data.buffers || []), ...(data.images || [])]) if (item.uri && !item.uri.startsWith('data:')) {
      if (/^[a-z]+:|^\/|\.\./i.test(item.uri)) throw new Error('External glTF resource rejected.');
      const key = src.slice(0, src.lastIndexOf('/') + 1) + item.uri; const r = await fetch(prefix + key); if (!r.ok) throw new Error('glTF companion missing.');
      const b = new Uint8Array(await r.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode(...b.subarray(i, i + 32768)); resources[key] = btoa(s);
    } }
    return { base64: btoa(value), resources };
  }
});
}
renderPreview().catch(error=>{const node=document.querySelector('#app');node.textContent=(new URLSearchParams(location.search).get('locale')==='fr'?'Aperçu indisponible : ':'Preview unavailable: ')+error.message;node.style.padding='28px';});
