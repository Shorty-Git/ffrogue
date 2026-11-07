import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise actual combat methods with deterministic engine boundaries.
// These tests do not verify Phaser rendering, animation playback or shutdown.
class GameObject extends EventEmitter {
  setInteractive() { return this; }
}
const phaser = {
  Scene: class {},
  GameObjects: { Sprite: GameObject, Container: GameObject },
  Geom: { Rectangle: class { static Contains() {} } },
  Math: { Between: (min) => min, Clamp: (value, min, max) => Math.max(min, Math.min(max, value)) },
  Animations: { Events: { ANIMATION_UPDATE: 'animationupdate', ANIMATION_COMPLETE: 'animationcomplete' } },
};
const modules = new Map();
function loadModule(file) {
  file = path.resolve(file);
  if (file.endsWith('.json')) return { default: JSON.parse(fs.readFileSync(file, 'utf8')) };
  if (modules.has(file)) return modules.get(file);
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports,
    require: (name) => name === 'phaser'
      ? { default: phaser }
      : loadModule(path.resolve(path.dirname(file), /\.(mjs|ts|json)$/.test(name) ? name : name+'.ts')),
    console,
    window:{matchMedia:()=>({matches:false})},
  }, { filename: file });
  modules.set(file, exports);
  return exports;
}
const { BattleScene } = loadModule('src/scenes/BattleScene.ts');
const { UnitActor } = loadModule('src/entities/UnitActor.ts');
const { TargetDummy,fitPreparedEnemyScale,ENEMY_SPAWN_MAX_SCALE } = loadModule('src/entities/TargetDummy.ts');
let passed = 0;
function test(name, run) {
  run();
  passed++;
  console.log(`PASS ${name}`);
}

test('run victory persists once, waits for VFX and defeat fade, then every actual celebration cycle',()=>{
 const scene=new BattleScene(),calls=[],ready=[];let active=true;
 scene.turnOrder=[{isDead:false,playVictoryCycle(cb){calls.push('clip-a');ready.push(cb);}},{isDead:false,playVictoryCycle(cb){calls.push('clip-b');ready.push(cb);}}];
 scene.activeSkillActions=1;scene.pendingImpacts=0;scene.enemies=[{visible:true}];
 scene.preparedScenes={snapshot:()=>({active}),stop(){throw Error('VFX must finish naturally');}};
 scene.runContext={settle(actors,won){assert.equal(actors,scene.turnOrder);assert.equal(won,true);calls.push('persist');},rewardsReady(){calls.push('overlay');}};
 scene.finishRunEncounter(true);scene.advanceRunVictory();assert.deepEqual(calls,[]);
 scene.activeSkillActions=0;scene.pendingImpacts=1;scene.advanceRunVictory();assert.deepEqual(calls,[]);
 scene.pendingImpacts=0;scene.advanceRunVictory();scene.advanceRunVictory();assert.deepEqual(calls,['persist']);
 active=false;scene.advanceRunVictory();assert.deepEqual(calls,['persist']);scene.enemies[0].visible=false;scene.advanceRunVictory();assert.deepEqual(calls,['persist','clip-a','clip-b']);
 ready[0]();assert.ok(!calls.includes('overlay'));ready[1]();scene.advanceRunVictory();assert.deepEqual(calls,['persist','clip-a','clip-b','overlay']);
});

test('restored saved rewards replay celebration without generating or charging rewards again',()=>{
 const scene=new BattleScene();scene.runSettled=true;scene.runContext={settle(){throw Error('Duplicate settlement');},rewardsReady(){calls++;}};
 let calls=0;scene.turnOrder=[{isDead:false,playVictoryCycle(cb){cb();}}];scene.enemies=[];scene.activeSkillActions=0;scene.pendingImpacts=0;
 scene.finishRunEncounter(true);scene.advanceRunVictory();scene.advanceRunVictory();assert.equal(calls,1);
});

test('run victory locks commands once without tweening the battle UI away',()=>{
 const scene=battle();scene.turnOrder=[];scene.enemies=[];scene.plannedActions=new Map();scene.skillActors=new Set();scene.isCommandMenuOpen=true;
 scene.tweens={add(){throw Error('Run HUD must not slide away');}};
 scene.triggerVictory();scene.triggerVictory();assert.equal(scene.combatState,'VICTORY');assert.equal(scene.isCommandMenuOpen,false);assert.equal(scene.runVictoryStage,'finishing');
});

test('victory cycle is driven by animation completion/repeat and detaches on scene shutdown',()=>{
 const unit=Object.create(UnitActor.prototype),clips=[],events=new EventEmitter();
 Object.assign(unit,{unitKey:'cloud',currentHp:100,manifest:{assetKey:'cloud_form6',animations:{win_before:{},win:{}}},scene:{events},playAnimation(clip){this.currentAnimKey=clip;clips.push(clip);}});
 let ready=0;unit.playVictoryCycle(()=>ready++);assert.deepEqual(clips,['win_before']);assert.equal(ready,0);
 unit.emit('animationcomplete-cloud_form6_win_before');assert.deepEqual(clips,['win_before','win']);assert.equal(ready,0);
 unit.emit('animationrepeat',{key:'cloud_form6_win_before'});assert.equal(ready,0);
 unit.emit('animationrepeat',{key:'cloud_form6_win'});unit.emit('animationrepeat',{key:'cloud_form6_win'});assert.equal(ready,1);
 unit.playVictoryCycle(()=>ready++);events.emit('shutdown');unit.emit('animationrepeat',{key:'cloud_form6_win'});assert.equal(ready,1);
 assert.equal(unit.listenerCount('animationrepeat'),0);
});

test('stale reward clicks cannot apply twice, stop the next encounter or reopen an error screen',()=>{
 const {GameFlow}=loadModule('src/run/GameFlow.ts'),rules=loadModule('src/run/runState.mjs'),callbacks={};
 const catalog=Object.fromEntries(['a','b','c'].map(key=>[key,{key,identity:key,canonicalIdentity:key,unitId:key,rarity:5,form:key,maxHp:100,maxMp:50,skills:[{id:key+'-skill',damageMultiplier:1}]}]));
 const run=rules.confirmParty(rules.rollParty(rules.createRun('duplicate-reward',catalog),catalog));
 const flow=Object.create(GameFlow.prototype);flow.catalog=catalog;flow.state=rules.completeBattle(run,catalog,run.party.map(m=>({key:m.key,hp:m.hp,mp:m.mp})),true);
 flow.state.offers[0]={type:'stat',member:run.party[0].key,stat:'attack'};let commits=0,stops=0,starts=0;
 flow.ui={rewards(){},overBattle(){},on(action,callback){callbacks[action]=callback;}};flow.rewardBounds=()=>({});
 flow.commit=n=>{commits++;flow.state=n;};flow.scene={scene:{stop(){stops++;}}};
 flow.battle=entry=>{assert.equal(entry,'cut');starts++;};
 flow.rewards();callbacks['reward-0']();callbacks['reward-0']();assert.equal(commits,1);assert.equal(stops,0);assert.equal(starts,1);assert.equal(flow.state.encounter,1);
});

