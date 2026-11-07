import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {NativeRandom,activateConstantGenerator,instances} from './original_effect_player.mjs';
import {GENERATION_PROFILE} from './bmb_lifecycle.mjs';
import {NativeGeneratorOwner} from './bmb_lifecycle.mjs';
import {traceEffect,auditLifecycleEvidence,auditConnectedRun} from './trace_bmb_lifecycle.mjs';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const seed=[123456789,362436069,521288629,88675123];
const profile={profile:GENERATION_PROFILE,typeId:3,childCount:0,mode:0,enabled:true,start:0,startRange:0,count:1,duration:4,repeatCount:1,interval:1};

test('native run audit rejects incomplete observation as complete original behavior',()=>{
 const nodes=[{index:0,typeId:0,parent:null}],start={seq:1,type:'capture-start',expectedNodes:nodes,missingHooks:[]};
 const empty=auditConnectedRun([start,{seq:2,type:'capture-end',reason:'controller-failed',missingHooks:[]}],nodes);
 assert.equal(empty.sourceConnectedNativeStates,0);assert.equal(empty.completeNativeNodes,0);assert.equal(empty.nodes[0].status,'MISSING');
 const partial=auditConnectedRun([start,{seq:2,type:'init-enter',call:4,node:0,emitter:'e1'},{seq:3,type:'init-leave',call:4,node:0,state:{id:'e1'}}],nodes);
 assert.equal(partial.nodes[0].initPairs,1);assert.equal(partial.nodes[0].status,'PARTIAL');assert.equal(partial.completeNativeNodes,0);
 assert.ok(partial.issues.some(i=>i.reason.includes('capture-end')));
 assert.throws(()=>auditConnectedRun([start],[{index:1,typeId:0,parent:null}]),/identity mismatch/);
 const broken=auditConnectedRun([start,{seq:9,type:'module-leave',call:999}],nodes);
 assert.ok(broken.issues.some(i=>i.reason.includes('sequence')));assert.ok(broken.issues.some(i=>i.reason==='Unmatched return'));
});

test('connected native run F joins actual parent records and existing common RNG/clock rules',t=>{
 const file='tools/data/memorial-audit/diagnostic-v31-lifecycle/run-f.jsonl';
 if(!fs.existsSync(file)){t.skip('Restore the connected lifecycle reference archive');return;}
 const rows=fs.readFileSync(file,'utf8').trim().split('\n').map(JSON.parse);
 const effect=read('tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json').effects.find(e=>e.sha256===rows[0].sourceSha256);
 const reference=read('tools/data/reconstruction-map/generator-activation-native.json');
 for(const node of effect.nodes)node.nativeGeneration=reference.cases.find(c=>c.sourceSha256===effect.sha256&&c.node===node.index).inputs;
 const audit=auditConnectedRun(rows,effect.nodes.map(n=>({index:n.index,typeId:n.typeId,parent:n.parentIndex})),effect);
 assert.equal(audit.events,914);assert.equal(audit.sourceConnectedNativeStates,232);assert.deepEqual(audit.issues,[]);
 assert.equal(audit.controlled,true);assert.equal(audit.closed,true);assert.equal(audit.completeNativeNodes,0);
 assert.ok(audit.nodes.every(n=>n.status==='PARTIAL'));assert.equal(audit.nodes[0].emitters.length,0);
 assert.equal(audit.nodes[8].emitters.length,1);assert.equal(audit.nodes[8].generatorRecords.length,15);
 assert.equal(audit.parentLinks.length,22);assert.equal(audit.parentLinks.filter(p=>p.node===8&&p.parentNode===7).length,15);
 assert.equal(audit.activationChecks.length,22);assert.ok(audit.activationChecks.every(c=>c.rngMatches));
 assert.equal(audit.clockChecks.length,2);assert.ok(audit.clockChecks.every(c=>c.phasesMatch&&c.returnMatches&&c.ageMatches&&c.contextDeltaMatches));
});

