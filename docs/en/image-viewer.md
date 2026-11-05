---
id: image-viewer
title: Single image
description: Use the wheel or buttons to zoom, drag the image, and use the in-window enlargement icon. No second media is loaded.
section: Examples
order: 13
---
## Try the viewer {#viewer}

Use the wheel or buttons to zoom, drag the image, and use the in-window enlargement icon. No second media is loaded.

```image
{
  "src": "assets/settings.svg",
  "alt": "Application settings",
  "annotations": [
    {
      "id": "settings-area",
      "type": "rect",
      "x": 0.3,
      "y": 0.3,
      "toX": 0.75,
      "toY": 0.8,
      "label": "Settings area"
    },
    {
      "id": "help-arrow",
      "type": "arrow",
      "x": 0.6,
      "y": 0.8,
      "toX": 0.84,
      "toY": 0.7,
      "label": "Contextual help"
    }
  ]
}
```

## Configuration {#configuration}

```json
{
  "src": "assets/settings.svg",
  "alt": "Application settings"
}
```

[See comparisons](doc:media) · [See galleries](doc:galleries).

[Try the minimal version](doc:minimal-media).
