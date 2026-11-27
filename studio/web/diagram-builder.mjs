import { renderDiagram, diagramNodeGeometry } from '../../tools/diagrams.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]);
const labels = {
  en: {model:'Diagram model',flow:'Flow',decision:'Decision',sequence:'Sequence',title:'Diagram title',description:'What should the reader understand?',elements:'Elements',actors:'Participants',relations:'Connections',messages:'Messages',addElement:'Add an element',addActor:'Add a participant',addRelation:'Add a connection',addMessage:'Add a message',remove:'Remove',from:'From',to:'To',label:'Label',reply:'Reply',arrange:'Arrange automatically',preview:'Preview',invalid:'The diagram is incomplete or invalid. Check its elements and connections.',advanced:'Advanced JSON',unsupported:'This model can be edited in advanced JSON.',newElement:'New element',newActor:'New participant',newMessage:'Message',defaultTitle:'My diagram',start:'Start',write:'Write a page',done:'Read the manual',check:'Is the page ready?',yes:'Publish',no:'Complete the page',yesLabel:'Yes',noLabel:'No',app:'Application',reader:'Reader',open:'Open help',result:'Show the page'},
  fr: {model:'Modèle de schéma',flow:'Flux',decision:'Décision',sequence:'Séquence',title:'Titre du schéma',description:'Que doit comprendre le lecteur ?',elements:'Éléments',actors:'Participants',relations:'Connexions',messages:'Messages',addElement:'Ajouter un élément',addActor:'Ajouter un participant',addRelation:'Ajouter une connexion',addMessage:'Ajouter un message',remove:'Supprimer',from:'De',to:'Vers',label:'Libellé',reply:'Réponse',arrange:'Placer automatiquement',preview:'Aperçu',invalid:'Le schéma est incomplet ou invalide. Vérifiez ses éléments et ses connexions.',advanced:'JSON avancé',unsupported:'Ce modèle se modifie dans le JSON avancé.',newElement:'Nouvel élément',newActor:'Nouveau participant',newMessage:'Message',defaultTitle:'Mon schéma',start:'Commencer',write:'Rédiger une page',done:'Lire le manuel',check:'La page est-elle prête ?',yes:'Publier',no:'Compléter la page',yesLabel:'Oui',noLabel:'Non',app:'Application',reader:'Lecteur',open:'Ouvrir l’aide',result:'Afficher la page'}
};
const language = locale => locale.startsWith('fr') ? 'fr' : 'en';

/** Position layers of a small directed diagram; retain IDs and all authored properties. */
export function arrangeDiagram(config) {
  if (config.type === 'sequence') return structuredClone(config);
  const nodes = config.nodes || [], edges = config.edges || [];
  const ranks = new Map(), remaining = new Set(nodes.map(node => node.id));
  for (let rank = 0; remaining.size && rank < nodes.length; rank++) {
    let layer = nodes.filter(node => remaining.has(node.id) && !edges.some(edge => edge.to === node.id && remaining.has(edge.from)));
    if (!layer.length) layer = [nodes.find(node => remaining.has(node.id))];
    for (const node of layer) ranks.set(node.id, rank);
    for (const node of layer) remaining.delete(node.id);
  }
  const layers = [...new Set(ranks.values())].map(rank => nodes.filter(node => ranks.get(node.id) === rank));
  const widest = Math.max(1, ...layers.map(layer => layer.length));
  const span=Math.max(210,...nodes.map(node=>diagramNodeGeometry(node,config.type).w))+50;
  let top=20;const positions=layers.map(layer=>{const y=top;top+=Math.max(...layer.map(node=>diagramNodeGeometry(node,config.type).h))+70;return y;});
  return {...config, nodes:nodes.map(node => { const rank=ranks.get(node.id), layer=layers[rank];return {...node,x:20+(widest-layer.length)*span/2+layer.indexOf(node)*span,y:positions[rank]}; })};
}