test('evolved form animation namespace keeps base identity and does not overwrite base texture animations',()=>{
 const actor=Object.create(UnitActor.prototype),created=[],played=[];
 actor.unitKey='cloud';actor.manifest={assetKey:'cloud_form6',animations:{idle:{frameWidth:10,frameHeight:20,pivotX:.5,pivotY:1,frames:[{index:0,durationMs:40}]}}};
 actor.scene={textures:{exists:()=>true},anims:{exists:()=>false,create:config=>created.push(config.key)}};actor.setOrigin=()=>{};actor.play=key=>played.push(key);
 actor.registerAnimations();actor.playAnimation('idle');assert.equal(actor.unitKey,'cloud');assert.equal(actor.visualKey,'cloud_form6');
 assert.deepEqual(created,['cloud_form6_idle']);assert.deepEqual(played,['cloud_form6_idle']);
});
test('natural party defeat settles the run as a loss without opening a dialog',()=>{
 const scene=battle(),timers=[],outcomes=[];scene.turnOrder=[hero(0),hero(0),hero(0)];scene.plannedActions=new Map();
 scene.activeSkillActions=0;scene.pendingImpacts=0;scene.preparedScenes={stop(){outcomes.push('cleanup');}};
 scene.runContext={settle(actors,won){assert.ok(actors.every(a=>a.currentHp===0));outcomes.push(won?'win':'loss');}};
 scene.time={delayedCall(_ms,callback){timers.push(callback);}};scene.add={container(){throw Error('Debug dialog must stay out of a run');}};
 scene.triggerDefeat();assert.equal(scene.combatState,'DEFEAT');timers.shift()();assert.deepEqual(outcomes,['cleanup','loss']);
});
function battle() {
  const scene = new BattleScene();
  // BattleScene always runs inside a run context (normal run or training fixture).
  scene.runContext = { state: { party: [] } };
  // Matches the stubbed Phaser.Math.Between: every roll takes the minimum.
  scene.randomValue = () => 0;
  scene.updateStatus = () => {};
  scene.targetMarkerContainer = { setVisible() {} };
  scene.time = { delayedCall() {} };
  scene.preparedScenes={canPlay:()=>true};
  scene.cache={json:{get:()=>JSON.parse(fs.readFileSync('public/assets/presentations/cloud_brave_slash/manifest.json','utf8'))}};
  return scene;
}
function hero(hp) {
  const unit = Object.create(UnitActor.prototype);
  unit.currentHp = hp;
  unit.hasActed = false;
  unit.manifest={animations:{atk:{frames:[{durationMs:100}]},magic_atk:{frames:[{durationMs:100}]}}};
  return unit;
}

test('explicit ordinary command pose survives a magical body clip without changing old preparation choices',()=>{
 const s=battle(),h=hero(100),poses=[];h.playCommandPose=magic=>poses.push(magic);
 s.plannedActions=new Map([[h,{kind:'skill',skill:{motion:'magic_atk',actionChoreography:{commandPose:'standby'}}}]]);
 s.refreshPlannedPose(h);assert.deepEqual(poses,[false]);
 delete s.plannedActions.get(h).skill.actionChoreography.commandPose;s.refreshPlannedPose(h);
 assert.deepEqual(poses,[false,true]);
});
function choreography(movement='stationary',clip='atk') {
 return {schema:'source-action-v1',movement,travelTiming:'prepared',readiness:'none',body:{mode:'clips',phases:[{frame:0,clip}]},
  review:{basis:'accepted-gameplay',sourceMotionType:1,sourceMoveType:1,note:'Explicit test fixture, not an original reference'}};
}

test('HP is the sole source of truth for hero K.O.', () => {
  const unit = hero(1);
  assert.equal(unit.isDead, false);
  unit.currentHp = 0;
  assert.equal(unit.isDead, true);
});
test('first and intermediate K.O. heroes are skipped', () => {
  const scene = battle();
  scene.enemies = [{ currentHp: 10 }];
  scene.turnOrder = [hero(0), hero(10), hero(10)];
  scene.currentTarget = scene.enemies[0];
  scene.setTarget = () => {};
  scene.startRound();
  assert.equal(scene.activeHeroIndex, 1);
  scene.turnOrder = [hero(10), hero(0), hero(10)];
  scene.turnOrder[0].hasActed = true;
  scene.activeHeroIndex = 0;
  scene.combatState = 'HERO_ATTACKING';
  scene.advanceToNextHero();
  assert.equal(scene.activeHeroIndex, 2);
});
test('last K.O. hero advances to enemy phase without an invalid index', () => {
  const scene = battle();
  scene.enemies = [{ currentHp: 10 }];
  scene.turnOrder = [hero(10), hero(10), hero(0)];
  scene.turnOrder[0].hasActed = true;
  scene.turnOrder[1].hasActed = true;
  scene.activeHeroIndex = 1;
  scene.combatState = 'HERO_ATTACKING';
  scene.advanceToNextHero();
  assert.equal(scene.combatState, 'ENEMY_TURN');
});
test('last enemy death synchronously locks further attacks', () => {
  const scene = battle();
  const target = { currentHp: 0, playDefeatFade() {} };
  scene.enemies = [target];
  scene.combatState = 'HERO_ATTACKING';
  scene.handleTargetDamaged(target);
  assert.equal(scene.combatState, 'VICTORY');
  scene.getActiveHero = () => { throw Error('Input was not locked'); };
  scene.executeActiveHeroAttack();
  scene.executeSkillChoice({});
});
test('repeated interactivity setup registers one click handler', () => {
  const target = new GameObject();
  let clicks = 0;
  target.currentHp = 10;
  target.scene = { events: { emit: () => clicks++ } };
  for (let i = 0; i < 20; i++) TargetDummy.prototype.setupInteractivity.call(target);
  target.emit('pointerdown');
  assert.equal(clicks, 1);
  assert.equal(target.listenerCount('pointerover'), 1);
  assert.equal(target.listenerCount('pointerout'), 1);
});
test('dead targets produce no additional damage feedback', () => {
  TargetDummy.prototype.applyDamage.call({ currentHp: 0 }, 100);
});
test('ranged turn completion waits for every outstanding impact', () => {
  const scene = battle();
  let completed = 0;
  scene.pendingImpacts = 2;
  scene.finishAfterImpacts(() => completed++);
  scene.resolvePendingImpact();
  assert.equal(completed, 0);
  scene.resolvePendingImpact();
  assert.equal(completed, 1);
  assert.equal(scene.afterImpacts, undefined);
});
test('late bullet impact skips dead targets and still completes the action', () => {
  const scene = battle();
  let impact;
  let completed = 0;
  const projectile={setRotation(){},setDepth(){},destroy(){}};
  scene.add={ellipse:()=>projectile};
  scene.tweens={add:config=>{impact=config.onComplete;}};
  scene.combatState = 'HERO_ATTACKING';
  scene.fireBulletProjectile(0,0,20,20,100,false,{ currentHp: 0, applyDamage() { throw Error('Ghost hit'); } });
  scene.finishAfterImpacts(() => completed++);
  impact();
  assert.equal(completed, 1);
});
test('spawn and terminal states reject stale enemy-phase entry', () => {
  const scene = battle();
  scene.enemies = undefined;
  for (const state of ['SPAWNING', 'VICTORY', 'DEFEAT']) {
    scene.combatState = state;
    scene.executeEnemyTurn();
    if (state !== 'VICTORY') scene.advanceToNextHero();
  }
});
test('invalid MP costs cannot create MP or corrupt the pool', () => {
  const unit = hero(10);
  unit.currentMp = 20;
  for (const cost of [-1, NaN, Infinity, 21]) assert.equal(unit.useMp(cost), false);
  assert.equal(unit.currentMp, 20);
  assert.equal(unit.useMp(20), true);
  assert.equal(unit.currentMp, 0);
});
function animatedHero() {
  const unit = hero(100);
  EventEmitter.call(unit);
  unit.unitKey = 'test';
  unit.scene={textures:{exists:()=>true}};
  unit.maxHp = 100;
  unit.manifest = { animations: Object.fromEntries(
    ['idle', 'dying', 'dead', 'win_before', 'win', 'atk', 'standby', 'magic_standby'].map(name => [name, { pivotX: 0.5, pivotY: 1,frames:[{durationMs:100}] }])) };
  unit.setOrigin = () => unit;
  unit.play = () => unit;
  unit.playRestPose();
  return unit;
}

