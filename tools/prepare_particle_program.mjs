// Publish a controlled native-component program, never a reconstructed whole skill.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {nativeScalarAlphaEligibility} from './original_effect_player.mjs';
import {validateParticleProgram} from '../src/effects/particleProgram.ts';
import {NativeParticleEmitter} from './bmb_lifecycle.mjs';
const args=process.argv.slice(2),value=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;
for(const flag of ['--reference','--alpha-plan','--alpha-effect','--texture-plan','--texture-effect','--texture-name','--key'])
  if(!args.includes(flag))throw Error('Required '+flag);
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const key=value('--key');if(!/^[a-z][a-z0-9_]*$/.test(key))throw Error('Invalid effect key');
const reference=read(value('--reference')),control=reference.cases[Number(value('--case')??0)];
if(!control||control.inputs.scale_module!=='VelocityX'||reference.approved!==false
  ||reference.nativeSha256!=='6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77')throw Error('Explicit pinned VelocityX native control required');
const input=control.inputs;
if(input.phase_mode!=='initialized'||input.suspended||input.restart||input.restart_range)
  throw Error('Only active zero-restart initialized controls are admitted');
const alphaPlan=read(value('--alpha-plan')),alphaEffect=alphaPlan.effects.find(e=>e.name===value('--alpha-effect'));
const alphaNode=alphaEffect?.nodes.filter(n=>n.typeId===3&&nativeScalarAlphaEligibility(alphaEffect,n).supported);
if(alphaNode?.length!==1)throw Error('One source-verified Particle alpha curve required');
const texturePlan=read(value('--texture-plan')),textureEffect=texturePlan.effects.find(e=>e.name===value('--texture-effect'));
const texture=texturePlan.files?.[textureEffect?.textures[value('--texture-name')]];
if(!texture||hash(texture.path)!==texture.sha256)throw Error('Exact prepared original texture identity required');
const start=input.start??0,startRange=input.start_range??0,duration=input.duration??4,life=input.life??10,lifeRange=input.life_range??0;
const manifest={kind:'native-particle-basic-v1',file:'particle.png',blend:'NORMAL',program:{
  profile:'native-particle-basic-v1',clock:'fixed-60hz-neutral-root-v1',frameBudget:start+startRange+duration+Math.max(1,life+lifeRange)+2,
  groupScaleX:1,pixelsPerUnit:25,alphaKeys:alphaNode[0].alphaCurve.keys,
  simulation:{profile:'native-particle-lifecycle-v1',generation:{profile:'native-constant-activation-v1',typeId:3,childCount:0,mode:0,
    enabled:input.enabled??true,start,startRange,count:input.count??1,duration,repeatCount:input.repeats??1,interval:input.interval??1},
    words:input.rng??[123456789,362436069,521288629,88675123],life,lifeRange,capacity:input.capacity??128,
    modules:[{kind:'VelocityX',value:input.scale_value??1,range:input.scale_range??0,velocity:input.scale_velocity??0,velocityRange:input.scale_velocity_range??0}]}},
  provenance:{scope:'Controlled assembly of native-verified lifecycle, scalar alpha and original texture; not a whole original BMB effect or skill',
    referenceSha256:hash(value('--reference')),control:Number(value('--case')??0),alphaPlanSha256:hash(value('--alpha-plan')),
    simulationSha256:hash('src/effects/nativeLifecycle.mjs'),compilerSha256:hash('tools/prepare_particle_program.mjs'),
    alphaSourceSha256:alphaEffect.sha256,textureSourceSha256:textureEffect.sha256,textureSha256:texture.sha256,
    hostAdaptation:'Neutral parent, no translation,25 pixels per source unit; white Basic tint; fixed60Hz source-unit steps'}};
validateParticleProgram(manifest.program);
const simulation=new NativeParticleEmitter(manifest.program.simulation);
assert.deepEqual(simulation.initial,control.result.initial,'Native activation differs');
assert.deepEqual((input.steps??[1,1,1,1,1]).map(delta=>simulation.step(delta)),control.result.updates,'Native lifecycle differs');
assert.deepEqual(simulation.requests,control.result.requests,'Native birth requests differ');
const output=path.join('public/assets/effects',key);fs.mkdirSync(output,{recursive:true});
const existing=path.join(output,'manifest.json');
if(fs.existsSync(existing)&&read(existing).kind!=='native-particle-basic-v1')throw Error('Refusing to replace an existing published sheet');
fs.copyFileSync(texture.path,path.join(output,'particle.png'));
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const registry=read('public/assets/content.json');if(!registry.effects.includes(key))registry.effects.push(key);
fs.writeFileSync('public/assets/content.json',JSON.stringify(registry,null,2)+'\n');
console.log(JSON.stringify({key,profile:manifest.kind,wholeOriginalEffect:false,textureSha256:hash(path.join(output,'particle.png'))}));
