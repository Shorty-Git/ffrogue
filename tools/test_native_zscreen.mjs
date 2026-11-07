import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {zScreenLocatorMatrix,zScreenLocatorEligibility,createTransformEvaluator,instances} from './original_effect_player.mjs';
const THREE={};vm.runInNewContext(fs.readFileSync('tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js','utf8'),{exports:THREE,module:{exports:THREE},console});
const receiptPath='tools/data/native-locator-emulation/zscreen-fixtures.json';
const planPath='tools/data/shared-skill-review/blade-beam/plan-native-null.json';
const basis=matrix=>[0,1,2,4,5,6,8,9,10].map(i=>matrix.elements[i]);

test('shared ZScreen basis agrees with offline execution of pinned ARM64 instructions',t=>{
  if(!fs.existsSync(receiptPath)){t.skip('Local native emulation receipt required');return;}
  const receipt=JSON.parse(fs.readFileSync(receiptPath));
  assert.equal(receipt.nativeSha256,'6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77');
  assert.equal(receipt.functionSha256,'8788174e86964bd11e97f55521d4606fe86af3798cd8f5ac9e920b5802f8f20d');
  assert.equal(receipt.view,'Identity');assert.ok(receipt.cases.length>=16);
  for(const sample of receipt.cases){
    const matrix=zScreenLocatorMatrix(THREE,[194,643,0],sample.localScale,sample.inheritedScale,sample.rotation[2]);
    const actual=basis(matrix),expected=sample.result.basis;
    assert.ok(actual.every((v,i)=>Math.abs(v-expected[i])<2e-5),JSON.stringify({sample,actual}));
    assert.deepEqual([...new THREE.Vector3().setFromMatrixPosition(matrix).toArray()],sample.result.translation);
    assert.deepEqual(sample.result.mathCalls,['sinf','cosf']);
  }
});
test('source-dispatched hierarchy changes basis order without moving its center',t=>{
  if(!fs.existsSync(planPath)){t.skip('Prepared native Null plan required');return;}
  const plan=JSON.parse(fs.readFileSync(planPath)),effect=plan.effects.find(e=>e.name==='atk_slash5_blue.bmb'),node=effect.nodes[9];
  assert.equal(zScreenLocatorEligibility(effect,node).supported,true);
  const built=instances(effect,plan.seed,plan.effectHorizon),evaluate=createTransformEvaluator(THREE,effect,built);
  const legacy=evaluate(10,true,true,true),native=evaluate(10,true,true,true,true);
  const index=built.findIndex(item=>item.node===node.index);
  assert.ok(index>=0);
  assert.deepEqual([...new THREE.Vector3().setFromMatrixPosition(native[index].matrix).toArray()],
    [...new THREE.Vector3().setFromMatrixPosition(legacy[index].matrix).toArray()]);
  assert.ok(basis(native[index].matrix).some((v,i)=>Math.abs(v-basis(legacy[index].matrix)[i])>1e-4));
  assert.ok(native.every(item=>item.matrix.elements.every(Number.isFinite)));
});
test('unsupported locator variants, dynamic scale and rotated ancestors stay explicit',t=>{
  if(!fs.existsSync(planPath)){t.skip('Prepared native Null plan required');return;}
  const plan=JSON.parse(fs.readFileSync(planPath)),original=plan.effects.find(e=>e.name==='atk_slash5_blue.bmb');
  for(const change of [e=>e.nodes[9].nativeNullLocator.typeId=1,e=>e.nodes[9].staticVectors.transform.scale.speedInitial[0]=.1,
    e=>e.nodes[1].staticVectors.transform.rotation.valueInitial[2]=1,e=>e.nodes[9].authoringInheritance.compatibility.nodeV15=true,
    e=>e.nodes[9].nativeNullLocator.nativeSha256='different-build']){
    const effect=structuredClone(original);change(effect);
    assert.equal(zScreenLocatorEligibility(effect,effect.nodes[9]).supported,false);
  }
  assert.throws(()=>zScreenLocatorMatrix(THREE,[0,0,0],[0,1,1],[1,1,1],0),/inputs/);
  assert.throws(()=>zScreenLocatorMatrix(THREE,[],[1,1,1],[1,1,1],0),/inputs/);
});
