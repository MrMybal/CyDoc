---
id: quickstart
title: Créer votre premier manuel
description: Rédigez une première page, vérifiez les deux langues et ouvrez votre manuel exporté.
section: Premiers pas
order: 1
previous: overview
next: writing
sourceRevision: 3
---
Ce tutoriel utilise CyDoc Studio pour créer un petit manuel. Vous allez rédiger une page, la relire dans le lecteur et préparer un dossier à distribuer avec votre application.

```callout
{"type":"note","title":"Avant de commencer","body":"Préparez **CyDoc Studio** et choisissez un dossier pour votre projet. Le travail local ne demande aucun compte. L’alternative depuis les sources ci-dessous nécessite Node.js 22 ou supérieur."}
```

## Préparer votre espace de travail {#installation}

Ouvrez Studio et choisissez **Nouveau projet**. Nommez votre manuel et créez un projet local. Vous pouvez aussi choisir **Ouvrir l’exemple CyDoc** pour vous exercer sur une copie indépendante du manuel d’exemple. Consultez le [démarrage de Studio](doc:studio#start) pour l’installer.

**Résultat attendu :** le projet s’ouvre avec son arbre de pages et son éditeur.

```details
{"title":"Alternative : travailler depuis les sources","body":"Dans ce dépôt CyDoc, installez les dépendances et générez le manuel d’exemple :\n\n```sh\nnpm ci\nnpm run build\n```\n\nOuvrez **dist/site/Documentation.html** directement avec une adresse `file:///…`. `npm run dev` surveille et reconstruit les sources sans démarrer de serveur. Pour le manuel propre à une autre application, suivez le [guide d’intégration](doc:integration)."}
```

## Votre première page {#first-page}

```steps
{"items":[{"title":"Ajouter une page","body":"Créez une page avec un titre clair comme **Paramètres**. Son identifiant stable la désigne indépendamment de son nom de fichier et de son titre traduit.","result":"La nouvelle page apparaît dans l’arbre et s’ouvre dans l’éditeur.","troubleshooting":"Si vous ne la trouvez pas, effacez le filtre des pages et développez son parent dans l’arbre."},{"title":"Expliquer une tâche","body":"Rédigez l’original anglais. Décrivez une action que l’utilisateur peut réaliser et le résultat qu’il doit voir. Utilisez **Visuel** ou **Markdown** dans Studio.","result":"La page indique au lecteur quoi faire et comment reconnaître la réussite.","troubleshooting":"Si votre explication traite plusieurs tâches indépendantes, séparez-les en plusieurs pages reliées par des liens."},{"title":"Compléter l’édition française","body":"Traduisez le titre, la description et le texte. Gardez les mêmes identifiants de page et ancres explicites. Vérifiez la traduction dans les propriétés de la page.","result":"Le même sujet dispose d’éditions anglaise et française complètes.","troubleshooting":"Si la publication signale une traduction manquante ou périmée, passez en français et vérifiez le contenu et l’état de traduction. Consultez [les langues et traductions](doc:languages)."}]}
```

**Résultat attendu :** la page apparaît dans l’arbre et contient une explication complète dans les deux langues.

Si vous éditez directement les fichiers de ce dépôt, placez l’original anglais dans `docs/en/` et sa traduction française dans `docs/fr/`. Voici une page française complète :

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

Gardez le même `id: settings` et la même ancre `workspace` dans la page anglaise. Consultez [les langues et traductions](doc:languages) et [la rédaction d’une page](doc:writing).

## Générer et embarquer {#build}

Dans Studio, utilisez **Aperçu** pour relire votre page. Vérifiez le titre, les instructions et la langue. Une fois les deux éditions complètes et la traduction française vérifiée, utilisez **Publier**.

**Résultat attendu :** `Documentation/Documentation.html` ouvre votre manuel. Sa lecture ne demande ni service Studio ni Node.js.

Conservez **tout le dossier exporté** :

```text
App/Documentation/
  Documentation.html
  DocAI.md
  DocData/
    viewer.css
    viewer.js
    data.js
    manifest.json
    translation-report.json
    assets/
    media-*.js
```

## Ouvrir l’aide contextuelle {#contextual-help}

Un simple lien ouvre la bonne page et la bonne section. Il fonctionne aussi depuis un bouton d’aide de votre application.

```text
Documentation/Documentation.html#/fr/quickstart/installation
```

**Résultat attendu :** le lien ouvre la section de préparation de ce tutoriel. Pour le relier au bouton d’aide d’une application, consultez les [exemples d’intégration](doc:integration).

Si une page ou un média n’apparaît pas, utilisez le [guide de dépannage](doc:troubleshooting). Pour illustrer votre prochaine page, explorez [les images et vidéos](doc:media).
