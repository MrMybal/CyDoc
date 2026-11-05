---
id: mesh-viewer
title: Single mesh
description: One model: orbit, zoom, pan, PBR, wireframe, scenes, and surface annotations. It is packaged for local viewing without a server.
section: Examples
order: 15
---
## Try the viewer {#viewer}

One model: orbit, zoom, pan, PBR, wireframe, scenes, and surface annotations. It is packaged for local viewing without a server.

```mesh
{
  "src": "assets/sample-a.glb",
  "title": "One PBR model, no comparison",
  "annotations": [
    {
      "text": "Metallic surface",
      "position": [
        0,
        0.6,
        0
      ]
    }
  ],
  "views": [
    {
      "name": "Front",
      "camera": [
        0,
        1.5,
        4
      ],
      "target": [
        0,
        0,
        0
      ],
      "scene": 0,
      "wire": false,
      "environment": "studio"
    },
    {
      "name": "Side and triangles",
      "camera": [
        4,
        1.5,
        0
      ],
      "target": [
        0,
        0,
        0
      ],
      "scene": 0,
      "wire": true,
      "environment": "daylight"
    }
  ]
}
```

## Configuration {#configuration}

```json
{
  "src": "assets/sample-a.glb",
  "title": "One PBR model, no comparison",
  "annotations": [
    {
      "text": "Metallic surface",
      "position": [
        0,
        0.6,
        0
      ]
    }
  ]
}
```

[See comparisons](doc:media) · [See galleries](doc:galleries).

[Try the minimal version](doc:minimal-media).
