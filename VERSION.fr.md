# CyDoc — Notes de version

[Retour au README](README.fr.md) · [English](VERSION.md)

**Bibliothèque du lecteur : 0.2.0 · Studio : 0.2.0**<br>
**Statut : EN DÉVELOPPEMENT**<br>
**Paquets natifs de l’éditeur : Windows x64 et Linux x64 (X11)**

CyDoc est une première implémentation. Studio 0.2.0 fournit des installeurs CyInstaller Windows et Linux ; cette publication ne garantit pas la maturité de toutes les intégrations. Consultez les limites documentées avant de dépendre d’un environnement cible.

## Studio 0.2.0 — installeurs Windows et Linux natif

Le shell natif et l’assistant intégré prennent en charge Linux X11 en plus de Windows. Ubuntu 24.04 x64 est la cible de validation Linux, avec un affichage X11 et OpenGL 3.3. Les données suivent les chemins XDG, les signaux de mise à jour utilisent la confirmation de sauvegarde avant fermeture, et le formulaire de connexion de l’assistant affiche des bordures visibles et des libellés au-dessus des champs. Les [installeurs hors ligne, bootstraps en ligne et paquets portables](https://github.com/MrMybal/CyDoc/releases/tag/v0.2.0) sont accompagnés du manifeste de mise à jour signé et des sommes SHA-256. Les changements 0.1.3 à 0.1.5 ci-dessous sont inclus dans 0.2.0.

## Sources Studio 0.1.5 — langue de l’interface partagée

Changer la langue dans les préférences de l’éditeur met aussi à jour et enregistre la langue du conteneur natif. Le thème et les autres préférences sont conservés. Cette compilation reste distincte du téléchargement portable publié 0.1.2.

## Sources Studio 0.1.4 — sauvegarde et lisibilité

Une page ouverte sans modification reçoit désormais un accusé de sauvegarde durable. Les suppressions concurrentes sont vérifiées avec le texte sauvegardé et le vecteur de collaboration ; Ctrl+S attend cet accusé. Les contrôles natifs utilisent un texte plus grand, des contours visibles et des formulaires de largeur limitée. Ces changements ne font pas partie du téléchargement portable publié 0.1.2.

## Sources Studio 0.1.3 — assistant et installation gérée

Les sources actuelles remplacent le précédent moteur d’automatisation par CyMCPSDK 0.7.5, révision `35d2d4f`. Elles ajoutent l’onglet Assistant natif, des opérations communes au chat, au CLI et à MCP, ainsi que l’annonce locale publique. CyInstaller 0.1.0 fournit le setup signé, les mises à jour gérées, la confirmation du démarrage et le retour arrière. L’éditeur attend la sauvegarde du travail avant de fermer pour une mise à jour. Les projets, tâches et brouillons du navigateur conservent leurs emplacements ; les préférences sont copiées dans `config/` en conservant leurs originaux. Ces changements ne sont pas inclus dans le téléchargement portable publié Studio 0.1.2. La génération locale d’une release ne publie pas de mise à jour en ligne.

## Studio 0.1.2

- Écriture visuelle/Markdown, arborescence, propriétés, sauvegarde automatique, historique et import de médias locaux.
- Projets locaux sans compte, avec un exemple CyDoc bilingue modifiable.
- Git facultatif, édition en ligne authentifiée séparée, invitations, rôles et écriture simultanée.
- Interface Windows CyUI/CEF avec onglets occupant la fenêtre pour l’éditeur, la documentation, les options et le MCP/SDK local.
- Six thèmes partagés, SDK JavaScript/Python et 22 opérations MCP.
- Export statique anglais/français complet, avec le fichier DocAI.md séparé.

[Téléchargement et notes officielles](https://github.com/MrMybal/CyDoc/releases/tag/studio-v0.1.2) · [Sommes SHA-256](https://github.com/MrMybal/CyDoc/releases/download/studio-v0.1.2/SHA256SUMS.txt)

## Bibliothèque du lecteur 0.2.0

Cette version des sources ajoute des parcours de lecture guidés, une recherche locale par section, une navigation plus claire, l’agrandissement des schémas et des commandes de graphe améliorées. Utilisez un checkout compilé ou une archive locale `cydoc-0.2.0.tgz` ; cette version n’est pas publiée sur npm.

## Bibliothèque du lecteur 0.1.0

Cette première base fonctionnelle fournit la lecture HTML locale, les liens d’aide stables, la recherche locale, les contenus structurés/API, la publication anglaise/française complète, six thèmes, les outils de lecture et six modules médias optionnels. Le cœur n’a aucune dépendance à l’exécution. La bibliothèque n’est pas encore publiée sur npm ; utiliser un dépôt compilé ou une archive locale du paquet.

## Problèmes connus

Les notes publiées ne donnent pas de liste détaillée de bugs confirmés. Consultez le [véritable suivi des problèmes](https://github.com/MrMybal/CyDoc/issues) pour les signalements actuels. Les limites ci-dessous décrivent le périmètre documenté du produit ; ce ne sont ni des tickets inventés, ni une affirmation d’absence de bugs.

## Limites documentées

- Les intégrations natives du lecteur sont des exemples de sources. Les vérifications sur Windows, Linux, macOS et Android restent nécessaires ; les sources ne signifient pas qu’un exécutable est fourni pour chaque plateforme.
- Studio est fourni pour Windows x64 et Linux x64 sous X11 (Ubuntu 24.04 testé). macOS et Wayland sans X11 ne sont pas pris en charge. Le pont Python/CEF fonctionne sans le bac à sable de processus CEF. Les connexions aux fournisseurs IA réels nécessitent leur propre configuration et validation.
- Les codecs vidéo dépendent du navigateur ou du moteur. Le mesh nécessite WebGL 2. Aucun transcodeur vidéo ni décodeur Draco ou KTX2 n’est inclus.
- Le lecteur charge toutes les pages ensemble. La segmentation du contenu/de la recherche pour les grands manuels et la disposition RTL ne sont pas implémentées. L’interface intégrée est en anglais et en français.
- Les réglages avancés des médias, schémas et graphes utilisent des blocs JSON/Markdown ; tous n’ont pas d’éditeur visuel spécialisé.
- Studio en ligne nécessite un service persistant unique avec HTTPS et WebSockets. L’hébergement géré, l’envoi de courriels, le SSO et la collaboration sur plusieurs nœuds ne sont pas fournis.

## Références

- [Historique du lecteur et de Studio](https://mrmybal.github.io/CyDoc/manual/Documentation.html#/fr/changelog).
- [Toutes les releases](https://github.com/MrMybal/CyDoc/releases) · [Signaler un problème](https://github.com/MrMybal/CyDoc/issues/new).
- [Installation et limites de Studio](https://github.com/MrMybal/CyDoc/blob/main/studio/README.md).
