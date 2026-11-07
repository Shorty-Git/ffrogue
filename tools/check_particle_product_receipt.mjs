// Compare saved real-product states with independent controlled native receipts.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {NativeParticleEmitter} from '../src/effects/nativeLifecycle.mjs';
const args=process.argv.slice(2),get=name=>args.includes(name)?args[args.indexOf(name)+1]:undefined;
for(const name of ['--receipt','--reference','--manifest','--output'])if(!args.includes(name))throw Error('Required '+name);
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const product=read(get('--receipt')),reference=read(get('--reference')),manifest=read(get('--manifest'));
assert.equal(product.passed,true);
assert.equal(reference.nativeSha256,'6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77');
assert.equal(manifest.kind,'native-particle-basic-v1');
const control=reference.cases[Number(get('--case')??0)];
const selected=product.results.find(r=>r.kind===(get('--kind')??'native-particle-control'));
const samples=selected?.samples,commonOnly=args.includes('--common-only');
if(selected?.program){assert.ok(commonOnly,'A changed product program cannot inherit an independent native fixture');manifest.program=selected.program;}
assert.ok(samples?.length,'Real product samples absent');
let maximumWidthResidualPx=0;
const deltas=control.inputs.steps??[1,1,1,1,1];
assert.ok(deltas.every(delta=>delta===1),'Only unit-step product alignment is admitted here');
for(let frame=1;frame<=(commonOnly?0:control.result.updates.length);frame++){
  const actual=samples.find(s=>s.frame===frame),expected=control.result.updates[frame-1];
  assert.ok(actual,'Missing captured product source frame '+frame);
  assert.deepEqual(actual.state.particles,expected.particles);
  assert.deepEqual(actual.state.rng,expected.rng);
  for(const image of actual.images){
    const particle=expected.particles.find(p=>p.slot===image.slot);
    const width=2*particle.moduleRecord[0]*manifest.program.groupScaleX*manifest.program.pixelsPerUnit;
    maximumWidthResidualPx=Math.max(maximumWidthResidualPx,Math.abs(width-image.width));
    assert.equal(image.width,image.height);
  }
}
assert.ok(maximumWidthResidualPx<1e-5);
assert.ok(samples.at(-1).done&&samples.at(-1).images.length===0,'Cleanup missing');
// Check every captured product state against the common scheduler too. This
// extends product integration coverage, not the independent native reference.
const simulation=new NativeParticleEmitter(manifest.program.simulation),lastFrame=samples.at(-1).frame;
assert.ok(Number.isInteger(lastFrame)&&lastFrame>=1&&lastFrame<=manifest.program.frameBudget);
let simulationSamples=0;
for(let frame=0;frame<=lastFrame;frame++){
  if(frame>0)simulation.step(1);const sample=samples.find(s=>s.frame===frame);if(!sample)continue;
  for(const [key,value]of Object.entries(simulation.snapshot(true)))assert.deepEqual(sample.state[key],value,'Common product state '+frame+' '+key);
  for(const image of sample.images){
    const particle=simulation.particles.find(p=>p.slot===image.slot),rgb=simulation.color(particle);
    if(rgb){const [r,g,b]=rgb.map(v=>Math.round(v*255));assert.equal(image.tint,(r<<16)|(g<<8)|b,'Product RGB quantization');}
  }
  simulationSamples++;
}
const result={passed:true,nativeFrames:commonOnly?0:control.result.updates.length,originalParticleStates:commonOnly?'not compared':'exact',originalRngStates:commonOnly?'not compared':'exact',
  simulationSamples,simulationThroughFrame:lastFrame,commonSimulationStates:'exact',
  maximumWidthResidualPx,wholeEffectReconstructed:false,visualFidelityBaseline:false};
fs.writeFileSync(get('--output'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
