# Desktop battle UI

Status 2026-11-07 (UI milestone 1, target-first). Direction and acceptance goals
live in `docs/vision.md` section 6.

The target is desktop only: one 1000 x 1100 internal Phaser viewport scaled with
FIT. Resizing preserves the run; there is no device detection or mobile layout.

## Layers

Phaser draws the arena, actors, Source effects, damage numbers and action
banners. The DOM `CombatHud` (`src/ui/CombatHud.ts`, `src/ui/combatHud.css`)
tracks the canvas rectangle and draws everything interactive: the encounter
caption, enemy HP plates, the target cursor, invisible enemy click areas and the
bottom dock (three party cards, Attack plus up to three skills, the prompt line).
BattleScene rebuilds the HUD state every 80 ms; the HUD re-renders only when the
state changes. Because the HUD is DOM, it never enters the canvas framebuffer that
the Source review pages compare.

## Interaction contract (target-first)

- There is always a current enemy target during command selection. It starts on
  the first living enemy and moves to the next living enemy when it falls.
- Clicking an enemy, or Left/Right/Up/Down, changes the target at any time during
  command selection without spending an action. Re-clicking the current target is
  silent. A running action keeps its target.
- The target is marked by the crystal target cursor (arrow on the party side of the
  enemy, gentle bob, no motion with `prefers-reduced-motion`) and a silver HP plate.
- Attack and single-enemy skills commit with one click (or 1–4) on the current
  target. Area, party and self skills also commit at once and mark their
  recipients with a soft glow at the feet.
- Only single-ally skills still wait for an ally choice (ally sprite, party card,
  arrows + Enter). Cancel/Esc drops that pending choice without spending anything.
- Clicking a party card or hero sprite selects that hero; K.O. or acted heroes and
  non-command phases are rejected. MP/HP are checked when the command commits.
- Re-entering a command during an action does nothing.

Covered by `tools/test_combat_regressions.mjs` (target-first, ally-choice and party
input tests) and the Source review page (`tools/test-source-scene.html`).

## Arena and formation

Arenas use proportional cover. `src/data/battleArenas.ts` defines source sizes and
reviewed floor bounds (forest 56–80 %, reactor 54–76 % of source height). Floor
bounds go through the same cover scale and crop as the image. These are visual
layout settings, not coordinates recovered from FFBE.

Formation slots use normalized positions within that floor region. Enemies have
top/center/bottom roles; the center is also the single-boss slot. A large boss
still needs its actual sprite bounds reviewed.

Melee offsets were audited against processed hit-frame opacity: Cloud attack frame 2
spans about -206 to +24 px from his logical foot at runtime scale 2; Aerith frame 19
spans -282 to -116. Their approach translations of +72 and +160 px place the visible
attack across the target. Approach Y comes from the selected enemy; heroes return to
their exact home slot.

## Original UI art (currently unused)

`py tools/export_battle_ui.py` exports five reviewed FFBE battle UI regions (command
plate, party plate, attack, magic, ability icons) with provenance to
`public/assets/ui/battle/`. The previous Phaser HUD used them; the DOM HUD does not
load them. They remain available for the visual redesign.

## Development hooks

In development builds `window.__ffrogueGame` exposes the running Phaser game for
browser review scripts (`src/main.ts`). Training battles for review start with
`createTrainingRun` (`src/run/trainingRun.ts`), e.g. encounter 2 for two enemies.
