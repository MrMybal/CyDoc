# CyDoc Studio

An optional authoring application for CyDoc: a browser editor, a Windows CyUI/CEF shell, and local JavaScript/Python SDK and MCP access through CyToolsCore. The static reader remains independent: installing Studio does not add editor dependencies to exported manuals.

Studio supports English and French interfaces, visual and Markdown editing, shared Yjs documents, live presence, automatic saving, page properties and hierarchy, private working history, local media, reader previews and publication. Projects work in ordinary folders without Git. Git can be enabled separately, with documentation commits, diffs, branches, history and HTTPS remotes.

## Windows download

[Download CyDoc Studio 0.1.2](https://github.com/MrMybal/CyDoc/releases/tag/studio-v0.1.2). Extract the complete Windows x64 ZIP, then start `CyDocStudio.exe`. Keep the adjacent `app/`, `runtime/` and `LICENCES/` directories. Node.js, Python and CEF are bundled; no separate runtime installation or local account setup is needed. This is a portable application, not an installer, and its executables are not code-signed.

The release includes `SHA256SUMS.txt`. Compare its ZIP hash with `Get-FileHash ./CyDocStudio-0.1.2-windows-x64.zip -Algorithm SHA256` before extracting. Project data is stored separately in `%LOCALAPPDATA%/CyDocStudio`; `--data PATH` selects another private location. The current Python CyUI CEF bridge runs without the CEF process sandbox on Windows. Open trusted documentation projects; native builds for other operating systems are not included.

## Work locally without an account

The Windows application opens directly in account-free local mode. There is no registration, password, sign-in screen or SDK token to create. Existing projects in its private workspace remain available; earlier accounts and their credentials are preserved without being used in local mode. Preferences replaces the account panel, and team invitations are hidden.

To use the browser editor the same way, append `--local` when starting it:

```sh
npm start --prefix studio -- --local --data ./data --port 4310
```

Local mode is restricted to the current machine's loopback interface, rejects a public origin and cannot bind to a LAN/public address. SDK/MCP clients supply only `CYDOC_STUDIO_ORIGIN`; omit `CYDOC_STUDIO_TOKEN`. Other processes and users on the same machine can access this workspace while the local service is running. Project files and optional Git access work as usual. Local projects do not create hidden accounts or sessions.

Use a separate service data directory for an online installation. Local-only projects have no hosted members; explicitly attach their application folders to an authenticated project when migrating online. Starting the service without `--local` always requires authentication, even when it previously ran in local mode.

## Try the bundled CyDoc example

On the Projects screen, choose **Open the CyDoc example**. Studio copies the maintained CyDoc manual into a new private project: English/French pages, editable API references, code samples, diagrams, image/GIF/video/mesh examples and galleries. It works without Git and does not change the library's authored files or another example copy. Imported API pages are editable snapshots in this sample; it does not include raw implementation listings. The sample uses one edition; multi-version builds remain a separate CLI feature.

The desktop has full-window **Editor**, **Documentation**, **Options** and **Local MCP / SDK** tabs. Documentation has its own retained browser view and opens the bundled CyDoc manual directly; returning to Editor keeps your document and scroll position. Options manages appearance and application folders; Local MCP / SDK shows the configuration for the actual running endpoint. The browser toolbar also provides the manual.

## Run the web editor with accounts

Use Node.js 22 or later. From the CyDoc checkout:

```sh
npm ci
npm run build
npm ci --prefix studio
npm run build --prefix studio
npm start --prefix studio -- --data ./data --port 4310
```

Open `http://127.0.0.1:4310`. Create the first administrator using the one-time setup code printed in the server terminal. Choose your own email and a password of at least 12 characters. Registration then requires a project invitation; Studio does not send email. Project owners copy invitation links and share them with the intended recipient.

An owner can invite editors and viewers. Editors change the manual; viewers cannot write through either HTTP or collaboration sockets. Owners manage settings, publication, members and Git. Local application folders may be attached only by the administrator, after the operator explicitly allows their paths:

```sh
npm start --prefix studio -- --data ./data --allow-root /path/to/your/application
```

Create a new folder project, attach an allowed application folder, or clone a repository. Studio opens an existing `.CyDocBuild/cydoc.config.json` or initializes that layout when no authoring workspace exists. A partial workspace is preserved for explicit migration. Private HTTPS clones can supply a project-specific username/token. Folder projects do not require Git or a remote account.

```text
Application/
  .CyDocBuild/
    cydoc.config.json
    manual/en/
    manual/fr/
    assets/
    internal/                 # Private working revisions and temporary builds
  Documentation/
    Documentation.html
    DocAI.md
    DocData/
```

Both language versions are created together with the same stable ID. New pages are empty drafts. Write the English original and the complete French translation, then explicitly mark French reviewed in page properties. English body/title/description changes make the translation stale. Parent/order changes apply to both language versions. Publication uses CyDoc's normal mandatory coverage, anchor, link and media checks; an incomplete draft can be edited and previewed but cannot be published.

The visual editor retains explicit heading anchors and CyDoc fences. Media blocks display a card with their local preview and editable JSON configuration. Markdown mode exposes the original syntax for advanced content, including diagrams, Blueprints, tabs, annotations and comparisons. The preview uses the actual reader with the project's selected modules. CLI-generated source/API pages remain generated references; Studio does not edit application implementation files.

An external file change blocks conflicting autosaves. Download the local draft before using **Reload external file** to discard the editing room and read the changed file. Earlier-generation local drafts are retained without automatic merging. Working revisions can be restored from page history. Browser drafts are scoped to account/project/page; use a trusted browser profile for private manuals.

**Publish** builds into a private staging directory before updating the public folder. It does not push Git. The generated reader can be opened directly through `file://`, hosted statically, or downloaded as `Documentation.zip`. Web ZIP downloads are limited to 256 MiB and individual media imports to 64 MiB. Preserve the complete public folder when distributing it.

## Host online with accounts and simultaneous editing

The editing service requires persistent server storage and WebSocket support. Unlike reading an exported manual, editing is not a static-host-only application. Run one Studio process per data directory; the directory lock prevents two writers. This version is a single-server deployment, not a multi-node collaboration cluster.

Keep `data/` private and outside the served document root. Back it up with its Git credential key; that directory contains accounts, sessions, collaboration state, project permissions and project files. The service stores password hashes and hashes of session/SDK tokens. Git credentials are encrypted separately from repositories. Protect server storage with the operating system's user permissions and encrypted disks as appropriate.

Terminate HTTPS at your reverse proxy and supply the exact external origin:

```sh
node studio/server/cli.mjs --data /srv/private/cydoc-studio --host 127.0.0.1 --port 4310 --origin https://docs-editor.example.com
```

See [deploy/nginx.conf](deploy/nginx.conf) for HTTP/WebSocket proxy settings. Serve Studio at the origin root. Configure TLS, backups and process supervision on the host. No hosted service, email delivery, identity provider or domain is provisioned by this repository.

Collaboration synchronizes canonical Markdown through Yjs; source and visual views use the same room. Undo tracks local editing transactions. Saving and automation use the same workspace and revision checks. Branch switching and pulling require other editors to close that project; pull accepts only fast-forward changes. There is no force push or destructive reset UI.

Git uses a project-specific credential, rather than the server operator's global Git credential manager. Configure it in the Git panel. It is not returned by the API or written to a manual, job argument or Git configuration. Supported remote hosts are currently `github.com`, `gitlab.com` and `bitbucket.org`; HTTPS only. SSH remotes and arbitrary custom Git hosts are not enabled. Keep credentials out of source URLs and MCP parameters.

## Local SDK and MCP

For an account-based service, create a 30-day SDK token in **Account**; it inherits that account's project permissions. Revoke SDK tokens from the same panel. Store the token only in private environment/configuration.

JavaScript:

```javascript
import { StudioClient } from './studio/sdk/client.mjs';

const studio = new StudioClient(process.env.CYDOC_STUDIO_ORIGIN, process.env.CYDOC_STUDIO_TOKEN);
const project = await studio.createProject({ name: 'Example App', git: false });
const page = await studio.page(project.id, 'en', 'overview');
await studio.updatePage(project.id, 'en', page.id, page.body + '\nAdditional instructions.\n', page.revisionToken);
```

The Python SDK is [desktop/app/sdk.py](desktop/app/sdk.py). The CyTools facade [desktop/app/tool.py](desktop/app/tool.py) uses the actual [CyToolsCore](https://github.com/MrMybal/CyToolsCore) runtime, schema validation, job ownership, input imports and official MCP transport. Install the MIT CyToolsCore package with its `mcp` extra in your private Python environment.

```sh
python studio/desktop/app/tool.py --data-dir /private/cydoc-jobs describe
python studio/desktop/app/tool.py --data-dir /private/cydoc-jobs mcp
```

Set `CYDOC_STUDIO_ORIGIN` for that process and, for an account-based service, `CYDOC_STUDIO_TOKEN`. The service must be running. Never point an MCP client at the JSONL `stdio` command; use `mcp`. Operations are discovered as `op_create_project`, `op_get_page`, `op_update_page`, `op_import_asset`, `op_publish_project`, `op_git_action`, and the other operations in [CyTool.json](desktop/app/CyTool.json). Calls return jobs; poll `cy_get_job` until Completed/Failed/Cancelled and inspect the final outputs. An accepted job is not a completed write. Missing/stale `revisionToken` values do not overwrite another editor's work.

An MCP import accepts the absolute original media path. CyToolsCore stages a task-owned copy automatically; importing into the manual is an explicit persistent save. Task cleanup removes staged inputs, not the original or the manual's saved asset. Credential creation and account setup stay in the interactive account/Git panels; do not submit secrets as job parameters.

The Windows shell's **Local MCP / SDK** panel provides the executable path and a configuration template for its running service. Local mode needs no Studio token; online mode uses the account token. It does not alter another application's MCP configuration. Give separate standalone MCP processes distinct job directories, or use CyToolsCore's shared `serve` / `--connect` workflow with distinct client tokens; independent processes cannot own the same runtime directory.

## Build Windows

The native shell uses [CyUI](https://github.com/MrMybal/CyUI) Core and its optional WebCEF adapter; the browser is CEF, rendered inside the ImGui window. Supply matching, already built CyUI CEF bridge/helper and Chromium runtime files. See CyUI's `docs/WEB.md` for building and packaging them. Do not substitute an arbitrary mismatched `libcef.dll`.

Compile CyUI adapter sources with relative source paths for distribution, so native diagnostics do not embed a developer's checkout path. `-CefBridgeRoot` can supply separately rebuilt `cyui_webcef_bridge.dll` and `cyui_webcef_helper.exe` from the same CyUI/CEF version, while `-CefRoot` supplies the remaining runtime. Packaging excludes dependency development logs, type stubs, caches and local pip provenance while retaining component notices.

With Python 3.11+, Node.js 22+ and MSVC C++ build tools:

```powershell
./studio/desktop/build.ps1 -CyToolsCoreRoot /path/to/CyToolsCore -CyUIRoot /path/to/CyUI -CefRoot /path/to/CyUI/build/cef -NodeLicense /path/to/node/LICENSE
```

Supply the complete license for the Node.js version being embedded. CEF notices are read from its SDK path in `CMakeCache.txt`, or an explicit `-CefSdkRoot`. The output is `artifacts/CyDocStudio-Windows/CyDocStudio.exe`, with application files under `app/`, engine/interpreter files under `runtime/` and component notices in `LICENCES/`. The build refuses to overwrite a nonempty output directory. User state defaults to `%LOCALAPPDATA%/CyDocStudio`; `--data` overrides it. A source launch uses:

```sh
python studio/desktop/app/main.py --cef /path/to/CyUI/build/cef
```

The default is the library’s Dark theme. Use **Options** to persist language, one of the six library themes (Light, Dark, Midnight, Nord, Paper and High contrast), text scale and an allowlist of application folders. Choosing a local folder opens the project form; the administrator confirms the import or initialization. Saved UI configurations contain versioned appearance values, not passwords or tokens. `--origin https://your-studio.example.com` connects the same shell to an online service.

The local desktop service prefers port 4310. If another service already uses it, Studio selects an available port and remembers it; its MCP panel shows the actual endpoint. The current Python CEF bridge runs **without the CEF process sandbox on Windows**, as documented by CyUI. Its exact-origin navigation policy remains active. Production deployments that require a sandboxed native browser must supply CyUI's documented sandbox-capable native bootstrap; this build does not claim sandboxing. Windows CEF IME/accessibility, codecs and WebGL behavior need target-specific validation beyond launching the editor. No Linux/macOS desktop package is supplied here.

## Development checks

```sh
npm test
npm test --prefix studio
node studio/desktop/test.mjs
```

The last command uses `studio/runtime/python/Scripts/python.exe` by default; set `CYDOC_TEST_PYTHON` for another prepared Python environment. It creates a disposable local service and exercises the real CyTools SDK and official MCP client. These are development checks, kept outside exported human manuals.

See [LICENCES.md](LICENCES.md) for component attribution and [../ai/STUDIO.md](../ai/STUDIO.md) for agent integration guidance.

Studio builds its theme catalog, labels and palette tokens from the library registry and reader stylesheet. Native Options, editor Preferences and the bundled manual share these six IDs and synchronize selections. Saved legacy Studio themes migrate to the closest library theme. Exported application manuals retain their independent reader theme controls.
