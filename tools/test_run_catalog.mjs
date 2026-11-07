import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runCatalog,skillDescription} from '../src/run/catalog.ts';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function fixture(){
 const registry=read('public/assets/content.json'),content=read('public/assets/run-content.json');
 const values={content_registry:registry,run_content:content},manifests={};
 for(const key of registry.characters){
  values['character_'+key]=read(`public/assets/units/${key}/character.json`);
  values['skills_'+key]=read(`public/assets/units/${key}/skills.json`);
  manifests[key]=read(`public/assets/units/${key}/manifest.json`);
 }
 for(const key of registry.scenePresentations)values['scene_'+key+'_manifest']=read(`public/assets/presentations/${key}/manifest.json`);
 for(const f of content.forms)manifests[f.key]=read(`public/${f.assetPath}/manifest.json`);
 return {scene:{cache:{json:{get:k=>values[k]}}},values,manifests};
}
test('production run pool admits the 21 published Source contracts across seven identities',()=>{
 const f=fixture(),catalog=runCatalog(f.scene,f.manifests);
 assert.equal(Object.keys(catalog).length,7);assert.equal(Object.values(catalog).flatMap(c=>c.skills).length,21);
 assert.equal(catalog.barret.skills.length,2);assert.notEqual(catalog.cloud.identity,catalog.cloud_ac.identity);
 for(const c of Object.values(catalog))for(const s of c.skills){const copy=skillDescription(s);assert.ok(copy.includes(`${s.mpCost} MP`));assert.ok(copy.length>12);}
});
test('only prepared same-unit form with required body clips can become an awakening',()=>{
 const f=fixture();let catalog=runCatalog(f.scene,f.manifests);
 assert.equal(catalog.cloud.evolution.unitId,'207000106');assert.equal(catalog.cloud.evolution.identity,catalog.cloud.identity);
 assert.equal(catalog.aerith.evolution.unitId,'207000406');assert.equal(catalog.aerith.evolution.identity,catalog.aerith.identity);delete f.manifests.aerith_form6.animations.atk;assert.ok(!runCatalog(f.scene,f.manifests).aerith.evolution);delete f.manifests.cloud_form6.animations.atk;
 catalog=runCatalog(f.scene,f.manifests);assert.ok(!catalog.cloud.evolution);
 f.values.run_content.units.cloud.unitId='207001605';assert.throws(()=>runCatalog(f.scene,f.manifests),/form mismatch/);
});
test('invalid choreography cannot enter the run just because effect assets exist',()=>{
 const f=fixture();delete f.values.skills_cloud.skills[0].actionChoreography;
 assert.throws(()=>runCatalog(f.scene,f.manifests));
});

test('canonical mappings are explicit, preserve unit series and never infer grouping from names',()=>{
 const f=fixture(),c=runCatalog(f.scene,f.manifests);assert.equal(c.cloud.canonicalIdentity,c.cloud_ac.canonicalIdentity);assert.notEqual(c.cloud.identity,c.cloud_ac.identity);
 delete f.values.run_content.units.aerith.canonicalIdentity;assert.throws(()=>runCatalog(f.scene,f.manifests),/canonical/);
});