test('rest poses select low HP at the boundary, recover and prioritize K.O.', () => {
  const unit = animatedHero();
  unit.currentHp = 25;
  unit.playRestPose();
  assert.equal(unit.currentAnimKey, 'dying');
  unit.currentHp = 26;
  unit.refreshRestPose();
  assert.equal(unit.currentAnimKey, 'idle');
  unit.currentHp = 0;
  unit.playRestPose();
  assert.equal(unit.currentAnimKey, 'dead');
});
test('HP pose refresh cannot interrupt an action or victory entrance', () => {
  const unit = animatedHero();
  unit.currentHp = 10;
  unit.playAnimation('atk');
  unit.refreshRestPose();
  assert.equal(unit.currentAnimKey, 'atk');
  unit.playVictory();
  unit.refreshRestPose();
  assert.equal(unit.currentAnimKey, 'win_before');
});
test('victory entrance completes once and does not accumulate listeners', () => {
  const unit = animatedHero();
  const event = 'animationcomplete-test_win_before';
  for (let wave = 0; wave < 5; wave++) {
    unit.playRestPose();
    unit.playVictory();
    unit.playVictory();
    assert.equal(unit.listenerCount(event), 1);
    unit.emit(event);
    assert.equal(unit.currentAnimKey, 'win');
    assert.equal(unit.listenerCount(event), 0);
  }
});
test('leaving victory early cancels its pending transition', () => {
  const unit = animatedHero();
  unit.playVictory();
  unit.currentHp = 20;
  unit.playRestPose();
  assert.equal(unit.listenerCount('animationcomplete-test_win_before'), 0);
  unit.emit('animationcomplete-test_win_before');
  assert.equal(unit.currentAnimKey, 'dying');
});
test('free selection switches command poses without spending an action or allowing busy/K.O. units', () => {
  const scene = battle();
  const first = animatedHero();
  const last = animatedHero();
  scene.turnOrder = [first, last];
  scene.activeHeroIndex = 0;
  scene.combatState = 'PLAYER_TURN';
  first.playCommandPose();
  scene.selectHero(last);
  assert.equal(scene.activeHeroIndex, 1);
  assert.equal(first.currentAnimKey, 'idle');
  assert.equal(last.currentAnimKey, 'idle');
  assert.equal(last.hasActed, false);
  scene.combatState = 'HERO_ATTACKING';
  scene.selectHero(first);
  assert.equal(scene.activeHeroIndex, 1);
  scene.combatState = 'PLAYER_TURN';
  first.currentHp = 0;
  scene.selectHero(first);
  assert.equal(scene.activeHeroIndex, 1);
  first.currentHp = 100;
  first.hasActed = true;
  scene.selectHero(first);
  assert.equal(scene.activeHeroIndex, 1);
});
test('acting with the last slot first wraps back and enemy phase waits for all available heroes', () => {
  const scene = battle();
  scene.enemies = [{ currentHp: 100 }];
  scene.turnOrder = [hero(10), hero(10), hero(10)];
  scene.activeHeroIndex = 2;
  scene.turnOrder[2].hasActed = true;
  scene.combatState = 'HERO_ATTACKING';
  scene.advanceToNextHero();
  assert.equal(scene.activeHeroIndex, 0);
  assert.equal(scene.combatState, 'PLAYER_TURN');
  scene.turnOrder[0].hasActed = true;
  scene.combatState = 'HERO_ATTACKING';
  scene.advanceToNextHero();
  assert.equal(scene.activeHeroIndex, 1);
  scene.turnOrder[1].hasActed = true;
  scene.combatState = 'HERO_ATTACKING';
  scene.advanceToNextHero();
  assert.equal(scene.combatState, 'ENEMY_TURN');
});
test('closing commands restores low HP while busy actions stay intact', () => {
  const scene = battle();
  const unit = animatedHero();
  unit.currentHp = 20;
  scene.turnOrder = [unit];
  scene.activeHeroIndex = 0;
  scene.combatState = 'PLAYER_TURN';
  scene.openHeroCommands(unit);
  assert.equal(unit.currentAnimKey, 'standby');
  scene.selectHero(unit);
  assert.equal(unit.currentAnimKey, 'dying');
  scene.combatState = 'HERO_ATTACKING';
  unit.playAnimation('atk');
  scene.openHeroCommands(unit);
  scene.selectHero(unit);
  assert.equal(unit.currentAnimKey, 'atk');
});
test('magic preparation uses the exported cycle and rejects stale completion after battle end', () => {
  const scene = battle();
  const unit = animatedHero();
  unit.manifest.animations.magic_standby.frames = [{ durationMs: 100 }, { durationMs: 150 }];
  let delayed;
  let casts = 0;
  scene.combatState = 'HERO_ATTACKING';
  scene.time.delayedCall = (delay, callback) => { assert.equal(delay, 250); delayed = callback; };
  scene.startHeroAction(unit, 'magic_atk', () => casts++);
  assert.equal(unit.currentAnimKey, 'magic_standby');
  assert.equal(casts, 0);
  delayed();
  assert.equal(casts, 1);
  scene.startHeroAction(unit, 'magic_atk', () => casts++);
  scene.combatState = 'VICTORY';
  delayed();
  assert.equal(casts, 1);
  delete unit.manifest.animations.magic_standby;
  scene.startHeroAction(unit, 'atk', () => casts++);
  assert.equal(casts, 2);
});
test('per-hero plans preserve physical/magic readiness and spend neither MP nor actions', () => {
  const scene = battle();
  const first = animatedHero(); first.unitKey = 'first'; first.currentMp = 100;
  const second = animatedHero(); second.unitKey = 'second'; second.currentMp = 100;
  first.combatConfig = { attackAnim: 'atk', attackType: 'melee' };
  second.combatConfig = { attackAnim: 'atk', attackType: 'melee' };
  const spell = { ...JSON.parse(fs.readFileSync('public/assets/units/cloud/skills.json')).skills[0], id: 'spell', name: 'Spell', motion: 'magic_atk', mpCost: 20 };
  scene.unitSkills = { second: [spell] };
  scene.turnOrder = [first, second]; scene.activeHeroIndex = 0;
  scene.combatState = 'PLAYER_TURN'; scene.currentTarget = null;
  scene.planHeroAttack();
  scene.selectHero(second);
  scene.planHeroSkill(spell);
  assert.equal(first.currentAnimKey, 'standby');
  assert.equal(second.currentAnimKey, 'magic_standby');
  assert.equal(second.currentMp, 100);
  assert.equal(second.hasActed, false);
  assert.equal(scene.plannedActions.size, 2);
  scene.openHeroCommands(second);
  assert.equal(second.currentAnimKey, 'magic_standby');
  scene.selectHero(first);
  assert.equal(second.currentAnimKey, 'magic_standby');
  assert.equal(scene.plannedActions.size, 2);
});
test('explicit commit charges one command, locks concurrent execution and preserves other plans', () => {
  const scene = battle();
  const first = animatedHero(); first.unitKey = 'first'; first.currentMp = 100;
  const second = animatedHero(); second.unitKey = 'second'; second.currentMp = 100;
  const skill = { ...JSON.parse(fs.readFileSync('public/assets/units/cloud/skills.json')).skills[0], id: 'strike', name: 'Strike', motion: 'atk', mpCost: 18 };
  scene.unitSkills = { first: [skill], second: [skill] };
  scene.turnOrder = [first, second]; scene.activeHeroIndex = 0;
  scene.combatState = 'PLAYER_TURN'; scene.currentTarget = null;
  scene.enemies = [{ currentHp: 100 }];
  scene.planHeroSkill(skill); scene.selectHero(second); scene.planHeroSkill(skill);
  let completion; let calls = 0;
  scene.executeGenericSkill = (_hero, _skill, done) => { calls++; completion = done; };
  scene.executePlannedAction();
  assert.equal(second.currentMp, 82);
  assert.equal(first.currentMp, 100);
  assert.equal(scene.combatState, 'HERO_ATTACKING');
  scene.executePlannedAction(); scene.selectHero(first);
  assert.equal(calls, 1);
  assert.equal(scene.activeHeroIndex, 1);
  assert.equal(scene.plannedActions.size, 1);
  completion();
  assert.equal(second.hasActed, true);
  assert.equal(scene.activeHeroIndex, 0);
  assert.equal(scene.combatState, 'PLAYER_TURN');
  assert.equal(scene.plannedActions.has(first), true);
});
test('commit rechecks MP and retains an unaffordable plan for editing', () => {
  const scene = battle(); const unit = animatedHero(); unit.currentMp = 100;
  const skill = { ...JSON.parse(fs.readFileSync('public/assets/units/cloud/skills.json')).skills[0], id: 'strike', name: 'Strike', motion: 'atk', mpCost: 18 };
  scene.turnOrder = [unit]; scene.activeHeroIndex = 0; scene.unitSkills = { test: [skill] };
  scene.combatState = 'PLAYER_TURN'; scene.currentTarget = null;
  scene.planHeroSkill(skill); unit.currentMp = 5;
  scene.executeSkillChoice = () => { throw Error('Unaffordable plan committed'); };
  scene.executePlannedAction();
  assert.equal(scene.plannedActions.has(unit), true);
  assert.equal(scene.combatState, 'PLAYER_TURN');
  assert.equal(unit.hasActed, false);
});
test('canceling one plan preserves other heroes and restores the selected low-HP pose', () => {
  const scene = battle();
  const first = animatedHero(); first.combatConfig = { attackAnim: 'atk' }; first.currentHp = 20;
  const second = animatedHero(); second.combatConfig = { attackAnim: 'atk' };
  scene.turnOrder = [first, second]; scene.activeHeroIndex = 0;
  scene.combatState = 'PLAYER_TURN'; scene.currentTarget = null;
  scene.planHeroAttack(); scene.selectHero(second); scene.planHeroAttack(); scene.selectHero(first);
  scene.cancelPlannedAction();
  assert.equal(scene.plannedActions.size, 1);
  assert.equal(scene.plannedActions.has(second), true);
  assert.equal(first.currentAnimKey, 'dying');
  assert.equal(first.hasActed, false);
});
test('party selection preserves a prepared action and only explicit execution commits', () => {
  const scene = battle(); const unit = animatedHero();
  unit.combatConfig = { attackAnim: 'atk', attackType: 'melee' };
  scene.turnOrder = [unit]; scene.activeHeroIndex = 0; scene.combatState = 'PLAYER_TURN';
  scene.currentTarget = null;
  scene.pickRibbonHero(unit);
  assert.equal(scene.isCommandMenuOpen, true);
  assert.equal(scene.plannedActions.size, 0);
  assert.equal(unit.currentAnimKey, 'standby');
  scene.planHeroAttack();
  assert.equal(scene.isCommandMenuOpen, false);
  let commits = 0;
  scene.executeActiveHeroAttack = () => { commits++; scene.combatState = 'HERO_ATTACKING'; };
  scene.pickRibbonHero(unit);
  assert.equal(commits, 0);
  assert.equal(scene.isCommandMenuOpen, true);
  assert.equal(scene.plannedActions.size, 1);
  scene.pickRibbonHero(unit);
  assert.equal(commits, 0);
  scene.executePlannedAction();
  assert.equal(commits, 1);
});

