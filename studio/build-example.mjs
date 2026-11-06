import { readFile, mkdir, cp, rm, writeFile } from 'node:fs/promises';
import { resolve, relative, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFrontmatter } from '../tools/compiler.mjs';
import { extractComments } from '../tools/extract.mjs';
import { importApi } from '../tools/api-import.mjs';
import { buildApiFilePages, languageOf } from '../tools/source-index.mjs';
import { files, digest } from './server/storage.mjs';
import { serialize } from './server/workspace.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Package editable Markdown and media from the maintained CyDoc manual. */
export async function buildExample(destination) {
  destination = resolve(destination);
  if (destination !== resolve(repository, 'studio/dist/example')) throw new Error('Example output must be the generated Studio dist/example directory.');
  const config = JSON.parse(await readFile(join(repository, 'cydoc.config.json'), 'utf8'));
  const pages = [];
  for (const locale of config.locales) {
    for (const file of await files(join(repository, config.content, locale.code), /\.md$/i)) {
      const { metadata, body } = readFrontmatter(await readFile(file, 'utf8'));
      if (metadata.audience && metadata.audience !== 'user') continue;
      pages.push({ ...metadata, locale: locale.code, markdown: body });
    }
  }
  const records = [];
  for (const directory of config.sources || []) {
    for (const file of await files(join(repository, directory))) {
      if (!languageOf(file)) continue;
      const source = await readFile(file, 'utf8');
      const extracted = extractComments(source, relative(repository, file).replaceAll('\\', '/'));
      records.push({ file, source, pages: extracted });
      pages.push(...extracted);
    }
  }
  pages.push(...await importApi(config.apiImports, {
    base: repository, locales: config.locales,
    sourceFiles: new Set(records.map(record => relative(repository, record.file).replaceAll('\\', '/')))
  }));
  pages.push(...buildApiFilePages(records, {
    base: repository, includeDirs: config.apiIndex.includeDirs.map(directory => join(repository, directory)), locales: config.locales
  }).map(page => ({ ...page, kind: 'api' })));

  // The Studio sample is a single editable edition; separate version builds remain a CLI feature.
  const versionIntro = {
    en: 'Published manuals can offer a version selector that preserves the current page, section and media state. This editable Studio example contains one edition; use separate CLI exports to try multiple versions.',
    fr: 'Les manuels publiés peuvent proposer un sélecteur de version qui conserve la page, la section et les médias affichés. Cet exemple modifiable dans Studio contient une édition ; utilisez des exports CLI distincts pour essayer plusieurs versions.'
  };
  for (const page of pages.filter(page => page.id === 'versions')) page.markdown = page.markdown.replace(/^[\s\S]*?(?=\n## )/, versionIntro[page.locale] + '\n');
  const originals = new Map(pages.filter(page => page.locale === 'en').map(page => [page.id, digest(page.markdown).slice(0, 12)]));
  // Only generated build output is replaced, never authored documentation inputs.
  await rm(destination, { recursive: true, force: true });
  for (const page of pages) {
    const { markdown, locale, ...values } = page;
    const metadata = Object.fromEntries(Object.entries(values).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value)));
    if (locale === 'en') metadata.revision = originals.get(page.id);
    else metadata.sourceRevision = originals.get(page.id);
    const directory = join(destination, 'manual', locale);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, page.id + '.md'), serialize(metadata, markdown));
  }
  await cp(join(repository, config.assets), join(destination, 'assets'), { recursive: true });
  await writeFile(join(destination, 'cydoc.config.json'), JSON.stringify({
    name: 'CyDoc', version: config.version, defaultLocale: 'en', homePage: config.homePage,
    content: 'manual', assets: 'assets', out: '../Documentation', locales: config.locales,
    modules: config.modules, glossary: config.glossary, aliases: config.aliases, landingPage: false
  }, null, 2));
  await cp(join(repository, 'LICENSE'), join(destination, 'LICENSE.txt'));
  return { pages: pages.length, locales: config.locales.length };
}
