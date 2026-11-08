# FFRogue - Skill Reconstruction Map

## Gameplay data model: auto-revive and Limit fill friendly effects (2026-11-08)

Not a reconstruction step: no presentation, recipe or Source skill changed. Two reusable
review-owned `allyEvents` kinds now exist for support skills that previously had no game effect:
`auto-revive` (`hpFraction` 0..1, `turns` 1..9; Reraise-style status consumed by the next K.O.
in its window) and `limit-fill` (`amount` 1..100 on the recipient's Limit gauge; heroes without a
Limit Burst have no gauge). Validation lives in `reviewedSkillEvents`
(src/effects/skillDamageTimeline.mjs); statuses in src/effects/heroBuffs.mjs; battle handling in
BattleScene (friendly event loop, enemy impact). Scopes stay `self`/`party` (stationary). Reraise
itself is still gated: single-ally scope is not admitted by sceneProfile/the presentation
pipeline, and its MAGIC body/timing and rendering gates are unchanged. Speed Drink (double-limit)
and Store (charge) need their own reviewed rules; neither is approximated by these kinds.
Evidence: tools/test_friendly_support.mjs (5 pass), combat regression "a lethal enemy hit consumes
auto-revive..." (57/57 pass). Not browser-verified: no published skill uses the kinds yet.

## Product update: authoring-free approximation unlocks Cloud AC's Limit Burst (2026-11-07)

Critical-path change for P07/P10/P30 under the developer's visual bar (docs/vision.md): the
"exact authoring-free profile" is NOT claimed; instead approximation mode now proceeds without
matched BMSLN. Decoded IBMB controls stay authoritative; every other authoring field comes from
the local BMSLN corpus mode per node type (tools/effects/authoring-defaults.json, reproducible
via tools/build_authoring_defaults.py, corpus hash recorded) and is listed per node in
plan.approximations. Strict preparation and all stable enum tables are unchanged.
Supporting generic rules: binary ConstFlat Quad RGB in approximation mode, mean RGB for constant
opaque corner gradients, single-shot generation modes as mode 0, screen backdrops for Model
(width >= 640) and opaque long-lived Quads (fitted to the canvas via host.view).
Evidence: Cloud AC Omnislash Version 5 (207001605, effect groups 8007680/81/82, three BMBs, no
BMSLN) published; LB sync 5/5 hits drift 0; Source review 19/19 applicable, 0 regressions;
88/89 tests (known Brave Slash alarm). Remaining universal gates: unknown node types 4/7/15,
ambiguous resource versions, conditional/non-file groups. Next: re-run the authoring-only
blocked roster abilities (ROSTER_SKILL_COVERAGE.md) through this path and review visually.

## Product update: first Limit Burst (Cloud, Omnislash) and visual approximation mode (2026-11-07)

Acceptance bar per docs/vision.md: looks right, hits the target, impact on the enemy;
no native fidelity claim. Omnislash (limitburst 207000105, 15 hits, effect groups
8003710/11/12/13/25, 729 frames) is published as `cloud_omnislash` and playable through
the new LB gauge.

Pipeline changes (all explicit, none silent):
- `inspectCharacter` adds the form's own Limit Burst (`unit.limitBurstId`) as catalog kind
  `LIMIT`; its `effectFrame` timeline is mirrored as `effectFrames`.
- Recipe skills may use `type: "LIMIT"`; `sourceDamageEvents` reads LB hits directly from
  `limitburst.attackFrames` (no unit-attack prefix); the choreography identity check skips
  LIMIT rows, which carry no motionType/moveType; `limit_atk` is an admitted body phase.
- `prepare_original_preview.py --approximate-unverified`: active source curves on channels
  without a verified binary offset and animated two-texture colors/curves are held
  constant; anchor mode 3 is the caster's unit rectangle (`caster-unit`; self commands keep
  their proven `target-unit`); unknown parent-control enum
  values take the matching authoring project's named value for that node only. Every case
  is listed in `plan.approximations`. Without the flag everything stays strict, and the
  stable enum tables in `bmb_source_controls.py` are unchanged (the sparse scale-0 evidence
  noted in test_bmb_source_controls.py still does not broaden the stable profile).
- Caster-anchored strikes (2026-11-07 follow-up): for plans with `caster-unit` members the
  host moves the caster so the most frequent caster-unit placement point (the hit members)
  lands on the target's centre (`casterStrikeOffset`, PreparedSceneBridge.mjs). FFBE's fixed
  party/enemy distances are translated to the FFRogue arena instead of a fixed recipe offset;
  presentations without caster-unit members keep the reviewed approach offset. First read of
  mode 3 as the target placed every Omnislash hit 280 px left of the enemy.
- Timing follow-up: BattleScene's 80 ms hit-stop paused the caster's body on every hit of a
  dashing skill while the Source effect/damage clock ran on; Omnislash's body drifted up to 15
  frames (>1 s). Prepared Source actions no longer hit-stop. Measured with
  `tools/review_limit_burst_sync.mjs`: body drift ≤ 1 frame at all 15 hits, target flashes at
  the damage frames.
- Scene manifests may run up to 900 frames (`MAX_SCENE_FRAMES`, was 600).
- Body sheets wider than 16384 px (WebGL limit) wrap into a row-major grid
  (`tools/sheet_grid.py`, used by export_unit.py, prepare_cgg_body_layers.py and
  validate_character.py); `tools/wrap_wide_sheets.py` migrated the 22 published
  `limit_atk` sheets, which previously rendered as a black box. Narrower sheets are
  byte-identical.

Reproduce:
```powershell
node tools/plan_source_imports.mjs --select cloud:207000105 --output tools/data/omnislash-20261107/intake
<python> tools/stage_source_imports.py --selection tools/data/omnislash-20261107/intake/selection.json
<python> tools/prepare_original_preview.py --source tools/data/omnislash-20261107/intake/cloud-207000105/skill-source.json --unit cloud --motion atk --recipe tools/characters/cloud.json --profile source-preview-v1 --authoring-directory rawdata/assets/battle_effect --native-shaders-apk tools/data/memorial-audit/installed-base-v208.apk --native-shader-package tools/data/particle-native-audit/bmshaderpack.bin --renderer-reference tools/data/memorial-audit/diagnostic-v7/renderer-reference.json --approximate-unverified --output tools/data/omnislash-20261107/intake/cloud-207000105/plan.json
node tools/publish_scene_presentations.mjs --recipe tools/presentations/cloud-omnislash.json
node tools/import_character.mjs --recipe tools/characters/cloud.json --publish-skills-only --python <python>
```
Staging still reports the strict audit blockers (unverified curves); they are expected
and covered by the approximation list. Approximations in this plan: 35x
Texture1_Color_Scale_Rgb curve, 14x Rotate curve, 7x Texture1_Translate curve, 2x animated
texture color, 17x anchor mode 3 (caster-unit), 8x Null rotation raw 6 = On and 8x type-2 scale raw 0 =
Off taken from the authoring projects. Visual check: headless Chrome frames of the full action.


Twelve Source presentations now carry reviewed original effect-group sound events.
See [Source combat audio](source-combat-audio.md) for per-skill status and the
remaining classic Cloud visual-clock and source gates.

Original class-up draws now include the verified higher star and base NV
bodies. The existing 15 Source definitions are reused with each admitted
body. No EX, Brave Shift or NV+ skill contract has been admitted. See
`../character-import-workflow.md` for the original graph and asset evidence.

## Product update: original 7-star bodies, unchanged skill reconstruction (2026-11-02)

No BMB/Hardshot/hero/enemy-skill or background reconstruction in this block.
All15 published Source skills and266 protected original Source/5-6-form files
retain their hashes. Mako's accepted isolated linear fog sampling, original
240-frame/30FPS packets and mainline area shortlist remain unchanged.

Original unit/class-up chains prove Cloud207000107 and Aerith207000407 are7-star
forms of their existing units. New reviewed body namespaces satisfy every current
Source phase: all5 Cloud skills and Aerith Seal Evil have actual7-star casts;
real boss rewards/next-battle texture IDs and skip/reload fixtures are separate
checks. These are original body form imports, NOT new skills or evidence that any
unknown Motion/BMB profile is supported. Cloud207000117 remains unreviewed.

Run policy is explicitly FFRogue: new short expeditions use highest-reviewed
5->7; old saves and normal sequential5->6->7 are retained. Awakening glow/particles
and the mechanical slot lever are also presentation, not original FFBE semantics.
The lever does not own RNG; exact state/stream comparisons protect existing draws.
Title diamond repair restores corrupted UTF-8 text, not a new asset or shader.
See character workflow, roguelike architecture and handoff for checks and limits.

## Product update: Awakening and reviewed stage sampling (2026-11-02)

No BMB/original enemy skill reconstruction in this block.15 Source skills and
their plans/animation data remain unchanged. Same-unit Cloud/Aerith5->6 upgrades
now have saved one-shot presentation over the existing Victory scene; Source casts
next battle/reload use the original6-star textures. No invented forms/art.

Stage sampling is a declared FFRogue display adaptation, not native semantics:
three original low-resolution fog/gradient cells get isolated linear sampling;
hard atlas remains nearest. All240 original frames/30FPS,7,451 packets/cells/
transforms/blends are preserved. Native FFBE sampler state remains unmeasured.
Future area inventory found8 exportable backs among12 selected profiles; only
2013_06 needs deformation in that subset. No third area/forest replacement enabled.
Current workflows and handoff contain provenance, tests and explicit limits.

## Product update: measured loading and source-authored animated arena (2026-11-02)

15 Source skills unchanged,2 areas/4 fights. Body sheets now load by actual battle
requirements before actor creation; no clip or effect timing changed. The three
Cloud frozen effect regions remain0 pixels different (known1000-pixel HUD border
reported separately). The existing182 draw windows/packet regression was rerun.

Mako Reactor SSPB-v1 is now decoded/prepared using the historical v1 SDK, yielding
240 frames/30FPS and nested light/fog/mako quads. Existing Phaser renders it behind
actors with the same static-arena crop. Native FFBE stage pixel parity is NOT
certified; camera/layer/loop policy remains explicit FFRogue presentation. Forest
deformation stays blocked rather than omitted. See background-import-workflow.md.

Original enemy skills remain0. Locked On Target staging proved a44-node profile,
not a cheap alternative; Ochu Dance is the shorter no-type7 path. Existing native
body observer is PLAYER-vtable-only, requiring a separate verified monster path
before clips/VFX anchors can be recorded together. No new BMB/Hardshot research.
See enemy-import-workflow.md and current handoff for exact next observation.

## Product update: action presentation and enemy intake (2026-11-02)

2 areas/4 fights retained,15 hero Source skills preserved. Committed actions now
feed a common presentation-only banner. Prepared, exact pivot-aligned resting
pose matches shorten Victory reward readiness without changing body clips or
Source timelines; actor/party celebration follows the same VFX/fade barrier.
No original FFBE victory scheduler claim. Read current handoff for browser clocks.

Enemy master intake:11 original skills,0 fully admitted; Tail Laser(28 nodes, two
unknown type7) and Ochu Dance(12+10 nodes) have staged original resources but lack
complete body/anchor/executable render contracts. Existing group resolver and CPK
stager are reused; no guessed hero-motion fallback or new enemy renderer. Current
FFRogue boss patterns stay explicit adaptations. Stage SSPB-v1 atlases are present;
verified cell/instance/frame interpretation remains open, animated stages0.
Large hero Hardshot/Store work remains paused. Detailed ownership/source/gates:
enemy-import-workflow.md and background-import-workflow.md.

## Product update: themed bosses; skill research paused (2026-11-02)

Microchu/Ochu and Sweeper/Guard Scorpion original body sheets are now namespaced
through the existing enemy actor. Boss patterns/HP phases and enemy impact timing
are reviewed FFRogue rules, not new native/BMB semantics or additional Source
skills. All15 accepted player Source definitions/plans remain unchanged. Read the
current handoff and enemy-import-workflow.md; prior reconstruction evidence below
is preserved. No Hardshot/Store investigation or native capture in this block.

## Product update: centered reward presentation (2026-11-02)

15 Source definitions/player/assets preserved (240 prior hashes). No new native
or BMB semantics. Transparent centered popup replaces the lower dock, keeping the
actual arena, full victory cycles and locked HUD.300 Node/build and real browser
run/reload/viewport checks are recorded in the current handoff. Research below is
paused. The same-series Aerith6-star visual form is now prepared and tested through
the existing boss-reward/form pipeline. Source skill count remains15; no original
engine rule was reconstructed. Current handoff records the source identities,
13 prepared clips, real awakened Seal Evil check and preservation receipts.

## Current product polish; reconstruction still paused (2026-11-02)

The15 Source baseline remains unchanged. Canonical starter figures, visible
win_before/win cycles, reward persistence over the active arena and a shared blue
HUD are product/UI rules, not new reconstructed FFBE/BMB semantics. Read current
handoff and roguelike-foundation.md. Original research below remains resumable.
Strict frozen frames differ only at the intentionally recolored HUD frame y48;
measured-header-excluded effect comparisons remain0 pixels different. No original
reference image was replaced. No new native measurements or skill imports.

## Research paused: roguelike foundation is now the active project

User strategy change after d18fb3f (2026-11-01): preserve15 Source skills and all
known original-engine evidence. No further BMB/Hardshot/Store reconstruction in
the current milestone. Active architecture/UI/run work is documented in
`docs/roguelike-foundation.md` and the current renderer-session-handoff.
The full Barret5-star/future-form distinction, unresolved Hardshot and moving
anchors, Store Billboard/ordering boundary, Motion8 trace and Aerith gates below
remain the exact research resume point. Source animation quality is the accepted
baseline; run balance/skill ranks do not rewrite original metadata or VFX plans.

---

## Current: Barret form-aware full-release decision (2026-11-01)

Parent fadd8bb1392f2309620fe9aa86c0edba333e3fce. Iai Strike personally accepted.
15 published Source skills preserved;0 new skills and0 new renderer rules here.
Read ROSTER_SKILL_COVERAGE.md's current Barret table for all7 series abilities,
current5-star's FOUR ordinary active abilities and its separate Limit Burst.
Source ownership, source presence, prepared preview and full release stay separate.

| Component | Actual new pipeline integration | Not established |
| --- | --- | --- |
| P01/P02 identity/acquisition | formLearning bounds ordinary learning by exact master rarity/maxLv; --current-form requires matching published body/recipe and excludes later-form/conditional/unknown entries | Full account/equipment/quest/enhancement eligibility; no retroactive change to reviewed host balance |
| P23/P30 placement/intake | Existing unresolved anchor dispatch is now reported as an independent planning/inventory gate; Mindblow mode6 is explicitly blocked | No new mode6 or mixed caster/enemy placement equation |
| P29 validation |11 targeted Node tests;7 series abilities/19 BMB+resource sets hash-checked;10 served modules match3001 | No new runtime, battle animation, native writer or pixel test; unchanged prior receipts reused |

Critical path for FIRST BARRET SKILL remains Big Shot: complete Hardshot semantic
plan (19Null/1Quad/10Model/8Particle,38nodes) -> independently validated parent,
generation/material/color output -> explicit bounded Motion8 body contract in
common admission -> complete skill/anchor/gameplay battle validation. Existing
explosion/anchor and measured native body are evidence, not a complete import.
Null matrix/alpha/color/translation/scale, Particle matrix/color/scale, Model
matrix/rotation and compatibility/emission/tint/geometry remain incomplete without
exact authoring. No claim that decoding a next selector alone frees the skill.

Mindblow's12-node missing authoring is smaller but NOT a shorter full path:
unresolved moving anchor6, caster/enemy mixed placement, nonflat Quad admission,
MP drain/restoration and its own phase contract are independent. Grenade has
unknown type7; Hammerblow has unknown type4 plus Motion5/move6.6-star-only
commands are NOT counted as current5-star alternatives. No unrelated new
character or partial effect published to increase the count.

Store follow-up is bounded, not yet authorized as a whole supported profile:
neutral Constant corner values (all white/zero range despite flat=false) need
explicit admission, not new gradient math. Billboard models under X tilt25 and
parent scale75/1/1 require a native writer/view-basis reference. Then reuse native
priority sorting in the common model path (0.2/0.5); charge gameplay draft and
measured body/self-anchor already exist. No body/position remeasurement needed.
Aerith Reraise/MAGIC/negative-time/single-ally/revive and node7 candidates remain
preserved; no immediately freed Aerith skill is claimed. Audio remains deferred.

Evidence tools/data/barret-path-20261101/{barret-resources.json,
effect-path-audit.json,store-decision.json,coverage/inventory.json,node-final.log}.
The prior30-component/nine-node reconstruction statuses remain unchanged.

---

Earlier revision notes (historical; current status above takes precedence):

## Current: measured body phases and one complete existing-roster import (2026-11-01)

Parent ff9fdb066dc2b05e947c544f93272e13b514f1c7. **15 technically playable
Source commands**; the previous14 definitions and published plans are unchanged.
New Jack Iai Strike200300 uses the same Source player. Personal visual acceptance
of the new skill is pending. Sword colors/Delita anchors and their pending latest
personal recheck remain intact. No legacy path, new character or pixel research.

The bounded native body observer now measures actual CGS/frame/counter/end/local
position, separate from animation requests, with identity filtering and dedup.
Big Shot227870 native form207000206: standby11 -> atk3 indices0..27 at constant
local[449,571] -> idle1 at+2166ms relative to command getter. Hardshot factory waits
88/128 and source hitF130 are joined evidence, NOT a measured damage-commit time.
No global Motion8 fallback was enabled. Hardshot's incomplete38-node controls
remain multiple independent release gates; Big Shot is deliberately unpublished.
Independent Store200210 confirms standby11 -> magic5 -> idle1, about682ms to idle,
without movement. Static original virtual dispatch/CGS names corroborate Motion2.

General integration: optional reviewed commandPose separates prepared UI pose,
readiness cycle and executed body phases; old contracts preserve old behavior.
The shared event clock supports explicit per-target execute-or-damage with bounded
chance, unmitigated fallback and declared boss immunity. Gameplay RNG is injectable without changing Phaser IDs or visual streams;
it defaults to Math.random, not a reconstructed independent FFBE RNG stream.
A new original target/range scope gate prevents publishing a reviewed all-enemy
source as a single-target command. No attack clip is inferred from missing data.

Iai Strike's complete3-node original, exact matching project, Model/UV/material
and memberF41/scale250/target-side/+80 source data use the existing accepted
experimental profile. Source eventF45 triggers all-enemy events. Original current
process112/1400,70,100,0 is preserved. Original description explicitly says instant
KO OR partial unmitigated damage to all enemies. Reviewed30% chance,700 fallback
and boss immunity are FFRogue balance, NOT the decoded native formula. Known
model appearance/random-color/global-scale experimental limits remain declared;
no native full-action pixel equivalence or personal visual approval is claimed.

Evidence: tools/data/full-import-path-20261101/{bigshot-body-r2-events.json,
bigshot-motion-decision.json,store-body-actual-events.json,iai-gameplay-source.json,
iai-coverage.json,instant-browser.json,party-release-browser.json,
baseline-release-browser.json,preservation-check.json,coverage/inventory.json}.
See current handoff for exact commands, tests, rollback and next decision.

| Component | New integrated / measured capability | Remaining boundary |
| --- | --- | --- |
| P26 choreography | Real native Big Shot/Store body transitions; optional commandPose independent of readiness/body | No universal Motion8 mapping or native damage-commit/end hook; Iai body uses independently evidenced selector + its own exported clock |
| P10/P30 import | Exact Iai resources/project/composition; mandatory original target/range check in prepared-events | No authoring-free controls inferred; scope decoding bounded to reviewed enemy ability profiles |
| P27/P28 gameplay/integration | All-enemy instant/fallback events, boss policy, one MP spend, same Source player;15 commands | Host balancing deliberately differs from version-specific native process formula |
| P29 validation |82 Node tests incl44 actual-method combat checks,15 Python tests, build; five real instant lifecycle cases and8 party actions;3 frozen Cloud frames unchanged | Targeted broad subset, not entire historical native suite; no new Iai native pixel comparison |

### Full-release decision, not field-count priority

| Candidate | Proven data / shortest unresolved set | Decision |
| --- | --- | --- |
| Barret Big Shot | Body now measured; explosion/anchor checked; Hardshot38 nodes still incomplete Null/matrix/compatibility/emission/tint/model inputs, and full profile gates | Defer; not one bounded capability away |
| Aerith Reraise |81-node prepared plan; MAGIC negative-time/body, single-ally selection, auto-revive and effect-profile gates | Preserve; several independent prerequisites |
| Delita Store | Exact plan and native self-placement/body;3 nonflat Quad colors,3 Billboard models and draw-order boundary; charge draft archived | Best small existing-roster render-capability follow-up, not currently freed |
| Jack Iai Strike | Complete3-node source effect, existing supported model profile; original all-enemy instant/fallback semantics, independent command/body phases | Released and battle-tested; personal review pending |

Next bounded decision: inspect Store's three nonflat Quad color outputs against
existing color-writer evidence and Billboard/model ordering support TOGETHER.
Only implement if that pair offers a short complete release path. In parallel
reuse measured body observer to check a genuinely near-ready main-party profile;
do not automatically resume the next Hardshot parameter group. No other skill
is claimed immediately freed by instant events or commandPose. Existing nine-node
matrix/completeness matrix below is unchanged by this block.

---

Earlier revision notes (historical; current resume above takes precedence):

## Current: grouped control intake and bounded import decisions (2026-11-01)

Parent98091bb. Still14 technically playable Source skills; no new publication or
runtime visual change. Sword's corrected colors and Delita anchors are preserved.
This is input/automation progress, not another completed skill or reconstructed
node. Existing30-component and nine-node completeness assessments remain bounded.

| Component | New verified capability / integration | Open dependency |
| --- | --- | --- |
| P07 parsing | Quad colorRate516; Particle rotation508; Model translation568/scale576 verified on matching independent originals | intake only; full matrix/Null parent fields, compatibility, appearance/emission/tint/geometry still incomplete |
| P10/P30 resolution/intake | common read_intake_controls automatically feeds existing staging, hash reuse and control coverage;14 candidate inputs improve | zero full import unlocks; missing authoring cannot be replaced by these fields alone |
| P23/P25 placement | native Store self command has identical Source/target unit rectangle; mode3 self preparation reuses common target-unit geometry | non-self mode3 rejects; host footprint and zero scatter are adaptations |
| P26 choreography | old Big Shot video independently compared against all available body frames; poses consistent with atk but nonunique/nonmonotonic | NOT a Motion8 clip/phase proof; no standard-attack fallback or body contract added |
| P29 validation | strict27 pairs/469 nodes/1823 values, zero differences; separate48-pair structural/intake comparison812 values | partial comparison does not validate every material/curve; full48 comparison stops at an unsupported active texture-color curve |
| P27/P28 integration | all14 commands, accepted Source plans, colors, resources and runtime code unchanged | Store full-profile audit exposes non-flat Quad color and Billboard dependencies; no partial release |

Typed-layout-relative rules, not runtime offsets:

| Input | Encoding | Independent intake comparisons |
| --- | --- | --- |
| Quad parent color influence | float32 at516,finite[0,1] |218 |
| Particle parent rotation |508:1=On,2=OnGenerateTime |82 |
| Model parent translation |568:0=On,1=OnGenerateTime |215 |
| Model parent scale |576:0=Off,1=On; other codes unknown |215 |

Existing Particle translation contributes82 further comparisons to the812-value
partial receipt. Strict corpus adds320 checks to the earlier1503. Unknown enums,
including12 other held-out control observations and sparse Quad scale0, remain
gated rather than inferred. Static Model/Quad setupper loads corroborate selector
neighborhoods; Particle's exact parent-equation consumption is NOT newly proven.
No new RNG, matrix inheritance or nine-node lifecycle equation is claimed.

Practical decision:14 scoped candidates benefit,0 released. Big Shot's explosion
and target placement remain checked; Hardshot's38 nodes still need complete
controls, plus independent Motion8 body-phase evidence. Mindblow227871 belongs
Barret, not Aerith. Aerith's Reraise81-node effect plan stays intact: MAGIC
negative-time/body choreography, single-ally selection and auto-revive are separate
gates. Type7 remains a blocker for9 of the14 checked candidates, type4 for4;
these overlap other blockers and are NOT potential guaranteed releases.

Fallback Store200210: exact source/project resources can be prepared and its
self-placement is natively measured. However3 active non-flat Quads and3 active
Billboard models are outside the checked profile. Do not publish with white
fallbacks or claim an effect-only plan is complete. The proposed normal-attack
charge/risk implementation passed isolated gameplay tests/build, then was moved
to ignored charge-draft/; all affected runtime/test files were restored to the
accepted parent. It is NOT a productive feature or source-semantics proof.

Evidence root tools/data/control-groups-20261101/: strict-corpus.json,
control-comparison.json, expanded-corpus.json, independent-group-reproduction.json,
group-layout.json, typed-selector-loads.json, candidate-control-impact.json,
candidates-batch-audit.json, remaining-magic-batch-audit.json, coverage/inventory.json,
body-sequence-comparison.json, store-events.json, store-reference.mp4,
store-source-audit.json,store-coverage.json,preservation-check.json. Reproduction
commands are in skill-reconstruction-workflow.md. Native identities and placement
are documented in native-effect-placement.md; body ambiguity in native-hit-profiles.md.

Checks:15 Python/23 Node tests pass, build35 modules passes with the existing
chunk advisory;3 preserved preparation profiles reproduce exactly.250 src/public/
character-recipe files are parent-equivalent; prior frozen Cloud0-pixel, Sword
color replay, area and party browser receipts are reused because inputs did not
change.9 current modules on3001 pass freshness. No new browser pixel claim.

Current critical path / next bounded decision: obtain a scoped Motion8 body
reservation/clip-transition trace for227870, and validate the remaining complete
Hardshot control profile (especially Null/matrix/compatibility) before publishing.
These are independent requirements, not one guaranteed unlock. Do not keep
decoding isolated values if neither release gate can be completed. Aerith's
Reraise is the closest preserved effect plan but still needs a separately bounded
MAGIC/friendly-revive action contract. Non-flat Quad RGB would benefit Store and
several existing candidates; it alone does not resolve their other gates.

## Latest: original flat Quad RGB reaches the productive player (2026-11-01)

14 technical Source commands; no new skill. Daniel now approves Helm Break and
Delita spatial/animation quality. Sword's newly corrected color awaits recheck.

| Component | Proven / integrated change | Remaining boundary |
| --- | --- | --- |
| P07/P09 parsing/selection | Quad RGB at104/120, Constant/flat controls checked against exact source project; six Sword Quad colors retained | no selected Curve/non-flat support in this new profile; authoring still required |
| P14/P15 sampling | native RGB sampler/clamp reuses existing ColorConst initializer; matches retained native InitConstFlat records and terminal RNG | per-member/per-instance seed construction is declared host policy, NOT recovered FFBE ownership |
| P16/P17 color/material | native-flat-quad-rgb-v1 colors ordinary Add Quads via their material RGB, separate from existing dynamic alpha | no new texture/blend shader equation or pixel-fidelity claim |
| P23/P26/P28 spatial/action | hosts, per-target anchors, member samples, nine events, MP48 and all14 command objects unchanged | existing reviewed choreography/balance boundaries preserved |
| P29/P30 regression/intake | Sword warm colors visible; three frozen Cloud images0 changed pixels; Chant3 frames pixel-identical; raw-data colorPreparation hints | hint is not renderer/whole-skill admission; Curve/non-flat fields and independent import blockers remain |

Cause was a missing ordinary-Quad color path, not a new orange tint or active RGB
curve suppression. Old corner export was Distortion-only. Ordinary Quads fell
through to the white center slot. Source has four different initial RGBs across
six Quad nodes and a nonzero RGB range on node11. Their corner A=0 is unrelated
to native alpha. Original inputs and RGB-only native initializer are documented
in original-appearance-review.md; unsupported modes fail closed.

Evidence tools/data/sword-color-20261101/: raw-corners.json,plan.json,
before/after-browser.json,placement-color-check.json,area-browser.json,
party-browser.json,baseline-browser.json,preservation-check.json,
renderer-coverage.json,node-validation.json,python-final.log,flash-python.log,
color-comparison.png. Retained original native video/frames are reused; no new
emulator recording or functioning new native emulator probe is claimed.
84 distinct Node tests have passing latest results,24 Python tests pass, build35
modules passes with the pre-existing chunk advisory. Identity alarm initially
detected the deliberate player hash change; reviewed only after frozen frames
passed. Native packet regressions remain unchanged;9/9 reconstruction not claimed.

Import continuation: raw hints inspected13 already staged main-party commands,
not a repeated global survey. Ancient Holy229762,Miracle of Life229763 and
Mindblow227871 contain relevant flat RGB input. Ancient Holy and Mindblow also
contain outside-profile Quads; other controls/node families/choreography remain.
ZERO new full import approvals. Big Shot has no required colored flat Quad and
still needs Hardshot controls plus scoped Motion8 body proof. Reraise plan stays
untouched. Highest practical common dependency remains exact authoring-free
controls (selection/compatibility/emission/texture data), then supported action
choreography; candidate totals are not guaranteed unlocks. Resume bounded
existing-character work from current raw intake evidence, not another color or
pixel-perfect pass.


## Latest: Big Shot bounded native check; Helm Break playable (2026-11-01)

14 technical/11 personally accepted. Helm Break202190 is the new complete
productive Source command; personal visual review is pending, as is renewed
Delita Chant/Sword spatial review. All previous13 skill objects, published Source
plans and src files match checkpoint3a939e1. No renderer rule or body fallback was
introduced. Source-only and accepted defaults are preserved.

| Component | New evidence / actual integration | Boundary / next dependency |
| --- | --- | --- |
| P07 BMB controls | Particle3 translation504,0=On/1=OnGenerateTime,58 matched checks across27-pair corpus | intake/audit only; stable Prepared metadata unchanged; other selectors/compatibility unresolved |
| P10/P30 intake | extended audit1503 values/469 nodes/27 pairs; unknown enum rejects; current hashes retained | no authoring-free profile or guaranteed main-party unlock |
| P23/P25 placement | Big Shot native group5027690 target rect[1,240,282,261]; both objects bound near target center | native206 form explicit; no global target offset or seed inference |
| P26 choreography | native Big Shot sequence/video and identical205/206 CGS tracks secured | Motion8 exact body clip/phase selection still unknown; no implicit atk/limit fallback |
| P27/P28 publication | Helm Break complete exact-form prefix+mentalbreak; explicit reviewed Motion1 action, target-unit screen API, event80,MP12 and magic-weakness | review basis remains adaptation, no native whole-action fidelity claim |
| P29/P30 validation | actual BattleScene target/MP/debuff/K.O./wave/cleanup; two-page menu selects all4 Delita commands;65 Node/19 Python tests/build | personal new-skill visual acceptance separate; default-party frozen gate rejects mismatched reserve comparison |

Evidence tools/data/big-shot-20261101/: control-comparison.json,
hardshot-control-coverage.json, bigshot-events.json, bigshot-reference.mp4,
barret-track-comparison.json, helm-break/plan.json, helm-break/source-features.json,
helm-break/renderer-coverage.json, reserve/menu/friendly/area/baseline-browser.json,
preservation-check.json, node-final.log, python-final.log, build.log.
Native measured placement and rawMotion8 inputs are detailed in
native-effect-placement.md and native-hit-profiles.md. Reuse existing observer35;
no reinstall or app-data loss. Arm is disarmed; party now Cloud/Delita/Barret.

Helm Break rawSPR -60%/five turns and modifier7000 are retained in originalCommand;
reviewed roguelike2x damage/+20% magic vulnerability/three phases are separate.
Source marker40 + exact unit prefix40 gives event80. Complete2 original members,
source hash checks, shared material/model/UV profile and12 existing body tracks
are reused. Known experimental rendering limits are recorded by the audit, not
silently promoted to native fidelity. No particle/model branches were omitted.

Big Shot decision: NOT published. Hardshot38 nodes lack full rotation/scale,
matrix, tint/emission/compatibility inputs and exact matched authoring; Particle
translation alone cannot complete them. Motion8 clip selection is independently
unresolved. Video is not an internal clip or RNG trace. Do not spend another
unbounded control pass merely to force this skill. A future bounded diagnostic
should observe actual body reservations/clip transitions in the227870 scope.
Reraise effect-only81-node plan is untouched: MAGIC timing/body, single-ally
targeting and auto-revive remain independent release gates.

Critical path: compare other existing-character prepared candidates against the
same explicit choreography/position/gameplay contracts. No unpublished command
is currently certified fully importable (fresh census7 characters/87 active
series entries:14published,70blocked,3intake-only). Best next main-party research
step is a bounded Motion8 body-transition observation plus exact Hardshot control
layout evidence, or a separately reviewed MAGIC timeline implementation for
Aerith; neither is currently a guaranteed single-step unlock. No new global
Native nine-node activation or universal-support claim is made.


## Latest: main-party parser blockers reduced; no new release (2026-11-01)

Still13 technical/11 personally accepted. No game, Source presentation, recipe or
Delita placement change. Canonical component updates:

| Component | Newly integrated evidence/capability | Remaining boundary |
| --- | --- | --- |
| P07 BMB decoding | Particle3 scaleValue1392,Model6 scaleSpeed1472;7 curves/26 keys compared | full authoring-free controls and other slots/types remain unknown |
| P09/P16 selection/evaluation | Constant texture1/2 color modes identify dormant authoring curves | no newly measured native curve equation or binary tint selector |
| P10/P30 admission/reuse | current exact-source comparisons supersede stale parser errors only | intake/prepared VFX never certify a whole action |
| P30 test environment | eight served source bodies checked before browser combat | cached instances still require reload and independent frame checks |

Evidence tools/data/main-party-import-20261101/: curve-layout-discovery,
curve-pair-comparison,extended-comparison,preparation-attempts,import-decision,
coverage/inventory and baseline-browser JSON.27 pairs/469 nodes/1445 already-known
parent values have no mismatch; these are not1445 new fields or runtime states.
Five whole effect/project comparisons now pass: explosion,blow4,shockwave,regen,
reraise. Seven newly decoded scale curves contain26 keys, one curve dormant.

Nine obsolete authoring-comparison diagnostics are retired for eight commands:
Breath of the Earth,Reraise,Overflowing Life,Lifestream,Big Shot,Mindblow,Speed
Drink,Ungarmax. Current parser/binary/authoring hashes and unambiguous original
versions are mandatory. All other blockers and historical error records survive.
No complete new import is certified. Without --control-audit, inventory remains
the conservative historical view.

Reraise10230 now prepares an81-node effect-only experiment. It remains blocked
for release: original effect-55/marker120 have no approved MAGIC timing/body;
single-ally targeting and auto-revive process27 aren't implemented. Coverage
identifies12 unverified Particle-facing nodes,8 ordering and6 parent-transform
findings. Research magic_atk isn't an approved clip. Big Shot's actual profile
attempt stops at missing sp_20108_hardshot.bmsln; its38-node BMB exists. Neither
effect nor gameplay was replaced. Lifestream lanes remain blocked.

Next bounded import priority: Big Shot hardshot controls from exact BMB/original
code, then Motion8 body and positioning proof. Known node families and explosion
comparison now pass; no guaranteed unlock. Curaja still needs cure5 controls and
node4/7; Banish needs missing controls plus MAGIC choreography. Pulse of Life's
different regen file was not fully compared here. Avoid another global survey.

64 Node/21 Python tests and build34 modules pass. Current-source check8/8 and3
Cloud frames0 changed pixels on3001. All runtime/public data unchanged; previous
combat/Delita receipts reused. No new original trace or visual milestone claimed.

## Latest integration: original placement convention and reviewed replay sampling (2026-11-01)

Status remains13 technical Source skills /11 personally accepted. Daniel approves
the optical quality of Chant and Cunning Hero's Sword but requested spatial
correction; both await renewed personal spatial acceptance. No new import here.
Native evidence: [native-effect-placement.md](native-effect-placement.md), live
Chant210550/Sword1323010. No ordinary video was substituted for internal bounds.

| Component | Newly native-proven | Common simulation/product integration | Remaining boundary |
| --- | --- | --- | --- |
| P23/P25 host placement | Chant uses side Rect[320,0,320,666]; axes2/2 plus screen-down Y240. Sword uses each target's getEffectDispRect, not enemy centroid | opt-in ffbe-screen-api evaluates original axes/offsets before final Three conversion; both Delita bindings use it | host arena/sprite footprints are declared adaptations; caster origin/native target-touch bounds unresolved |
| P14/P15 RNG/start sampling | nine native Sword objects; source node1 random rotation turns node2 translation50 | optional deterministic member/target stream policy prevents nine cloned preview samples | FFBE seed construction and internal RNG not measured; mixer is FFRogue policy, not native reconstruction |
| P26/P29 import acceptance | placement, body/VFX and gameplay are separate evidence | new binding requires explicit coordinate review; existing exact published identities retain accepted historical path | VFX availability never certifies complete choreography or native fidelity |
| P28 gameplay/cleanup | no new native gameplay semantics asserted | Chant7 cases, area4 cases and default guards pass in actual BattleScene/Source bridge | native/game formations and time conditions differ; no full pixel equivalence claim |

Original Chant geometry, textures, UVs, materials, source timelines and scale are
unchanged. Sword root anchors/source geometry stay unchanged; only opt-in random
sample selection differs. The eleven accepted plans differ only in player-hash
provenance; their default execution/sampling behavior stays unchanged. All three
frozen Cloud frames have0 changed pixels after the shared player change.

Evidence under tools/data/delita-placement-20261101/: placement-measurements.json,
chant/sword-events.json, valid reference videos, before-placement.json,
final-placement.json, comparison-*.png; baseline/friendly/area/guards-browser.json.
Tests60 Node (including42 actual combat assertions),10 Python preparation/
composition/staging, build34 modules. New test_source_placement covers source
axes1..6, translated arenas, three dimensions, units1/2, target counts and
allegiance, deterministic streams and import placement admission. Existing camera
zoom/rotation rejection remains; no expanded camera-support claim.

Existing-roster decision reuses the hash-checked census, no repeated mass scan:
7 bodies/87 active series entries/13 published/71 blocked/3 intake-only.
Aerith+Barret have28 unpublished series entries:25 contain missing matched
authoring,15 contain unknown node7,10 active-curve blockers (overlapping sets,
not guaranteed unlocks). main-party-decision.json contains exact per-ID blockers.
No complete unpublished command is certified, so none was forced into play.

Next bounded content-enabling task: authoring-independent missing controls for a
concrete main-party pair, e.g. Aerith Banish10060 front/back (both originals
indexed, no matched authoring). Compare against already decoded matched pairs
before expanding parsing; independent MAGIC body/target/choreography gates remain.
For a heal, Curaja additionally needs node4/7 semantics; Barret Big Shot needs
RGB curve plus hardshot controls and Motion8/body validation. Do not substitute
cure2 for cure5, guess MAGIC clips or grow another one-skill reserve as a shortcut.
Nine-knot lifecycle/native work and all prior baseline archives remain preserved.

## Current: expand existing characters; thirteen technical skills, eleven personally accepted (2026-11-01)

Daniel personally accepts Shield Break and Piercing Gleam: all previous eleven
Source skills are accepted. New Chant and Cunning Hero's Sword are technically
battle-tested, but await his personal visual review. Seven registered characters
remain; no new character, renderer or fallback was added. Source-only stays final.

Default party is Cloud, Aerith, Barret. Cloud of Darkness, Cloud AC, Delita and Jack
are optional third-slot reserves via the existing query parameter, not a free
party-selection system. Current Barret body AND recipe are 207000205; its series is
207000204. Older mismatch notes are superseded by direct current-body inspection.

Complete current coverage: [ROSTER_SKILL_COVERAGE.md](ROSTER_SKILL_COVERAGE.md).
The reproducible roster census has 87 active ABILITY/MAGIC series entries across
the seven bodies, plus separate current-form and series Limit Burst references.
This is not per-form eligibility or equipment/quest/enhancement/dispatch coverage.
13 published, 71 with concrete intake/resource/dispatch blockers, 3 intake-only
(Delita Helm Break/Store, Jack Iai Strike), zero certified unpublished imports.
Availability or successful intake is never whole-action approval.

| Character | Active series entries | Published Source skills |
| --- | --- | --- |
| Cloud | 13 | 5 |
| Aerith | 22 | 1 |
| Barret | 7 | 0 |
| Cloud of Darkness | 11 | 2 |
| Cloud AC | 13 | 1 |
| Delita | 16 | 3 |
| Jack | 5 | 1 |

New existing-roster commands:
- Delita Chant210550: original cure2 front/back, two members, five textures,
  duration222 frames. Source markerF100; reviewed MP12, nonlethal caster HP100,
  other living allies heal1000, no revival. Exact JP ability210550/action41+2
  agrees with current raw source. It is NOT GL Chant200930, despite the name.
  Original fixed1000/mod340 and source process rows remain metadata; fixed heal,
  nonlethal admission and body clip are explicit roguelike adaptations.
- Delita Cunning Hero's Sword1323010: complete original random orange slash
  effect, one texture, nine source markersF42..90 and weights7%*8+44%, area targets.
  Reviewed MP48/total3x instead of raw MP120/mod12000. Stationary/rest body is
  explicitly reviewed effect-led gameplay, not a newly proved native Motion2
  mapping. No atk clip is inferred or appended. Series brave unlock requirements
  are retained; publication does not claim original availability at every star.

P02/P04/P06: tools/inventory_roster_skills.mjs joins the saved hash-checked global
census, exact current body/series acquisitions, original LB master links and
existing/new intake receipts. It does not repeat the global archive scan or grant
publication approval. Fifteen previously unassessed roster entries were staged
once; unchanged prior receipts were reused. Two complete plans use the existing
source-preview-v1 profile and coverage audit, with no withheld drawable branches.

P25/P28: explicit stationary party scope, living/other-living recipient contract,
nonlethal once-only HP admission, fixed healing event and actual capped restoreHp.
The existing bridge maps party cardinality to the same generic multi-target
player and target-side placement to the right half of the current arena. Native
offsets, model/UV/material/player data stay untouched. This is a bounded host
allegiance adaptation, not a new native camera rule. Screen/unit/enemy rectangles
retain their old path. No single-ally selection, revival or automatic process-to-
gameplay translation is claimed. Event/body/VFX clocks remain independent.

P26/P29: mandatory explicit choreography and actual body checks stay active.
Actual battle tests cover Chant recipients, HP caps, K.O. skip, no-target/HP/MP
rejection, once-only costs, full decorative lifetime and restart. Area skill
checks9+9 hits; early target death1+9; all-dead1+1 immediate victory; MP52 persists
to the next wave; restart disposes the old player. Actor never plays atk or
magic_atk in the reviewed rest-body action. Existing Cloud+Aerith+Shield full
actions were also exercised. Existing nine-knot/native results are reused,
not recomputed or promoted. No new native whole-skill fidelity claim.

Checks:56 Node tests including42 direct combat assertions;10 Python tests; build
33 modules, existing Vite chunk-size advisory only. Three frozen Cloud frames
retain0 changed pixels. All eleven old command objects and all prior presentation
manifests are unchanged; originalEffectPlayer SHA remains a9482fcaa9d52e17dba0fc972b097d0a73f131917a05e9196ef5fab93d4c16bc.
No new APK, native capture or pixel-polishing work was required.

Current blockers and priorities:
- Aerith Curaja/Full-Life/Pulse of Life/Stop Detach: exact staged assets still
  have missing authoring/control semantics, node7 (and some node4), curves;
  Full-Life also has negative effect timing. Reraise adds the same resource/node
  family. Healing support now exists; it does not remove these independent VFX
  and magic/body-profile blockers. No legacy replacement.
- All seven Barret commands have independent authoring/curve/node or Motion5/8
  gaps. Keep normal attack working; do not call an old Satellite preview native.
- Delita Store's resources pass intake, but plan preparation rejects source
  placement mode3/caster. Need a proven bounded caster-rectangle contract plus
  normal-attack-only charge/DEF-risk gameplay, not a generic all-skills buff.
- Meditate, Medicate and Jack Cheer are blocked by existing missing authoring,
  node/curve rules. Hero's Encouragement has active scale curves and resource
  version ambiguity. None were published.
- Helm Break is the lowest-effort complete intake using existing damage plus
  magic-vulnerability rules, but still needs plan/body/battle review. Prefer a
  bounded Store/general support investigation for tactical variety, rather than
  adding another one-skill character. Jack Iai Strike needs explicit death
  gameplay and choreography review. Neither is certified fully importable.

Evidence/restart commands and exact receipts are in the latest handoff. Preserve
the new plans, all older accepted baselines and archives; audio source IDs/times
remain metadata on their separate bus. No background/music coupling was added.

## Current: nine personally accepted; first resumed import wave adds two skills (2026-11-01)

Daniel explicitly accepts the corrected Braver WHOLE action, blue VFX and fast
completion. All9 previous Source skills are personally accepted. The import wave
is resumed. NEW: Delita253000205 Shield Break202180 and Jack254000603 Piercing
Gleam203050 are published and fully battle-tested through the SAME Source engine.
Total11 technically playable,9 personally accepted; personal approval of the new2
is pending. No native whole-action/whole-skill fidelity claim is made.

| New command | Complete visual source | Reviewed gameplay | Explicit body review |
| --- | --- | --- | --- |
| Shield Break | Orange unit slash + armorbreak,2 members/30 nodes/9 textures; unit prefixF40, markerF40=>F80 | MP12,2.0x physical, then +20% physical vulnerability3 enemy phases | target approach, one atk clip, return; reviewed standard physical Motion1/move1 profile |
| Piercing Gleam | Two unit white slashes + armorbreak,3 members/30 nodes/9 textures; prefixF19/F51, markerF40=>F91 | MP11,1.4x physical, then +15% physical vulnerability3 enemy phases | same general explicit action contract, exact Jack body tracks |

All original command rows, costs/unlocks and raw parameters remain separately
preserved. Shield's source damage7000/DEF-60%5turns and Jack's140/DEF-40%3turns
are NOT silently executed as roguelike balance. Selected body forms and series
acquisition metadata do not claim exact original star-form eligibility.

P02/P04/P05/P06: plan_source_imports --compose-unit-effects uses the existing
native-rule composition helper and resolver before resource staging. Complete
unit-prefix dependencies are therefore inspected too. A failed/unsupported
composition is retained as a per-candidate intakeBlocker; stage_source_imports
rejects it BEFORE any skill-only extraction, while other batch items continue.
There is no automatic uncomposed fallback or publication approval.

P26/P28: mandatory choreography checks remain. The new review basis
reviewed-adaptation distinguishes inspected gameplay/body choices from Daniel's
personal acceptance and direct original observations. It supplies no default body
clip or new native motion-ID mapping. Both new data profiles explicitly request
one atk clip using the complete physical Motion1 prefix and exported source body;
no rule inferred from Braver's Motion2 is applied. The shared player, motion/hit
adapter, character execution code and previous9 body/skill/VFX assets are unchanged.

Actual checks:53 Node tests incl41 direct combat assertions;10 Python tests; build
33 modules/pass with existing chunk advisory. New2 actual battle receipts check
selected second enemy,once-only MP/hit,correct target-only status,unresolved
choreography/MP rejection,lethal no spillover,victory/wave MP88/89,and restart.
Each full decorative duration and five animation samples are preserved. Three
frozen Cloud frames remain0 changed pixels; normal Barret/source-error guards pass.
Earlier unchanged9 full-action/native results are reused, not needlessly repeated.
Evidence: tools/data/import-wave-20261101/validation.json.

The saved51-name shortlist was used, not a new global census.2 new commands are
published;49 name-overlap candidates remain, NOT49 supported imports. Fencer's
composed atk_slash3_yellow prefix lacks matching authoring. Armor Eraser's visual
resources resolve, but Warrior of Light201000104 body export has idle duration0
and fails validation; no timer patch, publication or success claim. The shared
Motion1 non-damaging marker gate also remains to be implemented once a complete
candidate body/profile exists. Source-zero timing may require static-pose semantics;
it is NOT assumed to be corrupt data. No new native recording or pixel polishing.

## Current: Braver body correction and mandatory choreography review (2026-11-01)

Daniel confirms Braver's BLUE VFX matches Memorial. He rejects the earlier full
character action: the original has a small forward movement and one hit/break,
without the normal attack clip. This supersedes prior whole-action optimism.
Nine published Source commands remain; the prior8 are personally accepted;
Braver's corrected whole action still awaits Daniel's own review.

ROOT CAUSE: the recipe manually selected atk/dash without native body evidence.
executePreparedSkill unconditionally played skill.motion, waiting for the1.68s
Cloud AC atk clip despite the independentF6 impact. It was a misplaced normal
attack, not a second extra damage event. sourceDamageEvents only emits timing;
that adapter remains unchanged. Native reserveSpecialAction's motion==1 check
(native-hit-profiles.md,0x13c4174) proves effect-list composition, NOT a universal
motion-ID-to-body mapping. Motion2 does not authorize atk, magic_atk or no clip
automatically. Its complete original body semantics remain unresolved.

P26/P28: mandatory actionChoreography separates body phases, travel, readiness,
VFX lifetime and gameplay events. Explicit clips preserve all8 accepted sequences.
Rest-body mode permits a short step or effect-only stationary action, without
inserting an attack. Ordered nonoverlapping clips support multiple body phases;
existing VFX member start frames remain independent. Body timers survive the last
early hit and cancel on shutdown. Completion waits for reviewed gameplay AND
body/recovery, never the decorative tail. Missing/unknown choreography fails before
MP and publication; original motion/move identities and actual body tracks are
checked. No missing body clip becomes an automatic atk fallback.

Braver uses reviewed step/rest. Move-cycle travel is66.67ms each way from its
exported move clip; distance is half scaled idle height (72px here). These are
explicit gameplay presentation adaptations, NOT newly measured native dimensions
or duration. The qualitative no-attack sequence comes from Daniel's original
observation. SourceF6 hit,MP36 and reviewed break remain unchanged. All9 VFX
manifests/textures (46 identities) and original shared renderer are untouched.

Actually checked:50 Node tests including41 combat assertions,9 Python tests,
build33 modules with existing chunk advisory. Actual Braver requests only
standby/move/idle/move/idle across the FULL decorative duration; measured gameplay
release~218ms after VFX start, versus prior~1965ms example (not a native timing
benchmark). MP/target2/debuff/lethal/wave64/restart and unresolved-contract rejection
pass. All8 old actions pass; three frozen default-party Cloud frames remain
0 changed pixels. Evidence: tools/data/braver-choreography-20261101/validation.json.

P26 remains TEILWEISE: automatic original body/choreography extraction is not
solved by a rendered BMB effect. The old Braver preview's dash/atk body is now an
obsolete WHOLE-ACTION reference; retain it for VFX evidence only. Larger import
wave PAUSED. Next: Daniel reviews corrected action, then use explicit choreography
reviews for future imports. If exact native travel is required, measure original
body clip IDs/transitions and movement endpoints/times on the same action clock;
do not infer them from motionType or from effectFrames alone.

## Current: ninth Source skill and shared preparation profile (2026-11-01)

Source-only migration is complete and was not reopened. Cloud (FFVII: AC), exact
form207001605, now exposes Braver233930 through the SAME productive Source player.
Nine technically playable Source commands; the prior eight remain personally
accepted. Braver is battle-tested and visually inspected here; Daniel's personal
approval is pending. No new native whole-skill fidelity claim.

P03/P28: sourceDamageEvents admits the evidenced Motion-2 zero-prefix profile,
checks exact unit/command/composed timeline and complete normalized hit weights,
and keeps Motion-1 prefix validation. Unused unit effects are not required for
Motion2. Source raw DEF-60%/5turns stays separate from reviewed +20% physical
vulnerability/3 enemy phases. Braver: MP36,4.5x physical atF6, then surviving-target
debuff. Motion2 visual groups are NOT prefixed with unit basic-attack effects.

P10/P27: prepare_original_preview.py --profile source-preview-v1 resolves every
matched member BMSLN from an explicit directory and reuses accepted common flags.
Recipe/body/native shader/renderer evidence still required. Exact old Braver,
Armor Break and Aura Ball plans are reproduced; missing project fails closed.
It grants no new original semantic or publication approval. All56 Braver nodes,
two visual members,15 textures/seven models and both sound groups are retained.
Known billboard, parent/appearance/material/ordering approximations are explicit
in tools/data/braver-20261101/coverage.json; no drawable/emission is withheld.

P02: plan_source_imports.mjs --shortlist-catalog reuses the preserved global census
and current publications.51 unpublished command candidates share known effect
NAMES, not verified versions/support. Zero extra complete imports inferred. Exact
ownership/form/composition, resource hashes, gameplay and battle gates still apply.
The old global8-skill census remains a historical snapshot; Braver is a checked
delta, not grounds to relabel the whole catalog automatically.

Actually checked:48 Node tests (including38 combat assertions),9 Python tests,
build32 modules with existing chunk advisory. Actual battle receipts cover all8
accepted skills plus Braver, once-only MP/damage/status, target2, insufficient MP,
lethal no spillover, victory/wave MP64, restart and Source-error fail-closed.
Three frozen Cloud frames:0 changed pixels. All8 old manifests and player/native
code remain unchanged. Evidence: tools/data/braver-20261101/validation.json.

Next AC candidates are blocked, not published: Blade Beam233931 has indexed
process lanes, non-point emission and missing matched front authoring; Finishing
Touch233935 has missing slash authoring and a vortex alphaTest version mismatch;
Spin Drive233936 has missing controls/authoring and node type7. No new native
recording, audio playback, background work or pixel-perfect research was done.

## Current: Source-only productive skill engine; eight accepted skills (2026-10-28)

Daniel accepts all8 published Source skills, including Armor Break/Aura Ball.
The old game mode switch, baked skill adapters, cast/melee/area fallback and effect
loading are removed. Source-only admission fails closed before MP. Six remaining
Aerith/Barret commands are visible NOT IMPORTED data; normal attacks/other shared
combat mechanics remain. Cold archived assets and original resources are retained.
Internal comparison policies of the unchanged shared Source player are not a
second productive skill engine. All8 visual manifests retain accepted identities.

Explicit reviewed impact events preserve early CloudF6/F30/F4. Source receipts are
hash-checked for older non-composed accepted plans; original commands stay separate
from reviewed gameplay. Imported commands sort first; no silent substitute.
45 Node tests including38 combat assertions pass; actual browser68 all8 actions,
69 frozen3Cloud0 changed pixels,70 unavailable/normal attack/victory/wave/shutdown
pass. Build passes32 modules. See renderer-session-handoff.md for exact scope.

Read-only global census:3311 forms/1573 series;10052 unique learned active ability/
magic IDs,3141 LB IDs separately. NOT automatic import counts.13193 unique commands,
21008 ownership pairs;8 playable,0 confirmed fully importable unpublished. Nine
other-owner pairs partly prepared,10345 known blocked,10646 not reliably assessed.
Only49 prior bounded BMB intakes underpin specific support/blocker conclusions.
Inventory command: python tools/inventory_source_catalog.py --output tools/data/source-only-20261028/catalog.
Original dependencies/versions not decoded globally. Detailed limits in summary.json.

Quota-conservation stop: Braver233930 has staged originals/offline14-track body
but NO Prepared plan, publication or battle test. Next is complete preparation,
then a checked general non-Motion1 zero-prefix event compiler if needed. No such
compiler change exists yet. No additional playable skill is claimed. Historical
recipes/raw data/audio references are retained. Latest exact checkpoint and next
steps are in the handoff and tools/data/source-only-20261028/checkpoint.json.

## Current: all eight skills personally accepted; Source-only migration starts (2026-10-28)

Daniel personally accepts Armor Break and Aura Ball. All8 published Source skills
now define the required visual baseline. This supersedes pending-review counts
in historical entries. No new native-fidelity claim.

Pre-removal audit: BattleScene's mode switch, baked sprite/particle effect helpers,
Legacy area/melee/cast fallbacks and Boot/Preload effect loading are old-only.
Aerith Healing Wind/Curaja/Banishga and all3 Barret skills lack Source publication
and must remain explicit NOT IMPORTED entries, never fallback casts. The three
early Cloud commands still derive accepted impact timing from historical metadata;
freeze F6/F30/F4 in explicit reviewed events before deleting old adapters.
Retain normal attacks/projectiles, impact barrier, pivots/recoil/body readiness,
damage/MP/status/turn/reward/cleanup logic. Internal historically named comparison
policies in the ONE shared Source player are not the old game engine; preserve
them and all8 visual manifests. Research/raw resources remain intact.

Pre-migration checkpoint: refs/heads/codex/source-only-baseline-20261028,
parent d15a00f; tools/data/source-only-20261028/baseline-checkpoint.json records
the exact commit. Reuse verified44 Node/27 Python and browser61..67 results for
unchanged pre-migration inputs; identities rechecked in baseline-identities.json.
Next: Source-only admission/execution and loaders, then eight-skill battle and
frozen-image regression, then global metadata inventory and a bounded import wave.

## Current: eight playable Source commands across three characters (2026-10-28)

Continues scoped4cdea84. Daniel explicitly accepts Seal Evil and Trigger Smash,
so ALL SIX previous Source commands are personally accepted. Their visual data,
body assets, reviewed costs/events and shared geometry player remain unchanged.
NEW Armor Break201150 and Aura Ball203280 are published for Cloud of Darkness
203000803 and tested/visually inspected in the actual BattleScene. Total:8
technically playable Source commands;6 personally accepted by Daniel,2 pending
his own review. This is accepted-preview quality, NOT whole-skill native fidelity.

### Selection decision / no renewed parameter research

The prior28-candidate intake remains evidence, not a list of guaranteed unlocks.
Three Cloud wrapper payloads512622/512731/512733 were resolved read-only and
staged: missing authoring, curves, type4/15 and branch gates remain. No new wrapper
command is published. Bounded Tifa and Sephiroth intake also rejected curve,
missing-member-authoring, enum, material and hierarchy mismatches. None was waived.
Earlier file-presence ranking is PROVISIONAL: resolving complete groups revealed
additional members; candidate-audit.json is the authoritative intake result.

Broadening character coverage found two already supported visual profiles. The
complete Cloud-of-Darkness selection now automatically enumerates11 owned active
abilities/magic.2 are newly playable;9 remain blocked. No new BMB decoder, curve
guess, native capture, emulator modification or pixel-polishing was necessary.
Evidence: tools/data/skill-seven-eight-20261028/{candidate-audit.json,
tifa-selection-audit.json,sephiroth-selection-audit.json,cod-selection-audit.json,automatic-selection/candidate-audit.json}.

### Integrated general capabilities

| Component | Implemented / current scope | Evidence / boundary |
| --- | --- | --- |
| P02 ownership/intake | character:* enumerates every owned active catalog entry, deduplicates explicit selections | plan_source_imports.mjs;11 actual commands; no equipment/passive/child ownership inference |
| P03/P28 gameplay events | Combined enemy damage/status tracks on the existing cancellable Source clock; stable damage-before-status order at equal frames | skillDamageTimeline.mjs; BattleScene; source metadata remains separate from reviewed balance |
| P28 statuses | Physical vulnerability and outgoing physical attack reduction; strongest refresh/no stacking, finite enemy-phase expiry | enemyStatus.mjs; actual100->115 damage and two300->240 enemy attacks |
| P10/P27 preparation | Offline --prepare-body-only plus explicit --unit-assets breaks new-character body/visual publication dependency | import_character.mjs, prepare_original_preview.py; validated13 tracks, identity checked, no offline publication |
| P27/P28 roster binding | Registered optional reserve in third slot; default Cloud/Aerith/Barret preserved | partyReserve.mjs; ?reserve=cloud_of_darkness; no per-character loader or renderer |
| P30 acceptance | Full new battle actions, preserved screenshots and unchanged six old visual identities | test-source-scene.html; new Node checks and receipts listed in handoff |

These are bounded integrated capabilities. Universal P02/P03/P10/P26/P28/P30
remain TEILWEISE; P27 retains its validated-input INTEGRIERT contract. No unknown
node type or missing authoring is newly supported. Existing native lifecycle,
RNG/transform/draw implementations and182/180 writer evidence are unchanged.

### New complete reviewed commands

| Skill | Complete source members | Reviewed gameplay | Product result |
| --- | --- | --- | --- |
| Armor Break201150 | atk_blow1_purple + sp_20092_armorbreak,2 members atF74 | MP7,1.2x physical atF113 (rawF40 + exact-unit Motion1 offset73), then +15% incoming physical for3 enemy phases on surviving locked target | One MP charge/one hit; target death skips status; recovery independent of decorative tail; victory/wave/shutdown checked |
| Aura Ball203280 | battle_generic_barrier_ball1_purple,1 target member atF41; separate sound-only group preserved | MP30,no HP damage;F120 outgoing physical x0.8/3 enemy phases,40% Silence/1 phase to all living enemies | Two target copies; actual enemy damage reduction includes final eligible phase before expiry; no invented damage |

Original source identities (SHA256):
- atk_blow1_purple:88017ba3ac104c9d79da00c7f7d187a843c76a48ca0e10a8807e4ee793dad1b1
- sp_20092_armorbreak:6e38587d6ecaad59bb19a08c3c9be539bd00ce2944d6c30ba49eeafa3da86933
- battle_generic_barrier_ball1_purple:fbabb715abf0644e65363880120be684212b84f8074734740af0f77038a38c57
- master DB:ab176368d6a8faa9319f471f3f0138ec4c578cf131c759a593479dac9487183f

Armor's2 originals contain33 supported nodes and9 unique textures; Aura contains
5 supported nodes/1 texture/two original model branches. Exact matching projects,
complete resource/model bindings and no withheld drawable/emission are checked.
Durations255/222frames. Original DEF-15% and ATK-30%/Silence40% process data are
preserved verbatim in originalCommand. Recipes own the stated roguelike effects;
neither original stat formula nor native status-application timing is claimed.

The SAME originalEffectPlayer and existing material/geometry/transform policies
render all8 commands. Known experimental parent-alpha, broader particle-facing,
priority/global-state and some material semantics remain labeled in feature/
coverage reports; nothing is silently promoted to exact original support.
No new native pixels exist for either skill. Battle capture requests75/95/115/160
and45/65/100/145 are review references, not synchronized FFBE pixel references.

The new body's13 tracks include idle/dying/standby/magic_standby/win_before/win,
with existing pivots/recoil. Third-slot basic attack remains melee and does NOT
inherit Barret's four-shot burst. Default roster and all Barret assets remain.
Longer command names move adjacent helper text without changing old short names.

### Practical next step / remaining blockers

The8-command functional target is reached; personal review of the new2 is next.
Do not resume Meteor merely to chase a count. Next content cycle should use
character:* intake on a selected additional character, stage complete resolved
groups, then rank full-preparation results before adding mechanics. Existing
mixed-event and physical-debuff support can serve other exact compatible skills;
no measured additional complete unlock is claimed beyond these2.

Cloud-of-Darkness's9 other active commands retain authoring/type7/type15 gates;
Barrage has no resolved original visual members and requires its execution rule,
not a replacement effect. Other surveyed candidates retain active curves, material
or enum mismatches and unresolved child/process branches. Meteor/Lifestream and
Finishing Touch stay deferred. Audio events/IDs remain metadata-only; no music or
background system was added. Native pixel-perfect research remains deprioritized.

Durable recipes: tools/characters/cloud_of_darkness.json and
tools/presentations/cloud-of-darkness.json. Preserved source plans, preparation
commands, candidate receipts, images and validation reside in
tools/data/skill-seven-eight-20261028 and its immutable supplement. Exact checkpoint
and test receipts: docs/renderer-session-handoff.md. Shared active HEAD/index and
all unrelated working files are preserved. No remote push.

## Current: sixth playable Source command and explicit import decision (2026-10-28)

Continuation of scoped6a98de3. NEW Cloud Trigger Smash227151 is functionally checked
and visually inspected in the actual BattleScene. Total6 Source commands: four
Cloud attacks, Aerith Seal Evil and this self buff. Daniel personally accepted the
four attacks; Seal/Trigger personal approval remains pending. Preview-quality
acceptance is not native whole-skill pixel verification. The eight-command goal
remains OPEN. No new original recording, emulator change or pixel polishing.

### Bounded Null investigation / preserved general input rules

The existing native successful-child Initialize evidence already located Null
parameter words+0xc8/+0xcc and locator+0x2b4. The common BMB reader now preserves
these as native-null-init-inputs-v1, with absolute offsets, supported/unknown input
status and mandatory parent_flags/child_flags context. compile_bmb_module_inputs.py
exports them alongside existing module inputs. nullFlagsFromSource binds checked
source parameters to EXPLICIT caller/child state and reuses nullInitializationFlags.
No authoring Version1_5/1_6 meaning, missing-parent zero or child summary is guessed.

Two independent original sources (white slash and aerial slash) reproduce all11
preserved source input records. The existing160 native successful-child block
controls remain exact. These are NOT whole constructor/allocator executions or
actual context values for arbitrary effects. Parent and child states still come
from execution, and unsupported input words reject this bounded adapter. This
ability alone unlocks0 new playable skills. The22-pair/343-node/1102-field control
regression also remains exact; no new full authoring-free profile is claimed.

Meteor decision: DEFER. Its38-node original and all12resources exist. Remaining
input gaps include parent selectors, actual construction context, compatibility,
emission, appearance, texture/mapping and geometry selectors. Selected renderer
modes cannot be certified before these inputs decode; known Model/Quad/Particle
families do not establish complete support. Missing runtime resources:0. Missing
parser/semantics and possibly selected rendering features are independent gates.
No new inspection of isolated RGB/pixel details is warranted for this candidate.

### Practical import: general Source self-event track

- `SkillConfig.allyEvents` adds reviewed non-damaging friendly events to the SAME
  prepared clock, actor recovery/action barrier and cancellation machinery. The
  first supported profile is stationary SELF, not arbitrary single-ally/party.
  Enemy support/damage tracks remain intact. Mixed tracks, invalid status data,
  incompatible movement/scope and missing Source readiness reject before MP.
- PreparedSceneBridge binds the actor's actual frame/pivot/scale into the host.
  One-friendly-target cardinality reuses the existing geometry player; allegiance
  belongs to the host, not its historical single_enemy label. Actor scale is used
  once rather than multiplying the same sprite scale twice. No new renderer,
  per-character loader or skill/node-specific geometry correction.
- Timed physical boosts live on UnitActor, refresh strongest/longest and never
  multiply-stack. Reviewed duration extends through three FUTURE rounds; Source
  action and basic attacks apply the multiplier in the shared damage paths, once
  per action base for multi-hit fractions. All effects clear at wave/restart.
- Optional reviewed `damageType` makes physical/holy gameplay lanes independent of
  the body pose. Missing values retain the existing legacy motion-based default;
  invalid values reject. No previous balance field changed. This prevents future
  physical skills with magic poses from silently losing physical boosts.
- Existing data-driven menu exposes the fifth Cloud command on page2, no fixed UI
  fields. Source-only self commands stay disabled/rejected in Legacy. All five
  previous visual manifests/plans remain byte-identical. The raw common player,
  native simulation and original draw submission files are unchanged.

Trigger source: atk_lightup_001_yellow.bmb SHA256
`c92968e5f634b168bde0913ab5b98a3119f4dd0bcc545a17c2f6f59d02b23c35`.
One unique original,7 nodes (5Null/1Quad/1Model), TWO complete members atF40/front
andF70/back, two checked PNGs and the original model. No missing drawable bindings,
active drawable withholding, unknown family or substituted effect. Exact
matching authoring is retained. Plan duration287frames, reviewed eventF120.
Gameplay releases around2s after the Source clock, independently of the tail;
magic readiness precedes that clock. No native whole-skill reference exists.
Known preview inheritance/color/order/global-state approximations remain labeled.

Original process130/cost55/self target/motion2 and referenced ability507650
(process111@3@89; ATK cleanse, ATK250%/4turns and break resistance) are preserved
under originalCommand, with master identity and verbatim referenced row/dispatch.
The generic inspector resolves this bounded process130 reference format without
executing cooldown rules. Other formats are not silently normalized. Reviewed
roguelike definition: MP55 once,0 HP damage,physical x1.5 through the next3rounds,
strongest refresh, clear on wave. Original cooldown4:4, stat formula, cleanse and
break resistance are NOT implemented as FFBE systems; current game lacks the
latter debuff/resistance systems. This adaptation is explicit in the recipe and
separate gameplayReview. No false damaging interpretation of the wrapper.
Audio IDs/times/raw records remain preserved; no guessed sound or music binding.

### Measured candidate impact / no guaranteed-yield estimates

`tools/data/import-decision-20261028/import-decision-final.json` covers28 investigated
unique candidates; after Seal/Trigger,26 of this intake remain unpublished. This
is not a count of every FFBE skill or of the four earlier Cloud commands outside
the intake. The measured overlapping blocker counts are:

| Capability family | Affected candidates | Guaranteed playable unlocks |
| --- | --- | --- |
| Authoring-independent selected inputs |24|0; four have only this RECORDED visual family, but unknown selectors can expose more gaps |
| Node type7 |11|0; other gaps coexist |
| Active source curves |9|0; command/other visual gaps coexist |
| Node type4 |7|0; other gaps coexist |
| Resource-version ambiguity |2|0; other gaps coexist |
| Process-indexed timeline |1|0; Lifestream also needs a curve and friendly gameplay |
| Unknown model layout / command lookup / node15 |1 each|0 |

Highest inventory reach is complete authoring-independent input decoding;24 is an
AFFECTED count, not a prediction of24 finished skills. Node7 and curves have next
largest overlap. The actual general self-event/profile integration unlocks ONE
published command: Trigger Smash. Null input extraction alone unlocks ZERO.

New bounded candidates include Big Shot, Mindblow, Grenade Bomb, Hammerblow,
Healing Wind, Esunaga, Dispelga and later Aerith abilities. Their exact receipts
retain authoring, active curve, type4/7, model and version gates. Buster End was
also checked and exposes node15/type4 plus version/authoring gaps; defer it.
No original Barret battle capture was used or claimed. Barret remains a data
candidate, not a source of native visual reference approval.

Lifestream229759 is the next bounded CANDIDATE, not already import-ready. Besides
its selected Scale_Value_Curve, its source effectFrames has a second process-indexed
branch that the existing preview rejects. The batch now marks this explicitly,
rather than reporting just the BMB curve gap. Do not discard/flatten that branch.
It also needs reviewed friendly party/reraise/barrier gameplay; current self-only
profile does not authorize it. Next step: resolve this one curve and process-lane
contract using existing pairs/data, then re-evaluate full preparation BEFORE adding
party mechanics. If this proves broad, choose another candidate; no fixed seventh
skill promise or automatic publication on resource availability.

### Executed validation / durable continuation

Evidence root `tools/data/import-decision-20261028/`. Receipt54 is the final full
Trigger action plus a subsequent boosted Source Cross Slash:5 hits45/45/45/45/270
under a controlled base roll, total450, MP20 once. Trigger MP55 once/zero HP damage,
caster placement/body recovery/tail/expiry/wave MP persistence/shutdown all pass.
Basic physical damage control is150 while active versus100 expired. Receipt53 is
the earlier passing self-only block, not the final multi-hit proof. Frames50/80/
120/170 are preserved.55 Seal,56 Cross and58 all13 Source/Legacy scenarios pass;
57 is the preceding scenario run before the final gameplay-lane refactor.59 fresh
frozen Cloud comparison: all three0 changed pixels. These are preview baselines,
not original-FFBE pixels for Trigger.

39 Node tests pass (including45 custom combat assertions);28 Python tests pass,
no skips. Build passes with existing chunk-size advisory. Reused unchanged native
writer182/180 evidence; no repeat of identical pixel/VM recordings. Early attempts
failed at the shared player's scope admission (fixed at host cardinality adapter)
and a test's constant global RNG caused Phaser text UUID collisions (TEST fixed;
production RNG untouched). Failed attempts are not counted as acceptance.

Reproduce preparation via preserved prepare-trigger.py, publish recipe
`tools/presentations/cloud-trigger-smash.json`, metadata-only Cloud import and
actual `Check playable self buff` in test-source-scene.html. Source inputs/receipts,
recipe and comparisons are frozen in the import-decision preservation supplement.
Checkpoint/preservation receipts are under tools/data/autonomous with prefix
`source-self-buff-20261028`. Shared active HEAD/index and unrelated work are
preserved. No push. Full core contracts remain conservative; P27 retains gated
publication support, P03/P05/P07/P10/P26/P28/P30 remain partial at universal scope.

## Current: bounded binary controls and separated source commands (2026-10-28)

Continuation of scoped00384c3. Five Source commands remain playable; Seal Evil is
still awaiting Daniel's personal visual approval. NEW playable skills:0. Meteor
Rain is NOT published and authoring-free preparation is NOT enabled. All five
published visual manifests, shared renderer and existing gameplay values remain
unchanged. This entry supersedes only the affected intake/provenance boundaries.

### General import capability actually integrated

`bmb_source_controls.py` reads13 verified field slots in the existing01010301
layouts, without choosing offsets from XML or skill identity:

| Node family | Decoded field slots | Still requires other evidence |
| --- | --- | --- |
|0 Null | rotation-parent selector(+136), parent alpha rate(+212), Null type(+692) | Remaining parent selectors, compatibility and other geometry selectors |
|2 Quad | translation/rotation/scale parent selectors(+600/+604/+608), alpha mode(+612), alpha rate(+512) | Matrix/color rate, compatibility, appearance/emission/texture controls |
|3 Particle | alpha mode(+516), alpha rate(+412) | Other parent controls, compatibility and appearance/emission/texture controls |
|6 Model | alpha mode(+580), alpha/color rates(+464/+468) | Other parent selectors, compatibility and appearance/emission/texture controls |

Only actually verified enum values are named. For example Null rotation On=0 /
Off=2 differs from drawable encodings. Unknown values stay unknown; no enum or
missing rate is inferred from a default, neighboring node or name. This is binary
field decoding, not proof of all associated original runtime equations.

`inspect_bmb.py` attaches these records and compares them when the corresponding
project fields exist; minimal structural test projects can still omit the extended
category. Full control audits and preparation require all declared comparison
fields. `original_inheritance.py` uses decoded values after exact float32 comparison
and retains explicit matched-authoring values for the remaining fields. The Null
locator preparer uses the decoded Null type; rotation/scale modes remain supplemented.
No incomplete profile receives playback admission. The existing batch reports
per-node decoded raw values/absolute offsets and missing controls, even when an
original exists without authoring. Structurally resolved resources never imply
semantic support.

### Evidence / no fabricated authoring-free profile

Evidence root: `tools/data/bmb-controls-20261028/`.
`comparison.json`:22 distinct BMB/BMSLN pairs,343 nodes,1102 control comparisons,
zero differences. Corpus includes the previous Cloud and Seal effect inputs plus
four independent matched effects; full known structural/parameter/resource checks
also pass. Hashes and source/field locations are retained. The immutable supplement
contains all22 input pairs so the corpus does not depend on future discovery.

The additional candidate corpus was selected for contrasting authoring values.
Only four of nine selected files passed current full comparison; four other inputs
remain blocked by active curves and one by hierarchy mismatch. Those rejected
inputs were NOT promoted as decoding evidence. The pre-change discovery report
records alternatives, preventing constant-field coincidences from becoming mappings.
Parent alpha and Model color rates include fractional values; no homogeneous
zero/one byte was accepted as an undiscovered selector.

A bounded inspection of the already pinned Null/Particle AssignModule code confirms
related source accesses (including Null rotation+0x88 and Particle alpha rate+0x19c /
mode+0x204); no emulator intervention or recording. Authoring nodeV16 varies among
Null inputs, but no corresponding single bit/boolean was established in those blocks.
This is NOT proof that compatibility is absent, compiled away or globally constant.
Mapping to original construction/context flags is still UNKNOWN; do not replace
these fields with true/false defaults or a guessed packed bit.

`seal-reprepared.json` is a separate full preparation using the new common helpers,
not a replacement of the preserved plan. The common player has identical traced
output over all287 integer frames0..286 with two targets, including creation,
geometry/state and extinction. This proves unchanged preview output for that
profile, NOT native pixel fidelity or a new renderer capability. The snapshot
does not compare UV streams or RGB shader uniforms.

### Meteor and candidate impact

Meteor's original38 nodes/all12 dependencies remain intact.109 control values
can now be read directly for this original. `meteor-control-status.json` retains
every node's remaining fields. The first root input gap is translation-parent
selection, with other parent modes/compatibility, emission, texture tint/mapping
and geometry selectors also unresolved. The raw data is present; these are OUR
parser/semantic gaps. No replacement resource or partial Source skill is published.
All three existing candidate batches were reevaluated with the new checker, reusing
hash-verified staging. Additional fully supported/playable candidates unlocked:0.
Existing active curves, unknown node types4/7 and differing texture versions remain
independent gates; the new reader does not solve them or autoapprove Trigger Smash.

NEXT: inspect the existing native setupper/construction references to distinguish
serialized parent selectors from derived context flags. Start with Null root's
missing translation/matrix and compatibility inputs using its actual BMB record;
then add only independently verified layout slots, validate all22 pairs and attempt
authoring-free preparation of a known supported effect before Comet. Do not repeat
full XML discovery or infer compatibility from its editor label. If that original
mapping cannot be established from existing receipts, name the precise native
construction output required before another bounded diagnostic measurement.

### Original versus reviewed gameplay, audio and regression protection

`source-command-metadata.mjs` adds an immutable `originalCommand` record to newly
published Source command metadata: exact raw master-data row, source ID/type and
database identity. Separate `gameplayReview` marks the recipe-owned balance fields.
Seal's original process24@6@88, process parameters (including SPR-60), cost48,
targets/effect/hit strings are retained verbatim. The game still uses reviewed x1.25
magic weakness and finite enemy-phase effects; it never executes raw FFBE processes.
Only Seal's metadata was republished; the three existing Aerith Legacy commands and
all previous balance fields are semantically unchanged. No visual manifest changed.
Audio IDs/offsets/raw parameters and nullable resource references are preserved;
no additional audio research, playback or music/background coupling was introduced.

Checked:26 Python tests with no skips;32 product Node tests (including45 custom
combat checks), separate full-horizon replay and existing Null controls. Build
passes with existing chunk advisory. Browser receipts49/50/51/52 cover final Seal,
Cross multi-hit, all13 existing Source/Legacy cases and fresh frozen Cloud frames.
The three frozen frames retain0 changed pixels. Existing182/180 native-writer result
is reused: runtime simulator/player and reference inputs did not change; it was not
rerun simply to increase a count. See session-validation.json for receipts/hashes.
An early test invocation named a nonexistent Null Python test; that invocation is
failed evidence, not acceptance. The corrected actual suite passed.

Core contracts P03/P07/P10/P17/P30 remain partial; P27 remains integrated for its gated publication contract; bounded
input parsing/provenance improved, no new original pixel or9/9-node completion claim.
Scoped checkpoint and archive receipts:
`tools/data/autonomous/bmb-source-controls-checkpoint-20261028.json` and
`bmb-source-controls-preservation-20261028.json`. Real HEAD/index and unrelated work
are preserved; no push. Reproduction commands are in the skill workflow.

## Current: fifth playable Source command, bounded intake and audio metadata (2026-10-28)

Final receipts:45 Seal,46 Cross,47 all13 existing cases,48 frozen Cloud (all three0 changed pixels). Final plan/coverage: seal-features-final.json and seal-coverage-final.json in the evidence root.

Continuation of scoped e972731. Daniel has now explicitly accepted all four Cloud
commands. NEW Aerith Seal Evil229751 is playable and visually inspected in the
actual BattleScene; it is NOT yet personally accepted by Daniel or native-pixel
verified. Source coverage is5/8 functionally checked commands, not eight and not
five fully reconstructed original-engine skills. Earlier current-status sections
below are historical where they conflict with this entry. No new original video,
engine instrumentation, reinstall or pixel-perfect investigation was needed.

### New integrated general capabilities and boundaries

- `SkillConfig.supportEvents` is a separate reviewed non-damage gameplay track,
  using the existing prepared Source clock, cancellation, body-recovery and action
  completion barrier. Ordered events are validated before MP. Mixed damage/support
  tracks are currently rejected explicitly. No new renderer or damage-per-skill
  branch was added. `BattleScene` preserves the admitted Source identity through
  a magic-readiness delay even if the visual preference subsequently falls back.
- `enemyStatus.mjs` supports reviewed enemy magic weakness, Silence and Stop,
  independent probabilities, strongest/max-duration refresh and per-enemy-phase
  expiry. Stop blocks an action; Silence blocks magic actions only. All current
  enemy actions are physical, so Silence has no immediate combat effect on them.
  Weakness affects the current holy/magic damage lane, never physical attacks.
  These are ROGUELIKE rules, not reconstructed FFBE stat or immunity formulas.
- Seal Evil retains original ownership (Aerith207000405,5-star level22), MP48,
  magic body pose, process24/6/88 and raw F80 marker. Source/aEnigmatic evidence
  identifies SPR reduction, Silence and Stop, with no HP damage. Recipe adaptation:
  incoming magic x1.25 for3 enemy phases, Silence30%/3 phases, Stop30%/1 phase.
  F80 is a reviewed gameplay point, NOT a measured original status-application time.
- The existing non-Motion-1 composition (offset0) is reused. Three visual members
  use two unique originals: eff_bg_spiral_001_f90 (21nodes) and
  eff_strobe_white_a50_f45 (4nodes), with five checked textures and original meshes.
  All25 nodes use supported families; no active drawable is missing its resource.
  Sound-only groups7000990 remain in metadata, not fabricated visual effects.
  Complete duration286frames; gameplay completes around1334ms after the Source
  clock, independently of the decorative tail. Magic readiness precedes that clock.
- Existing uniform unit-XY Model arena coverage now permits the explicit reviewed
  role `uniform-background`, alongside dimming. Seal's hash-pinned uniform colored
  Model uses it; the spiral/cloud geometry remains unchanged. Source material,
  color/alpha and timing remain active. This is a documented viewport adaptation,
  not a decoded native screen-space flag. No runtime skill/node-name special case.
- `stage_original_skill.py` resolves duplicate archive ORIGINAL members only after
  reading and SHA256-checking every candidate. Byte-identical aliases share one
  payload and retain all provenance. Different payloads remain a hard ambiguity.
  Two shockwave members in Ver31/Ver84 were actually equal (SHA7f161848...);
  further active-curve/authoring blockers remain. Textures with different versions
  are not silently assigned by newest filename or this original-member rule.
- Metadata-only character publication can adopt an existing legacy body only after
  validating its published manifest unit/name and PNG geometry. Existing Aerith
  sprites and three Legacy skill definitions remain unchanged; no rebake/loader.

### Meteor Rain: precise blocker, not a missing original effect

`bm_2017_comet.bmb` SHA256
`3e425ced8fc1d7e9cea965731b79aff77a8d2e43397b7d0f97016b99914c5a91`
exists,54,912bytes,38 nodes (19Null/17Model/2Particle), all12 dependencies resolved.
Five visual members and eight hit markers84..140 are preserved. Exact BMSLN/EFKE
supplement is absent from checked local packages and preservation ZIP indexes.
Memorial runtime ships the BMB, not that authoring project. Thus the main gap is
OUR authoring-dependent interpretation, not unavailable original runtime bytes:
parent-influence modes/rates, compatibility, appearance/tint and emission selectors
are not yet fully decoded independently from BMB. Existing native symbol inspection
does not close that gap. No neutral defaults or partial Meteor publication.

### Bounded candidate coverage / next critical path

| Candidate | Current concrete blockers (no playable count) |
| --- | --- |
| Meteor Rain214830 | Authoring-independent binary semantics above; motion2/process21 gameplay still needs review |
| Limit Braver800530 | No resolved original visual member under current command resolver |
| Ungarmax227875 | Missing matched authoring for hammer/fade; active Texture1 RGB curve |
| White Materia229756 | Active Texture2 scale curve, resource-version ambiguity, cure authoring and node types4/7 |
| Breath of the Earth229752 | Fade authoring, active scale-speed and regen scale-value channels; ally support not yet admitted |
| Fury Brand229753 | Fade/raizin authoring; ally support scope |
| Planet Protector229754 | Barrier/fade/twinkle authoring and barrier type7; ally scope |
| Speed Drink227876 | Brave-front authoring and shockwave scale-speed curve; ally scope |

Trigger Smash227151 is a cooldown-unlock wrapper; local ability507650 is a cleanse/
ATK buff, not direct damage. Different cached revisions have different cooldown
metadata. Do not count or publish it as a damage animation. Barret candidates are
DATA controls only, not BlueStacks-original visual references. Capsule remains a
bounded technical control, not a sixth command.

Highest leverage: decode the smallest authoring-dependent constant fields directly
from matched BMB/BMSLN pairs, validating against those pairs before applying to
Comet. Next bounded step: enumerate the exact missing field spans, starting with
parent-influence/appearance selectors, then attempt authoring-free preparation of
known supported pairs. Do not infer unknown enums or copy native intermediate
matrices. Active curves and node types4/7 remain separate explicit gates. An
alternate immediately supportable complete skill can take priority if found; no
partial imports to fill the eight-command target.

### Audio: inventory and future extension ONLY

`tools/audit_audio_inventory.py` preserves a reproducible local inventory:
252 .acb paths,250 @UTF-header candidates and2 XML-header unvalidated files;
126 adjacent .dat files remain UNCLASSIFIED (not confirmed audio/AWB). Eight WAVs
are present (six background tracks, two system SFX), with headers/hashes, no skill
assignment by name. Cached SE.acb is32,641,440bytes, SHA256
`22d3f4bd8cae9c2a4ae7485f47b583d662563bb84489bd5db100f4668867565f`;
its bytes match FFBE Trace external storage127.0.0.1:5575 via ADB checksum.
Private run-as failed (setegid); external ADB access is not internal-engine access.
Existing UTF reader rejects this bank; codecs, cue tables and sound-ID-to-CueID
join remain UNKNOWN. No decode, extraction, playback or new emulator changes.

Known source links: Meteor sound59 at composed F4/19/34/49/64; Seal sound100 at
F61/F81. These are serialized group links/times, not measured native playback.
`source-audio-events.mjs` normalizes ALL resolved sound-bearing groups, retaining
opaque raw parameters/unparsed issues. Published `audioSource` has nullable
resource and playbackSupported:false; previous plans explicitly retain partial
coverage. Structurally sound-only groups are allowed; unexplained non-file groups
now reject preparation. No existing Cloud timeline or manifest was regenerated.
Audio events use a separate Source-clock lane, never damage markers as a substitute.
Skill SFX, music and background/ambience remain independent future systems.

### Executed evidence and acceptance

Evidence root: `tools/data/skill-expansion-20261028/`; browser receipts remain in
`tools/data/memorial-audit/diagnostic-v35-render-context/`.

- Receipt45: FINAL Seal action after coverage fix, actual menu/page and execution;
  zero HP damage, MP48 once, both targets weakened, gameplay1334ms, natural effect
  cleanup; actual holy100->125/physical100->100; separate guaranteed Stop control
  skips one enemy phase then expires; pending-action restart leaves no stale status
  or effect. F45/65/85/120 PNGs retained; F85 uniform backdrop has no right edge.
- Receipt44 is the earlier provisional before-coverage state, not final acceptance.
- Final Cross and13-case Source/Legacy receipts and fresh-host frozen Cloud receipt
  are recorded in session-validation.json. Frozen baseline remains our preview
  contract, NOT a new FFBE native reference for these complete skills.
-79 Node tests pass, no skips (including45 custom combat checks); four Python alias/
  uniform-role tests pass. Build passes, existing chunk-size advisory only.
- Native writer regression passes unchanged:182 positions,180 exact, SAME two small
  position residuals. No additional native recording or pixel optimization.

General preview limitations (random/hierarchy/material profiles and whole-skill
native references) remain explicit. No original fidelity claim for Seal or new
claim of9/9 reconstructed nodes. The shared player and all four earlier Source
prepared plans/manifests remain unchanged. Scoped checkpoint/preservation receipts:
`tools/data/autonomous/skill-expansion-checkpoint-20261028.json` and
`skill-expansion-preservation-20261028.json`. Active HEAD/index and unrelated work
are retained; no push. Reproduction commands are in the skill workflow.

## Current: playable Cross Slash and reusable damage timelines (2026-10-28)

Continuation of f580d84 and6e477d9. Four Source commands now work in the actual
FFRogue battle: Brave Slash, Blade Beam, Climhazzard and NEW Cross Slash214790.
The first three retain Daniel's accepted visual baseline. Cross Slash is newly
functionally/visually inspected here; do not describe it as personally approved
by Daniel or original-FFBE pixel verified. The eight-skill content goal remains
OPEN. No new original recording was required. Scoped checkpoint identity is in
`tools/data/autonomous/cross-slash-playable-checkpoint-20261028.json`; the shared
active HEAD/real index and unrelated dirty work are preserved. No push.

### General capabilities now used in the actual game

- `SkillConfig.damageEvents` carries ordered prepared-clock frame/weight pairs.
  `skillDamageTimeline.mjs` validates nonempty positive fractions summing to1,
  bounded source duration and an explicit Source-only enemy-action contract.
  Missing/malformed timelines reject BEFORE MP/state mutation. Existing three
  Cloud commands retain their reviewed single event; Blade Beam is NOT silently
  converted from its historical combined hit to two source hits.
- `tools/lib/source-damage-events.mjs` derives a reviewed Motion-1 distribution
  from exact original attackFrames plus the preserved composition offset. Cross
  Slash raw frames4/30/60/90/120 and weights10/10/10/10/60 become prepared frames
  6/32/62/92/122 and fractions.1/.1/.1/.1/.6. Original metadata is retained.
  Recipe owns 3x total damage, MP20 and enemy targeting; no original chain or
  paralysis/damage formula claim. Other motion/process profiles fail this
  automatic damage compiler, rather than inheriting a guessed offset.
- `BattleScene.executePreparedSkill` owns once-only cancellable event timers,
  actor recovery and final-impact completion. Finite decorative lifetime stays
  independent. Per-event damage uses a shared action-base roll and reviewed
  fractions with integer rounding per hit. Single-target timelines LOCK the
  original target; remaining hits cancel on its death, with no damage spilling
  into another target's fixed visual anchor. Area timelines capture the initial
  living targets and skip defeated ones on later events. Last-enemy death locks
  inputs immediately. Shutdown removes timers/listeners without stale damage.
- Skill slots are reused through catalog-length-driven pages. Z/X or visible
  previous/next buttons change pages; Q remains Attack, W/E/R select that page's
  three skills. Page controls have30px hit regions. Switching hero resets/clamps
  the page; planning and paging spend no MP/action. A20-command control wraps
  seven pages. No per-character UI fields or landscape redesign.
- Cross Slash has `requiresSourceScene:true`. It is disabled/rejected in Legacy
  or while the Source scene is unavailable. No incomplete body-only Legacy
  replacement was introduced. All existing other Legacy commands remain intact.
- The existing arena coverage mechanism also accepts EXPLICIT reviewed dimming
  Model roles: hash-identified single-texture uniform unit-XY rectangles only.
  The compiler verifies actual PNG uniformity/opacity and mesh geometry; runtime
  checks identity/bounds. Source alpha/color/blend/layer/lifetime remain active.
  Only Cross Slash's reviewed flat backdrop is declared in the presentation
  recipe; the attack/model/particle geometry is unchanged. This removes its
  visible rectangular dimming edge in the adapted viewport. It is a REVIEWED
  composition adaptation, not a newly decoded original screen-space flag. No
  renderer branch checks Cloud, Cross Slash, an effect name or a node number.

### Reused visual evidence and conversion boundaries

Original prepared input `tools/data/scene-migration/cross-slash/plan.json` and
prior previews remain untouched. Source effects: atk_slash1_white32c66c01...,
sp_20157_kyogiri_back761f7812... and sp_20157_kyogiri_fronte8b4d3ce...; full hashes
remain in the plan/manifests. All88 nodes use admitted families0/2/3/6. The legacy
`withholdUntexturedParticles` flag is present, but no active drawable node lacks
its texture/model in THIS plan; no effect was omitted to make the import pass.
Seven hash-checked PNGs, original models, UVs/materials and Motion-1 composition
are reused through the same Live-Player. Existing raw-player identity is unchanged.

`tools/effects/repairs/cross_slash_uv.json` repairs a converted EFKE's omitted atlas
quadrant offsets. It is NOT applied to this original-BMB path; source UV rules
already provide those selections. Do not stack the converted fix, an artwork
rotation or fitted scale onto the new path. General preview approximations
(random/module/hierarchy support and Model/material boundaries) remain documented
in the preserved plan and common player policies. No whole-skill native capture
or original actor/camera pixel baseline exists for Cross Slash. Controlled native
white-effect precision does not establish this different skill's original fidelity.

### Actual acceptance evidence

Evidence directory: `tools/data/cross-slash-playable-20261028`.
Browser receipts in diagnostic-v35-render-context:

| Receipt | What was actually checked |
| --- | --- |
|38 | Published fourth command via menu handlers; five hits, one MP charge; locked target death; early victory/wave persistence; mid-action restart. Initial visual placement retained for before/after comparison. |
|39 | All13 existing Source/Legacy/combat/multi-target/restart/fallback cases pass. The older temporary Cross one-hit smoke control remains a CONTROL, not the proof of the new five-hit command. |
|40 | Fresh identical host: all three frozen Cloud frames have0 changed pixels. A preceding attempt after moving to another encounter was correctly rejected for a different host, NOT accepted as a pixel comparison. |
|41 | Final Cross action after bounded backdrop coverage: same five hit frames, MP20 once, gameplay release about2.07s after timeline start, actor at home, decorative tail active. Full effect ends naturally at187frames; paging, defeat, wave and shutdown pass. |
|42 | Separate actual two-target/two-event area control: first target dies on event1, second receives both fractions, MP30 once, gameplay ends about1504ms at finalF90. This synthetic control is NOT another published skill. |
|43 | Final fresh-host frozen Cloud check after the coverage extension: all three frames remain0 changed pixels. |

The300ms approach precedes the reported Cross timeline. Gameplay does not wait
for187-frame decorative completion. Browser snapshots and before/after backdrop
images are retained, including actual mouse page-selection/preparation/execution.
76 Node tests pass, no skips (including the driver with44 custom combat checks).
Python uniform-flash/model-role rejection checks and cached-resource identity
check pass. Build passes with the existing chunk-size advisory. Original writer
regression remains182/180 exact with the SAME two tiny position residuals; no
pixel-perfect research was performed. First browser attempt omitted the reward
selection prerequisite in its setup; corrected the TEST, preserved production's
wave guard. Failed attempts are not counted as acceptance.

### Automation and next import gate

`import_character.mjs --publish-skills-only` validates the existing sprite/body
identity and geometry, preserves all existing command IDs and publishes checked
skill metadata/provenance without rerunning ffbetool or rebaking sprites. The
existing scene publisher handles resource hashes, prepared-plan admission and
optional reviewed arena surfaces. The batch audit now exposes raw command/process,
movement/target and learning requirements, with automaticDamageApproval:false;
resource availability must never be treated as a playable damage skill.

Reproduce preparation/publication from the preserved local plan:

```powershell
node tools/publish_scene_presentations.mjs --recipe tools/presentations/cross-slash-import-test.json --python <configured-python.exe>
node tools/import_character.mjs --recipe tools/characters/cloud.json --publish-skills-only --python <configured-python.exe>
node --test tools/test_skill_damage_timeline.mjs tools/test_combat_regressions.mjs tools/test_scene_migration.mjs
npm run build
```

A further SIX candidates were actually staged with existing tools. See
`tools/data/cross-slash-playable-20261028/candidates/candidate-audit.json`:

| Candidate | Concrete remaining gate |
| --- | --- |
| Meteor Rain214830 | Only detected visual-data blocker: missing matched bm_2017_comet authoring. Eight source hit records and five original visual members are available. Best next direct-damage import to assess. |
| Trigger Smash227151 | No detected structural blocker, but process130 with raw parameter507650,1,4:4 is NOT a reviewed direct-damage command. Rarity7/level110 learning requirements also require loadout review. Record507650 exists with the same name but a DIFFERENT visual group; process semantics remain unverified. Resolve the command's referenced behavior before publication; do not invent a3x attack from its name. |
| Sonic Impact236480 | Unverified active rotation curve plus missing authoring for three members. |
| Satellite Beam227874 | Missing matched authoring and type4 in the large beam; remains Legacy, never a BlueStacks-verified reference. |
| Banish10060 | Both exact front/back authoring supplements absent. No similarly named effect substitution. |
| Holy10210 | Front authoring absent; source process169/450-frame impact also needs gameplay review. |

Previous Healing Wind/Curaja/Banishga/Big Shot/Grenade Bomb blockers remain valid.
Native non-Motion-1 prefix suppression already exists in compose_skill_effects.py;
that fact alone does NOT solve command, body or process semantics. Do not repeat
Motion-1 research to import Meteor Rain. Next narrow technical task: determine
whether the missing comet inheritance/tint/emission supplement can be recovered
from an exact source or decoded with existing pinned original accessors. If not,
record the specific raw fields requiring a targeted original measurement: parent influence modes/rates and compatibility flags, texture tint controls, and emission-shape selection currently supplied by authoring. Do not substitute neutral defaults. Do not
publish an incomplete visual or skip a member. The next product goal is a FIFTH
fully checked command, not an artificial total of eight.

## Current: bounded independent transfer and actual import coverage (2026-10-28)

Product fixes are checked and retained in scoped checkpoint f580d844 (parent
c5b5375), ref codex/gameplay-quality-20261028. The subsequent bounded transfer is
saved separately; its exact checkpoint/ref is in
`tools/data/autonomous/capsule-import-checkpoint-20261028.json`. Active HEAD and
the real index are intentionally unchanged in this shared dirty checkout. No push.

### Independent Capsule transfer

`native-static-default-onex-basic-v1` joins the existing source-selected OneX
writer, finite lifecycle, Default-parent transform and Basic/ordinary blend in
`src/effects/nativeStaticBasicBranch.mjs` through `nativeSourceBranches.mjs` and
the existing shared Live-Player. No new renderer or effect-name branch. OneX's
absent initializer owns zero scalar-work slots and consumes no initializer RNG;
ColorConst starts at the resulting source-selected offset. ConstX/VelocityX
behavior is unchanged. The profile admits a single immediate finite Particle
behind a static full-inheritance/non-V15 Default chain, neutral tint/alpha, full
UV, one texture and identity billboard axes. Unknown profiles fail closed.

All123 retained Capsule states match:2178 vertex-position numbers are exact,
UV/RGBA/tints agree, lifetime includes emptyF0/F122. Parent origin/scale/basis max
absolute residual is1.1920928955078125e-7; no computed native matrices/vertices are
runtime inputs. Four local parent transforms come from checked source records,
including X tilt and nonuniform scale. Matching authoring supplies inheritance
flags; those offsets are NOT claimed binary-decoded. Existing helpers reselect
and hash-check original dispatch/shaders/blend and verify source authoring tint.
External host pose and FOUR EXPLICIT reference seed words remain inputs. The
seed is synthetic from the old reference, not reconstructed game seed allocation.

Browser receipt36 runs the compiled control in actual BattleScene/shared WebGL
atF0/1/30/60/121/122; projected vertices/visibility agree with the old reference
under the declared host, normal completion occurs once, and resources/extern
layers are released. The retained capsule image is upright and textured. This
is a standalone technical control, NOT an owned playable skill. The123 states
were produced by isolated original functions plus explicit adapters, not a live
whole-engine Capsule trace. No Capsule GPU texture readback or native pixel
sequence exists. Whole-effect support remains false; do not upgrade9-node or
universal skill status based on this bounded integration.

Evidence: `tools/test_static_basic_branch.mjs`, `tools/prepare_static_basic_effect.py`,
`tools/data/connected-effect/capsule.json`, compiled plan/manifest in
`tools/data/gameplay-quality-20261028/capsule`, original BMB
SHAeba0da5ad2443d9ebdb8a9635f86077d14c3a535514308f778cf73c31719b830,
PNG SHAaa6ceaaae16b5882113e0142a040c5a48a0f7be1c2d41ad983f2736c25c7d02b,
BMSLN SHA60d7f94da583ff11ac0eca50dd80602adb61fbf494b8835221df1a682bbd90bf.
Reproduction command is in `docs/research/connected-second-effect.md`.

### Skill coverage and automation:3 accepted playable Source skills

The accepted three remain Brave Slash, Blade Beam and Climhazzard. Capsule does
not count. Cross Slash's standalone import control does not count either.
The milestone of eight is NOT achieved. No incomplete replacement was published;
all existing Legacy skills, recipes and assets remain available.

New `tools/plan_source_imports.mjs` resolves exact owned active IDs once per
character and saves review inputs. `tools/stage_source_imports.py` reuses existing
checked CPK staging, rehashes cached source/resources and reparses BMB with the
current parser before classifying blockers. It checks matching authoring, node
families, resource-version conflicts and model layouts. Results explicitly say
blocked or needs-prepared-plan-and-combat-review; neither means playable. No
catalog/publication side effects. Recipe selection, semantic profile admission,
roguelike mechanics, actor choreography and visual review remain deliberate gates.

Six candidates were actually staged/audited, with machine-readable evidence in
`tools/data/gameplay-quality-20261028/candidates/candidate-audit.json`:

| Candidate | Actual next gate / blocker |
| --- | --- |
| Cloud Cross Slash214790 | No detected structural blocker in staged visual members; existing composed preview retained. Needs reviewed five-hit gameplay timeline, action/menu integration, full combat/visual approval and resource-version review. No native whole-skill reference. |
| Aerith Healing Wind229750 | Type7 and no matched authoring for eff_fullcure_white; party-target Source orchestration also outside the current enemy-target scene contract. |
| Aerith Curaja10290 | Types4/7 and missing matched authoring for wm_1029_cure5_front. Party healing is not an admitted Source scene profile. |
| Aerith Banishga10170 | Missing matched authoring; type7; unverified BR3M vertex/index layout in wm_1017_banish2 branches. |
| Barret Big Shot227870 | Active Texture1 RGB value curve is unverified; matched hardshot authoring absent. |
| Barret Grenade Bomb227872 | Type7 and matched authoring absent for eff_convergence_explosion_orange. |

Missing authoring means the CURRENT exact-source supplement cannot be supplied;
it is not proof that no alternative source exists anywhere. Likewise no detected
blocker is not complete semantic support. Barret remains a data/Legacy control,
NOT a Bluestacks-verified skill reference.

Reproduce without publishing:

```powershell
node tools/plan_source_imports.mjs --select cloud:214790,aerith:229750,aerith:10290,aerith:10170,barret:227870,barret:227872 --output tools/data/gameplay-quality-20261028/candidates
$env:PYTHONPATH='tools;tools/memorial'
# Use the configured Python executable, not Windows' Store alias.
& $python tools/stage_source_imports.py --selection tools/data/gameplay-quality-20261028/candidates/selection.json
```

### Verification and next critical path

Post-transfer frozen browser receipt37:0 changed pixels for all three retained
Cloud frames; no accepted baseline overwritten. Receipt35 remains the unchanged
13-case combat validation after the gameplay fix.57 Node tests pass (including
40 custom combat assertions in that driver); no skips. Python cached identity and
uniform-flash rejection checks pass. Build passes, existing chunk advisory only.
Writer regression still21frames/182packets/180exact, SAME two small position
residuals, max0.00006103515625. No new original recording or tiny RGB optimization.
Files/receipts are listed in `session-validation.json` and `transfer-validation.json`
under tools/data/gameplay-quality-20261028. Explicit flash frames intentionally
change only the reviewed arena plane, not all accepted Source geometry.

Next product milestone: publish Cross Slash through existing composition after a
GENERAL weighted/multiple gameplay-event schedule and a command-list capacity
solution. Preserve the existing single reviewed hit for all three accepted Cloud
skills. Cross Slash's source weights/times are evidence, not automatic gameplay
approval. A fourth skill must be reachable in the real menu, consume MP once,
resolve all reviewed hits exactly once, handle early victory/shutdown and pass
full animation review. Do not declare the temporary one-hit control a five-hit
implementation. Then prefer the cheapest data/profile gap that unlocks another
candidate; only investigate type7/curves when tied to that actual import. Do not
resume broad nine-node/pixel research by default. Eight accepted playable skills
remain an OPEN content milestone, not an achieved universal-import claim.

## Current product priority: flash coverage and immediate gameplay release (2026-10-28)

User accepts the three Cloud visuals and c5b5375's bounded pixel result. Tiny RGB
optimization is no longer a priority. New research must unlock an import, useful
shared capability or visible/functional fix. Accepted playable Source skills:3;
Capsule and Cross Slash remain controls, not new accepted playable skills.

First two product fixes are integrated. The reviewed presentation compiler can
annotate uniform opaque single-texture Basic Particle planes as arena flashes
through an explicit recipe policy. It verifies image uniformity/alpha and hashes;
patterned, translucent, untextured and two-texture primitives remain untouched.
This is a declared game-composition adaptation, NOT a decoded native screen flag.
Do not enable the policy on arbitrary unreviewed imports: a uniform projectile
does not establish flash intent. No effect name, character name or fitted scale
is checked in the renderer. Only the annotated plane is mapped to the actual
arena rectangle. Its original alpha, color, visibility/lifetime, blend and layer
remain active. Camera translation is compensated only for screen coverage;
world-space effects retain their transforms. Source geometry/old previews remain
archived. Original640x1136 camera and adapted1000x1100 game are not conflated.

Gameplay completion now waits for actor recovery AND the reviewed impact and
outstanding projectile impacts, not for the decorative scene's duration. The
bridge still owns its finite effect clock. A later Source presentation replaces
the previous decorative channel; wave/mode/restart/shutdown clears it. This is
bounded replacement, not overlapping instances of the same prepared variant.
Legacy behavior and all reviewed damage events remain unchanged; Blade Beam's
existing two source metadata hits are still its reviewed single combined hit.

Actual combat measurements, from Source timeline start to gameplay completion:

| Skill | c5b5375 reference | New | MP / reviewed hits |
| --- | --- | --- | --- |
| Brave Slash | 3130ms | 1269ms | 18 /1 |
| Blade Beam | 3120ms | 966ms | 30 /1 |
| Climhazzard | 3347ms | 1252ms | 52 /1 |

These compare retained measured combat receipt30 with new35, not an unmeasured
historical build. Dash approach precedes the reported timeline. Frozen Cloud
receipt31 retains0 changed pixels for all three accepted frames. Explicit flash
frames intentionally change, while numerical tests compare all other state and
geometry to the preserved plans unchanged. Actual flash receipt34 validates
two effects at their peak visible opacity in620x682,400x800 and1000x600 parent
windows, FIT displays620x682,400x440 and545.45x600, with nonzero camera scroll.
The logical framebuffer remains1000x1100, and letterbox space is not part of
the playfield. Six corrected frames and two matched prior-world-plane controls
are retained. Receipts32/33 used stale cached parent sizes; superseded. Test
code now uses documented setParentSize and waits for actual fitted bounds.

Evidence: tools/data/gameplay-quality-20261028/session-validation.json plus
diagnostic-v35-render-context/browser-review-31/34/35.json. Source/profile,
bridge clock/cancellation, geometry and40 combat checks pass; build passes with
the existing chunk-size advisory. Initial stale tests that required effects to
finish or required a later home sample were updated for the requested semantics.
No failed test is counted as successful. No new native recording was required.

Components P20/P23/P25 gain explicit presentation-space coverage; P26/P28 now
separate gameplay completion from decorative lifetime. Full native9-node and
30-component reconstruction statuses are not upgraded by a gameplay adaptation.
Next bounded step is Capsule's existing OneX/Basic + static tilted Default chain.
Do not globally relax the VelocityX/two-texture contract. Then audit actual
complete skill candidates; eight playable Source skills are NOT yet achieved.

## Current: resource-version mismatch resolved; bounded pixel acceptance (2026-10-28)

Continuation of scoped421c41d. The first remaining significant cause was **source
resource identity**, not a missing shader or a fitted geometry/position rule.
The original GPU textures are RGBA/UNSIGNED_BYTE128x128. Revision9 captures their
client bytes at glTexImage2D entry and reads the stored texels without rewriting
the original texture. All196,608 client bytes equal the normalized GPU readbacks.
The existing tutorial-CPK palette PNGs differ. Three local rawdata/assets/effect_resource
PNGs, processed through the already reconstructed integer Cocos formula, match
all three actual uploads byte for byte. No native texel buffers are runtime inputs.

General integration: tools/memorial/prepare_texture_upload.py now accepts a
complete explicit --resource-bindings file. Both file and prepared-upload hashes
must match; missing/extra bindings fail. tools/effects/verified_native_textures.json
pins these source versions as an unapproved controlled-reference recipe. It does
not define global archive precedence or silently migrate published Cloud plans.
The existing shared DataTexture/Live-Player path is reused without renderer changes.
The actual BattleScene accepts the prepared outputs via the controlled test's
textureFixture parameter; ordinary Cloud/Legacy execution is unchanged.

### Pixel results and meaningful error areas

All12 retained visible J frames were rerendered on transparent, black and white,
with the same original pixels, measured seeds, root, camera, viewport/scissor,
original priorities, geometry and shader/material state. Only selected source
PNGs changed. Native computed transforms/vertices were not injected.

| Background | Weighted mean RGB | Max R/G/B/A | Changed RGB pixels, summed | Pixels above2 |
| --- | --- | --- | --- | --- |
| Black | 0.000357365 | 1/2/2/1 | 219 | 0 |
| White | 0.000694459 | 1/1/1/1 | 238 | 0 |
| Transparent | 0.000357365 | 1/2/2/1 | 219 | 0 |

Black weighted RGB mean0.178946270 ->0.000357365; max5 ->2. Across all
backgrounds framebuffer alpha max6 ->1. Frames2,5,6,7,8,9,10,11,12 are exact
RGBA on ALL three backgrounds. Before correction,614 black pixels exceeded2,
with a largest8-neighbor component of18 pixels; three isolated pixels exceeded4.
After correction none exceeds2. Even counting every one-code RGB difference,
the largest residual black components are4 pixels atF1,6 atF3,3 atF4; the largest
of these has maximum1. Bounds are retained in residual-regions.json. There is no
remaining high-contrast coherent error region in this reference corpus.

These are8-bit code-value monitors, not a perceptual JND claim. The mean alone
was insufficient: the previous white-background union included its clear color
and diluted its mean. The shared metric now excludes the declared clear RGB,
reports per-channel maxima, signed bias and8-neighbor areas at>2/>4/>8/>16.
White means before harness7 must NOT be compared as signal-only statistics.
Black statistics remain directly comparable. All per-frame/all-background
statistics live in session-validation.json and verified-source-comparison.json.

| Source step | Previous mean RGB | Verified-source mean RGB | Max R/G/B/A | Changed RGB pixels |
| --- | --- | --- | --- | --- |
| 1 | 0.266150 | 0.002405 | [1, 2, 1, 1] | 124 |
| 2 | 0.271682 | 0.000000 | [0, 0, 0, 0] | 0 |
| 3 | 0.249165 | 0.000255 | [1, 1, 1, 0] | 21 |
| 4 | 0.172114 | 0.000454 | [1, 1, 2, 1] | 74 |
| 5 | 0.065921 | 0.000000 | [0, 0, 0, 0] | 0 |
| 6 | 0.452591 | 0.000000 | [0, 0, 0, 0] | 0 |
| 7 | 0.420707 | 0.000000 | [0, 0, 0, 0] | 0 |
| 8 | 0.425176 | 0.000000 | [0, 0, 0, 0] | 0 |
| 9 | 0.431739 | 0.000000 | [0, 0, 0, 0] | 0 |
| 10 | 0.426465 | 0.000000 | [0, 0, 0, 0] | 0 |
| 11 | 0.402591 | 0.000000 | [0, 0, 0, 0] | 0 |
| 12 | 0.416667 | 0.000000 | [0, 0, 0, 0] | 0 |

Native and browser both have DITHER on, alpha-to-coverage off,8-bit RGBA,
24-bit depth/8-bit stencil and no MSAA samples. Reported SUBPIXEL_BITS differ:
native8, browser4. Remaining one/two-code edge errors are consistent with
backend/raster arithmetic; this is a classification hypothesis, not a proof of
their unique cause. No dither, precision, color or position fitting was added.
The existing two tiny writer position residuals remain;F2 is now pixel-exact.

### Coverage and bounded acceptance decision

**Accept this controlled data profile as sufficiently visually faithful for
transfer testing**, with the recorded residual envelope. Criteria are: same BMB
and independently verified texture bytes; all182 writer events retained with
exact UV/colors and the same two classified position residuals; all visible
unit-step frames compared at matched host/time; no missing/coherent contrasted
features; empty tail and no extra emission; unchanged gameplay/cleanup/baselines.
Cross-backend one/two-code edge differences do not justify an engine correction
without a demonstrated semantic cause. Freeze these measured per-frame bounds
as regressions, not as a universal tolerance for other materials or backgrounds.

This is NOT full original-skill acceptance, automatic seed/host derivation,
continuous-time equivalence, full scene composition or complete allocator/free
reconstruction. RunJ has all12 visible source steps, the existing empty GPU tail
and CPU end through21. NewK/M sampled late draws16/20/21/22/23 and observed no GPU
commands through native-wrapper destruction. Empty exports have no FBO pixels;
they prove no writes, not a new image readback. There are no new intermediate
fractional-time original pixels. Complete nodes remain0/9; core counts remain
5 INTEGRIERT /25 TEILWEISE. P01/P10 gain explicit resource-version admission,
P08 remains decoder support, P20/P22/P25 gain bounded actual upload/state/pixel
evidence, and P29/P30 gain read-only upload and spatial-error validation.

### Exact evidence and reproducibility

Evidence root: tools/data/memorial-audit/diagnostic-v36-texture-state.
RunK used observer revision8, runM revision9; native hash remains6c7e501c...926b77.
Full source/texture/CPU/GPU identities are in the tracked recipe and
native-m/render-v36-m-tex919/920/921.json. CPU uploads are original-entry bytes,
not captured screenshots. K/M texels are identical. Root/RNG differ fromJ;
their framebuffer images must not replace J's matched references.

- Pixel receipts26(before),27(after) in diagnostic-v35-render-context;27 uses
  harness8, local PNG inputs and shared production player. No oracle matrices.
- Product receipt28: six BattleScene frames,67 packets,1206 world-coordinate
  values, observed priority submission, emptyF13 and one natural completion.
- Frozen Cloud receipt29: all three baseline images0 changed pixels.
- Combat receipt30:13 actual Source/Legacy scenarios including MP, hits, actor
  recovery, multiple targets, restart/fallback, victory/wave blocking and cleanup.
  Satellite Beam is regression-only, NEVER native fidelity evidence.
- writer-regression-j.json:182 outputs /180 exact /same2 position residuals.
-39 Node regressions passed,21 targeted checks after harness changes passed,
  2 resource-selection Python tests passed, no skips. Build passed; existing Vite
  chunk-size advisory remains. Exact logs/commands are in the session folder.
- verified-source-comparison.png/.webp shows Original /previous /verified inputs
  at identical times and crops; numerical metrics use original raw RGBA.

Reproduce preparation using the existing helper:

```powershell
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' tools/memorial/prepare_texture_upload.py --fixture tools/data/memorial-audit/diagnostic-v35-render-context/pixel-fixture-j.json --resource-bindings tools/effects/verified_native_textures.json --output tools/data/memorial-audit/diagnostic-v36-texture-state/verified-reproduction
node --test tools/test_native_pixels.mjs tools/memorial/test_live_effect_export.mjs tools/test_scene_migration.mjs
```

The frozen verified-j.html/pixel-metric-v2.mjs reproduces the12-frame browser
comparison through the existing sink3152. The source-scene harness uses
textureFixture=/tools/data/memorial-audit/diagnostic-v36-texture-state/pixel-fixture-verified-j.json.
Original assets/APK remain local; preservation includes the three exact PNGs,
requests, CPU bytes, normalized texels, receipts and comparison images.

### Transfer decision and next critical path

Select eff_capsule_001.bmb as the independent second effect. It is not a Cloud
skill, color-only slash variant, or visually fitted replacement. Existing source,
authoring, PNG,123-state export and original isolated-function evidence are
retained in docs/research/connected-second-effect.md. No individual name/size/
geometry fitting was used there. It is NOT already accepted by the current
connected live graph or measured against whole native GPU pixels.

| Capability | Transfer evidence / next requirement |
| --- | --- |
| BMB resource tables and exact source identity | Existing5-node source and PNG verified; explicit version binding reusable |
| Packed UV/RGBA, texture orientation, ordinary blend | Existing original Basic fragment/OneX writer references; same shared material and blend tables apply |
| Cocos upload preparation and spatial metrics | Name-independent tools reusable; actual Capsule upload identity still needs measurement before fidelity approval |
| Non-full-Z source priority | General source parser/combsort available; read actual flags/priorities, never copy white priorities |
| Constant-one alpha/no alpha module | Existing isolated export supports it; do not invent a curve |
| Tilted Default parent, OneX/Basic particle | Existing evidence exists; current nativeParticleBranch admits only neutral immediate parent/VelocityX two-texture Add. Live integration remains missing |
| Whole native reference | No Capsule GPU/pixel sequence yet; old123 states execute original isolated functions, not a live whole-engine trace |

**Next step:** admit the evidenced finite OneX/Basic branch and constant tilted
Default parent using existing transform/material/scheduler functions, with a
complete Prepared contract and fail-closed checks. Compare exported state/UV/
RGBA/lifetime to the retained123-step control before any new pixel session.
Do not route Capsule through an expanded VelocityX whitelist or call an isolated
writer a fully integrated effect. Then obtain its own bounded native GPU/pixel
reference through an explicit source-admission extension of the existing tools.

Universal blockers remain seed construction/host placement, unsupported graph
and module families, full-Z/runtime material overrides, general target/camera
composition, and unknown BMB type7 (Finishing Touch, not node index7). Source
version precedence must not be inferred from similar names or one matching trio.
Do not spend the next block forcing the remaining two-code pixels to zero.

## Current: original source-priority submission integrated (2026-10-28)

Continuation of scoped1b40a19. The experimental blend-bucket explanation is
superseded: this BMB enables priority sorting, with original priorities0.4 for
the two leading Quad branches and0.5 for the others. The non-full-Z original
NodeTree sorts metadata by Float32 priority, with an epsilon tie rule and original
metadata-index tie-break. It sorts EMITTER packets, not individual particles.
Zero-alpha live primitives remain part of a metadata packet. Simulation, RNG,
geometry and original material/blend descriptors are not reordered or rewritten.

The common player admits explicit native-priority-nonfullz-v1 metadata prepared
from verified IBMB fields by tools/prepare_draw_submission.py. Full-Z, unknown
layouts/flags and missing/nonfinite priorities fail closed. Ordinary Cloud
previews and Legacy retain their existing path. No arbitrary depth offsets or
skill checks were added. Native sorting matches134 synthetic original-instruction
controls; seven available authoring pairs verify25 raw priority fields. An eighth
source decodes5 further fields but lacks its authoring file; no extra verification
is claimed for that missing pair.

Final before/after pixel receipts19/23 cover all12 visible J frames under identical
measured source/time/host/resources. Signal-weighted black RGB mean0.5433->0.1789;
maximum79->5. Frame1 mean1.9227->0.2661; late frames unchanged. Maximum framebuffer
alpha difference across all backgrounds61->6. NOT pixel-identical or full-skill
approval. Original packet regression remains182 outputs/180 exact/SAME2 tiny
position differences. Actual BattleScene submission is observed in receipt22;
frozen Cloud receipt24 and final combat receipt25 are the final regression records.
See the newest map/handoff for actual final checks and input limits.

The shared-sampler experiment changes no pixels here. Native-world placement
changes only negligible early pixels; neither hypothesis is enabled in production.
Next compare actual native texture upload format/bytes and remaining framebuffer
state against prepared RGBA8. Existing shader sources declare highp; do not assume
mediump or guess quantization to force the residuals to zero. No new emulator
capture or APK change was needed in this block.

### Original ordering evidence and exact supported rule

Evidence directory: tools/data/memorial-audit/diagnostic-v35-render-context.
Original source/native identities remain those of runJ, including source
32c66c01d93f64f2fb67a5c0580bb62f2622b1a56a1e36e55210594e10b07de9 and
native6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77.

- NodeTree::MakeVertex0x1fb8ef0 /2108bytes, code SHA256
  b13ed36367925370f63fe89f10fcd8ce7de322e90e4bb7af316ec3882d7dad69.
  Non-full-Z callbacks generate metadata in their original traversal order. Only
  the subsequent command submission indices are sorted. Source header+0x4c
  selects full-Z; header+0x4d==1 enables priority sorting. J is full-Z0/priority1.
- Quad VertexMaker loads parameter+0x1fc and stores raw float bits into metadata
  +0x18 at0x20208f8..0x2020918 (also the alternate0x2020de0..0x2020dfc).
  Particle uses parameter+0x198, metadata+0x18 at0x2022928..0x202294c and
  0x2021af4..0x2021b14. These are general trait fields, not node-number rules.
- Metadata sorting is combsort: gap=floor(gap*10/13),9/10->11, minimum1; repeat
  until gap1/no swaps. Compare Float32(a-b). If abs(difference) is below the
  original Float32 epsilon9.999999974752427e-7, original metadata index breaks
  ties; otherwise smaller priority first. Ordinary Array.sort or blend sorting
  is not a substitute, especially for near-epsilon nontransitive comparisons.
- One non-full-Z emitter produces a metadata packet containing its live primitive
  run. Sorting each mesh separately would change combsort inputs. The common
  nativeSubmissionRanks groups by actual prepared emitter identity, includes
  existing zero-alpha packets, sorts groups, then flattens creation-order members.
  Rank is a submission index, never an invented physical depth. Frustum/alpha
  rejection can omit meshes afterward without changing native sorting inputs.
- Full-Z geometry ordering, Model/Stripe priority layouts and other graph profiles
  are not enabled by this change. The compiler supports only verified Quad2 and
  Particle3 layouts in the existing admitted source profile.

draw-tree-original.json, draw-meta-maker-original.json,
draw-particle-meta-original.json and draw-order-original.json retain bounded
exact-build disassembly. priority-native-controls.json records134 cases executed
in the original NodeTree routine with synthetic metadata callbacks and observed
final command-builder boundaries. It is NOT a new native whole-effect capture.
Controls vary count0..128, priorities, negative values, ties, near ties and sort
enablement. The metadata generation callbacks retain original input order.
priority-controls-overlap-invalid.json is explicitly INVALID: an early128-record
fixture overlapped its scratch region; corrected controls use separate buffers.
Do not reuse that discarded result as original evidence.

For J, native physical GPU signatures are Basic/Semitrans(texture921),
Basic/Semitrans(texture920), Basic/SemiAdd(texture921), Add/SemiAdd(texture919,
two layers), then the Add particle run. Their source association is2,4,3,6,8;
priorities are0.4,0.4,0.5,0.5,0.5. The earlier source sequence2,3,4,6,8 is still
the correct CPU/RNG traversal. Program IDs/counts, bound textures/samplers,
RGB/alpha blend factors, culling and depth state for EACH of the12 frames are
retained in priority-pixel-comparison-final-j.json/nativeGpuCalls. Those original
physical batches are not claimed to equal Three's individual draw-call count.
Native batches include alpha-zero/offscreen vertices; Three can omit their meshes.

### Integration and current status boundary

src/effects/nativeDrawSubmission.mjs owns the general Float32 comparator,
original gap schedule and metadata grouping. originalEffectPlayer.mjs uses only
the final ranks; evaluateNativeSourceBranches and all182 writer outputs remain
unchanged. The optional drawSubmission profile carries original priorities,
enablement and source identity, compiled from source data. No captured native
sort result, computed parent matrix or vertex output is a runtime input.

Actual game tool Check original source priority feeds this profile through the
existing PreparedSceneBridge. Receipt22 observes real onBeforeRender submission
at six frames, including emptyF13, and natural completion. In frame8, Particle
ranks4..18 preserve preceding live/zero-alpha emitter packets. Receipt21's F13
array was accidentally mutated by later natural replay; it is superseded by22's
frame-owned snapshots. Receipt14 is earlier product integration without this
direct submission observation. None of these observer receipts is a native pixel
oracle by itself.

All four published manifests changed only player provenance; original plans,
source resources, Cloud choreography and reviewed costs/damage remain unchanged.
Cloud publication still uses the user-approved source-preview path; the newly
verified priority profile is explicitly admitted, not globally enabled for every
unknown source graph. Reference effect J is controllably improved in actual game.

| Component/node subset | Native evidence | Shared simulation/player | Product status / remaining gate |
| --- | --- | --- | --- |
| P22 non-full-Z priority and ties | Original routine plus134 controls | Exact comparator, emitter grouping and rank output | Integrated q profile; full-Z/other trait layouts open |
| P19/P21 materials/alpha | Original pinned shaders and liveJ descriptors retained | No blend/color/material change in this integration | Same admitted profile; actual upload format/bytes still not measured |
| P29/P30 comparison | Same12 original GPU frames | Before/after RGB and alpha, faithful opaque RGB views | Reusable benchmark and game submission observation |
| Drawables2/3/4/6/8 | Original priorities and CPU/GPU join | CPU states unchanged; native group ordering reproduced | q profile; complete material/order/fidelity cell remains partial |
| Non-drawables0/1/5/7 | Existing lifecycle/parent evidence | Unchanged | Init/seeds/flags/free gates unchanged |

Complete original nodes remain0/9. The30-component tally stays5 integrated/25
partial; a newly integrated ordering subset does not certify the entire P22 stage.
Simulation/order reproduction, productive use and pixel-original fidelity remain
separate acceptance claims.

### Twelve-frame before/after image evidence

Black signal-union absolute RGB levels0..255; alpha is measured independently.
The existing integer Cocos upload/linear filter correction is enabled in BOTH
columns. The only runtime rendering change is the original submission rule.

| Frame | Previous mean RGB | New mean RGB | Previous max RGB | New max RGB |
| --- | --- | --- | --- | --- |
| 1 | 1.9227 | 0.2661 | 79 | 4 |
| 2 | 1.3143 | 0.2717 | 56 | 5 |
| 3 | 0.6123 | 0.2492 | 33 | 5 |
| 4 | 0.3156 | 0.1721 | 17 | 4 |
| 5 | 0.0659 | 0.0659 | 3 | 3 |
| 6 | 0.4526 | 0.4526 | 4 | 4 |
| 7 | 0.4207 | 0.4207 | 3 | 3 |
| 8 | 0.4252 | 0.4252 | 3 | 3 |
| 9 | 0.4317 | 0.4317 | 4 | 4 |
| 10 | 0.4265 | 0.4265 | 3 | 3 |
| 11 | 0.4026 | 0.4026 | 3 | 3 |
| 12 | 0.4167 | 0.4167 | 2 | 2 |

Signal-weighted mean over all12 frames:0.5432872->0.1789463. Unweighted mean of
the12 frame means:0.6005671->0.3334140. Worst RGB79->5. Worst alpha over
black/white/transparent61->6. White's nonzero union covers its full background
and dilutes its mean; it is NOT the headline fidelity statistic.

Largest final examples: F2 at(x379,y632), originalRGB[179,221,222], common player
[180,223,227]; F3 at(x17,y747), original[132,179,170], common[128,174,166]. These
are small intensity residuals, not the earlier large overlay-order error. No
pixel-parity claim is made. All remaining differences/bounds/alpha statistics and
source conditions are machine-readable in priority-pixel-comparison-final-j.json.

The before/after PNGs are opaque views of raw RGB; RGBA metrics still use original
readback alpha. This avoids Canvas premultiply/unpremultiply changing display
RGB. Receipt19's numbers exactly match prior9; final23 exactly matches20's image
metrics after emitter-group correction. tools/compare_native_pixels.py recomputes
RGB sums/maxima from the saved image bytes and checks them against receipts.
Intermediate13/20 used per-primitive ranking and are superseded by the final
emitter grouping, even though this source's pixel metrics are identical.

Direct comparison: priority-pixel-comparison-final-j.png (overviewF1, common
zoomF1, overviewF6), and lossless .webp (all12 observed visible steps). Common
physical crop[0,450,750,870], top-left coordinates after readback Y flip; zoom
[270,589,398,717]. Identical nearest-neighbor scaling, no fitting/alignment/color
correction. Animation deliberately uses50ms/step; not original real-time footage
or proof for uncaptured frames18..21. J remains a controlled white-source
substitution, not the complete unmodified Brave Slash skill.

### Additional bounded investigations and next blocker

Receipt15: matching the native shared-texture sampler alias for same source
resources changes ZERO pixels in all12 frames. It is NOT enabled in production
and is not an explanation for these residuals. Receipt18: native-world packet
placement changes meanF1 only0.2661499->0.2660582 andF4 by about0.000012; later
frames and maxima unchanged. This is not a meaningful visual gain; do not replace
the working placement or chase the two known tiny coordinates for these pixels.

Next smallest useful original measurement: actual texture upload descriptors and
bytes for the three bound original resources, plus DITHER and framebuffer color
precision. Extend the EXISTING GPU exporter to correlate glTexImage2D (or compressed
uploads) with the bound textures, record format/type/internal format/dimensions
and input SHA, and observe DITHER/color-bit state on the same controlled draw.
Compare actual uploaded texels to cocos-uploads-j before changing any conversion.
No ordinary video will answer this. Texture2D::initWithImage contains an actual
convertDataToFormat stage and mutable format selection (texture-format-original.json).
Its presence is proof of a possible conversion stage, NOT proof of quantization
or any particular live format. Default static values are not live overrides.
Native shader sources declare highp; mediump is not an evidenced fix.

### Reproduction and final verification

```
python tools/memorial/emulate_draw_priority.py --apk tools/data/memorial-audit/installed-base-v208.apk --output tools/data/memorial-audit/diagnostic-v35-render-context/priority-native-controls.json
python tools/prepare_draw_submission.py --source tools/data/shared-skill-review/brave-slash-composed/originals/atk_slash1_white.bmb --program tools/data/memorial-audit/diagnostic-v35-render-context/program-j.json --authoring rawdata/assets/battle_effect/atk_slash1_white.bmsln --output tools/data/memorial-audit/diagnostic-v35-render-context/program-j-ordered.json
```

Use existing Python native dependencies/PYTHONPATH in the handoff. The source-only
stage needs no APK. For pixel replay use /tools/test-native-pixels.html and
Compare original source priority; retained versioned pixel-priority-j-v4.html /
pixel-priority-engine-v4.mjs reproduce the final comparison helper. Use the
existing loopback sink3152 without resetting its counter. The actual game test
is /tools/test-source-scene.html -> Check original source priority; final frozen
helper product-priority-j-v3.html. References19/23/22/24/25 identify actual runs.

Final executed checks and exact checkpoint/archive IDs are in the handoff and
tools/data/autonomous/priority-submission-checkpoint-20261028.json. No new APK,
emulator setting change, remote push, source-skill publication or reward binding.


### Final executed verification for this checkpoint

- Original sort controls134; independent shared comparator matches every case.
- Python source-layout tests2 pass:8 decoded sources/30 fields;7 available
  authoring pairs/25 exact fields,1 explicit missing authoring source.
- Final Node regression command in priority-session-validation.json:36 tests
  pass,0 failures/skips, including40 combat checks and emitter-group/zero-alpha
  coverage. Same simulation/packet output across frames0..21 is asserted.
- npm run build passes; existing Vite chunk-size advisory only.
- Actual product receipt22:6 frames,67 packets,1206 world-buffer values, observed
  submission order and natural callback1. F13 draw list is empty.
- Frozen receipt24: all3 Cloud frames0 changed pixels. Combat receipt25 passes
  all13 reviewed scenarios, including Legacy, costs/damage, body/effect timing,
  multi-target and cleanup. Satellite remains product regression only.
- Native J writer comparison remains182 outputs/180 exact/SAME2 small positions;
  final pixel23 and faithful RGB image verification cover all12 frames.

No remote push; prior work/index/HEAD retained. The new local preservation
archive is tools/data/visual-preservation/priority-submission-20261028.zip;
its verified receipt and the exact scoped commit are referenced in
tools/data/autonomous/priority-submission-checkpoint-20261028.json.

## Historical entries (superseded where noted above)
## Current: actual native pixel sequence and texture upload integration (2026-10-28)

Continuation of scoped checkpoint8bd5379; keeps6ab0858's five-branch combat path.
**Technical:**182 actual writer outputs,180 exact, SAME2 known tiny center
residuals. **Visual:**12 nonempty original GPU frames now compared against the
existing common player. Full pixel identity is false. Ordinary approved Cloud
visuals retain their frozen baselines. Completed nodes remain0/9; the30-component
totals remain5 INTEGRIERT /25 TEILWEISE, not a new whole-engine fidelity claim.

### Recovery result and trustworthy observation boundary

The apparent restart hang was not reproduced in the Android guest. Current r4,
previous34 and a same-key original-community control all showed stale Windows
captures; even the launcher before FFBE produced the stale wallpaper. Android
screencap showed the live title, loading, main menu and battle, and ADB actions
successfully prepared/executed the controlled effect. The GPU-hook startup-hang
hypothesis is unsupported by those controls. Windows presentation versus capture
backend remains unresolved; do not claim that host capture was fixed.

Only Trace was restarted/updated. UID10107 and existing data were retained; no
uninstall/data clear/root/asset deletion. A reversible Trace-only OpenGL control
did not repair host capture; original vlcn configuration and35/r4 are restored.
See diagnostic-v35-recovery/startup-findings.json, guest-r4-vulkan-title.png,
guest-main-2.png, brave-prepared.png, and before/after data listings. Private
BlueStacks .conf/.bstk backups stay local and are excluded from preview archives.
ADB127.0.0.1:5575 is now a proven guest-image/input route, separate from internal
engine hooks. The route is recorded in the session handoff; no manual prep pending.

### Original measurement, resources and input conditions

Evidence folder: tools/data/memorial-audit/diagnostic-v35-render-context.
run-j.jsonl SHA256 ab050c69b1df2e4eeac6c73bef2cf99d5417d9d26220c5f6740ca0d64fd3c15b:
7250 events,21frames,182 writer pairs, completed at native-wrapper-destroy.
The repaired exact wrapper/source identity join is actually exercised, not just
boot-calibrated. native-j/render-v35-j-d*.json plus .rgba.zlib preserve real
original GPU command mirrors on transparent/black/white targets. Native simulation
and original draws still execute normally; no substitute simulation is used there.

- Source atk_slash1_white.bmb SHA25632c66c01d93f64f2fb67a5c0580bb62f2622b1a56a1e36e55210594e10b07de9,
  substituted for the green wrapper inside Brave Slash; unit time steps, not the
  unmodified whole skill or an uninstrumented real-time performance measurement.
- Draw ordinals4..15 join actual source frames1..12. First3 draws and frames13..17
  are empty. Lifecycle extends to21; no pixel evidence exists for18..21.
- Isolated target1080x1917; original viewport[0,1,1080,1917], enabled scissor
  [0,1,1080,1856]. Root[149,736,0], scale1.774999976158142. Effective world/view
  shader matrices identity; projection diagonal[.0031250000465661287,
  .0017605633474886417,-.00009999999747378752], translation[-1,-1,0]. The incoming
  wrapper's Y=-36 matrix is NOT blindly applied a second time.
- All observed min/mag texture filters GL_LINEAR9729. Actual blend factors,
  texture identities, UV trims and uniforms are retained in original metadata.
- program-j.json and pixel-fixture-j.json drive shared source simulation from
  parameters, measured initial seeds and explicit host inputs, NOT native computed
  parent matrices, instance output records or vertex buffers. Native matrices and
  packets are independent oracles only. Seed construction and general host
  parameter derivation remain outside this bounded profile.

### Proven rule integration and first substantial image mismatch

1. Measured linear filtering is optional nativeQuadBranches.textureSampling.
   Common player configures both map layers, no mipmaps; unsupported filters fail
   closed. This corrects the default Three mipmapped sampling mismatch.
2. Original Cocos Image::premultipliedAlpha at0x212a5a0 (144 bytes, native SHA
   6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77) computes
   RGB=(RGB*(A+1))>>8, preserves alpha. initWithPngData's RGBA branch consults
   the default-enabled PNG flag. Original instruction replay matches2560 synthetic
   pixels spanning every alpha. This is isolated instruction evidence, not a
   byte-for-byte live GPU texture readback. png-premultiply-original.json and
   cocos-uploads-j/uploads.json preserve provenance and the bounded code hash.
3. tools/memorial/prepare_texture_upload.py performs conversion OFFLINE. Optional
   nativeTextureUploads descriptors carry explicit profile, dimensions, URL and
   source/output hashes. The common runtime loads prepared RGBA8 DataTextures;
   no raw BMB/PNG parsing or integer conversion is moved into src/. No double
   premultiply; sizes/profiles rejected on mismatch. Existing PNG loading remains
   the default for unchanged published Cloud/Legacy plans.

These are common rendering capabilities, not per-skill offsets. They are active
only in the admitted controlled source profile, including the real BattleScene
review. They are NOT silently enabled for all imported effects or published Cloud.
All4 manifests changed only player provenance hash; source plans/assets unchanged.

### Measurable pixel evidence (black-background signal union, RGB levels0..255)

| Frame | Before mean absolute RGB | Integrated upload + linear mean | Maximum RGB after |
| --- | --- | --- | --- |
| 1 | 16.6883 | 1.9227 | 79 |
| 2 | 20.7990 | 1.3143 | 56 |
| 5 | 4.5994 | 0.0659 | 3 |
| 6 | 15.2011 | 0.4526 | 4 |
| 12 | 18.8107 | 0.4167 | 2 |

All12-frame/all3-background metrics, alpha errors and bounds are in
pixel-comparison-summary-j.json; native-pixels-j-comparison.png shows a common
crop with no per-image alignment. RGB and framebuffer alpha are separate metrics.
White's nonzero signal union spans the full background, diluting its mean; do NOT
use that diluted value to claim fidelity. The maximum deviations prevent claiming
pixel identity even where the mean is small.

browser-review-4.json is the before measurement;5 linear-only;7 a valid browser
upload hypothesis;8 adds experimental stable blend buckets;9 is the integrated
prepared Cocos upload path with original shared DFS ordering retained. Receipt6
is INVALID as upload evidence: a stale cached helper ignored that switch. It is
kept and labelled rather than treated as a successful duplicate test.

### Remaining mismatch, hypothesis and next dependency

ORIGINAL BELEGT: actual first8 GPU frames submit nodes2,4,3,6,8, whereas CPU
source/creation traversal is2,3,4,6,8. Alpha before SemiAdd affects overlapping
early pixels. Late frames contain only Particle output. HYPOTHESIS: stable blend
buckets reproduce this one source's observed order; receipt8 dropsF1 mean to0.2733
and maxRGB4. It is NOT an established universal sort rule and is NOT integrated.

Next reconstruct DrawMetaData::MakeDrawCommandList and bmfw::Animation::Draw
sorting using retained exact-build code and J command metadata. Existing
draw-order-original.json/symbols identify the list builders and BMB priority flag
at header+0x4d. Need prove actual sort key, priority enablement and stable ties on
an independent bounded case before changing shared order. Preserve known CPU
traversal/lifecycle order; GPU submission is a distinct stage.

Also open: both node6 layers alias the same original GLtexture919, whose sampler
state is shared/last-written; common player clones each layer's address mode.
Determine whether that explains residual pixels before adding any workaround.
Small raster/filter/blend precision differences remain. Do not prioritize the
two subpixel parent residuals over these visible material/submission issues.
Whole skill, arbitrary seeds/flags, allocator/free and unknown node types remain
separate acceptance blockers. No additional ordinary video is needed next.

### Current component and node capability update

| Existing component | New checked subset | Integration boundary / remaining blocker |
| --- | --- | --- |
| P08 external texture data | Offline source-PNG to native integer RGBA8 upload | Common optional loader; color-profile/live byte readback not certified |
| P19 / P21 material and alpha | Original integer premultiply, effective global uniforms | Bounded source profile only; broader variants remain partial |
| P22 passes/order | Actual GPU order and linear samplers measured | Filtering integrated; sorting/aliasing unresolved, no whole-pass promotion |
| P23 / P25 host/framebuffer | Same projection, viewport/scissor and backgrounds used | Explicit captured host conditions, not universal host reconstruction |
| P29 / P30 reference/acceptance | Reusable original GPU sequence versus shared player |12 nonempty frames, separate RGB/alpha, no full skill approval |

For drawable nodes2/3/4/6/8, live writer fields/UV/tints and actual GPU shader,
blend/sampler/context are now N-confirmed for J's bounded conditions. All182
ordered writer states remain S-checked (180 exact,2 strict residuals). Common
product q profile supports the upload/filter capabilities; material/order as a
whole stays partial because source DFS differs from actual GPU submission. No
other node lifecycle/init/free cell is promoted by a pixel test. The detailed
N/S/P matrix below remains conservative; the material/order column stays~/~/q.

### Reproduction and checks actually completed

Use `npm run dev -- --host 127.0.0.1 --port 3000`.
Keep the existing local receipt sink3152 running; do not restart its counter and
overwrite receipts. /tools/test-native-pixels.html provides explicit before,
linear, hypothesis and prepared-upload buttons. Existing versioned snapshots
pixel-review-j-v5.html and pixel-engine-j-v4.mjs retain the exact executed helper.
Never treat a cached helper run as changed conditions.

Offline upload reproduction (Python dependencies from the existing native tools):
```
python tools/memorial/prepare_texture_upload.py --fixture tools/data/memorial-audit/diagnostic-v35-render-context/pixel-fixture-j.json --output tools/data/memorial-audit/diagnostic-v35-render-context/cocos-uploads-j --verify-native tools/data/memorial-audit/installed-base-v208.apk
```
The Windows bundled Python absolute path is in the handoff. All source/resource
and prepared output hashes are retained; source PNGs were not rewritten.

- Node regression command: node --test tools/test_particle_render_context.mjs
  tools/test_quad_render_packets.mjs tools/test_particle_render_packets.mjs
  tools/test_native_pixels.mjs tools/test_scene_migration.mjs
  tools/test_combat_regressions.mjs:27 Node tests pass, including40 combat checks.
- npm run build passes; existing Vite chunk-size warning only.
- browser-review-10.json: all3 frozen Cloud reference frames0 changed pixels.
- browser-review-11.json plus check_quad_product_receipt --connected: actual
  BattleScene,6 frames/67 packets/1206 world values, natural callback exactly1.
- browser-review-12.json: full actual Source/Legacy migration review passes,
  including MP/damage, body/home versus effect end, multi-target, teardown and
  existing regression cases. Satellite is product/Legacy regression only, NOT
  an additional native-reference skill.

This is a visual improvement of the controlled five-branch source profile and
new shared player capability. Ordinary Cloud visuals intentionally remain the
user-confirmed minimum baseline; no whole-effect pixel-original claim is made.

## Historical entries (superseded where noted above)
## Current: live writer buffers verified; GPU identity join repaired (2026-10-28)

Continuation of scoped97b535f, based on6ab0858. The user's prepared Brave Slash
was executed ONCE, with declared green->white source substitution and unit steps.
This is a controlled original-effect measurement, not an unmodified skill/pixel
reference. No renderer or approved Cloud plan changed in this continuation.
Complete nodes0/9 and the30-component tally remain unchanged.

Evidence folder: tools/data/memorial-audit/diagnostic-v35-render-context.
run-i.jsonl SHA256 f6a5c99ebe2a9c967fa3ced506ad253ef81ddfc72c58170e9754c48331a4dbc8:
7230 events,21frames,182 writer-enter/leave pairs; all3 deferred writer hooks
actually executed, no hook errors/missing hooks, wrapper-destroy captured.
Quad2/3/4/6 each8 outputs; Particle8 150. Actual writer contexts establish
identity draw axes, full independent UV trims [0,0,1,1], neutral layer tints.
These were previously explicit fixtures rather than live-pointee observations.
UV2 affine is measured independently (node6 scale1.4285714626; node8 scale2).
Raw six-vertex buffers include positions, RGBA, UV1/UV2 and layer tints.

Reproduction:
```
node tools/prepare_quad_branch.mjs --plan tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json --trace tools/data/memorial-audit/diagnostic-v35-render-context/run-i.jsonl --inputs tools/data/connected-effect/quad-module-inputs.json --output tools/data/memorial-audit/diagnostic-v35-render-context/quad-program-i.json
node tools/prepare_particle_packet_branch.mjs --quads tools/data/memorial-audit/diagnostic-v35-render-context/quad-program-i.json --plan tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json --inputs tools/data/connected-effect/quad-module-inputs.json --trace tools/data/memorial-audit/diagnostic-v35-render-context/run-i.jsonl --output tools/data/memorial-audit/diagnostic-v35-render-context/program-i.json
node tools/compare_native_writer_trace.mjs tools/data/memorial-audit/diagnostic-v35-render-context/run-i.jsonl tools/data/memorial-audit/diagnostic-v35-render-context/program-i.json tools/data/memorial-audit/diagnostic-v35-render-context/live-writer-comparison-i.json
```

Result:182 ordered actual buffers versus independent shared branch execution,
180 exact packets; SAME2 known inherited Null7 center residuals (F1/instance1:
0.0000152587890625; F2/instance7:0.00006103515625, each repeated on6 vertices).
All UV/RGBA/tint fields exact. No native computed parent matrices or make/work
records supplied at runtime. Explicit external inputs remain measured initial
emitter seeds, root pose [148,733,0], scale1.774999976158142 and bounded render
context. Seed construction/arbitrary initial flags remain open. Comparator rejects
source mismatch/incomplete capture/uninitialized writer records and retains strict
original/simulator fields, frame, instance, context and precision differences.

pipeline-i-extracted.json records actual controlled-wrapper GPU observations:
identity view; orthographic projection diagonal [.0031250000465661287,
.0017605633474886417,-.00009999999747378752], translation[-1,-1,0]; physical
viewport[0,1,1080,1917], enabled scissor[0,1,1080,1856]. These differ from engine
640x1100 and projection height1136. Existing measured-host compositor represents
these conventions; no new camera rule inferred from a single observation.

RunI contains NO isolated GPU images: wrapper kept name atk_slash3_green while
CreateAnimation used atk_slash1_white. GPU filename filter skipped the actual
controlled wrapper. This is a diagnosis identity-join failure, not absent draws.
Do not repeat that unchanged capture.

live_effect_export.js revision7 now accepts exact wrapper binding ONLY from
native_export_probe's completed live-source controller when token and single
resource match the active bounded request. Bound pointer identity takes precedence
over stale filename; other pointers/tokens/resources fail closed.12 observer tests
pass, including wrong-token/resource/null/foreign-wrapper rejection.

build-r4 same-key installed/calibrated, GPUrevision7 ready, PID7187,
ADB127.0.0.1:5575, UID10107 unchanged. Read-back APK SHA256
e2a48522a5a08ab5554d8552673a1346f73b09b4c1eacdf2d48a3b20c7aa2f27.
Rollback35/r3 installed-verified.apk55a380d6... and prior34/VM backup retained.
No data clear/uninstall. New binding NOT yet exercised in live effect.

Next: user asked to prepare Golden Bomb Rush/Brave Slash again after update.
Window image appears stale (old12:14attack); ADB confirms fresh PID/calibration.
Do not execute from stale coordinates. When ready arm retained arm-j.json,
request-j.json,gpu-request-j.json (tokenrender-v35-j), verify acknowledgements,
execute once; join gpu-reference-draw.frame/drawIndex to isolated output metadata.
Inspect actual matrices/uniforms/samplers/blend/scissor and nonempty images, then
compare SAME shared player under declared host/seed/time/texture conditions.
Native-pixel agreement remains unproven. Ordinary Cloud/Legacy and prior frozen
browser receipts remain unchanged; no redundant runtime tests were repeated.



### Autonomous recovery and preservation follow-up

User was away and authorized autonomous restart. App-only restart did not refresh
its displayed old attack. Closed ONLY FFBE Trace through its close dialog, then
started that row in BlueStacks Manager. Reconnected ADB127.0.0.1:5575 and launched
Lapis. New app PID3331 calibrated and revision7-ready; Android Awake/resumed app,
no ANR. Window now remains on initial BlueStacks wallpaper instead of a usable
FFBE title. Source requests remain disarmed. Two recovery approaches exhausted;
no reinstall/data clear/security/graphics setting changes attempted. A usable
original game view is required before arming runJ. User need not execute blindly.

A preservation check found the accepted player's raw CRLF bytes were normalized
by its old Git text/eol=lf rule, while published provenance and visual identity
tests hash raw bytes. This made the scoped Git blob differ from the checked file.
.gitattributes now pins originalEffectPlayer.mjs as -text (like nativeLifecycle).
No runtime bytes or baseline hashes changed. New checkpoint stores the exact
reviewed bytes; verify its blob SHA against the published playerSha256. This is
checkout reproducibility, not a rendering improvement. The whole current player
is included only to retain byte identity, with identical JavaScript content to97b.

The live comparison's positive run and negative incomplete-capture/changed-UV
controls pass (tools/test_live_writer_comparison.mjs). Three controller tests and
12observer tests pass. Earlier product/frozen GPU receipts are reused because
runtime bytes and plans have not changed. No new visual FFBE match claim.


Preservation: scoped checkpoint559726151c8043514e48ad2926e576a18b6ef902,
ref codex/live-writer-context-20261028, real HEAD/index unchanged, no push.
New verified raw-byte archive tools/data/visual-preservation/live-writer-context-20261028.zip:
699705099bytes,1535files,45plans; SHA256
3114fddae3323612e2c73e85c3d5182ee9face2d99df91a88c0b3b71ff9a5a29.
The prior immutable archives remain available. Archive verification checks each
member hash and ZIP integrity; APK/VM recovery files remain separately retained.


## Current: independent UV streams, bounded camera axes and diagnostic35 readiness (2026-10-28)

Continued from6ab0858; existing partial-source integration and the approved Cloud
visual baseline are preserved. No full native effect/pixel comparison has been
completed in this continuation. The new live measurement requires one manual
battle/skill preparation; an asynchronous request is pending. Work below separates
implemented rules, controlled references, actual product checks and deferred hooks.
The30-core tally and complete-node count0/9 are unchanged.

### Integrated general rendering rules

1. nativeParticlePacket.mjs now accepts explicit finite affine draw bases and
   normalized atlas rectangles [x,y,width,height] in each layer, under the existing
   zero-roll VelocityX/two-texture profile. Writer axes use the first two draw-basis
   columns, with no translation from that basis, as in the original instructions.
   Source/node transforms still compute the center independently. UV trim values
   normalize to float32 before arithmetic, matching the native memory ABI; no
   coordinate nudge or skill identifier selects behavior. Quad trim admission is
   still full-texture only; arbitrary camera projection is NOT newly supported.
2. originalEffectPlayer.mjs packet materials now bind sourceSecondUv as an
   independent interpolated vertex stream. The former layer2Uv*UV1 shortcut is
   invalid for differently cropped layers, and needlessly recalculated an already
   prepared stream in the fragment shader. directSecondUv is opt-in for packet
   materials only, with a separate SOURCE_PACKET_SECOND_UV shader define to avoid
   cache collisions. Ordinary preview/Legacy shader behavior stays selected.
3. The existing verifyShaderAdd GPU harness includes a deliberately cropped UV1
   and unrelated UV2 case against the UNEDITED pinned native Add fragment. Expected
   RGBA [8,42,0,42], new candidate [8,42,0,42], former path [8,8,0,42]. Other alpha,
   zero-RGBA, second-layer and legacy negative controls pass. This is controlled
   browser GPU agreement with original shader SOURCE, not an Android frame claim.

Original instruction controls: tools/memorial/export_particle_context_controls.py
reuses ParticleTwoTextureReference and the source-selected original chain/writer.
12 cases vary identity/Y-rotation/Z-rotation/nonbinary rotated axes and two
independent atlas rectangles. tests/test naming is tools/test_particle_render_context.mjs;
all resulting packed positions/UVs/RGBA/tints match. Inputs are SYNTHETIC writer
fixtures, and those tests do not establish the producer of a live camera matrix
or live trim values. Legacy original chain probes also retain their prior defaults.

### Original diagnostic: prepared, installed, not yet measured

ADB endpoint127.0.0.1:5575 reaches FFBE Trace (Tiramisu64_2), package
com.square_enix.ffbejpn, UID10107. The installed34 APK was pulled and its hash
matched d746580c2710de31d5cb024aafff330f49f213e1cc1f71860e0a4feacc0526a6.
Rollback APK and prior diagnostic sources were saved. Six prior cold VM backup
files have their expected sizes; earlier full hashes are retained, not recomputed.
Only same-key install-r/arm64 was used: no uninstall, data clear or main-instance
mutation. V1/v2/v3 signatures,16KB alignment and same signer were checked.

Installed35/build-r3 APK SHA256:
55a380d64ddf20f036ae5a2904837b072774a7624dd372093bf6ba29326be54f.
Read-back installed APK agrees. Live log proves observer35, calibration
[1.25,-2.5,3.75],24 engine hooks/47 deferred module hooks, ready56 and
live-export-ready revision6. The first combined build correctly rejected an
already-hooked draw prologue; r3 uses the established pre-hook verified-head map,
just like the existing native export. No fingerprint check was removed.

New lifecycle observer fields:
- Final color-make boundaries copy drawData+0x20's16-float basis, both trim blocks
  +0x188/+0x214, UV affine outputs+0x198/+0x224, RGB, alpha and texture tints.
- Three exact-source writer hooks0x2005180/40,0x2005500/64,0x2001a40/64 capture
  six actual packed vertices, context, node/record and common lifecycle sequence.
- Hooks defer until exact-source Initialize. Readiness does NOT prove execution;
  no new original writer event or GPU frame has yet been captured.
- Existing live GPU mirror is included in observe mode. Its optional selected
  draws record actual program uniform arrays/samplers, texture filtering/wrap,
  culling/depth/blend/clipping state, source root/view/projection and isolated
  transparent/black/white pixel outputs. Texture-unit changes restore prior state.
  The known mirror's remaining stencil/viewport limits remain explicit.

All capture requests remain disarmed. Prepared files are arm-i.json,
request-i.json and gpu-request-i.json under tools/data/memorial-audit/
diagnostic-v35-render-context. Conditions: one exact-source substitution
atk_slash3_green -> atk_slash1_white, original caller owns the wrapper, unit
Animation delta1, GPU draw indices1/3/5/8/10/12. Match each GPU receipt drawIndex to
lifecycle gpu-reference-draw.frame, NOT to nativeTick by assumption: the controller
restores caller delta after Animation::Update. This is a controlled original
renderer reference, not an unchanged complete Brave Slash animation.

### Evidence and regressions actually executed

- writer-context-controls.json:12 synthetic original instruction controls.
- observer-tests.log:11 observer/GPU-observer Node tests, no skips. Includes
  render-basis/trim pointer reads, read-only recorder and uniform-array indexing /
  active texture restoration. No boot/readiness assertion substitutes for native firing.
- product-regressions.log:22 numeric/product tests plus40 combat assertions pass.
  Source H still has182 ordered packets,180 exact and SAME2 known center residuals;
  no tiny-position correction was attempted. Packet UV2 upload and shader cache
  separation are checked, including independent cropped UV input.
- render-tests.log also exercises four existing Add/material regression cases.
- browser-review-1.json:8 GPU controls (including2 deliberate negative controls).
- browser-review-2.json: three frozen Cloud frames,0 changed pixels.
- browser-review-3.json and product-packet-check.json: real BattleScene six frames,
 67 packets/1206 world values, natural completion and restored scene bridge.
- build-product.log: build passes, existing Vite chunk-size warning only.
- review-context-v1.html: exact successful QA page; prepared data/member timelines
  and image resources were not rewritten. Four public manifests refresh only the
  common-player provenance hash.

### Exact pending dependency and next action

The emulator opened Memories directly into Season Selection; the requested Event
Battles tab was not available through that path. The user was asked to open Golden
Bomb Rush and PREPARE Brave Slash, without execution, then reply ready. Do not
race the user's preparation with UI inputs. After ready: push lifecycle arm file,
controller request and GPU request, verify all arm acknowledgements, then execute
once and pull render-v35-i.jsonl plus GPU outputs. Verify actual writer hooks,
complete source/frame joins, no missing/unreadable/truncated fields and exact image
conditions before using them as native reference. No new ordinary video is needed.

Then compare from the first divergent render state: actual basis/trim versus
explicit fixtures, source-selected packed buffers, program/samplers, projection,
viewport/scissor and finally pixels on the same backgrounds. Use the SAME shared
player and host contract; no per-skill offset/material fix. Do not count planned
GPU output as measured, or the12 instruction controls as a live-camera capture.

Reproduce controls (Python/dependency paths are in the handoff):
```powershell
python tools/memorial/export_particle_context_controls.py --apk tools/data/memorial-audit/installed-base-v208.apk --source tools/data/shared-skill-review/brave-slash-composed/originals/atk_slash1_white.bmb --output tools/data/memorial-audit/diagnostic-v35-render-context/writer-context-controls.json
node --test tools/test_particle_render_context.mjs
```
Reuse the generated controls while implementation/conditions are unchanged.

## Current: connected Particle packets join the shared combat renderer (2026-10-28)

Continued from scoped checkpoint713a2f2. The missing drawable7->8 branch now
runs from prepared source parameters, initial emitter seeds and explicit scene
inputs through the SAME shared player and PreparedSceneBridge. Four Quad branches
and15 Particle slots cover all five drawable source-node definitions2/3/4/6/8.
This is a **controlled bounded profile**, not an accepted complete original effect.
The30-core tally stays5 INTEGRIERT /0 VERSTANDEN /25 TEILWEISE /0 UNBEKANNT;
complete original nodes remain0/9. Seed construction, initialization flags/work
reservations, actual live render context and original frees are not closed.

### General rules and integration boundaries

- src/effects/nativeParticleBranch.mjs uses NativeGeneratorOwner for one moving
  Null emitter and one shared Particle RNG owner with15 separate generator
  records. Birth/Update/Post, parent expiry, retained moving-parent records,
  VelocityX catch-up, UVConst/RGB init and independently computed ancestor1 are
  connected; no native matrices/records/centers are runtime inputs. The existing
  replay tool uses the SAME packet function, rather than a fitted vertex path.
- src/effects/nativeParticlePacket.mjs implements the source-selected zero-roll
  two-texture Particle writer0x2001a40/stride64 (retained range ends0x2001ebc).
  Six radius-one vertices use separate float32 writer operation order. UV2 uses
  centered inverse constant scale; packed RGB and both neutral texture tints are
  retained. It is not the single-texture writer0x20016bc or the Quad writer.
- src/effects/nativeSourceBranches.mjs combines these packets with the existing
  Quad evaluator. originalEffectPlayer.mjs extends its EXISTING opt-in
  plan.nativeQuadBranches profile with particleBranches. Materials, source
  resource resolution, address modes, blend adapter and framebuffer are reused.
  No second renderer and no Cloud-specific dispatch. Unknown modes reject.
- tools/prepare_particle_packet_branch.mjs adds the finite branch to an admitted
  Quad prepared profile. It validates complete ordered observed init/update/make
  contracts, constant ancestors, a single child, neutral inherited modulation,
  single-cycle schedules and static centered UVs. Module selection is reviewed
  trace metadata, NOT a universal raw selector compiler. Ordinary Cloud plans
  and reward bindings do not select this bounded source profile.

### Reference strength and strict residuals

No new BlueStacks capture, installation or video was needed. tools/memorial/
export_particle_packet_reference.py extends the established original assignment
harness with a gated two-texture VelocityX profile and per-age vertex hosts.
The source selector chooses the real writer. Original init/update/make/writer
instructions execute for15 captured initial-module RNG states and150 H make
windows. Captured centers/group vectors are REFERENCE-HARNESS inputs ONLY.
Full texture trims, identity draw basis, neutral tints and alpha1 are explicit
fixtures; this is NOT a live GPU-buffer/pixel reference.

Writer-boundary comparison:150/150 exact complete packets under equal inputs.
Independent source/seed/scene simulation:148/150 exact complete Particle packets.
At F1/instance1 X and F2/instance7 Y, the SAME previously recorded parent-center
rounding residual appears in each of six vertices (12 coordinate mismatches;
maximum0.00006103515625,1 or4 final-coordinate float32 ULP). UV1/UV2/RGBA/tints
are exact in all150. No tolerance removes these strict differences. The machine
report retains both payloads, frame, instance, parent/RNG context and cause.

The complete bounded drawable output has182 ordered packets (32 Quad +150
Particle):180 exact and the2 inherited-center mismatches above. All182 CPU make
windows match H's source-child/creation order. Shared-owner RNG matches observed
post-state at every frame. The existing2094 record events/3210 values and the
1734-event/600-scalar baseline remain unchanged. This does not establish live GPU
submission order or pixel fidelity.

Additional retained-context check:150 final live make snapshots directly show
neutral texture tints in both layers and make alpha1. All15 moving-parent init
contexts show offset0/velocity multiplier1. retained-context-evidence.json records
these fields. They are therefore supported for H, not guessed global defaults.
The drawData pointee and UV trim blocks lie beyond the saved context extent;
make alpha is NOT evidence of the shader global RGBA. These still require the
targeted next measurement described below. The77-test numerical suite plus the
added retained-context check cover78 distinct cases; no unchanged native capture
was repeated.

### Actual game path and preservation

Evidence folder: tools/data/memorial-audit/particle-packet-integration/
- native-particle-writers.json: original instruction reference,15 instances/150 packets.
- particle-packet-comparison.json: original versus existing connected replay packets.
- standalone-particle-comparison.json: independent runtime branch, with no native intermediates.
- connected-render-comparison.json:182-packet joined strict comparison, CPU order,
  external inputs and implementation hashes.
- browser-review-1.json: actual BattleScene F1/3/8/10/12/13;67 packets/1206 world
  values and natural frame14 completion with one callback. F8 keeps19 packets
  but only15 visible; the four Quads reach transparent final alpha as measured.
- product-packet-check.json: independent host-adapter/world-buffer check passes.
- browser-review-2.json: all three frozen Cloud comparisons have0 changed pixels.
- browser-review-3.json:9 actual casts, MP18/30/52, body return/effect join,
  multi-target, victory/wave, restart/fallback, Cross Slash holdout and Legacy
  Satellite Beam. Satellite Beam is NOT original/native evidence.
- review-20261028-v2.html and review-1-f*.png: exact successful test page/screenshots.
  The initial review failed an incorrect F8 visibility COUNT assumption; the
  renderer was unchanged. The corrected fresh page accounts for transparent Quads.

Executed:78 distinct numerical/lifecycle/transform/packet tests,14 scene/observer
checks,40 combat-method assertions,6 original assignment-chain regression methods
and build pass without skips. Build retains its existing chunk-size warning.
The published Cloud/Cross Slash manifests change ONLY shared-player provenance;
resources, effect data, Motion1, member timing and gameplay definitions are intact.
The new particle sparks are visible in the controlled game test. No FFBE-native
visual improvement is claimed; ordinary Cloud skills retain their approved baseline.

### Explicit inputs, remaining questions and next step

External: four-word initial emitter seeds; reviewed complete module-selection
metadata; fixed unit deltas/zero-age host activation; source host lifetime; scene
scale/origin; neutral init offsets0 and velocity multiplier1; full texture trims;
identity Particle draw basis; neutral tints; alpha1/global color1. These are
conditional inputs, not reconstructed engine-wide defaults. No native initialized
records, parent matrices, calculated centers, UV/RGB outputs or vertex buffers
are runtime inputs. Zero unsupported drawable nodes does NOT mean full support.

Next precise dependency: replace the remaining DRAW-CONTEXT fixtures with live
source8 evidence: drawData+0x20's16-float basis, MakeVertexContext layer trims at
+0x188/+0x214, alpha+0x164/global color, sampler/filter and actual writer selection/
submission order. First inspect retained GPU/host receipts for this exact source;
older node34 single-texture data is not equivalent. If absent, extend the EXISTING
lifecycle/writer observer for one targeted capture (not ordinary video). Then
compare packet-to-GPU state without changing baseline skill bindings. Full source
initialization/auxiliary flags, seed creation and76-vs44 reservation/free behavior
remain separate gates. Unknown BMB type7 remains a different unsupported family.

Reproduce with configured Python/dependency paths from the handoff:
```powershell
node tools/prepare_particle_packet_branch.mjs --quads tools/data/connected-effect/quad-branch-program.json --plan tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json --inputs tools/data/connected-effect/quad-module-inputs.json --trace tools/data/memorial-audit/diagnostic-v34-lifecycle/run-h.jsonl --output tools/data/connected-effect/particle-packet-branch-program.json
node --test tools/test_particle_render_packets.mjs
node tools/check_quad_product_receipt.mjs tools/data/memorial-audit/particle-packet-integration/browser-review-1.json --connected
```
Reuse native-particle-writers.json while source/harness/conditions are unchanged.
To regenerate after a relevant change, run tools/memorial/export_particle_packet_reference.py
with --apk installed-base-v208.apk, --source the retained atk_slash1_white.bmb,
--trace diagnostic-v34-lifecycle/run-h.jsonl and --output under tools/data.
Use the packet button on the saved page for actual combat rendering; it restores
the normal bridge after completion. No default skill graph activation is enabled.

Date: 2026-10-28. Scope: **PC browser first.** The initial map was documentation-only; the bounded source-timeline integration below is a subsequent implementation checkpoint. Historical results retain their original revision boundaries.

This is the central progress record. It supersedes the *next-step recommendations* in dated research notes, without invalidating their recorded evidence. The preceding [architecture audit](skill-pipeline-architecture-audit.md) explains the root-cause assessment. Historical test counts are not a current acceptance result.

## Current: connected Quad render packets in the shared product player (2026-10-27)

Continued from7c50ab3. **Drawable nodes2/3/4/6 now generate complete conditional
Quad render packets from prepared source data**, independently calculated
parents1/5, explicit emitter initial seeds and source-timed module state.
This is an admitted partial Quad profile, **not the complete nine-node effect**.
The 30-component tally stays5 INTEGRIERT /0 VERSTANDEN /25 TEILWEISE /0 UNBEKANNT;
complete original nodes remain0/9 because constructor/flags/free and live
render-context/submission acceptance are incomplete.

### Three integrated boundaries

1. `src/effects/nativeQuad.mjs` uses the existing generator owner, RNG/vector
   samplers, translation projector and alpha evaluator for a bounded single-burst
   type2 profile. Its32 source-timed records/RNG and96 primitive-center values
   agree with actual connected H; Quad ages1..9 then freeze at90000 through F21
   as observed. Scale velocity clamps each axis; flat RGB consumes three draws
   and is broadcast to the corners (source4 includes random flat RGB). Raw flat
   color is exported separately at Quad+0x68/+0x78, preserving older initialColor
   metadata and the frozen previews. Alpha has an explicit captured-separate-f32
   Linear profile: two source4 record discrepancies at F6/F7 are removed without
   changing legacy/default curve arithmetic or packed RGBA output.
2. `src/effects/nativeQuadGraph.mjs` connects constant-transform/neutral Null
   ancestors to those emitters. Parent1/5 matrices, Quad records/centers, vertices,
   first/second UVs, packed RGBA and texture bindings are calculated, never loaded
   from native intermediate buffers. A per-evaluation ancestor cache preserves
   one shared calculated ancestor across branches. No new seed derivation or
   arbitrary parent traversal is implied: parents must be zero-delay single
   bursts and outlive the Quad; other chains fail closed.
3. `src/effects/originalEffectPlayer.mjs` consumes the packets under the explicit
   `plan.nativeQuadBranches` mode, using its existing texture resolver, Basic/Add
   material hooks, blend-table adapter, scene anchors and framebuffer bridge.
   It adds no new WebGL renderer. Six vertices, inverse constant layer2 scale
   about the centered UV pivot, byte RGBA and source texture addresses are used.
   Type2 scheduling is admitted only for the measured zero-delay/count1/duration1/
   repeat1/interval1 subset. The ordinary Cloud plan path remains selected.

`tools/prepare_quad_branch.mjs` compiles this partial JSON profile, preserves
unsupported nodes7/8 explicitly and checks the COMPLETE ordered init/update/make
lists against supported module contracts. Dormant translationValue curves in4/6
are retained; their captured selected Velocity callbacks, not the mere presence
of keys, determine execution. Unknown or extra callbacks cannot be dropped.
The profile rejects unsupported rotation, UV animation, material fragments,
blend families, degenerate UV scale, parent schedules and unknown module plans.
Only the pinned initial Basic/Add fragments and blends1/2 are admitted.

### Reference strength and actual end-to-end checks

Existing H was reused; no APK change, new live capture or ordinary video.
`tools/memorial/export_quad_trace_reference.py` executes the complete ORIGINAL
Quad module/writer chains at the eight actual source ages, with H's first-module
seeds and captured parent context supplied to the ORIGINAL reference harness.
The JavaScript simulator instead receives emitter initial seeds, source parameters
and scene pose, and computes all intermediates itself. Parent input constancy over
all eight steps is checked against H. Original writer outputs include both
0x2005180/stride40 and node6's0x2005500/stride64.

All32 packets/192 vertices agree EXACTLY in position, RGBA, UV1, textureTint1,
and UV2/textureTint2 where present. All32 live record/RNG/center observations also
match. The packet report includes original/simulator payloads, frame/node/instance,
parent and RNG contexts plus implementation hashes. This is controlled original
instruction replay (six explicit Python float32 sin/cos stubs per step), **not a
live GPU-buffer or native-pixel comparison**. Existing writer fixtures were reused;
the new32-step reference changes ages, seeds and parent inputs rather than repeating
an unchanged original test.

Actual BattleScene -> playPreparedScene -> PreparedSceneBridge -> common player
checks pass at F1/F4/F8/F9.12 packets and216 world-buffer values match independent
CPU evaluation under the recorded productive host adapter. The partial profile
also ends naturally at frame10 with one callback and no active scene. It is a
temporary controlled manifest; no skill/reward binding was published. Cleanup
restores the normal scene bridge. The new mode is available in the shared player,
not globally enabled for unfinished source graphs.

Evidence: tools/data/memorial-audit/quad-render-integration/
- native-quad-writers.json: controlled original instruction outputs.
- quad-packet-comparison.json:32 exact packet comparisons and32 exact live states.
- lifecycle-guard.json:2094 record/order/RNG observations and3210 values preserved;
  the SAME two Null7 world-coordinate residuals remain in the strict comparison.
- browser-review-4.json: all three frozen Cloud frames still0 changed pixels.
- browser-review-3.json:9 actual actions, MP18/30/52, hits/body-return/effect join,
  multi-target, victory/wave, restart/fallback, Cross Slash holdout and Legacy
  Satellite Beam. Satellite Beam is NOT an original/native reference.
- browser-review-9.json: final partial Quad product frames and natural completion;
  product-packet-check.json verifies its packets/world-buffer placement.
- review-final.html: exact tested page snapshot, SHA256
  6d1b5977b6dcf570234ca8fd58aefa56b0d1ac0d841a72b56e38f52a11c00820.
  Vite ignores tools/ watching, so a fresh HTML path avoids stale HTML-proxy code.

Validation:71 numerical/module/lifecycle/alpha/packet checks,13 scene/observer
checks,40 combat-method checks and2 raw-field checks pass without skips. Build
passes with the existing Vite chunk warning. The published manifests were
recompiled only to refresh player provenance; their prepared effects/member
parameters and texture resources remain unchanged, checked by scene regression.
No original visual-fidelity approval is inferred from frozen-preview parity.

### Explicit inputs and remaining acceptance gates

Still external: measured initial four-word emitter seeds (construction unknown),
reviewed complete module-selection metadata (raw selector compilation for arbitrary
new Quad profiles is still open), positive scene scale/origin with identity external rotation, neutral texture tints
(cross-checked against H make context), FULL TEXTURE TRIM[0,0,1,1] and global
colorScale1 fixtures. CPU order is derived from original child-ordered DFS and
checked against all eight H make traversals; no native event ordinal is a runtime
input. Live trims/filter/global constants/GPU submission order were NOT captured. They remain declared conditional inputs,
not hidden native matrices or implied original defaults. Native packed vertices,
initialized records, parent matrices, primitive centers, UV outputs and RGBA are
reference outputs ONLY; none is a simulator runtime input.

The four Quad branches can now be displayed in the real game under this admitted
profile, including node6's second texture. **A visually closer original FFBE frame
has not been proven:** synchronized native pixels/live GPU state are missing.
Ordinary Brave Slash/Blade Beam/Climhazzard retain their accepted visual baseline,
Motion1/body-FX separation and Legacy fallback.

Next critical dependency: connect Null7 -> Particle8 to its own source-selected
TWO-TEXTURE Particle writer (not the Quad or single-texture Particle writer).
Reuse H's150 make contexts and existing Particle X/UV/RGB/writer references first.
Then join packet order/material context across all branches. Obtain live writer
output/trim/global-uniform/order data only for a concrete unanswered field; do not
restart isolated geometry or ordinary-video loops. Seed construction, wider
inheritance/auxiliary profiles and allocation release still gate full node claims;
Finishing Touch's BMB TYPE7 remains a separate unsupported family.

Reproduce (configured Python/dependency paths are in the handoff):
```powershell
python tools/compile_bmb_module_inputs.py --source tools/data/shared-skill-review/brave-slash-composed/originals/atk_slash1_white.bmb --output tools/data/connected-effect/quad-module-inputs.json
node tools/prepare_quad_branch.mjs --plan tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json --trace tools/data/memorial-audit/diagnostic-v34-lifecycle/run-h.jsonl --inputs tools/data/connected-effect/quad-module-inputs.json --output tools/data/connected-effect/quad-branch-program.json
python tools/memorial/export_quad_trace_reference.py --apk tools/data/memorial-audit/installed-base-v208.apk --source tools/data/shared-skill-review/brave-slash-composed/originals/atk_slash1_white.bmb --trace tools/data/memorial-audit/diagnostic-v34-lifecycle/run-h.jsonl --output tools/data/memorial-audit/quad-render-integration/native-quad-writers.json
node --test tools/test_quad_render_packets.mjs
node tools/check_quad_product_receipt.mjs tools/data/memorial-audit/quad-render-integration/browser-review-9.json
```
Reuse the unchanged original writer receipt instead of rerunning the Python
instruction reference unless its implementation/conditions actually change.

## Current: independent constant-parent transforms and Particle handoff (2026-10-26)

Three bounded integrations now share `src/effects/nativeTransform.mjs`: constant
Null initialization/Default composition, moving-Null parent transforms, and the
Particle X make-input handoff. They are exercised by the existing lifecycle
replay with `--independent-parent`. They do NOT enable complete graph playback.
The 30-component tally and complete-node count **0/9** remain unchanged.

Preservation: implementation snapshot9ebda0c; verified archive
`tools/data/visual-preservation/independent-parent-20261026-v34.zip`
(1357 files/45 plans,469896729 bytes), SHA256
`38206206d02359c46f76099722ecb31d78f7ab44a74f3d18fc44a25895ef1f57`.
APK/VM rollback backups remain separate. Active HEAD/index preserved, no push.

### Original measurement and provenance

Observer34 packages the previously VM-checked record/parent snapshot extension.
The actual installed APK was first pulled and hash-verified against diagnostic32;
rollback-installed.apk and the earlier cold VM backup remain available. The cold
backup files were checked for presence/length this time; their prior full hashes
were not recomputed. Existing same-key `pm install -r --abi arm64-v8a` preserved
UID10107, app data and downloaded assets. No uninstall, data clear or main-instance
change. Boot revision34, calibration,24 engine hooks and47 deferred module hooks
were verified. Actual capture H proves the new fields execute in BlueStacks:
5836 full bounded record snapshots and1810 direct-parent snapshots.

Evidence: tools/data/memorial-audit/diagnostic-v34-lifecycle, including preparation.json,
rollback-receipt.json, startup.log, capture-h.log, measurement-receipt.json and
run-h.jsonl. Trace SHA256:
`7d88e452bbeffe2bc359fda872c9a0bc0450c8d47946e9dc866fc311fb35fd74`.
H has21 controlled unit steps,6866 events,966 state observations, no audit issues
or missing hooks, and wrapper destruction. Like G, this substitutes one requested
live source with atk_slash1_white and fixes delta1. It is a connected controlled
original execution, **not unchanged Brave Slash pixels**. H retains G's initial
RNG states but has a different outer scene origin146/730 versus135/737; it is
not an independent random-seed sample. The original library/source hashes remain
unchanged. Capture was disarmed afterward. Signed diagnostic34 SHA256:
`d746580c2710de31d5cb024aafff330f49f213e1cc1f71860e0a4feacc0526a6`.

### Independently reproduced states

- Node1: source ConstX scale, three sampled rotation angles in radians, zero
  translation, RGB and final RNG produce the exact40-byte initialized record.
  Nine draws include activation1, zero-range life1, scale1, rotation3 and RGB3.
  All21 subsequent basis/scale/quaternion/origin states match exactly in H and G.
  The H comparison contains22 exact events and409 numeric record/transform values.
  G lacks full init-record snapshots and explicitly omits that comparison.
- Default composition constructs `parentBasis * Ry * Rx * Rz * localScale` in
  the inspected operation order. It extracts column lengths and the native
  transposed-convention quaternion. The preceding translation module projects
  local position through the parent basis then adds origin; the locator itself
  does not translate. Float32 constants/order are explicit. No fitted angle,
  corrective offset or precomputed node1 matrix is used.
- Node7: all15 moving records consume the independently generated node1 result.
  Across180 updates,2880 basis/scale/quaternion components are exact.178 complete
  transform observations match; the other2 retain only the known origin residuals.
- Node8:150 actual make-input observations now consume these computed moving
  parent states and existing scalar records. Local X is broadcast to XYZ, and
  Joint X is separately broadcast to group XYZ (not component-wise inheritance).
  All450 group-scale components match;148 complete observations match,2 inherit
  the same center residuals. This joins center/local-scale/group-scale/zero-roll
  inputs, **not actual vertex buffers, two-texture UVs or material packets**.

Implementation/evidence: src/effects/nativeTransform.mjs and .d.mts;
tools/lib/null-transform-replay.mjs; tools/lib/parent-generator-replay.mjs;
tools/lib/lifecycle-comparison.mjs; tools/trace_bmb_lifecycle.mjs;
tools/test_native_transform.mjs. independent-parent-comparison.json and
run-g-independent-parent.json retain original/simulated events, frame, instance,
parents, RNG and per-field absolute/float32-ULP differences. Tests corrupt native
node1 output and outer-root matrix bytes and verify that simulation is unchanged while validation fails.
The normal comparison still preserves all2094 record/order/RNG events and3210
record/context values, including the1734-event/600-scalar baseline.

### Precision and acceptance limits

The earliest unresolved output is still source7 seq295/F1/instance1 world X:
absolute0.0000152587890625 (4 ULP at the final coordinate). The second is
seq727/F2/instance7 world Y:0.00006103515625 (1 ULP). H's direct pointees equal
the previously supplied G parent matrix, excluding stale snapshots as the cause.
The matrix construction itself is exact in both live runs; the residual occurs
in translation projection arithmetic. Static ARM FMADD and BlueStacks lowering
remain distinct evidence. No cosmetic zeroing/tolerance turns the strict report
into a pass. Under the measured projection the maximum continuous screen-space
residual is below0.000104 pixels; this is not proof of identical rasterization.

An alternate-seed existing Null chain has exact init bytes/RNG/basis, with scale
and quaternion differences at most1 float32 ULP.16 new Default locator controls
reuse the existing pinned instruction harness (six explicit Python sin/cos stubs,
original libc absent): XYZ rotations/nonuniform positive scales agree within
0.000000238419 in basis/scale and0.000000059605 in quaternion. These bounded
separate-f32 versus instruction-emulation differences are not universal bitwise
ARM fidelity. Degenerate bases, other module dispatch/auxiliary phases, seed
construction, arbitrary inheritance flags and full allocation release remain open.

Validation executed:62 numerical/lifecycle/module/Particle tests,13 scene/observer
checks and40 combat-method checks pass, with zero skips. npm run build passes
with the existing Vite chunk-size warning. Logs are retained in diagnostic34.
No productive player/lifecycle source identity changed, so the prior frozen GPU
and full-action receipts were reused rather than recaptured unchanged.

### Reproduction, productive boundary and next dependency

```powershell
node tools/trace_bmb_lifecycle.mjs --native-run tools/data/memorial-audit/diagnostic-v34-lifecycle/run-h.jsonl --plan tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json --reference tools/data/reconstruction-map/generator-activation-native.json --compare-generators --module-inputs tools/data/memorial-audit/diagnostic-v32-lifecycle/source-module-inputs.json --independent-parent --output tools/data/memorial-audit/diagnostic-v34-lifecycle/independent-parent-comparison.json
node --test tools/test_native_transform.mjs tools/test_bmb_module_states.mjs tools/test_bmb_lifecycle.mjs tools/test_parent_generators.mjs tools/test_particle_lifecycle.mjs
```

Strict trace comparison intentionally exits1 for the known projection residuals;
parentTransformComparison is exact, dependentTransformComparison/particleMakeComparison
separate the propagated residuals. No duplicate residual is counted as a newly
independent error. `--independent-parent` requires explicit source/module inputs;
scene-root positive scale/origin (identity rotation checked) and initial emitter seeds remain external inputs; even the scene-root basis is rebuilt rather than read, while
computed native parent1 matrices are reference outputs only.

Product Cloud/live-player, Motion1, body/FX join, approved plans/assets and Legacy
remain untouched. Identity alarms and preserved pixel receipts protect the prior
visual baseline; no identical browser captures were repeated. No new visible
FFBE fidelity is claimed and the graph is not globally activated. P13/P14/P16/P17/
P18/P29 gain the bounded capabilities above, remaining TEILWEISE at full contract.
Next dependency: join source8 UV transform/color/alpha make outputs to the actual
**two-texture** writer and its selected material/order; connect Quad branches2/3/4
and5->6 as well. The existing single-texture writer must not silently substitute
for source8's operation2/two-texture path. Reuse H's make contexts and existing
writer/static receipts first; H has no post-writer vertex/material packet output.
Any new observation must target exactly that missing output, not ordinary video.

## Current: connected module records and bounded color integration (2026-10-26)

The approved1734-event/600-scalar baseline is preserved. Existing run G was reused;
no new native execution/capture or emulator modification. The extended comparison
adds180 Null Velocity Update enter/leave pairs. All2094 record/order/RNG events
match after excluding the explicitly unresolved world-coordinate outputs. Exact
new values:1170 translation observations (Null XYZ+VX and Particle zero XYZ),
450 UV2 scale values,450 RGB values and540 complete velocity-context outputs.
Together with the previous600 scalars,3210 numerical record/context values match.
World coordinates are a separate540-value comparison:538 exact,2 mismatches at
seq295/F1/instance1 and seq727/F2/instance7, maximum residual0.00006103515625.
The strict whole extended report therefore still fails; this is NOT a full-effect
pass. Supplied native parent1 basis/origin, measured initial seeds/dispatch and
explicit neutral init offset0/velocity multiplier1 remain declared inputs.

### General rules integrated and their boundaries

- Null module iteration uses a retained record range, not a per-record age test.
  Source7's first record receives13 module updates despite age stopping at11.
  Original Null PostUpdate at1fbe234..1fbe37c loops over the retained allocator
  range without an individual age gate;1fbe3d4..3dc updates emitter expiry after
  child phases. Common updateRetainedNativeRecords keeps module work separate
  from advanceNativeJoint. The bounded projection supplies the retained range/
  emitter-expired flag; a complete allocator/expiry policy is not reconstructed.
- initializeNativeVector and updateNativeTranslation reproduce the captured
  translation, color and UV constant records with one continuing emitter RNG.
  Each vec3 initializer consumes3 draws even for zero ranges; translation consumes
  position3 then velocity3. Color1 samples RGB and clamps to[0,1]; alpha is not an
  extra initializer draw. The Particle RGB range is a second vec4 at+0x78, while
  UV2 scale uses adjacent vec3 parameters at+0x4e0/+0x4ec. Raw parameters now export
  under nativeModuleInputs through bmb_playback_fields.py; dispatch is not inferred.
- The saved G color outputs match separate float32 multiply/add rounding; the
  initially evaluated fused-style sample left20 repeated mismatches at2 sampled
  channel values (first seq1399/F3/instance10). The explicit
  captured-separate-f32 arithmetic profile removes those record differences.
  Static native code contains FMADD. Its hardware/emulator lowering equivalence
  is NOT established; do not call this a universal ARM arithmetic proof or silently
  apply this profile to legacy transforms/curves. A fused-style world projection
  control increased mismatches2->28; no corrective profile was selected for it.
- Productive finite Particle playback admits one optional trailing ColorConst
  after its existing scalar module, with explicit arithmetic and RGB ranges.
  It uses the SAME initializer and emitter RNG, and applies RGB via Phaser tint.
  Tint quantizes to8-bit channels; no new native pixel fidelity is claimed.
  UV/moving-parent helpers remain common simulation capabilities, not a newly
  enabled full source graph. Cloud player/plans/assets are not regenerated.

Evidence under tools/data/memorial-audit/diagnostic-v32-lifecycle:
source-module-inputs.json; module-state-static.json; module-arithmetic-static.json;
null-post-static.json; vector-module-first-divergence.json; module-world-comparison.json.
New comparison sections: baselineComparison, recordComparison, moduleObservations,
worldProjection. Every remaining world mismatch retains native/simulator payload,
frame, record, RNG and supplied-parent-context boundary. No differences are hidden
by tolerance or resetting the accepted RNG. The world test ceiling only detects
regression of the recorded unresolved gap; certified:false remains mandatory.

Reproduce using the existing pipeline (the final compare currently exits1 for the
two retained world-coordinate differences):

```powershell
python tools/compile_bmb_module_inputs.py --source tools/data/shared-skill-review/brave-slash-composed/originals/atk_slash1_white.bmb --output tools/data/memorial-audit/diagnostic-v32-lifecycle/source-module-inputs.json
node tools/trace_bmb_lifecycle.mjs --native-run tools/data/memorial-audit/diagnostic-v32-lifecycle/run-g.jsonl --plan tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json --reference tools/data/reconstruction-map/generator-activation-native.json --compare-generators --module-inputs tools/data/memorial-audit/diagnostic-v32-lifecycle/source-module-inputs.json --output tools/data/memorial-audit/diagnostic-v32-lifecycle/module-world-comparison.json
node --test tools/test_bmb_module_states.mjs tools/test_bmb_lifecycle.mjs tools/test_parent_generators.mjs tools/test_particle_lifecycle.mjs
```

Use the configured Python path from the handoff if python is not on PATH. Stored
source/libgame hashes are unchanged. No new physics/geometry writer or parallel
renderer was created. The strict product manifest rejects unrelated vector modes,
module order, missing arithmetic and unknown fields. Product color controls use
the real BattleScene entry with a temporary prepared-metadata override, restored
afterward; no character/reward binding or new public effect is added.

Validation executed for this continuation:56 lifecycle/module/Particle Node
tests,8 scene-migration checks,40 combat-method checks,8 BMB structure tests and
1 raw-module-offset test pass without skips. Build passes with the existing Vite
chunk warning. Actual Phaser standard Particle control passes13 samples/2 stored
independent native frames; the explicit color assembly passes15 common-simulator
samples through F14 including RGB tint, with NO independent original assembly
claim. The full actual Cloud action review is recorded separately. Frozen Cloud
F24/F24/F35 comparisons remain0 changed pixels outside recorded UI bounds.
Runtime SHA256:60a9f13630ef692128682653234fa3400c3f6cf7a615d946b4259f24257bb61f.
Receipts: module-state-node-tests.log, module-scene-tests.log,
module-combat-method-checks.log, module-build.log, module-product-review.json,
module-product-basic-check.json, module-product-color-check.json,
module-frozen-baseline-check.json in the G evidence folder. Unchanged original
fixtures were reused; no new APK/capture/source asset publication occurred.

### Nine-node capability matrix

Every cell is **N/S/P**: native evidence / shared simulator / productive use.
`+` = the stated bounded responsibility is checked in G; `~` = only a subset or
isolated reference; `-` = missing/unvalidated; `na` = no own drawable output.
For P only: `q` means the explicitly admitted bounded source packet profile in the actual
game bridge (not ordinary skill migration or full graph support); `p` means an admitted shared primitive is used by finite Particle/
clock playback; `e` means the preserved experimental Cloud preview, which does
NOT use the newly verified full native lifecycle. None of the nine nodes is
accepted as fully reconstructed. Init includes seed derivation/context, Life
excludes allocation release, and RNG includes ownership/order from explicit seeds.

| Node | Init | Life | Parent/child | RNG | Module states | Transforms | Geometry/UV | Material/order | End/free |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 host | ~/~/- | +/+/p | ~/~/e | -/-/- | na | ~/-/e | na | na | ~/-/- |
| 1 Null | ~/~/- | +/~/e | +/~/e | +/+/p+q | +/+/e+q | +/+/e+q | na | na | ~/-/- |
| 2 Quad | ~/~/- | +/~/q | +/~/q | +/+/q | +/+/q | ~/+/q | ~/+/q | ~/~/q | ~/-/- |
| 3 Quad | ~/~/- | +/~/q | +/~/q | +/+/q | +/+/q | ~/+/q | ~/+/q | ~/~/q | ~/-/- |
| 4 Quad | ~/~/- | +/~/q | +/~/q | +/+/q | +/+/q | ~/+/q | ~/+/q | ~/~/q | ~/-/- |
| 5 Null | ~/~/- | +/~/e | +/~/e | +/~/p | ~/~/q | ~/+/q | na | na | ~/-/- |
| 6 Quad | ~/~/- | +/~/q | +/~/q | +/+/q | +/+/q | ~/+/q | ~/+/q | ~/~/q | ~/-/- |
| 7 Null | ~/~/q | +/+/q | +/+/q | +/+/p+q | ~/+/q | +/~/q | na | na | ~/-/- |
| 8 Particle | ~/~/q | +/+/p+q | +/+/p+q | +/+/p+q | ~/+/q | ~/~/q | ~/+/q | ~/~/q | ~/-/- |

`p` in nodes1..6 RNG means shared activation/xorshift primitives only, not their
unimplemented full module streams. Retained Null module iteration is common simulation only; its productive status
is still absent. The explicit independent-parent replay now provides the bounded node1 transform;
productive graph admission must still not be inferred from a shared primitive.

| Node | Main evidence and remaining dependency / next blocker |
| --- | --- |
| 0 | G tree-init/update plus NativePhaseClock21 checks. Host/root flags and all initial stream construction still gate1 |
| 1 | G/H plus Null-chain alternate seed: exact full init record and21 independent transforms. Its calculated transform now feeds all four Quad packets via1/5. Seed derivation/flags/free and7->8 packet integration remain open |
| 2 | Full conditional single-texture packet path now uses computed1, own seeded records and checked H lifetime; live GPU context/order/free still open |
| 3 | Same complete packet profile as2 with independent emitter/RNG/flat color and its own SemiAdd blend; live material/order/free remain open |
| 4 | Moving/random-flat-color packet branch uses computed1; dormant translation curve is not selected. Complete conditional packets checked; live context/free remain open |
| 5 | Neutral source transform now connects computed1 to6 without a native matrix input; leaf profile requires the parent to outlive it. Full independent lifetime/flags/free remain partial |
| 6 | Computed1->neutral5->moving6 now supplies two-texture packets/UV2 and pinned Add material in product control. Full trim/global uniforms/GPU order/free still unverified |
| 7 | G/H15 slots and180 computed transforms: basis/scale/quaternion exact from computed1;2 world coordinates retain precision residuals. Output now supplies8 make inputs; allocator/free/material work remains |
| 8 | G/H15 cells, scalar/RGB/UV2 records and150 make-input observations; group X now comes from computed7. Two-texture writer/UV/RGB packet joins now run in the bounded shared player; live draw context and76-vs44 work reservation remain open |

All end/free cells remain partial: G wrapper destruction and logical retirement
do not identify every per-slot allocator release/reuse. Null nodes have no own
draw packet, but ordering of their descendants still belongs to parent/child and
the final shared renderer acceptance. BMB type7 remains unrelated and unsupported.

### Prepared targeted observation extension (source/VM only)

The next information gap is now instrumented in the SAME lifecycle observer,
not in another recorder: recordSnapshot copies up to256 declared workBytes from
the record base before/after modules; Null initInputs copies the actual offset/
velocity-multiplier vectors; Null update parentInputs copies the referenced9-float
basis, origin and inherited scale at that module boundary, with pointer identities.
capture-start declares bounded-record-parent-snapshots-v1. Old16-byte cursor
windows and event/instance/frame/RNG identifiers remain. Reads fail explicitly
when bounds/pointers are invalid; engine memory is not written. The previous
observer source is saved as observer-before-module-snapshots.js in the G folder.

Five VM recorder checks pass, including real moduleState execution on bounded
mock memory, distinct base/cursor snapshots, changed pointed-to values, input
bounds, no engine-write API and terminal-limit handling. This proves source-side
observation logic only. Diagnostic32 in BlueStacks is unchanged; the new observer
has NOT been built/installed or tested in the actual Android process. No new
original states or solved world-coordinate residuals are claimed. Use the saved
same-key update/backup procedure when a new targeted recording is actually needed.

Actual full combat review also passed9 casts, correct18/30/52 MP for Cloud,
single/two-target hits, body return before effect end, restart/fallback and victory/
wave lock. Receipt: module-cloud-actions.json. Satellite remains a Legacy/product
control, not a native FFBE reference. The new source/module and productive-color
milestone is checkpoint176e5326; the observation extension is a later local snapshot.

### Current critical path / acceptance

1. Generate parent1's transform from its existing native init/module/context
   references instead of supplying the recorded parent basis. Reuse G and the
   existing Null chain fixtures; do not start another broad audit.
2. Explain the two world-coordinate residuals with exact phase-time context/
   arithmetic provenance. Two targeted arithmetic variants were evaluated;
   repeating them unchanged has no value. Keep the strict diff, not fitted offsets.
3. Join parent7/child8 group vectors, actual UV transforms and existing writers,
   then compare packed vertices/material submission from the SAME run.
4. Only admit the complete effect in combat after those whole-source gates pass;
   retain current Cloud preview parity throughout.

If G cannot supply a required state: retain the same hook/call/frame/RNG joins,
add bounded full work-record-base snapshots before/after the specific module and
copy its referenced parent basis/origin/group-scale values at that call. For final
draw acceptance, capture the corresponding writer/buffer bytes and material/order.
Ordinary video cannot supply these. No new recording is currently required for
the already solved record/color rules. Full effect acceptance remains0/9; the30
core tally is unchanged5 integrated/0 understood/25 partial/0 unknown.

## Current: connected scalar-state verification (2026-10-26)

Second bounded cycle after the parent-generator checkpoint b4a8ec3. No new native
capture or emulator modification. The retained G module-enter snapshots expose
the first8 bytes of each Particle VelocityX record before Update and Make. This
is enough to check scalar size/speed, although full module outputs are not saved.

initializeNativeScalar/updateNativeScalar now expose the SAME bounded arithmetic
used by productive NativeParticleEmitter. The connected source projection uses
them at the original shared-RNG position instead of consuming two anonymous words.
Prepared source scale/range/speed values feed initialization. Other observed
initializers still verify RNG consumption only. Three hundred native state
observations/600 scalar values match exactly, maximum absolute residual0. All1734
ordered lifecycle events and21 parent-slot snapshots still match. This is numeric
original-state evidence, not a visual native frame comparison or a full module
interpreter. Module dispatch and two initial seeds remain measured inputs.

Scheduling admission now explicitly rejects Quad/repeat profiles not validated by
this scheduler before changing state or RNG. Activation-only knowledge of those
profiles is retained. Null/Particle finite one-cycle scheduling is the bounded
common contract; unsupported mechanics are not silently skipped.

Reproduce with the same command below, replacing the output name with
tools/data/memorial-audit/diagnostic-v32-lifecycle/parent-scalar-comparison.json.
The JSON contains generatorComparison.{differences,firstDivergence,native,
simulated,jointChecks,scalarComparison,boundary,implementation}. Every difference
has both event payloads (null if missing), native position/sequence, frame,
instance, parent/RNG context and probableCause. Adjacent native context is labelled
separately and is never substituted for a missing original event. Add
--comparison-control no-parent-gate or --comparison-control reset-child-seed for
deliberately wrong controls; nonzero differences cause exit1. Final control JSONs
are retained in the same folder. No-parent-gate fails first at frame11/slot0;
reset-child-seed fails at native seq142/frame1. No mismatch is hidden by resetting
the accepted replay stream to a later original state.

Tests actually executed on the final runtime:53 lifecycle/parent/Particle tests,
8 scene-migration checks and a TypeScript/Vite build pass. The unchanged30 clock
checks and40 combat-method checks passed in the first cycle and were reused.
The actual nine-cast combat review from that cycle is retained; scene/body/action
code and Cloud plans/player are unchanged. Final frozen GPU frames again have0
changed pixels (F24/F24/F35, measured UI bounds excluded). Native completeness is
still0/9; no new visible Cloud improvement or FFBE pixel fidelity is claimed.
Runtime SHA256:2d70e9f9bff2e468ee46a2bab6414cf573b4183bdf7da71f7f1b4b437110a020.
Evidence: parent-scalar-comparison.json, scalar-frozen-baseline-check.json,
scalar-<skill>-f<frame>.png, final-parent-node-tests.log, final-parent-build.log;
the final product Particle receipt is recorded alongside these files.

Final product evidence: scalar-product-review.json contains13 captured states
through F14; scalar-product-comparison.json matches all13 to common simulation.
The independently stored native control has2 frames, both exact, width residual0;
the additional product samples are not additional original measurements. The
same recipe/manifest/34 native lifecycle controls remain admitted. Reproduce:

```powershell
node tools/check_particle_product_receipt.mjs --receipt tools/data/memorial-audit/diagnostic-v32-lifecycle/scalar-product-review.json --reference tools/data/reconstruction-map/particle-velocity-birth.json --manifest public/assets/effects/native_particle_control/manifest.json --output tools/data/memorial-audit/diagnostic-v32-lifecycle/scalar-product-comparison.json
```

The source/code/check summary is pinned in parent-integration-identity.json.
The preview-preservation archive also retains the new comparison JSONs, original
G stream, frozen PNGs, plans/resources and current code. See its ignored receipt.

Next concrete blocker: connect full module-state/inherited transform production
to the verified generator traversal, then the existing writers. First reuse G's
UV/color module windows and the existing Null/Particle chain receipts; the tested
scalar is not a substitute for translation, parent group scale/basis, UV2 or tint.
The diagnostic currently samples16 bytes at the current module cursor, so full
pre/post work records are NOT directly available. If a remaining field cannot be
joined from those windows, extend the SAME observer to retain declared workBytes
from the record base before/after that module, preserving frame/call/instance/RNG
joins. No ordinary video can supply this state. An all-node geometry/material
claim also needs matching native writer/buffer outputs; do not launch an untargeted
capture or enable the incomplete graph globally. Initial seed derivation and
allocator release/reuse remain separate unknowns.

P13/P14/P16/P17/P29 remain partial. Thirty-core tally stays5 integrated/0 understood/
25 partial/0 unknown; P15's narrow primitive contract remains integrated. The source
relationship is the current repeatable bridge into full graph reconstruction,
not a second renderer. Approved Cloud quality and Legacy remain the minimum.

## Current: parent-driven generator execution (2026-10-26)

Supersedes the next-step recommendations in the historical connected-run entries
below. Run G was reused; no new native execution, capture, install or asset change.

**Implemented in the common lifecycle:** NativeGeneratorOwner now traverses its
independent generator records in activation order while retaining one RNG. Update
and Post resolve each record's explicit parent state; an expired parent freezes
the record and its existing cells. Inclusive joint age can cross life once, then
stops; no allocator release is inferred. NativeParticleEmitter now uses these same
Update/Post methods in the productive bounded Particle program with an explicit
neutral host. No full mixed graph is enabled in the approved Cloud live player.

**Connected evidence:** tools/lib/parent-generator-replay.mjs drives the original
Null-to-Particle relation with source generator fields, the two measured initial
seeds and an explicit measured host activation/lifetime. It predicts the three
five-parent batches, all15 child activations and subsequent phases, without
assigning a later measured RNG state. The two owners consume151 and165 words.
All1734 selected ordered events match, including generator fields, RNG boundaries,
cell age/life, init/update module call order and150 make windows. All21 parent
slot snapshots also match numerically. The other5132 run events are NOT thereby
validated. Module dispatch is a measured input; initialization module RNG counts
are verified, not full module records/transforms/materials. The source seed
derivation, remaining graph traversal and release semantics are still open.

**Negative controls:** resetting the child RNG at each activation fails at native
seq142/frame1. Removing parent gates first emits an extra child update module in
frame11/slot0. These are deliberate faulty controls, not claims about the previous
productive Cloud render path. The reusable tools/lib/lifecycle-comparison.mjs
reports every missing/extra/changed event, original position, original/simulated
payload, frame, instance, parent context, RNG and likely cause. Last-observed
native parent snapshots are labelled eventTime:false; absent data stays null.

Reproduce the joined audit and machine-readable diff:

```powershell
node tools/trace_bmb_lifecycle.mjs --native-run tools/data/memorial-audit/diagnostic-v32-lifecycle/run-g.jsonl --plan tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json --reference tools/data/reconstruction-map/generator-activation-native.json --compare-generators --output tools/data/memorial-audit/diagnostic-v32-lifecycle/parent-generator-comparison.json
node --test tools/test_bmb_lifecycle.mjs tools/test_parent_generators.mjs tools/test_particle_lifecycle.mjs tools/test_scene_migration.mjs tools/test_node_tree_clock.mjs
node tools/test_combat_regressions.mjs
npm run build
```

Actually executed:91 distinct Node tests,40 combat method checks; build passes
with the existing chunk-size warning. Phaser migration review passed9 casts,
one/two-target damage, exact MP costs, body return before FX completion, cleanup,
Legacy/Satellite control, Cross Slash and victory/wave boundary. Frozen Cloud
F24/F24/F35 retain0 changed pixels outside recorded UI bounds. Receipts in the G
folder: parent-generator-comparison.json, parent-frozen-baseline-check.json,
parent-combat-review.json; deliberate failing controls are retained separately.
Runtime SHA256:69664a8defd4f8b3a4f9944b2d02572d0f979d8eee07fbde6740db475548cfa8.
Other shared-player/Cloud plan/manifest hashes are unchanged. Technical progress
is measurable; no new visual FFBE fidelity or visible Cloud change is claimed.

**Acceptance:**0/9 completely reconstructed nodes; P13/P14/P17/P29 remain partial.
The30-component tally remains5 integrated/0 understood/25 partial/0 unknown.
Next: use the retained first scale-update/make record bytes to compare actual
Particle scalar initialization/update values, rather than only RNG/module order.
Reuse common VelocityX arithmetic; do not create another renderer or record more
ordinary videos. Full transform/UV/color records and writer outputs remain later
integration/measurement gates.

## Current: first connected native source run (2026-10-26)

**New measured result, not full reconstruction:** diagnostic31 recorded914 ordered
events/232 state snapshots from one native `atk_slash1_white.bmb` execution, with
paired Initialize/activation/birth/update/post calls and final wrapper destruction.
No missing sequence, hook errors or unmatched call pairs were found. All8 actual
emitters were initialized in the same run. Source node0 appears as the host root
joint, not a ninth Null emitter. **Complete original lifecycles accepted:0/9**:
individual slot retirement/release and complete geometry/material outputs still
need validation. The previous statement "no connected source state" is superseded.

Measurement boundary: the original live game constructor requested
`atk_slash3_green`; the existing diagnostic changed one CreateParam filename to
`atk_slash1_white`, then restored the caller's pointer. The original game performed
construction, scheduling and destruction. This is an explicitly controlled source
reference, not an unchanged Cloud skill/battle presentation reference. BMB header,
node sizes/lifetimes and resource string windows matched the pinned source;
relocated in-memory bytes were not claimed to have the file's whole-buffer hash.
The same native library/APK identities from the next section apply.

Evidence: tools/data/memorial-audit/diagnostic-v31-lifecycle/{run-f.jsonl,
run-f-audit.json,run-f.log,tree-init-static.json,preparation.json}; source/plan hash
and activation-reference hashes are in the audit. Signed v31 APK SHA256
c48108cfb6b2a61c7bc58ad6a5afe2ff69f99d89a8b1b009266f88236b66f0b9.
Cold VM backup: tools/data/memorial-audit/lifecycle-v27-backup/disk-backup.json;
all6 copied files were exclusive-read/hash-verified. Same-key updates preserved
UID10107 and app data; no uninstall/data clear/main-instance change occurred.

### Actual nine-node mapping in run F

| Source node | Connected native observation | Remaining lifecycle gap |
| --- | --- | --- |
| 0 | One NodeTree host joint, header RootLife0, age0 initially, direct table contains node1. No Null Initialize/module chain for0. Static Initialize at1fbd940 consumes the allocation-root descriptor and constructs the joint | Validate root role across additional native sources; host release/initial seed derivation and final geometry remain separate |
| 1 | One emitter; root-joint activation; one birth; five children2,3,4,5,7 share its born joint; nominal life200000ticks | All joint slot retirement/child survival under controlled unit steps |
| 2 | One emitter; one activation/birth under1; module/RNG pairs captured | Full slot state and actual draw geometry |
| 3 | One emitter; same parent joint as2; separate module/RNG owner | Same gap; shared texture does not imply identical state |
| 4 | One emitter; parent1; separate module/RNG owner | Full slot lifecycle and geometry |
| 5 | One emitter; parent1; birth activates6 under a1200000tick joint | Survival/retirement relative to1, not inferred from nominal120 |
| 6 | One emitter; parent5; module/RNG pairs captured | Full slot lifecycle, UV2/material submission |
| 7 | One emitter; parent1; three birth callbacks request5 each, creating15 distinct joints | Per-slot aging/retirement and full inherited state |
| 8 | **One emitter/RNG owner**,15 activations and15 distinct64-byte generator-record pointers; parent joints belong to7. Separate generator records share the same emitter RNG | All15 records/particle cells through death; full make/writer/render phases |

Observed Initialize entry order1,2,3,4,5,6,7,8; returns2,3,4,6,5,8,7,1.
Context cursor advances0->9; flags5c enter0 for1,2 for its descendants, restored0
after1; auxiliary60 stays0. These are measured values in this run, not default
flags for arbitrary effects. Actual post-Initialize four-word seeds are retained;
their constructor derivation is still unproven. Parent links are reconstructed
from recorded callback nesting plus actual joint pointers, not source topology.

Existing common helpers match **22/22 activation RNG transitions**. The two root
updates (deltas2.0336999893188477 and19.476659774780273) match NativePhaseClock's
ordered direct-child phases, return flag, root age and remaining context delta.
These were new comparisons to retained run F, not repeated native fixture runs.
The large second delta demonstrates measurement perturbation; run F is not a
frame-by-frame visual reference and ordinary screenshots cannot fill this gap.

### First confirmed representation mismatch and bounded integration

The experimental legacy `instances()` begins by spawning source node0 and drawing
from its preview LCG; the connected original constructs a host joint and begins
emitter Initialize at1. It also allocates15 generator records inside emitter8,
rather than15 independently seeded emitters. Replacing just a root/seed constant
would conceal the different ownership model. Do not alter approved Cloud plans
until the source-backed graph can preserve those distinctions.

A safe extraction omission is fixed now: `inspect_bmb.py` exports the original
header RootLife at0x50 as `rootLifecycle.lifeFramesRaw`, and
`prepare_original_preview.py` retains it in newly prepared effects. It is distinct
from node0.lifeParameter and is not total effect duration. Eight structure checks
passed, including distinct header17/node0life999. Existing published plans/player/
body recovery/Legacy were not regenerated or modified. This is **pipeline data
integration**, with no claimed productive visual change.

### Measurement continuation / critical path

Diagnostic32 extends the SAME observer/controller with all generator records,
Null joint slots, Particle cell storage, recorded parent birth ownership and make
modules outside update scopes. An explicit live-source `fixedDelta:1` request
changes only the selected animation's delta during its original Update call and
restores the input afterward. This is controlled unit-step evidence, not ordinary
battle timing. Build/install succeeded; runtime activation and the next recording
must still be verified. Signed32 SHA256
23deeb6bf389eda2ec409a6810c9f3c4ea1523d58c2313385be708680f9156bc.

Reproduce audit without invoking the original or rerunning unchanged fixtures:

```powershell
node tools/trace_bmb_lifecycle.mjs --native-run tools/data/memorial-audit/diagnostic-v31-lifecycle/run-f.jsonl --plan tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json --reference tools/data/reconstruction-map/generator-activation-native.json --output tools/data/memorial-audit/diagnostic-v31-lifecycle/run-f-audit.json
```

Next: verify32 hooks, record one controlled unit-step source run, validate record/
joint ownership and the first unmatched common-simulation state. Then implement
source-backed initialization/multi-record scheduling. No new unmeasured rule is
enabled globally. Full visual FFBE fidelity remains unverified. The diagnostic's
factory-return-null path is retained as a failed control and must not be retried
unchanged; the live constructor path is the demonstrated way forward.

### Completed continuation: run G and shared generator ownership

The preceding next-step note was completed in this session. Actual diagnostic32
boot/calibration/output readiness was verified, then run G captured **21 declared
unit steps,6866 ordered events,966 state observations**,8 emitter initializations,
22 parent activations and final native IsExpired=true/wrapper destruction. The
original game remained the caller. Only the selected animation's delta was set1
during Update, then restored; measured host deltas were retained separately.
No missing event sequence, unmatched return or hook/module error was found.
All21 root steps match existing NativePhaseClock phases, return, age and remaining
delta. This is controlled original simulation evidence, not matched battle pixels.

Files: tools/data/memorial-audit/diagnostic-v32-lifecycle/{run-g.jsonl,
run-g-audit.json,startup-second-process.log,null-storage-release-static.json}.
Native source/header/context and file/plan/reference hashes remain explicit.
The installed APK hash was independently read back as23deeb6b...9156bc; UID10107
is unchanged. First process after installs31/32 failed float calibration; a fresh
process passed. Never capture after calibration-failed. Empty requests and idle
arm files are restored; no further substitution is pending.

Run G captures make-module execution for19 distinct primitive records: four
Quads render on measured frames1..8; Particle8 has three batches of5 with make
frames1..10,2..11,3..12. These are CPU make calls, not proof of every GPU pass or
matching pixels. Null slot observations cover17 born joints. Node7's15 parent
joints have actual stride144, also proved by Null Initialize at1fbcdf4/1fbce0c;
the separate host joint is152 bytes. Diagnostic32's raw windows used152 strides,
but they cover a contiguous byte range: the auditor re-slices the retained raw
bytes correctly at144. No duplicate recording was needed. Original receipts stay
immutable. Future observer33 corrects the window layout, initialized-result flag
and recursion at the truncation limit; it is VM-tested, **not built/installed**.

Measured lifecycle boundaries: node1's joint reaches210000ticks on frame21 and
the effect expires. Node5's1200000tick joint stops at200000ticks when its parent
expires. Node7's batches reach110000ticks at frames11/12/13 and stop; child
Particle records stop updating/rendering with their corresponding parent. This
exposes parent-gated phases that a flat independent-instance preview cannot model.
Full per-record transforms, source seed derivation, allocator release joins and
complete geometry/material packets remain open: **0/9 accepted complete nodes**.
All9 source roles are now linked within the same run; that is a different metric.

**Implemented common rule:** `NativeGeneratorOwner` in
src/effects/nativeLifecycle.mjs owns one four-word RNG and separate activation
records for explicit parent-generation identities. All15 native Particle8
activations match their8 initial generator fields, actual parent pointer/record
order and RNG-after state. Intervening module RNG transitions are measured inputs
to this isolated activation test, not a claimed full callback scheduler. Duplicate
parent/overflow reuse rejects before RNG consumption. Existing
`NativeParticleEmitter` now uses this owner in the productive bounded program;
its34 lifecycle/phase regressions pass unchanged. Multi-record graph traversal is
not enabled in Cloud's preview path. The new bank does not implement repeats,
slot recycling, source seeding or parent-dependent stepping by itself.

**Product proof:** actual Phaser product integration check passes legacy/composed/
area/screen/sampling controls and13 sampled dynamic-Particle frames. Satellite is
only a legacy regression here, never native evidence. Three frozen Cloud game
frames retain0 changed pixels outside the existing measured UI exclusions.
Receipts owner-product-review.json and owner-frozen-baseline-check.json plus
owner-<skill>-f<frame>.png are in the32 folder. The nativeLifecycle identity alarm
was reviewed against these pixels and advanced to
a5d4c0915e9e9560d583a349e591ca483ebe4ab85013d0f3ef3efd5882f959f6.
Other player/Cloud manifest hashes and the historical baseline archives are
unchanged. Build/TypeScript pass; the existing large-chunk warning remains.
There is **no claimed new Cloud visual fidelity**, only preserved baseline and
new common runtime ownership. P15 now meets its narrowly bounded primitive
contract in the productive pipeline; source seeding/ownership remain P14.

Next critical path: use run G, without another capture, to drive a source-backed
multi-record scheduler with parent-gated Update/Post/make. Preserve source0 as
host metadata rather than a sampled emitter. Compare the earliest state mismatch
under G's explicit initial seeds/contexts and unit deltas. Then connect complete
source module records/geometry. Request a new measurement only for a specifically
missing record/output, not another ordinary video. RootLife extraction and owner
activation are integrated; the whole mixed source graph is not.

Reproduce the new bounded checks from preserved data:

```powershell
node tools/trace_bmb_lifecycle.mjs --native-run tools/data/memorial-audit/diagnostic-v32-lifecycle/run-g.jsonl --plan tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json --reference tools/data/reconstruction-map/generator-activation-native.json --output tools/data/memorial-audit/diagnostic-v32-lifecycle/run-g-audit.json
node --test --test-name-pattern "common generator owner|connected unit steps" tools/test_bmb_lifecycle.mjs
node --test tools/test_particle_lifecycle.mjs
```

Capture conditions/runtime/receipt hashes: run-g-identity.json in the32 folder.
The existing preserver retains both runs, startup evidence, expanded diagnostic
scripts, prepared plans and frozen pixels in
tools/data/visual-preservation/connected-lifecycle-owner-20261026.zip with a
verified sibling receipt. It excludes APK/CPK/VM images and private keys. Retain
the local cold backup and signed APKs separately. No remote push was made.

## Current: connected nine-node reference readiness (2026-10-26)

**Result:** the existing evidence does not contain a connected native execution
of the exact nine-node white prefix. No new original birth/parent/RNG histories
were obtained and no new lifecycle rule was enabled in the renderer. All9 nodes
remain PARTIAL;0 complete lifecycles. Cloud source/Legacy visuals, independent body
recovery, native lifecycle implementation and prepared manifests remain unchanged.
This is a bounded evidence/access audit, not another native-function research run.

Target:`atk_slash1_white.bmb`, SHA256
`32c66c01d93f64f2fb67a5c0580bb62f2622b1a56a1e36e55210594e10b07de9`;
native SHA256`6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77`.
The prefix is a member of the composed skill at F3, not the pink skill member.
Nine source parameter nodes do not imply nine runtime emitters or37 native instances.

### Per-node lifecycle coverage

All life/count/duration values below are **source parameters**, not observed
absolute birth/end frames. Topology is source-verified. Module execution refers
to independent declared fixtures, not the actual mixed tree. Absolute native
birth, end, parent-instance identity and initial RNG remain missing for every row.

| Node/type | Source parent; nominal life | Proven independent original evidence / shared subset | Lifecycle status and exact missing join |
| --- | --- | --- | --- |
| 0 Null | root;0 | Activation;2 init/4 update modules; flag arithmetic and3 fourth-list selections; flag0 chain executes | PARTIAL: actual root InitContext/seeding, root stop/continue policy, first phase and child construction. Callback clamp-to1 is known locally; preview180 horizon is not original root lifetime evidence |
| 1 Null | 0;20 | Activation;4 init/5 update; native random roll/uniform scale under fixture;4 fourth-list selections | PARTIAL: real inherited flags, initialization RNG transfer, five child emitters' creation/activation order, live versus birth-time inheritance and actual end |
| 2 Quad | 1;8 | Activation;4/4/8 selected modules; independent complete geometry/writer fixture with burst texture | PARTIAL: which parent joint, birth/catch-up delta, inherited state/RNG, expiration and packed geometry at those actual ages |
| 3 Quad | 1;8 | Activation;4/4/8; separate color/geometry fixture, same burst texture | PARTIAL: same parent/time/RNG join as2; do not equate their tint because texture names agree |
| 4 Quad | 1;8 | Activation;4/4/8; measured local X velocity/geometry with light texture | PARTIAL: live age/delta, parent transform/color and end; controlled unit-delta positions are not source frame positions |
| 5 Null | 1;120 | Activation;2/4;3 fourth-list selections; native parent-to-Quad fixture | PARTIAL: survival after parent's nominal20, actual selector, child allocation/RNG ownership and termination |
| 6 Quad | 5;8 | Activation;5/5/9; independent two-texture ball geometry/writer fixture | PARTIAL: parent's actual instance/clock, full tint/alpha globals and ordered submission at native ages |
| 7 Null | 1;10 | Activation limit15 from count5/duration3;2/4;3 fourth-list selections; randomized velocity fixture | PARTIAL:15 capacity is not15 proven births. Need each joint birth, its child8 emitter, per-owner RNG sequence, selector and death |
| 8 Particle | 7;10 | Activation;4/4/6 selected modules; full standalone module chain. Separate initialized scheduler has13 updates under neutral helpers and already has a shared NativeParticleEmitter regression | PARTIAL: join each7 parent instance to its8 generator; combine full modules with its real callback/RNG/age/inheritance. Neutral scheduler omits the complete source modules; its seed/output cannot be spliced into the separate chain |

Null flag1 fourth lists are selected but the full auxiliary chains remain blocked;
the flag0 chains execute. Quad make execution is established by geometry receipts,
whereas a selected Particle make list alone is not an observed textured draw.
Initial Basic/Add material choices do not certify live source ordering/globals.

### Four distinct kinds of missing information

- **Original semantics:** actual caller's root stop/zero-life behavior; child
  survival/parent ownership and inheritance choices across expiration; how the
  observed initialization selects the fourth phase. Known scalar RNG, activation,
  module/clock helpers do not answer these whole-tree questions.
- **Initial values:** actual root/InitContext words, per-emitter seed ownership,
  original time origin, first/zero-update flags, parent view/basis/scale/color.
  InitContext+0x5c bit15 and+0x60 byte are distinct, already proven inputs.
- **Missing joins:** source-node -> emitter -> allocated joint -> parent joint;
  constructor/callback nesting, ordered phase events, module record and RNG
  before/after under one run. Node8's scheduler and chain receipts are independent.
- **Missing implementation:** source-backed mixed Null/Quad/Particle construction,
  allocator/child traversal, conditional fourth-list execution and full dynamic
  inherited-state propagation in the common graph. The finite neutral Particle
  program and phase clock already exist; do not reconstruct those again.

### Existing evidence reused and now joined

`tools/trace_bmb_lifecycle.mjs --audit-existing` reads the cached trace and joins
all matching entries from `cases`, `sourceCases`, `sourceInitializedCases` and
`sourceFields`. It retains per-receipt context boundaries and never synthesizes a
connected run. It verifies plan/source/native identities and node ownership.
Independent input/after-RNG values remain independent. The cached player trace is
historical (old player hash differs after the shared-player migration); its
snapshots are not relabeled current or native, and were not recomputed.

Exact-source receipts: generator-activation-native.json, null-initialization-flags.json
under`tools/data/reconstruction-map/`; brave-slash-null-chains.json,
brave-slash-null-auxiliary.json, brave-slash-quad-motion.json and
brave-slash-quad-geometry.json under`tools/data/connected-effect/`;
particle-module-chains.json and particle-scheduling-phases.json under
`tools/data/native-locator-emulation/`. NodeTree clock controls are context-only:
their callbacks are opaque fixtures, not those source emitters.

New aggregate:`tools/data/reconstruction-map/connected-reference-audit.json`.
Node8's initialized source fixture was already included in
`tools/test_particle_lifecycle.mjs`; this is an evidence-join correction, **not a
newly implemented Particle scheduler**. No unchanged native oracle was rerun.

Reproduce without simulation, original instruction execution or a new video:

```powershell
node tools/trace_bmb_lifecycle.mjs --audit-existing tools/data/reconstruction-map/white-prefix-initialization-trace.json --plan tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json --reference tools/data/reconstruction-map/generator-activation-native.json --module-reference tools/data/reconstruction-map/null-initialization-flags.json --module-reference tools/data/connected-effect/brave-slash-null-chains.json --module-reference tools/data/connected-effect/brave-slash-null-auxiliary.json --module-reference tools/data/connected-effect/brave-slash-quad-motion.json --module-reference tools/data/connected-effect/brave-slash-quad-geometry.json --module-reference tools/data/native-locator-emulation/particle-module-chains.json --module-reference tools/data/native-locator-emulation/particle-scheduling-phases.json --module-reference tools/data/reconstruction-map/node-tree-dispatch.json --output tools/data/reconstruction-map/connected-reference-audit.json
```

### Actual emulator capability boundary

ADB lists trace serial`emulator-5574`/`127.0.0.1:5575`; the package has PID3584.
Installed APK SHA`b90b252fb0a8ec38e87caac5f64307755a83eca0cf24b348db66674b50a2b2fb`
matches diagnostic-v26-live-fixed-step/ffbe-trace-signed.apk. This APK packages
**live-export revision5**, not the full observer. Its request accepts GPU draw
ordinals and optional fixedStep, not NodeTree Initialize/children/lifecycle data.
The request remains`{}`. No FFBE-Trace tag events were returned now: current hook
startup is unverified. APK contents must not be equated with current private
script execution. The script-mode Gadget path is private, on_change=ignore;
run-as still fails setegid. There is no verified external lifecycle RPC/hot reload.

Old v20-v23 pipeline specs select only pink24/34, blue8, purple3 and strobe3
Particles. They contain **no white-prefix node**. The corresponding retained raw
logs contain0 white-prefix pipeline samples. Existing snapshots therefore cannot
be stitched into this reference, regardless of the number of prior recordings.
Raw-log inventory and access snapshot are`connected-reference-log-inventory.json`
and`connected-reference-access.json` in the reconstruction-map data folder.

Offline alternatives also do not currently supply it: NodeTreeReference builds
opaque callback tables, while export_connected_effect admits only a constant
linear Null-to-Particle chain. This source is mixed, branched and randomized.
Neither tool executes its complete source Initialize/allocation/callback path.

### One bounded connected measurement, not another isolated probe

The next technical prerequisite is an extension of the **existing observe-mode
diagnostic** and a same-key update in FFBE Trace, or an actually source-initializing
offline harness. It is not an ADB permission toggle or ordinary video. No APK was
built/installed, app restarted, security setting changed or capture armed here.
Prefer the existing live observer: it can observe real allocation/parent contexts
instead of first rebuilding an offline mixed-tree allocator/caller contract.

1. Extend prepare_diagnostic's source spec with the pinned source's9 parameter
   nodes and original full-code fingerprints. Reuse pipeline_observer's source
   windows, exact module-context parameter equality and thunk/delegate handling.
   Retain the community script; use the existing arm-file channel, no new service.
2. Capture starts before relevant construction/loading. Associate the factory/
   resource source scope with nested NodeTree/Null/Quad/Particle Initialize and
   ordered emitter tables. If Initialize was missed due to caching/reuse, reject
   that recording rather than inventing its initial state.
3. Record monotonic sequence/thread/nesting and generation-qualified instance IDs;
   parameter node, emitter, joint and parent ownership; Initialize entry/return,
   ActivateGenerator, birth callback, module init/update/make/fourth list,
   Update/PostUpdate, death and source stop/release. Pointer reuse is not identity.
4. Keep typed contexts separate: engine InitContext+5c/+60, NodeTree UpdateContext
   delta, module context parameter/record/cursor/RNG and transform state. Known
   activation layouts differ: Null parameter+10/RNG+40 versus Quad/Particle
   parameter+f0/RNG+130. Never apply the Particle-only reader to Null. Unknown
   allocator/parent fields stay raw/unverified until their caller relation is seen.
5. Save full four-word RNG before/after with owner pointer and nested intervals;
   derive exclusive draw counts only using the verified primitive. Retain actual
   deltas, clock flags, local/world parent state and packed geometry/material
   requests at the same event. Do not seed each emitter independently or confuse
   the member's F3 start with local effect age0.
6. Write ordered JSONL/binary snapshots in the app's existing external trace area;
   keep logcat to control messages. Existing6-sample/2500-message limits are not
   sufficient. Use explicit byte/event/update caps and mark any overflow/missed
   hook/unpaired event as truncated. End on verified native completion/release,
   not the preview180 horizon. Observe without forcing RNG/delta/fixedStep.
7. First complete recording is replayed from its measured inputs by the common
   simulator. Compare ownership, event order, integer life/age/counters and RNG
   exactly, then source-qualified float32 transforms/geometry under existing
   helper tolerances. A second run with its own captured inputs tests transfer.
   No video is needed for this stage; later synchronized pixels prove rendering.

Original symbol/fingerprint inventory for these points is retained in
`connected-measurement-symbols.json`. Examples: Tree Initialize0x1fbd8dc,
Null Initialize0x1fbc9e0, Quad Initialize0x1fec280, Particle Initialize0x1fee8c0;
Tree Update/Post0x1fb8878/0x1fb8db4. These are pinned observation targets, not a
claim that new lifecycle hooks exist or have run.

**First boundary, not a fabricated first mismatch:** the common player prebuilds
37 instances with an integer preview seed; native root initialization/seed and
first birth are unknown before F0. The known local root0 callback clamp-to1 versus
preview horizon180 remains a documented approximation; changing it alone would
guess root stop/child survival. No safe new renderer rule follows from this audit.
Next step is the single connected recorder above, not an isolated alpha/scale
probe or another ordinary skill movie. Whole-source acceptance and all core
component status totals remain unchanged.

Checks actually performed: new evidence-join/source/native-identity guards and
the existing confirmed-visual byte-identity alarm pass; tracer syntax checked.
No unchanged native instruction tests, full game build or game recordings were
repeated. Product code and public assets were not edited.
Preservation:`tools/data/visual-preservation/connected-reference-readiness-20261026.zip`
and its sibling verification receipt retain the aggregate, reused connected-effect
JSON receipts, original source/plans and existing visual baseline. APK/CPK remain
external ignored prerequisites; the archive does not invent an executable native
recording interface. Local Git checkpoints retain tools/docs, with no remote push.

## Previous: independent body/effect completion (2026-10-26)

The user has visually confirmed the three Cloud source presentations in the real
game as equal to the retained experimental previews. This is the minimum visual
baseline, not proof of complete FFBE fidelity. The preceding migration entry below
records its original revision; this entry supersedes its body-return next step.

**Cycle 1 - P11/P12/P26/P28:** `BattleScene.executePreparedSkill` now coordinates
three independent completion signals: body recovery, prepared effect end, and the
reviewed damage event. The exact imported clip's keyed `animationcomplete` event
starts recovery, so body hit-stop does not truncate the clip. The bridge signals
its own terminal frame instead of a second guessed duration timer. The turn and
reward lock remain until all signals and pending impacts finish. Stop/shutdown
discard old completion callbacks; body/shutdown listeners are removed on either
completion or cancellation. No per-character/skill branch was introduced.

Approach18/return12 frames come from the existing prepared presentation recipe.
They and the retained game foot offset/easing/80ms melee hit-stop are **reviewed
adaptations**, not measured FFBE movement. The body sheet/pivots/frame durations,
Motion-1 member starts, target geometry and shader simulation are unchanged.
Legacy timings remain unchanged. Other source movement/camera codes are not solved.

**Cycle 2 - victory/cancellation:** active skill actors are excluded from the
immediate victory-pose broadcast; they finish the clip and return, then celebrate
while long effects remain. An actual mid-action scene restart leaves0 old body
listeners/variants/actions. An unsupported test camera really enters the bridge's
render-error branch, selects Legacy and completes the body/action; this does not
certify physical device/context-loss recovery.

**Cycle 3 - P10/P27/P28:** shared `validateSceneAction` rejects a prepared plan
whose scope or movement differs from its reviewed command. The publisher, import
inspection and runtime pre-MP check use the same contract. It does not infer a
missing scope, alter damage, guess unknown node families or silently publish them.
Two incompatible actual-game attempts spend no MP; compatible Climhazzard still
spends52MP, recovers at effect F76 and completes normally.

Measured full actions (`tools/data/choreography/product-cycle1.json`):

| Skill | Body end after effect start | Home/restored | Effect end | Reviewed damage/MP |
| --- | --- | --- | --- | --- |
| Brave Slash | about1029ms | about1233ms | about3108ms | 1 hit /18MP |
| Blade Beam | about946ms | about954ms | about3102ms | 1 per target /30MP |
| Climhazzard | about1032ms | about1238ms | about3344ms | 1 hit /52MP |

Browser sampling/timestep jitter makes these measured times approximate, not new
native constants. The receipt retains framewise position, pivot, body frame, MP,
target HP, effect age and hit times. Nine casts (three Legacy/source pairs, 2-target
Blade, unchanged Satellite and standalone Cross Slash) plus early victory/next wave
pass. Satellite/Cross remain non-native controls. Additional receipts:
`interruption-cycle2.json`, `admission-cycle3.json` in the same folder.

**Baseline guard:** `confirmed-visual-baseline.json` is a copy of the preceding
full product receipt, including three matched source/reference PNGs and host inputs.
`baseline-identities.json` pins the unchanged shared player, native lifecycle and
all four prepared manifests. Their bytes remain identical; current comparison
frames F24/F24/F35 still have0 changed pixels against the matched compositor over
730784 pixels each with the same declared game-overlay exclusions. This does not
compare every live frame/back pass to FFBE. Full real action state traces and the
Climhazzard recovery screenshot supplement those frozen rendering references.

**Cycle 4 - P29/P30:** `frozen-visual-baseline.json` adds canonical actual-game
frames with other actors frozen at frame0, retained independently of the current
player. The QA page's Check frozen visual baseline compares new source pixels to
these immutable saved PNGs, rather than only to a newly executed compositor.
Brave/Blade/Climhazzard pass with0 changed pixels over730616/730728/730560 pixels.
An initial106-pixel failure was entirely within the independently bouncing target
marker: the comparison now excludes the union of both captures' measured game-UI
bounds. No effect geometry/color/offset was fitted or widened arbitrarily.
`frozen-baseline-check.json` records both sets of bounds. Other actors/body frame,
host and source frame are fixed; this remains three frozen product states, not
full-frame FFBE fidelity. A tracked identity-alarm test pins shared player/native
lifecycle/three Cloud manifests, requiring a documented baseline review if bytes
change. NativeLifecycle's existing CRLF bytes are preserved via.gitattributes;
neither simulation nor prepared data was rewritten.

Executed:92 regression Node tests plus1 new baseline identity test (93 distinct,
no skips), including40 combat assertions, GPU product checks
above, and `npm run build` (only the existing size advisory). Native instruction
results and unchanged Python decoder tests are reused, not rerun. Reproduce with
`/tools/test-source-scene.html`: Run migration checks, Run interruption checks and
Run action admission check and Check frozen visual baseline. Receipt capture uses the existing loopback preview
server `captureOrigin`; preserve outputs under the paths above before another run.
The verified archive `tools/data/visual-preservation/body-effect-decoupling-20261026.zip`
includes this baseline, receipts, source plans and their dependencies; copy it for
the second PC. Older archives are immutable and remain available.

**Next original-reconstruction blocker:** connected NodeTree Initialize -> ordered
child allocation -> parent context/RNG ownership is still missing. Existing Null
flag controls cannot determine the actual selector. No unsupported selector or
replacement random seed was enabled;0/9 complete nodes and the30-component tally
remain unchanged. Finishing Touch still rejects unknown type7 (no matching local
authoring pair was found at its documented path). ADB lists trace serial5574 and
127.0.0.1:5575, but no installation, settings/data mutation or capture was performed.
Next measurement must join the white prefix's root0/Null1/Quad2 initialization,
ordered births, child return/context words, per-instance RNG before/after, and
parent state over its lifetime. A normal video alone cannot resolve that gap.

## Previous: controlled live-scene migration (2026-10-26)

The user's new priority explicitly admits reproducible **experimental previews**
into gameplay, while retaining Legacy. This is separate from native effect
certification: the source-wide lifecycle remains incomplete and0/9 prefix nodes
are fully accepted. No original measurements or simulation rules were replaced.

**Implemented:** the former preview player now lives in
`src/effects/originalEffectPlayer.mjs`; `tools/original_effect_player.mjs` re-exports
it. The research server serves that exact module. `PreparedSceneBridge.mjs` uses
Phaser Extern objects to render the same meshes, two-texture materials, source
transforms, alpha and native-blend candidates directly into the existing WebGL
framebuffer, with back/front ordering and arena clipping. No sheet flattening or
per-skill renderer branch. NativeLifecycle and the prior strict Particle program
remain intact. The only player body change is resource-release support.

`tools/publish_scene_presentations.mjs --recipe tools/presentations/cloud-review.json`
hash-checks and publishes existing prepared plans/models/PNGs; no raw BMB parsing
enters the game. `bmb-preview-scene-v1` manifests require
`quality:experimental-preview` and `originalFidelityVerified:false`. Their
provenance pins source plan, shared player, recipe and bundled Three bytes.
Content registry/Boot/Preload use generic presentation keys. Character recipes
retain all old presentations, resources and operations alongside the optional
`scenePresentation` binding. Import inspection rejects stale/mismatched bindings.

| Skill | Retained source plan | Product live scene / terminal frame | Known remaining limits |
| --- | --- | --- | --- |
| Brave Slash214800 | brave-slash-composed/plan-native-null.json | cloud_brave_slash /187 | Experimental graph/RNG/inheritance; source model/pink layers now visible. Motion-1 member F3/F6 retained; reviewed damage F6 remains independent |
| Blade Beam214810 | blade-beam/plan-native-null.json | cloud_blade_beam /186 | Source rectangle-1100/native geometry scale retained. Early moving green model is visible at F24; F30 is already mostly empty in the retained source preview. Legacy's artwork rotation/adapted travel is deliberately not stacked onto the source model |
| Climhazzard214820 | climhazzard/plan-native-alpha.json | cloud_climhazzard /201 | Five original visual members now run in game, including back flash. Native-X/scalar-alpha eligibility remains bounded; other graph/material rules retain explicit preview policies |

Plan paths are relative to`tools/data/shared-skill-review/`. Terminal frames are
compiled from all generated instance ends, not tuned per name. The reviewed
legacy MP/damage schedule is unchanged; action completion waits for the longer
live effect. Approach/return movement and host rectangles remain game adaptations.

**Mode:** normal WebGL game defaults to`Visuals: Source preview` for bound skills.
Header control toggles to Legacy between actions; `?skillVisuals=legacy` selects
Legacy on startup. Unbound skills stay Legacy in either mode. Loading/unsupported
profiles do not spend MP; renderer/preparation failures select Legacy with a
visible status rather than claiming success. The profile currently requires the
fixed unit-zoom/unrotated game camera and supports up to3 enemy targets. Camera
shake/scroll is passed through Extern's screen transform; camera cinematics are
not admitted. No reward offers, original damage formulas or chaining changed.

**Measured product evidence:**`tools/test-source-scene.html` loads the actual
Boot/Preload/BattleScene. Eight real actions pass: three Cloud skills in both
modes, two-target source Blade, and unchanged two-target Satellite while global
mode is Source. MP18/30/52 and one reviewed hit per target are retained. Satellite
has no source binding and provides **no native evidence**.

Three matched framebuffer comparisons against the existing preview compositor
pass at Brave F24, Blade F24 and Climhazzard F35:0 changed pixels over730,784
compared arena pixels each. Measured target-panel/marker bounds are excluded
because the standalone compositor has no game overlays; header/HUD are outside
the compared arena. Actors/tweens are frozen. These frames have no visible back
pass; this result does not certify all frames or the back-pass pixels. It proves
preview-to-product transfer under the declared host, **not native pixel fidelity**.
An initial comparison differed only on the game overlays; no rendering offset or
color correction was added to conceal it.

CPU comparison also retains complete effect/model/node data (apart from texture
URL relocation), source member starts and identical framewise world vertices,
triangles and material states at10 frames for1/2/3 target variants.52 targeted
Node tests pass, including the combat suite's36 checks. Product receipts and
paired PNGs:`tools/data/scene-migration/product-parity-review.json`,
`cloud-product-comparison.png`; initial six-cast receipt is retained separately.
No new FFBE capture. Original-frame/camera/RNG alignment is still unavailable.

**Reproduction:** run the publication command above,`npm run dev -- --host 127.0.0.1 --port 3000`,
then open`/tools/test-source-scene.html` and Run migration checks. The original
`/tools/test-source-presentation.html` explicitly selects Legacy for its retained
sheet/Particle regressions. Optional loopback capture uses the existing preview
server's`/product-review` endpoint; output is copied to the migration receipt path.
Use`node --test tools/test_scene_migration.mjs` for the bounded numeric comparison.

### Follow-up integration cycles

Cross Slash214790 is a **standalone import control**, not a fourth native reference
or new loadout/reward command. Its composed source was staged with the existing
Motion-1 resolver (unit prefix F3, back/front skill members F6). The unchanged
general preparation and publication path produces`cross_slash_import_test`;
`tools/presentations/cross-slash-import-test.json` explicitly prohibits a character
binding. One neutral reviewed test hit/20MP is used only by the product fixture;
source five-hit metadata remains provenance, not imported FFBE damage/chaining.
It plays through the same game executor/bridge with no render-name branch.
Its old converted atlas repair was **not** used; nevertheless that historical
individual work means this is not advertised as a wholly untouched skill.

This case exposed a genuine shared decoder restriction: BR3M35 with an empty name
table (`names==material`) and both material texture pointers absent was rejected.
`inspect_m3r.py` now admits that bounded layout without inventing a texture name.
All other bounds, stride, index, submesh and missing-pointer guards remain.
Original model SHA:f39b120eeedcaccbec7c5c0b57c1824e6a63fa64b7e7b971b90ed404dd3c7cb1;
independent converted counterpart SHA:f3c9d4803cffc3739b69f772a8613f36830c212848b359fef36a7cbfd23bcf73.
All100 positions/normals/RGBA/UVs and128 triangles match that counterpart under
the already verified V/winding reversal. This proves decoding, not native pixels.
Receipt:`tools/data/scene-migration/cross-slash/model-comparison.json`.
Seven model tests and two shared-source/preflight tests pass without skips.

For a truly unadjusted candidate, **Finishing Touch214840** was then staged and
composed using the same tools. All three effects/dependencies resolve, but
`atk_aero1_black_blue.bmb` has unknown type7 at nodes7/8. Its hierarchy is not
decoded; preparation formerly surfaced a misleading KeyError on a known parent.
`bmb_playback_fields.py` now reports unsupported families before mutating any
nodes or guessing child counts. This candidate is **blocked, not published or
rendered**. Its source SHA is ee7b6b777090666109d6dcdd3501c22b33c4cdc9e7387ad26925464672548d4a;
receipt/error:`tools/data/scene-migration/finishing-touch/blocked-receipt.json`,
`expected-block.log`. No type7 semantics, fallback plane or new enum meaning was
inferred. The fully untouched-skill acceptance milestone therefore remains open.

The product fixture additionally verifies actual scene restart: disposed bridge
variants become0, update-listener count stays5, and Legacy selection survives.
A separate targeted control starts in Source and verifies a controlled failure
**notification** switches to Legacy (`source-fallback-review.json` in the migration
receipts). No GPU/device loss was induced or certified. Runtime node families are gated to0/2/3/6, missing Model
geometry rejects rather than substituting a plane, and diagnostics expose the
retained preview limitations. Current four scene assets create6 prepared variants.
Unknown family admission and native fidelity remain distinct from preview parity.

Windows handoff pins the shared player, entry shim, reviewed scene recipes, Cloud
recipe and published scene JSON to LF; the exact bundled Three bytes are binary
preserved. Publication was rerun after actual source-byte normalization, not by
silently replacing hashes. Five publication/geometry checks pass for these bytes.
The main regression run passes90 Node tests, including37 combat assertions, and
the build succeeds with the existing Vite chunk-size advisory. No native emulator
or gameplay recording was repeated. All previous immutable archives remain valid.

Final product run: nine casts plus an additional early-victory action pass,
including Cross Slash's standalone control and the three Cloud pairs. The actual
restart frees all old variants and preserves the listener count. A new general
`activeSkillActions` completion guard prevents reward selection while a skill's
return/effect is still running; new encounters stop the prior scene playback.
This avoids crossing the old delayed callbacks into the next wave now that the
source scenes last longer than sheets. The tested transition retains Cloud HP3200
and MP82 after Brave Slash, with0 active skill actions/scenes in the next wave.
Receipt:`tools/data/scene-migration/final-product-review.json`.
The separate retained Legacy/Particle six-group product check also passes:
`legacy-regression-review.json`.64 pre-existing legacy asset/metadata files and
Cloud's gameplay fields match the pre-migration checkpoint; lifecycle module SHA
remains5ffffef3e01fdc772ce6d4ba61ea5a5a9bc229ca1392e135865798a1f0e40beb.
Final90 Node tests/37 combat checks and the build pass. Existing native function
receipts were reused, not regenerated. Full-context-loss recovery is not tested.

Remaining difference from the research view: the game keeps its reviewed
approach/return tweens, damage feedback and body/action completion policy. Melee
currently holds the attack pose until the full visual duration before returning;
the research `presentationPose` returns after body-track duration. The shader/
geometry parity result freezes those actors and does not certify this movement
choreography. Source/native host/camera replay, every back-pass frame and all
original source instances remain unaccepted. No hidden per-skill corrections
were added to reduce these differences.

Immutable preservation bundle for this migration:
`tools/data/visual-preservation/live-cloud-migration-20261026-final.zip`; its sibling
`.receipt.json` records verified hashes/counts. It contains current code, prepared
plans/dependencies, published profiles, comparisons, blocked-source evidence and
the converted model counterexample. Earlier archives remain separate; copy local
archives for another PC. Normal game playback needs only the tracked prepared
public assets and installed Node dependencies, not the ignored source dump.

**Next migration gate:** type7 layout/hierarchy/execution admission for the blocked
untouched candidate, or another explicitly chosen supported-family candidate.
The next bounded visual integration can decouple body return from effect lifetime
using the existing shared presentation clock, retaining action/transition guards.
For original fidelity, source Initialize/child/parent/RNG and full pass/reference
gaps still lead the critical path. The experimental product route is an integration
target, not evidence that those original rules are solved.

The preserved pre-migration archives below are immutable fallbacks and remain
reproducible; no historical preview was overwritten.

## Current visual preservation and transfer checkpoint

2026-10-26. **Native skill-reference corpus: Brave Slash214800, Blade Beam214810,
Climhazzard214820 only.** The user explicitly corrected the scope: Satellite Beam
was never checked in BlueStacks. Its old artifacts are retained as product history
and an unchanged gameplay regression, never as native/general-engine evidence.

### Preserved render states and replay limits

Before changing playback or pixels, workspace snapshot3564c09c10ee65aa1de8497db9e364d5ff0cf866
was created on `codex/workspace-checkpoint-20261026-125924`, without resetting the
active checkout/index. Ignored archive
`tools/data/visual-preservation/before-integration-20261026.zip` contains862 files,
44 BMB plans, prepared resources, existing screenshots and the renderer/SDK code.
All entry SHA256s and ZIP CRCs were verified. Archive SHA256:
`c7765ae76b694c213f049a404295939e622efff4f841e8359ca45d0ac194543e`.
It is39,190,675bytes, not the multi-GB raw dump. The archive is local/ignored:
copy it with the project for a second PC; a Git checkout alone cannot restore it.

All44 BMB plans retain valid prepared resource hashes. No earlier Git checkout
was necessary. Their original per-frame UI settings/player hashes were not always
recorded; **exact historical pixel identity is not established**. Saved screenshots
remain independent evidence. The frozen current player can replay the old plans
and their explicit feature switches; this is not a claim that every older code
revision was recovered byte-for-byte. New captures now record plan/player/Three/
lifecycle/page hashes, frame, seed, scene and all diagnostic switches.

Common own renderer: `tools/original_effect_player.mjs`, SHA256
`65e169c3e2692c2f2a363b5a6c95fd79f9d4db739127d94a771af50cdf09a642`.
The bundled Three build is byte-pinned by SHA256
`613f93102cdd08ff32b0f9bfed0585ef29235e14d95bac63a0c89f166b308f1a`;
its SDK folder is`tools/bin/effekseer-webgl-1.80.7/`. The own player and
`src/effects/nativeLifecycle.mjs` did not change during visual recovery.

| Skill / retained candidate | Plan and configuration | Visible strengths and remaining difference from product | Evidence / replay status |
| --- | --- | --- | --- |
| Brave Slash: older calibrated pink baseline and composed/native-null candidate | `tools/data/shared-skill-review/brave-slash/plan-renderer-reference.json` (87df431bcbc1...); `brave-slash-composed/plan-native-null.json` (6287ff9e7aa9...). Composed source starts white F3/pink F6, seed1, measured global geometry multiplier1.775; appearance, inheritance, UV2/Add, vertex RGBA/Basic/blend and bounded locators are explicit plan modes | Source model geometry and texture layers retain the larger pink-ring presentation. Published product intentionally uses the converted **flashcut** variant plus white prefix sheets; it is a different visual asset/path. A global scale change or applying the BMB multiplier to an already baked sheet would not recover the missing layers | Old `browser-f26.png`, `browser-f42.png`, `browser-forest-upper-f26.png` and earlier A/Bs retained. Isolated replay ready; fresh game-host F42 (skill F24) saved as `recovered/214800-f42-9e6c934cdb1a.png` with hashed receipt |
| Blade Beam: calibrated rectangle baseline and native-null candidate | `tools/data/shared-skill-review/blade-beam/plan-renderer-reference.json` (008c34696ab6...) and `plan-native-null.json` (e4d3e06be77b...). Green300%/F0 target-side rectangle with source-1100; blue100%/F5 target-unit; source appearance, UV2, models/material and locator switches retained | Continuous source geometry/internal travel versus converted sheet samples. Product retains the user-reviewed clockwise90-degree artwork correction and adapted target-group placement. That rotation is an adaptation, not a missing native rule. Offsets, geometry-scale and baked scale are distinct domains | Old UV/second-layer A/Bs, `renderer-reference`/rectangle review artifacts retained. Isolated replay ready, fresh game-host F30 saved as `recovered/214810-f30-fc196b268e99.png` |
| Climhazzard: native-X/native-alpha and bound-host candidate | `tools/data/shared-skill-review/climhazzard/plan-native-alpha.json` (29ebd406296c...). Five members/four effects; source rotations330/210,50% side cuts,200% blow, geyser F20 and screen/back member F1. Native X admits1/7 Particle nodes; native scalar alpha5/7 | Recovered purple cuts, blow/geyser, textured models and source-selected alpha; bound view uses measured camera/viewport/scissor with explicitly declared rectangles/zero scatter. Product still has a legacy no-VFX command. Source lifecycle/RNG/material gaps prevent declaring the whole preview safely supported | Existing bound-host/native-alpha A/B screenshots retained. Fresh ordinary F53 corresponds to skill F35: `recovered/214820-f53-f958c85b32e0.png`. Actual bound-host F35 also readies with5 GPU checks and5 explicit anchors; separate replay receipt retained |

Paths abbreviated in the last column are under
`tools/data/visual-preservation/`; complete hashes/dependencies are inside the
archive's`VISUAL_REFERENCE_MANIFEST.json`. Earlier plans, including basic-UV,
appearance/inheritance and source-only variants, are retained, not overwritten.
"Latest" is not a visual-quality ranking; the user-liked earlier baselines remain
separate candidates. Native alpha, basis and blend unit tests establish only their
bounded rules, not full-skill pixels. The single original pink GPU sample under
`tools/data/live-effect-export/clip-review-20261026/` is a material/blend reference,
not a synchronized whole-skill/camera baseline. No new FFBE recording was made.

Satellite's preserved `tools/data/skill-previews/barret/satellite_beam/plan.json`
uses the converted Effekseer1.80.7 runtime, not the own BMB player. Its new
`preview_skill.mjs --prepared-plan` replay reads the exact existing config/resources
without SQLite discovery and writes new outputs separately. Both arenas render.
Its published beam, character metadata and pixels were restored to the pre-session
baseline after the scope correction. It contributes no native acceptance result.

Additional reproducibility limit found, not hidden: the standard baker completes
an isolated90-frame Brave export with the new gutter path, but its regenerated
interiors are not pixel-identical to the historical published sheet:44/90 frames,
742,147 pixels differ; maximum channel difference30, first differing frame0.
Receipt:`recovered/baker-reproduction.json`. Source/dependency hashes are checked;
the exact historical rendering environment/tool identity is incomplete. The cause
is **not established** (GPU/environment variation is only a hypothesis). The
newly regenerated pixels were not published. The active sheets use lossless
repacking of the actual preserved historical pixels instead. This is precisely why
the snapshots retain both executable plans/code and original result images.

### Reproduction without extraction or rebuilding old effects

Extract the archive into a **new** directory, never over the active checkout.
Node24 and the archived lockfile's dependencies are required (`npm ci` in the new
directory; this session reused the installed dependencies through a local junction).
The final preservation bundle includes the new replay/capture helpers. No APK,
CPK, master DB or regeneration of native oracles is needed for prepared replay.

```powershell
$visualPython = 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
& $visualPython tools/preserve_skill_previews.py --verify tools/data/visual-preservation/before-integration-20261026.zip
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json --plan tools/data/shared-skill-review/blade-beam/plan-native-null.json --plan tools/data/shared-skill-review/climhazzard/plan-native-alpha.json --host-view game --port 3113
# Select the skill and frame; Capture current frame saves PNG + identity/settings.
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/climhazzard/plan-native-alpha.json --host-view game --host-reference tools/data/memorial-audit/pipeline-v23-20261025/effect-host-context.json --host-bindings tools/data/memorial-audit/pipeline-v23-20261025/declared-host-bindings.json --port 3115
# http://127.0.0.1:3115/bound-host.html?skill=214820&frame=35
# Optional product-history replay, NOT original-renderer evidence:
node tools/preview_skill.mjs --prepared-plan tools/data/skill-previews/barret/satellite_beam/plan.json --output tools/data/visual-preservation/satellite-replay --port 3114
```

### Safe transfer performed: technical and visual progress separated

**Technical:** explicit per-sheet sampling metadata now passes through recipe,
baker, cache checks, character publication and Preload. `sheetSampling.ts` defaults
to nearest and rejects linear sampling without an extruded gutter. The common
`pack_effect_sheet.py` duplicates boundary texels without resampling frame content;
the baker and lossless repacker use that same function. Runtime uses gutter margin/
spacing and applies the declared filter only to effect textures. Unit pixel-art
sampling, pivots, Motion-1, skill timing/costs and BMB simulation are unchanged.

**Visual:** reviewed linear sampling is enabled only for Brave's pink sheet and
Blade's green wave, with one extruded border texel. All180 original frame interiors
are bit-identical. The actual Phaser A/B changes only filtering under matched
host/frame/geometry and paused actor poses. Inspected comparison:
`tools/data/visual-preservation/recovered/sampler-comparison.png`; raw full frames
and receipt are retained beside it. Brave F26 changes12,164 pixels (maximum channel
difference45); Blade F30 changes93,180 (maximum77). These are **A/B change metrics,
not errors against FFBE**. The green wave visibly loses coarse scaling steps;
this modest display adaptation does not restore the larger missing BMB geometry.
Original FFBE sampler fidelity is not proven. No Climhazzard effect was published.

Product check passes6 groups: legacy/composed Brave, Blade area, unchanged
Satellite regression, two Cloud sampler A/Bs and existing dynamic Particle control.
Receipt:`tools/data/visual-preservation/recovered/product-review.json`.
Character sprites/command definitions match the pre-session snapshot. A pre-existing
Windows CRLF-only recipe-hash mismatch was traced and normalized back to the
original LF bytes;`.gitattributes` pins reviewed effect JSON to LF for future sync.
No arbitrary hash replacement or asset regeneration concealed this mismatch.

Executed after integration/scope correction:48 targeted Node tests pass without
skips (16 import tests,35 combat assertions inside their suite, player/host/view
checks);3 Pillow padding tests pass; full build succeeds with the existing Vite
chunk-size advisory. Logs:`tools/data/visual-preservation/final-tests.log`, Cloud
publication log and isolated baker receipt. The renderer/lifecycle hashes are
unchanged, so their earlier native clock/Particle/scalar differentials were reused
rather than re-executing unchanged original tests. One attempted Barret republish
hit a Windows copyfile error on an unchanged limit sheet; hashes proved all body
PNGs intact, and saved baseline metadata was restored. It is not reported as a
successful additional publication. Cloud publication succeeds with the new schema.

Technical acceptance: archive integrity, prepared replay/resource identity,
lossless frame interiors, gutter/loader coordinates, scoped sampler and unchanged
combat behavior. Visual acceptance: inspected paired renderer frames demonstrate
the intended smoothing only. Full original-frame comparison, complete BMB effect
and new original-fidelity skill acceptance remain unachieved.

Final preservation bundle is`tools/data/visual-preservation/secured-cloud-previews-20261026.zip`;
its sibling`.receipt.json` records exact ZIP size/hash and verified file/plan counts.
Verified bundle:929 files /44 plans /66,920,544bytes; SHA256
`59be0ca6980607aa285c2e8f91877dcccc0491148ab6c5cabe1ffed7e5fccea8`.
The bundle also includes the new capture/replay helpers, reviewed converted inputs,
original retained screenshots, limited native pink-pixel references and current
comparison receipts. Keep the earlier before-integration archive as an independent
fallback. Both remain ignored/local; no remote upload was authorized or performed.

**Remaining transfer blocker / next technical work:** the best source previews
depend on mixed-node hierarchy/lifetimes/RNG, model/Quad geometry, two-texture
materials and scene-dependent passes that the productive bounded Particle profile
does not admit. Preserve their player/plans as visual baselines while integrating
the original Initialize -> emitter table -> child/parent/RNG contract. Then compile
an explicitly supported complete prepared effect into the shared runtime and
compare at matching source time/host; do not rebake the approximate preview as a
purported native skill. The nine-node prefix remains0/9 fully accepted; the30-core
status tally is unchanged. Reuse the unchanged native clock/Particle test receipts.

## Follow-up: Null initialization flag boundary (2026-10-26)

This is a **technical analysis/trace improvement, not a new product rendering
capability**. No BMB player, native runtime simulation, skill mapping or pixel
changed after the visual checkpoint. Complete nine-node acceptance remains0/9.

The existing `tools/memorial/emulate_node_tree.py --null-flags` now executes two
bounded original Null Initialize blocks:0x1fbcb3c..0x1fbcb8c and
0x1fbcfc8..0x1fbd004. It does not execute allocation, child constructors or whole
Initialize.160 controlled combinations match the generic
`tools/lib/null-initialization.mjs` equation. Inputs are raw locator/C8/CC fields
and explicit parent/child-return flag words; no filename/node-ID dispatch exists.
The pinned native SHA remains6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77.

All four source Nulls have locator1/C8=0/CC=1. Those raw fields alone permit both
fourth-module selector values depending on the child-return context. Their real
parent/child words remain **unknown**, rather than silently selecting flag0.
Seven additional Null records from Blade's green source are inventoried; this is
not native gameplay validation of those records. Receipt:
`tools/data/reconstruction-map/null-initialization-flags.json`.

Static original dataflow establishes a second boundary: NodeTree Initialize
0x1fbdcd0..0x1fbdd0c copies InitContext+0x5c bit15 to NodeTree+0x15, but copies
the **separate** InitContext+0x60 byte to NodeTree+0x16. The current phase-clock
auxiliary fixture uses the latter. The two switches must not be equated.
The child call at0x1fbcfa8 resolves through PLT0x110a1e0/GOT0x2defb98 to
`ParticleEmitterNode<QuadTraits>::Initialize`, not NodeTree Initialize. This names
that branch only, not every child in the Null dispatcher. Native Null Initialize
SHA:fabc603963a2d4e5fb84c7fdb2ae574e352f847f7570eaf949352e5e8f9b3915;
NodeTree Initialize SHA:371022dd9a3c4fa3b1e494a8496346f5b477eb74307528d3de2f8e2f199992ac.

`tools/trace_bmb_lifecycle.mjs --null-flags-reference` now hash/source-joins this
receipt to the nine-node inventory. All actual flag values remain null; the
37-instance/181-frame trace is still the experimental prebuilt graph, not original
instance acceptance. Source activation matches remain9; complete nodes remain0.
`tools/test_null_initialization_flags.mjs` and the updated lifecycle trace test
check the arithmetic, missing-context rejection and retained unknowns. All9
targeted tests pass without skips; the updated181-frame trace reports9 activation
matches,37 experimental instances and0 complete native nodes. Receipt/log:
`tools/data/visual-preservation/null-flags-tests.log`.

Reproduction (reuse the generated receipt unless implementation/conditions change):

```powershell
$env:PYTHONPATH = (Resolve-Path tools/data/native-locator-emulation/python-deps).Path
& $visualPython tools/memorial/emulate_node_tree.py --apk tools/data/memorial-audit/installed-base-v208.apk --null-flags --source tools/data/shared-skill-review/brave-slash-composed/originals/atk_slash1_white.bmb --source tools/data/shared-skill-review/blade-beam/originals/atk_aerialslash_001_green.bmb --output tools/data/reconstruction-map/null-initialization-flags.json
node tools/trace_bmb_lifecycle.mjs --plan tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json --effect atk_slash1_white.bmb --reference tools/data/reconstruction-map/generator-activation-native.json --null-flags-reference tools/data/reconstruction-map/null-initialization-flags.json --output tools/data/reconstruction-map/white-prefix-initialization-trace.json
node --test tools/test_null_initialization_flags.mjs tools/test_bmb_lifecycle.mjs
```

**Next exact missing measurement:** for the pinned nine-node source, record the
ordered native child constructor calls, InitContext+0x5c before/after each call,
InitContext+0x60 separately, four RNG words and selected module arrays. This joins
the proven flag arithmetic to real source initialization and the existing clock.
Existing ordinary video and independent per-emitter seeds cannot supply it. No
new gameplay recording or emulator modification was made for this block.

## Current autonomous checkpoint: original clock and bounded Particle program integrated

2026-10-26. This entry supersedes the execution recommendations below; historical
receipts keep their recorded boundaries. **0/9 complete source nodes remain accepted.**
The component tally remains4 INTEGRIERT /1 VERSTANDEN /25 TEILWEISE: the bounded
subcontracts below do not close the complete contracts of P12-P18/P21/P27-P30.

### Completed development cycles

| Cycle / affected components | Before | Integrated rule and evidence | Remaining boundary |
| --- | --- | --- | --- |
| NodeTree dispatch, P12/P13 | Preview prebuilds instances; no shared original phase clock | `src/effects/nativeLifecycle.mjs:NativePhaseClock`, re-exported by `tools/bmb_lifecycle.mjs`, matches29 original ARM64 controls /891 callback events from `tools/memorial/emulate_node_tree.py`; `tools/test_node_tree_clock.mjs`:30 tests | Original Update/PostUpdate execute; callback bodies are explicit opaque fixtures. This is not original source-tree initialization/child birth/parent inheritance. Loop restart is rejected. |
| Particle birth/life/RNG, P12/P13/P14/P15 | Request-only scheduling or isolated module checks | `NativeParticleEmitter` executes finite constant activation, request/callback/lifetime RNG, delayed births, negative newborn age, PostUpdate aging, inclusive end and crossing-duration reset; exact state/request matches against cached originals | Neutral parent; one cycle, bounded non-overwriting ring, zero restart parameters, explicit four-word state. No implicit source RNG seed policy. |
| Dynamic X / catch-up, P16/P18 | Scale initializer/update understood separately | ConstX and VelocityX in the same emitter; VelocityX newborn receives only the remaining delta after its birth. Four original callback/PostUpdate controls in `particle-velocity-birth.json`; original scalar functions0x1fc766c/0x1fc7a58 and wrappers retained with hashes | Single X module only; no other source initializer arrays, UV2 or color arrays. Native controlled deltas do not establish arbitrary floating-point integration equivalence. |
| Product bridge, P18/P21/P27/P28 | Product accepts converted sheets only | `PreparedParticleEffect.ts`, `particleProgram.ts`, `PreloadScene.ts`, `BattleScene.ts`: common clock/emitter and existing576-sample native scalar-alpha helper drive actual Phaser image births, geometry, alpha and cleanup. `tools/prepare_particle_program.mjs` compiles an explicit bounded prepared program and copies the original PNG | Profile `native-particle-basic-v1`: fixed60Hz, neutral parent/root, quarter-grid intervals, centered view-aligned radius-one X quad, white Basic tint, explicit host scale, existing NORMAL/ADD blend. No full original material/pixel claim. Unadmitted program fields reject. |

The productive Motion-1 scheduler and published Brave Slash / Blade Beam /
Satellite Beam mappings are preserved. The new `native_particle_control` content
entry is a **controlled assembly** of independently measured lifecycle/VelocityX,
source scalar-alpha keys and original ball PNG. It is not mapped to any skill,
character recipe, reward or claimed as a full source effect. Publishing this
assembly as Brave Slash would be incorrect. Climhazzard remains a legacy no-VFX
command. No full-skill or complete-effect milestone is promoted.

Shared code is now physically under `src/effects/nativeLifecycle.mjs` with
`nativeLifecycle.d.mts`; the tools shim exports the same functions. Raw BMB
decoding, resource resolution and program construction stay under `tools/`.
The experimental player imports the same unchanged scalar-alpha function.
Trace implementation identity includes the actual runtime module, not just its shim.

### Original evidence and reproducibility

Native library identity remains
`6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77`.
NodeTree Update0x1fb8878/1332bytes and PostUpdate0x1fb8db4/304bytes execute original
instructions under explicitly initialized context/root/table/sort fixtures.
The first large Update can split into1 + remainder, or repeated unit steps under
the initial split flag; auxiliary flags can cause a PostUpdate(0) before Update.
Phase callbacks run table-wide Update then table-wide Post, not interleaved per node.
Zero-life root age is not an elapsed-effect clock: it stops accumulating after
its first positive update while callbacks can continue. These invalidate using
the legacy birth+life horizon or one assumed delta sequence as native traversal.

Particle matching corpus:9 cached initialized controls +13 selected source
Particle controls +7 new lifecycle holdouts +4 VelocityX controls =33 exact
state/RNG/request comparisons. Source controls deliberately omit other modules;
they are not complete source effects. `tools/test_particle_lifecycle.mjs` adds a
34th NodeTree-to-emitter integration test. New original calls were confined to
these previously missing clock/crossing/birth-delta questions, not repeated videos.
Ignored receipts are under `tools/data/reconstruction-map/`:
`node-tree-dispatch.json`, `particle-lifecycle-holdout.json`,
`particle-velocity-birth.json`. Existing source/module receipts remain reusable.

```powershell
$lifecyclePython = 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
$env:PYTHONPATH = (Resolve-Path tools/data/native-locator-emulation/python-deps).Path
# Recreate originals only when source/functions/fixtures change.
& $lifecyclePython tools/memorial/emulate_node_tree.py --apk tools/data/memorial-audit/installed-base-v208.apk --output tools/data/reconstruction-map/node-tree-dispatch.json
& $lifecyclePython tools/memorial/emulate_particle_scheduler.py --apk tools/data/memorial-audit/installed-base-v208.apk --family lifecycle-holdout --output tools/data/reconstruction-map/particle-lifecycle-holdout.json
& $lifecyclePython tools/memorial/emulate_particle_scheduler.py --apk tools/data/memorial-audit/installed-base-v208.apk --family velocity-birth --output tools/data/reconstruction-map/particle-velocity-birth.json
node tools/prepare_particle_program.mjs --reference tools/data/reconstruction-map/particle-velocity-birth.json --case 0 --alpha-plan tools/data/shared-skill-review/climhazzard/plan-native-alpha.json --alpha-effect eff_strobe_white_a50_f30.bmb --texture-plan tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json --texture-effect atk_slash1_white.bmb --texture-name lapis_eff_material_019_common_0008_ball1 --key native_particle_control
node --test tools/test_node_tree_clock.mjs tools/test_particle_lifecycle.mjs tools/test_native_scalar_alpha.mjs tools/test_bmb_lifecycle.mjs tools/test_combat_regressions.mjs tools/test_character_pipeline.mjs
node tools/check_particle_product_receipt.mjs --receipt tools/data/autonomous/native-program-product.json --reference tools/data/reconstruction-map/particle-velocity-birth.json --manifest public/assets/effects/native_particle_control/manifest.json --output tools/data/autonomous/native-program-comparison.json
npm run build
# Actual Boot/Preload/BattleScene GPU check: open this existing page, press Run.
# http://127.0.0.1:3000/tools/test-source-presentation.html
```

Final verification:125 Node tests pass, no skips, including14 import tests and a
suite with35 combat assertions. The final command also includes
`test_original_effect_player.mjs`, `test_null_locator.mjs`,
`test_native_particle_x.mjs`, `test_original_appearance.mjs` and
`test_original_inheritance.mjs` after moving the shared scalar helper. Log:
`tools/data/autonomous/final-tests.log`. Native scalar-alpha576-sample maximum
absolute residual remains4.768376715702516e-8. Build passes (existing chunk-size
advisory); both new Python harnesses compile. `git diff --check` is clean.

Actual product WebGL check passes all five cases: legacy Brave, Motion-1 Brave,
Blade, Satellite and dynamic Particle control. Product receipt:
`tools/data/autonomous/native-program-product.json`; inspected canvas frame:
`native-particle-product.png` in the same folder. Dynamic first frame has two
particles with widths129.59015369415283 and64.19930458068848px, matching the
independent native records after explicit25px/unit mapping; eight total births,
cleanup at source frame14, no retained images. No matched original pixel baseline
exists for this assembly. The browser confirms execution, not original visual fidelity.
The saved-product comparator also matches both available native frame states and
RNG words exactly; maximum width residual0px. Its receipt is
`tools/data/autonomous/native-program-comparison.json`. Later product frames have
no native baseline in this control and are not counted as original matches.

### Next critical path and exact original reference gap

1. Connect original **Initialize/ordered emitter table and child allocation** to
   the measured clock, with explicit initial emitter RNG words and parent selector
   state. Then capture root0 -> Null1 -> Quad2 first birth in the original callback
   order; do not substitute nine independent activation fixtures for this record.
2. Extend source-plan admission to that measured connected profile, then remaining
   source modules (including node8 VelocityX/UV/color initialization order) and
   inherited transforms. The new product program supplies an integration target;
   do not broaden its gate before these contracts are supported.
3. Admit one full original effect, compare synchronized state/geometry, then obtain
   matched original draw/material/background pixels before claiming visual fidelity.

Needed original record: same exact nine-node BMB hash, initialization inputs,
ordered emitters with RNG before/after each creation/module, Update/Post/delta-zero
phase and delta, parent instance/selector/basis at each birth, and life/death through
source removal. Ordinary gameplay video cannot establish these internal states.
Source-wide render order/material and matched original pixel frames remain missing.

Safe emulator check: FFBE Trace Tiramisu64_2 is reachable at `127.0.0.1:5575` via
the installed `HD-Adb.exe`; FFBE11.1.1/code208 is running. External app assets and
existing trace/export directories are readable. Private `run-as` fails with
`setegid(AID_PACKAGE_INFO)`; the installed diagnostic's export request is `{}`.
ADB reachability does not provide an original NodeTree control API. No reinstall,
app-data deletion, security change, gameplay recording or capture request occurred.
Offline pinned original-code fixtures supplied the needed new references instead.

## Previous lifecycle checkpoint: complete source inventoried, full native traversal still blocked

**Result, 2026-10-26:0 of9 nodes are accepted as completely reconstructed.** All9 have checked structural/source records and matching native **activation** results. Their complete birth/parent/phase/RNG/death histories do not have a synchronized original reference. Do not equate nine inventoried nodes, nine matching activations, or37 deterministic preview instances with an accepted original effect. P07/P12-P14/P29/P30 remain TEILWEISE; P15 remains VERSTANDEN at its existing contract: the four-word primitive has a shared implementation now, but is not the preview's complete RNG ownership policy. The30-component tally is unchanged.

### Exact target and per-node inventory

Original `tools/data/shared-skill-review/brave-slash-composed/originals/atk_slash1_white.bmb`, SHA256 `32c66c01d93f64f2fb67a5c0580bb62f2622b1a56a1e36e55210594e10b07de9`; reference plan `tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json`. This is the attack-prefix member, not the pink effect or the full skill. All authored generation starts/ranges are0, all lifetime ranges0, repeats1, intervals1. Those values are **relative source fields, not proof that native instances all appear at absolute F0**.

| Node/type | Parent / children | Source generation count / duration; stored life | Existing original module evidence | Transforms/resources/material evidence | Missing for full acceptance |
| --- | --- | --- | --- | --- | --- |
| 0 Null/root | none /1 | 1/1;0 | init2/update4 execute with explicit auxiliary flag0; make/locator list3 selected; flag1 adds3 fourth-phase callbacks | Neutral transform/color modules; no texture/draw. Init consumes3 RNG draws in the existing fixture | Actual root initialization, stop/lifetime policy, seed ownership, first-update/auxiliary phase and child activation order |
| 1 Null | 0 /2,3,4,5,7 | 1/1;20 | init4/update5 execute; make/locator list4 selected; flag1 adds4 callbacks | Native random Z rotation and uniform1.5 scale;7 init draws under fixture; no texture/draw | Actual inherited state/selector, live versus birth-time parent state, ordered child generator activation and death |
| 2 Quad | 1 /none | 1/1;8 | init4/update4/make8; complete make/writer executed under declared geometry hosts | burst_set1 texture; source Default transform, scale/velocity, alpha and flat color; initial Basic slots4/8; writer0x2005180 | Source-timed parent/record inputs, exact birth/expiration, actual packed output/material globals at those times |
| 3 Quad | 1 /none | 1/1;8 | Same4/4/8 bounded execution | burst_set1, distinct tint; Basic4/8, writer0x2005180 | Same lifecycle/parent/reference joins as node2; matching texture does not imply equal color |
| 4 Quad | 1 /none | 1/1;8 | Same4/4/8 bounded execution | light2; local X starts-40, velocity10; packed center reaches-30,-20,-10,0,10 under unit-delta/identity-parent control; Basic4/8 | Actual age/delta, inherited matrix/tint and expiration for each live instance |
| 5 Null | 1 /6 | 1/1;120 | init2/update4 execute; make/locator3 selected; flag1 adds3 callbacks | Neutral local parent, native parent-to-Quad handoff fixture;3 init draws; no texture/draw | Survival when parent1 ends, inherited phase selector, real lifetime/child ownership |
| 6 Quad | 5 /none | 1/1;8 | init5/update5/make9 and two-texture writer execute with declared hosts | ball1 in both texture slots; X=-40/velocity10; source second UV scale; Add slots12/24, writer0x2005500 | Source parent traversal, actual tint/alpha globals and ordered two-texture submission at native ages |
| 7 Null/generator | 1 /8 | 5/3;10 | init2/update4 execute; make/locator3 selected; flag1 adds3 callbacks | X=-80, velocity[10,0,0], velocity range[10,1,0];9 init draws under fixture; activation limit15 proved; no texture/draw | Requested15 capacity is not15 proven live births: per-joint births, child activations, emitter RNG order, inherited flag and death remain unknown |
| 8 Particle | 7 /none | 1/1;10 | init4/update4 execute; make list6 selected; separate Particle scheduling/lifetime/scale/writer references exist | ball1 in both slots; initial size2/range1 and speed-0.1; Add12/24; textured native writer evidence remains bounded | One generator/joint per parent birth, complete callback/module RNG sequence, age catch-up, inherited transforms/tint, packed output and submission |

Texture names in the table abbreviate `lapis_eff_material_005_0047_burst_set1`, `lapis_eff_material_003_0036_light2`, and `lapis_eff_material_019_common_0008_ball1`. The generated inventory retains complete names, typed bindings, prepared identities, transform vectors, source inheritance and module lists. Basic/Add initial selection is not proof of runtime overrides or final draw ordering. Null make/locator lists are not independent geometry draws.

Evidence reused without rerunning unchanged native chains: `docs/research/brave-slash-connected-combat.md`, `native-null-parent-chains.md`, `native-particle-phases.md`, `native-particle-scheduling.md`, `native-particle-chains.md`; ignored receipts `tools/data/connected-effect/brave-slash-null-chains.json`, `brave-slash-null-auxiliary.json`, `brave-slash-quad-motion.json`, `brave-slash-quad-geometry.json`, and `tools/data/native-locator-emulation/particle-module-chains.json`, `particle-scheduling-phases.json`, `particle-module-fixtures.json`. The trace joins the relevant source-hash/node records explicitly. Auxiliary flag1 execution remains blocked, not silently treated as flag0.

### First proven discrepancy and bounded common correction

`instances()` previously always used `S + floor(U*(R+1))`. Native activation requires `max(0,S-R+(R ? word%(2*R) : 0))`, consuming a word even at zero range. With S2/R5, the old common scheduler and integer seed1600 produced birth7; **no native RNG word can produce7** because the original support is0..6. The new source-admitted delay mapping produces0 for that controlled legacy word and tests the full allowed window. This proves a delay-rule defect independently of unresolved whole-tree RNG seeding. Disabled source Quad/Particle emitters now produce no instances or RNG draw. Unknown modes/profile mismatches reject; old plans without the new metadata remain labeled legacy comparisons.

Implemented in `tools/bmb_lifecycle.mjs`, consumed by `tools/original_effect_player.mjs`; `tools/bmb_playback_fields.py` retains source `nativeGeneration` mode/enabled/relative fields and uninterpreted control bytes, so future normal `prepare_original_preview.py` output carries the admission data. The common player also exposes read-only numeric `traceSnapshot()` and optional instance/RNG observation. `tools/preview_original_skill.mjs` serves the new shared module; no new viewer/renderer was added.

The shared four-word xorshift primitive and upper23-bit uniform sampler are exact under explicit state. **They deliberately do not replace the preview's integer-seeded LCG globally.** Source module selection/order and per-emitter initial states must determine that replacement. Otherwise merely changing the algorithm would assign different, still unproven random values to every birth/module. Dormant vectors/UV/color draws in the current legacy sampler remain a known unresolved defect.

Focused original instruction inspection also excluded a tempting incorrect fix: all four Null source parameters have lifetime mode at+0xc4 equal0, so the child-derived CheckLifeTime branch for mode1 must not be enabled here. The original Null birth callback clamps nominal nonpositive sampled lifetime to one; actual root stop/parent policy still needs Initialize/traversal context. Replacing zero with the preview horizon is an approximation, and neither that horizon nor the mere existence of the mode1 branch proves the original root lifetime.

### Reproducible frame trace and its limits

`tools/trace_bmb_lifecycle.mjs` invokes the existing `createEffectPlayer`, not alternate geometry math. Current ignored output `tools/data/reconstruction-map/white-prefix-lifecycle-trace.json` contains181 CPU snapshots,37 preview instances, per-frame births/ends, parent matrices at integer birth frames, world matrices/vertices, triangle indices and material requests, plus legacy RNG transitions and all9 source records. The common player is deterministic for these explicit inputs; its first frames contain17/27/37 instances, its last frame180 is empty. **These are current-player observations, not native population expectations.** The source member's F3 skill placement stays outside this local effect clock.

All original birth/death/phase-order/RNG ownership entries are explicitly null; `wholeEffectReconstructed:false`, `completeNativeNodes:0`, `approved:false`. Native reference gaps remain blocking. Native activation fixtures are separate from the legacy frame trace and use independent declared per-emitter seeds. CPU texture fixtures carry dimensions only; no GPU/image comparison was performed. Requests are listed in instance order, not certified original GPU order. The source/runtime/native/plan/reference hashes are retained. The9 zero-range source nodes have unchanged preview instance data after adding the new admission metadata.

### Actual checks and reproduction

- New `tools/memorial/emulate_generator_activation.py` executed original Null/Quad/Particle ActivateGenerator for51 controls:17 nodes across the target and independent `atk_aerialslash_001_green.bmb`, each with3 explicit seeds. No original update/module/NodeTree callbacks were replaced by this test. Receipt: `tools/data/reconstruction-map/generator-activation-native.json`; all51 output records/RNG states match the shared primitive. Native SHA256 `6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77`; APK identity remains pinned by LocatorReference. Null0x1fbbb24/392, Quad0x1febe34/488, Particle0x1fee474/488; receipt records each code hash. No game install, emulator action or recording.
-31 Node tests pass, no skips:7 lifecycle/trace tests plus the existing player, Null-locator and native-Particle-X suites. These reuse13 historical scheduler controls and16 module/uniform controls without rerunning their native oracles. Replay twice is an intentional determinism check. Log: `tools/data/reconstruction-map/lifecycle-tests.log`.
-14 character-pipeline tests,34 combat assertions and the existing shared-source Python test pass. These include Brave's Motion-1 composition/MP/locks, Blade area and Satellite screen/back effects. `npm run build` passes with the existing Vite chunk-size advisory. No new productive browser/GPU/original-pixel check was performed; published recipes/assets and all `src/` code remain unchanged in this checkpoint.

```powershell
$lifecyclePython = 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
$env:PYTHONPATH = (Resolve-Path tools/data/native-locator-emulation/python-deps).Path
# Recreate original controls only after their source/native/input contract changes.
& $lifecyclePython tools/memorial/emulate_generator_activation.py --apk tools/data/memorial-audit/installed-base-v208.apk --source tools/data/shared-skill-review/brave-slash-composed/originals/atk_slash1_white.bmb --source tools/data/shared-skill-review/blade-beam/originals/atk_aerialslash_001_green.bmb --output tools/data/reconstruction-map/generator-activation-native.json
node tools/trace_bmb_lifecycle.mjs --plan tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json --effect atk_slash1_white.bmb --reference tools/data/reconstruction-map/generator-activation-native.json --module-reference tools/data/connected-effect/brave-slash-null-chains.json --module-reference tools/data/connected-effect/brave-slash-null-auxiliary.json --module-reference tools/data/connected-effect/brave-slash-quad-motion.json --module-reference tools/data/native-locator-emulation/particle-module-chains.json --output tools/data/reconstruction-map/white-prefix-lifecycle-trace.json
node --test tools/test_bmb_lifecycle.mjs tools/test_original_effect_player.mjs tools/test_null_locator.mjs tools/test_native_particle_x.mjs
```

### Next blocker: one connected original NodeTree reference, not another visual adjustment

The missing input is an **ordered whole-source lifecycle trace**. Existing isolated native receipts cannot supply it, and a video cannot reveal RNG owners/child phases. Obtain it from a controlled execution of the original NodeTree with fully declared contexts/callback tables, or a narrowly instrumented game execution of this exact source. Prefer the existing offline original-code harness if its caller/context contract can be constructed without silent adapters. No new video/manual repeated skill activation is presently requested.

Required measurement contract:

1. Pin this exact BMB/native identity and map all9 parameter nodes to emitter pointers; retain the exact root/parent/InitContext inputs, capacity and initial four-word state of every emitter. A different Cloud form/source prefix is not interchangeable.
2. Record ordered Initialize, ActivateGenerator, primitive callbacks, module init/update/make, fourth delta-zero lists, NodeTree Update/PostUpdate, explicit float32 deltas, zero/first-update flags and original time origin. Existing addresses/symbols above and the phase reports define the observation points; do not infer order from timestamps alone.
3. For every birth/update/death: node/emitter/instance/parent identities, life/age ticks, generator counters/delays, RNG before/after, inherited selector flags, parent origin/basis/scale/tint and final local/world state. Include all node7 branches and their node8 children, plus node5 after its parent's nominal20-unit life.
4. Continue until actual source removal/all relevant instances are released; impose a declared bounded observation cap and report truncation if it is reached. Do not force the native duration to the preview's180 horizon or equate draw ordinal with simulation age.
5. Acceptance: the common simulator must reproduce that ordered event/state trace numerically under the same inputs, then match packed geometry/material requests at joined ages. Only afterward do matched original frames on a declared camera/background support a visual-fidelity claim.

The productive Motion-1 bridge is preserved. Brave's prefix remains a converted-sheet presentation; Blade's full original graph and Climhazzard's missing capabilities remain unaccepted. No new effect/whole skill/character/universal milestone is awarded. This checkpoint ends at the explicit lifecycle-reference gate rather than filling unknown parent/RNG rules with more defaults.

Changed files in this lifecycle checkpoint: `tools/bmb_lifecycle.mjs`, `tools/bmb_playback_fields.py`, `tools/original_effect_player.mjs`, `tools/preview_original_skill.mjs`, `tools/memorial/emulate_generator_activation.py`, `tools/trace_bmb_lifecycle.mjs`, `tools/test_bmb_lifecycle.mjs`; this map, `docs/asset-pipeline-handbook.md`, `docs/skill-reconstruction-workflow.md`, `docs/renderer-session-handoff.md`, `docs/research/brave-slash-integration.md`. Existing unrelated/uncommitted research work was retained. Raw/generated traces and Native receipts remain ignored.

## Previous integration checkpoint: composed source timelines

**Implemented boundary:** shared character import now compiles the verified ordinary motion-1 unit/default-attack prefix plus skill groups into the existing prepared `presentation` schema. The product's single-target dash and area execution paths use one visual-track scheduler. No BMB simulator, native exporter or new renderer prototype was introduced.

### Three reference skills: product versus strongest relevant experiments

The plan paths below identify evidence-rich A/B variants, not a claim that the latest experiment is visually best under all hosts. Complete synchronized original frames are unavailable for all three whole skills; numerical plan coverage cannot establish pixel fidelity.

| Skill | Published product path after this checkpoint | Existing experimental baseline and original evidence | Proven difference / remaining blocker |
| --- | --- | --- | --- |
| Brave Slash214800 | `tools/characters/cloud.json` -> `import_character.mjs` -> `public/assets/units/cloud/skills.json` -> `BattleScene.executeGenericSkill` / shared visual scheduler. Two converted sheets, exact-form prefix at F3 and pink impact at F6. | `tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json`: two definitions/44 nodes; `brave-slash-composed-preview.md`, `brave-slash-connected-combat.md`; captured command uses upgraded form207000117, whereas product form207000105 has its own prefix. | Former product omitted the prefix and started pink at F4. Source composition now reaches the product. Converted white/pink pixels remain adaptations; native nine-node lifecycle/material completeness is not integrated. |
| Blade Beam214810 | Existing reviewed two-sheet `presentation`, same shared scheduler; clockwise90-degree artwork adaptation and one combined gameplay hit retained. | `tools/data/shared-skill-review/blade-beam/plan-native-null.json`: two definitions/24 nodes; `native-null-parent-chains.md`, `blade-beam-source-geometry.md`. | Experimental original mesh/material/Null rules are not the product sheet renderer. Model-surface emission remains withheld; experiment and published recipe still omit motion-1 prefix composition. No unsupported plan was promoted. |
| Climhazzard214820 | Existing explicit legacy body/damage path; no published reconstructed VFX. | `tools/data/shared-skill-review/climhazzard/plan-native-alpha.json`: four definitions/56 nodes/five members; `native-scalar-alpha-preview.md`, `white-plane-viewport-ui.md`. | Experimental native-selected alpha/white-plane/host rules do not constitute complete output. Power Geyser controls, untextured geometry and complete composition remain unresolved/unintegrated. Legacy was not presented as complete. |

### Reused rule, implementation and admission

- Native/source evidence: motion1 appends skill groups after the **latest unit-group start**, not after the effect's duration. Product unit207000105 contributes `2:1000290:1`; skill contributes `4:5008050:1:1:0`; composition is `2:1000290:1&6:5008050:1:1:0`. Prefix group member delay1 yields actual sheet start F3. Pink member delay0 yields F6. The unit prefix is not copied from captured form207000117.
- `tools/lib/character-pipeline.mjs`: `composeEffectFrames` and `compileSourcePresentation` reuse group/resource resolution. Recipe bindings select reviewed effects by exact effectId/masterFile; timings, anchors and layers come from source. Unsupported branches, active flags, transforms, missing dependencies/bindings and invalid timing block publication. Admitted member tuple tail is explicitly `99999999:1:2:2:0:0`; this is a bounded profile, not decoded universal sentinel behavior.
- `tools/resolve_composed_skill.mjs` checks historical research compositions against the same shared rule. `tools/import_character.mjs` strips offline `sourcePresentation`, validates/loads all compiled sheet dependencies and records composition provenance in `character.json`. `tools/lib/skill-batch.mjs` includes compiled members without promoting legacy commands.
- `src/scenes/BattleScene.ts`: melee and area use `schedulePresentationEffects`; single-target anchors include parent-container world transforms. Body playback waits for the last prepared track before returning. Gameplay remains one independently reviewed F6 hit,18 MP. Duration96 frames is the sheet budget, not a claim about original skill duration. Terminal/dead-target guards remain active; returning after victory preserves victory poses.
- Shared added recipe `tools/effects/attack_slash_white.json` binds effect1000260 / `atk_slash1_white.bmb`, converted `atk_slash1_white.efkefc`. Published sheet/source/dependency identities are in `public/assets/effects/attack_slash_white/manifest.json`; source SHA256 `f70dbe06f3a849e8720902eff3c4e53d90ff6018f795e098ac09f7a4ad6eea64`, sheet SHA256 `4ca24d2fa1f0329d16ecb95f8c560d75c9e69936ddc0e71f8f0ea9bb518b0aa4`. This uses the existing converted bake profile, not the experimental original simulator.

### Validation and limits

- Executed `node --test tools/test_character_pipeline.mjs tools/test_combat_regressions.mjs`:14 pipeline tests and34 combat assertions pass, zero skips. Fixture mutation moves the unit start from2 to9 and compiled members from3/6 to10/13 without renderer changes; captured command composition, malformed inputs, missing binding, unsupported branch/flag/motion, world anchors, target/terminal guards, full visual duration and existing area/screen paths are covered.
- Executed Cloud publication with local ffbetool/Pillow:12 body animations validated; new prefix registered. Existing Blade recipe files were normalized to LF to match their already-recorded recipe hashes exactly; no Blade artwork was rebaked or adjusted. Shared batch inspection reports3 ready,6 blocked,9 missing source files,7 effect recipes; ready is not fidelity acceptance.
- Executed `npm run build`: passes; existing Vite large-chunk advisory remains. New sheet contact review is at ignored `tools/data/reconstruction-map/attack-slash-white-review.png`.
- Actual product WebGL browser test: all four cases PASS, receipt `tools/data/reconstruction-map/source-presentation-product.json`, proof `attack_slash_white-product.png` / `brave_slash-product.png` in the same ignored directory. Legacy starts pink at74.3ms and releases at1398.3ms with that sprite still active; composed starts white at50.5ms and pink at101.5ms, both at world `(197.999992,565.999984)`, releases at1960ms with no remaining effects. Both spend18MP and apply one damage event. Blade/Satellite controls spend30/45MP, one damage event each, all mapped sheets loaded and no effects at completion. These are observed browser-clock times; expected timers are50/100ms, presentation1600ms plus360ms return. They are not native frame-alignment measurements.
- Reproduction: run the normal Vite server and open `/tools/test-source-presentation.html`, then **Run integration check**. It imports the actual `src/main.ts`, Boot/Preload/BattleScene and published catalogs. A temporary legacy fixture compares the old one-effect path; other cases use the actual catalog entries. It does not implement another renderer. MP, reviewed damage event, visual-member starts, world anchor, real textures/blending, completion/cleanup and Blade/Satellite controls are observed. Proof images and JSON can be downloaded from that page.
- No new original recording or native test was requested/run. No complete native-pixel effect, complete original skill, automatic character skill list or independent new skill has been accepted by this change. The30-component tally remains4 integrated/1 understood/25 partial: P04/P05/P10/P12/P26/P28 gained a bounded common integration, not full-contract completion.

**Next bounded blocker:** replace the converted-sheet approximation for one source member with a complete admitted original-data output. Reuse the existing nine-node prefix graph and native module/parent evidence; first connect source-selected lifecycle, RNG ownership and parent traversal (P09/P13-P17) with an explicit trace contract. Only then admit geometry/material output (P18-P22) and feed it through this now-working scheduler. Do not continue new isolated alpha/scale or native pixel-export loops by default. The strict whole-source contract in M1 and M2 remains unfulfilled; this checkpoint closes the small publication/execution composition bridge, not those milestones as a whole.

Changed-file register for this bounded checkpoint (other pre-existing research changes are unrelated):

- Compiler/publication: `tools/lib/character-pipeline.mjs`, `tools/import_character.mjs`, `tools/lib/skill-batch.mjs`, `tools/resolve_composed_skill.mjs`.
- Runtime: `src/scenes/BattleScene.ts`, `src/types/skills.ts` (contract comment), `src/main.ts` (export the existing game instance for the actual-scene test).
- Recipes/prepared assets: `tools/characters/cloud.json`, new `tools/effects/attack_slash_white.json`, new `public/assets/effects/attack_slash_white/impact.png` and `manifest.json`, `public/assets/units/cloud/skills.json`, `public/assets/units/cloud/character.json`, `public/assets/content.json`. Blade recipe bytes were restored to existing LF hash identity only; no semantic recipe change.
- Verification: `tools/test_character_pipeline.mjs`, `tools/test_combat_regressions.mjs`, new `tools/test-source-presentation.html`.
- Documentation: this map, `docs/asset-pipeline-handbook.md`, `docs/character-import-workflow.md`, `docs/skill-reconstruction-workflow.md`, `docs/research/brave-slash-integration.md`, `docs/renderer-session-handoff.md`.

## 1. Scope, counting and status rules

The map identifies **30 core components**, each with a separate input/output responsibility, and **three explicitly excluded extensions/alternative routes**. The core includes source discovery, compilation, common simulation, rendering, game integration and the reference/acceptance infrastructure needed to verify fidelity. Original damage formulas and FFBE chaining are outside this visual reconstruction contract. Reviewed roguelike costs, operations and reward balance remain separate product data.

| Status | Exact meaning used here |
| --- | --- |
| INTEGRIERT | A reusable component demonstrably supplies its declared I/O boundary in the existing shared import/playback path for the stated input profile. Downstream skill completeness is not implied. An isolated native test is insufficient. |
| VERSTANDEN | Original behavior for the precisely bounded component contract is supported by original-code/reference evidence, but the common implementation does not consume it yet. |
| TEILWEISE | Substantial rules or implementation exist, but knowledge, implementation, integration or validation is incomplete for the component contract. |
| UNBEKANNT | Evidence is insufficient to specify the component's original behavior. Available filenames or plausible labels do not count as understanding. |

**Core tally: 5 INTEGRIERT, 0 VERSTANDEN, 25 TEILWEISE, 0 UNBEKANNT.** This is a count of responsibility boundaries, **not** a completion percentage, estimated effort or assertion that no original rules remain unknown. Unknown sub-capabilities are explicitly listed inside TEILWEISE components. The audio extension is now TEILWEISE for structural metadata; playback remains unknown. Counting every partially known component as wholly unknown would discard evidence; counting its verified helper as integrated would overstate progress.

The integrated profiles are intentionally explicit: reviewed unambiguous CPK PNG/M3R staging, BR3M34/35 single-material mesh decoding, the admitted body-atlas/track convention, and the existing prepared-sheet publication contract. Other formats and new multi-pass output are not silently included.

### Inventory method and present evidence boundary

- Indexed all **82 pre-existing files** in `docs/research/` (80 Markdown reports and two JSON reports). Their findings, sections, file identities and referenced paths were collected; the complete document register is below.
- Indexed **57 `test_*.py` / `test_*.mjs` files** under `tools/` excluding ignored data/binaries; examined native reference contracts, skip conditions and reported historical executions. This counts files, not passing tests; the combat regression script uses its own assertion runner rather than supplying a native-reference pass count.
- Indexed **44 `plan*.json` snapshots** under `tools/data/shared-skill-review/`. They describe **three distinct skill IDs**, not44 skills. Counts below distinguish the old uncomposed Brave plan from the composed plan.
- Read implementation boundaries in the importer/resolver, CPK staging/resource probe, BMB/M3R/curve parsers, preview compiler/player, connected native-code exporter, live GPU exporter, game manifests, UnitActor and BattleScene. No suite or render was rerun merely to reproduce an existing result.
- Ignored analysis indexes: `tools/data/reconstruction-map/document-inventory.json`, `test-inventory.json`, `plan-inventory.json`. These contain source inventories, not new renderer output. Raw assets/APKs/research captures remain ignored. This central map and reproduction contracts are durable.

## 2. Complete processing chain and branch boundaries

```text
P01 Source identity and provenance
  -> P02 Exact character/form and available-skill ownership
  -> P03 Command/process/target visual semantics
  -> P04 Actor-attack + skill timeline composition
  -> P05 Group members, variants, layers and file transforms
  -> P06 Checked asset/container/dependency resolution
       |-> P07 BMB graph and parameter decoding -> P09 compatibility/dispatch
       |-> P08 external mesh/texture decoding
       `-> P11 body atlas/CGG/CGS assembly
  -> P10 prepared semantic plan and capability admission

P12 Explicit clocks/deltas
  -> [P09 + P13 phases/work contexts + P14 lifecycle/birth traversal
       + P15 RNG primitive + P16 parameter evaluation + P17 inheritance]
       form ONE interacting simulation subsystem, not independent final stages
  -> P18 source-selected geometry / packed vertices
  -> P19 shader selection + P20 UV/samplers + P21 color/alpha
  -> P22 ordered draw/material passes

P04 + P11 + P12 -> P26 actor/action choreography
P05 + P26 -> P23 world placement/anchors
P24 camera/projection + P23 -> P25 scene/viewport/foreground compositor
P22 + P25 -> complete visual output
  -> P27 reviewed prepared-asset publication
  -> P28 shared game catalog/action execution and cleanup

P29 independent original references observe these boundaries
P30 acceptance/coverage/cache gates validate each boundary and full output

X01 sound, X02 native pixel baking, X03 run skill/reward progression
are explicitly separate extensions/alternative branches, not hidden fallbacks.
```

The arrows express data dependencies. They do not imply that the current code already connects every arrow. Parent initialization can affect dispatch, RNG consumption affects later births, and phases update lifetime/parent state: P09/P13/P14/P15/P16/P17 must be integrated as a coupled subsystem. A purely linear list of isolated functions would misrepresent this dependency cycle.

Native ARM64 routines and observations are an **oracle/reference branch**. `export_connected_effect.py` executes an admitted constant-parent subset with explicit adapters. It is not the browser scheduler or a full NodeTree. Native pixel export X02 bypasses reconstruction for sampled pixels; it does not close missing P13-P18 rules in the common player.

## 3. Core status matrix

Dependencies refer to stable IDs below. `R` is an evidence bundle in section5. Dependencies inside the simulation subsystem are intentionally coupled.

| ID | Responsibility | Status | Main prerequisites | Evidence |
| --- | --- | --- | --- | --- |
| P01 | Versioned source identity/provenance | TEILWEISE | none | R01, R02 |
| P02 | Exact form and complete available-skill ownership | TEILWEISE | P01 | R01, R03 |
| P03 | Command/process/target semantics | TEILWEISE | P02 | R03, R04 |
| P04 | Actor/default-attack and skill composition | TEILWEISE | P03, P11 | R04 |
| P05 | Group/member interpretation and variants | TEILWEISE | P03, P04 | R04, R05 |
| P06 | Checked container extraction and dependency staging | INTEGRIERT | P01, P05 | R02 |
| P07 | BMB graph/parameter decoding | TEILWEISE | P06 | R06 |
| P08 | External mesh/texture data decoding | INTEGRIERT | P06 | R07 |
| P09 | Compatibility flags and source-selected dispatch | TEILWEISE | P07, P13, P17 | R08, R09 |
| P10 | Prepared semantic plan / admission | TEILWEISE | P01-P09, P11 | R05, R16 |
| P11 | Body sprite assembly, pivots and track delays | INTEGRIERT | P01, asset sources | R01, R10 |
| P12 | Clock domains and original update deltas | TEILWEISE | P03, P11 | R11, R17 |
| P13 | Module phases, records and work contexts | TEILWEISE | P09, P12, P14, P17 | R08, R09 |
| P14 | Instance scheduling, lifetime, hierarchy and RNG ownership | TEILWEISE | P09, P12, P13, P15, P17 | R08, R11 |
| P15 | Four-word RNG step and measured uniform sampler | INTEGRIERT | explicit four-word state | R11, R12 |
| P16 | Curves, motion and parameter evaluation | TEILWEISE | P07, P12-P15 | R06, R12, R13 |
| P17 | Parent state, inheritance and locators | TEILWEISE | P09, P13, P14, P16 | R09, R14 |
| P18 | Primitive geometry, facing and surface emission | TEILWEISE | P08, P13-P17 | R09, R12, R14 |
| P19 | Shader/material selection and uniforms | TEILWEISE | P07-P09, P18 | R15 |
| P20 | UV, texture animation and sampling | TEILWEISE | P08, P12, P16, P19 | R06, R15, R18 |
| P21 | Color/alpha and inherited modulation | TEILWEISE | P13, P16-P19 | R13-R15 |
| P22 | Draw ordering, blending, depth and material passes | TEILWEISE | P18-P21, P25 host state | R15, R17 |
| P23 | Roots, rectangles, anchors and coordinate conversion | TEILWEISE | P05, P26 | R16, R17 |
| P24 | Camera/projection and camera event semantics | TEILWEISE | P12, P26 | R14, R16 |
| P25 | Scene composition, framebuffer, clip and foreground | TEILWEISE | P22-P24 | R16, R17 |
| P26 | Actor motion/action choreography and body-VFX synchronization | TEILWEISE | P03, P04, P11, P12 | R04, R10, R16 |
| P27 | Reviewed prepared-asset publication / loading contract | INTEGRIERT | validated prepared inputs | R01, R19 |
| P28 | Shared game skill catalog/execution and action cleanup | TEILWEISE | P10, P26, P27 | R10, R19, R20 |
| P29 | Original reference execution/capture and identity joins | TEILWEISE | P01, selected scenario | R08-R17, R21 |
| P30 | Acceptance benchmark, capability accounting and result reuse | TEILWEISE | P10, P29 and all tested boundaries | R20, R22 |

## 4. Component records: responsibilities, evidence, integration and acceptance

Each record answers the ten required questions. Acceptance tests below are **required future gates**, unless an existing result is explicitly identified; they are not newly executed tests.

### P01 - Versioned source identity/provenance - TEILWEISE

1. **Contract:** identify database, region/build, unit form, effect bytes, transitive resources, tooling and native reference as one reproducible source scenario.
2. **Original:** loaded BMB initialization/relocation changes bytes; equal filenames or skill names do not prove identical data/builds.
3. **Native evidence:** pinned v208 master snapshot matches six effect/attack timeline strings for the three Cloud abilities; checked loaded static fields match the pink source, not every relocated byte.
4. **Implemented:** source/resource/recipe hashes and exact-native fingerprint guards in multiple tools.
5. **Integration:** partial; no single mandatory cross-path source/scenario manifest. GL backup, community native build and metadata must not be implicitly equated.
6. **Missing:** unified scenario/source compatibility decision and transitive implementation/reference identity.
7. **Evidence:** R01/R02; `tools/lib/character-pipeline.mjs`, `tools/memorial/prepare_diagnostic.py`; `test_particle_trace.py`, `test_pipeline_context.py`.
8. **Dependencies/consumers:** no upstream stage; all other components consume its identities.
9. **Next:** declare one exact version/form/reference bundle for the first vertical slice using existing receipts.
10. **Acceptance:** every downstream artifact resolves to that bundle; stale/ambiguous/foreign-build inputs fail without substitution.

### P02 - Character/form and complete skill ownership - TEILWEISE

Current skill-expansion delta (2026-10-28): Exact Aerith Seal Evil ownership added from existing catalog; fifth Source command. Whole-catalog publication remains reviewed, not automatic approval. See the latest entry above; full component status is unchanged.

1. **Contract:** enumerate the skills available to an exact form under explicit acquisition/unlock conditions, including indirect grants where required.
2. **Original:** unit-to-series relation is data; a series catalog may span rarity/form/level conditions. Painted body effects do not establish skill ownership.
3. **Native evidence:** exact PlayerUnit master and loaded Cloud command identity observed for a bounded execution; no general complete ownership dump.
4. **Implemented:** `inspectCharacter` follows `unit.unitSeries` and level acquisition records; retains acquisition data/passives/magic.
5. **Integration:** catalog inspection is used by publication, but recipes manually select commands; only three characters are configured in the current party.
6. **Missing:** equipment, enhancement, LB, quest/unlock/cooldown/child-command closure and complete region/form coverage.
7. **Evidence:** R01/R03; `tools/import_character.mjs`, `tools/audit_cloud_versions.mjs`, `tools/test_character_pipeline.mjs`.
8. **Dependencies/consumers:** P01 -> P02 -> P03/P04/P28; X03 uses eligibility later.
9. **Next:** separate acquisition categories and distinguish unresolved ownership from unsupported rendering in the catalog contract.
10. **Acceptance:** compare every owned record against a versioned exact-form reference catalog; all categories and restrictions accounted for, no silent omissions.

### P03 - Command/process/target semantics - TEILWEISE

Current self-event delta (2026-10-28): see the newest six-command entry. Source self-buff/event/host support and checked Null init inputs are integrated within explicit profiles; universal scope and unsupported candidate gates remain unchanged.

Current binary-control delta (2026-10-28): see the latest entry. Verified13-slot decoding and original/gameplay provenance separation are integrated into intake/preparation; complete authoring-free profiles and Meteor remain blocked. Full component status is unchanged.

Current skill-expansion delta (2026-10-28): Reviewed non-damaging enemy support events/status rules now execute on the Source clock. Original process24/6/88 retained; stat/immunity formulas and native status-application time remain unclaimed. See the latest entry above; full component status is unchanged.

Current Cross Slash delta: see the 2026-10-28 playable-content header. Reviewed
weighted damage timelines, Source-only admission, metadata-only publication and
paged commands are product-integrated subsets; backdrop coverage is an explicit
composition adaptation. Full original-engine component status is unchanged.

1. **Contract:** resolve command kind, motion, process groups, targets and conditional/parallel visual actions without importing FFBE damage formulas.
2. **Original:** process/hit-profile indirection exists; `@` fields can be parallel process-indexed data. Empty effectData is not proof of audio-only behavior.
3. **Native evidence:**33 hit/173 process profiles and bounded simplified-effect control flow documented; actual command/effect-input joins are distinct evidence.
4. **Implemented:** raw command fields, process/hit provenance and restricted runtime scopes/motions; later `@` branches conservatively labeled conditional.
5. **Integration:** partial; the label blocks imports but does not decode process execution; no general command interpreter.
6. **Missing:** parallel/conditional process rules, special commands, alternate asset decisions, motion codes beyond admitted paths and non-file group execution.
7. **Evidence:** R03/R04; `resolveEffects`, `tools/compose_skill_effects.py`, `src/types/skills.ts`, `tools/test_compose_skill_effects.py`.
8. **Dependencies/consumers:** P02 -> P03 -> P04/P05/P12/P26/P28.
9. **Next:** preserve process-index association and classify each action as decoded, unresolved or intentionally game-adapted.
10. **Acceptance:** exact ordered command/action graph matches a calibrated native reference for each admitted branch; unknown process actions cannot disappear.

### P04 - Default-attack/skill composition - TEILWEISE

1. **Contract:** construct the full actor/skill visual schedule, including default attack effects inserted by the command path.
2. **Original:** ordinary motion1 prepends unit attack effects and shifts skill entries by the latest unit effect start, not by particle duration.
3. **Native evidence:** observed upgraded Cloud command `2:1000520:1&6:5008050:1:1:0`; loaded ability alone contains only `4:5008050:1:1:0`.
4. **Implemented:** `compose_effects`, shared `composeEffectFrames` / `compileSourcePresentation`, composed-source resolver and Brave's composed research plan; omitted anchor in ordinary three-field entries resolves to native target mode1.
5. **Integration:** ordinary motion-1 composition now reaches character publication and the actual product scheduler for Brave through reviewed converted-sheet bindings. Other branches and complete original effect pixels are not admitted by this profile.
6. **Missing:** other motion branches, branch composition and migration of Blade/Climhazzard research inputs; those two also have motionType1 in current source.
7. **Evidence:** R04; `tools/compose_skill_effects.py`, `tools/resolve_composed_skill.mjs`, `tools/test_compose_skill_effects.py`.
8. **Dependencies/consumers:** P03/P11 -> P04 -> P05/P10/P26.
9. **Next:** preserve the published exact-form composition/provenance; admit further source families only when complete member behavior is supported. Do not infer branch support from this ordinary motion-1 path.
10. **Acceptance:** full scheduled group list/start/anchor/layer matches original command input for the same exact form; shared skill identity does not permit copying another form's attack prefix.

### P05 - Group members, variants and file transforms - TEILWEISE

Current self-event delta (2026-10-28): see the newest six-command entry. Source self-buff/event/host support and checked Null init inputs are integrated within explicit profiles; universal scope and unsupported candidate gates remain unchanged.

Current skill-expansion delta (2026-10-28): Resolved sound-only groups are preserved separately from visual members. Unknown non-file groups reject preparation; no missing visual is silently treated as audio. See the latest entry above; full component status is unchanged.

1. **Contract:** resolve all member tuples, alternate resources, delays, source scale/orientation/placement and front/back intent.
2. **Original:** group indirection is required; observed member tuples have eight fields. Some fields can identify reverse assets; placement is rectangle/mode-dependent.
3. **Native evidence:** bounded static/live placement and renderer-input traces establish selected axis/offset/root rules; not all sentinels/variant conditions.
4. **Implemented:** resolver retains member fields, file transforms and scale; preview members carry interpreted anchors/rotation and raw provenance.
5. **Integration:** partial; narrowed recipes and explicit host bindings handle selected cases. The product motion-1 compiler derives member delays/anchors/layers and rejects tuples outside its admitted profile; it does not decode every original member interpretation.
6. **Missing:** general alternate-selection/sentinel semantics, unresolved enums/extra channels and exact branch association.
7. **Evidence:** R04/R05; `tools/lib/character-pipeline.mjs`, `tools/prepare_original_preview.py`, `tools/test_effect_host_context.mjs`.
8. **Dependencies/consumers:** P03/P04 -> P05 -> P06/P10/P23/P26.
9. **Next:** give each member field an evidence-backed semantic or an explicit blocking requirement in the prepared contract.
10. **Acceptance:** all members accounted for exactly once, with native-matching variants/placement under side/anchor/offset controls; malformed or unknown active fields reject.

### P06 - Checked extraction and dependency staging - INTEGRIERT

Current skill-expansion delta (2026-10-28): Duplicate original archive members are accepted only after hashing every payload and confirming identical bytes; full provenance retained. Differing versions still reject (test_source_import_staging.py). See the latest entry above; full component status is unchanged.

Current Cross Slash delta: see the 2026-10-28 playable-content header. Reviewed
weighted damage timelines, Source-only admission, metadata-only publication and
paged commands are product-integrated subsets; backdrop coverage is an explicit
composition adaptation. Full original-engine component status is unchanged.

Current delta: batch exact-owned-skill selection and cached-payload hash checks
reuse checked staging; blockers remain explicit and publication is not automatic.

1. **Contract:** given reviewed member identities and a local index, extract actual original BMB and typed PNG/M3R candidates with preserved archive identities and hashes.
2. **Original:** battleEffect and effectResource are distinct CPK namespaces; original BMB is not an EFKE payload.
3. **Native evidence:** no native execution is required to prove byte extraction; runtime identity comparisons independently exist for selected original data.
4. **Implemented:** `stage_original_skill.py` uses checked archive entries; `inspect_bmb_resources.py` follows typed resource tables and preserves candidate provenance.
5. **Integration:** yes, in common original-source staging used by the three inspected skills, within the readable reviewed-index/PNG/M3R profile.
6. **Missing/outside profile:** other resource kinds/archives/encodings; ambiguous candidate selection must remain visible to P10, not be flattened by filename.
7. **Evidence:** R02; staging/resource tools and CPK reader under `rawdata/ffbe_asset_dump/tools/cpk.py`; historical extracted Climhazzard dependency receipts.
8. **Dependencies/consumers:** P01/P05 -> P06 -> P07/P08/P10.
9. **Next:** retain current extractor; require unique resolved dependency identities at the compiler boundary.
10. **Acceptance:** staged bytes/counts/hashes agree with the indexed decompressed members; missing, changed and ambiguous dependencies cannot yield an approved plan.

### P07 - BMB structural/parameter parser - TEILWEISE

Current self-event delta (2026-10-28): see the newest six-command entry. Source self-buff/event/host support and checked Null init inputs are integrated within explicit profiles; universal scope and unsupported candidate gates remain unchanged.

Current binary-control delta (2026-10-28): see the latest entry. Verified13-slot decoding and original/gameplay provenance separation are integrated into intake/preparation; complete authoring-free profiles and Meteor remain blocked. Full component status is unchanged.

Current skill-expansion delta (2026-10-28): Meteor original and all12 dependencies exist; absent authoring supplement exposes incomplete binary influence/compatibility/appearance/emission selectors. No default-filled preparation. See the latest entry above; full component status is unchanged.

Current delta: original header RootLife at0x50 is now extracted separately from
node0.lifeParameter and retained by new prepared plans. Run G distinguishes the
host-root joint from the8 emitter parameters. This does not silently switch the
published legacy graph to a new lifetime/RNG policy.

1. **Contract:** decode a typed original graph and every active parameter required by admitted behavior; preserve unknown source data.
2. **Original:** verified IBMB version `01010301`, layouts0/2/3/6, preorder hierarchy, typed resource names, selected scalar/vector/static/material controls.
3. **Native evidence:** source parameter/dispatch and loaded-value comparisons support selected offsets; they do not establish all fields.
4. **Implemented:** `inspect_bmb.py`, `bmb_parameters.py`, `bmb_channels.py`, `bmb_materials.py`, `bmb_playback_fields.py` and selected extensions. Playback preparation now preserves source constant-generation profile, enabled/mode fields and raw control bytes for Null/Quad/Particle; see current lifecycle checkpoint.
5. **Integration:** used by preparation and native references; incomplete controls still depend on BMSLN supplements or remain unknown.
6. **Missing:** other node/version layouts, active channels/flags and binary-only control coverage; dormant authoring curves must not become active.
7. **Evidence:** R06; `test_bmb_structure.py`, `test_bmb_parameters.py`, `test_bmb_channels.py`, `test_bmb_materials.py`, shared-source tests.
8. **Dependencies/consumers:** P06 -> P07 -> P09/P10/P13/P16/P19.
9. **Next:** identify the exact undecoded active fields required by the selected complete-source path, rather than globally assuming defaults.
10. **Acceptance:** exact graph/resource/key comparisons plus independent active-field coverage for admitted profiles; mutations/unknown versions/channels fail explicitly.

### P08 - External mesh/texture decoding - INTEGRIERT

1. **Contract:** preserve decoded PNG pixels and admitted M3R positions, indices, normals, UVs, RGBA and material texture-slot metadata in prepared data.
2. **Original:** BR3M34/35 single-material/single-submesh36-byte UV vertices and uint16 indices are verified; other layouts are separate profiles.
3. **Native evidence:** pinned native Model material accessors establish texture-slot presence and HasUV/stride behavior; shader meaning belongs to P19/P21.
4. **Implemented:** `inspect_m3r.py` validates boundaries/indices and retains original RGBA; preview compiler supplies decoded meshes and hashed textures.
5. **Integration:** yes, through shared source preparation and player geometry for the admitted static formats, now also in experimental game scenes. Empty name tables require two absent texture pointers;100-vertex/128-triangle counterpart checks extend the admitted profile without substituting textures.
6. **Missing/outside profile:** other mesh/material layouts, trailing semantics and resource formats; no implicit no-UV/multi-submesh support.
7. **Evidence:** R07/R15; `tools/test_m3r.py`, `tools/test_native_material_selection.py`, `bmb-materials-models.md`.
8. **Dependencies/consumers:** P06 -> P08 -> P10/P18-P21.
9. **Next:** reuse current decoded data; block unsupported layouts instead of substituting converted geometry.
10. **Acceptance:** exact source vertex/index/color payload agreement and correct explicit UV conversion, with malformed/unsupported layout rejection before rendering.

### P09 - Compatibility and source-selected dispatch - TEILWEISE

Current bounded transfer delta: see the 2026-10-28 header above. Static
Default/OneX/Basic is integrated through the shared player under explicit gates;
123 isolated-reference states and actual BattleScene control are checked. This
does not close the component's full original-engine contract.

1. **Contract:** select the actual variant/module functions from node type, flags, inherited state and resources; no filename heuristics.
2. **Original:** original assigners produce ordered module arrays/work sizes; Null can select a fourth delta-zero list based on inherited state.
3. **Native evidence:**13 Particle source dispatches, four Quad and four Null arrays have bounded reference coverage; source X consumers are resolved.
4. **Implemented:** native assignment/profile tools and metadata gates; explicit auxiliary flag required for Null reference execution.
5. **Integration:** fixture/source metadata informs preview subsets; complete runtime derivation and common graph dispatch are absent.
6. **Missing:** inherited selector derivation, fourth-list context/timing, broader Model/other node dispatch and runtime overrides.
7. **Evidence:** R08/R09; `emulate_particle_assignment.py`, `emulate_quad_assignment.py`, `emulate_null_assignment.py`, `native_particle_dispatch.py` and their tests.
8. **Dependencies/consumers:** P07/P13/P17 coupled -> P09 -> P13/P16-P19.
9. **Next:** specify the selector inputs for all nodes of the chosen source and connect already-known assignments to its phase executor.
10. **Acceptance:** exact selected identities/counts/order match original assignment for every node; no unknown selector is treated as an empty/no-op callback.

### P10 - Prepared semantic plan and capability admission - TEILWEISE

Current self-event delta (2026-10-28): see the newest six-command entry. Source self-buff/event/host support and checked Null init inputs are integrated within explicit profiles; universal scope and unsupported candidate gates remain unchanged.

Current binary-control delta (2026-10-28): see the latest entry. Verified13-slot decoding and original/gameplay provenance separation are integrated into intake/preparation; complete authoring-free profiles and Meteor remain blocked. Full component status is unchanged.

Current skill-expansion delta (2026-10-28): Reviewed support tracks have bounded frame/status validation and Source-only admission; mixed damage/support tracks remain explicitly unsupported. See the latest entry above; full component status is unchanged.

Current Cross Slash delta: see the 2026-10-28 playable-content header. Reviewed
weighted damage timelines, Source-only admission, metadata-only publication and
paged commands are product-integrated subsets; backdrop coverage is an explicit
composition adaptation. Full original-engine component status is unchanged.

Current bounded transfer delta: see the 2026-10-28 header above. Static
Default/OneX/Basic is integrated through the shared player under explicit gates;
123 isolated-reference states and actual BattleScene control are checked. This
does not close the component's full original-engine contract.

1. **Contract:** compile one lossless-in-scope executable visual plan with explicit clocks, branches, sources, host inputs and support requirements.
2. **Original:** raw fields/active branches and native dispatch jointly determine behavior; asset availability is not execution support.
3. **Native evidence:** individual master/dispatch/host joins exist, but no original proof that the current plan is a complete general command representation.
4. **Implemented:**44 historical plan snapshots with source hashes, members, meshes and flags; recipe/publish validation; incomplete-source diagnostics; strict optional offline `sourcePresentation` compiler for ordinary motion-1 converted-sheet bindings.
5. **Integration:** source-derived members/times/anchors/layers now compile into runtime presentations and publication dependencies. Complete original graph semantics remain fragmented across research plans/connected export and are not admitted as faithful skills.
6. **Missing:** a canonical admitted profile and whole-skill completeness manifest; uniform blockers; preservation/interpretation of non-file groups.
7. **Evidence:** R05/R16/R22; `prepare_original_preview.py`, `resolve_composed_skill.mjs`, `src/types/skills.ts`, `src/types/effects.ts`.
8. **Dependencies/consumers:** P01-P09/P11 -> P10 -> simulation, P27/P28/P30.
9. **Next:** extend the bounded composition contract to one complete original-data member, enumerating every active node/requirement and reference; keep converted output explicitly labeled.
10. **Acceptance:** compiling the first skill enumerates every source-required member/node and blocker; no fallback/withheld active node can pass full-fidelity admission.

### P11 - Body assembly, pivot and source track time - INTEGRIERT

1. **Contract:** assemble exact-form CGG/CGS body frames, retain per-track source origin and per-frame delays, load standard sheets and state tracks.
2. **Original:** CGS references assembled poses in order; the virtual origin is1000/1000, and crop-relative pivots can lie outside0..1.
3. **Native evidence:** this path primarily relies on raw track/assembler/output checks, not native BMB simulation tests.
4. **Implemented:** ffbetool assembly, `export_unit.py`, `validate_character.py`, manifests and UnitActor track registration/state transitions.
5. **Integration:** yes for the exact admitted atlas/naming convention and current characters; dying<=25%, readiness and win_before->win have recorded game checks.
6. **Missing/outside profile:** multi-page/alternate/OD/ef source-family selection; recoil remains a heuristic; skill motion assignment belongs to P26.
7. **Evidence:** R01/R10; `test_character_pipeline.mjs`, `test_combat_regressions.mjs`, character-animation audit and exported-sheet validation.
8. **Dependencies/consumers:** source identity/assets -> P11 -> P04/P12/P26/P27.
9. **Next:** preserve this working contract; surface alternate track families instead of assigning atk1/atk2 by name alone.
10. **Acceptance:** exact discovered/exported track agreement, validated dimensions/delays/pivots and stable transitions for each admitted form, without guessed recentering.

### P12 - Clock domains and deltas - TEILWEISE

Connected delta:21 declared unit steps in run G match the shared clock's phases,
root ages, return values and remaining deltas. Unmodified host deltas are stored
separately; ordinary game speed and actor timing are not certified by this test.

Current delta: `NativePhaseClock` is shared with the product's admitted fixed-step
program;29 original controls/891 callbacks establish split/zero/auxiliary/root
phase behavior. Complete source initialization, seek and gameplay pause semantics
remain open. The earlier inventory below does not describe this new bounded path.

1. **Contract:** define command origin, body durations, source simulation units, normalized age, phase deltas, rendered frames and gameplay pauses explicitly.
2. **Original:** constant Particle scheduling truncates float32 deltas into10000 ticks/unit; wrapper fixed-rate and speed multiplier affect native updates.
3. **Native evidence:** partitioned-update/delay/lifetime references and sampled native deltas exist; draw ordinal is not native source age.
4. **Implemented:** body milliseconds,60Hz source-marker conversion, normalized curve age, offline explicit deltas and recorded wrapper states.
5. **Integration:** product composed melee/area share attack-pose-origin60Hz track scheduling and wait for visual completion. No single clock contract across original choreography, browser's pure-frame evaluator, phase references and native GPU readback.
6. **Missing:** common phase clock, partition/seek semantics, exact actor/VFX pause behavior and proven native capture stepping.
7. **Evidence:** R11/R17; scheduler/phase tests, `native-pipeline-context-observer.md`, `live_effect_export.js` revision5.
8. **Dependencies/consumers:** P03/P11 -> P12 -> P13-P26/P29.
9. **Next:** define scenario time in native units and explicit ordered deltas; keep draw/sample indices separately labeled.
10. **Acceptance:** event/lifetime ages agree with native deltas across split updates, zero delta and seek; captures aligned by actual age rather than frame-label coincidence.

### P13 - Phase executor, records and contexts - TEILWEISE

Current2026-10-28: see the newest connected Particle packet entry. Prepared parent/Particle traversal and all five drawable branch packets now reach the shared product bridge; exact writer comparisons, inherited precision residuals and live-GPU-context gaps remain separate. Full component contract stays TEILWEISE.

Current bounded integration: see the newest Quad-packet entry. Four complete conditional branch outputs now run through the common player; native instruction output/live-state/product-buffer evidence are separate. Full native GPU context and whole-effect support remain unaccepted.

Current module delta: source7 retained-record velocity modules run180 times, separately from joint age freezing. Common retained pass and vector state helpers reproduce the expanded G record sequence; actual module dispatch/retained allocator range remain supplied. Native Null PostUpdate loop evidence and commands are in the current node matrix entry.

Current connected delta: the measured source7/8 dispatch sequence matches1734 selected events. Module dispatch remains a reference input; numeric scalar records are checked, other module outputs remain incomplete. See the current connected-scalar entry.

Current evidence delta: runs F/G contain original connected Initialize/birth/
Update/Post/make module calls and RNG owners, with ordered entry/return pairs.
All21 G root steps match NativePhaseClock; no sequence/return/hook errors were
found. Full module-record outputs/geometry still need joining. Existing isolated
fixtures remain independent and are not spliced into the live stream.

Current delta: original table-wide phase order now drives the bounded Particle
emitter synchronously in the product. Particle Update/callback/Post including
newborn catch-up is connected; mixed source graph allocation, fourth Null array
and actual parent selector/context remain unintegrated.

1. **Contract:** execute complete selected init/update/post/delta-zero/make/submission phases with correct record ownership, cursors and initialized contexts.
2. **Original:** similar context offsets can have different meanings by phase; capacity reservations need not equal consumed module record bytes.
3. **Native evidence:** complete bounded Particle/Quad/Null chains run; wrong InitContext/UpdateContext aliasing was corrected; fourth Null array is retained but blocked.160 original Null flag-block controls and static NodeTree dataflow now distinguish InitContext5c versus60; actual source words remain unknown.
4. **Implemented:** guarded native emulation harnesses, chain lists and partial context-transfer code; two simple effects connect these under adapters. Generic flag arithmetic and source-joined unknowns are available in the numeric trace.
5. **Integration:** no shared general graph phase executor; reference chains and browser parameter evaluation remain different paths. The new flag helper is tools-only; it supplies no guessed selector to product playback.
6. **Missing:** fourth phase integration, native selector context, allocation/traversal ownership and remaining20/32-byte reservation meaning.
7. **Evidence:** R08/R09; assignment/chain/phase tests and connected-effect tests; current Null initialization boundary above, `tools/test_null_initialization_flags.mjs`, `tools/test_bmb_lifecycle.mjs`.
8. **Dependencies/consumers:** P09/P12/P14/P17 form the execution subsystem; P16-P22 consume outputs.
9. **Next:** connect complete phase lists for the chosen graph with explicit contexts and no module omission.
10. **Acceptance:** every selected callback executes in native order, cursor/work bounds hold, context outputs match references and incomplete arrays block the whole source.

### P14 - Instance lifecycle, nested scheduling and RNG ownership - TEILWEISE

Current2026-10-28: see the newest connected Particle packet entry. Prepared parent/Particle traversal and all five drawable branch packets now reach the shared product bridge; exact writer comparisons, inherited precision residuals and live-GPU-context gaps remain separate. Full component contract stays TEILWEISE.

Current gate: run G now joins all9 source roles,8 emitter initializations,
22 activations,17 Null joints,15 Particle generator records and21 unit steps.
NativeGeneratorOwner is integrated into the productive bounded Particle program;
its Update/Post scheduler is now shared with productive Particle playback.
The source Null-to-Particle15-record projection matches1734 ordered events;
the complete mixed-source scheduler remains missing. Use the retained parent-
gated lifetime/make traces before requesting another recording. Complete-node
acceptance remains0/9 pending full state/geometry/release validation.

Current delta:33 original controls match the finite one-cycle no-overwrite shared
Particle emitter, now used by Phaser. Explicit starts/lifetimes/RNG, reset crossing
and expiration are integrated in that profile. The legacy whole-source preview
still prebuilds its graph; its source RNG ownership is not replaced or certified.

1. **Contract:** create/update/expire all graph instances in original order, including repeats, delayed births, capacity and parent-dependent state/random streams.
2. **Original:** generator start jitter, restart delay, callback remainder and lifetime are distinct; child initialization consumes shared random state.
3. **Native evidence:** controlled constant-Particle activation/callback/PostUpdate/expiry tested; full branched Null/Quad/Model traversal is not established.
4. **Implemented:** native scheduler reference and admitted single-burst connected exporter; new source-checked constant activation primitive, symmetric/exclusive delay and disabled-emitter rule, instance/RNG observation and common-player numeric trace. Browser `instances()` still recursively precomputes using its own LCG/parameter/lifetime policy.
5. **Integration:** verified delay/enable rules reach source-admitted common instance generation; general lifecycle and actual native stream ownership remain missing. Matching9 activations does not establish37 original instances.
6. **Missing:** full mixed-node traversal, actual initial seed derivation, complete module/transform records, release/reuse/capacity semantics, repeat/zero/infinite variants. The bounded parent freeze/order/shared-stream rules now match run G; they are not all-profile certification.
7. **Evidence:** R08/R11; `emulate_particle_scheduler.py`, `original_effect_player.mjs::instances`, native scheduler/phase/connected tests, `bmb_lifecycle.mjs`, `trace_bmb_lifecycle.mjs`, `test_bmb_lifecycle.mjs`; current receipts/acceptance gaps above.
8. **Dependencies/consumers:** P09/P12/P13/P15/P17 coupled; all dynamic geometry/material/time depends on this state.
9. **Next:** extend the retained connected scheduler projection to actual module-state values and then complete transforms/geometry. Preserve the measured seed/host/dispatch input boundary; do not infer full graph support from the1734 selected events.
10. **Acceptance:** complete ordered native instance trace agrees on birth/death/parent/RNG transitions for the admitted graph; deterministic seeking/replay reproduces it.

### P15 - Four-word RNG primitive and measured sampler - INTEGRIERT

Current bounded transfer delta: see the 2026-10-28 header above. Static
Default/OneX/Basic is integrated through the shared player under explicit gates;
123 isolated-reference states and actual BattleScene control are checked. This
does not close the component's full original-engine contract.

Current delta: the primitive's explicit-state contract is integrated in the
productive Particle program and NativeGeneratorOwner. Run G verifies15 original
parent activations/record fields with one continuing RNG owner; the actual product
control and34 lifecycle/phase regressions pass. P14 still owns unimplemented source
seeding, mixed traversal and consumption outside the isolated activation boundary.
Promoting P15 does not promote those separate P14 capabilities.

1. **Contract:** from an explicit nonzero four-uint32 state, produce the observed xorshift step and measured uniform float conversion; no ownership policy is included here.
2. **Original:** xorshift shifts11/19/8; state rotates; inspected float sampling constructs mantissa bits from word>>9, then subtracts1.
3. **Native evidence:** scheduler tests check exact RNG-after across controlled seeds; constant-module tests check six draws, ranges and zero-range consumption against original instructions.
4. **Implemented:** original native routines, independent Python equations, and shared JS `NativeRandom` with bit-exact word/upper23-bit uniform conversion. Native activation controls consume it under explicit states; the normal legacy preview still uses its different LCG.
5. **Integration:** productive NativeParticleEmitter uses NativeGeneratorOwner and the same NativeRandom for activation/callback/module updates. The explicit-state primitive is integrated; source stream allocation/seeding/call order remain P14.
6. **Missing:** no missing operation in the bounded xorshift/upper23-bit-uniform contract. Source seed derivation/whole-graph call-order equality remain P14; other distributions require separate admission.
7. **Evidence:** R11/R12; `test_particle_scheduler_reference.py::next_rng`, `test_particle_modules_reference.py::random_values`, module/X references, `tools/bmb_lifecycle.mjs`, `tools/test_bmb_lifecycle.mjs` and current activation receipt.
8. **Dependencies/consumers:** explicit state -> P15 -> P14/P16/P18; P14 determines when and whose state advances.
9. **Next:** preserve exact primitive parity while P14 consumes the connected run G; do not clone RNG states per child generator record.
10. **Acceptance:** bit-exact word/state and measured float outputs across the stored native cases, followed by whole-graph consumption equality under P14.

### P16 - Curves and motion parameter evaluation - TEILWEISE

Current bounded transfer delta: see the 2026-10-28 header above. Static
Default/OneX/Basic is integrated through the shared player under explicit gates;
123 isolated-reference states and actual BattleScene control are checked. This
does not close the component's full original-engine contract.

Current module delta: raw source RGB ranges/UV2 scale feed shared initializers. G record outputs now match with explicit captured-separate-f32 arithmetic. Translation/context outputs are included; ARM FMADD versus captured rounding is not globally certified. The old scalar and preview evaluators are unchanged.

Current connected delta: initializeNativeScalar/updateNativeScalar are shared by productive Particle playback and the source scheduler projection. All600 size/speed values from300 G update/make observations match exactly, with explicit original initial seeds. This does not admit unrelated active curves/UV/color modules.

Current delta: single ConstX/VelocityX and existing measured scalar-alpha keys are
connected to the bounded product program;576 native scalar samples remain within
3e-6 (actual maximum4.768376715702516e-8). Other active source arrays remain gated.

1. **Contract:** evaluate only active channels in their correct time domain, with original tangents, integration/clamps and random initial parameters.
2. **Original:** Particle scalar alpha uses unscaled stored tangent sides and clamps; X/VelocityX have separate record/update/make rules.
3. **Native evidence:**576 scalar-alpha outputs,36 X chains, constant motion controls and source-driven chain probes; not all vector/UV/color curves.
4. **Implemented:** generic JS scalar/vector/Newton policies plus separately gated nativeScalarAlpha/nativeParticleX subsets.
5. **Integration:** partial preview gates; generic evaluator and native references still differ; source selection is required before activating a curve.
6. **Missing:** all required vector/speed/additive curves, integration domains and broad per-node parameter dispatch in the common executor.
7. **Evidence:** R06/R12/R13; `test_native_scalar_alpha.mjs`, `test_native_particle_x.mjs`, native module/chain/X tests.
8. **Dependencies/consumers:** P07/P12-P15 -> P16 -> P17-P21/P26.
9. **Next:** consume already-proved parameter rules through P13/P14; investigate only the first source-required unresolved channel.
10. **Acceptance:** selected channels match original outputs and record progression; inactive curves stay dormant and unsupported active channels block admission.

### P17 - Inheritance, parent state and locators - TEILWEISE

Current binary-control delta (2026-10-28): see the latest entry. Verified13-slot decoding and original/gameplay provenance separation are integrated into intake/preparation; complete authoring-free profiles and Meteor remain blocked. Full component status is unchanged.

Current bounded transfer delta: see the 2026-10-28 header above. Static
Default/OneX/Basic is integrated through the shared player under explicit gates;
123 isolated-reference states and actual BattleScene control are checked. This
does not close the component's full original-engine contract.

Current2026-10-28: see the newest connected Particle packet entry. Prepared parent/Particle traversal and all five drawable branch packets now reach the shared product bridge; exact writer comparisons, inherited precision residuals and live-GPU-context gaps remain separate. Full component contract stays TEILWEISE.

Current bounded extension: the newest entry verifies independently seeded node1 Default transforms, node7 matrices and node8 group-X inputs through the common replay. Native computed matrices are outputs only. Two origin residuals, general inheritance/auxiliary flags and productive graph admission remain open.

Current parent delta: source7 local translation/full velocity outputs are compared; supplied native parent1 basis/origin feeds a common projection. Two coordinate mismatches remain. This is partial simulation, not an independent parent transform producer or productive whole graph.

1. **Contract:** derive inherited transforms/colors/alpha and snapshots at birth/update with compatibility-correct Standard/Default/ZScreen locators.
2. **Original:** parent scale vectors and bases are distinct; facing locators can discard local XY rotation; birth-time inheritance differs from live inheritance.
3. **Native evidence:** Default/ZScreen controls, sampled ancestor chains, random Null transforms and Null->Quad handoff; selector/whole lifetime still incomplete.
4. **Implemented:** gated locator helpers, rate-zero/birth-translation subset, native parent chain outputs and constant connected-export adapters.
5. **Integration:** partial; generic matrix multiplication/alpha multiplication remain comparison fallbacks in unsupported cases.
6. **Missing:** all inherited selector flags, random/dynamic parents, nonzero influence/compatibility, fourth phase, general camera/negative-scale cases.
7. **Evidence:** R09/R14; original inheritance/Null/ZScreen/player tests and ancestor/pipeline context tests.
8. **Dependencies/consumers:** P09/P13/P14/P16 -> P17 -> P18/P21; parent output can feed child dispatch/lifecycle.
9. **Next:** join actual parent state to child birth/update in the selected complete graph, instead of supplying neutral fixtures.
10. **Acceptance:** native parent/child bases, origins, scales and inherited state agree through births and updates; no global rotation suppression or fitted angles.

### P18 - Geometry, facing and emission surfaces - TEILWEISE

Current bounded transfer delta: see the 2026-10-28 header above. Static
Default/OneX/Basic is integrated through the shared player under explicit gates;
123 isolated-reference states and actual BattleScene control are checked. This
does not close the component's full original-engine contract.

Current render-context delta: bounded Particle camera axes/atlas UVs and independent UV2 vertex streams are integrated;12 original-instruction controls and cropped-UV GPU shader controls pass. Live diagnostic35 measurement is pending; no new original camera/global-state or complete-effect pixel acceptance.

Current2026-10-28: see the newest connected Particle packet entry. Prepared parent/Particle traversal and all five drawable branch packets now reach the shared product bridge; exact writer comparisons, inherited precision residuals and live-GPU-context gaps remain separate. Full component contract stays TEILWEISE.

Current bounded integration: see the newest Quad-packet entry. Four complete conditional branch outputs now run through the common player; native instruction output/live-state/product-buffer evidence are separate. Full native GPU context and whole-effect support remain unaccepted.

Current bounded extension:150 source8 make-input observations now consume independently calculated parent centers/group X. No source8 two-texture vertex buffer or material packet is thereby admitted; see newest entry.

Current delta: productive dynamic Particle image dimensions use the native
radius-one X scalar with explicit neutral-parent/view-aligned/host-scale inputs.
First-frame widths match original module records. This does not admit inherited
hierarchy, general camera basis, surface emitters or full packed vertex streams.

1. **Contract:** generate all required Particle/Quad/Model primitives, emission positions, vertex layouts and native-facing transformations.
2. **Original:** source-selected writers consume computed records/group scale/bases; the observed Particle uses radius-one extents, not the old unit plane.
3. **Native evidence:**48 Particle geometry cases, source X consumers, Quad40/64-byte writers and controlled motion/parent handoffs; not all emitters.
4. **Implemented:** native writer/Quad probes, limited facing/display gates, source meshes and two simple complete vertex-stream exports.
5. **Integration:** decoded models/planes and bounded facing rules now run through the shared experimental game bridge as well as the preview. Native completeness remains incomplete: model-surface emitters/unverified untextured particles can be withheld and general source geometry is not certified.
6. **Missing:** required Model/other writer paths, surface-emission resource contexts, general roll/facing, untextured and unsupported primitive families.
7. **Evidence:** R09/R12/R14; writer/X/Quad/connected tests, `original-particle-geometry-audit.md`.
8. **Dependencies/consumers:** P08/P13-P17 -> P18 -> P19-P22/P25.
9. **Next:** produce all packed vertices for one complete mapped effect, then admit only the next generic geometry capability required by the full skill.
10. **Acceptance:** topology/count/stride/order exact; local/world/projected geometry within declared numeric tolerance for all active nodes; none omitted.

### P19 - Material/shader selection and globals - TEILWEISE

Current bounded transfer delta: see the 2026-10-28 header above. Static
Default/OneX/Basic is integrated through the shared player under explicit gates;
123 isolated-reference states and actual BattleScene control are checked. This
does not close the component's full original-engine contract.

1. **Contract:** select original program permutations and supply all active material/global uniforms from source/runtime context.
2. **Original:** descriptor tables, resource type and mask/operation flags select shader slots; Model/Quad/Particle IDs differ from BMB node IDs.
3. **Native evidence:** pinned tables/packages and initial selectors for56 nodes in the inspected corpus; shader source and global defaults/write paths recovered.
4. **Implemented:** native material catalog, source-matched Basic/Add/distortion candidates and hashes in plans.
5. **Integration:** initial selection is consumed by the shared preview/player and experimental product scene path; live overrides/global timing are not fully reproduced.
6. **Missing:** additional permutations, no-UV/multi-submesh paths, changing bindings/global uniforms and material branches beyond current profiles.
7. **Evidence:** R15; `native_material_selection.py`, `original_basic_material.py`, material/Basic/shader tests.
8. **Dependencies/consumers:** P07-P09/P18 -> P19 -> P20-P22.
9. **Next:** bind complete selected-source draw packets to exact admitted shaders/uniforms; preserve unsupported states.
10. **Acceptance:** program identity, bindings and uniform values match the original at each admitted submission, followed by independent pixel controls.

### P20 - UVs, texture animation and samplers - TEILWEISE

Current bounded transfer delta: see the 2026-10-28 header above. Static
Default/OneX/Basic is integrated through the shared player under explicit gates;
123 isolated-reference states and actual BattleScene control are checked. This
does not close the component's full original-engine contract.

Current render-context delta: bounded Particle camera axes/atlas UVs and independent UV2 vertex streams are integrated;12 original-instruction controls and cropped-UV GPU shader controls pass. Live diagnostic35 measurement is pending; no new original camera/global-state or complete-effect pixel acceptance.

Current2026-10-28: see the newest connected Particle packet entry. Prepared parent/Particle traversal and all five drawable branch packets now reach the shared product bridge; exact writer comparisons, inherited precision residuals and live-GPU-context gaps remain separate. Full component contract stays TEILWEISE.

Current bounded integration: see the newest Quad-packet entry. Four complete conditional branch outputs now run through the common player; native instruction output/live-state/product-buffer evidence are separate. Full native GPU context and whole-effect support remain unaccepted.

1. **Contract:** preserve atlas regions, UV1/UV2, animated transforms, pivots, address/filter rules and selected texture operations.
2. **Original:** converted assets can lose atlas offsets; source material selectors determine which curve/transform is active.
3. **Native evidence:** shader equations and Quad UV/writer outputs exist; general UV motion/sampler behavior is not fully differential-tested.
4. **Implemented:** fixed/curve channels, source UV rotation/pivot subset, two-layer shaders, explicit Cross Slash conversion repair.
5. **Integration:** partial material gates/two layers now also reach experimental game scenes; converted sheets remain available. The old conversion repair is not a universal original decoder and is not applied to new BMB geometry.
6. **Missing:** remaining active UV curves, exact resource animation/sampler/mipmap rules, all two-texture permutations and non-Z mappings.
7. **Evidence:** R06/R15/R18; texture mapping/layer tests, `test_effect_project.py`, Quad and shader tests.
8. **Dependencies/consumers:** P08/P12/P16/P19 -> P20 -> P22.
9. **Next:** verify the selected complete effect's actual texture coordinates/sampler state against its draw packets.
10. **Acceptance:** correct atlas regions and both UV streams at matched time; unrelated nodes unchanged; no artwork rotation used to compensate for missing UV data.

### P21 - Color, alpha and inherited modulation - TEILWEISE

Current bounded transfer delta: see the 2026-10-28 header above. Static
Default/OneX/Basic is integrated through the shared player under explicit gates;
123 isolated-reference states and actual BattleScene control are checked. This
does not close the component's full original-engine contract.

Current2026-10-28: see the newest connected Particle packet entry. Prepared parent/Particle traversal and all five drawable branch packets now reach the shared product bridge; exact writer comparisons, inherited precision residuals and live-GPU-context gaps remain separate. Full component contract stays TEILWEISE.

Current bounded color delta: finite Basic Particle programs can apply a trailing source-random RGB module through the shared native initializer and Phaser tint. Native float RGB is quantized to8 bits per channel for this profile; actual color/state/cleanup control passes. Full two-texture source8 materials and submission order remain open.

Current delta: the same measured scalar-alpha function now supplies actual Phaser
image alpha in the bounded white-Basic program. Source RGB/random/inheritance,
multitexture shaders and complete material/pixel fidelity remain open.

1. **Contract:** combine active source color/alpha, random/curve terms, corner/model bytes, texture tints, parent influences and global RGBA correctly.
2. **Original:** dormant channels stay dormant; parent Mod/Lerp and local scalar alpha are different operations; model vertices contain meaningful RGBA.
3. **Native evidence:** scalar alpha, selected parent arithmetic, Basic/Model shader products and sampled writer alpha values; full inherited coefficient production incomplete.
4. **Implemented:** appearance selectors, vertex RGBA, constant quad colors/tints and native-scalar gate.
5. **Integration:** partial; source-less/random/animated color and unsupported influence retain labeled comparison behavior.
6. **Missing:** broad inherited influence/compatibility, animated/random texture/corner color, original global modulation timeline.
7. **Evidence:** R13-R15; appearance/inheritance/model-RGBA/quad-color/Basic/scalar tests.
8. **Dependencies/consumers:** P13/P16-P19 -> P21 -> P18 packed color/P22 final passes.
9. **Next:** connect original coefficient producers and packed color for the active graph before changing visual opacity.
10. **Acceptance:** native pre-shader color/alpha and final shader output agree, with opaque-white and zero-influence controls unchanged.

### P22 - Draw submission, blend/order/depth/pass handling - TEILWEISE

Current render-context delta: bounded Particle camera axes/atlas UVs and independent UV2 vertex streams are integrated;12 original-instruction controls and cropped-UV GPU shader controls pass. Live diagnostic35 measurement is pending; no new original camera/global-state or complete-effect pixel acceptance.

Current2026-10-28: see the newest connected Particle packet entry. Prepared parent/Particle traversal and all five drawable branch packets now reach the shared product bridge; exact writer comparisons, inherited precision residuals and live-GPU-context gaps remain separate. Full component contract stays TEILWEISE.

Current bounded integration: see the newest Quad-packet entry. Four complete conditional branch outputs now run through the common player; native instruction output/live-state/product-buffer evidence are separate. Full native GPU context and whole-effect support remain unaccepted.

1. **Contract:** submit every active draw in original order with correct blend equations/factors, depth/cull/alpha-test state and multi-pass dependencies.
2. **Original:** seven native blend rows are source-verified; material texture combination is different from framebuffer blending.
3. **Native evidence:** exact GL/root joins for measured scopes; one pink state contains one source-over draw then13 additive draws.
4. **Implemented:** gated native blend table, scene-layer compositor, actual GPU mirror and run-preserving transfer.
5. **Integration:** experimental game scenes preserve the player's per-material blend states directly in Phaser's framebuffer; Legacy sheets still have one NORMAL/ADD mode. Original source sort/depth/multipass completeness remains unverified.
6. **Missing:** complete sorting, depth/stencil/culling dependencies, alpha-test variants, background-dependent passes and multi-pass publication.
7. **Evidence:** R15/R17; native blend/scene/host tests; `live_effect_export.js`, `prepare_live_clip.py`.
8. **Dependencies/consumers:** P18-P21/P25 host state -> P22 -> P25/P27.
9. **Next:** define an ordered draw/pass contract from actual source state; block flattening when it changes composition.
10. **Acceptance:** native-matching draw/state order plus independent pixels on black/white/patterned backgrounds; no lost passes/depth dependencies.

### P23 - Root placement and coordinate spaces - TEILWEISE

Current skill-expansion delta (2026-10-28): Explicit uniform-background Model role reuses hash/geometry-checked arena coverage. Reviewed viewport adaptation, no source screen-space flag claim. See the latest entry above; full component status is unchanged.

Current Cross Slash delta: see the 2026-10-28 playable-content header. Reviewed
weighted damage timelines, Source-only admission, metadata-only publication and
paged commands are product-integrated subsets; backdrop coverage is an explicit
composition adaptation. Full original-engine component status is unchanged.

1. **Contract:** convert caster/target/group/screen rectangles, offsets, side/orientation and global geometry scale into explicit world anchors.
2. **Original:** placement rectangle, world origin, geometry multiplier, camera and viewport are separate inputs; measured multiplier follows1136/min(screen dimensions).
3. **Native evidence:** selected placement/control-flow/root measurements and source/RNG/delta context joins, including six strobe roots.
4. **Implemented:** sourceRectanglePoint, rendererGeometryScale, host placement/project helpers and explicit bound-host inputs.
5. **Integration:** bound preview uses declared host bindings; original actor/HUD scene and broad target/side contexts are not automatically reconstructed.
6. **Missing:** all side/target/scatter variants and dynamic actor-dependent rectangles; PC host mapping policy must be explicit.
7. **Evidence:** R16/R17; `export_effect_host.mjs`, `test_effect_host_context.mjs`, placement/scale/context reports.
8. **Dependencies/consumers:** P05/P26 -> P23 -> P24/P25; P18 geometry remains separate.
9. **Next:** pin one exact scene and distinguish source units, native view pixels, PC canvas units and physical framebuffer pixels.
10. **Acceptance:** source-controlled rectangle/offset/side changes move anchors exactly as native references predict without per-skill fits.

### P24 - Camera/projection and camera events - TEILWEISE

1. **Contract:** apply original view/projection/camera state in the right order and map it to an explicitly adapted PC presentation.
2. **Original:** Cocos matrices feed the effect renderer; measured identity-view/orthographic context is one supported scenario, not all camera behavior.
3. **Native evidence:** original CPU vertices, camera matrices and GL pairs support analytical projection under selected controls.
4. **Implemented:** checked camera audit, orthographic host contract, native-proportions mode and projection helpers.
5. **Integration:** supported static context in research host; dynamic camera commands and general views are not part of the game import.
6. **Missing:** arbitrary view/projection, camera motion/roll/zoom/cinematics and exact ordering relative to body/effect actions.
7. **Evidence:** R14/R16; camera projection/native projection/host-view tests and `audit_camera_projection.py`.
8. **Dependencies/consumers:** P12/P26 event timeline -> P24 -> P25/P29 projection comparisons.
9. **Next:** freeze the first skill's measured camera scenario; classify required camera events before considering general camera support.
10. **Acceptance:** projected native vertices agree under changed camera controls; no camera/crop adjustment merely hides incorrect geometry.

### P25 - Scene, framebuffer, clipping and foreground - TEILWEISE

Current Cross Slash delta: see the 2026-10-28 playable-content header. Reviewed
weighted damage timelines, Source-only admission, metadata-only publication and
paged commands are product-integrated subsets; backdrop coverage is an explicit
composition adaptation. Full original-engine component status is unchanged.

1. **Contract:** composite effects with the right background, viewport/scissor, intermediate RGBA and actor/HUD/foreground ordering; restore GPU state.
2. **Original:** source white planes can extend beyond the viewport/HUD; scene occlusion is not a particle size rule.
3. **Native evidence:** measured GL framebuffer/viewport/scissor and exact root joins; UI explanation partly relies on a separate unsynchronized video.
4. **Implemented:** common effect-host compositor and GPU fixtures; explicit game/native host views; live mirror saves/restores changed state.
5. **Integration:** fixed game host now connects experimental scenes with actual actors/HUD through back/front Extern layers, clipping and GL-state restoration. Selected front-pass pixels match the standalone compositor. Original scene/raster replay and arbitrary cameras remain outside this profile.
6. **Missing:** all scene/depth/stencil dependencies, exact foreground layout, screen-dependent distortion and source-scene-to-PC adaptation contract.
7. **Evidence:** R16/R17; `composeEffectHostLayer`, `test_effect_host_context.mjs`, documented five GPU host controls.
8. **Dependencies/consumers:** P22-P24 -> P25 -> P27 final output; supplies host inputs to passes.
9. **Next:** compare complete effect output in one fixed shared host before adding a different scene/layout.
10. **Acceptance:** exact viewport/scissor intersections, preserved background/foreground and restored renderer state; effect-mask pixels agree with independent references.

### P26 - Body/action choreography and synchronization - TEILWEISE

Current self-event delta (2026-10-28): see the newest six-command entry. Source self-buff/event/host support and checked Null init inputs are integrated within explicit profiles; universal scope and unsupported candidate gates remain unchanged.

Current Cross Slash delta: see the 2026-10-28 playable-content header. Reviewed
weighted damage timelines, Source-only admission, metadata-only publication and
paged commands are product-integrated subsets; backdrop coverage is an explicit
composition adaptation. Full original-engine component status is unchanged.

1. **Contract:** schedule approach/return, body poses, readiness/casting, member starts and visual impacts from one explicit action clock.
2. **Original:** body track index, CGG pose ID, source command time and emitter age are different; motion codes choose behavior beyond a sheet name.
3. **Native evidence:** motion1 composition and command inputs are verified; current18-frame approach/12-frame return and offsets are game adaptations.
4. **Implemented:** UnitActor state transitions, reviewed dash/stationary movement and presentationPose; source timings retained separately from gameplay damage.
5. **Integration:** prepared scenes now recover on the exact keyed body-complete event independently of effect duration. Approach/return consume reviewed prepared frame counts; turn/reward completion joins body recovery, effect end and reviewed damage. Legacy keeps its prior schedule. Not general original choreography; newer atk1/atk2/atk3 tracks are not automatically mapped.
6. **Missing:** general motion-code mapping, source movement/casting/camera choreography and single source-derived body/VFX clock.
7. **Evidence:** R04/R10/R16; `UnitActor.ts`, `BattleScene.ts`, player/combat regression tests, cloud-version comparison; current body/effect checkpoint and `tools/data/choreography/` framewise product/interruption receipts.
8. **Dependencies/consumers:** P03/P04/P11/P12 -> P26 -> P23/P24/P28.
9. **Next:** declare original versus adapted choreography for the first complete skill and reference-match its body/VFX schedule.
10. **Acceptance:** matched-form body/position/pose and every visual member starts at expected original time; pauses/cancel/return do not desynchronize output.

### P27 - Prepared-asset publication/loading - INTEGRIERT

Current self-event delta (2026-10-28): see the newest six-command entry. Source self-buff/event/host support and checked Null init inputs are integrated within explicit profiles; universal scope and unsupported candidate gates remain unchanged.

Current binary-control delta (2026-10-28): see the latest entry. Verified13-slot decoding and original/gameplay provenance separation are integrated into intake/preparation; complete authoring-free profiles and Meteor remain blocked. Full component status is unchanged.

Current skill-expansion delta (2026-10-28): Seal standalone manifest, five hash-pinned PNGs and metadata-only Aerith publication use existing registry/player; no body rebake. Legacy body adoption validates manifest identity/geometry first. See the latest entry above; full component status is unchanged.

Current Cross Slash delta: see the 2026-10-28 playable-content header. Reviewed
weighted damage timelines, Source-only admission, metadata-only publication and
paged commands are product-integrated subsets; backdrop coverage is an explicit
composition adaptation. Full original-engine component status is unchanged.

Visual delta: optional validated per-sheet filtering/extruded gutters now flow
through the existing exporter/cache/publisher/Preload, with lossless repacking of
two reviewed Cloud sheets. This is a display adaptation, not native sampling
acceptance or conversion of an incomplete BMB plan to an approved skill.

Current delta: `ParticleEffectManifest` extends the existing catalog with strict
`native-particle-basic-v1` prepared programs plus an original PNG. Compiler checks
native lifecycle rows/requests, texture hash and source-alpha admission before
writing; records program/compiler/plan/source hashes. Existing sheets cannot be
overwritten by this tool. The control assembly is not approved skill publication.

1. **Contract:** validate, publish and register reviewed standard sheets/clean metadata; game loads only prepared assets, never raw game parsers.
2. **Original:** publication is an FFRogue boundary, not an original-engine function; its inputs need declared provenance and capabilities.
3. **Native evidence:** not required to prove file publication; native fidelity must be supplied independently before approval.
4. **Implemented:** importer staging, recipe/source/dependency/sheet hashes, Pillow validation, content registry and Boot/Preload loading.
5. **Integration:** yes for existing body sheets and reviewed NORMAL/ADD effect sheets; batch ready is explicitly distinct from fidelity.
6. **Missing/outside profile:** publication schema for a complete reconstructed skill/multi-pass stream and its approval manifest; no automatic reward approval.
7. **Evidence:** R01/R19; `import_character.mjs`, `export_effect.mjs`, `batch_skills.mjs`, `BootScene.ts`, `PreloadScene.ts`, pipeline tests.
8. **Dependencies/consumers:** validated prepared data -> P27 -> P28; P30 supplies fidelity/approval gates.
9. **Next:** retain working publication. Experimental scene profiles require explicit review/quality labels; native-certified output extensions still require complete-source acceptance.
10. **Acceptance:** exact prepared hashes/geometry/metadata validated and loaded in game; stale inputs block publication and raw formats never enter src parsing.

### P28 - Shared game catalog/action executor and cleanup - TEILWEISE

Current self-event delta (2026-10-28): see the newest six-command entry. Source self-buff/event/host support and checked Null init inputs are integrated within explicit profiles; universal scope and unsupported candidate gates remain unchanged.

Current skill-expansion delta (2026-10-28): Enemy support event timers, status refresh/expiry/Stop, zero-damage execution and admitted Source key through readiness fallback are integrated. Full action/shutdown checks in receipt45; all old commands retained. See the latest entry above; full component status is unchanged.

Current Cross Slash delta: see the 2026-10-28 playable-content header. Reviewed
weighted damage timelines, Source-only admission, metadata-only publication and
paged commands are product-integrated subsets; backdrop coverage is an explicit
composition adaptation. Full original-engine component status is unchanged.

Current bounded transfer delta: see the 2026-10-28 header above. Static
Default/OneX/Basic is integrated through the shared player under explicit gates;
123 isolated-reference states and actual BattleScene control are checked. This
does not close the component's full original-engine contract.

Current delta: `BattleScene.playSkillEffectAt` also dispatches the admitted dynamic
program and returns its lifecycle handle. Preload, clipping, scene-update cleanup
and shutdown are tested. Existing published Brave/Blade/Satellite presentations
retain sheet mappings (Satellite is only a product regression, not native evidence);
no complete original skill or source graph has been admitted by adding this path.

1. **Contract:** select/prepare/commit arbitrary admitted skills sequentially, resolve targets and reviewed operations, play visuals and release all action resources.
2. **Original:** skill identity/visual rules are separate from FFRogue costs/damage; original chaining/formulas are not required.
3. **Native evidence:** no native test certifies FFRogue gameplay; existing game/UI checks are independent product validation.
4. **Implemented:** nine selected commands, deferred plans, sequential execution, MP-on-commit, body states, target effects and action/reset cleanup. Source actions independently join body return/effect/damage; active actors defer victory and remove keyed listeners on completion/shutdown. Incompatible scope/movement is blocked before MP.
5. **Integration:** partial; three reviewed timeline presentations/six legacy entries, restricted commands/scopes and a fixed current party/loadout. Brave now consumes source-composed tracks through the same scheduler as Blade/Satellite; all three exercised in the actual product WebGL path. Current tests/receipt are in the integration checkpoint above.
6. **Missing:** broad prepared action/catalog/UI capacity and operation requirements for new admitted skills. Legacy is an explicit operational fallback, never evidence of original reconstruction. Cloud's three source-preview bindings and a standalone import control now share the product executor.
7. **Evidence:** R10/R19/R20; `src/types/skills.ts`, `BattleScene.ts`, `UnitActor.ts`, combat/pipeline tests.
8. **Dependencies/consumers:** P10/P26/P27 -> P28; X03 may later teach/equip supported skills.
9. **Next:** consume one accepted prepared skill through the shared action executor without a hero/skill-specific visual handler.
10. **Acceptance:** real game execution matches accepted visual schedule; correct targeting/MP/lock/cancel/reset/KO behavior, no duplicate events or retained sprites/listeners/timers.

### P29 - Independent original references and capture identity - TEILWEISE

Current reference: diagnostic34 runs in Trace only with verified same-key update/rollback and actual full-record/direct-parent capture H. measurement-receipt.json joins hashes, conditions, hooks, events and remaining scope; see newest entry.

Current connected delta: the reusable ordered JSON comparison reports actual field/order discrepancies, parent/RNG context and first divergence; negative seed/gate controls prove detection. Source projection scope and supplied inputs are explicit. Numerical equality is not native pixel fidelity.

Current access evidence: installed32 is hash-matched, startup/calibration/hooks
were verified in the accepted process, and runs F/G contain a connected exact-
source controlled execution. Original caller scheduling and declared unit deltas
are distinguished from unchanged battle timing. No native pixel reference was
created or inferred from this lifecycle trace. Capture requests are idle.

Visual delta: all44 saved plans/resources and prior screenshots are frozen with
code/SDK hashes; current captures include full UI/frame/host identity. Three Cloud
replays are tested in isolation. Old exact pixel identities and full synchronized
original skill frames remain missing; Satellite is explicitly excluded from native
evidence. Fresh baker output is not assumed equal to historical pixels.

1. **Contract:** produce or retain trustworthy original stage outputs/frames with exact source, native build, command/node, RNG/time and host identity.
2. **Original:** native function tests, calibrated runtime observations and original video frames prove different boundaries; nearest timestamps are not ownership joins.
3. **Native evidence:** bounded original instruction execution, same-session command/master joins, context/RNG and exact GL/root joins; some complete simple source exports.
4. **Implemented:** pinned Unicorn references, calibrated observers, bounded logs/memory reconstruction and analysis tools. New Null/Quad/Particle activation oracle provides51 controls with source/native identities; the common-player181-frame trace explicitly leaves absent original whole-tree states null.
5. **Integration:** supports evidence/gates but lacks a canonical synchronized full-skill reference suite; native code uses declared fixtures/adapters, including float32 sin/cos adapters.
6. **Missing:** whole-skill time/RNG/scene alignment, deterministic original sequence and reference availability/freshness manifest.
7. **Evidence:** R08-R17/R21; `tools/memorial/` reference/observer/context tests and retained capture reports.
8. **Dependencies/consumers:** P01/scenario -> P29 -> P30 and all differential component checks.
9. **Next:** bind existing references to explicit stage/scenario IDs; request a new observation only for a named missing input.
10. **Acceptance:** replay/analysis requires exact identity joins and independent references; missing calibration/fields, stale hashes or skipped reference cases cannot pass fidelity.

### P30 - Acceptance, coverage and test-result reuse - TEILWEISE

Current self-event delta (2026-10-28): see the newest six-command entry. Source self-buff/event/host support and checked Null init inputs are integrated within explicit profiles; universal scope and unsupported candidate gates remain unchanged.

Current binary-control delta (2026-10-28): see the latest entry. Verified13-slot decoding and original/gameplay provenance separation are integrated into intake/preparation; complete authoring-free profiles and Meteor remain blocked. Full component status is unchanged.

Current skill-expansion delta (2026-10-28): Five commands checked in actual game; four Cloud commands accepted by Daniel. Seal reviewed here, native whole-skill reference absent.79 Node tests, four Python checks, receipts45-48 and unchanged182/180 writer regression recorded. See the latest entry above; full component status is unchanged.

Current audit reports0 connected native states/0 complete nodes despite all9
having independent evidence. New exact-source joins include sourceInitializedCases
without rerunning unchanged native controls. Changed tracer/source/native-identity
guards and the visual byte baseline were checked; no render/build claim follows.

1. **Contract:** measure complete sources/skills and stage errors against a fixed corpus; reuse unchanged results with transitive fingerprints.
2. **Original:** no original engine feature supplies this product process; fidelity requires independent original references, not our own expected image.
3. **Native evidence:** strong function/geometry cases and one pixel-transfer sample exist; no whole-skill benchmark supports a completion percentage.
4. **Implemented:** source/coverage audits, many tests, recipes/bake hashes and independent experimental receipts. Current lifecycle trace pins source/plan/player/primitive/tracer/Three/reference hashes, tests deterministic replay, and retains0 complete nodes rather than certifying missing native histories.
5. **Integration:** partial; cached coverage pins an older player, and current positive-alpha sampling omits nativeScalarAlpha mode.
6. **Missing:** current canonical coverage, end-to-end benchmark/reference manifest, skip-as-incomplete gates and result-cache dependency graph.
7. **Evidence:** R20/R22; `audit_original_skill_features.py`, `audit_renderer_coverage.mjs`, `test_renderer_coverage.mjs`, architecture audit.
8. **Dependencies/consumers:** P10/P29 and tested stages -> P30 -> P27 approval and future priority decisions.
9. **Next:** create one exact scenario/evidence manifest and explicit stage acceptance before changing a renderer equation.
10. **Acceptance:** every score names the code/source/scenario/reference revision; unchanged inputs reuse results, skipped/missing original references remain incomplete, and no adapted/withheld skill counts as faithful.

## 5. Evidence bundles and historical measured milestones

Paths below are repository-relative and concrete. Linked reports describe their recorded revisions, not a fresh pass for today's tree. Existing tests were inspected, not executed for this map.

| Bundle | Primary code/tests | Findings and research records |
| --- | --- | --- |
| R01 | `tools/import_character.mjs`; `tools/lib/character-pipeline.mjs`; `tools/export_unit.py`; `tools/validate_character.py`; `tools/test_character_pipeline.mjs` | [character standard](../character-import-workflow.md), [animation audit](character-animation-audit.md), [batch](skill-batch.md). Reusable selected-profile import/publication and38 checked body sheets documented; not all skills |
| R02 | `tools/stage_original_skill.py`; `tools/inspect_bmb_resources.py`; `rawdata/ffbe_asset_dump/tools/cpk.py` | [recovered sources](missing-effect-sources.md), [original feasibility](climhazzard-original-feasibility.md), [asset structure](../asset_structure.md). Four Climhazzard binaries/19 resources staged,13 PNGs/six M3R; availability not rendering |
| R03 | `tools/audit_cloud_versions.mjs`; `tools/memorial/export_master_reference.py`; `tools/memorial/test_particle_trace.py` | [version comparison](cloud-version-comparison.md), [hit profiles](native-hit-profiles.md), [MVP audit](mvp-skill-audit.md), `mvp-skill-audit.json`, `cloud-skill-effects.json`. Three loaded abilities/six timeline fields match; incomplete ownership closure |
| R04 | `tools/compose_skill_effects.py`; `tools/resolve_composed_skill.mjs`; `tools/test_compose_skill_effects.py`; `tools/memorial/observer.js` | [native hit profiles](native-hit-profiles.md), [composed preview](brave-slash-composed-preview.md), [composition audit](original-composition-audit.md). Actual upgraded unit prefix differs from project-form prefix; motion1 rule tested, not every motion |
| R05 | `tools/lib/character-pipeline.mjs`; `tools/prepare_original_preview.py`; `tools/probe_original_skill_features.mjs` | [Cloud mapping](cloud-skill-effects.md), [shared import](shared-skill-import-review.md), [composition](original-composition-audit.md). Raw tuples/fields survive, several meanings/gates remain partial |
| R06 | `tools/inspect_bmb.py`; `tools/bmb_parameters.py`; `tools/bmb_channels.py`; `tools/bmb_materials.py`; `tools/bmb_playback_fields.py`; BMB tests in section12 | [structure](bmb-structural-reader.md), [vectors](bmb-vector-channels.md), [fixed parameters](bmb-fixed-parameters.md), [material/model parsing](bmb-materials-models.md). Seven/eight-pair statements are revision-specific; active fields and offsets checked, no full interpreter |
| R07 | `tools/inspect_m3r.py`; `tools/test_m3r.py`; `tools/prepare_original_preview.py` | [models](bmb-materials-models.md), [vertex RGBA](model-vertex-rgba.md), [Model Basic](native-model-basic-material.md). Original mesh bytes retained; appearance requires later stages |
| R08 | `tools/memorial/emulate_particle_assignment.py`; `emulate_particle_scheduler.py`; assignment/chain/phase tests | [assignment](native-particle-assignment.md), [chains](native-particle-chains.md), [phases](native-particle-phases.md).13 source Particle dispatches;11 of13 admitted init/update chains at that revision; unconsumed work reservations explicit |
| R09 | `tools/memorial/emulate_quad_assignment.py`; `emulate_null_assignment.py`; Quad/Null reference tests | [connected combat](brave-slash-connected-combat.md), [Null chains](native-null-parent-chains.md). Four Quad/four Null source chains; source motion-to-writer handoff; fourth list retained/blocked; complete nine-node output absent |
| R10 | `src/entities/UnitActor.ts`; `src/scenes/BattleScene.ts`; `src/types/manifest.ts`; `tools/test_combat_regressions.mjs` | [body states](character-animation-audit.md), [planning HUD](command-planning-and-hud.md), [portrait layout](portrait-battle-layout.md). Game poses/planning verified for reviewed commands, not original general choreography |
| R11 | `tools/memorial/emulate_particle_scheduler.py`; scheduler/phase reference tests | [scheduling](native-particle-scheduling.md), [phases](native-particle-phases.md). Symmetric delay, zero-range RNG consumption,10000 fixed ticks, callback remainder, delayed expiry and repeat controls established under fixtures |
| R12 | `tools/memorial/emulate_particle_writer.py`; `emulate_particle_modules.py`; `emulate_particle_x.py`; writer/module/X reference tests; `tools/native_particle_dispatch.py` | [writer](native-particle-writer-offline-reference.md), [module dataflow](native-particle-module-dataflow.md), [dispatch](native-particle-source-dispatch.md), [X chains](native-particle-x-scale.md).48 geometry controls/zero residual under reconstructed node34 inputs;36 X chains/11 raw sources reported |
| R13 | `tools/memorial/export_scalar_alpha_controls.py`; `tools/test_native_scalar_alpha.mjs`; `tools/memorial/prepare_scalar_alpha_plan.py`; `test_scalar_alpha_plan.py` | [scalar alpha](native-scalar-alpha.md), [gated preview](native-scalar-alpha-preview.md), [appearance](original-appearance-review.md).576 original outputs/64 controls, max residual4.77e-8; Climhazzard5/7 Particle nodes eligible in one explicit alpha plan |
| R14 | `tools/memorial/emulate_zscreen_locator.py`; `tools/original_null_locator.py`; `tools/original_particle_geometry.py`; locator/projection tests | [ZScreen](native-zscreen-offline-reference.md), [ancestor result](ancestor-locator-result.md), [projection](particle-locator-projection.md), [geometry subset](particle-geometry-subset.md). Six measured ancestors/16 offline ZScreen controls; camera/general inheritance remains gated |
| R15 | `tools/native_material_selection.py`; `tools/original_basic_material.py`; `tools/original_effect_player.mjs`; native material/Basic/blend/shader/RGBA tests | [native selection](native-material-selection.md), [Model Basic](native-model-basic-material.md), [blend/globals](native-blend-global-uniforms.md), [Add shader](shader-add-material.md), [material evidence](native-particle-material-evidence.md).56 initial node selections/16 Add nodes; initial selection is not live whole-skill binding |
| R16 | `tools/memorial/export_effect_host.mjs`; `tools/original_effect_player.mjs`; `tools/test_effect_host_context.mjs`; `tools/test_preview_host_view.mjs` | [placement](native-effect-placement.md), [scale](native-renderer-scale.md), [host](effect-host-context.md), [compositor](effect-host-compositor.md), [bound host](bound-effect-host.md). Five actual GPU host controls documented; no original actor/HUD replay |
| R17 | `tools/memorial/pipeline_observer.js`; `tools/memorial/audit_pipeline_context.py`; pipeline observer/context tests | [pipeline contexts](native-pipeline-context-observer.md), [draw submission](native-draw-submission.md), [current viewport](native-viewport-current.md). Revision23 closes strobe observation gap:12 exact GL/root joins across two captures; revision22's earlier “no GL observed” is superseded |
| R18 | `tools/repair_effect_uv.py`; `tools/effects/repairs/cross_slash_uv.json`; `tools/lib/effect-artwork.mjs`; `tools/test_effect_project.py` | [UV repair](cross-slash-uv-repair.md), [orientation adaptation](effect-orientation.md), [Blade source geometry](blade-beam-source-geometry.md). Lost atlas starts are a conversion defect; artwork rotations are explicit game adaptations |
| R19 | `tools/export_effect.mjs`; `tools/batch_skills.mjs`; `tools/lib/skill-batch.mjs`; `src/scenes/BootScene.ts`; `src/scenes/PreloadScene.ts`; effect recipes | [Brave integration](brave-slash-integration.md), [Blade preview](blade-beam-preview.md), [Satellite import](satellite-beam-import.md), [batch](skill-batch.md). Three reviewed timeline commands/six legacy among nine selected; prepared sheet paths are working product capabilities |
| R20 | `tools/test_combat_regressions.mjs`; `tools/test_character_pipeline.mjs`; `src/types/skills.ts`; `src/types/effects.ts`; `public/assets/content.json` | [pipeline foundation](skill-pipeline-foundation.md), [architecture audit](skill-pipeline-architecture-audit.md). Gameplay damage/cost design separate from source visual timing; fixed current selection is not all-skill catalog |
| R21 | `tools/memorial/export_connected_effect.py`; `tools/export_connected_effect.mjs`; `tools/preview_connected_effect.html`; `tools/memorial/test_connected_effect.py`; capture analyzers | [connected export](connected-effect-export.md), [second source](connected-second-effect.md), [client access](memorial-client-access.md). Strobe4 nodes/32 states and Capsule5 nodes/123 states fully traverse their admitted constant-parent adapter; Capsule is not a Cloud skill |
| R22 | `tools/audit_original_skill_features.py`; `tools/audit_renderer_coverage.mjs`; `tools/test_renderer_coverage.mjs` | [coverage](renderer-coverage-priorities.md), [feature audit](original-renderer-feature-audit.md), [architecture audit](skill-pipeline-architecture-audit.md). Existing coverage hashes an older player; static node counts/positive alpha do not establish native visible pixels |

### Operational/reference identities

- Source database reference: `ab176368d6a8faa9319f471f3f0138ec4c578cf131c759a593479dac9487183f`.
- Pinned original APK: `9d21fc8b61c9900eaacb1c2ddef2cabcad1e97d2dc720be16ac09b06fc0086b4`.
- Pinned native: `6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77`.
- Player snapshot at the architecture audit: `897fde4cd35f803b2cd5d2a5ab56063ac46294c67e42fbc9bba6e1fb6fc21829`; cached coverage used `a3b10c442a2190e403152eb12a9e8be170164e4ce7e5dcc62abaa99dc486fca2`.
- Trace revision5 was confirmed installed/idle in the preceding audit, request `{}`. Its fixed-step behavior has not been captured/accepted. This map did not query or control the emulator again.

### Proven milestone ledger (bounded findings, not whole-pipeline approvals)

| Finding ID | Demonstrated result | Evidence | What it does not establish |
| --- | --- | --- | --- |
| E01 | Current three characters' body states, pivots/durations and38 prepared sheets checked, including dying/readiness/victory transitions | R01/R10 | Alternate source families or every form's choreography |
| E02 | Actual loaded Cloud214800/214810/214820 effect/attack master strings match the six local fields | R03/R04 | All metadata categories/builds, all skills or actual execution identity without a command join |
| E03 | Verified IBMB structure/selected fields and BR3M34/35 original mesh payloads survive shared preparation | R06/R07 | Complete node/format semantics or original playback |
| E04 | Native motion1 command input includes the exact-form default attack prefix and skill-time shift | R04 | Other motion/process branches; upgraded and5-star body/prefix equivalence |
| E05 | Original scalar Particle alpha agrees across576 outputs/64 controls; reported max residual4.77e-8 | R13 | Vector/UV/color curves or correct source age/instance history |
| E06 | Original constant-generator delay/callback/PostUpdate/lifetime and RNG arithmetic exercised under fixtures | R08/R11/R12 | Complete mixed-node traversal, real graph seeding/consumption order or browser integration |
| E07 | Original Particle writer executes48 controls and reproduces the recorded node34 positions with zero residual under reconstructed inputs | R12/R14 | Correct producer state for arbitrary nodes or all native facing variants |
| E08 | Complete selected Quad/Null chains and source parent/motion-to-Quad packed output run under declared fixtures; fourth Null list retained and blocked when required | R09 | Whole nine-node graph birth/lifecycle execution |
| E09 | Two complete admitted simple sources export4 nodes/32 states and5 nodes/123 states through original selected code plus constant-parent adapters | R21 | Arbitrary NodeTree or a complete Cloud skill; Capsule remains a standalone fixture |
| E10 | Pinned initial material/shader selection, Model RGBA path, selected texture/Basic/Add and native framebuffer blend controls connected to explicit preview profiles | R15 | All live bindings, global modulation, ordering or complete-skill fidelity |
| E11 | Revision23 observes12 exact native/GL/root joins across two measured effects; bounded host compositor passes five actual GPU controls | R16/R17 | Original actor/HUD scene replay or a synchronized whole-skill baseline |
| E12 | One native pink state transfers source-over/additive runs to browser with max2/255 black and3/255 white, zero pixels above3 | X02 and architecture audit | A complete clip, second-source export, arbitrary-background support or reconstruction simulator accuracy |
| E13 | Three reviewed game timeline presentations and six legacy commands among nine selections; existing sheet publication and sequential planning work in their reviewed scope | R19/R20 | Nine original-faithful reconstructed skills or all-character import |

### Reproduction pointers and availability

The original reference controls used by `tools/test_native_scalar_alpha.mjs` are at `tools/data/native-locator-emulation/scalar-alpha-controls.json`. Source/native identity and function evidence are in the linked scalar report. Connected reference requests are `tools/data/connected-effect/strobe-request.json` and `capsule-request.json`; `tools/memorial/test_connected_effect.py` can skip when those sources/dependencies are absent. The one-state native transfer is recorded in `tools/data/live-effect-export/clip-review-20261026/clip.json` and its source receipt under `tools/data/live-effect-export/sequence-20261026/ffrogue-live-export-v2/`.

Existing command families below are examples for **invalidated/new scenarios only**, not commands executed for this map:

```powershell
$mapPython = 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
$env:PYTHONPATH = (Resolve-Path tools/data/native-locator-emulation/python-deps).Path
node --test tools/test_native_scalar_alpha.mjs
& $mapPython -m unittest discover -s tools/memorial -p test_connected_effect.py -v
```

There is no honest reproduction command for a synchronized complete-skill reference suite yet because that suite is missing. Its future scenario record must include source/native/implementation/reference identities, exact form/command/node, RNG input/state, ordered deltas, birth/age/time origin, camera/viewport/scissor, target/caster rectangles, material globals, active profiles and declared adaptations. Export/import commands in older reports reproduce their bounded artifacts, not universal fidelity. Copying the repository alone does not copy ignored original references to another PC.

## 6. Prepared plans, adaptations and known visual deviations

### Plans and completeness

| Source skill | Snapshots indexed | Main effect structure | Boundary |
| --- | ---: | --- | --- |
| Brave Slash214800 | five old uncomposed + nine composed | old35-node impact only; composed44 nodes:35-node pink impact + nine-node white unit prefix | Product now includes the source-derived prefix schedule too, using two converted sheets; original44-node simulation remains experimental |
| Blade Beam214810 |15 | two definitions/24 nodes/two members | Motion1 source still requires form-specific prefix composition; Model-surface Particle is unsupported in common player |
| Climhazzard214820 |15 | four definitions/56 nodes/five members, plus a non-file group retained separately | Motion1 prefix absent from these plans; Power Geyser has no matching BMSLN; missing geometry/color/host semantics remain |

Snapshots are A/B experiments (`plan-native-blend`, `plan-native-null`, `plan-native-alpha`, etc.), not cumulative proof that every capability is active in every plan. There is no universal “latest plan” chosen merely by filename or mtime. `plan-native-alpha.json` exists for Climhazzard only in this inventory.

### Adaptation/exception register

| Item | Classification | Why it matters to the map |
| --- | --- | --- |
| Brave `atk_impact_001_pink_flashcut.efkefc` | Reviewed product adaptation | Removes white contribution in converted variant; not a native rule or fidelity reference |
| Cross Slash front UV repair | Source-derived repair of a specific conversion | Eight of twelve atlas starts corrected; no permission for generic rotations, timing or original BMB modification |
| Blade green artwork clockwise90 degrees, tracked bright-body pivot | Reviewed product adaptation | Affects raster artwork independently of travel; source geometry/math must not inherit this correction |
| Satellite artwork clockwise45 degrees | Reviewed product adaptation | Source emitter Z45 retained separately; not a universal coordinate-system correction |
| Satellite source motion8 -> atk | Reviewed motion adaptation | Original meaning remains unresolved; existing recipe is not proof of native choreography |
| Blade/Satellite combined damage at F30/F165 | Roguelike gameplay adaptation | Original hit metadata retained; damage event count is not a rendering completeness requirement |
| Eighteen-tick approach/twelve-tick return, selected offsets/scales | Preview/game presentation policy | Not established native trajectories; P26 must label them before fidelity comparison |
| fit-screen/fit-arena, full-host screen-anchor switch | Explicit host adaptation / diagnostic | Can change image coverage without correcting source primitive/simulation; not a per-skill rule |
| Unsupported untextured/surface emitters withheld | Incomplete diagnostic preview | Better than invented geometry, but cannot count as a complete source/skill |
| Legacy fallback matrix/color/curve paths | Comparison-only approximation | Visible output is not evidence of source correctness or admission |
| UnitActor recoilOffsetX | Export heuristic | Bottom-pixel comparison, not original movement metadata; body pivot assembly is a separate verified contract |

### Measured deviations and resolved observations

- White node34 is a real original white-textured Particle. Native sampled bounds were1278x1136; the earlier normalized evaluator produced approximately639x515 and nonzero Z extent. This is a documented older geometry/host mismatch, not a fresh error for every current mode.
- Particle native scheduling uses different RNG/delay/fixed-point rules from browser `instances()`. The latter still uses an LCG/precomputed recursive schedule; P14/P15 integration is missing.
- Generic scalar interpolation differs from verified Particle scalar-alpha tangents/clamp. Only eligible nodes can use the native helper; vector/UV curves are not automatically corrected.
- Nonwhite Model RGBA was previously absent from submission; explicit candidates now preserve it. A/B differences and Blade's opaque-white control establish a shared input effect, not whole-skill original accuracy.
- The strobe “no GL draw observed” result was an observer gap closed by revision23's exact joins. It must not justify removing the flash.
- Source plane boundaries depend on projection, viewport/scissor and HUD overlap. The separate video is not a synchronized whole-frame ground truth.
- Naive PNG alpha transfer failed by max220/255. Preserved source-over/additive runs of one original sample achieved max2 black/max3 white, including a real browser comparison. That is pixel-transfer accuracy, not P14/P18 simulator accuracy.

## 7. Separate extensions and alternative route

These three records are part of the complete map but **excluded from the30 core status totals**. They must not become prerequisites for first visual-skill acceptance unless the chosen skill/product requirement needs them.

### X01 - Sound resolution/playback - TEILWEISE

Current: the pinned original `GameUtils::playSEWithGroupID` dispatch
identifies field 3 = 1 as common-bank routing. Fields 1 and 2 are
relative offset and numeric CueID. The SE.acb CueTable/CueNameTable join
resolves Seal Evil 600 to `se_bg_vortex_90f_1` and 100 to
`se_special_flash_1`. Named decoder streams 234 and 823 are published
with resource hashes. The Source bridge emits at crossed composed frames
40/61/81, with no damage or body timer dependency. The browser recorded
both flash plays and the vortex during the real Seal Evil command. See
asset_structure.md for native addresses. Native audio latency, other
skills and unresolved profiles remain separate checks.

Previous playable audio covered verified Home and Whisperwood music and
FFRogue-authored UI tones on independent mixer buses. Seal Evil is the
bounded Source candidate. Published groups 5013710 and 7000990 serialize
`0:600:1` and `1:100:1`; its Source lane resolves events at F40/F61/F81
at 60 FPS. These are serialized timings. The SE.acb stream inventory
can now be read by vgmstream, but no evidence maps those two group sound
IDs and their raw prefixes to a specific bank CueID or wave. The
one-based stream indices 100 and 600 report `mhxr_em120_vo_bond01`
and `se_limitburst_reo3` respectively, with no link to those groups. A
stream ordinal is not a CueID. The next check is a bounded native dispatch
observation from
`GameUtils::playSEWithGroupID` through the cue request for one Seal Evil
cast. Until then, the published plan retains `playbackSupported:false`.

Previous bounded update (2026-10-28): serialized group sound IDs/offsets and raw
parameters are retained in the published audioSource plan, playbackSupported:false.
The inventory measures WAV headers and candidate ACB banks; SE.acb matches current
Trace external bytes. Cue/sample dispatch, codecs and native playback timing remain
UNKNOWN; no playable audio has been integrated. This extension stays outside the
30-core totals. See the latest entry and audio-inventory.json for exact counts and
hashes. A filename or SPECIAL_EXPLODE_1 label is never sufficient sound semantics.

**Contract:** resolve original IDs to verified media and schedule on the visual
Source clock, separately from damage, music and environment. **Evidence:** group
records (Seal100/Meteor59), local file headers/checksums; no native dispatch trace.
**Implemented:** bounded audit plus source-audio-events.mjs and optional typed
manifest metadata. **Missing:** verified bank schema/codec, ID->cue->wave join,
asset export, playback/mixing and synchronized reference. **Next:** when audio is
prioritized, inspect the SE @UTF schema for one explicit source ID without guessing
its native CueID. **Acceptance:** correct sample/time on two independent skills,
with missing/unknown cues explicit and no gameplay-clock dependency.

### X02 - Original-runtime pixel export as an alternative backend - TEILWEISE

**Contract:** automatically load a named effect, step a complete repeatable sequence and export reusable ordered layers with host/background dependencies. **Original knowledge/native evidence:** live game-loaded GPU scopes yield real isolated pixels; failed direct factory creation yielded no images; wrapper redraw control observed zero GL commands, cause unresolved. **Implementation:** `native_export_probe.js`, `live_effect_export.js`, `analyze_live_export.py`, `prepare_live_clip.py`, `serve_live_clip.mjs`, `preview_live_clip.html`. **Integration:** not a universal exporter or product backend. **Missing:** automatic loading, full timing/seed/reset, second source, dynamic host/depth/background support and packaging. **Evidence/tests:** `native-export-feasibility.md`, `live-native-gpu-export.md`, backend/browser feasibility reports, `test_native_export_probe.mjs`, `test_live_effect_export.mjs`; latest one-state receipt described in the architecture audit. **Dependencies/consumers:** P01/P05/P06/P22-P25/P29/P30; bypasses simulation for pixels, does not integrate P13-P18. **Next:** only if separately approved, one bounded fixed-step/second-source acceptance attempt, then explicit backend decision. **Acceptance:** complete matched-time sequence, same mechanism on another source, correct compositing on native black/white/patterned references, deterministic or declared measured randomness and no per-effect fits. Original Android ELF is not browser-loadable Wasm; unavailable Web SDK/source is not an implemented route. No vendor inquiry was sent.

### X03 - Run skill learning/equipment/reward offers - TEILWEISE

**Contract:** expose the approved skill catalog as data-driven starting loadouts, learned/equipped run skills and eligible reward offers. **Original evidence:** original ownership is P02; roguelike rewards are product design, not an original-engine rule. **Native tests:** not applicable. **Implementation/integration:** three reward cards/buffs and fixed selected commands exist; the broad skill-learning/offer system is a design target. **Missing:** dynamic per-run skill inventory/slots, approved skill offers, weights and general UI navigation. **Evidence/tests:** `skill-pipeline-foundation.md`, `BattleScene.ts`, `tools/characters/*.json`, existing combat tests; no completed general learning benchmark. **Dependencies/consumers:** P02/P27/P28 and explicit balance definitions. **Next:** implement after admitted skills are available, without making a research plan reward-eligible. **Acceptance:** compatible approved skills can be learned/equipped/offered from data across characters; unsupported or already-ineligible offers cannot appear.

## 8. Open questions and blocker types

Types: **K** missing original knowledge; **I** missing implementation; **G** missing connection of existing implementations; **V** missing independent validation. More than one can apply.

| Question/blocker | Type | Components | Evidence boundary / required resolution |
| --- | --- | --- | --- |
| Which ownership/unlock categories form the complete exact-form skill set? | K/I/V | P01-P03 | Level catalog is not ownership closure; reference categories/conditions required |
| Which motion/process/parallel/alternate branch is active? | K/I/G | P03-P05/P26 | Motion1 known; other motion codes, `@` and reverse/sentinel decisions not universal |
| What actual child-return/context words select the fourth Null array, and how is that phase executed? | K/I/G/V | P09/P13/P17 | Flag arithmetic is proven; InitContext5c and60 are distinct. Actual source state/execution remain open; do not force flag0 |
| What is the real node birth/update/death order and stream ownership? | K/I/G/V | P12-P15/P17 | Proven RNG arithmetic does not supply graph consumption history |
| What do unconsumed work reservations and resource-dependent modules require? | K/I/G | P13/P16/P18 | Do not zero-fill unknown record/context semantics |
| Which vector/UV/color curve and integration rules apply per selected module? | K/I/V | P16/P20/P21 | Scalar Particle alpha cannot certify other domains |
| How do complete dynamic parents, Model facing and surface emitters produce geometry? | K/I/G/V | P17/P18 | Blade surface emission/Power Geyser untextured/unknown controls remain real omissions |
| Are selected initial shaders/bindings/uniform defaults still active at the live draw? | K/G/V | P19-P22 | Initial constructor selection is not every runtime state |
| How do ordering, depth/stencil and scene-dependent material passes combine? | K/I/G/V | P22/P25 | Existing source priorities not generally applied; transfer profile rejects depth-writing dependencies |
| What is original body movement/camera timing rather than adapted presentation? | K/I/V | P12/P24/P26 | Need same-form/time/scene reference, not18/12-tick assumptions |
| Which scene inputs map to PC presentation without changing source semantics? | I/G/V | P23-P25 | Keep original logical units, native pixels, PC canvas and framebuffer separate |
| How can a complete skill be certified without synchronized original references? | I/G/V | P29/P30 | It cannot; missing references must remain incomplete, not a visual approval |
| Do empty effect groups perform sound or another engine action? | K/V | P03/P05/X01 | Raw fields retained; no guessed audio-only discard |
| Can native capture become an automated reusable exporter? | K/I/G/V | X02 | One transferred state and installed untested fixed-step probe are insufficient |

## 9. Critical path to the first complete original-data skill

**Recommended candidate: Brave Slash214800 for the project's exact Cloud207000105.** This is the best-evidenced candidate among the inspected three, not a proven global minimum across all FFBE skills. It has source/native master correspondence, a recovered composition rule, two resolved effect definitions with matched authoring and no authored Model-surface emitter in its44-node composed plan.

Blade Beam's24-node plan adds a Model-surface emitter and omits its motion1 prefix; Climhazzard adds missing authoring/geometry/material branches and a non-file group. Selecting either solely because the preview looks simpler would not remove those dependencies.

```text
Exact source/form/scenario + complete plan (P01-P10/P29/P30)
  -> derive source selectors + execute full nine-node attack-prefix lifecycle
     with correct phases, RNG and parents (P09/P12-P17)
  -> draw all its geometry/material passes in the fixed host (P18-P25)
  -> run the full35-node pink impact through the SAME graph path
     including required generic Model/material capabilities
  -> schedule both members plus source body/movement (P04/P11/P26)
  -> compare complete same-form/time/scene reference (P29/P30)
  -> publish/load/execute accepted clean data (P27/P28)
```

The prefix is an integration checkpoint because it exercises the missing graph connection; it is not permission to investigate its white color indefinitely. Strobe and Capsule remain existing regression controls, not substitutes for this mapped effect or additional counted skills.

**Knowledge blockers precede implementation choices:** unknown selector inputs cannot be fixed by buffer plumbing; wrong birth/RNG history invalidates downstream transform/material comparisons. **Existing knowledge should be connected before expanded research:** do not re-prove scalar alpha, X scale or projection unchanged. **Validation remains a final independent blocker:** correct function outputs do not establish complete original skill pixels.

The observed upgraded Cloud207000117 shares Brave Slash's raw skill fields but has another default-attack prefix. It is a valid reference for shared skill components, not a substitute whole-body/whole-prefix reference for207000105. If the original runtime cannot supply the exact form, record the missing whole-skill reference explicitly; do not compare different prefixes and tune them to match.

X01 audio, X02 native baking and X03 reward progression are not on this first visual critical path. No mobile constraints or new PC layout redesign are introduced by this map.

## 10. Prioritized, measurable milestones

These are proposed work items, not implementation performed for this task. IDs remain stable across updates.

| Milestone | Starting state -> concrete change | Components / dependencies | Expected result and acceptance | Risks / stop condition |
| --- | --- | --- | --- | --- |
| M0 - Map baseline | Fragmented dated evidence -> this central map, bounded records and registers | all; no implementation prerequisite | Current responsibilities/dependencies/statuses and explicit evidence are reviewable; management tally derives from matrix | Counts reflect bounded components, not effort; no runtime capability is promoted |
| M1 - One admitted scenario/plan contract | Source/plan/reference split -> bind existing Brave composition, exact form, dependencies, clocks/host, required capabilities and reference identities in one prepared manifest | P01-P10/P12/P29/P30; after map review | Every member/node/unknown requirement enumerated; stale/foreign/withheld entries cannot pass. Existing references reused | Source/frame/RNG gaps may prevent fidelity acceptance; expose them before capture or code tuning |
| M2 - Complete prefix simulation | Native phase/helpers and browser scheduler disconnected -> connect source-selected phases, proven RNG, parent state, lifetime and children for all nine prefix nodes | P09/P12-P17; M1 | Complete event/state trace, no selected callbacks omitted; original phase/reference joins match, deterministic replay under explicit inputs | Derived fourth-phase flag, resource context and complete native lifecycle reference may block; name exact missing fields, never default |
| M3 - Complete prefix rendering | Partial Quad/parent writer output -> feed full prefix's vertices/UV/colors/material/order into shared host | P18-P25; M2 plus existing P08 | Full source output, all nine nodes accounted for; numeric geometry and independent image reference gates pass; strobe/Capsule controls unchanged | Two-texture/ordering and reference alignment can reveal new first divergence; no fitted angle/size/crop |
| M4 - Full pink effect through same path | Approximate35-node preview/one native pixel state -> admit its required Model/Particle/material features into the same lifecycle and draw contract | P09/P13-P22; M2/M3 | Full35-node source complete, actual emitted instances and pass output reference-checked; no skill-name branch | This contains substantial remaining generic work. Initial Model shader selection alone does not provide full Model simulation |
| M5 - First complete skill | Two component outputs -> compose prefix, pink effect, exact-form body and original/adapted movement clock explicitly | P04/P11/P12/P23-P26/P29/P30; M3/M4 | Whole Brave Slash complete-source reference comparison, declared limits, no omitted active member. Original visual fidelity requires matched original choreography | Same-form body/time reference may be unavailable; coherent adapted presentation must retain a different label |
| M6 - Second skill/character control | One completed skill -> reuse contract on a held-out mapped skill, adding only a shared capability that actually blocks it | P02-P26; M5 | Same importer/executor, no individual correction, complete effects/skill counted separately; unaffected control unchanged | A new family may require genuine new semantics; it is not a regression excuse or permission to omit nodes |
| M7 - Publication/game bridge | Reviewed offline data -> extend admitted prepared output profile where necessary and consume it via shared catalog/action executor | P10/P27/P28/P30; M5 before acceptance, M6 before generalization claim | Real game body/VFX playback, targeting, MP, lock/cancel/cleanup and source provenance checked; no raw parsing or hero-specific VFX loader | Multi-pass data may require a shared compositor bridge; existing sheet adaptations remain distinct |
| M8 - Coverage expansion | Three physical research IDs -> fixed feature-driven held-out corpus and catalog scan by exact source/version | P02/P03/P09/P30; M6/M7 | Initially target12 skills/four characters across physical/area/magic/healing/multi-stage/screen families where local data permits; report full graph/reference coverage and unresolved entries | Benchmark success is not proof of all FFBE skills. Whole-dataset claim requires enumerated closure and zero unresolved required behavior for that dataset |

After the bounded product composition checkpoint, **M1's complete-source contract and the coupled M2 lifecycle integration remain the next dependency gates**. Composition publication alone does not complete M1/M5/M7. Reuse existing prefix graph/native references to specify and connect the complete lifecycle; only a concrete absent original input justifies a focused capture. No additional isolated material/alpha/scale or native-export loop is recommended by this map.

## 11. Success definitions and reference metrics

### One effect

An effect is accepted only when all source nodes, required phases, instances/resources and render passes are accounted for across its complete declared lifetime. It must pass admitted source/dispatch/lifecycle/geometry/material/host checks without legacy fallback, omitted active subtrees or per-effect fit constants. Adapter-constrained fixtures retain that qualification. A static screenshot, selected writer or complete fixture file is not automatically original-game fidelity.

### One skill

All command/process/target branches required for its scenario, default/unit prefixes, body motion, movement, effects, layers and required scene/camera events must be present and time-aligned. Reviewed gameplay events/costs remain separate. Original fidelity needs an independent synchronized reference for the matched source/form/scene/time/RNG; otherwise label it complete-under-declared-adaptation or unvalidated, not original-faithful. Audio completeness is a separate requirement if X01 is included.

### One character

For one explicit form/version/acquisition scope: body/state tracks and complete skill ownership closure are enumerated; every available skill is either accepted or explicitly unsupported with reasons. That is a **complete catalog**, not yet a fully supported character. A fully supported character requires all skills in that declared scope to pass full-skill acceptance without renderer special cases. Manual selection of three commands does not satisfy either all-skill claim.

### Universal import

Distinguish **generic architecture** from **dataset completeness**. Generic import means arbitrary new characters/skills inside declared format/capability profiles traverse the same compiler/simulator/compositor from data, with no skill-ID renderer correction. Unsupported inputs fail explicitly. Full support for a versioned FFBE dataset additionally requires enumerating its ownership/resources and accepting every required behavior; held-out samples alone cannot prove that. No claim covers unknown future versions or missing raw data implicitly.

### Measurement requirements

| Boundary | Gate / metric | Present evidence |
| --- | --- | --- |
| Identity/parser | Exact IDs, sources, active selector/field values and dependency hashes; no silently omitted active data | Selected BMB/BMSLN/M3R and loaded-master cases exist |
| Lifecycle/RNG | Exact event count/order/parents and state transitions under the same input deltas; correct fixed-point boundaries | Controlled Particle/native chains; complete general mixed graph not yet referenced |
| Scalar Particle alpha | Existing differential test tolerance<3e-6; reported max4.77e-8 over576 controls | Original-code reference exists; not a vector/UV/general-alpha approval |
| Geometry/host | Exact topology/stride, separate local/world residuals; proposed projected vertex error<=0.5 pixel with matched host; exact integer viewport/scissor | Selected writer/locator/host references; tolerance is a proposed full-path gate |
| Original-pixel transfer | Max RGB error<=3/255 and no pixels above3 on identical declared targets | One sample passes black/white; patterned background/sequence/second source not accepted |
| Full reconstructed image | Report RGB/alpha max/mean, differing-pixel fraction on union of effect masks plus full-frame changes, bounds/centroid and time residual | No synchronized whole-skill baseline supports a pass or overall SSIM score yet; establish backend-wide raster tolerances before approval |
| Runtime | Exact prepared event sequence plus no duplicate/canceled callbacks or retained graphics/resources after action/reset | Existing adapted-game controls; new backend needs its own integration checks |

Do not align/crop/resize/exposure-correct individual skills to reduce error. A frame number without native simulation identity is not a reference match. Native readback stalls and hardware/sampler differences must be recorded as conditions, not silently normalized.

### No-repeat policy and persistent update protocol

Store a result identity from relevant parser/compiler/simulator/compositor and harness hashes, transitive source identities, native/reference hashes, capability flags, scenario/RNG/deltas/camera/viewport and output profile. Reuse a result unchanged when these inputs match. Re-export a native reference only if it is invalidated or a named required datum is missing. A new port, note or duplicate ready/arm test is not a new condition.

For every relevant milestone, update: affected P/X records, exact active profile, source/scenario identities, knowledge versus implementation/integration/validation gaps, test command/result/skip count and reference availability, measured residuals, regressions and complete-source/skill counts. Update the matrix/tally and critical path only after evidence changes. Raw dumps/APKs/full receipts stay ignored; retain durable findings, hashes and reproduction instructions here/linked reports. Missing local references or skipped native cases are **not** a fidelity pass.

Progress scoreboard: complete effects, complete source-derived skills, accepted characters, held-out imports needing no renderer change, unresolved required capabilities, first-divergence stage/residual and reference coverage. Helper-test counts are supporting evidence, never the headline.

## 12. Complete document and test registers

The following registers record all pre-existing research reports and inventoried test files. They are evidence/navigation indexes, not new test results. Historical recommendations are subordinate to this map's current next step. See R bundles and P records for their conservative interpretation.

### Research document register (82 pre-existing files)

| Report | Components | Evidence boundary |
| --- | --- | --- |
| [ancestor-locator-observer.md](ancestor-locator-observer.md) | P17 P29 | Observer preparation/result; earlier rollback and later subset must remain distinct |
| [ancestor-locator-result.md](ancestor-locator-result.md) | P17 P29 | Observer preparation/result; earlier rollback and later subset must remain distinct |
| [bishamon-web-sdk-inquiry.md](bishamon-web-sdk-inquiry.md) | X02 P29 | Backend decision/feasibility history; no working universal native/browser backend implied |
| [blade-beam-preview.md](blade-beam-preview.md) | P26 P27 P28 | Reviewed game presentation/adaptation and historical gameplay checks |
| [blade-beam-source-geometry.md](blade-beam-source-geometry.md) | P20 P26 X02 | UV/conversion evidence versus explicit artwork adaptation |
| [bmb-fixed-parameters.md](bmb-fixed-parameters.md) | P07 P08 | Known original binary fields/layouts, not complete runtime semantics |
| [bmb-materials-models.md](bmb-materials-models.md) | P07 P08 | Known original binary fields/layouts, not complete runtime semantics |
| [bmb-structural-reader.md](bmb-structural-reader.md) | P07 P08 | Known original binary fields/layouts, not complete runtime semantics |
| [bmb-vector-channels.md](bmb-vector-channels.md) | P07 P08 | Known original binary fields/layouts, not complete runtime semantics |
| [bound-effect-host.md](bound-effect-host.md) | P23 P24 P25 | Measured host contract and bounded compositor integration |
| [brave-slash-composed-preview.md](brave-slash-composed-preview.md) | P03 P04 P05 P26 | Command/source composition, process and form identity |
| [brave-slash-connected-combat.md](brave-slash-connected-combat.md) | P09 P13 P17 P18 | Complete selected chains under fixtures; full mapped-source lifecycle still open |
| [brave-slash-integration.md](brave-slash-integration.md) | P26 P27 P28 | Reviewed game presentation/adaptation and historical gameplay checks |
| [brave-slash-native-review.md](brave-slash-native-review.md) | P18 P21 P24 P25 P29 | Attributed visual differences; node omission is diagnostic only |
| [brave-slash-white-flash.md](brave-slash-white-flash.md) | P18 P21 P24 P25 P29 | Attributed visual differences; node omission is diagnostic only |
| [browser-original-renderer-feasibility.md](browser-original-renderer-feasibility.md) | X02 P29 | Backend decision/feasibility history; no working universal native/browser backend implied |
| [character-animation-audit.md](character-animation-audit.md) | P02 P11 P26 | Exact body forms/tracks and admitted animation-state checks |
| [climhazzard-original-feasibility.md](climhazzard-original-feasibility.md) | P06 P08 X02 | Actual recovered assets and renderer-format feasibility, not skill acceptance |
| [climhazzard-rectangle-investigation.md](climhazzard-rectangle-investigation.md) | P18 P21 P24 P25 P29 | Attributed visual differences; node omission is diagnostic only |
| [cloud-skill-effects.json](cloud-skill-effects.json) | P02 P03 P05 P10 | Historical source/availability/recipe records |
| [cloud-skill-effects.md](cloud-skill-effects.md) | P02 P03 P05 P10 | Historical source/availability/recipe records |
| [cloud-version-comparison.md](cloud-version-comparison.md) | P02 P11 P26 | Exact body forms/tracks and admitted animation-state checks |
| [command-planning-and-hud.md](command-planning-and-hud.md) | P25 P26 P28 | Product UI/action/scene history; current target is PC |
| [connected-effect-export.md](connected-effect-export.md) | P13 P14 P17 P18 P29 | Complete admitted simple effects under explicit adapters; Capsule is not a skill |
| [connected-second-effect.md](connected-second-effect.md) | P13 P14 P17 P18 P29 | Complete admitted simple effects under explicit adapters; Capsule is not a skill |
| [cross-slash-uv-repair.md](cross-slash-uv-repair.md) | P20 P26 X02 | UV/conversion evidence versus explicit artwork adaptation |
| [effect-host-compositor.md](effect-host-compositor.md) | P23 P24 P25 | Measured host contract and bounded compositor integration |
| [effect-host-context.md](effect-host-context.md) | P23 P24 P25 | Measured host contract and bounded compositor integration |
| [effect-orientation.md](effect-orientation.md) | P20 P26 X02 | UV/conversion evidence versus explicit artwork adaptation |
| [live-native-gpu-export.md](live-native-gpu-export.md) | P22 P29 X02 | First native pixel state; later blend-run result is in architecture audit/map |
| [memorial-client-access.md](memorial-client-access.md) | P01 P29 X02 | Exact-build inventory/diagnostic access history |
| [missing-effect-sources.md](missing-effect-sources.md) | P06 P08 X02 | Actual recovered assets and renderer-format feasibility, not skill acceptance |
| [model-vertex-rgba.md](model-vertex-rgba.md) | P17 P19 P21 | Color/alpha source evidence and limited shared preview candidates |
| [mvp-skill-audit.json](mvp-skill-audit.json) | P02 P03 P05 P10 | Historical source/availability/recipe records |
| [mvp-skill-audit.md](mvp-skill-audit.md) | P02 P03 P05 P10 | Historical source/availability/recipe records |
| [native-blend-global-uniforms.md](native-blend-global-uniforms.md) | P19 P21 P22 | Native factors/shader family/global defaults with bounded activation |
| [native-camera-comparison.md](native-camera-comparison.md) | P18 P23 P24 P29 | Geometry-to-screen and source/context-aligned comparisons |
| [native-draw-submission.md](native-draw-submission.md) | P13 P22 P23 P25 P29 | Calibrated context/GL/root joins; revision23 supersedes earlier strobe observation gap |
| [native-effect-placement.md](native-effect-placement.md) | P05 P23 | Selected placement rules and original global geometry multiplier |
| [native-export-feasibility.md](native-export-feasibility.md) | X02 P29 | Backend decision/feasibility history; no working universal native/browser backend implied |
| [native-hit-profiles.md](native-hit-profiles.md) | P03 P04 P05 P26 | Command/source composition, process and form identity |
| [native-material-selection.md](native-material-selection.md) | P08 P09 P19 P21 | Pinned shader descriptors and initial material selection, not all live overrides |
| [native-model-basic-material.md](native-model-basic-material.md) | P08 P09 P19 P21 | Pinned shader descriptors and initial material selection, not all live overrides |
| [native-null-parent-chains.md](native-null-parent-chains.md) | P09 P13 P17 P18 | Complete selected chains under fixtures; full mapped-source lifecycle still open |
| [native-particle-assignment.md](native-particle-assignment.md) | P09 P13 P16 | Source module arrays/records and gated complete init/update chains |
| [native-particle-chains.md](native-particle-chains.md) | P09 P13 P16 | Source module arrays/records and gated complete init/update chains |
| [native-particle-material-evidence.md](native-particle-material-evidence.md) | P17 P19 P21 | Color/alpha source evidence and limited shared preview candidates |
| [native-particle-module-dataflow.md](native-particle-module-dataflow.md) | P09 P15 P16 P18 | Original parameter-to-writer X/constant subset and bounded display gates |
| [native-particle-node34-capture.md](native-particle-node34-capture.md) | P18 P21 P29 | Original writer/alpha observations and reconstructed-input geometry reference |
| [native-particle-phases.md](native-particle-phases.md) | P12 P13 P14 P15 | Original constant generator lifecycle/RNG/delta evidence under fixtures |
| [native-particle-scheduling.md](native-particle-scheduling.md) | P12 P13 P14 P15 | Original constant generator lifecycle/RNG/delta evidence under fixtures |
| [native-particle-source-dispatch.md](native-particle-source-dispatch.md) | P09 P15 P16 P18 | Original parameter-to-writer X/constant subset and bounded display gates |
| [native-particle-writer-offline-reference.md](native-particle-writer-offline-reference.md) | P18 P21 P29 | Original writer/alpha observations and reconstructed-input geometry reference |
| [native-particle-x-preview.md](native-particle-x-preview.md) | P09 P15 P16 P18 | Original parameter-to-writer X/constant subset and bounded display gates |
| [native-particle-x-scale.md](native-particle-x-scale.md) | P09 P15 P16 P18 | Original parameter-to-writer X/constant subset and bounded display gates |
| [native-pipeline-context-observer.md](native-pipeline-context-observer.md) | P13 P22 P23 P25 P29 | Calibrated context/GL/root joins; revision23 supersedes earlier strobe observation gap |
| [native-renderer-scale.md](native-renderer-scale.md) | P05 P23 | Selected placement rules and original global geometry multiplier |
| [native-scalar-alpha-preview.md](native-scalar-alpha-preview.md) | P16 P21 P30 | Original scalar equation versus its explicit source/profile-gated integration |
| [native-scalar-alpha.md](native-scalar-alpha.md) | P16 P21 P30 | Original scalar equation versus its explicit source/profile-gated integration |
| [native-viewport-current.md](native-viewport-current.md) | P18 P23 P24 P29 | Geometry-to-screen and source/context-aligned comparisons |
| [native-zscreen-offline-reference.md](native-zscreen-offline-reference.md) | P17 P18 P24 | Native locator/geometry boundaries and unverified wider variants |
| [null-locator-subset.md](null-locator-subset.md) | P17 P18 P24 | Native locator/geometry boundaries and unverified wider variants |
| [original-appearance-review.md](original-appearance-review.md) | P17 P19 P21 | Color/alpha source evidence and limited shared preview candidates |
| [original-composition-audit.md](original-composition-audit.md) | P03 P04 P05 P26 | Command/source composition, process and form identity |
| [original-inheritance-review.md](original-inheritance-review.md) | P17 P19 P21 | Color/alpha source evidence and limited shared preview candidates |
| [original-particle-geometry-audit.md](original-particle-geometry-audit.md) | P17 P18 P24 | Native locator/geometry boundaries and unverified wider variants |
| [original-renderer-feature-audit.md](original-renderer-feature-audit.md) | P01 P10 P30 | Architecture/current-vs-historical coverage and explicit missing integration |
| [original-skill-playback.md](original-skill-playback.md) | P07 P10 P16 P18 | Shared prepared/player experiments; not published complete native skills |
| [particle-geometry-subset.md](particle-geometry-subset.md) | P17 P18 P24 | Native locator/geometry boundaries and unverified wider variants |
| [particle-locator-projection.md](particle-locator-projection.md) | P18 P23 P24 P29 | Geometry-to-screen and source/context-aligned comparisons |
| [portrait-battle-layout.md](portrait-battle-layout.md) | P25 P26 P28 | Product UI/action/scene history; current target is PC |
| [preview-host-scene-contract.md](preview-host-scene-contract.md) | P23 P24 P25 P26 | Explicit scene contract and adapted host placement controls |
| [renderer-backend-decision.md](renderer-backend-decision.md) | X02 P29 | Backend decision/feasibility history; no working universal native/browser backend implied |
| [renderer-coverage-priorities.md](renderer-coverage-priorities.md) | P01 P10 P30 | Architecture/current-vs-historical coverage and explicit missing integration |
| [satellite-beam-import.md](satellite-beam-import.md) | P26 P27 P28 | Reviewed game presentation/adaptation and historical gameplay checks |
| [screen-anchor-host-reference.md](screen-anchor-host-reference.md) | P23 P24 P25 P26 | Explicit scene contract and adapted host placement controls |
| [shader-add-material.md](shader-add-material.md) | P19 P21 P22 | Native factors/shader family/global defaults with bounded activation |
| [shared-skill-import-review.md](shared-skill-import-review.md) | P07 P10 P16 P18 | Shared prepared/player experiments; not published complete native skills |
| [skill-batch.md](skill-batch.md) | P10 P27 P28 | Reviewed converted-effect queue, caching and publication separation |
| [skill-pipeline-architecture-audit.md](skill-pipeline-architecture-audit.md) | P01 P10 P30 | Architecture/current-vs-historical coverage and explicit missing integration |
| [skill-pipeline-foundation.md](skill-pipeline-foundation.md) | P02 P10 P28 X03 | Product visual/operation separation and future skill learning/rewards |
| [white-plane-viewport-ui.md](white-plane-viewport-ui.md) | P18 P21 P24 P25 P29 | Attributed visual differences; node omission is diagnostic only |

### Test source register (57 files; no new execution)

A local-reference skip marker means a successful runner exit may still omit original-code comparisons. No-skip-marker does not mean a native implementation executes: observer/request tests can test guards only. The named assertions identify scope; R bundles link historical result reports.

| Test source | Components | Representative assertion / condition |
| --- | --- | --- |
| [tools/memorial/test_ancestor_locator.py](../../tools/memorial/test_ancestor_locator.py) | P17 P29 | test_descendant_tail_is_excluded_without_relabeling; test_foreign_or_reordered_prefix_fails |
| [tools/memorial/test_camera_projection.py](../../tools/memorial/test_camera_projection.py) | P24 P29 | test_orthographic_corners_and_center; test_z_does_not_resize_orthographic_points |
| [tools/memorial/test_connected_effect.py](../../tools/memorial/test_connected_effect.py) | P13 P14 P17 P18 P25 P29 | test_complete_source_traversal_to_packed_vertex_stream; test_init_update_make_share_record_consumption_and_lifetime_finishes; local reference/dependency skips possible |
| [tools/memorial/test_null_assignment_reference.py](../../tools/memorial/test_null_assignment_reference.py) | P09 P13 P17 P29 | test_all_four_complete_init_update_arrays_and_locator_outputs_execute; test_source_random_rotation_and_uniform_scale_are_native_not_fit_values; local reference/dependency skips possible |
| [tools/memorial/test_particle_assignment_reference.py](../../tools/memorial/test_particle_assignment_reference.py) | P09 P13 P29 | test_all_existing_sources_resolve_to_defined_ordered_modules; test_scale_and_rotation_agree_with_previously_verified_relocation_tables; local reference/dependency skips possible |
| [tools/memorial/test_particle_chain_reference.py](../../tools/memorial/test_particle_chain_reference.py) | P13 P16 P29 | test_source_chain_coverage_and_cursor_bounds; test_unreviewed_resource_and_translation_curve_inputs_stay_blocked; local reference/dependency skips possible |
| [tools/memorial/test_particle_modules_reference.py](../../tools/memorial/test_particle_modules_reference.py) | P15 P16 P18 P29 | test_native_init_equations_and_rng; test_const_ranges_still_advance_rng; local reference/dependency skips possible |
| [tools/memorial/test_particle_phase_reference.py](../../tools/memorial/test_particle_phase_reference.py) | P12 P13 P14 P29 | test_postupdate_persists_delay_while_update_only_reads_it; test_initial_negative_age_and_same_step_catchup; local reference/dependency skips possible |
| [tools/memorial/test_particle_scheduler_reference.py](../../tools/memorial/test_particle_scheduler_reference.py) | P12 P14 P15 P29 | test_activation_uses_symmetric_exclusive_modulo_and_consumes_zero_range_rng; test_fractional_interval_and_ceil_limit; local reference/dependency skips possible |
| [tools/memorial/test_particle_trace.py](../../tools/memorial/test_particle_trace.py) | P01 P29 | test_partial_source_identity_and_missing_alpha_stay_explicit; test_foreign_callback_cannot_become_source_node_evidence |
| [tools/memorial/test_particle_writer_reference.py](../../tools/memorial/test_particle_writer_reference.py) | P18 P29 | test_reference_identity; test_48_differential_geometry_cases; local reference/dependency skips possible |
| [tools/memorial/test_particle_x_reference.py](../../tools/memorial/test_particle_x_reference.py) | P15 P16 P18 P29 | test_36_native_chains_match_scalar_equations; test_group_yz_are_ignored_even_when_nonuniform; local reference/dependency skips possible |
| [tools/memorial/test_pipeline_context.py](../../tools/memorial/test_pipeline_context.py) | P01 P13 P23 P29 | test_disjoint_update_prefix_is_reported_without_claiming_a_replay; test_a_contiguous_prefix_with_wrong_native_output_is_rejected; local reference/dependency skips possible |
| [tools/memorial/test_quad_assignment_reference.py](../../tools/memorial/test_quad_assignment_reference.py) | P09 P13 P18 P20 P29 | test_all_four_quads_use_quad_wrappers_and_matching_native_profile; test_full_init_update_lists_execute_without_record_overrun; local reference/dependency skips possible |
| [tools/memorial/test_scalar_alpha_plan.py](../../tools/memorial/test_scalar_alpha_plan.py) | P10 P16 P21 | test_separate_candidate_keeps_original_and_nonparticle_nodes_unchanged; test_modified_source_keys_or_effect_hash_reject; local reference/dependency skips possible |
| [tools/test_bmb_channels.py](../../tools/test_bmb_channels.py) | P07 P16 | test_dormant_texture_alpha_does_not_activate_unknown_curve; test_axis_order_tangents_and_input_preservation |
| [tools/test_bmb_distortion.py](../../tools/test_bmb_distortion.py) | P07 P19 P20 | test_source_pairs_compare_fixed_fields_modes_and_color_curves; test_source_mutation_is_detected; local reference/dependency skips possible |
| [tools/test_bmb_materials.py](../../tools/test_bmb_materials.py) | P07 P19 | test_model_controls_and_alpha_match_source; test_unknown_controls_are_not_replaced |
| [tools/test_bmb_parameters.py](../../tools/test_bmb_parameters.py) | P07 P09 | test_fixed_vector_component_order_and_modes; test_texture_layers_and_pivots_stay_separate |
| [tools/test_bmb_quad_colors.py](../../tools/test_bmb_quad_colors.py) | P07 P21 | test_source_pairs_cover_flat_and_independent_corner_values; test_source_mutation_is_rejected; local reference/dependency skips possible |
| [tools/test_bmb_shared_skills.py](../../tools/test_bmb_shared_skills.py) | P07 P10 | test_full_known_source_comparison_preserves_dormant_curves; local reference/dependency skips possible |
| [tools/test_bmb_structure.py](../../tools/test_bmb_structure.py) | P07 | test_resource_is_taken_from_table_not_arbitrary_strings; test_invalid_offsets_and_truncation_are_rejected |
| [tools/test_compose_skill_effects.py](../../tools/test_compose_skill_effects.py) | P03 P04 | test_matches_recorded_brave_slash_command; test_uses_latest_start_instead_of_fixed_two_frame_offset |
| [tools/test_effect_project.py](../../tools/test_effect_project.py) | P20 P27 | test_editor_round_trip_preserves_unicode_values_and_nested_nodes; test_truncated_effect_is_rejected |
| [tools/test_m3r.py](../../tools/test_m3r.py) | P08 P19 | test_native_submesh_uv_and_embedded_texture_references; test_mesh_attributes_padding_and_input_preservation |
| [tools/test_native_material_selection.py](../../tools/test_native_material_selection.py) | P09 P19 | test_package_reads_declared_sources_not_regex_matches; test_bad_ranges_terminators_and_tail_rejected |
| [tools/test_native_particle_dispatch.py](../../tools/test_native_particle_dispatch.py) | P09 P18 | test_absent_module_is_distinct_from_uninspected_index; test_native_const_targets_match_executed_modules; local reference/dependency skips possible |
| [tools/test_native_projection.py](../../tools/test_native_projection.py) | P23 P24 P29 | test_explicit_selection_keeps_input_flags_and_source_clock_unchanged; test_different_build_scale_and_ambiguous_effect_fail |
| [tools/test_original_appearance.py](../../tools/test_original_appearance.py) | P07 P21 | test_brave_dormant_keys_are_preserved_without_activating; test_strobe_white_uses_explicit_authoring_selector; local reference/dependency skips possible |
| [tools/test_original_basic_material.py](../../tools/test_original_basic_material.py) | P19 P21 | test_constant_source_tint_and_missing_source_boundary; test_random_and_animated_tints_are_not_defaulted; local reference/dependency skips possible |
| [tools/test_original_inheritance.py](../../tools/test_original_inheritance.py) | P07 P17 P21 | test_source_controls_and_root_compatibility_are_preserved; test_malformed_rates_fail_without_partially_attaching; local reference/dependency skips possible |
| [tools/test_original_texture_layers.py](../../tools/test_original_texture_layers.py) | P07 P20 | test_source_pair_supplies_independent_scale_and_address; test_mismatched_source_binding_is_rejected; local reference/dependency skips possible |
| [tools/test_original_texture_mapping.py](../../tools/test_original_texture_mapping.py) | P07 P20 | test_wave_uv_vectors_and_supported_modes_match_original_sources; test_source_less_mapping_is_explicitly_unsupported; local reference/dependency skips possible |
| [tools/memorial/test_live_effect_export.mjs](../../tools/memorial/test_live_effect_export.mjs) | P22 X02 | live redraw requests select one reviewed file and bounded ascending draw samples; paths, unknown effects and unbounded sampling fail before rendering; request/guard checks, not export-fidelity proof |
| [tools/memorial/test_locator_observer.mjs](../../tools/memorial/test_locator_observer.mjs) | P17 P29 | context snapshots preserve unavailable fields as null with reasons, never identity/zero substitutes; locator callback is bounded by an active scope and pre |
| [tools/memorial/test_native_export_probe.mjs](../../tools/memorial/test_native_export_probe.mjs) | X02 | two distinct native effects use the same bounded request contract; unsafe paths, unknown sources and unbounded or unordered stepping reject before native e; request/guard checks, not export-fidelity proof |
| [tools/memorial/test_particle_observer.mjs](../../tools/memorial/test_particle_observer.mjs) | P18 P21 P29 | alpha callback preserves Frida read-only CPU context and reads the explicit vertex pointer; an installed module can be reused after instrumentation changes |
| [tools/memorial/test_pipeline_observer.mjs](../../tools/memorial/test_pipeline_observer.mjs) | P13 P22 P29 | native context, record start and RNG owner stay joined across callback execution; descendant callbacks with a different parameter are rejected rather than  |
| [tools/test_character_pipeline.mjs](../../tools/test_character_pipeline.mjs) | P02 P11 P27 | three-field effects use the native target anchor default without rewriting raw input; batch cache invalidates changed recipes, source, resources and sheets |
| [tools/test_combat_regressions.mjs](../../tools/test_combat_regressions.mjs) | P11 P26 P28 | HP is the sole source of truth for hero K.O.; first and intermediate K.O. heroes are skipped |
| [tools/test_effect_host_context.mjs](../../tools/test_effect_host_context.mjs) | P23 P25 | engine Y conversion is independent of camera and framebuffer dimensions; randomized source axes require explicit scatter rather than silently inventing nat; local reference/dependency skips possible |
| [tools/test_model_vertex_rgba.mjs](../../tools/test_model_vertex_rgba.mjs) | P08 P21 | source RGBA remains normalized bytes and preserves an existing material shader hook; malformed source colors and mismatched vertex counts fail explicitly |
| [tools/test_native_basic_material.mjs](../../tools/test_native_basic_material.mjs) | P19 P21 | Basic tint requires exact native identity and supported source controls; Basic clamping follows model RGBA and the legacy branch stays selectable |
| [tools/test_native_blend.mjs](../../tools/test_native_blend.mjs) | P22 P25 | native alpha factors follow glBlendFunc rather than Three presets; disabled and inverse-color factors retain their exact alpha components |
| [tools/test_native_particle_x.mjs](../../tools/test_native_particle_x.mjs) | P16 P18 | shared X display agrees with original ARM64 OneX/ConstX writer output; real OneX hierarchy keeps simulation center and changes square display extents; local reference/dependency skips possible |
| [tools/test_native_scalar_alpha.mjs](../../tools/test_native_scalar_alpha.mjs) | P16 P21 | native scalar alpha matches original instructions across modes, endpoints, tangents and clamps; native alpha helper is separate from experimental vector-co; local reference/dependency skips possible |
| [tools/test_native_zscreen.mjs](../../tools/test_native_zscreen.mjs) | P17 P18 | shared ZScreen basis agrees with offline execution of pinned ARM64 instructions; source-dispatched hierarchy changes basis order without moving its center; local reference/dependency skips possible |
| [tools/test_null_locator.mjs](../../tools/test_null_locator.mjs) | P17 | source gate accepts the measured subset and rejects unknown modes, roll, parent tilt, scale and compatibility; only enabled source Billboard ancestors neut |
| [tools/test_original_appearance.mjs](../../tools/test_original_appearance.mjs) | P16 P21 | source selector makes dormant alpha keys irrelevant and uses Curve instead of multiplying Constant; selected RGB curves override the constant value and rea; local reference/dependency skips possible |
| [tools/test_original_effect_player.mjs](../../tools/test_original_effect_player.mjs) | P12 P14 P16 P18 P26 | native renderer scale uses the measured reference without changing placement offsets; source rectangle placement reproduces captured wave and blue-slash in |
| [tools/test_original_inheritance.mjs](../../tools/test_original_inheritance.mjs) | P17 P21 | zero alpha influence preserves local alpha; unsupported rates preserve explicit legacy behavior; birth translation retains live rotation and scale while lo; local reference/dependency skips possible |
| [tools/test_original_texture_mapping.mjs](../../tools/test_original_texture_mapping.mjs) | P20 | basic map uses source angle/pivot and toggles back without stale GPU matrix state; explicit constant UV mode suppresses dormant velocity; unsupported mappi; local reference/dependency skips possible |
| [tools/test_particle_geometry.mjs](../../tools/test_particle_geometry.mjs) | P18 | display plane keeps center and size under XY tilt without changing simulation matrices; measured native half-extents are reproduced independently of the un |
| [tools/test_particle_locator.mjs](../../tools/test_particle_locator.mjs) | P17 P18 P24 | projection independently reproduces native logical corners and ignores Z under the recorded orthographic setup; bounds reject missing/nonfinite data instea |
| [tools/test_preview_host_view.mjs](../../tools/test_preview_host_view.mjs) | P23 P24 P25 | host coordinate conversions retain actor pixels under different camera centers; game host declares foreground separately from the unchanged world view; local reference/dependency skips possible |
| [tools/test_renderer_coverage.mjs](../../tools/test_renderer_coverage.mjs) | P30 | nonwhite vertex data requires RGBA handling; opaque-white control does not; withheld ancestor excludes descendant from draw candidates while retaining its  |
| [tools/test_shader_add.mjs](../../tools/test_shader_add.mjs) | P19 P20 P21 | distortion alpha candidate requires exact initial native selection; native selection gates Add by exact fragment identity and does not guess unsupported ty |

## 13. Management summary

For a universal, verifiable visual FFBE skill pipeline this map identifies **30 core components:5 INTEGRIERT,0 VERSTANDEN,25 TEILWEISE,0 UNBEKANNT** at component-contract level. Three separate branches are also mapped: audio TEILWEISE (metadata only), native pixel export TEILWEISE and run-skill/reward progression TEILWEISE. There are many unknown required subrules inside the partially known core components.

The next three decisive works are: **(1)** one complete source/plan/reference contract, **(2)** connect lifecycle/phases/RNG/parents into a complete mapped effect instead of more isolated helpers, **(3)** render that full effect through the shared material/host contract and repeat on the rest of the first skill. Full original skill acceptance, publication and held-out expansion then have explicit gates above. No new renderer capability was implemented or declared passed by writing this map.