export function diagramPreset(kind = 'flow', locale = 'en') {
  const t=labels[language(locale)];
  if(kind==='sequence')return {type:'sequence',title:t.defaultTitle,description:'',actors:[{id:'app',label:t.app},{id:'reader',label:t.reader}],messages:[{from:'app',to:'reader',label:t.open},{from:'reader',to:'app',label:t.result,reply:true}]};
  if(kind==='decision')return arrangeDiagram({type:'decision',title:t.defaultTitle,description:'',nodes:[{id:'start',label:t.start},{id:'check',label:t.check,kind:'decision'},{id:'yes',label:t.yes},{id:'no',label:t.no}],edges:[{from:'start',to:'check'},{from:'check',to:'yes',label:t.yesLabel},{from:'check',to:'no',label:t.noLabel}]});
  return arrangeDiagram({type:'flow',title:t.defaultTitle,description:'',nodes:[{id:'start',label:t.start},{id:'write',label:t.write},{id:'done',label:t.done}],edges:[{from:'start',to:'write'},{from:'write',to:'done'}]});
}

/** Local preview shares the exported renderer. Links remain inert while authoring. */
export function diagramPreview(config, key, locale) {
  const safe={...config};
  if(Array.isArray(config.nodes))safe.nodes=config.nodes.map(({href,link,...node})=>node);
  return renderDiagram(safe,key,locale);
}

