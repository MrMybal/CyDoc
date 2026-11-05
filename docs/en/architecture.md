---
id: architecture
title: Architecture
description: A dependency-free runtime core, an independent viewer, and separate build tools.
section: Getting started
order: 2
---
CyDoc separates content processing from reading. Markdown is compiled once, at build time. The viewer receives prepared content.

## Three independent parts {#modules}

| Part | Responsibility | Environment |
| --- | --- | --- |
| Core | Page resolution, languages, links, search | JavaScript, no DOM |
| Viewer | Navigation, media, contents and UI | Browser or WebView |
| Generator | Markdown, extraction, link validation | Node.js at build time |

Build dependencies are never bundled into the viewer. Reading requires no UI framework, remote fonts, CDN, analytics, or network API.

Media viewers are optional modules. Image and video modules use browser APIs. The mesh module adds Three.js only when selected by the host app. Each viewer loads separately and releases resources when leaving the page.

## From content to your application {#pipeline}

```diagram
Markdown + comments -> CyDoc generator -> Static export -> Browser or WebView
```

## A portable format {#format}

The JSON manifest exposes a `schemaVersion`, locales, and compiled pages. A page pairs a stable `id` with its `locale`. This format supports building your own interface without using the included viewer.

## Performance and limitations {#performance}

Media loads on demand. Search normalizes content once at startup and reuses this in-memory index. The viewer does not fetch pages over HTTP.

This initial version loads every page through `data.js` and scans the index for each search. Tens of thousands of pages will need a segmented index and lazy loading. Measure actual bundle sizes with `npm run size`.
