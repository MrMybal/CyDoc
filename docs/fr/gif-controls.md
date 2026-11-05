---
id: gif-controls
title: GIF contrôlables
description: Pause, image par image, zoom, comparaison et galeries de GIF.
section: Exemples
order: 32
---
Le module `gif` décode localement les images pour permettre pause, déplacement dans l’animation et comparaison synchronisée en temps. Il est optionnel. Un GIF utilisé dans un bloc `image` conserve la lecture native du navigateur.

```gif
{
  "id": "animation",
  "src": "assets/steps-a.gif",
  "title": "Animation contrôlable"
}
```

## Comparaison synchronisée {#compare}

```gif
{
  "id": "animation-compare",
  "src": "assets/steps-a.gif",
  "title": "Animation contrôlable",
  "compare": "assets/steps-b.gif"
}
```

## Galerie de GIF {#gallery}

```gallery
{
  "id": "animations",
  "items": [
    {
      "type": "gif",
      "id": "animation",
      "src": "assets/steps-a.gif",
      "title": "Animation contrôlable"
    },
    {
      "type": "gif",
      "src": "assets/steps-b.gif",
      "title": "Variante"
    }
  ]
}
```

## Mémoire et lecture {#memory}

La lecture démarre uniquement sur action du lecteur et s’arrête quand la page est masquée. Le décodeur gère les palettes, la transparence, l’entrelacement et les méthodes de disposition 0–3. La limite est de 64 Mio décodés par fichier, configurable avec `maxDecodedMiB` jusqu’à 256 Mio. Une animation hors budget affiche une erreur ; les images ne sont pas conservées après fermeture du lecteur.
