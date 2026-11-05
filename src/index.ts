export type * from './types.js';
import type { Documentation, DocPage, DocRoute, SearchResult, ResolvedPage, SearchOptions } from './types.js';

export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase().trim();
}

export function createLink({ locale, pageId, anchor, state }: DocRoute, base = ''): string {
  const query = new URLSearchParams();
  for (const key of Object.keys(state || {}).sort()) if (/^[a-zA-Z][\w-]{0,31}$/.test(key) && String(state![key]).length <= 2000) query.set(key, String(state![key]));
  return `${base.split('#')[0]}#/${encodeURIComponent(locale)}/${encodeURIComponent(pageId)}${anchor ? `/${encodeURIComponent(anchor)}` : ''}${query.size ? `?${query}` : ''}`;
}

export function parseLink(hash: string, defaultLocale = 'fr', homePage = 'overview'): DocRoute {
  const [path, query] = hash.replace(/^#\/?/, '').split('?');
  const parts = path!.split('/');
  try {
    const route: DocRoute = { locale: decodeURIComponent(parts[0] || defaultLocale), pageId: decodeURIComponent(parts[1] || homePage), anchor: parts[2] ? decodeURIComponent(parts[2]) : undefined };
    if (query && query.length <= 16000) route.state = Object.fromEntries([...new URLSearchParams(query)].filter(([key, value]) => /^[a-zA-Z][\w-]{0,31}$/.test(key) && value.length <= 2000));
    return route;
  } catch { return { locale: defaultLocale, pageId: homePage }; }
}

/** A host-owned catalog maps documentation identities to local reader locations. */
export function createDocumentationRegistry(locations: Array<{ id: string; base: string; manifest?: Documentation }>) {
  const catalog = new Map<string, { base: string; docs?: ReturnType<typeof createDocumentation> }>();
  for (const location of locations) {
    if (catalog.has(location.id)) throw new Error(`Duplicate documentation: ${location.id}`);
    catalog.set(location.id, { base: location.base, docs: location.manifest ? createDocumentation(location.manifest) : undefined });
  }
  return {
    link(target: DocRoute & { documentationId: string }) {
      const location = catalog.get(target.documentationId);
      if (!location) throw new Error(`Unknown documentation: ${target.documentationId}`);
      const page = location.docs?.resolve(target.pageId, target.locale);
      if (location.docs && !page) throw new Error(`Unknown page: ${target.pageId}`);
      if (page && target.anchor && !hasAnchor(page.page, target.anchor)) throw new Error(`Unknown section: ${target.anchor}`);
      return createLink(target, location.base);
    },
    ids: () => [...catalog.keys()]
  };
}

export const hasAnchor = (page: DocPage, anchor: string) => page.headings.some(heading => heading.id === anchor) || !!page.anchors?.includes(anchor);
function distance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(row[j - 1]! + 1, previous[j]! + 1, previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (Math.min(...row) > max) return max + 1;
    previous = row;
  }
  return previous[b.length]!;
}

export function createDocumentation(data: Documentation) {
  if (data.schemaVersion !== 1) throw new Error('Unsupported CyDoc schema version');
  const locales = new Set(data.locales.map(locale => locale.code));
  if (!locales.has(data.defaultLocale)) throw new Error('Default locale must be declared');
  const index = new Map<string, DocPage>();
  const searchIndex = new Map<DocPage, { title: string; description: string; text: string; words: string[] }>();
  for (const page of data.pages) {
    if (!page.id || !locales.has(page.locale)) throw new Error(`Invalid page: ${page.id}`);
    const key = `${page.locale}\0${page.id}`;
    if (index.has(key)) throw new Error(`Duplicate page: ${page.locale}/${page.id}`);
    index.set(key, page);
    const text = normalize(`${page.text} ${page.symbol || ''}`);
    searchIndex.set(page, { title: normalize(page.title), description: normalize(page.description), text, words: [...new Set(normalize(`${page.title} ${page.description} ${text}`).split(/[^\p{L}\p{N}_]+/u).filter(word => word.length >= 3))] });
  }

  function canonicalRoute(route: DocRoute): DocRoute {
    const visited = new Set<string>(); let result = { ...route };
    while (data.aliases && Object.hasOwn(data.aliases,result.pageId)) {
      if (visited.has(result.pageId)) throw new Error(`Redirect cycle: ${result.pageId}`);
      visited.add(result.pageId);
      const destination=data.aliases[result.pageId];if(typeof destination!=='string')throw new Error(`Invalid redirect: ${result.pageId}`);
      const [id, anchor] = destination.split('#');
      result = { ...result, pageId: id!, anchor: result.anchor || anchor };
    }
    return result;
  }
  for (const id of Object.keys(data.aliases || {})) {
    if ([...index.values()].some(page => page.id === id)) throw new Error(`Redirect shadows a page: ${id}`);
    const target = canonicalRoute({ locale: data.defaultLocale, pageId: id });
    const page = index.get(`${data.defaultLocale}\0${target.pageId}`);
    if (!page || (target.anchor && !hasAnchor(page, target.anchor))) throw new Error(`Invalid redirect: ${id}`);
  }

  function resolve(pageId: string, locale = data.defaultLocale): ResolvedPage | undefined {
    pageId = canonicalRoute({ locale, pageId }).pageId;
    const page = index.get(`${locale}\0${pageId}`) ?? index.get(`${data.defaultLocale}\0${pageId}`);
    return page ? { page, requestedLocale: locale, fallback: page.locale !== locale } : undefined;
  }

  function pages(locale = data.defaultLocale): DocPage[] {
    return [...new Set(data.pages.map(page => page.id))]
      .map(id => resolve(id, locale)?.page).filter((page): page is DocPage => !!page)
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, locale));
  }

  function search(query: string, locale = data.defaultLocale, limit = 12, options: SearchOptions = {}): SearchResult[] {
    const terms = normalize(query).slice(0, 200).split(/\s+/).filter(Boolean).slice(0, 12);
    if (!terms.length) return [];
    return pages(locale).flatMap(page => {
      if (options.language && !page.languages?.includes(options.language)) return [];
      if (options.kind && (page.kind || (page.sourcePageId ? 'api' : 'guide')) !== options.kind) return [];
      const item = searchIndex.get(page)!;
      let penalty = 0;
      if (!terms.every(term => {
        if (`${item.title} ${item.description} ${item.text}`.includes(term)) return true;
        if (options.fuzzy === false || term.length < 4 || term.length > 60) return false;
        const max = term.length > 7 ? 2 : 1;
        const found = item.words.some(word => word.length <= 60 && distance(term, word, max) <= max);
        if (found) penalty += 3; return found;
      })) return [];
      const score = terms.reduce((sum, term) => sum + (item.title.includes(term) ? 12 : 0) + (item.description.includes(term) ? 5 : 0) + (item.text.includes(term) ? 1 : 0), 0) - penalty;
      const match = item.text.indexOf(terms[0]!);
      const start = Math.max(0, match - 45);
      const line = page.kind === 'source' ? page.code?.split('\n').findIndex(line => normalize(line).includes(terms[0]!)) : undefined;
      return [{ page, score, excerpt: `${start ? '…' : ''}${page.text.slice(start, start + 145)}${page.text.length > start + 145 ? '…' : ''}`, ...(line !== undefined && line >= 0 ? { anchor: `L${line + 1}` } : {}) }];
    }).sort((a, b) => b.score - a.score || a.page.order - b.page.order).slice(0, Math.max(0, limit));
  }
  return { data, resolve, pages, search, link: createLink, canonicalRoute };
}