test('common generator owner matches all15 native child activations without cloning their RNG',t=>{
 const file='tools/data/memorial-audit/diagnostic-v32-lifecycle/run-g.jsonl';
 if(!fs.existsSync(file)){t.skip('Restore the connected unit-step lifecycle archive');return;}
 const rows=fs.readFileSync(file,'utf8').trim().split('\n').map(JSON.parse);
 const init=rows.find(r=>r.type==='init-leave'&&r.node===8);
 const generation=read('tools/data/reconstruction-map/generator-activation-native.json').cases.find(c=>c.sourceSha256===rows[0].sourceSha256&&c.node===8).inputs;
 const owner=new NativeGeneratorOwner(init.state.rng,{capacity:15}),rng=owner.rng;
 const fields={mode:0,durationTicks:4,intervalTicks:8,remainingTicks:12,emitted:16,cycleEmitted:20,limit:24,delayTicks:40};
 const measuredInterveningDraws=[];
 for(const before of rows.filter(r=>r.type==='activate-enter'&&r.node===8)){
   // Reuse measured intervening RNG states. This isolates activation ownership;
   // it does not claim that the complete birth/module scheduler is implemented.
   let draws=0;while(JSON.stringify(owner.rng.words)!==JSON.stringify(before.state.rng)&&draws<4096){owner.rng.nextWord();draws++;}
   assert.ok(draws<4096);measuredInterveningDraws.push(draws);
   const after=rows.find(r=>r.type==='activate-leave'&&r.call===before.call);
   const {record}=owner.activate(generation,before.parent.id);
   assert.equal(owner.rng,rng);assert.deepEqual(owner.rng.words,after.state.rng);
   const native=after.state.generatorRecords.records[record.index],bytes=Buffer.from(native.raw,'hex');
   assert.equal(bytes.readBigUInt64LE(32).toString(16),before.parent.pointer.slice(2));
   for(const [key,at]of Object.entries(fields))assert.equal(record.state[key],bytes.readInt32LE(at),'Native activation field '+key);
 }
 assert.equal(owner.records.length,15);assert.equal(new Set(owner.records.map(r=>r.state)).size,15);
 assert.ok(measuredInterveningDraws.some(n=>n>0));
 const words=[...owner.rng.words];assert.throws(()=>owner.activate(generation,'overflow'),/slot reuse/);assert.deepEqual(owner.rng.words,words);
 const duplicate=new NativeGeneratorOwner([1,2,3,4]);duplicate.activate(generation,0);
 assert.throws(()=>duplicate.activate(generation,0),/slot reuse/);
});

test('connected unit steps join actual Null slot lifetimes and per-record make windows',t=>{
 const file='tools/data/memorial-audit/diagnostic-v32-lifecycle/run-g.jsonl';
 if(!fs.existsSync(file)){t.skip('Restore the connected unit-step lifecycle archive');return;}
 const rows=fs.readFileSync(file,'utf8').trim().split('\n').map(JSON.parse);
 const effect=read('tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json').effects.find(e=>e.sha256===rows[0].sourceSha256);
 const audit=auditConnectedRun(rows,effect.nodes.map(n=>({index:n.index,typeId:n.typeId,parent:n.parentIndex})));
 assert.equal(audit.events,6866);assert.equal(audit.sourceConnectedNativeStates,966);assert.deepEqual(audit.issues,[]);
 assert.equal(audit.controlledFrames.length,21);assert.ok(audit.controlledFrames.every((s,i)=>s.delta===1&&s.frame===i+1));
 assert.equal(audit.clockChecks.length,21);assert.ok(audit.clockChecks.every(s=>s.phasesMatch&&s.returnMatches&&s.ageMatches&&s.contextDeltaMatches));
 assert.equal(audit.nullSlotTracks.length,17);
 const node1=audit.nullSlotTracks.find(s=>s.node===1),node5=audit.nullSlotTracks.find(s=>s.node===5);
 assert.equal(node1.samples.at(-1).ageTicks,210000);
 assert.deepEqual(node5.samples.at(-1),{frame:21,lifeTicks:1200000,ageTicks:200000});
 const batches=audit.nullSlotTracks.filter(s=>s.node===7);
 assert.equal(batches.length,15);assert.ok(batches.every((s,i)=>s.birthFrame===1+Math.floor(i/5)&&s.samples.at(-1).ageTicks===110000));
 assert.equal(audit.renderTracks.length,19);
 const particles=audit.renderTracks.filter(s=>s.node===8);
 assert.equal(particles.length,15);assert.ok(particles.every((s,i)=>s.frames.length===10&&s.frames[0]===1+Math.floor(i/5)&&s.frames.at(-1)===10+Math.floor(i/5)));
 assert.equal(audit.completeNativeNodes,0,'Observed lifetimes do not establish every transform/material/release property');
});

const evidenceAudit={traceFile:'tools/data/reconstruction-map/white-prefix-initialization-trace.json',
  planFile:'tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json',referenceFiles:[
    'tools/data/reconstruction-map/generator-activation-native.json',
    'tools/data/reconstruction-map/null-initialization-flags.json',
    'tools/data/connected-effect/brave-slash-null-chains.json',
    'tools/data/connected-effect/brave-slash-null-auxiliary.json',
    'tools/data/connected-effect/brave-slash-quad-geometry.json',
    'tools/data/native-locator-emulation/particle-module-chains.json',
    'tools/data/native-locator-emulation/particle-scheduling-phases.json']};

