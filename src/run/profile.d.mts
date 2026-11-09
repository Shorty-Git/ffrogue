import type {RunCatalog,RunState} from './runState.mjs';
export interface Profile{version:1;unlocked:string[];crystals:number;record:{won:number;lost:number};settled:string[];bond:Record<string,number>;}
export const PROFILE_KEY:string;
export const STARTER_HEROES:string[];
export const SUMMON_COST:number;
export const CRYSTALS_PER_BATTLE:number;
export const CRYSTALS_PER_EXPEDITION:number;
export function newProfile(catalog:RunCatalog):Profile;
export function normalizeProfile(input:unknown,catalog:RunCatalog):Profile;
export function lockedHeroes(profile:Profile,catalog:RunCatalog):string[];
export function drawCatalog(profile:Profile,catalog:RunCatalog):RunCatalog;
export function settleRun(profile:Profile,run:RunState,catalog:RunCatalog):{profile:Profile;crystals:number;unlocked:string|null};
export const MAX_BOND:number;export const BOND_DRAW_WEIGHT:number;export const BOND_MIN_START_LEVEL:number;export const BOND_REFUND:number;
export function summonPool(catalog:RunCatalog):{key:string;weight:number}[];
export function summonHero(profile:Profile,catalog:RunCatalog,salt:string):{profile:Profile;unlocked:string|null;hero:string;bond:number;refund:number};
export class ProfileStore{constructor(storage:Storage,catalog:RunCatalog);load():Profile;save(profile:Profile):Profile;}
