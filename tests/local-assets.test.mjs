import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm, readdir } from 'node:fs/promises';
import { resolve, join, dirname, basename } from 'node:path';
import vm from 'node:vm';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { unpackAsset } from '../dist/modules/mesh-assets.js';
import { packMeshAssets } from '../tools/pack-mesh.mjs';
import { decodeGif } from '../dist/modules/gif-decode.js';

test('exported GLBs and GIFs decode without any file, HTTP, or network fetch', async () => {
  const scope = vm.createContext({});
  vm.runInContext(await readFile('dist/site/DocData/data.js', 'utf8'), scope);
  const catalog = scope.CYDOC_OPTIONS.assets;
  assert.deepEqual(Object.keys(catalog).sort(), ['assets/sample-a.glb', 'assets/sample-b.glb', 'assets/steps-a.gif', 'assets/steps-b.gif']);
  const previousFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('A local GLB must not call fetch'); };
  try {
    for (const [src, script] of Object.entries(catalog)) {
      assert.match(script, /^media-(mesh|gif)-data-[a-f0-9]{16}\.js$/);
      vm.runInContext(await readFile(join('dist/site/DocData', script), 'utf8'), scope);
      const bytes = unpackAsset(scope.CYDOC_ASSETS[src]);
      assert.deepEqual(Buffer.from(bytes), await readFile(src));
      if(src.endsWith('.gif')){assert.equal(decodeGif(new Uint8Array(bytes)).frames.length,12);continue;}
      const gltf = await new GLTFLoader().parseAsync(bytes, '');
      assert.equal(gltf.scenes.length, 2);
      let meshes = 0; gltf.scene.traverse(object => { if (object.isMesh) meshes++; });
      assert.ok(meshes > 0);
    }
  } finally { globalThis.fetch = previousFetch; }
});

test('glTF dependencies are packed locally; remote resources fail and disabled modules remove sidecars', async t => {
  const parent = resolve('.tmp'); await mkdir(parent, { recursive: true });
  const root = await mkdtemp(join(parent, 'local-mesh-test-'));
  t.after(async () => {
    if (dirname(root) !== parent || !basename(root).startsWith('local-mesh-test-')) throw new Error('Unsafe cleanup path');
    await rm(root, { recursive: true, force: true });
  });
  const assetRoot = join(root, 'assets'), output = join(root, 'output');
  await mkdir(assetRoot); await mkdir(output);
  await writeFile(join(assetRoot, 'buffer.bin'), Buffer.from([1, 2, 3, 4]));
  const model = { asset: { version: '2.0' }, buffers: [{ uri: 'buffer.bin', byteLength: 4 }] };
  await writeFile(join(assetRoot, 'model.gltf'), JSON.stringify(model));
  const pages = [{ mediaBlocks: [{ kind: 'mesh', config: { src: 'assets/model.gltf' } }] }];
  const catalog = await packMeshAssets({ pages, assetRoot, output, enabled: true });
  const scope = vm.createContext({});
  vm.runInContext(await readFile(join(output, catalog['assets/model.gltf']), 'utf8'), scope);
  assert.equal(scope.CYDOC_ASSETS['assets/model.gltf'].resources['assets/buffer.bin'], 'data:application/octet-stream;base64,AQIDBA==');
  await writeFile(join(assetRoot, 'model.gltf'), JSON.stringify({ ...model, buffers: [{ uri: 'https://example.com/remote.bin' }] }));
  await assert.rejects(packMeshAssets({ pages, assetRoot, output, enabled: true }), /stay local/);
  await packMeshAssets({ pages, assetRoot, output, enabled: false });
  assert.deepEqual(await readdir(output), []);
});
