# Standalone CyDoc showcase example

Open [index.html](index.html). No installation, build, Git repository, account, server or internet connection is required. Copy this complete directory anywhere and open it again. The default language is English; the page includes a complete French edition.

This is the complete CyDoc showcase adapted into a local reference: the original chapter structure, twenty real product captures, screenshot enlargement, media tabs, a theme comparison, FAQ and the genuine bilingual HTML manual. Repository, release, checksum and installer destinations have been replaced with clearly labeled local exploration actions. No application executable is included.

## Files

| Path | Purpose |
| --- | --- |
| [index.html](index.html) | Ready-to-open reference page |
| `assets/` | Local logo, screenshots and revisioned CSS/classic JavaScript |
| `source/content.mjs` | English/French copy and media catalog; standalone overrides are grouped at the end |
| `source/template.mjs` | Complete page structure and local destinations |
| `source/main.mjs` | Language switching, tabs, comparison, navigation and image viewer |
| `source/styles.css` | Responsive graphite/mint appearance |
| `rebuild.mjs` | Dependency-free HTML and asset regeneration with local link/translation checks |
| [manual/Documentation.html](manual/Documentation.html) | Actual CyDoc offline reader, with its complete `DocData/` and separate `DocAI.md` |
| [LICENSE](LICENSE) | MIT license; reader dependency notices remain in `manual/DocData/` |

The ready-to-open files and reader are intentionally included as a portable reference fixture. They are separate from the parent application's generated distribution. Edit the source files above and rebuild; do not repair generated bundles or reader manifests by hand.

## Edit or adapt

With Node.js 22 or later, run from this directory:

```sh
node rebuild.mjs
```

No npm install or package dependency is needed. The script uses only this directory. Changed styles/scripts get new content-hashed filenames and the HTML references are updated together. The unchanged manual is kept intact.

When adapting the reference to another application, replace the identity, factual copy, logo, screenshot catalog and images with that application's own material. Replace the complete `manual/` tree with its genuine exported manual, then update the page's `data-doc` targets and media catalog to existing page/anchor IDs. Rebuild checks both English and French destinations. If the application uses another manual system, adapt the template and routing to its real local entry point.

Keep outgoing destinations absent by default. A requested GitHub/download/hosting integration can be added later; it must never become necessary to open the local reference. Do not copy CyDoc's product claims into another application's presentation.

## Reader provenance

The bundled reader was compiled with CyDoc from its own maintained bilingual demo sources and example API inputs in an isolated consumer project. The standalone inputs render the few remote resource references as plain text rather than outgoing links; generated reader data was not hand-edited. Media modules, versions, local search, keyboard controls and dependency notices retain the actual reader implementation.

To update the reader, rebuild from CyDoc's sources or the target application's maintained documentation inputs and replace the entire export. Keep external destinations out of the source content for an offline-only reference. Rebuilding the showcase alone does not rebuild the reader.

## Verify

Inspect EN/FR, desktop/mobile layouts, complete initial screenshot visibility, local manual routes, media tabs, comparison, Escape/focus restoration and direct file opening. Run the showcase rebuild after changes. When the complete convention folder is present, its `verify.mjs` also checks the reference's file boundaries, local links, reader pages and asset revisions. A browser viewport simulation does not establish native platform or codec compatibility.
