---
id: video-viewer
title: Single video
description: A single video track with playback speed, annotations, and in-window enlargement. Add a note at the current time, or click the image to choose its position.
section: Examples
parent: media
order: 14
---
## Try the viewer {#viewer}

A single video track with playback speed, annotations, and in-window enlargement. Add a note at the current time, or click the image to choose its position.

```video
{
  "src": "assets/video-a.webm",
  "title": "One video, no comparison",
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
      "text": "A timed annotation"
    }
  ]
}
```

## Configuration {#configuration}

```json
{
  "src": "assets/video-a.webm",
  "title": "One video, no comparison",
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
      "text": "A timed annotation"
    }
  ]
}
```

[See comparisons](doc:media) · [See galleries](doc:galleries).

[Try the minimal version](doc:minimal-media).
