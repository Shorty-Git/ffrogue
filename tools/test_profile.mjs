// Meta-progression rules (src/run/profile.mjs): starter roster, run settlement, summons.
import assert from 'node:assert/strict';
import {normalizeProfile,drawCatalog,lockedHeroes,settleRun,summonHero,summonPool,SUMMON_COST,CRYSTALS_PER_BATTLE,CRYSTALS_PER_EXPEDITION} from '../src/run/profile.mjs';
// Base rarity drives summon weights; clive is an NV-only unit (rank NV).
const hero = (key, canonical) => ({key, canonicalIdentity: canonical, skills: [{id: 's'}], rarity: key === 'clive' ? 7 : 5, ...(key === 'clive' ? {rank: 'NV'} : {})});
const catalog = Object.fromEntries([['cloud', 'ff7:cloud'], ['cloud_ac', 'ff7:cloud'], ['aerith', 'ff7:aerith'], ['squall', 'ff8:squall'],
  ['tidus', 'ff10:tidus'], ['clive', 'ff16:clive']].map(([k, c]) => [k, hero(k, c)]));
const fresh = normalizeProfile(null, catalog);
assert.deepEqual(fresh.unlocked, ['cloud', 'aerith', 'squall']);
assert.deepEqual(Object.keys(drawCatalog(fresh, catalog)), ['cloud', 'aerith', 'squall']);
assert.deepEqual(lockedHeroes(fresh, catalog), ['cloud_ac', 'tidus', 'clive']);
// A profile with too few identities is topped up so the Fate Engine can always draw three.
assert.equal(new Set(normalizeProfile({version: 1, unlocked: ['cloud', 'cloud_ac']}, catalog).unlocked.map(k => catalog[k].canonicalIdentity)).size, 3);
const reward = {kind: 'reward'};
const lost = settleRun(fresh, {seed: 'a', phase: 'lost', history: [{kind: 'initial-party'}, reward, reward]}, catalog);
assert.equal(lost.crystals, 2 * CRYSTALS_PER_BATTLE);
assert.equal(lost.unlocked, null);
assert.equal(settleRun(lost.profile, {seed: 'a', phase: 'lost', history: [{kind: 'initial-party'}, reward, reward]}, catalog).crystals, 0, 'settles once');
const won = settleRun(lost.profile, {seed: 'b', phase: 'won', history: [reward, reward, reward, reward]}, catalog);
assert.equal(won.crystals, 4 * CRYSTALS_PER_BATTLE + CRYSTALS_PER_EXPEDITION);
assert.ok(won.unlocked && won.profile.unlocked.includes(won.unlocked));
assert.equal(won.profile.record.won, 1);
// Final bosses stay a mystery until their room is won once (lost runs reveal nothing).
assert.deepEqual(fresh.bosses, []);
assert.deepEqual(settleRun(fresh, {seed: 'm', phase: 'lost', history: [reward], areas: [{stageId: 'dollet'}, {stageId: 'vector'}]}, catalog).profile.bosses, []);
assert.deepEqual(settleRun(fresh, {seed: 'n', phase: 'won', history: [reward], areas: [{stageId: 'dollet'}, {stageId: 'vector'}]}, catalog).profile.bosses, ['vector']);
assert.deepEqual(normalizeProfile({version: 1, unlocked: ['cloud'], bosses: ['nibelheim', 3, 'nibelheim']}, catalog).bosses, ['nibelheim']);
assert.throws(() => summonHero({...won.profile, crystals: SUMMON_COST - 1}, catalog, 'x'), /Not enough/);
const summoned = summonHero({...won.profile, crystals: SUMMON_COST}, catalog, 'x');
assert.equal(summoned.profile.crystals, 0);
assert.equal(lockedHeroes(summoned.profile, catalog).length, summoned.unlocked ? 1 : 2);
assert.ok(summoned.unlocked || summoned.bond === 1, 'a summon unlocks a hero or deepens Bond');
assert.equal(settleRun(fresh, {seed: 'c', phase: 'battle', history: []}, catalog).crystals, 0, 'only finished runs settle');
console.log('profile: ok');
// Bond: duplicates deepen Bond up to MAX_BOND, then refund; perks reach the draw catalog and the run.
import {MAX_BOND,BOND_REFUND,BOND_MIN_START_LEVEL,drawCatalog as draw2} from '../src/run/profile.mjs';
import {createRun,rollParty,chooseStartSkill} from '../src/run/runState.mjs';
{
  let p = {...normalizeProfile(null, catalog), unlocked: Object.keys(catalog), crystals: 100 * 10};
  const seen = [];
  for (let i = 0; i < 10; i++) { const r = summonHero(p, catalog, 'bond-' + i); p = r.profile; seen.push(r); }
  assert.ok(seen.every(r => r.unlocked === null), 'everyone unlocked: only Bond or refunds');
  assert.ok(Object.values(p.bond).every(n => n >= 1 && n <= MAX_BOND));
  const refunds = seen.filter(r => r.refund).length;
  assert.equal(p.crystals, refunds * BOND_REFUND);
  const full = {...p, bond: {cloud: 3}}, d = draw2(full, catalog);
  assert.equal(d.cloud.drawWeight, 1.5); assert.equal(d.cloud.startSkillChoice, true); assert.equal(d.cloud.minStartLevel, BOND_MIN_START_LEVEL);
  assert.equal(d.aerith.drawWeight, undefined);
}
{
  const skills = [{id: 'a', name: 'A'}, {id: 'b', name: 'B'}];
  // 3★ base units (base Lv 1), so the Bond floor is visible; z is a 5★ base unit (base Lv 3).
  const cat = Object.fromEntries([['x', 'ff1:x'], ['y', 'ff2:y'], ['z', 'ff3:z']].map(([k, c]) => [k, {key: k, form: k, identity: k, unitId: k, rarity: k === 'z' ? 5 : 3,
    canonicalIdentity: c, skills, maxHp: 100, maxMp: 10}]));
  cat.x = {...cat.x, startSkillChoice: true, minStartLevel: 2};
  const rules = {awakeningMode: 'sequential', originalForms: {weights: {3: 1000000, 4: 1, 5: 1, 6: 1, 7: 1, NV: 1}, hpPerRank: .05, mpPerRank: .03, powerPerRank: .035, defensePerRank: .035}};
  const run = rollParty(createRun('bond-run', cat, undefined, rules), cat);
  assert.equal(run.party.find(m => m.key === 'x').level, 2, 'Bond 3 floor');
  assert.equal(run.party.find(m => m.key === 'y').level, 1);
  assert.equal(run.party.find(m => m.key === 'z').level, 3, 'base rarity floor: a 5★ base unit never starts below Lv 3');
  const chosen = chooseStartSkill(run, 'x', 'b', cat);
  assert.deepEqual(chosen.party.find(m => m.key === 'x').skills, [{id: 'b', level: 1}]);
  assert.throws(() => chooseStartSkill(run, 'y', 'b', cat), /No starting skill choice/);
}
console.log('bond: ok');
{
  // Rarer base units are summoned less often: 5★ base (Lv 3) weight 25, NV (Lv 6) weight 6.
  const pool = summonPool(catalog);
  assert.equal(pool.find(e => e.key === 'cloud').weight, 25); assert.equal(pool.find(e => e.key === 'clive').weight, 6);
  const counts = {};
  for (let i = 0; i < 6000; i++) {const r = summonHero({...fresh, crystals: SUMMON_COST}, catalog, 'w' + i); counts[r.hero] = (counts[r.hero] ?? 0) + 1;}
  const total = pool.reduce((s, e) => s + e.weight, 0);
  for (const e of pool) assert.ok(Math.abs(counts[e.key] / 6000 - e.weight / total) < .02, JSON.stringify(counts));
  assert.throws(() => summonPool({x: {key: 'x', canonicalIdentity: 'a', skills: [{id: 's'}]}}), /base rarity/);
}
console.log('summon weights: ok');
