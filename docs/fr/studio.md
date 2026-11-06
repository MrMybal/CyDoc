---
id: studio
title: CyDoc Studio
description: Écrire, organiser et publier une documentation avec l’éditeur visuel et Markdown.
section: Premiers pas
order: 3
sourceRevision: 1
---
CyDoc Studio est l’éditeur facultatif des manuels CyDoc. Travaillez en local sans compte, ou rejoignez un espace hébergé pour écrire en équipe. Votre documentation publiée reste indépendante de Studio.

## Démarrer en local {#start}

[Téléchargez Studio pour Windows x64](https://github.com/MrMybal/CyDoc/releases/tag/studio-v0.1.2), extrayez toute l’archive et lancez **CyDocStudio.exe**. Conservez ensemble les dossiers qui l’accompagnent. L’application inclut ses environnements d’exécution et s’ouvre directement, sans inscription ni connexion.

Les onglets **Éditeur**, **Documentation**, **Options** et **MCP / SDK local** occupent la fenêtre de l’application. Documentation ouvre le manuel intégré dans sa propre vue. Le retour à l’éditeur conserve votre page de travail et sa position de défilement.

L’éditeur dans le navigateur permet aussi de travailler en local sans compte lorsque son service est lancé avec `--local`. L’édition locale est limitée à la machine courante. La lecture d’un manuel exporté ne nécessite aucun service d’édition.

## Choisir un projet {#projects}

Choisissez **Ouvrir l’exemple CyDoc** dans l’écran des projets pour obtenir un manuel complet et modifiable : pages anglaises et françaises, exemples de code, schémas, images, GIF, vidéos, meshes et galeries. Chaque copie est indépendante et permet d’expérimenter librement.

Utilisez **Nouveau projet** pour commencer votre propre manuel. Les projets dans un dossier fonctionnent sans Git. Dans l’application Windows, Options permet d’autoriser et d’ouvrir le dossier d’une application existante. Les fichiers de création restent dans `.CyDocBuild/` ; les fichiers publiés vont dans `Documentation/`.

## Écrire et organiser les pages {#write}

Sélectionnez une page dans l’arborescence, puis choisissez **Visuel** ou **Markdown**. Les deux vues modifient le même contenu. La barre d’outils propose titres, listes, mise en forme, liens, code et tableaux. L’enregistrement automatique conserve vos changements ; l’historique de la page permet de restaurer une révision de travail antérieure.

Les propriétés contiennent le titre, la description, la section, le parent et l’ordre de la page. Utilisez des pages parentes pour créer une hiérarchie claire. Conservez les identifiants des pages et les ancres explicites des titres : les liens d’aide de l’application et les liens entre pages en dépendent.

Si un fichier change en dehors de Studio, résolvez le conflit avant d’enregistrer. Téléchargez votre brouillon local si vous souhaitez le conserver, puis utilisez **Recharger le fichier externe** pour charger la version externe. Studio n’écrase pas silencieusement des modifications en conflit.

## Ajouter des médias et du contenu enrichi {#media}

Importez des fichiers locaux avec la médiathèque, puis utilisez leurs chemins `assets/` dans le contenu. Activez uniquement les modules nécessaires au projet dans ses paramètres : image, vidéo, GIF, mesh, galerie et graphe. Une galerie nécessite aussi les lecteurs employés par ses éléments.

L’éditeur visuel présente les médias enrichis sous forme de cartes avec un aperçu local et une configuration JSON modifiable. Markdown donne accès à toute la syntaxe CyDoc pour les [médias](doc:media), les [schémas](doc:diagrams), les [graphes à nœuds](doc:blueprints), les annotations et les comparaisons. Certains contenus avancés se configurent avec ces blocs plutôt qu’avec un outil visuel dédié. L’aperçu utilise le lecteur réel et les modules sélectionnés.

## Compléter les deux langues {#translations}

Rédigez l’original anglais et sa traduction française complète, en conservant le même identifiant de page et les mêmes ancres explicites. Les nouvelles pages commencent comme brouillons dans les deux langues. Traduisez le titre, la description, le corps, les légendes et les textes des annotations.

Après relecture de la page française, marquez sa traduction comme vérifiée dans les propriétés. Un changement du titre, de la description ou du corps anglais rend cette traduction obsolète. Vous pouvez continuer à modifier et prévisualiser les brouillons, mais la publication exige deux langues complètes et à jour.

## Prévisualiser et publier {#publish}

Utilisez **Aperçu** pour examiner la page courante dans le lecteur. **Publier** génère le manuel et vérifie ses traductions, liens, ancres et médias avant de mettre à jour le dossier public. La publication ne crée pas automatiquement de commit et ne pousse pas Git.

Ouvrez `Documentation/Documentation.html` pour lire le résultat. Distribuez-le avec le dossier `DocData/` complet et le fichier séparé `DocAI.md`. Vous pouvez aussi télécharger le manuel généré sous forme de ZIP. Le lecteur fonctionne directement depuis les fichiers locaux et peut être hébergé sur un serveur web statique.

Concentrez la documentation sur l’utilisation de votre application. L’historique de travail, les vérifications internes et la configuration de l’éditeur ou du service n’appartiennent pas au manuel destiné aux utilisateurs. Les consignes pour les assistants vont dans `DocAI.md`.

## Travailler en équipe {#collaborate}

Sur une installation en ligne, connectez-vous avec votre compte. Un propriétaire peut inviter des éditeurs et des lecteurs : les éditeurs rédigent le contenu, les lecteurs le consultent, et les propriétaires gèrent les paramètres et la publication du projet.

Les éditeurs connectés partagent les changements en direct et les indicateurs de présence grâce à Yjs. Les vues visuelle et Markdown utilisent le même document ; l’annulation suit vos propres modifications. L’édition en ligne nécessite un service Studio hébergé avec stockage persistant, HTTPS et prise en charge de WebSocket. Cette version fonctionne sur un seul serveur.

## Utiliser Git si nécessaire {#git}

Git est facultatif. Son panneau propose l’état, les différences, les commits de documentation, l’historique, les branches et les actions distantes. L’accès distant prend actuellement en charge HTTPS sur GitHub, GitLab et Bitbucket ; saisissez les identifiants dans le panneau prévu à cet effet.

Les commits incluent uniquement les chemins de documentation. Fermez les autres sessions d’édition avant de changer de branche ou de récupérer les changements avec pull. Cette récupération accepte les mises à jour en avance rapide ; aucune commande de push forcé ni de réinitialisation destructive n’est proposée. Vous pouvez continuer à utiliser des projets dans un dossier sans dépôt.

## Ajuster l’apparence {#appearance}

Choisissez **Clair**, **Sombre**, **Minuit**, **Nord**, **Papier** ou **Contraste élevé**. Studio utilise les six mêmes palettes que la bibliothèque. Dans Windows, Options synchronise l’interface native, l’éditeur et le manuel intégré ; Sombre est le choix par défaut. Vous pouvez également changer la langue de l’interface et la taille du texte.

L’onglet Windows MCP / SDK local affiche l’adresse du service local en cours et sa configuration d’intégration. Les instructions détaillées d’automatisation restent dans les guides séparés pour les assistants, en dehors de ce manuel.
