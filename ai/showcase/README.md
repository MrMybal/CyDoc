# Application showcase convention for AI assistants

Use this self-contained guide to build or update a complete static showcase for an application. Its visual reference is the complete [bundled CyDoc example](example/index.html), including its own images, scripts, styles and real offline HTML manual. No external website is needed to understand or apply the convention. This guide is written in English for AI assistants; the resulting showcase must provide complete English and French editions.

Git, GitHub, GitHub Pages and public hosting are optional. The same showcase must be usable from an ordinary project folder, as a local application companion, or on another static host. Building a showcase does not authorize pushing or publishing it.

## Reuse this convention

Give an assistant this file, access to the target application project, and this instruction:

```text
Build the application's complete showcase using this convention. Start by
opening example/index.html from this folder in a browser, then inspect the
target application's real features, documentation, branding and builds.
Implement and verify the complete result locally. Bundle all resources and
use local links by default. Add GitHub or another external destination only
when explicitly requested and verified. Make a local commit if this is
already a Git repository. Keep the result local until I request publication.
```

Follow the current task's scope. When applying this convention to another application, keep that application's own `AGENTS.md` and build conventions. Do not replace them with CyDoc's repository instructions.

## 1. Inspect the local example and the application

First open [example/index.html](example/index.html) directly from this folder. Switch between English and French, explore its chapters, media tabs, theme comparison, screenshot enlargement and bundled documentation. This is the complete CyDoc showcase adapted for standalone use, with real product captures and no outbound navigation. Application installers and repository hosting are omitted; the example never pretends that those files are included.

Use its composition and interaction patterns while retaining the target application's own identity, screenshots and content. Do not copy CyDoc's claims, branding or application-specific sections into another product. The [example notes](example/README.md) explain its file layout and dependency-free rebuild command. Copy this entire `showcase/` folder to use the convention elsewhere; none of its reference links require the parent checkout, Git or a connection.

Before editing:

1. Read the target project's instructions, README, documentation, build scripts and license. Inspect its existing showcase before choosing new paths or tooling.
2. Check the working tree when Git is present and preserve unrelated changes. Work normally in a folder without Git; do not initialize a repository just to follow this guide.
3. Inspect implementation and, where possible, run the application to verify its actual workflows. Read relevant modules rather than inferring features from names alone.
4. Identify its existing local logo, colors, supported languages, current development status, available platform builds, real downloads and documentation entry points.
5. Record a small working inventory of features, supporting evidence, screenshots to capture and destination links. Keep this inventory outside the public showcase and human manual.

Distinguish implemented behavior, runnable examples, available release builds and future plans. A compile target or source example does not prove that a downloadable or tested native version exists. Verify remote release and repository destinations before using them.

Implement the full page, its resources, build and preview instructions, interactions and translations. A design proposal, wireframe or unfinished placeholder page does not satisfy an implementation request.

## 2. Visual direction and first screen

Use a dark graphite background, light text, restrained borders and accent colors suited to the application. Use modern, readable typography and deliberate spacing. Prefer a system font stack or licensed, locally bundled fonts.

Keep the introduction compact: application name, a short concrete explanation, useful actions and an honest status/platform note. Avoid oversized slogans, large empty bands and excessive badges. A visitor should immediately understand what the application does.

When the application has an existing local logo, place it directly beside its name in the introduction, as shown in the bundled example. Scale it with the title on desktop and mobile. Keep the image decorative when the adjacent name already identifies the application; omit the logo if none exists.

On desktop, the initial viewport must contain a large, complete screenshot of the application alongside or immediately below the compact introduction. A two-column layout is often appropriate. The image must remain useful at the displayed size.

