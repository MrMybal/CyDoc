# CyDoc Studio changelog

These are Studio application versions. Reader and installer engine versions are independent.
The entries describe source builds; signed release assets are published separately.

## [0.2.0] - 2026-11-27
<!-- cyinstaller: severity=recommended -->

### Added
- Native Linux x64 shell with the CEF editor and embedded CyMCPSDK assistant on X11.
- Linux payload build, user data paths and CyInstaller lifecycle integration alongside Windows.
- Graceful Linux update closure through the editor's durable-save handshake.

### Fixed
- Visible assistant input borders in light themes and bounded connection fields with labels above them.
- The assistant uses the localized SDK status instead of a duplicate internal phase label.

## [0.1.5] - 2026-11-27
<!-- cyinstaller: severity=recommended -->

### Fixed
- Editor language preferences also update and persist the native shell and assistant language.
- Invalid appearance messages leave unrelated settings unchanged.

## [0.1.4] - 2026-11-27
<!-- cyinstaller: severity=recommended -->

### Fixed
- A page opened without edits no longer remains stuck on Saving or blocks normal closure.
- Save acknowledgements verify the text hash as well as the Yjs vector, including concurrent deletions.
- Ctrl+S waits for the service acknowledgement instead of forcing a saved label.
- Larger native controls, visible input borders in light themes and bounded settings layouts.

## [0.1.3] - 2026-11-27
<!-- cyinstaller: severity=recommended -->

### Added
- CyInstaller installation, update checks, startup confirmation and rollback handoff for Windows x64.
- Native CyMCPSDK assistant and shared CLI/MCP operations, with existing jobs and exports retained.
- Guided diagrams and tutorial steps, improved graph controls and documentation reading paths.

### Changed
- Studio update actions delegate to the installed CyInstaller engine.
- Preferences move into the existing data folder's `config/` subdirectory, with a preserved copy of earlier settings.
- Projects, working history, jobs and browser drafts keep their existing data locations.

## [0.1.2]

### Added
- Portable Windows editor with a bundled reader, local workspaces, optional Git and bilingual publication.
