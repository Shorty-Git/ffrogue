// Measure source-feature omissions on the existing evaluator clock. No rendering
// is changed, and these measurements do not claim native playback equivalence.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {instances, parameters, scalar, isUntexturedParticle} from './original_effect_player.mjs';

const [input,output]=process.argv.slice(2),stage=path.resolve('tools/data')+path.sep;
if(!input||!output||![input,output].every(p=>path.resolve(p).startsWith(stage)))throw Error('Usage: node tools/probe_original_skill_features.mjs tools/data/.../feature-audit.json tools/data/.../feature-probe.json');
const hash=data=>createHash('sha256').update(data).digest('hex');
const auditBytes=fs.readFileSync(input),audit=JSON.parse(auditBytes);
if(hash(fs.readFileSync('tools/original_effect_player.mjs'))!==audit.playerSha256)throw Error('Audit refers to another player revision');
const THREE={};
vm.runInNewContext(fs.readFileSync('tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js','utf8'),{exports:THREE,module:{exports:THREE},console});
const prefix='Basic_ParentNodeInfluence_';
const results=[];
for(const skill of audit.skills){
 const planBytes=fs.readFileSync(skill.plan);
 if(hash(planBytes)!==skill.planSha256)throw Error('Stale audited plan');
 const plan=JSON.parse(planBytes);
 for(const source of skill.effects){
  const effect=plan.effects.find(e=>e.name===source.name),built=instances(effect,plan.seed,plan.effectHorizon);
  const fields=new Map(source.nodes.map(n=>[n.index,n.fields])),withheld=[];
  for(const item of built){
   const node=effect.nodes[item.node],shape=node.authoringEmissionShape;
   withheld.push(!!(shape&&shape!=='Point')||(item.parent!==null&&withheld[item.parent])||
    (plan.withholdUntexturedParticles&&isUntexturedParticle(node)));
  }
  const snapshots=new Map();
  function snapshot(frame){
   if(snapshots.has(frame))return snapshots.get(frame);
   const rows=[];
   for(const item of built){
    const node=effect.nodes[item.node],age=Math.max(0,Math.min(item.life,frame-item.birth));
    const position=new THREE.Vector3(...parameters(node,item,'transform','translation',age));
    const rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(...parameters(node,item,'transform','rotation',age).map(v=>v*Math.PI/180)));
    const scale=new THREE.Vector3(...parameters(node,item,'transform','scale',age));
    const matrix=new THREE.Matrix4().compose(position,rotation,scale),parent=item.parent===null?null:rows[item.parent];
    if(parent)matrix.premultiply(parent.matrix);
    const ownAlpha=(node.alphaCurve.keys.length?scalar(node.alphaCurve.keys,age/item.life):1)*(node.materialAlpha?.value??1);
    rows.push({matrix,ownAlpha,alpha:ownAlpha*(parent?.alpha??1)});
   }
   snapshots.set(frame,rows);return rows;
  }
  const alpha=new Map(),translation=new Map(),modelActivity=new Map();
  const affected=new Set(source.meshes.filter(m=>m.nonwhiteVertices).flatMap(m=>m.nodes));
  for(let frame=0;frame<=plan.effectHorizon;frame++){
   const current=snapshot(frame);
   for(let i=0;i<built.length;i++){
    const item=built[i],node=effect.nodes[item.node],f=fields.get(item.node);
    if(frame<item.birth||frame>=item.birth+item.life||node.typeId===0||withheld[i])continue;
    const row=current[i];
    if(affected.has(item.node)&&row.alpha>0)modelActivity.set(item.node,(modelActivity.get(item.node)??0)+1);
    if(f?.[prefix+'ParentAlphaRate']==='0'){
     const delta=Math.abs(row.alpha-row.ownAlpha);
     if(delta>1e-6&&delta>(alpha.get(item.node)?.absoluteDelta??0))alpha.set(item.node,{node:item.node,instance:i,effectFrame:frame,ownAlpha:row.ownAlpha,currentPlayerAlpha:row.alpha,absoluteDelta:delta,sourceRate:0,sourceMode:f[prefix+'AlphaParentNodeInfluenceType'],sourceCompatibility16:f.Basic_Basic_Version1_6});
    }
    if(item.parent!==null&&f?.[prefix+'TranslateParentNodeInfluenceType']==='OnGenerateTime'){
     const born=snapshot(item.birth)[item.parent].matrix,now=current[item.parent].matrix;
     const distance=new THREE.Vector3().setFromMatrixPosition(now).distanceTo(new THREE.Vector3().setFromMatrixPosition(born));
     if(distance>1e-6&&distance>(translation.get(item.node)?.distance??0))translation.set(item.node,{node:item.node,instance:i,birth:item.birth,effectFrame:frame,distance,parentAtBirth:new THREE.Vector3().setFromMatrixPosition(born).toArray(),parentNow:new THREE.Vector3().setFromMatrixPosition(now).toArray()});
    }
   }
  }
  results.push({skill:skill.name,effect:effect.name,alphaRateZeroDifferences:[...alpha.values()],
   liveVersusBirthParentTranslation:[...translation.values()],
   nonwhiteModelNodesWithPositiveAlpha:[...modelActivity].map(([node,samples])=>({node,instanceFrameSamples:samples})),
   withheldNodes:[...new Set(built.filter((_,i)=>withheld[i]).map(i=>i.node))]});
 }
}
const result={auditSha256:hash(auditBytes),playerSha256:audit.playerSha256,results,limits:[
 'Uses current instance generation, interpolation and transform policies; not a native reference implementation.',
 'Alpha probe isolates rate-zero nodes only. It does not choose an equation for Multiply/Lerp or compatibility modes.',
 'Parent translation distance is in effect coordinates, before member rotation, scale and screen placement.',
 'Positive-alpha model samples establish evaluator activity, not visible pixels or native shader behavior.',
 'No browser, GPU comparison or original-game video comparison was performed by this probe.'
]};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
for(const r of results)console.log(r.skill,r.effect,JSON.stringify({alpha:r.alphaRateZeroDifferences,translation:r.liveVersusBirthParentTranslation,coloredModelNodes:r.nonwhiteModelNodesWithPositiveAlpha.map(n=>n.node)}));
