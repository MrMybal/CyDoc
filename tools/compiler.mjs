import { Marked } from 'marked';
import Prism from 'prismjs';
import loadLanguages from 'prismjs/components/index.js';
import { parseBlueprint, validateGraph } from './blueprint.mjs';
import { renderDiagram } from './diagrams.mjs';
import { richBlock, highlightedLines } from './content.mjs';
loadLanguages(['c', 'cpp', 'csharp', 'python', 'glsl', 'hlsl', 'java', 'javascript', 'typescript', 'json', 'bash', 'cmake', 'kotlin', 'swift']);

export const escapeHtml = (text = '') => String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
export function safeUrl(value, media = false) {
  if (!value || /[\u0000-\u0020\u007f\\]/.test(value)) return '';
  if (media) return /^(?:\.\/)?assets\/[a-zA-Z0-9_./%~-]+$/.test(value) && !/(?:^|\/)\.\.(?:\/|$)/.test(decodeURIComponent(value)) ? value : '';
  return /^(https?:\/\/|mailto:|#)/i.test(value) ? value : '';
}

export function readFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) throw new Error('A page needs YAML-style frontmatter');
  const metadata = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([a-zA-Z]+):\s*(.*)$/);
    if (field) metadata[field[1]] = field[2].replace(/^(["'])(.*)\1$/, '$2');
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(metadata.id ?? '')) throw new Error(`Invalid stable page id: ${metadata.id}`);
  if (!metadata.title || !metadata.section) throw new Error(`Missing title or section: ${metadata.id}`);
  return { metadata, body: source.slice(match[0].length) };
}

export function compileMarkdown(body, { locale, pageId, linkedDocs = {}, glossary = {}, symbols = {} }) {
  const headings = [];
  const assets = new Set();
  const mediaBlocks = [];
  const links = [];
  let diagramIndex = 0;
  let blockIndex = 0, codeIndex = 0, mediaIndex = 0, nesting = 0;
  const anchors = [], languages = new Set(), codeText = [];
  const usedIds = new Set();
  const marked = new Marked({ gfm: true, breaks: false });
  const route = (id, anchor) => `#/${encodeURIComponent(locale)}/${encodeURIComponent(id)}${anchor ? `/${encodeURIComponent(anchor)}` : ''}`;
  function resolveHref(href) {
    let url;
    if (href.startsWith('doc://')) {
      const parsed = href.slice(6).match(/^([a-zA-Z0-9_-]+)\/([^#]+)(?:#(.+))?$/);
      const target = parsed && linkedDocs[parsed[1]];
      if (!target || !target.base) throw new Error(`Unknown linked documentation: ${href}`);
      if (/^[a-z]+:/i.test(target.base) && !/^(https?|file):/i.test(target.base)) throw new Error('Unsafe documentation base');
      const targetLocale = target.locale || locale;
      if (target.data) {
        const page = target.data.pages.find(page => page.id === parsed[2] && page.locale === targetLocale) || target.data.pages.find(page => page.id === parsed[2] && page.locale === target.data.defaultLocale);
        if (!page || (parsed[3] && !page.headings.some(heading => heading.id === parsed[3]) && !page.anchors?.includes(parsed[3]))) throw new Error(`Broken cross-documentation link: ${href}`);
      }
      url = `${target.base.split('#')[0]}#/${encodeURIComponent(targetLocale)}/${encodeURIComponent(parsed[2])}${parsed[3] ? `/${encodeURIComponent(parsed[3])}` : ''}`;
    } else if (href.startsWith('doc:')) {
      const [path, query] = href.slice(4).split('?');
      const [id, anchor] = path.split('#');
      url = route(id, anchor) + (query ? `?${query}` : '');
    } else if (href.startsWith('#/')) url = safeUrl(href);
    else if (href.startsWith('#')) url = route(pageId, href.slice(1));
    else url = safeUrl(href);
    if (url) links.push(url);
    return url;
  }
  const asset = value => { const url = safeUrl(value, true); if (!url) throw new Error(`Media must be local to assets/: ${value}`); assets.add(url); return url; };
  const media = (kind, config) => {
    config.id ||= `media-${++mediaIndex}`;
    if (!/^[\w-]{1,80}$/.test(config.id)) throw new Error('Invalid media id');
    if (kind === 'gallery') {
      if (!Array.isArray(config.items) || !config.items.length || config.items.length > 100) throw new Error('Gallery requires 1–100 media');
      for (const item of config.items) { if (!['image', 'video', 'mesh', 'gif'].includes(item.type)) throw new Error('Unsupported gallery media type'); media(item.type, item); }
    } else if (kind === 'graph') {
      validateGraph(config);
      for (const node of config.nodes) if (node.link || node.href) node.href = resolveHref(node.link || node.href);
    } else config.src = asset(config.src);
    if (config.compare) config.compare = asset(config.compare);
    for (const key of ['sources', 'compareSources']) if (config[key]) {
      if (!Array.isArray(config[key])) throw new Error(`${key} must be an array`);
      config[key] = config[key].map(source => ({ ...source, src: asset(source.src) }));
    }
    mediaBlocks.push({ kind, config });
    const fallback = kind === 'gallery' ? `<p>${escapeHtml(config.title || 'Gallery')} · ${config.items.length}</p>` : kind === 'graph' ? `<p>${escapeHtml(config.title || 'Graph')} · ${config.nodes.length} nodes</p>` : ['image','gif'].includes(kind) ? `<img src="${escapeHtml(config.src)}" alt="${escapeHtml(config.alt || '')}" loading="lazy" decoding="async">` : `<a href="${escapeHtml(config.src)}">${escapeHtml(config.title || kind)} (${locale.startsWith('fr') ? 'fichier local' : 'local file'})</a>`;
    return `<figure data-cydoc-module="${kind}" data-cydoc-id="${escapeHtml(config.id)}" data-config="${escapeHtml(JSON.stringify(config))}">${fallback}</figure>`;
  };
  function codeBlock(text, lang = 'text') {
    const aliases = { 'c++': 'cpp', cc: 'cpp', cxx: 'cpp', 'c#': 'csharp', cs: 'csharp', js: 'javascript', ts: 'typescript', py: 'python', sh: 'bash' };
    const language = aliases[lang] || lang;
    languages.add(language); codeText.push(text);
    const number = ++codeIndex;
    let highlighted = Prism.languages[language] ? Prism.highlight(text, Prism.languages[language], language) : escapeHtml(text);
    highlighted = highlighted.replace(/(<span class="token (?:function|class-name)">)([^<]+)(<\/span>)/g, (all, start, name, end) => Object.hasOwn(symbols,name) ? `${start}<a href="${escapeHtml(resolveHref(`doc:${symbols[name]}`))}">${name}</a>${end}` : all);
    const lines = highlightedLines(highlighted).map((line, i) => {
      const id = number === 1 ? `L${i + 1}` : `code-${number}-L${i + 1}`; anchors.push(id);
      return `<span class="code-line" id="${id}" data-line="${i + 1}">${line || ' '}</span>`;
    }).join('');
    return `<div class="code-block"><div class="code-toolbar"><span>${escapeHtml(lang)}</span><button type="button" data-copy-code>${locale.startsWith('fr') ? 'Copier' : 'Copy'}</button></div><pre><code class="language-${escapeHtml(language)}">${lines}</code></pre></div>`;
  }
  marked.use({ extensions: [{ name: 'glossaryTerm', level: 'inline', start: text => text.indexOf('[['), tokenizer(text) {
    const match = /^\[\[([^\]\n]+)\]\]/.exec(text); if (!match) return;
    return { type: 'glossaryTerm', raw: match[0], term: match[1] };
  }, renderer(token) {
    const entry = Object.hasOwn(glossary,token.term) ? glossary[token.term] : undefined;
    if (!entry) return escapeHtml(token.term);
    const definition = typeof entry === 'string' ? entry : entry.definition;
    return `<span class="glossary-term"><button type="button" data-term aria-expanded="false" aria-describedby="term-${pageId}-${++blockIndex}">${escapeHtml(token.term)}</button><span class="glossary-tooltip" role="tooltip" id="term-${pageId}-${blockIndex}" hidden>${escapeHtml(definition)}</span></span>`;
  } }] });
  marked.use({ renderer: {
    html({ text }) { return escapeHtml(text); },
    heading({ tokens, depth, text }) {
      const explicit = text.match(/\s*\{#([a-zA-Z0-9_-]+)\}\s*$/);
      const clean = text.replace(/\s*\{#[a-zA-Z0-9_-]+\}\s*$/, '');
      let id = explicit?.[1] ?? clean.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      id ||= 'section';
      const original = id;
      for (let suffix = 2; usedIds.has(id); suffix++) id = `${original}-${suffix}`;
      usedIds.add(id);
      headings.push({ id, text: clean.replace(/[`*_]/g, ''), level: depth });
      const label = this.parser.parseInline(marked.lexer(clean)[0]?.tokens ?? tokens);
      return `<h${depth} id="${escapeHtml(id)}">${label}<a class="heading-anchor" href="${route(pageId, id)}" aria-label="${locale === 'fr' ? 'Lien vers' : 'Link to'} ${escapeHtml(clean)}">#</a></h${depth}>`;
    },
    link({ href, text, tokens }) {
      const url = resolveHref(href);
      const label = this.parser.parseInline(tokens);
      return url ? `<a href="${escapeHtml(url)}"${/^https?:/.test(url) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>` : label;
    },
    image({ href, text, title }) {
      return media('image', { src: href, alt: text, title });
    },
    code({ text, lang }) {
      if (++nesting > 12) throw new Error('Content blocks are nested too deeply');
      let rich;
      try { rich = richBlock(lang, text, { id: `${pageId}-block-${++blockIndex}`, escape: escapeHtml, locale, link: resolveHref, code: codeBlock, render: value => marked.parse(value) }); } finally { nesting--; }
      if (rich !== undefined) return rich;
      if (['image', 'video', 'mesh', 'gallery', 'graph', 'blueprint', 'gif'].includes(lang) && text.trim().startsWith('{')) return media(lang === 'blueprint' ? 'graph' : lang, JSON.parse(text));
      if (lang === 'blueprint') return media('graph', parseBlueprint(text));
      if (lang === 'video') {
        const [source, ...caption] = text.trim().split('\n');
        return media('video', { src: source.trim(), title: caption.join(' ') });
      }
      if (lang === 'diagram') {
        if (text.trim().startsWith('{')) {
          const diagram = JSON.parse(text);
          for (const node of diagram.nodes || []) if (node.link || node.href) node.href = resolveHref(node.link || node.href);
          return renderDiagram(diagram, `${pageId}-${diagramIndex++}`);
        }
        const nodes = text.trim().split(/\s*->\s*/);
        if (nodes.length > 8 || nodes.some(node => node.length > 48)) throw new Error('Diagram supports up to 8 labels, 48 characters each');
        const width = 220, height = nodes.length * 88 - 20;
        const content = nodes.map((node, i) => `<rect x="10" y="${i * 88 + 4}" width="200" height="56" rx="10"/><text x="110" y="${i * 88 + 37}" text-anchor="middle">${escapeHtml(node)}</text>${i < nodes.length - 1 ? `<path d="M110 ${i * 88 + 63} v22 m-5 -6 5 6 5 -6"/>` : ''}`).join('');
        return `<figure class="diagram"><svg role="img" aria-label="${escapeHtml(nodes.join(' → '))}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${content}</svg></figure>`;
      }
      return codeBlock(text, lang || 'text');
    }
  }});
  const html = marked.parse(body);
  const mediaIds=[...html.matchAll(/data-cydoc-id="([^"]+)"/g)].map(match=>match[1]);
  if(new Set(mediaIds).size!==mediaIds.length)throw new Error(`Duplicate media id in ${pageId}`);
  const plainHtml = html.replace(/<[^>]*>/g, ' ').replace(/&(amp|lt|gt|quot|#39);/g, (_, entity) => ({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"})[entity]);
  const text = (plainHtml + ' ' + codeText.join(' ')).replace(/\s+/g, ' ').trim();
  return { html, text, headings, anchors, languages: [...languages], code: codeText.join('\n'), assets: [...assets], mediaBlocks, links, kind: mediaBlocks.length ? 'media' : 'guide' };
}
