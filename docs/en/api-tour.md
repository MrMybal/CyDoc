---
id: api-tour
title: API & file links
description: Real extraction with symbols, source files, includes, imports, and modules.
section: Integration
order: 23
---
The examples are repository files, not text blocks pretending to be extracted. The generator reads their comments, creates API pages, and indexes dependencies.

## C++ : header et implémentation {#cpp}

[make_help_link API](doc:api-cpp) · [help.hpp header](doc:source-examples-cpp-include-cydoc-help-hpp) · [help.cpp implementation](doc:source-examples-cpp-src-help-cpp) · [C++20 module](doc:source-examples-cpp-modules-cydoc-help-cppm).

```cpp
#include "cydoc/help.hpp"

const auto url = cydoc::make_help_link(
    "file:///D:/Documentation/Documentation.html", "fr", "quickstart", "installation");
// The host app opens this local URL using its browser or WebView.
```

## Module C++20 {#modules}

```cpp
import cydoc.help;
const auto url = cydoc_module::link("file:///D:/Documentation/Documentation.html", "fr", "quickstart");
```
The C++20 module exports a wrapper around the portable C++17 function. Compile the module using your compiler’s options, then link help.cpp. The demo CMake target stays on C++17.

## Other languages {#languages}

[Nine-language examples](doc:code-languages) · [JavaScript imports](doc:source-examples-javascript-help-js) · [TypeScript imports](doc:source-examples-typescript-help-ts) · [Python docstrings](doc:source-examples-python-help-link-py) · [HLSL includes](doc:source-examples-shaders-preview-hlsl) · [GLSL includes](doc:source-examples-shaders-preview-frag).

## Extraction configuration {#configuration}

```json
{
  "sources": [
    "examples"
  ],
  "sourceIndex": {
    "enabled": true,
    "includeDirs": [
      "examples/cpp/include",
      "examples/shaders"
    ]
  }
}
```
The index is lexical: explicit include/import/module/using statements and annotated blocks. It does not resolve macros, conditional compilation, overloads, complex aliases, package dependencies, or types like a compiler would. External and unresolved dependencies remain visible without fabricated links.
