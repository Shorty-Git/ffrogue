import type {RunState} from './runState.mjs';
export const RUN_BALANCE:{normalHp:number;bossHp:number;bossHpPerArea:number;damage:number;damagePerEncounter:number};
export function runEncounter(run:RunState):{arena:'forest'|'reactor'|'reactor_05';title:string;theme:string;stageId:string;rewardCategory:string;boss:boolean;kind?:import('./runState.mjs').EncounterKind;enemies:{slot:'center'|'top'|'bottom';hp:number;key:string;nameTag:string;isBoss:boolean}[];damage:number};
