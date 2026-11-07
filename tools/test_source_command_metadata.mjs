import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceCommandMetadata} from './lib/source-command-metadata.mjs';

test('original command parameters are retained separately from reviewed gameplay', () => {
  const skill={ffbeId:229751,scenePresentation:'aerith_seal_evil',mpCost:12,damageMultiplier:1,
    reviewNote:'Reviewed weakness and phase durations, not the original stat formula'};
  const source={kind:'ABILITY',id:229751,raw:{cost:48,processId:'24@6@88',processParam:'0,0,0,-60,3,1@0,0,0,30,0,0,0,0,1@30,1'}};
  const original=structuredClone(source), origin={file:'source.db',sha256:'a'.repeat(64)};
  const result=sourceCommandMetadata(skill,source,origin);
  assert.equal(result.originalCommand.raw.cost,48);assert.equal(skill.mpCost,12);
  assert.deepEqual(result.originalCommand.raw,original.raw);
  assert.deepEqual(result.originalCommand.database,{path:'source.db',sha256:origin.sha256});
  result.originalCommand.raw.cost=999;
  assert.deepEqual(source,original);assert.equal(result.gameplayReview.policy,'reviewed-roguelike');
  assert.deepEqual(sourceCommandMetadata({},undefined,undefined),{});
  assert.throws(()=>sourceCommandMetadata(skill,{...source,id:0},origin));
  assert.throws(()=>sourceCommandMetadata(skill,source,{path:'source.db',sha256:'unverified'}));
});
