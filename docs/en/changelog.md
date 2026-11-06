---
id: changelog
title: Release notes
description: Shipped features and next steps for CyDoc.
section: API
order: 101
---
## CyDoc Studio 0.1.2 {#studio-012}

The optional [Studio editor](doc:studio#start) adds:

- Visual and Markdown editing, a page tree, properties, autosave and working revision history.
- Account-free local projects, with an independent editable CyDoc example in English and French.
- Local media import, optional module selection, actual-reader previews and bilingual publication.
- Hosted accounts, project invitations and roles, plus simultaneous editing and presence through Yjs.
- Optional Git with documentation commits, diffs, branches, history and supported HTTPS remotes.
- A portable Windows x64 application built with CyUI and CEF, with bundled runtimes and full-window Editor, Documentation, Options and Local MCP / SDK tabs.
- All six library themes shared by the editor, native shell and bundled manual.
- JavaScript/Python SDKs and 22 local CyToolsCore MCP operations.

Studio has separate dependencies. The reader library remains version 0.1.0 and exported manuals still open directly through `file://`.

## Reader library 0.1.0 {#v010}

The first functional foundation:

- JavaScript core with no runtime dependencies.
- Local static export and framework-independent viewer.
- Required English originals and complete, current French translations; only complete languages are offered.
- Stable page and section links.
- Accent-insensitive local search.
- Images, video blocks, and SVG diagrams: flows, decisions, sequences, classes, dependencies, and architectures.
- Optional media modules loaded on demand: image zoom and comparison, annotated synchronized videos, annotated PBR mesh comparison.
- Comparison handles directly on media and icon in-window enlargement buttons.
- Standalone viewer examples and image, video, mesh, and mixed galleries.
- Interactive typed-port graphs and support for a subset of Unreal Blueprint clipboard text.
- Link catalog across multiple local documentation sets.
- Examples in nine languages including C++, Python, and HLSL/GLSL shaders, with build-time highlighting.
- Annotated comments and Python docstrings, API-only file references, includes, modules and local dependencies.
- Internal link validation including diagram and graph links.
- Six themes, mobile navigation, contents, copy, and print.
- Links to lines, annotations, video times, GIF frames, nodes, and 3D views.
- Code tabs, steps, callouts, collapsible sections, glossary, and code diffs.
- Code search with filters and typo tolerance.
- GIF controls, image arrows and areas, video stepping, and saved 3D views.
- Bookmarks, history, reading resume, and exportable private notes.
- Doxygen XML, TypeDoc JSON, and neutral API imports.
- Local version catalog, redirects, and translation completeness checks during publication.
- Native F1 examples for Windows, Linux, macOS, and Android.

## Next steps {#next}

Native device validation, additional API adapters, segmented search for large corpora, and RTL translations remain to be developed. Package names and sizes may change before the first publication.
