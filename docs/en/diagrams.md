---
id: diagrams
title: Diagram gallery
description: Flows, decisions, sequences, classes, dependencies, and architecture.
section: Examples
order: 18
---
These diagrams compile to accessible SVG. No diagram engine is added to the viewer. Files in the dependency diagram are clickable.

## Flow with a decision {#example-1}

```diagram
{
  "type": "flow",
  "title": "Resolve a local page",
  "nodes": [
    {
      "id": "start",
      "label": "Page ID",
      "x": 170,
      "y": 10
    },
    {
      "id": "check",
      "label": "Translation?",
      "kind": "decision",
      "x": 170,
      "y": 130
    },
    {
      "id": "yes",
      "label": "Requested locale",
      "x": 10,
      "y": 270
    },
    {
      "id": "no",
      "label": "Default locale",
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
      "label": "Yes"
    },
    {
      "from": "check",
      "to": "no",
      "label": "No"
    }
  ]
}
```

## Sequence diagram {#example-2}

```diagram
{
  "type": "sequence",
  "title": "From help button to viewer",
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
      "label": "Local viewer"
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
      "label": "Open file"
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

## Classes and contracts {#example-3}

```diagram
{
  "type": "class",
  "title": "Optional viewer contract",
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

## File dependencies {#example-4}

```diagram
{
  "type": "flow",
  "title": "C++ header, implementation, and module",
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

## Modular architecture {#example-5}

```diagram
{
  "type": "flow",
  "title": "The viewer selects its modules",
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

## Compact linear flow {#linear}

```diagram
Source -> Build -> Local export -> Application
```

## Diagram syntax {#syntax}

```json
{
  "type": "flow",
  "title": "Resolve a local page",
  "nodes": [
    {
      "id": "start",
      "label": "Page ID",
      "x": 170,
      "y": 10
    },
    {
      "id": "check",
      "label": "Translation?",
      "kind": "decision",
      "x": 170,
      "y": 130
    },
    {
      "id": "yes",
      "label": "Requested locale",
      "x": 10,
      "y": 270
    },
    {
      "id": "no",
      "label": "Default locale",
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
      "label": "Yes"
    },
    {
      "from": "check",
      "to": "no",
      "label": "No"
    }
  ]
}
```
