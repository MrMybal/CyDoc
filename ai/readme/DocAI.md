# Applying the application README convention

Read [the convention](README.md) and inspect [the CyDoc example](example/README.md) before editing a target application's README. The example's identity, versions, optional author credit, dependencies and MIT license belong to CyDoc; they are not defaults for other projects.

Use the complete [English template](TEMPLATE.md) and [French template](TEMPLATE.fr.md) as the structural source. Copy the contents of their Markdown code blocks, replace all placeholders from verified evidence and remove unavailable links and unwanted optional blocks. Do not copy template explanations into the application's README or leave placeholders in a finished file.

Keep the target application's own agent instructions. A request for a convention or example does not authorize replacing its real README, committing unrelated work, pushing, publishing a release or deploying a website.

## Inspect first

1. Read the target project's instructions and current README, license, release/version files, build configuration, package manifests/lockfiles and dependency notices.
2. Inspect Git status when Git exists and preserve unrelated changes. Do not require Git or create a repository just to write a README.
3. Establish the product name, existing logo, real workflows, available builds, explicit development stage, public documentation entry points and author credits when relevant.
4. Inspect actual implementation and documentation as needed. A roadmap, build target or screenshot alone is not proof of an available platform build or completed feature.
5. Verify release/download destinations. Include prereleases when those are the intended application builds; exclude dependency, toolchain and private test packages. A GitHub `prerelease: false` flag does not establish a stable product stage.

## Write the files

- English goes in `README.md`; provide `README.fr.md` only when its translation is complete and current. For this convention's maintained CyDoc example, keep both editions complete.
- Use `VERSION.md` and `VERSION.fr.md` for the corresponding version notes unless the project already has an established equivalent. Preserve its existing filename and links when possible.
- For GitHub READMEs following this convention, use three native table columns by default: links and languages on the left, the existing logo in the middle, and license, exact versions, explicit stage and available download on the right. Keep GitHub's visible borders and the name and optional author credit below the table. Preserve the accepted composition in both languages.
- Put version and stage directly below the license. Do not infer them from an unrelated library version, an internal executable filename or a version-number pattern.
- An optional `By <author>` credit may use a verified project author and profile, or an explicit user-provided credit. It is not required. Do not assume that the repository owner is the author. Do not introduce a fixed person, fabricate attribution or alter legal copyright notices.
- Follow the convention's content order: short description and version note; main screenshot when available; application explanation and supporting images; optional features; installation; Git/build/required libraries; application and library licenses; references; optional final AI Usage box.
- Put Markdown `---` separators before Installation and License, surrounded by blank lines. Keep developer build details concise or collapsible.
- Keep real screenshots and logos local with relative paths, full aspect ratio and useful alternative text. Omit missing images instead of inserting fabricated application UI.
- Point documentation links at the actual manual. For CyDoc integrations, retain the real `Documentation.html` reader, locale fragment and offline directory; do not substitute Markdown sources.
- Keep detailed AI instructions in a separate sidecar such as this file. Do not insert them, test reports, audits or maintenance histories into the human README or its search/navigation. A final optional AI Usage box may link to those separate guides.

## Optional final AI Usage box

When wanted and useful, append a compact AI Usage box after references. Prefer a collapsible `details` block with a primary agent guide first, then actual task-specific Markdown links and one-line descriptions. The primary guide should explain the project and point to its important files; specialized guides may cover compiling the application, integrating its library, authoring content or building an application/showcase with it.

This box is optional. Use only verified existing destinations. Preserve the project's established primary agent file; do not replace its AGENTS.md or invent a DocAI.md merely to fill the box. Do not mistake an application build guide for a guide to building with its library. Keep detailed instructions in their own files, omit unavailable guides, and do not add the box to a human application manual by default.

## Versions and known issues

Use the actual project designation: Alpha, Beta, Stable, Development, Preview or another supported stage. If it cannot be established, record that uncertainty in working notes and resolve it before claiming a stage in public content.

- Alpha: describe experimental/testing availability and potentially incomplete features.
- Beta: describe validation before a stable release and point to known issues.
- Stable: describe the published stable release and link to changes/issues without promising bug-free operation.
- Other stages: write a factual description of that stage rather than relabeling it for consistency.

Version notes identify the release/component, changes, verified bugs, documented limitations and actual issue/release destinations. Keep limitations separate from confirmed bug tickets. Do not invent bug reports, release dates, compatibility claims or benchmarks. If the release does not publish a bug-by-bug list, say so and link the actual tracker without claiming there are no bugs.

Update the header version, stage, download and note file together. If multiple components have different versions, name each component. Do not label source-only features as part of a released binary when they have not shipped.

## Dependency licenses

Construct the library table from actual manifests, lockfiles, build scripts and notices. Use three columns: library/source, license/terms, and use/scope. Link the application license separately.

Identify runtime, optional, build, development, editor-only and native dependencies. Preserve dual-license choices, special exceptions and bundled-component notices. An MIT dependency does not make the host application MIT. An optional media engine must not be described as a core runtime dependency. Keep private source destinations identified as private; preserve distributed license texts.

Do not treat a table of main components as a replacement for complete transitive notices. Do not claim an exhaustive legal review or invent missing licensing evidence. Record unresolved licensing information in private working notes and report material gaps.

## Rendering and verification

The example uses a native HTML header table and keeps GitHub's visible borders. Its three columns contain links, logo and metadata, in that order. The preview renders that same table without adding a CSS layout or concealing its borders. GitHub removes custom classes and inline styles; validate the actual GitHub result before claiming fidelity.

Explain renderer limitations before presenting an incompatible layout. If a user wants both borderless columns and independent links, resolve that tradeoff first. Never substitute a centered stack for an approved three-column composition, or show a CSS-only local mockup as a GitHub solution.

Check relative files, links, anchors, images, reciprocal language links, version files, actual downloads and license references. Inspect both languages on desktop/mobile and check keyboard links, dark/light presentation and overflow when a local preview is supplied. Keep the content functional without the preview script. Never claim a browser, device, GitHub or offline check that did not run.

When GitHub publication is authorized, inspect both actual rendered README editions before reporting visual success. Confirm column positions, visible borders, logo, license/version/stage order and real link destinations, and save a screenshot as evidence outside the human README. For local-only delivery or unavailable GitHub access, explicitly state that GitHub rendering remains unverified. A local screenshot does not prove GitHub compatibility.

When working in this CyDoc checkout, run `node ai/readme/preview.mjs` to regenerate the example preview. Documentation-only changes need link/packaged-file checks; follow the repository instructions if code, examples or public configuration change. Keep generated preview output under ignored `artifacts/`; do not hand-edit or commit it.

Report the files created, the local preview path, checks performed and relevant rendering/compatibility limits. Keep publication local unless the user authorizes the next publishing action.

## Reuse prompt

```text
Update this application's README using the supplied CyDoc README convention,
DocAI.md and complete English/French templates. Inspect the actual project, builds, versions, development stage,
documentation, logo and dependency licenses. Include an author credit only
when wanted and supported by the project's credits or my instructions.
Prepare complete English/French editions and matching version notes with
documented limitations and real issue links. For GitHub, use a native three-column
table with visible borders: links on the left, logo in the middle, license,
versions, stage and download on the right. Keep version/stage below the license and
separate Installation and License clearly. If useful, append an optional
AI Usage box with the main agent guide and existing task-specific MD links.
Verify the result locally and report GitHub rendering as unverified until actually inspected,
preserve unrelated work and wait for my request before pushing or publishing.
```
