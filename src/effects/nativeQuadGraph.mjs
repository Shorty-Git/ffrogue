// Constant-parent/single-burst Quad graph adapter using shared source rules.
import {NativeRandom,activateConstantGenerator,initializeNativeVector} from './nativeLifecycle.mjs';
import {initializeNativeConstTransform,nativeDefaultTransform} from './nativeTransform.mjs';
import {NativeQuadEmitter} from './nativeQuad.mjs';
export function nativeQuadParents(program,scene,cache=new Map()) {
 let parent=nativeDefaultTransform({scale:scene.scale,rotation:[0,0,0],translation:[0,0,0]},
  {basis:[1,0,0,0,1,0,0,0,1],origin:scene.origin},'captured-separate-f32');
 for(const a of program.ancestors){
  if(['translation','rotation','scale','matrix'].some(k=>a.node.authoringInheritance?.[k]!=='On')
    ||a.node.authoringInheritance.alphaRate!==0||a.node.authoringInheritance.colorRate!==0
    ||a.node.materialAlpha.value!==1||a.node.alphaCurve.keys.some(k=>k.value!==1))
    throw Error('Nonneutral parent modulation/inheritance requires a separate profile');
  const g=a.generation;
  if(g.typeId!==0||g.count!==1||g.duration!==1||g.interval!==1||g.repeatCount!==1||g.start||g.startRange)
    throw Error('Delayed/repeated parent branches need a separate traversal profile');
  if(cache.has(a.node.index)){parent=cache.get(a.node.index);continue;}
  const rng=new NativeRandom(a.words);activateConstantGenerator(a.generation,rng);rng.nextWord();
  let local;
  if(a.kind==='ConstTransform'){
   const t=a.node.staticVectors.transform;
   if(Object.values(t.translation).flat().some(Boolean))throw Error('Constant parent translation is not a Zero module');
   local=initializeNativeConstTransform({profile:'null-const-transform-v1',arithmetic:'captured-separate-f32',
    scale:{kind:'ConstX',value:t.scale.valueInitial[0],range:t.scale.valueRange[0]},
    rotation:{value:t.rotation.valueInitial,range:t.rotation.valueRange},translation:'Zero',color:a.color},rng);
  }else if(a.kind==='Neutral'){
   const t=a.node.staticVectors.transform;
   if(Object.values(t.rotation).flat().some(Boolean)||Object.values(t.translation).flat().some(Boolean)
    ||t.scale.valueInitial.some(v=>v!==1)||Object.entries(t.scale).some(([k,v])=>k!=='valueInitial'&&v.some(Boolean)))throw Error('Nonneutral parent cannot use Neutral profile');
   initializeNativeVector({kind:'ColorConst',arithmetic:'captured-separate-f32',...a.color},rng);
   local={scale:[1,1,1],rotation:[0,0,0],translation:[0,0,0]};
  }else throw Error('Unknown parent program');
  parent=nativeDefaultTransform(local,parent,'captured-separate-f32');
  cache.set(a.node.index,parent);
 }
 return parent;
}
export function evaluateNativeQuadBranches(programs,frame,scene) {
 if(!Number.isInteger(frame)||frame<0||frame>600||scene.rotation?.some(Boolean))throw Error('Explicit bounded frame/identity scene rotation required');
 const cache=new Map();
 return programs.branches.map(program=>{
  const parent=nativeQuadParents(program,scene,cache),emitter=new NativeQuadEmitter(program);let packet=null;
  for(let i=0;i<frame;i++)packet=emitter.step(1,parent);
  return {packet,record:emitter.recordValues(),rng:[...emitter.owner.rng.words],ageTicks:emitter.ageTicks};
 });
}
