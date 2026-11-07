import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyHeroBuffs,heroPhysicalMultiplier} from '../src/effects/heroBuffs.mjs';
import {reviewedSkillEvents,skillDamageType} from '../src/effects/skillDamageTimeline.mjs';
import {scenePresentationMembers} from '../src/effects/PreparedSceneBridge.mjs';

test('friendly boosts refresh strongest, affect three future rounds and never stack',()=>{
  let buffs=applyHeroBuffs([],[{kind:'physical-boost',turns:3,multiplier:1.5}],1);
  for(const round of [1,2,3,4])assert.equal(heroPhysicalMultiplier(buffs,round),1.5);
  assert.equal(heroPhysicalMultiplier(buffs,5),1);
  buffs=applyHeroBuffs(buffs,[{kind:'physical-boost',turns:3,multiplier:1.25}],3);
  assert.equal(buffs.length,1);assert.equal(heroPhysicalMultiplier(buffs,6),1.5);
  assert.equal(heroPhysicalMultiplier(buffs,7),1);
});

test('reviewed physical damage can use a magic body pose without changing old default lanes',()=>{
  assert.equal(skillDamageType({motion:'magic_atk',damageType:'physical'}),'physical');
  assert.equal(skillDamageType({motion:'atk',damageType:'holy'}),'holy');
  assert.equal(skillDamageType({motion:'magic_atk'}),'holy');
  assert.equal(skillDamageType({motion:'atk'}),'physical');
  assert.throws(()=>skillDamageType({motion:'atk',damageType:'unknown'}));
});

test('friendly cardinality reuses the geometry player without enemy allegiance or duplicate actors',()=>{
  const plan={presentation:{scope:'self'},members:[{anchor:'target',effect:0}]};
  assert.deepEqual(scenePresentationMembers(plan,['caster']),plan.members);
  assert.throws(()=>scenePresentationMembers(plan,['first','second']));
  assert.equal(scenePresentationMembers({...plan,presentation:{scope:'all_enemies'}},['first','second']).length,2);
});

test('published self event is non-damaging and rejects other scopes, mixed tracks and malformed buffs',()=>{
  const skill=JSON.parse(fs.readFileSync('public/assets/units/cloud/skills.json')).skills.find(s=>s.id==='trigger_smash');
  assert.equal(skill.hitCount,0);assert.equal(skill.originalCommand.raw.processParam,'507650,1,4:4');
  assert.equal(skill.originalCommand.references[0].raw.processId,'111@3@89');
  assert.equal(reviewedSkillEvents(skill,287)[0].frame,120);
  for(const change of [s=>s.scope='party',s=>s.moveType='dash',s=>s.allyEvents[0].effects[0].turns=0,
    s=>s.allyEvents[0].effects[0].multiplier=NaN,s=>s.damageEvents=[{frame:120,weight:1}],s=>s.allyEvents[0].frame=287]){
    const next=structuredClone(skill);change(next);assert.throws(()=>reviewedSkillEvents(next,287));
  }
});
