# BMB node type 7 (lightning emitter) and type 15 (FieldGoal) — findings 2026-11-08

Status (2026-11-08, later the same day): RENDERED as an approximation. `tools/bmb_prune.py` still
omits type 7/4/15 subtrees, but records every type 7 node whose parent survives as an
`effect.lightning` entry (parent node, colour +104, life +280, start +272, texture via the Particle
binding block, FieldGoal child count). `src/effects/lightningLayer.mjs`, created per layer by
`PreparedSceneBridge.mjs` (frozen player untouched), draws entries WITH FieldGoal children as
jagged additive textured strips (10 segments, jitter re-seeded every 2 frames) from the parent
node's world position to the member's target centre; a source sitting on the target strikes from
420 px above. Delita's Thundaga Blade (200720) is published with it and matches the original
recording closely (`tools/data/lightning-20261108/compare.jpg`). Type 7 nodes WITHOUT FieldGoal
children (cure/aero/barrier effects) are still omitted: they are probably ribbons/trails.

## What it is (original reference)

BlueStacks recording of Delita's Thundaga Blade (200720), 2026-11-08, local only:
`tools/data/bluestacks-20261107/thundaga.mp4`, frames `.../thundaga/t*.jpg` (0.3 s steps),
sheet `.../thundaga-sheet.jpg`. Sequence: charge flash at Delita → screen dims → thin jagged
lightning bolts strike vertically from the top of the screen onto the enemy, flickering for
~1 s → yellow ground burst. The jagged bolts are the type 7 nodes; each type 7 node in the
thunder effects has FieldGoal (type 15) children.

Effects containing type 7 (staged locally): bm_2003_thunder1, bm_2010_thunder2,
atk_thunder1_yellow, sp_20103_madoulaser, atk_aero1/2_*, atk_fire4_green, eff_fullcure_*,
wm_1016/1018/1019/1020/1027/1029 (cure/raise/esuna/dispel/gadia), gm_3002/3008/3019/3038,
atk_barrier_yellow, eff_convergence_explosion_orange (28 BMBs, 70 nodes). No local BMSLN
authoring exists for any of them; the 3957-project corpus has no node type beyond
ControlNull/EmitterQuad/EmitterParticle/EmitterModel/EmitterSimpleParticle/FieldGoal.

## Record layout

- Size 1856 bytes (Particle = 1840). The header (kind, size, child count at +8, words 0–31,
  resource binding block at +64) is identical in shape to EmitterParticle (type 3).
- Statistical alignment of 70 type-7 records against 400 Particle records (word classes:
  zero / -1 / small int / plausible float), best shift = type7 offset − particle offset:
  | type 7 range | shift | notes |
  | --- | --- | --- |
  | 0–127 | 0 | header, bindings, colour at +104 (e.g. 0.97/0.64/0.14) |
  | 128–~500 | +32 | tint 152→184 (1/1/1), life 248→280 (20), priority 408→440 (0.5) |
  | ~500–700 | unclear (+64 / 0 candidates) | likely the inserted lightning block (360/180 angles, counts) |
  | ~770–1400 | +24 (mostly) | curve/control blocks |
  | ~1400–1856 | +8 / ambiguous (-1 runs) | trailing tables |
  Lightning-specific candidates in the thunder1 record: +304 = 200 (bolt length?), +324..340
  small ints (segment counts?), +464 = 360 and +472 = 180 (angle ranges), +736 = 50,
  +816..836 = 100/100/100 and 10/10/10 (size/jitter ranges), +876..896 = 128/128/128, 0.5×3.
  None of these are verified; they need the native constructor or more contrasting samples.
- Reproduce: `tools/data` alignment script lived in the session scratchpad; rerun by
  classifying 4-byte words of all type 3 and type 7 nodes from `tools/data/**/*.bmb` and
  comparing class histograms per offset with shifts 0..64.

## FieldGoal (type 15)

208 bytes; all observed goals carry no translation (zeros), ints at +72 (257), +76 (15),
+84 (6), +88..96 (1,1,1) and floats +112 = 360, +120 = 180, +128 = 1, +156..164 = 1 — angle
ranges, i.e. a randomised direction/attractor rather than a fixed endpoint. In the original the
bolts land on the enemy, so the goal is most likely resolved from the effect's target/anchor.

## Original implementation plan (steps 1–2 done, see status)

1. Preparation (approximation only): instead of dropping type 7, emit `plan.lightning[]` per
   effect: parent node (kept index), texture binding (read with the Particle binding offsets),
   life (+280), birth/generation (+272..), colour (+104), priority (+440) and the raw candidate
   block for later refinement. FieldGoal children stay dropped but are counted.
2. Rendering in `PreparedSceneBridge.mjs` (the effect player is a frozen identity — never edit
   it): a companion three.js layer that, for each active lightning entry, draws a jagged
   additive textured strip from the parent's world position towards the target (goal = target
   centre, falling back to straight down), 8–12 segments with random perpendicular jitter,
   re-seeded every 2–3 frames for flicker, alpha from life. The parent's world position needs a
   cheap accessor; derive it from the player's groups via the traceSnapshot node mapping once
   (like `applyOriginalDrawOrder`) and read `group.matrixWorld` per frame.
3. Gate by a plan field so accepted skills stay byte-identical; record every assumption in
   plan.approximations; compare Thundaga Blade side by side with the recording above.
