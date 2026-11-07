/**
 * Limit Burst gauge (FFRogue rule, not the FFBE crystal formula).
 * Battle-scoped: every battle starts empty. Own actions and damage taken fill it;
 * a full gauge unlocks the form's Limit Burst, which empties it and earns nothing itself.
 */
export const LB_MAX = 100;
export const LB_PER_ACTION = 25;
/** Losing a whole max-HP bar would add this much; any hit adds at least 1. */
export const LB_PER_FULL_HP_LOST = 60;

const clamp = value => Math.max(0, Math.min(LB_MAX, Math.round(value)));
export const gainFromAction = gauge => clamp(gauge + LB_PER_ACTION);
export function gainFromDamage(gauge, damage, maxHp) {
  if (!(damage > 0)) return clamp(gauge);
  return clamp(gauge + Math.max(1, LB_PER_FULL_HP_LOST * damage / Math.max(1, maxHp)));
}
export const isFull = gauge => gauge >= LB_MAX;
