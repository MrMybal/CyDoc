---
id: themes
title: Thèmes et apparence
description: Six palettes pour la documentation, les contrôles et le code.
section: Exemples
order: 19
---
Choisissez un thème avec l’icône de palette dans la barre supérieure. Il s’applique au lecteur et aux contrôles des modules ; votre choix est conservé sur cet appareil.

[CyDoc Studio](doc:studio#appearance) propose les six mêmes thèmes. Dans l’application Windows, le changement d’apparence synchronise l’interface native, l’éditeur et le manuel intégré. Sombre est le thème par défaut de Studio.

| Thème | Usage |
| --- | --- |
| Clair | Lecture lumineuse |
| Sombre | Fond sombre neutre |
| Minuit | Palette indigo |
| Nord | Gris bleutés et accents froids |
| Papier | Fond crème et accents bruns |
| Contraste élevé | Contours et texte renforcés |

## Configuration initiale {#configuration}

```typescript
mountViewer(root, manifest, { initialTheme: "nord" });
```
Les graphes à nœuds et le rendu 3D conservent leur fond de travail adapté à l’inspection ; la barre d’outils, les légendes et les panneaux suivent le thème. La coloration du code est générée à la compilation, sans moteur de coloration dans le lecteur.
