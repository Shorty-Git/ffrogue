import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeGeneratorOwner,nativeParentActive,advanceNativeJoint} from '../src/effects/nativeLifecycle.mjs';
import {compareLifecycleEvents} from './lib/lifecycle-comparison.mjs';
import {replayParentGenerators} from './lib/parent-generator-replay.mjs';

const file='tools/data/memorial-audit/diagnostic-v32-lifecycle/run-g.jsonl';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
function fixture(){
  const rows=fs.readFileSync(file,'utf8').trim().split('\n').map(JSON.parse);
  const effect=read('tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json').effects.find(e=>e.sha256===rows[0].sourceSha256);
  const ref=read('tools/data/reconstruction-map/generator-activation-native.json');
  assert.equal(ref.nativeSha256,'6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77');
  return {rows,effect,generations:new Map(effect.nodes.map(n=>[n.index,ref.cases.find(c=>c.sourceSha256===effect.sha256&&c.node===n.index).inputs]))};
}
test('connected shared-owner projection matches complete retained scheduler event sequence',t=>{
  if(!fs.existsSync(file)){t.skip('Restore the retained connected native run G');return;}
  const {rows,effect,generations}=fixture(),r=replayParentGenerators(rows,effect,generations);
  assert.equal(r.originalEvents,1734);assert.equal(r.matchedEvents,1734);assert.deepEqual(r.differences,[]);
  assert.equal(r.firstDivergence,null);assert.equal(r.boundary.fullSourceReconstructed,false);
  assert.equal(r.final.owners[0].rng.draws,151);assert.equal(r.final.owners[1].rng.draws,165);
  assert.equal(r.final.owners[1].records.length,15);
  assert.equal(r.final.host.ageTicks,210000);assert.ok(r.final.parents.every(p=>p.ageTicks===110000));
  assert.ok(r.final.cells.every(p=>p.ageTicks===100000));
  assert.equal(r.jointChecks.length,21);for(const c of r.jointChecks)assert.deepEqual(c.simulator,c.original);
  assert.deepEqual(r.scalarComparison,{observations:300,values:600,maximumAbsoluteResidual:0});
  assert.deepEqual(r.simulated.filter(e=>e.type==='activate-enter'&&e.node===8).map(e=>e.frame),Array.from({length:15},(_,i)=>1+Math.floor(i/5)));
  for(let slot=0;slot<15;slot++)assert.deepEqual(r.simulated.filter(e=>e.type==='make-window'&&e.instance===slot).map(e=>e.frame),Array.from({length:10},(_,i)=>1+Math.floor(slot/5)+i));
});
test('negative controls identify first shared-seed and parent-expiry divergences',t=>{
  if(!fs.existsSync(file)){t.skip('Restore the retained connected native run G');return;}
  const {rows,effect,generations}=fixture();
  const clones=replayParentGenerators(rows,effect,generations,{cloneChildSeeds:true});
  assert.equal(clones.firstDivergence.originalEvent.seq,142);assert.equal(clones.firstDivergence.frame,1);
  assert.match(clones.firstDivergence.probableCause,/RNG/);
  const unbounded=replayParentGenerators(rows,effect,generations,{ignoreParentGate:true});
  assert.equal(unbounded.firstDivergence.frame,11);assert.equal(unbounded.firstDivergence.instance,0);
  assert.ok(unbounded.firstDivergence.parentState.simulator);assert.ok(unbounded.firstDivergence.rngState.simulator);
});
test('diff preserves actual order and reports missing, extra and changed states with context',()=>{
  const a=[1,2,3].map(i=>({seq:i,frame:1,type:'step',node:8,instance:i,rng:[1,2,3,4],parent:{ageTicks:10,lifeTicks:10}}));
  const b=structuredClone(a);b.splice(1,1);b[1].rng[0]=9;
  const diff=compareLifecycleEvents(a,b);assert.equal(diff.differences.length,2);
  assert.equal(diff.firstDivergence.originalEvent.seq,2);assert.equal(diff.firstDivergence.simulatorEvent,null);
  assert.deepEqual(diff.differences[1].rngState,{original:[1,2,3,4],simulator:[9,2,3,4]});
  assert.deepEqual(compareLifecycleEvents([],a).differences.map(d=>d.simulatorEvent.instance),[1,2,3]);
});
test('parent boundary is inclusive, retained, explicit and independent of RNG',()=>{
  const joint={lifeTicks:10000,ageTicks:10000},parent={lifeTicks:20000,ageTicks:20000};
  assert.equal(nativeParentActive(joint),true);advanceNativeJoint(joint,1,parent);
  assert.equal(joint.ageTicks,20000);assert.equal(nativeParentActive(joint),false);
  advanceNativeJoint(joint,1,null);assert.equal(joint.ageTicks,20000);
  const child={lifeTicks:1200000,ageTicks:200000};advanceNativeJoint(child,1,{lifeTicks:200000,ageTicks:210000});
  assert.equal(child.ageTicks,200000);assert.throws(()=>nativeParentActive(undefined),/Explicit/);
  assert.throws(()=>nativeParentActive({lifeTicks:0,ageTicks:0}),/Explicit/);
});
test('independent records keep their own scheduler clocks and share callback RNG',()=>{
  const owner=new NativeGeneratorOwner([1,2,3,4]);
  const g={profile:'native-constant-activation-v1',typeId:3,childCount:0,mode:0,enabled:true,start:0,startRange:0,count:1,duration:3,repeatCount:1,interval:1};
  owner.activate(g,'a');owner.activate({...g,start:1},'b');
  const requests=[],parents={a:{lifeTicks:10000,ageTicks:0},b:{lifeTicks:30000,ageTicks:0}};
  const phase={parentState:id=>parents[id],onBirth:({record,rng})=>{requests.push(record.parent);rng.nextWord();}};
  owner.update(1,phase);owner.post(1,{parentState:phase.parentState,onRecord:()=>{}});
  parents.a.ageTicks=20000;owner.update(1,phase);
  assert.deepEqual(requests,['a','b']);assert.equal(owner.rng.draws,4);
  assert.equal(owner.records[0].state.emitted,1);assert.equal(owner.records[1].state.emitted,1);
  const words=[...owner.rng.words];assert.throws(()=>owner.update(1,{onBirth:()=>{}}),/Explicit/);assert.deepEqual(owner.rng.words,words);
  for(const change of [{typeId:2},{repeatCount:2}]){
    const unsupported=new NativeGeneratorOwner([1,2,3,4]);unsupported.activate({...g,...change},0);
    const before=unsupported.snapshot();assert.throws(()=>unsupported.update(1,{parentState:()=>null,onBirth:()=>{}}),/Unadmitted/);
    assert.deepEqual(unsupported.snapshot(),before);
  }
});
