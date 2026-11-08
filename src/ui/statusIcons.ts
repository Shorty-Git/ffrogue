import type {StatusBadge} from './CombatHud';

/** Original FFBE status icons exported by tools/export_status_icons.py. */
const STATUS_UI: Record<string, string> = {
  'physical-boost': 'ATK up',
  'auto-revive': 'Reraise',
  'attack-down': 'ATK down',
  'physical-weakness': 'Armor break',
  'magic-weakness': 'Magic weak',
  silence: 'Silence',
  stop: 'Stop',
};

export function statusBadge(kind: string, turns: number): StatusBadge | null {
  const label = STATUS_UI[kind];
  if (!label || !(turns > 0)) return null;
  return {icon: `/assets/ui/status/${kind}.png`, label, turns};
}

/** Hero buffs expire after `expiresAfterRound`; the badge counts the rounds still covered. */
export function heroStatusBadges(buffs: {kind: string; expiresAfterRound: number}[] = [], round: number): StatusBadge[] {
  return buffs.filter(b => b.expiresAfterRound >= round)
    .map(b => statusBadge(b.kind, b.expiresAfterRound - round + 1)).filter((b): b is StatusBadge => !!b);
}

/** Enemy statuses count down in enemy phases. */
export function enemyStatusBadges(statuses: {kind: string; phases: number}[] = []): StatusBadge[] {
  return statuses.map(s => statusBadge(s.kind, s.phases)).filter((b): b is StatusBadge => !!b);
}