test('evidence audit joins all source nodes and the previously separate scheduler groups without fabricating a run',()=>{
  const audit=auditLifecycleEvidence(evidenceAudit);
  assert.equal(audit.nodes.length,9);assert.ok(audit.nodes.every(n=>n.status==='PARTIAL'));
  assert.equal(audit.sourceConnectedNativeStates,0);assert.equal(audit.completeNativeNodes,0);
  assert.equal(audit.wholeEffectReconstructed,false);assert.equal(audit.independentFixturesAreNotOneRun,true);
  for(const node of audit.nodes){assert.equal(node.originalBirth,null);assert.equal(node.originalRngState,null);}
  const leaf=audit.nodes[8];
  assert.ok(leaf.evidence.some(e=>e.group==='sourceCases'));
  const initialized=leaf.evidence.find(e=>e.group==='sourceInitializedCases');
  assert.equal(initialized.updateCount,13);assert.ok(initialized.callbackPolicy.includes('neutral parent'));
  assert.equal(initialized.sourceConnected,false);assert.ok(leaf.evidence.some(e=>e.phaseCounts?.init===4));
  const nullNode=audit.nodes[1];
  assert.ok(nullNode.evidence.some(e=>e.auxiliaryFlagFixture===1&&e.chainStatus==='blocked'));
  assert.ok(nullNode.evidence.some(e=>e.auxiliaryFlagFixture===0&&e.chainStatus==='executed'));
  assert.deepEqual(nullNode.evidence.find(e=>e.group==='sourceFields').selectorContext,{parentFlags:null,childFlags:null});
  assert.ok(audit.nodes[6].evidence.some(e=>e.geometrySamples>0));
});

test('evidence audit refuses a changed cached plan identity before accepting any native join',()=>{
  const file='tools/data/reconstruction-map/evidence-audit-invalid-fixture.json';
  const altered=read(evidenceAudit.traceFile);altered.plan.sha256='0'.repeat(64);
  fs.writeFileSync(file,JSON.stringify(altered));
  assert.throws(()=>auditLifecycleEvidence({...evidenceAudit,traceFile:file}),/Pinned experimental source trace\/plan/);
});

test('evidence audit rejects foreign native identity and out-of-source node ownership',()=>{
  const file='tools/data/reconstruction-map/evidence-audit-invalid-reference.json';
  fs.writeFileSync(file,JSON.stringify({nativeSha256:'0'.repeat(64),cases:[]}));
  assert.throws(()=>auditLifecycleEvidence({...evidenceAudit,referenceFiles:[file]}),/Foreign native reference/);
  const original=read(evidenceAudit.referenceFiles[0]);original.cases[0].node=999;
  fs.writeFileSync(file,JSON.stringify(original));
  assert.throws(()=>auditLifecycleEvidence({...evidenceAudit,referenceFiles:[file]}),/outside source/);
});

test('all source activation fields and four-word states agree with pinned native execution',()=>{
  const receipt=read('tools/data/reconstruction-map/generator-activation-native.json');
  assert.equal(receipt.nativeSha256,'6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77');
  assert.equal(receipt.wholeEffectReconstructed,false);
  assert.equal(receipt.cases.length,51);
  for(const c of receipt.cases){
    const r=activateConstantGenerator(c.inputs,new NativeRandom(c.seed));
    for(const [key,value]of Object.entries(c.result))assert.deepEqual(key==='rng'?r.rngAfter.words:r[key],value,`${c.source} node${c.node} ${key}`);
  }
});

test('existing unchanged Particle activation controls retain their measured results',()=>{
  const receipt=read('tools/data/native-locator-emulation/particle-scheduling-phases.json');
  for(const c of receipt.cases){
    const p={...profile,...c.inputs,startRange:c.inputs.start_range??0,repeatCount:c.inputs.repeats??1};
    const r=activateConstantGenerator(p,new NativeRandom(c.inputs.rng??seed)),expected=c.result.initial;
    assert.deepEqual(r.rngAfter.words,expected.rng);
    if(r.active)for(const key of ['mode','durationTicks','intervalTicks','remainingTicks','emitted','cycleEmitted','limit','delayTicks'])assert.equal(r[key],expected[key]);
  }
});

test('native uniform consumes upper23 bits and preserves zero-range draws',()=>{
  const receipt=read('tools/data/native-locator-emulation/particle-module-fixtures.json');
  for(const c of receipt.cases){
    const rng=new NativeRandom(c.inputs.rng??seed),values=Array.from({length:6},()=>rng.uniform());
    assert.deepEqual(rng.snapshot().words,c.result.rngAfter);
    const expected=c.inputs.scale.map((v,i)=>Math.max(0,v-c.inputs.scale_range[i]+2*c.inputs.scale_range[i]*values[i]));
    for(let i=0;i<3;i++)assert.ok(Math.abs(expected[i]-c.result.initialized[i])<.00005);
  }
});

