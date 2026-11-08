import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createRun,rollParty,confirmParty,RunStore,SAVE_KEY,completeBattle,chooseReward,rewardPool,skillForRun,validateRun,encounters,FULL_AREAS,migrateRun,acknowledgeAwakening}from '../src/run/runState.mjs';
import {runEncounter}from '../src/run/runBalance.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),meta=read('public/assets/run-content.json');
const catalog={};for(const key of read('public/assets/content.json').characters){const s=read(`public/assets/units/${key}/skills.json`).skills.filter(s=>s.scenePresentation&&s.importStatus==='imported');if(!s.length)continue;const d=read(`public/assets/units/${key}/character.json`),m=meta.units[key];catalog[key]={key,name:d.battle.heroName,identity:m.identity,canonicalIdentity:m.canonicalIdentity,unitId:m.unitId,rarity:m.rarity,form:key,maxHp:d.battle.maxHp,maxMp:d.battle.maxMp,skills:s};}
catalog.cloud.evolution={identity:'207000105',form:'cloud_form6',unitId:'207000106',rarity:6};
const initial=seed=>rollParty(createRun(seed,catalog),catalog);
function withCloud(){for(let i=0;i<200;i++){const r=initial('test-'+i);if(r.party.some(m=>m.key==='cloud'))return r;}throw Error('Fixture seed');}
const snapshot=r=>r.party.map(m=>({key:m.key,hp:m.hp,mp:m.mp}));
function memory(){const map=new Map();return{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
test('one free team draw and three full rerolls are deterministic and can each be confirmed',()=>{
 for(let i=0;i<100;i++){
  let a=createRun('seed-'+i,catalog),b=createRun('seed-'+i,catalog);
  for(let draw=0;draw<4;draw++){
   const previous=a;
   a=rollParty(a,catalog);b=rollParty(b,catalog);
   assert.deepEqual(a,b);
   assert.equal(a.rerolls,3-draw);
   assert.equal(a.party.length,3);
   assert.ok(a.party.every(m=>m.skills.length===1&&catalog[m.key].unitId===m.unitId&&catalog[m.key].skills.some(s=>s.id===m.skills[0].id)));
   assert.equal(a.history.at(-1).slot,null);
   assert.notEqual(a.rng.skills,previous.rng.skills);
   const confirmed=confirmParty(a);
   assert.deepEqual(confirmed.party,a.party);
   assert.throws(()=>rollParty(confirmed,catalog),/locked/);
   assert.throws(()=>rollParty(a,catalog,0),/full team/);
  }
  assert.throws(()=>rollParty(a,catalog),/No reroll/);
 }
});
test('persisted results survive reload and stale tabs cannot restore rerolls',()=>{
 const storage=memory(),one=new RunStore(storage,catalog);
 const oldSave=rollParty(initial('persist'),catalog);
 oldSave.history.at(-1).slot=1; // Existing saves can contain single-reel history.
 const r=one.save(oldSave);
 const two=new RunStore(storage,catalog);assert.deepEqual(two.load(),r);const stale=two.load();one.save(rollParty(r,catalog));
 assert.throws(()=>two.save(rollParty(stale,catalog)),/another tab/);assert.equal(new RunStore(storage,catalog).load().rerolls,1);
 const active=confirmParty(one.load());
 one.save(active);
 assert.deepEqual(new RunStore(storage,catalog).load(),active);
 storage.setItem(SAVE_KEY,'{"version":99}');assert.throws(()=>new RunStore(storage,catalog).load());
});
test('reward settlement is one-shot, three saved offers do not reroll, next encounter keeps gains',()=>{
 const r=confirmParty(initial('reward')),pool=completeBattle(r,catalog,snapshot(r),true);assert.equal(pool.offers.length,3);assert.equal(new Set(pool.offers.map(JSON.stringify)).size,3);
 assert.throws(()=>completeBattle(pool,catalog,snapshot(pool),true));const storage=memory(),store=new RunStore(storage,catalog);store.save(pool);assert.deepEqual(new RunStore(storage,catalog).load().offers,pool.offers);
 const offer=rewardPool(pool,catalog).find(o=>o.type==='stat'&&o.stat==='attack');pool.offers[0]=offer;
 const next=chooseReward(pool,0,catalog);assert.equal(next.encounter,1);assert.equal(next.phase,'battle');assert.equal(next.party.find(m=>m.key===offer.member).stats.attack,1.2);assert.throws(()=>chooseReward(next,0,catalog));validateRun(next,catalog);
});
test('full skill slots require an explicit replacement and preserve immutable source definitions',()=>{
 let r=withCloud();r.phase='rewards';const m=r.party.find(m=>m.key==='cloud');m.skills=catalog.cloud.skills.slice(0,3).map(s=>({id:s.id,level:1}));const next=catalog.cloud.skills.find(s=>!m.skills.some(a=>a.id===s.id));
 r.offers=[{type:'learn',member:'cloud',skill:next.id},...rewardPool(r,catalog).filter(o=>o.type==='stat').slice(0,2)];const before=JSON.stringify(r);assert.throws(()=>chooseReward(r,0,catalog));assert.equal(JSON.stringify(r),before);
 const applied=chooseReward(r,0,catalog,m.skills[1].id);assert.equal(applied.party.find(m=>m.key==='cloud').skills.length,3);assert.ok(applied.party.find(m=>m.key==='cloud').skills.some(s=>s.id===next.id));
 const seal=catalog.aerith.skills.find(s=>s.id==='seal_evil'),original=JSON.stringify(seal),member={skills:[{id:seal.id,level:2}],stats:{attack:1.2,magic:1.2}};
 assert.ok(skillForRun(seal,member).supportEvents[0].effects[0].phases>seal.supportEvents[0].effects[0].phases);assert.equal(JSON.stringify(seal),original);
});
test('boss evolution retains identity and skills; fixed party survives all configurable encounters',()=>{
 let r=confirmParty(withCloud());const keys=r.party.map(m=>m.key);r=chooseReward(completeBattle(r,catalog,snapshot(r),true),0,catalog);r=completeBattle(r,catalog,snapshot(r),true);
 const ix=r.offers.findIndex(o=>o.type==='evolve');assert.ok(ix>=0);const old=r.party.find(m=>m.key==='cloud'),skills=structuredClone(old.skills);r=chooseReward(r,ix,catalog);
 const evolved=r.party.find(m=>m.key==='cloud');assert.equal(evolved.unitId,'207000106');assert.equal(evolved.identity,'207000105');assert.deepEqual(evolved.skills,skills);assert.deepEqual(r.party.map(m=>m.key),keys);validateRun(r,catalog);
 r=acknowledgeAwakening(r,r.pendingAwakening.id);
 while(r.phase==='battle'){const p=completeBattle(r,catalog,snapshot(r),true);let at=p.offers.findIndex(o=>o.type!=='learn');r=chooseReward(p,at,catalog);}
 assert.equal(r.phase,'won');assert.equal(r.encounter,4);assert.equal(encounters(FULL_AREAS).length,18);
 const bad=structuredClone(r);bad.party.find(m=>m.key==='cloud').form='cloud_ac';assert.throws(()=>validateRun(bad,catalog));
});
test('loss ends progress and encounter difficulty depends on stage rather than reward strength',()=>{
 const r=confirmParty(initial('loss')),before=runEncounter(r),b=structuredClone(r);b.party[0].stats.attack=2;assert.deepEqual(runEncounter(b),before);
 const lost=completeBattle(r,catalog,snapshot(r).map(m=>({...m,hp:0})),false);assert.equal(lost.phase,'lost');assert.throws(()=>chooseReward(lost,0,catalog));assert.throws(()=>rollParty(lost,catalog));
});

test('awakening commits once before presentation; reload acknowledgement preserves upgrades/RNG and rejects forged notices',()=>{
 let r=confirmParty(withCloud());r.encounter=1;r=completeBattle(r,catalog,snapshot(r),true);
 const before=JSON.stringify(r),ix=r.offers.findIndex(o=>o.type==='evolve');const next=chooseReward(r,ix,catalog),notice=next.pendingAwakening;
 assert.equal(JSON.stringify(r),before);assert.equal(next.party.find(m=>m.key==='cloud').form,'cloud_form6');assert.equal(next.party.find(m=>m.key==='cloud').stats.hp,1.15);
 assert.throws(()=>chooseReward(next,ix,catalog));assert.throws(()=>completeBattle(next,catalog,snapshot(next),true));
 const storage=memory(),store=new RunStore(storage,catalog);store.save(next);const restored=new RunStore(storage,catalog).load();assert.deepEqual(restored,next);
 const settled=acknowledgeAwakening(restored,notice.id);assert.equal(settled.pendingAwakening,undefined);assert.deepEqual(settled.party,next.party);assert.deepEqual(settled.rng,next.rng);assert.deepEqual(settled.history,next.history);validateRun(settled,catalog);
 assert.throws(()=>acknowledgeAwakening(settled,notice.id));const forged=structuredClone(next);forged.pendingAwakening.to.form='cloud_ac';assert.throws(()=>validateRun(forged,catalog));
});

test('canonical character families exclude all unit variants from initial draws and every reroll',()=>{
 for(let i=0;i<1000;i++){let run=initial('canonical-'+i);assert.equal(new Set(run.party.map(m=>m.canonicalIdentity)).size,3);
  for(let draw=0;draw<3;draw++){
   const previous=run.party.map(m=>m.canonicalIdentity).sort();
   run=rollParty(run,catalog);
   assert.notDeepEqual(run.party.map(m=>m.canonicalIdentity).sort(),previous);
   assert.equal(new Set(run.party.map(m=>m.canonicalIdentity)).size,3);
  }
 }
 assert.notEqual(catalog.cloud.identity,catalog.cloud_ac.identity);assert.equal(catalog.cloud.canonicalIdentity,catalog.cloud_ac.canonicalIdentity);
});
test('a three-identity pool can still redraw and has no role restrictions',()=>{
 const keys=['cloud','aerith','jack'],small=Object.fromEntries(keys.map(k=>[k,{...catalog[k],role:'healer'}]));
 const run=rollParty(createRun('three-healers',small),small);assert.equal(run.party.length,3);
 const redrawn=rollParty(run,small);
 assert.deepEqual(redrawn.party.map(m=>m.key).sort(),keys.sort());
 assert.equal(redrawn.rerolls,2);
 assert.throws(()=>createRun('too-small',{cloud:catalog.cloud,cloud_ac:catalog.cloud_ac,aerith:catalog.aerith}),/Three reviewed/);
});
test('old valid saves gain explicit canonical identities without consuming RNG; old duplicate families fail closed',()=>{
 const original=initial('migration'),legacy=structuredClone(original);legacy.version=1;legacy.party.forEach(m=>delete m.canonicalIdentity);
 const migrated=migrateRun(legacy,catalog);assert.deepEqual(migrated,original);assert.equal(legacy.version,1);
 const rewards=completeBattle(confirmParty(original),catalog,snapshot(original),true),oldRewards=structuredClone(rewards);oldRewards.version=1;oldRewards.party.forEach(m=>delete m.canonicalIdentity);assert.deepEqual(migrateRun(oldRewards,catalog),rewards);
 const cloud=withCloud(),bad=structuredClone(cloud);bad.version=1;
 const base=bad.party.find(m=>m.key==='cloud'),other=bad.party.findIndex(m=>m!==base);bad.party[other]={...structuredClone(base),key:'cloud_ac',identity:catalog.cloud_ac.identity,form:'cloud_ac',unitId:catalog.cloud_ac.unitId,rarity:catalog.cloud_ac.rarity,skills:[{id:catalog.cloud_ac.skills[0].id,level:1}]};
 bad.party.forEach(m=>delete m.canonicalIdentity);assert.throws(()=>migrateRun(bad,catalog),/duplicate canonical/);
 const storage=memory();storage.setItem(SAVE_KEY,JSON.stringify(bad));const raw=storage.getItem(SAVE_KEY);assert.throws(()=>new RunStore(storage,catalog).load());assert.equal(storage.getItem(SAVE_KEY),raw);
});

test('obsolete stance fields are discarded from a saved battle without changing its data',()=>{
 const run=confirmParty(withCloud());
 const saved=structuredClone(run);
 saved.stance='ranged';
 saved.party[0].meleeStance=true;
 saved.party[1].rangedStance=true;
 saved.party[2].stanceSwitch='magic';
 const storage=memory();
 storage.setItem(SAVE_KEY,JSON.stringify(saved));
 const store=new RunStore(storage,catalog);
 assert.deepEqual(store.load(),run);
 store.save(run);
 assert.deepEqual(JSON.parse(storage.getItem(SAVE_KEY)),run);
});
