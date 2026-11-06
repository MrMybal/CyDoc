import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocumentation, createDocumentationRegistry, createLink, parseLink } from '../dist/index.js';

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