test('activation rejects unknown contracts and does not advance disabled emitters',()=>{
  const rng=new NativeRandom(seed);assert.equal(activateConstantGenerator({...profile,enabled:false},rng).active,false);assert.equal(rng.draws,0);
  for(const changed of [{mode:1},{childCount:1},{typeId:6},{interval:0},{startRange:-1},{enabled:undefined},{count:0},{duration:10001}])
    assert.throws(()=>activateConstantGenerator({...profile,...changed},new NativeRandom(seed)));
  for(const words of [1,[0,0,0,0],[1,2,3],[-1,2,3,4]])assert.throws(()=>new NativeRandom(words));
});

test('instrumenting existing instance generation changes neither samples nor order',()=>{
  const plan=read('tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json'),effect=plan.effects.find(e=>e.name==='atk_slash1_white.bmb');
  const events=[],before=instances(effect,plan.seed,plan.effectHorizon),after=instances(effect,plan.seed,plan.effectHorizon,e=>events.push(e));
  assert.deepEqual(after,before);assert.equal(events.filter(e=>e.phase==='legacy-instance').length,after.length);
  assert.ok(events.some(e=>e.phase==='legacy-rng'));assert.ok(events.some(e=>e.assumptions?.length));
  const receipt=read('tools/data/reconstruction-map/generator-activation-native.json');
  const admitted=structuredClone(effect);
  for(const n of admitted.nodes)n.nativeGeneration=receipt.cases.find(c=>c.sourceSha256===effect.sha256&&c.node===n.index).inputs;
  assert.deepEqual(instances(admitted,plan.seed,plan.effectHorizon),before,'Admitted zero-range activation must preserve the current nine-node preview');
});

test('common instance scheduling applies the native symmetric exclusive delay window when source-admitted',()=>{
  const n={index:0,typeId:3,children:[],staticVectors:{},lifeParameter:10,lifeRangeParameter:0,
    generation:{start:2,startRange:5,count:1,duration:1,repeatCount:1,interval:1}};
  const old=instances({nodes:[n]},1600);
  assert.equal(old[0].birth,7,'Old positive jitter can produce a time outside the original window0..6');
  n.nativeGeneration={...profile,start:2,startRange:5,duration:1};
  const mapped=instances({nodes:[n]},1600);
  assert.equal(mapped[0].birth,0);
  for(let seed=1;seed<=3000;seed+=37)assert.ok(instances({nodes:[n]},seed)[0].birth<=6);
  n.nativeGeneration.mode=1;assert.throws(()=>instances({nodes:[n]},1600),/Unknown native/);
  n.nativeGeneration.mode=0;n.nativeGeneration.enabled=false;
  const events=[];assert.deepEqual(instances({nodes:[n]},1600,180,e=>events.push(e)),[]);
  assert.deepEqual(events,[{phase:'source-disabled-emitter',node:0,parent:null}]);
});

test('whole-source numeric trace replays deterministically and never certifies missing native lifecycle data',async()=>{
  const input={planFile:'tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json',effectName:'atk_slash1_white.bmb',
    referenceFile:'tools/data/reconstruction-map/generator-activation-native.json',
    nullFlagsReferenceFile:'tools/data/reconstruction-map/null-initialization-flags.json'};
  const a=await traceEffect(input),b=await traceEffect(input);
  assert.deepEqual(a,b,'Two executions are intentional determinism controls, not unchanged acceptance reruns');
  assert.equal(a.nodeInventory.length,9);assert.equal(a.activationMatches,9);assert.equal(a.legacyInstanceCount,37);
  assert.equal(a.completeNativeNodes,0);assert.equal(a.wholeEffectReconstructed,false);
  assert.ok(a.frames.every(f=>f.originalInstances===null&&f.originalRngTransitions===null));
  assert.equal(a.frames[0].instances.length,17);assert.equal(a.frames[2].instances.length,37);
  assert.ok(a.frames[0].renderRequests.some(r=>r.vertices.length>0));
  assert.ok(a.frames.some(f=>f.ended.length));
  assert.equal(a.frames.length,181);assert.deepEqual(a.frames[180].instances,[]);
  assert.ok(a.nodeInventory.every(n=>n.originalBirth===null&&n.originalEnd===null));
  const nullNodes=a.nodeInventory.filter(n=>n.nativeNullFlags);
  assert.equal(nullNodes.length,4);
  assert.ok(nullNodes.every(n=>n.nativeNullFlags.auxiliaryFlag===null&&n.nativeNullFlags.childFlags===null));
  assert.equal(a.nullInitializationReference.staticDataflow.initContext60Byte,'NodeTree+0x16');
});
