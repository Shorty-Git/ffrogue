import type {RunCatalog,RunMember,RunState,Reward,AwakeningNotice} from '../run/runState.mjs';
import {skillForRun,memberMaxMp,REVIVE_HP_SHARE} from '../run/runState.mjs';
import {gaugeRow} from './ffbeGauge';
import {skillIconUrl} from './skillIcons';
const skillIcon=(skill:Parameters<typeof skillIconUrl>[0])=>{const url=skillIconUrl(skill);return url?`<img class="skill-icon" src="${esc(url)}" alt="" draggable="false">`:'';};
import {skillDescription} from '../run/catalog';
import {rewardPopupLayout} from './rewardLayout.mjs';
import type {RewardStageBounds} from './rewardLayout.mjs';
import type {AnimationMeta,UnitManifest} from '../types/manifest';
import {bindSlotLever} from './SlotLever';
import {fateTier,fateTimeline,fateVerdict,tierRank,isShowTier,FATE_SOUND,type FateTier,type FateSound} from './fateEngine';
import {startCrystalSparks} from './CrystalSparks';
import {startTitleCrystal,titleCrystalMarkup} from './TitleCrystal';
import {formAt,formForLevel,rankLabel,levelLabel,MAX_LEVEL} from '../run/unitForms.mjs';
const esc=(s:unknown)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

