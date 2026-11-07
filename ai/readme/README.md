# Application README convention

[Français](README.fr.md) · [AI instructions](DocAI.md) · [CyDoc example](example/README.md) · [Example version notes](example/VERSION.md)

Use this convention to give application READMEs a consistent, readable structure. A README explains the product, helps people start using it and links to the complete manual. Keep detailed AI instructions, audits, test reports and maintenance histories outside the public README. An optional final AI Usage box may link to separate agent guides.

This folder contains reusable guidance and a real CyDoc example. It does not replace the checkout's root README or the application's HTML manual.

## Folder contents

| File | Purpose |
| --- | --- |
| [README.md](README.md), [README.fr.md](README.fr.md) | English and French convention |
| [DocAI.md](DocAI.md) | Instructions for agents applying the convention |
| [TEMPLATE.md](TEMPLATE.md), [TEMPLATE.fr.md](TEMPLATE.fr.md) | Complete copyable README structure in English and French |
| [example/README.md](example/README.md), [example/README.fr.md](example/README.fr.md) | Complete CyDoc READMEs |
| [example/VERSION.md](example/VERSION.md), [example/VERSION.fr.md](example/VERSION.fr.md) | Changes, current status, documented limitations and issue links |
| [example/assets/](example/assets/) | Existing CyDoc logo and real product screenshots |
| [SOURCES.md](SOURCES.md) | Evidence used for this example, separate from human product content |
| [preview.mjs](preview.mjs), [preview.css](preview.css), [preview.js](preview.js) | Local preview generator and presentation; no publishing operation |

## 1. Header and identity

The header contains:

- The existing application logo, with meaningful alternative text, a defined width and its original aspect ratio. Omit the image if no real logo exists; do not borrow another project's identity.
- The product name, without internal executable names or an invented version suffix.
- Website/presentation and actual manual links when available. Point to the selected manual language and its real HTML reader, rather than Markdown sources.
- Links between README languages only when the corresponding files exist and are complete.
- The application's own license, linked to its license file.
- The exact version and explicit development stage directly below the license. Distinguish component versions when the library, editor or application have different releases.
- A download link for the correct published application build, with platform and stage. Exclude dependency/toolchain releases. Omit unavailable downloads.

An author credit is **optional**: use `By <author>` only when the author is established by the project's credits or an explicit instruction. Link to the appropriate profile or website when verified. The repository owner, maintainer, publisher and author may differ. Do not hardcode a person into the convention, invent attribution or change copyright notices to match a display credit. Omit the credit when it is not wanted or cannot be verified.

For GitHub READMEs following this convention, use a native three-column HTML table by default: useful links and languages on the left, the existing logo in the middle, and the application license, exact versions, explicit stage and available download on the right. Keep versions and stage directly below the license. Retain GitHub's visible table borders. The product name and optional author credit follow below the table. Preserve this composition in both languages, unless the user requests a different layout.

GitHub removes custom classes and inline styles. Do not present CSS-only columns as a working GitHub implementation, hide native table borders in a preview, or silently replace an accepted composition with a centered stack. If a project requires both three columns and no borders, explain the renderer limitation before choosing a different implementation. An embedded SVG can retain a visual composition, but it needs separate real links; links drawn inside an embedded image are not interactive.

The [English template](TEMPLATE.md) and [French template](TEMPLATE.fr.md) contain the full copyable Markdown structure, including the native header table and optional author/AI Usage blocks. Replace every placeholder with verified project information, remove unavailable links and unwanted optional blocks, and compare with the [real CyDoc example](example/README.md). Templates are source material to adapt, not finished product READMEs.

## 2. Content order

1. **Short description:** the purpose of the application and its intended users, in a few sentences.
2. **Version note:** a concise message appropriate to the current stage, linked to the version-notes Markdown file.
3. **Main image, when available:** a real representative screenshot with no invented UI or promotional overlays.
4. **Application explanation:** useful tasks and workflows, with more real screenshots if they help.
5. **Features, when useful:** a short factual list; avoid duplicating the manual or publishing future plans as available features.
6. **Installation:** verified downloads, actual platforms, requirements and the steps to start.
7. **Git, build and required libraries:** real commands and dependencies. A collapsible section is suitable for lengthy developer details. Git is not required for a project distributed without it.
8. **License:** the application license, followed by the third-party library/license table.
9. **References and links:** the real manual, source repository, issue tracker and relevant project references.
10. **AI Usage, optional:** a small final box linking to the primary agent guide and useful task-specific Markdown guides.

Insert a Markdown horizontal rule (`---`, surrounded by blank lines) before **Installation** and **License**. Keep these separators in the Markdown itself. Dependency tables contain real data; a header layout table uses the target renderer's native borders, when accepted by the user.

