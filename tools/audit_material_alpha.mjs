// Read-only consistency audit. Numeric validity never implies native fidelity.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {instances,createTransformEvaluator,localColor,inheritanceLimitations} from './original_effect_player.mjs';

const args=process.argv.slice(2),plans=[];
for(let i=0;i<args.length;i++)if(args[i]==='--plan')plans.push(args[++i]);
const output=args[args.indexOf('--output')+1],stage=path.resolve('tools/data')+path.sep;
if(!plans.length||!args.includes('--output')||![...plans,output].every(p=>typeof p==='string'&&path.resolve(p).startsWith(stage)))throw Error('Usage: --plan tools/data/... [--plan ...] --output tools/data/...');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),THREE={};
vm.runInNewContext(fs.readFileSync('tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js','utf8'),{exports:THREE,module:{exports:THREE},console});
const verified=new Map(),skills=[];
const count=(map,key)=>{map[key]=(map[key]??0)+1;};
for(const file of plans){
  const bytes=fs.readFileSync(file),plan=JSON.parse(bytes);
  if(plan.approved!==false)throw Error('Audit research candidates only');
  const result={name:plan.name,sourceId:plan.sourceId,plan:file,planSha256:hash(bytes),effects:[],activeInstanceFrames:0,
    alphaRange:[Infinity,-Infinity],outsideUnitAlphaSamples:0,nonfiniteSamples:0,blendModes:{},textureCombinations:{},localAlphaModes:{},parentAlphaControls:{}};
  for(const effect of plan.effects){
    let textureBindings=0,modelBindings=0;
    for(const node of effect.nodes){
      for(const key of ['texture1','texture2']){
        const binding=node.resourceBindings[key];if(!binding)continue;
        const url=effect.textures[binding.name],asset=plan.files[url];
        if(!asset)throw Error('Missing prepared texture binding: '+effect.name+':'+node.index+':'+key);
        const absolute=path.resolve(asset.path);
        if(!absolute.startsWith(process.cwd()+path.sep))throw Error('Resource outside workspace');
        if(!verified.has(absolute))verified.set(absolute,hash(fs.readFileSync(absolute)));
        if(verified.get(absolute)!==asset.sha256)throw Error('Stale texture resource: '+asset.path);
        textureBindings++;
      }
      const model=node.resourceBindings.model;
      if(model){if(!effect.meshes[model.name])throw Error('Missing prepared model binding');modelBindings++;}
      if(node.typeId!==0){
        count(result.blendModes,node.materialControls?.blend?.name??'Unknown');
        count(result.textureCombinations,node.materialControls?.textureCombination?.name??'No prepared selector');
        count(result.localAlphaModes,node.appearance?.alpha?.mode??'Unknown');
      }
      const parent=node.authoringInheritance;
      count(result.parentAlphaControls,parent?parent.alphaMode+' / '+parent.alphaRate:'Unknown authoring controls');
    }
    const built=instances(effect,plan.seed,plan.effectHorizon),evaluate=createTransformEvaluator(THREE,effect,built);
    const wrappers=plan.members.filter(m=>plan.effects[m.effect]===effect);
    const locatorEnabled=!!plan.nullLocator&&wrappers.every(m=>m.rotation.every(v=>v===0)&&m.scalePercent>0);
    for(let frame=0;frame<=plan.effectHorizon;frame++){
      const states=evaluate(frame,!!plan.sourceInheritance,!!plan.sourceAppearance,locatorEnabled,locatorEnabled&&!!plan.nativeNullLocator);
      for(let index=0;index<built.length;index++){
        const item=built[index];if(frame<item.birth||frame>=item.birth+item.life)continue;
        const state=states[index],color=localColor(effect.nodes[item.node],state.age/item.life,!!plan.sourceAppearance);
        result.activeInstanceFrames++;
        if(![state.alpha,...state.matrix.elements,...color].every(Number.isFinite))result.nonfiniteSamples++;
        result.alphaRange[0]=Math.min(result.alphaRange[0],state.alpha);result.alphaRange[1]=Math.max(result.alphaRange[1],state.alpha);
        if(state.alpha < -1e-6||state.alpha > 1+1e-6)result.outsideUnitAlphaSamples++;
      }
    }
    result.effects.push({name:effect.name,sourceSha256:effect.sha256,textureBindings,modelBindings,
      inheritanceLimitations:[...new Set(effect.nodes.filter(n=>n.parentIndex!==null).flatMap(n=>inheritanceLimitations(n.authoringInheritance)))],
      appearanceLimitations:effect.nodes.flatMap(n=>(n.appearance?.limitations??[]).map(reason=>({node:n.index,reason})))});
  }
  if(!result.activeInstanceFrames)result.alphaRange=null;
  if(result.nonfiniteSamples)throw Error('Nonfinite material/transform evaluation in '+plan.name);
  skills.push(result);
}
const result={approved:false,playerSha256:hash(fs.readFileSync('tools/original_effect_player.mjs')),
  auditToolSha256:hash(fs.readFileSync('tools/audit_material_alpha.mjs')),verifiedTextureFiles:verified.size,skills,
  limits:['Existing prepared source definitions, seed and integer-frame horizon only; member repetitions are not counted twice.',
    'Finite values and complete bindings do not verify native blend, alpha inheritance, random color, shader selection or visibility.',
    'Missing selectors/authoring remain explicit; they do not become defaults or passing publication gates.',
    'Model/source-byte identity is checked separately by audit_original_skill_features.py.',
    'No native shader compilation, emulator observation, rendering change, export or publication occurs.']};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({verifiedTextureFiles:verified.size,skills:skills.map(s=>({name:s.name,activeInstanceFrames:s.activeInstanceFrames,alphaRange:s.alphaRange,nonfiniteSamples:s.nonfiniteSamples,outsideUnitAlphaSamples:s.outsideUnitAlphaSamples}))},null,2));
