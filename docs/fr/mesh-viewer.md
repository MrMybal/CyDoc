---
id: mesh-viewer
title: Mesh seul
description: Un seul modèle : orbite, zoom, déplacement, PBR, triangles, scènes et annotations sur la surface. Il est empaqueté pour une lecture locale sans serveur.
section: Exemples
order: 15
---
## Essayer le lecteur {#viewer}

Un seul modèle : orbite, zoom, déplacement, PBR, triangles, scènes et annotations sur la surface. Il est empaqueté pour une lecture locale sans serveur.

```mesh
{
  "src": "assets/sample-a.glb",
  "title": "Un modèle PBR, sans comparaison",
  "annotations": [
    {
      "text": "Surface métallique",
      "position": [
        0,
        0.6,
        0
      ]
    }
  ],
  "views": [
    {
      "name": "Face",
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
      "name": "Profil et triangles",
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
  "title": "Un modèle PBR, sans comparaison",
  "annotations": [
    {
      "text": "Surface métallique",
      "position": [
        0,
        0.6,
        0
      ]
    }
  ]
}
```

[Voir les comparaisons](doc:media) · [Voir les galeries](doc:galleries).
