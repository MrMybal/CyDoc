---
id: minimal-media
title: Minimal readers
description: Images, videos, models and GIFs with discreet controls and in-window enlargement.
section: Examples
parent: media
order: 33
---

## An image without a permanent toolbar {#image}

Hover over the image to reveal the settings and enlargement icons. Controls are also accessible with a keyboard and stay visible on touch devices. The settings panel retains zoom, reset and annotation tools.

```image
{"id":"clean-image","src":"assets/settings.svg","alt":"Application settings","controls":"minimal"}
```

The four-corner icon opens a large view inside the documentation window. Window controls remain available. Use the reduce icon or Escape to return to the article at the same reading position.

## Video controls on hover {#video}

Playback controls appear on hover or keyboard focus. Video starts on user action; annotation tools are available in settings.

```video
{"id":"clean-video","src":"assets/video-a.webm","title":"Application walkthrough","controls":"minimal"}
```

## A minimal 3D model {#mesh}

Manipulate the model directly. Settings provide access to scenes, PBR lighting, wireframe, views and annotations.

```mesh
{"id":"clean-mesh","src":"assets/sample-a.glb","title":"PBR model","controls":"minimal"}
```

## An autoplay GIF {#gif}

The animation starts automatically and can be paused using the playback bar. Playback suspends outside the viewport. Reduced-motion preferences are respected.

```gif
{"id":"clean-gif","src":"assets/steps-a.gif","title":"Animated steps","controls":"minimal"}
```

## A minimal gallery {#gallery}

The gallery option applies to its items. Each item can use `"controls": "full"` to keep its tools permanently visible.

```gallery
{"id":"clean-gallery","title":"Application media","controls":"minimal","items":[{"type":"image","src":"assets/settings.svg","alt":"Settings"},{"type":"gif","src":"assets/steps-a.gif","title":"Animation"},{"type":"video","src":"assets/video-a.webm","title":"Walkthrough"},{"type":"mesh","src":"assets/sample-a.glb","title":"3D model"}]}
```

## Choose a presentation {#configuration}

Add `"controls": "minimal"` to the JSON of an `image`, `video`, `mesh` or `gif` block. The default is `"full"`. Set `"autoplay": false` for a minimal GIF without automatic playback. Full GIF readers can opt in with `"autoplay": true`. A link targeting a specific GIF frame stays paused for inspection.
