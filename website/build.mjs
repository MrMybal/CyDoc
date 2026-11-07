import { readFile, writeFile, mkdir, cp, stat, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { build, transform } from 'esbuild';
import { copy, media } from './content.mjs';
import { renderPage } from './template.mjs';
import { hasAnchor } from '../dist/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist/website');
const en = Object.keys(copy.en).sort(), fr = Object.keys(copy.fr).sort();
if (JSON.stringify(en) !== JSON.stringify(fr) || Object.values(copy).some(locale => Object.values(locale).some(value => typeof value !== 'string' || !value.trim()))) throw new Error('The showcase requires complete English and French copy.');
let html = renderPage();
const keys = [...html.matchAll(/data-i18n(?:-label|-alt)?="([^"]+)"/g)].map(match => match[1]);
for (const key of keys) if (!copy.en[key] || !copy.fr[key]) throw new Error(`Missing showcase translation: ${key}`);
const manifest = JSON.parse(await readFile(resolve(root, 'dist/site/DocData/manifest.json'), 'utf8'));
const targets = [...new Set([...html.matchAll(/data-doc="([^"]+)"/g)].map(match => match[1]).concat(media.map(item => item.doc)))];
for (const target of targets) {
  const [id, anchor] = target.split('#');
  for (const locale of ['en', 'fr']) {
    const page = manifest.pages.find(page => page.id === id && page.locale === locale);
    if (!page || anchor && !hasAnchor(page, anchor)) throw new Error(`Broken showcase documentation link: ${locale}/${target}`);
  }
}
for (const name of new Set([...html.matchAll(/assets\/screenshots\/([a-z0-9-]+)\.webp/g)].map(match => match[1]).concat(media.map(item => item.image), 'studio-visual-fr', 'reader-mesh-wire'))) {
  if (!(await stat(resolve(root, 'website/assets/screenshots', name + '.webp'))).isFile()) throw new Error(`Missing screenshot: ${name}`);
}
const styles = await transform(await readFile(resolve(root, 'website/styles.css'), 'utf8'), { loader: 'css', minify: true, target: 'es2020' });
const script = await build({ entryPoints: [resolve(root, 'website/main.mjs')], bundle: true, format: 'iife', target: 'es2020', minify: true, write: false, legalComments: 'eof' });
const revision = value => createHash('sha256').update(value).digest('hex').slice(0, 12);
const cssName = `site.${revision(styles.code)}.css`, jsName = `site.${revision(script.outputFiles[0].contents)}.js`;
await mkdir(resolve(output, 'assets'), { recursive: true });
// Generated bundles get content hashes. Remove only this builder's old hash-named files.
for (const name of await readdir(resolve(output, 'assets'))) if (/^site\.[a-f0-9]{12}\.(css|js)$/.test(name) && ![cssName, jsName].includes(name)) {
  const { unlink } = await import('node:fs/promises');
  await unlink(resolve(output, 'assets', name));
}
await cp(resolve(root, 'website/assets'), resolve(output, 'assets'), { recursive: true });
await writeFile(resolve(output, 'assets', cssName), styles.code);
await writeFile(resolve(output, 'assets', jsName), script.outputFiles[0].contents);
await cp(resolve(root, 'dist/site'), resolve(output, 'manual'), { recursive: true });
await cp(resolve(root, 'LICENSE'), resolve(output, 'LICENSE'));
html = html.replace('__STYLESHEET__', './assets/' + cssName).replace('__SCRIPT__', './assets/' + jsName);
await writeFile(resolve(output, 'index.html'), html);
await writeFile(resolve(output, '.nojekyll'), '');
await writeFile(resolve(output, 'build.json'), JSON.stringify({ stylesheet: cssName, script: jsName, locales: ['en', 'fr'], documentation: 'manual/Documentation.html' }, null, 2));
for (const match of html.matchAll(/(?:href|src)="(\.[^"]+)"/g)) {
  const target = match[1].split('#')[0].split('?')[0];
  if (!(await stat(resolve(output, target))).isFile()) throw new Error(`Missing generated website file: ${target}`);
}
console.log(`CyDoc showcase: ${output}/index.html (English/French; original HTML reader included)`);
