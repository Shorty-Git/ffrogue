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
