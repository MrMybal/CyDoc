---
id: integration
title: Intégrer à une application
description: Ouvrez une page d’aide depuis Windows, Linux, macOS, Android ou une application web.
section: Intégration
order: 20
---
Le lecteur exporté utilise les standards du web. Il peut s’ouvrir dans le navigateur du système ou dans une WebView embarquée. L’application hôte choisit le mode d’ouverture.

## Un lien universel {#links}

Une URL combine le chemin local du lecteur, la langue, l’identifiant de page et, éventuellement, une section. La partie après `#` ne demande aucune configuration de serveur.

```text
help/index.html#/fr/quickstart/installation
```

Dans du code JavaScript ou TypeScript, utilisez le noyau pour encoder correctement les identifiants.

```typescript
import { createLink } from 'cydoc';

const helpUrl = createLink({
  locale: 'fr',
  pageId: 'quickstart',
  anchor: 'installation'
}, './help/index.html');
```

## Desktop et Android {#platforms}

| Plateforme | Intégration recommandée |
| --- | --- |
| Windows | Navigateur système ou WebView2 ; embarquer le dossier exporté |
| Linux | Navigateur système ou WebKitGTK / Qt WebEngine |
| macOS | Navigateur système ou WKWebView avec accès au dossier des ressources |
| Android | WebView avec ressources embarquées et WebViewAssetLoader |
| Web / Electron | URL statique ou WebView locale ; conserver le fragment du lien |

Pour Android, [WebViewAssetLoader](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content) sert les ressources de l’application sous une origine HTTPS locale. JavaScript doit être activé pour le lecteur. Les médias et les styles doivent rester accessibles sous la même racine.

> Cette version est vérifiée dans un navigateur sur Windows. Les composants natifs et les autres plateformes demandent encore une validation sur leurs appareils cibles.

## Embarquer le lecteur JavaScript {#embed}

Vous pouvez aussi monter le lecteur dans une page existante. Le manifeste doit provenir du compilateur CyDoc ou d’une source HTML préalablement assainie.

```typescript
import { mountViewer } from 'cydoc/viewer';
import 'cydoc/viewer.css';

const viewer = mountViewer(
  document.querySelector('#app'),
  manifest
);

// Lors du retrait du lecteur :
viewer.destroy();
```

Le lecteur fourni occupe la page et utilise son fragment d’URL. Dans une application avec son propre routeur, placez-le dans une page dédiée ou une iframe. Le noyau `cydoc` permet de construire une intégration plus fine.

## Distribution locale {#distribution}

Livrez le contenu et les médias avec la même version de votre application. Le lecteur n’emploie ni CDN, ni police distante, ni API réseau. La génération requiert Node.js ; aucune installation supplémentaire n’est nécessaire à la lecture dans un navigateur compatible.


## Exemples natifs F1 {#native}

Le [kit d’intégration](doc:native-help) contient des exemples Qt, Python/Tk, WinForms, Java/Swing, AppKit et Android/WebView. Le chemin Android direct en `file:///android_asset/help/index.html` est illustré sans serveur ni permission Internet. Les aides de liens C++, C#, Java et Python sont vérifiées ; les fenêtres Qt, macOS et Android restent à valider sur leurs appareils.
