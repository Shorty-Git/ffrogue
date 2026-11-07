import type {ActiveHeroBuff,HeroBuffEffect} from '../types/skills';
export function applyHeroBuffs(current:ActiveHeroBuff[]|undefined,effects:HeroBuffEffect[],round:number):ActiveHeroBuff[];
export function heroPhysicalMultiplier(current:ActiveHeroBuff[]|undefined,round:number):number;
