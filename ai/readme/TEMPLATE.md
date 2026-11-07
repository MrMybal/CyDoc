# Complete application README structure

[Français](TEMPLATE.fr.md) · [Convention](README.md) · [Agent instructions](DocAI.md) · [Real CyDoc example](example/README.md)

Copy the contents of the Markdown block below into the target application's `README.md`. Replace every uppercase placeholder with verified project information. Do not publish the template unchanged. Remove unavailable images/downloads, irrelevant Git/build sections and unwanted optional blocks. Author attribution and the final AI Usage box are optional. Use the existing logo and the application's actual license, version and stage.

The header is a native three-column table with visible GitHub borders. Keep the same structure in the [complete French edition](TEMPLATE.fr.md). Link to the actual HTML manual and matching locale when it exists. Local preview styles must not create a layout unavailable on GitHub; inspect the actual GitHub result before reporting visual success.

The related files can follow this layout. Filenames below are illustrative: reuse existing notes, assets and agent guides rather than creating duplicates. Omit agent files when unused.

```text
App/
  README.md
  README.fr.md
  VERSION.md
  VERSION.fr.md
  LICENSE
  assets/
    branding/                 # Existing application logo
    screenshots/              # Real product captures
  ai/                         # Optional existing task guides
    README.md                 # Primary guide and index
    BUILD.md                  # Build this application
    INTEGRATION.md            # Build something with its library
```

````markdown
<table width="100%">
  <tr>
    <td width="300" align="left" valign="top">
      <a href="WEBSITE_EN_URL">Website</a><br>
      <a href="MANUAL_EN_URL">Manual</a><br>
      <a href="REPOSITORY_URL">Repository</a><br><br>
      <sub>README</sub><br>
      <a href="README.md">English</a> · <a href="README.fr.md">Français</a>
    </td>
    <td width="400" align="center" valign="middle">
      <img src="LOCAL_LOGO_PATH" alt="APP_NAME" width="128">
    </td>
    <td width="300" align="right" valign="top">
      <p><sub>Application license</sub><br><a href="LICENSE_PATH"><strong>LICENSE_NAME</strong></a></p>
      <p><sub>Version</sub><br><a href="VERSION.md"><strong>EXACT_VERSION</strong></a><br><strong>STAGE</strong></p>
      <p><a href="DOWNLOAD_URL"><strong>Download</strong></a><br><sub>AVAILABLE_PLATFORM</sub></p>
    </td>
  </tr>
</table>

<h1 align="center">APP_NAME</h1>

<!-- Optional author credit: omit this paragraph when unwanted or unverified. -->
<p align="center">By <a href="VERIFIED_AUTHOR_URL">AUTHOR_NAME</a></p>

SHORT_DESCRIPTION_AND_INTENDED_USERS

> **STAGE · EXACT_VERSION**
>
> STAGE_APPROPRIATE_MESSAGE. Read the [version notes and known issues](VERSION.md).

<!-- Optional main screenshot: use a real image and omit this block if unavailable. -->
[![MAIN_SCREENSHOT_DESCRIPTION](MAIN_SCREENSHOT_PATH)](MAIN_SCREENSHOT_PATH)

## About APP_NAME

EXPLAIN_REAL_WORKFLOWS_AND_WHAT_USERS_CAN_DO

<!-- Optional supporting image. -->
[![TOOL_SCREENSHOT_DESCRIPTION](TOOL_SCREENSHOT_PATH)](TOOL_SCREENSHOT_PATH)

## Features

<!-- Optional factual list: remove when it adds no useful information. -->
- **FEATURE_NAME:** ACTUAL_BEHAVIOR
- **FEATURE_NAME:** ACTUAL_BEHAVIOR

---

## Installation

SUPPORTED_PLATFORMS_AND_RUNTIME_REQUIREMENTS

1. [Download the published application](DOWNLOAD_URL).
2. VERIFIED_INSTALL_OR_EXTRACTION_STEP
3. VERIFIED_START_STEP

## Source, build and required libraries

<!-- Adapt or remove this section when a source build or Git workflow does not apply. -->
### Requirements

- BUILD_TOOL_AND_REQUIRED_VERSION
- [REQUIRED_LIBRARY](LIBRARY_SOURCE_URL) — ROLE_AND_SCOPE

### Get the source

```sh
git clone REPOSITORY_CLONE_URL
cd CHECKOUT_FOLDER
```

### Build and run

```sh
VERIFIED_BUILD_COMMAND
VERIFIED_RUN_COMMAND
```

OPTIONAL_MODULES_AND_PLATFORM_BUILD_DETAILS

---

## License

APP_NAME uses the [APPLICATION_LICENSE_NAME](LICENSE_PATH).

### Third-party libraries

| Library · source | License · terms | Use / scope |
| --- | --- | --- |
| [LIBRARY_NAME](LIBRARY_SOURCE_URL) | [LIBRARY_LICENSE_NAME](LIBRARY_LICENSE_URL) | ROLE_AND_OPTIONAL_OR_BUILD_ONLY_SCOPE |

Retain the full third-party license notices supplied with the application. This table is an index of components and their terms.

## References and links

- [Manual](MANUAL_EN_URL)
- [Website](WEBSITE_EN_URL)
- [Source repository](REPOSITORY_URL)
- [Issue tracker](ISSUE_TRACKER_URL)

<!-- Optional final box: keep only real, existing guides and remove the whole box when unused. -->
<details>
<summary><strong>AI Usage</strong></summary>

- [Start here: primary AI guide](PRIMARY_AI_GUIDE_PATH) — project overview and important Markdown files.
- [Build this application](BUILD_GUIDE_PATH) — requirements and verified build steps.
- [Build with this library](INTEGRATION_GUIDE_PATH) — integration and creation workflows.
- [Public API](API_GUIDE_PATH) — supported interfaces and contracts.

</details>
````
