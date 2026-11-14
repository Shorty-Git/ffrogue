// Run events: the non-fight nodes of the act map (loop v2, src/run/actMap.mjs), in the spirit of PokeRogue /
// Slay the Spire. A campfire opens the camp, a Moogle merchant the shop, an event node the crystal shrine and a
// treasure node a chest. Gil is earned per won fight and spent at the merchant. Everything here is seeded by
// hashes of the run seed and the node id (no RNG stream draws), so reward and combat streams stay unchanged and
// a reload can never reroll an event.
import {currentNode,memberMaxMp,seedHash} from './runState.mjs';
import {validWeapon,weaponsForTier} from './weapons.mjs';

/** Gil per won fight, by encounter kind (act bosses pay since loop v2; first guess). */
export const GIL_REWARD={normal:50,elite:120,boss:150};
export const EVENT_KINDS=['camp','merchant','shrine','treasure'];
/** The event a map node opens. */
export const NODE_EVENTS={campfire:'camp',merchant:'merchant',event:'shrine',treasure:'treasure'};
/** Treasure chest: gil between min and max (seeded per node) and a weapon of the act's tier for one hero. */
export const TREASURE_GIL={min:60,max:110};
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

/** Lowest-level upgradable skill of the seed-picked member (camp training, merchant tome). */
/** Seed salt of the current node: events at different nodes never share a seeded outcome. */
const at=run=>run.map.at;
function upgradeTarget(run,salt){
 const members=run.party.filter(m=>m.hp>0&&m.skills.some(s=>s.level<3));
 if(!members.length)return null;
 const m=members[seedHash(run.seed+':'+salt+':'+at(run))%members.length];
 const skill=[...m.skills].filter(s=>s.level<3).sort((a,b)=>a.level-b.level)[0];
 return {member:m.key,skill:skill.id};
}
function merchantWares(run){
 const wares=[];
 const knockedOut=run.party.find(m=>m.hp<=0);
 wares.push({item:'potion',price:PRICES.potion});
 wares.push(knockedOut?{item:'phoenix',member:knockedOut.key,price:PRICES.phoenix}:{item:'ether',price:PRICES.ether});
 const tome=upgradeTarget(run,'tome');if(tome)wares.push({item:'tome',...tome,price:PRICES.tome});
 const armed=run.party[seedHash(run.seed+':merchant-member:'+at(run))%run.party.length];
 const weapons=weaponsForTier(run.map.act+1).filter(w=>w.id!==armed.weapon?.id);
 if(weapons.length){const weapon=weapons[seedHash(run.seed+':merchant-weapon:'+at(run))%weapons.length];
  wares.push({item:'weapon',member:armed.key,weapon:clone(weapon),price:PRICES.weaponPerRarity*weapon.rarity});}
 return wares;
}
function treasure(run){
 const gil=TREASURE_GIL.min+seedHash(run.seed+':treasure-gil:'+at(run))%(TREASURE_GIL.max-TREASURE_GIL.min+1);
 const member=run.party[seedHash(run.seed+':treasure-member:'+at(run))%run.party.length];
 const weapons=weaponsForTier(run.map.act).filter(w=>w.id!==member.weapon?.id);
 const weapon=weapons.length?weapons[seedHash(run.seed+':treasure-weapon:'+at(run))%weapons.length]:null;
 return {gil,...(weapon?{member:member.key,weapon:clone(weapon)}:{})};
}
/** Opens the event of the node the party just entered (called by runState.chooseNode; mutates its clone). */
export function openEvent(run){
 const kind=NODE_EVENTS[currentNode(run)?.type];
 if(!kind)throw Error('No event on this node');
 run.phase='event';
 const event={kind,node:at(run)};
 if(kind==='camp'){const train=upgradeTarget(run,'camp');if(train)event.train=train;}
 if(kind==='merchant'){event.wares=merchantWares(run);event.sold=[];}
 if(kind==='shrine')event.stat=STATS[seedHash(run.seed+':shrine-stat:'+at(run))%STATS.length];
 if(kind==='treasure')event.treasure=treasure(run);
 run.event=event;return run;
}
function heal(run,catalog,hpShare,mpShare){
 for(const m of run.party)if(m.hp>0){const c=catalog[m.key];
  m.hp=Math.min(maxHp(catalog,m),m.hp+Math.round(maxHp(catalog,m)*hpShare));
  m.mp=Math.min(memberMaxMp(c,m),m.mp+Math.round(memberMaxMp(c,m)*mpShare));}
}
function finish(run,detail){run.history.push({kind:'event',node:run.event.node,event:run.event.kind,...detail});delete run.event;run.phase='map';return run;}
/** Applies one event action. camp: 'rest' | 'train'; merchant: 'buy-<i>' (stays) | 'leave';
 * shrine: 'pray' (shows the outcome, stays) | 'leave'; treasure: 'take' (gil and weapon) | 'leave' (gil only). */
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
   const blessed=seedHash(run.seed+':shrine:'+at(run))%1000<SHRINE.chance*1000;
   if(blessed)for(const m of run.party){
    const before=maxHp(catalog,m);m.stats[event.stat]=Math.min(3,Math.round((m.stats[event.stat]+SHRINE.bonus)*100)/100);
    if(event.stat==='hp'&&m.hp>0)m.hp+=maxHp(catalog,m)-before;}
   else for(const m of run.party)if(m.hp>0)m.hp=Math.max(1,m.hp-Math.round(m.hp*SHRINE.curse));
   event.result=blessed?'blessing':'curse';return run;
  }
 }
 if(event.kind==='treasure'&&(action==='take'||action==='leave')){
  const t=event.treasure;run.gil=(run.gil??0)+t.gil;
  if(action==='take'&&t.weapon){const m=run.party.find(p=>p.key===t.member);if(!m||!validWeapon(t.weapon))throw Error('Invalid treasure');m.weapon=clone(t.weapon);}
  return finish(run,{action,gil:t.gil,...(action==='take'&&t.weapon?{member:t.member,weapon:t.weapon.id}:{})});
 }
 throw Error('Unknown event action: '+action);
}
/** Save validation of the event fields (called by validateRun). */
export function validEvent(run){
 if(run.gil!==undefined&&(!Number.isInteger(run.gil)||run.gil<0))return false;
 if(run.phase!=='event')return run.event===undefined;
 const e=run.event;
 if(!e||!EVENT_KINDS.includes(e.kind)||e.node!==run.map?.at||NODE_EVENTS[currentNode(run)?.type]!==e.kind)return false;
 const member=key=>run.party.some(m=>m.key===key);
 if(e.kind==='camp')return e.train===undefined||member(e.train.member);
 if(e.kind==='shrine')return STATS.includes(e.stat)&&(e.result===undefined||['blessing','curse'].includes(e.result));
 if(e.kind==='treasure'){const t=e.treasure;return !!t&&Number.isInteger(t.gil)&&t.gil>=TREASURE_GIL.min&&t.gil<=TREASURE_GIL.max
  &&(t.weapon===undefined||(member(t.member)&&validWeapon(t.weapon)));}
 return Array.isArray(e.wares)&&Array.isArray(e.sold)&&e.sold.every(i=>Number.isInteger(i)&&e.wares[i])
  &&e.wares.every(w=>Number.isInteger(w.price)&&w.price>0&&['potion','ether','phoenix','tome','weapon'].includes(w.item)
   &&(w.member===undefined||member(w.member))&&(w.item!=='weapon'||validWeapon(w.weapon)));
}
