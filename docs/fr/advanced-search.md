---
id: advanced-search
title: Trouver une section ou une API
description: Lire des extraits utiles, affiner les résultats et ouvrir la bonne section.
section: Exemples
order: 37
sourceRevision: 1
---

Utilisez le champ de recherche dans l’en-tête ; les résultats apparaissent pendant la saisie. Ctrl+K ouvre aussi la recherche.
La recherche inclut les explications, les exemples de code et les symboles documentés. Chaque résultat indique sa place dans le manuel, les mots trouvés et un extrait. Une section nommée s’ouvre directement au bon passage. Un résultat correspondant au titre d’une page peut s’ouvrir au début de celle-ci.

Essayez `make_help_link`, puis sélectionnez **API** et **cpp**. Ces résultats renvoient aux API documentées. Essayez `configuraton` pour retrouver `configuration` ; les petites fautes de frappe sont tolérées sur les mots d’au moins quatre caractères.

Si un filtre masque le résultat recherché, choisissez **Effacer les filtres**. Vos mots restent dans le champ. Sans filtre actif, **Effacer la recherche** propose à nouveau les pages de départ. Vous pouvez aussi changer les mots employés ou raccourcir la requête. Consultez [la navigation et les commandes au clavier](doc:navigation#search).

Les applications qui intègrent CyDoc peuvent utiliser son API de recherche :

```typescript
const results = docs.search("make_help_link", "fr", 20, {
  language: "cpp", kind: "api", fuzzy: true
});
```
