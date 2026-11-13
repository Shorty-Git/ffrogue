import {memberSamplingSeed} from './previewRandomStreams.mjs';
import {FLAT_QUAD_RGB_PROFILE,COLOR_STREAM_POLICY,validateFlatQuadColor,sampleFlatQuadColor} from './sourceQuadColor.mjs';
// Shared prepared-scene playback. Experimental policies are not FFBE fidelity claims.
import {nativeSubmissionRanks,validateNativeSubmission} from './nativeDrawSubmission.mjs';
import {evaluateNativeSourceBranches,nativeBranchSlots} from './nativeSourceBranches.mjs';
import { nativeStartDelay, nativeScalarAlpha, GENERATION_PROFILE } from './nativeLifecycle.mjs';
export { NativeRandom, activateConstantGenerator, nativeActivationTrace, NativePhaseClock, NativeParticleEmitter, nativeScalarAlpha } from './nativeLifecycle.mjs';

export const POLICIES = [
  'Source-admitted constant generators use the native symmetric/exclusive delay window and enabled byte. Birth traversal, lifetime, parameter sampling and the integer-seeded LCG remain experimental; the separate four-word activation oracle does not establish whole-tree RNG ownership.',
  'Optional native Particle scalar alpha requires pinned source-selected InitCurve/UpdateCurve wrappers and unchanged key evidence. Only eligible local Particle curves use native tangents/clamping; vector, model/quad alpha and parent combination rules keep their existing paths.',
  'Host scene dimensions are explicit: legacy cropped study, actual game viewport, or rounded captured logical proportions. Host anchors and diagnostic foreground dock remain adaptations; foreground compositing never changes source effect geometry or recovers native UI/scissor state.',
  'Optional deterministic native Particle X display uses source-selected OneX/ConstX and replicates Joint X across axes. It requires matched constant Null ancestry and active inheritance/native locator switches; random scales, VelocityX timing and broader simulation remain unsupported.',
  'Optional source-dispatched ZScreen locator ignores local X/Y rotation, keeps sampled constant Z roll and applies positive constant inherited scales after facing. Identity view/unrotated Standard ancestors only; random distribution, source timing and other locator variants remain unverified.',
  'Optional native blending uses pinned FUNC_ADD and identical RGB/alpha factors from the native table. Scene composition preserves framebuffer alpha internally and presents opaque RGB; animation colorScale 1 is constructor-verified, while caller overrides remain unverified.',
  'Optional native Basic material uses exact initial shader identity and matched constant, non-random texture tint. Model selection covers only verified UV single-submesh BR3M. Missing authoring, random tint and other layouts retain labeled legacy comparison.',
  'Optional pinned-shader Add candidate preserves base alpha and adds secondary RGB times secondary alpha after vertex color. Native-selection plans require an exact initial Quad/Particle fragment match; other variants retain labeled legacy comparison. Runtime overrides and global colorScale remain unverified.',
  'Optional Null/Billboard locator neutralizes constant XY tilt only for the matched zero-roll, unit-scale, identity-view subset. Standard nodes keep TRS; unsupported variants retain labeled legacy comparison. No general camera/roll/compatibility support is claimed.',
  'Constant generation interpreted as duration/interval batches; endless/repeated generator modes not reconstructed.',
  'Curve Frame interpreted as normalized particle lifetime; standard Hermite interpolation is experimental.',
  'Optional authoring inheritance evaluates rate-zero alpha and birth-time parent translation. Nonzero alpha rates, rotation/scale exclusions, fields and expiration rules retain explicit legacy assumptions; source-less effects are unchanged.',
  'Seeded centered ranges and discrete Newton integration are preview policies.',
  'Legacy plans use Three.js additive/normal presets. Native-blend plans use recovered factors for RGB and alpha instead; other native depth/cull behavior remains outside this preview.',
  'Distortion is enabled only for plans carrying decoded experimental fields. Midpoint subtraction, color strength and UV order are shader hypotheses; native fidelity remains unverified.',
  'Optional model vertex RGBA multiplies interpolated source bytes into material RGBA. This is an explicit shader experiment; native combination/control semantics remain unverified.',
  'Quad and baseline Particle geometry use inherited unit XY planes. Optional Particle geometry evaluates only the declared zero-roll, constant-scale subset as view-aligned radius-one planes; unsupported nodes retain explicitly labeled legacy comparison geometry. Native locator, roll and other primitive variants remain unresolved.',
  'Optional source appearance selects Constant or Curve explicitly. Dormant keys stay inactive. Opt-in Flat Quad RGB uses source constants/ranges and independent alpha; its deterministic color seeds are host policy. Other RGB random ranges and parent tint remain unsupported.',
  'Optional Basic single-texture UV playback uses the same inverse texture TRS/pivot matrix as layered materials. Source values/modes are checked; the native matrix convention remains experimental. Unsupported mapping retains the labeled legacy path.',
  'Body approach/return is an explicit preview adaptation; damage is a source-tick marker, not game execution.',
  'Supplemented Add nodes sample two independent UV transforms and constant layer colors. Clamped RGBA addition and inverse pivot transforms are experimental shader policies.',
  'Native-selection Distortion candidates weight displacement and output alpha by the sampled secondary alpha. Source per-layer alpha controls remain unresolved. The quad texture-2 speed curve slot lacks a nonempty matching authoring example.',
  'Optional screen fitting is an explicit arena-composition adaptation for static screen-anchored effects, not a decoded original-game coordinate mapping.',
  'Supported distortion quads can evaluate constant source RGBA per corner. Animated/randomized corner colors remain unsupported by this experiment.',
  'Emission shapes are checked when matching authoring metadata is supplied. Known non-point shapes are withheld; unsupplemented source shapes remain unverified.',
];

export function shaderAddEligible(plan,node) {
  if(!plan.shaderAddReference)return false;
  if(!plan.nativeMaterialSelection)return true; // Explicit earlier family-only A/B experiment.
  const selection=node.nativeMaterialSelection;
  return selection?.supported===true&&selection.addCandidateCompatible===true
    &&selection.fragmentSha256===plan.shaderAddReference.sha256;
}
export function shaderDistortionEligible(plan,node) {
  const reference=plan.nativeMaterialSelection?.distortionReference,selection=node.nativeMaterialSelection;
  return !!reference&&selection?.supported===true&&selection.distortionCandidateCompatible===true
    &&selection.fragmentSha256===reference.sha256;
}
export function shaderBasicEligible(plan,node) {
  const reference=plan.nativeMaterialSelection?.basicReference,selection=node.nativeMaterialSelection;
  return !!plan.nativeBasicMaterial&&!!reference&&selection?.supported===true
    &&selection.basicCandidateCompatible===true&&selection.fragmentSha256===reference.sha256
    &&node.nativeBasicTint?.supported===true;
}

export function nativeBlendSelection(plan,node) {
  const reference=plan.nativeBlend,id=node.materialControls?.blend?.id;
  if(!reference)return null;
  if(reference.equation!==32774||reference.blendRows?.length!==7)throw Error('Invalid native blend reference');
  if(!Number.isInteger(id)||id<0||id>=7)return null;
  const row=reference.blendRows[id];
  if(!Array.isArray(row)||row.length!==3||row[0]!==Number(id!==0))throw Error('Invalid native blend row');
  return {id,row};
}
export function applyNativeBlend(THREE,material,selection,enabled=true) {
  if(material.userData.legacyBlend===undefined)material.userData.legacyBlend=material.blending;
  if(!enabled){material.blending=material.userData.legacyBlend;return;}
  const factors={0:THREE.ZeroFactor,1:THREE.OneFactor,769:THREE.OneMinusSrcColorFactor,
    770:THREE.SrcAlphaFactor,771:THREE.OneMinusSrcAlphaFactor,775:THREE.OneMinusDstColorFactor};
  const [blend,source,destination]=selection.row;
  if(!(source in factors)||!(destination in factors))throw Error('Unsupported native blend factor');
  material.premultipliedAlpha=false;
  material.blending=blend?THREE.CustomBlending:THREE.NoBlending;
  material.blendEquation=material.blendEquationAlpha=THREE.AddEquation;
  material.blendSrc=factors[source];material.blendDst=factors[destination];
  const alpha=factor=>factor===769?THREE.OneMinusSrcAlphaFactor:factor===775?THREE.OneMinusDstAlphaFactor:factors[factor];
  material.blendSrcAlpha=alpha(source);material.blendDstAlpha=alpha(destination);
}

export function attachNativeBasicMaterial(THREE,material,rgba) {
  if(!Array.isArray(rgba)||rgba.length!==4||!rgba.every(Number.isFinite))throw Error('Invalid native Basic tint');
  const enabled={value:true},tint={value:new THREE.Vector4(...rgba)};
  material.userData.nativeBasic={enabled,tint};
  material.onBeforeCompile=shader=>{
    shader.uniforms.useNativeBasic=enabled;shader.uniforms.nativeBasicTint=tint;
    shader.fragmentShader='uniform bool useNativeBasic;\nuniform vec4 nativeBasicTint;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nif(useNativeBasic)diffuseColor*=nativeBasicTint;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nif(useNativeBasic)diffuseColor=clamp(diffuseColor,0.0,1.0);');
  };
  material.customProgramCacheKey=()=> 'original-native-basic-v1';
  material.needsUpdate=true;
}
export function particleGeometryEligibility(effect,node,member) {
  const reasons=[];
  if(node.typeId!==3)return {supported:false,reasons:['not a Particle primitive']};
  if(!node.resourceBindings.texture1||node.resourceBindings.model)reasons.push('textured Particle required');
  if(node.authoringEmissionShape!=='Point')reasons.push('verified Point emission required');
  if(!['Basic','Add'].includes(node.materialControls?.textureCombination?.name))reasons.push('unsupported material combination');
  if(member.rotation.some(value=>value!==0)||!(member.scalePercent>0))reasons.push('zero member rotation and positive member scale required');
  let current=node;
  const seen=new Set();
  while(current) {
    if(seen.has(current.index)){reasons.push('invalid ancestor cycle');break;}
    seen.add(current.index);
    const controls=current.particleGeometrySource,transform=current.staticVectors?.transform;
    if(!controls||controls.rotationMode!=='NewtonDynamics'||controls.scaleMode!=='NewtonDynamics'||!transform) {
      reasons.push('verified Newton rotation/scale controls required on node '+current.index);break;
    }
    const rotation=Object.values(transform.rotation);
    if(rotation.some(values=>values.some((value,axis)=>(current===node||axis===2)&&value!==0)))
      reasons.push('local rotation or ancestor Z roll on node '+current.index);
    const scale=transform.scale;
    if(scale.valueInitial.some(value=>!(value>0))||Object.entries(scale).some(([key,values])=>key!=='valueInitial'&&values.some(value=>value!==0)))
      reasons.push('positive constant scale required on node '+current.index);
    if(current!==node&&scale.valueInitial.some(value=>value!==scale.valueInitial[0]))
      reasons.push('uniform ancestor scale required on node '+current.index);
    if((current.vectorCurves?.rotationValue?.keys.length??0)||(current.vectorCurves?.rotationSpeed?.keys.length??0)||(current.vectorCurves?.scaleValue?.keys.length??0)||(current.vectorCurves?.scaleSpeed?.keys.length??0))
      reasons.push('animated ancestor geometry channel on node '+current.index);
    if(current.parentIndex!==null) {
      const inherit=current.authoringInheritance;
      if(!inherit||inherit.matrix!=='On'||inherit.rotation!=='On'||inherit.scale!=='On')reasons.push('unverified transform inheritance on node '+current.index);
      current=effect.nodes[current.parentIndex];
      if(!current)reasons.push('missing ancestor');
    } else current=null;
  }
  return {supported:reasons.length===0,reasons:[...new Set(reasons)]};
}

export function nativeParticleXEligibility(effect,node,member) {
  const reasons=[],ref=node.nativeParticleX,transform=node.staticVectors?.transform;
  const identity=ref?.nativeSha256==='6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77';
  const one=ref?.scale?.index===15&&ref.scale.target?.sha256==='549644baf3d7082741d320b6184e226f1b37d009bd46cac9321fc2b90971dfbe';
  const constant=ref?.scale?.index===16&&ref.scale.target?.sha256==='1ded555d2f7d221b0a0e972c054489cd29e3d0b7a3339ea55d4de6832b493624';
  if(!identity||!ref?.scale?.resolved||(!one&&!constant))reasons.push('verified OneX/ConstX consumer required; dynamic X timing remains unsupported');
  if(!ref?.scaleInit?.resolved||(one?ref.scaleInit.target!==null:ref?.scaleInit?.target?.address!=='0x2001fe8'))reasons.push('unverified X initialization');
  if(!ref?.parentCoord?.resolved||ref.parentCoord.index!==0||ref.parentCoord.target!==null)reasons.push('absent parent-coordinate callback required');
  if(!ref?.rotation?.resolved||!(ref.rotation.target===null||ref.rotation.target?.sha256==='484853a98927c994a0fadf78af6c079f25145bf26ba41b692cba26c9949339cb'))reasons.push('unsupported rotation consumer');
  if(node.typeId!==3||!node.resourceBindings.texture1||node.resourceBindings.texture2||node.resourceBindings.model||node.authoringEmissionShape!=='Point')reasons.push('verified single-texture Point Particle required');
  if(!node.nativeMaterialSelection?.supported||node.nativeMaterialSelection.operation!==0)reasons.push('verified single-texture material required');
  if(member.rotation.some(v=>v!==0)||!(member.scalePercent>0))reasons.push('unrotated positive-scale wrapper required');
  if(!transform)reasons.push('source transform unavailable');
  else {
    if(constant&&(Object.entries(transform.scale).some(([key,v])=>key!=='valueInitial'&&v[0]!==0)||!(transform.scale.valueInitial[0]>0)))reasons.push('positive nonrandom constant X required');
    if(Object.entries(transform.rotation).some(([key,v])=>key!=='valueInitial'&&v.some(x=>x!==0)))reasons.push('nonrandom constant rotation required');
    if(ref?.rotation?.target===null&&transform.rotation.valueInitial.some(v=>v!==0))reasons.push('absent rotation must have zero authored rotation');
  }
  let current=node;const seen=new Set();
  while(current){
    if(seen.has(current.index)){reasons.push('ancestor cycle');break;}seen.add(current.index);
    for(const key of ['scaleValue','scaleSpeed','rotationValue','rotationSpeed'])if(current.vectorCurves?.[key]?.keys.length)reasons.push('geometry curves outside subset');
    if(current.parentIndex!==null){
      const inherit=current.authoringInheritance;
      if(!inherit||inherit.matrix!=='On'||inherit.rotation!=='On'||inherit.scale!=='On'||inherit.translation!=='On')reasons.push('full live transform inheritance required');
    }
    if(current!==node){
      const t=current.staticVectors?.transform,source=current.nullLocatorSource;
      if(current.typeId!==0||!t||!source){reasons.push('matched Null ancestors required');break;}
      if(source.type==='Billboard'){
        if(!zScreenLocatorEligibility(effect,current).supported)reasons.push('unsupported ancestor ZScreen locator');
      }else if(source.type!=='Standard'||Object.values(t.rotation).some(v=>v.some(x=>x!==0)))reasons.push('unrotated Standard ancestor required');
      if(t.scale.valueInitial.some(v=>!(v>0))||Object.entries(t.scale).some(([key,v])=>key!=='valueInitial'&&v.some(x=>x!==0)))reasons.push('positive constant ancestor scale required');
    }
    current=current.parentIndex===null?null:effect.nodes[current.parentIndex];
    if(current===undefined)reasons.push('missing ancestor');
  }
  return {supported:reasons.length===0,reasons:[...new Set(reasons)],mode:one?'OneX':constant?'ConstX':null};
}

export function nativeParticleXDisplayMatrix(THREE,center,scalar,groupX,roll=0){
  if(center.length!==3||!center.every(Number.isFinite)||![scalar,groupX,roll].every(Number.isFinite)||scalar<0||groupX<=0)throw Error('Invalid native X display inputs');
  if(scalar===0)return null;
  return new THREE.Matrix4().compose(new THREE.Vector3(...center),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),roll),new THREE.Vector3(2*scalar*groupX,2*scalar*groupX,1));
}

