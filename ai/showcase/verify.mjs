import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative, dirname, extname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = dirname(fileURLToPath(import.meta.url));
let files = 0, links = 0, pages = 0;
const problems = [];
const external = /^(?:[a-z][\w+.-]*:|\/\/)/i;
async function checkLink(value, file) {
  if (external.test(value)) { problems.push(`${relative(root, file)}: external destination ${value}`); return; }
  const local = decodeURIComponent(value.split(/[?#]/)[0]);
  if (!local) return;
  const target = resolve(dirname(file), local);
  const delta = relative(root, target);
  if (delta.startsWith('..') || isAbsolute(delta)) { problems.push(`${relative(root, file)}: destination outside the standalone folder: ${value}`); return; }
  links++;
  if (!(await stat(target).catch(() => undefined))?.isFile()) problems.push(`${relative(root, file)}: missing ${value}`);
}
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) { await walk(path); continue; }
    files++;
    const extension = extname(path);
    if (!['.html', '.md', '.svg', '.css', '.json'].includes(extension)) continue;
    const source = await readFile(path, 'utf8');
    if (extension === '.md') {
      for (const match of source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) await checkLink(match[1], path);
    }
    if (['.html', '.svg'].includes(extension)) {
      for (const match of source.matchAll(/(?:href|src|poster|action)="([^"]+)"/g)) await checkLink(match[1], path);
    }
    if (entry.name === 'manifest.json') {
      const manifest = JSON.parse(source);
      for (const page of manifest.pages || []) {
        pages++;
        for (const match of page.html.matchAll(/(?:href|src|poster|action)="([^"]+)"/g)) await checkLink(match[1], path);
      }
    }
    if (extension === '.css' && /(?:@import\s|url\(\s*['"]?(?:https?:|\/\/))/i.test(source)) problems.push(`${relative(root, path)}: external CSS resource`);
  }
}
await walk(root);
const html = await readFile(resolve(root, 'example/index.html'), 'utf8');
for (const match of html.matchAll(/(?:href|src)="\.\/assets\/site\.([a-f0-9]{12})\.(css|js)"/g)) {
  const path = resolve(root, `example/assets/site.${match[1]}.${match[2]}`);
  const hash = createHash('sha256').update(await readFile(path)).digest('hex').slice(0, 12);
  if (hash !== match[1]) problems.push(`Stale asset revision: ${relative(root, path)}`);
}
if (problems.length) throw new Error(problems.join('\n'));
console.log(`Verified ${files} standalone files, ${links} local file references and ${pages} reader pages. No outbound links or references outside this folder. Asset revisions match their contents.`);
