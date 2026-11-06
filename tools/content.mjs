/** Build-time rich blocks. All prose goes back through the sanitized Markdown compiler. */
export function richBlock(kind, text, { id, render, code, escape, link, locale }) {
  if (!['tabs', 'steps', 'callout', 'details', 'glossary', 'diff'].includes(kind)) return undefined;
  const data = JSON.parse(text);
  const fr = locale.startsWith('fr');
  if (kind === 'tabs') {
    if (!Array.isArray(data.items) || !data.items.length || data.items.length > 20) throw new Error('Tabs require 1–20 items');
    return `<section class="content-tabs" data-tabs><div role="tablist" aria-label="${escape(data.title || (fr ? 'Exemples' : 'Examples'))}">${data.items.map((item, i) => `<button type="button" role="tab" data-tooltip-title="${escape(item.label)}" data-tooltip-description="${escape(item.description || '')}" id="${id}-tab-${i}" aria-controls="${id}-panel-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${escape(item.label)}</button>`).join('')}</div>${data.items.map((item, i) => `<div role="tabpanel" id="${id}-panel-${i}" aria-labelledby="${id}-tab-${i}" ${i ? 'hidden' : ''}>${item.code !== undefined ? code(String(item.code), item.lang || 'text') : render(String(item.body || ''))}</div>`).join('')}</section>`;
  }
  if (kind === 'steps') {
    if (!Array.isArray(data.items) || data.items.length > 50) throw new Error('Invalid steps');
    return `<ol class="content-steps">${data.items.map(item => `<li><strong>${escape(item.title)}</strong>${render(String(item.body || ''))}</li>`).join('')}</ol>`;
  }
  if (kind === 'callout') {
    const type = ['note', 'tip', 'warning', 'danger'].includes(data.type) ? data.type : 'note';
    return `<aside class="content-callout ${type}" role="note"><strong>${escape(data.title || type)}</strong>${render(String(data.body || ''))}</aside>`;
  }
  if (kind === 'details') return `<details class="content-details" ${data.open ? 'open' : ''}><summary>${escape(data.title || (fr ? 'En savoir plus' : 'Learn more'))}</summary><div>${render(String(data.body || ''))}</div></details>`;
  if (kind === 'glossary') {
    if (!Array.isArray(data.items) || data.items.length > 500) throw new Error('Invalid glossary');
    return `<dl class="content-glossary">${data.items.map(item => `<dt>${escape(item.term)}</dt><dd>${render(String(item.definition || ''))}${item.link ? `<a href="${escape(link(item.link))}">${fr ? 'Documentation' : 'Documentation'} →</a>` : ''}</dd>`).join('')}</dl>`;
  }
  const before = String(data.before || '').split('\n'), after = String(data.after || '').split('\n');
  if (before.length * after.length > 1_000_000) throw new Error('Code diff is too large');
  const matrix = Array.from({ length: before.length + 1 }, () => new Uint32Array(after.length + 1));
  for (let i = before.length - 1; i >= 0; i--) for (let j = after.length - 1; j >= 0; j--) matrix[i][j] = before[i] === after[j] ? matrix[i + 1][j + 1] + 1 : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
  let i = 0, j = 0; const rows = [];
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) { rows.push(`<span class="diff-context"><b aria-hidden="true"> </b>${escape(before[i++])}</span>`); j++; }
    else if (j < after.length && (i === before.length || matrix[i][j + 1] >= matrix[i + 1][j])) rows.push(`<ins><b aria-hidden="true">+</b>${escape(after[j++])}</ins>`);
    else rows.push(`<del><b aria-hidden="true">−</b>${escape(before[i++])}</del>`);
  }
  return `<figure class="content-diff"><figcaption>${escape(data.title || (fr ? 'Comparaison de code' : 'Code comparison'))} <small>${escape(data.lang || '')}</small></figcaption><pre aria-label="${fr ? 'Ajouts et suppressions' : 'Additions and deletions'}"><code>${rows.join('')}</code></pre></figure>`;
}

/** Split highlighted spans into independent valid lines, preserving multiline token styles. */
export function highlightedLines(html) {
  const lines = ['']; const open = [];
  for (const part of html.split(/(<span\b[^>]*>|<\/span>|\n)/g)) {
    if (part === '\n') { lines[lines.length - 1] += '</span>'.repeat(open.length); lines.push(open.join('')); }
    else { lines[lines.length - 1] += part; if (part.startsWith('<span')) open.push(part); else if (part === '</span>') open.pop(); }
  }
  return lines;
}
