# CyDoc — Version notes

[Back to README](README.md) · [Français](VERSION.fr.md)

**Reader library: 0.2.0 · Studio: 0.2.0**<br>
**Stage: IN DEVELOPMENT**<br>
**Native editor packages: Windows x64 and Linux x64 (X11)**

CyDoc is an early implementation. Studio 0.2.0 provides Windows and Linux CyInstaller setups; that publication does not establish production maturity for every integration. Review the documented limits before depending on a target runtime.

## Studio 0.2.0 — Windows installers and native Linux

The native shell and embedded assistant support Linux X11 alongside Windows. Ubuntu 24.04 x64 is the Linux validation target, with an X11 display and OpenGL 3.3. Linux user data follows XDG paths, update signals use the durable-save close handshake, and the assistant's connection form has visible borders and labels above its fields. [Offline setups, online bootstraps and portable payloads](https://github.com/MrMybal/CyDoc/releases/tag/v0.2.0) include signed update metadata and SHA-256 checksums. The 0.1.3–0.1.5 changes below are included in 0.2.0.

## Studio 0.1.5 sources — shared language preference

Changing the interface language in editor preferences also updates and saves the native shell language. Theme changes and existing preferences are retained. This source build remains separate from the published portable 0.1.2 download.

## Studio 0.1.4 sources — save status and readability

Opening an unchanged page now receives a durable save acknowledgement. Concurrent deletions are checked against the saved text as well as the collaboration state vector, and Ctrl+S waits for that acknowledgement. Native controls use larger text, visible field borders and bounded form widths. These source changes are not part of the published portable 0.1.2 download.

## Studio 0.1.3 sources — assistant and managed installation

The current sources replace the previous automation runtime with CyMCPSDK 0.7.5, revision `35d2d4f`. They add the native Assistant tab, shared chat/CLI/MCP operations and public local discovery. CyInstaller 0.1.0 provides signed setup, managed updates, startup confirmation and rollback. The editor waits for saved work before closing for an update. Existing projects, jobs and browser drafts retain their locations; preference files are copied into `config/` while their originals remain available. These changes are not included in the published Studio 0.1.2 portable download. Local release generation does not publish an online update.

## Studio 0.1.2

- Visual/Markdown authoring, page trees, properties, autosave, history and local media import.
- Local projects without accounts, including an editable bilingual CyDoc example.
- Optional Git, separate authenticated online editing, invitations, project roles and simultaneous editing.
- Windows CyUI/CEF shell with full-window Editor, Documentation, Options and Local MCP / SDK tabs.
- Six shared themes and JavaScript/Python SDKs with 22 MCP operations.
- Complete English/French static export with the separate DocAI.md sidecar.

[Download and official release notes](https://github.com/MrMybal/CyDoc/releases/tag/studio-v0.1.2) · [SHA-256 checksums](https://github.com/MrMybal/CyDoc/releases/download/studio-v0.1.2/SHA256SUMS.txt)

## Reader library 0.2.0

This source version adds guided reading paths, section-aware local search, clearer navigation, diagram enlargement and improved graph controls. Consume a built checkout or a locally generated `cydoc-0.2.0.tgz`; this version is not published to npm.

## Reader library 0.1.0

The first functional foundation provides local HTML reading, stable help links, local search, structured/API content, complete English/French publication, six themes, reading tools and six optional media modules. The core has no runtime dependency. The library is not published to npm yet; consume a built checkout or a local package archive.

## Known issues

The published release notes do not provide an itemized confirmed-bug list. Consult the [actual issue tracker](https://github.com/MrMybal/CyDoc/issues) for current reports. The limitations below are documented product boundaries, not invented bug tickets or a claim that the software has no bugs.

## Documented limitations

- Reader native integrations are source examples. Windows, Linux, macOS and Android target-device validation remains necessary; source support does not imply supplied application binaries for each platform.
- Studio packages target Windows x64 and Linux x64 on X11 (Ubuntu 24.04 tested). macOS and pure Wayland are not supported. The Python/CEF bridge runs without the CEF process sandbox. Real AI providers require their own connection configuration and validation.
- Video codecs depend on the browser/runtime. Mesh rendering needs WebGL 2. No video transcoder, Draco or KTX2 decoder is bundled.
- The reader loads all pages together. Segmented content/search for very large manuals and RTL layout are not implemented. Built-in UI languages are English and French.
- Advanced media, diagrams and graphs use JSON/Markdown blocks; dedicated visual editors are not available for every block.
- Online Studio needs one persistent service with HTTPS and WebSockets. Managed hosting, email delivery, SSO and multi-node collaboration are not provided.

## References

- [Reader and Studio release history](https://mrmybal.github.io/CyDoc/manual/Documentation.html#/en/changelog).
- [All releases](https://github.com/MrMybal/CyDoc/releases) · [Report a problem](https://github.com/MrMybal/CyDoc/issues/new).
- [Studio setup and platform limits](https://github.com/MrMybal/CyDoc/blob/main/studio/README.md).
