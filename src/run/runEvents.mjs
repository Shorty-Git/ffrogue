// Run events (2026-11-14): one stop per area between fights, in the spirit of PokeRogue / Slay the Spire.
// Gil is earned per won fight and spent at the Moogle merchant. Everything here is seeded by hashes of the
// run seed (no RNG stream draws), so reward and combat streams of existing runs stay unchanged and a reload
// can never reroll an event.
import {encounters,memberMaxMp,seedHash} from './runState.mjs';
import {validWeapon,weaponsForTier} from './weapons.mjs';

/** Gil per won fight, by encounter kind. */
export const GIL_REWARD={normal:50,elite:120,boss:0};
export const EVENT_KINDS=['camp','merchant','shrine'];
/** Camp: rest heals this share of max HP and MP of living members. */
export const CAMP_REST=.5;
/** Merchant: potion / ether restore this share of max HP / MP of living members; Phoenix Down revives at 50 %. */
export const MERCHANT_RESTORE=.35;
export const PRICES={potion:60,ether:50,phoenix:100,tome:150,weaponPerRarity:30};
/** Shrine: chance of the blessing, the stat bonus it gives every member, the HP share the curse takes. */
export const SHRINE={chance:.6,bonus:.15,curse:.3};
const STATS=['attack','magic','defense','hp'];
const clone=value=>JSON.parse(JSON.stringify(value));
const maxHp=(catalog,m)=>Math.round(catalog[m.key].maxHp*m.stats.hp);

export const gilFor=kind=>GIL_REWARD[kind]??0;

/** Wave (fight index inside its area) before which the area's event happens: the middle of a seeded area,
 * right before the boss in the final area. */
export function eventWave(area){return area.final?area.normals:Math.max(1,Math.ceil(area.normals/2));}
/** Event kind of an area: seeded areas walk a seeded order of the three kinds; the final area offers a
 * camp or the merchant before the boss (never the shrine's gamble). */
export function eventKindFor(run,areaIndex){
 const order=[...EVENT_KINDS].sort((a,b)=>seedHash(run.seed+':event-order:'+a)-seedHash(run.seed+':event-order:'+b));
 const area=run.areas[areaIndex];
 if(area?.final){const kind=order[areaIndex%order.length];return kind==='shrine'?'camp':kind;}
 return order[areaIndex%order.length];
}
/** The event that waits before the run's current fight, or null. */
export function pendingEventKind(run){
 if(run.phase!=='battle')return null;
 const fight=encounters(run.areas)[run.encounter];
 if(!fight||fight.wave!==eventWave(run.areas[fight.area]))return null;
 if(run.history.some(h=>h?.kind==='event'&&h.encounter===run.encounter))return null;
 return eventKindFor(run,fight.area);
}
/** Lowest-level upgradable skill of the seed-picked member (camp training, merchant tome). */
function upgradeTarget(run,salt){
 const members=run.party.filter(m=>m.hp>0&&m.skills.some(s=>s.level<3));
 if(!members.length)return null;
 const m=members[seedHash(run.seed+':'+salt+':'+run.encounter)%members.length];
 const skill=[...m.skills].filter(s=>s.level<3).sort((a,b)=>a.level-b.level)[0];
 return {member:m.key,skill:skill.id};
}
function merchantWares(run){
 const wares=[],fight=encounters(run.areas)[run.encounter];
 const knockedOut=run.party.find(m=>m.hp<=0);
 wares.push({item:'potion',price:PRICES.potion});
 wares.push(knockedOut?{item:'phoenix',member:knockedOut.key,price:PRICES.phoenix}:{item:'ether',price:PRICES.ether});
 const tome=upgradeTarget(run,'tome');if(tome)wares.push({item:'tome',...tome,price:PRICES.tome});
 const armed=run.party[seedHash(run.seed+':merchant-member:'+run.encounter)%3];
 const weapons=weaponsForTier(fight.area+1).filter(w=>w.id!==armed.weapon?.id);
 if(weapons.length){const weapon=weapons[seedHash(run.seed+':merchant-weapon:'+run.encounter)%weapons.length];
  wares.push({item:'weapon',member:armed.key,weapon:clone(weapon),price:PRICES.weaponPerRarity*weapon.rarity});}
 return wares;
}
/** Enters the event before the current fight if one is due (phase 'battle' -> 'event'); otherwise unchanged. */
export function startEvent(input){
 const kind=pendingEventKind(input);if(!kind)return input;
 const run=clone(input);run.phase='event';
 const event={kind,encounter:run.encounter};
 if(kind==='camp'){const train=upgradeTarget(run,'camp');if(train)event.train=train;}
 if(kind==='merchant'){event.wares=merchantWares(run);event.sold=[];}
 if(kind==='shrine')event.stat=STATS[seedHash(run.seed+':shrine-stat:'+run.encounter)%STATS.length];
 run.event=event;return run;
}
function heal(run,catalog,hpShare,mpShare){
 for(const m of run.party)if(m.hp>0){const c=catalog[m.key];
  m.hp=Math.min(maxHp(catalog,m),m.hp+Math.round(maxHp(catalog,m)*hpShare));
  m.mp=Math.min(memberMaxMp(c,m),m.mp+Math.round(memberMaxMp(c,m)*mpShare));}
}
function finish(run,detail){run.history.push({kind:'event',encounter:run.encounter,event:run.event.kind,...detail});delete run.event;run.phase='battle';return run;}
/** Applies one event action. camp: 'rest' | 'train'; merchant: 'buy-<i>' (stays) | 'leave';
 * shrine: 'pray' (shows the outcome, stays) | 'leave'. */
