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
} as const;

export type BattleArenaKey = keyof typeof BATTLE_ARENAS;
export type BattleArena = typeof BATTLE_ARENAS[BattleArenaKey];
