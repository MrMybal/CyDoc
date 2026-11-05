---
id: extraction
title: Extraire depuis le code
description: Gardez les explications au plus près des fonctionnalités et générez des pages à partir des commentaires.
section: Intégration
order: 21
---
Les exemples couvrent **C++, Python, HLSL, GLSL, C#, C, JavaScript, Java et TypeScript** : code coloré, annotations transformées en pages et liens entre fichiers. L’extraction et l’index des dépendances sont lexicaux ; ils ne réalisent pas d’analyse sémantique de ces langages.

## Annoter une fonctionnalité {#annotations}

Ajoutez un bloc de commentaire avec `@doc`, `@locale` et `@title`, suivis du contenu Markdown. `@section` et `@order` sont optionnels.

```typescript
/**
 * @doc api-links
 * @locale fr
 * @title API des liens
 * @section API
 * @order 100
 * Construit un lien vers une page locale.
 *
 * ## Paramètres {#parameters}
 * locale : langue souhaitée.
 * pageId : identifiant stable de la page.
 */
```

Les pages du [parcours API](doc:api-tour) sont réellement extraites des fichiers du dépôt. Ajoutez `@symbol` pour indiquer le nom du symbole documenté. Le badge source permet de retrouver son fichier et sa ligne.

En Python, placez les mêmes annotations dans une docstring :

```python
def make_help_link(base, locale, page_id):
    """
    @doc python-links
    @locale fr
    @title Liens Python
    @symbol make_help_link
    Construit un lien vers une page locale.
    """
```

## Choisir les sources {#sources}

Le champ `sources` de la configuration indique les répertoires à parcourir. Les dossiers cachés, `node_modules` et `dist` sont ignorés.

```json
{
  "sources": ["examples"],
  "sourceIndex": {
    "enabled": true,
    "includeDirs": ["examples/cpp/include", "examples/shaders"]
  }
}
```

La génération échoue si deux pages partagent le même couple langue/identifiant. Une page générée conserve le chemin relatif et la ligne du commentaire pour en indiquer l’origine.

## Fichiers et dépendances {#dependencies}

`sourceIndex.enabled` génère une page par fichier et par langue, avec son code coloré, les liens vers ses symboles documentés et les dépendances reconnues. Les `include` C/C++ et shaders, les modules C++20, les imports Python/JavaScript/TypeScript/Java et les espaces de noms C# sont reliés aux fichiers locaux lorsque leur chemin peut être résolu. Les dépendances externes restent affichées comme non résolues. Un import TypeScript en `.js` peut pointer vers le fichier `.ts` correspondant.

Consultez les [exemples dans les neuf langages](doc:code-languages) et le [parcours entre API, header, implémentation et module](doc:api-tour).

## Ajouter un adaptateur {#adapters}

La fonction `extractComments(source, filename)` produit des métadonnées et du Markdown, puis le compilateur traite ces pages comme les fichiers rédigés manuellement. Ce contrat est la base d’adaptateurs futurs.

L’extraction utilise les délimiteurs `/* ... */` et les docstrings Python triples, avec guillemets simples ou doubles. Les commentaires XML C#, les signatures, les types, les macros, la compilation conditionnelle et la résolution complète des paquets ne sont pas analysés. Les marqueurs placés dans une chaîne de caractères peuvent être confondus avec un commentaire : utilisez cet extracteur sur des annotations maîtrisées.
