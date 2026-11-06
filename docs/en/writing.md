---
id: writing
title: Write pages
description: Focus on your explanations. CyDoc takes care of their presentation.
section: Create content
order: 10
---
Write Markdown files in each locale folder. Headings, lists, tables, quotes, links, and code blocks are supported.

For manual editing, [CyDoc Studio](doc:studio#write) offers visual and Markdown views over the same page. It saves the normal CyDoc authoring files and previews them with the actual reader.

## Structure a page {#structure}

The main title comes from the `title` metadata. Start content with level-two headings; they automatically populate the table of contents.

```markdown
## Installation {#installation}

1. Open settings.
2. Choose your workspace.
3. Save your preferences.

> Preferences are saved on this device.
```

Metadata intentionally supports single-line text fields between `---` delimiters. It is not a full YAML parser.

## Create links {#links}

Use the `doc:` prefix for internal links. CyDoc applies the page locale and verifies that destinations exist at build time.

```markdown
[Quickstart](doc:quickstart)
[Installation](doc:quickstart#installation)
```

Explicit section identifiers such as `{#installation}` keep the same destination across translations.

To target another documentation, use `doc://identifier/page#section` and declare its destination in the `linkedDocs` configuration:

```json
{"linkedDocs":{"editor":{"base":"../editor/Documentation/Documentation.html","manifest":"../editor/Documentation/DocData/manifest.json"}}}
```

```markdown
[Export in the editor](doc://editor/settings#export)
```

The manifest is optional. When provided, the generator also validates the page and section in the other documentation. Otherwise, only the destination catalog is checked. The host app must ship that documentation at the declared path.

## Add code {#code}

Fenced blocks display a language label and a copy button. Their content stays escaped text, never executed code.

```typescript
const documentation = createDocumentation(manifest);
const page = documentation.resolve('quickstart', 'en');
```

## Safe content {#safety}

Raw HTML is displayed as text. The compiler rejects script URLs and remote media. Use the [dedicated blocks](doc:media) for videos and diagrams.
