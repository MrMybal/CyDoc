# CyDoc API reference for agents

This is a compact reference for the current implementation. Public declarations are shipped in `dist/`; prefer them when working with another installed version. Imports below are package imports for Node.js/build tools or application source handled by a bundler. The generated offline reader uses its own classic-script bootstrap.

## Package entry points

| Import | Purpose |
| --- | --- |
| `cydoc` | DOM-free core functions and exported TypeScript types |
| `cydoc/viewer` | `mountViewer` |
| `cydoc/viewer.css` | Reader stylesheet with a global CSS reset |
| `cydoc/modules/image` | Default `MediaModule` export |
| `cydoc/modules/video` | Default `MediaModule` export |
| `cydoc/modules/mesh` | Default `MediaModule` export; optional Three.js peer |
| `cydoc/modules/gallery` | Default `MediaModule` export; host supplies child loaders |
| `cydoc/modules/graph` | Default `MediaModule` export |
| `cydoc/modules/gif` | Default `MediaModule` export; host supplies local packed bytes |
| `cydoc/compiler` | Build-time `compileMarkdown`, `readFrontmatter` |
| `cydoc/extract` | Build-time `extractComments` |
| `cydoc/api-import` | Build-time `importApi` |

Use the `cydoc build` / `cydoc check` CLI for complete manual generation. The compiler and importer entry points are Node.js generation tools, not browser runtimes. Do not invent an exported `cydoc/build` entry point or import repository-private files through package paths.

## Core routes and documentation

```typescript
import {
  createDocumentation, createDocumentationRegistry,
  createLink, parseLink, hasAnchor, normalize
} from 'cydoc';
import type { Documentation, DocRoute } from 'cydoc';

const route: DocRoute = {
  locale: 'en', pageId: 'overview', anchor: 'getting-started'
};
const url = createLink(route, './Documentation/Documentation.html');
// ./Documentation/Documentation.html#/en/overview/getting-started
const parsed = parseLink(url.slice(url.indexOf('#')), 'en', 'overview');
```

`DocRoute` contains `locale`, `pageId`, optional `anchor` and optional `state: Record<string, string>`. `createLink(route, base = '')` encodes the route, replaces any existing base fragment and sorts state keys. `parseLink` expects the **fragment**, not a complete URL; optional defaults are locale `fr` and page `overview`.

Given a compiler-generated `manifest: Documentation`:

```typescript
export function findHelp(manifest: Documentation) {
  const docs = createDocumentation(manifest);
  const resolved = docs.resolve('overview', 'fr');
  const pages = docs.pages('en');
  const results = docs.search('workspace', 'en', 12, {
    language: 'cpp', kind: 'api', fuzzy: true
  });
  const canonical = docs.canonicalRoute({ locale: 'en', pageId: 'old-page' });
  return { resolved, pages, results, canonical };
}
```

`resolve` returns `{ page, requestedLocale, fallback }` or `undefined`. `pages` returns one resolved page per ID in navigation order. `search` returns `{ page, score, excerpt, anchor?, section?, matchedTerms? }[]`; its fourth argument supports `language`, `kind` and `fuzzy`. Content kinds are `guide`, `api`, `source` and `media`. `canonicalRoute` applies configured aliases. `docs.link` is the same link constructor as `createLink`, not a page-validation operation.

The compiler emits optional `DocPage.searchSections: SearchSection[]`, where each `{ anchor, start, end }` contains UTF-16 offsets into `page.text` for the body after that heading, up to the next heading. Section text is not duplicated in the manifest. The core ignores invalid offsets and unknown heading anchors. Matching a section supplies its heading ID as `anchor` and its displayed title as `section`; a query matching all terms in the page title keeps the page-level destination. Older manifests still support heading-title targets without section-body indexing. Legacy `source` results retain their matching line targets. `matchedTerms` contains normalized literal or typo-tolerant matches for optional presentation; escape all authored text before highlighting it. Excerpts retain original accents and Unicode characters. Search remains synchronous, local and independent of the DOM.

`docs.availableLocales()` returns the declared locales containing every nonempty page, without explicitly outdated `sourceRevision` values. The reader offers only these locales and requires a complete default locale; unavailable locale routes are normalized to that default while preserving their page, anchor and media state. A single available locale has no selector. The low-level `resolve` fallback remains available for tooling inspecting draft manifests; it does not publish a partial language in the reader. The CLI removes withheld locales and their pages from its manifest. These structural checks do not verify the language or quality of a translation.

`hasAnchor(page, id)` checks heading IDs and additional compiled anchors. `normalize(text)` strips diacritics, lowercases and trims text for search.

The minimum manifest shape is:

