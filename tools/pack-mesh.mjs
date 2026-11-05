import { readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import { resolve, relative, isAbsolute, join, extname } from 'node:path';
import { createHash } from 'node:crypto';

const mimeTypes = { '.bin': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.ktx2': 'image/ktx2' };

function modelJson(bytes, extension) {
  if (extension === '.gltf') return JSON.parse(bytes.toString('utf8'));
  if (extension !== '.glb' || bytes.length < 20 || bytes.readUInt32LE(0) !== 0x46546c67) throw new Error('Mesh must be a valid GLB or glTF file');
  if (bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) throw new Error('Invalid GLB version or length');
  const length = bytes.readUInt32LE(12);
  if (bytes.readUInt32LE(16) !== 0x4e4f534a || length > bytes.length - 20) throw new Error('Invalid GLB JSON chunk');
  return JSON.parse(bytes.subarray(20, 20 + length).toString('utf8').replace(/\0+$/, '').trim());
}

/** Classic script sidecars can load binary models from file:// without HTTP fetches. */
export async function packMeshAssets({ pages, assetRoot, output, enabled, gifEnabled = false }) {
  const sources = new Set(pages.flatMap(page => (page.mediaBlocks || []).filter(block => (enabled && block.kind === 'mesh') || (gifEnabled && block.kind === 'gif')).flatMap(block => [block.config.src, block.config.compare].filter(Boolean))));
  const catalog = {};
  const generated = new Set();
  for (const source of sources) {
    const modelUrl = new URL(source, 'https://cydoc.invalid/');
    const assetFile = url => {
      if (url.origin !== modelUrl.origin || !url.pathname.startsWith('/assets/') || url.search || url.hash) throw new Error(`Mesh resource must stay local to assets/: ${url.href}`);
      const file = resolve(assetRoot, decodeURIComponent(url.pathname.slice('/assets/'.length)));
      const delta = relative(resolve(assetRoot), file);
      if (delta.startsWith('..') || isAbsolute(delta)) throw new Error('Mesh resource outside assets/');
      return file;
    };
    const bytes = await readFile(assetFile(modelUrl));
    const gif = extname(modelUrl.pathname).toLowerCase()==='.gif';
    if(gif && !['GIF87a','GIF89a'].includes(bytes.subarray(0,6).toString('ascii')))throw new Error('Invalid GIF header');
    const json = gif ? {} : modelJson(bytes, extname(modelUrl.pathname).toLowerCase());
    const resources = {};
    for (const item of [...(json.buffers || []), ...(json.images || [])]) {
      if (!item.uri || item.uri.startsWith('data:')) continue;
      const url = new URL(item.uri, modelUrl);
      const resource = await readFile(assetFile(url));
      resources[url.pathname.slice(1)] = `data:${mimeTypes[extname(url.pathname).toLowerCase()] || 'application/octet-stream'};base64,${resource.toString('base64')}`;
    }
    const packed = { base64: bytes.toString('base64'), resources };
    const payload = JSON.stringify(packed);
    const hash = createHash('sha256').update(source).update(payload).digest('hex').slice(0, 16);
    const filename = `media-${gif?'gif':'mesh'}-data-${hash}.js`;
    await writeFile(join(output, filename), `globalThis.CYDOC_ASSETS??=Object.create(null);globalThis.CYDOC_ASSETS[${JSON.stringify(source)}]=${payload.replace(/</g, '\\u003c')};\n`);
    generated.add(filename); catalog[source] = filename;
  }
  for (const filename of await readdir(output)) {
    if (/^media-(mesh|gif)-data-[a-f0-9]{16}\.js$/.test(filename) && !generated.has(filename)) await unlink(join(output, filename));
  }
  return catalog;
}
