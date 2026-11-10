/**
 * Limit Burst gauge (FFRogue rule, not the FFBE crystal formula).
 * Own actions and damage taken fill it; a full gauge unlocks the form's Limit Burst,
 * which empties it and earns nothing itself. The gauge carries over to the next battle
 * of the run for heroes who end a battle standing (a K.O. empties it).
 */
export const LB_MAX = 100;
export const LB_PER_ACTION = 15;
/** Losing a whole max-HP bar would add this much; any hit adds at least 1. */
export const LB_PER_FULL_HP_LOST = 45;

const clamp = value => Math.max(0, Math.min(LB_MAX, Math.round(value)));
export const gainFromAction = gauge => clamp(gauge + LB_PER_ACTION);
export function gainFromDamage(gauge, damage, maxHp) {
  if (!(damage > 0)) return clamp(gauge);
  return clamp(gauge + Math.max(1, LB_PER_FULL_HP_LOST * damage / Math.max(1, maxHp)));
}
export const isFull = gauge => gauge >= LB_MAX;
/** Gauge saved into the run after a battle: only heroes with a Limit Burst who are still standing keep it. */
export function carriedLimit(character,hp,gauge){
  if(!character?.limitBurst||!(hp>0)||!Number.isFinite(gauge))return 0;
  return clamp(gauge);
}
/** Reviewed support fill (e.g. a 'limit-fill' friendly effect); bounded like every other gain. */
export function gainFromSupport(gauge, amount) {
  if (!Number.isInteger(amount) || amount < 1 || amount > LB_MAX) throw Error('Invalid reviewed Limit fill');
  return clamp(gauge + amount);
}
