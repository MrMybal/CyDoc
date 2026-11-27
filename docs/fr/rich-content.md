---
id: rich-content
title: Contenu enrichi
description: Onglets, étapes, encadrés, sections repliables, glossaire et différences de code.
section: Exemples
order: 30
previous: writing
next: media
sourceRevision: 1
---
Les mêmes explications peuvent présenter plusieurs langages sans allonger la page. Le terme [[PBR]] dispose d’une définition au clavier et au clic.

## Onglets de code {#tabs}

```tabs
{
  "title": "Choisir un langage",
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

## Tutoriel par étapes {#steps}

Donnez à chaque étape une action, un résultat visible et une solution facultative. Dans Studio, choisissez **Insérer un bloc → steps** pour remplir ces champs et monter ou descendre les étapes. **Résultat et dépannage** ouvre les champs facultatifs. Dans le lecteur, **Si cette étape échoue** affiche l’aide supplémentaire au moment utile.

```steps
{
  "items": [
    {
      "title": "Générer",
      "body": "Depuis le dépôt des sources, lancez `npm run build`.",
      "result": "La génération crée `dist/site/Documentation.html` et son dossier `DocData/`.",
      "troubleshooting": "Lisez l’erreur exacte de génération. Vérifiez que les dépendances sont installées et que les deux éditions linguistiques sont complètes."
    },
    {
      "title": "Distribuer",
      "body": "Copiez le dossier `dist/site/` avec votre application.",
      "result": "Le fichier d’entrée et son dossier `DocData/` complet restent ensemble."
    },
    {
      "title": "Ouvrir",
      "body": "[Ouvrez une section précise](doc:quickstart#installation).",
      "result": "La section de préparation du tutoriel s’ouvre.",
      "troubleshooting": "Suivez [les vérifications du lecteur](doc:troubleshooting#reader) si le manuel reste vide."
    }
  ]
}
```
```callout
{
  "type": "tip",
  "title": "Tout reste local",
  "body": "Les onglets et schémas ne font aucune requête réseau."
}
```
```callout
{
  "type": "warning",
  "title": "Identifiants stables",
  "body": "Conservez les identifiants de page, d’annotation et de média lors des mises à jour."
}
```
```details
{
  "title": "Détails de configuration",
  "body": "Ces blocs acceptent du Markdown assaini, y compris des [liens internes](doc:writing)."
}
```

## Différence de code {#diff}

```diff
{
  "title": "Ajouter une section au lien",
  "lang": "cpp",
  "before": "auto url = make_help_link(base, \"fr\", \"settings\");",
  "after": "auto url = make_help_link(base, \"fr\", \"settings\", \"export\");"
}
```

## Glossaire {#glossary}

```glossary
{
  "items": [
    {
      "term": "PBR",
      "definition": "Rendu basé sur des propriétés physiques des matériaux.",
      "link": "doc:mesh-viewer"
    },
    {
      "term": "Deep link",
      "definition": "Lien vers une page, section ou vue précise."
    }
  ]
}
```
