// Copy Node runtime dependency closures without build/editor-only dependencies.
import { cp, mkdir, readFile, stat } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const within = (root, path) => { const part = relative(root, path); return !isAbsolute(part) && part !== '..' && !part.startsWith('..'+(process.platform === 'win32' ? '\\' : '/')); };

export async function copyRuntime(source, destination, roots) {
  source = resolve(source); destination = resolve(destination);
  const copied = new Set();
  async function locate(name, issuer) {
    if (!/^(@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/i.test(name) || name.split('/').some(part => part === '.' || part === '..')) throw new Error('Invalid package name: '+name);
    for (let cursor = issuer; within(source, cursor); cursor = dirname(cursor)) {
      const directory = join(cursor, 'node_modules', name);
      if (await stat(join(directory, 'package.json')).catch(() => null)) return directory;
      if (cursor === source) break;
    }
  }
  async function visit(name, issuer, optional = false) {
    const directory = await locate(name, issuer);
    if (!directory) { if (optional) return; throw new Error('Missing runtime dependency: '+name); }
    if (copied.has(directory)) return;
    copied.add(directory);
    const metadata = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
    const target = join(destination, relative(source, directory));
    await mkdir(dirname(target), { recursive: true });
    await cp(directory, target, { recursive: true, filter: path => basename(path) !== 'node_modules' });
    for (const dependency of Object.keys(metadata.dependencies || {})) {
      await visit(dependency, directory, Object.hasOwn(metadata.optionalDependencies || {}, dependency));
    }
    for (const dependency of Object.keys(metadata.optionalDependencies || {})) await visit(dependency, directory, true);
    for (const dependency of Object.keys(metadata.peerDependencies || {})) {
      await visit(dependency, directory, metadata.peerDependenciesMeta?.[dependency]?.optional === true);
    }
  }
  for (const root of roots) await visit(root, source);
  return [...copied].map(directory => relative(source, directory));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [source, destination, ...roots] = process.argv.slice(2);
  if (!source || !destination || !roots.length) throw new Error('Supply source, destination and runtime package names.');
  console.log('Runtime packages: '+(await copyRuntime(source, destination, roots)).join(', '));
}
