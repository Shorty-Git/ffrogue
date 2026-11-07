import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveEnemyInstant} from '../src/effects/enemyInstant.mjs';
import {reviewedSkillEvents} from '../src/effects/skillDamageTimeline.mjs';
import {statusDamageMultiplier} from '../src/effects/enemyStatus.mjs';
const effect={kind:'execute-or-damage',chance:.3,fallbackDamage:700,bossImmune:true};
const target={currentHp:10000,isBoss:false};
test('instant outcomes preserve explicit fallback, immunity and random ownership',()=>{
 let calls=0;const rng=()=>{calls++;return .29;};
 assert.deepEqual(resolveEnemyInstant(effect,target,rng),{amount:10000,executed:true,immune:false});assert.equal(calls,1);
 assert.equal(resolveEnemyInstant(effect,target,()=>.3).amount,700);
 const noRandom=()=>{throw Error('Unexpected random consumption');};
 assert.deepEqual(resolveEnemyInstant(effect,{...target,isBoss:true},noRandom),{amount:700,executed:false,immune:true});
 assert.equal(resolveEnemyInstant(effect,{...target,currentHp:0},noRandom).amount,0);
 assert.equal(resolveEnemyInstant({...effect,chance:1},target,noRandom).amount,10000);
 assert.equal(resolveEnemyInstant({...effect,chance:0},target,noRandom).amount,700);
 assert.equal(statusDamageMultiplier([{kind:'physical-weakness',multiplier:3},{kind:'magic-weakness',multiplier:3}],'unmitigated'),1);
});
test('instant timeline is explicit and fails closed on invalid or ambiguous damage',()=>{
 const skill={requiresSourceScene:true,scenePresentation:'fixture',scope:'all_enemies',hitCount:1,supportEvents:[{frame:45,effects:[effect]}]};
 assert.deepEqual(reviewedSkillEvents(skill,100),skill.supportEvents);
 for(const mutate of [s=>s.supportEvents[0].effects[0].chance=NaN,s=>s.supportEvents[0].effects[0].fallbackDamage=0,
  s=>delete s.supportEvents[0].effects[0].bossImmune,s=>s.supportEvents[0].frame=100,
  s=>s.damageEvents=[{frame:45,weight:1}],s=>s.supportEvents[0].effects.push({kind:'stop',chance:1,phases:1})]){
  const invalid=structuredClone(skill);mutate(invalid);assert.throws(()=>reviewedSkillEvents(invalid,100));
 }
});
