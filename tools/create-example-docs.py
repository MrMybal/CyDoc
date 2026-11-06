"""Author the repository's bilingual demonstration pages. Not required to build a manual."""
import json
from pathlib import Path

def block(kind, value):
    return f'```{kind}\n{json.dumps(value, ensure_ascii=False, indent=2)}\n```\n'

def page(locale, id, title, description, order, body, section=None):
    section = section or ('Exemples' if locale == 'fr' else 'Examples')
    text = f'---\nid: {id}\ntitle: {title}\ndescription: {description}\nsection: {section}\norder: {order}\n---\n{body}\n'
    Path(f'docs/{locale}/{id}.md').write_text(text, encoding='utf-8')

for locale in ['fr', 'en']:
    fr = locale == 'fr'
    def t(a, b): return a if fr else b
    image = {'src': 'assets/settings.svg', 'alt': t('Paramètres de l’application', 'Application settings')}
    video = {'src': 'assets/video-a.webm', 'title': t('Une vidéo, sans comparaison', 'One video, no comparison'), 'sources': [{'src': 'assets/video-av1.webm', 'type': 'video/webm; codecs=av01.0.04M.08'}, {'src': 'assets/video-a.webm', 'type': 'video/webm; codecs=vp9'}], 'annotations': [{'time': 1, 'duration': 2, 'text': t('Une annotation temporelle', 'A timed annotation')}]}
    mesh = {'src': 'assets/sample-a.glb', 'title': t('Un modèle PBR, sans comparaison', 'One PBR model, no comparison'), 'annotations': [{'text': t('Surface métallique', 'Metallic surface'), 'position': [0, 0.6, 0]}]}
    for id, title, kind, config, order, explanation in [
        ('image-viewer', t('Image seule', 'Single image'), 'image', image, 13, t('Zoomez avec la molette ou les boutons, déplacez l’image et utilisez l’icône plein écran. Aucun second média n’est chargé.', 'Use the wheel or buttons to zoom, drag the image, and use the fullscreen icon. No second media is loaded.')),
        ('video-viewer', t('Vidéo seule', 'Single video'), 'video', video, 14, t('Une seule piste vidéo, avec vitesse de lecture, annotations et plein écran. Ajoutez une note au moment courant, ou cliquez dans l’image pour choisir sa position.', 'A single video track with playback speed, annotations, and fullscreen. Add a note at the current time, or click the image to choose its position.')),
        ('mesh-viewer', t('Mesh seul', 'Single mesh'), 'mesh', mesh, 15, t('Un seul modèle : orbite, zoom, déplacement, PBR, triangles, scènes et annotations sur la surface. Il est empaqueté pour une lecture locale sans serveur.', 'One model: orbit, zoom, pan, PBR, wireframe, scenes, and surface annotations. It is packaged for local viewing without a server.')),
    ]:
        body = f'## {t("Essayer le lecteur", "Try the viewer")} {{#viewer}}\n\n{explanation}\n\n' + block(kind, config)
        body += f'\n## Configuration {{#configuration}}\n\n' + block('json', config)
        body += '\n' + t('[Voir les comparaisons](doc:media) · [Voir les galeries](doc:galleries).', '[See comparisons](doc:media) · [See galleries](doc:galleries).')
        page(locale, id, title, explanation, order, body)

    gallery_items = {
        'images': [dict(image, type='image', title=t('Version initiale', 'Initial version')), {'type': 'image', 'src': 'assets/settings-b.svg', 'alt': t('Nouveaux paramètres', 'Updated settings'), 'title': t('Nouvelle version', 'New version')}],
        'videos': [dict(video, type='video', title='Original'), {'type': 'video', 'src': 'assets/video-b.webm', 'title': t('Traitement alternatif', 'Alternative treatment')}],
        'meshes': [dict(mesh, type='mesh', title=t('Métal vert', 'Green metal')), {'type': 'mesh', 'src': 'assets/sample-b.glb', 'title': t('Métal doré', 'Gold metal')}]
    }
    body = t('Une galerie monte uniquement son élément actif. Quand vous changez de média, la vidéo s’arrête et les ressources du mesh précédent sont libérées. La navigation fonctionne aussi au clavier dans les onglets.', 'A gallery mounts only its active item. Switching items pauses video and releases the previous mesh resources. Tabs also support keyboard navigation.') + '\n\n'
    for name, items in gallery_items.items():
        title = {'images': t('Galerie d’images', 'Image gallery'), 'videos': t('Galerie de vidéos', 'Video gallery'), 'meshes': t('Galerie de meshes', 'Mesh gallery')}[name]
        body += f'## {title} {{#{name}}}\n\n' + block('gallery', {'title': title, 'items': items}) + '\n'
    body += f'## {t("Galerie mixte", "Mixed gallery")} {{#mixed}}\n\n' + block('gallery', {'title': t('Image, vidéo et mesh dans une galerie', 'Image, video, and mesh in one gallery'), 'items': [gallery_items['images'][0], gallery_items['videos'][0], gallery_items['meshes'][0]]})
    body += f'\n## Modules {{#modules}}\n\n' + block('json', {'modules': ['gallery', 'image', 'video', 'mesh']})
    body += '\n' + t('Le module `gallery` reste indépendant. N’activez que les lecteurs présents dans vos galeries. Les modèles 3D de galerie sont empaquetés comme les modèles seuls.', 'The gallery module stays independent. Enable only the viewers used in your galleries. Gallery models are packaged just like standalone models.')
    page(locale, 'galleries', t('Galeries de médias', 'Media galleries'), t('Images, vidéos, meshes ou contenus mixtes, avec un seul lecteur actif.', 'Images, videos, meshes, or mixed content, with only one active viewer.'), 16, body)

    graph = {
        'title': t('Aide contextuelle · du clic à la documentation', 'Contextual help · from click to documentation'),
        'groups': [{'title': t('Application hôte', 'Host application'), 'x': -25, 'y': -55, 'width': 565, 'height': 250}],
        'nodes': [
            {'id': 'help', 'title': t('Événement · F1', 'Event · F1'), 'type': 'event', 'x': 0, 'y': 0, 'outputs': [{'id': 'exec', 'label': '', 'type': 'exec'}, {'id': 'page', 'label': 'Page ID', 'type': 'string'}], 'description': t('Le contexte courant fournit un identifiant de page stable.', 'The current context provides a stable page ID.')},
            {'id': 'link', 'title': 'Make Help Link', 'x': 310, 'y': 0, 'inputs': [{'id': 'exec', 'label': '', 'type': 'exec'}, {'id': 'page', 'label': 'Page ID', 'type': 'string'}], 'outputs': [{'id': 'exec', 'label': '', 'type': 'exec'}, {'id': 'url', 'label': 'Local URL', 'type': 'string'}], 'description': t('Construit une URL locale encodée.', 'Build an encoded local URL.'), 'link': 'doc:api-cpp#signature'},
            {'id': 'open', 'title': t('Ouvrir la documentation', 'Open documentation'), 'type': 'function', 'x': 650, 'y': 0, 'inputs': [{'id': 'exec', 'label': '', 'type': 'exec'}, {'id': 'url', 'label': 'Local URL', 'type': 'string'}], 'outputs': [], 'description': t('L’application choisit le navigateur ou la WebView.', 'The application chooses its browser or WebView.'), 'link': 'doc:integration'}
        ],
        'links': [{'from': ['help', 'exec'], 'to': ['link', 'exec']}, {'from': ['help', 'page'], 'to': ['link', 'page']}, {'from': ['link', 'exec'], 'to': ['open', 'exec']}, {'from': ['link', 'url'], 'to': ['open', 'url']}]
    }
    raw_blueprint = '''Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   EventReference=(MemberName="ReceiveBeginPlay")
   NodePosX=0
   NodePosY=0
   CustomProperties Pin (PinId=AAA1,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",LinkedTo=(K2Node_CallFunction_0 BBB1,))
End Object
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   FunctionReference=(MemberName="PrintString")
   NodePosX=350
   NodePosY=0
   CustomProperties Pin (PinId=BBB1,PinName="execute",PinType.PinCategory="exec",LinkedTo=(K2Node_Event_0 AAA1,))
   CustomProperties Pin (PinId=BBB2,PinName="InString",PinType.PinCategory="string",DefaultValue="Hello CyDoc")
End Object'''
    body = t('Un lecteur de graphes à nœuds avec ports typés, courbes, zones de commentaire, sélection, déplacement, zoom et plein écran. Sélectionnez **Make Help Link** pour ouvrir sa page d’API.', 'A node graph viewer with typed ports, curves, comment groups, selection, pan, zoom, and fullscreen. Select **Make Help Link** to open its API page.')
    body += f'\n\n## {t("Graphe interactif", "Interactive graph")} {{#graph}}\n\n' + block('graph', graph)
    body += f'\n## {t("Texte Blueprint Unreal", "Unreal Blueprint text")} {{#unreal}}\n\n' + t('Le bloc `blueprint` accepte aussi la structure courante du presse-papiers Unreal : objets, positions, pins et connexions. Voici un exemple réellement converti pendant la génération.', 'A blueprint block also accepts the common Unreal clipboard structure: objects, positions, pins, and connections. This example is actually converted during generation.') + '\n\n```blueprint\n' + raw_blueprint + '\n```\n'
    body += '\n' + t('Le lecteur visualise le graphe ; il ne l’exécute pas. Le parseur couvre les blocs courants `Begin Object` et `CustomProperties Pin`, pas les fichiers binaires `.uasset` ni tous les nœuds et métadonnées possibles d’Unreal. Aucun service BlueprintUE n’est contacté.', 'The viewer visualizes the graph; it does not execute it. The parser covers common Begin Object and CustomProperties Pin blocks, not binary .uasset files or every possible Unreal node and metadata field. No BlueprintUE service is contacted.')
    body += f'\n\n## Configuration JSON {{#configuration}}\n\n' + block('json', graph)
    page(locale, 'blueprints', t('Graphes et Blueprints', 'Graphs & Blueprints'), t('Un module de graphe à nœuds autonome, lié à vos pages de documentation.', 'An independent node graph module linked to your documentation pages.'), 17, body)

    diagrams = [
        (t('Flux avec décision', 'Flow with a decision'), {'type': 'flow', 'title': t('Résolution d’une page locale', 'Resolve a local page'), 'nodes': [{'id': 'start', 'label': 'Page ID', 'x': 170, 'y': 10}, {'id': 'check', 'label': t('Traduction ?', 'Translation?'), 'kind': 'decision', 'x': 170, 'y': 130}, {'id': 'yes', 'label': t('Langue demandée', 'Requested locale'), 'x': 10, 'y': 270}, {'id': 'no', 'label': t('Langue par défaut', 'Default locale'), 'x': 330, 'y': 270}], 'edges': [{'from': 'start', 'to': 'check'}, {'from': 'check', 'to': 'yes', 'label': t('Oui', 'Yes')}, {'from': 'check', 'to': 'no', 'label': t('Non', 'No')}]}),
        (t('Diagramme de séquence', 'Sequence diagram'), {'type': 'sequence', 'title': t('Du bouton d’aide au lecteur', 'From help button to viewer'), 'actors': [{'id': 'app', 'label': 'Application'}, {'id': 'core', 'label': 'CyDoc Core'}, {'id': 'reader', 'label': t('Lecteur local', 'Local viewer')}], 'messages': [{'from': 'app', 'to': 'core', 'label': 'createLink(route)'}, {'from': 'core', 'to': 'app', 'label': 'file:///...#/fr/page', 'reply': True}, {'from': 'app', 'to': 'reader', 'label': t('Ouvrir le fichier', 'Open file')}, {'from': 'reader', 'to': 'app', 'label': t('Page + section', 'Page + section'), 'reply': True}]}),
        (t('Classes et contrats', 'Classes and contracts'), {'type': 'class', 'title': t('Contrat d’un lecteur optionnel', 'Optional viewer contract'), 'nodes': [{'id': 'context', 'label': 'MediaContext', 'fields': ['+ locale: string', '+ signal: AbortSignal'], 'methods': ['+ loadModule(name)', '+ loadAsset(src)'], 'x': 10, 'y': 10}, {'id': 'module', 'label': 'MediaModule', 'fields': ['+ mount(host, config, context)'], 'methods': ['+ dispose()'], 'x': 330, 'y': 10}], 'edges': [{'from': 'context', 'to': 'module', 'label': 'uses'}]}),
        (t('Dépendances de fichiers', 'File dependencies'), {'type': 'flow', 'title': t('Header, implémentation et module C++', 'C++ header, implementation, and module'), 'nodes': [{'id': 'cpp', 'label': 'help.cpp', 'x': 10, 'y': 10, 'link': 'doc:source-examples-cpp-src-help-cpp'}, {'id': 'hpp', 'label': 'cydoc/help.hpp', 'x': 310, 'y': 110, 'link': 'doc:source-examples-cpp-include-cydoc-help-hpp'}, {'id': 'module', 'label': 'cydoc.help.cppm', 'x': 10, 'y': 210, 'link': 'doc:source-examples-cpp-modules-cydoc-help-cppm'}], 'edges': [{'from': 'cpp', 'to': 'hpp', 'label': '#include'}, {'from': 'module', 'to': 'hpp', 'label': '#include'}]}),
        (t('Architecture modulaire', 'Modular architecture'), {'type': 'flow', 'title': t('Le lecteur choisit ses modules', 'The viewer selects its modules'), 'nodes': [{'id': 'core', 'label': 'CyDoc Core', 'x': 170, 'y': 10}, {'id': 'gallery', 'label': 'Gallery', 'x': 170, 'y': 120}, {'id': 'image', 'label': 'Image', 'x': 0, 'y': 250, 'width': 150}, {'id': 'video', 'label': 'Video', 'x': 200, 'y': 250, 'width': 150}, {'id': 'mesh', 'label': 'Mesh', 'x': 400, 'y': 250, 'width': 150}], 'edges': [{'from': 'core', 'to': 'gallery'}, {'from': 'gallery', 'to': 'image'}, {'from': 'gallery', 'to': 'video'}, {'from': 'gallery', 'to': 'mesh'}]})
    ]
    body = t('Ces schémas sont compilés en SVG accessible. Aucun moteur de schémas n’est ajouté au lecteur. Les fichiers du schéma de dépendances sont cliquables.', 'These diagrams compile to accessible SVG. No diagram engine is added to the viewer. Files in the dependency diagram are clickable.') + '\n\n'
    for i, (title, diagram) in enumerate(diagrams):
        body += f'## {title} {{#example-{i+1}}}\n\n' + block('diagram', diagram) + '\n'
    body += f'## {t("Flux linéaire compact", "Compact linear flow")} {{#linear}}\n\n```diagram\nSource -> Build -> Local export -> Application\n```\n'
    body += f'\n## {t("Syntaxe du schéma", "Diagram syntax")} {{#syntax}}\n\n' + block('json', diagrams[0][1])
    page(locale, 'diagrams', t('Galerie de schémas', 'Diagram gallery'), t('Flux, décisions, séquences, classes, dépendances et architecture.', 'Flows, decisions, sequences, classes, dependencies, and architecture.'), 18, body)

    languages = [
        ('C++', 'cpp', 'api-cpp', '#include "cydoc/help.hpp"\nconst auto help = cydoc::make_help_link("file:///D:/Documentation/Documentation.html", "fr", "quickstart", "installation");'),
        ('Python', 'python', 'api-python', 'from help_link import help_link\nurl = help_link("file:///home/user/Documentation/Documentation.html", "fr", "quickstart")'),
        ('C', 'c', 'api-c', '#include "help.h"\nchar route[256];\ncydoc_help_link(route, sizeof route, "fr", "quickstart");'),
        ('C#', 'csharp', 'api-csharp', 'using CyDoc.Examples;\nstring url = HelpLink.Create("file:///D:/Documentation/Documentation.html", "fr", "quickstart");'),
        ('JavaScript', 'javascript', 'api-javascript', 'import { helpLink } from "./help.js";\nconst url = helpLink("./Documentation/Documentation.html", "fr", "quickstart");'),
        ('TypeScript', 'typescript', 'api-typescript', 'import { helpLink } from "./help.js";\nconst url: string = helpLink("./Documentation/Documentation.html", "fr", "quickstart");'),
        ('Java', 'java', 'api-java', 'import cydoc.examples.HelpLink;\nString url = HelpLink.create("file:///home/user/Documentation/Documentation.html", "fr", "quickstart");'),
        ('HLSL', 'hlsl', 'api-hlsl', '#include "common.hlsli"\nfloat4 MainPS(float4 position : SV_Position) : SV_Target {\n    return float4(ApplyExposure(float3(0.1, 0.5, 0.3), 0.5), 1.0);\n}'),
        ('GLSL', 'glsl', 'api-glsl', '#version 450\n#extension GL_GOOGLE_include_directive : require\n#include "common.glsl"\nlayout(location = 0) out vec4 fragColor;\nvoid main() { fragColor = vec4(applyExposure(vec3(0.1, 0.5, 0.3), 0.5), 1.0); }')
    ]
    body = t('Les neuf langages ci-dessous ont un exemple source réel, une coloration au build et une page d’API extraite de leurs annotations. Cliquez sur le chemin source dans une page d’API pour consulter ses dépendances et son code.', 'All nine languages below have a real source example, build-time highlighting, and an API page extracted from annotations. Click the source path in an API page to see dependencies and code.') + '\n\n'
    for title, language, id, code in languages:
        body += f'## {title} {{#{language}}}\n\n```{language}\n{code}\n```\n\n' + t(f'[Ouvrir l’API extraite {title}](doc:{id}#signature).', f'[Open extracted {title} API](doc:{id}#signature).') + '\n\n'
    body += t('HLSL et GLSL servent ici à documenter les shaders ; ils n’ouvrent pas eux-mêmes le lecteur. L’include GLSL de l’exemple demande un préprocesseur compatible avec l’extension indiquée. L’application hôte reçoit le chemin local de la documentation.', 'HLSL and GLSL document shaders here; they do not launch the viewer. The example GLSL include requires a preprocessor supporting the declared extension. The host application receives the local documentation path.')
    page(locale, 'code-languages', t('Code et langages', 'Code & languages'), t('C++, Python, HLSL, GLSL, C#, C, JavaScript, Java et TypeScript.', 'C++, Python, HLSL, GLSL, C#, C, JavaScript, Java, and TypeScript.'), 22, body, t('Intégration', 'Integration'))

    body = t('Les exemples sont des fichiers du dépôt, pas des blocs de texte simulant une extraction. Le générateur lit leurs commentaires, construit les pages d’API et indexe leurs dépendances.', 'The examples are repository files, not text blocks pretending to be extracted. The generator reads their comments, creates API pages, and indexes dependencies.')
    body += f'\n\n## C++ : header et implémentation {{#cpp}}\n\n' + t('[API de make_help_link](doc:api-cpp) · [Header help.hpp](doc:source-examples-cpp-include-cydoc-help-hpp) · [Implémentation help.cpp](doc:source-examples-cpp-src-help-cpp) · [Module C++20](doc:source-examples-cpp-modules-cydoc-help-cppm).', '[make_help_link API](doc:api-cpp) · [help.hpp header](doc:source-examples-cpp-include-cydoc-help-hpp) · [help.cpp implementation](doc:source-examples-cpp-src-help-cpp) · [C++20 module](doc:source-examples-cpp-modules-cydoc-help-cppm).')
    body += '\n\n```cpp\n#include "cydoc/help.hpp"\n\nconst auto url = cydoc::make_help_link(\n    "file:///D:/Documentation/Documentation.html", "fr", "quickstart", "installation");\n// The host app opens this local URL using its browser or WebView.\n```\n'
    body += f'\n## Module C++20 {{#modules}}\n\n```cpp\nimport cydoc.help;\nconst auto url = cydoc_module::link("file:///D:/Documentation/Documentation.html", "fr", "quickstart");\n```\n'
    body += t('Le module C++20 réexporte un wrapper de la fonction portable C++17. Il faut compiler le module avec les options de votre compilateur, puis lier l’implémentation help.cpp. La cible CMake de démonstration reste en C++17.', 'The C++20 module exports a wrapper around the portable C++17 function. Compile the module using your compiler’s options, then link help.cpp. The demo CMake target stays on C++17.')
    body += f'\n\n## {t("Autres langages", "Other languages")} {{#languages}}\n\n' + t('[Exemples des neuf langages](doc:code-languages) · [Imports JavaScript](doc:source-examples-javascript-help-js) · [Imports TypeScript](doc:source-examples-typescript-help-ts) · [Docstrings Python](doc:source-examples-python-help-link-py) · [Includes HLSL](doc:source-examples-shaders-preview-hlsl) · [Includes GLSL](doc:source-examples-shaders-preview-frag).', '[Nine-language examples](doc:code-languages) · [JavaScript imports](doc:source-examples-javascript-help-js) · [TypeScript imports](doc:source-examples-typescript-help-ts) · [Python docstrings](doc:source-examples-python-help-link-py) · [HLSL includes](doc:source-examples-shaders-preview-hlsl) · [GLSL includes](doc:source-examples-shaders-preview-frag).')
    body += f'\n\n## {t("Configuration d’extraction", "Extraction configuration")} {{#configuration}}\n\n' + block('json', {'sources': ['examples'], 'sourceIndex': {'enabled': True, 'includeDirs': ['examples/cpp/include', 'examples/shaders']}})
    body += t('L’index est lexical : include/import/module/using explicites et blocs annotés. Il ne résout pas les macros, les conditions de compilation, les surcharges, les alias complexes, les dépendances de paquets ou les types comme le ferait un compilateur. Les dépendances externes et non résolues restent visibles sans faux lien.', 'The index is lexical: explicit include/import/module/using statements and annotated blocks. It does not resolve macros, conditional compilation, overloads, complex aliases, package dependencies, or types like a compiler would. External and unresolved dependencies remain visible without fabricated links.')
    page(locale, 'api-tour', t('API et liens entre fichiers', 'API & file links'), t('Une vraie extraction avec symboles, fichiers source, includes, imports et modules.', 'Real extraction with symbols, source files, includes, imports, and modules.'), 23, body, t('Intégration', 'Integration'))

    body = t('Choisissez un thème avec l’icône de palette dans la barre supérieure. Il s’applique au lecteur et aux contrôles des modules ; votre choix est conservé sur cet appareil.', 'Choose a theme using the palette icon in the top bar. It applies to the viewer and module controls; the choice is saved on this device.')
    body += '\n\n| ' + t('Thème | Usage', 'Theme | Use') + ' |\n| --- | --- |\n'
    for title, use in [(t('Clair','Light'),t('Lecture lumineuse','Bright reading')), (t('Sombre','Dark'),t('Fond sombre neutre','Neutral dark background')), (t('Minuit','Midnight'),t('Palette indigo','Indigo palette')), ('Nord',t('Gris bleutés et accents froids','Blue greys and cool accents')), (t('Papier','Paper'),t('Fond crème et accents bruns','Cream background and brown accents')), (t('Contraste élevé','High contrast'),t('Contours et texte renforcés','Stronger outlines and text'))]: body += f'| {title} | {use} |\n'
    body += f'\n## {t("Configuration initiale", "Initial configuration")} {{#configuration}}\n\n```typescript\nmountViewer(root, manifest, {{ initialTheme: "nord" }});\n```\n'
    body += t('Les graphes à nœuds et le rendu 3D conservent leur fond de travail adapté à l’inspection ; la barre d’outils, les légendes et les panneaux suivent le thème. La coloration du code est générée à la compilation, sans moteur de coloration dans le lecteur.', 'Node graphs and 3D rendering keep an inspection-oriented canvas background; toolbars, captions, and panels follow the theme. Code highlighting is generated at build time, with no highlighter in the reader.')
    page(locale, 'themes', t('Thèmes et apparence', 'Themes & appearance'), t('Six palettes pour la documentation, les contrôles et le code.', 'Six palettes for documentation, controls, and code.'), 19, body)