- Preserve the screenshot's aspect ratio and full frame. Use containment rather than a crop or background cover treatment for the main image.
- Fit the image and its frame within the space left by the header, introduction and margins. Do not fix only the image width and let its bottom fall below the viewport.
- Account for sticky headers, captions and the longer French copy. Check the initial state at scroll position zero in both languages.
- Do not hide overflow to disguise a clipped image or shrink the entire interface into an unreadable thumbnail.
- Do not place floating promotional labels, invented UI or marketing badges over screenshots. Put descriptions and captions outside the captured interface.
- Load the main image eagerly; reserve its dimensions to avoid layout jumps. Lazy-load suitable images further down the page.

Use responsive layouts that stack naturally on mobile, retain the screenshot's full aspect ratio and avoid horizontal overflow. The requirement to fit the entire introduction and main screenshot into the first screen applies to normal desktop viewports; mobile may scroll to the complete image. At increased text zoom, preserve readable content and scrolling instead of forcing everything into one screen.

## 3. Content and chapter structure

Explain what the application is for, who uses it and what users can accomplish. Organize the page around real tasks, modes and tools rather than a generic marketing template.

A useful structure is:

| Area | Expected content |
| --- | --- |
| Header | Identity, feature chapters, documentation, language selection and available repository/download actions |
| Introduction | Name, concise purpose, useful actions, current status/platforms and the main screenshot |
| Main workflows | Illustrated sections explaining the application's actual modes and everyday tasks |
| Tools and details | Editors, panels and specific capabilities shown with relevant captures |
| Documentation | A clear entry into the real user manual and appropriate contextual pages |
| Availability | Existing builds, prerequisites and relevant limitations |
| FAQ, when useful | Factual answers to questions the repository can substantiate |
| Footer | Available documentation, source, license and download destinations |

The page can be long. Provide chapter navigation with stable anchors, and ensure sticky elements do not cover section headings. Vary the composition with text/image alternation, wide screenshots, focused details, galleries and meaningful comparisons. Use tabs or comparisons only when they help explain real alternatives.

Write specific, plain language. Show useful tasks and results. Do not invent features, testimonials, adoption numbers, benchmarks, awards, compatibility claims or release dates. Do not imply that a planned feature is currently usable. State alpha/beta status and available platforms honestly. Describe the application's own license accurately; using CyDoc does not make the host application MIT licensed.

Keep AI instructions, capture inventories, audits, build logs and verification histories out of the public page and its navigation. They belong in project guidance or private working records.

## 4. Real screenshot convention

Use many relevant captures when the application's scope warrants them. Cover the main interface and the important modes, editors, panels and tools. Prefer several informative views over repeated copies of the same image. There is no arbitrary screenshot quota.

1. Use the real application or its actual browser interface. Prepare representative, disposable example projects if necessary.
2. Capture a stable state after fonts, images, viewers and example data have loaded. Avoid empty workspaces unless an empty state is the feature being explained.
3. Use synthetic or public example data. Exclude private documents, credentials, account information, personal paths and unrelated windows. Prepare a clean capture environment instead of relying on later concealment.
4. Retain a recognizable overview. Detail crops may supplement it when clearly described, but must not misrepresent the UI or substitute for the complete main image.
5. Do not fabricate or regenerate product UI with an image generator, composite unavailable tools into a capture, or add promotional overlays. Label diagrams and conceptual illustrations as such.
6. Keep suitable resolution for enlargement. Convert selected captures to local WebP, PNG or another supported format without making small UI text unreadable. Preserve aspect ratios.
7. Give each image useful English and French alternative text and an accurate caption. A French page may show the application's English UI when that is the real available interface; do not imply a UI translation that does not exist.
8. Keep a source-side catalog or equivalent record of the captured view, example data, filename and caption. Keep temporary originals and QA captures in the project's ignored working directory; commit selected public assets when Git is used.

Use the application's existing local logo when available. Do not reuse the reference application's logo. If no logo exists, use a restrained text identity rather than inventing official branding. Preserve required asset licenses and notices.

## 5. In-page enlargement and accessible interactions

Make screenshots enlarge inside the current page or application window. Do not invoke native browser/OS fullscreen or require opening another tab to see an image.

