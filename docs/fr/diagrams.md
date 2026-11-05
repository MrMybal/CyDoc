---
id: diagrams
title: Galerie de schémas
description: Flux, décisions, séquences, classes, dépendances et architecture.
section: Exemples
order: 18
---
Ces schémas sont compilés en SVG accessible. Aucun moteur de schémas n’est ajouté au lecteur. Les fichiers du schéma de dépendances sont cliquables.

## Flux avec décision {#example-1}

```diagram
{
  "type": "flow",
  "title": "Résolution d’une page locale",
  "nodes": [
    {
      "id": "start",
      "label": "Page ID",
      "x": 170,
      "y": 10
    },
    {
      "id": "check",
      "label": "Traduction ?",
      "kind": "decision",
      "x": 170,
      "y": 130
    },
    {
      "id": "yes",
      "label": "Langue demandée",
      "x": 10,
      "y": 270
    },
    {
      "id": "no",
      "label": "Langue par défaut",
      "x": 330,
      "y": 270
    }
  ],
  "edges": [
    {
      "from": "start",
      "to": "check"
    },
    {
      "from": "check",
      "to": "yes",
      "label": "Oui"
    },
    {
      "from": "check",
      "to": "no",
      "label": "Non"
    }
  ]
}
```

## Diagramme de séquence {#example-2}

```diagram
{
  "type": "sequence",
  "title": "Du bouton d’aide au lecteur",
  "actors": [
    {
      "id": "app",
      "label": "Application"
    },
    {
      "id": "core",
      "label": "CyDoc Core"
    },
    {
      "id": "reader",
      "label": "Lecteur local"
    }
  ],
  "messages": [
    {
      "from": "app",
      "to": "core",
      "label": "createLink(route)"
    },
    {
      "from": "core",
      "to": "app",
      "label": "file:///...#/fr/page",
      "reply": true
    },
    {
      "from": "app",
      "to": "reader",
      "label": "Ouvrir le fichier"
    },
    {
      "from": "reader",
      "to": "app",
      "label": "Page + section",
      "reply": true
    }
  ]
}
```

## Classes et contrats {#example-3}

```diagram
{
  "type": "class",
  "title": "Contrat d’un lecteur optionnel",
  "nodes": [
    {
      "id": "context",
      "label": "MediaContext",
      "fields": [
        "+ locale: string",
        "+ signal: AbortSignal"
      ],
      "methods": [
        "+ loadModule(name)",
        "+ loadAsset(src)"
      ],
      "x": 10,
      "y": 10
    },
    {
      "id": "module",
      "label": "MediaModule",
      "fields": [
        "+ mount(host, config, context)"
      ],
      "methods": [
        "+ dispose()"
      ],
      "x": 330,
      "y": 10
    }
  ],
  "edges": [
    {
      "from": "context",
      "to": "module",
      "label": "uses"
    }
  ]
}
```

## Dépendances de fichiers {#example-4}

```diagram
{
  "type": "flow",
  "title": "Header, implémentation et module C++",
  "nodes": [
    {
      "id": "cpp",
      "label": "help.cpp",
      "x": 10,
      "y": 10,
      "link": "doc:source-examples-cpp-src-help-cpp"
    },
    {
      "id": "hpp",
      "label": "cydoc/help.hpp",
      "x": 310,
      "y": 110,
      "link": "doc:source-examples-cpp-include-cydoc-help-hpp"
    },
    {
      "id": "module",
      "label": "cydoc.help.cppm",
      "x": 10,
      "y": 210,
      "link": "doc:source-examples-cpp-modules-cydoc-help-cppm"
    }
  ],
  "edges": [
    {
      "from": "cpp",
      "to": "hpp",
      "label": "#include"
    },
    {
      "from": "module",
      "to": "hpp",
      "label": "#include"
    }
  ]
}
```

## Architecture modulaire {#example-5}

```diagram
{
  "type": "flow",
  "title": "Le lecteur choisit ses modules",
  "nodes": [
    {
      "id": "core",
      "label": "CyDoc Core",
      "x": 170,
      "y": 10
    },
    {
      "id": "gallery",
      "label": "Gallery",
      "x": 170,
      "y": 120
    },
    {
      "id": "image",
      "label": "Image",
      "x": 0,
      "y": 250,
      "width": 150
    },
    {
      "id": "video",
      "label": "Video",
      "x": 200,
      "y": 250,
      "width": 150
    },
    {
      "id": "mesh",
      "label": "Mesh",
      "x": 400,
      "y": 250,
      "width": 150
    }
  ],
  "edges": [
    {
      "from": "core",
      "to": "gallery"
    },
    {
      "from": "gallery",
      "to": "image"
    },
    {
      "from": "gallery",
      "to": "video"
    },
    {
      "from": "gallery",
      "to": "mesh"
    }
  ]
}
```

## Flux linéaire compact {#linear}

```diagram
Source -> Build -> Local export -> Application
```

## Syntaxe du schéma {#syntax}

```json
{
  "type": "flow",
  "title": "Résolution d’une page locale",
  "nodes": [
    {
      "id": "start",
      "label": "Page ID",
      "x": 170,
      "y": 10
    },
    {
      "id": "check",
      "label": "Traduction ?",
      "kind": "decision",
      "x": 170,
      "y": 130
    },
    {
      "id": "yes",
      "label": "Langue demandée",
      "x": 10,
      "y": 270
    },
    {
      "id": "no",
      "label": "Langue par défaut",
      "x": 330,
      "y": 270
    }
  ],
  "edges": [
    {
      "from": "start",
      "to": "check"
    },
    {
      "from": "check",
      "to": "yes",
      "label": "Oui"
    },
    {
      "from": "check",
      "to": "no",
      "label": "Non"
    }
  ]
}
```
