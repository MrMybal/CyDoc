import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocumentation, createDocumentationRegistry, createLink, parseLink } from '../dist/index.js';
import { compileMarkdown } from '../tools/compiler.mjs';
import { searchExcerpt, searchTextRanges } from '../dist/search-text.js';

const page = (id, locale, title, text = '') => ({ id, locale, title, text, description: '', section: 'Guide', order: 0, html: '', headings: [] });
const fixture = () => ({ schemaVersion: 1, name: 'Test', version: '1', defaultLocale: 'fr', locales: [{ code: 'fr', label: 'Français' }, { code: 'en', label: 'English' }], pages: [page('start', 'fr', 'Démarrage', 'Installation du projet'), page('start', 'en', 'Getting started', 'Install the project'), page('only-fr', 'fr', 'Réglages', 'Paramètres avancés')] });

test('contextual links roundtrip Unicode, slashes, and section anchors', () => {
  const route = { locale: 'fr-CA', pageId: 'paramètres/compte', anchor: 'clé API' };
  const link = createLink(route, './help/index.html#old');
  assert.match(link, /^\.\/help\/index.html#\//);
  assert.deepEqual(parseLink(link.slice(link.indexOf('#'))), route);
});
test('malformed links fall back safely', () => {
  assert.deepEqual(parseLink('#/%ZZ'), { locale: 'fr', pageId: 'overview' });
});
test('locale selection, missing translation fallback and missing page are distinct', () => {
  const docs = createDocumentation(fixture());
  assert.equal(docs.resolve('start', 'en').page.title, 'Getting started');
  assert.equal(docs.resolve('start', 'en').fallback, false);
  assert.equal(docs.resolve('only-fr', 'en').fallback, true);
  assert.equal(docs.resolve('missing', 'en'), undefined);
  assert.equal(docs.pages('en').length, 2);
});
test('search is accent-insensitive, requires every term and ranks the title', () => {
  const docs = createDocumentation(fixture());
  assert.equal(docs.search('reglages')[0].page.id, 'only-fr');
  assert.equal(docs.search('parametres avances')[0].page.id, 'only-fr');
  assert.equal(docs.search('parametres inexistant').length, 0);
  assert.equal(docs.search('   ').length, 0);
  assert.equal(docs.search('start', 'en')[0].page.locale, 'en');
});

test('search targets relevant prose sections, preserves title matches and accepts older manifests', () => {
  const compiled=compileMarkdown('## Préparer {#prepare}\n\nCréez un espace.\n\n## Résoudre une erreur {#repair}\n\nLe panneau noir disparaît après réouverture.',{locale:'fr',pageId:'reference'});
  const guide={...page('reference','fr','Référence du lecteur'),...compiled};
  const docs=createDocumentation({...fixture(),pages:[guide]});
  const [result]=docs.search('panneau noir','fr');
  assert.equal(result.anchor,'repair');assert.equal(result.section,'Résoudre une erreur');assert.match(result.excerpt,/panneau noir/);
  assert.equal(docs.search('reference','fr')[0].anchor,undefined);
  const [typo]=docs.search('panneu','fr');assert.equal(typo.anchor,'repair');assert.deepEqual(typo.matchedTerms,['panneau']);
  const legacy={...guide};delete legacy.searchSections;
  assert.equal(createDocumentation({...fixture(),pages:[legacy]}).search('resoudre','fr')[0].anchor,'repair');
  const malformed={...guide,searchSections:[{anchor:'repair',start:-5,end:999999},{anchor:'absent',start:0,end:10}]};
  assert.equal(createDocumentation({...fixture(),pages:[malformed]}).search('panneau','fr')[0].anchor,undefined);
  docs.pages('fr').pop();assert.equal(docs.search('panneau','fr').length,1);
});

test('search excerpts and marks retain original accents and Unicode after normalization', () => {
  const text=('e\u0301'.repeat(100)+' 😀 ').repeat(3)+'La résolution fonctionne.';
  const excerpt=searchExcerpt(text,['resolution']);assert.match(excerpt,/La résolution fonctionne/);assert.match(excerpt,/^…/);
  const decorated='😀 RE\u0301SOLUTION & <script>';
  const [range]=searchTextRanges(decorated,['resolution']);assert.equal(decorated.slice(range.start,range.end),'RE\u0301SOLUTION');
  assert.deepEqual(searchTextRanges('configuration',['config','configuration']),[{start:0,end:13}]);
});

test('only complete nonempty and current locales are available for publication', () => {
  const data=fixture();
  assert.deepEqual(createDocumentation(data).availableLocales().map(locale=>locale.code),['fr']);
  data.pages.push(page('only-fr','en','Settings','Advanced settings'));
  assert.deepEqual(createDocumentation(data).availableLocales().map(locale=>locale.code),['fr','en']);
  data.pages[0].revision='2';data.pages[1].sourceRevision='1';
  assert.deepEqual(createDocumentation(data).availableLocales().map(locale=>locale.code),['fr']);
  data.pages[1].sourceRevision='2';data.pages.at(-1).text='';
  assert.deepEqual(createDocumentation(data).availableLocales().map(locale=>locale.code),['fr']);
});
test('duplicate pages and unsupported manifests fail instead of silently overwriting', () => {
  const data = fixture(); data.pages.push(data.pages[0]);
  assert.throws(() => createDocumentation(data), /Duplicate page/);
  assert.throws(() => createDocumentation({ ...fixture(), schemaVersion: 8 }), /schema/);
  assert.throws(() => createDocumentation({ ...fixture(), defaultLocale: 'de' }), /Default locale/);
});
test('a documentation catalog addresses another local manual with stable page IDs', () => {
  const catalog = createDocumentationRegistry([{ id: 'editor', base: '../editor/help/index.html', manifest: fixture() }]);
  assert.equal(catalog.link({ documentationId: 'editor', locale: 'en', pageId: 'start' }), '../editor/help/index.html#/en/start');
  assert.throws(() => catalog.link({ documentationId: 'other', locale: 'en', pageId: 'start' }), /Unknown documentation/);
  assert.throws(() => catalog.link({ documentationId: 'editor', locale: 'en', pageId: 'missing' }), /Unknown page/);
});


test('navigation parents validate missing targets and cycles while preserving locale fallback', () => {
  const data=fixture();
  data.pages.push({...page('child','en','Child'),parent:'only-fr'});
  const docs=createDocumentation(data);
  assert.equal(docs.resolve('child','en').page.parent,'only-fr');
  assert.equal(docs.resolve('only-fr','en').fallback,true);
  assert.throws(()=>createDocumentation({...data,pages:[...data.pages,{...page('bad','fr','Bad'),parent:'missing'}]}),/Missing navigation parent/);
  assert.throws(()=>createDocumentation({...data,pages:[...data.pages,{...page('self','fr','Self'),parent:'self'}]}),/Invalid navigation parent/);
  assert.throws(()=>createDocumentation({...data,pages:[...data.pages,{...page('a','fr','A'),parent:'b'},{...page('b','fr','B'),parent:'a'}]}),/Invalid navigation parent/);
});


test('application logos stay local and remain optional', () => {
  const data=fixture();
  assert.equal(createDocumentation(data).data.logo,undefined);
  assert.equal(createDocumentation({...data,logo:'assets/app-logo.svg'}).data.logo,'assets/app-logo.svg');
  for(const logo of ['https://example.com/logo.svg','file:///private/logo.png','../logo.png','assets/../logo.png','assets/%2e%2e/logo.png','assets/%5cprivate.png','assets/%zz.png','',42]) {
    assert.throws(()=>createDocumentation({...data,logo}),/Logo must be a local file/);
  }
});

test('learning path destinations validate pages, aliases, anchors and explicit endpoints', () => {
  const start={...page('start','fr','Démarrer','Intro'),previous:'',next:'old#task'},end={...page('end','fr','Fin','Terminé'),headings:[{id:'task',text:'Tâche',level:2}],previous:'start',next:''};
  const data={...fixture(),pages:[start,end],aliases:{old:'end'}};
  assert.equal(createDocumentation(data).resolve('start').page.next,'old#task');
  for(const next of ['missing','end#missing','start','end#','end#task#extra',false])assert.throws(()=>createDocumentation({...data,pages:[{...start,next},end]}),/learning path/);
  assert.equal(createDocumentation({...data,pages:[{...start,next:'start#intro',headings:[{id:'intro',text:'Introduction',level:2}]},end]}).pages().length,2);
});
