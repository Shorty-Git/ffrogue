import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createRun,rollParty,confirmParty,completeBattle,chooseReward,acknowledgeAwakening,validateRun,RunStore,SAVE_KEY} from '../src/run/runState.mjs';
import {runCatalog}from '../src/run/catalog.ts';
import {nextAwakening,rankValue}from '../src/run/unitForms.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function catalog(){const r=read('public/assets/content.json'),content=read('public/assets/run-content.json'),values={content_registry:r,run_content:content},m={};
 for(const k of r.characters){values['character_'+k]=read(`public/assets/units/${k}/character.json`);values['skills_'+k]=read(`public/assets/units/${k}/skills.json`);m[k]=read(`public/assets/units/${k}/manifest.json`);}
 for(const k of r.scenePresentations)values['scene_'+k+'_manifest']=read(`public/assets/presentations/${k}/manifest.json`);for(const f of content.forms)m[f.key]=read('public/'+f.assetPath+'/manifest.json');
 return runCatalog({cache:{json:{get:k=>values[k]}}},m);
}
const c=catalog();
function party(mode){for(let i=0;i<100;i++){const r=confirmParty(rollParty(createRun('form-path-'+i,c,undefined,mode?{awakeningMode:mode}:undefined),c));if(r.party.some(m=>m.key==='cloud'))return r;}throw Error('Seed');}
function bossReward(r){r.encounter=r.encounter<2?1:3;return completeBattle(r,c,r.party.map(m=>({key:m.key,hp:m.hp,mp:m.mp})),true);}
test('sequential 5/6/7 and prototype 5/7 paths share original forms, retain identity and accept old saves',()=>{
 for(const mode of ['sequential','highest-reviewed']){
  let r=party(mode),m=r.party.find(m=>m.key==='cloud');assert.equal(nextAwakening(r,c.cloud,m).rarity,mode==='sequential'?6:7);
  r=bossReward(r);let at=r.offers.findIndex(o=>o.type==='evolve'&&o.member==='cloud');if(at<0){r.offers[0]={type:'evolve',member:'cloud',form:nextAwakening(r,c.cloud,m).form};at=0;}
  r=chooseReward(r,at,c);validateRun(r,c);r=acknowledgeAwakening(r,r.pendingAwakening.id);m=r.party.find(m=>m.key==='cloud');assert.equal(m.unitId,mode==='sequential'?'207000106':'207000107');assert.equal(m.identity,'207000105');
  if(mode==='sequential'){r=bossReward(r);r.offers[0]={type:'evolve',member:'cloud',form:'cloud_form7'};r=chooseReward(r,0,c);validateRun(r,c);assert.equal(r.pendingAwakening.from.form,'cloud_form6');r=acknowledgeAwakening(r,r.pendingAwakening.id);assert.equal(r.party.find(m=>m.key==='cloud').unitId,'207000107');}
  assert.equal(nextAwakening(r,c.cloud,r.party.find(m=>m.key==='cloud')).form,'cloud_nv');
 }
 const old=party();delete old.rules;validateRun(old,c);assert.equal(nextAwakening(old,c.cloud,old.party.find(m=>m.key==='cloud')).rarity,6);
});
test('star and NV bodies have complete Source clips; shifted forms and unknown policies stay excluded',()=>{
 assert.equal(c.cloud.forms.at(-1).unitId,'207000117');assert.equal(c.aerith.forms.at(-1).unitId,'207000407');
 assert.equal(c.delita.forms.at(-1).unitId,'253000227');
 assert.ok(!c.cloud.forms.some(f=>f.unitId==='207000127'||f.identity===c.cloud_ac.identity));
 assert.throws(()=>createRun('invalid',c,undefined,{awakeningMode:'guess'}));
 const r=party('highest-reviewed');r.party.find(m=>m.key==='cloud').form='cloud_ac';assert.throws(()=>validateRun(r,c));
});

test('start form weights preserve the roster and normalize across available levels',()=>{
 const rules=read('public/assets/run-rules.json');
 const counts=Object.fromEntries(Object.values(c).map(character=>[
  character.key,Object.fromEntries([character,...character.forms].map(form=>[form.rank??form.rarity,0]))
 ]));
 const twoForms={...c,cloud:{...c.cloud,forms:c.cloud.forms.filter(f=>f.rarity===6)}};
 let secondLevel=0,twoFormDraws=0;
 for(let i=0;i<12000;i++){
  const seed='start-form-'+i;
  const legacy=rollParty(createRun(seed,c),c);
  const current=rollParty(createRun(seed,c,undefined,rules),c);
  assert.deepEqual(current.party.map(m=>[m.key,m.skills]),legacy.party.map(m=>[m.key,m.skills]));
  assert.equal(new Set(current.party.map(m=>m.canonicalIdentity)).size,3);
  for(const member of current.party){
   const character=c[member.key],form=[character,...character.forms].find(f=>f.form===member.form);
   const steps=rankValue(form)-character.rarity;
   assert.equal(member.unitId,form.unitId);
   assert.equal(member.stats.hp,1+steps*rules.originalForms.hpPerRank);
   assert.equal(member.hp,Math.round(character.maxHp*member.stats.hp));
   counts[member.key][form.rank??form.rarity]++;
  }
  const cloud=rollParty(createRun(seed,twoForms,undefined,rules),twoForms).party.find(m=>m.key==='cloud');
  if(cloud){twoFormDraws++;secondLevel+=Number(cloud.form==='cloud_form6');assert.notEqual(cloud.form,'cloud_form7');}
 }
 for(const values of Object.values(counts)){
  const total=Object.values(values).reduce((sum,n)=>sum+n,0);
  const ranks=Object.keys(values);
  const weights=rules.originalForms.pathWeights?.[ranks.join('/')]??ranks.map(rank=>rules.originalForms.weights[rank]);
  const weightTotal=weights.reduce((sum,w)=>sum+w,0);
  ranks.forEach((rank,index)=>assert.ok(Math.abs(values[rank]/total-weights[index]/weightTotal)<(rank==='NV'?.008:.025)));
 }
 assert.ok(Math.abs(secondLevel/twoFormDraws-17/97)<.02);
 console.log('Seeded start form totals:',counts,'two-form Cloud:',[twoFormDraws-secondLevel,secondLevel]);
});

