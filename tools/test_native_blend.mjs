import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {applyNativeBlend,nativeBlendSelection} from './original_effect_player.mjs';
const THREE={};vm.runInNewContext(fs.readFileSync('tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js','utf8'),{exports:THREE,module:{exports:THREE},console});
const reference={equation:32774,blendRows:[[0,1,0],[1,770,771],[1,770,1],[1,0,771],[1,1,1],[1,0,769],[1,775,769]]};
const select=id=>nativeBlendSelection({nativeBlend:reference},{materialControls:{blend:{id}}});
test('native alpha factors follow glBlendFunc rather than Three presets',()=>{
  const material=new THREE.MeshBasicMaterial({blending:THREE.NormalBlending});
  applyNativeBlend(THREE,material,select(1));
  assert.equal(material.blending,THREE.CustomBlending);
  assert.equal(material.blendSrcAlpha,THREE.SrcAlphaFactor);
  assert.equal(material.blendDstAlpha,THREE.OneMinusSrcAlphaFactor);
  applyNativeBlend(THREE,material,select(2));
  assert.equal(material.blendDstAlpha,THREE.OneFactor);
  applyNativeBlend(THREE,material,select(2),false);
  assert.equal(material.blending,THREE.NormalBlending);
});
test('disabled and inverse-color factors retain their exact alpha components',()=>{
  const material=new THREE.MeshBasicMaterial();
  applyNativeBlend(THREE,material,select(0));assert.equal(material.blending,THREE.NoBlending);
  applyNativeBlend(THREE,material,select(6));
  assert.equal(material.blendSrc,THREE.OneMinusDstColorFactor);
  assert.equal(material.blendSrcAlpha,THREE.OneMinusDstAlphaFactor);
  assert.equal(material.blendDstAlpha,THREE.OneMinusSrcAlphaFactor);
});
test('unknown state IDs and altered equations cannot silently become additive',()=>{
  for(const id of [-1,7,1.5,undefined])assert.equal(select(id),null);
  assert.equal(nativeBlendSelection({},{}),null);
  assert.throws(()=>nativeBlendSelection({nativeBlend:{...reference,equation:0}},{}),/reference/);
  assert.throws(()=>applyNativeBlend(THREE,new THREE.MeshBasicMaterial(),{row:[1,9999,1]}),/factor/);
});
