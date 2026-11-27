---
id: navigation
title: Navigation & search
description: A nested documentation tree and header search across text, code and symbols.
section: Create content
parent: writing
order: 10
revision: 2
---

## Search from the header {#search}

Type a term in the header field to search the manual. Results appear while typing, including matches in code and symbols. Use the content and code-language filters to narrow the results. Arrow keys select a result; Enter opens it. Ctrl+K opens the search dialog. Escape or a click outside closes the results.

Each result shows the page title, its location in the manual and an excerpt. Matching words are highlighted. When a result names a section, opening it goes straight to that passage. Try `storage`, `make_help_link` or `PBR`. Accents are ignored, and minor typos in longer words are tolerated.

If nothing matches, choose **Clear filters** to widen the search while keeping your words. **Clear search** removes the query and returns to starting pages. Active filters remain selected while you move between pages. When more than 30 pages match, narrow your query or use a filter to find the relevant result.

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

The breadcrumb above the article links to the manual's home page and the current page's parents. Use it to return to the broader explanation after opening a subpage from search. It remains available on narrow screens.

When you open a page, its ancestors are revealed in the menu. Keyboard navigation moves focus to the new content, while a section link targets that section directly. **Reading mode** in the header hides desktop navigation; toggle it again to restore the menu. The mobile menu also restores navigation.

On smaller screens, open **On this page** above the article to reach a section, copy the page link or print. These tools remain available when the desktop outline is hidden.

Tab reaches links and disclosure controls. Enter activates a page or toggles a disclosure. Right arrow opens a branch, then enters its children; left arrow closes it or returns to its parent. Page links remain ordinary local links and can be copied or opened in another tab.


## Choose the reading sequence {#paths}

The page tree and the reading sequence serve different purposes. A parent groups related pages; the **Previous** and **Next** links can lead through a chosen exercise. This manual follows a path from the first tutorial to writing, rich content, media, diagrams, graphs and integration.

Set optional destinations in your page's frontmatter, using the same IDs in both languages:

```text
previous: quickstart
next: rich-content#steps
```

You can target a page or an explicit section. The build checks both. Omit a field to keep the next or previous page in the table-of-contents order. Leave it explicitly empty, such as `next:`, to hide that direction at the end of a path. Keep the public page and section IDs stable.

An illustrated explanation remains a **Guide** in search. A page containing only media is classified as **Media**. Authors can choose an explicit `kind: guide`, `kind: media` or `kind: api` in the frontmatter.

## Application logo {#branding}

When the application has a logo, copy it into the documentation assets and set `"logo": "assets/app-logo.svg"` in its configuration. The file must exist. Without a logo, omit this option to keep the default book icon. A loading error in the reader also restores that icon. Branding needs no media module.

**My space** is an icon in the header. The left menu is reserved for navigation. The footer does not imply a license for the host application; document its actual license in its content.
