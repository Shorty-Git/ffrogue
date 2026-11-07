import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeRandom} from '../src/effects/nativeLifecycle.mjs';
import {initializeNativeConstTransform,nativeDefaultTransform,nativeParticleXMakeInputs} from '../src/effects/nativeTransform.mjs';
import {replayParentGenerators} from './lib/parent-generator-replay.mjs';
const folder='tools/data/memorial-audit/diagnostic-v34-lifecycle/';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const plan='tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json';
const inputs=()=>read('tools/data/memorial-audit/diagnostic-v32-lifecycle/source-module-inputs.json');
const rows=p=>fs.readFileSync(p,'utf8').trim().split('\n').map(JSON.parse);
function replay(r){
 const e=read(plan).effects.find(e=>e.sha256===r[0].sourceSha256),reference=read('tools/data/reconstruction-map/generator-activation-native.json');
 const g=new Map(e.nodes.map(n=>[n.index,reference.cases.find(c=>c.node===n.index&&c.sourceSha256===e.sha256).inputs]));
 return replayParentGenerators(r,e,g,{moduleInputs:inputs(),independentParent:true});
}

test('live full-record capture reconstructs constant parent without a computed native matrix input',t=>{
 if(!fs.existsSync(folder+'run-h.jsonl'))return t.skip('Local v34 targeted capture required');
 const r=rows(folder+'run-h.jsonl'),result=replay(r),p=result.parentTransformComparison;
 assert.equal(p.recordObserved,true);assert.equal(p.matchedEvents,22);assert.deepEqual(p.differences,[]);
 assert.equal(p.initializationDraws,9);assert.equal(p.suppliedComputedParentMatrices,false);
 assert.equal(result.boundary.suppliedNativeParentTransforms,false);
 assert.equal(result.recordComparison.matchedEvents,2094);assert.deepEqual(result.recordComparison.differences,[]);
 assert.equal(result.baselineComparison.matchedEvents,1734);assert.deepEqual(result.baselineComparison.differences,[]);
 assert.equal(result.scalarComparison.maximumAbsoluteResidual,0);
 assert.ok(result.differences.every(d=>d.fields.every(f=>f.field.startsWith('worldTranslation.'))));
 assert.ok(result.worldProjection.maximumAbsoluteResidual<=.00006103515625);
 const d=result.dependentTransformComparison;
 assert.equal(d.originalEvents,180);assert.equal(d.matchedEvents,178);assert.equal(d.differences.length,2);
 assert.ok(d.differences.every(d=>d.fields.every(f=>f.field.startsWith('origin.'))));
 assert.ok(d.differences.every(d=>d.fields.every(f=>f.numericPrecision.inputsExactlyFloat32)));
 assert.equal(d.suppliedComputedNativeMatrices,false);
 const make=result.particleMakeComparison;
 assert.equal(make.originalEvents,150);assert.equal(make.matchedEvents,148);assert.equal(make.writerAdmitted,false);
 assert.ok(make.differences.every(d=>d.fields.every(f=>f.field.startsWith('center.'))));
 assert.deepEqual(make.differences.flatMap(d=>d.fields.map(f=>f.numericPrecision.float32UlpDistance)),[4,1]);
 // Corrupt only an independently checked output. It must flag validation, never drive simulation.
 for(const x of r)if(x.node===1&&x.type==='post-leave')x.state.jointStorage.slots[0].raw='';
 for(const x of r)if(x.type==='tree-update-enter'&&x.tree?.joint?.raw){
  const root=Buffer.from(x.tree.joint.raw,'hex');root.writeFloatLE(999,40);x.tree.joint.raw=root.toString('hex');
 }
 const output=r.find(x=>x.node===1&&x.type==='module-leave'&&x.candidates[0].name.includes('transform_locator'));
 const bytes=Buffer.from(output.after.update.raw,'hex');bytes.writeFloatLE(999,136);output.after.update.raw=bytes.toString('hex');
 const after=replay(r);assert.deepEqual(after.simulated,result.simulated);
 assert.deepEqual(after.dependentTransformComparison.simulated,result.dependentTransformComparison.simulated);
 assert.equal(after.parentTransformComparison.differences.length,1,'Corrupted native output must be detected, never reused');
});

