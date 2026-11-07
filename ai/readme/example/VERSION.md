# CyDoc — Version notes

[Back to README](README.md) · [Français](VERSION.fr.md)

**Reader library: 0.1.0 · Studio editor: 0.1.2**<br>
**Stage: IN DEVELOPMENT**<br>
**Available native editor package: Windows x64**

CyDoc is an early implementation. Studio 0.1.2 is a published portable release; that publication does not establish production maturity for every integration. Review the documented limits before depending on a target runtime.

## Studio 0.1.2

- Visual/Markdown authoring, page trees, properties, autosave, history and local media import.
- Local projects without accounts, including an editable bilingual CyDoc example.
- Optional Git, separate authenticated online editing, invitations, project roles and simultaneous editing.
- Windows CyUI/CEF shell with full-window Editor, Documentation, Options and Local MCP / SDK tabs.
- Six shared themes and JavaScript/Python SDKs with 22 CyToolsCore MCP operations.
- Complete English/French static export with the separate DocAI.md sidecar.

[Download and official release notes](https://github.com/MrMybal/CyDoc/releases/tag/studio-v0.1.2) · [SHA-256 checksums](https://github.com/MrMybal/CyDoc/releases/download/studio-v0.1.2/SHA256SUMS.txt)

## Reader library 0.1.0

The first functional foundation provides local HTML reading, stable help links, local search, structured/API content, complete English/French publication, six themes, reading tools and six optional media modules. The core has no runtime dependency. The library is not published to npm yet; consume a built checkout or a local package archive.

## Known issues

The published release notes do not provide an itemized confirmed-bug list. Consult the [actual issue tracker](https://github.com/MrMybal/CyDoc/issues) for current reports. The limitations below are documented product boundaries, not invented bug tickets or a claim that the software has no bugs.

## Documented limitations

- Reader native integrations are source examples. Windows, Linux, macOS and Android target-device validation remains necessary; source support does not imply supplied application binaries for each platform.
- Studio's supplied native package is Windows x64 only. No native Linux/macOS Studio package is included. The Windows Python CEF bridge currently runs without the CEF process sandbox.
- Video codecs depend on the browser/runtime. Mesh rendering needs WebGL 2. No video transcoder, Draco or KTX2 decoder is bundled.
- The reader loads all pages together. Segmented content/search for very large manuals and RTL layout are not implemented. Built-in UI languages are English and French.
- Advanced media, diagrams and graphs use JSON/Markdown blocks; dedicated visual editors are not available for every block.
- Online Studio needs one persistent service with HTTPS and WebSockets. Managed hosting, email delivery, SSO and multi-node collaboration are not provided.

## References

- [Reader and Studio release history](https://mrmybal.github.io/CyDoc/manual/Documentation.html#/en/changelog).
- [All releases](https://github.com/MrMybal/CyDoc/releases) · [Report a problem](https://github.com/MrMybal/CyDoc/issues/new).
- [Studio setup and platform limits](https://github.com/MrMybal/CyDoc/blob/main/studio/README.md).
