import { BATTLE_ARENAS, BattleArena } from '../data/battleArenas';

/** Formations are adapted from FFBE references, not extracted engine coordinates. */
export const BATTLE_VIEW = { width: 1000, height: 1100 };
export const BATTLE_ART_SCALE = 0.8;

export function getBattleLayout(width: number, height: number, arena: BattleArena = BATTLE_ARENAS.forest) {
  const hudWidth = width;
  const arenaWidth = width;
  const hudX = (width - hudWidth) / 2;
  const partyTop = height - 300;
  const arenaTop = 48;
  const arenaHeight = partyTop - arenaTop;
  // Transform reviewed source floor bounds through the same cover crop as the image.
  const backgroundScale = Math.max(arenaWidth / arena.width, arenaHeight / arena.height);
  const cropY = (arena.height * backgroundScale - arenaHeight) / 2;
  const fieldTop = Math.round(arenaTop + arena.height * arena.floorTop * backgroundScale - cropY);
  const fieldBottom = Math.min(partyTop - 85,
    Math.round(arenaTop + arena.height * arena.floorBottom * backgroundScale - cropY));
  const fieldHeight = fieldBottom - fieldTop;
  const slot = (x: number, y: number) => ({ x: Math.round(arenaWidth * x), y: Math.round(fieldTop + fieldHeight * y) });
  return {
    partyTop,
    hud: { x: hudX, width: hudWidth },
    arena: { x: 0, y: arenaTop, width: arenaWidth, height: arenaHeight },
    rowHeight: 112,
    rowGap: 8,
    commandY: partyTop + 210,
    party: { cloud: slot(0.67, 0.48), aerith: slot(0.79, 0.20), barret: slot(0.83, 0.92) },
    enemies: { center: slot(0.19, 0.50), top: slot(0.32, 0.16), bottom: slot(0.32, 1) },
  };
}
