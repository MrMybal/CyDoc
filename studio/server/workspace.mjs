import { readFile, mkdir, stat, unlink, rename, writeFile, cp, rm } from 'node:fs/promises';
import { join, resolve, relative, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFrontmatter, compileMarkdown } from '../../tools/compiler.mjs';
import { buildSite } from '../../tools/build.mjs';
import { contained, files, rejectLinks, fail, uid, digest, atomic, text, identifier, json } from './storage.mjs';
import { git, gitAction, remoteUrl } from './git.mjs';

export const modules = ['image', 'video', 'gallery', 'gif', 'mesh', 'graph'];
export function serialize(metadata, body) {
  const rows = Object.entries(metadata).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => {
    if (!/^[a-zA-Z]+$/.test(key) || /[\r\n]/.test(String(value))) fail(400, 'Metadata must contain single-line values.');
    return `${key}: ${value}`;
  });
  return `---\n${rows.join('\n')}\n---\n\n${body.replace(/^\n/, '')}`;
}
export class Workspace {
  constructor(database, { allowRoots = [], allowRootsFile } = {}) { this.db = database; this.allowRoots = allowRoots.map(root => resolve(root)); this.allowRootsFile=allowRootsFile;this.locks = new Map(); }
  lock(id, fn) {
    const next = (this.locks.get(id) || Promise.resolve()).then(fn);
    this.locks.set(id, next.catch(() => {})); return next;
  }
  async initialize(root,name){
    await mkdir(join(root,'.CyDocBuild/assets'),{recursive:true});
    for(const locale of ['en','fr']){
      await mkdir(join(root,'.CyDocBuild/manual',locale),{recursive:true});
      await atomic(join(root,'.CyDocBuild/manual',locale,'overview.md'),serialize({id:'overview',title:name,description:locale==='en'?`Get started with ${name}.`:`Premiers pas avec ${name}.`,section:'Guides',order:0,...(locale==='en'?{revision:'1'}:{sourceRevision:'1'})},locale==='en'?`## Getting started {#getting-started}\n\nWelcome to ${name}.\n`:`## Premiers pas {#getting-started}\n\nBienvenue dans ${name}.\n`));
    }
    await atomic(join(root,'.CyDocBuild/cydoc.config.json'),JSON.stringify({name,version:'1.0.0',defaultLocale:'en',locales:[{code:'en',label:'English'},{code:'fr',label:'Français'}],homePage:'overview',content:'manual',assets:'assets',out:'../Documentation',modules:[]},null,2));
    await atomic(join(root,'.CyDocBuild/.gitignore'),'internal/\nnode_modules/\n*.log\n');
  }
  async create(user, input) {
    if (input.template && input.template !== 'cydoc') fail(400, 'Unknown example project.');
    if (input.template && (input.path || input.remote)) fail(400, 'Create an example in its own project folder.');
    const name = text(input.name, 140).trim(); if (!name) fail(400, 'A project name is required.');
    const id = uid(); let root = join(this.db.directory, 'projects', id);
    if (input.path) {
      if (!user.administrator) fail(403, 'Only the server administrator may attach local application folders.');
      const chosen = resolve(text(input.path, 4000));
      const nativeRoots=this.allowRootsFile?await json(this.allowRootsFile,[]):[];
      const roots=[...this.allowRoots,...(Array.isArray(nativeRoots)?nativeRoots.filter(value=>typeof value==='string').map(value=>resolve(value)):[])];
      const permitted = roots.find(allowed => chosen === allowed || (!relative(allowed, chosen).startsWith('..') && !relative(allowed, chosen).includes(':')));
      if (!permitted) fail(403, 'This folder has not been allowed by the server operator.');
      root = await contained(permitted, relative(permitted, chosen));
      if (!(await stat(join(root, '.CyDocBuild/cydoc.config.json')).catch(() => null))) {
        // Never replace an earlier partial/manual authoring workspace implicitly.
        if(await stat(join(root,'.CyDocBuild')).catch(()=>null))fail(409,'This application already has an authoring workspace without a CyDoc configuration. Preserve and migrate it first.');
        await this.initialize(root,name);
      }
    } else {
      await mkdir(root, { recursive: true });
      if (input.remote) {
        const url = remoteUrl(input.remote);
        let authentication;
        if (input.gitToken || input.gitUsername) {
          const username = text(input.gitUsername, 200), token = text(input.gitToken, 4000);
          if (!username || !token || /[\r\n\u0000]/.test(username + token)) fail(400, 'Provide a Git username and token.');
          authentication = { username, token, url };
        }
        await git(root, ['clone', '--', url, '.'], 120000, authentication);
        if (!(await stat(join(root, '.CyDocBuild/cydoc.config.json')).catch(() => null))) { if(await stat(join(root,'.CyDocBuild')).catch(()=>null))fail(409,'The repository contains an authoring workspace that needs migration.');await this.initialize(root,name); }
      } else if (input.template === 'cydoc') {
        const source = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/example');
        if (!await stat(join(source, 'cydoc.config.json')).catch(() => null)) fail(503, 'Build Studio before opening its example project.');
        const privateRoot = join(root, '.CyDocBuild');
        await cp(source, privateRoot, { recursive: true });
        const file = join(privateRoot, 'cydoc.config.json');
        const config = JSON.parse(await readFile(file, 'utf8')); config.name = name;
        await atomic(file, JSON.stringify(config, null, 2));
        await atomic(join(privateRoot, '.gitignore'), 'internal/\nnode_modules/\n*.log\n');
      } else {
        await this.initialize(root,name);
      }
    }
    const project = { id, name, root, git: !!(input.remote || input.git), members: user === this.db.localUser ? {} : { [user.id]: 'owner' }, created: Date.now() };
    await this.config(project);
    if (input.git && !input.remote) await gitAction(project, 'enable');
    await this.db.change(data => { data.projects[id] = project; });
    if (input.gitToken && this.credentials) await this.credentials.save(id, input.gitUsername, input.gitToken);
    return this.summary(project, user);
  }
  summary(project, user) { return { id: project.id, name: project.name, git: project.git, role: this.db.role(user, project), created: project.created }; }
  async config(project) {
    const privateRoot = await contained(project.root, '.CyDocBuild');
    const file = await contained(privateRoot, 'cydoc.config.json');
    const config = JSON.parse(await readFile(file, 'utf8'));
    if (config.defaultLocale !== 'en' || !Array.isArray(config.locales) || !['en', 'fr'].every(code => config.locales.some(item => item.code === code))) fail(400, 'English originals and French translations are required.');
    const content = await contained(privateRoot, config.content || 'manual');
    const assets = await contained(privateRoot, config.assets || 'assets');
    for (const folder of [content, assets]) {
      const path = relative(privateRoot, folder).replaceAll('\\','/');
      if (!path || path.split('/').includes('internal')) fail(400, 'Content and media must use dedicated public source folders outside internal working records.');
    }
    if (config.modules?.some(name => !modules.includes(name))) fail(400, 'Unknown media module.');
    // Imported configurations may reference application source, never another project.
    for (const source of [...(config.sources || []), ...(config.apiIndex?.includeDirs || config.sourceIndex?.includeDirs || []), ...(config.apiImports || []).map(item => item.path)]) await contained(project.root, relative(project.root, resolve(privateRoot, source)));
    for (const entry of Object.values(config.linkedDocs || {})) if (entry.manifest) await contained(project.root, relative(project.root, resolve(privateRoot, entry.manifest)));
    if (config.versionBuilds?.length) fail(400, 'Version builds need a separate CLI workspace; do not edit a versioned build configuration in Studio yet.');
    return { config, file, privateRoot, content, assets };
  }
  async pages(project) {
    const { content } = await this.config(project); const pages = [];
    for (const locale of ['en', 'fr']) {
      const directory = await contained(content, locale);
      for (const file of await files(directory, /\.md$/i)) {
        if (basename(file).toLowerCase() === 'docai.md') continue;
        const source = await readFile(file, 'utf8'), { metadata, body } = readFrontmatter(source);
        if(metadata.audience&&!['user','internal','ai'].includes(metadata.audience))fail(422,'Unknown documentation audience.');
        if (metadata.audience && metadata.audience !== 'user') continue;
        pages.push({ ...metadata, locale, body, revisionToken: digest(source), path: relative(content, file).replaceAll('\\', '/') });
      }
    }
    return pages.sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || a.title.localeCompare(b.title));
  }
  async page(project, locale, id) {
    if (!['en', 'fr'].includes(locale)) fail(400, 'Unknown language.'); identifier(id);
    const page = (await this.pages(project)).find(page => page.locale === locale && page.id === id);
    if (!page) fail(404, 'Page not found.'); return page;
  }
  async writeBody(project, locale, id, body, expectedToken) {
    return this.lock(project.id, async () => {
      text(body, 2 * 1024 * 1024);
      const page = await this.page(project, locale, id);
      if (expectedToken !== page.revisionToken) fail(409, 'The file changed outside this editing session. Reload it before saving.');
      const { content, privateRoot } = await this.config(project), file = await contained(content, page.path);
      const { path, revisionToken, locale: ignored, body: oldBody, ...metadata } = page;
      // A changed English body makes its existing French translation stale.
      if (locale === 'en' && body !== oldBody) metadata.revision = digest(body).slice(0, 16);
      if(locale==='fr'&&body!==oldBody)delete metadata.sourceRevision;
      await this.snapshot(privateRoot, page);
      const source = serialize(metadata, body); await atomic(file, source);
      return { ...page, ...metadata, body, revisionToken: digest(source) };
    });
  }
  async snapshot(privateRoot, page) {
    const folder = await contained(privateRoot, `internal/studio-history/${page.locale}/${page.id}`);
    await mkdir(folder, { recursive: true });
    const { path, revisionToken, locale, body, ...metadata } = page;
    await atomic(join(folder, `${Date.now()}-${uid().slice(0, 6)}.md`), serialize(metadata, body));
    const entries = (await files(folder, /\.md$/)).sort();
    for (const old of entries.slice(0, Math.max(0, entries.length - 50))) await unlink(old);
  }
  async metadata(project, locale, id, input) {
    return this.lock(project.id, async () => {
      const page = await this.page(project, locale, id);
      if (input.revisionToken !== page.revisionToken) fail(409, 'This page changed. Refresh its properties.');
      const { content, privateRoot } = await this.config(project);
      const { path, revisionToken, locale: ignored, body, ...metadata } = page;
      for (const key of ['title', 'description', 'section']) if (input[key] !== undefined) {
        metadata[key] = text(input[key], key === 'description' ? 2000 : 240).trim();
        if (/\r|\n/.test(metadata[key]) || (key !== 'description' && !metadata[key])) fail(400, 'A title and section are required.');
      }
      if (input.parent !== undefined) {
        if (input.parent) {
          identifier(input.parent); const all = await this.pages(project);
          for(const language of ['en','fr']){let cursor=input.parent;const visited=new Set([id]);while(cursor){if(visited.has(cursor))fail(400,'A page cannot be its own ancestor.');visited.add(cursor);const ancestor=all.find(item=>item.locale===language&&item.id===cursor);if(!ancestor)fail(400,'Parent page not found.');cursor=ancestor.parent;}}
          metadata.parent = input.parent;
        } else delete metadata.parent;
      }
      if (input.order !== undefined) { if (!Number.isFinite(Number(input.order))) fail(400, 'Invalid order.'); metadata.order = Number(input.order); }
      if (input.translationReviewed && locale === 'fr') {
        const original = await this.page(project, 'en', id);
        if (!body.trim()) fail(400, 'Translate the page before marking it reviewed.');
        metadata.sourceRevision = original.revision || digest(original.body).slice(0, 12);
      }
      if(locale==='en'&&['title','description','section'].some(key=>metadata[key]!==page[key]))metadata.revision=digest(JSON.stringify([metadata.title,metadata.description,metadata.section,body])).slice(0,16);
      await this.snapshot(privateRoot, page);
      await atomic(await contained(content, path), serialize(metadata, body));
      if(input.parent!==undefined||input.order!==undefined){
        const other=await this.page(project,locale==='en'?'fr':'en',id);
        const {path:otherPath,revisionToken:otherToken,locale:otherLocale,body:otherBody,...otherMetadata}=other;
        if(input.parent!==undefined){if(input.parent)otherMetadata.parent=input.parent;else delete otherMetadata.parent;}
        if(input.order!==undefined)otherMetadata.order=metadata.order;
        await this.snapshot(privateRoot,other);await atomic(await contained(content,otherPath),serialize(otherMetadata,otherBody));
      }
      return this.page(project, locale, id);
    });
  }
  async createPage(project, input) {
    return this.lock(project.id, async () => {
      const id = identifier(input.id), { content } = await this.config(project);
      const existing=await this.pages(project);
      if (existing.some(page => page.id === id)) fail(409, 'This stable page ID already exists.');
      const order=Math.max(0,...existing.map(page=>Number(page.order)||0))+10;
      if (input.parent) await this.page(project, 'en', identifier(input.parent));
      for (const locale of ['en', 'fr']) {
        const title = text(input.titles?.[locale] || id, 240);
        await atomic(await contained(content, `${locale}/${id}.md`), serialize({ id, title, description: '', section: text(input.section || 'Guides', 240), parent: input.parent || undefined, order, ...(locale === 'en' ? { revision: 'draft' } : {}) }, ''));
      }
      return { id };
    });
  }
  async deletePage(project, id) {
    return this.lock(project.id, async () => {
      const { config, content, privateRoot,file } = await this.config(project);
      const pages = await this.pages(project);
      const home=config.homePage||pages.find(page=>page.locale==='en'&&page.id==='overview')?.id||pages.find(page=>page.locale==='en')?.id;
      if (id === home) fail(400, 'Choose another home page before archiving this page.');
      if (pages.some(page => page.parent === id)) fail(400, 'Move the child pages before archiving this page.');
      for (const page of pages.filter(page => page.id === id)) {
        await this.snapshot(privateRoot, page);
        const target = await contained(privateRoot, `internal/archived/${page.locale}/${uid()}-${id}.md`);
        await mkdir(dirname(target), { recursive: true }); await rename(await contained(content, page.path), target);
      }
      config.aliases={...config.aliases,[id]:config.aliases?.[id]||home};await atomic(file,JSON.stringify(config,null,2));
      return { archived: id };
    });
  }
  async settings(project, input) {
    return this.lock(project.id, async () => {
      const { config, file } = await this.config(project);
      if (input.modules) {
        if (!Array.isArray(input.modules) || input.modules.some(name => !modules.includes(name))) fail(400, 'Unknown media module.');
        config.modules = [...new Set(input.modules)];
      }
      for (const key of ['name', 'version', 'homePage']) if (input[key] !== undefined) config[key] = text(input[key], 240);
      if (input.homePage) await this.page(project, 'en', input.homePage);
      if (input.logo !== undefined) { if (input.logo) { if (!input.logo.startsWith('assets/')) fail(400, 'Logo must be a local asset.'); const { assets } = await this.config(project); await stat(await contained(assets, input.logo.slice(7))); config.logo = input.logo; } else delete config.logo; }
      await atomic(file, JSON.stringify(config, null, 2));
      await this.db.change(data => { data.projects[project.id].name = config.name; }); return config;
    });
  }
  async assetList(project) {
    const { assets } = await this.config(project);
    return Promise.all((await files(assets)).map(async file => ({ name: relative(assets, file).replaceAll('\\', '/'), size: (await stat(file)).size })));
  }
  async upload(project, name, bytes) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,180}\.(?:png|jpe?g|webp|avif|gif|svg|webm|mp4|ogv|glb|gltf|bin|ktx2|mp3|wav)$/i.test(name) || name.includes('..')) fail(400, 'Unsupported media filename.');
    if (bytes.length > 64 * 1024 * 1024) fail(413, 'Media imports are limited to 64 MiB.');
    const { assets } = await this.config(project), file = await contained(assets, name);
    try { await writeFile(file, bytes, { flag: 'wx' }); } catch (error) { if (error.code === 'EEXIST') fail(409, 'This asset already exists. Rename the imported file.'); throw error; }
    return { src: `assets/${name}`, size: bytes.length };
  }
  async preview(project, locale, id) {
    const page = await this.page(project, locale, id), { config } = await this.config(project);
    const compiled = compileMarkdown(page.body, { locale, pageId: id, linkedDocs: config.linkedDocs, glossary: config.glossary?.[locale] });
    const { mediaBlocks, ...rendered } = compiled;
    return { manifest: { schemaVersion: 1, name: config.name, version: config.version, logo: config.logo, defaultLocale: locale, locales: [{ code: locale, label: locale === 'en' ? 'English' : 'Français' }], pages: [{ ...page, ...rendered, order: 0, parent: undefined }] }, modules: config.modules || [], mediaBlocks };
  }
  async publish(project) {
    return this.lock(project.id, async () => {
      const { file, privateRoot } = await this.config(project);
      const pages=await this.pages(project);
      for(const original of pages.filter(page=>page.locale==='en')){
        const translated=pages.find(page=>page.locale==='fr'&&page.id===original.id);
        if(!translated?.body.trim()||translated.sourceRevision!==(original.revision||digest(original.body).slice(0,12)))fail(422,`Review the complete French translation before publication: ${original.id}`);
      }
      const settings = await this.config(project);
      await rejectLinks(settings.assets); await rejectLinks(settings.content);
      for (const source of settings.config.sources || []) await rejectLinks(resolve(privateRoot,source),true);
      const stage = await contained(privateRoot, `internal/exports/${uid()}`);
      try { await buildSite(file, { out: relative(privateRoot, stage), landingPage: false }); }
      catch (error) { fail(422, error.message.replaceAll(project.root, 'App')); }
      const destination = await contained(project.root, 'Documentation');
      if (await stat(destination).catch(() => null)) await rejectLinks(destination);
      // Only a successfully built complete manual reaches the public directory.
      await cp(stage, destination, { recursive: true });
      return { entry: 'Documentation/Documentation.html', publishedAt: Date.now() };
    });
  }
}
