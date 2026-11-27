---
id: studio
title: CyDoc Studio
description: Write, organize and publish documentation with the visual and Markdown editor.
section: Getting started
order: 3
revision: 6
---
CyDoc Studio is the optional editor for CyDoc manuals. Work locally without an account, or join a hosted workspace to write with your team. Your published documentation remains independent of Studio.

## Start locally {#start}

[See available Studio downloads](https://github.com/MrMybal/CyDoc/releases). Studio 0.2.0 packages are being prepared; the current published portable Windows build is 0.1.2. Source builds provide a Windows `.exe` setup and a Linux `.run` setup (make the latter executable before starting it). Linux requires an X11 display and OpenGL 3.3; Ubuntu 24.04 x64 is the validation target. The installer lists required runtime libraries before installation.

Start **CyDocStudio.exe** on Windows or **CyDocStudio** on Linux. The application opens directly without registration or sign-in. A portable payload can also be extracted in full; keep its adjacent folders together. Managed updates require installation with CyInstaller.

The **Editor**, **Documentation**, **Assistant**, **Updates**, **Options** and **Local MCP / SDK** tabs occupy the application window. Documentation opens the bundled manual in its own view. Returning to Editor retains your working page and scroll position.

The browser editor also supports account-free local work when its service is started with `--local`. Local editing is limited to the current machine. Reading an exported manual needs no editing service.

## Use the assistant {#assistant}

In **Assistant**, choose an installed provider or a service you have configured, select a model, then connect. API connections use the name of an environment variable containing your key. Studio does not install models or sign in to a provider automatically.

Ask for help organizing or editing your documentation, then review the resulting changes. Stopping a response cancels further generation; it does not undo edits already saved. Use a separate conversation name to start another discussion.

## Install updates {#updates}

In **Updates**, check for a newer version and open CyInstaller to review it. Opening this window leaves Studio running. Accepting an update requests normal closure after pending work is saved. Projects remain in their separate data directory; CyInstaller also provides verification, recovery and rollback controls.

## Choose a project {#projects}

Choose **Open the CyDoc example** on the Projects screen for a complete editable manual with English/French pages, code samples, diagrams, images, GIFs, videos, meshes and galleries. Each copy is independent, so you can experiment freely.

Use **New project** to start your own manual. Folder projects work without Git. In the desktop application, Options lets you allow and open an existing application folder. Documentation inputs stay in `.CyDocBuild/`; published files go into `Documentation/`.

## Write and organize pages {#write}

Select a page in the tree, then choose **Visual** or **Markdown**. Both views edit the same content. The toolbar provides headings, lists, emphasis, links, code and tables. Autosave records your changes; page history lets you restore earlier working revisions.

Page properties contain its title, description, section, parent and order. Use parent pages to create a clear hierarchy. Keep page IDs and explicit heading anchors stable: application help links and links from other pages depend on them.

If a file changes outside Studio, resolve the conflict before saving. Download your local draft if you need to keep it, then use **Reload external file** to load the external version. Studio does not silently overwrite conflicting edits.

## Add media and rich content {#media}

Import local files through the media library, then use their `assets/` paths in your content. Enable only the modules needed by your project in Project settings: image, video, GIF, mesh, gallery and graph. Galleries also need the readers used by their items.

The visual editor shows rich media as cards with a local preview and editable JSON configuration. For a new diagram, use **Insert a block → diagram** and choose **Flow**, **Decision** or **Sequence**. Edit its title, explanation, elements and connections in the form; the preview updates immediately. Use **Arrange automatically** for flow and decision layouts, or **Advanced JSON** for custom properties and other diagram types.

For a tutorial or a series of troubleshooting checks, choose **Insert a block → steps**. Give each step a title and an action. Open **Result and troubleshooting** to add the expected result and optional help if the action fails. Move steps up or down to adjust their order. Use **Preview** after insertion to check the reader's presentation. See the [step-by-step example](doc:rich-content#steps).

Markdown exposes the full CyDoc syntax for [media](doc:media), [diagrams](doc:diagrams), [node graphs](doc:blueprints), annotations and comparisons. Existing blocks retain their editable JSON. Page preview uses the actual reader and your selected modules.

## Complete both languages {#translations}

Write the English original and the complete French translation, keeping the same page ID and explicit anchors. New pages start as drafts in both languages. Translate the title, description, body, captions and annotation text.

After reviewing the French page, mark its translation reviewed in page properties. Changing the English title, description or body makes that translation outdated. You can keep editing and previewing drafts, but publication requires both languages to be complete and current.

## Preview and publish {#publish}

Use **Preview** to inspect the current page in the reader. **Publish** builds the manual and checks its translations, links, anchors and media before updating the public folder. Publication does not automatically commit or push Git.

Open `Documentation/Documentation.html` to read the result. Distribute it with the complete `DocData/` directory and the separate `DocAI.md` sidecar. You can also download the generated manual as a ZIP. The reader works directly from local files and can be hosted on a static web server.

Keep documentation focused on using your application. Working history, internal checks and editor/service configuration do not belong in the human manual. Assistant guidance belongs in `DocAI.md`.

## Work with a team {#collaborate}

On an online installation, sign in with your account. A project owner can invite editors and viewers: editors write content, viewers read it, and owners manage project settings and publication.

Connected editors share live changes and presence through Yjs. Visual and Markdown views use the same document; undo tracks your own editing transactions. Online editing requires a running hosted Studio service with persistent storage, HTTPS and WebSocket support. This release supports a single server.

## Use Git when needed {#git}

Git is optional. Its panel offers status, diffs, documentation commits, history, branches and remote actions. Remote access currently supports HTTPS on GitHub, GitLab and Bitbucket; enter credentials in the dedicated panel.

Commits include documentation paths only. Close other editing sessions before switching branches or pulling. Pull accepts fast-forward updates; there is no force-push or destructive-reset control. You can continue using ordinary folder projects without a repository.

## Adjust appearance {#appearance}

Choose **Light**, **Dark**, **Midnight**, **Nord**, **Paper** or **High contrast**. Studio uses the same six palettes as the library. In Windows, Options synchronizes the native interface, editor and bundled manual; Dark is the default. You can also change the interface language and text size.

The Windows Local MCP / SDK tab displays the running local endpoint and integration configuration. Detailed automation instructions are kept in the separate assistant guides, outside this manual.

## Ask the integrated assistant {#assistant}

Current source builds include an **Assistant** tab powered by CyMCPSDK. This tab is newer than the published Studio 0.1.2 download.

1. Open Assistant, then **Connection settings**. Choose a detected provider, or enter its executable or service URL. Detection alone does not confirm that its account is signed in.
2. Choose a model from the provider's catalogue. Native CLI defaults and installed local services can also use an empty model field. For an API key, enter the name of its environment variable in the connection settings.
3. Select **Connect**, then describe the documentation task. Supported providers can read projects, edit pages, import media and publish through Studio's normal operations. Review the reported results and preview the changed page.

Responses appear progressively. Use **Stop** to interrupt a response and subsequent tool calls. Completed saves remain saved. Errors and connection diagnostics stay visible, so you can correct the configuration without assuming an edit succeeded.

Give a conversation a name to keep its private history, and leave **Restore saved conversation** checked to resume it. Use another name for a fresh conversation. Optional local providers use an existing Ollama, LM Studio or llama.cpp service; no model download is required merely to open Studio.

## Install and update Studio {#updates}

Studio 0.1.3 source builds add CyInstaller setup and an **Updates** tab. The published portable 0.1.2 download predates this feature. For a first managed installation, close the portable editor and run the offline setup into a separate, empty installation folder. Your existing projects, job outputs and browser drafts retain their data locations. Preferences are copied into the existing data folder's `config/` subdirectory; their old copies remain available.

In an installed copy, open Updates and select **Check for updates** for a fresh check. **Open CyInstaller** displays the available release and its notes. Choosing **Later** keeps Studio open. After you accept an update, Studio waits for pending work to be saved, then lets the installer close and replace the program. If saving fails, reconnect the editor and retry; the update must not discard a draft.

The installer manages verification, relaunch and the previous version. After a successful update, Studio displays the version it came from. If repeated launches cannot complete initialization, the installer can offer recovery to the previous version. An offline or failed check is shown explicitly rather than reported as up to date.

Portable and development copies do not check automatically. They need a genuine setup before managed updates are available. Online checks also require the publisher's signed release files to be published; preparing a setup locally does not publish them. A normal uninstall retains preferences and work; read the installer’s additional deletion choices before removing user files.