function bodyPreview(root:string,clip:AnimationMeta,classes:string,style:string){
 const layers=CSS.supports('mix-blend-mode','plus-lighter')?clip.bodyLayers:undefined;
 const body=root+'/'+(layers?.normal??clip.file);
 const emission=layers?root+'/'+layers.emission:undefined;
 return {
  paths:emission?[body,emission]:[body],
  html:`<div class="${classes}${emission?' layered-body-preview':''}" style="${style};background-image:url('${esc(body)}')">${emission?`<span aria-hidden="true" class="body-emission" style="background-image:url('${esc(emission)}')"></span>`:''}</div>`,
 };
}
export class RunUI{
 readonly root:HTMLElement;
 onSound:(event:import('../audio/battleMusic').UiSound,rate?:number)=>void|(()=>void)=()=>{};
 /** Original one-shot samples (FFBE summon cues) for the Fate Engine. */
 onSample:(sound:FateSound,gain:number)=>void=()=>{};
 private slotAudioCleanup?:()=>void;
 private leverCleanup?:()=>void;
 private crystalCleanup?:()=>void;
 awakening(notice:AwakeningNotice,complete:()=>void):void {
  const character=this.catalog[notice.member];
  const fromLabel=rankLabel(formAt(character,notice.from.form)!);
  const toLabel=rankLabel(formAt(character,notice.to.form)!);
  const paths:string[]=[];
  const forms=[notice.from,notice.to].map(f=>this.manifests[f.form].animations.idle);
  const scale=Math.min(3,300/Math.max(...forms.map(a=>a.frameWidth)),210/Math.max(...forms.map(a=>a.frameHeight)));
  const body=(form:string,index:number)=>{
   const a=forms[index],root=`/assets/${form===notice.member?'units/'+notice.member:'forms/'+form}`;
   const preview=bodyPreview(root,a,'awakening-body',`width:${a.frameWidth*scale}px;height:${a.frameHeight*scale}px;left:calc(50% - ${a.pivotX*a.frameWidth*scale}px);bottom:${44-(1-a.pivotY)*a.frameHeight*scale}px;background-size:${a.frameWidth*a.frameCount*scale}px ${a.frameHeight*scale}px;background-position:${-a.frames[0].index*a.frameWidth*scale}px 0`);
   paths.push(...preview.paths);
   return `<div class="awakening-form ${index?'new':'old'}" data-form="${esc(form)}">${preview.html}</div>`;
  };
  this.show(`<div class="awakening-sequence rpg-panel"><div class="eyebrow">A NEW LIGHT AWAKENS</div><h1>${esc(this.catalog[notice.member].name)}</h1><div class="awakening-stage"><div class="awakening-halo"></div><div class="awakening-rings"></div>${Array.from({length:12},(_,i)=>`<i class="awakening-spark" style="--spark-angle:${i*30}deg;--spark-delay:${i%4*60}ms" aria-hidden="true">✦</i>`).join('')}${body(notice.from.form,0)}${body(notice.to.form,1)}</div><p class="awakening-stars" aria-label="${fromLabel} to ${toLabel}">${fromLabel} <span>→</span> <strong>${toLabel}</strong></p><p class="lead">${toLabel} original form unlocked</p></div><div class="actions">${this.button('awakening-skip','Skip animation',true)}</div>`,'awakening');
  this.root.classList.add('awakening-overlay');this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-label','Character awakening');
  let finished=false;const done=()=>{if(finished||this.root.dataset.phase!=='awakening')return;finished=true;complete();};
  this.on('awakening-skip',done);
  const sequence=this.root.querySelector<HTMLElement>('.awakening-sequence')!;
  sequence.addEventListener('animationend',event=>{if(event.target===sequence)done();});
  // Asset admission precedes presentation only; the upgrade is already saved.
  Promise.all(paths.map(async path=>{const image=new Image();image.src=path;await image.decode();})).then(()=>{
   if(!finished&&sequence.isConnected)this.root.classList.add('is-ready');
  }).catch(error=>{if(!finished&&sequence.isConnected)this.onError(error);});
 }
 onError:(error:unknown)=>void=error=>{throw error;};
 constructor(readonly catalog:RunCatalog,readonly manifests:Record<string,UnitManifest>){document.querySelector('#run-ui')?.remove();this.root=document.createElement('section');this.root.id='run-ui';document.body.append(this.root);this.root.addEventListener('keydown',event=>{if(event.key!=='Tab')return;this.root.addEventListener('focusin',()=>this.onSound('select'),{once:true,signal:AbortSignal.timeout(120)});});}
 show(html:string,phase:string){this.slotAudioCleanup?.();this.slotAudioCleanup=undefined;this.leverCleanup?.();this.leverCleanup=undefined;this.crystalCleanup?.();this.crystalCleanup=undefined;this.root.className='run-overlay';this.root.removeAttribute('style');this.root.removeAttribute('role');this.root.removeAttribute('aria-modal');this.root.removeAttribute('aria-label');this.root.dataset.phase=phase;this.root.innerHTML=`<main class="rpg-shell">${html}</main>`;this.root.querySelector<HTMLElement>('button')?.focus();}
 hide(){this.slotAudioCleanup?.();this.slotAudioCleanup=undefined;this.leverCleanup?.();this.leverCleanup=undefined;this.crystalCleanup?.();this.crystalCleanup=undefined;this.root.innerHTML='';this.root.className='';this.root.removeAttribute('style');this.root.removeAttribute('role');this.root.removeAttribute('aria-modal');this.root.removeAttribute('aria-label');this.root.dataset.phase='battle';}
 overBattle(bounds:RewardStageBounds){
  this.root.classList.add('victory-overlay');this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-label','Battle rewards');
  const shell=this.root.querySelector<HTMLElement>('.rpg-shell')!;
  this.root.style.setProperty('--reward-width',Math.min(840,window.innerWidth-24)+'px');
  const viewport={width:window.innerWidth,height:window.innerHeight};
  const layout=rewardPopupLayout({viewport,canvas:bounds,arena:bounds.arena,party:bounds.party,panel:{width:shell.offsetWidth,height:shell.offsetHeight}});
  for(const [key,value]of Object.entries({left:layout.left,top:layout.top,width:layout.width}))this.root.style.setProperty('--reward-'+key,value+'px');
  for(const [key,value]of Object.entries({left:bounds.left,top:bounds.top,width:bounds.width,height:bounds.height}))this.root.style.setProperty('--battle-'+key,value+'px');
 }

