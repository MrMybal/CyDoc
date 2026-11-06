---
id: native-help
title: Native help and F1
description: Local integration examples for all four platforms.
section: Integration
order: 36
---
Examples bind F1 or a help action to a contextual page. Distribute the export in `Documentation/` beside your app. Qt uses the executable directory; Python, C#, Java, and Swift demonstrate platform path APIs.

- [Qt · Windows/Linux/macOS](doc:source-examples-integrations-qt-main-cpp)
- [Python/Tk · Windows/Linux/macOS](doc:source-examples-integrations-help-tk-py)
- [C# · Windows](doc:source-examples-integrations-helpwindow-cs)
- [Java/Swing · Windows/Linux/macOS](doc:source-examples-integrations-helpwindow-java)
- [Swift/AppKit · macOS](doc:source-examples-integrations-macos-help-swift)
- [Kotlin/WebView · Android](doc:source-examples-integrations-android-cydocactivity-kt)
- [JavaScript · custom host](doc:source-examples-integrations-contextual-help-js)

## Run {#run}

```sh
cmake -S examples/integrations -B .tmp/qt-help
cmake --build .tmp/qt-help
python examples/integrations/help_tk.py
javac examples/integrations/HelpWindow.java
```

Qt 6 Widgets is required for the C++ example. Tkinter, WinForms, and Java/Swing use host components. Swift supplies an AppKit controller for your window. Android supplies an Activity and manifest fragment: copy the export into `app/src/main/assets/Documentation/`, then open the Activity from your app. It loads `file:///android_asset/Documentation/Documentation.html` using classic scripts without Internet permission. No native SDK is added to the JavaScript core.
