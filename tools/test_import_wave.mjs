import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {inspectCharacter,readJson} from './lib/character-pipeline.mjs';
import {sourceDamageEvents} from './lib/source-damage-events.mjs';
import {validateActionChoreography} from '../src/effects/actionChoreography.mjs';

for(const unit of ['delita','jack'])test(unit+': complete reviewed body, source prefix and gameplay use the common importer',()=>{
 const recipe=readJson(`tools/characters/${unit}.json`),report=inspectCharacter(recipe,{assets:'assets',dump:'ffbe_asset_dump-main'});
 assert.equal(report.publishable,true,JSON.stringify(report.selected));
 const skill=readJson(`public/assets/units/${unit}/skills.json`).skills[0],body=readJson(`public/assets/units/${unit}/manifest.json`);
 const manifest=readJson(`public/assets/presentations/${skill.scenePresentation}/manifest.json`),source=report.catalog.find(s=>s.id===skill.ffbeId);
 const c=validateActionChoreography(skill,manifest.durationFrames,body.animations);
 assert.equal(c.review.basis,'reviewed-adaptation');assert.equal(c.body.phases[0].clip,'atk');
 assert.deepEqual(sourceDamageEvents(source,manifest.plan),skill.damageEvents);
 assert.equal(skill.supportEvents[0].frame,skill.damageEvents[0].frame);
 assert.equal(manifest.plan.members.filter(m=>m.compositionOrigin==='unit-attack').length,report.basicAttackRaw.effects.split('&').length);
 assert.deepEqual(skill.originalCommand.raw,JSON.parse(JSON.stringify(source.raw)));
 const wrong=structuredClone(recipe);delete wrong.skills[0].actionChoreography;
 assert.equal(inspectCharacter(wrong,{assets:'assets',dump:'ffbe_asset_dump-main'}).publishable,false);
});

test('batch intake composes exact form prefixes before resource staging without granting approval',()=>{
 const output='tools/data/import-wave-20261101/composed-batch-test';
 const result=spawnSync(process.execPath,['tools/plan_source_imports.mjs','--select','delita:202180,jack:203050,cloud_ac:233931','--compose-unit-effects','--output',output],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const selection=readJson(output+'/selection.json');assert.equal(selection.playableApproval,false);
 for(const item of selection.selection){
  if(item.sourceId===233931){assert.ok(item.intakeBlockers.length>0);continue;}
  const composed=readJson(item.report),skill=composed.catalog[0],recipe=readJson(`tools/characters/${item.character}.json`);
  const runtime=readJson(`public/assets/presentations/${recipe.skills[0].scenePresentation}/manifest.json`).plan;
  assert.equal(skill.composition.effectFrames,runtime.composition.effectFrames);
  assert.equal(skill.composition.skillFrameOffset,runtime.composition.skillFrameOffset);
  assert.equal(skill.effects[0].groups.filter(g=>g.compositionOrigin==='unit-attack').length,composed.basicAttackRaw.effects.split('&').length);
  assert.ok(fs.existsSync(item.report));
 }
});
