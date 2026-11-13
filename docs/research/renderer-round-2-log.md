# Renderer round 2 - working log

Brief: `docs/briefs/renderer-round-2.md`. This file is the hand-off: what is done, findings with evidence,
dead ends and the exact next step. Newest entry at the end of each section. Start state: commit `7190f0d`,
546 published scenes, player `103046af…`, baseline frames in `tools/data/scene-baseline/baseline`
(local, ignored).

How to work (from round 1, see `docs/current-state.md` "Renderer completion session"):
- Dev server: launch config `ffrogue-review` (port 3001); it stops when a session ends, restart it.
- Decoder change (tools/*.py): `node tools/reprepare_scene_plans.mjs` then
  `node tools/rebaseline_scenes.mjs republish`, `capture --to candidate`, `compare`, look at
  `tools/data/scene-baseline/compare.html`, `accept [--force keys]`. Full cycle about 27 minutes.
- Player change (`src/effects/originalEffectPlayer.mjs`): same cycle without re-prepare; afterwards update
  the player hash pin and the three Cloud manifest pins in `tools/test_scene_migration.mjs`.
- Do not edit `tools/prepare_scene_flashes.py`, the player or `tools/test-source-frames.html` while a
  republish or capture runs. Python cannot always write files Vite watches (`src/`, `tools/`): use the
  editor tool for those when a write fails with "Invalid argument".
- Counts at the start: 64 player issue causes, 161 scenes with rectangle corners, 6 scenes without a
  visible effect in the samples.

## Status

| Step | State | Commit |
| --- | --- | --- |
| A1 particle geometry / native X | done (generic billboard, radius one) | see git log "Renderer round 2 A1" |
| A2 parent alpha / transform combinations | open | |
| A3 particle facing / model billboard | open | |
| A4 emitters with an extent | open | |
| A5 sort priority / type 7 | open | |
| A6 RGB random range / random texture tint | partly: initial texture tint applied (with A1); random range and tint curves open | same commit |
| B7 six scenes without visible effect | open | |
| B8 known boxes | open | |
| C9 triage of 161 candidates | open | |
| C10 unlock | open | |

## Log

### A1 findings (before implementation) - what a Particle is natively

Evidence, all from data already in the repository (no new capture):
- Published Particle nodes carry `nativeParticleX` (from `tools/native_particle_dispatch.py`): the source
  fields +0x12c (scale) and +0x128 (rotation) select native functions, and the resolved symbol names give
  their meaning. Over 3,184 Particle nodes in the published scenes:
  - scale make-vertex: 1 `One` (26), 2/5/6/7 `Const` (485), 3 `Velocity` (76), 4 `AccelVelocity` (6),
    15 `OneX` (767), 16/19/20/21 `ConstX` (878), 17 `VelocityX` (925), 18 `AccelVelocityX` (11);
    10 unresolved. So 2,581 nodes use an X consumer (one scalar for both axes), 593 a three-axis one.
  - scale init: `InitConst`, `InitVelocity`, `InitAccelVelocity`, `InitValueCurve` (5, 19),
    `InitValueRandomCurve` (6, 20) and their X forms. These are the motion modes the player already
    evaluates per node (value, speed, acceleration, curves).
  - rotation make-vertex: 0 none (2,375), 1/6 `Const` (661), 2 `Velocity` (128), 3 `AccelVelocity` (10).
- `docs/research/native-particle-x-scale.md` (ARM64 reference, 36 fixtures): the X consumers write local
  scale [s,s,s] and group factors [g,g,g] with g = X of the inherited group vector; half-width and
  half-height are s*g. The non-X `Const` consumer copies the three group components independently.
  A Particle is therefore a quad of radius one: a Particle with scale 1 is 2 units wide.
- `docs/research/particle-geometry-subset.md` / `particle-locator-projection.md`: the native vertices of the
  measured node are view-aligned (screen-facing); the hierarchy gives the centre, not the plane.

What the player does today: the two supported subsets (`particleGeometryEligibility`,
`nativeParticleXEligibility`) draw a view-aligned radius-one quad. Every other Particle (the 70-86 % in
the issue inventory) is drawn as a 1 x 1 plane inside the transformed hierarchy: half the native size and
tilted with its ancestors (edge-on when an ancestor is rotated about X or Y).

Plan (approximation plans only, strict plans untouched): one generic billboard for every Particle outside
the two verified subsets.
- centre = hierarchy position (unchanged);
- half-width = length of the world X axis of the node's evaluated matrix (local scale x times inherited
  scale); half-height = the same for an X consumer (indices 15-21), else the length of the world Y axis;
- roll = in-plane angle of the world X axis (own Z rotation plus ancestor Z rotation; X/Y tilts do not
  tilt the quad);
- recorded as a player issue ("approximate view-aligned geometry"), because ancestor roll inheritance,
  `One`/`OneX` ignoring an authored scale other than 1, and the group vector under rotated ancestors are
  not verified natively.
Screen-layer thresholds for Particles stay at 190 authored units: with radius one that is 380 native
units, the full width of FFBE's 360-unit view (consistent with Flare's 190 x 210 background).

### A1 implementation notes (2026-11-13, working tree, not yet committed when written)

New evidence source: the official Effekseer conversions (`*.efkefc`, 5,779 files next to the originals in
`rawdata/assets/battle_effect`). `tools/efkefc_project.py` reads their editor project (format documented in
the file). Findings from it:
- `bm_2035_flare_bg`: the Particle with scale 1 under a 190 x 210 Null became a Sprite with Scale 2/2/2
  (emitter_0) and the 190 x 210 Particles became 380 x 420 (emitter_1/2): radius one confirmed.
- 216 effects with matching node counts: Particles are Sprites with a billboard type (249 nodes
  `Billboard=1`, the rest not drawn), Quads are `Billboard=2` (387, fixed plane) or 1 (32). So a Particle
  faces the camera and a Quad is a free plane, as assumed.
- Dead end avoided: Null nodes carry the Square flag too (`uniformScale`), so a Null scale 10/1/1 is a
  uniform 10. I first read such Nulls as "X only" and suspected the native X rule; the player's matrices
  were already uniform.
- Decision: inherited scale stays component-wise (world X and Y axis lengths). The native "group X for
  both axes" rule of the X consumers is not applied because what the engine passes as group vector is
  not verified (documented at `approximateParticleDisplay`).

Changes in the working tree:
- Player: `approximateParticleDisplay` + branch in the update loop (approximation plans, Particles outside
  the two verified subsets): view-aligned quad of radius one, roll = in-plane angle of the world X axis.
  One issue text per such Particle instead of the subset reasons.
- `prepare_scene_flashes.py` `_effective_size`: Particle scale counts double (radius one), so screen-layer
  thresholds are in displayed units; tests adjusted (sizes 120/180/100 -> 90).
- Texture tint (part of A6, needed here): `original_basic_material.py` keeps the initial first-texture
  colour scale in approximation plans also where the native fragment is not the pinned Basic family or the
  tint is random/animated (`nativeBasicTint.approximate`); the player applies it. Example: the glow
  Particles of `eff_3029_weak_red_front` node 29 have tint 0.82/0.34/0.22 and drew white.
- Tools: `tools/inspect_scene_frame.mjs --key K --frame N` lists the visible instances of a frame with
  their screen boxes (uses `window.sceneFrames.inspect` in `tools/test-source-frames.html`).

Open question, not resolved: `eff_3029_weak_*` (the hit effect of elemental weakness, used by many
skills) spawns about 13 glows of 900-1,300 px (scale 25 +- 12.5 under a uniform 10 Null, radius one).
Texture `glow_011` is dim (max 73/255) and fades to 0 at its border, so this is a bright orange burst
over most of the view for about 0.4 s, not a box. It follows from the source data and the port's size
rule; whether FFBE really looks like that needs an original reference. Left as is.

### A1 result (2026-11-13, committed)

Full cycle (re-prepare, republish, capture, compare against the round-1 baseline): 52 unchanged, 417 ok,
77 flagged, no playback errors; all accepted as the new baseline after looking at 6 sheets
(barret_remake_flamethrower, terra_fire, cecil_curaga, kain_darkness, tifa_ac_limit_combo_sublimation
before/after). Player hash now e52a4d77…; pins via `node tools/update_scene_pins.mjs` (new helper).
- Better: flames and sparks stand upright at full size (terra_fire); texture tints give screen layers and
  glows their colour (tifa_ac_limit_combo_sublimation: washed-out white before, dark purple speed lines
  now; 2,496 nodes carry an approximate tint, none above 1).
- Worse or unclear: stacks of the dim `glow_011` texture saturate into bright rounded squares at twice
  their former size (cecil_curaga frame 73: node 26 of wm_1016_cure4_front, 154 instances; kain_darkness
  frames 65-102). The size follows the port's rule; whether the instance count or brightness is right is
  open. Candidate cause to check next: generation count of such emitters (`instances()` in the player,
  "repeated-generation-played-once" approximations) and whether SemiAdd should use texture alpha.
- Counts: player issue causes 64 -> 57; scenes with rectangle corners 161 -> 169 (bigger glows);
  scenes without a visible effect in the samples 6 -> 5.

### A2/A3 findings (2026-11-13, research only, nothing implemented yet)

Parent alpha (A2), from 291 effects whose `.efkefc` and `.bmsln` node counts match (1,798 drawable nodes)
and from the published plans (`authoringInheritance`):
- Authoring knows two combinations in practice: `AlphaParentNodeInfluenceType` Lerp with
  `ParentAlphaRate` 0 (1,278; no parent influence) and Multiply with rate 1 (515; own alpha times parent
  alpha). Lerp/1 occurs 3 times, Multiply/0 twice. In the published plans: rate 0 in about 10,400 nodes,
  Multiply/1 in 1,634, Lerp/1 in 11, fractional rates not seen in the first 200 scenes.
- The player multiplies by the parent alpha whenever the rate is not 0 (`createTransformEvaluator`), which
  is exactly Multiply/1. So the issue text "nonzero parent alpha influence remains unverified" (351
  scenes) describes a case that is correct by the meaning of the two authoring fields; only Lerp with a
  rate above 0 and fractional rates are really open. Planned: `alpha *= 1 + (parent - 1) * rate` for
  Multiply, `alpha = own + (parent - own) * rate` for Lerp, issue text only for the rare cases.
- The official conversion exports no inherit setting, so it gives no further evidence.
- Parent colour (`colorRate` not 0, about 160 nodes in the first 200 scenes): not touched. The Null
  `initialColor` ambiguity noted in renderer-coverage-priorities.md is unresolved.
- Parent transform combinations (136 scenes): rotation Off (109 nodes), rotation/translation
  OnGenerateTime. Not researched yet.

Facing (A3), authoring survey over 3,000 `.bmsln` files:
- EmitterParticle `Detail_Basic_QuadType` is Billboard in 4,522 of 4,522 nodes (confirms A1).
- EmitterQuad `Detail_Basic_QuadType`: Polygon 6,061, Billboard 2,144 (26 %), Facing 11, Directional 2,
  Polyline 2. EmitterModel `Detail_Basic_ModelType`: Billboard 1,225, Polyline 5, otherwise Standard.
- Binary fields found by comparing staged originals with matched authoring (unique offsets where one
  value per name holds for every node): Quad +2120: 0 Billboard, 1 Polygon, 2 Facing (428 Polygon, 15
  Billboard, 1 Facing nodes); Model +1896: 0 Billboard, 1 Standard (810 Standard, 94 Billboard nodes).
  Directional/Polyline ids are not seen in the staged set and must stay "Unknown".
- Planned: decode both into the plan (`facing`), compare with authoring where matched, and draw Billboard
  Quads/Models view-aligned in approximation plans (unit Quad: world X/Y lengths; Model: scale and Z roll
  kept, X/Y tilt dropped).

Next step when resuming: implement A3 (decode `facing` for Quads at +2120 and Models at +1896 in a small
tools module called from `prepare_original_preview.py`, test against matched authoring, draw Billboard
Quads/Models view-aligned in the player for approximation plans), together with the A2 alpha formula;
then one full cycle (re-prepare, republish, capture, compare, accept, `update_scene_pins.mjs`, tests, commit).

