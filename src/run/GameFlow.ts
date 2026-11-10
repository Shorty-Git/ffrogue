import type Phaser from 'phaser';
import type {UnitManifest} from '../types/manifest';
import type {RunState,RunRules} from './runState.mjs';
import {RunStore,createRun,variantAreas,courseAreas,FINAL_STAGES,routeOptions,chooseRoute,rollParty,confirmParty,chooseStartSkill,completeBattle,chooseReward,encounters,acknowledgeAwakening} from './runState.mjs';
import {runCatalog} from './catalog';
import {ProfileStore,chooseFavorite,favoriteChoices,MAX_FAVORITES,drawCatalog,lockedHeroes,settleRun,summonHero,summonPool,SUMMON_COST,type Profile} from './profile.mjs';
import {RunUI} from '../ui/RunUI';
import {EncounterTransition} from '../ui/EncounterTransition';
import {ALL_FATE_SOUNDS,fateSoundUrl,fateTier,fateTimeline} from '../ui/fateEngine';
import {captureEncounter} from '../ui/captureEncounter';
import type {UnitActor} from '../entities/UnitActor';
import type {BattleScene} from '../scenes/BattleScene';
import {recommendMusic} from '../audio/musicProfiles.mjs';
import {GameAudio,HOME_MUSIC_RESOURCE,VICTORY_FANFARE_RESOURCE,battleCursorProfiles,type BattleCursorProfile,type UiSound} from '../audio/battleMusic';
import type {CombatCue} from '../audio/combatCues';
import {runEncounter} from './runBalance.mjs';
import {STAGE_CONTENT,ENEMY_CONTENT,stageElementProfile,type StageDefinition} from './stageContent.mjs';
import type {PathCard} from '../ui/RunUI';
import {createTrainingRun,type TrainingOpponent} from './trainingRun';
import {renderTrainingSetup,type TrainingSelection} from '../ui/TrainingSetup';
import {BATTLE_ARENAS,type BattleArenaKey} from '../data/battleArenas';