test('old connected baseline also uses source/RNG/root inputs, without borrowing new-run matrices',t=>{
 const path='tools/data/memorial-audit/diagnostic-v32-lifecycle/run-g.jsonl';
 if(!fs.existsSync(path))return t.skip('Local immutable run G required');
 const r=replay(rows(path));assert.equal(r.parentTransformComparison.recordObserved,false);
 assert.equal(r.parentTransformComparison.matchedEvents,22);assert.deepEqual(r.parentTransformComparison.differences,[]);
 assert.equal(r.recordComparison.matchedEvents,2094);assert.equal(r.baselineComparison.matchedEvents,1734);
 assert.equal(r.dependentTransformComparison.matchedEvents,178);
});

test('Default locator XYZ/nonuniform scale controls retain explicit float precision boundaries',t=>{
 if(!fs.existsSync(folder+'default-locator-controls.json'))return t.skip('Pinned offline Default receipt required');
 const receipt=read(folder+'default-locator-controls.json');assert.equal(receipt.functionAddress,'0x1fbef00');
 assert.equal(receipt.cases.length,16);
 for(const c of receipt.cases){const p=c.inheritedScale;
  const s=nativeDefaultTransform({rotation:c.rotation,scale:c.localScale,translation:[0,0,0]},
   {basis:[p[0],0,0,0,p[1],0,0,0,p[2]],origin:[0,0,0]},'captured-separate-f32');
  for(const k of ['basis','scale','quaternion'])for(let i=0;i<s[k].length;i++)assert.ok(Math.abs(s[k][i]-c.result[k][i])<=.00000025,
   `${k}[${i}]: separate-f32/Native-instruction precision boundary`);
 }
});

test('existing alternate-seed Null chain retains its exact initialization record and bounded locator precision',t=>{
 const path='tools/data/connected-effect/brave-slash-null-chains.json';
 if(!fs.existsSync(path))return t.skip('Preserved original Null chain receipt required');
 const c=read(path).cases.find(c=>c.node===1).result.chain;
 const effect=read(plan).effects.find(e=>e.nodes.length===9),v=effect.nodes[1].staticVectors.transform;
 const rng=new NativeRandom([123456789,362436069,521288629,88675123]);
 const local=initializeNativeConstTransform({profile:'null-const-transform-v1',arithmetic:'captured-separate-f32',
  scale:{kind:'ConstX',value:v.scale.valueInitial[0],range:v.scale.valueRange[0]},
  rotation:{value:v.rotation.valueInitial,range:v.rotation.valueRange},translation:'Zero',
  color:inputs().nodes.find(n=>n.index===1).inputs.color1},rng);
 const record=Buffer.alloc(40);[local.scale[0],...local.rotation,...local.translation,...local.color].forEach((v,i)=>record.writeFloatLE(v,i*4));
 assert.equal(record.toString('hex'),c.initialRecordHex);assert.deepEqual(rng.words,c.rngAfterInit);
 const state=nativeDefaultTransform(local,c.updateParentFixture,'captured-separate-f32');
 for(const k of ['basis','scale','quaternion'])for(let i=0;i<state[k].length;i++)
  assert.ok(Math.abs(state[k][i]-c.updates[0].nativeLocator[k][i])<=.00000025);
});

test('unadmitted transform profiles fail before consuming RNG',()=>{
 const rng=new NativeRandom([1,2,3,4]);assert.throws(()=>initializeNativeConstTransform({},rng),/Explicit/);assert.equal(rng.draws,0);
 assert.throws(()=>nativeDefaultTransform({rotation:[0,0,0],scale:[1,1,1],translation:[0,0,0]},
  {basis:[0,0,0,0,0,0,0,0,0],origin:[0,0,0]},'captured-separate-f32'),/Degenerate/);
});

test('Particle make broadcasts group X and preserves the separate material admission boundary',()=>{
 assert.deepEqual(nativeParticleXMakeInputs({scalar:2,center:[4,5,6],groupScale:[3,7,9],rotationMode:'Absent'}),
  {center:[4,5,6],localScale:[2,2,2],groupScale:[3,3,3],rotation:[0,0,0]});
 assert.throws(()=>nativeParticleXMakeInputs({scalar:2,center:[4,5,6],groupScale:[3,7,9],rotationMode:'Unknown'}),/Explicit/);
});
