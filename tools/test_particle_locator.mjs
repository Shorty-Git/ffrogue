import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {bounds,projectPoint,requireJoinedCapture,analyzeLocator} from './audit_particle_locator.mjs';

test('projection independently reproduces native logical corners and ignores Z under the recorded orthographic setup',()=>{
  const camera={viewport:[1080,1920],viewMatrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
    projectionMatrix:[2/640,0,0,0,0,2/1136,0,0,0,0,-1/10000,0,-1,-1,0,1]};
  assert.deepEqual(projectPoint(camera,[0,0,0]),[0,1920,0]);
  assert.deepEqual(projectPoint(camera,[640,1136,0]),[1080,0,0]);
  assert.deepEqual(projectPoint(camera,[320,568,0]),[540,960,0]);
  assert.deepEqual(projectPoint(camera,[320,568,1000]).slice(0,2),[540,960]);
  camera.viewMatrix[12]=10;assert.deepEqual(projectPoint(camera,[310,568,0]).slice(0,2),[540,960]);
  camera.projectionMatrix[15]=0;assert.throws(()=>projectPoint(camera,[0,0,0]),/homogeneous/);
});
test('bounds reject missing/nonfinite data instead of inventing zero geometry',()=>{
  assert.deepEqual(bounds([[-1,2,3],[5,8,9]]),{min:[-1,2,3],max:[5,8,9],center:[2,5,6],size:[6,6,6]});
  assert.throws(()=>bounds([]));assert.throws(()=>bounds([[NaN,0,0]]));
});
test('cross-session and uncalibrated native data cannot be silently joined',()=>{
  const capture={calibrationPassed:true,boot:{observerRevision:14,nativeSha256:'fixture'},arm:{token:'session-a',seq:1}};
  requireJoinedCapture(capture,structuredClone(capture));
  for(const mutate of [s=>s.arm.token='session-b',s=>s.arm.seq=2,s=>s.boot.nativeSha256='other']){
    const other=structuredClone(capture);mutate(other);assert.throws(()=>requireJoinedCapture(capture,other));
  }
  assert.throws(()=>requireJoinedCapture({...capture,calibrationPassed:false},capture));
});

const files=['tools/data/shared-skill-review/brave-slash-composed/plan-particle-geometry.json',
  'tools/data/particle-native-audit/locator-trace-summary.json','tools/data/particle-native-audit/combined-node34-summary.json'];
test('actual six-sample capture isolates the locator residual without changing source or accepting a counterfactual rule',
  {skip:files.some(f=>!fs.existsSync(f))?'Local ignored native receipts are unavailable':false},()=>{
  const [plan,trace,particles]=files.map(f=>JSON.parse(fs.readFileSync(f,'utf8')));
  const before=JSON.stringify(plan),THREE={};
  vm.runInNewContext(fs.readFileSync('tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js','utf8'),{exports:THREE,module:{exports:THREE},console});
  const result=analyzeLocator(THREE,plan,trace,particles,'atk_impact_001_pink.bmb',34,5);
  assert.equal(result.nativeSampleCount,6);
  assert.deepEqual(result.native.size,[1278,1136,0]);
  assert.ok(Math.abs(result.displayCenterResidual[1]+20.787962452251122)<1e-6);
  assert.ok(result.neutralRotationCounterfactual.residual.every(v=>Math.abs(v)<1e-5));
  assert.equal(result.neutralRotationCounterfactual.approvedRule,false);
  assert.equal(result.nativeAgeKnown,false);assert.equal(result.approved,false);
  assert.equal(JSON.stringify(plan),before);
  particles.particles[0].samples[0].state.originalSha256='tampered';
  assert.throws(()=>analyzeLocator(THREE,plan,trace,particles,'atk_impact_001_pink.bmb',34,5),/identity mismatch/);
});
