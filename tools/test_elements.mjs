// Element rules (src/run/elementRules.mjs): original resistances scale damage in both directions.
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseElementFlags,skillElements,elementMultiplier,enemyElementMultiplier,heroElementMultiplier,elementTag,enemyAffinities,ELEMENT_MIN,ELEMENT_MAX,heroAttackElements} from '../src/run/elementRules.mjs';
import {ENEMY_CONTENT,enemyAction} from '../src/run/stageContent.mjs';
import {ENEMY_ELEMENT_RESIST} from '../src/run/elements.mjs';

test('FFBE flag strings map to elements in FFBE order; only the first @ branch counts', () => {
  assert.deepEqual(parseElementFlags('1,0,0,0,0,0,0,0'), ['fire']);
  assert.deepEqual(parseElementFlags('0,0,1,0,0,0,1,0'), ['lightning', 'light']);
  assert.deepEqual(parseElementFlags('0,0,0,0,0,0,0,1@1,0,0,0,0,0,0,0'), ['dark']);
  assert.deepEqual(parseElementFlags('0,0,0,0,0,0,0,0'), []);
  assert.deepEqual(parseElementFlags(undefined), []);
  assert.deepEqual(skillElements({originalCommand: {raw: {element: '0,1,0,0,0,0,0,0'}}}), ['ice']);
});

test('resistance r scales damage by 1 - r/100, held to the reviewed range; absorb is a strong resist', () => {
  assert.equal(elementMultiplier(['fire'], {fire: -50}), 1.5);
  assert.equal(elementMultiplier(['fire'], {fire: 50}), .5);
  assert.equal(elementMultiplier(['ice'], {ice: 250}), ELEMENT_MIN, 'absorb never heals');
  assert.equal(elementMultiplier(['ice'], {ice: -300}), ELEMENT_MAX);
  assert.equal(elementMultiplier([], {fire: -50}), 1);
  assert.equal(elementMultiplier(['wind'], {fire: -50}), 1);
  assert.equal(elementMultiplier(['fire', 'water'], {fire: -50, water: 50}), 1, 'several elements average');
});

test('enemy and hero tables come from the published original data', () => {
  assert.equal(enemyElementMultiplier('sweeper', ['lightning']), 1.5);
  assert.equal(enemyElementMultiplier('leviathan', ['water']), ELEMENT_MIN);
  assert.equal(enemyElementMultiplier('sephiroth', ['dark']), ELEMENT_MIN === .25 ? .25 : 0, 'resist 100 holds at the floor');
  assert.equal(heroElementMultiplier('tidus', ['water']), ELEMENT_MIN);
  assert.equal(heroElementMultiplier('cloud', ['fire']), 1);
  assert.equal(elementTag(1.5), 'weak');
  assert.equal(elementTag(.5), 'resist');
  assert.equal(elementTag(1), null);
  assert.deepEqual(enemyAffinities('microchu'), {weak: ['fire', 'earth'], resist: ['water']});
  for (const key of Object.keys(ENEMY_ELEMENT_RESIST)) assert.ok(ENEMY_CONTENT[key], 'resistances only for published enemies: ' + key);
});

test('enemy actions carry the original element of imported skills only', () => {
  const sephiroth = Array.from({length: 18}, (_, i) => enemyAction(ENEMY_CONTENT.sephiroth, i, 1));
  assert.deepEqual(sephiroth.find(a => a.skill === 'heartless_angel')?.elements, ['dark']);
  const actions = Array.from({length: 8}, (_, i) => enemyAction(ENEMY_CONTENT.yin_yang, i, 1));
  assert.deepEqual(actions.find(a => a.skill === 'thundara')?.elements, ['lightning']);
  assert.ok([...sephiroth, ...actions].filter(a => !a.skill || a.skill === 'double_strike').every(a => !a.elements), 'basic and FFRogue actions have no element');
});

test('basic attacks take the weapon element only', () => {
  assert.deepEqual(heroAttackElements({}), []);
  assert.deepEqual(heroAttackElements({weapon: {elements: ['fire', 'bogus']}}), ['fire']);
});
