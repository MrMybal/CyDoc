export type * from './types.js';
import type { Documentation, DocPage, DocRoute, SearchResult, ResolvedPage, SearchOptions } from './types.js';
import { searchExcerpt } from './search-text.js';

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
  if (data.logo !== undefined) {
    let decoded = '';
    try { decoded = decodeURIComponent(data.logo); } catch { throw new Error('Logo must be a local file under assets/'); }
    if (typeof data.logo !== 'string' || !/^(?:\.\/)?assets\/[a-zA-Z0-9_./%~-]+$/.test(data.logo) || /(?:^|\/)\.\.(?:\/|$)|[\\\u0000-\u0020]/.test(decoded)) throw new Error('Logo must be a local file under assets/');
  }
  const locales = new Set(data.locales.map(locale => locale.code));
  if (!locales.has(data.defaultLocale)) throw new Error('Default locale must be declared');
  const index = new Map<string, DocPage>();
  const searchIndex = new Map<DocPage, { title: string; description: string; text: string; all: string; words: string[]; sections: Array<{ anchor: string; title: string; heading: string; text: string; original: string }> }>();
  for (const page of data.pages) {
    if (!page.id || !locales.has(page.locale)) throw new Error(`Invalid page: ${page.id}`);
    const key = `${page.locale}\0${page.id}`;
    if (index.has(key)) throw new Error(`Duplicate page: ${page.locale}/${page.id}`);
    index.set(key, page);
    const text = normalize(`${page.text} ${page.symbol || ''}`);
    const all=normalize(`${page.title} ${page.description} ${text} ${page.headings.map(heading=>heading.text).join(' ')}`);
    const sections=page.headings.map(heading=>{
      const range=page.searchSections?.find(range=>range.anchor===heading.id&&Number.isInteger(range.start)&&Number.isInteger(range.end)&&range.start>=0&&range.end>=range.start&&range.end<=page.text.length);
      const original=range?page.text.slice(range.start,range.end):'';
      return {anchor:heading.id,title:heading.text,heading:normalize(heading.text),text:normalize(original),original};
    });
    searchIndex.set(page, { title: normalize(page.title), description: normalize(page.description), text, all, sections, words: [...new Set(all.split(/[^\p{L}\p{N}_]+/u).filter(word => word.length >= 3))] });
  }
  const pageIds = [...new Set(data.pages.map(page => page.id))];
  const completeLocales = data.locales.filter(locale => pageIds.length && pageIds.every(id => {
    const page = index.get(`${locale.code}\0${id}`), original = index.get(`${data.defaultLocale}\0${id}`);
    return page && !!(page.text.trim() || page.html.trim()) && (!page.sourceRevision || !original?.revision || String(page.sourceRevision) === String(original.revision));
  }));

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

  const orderedPages=new Map<string,DocPage[]>();
  function ordered(locale: string): DocPage[] {
    if(!orderedPages.has(locale))orderedPages.set(locale,pageIds
      .map(id => resolve(id, locale)?.page).filter((page): page is DocPage => !!page)
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, locale)));
    return orderedPages.get(locale)!;
  }
  function pages(locale = data.defaultLocale): DocPage[] { return [...ordered(locale)]; }

  for (const page of data.pages) {
    const visited = new Set<string>([page.id]);
    let ancestor = page;
    while (ancestor.parent !== undefined) {
      if (typeof ancestor.parent !== 'string' || !ancestor.parent || visited.has(ancestor.parent)) throw new Error(`Invalid navigation parent: ${page.id}`);
      visited.add(ancestor.parent);
      const parent = index.get(`${page.locale}\0${ancestor.parent}`) ?? index.get(`${data.defaultLocale}\0${ancestor.parent}`);
      if (!parent) throw new Error(`Missing navigation parent: ${ancestor.parent}`);
      ancestor = parent;
    }
    for(const direction of ['previous','next'] as const) {
      const value=page[direction];if(value===undefined||value==='')continue;
      if(typeof value!=='string'||value.trim()!==value)throw new Error(`Invalid learning path: ${page.id}/${direction}`);
      const parts=value.split('#');
      if(!parts[0]||parts.length>2||(parts.length===2&&!parts[1]))throw new Error(`Invalid learning path: ${page.id}/${direction}`);
      const target=canonicalRoute({locale:page.locale,pageId:parts[0],anchor:parts[1]}),destination=resolve(target.pageId,page.locale)?.page;
      if(!destination||(target.anchor&&!hasAnchor(destination,target.anchor))||(destination.id===page.id&&!target.anchor))throw new Error(`Invalid learning path destination: ${page.id}/${direction}: ${value}`);
    }
  }

  function search(query: string, locale = data.defaultLocale, limit = 12, options: SearchOptions = {}): SearchResult[] {
    const terms = normalize(query).slice(0, 200).split(/\s+/).filter(Boolean).slice(0, 12);
    if (!terms.length) return [];
    return ordered(locale).flatMap(page => {
      if (options.language && !page.languages?.includes(options.language)) return [];
      if (options.kind && (page.kind || (page.sourcePageId ? 'api' : 'guide')) !== options.kind) return [];
      const item = searchIndex.get(page)!;
      let penalty = 0; const matchedTerms: string[]=[];
      if (!terms.every(term => {
        if (item.all.includes(term)) {matchedTerms.push(term);return true;}
        if (options.fuzzy === false || term.length < 4 || term.length > 60) return false;
        const max = term.length > 7 ? 2 : 1;
        const found = item.words.find(word => word.length <= 60 && distance(term, word, max) <= max);
        if (found) {penalty += 3;matchedTerms.push(found);} return !!found;
      })) return [];
      const score = terms.reduce((sum, term) => sum + (item.title.includes(term) ? 12 : 0) + (item.description.includes(term) ? 5 : 0) + (item.text.includes(term) ? 1 : 0), 0) - penalty;
      const section=terms.every(term=>item.title.includes(term))?undefined:item.sections.map(section=>({section,score:matchedTerms.reduce((sum,term)=>sum+(section.heading.includes(term)?8:0)+(section.text.includes(term)?1:0),0)})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score)[0]?.section;
      const line = page.kind === 'source' ? page.code?.split('\n').findIndex(line => normalize(line).includes(terms[0]!)) : undefined;
      const excerpt=searchExcerpt(section?.original||page.text||page.description,matchedTerms);
      return [{ page, score, excerpt, matchedTerms, ...(line !== undefined && line >= 0 ? { anchor: `L${line + 1}` } : section ? {anchor:section.anchor,section:section.title} : {}) }];
    }).sort((a, b) => b.score - a.score || a.page.order - b.page.order).slice(0, Math.max(0, limit));
  }
  return { data, resolve, pages, search, link: createLink, canonicalRoute, availableLocales: () => [...completeLocales] };
}
