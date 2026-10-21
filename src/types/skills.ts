export type TargetScope = 'single_enemy' | 'all_enemies' | 'single_ally' | 'party';

export interface EffectFrameMeta {
  index: number;
  durationMs: number;
  delayTicks?: number;
}

export interface EffectMeta {
  effectKey: string;
  file: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  pivotX: number;
  pivotY: number;
  durationMs: number;
  frames: EffectFrameMeta[];
}

export interface SkillConfig {
  id: string;
  name: string;
  mpCost: number;
  scope: TargetScope;
  desc: string;
  effectKey?: string;
  cameraShake?: { duration: number; intensity: number };
}

export const HERO_SKILLS: Record<string, SkillConfig> = {
  cloud: {
    id: 'braver',
    name: 'Braver',
    mpCost: 15,
    scope: 'single_enemy',
    desc: 'Heavy sword strike (1,100-1,400 DMG)',
    effectKey: 'slash_heavy',
  },
  aerith: {
    id: 'curaga',
    name: 'Curaga',
    mpCost: 24,
    scope: 'party',
    desc: 'Restores 700-1,000 HP to all living allies',
    effectKey: 'curaga_light',
  },
  barret: {
    id: 'grenade_bomb',
    name: 'Grenade Bomb',
    mpCost: 18,
    scope: 'all_enemies',
    desc: 'Hits all enemies simultaneously (350-500 DMG)',
    effectKey: 'grenade_blast',
  },
};
