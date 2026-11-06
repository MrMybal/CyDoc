---
id: advanced-search
title: Search in code
description: Filters, typo tolerance, and results linking to source lines.
section: Examples
order: 37
---

Use the search field in the header; results appear while typing. Ctrl+K also opens search.
Search now includes code and symbols. Filter results by content type and language. Minor typos are tolerated on words of at least four characters.

Try `make_help_link`, then filter **Source code** and **cpp**. Results open the matching line. Try `configuraton` to find `configuration`.

```typescript
"const results = docs.search(\"make_help_link\", \"fr\", 20, {\n  language: \"cpp\", kind: \"source\", fuzzy: true\n});"
```