```json
{
  "schemaVersion": 1,
  "name": "Example App",
  "version": "1.0.0",
  "defaultLocale": "en",
  "locales": [{ "code": "en", "label": "English" }],
  "pages": [{
    "id": "overview", "locale": "en", "title": "Overview",
    "description": "Example help.", "section": "Guides", "order": 0,
    "html": "<h2 id=\"getting-started\">Getting started</h2>",
    "text": "Getting started",
    "headings": [{ "id": "getting-started", "text": "Getting started", "level": 2 }]
  }]
}
```

Generate real manifests rather than maintaining compiled HTML by hand. `createDocumentation` validates the schema version, declared locales, duplicate page/locale pairs and aliases; it does not sanitize supplied HTML or verify every media file.

`Documentation.logo?: string` is an optional application logo path under `assets/`. The same `logo` setting is accepted by the build configuration. Paths must be local, with no parent traversal. The CLI checks that the file exists and includes it in the export. The viewer uses a decorative image beside the application name, with the default book icon when omitted or if loading fails. No media module is needed. Integrations should use the application's existing logo when available and omit the field otherwise.

`DocPage.parent?: string` names another page ID for the navigation tree. The core validates parent existence and rejects cycles, using the same default-locale fallback as page resolution. Parent IDs are exact page IDs, not aliases. A child's URL remains based on its own ID. Root pages may use slash-separated `section` paths for nested folders. Source pages are additionally grouped by their source directory. Navigation does not change the `pages()` ordering or the route format.

Optional `DocPage.previous` and `DocPage.next` are local `page-id` or `page-id#anchor` strings for the reader's pagination. Omit a direction to keep the adjacent page in `pages()` order; use an empty string to hide that direction. The same flat fields are accepted in Markdown frontmatter. The core validates targets, aliases and heading/additional anchors, rejecting a missing destination, malformed target or link to the same page without an anchor. Paths may be reciprocal: `next` and `previous` do not define an acyclic parent tree. Use the same destinations in translations. The article breadcrumb exposes the home page, actual parent pages and current page; routing IDs remain unchanged. Studio's isolated one-page draft preview omits parent and pagination links that require other pages; publication uses the full validated manual.

Compiled pages containing explanatory Markdown default to `kind: guide`, even with media. Pages containing only media default to `media`. An authored `kind` still overrides this inference in full builds. Older manifests retain their stored kinds; no migration is required to read them.

For cross-manual addressing:

```typescript
const manuals = createDocumentationRegistry([
  { id: 'editor', base: '../editor/Documentation/Documentation.html' }
]);
const editorUrl = manuals.link({
  documentationId: 'editor', locale: 'en', pageId: 'settings', anchor: 'export'
});
```

An optional `manifest` on a registry entry validates page and section targets. Without it, the host is responsible for those targets. `manuals.ids()` lists registered identities.

## Viewer contract

The CLI requires `defaultLocale: en` and complete English and French editions before publishing; it fails if either required language is missing, empty or explicitly outdated. It prefers `.CyDocBuild/cydoc.config.json`, resolves its input paths from that workspace and allows the sibling `../Documentation` output inside the application root. `apiIndex` produces API-only references; legacy `sourceIndex` is an alias and never restores implementation listings. API adapters import only their declared `locale` (English by default); other languages need genuinely translated API inputs or matching authored pages. `source` remains a low-level compatibility content kind for older/custom manifests, and is not emitted by current exports.

`mountViewer(root: HTMLElement, data: Documentation, options?: ViewerOptions)` returns the documentation core methods plus `destroy()`. Call it once per active dedicated reader page and destroy it on teardown. It owns the window hash, document title/language and scrolling behavior.

| Option | Type/meaning |
| --- | --- |
| `initialLocale` | String; default uses the documentation locale and reader selection |
| `homePage` | Initial page ID |
| `initialTheme` | `light`, `dark`, `midnight`, `nord`, `paper` or `contrast` |
| `storageId` | Namespace for application-specific local reading data |
| `modules` | Map from module name to `() => Promise<MediaModule>` |
| `loadAsset` | `(src: string) => Promise<PackedAsset>` for local binary providers |
| `assetBase` | Directory prefix for display assets, e.g. `DocData/`; default is the reader's directory |
| `renderHome` | Optional trusted `(locale: string) => string` HTML callback |

Route locale/page information takes priority over the initial route defaults when that locale is complete. Available storage and theme preferences can influence the initial reader state. Unavailable locale routes use the complete default language; built-in UI translations currently cover French and English. AI guidance is a separate `DocAI.md` sidecar, never reader content or a search result.

Navigation preserves page reading positions, selected code tabs and menu scroll during the viewer session. The active page's ancestors are revealed when navigating to it, including from search or a contextual link. Page changes without an explicit target move focus to the main content; explicit anchors and media states take priority.

