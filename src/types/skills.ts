export type TargetScope = 'single_enemy' | 'all_enemies' | 'single_ally' | 'party';

export interface SkillConfig {
  id: string;
  name: string;
  mpCost: number;
  scope: TargetScope;
  desc: string;
  cameraShake?: { duration: number; intensity: number };
}

export const HERO_SKILLS: Record<string, SkillConfig> = {
  cloud: {
    id: 'braver',
    name: 'Braver',
    mpCost: 15,
    scope: 'single_enemy',
    desc: 'Heavy sword strike (1,100-1,400 DMG)',
  },
  aerith: {
    id: 'curaga',
    name: 'Curaga',
    mpCost: 24,
    scope: 'party',
    desc: 'Restores 700-1,000 HP to all living allies',
  },
  barret: {
    id: 'grenade_bomb',
    name: 'Grenade Bomb',
    mpCost: 18,
    scope: 'all_enemies',
    desc: 'Hits all enemies simultaneously (350-500 DMG)',
  },
};
