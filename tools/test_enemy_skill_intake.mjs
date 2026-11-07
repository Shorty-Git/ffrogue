import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectEnemySkills,assertEnemySkillReady} from './lib/enemy-skill-pipeline.mjs';
const recipe=key=>JSON.parse(fs.readFileSync('tools/monsters/'+key+'.json','utf8'));
test('monster ownership resolves original skills independently from hero learns and FFRogue names',()=>{
 const guard=inspectEnemySkills(recipe('guard_scorpion')),ochu=inspectEnemySkills(recipe('ochu'));
 assert.deepEqual(guard.catalog.map(s=>s.id),[166950,166960,166970,166980,166990,167130]);
 assert.equal(ochu.catalog[0].name,'Ochu Dance');assert.equal(ochu.catalog[0].raw.monsterSkillId,150200);
 assert.ok(!ochu.catalog.some(s=>s.name==='Vine Lash'));assert.ok(guard.catalog.every(s=>s.kind==='MONSTER_SKILL'&&!s.published));
 assert.throws(()=>inspectEnemySkills({...recipe('ochu'),monsterId:406081000}),/ownership/);
});
test('native effect groups, hit markers and composite monster processes are preserved without implicit execution',()=>{
 const ochu=inspectEnemySkills(recipe('ochu')).catalog[0],micro=inspectEnemySkills(recipe('microchu')).catalog[0];
 assert.deepEqual(ochu.sourceHitMarkers.map(h=>h.frame),[42,52,82,92,102]);assert.equal(ochu.effects[0].groups.length,10);
 assert.ok(ochu.effects[0].groups.some(g=>g.groupId===5000690));assert.equal(micro.sourceGameplay.processIdRaw,'3@101');
 for(const s of [ochu,micro])assert.throws(()=>assertEnemySkillReady(s),/admission blocked/);
 assert.throws(()=>assertEnemySkillReady({...ochu,blockers:[],evidence:Object.fromEntries(Object.keys(ochu.evidence).map(k=>[k,true]))}),/executable enemy-skill contract/);
});
