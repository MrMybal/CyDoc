# Integrating CyDoc into an application

Start with the generated offline reader unless the application needs a custom reader UI. Keep authoring inputs separate from the exported directory.

## Get a local package

CyDoc 0.1.0 is not published to the npm registry. In the CyDoc checkout:

```sh
npm ci
npm run build
npm pack
```

`npm pack` also runs the build through `prepack`. Install the resulting archive from the application project, using its actual path and version:

```sh
npm install /path/to/cydoc-0.1.0.tgz
```

The path above is a placeholder. A bare `npm install cydoc` is not the current distribution workflow. The core and generated-reader workflows do not require Three.js; install the optional `three` peer when using mesh support.

## Build the application's manual

Create this layout in the application project. The asset directory must exist even for text-only manuals. Each configured locale needs its own content directory.

```text
cydoc.config.json
manual/en/overview.md
manual/fr/overview.md
assets/
```

Use this minimal `cydoc.config.json`:

```json
{
  "name": "Example App",
  "version": "1.0.0",
  "defaultLocale": "en",
  "locales": [
    { "code": "en", "label": "English" },
    { "code": "fr", "label": "Français" }
  ],
  "homePage": "overview",
  "content": "manual",
  "assets": "assets",
  "out": "build/help",
  "modules": []
}
```

Paths resolve relative to this configuration file. `out` must be a subdirectory of that project, not the project root or a parent directory. Omit the demo-only `landingPage` setting. Write both `overview.md` files using the [page template](AUTHORING.md#pages-and-translations), then run from the application project:

```sh
npx --no-install cydoc build cydoc.config.json
npx --no-install cydoc check cydoc.config.json
```

Both commands compile, validate and write the export. `check` is not a read-only lint command. The exported `manifest.json` is build data; the generated bootstrap loads `data.js` locally without fetching the JSON.

Distribute **all** of `build/help/`, including module scripts, asset data scripts, styles, dependency notices and media. Keep the directory structure. Rebuild into a fresh output directory for a clean distribution because old copied assets are not automatically removed. Open the resulting `index.html` directly; do not introduce an HTTP server or a CDN to make it work.

To add readers, set e.g. `"modules": ["image", "video", "gallery"]`. Include every gallery child type. GIF frame controls need `gif`; ordinary animated GIF display in an image needs only `image`. Mesh exports need `mesh` and the Three.js build dependency. Generated scripts for disabled modules are removed on rebuild.

## Open contextual help

Convert the installed help path to a file URL with the host platform's URL/path API. Do not concatenate an unescaped filesystem path into a URL. Then add a route using `createLink` or the native examples:

```typescript
import { createLink } from 'cydoc';

const helpUrl = createLink({
  locale: 'en',
  pageId: 'overview',
  anchor: 'getting-started'
}, 'file:///path/to/app/help/index.html');
```

`file:///path/to/app/help/index.html` is a placeholder URL. For Node.js hosts, `pathToFileURL(absolutePath).href` creates the base. Native hosts use their framework's equivalent. CyDoc creates the address; the application decides whether to open it in a browser or an embedded WebView. Use a real page ID and a real explicit anchor, and preserve the route when reopening an existing help window.

Source examples included in the package:

| Platform/framework | Example |
| --- | --- |
| C++17 route helper | [cydoc_link.hpp](../examples/integrations/cydoc_link.hpp) |
| Qt 6, Windows/Linux/macOS | [qt_main.cpp](../examples/integrations/qt_main.cpp) |
| Python/Tk | [help_tk.py](../examples/integrations/help_tk.py) |
| C#/WinForms | [HelpWindow.cs](../examples/integrations/HelpWindow.cs) |
| Java/Swing | [HelpWindow.java](../examples/integrations/HelpWindow.java) |
| Swift/AppKit | [macos_help.swift](../examples/integrations/macos_help.swift) |
| Android/Kotlin | [CyDocActivity.kt](../examples/integrations/android/CyDocActivity.kt) |
| JavaScript F1 binding | [contextual-help.js](../examples/integrations/contextual-help.js) |

These are source examples, not prebuilt framework packages. Android opens `file:///android_asset/help/index.html`; keep the restricted local asset configuration in the example and test the packaged app on the target device.

## Custom JavaScript embedding

The following belongs in application source processed by its bundler. Browser ESM imports copied directly into a `file://` page are not the generated offline bootstrap.

```typescript
import { mountViewer } from 'cydoc/viewer';
import type { Documentation } from 'cydoc';
import 'cydoc/viewer.css';

export function openHelp(root: HTMLElement, manifest: Documentation) {
  return mountViewer(root, manifest, {
    initialLocale: 'en',
    initialTheme: 'nord',
    storageId: 'example-app-help',
    modules: {
      image: () => import('cydoc/modules/image').then(m => m.default)
    }
  });
}
```

Supply the manifest from the build through your host or bundling process. The viewer owns the URL hash and imports a global CSS reset: use a dedicated page or iframe, especially when the host also uses hash routing. Call the returned `destroy()` before replacing or closing the viewer.

Custom mesh/GIF embeddings also supply `loadAsset(src)`, returning packed local bytes in `{ base64, resources? }`; see [API.md](API.md#optional-reader-contract). Use the generated exporter to avoid writing this adapter yourself. Do not replace it with `fetch()` against `file://` assets.

## Diagnose integration failures

| Symptom | Check |
| --- | --- |
| Local page cannot find scripts/media | Entire exported tree copied, relative paths unchanged, no ESM-only custom bootstrap |
| A page or section fails validation | IDs and explicit anchors match, no duplicate page/locale pair |
| GIF/mesh does not open in a custom embed | Module enabled, local `loadAsset` provider supplied, WebGL available for mesh |
| Gallery falls back to a file link | Gallery module and each child type enabled |
| Video fails on one platform | Provide browser-compatible `sources` variants; CyDoc does not transcode |
| Bookmarks/notes are not persistent | File-origin/WebView storage policy, stable `storageId`; keep export available |
| Extra UI language stays in English | Only French and English UI text are currently implemented |
