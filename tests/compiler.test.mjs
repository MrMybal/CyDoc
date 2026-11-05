import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileMarkdown, readFrontmatter, safeUrl } from '../tools/compiler.mjs';
import { extractComments } from '../tools/extract.mjs';
import { readFile } from 'node:fs/promises';
const compile = body => compileMarkdown(body, { locale: 'fr', pageId: 'test' });

test('compiler escapes raw HTML and rejects executable links', () => {
  const { html } = compile('<script>alert(1)</script>\n\n[x](javascript:alert%281%29)\n\n[y](data:text/html,x)');
  assert.doesNotMatch(html, /<script|href="(?:javascript|data):/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(compile('[external](https://example.com)').html, /rel="noopener noreferrer"/);
});
test('remote and traversal media cannot leak out of the local asset root', () => {
  for (const source of ['https://example.com/a.png', 'assets/../secret.png', 'assets/%2e%2e/secret.png', '//example.com/a.png']) {
    assert.throws(() => compile(`![image](${source})`), /local/);
  }
  assert.equal(safeUrl('javascript:alert(1)'), '');
});
test('explicit anchors are stable and duplicates are unambiguous', () => {
  const result = compile('## Bonjour {#stable}\n\n## Bonjour {#stable}\n\n[go](doc:other#stable)');
  assert.deepEqual(result.headings.map(item => item.id), ['stable', 'stable-2']);
  assert.match(result.html, /href="#\/fr\/other\/stable"/);
  assert.doesNotMatch(result.html, /\{#stable\}/);
});
test('local video and diagram blocks render without script runtimes', () => {
  assert.match(compile('```video\nassets/help.mp4\nTutorial\n```').html, /data-cydoc-module="video"/);
  assert.doesNotMatch(compile('```video\nassets/help.mp4\nTutorial\n```').html, /<video/);
  const diagram = compile('```diagram\nApp -> Docs\n```').html;
  assert.match(diagram, /<svg role="img"/);
  assert.match(diagram, /App → Docs/);
  assert.doesNotMatch(diagram, /<script/);
  assert.match(compile('```diagram\n<script> -> Safe\n```').html, /&lt;script&gt;/);
});
test('media comparison blocks collect every local resource, including codec variants', () => {
  const result = compile('```video\n' + JSON.stringify({ src: 'assets/a.webm', compare: 'assets/b.webm', sources: [{ src: 'assets/av1.webm', type: 'video/webm' }] }) + '\n```');
  assert.deepEqual(result.assets.sort(), ['assets/a.webm', 'assets/av1.webm', 'assets/b.webm']);
  assert.match(result.html, /data-config=/);
  assert.throws(() => compile('```mesh\n{"src":"https://remote/model.glb"}\n```'), /local/);
});
test('cross-documentation links use a host catalog and optionally validate the target', () => {
  const data = { defaultLocale: 'fr', pages: [{ id: 'settings', locale: 'fr', headings: [{ id: 'export' }] }] };
  const result = compileMarkdown('[Autre aide](doc://editor/settings#export)', { locale: 'en', pageId: 'current', linkedDocs: { editor: { base: '../editor/index.html', data } } });
  assert.match(result.html, /href="\.\.\/editor\/index.html#\/en\/settings\/export"/);
  assert.throws(() => compile('[Missing](doc://unknown/settings)'), /Unknown linked/);
  assert.throws(() => compileMarkdown('[Missing](doc://editor/settings#missing)', { locale: 'fr', pageId: 'current', linkedDocs: { editor: { base: '../editor/index.html', data } } }), /Broken cross/);
});
test('source extraction retains Markdown, language and source location', () => {
  const [page] = extractComments('/**\n * @doc hello\n * @locale en\n * @title Hello\n * A real description.\n */', 'src/example.cs');
  assert.equal(page.id, 'hello'); assert.equal(page.locale, 'en');
  assert.equal(page.markdown, 'A real description.'); assert.equal(page.source, 'src/example.cs:1');
  assert.throws(() => extractComments('/** @doc missing */'), /requires/);
});
test('metadata requires a stable page id', () => {
  assert.throws(() => readFrontmatter('No metadata'), /frontmatter/);
  assert.throws(() => readFrontmatter('---\nid: bad id\ntitle: Test\nsection: Guide\n---\nBody'), /stable/);
});
test('real export includes both languages, extracted pages and local resources', async () => {
  const data = JSON.parse(await readFile('dist/site/manifest.json', 'utf8'));
  assert.ok(data.pages.length >= 90);
  for (const locale of ['fr', 'en']) {
    assert.equal(data.pages.filter(page => page.locale === locale).length, data.pages.length / 2);
    const api = data.pages.find(page => page.id === 'api-links' && page.locale === locale);
    assert.match(api.source, /^examples\/contextual-help.ts:/);
    assert.match(api.html, /createLink/);
  }
  const index = await readFile('dist/site/index.html', 'utf8');
  assert.doesNotMatch(index, /(?:src|href)="https?:/);
  assert.match(index, /<script src="data.js" defer>/);
  assert.doesNotMatch(index, /type="module"/);
});
