# Skill reconstruction and export runbook

## Current: first Limit Burst (Cloud, Omnislash) and visual approximation mode (2026-11-07)

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
<python> tools/prepare_original_preview.py --source tools/data/omnislash-20261107/intake/cloud-207000105/skill-source.json --unit cloud --motion atk --recipe tools/characters/cloud.json --profile source-preview-v1 --authoring-directory assets/battle_effect --native-shaders-apk tools/data/memorial-audit/installed-base-v208.apk --native-shader-package tools/data/particle-native-audit/bmshaderpack.bin --renderer-reference tools/data/memorial-audit/diagnostic-v7/renderer-reference.json --approximate-unverified --output tools/data/omnislash-20261107/intake/cloud-207000105/plan.json
node tools/publish_scene_presentations.mjs --recipe tools/presentations/cloud-omnislash.json
node tools/import_character.mjs --recipe tools/characters/cloud.json --publish-skills-only --python <python>
```
Staging still reports the strict audit blockers (unverified curves); they are expected
and covered by the approximation list. Approximations in this plan: 35x
Texture1_Color_Scale_Rgb curve, 14x Rotate curve, 7x Texture1_Translate curve, 2x animated
texture color, 17x anchor mode 3 (caster-unit), 8x Null rotation raw 6 = On and 8x type-2 scale raw 0 =
Off taken from the authoring projects. Visual check: headless Chrome frames of the full action.


Reviewed Source effect-group sound publication now validates source identity,
group fingerprints, common-bank dispatch, visual clock bounds and PCM hashes.
Use [Source combat audio](research/source-combat-audio.md) for admission and
validation details. Visual plans and gameplay timing have independent contracts.

## Current: rank complete release paths including form and placement (2026-11-01)

Iai Strike personally accepted;15 Source skills preserved,0 new releases.
Existing-roster intake may use --current-form: formLearning bounds native master
rarity/maxLv and ordinary acquisition, after published body/recipe identity check.
Later/conditional/unknown paths fail closed; census shortlists remain series-only.
Prior reviewed gameplay is not rewritten. Unknown original anchors independently
block planning/intake rather than becoming a silent target/caster fallback.

Current Barret207000205 is classic5-star: four ordinary abilities plus own LB;
three other series abilities are6-star. Full paths in ROSTER_SKILL_COVERAGE.md.
Mindblow's12-node missing authoring is NOT its sole gate: moving anchor6,
caster/enemy placement and MP drain remain. Big Shot is the shortest documented
Barret overall path, not a certified one-step release. Store's flat=false Quads
have neutral white/zero-range inputs, not an authored visible gradient. Explicit
neutral admission, tilted/nonuniform-parent Billboard output and priority-order
integration still need a complete proof before publication.

Use handbook commands; evidence tools/data/barret-path-20261101.11 targeted Node
tests pass. Runtime/public assets and recipes stay unchanged; reuse existing
battle/build/Cloud visual results with hash checks instead of identical reruns.
No new native pixel comparison, GPU campaign, audio work or authoring fallback.

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

Reproduce preparation with the original source recipe, then publish the standalone
presentation and run --publish-skills-only; never publish a passing VFX by itself:

```powershell
node tools/plan_source_imports.mjs --select jack:200300 --compose-unit-effects --output tools/data/full-import-path-20261101/iai-intake
python tools/stage_source_imports.py --selection tools/data/full-import-path-20261101/iai-intake/selection.json
node tools/publish_scene_presentations.mjs --recipe tools/presentations/iai-strike-import.json
node tools/import_character.mjs --recipe tools/characters/jack.json --publish-skills-only --python <checked-python>
```

Before publication the plan is regenerated with prepare_original_preview.py:
--source .../iai-intake/jack-200300/skill-source.json --unit jack --motion magic_atk
--recipe tools/characters/jack.json --profile source-preview-v1
--authoring-directory assets/battle_effect --native-shaders-apk
tools/data/memorial-audit/installed-base-v208.apk --native-shader-package
tools/data/particle-native-audit/bmshaderpack.bin --renderer-reference
tools/data/memorial-audit/diagnostic-v7/renderer-reference.json
--output .../iai-intake/jack-200300/plan.json.

The new prepared-events intake profile requires exact original F45 clock and
original scope review, no ordinary damage track, one explicit instant event per
source hit and a reviewed Motion2/no-prefix composition. It does not auto-decode
process112 or authorize all Motion2/instant-death abilities. Original descriptions
and version identity must be reviewed independently of names.

---

Earlier revision notes (historical; current resume above takes precedence):

## Grouped intake controls and explicit partial comparisons (2026-11-01)

Four newly verified intake fields: Quad parent colorRate516; Particle parent
rotation508; Model parent translation568/scale576. See bmb_source_controls.py
for per-layout enum tables. These extend coverage/source comparison, not stable
Prepared metadata, parent equations or publication. No defaults for unknown
enums, matrix influence, compatibility, appearance, emission or texture controls.
Sparse Quad scale0 evidence is retained separately, not admitted in this change.

Reproduce with the existing Python environment/PYTHONPATH and ignored sources:

```powershell
& $py tools/audit_bmb_controls.py --corpus tools/data/control-groups-20261101/strict-corpus.json --output tools/data/control-groups-20261101/control-comparison.json
& $py tools/audit_bmb_controls.py --corpus tools/data/control-groups-20261101/expanded-corpus.json --intake-only --output tools/data/control-groups-20261101/independent-group-reproduction.json
& $py tools/stage_source_imports.py --selection tools/data/import-decision-20261028/candidates/control-group-selection.json
& $py tools/stage_source_imports.py --selection tools/data/roster-expansion-20261101/remaining-magic/control-group-selection.json
node tools/inventory_roster_skills.mjs --control-audit tools/data/control-groups-20261101/control-comparison.json --output tools/data/control-groups-20261101/coverage
```

strict-corpus.json retains the27 pairs from the previous Big Shot receipt.
Do not accidentally substitute the older22-pair discovery corpus. Strict result:
469 nodes/1823 values/zero differences. --intake-only uses a DISTINCT schema:
48 pairs/1151 nodes/812 intake values/zero differences; checks type/order, life,
parent hierarchy and typed resource sets, but not materials or active curves.
Full48-project comparison is blocked by an unhandled active texture-color curve.
Twelve other enum observations remain unknown. The partial result cannot retire
strict authoring blockers or certify a whole effect.

The13 ability candidates plus Reraise receive new coverage via the existing
hash-checked staging route;14 benefit, zero whole-skill unlocks. Preserve old
candidate-audit.json; the named selection creates its own audit receipt.

Native Store200210 execution17861 provides a bounded self-placement example:
same caster/target object, group5000090/category3, member start41, scale1 and
rotation0. rectangle_for_group(3,'self') reuses target-unit. All other mode3
scopes reject. Runtime zero scatter/host sprite footprint remain reviewed
FFRogue policies. Do not infer generic caster mode3 behavior on enemy/party skills.

Store's complete effect audit finds3 active non-flat Quads and3 Billboard models;
the flatRGB path rejects them. No Store publication or proposed charge/risk
balance change is active. The draft and its passing isolated gameplay/build
checks are under tools/data/control-groups-20261101/charge-draft/, not runtime
support. Big Shot pose-template matches are suggestive only; actual Motion8
body reservations/clip transitions are still required before choreography review.

Validation: test_bmb_source_controls and test_source_prepare_profile (8 tests),
source staging/flat color/Quad tests (7),23 targeted Node checks and build pass.
All src/public/character-recipe files match98091bb (250 files); existing browser
baseline/area/party receipts remain valid, not rerun without changed inputs.
Served freshness checks9 modules on3001. No new visual-fidelity claim.

## Flat Quad RGB admission and reproduction (2026-11-01)

Use --flat-quad-rgb with the existing source-preview-v1 preparation command only
for exact matched Constant/flat Quad sources. The importer verifies raw RGBA,
flat/mode and project identity, then compiles RGB value/range separately from
alpha. Curve/non-flat modes reject this profile rather than becoming white or a
constant approximation. Other source-appearance/alpha paths are unchanged.

native-flat-quad-rgb-v1 reuses the proven native RGB initializer. Its seeds are
reviewed-color-streams-v1 host policy; original emitter RNG ownership is unknown.
Do not mix the new color stream into transform/member sampling or multiply corner
RGBA A into the independent alpha curve. Per-instance colors remain constant over
life for ConstFlat; existing dynamic alpha still changes visibility.

stage_source_imports now emits colorPreparation.preparationArguments and raw
flatRgbNodes, plus outsideFlatRgbProfile. These are preparation hints, not support
or publication approval. Mixed unsupported profiles remain review/blocker work.
This begins automatic color-feature discovery without republishing other skills.

Sword reproduction: current handoff command with source delita-1323010,
--motion atk and --flat-quad-rgb; output tools/data/sword-color-20261101/plan.json.
Publish tools/presentations/existing-roster-support.json. Retain placement API,
member stream keys and source starts unchanged. Only this plan opts in.
After a shared-player change, update provenance hashes; review frozen GPU frames
before changing identity alarms. Current3 Cloud frames have0 changed pixels.
Source QA uses3001/sink3155 and verifies9 current modules, not an old cached tab.


## Current bounded control intake / Helm Break (2026-11-01)

Particle3 translation parent selector504 is decoded by read_intake_controls for
source comparison/coverage only.0=On,1=OnGenerateTime; unknown enum is not a
fallback. This does not rewrite stable Prepared nodes or activate authoring-free
playback. Use current tools/data/big-shot-20261101/control-comparison.json for
--control-audit; older parser hashes are stale.27 pairs/1503 matched values,
58 additional selector comparisons; no new inheritance equation is claimed.

Helm Break202190 uses source-preview-v1 with matched authoring and the exact
Delita attack composition. Source marker40 +prefix40 yields event80. Reviewed
gameplay and body/position contracts are explicit in tools/characters/delita.json
and tools/presentations/helm-break-import.json. Publish using the existing
publish_scene_presentations then import_character --publish-skills-only commands.
No new body sheets or runtime engine were introduced. Existing13 commands and
Source manifests remain unchanged.14 technical/11 personally accepted.

Big Shot remains deferred after the bounded cycle: measured target rectangle and
existing explosion pass, but raw Hardshot controls and Motion8 body/timing do not.
Do not infer a clip from its ID or substitute a projectile. Reraise's effect-only
plan is preserved; MAGIC/body, friendly single target and auto-revive remain open.

Browser gate:3001 plus current product-freshness sink3154. Run the new command
catalog paging check with reserve=delita, reserve lifecycle for both single-target
breaks, friendly and area regressions. Run frozen Cloud baseline WITHOUT reserve;
the harness now rejects the wrong party before comparing images. Preserve the
shared receipt after each completed test before another check overwrites it.


## Main-party curve intake and current-source QA (2026-11-01)

See the current handbook/handoff for exact commands.13 skills remain playable,
11 personally accepted; no source presentation or game code changed.

tools/bmb_channels.py now reads Particle3 scaleValue1392 and Model6 scaleSpeed1472.
Raw52-byte key data, tangents and interpolation IDs compare against matched source;
seven curves/26 keys are newly read. Empty new slots remain sparse. Texture1/2
RGB/alpha value curves are authoring-dormant ONLY under explicit Constant modes;
unknown/selected modes stay gated. Full original curve evaluation is not implied.

Existing audit_bmb_controls.py now records projectComparison/parserInputs. Reuse
extended-comparison.json only while all parser, binary and project hashes match:
node tools/inventory_roster_skills.mjs --control-audit tools/data/main-party-import-20261101/extended-comparison.json --output tools/data/main-party-import-20261101/coverage

Only exact-source stale authoring-comparison diagnostics are retired; ambiguous
versions and all other gates survive. Nine diagnostics for eight main-party
commands are superseded, not eight import approvals. Reraise's81-node effect plan
now prepares, but negative-55 timing, MAGIC choreography, single-ally targeting,
auto-revive and render findings remain. Big Shot still lacks hardshot controls.
Neither is published. Original gameplay/source and future audio stay separate.

Before browser QA run check_dev_server.mjs against3001. Start the existing preview
receipt server on3154 with --game-origin http://127.0.0.1:3001. The test page now
requires its product-freshness endpoint before combat; old sinks fail closed.
Served code is checked via Vite source maps, with import URL rewrites normalized.
Reload browser instances; cached manifests and frozen-frame checks remain required.
Use /tools/test-source-scene.html?captureOrigin=http://127.0.0.1:3154 on3001.

64 Node tests,21 Python tests and build pass.27 matched pairs/469 nodes/1445 known
parent values compare;3 frozen images0 changed pixels. No fresh full-skill or
native visual claim. Next import target is Big Shot's exact hardshot controls,
then independent Motion8/body/placement review; do not invent missing values.

## Current placement contracts and Delita native review (2026-11-01)

Supersedes the earlier support-wave placement claims below. Thirteen skills stay
technically published; eleven are personally accepted. Daniel likes both new
Delita effects but their spatial presentation awaits his renewed visual review.
No new skill or character is published in this block.

Native revision35 was used directly through ADB in FFBE Trace, without APK/data
changes. Exact Chant210550 uses the right-side rectangle [320,0,320,666], axis2/2,
offset[0,240]. API Y increases downwards. Evaluate source axes and offsets BEFORE
conversion to the Three Y-up world. The old host performed that conversion too
early, sending the positive offset upwards. Both source front/back members now
use the measured coordinate convention, while the current arena bounds remain
an explicit FFRogue adaptation. Do not center this side effect on living allies.

Cunning Hero's Sword1323010 uses each target's effect rectangle, not a group
centroid. Native getEffectDispRect is [1,240,282,261] for the observed Golden Bomb;
nine created slash objects lie within8 units of its center[142,370.5]. The host
still uses reviewed sprite footprints, NOT reconstructed native target-touch
bounds. Original offsets stay[0,0]. A random node1 Z rotation turns node2's
50-unit child displacement. The old preview reused the same seed for all nine
objects, cloning this one-sided sample. The opt-in reviewed-member-streams-v1
policy now separates stable member/target replay samples. This is an explicit
FFRogue deterministic sampling policy; original seed ownership/construction is
UNKNOWN. Never describe its hash mixer as original FFBE RNG semantics.

Publication uses existing tools/publish_scene_presentations.mjs with binding
placementCoordinates=ffbe-screen-api and a nonempty placementReview. The plan
stores rectanglePlacement.coordinateSystem/coordinateReview. Optional member
randomness requires its separate randomnessReview. Unknown policies fail closed;
no global offset, rescale, geometry, texture, material or source-time rewrite.
Only the two Delita bindings opt in. All eleven old plans retain the historical
placement/sampling path; their only manifest change is shared player provenance.

Importer validateImportPlacement requires new bindings to declare reviewed
coordinates independently of validateActionChoreography and VFX coverage. Exact
already-published command identity/binding may retain historical coordinates;
this exception cannot certify a new ID, kind or scene. Caster/independent-origin
rectangles, native touch bounds, arbitrary camera zoom/rotation and original RNG
seeding are NOT newly supported. Existing camera guard remains in force.

Reproduction:
- node --test tools/test_source_placement.mjs plus the prior scene/choreography/
  friendly/import/combat suites. Four new tests; final suite60 passes.
- npm run build;34 modules, existing large-chunk advisory.
- Start a fresh Vite server on3001 if3000 serves stale transforms. Do not kill the
  old server without resolving the existing automatic-review restriction.
- node tools/preview_original_skill.mjs --plan tools/data/braver-20261101/source/plan.json --port 3153 --game-origin http://127.0.0.1:3001
- Open http://127.0.0.1:3001/tools/test-source-scene.html?reserve=delita&captureOrigin=http://127.0.0.1:3153
  and run placement, friendly and area checks. Use default party for frozen and
  guard checks. Receipts are under tools/data/delita-placement-20261101/.
  --game-origin remains loopback-only; the sink's default3000 origin is unchanged.

Native evidence, limits and valid recordings are documented in
research/native-effect-placement.md. Preserve both native MP4s, source events,
original before receipt, final-placement.json and comparison PNGs. Their native
and game frames use different formations/effect ages: spatial evidence, NOT a
pixel comparison or proof of whole-action native timing.

## Existing-roster support and area import wave (2026-11-01)

All eleven older Source commands are now personally accepted. Delita gains Chant
210550 and Cunning Hero's Sword1323010: thirteen technically battle-tested Source
skills, eleven personally accepted, no new character. Default party and reserve
selection are unchanged. See [roster coverage](research/ROSTER_SKILL_COVERAGE.md)
and the latest handoff for every original acquisition, resource count and blocker.

Use `node tools/inventory_roster_skills.mjs` for the read-only registered-roster
view. It reuses the hashed global census and candidate receipts; it does not
certify unpublished actions, original per-form eligibility or nested dispatches.
Its `tools/data/roster-expansion-20261101/coverage/inventory.json` preserves raw
rows and learning requirements. The tracked coverage table is its coverage.md.

New explicit `prepared-friendly` profile: stationary `party`, reviewed
`allyTargeting` (living-allies or other-living-allies), finite heal events and
optional positive nonlethal hpCost. A friendlyTargetReview must preserve and
explain the exact original target/range strings. Motion2 zero-prefix source
markers are still checked. There is no blanket MAGIC import or target decoder.
Unknown body semantics never produce an implicit attack. Costs/healing are
reviewed balance; original process rows remain immutable evidence.

The bridge admits 1/2/3 friendly recipients through the existing player. Its
target-side host rectangle uses the party half of the arena. Models, native
offsets, textures, UVs and materials are unchanged. Party scope is not a new
renderer, all-screen rescale, revive contract or arbitrary friendly selector.

Complete source preparation/coverage examples and original receipts:
`tools/data/roster-expansion-20261101/support-intake/delita-210550/` and
`tools/data/roster-expansion-20261101/follow-up/delita-1323010/`.
Use the existing prepare_original_preview.py --profile source-preview-v1 with
the final tools/characters/delita.json, exact checked body receipt, matched
authoring and existing shader/reference inputs. Current recipe provenance will
change its hash, not authorize changed VFX. Keep prior plans archived.

Publish only reviewed complete plans with publish_scene_presentations.mjs,
then `node tools/import_character.mjs --recipe tools/characters/delita.json
--publish-skills-only --python <working-python.exe>`. Do not reexport or overwrite
accepted bodies. Binding recipes preserve exact source IDs and plan paths.

Run Node test_friendly_skills plus the existing import/choreography/combat/scene
regressions. Python source preparation/composition/staging tests remain required.
In `/tools/test-source-scene.html?reserve=delita&captureOrigin=http://127.0.0.1:3152`
use friendly healing lifecycle and reserve area multihit checks. Run the frozen
baseline and unavailable/combat cleanup checks with the DEFAULT Barret party.
The sink is the existing preview_original_skill.mjs server, not a new exporter.
New visual samples prove actual product playback, not native pixel fidelity.

