import { mountViewer } from '../dist/viewer.js';
import { renderOverview } from './overview.mjs';
const options = globalThis.CYDOC_OPTIONS || {};
const pendingAssets = new Map();
function loadAsset(src) {
  if (pendingAssets.has(src)) return pendingAssets.get(src);
  const file = options.assets?.[src];
  if (!file) return Promise.reject(new Error(`Local asset is not packaged: ${src}`));
  const pending = new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = file;
    const cleanup = () => { pendingAssets.delete(src); script.remove(); };
    script.onload = () => {
      const asset = globalThis.CYDOC_ASSETS?.[src];
      if (globalThis.CYDOC_ASSETS) delete globalThis.CYDOC_ASSETS[src];
      cleanup();
      if (asset) resolve(asset); else reject(new Error(`Invalid local asset: ${src}`));
    };
    script.onerror = () => { cleanup(); reject(new Error(`Cannot load local asset: ${src}`)); };
    document.head.append(script);
  });
  pendingAssets.set(src, pending);
  return pending;
}
const modules = Object.fromEntries((options.modules || []).map(name => [name, () => new Promise((resolve, reject) => {
  const script = document.createElement('script');
  script.src = `media-${name}.js`;
  script.onload = () => resolve(globalThis[`CyDocMedia_${name}`].default);
  script.onerror = () => { script.remove(); reject(new Error(`Cannot load media-${name}.js`)); };
  document.head.append(script);
})]));
mountViewer(document.querySelector('#app'), globalThis.CYDOC_DATA, {
  homePage: options.homePage,
  renderHome: options.landingPage ? renderOverview : undefined,
  modules,
  loadAsset
});
