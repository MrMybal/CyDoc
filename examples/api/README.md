# API import examples

`doxygen/*.xml` and `typedoc.json` are small illustrative interchange snapshots, maintained with their source examples. They exercise importers without requiring Doxygen or TypeDoc to build CyDoc.

To generate your own exports, run Doxygen with `examples/api/Doxyfile` from the project root, or TypeDoc with `--options examples/api/typedoc.config.json`, then point `apiImports[].path` at the generated output. Doxygen/TypeDoc are optional generation tools and are not part of the reader.

The neutral format is `{ "symbols": [{ "key", "name", "language", "signature", "parameters": [{ "name", "type", "description" }], "returnType", "returns", "bases": [{ "key", "name" }], "references": [{ "key", "name" }], "source": { "file", "line" } }] }`, with adapter format `cydoc`. Producers can emit it for any language.