## 3. Version and stage

Keep the header version, stage note, download and version-notes file consistent. Use `VERSION.md` and, when a complete French edition is supplied, `VERSION.fr.md`. Preserve an existing release-note filename by linking to it rather than creating conflicting sources of truth.

| Stage | Reader-facing message |
| --- | --- |
| Alpha | Experimental release for testing and feedback; some features may be incomplete. |
| Beta | Release undergoing validation before stable availability; consult known issues. |
| Stable | Published stable version; read changes and known issues before updating. Do not promise the absence of bugs. |
| Development / preview / another documented stage | State the project's actual designation and available build status. |
| Not established | Report that the stage needs confirmation; do not invent Alpha or Stable from a version number. |

A release not marked as a GitHub prerelease is not, by itself, evidence of production maturity. Version `0.x` does not prove an alpha stage either. Read the project's explicit status and release notes. The CyDoc example therefore says **IN DEVELOPMENT**, while retaining the actual published Studio 0.1.2 download.

Version notes identify the release/component, changes, confirmed bugs when documented, known limitations, issue destinations and release references. Keep confirmed bug tickets separate from unsupported platforms, optional downloads and planned features. If no bug list is published, say so without claiming that there are no bugs. Do not invent issue numbers or release dates.

## 4. Licenses and libraries

Use this table structure:

| Library · source | License · terms | Use / scope |
| --- | --- | --- |
| Name linked to the real project | Actual license linked to its text/notices | Role, optionality and whether used at runtime, for building, or only by an editor |

Read manifests, lockfiles, build/package scripts and the actual dependency notices. Distinguish the application license from dependency licenses. Record dual licenses, exceptions and separately licensed subcomponents faithfully. Do not turn a bundled dependency into an application's own license, or claim that every module ships by default.

Group editor-only, optional/native and build dependencies when that improves readability. Preserve complete distribution notices; the table is an index, not a replacement. Identify private source links and retain the license texts provided with distributions. Link the exact dependency version's terms when it is pinned and available.

## 5. Languages, assets and verification

Use English in `README.md`. A French edition uses `README.fr.md`, with the same structure, current versions, images, dependency inventory and links to the French manual. Translate all explanatory prose; keep official product names, commands and license identifiers intact. Withhold incomplete language links.

Keep the logo and screenshots local and repository-relative. Preserve screenshot content and aspect ratios. Avoid runtime image badges, remote fonts or script-dependent README content. Do not include private projects, account data, credentials or machine paths in examples.

Before delivery, verify the local files, image paths, section links, version-note links, license table and actual download destinations. Inspect both languages at desktop and mobile sizes, dark and light when the preview supports them. Distinguish a local rendering check from an actual GitHub rendering check. Do not push or publish merely because a README was prepared.

When GitHub publication is authorized, inspect the actual rendered README in both languages before reporting success: check the three column positions, logo, visible borders, license/version/stage order and working links. Capture the GitHub result as evidence. If working locally or if GitHub cannot be inspected, state that GitHub rendering remains unverified; do not present the local preview as proof. Keep screenshots and verification reports outside the human README.

## 6. Optional AI Usage box

When useful for the project, append an **AI Usage** box after all human-facing content and references. A collapsible `details` block is suitable. Include links and short descriptions, not the instructions themselves.

- First, link the primary agent Markdown file that explains the project and indexes its important guides, such as `DocAI.md`, `ai/README.md` or an existing `AGENTS.md`.
- Then link the actual task guides: integration, build/setup, authoring, APIs, creating an application showcase or another project-specific workflow.
- Distinguish a guide for building the application from one for building something with its library. Label each destination accurately.
- Use existing, verified Markdown paths, with relative links when they work in the distributed repository/package. Omit unavailable guides and the whole box if it is not wanted or useful.
- Do not copy AI instructions into the human README, invent guide files or expose private working records. Do not add this box to the application's human manual unless explicitly requested.

The CyDoc example demonstrates a primary `ai/README.md` link followed by integration, authoring/API, Studio and showcase/README creation guides. Their detailed instructions remain in separate files.

## Preview the CyDoc example

From the CyDoc checkout, with its Node.js 22+ dependencies installed:

```sh
node ai/readme/preview.mjs
```

Open the generated `artifacts/readme-example/index.html` directly. The preview includes the images and classic script, and needs no server or remote fonts. It offers English/French, README/version notes and dark/light. Its header is the source's native table, with visible borders and no CSS column layout. Verify the actual GitHub result before claiming that it matches the agreed composition.

The command generates only the preview in `artifacts/readme-example/` relative to the current directory. Edit this folder's source Markdown and preview inputs, then regenerate. It does not replace the root README, build an application, commit, push or deploy anything.
