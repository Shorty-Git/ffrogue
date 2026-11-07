import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {spawnSync} from 'node:child_process';
import {readJson,inspectCharacter,unresolvedEffectAnchors} from './lib/character-pipeline.mjs';
import {formLearning} from './lib/form-learning.mjs';
const database='assets/static_data/ffbe-data.db';
test('classic Barret forms keep ordinary four/five/six-star acquisition separate',()=>{
 const report=inspectCharacter(readJson('tools/characters/barret.json'),{assets:'assets',dump:'ffbe_asset_dump-main'});
 const db=new DatabaseSync(database,{readOnly:true});
 try{
  for(const [id,expected]of [[207000204,[227870,227871,227872]],[207000205,[227870,227871,227872,227873]],
    [207000206,[227870,227871,227872,227873,227876,227874,227875]]]){
   const form=db.prepare('SELECT unitId,rare,maxLv FROM unit WHERE unitId=?').get(id);
   assert.deepEqual(report.catalog.filter(s=>!s.passive&&formLearning(s.learned,form).ordinaryAtFormMax).map(s=>s.id),expected);
  }
 }finally{db.close();}
});
test('conditional and malformed acquisition stays unknown rather than granting form eligibility',()=>{
 const form={unitId:1,rare:5,maxLv:80},row={rarity:5,level:1,nvLevel:0,unlockType:0,braveAbility:0};
 assert.equal(formLearning([row],form).status,'current-form');
 for(const field of ['nvLevel','unlockType','braveAbility'])assert.equal(formLearning([{...row,[field]:1}],form).status,'conditional');
 for(const row2 of [{...row,level:undefined},{...row,rarity:NaN},{...row,nvLevel:undefined},{...row,level:1.5}])
  assert.equal(formLearning([row2],form).status,'unknown');
 assert.equal(formLearning([row],{}).status,'unknown');assert.equal(formLearning([],form).status,'unknown');
 assert.equal(formLearning([{...row,rarity:6}],form).status,'later-form');
 assert.equal(formLearning([{...row,level:81}],form).ordinaryAtFormMax,false);
 assert.equal(formLearning([{...row,unlockType:1},row],form).ordinaryAtFormMax,true,'An independent ordinary acquisition path remains evidence');
});
test('independent roster forms retain acquisition bounds without rewriting published host balance',()=>{
 const db=new DatabaseSync(database,{readOnly:true});
 try{for(const key of ['aerith','delita','jack']){
  const recipe=readJson(`tools/characters/${key}.json`),report=inspectCharacter(recipe,{assets:'assets',dump:'ffbe_asset_dump-main'});
  const form=db.prepare('SELECT unitId,rare,maxLv FROM unit WHERE unitId=?').get(Number(recipe.spriteUnitId));
  for(const s of report.catalog.filter(s=>!s.passive)){
   const expected=s.learned.some(r=>r.rarity>=1&&r.rarity<=form.rare&&r.level>=1&&r.level<=form.maxLv&&r.nvLevel===0&&r.unlockType===0&&r.braveAbility===0);
   assert.equal(formLearning(s.learned,form).ordinaryAtFormMax,expected,key+':'+s.id);
  }
 }}finally{db.close();}
});
test('current-form batch selection excludes later forms and rejects wrong variants or explicit later skills',()=>{
 const output='tools/data/barret-path-20261101/form-selection';
 const run=(selection,path)=>spawnSync(process.execPath,['tools/plan_source_imports.mjs','--select',selection,'--current-form','--output',path],{encoding:'utf8'});
 let r=run('barret:*',output);assert.equal(r.status,0,r.stderr);
 const selection=readJson(output+'/selection.json');assert.equal(selection.playableApproval,false);assert.equal(selection.currentFormOnly,true);
 assert.deepEqual(selection.selection.map(s=>s.sourceId),[227870,227871,227872,227873]);assert.equal(selection.excluded.length,3);
 assert.match(selection.selection.find(s=>s.sourceId===227871).intakeBlockers[0],/88:2000311:1:6:40/);
 assert.ok(selection.excluded.every(s=>s.acquisition.status==='later-form'));
 r=run('barret:227874',output+'-rejected');assert.notEqual(r.status,0);assert.match(r.stderr,/Current-form acquisition not confirmed/);
 r=run('barret:236220',output+'-wrong-series');assert.notEqual(r.status,0);assert.match(r.stderr,/Missing or ambiguous owned active skill/);
 r=spawnSync(process.execPath,['tools/plan_source_imports.mjs','--shortlist-catalog','tools/data/source-only-20261028/catalog/inventory.json','--current-form','--output',output+'-series-only'],{encoding:'utf8'});
 assert.notEqual(r.status,0);assert.match(r.stderr,/Current-form filtering requires an exact owned/);
});

test('unresolved spatial dispatch is reported independently of effect resource availability',()=>{
 const report=inspectCharacter(readJson('tools/characters/barret.json'),{assets:'assets',dump:'ffbe_asset_dump-main'});
 const mind=report.catalog.find(s=>s.id===227871);assert.equal(unresolvedEffectAnchors(mind).length,1);
 assert.equal(unresolvedEffectAnchors(mind)[0].groupId,2000311);
 assert.deepEqual(unresolvedEffectAnchors(report.catalog.find(s=>s.id===227870)),[]);
 assert.deepEqual(unresolvedEffectAnchors({effects:[]}),[]);
});
