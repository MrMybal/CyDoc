---
id: architecture
title: Architecture
description: Un noyau sans dépendance à l’exécution, un lecteur indépendant et des outils de génération séparés.
section: Premiers pas
order: 2
---
CyDoc sépare le traitement du contenu de sa lecture. Le Markdown est compilé une fois, lors de la génération. Le lecteur reçoit du contenu déjà préparé.

## Trois briques indépendantes {#modules}

| Brique | Responsabilité | Environnement |
| --- | --- | --- |
| Noyau | Résolution des pages, langues, liens, recherche | JavaScript, sans DOM |
| Lecteur | Navigation, médias, sommaire et interface | Navigateur ou WebView |
| Générateur | Markdown, extraction, vérification des liens | Node.js, au build |

Les dépendances de compilation ne sont jamais embarquées dans le lecteur. Aucun framework UI, police distante, CDN, service d’analyse ou API réseau n’est nécessaire à la lecture.

Les lecteurs de médias sont des modules optionnels. Le module image et le module vidéo utilisent les API du navigateur. Le module mesh ajoute un moteur Three.js uniquement lorsque l’application le choisit. Chaque lecteur est chargé séparément ; ses ressources sont libérées en quittant la page.

## Du contenu à votre application {#pipeline}

```diagram
Markdown + commentaires -> Générateur CyDoc -> Export statique -> Navigateur ou WebView
```

## Un format portable {#format}

Le manifeste JSON expose un `schemaVersion`, les langues et une liste de pages compilées. Chaque page associe un `id` stable à sa `locale`. Les métadonnées permettent de construire une autre interface sans reprendre le lecteur fourni.

## Performances et limites {#performance}

Les médias se chargent à la demande. La recherche normalise le contenu une fois au démarrage et réutilise cet index en mémoire. Le lecteur fonctionne sans requête HTTP pour charger ses pages.

Cette première version charge toutes les pages dans `data.js` et parcourt l’index pour chaque recherche. Pour des dizaines de milliers de pages, un index segmenté et du chargement différé seront nécessaires. Les tailles réelles se mesurent avec `npm run size`.
