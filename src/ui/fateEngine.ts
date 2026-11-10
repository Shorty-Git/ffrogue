/**
 * The Fate Engine: rarity tiers, reel timing and sound plan for the party slot machine.
 * Presentation only; the drawn party is already decided and saved before the reels move.
 *
 * Sounds are FFBE's own summon cues from System.acb (memorial-packs on_demand_asset3, SHA-256
 * d743912a…818818): se_menu_get_unit1-4 (streams 77-80), se_menu_reel_slide_1 (81),
 * se_hanabi02 (65), se_battle_limitopen_1 (15), se_menu_display_result (86).
 */
/** 3★ bronze, 4★ silver, 5★ gold, 6★ rainbow (still subtle), 7★ prism and NV (the full show). */
export type FateTier = 'bronze' | 'silver' | 'gold' | 'rainbow' | 'prism' | 'nv';
const ORDER: readonly FateTier[] = ['bronze', 'silver', 'gold', 'rainbow', 'prism', 'nv'];

/** Lv 1..6 (src/run/unitForms.mjs) map onto the six tiers; members without a level use their rarity. */
export function fateTier(member: {rarity: number; rank?: string; level?: number}): FateTier {
  if (member.level !== undefined) return ORDER[Math.max(0, Math.min(ORDER.length - 1, member.level - 1))];
  if (member.rank === 'NV') return 'nv';
  if (member.rarity >= 7) return 'prism';
  if (member.rarity === 6) return 'rainbow';
  if (member.rarity === 5) return 'gold';
  if (member.rarity === 4) return 'silver';
  return 'bronze';
}
export const tierRank = (tier: FateTier) => ORDER.indexOf(tier);
/** Tiers that get the full celebration (tease, machine flash, shake, fireworks). */
export const isShowTier = (tier: FateTier) => tierRank(tier) >= tierRank('prism');

export interface FateTimeline {
  /** Seconds after the pull at which each reel lands. */
  stops: number[];
  /** Reels that slow down with a glow first because something rare is coming. */
  teases: boolean[];
  /** Seconds until the celebration has played and the result screen may settle. */
  end: number;
}

const CELEBRATION: Record<FateTier, number> = {bronze: .35, silver: .45, gold: .55, rainbow: .7, prism: 1.25, nv: 1.45};

export function fateTimeline(tiers: FateTier[]): FateTimeline {
  let at = .55;
  const stops: number[] = [], teases: boolean[] = [];
  tiers.forEach(tier => {
    // Only 7★ and NV earn the slow-down tease; 5★ and 6★ land like any other reel.
    const tease = isShowTier(tier);
    at += .5 + (tease ? .6 : 0);
    stops.push(at);
    teases.push(tease);
  });
  const best = tiers.reduce((top, tier) => tierRank(tier) > tierRank(top) ? tier : top, 'bronze' as FateTier);
  return {stops, teases, end: at + CELEBRATION[best]};
}

export const FATE_SOUND = {
  bronze: 'get-bronze', silver: 'get-silver', gold: 'get-gold', rainbow: 'get-gold', prism: 'get-rainbow', nv: 'get-rainbow',
  slide: 'reel-slide', fireworks: 'fireworks', awaken: 'limit-open', verdict: 'verdict',
} as const;
export type FateSound = typeof FATE_SOUND[keyof typeof FATE_SOUND];

/**
 * Sample gains (mix pass 2026-11-10). Measured loudest 400 ms window of each WAV (dBFS): reel-slide -11.8,
 * get-bronze -19.0, get-silver -17.0, get-gold -13.9, get-rainbow -13.4, fireworks -12.3, limit-open -5.5,
 * verdict -18.9. Gains place them at a target level (dBFS after gain): rarer tiers land louder
 * (bronze -27, silver -26, gold -24, 6★ -23, 7★ -22, NV -21); the slide and fireworks sit under the tier
 * cues (-24); limit-open was ~4 dB over the 7★ cue before and now sits at -24; the verdict (-22) is no
 * longer buried under the tier tails.
 */
export const FATE_GAIN: Record<FateTier | 'slide' | 'fireworks' | 'awaken' | 'verdict', number> = {
  bronze: .4, silver: .355, gold: .31, rainbow: .35, prism: .37, nv: .42,
  slide: .25, fireworks: .26, awaken: .12, verdict: .7,
};
/** A landing reel fades the previous reel's tier cue over this many seconds (they used to stack 3 deep). */
export const FATE_TAIL_FADE = .3;
export const fateSoundUrl = (sound: FateSound) => `assets/audio/fate/${sound}.wav`;
export const ALL_FATE_SOUNDS: FateSound[] = [...new Set(Object.values(FATE_SOUND))];

/**
 * One clear headline for the whole draw. The team score (bronze 0 … NV 5 per reel) decides, so three
 * gold pulls read better than one gold and two bronze; NV and 7★ lead when present.
 */
export function fateVerdict(tiers: FateTier[], stars: number): {tier: FateTier; title: string; detail: string} {
  const score = tiers.reduce((sum, tier) => sum + tierRank(tier), 0);
  const tier: FateTier = tiers.includes('nv') ? 'nv' : tiers.includes('prism') ? 'prism'
    : tiers.includes('rainbow') && score >= 7 ? 'rainbow' : score >= 6 ? 'gold' : score >= 4 ? 'silver' : 'bronze';
  const title = {bronze: 'Humble Fate', silver: 'Bright Fate', gold: 'Golden Fate', rainbow: 'Rainbow Fate',
    prism: 'Prismatic Fate!', nv: 'Fate Unbound!'}[tier];
  return {tier, title, detail: `Team Lv ${stars}`};
}
