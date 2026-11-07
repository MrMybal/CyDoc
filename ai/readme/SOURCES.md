# Evidence for the CyDoc README example

Checked on 7 November 2026. This file supports maintainers and agents; it is not part of the example's human README or exported manual.

| Information | Evidence |
| --- | --- |
| Reader library 0.1.0, MIT, Node.js 22+ | [package.json](../../package.json), [project license](../../LICENSE), [project README](../../README.md) |
| Studio 0.1.2 and editor packages | [studio/package.json](https://github.com/MrMybal/CyDoc/blob/main/studio/package.json), [component notices](https://github.com/MrMybal/CyDoc/blob/main/studio/LICENCES.md) |
| Published Windows download | [Studio 0.1.2 release](https://github.com/MrMybal/CyDoc/releases/tag/studio-v0.1.2), read through the GitHub API; asset `CyDocStudio-0.1.2-windows-x64.zip` and `SHA256SUMS.txt` |
| Stage | The project README describes the first reader foundation, unpublished npm package and remaining target validation. The showcase says “In development”. The release's non-prerelease flag is retained as release metadata and is not used to claim product stability. |
| Reader and module features | [project README](../../README.md), [API guidance](../API.md), [authoring guidance](../AUTHORING.md) |
| Release contents and limitations | Published Studio 0.1.2 release notes, [Studio guide](https://github.com/MrMybal/CyDoc/blob/main/studio/README.md), [project README](../../README.md) |
| Logo | Byte-for-byte copy of the user-supplied `assets/branding/cydoc-logo-v1.png`; no new logo or wordmark was invented. |
| Screenshots | Byte-for-byte copies of the checkout's `website/assets/screenshots/reader-guide.webp` and `studio-visual.webp`, captured from the actual reader and isolated editable CyDoc example. |
| Optional example author credit | Explicit attribution requested for this author's application examples in the originating task. The reusable convention and DocAI.md do not require this name or any author credit. |

The reader dependency table uses installed root package versions/notices and `package-lock.json`. Studio uses its separate lockfile and component notices. The native build's `studio/desktop/build.ps1` prepares CyUI, CyToolsCore, Node.js, CEF, CPython, PyInstaller, PyOpenGL and Pillow; Python/MCP distribution notices are collected separately. Installed Pillow 13.0.0 declares `MIT-CMU`; PyOpenGL 3.1.10 declares BSD licensing; PyInstaller 6.22.3 declares GPLv2-or-later with its bootloader exception. Do not relabel these as MIT simply because the main project is MIT.

The example lists main libraries and named components with their scopes and links. Full transitive/component notices remain with the distributions; the table is not an exhaustive legal audit. CyUI source access may require repository permission. Do not copy native runtimes, dependency installations, user projects or credential stores into this folder.

The public issue collection contained no open issues when checked. The release does not provide an itemized confirmed-bug list. The example therefore lists documented limitations separately and links to the actual issue tracker; it does not assert an absence of bugs.

The convention, example and source assets are included by the existing root package `ai/` allowlist. The preview command writes generated files only to the current directory's ignored `artifacts/readme-example/`. None of these assets are imported into the reader or its optional engines. Relative links must also resolve from the npm archive; source-only Studio references use public GitHub URLs.
