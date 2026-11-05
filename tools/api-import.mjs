import { readFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { sourcePageId } from './source-index.mjs';

const slug = text => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const plain = value => String(value || '').replaceAll('|', '\\|').replace(/\r?\n/g, ' ');
const decode = text => text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) => entity[0] === '#' ? String.fromCodePoint(entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1))) : ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[entity.toLowerCase()]);

/** Non-validating XML tree reader: no DTDs, external entities, or network resources. */
export function xmlTree(source) {
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('API XML must not contain a DTD or entities');
  const root = { tag: 'root', attrs: {}, children: [] }, stack = [root];
  for (const token of source.match(/<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]*>|[^<]+/g) || []) {
    const parent = stack.at(-1);
    if (token.startsWith('<!--') || token.startsWith('<?')) continue;
    if (token.startsWith('<![CDATA[')) { parent.children.push(token.slice(9, -3)); continue; }
    if (token.startsWith('</')) { if (stack.length < 2 || stack.pop().tag !== token.slice(2, -1).trim()) throw new Error('Malformed API XML'); continue; }
    if (token.startsWith('<')) {
      const tag = token.match(/^<([\w:.-]+)/)?.[1]; if (!tag) throw new Error('Malformed API XML');
      const attrs = Object.fromEntries([...token.matchAll(/([\w:.-]+)\s*=\s*(["'])([\s\S]*?)\2/g)].map(match => [match[1], decode(match[3])]));
      const child = { tag, attrs, children: [] }; parent.children.push(child);
      if (!token.endsWith('/>')) stack.push(child);
    } else parent.children.push(decode(token));
  }
  if (stack.length !== 1) throw new Error('Unclosed API XML');
  return root;
}
const children = (node, tag) => node.children.filter(child => typeof child !== 'string' && (!tag || child.tag === tag));
const first = (node, tag) => children(node, tag)[0];
const all = (node, tag) => children(node).flatMap(child => [...(child.tag === tag ? [child] : []), ...all(child, tag)]);
const text = node => !node ? '' : typeof node === 'string' ? node : node.children.map(text).join('').trim();

export async function doxygenSymbols(path) {
  const filenames = (await readdir(path)).filter(name => name.endsWith('.xml') && name !== 'index.xml').sort();
  const result = [];
  for (const filename of filenames) {
    const tree = xmlTree(await readFile(join(path, filename), 'utf8'));
    for (const compound of all(tree, 'compounddef')) {
      const name = text(first(compound, 'compoundname'));
      const prose = node => !node ? '' : typeof node==='string' ? node : ['parameterlist','simplesect'].includes(node.tag) ? '' : node.children.map(prose).join(node.tag==='para'?' ':'').trim();
      const doc = node => [prose(first(node, 'briefdescription')), prose(first(node, 'detaileddescription'))].filter(Boolean).join('\n\n');
      const location = node => { const value = first(node, 'location')?.attrs; return value?.file ? { file: value.file, line: Number(value.line) || 1 } : undefined; };
      result.push({ key: compound.attrs.id, name, kind: compound.attrs.kind, language: 'cpp', signature: `${compound.attrs.kind} ${name}`, description: doc(compound), bases: children(compound, 'basecompoundref').map(base => ({ key: base.attrs.refid, name: text(base) })), source: location(compound) });
      for (const member of all(compound, 'memberdef')) {
        const qualified = text(first(member, 'qualifiedname')) || `${name}::${text(first(member, 'name'))}`;
        const returnType = text(first(member, 'type'));
        const descriptions = new Map(all(member, 'parameteritem').flatMap(item => all(item, 'parametername').map(param => [text(param), text(first(item, 'parameterdescription'))])));
        result.push({ key: member.attrs.id, name: qualified, kind: member.attrs.kind, language: 'cpp', signature: `${text(first(member, 'definition')) || `${returnType} ${qualified}`}${text(first(member, 'argsstring'))}`, description: doc(member), returnType, returns: all(member, 'simplesect').filter(section => section.attrs.kind === 'return').map(text).join(' '), parameters: children(member, 'param').map(param => ({ name: text(first(param, 'declname')), type: text(first(param, 'type')), default: text(first(param, 'defval')), description: descriptions.get(text(first(param, 'declname'))) || '' })), references: all(member, 'references').map(ref => ({ key: ref.attrs.refid, name: text(ref) })), source: location(member) });
      }
    }
  }
  return result;
}

export function typedocSymbols(project) {
  const result = [];
  const type = value => {
    if (!value) return 'void';
    if (value.type === 'array') return `${type(value.elementType)}[]`;
    if (value.type === 'union' || value.type === 'intersection') return value.types.map(type).join(value.type === 'union' ? ' | ' : ' & ');
    if (value.type === 'literal') return JSON.stringify(value.value);
    if (value.type === 'tuple') return `[${value.elements.map(type).join(', ')}]`;
    if (value.type === 'reflection') return '{ … }';
    return (value.name || value.type || 'unknown') + (value.typeArguments?.length ? `<${value.typeArguments.map(type).join(', ')}>` : '');
  };
  const comment = value => (value?.summary || []).map(part => part.text || '').join('');
  const references = value => {
    if(!value || typeof value!=='object')return [];
    const own=value.type==='reference' && value.target!==undefined ? [{key:String(value.target),name:type(value)}] : value.kind==='inline-tag' && value.tag==='@link' && value.target!==undefined ? [{key:String(value.target),name:value.text||String(value.target)}] : [];
    return [...own,...Object.values(value).flatMap(child=>Array.isArray(child)?child.flatMap(references):references(child))];
  };
  function visit(node, parent = '') {
    const name = parent ? `${parent}.${node.name}` : node.name;
    if (node !== project && node.name) {
      const signatures = node.signatures?.length ? node.signatures : [node];
      signatures.forEach(signature => {
        const parameters = (signature.parameters || []).map(param => ({ name: param.name, type: type(param.type), default: param.defaultValue, description: comment(param.comment), optional: param.flags?.isOptional }));
        const source = signature.sources?.[0] || node.sources?.[0];
        const returns = signature.comment?.blockTags?.find(tag => tag.tag === '@returns');
        result.push({ key: String(signature.id ?? node.id), name, kind: node.signatures ? 'function' : node.kind === 128 ? 'class' : node.kind === 256 ? 'interface' : 'type', language: 'typescript', signature: node.signatures ? `${name}(${parameters.map(param => `${param.name}${param.optional ? '?' : ''}: ${param.type}${param.default ? ` = ${param.default}` : ''}`).join(', ')}): ${type(signature.type)}` : `${node.kind === 128 ? 'class' : 'type'} ${name}${node.type ? ` = ${type(node.type)}` : ''}`, description: comment(signature.comment || node.comment), parameters, returnType: node.signatures ? type(signature.type) : undefined, returns: returns?.content?.map(part => part.text || '').join(''), bases: (node.extendedTypes || []).map(base => ({ key: String(base.target ?? ''), name: type(base) })), references:references({type:signature.type,parameters:signature.parameters,comment:signature.comment}), source: source ? { file: source.fileName, line: source.line } : undefined });
      });
      // TypeDoc references target declarations, whereas overloads have their own ids.
      if (node.signatures?.length) result.at(-node.signatures.length).declarationKey = String(node.id);
    }
    for (const child of node.children || []) visit(child, node === project ? '' : name);
  }
  visit(project);
  return result;
}

export async function importApi(config, { base, locales, sourceFiles = new Set() }) {
  const pages = [];
  for (const adapter of config || []) {
    const path = resolve(base, adapter.path);
    const symbols = adapter.format === 'doxygen' ? await doxygenSymbols(path) : adapter.format === 'typedoc' ? typedocSymbols(JSON.parse(await readFile(path, 'utf8'))) : adapter.format === 'cydoc' ? JSON.parse(await readFile(path, 'utf8')).symbols : undefined;
    if (!Array.isArray(symbols)) throw new Error(`Unknown API adapter: ${adapter.format}`);
    const prefix = adapter.prefix || `import-${adapter.format}`;
    const ids = new Map();
    for (const symbol of symbols) { symbol.pageId = `${prefix}-${slug(symbol.name)}-${slug(symbol.key)}`; ids.set(String(symbol.key), symbol.pageId); if (symbol.declarationKey) ids.set(symbol.declarationKey, symbol.pageId); }
    const ref = value => ids.has(String(value.key)) ? `[${plain(value.name)}](doc:${ids.get(String(value.key))})` : `\`${plain(value.name)}\``;
    for (const symbol of symbols) for (const locale of adapter.locale ? locales.filter(item => item.code === adapter.locale) : locales) {
      const fr = locale.code.startsWith('fr'), t = (a, b) => fr ? a : b;
      const file = symbol.source?.file?.replaceAll('\\', '/');
      const linkedSource = file && sourceFiles.has(file) ? sourcePageId(file) : undefined;
      const parameters = symbol.parameters || [];
      const markdown = `${symbol.description || ''}\n\n## Signature {#signature}\n\n\`\`\`${symbol.language || 'text'}\n${symbol.signature || symbol.name}\n\`\`\`\n\n${parameters.length ? `## ${t('Paramètres', 'Parameters')} {#parameters}\n\n| ${t('Nom', 'Name')} | Type | ${t('Valeur par défaut', 'Default')} | Description |\n| --- | --- | --- | --- |\n${parameters.map(param => `| \`${plain(param.name)}${param.optional ? '?' : ''}\` | \`${plain(param.type)}\` | ${plain(param.default)} | ${plain(param.description)} |`).join('\n')}\n\n` : ''}${symbol.returnType ? `## ${t('Retour', 'Returns')} {#returns}\n\n\`${symbol.returnType}\` — ${symbol.returns || ''}\n\n` : ''}${symbol.bases?.length ? `## ${t('Héritage', 'Inheritance')} {#inheritance}\n\n${symbol.bases.map(ref).join(', ')}\n\n` : ''}${symbol.references?.length ? `## ${t('Références', 'References')} {#references}\n\n${symbol.references.map(ref).join(', ')}\n\n` : ''}${file ? `## Source {#source}\n\n${linkedSource ? `[\`${file}:${symbol.source.line || 1}\`](doc:${linkedSource}#L${symbol.source.line || 1})` : `\`${file}:${symbol.source.line || 1}\``}` : ''}`;
      pages.push({ id: symbol.pageId, locale: locale.code, title: symbol.name, description: `${adapter.format} · ${symbol.kind || 'symbol'}`, section: t('API importée', 'Imported API'), order: 250, symbol: symbol.name, source: file ? `${file}:${symbol.source.line || 1}` : undefined, sourcePageId: linkedSource, kind: 'api', markdown });
    }
  }
  return pages;
}
