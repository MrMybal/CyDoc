---
id: advanced-search
title: Recherche dans le code
description: Filtres, tolérance aux fautes et résultats vers les lignes source.
section: Exemples
order: 37
---
La recherche inclut maintenant le code et les symboles. Filtrez les résultats par type de contenu et par langage. Les fautes légères sont acceptées sur les mots d’au moins quatre caractères.

Essayez `make_help_link`, puis filtrez **Code source** et **cpp**. Le résultat ouvre la ligne correspondante. Essayez `configuraton` pour retrouver `configuration`.

```typescript
"const results = docs.search(\"make_help_link\", \"fr\", 20, {\n  language: \"cpp\", kind: \"source\", fuzzy: true\n});"
```
