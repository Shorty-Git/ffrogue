import type {RunCatalog,RunState,AreaConfig,EncounterKind} from './runState.mjs';
import type {RunWeapon} from './weapons.mjs';
export type EventKind='camp'|'merchant'|'shrine';
export type RunStat='attack'|'magic'|'defense'|'hp';
export interface MerchantWare{item:'potion'|'ether'|'phoenix'|'tome'|'weapon';price:number;member?:string;skill?:string;weapon?:RunWeapon;}
export interface RunEvent{kind:EventKind;encounter:number;
  /** camp: the skill training would raise. */train?:{member:string;skill:string};
  /** merchant: wares and the indices already bought. */wares?:MerchantWare[];sold?:number[];
  /** shrine: the stat a blessing raises, and the outcome once prayed. */stat?:RunStat;result?:'blessing'|'curse';}
export const GIL_REWARD:Record<EncounterKind,number>;
export const EVENT_KINDS:EventKind[];
export const CAMP_REST:number;
export const MERCHANT_RESTORE:number;
export const PRICES:{potion:number;ether:number;phoenix:number;tome:number;weaponPerRarity:number};
export const SHRINE:{chance:number;bonus:number;curse:number};
export function gilFor(kind:EncounterKind):number;
export function eventWave(area:AreaConfig):number;
export function eventKindFor(run:RunState,areaIndex:number):EventKind;
export function pendingEventKind(run:RunState):EventKind|null;
export function startEvent(run:RunState):RunState;
export function chooseEvent(run:RunState,action:string,catalog:RunCatalog):RunState;
export function validEvent(run:RunState):boolean;
