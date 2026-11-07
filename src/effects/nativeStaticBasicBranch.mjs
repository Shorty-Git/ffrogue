// Finite source-selected OneX/Basic leaf with a static full-inheritance Default chain.
import {NativeParticleEmitter} from './nativeLifecycle.mjs';
import {nativeDefaultTransform,nativeParticleXMakeInputs} from './nativeTransform.mjs';
import {nativeParticleBillboardCorners} from './nativeParticlePacket.mjs';
const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const vector=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(Number.isFinite);

export function validateStaticBasicBranch(p) {
  const n=p?.node,s=n?.nativeMaterialSelection,m=p?.simulation;
  const modules=m?.modules,one=modules?.[0],color=modules?.[1];
  if(p?.profile!=='native-static-default-onex-basic-v1'||n?.typeId!==3||!s?.supported||!s.basicCandidateCompatible
    ||s.operation!==0||s.fragmentSha256!=='8ae381afc9f95ab42caafc2c03266ddc08500489623d2e16d39d89737b7d1fb4'
    ||!n.resourceBindings.texture1||n.resourceBindings.texture2||n.resourceBindings.model||n.authoringEmissionShape!=='Point'
    ||n.nativeParticleX?.scale?.index!==15||n.nativeParticleX.scale.target?.sha256!=='549644baf3d7082741d320b6184e226f1b37d009bd46cac9321fc2b90971dfbe'
    ||n.nativeParticleX.scaleInit?.target!==null||n.nativeParticleX.rotation?.target!==null
    ||n.alphaCurve.keys.length||n.materialAlpha.value!==1||n.materialControls.alphaMode.id!==0
    ||JSON.stringify(p.textureTints)!=='[[1,1,1,1]]'||JSON.stringify(p.drawBasis)!==JSON.stringify(identity)
    ||JSON.stringify(p.blend?.row)!=='[1,770,771]'||p.blend.id!==1||p.blend.equation!==32774
    ||!Array.isArray(p.parents)||!p.parents.length||p.parents.at(-1).index!==n.parentIndex
    ||m?.life!==n.lifeParameter||m.lifeRange!==0||m.capacity!==1||m.life<1||m.life>240
    ||modules?.length!==2||one?.kind!=='OneX'||one.value!==1||one.range!==0||color?.kind!=='ColorConst'
    ||color.arithmetic!=='captured-separate-f32'||JSON.stringify(color.value)!=='[1,1,1]'||JSON.stringify(color.range)!=='[0,0,0]'
    ||!Number.isInteger(p.order)||p.order<0)
    throw Error('Explicit finite static Default/OneX/Basic profile required');
  const g=m.generation;
  if(g.start||g.startRange||g.count!==1||g.duration!==1||g.interval!==1||g.repeatCount!==1||!g.enabled)
    throw Error('Static Basic profile requires one immediate source emission');
  p.parents.forEach((a,i)=>{
    if(a.parentIndex!==(i?p.parents[i-1].index:null)||a.locator!==1
      ||!vector(a.local.scale,3)||a.local.scale.some(x=>x<=0)||!vector(a.local.rotation,3)||a.local.rotation[2]!==0
      ||!vector(a.local.translation,3)||a.local.translation.some(Boolean)
      ||['translation','rotation','scale','matrix'].some(k=>a.inheritance?.[k]!=='On')
      ||a.inheritance.alphaRate||a.inheritance.colorRate||a.inheritance.compatibility.nodeV15||a.inheritance.compatibility.rootV15)
      throw Error('Unadmitted static Default ancestry');
  });
  new NativeParticleEmitter(m);
}

export function evaluateStaticBasicBranch(program,frame,scene) {
  validateStaticBasicBranch(program);
  if(!Number.isInteger(frame)||frame<0||frame>600)throw Error('Bounded integer source frame required');
  let parent=nativeDefaultTransform({scale:scene.scale,rotation:[0,0,0],translation:[0,0,0]},
    {basis:[1,0,0,0,1,0,0,0,1],origin:scene.origin},'captured-separate-f32');
  const parents=[];
  for(const a of program.parents){parent=nativeDefaultTransform(a.local,parent,'captured-separate-f32');parents.push(parent);}
  const emitter=new NativeParticleEmitter(program.simulation);let state;
  for(let i=0;i<frame;i++)state=emitter.step(1);
  const particle=state?.particles.find(p=>p.ageTicks<=p.lifeTicks);
  if(!particle)return {packet:null,parents,rng:[...emitter.rng.words]};
  const make=nativeParticleXMakeInputs({scalar:1,center:parent.origin,groupScale:parent.scale,rotationMode:'Absent'});
  const corners=nativeParticleBillboardCorners(make,program.drawBasis),indices=[0,1,2,3,0,2],uv=[[0,0],[0,1],[1,1],[1,0]];
  const color=emitter.color(particle),rgba=[...color,1].map(v=>Math.trunc(Math.fround(v*255)));
  return {parents,rng:[...emitter.rng.words],packet:{node:program.node.index,instance:0,frame,visible:true,
    vertices:indices.map(i=>({position:corners[i],rgba:[...rgba],uv:uv[i],textureTint:[1,1,1,1]})),
    material:program.node.nativeMaterialSelection,textures:program.node.resourceBindings,blend:program.blend,order:program.order,
    boundary:'Static Default/OneX/Basic source profile; explicit host/seed, not arbitrary original traversal'}};
}
