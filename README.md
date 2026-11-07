# CyDoc

A lightweight, modular documentation library for applications. Multilingual by design, MIT licensed, and readable directly from local files without a web server.

[Website](https://mrmybal.github.io/CyDoc/) · [Documentation](https://mrmybal.github.io/CyDoc/manual/Documentation.html#/en/overview) · [Présentation en français](https://mrmybal.github.io/CyDoc/?lang=fr) · [Documentation française](https://mrmybal.github.io/CyDoc/manual/Documentation.html#/fr/overview) · [Downloads](https://github.com/MrMybal/CyDoc/releases)

CyDoc combines handwritten guides, documentation extracted from source annotations, structured API imports, and optional media viewers in one framework-independent reader. It is designed for browsers and WebViews on Windows, Linux, macOS, and Android.

**Status:** reader library 0.1.0 and optional Studio editor 0.1.2. The library is not published to npm yet. Native reader integrations are source examples; target-device validation is still required.

For manual authoring, the optional [CyDoc Studio](https://github.com/MrMybal/CyDoc/blob/main/studio/README.md) adds a visual/Markdown web editor, account-free local editing, account-based online collaboration, optional Git, a Windows CyUI/CEF shell and local SDK/MCP access through CyToolsCore. Its dependencies remain separate from exported readers.

## CyDoc Studio editor

[Download Studio 0.1.2 for Windows x64](https://github.com/MrMybal/CyDoc/releases/tag/studio-v0.1.2). Extract the complete ZIP and start `CyDocStudio.exe`. The portable application bundles its runtimes and opens locally without an account. Keep `app/`, `runtime/` and `LICENCES/` beside the executable.

- Write visually or in Markdown, organize a page tree, import local media and preview the actual reader.
- Start from **Open the CyDoc example**, which creates an independent editable bilingual manual with media, diagrams and API examples.
- Publish complete English/French documentation as `Documentation.html`, `DocData/` and the separate `DocAI.md` sidecar. Reading still works without Studio or a server.
- Use ordinary folders without Git, or enable documentation commits, diffs, branches, history and supported HTTPS remotes.
- Choose all six library themes: Light, Dark, Midnight, Nord, Paper and High contrast. The Windows shell, editor and bundled manual share the selection.
- Work in full-window Editor, Documentation, Options and Local MCP / SDK tabs, with retained editor and reader views.
- Host the web editor with accounts, invitations, project roles and simultaneous Yjs editing. Hosting requires one persistent service with HTTPS and WebSockets; this repository does not provision a hosted service.
- Automate local projects with JavaScript/Python SDKs and 22 CyToolsCore MCP operations.

To run the account-free browser editor from this checkout, after the root build below:

```sh
npm ci --prefix studio
npm run build --prefix studio
npm start --prefix studio -- --local --data ./data --port 4310
```

Open `http://127.0.0.1:4310`. The editing service is needed while authoring; the published reader remains static. Online installations omit `--local` and require accounts. See the [Studio guide](https://github.com/MrMybal/CyDoc/blob/main/studio/README.md) for setup, optional Git, hosting and SDK/MCP usage. The current Windows CyUI Python CEF bridge runs without the CEF process sandbox; use it with trusted documentation projects. Native Studio builds for other platforms are not provided.

## Quick start

Requirements: Node.js 22 or later and npm.

```sh
npm ci
npm run build
```

Open `web/index.html` or `dist/site/Documentation.html` directly in your browser. The first file redirects to the generated reader while preserving the URL fragment and query string.

```text
file:///path/to/CyDoc/dist/site/Documentation.html#/en/quickstart/installation
```

Copy the entire generated `dist/site/` directory into your application's `Documentation/` folder. Reading requires no Node.js installation, network connection, or web server. New exports have this layout:

```text
App/
  Documentation/
    Documentation.html
    DocAI.md                    # Separate assistant guidance, never a reader page
    DocData/
      viewer.js
      viewer.css
      data.js
      manifest.json
      translation-report.json
      assets/
      media-*.js                 # Enabled modules and packed binary assets
      media-mesh.LICENSE.txt     # When mesh is enabled
      versions/                 # When versionBuilds is configured
```

`Documentation.html` is the actual reader page; its address stays unchanged while reading. Set `out` to choose the export directory (default: `Documentation`). Application authoring, assets and tooling belong in `App/.CyDocBuild/`, using `.CyDocBuild/cydoc.config.json` and a sibling `Documentation/` output. The CLI prefers that private configuration; legacy root configurations remain readable. This library checkout keeps its own maintained demo layout. Builds recognize the previous flat CyDoc export, move its generated files into `DocData/`, and retain an `index.html` redirect for existing links, including their query and fragment. Unrelated output files are preserved; use a fresh output directory when packaging only the current generated files.

```sh
npm run dev    # Rebuild on local changes; refresh the file in your browser
npm test       # Build and run the automated tests
npm run check  # Check TypeScript types
npm run size   # Measure core, reader, data, and optional module bundles
```

`npm run dev` watches local files and does not start a server.

## Features

- Stable links to pages, sections, source lines, annotations, playback times, graph nodes, and 3D views.
- French and English example content, with only complete and current translations offered to readers.
- Local search across prose, code, and symbols, with language/content filters and typo tolerance.
- Build-time syntax highlighting for C++, Python, HLSL, GLSL, C#, C, JavaScript, Java, and TypeScript. Native examples also use Kotlin and Swift.
- Code tabs, step-by-step guides, callouts, collapsible content, glossary tooltips, and code diffs.
- SVG flow, decision, sequence, class, dependency, and architecture diagrams compiled at build time.
- Header search with live results, nested page navigation, six themes, keyboard navigation, a page outline, code copying, and print support.
- Local bookmarks, recent pages, reading positions, and exportable private notes.
- Independent media modules loaded on demand.
- Local documentation versions, redirects, cross-documentation links, and API-only file references with includes and modules.

## Showcase website

The [public showcase](https://mrmybal.github.io/CyDoc/) and the [HTML documentation](https://mrmybal.github.io/CyDoc/manual/Documentation.html#/en/overview) are hosted on GitHub Pages. English is the default; the language selector opens the complete French presentation and matching manual.

The static English/French showcase is maintained in the checkout's `website/` directory; see `website/README.md`.

For another application, use the [standalone showcase convention for AI assistants](ai/showcase/README.md) and its [complete local CyDoc example](ai/showcase/example/index.html). The folder includes its own resources and HTML manual, with no external reference links. It covers visual direction, real screenshots, English/French content, offline manual integration and browser verification. Git, GitHub and hosting are optional.

Build and preview it locally:

```sh
npm run website:build
npm run website:preview
```

Open the loopback URL printed by the preview command, or open `dist/website/index.html` directly. English is the default; `?lang=fr` selects French. The generated directory includes the actual CyDoc reader under `manual/Documentation.html`, with its offline assets and assistant sidecar. Styles and scripts use content-hashed filenames. The complete `dist/website/` directory is ready for static hosting, including GitHub Pages; these commands do not deploy or push anything.

The `Publish website and documentation` workflow rebuilds, tests and deploys `dist/website/` on pushes to `main` or when run manually in GitHub Actions. It publishes only the static showcase and manual; Studio services and local project data are excluded.

## Core library

The core has no runtime dependencies and does not use the DOM.

```ts
import { createDocumentation, createLink } from 'cydoc';

const docs = createDocumentation(manifest);
const page = docs.resolve('quickstart', 'en');
const results = docs.search('installation', 'en');

const url = createLink({
  locale: 'en',
  pageId: 'quickstart',
  anchor: 'installation'
}, './Documentation/Documentation.html');
```

Mount the optional reader in a dedicated page:

```ts
import { mountViewer } from 'cydoc/viewer';
import 'cydoc/viewer.css';

const viewer = mountViewer(document.querySelector('#app')!, manifest, {
  initialTheme: 'nord',
  storageId: 'my-application-help'
});

// Release event listeners and active media readers.
viewer.destroy();
```

The reader uses the URL fragment and a global CSS reset. Use a dedicated page or iframe when integrating into an existing UI. Pass a compiler-generated manifest, or HTML sanitized by your application, to `mountViewer`.

## Application branding

The sidebar keeps long application names within its width, using an ellipsis when needed. Hover or focus the brand to read the complete name and version. The version badge sits below the name, beside the documentation label.

Use the application's existing logo when one is available. Copy it into the documentation asset directory and set `"logo": "assets/app-logo.svg"` in the build configuration. SVG, PNG and WebP are suitable choices. The logo is included in the generated manifest and needs no optional image module. Custom embeddings supply the same `logo` field on `Documentation`.

If the application has no logo, omit this setting to keep the default book icon. An image that fails at reading time also falls back to that icon. The build rejects invalid or missing configured logo files. The reader footer does not label the host application's license; document that license in the application's own content. CyDoc itself remains MIT licensed.

## Optional media modules

The core and main reader do not import a media viewer or a 3D engine. The host selects the modules it needs.

| Module | Capabilities |
| --- | --- |
| `image` | In-window enlargement, zoom, pan, synchronized A/B transforms, draggable comparison handle, arrow/area annotations, local persistence, JSON export. Native GIF display also works here. |
| `video` | Browser-supported codec variants, playback speed, timed annotations, in-window enlargement, synchronized A/B playback, and nominal frame stepping. |
| `mesh` | GLB/glTF, PBR, orbit/pan/zoom, lighting presets, glTF scenes, wireframe, A/B comparison, surface annotations, and saved camera views. |
| `gif` | Local GIF raster decoding, pause, scrubbing, frame stepping, zoom/pan, and time-synchronized comparison. |
| `gallery` | Image, video, mesh, GIF, or mixed galleries. Only the active item's reader is mounted. |
| `graph` | Typed ports, curved connections, comment groups, selection, pan/zoom, in-window enlargement, and documentation links. |

For generated exports:

```json
{
  "modules": ["image", "video", "gallery"]
}
```

Omit `modules` to distribute no optional readers. Include the child readers required by a gallery. The repository demo enables all six modules. Previously generated module scripts are removed when disabled.

For JavaScript integrations:

```ts
const viewer = mountViewer(document.querySelector('#app')!, manifest, {
  modules: {
    image: () => import('cydoc/modules/image').then(m => m.default),
    video: () => import('cydoc/modules/video').then(m => m.default),
    gallery: () => import('cydoc/modules/gallery').then(m => m.default),
    gif: () => import('cydoc/modules/gif').then(m => m.default),
    graph: () => import('cydoc/modules/graph').then(m => m.default)
    // Add mesh only when needed, and install its optional peer dependency, three.
  }
});
```

`MediaModule.mount(host, config, context)` receives the locale, an `AbortSignal`, local asset/module providers, and optional reader state. It returns a cleanup function, optionally asynchronously. Custom modules can use this contract through the JavaScript API.

GLB/glTF resources and controllable GIF files are packaged as classic local scripts loaded on demand. This avoids file-fetch restrictions when opening the generated reader through `file://`. A custom embedding supplies `loadAsset(src)`, returning `{ base64, resources? }`; the generated bootstrap configures it automatically.

Media blocks support `"controls": "minimal"` for a clean reading view. Icons appear on hover or keyboard focus, and stay visible on touch devices. Advanced tools remain available in the settings popover. The default `"full"` presentation keeps all controls visible. A gallery can set this option once for its children, with per-item overrides.

```json
{"src":"assets/settings.svg","alt":"Workspace settings","controls":"minimal"}
```

Minimal GIF readers autoplay, unless `autoplay: false`, reduced-motion preferences, or a link to a specific frame prevents it. Full GIF readers can opt in with `autoplay: true`. Playback suspends outside the viewport or when the page is hidden. Enlargement stays inside the browser window, with window controls available; the reduce icon or Escape returns to the article. CyDoc does not invoke the native Fullscreen API.

Page changes retain the menu scroll, open navigation groups, reading position, selected code tabs, and code scroll for each visited page during the viewer session. Explicit section and media links take priority over saved positions.

Media limitations:

- Video playback uses browser decoders. Supply appropriate `sources` and `compareSources` variants for your devices. CyDoc does not transcode video.
- Video stepping advances by `1 / fps` seconds, with `fps` defaulting to 30. Browser seeking and variable frame rates do not guarantee encoded-frame accuracy.
- The mesh module requires WebGL 2 and uses the optional MIT-licensed Three.js peer. Draco/KTX2 decoders are not bundled. Labels are not occlusion-tested or tracked semantically between scenes. Comparison models should share a coordinate system and scale.
- The optional GIF raster decoder supports palettes, transparency, interlacing, and disposal methods 0–3. Its default decoded memory budget is 64 MiB per file, configurable with `maxDecodedMiB` up to 256 MiB.
- The graph module imports JSON and a common subset of Unreal Blueprint clipboard text. It does not execute graphs, edit them, parse `.uasset` files, or interpret every Unreal/plugin metadata field. No BlueprintUE service is used.

## Writing documentation

```text
docs/fr/*.md       French pages
docs/en/*.md       English pages
assets/           Local images, videos, GIFs, and meshes
examples/         Annotated source and integration examples
src/index.ts      DOM-free core
src/viewer.ts     Framework-independent reader
tools/            Markdown compilation, API imports, extraction, and export
```

Each Markdown page starts with simple, single-line metadata:

```markdown
---
id: settings
title: Application settings
description: Configure your workspace.
section: Guides
order: 10
---

## Export settings {#export}

[Installation](doc:quickstart#installation)

![Workspace settings](assets/settings.svg)
```

Translated pages share the same `id`. Explicit section anchors keep contextual links stable across languages. The metadata format does not support advanced YAML.

To nest a page below another page in the sidebar, add `parent: settings` to its metadata, using the parent's stable page ID. Parents may themselves have parents. Missing parents and cycles fail validation. Keep parent IDs consistent across translations. Pages without a parent can use a section path such as `section: Guides / Workspace` to create nested folders. Optional API references group documented functions, includes and modules without displaying source listings. This navigation hierarchy does not change page URLs or depend on Markdown filenames.

The header searches documentation terms, code and symbols while typing. Results support content/language filters, arrow keys and Enter; Ctrl+K opens the search dialog. Escape or a click outside closes the search popover. Navigation branches retain their open state and scroll position between pages.

Navigation entries and reader tabs show fast tooltips with their complete label and optional description, on hover or keyboard focus. Page tooltips use the page's `title` and `description`; folder tooltips show the complete folder path. Tooltips float outside the scrolling menu, wrap long names, and close with Escape. Code-tab and gallery items can provide a plain-text `description` for their tooltip.

Media blocks accept JSON, for example:

````markdown
```image
{"id":"workspace","src":"assets/settings.svg","compare":"assets/settings-b.svg","alt":"Workspace settings"}
```
````

Rich blocks use `tabs`, `steps`, `callout`, `details`, `glossary`, or `diff`. See the **Rich content** page in the generated demo and `docs/en/rich-content.md` for complete examples.

Raw HTML is escaped. Script links and remote media are rejected. Media must remain inside `assets/`; distribute assets from trusted authors.

## Precise contextual links

```ts
const url = createLink({
  locale: 'en',
  pageId: 'video-viewer',
  state: { media: 'intro', time: '1.25', note: 'step-1' }
}, './Documentation/Documentation.html');
```

The state query is inside the URL fragment. Set an explicit media `id` to keep links stable when rearranging a page. A reader's link icon copies its current view.

| Target | State fields |
| --- | --- |
| Image | `zoom`, `x`, `y`, `note` |
| Video | `time`, `note` |
| GIF | `frame`, `zoom`, `x`, `y` |
| Mesh | `camera`, `target`, `scene`, `wire`, `environment`, `note` |
| Graph | `node`, `zoom`, `x`, `y` |
| Comparison | `wipe` |
| Gallery | `item`, plus the active reader's state |

Camera vectors contain three comma-separated numbers. Source lines use `L1`, `L2`, and so on in the first code block, then `code-2-L1` in the second block. Reader-created annotations remain private: their identifiers only resolve on devices where those annotations exist.

## Source extraction and API imports

Add explicit Markdown documentation to source comments:

```ts
/**
 * @doc settings
 * @locale en
 * @title Application settings
 * @section API
 * @symbol configureSettings
 * Describe the feature in Markdown.
 *
 * ## Parameters {#parameters}
 * Explain the inputs here.
 */
```

Python triple-quoted docstrings accept the same tags. Declare source directories in `sources` in `cydoc.config.json`.

Enable an API index to generate documented-symbol references and resolvable includes/imports/modules without full source listings:

```json
{
  "sources": ["examples"],
  "apiIndex": {
    "enabled": true,
    "includeDirs": ["examples/cpp/include", "examples/shaders"]
  }
}
```

This index is lexical. It recognizes common includes, imports, modules, and namespaces without compiler semantics. It does not expand macros, evaluate conditional compilation, infer overloads/types, or fully resolve packages. C# XML comments are not converted. Annotation markers inside string literals can be mistaken for comments.

Structured API imports run at build time:

```json
{
  "apiImports": [
    { "format": "doxygen", "path": "generated/xml", "prefix": "cpp-api" },
    { "format": "typedoc", "path": "generated/typedoc.json", "prefix": "ts-api" }
  ]
}
```

Adapters consume common [Doxygen XML](https://www.doxygen.nl/manual/output.html) and [TypeDoc JSON](https://typedoc.org/documents/Options.Output.html) declarations, including signatures, parameters, returns, inheritance, references, and API file links. Doxygen and TypeDoc are not included in the reader.

The neutral `cydoc` format lets other producers supply the same information for additional languages. Its illustrative schema and generation configurations are in `examples/api/README.md`. Demo snapshots are small interchange examples maintained alongside their source; adapters do not cover all plugin-specific metadata.

## Versions, translations, and linked manuals

Declare local versions:

```json
{
  "version": "2.0",
  "versions": [
    { "id": "1.0", "label": "1.0", "base": "../v1/Documentation.html" },
    { "id": "2.0", "label": "2.0", "base": "./Documentation.html" }
  ],
  "aliases": { "old-page": "new-page#section" }
}
```

The current version's `id` matches `version`. Switching versions preserves the locale, page, section, and media state. Each version is a separate local export. Aliases preserve renamed page addresses; cycles and missing destinations fail the build.

The repository includes two small **Demo v1 / Demo v2** manuals to demonstrate switching and translation freshness. They are not historical CyDoc releases. Optional `versionBuilds` entries build child projects and copy their exports into controlled subdirectories of `DocData/`. For a destination `versions/v1`, use `DocData/versions/v1/Documentation.html` as the version base.

English is the required source/default language and French is mandatory. The build fails before publishing when either has a missing, empty or explicitly outdated page. Additional incomplete languages are withheld. Older/custom manifests show only complete languages; one complete language has no selector. Complete titles, prose, descriptions and media explanations before publishing a second language. Coverage and revision checks cannot judge translation quality.

`DocData/translation-report.json` is build metadata and never a reader page. The former `translationReport` option no longer adds a page. Put `revision` on originals and `sourceRevision` on translations to track freshness. Keep AI instructions in `DocAI.md`, and keep audits, build instructions and verification histories outside the human manual. Existing internal Markdown can use `audience: internal` or `audience: ai`; it is excluded from the export's pages and search, with old page IDs redirected to the manual's home.

Link to another manual with `[Export](doc://editor/settings#export)` and a host-owned catalog:

```json
{
  "linkedDocs": {
    "editor": {
      "base": "../editor/Documentation/Documentation.html",
      "manifest": "../editor/Documentation/DocData/manifest.json"
    }
  }
}
```

The optional manifest validates destination pages and sections during generation. A catalog entry can fix `locale`; otherwise the current locale is retained. The application must distribute the other manual at its declared path. The core also provides `createDocumentationRegistry()` for programmatic cross-manual links.

## Personal reading tools

The **My space** icon in the header stores bookmarks, recent pages, and private notes on the device, with a JSON export for backup. **Resume reading** returns to a saved page position. Explicit section and media links retain priority.

Storage availability depends on the browser or WebView, particularly for file origins. The UI reports when notes cannot be persisted and offers export. `storageId` gives the host control over the data namespace. No feedback or personal notes are sent to a server.

## Native integration examples

`examples/integrations/` contains:

- A header-only C++17 link helper and a Qt 6 Widgets F1 example for Windows, Linux, and macOS.
- A Python/Tk F1 example using platform file URLs.
- A Windows C#/WinForms component.
- A Java/Swing F1 example.
- A Swift/AppKit help controller.
- An Android Kotlin/WebView Activity and manifest fragment.
- A JavaScript F1 binding with a host-provided opening callback.

Copy the generated reader into your application's `Documentation/` directory. Android's example opens `file:///android_asset/Documentation/Documentation.html` directly, without a web server or Internet permission. Native frameworks remain dependencies of the host application. The examples are included in the npm archive; Qt, AppKit, and Android interfaces still require target-device validation.

## Build another project's manual

From a built or locally installed package:

```sh
cydoc build path/to/cydoc.config.json
cydoc check path/to/cydoc.config.json
```

Both commands build and validate the export. Paths are relative to the configuration file; `out` must be a project subdirectory. Each declared locale needs a directory in `content`, and the asset directory must exist. Source directories and optional modules are configurable.

`homePage` selects the initial page. The repository's `landingPage: true` enables the CyDoc demo landing page; omit it for your own manual. A custom JavaScript embedding can provide trusted `renderHome(locale)` HTML.

Generated data and disabled module scripts are updated during a build. Old copied media assets are not automatically removed; use a fresh output directory for a clean application distribution.

## Assistant integration reference

The reader is designed for people using the host application. Every export places assistant guidance in a separate `DocAI.md` sidecar, outside the manual's navigation and search. For integration tooling, [ai/README.md](ai/README.md) indexes the packaged [integration guide](ai/INTEGRATION.md), [authoring guide](ai/AUTHORING.md), and [API reference](ai/API.md). [AGENTS.md](AGENTS.md) covers changes to CyDoc itself.

## Compatibility and limits

- The reader targets modern browsers and WebViews. Validate native integrations, codecs, storage, and WebGL support on your target devices.
- All pages currently load together. Very large documentation sets will need segmented content and search indexes.
- Additional content locales are supported by the schema; the current UI is translated into French and English. RTL layout is not implemented.
- `marked`, `prismjs`, and `esbuild` are generation dependencies. Syntax highlighting is compiled into the exported pages rather than shipped as a reader runtime.
- The optional `three` peer is only needed for mesh integration. Installing CyDoc without the mesh module does not require it.

## License

[MIT](LICENSE). Third-party dependency licenses remain with their respective authors. Mesh exports include the Three.js license notice.
