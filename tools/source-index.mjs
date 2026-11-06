import { resolve, dirname, relative, extname } from 'node:path';

const languages = {
  '.c': 'c', '.h': 'c', '.cc': 'cpp', '.cpp': 'cpp', '.cxx': 'cpp', '.hpp': 'cpp', '.hh': 'cpp', '.hxx': 'cpp', '.cppm': 'cpp', '.ixx': 'cpp',
  '.kt': 'kotlin', '.swift': 'swift', '.py': 'python', '.pyi': 'python', '.cs': 'csharp', '.java': 'java', '.js': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript', '.jsx': 'javascript', '.ts': 'typescript', '.tsx': 'typescript',
  '.hlsl': 'hlsl', '.hlsli': 'hlsl', '.glsl': 'glsl', '.vert': 'glsl', '.frag': 'glsl', '.geom': 'glsl', '.comp': 'glsl', '.tesc': 'glsl', '.tese': 'glsl'
};
export const languageOf = filename => languages[extname(filename).toLowerCase()];
export const sourcePageId = filename => `source-${filename.replaceAll('\\', '/').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}`;

/** A lexical dependency index. No compiler/type-checker or macro expansion is run. */
export function sourceDependencies(source, language) {
  const dependencies = [];
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, match => '\n'.repeat(match.split('\n').length - 1)).replace(/"""[\s\S]*?"""|'''[\s\S]*?'''/g, match => '\n'.repeat(match.split('\n').length - 1));
  for (const match of clean.matchAll(/^\s*#\s*include\s*([<"])([^>"\n]+)[>"]/gm)) dependencies.push({ kind: 'include', name: match[2], local: match[1] === '"' });
  if (language === 'cpp') for (const match of clean.matchAll(/^\s*(export\s+)?(module|import)\s+([\w.:]+)\s*;/gm)) dependencies.push({ kind: match[2] === 'module' ? 'module' : 'import', name: match[3], exported: !!match[1] });
  if (['javascript', 'typescript'].includes(language)) {
    for (const match of clean.matchAll(/\b(?:import|export)\s+(?:[^;\n]*?\s+from\s*)?['"]([^'"]+)['"]|\brequire\(\s*['"]([^'"]+)['"]\s*\)/g)) dependencies.push({ kind: 'import', name: match[1] || match[2], local: (match[1] || match[2]).startsWith('.') });
  }
  if (language === 'python') for (const match of clean.matchAll(/^\s*(?:from\s+([.\w]+)\s+import\s+[^\n]+|import\s+([.\w]+))/gm)) dependencies.push({ kind: 'import', name: match[1] || match[2], local: true });
  if (language === 'csharp') for (const match of clean.matchAll(/^\s*(?:global\s+)?using\s+(?:static\s+)?([\w.]+)\s*;/gm)) dependencies.push({ kind: 'using', name: match[1], local: true });
  if (language === 'java') for (const match of clean.matchAll(/^\s*import\s+(?:static\s+)?([\w.*]+)\s*;/gm)) dependencies.push({ kind: 'import', name: match[1], local: true });
  return dependencies;
}

export function buildApiFilePages(records, { base, includeDirs = [], locales }) {
  const files = new Map(records.map(record => [resolve(record.file), record]));
  const modules = new Map();
  for (const record of records) {
    record.language = languageOf(record.file);
    record.relative = relative(base, record.file).replaceAll('\\', '/');
    record.id = sourcePageId(record.relative);
    record.dependencies = sourceDependencies(record.source, record.language);
    for (const dependency of record.dependencies) if (dependency.kind === 'module') modules.set(dependency.name, record);
    const namespace = record.source.match(/^\s*(?:namespace|package)\s+([\w.]+)/m)?.[1];
    if (namespace) modules.set(namespace, record);
  }
  const find = (record, dependency) => {
    if (modules.has(dependency.name)) return modules.get(dependency.name);
    let names = [dependency.name];
    if (record.language === 'python') names.push(dependency.name.replace(/^\./, '').replaceAll('.', '/') + '.py');
    if (record.language === 'java') names.push(dependency.name.replaceAll('.', '/') + '.java');
    const roots = [dirname(record.file), ...includeDirs.map(directory => resolve(base, directory)), base];
    for (const name of names) for (const root of roots) {
      const candidate = resolve(root, name);
      for (const suffix of ['', '.ts', '.js', '.py', '/index.ts', '/index.js']) if (files.has(candidate + suffix)) return files.get(candidate + suffix);
      if (candidate.endsWith('.js') && files.has(candidate.slice(0, -3) + '.ts')) return files.get(candidate.slice(0, -3) + '.ts');
    }
    return undefined;
  };
  const pages = [];
  for (const record of records) {
    for (const page of record.pages) page.sourcePageId = record.id;
    for (const locale of locales) {
      const fr = locale.code.startsWith('fr'), t = (a, b) => fr ? a : b;
      const symbols = record.pages.filter(page => page.locale === locale.code);
      const rows = record.dependencies.map(dependency => {
        const target = find(record, dependency);
        const label = target ? `[\`${dependency.name}\`](doc:${target.id})` : `\`${dependency.name}\``;
        return `| ${dependency.kind}${dependency.exported ? ' export' : ''} | ${label} | ${target ? t('Fichier local', 'Local file') : t('Externe ou non résolu', 'External or unresolved')} |`;
      });
      const markdown = `${t('Référence API de', 'API reference for')} \`${record.relative}\`.\n\n## ${t('Symboles documentés', 'Documented symbols')} {#symbols}\n\n${symbols.length ? symbols.map(page => `- [${page.symbol || page.title}](doc:${page.id})`).join('\n') : t('Aucun symbole annoté dans ce fichier.', 'No annotated symbols in this file.')}\n\n## ${t('Includes, imports et modules', 'Includes, imports and modules')} {#dependencies}\n\n${rows.length ? `| ${t('Type', 'Kind')} | ${t('Dépendance', 'Dependency')} | ${t('Résolution', 'Resolution')} |\n| --- | --- | --- |\n${rows.join('\n')}` : t('Aucune dépendance reconnue.', 'No recognized dependencies.')}\n`;
      pages.push({ id: record.id, locale: locale.code, title: record.relative.split('/').pop(), description: `${record.language} · ${record.relative}`, section: t('API / Includes et modules', 'API / Includes and modules'), kind: 'api', languages: [record.language], order: 300 + pages.length, markdown, source: `${record.relative}:1` });
    }
  }
  return pages;
}
