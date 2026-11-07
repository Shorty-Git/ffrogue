import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyEnemyStatuses,statusDamageMultiplier,isEnemyActionBlocked,ageEnemyStatuses} from '../src/effects/enemyStatus.mjs';
import {reviewedSkillEvents} from '../src/effects/skillDamageTimeline.mjs';
import {sourceAudioPlan} from './lib/source-audio-events.mjs';
import {admitSourceAudio} from './lib/admit-source-audio.mjs';

test('reviewed enemy support is non-damaging, finite and rejects unsupported or inconsistent damage tracks',()=>{
 const skill=JSON.parse(fs.readFileSync('public/assets/units/aerith/skills.json')).skills.find(s=>s.id==='seal_evil');
 assert.equal(skill.hitCount,0);assert.equal(skill.damageEvents,undefined);assert.equal(reviewedSkillEvents(skill,286)[0].frame,80);
 for(const mutate of [s=>s.supportEvents=[],s=>s.supportEvents[0].effects[0].phases=0,
  s=>s.supportEvents[0].effects[0].kind='unknown',s=>s.supportEvents[0].effects[1].chance=2,
  s=>s.damageEvents=[{frame:80,weight:1}]]){const bad=structuredClone(skill);mutate(bad);assert.throws(()=>reviewedSkillEvents(bad,286));}
});
test('statuses refresh strongest without stacking and expire on enemy action phases',()=>{
 const weak={kind:'magic-weakness',multiplier:1.25,phases:3,chance:1};
 let statuses=applyEnemyStatuses([], [weak,{kind:'stop',phases:1,chance:.3},{kind:'silence',phases:3,chance:.3}],()=>0);
 assert.equal(statusDamageMultiplier(statuses,'holy'),1.25);assert.equal(statusDamageMultiplier(statuses,'physical'),1);
 assert.equal(isEnemyActionBlocked(statuses,'physical'),true);statuses=ageEnemyStatuses(statuses);
 assert.equal(isEnemyActionBlocked(statuses,'physical'),false);assert.equal(isEnemyActionBlocked(statuses,'magic'),true);
 statuses=applyEnemyStatuses(statuses,[weak],()=>1);assert.equal(statusDamageMultiplier(statuses,'holy'),1.25);
 for(let i=0;i<3;i++)statuses=ageEnemyStatuses(statuses);assert.deepEqual(statuses,[]);
 assert.deepEqual(applyEnemyStatuses([], [{kind:'stop',phases:1,chance:.3}],()=>.9),[]);
});
test('audio records preserve separate cue times and opaque parameters, with no guessed resource',()=>{
 const plan=sourceAudioPlan([{group:7,frame:4,soundsRaw:'0:59:1,15:59:1'},{group:8,frame:60,soundsRaw:'1:100:1'}]);
 assert.deepEqual(plan.events.map(e=>[e.frame,e.sourceSoundId,e.resource]),[[4,59,null],[19,59,null],[61,100,null]]);
 assert.equal(plan.playbackSupported,false);assert.equal(plan.bus,'skill-sfx');assert.equal(plan.coverage,'legacy-partial-groups');
 assert.equal(sourceAudioPlan([{group:1,frame:0,soundsRaw:'unverified'}]).issues.length,1);
});
test('reviewed audio is reproducible and rejects changes to timing or Source identity',()=>{
 const review=JSON.parse(fs.readFileSync('tools/presentations/source-audio-review.json'));
 for(const key of Object.keys(review.presentations)){
  const manifest=JSON.parse(fs.readFileSync('public/assets/presentations/'+key+'/manifest.json'));
  const published=manifest.audioSource;
  const prepare=()=>({...manifest,audioSource:sourceAudioPlan(published.sourceGroups,published.coverage)});
  const regenerated=prepare();
  admitSourceAudio(regenerated);
  assert.deepEqual(regenerated.audioSource,published,key);
  assert.throws(()=>admitSourceAudio({...prepare(),sourceId:0}),/does not match/);
  assert.throws(()=>admitSourceAudio({...prepare(),durationFrames:1}),/Unsupported Source audio/);
  const changed=prepare();
  changed.audioSource.sourceGroups=changed.audioSource.sourceGroups.map(group=>({...group,frame:group.frame+1}));
  assert.throws(()=>admitSourceAudio(changed),/does not match/);
  if(review.presentations[key].sourceGroups){
   const legacy={...manifest,audioSource:sourceAudioPlan()};
   admitSourceAudio(legacy);
   assert.deepEqual(legacy.audioSource,published,key);
   const drift={...prepare(),plan:{...manifest.plan,members:manifest.plan.members.slice(1)}};
   assert.throws(()=>admitSourceAudio(drift),/visual clock does not match/);
  }
 }
});
