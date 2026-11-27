# Authoring documentation with CyDoc

Use Markdown as the source and the CyDoc compiler as the producer of reader HTML. Content examples here use fictional application data. Paths in media blocks always start with `assets/`, even when the configured source asset directory has another name.

## Pages and translations

Write English originals first. Save this page as `.CyDocBuild/manual/en/overview.md` for the [integration configuration](INTEGRATION.md#build-the-applications-manual):

```markdown
---
id: overview
title: Example App
description: Get started with Example App.
section: Guides
order: 0
revision: 1
---

## Getting started {#getting-started}

Open the application and choose a workspace.

[Return to this section](doc:overview#getting-started).
```

The full French translation is required. Save it as `.CyDocBuild/manual/fr/overview.md`:

```markdown
---
id: overview
title: Example App
description: Premiers pas avec Example App.
section: Guides
order: 0
sourceRevision: 1
---

## Premiers pas {#getting-started}

Ouvrez l’application et choisissez un espace de travail.

[Revenir à cette section](doc:overview#getting-started).
```

Metadata supports simple single-line values, not full YAML. Each page needs `id`, `title` and `section`; provide `description` and numeric `order` for useful navigation. The content directory determines the locale. Do not add a second handwritten page with the same ID/locale as an extracted or imported page.

Organize the manual as a tree. Add `parent: overview` to a child page's metadata, using an existing page ID rather than a file path or title. A parent may have its own parent; missing targets, self references and cycles fail validation. Keep parent IDs consistent across translations. Root pages can use section paths such as `section: Guides / Workspace`. The hierarchy changes navigation, not routes: a child still uses `doc:child-id#section`. Group optional API references by their public functions, includes and modules.

The reader's header searches prose, code and symbols with live results and content/language filters. Ctrl+K opens the search dialog. Results show the page's section path, a readable excerpt and, when available, the matching heading as a direct destination. The compiler indexes section-body offsets without duplicating their text; keep useful descriptions and explicit anchors so these destinations remain understandable and stable. Matches are highlighted safely, including accent-insensitive and typo-tolerant matches. Clear filters to widen a search or clear the query to return to starting pages. The current filters stay with the mounted reader while navigating; no search history is stored.

The navigation tooltip uses the complete page `title`, followed by its optional `description`. Write short, useful descriptions; no separate tooltip configuration is needed. Folder tooltips include their full navigation path. Code-tab items and gallery items may each add a plain-text `description`, displayed beneath their complete label when hovered or focused. These descriptions are text, not Markdown or HTML.

English is the source/default language; French is mandatory. Translate titles, descriptions, prose, captions, annotations and media explanations while preserving the page ID and explicit anchor IDs. Code and API identifiers keep their proper spelling. Missing/empty English or French pages, or explicitly outdated translation revisions, stop the build. Additional incomplete languages are withheld. Do not duplicate original-language paragraphs under another locale, add placeholders, or offer mixed-language fallback pages. Coverage checks do not judge translation quality; review the actual prose before publishing.

Update `revision` when the original meaning changes, and update `sourceRevision` only when the translation has caught up. Without an original revision, the build uses a content fingerprint. `DocData/translation-report.json` is build metadata; it has no reader page, navigation item or search result. The legacy `translationReport` setting does not restore a report page.

Keep human content focused on using the application. AI instructions belong in the separate `DocAI.md` sidecar; build instructions, audit logs, migration inventories and verification history belong outside the human manual. Existing Markdown can set `audience: internal` or `audience: ai` to be excluded from pages and search. Its old page ID redirects to the manual's home unless an explicit alias overrides it. The default audience is `user`; other values fail validation. Files named `DocAI.md` in content directories are ignored.

Organize human pages around their purpose. An overview explains the product and links to useful starting points. A tutorial states its goal and prerequisites, gives a small sequence of actions, and describes the visible result after each step. A practical guide covers one task. A troubleshooting page starts from a symptom, supplies a check and a remedy, and explains how to recognize success. Use the existing `steps`, `callout` and `details` blocks for these structures; these are editorial patterns, not new manifest content kinds. The checkout's bilingual `quickstart.md` and `troubleshooting.md` pages are maintained examples. Keep the application's own subject matter and existing IDs when applying their structure.

Use flat frontmatter `previous: quickstart` and `next: media#images` to choose a learning path instead of global page order. Destinations must exist; the build validates their anchors and aliases. An omitted direction keeps the default adjacent page; an explicitly empty value hides it at a path endpoint. Set the same IDs in both translations. A parent controls the breadcrumb and tree, independently of this reading sequence. Illustrated explanations remain searchable as guides by default; standalone media keep their media kind. Use an explicit `kind: guide`, `kind: media` or `kind: api` when the page's role needs a deliberate override.

## Links are part of the application contract

- Same manual: `[Start](doc:overview#getting-started)`.
- A media view: `[At 1.25 seconds](doc:walkthrough?media=intro&time=1.25)` requires a page `walkthrough` and a media block with `"id": "intro"`.
- Another manual: `[Settings](doc://editor/settings#export)` requires a host `linkedDocs.editor` catalog entry. An optional destination manifest validates page and section IDs.
- Renamed page: add `"aliases": { "old-page": "new-page#section" }` in the build configuration. The destination must exist. Aliases cannot shadow real page IDs or form cycles.

Use `createLink` for programmatic addresses. Its state query belongs inside the fragment, e.g. `Documentation.html#/en/walkthrough?media=intro&time=1.25`. Do not move media state before `#`, use history-path routing, or derive public IDs from translated headings. Code line anchors are `L1` in the first code block and `code-2-L1` in the second; confirm generated IDs before linking.

## Code examples and rich blocks

Use fenced code with `cpp`, `python`, `hlsl`, `glsl`, `csharp`, `c`, `javascript`, `java` or `typescript`. Highlighting happens at build time. Language highlighting is separate from source extraction and semantic analysis.

CyDoc rich fences contain **JSON**, not Mermaid syntax or arbitrary JavaScript:

````markdown
```tabs
{"items":[{"label":"C++","description":"Minimal C++ help call.","lang":"cpp","code":"open_help();"},{"label":"Python","lang":"python","code":"open_help()"}]}
```

```callout
{"type":"tip","title":"Contextual help","body":"Use a stable [page link](doc:overview#getting-started)."}
```

```steps
{"items":[{"title":"Build","body":"Generate the manual.","result":"The entry HTML and its DocData folder are present.","troubleshooting":"Read the exact build error and check the [guide](doc:troubleshooting)."},{"title":"Ship","body":"Copy its complete output directory."}]}
```

```details
{"title":"More information","body":"Additional Markdown goes here."}
```

```diff
{"lang":"cpp","before":"open_help();","after":"open_help(\"overview\");"}
```
````

Steps retain the existing `title` and Markdown `body` fields. Optional Markdown `result` appears under a localized **Expected result** label; optional Markdown `troubleshooting` appears in a collapsed **If this step fails** section. Blank optional fields are omitted. Links, assets and code inside these fields use the same compiler and validation as other Markdown. Translate both fields with the page. Existing blocks without them keep their action-only presentation.

Studio's **Insert a block → steps** provides title/action fields, optional result/troubleshooting fields and add/remove/reorder controls for 1–50 steps. Insertion requires nonempty titles and actions. Advanced JSON remains editable, including extension properties; reordering moves entire items without changing authored identifiers. The form does not render Markdown: use the page's real reader preview after insertion. Existing blocks remain editable as JSON in the editor.

Glossary blocks use `{"items":[{"term":"PBR","definition":"Physically based rendering."}]}`. A `[[PBR]]` inline tooltip needs a `glossary` entry for the current locale in the build configuration. Raw HTML is escaped; do not inject `<script>` tags or rely on handwritten embedded HTML.

## Media modules and examples

Enable the required modules in build configuration. A media fence is a JSON object; `id` is a stable identifier for precise links. Put the referenced files in the source assets directory first. These placeholder names require real application assets.

````markdown
```image
{"id":"settings-image","src":"assets/settings.svg","alt":"Workspace settings","controls":"minimal"}
```

```video
{"id":"intro","src":"assets/intro.webm","title":"Walkthrough","controls":"minimal","fps":30,"sources":[{"src":"assets/intro.webm","type":"video/webm"},{"src":"assets/intro.mp4","type":"video/mp4"}],"annotations":[{"id":"first-step","time":1.25,"text":"Choose a workspace"}]}
```

```gif
{"id":"steps","src":"assets/steps.gif","title":"Animated steps","controls":"minimal","autoplay":true}
```

```mesh
{"id":"model","src":"assets/model.glb","title":"PBR model","controls":"minimal"}
```

```gallery
{"id":"screenshots","controls":"minimal","items":[{"type":"image","src":"assets/settings.svg","alt":"Settings"},{"type":"video","src":"assets/intro.webm","title":"Walkthrough"}]}
```
````

Common options:

| Option | Behavior |
| --- | --- |
| `controls: "full"` | Default presentation with visible authoring controls |
| `controls: "minimal"` | Controls on hover/focus, advanced tools in settings, touch controls visible |
| `compare: "assets/second-file.ext"` | Synchronized A/B comparison for image, video, mesh or GIF |
| `labels: ["Before", "After"]` | Image comparison captions |
| `autoplay` | GIF option; defaults to true in minimal mode, false in full mode |
| `maxDecodedMiB` | GIF decoded memory budget; default 64 MiB per file, capped at 256 MiB |

Gallery items inherit `controls` and can override it individually. Enable `gallery` and every child module. Only the active reader is mounted. GIF autoplay respects reduced-motion preferences, pauses offscreen/when hidden, and stays paused when a precise link targets a frame. A GIF used as an `image` uses native animation instead of the optional frame decoder.

Enlargement stays inside the documentation window; Escape reduces it. Avoid native fullscreen APIs. Video playback uses browser codecs; supply compatible variants and do not promise that changing a filename transcodes a file. Mesh needs WebGL 2; GLB is a convenient self-contained format, while glTF dependencies must also be local and packaged. No Draco/KTX2 decoder is bundled.

Media paths must remain under `assets/`, without parent traversal or remote URLs. State links to reader-created annotations only resolve where those annotations exist. Ship stable built-in annotations when links must work on every device.

## Static diagrams and interactive graphs

Static diagrams are compiled into accessible SVG and need no media module. Supported types include `flow`, `decision`, `sequence`, `class`, `dependency` and `architecture`; their schemas differ. This is a small flow example:

Add an optional plain-text `description` to explain the diagram's purpose. The compiler also supplies a collapsible text alternative naming its elements and connections (or sequence messages, including replies), in the page's language. The stock reader adds **Enlarge diagram**, with an in-window dialog, Escape/Close dismissal and focus restoration. SVG IDs and links are retained while expanded. Linear `Source -> Build` diagrams keep their short accessible label and can also be enlarged.

Keep element and participant labels concise. They wrap within the shape (up to 500 characters); Studio's guided fields use shorter limits and its automatic placement accounts for the resulting shape height. Hand-authored coordinates remain yours to adjust when a label changes size.

Studio's **Insert a block → diagram** offers guided Flow, Decision and Sequence models with editable labels, connections, a description, automatic placement and a preview from the same SVG renderer. Advanced JSON remains available for custom properties and other supported diagram types. Changing labels and arranging a model keep element IDs; deleting an element also removes its connections. This is an authoring form, not an interactive graph editor or Mermaid interpreter.

The optional graph reader defaults to reading mode: ordinary wheel and vertical touch input can scroll the manual. **Explore graph** enables canvas drag, wheel zoom, arrow-key panning (Shift for larger moves), +/− zoom and Home fit. Escape leaves exploration before an enlarged viewer is reduced. Ctrl/Command wheel and keyboard shortcuts remain available to the browser. **Text view: nodes and connections** provides a lazily rendered, searchable list of descriptions, ports, outgoing relationships and safe documentation links. **Show** centers/selects the node and focuses it on the canvas. Existing media state keys (`node`, `zoom`, `x`, `y`) and node/port IDs are unchanged.

````markdown
```diagram
{"type":"flow","title":"Open help","nodes":[{"id":"app","label":"Application","x":0,"y":0},{"id":"doc","label":"Local manual","x":240,"y":0}],"edges":[{"from":"app","to":"doc","label":"Help"}]}
```
````

The optional `graph` module renders interactive nodes and typed ports:

````markdown
```graph
{"id":"help-flow","nodes":[{"id":"open","title":"Open help","x":0,"y":0,"outputs":[{"id":"exec","label":"Next","type":"exec"}]},{"id":"page","title":"Read overview","x":320,"y":0,"inputs":[{"id":"exec","label":"In","type":"exec"}],"link":"doc:overview#getting-started"}],"links":[{"from":["open","exec"],"to":["page","exec"]}]}
```
````

Unreal clipboard text can use a `blueprint` fence and the `graph` module. It is an importer for a common subset, not a Blueprint editor or executor. In a checkout, `docs/en/diagrams.md` and `docs/en/blueprints.md` contain larger examples.

## Extract documentation from source

Add explicit annotations in a block comment in a scanned source directory:

```cpp
/**
 * @doc workspace-api
 * @locale en
 * @title Workspace API
 * @section API
 * @symbol openWorkspace
 * Open a workspace from the application.
 *
 * ## Parameters {#parameters}
 * Describe the supported inputs here.
 */
void openWorkspace();

/**
 * @doc workspace-api
 * @locale fr
 * @title API de l’espace de travail
 * @section API
 * @symbol openWorkspace
 * Ouvrez un espace de travail depuis l’application.
 *
 * ## Paramètres {#parameters}
 * Décrivez les paramètres pris en charge ici.
 */
```

Python uses a triple-quoted docstring with the same tags. Required tags are `@doc`, `@locale` and `@title`; `@section`, `@order` and `@symbol` are optional. The remainder is Markdown. Use separate annotated blocks with the same page ID and different locales for translations.

Configure the source scan:

```json
{
  "sources": ["../src"],
  "apiIndex": { "enabled": true, "includeDirs": ["../src/include"] }
}
```

`apiIndex` generates API file references with documented symbols and lexical include/import/module links. It never publishes full source listings or implementation bodies. The former `sourceIndex` setting is accepted as an alias for this API-only index; it does not restore source browsing. The requested C++, Python, HLSL, GLSL, C#, C, JavaScript, Java and TypeScript languages are supported. This is not a compiler: signatures, overloads, conditional compilation and macros are not inferred; C# XML documentation is not converted. Only explicitly authored examples and public API signatures belong in the manual. Do not copy source trees into its assets.

For structured declarations, generate Doxygen XML or TypeDoc JSON externally and configure `apiImports` with `format: "doxygen"` or `format: "typedoc"`, a `path` and a `prefix`. Other producers can use the neutral `cydoc` format. See [the packaged API examples](../examples/api/README.md) for its fields. These tools run during generation, never inside the reader.

API imports use only their declared adapter `locale`, defaulting to English. Provide separate translated inputs with `locale: fr` and the same prefix/keys, or author matching French pages. Importing English descriptions does not translate them or duplicate them into French. The [API import examples](../examples/api/README.md) include English originals and French counterparts.

## Validate the result

Run the local CLI build/check against `.CyDocBuild/cydoc.config.json`. It validates pages, aliases, local links, explicit anchors, media IDs, assets, and complete English/French publication. Inspect each enabled reader, both languages, tree navigation and contextual links through `file://` when possible. Do not hand-edit generated `data.js`, `manifest.json` or reader bundles to repair an authoring error; fix the source and regenerate.