export function chooseEvent(input,action,catalog){
 const run=clone(input),event=run.event;
 if(run.phase!=='event'||!event)throw Error('No pending event');
 if(event.kind==='camp'){
  if(action==='rest'){heal(run,catalog,CAMP_REST,CAMP_REST);return finish(run,{action});}
  if(action==='train'&&event.train){const m=run.party.find(p=>p.key===event.train.member),s=m?.skills.find(s=>s.id===event.train.skill);
   if(!s||s.level>=3)throw Error('Invalid training');s.level++;return finish(run,{action,...event.train});}
 }
 if(event.kind==='merchant'){
  if(action==='leave')return finish(run,{action,bought:event.sold});
  const index=Number(/^buy-(\d+)$/.exec(action)?.[1]),ware=event.wares[index];
  if(!ware||event.sold.includes(index))throw Error('Not for sale');
  if((run.gil??0)<ware.price)throw Error('Not enough gil');
  const m=ware.member&&run.party.find(p=>p.key===ware.member);
  if(ware.item==='potion')heal(run,catalog,MERCHANT_RESTORE,0);
  else if(ware.item==='ether')heal(run,catalog,0,MERCHANT_RESTORE);
  else if(ware.item==='phoenix'){if(!m||m.hp>0)throw Error('Phoenix Down needs a K.O. member');m.hp=Math.max(1,Math.round(maxHp(catalog,m)*.5));}
  else if(ware.item==='tome'){const s=m?.skills.find(s=>s.id===ware.skill);if(!s||s.level>=3)throw Error('Invalid tome');s.level++;}
  else if(ware.item==='weapon'){if(!m||!validWeapon(ware.weapon))throw Error('Invalid weapon');m.weapon=clone(ware.weapon);}
  else throw Error('Unknown ware');
  run.gil-=ware.price;event.sold.push(index);return run;
 }
 if(event.kind==='shrine'){
  if(action==='leave')return finish(run,{action,...(event.result?{result:event.result}:{})});
  if(action==='pray'&&!event.result){
   const blessed=seedHash(run.seed+':shrine:'+run.encounter)%1000<SHRINE.chance*1000;
   if(blessed)for(const m of run.party){
    const before=maxHp(catalog,m);m.stats[event.stat]=Math.min(3,Math.round((m.stats[event.stat]+SHRINE.bonus)*100)/100);
    if(event.stat==='hp'&&m.hp>0)m.hp+=maxHp(catalog,m)-before;}
   else for(const m of run.party)if(m.hp>0)m.hp=Math.max(1,m.hp-Math.round(m.hp*SHRINE.curse));
   event.result=blessed?'blessing':'curse';return run;
  }
 }
 throw Error('Unknown event action: '+action);
}
/** Save validation of the event fields (called by validateRun). */
export function validEvent(run){
 if(run.gil!==undefined&&(!Number.isInteger(run.gil)||run.gil<0))return false;
 if(run.phase!=='event')return run.event===undefined;
 const e=run.event;
 if(!e||!EVENT_KINDS.includes(e.kind)||e.encounter!==run.encounter)return false;
 const fight=encounters(run.areas)[run.encounter];
 if(!fight||fight.wave!==eventWave(run.areas[fight.area])||eventKindFor(run,fight.area)!==e.kind)return false;
 const member=key=>run.party.some(m=>m.key===key);
 if(e.kind==='camp')return e.train===undefined||member(e.train.member);
 if(e.kind==='shrine')return STATS.includes(e.stat)&&(e.result===undefined||['blessing','curse'].includes(e.result));
 return Array.isArray(e.wares)&&Array.isArray(e.sold)&&e.sold.every(i=>Number.isInteger(i)&&e.wares[i])
  &&e.wares.every(w=>Number.isInteger(w.price)&&w.price>0&&['potion','ether','phoenix','tome','weapon'].includes(w.item)
   &&(w.member===undefined||member(w.member))&&(w.item!=='weapon'||validWeapon(w.weapon)));
}
