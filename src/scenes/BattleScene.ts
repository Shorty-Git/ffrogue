import {skillIconUrl} from '../ui/skillIcons';
import {heroStatusBadges,enemyStatusBadges} from '../ui/statusIcons';
import {LB_MAX,gainFromAction,gainFromDamage,gainFromSupport,isFull} from '../run/limitGauge.mjs';
import {enemyTargetIndex} from '../run/enemyTargeting.mjs';
import {CombatHud} from '../ui/CombatHud';
import Phaser from 'phaser';
import { UnitActor, UnitCombatConfig, type UnitActorConfig } from '../entities/UnitActor';
import { TargetDummy } from '../entities/TargetDummy';
import { UnitManifest } from '../types/manifest';
import { SkillConfig, UnitSkillsData } from '../types/skills';
import { CharacterDefinition, ContentRegistry } from '../types/content';
import { BATTLE_ART_SCALE, getBattleLayout, arenaCoverScale } from '../ui/battleLayout';
import { BATTLE_ARENAS, BattleArenaKey } from '../data/battleArenas';
import { createPreparedSceneBridge, type PreparedSceneBridge, type PreparedSceneHost ,casterStrikeOffset} from '../effects/PreparedSceneBridge.mjs';
import { validateSceneManifest, validateSceneAction } from '../effects/sceneProfile.mjs';
import { reviewedSkillEvents,skillDamageType } from '../effects/skillDamageTimeline.mjs';
import { applyEnemyStatuses, isEnemyActionBlocked, ageEnemyStatuses, enemyAttackMultiplier } from '../effects/enemyStatus.mjs';
import { validateBasicRepeat } from '../effects/basicRepeat.mjs';
import { BLIND_MISS_CHANCE, applyHeroBuffs, cleanseHeroDebuffs, consumeAutoRevive, heroDamageTakenMultiplier, heroMagicMultiplier, heroPhysicalMultiplier, isHeroBlind } from '../effects/heroBuffs.mjs';
import {resolveEnemyInstant} from '../effects/enemyInstant.mjs';
import {validateActionChoreography,actionTravel} from '../effects/actionChoreography.mjs';
import type {RunBattleContext} from '../run/battleContext';
import {nextRandom,skillForRun,memberMaxMp,encounters,ENCOUNTER_LABELS} from '../run/runState.mjs';
import {skillDescription} from '../run/catalog';
import {runEncounter} from '../run/runBalance.mjs';
import {ENEMY_CONTENT,enemyAction,type EnemyAction} from '../run/stageContent.mjs';
import {ENEMY_SKILLS} from '../run/enemySkills.mjs';
import {actionElements as actionElementsOf,elementTag,enemyAffinities,heroElementMultiplier,type Element} from '../run/elementRules.mjs';
import {memberPower,WEAPON_GLYPHS,weaponSummary} from '../run/weapons.mjs';
import {ActionBanner,type CombatActionNotice} from '../ui/ActionBanner';
import {bodyAssets,heroBodyClips,type BodyAsset} from '../data/bodyAssets.mjs';
import {queueBodyAssets,missingBodyAssets,setBodySampling} from './bodyLoading';
import basicAttackCues from '../audio/basicAttackCues';
import {enemyDissolveCues,isCombatCue,type CombatCue} from '../audio/combatCues';
import type {PreparedSceneManifest} from '../effects/sceneProfile.mjs';

import type {RunContent} from '../run/catalog';
import {StageAnimation,queueStageTextures} from '../stages/StageAnimation';

export type CombatState =
  | 'SPAWNING'
  | 'PLAYER_TURN'
  | 'HERO_ATTACKING'
  | 'ENEMY_TURN'
  | 'VICTORY'
  | 'DEFEAT';

type PlannedAction = ({ kind: 'attack'; config: UnitCombatConfig } | { kind: 'skill'; skill: SkillConfig })
  & { target: TargetDummy | null };
/** Beat after an enemy skill's last hit before the next enemy acts (the scene tail keeps fading). */
const ENEMY_SKILL_SETTLE_MS = 400;
/** Beat between the last enemy fading and the reward choice (victory clips continue underneath). */
const VICTORY_REWARD_DELAY_MS = 500;
/** Chance that a blinded hero's basic-attack hit misses (reviewed FFRogue value). */

export class BattleScene extends Phaser.Scene {
  private runContext!:RunBattleContext;

  private runSettled=false;
  private runVictoryStage:'idle'|'finishing'|'celebrating'|'rewards'='idle';
  private arenaKey: BattleArenaKey = 'forest';
  private manifests!: Record<string, UnitManifest>;
  private enemies: TargetDummy[] = [];
  private currentTarget: TargetDummy | null = null;
  private actionBanner?:ActionBanner;
  private actionSequence=0;
  private requiredBodies:BodyAsset[]=[];
  private stageAnimation?:StageAnimation;
  private victoryTriggered: boolean = false;
  private pendingImpacts = 0;
  private afterImpacts?: () => void;
  private preparedScenes?: PreparedSceneBridge;
  private sourceVisualError?: string;
  // Tests can control gameplay draws without replacing Phaser's global random source.
  private enemyEventRandom: () => number = Math.random;
  private activeSkillActions = 0;
  private skillActors = new Set<UnitActor>();

  public get targetDummy(): TargetDummy {
    return this.currentTarget ?? this.enemies[0];
  }

  // Turn-Order State
  private turnOrder: UnitActor[] = [];
  private activeHeroIndex: number = 0;
  private plannedActions = new Map<UnitActor, PlannedAction>();
  private combatState: CombatState = 'SPAWNING';
  private currentRound: number = 1;

  private fightNumber: number = 1;
  /** Latest gameplay status line, shown by the CombatHud while no command is pending. */
  private statusMessage = '';
  private combatHud!:CombatHud;
  private hudRefreshAt=0;
  private ribbonMarks:(TargetDummy|UnitActor)[]=[];
  private isCommandMenuOpen = false;
  /** Limit Bursts by hero key (catalog limitBurst); heroes without one have no LB gauge. */
  private limitBursts:Record<string,SkillConfig>={};
  /** Heroes whose running action is their Limit Burst: it earns no gauge itself. */
  private limitCasters=new Set<UnitActor>();

  // Authentic Hero Skills
  private unitSkills: Record<string, SkillConfig[]> = {};

  constructor() {
    super('BattleScene');
  }

  init(data: { manifests: Record<string, UnitManifest>;runContext:RunBattleContext }): void {

    this.runContext=data.runContext;this.runSettled=data.runContext.state.phase==='rewards';this.runVictoryStage='idle';
    this.activeSkillActions = 0;
    this.skillActors.clear();
    this.arenaKey=this.currentEncounter().arena;
    this.manifests = data.manifests;
    this.enemies = [];
    this.actionBanner=undefined;this.actionSequence=0;
    this.currentTarget = null;
    this.turnOrder = [];
    this.plannedActions.clear();
    this.ribbonMarks=[];
    this.unitSkills = {};
    this.activeHeroIndex = 0;
    this.currentRound = 1;
    this.fightNumber = 1;
    this.victoryTriggered = false;
    this.pendingImpacts = 0;
    this.afterImpacts = undefined;
    this.isCommandMenuOpen = false;
    this.combatState = 'SPAWNING';
    this.statusMessage = '';
  }

  preload():void {
    const arena=BATTLE_ARENAS[this.arenaKey];
    if('status' in arena&&!this.textures.exists(arena.texture))this.load.image(arena.texture,`assets/stages/${this.arenaKey}/${arena.file}`);
    queueStageTextures(this,this.arenaKey);
    const requests=this.runContext.state.party.map(m=>({key:m.form,clips:heroBodyClips(this.manifests[m.form],
      (this.cache.json.get('skills_'+m.key)as UnitSkillsData).skills,(this.cache.json.get('character_'+m.key)as CharacterDefinition).battle.attackAnim)}));
    for(const key of new Set(this.currentEncounter().enemies.map(e=>e.key)))requests.push({key,clips:['idle',...(ENEMY_CONTENT[key]?[ENEMY_CONTENT[key].attack.clip]:[])]});
    this.requiredBodies=bodyAssets(this.manifests,requests,(this.cache.json.get('run_content')as RunContent).forms);
    queueBodyAssets(this,this.requiredBodies);
  }

