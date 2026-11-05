import { readFile, writeFile, mkdir, readdir, cp, unlink, stat } from 'node:fs/promises';
import { resolve, join, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { compileMarkdown, readFrontmatter } from './compiler.mjs';
import { extractComments } from './extract.mjs';
import { packMeshAssets } from './pack-mesh.mjs';
import { languageOf, buildSourcePages } from './source-index.mjs';
import { importApi } from './api-import.mjs';
import { translationReport, reportPage } from './reports.mjs';
import { createHash } from 'node:crypto';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function walk(directory, extension) {
  const entries = await readdir(directory, { withFileTypes: true });
  const lists = await Promise.all(entries.filter(entry => !entry.name.startsWith('.') && !['node_modules', 'dist'].includes(entry.name)).map(async entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path, extension) : (!extension || extension.test(entry.name) ? [path] : []);
  }));
  return lists.flat().sort();
}
export async function buildSite(configPath = resolve('cydoc.config.json'), overrides = {}) {
  const { createDocumentation, hasAnchor, parseLink } = await import('../dist/index.js');
  const base = dirname(resolve(configPath));
  const config = { ...JSON.parse(await readFile(configPath, 'utf8')), ...overrides };
  const linkedDocs = structuredClone(config.linkedDocs || {});
  for (const target of Object.values(linkedDocs)) if (target.manifest) target.data = JSON.parse(await readFile(resolve(base, target.manifest), 'utf8'));
  const modules = config.modules || [];
  if (!Array.isArray(modules) || modules.some(name => !['image', 'video', 'mesh', 'gallery', 'graph', 'gif'].includes(name))) throw new Error('Unknown media module');
  const compile = (markdown, page, symbols) => ({ ...compileMarkdown(markdown, { locale:page.locale,pageId:page.id,linkedDocs,glossary:config.glossary?.[page.locale] || {},symbols }), ...(page.kind ? {kind:page.kind} : page.symbol ? {kind:'api'} : {}), revision:String(page.revision || createHash('sha256').update(markdown).digest('hex').slice(0,12)) });
  for (const version of config.versions || []) if (!version.id || !version.label || !version.base || /[\u0000-\u0020\\]/.test(version.base) || /^(?!file:)[a-z][\w+.-]*:|^\/\//i.test(version.base)) throw new Error('Version destinations must be local file paths');
  const output = resolve(base, config.out || 'dist/site');
  const delta = relative(base, output);
  if (!delta || delta.startsWith('..') || isAbsolute(delta)) throw new Error('Output must be a subdirectory of the project');
  const pages = [];
  for (const locale of config.locales) {
    for (const file of await walk(resolve(base, config.content, locale.code), /\.md$/i)) {
      const { metadata, body } = readFrontmatter(await readFile(file, 'utf8'));
      const page = { ...metadata, locale:locale.code }; pages.push({ ...page, description: metadata.description || '', order: Number(metadata.order || 0), ...compile(body,page) });
    }
  }
  const sourceRecords = [];
  const scanned = new Set();
  for (const directory of config.sources || []) {
    for (const file of await walk(resolve(base, directory), /\.(?:[cm]?[jt]sx?|cs|java|kt|rs|c|cc|cpp|cxx|h|hh|hpp|hxx|cppm|ixx|swift|py|pyi|hlsl|hlsli|glsl|vert|frag|geom|comp|tesc|tese)$/i)) {
      if (scanned.has(file)) continue; scanned.add(file);
      const source = await readFile(file, 'utf8');
      const extractedPages = extractComments(source, relative(base, file).replaceAll('\\', '/'));
      if (config.sourceIndex?.enabled && languageOf(file)) sourceRecords.push({ file, source, pages: extractedPages });
      for (const extracted of extractedPages) {
        const { markdown, ...page } = extracted;
        pages.push({ ...page, ...compile(markdown,page) });
      }
    }
  }
  const imported = await importApi(config.apiImports, { base,locales:config.locales,sourceFiles:new Set(sourceRecords.map(record=>relative(base,record.file).replaceAll('\\','/'))) });
  for (const {markdown,...page} of imported) pages.push({...page,...compile(markdown,page)});
  if (sourceRecords.length) {
    const sourcePages = buildSourcePages(sourceRecords, { base, includeDirs: config.sourceIndex.includeDirs, locales: config.locales });
    for (const page of pages) {
      const record = sourceRecords.find(record => record.pages.some(extracted => extracted.id === page.id && extracted.locale === page.locale));
      if (record) page.sourcePageId = record.id;
    }
    for (const { markdown, ...page } of sourcePages) {
      page.kind='source';
      const symbols=Object.create(null);for(const item of pages.filter(item=>item.locale===page.locale && item.symbol)){const short=item.symbol.split(/::|\./).at(-1);symbols[short] ||= item.id;}
      pages.push({ ...page, ...compile(markdown,page,symbols) });
    }
  }
  const translations = translationReport(pages,config);
  if(config.translationReport) for(const locale of config.locales){const {markdown,...page}=reportPage(translations,locale.code);pages.push({...page,...compile(markdown,page)});}
  const data = { schemaVersion: 1, name: config.name, version: config.version, defaultLocale: config.defaultLocale, locales: config.locales, aliases:config.aliases, versions:config.versions, pages: pages.map(({ mediaBlocks, ...page }) => page) };
  const library = createDocumentation(data);
  if (!pages.length) throw new Error('Documentation must include at least one page');
  if (config.homePage && !library.resolve(config.homePage, config.defaultLocale)) throw new Error(`Home page does not exist: ${config.homePage}`);
  for (const page of pages) {
    for (const href of page.links || []) {
      const match = href.split('?')[0].match(/^#\/([^/]+)\/([^/]+)(?:\/(.+))?$/);
      if (!match) continue;
      const target = library.resolve(decodeURIComponent(match[2]), decodeURIComponent(match[1]));
      if (!target) throw new Error(`Broken link in ${page.id}: ${href}`);
      if (match[3] && !hasAnchor(target.page,decodeURIComponent(match[3]))) throw new Error(`Broken section in ${page.id}: ${href}`);
      const state=parseLink(href).state;
      if(state?.media && ![...target.page.html.matchAll(/data-cydoc-id="([^"]+)"/g)].some(match=>match[1]===state.media))throw new Error(`Broken media link in ${page.id}: ${href}`);
    }
    for (const match of page.html.matchAll(/href="#\/([^/]+)\/([^/"\s]+)(?:\/([^"\s]+))?"/g)) {
      const route=parseLink(match[0].slice(6,-1).replaceAll('&amp;','&'));
      const target = library.resolve(route.pageId,route.locale);
      if (!target) throw new Error(`Broken link in ${page.id}: ${match[0]}`);
      if (route.anchor && !hasAnchor(target.page,route.anchor)) throw new Error(`Broken section in ${page.id}: ${route.anchor}`);
    }
    for (const media of page.assets || []) {
      const asset = resolve(base, config.assets || 'assets', decodeURIComponent(media.replace(/^(?:\.\/)?assets\//, '')));
      const info = await stat(asset).catch(() => { throw new Error(`Missing media in ${page.id}: ${media}`); });
      if (!info.isFile()) throw new Error(`Media must be a file: ${media}`);
    }
  }
  await mkdir(output, { recursive: true });
  const assetCatalog = await packMeshAssets({ pages, assetRoot: resolve(base, config.assets || 'assets'), output, enabled: modules.includes('mesh'), gifEnabled:modules.includes('gif') });
  for (const name of ['image', 'video', 'mesh', 'gallery', 'graph', 'gif'].filter(name => !modules.includes(name))) await unlink(join(output, `media-${name}.js`)).catch(error => { if (error.code !== 'ENOENT') throw error; });
  await Promise.all([
    writeFile(join(output, 'data.js'), `globalThis.CYDOC_DATA=${JSON.stringify(data).replace(/</g, '\\u003c')};\nglobalThis.CYDOC_OPTIONS=${JSON.stringify({ homePage: config.homePage, landingPage: !!config.landingPage, modules, assets: assetCatalog }).replace(/</g, '\\u003c')};\n`),
    writeFile(join(output, 'manifest.json'), JSON.stringify(data, null, 2)),
    writeFile(join(output, 'translation-report.json'), JSON.stringify(translations,null,2)),
    cp(resolve(projectRoot, 'web/reader.html'), join(output, 'index.html')),
    cp(resolve(projectRoot, 'src/viewer.css'), join(output, 'viewer.css')),
    cp(resolve(projectRoot, 'src/viewer.css'), resolve(projectRoot, 'dist/viewer.css')),
    cp(resolve(base, config.assets || 'assets'), join(output, 'assets'), { recursive: true }),
    build({ entryPoints: [resolve(projectRoot, 'web/boot.mjs')], bundle: true, format: 'iife', minify: true, target: 'es2020', outfile: join(output, 'viewer.js') })
  ]);
  for (const name of modules) await build({ entryPoints: [resolve(projectRoot, `dist/modules/${name}.js`)], bundle: true, format: 'iife', globalName: `CyDocMedia_${name}`, minify: true, target: 'es2020', outfile: join(output, `media-${name}.js`), legalComments: 'eof' });
  if (modules.includes('mesh')) {
    const threeEntry = fileURLToPath(import.meta.resolve('three'));
    await cp(resolve(dirname(threeEntry), '../LICENSE'), join(output, 'media-mesh.LICENSE.txt'));
  } else await unlink(join(output, 'media-mesh.LICENSE.txt')).catch(error => { if (error.code !== 'ENOENT') throw error; });
  console.log(`CyDoc: ${pages.length} pages, ${config.locales.length} locales → ${output}`);
  for(const entry of config.versionBuilds || []) {
    const destination=resolve(output,entry.destination), delta=relative(output,destination);
    if(!delta || delta.startsWith('..') || isAbsolute(delta))throw new Error('Version output must stay inside the export');
    const childConfig=resolve(base,entry.config);
    const childSettings=JSON.parse(await readFile(childConfig,'utf8'));
    const childBase=dirname(childConfig), childIds=new Set();
    for(const locale of childSettings.locales)for(const file of await walk(resolve(childBase,childSettings.content,locale.code),/\.md$/i))childIds.add(readFrontmatter(await readFile(file,'utf8')).metadata.id);
    if(childSettings.translationReport)childIds.add('translation-report');
    const aliases={...Object.fromEntries(data.pages.filter(page=>!childIds.has(page.id)).map(page=>[page.id,childSettings.homePage||'overview'])),...childSettings.aliases};
    const child=await buildSite(childConfig,{aliases,versionBuilds:[]});
    await mkdir(destination,{recursive:true});await cp(child.output,destination,{recursive:true});
  }
  return { data, output };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildSite(process.argv[2]);
