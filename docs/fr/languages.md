---
id: languages
title: Langues et traductions
description: Une documentation multilingue dès sa conception, avec des liens cohérents entre les traductions.
section: Créer du contenu
order: 12
---
Les langues font partie du modèle de contenu. Chaque traduction est une page à part entière, reliée aux autres par son identifiant stable.

## Déclarer les langues {#configuration}

Configurez la langue par défaut et les langues disponibles dans `cydoc.config.json`.

```json
{
  "defaultLocale": "fr",
  "locales": [
    { "code": "fr", "label": "Français" },
    { "code": "en", "label": "English" }
  ]
}
```

## Relier les traductions {#translations}

Créez un dossier par langue et conservez le même `id` dans les métadonnées. Les noms de fichiers et les titres peuvent varier. Gardez aussi les mêmes ancres explicites pour préserver la section lors d’un changement de langue.

```text
docs/fr/demarrage.md  → id: quickstart
docs/en/quickstart.md → id: quickstart
```

## Traduction manquante {#fallback}

Si une traduction manque, le noyau cherche la page dans la langue par défaut. Le lecteur signale ce repli. Si la page manque aussi dans cette langue, il affiche un écran de page introuvable.

## Interface du lecteur {#interface}

Le lecteur fourni traduit ses commandes en français et en anglais. Le format de contenu accepte d’autres codes de langue ; ajouter leur traduction d’interface et la prise en charge RTL reste à implémenter. Le choix de langue est mémorisé sur l’appareil lorsque le stockage local est autorisé.


[Le rapport de traductions](doc:translation-report) signale les pages manquantes et compare `sourceRevision` à la `revision` de l’original. Consultez aussi les [versions et redirections](doc:versions).
