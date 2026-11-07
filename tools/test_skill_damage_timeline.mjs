import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateDamageEvents} from '../src/effects/skillDamageTimeline.mjs';
import {sourceDamageEvents} from './lib/source-damage-events.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));
test('published Source events derive from complete Motion-1 timing and normalized source weights',()=>{
 const skill=read('public/assets/units/cloud/skills.json').skills.find(s=>s.ffbeId===214790);
 const manifest=read(`public/assets/presentations/${skill.scenePresentation}/manifest.json`);
 const plan=manifest.plan,source={id:skill.ffbeId,raw:{motionType:1,effectFrames:plan.composition.skill.effectFrames,
  attackFrames:plan.sourceHits.map(h=>`${h.frame}:${h.weight}:2:2`).join('-')}};
 assert.deepEqual(skill.damageEvents,sourceDamageEvents(source,plan));
 assert.throws(()=>sourceDamageEvents(source,plan,{...plan.composition.unit,effectFrames:'5:1000290:1'}));
 assert.deepEqual(skill.damageEvents.map(e=>e.frame),[6,32,62,92,122]);
 assert.deepEqual(skill.damageEvents.map(e=>e.weight),[.1,.1,.1,.1,.6]);
 validateDamageEvents(skill,manifest.durationFrames);
 for(const bad of [{...source,raw:{...source.raw,motionType:2}},{...source,raw:{...source.raw,attackFrames:'4:99:2:2'}}])
  assert.throws(()=>sourceDamageEvents(bad,plan));
});

test('zero-prefix Motion-2 damage retains raw markers and rejects mismatched compositions',()=>{
 const source={id:123,raw:{motionType:2,effectFrames:'4:42:1:1:0',attackFrames:'6:40:2:2-12:60:2:2'}};
 const unit={unitId:456,effectFrames:'80:7:1'};
 const plan={composition:{unit,skill:{abilityId:123,motionType:2,effectFrames:source.raw.effectFrames},
  effectFrames:source.raw.effectFrames,skillFrameOffset:0},sourceHits:[{frame:6,weight:40},{frame:12,weight:60}]};
 assert.deepEqual(sourceDamageEvents(source,plan),[{frame:6,weight:.4},{frame:12,weight:.6}]);
 const withoutUnitEffects=structuredClone(plan);withoutUnitEffects.composition.unit.effectFrames=null;
 assert.deepEqual(sourceDamageEvents(source,withoutUnitEffects),sourceDamageEvents(source,plan),'Motion 2 must not require unused unit effects');
 for(const mutate of [p=>p.composition.skillFrameOffset=80,p=>p.composition.skill.motionType=1,
  p=>p.composition.skill.abilityId=124,p=>p.composition.effectFrames='80:7:1&84:42:1:1:0',
  p=>p.sourceHits.pop()]){const bad=structuredClone(plan);mutate(bad);assert.throws(()=>sourceDamageEvents(source,bad));}
 assert.throws(()=>sourceDamageEvents({...source,raw:{...source.raw,motionType:99}},plan));
 assert.throws(()=>sourceDamageEvents({...source,raw:{...source.raw,attackFrames:'6:100::'}},plan));
 assert.throws(()=>sourceDamageEvents(source,plan,{...unit,unitId:789}));
});
test('unsupported or incomplete event timelines cannot become silent single-hit actions',()=>{
 const valid={requiresSourceScene:true,scenePresentation:'test',scope:'all_enemies',damageEvents:[{frame:1,weight:.4},{frame:4,weight:.6}]};
 validateDamageEvents(valid,5);assert.equal(validateDamageEvents({}),null);
 for(const mutation of [x=>x.damageEvents=[],x=>x.requiresSourceScene=false,x=>x.damageEvents[1].frame=0,
  x=>x.damageEvents[1].weight=0,x=>x.damageEvents[1].frame=5,x=>x.damageEvents[0].weight=.1]){
  const bad=structuredClone(valid);mutation(bad);assert.throws(()=>validateDamageEvents(bad,5));
 }
});