## First resumed import wave: complete prefixes and explicit choreography (2026-11-01)

All9 earlier Source skills are now personally accepted, including corrected Braver.
Two additional commands are technically complete/battle-tested, pending personal
review: Delita Shield Break202180 (F80/MP12/2x/+20% physical vulnerability3 phases),
Jack Piercing Gleam203050 (F91/MP11/1.4x/+15%3 phases). Complete2/3 source members,
30 nodes each; no omitted drawable or substitute primitive. Original process rows
and learning requirements remain provenance. Reviewed body/balance adaptations
are labeled as such; no new native whole-skill fidelity or generic body mapping.

New batch option (ordinary ABILITY composition only):

```powershell
node tools/plan_source_imports.mjs --select delita:202180,jack:203050 --compose-unit-effects --output tools/data/import-wave-20261101/new-batch
& $py tools/stage_source_imports.py --selection tools/data/import-wave-20261101/new-batch/selection.json
```

The common composeEffectFrames + existing resolve_composed_skill perform exact
unit/skill composition. Per-item intakeBlockers prevent staging an incomplete
skill-only plan after a failed prefix/branch resolution. Unsupported entries stay
in the audit, not silently skipped, and do not abort other candidates. MAGIC
composition remains outside this bounded option. No publication approval inferred.

Reproduce the reviewed plans using prepare_original_preview --profile
source-preview-v1, exact source receipt/recipe and --unit-assets from the checked
body-preparation receipt. The session's prepare.py records both complete commands;
it has already run, so inspect before rerunning. Native shader/renderer references
and matching original projects are the same preserved inputs as earlier skills.

```powershell
node tools/publish_scene_presentations.mjs --recipe tools/presentations/physical-import-wave.json
node tools/import_character.mjs --recipe tools/characters/delita.json --publish --python $py
node tools/import_character.mjs --recipe tools/characters/jack.json --publish --python $py
node --test tools/test_import_wave.mjs tools/test_action_choreography.mjs
```

Actual BattleScene: test-source-scene.html?reserve=delita&captureOrigin=http://127.0.0.1:3152
or reserve=jack -> Check imported reserve lifecycle. The existing preview server
on3152 is the receipt sink; preserve receipt.json after each run.53 Node/10 Python
checks pass,3 frozen Cloud frames0 differences. Native182/180 and earlier unchanged
9 full-action results reused. No new native capture/pixel-perfect research.

Body import remains independent of VFX availability. Warrior of Light201000104
Armor Eraser206510 stages complete visuals but fails positive-duration idle-body
validation. No0->1 timing guess or publication. Pure Motion1 non-damage marker
composition is still unsupported; it affects Armor Eraser and Defense Kill among
the saved candidates, but does NOT guarantee either import before owner/body/
prefix review. Fencer's skill-only overlap concealed a missing authored unit
prefix; the new complete-composition batch makes that blocker explicit.

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


### Current choreography import contract

Every imported Source recipe must supply actionChoreography with explicit review
basis, exact sourceMotionType/sourceMoveType, readiness, movement/travel timing and
body mode. `body: {mode:"rest"}` means NO attack clip; `body: {mode:"clips",
phases:[{frame:0,clip:"atk"}]}` explicitly requests it. Multiple ordered phases
must not overlap their actual exported clip durations. Unknown modes are rejected.
Effects continue using their existing scene manifest/member timeline. Damage and
support retain separate reviewed frame tracks. An effect rendering successfully
does not prove actor choreography or whole-skill acceptance.

For new profiles, record original body evidence or an explicit reviewed gameplay
adaptation; do not default from motionType/name. Check actual clip requests, target
movement, damage/status clocks, MP, recovery, victory/wave and cancellation in the
production BattleScene before calling the complete skill accepted. Braver's review
is based on Daniel's direct Memorial comparison; its quantitative step extent/time
remain declared adaptations. Eight older whole-action baselines remain preserved.

Reproduce checks:

```powershell
node --test tools/test_action_choreography.mjs tools/test_combat_regressions.mjs tools/test_scene_migration.mjs
node tools/import_character.mjs --recipe tools/characters/cloud_ac.json --publish-skills-only --python $py
```

Metadata-only publication preserves the accepted scene manifests/textures/body
sheets. Do not re-prepare/re-publish Braver's old full atk preview to fix body
choreography. Test tools may normalize the changed recipe provenance hash when
comparing old VFX plans, but must independently verify that hash and compare every
remaining field. This never authorizes geometry/material/VFX changes.

## Shared Source preparation and Braver reproduction (2026-11-01)

Braver233930 is the ninth technically playable Source skill; Daniel has accepted
the prior8. This remains the accepted experimental visual profile, not a newly
verified native animation. Unknown billboard/parent/material rules stay explicit
in tools/data/braver-20261101/coverage.json. No source node/member was omitted.

The new zero-prefix Motion2 damage compiler checks exact command/motion/effect
composition and complete100-percent hit markers. It does not require unused unit
effect data. Motion1 still requires its exact unit prefix/max-start offset. Unknown
motion types, malformed markers, changed IDs/timelines and nonzero Motion2 offset
fail closed. Original damage/break values remain provenance; recipes own gameplay.

PowerShell reproduction (set $py to the available Python interpreter):

