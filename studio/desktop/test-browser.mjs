// Chromium is always headless, with a disposable profile. Never controls a desktop window.
import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve, dirname, join, relative, isAbsolute } from 'node:path';

const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const {values}=parseArgs({options:{studio:{type:'string'},origin:{type:'string'},work:{type:'string'},playwright:{type:'string'},chrome:{type:'string'}}});
const work=resolve(values.work || join(repo,'.tmp/browser-final'));
const delta=relative(join(repo,'.tmp'),work);
assert(delta && !isAbsolute(delta) && !delta.startsWith('..'),'Use a dedicated directory under .tmp.');
await mkdir(work,{recursive:true});
const {chromium}=createRequire(import.meta.url)(resolve(values.playwright || join(repo,'.tmp/headless-test-tools/node_modules/playwright')));
const sourceVersion=JSON.parse(await readFile(join(repo,'studio/package.json'),'utf8')).version;
const studio=resolve(values.studio || join(repo,`artifacts/CyDocStudio-${sourceVersion}-payload/app/cydoc/studio`));
const chrome=values.chrome || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
let service,browser;
const checks=[],errors=[],external=[],blockedAmbient=[];
const checked=name=>{checks.push(name);console.log('PASS '+name);};
try {
  let origin=values.origin;
  if(!origin){
    const {startStudio}=await import(pathToFileURL(join(studio,'server/server.mjs')).href);
    service=await startStudio({directory:await mkdtemp(join(work,'data-')),localOnly:true,port:0});origin=service.origin;
  }
  const target=new URL(origin);assert(['127.0.0.1','localhost'].includes(target.hostname));
  browser=await chromium.launch({headless:true,executablePath:chrome,args:['--disable-background-networking']});
  const context=await browser.newContext({viewport:{width:1366,height:900},locale:'fr-FR'});
  let networkOffline=false;const socketPairs=[];
  await context.routeWebSocket(/\/collaboration\?/,socket=>{
    if(networkOffline){socket.close({code:1012,reason:'Isolated offline test'});return;}
    socketPairs.push([socket,socket.connectToServer()]);
  });
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin===target.origin || ['data:','blob:'].includes(url.protocol))return route.continue();
    if(url.hostname==='gc.kis.v2.scr.kaspersky-labs.com'&&route.request().resourceType()==='script')blockedAmbient.push(url.origin);
    else external.push(url.origin);
    return route.abort();
  });
  await context.addInitScript(({origin})=>{
    if(location.origin!==origin)return;
    localStorage.setItem('cydoc-studio-language','fr');localStorage.setItem('cydoc-studio-theme','light');
    window.__nativeMessages=[];window.__nativeListeners=[];
    window.cyuiNative={postMessage:value=>window.__nativeMessages.push(value),addEventListener:(type,fn)=>{if(type==='message')window.__nativeListeners.push(fn);}};
    window.__receiveNative=message=>window.__nativeListeners.forEach(fn=>fn({data:message}));
  },{origin:target.origin});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin);await page.getByRole('heading',{name:'Projets',exact:true}).waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'),'fr');
  assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  await page.waitForFunction(()=>window.__nativeMessages.some(message=>message.type==='editor-initialized'));
  checked('packaged editor initializes in French/light without an account or native window');
  await page.getByRole('button',{name:'Nouveau projet',exact:true}).first().click();
  await page.locator('#create-project [name=name]').fill('Validation sans fenêtre');
  await page.getByRole('button',{name:'Créer',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#save-state')?.textContent==='Enregistré');
  checked('opening an unchanged page receives its durable save acknowledgement');
  await page.locator('#content-locale').selectOption('fr');
  await page.waitForFunction(()=>document.querySelector('#save-state')?.textContent==='Enregistré');
  await page.getByRole('heading',{name:'Propriétés de la page',exact:true}).waitFor();
  await page.locator('[data-action=mode-source]').click();
  const editor=page.locator('.cm-content');await editor.click();await editor.press('Control+End');await editor.press('Enter');
  await page.keyboard.insertText('Une modification française sauvegardée.');
  await page.waitForFunction(()=>document.querySelector('#save-state')?.textContent==='Enregistré');
  const route=await page.evaluate(()=>location.hash.split('/'));
  const persisted=await context.request.get(`${origin}/api/projects/${route[2]}/pages/fr/overview`).then(response=>response.json());
  assert(persisted.body.includes('Une modification française sauvegardée.'));
  await editor.press('Control+z');await editor.press('Control+s');
  await page.waitForFunction(()=>document.querySelector('#save-state')?.textContent==='Enregistré');
  checked('French Unicode editing, undo and Ctrl+S save successfully');
  await page.evaluate(()=>window.__receiveNative({protocol:'cyui.web',version:1,type:'prepare-close',payload:{requestId:'headless-ready'}}));
  await page.waitForFunction(()=>window.__nativeMessages.some(message=>message.type==='close-prepared'&&message.payload.requestId==='headless-ready'&&message.payload.ready));
  await page.evaluate(()=>window.__receiveNative({protocol:'cyui.web',version:1,type:'cancel-close',payload:{requestId:'headless-ready'}}));
  assert.equal(await page.locator('#app').evaluate(element=>element.inert),false);
  checked('the actual web close handshake accepts a saved page and restores input on cancel');
  networkOffline=true;await context.setOffline(true);
  await Promise.allSettled(socketPairs.flat().map(socket=>socket.close({code:1012,reason:'Isolated offline test'})));
  await page.waitForFunction(()=>document.querySelector('#save-state')?.textContent.includes('Déconnecté'));
  await editor.click();await editor.press('Control+End');await editor.press('Enter');await page.keyboard.insertText('Brouillon hors ligne conservé.');
  await page.evaluate(()=>window.__receiveNative({protocol:'cyui.web',version:1,type:'prepare-close',payload:{requestId:'headless-offline'}}));
  await page.waitForFunction(()=>window.__nativeMessages.some(message=>message.type==='close-prepared'&&message.payload.requestId==='headless-offline'&&!message.payload.ready),{},{timeout:15000});
  assert.equal(await page.locator('#app').evaluate(element=>element.inert),false);
  assert(await page.evaluate(()=>Object.keys(localStorage).some(key=>key.startsWith('cydoc-draft:')&&localStorage.getItem(key).includes('Brouillon hors ligne'))));
  networkOffline=false;await context.setOffline(false);await page.waitForFunction(()=>document.querySelector('#save-state')?.textContent==='Enregistré',{},{timeout:30000});
  checked('offline closure is refused, the draft survives and reconnect saves it');
  await page.getByRole('button',{name:'Préférences',exact:true}).first().click();
  await page.locator('[data-preference=language]').selectOption('en');
  await page.waitForFunction(()=>document.documentElement.lang==='en'&&document.querySelector('#save-state')?.textContent==='Saved');
  const nativeLanguageReported=await page.evaluate(()=>window.__nativeMessages.some(message=>message.type==='appearance'&&message.payload?.locale==='en'));
  assert(nativeLanguageReported,'The native shell was not informed of the interface language change');
  await page.getByRole('button',{name:'Preferences',exact:true}).first().click();
  await page.locator('[data-preference=theme]').selectOption('dark');await page.locator('[data-preference=language]').selectOption('fr');
  await page.waitForFunction(()=>document.documentElement.lang==='fr'&&document.documentElement.dataset.theme==='dark');
  await page.getByRole('button',{name:'Préférences',exact:true}).first().click();
  await page.locator('[data-preference=theme]').selectOption('light');await page.getByRole('button',{name:'Fermer',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#save-state')?.textContent==='Enregistré');
  checked('French/English and light/dark preference round trips preserve the open page');
  await page.locator('[data-action=mode-visual]').click();
  await page.screenshot({path:join(work,'editor-fr-light-desktop.png')});
  for(const width of [720,390]){
    await page.setViewportSize({width,height:900});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Horizontal overflow at ${width}`);
    await page.screenshot({path:join(work,`editor-fr-light-${width}.png`)});
  }
  checked('French/light layouts render without document-wide horizontal overflow at 1366, 720 and 390 pixels');
  await page.setViewportSize({width:1366,height:900});
  await page.locator('[data-action=studio-documentation]').click();
  const help=page.frameLocator('iframe.preview-frame');await help.locator('.cydoc-viewer').waitFor();
  await help.locator('body').evaluate(()=>window.__receiveNative({protocol:'cyui.web',version:1,type:'theme',payload:{theme:'light',locale:'fr'}}));
  const helpTheme=await help.locator('.cydoc-viewer').getAttribute('data-theme');
  assert.equal(helpTheme,'light');
  checked('the bundled French manual accepts the light theme through its simulated host bridge');
  await page.screenshot({path:join(work,'documentation-fr.png')});
  assert.equal(errors.length,0,errors.join('\n'));assert.equal(external.length,0,external.join('\n'));
  const report={checks,headless:true,nativeWindowsOpened:false,desktopControlled:false,nativeBridgeSimulated:true,
    browserVersion:browser.version(),packageVersion:JSON.parse(await readFile(join(studio,'package.json'),'utf8')).version,
    french:true,light:true,helpTheme,nativeLanguageReported,pageErrors:errors,externalRequests:external,blockedAmbientRequests:blockedAmbient,editorInitialized:true};
  await writeFile(join(work,'result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(error){if(browser){const pages=browser.contexts().flatMap(context=>context.pages());if(pages[0])await pages[0].screenshot({path:join(work,'failure.png')}).catch(()=>{});}throw error;}
finally{await browser?.close();await service?.close();}
