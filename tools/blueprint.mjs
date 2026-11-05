export function validateGraph(config) {
  if (!Array.isArray(config.nodes) || !config.nodes.length || config.nodes.length > 1000) throw new Error('Graph requires 1–1000 nodes');
  const nodes = new Map();
  for (const node of config.nodes) {
    if (!node.id || nodes.has(node.id) || !Number.isFinite(node.x) || !Number.isFinite(node.y)) throw new Error('Invalid graph node');
    for (const direction of ['inputs', 'outputs']) {
      const pins = node[direction] || [];
      if (!Array.isArray(pins) || new Set(pins.map(pin => pin.id)).size !== pins.length || pins.some(pin => !pin.id)) throw new Error('Invalid graph pins');
    }
    nodes.set(node.id, node);
  }
  for (const edge of config.links || []) if (!nodes.get(edge.from?.[0])?.outputs?.some(pin => pin.id === edge.from[1]) || !nodes.get(edge.to?.[0])?.inputs?.some(pin => pin.id === edge.to[1])) throw new Error('Invalid graph edge');
  return config;
}
/** Parses the common text clipboard structure, not binary .uasset files. */
export function parseBlueprint(text) {
  const blocks = [];
  let depth = 0, block;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*Begin Object\b/.test(line)) {
      if (!depth) { const name = line.match(/\bName="([^"]+)"/)?.[1]; const type = line.match(/\bClass=([^\s]+)/)?.[1]?.replaceAll('"', '') || 'Node'; block = { id: name || `node-${blocks.length}`, type, lines: [] }; }
      depth++;
    }
    if (block) block.lines.push(line);
    if (/^\s*End Object\b/.test(line)) { depth--; if (depth === 0 && block) { blocks.push(block); block = undefined; } }
  }
  if (!blocks.length || depth) throw new Error('Invalid Unreal clipboard: expected complete Begin Object / End Object blocks');
  const nodes = [], groups = [], links = [];
  for (const block of blocks) {
    const source = block.lines.join('\n');
    const number = (key, fallback = 0) => Number(source.match(new RegExp(`^\\s*${key}=(-?[0-9.]+)`, 'm'))?.[1] ?? fallback);
    const textValue = key => source.match(new RegExp(`\\b${key}="((?:\\\\.|[^"\\\\])*)"`))?.[1]?.replace(/\\"/g, '"');
    if (block.type.includes('Comment')) { groups.push({ title: textValue('NodeComment') || 'Comment', x: number('NodePosX'), y: number('NodePosY'), width: number('NodeWidth', 400), height: number('NodeHeight', 220) }); continue; }
    const type = block.type.includes('Event') ? 'event' : block.type.includes('IfThenElse') ? 'branch' : block.type.includes('Variable') ? 'variable' : 'function';
    const node = { id: block.id, title: textValue('MemberName') || textValue('CustomFunctionName') || block.id.replace(/^K2Node_/, '').replace(/_\d+$/, ''), type, x: number('NodePosX'), y: number('NodePosY'), inputs: [], outputs: [], description: textValue('NodeComment') || block.type.split('.').pop() };
    for (const line of block.lines.filter(line => /CustomProperties Pin\s*\(/.test(line))) {
      const field = key => line.match(new RegExp(`(?:^|[, (])${key}="([^"\\n]*)"`))?.[1];
      const pin = { id: line.match(/\bPinId=([\w-]+)/)?.[1] || `pin-${node.inputs.length + node.outputs.length}`, label: field('PinName') || '', type: field('PinType\\.PinCategory') || 'data', value: field('DefaultValue') };
      const output = field('Direction') === 'EGPD_Output';
      (output ? node.outputs : node.inputs).push(pin);
      if (output) for (const match of (line.match(/\bLinkedTo=\(([^)]*)\)/)?.[1] || '').matchAll(/([\w]+)\s+([\w-]+)/g)) links.push({ from: [node.id, pin.id], to: [match[1], match[2]], type: pin.type });
    }
    nodes.push(node);
  }
  const ids = new Set(nodes.map(node => node.id));
  return { title: 'Unreal Blueprint', format: 'unreal-clipboard', nodes, groups, links: links.filter(link => ids.has(link.to[0])) };
}
