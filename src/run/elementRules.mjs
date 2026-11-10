// FFRogue element rules (developer brief 2026-11-10). Data: src/run/elements.mjs (original FFBE
// resistances, exported by tools/export_elements.mjs). The rule is FFRogue's own, not the FFBE formula:
// a resistance of r percent (negative = weakness) scales damage by 1 - r/100, held to
// [ELEMENT_MIN, ELEMENT_MAX]. FFBE "absorb" (r > 100) is a strong resist here, never healing.
// Several elements on one action: the average of their multipliers. Shared by BattleScene and
// tools/simulate_run_balance.mjs.
import {ELEMENTS,ENEMY_ELEMENT_RESIST,ENEMY_SKILL_ELEMENTS,HERO_ELEMENT_RESIST} from './elements.mjs';
export const ELEMENT_MIN=.25;
export const ELEMENT_MAX=2;
export const ELEMENT_LABELS={fire:'Fire',ice:'Ice',lightning:'Lightning',water:'Water',wind:'Wind',earth:'Earth',light:'Light',dark:'Dark'};
/** Small glyphs for tooltips and tags (text only, no icon assets yet). */
export const ELEMENT_GLYPHS={fire:'🔥',ice:'❄',lightning:'⚡',water:'💧',wind:'🌀',earth:'⛰',light:'✦',dark:'☾'};
/** Elements of an FFBE flag string ("1,0,0,0,0,0,0,0", FFBE order); the first '@' branch counts. */
export function parseElementFlags(raw){
 if(typeof raw!=='string'||!raw)return [];
 const flags=raw.split('@')[0].split(',').map(Number);
 return ELEMENTS.filter((_,i)=>flags[i]===1);
}
/** A hero skill's elements from its published original command. */
export function skillElements(skill){
 if(Array.isArray(skill?.elements))return skill.elements.filter(e=>ELEMENTS.includes(e));
 return parseElementFlags(skill?.originalCommand?.raw?.element);
}
export function enemySkillElements(enemyKey,skillId){return skillId?[...(ENEMY_SKILL_ELEMENTS[enemyKey]?.[skillId]??[])]:[];}
const clamp=v=>Math.min(ELEMENT_MAX,Math.max(ELEMENT_MIN,v));
/** Damage multiplier of `elements` against a resistance table (percent). No elements: 1. */
export function elementMultiplier(elements,resist={}){
 const list=(elements??[]).filter(e=>ELEMENTS.includes(e));
 if(!list.length)return 1;
 return list.reduce((sum,e)=>sum+clamp(1-(resist?.[e]??0)/100),0)/list.length;
}
export const enemyElementMultiplier=(enemyKey,elements)=>elementMultiplier(elements,ENEMY_ELEMENT_RESIST[enemyKey]);
export const heroElementMultiplier=(heroKey,elements)=>elementMultiplier(elements,HERO_ELEMENT_RESIST[heroKey]);
/** 'weak' | 'resist' | null for a final multiplier (presentation tag). */
export function elementTag(multiplier){return multiplier>1.001?'weak':multiplier<.999?'resist':null;}
/** Weak / resisted elements of an enemy, sorted by strength (for name plate tooltips and rewards). */
export function enemyAffinities(enemyKey){
 const resist=ENEMY_ELEMENT_RESIST[enemyKey]??{};
 return {weak:ELEMENTS.filter(e=>(resist[e]??0)<0),resist:ELEMENTS.filter(e=>(resist[e]??0)>0)};
}
export function heroAffinities(heroKey){
 const resist=HERO_ELEMENT_RESIST[heroKey]??{};
 return {weak:ELEMENTS.filter(e=>(resist[e]??0)<0),resist:ELEMENTS.filter(e=>(resist[e]??0)>0)};
}
export const elementNames=elements=>(elements??[]).map(e=>ELEMENT_LABELS[e]??e).join(' / ');
/** Elements of a hero's basic attacks (and Barrage repeats): those of the equipped weapon. */
export function heroAttackElements(member){return (member?.weapon?.elements??[]).filter(e=>ELEMENTS.includes(e));}
