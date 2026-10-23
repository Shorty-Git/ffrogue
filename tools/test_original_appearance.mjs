import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {localAlpha,localColor,createTransformEvaluator,instances} from './original_effect_player.mjs';
const THREE={};
vm.runInNewContext(fs.readFileSync('tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js','utf8'),{exports:THREE,module:{exports:THREE},console});
const curve=values=>values.map((value,i)=>({value,frame:i/(values.length-1),type:'Linear'}));

test('source selector makes dormant alpha keys irrelevant and uses Curve instead of multiplying Constant',()=>{
 const node={alphaCurve:{keys:curve([0,1])},materialAlpha:{value:.5},appearance:{alpha:{mode:'Constant',value:.5}}};
 for(const time of [0,.25,.5,1])assert.equal(localAlpha(node,time,true),.5);
 node.alphaCurve.keys=curve([900,-800]);assert.equal(localAlpha(node,.75,true),.5);
 node.appearance.alpha.mode='Curve';node.alphaCurve.keys=curve([0,1]);
 assert.equal(localAlpha(node,.5,true),.5);assert.equal(localAlpha(node,.5,false),.25);
 node.alphaCurve.keys=[];assert.throws(()=>localAlpha(node,.5,true),/empty curve/);
 node.appearance.alpha.mode='Unresolved';assert.throws(()=>localAlpha(node,.5,true),/unknown/);
});

test('selected RGB curves override the constant value and react to active key changes',()=>{
 const keys=[0,1].map(frame=>({frame,value:[frame,1-frame,.5],types:['Linear','Linear','Linear'],slopeLeft:[0,0,0],slopeRight:[0,0,0]}));
 const node={initialColor:[.2,.2,.2],vectorCurves:{centerColor:{keys}},appearance:{color:{mode:'Curve',supported:true,domain:'center',value:[.2,.2,.2]}}};
 assert.deepEqual(localColor(node,.25,true),[.25,.75,.5]);
 keys[1].value=[0,0,0];assert.deepEqual(localColor(node,1,true),[0,0,0]);
 node.appearance.color.mode='Constant';assert.deepEqual(localColor(node,1,true),[.2,.2,.2]);
});

const load=(t,name)=>{
 const path=`tools/data/shared-skill-review/${name}/plan-appearance.json`;
 if(!fs.existsSync(path)){t.skip('Prepared appearance source plans required');return null;}
 return JSON.parse(fs.readFileSync(path));
};

test('real strobe stays white throughout life; legacy branch reproduces the dormant color change',t=>{
 const plan=load(t,'climhazzard');if(!plan)return;
 const node=plan.effects.find(e=>e.name==='eff_strobe_white_a50_f30.bmb').nodes[3];
 for(let time=0;time<=1;time+=.05)assert.deepEqual(localColor(node,time,true),[1,1,1]);
 assert.notDeepEqual(localColor(node,.5,false),[1,1,1]);
 const mutated=structuredClone(node);mutated.vectorCurves.centerColor.keys=[];
 assert.deepEqual(localColor(mutated,.5,true),[1,1,1]);
});

test('Brave source Constant colors and alpha ignore their stored curves at every sampled lifetime',t=>{
 const plan=load(t,'brave-slash');if(!plan)return;const effect=plan.effects[0];
 for(const index of effect.appearanceReport.dormantAlphaCurves){
  const node=effect.nodes[index];for(let time=0;time<=1;time+=.125)assert.equal(localAlpha(node,time,true),node.materialAlpha.value);
 }
 for(const index of effect.appearanceReport.dormantColorCurves){
  const node=effect.nodes[index];for(let time=0;time<=1;time+=.125)assert.deepEqual(localColor(node,time,true),node.initialColor);
 }
 const built=instances(effect,plan.seed,plan.effectHorizon),evaluate=createTransformEvaluator(THREE,effect,built);
 const index=built.findIndex(i=>i.node===15),time=built[index].birth+built[index].life*.75;
 assert.ok(Number.isFinite(evaluate(time,true,true)[index].alpha));
 const before=evaluate(time,true,false),after=evaluate(time,true,true);
 assert.deepEqual(after.map(r=>r.matrix.toArray()),before.map(r=>r.matrix.toArray()));
 assert.notEqual(after[index].alpha,before[index].alpha);
});

test('all three prepared skills seek finite states; unresolved color remains explicitly unsupported',t=>{
 for(const name of ['brave-slash','blade-beam','climhazzard']){
  const plan=load(t,name);if(!plan)return;
  for(const effect of plan.effects){
   const built=instances(effect,plan.seed,plan.effectHorizon),evaluate=createTransformEvaluator(THREE,effect,built);
   for(const frame of [0,3,20,42,90,180,3])for(const [i,row] of evaluate(frame,true,true).entries()){
    assert.ok(Number.isFinite(row.alpha));assert.ok(row.matrix.elements.every(Number.isFinite));
    assert.ok(localColor(effect.nodes[built[i].node],row.age/built[i].life,true).every(Number.isFinite));
   }
  }
 }
 const plan=load(t,'climhazzard'),node=plan.effects.find(e=>e.name==='atk_powergeyser_001_purple.bmb').nodes[15];
 assert.equal(node.appearance.color.supported,false);assert.match(node.appearance.limitations.join(),/selector unresolved/);
 assert.deepEqual(localColor(node,.5,true),localColor(node,.5,false));
});
