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
  const keys=Object.keys(catalog);
  const chosen=new Set((saved.party??[]).map(h=>h.key).filter(k=>catalog[k]));
  if(!chosen.size)keys.slice(0,3).forEach(k=>chosen.add(k));
  const card=(key:string)=>{
    const c=catalog[key],prior=saved.party?.find(h=>h.key===key);
    const forms=[{form:key,label:rankLabel(c)},...(c.forms??[]).map(f=>({form:f.form,label:rankLabel(f)}))];
    const picked=new Set(prior?.skills?.length?prior.skills:c.skills.slice(0,MAX_TRAINING_SKILLS).map(s=>s.id));
    return `<article class="rpg-panel training-hero ${chosen.has(key)?'is-chosen':''}" data-hero="${esc(key)}">
      <label class="training-pick"><input type="checkbox" data-pick ${chosen.has(key)?'checked':''}>
       <img class="portrait" src="${esc(c.portrait)}" alt=""><span><b>${esc(c.name)}</b><small>${esc(c.variantLabel??'')}</small></span></label>
      <label class="training-form">Form <select data-form>${forms.map(f=>`<option value="${esc(f.form)}" ${prior?.form===f.form?'selected':''}>${esc(f.label)}</option>`).join('')}</select></label>
      <fieldset class="training-skills"><legend>Skills (up to ${MAX_TRAINING_SKILLS})</legend>
       ${c.skills.map(s=>{const icon=skillIconUrl(s);return `<label><input type="checkbox" data-skill="${esc(s.id)}" ${picked.has(s.id)?'checked':''}>${icon?`<img class="skill-icon" src="${esc(icon)}" alt="">`:''}${esc(s.name)}</label>`;}).join('')}
       ${c.limitBurst?`<p class="training-lb">Limit Burst: <b>${esc(c.limitBurst.name)}</b></p>`:''}
      </fieldset></article>`;
  };
  root.innerHTML=`<div class="eyebrow">TRAINING GROUNDS</div><h1>TRAINING</h1>
   <p class="lead">Try any hero, form and skill. Nothing here touches your saved journey.</p>
   <p class="training-count" aria-live="polite"></p>
   <div class="training-grid">${keys.map(card).join('')}</div>
   <div class="rpg-panel training-options">
    <label>Arena <select data-arena>${arenas.map(a=>`<option value="${esc(a.key)}" ${saved.arena===a.key?'selected':''}>${esc(a.label)}</option>`).join('')}</select></label>
    <label>Opponent <select data-opponent>${opponents.map(o=>`<option value="${esc(o.key)}" ${saved.opponent===o.key?'selected':''}>${esc(o.label)}</option>`).join('')}</select></label>
    <label><input type="checkbox" data-unlimited ${saved.unlimitedMp??true?'checked':''}> Unlimited MP</label>
    <label><input type="checkbox" data-limit ${saved.fullLimit??true?'checked':''}> Start with a full Limit gauge</label>
   </div>
   <div class="actions"><button class="rpg-button" data-action="training-start">Start training</button><button class="rpg-button secondary" data-action="training-back">Back to title</button></div>`;
  const heroes=()=>Array.from(root.querySelectorAll<HTMLElement>('.training-hero'));
  const update=()=>{
    const picked=heroes().filter(h=>h.querySelector<HTMLInputElement>('[data-pick]')!.checked);
    for(const hero of heroes()){
      const on=picked.includes(hero),skills=Array.from(hero.querySelectorAll<HTMLInputElement>('[data-skill]'));
      hero.classList.toggle('is-chosen',on);
      hero.querySelector<HTMLInputElement>('[data-pick]')!.disabled=!on&&picked.length>=3;
      const count=skills.filter(s=>s.checked).length;
      skills.forEach(s=>{s.disabled=!s.checked&&count>=MAX_TRAINING_SKILLS;});
    }
    const ready=picked.length>=1&&picked.every(h=>Array.from(h.querySelectorAll<HTMLInputElement>('[data-skill]')).some(s=>s.checked));
    root.querySelector('.training-count')!.textContent=`${picked.length} / 3 heroes chosen`+(ready?'':' · every chosen hero needs at least one skill');
    root.querySelector<HTMLButtonElement>('[data-action=training-start]')!.disabled=!ready;
  };
  root.addEventListener('change',update);
  update();
  root.querySelector<HTMLButtonElement>('[data-action=training-back]')!.onclick=back;
  root.querySelector<HTMLButtonElement>('[data-action=training-start]')!.onclick=()=>{
    const selection:TrainingSelection={
      party:heroes().filter(h=>h.querySelector<HTMLInputElement>('[data-pick]')!.checked).map(h=>({key:h.dataset.hero!,
        form:h.querySelector<HTMLSelectElement>('[data-form]')!.value,
        skills:Array.from(h.querySelectorAll<HTMLInputElement>('[data-skill]')).filter(s=>s.checked).map(s=>s.dataset.skill!)})),
      arena:root.querySelector<HTMLSelectElement>('[data-arena]')!.value,
      opponent:root.querySelector<HTMLSelectElement>('[data-opponent]')!.value as TrainingOpponent,
      unlimitedMp:root.querySelector<HTMLInputElement>('[data-unlimited]')!.checked,
      fullLimit:root.querySelector<HTMLInputElement>('[data-limit]')!.checked,
    };
    saveTrainingSelection(selection);
    start(selection);
  };
}
