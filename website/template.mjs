import { copy, media } from './content.mjs';
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const t = key => { if (!(key in copy.en)) throw new Error(`Missing English copy: ${key}`); return escape(copy.en[key]); };
const text = (tag, key, attributes = '') => `<${tag} data-i18n="${key}" ${attributes}>${t(key)}</${tag}>`;
const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
const outward = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>';
const github = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 19c-4.3 1.3-4.3-2.2-6-2.7m12 5v-3.4a2.9 2.9 0 0 0-.8-2.3c2.7-.3 5.6-1.3 5.6-6A4.7 4.7 0 0 0 18.5 6a4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.7 11.7 0 0 0-6 0C6.6 2.5 5.6 2.8 5.6 2.8A4.3 4.3 0 0 0 5.5 6a4.7 4.7 0 0 0-1.3 3.6c0 4.7 2.9 5.7 5.6 6a2.9 2.9 0 0 0-.8 2.3v3.4"/></svg>';
const repository = 'https://github.com/MrMybal/CyDoc';
export const release = `${repository}/releases/tag/studio-v0.1.2`;
const archive = `${repository}/releases/download/studio-v0.1.2/CyDocStudio-0.1.2-windows-x64.zip`;
const manual = (id, key, className = 'text-link') => `<a class="${className}" data-doc="${id}" href="./manual/Documentation.html#/en/${id.replace('#', '/')}"><span data-i18n="${key}">${t(key)}</span>${arrow}</a>`;
const shot = (name, alt, caption, { priority = false, localized = false } = {}) => `<figure class="screen"><button class="shot" type="button" data-shot data-caption="${caption}" aria-label="${t('lightbox.open')}: ${t(caption)}"><img src="./assets/screenshots/${name}.webp" ${localized ? 'data-localized-shot' : ''} data-i18n-alt="${alt}" alt="${t(alt)}" width="${name.startsWith('reader-') ? 1425 : 1440}" height="${name.startsWith('reader-') ? 891 : 900}" ${priority ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></button><figcaption><span data-i18n="${caption}">${t(caption)}</span>${outward}</figcaption></figure>`;

