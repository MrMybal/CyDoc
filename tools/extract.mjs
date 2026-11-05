/**
 * Explicit documentation annotations, independent of the host language.
 * A block comment contains @doc, @locale, @title, then Markdown.
 * This adapter does not pretend to parse the host language or infer signatures.
 */
export function extractComments(source, filename = 'source') {
  const pages = [];
  const comments = source.matchAll(/\/\*\*?([\s\S]*?)\*\/|"""([\s\S]*?)"""|'''([\s\S]*?)'''/g);
  for (const comment of comments) {
    const raw = comment[1] ?? comment[2] ?? comment[3];
    const lines = raw.split(/\r?\n/).map(line => line.replace(/^\s*\* ?/, ''));
    const indent = Math.min(...lines.filter(line => line.trim()).map(line => line.match(/^\s*/)[0].length));
    const body = lines.map(line => line.slice(Number.isFinite(indent) ? indent : 0)).join('\n').trim();
    if (!/^@doc\s+/m.test(body)) continue;
    const tag = name => body.match(new RegExp(`^@${name}\\s+(.+)$`, 'm'))?.[1]?.trim();
    const id = tag('doc');
    const locale = tag('locale');
    const title = tag('title');
    if (!id || !locale || !title) throw new Error(`${filename}: @doc requires @locale and @title`);
    const markdown = body.replace(/^@(doc|locale|title|section|order|symbol)\s+.+\n?/gm, '').trim();
    const line = source.slice(0, comment.index).split('\n').length;
    pages.push({ id, locale, title, section: tag('section') || 'API', order: Number(tag('order') || 100), description: markdown.split('\n')[0] || title, markdown, source: `${filename}:${line}`, symbol: tag('symbol') });
  }
  return pages;
}
