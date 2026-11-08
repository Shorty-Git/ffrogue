import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {inspectCharacter,readJson} from './lib/character-pipeline.mjs';
import {sourceDamageEvents} from './lib/source-damage-events.mjs';
import {validateSceneAction} from '../src/effects/sceneProfile.mjs';

test('new zero-prefix command passes the same importer with exact source timing and separate balance',()=>{
 const recipe=readJson('tools/characters/cloud_ac.json'),report=inspectCharacter(recipe,{assets:'rawdata/assets',dump:'rawdata/ffbe_asset_dump'});
 assert.equal(report.publishable,true,JSON.stringify(report.selected));
 const skill=readJson('public/assets/units/cloud_ac/skills.json').skills[0];
 const manifest=readJson(`public/assets/presentations/${skill.scenePresentation}/manifest.json`);
 validateSceneAction(manifest,skill);
 const original=report.catalog.find(s=>s.id===skill.ffbeId);
 assert.deepEqual(sourceDamageEvents(original,manifest.plan),skill.damageEvents);
 assert.deepEqual(skill.originalCommand.raw,JSON.parse(JSON.stringify(original.raw)));
 assert.equal(original.raw.processParam,'0,0,0,0,0,0,450,0@0,-60,0,0,5,1');
 assert.equal(skill.supportEvents[0].effects[0].multiplier,1.2);
 assert.equal(manifest.plan.composition.skillFrameOffset,0);
 assert.equal(manifest.plan.effects.length,2);
 assert.equal(manifest.plan.members.length,2);
 assert.equal(manifest.audioSource.events.length,2);
 assert.equal(manifest.originalFidelityVerified,false);
 for(const effect of manifest.plan.effects)for(const url of Object.values(effect.textures))
  assert.equal(createHash('sha256').update(fs.readFileSync('public'+url)).digest('hex'),url.match(/([a-f0-9]{64})\.png$/)[1]);
 const wrong=structuredClone(recipe);wrong.skills[0].damageEvents[0].frame++;
 assert.equal(inspectCharacter(wrong,{assets:'rawdata/assets',dump:'rawdata/ffbe_asset_dump'}).publishable,false);
});

test('census shortlisting excludes current publication and never grants import approval',()=>{
 const output='tools/data/braver-20261101/shortlist-test';
 const result=spawnSync(process.execPath,['tools/plan_source_imports.mjs','--shortlist-catalog',
  'tools/data/source-only-20261028/catalog/inventory.json','--output',output],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const shortlist=readJson(output+'/candidate-shortlist.json');
 assert.ok(shortlist.candidates.length>0);
 assert.ok(shortlist.candidates.every(c=>c.playableApproval===false&&c.status==='resource-name-overlap-only'));
 assert.ok(!shortlist.candidates.some(c=>c.sourceId===233930),'Old census must not reoffer newly published Braver');
 const rejected=spawnSync(process.execPath,['tools/plan_source_imports.mjs','--shortlist-catalog',
  'tools/data/source-only-20261028/catalog/inventory.json','--select','cloud_ac:*','--output',output],{encoding:'utf8'});
 assert.notEqual(rejected.status,0);
});
