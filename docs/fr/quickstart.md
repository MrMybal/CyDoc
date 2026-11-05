---
id: quickstart
title: Démarrage rapide
description: Créez votre première documentation et ouvrez-la directement depuis votre application.
section: Premiers pas
order: 1
---
CyDoc transforme vos fichiers Markdown et vos commentaires documentés en un lecteur statique autonome. Tout le contenu est livré avec votre application.

## Installation {#installation}

Dans ce dépôt, installez les outils puis générez la documentation :

```sh
npm install
npm run build
```

Ouvrez ensuite **dist/site/index.html** directement dans votre navigateur, avec une adresse `file:///…`. `npm run dev` peut surveiller les sources et reconstruire les fichiers pendant l’édition ; cette commande ne démarre aucun serveur web. Node.js 22 ou supérieur est nécessaire à la génération ; le lecteur exporté ne dépend pas de Node.js.

> Le paquet est actuellement en développement dans ce dépôt. Il n’est pas encore publié sur un registre npm.

## Votre première page {#first-page}

Créez un fichier dans `docs/fr/`. Chaque page possède un identifiant stable, indépendant de son nom de fichier et de son titre.

```markdown
---
id: settings
title: Paramètres
description: Configurez votre application.
section: Premiers pas
order: 5
---
## Configurer votre espace {#workspace}

Vos explications commencent ici.
```

Ajoutez sa traduction dans `docs/en/` avec le même `id`. Pour en savoir plus, consultez [les langues et traductions](doc:languages).

## Générer et embarquer {#build}

La commande de génération produit un dossier autonome contenant le lecteur, les pages compilées, le manifeste et les médias locaux. Copiez **tout le dossier**, puis ouvrez `index.html` dans un navigateur ou une WebView.

```text
dist/site/
  index.html
  viewer.css
  viewer.js
  data.js
  manifest.json
  assets/
```

## Ouvrir l’aide contextuelle {#contextual-help}

Un simple lien ouvre la bonne page et la bonne section. Il fonctionne aussi depuis un bouton d’aide de votre application.

```text
help/index.html#/fr/quickstart/installation
```

Le format est le même sur toutes les plateformes. Découvrez les [exemples d’intégration](doc:integration).
