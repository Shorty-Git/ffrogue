import type {RunCatalog,RunMember,RunState,Reward,AwakeningNotice} from '../run/runState.mjs';
import {skillForRun,memberMaxMp} from '../run/runState.mjs';
import {gaugeRow} from './ffbeGauge';
import {skillIconUrl} from './skillIcons';
const skillIcon=(skill:Parameters<typeof skillIconUrl>[0])=>{const url=skillIconUrl(skill);return url?`<img class="skill-icon" src="${esc(url)}" alt="" draggable="false">`:'';};
import {skillDescription} from '../run/catalog';
import {rewardPopupLayout} from './rewardLayout.mjs';
import type {RewardStageBounds} from './rewardLayout.mjs';
import type {AnimationMeta,UnitManifest} from '../types/manifest';
import {bindSlotLever} from './SlotLever';
import {startCrystalSparks} from './CrystalSparks';
import {formAt,rankLabel} from '../run/unitForms.mjs';
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
  const reels=Array.from(machine.querySelectorAll('.reel'));
  const rare=machine.querySelector('.reel-nv')??machine.querySelector('.reel-gold');
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let stopRolling:void|(()=>void);
  this.slotAudioCleanup=()=>stopRolling?.();
  reels.forEach((reel,index)=>{
   const tape=reel.querySelector('.reel-tape');
   if(index===0)tape?.addEventListener('animationstart',()=>{stopRolling=this.onSound('rolling');},{once:true});
   tape?.addEventListener('animationend',()=>{
    if(index===reels.length-1)stopRolling?.();
    this.onSound('reelStop',[.92,1,1.09][index]);
    if(reel!==rare)return;
    const nv=reel.classList.contains('reel-nv');
    this.onSound(nv?'nvReveal':'starReveal');
    if(shake&&!motion.matches)machine.animate([
     {transform:'translateX(0)'},{transform:`translateX(-${nv?7:3}px)`},
     {transform:`translateX(${nv?4:2}px)`},{transform:`translateX(-${nv?2:1}px)`},{transform:'translateX(0)'},
    ],{duration:nv?185:140,easing:'ease-out'});
   },{once:true});
  });
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
 member(m:RunMember){const c=this.catalog[m.key];return `<article class="rpg-panel member-card"><header class="member-head"><span class="portrait-frame"><img class="portrait" src="${esc(c.portrait)}" alt="${esc(c.name)}"></span><span class="member-title"><strong>${esc(c.name)}</strong><span class="stars">${rankLabel(m)}</span></span></header>${this.sprite(m)}<div class="member-gauges">${gaugeRow('hp',m.hp,Math.round(c.maxHp*m.stats.hp))}${gaugeRow('mp',m.mp,memberMaxMp(c,m))}</div>${m.skills.map(a=>{const s=skillForRun(c.skills.find(s=>s.id===a.id)!,m);return `<div class="skill-copy"><b>${skillIcon(s)}${esc(s.name)}${a.level>1?' +'+(a.level-1):''}</b><p>${esc(skillDescription(s))}</p></div>`;}).join('')}</article>`;}
 title(kicker:string,title:string,subtitle:string){return `<div class="eyebrow">${esc(kicker)}</div><h1>${title}</h1><p class="lead">${esc(subtitle)}</p>`;}
 menu(hasSave:boolean,error:string|null){const canStart=new Set(Object.values(this.catalog).map(c=>c.canonicalIdentity).filter(Boolean)).size>=3;this.show(`${this.title('FINAL FANTASY ROGUE','FINAL FANTASY<br><em>ROGUE</em>','Three allies. One journey. A different story with every seed.')}<div class="crystal-stage" aria-hidden="true"><div class="crystal-sigil">&#x25C6;</div><span class="crystal-sparks"></span></div><div class="rpg-panel menu-panel"><label class="seed-label">RUN SEED <input id="run-seed" maxlength="64" placeholder="Leave blank for a new fate" autocomplete="off"></label>${hasSave?this.button('continue','Continue journey'):''}${this.button('play',hasSave?'Start a new journey':'Play',false,!canStart)}${!canStart?'<p class="muted">Three reviewed, distinct characters are required to begin.</p>':''}${error?`<p role="alert" class="error">${esc(error)}</p>`:''}<p class="muted">Short expedition · 2 areas · 4 encounters<br>One free team draw and three team rerolls</p></div><footer>Your journey is saved on this device</footer>`,'menu');this.crystalCleanup=startCrystalSparks(this.root.querySelector<HTMLElement>('.crystal-sparks')!);}
 slots(run:RunState,busy:boolean){
  const hasTeam=run.party.length>0;
  const exhausted=hasTeam&&run.rerolls===0;
  const hint=busy?'Drawing your team…':!hasTeam?'Pull the lever to draw your first team for free.':exhausted?'No team rerolls left. Begin the expedition with this team.':'Pull again to redraw the entire team, or begin your expedition.';
  const roster=Object.values(this.catalog);
  const tape=busy?`<div class="reel-tape" aria-hidden="true">${Array.from({length:18},(_,i)=>`<div class="tape-symbol"><img src="${esc(roster[i%roster.length].portrait)}" alt=""></div>`).join('')}</div>`:'';
  const reels=[.65,1,1.4].map((duration,i)=>{
   const member=run.party[i];
   const character=member&&this.catalog[member.key];
   const skill=character?.skills.find(s=>s.id===member.skills[0].id);
   const accent=member?.rank==='NV'?'nv':member?.rarity===7?'gold':member?.rarity===6?'silver':'standard';
   return `<div class="reel reel-${accent} ${busy?'is-spinning':''}" style="--stop-duration:${duration}s">
    <span class="slot-number">${String(i+1).padStart(2,'0')}</span>
    <div class="reel-window">${tape}<div class="final-symbol">${member?this.sprite(member,true):'<span class="unknown-crystal">◆</span>'}</div></div>
    <div class="reel-result">
     <b>${character?esc(character.name):'???'}</b>
     ${character?`<span class="reel-form">${rankLabel(member)}</span><span class="reel-variant" title="Original Unit ${esc(member.unitId)}">${esc(character.variantLabel??character.name)}</span>`:''}
     <span class="reel-detail">${skill?skillIcon(skill)+esc(skill.name):'Awaiting destiny'}</span>
    </div>
   </div>`;
  }).join('');
  this.show(`${this.title('THE FATE ENGINE','CHOOSE YOUR FATE',hint)}
   <div class="slot-machine-wrap">
    <div class="rpg-panel slot-machine ${busy?'spinning is-drawing':''}">
     <div class="machine-lights" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
     <div class="reels">${reels}</div>
     <div class="machine-base"><span class="reroll-count ${hasTeam&&!busy?'is-revealed':''}">TEAM REROLLS <b data-testid="rerolls">${run.rerolls}</b> / 3</span><span class="seed-chip" title="${esc(run.seed)}">Run seed: ${esc(run.seed)}</span></div>
    </div>
    <button type="button" class="slot-lever ${busy?'is-returning':''}" data-action="spin" aria-label="${exhausted?'No team rerolls left':hasTeam?'Pull the lever to redraw your team':'Pull the lever to draw your team'}" ${busy||exhausted?'disabled':''}>
     <span class="lever-mount"><span class="lever-caption">${exhausted?'EMPTY':'PULL &#8595;'}</span></span><span class="lever-arm"><span class="lever-rod"></span><span class="lever-ball"></span></span>
    </button>
   </div>
   <div class="actions"><button class="rpg-button secondary" data-action="lever-skip" hidden>Skip animation</button>${hasTeam?this.button('confirm','Begin expedition',false,busy):''}${busy?this.button('skip','Skip animation',true):this.button('menu','Back to title',true)}</div>
   ${hasTeam&&!busy?`<details class="rpg-panel"><summary>Starting skills & effects</summary>${run.party.map(m=>this.member(m)).join('')}</details>`:''}
   <p class="muted">Your team and remaining rerolls are saved.${run.rules?.awakeningMode==='highest-reviewed'?'<br>Prototype awakening: highest reviewed original form.':''}</p>`,'setup');
 }
 rewardText(r:Reward,run:RunState){const m=run.party.find(m=>m.key===r.member),c=m?this.catalog[m.key]:null;
  if(r.type==='rest')return {title:'Field Rest',detail:'Restore 40% base HP and 40% maximum MP to living allies. Does not revive.',tag:'PARTY RECOVERY'};
  if(r.type==='evolve')return {title:'Awakening',detail:`Evolve ${c!.name} to the original ${rankLabel(formAt(c!,r.form!)!)} form within the same unit. ${run.rules?.originalForms?'Improves HP, MP, power and defense.':'+15% base HP.'}`,tag:'BOSS RELIC'};
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
 result(run:RunState){this.show(`${this.title(run.phase==='won'?'EXPEDITION COMPLETE':'THE CRYSTAL FALLS',run.phase==='won'?'A NEW LEGEND':'ANOTHER DAWN',run.phase==='won'?'Your companions endured the rift. Their journey is complete.':'The expedition has ended. A new seed begins a fresh story.')}<div class="party-grid">${run.party.map(m=>this.member(m)).join('')}</div><p class="muted">Seed ${esc(run.seed)} · ${run.history.filter((h:any)=>h.kind==='reward').length} rewards chosen</p>${this.button('new','Return to title')}`,'result');}
 dialog(title:string,text:string,accept='Confirm'){this.show(`${this.title('EXPEDITION',esc(title),text)}<div class="actions">${this.button('accept',accept)}${this.button('cancel','Cancel',true)}</div>`,'dialog');}
 error(message:string,discard=false){this.show(`${this.title('SAVE UNAVAILABLE','THE PATH IS CLOSED',message)}${this.button('reload','Reload saved journey')}${discard?this.button('discard','Discard incompatible save and return',true):''}`,'error');}
}
