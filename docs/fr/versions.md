---
id: versions
title: Versions et traductions
description: Versions locales, redirections et suivi des révisions traduites.
section: Exemples
order: 34
---
Le sélecteur de version conserve la page, la section et l’état du média. Les deux éditions **Démo v1** et **Démo v2** sont de petits manuels distincts pour tester le changement de version ; ce ne sont pas des anciennes versions publiées de CyDoc. Les pages absentes y redirigent vers leur accueil.

## Redirections {#redirects}

```json
{
  "aliases": {
    "old-media": "media",
    "old-settings": "quickstart#installation"
  },
  "versions": [
    {
      "id": "1.0",
      "label": "1.0",
      "base": "../v1/index.html"
    },
    {
      "id": "2.0",
      "label": "2.0",
      "base": "../v2/index.html"
    }
  ]
}
```
[Essayez une ancienne adresse](doc:old-media). Les cycles et les destinations manquantes font échouer la génération.

## Traductions {#translations}

[Consulter le rapport de traduction](doc:translation-report). `translation-report.json` contient les pages manquantes, les révisions dépassées et les traductions sans suivi. La démo v2 contient volontairement un exemple dépassé et un exemple manquant.
