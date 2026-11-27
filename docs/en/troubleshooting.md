---
id: troubleshooting
title: Solve a problem
description: Start with the symptom, follow a simple check and confirm the result.
section: Troubleshooting
order: 4
revision: 2
---
Choose the situation that matches what you see. The checks below apply to the CyDoc reader; for a problem with the application itself, use that application's own help or support channel.

## The reader shows a blank page {#reader}

The manual opens, but its title and page text do not appear.

```steps
{"items":[{"title":"Open the entry file","body":"Open **Documentation.html** from the exported manual's folder.","result":"The application name, navigation and page text appear. If they do, you can stop here.","troubleshooting":"If the page stays blank, continue with the folder check below. If only one topic is missing, follow [the missing-page checks](doc:troubleshooting#page)."},{"title":"Keep the complete folder together","body":"Check that **DocData/** is beside **Documentation.html**. If the manual came as a ZIP, extract the complete archive before opening it.","result":"The entry file and its **DocData/** folder are in the same extracted directory.","troubleshooting":"If the folder is missing, obtain the complete manual again from the application’s usual distribution source. Copying the HTML file alone is not enough."},{"title":"Open the manual again","body":"Close the blank tab and reopen the entry file.","result":"The application name, navigation and page text are visible.","troubleshooting":"Keep the exact error message and follow [the support checklist](doc:troubleshooting#support)."}]}
```

## A page cannot be found {#page}

The reader opens and displays “This page could not be found”.

1. Use **Back to overview** to reach the manual's home page.
2. Find the topic in the menu or search field.
3. If you used an old bookmark, copy the working page's link and update your bookmark.

**Expected result:** the topic opens from a current link. If a help button in the application still opens the missing page, report which button you used.

## An image or video does not open {#media}

First check whether the rest of the page is readable.

- **The whole page is blank:** follow [the reader checks](doc:troubleshooting#reader).
- **Only a media item is missing:** check that the complete **DocData/** folder was copied with the manual, then reopen the page.
- **A video reports a playback error:** keep the exact message. A different video format may be needed for your browser or embedded viewer; the manual's author must provide it.
- **Only a 3D view fails:** keep the WebGL or model error shown by the reader and report it to the manual's author.

**Expected result:** the media opens, or you have identified a specific media error to report. For an author, the [media guide](doc:media) explains the available readers and local resources.

## My language is missing {#language}

Use the language selector in the header. The reader offers complete editions of the manual. A missing edition must be completed by its author before it becomes available.

**Expected result:** switching languages keeps you on the same topic. A link requesting an unavailable language opens the complete default edition.

## My notes or bookmarks are missing {#personal-data}

Open **My space** in the header. Notes and bookmarks belong to the manual and the browser or application where you saved them.

1. Check that you opened the same manual in the same browser or embedded viewer.
2. If the reader says storage is unavailable, keep this reading session open. Your notes and bookmarks remain available while you move between its pages.
3. Use **Export bookmarks and notes** to keep a copy before closing. This downloads a JSON file; keep it with your own files.

**Expected result:** your current session's data appears in My space and can be exported. When storage is unavailable, closing the reader ends that temporary session. Export is a way to keep a readable copy; this release has no import command.

## The problem persists {#support}

Keep the following information before contacting the application's or manual's support channel:

- The page title and the action that led to the problem.
- The exact error message and the affected image, video or model.
- The browser or embedded application and its version, when available.
- Whether you opened a local manual or a hosted copy.

Review screenshots and messages before sharing them. The page feedback buttons record your vote on the device; use the product's support channel when you need a reply.
