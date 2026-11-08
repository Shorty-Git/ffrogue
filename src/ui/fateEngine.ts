/**
 * The Fate Engine: rarity tiers, reel timing and sound plan for the party slot machine.
 * Presentation only; the drawn party is already decided and saved before the reels move.
 *
 * Sounds are FFBE's own summon cues from System.acb (memorial-packs on_demand_asset3, SHA-256
 * d743912a…818818): se_menu_get_unit1-4 (streams 77-80), se_menu_reel_slide_1 (81),
 * se_hanabi02 (65), se_battle_limitopen_1 (15), se_menu_display_result (86).
 */
export type FateTier = 'bronze' | 'silver' | 'gold' | 'rainbow' | 'nv';
const ORDER: readonly FateTier[] = ['bronze', 'silver', 'gold', 'rainbow', 'nv'];

export function fateTier(member: {rarity: number; rank?: string}): FateTier {
  if (member.rank === 'NV') return 'nv';
  if (member.rarity >= 6) return 'rainbow';
  if (member.rarity === 5) return 'gold';
  if (member.rarity === 4) return 'silver';
  return 'bronze';
}
export const tierRank = (tier: FateTier) => ORDER.indexOf(tier);

export interface FateTimeline {
  /** Seconds after the pull at which each reel lands. */
  stops: number[];
  /** Reels that slow down with a glow first because something rare is coming. */
  teases: boolean[];
  /** Seconds until the celebration has played and the result screen may settle. */
  end: number;
}

const CELEBRATION: Record<FateTier, number> = {bronze: .35, silver: .45, gold: .8, rainbow: 1.25, nv: 1.45};

export function fateTimeline(tiers: FateTier[]): FateTimeline {
  let at = .55;
  const stops: number[] = [], teases: boolean[] = [];
  tiers.forEach(tier => {
    // Base units are mostly 5-star (gold), so only rainbow and NV pulls earn the slow-down tease.
    const tease = tierRank(tier) >= tierRank('rainbow');
    at += .5 + (tease ? .6 : 0);
    stops.push(at);
    teases.push(tease);
  });
  const best = tiers.reduce((top, tier) => tierRank(tier) > tierRank(top) ? tier : top, 'bronze' as FateTier);
  return {stops, teases, end: at + CELEBRATION[best]};
}

export const FATE_SOUND = {
  bronze: 'get-bronze', silver: 'get-silver', gold: 'get-gold', rainbow: 'get-rainbow', nv: 'get-rainbow',
  slide: 'reel-slide', fireworks: 'fireworks', awaken: 'limit-open', verdict: 'verdict',
} as const;
export type FateSound = typeof FATE_SOUND[keyof typeof FATE_SOUND];
export const fateSoundUrl = (sound: FateSound) => `assets/audio/fate/${sound}.wav`;
export const ALL_FATE_SOUNDS: FateSound[] = [...new Set(Object.values(FATE_SOUND))];

/**
 * One clear headline for the whole draw. The team score (bronze 0 … NV 4 per reel, 0-12) decides,
 * so three gold pulls read better than one gold and two bronze; NV and rainbow lead when present.
 */
export function fateVerdict(tiers: FateTier[], stars: number): {tier: FateTier; title: string; detail: string} {
  const score = tiers.reduce((sum, tier) => sum + tierRank(tier), 0);
  const tier: FateTier = tiers.includes('nv') ? 'nv' : tiers.includes('rainbow') && score >= 6 ? 'rainbow'
    : score >= 6 ? 'gold' : score >= 4 ? 'silver' : 'bronze';
  const title = {bronze: 'Humble Fate', silver: 'Bright Fate', gold: 'Golden Fate', rainbow: 'Rainbow Fate!', nv: 'Fate Unbound!'}[tier];
  return {tier, title, detail: `Team ${stars}★`};
}
