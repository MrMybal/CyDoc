---
id: media
title: Médias et lecteurs
description: Des lecteurs optionnels pour explorer, annoter et comparer vos images, vidéos et meshes.
section: Créer du contenu
order: 11
---
Chaque lecteur de média est un module optionnel. L’application choisit ceux qu’elle distribue ; le noyau n’importe aucun lecteur ni moteur 3D. Les modules sont chargés à l’approche de leur contenu, puis libèrent leurs ressources à la fermeture de la page.

```json
{ "modules": ["image", "video", "mesh", "gallery", "graph"] }
```

Retirez les modules inutiles dans `cydoc.config.json`. Sans module, une image simple ou un lien vers le fichier reste disponible. Les médias sont placés dans `assets/` et restent locaux.

Les exemples dédiés montrent une [image seule](doc:image-viewer), une [vidéo seule](doc:video-viewer), un [mesh seul](doc:mesh-viewer), des [galeries](doc:galleries) et des [graphes à nœuds](doc:blueprints).

## Images {#images}

Le module image permet d’agrandir, zoomer, déplacer et comparer deux images dans un même cadre. Les transformations sont synchronisées pour conserver l’alignement pendant la comparaison.

Glissez la poignée directement sur la séparation A/B. Elle suit le curseur inférieur et accepte aussi les flèches du clavier. Le bouton à quatre coins agrandit le lecteur dans la fenêtre de documentation ; Échap le réduit. Ces contrôles sont communs aux comparaisons d’images, de vidéos et de meshes.

```image
{"src":"assets/settings.svg","compare":"assets/settings-b.svg","alt":"Évolution des paramètres de l’application","labels":["Avant","Après"]}
```

```markdown
![Description accessible](assets/settings.svg)
```

## Vidéos locales {#video}

Le module vidéo synchronise la lecture, la position et la vitesse de deux vidéos. Le curseur A/B compare leurs images dans le même cadre. Ajoutez une annotation au moment courant ; cliquez dans le cadre pour choisir sa position. Les annotations peuvent être supprimées et exportées en JSON.

```video
{"src":"assets/video-a.webm","compare":"assets/video-b.webm","title":"Comparaison vidéo · annotations temporelles","sources":[{"src":"assets/video-av1.webm","type":"video/webm; codecs=av01.0.04M.08"},{"src":"assets/video-a.webm","type":"video/webm; codecs=vp9"}],"annotations":[{"time":1,"duration":2,"text":"Même instant, deux traitements","x":0.5,"y":0.2}]}
```

~~~markdown
```video
{"src":"assets/tutorial.webm","compare":"assets/version-b.webm","annotations":[{"time":2,"duration":4,"text":"Étape importante"}]}
```
~~~

AV1 et VP9 permettent une forte compression. Le lecteur utilise les décodeurs du navigateur : ajoutez des variantes dans `sources` et `compareSources`, et un MP4 H.264 si vos appareils le nécessitent. Le module ne réencode pas les fichiers. La comparaison utilise deux décodeurs ; elle est synchronisée en temps, sans garantie d’exactitude à l’image près.

## Meshes statiques et PBR {#meshes}

Le module mesh est séparé et utilise Three.js, sous MIT, comme dépendance optionnelle. Il permet l’orbite, le zoom, le déplacement, le rendu PBR glTF, trois ambiances lumineuses, le choix de scène glTF, la vue en triangles et une comparaison A/B avec une caméra commune.

```mesh
{"src":"assets/sample-a.glb","compare":"assets/sample-b.glb","title":"Inspection PBR · deux matériaux","annotations":[{"text":"Surface métallique","position":[0,0.6,0]}]}
```

Saisissez une annotation puis double-cliquez sur une surface du modèle pour l’ancrer dans l’espace 3D. Les annotations sont locales et exportables en JSON. Elles ne sont pas masquées par l’occlusion et s’appliquent à la scène courante sans suivi sémantique entre scènes.

Utilisez de préférence des GLB autonomes. Les modèles et textures externes doivent rester dans `assets/`. Le générateur empaquette les modèles et leurs ressources dans des scripts locaux chargés à la demande : le lecteur peut les ouvrir en `file://`, sans serveur web. Le sélecteur de fichier permet aussi d’ouvrir un GLB principal. Draco et KTX2 nécessiteraient des adaptateurs de décompression supplémentaires, non inclus. WebGL 2 est requis. Les modèles de comparaison doivent partager un repère et une échelle communs.

## Schémas sans dépendance {#diagrams}

Un bloc `diagram` transforme une chaîne de libellés séparés par `->`, ou une définition JSON, en un schéma SVG accessible. Aucun moteur de rendu supplémentaire n’est chargé.

```diagram
Votre application -> Lien contextuel -> Documentation locale
```

~~~markdown
```diagram
Votre application -> Lien contextuel -> Documentation locale
```
~~~

La syntaxe courte couvre les flux linéaires jusqu’à huit étapes. Le JSON permet de décrire des décisions, séquences, classes, dépendances et architectures avec des liens vers les pages. La [galerie de schémas](doc:diagrams) présente six exemples et leur configuration.
