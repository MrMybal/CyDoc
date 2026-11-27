---
id: troubleshooting
title: Résoudre un problème
description: Partez du symptôme, effectuez une vérification simple et confirmez le résultat.
section: Dépannage
order: 4
sourceRevision: 2
---
Choisissez la situation qui correspond à ce que vous voyez. Les vérifications ci-dessous concernent le lecteur CyDoc ; pour un problème dans l’application elle-même, utilisez son aide ou son canal d’assistance.

## Le lecteur affiche une page vide {#reader}

Le manuel s’ouvre, mais son titre et le texte de la page n’apparaissent pas.

```steps
{"items":[{"title":"Ouvrir le fichier d’entrée","body":"Ouvrez **Documentation.html** depuis le dossier du manuel exporté.","result":"Le nom de l’application, la navigation et le texte apparaissent. Si c’est le cas, vous pouvez vous arrêter ici.","troubleshooting":"Si la page reste vide, poursuivez avec la vérification du dossier ci-dessous. Si seul un sujet manque, suivez [les vérifications des pages introuvables](doc:troubleshooting#page)."},{"title":"Garder le dossier complet","body":"Vérifiez que **DocData/** se trouve à côté de **Documentation.html**. Si le manuel provient d’un ZIP, extrayez toute l’archive avant de l’ouvrir.","result":"Le fichier d’entrée et son dossier **DocData/** se trouvent dans le même répertoire extrait.","troubleshooting":"Si le dossier manque, récupérez à nouveau le manuel complet depuis le canal habituel de distribution de l’application. Copier seulement le fichier HTML ne suffit pas."},{"title":"Ouvrir à nouveau le manuel","body":"Fermez l’onglet vide et rouvrez le fichier d’entrée.","result":"Le nom de l’application, la navigation et le texte de la page sont visibles.","troubleshooting":"Gardez le message d’erreur exact et suivez [la liste d’informations à transmettre](doc:troubleshooting#support)."}]}
```

## Une page est introuvable {#page}

Le lecteur s’ouvre et indique « Cette page est introuvable ».

1. Utilisez **Revenir à l’accueil** pour retrouver la première page du manuel.
2. Cherchez le sujet dans le menu ou dans le champ de recherche.
3. Si vous utilisiez un ancien favori, copiez le lien de la page qui fonctionne et mettez ce favori à jour.

**Résultat attendu :** le sujet s’ouvre avec un lien actuel. Si un bouton d’aide de l’application ouvre toujours la page manquante, indiquez le bouton utilisé lors de votre signalement.

## Une image ou une vidéo ne s’ouvre pas {#media}

Vérifiez d’abord si le reste de la page est lisible.

- **Toute la page est vide :** suivez [les vérifications du lecteur](doc:troubleshooting#reader).
- **Seul un média manque :** vérifiez que le dossier **DocData/** complet a été copié avec le manuel, puis rouvrez la page.
- **Une vidéo signale une erreur de lecture :** gardez le message exact. Un autre format vidéo peut être nécessaire pour votre navigateur ou votre lecteur embarqué ; l’auteur du manuel doit le fournir.
- **Seule une vue 3D échoue :** gardez l’erreur WebGL ou de modèle affichée par le lecteur et transmettez-la à l’auteur du manuel.

**Résultat attendu :** le média s’ouvre, ou vous avez identifié une erreur précise à transmettre. Pour un auteur, le [guide des médias](doc:media) explique les lecteurs et les ressources locales disponibles.

## Ma langue est absente {#language}

Utilisez le sélecteur de langue dans l’en-tête. Le lecteur propose les éditions complètes du manuel. Une édition absente doit être complétée par son auteur avant de devenir disponible.

**Résultat attendu :** le changement de langue conserve le sujet consulté. Un lien vers une langue indisponible ouvre l’édition complète par défaut.

## Mes notes ou mes favoris sont absents {#personal-data}

Ouvrez **Mon espace** dans l’en-tête. Les notes et les favoris appartiennent au manuel et au navigateur ou à l’application dans lesquels vous les avez enregistrés.

1. Vérifiez que vous avez ouvert le même manuel dans le même navigateur ou lecteur embarqué.
2. Si le lecteur indique que le stockage est indisponible, gardez cette session de lecture ouverte. Vos notes et favoris restent disponibles pendant vos changements de page.
3. Utilisez **Exporter favoris et notes** pour garder une copie avant de fermer. Cette action télécharge un fichier JSON ; conservez-le avec vos fichiers personnels.

**Résultat attendu :** les données de la session courante apparaissent dans Mon espace et peuvent être exportées. Si le stockage est indisponible, fermer le lecteur termine cette session temporaire. L’export permet de conserver une copie lisible ; cette version ne propose pas de commande d’import.

## Le problème persiste {#support}

Gardez les informations suivantes avant de contacter l’assistance de l’application ou du manuel :

- Le titre de la page et l’action qui a provoqué le problème.
- Le message exact et l’image, la vidéo ou le modèle concerné.
- Le navigateur ou l’application embarquée et sa version, si disponible.
- L’ouverture depuis un manuel local ou une copie hébergée.

Relisez les captures et les messages avant de les partager. Les boutons d’avis de la page enregistrent votre vote sur l’appareil ; utilisez le canal d’assistance du produit lorsque vous attendez une réponse.
