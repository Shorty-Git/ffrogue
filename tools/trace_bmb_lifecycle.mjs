// Replay the existing common player and join bounded native activation evidence.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { instances, createEffectPlayer, nativeActivationTrace, NativeRandom, activateConstantGenerator, NativePhaseClock } from './original_effect_player.mjs';
import {replayParentGenerators} from './lib/parent-generator-replay.mjs';
import {nullInitializationFlags} from './lib/null-initialization.mjs';

export const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file,'utf8'));
const NATIVE = '6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77';

/** Validate one ordered recorder stream without inventing unobserved ownership. */
export function auditConnectedRun(rows, expectedNodes, effect=null) {
  if(!Array.isArray(rows)||rows[0]?.type!=='capture-start')throw Error('Capture-start required');
  if(JSON.stringify(rows[0].expectedNodes.map(n=>[n.index,n.typeId,n.parent]))!==JSON.stringify(expectedNodes.map(n=>[n.index,n.typeId,n.parent])))throw Error('Source node identity mismatch');
  const issues=[],open=new Map(),pairs=[],counts={},nodes=expectedNodes.map(n=>({...n,emitters:[],initPairs:0,activations:0,birthCalls:0,updates:0,modulePairs:0,rngTransitions:0,status:'MISSING',missing:[],generatorRecords:[]}));
  for(const [i,row]of rows.entries()){
    if(row.seq!==i+1)issues.push({seq:row.seq,reason:'Missing/reordered sequence'});
    counts[row.type]=(counts[row.type]??0)+1;
    if(['hook-error','module-error','stack-mismatch'].includes(row.type))issues.push(row);
    if(row.type.endsWith('-enter')){
      if(open.has(row.call))issues.push({seq:row.seq,reason:'Duplicate call identity'});
      open.set(row.call,row);
    }else if(row.type.endsWith('-leave')){
      const before=open.get(row.call);
      if(!before||before.type.replace(/-enter$/,'')!==row.type.replace(/-leave$/,''))issues.push({seq:row.seq,reason:'Unmatched return'});
      else{pairs.push([before,row]);open.delete(row.call);}
    }
    if(Number.isInteger(row.node)){
      const node=nodes.find(n=>n.index===row.node);if(!node)throw Error('Observed node outside source');
      if(row.emitter&&!node.emitters.includes(row.emitter))node.emitters.push(row.emitter);
      if(row.type==='activate-enter')node.activations++;
      if(row.type==='birth-enter')node.birthCalls++;
      if(row.type==='birth-enter'&&row.generatorArg&&!node.generatorRecords.includes(row.generatorArg))node.generatorRecords.push(row.generatorArg);
      if(row.type==='update-enter')node.updates++;
    }
  }
  const byCall=new Map(rows.filter(r=>r.type.endsWith('-enter')).map(r=>[r.call,r]));
  const parentLinks=rows.filter(r=>r.type==='activate-enter'&&r.parent?.id).map(r=>{
    const caller=byCall.get(r.parentCall);
    return {seq:r.seq,frame:r.frame,node:r.node,emitter:r.emitter,joint:r.parent.id,pointer:r.parent.pointer,lifeTicks:r.parent.lifeTicks,ageTicks:r.parent.ageTicks,
      parentNode:caller?.type==='birth-enter'?caller.node:caller?.type==='tree-init-enter'?expectedNodes.find(n=>n.parent===null)?.index:null,
      parentEmitter:caller?.type==='birth-enter'?caller.emitter:null,birthCall:caller?.type==='birth-enter'?caller.call:null,
      provenance:'Recorded activation parent pointer and enclosing original callback; not source-topology inference'};
  });
  const rootInit=rows.find(r=>r.type==='tree-init-leave'&&r.tree?.joint?.lifeTicks!==undefined);
  const root=nodes.find(n=>n.parent===null);
  if(rootInit&&root&&root.initPairs===0&&!root.emitters.length){
    root.role='Observed host joint; no emitter Initialize';root.status='PARTIAL';
  }
  const activationChecks=[];
  if(effect)for(const [before,after]of pairs.filter(([r])=>r.type==='activate-enter')){
    const generation=effect.nodes.find(n=>n.index===before.node)?.nativeGeneration;
    if(!generation||!before.state?.rng||!after.state?.rng)continue;
    const result=activateConstantGenerator(generation,new NativeRandom(before.state.rng));
    activationChecks.push({node:before.node,call:before.call,rngMatches:JSON.stringify(result.rngAfter.words)===JSON.stringify(after.state.rng),
      boundary:'RNG activation parity only; different per-parent generator records are not collapsed into one state'});
  }
  const clockChecks=[];
  // This exact trace profile has zero header RootLife and neutral clock flags.
  // Do not turn it into default flags for a different source or context.
  if(rootInit?.tree?.joint?.lifeTicks===0&&rootInit.tree.flags==='0000000101000000'){
    const clock=new NativePhaseClock({profile:'native-node-tree-clock-v1',nodeCount:rootInit.tree.entries.length,lifeTicks:0});
    for(const [before,after]of pairs.filter(([r])=>r.type==='tree-update-enter'&&r.tree?.id===rootInit.tree.id)){
      const phases=rows.filter(r=>r.parentCall===before.call&&['update-enter','post-enter'].includes(r.type))
        .map(r=>({phase:r.type==='update-enter'?'update':'post',delta:r.context.delta}));
      const actual=clock.step(before.context.delta);
      clockChecks.push({call:before.call,delta:before.context.delta,
        phasesMatch:JSON.stringify(actual.events.map(r=>({phase:r.phase,delta:r.delta})))===JSON.stringify(phases),
        returnMatches:actual.returned===after.result,ageMatches:actual.ageTicks===after.tree.joint.ageTicks,
        contextDeltaMatches:actual.remainingDelta===after.context.delta});
    }
  }
  const nullSlotTracks=new Map(),renderTracks=new Map();
  for(const row of rows){
    if(row.type==='post-leave'&&row.state?.jointStorage?.slots?.length){
      const storage=row.state.jointStorage,slots=storage.slots,chunk=slots[0].raw.length/2,base=BigInt(slots[0].pointer);
      // Rev32 stored contiguous152-byte windows over a144-byte Null-joint pool.
      // Re-slice the retained bytes; do not repeat a measurement for this mismatch.
      if(slots.some((s,i)=>BigInt(s.pointer)!==base+BigInt(i*chunk)))throw Error('Noncontiguous native Null storage');
      const bytes=Buffer.from(slots.map(s=>s.raw).join(''),'hex');
      if(bytes.length<storage.capacity*144)throw Error('Incomplete native Null storage');
      for(let i=0;i<storage.capacity;i++){
        const pointer='0x'+(base+BigInt(i*144)).toString(16),birth=parentLinks.find(p=>p.parentEmitter===row.emitter&&p.pointer===pointer);
        if(!birth||birth.seq>row.seq)continue;
        const id=row.emitter+':'+i,track=nullSlotTracks.get(id)??{node:row.node,emitter:row.emitter,slot:i,pointer,birthFrame:birth.frame,samples:[]};
        track.samples.push({frame:row.frame,lifeTicks:bytes.readInt32LE(i*144+0x60),ageTicks:bytes.readInt32LE(i*144+0x64)});
        nullSlotTracks.set(id,track);
      }
    }
    if(row.type==='module-enter'&&row.parentCall===null&&row.candidates.some(c=>c.stage==='make')){
      const id=row.node+':'+row.before.record,track=renderTracks.get(id)??{node:row.node,record:row.before.record,frames:[]};
      if(!track.frames.includes(row.frame))track.frames.push(row.frame);renderTracks.set(id,track);
    }
  }
  for(const [before,after]of pairs){
    const node=nodes.find(n=>n.index===before.node);if(!node)continue;
    if(before.type==='init-enter')node.initPairs++;
    if(before.type==='module-enter'){
      node.modulePairs++;
      if(before.before?.rngOwner&&before.before.rngOwner===after.after?.rngOwner&&Array.isArray(before.before.rng)&&Array.isArray(after.after?.rng))node.rngTransitions++;
    }
  }
  for(const node of nodes){
    node.status=node.role||node.emitters.length||node.initPairs?'PARTIAL':'MISSING';
    if(!node.initPairs&&!node.role)node.missing.push('Paired source Initialize and initial RNG/context');
    if(!node.role){
      if(!node.activations)node.missing.push('Observed parent-joint activation');
      if(!node.birthCalls)node.missing.push('Observed birth callback and instance mapping');
      if(!node.rngTransitions)node.missing.push('Joined before/after module RNG ownership');
    }
    node.missing.push('Validated per-instance lifetime termination and release',node.typeId===0?'Complete inherited joint state at matching original ages':'Full geometry/material submission at matching original ages');
  }
  const end=rows.at(-1),closed=end.type==='capture-end';
  if(!closed)issues.push({reason:'Missing capture-end; open/truncated run'});
  if(open.size)issues.push({reason:'Unreturned native calls',calls:[...open.keys()]});
  if((rows[0].missingHooks??[]).length||(closed&&(end.missingHooks??[]).length))issues.push({reason:'Missing hooks'});
  return {schemaVersion:1,approved:false,wholeEffectReconstructed:false,completeNativeNodes:0,
    source:{name:rows[0].source,sha256:rows[0].sourceSha256},closed,endReason:closed?end.reason:null,
    controlled:rows.some(r=>r.type.startsWith('controlled-')),events:rows.length,pairedCalls:pairs.length,counts,nodes,issues,
    parentLinks,activationChecks,clockChecks,rootInit:rootInit?{seq:rootInit.seq,tree:rootInit.tree}:null,
    controlledFrames:rows.filter(r=>r.type==='controlled-step').map(r=>({frame:r.frame,delta:r.delta,originalDelta:r.originalDelta})),
    nullSlotTracks:[...nullSlotTracks.values()],renderTracks:[...renderTracks.values()],
    storageInterpretation:'Null joint stride144 is confirmed by15 actual parent pointers and original Null Initialize at1fbcdf4/1fbce0c; host root allocation is152. Raw observations remain immutable.',
    sourceConnectedNativeStates:rows.filter(r=>r.state?.id||r.tree?.id).length,
    boundary:'Ordered raw observation coverage only. Original identity, per-instance release, timing perturbation and numeric simulation parity require separate validation.'};
}

