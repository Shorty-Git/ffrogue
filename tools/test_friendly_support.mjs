// Reusable friendly support kinds (auto-revive, Limit fill): data model, validation and run scaling.
// No published skill uses them yet; importing one still needs its own reviewed Source contract.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyHeroBuffs,consumeAutoRevive,heroPhysicalMultiplier} from '../src/effects/heroBuffs.mjs';
import {reviewedSkillEvents} from '../src/effects/skillDamageTimeline.mjs';
import {LB_MAX,gainFromSupport} from '../src/run/limitGauge.mjs';
import {skillForRun} from '../src/run/runState.mjs';

// Cheer is a published stationary party buff; only its friendly effects are swapped here.
const cheer=JSON.parse(fs.readFileSync('public/assets/units/jack/skills.json','utf8')).skills.find(s=>s.id==='cheer');
const withEffects=effects=>{const s=structuredClone(cheer);s.allyEvents=[{frame:s.allyEvents[0].frame,effects}];return s;};

test('the published fixture is a stationary friendly party action',()=>{
  assert.equal(cheer.scope,'party');assert.equal(cheer.moveType,'stationary');assert.ok(reviewedSkillEvents(cheer).length);
});

test('auto-revive and Limit fill pass the friendly validator only inside their bounds',()=>{
  for(const ok of [[{kind:'auto-revive',hpFraction:.3,turns:3}],[{kind:'auto-revive',hpFraction:1,turns:9}],
    [{kind:'limit-fill',amount:1}],[{kind:'limit-fill',amount:100}],
    [{kind:'limit-fill',amount:30},{kind:'auto-revive',hpFraction:.25,turns:2}]])
    assert.deepEqual(reviewedSkillEvents(withEffects(ok))[0].allyEffects,ok);
  for(const bad of [{kind:'auto-revive',hpFraction:0,turns:3},{kind:'auto-revive',hpFraction:1.01,turns:3},
    {kind:'auto-revive',hpFraction:NaN,turns:3},{kind:'auto-revive',hpFraction:.3,turns:0},{kind:'auto-revive',hpFraction:.3,turns:10},
    {kind:'auto-revive',hpFraction:.3},{kind:'limit-fill',amount:0},{kind:'limit-fill',amount:101},{kind:'limit-fill',amount:2.5},
    {kind:'revive',hpFraction:.5},{kind:'status-cure'}])
    assert.throws(()=>reviewedSkillEvents(withEffects([bad])),JSON.stringify(bad));
});

test('auto-revive refreshes the strongest status, coexists with boosts and is consumed exactly once',()=>{
  let buffs=applyHeroBuffs([],[{kind:'physical-boost',multiplier:1.3,turns:3},{kind:'auto-revive',hpFraction:.2,turns:2}],1);
  buffs=applyHeroBuffs(buffs,[{kind:'auto-revive',hpFraction:.5,turns:1}],2);
  assert.equal(buffs.filter(b=>b.kind==='auto-revive').length,1);
  assert.deepEqual(buffs.find(b=>b.kind==='auto-revive'),{kind:'auto-revive',hpFraction:.5,expiresAfterRound:3});
  const revived=consumeAutoRevive(buffs,3);
  assert.equal(revived.hpFraction,.5);
  assert.equal(revived.buffs.some(b=>b.kind==='auto-revive'),false);
  assert.equal(heroPhysicalMultiplier(revived.buffs,3),1.3,'consuming the revive keeps other statuses');
  assert.equal(consumeAutoRevive(revived.buffs,3),null,'one revive per status');
  assert.equal(consumeAutoRevive(buffs,4),null,'expired statuses never revive');
  assert.equal(consumeAutoRevive(undefined,1),null);
  assert.throws(()=>applyHeroBuffs([],[{kind:'limit-fill',amount:10}],1),/Unsupported hero status/);
});

test('Limit fill is bounded like every other gauge gain',()=>{
  assert.equal(gainFromSupport(0,30),30);
  assert.equal(gainFromSupport(90,30),LB_MAX);
  for(const bad of [0,-5,LB_MAX+1,1.5,NaN])assert.throws(()=>gainFromSupport(0,bad));
});

test('skill upgrades scale the new kinds within their caps without touching the source definition',()=>{
  const skill=withEffects([{kind:'auto-revive',hpFraction:.3,turns:3},{kind:'limit-fill',amount:95}]);
  const before=JSON.stringify(skill);
  const member=level=>({skills:[{id:skill.id,level}],stats:{attack:1,magic:1,defense:1,hp:1}});
  assert.deepEqual(skillForRun(skill,member(1)).allyEvents[0].effects,[{kind:'auto-revive',hpFraction:.3,turns:3},{kind:'limit-fill',amount:95}]);
  assert.deepEqual(skillForRun(skill,member(3)).allyEvents[0].effects,[{kind:'auto-revive',hpFraction:.5,turns:5},{kind:'limit-fill',amount:100}]);
  const capped=withEffects([{kind:'auto-revive',hpFraction:.95,turns:8}]);
  assert.deepEqual(skillForRun(capped,member(3)).allyEvents[0].effects,[{kind:'auto-revive',hpFraction:1,turns:9}]);
  for(const level of [1,2,3])reviewedSkillEvents(skillForRun(skill,member(level)));
  assert.equal(JSON.stringify(skill),before);
});
