---
id: changelog
title: Notes de version
description: Les fonctionnalités livrées et les prochaines étapes de CyDoc.
section: API
order: 101
---
## CyDoc Studio 0.1.2 {#studio-012}

L’[éditeur Studio](doc:studio#start), facultatif, ajoute :

- Édition visuelle et Markdown, arborescence des pages, propriétés, enregistrement automatique et historique des révisions de travail.
- Projets locaux sans compte, avec un exemple CyDoc indépendant et modifiable en anglais et en français.
- Import de médias locaux, choix des modules, aperçu avec le lecteur réel et publication bilingue.
- Comptes hébergés, invitations et rôles par projet, ainsi qu’édition simultanée et présence avec Yjs.
- Git facultatif avec commits de documentation, différences, branches, historique et dépôts distants HTTPS pris en charge.
- Application portable Windows x64 construite avec CyUI et CEF, environnements d’exécution inclus et onglets Éditeur, Documentation, Options et MCP / SDK local occupant la fenêtre.
- Les six thèmes de la bibliothèque partagés entre l’éditeur, l’interface native et le manuel intégré.
- SDK JavaScript/Python et 22 opérations MCP locales via CyToolsCore.

Studio possède ses propres dépendances. La bibliothèque de lecture reste en version 0.1.0 et les manuels exportés s’ouvrent toujours directement avec `file://`.

## Bibliothèque de lecture 0.1.0 {#v010}

Première base fonctionnelle de la bibliothèque :

- Noyau JavaScript sans dépendance à l’exécution.
- Export statique local et lecteur sans framework.
- Originaux anglais obligatoires et traductions françaises complètes et à jour ; seules les langues complètes sont proposées.
- Liens stables vers les pages et les sections.
- Recherche locale indépendante des accents.
- Images, blocs vidéo et schémas SVG : flux, décisions, séquences, classes, dépendances et architectures.
- Modules médias sélectionnables, chargés à la demande : zoom et comparaison d’images, vidéos annotées et synchronisées, meshes PBR annotés et comparables.
- Poignées de comparaison directement dans les médias et boutons d’agrandissement dans la fenêtre à icônes.
- Exemples de lecteurs seuls et galeries d’images, vidéos, meshes et médias mixtes.
- Graphe interactif à ports typés et import d’un sous-ensemble du texte Blueprint Unreal.
- Catalogue de liens entre plusieurs documentations locales.
- Exemples dans neuf langages, dont C++, Python et shaders HLSL/GLSL ; coloration pendant la génération.
- Extraction de commentaires et docstrings Python annotés, références de fichiers limitées à l’API, includes, modules et dépendances locales.
- Contrôle des liens internes, y compris ceux des schémas et graphes.
- Six thèmes, navigation mobile, sommaire, copie et impression.
- Liens vers lignes, annotations, instants vidéo, images GIF, nœuds et vues 3D.
- Onglets de code, étapes, encadrés, sections repliables, glossaire et différences de code.
- Recherche dans le code avec filtres et tolérance aux fautes.
- GIF contrôlables, flèches et zones sur images, pas vidéo et vues 3D mémorisables.
- Favoris, historique, reprise de lecture et notes privées exportables.
- Imports Doxygen XML, TypeDoc JSON et format d’API neutre.
- Catalogue de versions locales, redirections et contrôle des traductions complètes lors de la publication.
- Exemples natifs F1 pour Windows, Linux, macOS et Android.

## Prochaines étapes {#next}

La validation sur les appareils natifs, les adaptateurs d’API supplémentaires, la recherche segmentée pour les très gros corpus et les traductions RTL restent à développer. Les noms et les tailles de paquet pourront évoluer avant la première publication.
