// Source-selected constant Null branch. Native matrices are comparison outputs only.
import {NativeRandom,activateConstantGenerator} from '../../src/effects/nativeLifecycle.mjs';
import {initializeNativeConstTransform,nativeDefaultTransform} from '../../src/effects/nativeTransform.mjs';
import {compareLifecycleEvents} from './lifecycle-comparison.mjs';

const floats=(raw,offset,count)=>{const b=Buffer.from(raw,'hex');return Array.from({length:count},(_,i)=>b.readFloatLE(offset+4*i));};
export function replayConstNullTransform(rows,effect,generation,nodeIndex,moduleInputs) {
  const node=effect.nodes.find(n=>n.index===nodeIndex),v=node?.staticVectors.transform;
  const color=moduleInputs?.nodes.find(n=>n.index===nodeIndex)?.inputs.color1;
  if(!node||node.typeId!==0||node.lifeRangeParameter||generation.count!==1||generation.duration!==1||generation.repeatCount!==1
    ||generation.start||generation.startRange||!color||moduleInputs.sourceSha256!==effect.sha256
    ||Object.values(v.translation).flat().some(x=>x!==0)||v.rotation.speedInitial.some(Boolean)||v.rotation.speedRange.some(Boolean))
    throw Error('Unadmitted constant Null branch');
  const init=rows.find(r=>r.node===nodeIndex&&r.type==='init-leave');
  const moduleCalls=rows.filter(r=>r.node===nodeIndex&&r.type==='module-enter');
  const initializers=moduleCalls.filter(r=>r.candidates[0].stage==='init');
  const admitted=['7scaling16ModuleParamTable','8rotation16ModuleParamTable','11translation4init4Zero','6color116ModuleParamTable'];
  if(initializers.length!==4||initializers.some((r,i)=>!r.candidates[0].name.includes(admitted[i])))throw Error('Unsupported constant Null dispatch');
  const updates=moduleCalls.filter(r=>r.candidates[0].stage==='update');
  const expected=['7scaling6update6ConstX','8rotation6update5Const','11translation6update5Const','17transform_locator6update7Default','6color16update5Const'];
  if(updates.some((r,i)=>!r.candidates[0].name.includes(expected[i%5]))||updates.length%5)throw Error('Unsupported Null update/auxiliary phases');
  const rng=new NativeRandom(init.state.rng);
  activateConstantGenerator(generation,rng);rng.nextWord(); // Activation and zero-range joint life still consume draws.
  const local=initializeNativeConstTransform({profile:'null-const-transform-v1',arithmetic:'captured-separate-f32',
    scale:{kind:'ConstX',value:v.scale.valueInitial[0],range:v.scale.valueRange[0]},
    rotation:{value:v.rotation.valueInitial,range:v.rotation.valueRange},translation:'Zero',color},rng);
  const record=[local.scale[0],...local.rotation,...local.translation,...local.color];
  const lastInit=rows.find(r=>r.type==='module-leave'&&r.call===initializers.at(-1).call);
  const common={type:'constant-null-init',node:nodeIndex,instance:0,frame:initializers[0].frame};
  const native=[{...common,seq:lastInit.seq,rng:lastInit.after.rng,record:lastInit.after.recordSnapshot?floats(lastInit.after.recordSnapshot.raw,0,10):null}];
  const simulated=[{...common,rng:rng.words,record}];
  const transforms=new Map();
  for(const tick of rows.filter(r=>r.type==='controlled-step')){
    const tree=rows.find(r=>r.frame===tick.frame&&r.type==='tree-update-enter'&&r.tree?.entries.some(e=>e.node===nodeIndex));
    if(!tree?.tree.joint?.raw)throw Error('Actual scene-root input missing');
    const rootInput={scale:floats(tree.tree.joint.raw,0,3),origin:floats(tree.tree.joint.raw,28,3),quaternion:floats(tree.tree.joint.raw,12,4)};
    if(rootInput.quaternion.slice(0,3).some(v=>v!==0)||rootInput.quaternion[3]!==1)
      throw Error('Rotated scene root requires an explicit external pose contract');
    // Rebuild even the outer scene basis from pose parameters; never read its
    // precomputed matrix at joint+0x28 as a simulation input.
    const parent=nativeDefaultTransform({rotation:[0,0,0],scale:rootInput.scale,translation:[0,0,0]},
      {basis:[1,0,0,0,1,0,0,0,1],origin:rootInput.origin},'captured-separate-f32');
    const state=nativeDefaultTransform(local,parent,'captured-separate-f32');
    transforms.set(tick.frame,{...state,observedAtSeq:null,eventTime:true,calculatedFrom:'source-parameters/emitter-initial-seed/scene-root-input'});
    const call=updates.find(r=>r.frame===tick.frame&&r.candidates[0].name.includes('transform_locator'));
    const leave=rows.find(r=>r.call===call?.call&&r.type==='module-leave');
    if(!leave)throw Error('Missing original locator output');
    const raw=leave.after.update.raw;
    const e={type:'constant-null-transform',node:nodeIndex,instance:0,frame:tick.frame,rng:rng.words};
    const context={parentState:parent,sceneRootInput:rootInput,rng:rng.words};
    native.push({...e,seq:leave.seq,basis:floats(raw,136,9),origin:floats(raw,244,3),scale:floats(raw,232,3),quaternion:floats(raw,216,4),context});
    simulated.push({...e,...state,context});
  }
  const comparable=events=>events.map(e=>Object.fromEntries(Object.entries(e).filter(([k])=>k!=='record'||!!lastInit.after.recordSnapshot)));
  const comparison=compareLifecycleEvents(comparable(native),comparable(simulated));
  return {transforms,report:{...comparison,native,simulated,recordObserved:!!lastInit.after.recordSnapshot,
    independentlyCalculated:true,suppliedComputedParentMatrices:false,sceneRootInput:'Positive scale/origin + verified identity rotation; basis rebuilt',initialEmitterSeedInput:true,
    initializationDraws:rng.draws,local,boundary:'Bounded constant Null and Default locator; seed derivation/other branches/materials/full graph remain open'}};
}
