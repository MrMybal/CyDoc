# CyDoc Studio integration

Current Studio sources are version 0.2.0. In a checkout, `.cyinstaller/README.md` documents the installer contract, local release commands and end-to-end tests. CyInstaller 0.1.0 owns update discovery, verification, download, apply, relaunch and rollback. Do not add an independent updater or fabricate `_cyinstall` metadata in a compiled payload. Studio binaries and installer dependencies remain outside the root reader/npm runtime.

The native shell has Windows and Linux X11 backends. `desktop/build-linux.py` builds the CEF bridge and native assistant from local source checkouts; Ubuntu 24.04 x64 is the current Linux validation target. The X11 child panel has its own ImGui context, as on Windows. Linux data uses `$XDG_DATA_HOME/CyDocStudio` or `~/.local/share/CyDocStudio`. `SIGTERM` requests the same save acknowledgement as a normal close, rather than terminating pending work. Linux executable names have no `.exe` suffix. A pure Wayland session without an X11 display is not supported by this host.

Ship the service and generated editor UI together. Save acknowledgements include the persisted text's SHA-256 and Yjs vector: deletions do not advance that vector. Initial no-op sync waits for queued writes before acknowledgement, without rewriting the page. Native closure drains acknowledgement processing after the final flush; Ctrl+S must not force a saved label.

