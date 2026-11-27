# CyDoc Studio installer integration

This folder configures **CyDoc Studio**, independently of the reader library. The application ID `mrmybal.cydocstudio` and the manifest's publisher key are permanent after first distribution.

The integration follows CyInstaller 0.1.0's `CYINSTALLER-INTEGRATION.fr.md`. Tested local engine source revision: `a74e1b751e895cb60b6755e21f2bd387b040e91e`. One Python process adapter uses the explicit installation root despite the nested frozen executable. It delegates discovery, downloading, verification, replacement and rollback to the installed engine.

## Build and release locally

Build the complete Windows payload with `studio/desktop/build.ps1`. The payload must not contain `_cyinstall/`; CyInstaller installs and records that folder itself. Supply a trusted matching `cyinstall.exe` and `cyinstall-ui.exe` when packaging.

The build copies the reader's runtime dependency closure (`marked`, `prismjs`, `esbuild`, `three`) and the service's closure (`yjs`, `ws`, `fflate`), preserving package data, nested versions and licenses. Browser authoring dependencies are already bundled into Studio's generated UI. OpenGL modules stay in the frozen Python archive rather than being duplicated as thousands of source files. Do not replace these closures with a blanket copy of development `node_modules`.

```powershell
./studio/desktop/release.ps1 -AppDirectory artifacts/CyDocStudio-0.2.0-win-x64-payload -OutputDirectory artifacts/CyDocStudio-0.2.0-win-release -SigningKey /private/path/publisher.key
```

The private key is stored outside Git and the payload; only its public counterpart is in `cyinstaller.json`. Pass the private path explicitly or through `CYINSTALLER_SIGNING_KEY_FILE`. The script never creates or replaces signing keys. It validates source/payload versions and delegates the whole release to `cyinstall release`, using the root Studio `CHANGELOG.md`. Future releases pass `-Previous path/to/update.json` to retain history/trust. Do not put the output inside the payload.

Outputs include payload and engine ZIPs, offline setup, online bootstrap, `update.json`, its Ed25519 signature and checksums. `-OfflineOnly` omits the bootstrap. Ed25519 update signatures are distinct from Windows Authenticode; no Authenticode certificate is configured here.

`source.github` names the application distribution repository `MrMybal/CyDoc`. Publish all generated files together before expecting online discovery/bootstrap to work. Local packaging uploads nothing and adds no workflow. Studio 0.2.0 publishes both native platforms together. Keep the previous download available until that replacement is verified.

## Installation and data

Windows x64 installs per user into `{programs}/CyDocStudio-CyInstaller` by default. First setup requires an empty destination. Portable users close their old editor and use this separate destination. No guessed legacy uninstaller, forced process termination or destructive migration hook is configured.

The existing `%LOCALAPPDATA%/CyDocStudio` root stays in place. Known preference files are copied once into `config/`, preserving originals and newer targets. `workspace/`, `jobs/` and `browser-profile/` retain their locations. Workspace projects and browser drafts are categorized as user files; externally opened application folders are never enumerated for deletion. Normal uninstall retains preferences, jobs and user work. For clean uninstall, use the engine's keep-config/data options as appropriate; project/browser user files require their own explicit include choice.

Visual C++ is a declared prerequisite for the native components. Python, Node and CEF are bundled. Git, providers, inference engines and models remain optional and are not installed implicitly.

## Lifecycle and shutdown

`desktop/app/updater.py` distinguishes development, portable, managed and repair-needed copies. Managed startup calls `startup` before opening data. Code 103 launches the engine's recovery window and exits cleanly. The editor's real initialized signal permits `confirm`; then automatic checks run on a worker with `check --auto`. Manual checks omit `--auto`. Result events, exit codes, cached/offline state and diagnostics are retained; an error is never an up-to-date result.

Opening the update window leaves Studio usable. When an update is accepted, the engine requests normal closure of the actual host PID. A nonce-bound renderer handshake waits for pending actions and document acknowledgement, then flushes the service. Timeout/failure cancels closure. The SDK host, browser and service close before files are replaced. An owned check process is cancelled on shutdown; the detached update/apply window is not terminated.

`--cy-updated-from` is accepted and displayed. `CyDocStudioRuntime.exe --update-action info|check|window` uses the same adapter. Development/portable copies do not automatically check; broken managed registrations need a real setup/repair, never fabricated metadata or an old updater fallback. `--health-report` is a local test result written after actual editor initialization/confirmation, not a confirmation bypass.

## Verification

