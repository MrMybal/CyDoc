---
id: api-tour
title: API et liens entre fichiers
description: Une vraie extraction avec symboles, fichiers source, includes, imports et modules.
section: Intégration
order: 23
---
Les exemples sont des fichiers du dépôt, pas des blocs de texte simulant une extraction. Le générateur lit leurs commentaires, construit les pages d’API et indexe leurs dépendances.

## C++ : header et implémentation {#cpp}

[API de make_help_link](doc:api-cpp) · [Header help.hpp](doc:source-examples-cpp-include-cydoc-help-hpp) · [Implémentation help.cpp](doc:source-examples-cpp-src-help-cpp) · [Module C++20](doc:source-examples-cpp-modules-cydoc-help-cppm).

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
Le module C++20 réexporte un wrapper de la fonction portable C++17. Il faut compiler le module avec les options de votre compilateur, puis lier l’implémentation help.cpp. La cible CMake de démonstration reste en C++17.

## Autres langages {#languages}

[Exemples des neuf langages](doc:code-languages) · [Imports JavaScript](doc:source-examples-javascript-help-js) · [Imports TypeScript](doc:source-examples-typescript-help-ts) · [Docstrings Python](doc:source-examples-python-help-link-py) · [Includes HLSL](doc:source-examples-shaders-preview-hlsl) · [Includes GLSL](doc:source-examples-shaders-preview-frag).

## Configuration d’extraction {#configuration}

```json
{
  "sources": [
    "examples"
  ],
  "apiIndex": {
    "enabled": true,
    "includeDirs": [
      "examples/cpp/include",
      "examples/shaders"
    ]
  }
}
```
L’index est lexical : include/import/module/using explicites et blocs annotés. Il ne résout pas les macros, les conditions de compilation, les surcharges, les alias complexes, les dépendances de paquets ou les types comme le ferait un compilateur. Les dépendances externes et non résolues restent visibles sans faux lien.