const GUIDE_SEEN='ffrogue.guide.v1';
const readFlag=(key:string)=>{try{return window.localStorage.getItem(key)==='1';}catch{return false;}};
const writeFlag=(key:string)=>{try{window.localStorage.setItem(key,'1');}catch{/* private mode: the guide may show again */}};
export class GameFlow{
 readonly rules:RunRules;
 private readonly audio:GameAudio;
 private battleCursor:BattleCursorProfile='felt';
 private entry?:EncounterTransition;
 readonly catalog;readonly store;readonly ui;private readonly profiles;profile:Profile;state:RunState|null=null;private animationTimer?:ReturnType<typeof setTimeout>;private busy=false;
 constructor(readonly scene:Phaser.Scene,readonly manifests:Record<string,UnitManifest>){this.audio=new GameAudio(scene.sound);this.rules=(scene.cache.json.get('run_rules')as RunRules)??{awakeningMode:'sequential'};this.catalog=runCatalog(scene,manifests);this.store=new RunStore(window.localStorage,this.catalog);this.profiles=new ProfileStore(window.localStorage,this.catalog);this.profile=this.profiles.load();this.ui=new RunUI(this.catalog,manifests);this.ui.onError=error=>this.fail(error);this.ui.onSound=(event,rate)=>this.audio.playUi(event,rate);this.ui.onSample=(sound,gain)=>this.audio.playSample(fateSoundUrl(sound),gain);const resize=()=>{this.placeBattleToolbar();if(this.ui.root.classList.contains('victory-overlay'))this.ui.overBattle(this.rewardBounds());};window.addEventListener('resize',resize);scene.scale.on('resize',resize);this.menu();}
 private closeEntry(){this.entry?.close();this.entry=undefined;}
 private fail(error:unknown){this.closeEntry();this.audio.setMusic(null);clearTimeout(this.animationTimer);this.busy=false;this.scene.scene.stop('BattleScene');this.ui.error(String(error));this.ui.on('reload',()=>location.reload());}
 private commit(next:RunState){this.store.save(next);this.state=next;}
 menu(){this.closeEntry();this.audio.setMusic(HOME_MUSIC_RESOURCE,'home');if(this.scene.scene.isActive('BattleScene'))this.scene.scene.stop('BattleScene');this.busy=false;clearTimeout(this.animationTimer);
  try{this.state=this.store.load();const drawable=this.profile.unlocked.length+lockedHeroes(this.profile,this.catalog).length;this.ui.menu(!!this.state,null,{crystals:this.profile.crystals,unlocked:this.profile.unlocked.length,total:drawable,cost:SUMMON_COST,canSummon:this.profile.crystals>=SUMMON_COST});this.audioControls();if(this.state?.phase==='battle'){const note=document.createElement('p');note.className='muted';note.textContent='Continue restarts the current encounter from its saved starting state.';this.ui.root.querySelector('.menu-panel')?.append(note);}}catch(error){this.ui.error(String(error),true);this.ui.on('reload',()=>location.reload());this.ui.on('discard',()=>{this.store.clear();this.state=null;this.menu();});return;}
  this.ui.on('training',()=>this.training());
  this.ui.on('heroes',()=>{this.ui.heroes(this.profile);this.ui.on('menu',()=>this.menu());});
  this.ui.on('summon',()=>this.summon());
  this.ui.on('guide',()=>{this.ui.guide('menu','Back to title');this.ui.on('menu',()=>this.menu());});
  this.ui.on('continue',()=>this.route());this.ui.on('play',()=>{const seed=(this.ui.root.querySelector('#run-seed')as HTMLInputElement).value.trim()||new URLSearchParams(location.search).get('seed')||crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
   // The journey starts with the choice of the final boss room (2026-11-11).
   const begin=(finalStage:string)=>{try{this.commit(createRun(seed,this.catalog,new URLSearchParams(location.search).get("arenaVariants")==="1"?variantAreas(seed):courseAreas(seed,finalStage),this.rules));this.audio.clearRunPosition();this.setup();}catch(e){this.fail(e);}};
   const boss=()=>this.chooseFinalBoss(begin);
   // First journey on this browser: the short guide comes first (once).
   const guide=()=>{if(readFlag(GUIDE_SEEN))boss();else{this.ui.guide('guide-done',"Let's go");this.ui.on('guide-done',()=>{writeFlag(GUIDE_SEEN);boss();});}};
   // Once per profile: the favourite Final Fantasy picks the starting heroes (2026-11-11).
   const start=()=>{if(this.profile.favorite){guide();return;}
    this.ui.favorite(favoriteChoices(this.catalog),MAX_FAVORITES,games=>{this.profile=this.profiles.save(chooseFavorite(this.profile,this.catalog,games));guide();});};
   if(this.state){this.ui.dialog('Begin a new expedition?','The saved expedition will be abandoned. Rerolls and upgrades belong only to that run.','Start new run');this.ui.on('accept',start);this.ui.on('cancel',()=>this.menu());}else start();});
 }
 /** Training grounds: free party, form and skill choice against endurance opponents; never saved. */
 private training(){
  this.closeEntry();clearTimeout(this.animationTimer);this.busy=false;
  if(this.scene.scene.isActive('BattleScene'))this.scene.scene.stop('BattleScene');
  delete document.body.dataset.training;
  this.audio.setMusic(HOME_MUSIC_RESOURCE,'home');
  this.ui.show('<div class="training-setup"></div>','training');
  const arenas=(Object.keys(BATTLE_ARENAS) as BattleArenaKey[]).map(key=>{const arena=BATTLE_ARENAS[key] as {name?:string;title?:string};
   return {key,label:arena.name?`${arena.name}${arena.title?` (${arena.title})`:''}`:{forest:'Forest Clearing',reactor:'Mako Reactor'}[key as string]??key};});
  const opponents:{key:TrainingOpponent;label:string}[]=[{key:'dummy',label:'Training dummy'},{key:'dummies',label:'Two training dummies'},
   ...Object.values(ENEMY_CONTENT).map(e=>({key:e.key as TrainingOpponent,label:e.name}))];
  renderTrainingSetup(this.ui.root.querySelector<HTMLElement>('.training-setup')!,this.catalog,arenas,opponents,
   selection=>this.startTraining(selection),()=>this.menu());
 }
 private startTraining(selection:TrainingSelection){
  try{
   const {context}=createTrainingRun(this.scene.cache,{party:selection.party,arena:selection.arena as BattleArenaKey,opponent:selection.opponent,
    unlimitedMp:selection.unlimitedMp,fullLimit:selection.fullLimit,
    // A finished fight (won or lost) returns to the setup after the battle has had its moment.
    onSettle:()=>{this.animationTimer=setTimeout(()=>this.training(),1800);}});
   Object.assign(context,{menu:()=>this.training(),party:()=>{},rewardsReady:()=>{},
    uiSound:(event:UiSound)=>this.audio.playBattleUi(event,this.battleCursor),
    combatSound:(cue:CombatCue,authored:boolean)=>this.audio.playCombat(cue,authored),stopCombatSounds:()=>this.audio.stopCombat()});
   this.audio.warmCombat();this.audio.setMusic(400005,'training');
   this.ui.hide();document.body.dataset.training='';
   this.scene.scene.start('BattleScene',{manifests:this.manifests,runContext:context});
   this.placeBattleToolbar();
   this.ui.root.innerHTML='<div class="run-toolbar"><button class="rpg-button secondary" data-action="training-setup">Change setup</button><button class="rpg-button secondary" data-action="training-restart">Restart</button><button class="rpg-button secondary" data-action="menu">Title</button></div>';
   this.ui.on('training-setup',()=>this.training());
   this.ui.on('training-restart',()=>this.startTraining(selection));
   this.ui.on('menu',()=>{delete document.body.dataset.training;this.menu();});
  }catch(error){this.fail(error);}
 }
 route(){if(!this.state)return this.menu();
  // On reload, resume AFTER the already saved upgrade; never replay its reward.
  if(this.state.pendingAwakening)this.commit(acknowledgeAwakening(this.state,this.state.pendingAwakening.id));
  if(this.state.phase==='setup')this.setup();else if(this.state.phase==='battle')this.battle();else if(this.state.phase==='rewards')this.battle();else this.result();}
 private setup(){void import('html2canvas').catch(()=>{});
  this.audio.setMusic(HOME_MUSIC_RESOURCE,'home');ALL_FATE_SOUNDS.forEach(sound=>this.audio.warmSample(fateSoundUrl(sound)));const draw=drawCatalog(this.profile,this.catalog),choices=Object.fromEntries(this.state!.party.filter(m=>draw[m.key]?.startSkillChoice).map(m=>[m.key,draw[m.key].skills.map(s=>({id:s.id,name:s.name}))]));
  this.ui.slots(this.state!,this.busy,choices);this.ui.on('spin',()=>this.spin());
  for(const [key,skills] of Object.entries(choices))skills.forEach((skill,i)=>this.ui.on(`start-skill-${key}-${i}`,()=>{if(this.busy||this.state?.phase!=='setup')return;try{this.commit(chooseStartSkill(this.state,key,skill.id,draw));this.audio.playUi('select');this.setup();}catch(error){this.fail(error);}}));this.ui.on('skip',()=>this.finishSpin());this.ui.on('menu',()=>this.menu());this.ui.on('confirm',()=>{if(this.busy||this.state?.phase!=='setup')return;this.commit(confirmParty(this.state!));this.battle('start');});}
 private spin(){
  if(this.busy||this.state?.phase!=='setup'||(this.state.party.length>0&&this.state.rerolls===0))return;
  try{
   const originalForms=this.state.rules?.originalForms??this.rules.originalForms;
   const drawingState=originalForms&&!this.state.rules?.originalForms
    ?{...this.state,rules:{awakeningMode:this.state.rules?.awakeningMode??'sequential',originalForms}}
    :this.state;
   this.commit(rollParty(drawingState,drawCatalog(this.profile,this.catalog)));
   this.busy=true;
   this.setup();
   this.audio.playUi('leverSeat');
   this.ui.startSlotAudio(window.localStorage.getItem('ffrogue.slot-shake')!=='off');
   // The Fate Engine owns the reel timing: rare pulls tease longer and celebrate before settling.
   this.animationTimer=setTimeout(()=>this.finishSpin(),fateTimeline(this.state.party.map(fateTier)).end*1000);
  }catch(error){this.fail(error);}
 }
 private finishSpin(){if(!this.busy)return;
  clearTimeout(this.animationTimer);this.busy=false;if(this.state?.phase==='setup')this.setup();}
 private stageCard(stage:StageDefinition,eyebrow:string,title:string,lines:string[]):PathCard{
  const arena=BATTLE_ARENAS[stage.arena as BattleArenaKey] as {file:string}&Record<string,unknown>,profile=stageElementProfile(stage);
  const image='status' in arena?`assets/stages/${stage.arena}/${arena.file}`:`assets/backgrounds/${arena.file}`;
  return {id:stage.id,image,eyebrow,title,lines,weak:profile.weak as PathCard['weak'],attack:profile.attack as PathCard['attack']};
 }
 private chooseFinalBoss(begin:(finalStage:string)=>void){
  // A final boss stays a mystery (???, veiled arena, no elements) until the player has beaten it once.
  const cards=FINAL_STAGES.map(id=>STAGE_CONTENT[id]).filter(Boolean).map(stage=>{
   const known=this.profile.bosses.includes(stage.id);
   const card=this.stageCard(stage,stage.theme,known?ENEMY_CONTENT[stage.bossId]?.name??stage.bossId:'???',
    known?[`Final boss room: ${stage.name}`]:['An unknown foe awaits at the end.','Defeat it once to reveal it.']);
   const idle=this.manifests[stage.bossId]?.animations.idle;
   return known?card:{...card,weak:[],attack:[],mystery:true,
    silhouette:idle&&{url:`assets/monsters/${stage.bossId}/${idle.file}`,frames:idle.frameCount,index:idle.frames[0].index,width:idle.frameWidth,height:idle.frameHeight}};
  });
  this.ui.pathChoice('NEW JOURNEY','FACE YOUR NEMESIS','Pick the final boss. Two areas of your choice lead there.',cards,'menu');
  for(const card of cards)this.ui.on('path-'+card.id,()=>begin(card.id));
  this.ui.on('menu',()=>this.menu());
 }
 private chooseNextArea(route:{area:number;options:{stageId?:string}[]},next:()=>void){
  const state=this.state!,cards=route.options.map(o=>STAGE_CONTENT[o.stageId!]).map(stage=>this.stageCard(stage,stage.theme,stage.name,
   [`Enemies: ${[...new Set(stage.enemyPool)].map(k=>ENEMY_CONTENT[k]?.name??k).join(', ')}`,`Elite: ${ENEMY_CONTENT[stage.bossId]?.name??stage.bossId}`]));
  const final=state.areas.at(-1);
  this.ui.pathChoice(`AREA ${route.area+1} OF ${state.areas.length}`,'CHOOSE YOUR PATH',`Where does the journey lead next? ${final&&this.profile.bosses.includes(final.stageId??'')?final.name+' awaits at the end.':'The final boss awaits at the end.'}`,cards);
  for(const card of cards)this.ui.on('path-'+card.id,()=>{try{this.commit(chooseRoute(state,card.id));next();}catch(e){this.fail(e);}});
 }
 private battle(entryKind?:'start'|'area'|'cut'){if(!this.state||this.entry)return;
  // Before each seeded area the player picks where to go next (2026-11-11).
  const route=routeOptions(this.state);
  if(route){this.chooseNextArea(route,()=>this.battle(entryKind));return;}
  const state=this.state;
  this.audio.warmCombat();
  const encounter=runEncounter(state);
  const stage=STAGE_CONTENT[encounter.stageId];
  const music=stage.audio.musicSeries?recommendMusic(stage.audio.musicSeries,encounter.boss?'boss':'normal',stage.audio.bossMusicResourceId):stage.audio.musicResourceId;
  const startMusic=()=>this.audio.setMusic(music,JSON.stringify([state.seed,encounters(state.areas)[state.encounter].area]));
  const start=(entryReady?: (error?:Error)=>void)=>{
  this.ui.hide();
  this.scene.scene.start('BattleScene',{manifests:this.manifests,runContext:{state,catalog:this.catalog,
   settle:(actors:UnitActor[],won:boolean)=>this.settle(actors,won),rewardsReady:()=>this.rewards(),menu:()=>this.menu(),party:()=>this.party(),
   uiSound:(event:UiSound)=>this.audio.playBattleUi(event,this.battleCursor),entryReady,
   combatSound:(cue:CombatCue,authored:boolean)=>this.audio.playCombat(cue,authored),stopCombatSounds:()=>this.audio.stopCombat()}});
  if(state.phase==='battle')this.restoreBattleUI();
  };
  if(!entryKind){startMusic();start();return;}
  if(entryKind==='area')this.audio.warmMusic(music);
  // The run start shatters the slot screen with FFBE's own se_ev_glass_break (SE.acb stream 274);
  // later fights dip to dark. Music and the scene entrance start when the arena fades up.
  const shatter=entryKind==='start',glass='assets/audio/combat/se_ev_glass_break.wav';
  if(shatter)this.audio.warmSample(glass);
  const entry=new EncounterTransition(this.ui.root,shatter?'shatter':'fade',()=>this.audio.playSample(glass,.34));
  this.entry=entry;
  const onTimeout=()=>this.fail(new Error('Battle assets did not finish loading. Reload to retry.'));
  void entry.cover(()=>{
   if(this.entry!==entry)return;
   start(error=>{
    if(this.entry!==entry)return;
    if(error){this.fail(error);return;}
    void entry.reveal(()=>this.closeEntry(),()=>{startMusic();(this.scene.scene.get('BattleScene')as BattleScene).playEntrance();});
   });
  },onTimeout,!shatter?undefined:()=>captureEncounter(this.ui.root,
    this.scene.scene.isActive('BattleScene')?paint=>new Promise(resolve=>{
      this.scene.game.events.once('postrender',()=>{paint(this.scene.game.canvas);resolve();});
    }):undefined)).catch(error=>this.fail(error));
 }
 private placeBattleToolbar(){
  const bounds=this.scene.game.canvas.getBoundingClientRect();
  this.ui.root.style.setProperty('--battle-toolbar-top',Math.ceil(bounds.top+8)+'px');
  this.ui.root.style.setProperty('--battle-toolbar-right',Math.max(8,Math.round(window.innerWidth-bounds.right+8))+'px');
 }
 private restoreBattleUI(){const battle=this.scene.scene.get('BattleScene')as BattleScene;this.ui.hide();this.placeBattleToolbar();this.ui.root.innerHTML='<details class="run-toolbar combat-settings"><summary class="rpg-button secondary">Settings</summary>'+'<button class="rpg-button secondary" data-action="music" aria-label="Battle music"></button><button class="rpg-button secondary" data-action="party">Party & skills</button><button class="rpg-button secondary" data-action="retreat">Retreat</button>'+'</details>';
  const music=this.ui.root.querySelector<HTMLButtonElement>('[data-action=music]')!;
  const updateMusic=()=>{const muted=this.audio.getPreference('music').muted;music.textContent=muted?'Music off':'Music on';music.setAttribute('aria-pressed',String(!muted));};
  this.ui.on('music',()=>{const preference=this.audio.getPreference('music');this.audio.setPreference('music',{...preference,muted:!preference.muted});updateMusic();this.syncAudioControls();});
  updateMusic();this.audioControls(updateMusic);
  this.ui.on('party',()=>this.party());this.ui.on('retreat',()=>{if(!battle.isRunCommandWindow())return;battle.scene.pause();this.ui.dialog('Leave this expedition?','This counts as a defeat. Your fixed party and upgrades will be retired.','End expedition');this.ui.on('cancel',()=>{battle.scene.resume();this.restoreBattleUI();});this.ui.on('accept',()=>{this.scene.scene.stop('BattleScene');this.commit({...this.state!,phase:'lost'});this.result();});});}
 private audioControls(updateMusic=()=>{}){
  const panel=document.createElement('details');
  panel.className='rpg-panel audio-controls';
  panel.innerHTML='<summary>Sound</summary>';
  for(const [bus,label] of [['music','Music'],['effects','Sound effects']] as const){
   const row=document.createElement('fieldset');
   row.innerHTML='<legend>'+label+'</legend><label title="'+label+' volume">Volume <input type="range" min="0" max="1" step=".01" data-volume="'+bus+'"></label> <label title="Silence '+label.toLowerCase()+'"><input type="checkbox" data-muted="'+bus+'"> Mute</label>';
   const volume=row.querySelector<HTMLInputElement>('[type=range]')!;
   const muted=row.querySelector<HTMLInputElement>('[type=checkbox]')!;
   const change=()=>{this.audio.setPreference(bus,{volume:Number(volume.value),muted:muted.checked});updateMusic();};
   volume.addEventListener('input',change);
   muted.addEventListener('change',change);
   panel.append(row);
  }
  (this.ui.root.querySelector('.run-toolbar, .menu-panel')??this.ui.root).append(panel);
  this.syncAudioControls();
  // Developer-only sound tools (cursor profiles, sound comparison, housing shake): add ?dev=1 to the URL.
  const devTools=new URLSearchParams(location.search).has('dev');
  if(devTools&&this.ui.root.dataset.phase==='battle'){
   const label=document.createElement('label');
   label.textContent='Battle cursor ';
   const profiles=document.createElement('select');
   profiles.setAttribute('aria-label','Battle cursor');
   for(const [value,name] of Object.entries(battleCursorProfiles))profiles.add(new Option(name,value));
   profiles.value=this.battleCursor;
   profiles.onchange=()=>{
    this.battleCursor=profiles.value as BattleCursorProfile;
    this.audio.playBattleUi('select',this.battleCursor);
   };
   label.append(profiles);
   panel.append(label);
  }
  if(devTools&&this.ui.root.dataset.phase==='menu'){
   const preview=document.createElement('div');
   preview.className='audio-preview';
   preview.innerHTML='<p>Sound comparison · FFBE originals and FFRogue alternatives</p>';
   for(const [cue,label,profile] of [['select','Cursor · FFBE','original'],['select','Cursor · Crystal','crystal'],['select','Cursor · Soft','soft'],['confirm','Confirm · FFBE','original'],['confirm','Confirm · Crystal','crystal'],['confirm','Confirm · Soft','soft'],['back','Back',null],['unavailable','Unavailable',null],['reward','Reward',null],['starReveal','7★ reveal',null],['nvReveal','NV reveal',null]] as const){
    const button=document.createElement('button');
    button.type='button';button.className='rpg-button secondary';
    button.textContent=label;button.onclick=()=>profile?this.audio.previewUi(cue,profile):this.audio.playUi(cue);preview.append(button);
   }
   const motion=document.createElement('label');
   motion.innerHTML='<input type="checkbox"> Rare housing shake';
   const checkbox=motion.querySelector('input')!;
   checkbox.checked=window.localStorage.getItem('ffrogue.slot-shake')!=='off';
   checkbox.onchange=()=>window.localStorage.setItem('ffrogue.slot-shake',checkbox.checked?'on':'off');
   preview.append(motion);panel.append(preview);
  }
 }
 private syncAudioControls(){
  for(const bus of ['music','effects'] as const){
   const volume=this.ui.root.querySelector<HTMLInputElement>('[data-volume='+bus+']');
   const muted=this.ui.root.querySelector<HTMLInputElement>('[data-muted='+bus+']');
   const preference=this.audio.getPreference(bus);
   if(volume)volume.value=String(preference.volume);
   if(muted)muted.checked=preference.muted;
  }
 }
 private party(){const battle=this.scene.scene.get('BattleScene')as BattleScene;if(!battle.isRunCommandWindow())return;battle.scene.pause();
  const view=structuredClone(this.state!);battle.runPartySnapshot().forEach((a,i)=>{view.party[i].hp=a.hp;view.party[i].mp=a.mp;});this.ui.party(view);this.ui.on('close',()=>{battle.scene.resume();this.restoreBattleUI();});}
 private settle(actors:UnitActor[],won:boolean){if(this.state?.phase!=='battle')return;try{this.commit(completeBattle(this.state,this.catalog,actors.map(h=>({key:h.unitKey,hp:h.currentHp,mp:h.currentMp,limit:h.limitGauge})),won));this.ui.hide();if(!won){this.scene.scene.stop('BattleScene');this.route();}}catch(error){this.fail(error);}}
 private rewardBounds(){const battle=this.scene.scene.get('BattleScene')as BattleScene,canvas=this.scene.game.canvas.getBoundingClientRect();
  const sx=canvas.width/battle.scale.width,sy=canvas.height/battle.scale.height;
  return {left:canvas.left,top:canvas.top,width:canvas.width,height:canvas.height,
   arena:{top:canvas.top+battle.runArenaBounds().y*sy,height:battle.runArenaBounds().height*sy},
   party:battle.runPartyBounds().map(b=>({left:canvas.left+b.left*sx,right:canvas.left+b.right*sx,top:canvas.top+b.top*sy,bottom:canvas.top+b.bottom*sy}))};}

