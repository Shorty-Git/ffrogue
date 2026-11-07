import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyEffect} from './audit_renderer_coverage.mjs';

const inheritance={matrix:'On',translation:'On',rotation:'On',scale:'On',alphaRate:0,colorRate:0};
function fixture() {
  return {plan:{sourceInheritance:true,withholdUntexturedParticles:true},
    effect:{nodes:[{index:0,typeId:0,type:'ControlNull',parentIndex:null,authoringEmissionShape:'Point',resourceBindings:{},materialControls:{}},
      {index:1,typeId:6,type:'EmitterModel',parentIndex:0,authoringEmissionShape:'Point',authoringInheritance:{...inheritance},resourceBindings:{model:{name:'mesh'}},materialControls:{blend:{name:'SemiAdd'}}}]},
    source:{authoring:{sha256:'fixture'},nodes:[{index:0,fields:{}},{index:1,fields:{Basic_Basic_SortPriority:'0.5',Basic_ParentNodeInfluence_ParentAlphaRate:'0'}}],
      meshes:[{name:'mesh',nonwhiteVertices:4,vertexCount:4,alphaByteRange:[0,255]}]}};
}
test('nonwhite vertex data requires RGBA handling; opaque-white control does not',()=>{
  const f=fixture();
  assert.ok(classifyEffect(f.plan,f.effect,f.source)[1].findings.some(x=>x.capability==='model-vertex-rgba'));
  f.plan.modelVertexRgba=true;
  assert.ok(classifyEffect(f.plan,f.effect,f.source)[1].findings.some(x=>x.capability==='model-vertex-rgba'&&x.status==='rendered-experimental'));
  f.source.meshes[0].nonwhiteVertices=0;
  assert.ok(!classifyEffect(f.plan,f.effect,f.source)[1].findings.some(x=>x.capability==='model-vertex-rgba'));
});
test('withheld ancestor excludes descendant from draw candidates while retaining its source need',()=>{
  const f=fixture();f.effect.nodes[0].authoringEmissionShape='Model';
  const result=classifyEffect(f.plan,f.effect,f.source);
  assert.equal(result[1].ownDrawCandidate,false);
  assert.equal(result[0].feedsDrawCandidate,false);
  assert.ok(result[1].findings.some(x=>x.capability==='model-vertex-rgba'));
});
test('implemented rate-zero alpha is not relabeled as a missing alpha equation',()=>{
  const f=fixture(),row=classifyEffect(f.plan,f.effect,f.source)[1];
  assert.ok(row.findings.some(x=>x.capability==='parent-alpha-zero'&&x.status==='implemented-subset'));
  assert.ok(!row.findings.some(x=>x.capability==='parent-alpha'));
});
test('absent authoring produces unknown controls rather than invented alpha settings',()=>{
  const f=fixture();f.source.authoring=null;f.source.nodes=[];delete f.effect.nodes[1].authoringInheritance;
  const row=classifyEffect(f.plan,f.effect,f.source)[1];
  assert.ok(row.findings.some(x=>x.capability==='inheritance'&&x.status==='source-controls-unknown'));
  assert.ok(!row.findings.some(x=>x.capability==='parent-alpha'));
});
test('billboard control ancestors retain a missing locator finding despite having no own drawable mesh',()=>{
  const f=fixture();f.source.nodes[0].fields.Detail_Basic_NullType='Billboard';
  const row=classifyEffect(f.plan,f.effect,f.source)[0];
  assert.equal(row.ownDrawCandidate,false);
  assert.ok(row.findings.some(x=>x.capability==='null-locator'&&x.status==='missing'));
  f.source.nodes[0].fields.Detail_Basic_NullType='Standard';
  assert.ok(!classifyEffect(f.plan,f.effect,f.source)[0].findings.some(x=>x.capability==='null-locator'));
});
test('Particle coverage requires an enabled plan and every matching member to pass the shared gate',()=>{
  const f=fixture();
  const vectors=value=>({valueInitial:value,valueRange:[0,0,0],speedInitial:[0,0,0],speedRange:[0,0,0],accelerationInitial:[0,0,0],accelerationRange:[0,0,0]});
  for(const node of f.effect.nodes){
    node.particleGeometrySource={rotationMode:'NewtonDynamics',scaleMode:'NewtonDynamics'};
    node.staticVectors={transform:{rotation:vectors([0,0,0]),scale:vectors([1,1,1])}};
    node.vectorCurves={};
  }
  Object.assign(f.effect.nodes[1],{typeId:3,type:'Particle',resourceBindings:{texture1:{name:'fixture'}},materialControls:{textureCombination:{name:'Basic'}}});
  f.plan.effects={fixture:f.effect};f.plan.members=[{effect:'fixture',rotation:[0,0,0],scalePercent:100}];
  const status=()=>classifyEffect(f.plan,f.effect,f.source)[1].findings.find(x=>x.capability==='particle-facing').status;
  assert.equal(status(),'native-equation-unverified');
  f.plan.particleGeometry=true;assert.equal(status(),'rendered-experimental');
  f.plan.members.push({effect:'fixture',rotation:[0,0,90],scalePercent:100});
  assert.equal(status(),'native-equation-unverified');
});
