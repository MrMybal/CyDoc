---
id: galleries
title: Media galleries
description: Images, videos, meshes, or mixed content, with only one active viewer.
section: Examples
parent: media
order: 16
---
A gallery mounts only its active item. Switching items pauses video and releases the previous mesh resources. Tabs also support keyboard navigation.

## Image gallery {#images}

```gallery
{
  "title": "Image gallery",
  "items": [
    {
      "src": "assets/settings.svg",
      "alt": "Application settings",
      "type": "image",
      "title": "Initial version"
    },
    {
      "type": "image",
      "src": "assets/settings-b.svg",
      "alt": "Updated settings",
      "title": "New version"
    }
  ],
  "id": "gallery-images"
}
```

## Video gallery {#videos}

```gallery
{
  "title": "Video gallery",
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
          "text": "A timed annotation"
        }
      ],
      "type": "video"
    },
    {
      "type": "video",
      "src": "assets/video-b.webm",
      "title": "Alternative treatment"
    }
  ],
  "id": "gallery-videos"
}
```

## Mesh gallery {#meshes}

```gallery
{
  "title": "Mesh gallery",
  "items": [
    {
      "src": "assets/sample-a.glb",
      "title": "Green metal",
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
      "type": "mesh"
    },
    {
      "type": "mesh",
      "src": "assets/sample-b.glb",
      "title": "Gold metal"
    }
  ],
  "id": "gallery-meshes"
}
```

## Mixed gallery {#mixed}

```gallery
{
  "title": "Image, video, and mesh in one gallery",
  "items": [
    {
      "src": "assets/settings.svg",
      "alt": "Application settings",
      "type": "image",
      "title": "Initial version"
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
          "text": "A timed annotation"
        }
      ],
      "type": "video"
    },
    {
      "src": "assets/sample-a.glb",
      "title": "Green metal",
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

The gallery module stays independent. Enable only the viewers used in your galleries. Gallery models are packaged just like standalone models.