Studio is a separate authoring product in `studio/`, not part of the reader runtime or the root npm archive. Read the [Studio guide](https://github.com/MrMybal/CyDoc/blob/main/studio/README.md) for its actual deployment and Windows dependency instructions; the same guide is `studio/README.md` in a checkout.

Keep source inputs in `.CyDocBuild/`; never use a generated `Documentation.html` or `DocData/data.js` as an editing source. Studio saves drafts, whereas publication still requires complete English originals and French translations. Review translations before setting `translationReviewed`; coverage cannot establish linguistic correctness. Stable IDs and explicit anchors are public contracts.

Use the Studio service from JavaScript/Python SDKs or the native CyMCPSDK 0.7.5 host. Windows starts in account-free local mode; the browser CLI selects it explicitly with `--local`. This mode is loopback-only, has no accounts/sessions, and SDK/MCP clients omit `CYDOC_STUDIO_TOKEN`. The default web service and remote connections retain mandatory accounts; never expose account-free mode on a network. Use separate online service storage and explicitly attach local application folders when migrating. For account-based services, a private `CYDOC_STUDIO_TOKEN` selects the account; project permissions are enforced in the service. Business parameters never select another user's identity. Read `get_page`, preserve its `revisionToken`, then call `update_page`; a 409 conflict requires rereading and reconciling the content. Do not blindly retry a write with another user's new revision.

Discover the native Registry with CLI `list` / `describe` or MCP tools/list rather than inventing operation names or fields. `CyMCP.json` provides its business schemas. Direct names return final results; compatible `op_*` calls accept `{parameters: {...}}`, create persistent jobs and require polling `cy_get_job`. Use `mcp` for stdio MCP; no legacy JSONL transport remains. Media import stages a private job copy. Explicit saved documentation persists after task cleanup. Original files must remain intact.

Git is optional. Publication does not imply a commit or push. Git remote credentials and account setup belong to private host configuration or interactive panels; never put secrets into job parameters, Markdown, media assets or a repository URL. Git commits stage documentation paths only and refuse unrelated staged application files. Branch switching/pull require editors to close the project; no force/reset operation is exposed.

The browser's Insert a block dialog provides guided `diagram` models for flow, decision and sequence diagrams. It edits the same JSON stored in Markdown, with stable element IDs, automatic placement and the shared build-time SVG renderer for its local preview. Generated labels follow the page's content locale, independently of the Studio interface locale. Preview links are inert. Invalid JSON or diagram structure disables insertion; the user can correct it in Advanced JSON. Other supported diagram types remain editable through JSON. This adds no SDK/MCP operation and no runtime diagram engine to exported manuals.

The same dialog provides a guided `steps` form with title, Markdown action, optional expected result and troubleshooting, plus add/remove/reorder controls. It requires 1–50 steps with nonempty titles and actions. The form and Advanced JSON stay synchronized; malformed JSON disables the stale form and insertion until corrected. Reordering retains entire items, including custom properties and IDs. Prompts are UI translations and are never inserted into authored content. Existing steps blocks retain their JSON editor. Use the real page preview after insertion to inspect rendered Markdown; this form adds no compiler dependency to Studio's browser bundle and no SDK/MCP operation.

Reading-path `previous`/`next` fields are authored in source frontmatter, not currently exposed by the properties form or `updateMetadata`. Ordinary content/property saves preserve them, including explicitly empty endpoint values. The isolated one-page preview omits these fields and `parent`, while full publication validates the complete manual's destinations. Explicit `kind` and an omitted description are normalized consistently for the draft preview.

A browser editor requires a service for storage/WebSockets and, when hosted, accounts. This does not change the exported reader's `file://` contract. Do not expose the native CyMCPSDK loopback endpoint as a public web API; Studio's account/authenticated workspace service is the web boundary. HTTPS and persistent private storage are required for hosting. One process owns each data directory; multi-node collaboration and identity-provider/email integration are not implemented.

SDK examples live outside human application manuals. Keep working histories and account/service metadata outside the exported reader. Preserve CyUI, CyMCPSDK, libcurl, CEF and other component notices when packaging the desktop product. Report only platforms and transports actually checked.

To create a disposable editable copy of the bundled CyDoc manual, call `create_project` with `name` and `template: "cydoc"` (no `path` or `remote`). The sample contains both complete languages and API-only snapshots, copied into its own `.CyDocBuild/`; no library inputs are modified. Templates are generated by the Studio build and included in desktop distributions.

Studio 0.1.2 uses full-window Editor/Documentation/Options/MCP tabs. The reader has its own retained CEF view; native navigation does not depend on JavaScript message delivery. Appearance uses validated theme IDs and a renderer-ready handshake, with the library’s Dark default. All six library themes are consumed directly: `studio/dist/themes.json` and `themes.css` are generated from `src/themes.ts` and `src/viewer.css`. Do not maintain a separate truncated catalog or inject raw CyUI palette values into editor CSS. The bundled manual has a Studio-only theme bridge; this does not change exported reader files. Windows release archives bundle their runtimes and notices; preserve their complete directory structure.

## Native automation in current source builds

The current source integration uses CyMCPSDK **0.7.5**, revision `35d2d4fd85982d3d0ba278594e85fa37f325b4f2`. The published Studio 0.1.2 archive predates this migration. `desktop/build-native.ps1` verifies the revision and builds Core, HTTP, MCP, AI and ChatUI from local SDK/CyUI sources. The root reader and npm archive acquire no native dependency. Never replace a source build with an unrelated SDK example binary.

`desktop/native/main.cpp` owns the single Registry, schema/policy checks and transports. Its actual business handlers call the private Python bridge, which serializes jobs and uses Studio's existing HTTP service. The Node service owns project persistence and broadcasts collaboration changes. The native UI uses ChatController and ChatPanel on its own UI thread, with provider I/O on SDK workers; its child window avoids mixing C++ and Python ImGui ABIs. The parent owns and closes the native host. Hidden assistant panels keep polling without rendering continuously.

### Registry operations

| Operations | Purpose | Read only |
| --- | --- | --- |
| `list_projects`, `get_project` | Visible projects and page trees | Yes |
| `create_project` | Folder, Git, allowed application path or `template: "cydoc"` | No |
| `create_page`, `archive_page` | Bilingual page creation and archival | No |
| `get_page` | Markdown and revision token | Yes |
| `update_page`, `update_metadata` | Conflict-checked content or properties | No |
| `update_settings` | Project settings and enabled modules | No |
| `list_assets`, `import_asset` | Media inventory or persistent import | Yes / No |
| `publish_project`, `export_manual` | Build the reader or save a job-owned ZIP | No |
| `git_status`, `git_action` | Repository state or explicit Git action | Yes / No |
| `list_members`, `invite_member`, `remove_member` | Account-based project membership | Yes / No / No |
| `page_history`, `restore_page` | Saved revisions or conflict-checked restoration | Yes / No |
| `preview_page`, `reload_external` | Draft preview or load external edits | Yes / No |

`git_action` remains conservatively mutating because one operation includes writes. `export_manual` writes a retained output file. All 22 operations also have asynchronous `op_` wrappers. `cy_get_job`, `cy_list_jobs` and `cy_cancel_job` expose persistent state and cooperative cancellation. The same Registry serves chat, MCP and native SDK/CLI invocations; the direct JavaScript/Python HTTP clients remain compatible service clients.

Account creation, authentication, token/Git credential entry, native preferences, file-picker dialogs and rich-block visual forms are not public Registry operations. These need human account decisions, private credential handling or UI state. Content and media produced by forms remain editable through the documented page/asset operations. No raw implementation listing or automatic Git force/reset is exposed.

### CLI and Python SDK

```sh
python studio/desktop/app/tool.py --help
python studio/desktop/app/tool.py --data-dir /private/cydoc-cli list
python studio/desktop/app/tool.py --data-dir /private/cydoc-cli describe update_page
python studio/desktop/app/tool.py --data-dir /private/cydoc-cli call list_projects --json '{}'
python studio/desktop/app/tool.py --data-dir /private/cydoc-cli call create_project --json '{"name":"Example manual","git":false}'
```

Set `CYDOC_STUDIO_ORIGIN` to the running editor service and `CYDOC_STUDIO_TOKEN` only for its account mode. A graphical window is not required: CLI handlers use the actual service and its collaboration state. With no service, business calls fail on stderr and exit nonzero; they do not start an unseen workspace. List/describe need no service. Successful calls print JSON on stdout, errors print JSON on stderr, and argument help follows argparse conventions. No MCP server is started by list/describe/call.

The packaged equivalent is `runtime/desktop/CyDocStudioRuntime.exe --tool`. `CYDOC_CYMCP_HOST` can select a separately built native host. In Python, `host.NativeHost(data)` is a context manager; `start()` returns its live endpoint and `request({"method":"invoke","name":"get_page","arguments":{...}})` invokes the Registry over its private authenticated SDK channel. Call `close()` or leave the context to cancel eligible work and close owned transports.

### Jobs, migration and cancellation

Use the same private job directory to retain `state.sqlite3`, existing job IDs, workspaces and output paths. The new scheduler keeps the existing `records` table and terminal jobs unchanged. Interrupted nonterminal jobs become Failed/Interrupted; they are never automatically replayed. A SQLite lifetime lock prevents two schedulers owning the same directory. Existing client/session metadata is retained in the database; Free local access does not require those old client credentials.

`op_update_page` accepts `{"parameters":{"projectId":"…","locale":"en","pageId":"overview","revisionToken":"…","body":"…"}}` and returns `{"jobId":"…"}`. Poll `cy_get_job` with `{"jobId":"…"}`. Completed results are in `outputs.result`; Failed/Cancelled jobs carry `error`. List retained outputs with `cy_list_jobs`. ZIP exports remain in each job's `outputs/Documentation.zip`; copy the output when distributing it. Original imports are copied into a new job's `inputs/`, then removed after execution; originals and saved project media are preserved.

Read/preview/download jobs support cooperative cancellation. A running service request may finish before cancellation is observed. Submitted write jobs reject cancellation, because an already committed save, publication or Git action cannot be rolled back. Stop interrupts the assistant's provider turn and future tool rounds; it does not undo successful application actions. Always inspect final job state after a connection loss. Closing the host waits for its business worker; the HTTP service client has a bounded request timeout.

### Local MCP profiles and discovery

Studio starts a loopback server with its native host. The Local MCP / SDK tab shows its actual URL. Connect using `{"mcpServers":{"cydoc-studio":{"url":"http://127.0.0.1:PORT/mcp"}}}`. Standalone stdio uses `tool.py --data-dir /private/cydoc-mcp mcp`; `serve` starts HTTP and prints readiness. Give independent processes distinct job directories.

`jobs/mcp-settings.json` is optional: `{"profile":"free","port":0}`. Port 0 chooses an available local port. Existing files and unrelated keys are preserved. Changing a profile requires restarting the host.

| Profile | Token required | Registry operations |
| --- | --- | --- |
| `free` (new default) | No | All exposed operations |
| `local-controlled` | No | Read only |
| `token-only` | Yes | All exposed operations |
| `protected` | Yes | Read only |

Token profiles read `CYDOC_MCP_TOKEN` from the host environment and require at least 32 characters. A missing credential fails startup instead of silently reverting to Free. Tokens never appear in the public announcement. Account-mode `CYDOC_STUDIO_TOKEN` is separate and still selects the service identity. Public `GET /.well-known/cymcp` advertises CyDoc Studio, server version, `/mcp` and `requiresToken`, including in protected mode. CyMCPHub performs port discovery. `/v1` keeps an independent generated host credential and only accepts the private host identity; the `/mcp` handler is separate.

### Assistant and optional remote tools

The Assistant tab detects installed CLI providers and configured/local HTTP services on a worker. Availability is not an authentication claim. Choose an explicit model from a real catalogue; only native CLI defaults and local services can select automatically. Remote API catalogues require a deliberate model choice. Manual fields accept a provider executable, service base URL and the **name** of an API-key environment variable. Advanced JSON settings stay in memory; API keys are never serialized. Named histories are private SDK ConversationStore files under `jobs/conversations/`, with exact native session restoration where supported. Use another conversation name for a new conversation.

Codex and API providers receive the Registry directly. Claude Code uses native HTTP MCP settings; ACP profiles receive their native `mcp_servers` configuration. Providers whose SDK adapter cannot attach Studio's tools report Unsupported instead of pretending the tool connection exists. Their native configurations may still require a provider-specific integration. No CLI authentication flow runs automatically. Local providers require an existing optional Ollama, LM Studio or llama.cpp service; Studio does not install engines or download weights implicitly.

For additional applications, place an explicit array in `jobs/remote-mcp.json`, for example `[{"id":"other-app","url":"http://127.0.0.1:PORT/mcp","tokenEnvironment":"OTHER_APP_MCP_TOKEN"}]`. Omit tokenEnvironment for tokenless servers. Non-loopback connections require HTTPS. At most 16 unique ASCII connection IDs are accepted. Connections load on a background worker; call `remote_refresh` to retry or reload changed catalogues. Tools appear as `remote.other-app.TOOL_NAME` in the same Registry, with their advertised read-only policy. The SDK McpClient handles protocol, schema retrieval, caching and cancellation. Errors remain errors; unavailable catalogues remove stale callable tools. No connection is inferred from manual content or a model response.

The Registry publishes change notifications and cached MCP catalogues. Providers use the SDK's deferred tool discovery above its normal threshold; large tool results then retain SDK resource handles/chunks rather than losing full data. Advanced connection settings offer an explicit API context limit in KiB (0 keeps full context); the complete local history remains available, and native-session providers keep their own context. The host does not silently summarize away pages or truncate a manual. Diagnostics and connection errors must stay free of credentials. Headless `CyDocStudioHost --discover` lists detected IDs/states, and `--probe URL` verifies the public MCP identity without listing or invoking its tools.

### Build and verification

Use `desktop/build-native.ps1 -CyMCPSDKRoot PATH -CyUIRoot PATH -CurlRoot PATH -Test`, followed by `npm run build --prefix studio` and `node studio/desktop/test.mjs`. Python test dependencies are separate in `desktop/requirements-test.txt`. The SDK's own tests are source-built, while the desktop tests exercise actual Studio handlers, persisted jobs, revision errors, official MCP discovery, profiles, CLI writes and a deterministic streaming provider. Simulated provider tests do not validate real accounts or native devices. Real-provider checks are explicit local verification, never an automatic paid CI step.

`desktop/build.ps1` packages the native host beside the frozen Python/CyUI shell, with SDK/CyUI/curl/transitive notices and the exact SDK revision. It excludes developer artifacts and never ships model weights or CUDA by default. Validate the frozen CLI and graphical shell against a new temporary data directory. Keep account databases, conversations, credentials, profiles and build outputs out of Git. Build, test and Gitleaks checks remain local; this task does not authorize a release upload or deployment.