test('party ribbon input rejects dead, acted and foreign heroes and terminal combat states', () => {
  const scene = battle(); const unit = animatedHero();
  scene.turnOrder = [unit]; scene.combatState = 'PLAYER_TURN';
  scene.selectHero = () => { throw Error('Invalid party card selected'); };
  unit.hasActed = true; scene.pickRibbonHero(unit);
  unit.hasActed = false; unit.currentHp = 0; scene.pickRibbonHero(unit);
  unit.currentHp = 100; scene.pickRibbonHero(animatedHero());
  for (const state of ['SPAWNING', 'HERO_ATTACKING', 'ENEMY_TURN', 'VICTORY', 'DEFEAT']) {
    scene.combatState = state; scene.pickRibbonHero(unit); scene.openHeroCommands(unit);
  }
});
function targetFirstBattle() {
  const scene = battle(), unit = animatedHero(), sounds = [];
  unit.combatConfig = { attackAnim: 'atk', attackType: 'melee' };
  const a = { nameTag: 'A', currentHp: 100 }, b = { nameTag: 'B', currentHp: 100 };
  scene.turnOrder = [unit]; scene.activeHeroIndex = 0; scene.combatState = 'PLAYER_TURN';
  scene.enemies = [a, b]; scene.currentTarget = a; scene.plannedActions = new Map();
  scene.runContext = { state: { party: [] }, uiSound: event => sounds.push(event) };
  scene.refreshCombatHud = () => {}; scene.combatHud = { moveFocus() {} };
  return { scene, unit, a, b, sounds };
}
test('enemy clicks and arrows retarget without spending an action, only during command selection', () => {
  const { scene, unit, a, b, sounds } = targetFirstBattle();
  scene.confirmRibbonTarget(1);
  assert.equal(scene.currentTarget, b);
  assert.equal(unit.hasActed, false); assert.equal(scene.plannedActions.size, 0); assert.deepEqual(sounds, ['select']);
  scene.confirmRibbonTarget(1);
  assert.deepEqual(sounds, ['select'], 'Re-clicking the current target is silent');
  a.currentHp = 0; scene.confirmRibbonTarget(0);
  assert.equal(scene.currentTarget, b, 'Defeated enemies cannot be targeted');
  a.currentHp = 100; scene.combatState = 'HERO_ATTACKING'; scene.confirmRibbonTarget(0);
  assert.equal(scene.currentTarget, b, 'A running action keeps its target');
  scene.combatState = 'PLAYER_TURN';
  scene.cycleTarget(1); assert.equal(scene.currentTarget, a);
  scene.cycleTarget(-1); assert.equal(scene.currentTarget, b);
  b.currentHp = 0; scene.cycleTarget(1); assert.equal(scene.currentTarget, a);
  scene.cycleTarget(1); assert.equal(scene.currentTarget, a, 'Only living enemies are cycled');
});
test('Attack commits at once on the current target and falls back to a living enemy', () => {
  const { scene, unit, a, b } = targetFirstBattle(), hits = [];
  scene.executeActiveHeroAttack = () => { hits.push(scene.currentTarget); scene.combatState = 'HERO_ATTACKING'; };
  scene.currentTarget = b;
  scene.chooseRibbonAbility(0);
  assert.deepEqual(hits, [b]); assert.equal(scene.plannedActions.size, 0);
  scene.chooseRibbonAbility(0);
  assert.equal(hits.length, 1, 'A second click during the action does nothing');
  scene.combatState = 'PLAYER_TURN'; unit.hasActed = false; b.currentHp = 0;
  scene.chooseRibbonAbility(0);
  assert.deepEqual(hits, [b, a]);
});
test('single-ally skills still wait for an ally choice and Cancel keeps the action', () => {
  const { scene, unit } = targetFirstBattle(); unit.unitKey = 'healer'; unit.currentMp = 100;
  const cure = { ...JSON.parse(fs.readFileSync('public/assets/units/cloud/skills.json')).skills[0], id: 'cure', scope: 'single_ally', mpCost: 10 };
  scene.unitSkills = { healer: [cure] }; scene.canUseSourceSkill = () => true;
  let executed = 0; scene.executeSkillChoice = () => { executed++; };
  scene.chooseRibbonAbility(1);
  assert.equal(executed, 0); assert.equal(scene.plannedActions.get(unit)?.skill, cure);
  assert.equal(unit.currentMp, 100); assert.equal(unit.hasActed, false);
  scene.cancelPlannedAction();
  assert.equal(scene.plannedActions.size, 0); assert.equal(unit.hasActed, false);
});
test('Limit gauge rules: actions and damage fill it, capped at the maximum', () => {
  const lb = loadModule('src/run/limitGauge.mjs');
  assert.equal(lb.gainFromAction(0), lb.LB_PER_ACTION);
  assert.equal(lb.gainFromAction(90), lb.LB_MAX);
  assert.equal(lb.gainFromDamage(0, 1000, 2000), Math.round(lb.LB_PER_FULL_HP_LOST / 2));
  assert.equal(lb.gainFromDamage(10, 1, 100000), 11, 'Any hit adds at least one point');
  assert.equal(lb.gainFromDamage(10, 0, 1000), 10);
  assert.equal(lb.isFull(lb.LB_MAX - 1), false); assert.equal(lb.isFull(lb.LB_MAX), true);
});
test('Limit Burst needs a full gauge, empties it at commit and earns nothing itself', () => {
  const { scene, unit, b } = targetFirstBattle(); unit.unitKey = 'cloud'; unit.currentMp = 100;
  const omnislash = { ...JSON.parse(fs.readFileSync('public/assets/units/cloud/skills.json')).skills.find(s => s.type === 'LIMIT') };
  assert.equal(omnislash.id, 'omnislash');
  scene.limitBursts = { cloud: omnislash }; scene.canUseSourceSkill = () => true; scene.currentTarget = b;
  const committed = []; scene.executeSkillChoice = skill => { committed.push(skill.id); };
  unit.limitGauge = 99; scene.chooseRibbonAbility(4);
  assert.deepEqual(committed, [], 'A gauge below the maximum cannot fire');
  unit.limitGauge = 100; scene.chooseRibbonAbility(4);
  assert.deepEqual(committed, ['omnislash']); assert.equal(scene.plannedActions.size, 0);
  // executeSkillChoice resets the gauge and marks the caster at commit (checked in the browser review).
  scene.limitCasters.add(unit); unit.limitGauge = 0; scene.enemies = [{ currentHp: 0 }]; scene.triggerVictory = () => {};
  scene.concludeHeroSkill(unit);
  assert.equal(unit.limitGauge, 0, 'The Limit Burst itself does not refill the gauge');
  unit.hasActed = false; scene.concludeHeroSkill(unit);
  assert.equal(unit.limitGauge, 25, 'Ordinary skills fill it');
});
test('melee attacks approach the selected row and return home in both arenas', () => {
  const { getBattleLayout } = loadModule('src/ui/battleLayout.ts');
  const { BATTLE_ARENAS } = loadModule('src/data/battleArenas.ts');
  for (const arena of Object.values(BATTLE_ARENAS)) {
    const layout = getBattleLayout(1000, 1100, arena);
    for (const slot of Object.values(layout.enemies)) {
      for (const [heroKey, offset, hitFrameIndex] of [['cloud', 90, 2], ['aerith', 200, 19]]) {
        const scene = battle();
        const target = { ...slot, currentHp: 3500, nameTag: 'Selected target' };
        scene.enemies = [target, { x: 900, y: 900, currentHp: 3500 }];
        scene.currentTarget = target;
        scene.combatState = 'HERO_ATTACKING';
        const actor = new EventEmitter();
        actor.homeSlot = layout.party[heroKey];
        actor.combatConfig = { attackType: 'melee', attackAnim: 'atk', targetOffsetX: offset, hitFrameIndex };
        actor.setDepthBoost = actor.playAnimation = actor.setFacingLeft = actor.playRestPose = () => {};
        const moves = [];
        scene.tweens = { add: (move) => { moves.push(move); } };
        let hit;
        let completed = 0;
        scene.applyHeroMeleeDamage = (_hero, enemy) => { hit = enemy; };
        scene.executeHeroSequence(actor, () => completed++);
        assert.equal(moves[0].x, target.x + offset * 0.8);
        assert.equal(moves[0].y, target.y);
        moves[0].onComplete();
        actor.emit('animationupdate', null, { textureFrame: hitFrameIndex });
        assert.equal(hit, target);
        actor.emit('animationcomplete');
        assert.equal(moves[1].x, actor.homeSlot.x);
        assert.equal(moves[1].y, actor.homeSlot.y);
        moves[1].onComplete();
        assert.equal(completed, 1);
      }
    }
  }
});

