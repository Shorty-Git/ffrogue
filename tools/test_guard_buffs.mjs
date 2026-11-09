// Protect/Shell guards: derived from original stat-buff processes, applied per damage type.
import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceFriendlyBuffs} from './lib/source-buffs.mjs';
import {applyHeroBuffs, heroDamageTakenMultiplier, heroPhysicalMultiplier} from '../src/effects/heroBuffs.mjs';

test('original stat-buff processes decide which statuses a skill grants', () => {
  const kinds = raw => sourceFriendlyBuffs(raw)?.map(e => e.kind === 'guard' ? 'guard-' + e.damageType : e.kind);
  assert.deepEqual(kinds({processId: '3@18', processParam: '0,100,0,0,4,1@30,4,1,1'}), ['guard-physical']);   // Protect
  assert.deepEqual(kinds({processId: '3@19', processParam: '0,0,0,100,4,1@30,4,1,1'}), ['guard-magical']);    // Shell
  assert.deepEqual(kinds({processId: '3', processParam: '200,200,0,0,3,1'}), ['physical-boost', 'guard-physical']); // Cheer
  assert.deepEqual(kinds({processId: '3', processParam: '0,0,40,40,3,1'}), ['physical-boost', 'guard-magical']);  // Focus
  assert.deepEqual(kinds({processId: '3', processParam: '0,20,0,20,3,1'}), ['guard-physical', 'guard-magical']);  // Holy Guard
  for (const raw of [{processId: '3@125', processParam: '110,0,0,0,3,1,0@500,500'}, {processId: '2', processParam: '1'}, {}, {processId: '3', processParam: '0,0,0,0,3,1'}])
    assert.equal(sourceFriendlyBuffs(raw), null);
});

test('guards reduce enemy damage of their own type only, stack by type and expire', () => {
  let buffs = applyHeroBuffs([], [{kind: 'guard', damageType: 'physical', reduction: .3, turns: 3}], 1);
  assert.equal(heroDamageTakenMultiplier(buffs, 1, 'physical'), .7);
  assert.equal(heroDamageTakenMultiplier(buffs, 1, 'magical'), 1);
  buffs = applyHeroBuffs(buffs, [{kind: 'guard', damageType: 'magical', reduction: .4, turns: 1}, {kind: 'guard', damageType: 'physical', reduction: .2, turns: 5}], 2);
  assert.equal(buffs.filter(b => b.kind === 'guard').length, 2);
  assert.equal(heroDamageTakenMultiplier(buffs, 2, 'physical'), .7, 'the stronger guard of a type wins');
  assert.equal(heroDamageTakenMultiplier(buffs, 3, 'magical'), .6);
  assert.equal(heroDamageTakenMultiplier(buffs, 4, 'magical'), 1, 'expired');
  assert.equal(heroDamageTakenMultiplier(buffs, 7, 'physical'), .7, 'longer duration kept');
  assert.equal(heroPhysicalMultiplier(buffs, 2), 1);
  assert.throws(() => applyHeroBuffs([], [{kind: 'guard', damageType: 'fire', reduction: .3, turns: 3}], 1), /guard/);
  assert.throws(() => applyHeroBuffs([], [{kind: 'guard', damageType: 'physical', reduction: 1, turns: 3}], 1), /guard/);
});
