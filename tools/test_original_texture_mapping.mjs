import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {updateBasicTextureMap,instances,createTransformEvaluator} from './original_effect_player.mjs';
const THREE={};
vm.runInNewContext(fs.readFileSync('tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js','utf8'),{exports:THREE,module:{exports:THREE},console});
const vector=value=>({value,speed:[0,0,0],acceleration:[0,0,0]});
const fixture=()=>({node:{motionModes:{},vectorCurves:{},texturePivots:{texture1:[.5,.5,.5]},basicTextureMapping:{supported:true,motionModes:{translation:'NewtonDynamics',rotation:'NewtonDynamics',scale:'NewtonDynamics'}}},item:{life:60,sampled:{texture1:{translation:vector([-.1,0,0]),rotation:vector([0,0,-90]),scale:vector([1,1,1])}}}});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function mapped(map,u,v){return new THREE.Vector3(u,v,1).applyMatrix3(map.matrix);}

test('basic map uses source angle/pivot and toggles back without stale GPU matrix state',()=>{
 const {node,item}=fixture(),map=new THREE.Texture(),before=JSON.stringify({node,item});
 updateBasicTextureMap(map,node,item,0,true);
 const transformed=mapped(map,.25,.75);near(transformed.x,.25);near(transformed.y,.35);
 assert.equal(map.matrixAutoUpdate,false);
 const corrected=[...map.matrix.elements];
 updateBasicTextureMap(map,node,item,0,false);
 const legacy=mapped(map,.25,.75);near(legacy.x,.35);near(legacy.y,.75);
 assert.equal(map.matrixAutoUpdate,true);
 updateBasicTextureMap(map,node,item,0,true);assert.deepEqual([...map.matrix.elements],corrected);
 assert.equal(JSON.stringify({node,item}),before);
});

test('explicit constant UV mode suppresses dormant velocity; unsupported mapping retains legacy',()=>{
 const {node,item}=fixture(),map=new THREE.Texture();
 node.basicTextureMapping.motionModes.rotation='Constant';item.sampled.texture1.rotation.speed=[0,0,100];
 updateBasicTextureMap(map,node,item,0,true);const initial=[...map.matrix.elements];
 updateBasicTextureMap(map,node,item,20,true);assert.deepEqual([...map.matrix.elements],initial);
 node.basicTextureMapping.supported=false;updateBasicTextureMap(map,node,item,20,true);const fallback=[...map.matrix.elements];
 updateBasicTextureMap(map,node,item,20,false);assert.deepEqual([...map.matrix.elements],fallback);
});

test('actual wave layers change UVs while their source geometry and world transforms stay identical',t=>{
 const path='tools/data/shared-skill-review/blade-beam/plan-basic-uv.json';
 if(!fs.existsSync(path))return t.skip('Prepared Basic UV plan required');
 const plan=JSON.parse(fs.readFileSync(path)),effect=plan.effects[0],built=instances(effect,plan.seed,plan.effectHorizon),evaluate=createTransformEvaluator(THREE,effect,built);
 const before=JSON.stringify(effect),worldBefore=evaluate(24,true,true).map(v=>v.matrix.toArray()),changed=[];
 for(const i of built){const n=effect.nodes[i.node];if(!n.basicTextureMapping?.supported)continue;
  const map=new THREE.Texture();updateBasicTextureMap(map,n,i,24-i.birth,false);const old=[...map.matrix.elements];
  updateBasicTextureMap(map,n,i,24-i.birth,true);
  if(old.some((v,j)=>Math.abs(v-map.matrix.elements[j])>1e-6))changed.push(i.node);
 }
 assert.deepEqual([...new Set(changed)],[5,7,8]);
 assert.deepEqual(evaluate(24,true,true).map(v=>v.matrix.toArray()),worldBefore);
 assert.equal(JSON.stringify(effect),before);
});