test('quiet enemy damage changes HP and displays its number without tint or shake', () => {
  const target = Object.create(TargetDummy.prototype);
  target.currentHp = 1000;
  let popups = 0;
  target.sprite = { setTintFill() { assert.fail('Unexpected flash'); } };
  target.scene = { tweens: { add() { assert.fail('Unexpected shake'); } } };
  target.spawnDamagePopup = damage => { assert.equal(damage, 300); popups++; };
  target.applyDamage(300, false, 'physical', true);
  assert.equal(target.currentHp, 700);
  assert.equal(popups, 1);
});

test('prepared actions recover on body completion while effects keep their own lifetime',()=>{
  const scene=battle(),timers=[],tweens=[],poses=[];
  scene.events=new EventEmitter();scene.combatState='HERO_ATTACKING';
  scene.time={delayedCall(ms,run){timers.push({ms,run});}};
  scene.tweens={add(config){tweens.push(config);}};
  scene.preparedScenes={choreography:()=>({movement:'dash',approachFrames:18,returnFrames:12})};
  let effectFinished,completed=0,hits=0;
  scene.playPreparedScene=(_key,_hero,_targets,done)=>effectFinished=done;
  const unit=new EventEmitter();Object.assign(unit,{unitKey:'independent',heroName:'Independent',
    manifest:hero(100).manifest,
    homeSlot:{x:800,y:500},combatConfig:{targetOffsetX:90},
    playAnimation:pose=>poses.push(pose),setDepthBoost(){},setFacingLeft(){},playRestPose(){poses.push('idle');}});
  scene.executePreparedSkill(unit,{actionChoreography:choreography('target'),motion:'atk',moveType:'dash',scope:'single_enemy',requiresSourceScene:true,scenePresentation:'generic',damageEvents:[{frame:6,weight:1}]},'generic',
    [{x:190,y:500}],()=>hits++,()=>completed++);
  assert.equal(tweens[0].duration,300);tweens[0].onComplete();
  assert.deepEqual(poses,['move','atk']);assert.equal(unit.listenerCount('animationcomplete-independent_atk'),1);
  timers[0].run();assert.equal(hits,1);
  unit.emit('animationcomplete-independent_atk');assert.equal(tweens[1].duration,200);
  tweens[1].onComplete();assert.equal(poses.at(-1),'idle');assert.equal(completed,1,'Decorative effects must not hold gameplay');
  assert.equal(effectFinished,undefined);timers[0].run();unit.emit('animationcomplete-independent_atk');
  assert.equal(completed,1);assert.equal(hits,1);assert.equal(scene.events.listenerCount('shutdown'),0);
  assert.equal(unit.listenerCount('animationcomplete-independent_atk'),0);
});

test('prepared action barrier includes late damage and cancels body listeners on shutdown',()=>{
  for(const cancel of [false,true]){
    const scene=battle(),timers=[];scene.events=new EventEmitter();
    scene.time={delayedCall(ms,run){timers.push(run);}};
    scene.preparedScenes={choreography:()=>({movement:'stationary'})};
    let effectFinished,completed=0,hits=0;
    scene.playPreparedScene=(_key,_hero,_targets,done)=>effectFinished=done;
    const unit=new EventEmitter();Object.assign(unit,{unitKey:'independent',playAnimation(){},
      manifest:hero(100).manifest,
      returnToIdle:done=>done(),setFacingLeft(){},setDepthBoost(){},playRestPose(){}});
    scene.executePreparedSkill(unit,{actionChoreography:choreography('stationary','magic_atk'),moveType:'stationary',motion:'magic_atk',scope:'single_enemy',requiresSourceScene:true,scenePresentation:'generic',damageEvents:[{frame:300,weight:1}]},'generic',[{}],()=>hits++,()=>completed++);
    if(cancel)scene.events.emit('shutdown');
    unit.emit('animationcomplete-independent_magic_atk');assert.equal(effectFinished,undefined);
    assert.equal(completed,0);timers[0]();
    assert.equal(completed,cancel?0:1);assert.equal(hits,cancel?0:1);
    assert.equal(unit.listenerCount('animationcomplete-independent_magic_atk'),0);
    assert.equal(scene.events.listenerCount('shutdown'),0);
  }
});

