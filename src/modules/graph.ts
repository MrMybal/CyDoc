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
    addStyles('cydoc-graph-reading-style',`.cy-graph .media-stage{touch-action:pan-y;cursor:default}.cy-graph.is-exploring .media-stage{touch-action:none;cursor:grab}.cy-graph .media-toolbar{flex-wrap:wrap}.cy-graph .media-toolbar .media-title{flex-basis:100%;max-width:100%;white-space:normal;overflow-wrap:anywhere;font-size:14px}.cy-graph .media-toolbar button{font-size:13px}.cy-graph .media-toolbar button{min-height:38px}.cy-graph .graph-node header{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cy-graph .graph-details{font-size:14px;line-height:1.6}.cy-graph .graph-text-view{padding:14px 16px;background:var(--bg,#fff);border-top:1px solid var(--line,#ddd);font-size:14px;line-height:1.7;text-align:left}.cy-graph .graph-text-view>summary{cursor:pointer;font-weight:600;padding:6px 0}.cy-graph .graph-text-view label{display:block;margin:14px 0 8px}.cy-graph .graph-text-view input{display:block;width:100%;font:inherit;padding:10px;border:1px solid var(--line,#ddd);border-radius:6px;background:var(--bg,#fff);color:var(--text,#222);margin-top:6px}.cy-graph .graph-text-view ul{list-style:none;margin:12px 0;padding:0}.cy-graph .graph-text-view li{padding:14px 0;border-top:1px solid var(--line,#ddd);overflow-wrap:anywhere}.cy-graph .graph-text-view p{margin:7px 0;color:var(--muted,#677789)}.cy-graph .graph-text-view button{margin-left:12px;padding:7px 10px;border:1px solid var(--line,#ddd);border-radius:5px;color:var(--accent,#278169);background:var(--bg,#fff);font:inherit}.cy-graph .graph-text-view a{color:var(--accent,#278169);text-decoration:underline}.cy-graph .graph-text-view .graph-connections li{border:0;padding:3px 0}.cy-graph .graph-text-view [role=status]{font-size:13px}.cy-graph .media-caption{font-size:12px;line-height:1.6;flex-wrap:wrap}.cy-graph :is(button,input,summary,.media-stage):focus-visible{outline:2px solid var(--accent,#278169);outline-offset:3px}@media(max-width:540px){.cy-graph .graph-text-view input{font-size:16px}.cy-graph .media-toolbar .media-title{flex-basis:100%;max-width:100%}}@media print{.cy-graph .graph-text-view>div{display:block!important}.cy-graph .graph-text-view button,.cy-graph .graph-text-view label,.cy-graph .graph-text-view [role=status]{display:none!important}}`);
    const stage = host.querySelector<HTMLElement>('.media-stage')!, world = host.querySelector<HTMLElement>('.graph-world')!;
    host.querySelectorAll<HTMLElement>('.graph-node').forEach((node,i)=>node.tabIndex=i?-1:0);
    const explore=document.createElement('button');explore.type='button';explore.dataset.graph='explore';host.querySelector('.media-toolbar')!.append(explore);
    let exploring=false;
    let pointer: { id: number; x: number; y: number } | undefined;
    function setExploring(value:boolean,focus=true){
      if(!value)pointer=undefined;
      exploring=value;host.classList.toggle('is-exploring',value);explore.setAttribute('aria-pressed',String(value));explore.textContent=value?t('Quitter l’exploration','Leave exploration'):t('Explorer le graphe','Explore graph');
      stage.setAttribute('aria-label',value?t('Graphe interactif : flèches pour déplacer, plus et moins pour zoomer, Début pour cadrer, Échap pour quitter','Interactive graph: arrows to pan, plus and minus to zoom, Home to fit, Escape to leave'):t('Graphe de nœuds. Activez Explorer le graphe pour déplacer et zoomer.','Node graph. Activate Explore graph to pan and zoom.'));
      host.querySelector('.media-caption>span')!.textContent=value?t('Glisser ou flèches : déplacement · Molette ou +/− : zoom · Début : cadrage · Échap : quitter','Drag or arrows: pan · Wheel or +/−: zoom · Home: fit · Escape: leave'):t('Défilement du manuel libre · Activez Explorer le graphe pour le manipuler, ou ouvrez la vue textuelle.','Scroll the manual freely · Activate Explore graph to interact, or open the text view.');
      if(focus)(value?stage:explore).focus({preventScroll:true});
    }
    setExploring(false,false);
    const safeLink=(node:Node)=>node.href&&/^(#\/|(?:\.\.?\/|file:|https?:))/.test(node.href)?node.href:'';
    const outgoing=new Map<string,Edge[]>(nodes.map(node=>[node.id,[]]));for(const link of links)outgoing.get(link.from[0])!.push(link);
    const pinLabel=(pin:Port|undefined)=>pin?.label||(pin?.type==='exec'?t('Exécution','Execution'):pin?.id||'');
    const textView=document.createElement('details');textView.className='graph-text-view';
    textView.innerHTML=`<summary>${t('Vue textuelle : nœuds et connexions','Text view: nodes and connections')}</summary><div><label>${t('Rechercher un nœud','Find a node')}<input type="search" autocomplete="off" data-graph-search></label><p role="status" aria-live="polite"></p><ul class="graph-node-list"></ul></div>`;
    host.querySelector('.media-caption')!.before(textView);
    const normalize=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase();
    function renderList(){
      const terms=normalize(textView.querySelector('input')!.value).trim().split(/\s+/).filter(Boolean);
      const found=nodes.filter(node=>{const content=normalize([node.title,node.description,...(node.inputs||[]).map(pinLabel),...(node.outputs||[]).map(pinLabel),...(outgoing.get(node.id)||[]).map(link=>index.get(link.to[0])!.title)].join(' '));return terms.every(term=>content.includes(term));});
      textView.querySelector('[role=status]')!.textContent=`${found.length} / ${nodes.length} ${t('nœuds','nodes')}`;
      textView.querySelector('.graph-node-list')!.innerHTML=found.map(node=>`<li><strong>${escape(node.title)}</strong><button type="button" data-locate-node="${escape(node.id)}" aria-label="${t('Afficher dans le graphe','Show in graph')} : ${escape(node.title)}">${t('Afficher','Show')}</button>${node.description?`<p>${escape(node.description)}</p>`:''}${['inputs','outputs'].map(key=>{const ports=node[key as 'inputs'|'outputs']||[];return ports.length?`<p>${key==='inputs'?t('Entrées','Inputs'):t('Sorties','Outputs')} : ${ports.map(pin=>escape(pinLabel(pin))+(pin.value?` = ${escape(pin.value)}`:'')).join(' · ')}</p>`:'';}).join('')}${outgoing.get(node.id)?.length?`<ul class="graph-connections">${outgoing.get(node.id)!.map(link=>{const target=index.get(link.to[0])!;return `<li>${escape(pinLabel(node.outputs?.find(pin=>pin.id===link.from[1])))} → ${escape(target.title)} · ${escape(pinLabel(target.inputs?.find(pin=>pin.id===link.to[1])))}</li>`;}).join('')}</ul>`:''}${safeLink(node)?`<a href="${escape(safeLink(node))}">${t('Documentation du nœud','Node documentation')} →</a>`:''}</li>`).join('');
    }
    textView.addEventListener('toggle',()=>{if(textView.open&&!textView.querySelector('.graph-node-list')!.children.length)renderList();},{signal});
    textView.querySelector('input')!.addEventListener('input',renderList,{signal});
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
    const zoom = (next: number, cx = stage.clientWidth / 2, cy = stage.clientHeight / 2) => { restored=true;next = clamp(next, 0.15, 3); const ratio = next / scale; x = cx - (cx - x) * ratio; y = cy - (cy - y) * ratio; scale = next; draw(); };
    function fit() {
      restored=false;
      const left = Math.min(...nodes.map(node => node.x)) - 35, top = Math.min(...nodes.map(node => node.y)) - 35;
      const right = Math.max(...nodes.map(node => node.x + 228)) + 35, bottom = Math.max(...nodes.map(node => node.y + 70 + Math.max(node.inputs?.length || 0, node.outputs?.length || 0) * 28)) + 35;
      scale = clamp(Math.min((stage.clientWidth || 600) / (right - left), (stage.clientHeight || 470) / (bottom - top), 1.25), 0.15, 3);
      x = ((stage.clientWidth || 600) - (right - left) * scale) / 2 - left * scale; y = ((stage.clientHeight || 470) - (bottom - top) * scale) / 2 - top * scale; draw();
    }
    function select(id: string) {
      const node = index.get(id)!; selectedNode = id;
      host.querySelectorAll<HTMLElement>('[data-node]').forEach(element => element.setAttribute('aria-pressed', String(element.dataset.node === id)));
      host.querySelectorAll<HTMLElement>('[data-node]').forEach(element=>element.tabIndex=element.dataset.node===id?0:-1);
      host.querySelector('.graph-details')!.innerHTML = `<strong>${escape(node.title)}</strong><p>${escape(node.description || node.type || '')}</p>${safeLink(node) ? `<a href="${escape(safeLink(node))}">${t('Ouvrir la documentation de ce nœud', 'Open this node’s documentation')} →</a>` : ''}`;
    }
    host.addEventListener('click', event => {
      const target = event.target as HTMLElement; const node = target.closest<HTMLElement>('[data-node]'); if (node) select(node.dataset.node!);
      const button = target.closest<HTMLButtonElement>('button'); if (!button) return;
      if (button.dataset.graph === 'fit') fit(); if (button.dataset.graph === 'in') zoom(scale * 1.2); if (button.dataset.graph === 'out') zoom(scale / 1.2);
      if(button.dataset.graph==='explore')setExploring(!exploring);
      if(button.dataset.locateNode){const node=index.get(button.dataset.locateNode);if(node){select(node.id);restored=true;scale=Math.max(scale,.65);x=(stage.clientWidth||600)/2-(node.x+114)*scale;y=(stage.clientHeight||470)/2-(node.y+60)*scale;draw();stage.scrollIntoView({block:'center'});[...world.querySelectorAll<HTMLElement>('[data-node]')].find(element=>element.dataset.node===node.id)?.focus({preventScroll:true});}}
    }, { signal });
    stage.addEventListener('keydown', event => {
      const node = (event.target as HTMLElement).closest<HTMLElement>('[data-node]');
      if(node&&['Enter',' '].includes(event.key)){event.preventDefault();select(node.dataset.node!);return;}
      if(!exploring||event.ctrlKey||event.metaKey||event.altKey)return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setExploring(false);return;}
      if(event.key==='Home'){event.preventDefault();fit();}
      else if(['+','=','-'].includes(event.key)){event.preventDefault();zoom(scale*(event.key==='-'?1/1.2:1.2));}
      else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();restored=true;const step=event.shiftKey?120:40;x+=event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0;y+=event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0;draw();}
    }, { signal });
    stage.addEventListener('wheel', event => { if(!exploring||event.ctrlKey||event.metaKey)return;event.preventDefault(); const bounds = stage.getBoundingClientRect(); zoom(scale * Math.exp(-event.deltaY * 0.0015), event.clientX - bounds.left, event.clientY - bounds.top); }, { passive: false, signal });
    stage.addEventListener('pointerdown', event => { if (!exploring||event.button!==0||(event.target as HTMLElement).closest('[data-node]')) return;restored=true; pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; stage.setPointerCapture?.(event.pointerId); }, { signal });
    stage.addEventListener('pointermove', event => { if (pointer?.id !== event.pointerId) return; x += event.clientX - pointer.x; y += event.clientY - pointer.y; pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; draw(); }, { signal });
    for (const type of ['pointerup', 'pointercancel','lostpointercapture']) stage.addEventListener(type, () => { pointer = undefined; }, { signal });
    stage.addEventListener('dblclick', event => { if (exploring&&!(event.target as HTMLElement).closest('[data-node]')) fit(); }, { signal });
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
