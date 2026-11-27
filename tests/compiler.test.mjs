import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileMarkdown, readFrontmatter, safeUrl } from '../tools/compiler.mjs';
import { extractComments } from '../tools/extract.mjs';
import { readFile } from 'node:fs/promises';
const compile = body => compileMarkdown(body, { locale: 'fr', pageId: 'test' });

test('illustrated explanations remain guides while standalone media retain their media kind', () => {
  assert.equal(compile('## Export {#export}\n\nExportez le projet.\n\n![Réglages](assets/settings.png)').kind,'guide');
  assert.equal(compile('![Réglages](assets/settings.png)').kind,'media');
  assert.equal(compile('```graph\n{"nodes":[{"id":"a","title":"A","x":0,"y":0}]}\n```').kind,'media');
});

test('search section offsets address original prose without copying it into the manifest', () => {
  const compiled=compile('Intro ée\u0301 😀.\n\n## Préparer {#prepare}\n\nA & B.\n\n## Résoudre {#repair}\n\n```steps\n'+JSON.stringify({items:[{title:'Vérifier',body:'Ouvrez le panneau.',result:'Le panneau apparaît.',troubleshooting:'Rouvrez le manuel.'}]})+'\n```');
  assert.deepEqual(compiled.searchSections.map(section=>section.anchor),['prepare','repair']);
  const [first,second]=compiled.searchSections;
  assert.equal(compiled.text.slice(first.start,first.end),'A & B.');
  assert.match(compiled.text.slice(second.start,second.end),/Le panneau apparaît/);
  assert.match(compiled.text.slice(second.start,second.end),/Rouvrez le manuel/);
  assert.ok(first.end<=second.start);assert.deepEqual(Object.keys(second),['anchor','start','end']);
  assert.equal(compile('A page without headings.').searchSections,undefined);
});

test('tutorial steps compile optional results and troubleshooting with safe Markdown, local links and code anchors', () => {
  const body='```steps\n'+JSON.stringify({items:[{title:'Open <settings>',body:'Choose **Settings**.',result:'The panel is visible. <script>bad()</script>',troubleshooting:'See [help](doc:troubleshooting#reader).\n\n```sh\nopen-help\n```'},{title:'Continue',body:'Return to work.',result:' ',troubleshooting:''}]})+'\n```';
  for(const locale of ['en','fr']) {
    const output=compileMarkdown(body,{locale,pageId:'tutorial'});
    assert.match(output.html,/class="content-steps" role="list"/);assert.match(output.html,/Open &lt;settings&gt;/);
    assert.match(output.html,locale==='fr'?/Résultat attendu/:/Expected result/);
    assert.match(output.html,locale==='fr'?/Si cette étape échoue/:/If this step fails/);
    assert.match(output.html,/&lt;script&gt;bad/);assert.doesNotMatch(output.html,/<script/);
    assert.match(output.html,new RegExp(`href="#/${locale}/troubleshooting/reader"`));
    assert.equal((output.html.match(/class="step-result"/g)||[]).length,1);
    assert.equal((output.html.match(/class="step-troubleshooting"/g)||[]).length,1);
    assert.deepEqual(output.anchors,['L1']);assert.ok(output.links.includes(`#/${locale}/troubleshooting/reader`));
    assert.match(output.text,/panel is visible/);assert.match(output.text,/open-help/);
  }
  const legacy=compile('```steps\n{"items":[{"title":"Start","body":"An action."}]}\n```');
  assert.match(legacy.html,/An action/);assert.doesNotMatch(legacy.html,/step-result|step-troubleshooting/);
});

test('diagram explanations describe relationships and replies in the page language and escape authored prose', () => {
  const flow=compile('```diagram\n'+JSON.stringify({type:'decision',title:'Diagnostic',description:'Read <script> safely.',nodes:[{id:'check',label:'Vérifier'},{id:'yes',label:'Continuer'}],edges:[{from:'check',to:'yes',label:'Oui'}]})+'\n```').html;
  assert.match(flow,/Lire l’explication du schéma/);assert.match(flow,/Vérifier → Continuer: Oui/);assert.match(flow,/Read &lt;script&gt; safely/);assert.doesNotMatch(flow,/<script/);
  const sequence=compileMarkdown('```diagram\n'+JSON.stringify({type:'sequence',title:'Messages',actors:[{id:'app',label:'App'},{id:'reader',label:'Reader'}],messages:[{from:'reader',to:'app',label:'Ready',reply:true}]})+'\n```',{locale:'en',pageId:'test'}).html;
  assert.match(sequence,/Read the diagram explanation/);assert.match(sequence,/Reader → App \(reply\): Ready/);
});

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
  const data = JSON.parse(await readFile('dist/site/DocData/manifest.json', 'utf8'));
  assert.ok(data.pages.length >= 90);
  for (const locale of ['fr', 'en']) {
    assert.equal(data.pages.filter(page => page.locale === locale).length, data.pages.length / 2);
    const api = data.pages.find(page => page.id === 'api-links' && page.locale === locale);
    assert.match(api.source, /^examples\/contextual-help.ts:/);
    assert.match(api.html, /createLink/);
  }
  const index = await readFile('dist/site/Documentation.html', 'utf8');
  assert.doesNotMatch(index, /(?:src|href)="https?:/);
  assert.match(index, /<script src="DocData\/data\.js" defer>/);
  assert.doesNotMatch(index, /type="module"/);
});
