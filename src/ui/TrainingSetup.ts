import type {RunCatalog} from '../run/runState.mjs';
import type {TrainingHero,TrainingOpponent} from '../run/trainingRun';
import {rankLabel} from '../run/unitForms.mjs';
import {skillIconUrl} from './skillIcons';

export interface TrainingSelection{
  party:TrainingHero[];arena:string;opponent:TrainingOpponent;unlimitedMp:boolean;fullLimit:boolean;
}
const STORAGE='ffrogue.training-setup';
const esc=(s:unknown)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const MAX_TRAINING_SKILLS=3;
/** Party slots: the run party size (four heroes, loop v2). */
export const TRAINING_SLOTS=4;

export function loadTrainingSelection():Partial<TrainingSelection>{
  try{return JSON.parse(localStorage.getItem(STORAGE)??'{}');}catch{return {};}
}
function saveTrainingSelection(selection:TrainingSelection){
  try{localStorage.setItem(STORAGE,JSON.stringify(selection));}catch{/* private mode: setup is simply not remembered */}
}

/**
 * Training grounds: pick up to three heroes, each with a form and up to three skills, an arena and
 * an opponent. Nothing here touches the saved run.
 */
export function renderTrainingSetup(root:HTMLElement,catalog:RunCatalog,arenas:{key:string;label:string}[],
  opponents:{key:TrainingOpponent;label:string}[],start:(selection:TrainingSelection)=>void,back:()=>void):void{
  const saved=loadTrainingSelection();
  // Four party slots, each a hero dropdown with that hero's form and skills below (2026-11-11 playtest:
  // the full hero grid was too large).
  const keys=Object.keys(catalog).sort((a,b)=>catalog[a].name.localeCompare(catalog[b].name)||(catalog[a].variantLabel??'').localeCompare(catalog[b].variantLabel??''));
  const initial=(saved.party??[]).filter(h=>catalog[h.key]).slice(0,TRAINING_SLOTS);
  if(!initial.length)keys.slice(0,TRAINING_SLOTS).forEach(key=>initial.push({key,form:key,skills:[]}));
  const details=(key:string,prior?:TrainingHero)=>{
    const c=catalog[key];
    const forms=[{form:key,label:rankLabel(c)},...(c.forms??[]).map(f=>({form:f.form,label:rankLabel(f)}))];
    const picked=new Set(prior?.skills?.length?prior.skills:c.skills.slice(0,MAX_TRAINING_SKILLS).map(s=>s.id));
    return `<div class="training-head"><img class="portrait" src="${esc(c.portrait)}" alt=""><small>${esc(c.variantLabel??'')}</small>
      <label class="training-form">Form <select data-form>${forms.map(f=>`<option value="${esc(f.form)}" ${prior?.form===f.form?'selected':''}>${esc(f.label)}</option>`).join('')}</select></label></div>
      <fieldset class="training-skills"><legend>Skills (up to ${MAX_TRAINING_SKILLS})</legend>
       ${c.skills.map(s=>{const icon=skillIconUrl(s);return `<label><input type="checkbox" data-skill="${esc(s.id)}" ${picked.has(s.id)?'checked':''}>${icon?`<img class="skill-icon" src="${esc(icon)}" alt="">`:''}${esc(s.name)}</label>`;}).join('')}
       ${c.limitBurst?`<p class="training-lb">Limit Burst: <b>${esc(c.limitBurst.name)}</b></p>`:''}
      </fieldset>`;
  };
  const slot=(i:number)=>{const prior=initial[i];
    return `<article class="rpg-panel training-slot" data-slot="${i}"><label class="training-pick">Hero ${i+1}
      <select data-hero-select><option value="">— empty —</option>${keys.map(k=>`<option value="${esc(k)}" ${prior?.key===k?'selected':''}>${esc(catalog[k].name)}${catalog[k].variantLabel?' · '+esc(catalog[k].variantLabel):''}</option>`).join('')}</select></label>
      <div class="training-body">${prior?details(prior.key,prior):''}</div></article>`;};
  root.innerHTML=`<div class="eyebrow">TRAINING GROUNDS</div><h1>TRAINING</h1>
   <p class="lead">Try any hero, form and skill. Nothing here touches your saved journey.</p>
   <p class="training-count" aria-live="polite"></p>
   <div class="training-grid">${Array.from({length:TRAINING_SLOTS},(_,i)=>slot(i)).join('')}</div>
   <div class="rpg-panel training-options">
    <label>Arena <select data-arena>${arenas.map(a=>`<option value="${esc(a.key)}" ${saved.arena===a.key?'selected':''}>${esc(a.label)}</option>`).join('')}</select></label>
    <label>Opponent <select data-opponent>${opponents.map(o=>`<option value="${esc(o.key)}" ${saved.opponent===o.key?'selected':''}>${esc(o.label)}</option>`).join('')}</select></label>
    <label><input type="checkbox" data-unlimited ${saved.unlimitedMp??true?'checked':''}> Unlimited MP</label>
    <label><input type="checkbox" data-limit ${saved.fullLimit??true?'checked':''}> Start with a full Limit gauge</label>
   </div>
   <div class="actions"><button class="rpg-button" data-action="training-start">Start training</button><button class="rpg-button secondary" data-action="training-back">Back to title</button></div>`;
  const slots=()=>Array.from(root.querySelectorAll<HTMLElement>('.training-slot'));
  const heroOf=(slot:HTMLElement)=>slot.querySelector<HTMLSelectElement>('[data-hero-select]')!.value;
  const update=(event?:Event)=>{
    const changed=(event?.target as HTMLElement|undefined)?.closest?.('[data-hero-select]');
    if(changed){const s=changed.closest<HTMLElement>('.training-slot')!,key=heroOf(s);s.querySelector('.training-body')!.innerHTML=key?details(key):'';}
    const taken=slots().map(heroOf);
    for(const s of slots()){
      // A hero fills one slot only.
      s.querySelectorAll<HTMLOptionElement>('[data-hero-select] option').forEach(o=>{o.disabled=!!o.value&&o.value!==heroOf(s)&&taken.includes(o.value);});
      const skills=Array.from(s.querySelectorAll<HTMLInputElement>('[data-skill]')),count=skills.filter(x=>x.checked).length;
      skills.forEach(x=>{x.disabled=!x.checked&&count>=MAX_TRAINING_SKILLS;});
      s.classList.toggle('is-chosen',!!heroOf(s));
    }
    const picked=slots().filter(heroOf);
    const ready=picked.length>=1&&picked.every(h=>Array.from(h.querySelectorAll<HTMLInputElement>('[data-skill]')).some(x=>x.checked));
    root.querySelector('.training-count')!.textContent=`${picked.length} / ${TRAINING_SLOTS} heroes chosen`+(ready?'':' · every chosen hero needs at least one skill');
    root.querySelector<HTMLButtonElement>('[data-action=training-start]')!.disabled=!ready;
  };
  root.addEventListener('change',update);
  update();
  root.querySelector<HTMLButtonElement>('[data-action=training-back]')!.onclick=back;
  root.querySelector<HTMLButtonElement>('[data-action=training-start]')!.onclick=()=>{
    const selection:TrainingSelection={
      party:slots().filter(heroOf).map(h=>({key:heroOf(h),
        form:h.querySelector<HTMLSelectElement>('[data-form]')!.value,
        skills:Array.from(h.querySelectorAll<HTMLInputElement>('[data-skill]')).filter(x=>x.checked).map(x=>x.dataset.skill!)})),
      arena:root.querySelector<HTMLSelectElement>('[data-arena]')!.value,
      opponent:root.querySelector<HTMLSelectElement>('[data-opponent]')!.value as TrainingOpponent,
      unlimitedMp:root.querySelector<HTMLInputElement>('[data-unlimited]')!.checked,
      fullLimit:root.querySelector<HTMLInputElement>('[data-limit]')!.checked,
    };
    saveTrainingSelection(selection);
    start(selection);
  };
}
