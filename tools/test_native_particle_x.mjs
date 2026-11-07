import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {nativeParticleXEligibility,nativeParticleXDisplayMatrix,createTransformEvaluator,instances} from './original_effect_player.mjs';
const THREE={};vm.runInNewContext(fs.readFileSync('tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js','utf8'),{exports:THREE,module:{exports:THREE},console});
const planPath='tools/data/shared-skill-review/climhazzard/plan-native-x.json';

test('shared X display agrees with original ARM64 OneX/ConstX writer output',t=>{
  const path='tools/data/native-locator-emulation/particle-x-fixtures.json';
  if(!fs.existsSync(path)){t.skip('Optional native receipt required');return;}
  const receipt=JSON.parse(fs.readFileSync(path));
  assert.equal(receipt.nativeSha256,'6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77');
  assert.equal(receipt.modules.OneX.sha256,'549644baf3d7082741d320b6184e226f1b37d009bd46cac9321fc2b90971dfbe');
  let checked=0;
  for(const {inputs,result} of receipt.cases){
    if(inputs.mode==='VelocityX')continue;
    const matrix=nativeParticleXDisplayMatrix(THREE,[0,0,0],result.scale[0],inputs.group[0],inputs.roll??0);
    if(result.scale[0]===0){assert.equal(matrix,null);continue;}
    const vertices=[[-.5,.5],[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5],[.5,-.5]].map(([x,y])=>new THREE.Vector3(x,y,0).applyMatrix4(matrix).toArray());
    assert.ok(vertices.every((v,i)=>v.every((x,j)=>Math.abs(x-result.writer.positions[i][j])<.00001)));
    checked++;
  }
  assert.ok(checked>=8);
});

test('real OneX hierarchy keeps simulation center and changes square display extents',t=>{
  if(!fs.existsSync(planPath)){t.skip('Prepared X plan required');return;}
  const plan=JSON.parse(fs.readFileSync(planPath)),effect=plan.effects.find(e=>e.name==='eff_strobe_white_a50_f30.bmb'),member=plan.members.find(m=>plan.effects[m.effect]===effect),node=effect.nodes[3];
  assert.equal(nativeParticleXEligibility(effect,node,member).supported,true);
  const built=instances(effect,plan.seed,plan.effectHorizon),evaluate=createTransformEvaluator(THREE,effect,built),index=built.findIndex(i=>i.node===3);
  const before=evaluate(12,true,true,true,true),state=before[index],parent=before[built[index].parent];
  const groupX=new THREE.Vector3().setFromMatrixScale(parent.matrix).x;
  const center=new THREE.Vector3().setFromMatrixPosition(state.matrix).toArray();
  const display=nativeParticleXDisplayMatrix(THREE,center,1,groupX);
  assert.deepEqual(new THREE.Vector3().setFromMatrixPosition(display).toArray(),center);
  const size=new THREE.Vector3().setFromMatrixScale(display);
  assert.ok(Math.abs(size.x-825)<1e-5);assert.equal(size.x,size.y);
  assert.deepEqual(evaluate(12,true,true,true,true).map(s=>s.matrix.elements),before.map(s=>s.matrix.elements));
});

test('dynamic, random, missing-source and incompatible ancestors stay outside the X path',t=>{
  if(!fs.existsSync(planPath)){t.skip('Prepared X plan required');return;}
  const p=JSON.parse(fs.readFileSync(planPath)),original=p.effects.find(e=>e.name==='eff_strobe_white_a50_f30.bmb'),member=p.members.find(m=>p.effects[m.effect]===original);
  for(const change of [e=>e.nodes[3].nativeParticleX.scale.index=17,e=>e.nodes[3].nativeParticleX.nativeSha256='other',e=>e.nodes[3].authoringEmissionShape='Model',e=>e.nodes[2].staticVectors.transform.rotation.valueInitial[2]=20,e=>e.nodes[2].staticVectors.transform.scale.speedInitial[0]=1,e=>delete e.nodes[2].nullLocatorSource,e=>e.nodes[3].staticVectors.transform.rotation.valueRange[2]=360]){
    const effect=structuredClone(original);change(effect);assert.equal(nativeParticleXEligibility(effect,effect.nodes[3],member).supported,false);
  }
  assert.throws(()=>nativeParticleXDisplayMatrix(THREE,[0,0,0],1,-1),/Invalid/);
});
