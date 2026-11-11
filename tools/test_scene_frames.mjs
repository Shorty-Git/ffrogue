import test from 'node:test';
import assert from 'node:assert/strict';
import {issueCauses, boxScore, verdict} from './lib/scene-frames.mjs';

const signature = value => Buffer.alloc(50 * 55, value).toString('base64');
const frame = (value, edges = {}, plane = null) => ({frame: 0, coverage: 0, plane, signature: signature(value),
  edges: {horizontal: 0, vertical: 0, longestHorizontal: 0, longestVertical: 0, total: 0, corners: 0, ...edges}});
const scene = (frames, errors = []) => ({key: 'x', durationFrames: 100, frames, errors});

test('issue causes drop instance detail and split compound eligibility reasons', () => {
  assert.deepEqual(issueCauses('fx_a: node 12 color selector unresolved; legacy preview tint retained'),
    ['node N color selector unresolved; legacy preview tint retained']);
  assert.deepEqual(issueCauses('fx_a: Particle 3 geometry unsupported: positive constant scale required on node 3; uniform ancestor scale required on node 1; positive constant scale required on node 1; legacy geometry retained only for comparison'),
    ['Particle geometry unsupported: positive constant scale required', 'Particle geometry unsupported: uniform ancestor scale required']);
  assert.deepEqual(issueCauses('fx_b: nonzero source member fields 4, 5 retained but not evaluated; placement remains an adaptation'),
    ['nonzero source member fields N… retained but not evaluated; placement remains an adaptation']);
});

test('box score ranks rectangle corners above plain straight edges', () => {
  const streaks = boxScore(scene([frame(5, {longestVertical: 200, total: 900})]));
  const box = boxScore(scene([frame(5, {horizontal: 2, vertical: 2, longestHorizontal: 60, longestVertical: 60, total: 240, corners: 4})]));
  assert.equal(streaks.cornerFrames, 0);
  assert.ok(box.score > streaks.score);
  assert.equal(boxScore(scene([frame(0)])).score, 0);
  // Many runs in one frame are a texture pattern: chance corners there do not make a box.
  const pattern = boxScore(scene([frame(5, {horizontal: 180, vertical: 130, longestHorizontal: 500, longestVertical: 90, total: 9000, corners: 60})]));
  assert.equal(pattern.cornerFrames, 0);
  assert.equal(pattern.patternFrames, 1);
  assert.ok(box.score > pattern.score);
  // A plane that fills the whole clip is a screen layer, not a finding.
  assert.equal(boxScore(scene([frame(9, {}, {whole: true, fill: 1, share: .9, box: {}})])).plane, 0);
});

test('re-baseline verdicts: unchanged, ok, review', () => {
  const before = scene([frame(10), frame(10)]);
  assert.equal(verdict(before, scene([frame(10), frame(10)])).verdict, 'unchanged');
  assert.equal(verdict(before, scene([frame(14), frame(12)])).verdict, 'ok');
  assert.equal(verdict(before, scene([frame(2), frame(2)])).verdict, 'review', 'lost picture');
  assert.equal(verdict(before, scene([frame(10, {corners: 3, longestHorizontal: 40, longestVertical: 40}), frame(10)])).verdict, 'review', 'new corners');
  assert.equal(verdict(before, scene([frame(10), frame(10)], ['Scene bridge error'])).verdict, 'review', 'new error');
  assert.equal(verdict(null, before).verdict, 'new');
  // Fewer corners than before is an improvement, not a review case.
  const boxed = scene([frame(10, {corners: 4, longestHorizontal: 40, longestVertical: 40}), frame(10)]);
  assert.equal(verdict(boxed, scene([frame(9), frame(10)])).verdict, 'ok');
});
