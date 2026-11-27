---
id: navigation
title: Navigation et recherche
description: Un arbre de documentation et une recherche dans l’en-tête couvrant le texte, le code et les symboles.
section: Créer du contenu
parent: writing
order: 10
sourceRevision: 2
---

## Rechercher depuis l’en-tête {#search}

Saisissez un terme dans le champ de l’en-tête pour rechercher dans la documentation. Les résultats apparaissent pendant la saisie, y compris les correspondances dans le code et les symboles. Les filtres de contenu et de langage permettent d’affiner la recherche. Les flèches sélectionnent un résultat ; Entrée l’ouvre. Ctrl+K ouvre la boîte de recherche. Échap ou un clic à l’extérieur ferme les résultats.

Chaque résultat indique le titre de la page, sa place dans le manuel et un extrait. Les mots trouvés sont mis en évidence. Lorsqu’un résultat nomme une section, son ouverture mène directement à ce passage. Essayez `stockage`, `make_help_link` ou `PBR`. Les accents sont ignorés et les petites fautes de frappe sont tolérées dans les mots longs.

Si rien ne correspond, choisissez **Effacer les filtres** pour élargir la recherche en gardant vos mots. **Effacer la recherche** retire la requête et propose à nouveau les pages de départ. Les filtres actifs restent sélectionnés pendant vos changements de page. Si plus de 30 pages correspondent, précisez votre requête ou utilisez un filtre pour retrouver le résultat utile.

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

Le fil d’Ariane au-dessus de l’article mène à l’accueil du manuel et aux pages parentes du sujet courant. Utilisez-le pour retrouver l’explication générale après avoir ouvert une sous-page depuis la recherche. Il reste disponible sur petit écran.

Quand vous ouvrez une page, ses ancêtres sont révélés dans le menu. La navigation au clavier place le focus sur le nouveau contenu ; un lien de section cible directement cette section. Le **Mode lecture** dans l’en-tête masque la navigation sur ordinateur ; activez-le à nouveau pour retrouver le menu. Le menu mobile rétablit aussi la navigation.

Sur petit écran, ouvrez **Sur cette page** au-dessus de l’article pour atteindre une section, copier le lien de la page ou imprimer. Ces outils restent disponibles quand le sommaire latéral est masqué.

Tab atteint les liens et les commandes de dépliage. Entrée active une page ou ouvre une branche. La flèche droite ouvre une branche puis entre dans ses enfants ; la flèche gauche la ferme ou revient à son parent. Les liens restent des liens locaux ordinaires, copiables et ouvrables dans un autre onglet.


## Choisir l’ordre de lecture {#paths}

L’arbre des pages et l’ordre de lecture répondent à des besoins différents. Un parent regroupe des pages liées ; les liens **Précédent** et **Suivant** peuvent accompagner un exercice choisi. Ce manuel suit un parcours du premier tutoriel vers la rédaction, le contenu enrichi, les médias, les schémas, les graphes et l’intégration.

Indiquez des destinations facultatives dans les métadonnées de votre page, avec les mêmes identifiants dans les deux langues :

```text
previous: quickstart
next: rich-content#steps
```

Vous pouvez cibler une page ou une section explicite. La génération vérifie les deux. Omettez un champ pour garder la page précédente ou suivante dans l’ordre du sommaire. Laissez-le explicitement vide, comme `next:`, pour masquer cette direction à la fin d’un parcours. Conservez les identifiants publics des pages et des sections.

Une explication illustrée reste un **Guide** dans la recherche. Une page contenant seulement des médias est classée comme **Média**. L’auteur peut choisir explicitement `kind: guide`, `kind: media` ou `kind: api` dans les métadonnées.

## Logo de l’application {#branding}

Si l’application possède un logo, copiez-le dans les ressources de documentation et ajoutez `"logo": "assets/app-logo.svg"` à sa configuration. Ce fichier doit exister. Sans logo, omettez cette option pour conserver l’icône de livre par défaut. Un échec de chargement dans le lecteur rétablit aussi cette icône. L’image de marque ne nécessite aucun module de média.

L’accès à **Mon espace** est une icône dans l’en-tête. Le menu gauche est consacré à la navigation. Le pied de page n’affiche pas de licence supposée pour l’application ; sa licence réelle se documente dans son contenu.
