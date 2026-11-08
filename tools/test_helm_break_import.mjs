import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectCharacter} from './lib/character-pipeline.mjs';
import {sourceDamageEvents} from './lib/source-damage-events.mjs';
import {validateActionChoreography} from '../src/effects/actionChoreography.mjs';

const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));

test('Helm Break imports the whole original composition with separate reviewed gameplay', () => {
  const recipe = read('tools/characters/delita.json');
  const report = inspectCharacter(recipe, {assets: 'rawdata/assets', dump: 'rawdata/ffbe_asset_dump'});
  assert.equal(report.publishable, true);
  const skill = read('public/assets/units/delita/skills.json').skills.find(s => s.ffbeId === 202190);
  const manifest = read(`public/assets/presentations/${skill.scenePresentation}/manifest.json`);
  const source = report.catalog.find(s => s.id === 202190);
  const body = read('public/assets/units/delita/manifest.json');
  assert.deepEqual(skill.originalCommand.raw, JSON.parse(JSON.stringify(source.raw)));
  assert.equal(source.raw.processParam, '0,0,0,0,0,0,7000,0@0,0,0,-60,5,1');
  assert.deepEqual(sourceDamageEvents(source, manifest.plan), [{frame: 80, weight: 1}]);
  assert.deepEqual(skill.damageEvents, [{frame: 80, weight: 1}]);
  assert.deepEqual(skill.supportEvents, [{frame: 80, effects: [
    {kind: 'magic-weakness', multiplier: 1.2, phases: 3, chance: 1},
  ]}]);
  const action = validateActionChoreography(skill, manifest.durationFrames, body.animations);
  assert.equal(action.review.basis, 'reviewed-adaptation');
  assert.equal(action.body.phases[0].clip, 'atk');
  assert.equal(manifest.plan.rectanglePlacement.coordinateSystem, 'ffbe-screen-api');
  assert.ok(manifest.plan.rectanglePlacement.coordinateReview.includes('No native Helm Break'));
  assert.equal(manifest.plan.effects.length, 2);
  assert.deepEqual(new Set(manifest.plan.effects.map(e => e.name)), new Set([
    'atk_slash1_orange.bmb', 'sp_20093_mentalbreak.bmb',
  ]));
  assert.ok(manifest.plan.members.some(m => m.compositionOrigin === 'unit-attack'));
  assert.equal(manifest.originalFidelityVerified, false);
  // Reject admission without either mandatory review, before runtime publication.
  const unresolved = structuredClone(recipe);
  delete unresolved.skills.find(s => s.ffbeId === 202190).actionChoreography;
  assert.equal(inspectCharacter(unresolved, {assets: 'rawdata/assets', dump: 'rawdata/ffbe_asset_dump'}).publishable, false);
});
