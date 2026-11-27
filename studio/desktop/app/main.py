"""Windows CyUI shell embedding the same web editor through CyUI's CEF adapter."""
import argparse
import ctypes
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
import logging
import socket
import atexit
from urllib.parse import urlparse


def stop_service(process):
    if process and process.poll() is None:
        try:
            process.communicate('cydoc:shutdown\n',timeout=60)
        except subprocess.TimeoutExpired:
            process.kill();process.wait()
        except (OSError,ValueError):
            if process.poll() is None:
                process.terminate();process.wait(15)


def main():
    parser = argparse.ArgumentParser(description='CyDoc Studio desktop')
    parser.add_argument('--data', type=Path)
    parser.add_argument('--cef', type=Path)
    parser.add_argument('--studio', type=Path)
    parser.add_argument('--origin')
    parser.add_argument('--tab', choices=['editor','documentation','assistant','updates','options','mcp'], default='editor')
    parser.add_argument('--capture', type=Path)
    parser.add_argument('--exit-after', type=float, default=0)
    parser.add_argument('--cy-updated-from')
    parser.add_argument('--update-action', choices=['info','check','window'])
    parser.add_argument('--health-report', type=Path)
    args = parser.parse_args()
    frozen = bool(getattr(sys, 'frozen', False))
    distribution = Path(sys.executable).resolve().parents[2] if frozen else None
    data = (args.data or Path(os.environ.get('LOCALAPPDATA', str(Path.home()))) / 'CyDocStudio').resolve()
    from updater import UpdateService
    updates = UpdateService(distribution, ['--data',str(data), *(['--origin',args.origin] if args.origin else [])])
    atexit.register(updates.close)
    if args.update_action:
        if args.update_action == 'info':
            print(json.dumps({'appId':'mrmybal.cydocstudio','mode':updates.mode}));return
        if updates.mode != 'managed':
            print(json.dumps({'type':'result','code':11,'status':'not_installed','message':'A CyInstaller installation or repair is required.'}),file=sys.stderr)
            raise SystemExit(11)
        if args.update_action == 'window':
            if not updates.open_window():
                print(json.dumps({'type':'result','code':1,'message':'The CyInstaller window could not start.'}),file=sys.stderr)
                raise SystemExit(1)
            return
        updates.check();updates.pending.result(timeout=95);result=updates.poll()
        code = result.code if result.success or result.code not in (0,100,102,103) else 1
        print(json.dumps(result.result if result.success else {'type':'result','code':code,'message':result.diagnostic}))
        raise SystemExit(max(1,code) if code<0 else code)
    startup = updates.startup()
    if startup and startup.code == 103:
        if not updates.open_window(recovery=True):raise RuntimeError('The CyInstaller recovery window could not start.')
        return
    studio = args.studio or (distribution / 'app/cydoc/studio' if frozen else Path(__file__).resolve().parents[2])
    studio_version = json.loads((studio/'package.json').read_text('utf-8'))['version']
    data.mkdir(parents=True, exist_ok=True)
    from storage import prepare_preferences
    preferences = prepare_preferences(data)
    (data/'logs').mkdir(exist_ok=True)
    logging.basicConfig(filename=data/'logs/desktop.log', level=logging.INFO, encoding='utf-8', format='%(asctime)s %(levelname)s %(message)s')
    settings_file = preferences/'desktop-settings.json'
    settings = {'language': 'en', 'theme': 'dark', 'textScale': 1.0, 'allowedFolders': [], 'port': 4310}
    if settings_file.exists():
        settings.update(json.loads(settings_file.read_text('utf-8')))
    catalog = json.loads((studio/'dist/themes.json').read_text('utf-8'))
    theme_ids = [theme['id'] for theme in catalog]
    theme_aliases = {'light-grey':'light','mid-grey':'dark','navy':'nord','violet':'midnight','amber-night':'paper'}
    settings['theme'] = theme_aliases.get(settings['theme'], settings['theme'])
    if settings['theme'] not in theme_ids:
        settings['theme'] = 'dark'
    if settings.get('appearanceVersion', 0) < 3:
        settings['appearanceVersion'] = 3
        settings_file.write_text(json.dumps(settings,ensure_ascii=False,indent=2),encoding='utf-8')
    allowed_file=preferences/'allowed-folders.json'
    allowed_file.write_text(json.dumps(settings['allowedFolders']),encoding='utf-8')
    cef = (args.cef or (distribution/'runtime/cef' if frozen else Path(os.environ.get('CYDOC_CEF_DIR', 'runtime/cef')))).resolve()
    library, helper = cef/'cyui_webcef_bridge.dll', cef/'cyui_webcef_helper.exe'
    if not library.is_file() or not helper.is_file():
        raise RuntimeError('CEF is missing. Supply --cef with the matching CyUI WebCEF runtime directory.')
    process = None
    log_stream = (data/'logs/server.log').open('a', encoding='utf-8')
    origin = args.origin
    setup_code = None
    if not origin:
        node = str(distribution/'runtime/node.exe') if frozen else shutil.which('node')
        if not node:
            raise RuntimeError('Node.js 22 or later is required by the documentation compiler.')
        ready = data/'server-ready.json'
        ready.unlink(missing_ok=True)
        selected_port=settings['port']
        if selected_port:
            with socket.socket() as probe:
                try:
                    probe.bind(('127.0.0.1',selected_port))
                except OSError:
                    selected_port=0
        command = [node, str(studio/'server/cli.mjs'), '--local', '--data', str(data/'workspace'), '--port', str(selected_port), '--ready', str(ready),'--allow-roots-file',str(allowed_file)]
        for folder in settings['allowedFolders']:
            command.extend(['--allow-root', folder])
        process = subprocess.Popen(command, cwd=studio, stdin=subprocess.PIPE, text=True, encoding='utf-8',stdout=log_stream, stderr=log_stream,
                                   creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        atexit.register(stop_service,process)
        deadline = time.monotonic()+30
        while not ready.exists():
            if process.poll() is not None or time.monotonic() > deadline:
                raise RuntimeError('The local editor service did not start. Read server.log in the Studio data folder.')
            time.sleep(.05)
        information = json.loads(ready.read_text('utf-8'))
        origin, setup_code = information['origin'], information.get('setupCode')
        if settings['port'] and selected_port==0:
            settings['port']=urlparse(origin).port
            settings_file.write_text(json.dumps(settings,ensure_ascii=False,indent=2),encoding='utf-8')
        ready.unlink(missing_ok=True)
    parsed = urlparse(origin)
    if parsed.scheme not in ('http','https') or parsed.username or parsed.password or parsed.path not in ('','/'):
        raise RuntimeError('Use a valid Studio origin without credentials.')
    if parsed.scheme == 'http' and parsed.hostname not in ('127.0.0.1','localhost','::1'):
        raise RuntimeError('Online connections require HTTPS.')

    from imgui_bundle import hello_imgui as h, imgui as i, portable_file_dialogs as pfd
    from OpenGL import GL as gl
    from PIL import Image
    import cyui as c
    from cyui_modules.cef import CEFRuntime
    from cyui_modules.web import web_panel

    c.register_translations('fr', {'Updates': 'Mises à jour', 'Assistant': 'Assistant', 'Documentation': 'Documentation', 'Local MCP / SDK': 'MCP / SDK local', 'Open local application': 'Ouvrir une application locale', 'Options': 'Options', 'Language': 'Langue', 'Theme': 'Thème', 'Text size': 'Taille du texte', 'Licenses': 'Licences', 'Save configuration': 'Enregistrer la configuration', 'Load configuration': 'Charger une configuration', 'Restart to apply the allowed folder.': 'Redémarrez pour appliquer le dossier autorisé.', 'The editor service is available at:': 'Le service d’édition est disponible à :', 'Create a token in the web Account panel, then configure your MCP client.': 'Créez un jeton dans le panneau Compte de l’éditeur, puis configurez votre client MCP.', 'Copy configuration': 'Copier la configuration', 'Close': 'Fermer', 'Local service': 'Service local', 'Online service': 'Service en ligne', 'Editor': 'Éditeur', 'Light': 'Clair', 'Dark': 'Sombre', 'Midnight blue': 'Bleu nuit', 'Violet': 'Violet', 'Amber night': 'Ambre nocturne', 'Local mode: no account or SDK token is required.': 'Mode local : aucun compte ni jeton SDK n’est nécessaire.'})
    runtime = None
    view = None
    textures = {}
    manual_view = None
    selected_once = False
    last_appearance = None
    picker = None
    capture_done = False
    start = time.monotonic()
    renderer_ready = False
    application_ready = False
    health_written = False
    exit_timer_requested = False
    from shutdown import CloseGuard
    close_guard = CloseGuard()
    native_host = None
    assistant_window = 0
    assistant_bounds = None
    parent_window = 0
    user32 = ctypes.windll.user32
    user32.GetActiveWindow.restype = ctypes.c_void_p
    user32.MoveWindow.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_bool]
    user32.ShowWindow.argtypes = [ctypes.c_void_p, ctypes.c_int]
    def host_theme():
        return {'protocol':'cyui.web','version':1,'type':'theme','payload':{'theme':settings['theme'],'locale':settings['language'],'localWorkspace':not bool(args.origin),'textScale':settings['textScale']}}

    def broadcast_theme():
        for backend in [view,manual_view]:
            if backend is not None:
                backend.post_json(host_theme())
        if native_host and native_host.ready and native_host.process.poll() is None:
            theme = next(item for item in catalog if item['id'] == settings['theme'])
            native_host.request({'command':'appearance', 'locale':settings['language'], 'light':theme['light'],
                                 'colors':theme['colors'], 'textScale':settings['textScale']})

    def apply_native_theme():
        theme = next(item for item in catalog if item['id'] == settings['theme'])
        from appearance import apply_theme
        apply_theme(theme, settings['textScale'])
    parameters = h.RunnerParams()
    parameters.app_window_params.window_title = 'CyDoc Studio '+studio_version
    parameters.app_window_params.window_geometry.size = (1500, 940)
    parameters.app_window_params.restore_previous_geometry = not bool(args.capture)
    parameters.imgui_window_params.default_imgui_window_type = h.DefaultImGuiWindowType.provide_full_screen_window
    parameters.imgui_window_params.show_menu_bar = False
    parameters.imgui_window_params.show_status_bar = False
    parameters.imgui_window_params.remember_theme = False
    parameters.ini_filename = str(preferences/'desktop.ini')
    parameters.fps_idling.enable_idling = False
    parameters.callbacks.load_additional_fonts = lambda: c.load_fonts(size=16)
    parameters.callbacks.setup_imgui_style = apply_native_theme

    def save_settings():
        settings_file.write_text(json.dumps(settings, ensure_ascii=False, indent=2), encoding='utf-8')

    def upload(key, width, height, pointer):
        texture = textures.get(key)
        if not texture:
            texture = textures[key] = int(gl.glGenTextures(1))
        previous = int(gl.glGetIntegerv(gl.GL_TEXTURE_BINDING_2D))
        gl.glBindTexture(gl.GL_TEXTURE_2D, texture)
        gl.glTexParameteri(gl.GL_TEXTURE_2D, gl.GL_TEXTURE_MIN_FILTER, gl.GL_LINEAR)
        gl.glTexParameteri(gl.GL_TEXTURE_2D, gl.GL_TEXTURE_MAG_FILTER, gl.GL_LINEAR)
        gl.glTexImage2D(gl.GL_TEXTURE_2D, 0, gl.GL_RGBA, width, height, 0, gl.GL_BGRA, gl.GL_UNSIGNED_BYTE, ctypes.c_void_p(pointer))
        gl.glBindTexture(gl.GL_TEXTURE_2D, previous)
        return texture

    def release(identifier):
        if identifier:
            gl.glDeleteTextures([identifier])
        for key in list(textures):
            if textures[key] == identifier:
                del textures[key]

    def initialize():
        nonlocal runtime, view, native_host, parent_window
        apply_native_theme()
        c.set_locale(settings['language'])
        runtime = CEFRuntime(library, helper, data/'browser-profile', no_sandbox=True)
        url = origin + ('/#setup='+setup_code if setup_code else '/')
        view = runtime.create(url, (origin,), lambda w,h,p: upload('editor',w,h,p), release)
        from host import NativeHost
        from native_window import studio_window
        os.environ['CYDOC_STUDIO_ORIGIN'] = origin
        parent_window = studio_window(parameters.app_window_params.window_title)
        native_host = NativeHost(data/'jobs')
        native_host.start(chat=True, parent=parent_window, language=settings['language'])
        broadcast_theme()

    def pump():
        if runtime:
            runtime.pump()

    def options():
        nonlocal picker
        i.begin_child('options-page', (min(c.dp(960),i.get_content_region_avail().x),0))
        i.dummy(c.dp2(1, 18)); i.indent(c.dp(28))
        c.heading(c.tr('Options'), 1)
        if c.begin_properties('settings', min(c.dp(220),i.get_content_region_avail().x*.38)):
            c.property(c.tr('Language'))
            changed, selected = i.combo('##language', ['en','fr'].index(settings['language']), ['English','Français'])
            if changed:
                settings['language'] = ['en','fr'][selected];c.set_locale(settings['language']);save_settings();broadcast_theme()
            c.property(c.tr('Theme'))
            themes = theme_ids
            labels = [theme[settings['language']] for theme in catalog]
            changed, selected = i.combo('##theme', themes.index(settings['theme']), labels)
            if changed:
                settings['theme'] = themes[selected];apply_native_theme();save_settings();broadcast_theme()
            c.property(c.tr('Text size'))
            changed, scale = i.slider_float('##text',settings['textScale'],.8,1.5)
            if changed:
                settings['textScale'] = scale;apply_native_theme();save_settings();broadcast_theme()
            c.end_properties()
        c.divider()
        if not args.origin and c.button(c.tr_label('Open local application')):
            picker = ('folder', pfd.select_folder(c.tr('Open local application')))
        if c.button(c.tr_label('Save configuration')):
            picker = ('save', pfd.save_file(c.tr('Save configuration'),'studio-settings.json',['JSON','*.json']))
        if i.get_content_region_avail().x >= c.dp(500):i.same_line()
        if c.button(c.tr_label('Load configuration')):
            picker = ('load', pfd.open_file(c.tr('Load configuration'),'', ['JSON','*.json']))
        c.divider(); c.heading(c.tr('Licenses'),3)
        for name, link in [('CyDoc','https://github.com/MrMybal/CyDoc'),('CyUI','https://github.com/MrMybal/CyUI'),('CyMCPSDK 0.7.5','https://github.com/MrMybal/CyMCPSDK'),('CyInstaller 0.1.0','https://github.com/MrMybal/CyInstaller'),('Dear ImGui / imgui-bundle','https://github.com/pthom/imgui_bundle'),('CEF / Chromium','https://bitbucket.org/chromiumembedded/cef')]:
            i.text_wrapped(name+' · '+link)
        i.unindent(c.dp(28)); i.end_child()

    def update_panel():
        tr = lambda en, fr: fr if settings['language']=='fr' else en
        i.begin_child('updates-page', (min(c.dp(960),i.get_content_region_avail().x),0));i.dummy(c.dp2(1,18));i.indent(c.dp(28))
        c.heading(tr('Studio updates','Mises à jour de Studio'),1)
        i.text_wrapped(tr('Installed version: ','Version installée : ')+studio_version)
        if args.cy_updated_from:
            i.text_wrapped(tr('Updated from ','Mise à jour depuis ')+args.cy_updated_from)
        if updates.mode!='managed':
            i.text_wrapped(tr('Install Studio with its signed CyInstaller setup to enable managed updates. Your projects and drafts remain in the existing data folder.', 'Installez Studio avec son setup CyInstaller signé pour activer les mises à jour gérées. Vos projets et brouillons restent dans le dossier de données existant.'))
            if updates.mode=='repair':i.text_wrapped(tr('The installer engine or registration needs repair.', 'Le moteur ou l’enregistrement de l’installation doit être réparé.'))
        else:
            if not updates.busy:
                if c.button(tr('Check for updates','Rechercher des mises à jour')):updates.check()
                i.same_line()
                if c.button(tr('Open CyInstaller','Ouvrir CyInstaller')) and not updates.open_window():
                    c.notify(tr('The update window could not start.','La fenêtre de mise à jour n’a pas pu démarrer.'),'error')
            else:i.text_wrapped(tr('CyInstaller is working…','CyInstaller est en cours d’exécution…'))
            result=updates.last
            if result:
                if not result.success:i.text_wrapped(tr('Update check failed: ','Échec du contrôle : ')+result.diagnostic)
                elif result.operation=='check':
                    messages={0:tr('No newer version reported.','Aucune version plus récente signalée.'),100:tr('An update is available. Open CyInstaller to review and install it.','Une mise à jour est disponible. Ouvrez CyInstaller pour la consulter et l’installer.'),102:tr('An update is downloaded and ready. Open CyInstaller to apply it.','Une mise à jour est téléchargée et prête. Ouvrez CyInstaller pour l’appliquer.')}
                    i.text_wrapped(messages.get(result.code,result.diagnostic))
                    if result.result.get('latest_version'):i.text_wrapped(tr('Available version: ','Version disponible : ')+str(result.result['latest_version']))
                    if result.result.get('offline'):i.text_wrapped(tr('Offline: showing the last cached result.','Hors ligne : affichage du dernier résultat en cache.'))
                    elif result.result.get('cached'):i.text_wrapped(tr('Result from the installer cache.','Résultat issu du cache de l’installeur.'))
            i.text_wrapped(tr('Opening the update window keeps Studio running. When you accept an update, Studio saves pending work before closing.', 'Ouvrir la fenêtre de mise à jour laisse Studio ouvert. Lorsque vous acceptez une mise à jour, Studio enregistre le travail en attente avant de fermer.'))
        i.unindent(c.dp(28));i.end_child()

    def mcp():
        i.begin_child('mcp-page', (min(c.dp(1040),i.get_content_region_avail().x),0))
        i.dummy(c.dp2(1, 18)); i.indent(c.dp(28))
        c.heading(c.tr('Local MCP / SDK'),1)
        i.text_wrapped(c.tr('The editor service is available at:')+' '+origin)
        if native_host.ready['requiresToken']:
            i.text_wrapped('MCP : CYDOC_MCP_TOKEN' if settings['language']=='fr' else 'MCP requires CYDOC_MCP_TOKEN.')
        else:
            i.text_wrapped('MCP : aucun jeton requis.' if settings['language']=='fr' else 'MCP: no token required.')
        if args.origin:
            i.text_wrapped('Les opérations en ligne utilisent CYDOC_STUDIO_TOKEN dans l’environnement de Studio.' if settings['language']=='fr' else 'Online operations use CYDOC_STUDIO_TOKEN from the Studio environment.')
        endpoint = native_host.ready['endpoint']
        configuration = {'url': endpoint}
        if native_host.ready['requiresToken']:
            configuration['headers'] = {'Authorization': 'Bearer REPLACE_WITH_YOUR_PRIVATE_MCP_TOKEN'}
        config = json.dumps({'mcpServers': {'cydoc-studio': configuration}}, indent=2)
        i.text_wrapped('CyMCPSDK 0.7.5 · '+native_host.ready['profile']+' · '+endpoint)
        i.input_text_multiline('##mcp',config,c.dp2(-28,350),i.InputTextFlags_.read_only)
        if c.button(c.tr_label('Copy configuration')):
            i.set_clipboard_text(config)
        i.unindent(c.dp(28)); i.end_child()

    def event(backend, item):
        nonlocal renderer_ready, last_appearance, application_ready
        if item['kind'] == 'navigated':
            renderer_ready = True
            backend.post_json(host_theme())
        elif item['kind'] in ('error','console'):
            logging.info('Browser %s: %s',item['kind'],item.get('data',''))
        elif item['kind'] == 'message':
            try:
                message = json.loads(item['data'])
                if message.get('protocol') != 'cyui.web' or message.get('version') != 1:
                    return
                kind = message.get('type')
                if kind == 'close-prepared' and backend is view:
                    ready = close_guard.reply(message.get('payload',{}))
                    if ready is True:parameters.app_shall_exit=True
                    elif ready is False:c.notify('Enregistrement impossible : reconnectez l’éditeur avant de fermer.' if settings['language']=='fr' else 'Could not save: reconnect the editor before closing.','error')
                elif kind == 'editor-initialized' and backend is view:
                    application_ready = True
                elif kind in ('editor-ready','reader-ready'):
                    backend.post_json(host_theme())
                elif kind == 'appearance':
                    from appearance import preference_changes
                    changes = preference_changes(settings, message.get('payload'), theme_ids)
                    if changes:
                        settings.update(changes);c.set_locale(settings['language']);apply_native_theme();save_settings();broadcast_theme()
                elif kind == 'appearance-applied':
                    appearance = message.get('payload',{})
                    if appearance != last_appearance:
                        logging.info('Editor appearance applied: %s',appearance); last_appearance = appearance
                elif kind == 'open-documentation-folder' and not args.origin:
                    identifier = message.get('payload',{}).get('projectId','')
                    if len(identifier)==32 and all(character in '0123456789abcdef' for character in identifier):
                        database=json.loads((data/'workspace/studio.json').read_text('utf-8'))
                        record=database.get('projects',{}).get(identifier)
                        if record:
                            root=Path(record['root']).resolve();output=root/'Documentation'
                            permitted=root.is_relative_to((data/'workspace/projects').resolve()) or any(root.is_relative_to(Path(folder).resolve()) for folder in settings['allowedFolders'])
                            if permitted and output.is_dir() and output.resolve().parent==root:
                                os.startfile(str(output))
            except Exception:
                logging.exception('Native editor message failed')

    def draw():
        nonlocal picker, manual_view, selected_once, assistant_window, assistant_bounds, health_written, exit_timer_requested
        runtime.begin_frame()
        shown = None
        if i.begin_tab_bar('studio-tabs'):
            for key, label in [('editor','Editor'),('documentation','Documentation'),('assistant','Assistant'),('updates','Updates'),('options','Options'),('mcp','Local MCP / SDK')]:
                flags = i.TabItemFlags_.set_selected if not selected_once and args.tab == key else 0
                selected, _ = i.begin_tab_item(c.tr_label(label), flags=flags)
                if selected:
                    if key == 'options':
                        options()
                    elif key == 'mcp':
                        mcp()
                    elif key == 'updates':
                        update_panel()
                    elif key == 'assistant':
                        shown = 'assistant'
                        handle_file = data/'jobs/assistant-window.json'
                        if not assistant_window and handle_file.exists():
                            assistant_window = json.loads(handle_file.read_text('utf-8'))['handle']
                        if assistant_window:
                            position = i.get_cursor_screen_pos(); viewport = i.get_main_viewport()
                            size = i.get_content_region_avail()
                            from native_window import panel_bounds
                            bounds = panel_bounds(parent_window, position, size, viewport, i.get_io().display_size)
                            if bounds != assistant_bounds:
                                user32.MoveWindow(assistant_window, *bounds, True); assistant_bounds = bounds
                            user32.ShowWindow(assistant_window, 8)
                            i.dummy(size)
                        else:
                            i.text_unformatted('Starting assistant… / Démarrage de l’assistant…')
                    else:
                        if key == 'documentation' and manual_view is None:
                            manual_view = runtime.create(origin+'/help/Documentation.html#/'+settings['language']+'/overview', (origin,), lambda w,h,p: upload('manual',w,h,p), release)
                        shown = manual_view if key == 'documentation' else view
                        for item in web_panel('studio-'+key, shown, (0,0)):
                            event(shown,item)
                    i.end_tab_item()
            i.end_tab_bar()
            selected_once = True
        if assistant_window and shown != 'assistant':
            user32.ShowWindow(assistant_window, 0)
        for backend in [view, manual_view]:
            if backend is not None and backend is not shown:
                for _ in range(256):
                    item = backend.poll()
                    if item is None: break
                    event(backend,item)
        if picker and picker[1].ready():
            kind, selection = picker; result = selection.result(); picker = None
            try:
                if kind=='folder' and result:
                    folder=str(Path(result).resolve())
                    if folder not in settings['allowedFolders']:
                        settings['allowedFolders'].append(folder);save_settings()
                    allowed_file.write_text(json.dumps(settings['allowedFolders']),encoding='utf-8')
                    view.post_json({'protocol':'cyui.web','version':1,'type':'open-project-folder','payload':{'path':folder,'name':Path(folder).name}})
                elif kind=='save' and result:
                    Path(result).write_text(json.dumps({'schemaVersion':1,'language':settings['language'],'theme':settings['theme'],'textScale':settings['textScale']},indent=2),encoding='utf-8')
                elif kind=='load' and result:
                    loaded=json.loads(Path(result[0]).read_text('utf-8'))
                    loaded['theme']=theme_aliases.get(loaded.get('theme'),loaded.get('theme'))
                    if loaded.get('schemaVersion')!=1 or loaded.get('language') not in ('en','fr') or loaded.get('theme') not in theme_ids or not .8<=loaded.get('textScale',0)<=1.5:
                        raise ValueError('Invalid Studio configuration.')
                    settings.update({key:loaded[key] for key in ('language','theme','textScale')});save_settings();c.set_locale(settings['language']);apply_native_theme();broadcast_theme()
            except Exception as error:
                logging.exception('Native option failed');c.notify(str(error),'error')
        c.render_notifications()
        runtime.end_frame()
        result = updates.poll()
        if result and result.operation=='check' and result.success and result.code in (100,102):
            c.notify('Une mise à jour de Studio est disponible.' if settings['language']=='fr' else 'A Studio update is available.','info')
        if application_ready and updates.mode=='managed' and not updates.confirmed and not updates.busy and (not updates.last or updates.last.operation!='confirm'):
            updates.confirm()
        updates.tick()
        if application_ready and not health_written and (updates.mode!='managed' or updates.confirmed):
            health_written=True
            if args.health_report:
                args.health_report.parent.mkdir(parents=True,exist_ok=True)
                args.health_report.write_text(json.dumps({'version':studio_version,'ready':True,'confirmed':updates.confirmed,'updateMode':updates.mode,'updatedFrom':args.cy_updated_from,'pid':os.getpid(),'origin':origin}),encoding='utf-8')
        if args.exit_after and not exit_timer_requested and time.monotonic()-start > args.exit_after:
            exit_timer_requested=True;close_guard.request()
        if close_guard.request_id and not close_guard.sent:
            if not renderer_ready:parameters.app_shall_exit=True
            else:view.post_json({'protocol':'cyui.web','version':1,'type':'prepare-close','payload':{'requestId':close_guard.request_id}});close_guard.sent=True
        expired = close_guard.expired()
        if expired:
            view.post_json({'protocol':'cyui.web','version':1,'type':'cancel-close','payload':{'requestId':expired}})
            c.notify('La fermeture attend une confirmation de sauvegarde de l’éditeur.' if settings['language']=='fr' else 'Closing requires the editor’s save confirmation.','error')

    def capture():
        nonlocal capture_done
        if args.capture and not capture_done and renderer_ready and time.monotonic()-start>8:
            width,height=map(int,i.get_io().display_size)
            rgba=gl.glReadPixels(0,0,width,height,gl.GL_RGBA,gl.GL_UNSIGNED_BYTE)
            args.capture.parent.mkdir(parents=True,exist_ok=True)
            Image.frombytes('RGBA',(width,height),rgba).transpose(Image.Transpose.FLIP_TOP_BOTTOM).save(args.capture)
            capture_done=True

    def close():
        updates.close()
        if native_host:
            native_host.close()
        if runtime:
            runtime.close()

    parameters.callbacks.post_init=initialize
    parameters.callbacks.pre_new_frame=pump
    parameters.callbacks.show_gui=draw
    parameters.callbacks.before_swap=capture
    parameters.callbacks.before_exit=close
    parameters.callbacks.confirm_exit=close_guard.request
    try:
        h.run(parameters)
    finally:
        stop_service(process)
        log_stream.close()


if __name__=='__main__':
    try:
        main()
    except Exception as error:
        logging.exception('CyDoc Studio could not start')
        if os.name=='nt' and '--exit-after' not in sys.argv:
            ctypes.windll.user32.MessageBoxW(None,str(error),'CyDoc Studio',0x10)
        else:
            print(str(error),file=sys.stderr)
        raise SystemExit(1)
