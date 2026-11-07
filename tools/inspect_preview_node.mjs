// Inspect staged source-node evaluation without changing source data or rendering.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {instances,createTransformEvaluator} from './original_effect_player.mjs';

const args=process.argv.slice(2),value=flag=>args[args.indexOf(flag)+1];
const stage=path.resolve('tools/data')+path.sep;
for(const flag of ['--plan','--effect','--node','--skill-frame','--output'])
  if(!args.includes(flag)||!value(flag))throw Error('Required: '+flag);
const input=path.resolve(value('--plan')),output=path.resolve(value('--output'));
if(!input.startsWith(stage)||!output.startsWith(stage))throw Error('Plan and receipt must stay inside tools/data');
const nodeIndex=Number(value('--node')),skillFrame=Number(value('--skill-frame'));
if(!Number.isInteger(nodeIndex)||nodeIndex<0||!Number.isFinite(skillFrame)||skillFrame<0)
  throw Error('Invalid node index or skill frame');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const bytes=fs.readFileSync(input),plan=JSON.parse(bytes),effect=plan.effects.find(e=>e.name===value('--effect'));
if(!effect||!effect.nodes[nodeIndex])throw Error('Unknown source effect or node');
const node=effect.nodes[nodeIndex],THREE={};
vm.runInNewContext(fs.readFileSync('tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js','utf8'),{exports:THREE,module:{exports:THREE},console});
const built=instances(effect,plan.seed,plan.effectHorizon),evaluate=createTransformEvaluator(THREE,effect,built);
const samples=[];
for(const [memberIndex,member] of plan.members.entries())if(plan.effects[member.effect]===effect){
  const frame=skillFrame-member.startFrame;
  const locatorEnabled=!!plan.nullLocator&&member.rotation.every(v=>v===0)&&member.scalePercent>0;
  const selected=evaluate(frame,!!plan.sourceInheritance,!!plan.sourceAppearance,locatorEnabled,locatorEnabled&&!!plan.nativeNullLocator);
  const legacy=evaluate(frame,false,!!plan.sourceAppearance);
  for(const [index,item] of built.entries())if(item.node===nodeIndex){
    const state=selected[index],matrix=state.matrix;
    const x=new THREE.Vector3().setFromMatrixColumn(matrix,0),y=new THREE.Vector3().setFromMatrixColumn(matrix,1);
    const normal=new THREE.Vector3().crossVectors(x,y).normalize();
    samples.push({memberIndex,effectFrame:frame,instance:item.id,birth:item.birth,life:item.life,
      live:frame>=item.birth&&frame<item.birth+item.life,age:state.age,alpha:state.alpha,
      alphaWithoutInheritanceExperiment:legacy[index].alpha,matrix:matrix.elements,
      transformedPlaneNormal:normal.toArray()});
  }
}
const textures={};
for(const key of ['texture1','texture2']){
  const binding=node.resourceBindings[key];if(!binding)continue;
  const file=plan.files[effect.textures[binding.name]];
  if(!file||hash(fs.readFileSync(file.path))!==file.sha256)throw Error('Stale prepared texture: '+binding.name);
  textures[key]={name:binding.name,...file};
}
const receipt={approved:false,plan:input,planSha256:hash(bytes),playerSha256:hash(fs.readFileSync('tools/original_effect_player.mjs')),
  effect:effect.name,skillFrame,node,textures,samples,
  limitations:['Evaluator state is not native-renderer evidence. Live lifetime does not imply visible pixels.',
    'The transformed XY-plane normal describes the current implementation, not native Particle facing.']};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({effect:effect.name,node:nodeIndex,skillFrame,textures,samples},null,2));
