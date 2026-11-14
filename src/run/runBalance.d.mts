import type {RunState} from './runState.mjs';
import type {EncounterModifier} from './encounterRules.mjs';
export const RUN_BALANCE:{normalHp:number;eliteHp:number;bossHp:number;damage:number};
export function eliteEnemyKey(run:RunState,node:string,stage:import('./stageContent.mjs').StageDefinition):string;
export function runEncounter(run:RunState):{arena:'forest'|'reactor'|'reactor_05';title:string;theme:string;stageId:string;rewardCategory:string;boss:boolean;kind?:import('./runState.mjs').EncounterKind;
 /** Elite affix (src/run/encounterRules.mjs). */affix?:EncounterModifier;/** Boss rule (src/run/encounterRules.mjs). */rule?:EncounterModifier;
 enemies:{slot:'center'|'top'|'bottom';hp:number;key:string;nameTag:string;isBoss:boolean}[];damage:number};
