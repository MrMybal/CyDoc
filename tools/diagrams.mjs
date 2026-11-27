const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const number = (value, fallback) => Number.isFinite(value) ? Math.max(-10000, Math.min(10000, value)) : fallback;

function wrapLabel(value, width) {
  const text=String(value ?? '');
  if(text.length>500)throw new Error('Diagram labels must be short (up to 500 characters)');
  const length=Math.max(8,Math.floor(width/7)), lines=[];
  for(const word of text.split(/\s+/).filter(Boolean)) {
    for(let offset=0;offset<word.length;offset+=length) {
      const part=word.slice(offset,offset+length);
      if(lines.length&&lines.at(-1).length+part.length+1<=length)lines[lines.length-1]+=` ${part}`;
      else lines.push(part);
    }
  }
  return lines.length?lines:[''];
}
const textLines = (lines,x,y,attributes='') => `<text text-anchor="middle" ${attributes}>${lines.map((line,i)=>`<tspan x="${x}" y="${y+i*16}">${escape(line)}</tspan>`).join('')}</text>`;

/** Shared by the renderer and Studio's automatic placement. */
export function diagramNodeGeometry(node,type='flow') {
  const w=Math.max(100,number(node.width,type==='class'?240:210));
  const lines=wrapLabel(node.label,node.kind==='decision'?w*.6:w-28);
  const header=Math.max(44,lines.length*16+20);
  const h=type==='class'?header+4+(node.fields?.length||0)*23+(node.methods?.length||0)*23:node.kind==='decision'?Math.max(92,(lines.length*16+16)/.4):Math.max(62,lines.length*16+28);
  return {w,h,header,lines};
}

export function renderDiagram(config, key = 'diagram', locale = 'en') {
  key = String(key).replace(/[^a-zA-Z0-9_-]/g, '-');
  const fr = locale.startsWith('fr'), title = config.title || (fr ? 'Schéma' : 'Diagram'), marker = `arrow-${key}`;
  const defs = `<defs><marker id="${marker}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" style="fill:var(--accent,#278169);stroke:none"/></marker></defs>`;
  let width, height, content;
  if (config.type === 'sequence') {
    const actors = config.actors || [], messages = config.messages || [];
    if (!actors.length || actors.length > 8 || messages.length > 40) throw new Error('Sequence diagram: 1–8 actors, up to 40 messages');
    const actorLines=actors.map(actor=>wrapLabel(actor.label,120)), actorHeight=Math.max(40,...actorLines.map(lines=>lines.length*16+18));
    width = Math.max(400, actors.length * 170); height = 70 + actorHeight + messages.length * 52;
    const x = id => { const i = actors.findIndex(actor => actor.id === id); if (i < 0) throw new Error(`Unknown sequence actor: ${id}`); return 85 + i * 170; };
    content = actors.map((actor,i) => `<rect x="${x(actor.id) - 70}" y="10" width="140" height="${actorHeight}" rx="7"/>${textLines(actorLines[i],x(actor.id),10+actorHeight/2-(actorLines[i].length-1)*8+4)}<path d="M${x(actor.id)} ${actorHeight+15}V${height - 15}" stroke-dasharray="4 5" opacity=".5"/>`).join('');
    content += messages.map((message, i) => { const y = actorHeight+50+i*52; return `<path d="M${x(message.from)} ${y}H${x(message.to)}" marker-end="url(#${marker})"${message.reply ? ' stroke-dasharray="5 4"' : ''}/><text x="${(x(message.from) + x(message.to)) / 2}" y="${y - 9}" text-anchor="middle">${escape(message.label)}</text>`; }).join('');
  } else {
    const nodes = config.nodes || [], edges = config.edges || [];
    if (!nodes.length || nodes.length > 50 || edges.length > 100) throw new Error('Diagram: 1–50 nodes, up to 100 edges');
    const data = nodes.map((node, i) => ({ ...node, x: number(node.x, 20 + (i % 2) * 280), y: number(node.y, 20 + Math.floor(i / 2) * 135), ...diagramNodeGeometry(node,config.type) }));
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
      shape += textLines(node.lines,node.x+node.w/2,node.y+(config.type==='class'?node.header:node.h)/2-(node.lines.length-1)*8+4,'font-weight="600"');
      if (config.type === 'class') { shape += `<path d="M${node.x} ${node.y + node.header}h${node.w}"/>`; [...(node.fields || []), ...(node.methods || [])].forEach((line, i) => { shape += `<text x="${node.x + 12}" y="${node.y + node.header+20+i*23}" style="font-size:11px;font-family:monospace">${escape(line)}</text>`; }); }
      return node.href ? `<a href="${escape(node.href)}">${shape}</a>` : shape;
    }).join('');
  }
  const entries = config.type === 'sequence' ? (config.messages || []).map(message => {
    const actor = id => config.actors.find(item => item.id === id)?.label || id;
    return `${actor(message.from)} → ${actor(message.to)}${message.reply ? (fr ? ' (réponse)' : ' (reply)') : ''}: ${message.label || ''}`;
  }) : (config.edges || []).map(edge => {
    const node = id => config.nodes.find(item => item.id === id)?.label || id;
    return `${node(edge.from)} → ${node(edge.to)}${edge.label ? `: ${edge.label}` : ''}`;
  });
  const nodes = config.type === 'sequence' ? config.actors : config.nodes;
  const nodeText = nodes.map(node => [node.label, ...(node.fields || []), ...(node.methods || [])].join(' — '));
  const descriptionId = `diagram-description-${key}`;
  const description = `<details class="diagram-description" id="${descriptionId}"><summary>${fr ? 'Lire l’explication du schéma' : 'Read the diagram explanation'}</summary>${config.description ? `<p>${escape(config.description)}</p>` : ''}<p>${fr ? 'Éléments' : 'Elements'}: ${nodeText.map(escape).join(' · ')}</p>${entries.length ? `<ol>${entries.map(entry => `<li>${escape(entry)}</li>`).join('')}</ol>` : ''}</details>`;
  return `<figure class="diagram"><svg role="img" aria-label="${escape(title)}" aria-describedby="${descriptionId}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${defs}${content}</svg><figcaption>${escape(title)}</figcaption>${description}</figure>`;
}
