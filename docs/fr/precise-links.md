---
id: precise-links
title: Liens précis et vues
description: Une URL vers une ligne, une annotation, un instant ou une vue 3D.
section: Exemples
order: 31
---
Ces liens ouvrent un état réel des exemples. L’icône de lien d’un lecteur copie sa vue courante, sans modifier votre lecture.

- [Vidéo à 1,25 seconde](doc:video-viewer?media=media-1&time=1.25)
- [Annotation vidéo](doc:video-viewer?media=media-1&note=note-0)
- [Nœud Make Help Link](doc:blueprints?media=media-1&node=link)
- [Caméra et triangles 3D](doc:mesh-viewer?media=media-1&camera=3,2,4&target=0,0,0&wire=true&scene=0)
- [Zone annotée de l’image](doc:image-viewer?media=media-1&note=settings-area&zoom=1.5)
- [API du header C++](doc:source-examples-cpp-include-cydoc-session-hpp#symbols)
- [Deuxième élément de galerie](doc:galleries?media=gallery-images&item=1)
- [Image 6 du GIF](doc:gif-controls?media=animation&frame=5)

## API {#api}

```typescript
import { createLink } from "cydoc";
const url = createLink({
  locale: "fr", pageId: "video-viewer",
  state: { media: "media-1", time: "1.25" }
}, "file:///D:/Documentation/Documentation.html");
```

Le fragment contient `?media=…&time=…`. Un identifiant explicite `id` dans le bloc média stabilise le lien si vous réorganisez la page. Les annotations créées par le lecteur sont privées : un lien vers leur identifiant nécessite qu’elles existent sur l’appareil cible.
