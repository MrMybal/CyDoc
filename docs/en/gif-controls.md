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

The full reader starts on user action. With `controls: "minimal"`, GIFs autoplay; set `autoplay: false` to disable it. Reduced-motion preferences and links to a specific frame prevent autoplay. Playback suspends outside the viewport or when the page is hidden, then resumes if it was playing. The decoder handles palettes, transparency, interlacing, and disposal methods 0–3. The decoded budget is 64 MiB per file, configurable with `maxDecodedMiB` up to 256 MiB. Oversized animations display an error; frames are released when the viewer closes.

[Minimal readers](doc:minimal-media).