export function nullLocatorEligibility(effect,node) {
  const reasons=[];
  if(node.typeId!==0||node.nullLocatorSource?.type!=='Billboard')return {supported:false,reasons:['matched Null/Billboard selector required']};
  const compatibility=node.authoringInheritance?.compatibility;
  if(!compatibility?.nodeV16||compatibility.nodeV15||compatibility.rootV16||compatibility.rootV15)
    reasons.push('unverified compatibility combination');
  let current=node;const seen=new Set();
  while(current){
    if(seen.has(current.index)){reasons.push('ancestor cycle');break;}seen.add(current.index);
    const source=current.nullLocatorSource,transform=current.staticVectors?.transform;
    if(current.typeId!==0||!source||source.rotationMode!=='NewtonDynamics'||source.scaleMode!=='NewtonDynamics'||!transform){
      reasons.push('matched Newton Null ancestor controls required');break;
    }
    if(current!==node&&source.type!=='Standard')reasons.push('non-Standard ancestor locator');
    const rotation=transform.rotation,scale=transform.scale;
    if(Object.entries(rotation).some(([key,values])=>values.some((v,axis)=>!Number.isFinite(v)||
      ((current!==node||key!=='valueInitial'||axis===2)&&v!==0))))reasons.push('constant zero-roll rotation subset required');
    if(scale.valueInitial.some(v=>v!==1)||Object.entries(scale).some(([key,values])=>key!=='valueInitial'&&values.some(v=>v!==0)))
      reasons.push('unit constant local/ancestor scale required');
    for(const name of ['rotationValue','rotationSpeed','scaleValue','scaleSpeed'])if(current.vectorCurves?.[name]?.keys.length)
      reasons.push('populated geometry curves outside subset');
    if(current.parentIndex!==null){
      const inherit=current.authoringInheritance;
      if(!inherit||inherit.matrix!=='On'||inherit.rotation!=='On'||inherit.scale!=='On'||inherit.translation!=='On')reasons.push('unverified transform inheritance');
      current=effect.nodes[current.parentIndex];if(!current)reasons.push('missing ancestor');
    }else current=null;
  }
  return {supported:!reasons.length,reasons:[...new Set(reasons)]};
}

export function zScreenLocatorEligibility(effect,node) {
  const reference=node.nativeNullLocator,reasons=[];
  if(node.typeId!==0||node.nullLocatorSource?.type!=='Billboard'||reference?.typeId!==0
      ||reference.nativeSha256!=='6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77'
      ||reference.moduleAddress!=='0x1fc04b0'||reference.functionSha256!=='8788174e86964bd11e97f55521d4606fe86af3798cd8f5ac9e920b5802f8f20d')
    return {supported:false,reasons:['matched source-dispatched ZScreen locator required']};
  const flags=node.authoringInheritance?.compatibility;
  if(!flags?.nodeV16||flags.nodeV15||flags.rootV16||flags.rootV15)reasons.push('unverified compatibility combination');
  const seen=new Set();let current=node;
  while(current){
    if(seen.has(current.index)){reasons.push('ancestor cycle');break;}seen.add(current.index);
    const source=current.nullLocatorSource,transform=current.staticVectors?.transform;
    if(current.typeId!==0||!source||source.rotationMode!=='NewtonDynamics'||source.scaleMode!=='NewtonDynamics'||!transform){
      reasons.push('matched Newton Null ancestor controls required');break;
    }
    if(current!==node&&source.type!=='Standard')reasons.push('non-Standard ancestor locator');
    for(const [key,values] of Object.entries(transform.rotation))
      if(values.some(v=>!Number.isFinite(v)||(current!==node||!['valueInitial','valueRange'].includes(key))&&v!==0))
        reasons.push('sampled constant local rotation and unrotated ancestors required');
    for(const [key,values] of Object.entries(transform.scale))
      if(values.some(v=>!Number.isFinite(v)||(key==='valueInitial'?v<=0:v!==0)))reasons.push('positive constant scale required');
    for(const key of ['rotationValue','rotationSpeed','scaleValue','scaleSpeed'])
      if(current.vectorCurves?.[key]?.keys.length)reasons.push('geometry curves outside subset');
    if(current.parentIndex!==null){
      const inherit=current.authoringInheritance;
      if(!inherit||inherit.matrix!=='On'||inherit.translation!=='On'||inherit.rotation!=='On'||inherit.scale!=='On')
        reasons.push('unverified transform inheritance');
      current=effect.nodes[current.parentIndex];if(!current)reasons.push('missing ancestor');
    }else current=null;
  }
  return {supported:!reasons.length,reasons:[...new Set(reasons)]};
}

export function zScreenLocatorMatrix(THREE,position,localScale,inheritedScale,rollRadians) {
  if(![position,localScale,inheritedScale].every(v=>Array.isArray(v)&&v.length===3)
      ||![...position,...localScale,...inheritedScale,rollRadians].every(Number.isFinite)
      ||[...localScale,...inheritedScale].some(v=>v<=0))throw Error('Unsupported ZScreen matrix inputs');
  const rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),rollRadians);
  return new THREE.Matrix4().compose(new THREE.Vector3(...position),rotation,
    new THREE.Vector3(...localScale.map((v,i)=>v*inheritedScale[i])));
}

export function particleDisplayWorldMatrix(THREE,world,right=[1,0,0],up=[0,1,0]) {
  if(!world.elements.every(Number.isFinite))throw Error('Nonfinite Particle transform');
  if([right,up].some(axis=>axis.length!==3||axis.some(value=>!Number.isFinite(value))))throw Error('Invalid Particle view basis');
  const r=new THREE.Vector3(...right),u=new THREE.Vector3(...up);
  if(Math.abs(r.length()-1)>1e-6||Math.abs(u.length()-1)>1e-6||Math.abs(r.dot(u))>1e-6)throw Error('Particle view basis must be orthonormal');
  const sx=new THREE.Vector3().setFromMatrixColumn(world,0).length(),sy=new THREE.Vector3().setFromMatrixColumn(world,1).length();
  if(sx===0||sy===0||Math.abs(world.determinant())<1e-12)return null;
  if(world.determinant()<0)throw Error('Mirrored Particle transforms are unsupported');
  const normal=new THREE.Vector3().crossVectors(r,u),result=new THREE.Matrix4().makeBasis(r.multiplyScalar(sx*2),u.multiplyScalar(sy*2),normal);
  result.setPosition(new THREE.Vector3().setFromMatrixPosition(world));
  return result;
}
/**
 * Approximate native Particle geometry for nodes outside the verified subsets: a view-aligned quad of
 * radius one at the hierarchy position. Half-width and half-height are the lengths of the world X and Y
 * axes of the node's evaluated matrix (the Square flag already makes the local scale uniform; inherited
 * scale stays component-wise). The roll is the in-plane direction of the world X axis, so tilts about X
 * or Y do not tilt the quad.
 * Not used: the native X consumers' rule "group X for both axes" (native-particle-x-scale.md). Applied to
 * the accumulated ancestor scale it turns the streak particles of eff_3029_weak_* (scale 25 under a
 * 10 x 1 Null) into 1,300 px discs; what the engine passes as the group vector is not verified.
 */
export function approximateParticleDisplay(THREE,world) {
  if(!world.elements.every(Number.isFinite))throw Error('Nonfinite Particle transform');
  const x=new THREE.Vector3().setFromMatrixColumn(world,0),sx=x.length(),sy=new THREE.Vector3().setFromMatrixColumn(world,1).length();
  if(!(sx>0)||!(sy>0))return null;
  // An X axis pointing at the viewer has no in-plane direction; the quad then stays unrolled.
  const roll=Math.hypot(x.x,x.y)>1e-9*sx?Math.atan2(x.y,x.x):0;
  return new THREE.Matrix4().compose(new THREE.Vector3().setFromMatrixPosition(world),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),roll),new THREE.Vector3(2*sx,2*sy,1));
}
/** View-aligned frame for Billboard Quads and Models: world axis lengths as scale, in-plane direction of the world X axis as roll. */
export function approximateBillboardDisplay(THREE,world) {
  if(!world.elements.every(Number.isFinite))throw Error('Nonfinite billboard transform');
  const x=new THREE.Vector3().setFromMatrixColumn(world,0),sx=x.length(),sy=new THREE.Vector3().setFromMatrixColumn(world,1).length();
  const sz=new THREE.Vector3().setFromMatrixColumn(world,2).length();
  if(!(sx>0)||!(sy>0))return null;
  const roll=Math.hypot(x.x,x.y)>1e-9*sx?Math.atan2(x.y,x.x):0;
  return new THREE.Matrix4().compose(new THREE.Vector3().setFromMatrixPosition(world),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),roll),new THREE.Vector3(sx,sy,sz>0?sz:1));
}
export function quadCornerColors(source) {
  if(source.mode!=='Constant')throw Error('Unsupported quad color mode');
  const names=['leftTop','rightTop','leftBottom','rightBottom'];
  if(names.some(n=>source.corners[n].range.some(v=>v!==0)))throw Error('Random quad colors are unsupported');
  return names.map(n=>[...source.corners[source.flat?'leftTop':n].value]);
}
export function isUntexturedParticle(node) {
  return node.typeId===3&&!node.resourceBindings.texture1&&!node.resourceBindings.texture2;
}

// Reviewed game presentation, independent of original damage/chaining metadata.
export function presentationPose(frame, home, target, bodyFrames, presentation) {
  const {movement,approachFrames,returnFrames,targetOffsetX}=presentation;
  if(!['dash','stationary'].includes(movement))throw Error('Unsupported presentation movement');
  if(!(bodyFrames>0&&returnFrames>0&&approachFrames>=0))throw Error('Invalid presentation duration');
  if(movement==='dash'&&approachFrames===0)throw Error('Dash requires approach frames');
  const start=movement==='stationary'?0:approachFrames,skillFrame=frame-start;
  const attack=movement==='stationary'?home:{x:target.x+targetOffsetX,y:target.y};
  const interpolate=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
  if(frame<start)return {actor:interpolate(home,attack,Math.max(0,frame/start)),motion:'move',motionTime:frame,skillFrame};
  if(skillFrame<bodyFrames)return {actor:{...attack},motion:'body',motionTime:skillFrame,skillFrame};
  if(movement==='dash'&&skillFrame<bodyFrames+returnFrames)return {actor:interpolate(attack,home,(skillFrame-bodyFrames)/returnFrames),motion:'move',motionTime:skillFrame-bodyFrames,skillFrame};
  return {actor:{...home},motion:'idle',motionTime:frame,skillFrame};
}

export function presentationMembers(members, targetKeys, scope) {
  if(!['single_enemy','all_enemies'].includes(scope)||!targetKeys.length)throw Error('Unsupported presentation scope');
  return members.flatMap(member=>scope==='all_enemies'&&member.anchor==='target'
    ?targetKeys.map(targetKey=>({...member,targetKey})): [{...member}]);
}

export function sourceRectanglePoint(placement, rectangle, scatter = [0, 0]) {
  const {x,y,width,height}=rectangle;
  if(![x,y,width,height,...placement.offset,...scatter].every(Number.isFinite)||width<0||height<0
    ||placement.axisModes.length!==2||placement.offset.length!==2||scatter.length!==2
    ||placement.axisModes.some(mode=>!Number.isInteger(mode)||mode<1||mode>6))throw Error('Unsupported source rectangle placement');
  const values=placement.axisModes.map((mode,i)=>[x,y][i]+[width,height][i]*((mode-1)%3)/2
    +placement.offset[i]+(mode<=3?scatter[i]:0));
  return {x:values[0],y:values[1]};
}

export function rendererGeometryScale(reference) {
  if(reference===undefined)return 1;
  const {globalScale,screenWidth,screenHeight}=reference;
  if(![globalScale,screenWidth,screenHeight].every(v=>Number.isFinite(v)&&v>0)
    ||reference.formulaMatches!==true||Math.abs(globalScale-1136/Math.min(screenWidth,screenHeight))>0.00001)
    throw Error('Invalid native renderer geometry scale');
  return globalScale;
}

// Shared host-coordinate contract. Source placement, geometry and raster state
// are independent inputs; no scene dimensions are inferred from a skill name.
export function validateEffectHostContext(context) {
  if(context?.schemaVersion!==1||context.coordinateSystem!=='ffbe-screen-api')throw Error('Unsupported effect host context');
  const {engineScreen:engine,camera,framebuffer:surface}=context,p=camera?.projectionMatrix,v=camera?.viewMatrix;
  if(!engine||![engine.width,engine.height,engine.geometryScale].every(n=>Number.isFinite(n)&&n>0))throw Error('Invalid engine screen context');
  if(!Array.isArray(p)||p.length!==16||!p.every(Number.isFinite)||!Array.isArray(v)||v.length!==16
    ||!v.every((n,i)=>n===(i%5===0?1:0))||p[0]<=0||p[5]<=0||p[10]>=0||p[15]!==1
    ||[1,2,3,4,6,7,8,9,11].some(i=>p[i]!==0))throw Error('Unsupported host camera; identity view and axis-aligned orthographic projection required');
  const rect=(r,empty)=>Array.isArray(r)&&r.length===4&&r.every(Number.isInteger)&&r[2]>=(empty?0:1)&&r[3]>=(empty?0:1);
  if(!surface||![surface.width,surface.height].every(n=>Number.isInteger(n)&&n>0)
    ||!rect(surface.viewport,false)||typeof surface.scissorEnabled!=='boolean'||!rect(surface.scissorBox,true))throw Error('Invalid host framebuffer context');
  return context;
}

export function effectHostPlacement(context,placement,rectangle,scatter) {
  validateEffectHostContext(context);
  if(!Array.isArray(placement?.axisModes))throw Error('Explicit source placement required');
  if(placement.axisModes.some(mode=>mode<=3)&&(!Array.isArray(scatter)||scatter.length!==2||!scatter.every(Number.isFinite)))
    throw Error('Explicit host scatter required; native random scheduling is not inferred');
  const api=sourceRectanglePoint(placement,rectangle,scatter??[0,0]);
  return {api,world:{x:api.x,y:context.engineScreen.height-api.y,z:0},geometryScale:context.engineScreen.geometryScale};
}

export function effectHostMemberAnchor(context,member,bindings){
  validateEffectHostContext(context);
  if(bindings?.schemaVersion!==1||bindings.memberScaleAxes!=='xy'||!member.placement)throw Error('Explicit supported effect host bindings required');
  const rectangle=bindings.rectangles?.[member.placement.rectangle];
  if(!rectangle)throw Error('Missing host rectangle binding: '+member.placement.rectangle);
  if(!(Number.isFinite(member.scalePercent)&&member.scalePercent>0))throw Error('Positive member scale required');
  const {world,geometryScale}=effectHostPlacement(context,member.placement,rectangle,bindings.scatter);
  const scale=member.scalePercent/100*geometryScale;
  return {...world,rootScale:[scale,scale,geometryScale]};
}

export function effectHostRaster(context) {
  validateEffectHostContext(context);
  const s=context.framebuffer,rectangles=[[0,0,s.width,s.height],s.viewport,...(s.scissorEnabled?[s.scissorBox]:[])];
  const x=Math.max(...rectangles.map(r=>r[0])),y=Math.max(...rectangles.map(r=>r[1]));
  const right=Math.min(...rectangles.map(r=>r[0]+r[2])),top=Math.min(...rectangles.map(r=>r[1]+r[3]));
  const width=Math.max(0,right-x),height=Math.max(0,top-y);
  return {viewport:[...s.viewport],scissorEnabled:s.scissorEnabled,scissorBox:[...s.scissorBox],
    clipGL:{x,y,width,height},clipCanvas:{x,y:s.height-y-height,width,height}};
}

