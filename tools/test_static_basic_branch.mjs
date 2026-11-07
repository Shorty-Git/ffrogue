import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {evaluateStaticBasicBranch,validateStaticBasicBranch} from '../src/effects/nativeStaticBasicBranch.mjs';
import {evaluateNativeSourceBranches,nativeBranchSlots} from '../src/effects/nativeSourceBranches.mjs';
import {NativeRandom,initializeNativeScalar} from '../src/effects/nativeLifecycle.mjs';
import {createEffectPlayer} from '../src/effects/originalEffectPlayer.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));
const path='tools/data/gameplay-quality-20261028/capsule/manifest.json';

test('OneX has no initializer record or random consumption',()=>{
 const r=new NativeRandom([1,2,3,4]),before=r.snapshot();assert.deepEqual(initializeNativeScalar({kind:'OneX',value:1,range:0},r),[]);
 assert.deepEqual(r.snapshot(),before);assert.throws(()=>initializeNativeScalar({kind:'OneX',value:2,range:0},r));
});

test('static Default/OneX/Basic source reproduces all123 existing Capsule writer states',t=>{
 if(!fs.existsSync(path)){t.skip('Optional compiled Capsule control unavailable');return;}
 const m=read(path),reference=read('tools/data/connected-effect/capsule.json'),p=m.plan.nativeQuadBranches.staticBasicBranches[0];
 assert.equal(m.plan.effects[0].sha256,reference.sourceSha256);let values=0,max=0,parentMax=0;
 for(const expected of reference.frames){
  const actual=evaluateStaticBasicBranch(p,expected.frame,{origin:reference.root.center,scale:reference.root.scale});
  actual.parents.forEach((parent,i)=>{
   const original=reference.parents[i];
   for(const [a,b]of [[parent.origin,original.center],[parent.scale,original.scale],[parent.basis,original.basis]])
    a.forEach((value,j)=>{const delta=Math.abs(value-b[j]);parentMax=Math.max(parentMax,delta);assert.ok(delta<.000001);});
  });
  assert.equal(actual.packet?.vertices.length??0,expected.vertices.length,'frame'+expected.frame);
  for(const [i,v]of expected.vertices.entries()){
   const w=actual.packet.vertices[i];assert.deepEqual(w.uv,v.uv);assert.deepEqual(w.rgba,v.rgba);assert.deepEqual(w.textureTint,v.textureTint);
   for(let c=0;c<3;c++){const delta=Math.abs(w.position[c]-v.position[c]);max=Math.max(max,delta);assert.ok(delta<=.00001,`F${expected.frame} vertex${i}:${c} delta${delta}`);values++;}
  }
 }
 assert.equal(reference.frames.length,123);assert.equal(values,2178);
 t.diagnostic(JSON.stringify({frames:123,positionValues:values,maxAbsolute:max,parentMaxAbsolute:parentMax,nativeParentMatricesSupplied:false}));
 for(const mutation of [x=>x.parents[2].local.rotation[2]=.1,x=>x.node.nativeMaterialSelection.operation=2,
   x=>x.simulation.generation.count=2,x=>x.node.nativeParticleX.scale.index=16]){
  const bad=structuredClone(p);mutation(bad);assert.throws(()=>validateStaticBasicBranch(bad));
 }
});

test('static Basic profile reaches the existing shared player with the original texture and cleanup',async t=>{
 if(!fs.existsSync(path)){t.skip('Optional compiled Capsule control unavailable');return;}
 const c=vm.createContext({console});vm.runInContext(fs.readFileSync('public/vendor/three-preview.js','utf8'),c);const T=c.THREE;
 T.TextureLoader=class{load(url,done){assert.match(url,/aa6ceaaa.*\.png$/);const map=new T.Texture();queueMicrotask(()=>done(map));return map;}};
 const m=read(path),s=new T.Scene(),player=await createEffectPlayer(T,s,m.plan);
 assert.equal(nativeBranchSlots(m.plan.nativeQuadBranches).length,1);
 player.update(30,()=>({x:0,y:0}));assert.equal(player.traceSnapshot()[0].visible,true);
 player.update(122,()=>({x:0,y:0}));assert.equal(player.traceSnapshot()[0].visible,false);
 assert.equal(evaluateNativeSourceBranches(m.plan.nativeQuadBranches,1,{origin:[0,0,0],scale:[1,1,1]})[0].packet.material.operation,0);
 player.dispose();assert.equal(s.children.length,0);
});
