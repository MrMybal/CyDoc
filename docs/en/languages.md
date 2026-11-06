---
id: languages
title: Languages & translations
description: Multilingual from the start, with consistent links between translations.
section: Create content
order: 12
---
Languages are part of the content model. Every translation is a page linked to its counterparts by a stable identifier.

## Declare locales {#configuration}

English originals and full French translations are required. Configure the default locale and available languages in `cydoc.config.json`.

```json
{
  "defaultLocale": "en",
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

## Published languages {#fallback}

A language is offered only when every public page is translated and nonempty, with no explicitly outdated source revision. Missing, empty or explicitly outdated English or French pages stop the build. Additional incomplete languages are withheld. English is the source language; French is mandatory. When only one language is available, the reader shows no language selector. A link to an unavailable language opens the complete default language while preserving its page and section.

## Viewer interface {#interface}

The included viewer translates its controls into French and English. The content format accepts other locale codes; additional UI translations and RTL layout remain to be implemented. The language preference is remembered on the device when local storage is available.


Translate titles, descriptions, prose, captions and annotations before publishing another language. Coverage checks cannot judge translation quality; review the actual content. See also [versions and redirects](doc:versions).
