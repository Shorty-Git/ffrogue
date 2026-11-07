import type { SkillConfig } from '../types/skills';
import type { EnemySkillEffect,FriendlySkillEffect } from '../types/skills';
export function skillDamageType(skill:{motion:string;damageType?:'physical'|'holy'}):'physical'|'holy';
export function validateDamageEvents(skill: SkillConfig, durationFrames?: number): { frame: number; weight: number }[] | null;
export function reviewedSkillEvents(skill: SkillConfig, durationFrames?: number): { frame: number; weight?: number; effects?: EnemySkillEffect[];allyEffects?:FriendlySkillEffect[] }[] | null;
