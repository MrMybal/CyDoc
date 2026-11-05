---
id: writing
title: Écrire des pages
description: Concentrez-vous sur vos explications. CyDoc s’occupe de leur présentation.
section: Créer du contenu
order: 10
---
Écrivez des fichiers Markdown dans le dossier de chaque langue. Les titres, listes, tableaux, citations, liens et blocs de code sont pris en charge.

## Structurer une page {#structure}

Le titre principal vient des métadonnées `title`. Commencez le contenu avec des titres de niveau deux. Ils alimentent automatiquement le sommaire à droite.

```markdown
## Installation {#installation}

1. Ouvrez les paramètres.
2. Choisissez votre espace.
3. Enregistrez vos préférences.

> Vos préférences sont conservées sur cet appareil.
```

Le format de métadonnées est volontairement limité à des champs texte sur une ligne, délimités par `---`. Il ne s’agit pas d’un parseur YAML complet.

## Créer des liens {#links}

Utilisez le préfixe `doc:` pour les liens internes. CyDoc applique la langue de la page et vérifie que la destination existe lors de la génération.

```markdown
[Démarrage](doc:quickstart)
[Installation](doc:quickstart#installation)
```

Les identifiants de section explicites comme `{#installation}` permettent de conserver la même destination dans toutes les langues.

Pour viser une autre documentation, utilisez `doc://identifiant/page#section` et déclarez sa destination dans `linkedDocs` de la configuration :

```json
{"linkedDocs":{"editor":{"base":"../editor/help/index.html","manifest":"../editor/help/manifest.json"}}}
```

```markdown
[Exporter dans l’éditeur](doc://editor/settings#export)
```

Le manifeste est optionnel. Lorsqu’il est fourni, la génération vérifie aussi la page et la section dans l’autre documentation. Sinon, seul le catalogue de destinations est vérifié. L’application doit livrer cette documentation au chemin déclaré.

## Ajouter du code {#code}

Les blocs clôturés affichent un langage et un bouton de copie. Leur contenu reste du texte échappé, jamais du code exécuté.

```typescript
const documentation = createDocumentation(manifest);
const page = documentation.resolve('quickstart', 'fr');
```

## Contenu sûr {#safety}

Le HTML brut est affiché comme du texte. Les URL de script et les médias distants sont refusés par le compilateur. Pour une vidéo ou un schéma, utilisez les [blocs dédiés](doc:media).
