// Prints the player-facing copy of every skill and Limit Burst (review aid for skillDescription).
//   node --experimental-strip-types tools/print_skill_copy.mjs [characterKey]
import fs from 'node:fs';
import {runCatalog,skillDescription} from '../src/run/catalog.ts';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const registry=read('public/assets/content.json'),content=read('public/assets/run-content.json');
const values={content_registry:registry,run_content:content},manifests={};
for(const key of registry.characters){
 values['character_'+key]=read(`public/assets/units/${key}/character.json`);
 values['skills_'+key]=read(`public/assets/units/${key}/skills.json`);
 manifests[key]=read(`public/assets/units/${key}/manifest.json`);
}
for(const key of registry.scenePresentations)values['scene_'+key+'_manifest']=read(`public/assets/presentations/${key}/manifest.json`);
for(const f of content.forms)manifests[f.key]=read(`public/${f.assetPath}/manifest.json`);
const catalog=runCatalog({cache:{json:{get:k=>values[k]}}},manifests);
for(const [key,c] of Object.entries(catalog)){
 if(process.argv[2]&&key!==process.argv[2])continue;
 for(const s of [...c.skills,...(c.limitBurst?[c.limitBurst]:[])])console.log(`${c.name} | ${s.name}: ${skillDescription(s)}`);
}
