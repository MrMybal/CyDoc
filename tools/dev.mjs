import { watch } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildSite } from './build.mjs';

const project = resolve(fileURLToPath(new URL('..', import.meta.url)));
async function compile() {
  await new Promise((yes, no) => {
    const child = spawn(process.execPath, [resolve(project, 'node_modules/typescript/bin/tsc')], { cwd: project, stdio: 'inherit' });
    child.on('error', no); child.on('exit', code => code === 0 ? yes() : no(new Error(`TypeScript exited ${code}`)));
  });
  return buildSite();
}
const site = await compile();
console.log(`Local file: ${pathToFileURL(join(site.output, 'Documentation.html')).href}`);
console.log('Watching local sources. Refresh the file after changes. No web server is started.');
let rebuilding = false;
let dirty = false;
async function rebuild() {
  if (rebuilding) { dirty = true; return; }
  rebuilding = true;
  try { await compile(); } catch (error) { console.error(error.message); }
  finally { rebuilding = false; if (dirty) { dirty = false; void rebuild(); } }
}
for (const directory of ['src', 'docs', 'examples', 'assets', 'web', 'cydoc.config.json']) {
  void (async () => {
    let timer;
    for await (const _event of watch(join(project, directory), { recursive: directory !== 'cydoc.config.json' })) {
      clearTimeout(timer); timer = setTimeout(rebuild, 150);
    }
  })().catch(error => console.error(`Watch ${directory}: ${error.message}`));
}
process.on('SIGINT', () => process.exit(0));
