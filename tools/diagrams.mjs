const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const number = (value, fallback) => Number.isFinite(value) ? Math.max(-10000, Math.min(10000, value)) : fallback;

export function renderDiagram(config, key = 'diagram') {
  const title = config.title || 'Diagram', marker = `arrow-${key}`;
  const defs = `<defs><marker id="${marker}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" style="fill:var(--accent,#278169);stroke:none"/></marker></defs>`;
  let width, height, content;
  if (config.type === 'sequence') {
    const actors = config.actors || [], messages = config.messages || [];
    if (!actors.length || actors.length > 8 || messages.length > 40) throw new Error('Sequence diagram: 1–8 actors, up to 40 messages');
    width = Math.max(400, actors.length * 170); height = 110 + messages.length * 52;
    const x = id => { const i = actors.findIndex(actor => actor.id === id); if (i < 0) throw new Error(`Unknown sequence actor: ${id}`); return 85 + i * 170; };
    content = actors.map(actor => `<rect x="${x(actor.id) - 70}" y="10" width="140" height="40" rx="7"/><text x="${x(actor.id)}" y="35" text-anchor="middle">${escape(actor.label)}</text><path d="M${x(actor.id)} 55V${height - 15}" stroke-dasharray="4 5" opacity=".5"/>`).join('');
    content += messages.map((message, i) => { const y = 90 + i * 52; return `<path d="M${x(message.from)} ${y}H${x(message.to)}" marker-end="url(#${marker})"${message.reply ? ' stroke-dasharray="5 4"' : ''}/><text x="${(x(message.from) + x(message.to)) / 2}" y="${y - 9}" text-anchor="middle">${escape(message.label)}</text>`; }).join('');
  } else {
    const nodes = config.nodes || [], edges = config.edges || [];
    if (!nodes.length || nodes.length > 50 || edges.length > 100) throw new Error('Diagram: 1–50 nodes, up to 100 edges');
    const data = nodes.map((node, i) => ({ ...node, x: number(node.x, 20 + (i % 2) * 280), y: number(node.y, 20 + Math.floor(i / 2) * 135), w: number(node.width, config.type === 'class' ? 240 : 210), h: config.type === 'class' ? 48 + (node.fields?.length || 0) * 23 + (node.methods?.length || 0) * 23 : 62 }));
    const index = new Map(data.map(node => [node.id, node])); if (index.size !== data.length) throw new Error('Duplicate diagram node');
    width = Math.max(300, ...data.map(node => node.x + node.w + 20)); height = Math.max(100, ...data.map(node => node.y + node.h + 20));
    content = edges.map(edge => {
      const from = index.get(edge.from), to = index.get(edge.to); if (!from || !to) throw new Error('Unknown diagram edge');
      const horizontal = Math.abs(to.x - from.x) > Math.abs(to.y - from.y);
      const x1 = horizontal ? from.x + (to.x > from.x ? from.w : 0) : from.x + from.w / 2, y1 = horizontal ? from.y + from.h / 2 : from.y + (to.y > from.y ? from.h : 0);
      const x2 = horizontal ? to.x + (to.x > from.x ? 0 : to.w) : to.x + to.w / 2, y2 = horizontal ? to.y + to.h / 2 : to.y + (to.y > from.y ? 0 : to.h);
      return `<path d="M${x1} ${y1}L${x2} ${y2}" marker-end="url(#${marker})"${edge.dashed ? ' stroke-dasharray="5 4"' : ''}/>${edge.label ? `<text x="${(x1 + x2) / 2 + 7}" y="${(y1 + y2) / 2 - 9}">${escape(edge.label)}</text>` : ''}`;
    }).join('');
    content += data.map(node => {
      let shape = node.kind === 'decision' ? `<polygon points="${node.x + node.w / 2},${node.y} ${node.x + node.w},${node.y + node.h / 2} ${node.x + node.w / 2},${node.y + node.h} ${node.x},${node.y + node.h / 2}" style="fill:var(--accent-bg,#e8f4ef);stroke:var(--accent,#278169)"/>` : `<rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="${config.type === 'class' ? 3 : 8}"/>`;
      shape += `<text x="${node.x + node.w / 2}" y="${node.y + 36}" text-anchor="middle" font-weight="600">${escape(node.label)}</text>`;
      if (config.type === 'class') { shape += `<path d="M${node.x} ${node.y + 44}h${node.w}"/>`; [...(node.fields || []), ...(node.methods || [])].forEach((line, i) => { shape += `<text x="${node.x + 12}" y="${node.y + 64 + i * 23}" style="font-size:11px;font-family:monospace">${escape(line)}</text>`; }); }
      return node.href ? `<a href="${escape(node.href)}">${shape}</a>` : shape;
    }).join('');
  }
  return `<figure class="diagram"><svg role="img" aria-label="${escape(title)}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${defs}${content}</svg><figcaption>${escape(title)}</figcaption></figure>`;
}
