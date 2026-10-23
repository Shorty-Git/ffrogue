import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createTransformEvaluator,inheritanceLimitations,instances} from './original_effect_player.mjs';
const THREE={};
vm.runInNewContext(fs.readFileSync('tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js','utf8'),{exports:THREE,module:{exports:THREE},console});
const modes={matrix:'On',translation:'On',rotation:'On',scale:'On',alphaRate:0,colorRate:0};
const vector=(value,speed=[0,0,0])=>({value,speed,acceleration:[0,0,0]});
function item(parent,birth,translation=[0,0,0],speed=[0,0,0],rotation=[0,0,0],scale=[1,1,1]){
 return {parent,birth,life:100,sampled:{transform:{translation:vector(translation,speed),rotation:vector(rotation),scale:vector(scale)}}};
}
const node=(alpha=1,source=modes)=>({authoringInheritance:source,motionModes:{},vectorCurves:{},alphaCurve:{keys:[{frame:0,value:alpha,type:'Constant'}]}});
const make=(nodes,items)=>createTransformEvaluator(THREE,{nodes},items.map((v,i)=>({...v,node:i})));
const x=row=>row.matrix.elements[12];

test('zero alpha influence preserves local alpha; unsupported rates preserve explicit legacy behavior',()=>{
 const evaluate=make([node(.4),node(.8),node(.8,{...modes,alphaRate:1})],[item(null,0),item(0,0),item(0,0)]);
 assert.equal(evaluate(10,true)[1].alpha,.8);
 assert.ok(Math.abs(evaluate(10,false)[1].alpha-.32)<1e-12);
 assert.ok(Math.abs(evaluate(10,true)[2].alpha-.32)<1e-12);
 assert.match(inheritanceLimitations({...modes,alphaRate:1}).join(),/nonzero/);
 assert.match(inheritanceLimitations(null).join(),/unavailable/);
});

test('birth translation retains live rotation and scale while local movement continues',()=>{
 const parent=item(null,0,[10,0,0],[4,0,0],[0,0,0],[2,2,2]);
 parent.sampled.transform.rotation.speed=[0,0,30];parent.sampled.transform.scale.speed=[.1,.1,.1];
 const evaluate=make([node(),node(1,{...modes,translation:'OnGenerateTime'})],
  [parent,item(0,.5,[3,0,0],[2,0,0])]);
 const fixed=evaluate(4,true)[1],legacy=evaluate(4,false)[1];
 assert.ok(Math.abs(x(fixed))<1e-10);assert.ok(Math.abs(x(legacy)-14)<1e-10);
 assert.ok(Math.abs(fixed.matrix.elements[13]-24*Math.sin(2*Math.PI/3))<1e-10);
});

test('nested fractional snapshots are independent of seek order and parent instance identity',()=>{
 const nodes=[node(),node(1,{...modes,translation:'OnGenerateTime'}),node(1,{...modes,translation:'OnGenerateTime'}),node(),node(1,{...modes,translation:'OnGenerateTime'})];
 const items=[item(null,0,[0,0,0],[10,0,0]),item(0,.5,[0,0,0],[2,0,0]),item(1,1.25,[1,0,0],[1,0,0]),item(null,0,[100,0,0],[20,0,0]),item(3,.75)];
 const evaluate=make(nodes,items),direct=evaluate(10,true);
 assert.equal(x(direct[2]),16.25);assert.equal(x(direct[4]),115);
 for(let frame=0;frame<=10;frame+=.25)evaluate(frame,true);
 for(const frame of [80,2,10,0,10])evaluate(frame,true);
 assert.deepEqual(evaluate(10,true).map(r=>r.matrix.toArray()),direct.map(r=>r.matrix.toArray()));
 const fresh=make(nodes,items);assert.deepEqual(fresh(10,true).map(r=>r.matrix.toArray()),direct.map(r=>r.matrix.toArray()));
 assert.throws(()=>evaluate(NaN,true),/Invalid effect frame/);
});

test('missing supplements and unsupported transform combinations remain explicit legacy cases',()=>{
 for(const source of [undefined,{...modes,rotation:'Off',translation:'OnGenerateTime'}]){
  const nodes=[node(),node()];nodes[1].authoringInheritance=source;
  const evaluate=make(nodes,[item(null,0,[0,0,0],[10,0,0]),item(0,1)]);
  assert.equal(x(evaluate(5,true)[1]),50);
  assert.ok(inheritanceLimitations(source).length>0);
 }
});

test('local original cases reproduce the audit and correct only the supported inheritance behavior',t=>{
 const read=name=>`tools/data/shared-skill-review/${name}/plan-inheritance.json`;
 if(!fs.existsSync(read('brave-slash'))||!fs.existsSync(read('climhazzard')))return t.skip('Prepared inheritance source plans are required');
 const brave=JSON.parse(fs.readFileSync(read('brave-slash'))),effect=brave.effects[0],built=instances(effect,brave.seed,brave.effectHorizon),evaluate=createTransformEvaluator(THREE,effect,built);
 assert.equal(built[95].node,12);
 assert.ok(Math.abs(evaluate(20,false)[95].alpha-.3521788364585305)<1e-10);
 assert.ok(Math.abs(evaluate(20,true)[95].alpha-.9259259673180379)<1e-10);
 const climh=JSON.parse(fs.readFileSync(read('climhazzard'))),slash=climh.effects.find(e=>e.name==='atk_slash7_side_purple.bmb'),parts=instances(slash,climh.seed,climh.effectHorizon),run=createTransformEvaluator(THREE,slash,parts);
 assert.equal(parts[14].node,10);assert.equal(parts[14].birth,2);
 assert.ok(Math.abs((x(run(31,true)[14])-x(run(31,false)[14]))-395.64605602408653)<1e-8);
 const direct=run(31,true)[14].matrix.toArray();for(let f=0;f<=31;f++)run(f,true);
 assert.deepEqual(run(31,true)[14].matrix.toArray(),direct);
});