test('incompatible prepared action scope/movement is rejected before MP or state changes',()=>{
  const scene=battle(),unit=hero(100);let charged=0;
  unit.useMp=()=>{charged++;return true;};scene.turnOrder=[unit];scene.activeHeroIndex=0;
  scene.combatState='PLAYER_TURN';scene.skillVisualMode='source';scene.enemies=[{currentHp:100}];
  scene.preparedScenes={canPlay:()=>true};
  scene.cache={json:{get:()=>JSON.parse(fs.readFileSync('public/assets/presentations/cloud_brave_slash/manifest.json','utf8'))}};
  for(const changes of [{scope:'all_enemies',moveType:'dash'},{scope:'single_enemy',moveType:'stationary'}]){
    scene.executeSkillChoice({scenePresentation:'generic',mpCost:18,...changes});
    assert.equal(charged,0);assert.equal(scene.combatState,'PLAYER_TURN');
  }
});


test('weighted events complete only after the last relevant hit; duplicates, early death and shutdown are safe',()=>{
 for(const mode of ['normal','target-death','shutdown']){
  const scene=battle(),timers=[],hits=[];scene.events=new EventEmitter();scene.combatState='HERO_ATTACKING';
  scene.time={delayedCall(ms,run){const t={ms,run,removed:false,remove(){this.removed=true;}};timers.push(t);return t;}};
  scene.preparedScenes={choreography:()=>({movement:'stationary'})};scene.playPreparedScene=()=>{};
  const unit=new EventEmitter();Object.assign(unit,{unitKey:'fixture',playAnimation(){},returnToIdle:done=>done(),
   manifest:hero(100).manifest,
   setFacingLeft(){},setDepthBoost(){},playRestPose(){},playVictory(){}});
  const skill={actionChoreography:choreography(),moveType:'stationary',motion:'atk',scope:'single_enemy',requiresSourceScene:true,scenePresentation:'fixture',damageEvents:[
   {frame:2,weight:.2},{frame:40,weight:.3},{frame:100,weight:.5}]};
  const target={currentHp:100};let complete=0;
  scene.executePreparedSkill(unit,skill,'fixture',[target],weight=>{hits.push(weight);if(mode==='target-death')target.currentHp=0;},()=>complete++);
  unit.emit('animationcomplete-fixture_atk');assert.equal(complete,0);
  if(mode==='shutdown')scene.events.emit('shutdown');
  for(const timer of timers){timer.run();timer.run();if(mode==='normal'&&timer!==timers.at(-1))assert.equal(complete,0);}
  assert.deepEqual(hits,mode==='normal'?[.2,.3,.5]:mode==='target-death'?[.2]:[]);
  assert.equal(complete,mode==='shutdown'?0:1);assert.ok(timers.every(t=>t.removed));
  assert.equal(unit.listenerCount('animationcomplete-fixture_atk'),0);assert.equal(scene.events.listenerCount('shutdown'),0);
 }
});

test('instant enemy events use the shared clock once, skip dead targets and respect body/shutdown barriers',()=>{
 for(const mode of ['fallback','execute','shutdown']){
  const scene=battle(),timers=[],hits=[];scene.events=new EventEmitter();scene.combatState='HERO_ATTACKING';
  scene.time={delayedCall(ms,run){const t={ms,run,remove(){}};timers.push(t);return t;}};
  scene.preparedScenes={choreography:()=>({movement:'stationary'})};scene.playPreparedScene=()=>{};
  scene.handleTargetDamaged=()=>{};
  const unit=new EventEmitter();Object.assign(unit,{unitKey:'fixture',manifest:hero(100).manifest,playAnimation(){},returnToIdle:done=>done(),setFacingLeft(){},setDepthBoost(){},playRestPose(){}});
  const targets=[1000,0].map(currentHp=>Object.assign(Object.create(TargetDummy.prototype),{currentHp,isBoss:false,applyDamage(amount,_critical,type){hits.push({amount,type});this.currentHp-=amount;}}));
  const skill={actionChoreography:choreography(),moveType:'stationary',motion:'atk',scope:'all_enemies',requiresSourceScene:true,scenePresentation:'fixture',
   supportEvents:[{frame:45,effects:[{kind:'execute-or-damage',chance:mode==='execute'?1:0,fallbackDamage:700,bossImmune:true}]}]};
  let completed=0;scene.executePreparedSkill(unit,skill,'fixture',targets,()=>assert.fail('Instant event entered physical damage callback'),()=>completed++);
  if(mode==='shutdown')scene.events.emit('shutdown');
  for(const timer of timers){timer.run();timer.run();}
  assert.equal(completed,0);unit.emit('animationcomplete-fixture_atk');
  assert.deepEqual(hits,mode==='shutdown'?[]:[{amount:mode==='execute'?1000:700,type:'unmitigated'}]);assert.equal(completed,mode==='shutdown'?0:1);
 }
});

test('multi-hit area damage weights the action total and skips defeated captured targets',()=>{
 const scene=battle(),hits=[[],[]];scene.combatState='HERO_ATTACKING';
 const unit={};scene.frontlineHero=unit;
 const targets=hits.map((list,i)=>({currentHp:1000,applyDamage(value){list.push(value);if(i===0)this.currentHp=0;}}));
 scene.enemies=targets;scene.sourceSceneKey=()=> 'fixture';scene.handleTargetDamaged=()=>{};
 scene.executePreparedSkill=(_hero,_skill,_key,_targets,impact,done)=>{impact(.25);impact(.75);done();};
 let complete=0;scene.executeSourceAreaSkill(unit,{damageMultiplier:2,scope:'all_enemies',motion:'atk'},()=>complete++);
 assert.deepEqual(hits,[[150],[150,450]]);assert.equal(complete,1);
});

test('Source-only commands reject missing players and malformed timelines before MP or action mutation',()=>{
 const scene=battle(),unit=hero(100);scene.turnOrder=[unit];scene.activeHeroIndex=0;
 scene.enemies=[{currentHp:100}];scene.combatState='PLAYER_TURN';scene.preparedScenes=undefined;let charged=0;
 unit.useMp=()=>{charged++;return true;};const skill={scope:'single_enemy',requiresSourceScene:true,scenePresentation:'fixture',mpCost:20};
 scene.executeSkillChoice(skill);assert.equal(charged,0);assert.equal(scene.combatState,'PLAYER_TURN');
 scene.skillVisualMode='source';scene.preparedScenes={canPlay:()=>true};
 scene.executeSkillChoice({...skill,damageEvents:[{frame:2,weight:.3}]});assert.equal(charged,0);
});

test('committed Source support retains its reviewed event path during readiness notifications',()=>{
 const scene=battle(),unit=hero(100);unit.unitKey='fixture';unit.currentMp=100;
 scene.turnOrder=[unit];scene.activeHeroIndex=0;scene.enemies=[{currentHp:100}];scene.combatState='PLAYER_TURN';scene.skillVisualMode='source';
 const skill=JSON.parse(fs.readFileSync('public/assets/units/aerith/skills.json')).skills.find(s=>s.id==='seal_evil');
 scene.preparedScenes={canPlay:()=>true};scene.cache={json:{get:()=>JSON.parse(fs.readFileSync('public/assets/presentations/aerith_seal_evil/manifest.json'))}};
 let charges=0,prepared=0,done=0;unit.useMp=()=>{charges++;return true;};scene.concludeHeroSkill=()=>done++;
 scene.startHeroAction=(_hero,_motion,action)=>{scene.sourceVisualError='controlled readiness notification';action();};
 scene.executePreparedSkill=(_hero,_skill,key,targets,_impact,complete)=>{assert.equal(key,'aerith_seal_evil');assert.equal(targets.length,1);prepared++;complete();};
 scene.executeSkillChoice(skill);assert.equal(charges,1);assert.equal(prepared,1);assert.equal(done,1);assert.equal(scene.activeSkillActions,0);
});