The image viewer must:

- Open from a semantic, keyboard-accessible control with a translated accessible name.
- Show the complete image initially, with a translated caption and a visible close button that works on touch devices.
- Close with Escape and the close button. Backdrop dismissal may also be provided.
- Move focus into the viewer, contain keyboard focus while modal, and restore focus to the originating control on close.
- Prevent background interaction while open and restore the previous page scroll position when closed.
- Preserve image proportions and allow the close control to remain reachable at narrow sizes and increased zoom.
- Support keyboard image navigation if the viewer offers previous/next controls. Do not add controls that have no working behavior.

Provide visible focus states, semantic headings, descriptive links, a skip link and adequate text contrast. Menus must expose their expanded state and work with keyboard and touch. Tabs, comparison sliders and FAQ controls need appropriate labels and keyboard behavior. Respect reduced-motion preferences and avoid essential information available only on hover.

## 6. Navigation, languages and optional destinations

English is the default. Provide a complete French translation and an explicit language selector. Use a reproducible URL such as `?lang=fr`; without an explicit selection, open in English. Normalize unsupported selections to English. Preserve section anchors and unrelated URL parameters when switching language.

Translate all visitor-facing strings: headings, body copy, navigation, captions, alternative text, buttons, tooltips, image-viewer controls, status text, FAQ answers, document title and relevant metadata. Proper names, code identifiers and actual UI labels may keep their original spelling. Update the document's `lang` attribute and the selector's active state.

Keep both editions complete and current. Validate matching translation keys and nonempty strings during the build, then review the actual copy; matching keys alone do not establish translation quality. Never fill French gaps with copied English paragraphs or placeholders.

The header must link to the feature chapters and actual local documentation. Keep the language selector accessible on mobile. Use local navigation by default. Repository hosting and remote downloads are optional integrations, added only when requested; the bundled example contains none.

| Project situation | Navigation behavior |
| --- | --- |
| GitHub integration is requested and a public repository is verified | Show a clearly labeled GitHub button on desktop and mobile; on mobile keep it directly visible outside a collapsed menu |
| Another external source destination is requested | Link to that verified destination with its actual service name or a clear source label |
| No public source destination exists | Omit the source button; do not invent a GitHub URL or expose a private repository |
| A downloadable build is supplied locally | Link to the actual bundled file, stating platform and development status; add a remote release destination only when requested |
| No public download exists | Omit the download action or explain the verified availability without a fake link |
| The showcase is distributed locally | Use relative documentation/assets/download paths where real local files are supplied |

Do not leave disabled placeholder buttons, `href="#"` actions or empty destinations. Keep optional external links supplemental: viewing the showcase and its bundled manual must not require a GitHub account or network connection.

## 7. Preserve the real documentation reader

If the application already uses CyDoc, keep its actual generated HTML reader. Do not replace documentation actions with GitHub file views, raw Markdown, a static text copy or a new imitation reader.

For application integrations, documentation sources and tooling belong in `App/.CyDocBuild/`, and the generated manual belongs in `App/Documentation/`. Use the target application's installed CyDoc build tool and its own documentation sources when a manual needs changes. The bundled example already contains a working generated reader; do not replace it with Markdown or an imitation reader.

Copy the complete generated export into the showcase's manual directory, preserving its structure:

```text
<showcase-output>/
  index.html
  assets/
  manual/
    Documentation.html
    DocAI.md
    DocData/
      viewer.js
      viewer.css
      data.js
      manifest.json
      assets/
      ... enabled modules, packed assets, notices and version exports
```

Use relative documentation links with the selected language and verified page/anchor IDs. For example, `./manual/Documentation.html#/en/overview` and `./manual/Documentation.html#/fr/overview` are valid only if this manual actually contains the `overview` page. Other applications may use a different home page. Update all contextual documentation actions when the showcase language changes.

