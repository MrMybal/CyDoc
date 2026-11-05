---
id: themes
title: Themes & appearance
description: Six palettes for documentation, controls, and code.
section: Examples
order: 19
---
Choose a theme using the palette icon in the top bar. It applies to the viewer and module controls; the choice is saved on this device.

| Theme | Use |
| --- | --- |
| Light | Bright reading |
| Dark | Neutral dark background |
| Midnight | Indigo palette |
| Nord | Blue greys and cool accents |
| Paper | Cream background and brown accents |
| High contrast | Stronger outlines and text |

## Initial configuration {#configuration}

```typescript
mountViewer(root, manifest, { initialTheme: "nord" });
```
Node graphs and 3D rendering keep an inspection-oriented canvas background; toolbars, captions, and panels follow the theme. Code highlighting is generated at build time, with no highlighter in the reader.
