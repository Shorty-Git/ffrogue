export interface EnemyAction{kind:'attack'|'prepare';name:string;multiplier:number;scope?:'single'|'party';next?:string;phase:string;
 /** Original monster skill: published scene key and reviewed damage split over source hit frames. */
 presentation?:string;damageEvents?:{frame:number;weight:number}[];origin?:'source'|'ffrogue';
 /** Original damage process of an imported skill (1 physical, 15 magical); FFRogue actions are physical. */
 damageType?:'physical'|'magical';
 /** Pattern step that plays this imported original skill (src/run/enemySkills.mjs) when present. */
 skill?:string;}
export interface EnemyDefinition{key:string;name:string;spriteId:string;monsterId:string;dictionaryId:number;scale:number;
 attack:{clip:string;impactFrame:number;movement:'stationary'|'approach'};audio:unknown[];
 behavior?:{phaseAt:number;phaseName:string;phaseMultiplier:number;pattern:Omit<EnemyAction,'phase'>[]};}
export interface StageDefinition{id:string;name:string;theme:string;arena:string;source:{battleBgId:number;file:string;worldIdentity:string};enemyPool:string[];formations:('center'|'top'|'bottom')[][];bossId:string;difficulty:number;rewardCategory:string;normalFights:number;audio:{musicResourceId:number|null;musicAssignment?:string;musicSeries?:string;bossMusicResourceId?:number;soundCues:unknown[]};}
export const ENEMY_CONTENT:Record<string,EnemyDefinition>;
export const STAGE_CONTENT:Record<string,StageDefinition>;
export function stageForArea(area:{stageId?:string;arena:string}):StageDefinition;
export function enemyAction(definition:EnemyDefinition,cursor:number,hpRatio:number):EnemyAction;
