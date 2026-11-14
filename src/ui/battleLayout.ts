import { BATTLE_ARENAS, BattleArena } from '../data/battleArenas';

/** Formations are adapted from FFBE references, not extracted engine coordinates. */
export const BATTLE_VIEW = { width: 1000, height: 1100 };
export const BATTLE_ART_SCALE = 0.8;
/** Fixed party formation (loop v2, four heroes): two staggered columns, FFBE style. Front and back column
 * x (share of the arena width) and the vertical step between neighbouring heroes (share of the arena
 * height); feet stay PARTY_FEET_MARGIN above the HUD. */
export const PARTY_FRONT_X = 0.7;
export const PARTY_BACK_X = 0.83;
export const PARTY_STEP = 0.11;
export const PARTY_SLOTS = 4;
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
  // Party formation (2026-11-15, four heroes): one fixed zigzag for every arena. From top to bottom the
  // heroes alternate back, front, back, front column, each one step lower, so neighbours never share a row
  // and the spacing is identical everywhere. The formation centres on the reviewed floor band and moves up
  // only if its lowest hero would reach into the HUD. Slot i belongs to party member i (draw order: damage,
  // healer, tank, support), so the damage dealer stands front-top and the tank front-bottom.
  const step = Math.round(arenaHeight * PARTY_STEP);
  const lowest = partyTop - PARTY_FEET_MARGIN;
  const centerY = Math.min(Math.round((fieldTop + fieldBottom) / 2), lowest - Math.round(step * 1.5));
  const row = (n: number) => centerY + Math.round(step * (n - 1.5));
  const front = Math.round(arenaWidth * PARTY_FRONT_X), back = Math.round(arenaWidth * PARTY_BACK_X);
  // Rows 0..3 top to bottom: back, front, back, front.
  const party = [{ x: front, y: row(1) }, { x: back, y: row(0) }, { x: front, y: row(3) }, { x: back, y: row(2) }];
  return {
    partyTop,
    hud: { x: hudX, width: hudWidth },
    arena: { x: 0, y: arenaTop, width: arenaWidth, height: arenaHeight },
    rowHeight: 112,
    rowGap: 8,
    commandY: partyTop + 210,
    // Slot i is party member i's home position; fewer heroes (training) use the first slots.
    party,
    // Staggered pair (2026-11-10): the front (bottom) enemy stands nearer the party, the back one further
    // left, so a tall front body (Magitek Axeman, 278 px) no longer hides the back one and their name
    // plates do not overlap. Arenas whose walkable ground lies right of centre shift the enemies there.
    enemies: { center: slot(0.19 + enemyShift, 0.50), top: slot(0.23 + enemyShift, 0.14), bottom: slot(0.38 + enemyShift, 1) },
  };
}
