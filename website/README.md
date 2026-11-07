# CyDoc showcase

Static, presentation-only website for CyDoc and CyDoc Studio. English is the default; `?lang=fr` selects the complete French translation. All product claims come from the current repository and Studio 0.1.2 release. This directory contains source inputs; generated files stay in `dist/website/`.

The [standalone showcase convention](../ai/showcase/README.md) includes a complete copy of this showcase adapted as a local example, with its own screenshots, scripts, styles and genuine HTML manual. The example has no external reference links and works after copying its folder elsewhere. Its English guide covers visual, content, translation and verification requirements, with Git/GitHub integration optional. This public implementation keeps CyDoc's verified repository and release links.

[Website](https://mrmybal.github.io/CyDoc/) · [French presentation](https://mrmybal.github.io/CyDoc/?lang=fr) · [English manual](https://mrmybal.github.io/CyDoc/manual/Documentation.html#/en/overview) · [French manual](https://mrmybal.github.io/CyDoc/manual/Documentation.html#/fr/overview)

## Build and preview

Use the checkout's Node.js 22+ toolchain:

```sh
npm ci
npm run website:build
npm run website:preview
```

The preview prints an available loopback URL. For a specific port, use `node website/preview.mjs --port=4380`. Preview only serves generated static files and binds to `127.0.0.1`.

`website:build` builds the library/manual first, then writes `dist/website/`:

```text
dist/website/
  index.html
  .nojekyll
  LICENSE
  build.json
  assets/
    site.<content-hash>.css
    site.<content-hash>.js
    favicon.svg
    screenshots/*.webp
  manual/
    Documentation.html
    DocAI.md
    DocData/
```

The builder checks translation parity, linked page/anchor IDs in both manual languages, screenshot files and generated local references. CSS/JavaScript filenames change with their contents, avoiding reuse of stale bundles. No remote fonts, CDNs, analytics or runtime APIs are required by the showcase. Screenshot enlargement, tabs and language switching use the bundled classic script, so `index.html` can also be opened with `file://`.

Keep `manual/` intact: it is the actual compiler-generated CyDoc HTML reader, including optional modules, packed local assets, versions and dependency notices. Documentation links target that reader with the selected locale; they do not point to Markdown sources. The editor service and its account data are never copied into the website.

## Editing

- `content.mjs`: complete English/French copy and the media catalog.
- `template.mjs`: prerendered English HTML, semantic sections, documentation links and screenshot markup.
- `main.mjs`: language selection, media tabs, theme comparison, mobile navigation and in-window screenshot enlargement.
- `styles.css`: responsive graphite/mint design, focus states and reduced-motion support.
- `assets/screenshots/`: actual product captures, converted to WebP without changing their UI content.
- `build.mjs`: static generation and validation.
- `preview.mjs`: local-only preview.

The screenshots come from a disposable copy of CyDoc's bundled example: visual/Markdown editing, page properties, French translation, media/module dialogs, local Git, the reader, search, API pages, diagrams, graph and media viewers. The Windows capture uses the actual portable application's Documentation tab. The media examples are illustrative fixtures. Captions describe what is actually available; retain the early-development/platform limitations when updating copy.

When recapturing, use a separate example workspace, wait for viewers to load, and retain the full application frame or the actual enlarged viewer. Do not fabricate UI, add promotional overlays, or include local account paths/credential panels. Check screenshot content before committing it. Keep originals and QA captures in ignored work directories; commit only the selected WebP assets.

## Static hosting

The complete `dist/website/` output is compatible with a GitHub Pages project subpath: all local resources and manual links are relative, with no history-path router or server-side endpoints. The repository uses GitHub Actions as its Pages source. `.github/workflows/pages.yml` builds and tests the reader/showcase, uploads only `dist/website/`, then deploys that artifact to the `github-pages` environment. Pushes to `main` and manual workflow runs publish updates. No Studio installation, account database or local project folder is included.

The build/preview commands themselves do not push or publish. The workflow needs `pages: write` and `id-token: write` only for its deployment job; its build job has read-only repository access. Action versions are pinned to commit hashes. The repository's About website points to the showcase, and the root README links to both the showcase and the real HTML reader in English and French.

Before handing off changes, check English and French, desktop and mobile widths, the initial screenshot's full visibility, all media tabs, the comparison divider/range, keyboard image navigation, Escape/focus restoration, FAQ controls, documentation routes and download links. Browser checks complement the normal `npm test` suite; they do not certify other operating systems or mobile hardware.
