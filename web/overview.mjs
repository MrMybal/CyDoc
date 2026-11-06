import { icon } from '../dist/icons.js';
import { createLink } from '../dist/index.js';

export function renderOverview(locale) {
  const fr = locale.startsWith('fr');
  const t = (a, b) => fr ? a : b;
  const href = (id, anchor) => createLink({ locale, pageId: id, anchor });
    return `<div class="home-intro"><div class="eyebrow"><span></span>${t('PENSÉE POUR VOS APPLICATIONS', 'BUILT FOR YOUR APPLICATIONS')}</div>
      <h1>${t('Votre documentation.<br>Partout. <span>Tout simplement.</span>', 'Your documentation.<br>Anywhere. <span>Effortlessly.</span>')}</h1>
      <p class="hero-description">${t('Une documentation claire, toujours à portée de main.<br>Locale, multilingue et prête à suivre vos applications.', 'Clear documentation, always within reach.<br>Local, multilingual, and ready to go with your applications.')}</p>
      <div class="hero-actions"><a class="button primary" href="${href('quickstart')}">${t('Commencer', 'Get started')}${icon('arrow')}</a><a class="text-button" href="${href('architecture')}">${t('Découvrir CyDoc', 'Explore CyDoc')}${icon('chevron')}</a></div>
      <div class="hero-meta"><span>${icon('check')}${t('Aucun service distant', 'No remote services')}</span><span>${icon('check')}${t('Licence MIT', 'MIT licensed')}</span><span>${icon('check')}${t('Sans framework', 'Framework independent')}</span></div></div>
      <section class="integration-preview" aria-label="${t('Exemple d’intégration', 'Integration example')}"><div class="preview-copy"><div class="preview-icon">${icon('plug')}</div><h2>${t('La bonne page.<br>Au bon moment.', 'The right page.<br>At the right time.')}</h2><p>${t('Reliez une fonctionnalité à son explication.<br>Un lien suffit pour guider vos utilisateurs.', 'Connect a feature to its explanation.<br>One link is all your users need.')}</p><a href="${href('integration')}">${t('Intégrer à mon application', 'Integrate with my app')}${icon('arrow')}</a></div><div class="mini-editor"><div class="editor-title"><div class="window-dots"><i></i><i></i><i></i></div><span>app.cpp</span><span>C++17</span></div><pre><code><span class="syntax-comment">// ${t('Une aide contextuelle, en un lien.', 'Contextual help, one link away.')}</span>
<span class="syntax-purple">#include</span> <span class="syntax-green">"cydoc/help.hpp"</span>

<span class="syntax-purple">const auto</span> help = <span class="syntax-blue">cydoc::make_help_link</span>(
  <span class="syntax-green">"file:///D:/Documentation/Documentation.html"</span>,
  <span class="syntax-green">"${locale}"</span>, <span class="syntax-green">"quickstart"</span>, <span class="syntax-green">"installation"</span>
);</code></pre><div class="editor-footer"><span class="green-dot"></span>${t('Fonctionne entièrement en local', 'Works entirely offline')}${icon('shield')}</div></div></section>
      <section class="explore"><div class="section-heading"><h2>${t('Un bon point de départ', 'A good place to start')}</h2><span>${t('DE L’IDÉE À L’INTÉGRATION', 'FROM IDEA TO INTEGRATION')}</span></div><div class="card-grid">
      ${[
        ['writing', 'file', t('Écrire votre documentation', 'Write your documentation'), t('Du Markdown lisible, des pages structurées et des liens qui durent.', 'Readable Markdown, structured pages, and links that last.'), t('Créer du contenu', 'Create content')],
        ['media', 'image', t('Montrer, pas seulement expliquer', 'Show as well as tell'), t('Images, vidéos et schémas. Donnez du contexte à chaque explication.', 'Images, videos, and diagrams. Give every explanation context.'), t('Explorer les médias', 'Explore media')],
        ['extraction', 'terminal', t('Du code à la documentation', 'From code to documentation'), t('Gardez vos explications proches du code, puis générez vos pages.', 'Keep explanations close to your code, then generate your pages.'), t('Extraire la documentation', 'Extract documentation')]
      ].map(([id, name, title, description, action]) => `<a class="feature-card" href="${href(id)}"><div class="card-icon">${icon(name)}</div><h3>${title}</h3><p>${description}</p><span>${action}${icon('arrow')}</span></a>`).join('')}</div></section>
      <section class="platform-strip"><div><div class="platform-icon">${icon('monitor')}${icon('phone')}</div><div><strong>${t('Une seule documentation. Tous vos environnements.', 'One documentation. All your environments.')}</strong><p>Windows <b>·</b> Linux <b>·</b> macOS <b>·</b> Android <b>·</b> Web</p></div></div><a href="${href('integration', 'platforms')}">${t('Voir l’intégration', 'View integration')}${icon('arrow')}</a></section>`;
  }