  create(): void {
    const { width, height } = this.scale;
    const missing=missingBodyAssets(this,this.requiredBodies);
    if(missing.length){
      const message='Battle assets unavailable. Reload to retry.\n'+missing.join(', ');
      if(this.runContext.entryReady)this.runContext.entryReady(new Error(message));
      else this.add.text(40,100,message,{color:'#ffffff',fontSize:'20px',wordWrap:{width:width-80}});
      return;
    }
    const layout = getBattleLayout(width, height, BATTLE_ARENAS[this.arenaKey]);

    // Load preloaded unit skills from JSON cache
    const registry = this.cache.json.get('content_registry') as ContentRegistry;
    this.sourceVisualError = undefined;
    this.events.on('prepared-scene-error', (message: string) => {
      this.sourceVisualError = message;
      this.updateStatus('Skill visuals unavailable. Restart to retry. Normal attacks remain available.');
    });
    this.fightNumber=this.runContext.state.encounter+1;
    this.enemyEventRandom=()=>this.randomValue();
    this.limitBursts={};this.limitCasters.clear();
    for(const m of this.runContext.state.party){const lb=this.runContext.catalog[m.key].limitBurst;if(lb)this.limitBursts[m.key]=lb;}
    for(const m of this.runContext.state.party)this.unitSkills[m.key]=this.runContext.catalog[m.key].skills
      .filter(s=>m.skills.some(a=>a.id===s.id)).map(s=>skillForRun(s,m));
    // Only the scenes this battle can play are prepared: the party's chosen skills and Limit Bursts plus
    // every presentation the encounter's enemies reference. Preparing the whole registry (hundreds of
    // scenes, three target variants each) delayed late entries for minutes as the roster grew.
    try {
      const needed=new Set<string>();
      for(const skill of [...Object.values(this.unitSkills).flat(),...Object.values(this.limitBursts)])if(skill.scenePresentation)needed.add(skill.scenePresentation);
      for(const key of new Set(this.currentEncounter().enemies.map(e=>e.key)))
        JSON.stringify([ENEMY_CONTENT[key],ENEMY_SKILLS[key]],(field,value)=>{if(field==='presentation'&&typeof value==='string')needed.add(value);return value;});
      const prepared = (registry.scenePresentations ?? []).filter(key=>needed.has(key)).map(key => validateSceneManifest(this.cache.json.get(`scene_${key}_manifest`)));
      if (prepared.length && this.game.renderer.type === Phaser.WEBGL) this.preparedScenes = createPreparedSceneBridge(this, prepared, {canWarm:()=>!!document.querySelector('.encounter-transition[data-phase="loading"]')});
      else if (this.game.renderer.type !== Phaser.WEBGL) this.sourceVisualError = 'Source skills require WebGL and published presentations';
    } catch (error) { this.sourceVisualError = String(error); }

    // 1. Arena Background
    this.createArenaBackground(width, height);


    // Listen for enemy clicks on the battlefield
    this.events.on('enemy_clicked', (enemy: TargetDummy) => {
      const index=this.enemies.indexOf(enemy);
      if(index>=0)this.confirmRibbonTarget(index);
    });

    this.events.on('enemy-dissolve',(enemy:TargetDummy)=>{
      const cue=enemyDissolveCues[String(enemy.manifest.unitId)];
      if(cue)this.emitCombatSound(cue,'enemy-dissolve');
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.combatHud?.destroy();
      this.runContext.stopCombatSounds?.();
      this.events.removeAllListeners('enemy-dissolve');
      this.plannedActions.clear();
      this.events.removeAllListeners('enemy_clicked');
      this.input.keyboard?.removeAllListeners();
      this.afterImpacts = undefined;
      this.preparedScenes?.destroy();
      this.preparedScenes = undefined;
      this.events.removeAllListeners('prepared-scene-error');
    });

    // 4. Instantiate Party Units
    // Formation slots share the same viewport coordinates as movement and effects.
    const slots=[layout.party.cloud,layout.party.aerith,layout.party.barret];
    this.turnOrder=this.runContext.state.party.map((member,i)=>{
      const def=this.cache.json.get(`character_${member.key}`) as CharacterDefinition;
      const manifest={...this.manifests[member.form],assetKey:member.form};
      const linear=(this.runContext.bodyTextureFilter??this.cache.json.get('run_rules')?.bodyTextureFilter)==='linear';
      for(const clip of Object.keys(manifest.animations)){
        const key=`${member.form}_${clip}`;
        setBodySampling(this,key,linear);
        setBodySampling(this,key+'_emission',linear);
      }
      const actor=this.createHeroActor(member.key,slots[i],manifest,
        {...def.battle,maxHp:Math.round(this.runContext.catalog[member.key].maxHp*member.stats.hp),
         maxMp:memberMaxMp(this.runContext.catalog[member.key],member)},def.scale);
      actor.currentHp=member.hp;actor.currentMp=member.mp;actor.limitGauge=member.limit??0;
      // A member still K.O. from an earlier battle enters lying down, not in the idle pose.
      if(actor.isDead)actor.playRestPose();
      return actor;
    });


    this.actionBanner=new ActionBanner(this);
    this.combatHud=new CombatHud(this.game.canvas,(action,index)=>{
      if(action==='hero')this.pickRibbonHero(this.turnOrder[index]);
      if(action==='ability')this.chooseRibbonAbility(index);
      if(action==='clear')this.cancelPlannedAction();
      if(action==='target')this.confirmRibbonTarget(index);
      this.refreshCombatHud();
    });
    this.input.keyboard?.on('keydown',(event:KeyboardEvent)=>{
      if(event.repeat||event.altKey||event.ctrlKey||event.metaKey||document.querySelector('.encounter-transition,.run-overlay'))return;
      const control=event.target instanceof HTMLElement&&event.target.closest('button,summary,input,select,textarea');
      if(control&&!control.closest('.combat-ui'))return;
      const number=/^(?:Digit|Numpad)([1-5])$/.exec(event.code);
      if(number){event.preventDefault();this.chooseRibbonAbility(Number(number[1])-1);}
      else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)&&this.ribbonPlan()){
        event.preventDefault();this.combatHud?.moveFocus(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1);
      }else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)&&this.combatState==='PLAYER_TURN'){
        event.preventDefault();this.cycleTarget(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1);
      }else if(event.key==='Enter'&&this.ribbonPlan()){
        const target=this.combatHud?.focusedTarget();
        if(control&&target===undefined&&control.getAttribute('data-command')!=='ability')return;
        event.preventDefault();
        if(target!==undefined)this.confirmRibbonTarget(target);
        else this.combatHud?.moveFocus(1);
      }else if(event.key==='Escape'){event.preventDefault();this.cancelPlannedAction();}
      this.refreshCombatHud();
    });
    this.hudRefreshAt=0;

    // 8. Start Battle 1: Materialize encounter 1, then unlocks Round 1!
    if(this.runContext.state.phase==='rewards'){this.triggerVictory();return;}
    this.spawnEncounter(() => {
      this.startRound();
    }, this.runContext.entryReady ? ()=>this.reportEncounterFrame() : undefined);
  }

  private createHeroActor(key:string,slot:{x:number;y:number},manifest:UnitManifest,config:UnitActorConfig,scale:number):UnitActor{
    const actor=new UnitActor(this,slot.x,slot.y,key,manifest,config);
    actor.setScale(scale*BATTLE_ART_SCALE);actor.setFacingLeft(true);actor.setInteractive({useHandCursor:true});
    actor.on('pointerdown',()=>this.pickRibbonHero(actor));
    return actor;
  }
  private reportEncounterFrame():void{
    const entryReady=this.runContext.entryReady;
    const rendered=()=>{this.events.off(Phaser.Scenes.Events.SHUTDOWN,cleanup);entryReady?.();};
    const cleanup=()=>this.game.events.off(Phaser.Core.Events.POST_RENDER,rendered);
    this.game.events.once(Phaser.Core.Events.POST_RENDER,rendered);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,cleanup);
  }

  private currentEncounter(){return this.runContext.encounter??runEncounter(this.runContext.state);}
  private randomValue():number{return nextRandom(this.runContext.state,'combat');}
  private randomBetween(min:number,max:number):number{return min+Math.floor(this.randomValue()*(max-min+1));}
  public runArenaBounds(){return getBattleLayout(this.scale.width,this.scale.height).arena;}
  public runPartyBounds(){return this.turnOrder.map(h=>{
    const pose=h.hasVictoryPose?h.manifest.animations.win:undefined;
    if(!pose)return h.getBounds();
    // A verified resting pose may still use the much larger intro canvas.
    // Use its equivalent win-frame bounds for UI layout; never alter the actor.
    const x=(h.flipX?1-pose.pivotX:pose.pivotX)*pose.frameWidth,y=pose.pivotY*pose.frameHeight,m=h.getWorldTransformMatrix();
    const points=[[0,0],[pose.frameWidth,0],[0,pose.frameHeight],[pose.frameWidth,pose.frameHeight]].map(([px,py])=>m.transformPoint(px-x,py-y));
    const left=Math.min(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y));
    return new Phaser.Geom.Rectangle(left,top,Math.max(...points.map(p=>p.x))-left,Math.max(...points.map(p=>p.y))-top);
  });}
  public runPartySnapshot(){return this.turnOrder.map(h=>({key:h.unitKey,hp:h.currentHp,mp:h.currentMp,limit:h.limitGauge}));}
  public isRunCommandWindow():boolean{return this.combatState==='PLAYER_TURN';}
  /**
   * Presentation-only battle opening after the encounter shatter: the camera eases in from a slight
   * close-up while the arena fades up, then the command HUD rises (CSS, body[data-battle-entrance]).
   */
  public playEntrance():void{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const camera=this.cameras.main;
    camera.setZoom(1.09);camera.setScroll(-this.scale.width*.035,this.scale.height*.012);
    this.tweens.add({targets:camera,zoom:1,scrollX:0,scrollY:0,duration:700,ease:'Cubic.easeOut'});
    document.body.dataset.battleEntrance='';
    this.time.delayedCall(1000,()=>delete document.body.dataset.battleEntrance);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>delete document.body.dataset.battleEntrance);
  }
  private finishRunEncounter(won:boolean):void{
    if(won){this.runVictoryStage='finishing';return;}
    if(this.runSettled)return;
    const finish=()=>{if(this.runSettled)return;if(this.activeSkillActions>0||this.pendingImpacts>0){this.time.delayedCall(40,finish);return;}
      this.runSettled=true;this.preparedScenes?.stop();this.runContext.settle(this.turnOrder,won);};
    this.time.delayedCall(350,finish);
  }

  /** Persist once after gameplay; wait for VFX/fades, then actual victory clip events. */
  private advanceRunVictory():void{
    if(this.runVictoryStage!=='finishing'||this.activeSkillActions>0||this.pendingImpacts>0)return;
    if(!this.runSettled){this.runSettled=true;this.runContext.settle(this.turnOrder,true);}
    if(this.preparedScenes?.snapshot().active||this.enemies.some(e=>e.visible))return;
    this.runVictoryStage='celebrating';

    this.actionBanner?.clear();
    const living=this.turnOrder.filter(h=>!h.isDead);let remaining=living.length;
    const ready=()=>{if(this.runVictoryStage!=='celebrating')return;this.runVictoryStage='rewards';this.runContext.rewardsReady();};
    if(!remaining){ready();return;}
    // The reward choice opens over the celebration after a short beat instead of waiting for every
    // victory clip to finish (that took ~2.8 s per fight); the clips keep playing underneath.
    this.time?.delayedCall(VICTORY_REWARD_DELAY_MS,ready);
    living.forEach(hero=>hero.playVictoryCycle(()=>{remaining--;if(!remaining)ready();}));
  }

  private ribbonPlan(){
    const hero=this.getActiveHero();
    return this.combatState==='PLAYER_TURN'&&hero&&!hero.isDead&&!hero.hasActed?this.plannedActions.get(hero):undefined;
  }

  private pickRibbonHero(hero:UnitActor):void{
    const plan=this.ribbonPlan();
    if(plan&&plan.kind==='skill'&&plan.skill.scope==='single_ally'){
      const index=this.turnOrder.indexOf(hero);
      if(index>=0)this.confirmRibbonTarget(this.enemies.length+index);
      return;
    }
    if(hero!==this.getActiveHero()&&plan)this.cancelPlannedAction();
    this.openHeroCommands(hero);
  }

  /**
   * Target-first commands: Attack and single-enemy skills hit the current target at once.
   * Area, party and self skills also run at once; only single-ally skills wait for an ally choice.
   */
  private chooseRibbonAbility(index:number):void{
    const hero=this.getActiveHero();
    if(!hero)return;
    if(index===4){this.useLimitBurst(hero);this.refreshCombatHud();return;}
    const skill=index===0?undefined:this.unitSkills[hero.unitKey]?.[index-1];
    if(index===0)this.planHeroAttack();
    else if(skill)this.planHeroSkill(skill);
    else return;
    const plan=this.ribbonPlan();
    if(plan&&(plan.kind==='attack'?index===0:plan.skill===skill)){
      const scope=plan.kind==='skill'?plan.skill.scope:'single_enemy';
      if(scope==='single_enemy'){
        const target=this.currentTarget&&this.currentTarget.currentHp>0?this.currentTarget:this.autoRetarget();
        if(target){plan.target=target;this.ribbonMarks=[target];this.executePlannedAction();}
      }else if(scope!=='single_ally'&&plan.kind==='skill'){
        this.ribbonMarks=scope==='all_enemies'?this.enemies.filter(enemy=>enemy.currentHp>0):this.friendlySkillTargets(hero,plan.skill);
        this.executePlannedAction();
      }
    }
    this.refreshCombatHud();
    if(this.ribbonPlan())this.combatHud.moveFocus(1);
  }

  /** A full LB gauge commits the hero's Limit Burst on the current target at once. */
  private useLimitBurst(hero:UnitActor):void{
    const lb=this.limitBursts[hero.unitKey];
    if(!lb||this.combatState!=='PLAYER_TURN'||hero.isDead||hero.hasActed)return;
    if(!isFull(hero.limitGauge)||!this.canUseSourceSkill(lb)){this.runContext.uiSound?.('unavailable');this.updateStatus('The Limit gauge is not full yet.');return;}
    const target=this.currentTarget&&this.currentTarget.currentHp>0?this.currentTarget:this.autoRetarget();
    if(!target)return;
    this.runContext.uiSound?.('select');
    this.plannedActions.set(hero,{kind:'skill',skill:lb,target});
    this.ribbonMarks=[target];
    this.executePlannedAction();
  }

  /** Changes the enemy target without spending an action; only during command selection. */
  private retarget(enemy:TargetDummy|undefined):void{
    if(this.combatState!=='PLAYER_TURN'||!enemy||enemy.currentHp<=0||enemy===this.currentTarget)return;
    this.runContext.uiSound?.('select');
    this.setTarget(enemy);
    this.refreshCombatHud();
  }

  private cycleTarget(delta:number):void{
    const living=this.enemies.filter(enemy=>enemy.currentHp>0);
    if(!living.length)return;
    const index=living.indexOf(this.currentTarget as TargetDummy);
    this.retarget(living[(index<0?0:index+delta+living.length)%living.length]);
  }

  private confirmRibbonTarget(index:number):void{
    const plan=this.ribbonPlan();
    if(!plan){this.retarget(this.enemies[index]);return;}
    const scope=plan.kind==='skill'?plan.skill.scope:'single_enemy';
    if(scope==='single_ally'){
      const ally=this.turnOrder[index-this.enemies.length];
      if(!ally||ally.isDead||ally.currentHp<=0)return;
      this.runContext.uiSound?.('select');
      this.executePlannedAction(ally);
    }else if(scope==='single_enemy'){
      const enemy=this.enemies[index];
      if(!enemy||enemy.currentHp<=0)return;
      this.runContext.uiSound?.('select');
      this.setTarget(enemy);
      plan.target=enemy;
      this.executePlannedAction();
    }
    this.refreshCombatHud();
  }

  private refreshCombatHud():void {
    const hero=this.getActiveHero(),plan=this.ribbonPlan();
    const available=this.combatState==='PLAYER_TURN'&&!!hero&&!hero.isDead&&!hero.hasActed;
    if(this.combatState!=='HERO_ATTACKING')this.ribbonMarks=[];
    const skill=plan?.kind==='skill'?plan.skill:undefined;
    const scope=skill?.scope??'single_enemy';
    const stage=this.currentEncounter();
    const camera=this.cameras.main;
    const placement=(sprite:Phaser.GameObjects.Sprite)=>{
      const bounds=sprite.getBounds();
      const matrix=(camera as Phaser.Cameras.Scene2D.Camera & {matrix:Phaser.GameObjects.Components.TransformMatrix}).matrix;
      const center=matrix.transformPoint(bounds.centerX-camera.scrollX,bounds.centerY-camera.scrollY);
      return {x:center.x/this.scale.width*100,y:center.y/this.scale.height*100,
        width:bounds.width*camera.zoomX/this.scale.width*100,height:bounds.height*camera.zoomY/this.scale.height*100};
    };
    const actors:import('../ui/CombatHud').CombatHudState['actors']=this.enemies.flatMap((enemy,id)=>{
      if(enemy.currentHp<=0)return [];
      const definition=ENEMY_CONTENT[enemy.assetKey];
      const intent=enemy.isBoss&&definition?.behavior?enemyAction(definition,enemy.actionCursor,enemy.currentHp/enemy.maxHp):undefined;
      // Statuses show as icon badges; the text line keeps the boss intent only.
      const status=intent?[intent.name,intent.next,intent.phase].filter(Boolean).join(' · '):'';
      const selectable=this.combatState==='PLAYER_TURN'&&scope!=='single_ally';
      return [{id,name:enemy.nameTag,hp:enemy.currentHp,maxHp:enemy.maxHp,boss:enemy.isBoss,rank:enemy.isBoss?(this.currentEncounter().kind==='elite'?'Elite':'Boss'):undefined,status,selectable,
        statuses:enemyStatusBadges(enemy.statusEffects),affinity:enemyAffinities(enemy.assetKey),
        targeted:selectable&&enemy===this.currentTarget,marked:this.ribbonMarks.includes(enemy),...placement(enemy.sprite)}];
    });
    const skills=hero?(this.unitSkills[hero.unitKey]??[]).slice(0,3):[];
    this.combatHud.render({
      area:stage.title,wards:this.runContext.state.wards,phase:`${ENCOUNTER_LABELS[stage.kind??(stage.boss?'boss':'normal')]} ${this.fightNumber} / ${encounters(this.runContext.state.areas).length}`,pending:!!plan,
      message:plan?`${skill?.name??'Attack'} · ${scope==='single_ally'?'Choose an ally':'Choose an enemy'}`:
        available?`Round ${this.currentRound} · ${hero.heroName} → ${this.currentTarget?.nameTag??'no target'}`:this.statusMessage,
      actors:[...actors,...this.turnOrder.flatMap((ally,i)=>{
        const selectable=!!plan&&scope==='single_ally'&&!ally.isDead&&ally.currentHp>0;
        return selectable||this.ribbonMarks.includes(ally)?[{id:this.enemies.length+i,name:ally.heroName,selectable,targeted:false,marked:true,...placement(ally)}]:[];
      })],
      party:this.turnOrder.map((member,i)=>{
        const state=member.isDead?'ko':member.hasActed?'acted':member===hero&&available?'active':'ready';
        const status={ko:'K.O.',acted:'Acted',active:'Active',ready:'Ready'}[state];
        const target=plan&&scope==='single_ally'&&!member.isDead&&member.currentHp>0?this.enemies.length+i:undefined;
        const definition=this.cache.json.get(`character_${member.unitKey}`) as CharacterDefinition;
        return {name:member.heroName,portrait:definition.portrait?`/assets/units/${member.unitKey}/${definition.portrait}`:undefined,status,
          active:member===hero&&available,disabled:target===undefined&&(this.combatState!=='PLAYER_TURN'||member.isDead||member.hasActed||scope==='single_ally'),
          state,target,hp:member.currentHp,maxHp:member.maxHp,mp:member.currentMp,maxMp:member.maxMp,
          statuses:member.isDead?[]:heroStatusBadges(member.sourceBuffs,this.currentRound),
          ...((w=>w?{weapon:{glyph:WEAPON_GLYPHS[w.category]??'⚔',name:w.name,tip:weaponSummary(w),elements:w.elements}}:{})(this.memberOf(member)?.weapon)),
          ...(this.limitBursts[member.unitKey]?{limit:{value:member.limitGauge,max:LB_MAX}}:{})};
      }),
      commands:[{name:'Attack',icon:'attack',cost:'0 MP',description:'Free weapon strike on one enemy, power 1× · 15% chance of a critical hit',disabled:!available,selected:plan?.kind==='attack'},
        ...[0,1,2].map(i=>{
          const action=skills[i];if(!action)return null;
          return {name:action.name,icon:(action.motion==='magic_atk'?'magic':'ability') as 'magic'|'ability',iconUrl:skillIconUrl(action),cost:`${action.mpCost} MP${action.hpCost?' · '+action.hpCost+' HP':''}`,description:skillDescription(action)+(hero&&hero.currentMp<action.mpCost?` · Not enough MP (${hero.currentMp}/${action.mpCost})`:hero&&action.scope==='party'&&!this.friendlySkillTargets(hero,action).length?(action.allyTargeting?.startsWith('fallen')?' · Nobody to revive right now':' · No valid target right now'):''),
            disabled:!available||!hero||hero.currentMp<action.mpCost||!!action.hpCost&&hero.currentHp<=action.hpCost||!this.canUseSourceSkill(action),selected:skill===action};
        }),
        ...(hero&&this.limitBursts[hero.unitKey]?[(()=>{const lb=this.limitBursts[hero.unitKey],ready=isFull(hero.limitGauge);
          return {name:lb.name,icon:'limit' as const,cost:ready?'Limit ready':`Limit ${hero.limitGauge}%`,description:skillDescription(lb)+(ready?'':` · Gauge ${hero.limitGauge}%: fills as this hero acts and takes damage, and carries over between battles`),
            disabled:!available||!ready||!this.canUseSourceSkill(lb),selected:skill===lb,limit:true,ready};})()]:[])],
    });
  }

  update(): void {
    if(this.time.now>=this.hudRefreshAt){this.hudRefreshAt=this.time.now+80;this.refreshCombatHud();}
    this.advanceRunVictory();
    // Dynamic Y-depth sorting
    this.turnOrder.forEach(hero => hero.updateDepth());
    this.enemies.forEach((e) => {
      if (e.visible) e.updateDepth();
    });
  }

  private createArenaBackground(width: number, height: number): void {
    const definition = BATTLE_ARENAS[this.arenaKey];
    const { arena } = getBattleLayout(width, height, definition);
    const background = this.add.image(arena.x + arena.width / 2, arena.y + arena.height / 2, definition.texture)
      .setDepth(-100);
    // Cover the arena proportionally; source floor bounds use this same crop.
    background.setScale(arenaCoverScale(arena.width, arena.height, {width: background.width, height: background.height,
      contentWidth: (definition as {contentWidth?: number}).contentWidth}));
    background.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.stageAnimation=StageAnimation.create(this,this.arenaKey,arena);
  }

  public stageAnimationSnapshot(){return this.stageAnimation?.snapshot()??null;}

  public openHeroCommands(hero: UnitActor): void {
    if (this.combatState !== 'PLAYER_TURN' || hero.isDead || hero.hasActed || !this.turnOrder.includes(hero)) return;
    this.selectHero(hero);
    this.isCommandMenuOpen = true;
    this.refreshPlannedPose(hero);
  }

  private getActiveHero(): UnitActor | undefined {
    return this.turnOrder[this.activeHeroIndex];
  }

  /** Selecting an available hero never spends their action or MP. */
  public selectHero(hero: UnitActor): void {
    if (this.combatState !== 'PLAYER_TURN' || hero.isDead || hero.hasActed) return;
    const index = this.turnOrder.indexOf(hero);
    if (index < 0) return;
    const previous = this.getActiveHero();
    if(previous!==hero)this.runContext.uiSound?.('select');
    this.isCommandMenuOpen = false;
    if (previous) this.refreshPlannedPose(previous);
    this.activeHeroIndex = index;
    this.refreshPlannedPose(hero);
    const plan = this.plannedActions.get(hero);
    if (plan?.target && plan.target.currentHp > 0) this.setTarget(plan.target);
    this.updateStatus(`${hero.heroName}: choose a command.`);
  }

  private refreshPlannedPose(hero: UnitActor): void {
    const plan = this.plannedActions.get(hero);
    if (plan) hero.playCommandPose(plan.kind === 'skill'
      ? plan.skill.actionChoreography?.commandPose!==undefined
        ? plan.skill.actionChoreography.commandPose==='magic-standby'
        : plan.skill.motion === 'magic_atk'
      : plan.config.attackAnim === 'magic_atk');
    else if (hero === this.getActiveHero() && this.isCommandMenuOpen) hero.playCommandPose();
    else hero.clearCommandPose();
  }

  public planHeroAttack(): void {
    const hero = this.getActiveHero();
    if (this.combatState !== 'PLAYER_TURN' || !hero || hero.isDead || hero.hasActed) return;
    this.runContext.uiSound?.('select');
    this.plannedActions.set(hero, { kind: 'attack', config: { ...hero.combatConfig }, target: this.currentTarget });
    this.finishPlanning(hero, 'Attack');
  }

  public planHeroSkill(skill: SkillConfig): void {
    const hero = this.getActiveHero();
    if (this.combatState !== 'PLAYER_TURN' || !hero || hero.isDead || hero.hasActed) return;
    if (!(this.unitSkills[hero.unitKey] ?? []).includes(skill)) return;
    if (!this.canUseSourceSkill(skill)) { this.runContext.uiSound?.('unavailable'); this.updateStatus('This skill requires ready Source visuals.'); return; }
    if (hero.currentMp < skill.mpCost) {
      this.runContext.uiSound?.('unavailable');
      this.updateStatus(`Not enough MP to prepare ${skill.name}.`);
      return;
    }
    if (skill.hpCost && hero.currentHp<=skill.hpCost) { this.runContext.uiSound?.('unavailable'); this.updateStatus('Not enough HP to prepare this skill.'); return; }
    this.runContext.uiSound?.('select');
    this.plannedActions.set(hero, { kind: 'skill', skill, target: this.currentTarget });
    this.finishPlanning(hero, skill.name);
  }

  private finishPlanning(hero: UnitActor, label: string): void {
    this.isCommandMenuOpen = false;
    this.refreshPlannedPose(hero);
    this.updateStatus(`${label} ready. Choose a target.`);
  }

  public executePlannedAction(ally?:UnitActor): void {
    const hero = this.getActiveHero();
    if (this.combatState !== 'PLAYER_TURN' || !hero || hero.isDead || hero.hasActed) return;
    const plan = this.plannedActions.get(hero);
    if (!plan) { this.runContext.uiSound?.('unavailable'); this.updateStatus('Prepare an Attack or Skill first.'); return; }
    if (plan.kind === 'skill' && !this.canUseSourceSkill(plan.skill)) { this.runContext.uiSound?.('unavailable'); this.updateStatus('This skill requires ready Source visuals.'); return; }
    if (plan.kind === 'skill' && hero.currentMp < plan.skill.mpCost) {
      this.runContext.uiSound?.('unavailable');
      this.updateStatus(`Not enough MP to execute ${plan.skill.name}. Change the prepared command.`);
      return;
    }
    if (plan.kind==='skill' && plan.skill.hpCost && hero.currentHp<=plan.skill.hpCost) {
      this.runContext.uiSound?.('unavailable');
      this.updateStatus('Not enough HP to execute the prepared skill.'); return;
    }
    if (plan.target && plan.target.currentHp > 0) this.setTarget(plan.target);
    this.runContext.uiSound?.('confirm');
    this.isCommandMenuOpen = false;
    this.plannedActions.delete(hero);
    if (plan.kind === 'attack') {
      hero.combatConfig = { ...plan.config };
      this.executeActiveHeroAttack();
    } else this.executeSkillChoice(plan.skill,ally);
  }

  public cancelPlannedAction(): void {
    const hero = this.getActiveHero();
    if (this.combatState !== 'PLAYER_TURN' || !hero || !this.plannedActions.has(hero)) return;
    this.runContext.uiSound?.('back');
    this.plannedActions.delete(hero);
    this.refreshPlannedPose(hero);
    this.updateStatus(`${hero.heroName}: Prepared command cleared.`);
  }

  /** Sets the active enemy target; the CombatHud shows it with the target cursor. */
  public setTarget(enemy: TargetDummy): void {
    if (!enemy || enemy.currentHp <= 0) return;
    this.currentTarget = enemy;
  }

  /**
   * Automatically switches targeting to the next alive enemy if current target dies.
   */
  private autoRetarget(): TargetDummy | null {
    const nextAlive = this.enemies.find((e) => e.currentHp > 0);
    if (nextAlive) {
      this.setTarget(nextAlive);
      return nextAlive;
    } else {
      this.currentTarget = null;
      return null;
    }
  }

  /**
   * Spawns the encounter wave according to ENCOUNTERS data structure.
   */
  private spawnEncounter(onComplete?: () => void, onFormationReady?:()=>void): void {
    this.preparedScenes?.stop();
    this.combatState = 'SPAWNING';
    this.currentTarget = null;
    this.victoryTriggered = false;
    this.plannedActions.clear();
    this.isCommandMenuOpen = false;
    const enemySlots = getBattleLayout(this.scale.width, this.scale.height, BATTLE_ARENAS[this.arenaKey]).enemies;
    const configs = this.currentEncounter().enemies.map((config) => ({
      ...config,
      ...enemySlots[config.slot],
    }));

    // Keep the existing actor class; prepared content selects its texture namespace.
    configs.forEach((config,index)=>{
      const key=config.key;
      if(this.enemies[index]?.assetKey===key)return;
      this.enemies[index]?.destroy();
      const definition=ENEMY_CONTENT[key],manifest=this.manifests[key];
      if(!manifest||!definition&&!this.runContext.encounter)throw Error('Unpublished enemy body: '+key);
      // Enemies follow the same body sampling rule as heroes (FFBE draws monsters as smoothly as units).
      const linear=(this.runContext.bodyTextureFilter??this.cache.json.get('run_rules')?.bodyTextureFilter)==='linear';
      for(const clip of Object.keys(manifest.animations))setBodySampling(this,`${key}_${clip}`,linear);
      const arena=getBattleLayout(this.scale.width,this.scale.height,BATTLE_ARENAS[this.arenaKey]).arena;
      this.enemies[index]=new TargetDummy(this,config.x,config.y,manifest,definition?{assetKey:key,scale:definition.scale,attack:definition.attack,
        bounds:{left:arena.x+8,right:arena.x+arena.width-8,top:arena.y+8,bottom:arena.y+arena.height-8}}:undefined);
    });

    // Hide any unused dummies from prior fights
    for (let i = configs.length; i < this.enemies.length; i++) {
      this.enemies[i].currentHp = 0;
      this.enemies[i].setVisible(false);
      this.enemies[i].disableInteractive();
    }

    let completedCount = 0;
    const totalToSpawn = configs.length;

    configs.forEach((cfg, idx) => {
      const enemy = this.enemies[idx];
      enemy.setBaseSlot(cfg.x, cfg.y);
      enemy.isBoss = cfg.isBoss;
      enemy.setNameTag(cfg.nameTag);
      enemy.setDepth(cfg.y);

      // Play spawn animation on each enemy
      enemy.playSpawnAnimation(cfg.hp, cfg.nameTag, () => {
        completedCount++;
        if (completedCount === totalToSpawn) {
          onFormationReady?.();
          const firstAlive = this.enemies.find((e) => e.currentHp > 0);
          if (firstAlive) {
            this.setTarget(firstAlive);
          }
          // No intro card (2026-11-11): the HP plate names elites and bosses.
          onComplete?.();
        }
      });
    });
  }

  /**
   * Starts a new combat round: resets living heroes' action flags and selects first alive hero.
   */
  private startRound(): void {
    const allDead = this.enemies.every((e) => e.currentHp <= 0);
    if (allDead) {
      this.triggerVictory();
      return;
    }

    const aliveHeroes = this.turnOrder.filter((h) => !h.isDead);
    if (aliveHeroes.length === 0) {
      this.triggerDefeat();
      return;
    }

    this.victoryTriggered = false;

    // Reset action flags
    aliveHeroes.forEach((h) => {
      h.hasActed = false;
      h.clearCommandPose();
    });

    // Find first alive hero index (Cloud = 0)
    let firstAliveIdx = 0;
    while (firstAliveIdx < this.turnOrder.length && this.turnOrder[firstAliveIdx].isDead) {
      firstAliveIdx++;
    }

    this.activeHeroIndex = firstAliveIdx;
    this.combatState = 'PLAYER_TURN';

    // Ensure active target is selected and marker is visible
    if (!this.currentTarget || this.currentTarget.currentHp <= 0) {
      this.autoRetarget();
    } else {
      this.setTarget(this.currentTarget);
    }

    this.updateStatus(`Round ${this.currentRound}: Prepare commands for any ready heroes. Choose who executes first.`);
  }

  /**
   * Advances the turn pointer to the next living hero who hasn't acted yet.
   */
  private advanceToNextHero(): void {
    if (this.combatState !== 'HERO_ATTACKING' && this.combatState !== 'VICTORY') return;
    const allDead = this.enemies.every((e) => e.currentHp <= 0);
    if (allDead || this.combatState === 'VICTORY') {
      this.triggerVictory();
      return;
    }

    // Find next alive hero that hasn't acted
    const nextIdx = this.turnOrder.findIndex(hero => !hero.isDead && !hero.hasActed);

    if (nextIdx >= 0) {
      // Next hero found
      this.activeHeroIndex = nextIdx;
      this.combatState = 'PLAYER_TURN';
      this.updateStatus(`${this.getActiveHero()?.heroName} ready. You can select any remaining hero.`);
    } else {
      // All living heroes have acted this round -> Enemy turn!
      this.combatState = 'ENEMY_TURN';
      this.updateStatus('All heroes have acted! Enemies attacking...');
      this.time.delayedCall(450, () => this.executeEnemyTurn());
    }
  }

  private canUseSourceSkill(skill: SkillConfig): boolean {
    // Barrage-type commands need no scene: they replay the basic attack.
    if (skill.execution === 'basic-attack-repeat') return skill.importStatus === 'imported' && this.enemies.some(enemy => enemy.currentHp > 0);
    return !this.sourceVisualError && skill.importStatus !== 'not-imported' && !!this.sourceSceneKey(skill,
      skill.scope === 'party' ? this.friendlySkillTargets(this.getActiveHero(),skill).length
        : skill.scope === 'all_enemies' ? this.enemies.filter(enemy => enemy.currentHp > 0).length : 1);
  }

  private friendlySkillTargets(hero: UnitActor | undefined, skill: SkillConfig): UnitActor[] {
    if (!hero) return [];
    if (skill.allyTargeting==='fallen-ally' || skill.allyTargeting==='fallen-allies') {
      const fallen=this.turnOrder.filter(ally=>ally.isDead && ally!==hero);
      return skill.allyTargeting==='fallen-ally' ? fallen.slice(0,1) : fallen;
    }
    return (skill.scope==='party' ? this.turnOrder : [hero]).filter(ally =>
      !ally.isDead && ally.currentHp>0 && (skill.allyTargeting!=='other-living-allies' || ally!==hero));
  }

  /**
   * Called immediately whenever an enemy receives damage.
   * If the target reaches 0 HP:
   * - Immediately fades out the defeated enemy.
   * - If ALL enemies are dead: immediately locks command menu, hides target marker,
   *   sets combatState to VICTORY, and marks battle finished.
   * - If other enemies are still alive: immediately retargets to next alive monster.
   */
  private handleTargetDamaged(target: TargetDummy): void {
    if (target.currentHp <= 0) {
      target.playDefeatFade();

      const allDead = this.enemies.every((e) => e.currentHp <= 0);
      if (allDead) {
        this.combatState = 'VICTORY';
        this.isCommandMenuOpen = false;
        this.updateStatus(`K.O.! ${target.nameTag} defeated! All enemies eliminated!`);
      } else {
        const next = this.autoRetarget();
        if (next) {
          this.updateStatus(`K.O.! ${target.nameTag} defeated. Retargeting to ${next.nameTag}.`);
        }
      }
    }
  }

  /**
   * Executes the active hero's attack and then advances the turn.
   */
  public executeActiveHeroAttack(): void {
    if (this.combatState !== 'PLAYER_TURN') return;
    const hero = this.getActiveHero();
    if (!hero || hero.isDead || hero.hasActed) return;

    this.combatState = 'HERO_ATTACKING';

    this.announceCombatAction(hero.unitKey,hero.heroName,'attack','Attack','hero','attack','basic');
    this.startHeroAction(hero, hero.combatConfig.attackAnim, () => this.executeHeroSequence(hero, () => {
      hero.hasActed = true;
      hero.limitGauge = gainFromAction(hero.limitGauge);

      // Check Victory: if all enemies are defeated or fight ended mid-turn, trigger victory immediately!
      const allDead = this.enemies.every((e) => e.currentHp <= 0);
      if (allDead || this.combatState === 'VICTORY') {
        this.triggerVictory();
        return;
      }

      // Advance to next hero
      this.advanceToNextHero();
    }));
  }

  /**
   * Dedicated entry point for executing a chosen SkillConfig.
   */
  public executeSkillChoice(skill: SkillConfig,ally?:UnitActor): void {
    if (this.combatState !== 'PLAYER_TURN') return;
    const hero = this.getActiveHero();
    if (!hero || hero.isDead || hero.hasActed) return;
    if (!this.canUseSourceSkill(skill)) {
      this.updateStatus(!skill.scenePresentation || skill.importStatus === 'not-imported'
        ? 'This skill has not been imported.' : 'Skill visuals are unavailable. No MP was spent.');
      return;
    }
    if(skill.scope==='single_ally'&&(!ally||!this.turnOrder.includes(ally)||ally.isDead||ally.currentHp<=0))return;
    const sourceCount = skill.scope === 'party' ? this.friendlySkillTargets(hero,skill).length
      : skill.scope === 'all_enemies' ? this.enemies.filter(enemy => enemy.currentHp > 0).length : 1;
    try {
      if (skill.execution === 'basic-attack-repeat') validateBasicRepeat(skill);
      else {
        if (!reviewedSkillEvents(skill)?.length) throw Error('Reviewed gameplay events required');
        validateSceneAction(this.cache.json.get(`scene_${skill.scenePresentation}_manifest`), skill);
        validateActionChoreography(skill,undefined,hero.manifest.animations);
      }
    } catch { this.updateStatus('Skill import is incompatible. No MP was spent.'); return; }
    const admittedSourceKey = skill.execution === 'basic-attack-repeat' ? undefined : this.sourceSceneKey(skill, sourceCount)!;
    if (skill.hpCost && hero.currentHp<=skill.hpCost) {
      this.updateStatus(`Not enough HP to use ${skill.name}. The caster must survive the cost.`);
      return;
    }
    if (skill.type==='LIMIT' && (this.limitBursts[hero.unitKey]!==skill || !isFull(hero.limitGauge))) {
      this.updateStatus('The Limit gauge is not full yet.');
      return;
    }
    if (!hero.useMp(skill.mpCost)) {
      this.updateStatus(`Not enough MP to cast ${skill.name}! (Need ${skill.mpCost} MP, have ${hero.currentMp})`);
      return;
    }

    if (skill.hpCost) hero.spendHp(skill.hpCost);
    if (skill.type==='LIMIT') { hero.limitGauge = 0; this.limitCasters.add(hero); }

    this.combatState = 'HERO_ATTACKING';

    this.activeSkillActions++;
    this.announceCombatAction(hero.unitKey,hero.heroName,skill.id,skill.name,'hero','skill','source');
    this.skillActors.add(hero);
    let finished = false;
    const perform = skill.execution === 'basic-attack-repeat'
      ? (done: () => void) => this.executeBasicRepeat(hero, skill, done)
      : (done: () => void) => this.executeGenericSkill(hero, skill, done, admittedSourceKey, ally);
    this.startHeroAction(hero, skill.actionChoreography?.readiness==='magic-standby'?'magic_atk':'atk', () => perform(() => {
      if (finished) return;
      finished = true;
      this.activeSkillActions--;
      this.skillActors.delete(hero);
      this.concludeHeroSkill(hero);
    }));
  }

  /** Show one full magic readiness cycle before starting the cast timeline. */
  private startHeroAction(hero: UnitActor, motion: string, action: () => void): void {
    const preparation = motion === 'magic_atk' ? hero.manifest.animations.magic_standby : undefined;
    if (!preparation) {
      action();
      return;
    }
    hero.playCommandPose(true);
    const duration = preparation.frames.reduce((total, frame) => total + frame.durationMs, 0);
    this.time.delayedCall(duration, () => {
      if (this.combatState === 'HERO_ATTACKING' && !hero.isDead) action();
    });
  }

  private concludeHeroSkill(hero: UnitActor): void {
    hero.hasActed = true;
    if (!this.limitCasters.delete(hero)) hero.limitGauge = gainFromAction(hero.limitGauge);

    const allDead = this.enemies.every((e) => e.currentHp <= 0);
    if (allDead || this.combatState === 'VICTORY') {
      this.triggerVictory();
      return;
    }

    this.advanceToNextHero();
  }

  private sourceSceneKey(skill: SkillConfig, count = 1): string | undefined {
    return !this.sourceVisualError && skill.scenePresentation && this.preparedScenes?.canPlay(skill.scenePresentation,count)
      ? skill.scenePresentation : undefined;
  }

  /** Stable unit rectangle of a hero (idle frame), independent of the clip currently playing. */
  private casterFootprint(caster: UnitActor|TargetDummy){
    const idle=caster.manifest?.animations?.idle;
    if(!idle)return undefined;
    // Enemy bodies scale their sprite inside the container; heroes scale the actor itself.
    const scale=caster instanceof TargetDummy?Math.abs(caster.sprite.scaleX*caster.scaleX):Math.abs(caster.scaleX);
    return {frameWidth:idle.frameWidth,frameHeight:idle.frameHeight,pivotX:idle.pivotX,pivotY:idle.pivotY,scale};
  }

  /**
   * Approach point: a source strike defined in the caster's unit rectangle lands on the target's
   * centre; otherwise the hero's reviewed foot offset applies. Clips with a published horizontal
   * extent (Limit Burst bodies travel far inside their clip) are then kept fully on screen.
   */
  private approachX(hero: UnitActor, target: TargetDummy | UnitActor, key: string, clips: string[] = []): number {
    const manifest=this.cache.json.get('scene_'+key+'_manifest') as PreparedSceneManifest|undefined;
    const strike=manifest&&casterStrikeOffset(manifest.plan,this.casterFootprint(hero));
    let x:number;
    if(!strike)x=target.x + hero.combatConfig.targetOffsetX * BATTLE_ART_SCALE;
    else {
      const sprite=target instanceof UnitActor ? target : target.sprite;
      const width=sprite.frame.width*Math.abs(sprite.scaleX*(target instanceof UnitActor?1:target.scaleX));
      x=target.x-sprite.originX*width+width/2-strike.x;
    }
    const extents=clips.map(clip=>hero.manifest?.animations?.[clip]?.extentX).filter((e):e is [number,number]=>!!e);
    if(!extents.length)return x;
    // Hits on the target come first: the body may leave the screen by up to a third of its travel at
    // the clip's widest frames before the whole performance is shifted (which moves every hit off the
    // target). Lion Heart was 107 px off its target with a full clamp.
    const scale=Math.abs(hero.scaleX),margin=16,allowance=1/3;
    const left=Math.min(...extents.map(e=>e[0]))*scale*(1-allowance),right=Math.max(...extents.map(e=>e[1]))*scale*(1-allowance);
    const min=margin-left,max=this.scale.width-margin-right;
    return min<=max?Math.min(max,Math.max(min,x)):(min+max)/2;
  }

  private playPreparedScene(key: string, hero: UnitActor | TargetDummy, targets: (TargetDummy | UnitActor)[], onComplete?: () => void): void {
    const host: PreparedSceneHost = {width:this.scale.width,height:this.scale.height,
      arena:getBattleLayout(this.scale.width,this.scale.height,BATTLE_ARENAS[this.arenaKey]).arena,
      caster:{x:hero.x,y:hero.y},targets:{},units:{}};
    // Only plans with caster-unit members need the caster footprint; other hosts stay unchanged.
    const plan=(this.cache.json.get('scene_'+key+'_manifest') as PreparedSceneManifest|undefined)?.plan;
    if((plan?.members as {placement?:{rectangle?:string}}[]|undefined)?.some(member=>member.placement?.rectangle==='caster-unit'))host.casterUnit=this.casterFootprint(hero);
    // Backdrop surfaces (dimming, uniform backgrounds) tint the whole canvas: the background shows
    // above and below the arena and the opaque DOM HUD covers the rest. Accepted particle flashes
    // and all other plans keep the arena clip unchanged.
    if((plan?.effects as {nodes?:{presentationCoverage?:{primitive?:string}}[]}[]|undefined)?.some(effect=>effect.nodes?.some(node=>['unit-xy-model','unit-quad','screen-particle'].includes(node.presentationCoverage?.primitive??''))))
      host.view={x:0,y:0,width:host.width,height:host.height};
    targets.forEach((target,index) => {
      const sprite = target instanceof UnitActor ? target : target.sprite, name = 'target'+index;
      host.targets[name] = {x:target.x,y:target.y};
      host.units[name] = {frameWidth:sprite.frame.width,frameHeight:sprite.frame.height,
        pivotX:sprite.originX,pivotY:sprite.originY,scale:sprite.scaleX * (target instanceof UnitActor ? 1 : target.scaleX)};
    });
    const audio=(this.cache.json.get('scene_'+key+'_manifest') as PreparedSceneManifest|undefined)?.audioSource;
    const cues=audio?.playbackSupported?audio.events:[];
    let next=0;
    this.preparedScenes!.play(key,host,onComplete,cues.length?frame=>{
      while(next<cues.length&&cues[next].frame<=frame){
        const event=cues[next++];
        const cue=event.resource?.key;
        if(cue&&isCombatCue(cue))this.emitCombatSound(cue,'source',event.frame);
      }
    }:undefined);
  }

  /**
   * Readable enemy hit on a hero (until imported monster attack effects exist): an impact burst at
   * the hero's body, a short knockback away from the attacker, a strike cue and, for heavy hits
   * (> 18 % of max HP), a small camera shake. Presentation only; damage is already applied.
   */
  private playHeroHitFeedback(hero:UnitActor,fromX:number,share:number):void {
    if(typeof hero.getBounds!=='function'||typeof this.add?.graphics!=='function')return;
    const bounds=hero.getBounds(),x=bounds.centerX,y=bounds.centerY,away=hero.x>=fromX?1:-1;
    const burst=this.add.graphics({x,y}).setDepth(1500).setBlendMode(Phaser.BlendModes.ADD);
    const rays=9,inner=10,outer=46+Math.min(40,share*160);
    burst.fillStyle(0xfff3c4,1);
    for(let i=0;i<rays;i++){
      const a=i/rays*Math.PI*2+Math.random()*.3,b=a+Math.PI/rays*.55,r=outer*(.65+Math.random()*.35);
      burst.fillTriangle(Math.cos(a)*inner,Math.sin(a)*inner,Math.cos(b)*inner,Math.sin(b)*inner,Math.cos((a+b)/2)*r,Math.sin((a+b)/2)*r);
    }
    burst.fillStyle(0xffffff,.9).fillCircle(0,0,inner+4);
    burst.setScale(.35).setRotation(Math.random()*Math.PI);
    this.tweens.add({targets:burst,scale:1.15,alpha:0,duration:240,ease:'Cubic.easeOut',onComplete:()=>burst.destroy()});
    if(!hero.isDead){
      const home=hero.x;
      this.tweens.add({targets:hero,x:home+away*16,duration:70,yoyo:true,ease:'Quad.easeOut',onComplete:()=>{hero.x=home;}});
    }
    this.emitCombatSound('SE:7','enemy-hit');
    if(share>.18)this.cameras.main.shake(140,.004);
  }

  private emitCombatSound(cue:CombatCue,event:string,sourceFrame?:number):void {
    this.events.emit('combat-sfx',{cue,event,sourceFrame});
    this.runContext.combatSound?.(cue,sourceFrame!==undefined);
  }

  /** sourceFrame: an original hit frame. Such onsets are authored, so rapid multi-hit attacks (Cid's six
   * hits) retire the oldest voice instead of dropping later hits at the two-voice limit. */
  private basicImpactSound(hero:UnitActor,isCritical:boolean,sourceFrame?:number):void {
    const source=basicAttackCues[String(hero.manifest.unitId) as keyof typeof basicAttackCues];
    const cue=source&&'SE:'+source.cueId;
    if(cue&&isCombatCue(cue))this.emitCombatSound(cue,'basic-impact',sourceFrame);
    if(isCritical)this.emitCombatSound('System:69','critical-impact');
  }

  /** Body completion starts recovery; effects and reviewed damage own separate clocks. */
  private executePreparedSkill(hero: UnitActor, skill: SkillConfig, key: string, targets: (TargetDummy | UnitActor)[],
    impact: (weight: number) => void, onComplete: () => void): void {
    const motion = this.preparedScenes!.choreography(key);
    const choreography=validateActionChoreography(skill,undefined,hero.manifest.animations);
    const travel=actionTravel(choreography,motion,hero);
    const target = targets[0];
    let event: string | undefined;
    let bodyDone = false, impactDone = false, closed = false, recovering=false;
    const timers: Phaser.Time.TimerEvent[] = [];
    const bodyTimers: Phaser.Time.TimerEvent[] = [];
    const stopTimers = () => { timers.forEach(timer => timer.remove(false)); timers.length = 0; };
    const cleanup = () => {
      stopTimers();
      if(event)hero.off(event, recover);
      bodyTimers.forEach(timer=>timer.remove(false));bodyTimers.length=0;
      this.events.off('shutdown', cancel);
    };
    const cancel = () => { closed = true; cleanup(); };
    const finish = () => {
      if (closed || !bodyDone || !impactDone) return;
      closed = true;
      cleanup();
      this.finishAfterImpacts(onComplete);
    };
    const rested = () => {
      if (closed) return;
      hero.setFacingLeft(true);
      hero.setDepthBoost(false);
      // Runs start the whole celebration after the shared VFX/fade barrier.
      hero.playRestPose();
      bodyDone = true;
      finish();
    };
    const recover = () => {
      if (closed||recovering) return;
      recovering=true;
      if (choreography.movement !== 'stationary') {
        hero.playAnimation('move');
        hero.setFacingLeft(false);
        this.tweens.add({targets:hero,x:hero.homeSlot.x,y:hero.homeSlot.y,
          duration:travel.returnMs,ease:'Cubic.easeInOut',onComplete:rested});
      } else if(choreography.body.mode==='rest')rested();
      else hero.returnToIdle(rested);
    };
    const start = () => {
      if (closed) return;
      if(choreography.body.mode==='rest')hero.playRestPose();
      else{
        const phases=choreography.body.phases;
        if(phases[0].frame>0)hero.playRestPose();
        phases.forEach((phase,index)=>{
          const play=()=>{
            if(closed)return;
            if(index===phases.length-1){event=`animationcomplete-${hero.manifest.assetKey??hero.unitKey}_${phase.clip}`;hero.once(event,recover);}
            hero.playAnimation(phase.clip);
          };
          if(phase.frame===0)play();
          else bodyTimers.push(this.time.delayedCall(phase.frame*1000/60,play));
        });
      }
      // Decorative tails finish independently, or are replaced by the next source presentation.
      this.playPreparedScene(key,hero,targets);
      const events = reviewedSkillEvents(skill)!;
      let remaining = events.length;
      const consumed = new Set<number>();
      events.forEach((entry, index) => {
        const timer = this.time.delayedCall(entry.frame * 1000 / 60, () => {
          if (closed || impactDone || consumed.has(index)) return;
          consumed.add(index);
          if (!hero.isDead) {
            if (entry.allyEffects) {
              for (const ally of targets) if (ally instanceof UnitActor && ally.isDead && entry.allyEffects.every(e=>e.kind==='raise')) {
                ally.revive(Math.max(1,Math.round(ally.maxHp*Math.max(...entry.allyEffects.map(e=>e.kind==='raise'?e.hpFraction:0)))));
                ally.limitGauge=0;
                this.floatCombatText(ally.x,ally.y-100,'REVIVED','#f9e2af');
                this.events.emit('hero-revived',{unit:ally.unitKey,hp:ally.currentHp,round:this.currentRound});
              }
              for (const ally of targets) if (ally instanceof UnitActor && !ally.isDead) {
                for (const effect of entry.allyEffects) {
                  if (effect.kind==='raise') continue;
                  if (effect.kind==='heal') ally.restoreHp(effect.amount);
                  else if (effect.kind==='cleanse') {
                    const before=ally.sourceBuffs.length;
                    ally.sourceBuffs=cleanseHeroDebuffs(ally.sourceBuffs);
                    if (ally.sourceBuffs.length<before) this.floatCombatText(ally.x,ally.y-100,'CLEANSED','#a6e3a1');
                  }
                  else if (effect.kind==='limit-fill') {
                    // Only heroes with a Limit Burst own a gauge.
                    if (this.limitBursts[ally.unitKey]) {
                      ally.limitGauge=gainFromSupport(ally.limitGauge,effect.amount);
                      this.floatCombatText(ally.x,ally.y-100,`LIMIT +${effect.amount}`,'#f9e2af');
                    }
                  } else {
                    ally.sourceBuffs=applyHeroBuffs(ally.sourceBuffs,[effect],this.currentRound);
                    this.floatCombatText(ally.x,ally.y-100,effect.kind==='auto-revive'?'AUTO-REVIVE':effect.kind==='guard'?(effect.damageType==='physical'?'PROTECT':'SHELL'):'PHYSICAL BOOST','#f9e2af');
                  }
                }
              }
              
              this.updateStatus(`${skill.name}: friendly effects applied.`);
            } else if (entry.effects) {
              for (const enemy of targets) if (enemy instanceof TargetDummy && enemy.currentHp > 0) {
                const statuses=entry.effects.filter(effect=>effect.kind!=='execute-or-damage');
                for(const effect of entry.effects)if(effect.kind==='execute-or-damage'&&enemy.currentHp>0){
                  const outcome=resolveEnemyInstant(effect,enemy,this.enemyEventRandom);
                  enemy.applyDamage(outcome.amount,false,'unmitigated',true);
                  this.handleTargetDamaged(enemy);
                }
                if(!statuses.length||enemy.currentHp<=0)continue;
                enemy.statusEffects = applyEnemyStatuses(enemy.statusEffects, statuses);
                this.floatCombatText(enemy.x,enemy.y-100,enemy.statusEffects.map(s=>({'magic-weakness':'MAGIC WEAK','physical-weakness':'ARMOR BREAK','attack-down':'ATTACK DOWN','silence':'SILENCE','stop':'STOP'}[s.kind])).join(' / '),'#cba6b1');
              }
              if(this.combatState!=='VICTORY')this.updateStatus(`${skill.name}: ${entry.effects.some(e=>e.kind==='execute-or-damage')?'enemy events':'status effects'} applied.`);
            } else impact(entry.weight ?? 1);
          }
          remaining--;
          // A locked target's remaining hits cannot spill into another target's visual anchor.
          if (remaining === 0 || hero.isDead || this.combatState === 'VICTORY' || !targets.some(t => t.currentHp > 0)) {
            impactDone = true;
            stopTimers();
            if(choreography.body.mode==='rest')recover();
          }
          finish();
        });
        if (timer) timers.push(timer);
      });
    };
    this.events.once('shutdown', cancel);
    this.updateStatus(`Action: ${hero.heroName} uses ${skill.name}!`);
    if (choreography.movement !== 'stationary') {
      hero.setDepthBoost(true);
      hero.playAnimation('move');
      // Preserve the game's reviewed foot placement; source camera placement is separate.
      this.tweens.add({targets:hero,
        x:choreography.movement==='step'?hero.homeSlot.x-travel.stepDistance!:this.approachX(hero,target,key,
          choreography.body.mode==='clips'?choreography.body.phases.map(p=>p.clip):[]),
        y:choreography.movement==='step'?hero.homeSlot.y:target.y,
        duration:travel.approachMs,ease:'Cubic.easeInOut',onComplete:start});
    } else start();
  }

  /**
   * Universal data-driven skill executor:
   * Handles moveType ('dash' vs 'stationary') and scope ('single_enemy', 'all_enemies', 'party').
   */
  private executeGenericSkill(hero: UnitActor, skill: SkillConfig, onComplete: () => void, admittedSourceKey?: string, ally?:UnitActor): void {
    if (skill.allyEvents) {
      const targets=ally?[ally]:this.friendlySkillTargets(hero,skill);
      const key=admittedSourceKey ?? this.sourceSceneKey(skill,targets.length);
      if(key&&targets.length)this.executePreparedSkill(hero,skill,key,targets,()=>{},onComplete);
      else onComplete();
      return;
    }
    if (skill.supportEvents && !skill.damageEvents) {
      const targets = skill.scope === 'all_enemies' ? this.enemies.filter(e=>e.currentHp>0) : this.currentTarget ? [this.currentTarget] : [];
      const key = admittedSourceKey ?? this.sourceSceneKey(skill,targets.length);
      if (key && targets.length) this.executePreparedSkill(hero,skill,key,targets,()=>{},onComplete);
      else onComplete();
      return;
    }
    if (skill.damageEvents && skill.scope === 'all_enemies') {
      this.executeSourceAreaSkill(hero, skill, onComplete, admittedSourceKey);
      return;
    }
    const target = this.currentTarget && this.currentTarget.currentHp > 0
      ? this.currentTarget
      : this.autoRetarget();
    const sourceKey = admittedSourceKey ?? this.sourceSceneKey(skill);

    let actionBase: number | undefined;
    const triggerImpact = (weight = 1) => {
      if (this.combatState !== 'HERO_ATTACKING') return;
      if (skill.scope === 'single_enemy') {
        const hitTarget = skill.damageEvents ? target : this.currentTarget && this.currentTarget.currentHp > 0 ? this.currentTarget : target;
        if (!hitTarget || hitTarget.currentHp <= 0) return;

        // 1. Hit-Stop if dashing. Source scenes own the clock: pausing the body there would let
        // it fall behind the original effect/damage timeline (80 ms per hit; Omnislash's 15 hits
        // drifted by over a second), so prepared Source actions never hit-stop.
        if (skill.moveType === 'dash' && !sourceKey) {
          hero.anims.pause();
          this.time.delayedCall(80, () => {
            if (hero.anims) hero.anims.resume();
          });
        }

        // 2. White flash on target monster
        hitTarget.sprite.setTintFill(0xffffff);
        this.time.delayedCall(70, () => {
          hitTarget.sprite.clearTint();
        });

        // 3. Screen shake scaled by multiplier
        const intensity = skill.damageMultiplier >= 4.0 ? 0.020 : skill.damageMultiplier >= 2.5 ? 0.014 : 0.009;
        const duration = skill.damageMultiplier >= 4.0 ? 250 : 180;
        this.cameras.main.shake(duration, intensity);

        // 4. Calculate damage
        const rolled = this.skillBaseDamage(hero, skill);
        actionBase ??= rolled;
        const dmg = Math.round(actionBase * skill.damageMultiplier * weight);
        const isCrit = skill.damageMultiplier >= 3.0;
        hitTarget.applyDamage(dmg, isCrit, skillDamageType(skill), false, this.actionElements(hero, skill));

        if (isCrit) {
          this.showCritPopup(hitTarget.x, hitTarget.y - 105);
        }

        this.handleTargetDamaged(hitTarget);
      } else if (skill.scope === 'all_enemies') {
        const living = this.enemies.filter((e) => e.currentHp > 0);
        if (living.length === 0) return;

        // White flash all living enemies
        living.forEach((e) => {
          e.sprite.setTintFill(0xffffff);
          this.time.delayedCall(80, () => e.sprite.clearTint());
        });

        // Screen shake
        const intensity = skill.damageMultiplier >= 3.0 ? 0.016 : 0.010;
        this.cameras.main.shake(220, intensity);

        // Calculate damage per enemy
        const rolled = this.skillBaseDamage(hero, skill);
        actionBase ??= rolled;
        const dmg = Math.round(actionBase * skill.damageMultiplier * weight);

        living.forEach((e) => {
          e.applyDamage(dmg, skill.damageMultiplier >= 3.0, skillDamageType(skill), false, this.actionElements(hero, skill));
          this.handleTargetDamaged(e);
        });
      }
    };

    if (sourceKey && target) {
      this.executePreparedSkill(hero, skill, sourceKey, [target], triggerImpact, onComplete);
      return;
    }
    // Source admission happens before MP; never substitute body-only or baked effects.
    onComplete();
  }

  /**
   * Barrage-type command (process 42, src/effects/basicRepeat.mjs): the hero repeats the basic attack
   * N times (rolled from the original min..max). Every repetition plays the attack clip with the
   * unit's original hit frames; 'random' picks a living enemy per repetition and moves there briefly,
   * 'all' hits every living enemy on each hit. Damage per hit share uses the skill base roll.
   */
  private executeBasicRepeat(hero: UnitActor, skill: SkillConfig, onComplete: () => void): void {
    const repeat = validateBasicRepeat(skill), config = hero.combatConfig;
    const count = repeat.minHits + Math.floor(this.randomValue() * (repeat.maxHits - repeat.minHits + 1));
    const hits = config.hitFrames ?? [{frame: -1, weight: 1}];
    const living = () => this.enemies.filter(enemy => enemy.currentHp > 0);
    const selected = () => this.currentTarget && this.currentTarget.currentHp > 0 ? this.currentTarget : this.autoRetarget() ?? undefined;
    const pick = (): TargetDummy | undefined => {
      const list = living();
      if (!list.length) return undefined;
      return repeat.targeting === 'random' ? list[Math.floor(this.randomValue() * list.length)] : selected() ?? list[0];
    };
    let repetition = 0;
    this.updateStatus(`Action: ${hero.heroName} uses ${skill.name}!`);
    hero.setDepthBoost(true);
    const finish = () => {
      hero.playAnimation('move');
      hero.setFacingLeft(false);
      this.tweens.add({targets: hero, x: hero.homeSlot.x, y: hero.homeSlot.y, duration: 380, ease: 'Cubic.easeInOut', onComplete: () => {
        hero.setFacingLeft(true);
        hero.setDepthBoost(false);
        hero.playRestPose();
        this.finishAfterImpacts(onComplete);
      }});
    };
    const strike = () => {
      const target = pick();
      if (repetition >= count || !target || this.combatState !== 'HERO_ATTACKING') { finish(); return; }
      repetition++;
      hero.playAnimation('move');
      this.tweens.add({targets: hero, x: target.x + config.targetOffsetX * BATTLE_ART_SCALE, y: target.y,
        duration: repetition === 1 ? 360 : 150, ease: 'Cubic.easeInOut', onComplete: () => {
          const roll = this.skillBaseDamage(hero, skill), landed = new Set<number>();
          const land = (index: number) => {
            if (landed.has(index)) return;
            landed.add(index);
            if (this.combatState !== 'HERO_ATTACKING') return;
            const victims = repeat.targeting === 'all' ? living() : [target.currentHp > 0 ? target : pick()].filter((v): v is TargetDummy => !!v);
            for (const victim of victims) {
              if (this.blindMiss(hero, victim)) continue;
              victim.applyDamage(Math.max(1, Math.round(roll * skill.damageMultiplier * hits[index].weight)), false, 'physical', false, this.actionElements(hero, skill));
              this.handleTargetDamaged(victim);
            }
            if (victims.length) this.basicImpactSound(hero, false, hits[index].frame >= 0 ? hits[index].frame : undefined);
          };
          const timers = hits.flatMap((hit, index) => hit.frame < 0 ? [] : [this.time.delayedCall(hit.frame * 1000 / 60, () => land(index))]);
          hero.playAnimation(config.attackAnim);
          hero.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            timers.forEach(timer => timer.remove(false));
            hits.forEach((_, index) => land(index));
            strike();
          });
        }});
    };
    strike();
  }

  /** Shared stationary area presentation; source hit metadata remains separate. */
  private executeSourceAreaSkill(hero: UnitActor, skill: SkillConfig, onComplete: () => void, admittedSourceKey?: string): void {
    const targets = this.enemies.filter(enemy => enemy.currentHp > 0);
    if (!targets.length) { onComplete(); return; }
    this.updateStatus(`Action: ${hero.heroName} uses ${skill.name} on all enemies!`);
    const sourceKey = admittedSourceKey ?? this.sourceSceneKey(skill,targets.length);
    let actionBase: number | undefined;
    const impact = (weight = 1) => {
      if (this.combatState !== 'HERO_ATTACKING') return;
      const rolled = this.skillBaseDamage(hero, skill);
      actionBase ??= rolled;
      const damage = Math.round(actionBase * skill.damageMultiplier * weight);
      for (const enemy of targets) {
        if (enemy.currentHp <= 0) continue;
        enemy.applyDamage(damage, false, skillDamageType(skill), true, this.actionElements(hero, skill));
        this.handleTargetDamaged(enemy);
      }
      
    };
    if (sourceKey) {
      this.executePreparedSkill(hero, skill, sourceKey, targets, impact, onComplete);
      return;
    }
    onComplete();
  }

  private showCritPopup(x: number, y: number): void {
    const critText = this.add.text(x, y, 'CRITICAL!', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#facc15',
      fontStyle: 'bold',
      stroke: '#713f12',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2000);

    this.tweens.add({
      targets: critText,
      y: y - 30,
      alpha: 0,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => critText.destroy(),
    });
  }


  /**
   * Executes hero attack animation, movement, damage and returns to base.
   */
  private executeHeroSequence(hero: UnitActor, onComplete: () => void): void {
    // If all enemies are already dead, conclude immediately without performing attack
    if (this.enemies.every((e) => e.currentHp <= 0) || this.combatState === 'VICTORY') {
      onComplete();
      return;
    }

    const target = this.currentTarget && this.currentTarget.currentHp > 0
      ? this.currentTarget
      : this.autoRetarget();
    if (!target) {
      onComplete();
      return;
    }

    const homeX = hero.homeSlot.x;
    const homeY = hero.homeSlot.y;
    const config = hero.combatConfig;

    // Temporarily boost acting hero depth to 1000 so hero is guaranteed in front of all monsters
    hero.setDepthBoost(true);

    if (hero.unitKey === 'barret') {
      // --- BARRET: GATLING GUN BURST (Frames 14, 17, 20, 23) ---
      this.updateStatus(`Action: BARRET fires Gatling Gun burst at ${target.nameTag}...`);
      const burstFrames = [14, 17, 20, 23];
      const firedFrames = new Set<number>();

      const onAnimUpdate = (_anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
        const frameIdx = Number(frame.textureFrame);
        if (burstFrames.includes(frameIdx) && !firedFrames.has(frameIdx)) {
          firedFrames.add(frameIdx);

          // If all enemies dead, stop firing immediately!
          if (this.enemies.every((e) => e.currentHp <= 0) || this.combatState === 'VICTORY') {
            return;
          }

          // Dynamically retarget to current alive target if previous bullet killed current target
          const activeTarget = this.currentTarget && this.currentTarget.currentHp > 0
            ? this.currentTarget
            : this.autoRetarget();
          if (!activeTarget) return;

          const isCrit = this.randomValue() < 0.2;
          let bulletDmg = this.randomBetween(130, 180);
          if (isCrit) bulletDmg = Math.round(bulletDmg * 1.5);
          this.fireBulletProjectile(homeX, homeY, activeTarget.x, activeTarget.y, bulletDmg, isCrit, activeTarget);
        }
      };

      hero.on(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate);
      hero.playAnimation(config.attackAnim);

      hero.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        hero.off(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate);
        if (firedFrames.size === 0 && !this.enemies.every((e) => e.currentHp <= 0) && this.combatState !== 'VICTORY') {
          const fallback = this.currentTarget && this.currentTarget.currentHp > 0
            ? this.currentTarget
            : this.autoRetarget();
          if (fallback) {
            const isCrit = this.randomValue() < 0.2;
            this.fireBulletProjectile(homeX, homeY, fallback.x, fallback.y, 550, isCrit, fallback);
          }
        }

        // Standardized returnToIdle handles Barret's stationary recoil via manifest metadata
        hero.returnToIdle(() => this.finishAfterImpacts(onComplete));
      });
    } else {
      // --- MELEE MOVE-TO-TARGET ---
      const activeTarget = this.currentTarget && this.currentTarget.currentHp > 0
        ? this.currentTarget
        : target;

      const attackArrivalX = activeTarget.x + config.targetOffsetX * BATTLE_ART_SCALE;
      const attackArrivalY = activeTarget.y;

      this.updateStatus(`Action: ${hero.heroName} charges at ${activeTarget.nameTag}...`);
      hero.playAnimation('move');

      this.tweens.add({
        targets: hero,
        x: attackArrivalX,
        y: attackArrivalY,
        duration: 360,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
          // Original hits (unit row attackFrames) on the clip clock; legacy configs keep one hit at
          // their reviewed sprite frame. Hits not reached by the clip's end land when it completes.
          const hits = config.hitFrames ?? [{frame: -1, weight: 1}];
          const landed = new Set<number>();
          const isCritical = this.randomValue() < .15, base = this.randomBetween(300, 380);
          const land = (index: number) => {
            if (landed.has(index)) return;
            landed.add(index);
            if (this.enemies.every((e) => e.currentHp <= 0) || this.combatState === 'VICTORY') return;
            const hitTarget = this.currentTarget && this.currentTarget.currentHp > 0 ? this.currentTarget : activeTarget;
            this.applyHeroMeleeDamage(hero, hitTarget, hits[index].weight, base, isCritical, hits[index].frame >= 0 ? hits[index].frame : undefined);
          };
          const timers = hits.flatMap((hit, index) => hit.frame < 0 ? [] : [this.time.delayedCall(hit.frame * 1000 / 60, () => land(index))]);
          const onAnimUpdate = (_anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
            if (!config.hitFrames && Number(frame.textureFrame) === config.hitFrameIndex) land(0);
          };

          hero.on(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate);
          hero.playAnimation(config.attackAnim);

          hero.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            hero.off(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate);
            timers.forEach(timer => timer.remove(false));
            hits.forEach((_, index) => land(index));

            hero.playAnimation('move');
            hero.setFacingLeft(false);

            this.tweens.add({
              targets: hero,
              x: homeX,
              y: homeY,
              duration: 380,
              ease: 'Cubic.easeInOut',
              onComplete: () => {
                hero.setFacingLeft(true);
                hero.setDepthBoost(false);
                hero.playRestPose();
                onComplete();
              },
            });
          });
        },
      });
    }
  }

  /** Elements of a hero action (src/run/elementRules.mjs actionElements): the skill's own element,
   * otherwise the weapon's for basic attacks, Barrage repeats and physical skills. */
  private actionElements(hero: UnitActor, skill?: SkillConfig): Element[] {
    return actionElementsOf(skill, this.memberOf(hero));
  }
  private memberOf(unit: {unitKey: string}) { return this.runContext.state.party.find(m => m.key === unit.unitKey); }

  /** Skill base roll; run attack/magic ranks are already folded into skill multipliers. */
  private skillBaseDamage(hero: UnitActor, skill: SkillConfig): number {
    const roll = this.randomBetween(300, 380);
    return roll * (skillDamageType(skill)==='holy' ? heroMagicMultiplier(hero.sourceBuffs,this.currentRound) : heroPhysicalMultiplier(hero.sourceBuffs,this.currentRound));
  }

  private applyHeroMeleeDamage(hero: UnitActor, target: TargetDummy, weight = 1, roll = this.randomBetween(300,380), isCrit = this.randomValue()<.15, sourceFrame?: number): void {
    if (this.combatState !== 'HERO_ATTACKING' || target.currentHp <= 0) return;
    if (this.blindMiss(hero, target)) return;
    let baseDmg = roll*weight*memberPower(this.memberOf(hero),'attack');

    baseDmg = Math.max(1, Math.round(baseDmg * heroPhysicalMultiplier(hero.sourceBuffs,this.currentRound)));
    if (isCrit) baseDmg = Math.round(baseDmg * 1.5);
    this.basicImpactSound(hero,isCrit,sourceFrame);
    target.applyDamage(baseDmg, isCrit, 'physical', false, this.actionElements(hero));
    this.handleTargetDamaged(target);
  }

  /** Blind (enemy debuff): each basic-attack hit misses with BLIND_MISS_CHANCE and shows MISS. */
  private blindMiss(hero: UnitActor, target: TargetDummy): boolean {
    if (!isHeroBlind(hero.sourceBuffs, this.currentRound) || this.randomValue() >= BLIND_MISS_CHANCE) return false;
    this.floatCombatText(target.x, target.y - 90, 'MISS', '#cdd6f4');
    return true;
  }

  private finishAfterImpacts(onComplete: () => void): void {
    if (this.pendingImpacts === 0) onComplete();
    else this.afterImpacts = onComplete;
  }

  private resolvePendingImpact(): void {
    this.pendingImpacts--;
    if (this.pendingImpacts === 0) {
      const onComplete = this.afterImpacts;
      this.afterImpacts = undefined;
      onComplete?.();
    }
  }

  private fireBulletProjectile(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    damage: number,
    isCrit: boolean,
    target: TargetDummy
  ): void {
    this.pendingImpacts++;
    const startX = fromX - 60;
    const startY = fromY - 32;
    const endX = toX + 15;
    const endY = toY - 20;

    const bullet = this.add.ellipse(startX, startY, 20, 5, 0xfde047);
    bullet.setRotation(Math.atan2(endY - startY, endX - startX));
    bullet.setDepth(1500);

    const glow = this.add.ellipse(startX, startY, 28, 9, 0xf97316, 0.5);
    glow.setRotation(Math.atan2(endY - startY, endX - startX));
    glow.setDepth(1499);

    this.tweens.add({
      targets: [bullet, glow],
      x: endX,
      y: endY,
      duration: 110,
      ease: 'Linear',
      onComplete: () => {
        bullet.destroy();
        glow.destroy();
        if (this.combatState === 'HERO_ATTACKING' && target.currentHp > 0) {
          const actor=this.getActiveHero();
          if(actor)this.basicImpactSound(actor,isCrit);
          target.applyDamage(damage, isCrit, 'physical', false, actor ? this.actionElements(actor) : []);
          this.handleTargetDamaged(target);
        }
        this.resolvePendingImpact();
      },
    });
  }

  /**
   * Sequential enemy turn: each living enemy attacks one after another with 250ms pause.
   */
  private executeEnemyTurn(): void {
    if (this.combatState !== 'ENEMY_TURN') return;
    const livingEnemies = this.enemies.filter((e) => e.currentHp > 0);
    if (livingEnemies.length === 0) {
      this.triggerVictory();
      return;
    }

    const aliveHeroes = this.turnOrder.filter((h) => !h.isDead);
    if (aliveHeroes.length === 0) {
      this.triggerDefeat();
      return;
    }

    this.combatState = 'ENEMY_TURN';

    const attackNextEnemy = (index: number) => {
      if (this.combatState !== 'ENEMY_TURN') return;
      if (index >= livingEnemies.length) {
        // All alive enemies executed their counter-attacks
        const stillAlive = this.turnOrder.filter((h) => !h.isDead);
        if (stillAlive.length === 0) {
          this.triggerDefeat();
        } else {
          this.currentRound++;
          this.time.delayedCall(450, () => this.startRound());
        }
        return;
      }

      const enemy = livingEnemies[index];
      if (enemy.currentHp <= 0) {
        attackNextEnemy(index + 1);
        return;
      }

      const blocked = isEnemyActionBlocked(enemy.statusEffects, 'physical');
      const attackMultiplier = enemyAttackMultiplier(enemy.statusEffects);
      enemy.statusEffects = ageEnemyStatuses(enemy.statusEffects);
      if (blocked) {
        this.updateStatus(`${enemy.nameTag} is stopped.`);
        this.time.delayedCall(250, () => attackNextEnemy(index + 1));
        return;
      }

      const currentAliveHeroes = this.turnOrder.filter((h) => !h.isDead);
      if (currentAliveHeroes.length === 0) {
        this.triggerDefeat();
        return;
      }

      // Single-target pick: src/run/enemyTargeting.mjs (shared with tools/simulate_run_balance.mjs).
      const heroTarget = this.turnOrder[enemyTargetIndex(this.turnOrder.map(h=>({alive:!h.isDead,hp:h.currentHp,maxHp:h.maxHp})),()=>this.randomValue())];
      const definition=ENEMY_CONTENT[enemy.assetKey];
      const action=definition?enemyAction(definition,enemy.actionCursor,enemy.currentHp/enemy.maxHp):null;
      if(action?.kind==='prepare'){
        this.announceCombatAction(enemy.assetKey,enemy.nameTag,action.name,action.next??action.name,'enemy','prepare','ffrogue');
        enemy.actionCursor++;
        this.updateStatus(`${enemy.nameTag}: ${action.name}. ${action.next} hits the party next!`);
        this.events.emit('enemy-action',{key:enemy.assetKey,action,cursor:enemy.actionCursor,round:this.currentRound});
        this.time.delayedCall(450,()=>attackNextEnemy(index+1));return;
      }
      if(action)enemy.actionCursor++;
      this.announceCombatAction(enemy.assetKey??'training_dummy',enemy.nameTag,action?.name??'attack',action?.name??'Attack','enemy','attack',action?.presentation?'source':action?'ffrogue':'basic');
      const stepStr = livingEnemies.length > 1 ? ` (${index + 1}/${livingEnemies.length})` : '';
      this.updateStatus(`ENEMY TURN${stepStr}: ${enemy.nameTag} ${action?'uses '+action.name+' on':'attacks'} ${action?.scope==='party'?'the party':heroTarget.heroName}!`);
      if(action)this.events.emit('enemy-action',{key:enemy.assetKey,action,cursor:enemy.actionCursor,round:this.currentRound});

      // Original monster skill: the published scene plays from the enemy at the party and the
      // reviewed damage events split the action's damage over the source hit frames.
      if(action?.presentation&&action.damageEvents&&this.preparedScenes&&this.cache.json.get('scene_'+action.presentation+'_manifest')){
        const targets=action.scope==='party'?this.turnOrder.filter(h=>!h.isDead):[heroTarget];
        const cast=()=>this.executeEnemySkill(enemy,action,targets,attackMultiplier,()=>this.time.delayedCall(250,()=>attackNextEnemy(index+1)));
        // Scene variants are prepared in the background; a very early enemy turn waits for them.
        if(this.preparedScenes.canPlay(action.presentation,targets.length))cast();
        else void this.preparedScenes.ready.then(()=>{if(this.combatState==='ENEMY_TURN')cast();});
        return;
      }

      enemy.executeAttack(
        heroTarget.x,
        heroTarget.y,
        () => {
          const profile=this.currentEncounter();
          const targets=action?.scope==='party'?this.turnOrder.filter(h=>!h.isDead):[heroTarget];
          const impacts:{unit:string;damage:number}[]=[];
          for(const target of targets){
            const defense=this.runContext.state.party.find(m=>m.key===target.unitKey)?.stats.defense??1;
            const element=heroElementMultiplier(target.unitKey,action?.elements,this.runContext.state.wards,this.memberOf(target)?.weapon);
            const dmg=Math.round(profile.damage*(action?.multiplier??1)*attackMultiplier/defense*heroDamageTakenMultiplier(target.sourceBuffs,this.currentRound,action?.damageType??'physical')*element);
            target.applyDamage(dmg,elementTag(element));
            this.playHeroHitFeedback(target,enemy.x,dmg/Math.max(1,target.maxHp));
            if(target.isDead)this.tryAutoRevive(target);
            if(!target.isDead)target.limitGauge=gainFromDamage(target.limitGauge,dmg,target.maxHp);
            impacts.push({unit:target.unitKey,damage:dmg});
          }
          if(action)this.events.emit('enemy-impact',{key:enemy.assetKey,action,impacts,round:this.currentRound});
          
        },
        () => {
          // After attack completes, pause 250ms before the next enemy acts
          this.time.delayedCall(250, () => {
            attackNextEnemy(index + 1);
          });
        }
      );
    };

    attackNextEnemy(0);
  }

  /** Plays an original monster skill scene and applies its damage at the source hit frames. */
  private executeEnemySkill(enemy:TargetDummy,action:EnemyAction,targets:UnitActor[],attackMultiplier:number,onComplete:()=>void):void{
    const profile=this.currentEncounter(),events=action.damageEvents!;
    const total=new Map<UnitActor,number>();
    // Like hero skills, the turn moves on after the last hit plus a short beat; the scene's
    // decorative tail fades out on its own (or is replaced by the next source presentation).
    let closed=false;
    const finish=()=>{
      if(closed)return;
      closed=true;this.events.off('shutdown',cancel);
      this.events.emit('enemy-impact',{key:enemy.assetKey,action,impacts:[...total].map(([t,d])=>({unit:t.unitKey,damage:d})),round:this.currentRound});
      onComplete();
    };
    const timers:Phaser.Time.TimerEvent[]=[];
    const cancel=()=>{closed=true;timers.forEach(t=>t.remove(false));};
    this.events.once('shutdown',cancel);
    enemy.setDepthBoost(true);
    enemy.playCastBody();
    this.playPreparedScene(action.presentation!,enemy,targets,()=>enemy.setDepthBoost(false));
    let remaining=events.length;
    const debuffed=new Set<UnitActor>();
    events.forEach(event=>timers.push(this.time.delayedCall(event.frame*1000/60,()=>{
      if(closed)return;
      for(const target of targets){
        if(target.isDead)continue;
        const defense=this.runContext.state.party.find(m=>m.key===target.unitKey)?.stats.defense??1;
        const element=heroElementMultiplier(target.unitKey,action.elements,this.runContext.state.wards,this.memberOf(target)?.weapon);
        const dmg=Math.max(1,Math.round(profile.damage*action.multiplier*attackMultiplier/defense*event.weight*heroDamageTakenMultiplier(target.sourceBuffs,this.currentRound,action.damageType??'physical')*element));
        target.applyDamage(dmg,elementTag(element));
        total.set(target,(total.get(target)??0)+dmg);
        this.playHeroHitFeedback(target,enemy.x,dmg/Math.max(1,target.maxHp));
        if(target.isDead)this.tryAutoRevive(target);
        if(!target.isDead)target.limitGauge=gainFromDamage(target.limitGauge,dmg,target.maxHp);
        // Original debuffs land once per hit hero, each with its own chance.
        if(action.heroEffects&&!target.isDead&&!debuffed.has(target)){
          debuffed.add(target);
          const applied=action.heroEffects.filter(e=>this.randomValue()<(e.chance??1)).map(({chance:_chance,...e})=>e);
          if(applied.length){
            target.sourceBuffs=applyHeroBuffs(target.sourceBuffs,applied,this.currentRound);
            this.floatCombatText(target.x,target.y-120,applied.map(e=>e.kind==='blind'?'BLIND':({attack:'ATK',defense:'DEF',magic:'MAG',spirit:'SPR'}[e.stat])).join(' ')+(applied.some(e=>e.kind==='break')?' BREAK':''),'#f38ba8');
          }
        }
      }
      if(--remaining===0)timers.push(this.time.delayedCall(ENEMY_SKILL_SETTLE_MS,finish));
    })));
  }

  /**
   * Lock once. Runs persist after gameplay, then keep the live arena through
   * natural effect completion and actual victory clip cycles.
   */
  private triggerVictory(): void {
    if (this.victoryTriggered) return;
    this.victoryTriggered = true;
    this.plannedActions.clear();

    this.combatState = 'VICTORY';
    this.isCommandMenuOpen = false;
    this.enemies.forEach((enemy) => {
      if (enemy.visible) enemy.playDefeatFade();
    });
    this.updateStatus('Encounter complete');
    this.finishRunEncounter(true);
  }

  private triggerDefeat(): void {
    this.plannedActions.clear();
    this.combatState = 'DEFEAT';
    this.updateStatus('DEFEAT: All heroes have fallen in battle!');
    this.finishRunEncounter(false);
  }

  /** Short rising combat label (statuses, buffs); purely presentational. */
  private floatCombatText(x:number,y:number,label:string,color:string):void{
    const text=this.add.text(x,y,label,{fontSize:'16px',color,fontFamily:'Arial'}).setOrigin(.5).setDepth(1200);
    this.tweens.add({targets:text,y:text.y-40,alpha:0,duration:900,onComplete:()=>text.destroy()});
  }

  /** A K.O. consumes an active auto-revive status at once, so defeat checks see the revived hero. */
  private tryAutoRevive(hero:UnitActor):boolean{
    const revive=consumeAutoRevive(hero.sourceBuffs,this.currentRound);
    if(!revive||!hero.isDead)return false;
    hero.sourceBuffs=revive.buffs;
    hero.revive(Math.max(1,Math.round(hero.maxHp*revive.hpFraction)));
    this.floatCombatText(hero.x,hero.y-100,'REVIVED','#f9e2af');
    this.events.emit('hero-revived',{unit:hero.unitKey,hp:hero.currentHp,round:this.currentRound});
    return true;
  }

  private updateStatus(msg: string): void {
    this.statusMessage = msg;
  }

  private announceCombatAction(actorKey:string,actorName:string,abilityId:string,abilityName:string,side:CombatActionNotice['side'],kind:CombatActionNotice['kind'],origin:CombatActionNotice['origin']):void{
    this.events?.emit('combat-action',{sequence:++this.actionSequence,actorKey,actorName,abilityId,abilityName,side,kind,origin} satisfies CombatActionNotice);
  }
}
