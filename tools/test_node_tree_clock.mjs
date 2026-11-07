import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {NativePhaseClock,PHASE_PROFILE} from './bmb_lifecycle.mjs';
const reference=JSON.parse(fs.readFileSync('tools/data/reconstruction-map/node-tree-dispatch.json','utf8'));
const names={nodes:'nodeCount',life_ticks:'lifeTicks',age_ticks:'ageTicks',continue_flag:'continueFlag',root_disabled:'rootDisabled',
  context_auxiliary:'contextAuxiliary',full_sort:'fullSort',count_a:'countA',count_b:'countB',initial_age:'initialAge',split_initial:'splitInitial'};
for(const [index,c]of reference.cases.entries())test('original NodeTree dispatch control '+index,()=>{
  const input=Object.fromEntries(Object.entries(c.inputs).filter(([k])=>k!=='steps').map(([k,v])=>[names[k]??k,v]));
  const clock=new NativePhaseClock({profile:PHASE_PROFILE,nodeCount:9,...input});
  const actual=c.inputs.steps.map(s=>clock.step(s.delta,{call:s.call??'update',post:s.post??true}));
  assert.deepEqual(actual,c.result.rows);
});
test('phase dispatch supports synchronous common emitter handlers in source table order',()=>{
  const clock=new NativePhaseClock({profile:PHASE_PROFILE,nodeCount:3}),order=[];
  clock.step(1,{onPhase:e=>order.push(e.phase+e.node)});
  assert.deepEqual(order,['update0','update1','update2','post0','post1','post2']);
  assert.throws(()=>new NativePhaseClock({profile:PHASE_PROFILE,loop:true}),/Explicit/);
  assert.throws(()=>clock.step(-1),/Unsupported/);
});
