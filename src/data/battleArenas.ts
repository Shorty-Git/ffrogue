import reviewed from '../../public/assets/stages/reviewed.json';

/** Reviewed floor bounds in normalized coordinates of each prepared source image. */
export const BATTLE_ARENAS = {
  forest: {
    texture: 'arena_forest', file: 'forest_clearing.jpg',
    width: 960, height: 1024, floorTop: 0.56, floorBottom: 0.80,
  },
  reactor: {
    texture: 'arena_reactor', file: 'reactor_01.jpg',
    width: 960, height: 1024, floorTop: 0.54, floorBottom: 0.76,
  },
  ...reviewed,
  // Altissia: layer cells (house, wave) end where FFBE's narrow screen crops them; show only that central part.
  // Enemies stand in the shared slots, out on the water (developer playtest 2026-11-11; the quay shift of
  // 2026-11-10 pushed them into the party).
  altissia: { ...reviewed.altissia, contentWidth: 0.7 },
  // Dollet: the default slots put enemies on the left sidewalk; nudge them onto the street (2026-11-11).
  dollet: { ...reviewed.dollet, enemyShiftX: 0.07 },
} as const;

export type BattleArenaKey = keyof typeof BATTLE_ARENAS;
export type BattleArena = typeof BATTLE_ARENAS[BattleArenaKey];
