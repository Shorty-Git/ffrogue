import type {SkillConfig} from '../types/skills';
export interface RunForm{form:string;unitId:string;rarity:number;rank?:'NV';identity:string;awakensFrom?:string;}
export interface RunCharacter extends RunForm{canonicalIdentity:string;key:string;name:string;variantLabel?:string;maxHp:number;maxMp:number;skills:SkillConfig[];
  /** The form's Limit Burst (skill type LIMIT); used through the LB gauge, never offered as a skill. */
  limitBurst?:SkillConfig;portrait:string;evolution?:RunForm;
  /** Bond perks from profile.mjs drawCatalog (draw-time only). */bond?:number;drawWeight?:number;startSkillChoice?:boolean;minStartLevel?:number;forms?:RunForm[];magicAvailable?:boolean;}
export type RunCatalog=Record<string,RunCharacter>;
export interface RunMember extends RunForm{canonicalIdentity:string;key:string;
  /** FFRogue level 1–6 (unitForms.mjs MAX_LEVEL); the form is the body for it. */level:number;skills:{id:string;level:number}[];stats:{attack:number;magic:number;defense:number;hp:number;mp?:number};hp:number;mp:number;
  /** Limit gauge carried from the previous battle (1–100); absent when empty. */limit?:number;
  /** Equipped weapon (src/run/weapons.mjs), stored whole. */weapon?:import('./weapons.mjs').RunWeapon;}
export interface AreaConfig{stageId?:string;name:string;arena:string;normals:number;}
export interface Reward{type:'learn'|'skill'|'stat'|'evolve'|'rest'|'revive'|'ward'|'weapon';
  /** weapon: the offered weapon. */weapon?:import('./weapons.mjs').RunWeapon;
  /** ward: the element the party relic protects against. */element?:import('./elements.mjs').Element;member?:string;skill?:string;stat?:'attack'|'magic'|'defense'|'hp';form?:string;level?:number;}
export interface AwakeningNotice{id:string;member:string;encounter:number;from:{form:string;unitId:string;rarity:number};to:{form:string;unitId:string;rarity:number};}
export interface FormPolicy{weights:Record<string,number>;pathWeights?:Record<string,number[]>;hpPerRank:number;mpPerRank:number;powerPerRank:number;defensePerRank:number;}
export interface RunRules{awakeningMode:'sequential'|'highest-reviewed';originalForms?:FormPolicy;}
export interface RunState{version:number;seed:string;phase:'setup'|'battle'|'rewards'|'won'|'lost';party:RunMember[];rerolls:number;encounter:number;offers:Reward[];history:unknown[];areas:AreaConfig[];rng:Record<string,number>;pendingAwakening?:AwakeningNotice;rules?:RunRules;
  /** Party ward relics: +50 % resistance to each listed element (src/run/elementRules.mjs). */wards?:import('./elements.mjs').Element[];}
export const RUN_VERSION:number;export const SAVE_KEY:string;export const REVIVE_HP_SHARE:number;export const PROTOTYPE_AREAS:AreaConfig[];export const FULL_AREAS:AreaConfig[];
export function variantAreas(seed:string):AreaConfig[];
export const COURSE_LENGTH:number;
export function courseAreas(seed:string):AreaConfig[];
export function seedHash(value:unknown):number;
export function nextRandom(run:RunState,stream:string):number;
export function encounters(areas:AreaConfig[]):{area:number;name:string;arena:string;boss:boolean;wave:number}[];
export function createRun(seed:string,catalog:RunCatalog,areas?:AreaConfig[],rules?:RunRules):RunState;
export function migrateRun(run:unknown,catalog:RunCatalog):RunState;
export function rollParty(run:RunState,catalog:RunCatalog):RunState;
export function memberMaxMp(character:RunCharacter,member:RunMember):number;
export function confirmParty(run:RunState):RunState;
export function chooseStartSkill(run:RunState,key:string,skillId:string,catalog:RunCatalog):RunState;
export function skillForRun(source:SkillConfig,member:RunMember):SkillConfig;
export function rewardPool(run:RunState,catalog:RunCatalog):Reward[];
export function completeBattle(run:RunState,catalog:RunCatalog,snapshot:{key:string;hp:number;mp:number;limit?:number}[],won:boolean):RunState;
export function chooseReward(run:RunState,index:number,catalog:RunCatalog,replace?:string):RunState;
export function acknowledgeAwakening(run:RunState,id:string):RunState;
export function validateRun(run:unknown,catalog:RunCatalog):RunState;
export class RunStore{constructor(storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>,catalog:RunCatalog);load():RunState|null;save(run:RunState):RunState;clear():void;}
export function upcomingStage(run:RunState):import('./stageContent.mjs').StageDefinition;
export const REWARD_WEIGHTS:{learnOnWeakness:number;ward:number;weapon:number;weaponOnWeakness:number;default:number};
