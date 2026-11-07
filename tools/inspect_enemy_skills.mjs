// Offline intake only. Reuses original group resolution and the existing archive stager.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {inspectEnemySkills} from './lib/enemy-skill-pipeline.mjs';
import {readJson,writeJson,assetInfo} from './lib/character-pipeline.mjs';
const args=process.argv.slice(2),value=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const output=value('--output','tools/data/battle-polish-20261102/enemy-skills');
if(!path.resolve(output).startsWith(path.resolve('tools/data')+path.sep))throw Error('Ignored intake directory required');
const reports=fs.readdirSync('tools/monsters').filter(f=>f.endsWith('.json')).map(f=>{
 const recipe=readJson('tools/monsters/'+f),report=inspectEnemySkills(recipe);writeJson(output+'/'+recipe.key+'.json',report);return {key:recipe.key,...report};
});
const wanted=new Set(reports.flatMap(r=>r.catalog.flatMap(s=>(s.effects??[]).flatMap(b=>b.groups.flatMap(g=>g.members.map(m=>m.originalFile))))));
const index='tools/data/android-cpk-audit/members.jsonl',archiveMembers=[];
if(fs.existsSync(index))for await(const line of readline.createInterface({input:fs.createReadStream(index),crlfDelay:Infinity})){
 const row=JSON.parse(line);if(wanted.has(row.name)&&row.archive.replaceAll('\\','/').includes('/battleEffect/'))archiveMembers.push(row);
}
const result={schema:'enemy-source-corpus-v1',reports,originalArchiveIndex:assetInfo(index),archiveMembers,
 counts:{enemies:reports.length,originalSkillRecords:reports.reduce((n,r)=>n+r.catalog.length,0),fullyAdmitted:0},
 ffrRules:{source:'src/run/stageContent.mjs',names:['Vine Lash','Bramble Surge','Arm Cannon','Suppressive Burst'],classification:'Deliberate FFRogue abilities; not original monster skill aliases'},
 limits:['Archive index candidates are not hash-verified original payloads until staged.', 'No original AI binding or automatic skill publication.']};
writeJson(output+'/inventory.json',result);console.log(JSON.stringify({counts:result.counts,uniqueOriginalFiles:wanted.size,indexedOriginalMembers:archiveMembers.length}));
