// Barrage-type commands (process 42) repeat the basic attack; no scene is involved.
import test from 'node:test';
import assert from 'node:assert/strict';
import {basicRepeatFromSource, validateBasicRepeat} from '../src/effects/basicRepeat.mjs';

const entry = (over = {}) => ({execution: 'basic-attack-repeat', basicRepeat: {minHits: 4, maxHits: 4, targeting: 'random'}, scope: 'all_enemies',
  motion: 'atk', moveType: 'dash', damageMultiplier: 1, type: 'ABILITY', requiresSourceScene: false, ...over});

test('original process 42 rows map to hit ranges and targeting', () => {
  assert.deepEqual(basicRepeatFromSource({processId: '42', processParam: '0,0,4,4,1500,0', target: '1', targetRange: '3'}),
    {minHits: 4, maxHits: 4, power: 1500, targeting: 'random'});
  assert.deepEqual(basicRepeatFromSource({processId: '42', processParam: '0,0,1,6,100,0', target: '1', targetRange: '1'}),
    {minHits: 1, maxHits: 6, power: 100, targeting: 'target'});
  for (const raw of [{processId: '42@6', processParam: '0,0,3,3,10000,0@0', target: '1@1', targetRange: '1@1'},
    {processId: '42', processParam: '0,0,4,4,80,0', target: '2', targetRange: '3'}, {processId: '42', processParam: '0,0,5,2,80', target: '1', targetRange: '3'}])
    assert.equal(basicRepeatFromSource(raw), null);
});

test('reviewed entries stay scene-free dash attacks with a matching scope', () => {
  assert.deepEqual(validateBasicRepeat(entry()), {minHits: 4, maxHits: 4, targeting: 'random'});
  assert.equal(validateBasicRepeat(entry({basicRepeat: {minHits: 2, maxHits: 2, targeting: 'target'}, scope: 'single_enemy'})).targeting, 'target');
  for (const bad of [entry({scenePresentation: 'x'}), entry({scope: 'single_enemy'}), entry({moveType: 'stationary'}), entry({damageMultiplier: 0}),
    entry({type: 'LIMIT'}), entry({basicRepeat: {minHits: 0, maxHits: 2, targeting: 'random'}}), entry({execution: 'prepared-source'})])
    assert.throws(() => validateBasicRepeat(bad));
});
