import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {bodyAssets,heroBodyClips} from '../src/data/bodyAssets.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
test('published choreography and combat states are admitted for every unit and both original forms',()=>{
 const registry=read('public/assets/content.json'),run=read('public/assets/run-content.json');let skills=0;
 for(const key of registry.characters){
  const m=read(`public/assets/units/${key}/manifest.json`),data=read(`public/assets/units/${key}/skills.json`).skills;
  const clips=heroBodyClips(m,data);assert.ok(clips.includes('atk'));assert.ok(!clips.some(c=>c.startsWith('limit_')));
  skills+=data.filter(s=>s.importStatus==='imported').length;
  for(const skill of data.filter(s=>s.importStatus==='imported'))for(const p of skill.actionChoreography.body.phases??[])assert.ok(clips.includes(p.clip));
  for(const f of run.forms.filter(f=>f.identityKey===key)){
   const form=read('public/'+f.assetPath+'/manifest.json'),a=bodyAssets({[f.key]:form},[{key:f.key,clips:heroBodyClips(form,data)}],run.forms);
   assert.ok(a.every(a=>a.texture.startsWith(f.key+'_')&&fs.existsSync('public/'+a.url)));
  }
 }
 assert.equal(skills,15);
});
test('reviewed CGG passes retain the published strip geometry',()=>{
 const run=read('public/assets/run-content.json');
 const registry=read('public/assets/content.json');
 const entries=[...registry.characters.map(key=>({key,assetPath:'assets/units/'+key})),...run.forms];
 let layered=0;
 for(const entry of entries){
  const root='public/'+entry.assetPath+'/';
  const bytes=fs.readFileSync(root+'manifest.json');
  if(entry.source)assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.source.manifestSha256);
  const manifest=JSON.parse(bytes);
  for(const meta of Object.values(manifest.animations)){
   if(!meta.bodyLayers)continue;
   layered++;
   for(const file of Object.values(meta.bodyLayers)){
    const png=fs.readFileSync(root+file);
    assert.ok(file.endsWith('.'+createHash('sha256').update(png).digest('hex').slice(0,16)+'.png'));
    assert.equal(png.readUInt32BE(16),meta.frameWidth*meta.frameCount);
    assert.equal(png.readUInt32BE(20),meta.frameHeight);
   }
  }
 }
 assert.ok(layered>0);
});
test('requests deduplicate, preserve exact metadata and fail closed on unavailable bodies/clips',()=>{
 const m=read('public/assets/monsters/ochu/manifest.json');
 const a=bodyAssets({ochu:m},[{key:'ochu',clips:['idle','atk','idle']}]);assert.equal(a.length,2);assert.equal(a[1].meta,m.animations.atk);
 assert.throws(()=>bodyAssets({},[{key:'missing',clips:['idle']}]));assert.throws(()=>bodyAssets({ochu:m},[{key:'ochu',clips:['unknown']}]));
 assert.throws(()=>heroBodyClips({animations:{}},[]));
 const hero=read('public/assets/units/cloud/manifest.json');assert.throws(()=>heroBodyClips(hero,[{id:'unreviewed',importStatus:'imported'}]));
});
