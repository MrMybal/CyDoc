import { readFile, writeFile, mkdir, readdir, cp, unlink, stat } from 'node:fs/promises';
import { resolve, join, dirname, basename, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { compileMarkdown, readFrontmatter } from './compiler.mjs';
import { extractComments } from './extract.mjs';
import { packMeshAssets } from './pack-mesh.mjs';
import { languageOf, buildApiFilePages } from './source-index.mjs';
import { importApi } from './api-import.mjs';
import { translationReport } from './reports.mjs';
import { createHash } from 'node:crypto';
import { migrateLegacyExport } from './export-layout.mjs';
import { docAiGuide } from './doc-ai.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function walk(directory, extension) {
  const entries = await readdir(directory, { withFileTypes: true });
  const lists = await Promise.all(entries.filter(entry => !entry.name.startsWith('.') && !['node_modules', 'dist'].includes(entry.name)).map(async entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path, extension) : (!extension || extension.test(entry.name) ? [path] : []);
  }));
  return lists.flat().sort();
}
export async function buildSite(configPath, overrides = {}) {
  const { createDocumentation, hasAnchor, parseLink } = await import('../dist/index.js');
  if (!configPath) {
    const preferred = resolve('.CyDocBuild/cydoc.config.json');
    configPath = await stat(preferred).then(() => preferred).catch(error => { if (error.code !== 'ENOENT') throw error; return resolve('cydoc.config.json'); });
  }
  const base = dirname(resolve(configPath));
  const applicationRoot = basename(base).toLowerCase() === '.cydocbuild' ? dirname(base) : base;
  const config = { ...JSON.parse(await readFile(configPath, 'utf8')), ...overrides };
  if (config.defaultLocale !== 'en' || !['en','fr'].every(code => config.locales?.some(locale => locale.code === code))) throw new Error('Documentation requires English as its source/default locale and a complete French translation');
  const apiIndex = config.apiIndex || config.sourceIndex || {};
  const linkedDocs = structuredClone(config.linkedDocs || {});
  for (const target of Object.values(linkedDocs)) if (target.manifest) target.data = JSON.parse(await readFile(resolve(base, target.manifest), 'utf8'));
  const modules = config.modules || [];
  if (!Array.isArray(modules) || modules.some(name => !['image', 'video', 'mesh', 'gallery', 'graph', 'gif'].includes(name))) throw new Error('Unknown media module');
  const compile = (markdown, page, symbols) => ({ ...compileMarkdown(markdown, { locale:page.locale,pageId:page.id,linkedDocs,glossary:config.glossary?.[page.locale] || {},symbols }), ...(page.kind ? {kind:page.kind} : page.symbol ? {kind:'api'} : {}), revision:String(page.revision || createHash('sha256').update(markdown).digest('hex').slice(0,12)) });
  for (const version of config.versions || []) if (!version.id || !version.label || !version.base || /[\u0000-\u0020\\]/.test(version.base) || /^(?!file:)[a-z][\w+.-]*:|^\/\//i.test(version.base)) throw new Error('Version destinations must be local file paths');
  const output = resolve(base, config.out || relative(base, join(applicationRoot, 'Documentation')));
  const delta = relative(applicationRoot, output);
  if (!delta || delta.startsWith('..') || isAbsolute(delta)) throw new Error('Output must be a subdirectory of the project');
  const dataOutput = join(output, 'DocData');
  const pages = [];
  const internalIds = new Set();
  for (const locale of config.locales) {
    for (const file of await walk(resolve(base, config.content, locale.code), /\.md$/i)) {
      if (basename(file).toLowerCase() === 'docai.md') continue;
      const { metadata, body } = readFrontmatter(await readFile(file, 'utf8'));
      if (metadata.audience && !['user', 'internal', 'ai'].includes(metadata.audience)) throw new Error(`Unknown documentation audience: ${metadata.audience}`);
      if (metadata.audience && metadata.audience !== 'user') { internalIds.add(metadata.id); continue; }
      const page = { ...metadata, locale:locale.code }; pages.push({ ...page, description: metadata.description || '', order: Number(metadata.order || 0), ...compile(body,page) });
    }
  }
  const sourceRecords = [];
  const scanned = new Set();
  for (const directory of config.sources || []) {
    for (const file of await walk(resolve(base, directory), /\.(?:[cm]?[jt]sx?|cs|java|kt|rs|c|cc|cpp|cxx|h|hh|hpp|hxx|cppm|ixx|swift|py|pyi|hlsl|hlsli|glsl|vert|frag|geom|comp|tesc|tese)$/i)) {
      if (scanned.has(file)) continue; scanned.add(file);
      const source = await readFile(file, 'utf8');
      const extractedPages = extractComments(source, relative(applicationRoot, file).replaceAll('\\', '/'));
      if (apiIndex.enabled && languageOf(file)) sourceRecords.push({ file, source, pages: extractedPages });
      for (const extracted of extractedPages) {
        const { markdown, ...page } = extracted;
        pages.push({ ...page, ...compile(markdown,page) });
      }
    }
  }
  const imported = await importApi(config.apiImports, { base,locales:config.locales,sourceFiles:new Set(sourceRecords.map(record=>relative(applicationRoot,record.file).replaceAll('\\','/'))) });
  for (const {markdown,...page} of imported) pages.push({...page,...compile(markdown,page)});
  if (sourceRecords.length) {
    const sourcePages = buildApiFilePages(sourceRecords, { base: applicationRoot, includeDirs: (apiIndex.includeDirs || []).map(directory => resolve(base, directory)), locales: config.locales });
    for (const page of pages) {
      const record = sourceRecords.find(record => record.pages.some(extracted => extracted.id === page.id && extracted.locale === page.locale));
      if (record) page.sourcePageId = record.id;
    }
    for (const { markdown, ...page } of sourcePages) {
      page.kind='api';
      const symbols=Object.create(null);for(const item of pages.filter(item=>item.locale===page.locale && item.symbol)){const short=item.symbol.split(/::|\./).at(-1);symbols[short] ||= item.id;}
      pages.push({ ...page, ...compile(markdown,page,symbols), languages: page.languages });
    }
  }
  const translations = translationReport(pages,config);
  const home = config.homePage || (pages.some(page => page.id === 'overview' && page.locale === config.defaultLocale) ? 'overview' : pages.find(page => page.locale === config.defaultLocale)?.id);
  if (!home) throw new Error('Documentation must include a human page in the default locale');
  if (config.translationReport) internalIds.add('translation-report');
  const aliases = { ...Object.fromEntries([...internalIds].filter(id => !pages.some(page => page.id === id)).map(id => [id, home])), ...config.aliases };
  const draft = { schemaVersion: 1, name: config.name, logo: config.logo, version: config.version, defaultLocale: config.defaultLocale, locales: config.locales, aliases, versions:config.versions, pages: pages.map(({ mediaBlocks, ...page }) => page) };
  const availableLocales = createDocumentation(draft).availableLocales();
  if (!availableLocales.some(locale => locale.code === config.defaultLocale)) throw new Error('The default documentation locale must contain every nonempty page before publication');
  if (!availableLocales.some(locale => locale.code === 'fr')) throw new Error('A complete, nonempty and current French translation is required before publishing documentation');
  const publishedCodes = new Set(availableLocales.map(locale => locale.code));
  const publishedPages = pages.filter(page => publishedCodes.has(page.locale));
  for (const locale of config.locales.filter(locale => !publishedCodes.has(locale.code))) console.warn(`CyDoc: locale ${locale.code} withheld; finish all its translations before publication.`);
  const data = { ...draft, locales: availableLocales, pages: publishedPages.map(({ mediaBlocks, ...page }) => page) };
  const library = createDocumentation(data);
  if (data.logo) {
    const logoPath = resolve(base, config.assets || 'assets', decodeURIComponent(data.logo.replace(/^(?:\.\/)?assets\//, '')));
    const logoInfo = await stat(logoPath).catch(() => { throw new Error(`Missing application logo: ${data.logo}`); });
    if (!logoInfo.isFile()) throw new Error('Application logo must be a file');
  }
  if (!pages.length) throw new Error('Documentation must include at least one page');
  if (config.homePage && !library.resolve(config.homePage, config.defaultLocale)) throw new Error(`Home page does not exist: ${config.homePage}`);
  for (const page of publishedPages) {
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
  const legacy = await migrateLegacyExport(output, dataOutput, join(output, 'Documentation.html'));
  await mkdir(dataOutput, { recursive: true });
  const assetCatalog = await packMeshAssets({ pages: publishedPages, assetRoot: resolve(base, config.assets || 'assets'), output: dataOutput, enabled: modules.includes('mesh'), gifEnabled:modules.includes('gif') });
  for (const name of ['image', 'video', 'mesh', 'gallery', 'graph', 'gif'].filter(name => !modules.includes(name))) await unlink(join(dataOutput, `media-${name}.js`)).catch(error => { if (error.code !== 'ENOENT') throw error; });
  await Promise.all([
    writeFile(join(dataOutput, 'data.js'), `globalThis.CYDOC_DATA=${JSON.stringify(data).replace(/</g, '\\u003c')};\nglobalThis.CYDOC_OPTIONS=${JSON.stringify({ homePage: config.homePage, landingPage: !!config.landingPage, modules, assets: assetCatalog }).replace(/</g, '\\u003c')};\n`),
    writeFile(join(dataOutput, 'manifest.json'), JSON.stringify(data, null, 2)),
    writeFile(join(dataOutput, 'translation-report.json'), JSON.stringify(translations,null,2)),
    cp(resolve(projectRoot, 'web/reader.html'), join(output, 'Documentation.html')),
    writeFile(join(output, 'DocAI.md'), docAiGuide(data, modules)),
    cp(resolve(projectRoot, 'src/viewer.css'), join(dataOutput, 'viewer.css')),
    cp(resolve(projectRoot, 'src/viewer.css'), resolve(projectRoot, 'dist/viewer.css')),
    cp(resolve(base, config.assets || 'assets'), join(dataOutput, 'assets'), { recursive: true }),
    build({ entryPoints: [resolve(projectRoot, 'web/boot.mjs')], bundle: true, format: 'iife', minify: true, target: 'es2020', outfile: join(dataOutput, 'viewer.js') })
  ]);
  for (const name of modules) await build({ entryPoints: [resolve(projectRoot, `dist/modules/${name}.js`)], bundle: true, format: 'iife', globalName: `CyDocMedia_${name}`, minify: true, target: 'es2020', outfile: join(dataOutput, `media-${name}.js`), legalComments: 'eof' });
  if (modules.includes('mesh')) {
    const threeEntry = fileURLToPath(import.meta.resolve('three'));
    await cp(resolve(dirname(threeEntry), '../LICENSE'), join(dataOutput, 'media-mesh.LICENSE.txt'));
  } else await unlink(join(dataOutput, 'media-mesh.LICENSE.txt')).catch(error => { if (error.code !== 'ENOENT') throw error; });
  console.log(`CyDoc: ${publishedPages.length} pages, ${availableLocales.length} locales → ${output}`);
  for(const entry of config.versionBuilds || []) {
    const destination=resolve(dataOutput,entry.destination), delta=relative(dataOutput,destination);
    if(!delta || delta.startsWith('..') || isAbsolute(delta))throw new Error('Version output must stay inside the export');
    const childConfig=resolve(base,entry.config);
    const childSettings=JSON.parse(await readFile(childConfig,'utf8'));
    const childBase=dirname(childConfig), childIds=new Set();
    for(const locale of childSettings.locales)for(const file of await walk(resolve(childBase,childSettings.content,locale.code),/\.md$/i)) {
      if (basename(file).toLowerCase() === 'docai.md') continue;
      const { metadata } = readFrontmatter(await readFile(file,'utf8'));
      if (!metadata.audience || metadata.audience === 'user') childIds.add(metadata.id);
    }
    const aliases={...Object.fromEntries(data.pages.filter(page=>!childIds.has(page.id)).map(page=>[page.id,childSettings.homePage||'overview'])),...childSettings.aliases};
    const child=await buildSite(childConfig,{aliases,versionBuilds:[]});
    if (legacy) {
      const previous = resolve(output, entry.destination), previousDelta = relative(output, previous);
      if (!previousDelta || previousDelta.startsWith('..') || isAbsolute(previousDelta)) throw new Error('Legacy version output must stay inside the export');
      await migrateLegacyExport(previous, join(destination, 'DocData'), join(destination, 'Documentation.html'));
    }
    await mkdir(destination,{recursive:true});await cp(child.output,destination,{recursive:true});
  }
  return { data, output };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildSite(process.argv[2]);
