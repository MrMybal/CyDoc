---
id: galleries
title: Galeries de médias
description: Images, vidéos, meshes ou contenus mixtes, avec un seul lecteur actif.
section: Exemples
parent: media
order: 16
---
Une galerie monte uniquement son élément actif. Quand vous changez de média, la vidéo s’arrête et les ressources du mesh précédent sont libérées. La navigation fonctionne aussi au clavier dans les onglets.

## Galerie d’images {#images}

```gallery
{
  "title": "Galerie d’images",
  "items": [
    {
      "src": "assets/settings.svg",
      "alt": "Paramètres de l’application",
      "type": "image",
      "title": "Version initiale"
    },
    {
      "type": "image",
      "src": "assets/settings-b.svg",
      "alt": "Nouveaux paramètres",
      "title": "Nouvelle version"
    }
  ],
  "id": "gallery-images"
}
```

## Galerie de vidéos {#videos}

```gallery
{
  "title": "Galerie de vidéos",
  "items": [
    {
      "src": "assets/video-a.webm",
      "title": "Original",
      "sources": [
        {
          "src": "assets/video-av1.webm",
          "type": "video/webm; codecs=av01.0.04M.08"
        },
        {
          "src": "assets/video-a.webm",
          "type": "video/webm; codecs=vp9"
        }
      ],
      "annotations": [
        {
          "time": 1,
          "duration": 2,
          "text": "Une annotation temporelle"
        }
      ],
      "type": "video"
    },
    {
      "type": "video",
      "src": "assets/video-b.webm",
      "title": "Traitement alternatif"
    }
  ],
  "id": "gallery-videos"
}
```

## Galerie de meshes {#meshes}

```gallery
{
  "title": "Galerie de meshes",
  "items": [
    {
      "src": "assets/sample-a.glb",
      "title": "Métal vert",
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
      "type": "mesh"
    },
    {
      "type": "mesh",
      "src": "assets/sample-b.glb",
      "title": "Métal doré"
    }
  ],
  "id": "gallery-meshes"
}
```

## Galerie mixte {#mixed}

```gallery
{
  "title": "Image, vidéo et mesh dans une galerie",
  "items": [
    {
      "src": "assets/settings.svg",
      "alt": "Paramètres de l’application",
      "type": "image",
      "title": "Version initiale"
    },
    {
      "src": "assets/video-a.webm",
      "title": "Original",
      "sources": [
        {
          "src": "assets/video-av1.webm",
          "type": "video/webm; codecs=av01.0.04M.08"
        },
        {
          "src": "assets/video-a.webm",
          "type": "video/webm; codecs=vp9"
        }
      ],
      "annotations": [
        {
          "time": 1,
          "duration": 2,
          "text": "Une annotation temporelle"
        }
      ],
      "type": "video"
    },
    {
      "src": "assets/sample-a.glb",
      "title": "Métal vert",
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
      "type": "mesh"
    }
  ],
  "id": "gallery-mixed"
}
```

## Modules {#modules}

```json
{
  "modules": [
    "gallery",
    "image",
    "video",
    "mesh"
  ]
}
```

Le module `gallery` reste indépendant. N’activez que les lecteurs présents dans vos galeries. Les modèles 3D de galerie sont empaquetés comme les modèles seuls.
