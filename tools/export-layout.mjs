import { readFile, readdir, mkdir, rename, rmdir, lstat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const generatedFile = /^(?:data\.js|manifest\.json|translation-report\.json|viewer\.(?:js|css)|media-(?:image|video|mesh|gallery|graph|gif)\.js|media-mesh\.LICENSE\.txt|media-(?:mesh|gif)-data-[a-f0-9]{16}\.js)$/;

async function moveTree(source, target) {
  const info = await lstat(source);
  if (info.isDirectory()) {
    await mkdir(target, { recursive: true });
    for (const name of await readdir(source)) await moveTree(join(source, name), join(target, name));
    await rmdir(source);
  } else await rename(source, target);
}

/** Recognize CyDoc's old flat export, move its generated files, and keep existing entry links. */
export async function migrateLegacyExport(source, dataOutput, entry) {
  const index = join(source, 'index.html');
  const html = await readFile(index, 'utf8').catch(error => { if (error.code !== 'ENOENT') throw error; return ''; });
  if (!html.includes('<script src="data.js" defer>') || !html.includes('<script src="viewer.js" defer>') || !html.includes('id="app"')) return false;
  await mkdir(dataOutput, { recursive: true });
  for (const file of await readdir(source, { withFileTypes: true })) {
    if (generatedFile.test(file.name) || (file.name === 'assets' && file.isDirectory())) await moveTree(join(source, file.name), join(dataOutput, file.name));
  }
  const target = relative(source, entry).replaceAll('\\', '/').split('/').map(encodeURIComponent).join('/');
  await writeFile(index, `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Documentation</title>
<script>const reader = new URL(${JSON.stringify(target)}, location.href); reader.search = location.search; reader.hash = location.hash; location.replace(reader.href);</script>
</head><body><a href="${target}">Documentation</a></body></html>\n`);
  return true;
}
