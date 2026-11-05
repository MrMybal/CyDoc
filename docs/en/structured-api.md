---
id: structured-api
title: Structured API
description: Imported signatures, parameters, returns, inheritance, and references.
section: Examples
order: 33
---
Adapters convert structured exports at build time. Doxygen and TypeDoc are not included in the reader. Demo files are small illustrative interchange snapshots accompanied by their source code.

- [C++ · HelpSession](doc:doxygen-cydoc-helpsession-session)
- [C++ · open()](doc:doxygen-cydoc-helpsession-open-open)
- [TypeScript · helpLink()](doc:typedoc-helplink-2)

## Configuration {#configuration}

```json
{
  "apiImports": [
    {
      "format": "doxygen",
      "prefix": "doxygen",
      "path": "examples/api/doxygen"
    },
    {
      "format": "typedoc",
      "prefix": "typedoc",
      "path": "examples/api/typedoc.json"
    }
  ]
}
```

## Other languages {#languages}

The neutral `cydoc` format accepts symbols with `signature`, `parameters`, `returnType`, `returns`, `bases`, `references`, and `source`. A Python, C#, Java, or shader tool can produce this JSON. Annotated extraction remains available for all nine languages and does not infer compiler types. Doxygen/TypeDoc adapters cover common declarations and types; plugin-specific metadata is not interpreted.
