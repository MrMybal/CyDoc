import { readFile, writeFile, mkdir, cp, stat } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { Marked } from 'marked';

const source = dirname(fileURLToPath(import.meta.url));
const root = resolve(source, '../..');
const example = resolve(source, 'example');
const output = resolve('artifacts/readme-example');
if (process.argv.slice(2).some(value => value !== '--serve')) throw new Error('Usage: node ai/readme/preview.mjs [--serve]');
await mkdir(output, { recursive: true });
// Copy maintained guidance and public references, never runtimes or user project data.
await cp(resolve(root, 'ai'), resolve(output, 'sources/ai'), { recursive: true });
for (const name of ['README.md', 'README.fr.md', 'VERSION.md', 'VERSION.fr.md', 'AGENTS.md', 'LICENSE', 'llms.txt', 'package.json']) await cp(resolve(root, name), resolve(output, 'sources', name));
for (const name of ['api', 'integrations']) await cp(resolve(root, 'examples', name), resolve(output, 'sources/examples', name), { recursive: true });
await cp(resolve(example, 'assets'), resolve(output, 'assets'), { recursive: true });
const slug = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');
const articles = [];
for (const language of ['en', 'fr']) for (const kind of ['readme', 'version']) {
  const filename = (kind === 'readme' ? 'README' : 'VERSION') + (language === 'fr' ? '.fr' : '') + '.md';
  const id = kind + '-' + language;
  const markdown = await readFile(resolve(example, filename), 'utf8');
  const parser = new Marked({ gfm: true, renderer: { heading(token) {
    return `<h${token.depth} id="${id}-${slug(token.text)}">${this.parser.parseInline(token.tokens)}</h${token.depth}>\n`;
  } } });
  const html = parser.parse(markdown).replace(/(href|src)="([^\"]+)"/g, (whole, attribute, value) => {
    if (/^(?:https?:|mailto:)/.test(value)) return whole;
    if (value.startsWith('#')) return `${attribute}="#${id}-${value.slice(1)}"`;
    if (/^(?:README|VERSION)(?:\.fr)?\.md$/.test(value)) {
      const doc = value.startsWith('VERSION') ? 'version' : 'readme';
      const lang = value.includes('.fr.') ? 'fr' : 'en';
      return `href="?doc=${doc}&lang=${lang}" data-document="${doc}" data-locale="${lang}"`;
    }
    if (value.startsWith('assets/')) return `${attribute}="./${value}"`;
    const delta = relative(root, resolve(example, value));
    if (delta.startsWith('..') || isAbsolute(delta)) throw new Error(`Reference escapes the checkout: ${value}`);
    return `${attribute}="./sources/${delta.replaceAll('\\', '/')}"`;
  });
  for (const [, target] of html.matchAll(/(?:href|src)="(\.\/[^"?#]+)(?:[?#][^"]*)?"/g)) {
    if (!(await stat(resolve(output, target))).isFile()) throw new Error(`Missing preview reference: ${target}`);
  }
  articles.push(`<article class="markdown-body" data-page="${id}" lang="${language}"${id === 'readme-en' ? '' : ' hidden'}>${html}</article>`);
}
const css = await readFile(resolve(source, 'preview.css'));
const js = await readFile(resolve(source, 'preview.js'));
const hash = value => createHash('sha256').update(value).digest('hex').slice(0, 12);
const stylesheet = `preview.${hash(css)}.css`, script = `preview.${hash(js)}.js`;
await writeFile(resolve(output, stylesheet), css);
await writeFile(resolve(output, script), js);
await writeFile(resolve(output, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CyDoc — README convention example</title><link rel="icon" href="./assets/cydoc-logo-v1.png"><link rel="stylesheet" href="./${stylesheet}"><script src="./${script}" defer></script></head>
<body><a class="skip" href="#content" data-label="skip">Skip to content</a><header class="toolbar"><div class="identity"><img src="./assets/cydoc-logo-v1.png" width="26" height="26" alt=""><div><strong>CyDoc · README</strong><small data-label="local">Local convention example</small></div></div><nav data-label-aria="document" aria-label="Document"><button data-kind="readme" aria-pressed="true">README</button><button data-kind="version" aria-pressed="false" data-label="notes">Version notes</button></nav><nav data-label-aria="language" aria-label="Language"><button data-language="en" aria-pressed="true">English</button><button data-language="fr" aria-pressed="false">Français</button></nav><nav data-label-aria="theme" aria-label="Theme"><button data-theme="dark" aria-pressed="true" data-label="dark">Dark</button><button data-theme="light" aria-pressed="false" data-label="light">Light</button></nav></header><div class="file-bar"><span id="filename">example/README.md</span><div><a id="markdown" href="./sources/ai/readme/example/README.md" data-label="markdown">Markdown file</a><a href="./sources/ai/readme/DocAI.md" data-label="agent">AI instructions</a><a id="convention" href="./sources/ai/readme/README.md" data-label="convention">Convention</a></div></div><main id="content">${articles.join('\n')}</main><footer class="footer"><p data-label="limit">The header uses a native HTML table with visible borders. No local column layout is added. Check the published GitHub rendering separately.</p><p data-label="generated">This separate example does not replace the root README or the human HTML manual.</p></footer></body></html>`);
console.log(`CyDoc README example: ${resolve(output, 'index.html')}`);

if (process.argv.includes('--serve')) {
  const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
  const server = createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
      const url = new URL(request.url, 'http://localhost');
      const target = resolve(output, '.' + decodeURIComponent(url.pathname) + (url.pathname.endsWith('/') ? 'index.html' : ''));
      const delta = relative(output, target);
      if (delta.startsWith('..') || isAbsolute(delta)) { response.writeHead(403).end(); return; }
      if (!(await stat(target)).isFile()) { response.writeHead(404).end(); return; }
      response.writeHead(200, { 'Content-Type': mime[extname(target)] || 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : await readFile(target));
    } catch { response.writeHead(404).end(); }
  });
  server.listen(0, '127.0.0.1', () => console.log(`Browser verification: http://127.0.0.1:${server.address().port}/ (PID ${process.pid})`));
  process.on('SIGINT', () => server.close(() => process.exit(0)));
  process.stdin.on('data', bytes => { if (bytes.includes(3)) server.close(() => process.exit(0)); });
}
