import { readFile } from 'node:fs/promises';
import { themes } from '../dist/themes.js';

/** Adapt the reader's actual palette definitions to Studio's layout tokens. */
export async function studioThemes() {
  const css = await readFile(new URL('../src/viewer.css', import.meta.url), 'utf8');
  return themes.map(theme => {
    const selector = theme.id === 'light' ? '\\.cydoc-viewer\\{' : `\\.cydoc-viewer\\[data-theme=${theme.id}\\]\\{`;
    const block = [...css.matchAll(new RegExp(selector + '([^}]+)\\}', 'g'))].map(match=>match[1]).find(value=>value.includes('--bg:'));
    if (!block) throw new Error(`Missing reader palette: ${theme.id}`);
    const colors = Object.fromEntries([...block.matchAll(/--([\w-]+):([^;]+);/g)].map(match => [match[1], match[2].trim()]));
    for (const token of ['bg','sidebar','surface','text','muted','faint','line','accent','accent-bg','card']) {
      if (!/^#[a-f0-9]{3}(?:[a-f0-9]{3})?$/i.test(colors[token] || '')) throw new Error(`Invalid ${theme.id} palette token: ${token}`);
    }
    return { ...theme, light: !block.includes('color-scheme:dark'), colors };
  });
}

export function studioThemeCss(catalog) {
  const mapping = { bg:'bg',panel:'sidebar',raised:'card',text:'text',muted:'muted',line:'line',accent:'accent','accent-soft':'accent-bg',shadow:'shadow' };
  return catalog.map(theme => `:root[data-theme=${theme.id}]{${Object.entries(mapping).map(([target,source])=>`--${target}:${theme.colors[source]};`).join('')}--danger:${theme.light?'#a72434':'#ffabb3'};color-scheme:${theme.light?'light':'dark'};}`).join('\n');
}