export function renderPage() {
  const chapters = ['editor', 'reader', 'media', 'graphs', 'api', 'appearance', 'workflow', 'download'];
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="theme-color" content="#101315">
<title>${t('meta.title')}</title><meta name="description" content="${t('meta.description')}">
<meta property="og:type" content="website"><meta property="og:title" content="${t('meta.title')}"><meta property="og:description" content="${t('meta.description')}">
<meta property="og:image" content="./assets/screenshots/studio-visual.webp"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="./assets/favicon.svg">
<link rel="stylesheet" href="__STYLESHEET__"><script src="__SCRIPT__" defer></script>
</head><body>
<a class="skip" href="#main" data-i18n="skip">${t('skip')}</a>
<header class="site-header"><div class="header-inner wrap">
  <a class="brand" href="#" aria-label="CyDoc"><img src="./assets/favicon.svg" width="34" height="34" alt=""><span>CyDoc</span></a>
  <nav class="primary-nav" id="primary-nav" aria-label="Navigation">
    <a href="#editor" data-i18n="nav.features">${t('nav.features')}</a>
    <a href="./manual/Documentation.html#/en/overview" data-doc="overview" data-i18n="nav.docs">${t('nav.docs')}</a>
    <a class="mobile-download" href="#download" data-i18n="nav.download">${t('nav.download')}</a>
  </nav>
  <div class="header-actions"><div class="language" role="group" data-i18n-label="nav.language" aria-label="Language"><button type="button" data-lang="en" lang="en" aria-pressed="true">EN</button><button type="button" data-lang="fr" lang="fr" aria-pressed="false">FR</button></div>
  <a class="github-link button" href="${repository}">${github}<span>GitHub</span>${outward}</a>
  <a class="header-download button" href="#download"><span data-i18n="nav.download">${t('nav.download')}</span>${arrow}</a>
  <button class="menu-button" type="button" aria-controls="primary-nav" aria-expanded="false" data-i18n-label="nav.menu" aria-label="${t('nav.menu')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button></div>
</div></header>
<main id="main">
<section class="hero wrap" aria-labelledby="hero-title"><div class="hero-copy">
  ${text('p', 'hero.status', 'class="status"')}${text('h1', 'hero.title', 'id="hero-title"')}
  ${text('h2', 'hero.lead', 'class="hero-lead"')}${text('p', 'hero.body', 'class="lead"')}
  <div class="hero-buttons"><a class="button primary" href="${archive}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4"/></svg><span data-i18n="hero.download">${t('hero.download')}</span></a>${manual('overview', 'hero.reader', 'button secondary')}</div>
  ${text('p', 'hero.note', 'class="fineprint"')}
</div><div class="hero-screen">${shot('studio-visual', 'hero.alt', 'hero.caption', { priority: true, localized: true })}</div></section>
<div class="process-strip wrap"><span class="process-word">CyDoc <span>↗</span></span>${text('span', 'strip.write')}<i aria-hidden="true">→</i>${text('span', 'strip.ship')}<i aria-hidden="true">→</i>${text('span', 'strip.read')}</div>
<nav class="chapters" data-i18n-label="chapter.label" aria-label="${t('chapter.label')}"><div class="wrap">${chapters.map(id => `<a href="#${id}" data-chapter="${id}" data-i18n="chapter.${id}">${t(`chapter.${id}`)}</a>`).join('')}</div></nav>

<section class="intro section wrap" aria-labelledby="intro-title"><div class="section-head">${text('p', 'intro.kicker', 'class="eyebrow"')}${text('h2', 'intro.title', 'id="intro-title"')}${text('p', 'intro.body', 'class="intro-body"')}</div>
  <div class="trio">${['editor', 'reader', 'library'].map((id, i) => `<article><span class="index">0${i + 1}</span>${text('h3', `intro.${id}.title`)}${text('p', `intro.${id}.body`)}</article>`).join('')}</div>
</section>

<section id="editor" class="section wrap" aria-labelledby="editor-title"><div class="feature-row">
  <div class="feature-copy">${text('p', 'editor.kicker', 'class="eyebrow"')}${text('h2', 'editor.title', 'id="editor-title"')}${text('p', 'editor.body')}<ul class="feature-list">${[1, 2, 3].map(i => text('li', `editor.item${i}`)).join('')}</ul>${manual('studio#write', 'editor.link')}</div>
  ${shot('studio-markdown', 'editor.alt', 'editor.caption')}
</div><div class="two-up">${['media', 'languages'].map((id, i) => `<article>${text('h3', `author.${id}.title`)}${text('p', `author.${id}.body`)}${shot(i ? 'studio-visual-fr' : 'studio-media', `author.${id}.alt`, `author.${id}.caption`)}</article>`).join('')}</div></section>

<section id="reader" class="section section-tint" aria-labelledby="reader-title"><div class="wrap"><div class="feature-row reverse">
  <div class="feature-copy">${text('p', 'reader.kicker', 'class="eyebrow"')}${text('h2', 'reader.title', 'id="reader-title"')}${text('p', 'reader.body')}<ul class="feature-list">${[1, 2, 3].map(i => text('li', `reader.item${i}`)).join('')}</ul>${manual('quickstart', 'reader.link')}</div>
  ${shot('reader-guide', 'reader.alt', 'reader.caption')}
</div><div class="search-feature"><div>${text('h3', 'search.title')}${text('p', 'search.body')}</div>${shot('reader-search', 'search.alt', 'search.caption')}</div></div></section>

<section id="media" class="section wrap" aria-labelledby="media-title"><div class="section-head">${text('p', 'media.kicker', 'class="eyebrow"')}${text('h2', 'media.title', 'id="media-title"')}${text('p', 'media.body')}</div>
  <div class="media-explorer"><div class="media-tabs" role="tablist" data-i18n-label="media.tabs" aria-label="${t('media.tabs')}">${media.map((item, i) => `<button type="button" id="media-tab-${item.id}" role="tab" aria-selected="${i === 0}" aria-controls="media-panel" tabindex="${i ? -1 : 0}" data-media="${item.id}" data-i18n="media.${item.id}">${t(`media.${item.id}`)}</button>`).join('')}</div>
  <div id="media-panel" role="tabpanel" aria-labelledby="media-tab-image" tabindex="0"><div class="media-description"><div>${text('h3', 'media.image.title', 'id="media-title-current"')}${text('p', 'media.image.body', 'id="media-body-current"')}</div>${manual('media#images', 'media.example')}</div>
  <div class="mesh-modes" hidden><button type="button" data-mesh-mode="pbr" aria-pressed="true" data-i18n="media.pbr">${t('media.pbr')}</button><button type="button" data-mesh-mode="wire" aria-pressed="false" data-i18n="media.wire">${t('media.wire')}</button></div>
  ${shot('reader-image', 'media.image.body', 'media.image.title')}
  </div></div>${text('p', 'media.limit', 'class="fineprint media-note"')}
  <div class="module-choice"><div>${text('h3', 'modules.title')}${text('p', 'modules.body')}<code>image · video · gif · mesh · gallery · graph</code></div>${shot('studio-modules', 'modules.alt', 'modules.caption')}</div>
</section>

<section id="graphs" class="section section-tint" aria-labelledby="graphs-title"><div class="wrap"><div class="section-head">${text('p', 'graphs.kicker', 'class="eyebrow"')}${text('h2', 'graphs.title', 'id="graphs-title"')}${text('p', 'graphs.body')}</div>
  <div class="graph-pair">${shot('reader-diagrams', 'graphs.diagram.alt', 'graphs.diagram.caption')}${shot('reader-graph', 'graphs.graph.alt', 'graphs.graph.caption')}</div><div class="section-tail">${text('p', 'graphs.blueprint')}${manual('blueprints', 'graphs.link')}</div>
</div></section>

<section id="api" class="section wrap" aria-labelledby="api-title"><div class="feature-row">
  <div class="feature-copy">${text('p', 'api.kicker', 'class="eyebrow"')}${text('h2', 'api.title', 'id="api-title"')}${text('p', 'api.body')}${text('p', 'api.extract')}${manual('api-tour', 'api.link')}</div>
  ${shot('reader-api', 'api.alt', 'api.caption')}
</div><div class="code-pair"><div class="code-caption">${text('h3', 'api.code')}${text('p', 'api.languages')}<div class="language-tags" aria-label="Code">${['C++', 'Python', 'HLSL', 'GLSL', 'C#', 'C', 'JavaScript', 'Java', 'TypeScript'].map(lang => `<span>${lang}</span>`).join('')}</div></div>
<pre><code><span class="code-comment" data-i18n="api.comment">${t('api.comment')}</span>
<span class="code-keyword">import</span> { createLink } <span class="code-keyword">from</span> <span class="code-string">'cydoc'</span>;

<span class="code-keyword">const</span> url = createLink({
  locale: <span class="code-string">'en'</span>,
  pageId: <span class="code-string">'quickstart'</span>,
  anchor: <span class="code-string">'installation'</span>
}, <span class="code-string">'./Documentation/Documentation.html'</span>);</code></pre></div></section>

<section id="appearance" class="section section-tint" aria-labelledby="theme-title"><div class="wrap"><div class="section-head">${text('p', 'theme.kicker', 'class="eyebrow"')}${text('h2', 'theme.title', 'id="theme-title"')}${text('p', 'theme.body')}</div>
  <div class="theme-comparison" style="--split:50%"><div class="compare-images"><img src="./assets/screenshots/reader-theme-paper.webp" loading="lazy" width="1425" height="891" data-i18n-alt="theme.alt" alt="${t('theme.alt')}"><img class="compare-before" src="./assets/screenshots/reader-theme-dark.webp" loading="lazy" width="1425" height="891" alt=""><span class="compare-divider" aria-hidden="true"><span>↔</span></span></div>
  <div class="compare-controls"><button type="button" class="text-link" data-zoom-src="./assets/screenshots/reader-theme-dark.webp" data-caption="theme.dark"><span data-i18n="theme.dark">${t('theme.dark')}</span>${outward}</button><input id="theme-range" type="range" min="0" max="100" value="50" data-i18n-label="theme.range" aria-label="${t('theme.range')}"><button type="button" class="text-link" data-zoom-src="./assets/screenshots/reader-theme-paper.webp" data-caption="theme.paper"><span data-i18n="theme.paper">${t('theme.paper')}</span>${outward}</button></div></div>${text('p', 'theme.help', 'class="fineprint"')}
</div></section>

<section id="workflow" class="section wrap" aria-labelledby="workflow-title"><div class="section-head">${text('p', 'workflow.kicker', 'class="eyebrow"')}${text('h2', 'workflow.title', 'id="workflow-title"')}</div>
  <div class="workflow-top"><article><span class="index">01 /</span>${text('h3', 'workflow.local.title')}${text('p', 'workflow.local.body')}</article><article><span class="index">02 /</span>${text('h3', 'workflow.team.title')}${text('p', 'workflow.team.body')}</article></div>
  <div class="feature-row git-feature"><div class="feature-copy">${text('h3', 'desktop.title')}${text('p', 'desktop.body')}</div>${shot('studio-desktop', 'desktop.alt', 'desktop.caption')}</div>
  <div class="feature-row reverse git-feature"><div class="feature-copy">${text('h3', 'workflow.git.title')}${text('p', 'workflow.git.body')}${text('h3', 'workflow.automation.title')}${text('p', 'workflow.automation.body')}${manual('studio#appearance', 'workflow.automation.link')}</div>${shot('studio-git', 'workflow.git.alt', 'workflow.git.caption')}</div>
</section>

<section class="faq section section-tint" aria-labelledby="faq-title"><div class="wrap faq-grid">${text('h2', 'faq.title', 'id="faq-title"')}<div>${[1,2,3,4,5].map(i => `<details><summary><span data-i18n="faq.q${i}">${t(`faq.q${i}`)}</span><span class="plus" aria-hidden="true">+</span></summary>${text('p', `faq.a${i}`)}</details>`).join('')}</div></div></section>

<section id="download" class="download section wrap" aria-labelledby="download-title">${text('p', 'download.kicker', 'class="eyebrow"')}${text('h2', 'download.title', 'id="download-title"')}${text('p', 'download.body')}
  <div class="download-actions"><a class="button primary" href="${archive}"><span data-i18n="download.windows">${t('download.windows')}</span>${arrow}</a><a class="button secondary" href="${repository}">${github}<span data-i18n="download.source">${t('download.source')}</span></a></div>
  ${text('p', 'download.note', 'class="fineprint"')}<a class="checksum" href="${repository}/releases/download/studio-v0.1.2/SHA256SUMS.txt" data-i18n="download.checksum">${t('download.checksum')}</a>
  <div class="web-note">${text('p', 'download.web')}${manual('studio#collaborate', 'download.web.link')}</div>
</section>
</main>
<footer class="site-footer wrap"><div><a class="brand" href="#"><img src="./assets/favicon.svg" alt="" width="28" height="28"><span>CyDoc</span></a>${text('p', 'footer.line')}</div><nav aria-label="CyDoc">${manual('overview', 'nav.docs')}<a href="${release}" data-i18n="footer.releases">${t('footer.releases')}</a><a href="${repository}" data-i18n="footer.source">${t('footer.source')}</a><a href="${repository}/blob/main/LICENSE" data-i18n="footer.license">${t('footer.license')}</a></nav><span class="copyright">© 2026 CyDoc</span></footer>
<dialog class="lightbox" id="lightbox" aria-labelledby="lightbox-caption"><div class="lightbox-shell"><div class="lightbox-toolbar"><p id="lightbox-caption"></p><button type="button" class="icon-button" data-lightbox-close data-i18n-label="lightbox.close" aria-label="${t('lightbox.close')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button></div><div class="lightbox-picture"><img id="lightbox-image" alt=""></div><div class="lightbox-bottom"><button type="button" class="icon-button" data-lightbox-prev data-i18n-label="lightbox.previous" aria-label="${t('lightbox.previous')}">←</button><span id="lightbox-count"></span>${text('span', 'lightbox.help')}<button type="button" class="icon-button" data-lightbox-next data-i18n-label="lightbox.next" aria-label="${t('lightbox.next')}">→</button></div></div></dialog>
</body></html>`;
}
