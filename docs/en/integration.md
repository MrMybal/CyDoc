---
id: integration
title: Integrate with an app
description: Open help from Windows, Linux, macOS, Android, or a web application.
section: Integration
order: 20
---
The exported viewer uses web standards. Open it in the system browser or an embedded WebView. The host application chooses how to open it.

## A universal link {#links}

URLs combine the reader path, locale, stable page identifier, and an optional section. The part after `#` requires no server routing configuration.

```text
Documentation/Documentation.html#/en/quickstart/installation
```

In JavaScript or TypeScript, use the core to encode identifiers correctly.

```typescript
import { createLink } from 'cydoc';

const helpUrl = createLink({
  locale: 'en',
  pageId: 'quickstart',
  anchor: 'installation'
}, './Documentation/Documentation.html');
```

## Desktop and Android {#platforms}

| Platform | Suggested integration |
| --- | --- |
| Windows | System browser or WebView2; include the exported folder |
| Linux | System browser, WebKitGTK, or Qt WebEngine |
| macOS | System browser or WKWebView with access to bundled resources |
| Android | WebView with bundled assets and WebViewAssetLoader |
| Web / Electron | Static URL or local WebView; preserve the link fragment |

On Android, [WebViewAssetLoader](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content) serves app assets under a local HTTPS origin. Enable JavaScript for the reader. Media and styles must stay accessible from the same root.

> This version is checked in a browser on Windows. Native wrappers and the other platforms still require validation on their target devices.

## Embed the JavaScript viewer {#embed}

Mount the viewer in an existing page. The manifest must come from the CyDoc compiler or a source whose HTML has already been sanitized.

```typescript
import { mountViewer } from 'cydoc/viewer';
import 'cydoc/viewer.css';

const viewer = mountViewer(
  document.querySelector('#app'),
  manifest
);

// When removing the viewer:
viewer.destroy();
```

The supplied viewer occupies the page and owns its URL fragment. In an application with its own router, use a dedicated page or iframe. The `cydoc` core supports finer custom integrations.

## Local distribution {#distribution}

Ship content and media with the corresponding application version. The viewer uses no CDN, remote fonts, or network API. Generation requires Node.js; reading needs only a compatible browser.


## Native F1 examples {#native}

The [integration examples](doc:native-help) cover Qt, Python/Tk, WinForms, Java/Swing, AppKit, and Android/WebView. The direct Android `file:///android_asset/Documentation/Documentation.html` path needs no server or Internet permission. C++, C#, Java, and Python link helpers are checked; Qt, macOS, and Android windows still require target-device validation.
