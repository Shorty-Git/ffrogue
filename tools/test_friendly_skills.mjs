import test from 'node:test';
import assert from 'node:assert/strict';
import {readJson,inspectCharacter} from './lib/character-pipeline.mjs';
import {reviewedSkillEvents} from '../src/effects/skillDamageTimeline.mjs';
import {scenePresentationAnchor,scenePresentationMembers} from '../src/effects/PreparedSceneBridge.mjs';
import {sourceDamageEvents} from './lib/source-damage-events.mjs';
const recipe=readJson('tools/characters/delita.json'),skills=readJson('public/assets/units/delita/skills.json').skills;

test('friendly event admission is explicit, finite, stationary and separate from enemy damage',()=>{
 const heal=skills.find(s=>s.id==='chant');assert.equal(reviewedSkillEvents(heal,222)[0].allyEffects[0].amount,1000);
 for(const mutate of [s=>s.allyTargeting=undefined,s=>s.hpCost=0,s=>s.hpCost=NaN,
  s=>s.allyEvents[0].effects[0].amount=-1,s=>s.allyEvents[0].effects[0].kind='revive',
  s=>s.allyEvents[0].frame=222,s=>s.scope='single_enemy',s=>s.scope='self',s=>s.moveType='dash']){
  const invalid=structuredClone(heal);mutate(invalid);assert.throws(()=>reviewedSkillEvents(invalid,222));
 }
 const invalid=structuredClone(heal);delete invalid.allyEvents;assert.throws(()=>reviewedSkillEvents(invalid));
});
test('friendly side and cardinality are host contracts; enemy placement remains unchanged',()=>{
 const member={effect:0,anchor:'target-group',placement:{rectangle:'target-side',axisModes:[2,2],offset:[0,240]}};
 const host={width:1000,height:1100,arena:{x:0,y:48,width:1000,height:720},caster:{x:830,y:640},
  targets:{ally:{x:750,y:500}},units:{ally:{frameWidth:100,frameHeight:100,pivotX:.5,pivotY:1,scale:1}}};
 const plan={members:[member,{...member,anchor:'target'}],presentation:{scope:'all_enemies'},rectanglePlacement:{unitsPerPixel:1,scatter:[0,0]}};
 const enemy=scenePresentationAnchor(member,host,plan),party=scenePresentationAnchor(member,host,{...plan,presentation:{scope:'party'}});
 assert.equal(party.x-enemy.x,500);assert.equal(party.y,enemy.y);assert.equal(party.unitsToPixels,enemy.unitsToPixels);
 assert.equal(scenePresentationMembers({...plan,presentation:{scope:'party'}},['a','b']).length,3);
 assert.equal(scenePresentationMembers(plan,['a','b']).length,3);
});
test('two existing-roster imports pass the same source, resource and mandatory choreography gates',()=>{
 const report=inspectCharacter(recipe,{assets:'rawdata/assets',dump:'rawdata/ffbe_asset_dump'});
 assert.equal(report.publishable,true,JSON.stringify(report.selected));
 const chant=skills.find(s=>s.id==='chant'),sword=skills.find(s=>s.id==='cunning_hero_sword');
 assert.equal(chant.originalCommand.raw.processId,'41@2');assert.equal(chant.gameplayReview.ownedFields.includes('hpCost'),true);
 assert.equal(sword.originalCommand.raw.cost,120);assert.equal(sword.mpCost,48);
 const manifest=readJson(`public/assets/presentations/${sword.scenePresentation}/manifest.json`);
 assert.deepEqual(sword.damageEvents,sourceDamageEvents(report.catalog.find(s=>s.id===sword.ffbeId),manifest.plan));
 assert.equal(sword.damageEvents.length,9);assert.equal(sword.scope,'all_enemies');assert.equal(sword.actionChoreography.body.mode,'rest');
 const bad=structuredClone(recipe);bad.skills.find(s=>s.id==='chant').friendlyTargetReview.sourceRange='1';
 assert.equal(inspectCharacter(bad,{assets:'rawdata/assets',dump:'rawdata/ffbe_asset_dump'}).publishable,false);
});
