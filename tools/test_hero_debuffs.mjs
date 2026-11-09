// Enemy debuffs on heroes (stat breaks, blind) and the Esuna-type cleanse.
import test from 'node:test';
import assert from 'node:assert/strict';
import {applyHeroBuffs, cleanseHeroDebuffs, heroDamageTakenMultiplier, heroMagicMultiplier, heroPhysicalMultiplier, isHeroBlind} from '../src/effects/heroBuffs.mjs';
import {ENEMY_SKILLS} from '../src/run/enemySkills.mjs';

test('breaks lower dealt damage and raise taken damage per stat, next to guards', () => {
  let s = applyHeroBuffs([], [{kind: 'physical-boost', multiplier: 1.3, turns: 3}, {kind: 'guard', damageType: 'physical', reduction: .3, turns: 3}], 1);
  s = applyHeroBuffs(s, [{kind: 'break', stat: 'attack', amount: .4, turns: 3}, {kind: 'break', stat: 'defense', amount: .3, turns: 3}, {kind: 'break', stat: 'magic', amount: .2, turns: 1}], 1);
  assert.ok(Math.abs(heroPhysicalMultiplier(s, 1) - 1.3 * .6) < 1e-9);
  assert.equal(heroMagicMultiplier(s, 1), .8);
  assert.ok(Math.abs(heroDamageTakenMultiplier(s, 1, 'physical') - .7 * 1.3) < 1e-9);
  assert.equal(heroDamageTakenMultiplier(s, 1, 'magical'), 1);
  assert.equal(heroMagicMultiplier(s, 3), 1, 'MAG break expired');
  assert.throws(() => applyHeroBuffs([], [{kind: 'break', stat: 'luck', amount: .3, turns: 3}], 1), /break/);
});

test('blind expires, and a cleanse removes breaks and blind but keeps buffs', () => {
  let s = applyHeroBuffs([], [{kind: 'blind', turns: 2}, {kind: 'break', stat: 'spirit', amount: .4, turns: 3}, {kind: 'guard', damageType: 'magical', reduction: .3, turns: 3}], 1);
  assert.equal(isHeroBlind(s, 3), true);
  assert.equal(isHeroBlind(s, 4), false);
  s = cleanseHeroDebuffs(s);
  assert.deepEqual(s.map(b => b.kind), ['guard']);
  assert.equal(heroDamageTakenMultiplier(s, 1, 'magical'), .7);
});

test('imported monster skills carry their original debuffs', () => {
  assert.deepEqual(ENEMY_SKILLS.condor.beak.heroEffects, [{kind: 'break', stat: 'defense', amount: .3, turns: 3}]);
  assert.deepEqual(ENEMY_SKILLS.sweeper.smoke_shot.heroEffects, [{kind: 'blind', turns: 3, chance: 1}]);
  assert.equal(ENEMY_SKILLS.x_atm092.arm_crush_plus.heroEffects.length, 4);
});