test('reviewed short steps have no attack clip and close after gameplay and source-cycle return',()=>{
 const scene=battle(),timers=[],tweens=[],poses=[];scene.events=new EventEmitter();scene.combatState='HERO_ATTACKING';
 scene.time={delayedCall(ms,run){const timer={ms,run,remove(){}};timers.push(timer);return timer;}};
 scene.tweens={add(config){tweens.push(config);}};
 scene.preparedScenes={choreography:()=>({approachFrames:18,returnFrames:12})};
 scene.playPreparedScene=()=>poses.push('vfx');
 const unit=new EventEmitter();Object.assign(unit,{unitKey:'step_fixture',scaleY:2,isDead:false,homeSlot:{x:800,y:500},
  manifest:{animations:{idle:{frameHeight:72},move:{frames:[{durationMs:66.67}]}}},
  playAnimation:clip=>poses.push(clip),playRestPose:()=>poses.push('idle'),setDepthBoost(){},setFacingLeft(){}});
 const skill=JSON.parse(fs.readFileSync('public/assets/units/cloud_ac/skills.json')).skills[0];
 let hits=0,done=0;scene.executePreparedSkill(unit,skill,'fixture',[{currentHp:100}],()=>hits++,()=>done++);
 assert.equal(tweens[0].x,728);assert.equal(tweens[0].y,500);assert.equal(tweens[0].duration,66.67);
 tweens[0].onComplete();assert.deepEqual(poses,['move','idle','vfx']);
 timers[0].run();assert.equal(hits,1);assert.equal(tweens.length,1,'Same-frame support must finish before return');
 timers[1].run();assert.equal(tweens.length,2);assert.equal(done,0);assert.equal(tweens[1].duration,66.67);
 tweens[1].onComplete();assert.equal(done,1);assert.ok(!poses.some(p=>p==='atk'||p==='magic_atk'));
 timers.forEach(t=>t.run());assert.equal(hits,1);assert.equal(done,1);assert.equal(scene.events.listenerCount('shutdown'),0);
});

test('independent body phases survive early gameplay completion and are cancelled on shutdown',()=>{
 for(const shutdown of [false,true]){
  const scene=battle(),timers=[],poses=[];scene.events=new EventEmitter();scene.combatState='HERO_ATTACKING';
  scene.time={delayedCall(ms,run){const t={ms,run,remove(){}};timers.push(t);return t;}};
  scene.preparedScenes={choreography:()=>({approachFrames:0,returnFrames:12})};scene.playPreparedScene=()=>{};
  const unit=new EventEmitter();Object.assign(unit,{unitKey:'phases',manifest:hero(100).manifest,playAnimation:p=>poses.push(p),
   returnToIdle:done=>done(),playRestPose(){},setFacingLeft(){},setDepthBoost(){}});
  const c=choreography();c.body.phases.push({frame:12,clip:'magic_atk'});
  const skill={actionChoreography:c,moveType:'stationary',motion:'atk',requiresSourceScene:true,scenePresentation:'fixture',scope:'single_enemy',damageEvents:[{frame:6,weight:1}]};
  let complete=0,hits=0;scene.executePreparedSkill(unit,skill,'fixture',[{currentHp:100}],()=>hits++,()=>complete++);
  timers.find(t=>t.ms===100).run();assert.equal(hits,1);assert.equal(complete,0);
  if(shutdown)scene.events.emit('shutdown');timers.find(t=>t.ms===200).run();
  unit.emit('animationcomplete-phases_magic_atk');assert.equal(complete,shutdown?0:1);
  assert.deepEqual(poses,shutdown?['atk']:['atk','magic_atk']);assert.equal(scene.events.listenerCount('shutdown'),0);
 }
});

test('stationary effect-only actions add neither body clip nor recoil recovery',()=>{
 const scene=battle(),timers=[];scene.events=new EventEmitter();scene.combatState='HERO_ATTACKING';
 scene.time={delayedCall(ms,run){const t={run,remove(){}};timers.push(t);return t;}};
 scene.preparedScenes={choreography:()=>({approachFrames:0,returnFrames:12})};scene.playPreparedScene=()=>{};
 const unit=new EventEmitter();Object.assign(unit,{manifest:hero(100).manifest,playAnimation(){throw Error('Implicit clip');},
  returnToIdle(){throw Error('Unnecessary recoil');},playRestPose(){},setFacingLeft(){},setDepthBoost(){}});
 const c=choreography();c.body={mode:'rest'};
 const skill={actionChoreography:c,moveType:'stationary',requiresSourceScene:true,scenePresentation:'fixture',scope:'single_enemy',damageEvents:[{frame:6,weight:1}]};
 let complete=0;scene.executePreparedSkill(unit,skill,'fixture',[{currentHp:100}],()=>{},()=>complete++);
 assert.equal(complete,0);timers[0].run();assert.equal(complete,1);
});

test('friendly recipient sets exclude caster and K.O.; costs fail before spending MP',()=>{
 const scene=battle(),caster=hero(300),a=hero(100),b=hero(0);scene.turnOrder=[caster,a,b];scene.activeHeroIndex=0;
 scene.combatState='PLAYER_TURN';scene.enemies=[{currentHp:100}];caster.currentMp=100;caster.maxMp=100;caster.refreshRestPose=()=>{};
 const skill=JSON.parse(fs.readFileSync('public/assets/units/delita/skills.json')).skills.find(s=>s.id==='chant');
 scene.cache={json:{get:()=>JSON.parse(fs.readFileSync('public/assets/presentations/delita_chant/manifest.json'))}};
 assert.deepEqual(scene.friendlySkillTargets(caster,skill),[a]);
 caster.currentHp=skill.hpCost;scene.executeSkillChoice(skill);assert.equal(caster.currentMp,100);assert.equal(scene.combatState,'PLAYER_TURN');
 caster.currentHp=300;scene.startHeroAction=(_hero,_clip,action)=>action();scene.concludeHeroSkill=()=>{};
 scene.executePreparedSkill=(_hero,_skill,_key,targets)=>assert.deepEqual(targets,[a]);
 scene.executeSkillChoice(skill);assert.equal(caster.currentHp,200);assert.equal(caster.currentMp,88);
 assert.equal(caster.spendHp(200),false);assert.equal(caster.currentHp,200);assert.equal(caster.spendHp(199),true);assert.equal(caster.currentHp,1);
});

test('prepared boss charge deals no damage, burst hits each living hero once with defense and phase power',()=>{
 const s=battle(),timers=[],messages=[];s.events=new EventEmitter();s.updateStatus=m=>messages.push(m);
 const actors=[1000,1000,0].map((hp,i)=>({unitKey:'unit'+i,currentHp:hp,get isDead(){return this.currentHp<=0;},applyDamage(n){this.currentHp=Math.max(0,this.currentHp-n);}}));
 s.turnOrder=actors;s.frontlineHero=actors[0];s.startRound=()=>{};s.time.delayedCall=(_ms,cb)=>{timers.push(cb);};
 s.runContext={state:{areas:[{arena:'reactor',name:'Mako Reactor',normals:1}],encounter:1,party:[{key:'unit0',stats:{defense:1}},{key:'unit1',stats:{defense:2}}]}};
 let attacks=0;const e={assetKey:'guard_scorpion',nameTag:'Guard Scorpion',isBoss:true,maxHp:1000,currentHp:500,actionCursor:1,statusEffects:[],executeAttack(_x,_y,impact,done){attacks++;impact();done();}};s.enemies=[e];
 s.combatState='ENEMY_TURN';s.executeEnemyTurn();while(timers.length)timers.shift()();
 assert.equal(e.actionCursor,2);assert.equal(attacks,0);assert.deepEqual(actors.map(a=>a.currentHp),[1000,1000,0]);assert.ok(messages.some(m=>m.includes('hits the party next!')));
 e.statusEffects=[{kind:'stop',phases:1,chance:1}];s.combatState='ENEMY_TURN';s.executeEnemyTurn();while(timers.length)timers.shift()();assert.equal(e.actionCursor,2);assert.equal(attacks,0);
 s.combatState='ENEMY_TURN';s.executeEnemyTurn();while(timers.length)timers.shift()();
 assert.equal(e.actionCursor,3);assert.equal(attacks,1);assert.deepEqual(actors.map(a=>a.currentHp),[732,866,0]);
});

