import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {attachModelVertexRgba} from './original_effect_player.mjs';

const THREE={};
vm.runInNewContext(fs.readFileSync(new URL('./bin/effekseer-webgl-1.80.7/Sample/three.min.js',import.meta.url),'utf8'),{exports:THREE,module:{exports:THREE},console});

test('source RGBA remains normalized bytes and preserves an existing material shader hook',()=>{
  const geometry=new THREE.PlaneBufferGeometry(1,1),material=new THREE.MeshBasicMaterial();
  const vertices=Array.from({length:4},()=>({colorBytes:[128,64,255,0]}));
  const before=JSON.stringify(vertices);
  material.onBeforeCompile=shader=>{shader.uniforms.existingLayer={value:1};};
  attachModelVertexRgba(THREE,geometry,material,vertices);
  const attribute=geometry.attributes.sourceModelColor;
  assert.equal(attribute.normalized,true);
  assert.equal(attribute.count,4);
  assert.deepEqual([...attribute.array],vertices.flatMap(v=>v.colorBytes));
  assert.equal(JSON.stringify(vertices),before);
  const shader={uniforms:{},vertexShader:'#include <color_vertex>',fragmentShader:'#include <color_fragment>'};
  material.onBeforeCompile(shader);
  assert.equal(shader.uniforms.existingLayer.value,1);
  assert.equal(shader.uniforms.useModelVertexRgba.value,true);
  material.userData.modelVertexRgbaEnabled.value=false;
  assert.equal(shader.uniforms.useModelVertexRgba.value,false);
  assert.match(shader.fragmentShader,/diffuseColor\*=useModelVertexRgba/);
  assert.throws(()=>material.onBeforeCompile({uniforms:{},vertexShader:'',fragmentShader:''}),/insertion points/);
});

test('malformed source colors and mismatched vertex counts fail explicitly',()=>{
  const geometry=new THREE.PlaneBufferGeometry(1,1),material=new THREE.MeshBasicMaterial();
  assert.throws(()=>attachModelVertexRgba(THREE,geometry,material,[]),/counts differ/);
  for(const bytes of [[0,0,0],[0,0,0,256],[0,0,0,-1],[0,0,0,.5]])
    assert.throws(()=>attachModelVertexRgba(THREE,geometry,material,Array.from({length:4},()=>({colorBytes:bytes}))),/Invalid source/);
});
