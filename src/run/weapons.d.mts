import type {Element} from './elements.mjs';
export interface RunWeapon{id:number;name:string;category:string;rarity:number;attack:number;magic:number;elements:Element[];resist?:Partial<Record<Element,number>>;}
export const WEAPON_STAT_DIVISOR:number;export const WEAPON_BONUS_MAX:number;export const WEAPON_BONUS_PER_RARITY:number;export const WEAPON_TIERS:[number,number][];
export const WEAPON_GLYPHS:Record<string,string>;
export function weaponForRun(row:unknown):RunWeapon;
export function curateWeapons(rows:unknown[]):RunWeapon[];
export function setWeaponData(data:unknown):number;
export function weaponPool():RunWeapon[];
export function weaponsForTier(tier:number):RunWeapon[];
export function validWeapon(w:unknown):boolean;
export function memberPower(member:{stats?:Record<string,number|undefined>;weapon?:RunWeapon}|undefined,stat:'attack'|'magic'|'defense'|'hp'):number;
export function weaponLabel(w:RunWeapon):string;
export function weaponSummary(w:RunWeapon):string;
export const WEAPON_ELEMENT_RULE:string;
