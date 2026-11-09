// Friendly stat-buff skills from their original processes (FFBE process 3 = "ATK,DEF,MAG,SPR,turns,..."
// stat boost; 18 / 19 = physical / magical damage mitigation, e.g. Protect = 3@18, Shell = 3@19).
// Which statuses a skill grants comes from the source; strength and duration are reviewed FFRogue
// defaults for later balancing (FFBE percentages range from 20 % to 200 % and do not map 1:1).
export const BUFF_PROCESSES = new Set(['3', '18', '19']);
export const BUFF_DEFAULTS = {boost: 1.3, guard: 0.3, turns: 3};

/** Returns the reviewed effects for a pure stat-buff row, or null when any process is not a buff. */
export function sourceFriendlyBuffs(raw) {
  const processes = String(raw?.processId ?? '').split('@'), params = String(raw?.processParam ?? '').split('@');
  if (!processes.length || !processes.every(p => BUFF_PROCESSES.has(p))) return null;
  let boost = false, physical = false, magical = false;
  processes.forEach((process, index) => {
    const values = params[index]?.split(',').map(Number) ?? [];
    if (process === '3') {
      const [atk, def, mag, spr] = values;
      if (atk > 0 || mag > 0) boost = true;
      if (def > 0) physical = true;
      if (spr > 0) magical = true;
    } else if (process === '18') physical = true;
    else magical = true;
  });
  const {turns} = BUFF_DEFAULTS, effects = [
    ...(boost ? [{kind: 'physical-boost', multiplier: BUFF_DEFAULTS.boost, turns}] : []),
    ...(physical ? [{kind: 'guard', damageType: 'physical', reduction: BUFF_DEFAULTS.guard, turns}] : []),
    ...(magical ? [{kind: 'guard', damageType: 'magical', reduction: BUFF_DEFAULTS.guard, turns}] : []),
  ];
  return effects.length ? effects : null;
}

export function buffDescription(effects) {
  const parts = effects.map(e => e.kind === 'physical-boost' ? `damage +${Math.round((e.multiplier - 1) * 100)}%`
    : `${e.damageType} damage taken -${Math.round(e.reduction * 100)}%`);
  return `${parts.join(', ').replace(/^./, c => c.toUpperCase())} for all allies for ${effects[0].turns} rounds.`;
}