Keep `Documentation.html` as the public reader entry point, preserve legacy redirects and deep links, and keep `DocData/` intact. Preserve the classic-script bootstrap and local binary asset provider. Do not introduce `fetch()` for local manifests or media, runtime CDNs, or a server requirement for reading. Verify the reader through `file://` after copying it.

The reader owns the URL fragment and applies a global CSS reset. Prefer linking to its dedicated page. If the task calls for embedding it, isolate it in a dedicated page or iframe so its routes and styles do not conflict with the showcase.

English originals and complete, nonempty, current French documentation are required for a CyDoc export. Repair the sources and rebuild when validation fails; do not patch generated manifests or bundles. Additional incomplete locales remain withheld. `DocAI.md` stays a separate sidecar, outside human navigation and search.

If the application uses another documentation system, preserve its genuine supported entry point and language behavior. Do not install CyDoc solely because this showcase convention is used. Report unavailable documentation or translations as concrete limitations.

## 8. Source layout and local integration

Reuse the project's existing showcase structure and toolchain. For a new implementation, a small source directory and a separate generated output are sufficient:

```text
App/
  website/                    # Maintained showcase inputs; name may follow the project
    README.md                 # Actual build, preview and optional hosting instructions
    ... content, templates, styles, scripts and local screenshot assets
  dist/website/               # Generated static output; do not hand-edit or commit
  .CyDocBuild/                # Existing CyDoc inputs/tooling, if applicable
  Documentation/             # Generated application manual, if applicable
```

This layout works in an ordinary folder without `.git/`, a remote, an account or a CI service. Do not make local builds depend on a GitHub API, release lookup or repository metadata at runtime. Keep verified optional destinations in source-side configuration or content; omit absent ones during generation. A local build should also work when Git metadata is unavailable.

The generated output can be copied beside an application and opened through `index.html`, or served by an existing static site. An application can open its installed file URL with the platform's URL/path API; encode paths correctly, including spaces and non-ASCII characters. A WebView embedding must use a dedicated page and follow the host's restrictions. Do not claim native integration was tested unless it actually was.

Keep screenshots, styles, scripts, fonts and documentation local. Use relative paths that work at a domain root, under a project subpath and after moving the output directory. Avoid absolute `/assets/...` or `/manual/...` paths, hard-coded repository names and history routing that needs server rewrites.

Prefer simple static HTML/CSS and a locally bundled classic script for interactions. Prerender useful English content and navigation. Do not depend on JavaScript modules, runtime content fetches, external APIs or a remote font service for file-based opening. Preserve the application's existing architecture when integrating with an established site.

Provide reproducible build and loopback preview commands in the target project's README. Use its actual installed toolchain and lockfile. Do not assume that CyDoc's npm scripts exist in another application; add and document the required commands when implementing them.

The bundled example opens immediately without Node.js, installation or a build. To edit and regenerate its HTML and cache-revisioned styles/scripts with Node.js 22+, run from this folder:

```sh
node example/rebuild.mjs
node verify.mjs
node preview.mjs
```

The rebuild uses only Node.js built-ins and files inside this folder. It keeps the genuine manual under `example/manual/Documentation.html`. The optional preview serves only this convention folder, binds to loopback and prints its local URL. Neither command publishes anything. See [example/README.md](example/README.md) for editing and adaptation instructions.

## 9. Static hosting, cache updates and optional GitHub Pages

Produce a complete static artifact that can be copied to a local folder, an intranet, an existing website or another static host. GitHub Pages compatibility means the artifact also works under a project subpath; it does not require using GitHub.

For styles and scripts, generate content-hashed filenames or another reliable content revision whenever their contents change. Update HTML references in the same build. Apply the same principle to replaced images when they may be cached under old names. Do not rely on asking visitors to hard-refresh. If adding hosting advice, keep HTML revalidation distinct from long-lived caching of hashed assets; hashes alone cannot refresh an already cached HTML document.

