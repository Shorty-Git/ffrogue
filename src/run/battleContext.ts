import type {RunState,RunCatalog} from './runState.mjs';
import type {UnitActor} from '../entities/UnitActor';
import type {UiSound} from '../audio/battleMusic';
import type {CombatCue} from '../audio/combatCues';
import type {runEncounter} from './runBalance.mjs';
import type {BattleArenaKey} from '../data/battleArenas';
/** Stage encounters use run areas; training fixtures may use any registered arena. */
export type RunEncounter=Omit<ReturnType<typeof runEncounter>,'arena'>&{arena:BattleArenaKey};
export interface RunBattleContext{
 state:RunState;catalog:RunCatalog;
 settle:(actors:UnitActor[],won:boolean)=>void;
 menu:()=>void;party:()=>void;rewardsReady:()=>void;
 uiSound?:(event:UiSound)=>void;
 combatSound?:(cue:CombatCue,authored:boolean)=>void;
 stopCombatSounds?:()=>void;
 entryReady?:(error?:Error)=>void;
 /** Review fixtures supply a fixed encounter; normal runs derive it from state. */
 encounter?:RunEncounter;
 /** Overrides run-rules body sampling; frozen review references were recorded with nearest. */
 bodyTextureFilter?:'linear'|'nearest';
}
