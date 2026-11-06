import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createDocumentation, createLink, parseLink } from '../dist/index.js';
import { compileMarkdown } from '../tools/compiler.mjs';
import { importApi, typedocSymbols, xmlTree } from '../tools/api-import.mjs';
import { translationReport } from '../tools/reports.mjs';
import { decodeGif } from '../dist/modules/gif-decode.js';
import { readingStore } from '../dist/reader-tools.js';

const page = (id, extra = {}) => ({ id, locale:'fr',title:id,description:'',section:'Guide',order:0,html:'',text:'',headings:[],...extra });
const data = pages => ({ schemaVersion:1,name:'Unit',version:'1',defaultLocale:'fr',locales:[{code:'fr',label:'Français'},{code:'en',label:'English'}],pages });
const block = (kind, value) => '```'+kind+'\n'+JSON.stringify(value)+'\n```';

test('precise routes round-trip media state and aliases preserve a destination section', () => {
  const route={locale:'fr',pageId:'mesh-viewer',state:{media:'modèle',camera:'1,2,3',target:'0,0,0',note:'clé & vis'}};
  const url=createLink(route,'file:///D:/Help/index.html');
  assert.deepEqual(parseLink(url.slice(url.indexOf('#'))), {...route,anchor:undefined});
  const docs=createDocumentation({...data([page('new',{headings:[{id:'install',text:'Install',level:2}]})]),aliases:{old:'new#install'}});
  assert.equal(docs.resolve('old').page.id,'new');
  assert.deepEqual(docs.canonicalRoute({locale:'fr',pageId:'old'}),{locale:'fr',pageId:'new',anchor:'install'});
  assert.equal(docs.resolve('toString'),undefined);
  assert.throws(()=>createDocumentation({...data([page('new')]),aliases:{a:'b',b:'a'}}),/cycle/);
});

test('search tolerates typos, filters languages and content, and targets real source lines', () => {
  const docs=createDocumentation(data([page('config',{title:'Configuration'}),page('source',{kind:'source',languages:['cpp'],text:'void make_help_link();',code:'// helper\nvoid make_help_link();'}),page('python',{kind:'source',languages:['python'],text:'make_help_link'})]));
  assert.equal(docs.search('configuraton')[0].page.id,'config');
  assert.equal(docs.search('configuraton','fr',12,{fuzzy:false}).length,0);
  const [match]=docs.search('make_help_link','fr',12,{kind:'source',language:'cpp'});
  assert.equal(match.page.id,'source');assert.equal(match.anchor,'L2');
  assert.equal(docs.search('make_help_link','fr',12,{kind:'api'}).length,0);
});

test('rich blocks preserve safe nested Markdown, code line anchors, glossary, and diffs', () => {
  const markdown=[block('tabs',{items:[{label:'C++',lang:'cpp',code:'/* multiline\ncomment */\nvoid f();'},{label:'Python',lang:'python',code:'def f():\n    return 1'}]}),block('steps',{items:[{title:'Open',body:'[API](doc:api)'}]}),block('callout',{type:'warning',title:'Careful',body:'<script>alert(1)</script>'}),block('details',{title:'More',body:'**Details**'}),'[[PBR]]',block('diff',{before:'old();',after:'<script>bad()</script>'})].join('\n\n');
  const compiled=compileMarkdown(markdown,{locale:'fr',pageId:'rich',glossary:{PBR:'Physical materials'}});
  assert.match(compiled.html,/role="tablist"/);assert.match(compiled.html,/role="tabpanel"[^>]+hidden/);
  assert.ok(compiled.anchors.includes('L3'));assert.ok(compiled.anchors.includes('code-2-L2'));
  assert.match(compiled.html,/role="tooltip"/);assert.match(compiled.html,/<ins>/);assert.match(compiled.html,/<del>/);
  assert.doesNotMatch(compiled.html,/<script>/);assert.ok(compiled.links.includes('#/fr/api'));
  assert.deepEqual(compiled.languages,['cpp','python']);
  assert.doesNotThrow(()=>compileMarkdown('```java\nString s = value.toString();\n```',{locale:'fr',pageId:'safe',symbols:{}}));
  const image=block('image',{id:'same',src:'assets/a.svg'});
  assert.throws(()=>compileMarkdown(image+'\n\n'+image,{locale:'fr',pageId:'duplicate'}),/Duplicate media id/);
});

