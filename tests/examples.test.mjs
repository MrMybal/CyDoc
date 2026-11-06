import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compileMarkdown } from '../tools/compiler.mjs';
import { parseBlueprint, validateGraph } from '../tools/blueprint.mjs';
import { extractComments } from '../tools/extract.mjs';
import { sourceDependencies } from '../tools/source-index.mjs';

test('nine languages have extracted API pages and file references without source listings', async () => {
  const data = JSON.parse(await readFile('dist/site/DocData/manifest.json', 'utf8'));
  for (const locale of ['fr', 'en']) for (const language of ['cpp', 'python', 'c', 'csharp', 'javascript', 'typescript', 'java', 'hlsl', 'glsl']) {
    const page = data.pages.find(page => page.locale === locale && page.id === `api-${language}`);
    assert.ok(page, `Missing API ${locale}/${language}`);
    assert.ok(page.sourcePageId);
    const source = data.pages.find(source => source.id === page.sourcePageId && source.locale === locale);
    assert.equal(source.kind,'api');assert.ok(source.languages.includes(language));assert.doesNotMatch(source.html,/class="code-block"|Code source/);assert.ok(!source.code);
    assert.ok(page.symbol);
  }
});
test('Python docstrings preserve indented code blocks and symbol metadata', () => {
  const [page] = extractComments('"""\n    @doc test\n    @locale en\n    @title Test\n    @symbol test\n    Text\n\n    ```python\n    def test():\n        return 1\n    ```\n    """', 'test.py');
  assert.equal(page.symbol, 'test'); assert.match(page.markdown, /def test\(\):\n    return 1/);
  assert.doesNotMatch(page.markdown, /@symbol/);
});
test('gallery recursion collects codecs and meshes for offline packaging', () => {
  const result = compileMarkdown('```gallery\n' + JSON.stringify({ items: [{ type: 'video', src: 'assets/a.webm', sources: [{ src: 'assets/av1.webm' }] }, { type: 'mesh', src: 'assets/a.glb' }] }) + '\n```', { locale: 'fr', pageId: 'gallery' });
  assert.deepEqual(result.assets.sort(), ['assets/a.glb', 'assets/a.webm', 'assets/av1.webm']);
  assert.ok(result.mediaBlocks.some(block => block.kind === 'mesh'));
  assert.throws(() => compileMarkdown('```gallery\n{"items":[{"type":"image","src":"https://remote/a.png"}]}\n```', { locale: 'fr', pageId: 'test' }), /local/);
});
test('Unreal clipboard is converted to typed pins and real node connections', async () => {
  const source = await readFile('docs/en/blueprints.md', 'utf8');
  const text = source.match(/```blueprint\r?\n([\s\S]*?)\r?\n```/)[1];
  const graph = validateGraph(parseBlueprint(text));
  assert.equal(graph.nodes.length, 2); assert.equal(graph.links.length, 1);
  assert.equal(graph.nodes[0].outputs[0].type, 'exec');
  assert.equal(graph.nodes[1].inputs[1].type, 'string');
  assert.equal(graph.nodes[1].title, 'PrintString');
  assert.throws(() => parseBlueprint('Begin Object Name="Broken"'), /Invalid/);
});
test('imports and includes resolve into local source-file links', async () => {
  const data = JSON.parse(await readFile('dist/site/DocData/manifest.json', 'utf8'));
  for (const [source, target] of [
    ['source-examples-cpp-src-help-cpp', 'source-examples-cpp-include-cydoc-help-hpp'],
    ['source-examples-typescript-help-ts', 'source-examples-typescript-segments-ts'],
    ['source-examples-javascript-help-js', 'source-examples-javascript-segments-js'],
    ['source-examples-shaders-preview-hlsl', 'source-examples-shaders-common-hlsli'],
    ['source-examples-shaders-preview-frag', 'source-examples-shaders-common-glsl']
  ]) assert.ok(data.pages.find(page => page.id === source && page.locale === 'fr').html.includes(`href="#/fr/${target}"`));
  assert.deepEqual(sourceDependencies('export module cydoc.help;\nimport core;', 'cpp').map(item => item.kind), ['module', 'import']);
  assert.deepEqual(sourceDependencies('import java.net.URI;\nimport static java.util.Objects.requireNonNull;', 'java').map(item => item.name), ['java.net.URI', 'java.util.Objects.requireNonNull']);
});
test('diagram variants are accessible SVGs and graph links participate in validation', () => {
  const result = compileMarkdown('```diagram\n{"type":"sequence","title":"Calls","actors":[{"id":"a","label":"App"},{"id":"b","label":"Core"}],"messages":[{"from":"a","to":"b","label":"call()"}]}\n```', { locale: 'fr', pageId: 'test' });
  assert.match(result.html, /<svg role="img" aria-label="Calls"/);
  assert.match(result.html, /marker-end=/);
  const graph = { nodes: [{ id: 'a', title: 'Open', x: 0, y: 0, link: 'doc:api-cpp#signature' }] };
  const compiled = compileMarkdown('```graph\n' + JSON.stringify(graph) + '\n```', { locale: 'fr', pageId: 'test' });
  assert.ok(compiled.links.includes('#/fr/api-cpp/signature'));
  assert.throws(() => validateGraph({ nodes: graph.nodes, links: [{ from: ['a', 'unknown'], to: ['a', 'unknown'] }] }), /Invalid graph edge/);
});
