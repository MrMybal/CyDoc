import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';
const core = await build({ entryPoints: ['src/index.ts'], bundle: true, minify: true, format: 'esm', write: false });
const files = [['core (bundled)', Buffer.from(core.outputFiles[0].contents)]];
for (const file of ['viewer.js', 'viewer.css', 'data.js']) files.push([file, await readFile(`dist/site/${file}`)]);
for (const name of ['image', 'video', 'mesh', 'gallery', 'graph', 'gif']) {
  try { files.push([`module ${name}`, await readFile(`dist/site/media-${name}.js`)]); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
for (const [name, buffer] of files) console.log(`${name.padEnd(20)} ${(buffer.length / 1024).toFixed(2)} KiB · gzip ${(gzipSync(buffer).length / 1024).toFixed(2)} KiB`);
