/** Read-only roster coverage, reusing the global census and exact current body inspection. */
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {formLearning} from './lib/form-learning.mjs';
import {inspectCharacter,readJson,writeJson,sha256,loadControlAudit,refineAuthoringBlockers,unresolvedEffectAnchors} from './lib/character-pipeline.mjs';
const args=process.argv.slice(2),value=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const output=value('--output','tools/data/roster-expansion-20261101/coverage');
if(!path.resolve(output).startsWith(path.resolve('tools/data')+path.sep))throw Error('Ignored output directory required');
const censusFile=value('--census','tools/data/source-only-20261028/catalog/inventory.json'),census=readJson(censusFile);
const controlAuditFile=value('--control-audit'),controlComparisons=controlAuditFile?loadControlAudit(controlAuditFile):[];
const database='rawdata/assets/static_data/ffbe-data.db';
if(sha256(database)!==census.summary.database.sha256)throw Error('Global census database is stale; refresh it before roster coverage');
if(sha256(census.summary.resourceIndex.file)!==census.summary.resourceIndex.sha256)throw Error('Global resource index changed; refresh the census first');
const db=new DatabaseSync(database,{readOnly:true}),audits=[];
const roots=['cross-slash-playable-20261028','skill-expansion-20261028','import-decision-20261028','skill-seven-eight-20261028','braver-20261101','import-wave-20261101','roster-expansion-20261101'];
for(const root of roots){
 const walk=dir=>{if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const p=dir+'/'+e.name;if(e.isDirectory())walk(p);else if(/audit\.json$/.test(e.name)){
   const r=readJson(p);if(r.candidates)for(const candidate of r.candidates)audits.push({...candidate,evidence:p});
  }
 }};walk('tools/data/'+root);
}
const roster=[];
for(const key of readJson('public/assets/content.json').characters){
 const recipe=readJson(`tools/characters/${key}.json`),body=readJson(`public/assets/units/${key}/manifest.json`);
 const inspection=inspectCharacter({...recipe,spriteUnitId:String(body.unitId)},{assets:'rawdata/assets',dump:'rawdata/ffbe_asset_dump'});
 const published=readJson(`public/assets/units/${key}/skills.json`).skills;
 const master=db.prepare('SELECT unitId,unitSeries,rare,maxLv,limitBurstId FROM unit WHERE unitId=?').get(Number(body.unitId));
 const active=inspection.catalog.filter(s=>!s.passive).map(s=>{
  const global=census.commands.find(c=>c.kind===s.kind&&c.id===s.id),receipts=audits.filter(a=>a.kind===s.kind&&a.sourceId===s.id);
  const imported=published.find(p=>p.ffbeId===s.id&&p.type===s.kind&&p.importStatus==='imported'&&p.scenePresentation);
  const history=[...new Set([...(global?.knownBlockers??[]),...receipts.flatMap(r=>r.blockers??[])])];
  const refinement=refineAuthoringBlockers(history,receipts.flatMap(r=>r.effects??[]),controlComparisons),placementGaps=unresolvedEffectAnchors(s),
    blockers=[...refinement.blockers,...placementGaps.map(g=>'original-effect-anchor-unresolved:'+g.raw)];
  const selected=inspection.selected.find(c=>c.ffbeId===s.id);
  return {id:s.id,kind:s.kind,name:s.name,learned:s.learned,formLearning:formLearning(s.learned,master),raw:s.raw,
   published:!!imported,scene:imported?.scenePresentation??null,sourceFiles:global?.originalFiles??[],
   indexedOriginalCount:global?.indexedOriginalCount??0,missingOriginals:global?.unindexedOriginals??[],placementGaps,
   matchedAuthoringFiles:global?.matchedAuthoringFiles??[],blockers,supersededAuthoringBlockers:refinement.superseded,controlAudit:controlAuditFile??null,evidence:receipts.map(a=>a.evidence),
   status:imported?'published':blockers.length?'known-blocker':receipts.length?'prepared-intake-only':'not-assessed',
   selectedIssues:selected?.issues??null,fullyImportableUnpublished:false};
 });
 const lb=census.commands.find(c=>c.kind==='LIMITBURST'&&c.id===master?.limitBurstId);
 roster.push({key,runtimeUnitId:body.unitId,recipeUnitId:recipe.spriteUnitId,seriesId:inspection.unit.seriesId,
  selection:['cloud','aerith','barret'].includes(key)?'default-party':'optional-third-slot-reserve',nativeForm:{rarity:master.rare,maxLevel:master.maxLv},active,
  currentFormLimitBurst:lb??null,allSeriesLimitBursts:census.commands.filter(c=>c.kind==='LIMITBURST'&&c.ownerSeries.includes(inspection.unit.seriesId))});
}
db.close();
const summary={characters:roster.length,seriesActiveEntries:roster.reduce((n,u)=>n+u.active.length,0),
 published:roster.flatMap(u=>u.active).filter(s=>s.published).length,fullyImportableUnpublished:0};
