import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {nullLocatorEligibility,createTransformEvaluator,instances,particleDisplayWorldMatrix} from './original_effect_player.mjs';
const THREE={};vm.runInNewContext(fs.readFileSync('tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js','utf8'),{exports:THREE,module:{exports:THREE},console});
function fixture(){
  const vector=value=>({valueInitial:value,valueRange:[0,0,0],speedInitial:[0,0,0],speedRange:[0,0,0],accelerationInitial:[0,0,0],accelerationRange:[0,0,0]});
  const node=(index,type,position,rotation)=>({index,typeId:0,parentIndex:index?index-1:null,children:index<2?[index+1]:[],
    generation:{repeatCount:1,duration:1,interval:1,count:1,start:0,startRange:0},lifeParameter:100,lifeRangeParameter:0,
    nullLocatorSource:{type,rotationMode:'NewtonDynamics',scaleMode:'NewtonDynamics'},
    staticVectors:{transform:{translation:vector(position),rotation:vector(rotation),scale:vector([1,1,1])}},
    authoringInheritance:{matrix:'On',translation:'On',rotation:'On',scale:'On',alphaRate:0,colorRate:0,
      compatibility:{nodeV16:true,nodeV15:false,rootV16:false,rootV15:false}},motionModes:{},vectorCurves:{},alphaCurve:{keys:[]}});
  return {nodes:[node(0,'Standard',[0,0,0],[0,0,0]),node(1,'Billboard',[0,0,0],[25,0,0]),node(2,'Standard',[0,125,0],[0,0,0])]};
}
const position=matrix=>[...new THREE.Vector3().setFromMatrixPosition(matrix).toArray()];
test('source gate accepts the measured subset and rejects unknown modes, roll, parent tilt, scale and compatibility',()=>{
  const e=fixture();assert.equal(nullLocatorEligibility(e,e.nodes[1]).supported,true);
  for(const mutate of [e=>e.nodes[1].nullLocatorSource.type='Unknown',e=>e.nodes[1].staticVectors.transform.rotation.valueInitial[2]=1,
    e=>e.nodes[0].staticVectors.transform.rotation.valueInitial[0]=25,e=>e.nodes[1].staticVectors.transform.scale.valueInitial=[2,2,2],
    e=>e.nodes[1].authoringInheritance.compatibility.nodeV15=true,e=>delete e.nodes[0].nullLocatorSource]){
    const copy=structuredClone(e);mutate(copy);assert.equal(nullLocatorEligibility(copy,copy.nodes[1]).supported,false);
  }
});
test('only enabled source Billboard ancestors neutralize XY tilt; Standard rotation remains unchanged',()=>{
  const e=fixture(),built=instances(e),evaluate=createTransformEvaluator(THREE,e,built),old=evaluate(5,true,false,false),current=evaluate(5,true,false,true);
  assert.ok(Math.abs(position(old[2].matrix)[2]-125*Math.sin(25*Math.PI/180))<1e-9);
  assert.deepEqual(position(current[2].matrix),[0,125,0]);
  e.nodes[1].nullLocatorSource.type='Standard';const standard=createTransformEvaluator(THREE,e,built);
  assert.deepEqual([...standard(5,true,false,true)[2].matrix.elements],[...old[2].matrix.elements]);
});
test('toggle, seek order, alpha and local translation stay independent of the locator display choice',()=>{
  const e=fixture();e.nodes[1].staticVectors.transform.translation.speedInitial=[2,0,0];
  const built=instances(e),before=JSON.stringify(built),evaluate=createTransformEvaluator(THREE,e,built);
  const on=evaluate(5,true,false,true),off=evaluate(5,true,false,false);
  assert.deepEqual(position(on[2].matrix),[10,125,0]);
  evaluate(80,true,false,true);assert.deepEqual([...evaluate(5,true,false,true)[2].matrix.elements],[...on[2].matrix.elements]);
  assert.deepEqual([...evaluate(5,true,false,false)[2].matrix.elements],[...off[2].matrix.elements]);
  assert.deepEqual([...evaluate(5,false,false,true)[2].matrix.elements],[...evaluate(5,false,false,false)[2].matrix.elements]);
  assert.equal(on[2].alpha,off[2].alpha);assert.equal(JSON.stringify(built),before);
});
const planFile='tools/data/shared-skill-review/brave-slash-composed/plan-null-locator.json';
const auditFile='tools/data/memorial-audit/diagnostic-v18-locator/direct-prefix-audit.json';
const candidateFiles=['brave-slash-composed','blade-beam','climhazzard'].map(s=>'tools/data/shared-skill-review/'+s+'/plan-null-locator.json');
test('all candidate frames stay finite and every effect outside the locator gate is unchanged on/off',
  {skip:candidateFiles.some(p=>!fs.existsSync(p))?'Local candidate fixtures unavailable':false},()=>{
  for(const file of candidateFiles){
    const plan=JSON.parse(fs.readFileSync(file));
    for(const effect of plan.effects){
      const built=instances(effect,plan.seed,plan.effectHorizon),evaluate=createTransformEvaluator(THREE,effect,built);
      const affected=effect.nodes.some(n=>nullLocatorEligibility(effect,n).supported);
      for(let frame=0;frame<=plan.effectHorizon;frame++){
        const on=evaluate(frame,true,true,true),off=affected?null:evaluate(frame,true,true,false);
        for(let index=0;index<on.length;index++){
          assert.ok(on[index].matrix.elements.every(Number.isFinite));
          if(off)assert.deepEqual([...on[index].matrix.elements],[...off[index].matrix.elements]);
        }
      }
    }
  }
});
test('actual source chain reproduces recovered native ancestor position and white-particle vertex bounds',
  {skip:!fs.existsSync(planFile)||!fs.existsSync(auditFile)?'Local ignored native fixtures unavailable':false},()=>{
  const plan=JSON.parse(fs.readFileSync(planFile)),audit=JSON.parse(fs.readFileSync(auditFile));
  const effect=plan.effects.find(e=>e.sha256===audit.sourceSha256),built=instances(effect,plan.seed,plan.effectHorizon);
  const sample=audit.samples.find(s=>s.node.node===33&&s.complete),native=sample.calls.at(-1).after;
  const rootSample=audit.samples.find(s=>s.node.node===1&&s.complete).calls.at(-1).after;
  const globalScale=rootSample.scaleE8[0],root=new THREE.Matrix4().makeScale(globalScale,globalScale,globalScale);
  root.setPosition(new THREE.Vector3(...rootSample.translationF4));
  const states=createTransformEvaluator(THREE,effect,built)(5,true,true,true);
  const index=built.findIndex(i=>i.node===33),world=new THREE.Matrix4().multiplyMatrices(root,states[index].matrix);
  assert.ok(position(world).every((v,i)=>Math.abs(v-native.translationF4[i])<1e-5));
  const white=built.findIndex(i=>i.node===34),plane=particleDisplayWorldMatrix(THREE,new THREE.Matrix4().multiplyMatrices(root,states[white].matrix));
  const vertices=[[-.5,-.5,0],[.5,.5,0]].map(p=>new THREE.Vector3(...p).applyMatrix4(plane));
  assert.ok(Math.abs(vertices[1].x-vertices[0].x-1278)<1e-4);
  assert.ok(Math.abs(vertices[1].y-vertices[0].y-1136)<1e-4);
  assert.ok(position(plane).every((v,i)=>Math.abs(v-native.translationF4[i])<1e-5));
});
