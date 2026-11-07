import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {attachNativeBasicMaterial,attachModelVertexRgba,shaderBasicEligible} from './original_effect_player.mjs';
const THREE={};vm.runInNewContext(fs.readFileSync('tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js','utf8'),{exports:THREE,module:{exports:THREE},console});

test('Basic tint requires exact native identity and supported source controls',()=>{
  const plan={nativeBasicMaterial:true,nativeMaterialSelection:{basicReference:{sha256:'basic'}}};
  const node={nativeMaterialSelection:{supported:true,basicCandidateCompatible:true,fragmentSha256:'basic'},nativeBasicTint:{supported:true}};
  assert.equal(shaderBasicEligible(plan,node),true);
  assert.equal(shaderBasicEligible({...plan,nativeBasicMaterial:false},node),false);
  assert.equal(shaderBasicEligible(plan,{...node,nativeBasicTint:{supported:false}}),false);
  assert.equal(shaderBasicEligible(plan,{...node,nativeMaterialSelection:{...node.nativeMaterialSelection,fragmentSha256:'other'}}),false);
});
test('Basic clamping follows model RGBA and the legacy branch stays selectable',()=>{
  const material=new THREE.MeshBasicMaterial(),geometry=new THREE.PlaneBufferGeometry(1,1);
  attachNativeBasicMaterial(THREE,material,[4,3,2,.5]);
  attachModelVertexRgba(THREE,geometry,material,Array.from({length:4},()=>({colorBytes:[128,128,128,128]})));
  const shader={uniforms:{},vertexShader:'#include <color_vertex>',fragmentShader:'#include <map_fragment>\n#include <color_fragment>'};
  material.onBeforeCompile(shader);
  assert.ok(shader.fragmentShader.indexOf('diffuseColor*=useModelVertexRgba')<shader.fragmentShader.indexOf('diffuseColor=clamp'));
  assert.equal(shader.uniforms.useNativeBasic.value,true);
  material.userData.nativeBasic.enabled.value=false;
  assert.equal(shader.uniforms.useNativeBasic.value,false);
  assert.throws(()=>attachNativeBasicMaterial(THREE,new THREE.MeshBasicMaterial(),[1,1,1,NaN]));
});
