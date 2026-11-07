// A bounded connected scheduler projection, not a complete source renderer.
// Native seeds and host activation are inputs; no later RNG state is assigned.
import {NativeGeneratorOwner,advanceNativeJoint,nativeParentActive,initializeNativeScalar,updateNativeScalar,
  initializeNativeVector,updateNativeTranslation,updateRetainedNativeRecords,projectNativeTranslation} from '../../src/effects/nativeLifecycle.mjs';
import {nativeParticleXPacket,validateNativeParticlePacket} from '../../src/effects/nativeParticlePacket.mjs';
import {compareLifecycleEvents} from './lifecycle-comparison.mjs';
import {replayConstNullTransform} from './null-transform-replay.mjs';
import {nativeDefaultTransform,nativeParticleXMakeInputs} from '../../src/effects/nativeTransform.mjs';

const stateFields={mode:0,durationTicks:4,intervalTicks:8,remainingTicks:12,emitted:16,cycleEmitted:20,limit:24,delayTicks:40};
const decode=raw=>Object.fromEntries(Object.entries(stateFields).map(([k,at])=>[k,Buffer.from(raw,'hex').readInt32LE(at)]));
const clone=v=>JSON.parse(JSON.stringify(v));
const rngDraws=name=>{
  if(name.includes('translation4init4Zero'))return 0;
  if(name.includes('scaling16ModuleParamTable')&&name.includes('13InitVelocityX'))return 2;
  if(name.includes('translation16ModuleParamTable')&&name.includes('12InitVelocity'))return 6;
  if((name.includes('uv_scaling16ModuleParamTable')||name.includes('color116ModuleParamTable'))&&name.includes('9InitConst'))return 3;
  throw Error('Unverified module RNG consumption: '+name);
};