- `npm test --prefix studio`: save/close handshake and existing browser/service behavior.
- `node studio/desktop/test.mjs`: adapter protocol, settings preservation, worker shutdown and existing SDK/MCP behavior.
- `studio/desktop/verify-package.py`: actual frozen archive, private-state/dependency exclusions, CLI and a bilingual consumer export using only the packaged Node/compiler and all six optional media modules.
- `studio/desktop/test-installer.py`: real signed sandbox releases, occupied destination refusal, installed editor startup/confirmation, signature/hash failures, update/relaunch, rollback and uninstall data retention.
- `studio/desktop/test-installer-headless.py`: the real payloads from two local release directories, isolated signing/registration, update, service/editor initialization, rollback and data retention, without launching the native editor or installer UI.
- `studio/desktop/test-browser.mjs`: packaged editor in a disposable headless Chromium profile, French/light layouts, language/theme synchronization, saving and offline close protection. Its native bridge is simulated; this does not validate native CEF rendering or installer dialogs.

The end-to-end test uses the official `CYI_SANDBOX`/`CYI_RELEASES_DIR` fixture mechanism and a separate temporary key outside the checkout. It never publishes a fake future version, changes production trust, installs prerequisites globally or clears other applications' sandbox registrations. Process/protocol tests and native startup are reported separately from visual GUI approval and online GitHub publication.

```powershell
./studio/runtime/python/Scripts/python.exe studio/desktop/test-installer.py --payload artifacts/CyDocStudio-0.2.0-win-x64-payload --work .tmp/installer-acceptance-new
```

Use a fresh work directory for each run. `--reuse-releases .tmp/earlier-run/releases` copies an existing isolated fixture feed to avoid rebuilding it while debugging the harness; it refuses production trust. The setup itself runs directly with `--silent --dir ... --log ...`. Its interface arguments are separate from the engine's JSON CLI. Full file-by-file replacement/rollback of the bundled runtimes can take several minutes; engine operations have a fifteen-minute test deadline.

For background validation while someone uses the desktop, use the headless scripts instead of `test-installer.py`, which launches native windows. Install the optional browser test tooling in an ignored directory without download/install scripts, and use an existing Chrome executable:

```powershell
$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1'
npm install --prefix .tmp/headless-test-tools --ignore-scripts --no-audit --no-fund playwright@1.57.0
node studio/desktop/test-browser.mjs --studio artifacts/CyDocStudio-0.2.0-win-x64-payload/app/cydoc/studio --work .tmp/browser-acceptance-new
./studio/runtime/python/Scripts/python.exe studio/desktop/test-installer-headless.py --previous-release artifacts/CyDocStudio-0.1.4-release --next-release artifacts/CyDocStudio-0.2.0-win-release --work .tmp/installer-background-new
```

`test-browser.mjs --chrome PATH --playwright PATH` overrides the local Chrome executable and Playwright module directory. It blocks external requests and uses only its isolated loopback service. The headless installer script requires that tooling too. It never passes `--relaunch`, never invokes `cyinstall-ui` or Studio's desktop executable, and uses a unique fixture application ID. Confirmation follows the packaged service and headless editor initialization; native CEF startup, recovery dialogs and the update window's **Later** interaction still need separate native validation.

The harness records pre-update file hashes in `before-update.json` and completed checks in `checks.json`. If only the post-update wait/reporting was interrupted after a confirmed relaunch, `--resume-after-update --resume-log path/to/original-captured.log` continues that same work directory. It first requires the installed version, confirmed startup and recorded hashes to match; the final report explicitly records resumption. Native shutdown may drain services after the window closes, so the unowned relaunch has a ninety-second exit deadline. Process results on stdout use JSON; the engine's operation log is human-readable text.

## Linux and combined publication

Build on Linux with `studio/desktop/build-linux.py`, then use `pack-linux.py` with the matching Linux engine/UI. Keep the publisher private key on the signing machine. Transfer the unsigned Linux stage there and call `merge-release.py --windows WINDOWS_STAGE --linux LINUX_STAGE --engine CYINSTALL_EXE --key PRIVATE_KEY --out FRESH_RELEASE_DIR`. The merge validates platform hashes and manifest identity, generates common update metadata, signs it with the permanent key and recomputes checksums.

Linux native rendering can be checked with `test-native-linux.py` in its private Xvfb display. `test-installer-linux.py` checks an isolated native install/update/relaunch/rollback cycle; its next version is a local fixture, never a public release. Neither script uses the interactive desktop.

On Windows, `test-native-windows.py --release STAGE --work .tmp/FRESH_DIR` checks the actual offline setup and native editor/assistant/updates on a private invisible desktop. It never switches desktops. `--resume-setup` may reuse only that same test directory's completed setup. The production payload, permanent trust and user workspace are not modified by these fixtures.

Run `node studio/desktop/verify-release.mjs --release COMBINED_STAGE --report .tmp/release-verification.json` after merging. It verifies the permanent manifest identity, Ed25519 signature, both platform asset sets, exact asset sizes and all SHA-256 checksums, using Node built-ins. It does not replace native setup or archive-to-payload verification.
