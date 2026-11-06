---
id: languages
title: Langues et traductions
description: Une documentation multilingue dès sa conception, avec des liens cohérents entre les traductions.
section: Créer du contenu
order: 12
---
Les langues font partie du modèle de contenu. Chaque traduction est une page à part entière, reliée aux autres par son identifiant stable.

## Déclarer les langues {#configuration}

L’anglais est la langue d’origine et la traduction française complète est obligatoire. Configurez la langue par défaut et les langues disponibles dans `cydoc.config.json`.

```json
{
  "defaultLocale": "en",
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

## Langues publiées {#fallback}

Une langue est proposée uniquement lorsque toutes les pages publiques sont traduites et non vides, sans révision source explicitement dépassée. Une page anglaise ou française manquante, vide ou explicitement dépassée bloque la génération. Les langues supplémentaires incomplètes restent hors du manuel publié. L’anglais est la langue d’origine et le français est obligatoire. Avec une seule langue disponible, le lecteur n’affiche aucun sélecteur. Un lien vers une langue indisponible ouvre la langue par défaut complète en conservant la page et la section.

## Interface du lecteur {#interface}

Le lecteur fourni traduit ses commandes en français et en anglais. Le format de contenu accepte d’autres codes de langue ; ajouter leur traduction d’interface et la prise en charge RTL reste à implémenter. Le choix de langue est mémorisé sur l’appareil lorsque le stockage local est autorisé.


Traduisez les titres, descriptions, textes, légendes et annotations avant de publier une autre langue. Un contrôle de couverture ne juge pas la qualité d’une traduction : relisez le contenu. Consultez aussi les [versions et redirections](doc:versions).
