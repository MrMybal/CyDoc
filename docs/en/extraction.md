---
id: extraction
title: Extract from source code
description: Keep explanations close to features and generate pages from comments.
section: Integration
order: 21
---
The examples cover **C++, Python, HLSL, GLSL, C#, C, JavaScript, Java, and TypeScript**: highlighted code, annotations converted into pages, and links between source files. Extraction and dependency indexing are lexical, without semantic language analysis.

## Annotate a feature {#annotations}

Add a comment block containing `@doc`, `@locale`, and `@title`, followed by Markdown content. `@section` and `@order` are optional.

```typescript
/**
 * @doc api-links
 * @locale en
 * @title Links API
 * @section API
 * @order 100
 * Build a link to a local page.
 *
 * ## Parameters {#parameters}
 * locale: requested language.
 * pageId: stable page identifier.
 */
```

Pages in the [API tour](doc:api-tour) are actually extracted from repository files. Add `@symbol` to name the documented symbol. The source badge links back to its file and line.

In Python, put the same annotations in a docstring:

```python
def make_help_link(base, locale, page_id):
    """
    @doc python-links
    @locale en
    @title Python links
    @symbol make_help_link
    Build a link to a local page.
    """
```

## Select sources {#sources}

The `sources` configuration lists directories to scan. Hidden directories, `node_modules`, and `dist` are ignored.

```json
{
  "sources": ["examples"],
  "sourceIndex": {
    "enabled": true,
    "includeDirs": ["examples/cpp/include", "examples/shaders"]
  }
}
```

Generation fails when two pages share the same locale/identifier pair. Generated pages retain the relative path and comment line to indicate their source.

## Files and dependencies {#dependencies}

`sourceIndex.enabled` generates a page per file and locale, containing highlighted code, links to documented symbols, and recognized dependencies. C/C++ and shader includes, C++20 modules, Python/JavaScript/TypeScript/Java imports, and C# namespaces link to local files when resolvable. External dependencies remain visible as unresolved. TypeScript `.js` imports can resolve to their corresponding `.ts` file.

See the [nine language examples](doc:code-languages) and the [tour between API, header, implementation, and module](doc:api-tour).

## Add an adapter {#adapters}

The `extractComments(source, filename)` function produces metadata and Markdown. The compiler then handles these pages like handwritten files. This contract is the foundation for future adapters.

The extractor uses `/* ... */` delimiters and Python docstrings with triple single or double quotes. C# XML comments, signatures, types, macros, conditional compilation, and full package resolution are not parsed. Markers inside string literals may be mistaken for comments: use this extractor with controlled annotations.
