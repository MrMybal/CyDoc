---
id: languages
title: Languages & translations
description: Multilingual from the start, with consistent links between translations.
section: Create content
order: 12
---
Languages are part of the content model. Every translation is a page linked to its counterparts by a stable identifier.

## Declare locales {#configuration}

Configure the default locale and available languages in `cydoc.config.json`.

```json
{
  "defaultLocale": "fr",
  "locales": [
    { "code": "fr", "label": "Français" },
    { "code": "en", "label": "English" }
  ]
}
```

## Connect translations {#translations}

Use one folder per locale and preserve the same `id` in metadata. Filenames and titles can differ. Preserve explicit heading anchors as well to keep the current section when changing languages.

```text
docs/fr/demarrage.md  → id: quickstart
docs/en/quickstart.md → id: quickstart
```

## Missing translations {#fallback}

When a translation is missing, the core tries the default locale. The viewer displays a fallback notice. If the page is also missing in that language, it shows a page-not-found screen.

## Viewer interface {#interface}

The included viewer translates its controls into French and English. The content format accepts other locale codes; additional UI translations and RTL layout remain to be implemented. The language preference is remembered on the device when local storage is available.


[The translation report](doc:translation-report) flags missing pages and compares `sourceRevision` with the original `revision`. See also [versions and redirects](doc:versions).
