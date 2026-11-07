import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {layeredMaterial,attachModelVertexRgba,shaderAddEligible,shaderDistortionEligible} from './original_effect_player.mjs';
const THREE={};vm.runInNewContext(fs.readFileSync('tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js','utf8'),{exports:THREE,module:{exports:THREE},console});
test('distortion alpha candidate requires exact initial native selection',()=>{
  const plan={nativeMaterialSelection:{distortionReference:{sha256:'distortion'}}};
  const node={nativeMaterialSelection:{supported:true,distortionCandidateCompatible:true,fragmentSha256:'distortion'}};
  assert.equal(shaderDistortionEligible(plan,node),true);
  assert.equal(shaderDistortionEligible(plan,{}),false);
  assert.equal(shaderDistortionEligible({},node),false);
  assert.equal(shaderDistortionEligible(plan,{nativeMaterialSelection:{...node.nativeMaterialSelection,fragmentSha256:'other'}}),false);
  const m=new THREE.MeshBasicMaterial();
  layeredMaterial(THREE,m,new THREE.Texture(),[[1,1,1,1],[1,1,1,1]],{midpoint:[128,128,128]},false,true);
  const shader={uniforms:{},vertexShader:'#include <uv_vertex>',fragmentShader:'#include <map_fragment>\n#include <color_fragment>'};
  m.onBeforeCompile(shader);
  assert.equal(shader.uniforms.useShaderDistortion.value,true);
  assert.ok(shader.fragmentShader.includes('displacement*=displacementAlpha'));
  assert.ok(shader.fragmentShader.includes('diffuseColor.a*=displacementAlpha'));
});
test('native selection gates Add by exact fragment identity and does not guess unsupported types',()=>{
  const plan={shaderAddReference:{sha256:'reference'},nativeMaterialSelection:{schemaVersion:1}};
  const node={nativeMaterialSelection:{supported:true,addCandidateCompatible:true,fragmentSha256:'reference'}};
  assert.equal(shaderAddEligible(plan,node),true);
  assert.equal(shaderAddEligible(plan,{}),false);
  assert.equal(shaderAddEligible(plan,{nativeMaterialSelection:{...node.nativeMaterialSelection,fragmentSha256:'other'}}),false);
  assert.equal(shaderAddEligible({...plan,shaderAddReference:null},node),false);
  assert.equal(shaderAddEligible({shaderAddReference:plan.shaderAddReference},{}),true);
});
function material(distortion=null,enabled=true){
  const m=new THREE.MeshBasicMaterial();
  layeredMaterial(THREE,m,new THREE.Texture(),[[1,1,1,1],[1,1,1,1]],distortion,enabled);
  return m;
}
test('native-family addition follows model RGBA multiplication rather than being tinted by vertex color twice',()=>{
  const m=material(),geometry=new THREE.PlaneBufferGeometry(1,1);
  attachModelVertexRgba(THREE,geometry,m,Array.from({length:4},()=>({colorBytes:[128,128,128,128]})));
  const shader={uniforms:{},vertexShader:'#include <uv_vertex>\n#include <color_vertex>',fragmentShader:'#include <map_fragment>\n#include <color_fragment>'};
  m.onBeforeCompile(shader);
  assert.ok(shader.fragmentShader.indexOf('diffuseColor*=useModelVertexRgba')<shader.fragmentShader.indexOf('diffuseColor.rgb+=secondLayer.rgb*secondLayer.a'));
  assert.equal(shader.uniforms.useShaderAdd.value,true);
});
test('distortion cannot accidentally opt into the Add equation and the legacy path remains selectable',()=>{
  const old=material(null,false),distortion=material({midpoint:[128,128,128]},true);
  assert.equal(old.userData.layers.useShaderAdd.value,false);
  assert.equal(distortion.userData.layers.useShaderAdd.value,false);
  assert.equal(distortion.userData.shaderAddSupported,false);
  assert.notEqual(old.customProgramCacheKey(),distortion.customProgramCacheKey());
  const shader={uniforms:{},vertexShader:'#include <uv_vertex>',fragmentShader:'#include <map_fragment>\n#include <color_fragment>'};
  distortion.onBeforeCompile(shader);
  assert.ok(!shader.fragmentShader.includes('diffuseColor.rgb+=secondLayer'));
});
