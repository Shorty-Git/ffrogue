import { BATTLE_ARENAS, BattleArena } from '../data/battleArenas';

/** Formations are adapted from FFBE references, not extracted engine coordinates. */
export const BATTLE_VIEW = { width: 1000, height: 1100 };
export const BATTLE_ART_SCALE = 0.8;
/** Fixed party formation: front and back columns (share of the arena width) and the vertical step
 * between the heroes (share of the arena height); feet stay this far above the HUD. */
export const PARTY_FRONT_X = 0.71;
export const PARTY_BACK_X = 0.82;
export const PARTY_STEP = 0.15;
export const PARTY_FEET_MARGIN = 70;

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
  // Party formation (2026-11-11): one fixed chevron for every arena, FFBE style. The front hero stands in
  // the middle nearer the enemies, the other two the same step above and below it, so the spacing is
  // identical everywhere (it no longer stretches with each arena's floor band). The formation centres on
  // the reviewed floor band and moves up only if its lowest hero would reach into the HUD.
  const step = Math.round(arenaHeight * PARTY_STEP);
  const lowest = partyTop - PARTY_FEET_MARGIN;
  const centerY = Math.min(Math.round((fieldTop + fieldBottom) / 2), lowest - step);
  const party = {
    cloud: { x: Math.round(arenaWidth * PARTY_FRONT_X), y: centerY },
    aerith: { x: Math.round(arenaWidth * PARTY_BACK_X), y: centerY - step },
    barret: { x: Math.round(arenaWidth * PARTY_BACK_X), y: centerY + step },
  };
  return {
    partyTop,
    hud: { x: hudX, width: hudWidth },
    arena: { x: 0, y: arenaTop, width: arenaWidth, height: arenaHeight },
    rowHeight: 112,
    rowGap: 8,
    commandY: partyTop + 210,
    // Slot names are positions (party member 1 front, 2 upper back, 3 lower back), not characters.
    party,
    // Staggered pair (2026-11-10): the front (bottom) enemy stands nearer the party, the back one further
    // left, so a tall front body (Magitek Axeman, 278 px) no longer hides the back one and their name
    // plates do not overlap. Arenas whose walkable ground lies right of centre shift the enemies there.
    enemies: { center: slot(0.19 + enemyShift, 0.50), top: slot(0.23 + enemyShift, 0.14), bottom: slot(0.38 + enemyShift, 1) },
  };
}
