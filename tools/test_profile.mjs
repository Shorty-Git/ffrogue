// Meta-progression rules (src/run/profile.mjs): starter roster, run settlement, summons.
import assert from 'node:assert/strict';
import {normalizeProfile,drawCatalog,lockedHeroes,settleRun,summonHero,SUMMON_COST,CRYSTALS_PER_BATTLE,CRYSTALS_PER_EXPEDITION} from '../src/run/profile.mjs';
const hero = (key, canonical) => ({key, canonicalIdentity: canonical, skills: [{id: 's'}]});
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
assert.throws(() => summonHero({...won.profile, crystals: SUMMON_COST - 1}, catalog, 'x'), /Not enough/);
const summoned = summonHero({...won.profile, crystals: SUMMON_COST}, catalog, 'x');
assert.equal(summoned.profile.crystals, 0);
assert.equal(lockedHeroes(summoned.profile, catalog).length, 1);
assert.equal(settleRun(fresh, {seed: 'c', phase: 'battle', history: []}, catalog).crystals, 0, 'only finished runs settle');
console.log('profile: ok');
