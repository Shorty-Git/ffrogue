import type {ActiveHeroBuff,HeroStatusEffect,HeroDebuffEffect} from '../types/skills';
export const DEBUFF_KINDS:string[];
export function applyHeroBuffs(current:ActiveHeroBuff[]|undefined,effects:(HeroStatusEffect|HeroDebuffEffect)[],round:number):ActiveHeroBuff[];
export function heroPhysicalMultiplier(current:ActiveHeroBuff[]|undefined,round:number):number;
export function heroMagicMultiplier(current:ActiveHeroBuff[]|undefined,round:number):number;
export function heroDamageTakenMultiplier(current:ActiveHeroBuff[]|undefined,round:number,damageType:'physical'|'magical'):number;
export function isHeroBlind(current:ActiveHeroBuff[]|undefined,round:number):boolean;
export function cleanseHeroDebuffs(current:ActiveHeroBuff[]|undefined):ActiveHeroBuff[];
export function consumeAutoRevive(current:ActiveHeroBuff[]|undefined,round:number):{hpFraction:number;buffs:ActiveHeroBuff[]}|null;
