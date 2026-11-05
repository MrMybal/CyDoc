---
id: minimal-media
title: Lecteurs épurés
description: Images, vidéos, modèles et GIF avec commandes discrètes et agrandissement dans la fenêtre.
section: Exemples
order: 33
---

## Une image sans barre permanente {#image}

Survolez l’image : les icônes de réglages et d’agrandissement apparaissent. Elles sont également accessibles au clavier et restent visibles sur écran tactile. Le panneau de réglages conserve le zoom, le recentrage et les annotations.

```image
{"id":"clean-image","src":"assets/settings.svg","alt":"Paramètres de l’application","controls":"minimal"}
```

L’icône à quatre coins ouvre une grande vue dans la fenêtre de documentation. Les commandes de la fenêtre restent disponibles. Cliquez sur réduire ou appuyez sur Échap pour retrouver l’article à sa position de lecture.

## Une vidéo avec commandes au survol {#video}

La barre de lecture apparaît au survol ou au focus clavier. La vidéo démarre sur action du lecteur ; les annotations se trouvent dans les réglages.

```video
{"id":"clean-video","src":"assets/video-a.webm","title":"Présentation de l’application","controls":"minimal"}
```

## Un modèle 3D épuré {#mesh}

Le modèle reste manipulable directement. Le panneau de réglages donne accès aux scènes, à l’éclairage PBR, aux triangles, aux vues et aux annotations.

```mesh
{"id":"clean-mesh","src":"assets/sample-a.glb","title":"Modèle PBR","controls":"minimal"}
```

## Un GIF en lecture automatique {#gif}

L’animation démarre automatiquement et peut être mise en pause avec la barre de lecture. La lecture est suspendue hors de la zone visible. La préférence de réduction des animations est respectée.

```gif
{"id":"clean-gif","src":"assets/steps-a.gif","title":"Étapes animées","controls":"minimal"}
```

## Une galerie épurée {#gallery}

L’option de la galerie s’applique à ses éléments. Chaque élément peut choisir `"controls": "full"` pour afficher ses outils en permanence.

```gallery
{"id":"clean-gallery","title":"Médias de l’application","controls":"minimal","items":[{"type":"image","src":"assets/settings.svg","alt":"Paramètres"},{"type":"gif","src":"assets/steps-a.gif","title":"Animation"},{"type":"video","src":"assets/video-a.webm","title":"Présentation"},{"type":"mesh","src":"assets/sample-a.glb","title":"Modèle 3D"}]}
```

## Choisir la présentation {#configuration}

Ajoutez `"controls": "minimal"` au JSON d’un bloc `image`, `video`, `mesh` ou `gif`. La valeur par défaut est `"full"`. Pour un GIF épuré sans démarrage automatique, ajoutez `"autoplay": false`. Un lecteur GIF complet peut utiliser `"autoplay": true`. Un lien ciblant une image précise du GIF reste en pause pour permettre son inspection.