test('start form bonuses are stored once and maximum forms have other boss rewards',()=>{
 const rules=read('public/assets/run-rules.json');
 let drawn;
 for(let i=0;i<1000;i++){
  const run=rollParty(createRun('max-start-'+i,c,undefined,rules),c);
  if(run.party.some(m=>m.form==='cloud_nv')){drawn=run;break;}
 }
 assert.ok(drawn);
 const cloud=drawn.party.find(m=>m.key==='cloud');
 assert.equal(cloud.stats.hp,1.15);
 let raw;
 const store=new RunStore({getItem:k=>k===SAVE_KEY?raw??null:null,setItem:(_k,v)=>{raw=v;}},c);
 store.save(drawn);
 assert.deepEqual(store.load(),drawn);
 const rewards=bossReward(confirmParty(store.load()));
 assert.equal(rewards.offers.length,3);
 assert.ok(rewards.offers.every(r=>r.member!=='cloud'||r.type!=='evolve'));
 assert.equal(rewards.party.find(m=>m.key==='cloud').stats.hp,1.15);
 const secondPolicy={...rules,originalForms:{...rules.originalForms,pathWeights:{},weights:{...rules.originalForms.weights,5:1,6:10000,7:1}}};
 const middle=rollParty(createRun(drawn.seed,c,undefined,secondPolicy),c);
 const member=middle.party.find(m=>m.key==='cloud');
 assert.equal(member.form,'cloud_form6');
 assert.equal(nextAwakening(middle,c.cloud,member).form,'cloud_form7');
});

test('same raw rarity NV edge changes rank and applies only the incremental growth',()=>{
 const rules=read('public/assets/run-rules.json');
 const weighted={...rules,originalForms:{...rules.originalForms,pathWeights:{},weights:{...rules.originalForms.weights,5:1,6:1,7:100000,NV:.3}}};
 let run;
 for(let i=0;i<50;i++){
  const candidate=rollParty(createRun('nv-edge-'+i,c,undefined,weighted),c);
  if(candidate.party.some(m=>m.form==='cloud_form7')){run=candidate;break;}
 }
 const before=run.party.find(m=>m.key==='cloud');
 const reward=bossReward(confirmParty(run));
 reward.offers[0]={type:'evolve',member:'cloud',form:'cloud_nv'};
 const next=chooseReward(reward,0,c);
 const upgraded=next.party.find(m=>m.key==='cloud');
 assert.equal(upgraded.rarity,before.rarity);
 assert.equal(upgraded.rank,'NV');
 assert.equal(upgraded.unitId,'207000117');
 assert.equal(upgraded.hp,Math.round(c.cloud.maxHp*1.15));
 assert.equal(upgraded.mp,Math.round(c.cloud.maxMp*1.09));
 assert.deepEqual(validateRun(JSON.parse(JSON.stringify(next)),c),next);
});

test('four draws preserve roster and skill sequences and measure exposure to rarer teams',()=>{
 const current=read('public/assets/run-rules.json');
 const previous={...current,originalForms:{...current.originalForms,pathWeights:{}}};
 const counts={previous:{higher:0,nv:0},current:{higher:0,nv:0}};
 for(let i=0;i<12000;i++){
  const seed='four-draw-balance-'+i;
  let before=createRun(seed,c,undefined,previous),after=createRun(seed,c,undefined,current);
  const seen={previous:{higher:false,nv:false},current:{higher:false,nv:false}};
  for(let draw=0;draw<4;draw++){
   before=rollParty(before,c);after=rollParty(after,c);
   assert.deepEqual(after.party.map(m=>[m.key,m.skills]),before.party.map(m=>[m.key,m.skills]));
   assert.equal(after.rerolls,3-draw);
   for(const [label,run] of [['previous',before],['current',after]]){
    seen[label].higher||=run.party.some(m=>m.form!==c[m.key].form);
    seen[label].nv||=run.party.some(m=>m.rank==='NV');
   }
  }
  for(const label of Object.keys(counts))for(const key of ['higher','nv'])counts[label][key]+=Number(seen[label][key]);
 }
 assert.ok(counts.current.nv>5*counts.previous.nv);
 assert.ok(counts.current.higher>counts.previous.higher);
 console.log('Runs with at least one result across four draws (12000 each):',counts);
});
