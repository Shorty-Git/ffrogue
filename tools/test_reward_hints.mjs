// Reward integration of elements (cloud night 2026-11-10): ward relics and weakness-weighted skill offers.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createRun,rollParty,confirmParty,completeBattle,chooseReward,rewardPool,validateRun,upcomingStage,REWARD_WEIGHTS} from '../src/run/runState.mjs';
import {STAGE_CONTENT,stageElementProfile} from '../src/run/stageContent.mjs';
import {heroElementMultiplier,WARD_RESIST} from '../src/run/elementRules.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),meta=read('public/assets/run-content.json');
const catalog={};for(const key of read('public/assets/content.json').characters){const s=read(`public/assets/units/${key}/skills.json`).skills.filter(s=>s.scenePresentation&&s.importStatus==='imported');if(!s.length)continue;const d=read(`public/assets/units/${key}/character.json`),m=meta.units[key];catalog[key]={key,name:d.battle.heroName,identity:m.identity,canonicalIdentity:m.canonicalIdentity,unitId:m.unitId,rarity:m.rarity,form:key,maxHp:d.battle.maxHp,maxMp:d.battle.maxMp,skills:s};}
const area=id=>{const s=STAGE_CONTENT[id];return {stageId:s.id,name:s.name,arena:s.arena,normals:s.normalFights};};
const snapshot=r=>r.party.map(m=>({key:m.key,hp:m.hp,mp:m.mp}));

test('stage element profiles list only elements the enemies really use', () => {
  assert.deepEqual(stageElementProfile(STAGE_CONTENT.whisperwood).attack, []);
  assert.deepEqual(stageElementProfile(STAGE_CONTENT.nibelheim).attack.sort(), ['dark', 'ice', 'lightning']);
  assert.ok(stageElementProfile(STAGE_CONTENT.mako_reactor).weak.includes('lightning'));
});

test('ward relics are offered for the next stage, apply once and survive validation', () => {
  let run = confirmParty(rollParty(createRun('ward-1', catalog, [area('whisperwood'), area('nibelheim')]), catalog));
  run = completeBattle(run, catalog, snapshot(run), true); // normal fight of whisperwood; next: its boss
  assert.equal(upcomingStage(run).id, 'whisperwood');
  assert.ok(!rewardPool(run, catalog).some(r => r.type === 'ward'), 'Whisperwood enemies use no element');
  run.encounter = 1; run.phase = 'battle'; run.offers = [];
  run = completeBattle(run, catalog, snapshot(run), true); // whisperwood boss; next: Nibelheim
  assert.equal(upcomingStage(run).id, 'nibelheim');
  const wards = rewardPool(run, catalog).filter(r => r.type === 'ward').map(r => r.element).sort();
  assert.deepEqual(wards, ['dark', 'ice', 'lightning']);
  run.offers = [{type: 'ward', element: 'dark'}, {type: 'rest'}, {type: 'ward', element: 'ice'}];
  const after = chooseReward(validateRun(run, catalog), 0, catalog);
  assert.deepEqual(after.wards, ['dark']);
  assert.ok(!rewardPool({...after, encounter: 1}, catalog).some(r => r.type === 'ward' && r.element === 'dark'), 'one ward per element');
  assert.throws(() => validateRun({...after, wards: ['dark', 'dark']}, catalog), /wards/);
  assert.throws(() => validateRun({...after, wards: ['poison']}, catalog), /wards/);
  assert.equal(heroElementMultiplier('cloud', ['dark'], after.wards), 1 - WARD_RESIST / 100);
  assert.equal(heroElementMultiplier('cloud_of_darkness', ['dark'], after.wards), .25, 'stacks with own resistance, floor holds');
});

test('weakness-matching skills are favoured, offers stay deterministic per seed', () => {
  assert.ok(REWARD_WEIGHTS.learnOnWeakness > REWARD_WEIGHTS.default);
  const runs = Array.from({length: 2}, () => {
    let run = confirmParty(rollParty(createRun('weights-7', catalog, [area('mako_reactor'), area('nibelheim')]), catalog));
    return completeBattle(run, catalog, snapshot(run), true);
  });
  assert.deepEqual(runs[0].offers, runs[1].offers);
  assert.deepEqual(runs[0].rng, runs[1].rng);
});

test('every run ends in the Nibelheim boss room; earlier areas are seeded and end in elites', async () => {
  const {courseAreas, encounters, FINAL_STAGE, rewardKind, REWARD_KINDS} = await import('../src/run/runState.mjs');
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const areas = courseAreas('course-' + i);
    assert.equal(areas.length, 3);
    assert.equal(areas[2].stageId, FINAL_STAGE);
    assert.ok(areas.slice(0, 2).every(a => a.stageId !== FINAL_STAGE && !a.final));
    seen.add(areas[0].stageId); seen.add(areas[1].stageId);
    assert.deepEqual(encounters(areas).filter(e => e.boss).map(e => e.kind), ['elite', 'elite', 'boss']);
  }
  assert.ok(seen.size >= 6, 'all other stages appear');
  assert.deepEqual(REWARD_KINDS, ['skill', 'upgrade', 'weapon']);
  assert.equal(rewardKind({type: 'ward'}), 'upgrade');
});

test('a won fight offers one skill, one upgrade and one weapon card, relics take the upgrade card', async () => {
  const {setWeaponData} = await import('../src/run/weapons.mjs');
  const {rewardKind, encounters} = await import('../src/run/runState.mjs');
  setWeaponData(read('public/assets/items/weapons.json'));
  for (let i = 0; i < 30; i++) {
    let run = confirmParty(rollParty(createRun('mix-' + i, catalog), catalog));
    run = completeBattle(run, catalog, snapshot(run), true);
    assert.deepEqual(run.offers.map(rewardKind), ['skill', 'upgrade', 'weapon']);
    run = chooseReward(run, 1, catalog);
    run = completeBattle(run, catalog, snapshot(run), true);
    assert.equal(encounters(run.areas)[run.encounter].kind, 'elite');
    assert.equal(run.offers[1].type, 'evolve', 'elite relic in the upgrade slot');
    const ko = structuredClone(run); ko.phase = 'battle'; ko.offers = [];
    const fallen = completeBattle(ko, catalog, ko.party.map((m, j) => ({key: m.key, hp: j === 0 ? 0 : m.hp, mp: m.mp})), true);
    assert.deepEqual(fallen.offers.slice(1).map(o => o.type), ['evolve', 'revive']);
  }
});

test('entering a new area camps: living members recover HP and MP, K.O. stays K.O.', async () => {
  const {AREA_CAMP, memberMaxMp} = await import('../src/run/runState.mjs');
  let run = confirmParty(rollParty(createRun('camp-2', catalog), catalog));
  run = chooseReward(completeBattle(run, catalog, snapshot(run), true), 0, catalog);
  const low = run.party.map((m, i) => ({key: m.key, hp: i === 2 ? 0 : 100, mp: 0}));
  run = completeBattle(run, catalog, low, true);
  assert.ok(['learn', 'skill'].includes(run.offers[0].type), 'the skill card never touches HP/MP');
  run = chooseReward(run, 0, catalog, run.party[0].skills.length === 3 ? run.party[0].skills[0].id : undefined);
  const [a, , ko] = run.party, c = catalog[a.key];
  assert.equal(a.hp, Math.min(Math.round(c.maxHp * a.stats.hp), 100 + Math.round(c.maxHp * a.stats.hp * AREA_CAMP.hp)));
  assert.equal(a.mp, Math.round(memberMaxMp(c, a) * AREA_CAMP.mp));
  assert.equal(ko.hp, 0);
});
