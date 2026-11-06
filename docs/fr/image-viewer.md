---
id: image-viewer
title: Image seule
description: Zoomez avec la molette ou les boutons, déplacez l’image et utilisez l’icône d’agrandissement dans la fenêtre. Aucun second média n’est chargé.
section: Exemples
parent: media
order: 13
---
## Essayer le lecteur {#viewer}

Zoomez avec la molette ou les boutons, déplacez l’image et utilisez l’icône d’agrandissement dans la fenêtre. Aucun second média n’est chargé.

```image
{
  "src": "assets/settings.svg",
  "alt": "Paramètres de l’application",
  "annotations": [
    {
      "id": "settings-area",
      "type": "rect",
      "x": 0.3,
      "y": 0.3,
      "toX": 0.75,
      "toY": 0.8,
      "label": "Zone de réglages"
    },
    {
      "id": "help-arrow",
      "type": "arrow",
      "x": 0.6,
      "y": 0.8,
      "toX": 0.84,
      "toY": 0.7,
      "label": "Aide contextuelle"
    }
  ]
}
```

## Configuration {#configuration}

```json
{
  "src": "assets/settings.svg",
  "alt": "Paramètres de l’application"
}
```

[Voir les comparaisons](doc:media) · [Voir les galeries](doc:galleries).

[Essayer la version épurée](doc:minimal-media).
