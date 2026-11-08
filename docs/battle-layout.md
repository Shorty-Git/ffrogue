# Desktop battle UI

Status 2026-11-07 (UI milestones 1 target-first and 2 FFBE visual design). Direction and acceptance goals
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

## Visual design (UI milestone 2)

The HUD combines original FFBE battle UI parts with FFRogue layout and typography
(Cinzel for names, Source Sans 3 for values):

- Dock and encounter caption: the FFBE window frame (silver border, filigree
  corners, navy fill) as a CSS `border-image`.
- Party cards: original party-unit base and portrait frame; original HP and MP
  gauges ("HP"/"MP" labels) with their bars. HP bars switch green → yellow → red
  above 50 % / above 25 % / below, as in FFBE. Card states: active (silver glow,
  gold status), ready, acted (dimmed), K.O. (grey), ally target (pulsing).
- Commands: original attack, magic and ability icons on a deep-blue plate
  (`magic` for `magic_atk` skills, `ability` otherwise), name, cost, key hint.
- Enemy plates: name and HP over a dark fading band, original gold-ornamented
  enemy HP gauge with green/yellow/red bars; bosses get a wider gauge.

`tools/export_battle_ui.py` (project Python with Pillow) extracts these parts from
the offline Godot atlas resources in `assets/ui/battle/*.tres` and composes the
window frame from `assets/ui/window/window_*`. Output and provenance (source,
atlas region, SHA-256): `public/assets/ui/battle/provenance.json`. Gauge bars sit in
measured tracks: unit gauges 186x26 with the 180x4 bar at (3,19); enemy gauge
416x40 with the 374x16 bar at (21,8).

The same style covers every DOM menu (title, team draw, party, rewards,
replacement, awakening, results, dialogs, arena gallery) through
`src/ui/ffbeTheme.css`, loaded last: `.rpg-panel` uses the FFBE window frame,
`.rpg-button` the blue command plate, titles get silver lettering with a crystal
ornament, and member cards show the same portrait frame and HP/MP gauges
(`src/ui/ffbeGauge.ts`) as the battle dock. Reviewed animations (title crystal,
slot lever and reels, awakening) are unchanged. The locked battle HUD stays visible
under the reward, replacement and awakening popups instead of leaving an empty strip.
Menus were checked at 1440x900 and 375x812 (no horizontal overflow).

Skill icons: commands, team-draw reels, member skill lists, replacement cards and
skill rewards (as a badge on the portrait) show each skill's original FFBE icon from
`tools/export_skill_icons.mjs` (see docs/character-import-workflow.md).

HP/MP changes animate: before each HUD re-render `captureGauges` reads what every
keyed gauge currently shows, `animateGauges` restarts the new markup from there and
CSS transitions carry the bar (0.28 s) and, for HP, the original red damage trail
(holds 0.35 s, then 0.55 s). Checked in Chrome: an Attack on a 3,500 HP rat moved the
bar 1.00 → 0.85 in about 0.5 s and the trail followed by about 1.2 s.

Limit Burst (2026-11-07): heroes with a published Limit Burst get the original LIMIT
gauge under MP and a fifth command (key 5). Rules in `src/run/limitGauge.mjs`
(FFRogue rule, not the FFBE crystal formula): 0–100, carried to the next battle for heroes who end it standing (since 2026-11-08); +25 per own completed
action; damage taken adds 60 × damage / max HP (at least 1); the Limit Burst needs 100,
empties the gauge at commit and earns nothing itself. Full gauge: gold frame, glowing bar,
"READY", pulsing purple command.

Checked at 1920x1080, 1440x900, 1100x760 and 900x720: the dock fits without
scrolling.

Command details (2026-11-08): hovering or focusing a command — also a disabled one — shows
`name · description` in the prompt line (gold tint) while a command is usable; leaving restores
the battle message. Disabled skills append why ("Not enough MP x/y"); the Limit Burst explains
how its gauge fills. The native `title` tooltip was replaced by `aria-description`. The caption
shows run progress ("Battle 1 / 4", "Boss 2 / 4") and a small key legend sits under the prompt.
Checked in headless Chromium at 1440x900 and 1100x760 (no page overflow).

## Development hooks

In development builds `window.__ffrogueGame` exposes the running Phaser game for
browser review scripts (`src/main.ts`). Training battles for review start with
`createTrainingRun` (`src/run/trainingRun.ts`), e.g. encounter 2 for two enemies.

Manual Limit Burst test: `/tools/test-source-limit-burst.html` (dev server) starts a training
battle where every hero with a published Limit Burst has a full gauge; arena, enemy count,
"keep full" and restart are on the page. `?reserve=<key>` swaps the third party member.
No run save is written.
