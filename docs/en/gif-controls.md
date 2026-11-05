---
id: gif-controls
title: GIF controls
description: Pause, frame stepping, zoom, comparison, and GIF galleries.
section: Examples
order: 32
---
The optional `gif` module decodes frames locally for pause, scrubbing, frame stepping, and time-synchronized comparison. A GIF in an `image` block keeps native browser playback.

```gif
{
  "id": "animation",
  "src": "assets/steps-a.gif",
  "title": "Controllable animation"
}
```

## Synchronized comparison {#compare}

```gif
{
  "id": "animation-compare",
  "src": "assets/steps-a.gif",
  "title": "Controllable animation",
  "compare": "assets/steps-b.gif"
}
```

## GIF gallery {#gallery}

```gallery
{
  "id": "animations",
  "items": [
    {
      "type": "gif",
      "id": "animation",
      "src": "assets/steps-a.gif",
      "title": "Controllable animation"
    },
    {
      "type": "gif",
      "src": "assets/steps-b.gif",
      "title": "Variant"
    }
  ]
}
```

## Memory and playback {#memory}

Playback starts on a reader action and pauses when the page is hidden. The decoder handles palettes, transparency, interlacing, and disposal methods 0–3. The decoded budget is 64 MiB per file, configurable with `maxDecodedMiB` up to 256 MiB. Oversized animations display an error; frames are released when the viewer closes.