/** Join cached evidence without rerunning the player or splicing independent fixtures. */
export function auditLifecycleEvidence({traceFile,planFile,referenceFiles}) {
  const trace=json(traceFile),plan=json(planFile),effect=plan.effects.find(e=>e.sha256===trace.source?.sha256);
  if(!effect||trace.plan.sha256!==hash(planFile)||trace.reference.nativeSha256!==NATIVE
    ||trace.wholeEffectReconstructed!==false||trace.completeNativeNodes!==0)
    throw Error('Pinned experimental source trace/plan required');
  if(effect.nodes.length!==trace.nodeInventory.length||effect.nodes.some((node,i)=>
    node.index!==trace.nodeInventory[i].index||node.typeId!==trace.nodeInventory[i].type
    ||node.parentIndex!==trace.nodeInventory[i].parent))throw Error('Cached source inventory mismatch');
  const nodes=effect.nodes.map(node=>({index:node.index,typeId:node.typeId,parent:node.parentIndex,children:node.children,
    generation:node.generation,nominalLife:node.lifeParameter,lifeRange:node.lifeRangeParameter,
    evidence:[],connectedLifecycle:'MISSING',originalBirth:null,originalEnd:null,originalParentInstance:null,originalRngState:null,
    missing:{initialValues:['Actual InitContext, emitter seed/flags and source time origin'],
      linkage:['Ordered creation/instance identity and parent joint','Per-instance phase, record and RNG transitions'],
      originalSemantics:node.typeId===0?['Parent/child survival and source-selected fourth phase']:['Parent callback/inheritance at birth and updates'],
      implementation:node.typeId===0?['Connected Null scheduling/child allocation with actual contexts']:['Source-selected full module execution inside connected traversal']}}));
  const references=[];
  for(const file of [...new Set(referenceFiles)]){
    const receipt=json(file);
    if(receipt.nativeSha256!==NATIVE)throw Error('Foreign native reference: '+file);
    const entries=[];
    for(const group of ['cases','sourceCases','sourceInitializedCases','sourceFields']){
      for(const [rowIndex,row]of (receipt[group]??[]).entries()){
        if(row.sourceSha256!==effect.sha256)continue;
        const node=nodes.find(n=>n.index===row.node);
        if(!node)throw Error('Reference node outside source: '+file);
        if(row.source){
          if(path.basename(row.source)===row.source){
            if(row.source!==effect.name)throw Error('Reference source basename mismatch: '+file);
          }else if(hash(row.source)!==effect.sha256)throw Error('Stale reference source: '+file);
        }
        const result=row.result??{},chain=result.chain;
        const observation={file,group,row:rowIndex,sourceSha256:row.sourceSha256,
          fixtureOnly:true,sourceConnected:false,
          kind:result.phases?'module-chain':group==='sourceFields'?'raw-initialization-fields'
            :result.updates?'scheduler-fixture':'activation-fixture',
          phaseCounts:result.phases?Object.fromEntries(Object.entries(result.phases).map(([k,v])=>[k,v.length])):null,
          selectedAuxiliaryModules:result.auxiliaryModules??null,auxiliaryFlagFixture:receipt.auxiliaryFlagFixture??null,
          chainStatus:chain?.status??null,rngAfterInit:chain?.rngAfterInit??null,rngAfterUpdates:chain?.rngAfterUpdates??null,
          workBytes:result.workBytes??null,fixtureParent:chain?.updateParentFixture??null,
          geometrySamples:chain?.updates?.filter(update=>update.vertices).length??0,
          initializedGenerator:result.initial??null,updateCount:result.updates?.length??null,
          callbackPolicy:result.callbackPolicy??null,moduleCalls:result.moduleCalls??null,
          phaseModules:result.phases??null,inputs:row.inputs??row.fields??null,
          selectorContext:group==='sourceFields'?{parentFlags:row.actualParentFlags??null,childFlags:row.actualChildFlags??null}:null,
          boundary:row.boundary??chain?.boundary??receipt.boundary??result.boundary??null};
        node.evidence.push(observation);entries.push({node:row.node,group,row:rowIndex});
      }
    }
    references.push({file,sha256:hash(file),matchedSourceEntries:entries,
      scope:entries.length?'Independent exact-source fixtures':'Context-only; no exact-source node ownership'});
  }
  for(const node of nodes){
    node.status=node.evidence.length?'PARTIAL':'MISSING';
    if(node.typeId===0&&node.parent===null)node.missing.originalSemantics.push('Root stop/zero nominal lifetime policy in the actual caller');
    if(node.children.length)node.missing.linkage.push('Child Initialize return flags and emitter/joint ownership');
  }
  return {schemaVersion:1,approved:false,wholeEffectReconstructed:false,completeNativeNodes:0,
    source:{name:effect.name,sha256:effect.sha256},
    cachedTrace:{file:traceFile,sha256:hash(traceFile),playerSha256:trace.implementation.player,
      sameCurrentPlayerBytes:trace.implementation.player===hash('src/effects/originalEffectPlayer.mjs'),
      policy:'Cached preview snapshots are historical; no player/native code was re-executed'},
    plan:{file:planFile,sha256:hash(planFile)},nativeSha256:NATIVE,references,nodes,
    firstUnresolvedBoundary:'Before the first source birth: actual root/child initialization, ordered emitter ownership, seeds and context flags',
    independentFixturesAreNotOneRun:true,
    measurementRequired:['Source/node/emitter/instance/parent identities before Initialize',
      'Monotonic ordered Initialize/activation/birth/update/post/fourth-phase/death events',
      'Before/after context words, module record/cursor, RNG owner and four words',
      'Actual source removal or explicit truncation; joined geometry/material outputs'],
    sourceConnectedNativeStates:0};
}

