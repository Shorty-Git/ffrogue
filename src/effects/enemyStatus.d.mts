import type { EnemyStatusEffect } from '../types/skills';
export function applyEnemyStatuses(current: EnemyStatusEffect[] | undefined, effects: EnemyStatusEffect[], random?: () => number): EnemyStatusEffect[];
export function statusDamageMultiplier(statuses: EnemyStatusEffect[] | undefined, damageType: string): number;
export function isEnemyActionBlocked(statuses: EnemyStatusEffect[] | undefined, actionType?: 'physical' | 'magic'): boolean;
export function ageEnemyStatuses(statuses: EnemyStatusEffect[] | undefined): EnemyStatusEffect[];
export function enemyAttackMultiplier(statuses: EnemyStatusEffect[] | undefined): number;