 on(action:string,callback:()=>void){if(action==='spin'){const lever=this.root.querySelector<HTMLButtonElement>('.slot-lever'),skip=this.root.querySelector<HTMLButtonElement>('[data-action=lever-skip]');if(lever&&skip){this.leverCleanup=bindSlotLever(lever,skip,()=>{try{callback();}catch(error){this.onError(error);}},()=>this.root.querySelector<HTMLButtonElement>('[data-action=skip]')?.click(),()=>this.onSound('leverMove'));return;}}this.root.querySelectorAll<HTMLButtonElement>(`[data-action="${action}"]`).forEach(b=>b.onclick=()=>{try{
   if(action!=='music'&&action!=='skip')this.onSound(action.startsWith('reward-')&&!action.startsWith('reward-info')?'reward'
    :['cancel','close','menu','new'].includes(action)?'back':'confirm');
   callback();}catch(error){this.onError(error);}});}
 startSlotAudio(shake:boolean){
  const machine=this.root.querySelector<HTMLElement>('.slot-machine')!;
  const reels=Array.from(machine.querySelectorAll<HTMLElement>('.reel'));
  const tiers=reels.map(reel=>(reel.dataset.tier??'bronze') as FateTier);
  const {stops,end}=fateTimeline(tiers);
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timers:number[]=[];
  const at=(seconds:number,action:()=>void)=>timers.push(window.setTimeout(action,seconds*1000));
  let stopRolling:void|(()=>void);
  this.slotAudioCleanup=()=>{timers.forEach(clearTimeout);stopRolling?.();};
  this.onSample(FATE_SOUND.slide,.3);
  at(.12,()=>{stopRolling=this.onSound('rolling');});
  reels.forEach((_reel,index)=>at(stops[index],()=>{
   if(index===reels.length-1)stopRolling?.();
   this.onSound('reelStop',[.92,1,1.09][index]);
   const tier=tiers[index],rank=tierRank(tier);
   const show=isShowTier(tier);
   this.onSample(FATE_SOUND[tier],show?.36:rank>=tierRank('gold')?.32:.3);
   // The full show (flash, shake, fireworks) belongs to 7★ and NV only.
   if(show){
    machine.dataset.flash='';void machine.offsetWidth;machine.dataset.flash=tier;
    this.onSample(FATE_SOUND.fireworks,.28);if(tier==='nv')this.onSample(FATE_SOUND.awaken,.24);
    if(shake&&!reduced)machine.animate([{transform:'translate(0,0)'},{transform:'translate(-8px,4px)'},
     {transform:'translate(5px,-3px)'},{transform:'translate(-2px,0)'},{transform:'translate(0,0)'}],{duration:260,easing:'ease-out'});
   }
  }));
  at(Math.max(stops[stops.length-1]??0,end-.35),()=>this.onSample(FATE_SOUND.verdict,.3));
  this.root.querySelector('.slot-lever.is-returning .lever-arm')?.addEventListener('animationend',()=>this.onSound('leverReturn'),{once:true});
 }
 button(action:string,label:string,secondary=false,disabled=false){return `<button class="rpg-button ${secondary?'secondary':''}" data-action="${action}" ${disabled?'disabled':''}>${label}</button>`;}
 sprite(member:Pick<RunMember,'key'|'form'>,inReel=false){const m=this.manifests[member.form],a=m.animations.idle,path=member.form===member.key?`units/${member.key}`:`forms/${member.form}`;
  if(inReel){
   const displayWidth=Math.min(144,112*a.frameWidth/a.frameHeight);
   const framePosition=a.frameCount>1?100*a.frames[0].index/(a.frameCount-1):0;
   const preview=bodyPreview('/assets/'+path,a,'pixel-sprite reel-sprite',`--sprite-width:${displayWidth}px;aspect-ratio:${a.frameWidth}/${a.frameHeight};background-size:${a.frameCount*100}% 100%;background-position:${framePosition}% 0`);
   return `<div class="pixel-stage">${preview.html}</div>`;
  }
  const scale=Math.min(1.4,145/a.frameWidth,150/a.frameHeight);
  const preview=bodyPreview('/assets/'+path,a,'pixel-sprite',`width:${a.frameWidth*scale}px;height:${a.frameHeight*scale}px;background-size:${a.frameWidth*a.frameCount*scale}px ${a.frameHeight*scale}px;background-position:${-a.frames[0].index*a.frameWidth*scale}px 0`);
  return `<div class="pixel-stage">${preview.html}</div>`;}
 member(m:RunMember){const c=this.catalog[m.key];return `<article class="rpg-panel member-card"><header class="member-head"><span class="portrait-frame"><img class="portrait" src="${esc(c.portrait)}" alt="${esc(c.name)}"></span><span class="member-title"><strong>${esc(c.name)}</strong><span class="stars">${levelLabel(m.level)}</span></span></header>${this.sprite(m)}<div class="member-gauges">${gaugeRow('hp',m.hp,Math.round(c.maxHp*m.stats.hp))}${gaugeRow('mp',m.mp,memberMaxMp(c,m))}</div>${m.skills.map(a=>{const s=skillForRun(c.skills.find(s=>s.id===a.id)!,m);return `<div class="skill-copy"><b>${skillIcon(s)}${esc(s.name)}${a.level>1?' +'+(a.level-1):''}</b><p>${esc(skillDescription(s))}</p></div>`;}).join('')}</article>`;}
 title(kicker:string,title:string,subtitle:string){return `<div class="eyebrow">${esc(kicker)}</div><h1>${title}</h1><p class="lead">${esc(subtitle)}</p>`;}
 menu(hasSave:boolean,error:string|null,meta?:{crystals:number;unlocked:number;total:number;cost:number;canSummon:boolean}){const canStart=new Set(Object.values(this.catalog).map(c=>c.canonicalIdentity).filter(Boolean)).size>=3;this.show(`${this.title('A CRYSTAL-BOUND ROGUELIKE','FINAL FANTASY<br><em>ROGUE</em>','Three heroes from across the worlds. One expedition. A new fate every run.')}<div class="crystal-stage" aria-hidden="true">${titleCrystalMarkup()}<span class="crystal-sparks"></span></div><div class="rpg-panel menu-panel"><label class="seed-label">FATE SEED <input id="run-seed" maxlength="64" placeholder="Leave empty for a random fate" autocomplete="off"></label>${hasSave?this.button('continue','Continue the journey'):''}${this.button('play',hasSave?'Begin a new journey':'Begin the journey',false,!canStart)}${this.button('training','Training grounds',true,!canStart)}${!canStart?'<p class="muted">Three reviewed, distinct characters are required to begin.</p>':''}${meta?`<div class="profile-line"><span>◆ ${meta.crystals} crystals</span><span>Heroes ${meta.unlocked}/${meta.total}</span></div>${meta.unlocked<meta.total?this.button('summon',`Summon a hero · ${meta.cost} ◆`,true,!meta.canSummon):''}`:''}${error?`<p role="alert" class="error">${esc(error)}</p>`:''}<p class="muted">Short expedition · 2 areas · 4 battles<br>One free draw from the Fate Engine, then three rerolls</p></div><footer>Your journey is saved on this device</footer>`,'menu');{const stopSparks=startCrystalSparks(this.root.querySelector<HTMLElement>('.crystal-sparks')!),stopCrystal=startTitleCrystal(this.root.querySelector<HTMLElement>('.crystal-stage')!);this.crystalCleanup=()=>{stopSparks();stopCrystal();};}}
 slots(run:RunState,busy:boolean){
  const hasTeam=run.party.length>0;
  const exhausted=hasTeam&&run.rerolls===0;
  const hint=busy?'The reels are turning…':!hasTeam?'Pull the crystal lever to summon your party. The first draw is free.':exhausted?'The Fate Engine is spent. Set out with this party.':'Pull again to redraw all three heroes, or set out with this party.';
  const roster=Object.values(this.catalog);
  const tape=busy?`<div class="reel-tape" aria-hidden="true">${Array.from({length:18},(_,i)=>`<div class="tape-symbol"><img src="${esc(roster[i%roster.length].portrait)}" alt=""></div>`).join('')}</div>`:'';
  const tiers=run.party.map(member=>fateTier(member));
  const timeline=fateTimeline(tiers);
  const verdict=hasTeam?fateVerdict(tiers,run.party.reduce((sum,member)=>sum+member.level,0)):undefined;
  // One scale on screen: a star per level, NV at the top level (src/run/unitForms.mjs MAX_LEVEL).
  const stars=(member:RunMember)=>member.level>=MAX_LEVEL?'<i class="nv-mark">NV</i>'
   :Array.from({length:member.level},(_,i)=>`<i style="--star:${i}">★</i>`).join('');
  const reels=[0,1,2].map(i=>{
   const member=run.party[i];
   const character=member&&this.catalog[member.key];
   const skill=character?.skills.find(s=>s.id===member.skills[0].id);
   const tier=member?tiers[i]:undefined,stop=timeline.stops[i]??1;
   return `<div class="reel ${tier?'tier-'+tier:''} ${busy?'is-spinning':''} ${busy&&timeline.teases[i]?'is-tease':''}" ${tier?`data-tier="${tier}"`:''} style="--stop-duration:${stop}s">
    <span class="slot-number">${String(i+1).padStart(2,'0')}</span>
    <div class="reel-window">${tape}<span class="fate-burst" aria-hidden="true"></span><div class="final-symbol">${member?this.sprite(member,true):'<span class="unknown-crystal">◆</span>'}</div></div>
    <div class="reel-result">
     ${member?`<span class="fate-stars" aria-label="${levelLabel(member.level)}">${stars(member)}</span>`:'<span class="fate-stars" aria-hidden="true">&nbsp;</span>'}
     <b>${character?esc(character.name):'???'}</b>
     ${character?`<span class="reel-form">${levelLabel(member.level)}</span><span class="reel-variant" title="Original Unit ${esc(member.unitId)}">${esc(character.variantLabel??character.name)}</span>`:''}
     <span class="reel-detail">${skill?skillIcon(skill)+esc(skill.name):'Awaiting a hero'}</span>
    </div>
   </div>`;
  }).join('');
  this.show(`${this.title('THE FATE ENGINE','CHOOSE YOUR FATE',hint)}
   <div class="slot-machine-wrap">
    <div class="rpg-panel slot-machine ${busy?'spinning is-drawing':''}">
     <div class="machine-lights" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
     <div class="reels">${reels}</div>
     ${verdict?`<div class="fate-verdict tier-${verdict.tier} ${busy?'is-pending':''}" style="--verdict-at:${Math.max(0,timeline.end-.35)}s" role="status"><b>${verdict.title}</b><span>${verdict.detail}</span></div>`
      :'<div class="fate-verdict is-empty" aria-hidden="true"><b>&nbsp;</b></div>'}
     <div class="machine-base"><span class="reroll-count ${hasTeam&&!busy?'is-revealed':''}">REROLLS <b data-testid="rerolls">${run.rerolls}</b> / 3</span><span class="seed-chip" title="${esc(run.seed)}">Run seed: ${esc(run.seed)}</span></div>
    </div>
    <button type="button" class="slot-lever ${busy?'is-returning':''}" data-action="spin" aria-label="${exhausted?'No rerolls left':hasTeam?'Pull the lever to redraw your party':'Pull the lever to summon your party'}" ${busy||exhausted?'disabled':''}>
     <span class="lever-mount"><span class="lever-caption">${exhausted?'SPENT':'PULL'}</span></span><span class="lever-arm"><span class="lever-rod"></span><span class="lever-ball"></span></span>
    </button>
   </div>
   <div class="actions"><button class="rpg-button secondary" data-action="lever-skip" hidden>Skip animation</button>${hasTeam?this.button('confirm','Set out',false,busy):''}${busy?this.button('skip','Skip animation',true):this.button('menu','Back to title',true)}</div>
   ${/* Always reserve the panel so the centred layout never jumps while the reels run. */''}<details class="rpg-panel slot-details" ${hasTeam&&!busy?'':'inert style="visibility:hidden"'}><summary>Starting skills & effects</summary>${hasTeam&&!busy?run.party.map(m=>this.member(m)).join(''):''}</details>
   <p class="muted">Your party and remaining rerolls are saved.${run.rules?.awakeningMode==='highest-reviewed'?'<br>Prototype awakening: highest reviewed original form.':''}</p>`,'setup');
 }
 rewardText(r:Reward,run:RunState){const m=run.party.find(m=>m.key===r.member),c=m?this.catalog[m.key]:null;
  if(r.type==='revive')return {title:'Phoenix Down',detail:`Revive ${c!.name} from K.O. with ${Math.round(REVIVE_HP_SHARE*100)}% base HP.`,tag:'REVIVAL'};
  if(r.type==='rest')return {title:'Field Rest',detail:'Restore 40% base HP and 40% maximum MP to living allies. Does not revive.',tag:'PARTY RECOVERY'};
  if(r.type==='evolve'){const m=run.party.find(p=>p.key===r.member)!,body=formForLevel(c!,r.level!);
   return {title:'Awakening',detail:`Raise ${c!.name} to ${levelLabel(r.level!)}${body.form!==m.form?` and awaken the original ${rankLabel(body)} form`:''}. ${run.rules?.originalForms?'Improves HP, MP, power and defense.':'+15% base HP.'}`,tag:'BOSS RELIC'};}
  if(r.type==='stat')return {title:{attack:'Warrior’s Resolve',magic:'Arcane Focus',defense:'Iron Will',hp:'Life Crystal'}[r.stat!],detail:`${c!.name}: +20% base ${r.stat==='hp'?'maximum HP':r.stat==='defense'?'damage resistance rating':r.stat+' power'} for this run.`,tag:'PERMANENT RUN BONUS'};
  const s=c!.skills.find(s=>s.id===r.skill)!;return {title:r.type==='learn'?`Learn ${s.name}`:`Enhance ${s.name}`,detail:skillDescription(skillForRun(s,m!))+(r.type==='skill'?' • Next rank: +20% base damage/healing power or longer status duration.':m!.skills.length===3?' • Choose a skill to replace.':''),tag:r.type==='learn'?'NEW ORIGINAL SKILL':'SKILL MASTERY'};
 }
 /** Portrait of the rewarded member; skill rewards add the skill's original icon as a badge. */
 rewardArt(r:Reward,m:RunMember){const c=this.catalog[m.key],skill=(r.type==='learn'||r.type==='skill')?c.skills.find(s=>s.id===r.skill):undefined,icon=skill&&skillIconUrl(skill);
  return `<span class="reward-portrait ${icon?'has-skill':''}"><img src="${esc(c.portrait)}" alt="${esc(c.name)}">${icon?`<img class="skill-badge" src="${esc(icon)}" alt="">`:''}</span>`;}
 rewards(run:RunState){this.show(`${this.title('VICTORY','THE SPOILS OF FATE','Choose one reward for your expedition.')}<div class="reward-grid">${run.offers.map((r,i)=>{const t=this.rewardText(r,run),m=run.party.find(m=>m.key===r.member);return `<article class="reward-option" style="--card-index:${i}"><button class="rpg-panel reward-card" data-action="reward-${i}"><span class="eyebrow">${t.tag}</span>${m?this.rewardArt(r,m):'<span class="reward-portrait crystal-icon">✦</span>'}<h2>${esc(t.title)}</h2><p>${esc(t.detail)}</p><span class="card-choose">CHOOSE →</span></button><details class="reward-details"><summary>Details</summary><div class="reward-explanation rpg-panel"><h2>${esc(t.title)}</h2><p>${esc(t.detail)}</p>${this.button('reward-info-close-'+i,'Close details',true)}</div></details></article>`;}).join('')}</div>`,'rewards');
  for(let i=0;i<3;i++)this.on('reward-info-close-'+i,()=>{this.root.querySelectorAll<HTMLDetailsElement>('.reward-details').forEach(d=>d.open=false);});
 }

