import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {NativeParticleEmitter,NativePhaseClock,PARTICLE_PROFILE,PHASE_PROFILE,GENERATION_PROFILE} from './bmb_lifecycle.mjs';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const base='tools/data/native-locator-emulation/particle-scheduling-phases.json';
const seed=[123456789,362436069,521288629,88675123];
function compare(a,b,path='state'){
  if(b!==null&&typeof b==='object'){
    assert.deepEqual(Object.keys(a),Object.keys(b),path+' keys');for(const k of Object.keys(b))compare(a[k],b[k],path+'.'+k);
  } else assert.equal(a,b,path);
}
export function emitter(input={}){
  return new NativeParticleEmitter({profile:PARTICLE_PROFILE,generation:{profile:GENERATION_PROFILE,typeId:3,childCount:0,mode:0,
    enabled:input.enabled??true,start:input.start??0,startRange:input.start_range??0,count:input.count??1,duration:input.duration??4,
    repeatCount:input.repeats??1,interval:input.interval??1},words:input.rng??seed,life:input.life??10,lifeRange:input.life_range??0,capacity:input.capacity??128,
    modules:input.scale_module?[{kind:input.scale_module,value:input.scale_value??1,range:input.scale_range??0,
      ...(input.scale_module==='VelocityX'?{velocity:input.scale_velocity??0,velocityRange:input.scale_velocity_range??0}:{})}]:[]});
}
const old=read(base),holdout=read('tools/data/reconstruction-map/particle-lifecycle-holdout.json');
const velocity=read('tools/data/reconstruction-map/particle-velocity-birth.json');
const cases=[...old.initializedCases,...old.sourceInitializedCases,...holdout.cases,...velocity.cases];
for(const [index,c]of cases.entries())test('complete controlled Particle lifecycle '+index+(c.source?' '+c.source+':'+c.node:''),()=>{
  const sim=emitter(c.inputs);assert.deepEqual(sim.initial,c.result.initial);
  const rows=(c.inputs.steps??[1,1,1,1,1]).map(delta=>sim.step(delta,{suspended:c.inputs.suspended??false}));
  compare(rows,c.result.updates);
  assert.deepEqual(sim.requests,c.result.requests);
});
test('shared NodeTree phase clock drives common Particle generation in measured phase order',()=>{
  const clock=new NativePhaseClock({profile:PHASE_PROFILE,nodeCount:1}),sim=emitter({duration:1});
  clock.step(2.5,{onPhase:event=>sim[event.phase](event.delta,{suspended:!!event.suspended})});
  assert.equal(sim.particles[0].ageTicks,25000);assert.equal(sim.state.emitted,1);
  const split=emitter({duration:1});split.step(1);split.step(1.5);
  assert.deepEqual(sim.snapshot(true),split.snapshot(true));
});
