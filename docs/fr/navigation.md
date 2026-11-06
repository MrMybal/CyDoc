---
id: navigation
title: Navigation et recherche
description: Un arbre de documentation et une recherche dans l’en-tête couvrant le texte, le code et les symboles.
section: Créer du contenu
parent: writing
order: 10
---

## Rechercher depuis l’en-tête {#search}

Saisissez un terme dans le champ de l’en-tête pour rechercher dans la documentation. Les résultats apparaissent pendant la saisie, y compris les correspondances dans le code et les symboles. Les filtres de contenu et de langage permettent d’affiner la recherche. Les flèches sélectionnent un résultat ; Entrée l’ouvre. Ctrl+K ouvre la boîte de recherche. Échap ou un clic à l’extérieur ferme les résultats.

Essayez `configuration`, `make_help_link` ou `PBR`. Les accents sont ignorés et les petites fautes de frappe sont tolérées dans les mots longs. Un résultat de code source peut ouvrir directement la ligne correspondante.

## Pages et sous-pages {#tree}

Le menu est un arbre repliable. Le chevron ouvre ou ferme une branche. Le titre d’une page parente reste un lien vers son propre contenu. Les branches ouvertes et le défilement du menu sont conservés quand vous changez de page.

Survolez une entrée pour voir rapidement son nom complet et sa description, même si le menu coupe le libellé. Le focus au clavier affiche immédiatement l’infobulle. Les dossiers affichent leur chemin complet ; les onglets de code et de galerie affichent aussi leur libellé intégral. Échap ferme l’infobulle. Son texte reste visible lorsque vous déplacez le pointeur dessus.

Pour placer une page sous une autre, utilisez son identifiant stable :

```text
---
id: workspace-export
title: Exporter un espace de travail
description: Exporter l’espace de travail courant.
section: Guides
parent: workspace
order: 20
---
```

Cet exemple nécessite une page `workspace` existante. Ses traductions conservent la même valeur `parent`. Un parent peut avoir plusieurs niveaux de sous-pages. La génération rejette les parents absents, les références à soi-même et les cycles. La page enfant s’ouvre toujours à `#/fr/workspace-export` ; le parent n’est pas ajouté à son adresse.

## Hiérarchie de dossiers {#folders}

Une page racine peut utiliser `section: Guides / Espace de travail` pour créer des dossiers et sous-dossiers. Les pages enfants suivent leur parent même si leur propre section diffère. Le nom du fichier Markdown ne détermine ni l’adresse ni l’arbre. Les pages de code source sont regroupées par répertoire.

Les exemples de médias montrent cette organisation : développez **Médias et lecteurs** pour retrouver les images, vidéos, meshes, GIF et galeries.

## Navigation au clavier {#keyboard}

Tab atteint les liens et les commandes de dépliage. Entrée active une page ou ouvre une branche. La flèche droite ouvre une branche puis entre dans ses enfants ; la flèche gauche la ferme ou revient à son parent. Les liens restent des liens locaux ordinaires, copiables et ouvrables dans un autre onglet.


## Logo de l’application {#branding}

Si l’application possède un logo, copiez-le dans les ressources de documentation et ajoutez `"logo": "assets/app-logo.svg"` à sa configuration. Ce fichier doit exister. Sans logo, omettez cette option pour conserver l’icône de livre par défaut. Un échec de chargement dans le lecteur rétablit aussi cette icône. L’image de marque ne nécessite aucun module de média.

L’accès à **Mon espace** est une icône dans l’en-tête. Le menu gauche est consacré à la navigation. Le pied de page n’affiche pas de licence supposée pour l’application ; sa licence réelle se documente dans son contenu.