Personal notes, bookmarks and history share an in-memory store for the lifetime of the mounted viewer. If local storage is unavailable or full, navigation keeps these data available and the UI explains that they last for this session only. Export them before closing or destroying the viewer. Persistence between sessions depends on the host browser's local storage policy; personal-data export produces JSON and has no built-in import command.

The header's **Reading mode** toggle hides desktop navigation while retaining search and page tools. Its preference uses the same local reader storage as theme selection. The mobile menu restores navigation. On smaller screens, a native disclosure above the article provides the page outline, copy and print actions. Reading-resume controls remain beside the article header rather than depending on the desktop outline.

Static `.diagram` figures receive an enlargement button without requiring a media module. The dialog moves the original SVG, preserving its IDs and links, and restores it on close or page teardown. Close and Escape restore the opener's focus and reading position while the page remains active. Compiled JSON diagrams include a text explanation and accept an optional plain-text `description`; sequence descriptions identify replies. Custom/trusted HTML diagrams with an SVG can also be enlarged.

The header search field displays results while typing. Ctrl+K opens a modal search dialog using the same query, content filters and language filters. The sidebar uses nested lists with native disclosure controls and page links. Tab/Enter and left/right arrows work on navigation branches; branch state is retained by stable node keys during the session.

In the reader, navigation entries, folders and `[role=tab]` controls receive a fast tooltip on pointer hover or immediate keyboard focus. Navigation descriptions come from `DocPage.description`. Code-tab and gallery items may supply an optional plain-text `description`. The tooltip contains the full label, is linked with `aria-describedby`, stays within the viewport and clears on Escape, navigation or teardown. It requires no module or additional dependency.

## Optional reader contract

```typescript
import type { MediaModule } from 'cydoc';

const exampleModule: MediaModule = {
  mount(host, config, context) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = String(config.title || 'Example');
    host.replaceChildren(button);
    button.addEventListener('click', () => {
      context.linkState?.({ selection: 'example' });
    }, { signal: context.signal });
    return () => host.replaceChildren();
  }
};
```

`mount(host, config: Record<string, unknown>, context)` may return `void`, a cleanup function or a Promise of either. A custom module uses the JavaScript `modules` map; the stock exporter's module allowlist contains only the six built-in names. Adding a new stock-export module requires updating the build pipeline.

`MediaContext` fields:

| Field | Meaning |
| --- | --- |
| `locale` | Current reader locale |
| `signal` | Abort signal for this reader's active lifecycle |
| `storageKey` | Namespaced instance identifier |
| `loadAsset?` | Packed local binary provider |
| `assetUrl?` | `(src: string) => string`; resolves logical `assets/...` paths for images, video and thumbnails |
| `loadModule?` | Loader for another selected media module, used by galleries |
| `state?` | Initial media state, with string values |
| `linkState?` | Host callback for sharing the current view |

`PackedAsset` is `{ base64: string; resources?: Record<string, string> }`. The main binary uses base64; glTF dependencies in `resources` are packed data URLs. The generated bootstrap supplies these assets through on-demand classic scripts from `DocData/`. Custom readers should validate the logical local path, then use `context.assetUrl?.(src) ?? src` for display URLs. Pass the original logical path to `loadAsset` and use it for persistence keys and annotation exports. Keep providers local and compatible with file origins.

Use the signal for listeners. Stop timers and animation loops, disconnect observers, pause media and dispose graphics resources in cleanup. Handle cancellation while awaiting a loader; a stale asynchronous mount must not overwrite a newer page or gallery item. Cleanup may run after the signal is aborted. Built-in readers can receive subsequent state through the `cydoc:state` custom event; implement this event in custom modules if they need in-place deep-link updates. `linkState` is a host callback, not a state persistence API.

## Built-in view state

Always include `media`, the block's explicit ID, in a route's state. Indices and frames are zero-based; times are seconds.

| Reader | State fields |
| --- | --- |
| Image | `zoom`, `x`, `y`, `note` |
| Video | `time`, `note` |
| GIF | `frame`, `zoom`, `x`, `y` |
| Mesh | `camera`, `target`, `scene`, `wire`, `environment`, `note` |
| Graph | `node`, `zoom`, `x`, `y` |
| A/B comparison | `wipe` from 0 to 100 |
| Gallery | `item`, plus its active reader's state |

Use comma-separated three-number vectors for `camera` and `target`. `scene`, `frame` and `item` select zero-based entries. Image/GIF `x` and `y` are viewport-relative pan values; graph pan is in pixels. Prefer the reader's link icon to manually constructing camera/zoom combinations. Reader-created annotation IDs are device-local unless the same annotations are distributed as built-in configuration.
