import type {ActiveHeroBuff,HeroStatusEffect} from '../types/skills';
export function applyHeroBuffs(current:ActiveHeroBuff[]|undefined,effects:HeroStatusEffect[],round:number):ActiveHeroBuff[];
export function heroPhysicalMultiplier(current:ActiveHeroBuff[]|undefined,round:number):number;
export function consumeAutoRevive(current:ActiveHeroBuff[]|undefined,round:number):{hpFraction:number;buffs:ActiveHeroBuff[]}|null;
