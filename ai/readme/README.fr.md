# Convention de README d’application

[English](README.md) · [Instructions pour les IA](DocAI.md) · [Exemple CyDoc](example/README.fr.md) · [Notes de version de l’exemple](example/VERSION.fr.md)

Cette convention donne aux README une structure cohérente et lisible. Le README présente le produit, permet de commencer et renvoie vers le manuel complet. Les instructions IA détaillées, audits, rapports de tests et historiques de maintenance restent à part. Un dernier cadre AI Usage optionnel peut pointer vers les guides IA séparés.

Ce dossier contient la convention réutilisable et un véritable exemple CyDoc. Il ne remplace ni le README principal du dépôt, ni son manuel HTML.

## Contenu du dossier

| Fichier | Rôle |
| --- | --- |
| [README.md](README.md), [README.fr.md](README.fr.md) | Convention en anglais et en français |
| [DocAI.md](DocAI.md) | Instructions pour les agents qui appliquent la convention |
| [example/README.md](example/README.md), [example/README.fr.md](example/README.fr.md) | README CyDoc complets |
| [example/VERSION.md](example/VERSION.md), [example/VERSION.fr.md](example/VERSION.fr.md) | Changements, statut, limites documentées et suivi des problèmes |
| [example/assets/](example/assets/) | Logo existant de CyDoc et vraies captures |
| [SOURCES.md](SOURCES.md) | Sources de l’exemple, séparées du contenu destiné aux utilisateurs |
| [preview.mjs](preview.mjs), [preview.css](preview.css), [preview.js](preview.js) | Générateur et présentation de l’aperçu local ; aucune publication |

## 1. En-tête et identité

L’en-tête contient :

- Le logo existant de l’application, avec un texte alternatif utile, une largeur définie et ses proportions d’origine. Sans véritable logo, ne pas ajouter d’image ni reprendre l’identité d’un autre projet.
- Le nom du produit, sans nom interne d’exécutable ni suffixe de version inventé.
- Les liens vers la présentation et le vrai manuel lorsqu’ils existent. Pointer vers la bonne langue du lecteur HTML, plutôt que vers les sources Markdown.
- Les liens entre langues du README uniquement lorsque les fichiers correspondants existent et sont complets.
- La licence propre à l’application, liée à son fichier de licence.
- Le numéro de version exact et un statut explicite directement sous la licence. Distinguer les versions des composants si la bibliothèque, l’éditeur et l’application évoluent séparément.
- Le téléchargement de la bonne release applicative, avec plateforme et statut. Exclure les paquets de dépendances et d’outillage. Omettre les téléchargements indisponibles.

Le crédit auteur est **optionnel** : utiliser `By <auteur>` lorsque l’auteur est établi par les crédits du projet ou une instruction explicite. Lier son profil ou son site lorsqu’il est vérifié. Le propriétaire du dépôt, le responsable du projet, l’éditeur et l’auteur peuvent être différents. Ne pas imposer un nom dans la convention, inventer un crédit ou réécrire les copyrights pour les faire correspondre au crédit affiché. Omettre le crédit s’il n’est pas souhaité ou vérifiable.

Établir le lecteur cible avant de présenter une disposition. Pour GitHub, l’exemple maintenu utilise un tableau HTML natif à trois colonnes : liens utiles à gauche, logo au centre, puis licence, versions, statut et téléchargement à droite. Cette composition conserve les bordures visibles de GitHub. L’utiliser lorsque ces bordures conviennent au projet. Le nom du produit et le crédit auteur optionnel suivent en dessous.

GitHub retire les classes et styles personnalisés. Ne pas présenter des colonnes créées uniquement en CSS comme une solution GitHub, masquer les bordures natives dans l’aperçu, ou remplacer silencieusement la composition validée par un empilement centré. Si un projet exige à la fois trois colonnes et aucune bordure, expliquer la limite du lecteur avant de choisir une autre implémentation. Un SVG intégré peut conserver la composition visuelle, mais nécessite de vrais liens séparés ; les liens dessinés dans une image intégrée ne sont pas interactifs.