```powershell
$py='C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
$env:PYTHONUTF8='1'
$env:PYTHONPATH='tools;tools/memorial'
& $py tools/compose_skill_effects.py --unit-id 207001605 --skill-id 233930 --output tools/data/braver-20261101/composition.json
node tools/resolve_composed_skill.mjs --composition tools/data/braver-20261101/composition.json --report tools/data/characters/cloud_ac/report.json --output tools/data/braver-20261101/composed-report.json
& $py tools/stage_original_skill.py --report tools/data/braver-20261101/composed-report.json --skill-id 233930 --output tools/data/braver-20261101/source
# Reuse checked offline body; on a fresh machine use --prepare-body-only first.
$body=(Get-Content tools/data/characters/cloud_ac/body-preparation.json | ConvertFrom-Json).directory
& $py tools/prepare_original_preview.py --source tools/data/braver-20261101/source/skill-source.json --unit cloud_ac --unit-assets $body --motion atk --recipe tools/characters/cloud_ac.json --profile source-preview-v1 --authoring-directory assets/battle_effect --native-shaders-apk tools/data/memorial-audit/installed-base-v208.apk --native-shader-package tools/data/particle-native-audit/bmshaderpack.bin --renderer-reference tools/data/memorial-audit/diagnostic-v7/renderer-reference.json --output tools/data/braver-20261101/source/plan.json
# Inspect/audit the full profile before these publication operations.
node tools/publish_scene_presentations.mjs --recipe tools/presentations/cloud-ac.json --python $py
node tools/import_character.mjs --recipe tools/characters/cloud_ac.json --publish --python $py
node --test tools/test_source_import_profiles.mjs tools/test_skill_damage_timeline.mjs
& $py -m unittest tools/test_source_prepare_profile.py
node tools/plan_source_imports.mjs --shortlist-catalog tools/data/source-only-20261028/catalog/inventory.json --output tools/data/braver-20261101/shortlist
```

The preset requires explicit matched-authoring directory, reviewed recipe, pinned
shader and renderer evidence; it never guesses missing controls or approves a
publication. Braver, Armor Break and Aura Ball reproduce their full saved plans.
Shortlisting reuses the pinned census/current publications and ranks effect NAME
overlap only. Exact resource versions, form ownership, unit-prefix composition,
gameplay and productive battle checks remain mandatory.51 candidates,0 guaranteed
additional imports. Three newly inspected AC follow-ups remain blocked; see handoff.

Browser: /tools/test-source-scene.html?reserve=cloud_ac&captureOrigin=http://127.0.0.1:3152
-> Check Source party skills / Check imported reserve lifecycle. Existing preview
server --plan tools/data/braver-20261101/source/plan.json --port3152 saves the receipt;
copy each receipt before the next run. Use DEFAULT party for frozen comparisons.
Node48/Python9/build and browser receipts are pinned in validation.json. Historical
182/180 native writer result reused because original player/native code unchanged.

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

## Current: eight playable Source skills and new-character bootstrap (2026-10-28)

Daniel personally accepts all six prior Source skills, including Seal Evil and
Trigger Smash. Two new commands, Cloud of Darkness203000803 Armor Break201150
and Aura Ball203280, use the same prepared player in actual combat.8 technically
playable;6 personally accepted,2 ready for personal review. No new native whole-
skill fidelity or unsupported BMB profile is claimed.

Shared Source events now combine damage and enemy statuses, damage first at an
equal frame, with locked targets/cancellation. Physical vulnerability and attack
reduction refresh strongest and expire by enemy phases. Exact original parameters
remain separate from recipe-owned balance. Character:* intake enumerates all owned
active commands (11 here), without publication approval;9 still retain blockers.

New-character bootstrap: --prepare-body-only stages/validates sprites without
publishing. prepare_original_preview.py --unit-assets consumes that checked body
and verifies its identity before the usual reviewed presentation/character publish.
Registered reserves are playable via ?reserve=cloud_of_darkness in the third slot;
default Cloud/Aerith/Barret stays intact. No per-character loader, new renderer,
curve guess or missing visual replacement. See current map/handoff for evidence,
known preview approximations and exact reproduction commands.

Reproduce using the preserved skill-seven-eight supplement and existing Python:

```powershell
node tools/plan_source_imports.mjs --select 'cloud_of_darkness:*' --output tools/data/cod-review
python tools/stage_source_imports.py --selection tools/data/cod-review/selection.json
# Stage body before publishing a NEW character; read directory from body-preparation.json.
node tools/import_character.mjs --recipe tools/characters/cloud_of_darkness.json --prepare-body-only
# Preserved prepare-armor.py / prepare-aura.py use --unit-assets and exact matching projects.
python tools/data/skill-seven-eight-20261028/prepare-armor.py
python tools/data/skill-seven-eight-20261028/prepare-aura.py
node tools/publish_scene_presentations.mjs --recipe tools/presentations/cloud-of-darkness.json --publish
node tools/import_character.mjs --recipe tools/characters/cloud_of_darkness.json --publish
node --test tools/test_enemy_event_tracks.mjs tools/test_skill_support.mjs tools/test_combat_regressions.mjs
```

Existing characters should use --publish-skills-only instead of rebaking sprites.
Preserved preparation scripts refer to the frozen staging-body copy in the local
supplement. For a fresh preparation use the new body-preparation.json.directory
as --unit-assets; require the same body/source hashes. The two recipes retain
every original member and audio group. Test actual gameplay using
test-source-scene.html?reserve=cloud_of_darkness&captureOrigin=http://127.0.0.1:3152
-> Check playable reserve skills (start the existing receipt sink first).
The base game URL with ?reserve=cloud_of_darkness uses the same production path.

## Current: Source self buffs and measured import decision (2026-10-28)

Trigger Smash227151 is the sixth functionally/visually inspected Source command,
using the shared original player; personal approval pending for it and Seal Evil.
Review-owned allyEvents currently admit stationary SELF only, not arbitrary party
skills. Actor host bindings and the existing event/cancellation clock are reused;
MP55 once/no HP damage/x1.5 physical through3 future rounds. Original cooldown,
linked ability/stat/break parameters are preserved separately. Optional damageType
separates gameplay lanes from body pose; legacy defaults remain unchanged.
No missing effect, replacement primitive or skill-specific renderer correction.

The common importer also exports existing native Null init input words with
mandatory parent/child context.11 source records/two originals and160 block cases
agree; no compatibility defaults, authoring-free profile or skill unlock from this
alone. The13-slot/1102-value regression remains exact.

Meteor is explicitly deferred (resources present, multiple independent semantic/
selected-renderer gaps).28 candidates audited;26 remain blocked after Seal/Trigger.
Authoring inputs affect24,type7 eleven,active curves9; affected counts are NOT
predicted complete imports. Lifestream additionally needs process-indexed timeline
support and party/reraise/barrier gameplay, not merely its curve. Unknown types,
curves, versions and branches still block. Audio metadata retained; no new sound,
music/background or original recording work. See the map's latest entry/evidence.

Reproduce from the preserved input supplement using the existing tools/runtime:

```powershell
$env:PYTHONPATH='tools'
python tools/data/import-decision-20261028/prepare-trigger.py
node tools/publish_scene_presentations.mjs --recipe tools/presentations/cloud-trigger-smash.json --publish
node tools/import_character.mjs --recipe tools/characters/cloud.json --publish-skills-only
node --test tools/test_hero_buffs.mjs tools/test_null_initialization_flags.mjs tools/test_combat_regressions.mjs tools/test_scene_migration.mjs
```

No sprite rebake or per-character loader. Existing reviewed costs/events remain
unchanged. Check the actual Source battle via test-source-scene.html -> Check
playable self buff, then existing Source/Legacy/frozen baseline controls. Native
pixel approval is separate. The scene recipe is source-identified and Source-only;
no Legacy body-only replacement. Repeated publication is not an approval substitute.
Process-indexed effect branches now appear as explicit intake blockers; no branch
is dropped or blindly flattened. Raw audio references remain non-playing metadata.

## Current: verified binary controls and separate original commands (2026-10-28)

The common parser now reads a bounded13-slot parent/Null control subset directly
from01010301 BMBs. It compares them to matching authoring and uses decoded values
for those fields in preparation; unresolved modes/compatibility are still explicit
authoring dependencies. No authoring-free preparation or additional skill is admitted.
Meteor has109 decoded values, but remains blocked; all five existing visuals remain
unchanged. See the map's current entry for the field table and exact missing inputs.

Reproduce from the immutable local bmb-source-controls supplement (no raw re-extraction):

```powershell
$env:PYTHONPATH='tools'
python tools/audit_bmb_controls.py --corpus tools/data/bmb-controls-20261028/discovery.json --output tools/data/bmb-controls-review/comparison.json
python -m unittest tools/test_bmb_source_controls.py tools/test_original_inheritance.py tools/test_bmb_structure.py tools/test_bmb_parameters.py tools/test_source_import_staging.py tools/test_original_appearance.py
node --test tools/test_bmb_controls_replay.mjs tools/test_source_command_metadata.mjs
```

The frozen corpus includes22 checked pairs/343nodes/1102values, both input hashes,
raw offsets and rejected-candidate reasons. The supplemental archive retains all
pairs. Missing corpus/replay fixtures are explicit optional skips, never a pass.
`sourceControls` is field provenance, NOT playback approval. Unknown enum codes,
missing compatibility, active curves, unsupported types or resource versions still
block complete imports. Do not repeat broad discovery or apply profile defaults.

Metadata-only Source publication also retains originalCommand with the exact raw
master row and DB identity, separate from gameplayReview and recipe-owned costs,
damage/status events and targeting. Raw original processes never execute as our
game rules. Seal was metadata-only updated; prior game fields/Legacy commands and
all five visual manifests remain unchanged. AudioSource remains a separate,
non-playing metadata lane with unresolved resources; no sound guesses.

## Current import: fifth Source command and explicit audio metadata (2026-10-28)

Seal Evil229751 is a checked fifth Source command (Aerith207000405), beyond the four
Cloud commands Daniel accepted. It reuses the original prepared player, not a new
renderer. New reviewed supportEvents carry status actions on the same cancellable
Source clock; mixed damage/support tracks remain unsupported. The recipe owns
balance/status expiry; raw FFBE metadata is evidence, not our damage/stat formula.
Source-only guards prevent silent body-only Legacy replacement. Existing Legacy
commands and sprites remain intact. Details/evidence: latest reconstruction map.

Reproduce using the preserved local research supplement (Python companion runtime
path or any compatible Python with the existing tools dependencies):

```powershell
node tools/plan_source_imports.mjs --select aerith:229751 --output tools/data/seal-review
# Existing checked stage/plan can be reused; do not overwrite it needlessly.
python tools/stage_source_imports.py --selection tools/data/seal-review/selection.json
python tools/data/skill-expansion-20261028/prepare-seal.py
node tools/publish_scene_presentations.mjs --recipe tools/presentations/aerith-seal-evil.json --publish
node tools/import_character.mjs --recipe tools/characters/aerith.json --publish-skills-only
node --test tools/test_skill_support.mjs tools/test_character_pipeline.mjs tools/test_scene_migration.mjs tools/test_combat_regressions.mjs
```

The preserved prepare-seal.py names all original source/authoring/native shader
inputs and explicit preview flags; the immutable supplement retains the plan,
inputs and output receipts. No rebake is needed for existing sprites. Unit/name,
PNG geometry and prior skill IDs are checked before legacy body provenance can
be adopted. Metadata publication is not visual approval by itself. Use actual
`tools/test-source-scene.html` -> Check playable support spell and existing Cloud/
Legacy/baseline checks for game acceptance. A final post-coverage receipt is45;
earlier44 remains before-state evidence, not the final visual result.

`stage_original_skill.py` accepts duplicate archive original members ONLY if every
payload has the same SHA256. Different hashes remain unresolved. Recipes cannot
select a version by newest name. All checked aliases are retained in the receipt.
This does not waive texture-version ambiguity or missing authoring/curve support.
Meteor38-node source/all12resources exist; missing authoring-independent selectors
are a PARSER/SEMANTIC blocker, not evidence of a missing original runtime effect.

