# CyDoc guide for AI coding assistants

Use this index when integrating CyDoc into an application, writing its documentation, or changing the library. These guides describe CyDoc 0.1.0 and are included in the package. The library is not currently published to npm; use a built checkout or a locally created package archive.

## Choose the task

| Task | Read |
| --- | --- |
| Add offline help to an application | [Integration](INTEGRATION.md) |
| Update or migrate an existing application's manual | [Update requirements](UPDATE.md) |
| Write pages, media, translations or API documentation | [Authoring](AUTHORING.md) |
| Call the core API or implement a module | [API reference](API.md) |
| Edit collaboratively or automate Studio | [Studio integration](STUDIO.md) |
| Build an application's bilingual static showcase from a complete local example | [Standalone showcase convention](showcase/README.md) |
| Standardize an application README, version notes, dependency licenses and optional AI Usage links | [README convention](readme/README.md) and [AI instructions](readme/DocAI.md) |
| Change CyDoc itself | [Repository instructions](../AGENTS.md) and [README](../README.md) |

The host application's instructions and requested scope still apply. These guides do not authorize publishing, installing services, rewriting Git history or changing unrelated application code.

## Working assumptions

- Documentation is designed for human readers. Ship `Documentation.html`, its `DocData/` directory and the separate `DocAI.md` assistant sidecar. Open the HTML with a file URL. No server is needed at reading time. Do not import AI/build instructions, audits or verification histories into the human manual.
- Markdown, syntax highlighting, source indexing and API imports run at build time. Node.js 22 or later is a generation requirement, not a reader requirement.
- Choose only the optional readers the application needs. A gallery also needs the modules for its item types. Three.js belongs only to mesh integration.
- Use the application's existing logo through the optional `logo` configuration/manifest field. Copy it under `assets/`; if none is available, retain the default book icon. See [branding instructions](INTEGRATION.md).
- Treat page IDs and explicit section/media IDs as public addresses. Use the same IDs across translations; do not rename them just because wording changes.
- English originals and full French translations are required before publication. Never fill gaps with copied original-language prose or placeholders. Additional incomplete languages are withheld.
- Keep documentation work in `.CyDocBuild/`, ship only `Documentation/`, and publish public API references rather than raw source listings. Update obsolete descriptions against the application's current behavior.
- Keep content and assets application-owned and local. Compiled HTML is trusted input to the viewer; arbitrary HTML is not automatically sanitized by `mountViewer`.
- Preserve the reader's keyboard and touch controls. Media enlargement is inside the window. Minimal controls appear on hover or focus and remain visible on touch devices.

## Verify before reporting success

1. Inspect the installed version, package exports and current declarations (`dist/index.d.ts`, `dist/types.d.ts`, `dist/viewer.d.ts`). In a checkout, source contracts are in `src/types.ts`.
2. Build or check the application's manual; resolve errors about missing locales, duplicate IDs, invalid links and missing assets. The `check` command also writes the export.
3. Open the exported reader through `file://` on the actual target when possible. Check an internal page link, an explicit anchor, a language switch and every enabled media type. Verify that reading works offline.
4. Check the application's help button or F1 binding using a correctly encoded local file URL. Check storage, codecs and WebGL on target devices when used.
5. State what was tested. A successful build or DOM fixture does not prove native integration, visual layout, codec support or Android behavior.

## Features not to invent

CyDoc does not currently provide a hosted service, a live code parser, automatic translation, video transcoding, a full C++ compiler index, a Blueprint editor or `.uasset` execution. Doxygen and TypeDoc are external generation tools. The graph importer handles a subset of Unreal clipboard text. All pages currently load together; content/search segmentation is not implemented. Content locales are configurable, while built-in UI text currently covers French and English and RTL is not implemented.

Read the [README limitations](../README.md#compatibility-and-limits) before promising support. When an installed version differs from these guides, verify its implementation instead of guessing an API.