test('Doxygen and TypeDoc adapters preserve parameters, returns, inheritance and source lines', async () => {
  const pages=await importApi([{format:'doxygen',prefix:'doxygen',path:'examples/api/doxygen'},{format:'typedoc',prefix:'typedoc',path:'examples/api/typedoc.json'}],{base:process.cwd(),locales:[{code:'en'}],sourceFiles:new Set(['examples/cpp/include/cydoc/session.hpp','examples/typescript/help.ts'])});
  const method=pages.find(page=>page.id==='doxygen-cydoc-helpsession-open-open');
  assert.match(method.markdown,/\| `page` \| `std::string_view`/);assert.match(method.markdown,/## Returns/);assert.match(method.markdown,/#L11/);
  assert.match(pages.find(page=>page.id==='doxygen-cydoc-helpsession-session').markdown,/doc:doxygen-cydoc-docsession-base/);
  assert.match(pages.find(page=>page.id==='typedoc-helplink-2').markdown,/section\?/);
  const typed=typedocSymbols({id:0,name:'Test',children:[{id:1,name:'Base',kind:128},{id:2,name:'Child',kind:128,extendedTypes:[{type:'reference',name:'Base',target:1}]}]});
  assert.equal(typed[1].bases[0].key,'1');
  assert.throws(()=>xmlTree('<!DOCTYPE a SYSTEM "file:///private"><a/>'),/DTD/);
  assert.throws(()=>xmlTree('<a><b></a>'),/Malformed/);
});

test('translation reporting distinguishes missing, outdated, current, and untracked pages', () => {
  const pages=[page('current',{revision:'2'}),page('current',{locale:'en',sourceRevision:'2'}),page('old',{revision:'2'}),page('old',{locale:'en',sourceRevision:'1'}),page('missing',{revision:'1'}),page('untracked',{revision:'1'}),page('untracked',{locale:'en'})];
  const report=translationReport(pages,{defaultLocale:'fr',locales:[{code:'fr'},{code:'en'}]});
  assert.equal(report.current,1);assert.deepEqual(report.outdated.map(item=>item.id),['old']);assert.deepEqual(report.missing.map(item=>item.id),['missing']);assert.deepEqual(report.untracked.map(item=>item.id),['untracked']);
});

test('GIF raster frames agree with Pillow across palettes, transparency and disposal methods', async () => {
  for(const fixture of JSON.parse(await readFile('tests/fixtures/gif/expected.json','utf8'))){
    const gif=decodeGif(await readFile(fixture.path));assert.equal(gif.width,fixture.width);assert.equal(gif.height,fixture.height);
    assert.deepEqual(gif.frames.map(frame=>createHash('sha256').update(frame.rgba).digest('hex')),fixture.hashes,fixture.path);
  }
  const bytes=await readFile('assets/steps-a.gif');
  assert.throws(()=>decodeGif(bytes,100),/budget/);
  assert.throws(()=>decodeGif(bytes.subarray(0,20)),/Truncated/);
});

test('GIF interlaced raster rows restore in display order', () => {
  const rowOrder=[0,4,2,6,1,3,5,7], codes=[];
  for(const row of rowOrder)for(let x=0;x<4;x++)codes.push(4,row%2);codes.push(5);
  const packed=new Uint8Array(Math.ceil(codes.length*3/8));let bit=0;
  for(const code of codes)for(let i=0;i<3;i++,bit++)packed[bit>>3]|=(code>>i&1)<<(bit&7);
  const gif=decodeGif(Uint8Array.from([...Buffer.from('GIF89a'),4,0,8,0,128,0,0,0,0,0,255,255,255,0x2c,0,0,0,0,4,0,8,0,64,2,packed.length,...packed,0,0x3b]));
  for(let row=0;row<8;row++)for(let x=0;x<4;x++)assert.equal(gif.frames[0].rgba[(row*4+x)*4],row%2?255:0);
});

test('local reading data persists bookmarks, notes and positions and rejects malformed records', t => {
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage'), values=new Map();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)}});
  t.after(()=>{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;});
  const store=readingStore('fixture');store.data.bookmarks.push({id:'page',locale:'fr',title:'Page',href:'file:///help/index.html#/fr/page',time:1});store.data.notes['fr:page']='Private note';store.data.positions['fr:page']=400;assert.equal(store.save(),true);
  assert.equal(readingStore('fixture').data.notes['fr:page'],'Private note');assert.equal(readingStore('fixture').data.positions['fr:page'],400);
  values.set('cydoc:reading:broken',JSON.stringify({bookmarks:[{href:'javascript:bad'}],positions:{bad:-1},notes:{bad:1}}));
  assert.deepEqual(readingStore('broken').data,{bookmarks:[],history:[],notes:{},positions:{}});
});

test('demo version exports are distinct local manuals with real freshness examples', async () => {
  const v1=JSON.parse(await readFile('dist/site/DocData/versions/v1/DocData/manifest.json','utf8'));
  const v2=JSON.parse(await readFile('dist/site/DocData/versions/v2/DocData/manifest.json','utf8'));
  assert.equal(v1.version,'1-demo');assert.equal(v2.version,'2-demo');assert.notEqual(v1.pages[0].text,v2.pages[0].text);
  assert.equal(createDocumentation(v2).resolve('media').page.id,'overview');
  const report=JSON.parse(await readFile('dist/site/DocData/versions/v2/DocData/translation-report.json','utf8'));
  assert.ok(report.missing.some(page=>page.id==='new-feature'));assert.ok(report.outdated.some(page=>page.id==='overview'));
  const main=JSON.parse(await readFile('dist/site/DocData/manifest.json','utf8'));
  for (const [manifest, entry] of [[main,'../dist/site/Documentation.html'],[v1,'../dist/site/DocData/versions/v1/Documentation.html'],[v2,'../dist/site/DocData/versions/v2/Documentation.html']]) {
    for (const version of manifest.versions) {
      const url=new URL(version.base,new URL(entry,import.meta.url));
      assert.ok(url.pathname.endsWith('/Documentation.html'));
      await access(url);
    }
  }
});
