import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
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
  Math: { Between: (min) => min },
};
const modules = new Map();
function loadModule(file) {
  if (modules.has(file)) return modules.get(file);
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports,
    require: (name) => name === 'phaser'
      ? { default: phaser }
      : loadModule(`src/${name.replace('../', '')}.ts`),
    console,
  }, { filename: file });
  modules.set(file, exports);
  return exports;
}
const { BattleScene } = loadModule('src/scenes/BattleScene.ts');
const { UnitActor } = loadModule('src/entities/UnitActor.ts');
const { TargetDummy } = loadModule('src/entities/TargetDummy.ts');
let passed = 0;
function test(name, run) {
  run();
  passed++;
  console.log(`PASS ${name}`);
}
function battle() {
  const scene = new BattleScene();
  scene.updateCommandMenu = () => {};
  scene.updatePartyStatusUi = () => {};
  scene.updateStatus = () => {};
  scene.lockCommandMenu = () => {};
  scene.targetMarkerContainer = { setVisible() {} };
  scene.roundBannerText = { setText() {}, setColor() {} };
  scene.time = { delayedCall() {} };
  return scene;
}
function hero(hp) {
  const unit = Object.create(UnitActor.prototype);
  unit.currentHp = hp;
  unit.hasActed = false;
  return unit;
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
test('late magic impact skips dead targets and still completes the action', () => {
  const scene = battle();
  let impact;
  let completed = 0;
  scene.time.delayedCall = (_delay, callback) => { impact = callback; };
  scene.combatState = 'HERO_ATTACKING';
  scene.fireMagicProjectile({ currentHp: 0, applyDamage() { throw Error('Ghost hit'); } });
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
test('repeated reward and next-wave callbacks are ignored', () => {
  const scene = battle();
  scene.combatState = 'VICTORY';
  scene.rewardSelected = true;
  scene.selectReward({}, null, null);
  scene.rewardSelected = false;
  scene.startNextFight();
  assert.equal(scene.fightNumber, 1);
});
test('reset locks input and delegates cancellation to scene restart', () => {
  const scene = battle();
  scene.manifests = { example: {} };
  let restarted = false;
  scene.scene = { restart(data) {
    assert.equal(scene.combatState, 'SPAWNING');
    assert.equal(data.manifests, scene.manifests);
    restarted = true;
  } };
  scene.resetBattle();
  assert.equal(restarted, true);
});
test('Brave Slash schedules source effect and damage frames and skips a defeated target', () => {
  const scene = battle();
  const callbacks = [];
  const tweens = [];
  scene.time = { delayedCall(delay, callback) { callbacks.push({ delay, callback }); } };
  scene.tweens = { add(config) { tweens.push(config); } };
  scene.currentTarget = { currentHp: 100, x: 220, y: 360, nameTag: 'Test' };
  scene.combatState = 'HERO_ATTACKING';
  const unit = { homeSlot: { x: 880, y: 360 }, combatConfig: { targetOffsetX: 90 },
    manifest: { animations: { atk: { frames: [{ durationMs: 100 }, { durationMs: 200 }] } } },
    setDepthBoost() {}, playAnimation() {}, heroName: 'Cloud' };
  const skill = { name: 'Brave Slash', moveType: 'dash', motion: 'atk', scope: 'single_enemy',
    attackFrames: [6], visualEffect: { key: 'brave_slash', startFrame: 4 } };
  scene.executeGenericSkill(unit, skill, () => {});
  tweens[0].onComplete();
  assert.equal(callbacks[0].delay, 4 * 1000 / 60);
  assert.equal(callbacks[1].delay, 100);
  assert.equal(callbacks[2].delay, 380);
  let played = 0;
  scene.playSkillEffect = () => played++;
  callbacks[0].callback();
  assert.equal(played, 1);
  scene.currentTarget.currentHp = 0;
  callbacks[0].callback();
  assert.equal(played, 1);
});

function animatedHero() {
  const unit = hero(100);
  EventEmitter.call(unit);
  unit.unitKey = 'test';
  unit.maxHp = 100;
  unit.manifest = { animations: Object.fromEntries(
    ['idle', 'dying', 'dead', 'win_before', 'win', 'atk', 'standby', 'magic_standby'].map(name => [name, { pivotX: 0.5, pivotY: 1 }])) };
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
  scene.isSkillMenuOpen = true;
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
test('closing commands restores low HP while submenu navigation keeps standby and busy actions intact', () => {
  const scene = battle();
  const unit = animatedHero();
  unit.currentHp = 20;
  scene.turnOrder = [unit];
  scene.activeHeroIndex = 0;
  scene.combatState = 'PLAYER_TURN';
  scene.openSkillSubMenu();
  assert.equal(unit.currentAnimKey, 'standby');
  scene.closeSkillSubMenu();
  assert.equal(unit.currentAnimKey, 'standby');
  scene.closeHeroCommands();
  assert.equal(unit.currentAnimKey, 'dying');
  scene.combatState = 'HERO_ATTACKING';
  unit.playAnimation('atk');
  scene.closeSkillSubMenu();
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
  const spell = { id: 'spell', name: 'Spell', motion: 'magic_atk', mpCost: 20 };
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
  scene.openSkillSubMenu(); scene.closeSkillSubMenu();
  assert.equal(second.currentAnimKey, 'magic_standby');
  scene.selectHero(first);
  assert.equal(second.currentAnimKey, 'magic_standby');
  assert.equal(scene.plannedActions.size, 2);
});
test('explicit commit charges one command, locks concurrent execution and preserves other plans', () => {
  const scene = battle();
  const first = animatedHero(); first.unitKey = 'first'; first.currentMp = 100;
  const second = animatedHero(); second.unitKey = 'second'; second.currentMp = 100;
  const skill = { id: 'strike', name: 'Strike', motion: 'atk', mpCost: 18 };
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
  const skill = { id: 'strike', name: 'Strike', motion: 'atk', mpCost: 18 };
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
test('panel tap prepares first and a later tap commits exactly once while swiping edits', () => {
  const scene = battle(); const unit = animatedHero();
  unit.combatConfig = { attackAnim: 'atk', attackType: 'melee' };
  scene.turnOrder = [unit]; scene.activeHeroIndex = 0; scene.combatState = 'PLAYER_TURN';
  scene.currentTarget = null;
  scene.handleHeroPanelInput(unit);
  assert.equal(scene.isCommandMenuOpen, true);
  assert.equal(scene.plannedActions.size, 0);
  assert.equal(unit.currentAnimKey, 'standby');
  scene.planHeroAttack();
  assert.equal(scene.isCommandMenuOpen, false);
  let commits = 0;
  scene.executeActiveHeroAttack = () => { commits++; scene.combatState = 'HERO_ATTACKING'; };
  scene.handleHeroPanelInput(unit, true);
  assert.equal(commits, 0);
  assert.equal(scene.isCommandMenuOpen, true);
  scene.closeHeroCommands();
  scene.handleHeroPanelInput(unit);
  assert.equal(commits, 1);
  scene.handleHeroPanelInput(unit);
  assert.equal(commits, 1);
  assert.equal(scene.isCommandMenuOpen, false);
});

test('panel input rejects dead, acted and foreign heroes and terminal combat states', () => {
  const scene = battle(); const unit = animatedHero();
  scene.turnOrder = [unit]; scene.combatState = 'PLAYER_TURN';
  scene.selectHero = () => { throw Error('Invalid panel selected'); };
  unit.hasActed = true; scene.handleHeroPanelInput(unit);
  unit.hasActed = false; unit.currentHp = 0; scene.handleHeroPanelInput(unit);
  unit.currentHp = 100; scene.handleHeroPanelInput(animatedHero());
  for (const state of ['SPAWNING', 'HERO_ATTACKING', 'ENEMY_TURN', 'VICTORY', 'DEFEAT']) {
    scene.combatState = state; scene.handleHeroPanelInput(unit); scene.openHeroCommands(unit);
  }
});
console.log(`${passed} combat regression checks passed.`);
