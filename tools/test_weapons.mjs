// Weapons as run rewards (src/run/weapons.mjs): curated pool, bounded bonus, elements, saves.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {setWeaponData,weaponPool,weaponsForTier,weaponForRun,memberPower,validWeapon,WEAPON_BONUS_MAX,WEAPON_BONUS_PER_RARITY,WEAPON_TIERS} from '../src/run/weapons.mjs';
import {createRun,rollParty,confirmParty,completeBattle,chooseReward,rewardPool,validateRun,migrateRun,skillForRun,RUN_VERSION} from '../src/run/runState.mjs';
import {actionElements,heroElementMultiplier} from '../src/run/elementRules.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),meta=read('public/assets/run-content.json'),data=read('public/assets/items/weapons.json');
const catalog={};for(const key of read('public/assets/content.json').characters){const s=read(`public/assets/units/${key}/skills.json`).skills.filter(s=>s.scenePresentation&&s.importStatus==='imported');if(!s.length)continue;const d=read(`public/assets/units/${key}/character.json`),m=meta.units[key];catalog[key]={key,name:d.battle.heroName,identity:m.identity,canonicalIdentity:m.canonicalIdentity,unitId:m.unitId,rarity:m.rarity,form:key,maxHp:d.battle.maxHp,maxMp:d.battle.maxMp,skills:s};}
const snapshot=r=>r.party.map(m=>({key:m.key,hp:m.hp,mp:m.mp}));
setWeaponData(data);

test('the curated pool is a bounded, deterministic subset with rarity tiers', () => {
  const pool = weaponPool();
  assert.ok(pool.length > 60 && pool.length < 200, 'curated, not all 984: ' + pool.length);
  assert.ok(pool.every(validWeapon));
  assert.ok(pool.every(w => w.rarity >= 3 && w.rarity <= 7));
  assert.ok(pool.every(w => w.attack <= Math.min(WEAPON_BONUS_MAX, WEAPON_BONUS_PER_RARITY * w.rarity) + 1e-9), 'rarity caps the bonus');
  assert.ok(pool.some(w => w.elements.length), 'elemental weapons are kept');
  for (const [tier, [min, max]] of WEAPON_TIERS.entries()) assert.ok(weaponsForTier(tier).every(w => w.rarity >= min && w.rarity <= max));
  assert.equal(setWeaponData(data), pool.length);
  assert.deepEqual(weaponPool(), pool);
  const rune = weaponForRun({id: 1, name: 'X', category: 'sword', rarity: 4, stats: {atk: 900}, elements: ['light'], resist: {dark: 20}});
  assert.equal(rune.attack, .12); assert.deepEqual(rune.resist, {dark: 20});
});

test('weapon bonus lifts attack, its element reaches basic attacks and element-less physical skills', () => {
  const sword = {id: 9, name: 'Flame Saber', category: 'sword', rarity: 5, attack: .1, magic: 0, elements: ['fire'], resist: {ice: 30}};
  const member = {stats: {attack: 1.2, magic: 1, defense: 1, hp: 1}, weapon: sword, skills: [{id: 'a', level: 1}]};
  assert.equal(memberPower(member, 'attack'), 1.3);
  assert.equal(memberPower(member, 'defense'), 1);
  assert.deepEqual(actionElements(undefined, member), ['fire'], 'basic attack');
  assert.deepEqual(actionElements({damageEvents: [{}], damageType: 'physical'}, member), ['fire']);
  assert.deepEqual(actionElements({damageEvents: [{}], damageType: 'holy'}, member), [], 'magic keeps its own (no) element');
  assert.deepEqual(actionElements({damageEvents: [{}], originalCommand: {raw: {element: '0,1,0,0,0,0,0,0'}}}, member), ['ice'], 'own element wins');
  assert.equal(heroElementMultiplier('cloud', ['ice'], [], sword), .7, 'weapon resistances protect the wielder');
  const skill = skillForRun({id: 'a', damageMultiplier: 2, damageType: 'physical'}, member);
  assert.ok(Math.abs(skill.damageMultiplier - 2.6) < 1e-9);
});

test('weapon offers come from the save-recomputable pool and equip once; pre-v5 saves are rejected', () => {
  let run = confirmParty(rollParty(createRun('weapon-3', catalog), catalog));
  run = completeBattle(run, catalog, snapshot(run), true);
  const offers = rewardPool(run, catalog).filter(r => r.type === 'weapon');
  assert.equal(offers.length, run.party.length, 'one candidate per hero');
  assert.deepEqual(rewardPool(run, catalog).filter(r => r.type === 'weapon'), offers, 'no RNG consumed');
  run.offers = [offers[0], {type: 'rest'}, offers[1]];
  const after = chooseReward(validateRun(run, catalog), 0, catalog);
  assert.deepEqual(after.party.find(m => m.key === offers[0].member).weapon, offers[0].weapon);
  assert.equal(validateRun(after, catalog).version, RUN_VERSION);
  assert.throws(() => validateRun({...after, party: after.party.map(m => m.weapon ? {...m, weapon: {...m.weapon, attack: 3}} : m)}, catalog), /Unsupported saved party/);
  const old = structuredClone(after); old.version = 3; for (const m of old.party) delete m.weapon;
  assert.throws(() => migrateRun(old, catalog), /three-hero party/, 'v3 saves are rejected clearly');
});

test('a signature weapon belongs to every variant of its character and adds SIGNATURE_BONUS', async () => {
  const {signatureWeaponFor, isSignatureFor, SIGNATURE_BONUS, memberPower: power} = await import('../src/run/weapons.mjs');
  const cloud = {key: 'cloud', canonicalIdentity: 'ff7:cloud-strife', stats: {attack: 1, magic: 1}};
  const sword = signatureWeaponFor(cloud);
  assert.ok(sword && sword.icon && sword.signatureFor.includes('ff7:cloud-strife'), 'Cloud has a signature weapon with an icon');
  assert.equal(isSignatureFor(cloud, sword), true);
  assert.equal(isSignatureFor({canonicalIdentity: 'ff8:squall-leonhart'}, sword), false);
  const armed = {...cloud, weapon: sword};
  assert.ok(Math.abs(power(armed, 'attack') - (1 + sword.attack + SIGNATURE_BONUS)) < 1e-9);
  assert.ok(Math.abs(power({...armed, canonicalIdentity: 'ff8:squall-leonhart'}, 'attack') - (1 + sword.attack)) < 1e-9);
  assert.ok(validWeapon(sword));
});
