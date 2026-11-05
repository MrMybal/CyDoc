---
id: versions
title: Versions and translations
description: Local versions, redirects, and translation revision tracking.
section: Examples
order: 34
---
The version selector preserves page, section, and media state. **Demo v1** and **Demo v2** are distinct small manuals for trying version switching; they are not historical CyDoc releases. Missing pages redirect to their overview.

## Redirects {#redirects}

```json
{
  "aliases": {
    "old-media": "media",
    "old-settings": "quickstart#installation"
  },
  "versions": [
    {
      "id": "1.0",
      "label": "1.0",
      "base": "../v1/index.html"
    },
    {
      "id": "2.0",
      "label": "2.0",
      "base": "../v2/index.html"
    }
  ]
}
```
[Try an old address](doc:old-media). Cycles and missing destinations fail generation.

## Translations {#translations}

[View the translation report](doc:translation-report). `translation-report.json` contains missing pages, outdated revisions, and untracked translations. Demo v2 intentionally includes an outdated example and a missing example.
