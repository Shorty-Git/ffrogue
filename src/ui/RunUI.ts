import type {RunCatalog,RunMember,RunState,Reward,AwakeningNotice} from '../run/runState.mjs';
import {skillForRun,memberMaxMp,REVIVE_HP_SHARE,upcomingStage,currentFight,mapOptions,runMap,AREA_CAMP,PARTY_SIZE,characterRole} from '../run/runState.mjs';
import {NODE_LABELS,COMBAT_NODES,type MapNode,type NodeType} from '../run/actMap.mjs';
import {eliteAffix,bossRule} from '../run/encounterRules.mjs';
import {eliteEnemyKey} from '../run/runBalance.mjs';
import {stageForArea,ENEMY_CONTENT,stageElementProfile} from '../run/stageContent.mjs';
import {ROLES,ROLE_LABELS} from '../run/roles.mjs';
import {CAMP_REST,MERCHANT_RESTORE,SHRINE,GIL_REWARD,TREASURE_GIL,type MerchantWare} from '../run/runEvents.mjs';
import {ELEMENT_LABELS,WARD_RESIST} from '../run/elementRules.mjs';
import {elementChip,elementChips} from './elementChips';
import {WEAPON_ELEMENT_RULE,WEAPON_GLYPHS,weaponSummary,isSignatureFor,type RunWeapon} from '../run/weapons.mjs';
import {gaugeRow} from './ffbeGauge';
import {skillIconUrl} from './skillIcons';
const skillIcon=(skill:Parameters<typeof skillIconUrl>[0])=>{const url=skillIconUrl(skill);return url?`<img class="skill-icon" src="${esc(url)}" alt="" draggable="false">`:'';};
import {skillDescription} from '../run/catalog';
import {rewardPopupLayout} from './rewardLayout.mjs';
import type {RewardStageBounds} from './rewardLayout.mjs';
import type {AnimationMeta,UnitManifest} from '../types/manifest';
import {bindSlotLever} from './SlotLever';
import {fateTier,fateTimeline,fateVerdict,isShowTier,FATE_SOUND,FATE_GAIN,FATE_TAIL_FADE,type FateTier,type FateSound} from './fateEngine';
import {formAt,formForLevel,rankLabel,levelLabel,levelOf,MAX_LEVEL} from '../run/unitForms.mjs';
import type {Profile} from '../run/profile.mjs';
import {skillElements} from '../run/elementRules.mjs';
import type {Element} from '../run/elementRules.mjs';
/** Title screen backdrop: an arena picture, up to four heroes (form bodies) and a caption line. */
export interface TitleStage{image?:string;heroes:Pick<RunMember,'key'|'form'>[];caption?:string;}
/** One option of a path choice (final boss or next area). */
export interface PathCard{id:string;image:string;eyebrow:string;title:string;lines:string[];weak:Element[];attack:Element[];mystery?:boolean;silhouette?:{url:string;frames:number;index:number;width:number;height:number};}
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
 onSample:(sound:FateSound,gain:number)=>(fade?:number)=>void=()=>()=>{};
 private slotAudioCleanup?:()=>void;
 private leverCleanup?:()=>void;
 private crystalCleanup?:()=>void;
 /** anchor: the awakening hero's screen box. With it the moment plays as a compact banner over that hero
  * in the live arena (cloud night 2026-11-10); without it (no battle view) as the centred panel. */
 awakening(notice:AwakeningNotice,complete:()=>void,anchor?:{left:number;right:number;top:number;bottom:number}):void {
  const character=this.catalog[notice.member];
  const fromLabel=rankLabel(formAt(character,notice.from.form)!);
  const toLabel=rankLabel(formAt(character,notice.to.form)!);
  const paths:string[]=[];
  const forms=[notice.from,notice.to].map(f=>this.manifests[f.form].animations.idle);
  const scale=anchor?Math.min(2,200/Math.max(...forms.map(a=>a.frameWidth)),118/Math.max(...forms.map(a=>a.frameHeight))):Math.min(3,300/Math.max(...forms.map(a=>a.frameWidth)),210/Math.max(...forms.map(a=>a.frameHeight)));
  const body=(form:string,index:number)=>{
   const a=forms[index],root=`/assets/${form===notice.member?'units/'+notice.member:'forms/'+form}`;
   const preview=bodyPreview(root,a,'awakening-body',`width:${a.frameWidth*scale}px;height:${a.frameHeight*scale}px;left:calc(50% - ${a.pivotX*a.frameWidth*scale}px);bottom:${(anchor?16:44)-(1-a.pivotY)*a.frameHeight*scale}px;background-size:${a.frameWidth*a.frameCount*scale}px ${a.frameHeight*scale}px;background-position:${-a.frames[0].index*a.frameWidth*scale}px 0`);
   paths.push(...preview.paths);
   return `<div class="awakening-form ${index?'new':'old'}" data-form="${esc(form)}">${preview.html}</div>`;
  };
  this.show(`<div class="awakening-sequence rpg-panel"><div class="eyebrow">A NEW LIGHT AWAKENS</div><h1>${esc(this.catalog[notice.member].name)}</h1><div class="awakening-stage"><div class="awakening-halo"></div><div class="awakening-rings"></div>${Array.from({length:12},(_,i)=>`<i class="awakening-spark" style="--spark-angle:${i*30}deg;--spark-delay:${i%4*60}ms" aria-hidden="true">✦</i>`).join('')}${body(notice.from.form,0)}${body(notice.to.form,1)}</div><p class="awakening-stars" aria-label="${fromLabel} to ${toLabel}">${fromLabel} <span>→</span> <strong>${toLabel}</strong></p><p class="lead">${toLabel} original form unlocked</p></div>`,'awakening');
  this.root.classList.add('awakening-overlay');
  if(anchor){const width=Math.min(270,innerWidth-16),height=262;
   this.root.classList.add('awakening-inline');
   this.root.style.setProperty('--aw-left',Math.max(8,Math.min(innerWidth-width-8,(anchor.left+anchor.right)/2-width/2))+'px');
   this.root.style.setProperty('--aw-top',Math.max(8,Math.min(innerHeight-height-8,anchor.top-height+20))+'px');
   this.root.style.setProperty('--aw-width',width+'px');}this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-label','Character awakening');
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
 show(html:string,phase:string){this.heroAnimation?.();this.heroAnimation=undefined;this.slotAudioCleanup?.();this.slotAudioCleanup=undefined;this.leverCleanup?.();this.leverCleanup=undefined;this.crystalCleanup?.();this.crystalCleanup=undefined;this.root.className='run-overlay';this.root.removeAttribute('style');this.root.removeAttribute('role');this.root.removeAttribute('aria-modal');this.root.removeAttribute('aria-label');this.root.dataset.phase=phase;this.root.innerHTML=`<main class="rpg-shell">${html}</main>`;this.root.querySelector<HTMLElement>('button')?.focus();}
 hide(){this.slotAudioCleanup?.();this.slotAudioCleanup=undefined;this.leverCleanup?.();this.leverCleanup=undefined;this.crystalCleanup?.();this.crystalCleanup=undefined;this.root.innerHTML='';this.root.className='';this.root.removeAttribute('style');this.root.removeAttribute('role');this.root.removeAttribute('aria-modal');this.root.removeAttribute('aria-label');this.root.dataset.phase='battle';}
 overBattle(bounds:RewardStageBounds){
  this.root.classList.add('victory-overlay');this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-label','Battle rewards');
  const shell=this.root.querySelector<HTMLElement>('.rpg-shell')!;
  this.root.style.setProperty('--reward-width',Math.min(1060,window.innerWidth-24)+'px');
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
  this.onSample(FATE_SOUND.slide,FATE_GAIN.slide);
  let previousCue:((fade?:number)=>void)|undefined,previousShow=false;
  at(.12,()=>{stopRolling=this.onSound('rolling');});
  reels.forEach((_reel,index)=>at(stops[index],()=>{
   if(index===reels.length-1)stopRolling?.();
   this.onSound('reelStop',[.92,1,1.09][index]);
   const tier=tiers[index];
   const show=isShowTier(tier);
   // The previous reel's cue fades out instead of stacking; a 7★/NV celebration keeps its tail.
   if(!previousShow)previousCue?.(FATE_TAIL_FADE);
   previousCue=this.onSample(FATE_SOUND[tier],FATE_GAIN[tier]);previousShow=show;
   // The full show (flash, shake, fireworks) belongs to 7★ and NV only.
   if(show){
    machine.dataset.flash='';void machine.offsetWidth;machine.dataset.flash=tier;
    this.onSample(FATE_SOUND.fireworks,FATE_GAIN.fireworks);if(tier==='nv')this.onSample(FATE_SOUND.awaken,FATE_GAIN.awaken);
    if(shake&&!reduced)machine.animate([{transform:'translate(0,0)'},{transform:'translate(-8px,4px)'},
     {transform:'translate(5px,-3px)'},{transform:'translate(-2px,0)'},{transform:'translate(0,0)'}],{duration:260,easing:'ease-out'});
   }
  }));
  at(Math.max(stops[stops.length-1]??0,end-.35),()=>{if(!previousShow)previousCue?.(FATE_TAIL_FADE);this.onSample(FATE_SOUND.verdict,FATE_GAIN.verdict);});
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
 /** Compact party row for the Fate Engine (2026-11-11): portrait, name, level, skills with their copy. */
 memberLine(m:RunMember){const c=this.catalog[m.key];return `<div class="start-row"><span class="portrait-frame"><img class="portrait" src="${esc(c.portrait)}" alt=""></span><div><strong>${esc(c.name)}</strong> <span class="stars">${levelLabel(m.level)}</span>${m.weapon?weaponLine(m.weapon,m):''}${m.skills.map(a=>{const s=skillForRun(c.skills.find(s=>s.id===a.id)!,m);return `<p>${skillIcon(s)}<b>${esc(s.name)}</b> ${esc(skillDescription(s))}</p>`;}).join('')}${c.limitBurst?`<p class="start-lb"><b>Limit Burst</b> ${esc(c.limitBurst.name)}</p>`:''}</div></div>`;}
 member(m:RunMember){const c=this.catalog[m.key];return `<article class="rpg-panel member-card"><header class="member-head"><span class="portrait-frame"><img class="portrait" src="${esc(c.portrait)}" alt="${esc(c.name)}"></span><span class="member-title"><strong>${esc(c.name)}</strong><span class="stars">${levelLabel(m.level)}</span></span></header>${this.sprite(m)}<div class="member-gauges">${gaugeRow('hp',m.hp,Math.round(c.maxHp*m.stats.hp))}${gaugeRow('mp',m.mp,memberMaxMp(c,m))}</div>${m.weapon?weaponLine(m.weapon,m):''}${m.skills.map(a=>{const s=skillForRun(c.skills.find(s=>s.id===a.id)!,m);return `<div class="skill-copy"><b>${skillIcon(s)}${esc(s.name)}${a.level>1?' +'+(a.level-1):''}</b><p>${esc(skillDescription(s))}</p></div>`;}).join('')}</article>`;}
 title(kicker:string,title:string,subtitle:string){return `<div class="eyebrow">${esc(kicker)}</div><h1>${title}</h1><p class="lead">${esc(subtitle)}</p>`;}
 /** Title screen (2026-11-14, "Cinematic"): the current or last run's heroes stand on its arena; logo and
  * menu list on the left, progress below. Cinzel logo, Source Sans menu (docs/game-design.md, UI). */
 menu(hasSave:boolean,error:string|null,meta?:{crystals:number;unlocked:number;total:number;cost:number;canSummon:boolean},stage?:TitleStage){
  const canStart=new Set(Object.values(this.catalog).map(c=>c.canonicalIdentity).filter(Boolean)).size>=PARTY_SIZE;
  const item=(action:string,label:string,primary=false,disabled=false)=>`<button type="button" class="title-item ${primary?'is-primary':''}" data-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
  // Up to four heroes in a chevron on the arena floor. Each spot is the hero's feet (clip pivot), so pose
  // changes never make the body jump (AGENTS.md, sprite rules).
  const spots=[[.58,.64],[.76,.58],[.66,.80],[.84,.75]];
  const cast=(stage?.heroes??[]).slice(0,4).flatMap(member=>{const m=this.manifests[member.form]??this.manifests[member.key];if(!m)return [];
   return [{m,root:'/assets/'+(member.form===member.key||!this.manifests[member.form]?`units/${member.key}`:`forms/${member.form}`),scale:Math.min(3,190/m.animations.idle.frameHeight)}];});
  const heroes=cast.map((_,i)=>`<div class="title-hero" style="left:${spots[i][0]*100}%;top:${spots[i][1]*100}%"></div>`).join('');
  this.show(`<div class="title-scene">${stage?.image?`<div class="title-arena" style="background-image:url('${esc(stage.image)}')"></div>`:''}<div class="title-shade"></div>${heroes}
   <header class="title-brand"><span class="title-ff">FINAL FANTASY</span><h1 class="title-logo">ROGUE</h1><span class="title-rule"></span><p>${esc(stage?.caption??'Every run, a new legend.')}</p></header>
   <nav class="menu-panel title-menu" aria-label="Main menu">${hasSave?item('continue','Continue',true):''}${item('play',hasSave?'New Journey':'Begin',!hasSave,!canStart)}${item('heroes','Heroes')}${item('training','Training Grounds',false,!canStart)}${item('guide','How to Play')}${meta?item('summon',`Summon · ${meta.cost} ◆`,false,!meta.canSummon):''}
    ${!canStart?'<p class="muted">Three distinct heroes are required to begin.</p>':''}${error?`<p role="alert" class="error">${esc(error)}</p>`:''}
    <details class="seed-details"><summary>Fate seed</summary><input id="run-seed" maxlength="64" placeholder="Random" autocomplete="off" aria-label="Fate seed"></details></nav>
   ${meta?`<footer class="title-progress"><span><b class="is-gold">◆ ${meta.crystals}</b> crystals</span><span><b>${meta.unlocked} / ${meta.total}</b> heroes</span></footer>`:''}</div>`,'menu');
  this.root.classList.add('is-title');
  // The party lives (FF V/VI PS1 title screens): idle loops on the original frame timings, a victory pose
  // when a menu entry is chosen, and a tired kneel after 40 s without input.
  const still=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timers:number[]=[],busy:boolean[]=[],elements=Array.from(this.root.querySelectorAll<HTMLElement>('.title-hero'));
  const play=(i:number,names:string[],after?:()=>void,offset=0)=>{const hero=cast[i],name=names.find(n=>hero.m.animations[n]),clip=name?hero.m.animations[name]:hero.m.animations.idle,scale=hero.scale;
   clearTimeout(timers[i]);
   elements[i].innerHTML=bodyPreview(hero.root,clip,'pixel-sprite title-hero-body',`left:${-clip.pivotX*clip.frameWidth*scale}px;top:${-clip.pivotY*clip.frameHeight*scale}px;width:${clip.frameWidth*scale}px;height:${clip.frameHeight*scale}px;background-size:${clip.frameWidth*clip.frameCount*scale}px ${clip.frameHeight*scale}px`).html;
   const layers=Array.from(elements[i].querySelectorAll<HTMLElement>('.title-hero-body,.title-hero-body .body-emission'));let frame=offset;
   const step=()=>{const f=clip.frames[frame%clip.frames.length];layers.forEach(l=>l.style.backgroundPosition=`${-f.index*clip.frameWidth*scale}px 0`);frame++;
    if(after&&frame>=clip.frames.length){timers[i]=window.setTimeout(after,Math.max(30,f.durationMs));return;}
    if(!still&&clip.frames.length>1)timers[i]=window.setTimeout(step,Math.max(30,f.durationMs));};
   step();};
  const idle=(i:number)=>{busy[i]=false;play(i,['idle'],undefined,i*2);};
  cast.forEach((_,i)=>idle(i));
  if(!still){
   // Choosing an entry: one hero (by entry order) celebrates, then settles back.
   this.root.querySelectorAll<HTMLElement>('.title-item').forEach((entry,n)=>{const cheer=()=>{const i=n%Math.max(1,cast.length);if(!cast.length||busy[i])return;busy[i]=true;
    play(i,['win_before'],()=>play(i,['win'],()=>idle(i)));};entry.addEventListener('pointerenter',cheer);entry.addEventListener('focus',cheer);});
   let tired=false,rest=0;
   const wake=()=>{window.clearTimeout(rest);if(tired){tired=false;cast.forEach((_,i)=>idle(i));}rest=window.setTimeout(()=>{tired=true;cast.forEach((_,i)=>{busy[i]=true;play(i,['dying','standby']);});},40000);};
   const events=['pointermove','keydown','pointerdown'];events.forEach(e=>window.addEventListener(e,wake));wake();
   this.heroAnimation=()=>{timers.forEach(clearTimeout);window.clearTimeout(rest);events.forEach(e=>window.removeEventListener(e,wake));};
  }else this.heroAnimation=()=>timers.forEach(clearTimeout);
 }
 /** Peek (2026-11-11 playtest): hide the reward cards to look at the party and its gear, then bring them back. */
 bindPeek(run:RunState){const button=this.root.querySelector<HTMLButtonElement>('.reward-peek');if(!button)return;
  const panel=document.createElement('div');panel.className='rpg-panel peek-party';
  panel.innerHTML=`<span class="eyebrow">YOUR PARTY · WEAPONS AND SKILLS</span><div class="start-list">${run.party.map(m=>this.memberLine(m)).join('')}</div>`;
  button.before(panel);
  button.onclick=()=>{const on=this.root.classList.toggle('is-peeking');button.setAttribute('aria-pressed',String(on));button.textContent=on?'Back to rewards':'Show my party';this.onSound(on?'back':'confirm');};}
 /** Favourite Final Fantasies (2026-11-11): click up to three games in order (1st, 2nd, 3rd); a second click
  * removes one. Each card shows the heroes it grants; the confirm button starts with the ranked list. */
 favorite(choices:{game:string;label:string;heroes:string[]}[],max:number,done:(games:string[])=>void){
  const card=(c:{game:string;label:string;heroes:string[]},i:number)=>`<button type="button" class="rpg-panel favorite-card" data-game="${esc(c.game)}" aria-pressed="false" style="--card-index:${i}">
   <span class="favorite-rank" aria-hidden="true"></span>
   <span class="favorite-heads">${c.heroes.slice(0,4).map(k=>`<img src="${esc(this.catalog[k].portrait)}" alt="" draggable="false">`).join('')}</span>
   <strong>${esc(c.label.replace('FINAL FANTASY','FF'))}</strong><small>${c.heroes.map(k=>esc(this.catalog[k].name)).filter((n,j,a)=>a.indexOf(n)===j).join(', ')}</small></button>`;
  this.show(`${this.title('BEFORE YOU BEGIN','YOUR FAVOURITE FINAL FANTASIES',`Pick up to ${max} in order. Their heroes answer your call first; everyone else joins through victories and summons.`)}<div class="favorite-grid">${choices.map(card).join('')}</div><div class="actions"><button class="rpg-button" data-action="favorite-done" disabled>Choose at least one</button></div>`,'favorite');
  const picked:string[]=[],confirm=this.root.querySelector<HTMLButtonElement>('[data-action=favorite-done]')!;
  const refresh=()=>{this.root.querySelectorAll<HTMLElement>('.favorite-card').forEach(c=>{const rank=picked.indexOf(c.dataset.game!);
    c.setAttribute('aria-pressed',String(rank>=0));c.querySelector('.favorite-rank')!.textContent=rank>=0?String(rank+1):'';c.classList.toggle('is-full',rank<0&&picked.length>=max);});
   confirm.disabled=!picked.length;confirm.textContent=picked.length?`Begin with ${picked.length===1?'this game':'these '+picked.length+' games'}`:'Choose at least one';};
  this.root.querySelectorAll<HTMLButtonElement>('.favorite-card').forEach(c=>c.onclick=()=>{const g=c.dataset.game!,at=picked.indexOf(g);
   if(at>=0)picked.splice(at,1);else if(picked.length<max)picked.push(g);else return;this.onSound(at>=0?'back':'confirm');refresh();});
  confirm.onclick=()=>{if(!picked.length)return;this.onSound('confirm');try{done([...picked]);}catch(error){this.onError(error);}};
 }
 /** How to play (2026-11-11): shown once before the first journey and from the title screen. */
 guide(action:string,label:string){
  const steps:[string,string][]=[
   ['Face your nemesis','Pick the final boss of the expedition. Unknown bosses stay hidden until you beat them once.'],
   ['Pull the Fate Engine','It draws four heroes from your roster, one per role: damage, healer, tank and support. Not happy? Pull again: three rerolls per run.'],
   ['Choose your path','Three acts lead to the final boss. Each act starts with a choice of two lands, then a map: battles, optional elites, events, a merchant, campfires and treasure. A boss with a special rule closes every act.'],
   ['Fight','Pick a command below, then click an enemy in the arena. Hover a command to see what it does. Hitting a weakness deals extra damage; a full Limit gauge unlocks the Limit Burst.'],
   ['Grow stronger','After every win, choose one reward: new skills, skill ranks, weapons or an awakening. Crystals and new heroes stay with you after the run.'],
   ['Stops on the road','Campfires heal or train, the Moogle merchant takes the Gil every win pays, the crystal shrine rewards a brave prayer, usually. The run is saved after every stop.'],
  ];
  this.show(`${this.title('FIRST STEPS','HOW TO PLAY','Three acts, ten to thirteen fights, one final boss. Every run draws a new party of four.')}<ol class="guide-steps">${steps.map(([t,d],i)=>`<li class="rpg-panel" style="--card-index:${i}"><span class="guide-number">${i+1}</span><div><h2>${esc(t)}</h2><p>${esc(d)}</p></div></li>`).join('')}</ol><div class="actions">${this.button(action,label)}</div>`,'guide');
 }
 /** Path choice (2026-11-11): the final boss at the journey start, the next area before each seeded area.
  * Cards show the arena, who fights there, the enemies' weaknesses and the elements they attack with. */
 pathChoice(eyebrow:string,title:string,lead:string,cards:PathCard[],back?:string){
  const card=(c:PathCard,i:number)=>`<button class="rpg-panel path-card${c.mystery?' is-mystery':''}" data-action="path-${esc(c.id)}" style="--card-index:${i}">
   <span class="path-art" style="background-image:url('${esc(c.image)}')">${c.silhouette?`<span class="path-silhouette" aria-hidden="true" style="aspect-ratio:${c.silhouette.width}/${c.silhouette.height};background-image:url('${esc(c.silhouette.url)}');background-size:${c.silhouette.frames*100}% 100%;background-position:${c.silhouette.frames>1?c.silhouette.index/(c.silhouette.frames-1)*100:0}% 0"></span>`:''}<span class="eyebrow">${esc(c.eyebrow)}</span></span>
   <span class="path-body"><h2>${esc(c.title)}</h2>${c.lines.map(l=>`<p>${esc(l)}</p>`).join('')}
   ${c.weak.length?`<span class="path-row"><small>Weak to</small>${elementChips(c.weak,'weak')}</span>`:''}
   ${c.attack.length?`<span class="path-row"><small>Attacks with</small>${elementChips(c.attack)}</span>`:''}
   <span class="card-choose">CHOOSE →</span></span></button>`;
  this.show(`${this.title(eyebrow,title,lead)}<div class="path-grid${cards.length===4?' is-quad':cards.length>=5?' is-six':''}">${cards.map(card).join('')}</div>${back?`<div class="actions">${this.button(back,'Back',true)}</div>`:''}`,'path');
 }
 /** Heroes collection: every drawable hero; locked ones as silhouettes. Hover/focus shows the details. */
 heroes(profile:Profile){
  const keys=Object.keys(this.catalog).filter(k=>this.catalog[k].canonicalIdentity&&this.catalog[k].skills.length)
   .sort((a,b)=>(this.catalog[a].variantLabel??'').localeCompare(this.catalog[b].variantLabel??'')||this.catalog[a].name.localeCompare(this.catalog[b].name));
  const unlocked=new Set(profile.unlocked);
  const tile=(key:string)=>{const c=this.catalog[key],open=unlocked.has(key),bond=profile.bond?.[key]??0;
   return `<button type="button" class="hero-tile ${open?'':'is-locked'}" data-hero="${esc(key)}" aria-label="${esc(open?c.name:'Locked hero')}"><img src="${esc(c.portrait)}" alt="" draggable="false"><span class="hero-name">${esc(open?c.name:'???')}</span>${open&&bond?`<span class="hero-bond">${'◆'.repeat(bond)}</span>`:''}</button>`;};
  this.show(`${this.title('COLLECTION','HEROES',`${keys.filter(k=>unlocked.has(k)).length} of ${keys.length} heroes answer the call. Select a hero for details.`)}<div class="heroes-layout"><div class="hero-grid">${keys.map(tile).join('')}</div><aside class="rpg-panel hero-detail" aria-live="polite"></aside></div><div class="actions">${this.button('menu','Back to title',true)}</div>`,'heroes');
  // Detail panel (2026-11-11): the grid slides left and the panel shows the hero's strongest form,
  // animated, with origin, level range, awakenings, Bond, skills and Limit Burst.
  const layout=this.root.querySelector<HTMLElement>('.heroes-layout')!,panel=this.root.querySelector<HTMLElement>('.hero-detail')!;
  let shown='';
  const select=(key:string)=>{
   if(key===shown)return;shown=key;this.heroAnimation?.();
   const c=this.catalog[key],open=unlocked.has(key),base=levelOf(c),bond=profile.bond?.[key]??0;
   const forms=c.forms??[],top=forms.at(-1),formKey=top?.form??key,manifest=this.manifests[formKey]??this.manifests[key];
   const clip=manifest.animations.idle,path=formKey===key?`units/${key}`:`forms/${formKey}`;
   const scale=Math.min(3,210/clip.frameWidth,200/clip.frameHeight);
   const preview=bodyPreview('/assets/'+path,clip,'pixel-sprite hero-detail-sprite',`position:absolute;margin:0;left:calc(50% - ${clip.pivotX*clip.frameWidth*scale}px);bottom:${21-(1-clip.pivotY)*clip.frameHeight*scale}px;width:${clip.frameWidth*scale}px;height:${clip.frameHeight*scale}px;background-size:${clip.frameWidth*clip.frameCount*scale}px ${clip.frameHeight*scale}px;background-position:${-clip.frames[0].index*clip.frameWidth*scale}px 0`);
   const pips=Array.from({length:MAX_LEVEL},(_,i)=>`<i class="${i+1<base?'below':'reach'}${i+1===base?' start':''}">${i+1}</i>`).join('');
   const skills=c.skills.map(sk=>`<li>${skillIcon(sk)}<span>${esc(sk.name)}</span>${elementChips(skillElements(sk))}</li>`).join('');
   panel.innerHTML=`<div class="hero-detail-stage ${open?'':'is-locked'}"><div class="hero-detail-halo"></div>${preview.html}</div>
    <h2>${esc(open?c.name:'???')}</h2><p class="hero-origin">${esc(c.variantLabel??'')}</p>
    <div class="hero-levels" title="Start level Lv ${base}–${MAX_LEVEL}: the original base rarity sets the floor. Awakening in a run raises it up to Lv ${MAX_LEVEL}."><span>Levels</span><div class="level-pips">${pips}</div><small>Starts at Lv ${base}${base<MAX_LEVEL?` or higher · max Lv ${MAX_LEVEL}`:' (maximum)'}</small></div>
    <dl class="hero-facts"><dt>Base rarity</dt><dd>${esc(rankLabel(c))}</dd><dt>Strongest form</dt><dd>${esc(top?rankLabel(top):rankLabel(c))}${forms.length?` · awakens ${forms.map(f=>rankLabel(f)).join(' → ')}`:''}</dd><dt>Bond</dt><dd>${bond?'◆'.repeat(bond)+` (${bond}/3)`:'None yet'}</dd></dl>
    ${open?`<b>Skills</b><ul class="hero-skills">${skills}</ul>${c.limitBurst?`<b>Limit Burst</b><p class="hero-lb">${esc(c.limitBurst.name)}</p>`:''}`:'<p class="muted">Win an expedition or summon on the title screen to unlock this hero.</p>'}`;
   layout.classList.add('has-detail');
   this.root.querySelectorAll('.hero-tile').forEach(t=>t.classList.toggle('is-selected',(t as HTMLElement).dataset.hero===key));
   // Idle animation on the original frame timings.
   const layers=Array.from(panel.querySelectorAll<HTMLElement>('.hero-detail-sprite,.hero-detail-sprite .body-emission'));
   let frame=0,timer=0;
   const step=()=>{const f=clip.frames[frame%clip.frames.length];layers.forEach(l=>l.style.backgroundPosition=`${-f.index*clip.frameWidth*scale}px 0`);frame++;timer=window.setTimeout(step,Math.max(30,f.durationMs));};
   if(clip.frames.length>1&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)step();
   this.heroAnimation=()=>clearTimeout(timer);
  };
  const grid=this.root.querySelector<HTMLElement>('.hero-grid')!;
  const pick=(event:Event)=>{const t=(event.target as HTMLElement).closest<HTMLElement>('.hero-tile');if(t?.dataset.hero)select(t.dataset.hero);};
  // Click (or keyboard focus) selects; hover no longer does: the panel's height changes with the hero and
  // moved the grid under a resting pointer, which re-selected in a loop (2026-11-11).
  grid.addEventListener('click',pick);grid.addEventListener('focusin',event=>{if((event.target as HTMLElement).matches?.(':focus-visible'))pick(event);});
  const first=keys.find(k=>unlocked.has(k));if(first)select(first);
 }
 private heroAnimation?:()=>void;
 slots(run:RunState,busy:boolean,choices:Record<string,{id:string;name:string}[]>={}){
  const hasTeam=run.party.length>0;
  const exhausted=hasTeam&&run.rerolls===0;
  const hint=busy?'The reels are turning…':!hasTeam?'Pull the crystal lever to summon your party. The first draw is free.':exhausted?'The Fate Engine is spent. Set out with this party.':'Pull again to redraw all four heroes, or set out with this party.';
  const roster=Object.values(this.catalog);
  // Each reel has its own tape; it stops (12 symbols = the -2040px keyframe) on the hero this reel draws,
  // so the last face before the reveal is that hero's (2026-11-11: every reel ended on the same head).
  const LANDING=12;
  const tape=(reel:number,member?:RunMember)=>busy?`<div class="reel-tape" aria-hidden="true">${Array.from({length:18},(_,i)=>{const c=i===LANDING&&member?this.catalog[member.key]:roster[(i*7+reel*5+3)%roster.length];return `<div class="tape-symbol"><img src="${esc(c.portrait)}" alt=""></div>`;}).join('')}</div>`:'';
  const tiers=run.party.map(member=>fateTier(member));
  const timeline=fateTimeline(tiers);
  const verdict=hasTeam?fateVerdict(tiers,run.party.reduce((sum,member)=>sum+member.level,0)):undefined;
  // One scale on screen: a star per level, NV at the top level (src/run/unitForms.mjs MAX_LEVEL).
  const stars=(member:RunMember)=>member.level>=MAX_LEVEL?'<i class="nv-mark">NV</i>'
   :Array.from({length:member.level},(_,i)=>`<i style="--star:${i}">★</i>`).join('');
  const reels=Array.from({length:PARTY_SIZE},(_,i)=>{
   const member=run.party[i];
   const character=member&&this.catalog[member.key];
   const skill=character?.skills.find(s=>s.id===member.skills[0].id);
   const tier=member?tiers[i]:undefined,stop=timeline.stops[i]??1;
   const tip=member&&character&&!busy?`${character.name} · ${character.variantLabel??''} · ${levelLabel(member.level)}${skill?` · Starting skill: ${skill.name} (${skillDescription(skillForRun(skill,member))})`:''}${character.limitBurst?` · Limit Burst: ${character.limitBurst.name}`:''}`:'';
   return `<div class="reel ${tier?'tier-'+tier:''} ${busy?'is-spinning':''} ${busy&&timeline.teases[i]?'is-tease':''}" ${tier?`data-tier="${tier}"`:''} style="--stop-duration:${stop}s" ${tip?`title="${esc(tip)}"`:''}>
    <span class="slot-number">${String(i+1).padStart(2,'0')}</span>
    <div class="reel-window">${tape(i,member)}<span class="fate-burst" aria-hidden="true"></span><div class="final-symbol">${member?this.sprite(member,true):'<span class="unknown-crystal">◆</span>'}</div></div>
    <div class="reel-result">
     ${member?`<span class="fate-stars" aria-label="${levelLabel(member.level)}">${stars(member)}</span>`:'<span class="fate-stars" aria-hidden="true">&nbsp;</span>'}
     ${character?`<span class="role-chip role-${characterRole(character)}">${ROLE_LABELS[characterRole(character)]}</span>`:`<span class="role-chip">${ROLE_LABELS[ROLES[i]]}</span>`}
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
   <div class="actions"><button class="rpg-button secondary" data-action="lever-skip" hidden>Skip animation</button>${hasTeam?this.button('confirm','Set out',false,busy):''}${busy?'':this.button('menu','Back to title',true)}</div>
   ${/* Always reserve the panel so the centred layout never jumps while the reels run. */''}${hasTeam&&!busy?run.party.filter(m=>choices[m.key]?.length).map(m=>`<div class="rpg-panel bond-choice"><span class="eyebrow">BOND · ${esc(this.catalog[m.key].name)}'S STARTING SKILL</span><div class="bond-skills">${choices[m.key].map((s,i)=>`<button type="button" class="rpg-button ${m.skills[0]?.id===s.id?'':'secondary'}" data-action="start-skill-${m.key}-${i}" aria-pressed="${m.skills[0]?.id===s.id}">${esc(s.name)}</button>`).join('')}</div></div>`).join(''):''}<details class="rpg-panel slot-details" ${hasTeam&&!busy?'':'inert style="visibility:hidden"'}><summary>Starting skills & effects</summary>${hasTeam&&!busy?`<div class="start-list">${run.party.map(m=>this.memberLine(m)).join('')}</div>`:''}</details>
   ${run.rules?.awakeningMode==='highest-reviewed'?'<p class="muted">Prototype awakening: highest reviewed original form.</p>':''}`,'setup');
 }
 rewardText(r:Reward,run:RunState){const m=run.party.find(m=>m.key===r.member),c=m?this.catalog[m.key]:null;
  if(r.type==='revive')return {title:'Phoenix Down',detail:`Revive ${c!.name} from K.O. with ${Math.round(REVIVE_HP_SHARE*100)}% base HP.`,tag:'REVIVAL'};
  if(r.type==='weapon'){const w=r.weapon!,old=m!.weapon;
   const own=isSignatureFor(m,w);
   return {title:w.name,detail:[`For ${c!.name} · ${w.category[0].toUpperCase()+w.category.slice(1)}`,weaponSummary(w)||'No bonus',own?`${c!.name}'s own weapon`:'',old?`Replaces ${old.name}`:''].filter(Boolean).join(' · '),
    hint:w.elements.length?WEAPON_ELEMENT_RULE:'',tag:own?'SIGNATURE WEAPON':'WEAPON'};}
  if(r.type==='ward'){const name=ELEMENT_LABELS[r.element!],stage=upcomingStage(run);
   return {title:`${name} Ward`,detail:`Party relic: every ally takes ${WARD_RESIST}% less ${name} damage for the rest of the run. ${stage.name}'s enemies attack with ${name}.`,tag:'PARTY RELIC'};}
  if(r.type==='rest')return {title:'Field Rest',detail:'Restore 40% base HP and 40% maximum MP to living allies. Does not revive.',tag:'PARTY RECOVERY'};
  if(r.type==='evolve'){const m=run.party.find(p=>p.key===r.member)!,body=formForLevel(c!,r.level!);
   return {title:'Awakening',detail:`Raise ${c!.name} to ${levelLabel(r.level!)}${body.form!==m.form?` and awaken the original ${rankLabel(body)} form`:''}. ${run.rules?.originalForms?'Improves HP, MP, power and defense.':'+15% base HP.'}`,tag:'ELITE RELIC'};}
  if(r.type==='stat')return {title:{attack:'Warrior’s Resolve',magic:'Arcane Focus',defense:'Iron Will',hp:'Life Crystal'}[r.stat!],detail:`${c!.name}: +20% base ${r.stat==='hp'?'maximum HP':r.stat==='defense'?'damage resistance rating':r.stat+' power'} for this run.`,tag:'PERMANENT RUN BONUS'};
  const s=c!.skills.find(s=>s.id===r.skill)!;return {title:r.type==='learn'?`Learn ${s.name}`:`Enhance ${s.name}`,detail:skillDescription(skillForRun(s,m!))+(r.type==='skill'?' · Next rank: +20% power or longer effects':m!.skills.length===3?' · Replaces one of 3 skills':''),tag:r.type==='learn'?'NEW ORIGINAL SKILL':'SKILL MASTERY'};
 }
 /** Portrait of the rewarded member; skill rewards add the skill's original icon as a badge. */
 rewardArt(r:Reward,m:RunMember){const c=this.catalog[m.key],skill=(r.type==='learn'||r.type==='skill')?c.skills.find(s=>s.id===r.skill):undefined,icon=skill&&skillIconUrl(skill);
  // Weapons show the original FFBE icon (tools/export_weapons.mjs) with the hero as a small badge.
  if(r.type==='weapon'&&r.weapon){const w=r.weapon;
   return `<span class="reward-portrait is-weapon">${w.icon?`<img src="${esc(w.icon)}" alt="${esc(w.name)}">`:`<b class="weapon-glyph" aria-hidden="true">${WEAPON_GLYPHS[w.category]??'⚔'}</b>`}<img class="hero-badge" src="${esc(c.portrait)}" alt="${esc(c.name)}"></span>`;}
  return `<span class="reward-portrait ${icon?'has-skill':''}"><img src="${esc(c.portrait)}" alt="${esc(c.name)}">${icon?`<img class="skill-badge" src="${esc(icon)}" alt="">`:''}</span>`;}
 rewards(run:RunState){this.show(`${this.title('VICTORY','THE SPOILS OF FATE','Choose one reward for your expedition.')}${(earned=>earned?`<p class="gil-note">+${earned} Gil · purse ${run.gil??0} Gil</p>`:'')(GIL_REWARD[currentFight(run)?.kind??'normal'])}${campNote(run)?`<p class="camp-note">${esc(campNote(run)!)}</p>`:''}<div class="reward-grid">${run.offers.map((r,i)=>{const t=this.rewardText(r,run),m=run.party.find(m=>m.key===r.member);return `<article class="reward-option" style="--card-index:${i}"><button class="rpg-panel reward-card kind-${r.type} ${r.type==='weapon'&&isSignatureFor(m,r.weapon)?'is-signature':''}" data-action="reward-${i}" title="${esc(t.title+' — '+t.detail+('hint' in t&&t.hint?' '+t.hint:''))}"><span class="eyebrow">${t.tag}</span><span class="reward-head">${m?this.rewardArt(r,m):r.type==='ward'?`<span class="reward-portrait crystal-icon ward-icon">${elementChip(r.element!)}</span>`:'<span class="reward-portrait crystal-icon">✦</span>'}<h2>${esc(t.title)}</h2></span>${(els=>els.length?`<span class="reward-elements">${elementChips(els)}</span>`:'')(r.type==='weapon'?r.weapon?.elements??[]:(r.type==='learn'||r.type==='skill')&&m?skillElements(this.catalog[m.key].skills.find(x=>x.id===r.skill)!):[])}${r.type==='weapon'&&r.weapon?rarityBadge(r.weapon.rarity):''}<ul class="reward-lines">${t.detail.split(' · ').map(l=>`<li>${esc(l)}</li>`).join('')}</ul><span class="card-choose">CHOOSE →</span></button></article>`;}).join('')}</div>${PEEK_BUTTON}`,'rewards');this.bindPeek(run);
 }

 /** What a map node holds, for the side panel and the node's tooltip (one line each). */
 nodeDetail(run:RunState,node:MapNode){
  const stage=stageForArea(run.areas[run.map.act]),name=(key:string)=>ENEMY_CONTENT[key]?.name??key;
  switch(node.type){
   case 'battle':return {title:'Battle',lines:[`Enemies: ${[...new Set(stage.enemyPool)].map(name).join(', ')}`,`Win: +${GIL_REWARD.normal} Gil and one reward`]};
   case 'elite':{const affix=eliteAffix(run.seed,node.id);return {title:`Elite · ${name(eliteEnemyKey(run,node.id,stage))}`,tag:affix.name,tagText:affix.text,
    lines:[`${affix.name}: ${affix.text}`,`Win: +${GIL_REWARD.elite} Gil, an awakening among the rewards`]};}
   case 'boss':{const rule=bossRule(run.seed,run.map.act),final=!!run.areas[run.map.act].final;return {title:`${final?'Final boss':'Boss'} · ${name(stage.bossId)}`,tag:rule.name,tagText:rule.text,
    lines:[`Rule · ${rule.name}: ${rule.text}`,final?'Defeat it to end the journey':`Win: +${GIL_REWARD.boss} Gil, an awakening, then the next act`]};}
   case 'event':return {title:'Crystal shrine',lines:['Pray for a blessing for every hero, or risk a curse.']};
   case 'merchant':return {title:'Moogle merchant',lines:['Spend Gil on potions, tomes and weapons.']};
   case 'campfire':return {title:'Campfire',lines:[`Rest (living allies recover ${Math.round(CAMP_REST*100)}% HP and MP) or train a skill.`]};
   case 'treasure':return {title:'Treasure',lines:[`A chest with ${TREASURE_GIL.min}–${TREASURE_GIL.max} Gil, often a weapon.`]};
  }
 }
 /** Act map (loop v2, "FF Graphite", mockup B · Act map): the map left, party and the chosen node right.
  * Reachable nodes are buttons (map-node-<id>); the chosen one is entered with map-go. */
 actMap(run:RunState,selected:string|null){
  const map=runMap(run),options=new Set(mapOptions(run).map(n=>n.id)),trail=new Set(run.map.trail),at=run.map.at;
  const area=run.areas[run.map.act],stage=stageForArea(area),final=!!area.final,acts=run.areas.filter(a=>!a.final).length;
  // Board coordinates in percent: four columns, rows from the bottom; the boss sits on top (centre for the final room).
  const pos=(n:MapNode)=>n.type==='boss'?{x:50,y:final?50:14}:{x:13+n.col*(74/3),y:91-n.row*11.4};
  const byId=new Map(map.nodes.map(n=>[n.id,n]));
  const edges=map.nodes.flatMap(n=>n.next.map(id=>{const a=pos(n),b=pos(byId.get(id)!),walked=trail.has(n.id)&&trail.has(id);
   const open=n.id===at&&options.has(id);
   return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="${walked?'is-walked':open?'is-open':''}"/>`;})).join('');
  const node=(n:MapNode)=>{const p=pos(n),state=n.id===at?'is-current':trail.has(n.id)?'is-visited':options.has(n.id)?'is-open':'is-locked';
   const detail=this.nodeDetail(run,n),label=`${detail.title}${options.has(n.id)?'':state==='is-visited'||state==='is-current'?' (visited)':' (not reachable yet)'}`;
   if(n.type==='boss'){const rule=bossRule(run.seed,run.map.act);
    return `<button type="button" class="map-node map-boss ${state} ${selected===n.id?'is-selected':''}" style="left:${p.x}%;top:${p.y}%" data-action="map-node-${n.id}" aria-label="${esc(label)}" ${options.has(n.id)?'':'aria-disabled="true"'}>
     ${nodeIcon('boss')}<b>${esc(ENEMY_CONTENT[stage.bossId]?.name??'Boss')}</b><small title="${esc(rule.text)}">Rule · ${esc(rule.name)}</small></button>`;}
   return `<button type="button" class="map-node type-${n.type} ${state} ${selected===n.id?'is-selected':''}" style="left:${p.x}%;top:${p.y}%" data-action="map-node-${n.id}" aria-label="${esc(label)}" title="${esc(detail.lines.join(' · '))}" ${options.has(n.id)?'':'aria-disabled="true"'}>${nodeIcon(n.type)}<span>${esc(NODE_LABELS[n.type].replace('Moogle ',''))}</span></button>`;};
  const chosen=selected?byId.get(selected):undefined,detail=chosen&&this.nodeDetail(run,chosen);
  const profile=stageElementProfile(stage);
  const party=run.party.map(m=>{const c=this.catalog[m.key],role=characterRole(c);
   return `<li class="map-member${m.hp<=0?' is-ko':''}"><span class="portrait-frame"><img class="portrait" src="${esc(c.portrait)}" alt=""></span><div><p class="map-member-head"><strong>${esc(c.name)}</strong><span class="role-chip role-${role}">${ROLE_LABELS[role]}</span><small>${esc(levelLabel(m.level))}</small></p>${gaugeRow('hp',m.hp,Math.round(c.maxHp*m.stats.hp))}${gaugeRow('mp',m.mp,memberMaxMp(c,m))}</div></li>`;}).join('');
  const fights=run.history.filter(h=>(h as {kind?:string}).kind==='reward').length;
  this.show(`<div class="map-screen">
   <header class="map-top"><span class="act-chip">${final?'FINAL ROOM':`ACT ${run.map.act+1} OF ${acts}`}</span><span class="map-meta">${esc(area.name)} · ${fights} fight${fights===1?'':'s'} won</span><span class="map-gil">${run.gil??0} Gil</span></header>
   <section class="map-board rpg-panel" aria-label="Act map">
    <h1 class="map-heading">${final?'The final room':'Choose your path'}</h1>
    <svg class="map-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${edges}</svg>
    ${map.nodes.map(node).join('')}
   </section>
   <aside class="map-side">
    <section class="rpg-panel map-panel"><h2 class="panel-label">Party</h2><ul class="map-party">${party}</ul></section>
    <section class="rpg-panel map-panel"><h2 class="panel-label">${esc(stage.name)}</h2><p class="map-stage">${esc(stage.theme)}</p>
     ${profile.weak.length?`<p class="map-elements">Weak to ${elementChips(profile.weak as Element[])}</p>`:''}${profile.attack.length?`<p class="map-elements">Attacks with ${elementChips(profile.attack as Element[])}</p>`:''}</section>
    <section class="rpg-panel map-panel map-selected ${detail?'has-node':''}">${detail&&chosen?`<h2 class="panel-label">Next stop</h2><h3>${nodeIcon(chosen.type)}${esc(detail.title)}</h3>${'tag' in detail&&detail.tag?`<span class="rule-chip" title="${esc(detail.tagText??'')}">${esc(detail.tag)}</span>`:''}<ul>${detail.lines.map(l=>`<li>${esc(l)}</li>`).join('')}</ul>${this.button('map-go',COMBAT_NODES.has(chosen.type)?'Fight':'Go')}`
     :`<h2 class="panel-label">Next stop</h2><p class="muted">Choose a glowing node on the map. The run is saved after every stop.</p>`}</section>
    <div class="map-actions">${this.button('menu','Save and quit',true)}</div>
   </aside>
  </div>`,'map');
  if(chosen)this.root.querySelector<HTMLElement>('[data-action=map-go]')?.focus();
  else this.root.querySelector<HTMLElement>('.map-node.is-open')?.focus();
 }
 /** Run event between fights (src/run/runEvents.mjs): camp, Moogle merchant or crystal shrine. */
 event(run:RunState){const e=run.event!,gil=run.gil??0,name=(key?:string)=>key?this.catalog[key]?.name??key:'',
  skillName=(key?:string,id?:string)=>this.catalog[key??'']?.skills.find(s=>s.id===id)?.name??id??'',
  level=(key?:string,id?:string)=>run.party.find(m=>m.key===key)?.skills.find(s=>s.id===id)?.level??1;
  const party=`<div class="event-party">${run.party.map(m=>{const c=this.catalog[m.key];return `<div class="event-member${m.hp<=0?' is-ko':''}"><span class="portrait-frame"><img class="portrait" src="${esc(c.portrait)}" alt=""></span><div><strong>${esc(c.name)}</strong>${gaugeRow('hp',m.hp,Math.round(c.maxHp*m.stats.hp))}${gaugeRow('mp',m.mp,memberMaxMp(c,m))}</div></div>`;}).join('')}</div>`;
  const card=(action:string,tag:string,icon:string,title:string,lines:string[],choose='CHOOSE →',disabled=false,i=0)=>`<article class="reward-option" style="--card-index:${i}"><button class="rpg-panel reward-card event-card" data-action="${action}" ${disabled?'disabled':''}><span class="eyebrow">${esc(tag)}</span><span class="reward-head"><span class="reward-portrait crystal-icon">${icon}</span><h2>${esc(title)}</h2></span><ul class="reward-lines">${lines.map(l=>`<li>${esc(l)}</li>`).join('')}</ul><span class="card-choose">${esc(choose)}</span></button></article>`;
  const purse=`<p class="gil-note">Purse: <b>${gil} Gil</b></p>`;
  if(e.kind==='camp'){
   this.show(`${this.title('A QUIET CLEARING','CAMPFIRE','The fire crackles. Rest, or sharpen a technique before moving on.')}${party}<div class="reward-grid event-grid">${card('event-rest','PARTY RECOVERY','🔥','Rest by the Fire',[`Living allies recover ${Math.round(CAMP_REST*100)}% of their maximum HP and MP.`,'K.O. allies stay down.'],'REST →')}${e.train?card('event-train','TRAINING','⚔',`Train ${skillName(e.train.member,e.train.skill)}`,[`${name(e.train.member)} practises until dawn.`,`${skillName(e.train.member,e.train.skill)} Lv ${level(e.train.member,e.train.skill)} → Lv ${level(e.train.member,e.train.skill)+1}: 20% more power.`],'TRAIN →',false,1):''}</div>`,'event');
   return;
  }
  if(e.kind==='merchant'){
   const ware=(w:MerchantWare,i:number)=>{const sold=e.sold!.includes(i),short=gil<w.price;
    const text:Record<MerchantWare['item'],[string,string,string[]]>={
     potion:['🧪','Hi-Potion',[`Living allies recover ${Math.round(MERCHANT_RESTORE*100)}% of their maximum HP.`]],
     ether:['💧','Ether Pack',[`Living allies recover ${Math.round(MERCHANT_RESTORE*100)}% of their maximum MP.`]],
     phoenix:['🪶','Phoenix Down',[`Revive ${name(w.member)} with 50% HP.`]],
     tome:['📖',`Tome of ${skillName(w.member,w.skill)}`,[`${name(w.member)}: ${skillName(w.member,w.skill)} Lv ${level(w.member,w.skill)} → Lv ${level(w.member,w.skill)+1} (20% more power).`]],
     weapon:[WEAPON_GLYPHS[w.weapon?.category??'']??'⚔',w.weapon?.name??'Weapon',[`For ${name(w.member)}: ${w.weapon?weaponSummary(w.weapon):''}`,`${'★'.repeat(w.weapon?.rarity??0)} · replaces the current weapon`]]};
    const [icon,title,lines]=text[w.item];
    return card('event-buy-'+i,sold?'SOLD':`${w.price} GIL`,icon,title,lines,sold?'SOLD OUT':short?'NOT ENOUGH GIL':`BUY · ${w.price} GIL →`,sold||short,i);};
   this.show(`${this.title('A TRAVELLING SHOP','MOOGLE MERCHANT','“Kupo! Fine wares for brave adventurers, kupo!”')}${purse}${party}<div class="reward-grid event-grid is-shop">${e.wares!.map(ware).join('')}</div><div class="actions">${this.button('event-leave','Move on')}</div>`,'event');
   return;
  }
  if(e.kind==='treasure'){const t=e.treasure!,w=t.weapon;
   this.show(`${this.title('A FORGOTTEN CACHE','TREASURE',`The chest holds ${t.gil} Gil${w?' and a weapon':''}.`)}${purse}${party}<div class="reward-grid event-grid">${w?card('event-take','WEAPON','⚔',w.name,[`For ${name(t.member)}: ${weaponSummary(w)}`,`${'★'.repeat(w.rarity)} · replaces the current weapon`,`+${t.gil} Gil`],'TAKE ALL →'):''}${card('event-leave','GIL ONLY','◆',`${t.gil} Gil`,[w?'Pocket the Gil and leave the weapon.':'Pocket the Gil.'],'TAKE GIL →',false,1)}</div>`,'event');
   return;
  }
  const stat={attack:'attack power',magic:'magic power',defense:'damage resistance',hp:'maximum HP'}[e.stat!];
  if(!e.result){
   this.show(`${this.title('AN ANCIENT CRYSTAL','CRYSTAL SHRINE','A crystal hums with old power. It answers prayers, but not always kindly.')}${party}<div class="reward-grid event-grid">${card('event-pray','A GAMBLE','✦','Pray to the Crystal',[`${Math.round(SHRINE.chance*100)}%: every hero gains +${Math.round(SHRINE.bonus*100)}% ${stat} for this run.`,`${100-Math.round(SHRINE.chance*100)}%: living allies lose ${Math.round(SHRINE.curse*100)}% of their current HP.`],'PRAY →')}${card('event-leave','SAFE','➜','Move On',['Leave the crystal undisturbed.'],'LEAVE →',false,1)}</div>`,'event');
   return;
  }
  const blessed=e.result==='blessing';
  this.show(`${this.title('AN ANCIENT CRYSTAL',blessed?'THE CRYSTAL BLESSES YOU':'THE CRYSTAL TAKES ITS PRICE',blessed?`Every hero gains +${Math.round(SHRINE.bonus*100)}% ${stat} for this run.`:`Living allies lose ${Math.round(SHRINE.curse*100)}% of their current HP.`)}${party}<div class="actions">${this.button('event-leave','Continue')}</div>`,'event');
 }
 replacement(run:RunState,index:number){const r=run.offers[index],m=run.party.find(m=>m.key===r.member)!,c=this.catalog[m.key],incoming=skillForRun(c.skills.find(s=>s.id===r.skill)!,m);
  this.show(`${this.title('SKILL SLOTS FULL','MAKE ROOM',`${c.name} can hold three skills. Choose one to forget, or keep the current skills and pick another reward.`)}
  <div class="rpg-panel swap-new"><span class="eyebrow">NEW SKILL · ${esc(c.name)}</span><h2>${skillIcon(incoming)}${esc(incoming.name)}</h2><p>${esc(skillDescription(incoming))}</p></div>
  <div class="swap-grid">${m.skills.map((s,i)=>{const a=skillForRun(c.skills.find(x=>x.id===s.id)!,m);return `<button class="rpg-panel swap-card" data-action="replace-${i}"><span class="eyebrow">FORGET</span><h2>${skillIcon(a)}${esc(a.name)}${s.level>1?' +'+(s.level-1):''}</h2><p>${esc(skillDescription(a))}</p>${s.level>1?'<small>Its rank bonus is lost.</small>':''}<span class="card-choose">FORGET →</span></button>`;}).join('')}</div>
  <div class="actions">${this.button('cancel','Keep current skills',true)}</div>${PEEK_BUTTON}`,'replacement');this.bindPeek(run);}
 party(run:RunState){this.show(`${this.title('EXPEDITION PARTY','YOUR COMPANIONS',`Seed ${run.seed} · your companions for this journey`)}<div class="party-grid">${run.party.map(m=>this.member(m)).join('')}</div>${this.button('close','Return to battle')}`,'party');}
 result(run:RunState,earned?:{crystals:number;unlocked:string|null}){this.show(`${this.title(run.phase==='won'?'EXPEDITION COMPLETE':'THE CRYSTAL FALLS',run.phase==='won'?'A NEW LEGEND':'ANOTHER DAWN',run.phase==='won'?'Your companions endured the rift. Their journey is complete.':'The expedition has ended. A new seed begins a fresh story.')}<div class="party-grid">${run.party.map(m=>this.member(m)).join('')}</div><p class="muted">Seed ${esc(run.seed)} · ${run.history.filter((h:any)=>h.kind==='reward').length} rewards chosen</p>${earned?`<p class="profile-line"><span>+${earned.crystals} ◆ crystals</span></p>${earned.unlocked?this.heroCard(earned.unlocked,'A NEW HERO ANSWERS THE CALL'):''}`:''}${this.button('new','Return to title')}`,'result');this.revealHeroes(1100);}
 /** New hero card (2026-11-11): the full animated idle body, veiled as a glowing silhouette until
  * revealHeroes() lifts the veil with a burst and the name. */
 heroCard(key:string,label:string){const c=this.catalog[key],a=this.manifests[key].animations.idle;
  const scale=Math.min(2,170/a.frameWidth,170/a.frameHeight);
  const preview=bodyPreview('/assets/units/'+key,a,'pixel-sprite hero-unlock-sprite',`width:${a.frameWidth*scale}px;height:${a.frameHeight*scale}px;background-size:${a.frameWidth*a.frameCount*scale}px ${a.frameHeight*scale}px;background-position:${-a.frames[0].index*a.frameWidth*scale}px 0`);
  return `<article class="rpg-panel hero-unlock is-veiled" data-unlock="${esc(key)}" data-scale="${scale}"><span class="eyebrow">${esc(label)}</span><div class="hero-unlock-stage"><span class="hero-unlock-burst" aria-hidden="true"></span>${preview.html}</div><strong aria-live="polite"><span class="unlock-unknown">???</span><span class="unlock-name">${esc(c.name)}</span></strong></article>`;}
 /** Animates every veiled hero card on its original idle timings and reveals it after delayMs. */
 revealHeroes(delayMs:number){
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches,timers:number[]=[];
  for(const card of Array.from(this.root.querySelectorAll<HTMLElement>('.hero-unlock[data-unlock]'))){
   const a=this.manifests[card.dataset.unlock!].animations.idle,scale=Number(card.dataset.scale);
   const layers=Array.from(card.querySelectorAll<HTMLElement>('.hero-unlock-sprite,.hero-unlock-sprite .body-emission'));
   let frame=0;
   const step=()=>{const f=a.frames[frame%a.frames.length];layers.forEach(l=>l.style.backgroundPosition=`${-f.index*a.frameWidth*scale}px 0`);frame++;timers.push(window.setTimeout(step,Math.max(30,f.durationMs)));};
   if(a.frames.length>1&&!reduced)step();
   timers.push(window.setTimeout(()=>{card.classList.remove('is-veiled');card.classList.add('is-revealed');this.onSound('confirm');},reduced?0:delayMs));
  }
  const previous=this.heroAnimation;this.heroAnimation=()=>{previous?.();timers.forEach(clearTimeout);};
 }
 /**
  * Summon roulette (case style): a strip of hero heads, drawn with the real summon weights and edged in
  * their Fate Engine tier colour, slows down under the marker and stops on the summoned hero. The hero is
  * already decided and saved; this is presentation only. Skip lands at once; reduced motion skips the run.
  */
 summoned(key:string,crystals:number,bond=0,refund=0,pool:{key:string;weight:number}[]=[{key,weight:1}]){const name=esc(this.catalog[key].name);
  const text=refund?`${name} answers again at full Bond. The crystal returns ${refund} ◆.`:bond?`${name} answers again. Bond ${bond}: ${['','drawn more often by the Fate Engine','you choose the starting skill','never starts below Lv 2'][bond]}.`:`The crystal resonates. ${name} may now be drawn by the Fate Engine.`;
  const tierOf=(k:string)=>fateTier({rarity:this.catalog[k].rarity,level:levelOf(this.catalog[k])});
  const total=pool.reduce((sum,entry)=>sum+entry.weight,0);
  const randomKey=()=>{let roll=Math.random()*total;for(const entry of pool){roll-=entry.weight;if(roll<0)return entry.key;}return pool[0].key;};
  const TILES=46,WINNER=40,tiles=Array.from({length:TILES},(_,i)=>i===WINNER?key:randomKey());
  const tier=tierOf(key),start=levelOf(this.catalog[key]);
  const tile=(k:string,i:number)=>`<li class="case-tile tier-${tierOf(k)}" ${i===WINNER?'data-winner':''}><img src="${esc(this.catalog[k].portrait)}" alt="" draggable="false"></li>`;
  this.show(`<div class="summon-case"><div class="eyebrow">FATE ENGINE</div><h1>SUMMONING…</h1><div class="case-window"><ol class="case-strip">${tiles.map(tile).join('')}</ol><span class="case-marker" aria-hidden="true"></span></div></div>
   <div class="summon-result" hidden>${this.title('FATE ENGINE',bond||refund?'A BOND DEEPENS':'A HERO ANSWERS',text)}<div class="summon-hero tier-${tier}">${this.heroCard(key,bond||refund?`BOND ${bond}`:'NEW HERO')}<p class="summon-rank">${esc(rankLabel(this.catalog[key]))} base · starts at ${levelLabel(start)} or higher</p></div><p class="muted">◆ ${crystals} crystals left</p>${this.button('close','Return to title')}</div>`,'result');
  const strip=this.root.querySelector<HTMLElement>('.case-strip')!,windowEl=this.root.querySelector<HTMLElement>('.case-window')!;
  const winner=strip.querySelector<HTMLElement>('[data-winner]')!;
  const step=winner.offsetWidth+parseFloat(getComputedStyle(strip).columnGap||'0');
  const center=windowEl.clientWidth/2;
  // Stop somewhere inside the winning head, not always dead centre (the case "almost" feeling).
  const target=-(WINNER*step+winner.offsetWidth/2-center+(Math.random()-.5)*winner.offsetWidth*.6);
  let landed=false,frame=0,lastTile=-1,lastTick=0;
  const timers:number[]=[];
  this.slotAudioCleanup=()=>{cancelAnimationFrame(frame);timers.forEach(clearTimeout);};
  const reveal=()=>{const result=this.root.querySelector<HTMLElement>('.summon-result');if(!result)return;
   this.root.querySelector('.summon-case')?.classList.add('is-done');result.hidden=false;result.querySelector<HTMLElement>('button')?.focus();
   // A known hero (Bond) is shown at once; a new one rises from its silhouette.
   if(bond||refund)this.root.querySelectorAll('.hero-unlock').forEach(c=>c.classList.remove('is-veiled'));this.revealHeroes(bond||refund?0:900);};
  const land=()=>{if(landed)return;landed=true;cancelAnimationFrame(frame);
   strip.style.transition='none';strip.style.transform=`translateX(${target}px)`;
   winner.classList.add('is-landed');windowEl.classList.add('tier-'+tier,'is-landed');
   const show=isShowTier(tier);
   this.onSample(FATE_SOUND[tier],FATE_GAIN[tier]);
   if(show){this.onSample(FATE_SOUND.fireworks,FATE_GAIN.fireworks);if(tier==='nv')this.onSample(FATE_SOUND.awaken,FATE_GAIN.awaken);}
   timers.push(window.setTimeout(reveal,show?1400:850));};
  this.on('summon-skip',()=>{land();reveal();});
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){land();return;}
  // One tick per head that passes the marker, like a case opening.
  const tick=()=>{const x=new DOMMatrixReadOnly(getComputedStyle(strip).transform).m41,index=Math.floor((center-x)/step),now=performance.now();
   if(index!==lastTile&&now-lastTick>28){lastTile=index;lastTick=now;this.onSound('select',1+Math.random()*.08);}
   if(!landed)frame=requestAnimationFrame(tick);};
  this.onSample(FATE_SOUND.slide,FATE_GAIN.slide);
  requestAnimationFrame(()=>{strip.style.transition='transform 6.4s cubic-bezier(.08,.72,.16,1)';strip.style.transform=`translateX(${target}px)`;frame=requestAnimationFrame(tick);});
  strip.addEventListener('transitionend',land,{once:true});}
 dialog(title:string,text:string,accept='Confirm'){this.show(`${this.title('EXPEDITION',esc(title),text)}<div class="actions">${this.button('accept',accept)}${this.button('cancel','Cancel',true)}</div>`,'dialog');}
 error(message:string,discard=false){this.show(`${this.title('SAVE UNAVAILABLE','THE PATH IS CLOSED',message)}${this.button('reload','Reload saved journey')}${discard?this.button('discard','Discard incompatible save and return',true):''}`,'error');}
}

const PEEK_BUTTON='<button type="button" class="rpg-button secondary reward-peek" aria-pressed="false">Show my party</button>';
/** Weapon rarity as a coloured badge (2026-11-11): bronze 1-3★, silver 4★, gold 5★, rainbow 6★, prism 7★+. */
export function rarityBadge(rarity:number){const tier=rarity>=7?'prism':rarity>=6?'rainbow':rarity>=5?'gold':rarity>=4?'silver':'bronze';
 return `<span class="rarity-badge is-${tier}" title="${rarity}★ weapon">${'★'.repeat(Math.min(rarity,7))}${rarity>7?'+':''}<em>${{bronze:'Common',silver:'Rare',gold:'Epic',rainbow:'Legendary',prism:'Mythic'}[tier]}</em></span>`;}
/** Equipped weapon line for hero cards: category glyph, name, rarity and element chips; tooltip holds the effect. */
/** Signature weapons (the hero's own trust weapon) get a gold SIGNATURE tag when the member is known. */
export function weaponLine(w:RunWeapon,m?:RunMember){const own=!!m&&isSignatureFor(m,w);return `<p class="weapon-line${own?' is-signature':''}" title="${esc(weaponSummary(w))}"><span class="weapon-glyph" aria-hidden="true">${WEAPON_GLYPHS[w.category]??'⚔'}</span><span>${esc(w.name)}</span><small>${'★'.repeat(w.rarity)}</small>${own?'<em class="signature-tag">SIGNATURE</em>':''}${elementChips(w.elements)}</p>`;}

/** After an act boss: the next act starts with a camp (runState.mjs AREA_CAMP). */
function campNote(run:RunState){const fight=currentFight(run),next=fight&&run.areas[fight.area+1];
 if(fight?.kind!=='boss'||!next)return null;
 return `Act cleared · camp before ${next.name}: living allies recover ${Math.round(AREA_CAMP.hp*100)}% HP and ${Math.round(AREA_CAMP.mp*100)}% MP.`;}
/** Map node glyphs: inline stroke icons (24-unit box), coloured by the node's CSS. */
const NODE_ICONS:Record<NodeType,string>={
 battle:'<path d="M5 19 19 5M14 5h5v5M19 19 5 5M5 10V5h5"/>',
 elite:'<path d="M12 3 4 7v5c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V7z"/><path d="m9 11 3 3 3-3"/>',
 event:'<path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5v.5"/><circle cx="12" cy="12" r="9"/>',
 merchant:'<path d="M6 8h12l-1 12H7z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
 campfire:'<path d="M12 3c2 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-8z"/><path d="M5 21h14"/>',
 treasure:'<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M4 13h16M12 12v3M5 9c0-3 3-5 7-5s7 2 7 5"/>',
 boss:'<path d="m4 8 4 4 4-7 4 7 4-4-2 11H6z"/>',
};
const nodeIcon=(type:NodeType)=>`<svg class="node-icon" viewBox="0 0 24 24" aria-hidden="true">${NODE_ICONS[type]}</svg>`;
