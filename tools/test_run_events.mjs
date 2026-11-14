import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createRun,rollParty,confirmParty,completeBattle,validateRun,courseAreas,RunStore,currentNode,mapOptions}from '../src/run/runState.mjs';
import {chooseEvent,GIL_REWARD,PRICES,EVENT_KINDS,NODE_EVENTS,TREASURE_GIL}from '../src/run/runEvents.mjs';
import {step,win,settleEvent,toFight,playThrough}from './run_walk.mjs';
import {setWeaponData}from '../src/run/weapons.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),meta=read('public/assets/run-content.json');
setWeaponData(read('public/assets/items/weapons.json'));
const catalog={};for(const key of read('public/assets/content.json').characters){const s=read(`public/assets/units/${key}/skills.json`).skills.filter(s=>s.scenePresentation&&s.importStatus==='imported');if(!s.length)continue;const d=read(`public/assets/units/${key}/character.json`),m=meta.units[key];catalog[key]={key,name:d.battle.heroName,identity:m.identity,canonicalIdentity:m.canonicalIdentity,unitId:m.unitId,rarity:m.rarity,form:key,maxHp:d.battle.maxHp,maxMp:d.battle.maxMp,skills:s};}
const snapshot=r=>r.party.map(m=>({key:m.key,hp:m.hp,mp:m.mp}));
const start=seed=>confirmParty(rollParty(createRun(seed,catalog,courseAreas(seed)),catalog));
const NODE_OF=Object.fromEntries(Object.entries(NODE_EVENTS).map(([node,kind])=>[kind,node]));
/** Walks a run towards the given event kind (its node type preferred) until it opens; null if the run ends. */
function toEvent(run,kind){
 for(let guard=0;guard<120;guard++){
  if(run.phase==='event'){if(run.event.kind===kind)return run;run=settleEvent(run,catalog);continue;}
  if(run.phase==='battle'){run=win(run,catalog);continue;}
  if(run.phase!=='map')return null;
  run=step(run,[NODE_OF[kind],'treasure','event','merchant','campfire','battle','elite','boss']);
 }
 return null;
}
test('every non-fight node opens its event; the save validates at every stop and the map follows',()=>{
 const seen=new Set();
 for(let i=0;i<12;i++){
  const states=playThrough(start('events-'+i),catalog,['event','merchant','treasure','campfire','battle','elite','boss']);
  for(const r of states.filter(r=>r.phase==='event')){
   const node=currentNode(r);assert.equal(r.event.kind,NODE_EVENTS[node.type]);assert.equal(r.event.node,node.id);
   assert.ok(EVENT_KINDS.includes(r.event.kind));seen.add(r.event.kind);validateRun(r,catalog);
   const left=settleEvent(r,catalog);assert.equal(left.phase,'map');assert.equal(left.history.at(-1).node,node.id);assert.ok(mapOptions(left).length>=1);
  }
 }
 assert.deepEqual([...seen].sort(),[...EVENT_KINDS].sort());
});
test('won fights pay gil by encounter kind; lost fights pay nothing',()=>{
 const run=toFight(start('gil'),catalog,['battle']);
 const won=completeBattle(run,catalog,snapshot(run),true);assert.equal(won.gil,GIL_REWARD.normal);
 const boss=toFight(start('gil-boss'),catalog,['boss']),before=boss.gil??0;assert.equal(completeBattle(boss,catalog,snapshot(boss),true).gil,before+GIL_REWARD.boss);
 assert.equal(completeBattle(run,catalog,snapshot(run),false).gil,undefined);
});
function eventOf(kind){for(let i=0;i<200;i++){const r=toEvent(start(kind+'-'+i),kind);if(r)return r;}throw Error('Fixture for '+kind);}
test('camp: rest heals living members, training raises the named skill',()=>{
 const run=eventOf('camp');
 const hurt=structuredClone(run);hurt.party.forEach(m=>{m.hp=1;m.mp=0;});
 const rested=chooseEvent(hurt,'rest',catalog);
 rested.party.forEach(m=>assert.ok(m.hp>1&&m.mp>0));
 if(run.event.train){const t=run.event.train,before=run.party.find(m=>m.key===t.member).skills.find(s=>s.id===t.skill).level;
  const trained=chooseEvent(run,'train',catalog);assert.equal(trained.party.find(m=>m.key===t.member).skills.find(s=>s.id===t.skill).level,before+1);
  assert.equal(trained.history.at(-1).kind,'event');}
 assert.throws(()=>chooseEvent(run,'pray',catalog),/Unknown event action/);
});
test('merchant: wares cost gil, sell once, and the shop stays open until leaving',()=>{
 const run=eventOf('merchant');
 const potion=run.event.wares.findIndex(w=>w.item==='potion');
 const poor={...structuredClone(run),gil:0};assert.throws(()=>chooseEvent(poor,'buy-'+potion,catalog),/Not enough gil/);
 const rich={...structuredClone(run),gil:1000};
 const bought=chooseEvent(rich,'buy-'+potion,catalog);
 assert.equal(bought.gil,1000-PRICES.potion);assert.equal(bought.phase,'event');assert.deepEqual(bought.event.sold,[potion]);
 assert.throws(()=>chooseEvent(bought,'buy-'+potion,catalog),/Not for sale/);
 validateRun(bought,catalog);
 const weapon=run.event.wares.findIndex(w=>w.item==='weapon');
 if(weapon>=0){const armed=chooseEvent(rich,'buy-'+weapon,catalog),w=run.event.wares[weapon];
  assert.equal(armed.party.find(m=>m.key===w.member).weapon.id,w.weapon.id);}
 const left=chooseEvent(bought,'leave',catalog);assert.equal(left.phase,'map');assert.equal(left.event,undefined);
});
test('shrine: the outcome is fixed by the seed, shown, then the party moves on',()=>{
 const results=new Set();
 for(let i=0;i<200&&results.size<2;i++){const r=toEvent(start('shrine-'+i),'shrine');if(!r)continue;
  const prayed=chooseEvent(r,'pray',catalog);assert.deepEqual(chooseEvent(r,'pray',catalog),prayed);
  assert.equal(prayed.phase,'event');results.add(prayed.event.result);
  if(prayed.event.result==='blessing')prayed.party.forEach((m,j)=>assert.ok(m.stats[r.event.stat]>r.party[j].stats[r.event.stat]||r.party[j].stats[r.event.stat]>=3));
  else prayed.party.forEach((m,j)=>assert.ok(m.hp<=r.party[j].hp&&(r.party[j].hp<=0||m.hp>=1)));
  assert.throws(()=>chooseEvent(prayed,'pray',catalog),/Unknown event action/);
  validateRun(prayed,catalog);
  assert.equal(chooseEvent(prayed,'leave',catalog).history.at(-1).result,prayed.event.result);}
 assert.deepEqual([...results].sort(),['blessing','curse']);
});
test('event saves round-trip and tampered events are rejected',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const run=eventOf('merchant'),store=new RunStore(storage,catalog);store.save(run);
 assert.deepEqual(new RunStore(storage,catalog).load(),run);
 assert.throws(()=>validateRun({...structuredClone(run),event:{...run.event,kind:'camp'}},catalog),/event/);
 assert.throws(()=>validateRun({...structuredClone(run),gil:-5},catalog),/event/);
 const stray=structuredClone(run);stray.phase='battle';assert.throws(()=>validateRun(stray,catalog),/Invalid or incompatible/,'a fight phase on an event node');
 const loose=structuredClone(run);loose.phase='map';assert.throws(()=>validateRun(loose,catalog),/event/,'an open event outside the event phase');
});
test('treasure: the chest pays its gil either way, the weapon only when taken',()=>{
 const run=eventOf('treasure'),t=run.event.treasure,gil=run.gil??0;
 assert.ok(t.gil>=TREASURE_GIL.min&&t.gil<=TREASURE_GIL.max);
 const left=chooseEvent(run,'leave',catalog);assert.equal(left.gil,gil+t.gil);assert.equal(left.phase,'map');
 if(t.weapon){const taken=chooseEvent(run,'take',catalog);assert.equal(taken.gil,gil+t.gil);assert.equal(taken.party.find(m=>m.key===t.member).weapon.id,t.weapon.id);
  assert.deepEqual(left.party,run.party,'leaving keeps the old weapons');}
 assert.throws(()=>chooseEvent(run,'rest',catalog),/Unknown event action/);
 const forged=structuredClone(run);forged.event.treasure.gil=9999;assert.throws(()=>validateRun(forged,catalog),/event/);
});
test('events at different nodes of one run are seeded per node, never per fight count',()=>{
 const run=eventOf('merchant');
 assert.equal(run.event.node,run.map.at);
 const other=toEvent(settleEvent(run,catalog),'merchant');
 if(other)assert.notEqual(other.event.node,run.event.node);
});
