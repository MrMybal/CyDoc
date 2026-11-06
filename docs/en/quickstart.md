---
id: quickstart
title: Quickstart
description: Create your first documentation and open it straight from your application.
section: Getting started
order: 1
---
CyDoc turns Markdown files and documented comments into a self-contained static reader. All content ships alongside your application.

## Installation {#installation}

In this repository, install the tools and generate the documentation:

```sh
npm install
npm run build
```

Open **dist/site/Documentation.html** directly in a browser using a `file:///…` address. `npm run dev` watches sources and rebuilds local files while editing; it starts no web server. Generation requires Node.js 22 or later; the exported viewer does not require Node.js.

> This package is being developed in this repository. It has not yet been published to npm.

## Your first page {#first-page}

Create a file in `docs/en/`. Each page has a stable identifier, independent of its filename and title.

```markdown
---
id: settings
title: Settings
description: Configure your application.
section: Getting started
order: 5
---
## Configure your workspace {#workspace}

Your explanation starts here.
```

Add its French translation to `docs/fr/` with the same `id`. Read about [languages and translations](doc:languages).

## Build and embed {#build}

The build produces a self-contained folder with the viewer, compiled pages, manifest, and local media. Copy **the entire folder**, then open `Documentation.html` in a browser or WebView.

```text
App/Documentation/
  Documentation.html
  DocData/
    viewer.css
    viewer.js
    data.js
    manifest.json
    translation-report.json
    assets/
    media-*.js
```

## Open contextual help {#contextual-help}

A link opens the right page and section, including from an application's help button.

```text
Documentation/Documentation.html#/en/quickstart/installation
```

This format works across platforms. See the [integration examples](doc:integration).
