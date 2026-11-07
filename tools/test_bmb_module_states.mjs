import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeRandom,NativeParticleEmitter,initializeNativeVector,updateRetainedNativeRecords} from '../src/effects/nativeLifecycle.mjs';
import {replayParentGenerators} from './lib/parent-generator-replay.mjs';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const folder='tools/data/memorial-audit/diagnostic-v32-lifecycle/';
test('connected vector records preserve the scheduler baseline and expose unresolved projection separately',t=>{
 if(!fs.existsSync(folder+'source-module-inputs.json')){t.skip('Compile the retained BMB module inputs first');return;}
 const rows=fs.readFileSync(folder+'run-g.jsonl','utf8').trim().split('\n').map(JSON.parse);
 const e=read('tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json').effects.find(e=>e.sha256===rows[0].sourceSha256);
 const reference=read('tools/data/reconstruction-map/generator-activation-native.json');
 const g=new Map(e.nodes.map(n=>[n.index,reference.cases.find(c=>c.sourceSha256===e.sha256&&c.node===n.index).inputs]));
 const r=replayParentGenerators(rows,e,g,{moduleInputs:read(folder+'source-module-inputs.json')});
 assert.equal(r.originalEvents,2094);assert.equal(r.baselineComparison.matchedEvents,1734);assert.deepEqual(r.baselineComparison.differences,[]);
 assert.equal(r.recordComparison.matchedEvents,2094);assert.deepEqual(r.recordComparison.differences,[]);
 assert.deepEqual(r.scalarComparison,{observations:300,values:600,maximumAbsoluteResidual:0});
 assert.deepEqual(r.moduleObservations,{translation:330,uvScale:150,color:150,velocityXYZ:180,worldTranslation:180});
 assert.ok(r.differences.every(d=>d.fields.every(f=>f.field.startsWith('worldTranslation.'))));
 // Ceiling for the recorded unresolved precision gap, not fidelity acceptance.
 assert.ok(r.worldProjection.maximumAbsoluteResidual<=.00006103515625);assert.equal(r.worldProjection.certified,false);
 assert.equal(r.boundary.fullSourceReconstructed,false);assert.equal(r.boundary.suppliedNativeParentTransforms,true);
 const first=r.simulated.filter(x=>x.node===7&&x.instance===0&&x.type==='module-enter'&&x.module?.includes('translation6update8Velocity'));
 assert.deepEqual(first.map(x=>x.frame),Array.from({length:13},(_,i)=>i+1));
 assert.equal(r.final.parents[0].ageTicks,110000);assert.ok(r.final.translations[0][0]>0,'Held record must continue moving after its age freezes');
 assert.ok(new Set(r.final.vectorRecords[8].map(v=>v.color.join(','))).size>1,'Source random RGB must not collapse to base color');
});
test('retained module pass is distinct from age filtering and respects explicit emitter/parent gates',()=>{
 const records=[{lifeTicks:1,ageTicks:2},{lifeTicks:1,ageTicks:1}],visited=[];
 const opts={parent:{lifeTicks:10,ageTicks:1},expired:false,onRecord:(r,i)=>visited.push(i)};
 updateRetainedNativeRecords(records,1,opts);assert.deepEqual(visited,[0,1]);
 updateRetainedNativeRecords(records,1,{...opts,expired:true});assert.equal(visited.length,2);
 updateRetainedNativeRecords(records,1,{...opts,parent:{lifeTicks:1,ageTicks:2}});assert.equal(visited.length,2);
});
test('vector arithmetic profiles and module ordering fail closed before consuming emitter randomness',()=>{
 const rng=new NativeRandom([1,2,3,4]),m={kind:'ColorConst',value:[1,1,1],range:[.1,.1,.1],arithmetic:'captured-separate-f32'};
 assert.throws(()=>initializeNativeVector({...m,arithmetic:undefined},rng),/Explicit/);assert.equal(rng.draws,0);
 assert.throws(()=>initializeNativeVector({...m,kind:'TranslationVelocity'},rng),/context/);assert.equal(rng.draws,0);
 const result=initializeNativeVector(m,rng);assert.equal(rng.draws,3);assert.ok(result.every(v=>v>=0&&v<=1));
 const base=read('public/assets/effects/native_particle_control/manifest.json').program.simulation;
 const emitter=new NativeParticleEmitter({...base,modules:[...base.modules,m]});emitter.step(1);
 assert.equal(emitter.color(emitter.particles[0]).length,3);assert.ok(emitter.particles[0].moduleRecord.length>2);
 assert.throws(()=>new NativeParticleEmitter({...base,modules:[m]}),/initializer/);
 assert.throws(()=>new NativeParticleEmitter({...base,modules:[...base.modules,{...m,kind:'UVConst'}]}),/trailing/);
});