## 2. Ordre du contenu

1. **Description courte** : rôle de l’application et public concerné, en quelques phrases.
2. **Note de version** : message bref adapté au statut et lié au fichier Markdown des notes de version.
3. **Image principale, si disponible** : capture réelle et représentative, sans interface inventée ni étiquette promotionnelle superposée.
4. **Explication de l’application** : tâches et usages concrets, avec d’autres captures lorsqu’elles aident.
5. **Fonctionnalités, si utile** : liste courte et factuelle ; ne pas dupliquer le manuel ni présenter une fonctionnalité prévue comme disponible.
6. **Installation** : téléchargements vérifiés, plateformes réelles, prérequis et démarrage.
7. **Git, compilation et bibliothèques nécessaires** : commandes et dépendances réelles. Les détails longs peuvent être repliables. Ne pas imposer Git à un projet qui s’en passe.
8. **Licence** : licence de l’application, puis tableau des bibliothèques et de leurs licences.
9. **Références et liens** : vrai manuel, dépôt, suivi des problèmes et références pertinentes.
10. **AI Usage, optionnel** : petit cadre final lié au guide IA principal et aux guides Markdown spécialisés utiles.

Insérer un séparateur Markdown (`---`, entouré de lignes vides) avant **Installation** et **Licence**. Conserver ces traits dans le Markdown. Les tableaux des dépendances contiennent de vraies données ; le tableau de mise en page de l’en-tête conserve les bordures natives du lecteur cible, lorsqu’elles sont acceptées par l’utilisateur.

## 3. Version et statut

Garder cohérents la version de l’en-tête, la note de statut, le téléchargement et les notes de version. Utiliser `VERSION.md` et, si la traduction française est complète, `VERSION.fr.md`. Si un projet a déjà un fichier de notes de version, le conserver et le lier plutôt que créer des sources contradictoires.

| Statut | Message destiné aux lecteurs |
| --- | --- |
| Alpha | Version expérimentale pour les essais et les retours ; certaines fonctions peuvent être incomplètes. |
| Beta | Version en validation avant disponibilité stable ; consulter les problèmes connus. |
| Stable | Version stable publiée ; lire les changements et problèmes connus avant la mise à jour. Ne pas promettre l’absence de bugs. |
| Développement / préversion / autre statut documenté | Reprendre la désignation du projet et indiquer les versions réellement disponibles. |
| Non établi | Indiquer que le statut reste à confirmer ; ne pas inventer Alpha ou Stable à partir d’un numéro. |

Une release non marquée comme préversion dans GitHub ne prouve pas à elle seule la maturité du logiciel. Un numéro `0.x` ne prouve pas non plus un statut alpha. Lire le statut explicite du projet et ses notes. L’exemple CyDoc affiche donc **EN DÉVELOPPEMENT**, tout en proposant le véritable téléchargement publié de Studio 0.1.2.

Les notes de version donnent la release ou le composant, les changements, les bugs confirmés lorsqu’ils sont documentés, les limites connues, le suivi des problèmes et les références de release. Séparer les bugs confirmés des plateformes non proposées, des téléchargements facultatifs et des fonctions prévues. Si aucune liste de bugs n’est publiée, le dire sans affirmer qu’il n’y en a pas. Ne pas inventer de ticket ni de date.

## 4. Licences et bibliothèques

Utiliser ce tableau :

| Bibliothèque · sources | Licence · texte | Utilisation / périmètre |
| --- | --- | --- |
| Nom lié au vrai projet | Licence réelle liée à son texte ou à ses notices | Rôle, caractère optionnel, exécution, compilation ou éditeur uniquement |