test('a lethal enemy hit consumes auto-revive at once, so the party is not defeated and the status is gone',()=>{
 const s=battle(),timers=[],revived=[];s.events=new EventEmitter();s.events.on('hero-revived',e=>revived.push(e));
 s.add={text:()=>({setOrigin(){return this;},setDepth(){return this;},destroy(){}})};s.tweens={add(){}};
 const actors=[100,0].map((hp,i)=>({unitKey:'unit'+i,heroName:'Unit'+i,x:0,y:0,maxHp:1000,currentHp:hp,limitGauge:0,sourceBuffs:[],
  get isDead(){return this.currentHp<=0;},applyDamage(n){this.currentHp=Math.max(0,this.currentHp-n);},revive:UnitActor.prototype.revive,spawnHealPopup(){},scene:{time:{delayedCall(){}}}}));
 actors[0].sourceBuffs=[{kind:'physical-boost',multiplier:1.3,expiresAfterRound:2},{kind:'auto-revive',hpFraction:.25,expiresAfterRound:2}];
 let defeats=0;s.triggerDefeat=()=>defeats++;
 s.turnOrder=actors;s.frontlineHero=actors[0];s.startRound=()=>{};s.time.delayedCall=(_ms,cb)=>{timers.push(cb);};s.currentRound=2;
 s.runContext={state:{areas:[{arena:'forest',name:'Whisperwood',normals:1}],encounter:0,party:[{key:'unit0',stats:{defense:1}}]}};
 const e={assetKey:'microchu',nameTag:'Microchu',maxHp:900,currentHp:900,actionCursor:0,statusEffects:[],executeAttack(_x,_y,impact,done){impact();done();}};s.enemies=[e];
 s.combatState='ENEMY_TURN';s.executeEnemyTurn();while(timers.length)timers.shift()();
 assert.equal(defeats,0);assert.equal(actors[0].currentHp,250);assert.deepEqual(JSON.parse(JSON.stringify(revived)),[{unit:'unit0',hp:250,round:2}]);
 assert.deepEqual(JSON.parse(JSON.stringify(actors[0].sourceBuffs)),[{kind:'physical-boost',multiplier:1.3,expiresAfterRound:2}]);
 assert.ok(actors[0].limitGauge>0,'the revived hero still gains Limit from the hit');
 actors[0].currentHp=100;s.combatState='ENEMY_TURN';s.executeEnemyTurn();while(timers.length)timers.shift()();
 assert.equal(actors[0].currentHp,0);assert.equal(defeats,1,'the status revives only once');
 const dead=hero(0);dead.maxHp=500;dead.spawnHealPopup=()=>{};dead.scene={time:{delayedCall(){}}};
 assert.equal(dead.revive(0),0);assert.equal(dead.revive(9999),500);assert.equal(dead.revive(10),0,'a living hero cannot be revived again');
});

test('prepared stationary enemy uses its own origin and full clip durations with one impact before cleanup',()=>{
 const body=Object.create(TargetDummy.prototype),timers=[],calls=[];
 body.currentHp=100;body.assetKey='fixture';body.attackProfile={clip:'atk',impactFrame:1,movement:'stationary'};
 body.manifest={animations:{idle:{pivotX:.5,pivotY:.8},atk:{pivotX:.4,pivotY:.7,frames:[{durationMs:80},{durationMs:160}]}}};
 body.sprite={setOrigin(x,y){calls.push(['pivot',x,y]);},play(k){calls.push(k);}};body.scene={time:{delayedCall(ms,cb){timers.push({ms,cb});}}};body.setDepthBoost=v=>calls.push(['depth',v]);
 body.executeAttack(99,99,()=>calls.push('impact'),()=>calls.push('complete'));
 assert.deepEqual(timers.map(t=>t.ms),[80,240]);timers.sort((a,b)=>a.ms-b.ms).forEach(t=>t.cb());
 assert.equal(calls.filter(c=>c==='impact').length,1);assert.ok(calls.indexOf('impact')<calls.indexOf('complete'));
 assert.ok(calls.includes('fixture_atk')&&calls.includes('fixture_idle'));assert.deepEqual(calls.find(c=>Array.isArray(c)&&c[0]==='pivot'),['pivot',.4,.7]);
});

test('large original body clips fit the shared formation anchor without changing pivots or stretching',()=>{
 const bounds={left:8,right:992,top:56,bottom:792};
 for(const key of ['microchu','ochu','sweeper','guard_scorpion']){
  const m=JSON.parse(fs.readFileSync(`public/assets/monsters/${key}/manifest.json`,'utf8'));
  const before=JSON.stringify(m),scale=fitPreparedEnemyScale(m,2,190,600,bounds);
  for(const a of Object.values(m.animations)){const bounce=scale*ENEMY_SPAWN_MAX_SCALE;assert.ok(190-a.pivotX*a.frameWidth*bounce>=bounds.left-1e-8);assert.ok(190+(1-a.pivotX)*a.frameWidth*bounce<=bounds.right);assert.ok(600-a.pivotY*a.frameHeight*bounce>=bounds.top);assert.ok(600+(1-a.pivotY)*a.frameHeight*bounce<=bounds.bottom);}
  assert.equal(JSON.stringify(m),before);assert.ok(scale>0&&scale<=2);
 }
});

test('verified resting victory pose releases rewards without stopping the original entrance clip',()=>{
 const unit=Object.create(UnitActor.prototype),clips=[],events=new EventEmitter();let ready=0;
 const meta={schemaVersion:1,units:{fixture:{unitId:'42',clip:'win_before',frame:2,frameCounts:{win_before:4,win:2}}}};
 Object.assign(unit,{unitKey:'fixture',currentHp:100,manifest:{unitId:'42',assetKey:'fixture',animations:{win_before:{frameCount:4},win:{frameCount:2}}},scene:{events,cache:{json:{get:()=>meta}}},playAnimation(clip){this.currentAnimKey=clip;clips.push(clip);}});
 unit.playVictoryCycle(()=>ready++);unit.emit('animationupdate',{key:'fixture_win_before'},{textureFrame:1});assert.equal(ready,0);
 unit.emit('animationupdate',{key:'fixture_win_before'},{textureFrame:2});assert.equal(ready,1);assert.equal(unit.hasVictoryPose,true);assert.deepEqual(clips,['win_before']);
 unit.emit('animationcomplete-fixture_win_before');assert.deepEqual(clips,['win_before','win']);assert.equal(ready,1);assert.equal(unit.listenerCount('animationupdate'),0);
});

test('action banner preserves shared hero/enemy FIFO, ignores repeated notices and never delays gameplay',()=>{
 const {ActionBanner}=loadModule('src/ui/ActionBanner.ts'),banner=Object.create(ActionBanner.prototype),texts=[],timers=[];
 Object.assign(banner,{queue:[],active:false,generation:0,lastSequence:0,scene:{tweens:{add(config){timers.push(config.onComplete);return{stop(){}};}}},
  root:{setVisible(){return this;},setAlpha(){return this;}},label:{width:400,setText(s){texts.push(s);return this;},setScale(){}},provenance:{setText(){}}});
 const first={sequence:1,actorName:'Cloud',abilityName:'Blade Beam',kind:'skill',origin:'source'};
 banner.enqueue(first);banner.enqueue(first);banner.enqueue({sequence:2,actorName:'Ochu',abilityName:'Bramble Surge',kind:'prepare',origin:'ffrogue'});
 assert.deepEqual(texts,['Cloud uses Blade Beam']);assert.equal(banner.queue.length,1);timers.shift()();timers.shift()();assert.deepEqual(texts,['Cloud uses Blade Beam','Ochu prepares Bramble Surge']);
 banner.clear();const count=texts.length;while(timers.length)timers.shift()();assert.equal(texts.length,count);assert.equal(banner.queue.length,0);
});

console.log(`${passed} combat regression checks passed.`);
