import type Phaser from 'phaser';
import type {UnitManifest} from '../types/manifest';
import type {RunState,RunRules} from './runState.mjs';
import {RunStore,createRun,variantAreas,rollParty,confirmParty,completeBattle,chooseReward,encounters,acknowledgeAwakening} from './runState.mjs';
import {runCatalog} from './catalog';
import {RunUI} from '../ui/RunUI';
import {EncounterTransition,encounterStyle,snapshotStyles} from '../ui/EncounterTransition';
import {encounterSounds} from '../audio/uiSoundDesign';
import {captureEncounter} from '../ui/captureEncounter';
import type {UnitActor} from '../entities/UnitActor';
import type {BattleScene} from '../scenes/BattleScene';
import {recommendMusic} from '../audio/musicProfiles.mjs';
import {GameAudio,HOME_MUSIC_RESOURCE,battleCursorProfiles,type BattleCursorProfile,type UiSound} from '../audio/battleMusic';
import type {CombatCue} from '../audio/combatCues';
import {runEncounter} from './runBalance.mjs';
import {STAGE_CONTENT} from './stageContent.mjs';
export class GameFlow{
 readonly rules:RunRules;
 private readonly audio:GameAudio;
 private battleCursor:BattleCursorProfile='felt';
 private entry?:EncounterTransition;
 readonly catalog;readonly store;readonly ui;state:RunState|null=null;private animationTimer?:ReturnType<typeof setTimeout>;private busy=false;
 constructor(readonly scene:Phaser.Scene,readonly manifests:Record<string,UnitManifest>){this.audio=new GameAudio(scene.sound);this.rules=(scene.cache.json.get('run_rules')as RunRules)??{awakeningMode:'sequential'};this.catalog=runCatalog(scene,manifests);this.store=new RunStore(window.localStorage,this.catalog);this.ui=new RunUI(this.catalog,manifests);this.ui.onError=error=>this.fail(error);this.ui.onSound=(event,rate)=>this.audio.playUi(event,rate);const resize=()=>{this.placeBattleToolbar();if(this.ui.root.classList.contains('victory-overlay'))this.ui.overBattle(this.rewardBounds());};window.addEventListener('resize',resize);scene.scale.on('resize',resize);this.menu();}
 private closeEntry(){this.entry?.close();this.entry=undefined;}
 private fail(error:unknown){this.closeEntry();this.audio.setMusic(null);clearTimeout(this.animationTimer);this.busy=false;this.scene.scene.stop('BattleScene');this.ui.error(String(error));this.ui.on('reload',()=>location.reload());}
 private commit(next:RunState){this.store.save(next);this.state=next;}
 menu(){this.closeEntry();this.audio.setMusic(HOME_MUSIC_RESOURCE,'home');if(this.scene.scene.isActive('BattleScene'))this.scene.scene.stop('BattleScene');this.busy=false;clearTimeout(this.animationTimer);
  try{this.state=this.store.load();this.ui.menu(!!this.state,null);this.audioControls();if(this.state?.phase==='battle'){const note=document.createElement('p');note.className='muted';note.textContent='Continue restarts the current encounter from its saved starting state.';this.ui.root.querySelector('.menu-panel')?.append(note);}}catch(error){this.ui.error(String(error),true);this.ui.on('reload',()=>location.reload());this.ui.on('discard',()=>{this.store.clear();this.state=null;this.menu();});return;}
  this.ui.on('continue',()=>this.route());this.ui.on('play',()=>{const seed=(this.ui.root.querySelector('#run-seed')as HTMLInputElement).value.trim()||new URLSearchParams(location.search).get('seed')||crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
   const start=()=>{try{this.commit(createRun(seed,this.catalog,new URLSearchParams(location.search).get("arenaVariants")==="1"?variantAreas(seed):undefined,this.rules));this.audio.clearRunPosition();this.setup();}catch(e){this.fail(e);}};
   if(this.state){this.ui.dialog('Begin a new expedition?','The saved expedition will be abandoned. Rerolls and upgrades belong only to that run.','Start new run');this.ui.on('accept',start);this.ui.on('cancel',()=>this.menu());}else start();});
 }
 route(){if(!this.state)return this.menu();
  // On reload, resume AFTER the already saved upgrade; never replay its reward.
  if(this.state.pendingAwakening)this.commit(acknowledgeAwakening(this.state,this.state.pendingAwakening.id));
  if(this.state.phase==='setup')this.setup();else if(this.state.phase==='battle')this.battle();else if(this.state.phase==='rewards')this.battle();else this.result();}
 private setup(){if(encounterStyle(location.search)==='fold')void import('html2canvas').catch(()=>{});
  this.audio.setMusic(HOME_MUSIC_RESOURCE,'home');this.ui.slots(this.state!,this.busy);this.ui.on('spin',()=>this.spin());this.ui.on('skip',()=>this.finishSpin());this.ui.on('menu',()=>this.menu());this.ui.on('confirm',()=>{if(this.busy||this.state?.phase!=='setup')return;this.commit(confirmParty(this.state!));this.battle('area');});}
 private spin(){
  if(this.busy||this.state?.phase!=='setup'||(this.state.party.length>0&&this.state.rerolls===0))return;
  try{
   const originalForms=this.state.rules?.originalForms??this.rules.originalForms;
   const drawingState=originalForms&&!this.state.rules?.originalForms
    ?{...this.state,rules:{awakeningMode:this.state.rules?.awakeningMode??'sequential',originalForms}}
    :this.state;
   this.commit(rollParty(drawingState,this.catalog));
   this.busy=true;
   this.setup();
   this.audio.playUi('leverSeat');
   this.ui.startSlotAudio(window.localStorage.getItem('ffrogue.slot-shake')!=='off');
   const rare=this.state.party.some(member=>member.rank==='NV'||member.rarity===7);
   this.animationTimer=setTimeout(()=>this.finishSpin(),rare?1620:1500);
  }catch(error){this.fail(error);}
 }
 private finishSpin(){if(!this.busy)return;
  clearTimeout(this.animationTimer);this.busy=false;if(this.state?.phase==='setup')this.setup();}
 private battle(entryKind?:'area'|'cut'){if(!this.state||this.entry)return;
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
  const style=entryKind==='cut'?'cut':encounterStyle(location.search);
  const selectedSound=new URLSearchParams(location.search).get('encounterSound');
  const sound=encounterSounds[selectedSound==='impact'||selectedSound==='classic'?selectedSound:'arcane'];
  // The glass shatter uses FFBE's own se_ev_glass_break (SE.acb stream 274) as its only cue;
  // the battle music then starts on reveal.
  const glass='assets/audio/combat/se_ev_glass_break.wav';
  if(style==='shatter')this.audio.warmSample(glass);
  const entry=new EncounterTransition(this.ui.root,style,state.encounter>0,
   style==='cut'?undefined:style==='shatter'?phase=>phase==='impact'?this.audio.playSample(glass,.34):()=>{}
    :phase=>this.audio.playUi(sound[phase]));
  this.entry=entry;
  const onTimeout=()=>this.fail(new Error('Battle assets did not finish loading. Reload to retry.'));
  void entry.cover(()=>{
   if(this.entry!==entry)return;
   start(error=>{
    if(this.entry!==entry)return;
    if(error){this.fail(error);return;}
    void entry.reveal(this.scene.game.canvas,()=>this.closeEntry(),startMusic);
   });
  },onTimeout,snapshotStyles.has(style)?()=>captureEncounter(this.ui.root,
    this.scene.scene.isActive('BattleScene')?paint=>new Promise(resolve=>{
      this.scene.game.events.once('postrender',()=>{paint(this.scene.game.canvas);resolve();});
    }):undefined):undefined).catch(error=>this.fail(error));
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
  panel.innerHTML='<summary>Audio</summary>';
  for(const [bus,label] of [['music','Music'],['effects','Sound effects']] as const){
   const row=document.createElement('fieldset');
   row.innerHTML='<legend>'+label+'</legend><label>Volume <input type="range" min="0" max="1" step=".01" data-volume="'+bus+'"></label> <label><input type="checkbox" data-muted="'+bus+'"> Mute</label>';
   const volume=row.querySelector<HTMLInputElement>('[type=range]')!;
   const muted=row.querySelector<HTMLInputElement>('[type=checkbox]')!;
   const change=()=>{this.audio.setPreference(bus,{volume:Number(volume.value),muted:muted.checked});updateMusic();};
   volume.addEventListener('input',change);
   muted.addEventListener('change',change);
   panel.append(row);
  }
  (this.ui.root.querySelector('.run-toolbar, .menu-panel')??this.ui.root).append(panel);
  this.syncAudioControls();
  if(this.ui.root.dataset.phase==='battle'){
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
  if(this.ui.root.dataset.phase==='menu'){
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
  if(notice){this.ui.awakening(notice,()=>{if(this.state?.pendingAwakening?.id!==notice.id)return;
    try{this.commit(acknowledgeAwakening(this.state,notice.id));advance();}catch(error){this.fail(error);}
   });return;}
  advance();}catch(error){this.fail(error);}}
 private result(){this.audio.setMusic(null);this.ui.result(this.state!);this.ui.on('new',()=>{this.store.clear();this.state=null;this.menu();});}
 snapshot(){return {state:this.state,total:this.state?encounters(this.state.areas).length:0,busy:this.busy};}
}
