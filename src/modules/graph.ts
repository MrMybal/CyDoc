import type { MediaModule } from '../types.js';
import { addStyles, commonStyles, escape, clamp, expandButton, watchExpansion, bindMediaState } from './shared.js';

interface Port { id: string; label: string; type?: string; value?: string }
interface Node { id: string; title: string; x: number; y: number; type?: string; description?: string; inputs?: Port[]; outputs?: Port[]; href?: string }
interface Edge { from: [string, string]; to: [string, string]; type?: string }
const colors: Record<string, string> = { exec: '#e5e9f0', bool: '#de557c', boolean: '#de557c', float: '#6fcf91', number: '#6fcf91', int: '#60bfcc', string: '#dd7ad4', object: '#72a8ee', data: '#d0b563' };
const NS = 'http://www.w3.org/2000/svg';
const graphModule: MediaModule = {
  mount(host, config, context) {
    const { locale, signal } = context;
    const fr = locale.startsWith('fr'); const t = (a: string, b: string) => fr ? a : b;
    const nodes = (Array.isArray(config.nodes) ? config.nodes : []) as Node[];
    const links = (Array.isArray(config.links) ? config.links : []) as Edge[];
    if (!nodes.length || nodes.length > 1000) throw new Error('Graph requires 1–1000 nodes');
    const index = new Map(nodes.map(node => [node.id, node]));
    if (index.size !== nodes.length || nodes.some(node => !Number.isFinite(node.x) || !Number.isFinite(node.y))) throw new Error('Invalid graph nodes');
    const port = (node: Node, id: string, output: boolean) => {
      const list = output ? node.outputs || [] : node.inputs || [];
      const i = list.findIndex(port => port.id === id); if (i < 0) throw new Error(`Unknown graph port: ${node.id}/${id}`);
      return { x: node.x + (output ? 216 : 12), y: node.y + 60 + i * 28, type: list[i]!.type || 'data' };
    };
    for (const link of links) { const a = index.get(link.from[0]), b = index.get(link.to[0]); if (!a || !b) throw new Error('Unknown graph link node'); port(a, link.from[1], true); port(b, link.to[1], false); }
    addStyles('cydoc-graph-style', commonStyles + `.cy-graph .media-stage{height:470px;background-color:#141923;background-image:radial-gradient(#54607955 1px,transparent 1px);background-size:18px 18px;touch-action:none;cursor:grab}.cy-graph .graph-world{position:absolute;left:0;top:0;transform-origin:0 0}.cy-graph .graph-wires{position:absolute;inset:0;overflow:visible;pointer-events:none}.cy-graph .graph-node{position:absolute;width:228px;border:1px solid #546176;border-radius:8px;overflow:hidden;color:#e9edf5;background:#242b37;box-shadow:0 5px 14px #0005;font-size:11px;cursor:default}.cy-graph .graph-node[aria-pressed=true]{outline:2px solid #e5c46a;outline-offset:2px}.cy-graph .graph-node header{height:38px;padding:10px 12px;background:#355077;font-weight:600;font-size:12px}.cy-graph .graph-node.event header{background:#803f4c}.cy-graph .graph-node.branch header{background:#6c6244}.cy-graph .graph-node.variable header{background:#4b6a55}.cy-graph .graph-ports{display:grid;grid-template-columns:1fr 1fr;min-height:40px;padding:8px 0 10px}.cy-graph .graph-pin{height:28px;display:flex;align-items:center;gap:6px;padding:0 8px;white-space:nowrap;font-size:10px}.cy-graph .graph-pin.out{justify-content:flex-end}.cy-graph .graph-pin i{display:block;border:2px solid var(--pin);width:9px;height:9px;border-radius:50%;flex-shrink:0}.cy-graph .graph-pin.exec i{border-radius:1px;transform:rotate(45deg)}.cy-graph .graph-group{position:absolute;border:1px solid #8192a260;border-radius:12px;background:#5c6c8612;color:#a4b1c4;font:12px system-ui;padding:10px;pointer-events:none}.cy-graph .graph-details{padding:13px 15px;background:var(--bg,#fff);font-size:11px;min-height:55px;border-top:1px solid var(--line,#ddd)}.cy-graph .graph-details p{margin:4px 0;color:var(--muted,#677789)}.cy-graph .graph-details a{font-weight:600;color:var(--accent,#278169)}.cy-graph .graph-zoom{font-size:10px;min-width:35px;text-align:center}.cy-graph .graph-node:focus-visible{outline:2px solid #e5c46a}`);
    host.className = 'cy-media cy-graph';
    const groups = Array.isArray(config.groups) ? config.groups : [];
    host.innerHTML = `<div class="media-toolbar"><span class="media-title">${escape(config.title || t('Graphe de nœuds', 'Node graph'))}</span><button type="button" data-graph="out" aria-label="${t('Dézoomer le graphe', 'Zoom graph out')}">−</button><output class="graph-zoom">100%</output><button type="button" data-graph="in" aria-label="${t('Zoomer le graphe', 'Zoom graph in')}">+</button><button type="button" data-graph="fit">${t('Tout cadrer', 'Fit graph')}</button>${expandButton(locale)}</div><div class="media-stage" tabindex="0" aria-label="${t('Graphe interactif : glisser pour déplacer, molette pour zoomer', 'Interactive graph: drag to pan, scroll to zoom')}"><div class="graph-world"><svg class="graph-wires" width="1" height="1" aria-hidden="true"></svg>${groups.map(group => `<div class="graph-group" style="left:${Number(group.x) || 0}px;top:${Number(group.y) || 0}px;width:${clamp(Number(group.width) || 400, 50, 10000)}px;height:${clamp(Number(group.height) || 250, 50, 10000)}px">${escape(group.title)}</div>`).join('')}${nodes.map(node => `<div class="graph-node ${['event', 'branch', 'variable'].includes(node.type || '') ? node.type : 'function'}" data-node="${escape(node.id)}" style="left:${node.x}px;top:${node.y}px" role="button" tabindex="0" aria-pressed="false" aria-label="${escape(node.title)}"><header>${escape(node.title)}</header><div class="graph-ports"><div>${(node.inputs || []).map(pin => `<span class="graph-pin ${pin.type === 'exec' ? 'exec' : ''}" style="--pin:${colors[pin.type || 'data'] || colors.data}"><i></i>${escape(pin.label)}${pin.value ? ` <small>${escape(pin.value)}</small>` : ''}</span>`).join('')}</div><div>${(node.outputs || []).map(pin => `<span class="graph-pin out ${pin.type === 'exec' ? 'exec' : ''}" style="--pin:${colors[pin.type || 'data'] || colors.data}">${escape(pin.label)}<i></i></span>`).join('')}</div></div></div>`).join('')}</div></div><div class="graph-details" aria-live="polite">${t('Sélectionnez un nœud pour voir son rôle et sa documentation.', 'Select a node to inspect its purpose and documentation.')}</div><div class="media-caption"><span>${t('Glisser : déplacement · Molette : zoom · Double-clic sur le fond : cadrage', 'Drag: pan · Scroll: zoom · Double-click background: fit')}</span><span>${nodes.length} ${t('nœuds', 'nodes')} · ${links.length} ${t('liens', 'links')}</span></div>`;
    watchExpansion(host, signal);
    const stage = host.querySelector<HTMLElement>('.media-stage')!, world = host.querySelector<HTMLElement>('.graph-world')!;
    const svg = host.querySelector('svg.graph-wires')!;
    for (const link of links) {
      const from = port(index.get(link.from[0])!, link.from[1], true), to = port(index.get(link.to[0])!, link.to[1], false);
      const curve = Math.max(65, Math.abs(to.x - from.x) * 0.5);
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', `M${from.x},${from.y} C${from.x + curve},${from.y} ${to.x - curve},${to.y} ${to.x},${to.y}`);
      path.setAttribute('fill', 'none'); path.setAttribute('stroke', colors[link.type || from.type] || colors.data!); path.setAttribute('stroke-width', from.type === 'exec' ? '3' : '2'); svg.append(path);
    }
    let scale = 1, x = 0, y = 0, selectedNode = '', restored = false;
    const draw = () => { world.style.transform = `translate(${x}px,${y}px) scale(${scale})`; host.querySelector('output')!.textContent = `${Math.round(scale * 100)}%`; };
    const zoom = (next: number, cx = stage.clientWidth / 2, cy = stage.clientHeight / 2) => { next = clamp(next, 0.15, 3); const ratio = next / scale; x = cx - (cx - x) * ratio; y = cy - (cy - y) * ratio; scale = next; draw(); };
    function fit() {
      const left = Math.min(...nodes.map(node => node.x)) - 35, top = Math.min(...nodes.map(node => node.y)) - 35;
      const right = Math.max(...nodes.map(node => node.x + 228)) + 35, bottom = Math.max(...nodes.map(node => node.y + 70 + Math.max(node.inputs?.length || 0, node.outputs?.length || 0) * 28)) + 35;
      scale = clamp(Math.min((stage.clientWidth || 600) / (right - left), (stage.clientHeight || 470) / (bottom - top), 1.25), 0.15, 3);
      x = ((stage.clientWidth || 600) - (right - left) * scale) / 2 - left * scale; y = ((stage.clientHeight || 470) - (bottom - top) * scale) / 2 - top * scale; draw();
    }
    function select(id: string) {
      const node = index.get(id)!; selectedNode = id;
      host.querySelectorAll<HTMLElement>('[data-node]').forEach(element => element.setAttribute('aria-pressed', String(element.dataset.node === id)));
      const safeLink = node.href && /^(#\/|(?:\.\.?\/|file:|https?:))/.test(node.href) ? node.href : '';
      host.querySelector('.graph-details')!.innerHTML = `<strong>${escape(node.title)}</strong><p>${escape(node.description || node.type || '')}</p>${safeLink ? `<a href="${escape(safeLink)}">${t('Ouvrir la documentation de ce nœud', 'Open this node’s documentation')} →</a>` : ''}`;
    }
    host.addEventListener('click', event => {
      const target = event.target as HTMLElement; const node = target.closest<HTMLElement>('[data-node]'); if (node) select(node.dataset.node!);
      const button = target.closest<HTMLButtonElement>('button'); if (!button) return;
      if (button.dataset.graph === 'fit') fit(); if (button.dataset.graph === 'in') zoom(scale * 1.2); if (button.dataset.graph === 'out') zoom(scale / 1.2);
    }, { signal });
    stage.addEventListener('keydown', event => { const node = (event.target as HTMLElement).closest<HTMLElement>('[data-node]'); if (node && ['Enter', ' '].includes(event.key)) { event.preventDefault(); select(node.dataset.node!); } else if (event.key === 'Home') { event.preventDefault(); fit(); } }, { signal });
    stage.addEventListener('wheel', event => { event.preventDefault(); const bounds = stage.getBoundingClientRect(); zoom(scale * Math.exp(-event.deltaY * 0.0015), event.clientX - bounds.left, event.clientY - bounds.top); }, { passive: false, signal });
    let pointer: { id: number; x: number; y: number } | undefined;
    stage.addEventListener('pointerdown', event => { if ((event.target as HTMLElement).closest('[data-node]')) return; pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; stage.setPointerCapture?.(event.pointerId); }, { signal });
    stage.addEventListener('pointermove', event => { if (pointer?.id !== event.pointerId) return; x += event.clientX - pointer.x; y += event.clientY - pointer.y; pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; draw(); }, { signal });
    for (const type of ['pointerup', 'pointercancel']) stage.addEventListener(type, () => { pointer = undefined; }, { signal });
    stage.addEventListener('dblclick', event => { if (!(event.target as HTMLElement).closest('[data-node]')) fit(); }, { signal });
    const resize = new ResizeObserver(() => restored ? draw() : fit()); resize.observe(stage); fit();
    bindMediaState(host, context, state => {
      restored=true;
      if(state.zoom !== undefined) scale=clamp(Number(state.zoom)||1,.15,3);
      if(state.x !== undefined) x=clamp(Number(state.x)||0,-100000,100000);
      if(state.y !== undefined) y=clamp(Number(state.y)||0,-100000,100000);
      if(state.node && index.has(state.node)) { select(state.node); if(state.x===undefined){const node=index.get(state.node)!;x=(stage.clientWidth||600)/2-(node.x+114)*scale;y=(stage.clientHeight||470)/2-(node.y+60)*scale;} }
      draw();
    }, () => ({zoom:String(scale),x:String(x),y:String(y),...(selectedNode?{node:selectedNode}:{})}));
    return () => resize.disconnect();
  }
};
export default graphModule;
