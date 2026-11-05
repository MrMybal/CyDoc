# Authoring documentation with CyDoc

Use Markdown as the source and the CyDoc compiler as the producer of reader HTML. Content examples here use fictional application data. Paths in media blocks always start with `assets/`, even when the configured source asset directory has another name.

## Pages and translations

Save this page as `manual/en/overview.md` for the [integration configuration](INTEGRATION.md#build-the-applications-manual):

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

Save its translation as `manual/fr/overview.md`:

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

Translate titles and prose while preserving the page ID and explicit anchor IDs. A missing translation falls back to the default content locale. Set `translationReport: true` to add a report page; every build writes `translation-report.json`. Update `revision` when the original meaning changes, and update `sourceRevision` only when the translation has caught up. Without an original revision, the build uses a content fingerprint.

## Links are part of the application contract

- Same manual: `[Start](doc:overview#getting-started)`.
- A media view: `[At 1.25 seconds](doc:walkthrough?media=intro&time=1.25)` requires a page `walkthrough` and a media block with `"id": "intro"`.
- Another manual: `[Settings](doc://editor/settings#export)` requires a host `linkedDocs.editor` catalog entry. An optional destination manifest validates page and section IDs.
- Renamed page: add `"aliases": { "old-page": "new-page#section" }` in the build configuration. The destination must exist. Aliases cannot shadow real page IDs or form cycles.

Use `createLink` for programmatic addresses. Its state query belongs inside the fragment, e.g. `index.html#/en/walkthrough?media=intro&time=1.25`. Do not move media state before `#`, use history-path routing, or derive public IDs from translated headings. Code line anchors are `L1` in the first code block and `code-2-L1` in the second; confirm generated IDs before linking.

## Code examples and rich blocks

Use fenced code with `cpp`, `python`, `hlsl`, `glsl`, `csharp`, `c`, `javascript`, `java` or `typescript`. Highlighting happens at build time. Language highlighting is separate from source extraction and semantic analysis.

CyDoc rich fences contain **JSON**, not Mermaid syntax or arbitrary JavaScript:

````markdown
```tabs
{"items":[{"label":"C++","lang":"cpp","code":"open_help();"},{"label":"Python","lang":"python","code":"open_help()"}]}
```

```callout
{"type":"tip","title":"Contextual help","body":"Use a stable [page link](doc:overview#getting-started)."}
```

```steps
{"items":[{"title":"Build","body":"Generate the manual."},{"title":"Ship","body":"Copy its complete output directory."}]}
```

```details
{"title":"More information","body":"Additional Markdown goes here."}
```

```diff
{"lang":"cpp","before":"open_help();","after":"open_help(\"overview\");"}
```
````

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
```

Python uses a triple-quoted docstring with the same tags. Required tags are `@doc`, `@locale` and `@title`; `@section`, `@order` and `@symbol` are optional. The remainder is Markdown. Use separate annotated blocks with the same page ID and different locales for translations.

Configure the source scan:

```json
{
  "sources": ["src"],
  "sourceIndex": { "enabled": true, "includeDirs": ["src/include"] }
}
```

`sourceIndex` generates file pages and lexical include/import/module links. The requested C++, Python, HLSL, GLSL, C#, C, JavaScript, Java and TypeScript languages are supported. This is not a compiler: signatures, overloads, conditional compilation and macros are not inferred; C# XML documentation is not converted. Scan only directories whose source can be distributed with the manual, because a source index includes file contents.

For structured declarations, generate Doxygen XML or TypeDoc JSON externally and configure `apiImports` with `format: "doxygen"` or `format: "typedoc"`, a `path` and a `prefix`. Other producers can use the neutral `cydoc` format. See [the packaged API examples](../examples/api/README.md) for its fields. These tools run during generation, never inside the reader.

## Validate the result

Run the local CLI build/check against the application's configuration. It validates pages, aliases, local links, explicit anchors, media IDs and asset files. Inspect each enabled reader, language fallback and contextual link through `file://` when possible. Do not hand-edit generated `data.js`, `manifest.json` or reader bundles to repair an authoring error; fix the source and regenerate.
