# Structure complète de README d’application

[English](TEMPLATE.md) · [Convention](README.fr.md) · [Instructions IA](DocAI.md) · [Véritable exemple CyDoc](example/README.fr.md)

Recopier le contenu du bloc Markdown ci-dessous dans le `README.fr.md` de l’application cible. Remplacer chaque valeur en majuscules par une information vérifiée du projet. Ne pas publier le modèle tel quel. Retirer les images/téléchargements indisponibles, les sections Git/compilation non pertinentes et les blocs optionnels non souhaités. Le crédit auteur et le cadre AI Usage final sont optionnels. Utiliser le logo existant et les véritables licence, version et statut de l’application.

L’en-tête est un tableau natif à trois colonnes avec les bordures visibles de GitHub. Garder la même structure dans l’[édition anglaise complète](TEMPLATE.md). Lier le vrai manuel HTML et la bonne langue lorsqu’il existe. Les styles de l’aperçu local ne doivent pas créer une disposition indisponible sur GitHub ; inspecter le véritable résultat sur GitHub avant d’annoncer une réussite visuelle.

Les fichiers associés peuvent suivre cette organisation. Ces noms sont indicatifs : réutiliser les notes, ressources et guides IA existants plutôt que créer des doublons. Omettre les fichiers pour agents lorsqu’ils sont inutiles.

```text
App/
  README.md
  README.fr.md
  VERSION.md
  VERSION.fr.md
  LICENSE
  assets/
    branding/                 # Logo existant de l’application
    screenshots/              # Vraies captures du produit
  ai/                         # Guides spécialisés existants, optionnels
    README.md                 # Guide principal et index
    BUILD.md                  # Compiler cette application
    INTEGRATION.md            # Créer quelque chose avec sa bibliothèque
```

````markdown
<table width="100%">
  <tr>
    <td width="300" align="left" valign="top">
      <a href="WEBSITE_FR_URL">Présentation</a><br>
      <a href="MANUAL_FR_URL">Manuel</a><br>
      <a href="REPOSITORY_URL">Dépôt</a><br><br>
      <sub>README</sub><br>
      <a href="README.md">English</a> · <a href="README.fr.md">Français</a>
    </td>
    <td width="400" align="center" valign="middle">
      <img src="LOCAL_LOGO_PATH" alt="APP_NAME" width="128">
    </td>
    <td width="300" align="right" valign="top">
      <p><sub>Licence de l’application</sub><br><a href="LICENSE_PATH"><strong>LICENSE_NAME</strong></a></p>
      <p><sub>Version</sub><br><a href="VERSION.fr.md"><strong>EXACT_VERSION</strong></a><br><strong>STAGE</strong></p>
      <p><a href="DOWNLOAD_URL"><strong>Télécharger</strong></a><br><sub>AVAILABLE_PLATFORM</sub></p>
    </td>
  </tr>
</table>

<h1 align="center">APP_NAME</h1>

<!-- Crédit auteur optionnel : retirer ce paragraphe s’il n’est pas souhaité ou vérifiable. -->
<p align="center">By <a href="VERIFIED_AUTHOR_URL">AUTHOR_NAME</a></p>

SHORT_DESCRIPTION_AND_INTENDED_USERS

> **STAGE · EXACT_VERSION**
>
> STAGE_APPROPRIATE_MESSAGE. Consulter les [notes de version et problèmes connus](VERSION.fr.md).

<!-- Capture principale optionnelle : utiliser une vraie image et retirer ce bloc si elle manque. -->
[![MAIN_SCREENSHOT_DESCRIPTION](MAIN_SCREENSHOT_PATH)](MAIN_SCREENSHOT_PATH)

## À propos de APP_NAME

EXPLAIN_REAL_WORKFLOWS_AND_WHAT_USERS_CAN_DO

<!-- Image complémentaire optionnelle. -->
[![TOOL_SCREENSHOT_DESCRIPTION](TOOL_SCREENSHOT_PATH)](TOOL_SCREENSHOT_PATH)

## Fonctionnalités

<!-- Liste factuelle optionnelle : retirer si elle n’ajoute aucune information utile. -->
- **FEATURE_NAME** : ACTUAL_BEHAVIOR
- **FEATURE_NAME** : ACTUAL_BEHAVIOR

---

## Installation

SUPPORTED_PLATFORMS_AND_RUNTIME_REQUIREMENTS

1. [Télécharger l’application publiée](DOWNLOAD_URL).
2. VERIFIED_INSTALL_OR_EXTRACTION_STEP
3. VERIFIED_START_STEP

## Sources, compilation et bibliothèques nécessaires

<!-- Adapter ou retirer cette section si la compilation depuis les sources ou Git ne s’applique pas. -->
### Prérequis

- BUILD_TOOL_AND_REQUIRED_VERSION
- [REQUIRED_LIBRARY](LIBRARY_SOURCE_URL) — ROLE_AND_SCOPE

### Récupérer les sources

```sh
git clone REPOSITORY_CLONE_URL
cd CHECKOUT_FOLDER
```

### Compiler et lancer

```sh
VERIFIED_BUILD_COMMAND
VERIFIED_RUN_COMMAND
```

OPTIONAL_MODULES_AND_PLATFORM_BUILD_DETAILS

---

## Licence

APP_NAME utilise la [APPLICATION_LICENSE_NAME](LICENSE_PATH).

### Bibliothèques tierces

| Bibliothèque · sources | Licence · texte | Utilisation / périmètre |
| --- | --- | --- |
| [LIBRARY_NAME](LIBRARY_SOURCE_URL) | [LIBRARY_LICENSE_NAME](LIBRARY_LICENSE_URL) | ROLE_AND_OPTIONAL_OR_BUILD_ONLY_SCOPE |

Conserver les notices complètes des licences tierces livrées avec l’application. Ce tableau est un index des composants et de leurs conditions.

## Références et liens

- [Manuel](MANUAL_FR_URL)
- [Présentation](WEBSITE_FR_URL)
- [Dépôt des sources](REPOSITORY_URL)
- [Suivi des problèmes](ISSUE_TRACKER_URL)

<!-- Cadre final optionnel : conserver uniquement de vrais guides existants et retirer le cadre s’il est inutile. -->
<details>
<summary><strong>AI Usage</strong></summary>

- [Commencer ici : guide IA principal](PRIMARY_AI_GUIDE_PATH) — présentation du projet et fichiers Markdown importants.
- [Compiler cette application](BUILD_GUIDE_PATH) — prérequis et étapes de compilation vérifiées.
- [Créer avec cette bibliothèque](INTEGRATION_GUIDE_PATH) — intégration et procédures de création.
- [API publique](API_GUIDE_PATH) — interfaces prises en charge et contrats.

</details>
````
