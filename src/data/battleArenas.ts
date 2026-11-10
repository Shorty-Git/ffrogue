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
  // Per-arena placement override (2026-11-10 review of all arenas): Altissia's walkable ground is the stone
  // quay right of centre; the default enemy slots stood over the tidal wave.
  // Layer cells (house, wave) end where FFBE's narrow screen crops them; show only that central part.
  altissia: { ...reviewed.altissia, enemyShiftX: 0.18, contentWidth: 0.7 },
} as const;

export type BattleArenaKey = keyof typeof BATTLE_ARENAS;
export type BattleArena = typeof BATTLE_ARENAS[BattleArenaKey];
