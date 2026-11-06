# Update an application's manual with CyDoc

Use these requirements when migrating or updating an application's documentation with [CyDoc](https://github.com/MrMybal/CyDoc). Read the application's own agent instructions and the [integration](INTEGRATION.md) and [authoring](AUTHORING.md) guides first. Keep the application manual focused on people using that application or plugin.

## Required result

```text
App/
  .CyDocBuild/
    cydoc.config.json
    manual/en/
    manual/fr/
    assets/
    internal/                 # Working notes, when needed; outside content roots
    package.json              # Documentation tooling, when separate
  Documentation/
    Documentation.html
    DocAI.md
    DocData/
```

All documentation authoring and build work belongs in `.CyDocBuild/`. Distribute the generated `Documentation/` tree. Open `Documentation.html` directly through `file://`; do not add a web server. Keep runtime scripts, manifests, media, styles, dependency notices and optional version exports in `DocData/`. Keep assistant instructions in the separate `DocAI.md`, outside the human reader's navigation and search.

## Update the actual content

Inspect the application's current UI, behavior and public APIs before editing. Correct pages that describe removed, renamed or changed features. Explain real user tasks clearly, with short steps, meaningful titles, relevant screenshots and examples. Do not invent features or preserve inaccurate descriptions simply to copy the old manual.

Do not publish test reports, audits, verification history, migration inventories, or instructions for maintaining/building the documentation as human manual pages. Keep useful working records privately in `.CyDocBuild/internal/`, outside `manual/en/` and `manual/fr/`. Preserve unrelated user files. Existing internal Markdown can use `audience: internal` or `audience: ai` while being reorganized.

## English and French are mandatory

Write the complete English original first and set `defaultLocale` to `en`. Produce a full French translation with the same page IDs and explicit anchors. Translate descriptions, captions, annotations and media explanations as well as titles and paragraphs. Keep code, API names and literal application identifiers accurate.

Do not copy original-language prose into another locale, insert placeholder translations, or offer incomplete language choices with fallback banners. Both English and French must be complete, nonempty and current before the build publishes. Additional languages are optional and withheld when incomplete. Structural coverage checks cannot judge translation quality; review the actual text.

## Navigation and API references

Organize the manual as a clear tree of topics and subpages, using `parent` IDs and section paths. Keep stable deep links; use validated aliases for moved pages. Use useful page descriptions and preserve complete labels in tooltips. Titles must fit their controls or wrap/truncate cleanly. Gallery labels must not overlap adjacent thumbnails. Verify compact and narrow layouts as well as desktop.

Do not distribute raw source listings or a Source Files browsing section. Public function APIs, signatures, parameters, returns, includes, imports and modules may be documented where relevant. `apiIndex` creates these references without implementation bodies; legacy `sourceIndex` is an alias for that API-only behavior. Read source privately to verify facts, and publish only authored documentation, useful examples and public API information. Do not copy source trees into media assets.

## Integrate and verify

Select only relevant optional media modules. Include gallery child readers; install Three.js only for mesh. Prefer clean media presentation with accessible keyboard/touch controls and enlargement inside the documentation window.

Update application help/F1 links and packaging rules to use `Documentation/Documentation.html` and to include the complete generated directory. Keep `.CyDocBuild/` out of the shipped manual. Rebuild from the inputs and run appropriate checks. When possible, open the export locally and exercise navigation, contextual links, both languages, search and enabled media on the actual target. Report tests and any remaining limits in the conversation, without adding those reports to the human documentation. Publishing to an application's Git remote remains subject to that application's instructions and the user's authorization.
