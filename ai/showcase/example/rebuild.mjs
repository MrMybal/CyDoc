import { readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';
import { copy, media } from './source/content.mjs';
import { renderPage } from './source/template.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const hash = value => createHash('sha256').update(value).digest('hex').slice(0, 12);
const keys = Object.keys(copy.en).sort();
if (JSON.stringify(keys) !== JSON.stringify(Object.keys(copy.fr).sort()) || Object.values(copy).some(locale => Object.values(locale).some(value => typeof value !== 'string' || !value.trim()))) throw new Error('Complete English and French copy is required.');
const content = (await readFile(resolve(root, 'source/content.mjs'), 'utf8')).replace(/^export /gm, '');
const main = (await readFile(resolve(root, 'source/main.mjs'), 'utf8')).replace(/^import .* from '\.\/content\.mjs';\r?\n/, '');
const js = `// Standalone CyDoc showcase reference. MIT licensed.\n(() => {\n${content}\n${main}\n})();\n`;
new Script(js, { filename: 'site.js' });
const css = await readFile(resolve(root, 'source/styles.css'), 'utf8');
const jsName = `site.${hash(js)}.js`, cssName = `site.${hash(css)}.css`;
const html = renderPage().replace('__STYLESHEET__', './assets/' + cssName).replace('__SCRIPT__', './assets/' + jsName);
for (const match of html.matchAll(/data-i18n(?:-label|-alt)?="([^"]+)"/g)) if (!copy.en[match[1]] || !copy.fr[match[1]]) throw new Error(`Missing translation: ${match[1]}`);
const manifest = JSON.parse(await readFile(resolve(root, 'manual/DocData/manifest.json'), 'utf8'));
for (const target of new Set([...html.matchAll(/data-doc="([^"]+)"/g)].map(match => match[1]).concat(media.map(item => item.doc)))) {
  const [id, anchor] = target.split('#');
  for (const locale of ['en', 'fr']) {
    const page = manifest.pages.find(page => page.id === id && page.locale === locale);
    if (!page || anchor && !page.html.includes(`id="${anchor}"`)) throw new Error(`Broken local documentation destination: ${locale}/${target}`);
  }
}
for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  const value = match[1];
  if (/^(?:[a-z][\w+.-]*:|\/\/)/i.test(value)) throw new Error(`External destination: ${value}`);
  const path = value.split(/[?#]/)[0];
  if (path && ![jsName, cssName].some(name => path === './assets/' + name)) await readFile(resolve(root, path));
}
await writeFile(resolve(root, 'assets', jsName), js);
await writeFile(resolve(root, 'assets', cssName), css);
await writeFile(resolve(root, 'index.html'), html);
for (const file of await readdir(resolve(root, 'assets'))) {
  if (/^site\.[a-f0-9]{12}\.(?:js|css)$/.test(file) && ![jsName, cssName].includes(file)) await unlink(resolve(root, 'assets', file));
}
console.log(`Standalone example rebuilt: ${resolve(root, 'index.html')} (EN/FR; all destinations local)`);
