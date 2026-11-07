export type TargetScope = 'single_enemy' | 'all_enemies' | 'single_ally' | 'party' | 'self';
export type MoveType = 'dash' | 'stationary';
export type MotionType = 'atk' | 'magic_atk';
/** Reviewed decoded-asset contract. */
export interface SkillSoundResource { key: string; uri: string; sha256: string; format: 'wav' | 'ogg'; }
export interface SkillAudioSourcePlan {
  schema: 'ffbe-audio-source-v1';
  playbackSupported: boolean;
  bus: 'skill-sfx';
  frameRate: 60;
  timingBasis: string;
  coverage: string;
  events: {frame: number; sourceGroupId: number; sourceSoundId: number; rawParameters: string[]; resource: SkillSoundResource | null}[];
}
export interface EnemyStatusEffect {
  kind: 'magic-weakness' | 'physical-weakness' | 'attack-down' | 'silence' | 'stop';
  phases: number;
  chance: number;
  multiplier?: number;
}
export interface EnemyInstantEffect {kind:'execute-or-damage';chance:number;fallbackDamage:number;bossImmune:boolean;}
export type EnemySkillEffect = EnemyStatusEffect | EnemyInstantEffect;
export interface HeroBuffEffect {kind:'physical-boost';multiplier:number;turns:number;}
export type FriendlySkillEffect = HeroBuffEffect | {kind:'heal';amount:number};
export interface ActiveHeroBuff {kind:'physical-boost';multiplier:number;expiresAfterRound:number;}
export interface ActionChoreography {
  schema:'source-action-v1';
  movement:'target'|'step'|'stationary';
  travelTiming:'prepared'|'move-cycle';
  stepDistance?:'half-idle-height';
  readiness:'none'|'magic-standby';
  commandPose?:'standby'|'magic-standby';
  /** Limit Bursts play their own limit_atk body clip. */
  body:{mode:'rest';phases?:never}|{mode:'clips';phases:{frame:number;clip:MotionType|'limit_atk'}[]};
  review:{basis:'accepted-gameplay'|'user-original-observation'|'reviewed-adaptation';sourceMotionType:number;sourceMoveType:number;note:string};
}

export interface SkillConfig {
  /** Preserved original parameters; never read as executable roguelike balance. */
  originalCommand?: {
    schema: 'ffbe-command-source-v1'; kind: string; id: number;
    database: { path: string; sha256: string }; raw: Record<string, unknown>;
    references?: {role:string;id:number;dispatchRaw:string;raw:Record<string,unknown>}[];
  };
  gameplayReview?: { policy: 'reviewed-roguelike'; note: string; ownedFields: string[]; boundary: string };
  id: string;
  ffbeId: number;
  name: string;
  rarity?: number | string;
  level?: number;
  /** LIMIT = the form's Limit Burst: offered through the LB gauge, never as an ordinary skill. */
  type?: 'ABILITY' | 'MAGIC' | 'LIMIT';
  mpCost: number;
  /** Reviewed nonlethal caster cost, paid once after complete admission. */
  hpCost?: number;
  allyTargeting?: 'living-allies' | 'other-living-allies';
  scope: TargetScope;
  damageMultiplier: number;
  /** Reviewed damage lane, independent of the character's body pose. */
  damageType?: 'physical' | 'holy';
  hitCount: number;
  attackFrames: number[];
  moveType: MoveType;
  motion: MotionType;
  /** Explicit body/travel review; motion is retained for menu poses, not an execution fallback. */
  actionChoreography?:ActionChoreography;
  desc: string;
  /** Sole published skill animation; absence means not imported. */
  importStatus?: 'imported' | 'not-imported';
  unavailableReason?: string;
  scenePresentation?: string;
  /** Explicit prepared-clock event contract. */
  requiresSourceScene?: boolean;
  /** Reviewed total-damage fractions on the prepared visual clock. */
  damageEvents?: { frame: number; weight: number }[];
  /** Reviewed enemy events; status and instant/fallback actions share the visual clock. */
  supportEvents?: { frame: number; effects: EnemySkillEffect[] }[];
  /** Reviewed stationary friendly events; healing does not revive K.O. actors. */
  allyEvents?: { frame: number; effects: FriendlySkillEffect[] }[];

}

export interface UnitSkillsData {
  unitId: string;
  unitName: string;
  game: string;
  extractedAt?: string;
  skills: SkillConfig[];
}
