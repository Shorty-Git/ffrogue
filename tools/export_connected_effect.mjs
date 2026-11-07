import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {effectHostMemberAnchor,validateEffectHostContext,nativeBlendSelection} from './original_effect_player.mjs';

const args=process.argv.slice(2),value=name=>{const i=args.indexOf(name);if(i<0||!args[i+1])throw Error('Missing '+name);return args[i+1];};
const read=file=>JSON.parse(fs.readFileSync(file,'utf8')),hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const planPath=path.resolve(value('--plan')),plan=read(planPath),memberIndex=Number(value('--member'));
if(plan.approved!==false)throw Error('Unpublished research plan required');
const member=plan.members[memberIndex];if(!member||member.rotation.some(v=>v!==0))throw Error('Explicit unrotated member required');
const effect=plan.effects[member.effect],host=validateEffectHostContext(read(value('--host-reference'))),bindings=read(value('--host-bindings'));
const anchor=effectHostMemberAnchor(host,member,bindings),output=path.resolve(value('--output')),stage=path.resolve('tools/data')+path.sep;
if(!output.startsWith(stage))throw Error('Output must remain in tools/data');
const originals=path.resolve(path.dirname(planPath),'originals'),source=path.resolve(originals,effect.name);
if(!source.startsWith(originals+path.sep)||hash(source)!==effect.sha256)throw Error('Effect source identity mismatch');
const textures=Object.fromEntries(Object.entries(effect.textures).map(([name,url])=>{
  const file=plan.files[url];if(!file||hash(file.path)!==file.sha256)throw Error('Prepared source texture mismatch');
  return [name,{path:path.resolve(file.path),sha256:file.sha256}];
}));
const particle=effect.nodes.find(node=>node.typeId===3);if(!particle)throw Error('Particle source required');
if(!particle.nativeBasicTint?.supported||particle.nativeBasicTint.rgba.some(v=>v!==1)||!particle.nativeMaterialSelection?.basicCandidateCompatible)
 throw Error('Reviewed neutral Basic texture tint and initial shader evidence required');
const blend=nativeBlendSelection(plan,particle);if(!blend)throw Error('Verified native blend selection required');
const request={source,sourceSha256:effect.sha256,textures,host,blend,planSha256:hash(planPath),
  parentEvidence:effect.nodes.filter(n=>n.typeId===0).map(n=>({node:n.index,inheritance:n.authoringInheritance})),
  textureTint:particle.nativeBasicTint,
  shaderSelection:particle.nativeMaterialSelection,
  root:{center:[anchor.x,anchor.y,0],scale:anchor.rootScale},memberIndex};
fs.mkdirSync(path.dirname(output),{recursive:true});const requestPath=output.replace(/\.json$/,'')+'-request.json';
fs.writeFileSync(requestPath,JSON.stringify(request,null,2));
const result=execFileSync(value('--python'),['tools/memorial/export_connected_effect.py','--apk',value('--apk'),'--request',requestPath,'--output',output],
  {encoding:'utf8',env:{...process.env,PYTHONPATH:path.resolve('tools/data/native-locator-emulation/python-deps')}});
process.stdout.write(result);
