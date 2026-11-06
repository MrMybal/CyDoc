"""Author extended demos and original GIF fixtures. Pillow is only needed to regenerate GIFs."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def write(path, text):
    file = ROOT / path
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(text, encoding='utf-8')

def block(kind, data):
    return '```' + kind + '\n' + json.dumps(data, ensure_ascii=False, indent=2) + '\n```\n'

def page(locale, id, title, description, body, order=30, section=None):
    section = section or ('Exemples' if locale == 'fr' else 'Examples')
    write(f'docs/{locale}/{id}.md', f'---\nid: {id}\ntitle: {title}\ndescription: {description}\nsection: {section}\norder: {order}\n---\n{body}\n')

# A real declaration accompanies the example interchange snapshot.
write('examples/cpp/include/cydoc/session.hpp', '''#pragma once
#include "cydoc/help.hpp"

namespace cydoc {
class DocSession {
public:
    virtual ~DocSession() = default;
};
class HelpSession : public DocSession {
public:
    std::string open(std::string_view page, std::string_view locale = "fr") const {
        return make_help_link("Documentation/Documentation.html", locale, page);
    }
};
}
''')
api_dir = 'examples/api/doxygen'
write(f'{api_dir}/classDocSession.xml', '''<?xml version="1.0" encoding="UTF-8"?>
<doxygen version="1.9.8"><compounddef id="base" kind="class"><compoundname>cydoc::DocSession</compoundname><briefdescription><para>Base class for documentation sessions.</para></briefdescription><location file="examples/cpp/include/cydoc/session.hpp" line="5"/></compounddef></doxygen>''')
write(f'{api_dir}/classHelpSession.xml', '''<?xml version="1.0" encoding="UTF-8"?>
<doxygen version="1.9.8"><compounddef id="session" kind="class"><compoundname>cydoc::HelpSession</compoundname><basecompoundref refid="base" prot="public">cydoc::DocSession</basecompoundref><briefdescription><para>A contextual help session.</para></briefdescription><location file="examples/cpp/include/cydoc/session.hpp" line="9"/><sectiondef kind="public-func"><memberdef id="open" kind="function"><type>std::string</type><definition>std::string cydoc::HelpSession::open</definition><argsstring>(std::string_view page, std::string_view locale = "fr") const</argsstring><name>open</name><qualifiedname>cydoc::HelpSession::open</qualifiedname><param><type>std::string_view</type><declname>page</declname></param><param><type>std::string_view</type><declname>locale</declname><defval>"fr"</defval></param><briefdescription><para>Build a contextual help URL.</para></briefdescription><detaileddescription><para><parameterlist kind="param"><parameteritem><parameternamelist><parametername>page</parametername></parameternamelist><parameterdescription><para>Stable documentation page id.</para></parameterdescription></parameteritem><parameteritem><parameternamelist><parametername>locale</parametername></parameternamelist><parameterdescription><para>Requested language.</para></parameterdescription></parameteritem></parameterlist><simplesect kind="return"><para>A local URL with percent-encoded route segments.</para></simplesect></para></detaileddescription><references refid="base">cydoc::DocSession</references><location file="examples/cpp/include/cydoc/session.hpp" line="11"/></memberdef></sectiondef></compounddef></doxygen>''')
write('examples/api/Doxyfile', '''PROJECT_NAME = CyDocExample
INPUT = examples/cpp/include/cydoc
RECURSIVE = YES
EXTRACT_ALL = YES
GENERATE_HTML = NO
GENERATE_LATEX = NO
GENERATE_XML = YES
OUTPUT_DIRECTORY = .tmp/doxygen
''')
ts_file = (ROOT / 'examples/typescript/help.ts').read_text(encoding='utf-8')
ts_line = ts_file[:ts_file.index('export function')].count('\n') + 1
typedoc = {'id':0,'name':'CyDocExample','kind':1,'children':[{'id':1,'name':'helpLink','kind':64,'signatures':[{'id':2,'name':'helpLink','kind':4096,'comment':{'summary':[{'kind':'text','text':'Build a stable local documentation URL.'}], 'blockTags':[{'tag':'@returns','content':[{'kind':'text','text':'A URL with encoded locale, page and section.'}]}]},'parameters':[{'id':10+i,'name':name,'type':{'type':'intrinsic','name':'string'},'comment':{'summary':[{'kind':'text','text':desc}]},**({'defaultValue':'""','flags':{'isOptional':True}} if name=='section' else {})} for i,(name,desc) in enumerate([('base','Reader file URL.'),('locale','Requested language.'),('page','Stable page id.'),('section','Optional section id.')])],'type':{'type':'intrinsic','name':'string'},'sources':[{'fileName':'examples/typescript/help.ts','line':ts_line}]}]}]}
write('examples/api/typedoc.json', json.dumps(typedoc,ensure_ascii=False,indent=2))
write('examples/api/typedoc.config.json', json.dumps({'entryPoints':['examples/typescript/help.ts'],'json':'.tmp/typedoc.json'},indent=2))
write('examples/api/README.md', '''# API import examples

`doxygen/*.xml` and `typedoc.json` are small illustrative interchange snapshots, maintained with their source examples. They exercise importers without requiring Doxygen or TypeDoc to build CyDoc.

To generate your own exports, run Doxygen with `examples/api/Doxyfile` from the project root, or TypeDoc with `--options examples/api/typedoc.config.json`, then point `apiImports[].path` at the generated output. Doxygen/TypeDoc are optional generation tools and are not part of the reader.

The neutral format is `{ "symbols": [{ "key", "name", "language", "signature", "parameters": [{ "name", "type", "description" }], "returnType", "returns", "bases": [{ "key", "name" }], "references": [{ "key", "name" }], "source": { "file", "line" } }] }`, with adapter format `cydoc`. Producers can emit it for any language.
''')

for locale in ['fr','en']:
    fr = locale == 'fr'
    def t(a,b): return a if fr else b
    samples = [('C++','cpp','auto url = cydoc::make_help_link("Documentation/Documentation.html", "fr", "quickstart");'),('Python','python','url = help_link("Documentation/Documentation.html", "fr", "quickstart")'),('C#','csharp','string url = HelpLink.Create("Documentation/Documentation.html", "fr", "quickstart");'),('C','c','cydoc_help_link(url, sizeof url, "Documentation/Documentation.html", "fr", "quickstart", "");'),('JavaScript','javascript','const url = helpLink("Documentation/Documentation.html", "fr", "quickstart");'),('TypeScript','typescript','const url: string = helpLink("Documentation/Documentation.html", "fr", "quickstart");'),('Java','java','String url = HelpLink.create("Documentation/Documentation.html", "fr", "quickstart");'),('HLSL','hlsl','float4 MainPS(float2 uv : TEXCOORD0) : SV_Target { return float4(uv, 0, 1); }'),('GLSL','glsl','#version 450\nlayout(location = 0) out vec4 color;\nvoid main() { color = vec4(0.2, 0.8, 0.5, 1.0); }')]
    rich = t('Les mêmes explications peuvent présenter plusieurs langages sans allonger la page. Le terme [[PBR]] dispose d’une définition au clavier et au clic.','One explanation can present several languages without lengthening the page. The term [[PBR]] has a keyboard- and click-accessible definition.') + '\n\n'
    rich += '## '+t('Onglets de code','Code tabs')+' {#tabs}\n\n'+block('tabs',{'title':t('Choisir un langage','Choose a language'),'items':[{'label':label,'lang':lang,'code':code} for label,lang,code in samples]})
    rich += '\n## '+t('Tutoriel par étapes','Step-by-step tutorial')+' {#steps}\n\n'+block('steps',{'items':[{'title':t('Générer','Generate'),'body':'`npm run build`'},{'title':t('Distribuer','Distribute'),'body':t('Copiez le dossier `dist/site/` avec votre application.','Copy `dist/site/` with your application.')},{'title':t('Ouvrir','Open'),'body':t('[Ouvrez une section précise](doc:quickstart#installation).','[Open a precise section](doc:quickstart#installation).')}]})
    rich += block('callout',{'type':'tip','title':t('Tout reste local','Everything stays local'),'body':t('Les onglets et schémas ne font aucune requête réseau.','Tabs and diagrams make no network requests.')})
    rich += block('callout',{'type':'warning','title':t('Identifiants stables','Stable identifiers'),'body':t('Conservez les identifiants de page, d’annotation et de média lors des mises à jour.','Keep page, annotation, and media identifiers stable across updates.')})
    rich += block('details',{'title':t('Détails de configuration','Configuration details'),'body':t('Ces blocs acceptent du Markdown assaini, y compris des [liens internes](doc:writing).','These blocks accept sanitized Markdown, including [internal links](doc:writing).')})
    rich += '\n## '+t('Différence de code','Code difference')+' {#diff}\n\n'+block('diff',{'title':t('Ajouter une section au lien','Add a section to the link'),'lang':'cpp','before':'auto url = make_help_link(base, "fr", "settings");','after':'auto url = make_help_link(base, "fr", "settings", "export");'})
    rich += '\n## '+t('Glossaire','Glossary')+' {#glossary}\n\n'+block('glossary',{'items':[{'term':'PBR','definition':t('Rendu basé sur des propriétés physiques des matériaux.','Rendering based on physical material properties.'),'link':'doc:mesh-viewer'},{'term':'Deep link','definition':t('Lien vers une page, section ou vue précise.','A link to a specific page, section, or view.')} ]})
    page(locale,'rich-content',t('Contenu enrichi','Rich content'),t('Onglets, étapes, encadrés, sections repliables, glossaire et différences de code.','Tabs, steps, callouts, collapsible sections, glossary, and code differences.'),rich,30)
    links = [
        (t('Vidéo à 1,25 seconde','Video at 1.25 seconds'),'video-viewer?media=media-1&time=1.25'),
        (t('Annotation vidéo','Video annotation'),'video-viewer?media=media-1&note=note-0'),
        (t('Nœud Make Help Link','Make Help Link node'),'blueprints?media=media-1&node=link'),
        (t('Caméra et triangles 3D','3D camera and wireframe'),'mesh-viewer?media=media-1&camera=3,2,4&target=0,0,0&wire=true&scene=0'),
        (t('Zone annotée de l’image','Annotated image area'),'image-viewer?media=media-1&note=settings-area&zoom=1.5'),
        (t('Ligne du header C++','C++ header line'),'source-examples-cpp-include-cydoc-session-hpp#L11'),
        (t('Deuxième élément de galerie','Second gallery item'),'galleries?media=gallery-images&item=1'),
        (t('Image 6 du GIF','GIF frame 6'),'gif-controls?media=animation&frame=5')]
    body = t('Ces liens ouvrent un état réel des exemples. L’icône de lien d’un lecteur copie sa vue courante, sans modifier votre lecture.','These links open real example states. A viewer’s link icon copies its current view without interrupting reading.')+'\n\n'+'\n'.join(f'- [{label}](doc:{target})' for label,target in links)
    body += '\n\n## API {#api}\n\n```typescript\nimport { createLink } from "cydoc";\nconst url = createLink({\n  locale: "fr", pageId: "video-viewer",\n  state: { media: "media-1", time: "1.25" }\n}, "file:///D:/Documentation/Documentation.html");\n```\n\n'
    body += t('Le fragment contient `?media=…&time=…`. Un identifiant explicite `id` dans le bloc média stabilise le lien si vous réorganisez la page. Les annotations créées par le lecteur sont privées : un lien vers leur identifiant nécessite qu’elles existent sur l’appareil cible.','The fragment contains `?media=…&time=…`. An explicit media block `id` keeps links stable when rearranging a page. Reader-created annotations are private: linking their id requires them to exist on the destination device.')
    page(locale,'precise-links',t('Liens précis et vues','Precise links and views'),t('Une URL vers une ligne, une annotation, un instant ou une vue 3D.','A URL to a line, annotation, playback time, or 3D view.'),body,31)
    gif = {'id':'animation','src':'assets/steps-a.gif','title':t('Animation contrôlable','Controllable animation')}
    body = t('Le module `gif` décode localement les images pour permettre pause, déplacement dans l’animation et comparaison synchronisée en temps. Il est optionnel. Un GIF utilisé dans un bloc `image` conserve la lecture native du navigateur.','The optional `gif` module decodes frames locally for pause, scrubbing, frame stepping, and time-synchronized comparison. A GIF in an `image` block keeps native browser playback.')+'\n\n'+block('gif',gif)
    body += '\n## '+t('Comparaison synchronisée','Synchronized comparison')+' {#compare}\n\n'+block('gif',{**gif,'id':'animation-compare','compare':'assets/steps-b.gif'})
    body += '\n## '+t('Galerie de GIF','GIF gallery')+' {#gallery}\n\n'+block('gallery',{'id':'animations','items':[{'type':'gif',**gif},{'type':'gif','src':'assets/steps-b.gif','title':t('Variante','Variant')}]})
    body += '\n## '+t('Mémoire et lecture','Memory and playback')+' {#memory}\n\n'+t('La lecture démarre uniquement sur action du lecteur et s’arrête quand la page est masquée. Le décodeur gère les palettes, la transparence, l’entrelacement et les méthodes de disposition 0–3. La limite est de 64 Mio décodés par fichier, configurable avec `maxDecodedMiB` jusqu’à 256 Mio. Une animation hors budget affiche une erreur ; les images ne sont pas conservées après fermeture du lecteur.','Playback starts on a reader action and pauses when the page is hidden. The decoder handles palettes, transparency, interlacing, and disposal methods 0–3. The decoded budget is 64 MiB per file, configurable with `maxDecodedMiB` up to 256 MiB. Oversized animations display an error; frames are released when the viewer closes.')
    page(locale,'gif-controls',t('GIF contrôlables','GIF controls'),t('Pause, image par image, zoom, comparaison et galeries de GIF.','Pause, frame stepping, zoom, comparison, and GIF galleries.'),body,32)
    body = t('Les adaptateurs convertissent des exports structurés pendant la génération. Doxygen et TypeDoc ne sont pas inclus dans le lecteur. Les fichiers de démonstration sont de petits instantanés illustratifs des formats d’échange, accompagnés de leur code source.','Adapters convert structured exports at build time. Doxygen and TypeDoc are not included in the reader. Demo files are small illustrative interchange snapshots accompanied by their source code.')+'\n\n'
    for label,target in [('C++ · HelpSession','doxygen-cydoc-helpsession-session'),('C++ · open()','doxygen-cydoc-helpsession-open-open'),('TypeScript · helpLink()','typedoc-helplink-2')]: body += f'- [{label}](doc:{target})\n'
    body += '\n## Configuration {#configuration}\n\n'+block('json',{'apiImports':[{'format':'doxygen','prefix':'doxygen','path':'examples/api/doxygen'},{'format':'typedoc','prefix':'typedoc','path':'examples/api/typedoc.json'}]})
    body += '\n## '+t('Autres langages','Other languages')+' {#languages}\n\n'+t('Le format neutre `cydoc` accepte des symboles avec `signature`, `parameters`, `returnType`, `returns`, `bases`, `references` et `source`. Un outil Python, C#, Java ou shader peut produire ce JSON. L’extraction annotée des neuf langages reste disponible ; elle n’infère pas les types par compilation. Les adaptateurs Doxygen/TypeDoc couvrent les déclarations et types courants ; les métadonnées propres aux plugins ne sont pas interprétées.','The neutral `cydoc` format accepts symbols with `signature`, `parameters`, `returnType`, `returns`, `bases`, `references`, and `source`. A Python, C#, Java, or shader tool can produce this JSON. Annotated extraction remains available for all nine languages and does not infer compiler types. Doxygen/TypeDoc adapters cover common declarations and types; plugin-specific metadata is not interpreted.')
    page(locale,'structured-api',t('API structurée','Structured API'),t('Signatures, paramètres, retours, héritages et références importés.','Imported signatures, parameters, returns, inheritance, and references.'),body,33)
    body = t('Le sélecteur de version conserve la page, la section et l’état du média. Les deux éditions **Démo v1** et **Démo v2** sont de petits manuels distincts pour tester le changement de version ; ce ne sont pas des anciennes versions publiées de CyDoc. Les pages absentes y redirigent vers leur accueil.','The version selector preserves page, section, and media state. **Demo v1** and **Demo v2** are distinct small manuals for trying version switching; they are not historical CyDoc releases. Missing pages redirect to their overview.')+'\n\n'
    body += '## '+t('Redirections','Redirects')+' {#redirects}\n\n'+block('json',{'aliases':{'old-media':'media','old-settings':'quickstart#installation'},'versions':[{'id':'1.0','label':'1.0','base':'../v1/Documentation.html'},{'id':'2.0','label':'2.0','base':'../v2/Documentation.html'}]})
    body += t('[Essayez une ancienne adresse](doc:old-media). Les cycles et les destinations manquantes font échouer la génération.','[Try an old address](doc:old-media). Cycles and missing destinations fail generation.')
    body += '\n\n## '+t('Traductions','Translations')+' {#translations}\n\n'+t('L’anglais et sa traduction française complète sont obligatoires avant publication.','English originals and full French translations are required before publication.')
    page(locale,'versions',t('Versions et traductions','Versions and translations'),t('Versions locales, redirections et suivi des révisions traduites.','Local versions, redirects, and translation revision tracking.'),body,34)
    body = t('Ouvrez **Mon espace** dans la navigation pour retrouver vos favoris et pages récentes. Le cœur à côté du titre ajoute la page aux favoris. **Mes notes sur cette page** conserve vos remarques privées et permet leur export depuis Mon espace.','Open **My space** in the navigation to find bookmarks and recent pages. The heart beside the title bookmarks a page. **My notes on this page** stores private notes, exportable from My space.')+'\n\n'
    body += t('La position de lecture est mémorisée. Lorsque vous revenez sur une page, **Reprendre ma lecture** dans le sommaire vous ramène à cette position. Un lien explicite vers une section ou un média conserve sa priorité.','Reading position is remembered. When returning to a page, **Resume reading** in the contents returns to that position. Explicit section or media links retain priority.')+'\n\n'
    body += t('Les données restent dans le stockage de votre navigateur ou WebView. Si ce stockage est indisponible, les notes sont utilisables pendant la lecture et le message d’enregistrement vous demande de les exporter avant fermeture. `storageId` permet à l’application de choisir son espace de données.','Data stays in browser or WebView storage. If storage is unavailable, notes work during reading and the save status asks you to export before closing. `storageId` lets the host choose its data namespace.')
    page(locale,'personal-space',t('Favoris et notes privées','Bookmarks and private notes'),t('Favoris, historique, reprise de lecture et notes exportables.','Bookmarks, history, reading resume, and exportable notes.'),body,35)
    native = [('Qt · Windows/Linux/macOS','qt-main-cpp'),('Python/Tk · Windows/Linux/macOS','help-tk-py'),('C# · Windows','helpwindow-cs'),('Java/Swing · Windows/Linux/macOS','helpwindow-java'),('Swift/AppKit · macOS','macos-help-swift'),('Kotlin/WebView · Android','android-cydocactivity-kt'),('JavaScript · '+t('hôte personnalisé','custom host'),'contextual-help-js')]
    body = t('Les exemples associent F1 ou une action d’aide à une page contextuelle. Distribuez l’export dans `Documentation/` à côté de votre application. Le code Qt utilise le dossier de l’exécutable ; Python, C#, Java et Swift montrent l’API de chemins de leur plateforme.','Examples bind F1 or a help action to a contextual page. Distribute the export in `Documentation/` beside your app. Qt uses the executable directory; Python, C#, Java, and Swift demonstrate platform path APIs.')+'\n\n'
    body += '\n'.join(f'- [{label}](doc:source-examples-integrations-{target})' for label,target in native)
    body += '\n\n## '+t('Exécuter','Run')+' {#run}\n\n```sh\ncmake -S examples/integrations -B .tmp/qt-help\ncmake --build .tmp/qt-help\npython examples/integrations/help_tk.py\njavac examples/integrations/HelpWindow.java\n```\n\n'
    body += t('Qt 6 Widgets est nécessaire pour l’exemple C++. Tkinter, WinForms et Java/Swing utilisent les composants de l’application hôte. Swift est une classe AppKit à intégrer à votre fenêtre. Android fournit une Activity et un fragment de manifeste : copiez l’export dans `app/src/main/assets/Documentation/`, puis ouvrez l’Activity depuis votre application. Le lecteur charge `file:///android_asset/Documentation/Documentation.html` avec des scripts classiques et sans permission Internet. Aucun SDK natif n’est ajouté au noyau JavaScript.','Qt 6 Widgets is required for the C++ example. Tkinter, WinForms, and Java/Swing use host components. Swift supplies an AppKit controller for your window. Android supplies an Activity and manifest fragment: copy the export into `app/src/main/assets/Documentation/`, then open the Activity from your app. It loads `file:///android_asset/Documentation/Documentation.html` using classic scripts without Internet permission. No native SDK is added to the JavaScript core.')
    page(locale,'native-help',t('Aide native et touche F1','Native help and F1'),t('Exemples d’intégration locale sur les quatre plateformes.','Local integration examples for all four platforms.'),body,36, t('Intégration','Integration'))
    body = t('La recherche inclut maintenant le code et les symboles. Filtrez les résultats par type de contenu et par langage. Les fautes légères sont acceptées sur les mots d’au moins quatre caractères.','Search now includes code and symbols. Filter results by content type and language. Minor typos are tolerated on words of at least four characters.')+'\n\n'
    body += t('Essayez `make_help_link`, puis filtrez **Code source** et **cpp**. Le résultat ouvre la ligne correspondante. Essayez `configuraton` pour retrouver `configuration`.','Try `make_help_link`, then filter **Source code** and **cpp**. Results open the matching line. Try `configuraton` to find `configuration`.')+'\n\n'+block('typescript', 'const results = docs.search("make_help_link", "fr", 20, {\n  language: "cpp", kind: "source", fuzzy: true\n});')
    page(locale,'advanced-search',t('Recherche dans le code','Search in code'),t('Filtres, tolérance aux fautes et résultats vers les lignes source.','Filters, typo tolerance, and results linking to source lines.'),body,37)
    # Enrich the existing single-image example with stable, author-defined annotations.
    image_file = ROOT / f'docs/{locale}/image-viewer.md'
    content = image_file.read_text(encoding='utf-8')
    def image_config(match):
        data=json.loads(match[1]); data['annotations']=[{'id':'settings-area','type':'rect','x':0.3,'y':0.3,'toX':0.75,'toY':0.8,'label':t('Zone de réglages','Settings area')},{'id':'help-arrow','type':'arrow','x':0.6,'y':0.8,'toX':0.84,'toY':0.7,'label':t('Aide contextuelle','Contextual help')}]
        return block('image',data).rstrip()
    image_file.write_text(re.sub(r'```image\n([\s\S]*?)\n```',image_config,content),encoding='utf-8')
    mesh_file = ROOT / f'docs/{locale}/mesh-viewer.md'
    def mesh_config(match):
        data=json.loads(match[1]);data['views']=[{'name':t('Face','Front'),'camera':[0,1.5,4],'target':[0,0,0],'scene':0,'wire':False,'environment':'studio'},{'name':t('Profil et triangles','Side and triangles'),'camera':[4,1.5,0],'target':[0,0,0],'scene':0,'wire':True,'environment':'daylight'}];return block('mesh',data).rstrip()
    mesh_file.write_text(re.sub(r'```mesh\n([\s\S]*?)\n```',mesh_config,mesh_file.read_text(encoding='utf-8')),encoding='utf-8')
    gallery_file = ROOT / f'docs/{locale}/galleries.md'
    gallery_ids=iter(['gallery-images','gallery-videos','gallery-meshes','gallery-mixed'])
    def gallery_config(match):
        data=json.loads(match[1]);data['id']=next(gallery_ids);return block('gallery',data).rstrip()
    gallery_file.write_text(re.sub(r'```gallery\n([\s\S]*?)\n```',gallery_config,gallery_file.read_text(encoding='utf-8')),encoding='utf-8')

# Two actual small manuals for testing local version navigation and translation reports.
versions=[{'id':'1-demo','label':'Démo v1','base':'../v1/Documentation.html'},{'id':'2-demo','label':'Démo v2','base':'../v2/Documentation.html'},{'id':'0.1.0','label':'CyDoc 0.1.0','base':'../../../Documentation.html'}]
for version in [1,2]:
    base=f'examples/versions/v{version}'
    config={'name':'CyDoc · Démo versions','version':f'{version}-demo','defaultLocale':'en','locales':[{'code':'fr','label':'Français'},{'code':'en','label':'English'}],'content':'docs','assets':'assets','out':'.output','versions':versions,'homePage':'overview'}
    write(f'{base}/cydoc.config.json',json.dumps(config,ensure_ascii=False,indent=2))
    (ROOT/f'{base}/assets').mkdir(parents=True,exist_ok=True)
    (ROOT/f'{base}/assets/favicon.svg').write_bytes((ROOT/'assets/favicon.svg').read_bytes())
    for locale in ['fr','en']:
        is_fr=locale=='fr'
        metadata='revision: '+str(version)+'\n' if not is_fr else 'sourceRevision: '+str(version)+'\n'
        text=(f'Ce petit manuel est la **démo v{version}**. ' if is_fr else f'This small manual is **demo v{version}**. ')+('La version 2 ajoute une section sur les liens précis.' if is_fr and version==2 else 'Les liens ouvrent la documentation locale.' if is_fr else 'Links open local documentation.')
        write(f'{base}/docs/{locale}/overview.md',f'---\nid: overview\ntitle: '+('Démo versions' if is_fr else 'Version demo')+f'\nsection: Guide\n{metadata}---\n{text}\n\n[Guide](doc:quickstart)\n\n## Installation {{#installation}}\n\n'+('Copiez le dossier de documentation.' if is_fr else 'Copy the documentation folder.')+'\n')
        write(f'{base}/docs/{locale}/quickstart.md','---\nid: quickstart\ntitle: Guide\nsection: Guide\n'+metadata+'---\n## Installation {#installation}\n\n'+('Ouvrez `Documentation.html` sans serveur.' if is_fr else 'Open `Documentation.html` without a server.')+'\n')
    if version==2:
        write(f'{base}/docs/fr/new-feature.md','---\nid: new-feature\ntitle: Nouvelle fonction\nsection: Guide\nsourceRevision: 1\n---\nCette édition ajoute l’ouverture directe d’une section par un lien stable.\n')
        write(f'{base}/docs/en/new-feature.md','---\nid: new-feature\ntitle: New feature\nsection: Guide\nrevision: 1\n---\nThis edition adds direct access to a section through a stable link.\n')

config_file=ROOT/'cydoc.config.json'
config=json.loads(config_file.read_text(encoding='utf-8'))
config['modules']=list(dict.fromkeys(config['modules']+['gif']))
config['aliases']={'old-media':'media','old-settings':'quickstart#installation','translation-report':'overview'}
config['versions']=[{'id':'0.1.0','label':'0.1.0','base':'./Documentation.html'},{'id':'1-demo','label':'Démo v1','base':'DocData/versions/v1/Documentation.html'},{'id':'2-demo','label':'Démo v2','base':'DocData/versions/v2/Documentation.html'}]
config['versionBuilds']=[{'config':f'examples/versions/v{i}/cydoc.config.json','destination':f'versions/v{i}'} for i in [1,2]]
config['apiImports']=[{'format':fmt,'prefix':fmt,'path':path,'locale':locale} for fmt,paths in [('doxygen',['examples/api/doxygen','examples/api/doxygen-fr']),('typedoc',['examples/api/typedoc.json','examples/api/typedoc-fr.json'])] for path,locale in zip(paths,['en','fr'])]
config.pop('translationReport', None)
config['glossary']={'fr':{'PBR':'Rendu basé sur des propriétés physiques des matériaux.'},'en':{'PBR':'Rendering based on physical material properties.'}}
config_file.write_text(json.dumps(config,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def generate_gifs():
    from PIL import Image, ImageDraw
    for variant in ['a','b']:
        frames=[]
        for i in range(12):
            image=Image.new('RGB',(320,200),'#18242d');draw=ImageDraw.Draw(image)
            draw.rounded_rectangle((28,26,292,174),radius=10,fill='#f5f8fa')
            draw.text((45,42),'CyDoc / '+('original' if variant=='a' else 'variant'),fill='#253341')
            draw.rectangle((45,70,274,76),fill='#dce4e9')
            draw.rounded_rectangle((45,100,45+int(228*(i+1)/12),122),radius=4,fill='#278169' if variant=='a' else '#3879b0')
            draw.text((45,143),f'Step {i+1:02d} / 12',fill='#475569')
            frames.append(image)
        frames[0].save(ROOT/f'assets/steps-{variant}.gif',save_all=True,append_images=frames[1:],duration=[70,90,110]*4,loop=0,disposal=2,optimize=True)
    fixture_dir=ROOT/'tests/fixtures/gif';fixture_dir.mkdir(parents=True,exist_ok=True)
    cases=[]
    for disposal in [1,2,3]:
        frames=[]
        for i in range(4):
            image=Image.new('P',(32,24),0);image.putpalette([0,0,0,220,60,80,50,200,130,90,130,240]+[0,0,0]*252)
            ImageDraw.Draw(image).rectangle((i*5,3+i*2,10+i*5,14+i*2),fill=1+i%3)
            frames.append(image)
        path=fixture_dir/f'disposal-{disposal}.gif'
        frames[0].save(path,save_all=True,append_images=frames[1:],transparency=0,disposal=disposal,duration=[40,60,80,100],loop=2,optimize=True,interlace=True)
    for path in [ROOT/'assets/steps-a.gif',ROOT/'assets/steps-b.gif',*fixture_dir.glob('*.gif')]:
        gif=Image.open(path); hashes=[]
        for i in range(gif.n_frames):
            gif.seek(i); rgba=bytearray(gif.convert('RGBA').tobytes())
            for j in range(0,len(rgba),4):
                if rgba[j+3]==0:rgba[j:j+3]=b'\0\0\0'
            hashes.append(hashlib.sha256(rgba).hexdigest())
        cases.append({'path':path.relative_to(ROOT).as_posix(),'width':gif.width,'height':gif.height,'hashes':hashes})
    write('tests/fixtures/gif/expected.json',json.dumps(cases,indent=2))

if __name__=='__main__':
    generate_gifs()
    print('Extended bilingual docs, API/version fixtures, and original GIFs generated.')
