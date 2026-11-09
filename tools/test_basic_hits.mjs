// Original basic-attack hit frames (unit row attackFrames) reach every published character.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sourceBasicHits } from './lib/character-pipeline.mjs';

const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const clip = ms => ({ frames: [{ durationMs: ms }] });

test('unit attackFrames become hit frames with damage shares on the attack clip clock', () => {
  assert.deepEqual(sourceBasicHits('75:100:3:2', clip(2000)), [{ frame: 75, weight: 1 }]);
  assert.deepEqual(sourceBasicHits('15:60:3:2-36:40:3:2', clip(2000)), [{ frame: 15, weight: .6 }, { frame: 36, weight: .4 }]);
  // Hits after the published clip ends, empty and malformed rows keep the runtime's old hit frame.
  assert.equal(sourceBasicHits('150:100:3:2', clip(2000)), null);
  for (const raw of [undefined, '', 'x:100', '10:0:3:2']) assert.equal(sourceBasicHits(raw, clip(2000)), null);
});

test('every published character carries source hit frames inside its attack clip', () => {
  for (const key of read('public/assets/content.json').characters) {
    const character = read(`public/assets/units/${key}/character.json`), body = read(`public/assets/units/${key}/manifest.json`);
    const hits = character.battle.hitFrames, clipMs = body.animations[character.battle.attackAnim].frames.reduce((s, f) => s + f.durationMs, 0);
    assert.ok(hits?.length, `${key} has no source hit frames`);
    assert.ok(Math.abs(hits.reduce((s, h) => s + h.weight, 0) - 1) < .01, `${key} hit shares do not sum to 1`);
    assert.ok(hits.every(h => h.frame * 1000 / 60 <= clipMs), `${key} hit after its attack clip`);
  }
});
