---
id: studio
title: CyDoc Studio
description: Write, organize and publish documentation with the visual and Markdown editor.
section: Getting started
order: 3
revision: 1
---
CyDoc Studio is the optional editor for CyDoc manuals. Work locally without an account, or join a hosted workspace to write with your team. Your published documentation remains independent of Studio.

## Start locally {#start}

[Download Studio for Windows x64](https://github.com/MrMybal/CyDoc/releases/tag/studio-v0.1.2), extract the entire archive and start **CyDocStudio.exe**. Keep its adjacent folders together. The application bundles its runtimes and opens directly without registration or sign-in.

The **Editor**, **Documentation**, **Options** and **Local MCP / SDK** tabs occupy the application window. Documentation opens the bundled manual in its own view. Returning to Editor retains your working page and scroll position.

The browser editor also supports account-free local work when its service is started with `--local`. Local editing is limited to the current machine. Reading an exported manual needs no editing service.

## Choose a project {#projects}

Choose **Open the CyDoc example** on the Projects screen for a complete editable manual with English/French pages, code samples, diagrams, images, GIFs, videos, meshes and galleries. Each copy is independent, so you can experiment freely.

Use **New project** to start your own manual. Folder projects work without Git. In the Windows application, Options lets you allow and open an existing application folder. Documentation inputs stay in `.CyDocBuild/`; published files go into `Documentation/`.

## Write and organize pages {#write}

Select a page in the tree, then choose **Visual** or **Markdown**. Both views edit the same content. The toolbar provides headings, lists, emphasis, links, code and tables. Autosave records your changes; page history lets you restore earlier working revisions.

Page properties contain its title, description, section, parent and order. Use parent pages to create a clear hierarchy. Keep page IDs and explicit heading anchors stable: application help links and links from other pages depend on them.

If a file changes outside Studio, resolve the conflict before saving. Download your local draft if you need to keep it, then use **Reload external file** to load the external version. Studio does not silently overwrite conflicting edits.

## Add media and rich content {#media}

Import local files through the media library, then use their `assets/` paths in your content. Enable only the modules needed by your project in Project settings: image, video, GIF, mesh, gallery and graph. Galleries also need the readers used by their items.

The visual editor shows rich media as cards with a local preview and editable JSON configuration. Markdown exposes the full CyDoc syntax for [media](doc:media), [diagrams](doc:diagrams), [node graphs](doc:blueprints), annotations and comparisons. Some advanced content is configured through these blocks rather than a dedicated visual tool. Preview uses the actual reader and your selected modules.

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