 replacement(run:RunState,index:number){const r=run.offers[index],m=run.party.find(m=>m.key===r.member)!;this.show(`${this.title('THREE ACTIVE SLOTS','MAKE ROOM','Choose one skill to replace. No reward is consumed until you confirm.')}<div class="replacement-grid">${m.skills.map((s,i)=>{const a=this.catalog[m.key].skills.find(x=>x.id===s.id)!;return `<button class="rpg-panel reward-card" data-action="replace-${i}"><h2>${skillIcon(a)}${esc(a.name)}</h2><p>${esc(skillDescription(skillForRun(a,m)))}</p><span>Replace this skill</span></button>`;}).join('')}</div>${this.button('cancel','Back to rewards',true)}`,'replacement');}
 party(run:RunState){this.show(`${this.title('EXPEDITION PARTY','YOUR COMPANIONS',`Seed ${run.seed} · your companions for this journey`)}<div class="party-grid">${run.party.map(m=>this.member(m)).join('')}</div>${this.button('close','Return to battle')}`,'party');}
 result(run:RunState,earned?:{crystals:number;unlocked:string|null}){this.show(`${this.title(run.phase==='won'?'EXPEDITION COMPLETE':'THE CRYSTAL FALLS',run.phase==='won'?'A NEW LEGEND':'ANOTHER DAWN',run.phase==='won'?'Your companions endured the rift. Their journey is complete.':'The expedition has ended. A new seed begins a fresh story.')}<div class="party-grid">${run.party.map(m=>this.member(m)).join('')}</div><p class="muted">Seed ${esc(run.seed)} · ${run.history.filter((h:any)=>h.kind==='reward').length} rewards chosen</p>${earned?`<p class="profile-line"><span>+${earned.crystals} ◆ crystals</span></p>${earned.unlocked?this.heroCard(earned.unlocked,'A NEW HERO ANSWERS THE CALL'):''}`:''}${this.button('new','Return to title')}`,'result');}
 heroCard(key:string,label:string){const c=this.catalog[key];return `<article class="rpg-panel hero-unlock"><span class="eyebrow">${esc(label)}</span><span class="portrait-frame"><img class="portrait" src="${esc(c.portrait)}" alt="${esc(c.name)}"></span><strong>${esc(c.name)}</strong></article>`;}
 summoned(key:string,crystals:number){this.show(`${this.title('FATE ENGINE','A HERO ANSWERS',`The crystal resonates. ${esc(this.catalog[key].name)} may now be drawn by the Fate Engine.`)}${this.heroCard(key,'NEW HERO')}<p class="muted">◆ ${crystals} crystals left</p>${this.button('close','Return to title')}`,'result');}
 dialog(title:string,text:string,accept='Confirm'){this.show(`${this.title('EXPEDITION',esc(title),text)}<div class="actions">${this.button('accept',accept)}${this.button('cancel','Cancel',true)}</div>`,'dialog');}
 error(message:string,discard=false){this.show(`${this.title('SAVE UNAVAILABLE','THE PATH IS CLOSED',message)}${this.button('reload','Reload saved journey')}${discard?this.button('discard','Discard incompatible save and return',true):''}`,'error');}
}
