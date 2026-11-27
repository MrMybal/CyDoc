import { icon } from '../dist/icons.js';
import { createLink } from '../dist/index.js';

/** Demo home only: application exports keep their own authored home page. */
export function renderOverview(locale) {
  const fr = locale.startsWith('fr');
  const t = (a, b) => fr ? a : b;
  const href = (id, anchor) => createLink({ locale, pageId: id, anchor });
  const paths = [
    ['quickstart', 'bolt', t('Créer mon premier manuel', 'Create my first manual'), t('Un exercice guidé avec Studio, de la première page à l’aperçu.', 'A guided Studio exercise, from your first page to its preview.'), t('Suivre le tutoriel', 'Follow the tutorial')],
    ['writing', 'file', t('Documenter une tâche', 'Explain a task'), t('Organisez vos explications, vos étapes et vos liens pour guider le lecteur.', 'Organize explanations, steps and links to guide your reader.'), t('Préparer une page', 'Prepare a page')],
    ['troubleshooting', 'help', t('Résoudre un problème', 'Solve a problem'), t('Une page vide, un média absent ou une note introuvable ? Partez du symptôme.', 'A blank page, missing media or a note you cannot find? Start with the symptom.'), t('Ouvrir le dépannage', 'Open troubleshooting')],
    ['architecture', 'layers', t('Comprendre CyDoc', 'Understand CyDoc'), t('Découvrez comment le contenu et les médias deviennent un manuel consultable.', 'See how content and media become a manual people can read.'), t('Voir le fonctionnement', 'See how it works')]
  ];
  return `<div class="reader-home"><div class="home-intro"><div class="eyebrow">${t('LE MANUEL CYDOC', 'THE CYDOC MANUAL')}</div>
    <h1>${t('Bienvenue dans CyDoc', 'Welcome to CyDoc')}</h1>
    <p class="hero-description">${t('Créez des manuels illustrés que vos utilisateurs peuvent consulter avec leur application. Choisissez le parcours qui correspond à votre besoin.', 'Create illustrated manuals your users can read alongside their application. Choose the path that matches your goal.')}</p></div>
    <section class="home-paths" aria-labelledby="start"><div class="section-heading"><h2 id="start">${t('Que souhaitez-vous faire ?', 'What would you like to do?')}</h2></div><div class="card-grid">${paths.map(([id, name, title, description, action]) => `<a class="feature-card" href="${href(id)}"><div class="card-icon">${icon(name)}</div><h3>${title}</h3><p>${description}</p><span>${action}${icon('arrow')}</span></a>`).join('')}</div></section>
    <section class="home-support-links" aria-labelledby="illustrate"><h2 id="illustrate">${t('Des explications en images', 'Illustrated explanations')}</h2><a href="${href('media')}">${t('Images et vidéos', 'Images and videos')}</a><a href="${href('diagrams')}">${t('Schémas et flux', 'Diagrams and flows')}</a><a href="${href('integration')}">${t('Aide depuis votre application', 'Help from your application')}</a><a href="${href('personal-space')}">${t('Favoris et notes', 'Bookmarks and notes')}</a></section>
    <section class="home-authoring" aria-labelledby="authoring"><h2 id="authoring">${t('Choisir comment écrire', 'Choose how to write')}</h2><p>${t('Utilisez', 'Use')} <a href="${href('studio','start')}">CyDoc Studio</a> ${t('pour écrire en mode visuel ou Markdown. Vous pouvez aussi maintenir les fichiers Markdown dans votre projet. Les manuels publiés fonctionnent indépendamment de l’éditeur.', 'to write visually or in Markdown. You can also maintain Markdown files in your project. Published manuals keep working independently of the editor.')}</p></section></div>`;
}
