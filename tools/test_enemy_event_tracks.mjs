import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewedSkillEvents} from '../src/effects/skillDamageTimeline.mjs';
import {applyEnemyStatuses,statusDamageMultiplier,enemyAttackMultiplier,ageEnemyStatuses} from '../src/effects/enemyStatus.mjs';
import {partyReserve} from '../src/data/partyReserve.mjs';
import {inspectCharacter,readJson} from './lib/character-pipeline.mjs';
import {spawnSync} from 'node:child_process';

test('mixed tracks preserve all events with damage before support at the same frame',()=>{
 const skill=readJson('public/assets/units/cloud_of_darkness/skills.json').skills.find(s=>s.id==='armor_break');
 const events=reviewedSkillEvents(skill,255);
 assert.equal(events.length,2);assert.equal(events[0].weight,1);assert.equal(events[1].effects[0].kind,'physical-weakness');
 assert.deepEqual(events.map(e=>e.frame),[113,113]);
 const invalid=structuredClone(skill);invalid.supportEvents[0].effects[0].multiplier=0;assert.throws(()=>reviewedSkillEvents(invalid));
 const later=structuredClone(skill);later.damageEvents=[{frame:113,weight:.5},{frame:180,weight:.5}];later.hitCount=2;
 assert.deepEqual(reviewedSkillEvents(later).map(e=>[e.frame,!!e.effects]),[[113,false],[113,true],[180,false]]);
});
test('physical vulnerability and attack reduction refresh strongest without stacking and expire',()=>{
 const down={kind:'attack-down',multiplier:.8,phases:3,chance:1};
 let states=applyEnemyStatuses([],[down,{kind:'physical-weakness',multiplier:1.15,phases:3,chance:1}]);
 states=applyEnemyStatuses(states,[{...down,multiplier:.9},{...down,multiplier:.7}]);
 assert.equal(enemyAttackMultiplier(states),.7);assert.equal(statusDamageMultiplier(states,'physical'),1.15);
 assert.equal(statusDamageMultiplier(states,'holy'),1);
 for(let i=0;i<3;i++)states=ageEnemyStatuses(states);
 assert.equal(enemyAttackMultiplier(states),1);assert.equal(statusDamageMultiplier(states,'physical'),1);
});
test('reserve selection preserves the default party and rejects unregistered or duplicate heroes',()=>{
 const registered=['cloud','aerith','barret','cloud_of_darkness'];
 assert.equal(partyReserve(registered,null),'barret');assert.equal(partyReserve(registered,'cloud_of_darkness'),'cloud_of_darkness');
 for(const key of ['cloud','aerith','missing','../barret'])assert.throws(()=>partyReserve(registered,key));
});
test('new Source commands retain exact learned identities and complete source membership',()=>{
 const report=inspectCharacter(readJson('tools/characters/cloud_of_darkness.json'),{});
 assert.equal(report.publishable,true);assert.equal(report.selected.length,6);
 for(const s of report.selected)assert.deepEqual(s.issues,[]);
 for(const key of ['cod_armor_break','cod_aura_ball']){
  const m=readJson('public/assets/presentations/'+key+'/manifest.json');
  assert.equal(m.plan.members.length,key==='cod_armor_break'?2:1);assert.equal(m.plan.effects.some(e=>e.nodes.some(n=>![0,2,3,6].includes(n.typeId))),false);
 }
});
test('wildcard intake selects every actual owned active command once, without granting publication',()=>{
 const destination='tools/data/skill-seven-eight-20261028/wildcard-test';
 const result=spawnSync(process.execPath,['tools/plan_source_imports.mjs','--select','cloud_of_darkness:*,cloud_of_darkness:201150','--output',destination],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const report=readJson(destination+'/cloud_of_darkness-inspection.json'),selection=readJson(destination+'/selection.json');
 assert.equal(selection.playableApproval,false);
 assert.deepEqual(selection.selection.map(s=>[s.kind,s.sourceId]),report.catalog.filter(s=>!s.passive&&s.kind!=='LIMIT').map(s=>[s.kind,s.id]));
 assert.equal(selection.selection.length,11);
});
