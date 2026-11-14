import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createRun,rollParty,confirmParty,completeBattle,chooseReward,acknowledgeAwakening,validateRun,RunStore,SAVE_KEY,RUN_VERSION} from '../src/run/runState.mjs';
import {runCatalog}from '../src/run/catalog.ts';
import {formForLevel,levelOf,MAX_LEVEL}from '../src/run/unitForms.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function catalog(){const r=read('public/assets/content.json'),content=read('public/assets/run-content.json'),values={content_registry:r,run_content:content},m={};
 for(const k of r.characters){values['character_'+k]=read(`public/assets/units/${k}/character.json`);values['skills_'+k]=read(`public/assets/units/${k}/skills.json`);m[k]=read(`public/assets/units/${k}/manifest.json`);}
 for(const k of r.scenePresentations)values['scene_'+k+'_manifest']=read(`public/assets/presentations/${k}/manifest.json`);for(const f of content.forms)m[f.key]=read('public/'+f.assetPath+'/manifest.json');
 return runCatalog({cache:{json:{get:k=>values[k]}}},m);
}
const c=catalog();
function party(mode){for(let i=0;i<2000;i++){const r=confirmParty(rollParty(createRun('form-path-'+i,c,undefined,mode?{awakeningMode:mode}:undefined),c));if(r.party.some(m=>m.key==='cloud'))return r;}throw Error('Seed');}
function bossReward(r){r.encounter=r.encounter<2?1:3;return completeBattle(r,c,r.party.map(m=>({key:m.key,hp:m.hp,mp:m.mp})),true);}
test('levels 1-6 share one power scale; boss relics raise the level and the body follows original forms',()=>{
 assert.deepEqual([3,4,5,6,7].map(r=>levelOf({rarity:r})),[1,2,3,4,5]);assert.equal(levelOf({rarity:7,rank:'NV'}),6);
 // Cloud (5★ base): Lv 1-3 keep the 5★ body, then 6★, 7★ and NV.
 assert.deepEqual([1,2,3,4,5,6].map(l=>formForLevel(c.cloud,l).form),['cloud','cloud','cloud','cloud_form6','cloud_form7','cloud_nv']);
 // NV-only units keep their NV body at every level.
 assert.equal(formForLevel(c.clive,1).form,'clive');
 let r=party('sequential'),m=r.party.find(m=>m.key==='cloud');
 m.level=3;Object.assign(m,{form:'cloud',unitId:c.cloud.unitId,rarity:c.cloud.rarity});delete m.rank;validateRun(r,c);
 r=bossReward(r);r.offers[0]={type:'evolve',member:'cloud',level:4};r=chooseReward(r,0,c);validateRun(r,c);
 assert.equal(r.pendingAwakening.to.form,'cloud_form6');r=acknowledgeAwakening(r,r.pendingAwakening.id);
 m=r.party.find(m=>m.key==='cloud');assert.equal(m.level,4);assert.equal(m.unitId,'207000106');assert.equal(m.identity,'207000105');
 assert.throws(()=>{const x=bossReward(r);x.offers[0]={type:'evolve',member:'cloud',level:6};chooseReward(x,0,c);},/Unverified evolution/);
});
test('a level without a new body raises power only and needs no awakening presentation',()=>{
 let r=party('sequential'),m=r.party.find(m=>m.key==='cloud');
 m.level=1;Object.assign(m,{form:'cloud',unitId:c.cloud.unitId,rarity:c.cloud.rarity});delete m.rank;
 const hp=m.stats.hp;r=bossReward(r);r.offers[0]={type:'evolve',member:'cloud',level:2};r=chooseReward(r,0,c);
 assert.equal(r.pendingAwakening,undefined);m=r.party.find(m=>m.key==='cloud');assert.equal(m.level,2);assert.equal(m.form,'cloud');assert.ok(m.stats.hp>hp);validateRun(r,c);
});
test('start levels roll one weight table, never below the base rarity level, and are stored once',()=>{
 const rules=read('public/assets/run-rules.json'),keys=['3','4','5','6','7','NV'];
 // The roll's distribution is visible on 3★ base units (base Lv 1); every hero keeps its base floor.
 const counts=[0,0,0,0,0,0];let total=0,floored=0;
 for(let i=0;i<4000;i++){
  const seed='start-level-'+i,legacy=rollParty(createRun(seed,c),c),current=rollParty(createRun(seed,c,undefined,rules),c);
  assert.deepEqual(current.party.map(m=>[m.key,m.skills]),legacy.party.map(m=>[m.key,m.skills]));
  for(const m of legacy.party)assert.equal(m.level,levelOf(c[m.key]));
  for(const m of current.party){
   const character=c[m.key];
   assert.equal(m.form,formForLevel(character,m.level).form);
   assert.equal(m.stats.hp,1+(m.level-1)*rules.originalForms.hpPerRank);
   assert.equal(m.hp,Math.round(character.maxHp*m.stats.hp));
   assert.ok(m.level>=levelOf(character),`${m.key} started below its base level`);
   if(levelOf(character)===1){counts[m.level-1]++;total++;}else floored++;
  }
 }
 assert.ok(total>1000&&floored>1000,`${total} base-Lv1 and ${floored} higher-base heroes drawn`);
 const weights=keys.map(k=>rules.originalForms.weights[k]),sum=weights.reduce((a,b)=>a+b,0);
 counts.forEach((n,i)=>{const p=weights[i]/sum;assert.ok(Math.abs(n/total-p)<Math.max(.01,4*Math.sqrt(p*(1-p)/total)),JSON.stringify(counts));});
 console.log('Start levels Lv1..6 over',total,'heroes:',counts);
});
test('maximum level heroes get other boss rewards; pre-v5 saves are rejected, not upgraded',()=>{
 let r=party('sequential'),m=r.party.find(m=>m.key==='cloud');
 m.level=MAX_LEVEL;const nv=formForLevel(c.cloud,MAX_LEVEL);Object.assign(m,{form:nv.form,unitId:nv.unitId,rarity:nv.rarity,rank:nv.rank});validateRun(r,c);
 const rewards=bossReward(r);assert.ok(rewards.offers.every(o=>o.member!=='cloud'||o.type!=='evolve'));
 const old=JSON.parse(JSON.stringify(party('sequential')));old.version=2;for(const p of old.party)delete p.level;
 let raw=JSON.stringify(old);const store=new RunStore({getItem:k=>k===SAVE_KEY?raw:null,setItem:(_k,v)=>{raw=v;}},c);
 assert.throws(()=>store.load(),/three-hero party/);assert.equal(JSON.parse(raw).version,2);
 assert.equal(new RunStore({getItem:()=>JSON.stringify(rewards),setItem:()=>{}},c).load().version,RUN_VERSION);
});
test('star and NV bodies have complete Source clips; shifted forms and unknown policies stay excluded',()=>{
 assert.equal(c.cloud.forms.at(-1).unitId,'207000117');assert.equal(c.aerith.forms.at(-1).unitId,'207000407');
 assert.equal(c.delita.forms.at(-1).unitId,'253000227');
 assert.ok(!c.cloud.forms.some(f=>f.unitId==='207000127'||f.identity===c.cloud_ac.identity));
 assert.throws(()=>createRun('invalid',c,undefined,{awakeningMode:'guess'}));
 const r=party('highest-reviewed');r.party.find(m=>m.key==='cloud').form='cloud_ac';assert.throws(()=>validateRun(r,c));
});