Validate the final artifact's local references and copy all required licenses and dependency notices. Keep editor services, databases, credentials, profiles, source workspaces and temporary capture files out of the generated site.

When GitHub Pages is explicitly requested, adapt the existing deployment process to publish only the generated static artifact. Add a workflow or change repository settings only within that request. Do not add deployment automation merely to prepare a compatible local build. The same applies to any other host.

Existing workflows may publish automatically on a push. Keep the work local until the user asks to push or publish; a local commit is not publication permission. Do not run a deployment workflow, create a release or upload the site as part of a local handoff.

## 10. Verification and acceptance

Run the target project's applicable build and checks. For CyDoc code changes, follow its repository test requirements; for documentation-only edits, verify links and packaged files. Build a separate consumer manual when changing examples or configuration. Do not treat a successful build or a DOM fixture as proof of visual rendering or native compatibility.

For a showcase implementation, open the generated result in a real browser and check the following:

| Check | Acceptance criteria |
| --- | --- |
| Desktop first screen | At 1280 × 720, 1366 × 768 and a larger viewport such as 1920 × 1080, at normal zoom and scroll position zero, the main screenshot's complete frame is visible in both EN and FR without clipping or overlays |
| Mobile layout | At widths such as 360 and 390 CSS pixels, plus a tablet width, navigation and actions fit, text is readable, full images retain their ratio and there is no unintended horizontal page scrolling |
| Increased text/zoom | At 200% zoom, content and controls remain available through reflow/scrolling; nothing essential is cut off |
| Languages | Direct English/French URLs, language switching, document language/title, all copy, captions, accessible names and selected-state feedback are correct |
| Links | Chapters, contextual manual links, repository and download destinations reach verified targets; omitted destinations leave no broken controls |
| Images | Every image loads, shows real relevant content, has suitable alternative text and remains readable when enlarged |
| Image viewer | Pointer and keyboard opening, visible close control, Escape, focus containment/restoration and background scroll restoration work |
| Other interactions | Mobile menu, tabs, galleries, comparison sliders and FAQ controls work by keyboard and touch-sized controls wherever present |
| Offline/local opening | Open the generated `index.html` and the copied CyDoc `Documentation.html` through `file://`; check languages, navigation and local media without a network dependency |
| Static subpath | Serve the artifact under a non-root path and verify relative resources and manual links; no server rewrite is required |
| Runtime health | Inspect browser errors and missing resources, and fix issues attributable to the showcase |
| Artifact boundaries | Generated output contains required assets/notices and excludes private data and authoring services |
| Cache renewal | A CSS/script content change produces a new revisioned URL and the generated HTML references the new file |

Use browser viewport emulation for responsive checks when appropriate, and state that it is emulation. Check a representative enlarged screenshot on both desktop and mobile. Record actual viewport sizes and checks in working notes outside public content.

Capture a desktop first-screen preview and a mobile preview after verification. If an application, browser, platform or codec could not be exercised, describe the specific limitation rather than claiming full support. Continue any independent implementation and checks that remain possible.

## 11. Local commit and handoff

When applying this convention in an existing Git repository, create a local commit after verification unless the user or repository instructions say otherwise. Review the diff, include only the task's maintained sources, guidance and selected public assets, and preserve unrelated staged/unstaged changes. Follow the project's rules for generated files. Do not amend unrelated commits or rewrite history.

Without Git, deliver the same complete files and static output. State that no commit was made because the folder is not a Git repository; do not turn optional Git support into a blocker.

At the end of an implementation task, provide:

- A working local preview URL and the generated entry file's path, with commands to reopen the preview. State if the server is no longer running.
- An actual visual preview of the verified result, preferably the desktop first screen and a mobile view.
- A concise description of the implemented sections, language support and documentation integration.
- The checks that ran and any specific remaining limits.
- The local commit identifier when applicable, and confirmation that no push or publication occurred.

Keep the site local and wait for the user's request before pushing, deploying or publishing.
