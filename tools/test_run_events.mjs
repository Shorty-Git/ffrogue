import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createRun,rollParty,confirmParty,completeBattle,chooseReward,encounters,validateRun,courseAreas,RunStore}from '../src/run/runState.mjs';
import {startEvent,chooseEvent,eventWave,eventKindFor,pendingEventKind,GIL_REWARD,PRICES,EVENT_KINDS}from '../src/run/runEvents.mjs';
import {setWeaponData}from '../src/run/weapons.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),meta=read('public/assets/run-content.json');
setWeaponData(read('public/assets/items/weapons.json'));
const catalog={};for(const key of read('public/assets/content.json').characters){const s=read(`public/assets/units/${key}/skills.json`).skills.filter(s=>s.scenePresentation&&s.importStatus==='imported');if(!s.length)continue;const d=read(`public/assets/units/${key}/character.json`),m=meta.units[key];catalog[key]={key,name:d.battle.heroName,identity:m.identity,canonicalIdentity:m.canonicalIdentity,unitId:m.unitId,rarity:m.rarity,form:key,maxHp:d.battle.maxHp,maxMp:d.battle.maxMp,skills:s};}
const snapshot=r=>r.party.map(m=>({key:m.key,hp:m.hp,mp:m.mp}));
const start=seed=>confirmParty(rollParty(createRun(seed,catalog,courseAreas(seed)),catalog));
/** Wins fights (always the first reward) until an event opens or the run ends. */
function toEvent(run){
 for(let guard=0;guard<40;guard++){
  if(run.phase==='event'||run.phase==='won')return run;
  run=completeBattle(run,catalog,snapshot(run),true);
  run=startEvent(chooseReward(run,run.offers.findIndex(r=>r.type!=='learn'||run.party.find(m=>m.key===r.member).skills.length<3),catalog));
  if(run.pendingAwakening)delete run.pendingAwakening;
 }
 throw Error('No event reached');
}
test('every area holds one event at its event wave; kinds are seeded and the final one is no shrine',()=>{
 for(let i=0;i<30;i++){
  const run=start('events-'+i),seen=[];
  let r=run;
  while(r.phase!=='won'){
   r=toEvent(r);if(r.phase==='won')break;
   const fight=encounters(r.areas)[r.encounter];
   assert.equal(fight.wave,eventWave(r.areas[fight.area]));
   assert.equal(r.event.kind,eventKindFor(r,fight.area));
   seen.push({area:fight.area,kind:r.event.kind});
   validateRun(r,catalog);
   r=chooseEvent(r,r.event.kind==='camp'?'rest':'leave',catalog);
   assert.equal(r.phase,'battle');assert.equal(pendingEventKind(r),null);assert.deepEqual(startEvent(r),r);
  }
  assert.deepEqual(seen.map(s=>s.area),r.areas.map((_,i)=>i));
  assert.notEqual(seen.at(-1).kind,'shrine');
  assert.equal(new Set(seen.slice(0,2).map(s=>s.kind)).size,2);
  assert.ok(seen.every(s=>EVENT_KINDS.includes(s.kind)));
 }
});
test('won fights pay gil by encounter kind; lost fights pay nothing',()=>{
 const run=start('gil');
 const won=completeBattle(run,catalog,snapshot(run),true);assert.equal(won.gil,GIL_REWARD.normal);
 assert.equal(completeBattle(run,catalog,snapshot(run),false).gil,undefined);
});
function eventOf(kind){for(let i=0;i<200;i++){const r=toEvent(start(kind+'-'+i));if(r.event?.kind===kind)return r;}throw Error('Fixture for '+kind);}
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
 const left=chooseEvent(bought,'leave',catalog);assert.equal(left.phase,'battle');assert.equal(left.event,undefined);
});
test('shrine: the outcome is fixed by the seed, shown, then the party moves on',()=>{
 const results=new Set();
 for(let i=0;i<200&&results.size<2;i++){let r;try{r=toEvent(start('shrine-'+i));}catch{continue;}if(r.event?.kind!=='shrine')continue;
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
 const stray=structuredClone(run);stray.phase='battle';assert.throws(()=>validateRun(stray,catalog),/event/);
});
