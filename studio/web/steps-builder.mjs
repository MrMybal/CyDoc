const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
const labels = {
  en: {step:'Step',title:'Step title',action:'Action',result:'Expected result (optional)',troubleshooting:'If this step fails (optional)',more:'Result and troubleshooting',add:'Add a step',remove:'Remove',up:'Move up',down:'Move down',advanced:'Advanced JSON',hint:'Describe one action per step. Use the manual preview after insertion to check Markdown formatting.',incomplete:'Give each step a title and an action before inserting.',invalid:'Use valid JSON with 1–50 steps and text fields. Correct the configuration in Advanced JSON.',titleHint:'For example: Open the settings',actionHint:'Explain what to do.',resultHint:'Describe what the reader should see.',troubleshootingHint:'Give a check or a link to the relevant help.'},
  fr: {step:'Étape',title:'Titre de l’étape',action:'Action',result:'Résultat attendu (facultatif)',troubleshooting:'Si cette étape échoue (facultatif)',more:'Résultat et dépannage',add:'Ajouter une étape',remove:'Supprimer',up:'Monter',down:'Descendre',advanced:'JSON avancé',hint:'Décrivez une action par étape. Après insertion, utilisez l’aperçu du manuel pour vérifier la mise en forme Markdown.',incomplete:'Donnez un titre et une action à chaque étape avant l’insertion.',invalid:'Utilisez un JSON valide avec 1 à 50 étapes et des champs texte. Corrigez la configuration dans JSON avancé.',titleHint:'Par exemple : Ouvrir les paramètres',actionHint:'Expliquez quoi faire.',resultHint:'Décrivez ce que le lecteur doit voir.',troubleshootingHint:'Proposez une vérification ou un lien vers l’aide utile.'}
};
export const stepsBuilderLabels = locale => labels[locale.startsWith('fr') ? 'fr' : 'en'];
export const stepsTemplate = () => ({items:[{title:'',body:'',result:'',troubleshooting:''}]});

/** Edit the existing steps JSON without replacing authored IDs or extension properties. */
export function mountStepsBuilder(host, textarea, {locale='en',onValidity=()=>{}}={}) {
  const t=stepsBuilderLabels(locale), abort=new AbortController(), {signal}=abort;
  let value, valid=false;
  host.classList.add('steps-builder');
  host.innerHTML=`<p class="muted">${t.hint}</p><fieldset class="steps-fields"><legend class="sr-only">${t.step}</legend><div data-step-list></div><button type="button" data-step-add>${t.add}</button></fieldset><p class="error" role="status" aria-live="polite" data-step-error></p>`;
  const fields=host.querySelector('fieldset'),list=host.querySelector('[data-step-list]'),error=host.querySelector('[data-step-error]');
  const complete=()=>value.items.length>0&&value.items.every(item=>typeof item.title==='string'&&item.title.trim()&&typeof item.body==='string'&&item.body.trim());
  function update(write=false) {
    valid=!!complete();onValidity(valid);
    error.className='muted';error.textContent=valid?'':t.incomplete;
    if(write)textarea.value=JSON.stringify(value,null,2);
  }
  const field=(key,label,item,placeholder,rows)=>`<label>${label}${rows?`<textarea data-step-field="${key}" rows="${rows}" placeholder="${placeholder}" ${key==='body'?'required':''}>${escape(item[key]||'')}</textarea>`:`<input data-step-field="${key}" value="${escape(item[key]||'')}" placeholder="${placeholder}" required>`}</label>`;
  function draw(focusIndex) {
    list.innerHTML=value.items.map((item,i)=>`<section class="step-editor" data-step-index="${i}" aria-label="${t.step} ${i+1}"><div class="step-editor-header"><h3>${t.step} ${i+1}</h3><div class="row"><button type="button" data-step-move="-1" aria-label="${t.up} · ${t.step} ${i+1}" ${i?'':'disabled'}>↑</button><button type="button" data-step-move="1" aria-label="${t.down} · ${t.step} ${i+1}" ${i<value.items.length-1?'':'disabled'}>↓</button><button type="button" data-step-remove aria-label="${t.remove} · ${t.step} ${i+1}" ${value.items.length===1?'disabled':''}>×</button></div></div>${field('title',t.title,item,t.titleHint)}${field('body',t.action,item,t.actionHint,3)}<details ${item.result||item.troubleshooting?'open':''}><summary>${t.more}</summary><div class="stack">${field('result',t.result,item,t.resultHint,2)}${field('troubleshooting',t.troubleshooting,item,t.troubleshootingHint,2)}</div></details></section>`).join('');
    host.querySelector('[data-step-add]').disabled=value.items.length>=50;
    if(focusIndex!==undefined)list.querySelector(`[data-step-index="${focusIndex}"] input`)?.focus();
  }
  function readJSON() {
    try {
      const candidate=JSON.parse(textarea.value);
      if(!candidate||!Array.isArray(candidate.items)||candidate.items.length>50||candidate.items.some(item=>!item||typeof item!=='object'||Array.isArray(item)||['title','body','result','troubleshooting'].some(key=>item[key]!==undefined&&typeof item[key]!=='string')))throw new Error('Invalid steps');
      value=candidate;fields.disabled=false;draw();update();
    } catch {fields.disabled=true;valid=false;onValidity(false);error.className='error';error.textContent=t.invalid;}
  }
  list.addEventListener('input',event=>{
    const target=event.target,key=target.dataset.stepField;
    if(!key)return;
    value.items[Number(target.closest('[data-step-index]').dataset.stepIndex)][key]=target.value;
    update(true);
  },{signal});
  fields.addEventListener('click',event=>{
    const target=event.target.closest('button');if(!target||target.disabled)return;
    let index=Number(target.closest('[data-step-index]')?.dataset.stepIndex);
    if(target.hasAttribute('data-step-add')) {if(value.items.length>=50)return;value.items.push(stepsTemplate().items[0]);index=value.items.length-1;}
    else if(target.hasAttribute('data-step-remove')){if(value.items.length<=1)return;value.items.splice(index,1);index=Math.min(index,value.items.length-1);}
    else if(target.hasAttribute('data-step-move')){const next=index+Number(target.dataset.stepMove);if(next<0||next>=value.items.length)return;[value.items[index],value.items[next]]=[value.items[next],value.items[index]];index=next;}
    else return;
    draw(index);update(true);
  },{signal});
  textarea.addEventListener('input',readJSON,{signal});readJSON();
  return {get valid(){return valid;},destroy(){abort.abort();host.replaceChildren();}};
}
