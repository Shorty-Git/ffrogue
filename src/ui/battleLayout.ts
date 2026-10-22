/** Portrait viewport; formations are adapted from FFBE references, not extracted engine coordinates. */
export const BATTLE_VIEW = { width: 720, height: 1280 };
export const BATTLE_ART_SCALE = 0.8;

export function getBattleLayout(width: number, height: number) {
  const partyTop = height - 276;
  const fieldTop = 108;
  const fieldBottom = partyTop - 110;
  const fieldHeight = fieldBottom - fieldTop;
  const slot = (x: number, y: number) => ({ x: Math.round(width * x), y: Math.round(fieldTop + fieldHeight * y) });
  return {
    partyTop,
    rowHeight: 80,
    rowGap: 8,
    commandY: partyTop - 174,
    party: { cloud: slot(0.67, 0.70), aerith: slot(0.83, 0.44), barret: slot(0.83, 0.95) },
    enemies: { solo: slot(0.25, 0.65), top: slot(0.32, 0.42), bottom: slot(0.32, 0.88) },
  };
}
