---
id: advanced-search
title: Find a section or an API
description: Read useful excerpts, narrow results and open the relevant section.
section: Examples
order: 37
revision: 1
---

Use the search field in the header; results appear while typing. Ctrl+K also opens search.
Search includes explanations, code examples and documented symbols. Each result shows its place in the manual, highlighted matches and an excerpt. A named section opens directly at that passage. A result matching the page title can open at the start of that page.

Try `make_help_link`, then select **API** and **cpp**. These results refer to documented APIs. Try `configuraton` to find `configuration`; minor typos are tolerated on words of at least four characters.

If a filter hides the result you need, choose **Clear filters**. Your query stays in place. With no filters active, **Clear search** returns to the starting suggestions. You can also change the wording or shorten the query. See [navigation and keyboard controls](doc:navigation#search).

Applications that embed CyDoc can use its search API:

```typescript
const results = docs.search("make_help_link", "en", 20, {
  language: "cpp", kind: "api", fuzzy: true
});
```
