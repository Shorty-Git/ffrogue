import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {particleGeometryEligibility,particleDisplayWorldMatrix} from './original_effect_player.mjs';
const THREE={};vm.runInNewContext(fs.readFileSync(new URL('./bin/effekseer-webgl-1.80.7/Sample/three.min.js',import.meta.url),'utf8'),{exports:THREE,module:{exports:THREE},console});
function fixture(){
  const vectors=value=>({valueInitial:value,valueRange:[0,0,0],speedInitial:[0,0,0],speedRange:[0,0,0],accelerationInitial:[0,0,0],accelerationRange:[0,0,0]});
  const base=index=>({index,parentIndex:index?0:null,typeId:index?3:0,authoringEmissionShape:'Point',
    resourceBindings:{texture1:{name:'asymmetric-fixture'}},materialControls:{textureCombination:{name:'Basic'}},
    authoringInheritance:{matrix:'On',rotation:'On',scale:'On'},
    particleGeometrySource:{rotationMode:'NewtonDynamics',scaleMode:'NewtonDynamics'},
    staticVectors:{transform:{rotation:vectors([0,0,0]),scale:vectors([1,1,1])}},vectorCurves:{}});
  return {effect:{nodes:[base(0),base(1)]},member:{rotation:[0,0,0],scalePercent:100}};
}
function corners(matrix){return [[-.5,-.5,0],[.5,-.5,0],[.5,.5,0],[-.5,.5,0]].map(p=>new THREE.Vector3(...p).applyMatrix4(matrix));}

test('display plane keeps center and size under XY tilt without changing simulation matrices',()=>{
  for(const x of [0,45,90])for(const y of [0,45,90]){
    const world=new THREE.Matrix4().compose(new THREE.Vector3(8,20,30),new THREE.Quaternion().setFromEuler(new THREE.Euler(x*Math.PI/180,y*Math.PI/180,0)),new THREE.Vector3(2,3,1));
    const before=[...world.elements],display=particleDisplayWorldMatrix(THREE,world),vertices=corners(display);
    assert.deepEqual([...world.elements],before);
    assert.ok(vertices.every(v=>Math.abs(v.z-30)<1e-9));
    assert.ok(Math.abs(Math.max(...vertices.map(v=>v.x))-Math.min(...vertices.map(v=>v.x))-4)<1e-9);
    assert.ok(Math.abs(Math.max(...vertices.map(v=>v.y))-Math.min(...vertices.map(v=>v.y))-6)<1e-9);
    assert.deepEqual([...new THREE.Vector3().setFromMatrixPosition(display).toArray()],[8,20,30]);
  }
});

test('measured native half-extents are reproduced independently of the unresolved center rule',()=>{
  const world=new THREE.Matrix4().compose(new THREE.Vector3(7,9,11),new THREE.Quaternion().setFromEuler(new THREE.Euler(25*Math.PI/180,0,0)),new THREE.Vector3(360*1.775,320*1.775,1.775));
  const vertices=corners(particleDisplayWorldMatrix(THREE,world));
  assert.ok(Math.abs(vertices[1].x-vertices[0].x-1278)<.0001);
  assert.ok(Math.abs(vertices[2].y-vertices[1].y-1136)<.0001);
  assert.deepEqual([...new THREE.Vector3().setFromMatrixPosition(particleDisplayWorldMatrix(THREE,world)).toArray()],[7,9,11]);
});

test('source capability gate permits XY parent tilt but rejects unverified roll, sources and geometry modes',()=>{
  const f=fixture(),eligible=()=>particleGeometryEligibility(f.effect,f.effect.nodes[1],f.member);
  f.effect.nodes[0].staticVectors.transform.rotation.valueInitial=[25,45,0];
  assert.equal(eligible().supported,true);
  for(const mutate of [g=>g.member.rotation[2]=1,g=>g.effect.nodes[0].staticVectors.transform.rotation.valueRange[2]=360,
    g=>g.effect.nodes[1].staticVectors.transform.rotation.speedInitial[0]=1,
    g=>g.effect.nodes[0].staticVectors.transform.scale.valueInitial[1]=2,
    g=>delete g.effect.nodes[0].particleGeometrySource,g=>g.effect.nodes[1].authoringEmissionShape='Model',
    g=>g.effect.nodes[0].vectorCurves.scaleValue={keys:[{}]}]){
    const g=fixture();mutate(g);assert.equal(particleGeometryEligibility(g.effect,g.effect.nodes[1],g.member).supported,false);
  }
});

test('explicit orthonormal view basis works; invalid, mirrored and collapsed transforms do not silently render',()=>{
  const world=new THREE.Matrix4().makeScale(2,3,1);
  const vertices=corners(particleDisplayWorldMatrix(THREE,world,[0,1,0],[-1,0,0]));
  assert.ok(vertices.every(v=>v.z===0));
  assert.throws(()=>particleDisplayWorldMatrix(THREE,world,[1,0,0],[1,0,0]),/orthonormal/);
  assert.throws(()=>particleDisplayWorldMatrix(THREE,world,[NaN,0,0]),/Invalid/);
  assert.throws(()=>particleDisplayWorldMatrix(THREE,new THREE.Matrix4().makeScale(-1,1,1)),/Mirrored/);
  assert.equal(particleDisplayWorldMatrix(THREE,new THREE.Matrix4().makeScale(0,1,1)),null);
});
