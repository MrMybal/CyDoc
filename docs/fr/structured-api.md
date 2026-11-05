---
id: structured-api
title: API structurée
description: Signatures, paramètres, retours, héritages et références importés.
section: Exemples
order: 33
---
Les adaptateurs convertissent des exports structurés pendant la génération. Doxygen et TypeDoc ne sont pas inclus dans le lecteur. Les fichiers de démonstration sont de petits instantanés illustratifs des formats d’échange, accompagnés de leur code source.

- [C++ · HelpSession](doc:doxygen-cydoc-helpsession-session)
- [C++ · open()](doc:doxygen-cydoc-helpsession-open-open)
- [TypeScript · helpLink()](doc:typedoc-helplink-2)

## Configuration {#configuration}

```json
{
  "apiImports": [
    {
      "format": "doxygen",
      "prefix": "doxygen",
      "path": "examples/api/doxygen"
    },
    {
      "format": "typedoc",
      "prefix": "typedoc",
      "path": "examples/api/typedoc.json"
    }
  ]
}
```

## Autres langages {#languages}

Le format neutre `cydoc` accepte des symboles avec `signature`, `parameters`, `returnType`, `returns`, `bases`, `references` et `source`. Un outil Python, C#, Java ou shader peut produire ce JSON. L’extraction annotée des neuf langages reste disponible ; elle n’infère pas les types par compilation. Les adaptateurs Doxygen/TypeDoc couvrent les déclarations et types courants ; les métadonnées propres aux plugins ne sont pas interprétées.
