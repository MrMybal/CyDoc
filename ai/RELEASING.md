# Local Studio publication

This guide is for maintaining this checkout. Publication, release deletion and pushing require an explicit user request; ordinary development does not grant that authorization. Build and upload locally. The Pages workflow is manual-only and must not be invoked when the user requests publication without GitHub Actions.

## Establish what is ready

Read `AGENTS.md`, `studio/README.md`, `.cyinstaller/README.md`, `CHANGELOG.md` and the bilingual README/version files. Check the worktree, remote branch and existing releases before mutation. Keep the three-column README composition and use only actual downloads. A source version is not a published binary. Do not delete existing releases while a requested replacement platform is still unavailable.

The native shell has Windows x64 and Linux X11 backends. Each Linux release requires a real native Linux build, matching CEF runtime, native assistant, Linux CyInstaller engine and target tests. A ZIP containing Windows executables or the browser service alone is not a native Linux Studio release. Keep publication pending until every platform required by the user passes.

## Validate and scan

Use Node.js 22+. Run `npm test`, `npm run build --prefix studio`, `npm test --prefix studio` and `node studio/desktop/test.mjs`. Select the actual packaged executable and host with `CYDOC_TEST_EXECUTABLE` and `CYDOC_CYMCP_HOST`; exercise both the account-free and account modes. Deterministic assistant tests do not prove real provider authentication.

Use `studio/desktop/verify-package.py` on each target OS against its complete payload. The optional headless browser and real installer update/rollback tests are documented in `.cyinstaller/README.md`. `test-native-windows.py` creates a private invisible Windows desktop and never switches to it; `test-installer-linux.py` uses a private Xvfb display. They exercise the actual offline setups without touching the input desktop. The older `test-installer.py` opens windows on the active Windows desktop and must not run while the user reserves desktop control. Keep all fixtures, reports and screenshots in ignored temporary directories. Never clear other applications' sandbox registrations.

With a trusted local Gitleaks executable, scan the candidate source snapshot, staged changes, Git history and assembled payloads. Redact findings in logs. Example Git commands:

```sh
gitleaks git --pre-commit --staged --redact --report-format json --report-path .tmp/gitleaks-staged.json .
gitleaks git --log-opts="--all" --redact --report-format json --report-path .tmp/gitleaks-history.json .
```

An ignored build tree is not a source snapshot. Export only tracked files and intended untracked inputs, excluding ignored credentials, runtime state and distributions. Review the exact staged filenames and diff before committing; preserve unrelated user changes.

## Package and publish

Build from sources with the pinned CyMCPSDK revision. Use the real CyInstaller CLI/UI and the permanent manifest application ID/public key. The publisher private key stays outside Git and payloads; release scripts take its path explicitly and never rotate it. Ed25519 signatures do not replace Windows Authenticode.

Verify every checksum, the Ed25519 signature, asset sizes and the exact archive-to-payload match before upload. Keep setup, bootstrap, payload, engine archive, manifest, signed `update.json` and checksums together. The application version, release tag, manifest and CyInstaller feed must agree. Preserve a verified local copy of old release assets/metadata before an explicitly requested release deletion; release deletion does not authorize deleting Git tags or rewriting history.

Push normally after checking the remote head. Do not force-push or run a workflow. Create a draft release, upload the full verified asset set and verify its content before publishing. Inspect the actual GitHub README in both languages after pushing; check the logo, table borders, columns, license/version/stage order and downloads. Keep visual evidence outside human documentation and distinguish native tests, headless browser checks and online update discovery.
