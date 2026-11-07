// Extend an admitted prepared graph with a reviewed Null/VelocityX Particle branch.
import fs from 'node:fs';
import {validateNativeParticleBranch} from '../src/effects/nativeParticleBranch.mjs';
const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1],read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const base=read(get('--quads')),plan=read(get('--plan')),inputs=read(get('--inputs'));
const rows=fs.readFileSync(get('--trace'),'utf8').trim().split('\n').map(JSON.parse);
const effect=plan.effects.find(e=>e.sha256===base.sourceSha256);
if(!effect||inputs.sourceSha256!==effect.sha256||rows[0].sourceSha256!==effect.sha256)throw Error('Source identity mismatch');
const reference=read('tools/data/reconstruction-map/generator-activation-native.json');
const generation=n=>reference.cases.find(c=>c.node===n.index&&c.sourceSha256===effect.sha256).inputs;
const words=n=>rows.find(r=>r.node===n.index&&r.type==='init-leave').state.rng;
const data=n=>inputs.nodes.find(i=>i.index===n.index).inputs;
const contract=(node,expected)=>{
 for(const [phase,patterns]of Object.entries(expected)){
  const unique=[];
  for(const r of rows.filter(r=>r.node===node.index&&r.type==='module-enter'&&r.candidates[0].stage===phase)){
   const name=r.candidates[0].name;if(!unique.includes(name))unique.push(name);
  }
  // Order and full repetitions, not merely the presence of individual callbacks.
  const selected=rows.filter(r=>r.node===node.index&&r.type==='module-enter'&&r.candidates[0].stage===phase).map(r=>r.candidates[0].name);
  if(unique.length!==patterns.length||selected.length%patterns.length||selected.some((name,i)=>!name.includes(patterns[i%patterns.length])))
   throw Error('Unreviewed complete ordered '+phase+' module contract');
 }
};
const particleBranches=effect.nodes.filter(n=>n.typeId===3).map(node=>{
 const parent=effect.nodes.find(n=>n.index===node.parentIndex);
 if(!parent)throw Error('Missing Particle parent');
 contract(node,{init:['7scaling16ModuleParamTableINS0_3bmb5param8ParticleEE13InitVelocityX','11translation4init4Zero',
  '10uv_scaling16ModuleParamTableILi2ENS0_3bmb5param8ParticleEE9InitConst','6color116ModuleParamTableINS0_3bmb5param8ParticleEE9InitConst'],
 update:['7scaling6update9VelocityX','11translation6update5Const','10uv_scaling6update5Const','6color16update5Const'],
 make:['7scaling11make_vertex9VelocityX','11translation11make_vertex5Const','10uv_scaling11ModuleTableILi2EE15MakeVertexConst',
  '12uv_transform11ModuleTableILi1EE22MakeVertexTransform___','12uv_transform16ModuleParamTableILi2ENS0_3bmb5param8ParticleEE22MakeVertexTransformS__','6color111make_vertex5Const']});
 contract(parent,{init:['11translation16ModuleParamTableINS0_3bmb5param4NullEE12InitVelocity','6color116ModuleParamTableINS0_3bmb5param4NullEE9InitConst'],
  update:['7scaling6update3One','11translation6update8Velocity','17transform_locator6update7Default','6color16update5Const']});
 const inherited=base.branches.find(b=>b.ancestors.at(-1)?.node.index===parent.parentIndex)?.ancestors;
 if(!inherited)throw Error('Only already admitted constant ancestors are available');
 const sourceOrder=[];const visit=i=>{if(sourceOrder.includes(i))throw Error('Invalid source graph');sourceOrder.push(i);for(const c of effect.nodes[i].children)visit(c);};
 for(const root of effect.nodes.filter(n=>n.parentIndex===null))visit(root.index);
 const p={profile:'native-particle-x-two-texture-v1',node,ancestors:inherited,words:words(node),generation:generation(node),
  parent:{node:parent,words:words(parent),generation:generation(parent),color:data(parent).color1},
  hostLife:inherited.at(-1).node.lifeParameter,activationAgeTicks:0,color:data(node).color1,uvScale:data(node).texture2Scale,
  dispatch:'velocity-x-zero-translation-uv2-const-color-v1',textureTints:[[1,1,1,1],[1,1,1,1]],textureTrims:[[0,0,1,1],[0,0,1,1]],
  drawBasis:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],globalColorScale:[1,1,1,1],order:sourceOrder.indexOf(node.index),
  blend:{id:node.materialControls.blend.id,row:plan.nativeBlend.blendRows[node.materialControls.blend.id],equation:plan.nativeBlend.equation}};
 validateNativeParticleBranch(p);return p;
});
const output=get('--output');if(!output?.startsWith('tools/data/'))throw Error('Keep experimental prepared profiles ignored');
const result={...base,particleBranches,unsupportedNodes:base.unsupportedNodes.filter(i=>!particleBranches.some(p=>p.node.index===i||p.parent.node.index===i)),
 externalInputs:{...base.externalInputs,drawBasis:'Explicit identity Particle draw basis fixture; live draw basis not captured',
  particleAlpha:'Explicit alpha1 fixture; native make context agrees',parentActivation:'Zero-age source host activation; emitter seeds measured; no intermediate matrices or cell states supplied'}};
fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify({output,particleBranches:particleBranches.length,wholeEffectSupported:false}));