export function effectHostProject(context,point) {
  validateEffectHostContext(context);
  if(!point||![point.x,point.y,point.z].every(Number.isFinite))throw Error('Finite host world point required');
  const p=context.camera.projectionMatrix,s=context.framebuffer,[vx,vy,vw,vh]=s.viewport;
  const ndc={x:p[0]*point.x+p[12],y:p[5]*point.y+p[13],z:p[10]*point.z+p[14]};
  const gl={x:vx+(ndc.x+1)*vw/2,y:vy+(ndc.y+1)*vh/2};
  const inside=r=>gl.x>=r[0]&&gl.y>=r[1]&&gl.x<r[0]+r[2]&&gl.y<r[1]+r[3];
  return {ndc,gl,canvas:{x:gl.x,y:s.height-gl.y},
    insideViewport:inside(s.viewport),insideScissor:!s.scissorEnabled||inside(s.scissorBox),insideFramebuffer:inside([0,0,s.width,s.height]),insideDepthClip:ndc.z>=-1&&ndc.z<=1};
}

export function previewHostView(mode,gameView={width:1000,height:1100},nativeAudit=null) {
  if(!['legacy','game','native-proportions'].includes(mode))throw Error('Unknown host view');
  let width=mode==='legacy'?1000:gameView.width,height=mode==='legacy'?800:gameView.height;
  let origin=mode==='legacy'?'Earlier cropped research view':'Game BATTLE_VIEW; adapted host layout';
  if(mode==='native-proportions'){
    const c=nativeAudit?.camera,p=c?.projectionMatrix,v=c?.viewMatrix;
    if(nativeAudit?.nativeSha256!=='6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77'||p?.length!==16||v?.length!==16||!p.every(Number.isFinite)||!v.every((x,i)=>x===(i%5===0?1:0))||p[0]<=0||p[5]<=0||p[15]!==1||Math.abs(p[12]+1)>1e-6||Math.abs(p[13]+1)>1e-6||[1,2,3,4,6,7,8,9,11,14].some(i=>p[i]!==0))throw Error('Unsupported native host projection');
    width=Math.round(2/p[0]);height=Math.round(2/p[5]);
    origin='Rounded captured logical proportions; adapted anchors and game dock, not original scene replay';
  }
  if(![width,height].every(x=>Number.isInteger(x)&&x>0&&x<=4096))throw Error('Invalid host dimensions');
  return {mode,width,height,origin,foregroundAvailable:mode!=='legacy',worldUnitsPerPixel:1,
    camera:{left:-width/2,right:width/2,top:height/2,bottom:-height/2}};
}

export function hostForegroundRegions(view,layout){
  if(!view.foregroundAvailable)return [];
  if(!(layout.arena.y>=0&&layout.partyTop>layout.arena.y&&layout.partyTop<view.height))throw Error('Invalid host foreground layout');
  return [{role:'header',x:0,y:0,width:view.width,height:layout.arena.y},
    {role:'dock',x:0,y:layout.partyTop,width:view.width,height:view.height-layout.partyTop}];
}

export function presentationAnchor(member, actor, enemies, selected, bridge,view={width:1000,height:800}) {
  const centerX=view.width/2,centerY=view.height/2;
  if(![centerX,centerY].every(v=>Number.isFinite(v)&&v>0))throw Error('Invalid presentation view');
  if(member.placement) {
    if(!bridge)throw Error('Source rectangle placement requires an explicit preview bridge');
    const {arena,unit,unitScale,unitsPerPixel,scatter}=bridge;
    if(!(unitsPerPixel>0&&Number.isFinite(unitsPerPixel)))throw Error('Invalid preview coordinate scale');
    let rect;
    if(member.placement.rectangle==='target-side')rect={x:arena.x,y:arena.y,width:arena.width/2,height:arena.height};
    else if(member.placement.rectangle==='screen'){
      rect={...(bridge.screen??arena)};
      if(![rect.x,rect.y,rect.width,rect.height].every(Number.isFinite)||rect.width<=0||rect.height<=0)throw Error('Invalid host screen rectangle');
    }
    else if(member.placement.rectangle==='target-unit') {
      const point=enemies[member.targetKey??selected];
      if(!point||!unit||!(unitScale>0))throw Error('Missing preview unit rectangle');
      rect={x:point.x-unit.pivotX*unit.frameWidth*unitScale,y:point.y-unit.pivotY*unit.frameHeight*unitScale,
        width:unit.frameWidth*unitScale,height:unit.frameHeight*unitScale};
    } else throw Error('Unsupported preview rectangle source');
    const native={x:(rect.x-arena.x)*unitsPerPixel,
      y:(arena.y+arena.height-rect.y-rect.height)*unitsPerPixel,
      width:rect.width*unitsPerPixel,height:rect.height*unitsPerPixel};
    const point=sourceRectanglePoint(member.placement,native,scatter);
    return {x:arena.x+point.x/unitsPerPixel-centerX,
      y:centerY-(arena.y+arena.height-point.y/unitsPerPixel),unitsToPixels:1/unitsPerPixel};
  }
  if(member.anchor==='screen')return {x:0,y:0};
  let point;
  if(member.anchor==='caster')point=actor;
  else if(member.anchor==='target-group') {
    const points=Object.values(enemies);
    if(!points.length)throw Error('Empty target group');
    point={x:points.reduce((s,p)=>s+p.x,0)/points.length,y:points.reduce((s,p)=>s+p.y,0)/points.length};
  } else if(member.anchor==='target')point=enemies[member.targetKey??selected];
  else throw Error('Unsupported presentation anchor: '+member.anchor);
  if(!point)throw Error('Unknown presentation target');
  return {x:point.x-centerX,y:centerY-point.y+50};
}

export function attachConstantQuadColors(THREE,geometry,material,source) {
  if(geometry.attributes.position.count!==4)throw Error('Quad colors require four vertices');
  geometry.setAttribute('sourceCornerColor',new THREE.Float32BufferAttribute(quadCornerColors(source).flat(),4));
  const enabled={value:true},previous=material.onBeforeCompile.bind(material);
  material.userData.quadColorsEnabled=enabled;
  material.defines={...material.defines,ORIGINAL_QUAD_COLORS:1};
  material.onBeforeCompile=shader=>{
    previous(shader);shader.uniforms.useQuadColors=enabled;
    shader.vertexShader='attribute vec4 sourceCornerColor;\nvarying vec4 sourceCornerRgba;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>','#include <color_vertex>\nsourceCornerRgba=sourceCornerColor;');
    shader.fragmentShader='varying vec4 sourceCornerRgba;\nuniform bool useQuadColors;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor*=useQuadColors?sourceCornerRgba:vec4(1.0);');
  };
  material.needsUpdate=true;
}
export function attachModelVertexRgba(THREE, geometry, material, vertices) {
  if (geometry.attributes.position.count !== vertices.length || !vertices.length)
    throw Error('Model color/position vertex counts differ');
  const bytes=vertices.flatMap(vertex=>{
    if(!Array.isArray(vertex.colorBytes)||vertex.colorBytes.length!==4
        ||vertex.colorBytes.some(value=>!Number.isInteger(value)||value<0||value>255))
      throw Error('Invalid source model RGBA bytes');
    return vertex.colorBytes;
  });
  geometry.setAttribute('sourceModelColor',new THREE.Uint8BufferAttribute(bytes,4,true));
  const enabled={value:true},previous=material.onBeforeCompile.bind(material);
  material.userData.modelVertexRgbaEnabled=enabled;
  material.defines={...material.defines,ORIGINAL_MODEL_VERTEX_RGBA:1};
  material.onBeforeCompile=shader=>{
    previous(shader);
    if(!shader.vertexShader.includes('#include <color_vertex>')||!shader.fragmentShader.includes('#include <color_fragment>'))
      throw Error('Model RGBA shader insertion points unavailable');
    shader.uniforms.useModelVertexRgba=enabled;
    shader.vertexShader='attribute vec4 sourceModelColor;\nvarying vec4 sourceModelRgba;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>','#include <color_vertex>\nsourceModelRgba=sourceModelColor;');
    shader.fragmentShader='varying vec4 sourceModelRgba;\nuniform bool useModelVertexRgba;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor*=useModelVertexRgba?sourceModelRgba:vec4(1.0);');
  };
  material.needsUpdate=true;
}
export function coverScreenBounds(bounds, rectangle) {
  if (!(bounds.width>0&&bounds.height>0&&rectangle.width>0&&rectangle.height>0)) throw Error('Invalid screen effect bounds');
  const scale=Math.max(rectangle.width/bounds.width,rectangle.height/bounds.height);
  return {scale,x:rectangle.x+rectangle.width/2-bounds.centerX*scale,
    y:rectangle.y+rectangle.height/2-bounds.centerY*scale};
}
export function displacementUv(uv, rg, midpoint, strength) {
  return uv.map((v,i)=>v+(rg[i]-midpoint[i]/255)*strength[i]);
}
// Column-major inverse 2D texture TRS; used identically by the shader and tests.
export function textureMatrix(scale, translation, degrees, pivot) {
  if (Math.abs(scale[0]) < 1e-8 || Math.abs(scale[1]) < 1e-8) throw Error('Singular texture scale');
  if (degrees[0] || degrees[1]) throw Error('Only Z texture rotation is supported');
  const angle=-degrees[2]*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  const a=c/scale[0],b=s/scale[1],d=-s/scale[0],e=c/scale[1];
  const x=translation[0]+pivot[0],y=translation[1]+pivot[1];
  return [a,b,0,d,e,0,pivot[0]-a*x-d*y,pivot[1]-b*x-e*y,1];
}

