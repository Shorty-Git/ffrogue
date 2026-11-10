// Weapons as run rewards (cloud night 2026-11-10). Data: public/assets/items/weapons.json (984 original
// FFBE weapons, tools/export_weapons.mjs). FFRogue rule, not FFBE equipment: one slot per hero; the
// original ATK/MAG become a bounded additive bonus on the hero's attack/magic multipliers, and the
// weapon's elements apply to basic attacks, Barrage repeats and physical skills without an own element.
// The equipped weapon is stored whole in the run save, so battles never need the catalogue.
import {ELEMENTS} from './elements.mjs';
export const WEAPON_STAT_DIVISOR=600;
export const WEAPON_BONUS_MAX=.25;
/** Rarity sets the tier: the bonus is also held to WEAPON_BONUS_PER_RARITY x rarity (3★ +9 %, 7★ +21 %). */
export const WEAPON_BONUS_PER_RARITY=.03;
/** Rarity window per area index (run tier); later areas offer rarer weapons. */
export const WEAPON_TIERS=[[3,4],[4,6],[5,7]];
export const WEAPON_GLYPHS={dagger:'🗡',sword:'⚔','great sword':'⚔',katana:'⚔',axe:'🪓',hammer:'🔨',mace:'🔨',spear:'🔱',fist:'✊',rod:'✦',staff:'✦',bow:'🏹',gun:'✷',whip:'〰',throwing:'✴',harp:'♪'};
const bonus=(v,rarity)=>Math.min(WEAPON_BONUS_MAX,Math.round(WEAPON_BONUS_PER_RARITY*rarity*100)/100,Math.round(Math.max(0,v??0)/WEAPON_STAT_DIVISOR*100)/100);
/** Run-save form of an original weapon row. */
export function weaponForRun(row){
 const resist={};for(const [e,v] of Object.entries(row.resist??{}))if(ELEMENTS.includes(e)&&Number.isFinite(v)&&v!==0)resist[e]=Math.max(-100,Math.min(100,v));
 return {id:row.id,name:row.name,category:row.category,rarity:row.rarity,attack:bonus(row.stats?.atk,row.rarity),magic:bonus(row.stats?.mag,row.rarity),
  elements:(row.elements??[]).filter(e=>ELEMENTS.includes(e)),...(Object.keys(resist).length?{resist}:{})};
}
/** Curated pool: per category and rarity 3-7 the strongest weapon without element, plus per element and
 * rarity the strongest elemental weapon (~120 of 984). Deterministic; ties keep the lower id. */
export function curateWeapons(rows){
 const best=new Map();
 for(const row of rows){
  if(!(row.rarity>=3&&row.rarity<=7)||!((row.stats?.atk??0)+(row.stats?.mag??0)>0))continue;
  const keys=row.elements?.length?row.elements.map(e=>'el:'+e+':'+row.rarity):['cat:'+row.category+':'+row.rarity];
  const power=(row.stats.atk??0)+(row.stats.mag??0);
  for(const key of keys){const prev=best.get(key);if(!prev||power>prev.power||power===prev.power&&row.id<prev.row.id)best.set(key,{row,power});}
 }
 const unique=new Map();for(const {row} of best.values())unique.set(row.id,row);
 return [...unique.values()].sort((a,b)=>a.id-b.id).map(weaponForRun);
}
let pool=[];
/** Called once with the parsed weapons.json (PreloadScene, simulator, tests). */
export function setWeaponData(data){pool=curateWeapons(data?.weapons??[]);return pool.length;}
export const weaponPool=()=>pool;
export function weaponsForTier(tier){const [min,max]=WEAPON_TIERS[Math.min(WEAPON_TIERS.length-1,Math.max(0,tier))];return pool.filter(w=>w.rarity>=min&&w.rarity<=max);}
export function validWeapon(w){
 return !!w&&Number.isInteger(w.id)&&typeof w.name==='string'&&typeof w.category==='string'&&Number.isInteger(w.rarity)&&w.rarity>=1&&w.rarity<=8
  &&[w.attack,w.magic].every(v=>Number.isFinite(v)&&v>=0&&v<=WEAPON_BONUS_MAX)&&Array.isArray(w.elements)&&w.elements.every(e=>ELEMENTS.includes(e))
  &&(w.resist===undefined||Object.entries(w.resist).every(([e,v])=>ELEMENTS.includes(e)&&Number.isFinite(v)));
}
/** Hero multipliers with the weapon: run stats plus the weapon's bounded bonus. */
export function memberPower(member,stat){return (member?.stats?.[stat]??1)+(stat==='attack'||stat==='magic'?member?.weapon?.[stat]??0:0);}
/** Long form for tooltips. */
export const WEAPON_ELEMENT_RULE='A weapon element applies to basic attacks, Barrage repeats and physical skills without an own element.';
export function weaponLabel(w){return `${w.name} (${w.category}, ${'★'.repeat(w.rarity)})`;}
export function weaponSummary(w){
 const parts=[];if(w.attack)parts.push(`+${Math.round(w.attack*100)}% attack`);if(w.magic)parts.push(`+${Math.round(w.magic*100)}% magic`);
 if(w.elements.length)parts.push(`${w.elements.map(e=>e[0].toUpperCase()+e.slice(1)).join('/')} attacks`);
 if(w.resist)parts.push('resists '+Object.entries(w.resist).map(([e,v])=>`${e} ${v}%`).join(', '));
 return parts.join(' · ');
}