Audio inventory (bounded, no playback):

```powershell
python tools/audit_audio_inventory.py --output tools/data/audio-review/inventory.json
```

Optional --live-se-sha256 records an independently obtained ADB checksum; the tool
does not contact an emulator itself. Current snapshot:8 WAVs;250 UTF-header bank
candidates plus2 unclassified XML-header .acb files;126 .dat UNCLASSIFIED. No codec
or SoundID->CueID join is established. Do not assign WAVs by filenames.
`audioSource` schema ffbe-audio-source-v1 retains serialized Source-clock sound
frames, IDs, raw parameters, unresolved issues/nullable resources and
playbackSupported:false. All sound-bearing resolved groups are collected, including
sound-only groups; unexplained non-file groups block preparation. Older plan
coverage is explicitly legacy-partial-groups. Audio is not inferred from hit times;
SFX, music and background animation remain independent. No audio reconstruction
or changes to old damage timelines are authorized by this metadata milestone.

## Playable Source command and metadata-only import update (2026-10-28)

Cross Slash is the fourth functionally checked Source command (the other three
retain Daniel's accepted baseline). It reuses the preserved original-BMB preview;
no converted EFKE UV repair is stacked onto source UVs. Generic reviewed damage
fractions/frames, Source-only admission, locked-target cancellation and paged
commands now execute in BattleScene. Metadata-only character publication is
available with --publish-skills-only: existing sprites/commands are validated and
preserved. Motion-1 weights/times derive through source-damage-events.mjs; balance,
target policy and visual review remain recipe decisions. No original chain or
full native-fidelity claim. Existing scene publishing admits explicitly reviewed,
hash-checked flat uniform unit-XY Model backdrop roles through arenaSurfaces;
this is a viewport adaptation, not a native flag or an automatic fit of all models.
See the current reconstruction map for commands, receipts and next blockers.
Eight playable Source skills remain unachieved. Meteor Rain's exact authoring
supplement and Trigger Smash's process semantics are explicit gates, not silent
fallbacks. Barret remains a Legacy/data control, not an original capture reference.

## Current bounded transfer and import automation (2026-10-28)

Capsule's static Default-parent / OneX / neutral Basic profile now executes in the
same Live-Player and actual BattleScene technical control.123 reference states,
2178 exact position values and cleanup are checked; no native Capsule pixels or
whole-engine traversal claim. Explicit host/seed and matched authoring remain
inputs. See the current reconstruction map and connected-second-effect report.
Accepted playable Source skill count remains3; Capsule/Cross Slash controls do
not increase it. Batch owned-skill selection and hash-checked dependency staging
now produce explicit per-candidate blockers through plan_source_imports.mjs and
stage_source_imports.py. They never publish by availability alone. Five additional
Legacy candidates expose types4/7, model/active-curve or missing-authoring gates;
Cross Slash is the nearest existing composed preview to review for real play.
Next is a general multi-event gameplay schedule/menu capacity, not RGB polishing.

## Product update: flash presentation and gameplay completion (2026-10-28)

The current three Cloud visuals are accepted. Pixel-perfect polishing is not a
standalone priority. tools/prepare_scene_flashes.py and the scene publisher admit
an explicit reviewed uniform-opaque-particle-arena policy; only hash-checked,
uniform Basic Particle textures receive presentationCoverage metadata. This is
a game viewport adaptation, not an original screen-space flag. Patterned or
unreviewed data is never automatically fitted. The live bridge compensates
camera translation for those planes and clips them to the actual arena.
Gameplay completes after body recovery and reviewed damage/projectiles; finite
decorative effects may continue until replaced or cleared at a scene boundary.
See the current reconstruction map for actual three-size/three-skill tests and
timings. No new skill is counted by this milestone; Legacy is preserved.

## Current: verified texture-version selection (2026-10-28)

The remaining white-source pixel mismatch was mostly a resource-version issue:
native CPU/GPU bytes match three existing PNGs, not the staged tutorial palette
versions. The shared offline upload preparer accepts complete hash-pinned source
bindings; the existing Live-Player consumes the generated bytes without shader
changes. Recipe: tools/effects/verified_native_textures.json (controlled reference,
approved:false; no global name precedence or automatic published migration).
Twelve matched frames improve black weighted RGB0.178946270 ->0.000357365,
maxRGB2, zero pixels above2; nine frames exact RGBA on all backgrounds.
Actual BattleScene opt-in verified; ordinary Cloud baselines/Legacy preserved.
See [the reconstruction map](research/SKILL_RECONSTRUCTION_MAP.md) for exact
inputs, commands, limits and acceptance. Next transfer target is Capsule's
OneX/Basic branch with tilted constant Default parents; current live admission
does not yet support that whole profile. No universal fidelity claim.

Explicit preparation:

```powershell
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' tools/memorial/prepare_texture_upload.py --fixture tools/data/memorial-audit/diagnostic-v35-render-context/pixel-fixture-j.json --resource-bindings tools/effects/verified_native_textures.json --output tools/data/memorial-audit/diagnostic-v36-texture-state/verified-reproduction
```

Binding keys cover exactly the plan texture URLs. The logical old URL is only
the retained plan binding key; selection.sourceSha256 identifies the newly
selected PNG. Hash agreement with an original CPU upload is required by this
reference recipe, not inferred from a filename. Raw dumps remain offline.

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

## Historical entries (superseded where noted above)
## Current: live FFBE frames, native upload semantics and bounded pixel comparison (2026-10-28)

This supersedes the earlier wallpaper/startup-blocked and missing-runJ entries.
Diagnostic35/build-r4/export revision7 is restored and actually executes the
original battle. Windows capture remains stale; direct Android framebuffer and
ADB touch/swipe show a working title, menu and Golden Bomb Rush. No uninstall,
data clear, root or asset removal occurred; UID10107 and original Vulkan/OpenGL
configuration are retained. Do not infer an app hang from a Windows capture.

RunJ supplies actual isolated original GPU outputs for visible source frames1..12
on black/white/transparent, empty frames13..17, and a complete21-frame CPU trace.
Pixel frames18..21 were NOT captured. The shared simulator still reproduces
180/182 writer packets exactly; the same2 tiny inherited position differences
remain. A controlled white-effect substitution and measured scene/seeds are
explicit: this is NOT a whole unmodified Brave Slash reference.

The SAME common player now supports optional measured GL_LINEAR sampling and
offline-prepared Cocos integer-premultiplied RGBA8 uploads, admitted only by the
partial native packet profile. Ordinary Cloud plans and Legacy are unchanged.
Native integer alpha code agrees for2560 synthetic pixels; the prepared path is
also exercised in actual BattleScene. Black signal-union mean RGB error falls
from16.688 to1.923 atF1 and15.201 to0.453 atF6; NOT pixel-identical. All3 frozen
Cloud checks retain0 changed pixels; full Source/Legacy combat review passes.

Main remaining image blocker: original GPU order is2,4,3,6,8, versus source DFS
2,3,4,6,8. An experimental stable-blend-bucket order reducesF1 mean error to0.273
but is NOT integrated or accepted as original semantics. Reconstruct the original
command sorting rule next; preserve actual blend/depth/texture alias behavior.
Evidence, reproduction and detailed limits are in the map's newest entry and
tools/data/memorial-audit/diagnostic-v35-render-context/pixel-comparison-summary-j.json.
Full nine-node acceptance remains0/9; no automatic skill migration was enabled.

## Historical entries (superseded where noted above)
Current live writer verification (2026-10-28): diagnostic35/runI measures all182
actual writer buffers across21 frames, including draw-basis/UV-trim pointees.
Shared simulation reproduces180 exactly and retains SAME2 tiny center residuals;
UVs/RGBA/tints exact. Native computed matrices are not runtime inputs. Seeds/root
pose remain explicit external conditions. GPU images are still missing because
controlled source identity differed from the outer wrapper filename. Exact wrapper
binding is fixed/tested/installed (r4/revision7), awaiting one prepared skill to
exercise. User is away; autonomous app/Trace-VM restart completed, but the game
view remains on wallpaper. RunJ is disarmed until a usable game view exists.
No new runtime renderer change/native pixel claim in this continuation.
See map newest entry and tools/compare_native_writer_trace.mjs.


Current render-context extension (2026-10-28, after6ab0858): bounded Particle
packets support finite affine draw axes and independent atlas rectangles for
UV1/UV2.12 synthetic original-instruction controls match exactly. Shared packet
materials now consume a separate UV2 vertex attribute; a cropped-UV1 GPU control
matches the unchanged native Add fragment exactly, while the former UV1-derived
path fails it. Ordinary Cloud previews/Legacy are unchanged; frozen frames have
0 changed pixels. The182-window/180-exact baseline remains intact. Diagnostic35
is installed/calibrated with render-context/writer hooks and GPU export ready,
but a NEW live measurement is still pending the user's prepared Brave Slash.
Boot readiness is NOT proof that deferred writer hooks have fired. See the map
and diagnostic-v35-render-context receipts; full-effect native pixels unverified.

Current connected Particle packet integration (2026-10-28): the existing shared
player now admits a prepared finite Null -> VelocityX Particle two-texture branch
alongside the four Quad branches. All 182 CPU make windows retain source-child /
creation order. Original instruction replay verifies 150 Particle writer outputs;
independent parents produce 148 exact packets plus the SAME two tiny inherited
center residuals. UVs/RGBA/tints are exact in all150. Actual BattleScene review
checks six frames,67 packets,1206 world-buffer values and natural cleanup. Cloud
frozen frames remain0 changed pixels; ordinary skills/Legacy are unchanged.
Full trim, identity Particle draw basis, neutral tints, alpha1/global color1,
measured initial seeds and reviewed dispatch are explicit conditional inputs.
No full nine-node/native-pixel approval or automatic skill migration. See the
map's newest entry and particle-packet-integration receipts.

Current bounded Quad packet integration (2026-10-27): prepared nativeQuadBranches
profiles now connect independently computed parents1/5 to drawable2/3/4/6 in the
SAME player/scene bridge.32 full packets match original instruction replay and
32 live record/RNG/primitive-center states match H. Product frames/natural end
pass; ordinary Cloud baselines remain0 changed pixels. Texture trim/global color
are EXPLICIT conditional inputs. CPU order derives from source-child DFS and
passes H comparisons; live GPU order/pixels remain unverified. The
Particle7->8 branch and full graph remain gated. Use map's newest entry and the
quad-render-integration receipts; no new skill/reward binding was published.

Current independent-parent extension (2026-10-26): diagnostic34 captured targeted
full records/direct parent values in connected run H. --independent-parent now
calculates source1 from parameters/initial RNG/root scene inputs, not its native
matrix.21 transforms and the40-byte init record match exactly. Node7 matrices and
node8 X make-input group scales also follow that common calculation. Two known
projection residuals remain; source8 two-texture writer/UV/material packets and
full graph admission remain open. Productive Cloud assets/player are unchanged.
See the map's newest entry and diagnostic-v34-lifecycle measurement/comparison
receipts; no new visual-original-fidelity claim.

Current connected module integration (2026-10-26): initializeNativeVector now
supports explicit captured-separate-f32 ColorConst/UVConst/TranslationVelocity
records. Null retained-module iteration is distinct from age advancement. The
record-only comparison matches2094 events and3210 numerical values, preserving
the1734-event/600-scalar baseline. World projection is NOT certified:2/540
coordinates differ (max0.00006103515625) with native parent matrices supplied.
The productive finite Particle profile safely admits a trailing ColorConst;
actual RGB tint/state/cleanup checks pass. Whole nine-node playback stays gated.
See the map's nine-node N/S/P matrix and module-world-comparison.json for exact
input boundaries, current blockers and reproduction. Raw RGB ranges are now
exported without selecting modules; approved Cloud plans/assets are unchanged.

Connected scalar verification now shares initializeNativeScalar/updateNativeScalar
with productive Particle playback. All600 scalar values across300 source G
observations match exactly, alongside1734 scheduler events. The final replay uses
measured dispatch and initial seeds; other module outputs remain partial. See the
map's newest entry and parent-scalar-comparison.json. No global graph enablement,
new asset publication or visible Cloud change is implied; frozen frames are intact.

Current parent-scheduler integration: common NativeGeneratorOwner Update/Post
now serves productive finite Particle playback. A bounded source Null/Particle
projection reproduces1734 ordered run-G events and15 records using two initial
seeds, with no later RNG resets. Parent expiry freezes existing child state.
Observed dispatch/RNG-only module bodies and host activation remain explicit
reference inputs; complete graph/geometry/release support is still missing.
Use trace_bmb_lifecycle.mjs --native-run ... --compare-generators for the reusable
JSON mismatch report. Cloud frozen frames and9 actual combat casts pass;
0/9 complete source nodes, no new visual fidelity claim. See the map's current
entry for commands, evidence, numeric module-state results and the next context gap.

Current reconstruction map: [SKILL_RECONSTRUCTION_MAP.md](research/SKILL_RECONSTRUCTION_MAP.md).
Its component contracts, evidence/status rules, critical path and milestone
acceptance supersede older next-step recommendations below. Read/update it for
relevant changes; isolated original-function tests do not establish integration.

Current connected-reference gate: run G now supplies a controlled original
21-step mixed-source execution; source node0 is a host joint and8 emitters own
22 generator activations. Audit with trace_bmb_lifecycle.mjs --native-run and the
map's pinned plan/activation reference. Keep measured intervening RNG draws
separate from implemented scheduler behavior. NativeGeneratorOwner is shared
with productive finite Particle playback; multi-record parent-gated traversal is
not enabled in Cloud. Newly prepared plans retain header rootLifecycle metadata;
do not use it as total effect duration. The accepted Cloud frozen pixel baseline
is unchanged. Use existing G records before asking for another native capture.

Current priority: controlled **live preview migration**. User authorization now
allows explicit experimental preview manifests in gameplay, without calling them
native-complete effects. Use the current map entry, the shared player under src,
`tools/publish_scene_presentations.mjs` and`/tools/test-source-scene.html`.
Earlier "do not publish previews" gates below describe native-fidelity acceptance,
not a prohibition on this newly reviewed experimental mode. Retain Legacy and
all pre-migration archives. No per-skill render handlers or damage/chaining import.

Source choreography now separates body recovery, effect lifetime and reviewed
damage completion. Preserve the user-confirmed Cloud visual baseline archived in
the map's body/effect checkpoint. Scope/movement admission must pass consistently
at publication, import inspection and before MP use. Use the existing product QA
page's separate interruption/admission controls; do not repeat native tests merely
because choreography changed. Prepared movement is still a reviewed adaptation.

Visual recovery checkpoint: the original-reference corpus is Cloud's Brave Slash,
Blade Beam and Climhazzard. Satellite has no BlueStacks reference and is only a
product-history regression. See the map's visual preservation section for all44
retained plans, archived code/SDK/resources, current isolated replays and the
missing historical pixel-identity evidence. New captures record exact plan/player/
page/lifecycle/Three hashes and UI/clock/host inputs. Do not judge the latest flag
combination as better than all earlier candidate plans without reviewing it.

Product transfer currently improves only sampling of two reviewed Cloud sheets
with lossless extruded gutters. It does not publish the incomplete BMB previews,
change Motion-1, infer unknown parent/RNG states or make Climhazzard playable VFX.
Technical progress and original visual fidelity have separate acceptance records.

Earlier autonomous integration: shared original-code NodeTree phase clock and
finite Particle lifecycle/ConstX/VelocityX/scalar alpha now feed the product via
the strict prepared `native-particle-basic-v1` profile. The registered control is
an explicit neutral-parent assembly, not a source-complete effect or mapped skill.
See the map for29 clock controls/33 Particle controls, program restrictions and
the missing original Initialize/child/parent/RNG record. Unknown fields reject;
do not silently export the remaining source modules into this bounded profile.
The paragraphs below retain the preceding checkpoint's evidence.

Previous bounded result: source-admitted constant generation uses the original
delay-window/enable rule in the common player. Native activation/RNG agrees with
51 controls, but whole-tree parent/lifetime/phase/RNG ownership is unverified.
Use tools/trace_bmb_lifecycle.mjs with the map's explicit plan/reference arguments
to observe the existing player numerically; it is not a new renderer. Trace output
must retain wholeEffectReconstructed:false, original state gaps and provenance.
The nine-node prefix has0 completely accepted nodes. Do not publish it or replace
the working Motion-1 converted sheets based on activation/trace success alone.
Next gate: one connected original NodeTree lifecycle reference, as specified in
the map. No new video/cosmetic alpha/scale/native-pixel-export loop is requested.
The current integration checkpoint connects ordinary motion-1 source composition
to the existing product sheet scheduler. It does not admit complete original BMB
simulation. M1's whole-source contract and coupled M2 lifecycle integration remain
the next gates; no native-export experiment is resumed. See the map for actual
tests, product/browser receipt, source identities and remaining blockers. Older
paused-review and native-route recommendations below are historical.

Active review: [architecture and root-cause audit, 2026-10-26](research/skill-pipeline-architecture-audit.md).
Further implementation and new capture loops are paused pending review of the
shared execution/reference contract and prioritized acceptance plan. Earlier
"current priority" entries below retain their historical evidence boundaries;
they do not authorize continuing the interrupted native export experiment.
The one-sample mixed-blend transfer result does not validate own-renderer
simulation or establish complete automatic native export.

Current priority: [game-loaded GPU export](research/live-native-gpu-export.md).
Manufacturer inquiry is not being pursued at the user's request. Native live
mirroring now exports one real pink-impact state on three backgrounds; it does
not instantiate arbitrary files or automate skills. Preserve source material
composition: ordinary transparent-PNG-over-white differs materially from native
output. Next gate is a short correctly composited sequence and second-source
control, not further isolated Null reconstruction or immediate skill publication.

Current priority: [browser SDK/full-renderer audit](research/browser-original-renderer-feasibility.md).
The user requested checking full renderer reuse before more reconstruction.
Android ELF is not a web runtime; an existing BISHAMON WebGL SDK is documented,
but no compatible package/source is available locally. Resolve SDK access and
legacy BMB/model/converter compatibility before resuming phase reconstruction
or promising browser playback. Do not repeat the failed native-export factory
attempt unchanged, buy a DirectX SDK as a web substitute, or publish a fallback.

Null parents: [native chains and fourth-array gate](research/native-null-parent-chains.md).
Use emulate_null_assignment.py with an explicit --auxiliary-flag. Mode0 executes
admitted init/update lists with controlled parent/RNG context. Mode1 retains the
original fourth delta_zero_update array and blocks incomplete execution. Never
infer that mode0 matches source inheritance or drop the fourth array. Source
parent matrices can now feed Quad output under fixtures; full births/lifecycle
and inheritance remain required before whole-source acceptance.

Active combat target: [Brave Slash white attack-prefix source](research/brave-slash-connected-combat.md).
Use emulate_quad_assignment.py with --probe-chains for original complete Quad
init/update evidence, not playback. --geometry-host adds complete original make/
writer execution with explicit parent/center/neutral tint fixtures, including
second UV/tint output. Add placementFromUpdate:true to that host to connect
native world position through original primitive/make-context transfer blocks;
center then denotes parent origin. Parent values remain explicit fixtures.
Its receipt inventories all nine source nodes and marks wholeEffectExported:false.
Keep this target through source parent initialization and lifecycle,
nested/random parent traversal and two-texture material/submission before acceptance.
The pink main impact and whole skill remain separate; no partial publication.

Second connected fixture: [nonuniform Basic texture and Default parent](research/connected-second-effect.md).
prepare_connected_fixture.py validates matching BMB/BMSLN, native initial Basic
selection and neutral tint for a standalone source. The connected exporter now
preserves full native Default parent bases and actual texture sampling. Rotated
parents require reviewed non-V15/full-inheritance evidence. Both complete-source
baselines remain required; fixture success does not publish or map a skill.

Connected export: [whole-source acceptance path](research/connected-effect-export.md).
export_connected_effect.mjs composes source/host inputs and invokes the original
CPU module/writer path for the explicitly admitted constant-parent/single-burst
subset. It rejects other nodes/resources instead of exporting an incomplete
effect. The separate connected-effect viewer reads only packed vertex data.
Current support is one complete admitted flash with explicit host/parent/material
adapters, not full NodeTree or general skill import. Reuse this acceptance path
for the next different effect before adding more isolated experiments.

Particle alpha integration: [source-gated preview](research/native-scalar-alpha-preview.md).
prepare_scalar_alpha_plan.py creates a separate unpublished candidate from
verified originals and original module assignment. The player checks source
hash, wrappers and unchanged keys before its nativeScalarAlpha plan switch can
affect local Particle curves. Review with the independent bound-host checkbox;
untextured geometry remains separately gated. This is not general skill approval.

Scalar alpha rule: [native differential controls](research/native-scalar-alpha.md).
nativeScalarAlpha is a separate pure helper for the tested Particle scalar
UpdateCurve subset.576 original outputs validate mixed interpolation modes,
unscaled stored tangents, endpoints and0..1 clamp. It rejects near-duplicate
times/unknown inputs. Active preview plans remain unchanged; enable only through
a subsequent source/capability gate, not a global vector/scalar replacement.

Chain execution: [native init/update probes](research/native-particle-chains.md).
Use --probe-chains only for the explicit input subset. Scalar alpha keys are
relocated at the verified pointer field; unsupported module inputs block the
whole chain. Compare update/init cursor consumption separately from native
allocation budget: current20/32-byte gaps remain unexplained. Native scalar
Spline controls expose a preview equation mismatch; other curve modes need
verification before a shared evaluator change. No runtime support is implied.

Module selection: [native Particle arrays and profiling](research/native-particle-assignment.md).
Use emulate_particle_assignment.py for original ordered init/update/make lists,
native count agreement and work-size output. It requires the pinned APK/raw
Particle layout and uses an explicit empty field context. A selected function
does not imply supported execution. Relocate curve/resource inputs and validate
record cursors before replacing partial module arrays in the phase reference.

Phase bridge: [initialized Particle reference](research/native-particle-phases.md).
Use explicit phase_mode='initialized' for original callback/PostUpdate execution
with controlled ring/neutral parent helpers. Optional ConstX wrappers use the
same emitter RNG as lifetime generation. Other modules and whole NodeTree
traversal are not reproduced. Preserve the default request-only mode; do not
promote these partial module records into general preview playback.

Scheduling reference: [constant Particle generator](research/native-particle-scheduling.md).
Use emulate_particle_scheduler.py for bounded offline activation/request tests.
Its callback is a recorder, not particle initialization. Existing preview
instances() uses an adapted LCG/birth model; do not label it native scheduling.
Native delay advancement belongs to PostUpdate and must be traced with traversal
and RNG ownership before promotion. No new live capture is needed for this
initial reference; source hashes and tested boundaries are in the report.

Bound-host review: [explicit skill member bindings](research/bound-effect-host.md).
Supply --host-reference and --host-bindings together for /bound-host.html.
Every member needs its source rectangle and required scatter; explicitly declare
memberScaleAxes:"xy". Missing inputs fail instead of borrowing arena geometry.
The neutral research view combines matching native-world anchors with measured
camera/raster state, keeping untextured primitives independently gated. It does
not reconstruct original actors/HUD or certify native simulation scheduling.

Host composition: [validated opt-in compositor](research/effect-host-compositor.md).
Set layer.hostContext only when effect geometry/anchors use the matching native
world convention. The compositor consumes camera and physical viewport/scissor,
preserving the background and RGBA target. Existing preview anchors do not
automatically qualify: bind source rectangles/scatter explicitly first. Five GPU
fixtures validate this path; current ordinary skill views retain their old path.

Host-data preparation: [shared coordinate contract/export](research/effect-host-context.md).
Use export_effect_host.mjs on a clean paired native/GL audit to preserve engine
height, geometry scale, camera and physical raster state independently. Bind
source rectangles and scatter explicitly at the caller; placement is not clip.
Current helpers validate coordinate math and export only. They do not switch the
preview's camera/compositor or publish a new runtime effect capability.

Current submission evidence: [live revision23](research/native-draw-submission.md#live-revision23-result-observation-gap-closed).
The strobe has six exact native-submit/glDrawArrays pairs, each count6, with
camera/root and actual viewport/scissor. Its previous absent GL observation is
superseded by positive execution evidence. Retain placement rectangle, engine
coordinate height, camera projection, GL viewport/scissor and foreground as
separate host inputs. Native return alone remains insufficient when no actual
GL event matches; sampling omissions must retain their budget limits. No
whole-skill pixel fidelity or published runtime support is implied.

Current source validation: [revision22 live result](research/native-pipeline-context-observer.md#revision22-live-result-current-checkpoint).
The installed/calibrated observer joins root/camera at actual GL calls and keeps
reviewed ConstX/VelocityX wrapper and implementation identities separate.
One captured Climhazzard VelocityX initializer plus six updates replay exactly
from source parameters, measured RNG and deltas. The screen effect receives a
640x666 placement rectangle in this scene, not the whole canvas. Its own GL draw
was not observed: do not substitute another effect's GPU state or hardcode that
rectangle for every host. Timing/birth scheduling, flash submission/visibility
and published runtime support remain separate gates.

Current measurement gate: [native context observer](research/native-pipeline-context-observer.md).
Use revision20's bounded `pipelineCapture` mode to collect exact source-linked
init/update/make inputs and actual wrapper-draw GL context. Require successful
startup calibration, a unique arm receipt and matching source identities.
Live Brave Slash data now verifies five source/RNG-driven ConstX initializations
against original ARM64 code, with bit-exact record and RNG-after matches. The
actual GL viewport/scissor is captured, but exact camera/root joins and later
white-plane ownership are still missing. ConstX's four-byte update wrapper needs
a reviewed delegate hook. The detailed receipt records these gaps; do not infer
whole-skill fidelity or introduce a skill-specific size/offset adjustment.

Screen placement follow-up: [explicit host screen rectangle](research/screen-anchor-host-reference.md).
New host contexts default screen anchors to the full host viewport; the old
arena-only baseline is separately switchable. Target-side/unit anchors stay
unchanged. This is a declared preview-host adaptation, not native screen bounds.

Latest host comparison: [explicit scene/view contract](research/preview-host-scene-contract.md).
Use preview server `--host-view game` and optional `--camera-reference` for a
native-proportion comparison. Foreground follows declared game layout and is
switchable. This is host adaptation, not inferred native UI clipping or a skill
geometry correction; keep legacy/foreground-off views for review.

Host-context diagnostic: [white-plane viewport/UI analysis](research/white-plane-viewport-ui.md)
separates source geometry from camera and opaque foreground UI. The current
standalone arena exposes some edges excluded/possibly occluded in the original.
This is not a new clip rule; no guessed HUD mask or fullscreen-flash replacement
is authorized by the evidence.

Latest playback experiment: [deterministic native Particle X display](research/native-particle-x-preview.md)
adds `--native-particle-x`, requiring native selection, Particle geometry and
native Null metadata. Only source-selected, deterministic bounded OneX/ConstX
cases qualify. VelocityX/native scheduling and random-state ownership remain
open; no published game effects are replaced.

Latest X-family reference: [Particle X-scale chains](research/native-particle-x-scale.md)
executes OneX/ConstX/VelocityX with source scalar parameters and controlled inputs.
The dispatch reader now includes scale init/update stages. Group X is replicated
across axes; actual native deltas/RNG scheduling are not established. This does
not yet enable a new playback path.

Latest binary diagnostic: [Particle dispatch and Joint scale](research/native-particle-source-dispatch.md)
adds `tools/native_particle_dispatch.py` for source-selected scale/rotation
make-vertex pointers without BMSLN. A resolved pointer is not simulation support.
The next common consumers are OneX/ConstX/VelocityX; preview gates are unchanged.

Latest producer diagnostic: [constant Particle module dataflow](research/native-particle-module-dataflow.md)
checks original initialization, record consumption and local Z roll through the
observed writer. It does not infer group-vector inheritance, actual RNG scheduling
or arbitrary-node dispatch; those remain gates before expanding playback support.

Latest offline diagnostic: [observed Particle writer reference](research/native-particle-writer-offline-reference.md)
provides a pinned native geometry oracle for computed roll/scale/draw-basis
inputs. It needs no new recording and does not expand Particle playback support.
The next gate is tracing the producers of those computed context fields.

Latest geometry path: [source-dispatched ZScreen Null locators](research/native-zscreen-offline-reference.md)
adds `--native-null-locator` to native selection and the existing Null metadata
preparation. This identity-view subset supports sampled constant roll and
positive constant nonuniform scales. Its optional offline instruction reference
needs no new recording; it does not establish general simulation.

Latest material path: [native framebuffer blending](research/native-blend-global-uniforms.md)
adds `--native-blend` to the native-selection preparation. It requires scene
composition and uses an RGBA target with opaque RGB presentation. Global
colorScale default 1 is now constructor-verified; caller values/timing and other
global uniforms remain unverified. This is still research-only.

Previous material path: [Model selection and constant Basic material](research/native-model-basic-material.md)
extends native selection to the verified UV single-submesh Model subset.
Add `--native-basic-material` to the existing opt-in native-selection preparation
for constant first-texture RGBA. Random/animated tints, absent authoring and
unverified layouts retain explicit unsupported results; no publication follows.

Previous material path: [initial native selection and Distortion alpha](research/native-material-selection.md)
adds `--native-shaders-apk` plus `--native-shader-package` to the preparation
command. It records exact initial Quad/Particle shader slots, gates the Add
candidate by fragment hash, and enables the matched Distortion alpha equation.
Model selection, runtime overrides, global uniforms and broader fidelity remain
unverified. No new emulator capture is needed to reproduce this block.

Earlier material experiment: use the [pinned Add shader candidate](research/shader-add-material.md)
for the optional `--shader-add-reference` path. It requires source appearance,
preserves the old material path for A/B review and does not change Distortion.
Direct GPU output agrees with the unedited pinned fragment under fixture
inputs; per-node native binding and broader material support remain unverified.

This is the operational entry point for original skill visuals, current as of
2026-10-24. Read [the asset map](asset_structure.md) first and use
[the character import workflow](character-import-workflow.md) for form identity,
body animations, reviewed recipes and existing publication. Research documents
linked below retain the evidence and historical experiments; their old ports,
test totals and statements of missing features describe those earlier revisions.

**The shared extraction and research preview work. Complete native reconstruction
and publication of these new previews are not finished.** The current optional
model-color experiment uses `plan-model-vertex-rgba.json`, with `approved: false`;
`plan-basic-uv.json` retains the earlier baseline. The Phaser game
still uses its previously published assets. A good-looking preview, successful
parse or passing source comparison does not change that status.

The project imports skill names, body motion and fluid visual presentation.
Original FFBE chaining, damage formulas and multi-hit gameplay are not goals.
Keep their raw metadata for provenance; define roguelike damage, MP costs and
wave progression separately. Visual component timing still matters even when
the game intentionally applies one combined damage event.

For native reference evidence, see the [Memorial diagnostic notes](research/memorial-client-access.md).
The clone-only revision-4 observer can join effect filename keys with native
position, scale, layer and wait inputs during a manually armed window. A Blade
Beam test matched the two expected component basenames and their 300/100 percent
scales. Use `tools/memorial/summarize_trace.py` with an explicit arm token and
source record to reproduce the comparison. It does not capture verified skill
IDs, target ownership or native particle evaluation; these measurements are not
a publication shortcut or universal screen-coordinate recipe.

Revision 6 additionally joined the exact effect-group IDs and native rectangle
inputs for Blade Beam. See [native placement evidence](research/native-effect-placement.md)
for the validated center + offset + scatter path and caller-base/member delays.
In the reached caller, source anchor mode 2 selects a side field rectangle;
the staging label `target-group` is not proof of a target centroid. Source mode
1 selects a unit rectangle. Legacy plans retain point anchors; the opt-in modes
below provide explicit rectangle and coordinate adaptations. Do not apply
captured dimensions or offsets as global constants.

An opt-in `--rectangle-placement` preparation mode now applies those member
axis/offset rules through an explicitly adapted arena/frame-box bridge. See
the [reproduction and visual limits](research/native-effect-placement.md#shared-preview-bridge-implemented-opt-in-research-mode).
The Blade Beam candidate is `plan-rectangle-placement.json` (port 3123). It is
not approved: inspected frames show the wave outside the scene after applying
the source offset, exposing unresolved local-geometry/camera conversion. Existing
plans and published game effects remain on their prior policies.

The later [native global-scale correction](research/native-renderer-scale.md)
adds `--renderer-reference <verified receipt>` alongside rectangle placement.
It applies the measured renderer geometry multiplier independently of member
scale and position. The reference-based `plan-renderer-reference.json` (port
3124) shows the wave in both arenas; the prior rectangle-only candidate lacked
this global factor. This is still an unapproved research preview with adapted
bounds and unresolved layer/camera/particle behavior, not a publication command.

The same reference-based path has now also prepared Brave Slash and Climhazzard.
Mode 4 screen members use the full adapted arena rectangle. `--fit-screen` and
`--rectangle-placement` are mutually exclusive because fitting replaces source
placement. Brave Slash renders its impact; Climhazzard remains incomplete with
withheld primitives, experimental distortion and a visible early strobe edge.
See the [reuse review](research/native-renderer-scale.md#reuse-check-brave-slash-and-climhazzard). The subsequent
[Brave Slash native review](research/brave-slash-native-review.md) confirms
renderer scale 1.775 and layer scale 1, but identifies a green standard hit absent
from the source-only composition. Resolve its generic selection rule before
claiming complete imports; match camera/target bounds before size corrections. See the
[native hit-profile investigation](research/native-hit-profiles.md) for the
recovered tables and completed direct loaded-ability comparison. All three Cloud
abilities match both raw frame fields in the loaded Memorial master; this does
not explain the additional green group seen in execution. Revision 11 adds
bounded execution/command/effect-input provenance (prepared, battle capture
pending). Its command association is the most recent frame getter in a native
execution scope; review caller/string/group evidence before claiming ownership.
The summarizer preserves these records without automatically approving identity.

The subsequent controlled Brave Slash execution resolved a missing composition
rule: motion-1 abilities prepend the unit's standard attack effects, with skill
effect starts shifted by the latest unit effect start. Use
`tools/compose_skill_effects.py` with an exact unit/ability pair to inspect this
ordinary single-branch path before resolving group assets. Its optional `--trace`
checks an exact native command input for that same pair. The captured upgraded
Cloud and project's 5-star Cloud have identical raw Brave Slash fields but
separate standard attack effects; the common rule reads the selected form's data.
See [actual evidence and commands](research/native-hit-profiles.md#controlled-execution-character-attack-effects-precede-motion-1-abilities).
The older browser plans retain source-only composition. A separate
[composed Brave Slash preview](research/brave-slash-composed-preview.md) now uses
`resolve_composed_skill.mjs` -> existing staging -> common preparation, retaining
unit-vs-skill origins and raw ability data. Its exact commands and checks are in
that review. Port 3126 serves the existing 5-star form's white hit at component
F3 and pink impact at F6. Other skills have not been migrated; the composition
inspector itself still emits metadata rather than a publishable sheet.
For the next size check, use the [native camera preparation](research/native-camera-comparison.md).
Revision 12 can sample the actual scene matrices/viewport just before drawing a
selected effect. Capture them with command identity and video; validate projected
anchor positions before changing units-per-pixel, the global geometry factor or
preview camera. The subsequent capture measured an orthographic 640x1136
logical projection and 1080x1920 viewport. The linked review includes the audited
root projection and commands for a separate native-viewport comparison (port
3127, `/native-projection.html`). This viewer uses the actual camera but a manual
effect-age slider: video timestamps and evaluator ages are not synchronized.
Recover actual animation age before inferring radius/alpha corrections. To export an
actual revision-10 snapshot after menu entry, arm a unique token with
`"skillIds":[214800,214810,214820]`, retain the tagged log, then run:

```powershell
& $env:FFROGUE_PYTHON tools/memorial/export_master_reference.py --log tools/data/memorial-audit/diagnostic-v10/master-snapshot-log.txt --token YOUR_UNIQUE_TOKEN --source tools/data/shared-skill-review/brave-slash/skill-source.json --source tools/data/shared-skill-review/blade-beam/skill-source.json --source tools/data/shared-skill-review/climhazzard/skill-source.json --output tools/data/memorial-audit/diagnostic-v10/master-reference.json
```

This command requires actual loaded rows from the selected arm window; a
successful export does not approve a reconstructed visual.

```powershell
& $env:FFROGUE_PYTHON tools/prepare_original_preview.py --source tools/data/shared-skill-review/brave-slash/skill-source.json --unit cloud --recipe tools/characters/cloud.json --authoring assets/battle_effect/atk_impact_001_pink.bmsln --scene-composite --withhold-untextured --inheritance --source-appearance --basic-uv --rectangle-placement --renderer-reference tools/data/memorial-audit/diagnostic-v7/renderer-reference.json --output tools/data/shared-skill-review/brave-slash/plan-renderer-reference.json
& $env:FFROGUE_PYTHON tools/prepare_original_preview.py --source tools/data/shared-skill-review/climhazzard/skill-source.json --unit cloud --recipe tools/characters/cloud.json --authoring assets/battle_effect/atk_slash7_side_purple.bmsln --authoring assets/battle_effect/atk_blow1_purple.bmsln --authoring assets/battle_effect/eff_strobe_white_a50_f30.bmsln --distortion --scene-composite --quad-colors --withhold-untextured --inheritance --source-appearance --basic-uv --rectangle-placement --renderer-reference tools/data/memorial-audit/diagnostic-v7/renderer-reference.json --output tools/data/shared-skill-review/climhazzard/plan-renderer-reference.json
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/brave-slash/plan-renderer-reference.json --plan tools/data/shared-skill-review/blade-beam/plan-renderer-reference.json --plan tools/data/shared-skill-review/climhazzard/plan-renderer-reference.json --port 3125
```

## 1. Resolve the skill before extracting anything

Use an exact sprite form and inspect the character recipe:

```powershell
npm run character:import -- --recipe tools/characters/cloud.json
```

The ignored report is `tools/data/characters/cloud/report.json`. The read-only
SQLite source is `assets/static_data/ffbe-data.db`. Resolve this chain:

```text
sprite form -> unit.unitSeries -> unit_series_lv_acquire -> ability / magic
ability.effectFrames -> effect_group.effectData -> effect.fileInfo
original BMB -> typed texture/model references -> exact CPK resource members
```

Never join an effect-group ID directly to `effect.effectId`: those numeric ID
spaces overlap. Never choose a similarly named file as a substitute. Keep the
kind (`ABILITY` or `MAGIC`), IDs, original filenames, database/source hashes and
all raw fields. Series acquisition is not proof that every form learns the skill.

Outer effect-group start ticks and member delays combine into a component start
time. These are 60 Hz timeline ticks, not zero-based body-sheet frame indices.
Keep target/caster/screen anchors, front/back layer, member scale and filename
transform suffixes separate. A whole skill can contain several timed effects,
each containing a hierarchy of emitters and models; it is not one PNG animation.

The eight-field member tuple is observed in the current database, but not every
field's meaning is recovered. Alternate effect references, trailing placement
fields and orientation modes remain unresolved. `@` segments can associate
parallel process/target groups: the existing importer conservatively labels later
segments conditional, which is a known limitation, not a decoded native rule.
Do not flatten these segments or reinterpret them silently. Preserve groups with
no visual members as full source records; the preview's `audioGroupsNotPlayed`
summary does not prove every empty group is audio-only. See the
[composition audit](research/original-composition-audit.md).

## 2. Archive and format boundaries

| Source | Reader / role | Established boundary |
| --- | --- | --- |
| `com.square_enix.android_googleplay.FFBEWW/files/**/*.cpk` | `ffbe_asset_dump-main/tools/cpk.py` | Masked CRI UTF tables, archive entries and CRILAYLA decompression; indexing is not validation of every payload |
| Original `.bmb` (`IBMB`) | `tools/inspect_bmb.py` and `bmb_*.py` | Supported version bytes `01 01 03 01`, bounded typed blocks/resources, selected parameters and curves; unknown layouts must stay unknown |
| Matching `.bmsln` | XML authoring supplement, compared by `compare_project` | Explicitly selected matching project, known-field comparison and hashes; supplemental fields are not automatically decoded BMB fields |
| Original `.m3r` (`BR3M`) | `tools/inspect_m3r.py` | Observed single-material versions 34/35; positions, normals, packed RGBA, UV and indices preserved |
| Converted `.efkefc` (`EFKE`) | Existing effect baker / `tools/inspect_effect_project.py` | Converted Effekseer resource; EDIT inspection decodes its compressed binary XML, not BMSLN or IBMB |
| Converted `.efkmodel` | Comparison input | Checked models reverse V and triangle winding relative to M3R; do not apply that reversal twice |

Original IBMB cannot be loaded by renaming it to an Effekseer file. Converted
effects are useful secondary evidence, but can omit source material properties.
Blade Beam's converted crescent omits the UV rotation/translation that is present
in the original data. Its conversion cannot decide the original orientation.
Node texture bindings can also override a model's embedded default texture.

Use the structural/resource reader, not heuristic ASCII-name extraction. Extract
only exact selected effects and typed dependencies from the archive inventory.
Staging checks the indexed entry against the current archive, decompressed size,
existing-file hash and output boundary. Resource staging preserves archive
identity rather than choosing a version silently. Missing or ambiguous original
members fail. If duplicate resource stems arise, inspect their hashes and resolve
source identity before preparation; do not assume the preview makes that choice.

The ignored inventory is `tools/data/android-cpk-audit/members.jsonl`. It contains
one JSON object per entry with `archive`, `dir`, `name`, `size`, `extract`, `offset`
and `id`. The audited backup had 446 archives and 117,969 entries; these historical
counts are not acceptance constants for another backup. See
[the recovery evidence](research/missing-effect-sources.md).

There is no dedicated maintained inventory CLI. If the local inventory is absent,
this PowerShell/Python command rebuilds entry metadata using the existing reader;
it extracts no payloads. Configure `$env:FFROGUE_PYTHON` to a Python executable
with Pillow before running the commands in this document.

```powershell
@'
import importlib.util
import json
from pathlib import Path

root = Path.cwd().resolve()
spec = importlib.util.spec_from_file_location("cpk_reader", root / "ffbe_asset_dump-main/tools/cpk.py")
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)
archives = sorted((root / "com.square_enix.android_googleplay.FFBEWW/files").rglob("*.cpk"))
if not archives:
    raise ValueError("No local CPK archives found")
rows = []
for archive in archives:
    cpk = reader.Cpk(archive)
    try:
        rows.extend({"archive": archive.relative_to(root).as_posix(), **entry} for entry in cpk.entries)
    finally:
        cpk.f.close()
output = root / "tools/data/android-cpk-audit/members.jsonl"
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
print(f"Indexed {len(archives)} archives, {len(rows)} entries: {output}")
'@ | & $env:FFROGUE_PYTHON -X utf8 -
```

For this documentation consolidation, the inventory loop was executed read-only
and its 117,969 rows matched the existing inventory across all 446 archives.
The documentation check did not extract payloads or rewrite the inventory.

Raw backup, source package, SDKs, inventory, extracted files, reports and research
plans remain ignored. Do not inspect preferences/account files to find effects.
Do not make Vite watch the source dumps. All parsing stays in `tools/`; `src/`
loads prepared standard sheets and clean game metadata only.

## 3. Reproduce the current three-skill review

Run from the repository root. Prerequisites are Node.js 24, installed project
dependencies, Python/Pillow, the local source roots, CPK reader/index, and the
existing prepared Cloud, training-dummy and reactor/forest assets. The preview
also uses `tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js`. Missing prerequisites
are setup failures, not permission to replace an asset or download a different one.

The following stage commands use the character report created in step 1:

```powershell
& $env:FFROGUE_PYTHON tools/stage_original_skill.py --report tools/data/characters/cloud/report.json --skill-id 214800 --output tools/data/shared-skill-review/brave-slash
& $env:FFROGUE_PYTHON tools/stage_original_skill.py --report tools/data/characters/cloud/report.json --skill-id 214810 --output tools/data/shared-skill-review/blade-beam
& $env:FFROGUE_PYTHON tools/stage_original_skill.py --report tools/data/characters/cloud/report.json --skill-id 214820 --output tools/data/shared-skill-review/climhazzard
```

Each stage contains `skill-source.json`, hashed `originals/*.bmb`, and per-effect
`effects/<stem>/resources.json` plus extracted dependencies. The seven original
effects include six explicitly matching authoring projects; Power Geyser has no
matching local authoring project and must not receive one from another effect.

Prepare the current experimental capability set explicitly:

```powershell
& $env:FFROGUE_PYTHON tools/prepare_original_preview.py --source tools/data/shared-skill-review/brave-slash/skill-source.json --unit cloud --recipe tools/characters/cloud.json --authoring assets/battle_effect/atk_impact_001_pink.bmsln --scene-composite --withhold-untextured --inheritance --source-appearance --basic-uv --output tools/data/shared-skill-review/brave-slash/plan-basic-uv.json
& $env:FFROGUE_PYTHON tools/prepare_original_preview.py --source tools/data/shared-skill-review/blade-beam/skill-source.json --unit cloud --recipe tools/characters/cloud.json --authoring assets/battle_effect/atk_aerialslash_001_green.bmsln --authoring assets/battle_effect/atk_slash5_blue.bmsln --scene-composite --withhold-untextured --inheritance --source-appearance --basic-uv --output tools/data/shared-skill-review/blade-beam/plan-basic-uv.json
& $env:FFROGUE_PYTHON tools/prepare_original_preview.py --source tools/data/shared-skill-review/climhazzard/skill-source.json --unit cloud --recipe tools/characters/cloud.json --authoring assets/battle_effect/atk_slash7_side_purple.bmsln --authoring assets/battle_effect/atk_blow1_purple.bmsln --authoring assets/battle_effect/eff_strobe_white_a50_f30.bmsln --distortion --fit-screen --scene-composite --quad-colors --withhold-untextured --inheritance --source-appearance --basic-uv --output tools/data/shared-skill-review/climhazzard/plan-basic-uv.json

node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/brave-slash/plan-basic-uv.json --plan tools/data/shared-skill-review/blade-beam/plan-basic-uv.json --plan tools/data/shared-skill-review/climhazzard/plan-basic-uv.json --port 3121
```

Open `http://127.0.0.1:3121/?skill=214800` (Brave Slash), `?skill=214810`
(Blade Beam) or `?skill=214820` (Climhazzard). If port 3121 is already occupied by
this review, reuse it; otherwise choose a free port without stopping the main game.
The server loads plans at startup; restart the relevant review after regenerating
them. Do not mistake an older running preview for newly prepared data.

These commands are the shared workflow, not three implementations. A new skill
changes the source ID, selected reviewed recipe and explicit matching authoring
inputs. Unsupported behavior must become a shared capability or a declared
limitation; never add a loader or hidden correction for one character.

## 4. Reading and evaluating the data correctly

Preserve the hierarchy and resource bindings. BMB block offsets are type-specific,
relative to a verified node layout, and valid only for the supported binary
version. BMSLN begins with a default-node template that the comparison excludes.
Known-field comparison establishes matching order and values, not complete
coverage of the original renderer.

**Stored data is not necessarily active data.** Constant, NewtonDynamics,
CurveValue and CurveSpeed are selectors. A nonempty curve can be dormant editing
history. Constant alpha uses its constant; selected Curve alpha uses its curve,
without multiplying by the dormant constant. Apply the same active-mode rule to
translation, rotation, scale, color, UV and deformation. Keep inactive keys as
evidence. Never enable one because it looks more convincing.

Selected unsupported modes must remain visible, and missing selected curves must
not become invented defaults. Source supplements must be explicit, hashed and
accepted by the existing known-field comparison. Their fields must retain their
authoring origin rather than being advertised as recovered BMB offsets.

| Area | Current status and boundary | Evidence / implementation |
| --- | --- | --- |
| IBMB hierarchy, typed resources, selected fixed/vector/scalar fields | Verified field subset; not every node type or property | [Structure](research/bmb-structural-reader.md), [vectors](research/bmb-vector-channels.md), [fixed parameters](research/bmb-fixed-parameters.md); `inspect_bmb.py`, `bmb_*.py` |
| Original model geometry | Verified supported M3R payloads; opt-in experimental vertex RGBA multiplication, native combination unverified | [Models/materials](research/bmb-materials-models.md); `inspect_m3r.py` |
| Alpha / center-color activation | Corrected supported selectors; Particle color without matching authoring, random RGB and parent RGB remain limited | [Appearance](research/original-appearance-review.md); `original_appearance.py` |
| Inheritance | Rate-zero parent alpha and supported birth-time translation implemented; other modes/compatibility remain experimental or unsupported | [Inheritance](research/original-inheritance-review.md); `original_inheritance.py` |
| Two-texture Add | Independent source layers/UVs with explicit authoring supplement; clamped RGBA addition and exact UV matrix remain experimental | [Playback/material experiments](research/original-skill-playback.md); `original_texture_layers.py` |
| Single-texture UV | Source-confirmed Basic mapping, active Crop 1x1, reversal Off and supported 2D modes; inverse TRS/pivot equation is experimental | [Blade Beam audit](research/blade-beam-source-geometry.md); `original_texture_mapping.py` |
| Distortion and constant quad corners | Source controls decoded for bounded cases; displacement strength/order, layer alpha and native blending unresolved | [Rectangle investigation](research/climhazzard-rectangle-investigation.md), [playback](research/original-skill-playback.md) |
| Birth scheduling, RNG, interpolation, transform evaluation | Deterministic research policies, not recovered native scheduling/random sequence or compatibility equations | `original_effect_player.mjs`, its `POLICIES`, and [feature audit](research/original-renderer-feature-audit.md) |
| Actor choreography and arena placement | Reviewed game/preview adaptations: approach/return, target body offset, group centroid, screen fit; not original coordinate rules | [Shared review](research/shared-skill-import-review.md), [composition audit](research/original-composition-audit.md) |
| Publication of original-data previews | Not implemented/approved; existing converted-effect publication is a separate path | [Character workflow](character-import-workflow.md), [pipeline direction](research/skill-pipeline-foundation.md) |

## 5. Remaining reconstruction work

Before choosing another renderer task, use the updated
[coverage inventory and priorities](research/renderer-coverage-priorities.md).
Generate source facts with `audit_original_skill_features.py`, then classify
current coverage with `audit_renderer_coverage.mjs`; historical baseline finding
descriptions alone are not current capability reports. The review prioritizes a
shared model vertex-RGBA experiment across two affected skills plus a white-model
control. This step is now implemented and browser-tested; see the
[RGBA experiment](research/model-vertex-rgba.md) for flags, commands and limits.
Native-age validation remains separate from feature implementation.
This inventory is not yet a production import gate or a publication command.

For a visible artifact, isolate its source node with the preview omission control
and use `tools/inspect_preview_node.mjs` to record its staged state at a specified
skill frame. The [white rectangle diagnosis](research/brave-slash-white-flash.md)
records an actual example and commands. Attribution is not permission to omit or
retune the layer: native shape, facing and material rules may still be unknown.
For pinned native material evidence, use
`tools/memorial/audit_particle_rules.py`; the [native inspection](research/native-particle-material-evidence.md)
records its command, source hashes and limitations. Extracted GLSL byte offsets
are not shader permutation IDs. Native context alpha equations must not become
source inheritance rules until coefficient population and selection are verified.
The [scoped Particle trace](research/native-particle-node34-capture.md) records the
first live callback attribution and its limitations. Use
`tools/memorial/summarize_particle_trace.py` to retain session provenance and join
recorded calls to selected modules; a callback name alone does not establish
active source channels, shader selection or full in-memory source equality.
The [combined revision-14 measurement and backend decision](research/renderer-backend-decision.md)
adds verified memory reconstruction, decoded numeric comparisons, six native
alpha/vertex samples and the next native-export feasibility gate. Use
`tools/memorial/analyze_particle_memory.py` for the reproducible comparison; do
not interpret pointer-like changes as automatically verified relocations.
The subsequent [native-export feasibility result](research/native-export-feasibility.md)
records failed isolated creation for both tested effects, zero exported PNGs and
restoration of revision 14. `prepare_diagnostic.py --mode native-export` is a
separate experimental build; the default `observe` mode does not include its
native calls. Neither mode is an original-skill publication command.

The subsequent [zero-roll Particle geometry experiment](research/particle-geometry-subset.md)
adds opt-in `--particle-geometry` to `prepare_original_preview.py`. It requires
explicit `--inheritance` metadata and rejects `--fit-screen`. Only textured,
Point-emission, constant positive-scale particles with verified zero-roll
controls enter the new display path. Unsupported variants retain labeled legacy
comparison geometry. One Brave Slash node passes; Blade Beam and Climhazzard
remain negative controls. Native center/projection, roll and general Particle
dispatch remain unresolved; the F29 rectangle is not claimed fixed. See that
review for commands, actual checks and source hashes. This remains offline and
does not authorize runtime publication.

The [locator/projection audit](research/particle-locator-projection.md) now joins
the six captured native vertex samples to their own revision-14 before-draw
camera/root states. Use `tools/audit_particle_locator.mjs` for world/projected
bounds, ancestor inputs and explicit counterfactual residuals. Camera conversion
is analytical evidence; the neutral-rotation counterfactual is not a supported
inheritance equation. Native ancestor dispatch/input-output transforms remain
the named missing input. Do not apply the counterfactual to playback or production.
The [revision-18 ancestor observer](research/ancestor-locator-observer.md) now
prepares that bounded observation. Startup/calibration are verified in FFBE
Trace; actual ancestor callbacks and fields remain unverified until a controlled
capture. Use explicit `locatorNodes: true` together with the selected pink file
and retain node/sample/callback provenance. No import capability was added by
installing the observer.
The subsequent [capture result and rollback](research/ancestor-locator-result.md)
supersedes that preparation status: validated direct prefixes identify the pink
Null/Billboard ZScreen path, while the full scope recording remains rejected.
Revision 14 is restored. Coverage now records missing non-Standard control-node
locators across all three candidates. No new locator playback is implemented;
retain the distinction between source/native evidence and runtime support.
The next [Null locator experiment](research/null-locator-subset.md) now adds
`prepare_original_preview.py --null-locator` with matched selectors, a shared
zero-roll/unit-scale capability gate and an independent browser A/B switch.
It requires `--inheritance`, rejects screen fitting, preserves Standard TRS and
labels unsupported variants. The source inspector/geometry audit honor this
flag. Native center checks pass for the measured chain; broader variants and
publication remain unsupported. Use separate `plan-null-locator.json` candidates.
For the current isolated camera check, use
[`prepare_native_projection.py --effect ... --geometry-audit ...`](research/native-viewport-current.md).
It verifies that the geometry receipt belongs to the exact candidate/camera/root
and current player, then preserves its source flags. The browser offers full
native viewport, separate geometry A/B switches and measured-node isolation.
An opaque neutral background is diagnostic only. The source's lower edge is
visible in the full view; cropped comparisons must not imply it disappeared.


The current preview is partial for concrete reasons:

- **Geometry and facing:** ordinary Particle planes and Billboard models lack the
  complete camera-facing treatment. Model-surface emission is withheld for Blade
  Beam wave node 10; unverified untextured particles are withheld instead of being
  drawn as white rectangles. Model vertex RGBA is preserved and optionally multiplied
  under `--model-vertex-rgba`; its native combination equation remains unverified.
  See the [particle audit](research/original-particle-geometry-audit.md) and
  [feature audit](research/original-renderer-feature-audit.md).
- **Coordinates:** member placement fields, alternate-side assets, Euler order
  and root/node compatibility precedence are unresolved. Blade Beam's raw
  `-1100` remains unapplied. The theory that it compensates two initial 275-unit
  translations was rejected: one of those curves is dormant. Do not rescale the
  effect or change its anchor to hide this. Use
  `tools/audit_member_offsets.py --output tools/data/member-offset-audit.json`
  and the [geometry audit](research/blade-beam-source-geometry.md).
- **Materials and hierarchy:** native blend/distortion equations, nonzero alpha
  influence, rotation/scale exclusions, parent RGB, random RGB, sort priority,
  fields and expiration rules still have gaps. Power Geyser's missing authoring
  source means some channels cannot use the supplemented capability branches.
  The [appearance follow-up](research/original-appearance-review.md#follow-up-controlnull-offset-328-is-not-established-rgb)
  shows that the presumed ControlNull RGB at block+328 matches generation-area
  scale instead. Node 9 of Blade Beam's wave distinguishes those values. The
  decoder label is not corrected yet; do not rely on it as color or enable parent
  tint from it. Parent RGB is not implemented.
- **Composition and delivery:** process-associated branches, full records for
  groups without visual members, sound mapping, body/effect synchronization and
  the new research renderer's export/publication contract need bounded work.
  The 180-effect-frame horizon and 210-preview-frame end are current fixtures,
  not a duration standard for arbitrary future skills.

The current UV correction uses source rotation/pivot rather than an artwork
repair. **Never stack the older Blade Beam `artworkRotationDegrees: 90` bake on
this original-data UV path.** The research player loads original staged textures.
Existing manually adapted sheets remain a separate, labeled implementation until
a reviewed migration replaces them.

## 6. Validation, evidence and publication gate

Run the suites appropriate to changed capabilities; these are the current
cross-skill reconstruction checks:

```powershell
& $env:FFROGUE_PYTHON -m unittest discover -s tools -p 'test_bmb*.py'
& $env:FFROGUE_PYTHON tools/test_m3r.py
& $env:FFROGUE_PYTHON -m unittest discover -s tools -p 'test_original_*.py'
node --test tools/test_original_effect_player.mjs tools/test_original_inheritance.mjs tools/test_original_appearance.mjs tools/test_original_texture_mapping.mjs
```

Some integration tests require ignored local sources and explicitly skip when
absent. Record skipped tests; a run without them does not establish source coverage.
The latest UV milestone recorded 15 Python original-source and 26 Node tests
passing, all three skills playing F0 through F210 with no returned browser
warning/error logs, and eight GPU blend checks passing per preview. These results
are historical executed checks, not a claim that this documentation edit reran
them. The [UV review](research/blade-beam-source-geometry.md) records exact scope.

For each new visual capability or skill, retain:

1. Source IDs, full composition records, database/asset/project/recipe hashes and
   exact preparation command; do not overwrite the only previous comparison plan.
2. Per-component/channel evidence (`verified`, `inferred`, `unknown`) separately
   from execution (`rendered`, `unsupported`, `adapted`). Unknown active behavior
   keeps the overall skill partial even if the page has zero skill-specific issues.
3. Actual test results and same-seed/frame A/B screenshots; use unchanged controls
   to show that a common fix does not alter unrelated geometry or timing.
4. Browser playback, seeking, restart and target/arena checks, clipping/tail review,
   diagnostics and console results. An initialization receipt is not a visual review.
5. Original reference URL/time/frame or explicit developer acceptance, remaining
   visible differences and an honest fidelity label. Current A/B screenshots
   compare our evaluators; they are not native FFBE pixel comparisons.

There is currently no supported command that turns `plan-basic-uv.json` into an
approved Phaser skill. Do not pass it to the existing Effekseer baker, copy its
research JavaScript into `src/`, or mark it approved to bypass that boundary.
The publication milestone must define a reproducible bake/composition format,
preserve required blend/layer/anchor semantics, validate hashes and dimensions,
and integrate with the common prepared-asset loader and reviewed game recipe.
Then run the character pipeline/build/combat checks and actual gameplay review
from the character workflow. New reward skills and wave balance come after that
separate integration; original chaining is not a missing prerequisite.
