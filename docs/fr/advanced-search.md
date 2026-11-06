---
id: advanced-search
title: Recherche dans le code
description: Filtres, tolérance aux fautes et résultats vers les lignes source.
section: Exemples
order: 37
---

Utilisez le champ de recherche dans l’en-tête ; les résultats apparaissent pendant la saisie. Ctrl+K ouvre aussi la recherche.
La recherche inclut maintenant le code et les symboles. Filtrez les résultats par type de contenu et par langage. Les fautes légères sont acceptées sur les mots d’au moins quatre caractères.

Essayez `make_help_link`, puis filtrez **Code source** et **cpp**. Le résultat ouvre la ligne correspondante. Essayez `configuraton` pour retrouver `configuration`.

```typescript
"const results = docs.search(\"make_help_link\", \"fr\", 20, {\n  language: \"cpp\", kind: \"api\", fuzzy: true\n});"
```
