import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeParticleBranch,validateNativeParticleBranch} from '../src/effects/nativeParticleBranch.mjs';
import {nativeParticleXPacket} from '../src/effects/nativeParticlePacket.mjs';
import {replayParentGenerators} from './lib/parent-generator-replay.mjs';
import {compareLifecycleEvents} from './lib/lifecycle-comparison.mjs';
import {evaluateNativeSourceBranches,nativeBranchSlots} from '../src/effects/nativeSourceBranches.mjs';
import {createEffectPlayer} from '../src/effects/originalEffectPlayer.mjs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const folder='tools/data/memorial-audit/particle-packet-integration/';
const profile=read('tools/data/connected-effect/particle-packet-branch-program.json').particleBranches[0];
const reference=read(folder+'native-particle-writers.json');
const rows=fs.readFileSync('tools/data/memorial-audit/diagnostic-v34-lifecycle/run-h.jsonl','utf8').trim().split('\n').map(JSON.parse);
const effect=read('tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json').effects.find(e=>e.sha256===reference.sourceSha256);
const activation=read('tools/data/reconstruction-map/generator-activation-native.json');
const generations=new Map(effect.nodes.map(n=>[n.index,activation.cases.find(c=>c.node===n.index&&c.sourceSha256===effect.sha256).inputs]));
const scene={scale:[1.774999976158142,1.774999976158142,1.774999976158142],origin:[146,730,0]};
const original=[];
for(const c of reference.cases)for(const [i,window]of c.windows.entries())original.push({frame:window.frame,type:'particle-render-packet',node:c.node,instance:c.instance,
 vertices:c.result.chain.updates[i].vertices.data,seq:window.seq,
 context:{parentState:window.host,rng:c.result.chain.rngAfterUpdates,referenceKind:reference.boundary}});
original.sort((a,b)=>a.seq-b.seq);
function assertKnownCenterResiduals(comparison) {
 assert.equal(comparison.matchedEvents,148);assert.equal(comparison.differences.length,2);
 assert.deepEqual(comparison.differences.map(d=>[d.frame,d.instance]),[[1,1],[2,7]]);
 for(const d of comparison.differences){
  assert.equal(d.fields.length,6);
  assert.ok(d.fields.every(x=>/^vertices\.\d\.position\.[01]$/.test(x.field)&&x.numericPrecision.absoluteDifference<=.00006103515625));
  d.probableCause='Previously recorded Null parent center rounding residual propagates to all six vertices; UV/RGBA/tints exact';
 }
}

test('connected computed module/parent states produce all 150 original two-texture writer packets',()=>{
 const result=replayParentGenerators(rows,effect,generations,{moduleInputs:read('tools/data/connected-effect/quad-module-inputs.json'),independentParent:true,particlePacketProgram:profile});
 assert.equal(result.recordComparison.matchedEvents,2094);assert.deepEqual(result.recordComparison.differences,[]);
 assert.equal(result.baselineComparison.matchedEvents,1734);assert.deepEqual(result.baselineComparison.differences,[]);
 assert.equal(result.scalarComparison.maximumAbsoluteResidual,0);assert.equal(result.scalarComparison.values,600);
 assert.equal(result.worldProjection.differingCoordinates,2);
 const packets=compareLifecycleEvents(original,result.particlePackets);
 assertKnownCenterResiduals(packets);
 fs.writeFileSync(folder+'particle-packet-comparison.json',JSON.stringify({packets,
  boundary:reference.boundary,externalInputs:read('tools/data/connected-effect/particle-packet-branch-program.json').externalInputs,
  lifecycle:{recordEvents:result.recordComparison.matchedEvents,baselineEvents:result.baselineComparison.matchedEvents,
   scalar:result.scalarComparison,worldProjection:result.worldProjection},fullSourceReconstructed:false},null,2));
 // A complete packet comparison must retain the known inherited center gap.
 assert.equal(packets.firstDivergence.frame,1);
});

