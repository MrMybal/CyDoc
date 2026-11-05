---
id: video-viewer
title: Vidéo seule
description: Une seule piste vidéo, avec vitesse de lecture, annotations et agrandissement dans la fenêtre. Ajoutez une note au moment courant, ou cliquez dans l’image pour choisir sa position.
section: Exemples
order: 14
---
## Essayer le lecteur {#viewer}

Une seule piste vidéo, avec vitesse de lecture, annotations et agrandissement dans la fenêtre. Ajoutez une note au moment courant, ou cliquez dans l’image pour choisir sa position.

```video
{
  "src": "assets/video-a.webm",
  "title": "Une vidéo, sans comparaison",
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
  ]
}
```

## Configuration {#configuration}

```json
{
  "src": "assets/video-a.webm",
  "title": "Une vidéo, sans comparaison",
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
  ]
}
```

[Voir les comparaisons](doc:media) · [Voir les galeries](doc:galleries).

[Essayer la version épurée](doc:minimal-media).
