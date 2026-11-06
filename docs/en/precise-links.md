---
id: precise-links
title: Precise links and views
description: A URL to a line, annotation, playback time, or 3D view.
section: Examples
order: 31
---
These links open real example states. A viewer’s link icon copies its current view without interrupting reading.

- [Video at 1.25 seconds](doc:video-viewer?media=media-1&time=1.25)
- [Video annotation](doc:video-viewer?media=media-1&note=note-0)
- [Make Help Link node](doc:blueprints?media=media-1&node=link)
- [3D camera and wireframe](doc:mesh-viewer?media=media-1&camera=3,2,4&target=0,0,0&wire=true&scene=0)
- [Annotated image area](doc:image-viewer?media=media-1&note=settings-area&zoom=1.5)
- [C++ header API](doc:source-examples-cpp-include-cydoc-session-hpp#symbols)
- [Second gallery item](doc:galleries?media=gallery-images&item=1)
- [GIF frame 6](doc:gif-controls?media=animation&frame=5)

## API {#api}

```typescript
import { createLink } from "cydoc";
const url = createLink({
  locale: "fr", pageId: "video-viewer",
  state: { media: "media-1", time: "1.25" }
}, "file:///D:/Documentation/Documentation.html");
```

The fragment contains `?media=…&time=…`. An explicit media block `id` keeps links stable when rearranging a page. Reader-created annotations are private: linking their id requires them to exist on the destination device.
