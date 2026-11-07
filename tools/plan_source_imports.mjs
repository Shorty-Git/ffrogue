// Resolve exact owned skills once per character; never equate data availability with playable support.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {formLearning} from './lib/form-learning.mjs';
import {inspectCharacter,readJson,sha256,composeEffectFrames,unresolvedEffectAnchors} from './lib/character-pipeline.mjs';
const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1];
if(!args.includes('--output')||args.includes('--select')===args.includes('--shortlist-catalog'))
 throw Error('Use exactly one of --select character:sourceId,... or --shortlist-catalog tools/data/.../inventory.json, with --output tools/data/...');
const output=path.resolve(get('--output')),stage=path.resolve('tools/data')+path.sep;
if(!output.startsWith(stage))throw Error('Candidate reports must remain ignored');
if(args.includes('--shortlist-catalog')){
 if(args.includes('--current-form'))throw Error('Current-form filtering requires an exact owned --select, not a series-only census');
 if(args.includes('--compose-unit-effects'))throw Error('Shortlisting is not exact form composition; use an owned --select first');
 const file=path.resolve(get('--shortlist-catalog'));if(!file.startsWith(stage))throw Error('Use the preserved ignored census');
 const catalog=readJson(file),database=catalog.summary?.database;
 if(database?.file!=='assets/static_data/ffbe-data.db'||database.sha256!==sha256(database.file))throw Error('Census database identity changed');
 const registry=readJson('public/assets/content.json'),known=new Set(),published=new Set(),identities={};
 for(const key of registry.scenePresentations){
  const file=`public/assets/presentations/${key}/manifest.json`,manifest=readJson(file);
  identities[file]=sha256(file);for(const effect of manifest.plan.effects)known.add(effect.name);
 }
 for(const key of registry.characters)for(const skill of readJson(`public/assets/units/${key}/skills.json`).skills)
  if(skill.scenePresentation&&skill.importStatus==='imported')published.add(`${skill.type??'ABILITY'}:${skill.ffbeId}`);
 const candidates=catalog.commands.filter(s=>s.kind==='ABILITY'&&!published.has(`${s.kind}:${s.id}`)
  &&s.originalFiles.length&&s.originalFiles.every(n=>known.has(n))&&!s.dataGaps.length&&!s.knownBlockers.length)
  .map(s=>({kind:s.kind,sourceId:s.id,name:s.name,ownerSeries:s.ownerSeries,originalFiles:s.originalFiles,
   status:'resource-name-overlap-only',playableApproval:false}))
  .sort((a,b)=>a.originalFiles.length-b.originalFiles.length||a.sourceId-b.sourceId);
 fs.mkdirSync(output,{recursive:true});
 fs.writeFileSync(path.join(output,'candidate-shortlist.json'),JSON.stringify({schema:'source-resource-shortlist-v1',
  census:{file:path.relative('.',file).replaceAll('\\','/'),sha256:sha256(file)},presentationIdentities:identities,candidates,
  limits:['Ranking only: no renderer support or additional import count is inferred.',
   'Exact original hashes/versions, form ownership, composed unit prefix, gameplay and battle review remain mandatory.',
   'Uses the saved census rather than scanning all original archives again.']},null,2));
 console.log(JSON.stringify({candidates:candidates.length,playableApproval:false,output:path.join(output,'candidate-shortlist.json')}));
 process.exit(0);
}
const requests=get('--select').split(',').map(value=>{
 const match=/^([a-z][a-z0-9_]*):(\d+|\*)$/.exec(value);if(!match)throw Error('Use character:sourceId or character:* for all owned active skills');
 return {character:match[1],sourceId:match[2]==='*'?'*':Number(match[2])};
});
const reports=new Map(),selection=[],excluded=[];fs.mkdirSync(output,{recursive:true});
for(const request of requests){
 if(!reports.has(request.character)){
  const report=inspectCharacter(readJson(`tools/characters/${request.character}.json`),{assets:'assets',dump:'ffbe_asset_dump-main'});
  const file=path.join(output,request.character+'-inspection.json');fs.writeFileSync(file,JSON.stringify(report,null,2));
  reports.set(request.character,{report,file});
 }
 const {report,file}=reports.get(request.character),matches=report.catalog.filter(s=>(request.sourceId==='*'||s.id===request.sourceId)&&!s.passive);
 if(!matches.length||request.sourceId!=='*'&&matches.length!==1)throw Error('Missing or ambiguous owned active skill '+request.character+':'+request.sourceId);
 for(const skill of matches){
  let acquisition;
  if(args.includes('--current-form')){
   const runtime=readJson(`public/assets/units/${request.character}/manifest.json`);
   if(String(runtime.unitId)!==String(report.unit.spriteUnitId))throw Error('Published runtime form differs from the selected recipe');
   const db=new DatabaseSync(report.source.file,{readOnly:true});let form;
   try{form=db.prepare('SELECT unitId,rare,maxLv FROM unit WHERE unitId=?').get(Number(report.unit.spriteUnitId));}finally{db.close();}
   acquisition=formLearning(skill.learned,form);
   if(!acquisition.ordinaryAtFormMax){
    if(request.sourceId!=='*')throw Error('Current-form acquisition not confirmed: '+request.character+':'+skill.id+' '+acquisition.status);
    excluded.push({character:request.character,sourceId:skill.id,name:skill.name,acquisition});continue;
   }
  }
  if(selection.some(s=>s.character===request.character&&s.kind===skill.kind&&s.sourceId===skill.id))continue;
  let selectedReport=file,intakeBlockers=unresolvedEffectAnchors(skill).map(g=>'Original effect anchor unresolved: '+g.raw);
  if(args.includes('--compose-unit-effects')){
   try{
   if(skill.kind!=='ABILITY')throw Error('Unit-effect composition currently admits ordinary abilities only');
   const identity=request.character+'-'+skill.id,compositionFile=path.join(output,identity+'-composition.json');
   const composition={schemaVersion:1,unit:{unitId:Number(report.unit.spriteUnitId),unitName:report.unit.name,effectFrames:report.basicAttackRaw.effects},
    skill:{abilityId:skill.id,name:skill.name,motionType:skill.raw.motionType,effectFrames:skill.raw.effectFrames},
    ...composeEffectFrames(report.basicAttackRaw.effects,skill.raw.effectFrames,skill.raw.motionType),approved:false,traceVerified:false,
    source:{path:report.source.file,sha256:report.source.sha256},limits:['Research intake only; exact form composition is not body/gameplay or publication approval.']};
   fs.writeFileSync(compositionFile,JSON.stringify(composition,null,2));
   selectedReport=path.join(output,identity+'-composed.json');
   const result=spawnSync(process.execPath,['tools/resolve_composed_skill.mjs','--composition',compositionFile,'--report',file,'--output',selectedReport],{encoding:'utf8'});
   if(result.status!==0)throw Error('Complete unit/skill composition blocked: '+result.stderr);
   }catch(error){selectedReport=file;intakeBlockers.push(error.message);}
  }
  selection.push({character:request.character,sourceId:skill.id,kind:skill.kind,name:skill.name,report:path.relative('.',selectedReport).replaceAll('\\','/'),...(acquisition?{acquisition}:{}),...(intakeBlockers.length?{intakeBlockers}:{})});
 }
}
fs.writeFileSync(path.join(output,'selection.json'),JSON.stringify({schema:1,selection,excluded,currentFormOnly:args.includes('--current-form'),playableApproval:false},null,2));
console.log(JSON.stringify(selection.map(({report,...r})=>r)));