Lire les manifestes, les fichiers de verrouillage, les scripts de compilation et de paquetage, ainsi que les notices réelles. Distinguer la licence de l’application de celles des dépendances. Reprendre fidèlement les licences alternatives, exceptions et composants séparément licenciés. Ne pas attribuer à l’application la licence d’une bibliothèque embarquée, ni annoncer que tous les modules sont inclus par défaut.

Regrouper les dépendances de l’éditeur, les composants natifs ou optionnels et l’outillage lorsque cela facilite la lecture. Conserver les notices complètes livrées ; le tableau est un index, pas leur remplacement. Identifier les liens privés et garder les textes de licence fournis dans les distributions. Lier la version exacte des conditions lorsqu’elle est verrouillée et disponible.

## 5. Langues, ressources et vérification

Rédiger `README.md` en anglais. La traduction française complète utilise `README.fr.md`, avec le même ordre, les versions actuelles, les captures, l’inventaire des dépendances et les liens vers le manuel français. Traduire les explications ; conserver les noms officiels, commandes et identifiants de licences. Ne pas proposer de langue incomplète.

Garder le logo et les captures locaux, avec des chemins relatifs au dépôt. Conserver leur contenu et leurs proportions. Éviter les badges chargés à distance, les polices externes et le contenu qui nécessite JavaScript dans le README. Exclure les projets privés, comptes, identifiants et chemins personnels des exemples.

Avant livraison, vérifier les fichiers, images, liens de sections, notes de version, tableau de licences et téléchargements réels. Examiner les deux langues sur ordinateur et mobile, en clair et sombre si l’aperçu le permet. Distinguer une vérification locale d’une vérification réelle dans GitHub. Préparer un README n’autorise pas à pousser ni publier.

## 6. Cadre AI Usage optionnel

Lorsque c’est utile au projet, ajouter un cadre **AI Usage** après tout le contenu destiné aux utilisateurs et les références. Un bloc repliable `details` convient. Il contient des liens et de courtes descriptions, pas les instructions elles-mêmes.

- Lier d’abord le Markdown principal qui présente le projet et indexe ses guides importants : par exemple `DocAI.md`, `ai/README.md` ou un `AGENTS.md` existant.
- Lier ensuite les véritables guides par tâche : intégration, compilation/prérequis, création de contenu, API, création de vitrine ou autre procédure propre au projet.
- Distinguer le guide de compilation de l’application des guides pour créer quelque chose avec sa bibliothèque. Nommer correctement chaque destination.
- Utiliser des chemins Markdown existants et vérifiés, relatifs lorsqu’ils fonctionnent dans le dépôt ou le paquet distribué. Omettre les guides indisponibles et le cadre entier s’il n’est pas souhaité ou utile.
- Ne pas recopier les instructions IA dans le README, inventer des guides ou exposer les dossiers de travail privés. Ne pas ajouter ce cadre au manuel humain de l’application sans demande explicite.

L’exemple CyDoc montre d’abord `ai/README.md`, puis les guides d’intégration, d’écriture/API, de Studio et de création de vitrines/README. Leurs instructions détaillées restent dans leurs fichiers séparés.

## Ouvrir l’exemple CyDoc

Depuis le dépôt CyDoc, avec les dépendances Node.js 22+ installées :

```sh
node ai/readme/preview.mjs
```

Ouvrir directement `artifacts/readme-example/index.html`. L’aperçu contient les images et un script classique ; aucun serveur ni police distante n’est nécessaire. Il propose anglais/français, README/notes de version et clair/sombre. L’en-tête est le tableau natif du Markdown, avec ses bordures visibles et sans colonnes ajoutées en CSS. Vérifier le véritable résultat sur GitHub avant d’affirmer qu’il correspond à la composition convenue.

La commande génère uniquement l’aperçu dans `artifacts/readme-example/`, par rapport au dossier courant. Modifier les Markdown et les ressources sources de ce dossier, puis régénérer. Elle ne remplace pas le README principal, ne compile pas d’application, ne crée pas de commit et ne pousse ou ne déploie rien.