test('standalone shared branch needs only source parameters, emitter initial seeds and scene pose',()=>{
 const branch=new NativeParticleBranch(profile,scene),packets=[];
 for(let frame=1;frame<=21;frame++){
  const output=branch.step();
  for(const [node,owner]of [[profile.parent.node.index,branch.parent],[profile.node.index,branch.child]]){
   const observed=rows.findLast(r=>r.node===node&&r.frame<=frame&&r.type==='post-leave');
   assert.deepEqual(owner.rng.words,observed.state.rng,'Independent per-emitter shared RNG at F'+frame);
  }
  for(const [instance,row]of output.entries())if(row.packet)packets.push({frame,type:'particle-render-packet',node:profile.node.index,instance,
   vertices:row.packet.vertices,context:{parentState:row.parentState,rng:row.rng}});
 }
 const comparison=compareLifecycleEvents(original,packets);
 assertKnownCenterResiduals(comparison);
 fs.writeFileSync(folder+'standalone-particle-comparison.json',JSON.stringify({comparison,inputs:'Prepared source parameters, initial seeds, unit steps and scene pose only',
  nativeIntermediatesSupplied:false,final:{parentRng:branch.parent.snapshot(),childRng:branch.child.snapshot(),cells:branch.cells}},null,2));
 assert.equal(branch.child.records.length,15);assert.equal(branch.child.rng.draws,165);assert.equal(branch.parent.rng.draws,151);
 assert.ok(branch.joints.every(j=>j.ageTicks===110000));assert.ok(branch.cells.every(c=>c.ageTicks===100000));
});

test('all 182 drawable make windows retain source-child traversal and Particle creation order',()=>{
 const programs=read('tools/data/connected-effect/particle-packet-branch-program.json');
 const records=rows.filter(r=>r.node===profile.node.index&&r.type==='module-enter'&&r.candidates[0].stage==='init'
  &&r.candidates[0].name.includes('13InitVelocityX')).map(r=>r.before.record);
 const expected=rows.filter(r=>r.type==='module-enter'&&r.candidates[0].stage==='make'&&r.candidates[0].name.includes('7scaling11make_vertex'))
  .map(r=>[r.frame,r.node,r.node===profile.node.index?records.indexOf(r.before.record):0]);
 const actual=[];
 for(let frame=1;frame<=21;frame++)for(const row of evaluateNativeSourceBranches(programs,frame,scene))if(row.packet)
  actual.push([frame,row.packet.node,row.packet.instance??0]);
 assert.equal(expected.length,182);assert.deepEqual(actual,expected);
 const quads=read('tools/data/memorial-audit/quad-render-integration/native-quad-writers.json');
 const originalPackets=expected.map(([frame,node,instance])=>node===profile.node.index?
  original.find(r=>r.frame===frame&&r.instance===instance):
  {frame,node,instance,type:'particle-render-packet',vertices:quads.cases.find(c=>c.node===node).result.chain.updates[frame-1].vertices.data});
 const own=[];
 for(let frame=1;frame<=21;frame++)for(const r of evaluateNativeSourceBranches(programs,frame,scene))if(r.packet)
  own.push({frame,node:r.packet.node,instance:r.packet.instance??0,type:'particle-render-packet',vertices:r.packet.vertices,
   context:{parentState:r.parentState??null,rng:r.rng??null}});
 const comparison=compareLifecycleEvents(originalPackets,own);
 assert.equal(comparison.matchedEvents,180);assert.equal(comparison.differences.length,2);
 for(const d of comparison.differences)d.probableCause='Retained Null7 center precision residual; strict comparison remains unequal';
 fs.writeFileSync(folder+'connected-render-comparison.json',JSON.stringify({comparison,cpuOrder:{original:expected,simulator:actual},
  instructionReferences:{quadPackets:32,particlePackets:150},nativeIntermediatesSupplied:false,wholeEffectSupported:false,
  implementation:Object.fromEntries(['nativeLifecycle','nativeTransform','nativeQuad','nativeQuadGraph','nativeParticlePacket','nativeParticleBranch','nativeSourceBranches','originalEffectPlayer']
   .map(n=>[n,createHash('sha256').update(fs.readFileSync('src/effects/'+n+'.mjs')).digest('hex')])),
  externalInputs:programs.externalInputs},null,2));
});

test('writer boundary is exact for all 150 original inputs, separately from independent parent rounding',()=>{
 const branch=new NativeParticleBranch(profile,scene);let checked=0;
 for(let frame=1;frame<=21;frame++)for(const [instance,row]of branch.step().entries())if(row.packet){
  const c=reference.cases.find(c=>c.instance===instance),at=c.windows.findIndex(w=>w.frame===frame);
  const state={...row.state,center:c.windows[at].host.center};
  assert.deepEqual(nativeParticleXPacket(profile,state).vertices,c.result.chain.updates[at].vertices.data);checked++;
 }
 assert.equal(checked,150);
});