export function replayParentGenerators(rows,effect,generations,{particleNode=8,ignoreParentGate=false,cloneChildSeeds=false,moduleInputs=null,independentParent=false,particlePacketProgram=null}={}) {
  const child=effect.nodes.find(n=>n.index===particleNode),parent=effect.nodes.find(n=>n.index===child?.parentIndex);
  if(rows[0]?.sourceSha256!==effect.sha256||child?.typeId!==3||parent?.typeId!==0||child.lifeRangeParameter||parent.lifeRangeParameter
    ||child.generation.count!==1||child.generation.start||parent.generation.start)
    throw Error('Expected bounded constant-life Null/Particle relation');
  if(particlePacketProgram){
    validateNativeParticlePacket(particlePacketProgram);
    if(!independentParent||particlePacketProgram.node.index!==child.index)throw Error('Independent admitted Particle inputs required');
  }
  const particlePackets=[];
  const ids=[parent.index,child.index],activation=rows.filter(r=>r.type==='activate-enter'&&ids.includes(r.node));
  const parentActivation=activation.find(r=>r.node===parent.index),childActivations=activation.filter(r=>r.node===child.index);
  if(!parentActivation||childActivations.length>128)throw Error('Missing/bounded parent activation');
  const hostSource=effect.nodes.find(n=>n.index===parent.parentIndex),host={lifeTicks:hostSource.lifeParameter*10000,ageTicks:parentActivation.parent.ageTicks};
  if(host.lifeTicks!==parentActivation.parent.lifeTicks)throw Error('Host source/native lifetime disagreement');
  if(independentParent&&!moduleInputs)throw Error('Independent parent requires raw module inputs');
  const reconstructedParent=independentParent?replayConstNullTransform(rows,effect,generations.get(hostSource.index),hostSource.index,moduleInputs):null;
  const parentTransforms=reconstructedParent?.transforms??new Map(rows.filter(r=>r.type==='post-leave'&&r.node===hostSource.index).map(r=>{
    const bytes=Buffer.from(r.state.jointStorage.slots[0].raw,'hex'),v=(at,n)=>Array.from({length:n},(_,i)=>bytes.readFloatLE(at+i*4));
    return [r.frame,{basis:v(40,9),origin:v(28,3),lifeTicks:bytes.readInt32LE(96),ageTicks:bytes.readInt32LE(100),observedAtSeq:r.seq,eventTime:false}];
  }));
  const hostInitial=clone(host),childParents=new Map(childActivations.map((r,i)=>[r.parent.id,i]));
  const generators=new Map(),cellRecords=new Map(),parentRecords=new Map();
  if(moduleInputs&&moduleInputs.sourceSha256!==effect.sha256)throw Error('Foreign module parameter source');
  for(const [index,r]of childActivations.entries())parentRecords.set('0x'+Buffer.from(r.parent.raw,'hex').readBigUInt64LE(128).toString(16),index);
  for(const r of rows.filter(r=>r.node===child.index&&r.state?.cells))for(const c of r.state.cells.slots)cellRecords.set(c.moduleRecord,c.slot);
  const returns=new Map(rows.filter(r=>r.type.endsWith('-leave')).map(r=>[r.call,r]));
  const dependentNative=[],dependentSimulated=[],makeNative=[],makeSimulated=[],dependentStates=new Map();
  const native=[],simulated=[],jointChecks=[],activeCounts=new Map(ids.map(n=>[n,0])),bornCounts=new Map(ids.map(n=>[n,0]));
  const modulePrograms=new Map(),updatePrograms=new Map();
  for(const node of ids){
    const firstBirth=rows.find(r=>r.node===node&&r.type==='birth-enter'),last=returns.get(firstBirth.call);
    const firstModules=rows.filter(r=>r.node===node&&r.type==='module-enter'&&r.seq>firstBirth.seq&&r.seq<last.seq&&r.candidates.some(c=>c.stage==='init'));
    const repeated=firstModules.findIndex((r,i)=>i>0&&r.candidates[0].name===firstModules[0].candidates[0].name);
    modulePrograms.set(node,(repeated<0?firstModules:firstModules.slice(0,repeated)).map(r=>({name:r.candidates[0].name,draws:rngDraws(r.candidates[0].name)})));
    const firstUpdate=rows.find(r=>r.node===node&&r.type==='module-enter'&&r.candidates[0].stage==='update');
    if(firstUpdate)updatePrograms.set(node,rows.filter(r=>r.node===node&&r.type==='module-enter'&&r.parentCall===firstUpdate.parentCall&&r.before.record===firstUpdate.before.record)
      .map(r=>({name:r.candidates[0].name,draws:0})));
  }
  const moduleKey=r=>r.candidates?.find(c=>c.stage==='init'||c.stage==='update')?.name;
  let latestParent=null,currentBirth=null;
  for(const r of rows){
    if(!ids.includes(r.node))continue;
    const isChild=r.node===child.index,node=r.node;
    if(r.type==='activate-enter'){
      const index=isChild?childParents.get(r.parent.id):0;
      if(isChild)latestParent=index;
      const a=returns.get(r.call),rec=a.state.generatorRecords.records[index];generators.set(rec.pointer,index);
    }
    if(r.type==='activate-leave')activeCounts.set(node,activeCounts.get(node)+1);
    if(r.type==='birth-enter')currentBirth={node,index:generators.get(r.generatorArg)??0,slot:bornCounts.get(node)};
    let e=null;
    if(['activate-enter','activate-leave','birth-enter','birth-leave','update-enter','update-leave','post-enter','post-leave'].includes(r.type)){
      const enter=r.type.endsWith('-enter')?r:rows.find(x=>x.call===r.call&&x.type.endsWith('-enter'));
      const index=r.type.startsWith('activate')?(isChild?childParents.get(enter.parent.id):0):r.type.startsWith('birth')?(generators.get(enter.generatorArg)??0):null;
      e={seq:r.seq,frame:r.frame,type:r.type,node,instance:index,rng:r.state.rng};
      if(r.type.startsWith('activate'))e.parent={id:isChild?index:'host',lifeTicks:enter.parent.lifeTicks,ageTicks:enter.parent.ageTicks};
      if(r.type==='birth-enter')Object.assign(e,{offset:r.context.delta,count:r.requested});
      if(r.type==='birth-leave')bornCounts.set(node,bornCounts.get(node)+enter.requested);
      if(r.type.endsWith('-leave')){
        e.records=r.state.generatorRecords.records.slice(0,activeCounts.get(node)).map(x=>decode(x.raw));
        if(isChild)e.cells=r.state.cells.slots.slice(0,bornCounts.get(node)).map(c=>({slot:c.slot,lifeTicks:c.lifeCandidate,ageTicks:c.ageCandidate}));
      }
    }else if(['module-enter','module-leave'].includes(r.type)){
      const a=r.type==='module-enter'?r:rows.find(x=>x.call===r.call&&x.type==='module-enter');
      const stage=a.candidates[0].stage;
      if(stage==='init'||isChild&&stage==='update'||moduleInputs&&stage==='update'&&a.candidates[0].name.includes('translation6update8Velocity')){
        const state=r.type==='module-enter'?r.before:r.after;
        const slot=stage==='init'?(isChild?currentBirth.slot:latestParent):(isChild?cellRecords:parentRecords).get(a.before.record);
        e={seq:r.seq,frame:r.frame,type:r.type,node,instance:slot,module:moduleKey(a),rng:state.rng};
      }else if(isChild&&stage==='make'&&a.candidates[0].name.includes('scaling11make_vertex')){
        if(r.type==='module-enter')e={seq:r.seq,frame:r.frame,type:'make-window',node,instance:cellRecords.get(a.before.record)};
      }
      if(e&&isChild&&r.type==='module-enter'&&stage!=='init'&&a.candidates[0].name.includes('VelocityX')&&a.candidates[0].name.includes('scaling')){
        const bytes=Buffer.from(a.before.recordHex,'hex');e.scalar=[bytes.readFloatLE(0),bytes.readFloatLE(4)];
      }
      if(e&&moduleInputs&&r.type==='module-enter'&&stage==='update'){
        const bytes=Buffer.from(a.before.recordHex,'hex'),read=n=>Array.from({length:n},(_,i)=>bytes.readFloatLE(i*4));
        if(!isChild)e.translation=read(4);
        else if(a.candidates[0].name.includes('uv_scaling'))e.uvScale=read(3);
        else if(a.candidates[0].name.includes('color1'))e.color=read(3);
        else if(a.candidates[0].name.includes('translation'))e.translation=read(3);
      }
    }
    if(e&&moduleInputs&&r.type==='module-leave'&&r.node===parent.index&&e.module.includes('translation6update8Velocity')){
      const bytes=Buffer.from(r.after.update.raw,'hex'),v=at=>Array.from({length:3},(_,i)=>bytes.readFloatLE(at+i*4));
      e.velocityXYZ=v(0xac);e.worldTranslation=v(0xf4);
    }
    if(independentParent&&r.node===parent.index&&r.type==='module-leave'&&r.candidates[0].name.includes('transform_locator6update7Default')){
      const b=Buffer.from(r.after.update.raw,'hex'),v=(at,n)=>Array.from({length:n},(_,i)=>b.readFloatLE(at+4*i));
      dependentNative.push({seq:r.seq,frame:r.frame,type:'null-transform',node:r.node,instance:parentRecords.get(r.after.record),
        rng:r.after.rng,basis:v(136,9),origin:v(244,3),scale:v(232,3),quaternion:v(216,4),
        context:{parentState:r.after.parentInputs??{boundary:'Older trace lacks direct pointees'},rng:r.after.rng}});
    }
    if(independentParent&&r.node===child.index&&r.type==='module-leave'&&r.candidates[0].name.includes('module7scaling11make_vertex9VelocityX')){
      const b=Buffer.from(r.after.make.raw,'hex'),v=at=>Array.from({length:3},(_,i)=>b.readFloatLE(at+4*i));
      makeNative.push({seq:r.seq,frame:r.frame,type:'particle-x-make-inputs',node:r.node,instance:cellRecords.get(r.after.record),
        center:v(0x98),localScale:v(0xbc),groupScale:v(0xc8),rotation:v(0xb0)});
    }
    if(e)native.push(clone(e));
  }
  const jointObservation=r=>{
    const raw=Buffer.concat(r.state.jointStorage.slots.map(s=>Buffer.from(s.raw,'hex')));
    const count=childActivations.filter(a=>a.seq<r.seq).length;
    return Array.from({length:count},(_,i)=>({lifeTicks:raw.readInt32LE(i*144+96),ageTicks:raw.readInt32LE(i*144+100)}));
  };
  // Retain the last actually observed parent snapshot as context. A nested
  // child event may precede the next snapshot; do not label it as event-time data.
  for(const e of native){
    const prior=rows.findLast(r=>r.seq<e.seq&&r.node===parent.index&&r.type==='post-leave');
    const states=prior?jointObservation(prior):childActivations.filter(a=>a.seq<e.seq).map(a=>({lifeTicks:a.parent.lifeTicks,ageTicks:a.parent.ageTicks}));
    const parentState=e.node===child.index?{states:e.instance===null?states:states[e.instance]??null,observedAtSeq:prior?.seq??null,eventTime:false}:parentTransforms.get(e.frame)??null;
    e.context={parentState,rng:e.rng??null};
    if(e.node===parent.index&&e.type==='post-leave')e.joints=jointObservation(rows[e.seq-1]);
  }
  const words=node=>rows.find(r=>r.node===node&&r.type==='init-leave').state.rng;
  const owners=new Map(ids.map(n=>[n,new NativeGeneratorOwner(words(n))])),jointSlots=[],cells=[],scalars=[],translations=[],vectors=new Map();
  const inputs=node=>moduleInputs?.nodes.find(n=>n.index===node)?.inputs;
  const scale=child.staticVectors.transform.scale;
  const scaleModule={kind:'VelocityX',value:scale.valueInitial[0],range:scale.valueRange[0],velocity:scale.speedInitial[0],velocityRange:scale.speedRange[0]};
  let frame=parentActivation.frame,childExpired=false,parentModulesExpired=false;
  const emit=e=>simulated.push(clone({frame,...e,context:{parentState:e.node===child.index?
    (e.instance===null?jointSlots:jointSlots[e.instance]??null):{...host,suppliedBasis:parentTransforms.get(frame)?.basis??null,suppliedOrigin:parentTransforms.get(frame)?.origin??null},rng:owners.get(e.node)?.rng.words??null}}));
  const resolve=id=>ignoreParentGate?null:jointSlots[id];
  const snapshots=node=>({records:owners.get(node).records.map(r=>({...r.state})),...(node===child.index?{cells:cells.map(c=>({...c}))}:{})});
  const boundary=(type,node,instance=null,extra={})=>emit({type,node,instance,rng:[...owners.get(node).rng.words],...extra,
    ...(['activate-leave','birth-leave','update-leave','post-leave'].includes(type)?snapshots(node):{})});
  const activate=(node,id,initial)=>{
    boundary('activate-enter',node,id,{parent:{id:node===child.index?id:'host',...initial}});
    if(cloneChildSeeds&&node===child.index)owners.get(node).rng.words=[...words(node)];
    owners.get(node).activate(generations.get(node),node===child.index?id:'host');
    boundary('activate-leave',node,id,{parent:{id:node===child.index?id:'host',...initial}});
  };
  const modules=(node,slot,stage,delta=0)=>{
    const programs=stage==='init'?modulePrograms.get(node):updatePrograms.get(node);
    for(const m of programs){
      const scalar=node===child.index&&m.name.includes('scaling')&&m.name.includes('VelocityX');
      const movingParent=node===parent.index&&m.name.includes('translation')&&m.name.includes('Velocity');
      const field=m.name.includes('uv_scaling')?'uvScale':m.name.includes('color1')?'color':node===child.index&&m.name.includes('translation')?'translation':null;
      const numeric=moduleInputs&&stage==='update'?(movingParent?{translation:translations[slot].slice(0,4)}:field?{[field]:vectors.get(node)[slot][field]}:{}):{};
      const visible=stage==='init'||node===child.index||movingParent&&moduleInputs;
      if(visible)boundary('module-enter',node,slot,{module:m.name,...(scalar&&stage==='update'?{scalar:[...scalars[slot]]}:{}),...numeric});
      if(scalar){
        if(stage==='init')scalars[slot]=initializeNativeScalar(scaleModule,owners.get(node).rng);
        else updateNativeScalar(scalars[slot],delta);
      }else if(moduleInputs&&movingParent){
        if(stage==='init'){
          const t=parent.staticVectors.transform.translation;
          translations[slot]=initializeNativeVector({kind:'TranslationVelocity',arithmetic:'captured-separate-f32',value:t.valueInitial,range:t.valueRange,velocity:t.speedInitial,
            velocityRange:t.speedRange,offset:[0,0,0],multiplier:[1,1,1]},owners.get(node).rng);
        }else updateNativeTranslation(translations[slot],delta,'captured-separate-f32');
      }else if(moduleInputs&&stage==='init'&&field){
        if(!vectors.has(node))vectors.set(node,[]);vectors.get(node)[slot]??={};
        if(field==='translation')vectors.get(node)[slot][field]=[0,0,0];
        else {const data=inputs(node)?.[field==='uvScale'?'texture2Scale':'color1'];if(!data)throw Error('Missing vector source parameters');
          vectors.get(node)[slot][field]=initializeNativeVector({kind:field==='color'?'ColorConst':'UVConst',arithmetic:'captured-separate-f32',value:data.value,range:data.range},owners.get(node).rng);}
      }else if(independentParent&&stage==='update'&&node===parent.index&&m.name.includes('transform_locator6update7Default')){
        const t=parent.staticVectors.transform;
        if(Object.values(t.rotation).flat().some(Boolean)||t.scale.valueInitial.some(v=>v!==1)||Object.entries(t.scale).some(([k,v])=>k!=='valueInitial'&&v.some(Boolean)))
          throw Error('Non-neutral unassigned Null rotation/scale requires a separate context contract');
        const parentState=parentTransforms.get(frame);
        const transformed=nativeDefaultTransform({rotation:[0,0,0],scale:[1,1,1],translation:translations[slot].slice(0,3)},parentState,'captured-separate-f32');
        dependentStates.set(slot,transformed);
        dependentSimulated.push({frame,type:'null-transform',node,instance:slot,rng:[...owners.get(node).rng.words],...transformed,
          context:{parentState,rng:owners.get(node).rng.words}});
      }else for(let i=0;i<m.draws;i++)owners.get(node).rng.nextWord();
      if(visible)boundary('module-leave',node,slot,{module:m.name,...(moduleInputs&&movingParent&&stage==='update'?
        {velocityXYZ:translations[slot].slice(3,6),worldTranslation:projectNativeTranslation(translations[slot].slice(0,3),parentTransforms.get(frame),'captured-separate-f32')}:{} )});
    }
  };
  const p=owners.get(parent.index),c=owners.get(child.index);
  activate(parent.index,0,host);
  const frames=rows.filter(r=>r.type==='controlled-step'&&r.frame>=frame).map(r=>({frame:r.frame,delta:r.delta}));
  if(!frames.length||frames.some((r,i)=>r.delta!==1||r.frame!==frame+i))throw Error('This connected projection requires contiguous controlled unit steps');
  // The controller's fixed delta is explicit input; original host deltas are not replayed.
  for(const tick of frames){
    frame=tick.frame;const dt=tick.delta;
    boundary('update-enter',parent.index);
    p.update(dt,{parentState:()=>ignoreParentGate?null:host,onBirth:({offset,count,rng})=>{
      boundary('birth-enter',parent.index,0,{offset,count});
      for(let i=0;i<count;i++){
        rng.nextWord();const slot=jointSlots.length,joint={lifeTicks:parent.lifeParameter*10000,ageTicks:-Math.trunc(offset*10000)||0};
        jointSlots.push(joint);activate(child.index,slot,joint);modules(parent.index,slot,'init');
      }
      boundary('birth-leave',parent.index,0);
    }});
    if(!childExpired){
      boundary('update-enter',child.index);
      c.update(dt,{parentState:resolve,onBirth:({record,offset,count,rng})=>{
        boundary('birth-enter',child.index,record.index,{offset,count});rng.nextWord();
        for(let i=0;i<count;i++){
          rng.nextWord();const slot=cells.length;
          modules(child.index,slot,'init');cells.push({slot,lifeTicks:child.lifeParameter*10000,ageTicks:-Math.trunc(offset*10000)||0});
        }
        boundary('birth-leave',child.index,record.index);
      }});
      boundary('update-leave',child.index);
    }
    boundary('update-leave',parent.index);
    advanceNativeJoint(host,dt,null);
    boundary('post-enter',parent.index);
    p.post(dt,{parentState:()=>ignoreParentGate?null:host,onRecord:({activeTicks})=>{
      for(const joint of jointSlots)advanceNativeJoint(joint,activeTicks/10000,ignoreParentGate?null:host);
      if(moduleInputs)updateRetainedNativeRecords(translations,activeTicks/10000,{parent:ignoreParentGate?null:host,expired:parentModulesExpired,
        onRecord:(_record,slot,delta)=>modules(parent.index,slot,'update',delta)});
    }});
    if(!childExpired){
      boundary('post-enter',child.index);
      c.post(dt,{parentState:resolve,onRecord:({record,activeTicks})=>{
        const cell=cells[record.index];if(cell&&cell.ageTicks<=cell.lifeTicks){modules(child.index,cell.slot,'update',Math.fround((activeTicks+Math.min(0,cell.ageTicks))/10000));cell.ageTicks+=activeTicks;}
      }});
      boundary('post-leave',child.index);
      childExpired=c.records.length>0&&c.records.every(r=>!nativeParentActive(resolve(r.parent)));
    }
    parentModulesExpired=childExpired&&jointSlots.every(j=>!nativeParentActive(j));
    boundary('post-leave',parent.index,null,{joints:clone(jointSlots)});
    const observed=rows.find(r=>r.frame===frame&&r.node===parent.index&&r.type==='post-leave');
    jointChecks.push({seq:observed.seq,frame,original:jointObservation(observed),simulator:clone(jointSlots)});
    for(const cell of cells)if(nativeParentActive(resolve(cell.slot))&&cell.ageTicks<=cell.lifeTicks){
      emit({type:'make-window',node:child.index,instance:cell.slot,scalar:[...scalars[cell.slot]]});
      if(independentParent){
        if(!modulePrograms.get(child.index).some(m=>m.name.includes('translation4init4Zero'))
          ||Object.values(child.staticVectors.transform.rotation).flat().some(Boolean))throw Error('Unadmitted Particle center/rotation profile');
        const joint=dependentStates.get(cell.slot);
        const make=nativeParticleXMakeInputs({scalar:scalars[cell.slot][0],center:joint.origin,groupScale:joint.scale,rotationMode:'Absent'});
        if(particlePacketProgram){
          const state={...make,...vectors.get(child.index)[cell.slot],alpha:1,frame,instance:cell.slot};
          particlePackets.push({frame,node:child.index,instance:cell.slot,type:'particle-render-packet',
            vertices:nativeParticleXPacket(particlePacketProgram,state).vertices,
            context:{parentState:joint,rng:[...owners.get(child.index).rng.words]}});
        }
        makeSimulated.push({frame,type:'particle-x-make-inputs',node:child.index,instance:cell.slot,...make,
          context:{parentState:joint,rng:owners.get(child.index).rng.words}});
      }
    }
  }
  const comparison=compareLifecycleEvents(native,simulated);
  if(moduleInputs){
    const baseline=events=>events.filter(e=>!(e.node===parent.index&&e.type.startsWith('module-')&&e.module.includes('translation6update8Velocity')))
      .map(e=>Object.fromEntries(Object.entries(e).filter(([k])=>!['translation','uvScale','color','velocityXYZ','worldTranslation'].includes(k))));
    comparison.baselineComparison=compareLifecycleEvents(baseline(native),baseline(simulated));
    comparison.moduleObservations=Object.fromEntries(['translation','uvScale','color','velocityXYZ','worldTranslation'].map(field=>[field,native.filter(e=>e[field]).length]));
    const withoutWorld=events=>events.map(e=>Object.fromEntries(Object.entries(e).filter(([k])=>k!=='worldTranslation')));
    comparison.recordComparison=compareLifecycleEvents(withoutWorld(native),withoutWorld(simulated));
    comparison.worldProjection={certified:false,suppliedParentTransforms:!independentParent,coordinates:540,
      differingCoordinates:comparison.differences.flatMap(d=>d.fields.filter(f=>f.field.startsWith('worldTranslation.'))).length,
      maximumAbsoluteResidual:Math.max(0,...comparison.differences.flatMap(d=>d.fields.filter(f=>f.field.startsWith('worldTranslation.')).map(f=>Math.abs(f.original-f.simulator)))),
      boundary:independentParent?'Source-parameter/initial-seed/root-scene parent transform; no pixel-fidelity claim':'Measured parent basis/origin supplied; no complete ancestor reconstruction or pixel-fidelity claim'};
  }
  const scalarObservations=native.filter(e=>e.scalar),simulatedScalars=new Map(simulated.filter(e=>e.scalar).map(e=>[JSON.stringify([e.frame,e.type,e.instance,e.module]),e.scalar]));
  let maximumScalarResidual=0;
  for(const e of scalarObservations){
    const actual=simulatedScalars.get(JSON.stringify([e.frame,e.type,e.instance,e.module]));
    if(!actual){maximumScalarResidual=null;break;}
    maximumScalarResidual=Math.max(maximumScalarResidual,...e.scalar.map((v,i)=>Math.abs(v-actual[i])));
  }
  return {...comparison,boundary:{profile:'connected-parent-generator-projection-v1',nodes:ids,frames:frames.length,
    originalRunEvents:rows.length,nativeInitialSeeds:true,hostActivationAndLifetimeInput:true,
    moduleScope:moduleInputs?'Scalar/Null translation/Particle UV scale/color records; parent init offset0/multiplier1 explicitly supplied':'Numeric VelocityX scalar; other observed initializers RNG-only',observedModuleDispatchInput:true,
    suppliedNativeParentTransforms:!!moduleInputs&&!independentParent,independentParentTransform:!!reconstructedParent,geometryCompared:false,fullSourceReconstructed:false,globalNineNodePlaybackEnabled:false},
    particlePackets,
    parentTransformComparison:reconstructedParent?.report??null,
    dependentTransformComparison:independentParent?{...compareLifecycleEvents(dependentNative,dependentSimulated),
      native:dependentNative,simulated:dependentSimulated,scope:'Neutral local rotation/scale + independently moving Null parent records',
      suppliedComputedNativeMatrices:false}:null,
    particleMakeComparison:independentParent?{...compareLifecycleEvents(makeNative,makeSimulated),native:makeNative,simulated:makeSimulated,
      geometryEmitted:false,writerAdmitted:false,boundary:'Center and local/group scale inputs only; source uses a two-texture writer, not the independently verified single-texture writer'}:null,
    scalarComparison:{observations:scalarObservations.length,values:scalarObservations.length*2,maximumAbsoluteResidual:maximumScalarResidual},
    jointChecks,modulePrograms:[...modulePrograms].map(([node,program])=>({node,program})),
    final:{hostInitial,host,parents:jointSlots,cells,scalars,translations,vectorRecords:Object.fromEntries(vectors),owners:ids.map(node=>({node,...owners.get(node).snapshot()}))},native,simulated};
}
