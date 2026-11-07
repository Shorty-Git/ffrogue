// Offline geometry diagnosis. Counterfactuals never change playback or publication.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {instances,createTransformEvaluator,particleGeometryEligibility,particleDisplayWorldMatrix} from './original_effect_player.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function bounds(points) {
  if(!points.length||points.some(p=>p.length!==3||!p.every(Number.isFinite)))throw Error('Expected finite XYZ points');
  const min=[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),max=[0,1,2].map(i=>Math.max(...points.map(p=>p[i])));
  return {min,max,center:min.map((v,i)=>(v+max[i])/2),size:min.map((v,i)=>max[i]-v)};
}
export function projectPoint(camera,point) {
  const transform=(m,p)=>[0,1,2,3].map(r=>p.reduce((sum,v,c)=>sum+m[c*4+r]*v,0));
  if([camera.viewMatrix,camera.projectionMatrix].some(m=>m?.length!==16||!m.every(Number.isFinite))||
    camera.viewport?.length!==2||!camera.viewport.every(v=>Number.isFinite(v)&&v>0)||point.length!==3||!point.every(Number.isFinite))throw Error('Invalid captured projection input');
  const p=transform(camera.projectionMatrix,transform(camera.viewMatrix,[...point,1]));
  if(Math.abs(p[3])<1e-9)throw Error('Zero homogeneous W');
  return [(p[0]/p[3]+1)*camera.viewport[0]/2,(1-p[1]/p[3])*camera.viewport[1]/2, p[2]/p[3]];
}
export function requireJoinedCapture(trace,particles) {
  if(!trace.calibrationPassed||trace.boot?.observerRevision<14||!trace.arm?.token||
    trace.boot.nativeSha256!==particles.boot?.nativeSha256||trace.arm.token!==particles.arm?.token||
    trace.arm.seq!==particles.arm.seq)throw Error('Expected calibrated same-build, same-arm capture summaries');
}

