---
id: quickstart
title: Create your first manual
description: Write a first page, check both languages and open your exported manual.
section: Getting started
order: 1
previous: overview
next: writing
revision: 3
---
This tutorial uses CyDoc Studio to create a small manual. You will write a page, review it in the reader and prepare a folder you can distribute with your application.

```callout
{"type":"note","title":"Before you start","body":"Have **CyDoc Studio** available and choose a folder for your project. Local work requires no account. The source-checkout alternative below requires Node.js 22 or later."}
```

## Prepare your workspace {#installation}

Open Studio and choose **New project**. Name your manual and create a local project. You can also choose **Open the CyDoc example** to practice on an independent copy of the sample manual. See [starting Studio](doc:studio#start) if you need to install it.

**Expected result:** the project opens with its page tree and editor.

```details
{"title":"Alternative: work from the source checkout","body":"In this CyDoc checkout, install the dependencies and build the sample manual:\n\n```sh\nnpm ci\nnpm run build\n```\n\nOpen **dist/site/Documentation.html** directly using a `file:///…` address. `npm run dev` watches and rebuilds the sources without starting a server. For another application's own manual, follow the [integration guide](doc:integration)."}
```

## Your first page {#first-page}

```steps
{"items":[{"title":"Add a page","body":"Create a page with a clear title such as **Settings**. Its stable ID identifies it independently of its filename and translated title.","result":"The new page appears in the tree and opens in the editor.","troubleshooting":"If you cannot find it, clear the page filter and expand its parent in the tree."},{"title":"Explain one task","body":"Write the English original. Describe one action the user can perform and the result they should see. Use **Visual** or **Markdown** in Studio.","result":"The page tells the reader what to do and how to recognize success.","troubleshooting":"If your explanation covers several unrelated tasks, split it into separate pages and link them."},{"title":"Complete the French edition","body":"Translate the title, description and body. Keep the same page ID and explicit anchors. Review the translation in page properties.","result":"The same topic has complete English and French editions.","troubleshooting":"If publication reports a missing or outdated translation, switch to French and review its content and translation status. See [languages and translations](doc:languages)."}]}
```

**Expected result:** the page appears in the tree and contains a complete explanation in both languages.

If you edit files directly in this checkout, place the English original in `docs/en/` and its French translation in `docs/fr/`. Here is a complete English page:

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

Keep the same `id: settings` and `workspace` anchor in the French page. Read about [languages and translations](doc:languages) and [writing a page](doc:writing).

## Build and embed {#build}

In Studio, use **Preview** to read your page. Check its title, instructions and language. Once both editions are complete and the French translation is reviewed, use **Publish**.

**Expected result:** `Documentation/Documentation.html` opens your manual. Reading the export requires no Studio service or Node.js.

Keep **the entire exported folder** together:

```text
App/Documentation/
  Documentation.html
  DocAI.md
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

**Expected result:** the link opens the preparation section of this tutorial. To connect it to an application's help button, see the [integration examples](doc:integration).

If a page or media item does not appear, use the [troubleshooting guide](doc:troubleshooting). To add an illustration to your next page, explore [images and videos](doc:media).
