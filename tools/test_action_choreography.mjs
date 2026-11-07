import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateActionChoreography} from '../src/effects/actionChoreography.mjs';
import {inspectCharacter} from './lib/character-pipeline.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));

test('command pose is independently reviewed and does not select the executed body or add a readiness cycle',()=>{
 const s=structuredClone(read('public/assets/units/cloud/skills.json').skills[0]);
 s.moveType='stationary';delete s.originalCommand;
 s.actionChoreography={schema:'source-action-v1',movement:'stationary',travelTiming:'prepared',
  readiness:'none',commandPose:'standby',body:{mode:'clips',phases:[{frame:0,clip:'magic_atk'}]},
  review:{basis:'reviewed-adaptation',sourceMotionType:2,sourceMoveType:4,note:'Native selection and explicit command contract fixture'}};
 const frames={frames:[{durationMs:100}]},animations={standby:frames,magic_atk:frames};
 const c=validateActionChoreography(s,100,animations);
 assert.equal(c.readiness,'none');assert.equal(c.body.phases[0].clip,'magic_atk');
 assert.throws(()=>validateActionChoreography(s,100,{magic_atk:frames}),/command pose/);
 s.actionChoreography.commandPose='automatic';assert.throws(()=>validateActionChoreography(s),/command pose/);
});

test('VFX and hit support alone cannot authorize an implicit standard attack',()=>{
 const skill=read('public/assets/units/cloud_ac/skills.json').skills[0];
 assert.equal(validateActionChoreography(skill).body.mode,'rest');
 for(const mutate of [s=>delete s.actionChoreography,s=>s.actionChoreography.review.sourceMotionType=1,
  s=>s.actionChoreography.body={mode:'automatic'},s=>s.actionChoreography.movement='unknown']){
  const bad=structuredClone(skill);mutate(bad);assert.throws(()=>validateActionChoreography(bad));
 }
 const recipe=read('tools/characters/cloud_ac.json');delete recipe.skills[0].actionChoreography;
 const report=inspectCharacter(recipe,{assets:'assets',dump:'ffbe_asset_dump-main'});
 assert.equal(report.publishable,false);assert.ok(report.selected[0].issues.some(x=>x.includes('choreography')));
});

test('accepted body clips are explicit and missing/overlapping phase clips are blocked',()=>{
 for(const unit of ['cloud','aerith','cloud_of_darkness']){
  const body=read(`public/assets/units/${unit}/manifest.json`);
  for(const skill of read(`public/assets/units/${unit}/skills.json`).skills.filter(s=>s.scenePresentation)){
   const c=validateActionChoreography(skill,Infinity,body.animations);
   assert.deepEqual(c.body,{mode:'clips',phases:[{frame:0,clip:skill.motion}]});
  }
 }
 const skill=read('public/assets/units/cloud/skills.json').skills[0],body=read('public/assets/units/cloud/manifest.json');
 const bad=structuredClone(skill);bad.actionChoreography.body.phases.push({frame:1,clip:'atk'});
 assert.throws(()=>validateActionChoreography(bad,Infinity,body.animations),/overlapping/);
 assert.throws(()=>validateActionChoreography(skill,Infinity,{}),/Missing/);
});
