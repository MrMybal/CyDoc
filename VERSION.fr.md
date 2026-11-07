# CyDoc — Notes de version

[Retour au README](README.fr.md) · [English](VERSION.md)

**Bibliothèque du lecteur : 0.1.0 · Éditeur Studio : 0.1.2**<br>
**Statut : EN DÉVELOPPEMENT**<br>
**Paquet natif de l’éditeur disponible : Windows x64**

CyDoc est une première implémentation. Studio 0.1.2 est une release portable publiée ; cette publication ne garantit pas la maturité de toutes les intégrations. Consultez les limites documentées avant de dépendre d’un environnement cible.

## Studio 0.1.2

- Écriture visuelle/Markdown, arborescence, propriétés, sauvegarde automatique, historique et import de médias locaux.
- Projets locaux sans compte, avec un exemple CyDoc bilingue modifiable.
- Git facultatif, édition en ligne authentifiée séparée, invitations, rôles et écriture simultanée.
- Interface Windows CyUI/CEF avec onglets occupant la fenêtre pour l’éditeur, la documentation, les options et le MCP/SDK local.
- Six thèmes partagés, SDK JavaScript/Python et 22 opérations CyToolsCore MCP.
- Export statique anglais/français complet, avec le fichier DocAI.md séparé.

[Téléchargement et notes officielles](https://github.com/MrMybal/CyDoc/releases/tag/studio-v0.1.2) · [Sommes SHA-256](https://github.com/MrMybal/CyDoc/releases/download/studio-v0.1.2/SHA256SUMS.txt)

## Bibliothèque du lecteur 0.1.0

Cette première base fonctionnelle fournit la lecture HTML locale, les liens d’aide stables, la recherche locale, les contenus structurés/API, la publication anglaise/française complète, six thèmes, les outils de lecture et six modules médias optionnels. Le cœur n’a aucune dépendance à l’exécution. La bibliothèque n’est pas encore publiée sur npm ; utiliser un dépôt compilé ou une archive locale du paquet.

## Problèmes connus

Les notes publiées ne donnent pas de liste détaillée de bugs confirmés. Consultez le [véritable suivi des problèmes](https://github.com/MrMybal/CyDoc/issues) pour les signalements actuels. Les limites ci-dessous décrivent le périmètre documenté du produit ; ce ne sont ni des tickets inventés, ni une affirmation d’absence de bugs.

## Limites documentées

- Les intégrations natives du lecteur sont des exemples de sources. Les vérifications sur Windows, Linux, macOS et Android restent nécessaires ; les sources ne signifient pas qu’un exécutable est fourni pour chaque plateforme.
- Le paquet natif Studio fourni est réservé à Windows x64. Aucun paquet natif Linux/macOS n’est inclus. Le pont Windows Python/CEF actuel fonctionne sans le bac à sable de processus CEF.
- Les codecs vidéo dépendent du navigateur ou du moteur. Le mesh nécessite WebGL 2. Aucun transcodeur vidéo ni décodeur Draco ou KTX2 n’est inclus.
- Le lecteur charge toutes les pages ensemble. La segmentation du contenu/de la recherche pour les grands manuels et la disposition RTL ne sont pas implémentées. L’interface intégrée est en anglais et en français.
- Les réglages avancés des médias, schémas et graphes utilisent des blocs JSON/Markdown ; tous n’ont pas d’éditeur visuel spécialisé.
- Studio en ligne nécessite un service persistant unique avec HTTPS et WebSockets. L’hébergement géré, l’envoi de courriels, le SSO et la collaboration sur plusieurs nœuds ne sont pas fournis.

## Références

- [Historique du lecteur et de Studio](https://mrmybal.github.io/CyDoc/manual/Documentation.html#/fr/changelog).
- [Toutes les releases](https://github.com/MrMybal/CyDoc/releases) · [Signaler un problème](https://github.com/MrMybal/CyDoc/issues/new).
- [Installation et limites de Studio](https://github.com/MrMybal/CyDoc/blob/main/studio/README.md).