const limits=['Series acquisition retained; formLearning separately bounds ordinary acquisition at the current form maximum level. Conditional/unknown requirements never become current-form approval.',
 'Equipment, quests, enhancement chains and dispatch eligibility require separate joins; this is not a complete original account loadout.',
 'Intake success only certifies resource preparation; placement, choreography, gameplay, publication and actual battle tests remain independent gates.',
 'Global historical blockers and old-form intake receipts are evidence, not guaranteed current-body failure; exact composition is mandatory before publication.',
 'No unpublished entry is certified fully importable by this inventory alone. Limit Bursts have no productive command profile.'];
writeJson(output+'/inventory.json',{schema:'ffrogue-roster-coverage-v1',database:{file:database,sha256:sha256(database)},census:censusFile,summary,limits,roster});
const esc=s=>String(s).replaceAll('|','/').replaceAll('\n',' '),lines=['# Existing roster skill coverage','',
 'Generated read-only with `node tools/inventory_roster_skills.mjs`. Counts describe the current registered roster, not all FFBE.',
 '',...limits.map(x=>'- '+x),'',`Registered characters: ${summary.characters}. Active series entries: ${summary.seriesActiveEntries}. Published Source skills: ${summary.published}.`,'',
 'Local columns count archive-indexed originals / referenced originals, then exact matched authoring files. These counts are not runtime certification.',
 'P = published; B = concrete known blocker; I = intake prepared only; U = not assessed. Original source rows and acquisition requirements are in the ignored inventory JSON.',
 ''];
for(const unit of roster){
 lines.push(`## ${unit.key}`, '',`Runtime form ${unit.runtimeUnitId}; series ${unit.seriesId}; ${unit.selection}.`,'',
  '| Original active command | Kind / ID | Form acquisition | Local originals; authoring | Status | Evidence / next gate |','| --- | --- | --- | --- | --- | --- |');
 for(const s of unit.active){const status={published:'P', 'known-blocker':'B','prepared-intake-only':'I','not-assessed':'U'}[s.status];
  lines.push(`| ${esc(s.name)} | ${s.kind} ${s.id} | ${s.formLearning.status} | ${s.indexedOriginalCount}/${s.sourceFiles.length}; ${s.matchedAuthoringFiles.length} | ${status} | ${esc(s.published?s.scene:s.blockers.length?s.blockers.join('; '):'No full battle/choreography approval; inspect exact current-form composition')} |`);
 }
 const lb=unit.currentFormLimitBurst;
 lines.push('',`Current-form Limit Burst: ${lb?`${lb.name} (${lb.id}); ${lb.indexedOriginalCount}/${lb.originalFiles.length} indexed originals; imported by import_full_character.mjs when its scene is supported.`:'No reliable master-row link resolved.'}`,
  `Other series Limit Burst variants: ${unit.allSeriesLimitBursts.filter(b=>b.id!==lb?.id).map(b=>`${b.name} (${b.id})`).join(', ')||'none'}.`,'');
}
fs.writeFileSync(output+'/coverage.md',lines.join('\n').trimEnd()+'\n');console.log(JSON.stringify(summary));
