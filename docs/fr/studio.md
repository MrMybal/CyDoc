---
id: studio
title: CyDoc Studio
description: Écrire, organiser et publier une documentation avec l’éditeur visuel et Markdown.
section: Premiers pas
order: 3
sourceRevision: 6
---
CyDoc Studio est l’éditeur facultatif des manuels CyDoc. Travaillez en local sans compte, ou rejoignez un espace hébergé pour écrire en équipe. Votre documentation publiée reste indépendante de Studio.

## Démarrer en local {#start}

[Consultez les téléchargements Studio disponibles](https://github.com/MrMybal/CyDoc/releases). Les paquets Studio 0.2.0 sont en préparation ; la version portable Windows actuellement publiée est la 0.1.2. Les sources permettent de créer un setup Windows `.exe` et un setup Linux `.run` (rendez ce dernier exécutable avant de le lancer). Linux nécessite un affichage X11 et OpenGL 3.3 ; Ubuntu 24.04 x64 est la cible de validation. L’installeur présente les bibliothèques d’exécution nécessaires avant l’installation.

Lancez **CyDocStudio.exe** sous Windows ou **CyDocStudio** sous Linux. L’application s’ouvre directement, sans inscription ni connexion. Vous pouvez aussi extraire un paquet portable complet ; conservez ensemble les dossiers qui l’accompagnent. Les mises à jour gérées nécessitent une installation avec CyInstaller.

Les onglets **Éditeur**, **Documentation**, **Assistant**, **Mises à jour**, **Options** et **MCP / SDK local** occupent la fenêtre de l’application. Documentation ouvre le manuel intégré dans sa propre vue. Le retour à l’éditeur conserve votre page de travail et sa position de défilement.

L’éditeur dans le navigateur permet aussi de travailler en local sans compte lorsque son service est lancé avec `--local`. L’édition locale est limitée à la machine courante. La lecture d’un manuel exporté ne nécessite aucun service d’édition.

## Utiliser l’assistant {#assistant}

Dans **Assistant**, choisissez un fournisseur installé ou un service que vous avez configuré, sélectionnez un modèle, puis connectez-vous. Les connexions API utilisent le nom d’une variable d’environnement contenant votre clé. Studio n’installe pas de modèle et ne vous connecte pas automatiquement à un fournisseur.

Demandez de l’aide pour organiser ou modifier votre documentation, puis relisez les changements obtenus. Arrêter une réponse annule la suite de la génération ; cela n’annule pas les modifications déjà enregistrées. Utilisez un autre nom de conversation pour commencer une nouvelle discussion.

## Installer les mises à jour {#updates}

Dans **Mises à jour**, recherchez une nouvelle version et ouvrez CyInstaller pour la consulter. Ouvrir cette fenêtre laisse Studio en cours d’exécution. Accepter une mise à jour demande une fermeture normale après l’enregistrement du travail en attente. Les projets restent dans leur dossier de données séparé ; CyInstaller propose aussi des commandes de vérification, de récupération et de retour arrière.

## Choisir un projet {#projects}

Choisissez **Ouvrir l’exemple CyDoc** dans l’écran des projets pour obtenir un manuel complet et modifiable : pages anglaises et françaises, exemples de code, schémas, images, GIF, vidéos, meshes et galeries. Chaque copie est indépendante et permet d’expérimenter librement.

Utilisez **Nouveau projet** pour commencer votre propre manuel. Les projets dans un dossier fonctionnent sans Git. Dans l’application de bureau, Options permet d’autoriser et d’ouvrir le dossier d’une application existante. Les fichiers de création restent dans `.CyDocBuild/` ; les fichiers publiés vont dans `Documentation/`.

## Écrire et organiser les pages {#write}

Sélectionnez une page dans l’arborescence, puis choisissez **Visuel** ou **Markdown**. Les deux vues modifient le même contenu. La barre d’outils propose titres, listes, mise en forme, liens, code et tableaux. L’enregistrement automatique conserve vos changements ; l’historique de la page permet de restaurer une révision de travail antérieure.

Les propriétés contiennent le titre, la description, la section, le parent et l’ordre de la page. Utilisez des pages parentes pour créer une hiérarchie claire. Conservez les identifiants des pages et les ancres explicites des titres : les liens d’aide de l’application et les liens entre pages en dépendent.

Si un fichier change en dehors de Studio, résolvez le conflit avant d’enregistrer. Téléchargez votre brouillon local si vous souhaitez le conserver, puis utilisez **Recharger le fichier externe** pour charger la version externe. Studio n’écrase pas silencieusement des modifications en conflit.

## Ajouter des médias et du contenu enrichi {#media}

Importez des fichiers locaux avec la médiathèque, puis utilisez leurs chemins `assets/` dans le contenu. Activez uniquement les modules nécessaires au projet dans ses paramètres : image, vidéo, GIF, mesh, galerie et graphe. Une galerie nécessite aussi les lecteurs employés par ses éléments.

L’éditeur visuel présente les médias enrichis sous forme de cartes avec un aperçu local et une configuration JSON modifiable. Pour créer un schéma, utilisez **Insérer un bloc → diagram**, puis choisissez **Flux**, **Décision** ou **Séquence**. Modifiez son titre, son explication, ses éléments et ses connexions dans le formulaire ; l’aperçu se met à jour immédiatement. Utilisez **Placer automatiquement** pour les flux et décisions, ou **JSON avancé** pour les propriétés personnalisées et les autres types de schémas.

Pour un tutoriel ou une série de vérifications de dépannage, choisissez **Insérer un bloc → steps**. Donnez à chaque étape un titre et une action. Ouvrez **Résultat et dépannage** pour ajouter le résultat attendu et une aide facultative en cas d’échec. Montez ou descendez les étapes pour ajuster leur ordre. Utilisez **Aperçu** après insertion pour vérifier la présentation dans le lecteur. Consultez [l’exemple par étapes](doc:rich-content#steps).

Markdown donne accès à toute la syntaxe CyDoc pour les [médias](doc:media), les [schémas](doc:diagrams), les [graphes à nœuds](doc:blueprints), les annotations et les comparaisons. Les blocs existants conservent leur JSON modifiable. L’aperçu de la page utilise le lecteur réel et les modules sélectionnés.

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

## Utiliser l’assistant intégré {#assistant}

Les compilations actuelles depuis les sources incluent un onglet **Assistant** utilisant CyMCPSDK. Cet onglet est plus récent que le téléchargement publié Studio 0.1.2.

1. Ouvrez Assistant, puis **Réglages de connexion**. Choisissez un fournisseur détecté ou indiquez son exécutable ou l’URL de son service. La détection seule ne confirme pas que son compte est connecté.
2. Choisissez un modèle dans le catalogue du fournisseur. Les CLI natifs et les services locaux installés peuvent aussi utiliser un champ modèle vide. Pour une clé API, indiquez le nom de sa variable d’environnement dans les réglages de connexion.
3. Sélectionnez **Connecter**, puis décrivez le travail de documentation. Les fournisseurs compatibles peuvent lire les projets, modifier les pages, importer des médias et publier avec les opérations habituelles de Studio. Vérifiez les résultats annoncés et prévisualisez la page modifiée.

Les réponses apparaissent progressivement. Utilisez **Arrêter** pour interrompre une réponse et les appels d’outils suivants. Les sauvegardes déjà terminées restent enregistrées. Les erreurs et diagnostics de connexion restent visibles pour vous permettre de corriger les réglages sans supposer qu’une modification a réussi.

Donnez un nom à la conversation pour conserver son historique privé et laissez **Reprendre la conversation enregistrée** coché pour la retrouver. Utilisez un autre nom pour une nouvelle conversation. Les fournisseurs locaux facultatifs utilisent un service Ollama, LM Studio ou llama.cpp existant ; ouvrir Studio ne nécessite aucun téléchargement de modèle.

## Installer et mettre à jour Studio {#updates}

Les sources Studio 0.1.3 ajoutent le setup CyInstaller et un onglet **Mises à jour**. Le téléchargement portable publié 0.1.2 précède cette fonction. Pour une première installation gérée, fermez l’éditeur portable et lancez le setup hors ligne vers un dossier d’installation distinct et vide. Vos projets, résultats de tâches et brouillons du navigateur conservent leurs emplacements de données. Les préférences sont copiées dans le sous-dossier `config/` du dossier de données existant ; leurs anciennes copies restent disponibles.

Dans une copie installée, ouvrez Mises à jour et sélectionnez **Rechercher des mises à jour** pour un nouveau contrôle. **Ouvrir CyInstaller** affiche la version disponible et ses notes. Choisir **Plus tard** laisse Studio ouvert. Après votre accord, Studio attend la sauvegarde du travail en cours, puis laisse l’installeur fermer et remplacer le programme. Si la sauvegarde échoue, reconnectez l’éditeur et réessayez ; la mise à jour ne doit pas supprimer un brouillon.

L’installeur gère la vérification, la relance et la version précédente. Après une mise à jour réussie, Studio affiche sa version d’origine. Si plusieurs démarrages ne parviennent pas à terminer l’initialisation, l’installeur peut proposer un retour à la version précédente. Un contrôle hors ligne ou en échec est indiqué explicitement au lieu d’être présenté comme à jour.

Les copies portables et de développement ne recherchent pas automatiquement les mises à jour. Elles nécessitent un véritable setup pour activer ce fonctionnement. Les contrôles en ligne nécessitent aussi la publication des fichiers de release signés par l’éditeur ; préparer un setup localement ne les publie pas. Une désinstallation normale conserve les préférences et le travail ; lisez les choix de suppression supplémentaires avant de retirer des fichiers utilisateur.
