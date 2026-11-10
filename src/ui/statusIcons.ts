import type {StatusBadge} from './CombatHud';

/** Original FFBE status icons exported by tools/export_status_icons.py. */
const STATUS_UI: Record<string, string> = {
  'physical-boost': 'ATK up',
  'auto-revive': 'Reraise',
  'guard-physical': 'Protect',
  'guard-magical': 'Shell',
  'break-attack': 'ATK break',
  'break-defense': 'DEF break',
  'break-magic': 'MAG break',
  'break-spirit': 'SPR break',
  blind: 'Blind',
  'attack-down': 'ATK down',
  'physical-weakness': 'Armor break',
  'magic-weakness': 'Magic weak',
  silence: 'Silence',
  stop: 'Stop',
};

/** Tooltip explanations (hover a badge). */
const STATUS_HELP: Record<string, string> = {
  'physical-boost': 'physical damage dealt up', 'auto-revive': 'revives once after a K.O.',
  'guard-physical': 'physical damage taken down', 'guard-magical': 'magical damage taken down',
  'break-attack': 'physical damage dealt down', 'break-defense': 'physical damage taken up',
  'break-magic': 'magic damage dealt down', 'break-spirit': 'magical damage taken up',
  blind: 'basic attacks may miss', 'attack-down': 'damage dealt down', 'physical-weakness': 'takes more physical damage',
  'magic-weakness': 'takes more magic damage', silence: 'cannot use magic', stop: 'cannot act',
};
export function statusBadge(kind: string, turns: number): StatusBadge | null {
  const name = STATUS_UI[kind];
  if (!name || !(turns > 0)) return null;
  return {icon: `/assets/ui/status/${kind}.png`, label: STATUS_HELP[kind] ? `${name}: ${STATUS_HELP[kind]}` : name, turns};
}

/** Hero buffs expire after `expiresAfterRound`; the badge counts the rounds still covered. */
export function heroStatusBadges(buffs: {kind: string; damageType?: string; stat?: string; expiresAfterRound: number}[] = [], round: number): StatusBadge[] {
  return buffs.filter(b => b.expiresAfterRound >= round)
    .map(b => statusBadge(b.kind === 'guard' ? `guard-${b.damageType}` : b.kind === 'break' ? `break-${b.stat}` : b.kind, b.expiresAfterRound - round + 1)).filter((b): b is StatusBadge => !!b);
}

/** Enemy statuses count down in enemy phases. */
export function enemyStatusBadges(statuses: {kind: string; phases: number}[] = []): StatusBadge[] {
  return statuses.map(s => statusBadge(s.kind, s.phases)).filter((b): b is StatusBadge => !!b);
}
