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
npm install --prefix .CyDocBuild /path/to/cydoc-0.1.0.tgz
```

The path above is a placeholder. A bare `npm install cydoc` is not the current distribution workflow. The core and generated-reader workflows do not require Three.js; install the optional `three` peer when using mesh support.

## Build the application's manual

Keep all documentation authoring, tooling and build work inside `App/.CyDocBuild/`. The asset directory must exist even for text-only manuals. English originals and full French translations are required.

```text
App/
  .CyDocBuild/
    cydoc.config.json
    manual/en/overview.md
    manual/fr/overview.md
    assets/
    package.json              # Documentation toolchain, when maintained separately
  Documentation/             # Generated reader only
```

Use this minimal `.CyDocBuild/cydoc.config.json`:

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
  "out": "../Documentation",
  "modules": []
}
```

Input paths resolve relative to this configuration file. When it is directly inside `.CyDocBuild/`, the application root is its parent; `../Documentation` is the public output next to the private workspace. Output must remain inside the application root and cannot replace that root. Omit the demo-only `landingPage` setting. Write both `overview.md` files using the [page template](AUTHORING.md#pages-and-translations), then run from the private workspace with its documentation toolchain:

```sh
cd .CyDocBuild
npx --no-install cydoc build cydoc.config.json
npx --no-install cydoc check cydoc.config.json
```

Use the application's own logo when it has one: copy an existing SVG/PNG/WebP logo into the documentation asset directory and add `"logo": "assets/app-logo.svg"` to the configuration. This file must exist; the CLI validates and copies it with the export. If no application logo is available, omit `logo` and retain CyDoc's default book icon. Do not set an imaginary logo path or reuse another application's branding. A custom embedding sets the same field on its `Documentation` manifest. The logo does not require the image module.

Use the application's full name in `name`. Long names are visually shortened with an ellipsis in the sidebar; hovering or focusing the brand exposes the complete name and version. The version badge appears below the name.

The reader has no permanent local/offline status cards or host-license badge. Its header contains global search and a compact **My space** icon for bookmarks and notes. Document the application's actual license in its own pages; the library's MIT license does not determine the application's license.

Both commands compile, validate and write the export. `check` is not a read-only lint command. The exported `DocData/manifest.json` is build data; the generated bootstrap loads `DocData/data.js` locally without fetching the JSON.

Install the exported folder as `App/Documentation/`:

```text
App/Documentation/
  Documentation.html
  DocAI.md
  DocData/
    data.js
    manifest.json
    translation-report.json
    viewer.js
    viewer.css
    assets/
    media-*.js                # Enabled readers and packed binary assets
    media-mesh.LICENSE.txt    # Mesh only
    versions/                # Optional version builds
```

The default output is `App/Documentation/`. Without an explicit configuration argument, the CLI first looks for `.CyDocBuild/cydoc.config.json` and accepts the former root configuration as a compatibility fallback. `Documentation.html` is the reader itself, with no iframe or redirect to an internal page. Point new application help links at it. Rebuilding a recognized previous flat CyDoc export relocates its generated files and preserves the old `index.html` as a redirect with its query and fragment. Unrelated files are left intact; do not delete application-owned files to force the layout.

Write the human manual for people using the application. The generated `DocAI.md` is separate assistant guidance, with no navigation entry or search results. Keep build/maintenance instructions, audit reports, migration inventories and verification histories out of human content. Store working records outside the generated manual. Use `audience: internal` or `audience: ai` on existing internal Markdown that cannot yet be moved; those pages are excluded. `DocAI.md` files under the content directories are also ignored.

English is the required source/default language, and a full French translation is mandatory. A missing, empty or explicitly outdated English/French public page stops the build before publishing. Other locales are optional and withheld when incomplete. The reader also hides incomplete locales in older or custom manifests. Do not copy original-language prose into another locale or add placeholders to satisfy coverage; translate and review all human-facing content first. Coverage checks cannot judge the language or quality of prose.

Keep source Markdown and assets outside this generated tree. Authored media and `logo` still use `assets/...`; the generated reader resolves those paths inside `DocData/`. Do not add `DocData/` to authored media paths. `linkedDocs.base` and `versions[].base` are relative to `Documentation.html`; `linkedDocs.manifest` points to the other export's `DocData/manifest.json` and resolves relative to the build configuration. `versionBuilds[].destination` resolves inside `DocData/`, for example `versions/v1` exports to `DocData/versions/v1/Documentation.html`.

Distribute **all** of `App/Documentation/`, including module scripts, asset data scripts, styles, dependency notices and media. Keep `.CyDocBuild/` out of the distributed manual. Keep the generated directory structure. Rebuild into a fresh output directory for a clean distribution because old copied assets are not automatically removed. Open the resulting `Documentation.html` directly; do not introduce an HTTP server or a CDN to make it work.

To add readers, set e.g. `"modules": ["image", "video", "gallery"]`. Include every gallery child type. GIF frame controls need `gif`; ordinary animated GIF display in an image needs only `image`. Mesh exports need `mesh` and the Three.js build dependency. Generated scripts for disabled modules are removed on rebuild.

## Open contextual help

Convert the installed help path to a file URL with the host platform's URL/path API. Do not concatenate an unescaped filesystem path into a URL. Then add a route using `createLink` or the native examples:

```typescript
import { createLink } from 'cydoc';

const helpUrl = createLink({
  locale: 'en',
  pageId: 'overview',
  anchor: 'getting-started'
}, 'file:///path/to/app/Documentation/Documentation.html');
```

`file:///path/to/app/Documentation/Documentation.html` is a placeholder URL. For Node.js hosts, `pathToFileURL(absolutePath).href` creates the base. Native hosts use their framework's equivalent. CyDoc creates the address; the application decides whether to open it in a browser or an embedded WebView. Use a real page ID and a real explicit anchor, and preserve the route when reopening an existing help window.

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

These are source examples, not prebuilt framework packages. Android opens `file:///android_asset/Documentation/Documentation.html`; keep the restricted local asset configuration in the example and test the packaged app on the target device.

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

Custom mesh/GIF embeddings also supply `loadAsset(src)`, returning packed local bytes in `{ base64, resources? }`; see [API.md](API.md#optional-reader-contract). Use the generated exporter to avoid writing this adapter yourself. Do not replace it with `fetch()` against `file://` assets. If an embedding places `assets/` under another directory, set `assetBase` to that directory, for example `DocData/`. Its default is the reader's directory. Binary providers still receive logical `assets/...` keys.

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