/** A form edits the same JSON inserted by Studio; it never saves or publishes a page. */
export function mountDiagramBuilder(host, textarea, {locale='en',contentLocale=locale,onValidity=()=>{}}={}) {
  const t=labels[language(locale)], contentLabels=labels[language(contentLocale)], abort=new AbortController(), {signal}=abort;
  let value, valid=false, serial=0;
  const drafts=new Map();
  host.classList.add('diagram-builder');
  host.innerHTML=`<div class="stack" data-diagram-fields></div><section class="diagram-builder-preview" aria-label="${t.preview}"><h3>${t.preview}</h3><div data-diagram-preview></div><p class="error" role="alert" data-diagram-error></p></section>`;
  const fields=host.querySelector('[data-diagram-fields]'), preview=host.querySelector('[data-diagram-preview]'), error=host.querySelector('[data-diagram-error]');
  const kind=()=>value.type==='sequence'?'sequence':value.type==='decision'||value.nodes?.some(node=>node.kind==='decision')?'decision':value.type==='flow'?'flow':'advanced';
  const nodes=()=>value.type==='sequence'?value.actors:value.nodes;
  const edges=()=>value.type==='sequence'?value.messages:value.edges;
  const field=(name,label,current,extra='')=>`<label>${label}<input data-field="${name}" value="${escape(current)}" maxlength="500" ${extra}></label>`;
  const options=current=>nodes().map(node=>`<option value="${escape(node.id)}" ${node.id===current?'selected':''}>${escape(node.label||node.id)}</option>`).join('');
  function showPreview(write=false) {
    try { preview.innerHTML=diagramPreview(value,'studio-diagram-preview',contentLocale);error.textContent='';valid=true; }
    catch { preview.replaceChildren();error.textContent=t.invalid;valid=false; }
    onValidity(valid);
    if(write)textarea.value=JSON.stringify(value,null,2);
  }
  function renderFields() {
    const model=kind();
    if(model==='advanced'){fields.innerHTML=`<p class="muted">${t.unsupported}</p>`;return;}
    fields.innerHTML=`<label>${t.model}<select data-model>${['flow','decision','sequence'].map(item=>`<option value="${item}" ${model===item?'selected':''}>${t[item]}</option>`).join('')}</select></label>${field('title',t.title,value.title||'')}<label>${t.description}<textarea data-field="description" rows="2" maxlength="4000">${escape(value.description||'')}</textarea></label><fieldset><legend>${model==='sequence'?t.actors:t.elements}</legend><div class="diagram-element-list">${nodes().map(node=>`<div class="diagram-element-row"><label>${t.label}<input data-node="${escape(node.id)}" value="${escape(node.label)}" maxlength="120"></label><button type="button" data-remove-node="${escape(node.id)}" aria-label="${t.remove} ${escape(node.label||node.id)}">×</button></div>`).join('')}</div><div class="row"><button type="button" data-add-node ${nodes().length>=(model==='sequence'?8:50)?'disabled':''}>${model==='sequence'?t.addActor:t.addElement}</button>${model==='sequence'?'':`<button type="button" data-arrange>${t.arrange}</button>`}</div></fieldset><fieldset><legend>${model==='sequence'?t.messages:t.relations}</legend><div class="diagram-edge-list">${edges().map((edge,i)=>`<div class="diagram-edge-row"><label>${t.from}<select data-edge="${i}" data-edge-field="from">${options(edge.from)}</select></label><label>${t.to}<select data-edge="${i}" data-edge-field="to">${options(edge.to)}</select></label><label class="diagram-edge-label">${t.label}<input data-edge="${i}" data-edge-field="label" value="${escape(edge.label||'')}" maxlength="160"></label><button type="button" data-remove-edge="${i}" aria-label="${t.remove} ${model==='sequence'?t.newMessage:t.relations} ${i+1}">×</button>${model==='sequence'?`<label class="check diagram-reply"><input type="checkbox" data-edge="${i}" data-edge-field="reply" ${edge.reply?'checked':''}>${t.reply}</label>`:''}</div>`).join('')}</div><button type="button" data-add-edge ${nodes().length<2||edges().length>=(model==='sequence'?40:100)?'disabled':''}>${model==='sequence'?t.addMessage:t.addRelation}</button></fieldset>`;
  }
  function readJSON() {
    try {
      const candidate=JSON.parse(textarea.value);
      diagramPreview(candidate,'studio-diagram-preview',contentLocale);
      value=candidate;
      if(value.type==='sequence')value.messages ||= [];else value.edges ||= [];
      renderFields();showPreview();
    } catch { error.textContent=t.invalid;preview.replaceChildren();valid=false;onValidity(false); }
  }
  fields.addEventListener('input',event=>{
    const target=event.target;
    if(target.dataset.field)value[target.dataset.field]=target.value;
    else if(target.dataset.node){const node=nodes().find(node=>node.id===target.dataset.node);node.label=target.value;for(const select of fields.querySelectorAll('[data-edge-field=from],[data-edge-field=to]'))for(const option of select.options)if(option.value===node.id)option.textContent=node.label||node.id;if(value.type!=='sequence')value=arrangeDiagram(value);}
    else if(target.dataset.edge!==undefined){const edge=edges()[Number(target.dataset.edge)];edge[target.dataset.edgeField]=target.type==='checkbox'?target.checked:target.value;}
    else return;
    showPreview(true);
  },{signal});
  fields.addEventListener('change',event=>{
    const target=event.target;
    if(!target.matches('[data-model]'))return;
    drafts.set(kind(),structuredClone(value));value=structuredClone(drafts.get(target.value)||diagramPreset(target.value,contentLocale));renderFields();showPreview(true);
  },{signal});
  fields.addEventListener('click',event=>{
    const target=event.target.closest('button');if(!target)return;
    if(target.hasAttribute('data-add-node')){let id;do{id=`element-${++serial}`;}while(nodes().some(node=>node.id===id));nodes().push({id,label:value.type==='sequence'?contentLabels.newActor:contentLabels.newElement,...(value.type==='sequence'?{}:{x:20,y:20})});value=arrangeDiagram(value);}
    else if(target.dataset.removeNode!==undefined){const id=target.dataset.removeNode;const key=value.type==='sequence'?'actors':'nodes',relations=value.type==='sequence'?'messages':'edges';value[key]=nodes().filter(node=>node.id!==id);value[relations]=edges().filter(edge=>edge.from!==id&&edge.to!==id);value=arrangeDiagram(value);}
    else if(target.hasAttribute('data-add-edge'))edges().push({from:nodes()[0].id,to:nodes().at(-1).id,label:value.type==='sequence'?contentLabels.newMessage:''});
    else if(target.dataset.removeEdge!==undefined)edges().splice(Number(target.dataset.removeEdge),1);
    else if(target.hasAttribute('data-arrange'))value=arrangeDiagram(value);else return;
    renderFields();showPreview(true);
  },{signal});
  textarea.addEventListener('input',readJSON,{signal});
  readJSON();
  return {get valid(){return valid;},destroy(){abort.abort();host.replaceChildren();}};
}

export const diagramBuilderLabels = locale => labels[language(locale)];
