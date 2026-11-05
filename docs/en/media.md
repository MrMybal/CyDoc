---
id: media
title: Media & viewers
description: Optional viewers to explore, annotate, and compare images, videos, and meshes.
section: Create content
order: 11
---
Every media viewer is optional. The host app selects which modules to distribute; the core imports no media viewer or 3D engine. Modules load near their content and release resources when leaving the page.

```json
{ "modules": ["image", "video", "mesh", "gallery", "graph"] }
```

Remove unused modules from `cydoc.config.json`. Without a module, a basic image or file link remains available. All media lives locally in `assets/`.

Dedicated examples show a [single image](doc:image-viewer), a [single video](doc:video-viewer), a [single mesh](doc:mesh-viewer), [galleries](doc:galleries), and [node graphs](doc:blueprints).

## Images {#images}

The image module provides in-window enlargement, zoom, pan, and comparison in one frame. Transforms are synchronized to preserve alignment while comparing.

Drag the handle directly on the A/B divider. It stays synchronized with the range below and supports arrow keys. The four-corner icon enlarges the reader within the documentation window; Escape reduces it. These controls are shared by image, video, and mesh comparisons.

```image
{"src":"assets/settings.svg","compare":"assets/settings-b.svg","alt":"Application settings comparison","labels":["Before","After"]}
```

```markdown
![Accessible description](assets/settings.svg)
```

## Local videos {#video}

The video module synchronizes playback, time, and speed across two videos. An A/B slider compares their frames. Add an annotation at the current time; click the frame to choose its position. Notes can be deleted and exported as JSON.

```video
{"src":"assets/video-a.webm","compare":"assets/video-b.webm","title":"Video comparison · timed annotations","sources":[{"src":"assets/video-av1.webm","type":"video/webm; codecs=av01.0.04M.08"},{"src":"assets/video-a.webm","type":"video/webm; codecs=vp9"}],"annotations":[{"time":1,"duration":2,"text":"Same instant, two treatments","x":0.5,"y":0.2}]}
```

~~~markdown
```video
{"src":"assets/tutorial.webm","compare":"assets/version-b.webm","annotations":[{"time":2,"duration":4,"text":"Important step"}]}
```
~~~

AV1 and VP9 provide strong compression. The module uses browser decoders: supply `sources` and `compareSources` variants, plus H.264 MP4 when your devices require it. The module does not transcode files. Comparison uses two decoders and is time-synchronized without a frame-accuracy guarantee.

## Static meshes and PBR {#meshes}

The separate mesh module uses MIT-licensed Three.js as an optional dependency. It provides orbit, zoom, pan, glTF PBR rendering, three lighting environments, glTF scene selection, wireframe, and A/B comparison with a shared camera.

```mesh
{"src":"assets/sample-a.glb","compare":"assets/sample-b.glb","title":"PBR inspection · two materials","annotations":[{"text":"Metallic surface","position":[0,0.6,0]}]}
```

Type an annotation and double-click the model surface to anchor it in 3D. Notes stay local and can be exported as JSON. Labels are not occlusion-tested; they have no semantic tracking across scenes.

Prefer self-contained GLB files. Models and external textures must stay in `assets/`. The generator packs models and their resources into local scripts loaded on demand, so they can open through `file://` without a web server. The file picker can also open a primary GLB. Draco and KTX2 need additional decoder adapters, currently excluded. WebGL 2 is required. Comparison models should share a coordinate system and scale.

## Dependency-free diagrams {#diagrams}

A `diagram` block renders labels separated by `->`, or a JSON definition, into an accessible SVG diagram. No extra rendering engine is loaded.

```diagram
Your application -> Contextual link -> Local documentation
```

~~~markdown
```diagram
Your application -> Contextual link -> Local documentation
```
~~~

The short syntax supports linear flows of up to eight steps. JSON supports decisions, sequences, classes, dependencies, and architectures with page links. The [diagram gallery](doc:diagrams) presents six examples and their configuration.
