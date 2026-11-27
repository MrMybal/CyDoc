---
id: rich-content
title: Rich content
description: Tabs, steps, callouts, collapsible sections, glossary, and code differences.
section: Examples
order: 30
previous: writing
next: media
revision: 1
---
One explanation can present several languages without lengthening the page. The term [[PBR]] has a keyboard- and click-accessible definition.

## Code tabs {#tabs}

```tabs
{
  "title": "Choose a language",
  "items": [
    {
      "label": "C++",
      "lang": "cpp",
      "code": "auto url = cydoc::make_help_link(\"Documentation/Documentation.html\", \"fr\", \"quickstart\");"
    },
    {
      "label": "Python",
      "lang": "python",
      "code": "url = help_link(\"Documentation/Documentation.html\", \"fr\", \"quickstart\")"
    },
    {
      "label": "C#",
      "lang": "csharp",
      "code": "string url = HelpLink.Create(\"Documentation/Documentation.html\", \"fr\", \"quickstart\");"
    },
    {
      "label": "C",
      "lang": "c",
      "code": "cydoc_help_link(url, sizeof url, \"Documentation/Documentation.html\", \"fr\", \"quickstart\", \"\");"
    },
    {
      "label": "JavaScript",
      "lang": "javascript",
      "code": "const url = helpLink(\"Documentation/Documentation.html\", \"fr\", \"quickstart\");"
    },
    {
      "label": "TypeScript",
      "lang": "typescript",
      "code": "const url: string = helpLink(\"Documentation/Documentation.html\", \"fr\", \"quickstart\");"
    },
    {
      "label": "Java",
      "lang": "java",
      "code": "String url = HelpLink.create(\"Documentation/Documentation.html\", \"fr\", \"quickstart\");"
    },
    {
      "label": "HLSL",
      "lang": "hlsl",
      "code": "float4 MainPS(float2 uv : TEXCOORD0) : SV_Target { return float4(uv, 0, 1); }"
    },
    {
      "label": "GLSL",
      "lang": "glsl",
      "code": "#version 450\nlayout(location = 0) out vec4 color;\nvoid main() { color = vec4(0.2, 0.8, 0.5, 1.0); }"
    }
  ]
}
```

## Step-by-step tutorial {#steps}

Give each step one action, a visible result and an optional remedy. In Studio, choose **Insert a block → steps** to write these fields and move steps up or down. **Result and troubleshooting** opens the optional fields. In the reader, **If this step fails** reveals the extra help only when needed.

```steps
{
  "items": [
    {
      "title": "Generate",
      "body": "From the source checkout, run `npm run build`.",
      "result": "The build creates `dist/site/Documentation.html` and its `DocData/` folder.",
      "troubleshooting": "Read the exact build error. Check that the dependencies are installed and that both language editions are complete."
    },
    {
      "title": "Distribute",
      "body": "Copy `dist/site/` with your application.",
      "result": "The entry file and its complete `DocData/` folder stay together."
    },
    {
      "title": "Open",
      "body": "[Open a precise section](doc:quickstart#installation).",
      "result": "The preparation section of the tutorial opens.",
      "troubleshooting": "Use [the reader checks](doc:troubleshooting#reader) if the manual remains blank."
    }
  ]
}
```
```callout
{
  "type": "tip",
  "title": "Everything stays local",
  "body": "Tabs and diagrams make no network requests."
}
```
```callout
{
  "type": "warning",
  "title": "Stable identifiers",
  "body": "Keep page, annotation, and media identifiers stable across updates."
}
```
```details
{
  "title": "Configuration details",
  "body": "These blocks accept sanitized Markdown, including [internal links](doc:writing)."
}
```

## Code difference {#diff}

```diff
{
  "title": "Add a section to the link",
  "lang": "cpp",
  "before": "auto url = make_help_link(base, \"fr\", \"settings\");",
  "after": "auto url = make_help_link(base, \"fr\", \"settings\", \"export\");"
}
```

## Glossary {#glossary}

```glossary
{
  "items": [
    {
      "term": "PBR",
      "definition": "Rendering based on physical material properties.",
      "link": "doc:mesh-viewer"
    },
    {
      "term": "Deep link",
      "definition": "A link to a specific page, section, or view."
    }
  ]
}
```
