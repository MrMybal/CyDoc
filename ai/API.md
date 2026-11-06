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
const url = createLink(route, './help/index.html');
// ./help/index.html#/en/overview/getting-started
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

`resolve` returns `{ page, requestedLocale, fallback }` or `undefined`. `pages` returns one resolved page per ID in navigation order. `search` returns `{ page, score, excerpt, anchor? }[]`; its fourth argument supports `language`, `kind` and `fuzzy`. Content kinds are `guide`, `api`, `source` and `media`. `canonicalRoute` applies configured aliases. `docs.link` is the same link constructor as `createLink`, not a page-validation operation.

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

`DocPage.parent?: string` names another page ID for the navigation tree. The core validates parent existence and rejects cycles, using the same default-locale fallback as page resolution. Parent IDs are exact page IDs, not aliases. A child's URL remains based on its own ID. Root pages may use slash-separated `section` paths for nested folders. Source pages are additionally grouped by their source directory. Navigation does not change the `pages()` ordering or the route format.

For cross-manual addressing:

```typescript
const manuals = createDocumentationRegistry([
  { id: 'editor', base: '../editor/help/index.html' }
]);
const editorUrl = manuals.link({
  documentationId: 'editor', locale: 'en', pageId: 'settings', anchor: 'export'
});
```

An optional `manifest` on a registry entry validates page and section targets. Without it, the host is responsible for those targets. `manuals.ids()` lists registered identities.

## Viewer contract

`mountViewer(root: HTMLElement, data: Documentation, options?: ViewerOptions)` returns the documentation core methods plus `destroy()`. Call it once per active dedicated reader page and destroy it on teardown. It owns the window hash, document title/language and scrolling behavior.

| Option | Type/meaning |
| --- | --- |
| `initialLocale` | String; default uses the documentation locale and reader selection |
| `homePage` | Initial page ID |
| `initialTheme` | `light`, `dark`, `midnight`, `nord`, `paper` or `contrast` |
| `storageId` | Namespace for application-specific local reading data |
| `modules` | Map from module name to `() => Promise<MediaModule>` |
| `loadAsset` | `(src: string) => Promise<PackedAsset>` for local binary providers |
| `renderHome` | Optional trusted `(locale: string) => string` HTML callback |

Route locale/page information takes priority over the initial route defaults. Available storage and theme preferences can influence the initial reader state. Content falls back to the default content locale; built-in UI translations currently cover French and English.

Navigation preserves page reading positions, selected code tabs and menu scroll during the viewer session. Explicit anchors and media states take priority. Persistence of personal reading data depends on the host browser's local storage policy.

The header search field displays results while typing. Ctrl+K opens a modal search dialog using the same query, content filters and language filters. The sidebar uses nested lists with native disclosure controls and page links. Tab/Enter and left/right arrows work on navigation branches; branch state is retained by stable node keys during the session.

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
| `loadModule?` | Loader for another selected media module, used by galleries |
| `state?` | Initial media state, with string values |
| `linkState?` | Host callback for sharing the current view |

`PackedAsset` is `{ base64: string; resources?: Record<string, string> }`. The main binary uses base64; glTF dependencies in `resources` are packed data URLs. The generated bootstrap supplies these assets through on-demand classic scripts. Keep providers local and compatible with file origins.

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