export async function traceEffect({planFile,effectName,referenceFile,moduleReferenceFiles=[],nullFlagsReferenceFile,frames}) {
  const plan=json(planFile), effect=structuredClone(plan.effects.find(e=>e.name===effectName));
  if(!effect)throw Error('Exact effect name absent from plan');
  const reference=json(referenceFile);
  const nullFlags=nullFlagsReferenceFile?json(nullFlagsReferenceFile):null;
  if(nullFlags){
    if(nullFlags.nativeSha256!==NATIVE||nullFlags.wholeEffectReconstructed!==false)throw Error('Pinned bounded Null flag receipt required');
    for(const c of nullFlags.cases)if(JSON.stringify(nullInitializationFlags(c.inputs))!==JSON.stringify(c.result))throw Error('Original Null flag rule mismatch');
  }
  if(reference.nativeSha256!==NATIVE||reference.approved!==false||reference.wholeEffectReconstructed!==false)
    throw Error('Pinned bounded native activation receipt required');
  const cases=reference.cases.filter(c=>c.sourceSha256===effect.sha256);
  const controls=cases.filter(c=>c.seed[0]===123456789&&c.seed[1]===362436069&&c.seed[2]===521288629&&c.seed[3]===88675123);
  if(controls.length!==effect.nodes.length||new Set(controls.map(c=>c.node)).size!==effect.nodes.length)throw Error('Incomplete exact-source activation coverage');
  for(const node of effect.nodes){
    const c=controls.find(c=>c.node===node.index);
    if(!c||hash(c.source)!==effect.sha256)throw Error('Stale source or reference');
    node.nativeGeneration=c.inputs;
  }
  const activations=nativeActivationTrace(effect,effect.nodes.map(node=>controls.find(c=>c.node===node.index).seed));
  for(const row of activations){
    const expected=controls.find(c=>c.node===row.node).result,a=row.activation;
    for(const [key,value]of Object.entries(expected))if(JSON.stringify(key==='rng'?a.rngAfter.words:a[key])!==JSON.stringify(value))
      throw Error('Native activation mismatch at node '+row.node+' field '+key);
  }
  const events=[],built=instances(effect,plan.seed,plan.effectHorizon,e=>events.push(e));
  const initialization=new Map(events.filter(e=>e.phase==='legacy-instance').map(e=>[e.id,e]));
  frames??=Math.ceil(Math.max(0,...built.map(item=>item.birth+item.life)))+1;
  if (!Number.isInteger(frames)||frames<1||frames>1000) throw Error('Bounded positive frame count required');
  // Reuse the same locally supplied Three.js as the existing browser player.
  const threeFile='tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js';
  const context=vm.createContext({console});vm.runInContext(fs.readFileSync(threeFile,'utf8'),context);
  const THREE=context.THREE;
  // Texture pixels cannot affect this CPU geometry observation. No GPU/pixel test.
  THREE.TextureLoader=class {load(url,done){const t=new THREE.Texture({width:1,height:1});queueMicrotask(()=>done(t));return t;}};
  const scene=new THREE.Scene(), member=plan.members.find(m=>plan.effects[m.effect]?.name===effectName);
  if(!member)throw Error('Missing plan member');
  const player=await createEffectPlayer(THREE,scene,{...plan,rendererReference:undefined,
    effects:[effect],members:[{...member,effect:0,startFrame:0,scalePercent:100,rotation:[0,0,0]}]});
  const rows=[];
  const phases=[];
  for(const file of moduleReferenceFiles){
    if(!fs.existsSync(file)){phases.push({file,available:false});continue;}
    const receipt=json(file);
    if(receipt.nativeSha256!==NATIVE)throw Error('Foreign native module receipt');
    phases.push({file,sha256:hash(file),available:true,auxiliaryFlagFixture:receipt.auxiliaryFlagFixture,
      cases:receipt.cases.filter(c=>c.sourceSha256===effect.sha256).map(c=>({node:c.node,phases:c.result.phases,
        auxiliaryModules:c.result.auxiliaryModules,workBytes:c.result.workBytes,
        chainStatus:c.result.chain?.status,chainBoundary:c.result.chain?.boundary}))});
  }
  let prior=new Set();
  for(let frame=0;frame<frames;frame++){
    player.update(frame,()=>({x:0,y:0,rootScale:[1,1,1]}),{x:-320,y:-550,width:640,height:1100});
    const state=player.traceSnapshot();
    const existing=new Set(state.filter(s=>frame>=s.birth&&frame<s.birth+s.life).map(s=>s.id));
    rows.push({frame,clock:'Experimental source time; not native draw ordinal',
      born:[...existing].filter(id=>!prior.has(id)),ended:[...prior].filter(id=>!existing.has(id)),
      legacyInitializationAtBirth:[...existing].filter(id=>!prior.has(id)).map(id=>initialization.get(id)),
      rngDuringFrameUpdate:'No initialization draws here: the legacy player prebuilds the complete instance tree before F0',
      instances:state.filter(s=>existing.has(s.id)),
      parentStateAtBirth:state.filter(s=>existing.has(s.id)&&!prior.has(s.id)).map(s=>({id:s.id,parent:s.parent,
        parentMatrix:s.parent===null?null:state.find(p=>p.id===s.parent).worldMatrix,
        boundary:'Current common-player matrix at this integer birth frame; original inheritance selection is not certified'})),
      renderRequests:state.filter(s=>s.visible).map(s=>({id:s.id,node:s.node,vertices:s.worldVertices,triangles:s.triangleIndices,material:s.material})),
      originalInstances:null,originalRngTransitions:null,
      submissionOrder:'Requests in instance order; no original GPU ordering is implied',
      nativeComparison:'Blocked: synchronized whole-tree reference absent'});
    prior=existing;
  }
  return {schemaVersion:1,approved:false,wholeEffectReconstructed:false,completeNativeNodes:0,
    source:{name:effect.name,sha256:effect.sha256},plan:{file:planFile,sha256:hash(planFile)},
    implementation:{player:hash('src/effects/originalEffectPlayer.mjs'),playerEntry:hash('tools/original_effect_player.mjs'),lifecycle:hash('tools/bmb_lifecycle.mjs'),runtimeLifecycle:hash('src/effects/nativeLifecycle.mjs'),nullFlags:hash('tools/lib/null-initialization.mjs'),three:hash(threeFile),tracer:hash('tools/trace_bmb_lifecycle.mjs')},
    reference:{file:referenceFile,sha256:hash(referenceFile),nativeSha256:NATIVE},
    boundaries:['Actual common-player CPU geometry under zero origin/identity root; textures are dimension-only fixtures, no GPU/pixel comparison',
      'Activation fixtures have independent explicit per-emitter RNG states; they are not a recovered NodeTree initialization policy',
      'Legacy recursive births, sampled transforms, parent matrices, death and material requests remain experimental',
      'Legacy instance end uses birth+life; original callback expiration, child survival and fourth phases remain unknown'],
    nullInitializationReference:nullFlags?{file:nullFlagsReferenceFile,sha256:hash(nullFlagsReferenceFile),blocks:nullFlags.blocks,
      staticDataflow:nullFlags.staticDataflow,boundary:nullFlags.boundary}:null,
    nodeInventory:effect.nodes.map(n=>({index:n.index,type:n.typeId,parent:n.parentIndex,children:n.children,
      nativeNullFlags:n.typeId===0&&nullFlags?{sourceFields:nullFlags.sourceFields.find(c=>c.sourceSha256===effect.sha256&&c.node===n.index)?.fields??null,
        parentFlags:null,childFlags:null,auxiliaryFlag:null,boundary:'Actual InitContext+0x5c before/after child Initialize required; no flag0 assumption'}:null,
      generation:n.generation,nativeGeneration:n.nativeGeneration,storedLife:n.lifeParameter,lifeRange:n.lifeRangeParameter,
      transforms:n.staticVectors.transform,inheritance:n.authoringInheritance,resources:n.resourceBindings,
      resourceIdentities:Object.values(n.resourceBindings).filter(Boolean).map(binding=>({kind:binding.kind,name:binding.name,
        prepared:binding.kind==='texture'?plan.files?.[effect.textures[binding.name]]??null:null})),material:n.nativeMaterialSelection,
      originalBirth:null,originalEnd:null,originalRngInput:null,originalPhaseOrder:null})),
    firstUnsupportedBoundary:'Root/child activation ownership and Initialize/NodeTree phase order precede all geometry; integer preview seed cannot specify native emitter states',
    nativeModuleReceipts:phases,
    activationMatches:activations.length,activations,legacyInstanceCount:built.length,legacyEvents:events,issues:player.issues,frames:rows};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const args=process.argv.slice(2),value=k=>args[args.indexOf(k)+1];
  if(args.includes('--native-run')){
    for(const key of ['--plan','--output'])if(!args.includes(key))throw Error('Required '+key);
    const input=value('--native-run'),output=value('--output'),planFile=value('--plan');
    if(!path.resolve(output).startsWith(path.resolve('tools/data')+path.sep))throw Error('Audit output must stay in tools/data');
    const rows=fs.readFileSync(input,'utf8').trim().split('\n').map(JSON.parse),plan=json(planFile);
    const effect=plan.effects.find(e=>e.sha256===rows[0]?.sourceSha256);if(!effect)throw Error('Native source outside pinned plan');
    if(args.includes('--reference')){
      const reference=json(value('--reference'));if(reference.nativeSha256!==NATIVE)throw Error('Foreign native activation reference');
      for(const node of effect.nodes){
        const matches=reference.cases.filter(c=>c.sourceSha256===effect.sha256&&c.node===node.index);
        if(!matches.length||matches.some(c=>JSON.stringify(c.inputs)!==JSON.stringify(matches[0].inputs)))throw Error('Ambiguous source activation inputs');
        node.nativeGeneration=matches[0].inputs;
      }
    }
    const audit=auditConnectedRun(rows,effect.nodes.map(n=>({index:n.index,typeId:n.typeId,parent:n.parentIndex})),effect);
    Object.assign(audit,{input:{file:input,sha256:hash(input)},plan:{file:planFile,sha256:hash(planFile)}});
    if(args.includes('--reference'))audit.activationReference={file:value('--reference'),sha256:hash(value('--reference')),nativeSha256:NATIVE};
    if(args.includes('--compare-generators')){
      if(audit.issues.length||!args.includes('--reference'))throw Error('Clean connected audit and pinned activation reference required');
      const control=args.includes('--comparison-control')?value('--comparison-control'):null;
      if(control&&!['no-parent-gate','reset-child-seed'].includes(control))throw Error('Unknown deliberate comparison control');
      audit.generatorComparison=replayParentGenerators(rows,effect,new Map(effect.nodes.map(n=>[n.index,n.nativeGeneration])),
        {ignoreParentGate:control==='no-parent-gate',cloneChildSeeds:control==='reset-child-seed',
          independentParent:args.includes('--independent-parent'),moduleInputs:args.includes('--module-inputs')?json(value('--module-inputs')):null});
      audit.generatorComparison.deliberateControl=control;
      if(args.includes('--module-inputs'))audit.generatorComparison.moduleInputReference={file:value('--module-inputs'),sha256:hash(value('--module-inputs'))};
      audit.generatorComparison.implementation={runtime:hash('src/effects/nativeLifecycle.mjs'),
        transform:hash('src/effects/nativeTransform.mjs'),nullTransformReplay:hash('tools/lib/null-transform-replay.mjs'),
        replay:hash('tools/lib/parent-generator-replay.mjs'),comparison:hash('tools/lib/lifecycle-comparison.mjs')};
    }
    fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(audit,null,2)+'\n');
    console.log(JSON.stringify({output,events:audit.events,sourceConnectedNativeStates:audit.sourceConnectedNativeStates,completeNativeNodes:audit.completeNativeNodes,issues:audit.issues.length,
      ...(audit.generatorComparison?{matched:audit.generatorComparison.matchedEvents,differences:audit.generatorComparison.differences.length}:{} )}));
    const comparisons=[audit.generatorComparison,audit.generatorComparison?.parentTransformComparison,
      audit.generatorComparison?.dependentTransformComparison,audit.generatorComparison?.particleMakeComparison];
    process.exit(comparisons.some(c=>c?.differences.length)?1:0);
  }
  if(args.includes('--audit-existing')){
    for(const key of ['--plan','--reference','--output'])if(!args.includes(key))throw Error('Required '+key);
    const output=value('--output');
    if(!path.resolve(output).startsWith(path.resolve('tools/data')+path.sep))throw Error('Audit output must stay in tools/data');
    const audit=auditLifecycleEvidence({traceFile:value('--audit-existing'),planFile:value('--plan'),
      referenceFiles:[value('--reference'),...args.flatMap((v,i)=>v==='--module-reference'?[args[i+1]]:[])]});
    fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(audit,null,2)+'\n');
    console.log(JSON.stringify({nodes:audit.nodes.length,completeNativeNodes:0,sourceConnectedNativeStates:0,output}));
    process.exit(0);
  }
  for(const key of ['--plan','--effect','--reference','--output'])if(!args.includes(key))throw Error('Required '+key);
  const output=value('--output');if(!path.resolve(output).startsWith(path.resolve('tools/data')+path.sep))throw Error('Trace output must stay in tools/data');
  const trace=await traceEffect({planFile:value('--plan'),effectName:value('--effect'),referenceFile:value('--reference'),
    nullFlagsReferenceFile:args.includes('--null-flags-reference')?value('--null-flags-reference'):undefined,
    moduleReferenceFiles:args.flatMap((v,i)=>v==='--module-reference'?[args[i+1]]:[]),frames:args.includes('--frames')?Number(value('--frames')):undefined});
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(trace,null,2)+'\n');
  console.log(JSON.stringify({nativeActivationMatches:trace.activationMatches,legacyInstances:trace.legacyInstanceCount,
    frames:trace.frames.length,completeNativeNodes:0,wholeEffectReconstructed:false,output}));
}
