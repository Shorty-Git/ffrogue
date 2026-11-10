import { BATTLE_ARENAS, BattleArena } from '../data/battleArenas';

/** Formations are adapted from FFBE references, not extracted engine coordinates. */
export const BATTLE_VIEW = { width: 1000, height: 1100 };
export const BATTLE_ART_SCALE = 0.8;

/** Cover scale of an arena picture; letterboxed backgrounds cover with their real content width. */
export function arenaCoverScale(width: number, height: number, arena: {width: number; height: number; contentWidth?: number}) {
  return Math.max(width / (arena.width * (arena.contentWidth ?? 1)), height / arena.height);
}

export function getBattleLayout(width: number, height: number, arena: BattleArena = BATTLE_ARENAS.forest) {
  const hudWidth = width;
  const arenaWidth = width;
  const hudX = (width - hudWidth) / 2;
  const partyTop = height - 300;
  const arenaTop = 48;
  const arenaHeight = partyTop - arenaTop;
  // Transform reviewed source floor bounds through the same cover crop as the image.
  const backgroundScale = arenaCoverScale(arenaWidth, arenaHeight, arena);
  const cropY = (arena.height * backgroundScale - arenaHeight) / 2;
  const fieldTop = Math.round(arenaTop + arena.height * arena.floorTop * backgroundScale - cropY);
  const fieldBottom = Math.min(partyTop - 85,
    Math.round(arenaTop + arena.height * arena.floorBottom * backgroundScale - cropY));
  const fieldHeight = fieldBottom - fieldTop;
  const enemyShift = (arena as {enemyShiftX?: number}).enemyShiftX ?? 0;
  const slot = (x: number, y: number) => ({ x: Math.round(arenaWidth * x), y: Math.round(fieldTop + fieldHeight * y) });
  return {
    partyTop,
    hud: { x: hudX, width: hudWidth },
    arena: { x: 0, y: arenaTop, width: arenaWidth, height: arenaHeight },
    rowHeight: 112,
    rowGap: 8,
    commandY: partyTop + 210,
    party: { cloud: slot(0.67, 0.48), aerith: slot(0.79, 0.20), barret: slot(0.83, 0.92) },
    // Staggered pair (2026-11-10): the front (bottom) enemy stands nearer the party, the back one further
    // left, so a tall front body (Magitek Axeman, 278 px) no longer hides the back one and their name
    // plates do not overlap. Arenas whose walkable ground lies right of centre shift the enemies there.
    enemies: { center: slot(0.19 + enemyShift, 0.50), top: slot(0.23 + enemyShift, 0.14), bottom: slot(0.38 + enemyShift, 1) },
  };
}
