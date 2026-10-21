export type TargetScope = 'single_enemy' | 'all_enemies' | 'single_ally' | 'party';
export type MoveType = 'dash' | 'stationary';
export type MotionType = 'atk' | 'magic_atk';

export interface SkillConfig {
  id: string;
  ffbeId: number;
  name: string;
  rarity?: number | string;
  level?: number;
  type?: 'ABILITY' | 'MAGIC';
  mpCost: number;
  scope: TargetScope;
  damageMultiplier: number;
  hitCount: number;
  attackFrames: number[];
  moveType: MoveType;
  motion: MotionType;
  desc: string;
}

export interface UnitSkillsData {
  unitId: string;
  unitName: string;
  game: string;
  extractedAt?: string;
  skills: SkillConfig[];
}
