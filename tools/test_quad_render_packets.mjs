import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateNativeQuadBranches,nativeQuadParents} from '../src/effects/nativeQuadGraph.mjs';
import {NativeQuadEmitter,validateNativeQuad} from '../src/effects/nativeQuad.mjs';
import {compareLifecycleEvents} from './lib/lifecycle-comparison.mjs';
import vm from 'node:vm';
import {createEffectPlayer} from '../src/effects/originalEffectPlayer.mjs';
import {createHash} from 'node:crypto';
import {projectNativeTranslation} from '../src/effects/nativeLifecycle.mjs';
const folder='tools/data/memorial-audit/quad-render-integration/';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const p=read('tools/data/connected-effect/quad-branch-program.json');
const native=read(folder+'native-quad-writers.json');
const rows=fs.readFileSync('tools/data/memorial-audit/diagnostic-v34-lifecycle/run-h.jsonl','utf8').trim().split('\n').map(JSON.parse);
const scene={scale:[1.774999976158142,1.774999976158142,1.774999976158142],origin:[146,730,0]};
test('source parameters through lifecycle/parents to complete single/two-texture packets match original writer instructions',()=>{
 const original=[],simulator=[],states=[],stateSim=[];
 for(let frame=1;frame<=8;frame++)for(const [i,s]of evaluateNativeQuadBranches(p,frame,scene).entries()){
  const n=p.branches[i].node.index,reference=native.cases.find(c=>c.node===n).result.chain.updates[frame-1];
  const identity={frame,type:'quad-render-packet',node:n,instance:0};
  const fixture=native.cases.find(c=>c.node===n),parent=nativeQuadParents(p.branches[i],scene);
  original.push({...identity,vertices:reference.vertices.data,rng:fixture.result.chain.rngAfterUpdates,
   context:{parentState:fixture.host,referenceKind:'Original instruction replay under captured inputs, not a live GPU packet'}});
  simulator.push({...identity,vertices:s.packet.vertices,rng:s.rng,context:{parentState:parent}});
  const r=rows.findLast(r=>r.frame===frame&&r.node===n&&r.type==='module-leave'&&r.candidates[0].name.includes('color46update'));
  const b=Buffer.from(r.after.recordSnapshot.raw,'hex');
  const post=rows.find(r=>r.node===n&&r.frame===frame&&r.type==='post-leave'),primitive=Buffer.from(post.state.cells.slots[0].raw,'hex');
  const center=Array.from({length:3},(_,i)=>primitive.readFloatLE(12+4*i));
  // Verify that the captured parent really is constant over the reference's eight steps.
  const parentPost=rows.find(r=>r.node===p.branches[i].node.parentIndex&&r.frame===frame&&r.type==='post-leave');
  const parentBytes=Buffer.from(parentPost.state.jointStorage.slots[0].raw,'hex');
  assert.deepEqual(Array.from({length:9},(_,i)=>parentBytes.readFloatLE(40+i*4)),fixture.host.parentBasis);
  assert.deepEqual(Array.from({length:3},(_,i)=>parentBytes.readFloatLE(28+i*4)),fixture.host.center);
  states.push({...identity,seq:r.seq,record:s.record.map((_,i)=>b.readFloatLE(4*i)),rng:r.after.rng,center});
  stateSim.push({...identity,record:s.record,rng:s.rng,
   center:projectNativeTranslation(s.record.slice(6,9),parent,'captured-separate-f32')});
 }
 const packets=compareLifecycleEvents(original,simulator),records=compareLifecycleEvents(states,stateSim);
 const cpuOrder=[];
 for(let frame=1;frame<=8;frame++){
  const original=rows.filter(r=>r.frame===frame&&r.type==='module-enter'&&p.branches.some(b=>b.node.index===r.node)
   &&r.candidates[0].stage==='make'&&r.candidates[0].name.includes('module7scaling11make_vertex')).map(r=>r.node);
  const simulator=[...p.branches].sort((a,b)=>a.order-b.order).map(b=>b.node.index);
  assert.deepEqual(simulator,original);cpuOrder.push({frame,original,simulator,source:'Source-child DFS, no native sequence supplied to simulation'});
 }
 fs.writeFileSync(folder+'quad-packet-comparison.json',JSON.stringify({packets,records,
  cpuOrder,
  inputBoundary:p.externalInputs,originalReference:native.boundary,wholeEffectSupported:false,
  implementation:Object.fromEntries(['nativeLifecycle','nativeTransform','nativeQuad','nativeQuadGraph','originalEffectPlayer'].map(n=>
   [n,createHash('sha256').update(fs.readFileSync('src/effects/'+n+'.mjs')).digest('hex')])),
  materialBoundary:'Source-selected initial Basic/Add fragments and blend table; CPU make order only; live GPU state/order not measured'},null,2));
 assert.deepEqual(records.differences,[]);assert.equal(records.matchedEvents,32);
 assert.deepEqual(packets.differences,[]);assert.equal(packets.matchedEvents,32);
});
test('finite Quad aging, visibility and retained state match the connected native trace',()=>{
 for(let frame=1;frame<=21;frame++)for(const [i,s]of evaluateNativeQuadBranches(p,frame,scene).entries()){
  const node=p.branches[i].node.index,r=rows.find(r=>r.node===node&&r.frame===frame&&r.type==='post-leave');
  assert.equal(s.ageTicks,r.state.cells.slots[0].ageCandidate);
  assert.equal(s.packet!==null,frame<=8);
 }
});
test('unsupported motion, UV and material profiles fail closed',()=>{
 for(const change of [x=>x.node.staticVectors.transform.rotation.valueInitial[2]=1,
  x=>x.node.staticVectors.texture2.scale.valueInitial[0]=0,x=>x.node.nativeMaterialSelection.operation=5,
  x=>x.generation.count=2]){const copy=structuredClone(p.branches[0]);change(copy);assert.throws(()=>validateNativeQuad(copy));}
 const emitter=new NativeQuadEmitter(p.branches[0]);assert.throws(()=>emitter.step(.5,{basis:[],origin:[]}),/unit/);
});

