import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
test('victory pose gates are bound to all exact original body inputs; no clip is rewritten',()=>{
 const gates=read('public/assets/victory-poses.json'),forms=read('public/assets/run-content.json').forms;assert.equal(gates.schemaVersion,1);assert.equal(Object.keys(gates.units).length,read('public/assets/content.json').characters.length+forms.length);
 for(const [key,g]of Object.entries(gates.units)){
  const root=forms.some(f=>f.key===key)?'public/'+forms.find(f=>f.key===key).assetPath:`public/assets/units/${key}`,m=read(root+'/manifest.json');
  assert.equal(sha(root+'/manifest.json'),g.source.manifestSha256);assert.equal(String(m.unitId),String(g.unitId));
  for(const [clip,h]of Object.entries(g.source.sheets))assert.equal(sha(root+'/'+m.animations[clip].file),h);
  assert.ok(g.frame>=0&&g.frame<m.animations[g.clip].frameCount);assert.ok(g.savedMs>0);
  const ready=g.clip==='win'?(m.animations.win_before?.frames??[]).reduce((s,f)=>s+f.durationMs,0):m.animations[g.clip].frames.slice(0,g.frame).reduce((s,f)=>s+f.durationMs,0);
  assert.ok(Math.abs(ready-g.readyMs)<.011);
 }
 assert.equal(gates.units.cloud.clip,'win_before');assert.ok(gates.units.cloud.savedMs>=2500);assert.ok(gates.units.aerith.savedMs>=2500);
});