export function analyzeLocator(THREE,plan,trace,particles,effectName,nodeIndex,frame) {
  requireJoinedCapture(trace,particles);
  if(plan.approved!==false||!Number.isFinite(frame)||frame<0)throw Error('Expected unapproved research plan and finite effect frame');
  if(plan.rendererReference?.nativeSha256!==trace.boot.nativeSha256)throw Error('Plan/capture native build mismatch');
  const effect=plan.effects.find(e=>e.name===effectName),node=effect?.nodes[nodeIndex];
  if(!node)throw Error('Missing effect/node');
  const name=effectName.replace(/\.bmb$/,''),members=plan.members.filter(m=>plan.effects[m.effect]===effect);
  if(members.length!==1)throw Error('Select an effect with one unambiguous source member');
  const gate=particleGeometryEligibility(effect,node,members[0]);
  if(!plan.particleGeometry||!gate.supported)throw Error('Display geometry outside declared subset: '+gate.reasons.join('; '));
  const sourceStates=particles.particles.filter(p=>p.file===name&&p.node===nodeIndex).flatMap(p=>p.samples.map(s=>s.state));
  if(!sourceStates.length||sourceStates.some(s=>s.originalSha256!==effect.sha256))throw Error('Native/source identity mismatch');
  const vertices=particles.vertices.filter(v=>v.file===name&&v.node===nodeIndex);
  if(!vertices.length)throw Error('No native vertex output');
  if(new Set(vertices.map(v=>v.sample)).size!==vertices.length||
    new Set(vertices.map(v=>v.object)).size!==1||
    vertices.some(v=>!sourceStates.some(s=>s.object===v.object)))throw Error('Ambiguous native particle samples');
  if(new Set(trace.rendererStates.filter(r=>r.file===name&&r.phase==='before-draw').map(r=>r.object)).size!==1)throw Error('Ambiguous native wrapper');
  const samples=vertices.map(v=>{
    if(v.vertexCount!==6||v.positions.length!==6)throw Error('Expected six native CPU vertices');
    const state=trace.rendererStates.filter(r=>r.file===name&&r.phase==='before-draw'&&r.seq<v.seq).at(-1);
    if(!state?.camera)throw Error('No preceding before-draw camera for native sample');
    return {seq:v.seq,sample:v.sample,state,native:bounds(v.positions)};
  });
  const first=samples[0];
  if(samples.some(s=>JSON.stringify([s.state.object,s.state.camera,s.state.animationPosition,s.state.animationScale])!==JSON.stringify([first.state.object,first.state.camera,first.state.animationPosition,first.state.animationScale])))throw Error('Camera/root changed: inspect samples separately');
  if(first.state.animationScale.some(v=>v!==first.state.animationScale[0])||members[0].rotation.some(v=>v!==0))throw Error('Nonuniform root scale or member rotation not supported by this audit');
  const root=new THREE.Matrix4().makeScale(...first.state.animationScale);
  root.setPosition(new THREE.Vector3(...first.state.animationPosition));
  const built=instances(effect,plan.seed,plan.effectHorizon),states=createTransformEvaluator(THREE,effect,built)(frame,!!plan.sourceInheritance,!!plan.sourceAppearance,!!plan.nullLocator,!!plan.nullLocator&&!!plan.nativeNullLocator);
  const live=built.filter(i=>i.node===nodeIndex&&frame>=i.birth&&frame<i.birth+i.life);
  if(live.length!==1)throw Error('Expected exactly one live evaluator instance at requested frame');
  const item=live[0],world=new THREE.Matrix4().multiplyMatrices(root,states[item.id].matrix);
  const corners=m=>[[-.5,-.5,0],[.5,-.5,0],[.5,.5,0],[-.5,.5,0]].map(p=>[...new THREE.Vector3(...p).applyMatrix4(m).toArray()]);
  const baseline=corners(world),display=particleDisplayWorldMatrix(THREE,world);
  if(!display)throw Error('Collapsed display matrix');
  const candidate=corners(display),native=first.native;
  const ancestors=[];let ancestor=item.id;
  while(ancestor!==null){
    const instance=built[ancestor],n=effect.nodes[instance.node];
    ancestors.push({node:n.index,type:n.type,rotationInitial:n.staticVectors.transform.rotation.valueInitial,
      translationInitial:n.staticVectors.transform.translation.valueInitial,inheritance:n.authoringInheritance});
    ancestor=instance.parent;
  }
  // A diagnostic counterfactual: remove all ancestor local rotations from sampled
  // instance data. This tests an explanation; it is not a selected source rule.
  const neutralEffect=structuredClone(effect),neutralBuilt=structuredClone(built);
  for(const row of ancestors){
    const n=neutralEffect.nodes[row.node];
    for(const name of ['rotationValue','rotationSpeed'])if(n.vectorCurves[name]?.keys.length)throw Error('Counterfactual does not support active rotation curves');
    for(const i of neutralBuilt.filter(i=>i.node===row.node))for(const key of ['value','speed','acceleration'])i.sampled.transform.rotation[key]=[0,0,0];
  }
  const neutral=createTransformEvaluator(THREE,neutralEffect,neutralBuilt)(frame,!!plan.sourceInheritance,!!plan.sourceAppearance,!!plan.nullLocator,!!plan.nullLocator&&!!plan.nativeNullLocator)[item.id].matrix;
  const neutralWorld=new THREE.Matrix4().multiplyMatrices(root,neutral),neutralCenter=[...new THREE.Vector3().setFromMatrixPosition(neutralWorld).toArray()];
  const camera=first.state.camera;
  const projected=points=>bounds(points.map(p=>projectPoint(camera,p)));
  return {approved:false,effect:effectName,node:nodeIndex,effectFrame:frame,nativeAgeKnown:false,nativeSampleCount:samples.length,
    root:first.state.animationPosition,globalScale:first.state.animationScale,camera,
    baseline:bounds(baseline),display:bounds(candidate),native,
    nativeSamples:samples.map(s=>({seq:s.seq,sample:s.sample,cameraSeq:s.state.seq,bounds:s.native})),
    projectedBaseline:projected(baseline),projectedDisplay:projected(candidate),
    projectedNative:samples.map(s=>({sample:s.sample,bounds:projected(vertices.find(v=>v.sample===s.sample).positions)})),
    displayCenterResidual:bounds(candidate).center.map((v,i)=>v-native.center[i]),
    neutralRotationCounterfactual:{center:neutralCenter,residual:neutralCenter.map((v,i)=>v-native.center[i]),approvedRule:false},ancestors,
    limits:['CPU vertex output is projected analytically; active shader transforms and clipping state are not verified.',
      'Native ages were not captured; requested evaluator frame is a diagnostic, not a synchronized frame match.',
      'Neutralizing rotations is a counterfactual, not permission to change inheritance or enable compatibility flags.',
      'One source node under one camera cannot establish general locator or Particle variant semantics.']};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),value=flag=>args[args.indexOf(flag)+1],stage=path.resolve('tools/data')+path.sep;
  const inputs={};
  for(const flag of ['--plan','--trace','--particles','--output','--effect','--node','--effect-frame'])if(!args.includes(flag)||!value(flag))throw Error('Required: '+flag);
  for(const flag of ['--plan','--trace','--particles','--output'])if(!path.resolve(value(flag)).startsWith(stage))throw Error('Research paths must stay inside tools/data');
  for(const flag of ['--plan','--trace','--particles']){const bytes=fs.readFileSync(value(flag));inputs[flag]={file:value(flag),sha256:hash(bytes),data:JSON.parse(bytes)};}
  const THREE={};vm.runInNewContext(fs.readFileSync('tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js','utf8'),{exports:THREE,module:{exports:THREE},console});
  const node=Number(value('--node'));if(!Number.isInteger(node)||node<0)throw Error('Invalid source node');
  const result=analyzeLocator(THREE,inputs['--plan'].data,inputs['--trace'].data,inputs['--particles'].data,value('--effect'),node,Number(value('--effect-frame')));
  result.inputs=Object.fromEntries(Object.entries(inputs).map(([k,{file,sha256}])=>[k,{file,sha256}]));
  result.playerSha256=hash(fs.readFileSync('tools/original_effect_player.mjs'));result.auditToolSha256=hash(fs.readFileSync(fileURLToPath(import.meta.url)));
  fs.mkdirSync(path.dirname(value('--output')),{recursive:true});fs.writeFileSync(value('--output'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({native:result.native,displayCenterResidual:result.displayCenterResidual,counterfactual:result.neutralRotationCounterfactual,projectedNative:result.projectedNative[0]},null,2));
}
