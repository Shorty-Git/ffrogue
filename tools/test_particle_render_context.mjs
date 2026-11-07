import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {nativeParticleXPacket} from '../src/effects/nativeParticlePacket.mjs';
import {createEffectPlayer} from '../src/effects/originalEffectPlayer.mjs';
import vm from 'node:vm';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const base=read('tools/data/connected-effect/particle-packet-branch-program.json').particleBranches[0];
const reference=read('tools/data/memorial-audit/diagnostic-v35-render-context/writer-context-controls.json');
test('nonidentity camera axes and independent atlas rectangles match the original two-texture writer',()=>{
 for(const c of reference.cases){
  const r=c.result.chain.updates[0],b=Buffer.from(r.recordHex,'hex');
  // This is an isolated writer-boundary test, not a claim of independent init/lifecycle.
  const p={...base,drawBasis:c.inputs.drawBasis,textureTrims:c.inputs.textureTrims};
  const state={center:c.inputs.center,localScale:[b.readFloatLE(0),b.readFloatLE(0),b.readFloatLE(0)],
   groupScale:c.inputs.groupScale,rotation:[0,0,0],uvScale:[20,24,28].map(i=>b.readFloatLE(i)),
   color:[32,36,40].map(i=>b.readFloatLE(i)),alpha:1};
  assert.deepEqual(nativeParticleXPacket(p,state).vertices,r.vertices.data);
 }
 assert.equal(reference.cases.length,12);
});

test('packet playback uploads independent UV2 attributes and separates its shader cache from legacy materials',async()=>{
 const context=vm.createContext({console});vm.runInContext(fs.readFileSync('public/vendor/three-preview.js','utf8'),context);
 const THREE=context.THREE;THREE.TextureLoader=class{load(url,done){const t=new THREE.Texture({width:1,height:1});queueMicrotask(()=>done(t));return t;}};
 const programs=read('tools/data/connected-effect/particle-packet-branch-program.json');
 programs.particleBranches[0].textureTrims=reference.cases[1].inputs.textureTrims;
 const plan=read('public/assets/presentations/cloud_brave_slash/manifest.json').plan;
 const at=plan.effects.findIndex(e=>e.sha256===programs.sourceSha256),member=plan.members.find(m=>m.effect===at);
 plan.effects=[plan.effects[at]];plan.members=[{...member,effect:0,startFrame:0}];plan.nativeQuadBranches=programs;
 const scene=new THREE.Scene(),player=await createEffectPlayer(THREE,scene,plan);player.update(1,()=>({x:0,y:0,rootScale:[1,1,1]}));
 const item=scene.children[0].children[4],packet=player.traceSnapshot()[4].packet;
 assert.deepEqual(Array.from(item.geometry.attributes.sourceSecondUv.array),packet.vertices.flatMap(v=>v.uv2));
 assert.equal(item.material.defines.SOURCE_PACKET_SECOND_UV,1);
 const shader={uniforms:{},vertexShader:'#include <uv_vertex>',fragmentShader:'#include <map_fragment>\n#include <color_fragment>'};
 item.material.onBeforeCompile(shader);
 assert.match(shader.vertexShader,/sourceUv2=sourceSecondUv/);assert.match(shader.fragmentShader,/texture2D\(secondMap,sourceUv2\)/);
 assert.doesNotMatch(shader.fragmentShader,/layer2Uv\*vec3\(sourceUv/);
 player.dispose();assert.equal(scene.children.length,0);
});

test('measured linear sampling configures both texture layers only for admitted packet profiles',async()=>{
 const context=vm.createContext({console});vm.runInContext(fs.readFileSync('public/vendor/three-preview.js','utf8'),context);
 const THREE=context.THREE;THREE.TextureLoader=class{load(url,done){const t=new THREE.Texture({width:1,height:1});queueMicrotask(()=>done(t));return t;}};
 const programs=read('tools/data/connected-effect/particle-packet-branch-program.json');programs.textureSampling={minFilter:9729,magFilter:9729};
 const plan=read('public/assets/presentations/cloud_brave_slash/manifest.json').plan;
 const at=plan.effects.findIndex(e=>e.sha256===programs.sourceSha256),member=plan.members.find(m=>m.effect===at);
 plan.effects=[plan.effects[at]];plan.members=[{...member,effect:0,startFrame:0}];plan.nativeQuadBranches=programs;
 const scene=new THREE.Scene(),player=await createEffectPlayer(THREE,scene,plan);
 let maps=0;for(const mesh of scene.children[0].children){
  for(const map of [mesh.material.map,mesh.material.userData.layers?.secondMap?.value].filter(Boolean)){
   maps++;
   assert.equal(map.minFilter,THREE.LinearFilter);assert.equal(map.magFilter,THREE.LinearFilter);assert.equal(map.generateMipmaps,false);
  }
 }
 assert.equal(maps,35);
 player.dispose();programs.textureSampling.minFilter=9987;
 await assert.rejects(()=>createEffectPlayer(THREE,scene,plan),/Unsupported measured packet texture sampling/);
});

test('prepared native RGBA8 uploads bypass browser PNG conversion and reject truncated data',async()=>{
 const context=vm.createContext({console});vm.runInContext(fs.readFileSync('public/vendor/three-preview.js','utf8'),context);
 const THREE=context.THREE;THREE.TextureLoader=class{load(url,done){const t=new THREE.Texture({width:1,height:1});queueMicrotask(()=>done(t));return t;}};
 const programs=read('tools/data/connected-effect/particle-packet-branch-program.json');
 const plan=read('public/assets/presentations/cloud_brave_slash/manifest.json').plan;
 const at=plan.effects.findIndex(e=>e.sha256===programs.sourceSha256),member=plan.members.find(m=>m.effect===at);
 plan.effects=[plan.effects[at]];plan.members=[{...member,effect:0,startFrame:0}];plan.nativeQuadBranches=programs;
 const url=plan.effects[0].textures[programs.branches[0].node.resourceBindings.texture1.name];
 plan.nativeTextureUploads={[url]:{profile:'cocos-rgba8-premultiplied-v1',width:1,height:1,url:'/prepared.rgba'}};
 const previous=globalThis.fetch;let bytes=Uint8Array.from([64,32,0,128]);
 globalThis.fetch=async target=>{assert.equal(target,'/prepared.rgba');return {ok:true,arrayBuffer:async()=>bytes.buffer};};
 try{
  const scene=new THREE.Scene(),player=await createEffectPlayer(THREE,scene,plan),map=scene.children[0].children[0].material.map;
  assert.deepEqual([...map.image.data],[64,32,0,128]);assert.equal(map.premultiplyAlpha,false);assert.equal(map.flipY,false);
  player.dispose();bytes=new Uint8Array(3);await assert.rejects(()=>createEffectPlayer(THREE,scene,plan),/size mismatch/);
  plan.nativeTextureUploads[url].profile='unknown';await assert.rejects(()=>createEffectPlayer(THREE,scene,plan),/Unsupported prepared texture upload/);
 }finally{globalThis.fetch=previous;}
});