 private rewards(){this.ui.rewards(this.state!);this.ui.overBattle(this.rewardBounds());for(let i=0;i<3;i++)this.ui.on('reward-'+i,()=>{if(this.state?.phase!=='rewards')return;const r=this.state.offers[i];if(!r)return;const m=this.state!.party.find(m=>m.key===r.member);
  if(r.type==='learn'&&m?.skills.length===3){this.ui.replacement(this.state!,i);this.ui.overBattle(this.rewardBounds());m.skills.forEach((s,j)=>this.ui.on('replace-'+j,()=>this.takeReward(i,s.id)));this.ui.on('cancel',()=>this.rewards());}
  else this.takeReward(i);
 });}
 private takeReward(index:number,replace?:string){if(this.state?.phase!=='rewards')return;try{
  const course=encounters(this.state.areas);
  const previous=course[this.state.encounter].area;
  const next=chooseReward(this.state,index,this.catalog,replace);
  this.commit(next);
  const enterArea=next.phase==='battle'&&course[next.encounter].area!==previous;
  const advance=()=>{if(next.phase==='battle')this.battle(enterArea?'area':'cut');
    else{this.scene.scene.stop('BattleScene');this.route();}};
  const notice=this.state.pendingAwakening;
  if(notice){const slot=this.state.party.findIndex(m=>m.key===notice.member),anchor=this.scene.scene.isActive('BattleScene')?this.rewardBounds().party[slot]:undefined;
   this.ui.awakening(notice,()=>{if(this.state?.pendingAwakening?.id!==notice.id)return;
    try{this.commit(acknowledgeAwakening(this.state,notice.id));advance();}catch(error){this.fail(error);}
   },anchor);return;}
  advance();}catch(error){this.fail(error);}}
 private result(){this.audio.setMusic(this.state?.phase==='won'?VICTORY_FANFARE_RESOURCE:null,'result');
  // Crystals and unlocks are settled once per finished run (keyed by seed and history), then shown.
  const settled=settleRun(this.profile,this.state!,this.catalog);this.profile=this.profiles.save(settled.profile);
  this.ui.result(this.state!,settled.crystals||settled.unlocked?{crystals:settled.crystals,unlocked:settled.unlocked}:undefined);this.ui.on('new',()=>{this.store.clear();this.state=null;this.menu();});}
 private summon(){try{const result=summonHero(this.profile,this.catalog,crypto.getRandomValues(new Uint32Array(1))[0].toString(36));
  this.profile=this.profiles.save(result.profile);
  // The roulette plays its own landing cue from the Fate Engine samples.
  this.ui.summoned(result.hero,this.profile.crystals,result.bond,result.refund,summonPool(this.catalog));this.ui.on('close',()=>this.menu());}catch(error){this.fail(error);}}
 snapshot(){return {state:this.state,total:this.state?encounters(this.state.areas).length:0,busy:this.busy};}
}
