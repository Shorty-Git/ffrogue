import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {nativeScalarAlpha,scalar,nativeScalarAlphaEligibility,createTransformEvaluator,instances} from './original_effect_player.mjs';

const key=(frame,value,type='Spline',slopeLeft=0,slopeRight=0)=>({frame,value,type,slopeLeft,slopeRight});

test('native scalar alpha matches original instructions across modes, endpoints, tangents and clamps',t=>{
  const path='tools/data/native-locator-emulation/scalar-alpha-controls.json';
  if(!fs.existsSync(path)){t.skip('Pinned local native control receipt required');return;}
  const receipt=JSON.parse(fs.readFileSync(path,'utf8'));
  assert.equal(receipt.nativeSha256,'6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77');
  assert.equal(receipt.cases.length,64);
  let samples=0,maxResidual=0;
  for(const c of receipt.cases)for(const s of c.samples){
    const actual=nativeScalarAlpha(c.keys,s.time),residual=Math.abs(actual-s.native);
    maxResidual=Math.max(maxResidual,residual);samples++;
    assert.ok(residual<.000003,JSON.stringify({keys:c.keys,time:s.time,actual,native:s.native,residual}));
  }
  assert.equal(samples,576);t.diagnostic(`576 native samples; maximum residual ${maxResidual}`);
});

test('native alpha helper is separate from experimental vector-compatible scalar policy',()=>{
  const keys=[key(0,0,'Spline',2,0),key(.5,1,'Spline',0,-1)];
  assert.equal(nativeScalarAlpha(keys,.25),.875);
  assert.equal(scalar(keys,.25),.5);
  assert.equal(nativeScalarAlpha([key(0,2)],0),1);
});

test('unknown modes, nonfinite values and unverified near-duplicate keys reject',()=>{
  for(const keys of [[],[key(0,0,'Unknown')],[key(0,NaN)],
    [key(0,0),key(0,1)],[key(1,0),key(0,1)],[key(0,0),key(1e-8,1)]])
    assert.throws(()=>nativeScalarAlpha(keys,.5),/Expected|Unsupported|subset/);
  assert.throws(()=>nativeScalarAlpha([key(0,1)],Infinity),/finite/);
});

function sourceFixture(){
  const vector=value=>({valueInitial:value,valueRange:[0,0,0],speedInitial:[0,0,0],speedRange:[0,0,0],accelerationInitial:[0,0,0],accelerationRange:[0,0,0]});
  const keys=[key(0,0,'Spline',2,0),key(.5,1,'Spline',0,-1)];
  const node={index:0,typeId:3,parentIndex:null,children:[],generation:{repeatCount:1,duration:1,interval:1,count:1,start:0,startRange:0},
    lifeParameter:100,lifeRangeParameter:0,staticVectors:{transform:{translation:vector([2,3,0]),rotation:vector([0,0,0]),scale:vector([1,1,1])}},
    motionModes:{},vectorCurves:{},alphaCurve:{keys},appearance:{alpha:{mode:'Curve',origin:'IBMB'}}};
  node.nativeScalarAlpha={nativeSha256:'6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77',sourceSha256:'source',
    initAddress:'0x20025ec',updateAddress:'0x2002af4',keys:structuredClone(keys)};
  return {sha256:'source',nodes:[node]};
}

test('Particle alpha eligibility rejects stale source, keys, wrappers and other node families',()=>{
  assert.equal(nativeScalarAlphaEligibility(sourceFixture(),sourceFixture().nodes[0]).supported,true);
  for(const mutate of [e=>e.sha256='changed',e=>e.nodes[0].alphaCurve.keys[0].value=.1,
    e=>e.nodes[0].nativeScalarAlpha.updateAddress='unknown',e=>e.nodes[0].nativeScalarAlpha=null,
    e=>e.nodes[0].appearance.alpha.mode='Constant',e=>e.nodes[0].typeId=2,e=>e.nodes[0].typeId=6]){
    const effect=sourceFixture();mutate(effect);assert.equal(nativeScalarAlphaEligibility(effect,effect.nodes[0]).supported,false);
  }
});

test('actual transform evaluator switches only eligible local alpha while preserving matrices and legacy path',()=>{
  const THREE={};vm.runInNewContext(fs.readFileSync('tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js','utf8'),{exports:THREE,module:{exports:THREE},console});
  for(const typeId of [3,2,6]){
    const effect=sourceFixture();effect.nodes[0].typeId=typeId;
    const evaluate=createTransformEvaluator(THREE,effect,instances(effect));
    const old=evaluate(25,false,true,false,false,false)[0],candidate=evaluate(25,false,true,false,false,true)[0];
    assert.equal(old.alpha,.5);assert.equal(candidate.alpha,typeId===3?.875:.5);
    assert.deepEqual([...candidate.matrix.elements],[...old.matrix.elements]);
  }
});
