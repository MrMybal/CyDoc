---
id: navigation
title: Navigation & search
description: A nested documentation tree and header search across text, code and symbols.
section: Create content
parent: writing
order: 10
---

## Search from the header {#search}

Type a term in the header field to search the manual. Results appear while typing, including matches in code and symbols. Use the content and code-language filters to narrow the results. Arrow keys select a result; Enter opens it. Ctrl+K opens the search dialog. Escape or a click outside closes the results.

Try `configuration`, `make_help_link` or `PBR`. Accents are ignored, and minor typos in longer words are tolerated. A source result can open its matching line.

## Pages and subpages {#tree}

The sidebar is a nested tree. Expand or collapse a branch using its chevron. A parent page's title remains a link to its own content. Open branches and menu scroll are preserved when switching pages.

Hover over any entry to quickly see its complete name and description, even when the menu clips the label. Keyboard focus shows the tooltip immediately. Folders show their full path; code tabs and gallery tabs also expose their complete labels. Escape closes a tooltip. Its text remains visible when moving the pointer onto it.

To place a page under another page, use its stable ID:

```text
---
id: workspace-export
title: Export a workspace
description: Export the current workspace.
section: Guides
parent: workspace
order: 20
---
```

This example requires an existing `workspace` page. Translations keep the same `parent` value. A parent may have several levels of children. The build rejects missing parents, self references and cycles. A child still opens at `#/en/workspace-export`; the parent is not added to its URL.

## Folder hierarchy {#folders}

A root page can set `section: Guides / Workspace` to create folders and subfolders. Explicit child pages follow their parent even if their own section differs. The Markdown filename does not determine the route or the tree. Generated source pages are grouped by source directory.

The media examples demonstrate page nesting: expand **Media & viewers** to find images, videos, meshes, GIFs and galleries.

## Keyboard navigation {#keyboard}

Tab reaches links and disclosure controls. Enter activates a page or toggles a disclosure. Right arrow opens a branch, then enters its children; left arrow closes it or returns to its parent. Page links remain ordinary local links and can be copied or opened in another tab.


## Application logo {#branding}

When the application has a logo, copy it into the documentation assets and set `"logo": "assets/app-logo.svg"` in its configuration. The file must exist. Without a logo, omit this option to keep the default book icon. A loading error in the reader also restores that icon. Branding needs no media module.

**My space** is an icon in the header. The left menu is reserved for navigation. The footer does not imply a license for the host application; document its actual license in its content.
