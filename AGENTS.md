# Working on CyDoc

These instructions apply to the CyDoc checkout. To use CyDoc in another application, start with [ai/README.md](ai/README.md); keep that application's own agent instructions. Do not replace its `AGENTS.md` with this file.

## Read first

- [README.md](README.md): project status, build commands and supported features.
- [ai/INTEGRATION.md](ai/INTEGRATION.md): package consumption, offline exports and native help links.
- [ai/AUTHORING.md](ai/AUTHORING.md): Markdown, translations, media and source extraction.
- [ai/API.md](ai/API.md): exported functions, types and module lifecycle.

## Architecture and constraints

- Reading must work through `file://` without a web server. `npm run dev` is a build watcher. Keep the generated classic-script bootstrap and local binary asset provider working.
- Exports open through `Documentation.html`; scripts, media, manifests, notices and version exports belong under `DocData/`. Keep authored `assets/` paths logical and use the reader's asset URL resolver for display. Preserve legacy entry redirects when migrating an existing export.
- Keep `src/index.ts` and its core dependencies independent of the DOM and media engines. Media modules are optional and loaded on demand. Only the mesh module needs Three.js.
- The viewer owns the URL fragment and uses a global CSS reset. Embeddings use a dedicated page or iframe.
- Generate and package assets locally. Do not introduce runtime CDNs, remote fonts, telemetry, network-dependent search, or `fetch()` for local manifests and binary media.
- Enlargement stays inside the documentation window. Do not introduce native browser/OS fullscreen. Keep Escape, keyboard controls, touch access, reading positions and navigation scroll working.
- Keep page IDs, explicit anchors, media IDs and annotation IDs stable. Translations share page IDs and explicit anchors. Preserve existing deep links or add validated aliases.
- UI text needs French and English equivalents. Additional content locales are supported; additional UI translations and RTL are not yet implemented.
- Use an application's existing local logo through the optional configuration/manifest `logo` field. If it has none, omit the field and preserve the default book icon and loading-error fallback. Keep integration guidance explicit about this choice.
- Preserve MIT licensing and dependency notices. Do not claim native, codec or WebGL compatibility without testing the target.

## Edit the source

| Location | Responsibility |
| --- | --- |
| `src/index.ts`, `src/types.ts` | DOM-free routing, registry, search and public contracts |
| `src/viewer.ts`, `src/reader-tools.ts`, `src/reading-view.ts` | Reader, personal tools and reading position |
| `src/viewer.css`, `src/themes.ts`, `src/icons.ts`, `src/tooltips.ts` | Shared appearance, themes and tooltips |
| `src/modules/` | Optional readers and their shared controls |
| `tools/` | Compilation, imports, extraction and local export |
| `web/` | Local entry point and generated-reader bootstrap |
| `docs/fr/`, `docs/en/`, `assets/` | Demo content and original sample media |
| `examples/`, `tests/` | Integration examples and automated checks |
| `ai/`, `llms.txt` | Guidance shipped to agents consuming the library |

Edit these inputs, then build. `dist/` and example `.output/` directories are generated; do not hand-edit or commit them. Do not run demo-generation scripts merely to edit one page: they can overwrite maintained examples.

## Validate changes

Use Node.js 22 or later. Run `npm ci` when dependencies are missing, then `npm test` for code changes; it builds the library and runs the suite. `npm run check` checks types without emitting files; `npm run size` measures the generated bundles.

For documentation-only edits, check relative links, examples and packaged files. If examples or configuration change, build a separate consumer manual with the CLI. Both `cydoc build` and `cydoc check` write an export. Use a temporary project subdirectory for fixtures.

The Happy DOM tests are component fixtures, not a browser rendering or native-device compatibility check. Report which checks actually ran and any remaining limits. Preserve unrelated user changes. Add tests when they verify a meaningful behavior or regression.

## Keep agent guidance accurate

Update `ai/` when changing public APIs, supported configuration, media options or integration constraints. Keep its links usable in the npm archive, whose `files` allowlist is in `package.json`. Do not advertise commands, adapters, codecs or source parsers that the implementation does not provide.