test('the common player consumes calculated packets, both texture layers and original blend descriptors',async()=>{
 const context=vm.createContext({console});vm.runInContext(fs.readFileSync('public/vendor/three-preview.js','utf8'),context);
 const THREE=context.THREE;THREE.TextureLoader=class{load(url,done){const t=new THREE.Texture({width:1,height:1});queueMicrotask(()=>done(t));return t;}};
 const plan=structuredClone(read('public/assets/presentations/cloud_brave_slash/manifest.json').plan);
 const effect=plan.effects.findIndex(e=>e.sha256===p.sourceSha256),member=plan.members.find(m=>m.effect===effect);
 plan.effects=[plan.effects[effect]];plan.members=[{...member,effect:0,startFrame:0}];plan.nativeQuadBranches=p;
 const scene=new THREE.Scene(),player=await createEffectPlayer(THREE,scene,plan);
 player.update(1,()=>({x:0,y:0,rootScale:[1,1,1]}));const snapshot=player.traceSnapshot();
 const expected=evaluateNativeQuadBranches(p,1,{scale:[1,1,1],origin:[0,0,0]});
 for(let i=0;i<4;i++){
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot[i].worldVertices)),expected[i].packet.vertices.map(v=>v.position));
  const material=scene.children[0].children[i].material;
  const rgba=expected[i].packet.vertices[0].rgba;
  assert.equal(material.color.r,rgba[0]/255);assert.equal(material.color.g,rgba[1]/255);assert.equal(material.color.b,rgba[2]/255);
  assert.equal(material.opacity,rgba[3]/255);
  assert.equal(material.depthWrite,false);assert.equal(material.depthTest,false);
  assert.equal(material.blending,THREE.CustomBlending);
  if(p.branches[i].node.nativeMaterialSelection.operation===2){
   assert.ok(material.userData.layers.secondMap.value.isTexture);
   assert.equal(material.userData.layers.useShaderAdd.value,true);
   const a=expected[i].packet.vertices[0].uv2;
   assert.equal(material.userData.layers.layer2Uv.value.elements[6],a[0]);
  }
 }
 player.update(9,()=>({x:0,y:0,rootScale:[1,1,1]}));assert.ok(player.traceSnapshot().every(n=>!n.visible));
 player.dispose();assert.equal(scene.children.length,0);
});
