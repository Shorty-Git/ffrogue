// Compile a deliberately partial graph profile; no source identity selects behavior.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {validateNativeQuad} from '../src/effects/nativeQuad.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1];
const plan=read(get('--plan')),rows=fs.readFileSync(get('--trace'),'utf8').trim().split('\n').map(JSON.parse),inputs=read(get('--inputs'));
const effect=plan.effects.find(e=>e.sha256===rows[0].sourceSha256);
if(!effect||effect.sha256!==inputs.sourceSha256)throw Error('Pinned source/input/trace identity mismatch');
const reference=read('tools/data/reconstruction-map/generator-activation-native.json');
const generation=n=>reference.cases.find(c=>c.node===n.index&&c.sourceSha256===effect.sha256).inputs;
const words=n=>rows.find(r=>r.node===n.index&&r.type==='init-leave').state.rng;
const data=n=>inputs.nodes.find(i=>i.index===n.index).inputs;
const sourceOrder=new Map();
function visit(index){
 if(sourceOrder.has(index))throw Error('Cyclic/shared child graph is outside the source traversal profile');
 const n=effect.nodes.find(n=>n.index===index);if(!n)throw Error('Missing source child');
 sourceOrder.set(index,sourceOrder.size);for(const child of n.children)visit(child);
}
for(const n of effect.nodes.filter(n=>n.parentIndex===null))visit(n.index);
const branches=effect.nodes.filter(n=>n.typeId===2).map(node=>{
 const ancestors=[];let current=effect.nodes[node.parentIndex];
 while(current?.parentIndex!==null){
  if(current.typeId!==0||current.lifeParameter<node.lifeParameter||current.lifeRangeParameter)throw Error('Unsupported branch ancestry');
  const names=rows.filter(r=>r.node===current.index&&r.type==='module-enter'&&r.candidates[0].stage==='init').map(r=>r.candidates[0].name);
  const kind=names.length===4&&names[0].includes('InitConstX')&&names[1].includes('rotation')&&names[2].includes('translation4init4Zero')?'ConstTransform':
   names.length===2&&names[0].includes('translation4init4Zero')&&names[1].includes('color1')?'Neutral':null;
  if(!kind||data(current).color1.value.some(v=>v!==1)||data(current).color1.range.some(Boolean))throw Error('Unadmitted parent modulation/dispatch');
  ancestors.unshift({node:current,kind,words:words(current),generation:generation(current),color:data(current).color1});
  current=effect.nodes[current.parentIndex];
 }
 const calls=rows.filter(r=>r.node===node.index&&r.frame===1&&r.type==='module-enter');
 const has=part=>calls.some(r=>r.candidates[0].name.includes(part));
 if(!has('scaling16ModuleParamTableINS0_3bmb5param4QuadEE12InitVelocity')||!has('SimpleSquare')||!has('MakeVertexDefault')
  ||!has('InitCurve')||!has('InitConstFlat'))throw Error('Unadmitted original Quad dispatch');
 const dispatch={scale:'Velocity',translation:has('translation16ModuleParamTable')?'Velocity':'Zero',geometry:'SimpleSquare',transform:'Default',
  alpha:'Curve',color:'ConstFlat',evidence:'Selected modules in source-identified connected original trace'};
 const moving=dispatch.translation==='Velocity',two=node.nativeMaterialSelection.operation===2;
 const expected={init:['7scaling16ModuleParamTableINS0_3bmb5param4QuadEE12InitVelocity',
  moving?'11translation16ModuleParamTableINS0_3bmb5param4QuadEE12InitVelocity':'11translation4init4Zero',
  ...(two?['10uv_scaling16ModuleParamTableILi2ENS0_3bmb5param4QuadEE9InitConst']:[]),
  '5alpha16ModuleParamTableINS0_3bmb5param4QuadEE9InitCurve','6color416ModuleParamTableINS0_3bmb5param4QuadEE13InitConstFlat'],
 update:['7scaling6update8Velocity',moving?'11translation6update8Velocity':'11translation6update5Const',
  ...(two?['10uv_scaling6update5Const']:[]),'5alpha16ModuleParamTableINS0_3bmb5param4QuadEE11UpdateCurve','6color46update9ConstFlat'],
 make:['7scaling11make_vertex8Velocity',moving?'11translation11make_vertex8Velocity':'11translation11make_vertex5Const',
  '13geometry_quad11make_vertex12SimpleSquare','14transform_quad16ModuleParamTableINS0_3bmb5param4QuadEE17MakeVertexDefault',
  ...(two?['10uv_scaling11ModuleTableILi2EE15MakeVertexConst']:[]),'12uv_transform11ModuleTableILi1EE22MakeVertexTransform___',
  two?'12uv_transform16ModuleParamTableILi2ENS0_3bmb5param4QuadEE22MakeVertexTransformS__':'12uv_transform11ModuleTableILi2EE22MakeVertexTransform___',
  '5alpha11make_vertex5Const','6color411make_vertex9ConstFlat']};
 for(const [phase,patterns]of Object.entries(expected)){
  const selected=calls.filter(r=>r.candidates[0].stage===phase).map(r=>r.candidates[0].name);
  if(selected.length!==patterns.length||selected.some((name,i)=>!name.includes(patterns[i])))throw Error('Complete ordered Quad module profile differs: '+phase);
 }
 dispatch.completeOrderedProfile='quad-velocity-flat-curve-v1';
 const blend={id:node.materialControls.blend.id,row:plan.nativeBlend.blendRows[node.materialControls.blend.id],equation:plan.nativeBlend.equation};
 const program={profile:'native-quad-branch-v1',node,ancestors,dispatch,generation:generation(node),words:words(node),color:data(node).flatColor,
  textureTints:[[1,1,1,1],[1,1,1,1]],textureTrims:[[0,0,1,1],[0,0,1,1]],globalColorScale:[1,1,1,1],
  blend,order:sourceOrder.get(node.index)};
 validateNativeQuad(program);return program;
});
const included=new Set(branches.flatMap(b=>[b.node.index,...b.ancestors.map(a=>a.node.index)]));
const result={schema:'native-quad-branches-v1',sourceSha256:effect.sha256,branches,
 externalInputs:{seeds:'Measured emitter initial seeds; source seed construction is NOT reconstructed',scene:'Explicit positive scale/origin, identity external rotation',
  moduleSelection:'Reviewed complete source module profile from native tables; automatic raw selector compilation for arbitrary Quad sources remains open',
  textureTints:'Neutral fixture cross-checked against H make contexts; no random tint profile',textureTrims:'Explicit full-texture fixture; live trim metadata not captured',
  globalColorScale:'Explicit constructor-default fixture1; live shader constants not captured',order:'Derived source-child DFS, validated against H CPU make order; live GPU order unverified'},
 sourceIdentity:effect.name,wholeEffectSupported:false,unsupportedNodes:effect.nodes.filter(n=>n.parentIndex!==null&&!included.has(n.index)).map(n=>n.index),
 traceSha256:createHash('sha256').update(fs.readFileSync(get('--trace'))).digest('hex')};
const output=get('--output');if(!output.startsWith('tools/data/'))throw Error('Keep prepared research output ignored');
fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify({output,branches:branches.map(b=>b.node.index),wholeEffectSupported:false}));