test('retained live make fields verify neutral layer tints/alpha and parent init context without new capture',()=>{
 const native=rows.filter(r=>r.node===profile.node.index&&r.type==='module-leave'&&r.candidates[0].stage==='make'
  &&r.candidates[0].name.includes('6color111make_vertex5Const'));
 assert.equal(native.length,150);
 const observed=native.map(r=>{
  const b=Buffer.from(r.after.make.raw,'hex'),read=(at,n)=>Array.from({length:n},(_,i)=>b.readFloatLE(at+4*i));
  const value={seq:r.seq,frame:r.frame,textureTint:read(0x144,4),textureTint2:read(0x154,4),alpha:b.readFloatLE(0x164)};
  assert.deepEqual(value.textureTint,[1,1,1,1]);assert.deepEqual(value.textureTint2,[1,1,1,1]);assert.equal(value.alpha,1);
  return value;
 });
 const init=rows.filter(r=>r.node===profile.parent.node.index&&r.type==='module-enter'&&r.candidates[0].stage==='init'
  &&r.candidates[0].name.includes('11translation16ModuleParamTable'));
 assert.equal(init.length,15);
 for(const r of init)assert.deepEqual(r.before.initInputs,{offset:[0,0,0],velocityMultiplier:[1,1,1]});
 fs.writeFileSync(folder+'retained-context-evidence.json',JSON.stringify({observed,parentInitContexts:init.map(r=>({seq:r.seq,frame:r.frame,...r.before.initInputs})),
  boundary:'Direct H context fields only; drawData pointee and UV trims are outside the captured0x168-byte snapshot. Global shader RGBA is not the make alpha field.'},null,2));
});

test('unsupported materials, inheritance, schedules and dynamic UVs fail closed',()=>{
 for(const change of [p=>p.drawBasis[15]=0,p=>p.node.materialAlpha.value=.5,p=>p.parent.generation.repeatCount=2,
  p=>p.node.authoringInheritance.alphaRate=.5,p=>p.node.staticVectors.texture2.scale.speedInitial[0]=1,
  p=>p.node.nativeMaterialSelection.operation=0]){
  const copy=structuredClone(profile);change(copy);assert.throws(()=>validateNativeParticleBranch(copy));
 }
 const branch=new NativeParticleBranch(profile,scene),state=branch.step()[0].state;
 assert.throws(()=>nativeParticleXPacket(profile,{...state,uvScale:[0,1,1]}));
 assert.throws(()=>nativeParticleXPacket(profile,{...state,rotation:[0,0,1]}));
});

test('the existing shared player displays all five drawable source branches and releases them',async()=>{
 const context=vm.createContext({console});vm.runInContext(fs.readFileSync('public/vendor/three-preview.js','utf8'),context);
 const THREE=context.THREE;THREE.TextureLoader=class{load(url,done){const t=new THREE.Texture({width:1,height:1});queueMicrotask(()=>done(t));return t;}};
 const programs=read('tools/data/connected-effect/particle-packet-branch-program.json');
 const plan=structuredClone(read('public/assets/presentations/cloud_brave_slash/manifest.json').plan);
 const effect=plan.effects.findIndex(e=>e.sha256===programs.sourceSha256),member=plan.members.find(m=>m.effect===effect);
 plan.effects=[plan.effects[effect]];plan.members=[{...member,effect:0,startFrame:0}];plan.nativeQuadBranches=programs;
 const scene3d=new THREE.Scene(),player=await createEffectPlayer(THREE,scene3d,plan);
 assert.equal(player.instanceCount,19);assert.equal(nativeBranchSlots(programs).length,19);
 for(const frame of [1,3,8,10,12,13]){
  player.update(frame,()=>({x:0,y:0,rootScale:[1,1,1]}));
  const snapshot=player.traceSnapshot(),expected=evaluateNativeSourceBranches(programs,frame,{scale:[1,1,1],origin:[0,0,0]});
  assert.equal(snapshot.length,19);
  for(let i=0;i<19;i++){
   assert.equal(snapshot[i].visible,!!expected[i].packet?.visible);
   if(expected[i].packet)assert.deepEqual(JSON.parse(JSON.stringify(snapshot[i].packet)),expected[i].packet);
  }
  if(frame===13)assert.ok(snapshot.every(s=>!s.visible));
 }
 assert.ok(scene3d.children[0].children.slice(4).every(m=>m.material.userData.layers.useShaderAdd.value));
 player.dispose();assert.equal(scene3d.children.length,0);
});
