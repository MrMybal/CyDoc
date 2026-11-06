---
id: native-help
title: Aide native et touche F1
description: Exemples d’intégration locale sur les quatre plateformes.
section: Intégration
order: 36
---
Les exemples associent F1 ou une action d’aide à une page contextuelle. Distribuez l’export dans `Documentation/` à côté de votre application. Le code Qt utilise le dossier de l’exécutable ; Python, C#, Java et Swift montrent l’API de chemins de leur plateforme.

- [Qt · Windows/Linux/macOS](doc:source-examples-integrations-qt-main-cpp)
- [Python/Tk · Windows/Linux/macOS](doc:source-examples-integrations-help-tk-py)
- [C# · Windows](doc:source-examples-integrations-helpwindow-cs)
- [Java/Swing · Windows/Linux/macOS](doc:source-examples-integrations-helpwindow-java)
- [Swift/AppKit · macOS](doc:source-examples-integrations-macos-help-swift)
- [Kotlin/WebView · Android](doc:source-examples-integrations-android-cydocactivity-kt)
- [JavaScript · hôte personnalisé](doc:source-examples-integrations-contextual-help-js)

## Exécuter {#run}

```sh
cmake -S examples/integrations -B .tmp/qt-help
cmake --build .tmp/qt-help
python examples/integrations/help_tk.py
javac examples/integrations/HelpWindow.java
```

Qt 6 Widgets est nécessaire pour l’exemple C++. Tkinter, WinForms et Java/Swing utilisent les composants de l’application hôte. Swift est une classe AppKit à intégrer à votre fenêtre. Android fournit une Activity et un fragment de manifeste : copiez l’export dans `app/src/main/assets/Documentation/`, puis ouvrez l’Activity depuis votre application. Le lecteur charge `file:///android_asset/Documentation/Documentation.html` avec des scripts classiques et sans permission Internet. Aucun SDK natif n’est ajouté au noyau JavaScript.