export function layeredMaterial(THREE, material, secondMap, colors, distortion=null, shaderAdd=false, shaderDistortion=false,directSecondUv=false) {
  material.defines={...material.defines,ORIGINAL_TEXTURE_COMBINATION:distortion?6:2};
  if(directSecondUv)material.defines.SOURCE_PACKET_SECOND_UV=1;
  const uniforms={secondMap:{value:secondMap},layer1Uv:{value:new THREE.Matrix3()},layer2Uv:{value:new THREE.Matrix3()},
    layer1Tint:{value:new THREE.Vector4(...colors[0])},layer2Tint:{value:new THREE.Vector4(...colors[1])},useSecondLayer:{value:true},
    distortionMidpoint:{value:new THREE.Vector2(...(distortion?.midpoint.slice(0,2).map(v=>v/255)??[0,0]))},
    useShaderAdd:{value:!!shaderAdd&&!distortion},useShaderDistortion:{value:!!shaderDistortion&&!!distortion}};
  material.userData.layers=uniforms;
  material.userData.shaderAddSupported=!distortion;
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    if(directSecondUv){
      shader.vertexShader='attribute vec2 sourceSecondUv;\nvarying vec2 sourceUv2;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nsourceUv2=sourceSecondUv;');
      shader.fragmentShader='varying vec2 sourceUv2;\n'+shader.fragmentShader;
    }
    shader.vertexShader='varying vec2 sourceUv;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nsourceUv=uv;');
    shader.fragmentShader='varying vec2 sourceUv;\nuniform sampler2D secondMap;\nuniform mat3 layer1Uv,layer2Uv;\nuniform vec4 layer1Tint,layer2Tint;\nuniform bool useSecondLayer,useShaderAdd,useShaderDistortion;\nuniform vec2 distortionMidpoint;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',distortion?`
      vec2 maskUv=(layer2Uv*vec3(sourceUv,1.0)).xy;
      vec4 displacementSample=texture2D(secondMap,maskUv);
      vec2 displacement=(displacementSample.rg-distortionMidpoint)*layer2Tint.rg;
      float displacementAlpha=displacementSample.a*layer2Tint.a;
      if(useShaderDistortion)displacement*=displacementAlpha;
      vec2 firstUv=(layer1Uv*vec3(sourceUv,1.0)).xy;
      diffuseColor*=texture2D(map,firstUv+displacement)*layer1Tint;
      if(useShaderDistortion)diffuseColor.a*=displacementAlpha;
    `:`
      vec4 firstLayer=texture2D(map,(layer1Uv*vec3(sourceUv,1.0)).xy)*layer1Tint;
      vec4 secondLayer=texture2D(secondMap,(layer2Uv*vec3(sourceUv,1.0)).xy)*layer2Tint;
      if(useShaderAdd)diffuseColor*=firstLayer;
      else diffuseColor*=useSecondLayer?clamp(firstLayer+secondLayer,0.0,1.0):firstLayer;
    `);
    if(directSecondUv)shader.fragmentShader=shader.fragmentShader.replaceAll('(layer2Uv*vec3(sourceUv,1.0)).xy','sourceUv2');
    if(distortion)shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nif(useShaderDistortion)diffuseColor=clamp(diffuseColor,0.0,1.0);');
    else shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      if(useShaderAdd){
        if(useSecondLayer)diffuseColor.rgb+=secondLayer.rgb*secondLayer.a;
        diffuseColor=clamp(diffuseColor,0.0,1.0);
      }
    `);
  };
  // Different fragment programs must not share THREE's callback-based cache key.
  material.customProgramCacheKey=()=>distortion?'original-distortion-v2':'original-two-layer-add-v2';
}
// Pinned scalar Particle alpha update subset. Vector curves and near-duplicate
// key times are outside this helper; the existing experimental evaluator stays separate.
export function scalar(keys, time) {
  if (!keys.length) throw Error('Cannot evaluate an empty curve');
  if (time <= keys[0].frame) return keys[0].value;
  const last = keys.at(-1); if (time >= last.frame) return last.value;
  const i = keys.findIndex(k => k.frame > time), a = keys[i - 1], b = keys[i], dt = b.frame - a.frame;
  const u = (time - a.frame) / dt;
  if (a.type === 'Constant') return a.value;
  if (a.type === 'Linear') return a.value + (b.value - a.value) * u;
  if (!['Spline', 'BreakSpline'].includes(a.type)) throw Error('Unknown curve interpolation');
  return (2*u**3-3*u*u+1)*a.value + (u**3-2*u*u+u)*dt*a.slopeRight
    + (-2*u**3+3*u*u)*b.value + (u**3-u*u)*dt*b.slopeLeft;
}
export function vectorCurve(curve, time) {
  return [0,1,2].map(axis => scalar(curve.keys.map(k => ({frame:k.frame,type:k.types[axis],
    value:k.value[axis],slopeLeft:k.slopeLeft[axis],slopeRight:k.slopeRight[axis]})),time));
}
export function nativeScalarAlphaEligibility(effect,node) {
  const reasons=[],ref=node.nativeScalarAlpha;
  if(node.typeId!==3)reasons.push('Only Particle scalar alpha is verified');
  if(node.appearance?.alpha?.mode!=='Curve'||node.appearance.alpha.origin!=='IBMB')reasons.push('Source Curve alpha is required');
  if(ref?.nativeSha256!=='6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77'
    ||ref?.sourceSha256!==effect.sha256||ref?.updateAddress!=='0x2002af4'||ref?.initAddress!=='0x20025ec')
    reasons.push('Pinned source-selected alpha wrapper evidence is required');
  if(JSON.stringify(ref?.keys)!==JSON.stringify(node.alphaCurve?.keys))reasons.push('Alpha key evidence differs from prepared keys');
  try{nativeScalarAlpha(node.alphaCurve?.keys??[],0);}catch{reasons.push('Curve keys are outside the verified subset');}
  return {supported:reasons.length===0,reasons};
}

export function localAlpha(node, time, useSource=false, useNativeScalar=false) {
  if(!useSource)return (node.alphaCurve.keys.length?scalar(node.alphaCurve.keys,time):1)*(node.materialAlpha?.value??1);
  const channel=node.appearance?.alpha;
  if(channel?.mode==='Constant')return channel.value;
  if(channel?.mode==='Curve')return useNativeScalar?nativeScalarAlpha(node.alphaCurve.keys,time):scalar(node.alphaCurve.keys,time);
  throw Error('Missing or unknown prepared alpha mode');
}
export function localColor(node, time, useSource=false) {
  const channel=useSource?node.appearance?.color:null;
  if(useSource&&!channel)throw Error('Missing prepared color mode');
  if(channel?.supported&&channel.domain==='center') {
    if(channel.mode==='Constant')return [...channel.value];
    if(channel.mode==='Curve')return vectorCurve(node.vectorCurves.centerColor,time);
    throw Error('Unknown prepared color mode');
  }
  return node.vectorCurves.centerColor?.keys.length?vectorCurve(node.vectorCurves.centerColor,time):node.initialColor;
}
export function instances(effect, seed = 1, horizon = 180, observe = null) {
  let state = seed >>> 0, draws = 0;
  const event = (phase, fields) => { if (observe) observe({ phase, ...fields }); };
  const random = () => {
    const before = state; state = (Math.imul(1664525,state)+1013904223)>>>0; draws++;
    event('legacy-rng', { before, after: state, draw: draws }); return state / 4294967296;
  };
  const output = [];
  function spawn(index, parent, parentBirth, parentLife) {
    const node = effect.nodes[index], g = node.generation;
    const sourceDelay=node.nativeGeneration;
    if(sourceDelay&&(sourceDelay.profile!==GENERATION_PROFILE||sourceDelay.mode!==0||![0,2,3].includes(node.typeId)
      ||sourceDelay.typeId!==node.typeId||typeof sourceDelay.enabled!=='boolean'
      ||Object.keys(g).some(key=>g[key]!==sourceDelay[key])))
      throw Error('Unknown native generation delay profile');
    if(sourceDelay&&node.typeId!==0&&!sourceDelay.enabled) {
      event('source-disabled-emitter',{node:index,parent}); return;
    }
    if (g.repeatCount !== 1) throw Error('Repeated generation is not supported in this experiment');
    if (g.duration > 1 && !(g.interval > 0)) throw Error('Generation interval has not been decoded for node '+index);
    const interval = g.duration <= 1 ? 1 : g.interval;
    const duration = Math.min(g.duration, parentLife || horizon);
    for(let offset=0;offset<duration;offset+=interval) for(let batch=0;batch<g.count;batch++) {
      const draw=random();
      // Delay mapping is proven independently of the still-legacy RNG owner/order.
      const delay=sourceDelay?nativeStartDelay(g.start,g.startRange,Math.trunc(draw*4294967296))
        :g.start+Math.floor(draw*(g.startRange+1));
      const birth=parentBirth+offset+delay;
      if(birth>horizon) continue;
      if(output.length>=4096) throw Error('Research instance limit exceeded');
      const sampled={};
      for(const [domain,groups] of Object.entries(node.staticVectors)) {
        sampled[domain]={};for(const [group,p] of Object.entries(groups)) {
          sampled[domain][group]={};for(const term of ['value','speed','acceleration'])
            sampled[domain][group][term]=p[term+'Initial'].map((v,i)=>v+(random()*2-1)*p[term+'Range'][i]);
        }
      }
      const life=node.lifeParameter+Math.floor(random()*(node.lifeRangeParameter+1));
      const instance={id:output.length,node:index,parent,birth,life:life||horizon,sampled};output.push(instance);
      event('legacy-instance', { id: instance.id, node: index, parent, birth, life: instance.life, rng: { word: state, draws },
        assumptions: node.lifeParameter === 0 ? ['Zero life replaced by preview horizon; original stop semantics unresolved'] : [] });
      for(const child of node.children) spawn(child,instance.id,birth,instance.life);
    }
  }
  spawn(0,null,0,horizon);return output;
}
export function parameters(node, instance, domain, group, age, explicitMode) {
  const p=instance.sampled[domain][group];
  const channel=domain==='transform'?group+'Value':domain+group[0].toUpperCase()+group.slice(1)+'Value';
  const curve=node.vectorCurves[channel];
  const speedCurve=node.vectorCurves[channel.replace(/Value$/,'Speed')];
  const modeName=domain==='transform'?group:domain+group[0].toUpperCase()+group.slice(1);
  const mode=explicitMode??node.authoringTextureLayers?.[domain]?.motionModes[group]??node.motionModes[modeName]?.name;
  let value=p.value.map((v,i)=>v+p.speed[i]*age+p.acceleration[i]*age*(age+1)/2);
  if(mode==='CurveValue' && curve?.keys.length) value=vectorCurve(curve,age/instance.life);
  else if(mode==='CurveSpeed' && speedCurve?.keys.length) {
    value=[...p.value];for(let f=0;f<Math.floor(age);f++) {
      const velocity=vectorCurve(speedCurve,f/instance.life);value=value.map((v,i)=>v+velocity[i]);
    }
  } else if(mode==='Constant') value=[...p.value];
  if(group==='scale'&&domain==='transform'&&node.uniformScale) value=[value[0],value[0],value[0]];
  return value;
}
export function updateBasicTextureMap(map,node,item,age,useSource=false) {
  if(!map||!item.sampled.texture1)throw Error('Missing single-texture input');
  const supported=useSource&&node.basicTextureMapping?.supported;
  if(supported){
    const modes=node.basicTextureMapping.motionModes;
    const sample=group=>parameters(node,item,'texture1',group,age,modes[group]);
    map.matrixAutoUpdate=false;
    map.matrix.fromArray(textureMatrix(sample('scale'),sample('translation'),sample('rotation'),node.texturePivots.texture1));
  }else{
    map.matrixAutoUpdate=true;
    const scale=parameters(node,item,'texture1','scale',age),translation=parameters(node,item,'texture1','translation',age);
    map.repeat.set(1/(scale[0]||1),1/(scale[1]||1));map.offset.set(-translation[0]/(scale[0]||1),-translation[1]/(scale[1]||1));
    map.updateMatrix();
  }
}
/** Parent alpha influence; without metadata (legacy plans) the plain product is kept. */
export function parentAlphaInfluence(own,parent,mode,rate) {
  if(!Number.isFinite(rate))return own*parent;
  return mode==='Lerp'?own+(parent-own)*rate:own*(1+(parent-1)*rate);
}
export function inheritanceLimitations(source) {
  if(!source)return ['inheritance metadata unavailable; legacy live TRS and multiplied alpha retained'];
  const issues=[];
  if(source.matrix!=='On'||!['On','OnGenerateTime'].includes(source.translation)||source.rotation!=='On'||source.scale!=='On')
    issues.push('unsupported parent transform combination; legacy live TRS retained');
  // Multiply with rate 1 (the common authored case) is the product by definition of the two fields.
  if(source.alphaRate!==0&&!(source.alphaMode==='Multiply'&&source.alphaRate===1))issues.push('parent alpha influence '+source.alphaMode+' with a rate other than 0 or Multiply/1 uses an unverified formula');
  if(source.colorRate!==0)issues.push('parent color influence remains unsupported');
  return issues;
}

// Pure frame evaluation: snapshots are computed at actual instance birth, never
// captured on the first rendered frame. Fractional births and reverse seeking
// therefore use the same parent state as sequential playback.
export function createTransformEvaluator(THREE,effect,built) {
  const nativeAlphaSupport=new Map(effect.nodes.map(node=>[node.index,nativeScalarAlphaEligibility(effect,node).supported]));
  const nullSupport=new Map(effect.nodes.filter(n=>n.typeId===0&&n.nullLocatorSource?.type==='Billboard').map(n=>[n.index,nullLocatorEligibility(effect,n).supported]));
  const nativeNullSupport=new Map(effect.nodes.filter(n=>n.typeId===0&&n.nativeNullLocator).map(n=>[n.index,zScreenLocatorEligibility(effect,n).supported]));
  for(let i=0;i<built.length;i++)if(built[i].parent!==null&&(!Number.isInteger(built[i].parent)||built[i].parent<0||built[i].parent>=i))throw Error('Invalid instance hierarchy');
  return (frame,useSource=false,useAppearance=false,useNullLocator=false,useNativeNull=false,useNativeAlpha=false)=>{
    if(!Number.isFinite(frame))throw Error('Invalid effect frame');
    const cache=new Map();
    function resolve(index,time){
      const key=index+':'+time;
      if(cache.has(key))return cache.get(key);
      const item=built[index],node=effect.nodes[item.node],age=Math.max(0,Math.min(item.life,time-item.birth));
      const position=new THREE.Vector3(...parameters(node,item,'transform','translation',age));
      const nativeNull=useSource&&useNativeNull&&nativeNullSupport.get(node.index);
      const degrees=!nativeNull&&useSource&&useNullLocator&&nullSupport.get(node.index)?[0,0,0]:parameters(node,item,'transform','rotation',age);
      const rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(...degrees.map(v=>v*Math.PI/180)));
      const scale=new THREE.Vector3(...parameters(node,item,'transform','scale',age));
      let matrix=new THREE.Matrix4().compose(position,rotation,scale);
      const source=useSource?node.authoringInheritance:null;
      const parent=item.parent===null?null:resolve(item.parent,time);
      if(parent){
        let inherited=parent.matrix;
        if(source?.matrix==='On'&&source.translation==='OnGenerateTime'&&source.rotation==='On'&&source.scale==='On'){
          const born=resolve(item.parent,item.birth).matrix;
          inherited=parent.matrix.clone();
          inherited.elements[12]=born.elements[12];inherited.elements[13]=born.elements[13];inherited.elements[14]=born.elements[14];
        }
        matrix.premultiply(inherited);
      }
      if(nativeNull){
        const worldPosition=new THREE.Vector3().setFromMatrixPosition(matrix);
        const inheritedScale=parent?new THREE.Vector3().setFromMatrixScale(parent.matrix):new THREE.Vector3(1,1,1);
        matrix=zScreenLocatorMatrix(THREE,worldPosition.toArray(),scale.toArray(),inheritedScale.toArray(),degrees[2]*Math.PI/180);
      }
      let alpha=localAlpha(node,age/item.life,useAppearance,useNativeAlpha&&nativeAlphaSupport.get(node.index));
      // Authoring knows Multiply (own alpha times the parent's, weighted by the rate) and Lerp (towards the
      // parent's alpha by the rate). Multiply with rate 1 is the plain product this line always computed.
      if(parent&&source?.alphaRate!==0)alpha=parentAlphaInfluence(alpha,parent.alpha,source?.alphaMode,source?.alphaRate);
      const result={matrix,alpha,age};cache.set(key,result);return result;
    }
    return built.map((_,i)=>resolve(i,frame));
  };
}
// The existing player can consume a strictly admitted partial packet profile.
// Material hooks, texture resolution, anchors and framebuffer path stay shared.
async function createQuadBranchPlayer(THREE,scene,plan,texture,geometryScale) {
  if(plan.effects.length!==1||plan.nativeQuadBranches.sourceSha256!==plan.effects[0].sha256
    ||plan.members.length>1||plan.nativeQuadBranches.wholeEffectSupported!==false)throw Error('Explicit partial Quad source identity required');
  evaluateNativeSourceBranches(plan.nativeQuadBranches,0,{scale:[1,1,1],origin:[0,0,0]});
  const sampling=plan.nativeQuadBranches.textureSampling;
  if(sampling&&(sampling.minFilter!==9729||sampling.magFilter!==9729))throw Error('Unsupported measured packet texture sampling');
  const entries=[],slots=nativeBranchSlots(plan.nativeQuadBranches);
  const submission=plan.nativeQuadBranches.drawSubmission;
  validateNativeSubmission(submission,slots,plan.nativeQuadBranches.sourceSha256);
  for(const member of plan.members){
    if(member.effect!==0||member.rotation.some(Boolean)||member.scalePercent<=0)throw Error('Unsupported Quad member pose');
    const root=new THREE.Group();scene.add(root);const meshes=[];
    for(const {program} of slots){
      const node=program.node,geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(18),3));
      geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(12),2));
      geometry.setAttribute('sourceSecondUv',new THREE.Float32BufferAttribute(new Float32Array(12),2));
      const load=async key=>{
        const name=node.resourceBindings[key]?.name;if(!name)return null;
        const map=await texture(plan.effects[0].textures[name]);map.flipY=false;
        if(sampling){map.minFilter=map.magFilter=THREE.LinearFilter;map.generateMipmaps=false;}
        const address=node.materialControls[key+'Address'].name;
        if(!['Clamp','Repeat','Mirror'].includes(address))throw Error('Unsupported packet texture sampler');
        map.wrapS=map.wrapT=address==='Clamp'?THREE.ClampToEdgeWrapping:address==='Mirror'?THREE.MirroredRepeatWrapping:THREE.RepeatWrapping;
        map.needsUpdate=true;return map;
      };
      const map=await load('texture1'),material=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,depthTest:false,side:THREE.DoubleSide});
      applyNativeBlend(THREE,material,program.blend);
      if(node.nativeMaterialSelection.operation===2){
        if(!shaderAddEligible(plan,node))throw Error('Pinned Add packet material required');
        layeredMaterial(THREE,material,await load('texture2'),program.textureTints,null,true,false,true);
      }else{
        if(!shaderBasicEligible(plan,node))throw Error('Pinned Basic packet material required');
        attachNativeBasicMaterial(THREE,material,program.textureTints[0]);
      }
      const mesh=new THREE.Mesh(geometry,material);mesh.renderOrder=program.order;mesh.visible=false;root.add(mesh);meshes.push(mesh);
    }
    entries.push({member,root,meshes,packets:[]});
  }
  return {issues:['Explicit bounded source branches; seed construction/global uniforms/GPU order/release not certified'],
    instanceCount:entries.length*slots.length,
    update(frame,anchor){for(const entry of entries){
      const time=Math.floor(frame-entry.member.startFrame),point=anchor(entry.member);
      entry.root.position.set(point.x,point.y,0);
      const scale=entry.member.scalePercent/100*(point.unitsToPixels??1)*geometryScale;
      entry.root.scale.set(...(point.rootScale??[scale,scale,scale]));
      entry.packets=time<0?[]:evaluateNativeSourceBranches(plan.nativeQuadBranches,time,{scale:[1,1,1],origin:[0,0,0]});
      for(const [i,mesh]of entry.meshes.entries()){
        const packet=entry.packets[i]?.packet;mesh.visible=!!packet?.visible;
        if(!packet)continue;
        mesh.geometry.attributes.position.array.set(packet.vertices.flatMap(v=>v.position));mesh.geometry.attributes.position.needsUpdate=true;
        mesh.geometry.attributes.uv.array.set(packet.vertices.flatMap(v=>v.uv));mesh.geometry.attributes.uv.needsUpdate=true;
        mesh.geometry.computeBoundingSphere();
        const rgba=packet.vertices[0].rgba;mesh.material.color.setRGB(...rgba.slice(0,3).map(v=>v/255));mesh.material.opacity=rgba[3]/255;
        if(packet.vertices[0].uv2){
          mesh.geometry.attributes.sourceSecondUv.array.set(packet.vertices.flatMap(v=>v.uv2));mesh.geometry.attributes.sourceSecondUv.needsUpdate=true;
          const a=packet.vertices[0].uv2,b=packet.vertices[2].uv2;
          mesh.material.userData.layers.layer2Uv.value.fromArray([b[0]-a[0],0,0,0,b[1]-a[1],0,a[0],a[1],1]);}
      }
      if(submission){
        const ranks=nativeSubmissionRanks(submission,slots,entry.packets);
        for(const [i,rank]of ranks.entries())if(rank!==null)entry.meshes[i].renderOrder=rank;
      }
    }},
    traceSnapshot(){scene.updateMatrixWorld(true);return entries.flatMap(e=>e.meshes.map((m,i)=>({node:slots[i].program.node.index,instance:slots[i].instance,
      visible:m.visible,packet:e.packets[i]?.packet??null,worldVertices:Array.from({length:6},(_,v)=>new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,v).applyMatrix4(m.matrixWorld).toArray())})));},
    dispose(){for(const e of entries){scene.remove(e.root);for(const m of e.meshes){m.geometry.dispose();m.material.dispose();}}},
  };
}

export async function createEffectPlayer(THREE, scene, plan) {
  const geometryScale=rendererGeometryScale(plan.rendererReference);
  const loader=new THREE.TextureLoader(), textureCache=new Map(), geometries=new Map(), issues=new Set();
  async function texture(url) {
    if(!textureCache.has(url)){
      const upload=plan.nativeTextureUploads?.[url];
      if(upload){
        if(!plan.nativeQuadBranches||upload.profile!=='cocos-rgba8-premultiplied-v1'
          ||!Number.isInteger(upload.width)||!Number.isInteger(upload.height)||upload.width<1||upload.height<1
          ||upload.width>4096||upload.height>4096||typeof upload.url!=='string')throw Error('Unsupported prepared texture upload');
        textureCache.set(url,(async()=>{
          const response=await fetch(upload.url);if(!response.ok)throw Error('Prepared texture upload missing');
          const bytes=new Uint8Array(await response.arrayBuffer());
          if(bytes.length!==upload.width*upload.height*4)throw Error('Prepared texture upload size mismatch');
          const map=new THREE.DataTexture(bytes,upload.width,upload.height,THREE.RGBAFormat);
          map.flipY=false;map.premultiplyAlpha=false;map.needsUpdate=true;return map;
        })());
      }else textureCache.set(url,new Promise((resolve,reject)=>loader.load(url,resolve,undefined,reject)));
    }
    return (await textureCache.get(url)).clone();
  }
  for(const effect of plan.effects) for(const name of Object.keys(effect.textures)) await texture(effect.textures[name]);
  if(plan.nativeQuadBranches){
    const player=await createQuadBranchPlayer(THREE,scene,plan,texture,geometryScale),dispose=player.dispose;
    player.dispose=()=>{dispose();for(const pending of textureCache.values())void pending.then(texture=>texture.dispose());textureCache.clear();};
    return player;
  }
  const active=[];
  if(plan.flatQuadColors&&(plan.flatQuadColors.profile!==FLAT_QUAD_RGB_PROFILE
    ||plan.flatQuadColors.randomness!==COLOR_STREAM_POLICY))throw Error('Unreviewed Flat Quad RGB profile');
  for(const member of plan.members) {
    const effect=plan.effects[member.effect], memberSeed=memberSamplingSeed(plan,member), built=instances(effect,memberSeed,plan.effectHorizon);
    if(plan.sourceAppearance)for(const node of effect.nodes){
      if(!node.appearance)throw Error('Missing prepared source appearance');
      for(const limitation of node.appearance.limitations)issues.add(effect.name+': node '+node.index+' '+limitation);
    }
    if(plan.basicTextureUv)for(const node of effect.nodes){
      const binding=node.resourceBindings;
      if(binding.texture1&&!binding.texture2&&!node.basicTextureMapping)throw Error('Missing prepared Basic texture mapping');
      for(const limitation of node.basicTextureMapping?.limitations??[])issues.add(effect.name+': node '+node.index+' '+limitation+'; legacy UV preview retained');
    }
    if(plan.sourceInheritance)for(const node of effect.nodes)if(node.parentIndex!==null)
      for(const limitation of inheritanceLimitations(node.authoringInheritance))issues.add(effect.name+': '+limitation);
    const nullWrapperSupported=member.rotation.every(v=>v===0)&&member.scalePercent>0;
    if(plan.nullLocator)for(const node of effect.nodes)if(node.typeId===0){
      if(!node.nullLocatorSource)issues.add(effect.name+': Null locator source unavailable; legacy comparison retained');
      else if(node.nullLocatorSource.type!=='Standard'){
        const support=plan.nativeNullLocator?zScreenLocatorEligibility(effect,node):nullLocatorEligibility(effect,node);
        if(!support.supported||!nullWrapperSupported)issues.add(effect.name+': Null '+node.index+' locator unsupported: '+
          [...support.reasons,...(!nullWrapperSupported?['unrotated positive-scale wrapper required']:[])].join('; ')+'; legacy comparison retained');
      }
    }
    if(!member.placement&&member.rawGroupFields?.slice(-2).some(v=>Number(v)!==0))issues.add(effect.name+': nonzero source member fields '+member.rawGroupFields.slice(-2).join(', ')+' retained but not evaluated; placement remains an adaptation');
    if(member.placement)issues.add('Rectangle placement uses adapted arena/unit bounds and zero scatter; native coordinate mapping is not verified.');
    const root=new THREE.Group();scene.add(root);
    const runtime=[];
    for(const item of built) {
      const node=effect.nodes[item.node], group=new THREE.Group();root.add(group);
      let flatColor=null;
      if(node.flatQuadColor){
        if(!plan.flatQuadColors||node.typeId!==2||node.quadColors)throw Error('Conflicting or unadmitted Quad color paths');
        validateFlatQuadColor(node.flatQuadColor);
        flatColor=sampleFlatQuadColor(node.flatQuadColor,memberSeed,item.id);
      }
      if(plan.nativeMaterialSelection&&node.typeId===6&&node.nativeMaterialSelection?.operation!==0)
        issues.add(effect.name+': Model '+node.index+' has no reviewed Basic material selection; legacy material comparison retained');
      const particleSupport=plan.particleGeometry&&node.typeId===3?particleGeometryEligibility(effect,node,member):null;
      const nativeXSupport=plan.nativeParticleX&&node.typeId===3?nativeParticleXEligibility(effect,node,member):null;
      // Approximation plans draw such a Particle as a generic view-aligned quad (one issue instead of the
      // subset reasons); strict plans keep the legacy plane and list why each subset does not apply.
      if(plan.approximations){
        if(node.typeId===3&&!nativeXSupport?.supported&&!particleSupport?.supported)
          issues.add(effect.name+': Particle '+node.index+' is outside the verified geometry subsets; approximate view-aligned radius-one quad (ancestor roll and group vector unverified)');
      }else{
        if(nativeXSupport&&!nativeXSupport.supported)issues.add(effect.name+': Particle '+node.index+' native X unsupported: '+nativeXSupport.reasons.join('; ')+'; existing comparison retained');
        if(particleSupport&&!particleSupport.supported)issues.add(effect.name+': Particle '+node.index+' geometry unsupported: '+particleSupport.reasons.join('; ')+'; legacy geometry retained only for comparison');
      }
      const unsupportedEmission=!!(node.authoringEmissionShape&&node.authoringEmissionShape!=='Point')
        ||(item.parent!==null&&runtime[item.parent].unsupportedEmission);
      if(node.authoringEmissionShape&&node.authoringEmissionShape!=='Point')issues.add(effect.name+': node '+node.index+' emission shape '+node.authoringEmissionShape+' unsupported; source node withheld, not replaced with point emission');
      // An untextured Particle with reviewed screen coverage is a plane of its own colour (dimming, flash).
      if(isUntexturedParticle(node)&&!node.presentationCoverage)issues.add(effect.name+': untextured particle '+node.index+' has unverified primitive rendering; '+(plan.withholdUntexturedParticles?'withheld by default':'legacy white-plane assumption enabled'));
      let mesh=null;
      if(node.typeId!==0) {
        const combination=node.materialControls?.textureCombination?.name;
        if(combination==='Distortion'&&!node.distortionFields) issues.add(effect.name+': distortion node '+node.index+' withheld');
        else {
          const model=node.resourceBindings.model;
          let geometry;
          if(model) {
            const key=effect.name+'/'+model.name;
            if(!geometries.has(key)) {
              const data=effect.meshes[model.name];if(!data) throw Error('Missing prepared model '+model.name);
              const g=new THREE.BufferGeometry();
              g.setAttribute('position',new THREE.Float32BufferAttribute(data.vertices.flatMap(v=>v.position),3));
              g.setAttribute('normal',new THREE.Float32BufferAttribute(data.vertices.flatMap(v=>v.normal),3));
              g.setAttribute('uv',new THREE.Float32BufferAttribute(data.vertices.flatMap(v=>v.uv),2));
              g.setIndex(data.triangles.flat());geometries.set(key,g);
            } geometry=geometries.get(key);
          } else geometry=new THREE.PlaneBufferGeometry(1,1);
          const binding=node.resourceBindings.texture1;
          const map=binding?await texture(effect.textures[binding.name]):null;
          if(map) {
            map.flipY=false;const address=node.materialControls?.texture1Address?.name;
            map.wrapS=map.wrapT=address==='Mirror'?THREE.MirroredRepeatWrapping:address==='Clamp'?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;
            map.needsUpdate=true;
          }
          const material=new THREE.MeshBasicMaterial({map,color:0xffffff,transparent:true,depthWrite:false,depthTest:false,
            side:THREE.DoubleSide,blending:node.materialControls?.blend?.name==='Semitrans'?THREE.NormalBlending:THREE.AdditiveBlending});
          if(plan.nativeBlend) {
            const blend=nativeBlendSelection(plan,node);
            if(blend){material.userData.nativeBlend=blend;applyNativeBlend(THREE,material,blend);}
            else issues.add(effect.name+': node '+node.index+' has unsupported native blend state; legacy comparison retained');
          }
          mesh=new THREE.Mesh(geometry,material);group.add(mesh);
          if(node.resourceBindings.texture2) {
            if((combination==='Add'&&node.authoringTextureLayers)||(combination==='Distortion'&&node.distortionFields)) {
              const second=await texture(effect.textures[node.resourceBindings.texture2.name]);second.flipY=false;
              const address=node.materialControls.texture2Address.name;
              second.wrapS=second.wrapT=address==='Mirror'?THREE.MirroredRepeatWrapping:address==='Clamp'?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;second.needsUpdate=true;
              let state=(memberSeed+item.id*2654435761)>>>0;
              const random=()=>((state=(Math.imul(1664525,state)+1013904223)>>>0)/4294967296)*2-1;
              const settings=node.authoringTextureLayers??node.distortionFields.layers;
              const colors=['texture1','texture2'].map(key=>{const p=settings[key];
                return [...p.rgbInitial.map((v,i)=>v+random()*p.rgbRange[i]),(p.alphaInitial??1)+random()*(p.alphaRange??0)];});
              const addEligible=shaderAddEligible(plan,node);
              layeredMaterial(THREE,material,second,colors,node.distortionFields,addEligible,shaderDistortionEligible(plan,node));
              if(plan.nativeMaterialSelection&&combination==='Add'&&!addEligible) {
                material.userData.shaderAddSupported=false;
                issues.add(effect.name+': node '+node.index+' lacks a matching initial native Add fragment; labeled legacy material comparison retained');
              }
              if(node.distortionFields)issues.add(effect.name+': node '+node.index+(shaderDistortionEligible(plan,node)?' uses the selected native distortion alpha equation; source layer-alpha controls and UV speed remain unverified':' uses legacy experimental distortion; material equation, UV speed and layer alpha remain unverified'));
            } else issues.add(effect.name+': texture 2 not evaluated on node '+node.index);
          }
          if(shaderBasicEligible(plan,node)&&!material.userData.layers)attachNativeBasicMaterial(THREE,material,node.nativeBasicTint.rgba);
          else if(plan.approximations&&node.nativeBasicTint?.approximate&&!material.userData.layers){
            // Approximation plans: the initial first-texture colour scale is applied outside the pinned Basic
            // fragment family too (random range and tint curves are not evaluated).
            attachNativeBasicMaterial(THREE,material,node.nativeBasicTint.rgba);
            if(node.nativeBasicTint.limitations.some(text=>/random|animated/.test(text)))
              issues.add(effect.name+': node '+node.index+' texture tint uses its initial value; random range or tint curve not evaluated');
          }
          else if(plan.nativeBasicMaterial&&node.nativeMaterialSelection?.operation===0)
            issues.add(effect.name+': node '+node.index+' retains legacy Basic material: '+(node.nativeBasicTint?.limitations??['missing tint metadata']).join('; '));
          if(node.quadColors)attachConstantQuadColors(THREE,geometry,material,node.quadColors);
          if(model&&plan.modelVertexRgba)attachModelVertexRgba(THREE,geometry,material,effect.meshes[model.name].vertices);
        }
      }
      runtime.push({...item,group,mesh,unsupportedEmission,particleSupport,nativeXSupport,flatColor});
    }
    active.push({member,effect,memberSeed,built:runtime,root,nullWrapperSupported,evaluate:createTransformEvaluator(THREE,effect,built)});
  }
  let distortionEnabled=true;
  let hiddenSourceNode=null;
  let onlySourceNode=null;
  let legacyWhitePlanesEnabled=!plan.withholdUntexturedParticles;
  function applyScreenCoverage(rectangle) {
    const covered=active.flatMap(entry=>entry.built.filter(item=>entry.effect.nodes[item.node].presentationCoverage)
      .map(item=>({entry,item})));
    if(!covered.length)return;
    if(!rectangle||![rectangle.x,rectangle.y,rectangle.width,rectangle.height].every(Number.isFinite)
      ||rectangle.width<=0||rectangle.height<=0)throw Error('Screen coverage requires an explicit arena rectangle');
    const offset=rectangle.cameraOffset??{x:0,y:0};
    if(![offset.x,offset.y].every(Number.isFinite))throw Error('Invalid screen coverage camera offset');
    for(const {entry,item} of covered){
      if(!item.mesh)throw Error('Screen coverage geometry missing');
      entry.root.updateMatrixWorld(true);
      const world=new THREE.Matrix4().multiplyMatrices(entry.root.matrixWorld,item.group.matrix);
      if(Math.abs(world.determinant())<1e-12){item.mesh.visible=false;continue;}
      const display=new THREE.Matrix4().makeScale(rectangle.width,rectangle.height,1);
      display.setPosition(rectangle.x+rectangle.width/2+offset.x,rectangle.y+rectangle.height/2+offset.y,0);
      item.mesh.matrixAutoUpdate=false;item.mesh.matrix.copy(world.invert().multiply(display));
      item.mesh.matrixWorldNeedsUpdate=true;item.mesh.visible=true;
    }
  }
  let screenFitEnabled=!!plan.fitScreenToArena;
  let inheritanceEnabled=!!plan.sourceInheritance;
  let nullLocatorEnabled=!!plan.nullLocator;
  let nativeNullEnabled=!!plan.nativeNullLocator;
  let appearanceEnabled=!!plan.sourceAppearance;
  let basicUvEnabled=!!plan.basicTextureUv;
  let particleGeometryEnabled=!!plan.particleGeometry;
  let nativeXEnabled=!!plan.nativeParticleX;
  let nativeAlphaEnabled=!!plan.nativeScalarAlpha;
  const approximateBillboards=!!plan.approximations;
  return {issues:[...issues], instanceCount:active.reduce((s,e)=>s+e.built.length,0),
    dispose() {
      for (const entry of active) scene.remove(entry.root);
      for (const pending of textureCache.values()) void pending.then(texture=>texture.dispose());
      textureCache.clear();
    },
    traceSnapshot() {
      // Numeric observation of this player, never an original-engine reference.
      scene.updateMatrixWorld(true);
      return active.flatMap(entry => entry.built.map(item => {
        const mesh=item.mesh, position=mesh?.geometry.attributes.position;
        const worldVertices=position?Array.from({length:position.count},(_,i)=>
          Array.from(new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld).toArray())):[];
        return { id:item.id, node:item.node, parent:item.parent, birth:item.birth, life:item.life,
          ...(plan.memberRandomness?{sampling:{seed:entry.memberSeed,member:entry.member.randomStreamKey,target:entry.member.targetKey??"target0"}}:{}),
          visible:entry.root.visible&&item.group.visible&&!!mesh&&mesh.visible,
          worldMatrix:Array.from(item.group.matrixWorld.toArray()), worldVertices,
          triangleIndices:mesh?.geometry.index?Array.from(mesh.geometry.index.array):[],
          material:mesh?{blending:mesh.material.blending,opacity:mesh.material.opacity,
            depthTest:mesh.material.depthTest,depthWrite:mesh.material.depthWrite,renderOrder:mesh.renderOrder}:null };
      }));
    },
    setDistortion(enabled) {distortionEnabled=enabled;},
    setDiagnosticHiddenNode(key) {hiddenSourceNode=key;},
    setDiagnosticOnlyNode(key) {onlySourceNode=key;},
    setLegacyWhitePlanes(enabled) {legacyWhitePlanesEnabled=enabled;},
    setScreenFit(enabled) {screenFitEnabled=enabled;},
    setScreenRectangle(rectangle) {applyScreenCoverage(rectangle);},
    setSourceInheritance(enabled) {inheritanceEnabled=!!plan.sourceInheritance&&enabled;},
    setNullLocator(enabled) {nullLocatorEnabled=!!plan.nullLocator&&enabled;},
    setNativeNullLocator(enabled) {nativeNullEnabled=!!plan.nativeNullLocator&&enabled;},
    setSourceAppearance(enabled) {appearanceEnabled=!!plan.sourceAppearance&&enabled;},
    setBasicTextureUv(enabled) {basicUvEnabled=!!plan.basicTextureUv&&enabled;},
    setParticleGeometry(enabled) {particleGeometryEnabled=!!plan.particleGeometry&&enabled;},
    setNativeParticleX(enabled) {nativeXEnabled=!!plan.nativeParticleX&&enabled;},
    setNativeScalarAlpha(enabled) {nativeAlphaEnabled=!!plan.nativeScalarAlpha&&enabled;},
    setQuadColors(enabled) {for(const entry of active)for(const item of entry.built)if(item.mesh?.material.userData.quadColorsEnabled)item.mesh.material.userData.quadColorsEnabled.value=enabled;},
    setModelVertexRgba(enabled) {for(const entry of active)for(const item of entry.built)if(item.mesh?.material.userData.modelVertexRgbaEnabled)item.mesh.material.userData.modelVertexRgbaEnabled.value=!!enabled;},
    setTextureLayers(enabled) {for(const entry of active)for(const item of entry.built)if(item.mesh?.material.userData.layers)item.mesh.material.userData.layers.useSecondLayer.value=enabled;},
    setShaderAdd(enabled) {for(const entry of active)for(const item of entry.built)if(item.mesh?.material.userData.shaderAddSupported)item.mesh.material.userData.layers.useShaderAdd.value=!!plan.shaderAddReference&&!!enabled;},
    setShaderDistortion(enabled) {for(const entry of active)for(const item of entry.built)if(item.mesh&&shaderDistortionEligible(plan,entry.effect.nodes[item.node]))item.mesh.material.userData.layers.useShaderDistortion.value=!!enabled;},
    setNativeBasic(enabled) {for(const entry of active)for(const item of entry.built)if(item.mesh?.material.userData.nativeBasic)item.mesh.material.userData.nativeBasic.enabled.value=!!enabled;},
    setNativeBlend(enabled) {for(const entry of active)for(const item of entry.built)if(item.mesh?.material.userData.nativeBlend)applyNativeBlend(THREE,item.mesh.material,item.mesh.material.userData.nativeBlend,!!enabled);},
    update(frame,anchor,screenRectangle) {
      for(const entry of active) {
        const time=frame-entry.member.startFrame;entry.root.visible=time>=0;
        const point=anchor(entry.member);entry.root.position.set(point.x,point.y,0);
        if(point.rootScale!==undefined){
          if(!Array.isArray(point.rootScale)||point.rootScale.length!==3||!point.rootScale.every(v=>Number.isFinite(v)&&v>0))throw Error('Invalid explicit host root scale');
          entry.root.scale.set(...point.rootScale);
        }else{
          const scale=entry.member.scalePercent/100*(point.unitsToPixels??1)*geometryScale;entry.root.scale.set(scale,scale,scale);
        }
        entry.root.rotation.set(...entry.member.rotation.map(v=>v*Math.PI/180));
        if(plan.particleGeometry)entry.root.updateMatrixWorld(true);
        const transforms=entry.evaluate(time,inheritanceEnabled,appearanceEnabled,nullLocatorEnabled&&entry.nullWrapperSupported,
          nativeNullEnabled&&nullLocatorEnabled&&entry.nullWrapperSupported,nativeAlphaEnabled);
        for(const [index,item] of entry.built.entries()) {
          const node=entry.effect.nodes[item.node],{age,matrix,alpha}=transforms[index];
          const color=localColor(node,age/item.life,appearanceEnabled);
          item.group.matrixAutoUpdate=false;item.group.matrix.copy(matrix);item.group.matrixWorldNeedsUpdate=true;
          item.group.visible=time>=item.birth&&time<item.birth+item.life&&(!node.distortionFields||distortionEnabled)&&hiddenSourceNode!==entry.effect.name+':'+node.index&&(!onlySourceNode||onlySourceNode===entry.effect.name+':'+node.index)&&(!isUntexturedParticle(node)||legacyWhitePlanesEnabled||!!node.presentationCoverage)&&!item.unsupportedEmission;
          if(item.mesh) {
            if(item.particleSupport?.supported||item.nativeXSupport?.supported) {
              item.mesh.matrixAutoUpdate=false;item.mesh.matrix.identity();item.mesh.visible=true;
              const useNativeX=nativeXEnabled&&particleGeometryEnabled&&inheritanceEnabled&&nullLocatorEnabled&&nativeNullEnabled&&item.nativeXSupport?.supported;
              if(useNativeX) {
                const world=new THREE.Matrix4().multiplyMatrices(entry.root.matrixWorld,matrix);
                const parent=item.parent===null?new THREE.Matrix4():transforms[item.parent].matrix;
                const groupX=new THREE.Vector3().setFromMatrixScale(parent).x*entry.root.scale.x;
                const scalar=item.nativeXSupport.mode==='OneX'?1:node.staticVectors.transform.scale.valueInitial[0];
                const display=nativeParticleXDisplayMatrix(THREE,new THREE.Vector3().setFromMatrixPosition(world).toArray(),scalar,groupX,node.staticVectors.transform.rotation.valueInitial[2]*Math.PI/180);
                if(display&&Math.abs(world.determinant())>1e-12)item.mesh.matrix.copy(world.clone().invert().multiply(display));
                else item.mesh.visible=false;
              } else if(particleGeometryEnabled&&item.particleSupport?.supported) {
                const world=new THREE.Matrix4().multiplyMatrices(entry.root.matrixWorld,matrix);
                const display=particleDisplayWorldMatrix(THREE,world);
                if(display)item.mesh.matrix.copy(world.clone().invert().multiply(display));
                else item.mesh.visible=false;
              }
              item.mesh.matrixWorldNeedsUpdate=true;
            } else if(approximateBillboards&&node.typeId===3) {
              // Approximation plans: every Particle outside the verified subsets is a view-aligned quad of
              // radius one (see approximateParticleDisplay); before, it was a 1 x 1 plane tilted with its ancestors.
              item.mesh.matrixAutoUpdate=false;item.mesh.matrix.identity();item.mesh.visible=true;
              const world=new THREE.Matrix4().multiplyMatrices(entry.root.matrixWorld,matrix);
              const display=approximateParticleDisplay(THREE,world);
              if(display&&Math.abs(world.determinant())>1e-12)item.mesh.matrix.copy(world.clone().invert().multiply(display));
              else item.mesh.visible=false;
              item.mesh.matrixWorldNeedsUpdate=true;
            } else if(approximateBillboards&&node.facing?.name==='Billboard'&&(node.typeId===2||node.typeId===6)) {
              // Billboard Quads and Models (source facing type) are view-aligned too: scale and Z roll stay,
              // tilts about X or Y are dropped. A Quad is a unit plane, so no radius factor.
              item.mesh.matrixAutoUpdate=false;item.mesh.matrix.identity();item.mesh.visible=true;
              const world=new THREE.Matrix4().multiplyMatrices(entry.root.matrixWorld,matrix);
              const display=approximateBillboardDisplay(THREE,world);
              if(display&&Math.abs(world.determinant())>1e-12)item.mesh.matrix.copy(world.clone().invert().multiply(display));
              else item.mesh.visible=false;
              item.mesh.matrixWorldNeedsUpdate=true;
            }
            item.mesh.material.opacity=Math.max(0,Math.min(1,alpha));item.mesh.material.color.setRGB(...(node.quadColors?[1,1,1]:item.flatColor??color));
            const map=item.mesh.material.map;
            const layers=item.mesh.material.userData.layers;
            if(layers&&node.distortionFields)for(const key of ['texture1','texture2']) {
              const settings=node.distortionFields.layers[key];
              if(settings.colorMode==='CurveValue'&&settings.colorCurve.keys.length) {
                const rgb=vectorCurve(settings.colorCurve,age/item.life),uniform=layers[key==='texture1'?'layer1Tint':'layer2Tint'];
                uniform.value.set(...rgb,1);
              }
            }
            if(layers)for(const key of ['texture1','texture2']) {
              const matrix=textureMatrix(parameters(node,item,key,'scale',age),parameters(node,item,key,'translation',age),parameters(node,item,key,'rotation',age),node.texturePivots[key]);
              layers[key==='texture1'?'layer1Uv':'layer2Uv'].value.fromArray(matrix);
            }
            if(map&&item.sampled.texture1&&!layers)updateBasicTextureMap(map,node,item,age,basicUvEnabled);
          }
        }
        if(screenFitEnabled&&entry.member.anchor==='screen') {
          if(!screenRectangle)throw Error('Screen fitting requires arena coordinates');
          if(!entry.screenBounds) {
            entry.root.updateMatrixWorld(true);
            const box=new THREE.Box3().setFromObject(entry.root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
            entry.screenBounds={width:size.x,height:size.y,centerX:center.x,centerY:center.y};
          }
          const fit=coverScreenBounds(entry.screenBounds,screenRectangle);
          entry.root.scale.multiplyScalar(fit.scale);entry.root.position.set(fit.x,fit.y,0);
        }
      }
      applyScreenCoverage(screenRectangle);
    }};
}
// Isolated preview compositor. All source formats remain outside the game.
export function createSceneSnapshot(THREE, scene, canvas) {
  const snapshot=new THREE.CanvasTexture(canvas);
  const background=new THREE.Mesh(new THREE.PlaneBufferGeometry(canvas.width,canvas.height),
    new THREE.MeshBasicMaterial({map:snapshot,depthWrite:false,depthTest:false}));
  background.position.z=-3000;background.renderOrder=-10000;scene.add(background);
  return {snapshot,background};
}

export function composeSceneLayer(layer, paint, enabled) {
  if(layer.hostContext){composeEffectHostLayer(layer,paint,enabled);return;}
  layer.background.visible=enabled;
  if(enabled)layer.snapshot.needsUpdate=true;
  if(enabled&&layer.nativeBlend) {
    if(!layer.nativePresentation) {
      const THREE=layer.nativeBlendThree,target=new THREE.WebGLRenderTarget(layer.gpu.width,layer.gpu.height);
      const scene=new THREE.Scene(),camera=new THREE.Camera();
      const material=new THREE.ShaderMaterial({uniforms:{frame:{value:target.texture}},depthTest:false,depthWrite:false,blending:THREE.NoBlending,
        vertexShader:'varying vec2 screenUv;void main(){screenUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
        fragmentShader:'uniform sampler2D frame;varying vec2 screenUv;void main(){gl_FragColor=vec4(texture2D(frame,screenUv).rgb,1.0);}'});
      scene.add(new THREE.Mesh(new THREE.PlaneBufferGeometry(2,2),material));
      layer.nativePresentation={target,scene,camera,material};
    }
    const output=layer.nativePresentation;
    layer.renderer.setRenderTarget(output.target);layer.renderer.render(layer.scene,layer.camera);
    layer.renderer.setRenderTarget(null);layer.renderer.render(output.scene,output.camera);
  } else layer.renderer.render(layer.scene,layer.camera);
  paint.drawImage(layer.gpu,0,0);
}

// Opt-in native coordinate/raster pass. Copy the existing scene before clipping
// effects, then present the complete result so the clip cannot erase the host.
export function composeEffectHostLayer(layer,paint,enabled) {
  const context=validateEffectHostContext(layer.hostContext),THREE=layer.nativeBlendThree;
  if(!THREE)throw Error('Explicit Three renderer required for host composition');
  const {renderer,scene,gpu}=layer,{width,height}=context.framebuffer;
  if(gpu.width!==width||gpu.height!==height||renderer.getPixelRatio()!==1)throw Error('Host framebuffer dimensions/pixel ratio mismatch');
  if(!layer.hostPresentation){
    const target=new THREE.WebGLRenderTarget(width,height),copyScene=new THREE.Scene(),copyCamera=new THREE.Camera();
    const material=new THREE.ShaderMaterial({uniforms:{frame:{value:null},opaque:{value:false}},depthTest:false,depthWrite:false,blending:THREE.NoBlending,
      vertexShader:'varying vec2 screenUv;void main(){screenUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
      fragmentShader:'uniform sampler2D frame;uniform bool opaque;varying vec2 screenUv;void main(){vec4 c=texture2D(frame,screenUv);gl_FragColor=vec4(c.rgb,opaque?1.0:c.a);}'});
    copyScene.add(new THREE.Mesh(new THREE.PlaneBufferGeometry(2,2),material));
    const effectCamera=new THREE.Camera();effectCamera.matrixAutoUpdate=false;
    layer.hostPresentation={target,copyScene,copyCamera,material,effectCamera};
  }
  const pass=layer.hostPresentation;
  if(pass.target.width!==width||pass.target.height!==height)pass.target.setSize(width,height);
  pass.effectCamera.projectionMatrix.fromArray(context.camera.projectionMatrix);
  pass.effectCamera.matrixWorld.identity();pass.effectCamera.matrixWorldInverse.identity();
  const previous={target:renderer.getRenderTarget(),viewport:renderer.getViewport(new THREE.Vector4()),
    scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest(),autoClear:renderer.autoClear,
    background:layer.background.visible};
  try{
    renderer.autoClear=false;layer.background.visible=false;
    renderer.setRenderTarget(pass.target);renderer.setViewport(0,0,width,height);renderer.setScissorTest(false);renderer.clear();
    if(enabled){
      layer.snapshot.needsUpdate=true;pass.material.uniforms.frame.value=layer.snapshot;pass.material.uniforms.opaque.value=false;
      renderer.render(pass.copyScene,pass.copyCamera);
    }
    renderer.setViewport(...context.framebuffer.viewport);
    renderer.setScissor(...context.framebuffer.scissorBox);renderer.setScissorTest(context.framebuffer.scissorEnabled);
    renderer.render(scene,pass.effectCamera);
    renderer.setRenderTarget(null);renderer.setViewport(0,0,width,height);renderer.setScissorTest(false);renderer.clear();
    pass.material.uniforms.frame.value=pass.target.texture;pass.material.uniforms.opaque.value=enabled;
    renderer.render(pass.copyScene,pass.copyCamera);paint.drawImage(gpu,0,0);
  }finally{
    renderer.setRenderTarget(previous.target);renderer.setViewport(previous.viewport);renderer.setScissor(previous.scissor);
    renderer.setScissorTest(previous.scissorTest);renderer.autoClear=previous.autoClear;layer.background.visible=previous.background;
  }
}

export function verifyEffectHostCompositor(THREE,measuredContext) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=8;
  const paint=canvas.getContext('2d',{willReadFrequently:true}),gpu=document.createElement('canvas');gpu.width=gpu.height=8;
  const renderer=new THREE.WebGLRenderer({canvas:gpu,alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});renderer.setClearColor(0,0);
  const scene=new THREE.Scene(),camera=new THREE.Camera(),snapshot=createSceneSnapshot(THREE,scene,canvas);
  const material=new THREE.MeshBasicMaterial({color:0xff0000,depthTest:false,depthWrite:false});
  const mesh=new THREE.Mesh(new THREE.PlaneBufferGeometry(8,8),material);mesh.position.set(4,4,0);scene.add(mesh);
  const context={schemaVersion:1,coordinateSystem:'ffbe-screen-api',engineScreen:{width:8,height:6,geometryScale:1},
    camera:{viewMatrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],projectionMatrix:[.25,0,0,0,0,.25,0,0,0,0,-1,0,-1,-1,0,1]},
    framebuffer:{width:8,height:8,viewport:[1,1,6,6],scissorEnabled:true,scissorBox:[2,2,4,4]}};
  const layer={gpu,renderer,scene,camera,...snapshot,hostContext:context,nativeBlendThree:THREE},checks=[];
  for(const [name,scissor,visible,expectedRed]of [['clipped effects retain full background',true,true,16],['viewport remains distinct from framebuffer',false,true,36],['empty scene preserves full background',true,false,0]]){
    context.framebuffer.scissorEnabled=scissor;mesh.visible=visible;paint.fillStyle='rgb(0,0,255)';paint.fillRect(0,0,8,8);
    renderer.setViewport(0,0,7,7);renderer.setScissor(1,1,2,2);renderer.setScissorTest(true);
    composeSceneLayer(layer,paint,true);
    const pixels=paint.getImageData(0,0,8,8).data;let red=0,blue=0,other=0;
    for(let i=0;i<pixels.length;i+=4){if(pixels[i]>250&&pixels[i+2]<3)red++;else if(pixels[i]<3&&pixels[i+2]>250)blue++;else other++;}
    const viewport=renderer.getViewport(new THREE.Vector4()),clip=renderer.getScissor(new THREE.Vector4());
    const passed=red===expectedRed&&blue===64-expectedRed&&other===0&&viewport.z===7&&clip.x===1&&clip.z===2&&renderer.getScissorTest()===true;
    checks.push({name,red,blue,other,passed});
  }
  context.framebuffer.scissorEnabled=true;mesh.visible=true;material.transparent=true;material.opacity=.5;
  material.blending=THREE.CustomBlending;material.blendSrc=material.blendSrcAlpha=THREE.SrcAlphaFactor;
  material.blendDst=material.blendDstAlpha=THREE.OneMinusSrcAlphaFactor;material.needsUpdate=true;
  paint.fillStyle='rgb(0,0,255)';paint.fillRect(0,0,8,8);composeSceneLayer(layer,paint,true);
  const raw=new Uint8Array(4);renderer.readRenderTargetPixels(layer.hostPresentation.target,4,4,1,1,raw);
  const presented=[...paint.getImageData(4,4,1,1).data],expectedRaw=[128,0,128,191],expectedPresented=[128,0,128,255];
  checks.push({name:'preserve native RGBA internally; present RGB once',raw:[...raw],presented,
    passed:raw.every((v,i)=>Math.abs(v-expectedRaw[i])<=2)&&presented.every((v,i)=>Math.abs(v-expectedPresented[i])<=2)});
  layer.hostPresentation.target.dispose();layer.hostPresentation.material.dispose();layer.hostPresentation.copyScene.children[0].geometry.dispose();material.dispose();mesh.geometry.dispose();snapshot.snapshot.dispose();snapshot.background.geometry.dispose();snapshot.background.material.dispose();renderer.dispose();
  if(measuredContext)checks.push(verifyMeasuredEffectHostRaster(THREE,measuredContext));
  if(checks.some(c=>!c.passed))throw Error('Host compositor GPU check failed: '+JSON.stringify(checks));return checks;
}

function verifyMeasuredEffectHostRaster(THREE,context){
  validateEffectHostContext(context);const {width,height}=context.framebuffer,p=context.camera.projectionMatrix;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const paint=canvas.getContext('2d',{willReadFrequently:true});
  const gpu=document.createElement('canvas');gpu.width=width;gpu.height=height;
  const renderer=new THREE.WebGLRenderer({canvas:gpu,alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});renderer.setClearColor(0,0);
  const scene=new THREE.Scene(),snapshot=createSceneSnapshot(THREE,scene,canvas);
  const mesh=new THREE.Mesh(new THREE.PlaneBufferGeometry(2/p[0],2/p[5]),new THREE.MeshBasicMaterial({color:0xff0000,depthWrite:false,depthTest:false}));
  mesh.position.set(-p[12]/p[0],-p[13]/p[5],-p[14]/p[10]);scene.add(mesh);
  const layer={renderer,scene,gpu,...snapshot,hostContext:context,nativeBlendThree:THREE};
  paint.fillStyle='rgb(0,0,255)';paint.fillRect(0,0,width,height);composeSceneLayer(layer,paint,true);
  const pixels=paint.getImageData(0,0,width,height).data;let red=0,blue=0,other=0;
  for(let i=0;i<pixels.length;i+=4){if(pixels[i]>250&&pixels[i+2]<3)red++;else if(pixels[i]<3&&pixels[i+2]>250)blue++;else other++;}
  const clip=effectHostRaster(context).clipGL,expected=clip.width*clip.height;
  const check={name:'measured host framebuffer/viewport/scissor',width,height,expectedEffectPixels:expected,actualEffectPixels:red,backgroundPixels:blue,
    passed:red===expected&&blue===width*height-expected&&other===0};
  layer.hostPresentation.target.dispose();layer.hostPresentation.material.dispose();layer.hostPresentation.copyScene.children[0].geometry.dispose();
  mesh.geometry.dispose();mesh.material.dispose();snapshot.snapshot.dispose();snapshot.background.geometry.dispose();snapshot.background.material.dispose();renderer.dispose();
  return check;
}

export function verifySceneBlending(THREE) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=16;
  const paint=canvas.getContext('2d',{willReadFrequently:true});
  const gpu=document.createElement('canvas');gpu.width=gpu.height=16;
  const renderer=new THREE.WebGLRenderer({canvas:gpu,alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
  renderer.setClearColor(0,0);const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-8,8,8,-8,.1,5000);
  camera.position.z=1000;camera.lookAt(new THREE.Vector3());
  const snapshot=createSceneSnapshot(THREE,scene,canvas);
  const material=new THREE.MeshBasicMaterial({color:new THREE.Color(64/255,32/255,16/255),opacity:.5,
    transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending});
  const effect=new THREE.Mesh(new THREE.PlaneBufferGeometry(16,16),material);scene.add(effect);
  const layer={gpu,renderer,scene,camera,...snapshot},checks=[];
  for(const [name,visible,blend,expected]of [
    ['background identity',false,THREE.AdditiveBlending,[32,64,96,255]],
    ['additive over scene',true,THREE.AdditiveBlending,[64,80,104,255]],
    ['alpha over scene',true,THREE.NormalBlending,[48,48,56,255]],
  ]) {
    paint.fillStyle='rgb(32,64,96)';paint.fillRect(0,0,16,16);
    effect.visible=visible;material.blending=blend;material.needsUpdate=true;
    composeSceneLayer(layer,paint,true);
    const actual=[...paint.getImageData(8,8,1,1).data];
    checks.push({name,expected,actual,passed:actual.every((v,i)=>Math.abs(v-expected[i])<=2)});
  }
  effect.visible=true;material.blending=THREE.AdditiveBlending;material.opacity=1;material.color.setRGB(1,1,1);
  const corners=Object.fromEntries(['leftTop','rightTop','leftBottom','rightBottom'].map((name,i)=>[name,
    {value:i<2?[0,0,0,1]:[1,1,1,1],range:[0,0,0,0]}]));
  attachConstantQuadColors(THREE,effect.geometry,material,{mode:'Constant',flat:false,corners});
  for(const channel of ['RGB','alpha']) {
    if(channel==='alpha') {
      effect.geometry.setAttribute('sourceCornerColor',new THREE.Float32BufferAttribute([
        1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,1],4));
    }
    paint.fillStyle='black';paint.fillRect(0,0,16,16);composeSceneLayer(layer,paint,true);
    for(const [name,y,value]of [['top',1,24],['bottom',14,231]]) {
      const actual=[...paint.getImageData(8,y,1,1).data],expected=[value,value,value,255];
      checks.push({name:'quad '+channel+' '+name,expected,actual,passed:actual.every((v,i)=>Math.abs(v-expected[i])<=2)});
    }
  }
  material.userData.quadColorsEnabled.value=false;paint.fillStyle='black';paint.fillRect(0,0,16,16);
  composeSceneLayer(layer,paint,true);
  const bypassActual=[...paint.getImageData(8,1,1,1).data];
  checks.push({name:'quad color bypass',expected:[255,255,255,255],actual:bypassActual,passed:bypassActual.every(v=>v===255)});
  for(const mesh of [effect,snapshot.background]){mesh.geometry.dispose();mesh.material.dispose();}
  snapshot.snapshot.dispose();renderer.dispose();
  if(checks.some(c=>!c.passed))throw Error('GPU scene blending check failed: '+JSON.stringify(checks));
  return checks;
}

export function verifyModelVertexRgba(THREE) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=16;
  const paint=canvas.getContext('2d',{willReadFrequently:true});
  const gpu=document.createElement('canvas');gpu.width=gpu.height=16;
  const renderer=new THREE.WebGLRenderer({canvas:gpu,alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
  renderer.setClearColor(0,0);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-8,8,8,-8,.1,5000);
  camera.position.z=1000;camera.lookAt(new THREE.Vector3());
  const snapshot=createSceneSnapshot(THREE,scene,canvas);
  const geometry=new THREE.PlaneBufferGeometry(16,16);
  const material=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,depthTest:false,depthWrite:false,blending:THREE.NormalBlending});
  const mesh=new THREE.Mesh(geometry,material);scene.add(mesh);
  attachModelVertexRgba(THREE,geometry,material,Array.from({length:4},()=>({colorBytes:[128,64,255,128]})));
  const layer={gpu,renderer,scene,camera,...snapshot},checks=[];
  const check=(name,x,y,expected)=>{
    paint.fillStyle='black';paint.fillRect(0,0,16,16);composeSceneLayer(layer,paint,true);
    const actual=[...paint.getImageData(x,y,1,1).data];
    checks.push({name,expected,actual,passed:actual.every((value,i)=>Math.abs(value-expected[i])<=2)});
  };
  check('model constant RGBA',8,8,[64,32,128,255]);
  material.userData.modelVertexRgbaEnabled.value=false;check('model bypass',8,8,[255,255,255,255]);
  material.userData.modelVertexRgbaEnabled.value=true;
  geometry.setAttribute('sourceModelColor',new THREE.Uint8BufferAttribute([255,255,255,0,255,255,255,0,255,255,255,255,255,255,255,255],4,true));
  check('model alpha interpolation top',8,1,[24,24,24,255]);check('model alpha interpolation bottom',8,14,[231,231,231,255]);
  geometry.setAttribute('sourceModelColor',new THREE.Uint8BufferAttribute([0,0,0,255,0,0,0,255,255,255,255,255,255,255,255,255],4,true));
  check('model RGB interpolation top',8,1,[24,24,24,255]);check('model RGB interpolation bottom',8,14,[231,231,231,255]);
  geometry.setAttribute('sourceModelColor',new THREE.Uint8BufferAttribute(Array(16).fill(255),4,true));
  check('opaque-white model enabled',8,8,[255,255,255,255]);
  material.userData.modelVertexRgbaEnabled.value=false;check('opaque-white model bypass',8,8,[255,255,255,255]);
  geometry.dispose();material.dispose();snapshot.background.geometry.dispose();snapshot.background.material.dispose();snapshot.snapshot.dispose();renderer.dispose();
  if(checks.some(row=>!row.passed))throw Error('GPU model RGBA check failed: '+JSON.stringify(checks));
  return checks;
}

// Compare actual material-hook output with the unedited pinned native fragment,
// not a second copy of the candidate's JavaScript arithmetic.
export function verifyShaderAdd(THREE,fragmentSource) {
  const renderer=new THREE.WebGLRenderer({alpha:true,premultipliedAlpha:false});
  renderer.setSize(4,4,false);const target=new THREE.WebGLRenderTarget(4,4);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,10);camera.position.z=1;
  const texture=bytes=>{const t=new THREE.DataTexture(new Uint8Array(bytes),1,1,THREE.RGBAFormat);t.needsUpdate=true;t.minFilter=t.magFilter=THREE.NearestFilter;return t;};
  const first=texture([64,128,192,128]),second=texture([128,64,32,64]);
  const tints=[[.8,.7,.6,.5],[.4,.5,.6,.7]],node=[.3,.6,.9,.65];
  const geometry=new THREE.PlaneBufferGeometry(2,2);
  const material=new THREE.MeshBasicMaterial({map:first,color:new THREE.Color(...node.slice(0,3)),opacity:node[3],transparent:true,blending:THREE.NoBlending,depthTest:false,depthWrite:false,toneMapped:false});
  layeredMaterial(THREE,material,second,tints,null,true);
  const bytes=[128,192,64,128],modelValues=bytes.map(v=>v/255);
  attachModelVertexRgba(THREE,geometry,material,Array.from({length:4},()=>({colorBytes:[...bytes]})));
  const reference=new THREE.ShaderMaterial({blending:THREE.NoBlending,depthTest:false,depthWrite:false,toneMapped:false,
    uniforms:{baseTex:{value:first},subTex:{value:second},colorScale:{value:new THREE.Vector4(1,1,1,1)},
      fixtureColor:{value:new THREE.Vector4(...node)},fixtureModel:{value:new THREE.Vector4(...modelValues)},
      fixtureFirst:{value:new THREE.Vector4(...tints[0])},fixtureSecond:{value:new THREE.Vector4(...tints[1])}},
    vertexShader:`uniform vec4 fixtureColor,fixtureModel,fixtureFirst,fixtureSecond;
      varying vec4 ipo_color,ipo_tcs1,ipo_tcs2;varying vec2 ipo_uv1,ipo_uv2;
      void main(){ipo_color=fixtureColor*fixtureModel;ipo_tcs1=fixtureFirst;ipo_tcs2=fixtureSecond;ipo_uv1=uv;ipo_uv2=uv;gl_Position=vec4(position.xy,0.0,1.0);}`,
    fragmentShader:fragmentSource});
  const mesh=new THREE.Mesh(geometry,material);scene.add(mesh);const checks=[];
  const read=m=>{mesh.material=m;renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);const pixel=new Uint8Array(4);renderer.readRenderTargetPixels(target,2,2,1,1,pixel);return [...pixel];};
  for(const [name,alpha,model,enabled] of [
    ['weighted secondary alpha',64,modelValues,true],['transparent secondary',0,modelValues,true],
    ['secondary independent of zero vertex RGBA',128,[0,0,0,0],true],
    ['opaque secondary',255,[1,1,1,1],true],['second-layer bypass',0,modelValues,false]]){
    second.image.data[3]=alpha;second.needsUpdate=true;
    reference.uniforms.fixtureModel.value.set(...model);
    geometry.setAttribute('sourceModelColor',new THREE.Uint8BufferAttribute(Array.from({length:4},()=>model.map(v=>Math.round(v*255))).flat(),4,true));
    material.userData.layers.useSecondLayer.value=enabled;
    const expected=read(reference),actual=read(material);
    checks.push({name,expected,actual,passed:actual.every((v,i)=>Math.abs(v-expected[i])<=2)});
  }
  second.image.data[3]=64;second.needsUpdate=true;reference.uniforms.fixtureModel.value.set(...modelValues);
  geometry.setAttribute('sourceModelColor',new THREE.Uint8BufferAttribute(Array(4).fill(bytes).flat(),4,true));
  material.userData.layers.useSecondLayer.value=true;material.userData.layers.useShaderAdd.value=false;
  const expected=read(reference),legacy=read(material);
  checks.push({name:'legacy branch differs from native fragment',expected,actual:legacy,passed:legacy.some((v,i)=>Math.abs(v-expected[i])>2)});
  // Original fragment consumes two independently interpolated UV attributes.
  // A cropped first layer cannot serve as the second layer's coordinate input.
  first.image={data:new Uint8Array([32,0,0,255,64,0,0,255,96,0,0,255,128,0,0,255]),width:4,height:1};
  second.image={data:new Uint8Array([0,16,0,128,0,48,0,128,0,96,0,128,0,240,0,128]),width:4,height:1};
  first.needsUpdate=second.needsUpdate=true;
  const packetMaterial=new THREE.MeshBasicMaterial({map:first,color:new THREE.Color(...node.slice(0,3)),opacity:node[3],transparent:true,blending:THREE.NoBlending,depthTest:false,depthWrite:false,toneMapped:false});
  layeredMaterial(THREE,packetMaterial,second,tints,null,true,false,true);
  attachModelVertexRgba(THREE,geometry,packetMaterial,Array.from({length:4},()=>({colorBytes:[...bytes]})));
  geometry.attributes.uv.array.forEach((v,i,a)=>{a[i]=i%2?.5:.125+v*.25;});geometry.attributes.uv.needsUpdate=true;
  geometry.setAttribute('sourceSecondUv',new THREE.Float32BufferAttribute([.875,.5,.875,.5,.875,.5,.875,.5],2));
  reference.vertexShader='attribute vec2 sourceSecondUv;\n'+reference.vertexShader.replace('ipo_uv2=uv;','ipo_uv2=sourceSecondUv;');reference.needsUpdate=true;
  material.userData.layers.useShaderAdd.value=true;
  const packetExpected=read(reference),packetActual=read(packetMaterial),oldUv=read(material);
  checks.push({name:'independent packet UV2 with cropped UV1',expected:packetExpected,actual:packetActual,passed:packetActual.every((v,i)=>Math.abs(v-packetExpected[i])<=2)});
  checks.push({name:'UV1-derived secondary coordinates fail independent-stream control',expected:packetExpected,actual:oldUv,passed:oldUv.some((v,i)=>Math.abs(v-packetExpected[i])>2)});
  renderer.setRenderTarget(null);target.dispose();geometry.dispose();packetMaterial.dispose();material.dispose();reference.dispose();first.dispose();second.dispose();renderer.dispose();
  if(checks.some(c=>!c.passed))throw Error('Native-source Add GPU comparison failed: '+JSON.stringify(checks));
  return checks;
}

export function verifyShaderDistortion(THREE,fragmentSource) {
  const renderer=new THREE.WebGLRenderer({alpha:true,premultipliedAlpha:false});renderer.setSize(4,4,false);
  const target=new THREE.WebGLRenderTarget(4,4),scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,10);camera.position.z=1;
  const texture=(bytes,width=1)=>{const t=new THREE.DataTexture(new Uint8Array(bytes),width,1,THREE.RGBAFormat);t.needsUpdate=true;t.minFilter=t.magFilter=THREE.NearestFilter;return t;};
  const first=texture([32,64,96,128,80,96,128,128,144,160,192,128,240,224,208,128],4),second=texture([255,128,128,64]);
  const tints=[[.8,.7,.6,.5],[1,1,1,.7]],node=[.3,.6,.9,.65],mid=128/255;
  const geometry=new THREE.PlaneBufferGeometry(2,2);
  const material=new THREE.MeshBasicMaterial({map:first,color:new THREE.Color(...node.slice(0,3)),opacity:node[3],transparent:true,blending:THREE.NoBlending,depthTest:false,depthWrite:false,toneMapped:false});
  layeredMaterial(THREE,material,second,tints,{midpoint:[128,128,128]},false,true);
  const reference=new THREE.ShaderMaterial({blending:THREE.NoBlending,depthTest:false,depthWrite:false,toneMapped:false,
    uniforms:{baseTex:{value:first},subTex:{value:second},colorScale:{value:new THREE.Vector4(1,1,1,1)},
      distDMapMid:{value:new THREE.Vector4(mid,mid,mid,0)},fixtureColor:{value:new THREE.Vector4(...node)},
      fixtureFirst:{value:new THREE.Vector4(...tints[0])},fixtureSecond:{value:new THREE.Vector4(...tints[1])}},
    vertexShader:`uniform vec4 fixtureColor,fixtureFirst,fixtureSecond;
      varying vec4 ipo_color,ipo_tcs1,ipo_tcs2;varying vec2 ipo_uv1,ipo_uv2;
      void main(){ipo_color=fixtureColor;ipo_tcs1=fixtureFirst;ipo_tcs2=fixtureSecond;ipo_uv1=uv;ipo_uv2=uv;gl_Position=vec4(position.xy,0.0,1.0);}`,
    fragmentShader:fragmentSource});
  const mesh=new THREE.Mesh(geometry,material);scene.add(mesh);const checks=[];
  const read=m=>{mesh.material=m;renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);const pixel=new Uint8Array(4);renderer.readRenderTargetPixels(target,2,2,1,1,pixel);return [...pixel];};
  for(const [name,alpha,tintAlpha] of [['partial displacement alpha',64,.7],['transparent displacement',0,1],
    ['opaque displacement',255,1],['layer alpha attenuates displacement',255,.25],['zero layer alpha',255,0]]){
    second.image.data[3]=alpha;second.needsUpdate=true;
    material.userData.layers.layer2Tint.value.w=tintAlpha;reference.uniforms.fixtureSecond.value.w=tintAlpha;
    const expected=read(reference),actual=read(material);
    checks.push({name,expected,actual,passed:actual.every((v,i)=>Math.abs(v-expected[i])<=2)});
  }
  second.image.data[3]=64;second.needsUpdate=true;material.userData.layers.layer2Tint.value.w=.7;
  reference.uniforms.fixtureSecond.value.w=.7;material.userData.layers.useShaderDistortion.value=false;
  const expected=read(reference),legacy=read(material);
  checks.push({name:'legacy distortion differs from native fragment',expected,actual:legacy,passed:legacy.some((v,i)=>Math.abs(v-expected[i])>2)});
  renderer.setRenderTarget(null);target.dispose();geometry.dispose();material.dispose();reference.dispose();first.dispose();second.dispose();renderer.dispose();
  if(checks.some(c=>!c.passed))throw Error('Native-source Distortion GPU comparison failed: '+JSON.stringify(checks));
  return checks;
}

export function verifyShaderBasic(THREE,fragmentSource,vertexSource) {
  if(!vertexSource)throw Error('Native Basic GPU comparison requires original vertex source');
  const renderer=new THREE.WebGLRenderer({alpha:true,premultipliedAlpha:false});renderer.setSize(4,4,false);
  const target=new THREE.WebGLRenderTarget(4,4),scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,10);camera.position.z=1;
  const texture=new THREE.DataTexture(new Uint8Array([128,192,64,128]),1,1,THREE.RGBAFormat);texture.needsUpdate=true;
  const geometry=new THREE.PlaneBufferGeometry(2,2),node=[.6,.8,.9,.75];
  const material=new THREE.MeshBasicMaterial({map:texture,color:new THREE.Color(...node.slice(0,3)),opacity:node[3],transparent:true,blending:THREE.NoBlending,depthTest:false,depthWrite:false,toneMapped:false});
  attachNativeBasicMaterial(THREE,material,[1,1,1,1]);
  attachModelVertexRgba(THREE,geometry,material,Array.from({length:4},()=>({colorBytes:[255,255,255,255]})));
  geometry.setAttribute('in_pos',geometry.attributes.position);geometry.setAttribute('in_tex0',geometry.attributes.uv);
  const reference=new THREE.RawShaderMaterial({blending:THREE.NoBlending,depthTest:false,depthWrite:false,toneMapped:false,
    uniforms:{baseTex:{value:texture},colorScale:{value:new THREE.Vector4(1,1,1,1)},diffuseColor:{value:new THREE.Vector4(...node)},
      tex1ColorScale:{value:new THREE.Vector4(1,1,1,1)},worldMat:{value:new THREE.Matrix4()},viewMat:{value:new THREE.Matrix4()},projMat:{value:new THREE.Matrix4()},
      offset:{value:new THREE.Vector4()},texOffset:{value:new THREE.Vector4()},tex1Rotate:{value:new THREE.Vector4(1,0,0,1)}},
    vertexShader:vertexSource,
    fragmentShader:fragmentSource});
  const mesh=new THREE.Mesh(geometry,material);scene.add(mesh);const checks=[];
  const read=m=>{mesh.material=m;renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);const pixel=new Uint8Array(4);renderer.readRenderTargetPixels(target,2,2,1,1,pixel);return [...pixel];};
  for(const [name,tint,bytes] of [['colored partial-alpha layer',[.2,.7,.4,.5],[128,64,192,128]],
    ['zero texture-layer alpha',[1,1,1,0],[255,255,255,255]],['zero model RGBA',[1,1,1,1],[0,0,0,0]],
    ['overbright tint clamps after model color',[5,4,8,6],[64,128,192,64]],['white-layer baseline',[1,1,1,1],[255,255,255,255]]]){
    material.userData.nativeBasic.tint.value.set(...tint);reference.uniforms.tex1ColorScale.value.set(...tint);
    geometry.setAttribute('sourceModelColor',new THREE.Uint8BufferAttribute(Array(4).fill(bytes).flat(),4,true));
    geometry.setAttribute('in_color',geometry.attributes.sourceModelColor);
    const expected=read(reference),actual=read(material);
    checks.push({name,expected,actual,passed:actual.every((v,i)=>Math.abs(v-expected[i])<=2)});
  }
  material.userData.nativeBasic.tint.value.set(.2,.7,.4,.5);reference.uniforms.tex1ColorScale.value.set(.2,.7,.4,.5);
  material.userData.nativeBasic.enabled.value=false;
  const expected=read(reference),legacy=read(material);
  checks.push({name:'legacy Basic ignores layer tint',expected,actual:legacy,passed:legacy.some((v,i)=>Math.abs(v-expected[i])>2)});
  renderer.setRenderTarget(null);target.dispose();geometry.dispose();material.dispose();reference.dispose();texture.dispose();renderer.dispose();
  if(checks.some(c=>!c.passed))throw Error('Native-source Basic GPU comparison failed: '+JSON.stringify(checks));
  return checks;
}

export function verifyNativeBlend(THREE,reference) {
  const renderer=new THREE.WebGLRenderer({alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});renderer.setSize(4,4,false);
  const gl=renderer.getContext(),target=new THREE.WebGLRenderTarget(4,4),scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,10);camera.position.z=1;
  const material=new THREE.MeshBasicMaterial({transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
  const geometry=new THREE.PlaneBufferGeometry(2,2);scene.add(new THREE.Mesh(geometry,material));
  const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
  const vs=compile(gl.VERTEX_SHADER,'attribute vec2 point;void main(){gl_Position=vec4(point,0.0,1.0);}');
  const fs=compile(gl.FRAGMENT_SHADER,'precision highp float;uniform vec4 sampleColor;void main(){gl_FragColor=sampleColor;}');
  const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.bindAttribLocation(program,0,'point');gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const colorLocation=gl.getUniformLocation(program,'sampleColor'),back=[.2,.35,.6,.4],source=[.7,.2,.45,.25],checks=[];
  const read=()=>{const pixel=new Uint8Array(4);renderer.readRenderTargetPixels(target,2,2,1,1,pixel);return [...pixel];};
  const clear=()=>{renderer.setRenderTarget(null);renderer.setRenderTarget(target);renderer.setClearColor(new THREE.Color(...back.slice(0,3)),back[3]);renderer.clear();};
  const native=(row,rgba)=>{
    // Raw GL fixture must not modify Three's cached geometry VAO.
    renderer.resetState();
    clear();gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.SCISSOR_TEST);gl.colorMask(true,true,true,true);
    if(row[0])gl.enable(gl.BLEND);else gl.disable(gl.BLEND);
    gl.blendEquation(reference.equation);gl.blendFunc(row[1],row[2]);gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    gl.uniform4fv(colorLocation,rgba);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    const pixel=read();renderer.resetState();return pixel;
  };
  const actual=(selection,rgba,enabled=true)=>{
    clear();material.color.setRGB(...rgba.slice(0,3));material.opacity=rgba[3];
    applyNativeBlend(THREE,material,selection,enabled);renderer.render(scene,camera);return read();
  };
  const cases=reference.blendRows.map((row,id)=>({id,alpha:.25}));
  for(const id of [1,2])for(const alpha of [0,1])cases.push({id,alpha});
  for(const {id,alpha} of cases){
    const selection=nativeBlendSelection({nativeBlend:reference},{materialControls:{blend:{id}}}),rgba=[...source.slice(0,3),alpha];
    const expected=native(selection.row,rgba),pixel=actual(selection,rgba);
    checks.push({name:'native blend '+id+' alpha '+alpha,expected,actual:pixel,passed:pixel.every((v,i)=>Math.abs(v-expected[i])<=2)});
  }
  for(const id of [1,2]){
    const selection=nativeBlendSelection({nativeBlend:reference},{materialControls:{blend:{id}}});
    const expected=native(selection.row,source);material.userData.legacyBlend=id===1?THREE.NormalBlending:THREE.AdditiveBlending;
    const pixel=actual(selection,source,false);
    checks.push({name:id===1?'legacy normal preset differs in alpha':'legacy additive preset already matches',expected,actual:pixel,
      passed:id===1?Math.abs(pixel[3]-expected[3])>2:pixel.every((v,i)=>Math.abs(v-expected[i])<=2)});
  }
  const canvas=document.createElement('canvas');canvas.width=canvas.height=4;const paint=canvas.getContext('2d',{willReadFrequently:true});
  paint.fillStyle='rgb(40,80,120)';paint.fillRect(0,0,4,4);
  const composedScene=new THREE.Scene(),composedCamera=new THREE.OrthographicCamera(-2,2,2,-2,.1,5000);composedCamera.position.z=1000;
  const snapshot=createSceneSnapshot(THREE,composedScene,canvas),quadGeometry=new THREE.PlaneBufferGeometry(4,4);
  const quadMaterial=new THREE.MeshBasicMaterial({color:new THREE.Color(200/255,40/255,80/255),opacity:.5,transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
  applyNativeBlend(THREE,quadMaterial,nativeBlendSelection({nativeBlend:reference},{materialControls:{blend:{id:1}}}));
  composedScene.add(new THREE.Mesh(quadGeometry,quadMaterial));
  const layer={renderer,gpu:renderer.domElement,scene:composedScene,camera:composedCamera,...snapshot,nativeBlend:true,nativeBlendThree:THREE};
  renderer.setRenderTarget(null);composeSceneLayer(layer,paint,true);
  const presented=[...paint.getImageData(2,2,1,1).data],internal=new Uint8Array(4);
  renderer.readRenderTargetPixels(layer.nativePresentation.target,2,2,1,1,internal);
  checks.push({name:'preserve internal alpha and present opaque RGB',expected:[120,60,100,255],actual:presented,internal:[...internal],
    passed:presented.every((v,i)=>Math.abs(v-[120,60,100,255][i])<=2)&&Math.abs(internal[3]-191)<=2});
  const secondMaterial=new THREE.MeshBasicMaterial({color:new THREE.Color(40/255,80/255,120/255),opacity:.25,transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
  applyNativeBlend(THREE,secondMaterial,nativeBlendSelection({nativeBlend:reference},{materialControls:{blend:{id:2}}}));
  const secondQuad=new THREE.Mesh(quadGeometry,secondMaterial);secondQuad.renderOrder=2;composedScene.add(secondQuad);
  paint.fillStyle='rgb(40,80,120)';paint.fillRect(0,0,4,4);composeSceneLayer(layer,paint,true);
  const stacked=[...paint.getImageData(2,2,1,1).data];renderer.readRenderTargetPixels(layer.nativePresentation.target,2,2,1,1,internal);
  checks.push({name:'normal then additive preserve alpha inside one effect pass',expected:[130,80,130,255],actual:stacked,internal:[...internal],
    passed:stacked.every((v,i)=>Math.abs(v-[130,80,130,255][i])<=2)&&Math.abs(internal[3]-207)<=2});
  renderer.setRenderTarget(null);target.dispose();geometry.dispose();material.dispose();
  gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
  layer.nativePresentation.target.dispose();layer.nativePresentation.material.dispose();layer.nativePresentation.scene.children[0].geometry.dispose();
  snapshot.snapshot.dispose();snapshot.background.geometry.dispose();snapshot.background.material.dispose();quadGeometry.dispose();quadMaterial.dispose();secondMaterial.dispose();renderer.dispose();
  if(checks.some(c=>!c.passed))throw Error('Native blend GPU comparison failed: '+JSON.stringify(checks));
  return checks;
}

