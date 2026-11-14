import type {RunCatalog,RunState,EncounterKind} from './runState.mjs';
import type {RunWeapon} from './weapons.mjs';
import type {NodeType} from './actMap.mjs';
export type EventKind='camp'|'merchant'|'shrine'|'treasure';
export type RunStat='attack'|'magic'|'defense'|'hp';
export interface MerchantWare{item:'potion'|'ether'|'phoenix'|'tome'|'weapon';price:number;member?:string;skill?:string;weapon?:RunWeapon;}
export interface RunEvent{kind:EventKind;
  /** The map node that opened the event. */node:string;
  /** camp: the skill training would raise. */train?:{member:string;skill:string};
  /** merchant: wares and the indices already bought. */wares?:MerchantWare[];sold?:number[];
  /** shrine: the stat a blessing raises, and the outcome once prayed. */stat?:RunStat;result?:'blessing'|'curse';
  /** treasure: the chest's gil and an optional weapon for one hero. */treasure?:{gil:number;member?:string;weapon?:RunWeapon};}
export const GIL_REWARD:Record<EncounterKind,number>;
export const EVENT_KINDS:EventKind[];
export const NODE_EVENTS:Partial<Record<NodeType,EventKind>>;
export const TREASURE_GIL:{min:number;max:number};
export const CAMP_REST:number;
export const MERCHANT_RESTORE:number;
export const PRICES:{potion:number;ether:number;phoenix:number;tome:number;weaponPerRarity:number};
export const SHRINE:{chance:number;bonus:number;curse:number};
export function gilFor(kind:EncounterKind):number;
export function openEvent(run:RunState):RunState;
export function chooseEvent(run:RunState,action:string,catalog:RunCatalog):RunState;
export function validEvent(run:RunState):boolean;
