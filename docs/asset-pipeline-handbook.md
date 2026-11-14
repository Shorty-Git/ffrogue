# Asset pipeline handbook

Renderer measurement tools (2026-11-11): before changing `src/effects/originalEffectPlayer.mjs`
or a screen-layer rule, capture frames (`node tools/rebaseline_scenes.mjs capture --to baseline`);
afterwards `node tools/rebaseline_scenes.mjs run` republishes every scene (the player hash is pinned
in each manifest), compares before/after frames and moves the frame baseline only where the result is
unchanged or at least as good. `node tools/inventory_player_issues.mjs` ranks what the player itself
reports as not reproduced ([player issue inventory](research/player-issue-inventory.md), generated);
`node tools/detect_scene_boxes.mjs` plays every scene in a training fight and ranks hard rectangle
edges. These are measurements of this renderer against itself, not original-game fidelity evidence.
Commands, outputs and limits: `current-state.md`, section "Renderer completion session".

Renderer status after that session (2026-11-12), approximation mode only unless noted:
- Supported now: Distortion material on Quads and Particles (binary tints, midpoint, colour curves; native
  alpha equation); Particle colour selector from the binary; constant Quad corner gradients; untextured
  Particles that are screen planes; zero-extent emission shapes as points; screen layers from 190 units
  (uniform planes on any anchor, patterned/two-texture planes on screen anchors, backdrop Models on the
  back layer of screen/target-side effects); Limit Burst frame effects scaled to this view.
- Still unsupported, explicit: emission shapes with an extent and Model-surface emitters (withheld), small
  untextured Particles (withheld), subdivided backdrop Models (drawn at source size), parent alpha/transform
  combinations, Particle facing/billboards, node types 4 and 15, the Add material where the native fragment
  does not match (labelled legacy comparison).
- After any decoder change run `node tools/reprepare_scene_plans.mjs`, then
  `node tools/rebaseline_scenes.mjs run`. Strict plans (the first Cloud/Aerith/Barret skills) are not
  re-prepared and keep their manifests; only their player hash is pinned again.
- `import_stage.mjs` and the publish tools write files Vite watches; on Windows a write can fail while
  the dev server holds the file. The re-baseline tool retries; a recipe that still cannot publish is
  listed under `repinned` in `tools/data/scene-baseline/republish.json` and must be looked at.

Limit Bursts (2026-11-07): the pipeline now admits a form's Limit Burst as skill
type `LIMIT` (Cloud's Omnislash is the first). Visual approximation is an explicit opt-in
(`--approximate-unverified`), long body clips wrap into a grid (`tools/sheet_grid.py`).
Details and reproduction: `skill-reconstruction-workflow.md` (top entry).


UI parts and skill icons (2026-11-07): `tools/export_battle_ui.py` extracts the
original FFBE battle UI parts (window frame, gauges, command icons) from the Godot
atlas under `rawdata/assets/ui/`, and `tools/export_skill_icons.mjs` publishes each skill's
original icon via `ability/magic.iconId` (run it after every skill publication).
Both write provenance with SHA-256. Details: `battle-layout.md` and
`character-import-workflow.md` (section 5).

The shared Source audio admission now covers twelve prepared presentations. See
[Source combat audio](research/source-combat-audio.md) for the gated effect-group
profile, exact bank/PCM provenance, supported events and known timing gaps.

The original FFBE Home and Whisperwood music share a run-scoped audio manager
with their archived CRI HCA loop markers. Reproduction and hash evidence are in
`background-import-workflow.md`. The four published FFBE system cues and their
bank provenance are in `asset_structure.md`. Slot mechanics, reward chimes
and two preview alternatives are FFRogue presentation. Reviewed combat
profiles use native group dispatch and ACB CueTable IDs. Seal Evil is the
first admitted Source sound timeline. See `asset_structure.md` and the
reconstruction map for provenance and remaining unmapped events.

The original form graph now covers all admitted star ranks and the base NV
bodies for classic Cloud and Delita. See `character-import-workflow.md` for
the master IDs, Source admission, aura provenance, pending EX/Shift contracts
and body-only texture sampling. The shared body importer prepares
content-hashed coverage and emission passes for the reviewed CGG profile.
WebGL and DOM body previews consume the same strips. The character workflow
records the flat-export probe, per-clip fallback and parity limits.

## Previous: reviewed same-unit 7-star bodies and presentation repair (2026-11-02)

15 original Source skills, existing5/6 forms, sampled Mako fog and both areas
remain intact. Cloud207000107 and Aerith207000407 are now reviewed7-star SAME-UNIT
body namespaces (12/13 tracks); direct unit/class-up chains and source hashes are
recorded in character-import-workflow.md. Both retain similar original designs;
no art, aura, VFX or unit variant is invented. Cloud207000117 remains unpublished.
Run-content describes original forms; separate run-rules.json chooses the NEW
short-run highest-reviewed policy. Old saves/no policy remain sequential5->6->7.
Normal progression requires no data migration to reactivate. Missing phases block
form admission; actual Source casts and next-battle/reload texture IDs are checked.

Title crystal regression was UTF-8/Windows-1252 mojibake in RunUI, not an asset
fault. Restore the original diamond; always use explicit UTF-8 in source tooling.
CSS glow/float/glints, mechanical slot lever and stronger brief Awakening are
FFRogue presentation only. Lever reaches the existing single saved roster commit;
click/drag/keyboard/skip/reduced-motion tests compare exact states and RNG.
No new graphics dependency or parallel animation/gameplay system is introduced.
Read roguelike-foundation.md/current handoff for reproduction and actual checks.

## Current: saved Awakening presentation and bounded stage sampling (2026-11-02)

15 Source skills/forms and original resources preserved. Awakening saves gameplay
once before a reusable blue/gold overlay over the active Victory scene. Skip/end
only acknowledge presentation; reload resumes the committed new form without
replaying the reward. Prepared original5/6-star sprites are used with their pivots.
Aerith's difference is subtle; no cache fault or invented redesign is claimed.
Read character-import-workflow.md/roguelike-foundation.md.

Reactor sampling now has an explicit reviewed FFRogue policy for three soft cells.
Exact cropped RGBA+gutter textures use linear filtering; original atlas stays
nearest. Geometry/timing/blends and all Source samplers are unchanged. Reproduce
with BOTH stage preparation and prepare_stage_sampling.py; read background workflow.
No native filtering claim. Mainline inventory checks1,286 background rows and12
complete selected profiles; Dollet/Nibelheim/Reactor05 are future proposals, not
published areas. No third area, run expansion, new enemy/hero skill or audio player.

## Current: measured body admission and animated reactor (2026-11-02)

2 areas/4 fights and15 Source skills preserved. Title loads hero idles/portraits;
BattleScene.preload admits current party/form combat states, published choreography
clips and current enemy idle/attack before actors exist. Cached textures are reused;
missing required sheets block commands. Unreferenced limit sheets remain preserved
but are no longer requested/registered. No original clip/timing changes or eviction.
Read character-import-workflow.md and roguelike-foundation.md for exact scope.

Mako Reactor now plays source-authored SSPB-v1 240-frame/30FPS nested motion with
the existing Phaser quad pipeline. Tools prepare clean JSON plus the exact atlas;
runtime receives no raw binary. Source-derived timing/transforms are distinguished
from FFRogue camera/layer/loop policy and unmeasured native pixel parity.
Whisperwood remains blocked by active vertex deformation in this export profile.
Read background-import-workflow.md for SDK revision, hashes and reproduction.

No original enemy skill newly published. Ochu Dance is the shorter no-type7 VFX
path; staged Locked On Target actually has44 nodes. The existing body observer
only admits player vtables, so a verified monster-specific observation path is
required before its clips can be certified. See enemy-import-workflow.md.
No new native capture, hero reconstruction, asset deletion or audio playback.

## Current: battle presentation and bounded content intake (2026-11-02)

Keep the2-area4-fight prototype; no third area/18-fight expansion. The common
combat-action banner consumes committed hero/enemy actions, no independent skill
executor. Victory readiness is prepared pose metadata, not edited original clips:
tools/prepare_victory_poses.py -> public/assets/victory-poses.json. Exact aligned
terminal intro poses matching win frames release rewards; complete clips keep
running. A run's acting hero now waits for the common VFX/fade barrier too.
See roguelike-foundation.md/current handoff for measured timings and test scope.

Enemy intake now resolves11 original records for the4 published monsters through
their exact master skill sets and existing effect-group/CPK tools. Native Tail
Laser/Ochu Dance resources are staged, but original body/anchor/render contracts
are incomplete. No original enemy skill is published; FFRogue patterns are labeled.
Read enemy-import-workflow.md. SSPB-v1 resource inventory found3 shared atlases;
all are present, but no verified frame/instance decoder or productive animation.
Read background-import-workflow.md. Audio references remain separate/unplayed.

Bounded audit:447 hashes/36 identical-content groups, not whole-dump certification
or deletion permission. particleProgram.ts is retained for offline compilation.
Only3 unused balance fields removed, no assets/research purged. The all-PNG RGBA8
texel estimate is820.3MiB, NOT measured VRAM; oversized unused limit sheets and
eager body loading merit a separate required-clip preload improvement.

## Active: original-backed enemies and themed expedition (2026-11-02)

Four original monster bodies are now prepared through the existing CGG/CGS
exporter: Microchu1110310, Ochu3110010, Sweeper2061310, Guard Scorpion4060810.
Read [enemy-import-workflow.md](enemy-import-workflow.md) for master IDs, hash
receipts, publication commands, reviewed scaling/impact rules and support limits.
Whisperwood and Mako Reactor use distinct lineups/bosses and the existing verified
static forest/reactor arenas. Body clips are source-derived; boss patterns/stats,
theme composition and action impact rules are FFRogue adaptations. Original named
monster skills/AI, SSBP animation and music joins remain unsupported.15 player
Source skills and their research/form baseline remain unchanged. No asset deletion.

## Current UI/runtime policy (2026-11-02)

15 Source skills/assets/plans unchanged. Canonical character grouping is reviewed
run-content metadata, separate from original unit-series/forms. Import publication
must supply a reviewed canonicalIdentity before starter admission; unknown values
fail closed, never infer from names/roles. Classic/AC Cloud share one party family.

Victory uses original prepared body clips in the live BattleScene; animationrepeat
is a generic Phaser event filtered by actual animation.key. No new native/BMB
semantics were reconstructed. Research remains paused. See roguelike-foundation.md
for schema migration, live reward lifetime and explicitly scoped baseline metrics.

## Active: saved roguelike vertical slice; skill research paused (2026-11-02)

15 published Source skills remain unchanged. Normal entry opens title, seeded
starter reels and a saved four-encounter expedition. Development battles run on
a training run (`?debug=battle` was removed 2026-11-07): `?gallery=arenas` or
`/tools/test-source-scene.html?reserve=jack`. Source review pages remain valid.
See docs/roguelike-foundation.md for architecture and reproduction commands.

Cloud's original6-star207000106 body is prepared with:
`node tools/import_character.mjs --recipe tools/characters/cloud_form6.json --prepare-body-only --python WORKING_PYTHON`.
All12 validated clips are published in public/assets/forms/cloud_form6 with an
isolated texture/animation assetKey. run-content.json associates this prepared
form with original identity207000105 and records the manifest hash. Raw higher
forms are not automatic evolutions. Original skill metadata/plans are unchanged.
Aerith's original6-star207000406 is now prepared through the same command with
tools/characters/aerith_form6.json (13 clips). Published assets/forms/aerith_form6
belongs to original series207000405, not another Aerith variant. run-content.json
records its manifest hash; no custom runtime loader or skill changes. Actual boss
awakening and subsequent Seal Evil passed. See current handoff and
tools/data/aerith-awakening-20261102/{source-identity,prepared-review,browser}.json.
No asset purge, new package or native reconstruction. Bounded hash audit receipt:
tools/data/roguelike-foundation-20261101/architecture-assets.json.

## Current: form-aware release paths (2026-11-01)

15 productive Source skills unchanged; Iai Strike is personally accepted. New
skills0, renderer changes0. Current5-star Barret207000205 has FOUR ordinary
active skills; three later-series commands require6-star. Remake/Avalanche are
separate series. Full release paths: current ROSTER_SKILL_COVERAGE.md section.

form-learning.mjs bounds ordinary acquisition by original master rarity/maxLv;
conditional/NV/missing requirements fail closed. Inventory reports it separately
from publication. Planner --current-form checks published body vs recipe and
rejects explicit wrong-form requests. It is opt-in; reviewed FFRogue cross-rarity
skills remain untouched. Unknown original effect anchors are independent intake
gates even when raw resources are present; Mindblow mode6 is not a target fallback.

Reproduce:
node tools/plan_source_imports.mjs --select barret:* --current-form --output tools/data/barret-path-20261101/form-selection
node tools/inventory_roster_skills.mjs --control-audit tools/data/control-groups-20261101/control-comparison.json --output tools/data/barret-path-20261101/coverage
node --test tools/test_form_learning.mjs tools/test_source_import_profiles.mjs tools/test_import_wave.mjs tools/test_source_command_metadata.mjs

11 targeted Node tests pass. Runtime/public behavior and seven character recipes
unchanged vs fadd8bb; only prior Iai recipe-hash provenance spillover is carried
into this checkpoint. Prior82 Node/15 Python/build/battle/frozen-frame results are
reused with hash checks, not newly executed.10 served modules match3001.
19 staged BMBs/resources across seven series abilities are hash-checked. No new
native recording; ADB reachable, FFBE process inactive at inspection. Store's
corner values are neutral, but tilted/nonuniform Billboard geometry and model
priority order remain independent gates. See current handoff for next decision.

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

---

Earlier revision notes (historical; current resume above takes precedence):

## Grouped binary controls: broader intake, no new publication (2026-11-01)

Current parent98091bb;14 productive Source commands and all published visual
plans remain unchanged. Four additional intake fields are source-pair verified:
Quad color influence rate516; Particle rotation508 (1=On,2=OnGenerateTime);
Model translation568 (0=On,1=OnGenerateTime),scale576 (0=Off,1=On).
These are typed-layout-relative offsets, NOT runtime record offsets. Unknown
enums/rates remain rejected. No new parent equation or authoring-free profile.

Current strict control audit: tools/data/control-groups-20261101/control-comparison.json,
27 pairs/469 nodes/1823 values, zero differences (320 additional checks).
The48-pair --intake-only comparison checks812 intake values and structure only;
it deliberately does not grant the strict audit's full project comparison.
One expanded project contains an unhandled active curve, and12 other control
enums remain unknown. Do not substitute the partial receipt for full approval.

The existing batch automatically receives these fields:14 main-party candidates
have improved inputs, zero complete skills unlocked. New roster receipt remains
7 characters/87 active series entries/14 published/70 blocked/3 intake-only.
Big Shot still lacks complete Hardshot controls and verified Motion8 phases.
Store200210 now has a measured self/caster placement reference, but non-flat
Quad color and model Billboard gates prevent publication. Its tested charge/risk
gameplay draft is archived, NOT installed in runtime. See workflow/handoff.

Preparation accepts rectangle mode3 ONLY with reviewed self scope; Source and
target are the same unit in the measured native command. Non-self mode3 still
fails. This reuses the existing host target-unit rectangle, not a new renderer
or native seed/footprint claim. Runtime code/resources, Sword colors, member
streams, action contracts and all14 command objects remain parent-equivalent.

## Original flat Quad RGB / accepted Delita geometry (2026-11-01)

14 technically playable Source commands remain. Daniel accepted Helm Break and
the Delita positioning/animation quality; Sword's corrected colors await renewed
personal review. No new command/body or gameplay change.

New opt-in --flat-quad-rgb on prepare_original_preview --profile source-preview-v1
retains exact source Constant/flat Quad RGB/range, applies native RGB sampling and
clamping with independent alpha, and uses explicitly reviewed host color seeds.
It does NOT reuse corner A, guess active curves or alter transform RNG streams.
Unknown, Curve or non-flat modes are rejected by this bounded profile. The older
distortion RGBA behavior and all default plans stay unchanged.

Existing stage_source_imports emits colorPreparation hints from raw BMB controls:
required nodes/arguments and outside-profile nodes, with wholeEffectAdmitted=false.
One RGB feature is not full skill admission. A bounded13-candidate main-party
check finds needs in Ancient Holy,Miracle of Life,Mindblow; independent blockers
remain. Big Shot has no newly required flat RGB nodes and remains controls/body
blocked. No new guaranteed import or published skill is claimed.

See original-appearance-review.md and current handoff for hashes, native records,
commands and evidence under tools/data/sword-color-20261101/. Product3001; current
receipt sink3155 checks9 served modules including the new sourceQuadColor helper.
Old3154 remains running but lacks the new helper in its loaded freshness list.
Source-only,14 command objects,13 other visual plans and frozen references remain.


## Big Shot bounded decision and fourteenth Source command (2026-11-01)

14 technically playable/11 personally accepted. Delita Helm Break202190 is new;
its visual acceptance, and renewed Chant/Sword spatial acceptance, remain pending.
All previous13 command objects, Source manifests and src code are unchanged.

Particle3 raw translation-parent selector at504 is now exposed ONLY to intake
and source comparison:0=On,1=OnGenerateTime. Unknown enums remain unknown and
block comparison.27 independent matched pairs/469 nodes compare1503 values,
including58 additional selector checks. Stable node.sourceControls/Prepared
serialization is deliberately unchanged. Full authoring-free import is NOT
unlocked; rotation/scale/matrix/compatibility and other controls remain gated.

Big Shot was executed autonomously in Trace using existing revision35 hooks;
target placement is measured, exact Motion8 body clip remains unresolved.
Hardshot still lacks several control regions. No partial skill was published.
See native-hit-profiles.md and native-effect-placement.md. No reinstall/data loss.

Helm Break reuses the accepted Source profile, exact-form composed attack prefix,
matched mentalbreak BMB/project, explicit choreography and screen-API placement.
Original SPR -60%/five turns is retained separately from reviewed +20% magical
vulnerability/three enemy phases and2x physical damage. Body is an explicit
reviewed Motion1 adaptation, not a new native animation-selector rule.
Authoring remains required; known experimental profile limitations remain listed
in the prepared source/coverage audit. No hidden node omission or renderer hack.

Reproduction/evidence under tools/data/big-shot-20261101/: control-comparison.json,
helm-break/plan.json, source-features.json, renderer-coverage.json and browser
receipts. Publication recipe tools/presentations/helm-break-import.json; character
tools/characters/delita.json. Workflow commands are in the current handoff.
QA on3001 now independently verifies menu paging; frozen comparison requires the
default Cloud/Aerith/Barret party, preventing misleading reserve-body comparisons.


## Current main-party intake and server checks (2026-11-01)

13 Source skills/11 personally accepted remain unchanged; Delita spatial review
is still pending. No productive code, recipe or public asset changes in this block.

New source subset: Particle3 scaleValue count/pointer at1392 and Model6 scaleSpeed
at1472 use the existing52-byte XYZ keys. Seven curves/26 keys compare exactly in
four matched originals/projects. Empty new slots stay sparse so preserved plans
regenerate unchanged. This is decoding, not a new native curve-time equation.
Explicit Constant texture1/2 RGB/alpha selectors keep saved value keys dormant;
unknown, absent or selected-curve modes do not bypass checks. Authoring is still
required for these selectors and other unresolved controls.

The existing audit_bmb_controls.py retains full projectComparison and parser-input
hashes.27 pairs/469 nodes/1445 known parent values pass. Five previously blocked
effect/project comparisons now pass. The roster can consume this unchanged-input
evidence with --control-audit; it retires ONLY exact-source authoring-comparison
errors where all known BMB versions agree. Other blockers remain and retired
diagnostics are recorded. Nine stale errors for eight Aerith/Barret skills were
removed; ZERO complete new skills are certified.

Reraise is prepared effect-only, not published: MAGIC body/timing, negative-55
start, single-ally selection, auto-revive and rendering gates remain. Big Shot
still needs exact hardshot controls/authoring plus Motion8/body review. Do not
replace effects or treat parser success as a complete import.

Commands and exact evidence are under tools/data/main-party-import-20261101/:
- node tools/inventory_roster_skills.mjs --control-audit tools/data/main-party-import-20261101/extended-comparison.json --output tools/data/main-party-import-20261101/coverage
- node tools/check_dev_server.mjs --origin http://127.0.0.1:3001 --output tools/data/main-party-import-20261101/server-freshness.json
- node tools/preview_original_skill.mjs --plan tools/data/braver-20261101/source/plan.json --port 3154 --game-origin http://127.0.0.1:3001

Browser QA uses game3001 and sink3154. The harness requires product-freshness
before work: eight served source-logic bodies must match disk. Old sink processes
3152/3153 lack this endpoint and fail closed. Import URL rewrites are normalized;
basename and bindings remain checked. Reload QA: this cannot certify a browser's
already cached instances. Manifest/frozen-frame checks remain independent.

64 Node/21 Python tests,27-pair audit and build34 modules pass. Current browser
receipt includes freshness and3 Cloud frames with0 changed pixels. Existing combat
and Delita receipts are reused; no native recording or new gameplay claim.

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

## Current: bounded original control decoder and provenance separation (2026-10-28)

The common BMB reader/preparer now decodes13 verified parent/Null control slots
without XML.22 matching pairs/343nodes/1102 values agree. Remaining authoring fields
are explicit; no authoring-free profile is admitted. Meteor's original/resources
exist and109 controls decode, but unresolved parent/context/compatibility, emission
and texture/geometry selection still block it. New fully playable skills:0; total5.
The batch audit now reports exact per-node raw fields and missing inputs instead of
using missing authoring as the only explanation. Unknown curves/types/versions
remain blockers. See the reconstruction map and skill workflow for reproduction.

Source metadata publication preserves originalCommand (verbatim source row+DB hash)
separately from gameplayReview/recipe balance. Seal was metadata-only republished;
all five visual manifests and prior gameplay/Legacy data are unchanged. Audio
references retained; no new playback/music/background work or pixel optimization.

## Current: fifth Source skill and bounded sound preparation (2026-10-28)

Four Cloud commands are personally accepted; Seal Evil229751 is the fifth Source
command, checked in the actual game, pending Daniel's own visual approval. Generic
reviewed non-damage support events, finite enemy statuses and Source-only admission
reuse the existing Source clock/player. Metadata-only publication preserves Aerith's
existing body/three Legacy skills. No new original rendering-fidelity claim.

Original archive aliases resolve automatically only when every candidate payload
hash agrees; differing versions remain blocked. Meteor's38-node original and all
12dependencies are present, but authoring-independent binary interpretation is
incomplete. No neutral fallback or partial import. Additional candidates retain
explicit curve/type4/7/authoring gates. See the latest reconstruction map.

Audio preparation is METADATA ONLY: serialized group sound IDs/times preserved
with raw fields, unresolved resources and playbackSupported:false.8 local WAVs,
250 UTF bank candidates,2 XML-header unclassified .acb and126 unclassified .dat
were inventoried; SE.acb matches live external ADB bytes. No proven cue/codec join.
Sound-only groups are retained; unexplained non-file visual commands reject. No
new audio playback, music, background system or timeline rewrite. Reproduction:
[skill workflow](skill-reconstruction-workflow.md), latest section.

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

## Status: automatic screen surfaces (2026-11-09)

Every `ffbe-screen-api` publish runs `prepare_scene_flashes.py --screen-backdrops`. Current
automatic rules (all keep colour/alpha/timing as source data; details in docs/current-state.md,
Pipelines): static uniform unit-XY Model >= 640 wide; opaque constant-colour backdrop Quad; uniform
Basic Particle held >= 80 % of the effect; screen-sized (>= 300 units) opaque Basic Particle, also
with gradient textures; white impact-flash Quad (<= 30 frames) and white impact-flash Particle
(<= 60 frames, any anchor). Checks: `tools/test_scene_flashes.py`; a dry run over all 416
screen-API plans on 2026-11-09 added coverage only to Squall's Lion Heart (3 nodes).

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

Central reconstruction status: [SKILL_RECONSTRUCTION_MAP.md](research/SKILL_RECONSTRUCTION_MAP.md).
Use this map for current component statuses, dependencies, evidence, acceptance
gates and the next milestone. It inventories30 core responsibilities plus three
separate extensions/routes. PC is the primary target. The initial mapping task
changed documentation only; the subsequent bounded integration is recorded there.
Update the map when a relevant rule, integration boundary or verified result changes.

Current reconstruction priority: connected native run G is now available. It
contains21 controlled original unit steps,8 emitter initializations and all9
source roles, including the host root. NativeGeneratorOwner is integrated in the
productive bounded Particle program; the bounded Null/Particle multi-record/parent-gated
projection now matches G; full mixed traversal remains pending. Reuse the trace.
RootLife header metadata is now kept separate from node0's life in newly prepared
plans. Cloud's frozen frames retain0 changed pixels; no new Cloud fidelity is
claimed. See the map for actual counts, source/measurement boundaries, hashes,
commands and the remaining0/9 complete-node acceptance. Current install32 works;
observer33 source fixes are VM-tested but not installed. Raw capture artifacts
stay ignored and are retained by the existing preview preserver.

Current body/effect checkpoint: the user confirmed the three Cloud live source
presentations as the minimum visual baseline. Source body completion now starts
recovery independently of effect end; a shared body/effect/damage barrier retains
the turn/reward lock. The existing prepared approach/return frames remain reviewed
adaptations, not native movement evidence. Publication/import/runtime now reject
scope/movement mismatch before MP. See the map's latest entry for93 distinct Node tests,
full action state traces, cancellation/error tests and preserved pixel baselines.
Frozen product PNG comparisons and a tracked identity alarm protect the baseline;
copy the ignored reference archive for another PC before running the pixel check.
No native graph capability was newly inferred;0/9 full prefix nodes remain accepted.

Controlled live-scene migration now takes priority over further isolated native
research. The same prepared preview player runs in the actual game via a generic
Phaser WebGL bridge. Three Cloud bindings use explicit experimental manifests;
Legacy remains selectable and all unbound skills retain it. Publication command:
`node tools/publish_scene_presentations.mjs --recipe tools/presentations/cloud-review.json`.
See the central map's current migration entry for preview-parity pixels, shared
geometry tests, resources, mode restrictions and native-fidelity gaps. This is
not full source-graph reconstruction;0/9 native prefix nodes remain complete.

The follow-up independent-source checks found a generic BR3M empty-name-table
layout, now admitted with absent texture-pointer guards and counterpart geometry
tests. Cross Slash is a standalone game import control, not a new loadout/reward
or native reference. The wholly unadjusted Finishing Touch candidate blocks on
unknown type7 before hierarchy/instance preparation; no placeholder is published.
Longer effects are bounded by action completion before reward/next-wave selection.
Current tests/archives and the remaining body-return choreography difference are
recorded in the map and renderer-session-handoff.md.

Current visual preservation checkpoint (2026-10-26): the native reference corpus
is **Brave Slash, Blade Beam and Climhazzard only**. Satellite Beam was never
checked in BlueStacks; its saved converted preview is product history/regression,
not original-engine evidence.44 BMB plans/resources and existing screenshots were
frozen with renderer/SDK bytes in a verified local39MB archive before changes.
Isolated replays for all three Cloud skills and Climhazzard's bound camera work.
See the map's visual preservation section for versions, commands and limitations.
Historical exact pixel identity is not established where old code hashes are absent.

Safe product transfer is deliberately smaller than whole BMB playback: explicit
per-effect sampling plus extruded atlas gutters. Brave's pink and Blade's green
effect use reviewed linear display sampling; all180 frame interiors remain exact.
Units stay nearest/pixel-art. This is a display adaptation, not verified original
FFBE sampling. Larger geometry/UV2/material/lifecycle improvements remain preserved
references until complete prepared profiles can safely execute them. Barret's
presentation was restored unchanged following the user's scope correction.
The productive Motion-1 and native Particle simulation remain intact;0/9 complete
prefix nodes are accepted. Technical and visual results are reported separately.

Follow-up P13 evidence:160 original Null Initialize flag-block controls match a
generic tools helper and source-joined numeric trace. Actual parent/child words
remain unknown. InitContext5c and60 feed different NodeTree fields; the proven
arithmetic is not a license to guess a runtime selector. No productive graph or
additional visual capability was enabled. Exact reproduction and next measurement
are recorded in the map and native-null-parent-chains.md.

Earlier autonomous integration checkpoint (2026-10-26): the shared original-code
phase clock and bounded finite Particle birth/life/RNG/ConstX/VelocityX simulation
now also drive a strict prepared dynamic program in productive Phaser scenes.
Scalar alpha reuses the measured common helper. Compilation remains in tools;
raw BMB does not enter src. Native controls:29 clock cases/891 phase events and
33 Particle cases; no whole-source acceptance. The registered control assembly
is not a mapped skill. Motion-1 and all three published reference skills retain
their mappings. See the map's current autonomous checkpoint for exact limits,
commands and current verification.0/9 complete nodes; original source Initialize,
child allocation/parent RNG ownership and full material/pixel comparison remain
blocking. FFBE Trace ADB is reachable; private run-as fails. No emulator changes.
The following entries describe earlier revisions.

Previous bounded lifecycle checkpoint (2026-10-26): the nine-node attack prefix
has a deterministic common-player CPU trace, not an accepted native lifecycle.
Native Null/Quad/Particle activation matches51 controls across two sources.
Source-admitted generator delays now use the original symmetric/exclusive window;
disabled Quad/Particle sources consume no birth/RNG. Four-word RNG is implemented
for explicit activation inputs; preview emitter ownership/module sampling remain
legacy and must not be relabeled native.31 player/lifecycle checks,14 import tests,
34 combat assertions, shared-source Python and build pass. No src/published-asset
change, new game capture or full original-frame comparison.0/9 complete nodes.
See the map's current lifecycle checkpoint for per-node evidence, commands and
the exact missing ordered NodeTree reference. Older checkpoints below are history.

Active integration checkpoint (2026-10-26): user authorized one common improvement.
Ordinary motion-1 unit/skill composition now compiles to the existing prepared
presentation and executes in the product's shared melee/area visual scheduler.
Brave Slash includes its exact-form white prefix at F3 and pink impact at F6;
both are converted sheets, not accepted complete original BMB rendering.14 import
tests,34 combat checks, the build and four actual product browser cases pass.
See the map's current checkpoint and character-import-workflow.md. No new original
capture/native export was performed. Next gate is complete-source lifecycle
integration/admission, not another isolated visual adjustment. The paused-review
and native-route paragraphs below are historical and do not supersede this entry.

Active checkpoint (2026-10-26): [architecture and root-cause audit](research/skill-pipeline-architecture-audit.md).
The user paused further implementation/capture loops for this review. It supersedes
the execution recommendations in the historical entries below. The product sheet
path, BMB preview, offline native references and live pixel export are separate
capability levels. Mixed blend-run transfer is verified for one native sample;
complete/repeatable native export and a universal skill importer are not established.
Trace revision5 is installed, request `{}`, fixed-step capture untested. No new
renderer change, recording or test rerun was performed for the architecture audit.
Review its prioritized plan and acceptance criteria before resuming implementation.

Current native route: [first isolated live GPU export](research/live-native-gpu-export.md).
User declined the manufacturer inquiry and approved using the game-loaded path.
Trace revision3 mirrors13 actual pink-impact GPU commands into transparent/black/
white FBOs, with three real1080x1917 readbacks and inspected PNGs. Standard alpha
PNG compositing fails the native white-background comparison; no publication.
One state only: preserve blend composition and obtain a short sequence/second
source before claiming an exporter. Request disarmed; Trace diagnostic idle.

Current user-directed backend audit: [original renderer/browser SDK feasibility](research/browser-original-renderer-feasibility.md).
Pause further isolated reconstruction pending this decision. The actual ARM64
Android ELF fails V8 Wasm format loading; a separately Emscripten-built BISHAMON
WebGL SDK has primary-source deployment evidence. Matching SDK/source is not
present in the inspected project; access and legacy compatibility remain open.
The earlier Android export attempt already failed isolated creation/zero PNGs;
it was not repeated. Inquiry draft prepared, not sent. No browser render,
emulator change, SDK purchase or runtime publication was performed.

Current parent milestone: [original Null chains and source parent-to-Quad handoff](research/native-null-parent-chains.md).
All four Null init/update lists execute under explicit auxiliary-flag0/parent/RNG
fixtures; source random rotation, uniform native scale and moving parent reach
Quad output in an integration check. The original fourth delta_zero_update array
is now retained/count-checked; flag1 execution blocks until that phase is wired.
Birth order, inheritance/selector derivation and complete nine-node export remain
open.86 Python tests pass, no capture/emulator/preview change or publication.

Current combat acceptance target: [Brave Slash's mapped white attack prefix](research/brave-slash-connected-combat.md).
All four original Quad init/update/make arrays and source-selected one/two-texture
writers execute with native profiles/guards and explicit controlled geometry hosts;
the receipt retains all nine source nodes and explicitly reports no whole-effect
export. Opt-in placementFromUpdate connects original translation, primitive-copy
and make-context-copy blocks to packed output with an explicit parent fixture.
The init/update context overlap that suppressed velocity is corrected. Source
random/nested parent traversal and two-texture material/submission remain gates
on this same target.79 Python tests pass, no emulator/new capture,
preview change or publication. Do not switch to unrelated fixtures or omit nodes.

Current second-source acceptance: [textured Capsule export](research/connected-second-effect.md).
The same connected path exports a second complete five-node source/123 states,
with original Default locator, constant alpha and actual nonuniform Basic PNG.
11 acceptance/54 reference/15 Node tests pass; both browser baselines pass five
host GPU checks. Capsule is a standalone fixture, not a Cloud skill. Parent/host
adapters and sampler limits remain explicit; no emulator use or publication.

Current connected acceptance result: [source-to-vertex effect export](research/connected-effect-export.md).
One complete admitted four-node effect exports32 states through native Particle
generation/lifetime, complete selected module chains and the source-selected
textured writer. A separate viewer plays only the exported stream. Constant
parent traversal and host inputs remain explicit adapters, not full NodeTree.
6 acceptance/54 reference/20 Node tests and actual F8/F31 browser checks pass.
No arbitrary-skill claim, emulator use or publication. Next acceptance target
is a second effect through the same path without individual correction values.

Current visible integration: [source-gated Particle alpha A/B](research/native-scalar-alpha-preview.md).
Separate candidate plans can enable the verified helper only on matching
source-selected Particle Curve nodes. Climhazzard5/7 qualify; actual browser
F12 A/B and F35 checks pass, with independent untextured comparison gating.
35 Node/3 exporter tests, five host GPU and49 baseline GPU checks pass. No runtime
publication, new recording or emulator use; other curve families remain unchanged.

Current scalar rule: [native Particle alpha evaluator](research/native-scalar-alpha.md).
Shared nativeScalarAlpha matches576 original ARM64 outputs across64 controls:
Constant/Linear/Spline/BreakSpline, mixed types, endpoints, tangent selection
and alpha clamp. Maximum numeric residual4.77e-8.33 Node and54 Python tests pass.
The helper is not yet enabled on active preview plans; vector/other alpha modes
and work-budget reservations remain separate. No emulator use or publication.

Current chain execution: [Particle init/update and scalar alpha](research/native-particle-chains.md).
Opt-in --probe-chains executes11 complete selected init/update lists with
explicit scalar-alpha relocation;2 remain input-gated. Native update/init cursor
consumption agrees within the work budget, but unconsumed20/32-byte reservations
remain unresolved. Original scalar Spline controls disagree with preview tangent
scaling/selection; no JS change yet. All54 tests pass. No publication, emulator
use, capture or visible preview change.

Current module selection: [original Particle arrays/profile](research/native-particle-assignment.md).
Original AssignModule/GetModuleCount/GetModuleWorkSize now execute for13 raw
Particle nodes with an explicit empty field context. Ordered arrays contain
67 init/67 update/95 make references; native counts agree, work sizes60..100
bytes. All48 reference tests pass. Selected callbacks are not executed by this
tool; curve/resource relocation, record cursors and parent/child fields remain
gates. No preview change, emulator use, capture or publication.

Current phase bridge: [Particle callback/PostUpdate](research/native-particle-phases.md).
An explicit initialized mode executes original delayed-start progression,
lifetime/negative-age initialization and optional source-selected ConstX through
real wrappers with shared emitter RNG. Thirteen source nodes run;39 reference
tests pass. Parent helpers are neutral fixtures and other modules are omitted;
complete traversal/module arrays remain the next gate. No preview promotion,
emulator use or new capture.

Current simulation research: [offline Particle scheduling](research/native-particle-scheduling.md).
Original constant-generator activation/Update now executes with intercepted
birth requests. Thirteen source Particle nodes and13 controlled fixtures expose
fixed-point timing, symmetric start jitter and emitter RNG consumption;31
reference tests pass. Delayed starts require the separate PostUpdate phase;
callback initialization/RNG, nested traversal and other traits remain outside.
No preview change, publication, emulator use or new recording.

Current binding milestone: [skills in the measured host](research/bound-effect-host.md).
Explicit source rectangle/scatter inputs now connect imported members to the
native-world compositor in a separate research view. Member XY scale is an
explicit policy; missing bindings reject. Thirty Node tests, five actual GPU
host checks and49 ordinary-preview GPU checks pass. Original actors/HUD, native
RNG/birth timing and remaining material support are not claimed. No publication
or emulator use; ordinary preview remains independently available.

Current compositor milestone: [opt-in effect host composition](research/effect-host-compositor.md).
The shared compositor consumes the supplied camera/viewport/scissor, preserves
the full host background and intermediate RGBA, and restores selected renderer
state. Five actual GPU checks pass, including exact1080x1920 clipping;28 Node
tests and49 existing preview GPU checks pass. Ordinary skill/native-world anchor
binding is still a separate next step; no game publication. No emulator use.

Current offline integration: [shared effect host contract](research/effect-host-context.md).
The shared renderer module validates separate engine/camera/framebuffer inputs,
converts source placement, projects points and computes GL/canvas clip bounds.
A generic exporter derives clean metadata from exact native/GL pairs. All six
measured strobe roots match;37 targeted tests pass. Existing preview composition
and game support remain unchanged; visible viewport/scissor consumption is the
next bounded step. No PC control or new capture in this block.

Latest live result: [revision23 native submission](research/native-draw-submission.md#live-revision23-result-observation-gap-closed).
Installed/calibrated only in FFBE Trace. The strobe is now positively observed:
six native auto-index submissions match six actual glDrawArrays calls, each with
six vertices and exact GPU/root identity. Both sampled effects give12 actual GL
calls/12 root joins; no probe errors. The old absent observation does not justify
suppressing the flash, and its former cause remains unproved. Native viewport/
scissor and placement rectangle are distinct measured inputs. Thirty targeted
tests and the source/RNG/delta replay pass. No preview/runtime promotion.

Current live milestone: [revision22 source/context validation](research/native-pipeline-context-observer.md#revision22-live-result-current-checkpoint).
Revisions21/22 are installed/calibrated only in FFBE Trace. Brave's six GL/root
joins and ConstX updates now succeed. Climhazzard's initializer and six actual
VelocityX updates replay bit-exactly from source/RNG/deltas, with no probe errors.
Its upstream screen placement rectangle is640x666; no GL draw was observed in
the strobe's own scope, so native flash visibility/clip remains unresolved.
Forty-one targeted tests pass. No preview adjustment or runtime promotion.

Current original-renderer milestone: [bounded native context observer](research/native-pipeline-context-observer.md).
Revision20 in FFBE Trace captured Brave Slash:30 completed sample scopes,
41 callback returns and six actual GL draws. Five random ConstX initializations
replay bit-exactly through original ARM64 code using source parameters and each
measured RNG state, including RNG-after. All23 init/update owner checks match.
Two precise probe gaps remain: early empty draws exhausted root/camera snapshots,
and a four-byte ConstX update wrapper cannot be intercepted (its native delegate
is statically resolved). Viewport/scissor is measured at actual wrapper draws,
not yet assigned to the later white plane. Fifteen observer, six dispatch and
four evidence-guard tests pass. No preview geometry or runtime support changed.

Latest host follow-up: [screen-anchor reference](research/screen-anchor-host-reference.md).
An explicit full-host screen rectangle moves Climhazzard's unchanged strobe down
126 preview pixels relative to the old arena-only baseline. Current game-view
bottom gap falls from126.625 to0.625 pixels; native proportions retain18.625 pixels
under adapted dock rules. A separate switch preserves A/B; this is not recovered
native Climhazzard screen bounds. Node84 pass; browser A/B confirms the placement
shift at unchanged plane size. No new capture/publication.

Latest host integration: [explicit preview scene contract](research/preview-host-scene-contract.md).
The old preview mixed 1000x1100 game layout with a 1000x800 canvas and omitted
the dock. New legacy/game/native-proportion contexts share camera/anchor/canvas
dimensions and explicit foreground ordering. Brave Slash/Climhazzard inspected
without their earlier freestanding rectangles in native-proportion host views.
Source geometry is unchanged; original scene fidelity remains unproven. Node82
and browser49 GPU fixtures per skill pass. No new capture or publication.

Latest white-boundary diagnosis: [native viewport and original UI context](research/white-plane-viewport-ui.md).
Recorded Brave Slash geometry excludes side/top edges under the native camera;
its lower edge remains inside the full viewport, in the party-panel band of a
separate original video. UI occlusion is a concrete explanation, not synchronized
proof. No size/mask workaround was applied. Host view/composition remains the next gate.

Current visible issue: [remaining white-plane boundaries](research/brave-slash-white-flash.md)
in Brave Slash and Climhazzard; the user confirmed Blade Beam has no white box.
The X milestone below did not resolve this. Native camera/viewport/placement and
clipping must be separated from source-plane geometry before further size fixes.

Latest 2026-10-25 integration: [deterministic native Particle X preview](research/native-particle-x-preview.md)
adds `--native-particle-x` and a shared switchable OneX/nonrandom ConstX display
gate. One Climhazzard strobe Particle qualifies; randomized/dynamic cases remain
outside. Simulation transforms are unchanged. Browser A/B and 49 GPU checks
pass; Node runner 78 / Python pipeline 77 pass. This is research-only support.

Latest 2026-10-25 X-family block: [native Particle X-scale chains](research/native-particle-x-scale.md)
checks original OneX/ConstX/VelocityX consumers and scalar init/update behavior.
These replicate both local size and Joint X, ignoring Joint Y/Z. Thirty-six
controlled chains plus eleven raw-source cases execute; 26 targeted tests pass.
Scale init/update dispatch is now read alongside make selection. Playback gates,
native scheduling and broader inheritance remain unchanged/unresolved.

Latest 2026-10-25 source bridge: [Particle dispatch and Joint scale](research/native-particle-source-dispatch.md)
resolves initial scale/rotation make-vertex pointers for all 13 Particle nodes
in the eight-effect corpus directly from IBMB/native tables, including Power
Geyser without authoring. Joint-scale storage/consumption is traced for the
inspected Null path. Eleven particles select X variants, which remain the next
offline gate. Eighteen targeted tests pass; no playback support was expanded.

Latest 2026-10-25 follow-up: [constant Particle module dataflow](research/native-particle-module-dataflow.md)
executes original Const initializers and make-vertex modules into the writer.
Local Z roll, separate record/group scale factors, range sampling, negative-scale
clamping and RNG consumption are now checked on 16 controlled chains.
The group-vector producer and arbitrary-node dispatch remain open. No preview
gate changed; no new capture. Twelve targeted Particle reference tests pass.

Latest 2026-10-25 offline block: [Particle buffer-writer reference](research/native-particle-writer-offline-reference.md)
executes the observed single-texture ARM64 writer on 48 geometry fixtures and
reproduces an existing six-vertex output under documented reconstructed inputs.
Six targeted differential tests pass. Computed roll/scale input provenance is
still open; this adds a reusable reference, without changing preview gates or
published effects. No new recording or emulator interaction was needed.

Latest 2026-10-25 block: [offline native ZScreen reference](research/native-zscreen-offline-reference.md)
adds source-dispatched constant-scale/roll Null locators. All four matched
Billboard controls in the three-skill corpus are eligible. Particle/Model facing,
general cameras, random/time semantics and unsupported variants remain open.
The original ARM64 function was exercised on 16 offline cases and agreed with
six existing samples under documented reconstruction assumptions.
86 Node and 84 Python tests pass. No new capture or publication.

Session resume: [renderer handoff saved on 2026-10-24](renderer-session-handoff.md)
records the exact candidate, checks, remaining work and local-only sync boundary.

Previous material block: [native blending and global uniform evidence](research/native-blend-global-uniforms.md)
adds an opt-in native FUNC_ADD/factor table and preserves alpha inside each
preview effect pass before opaque RGB presentation. Semitrans alpha is corrected;
the existing SemiAdd preset was confirmed. The global colorScale default 1 and
setAlpha write path are source-verified; invocation values/timing remain unknown.
83 Node and 84 Python tests pass. No new emulator capture or publication.

Previous block: [native Model selection and Basic material](research/native-model-basic-material.md)
adds the verified UV single-submesh Model path. All 56 source nodes in the
three-skill corpus now have initial selections, including the previously open
26 Models. The optional constant Basic tint path is checked against an unedited
native vertex/fragment pair. Its 26 supported tints are neutral white here;
random/source-less tints remain explicit unsupported cases. Live bindings,
global uniforms, other geometry layouts and overall fidelity remain open.
80 Node tests and 84 Python tests pass. No new recording was needed.

Previous block: [initial native material selection](research/native-material-selection.md)
now connects original Quad/Particle fields to exact shader slots. All 16 Add
nodes and both Distortion quads in the three-skill corpus match their pinned
fragments. The shared Distortion candidate now applies sampled alpha to both
displacement and output alpha. This is an opt-in research path; live overrides,
Model selection, global uniforms and whole-skill fidelity remain unresolved.
No new game recording was needed.
All three browser previews pass their 12 native-fragment GPU checks and the
existing blend/model checks; 78 Node tests, 78 Python tests and the game build
pass. The existing bundle-size warning remains.

Previous autonomous block: the [pinned native-family Add material candidate](research/shader-add-material.md)
now preserves base alpha and weights secondary RGB according to recovered GLSL,
with six direct GPU comparisons passing in all three skill previews. It remains
opt-in; initial Quad/Particle selection is now covered above, while live
binding/global colorScale are unverified. The complete
local suites pass (76 Node / 72 Python), and the game build passes with its bundle
size warning. These checks and this renderer improvement do not approve whole
skills or publication. No new emulator capture was required.

Current handoff: **2026-10-25**, including the native composition evidence and
the separate composed Brave Slash research preview. This is the entry point for agents and contributors working on
characters, backgrounds, skills or their raw sources. Read it before choosing
an importer or applying a renderer correction.

## Is the pipeline finished?

There is a usable character-sheet publication path, a reviewed static-background
path, and a reusable original-skill staging/preview path. There is **not** a
complete, original-faithful extractor for arbitrary FFBE skills or animated
backgrounds. Better-looking previews and passing field comparisons do not close
those gaps. The latest original-data preview has not replaced the published
Phaser effects.

| Area | Working boundary | Remaining boundary |
| --- | --- | --- |
| Character body animation | Exact-form, single-atlas CGG/CGS conversion through ffbetool, prepared sheets, shared pivots, manifest and recipe publication | Alternate atlases/forms/tracks need explicit review; registration does not make a new hero playable in the fixed party |
| Enemies | Existing lower-level sprite conversion and current prepared enemies | No general reviewed enemy/ability/boss import contract; art availability does not provide AI or encounter behavior |
| Backgrounds | Two reviewed, static JPG arenas; proportional fit, reviewed floor regions and shared formation | Manual selection/copy; no SSBP/GIF/layered animation reconstruction |
| Existing game skill effects | Reviewed converted-effect baking and limited shared timeline executors | Deliberate adaptations and legacy commands remain; converted files are not native-renderer references |
| Original skill reconstruction | Exact source resolution, indexed extraction, partial binary decoding, selected source supplements, common preview of Brave Slash / Blade Beam / Climhazzard | Incomplete materials, geometry and placement semantics; no publication bridge from these research plans into the game |
| Skill rewards | Design direction recorded | Dynamic run skill ownership, approved reward pool and skill-card progression are separate future work |

The product needs names and coherent animations. **Do not implement FFBE
chaining, chain multipliers or original damage formulas as import prerequisites.**
Keep source impact times as visual evidence. The reviewed roguelike definition
chooses damage events, costs and later wave balance independently.

## Choose the right workflow

Read [the asset structure guide](asset_structure.md) before searching a dump.
Then use the workflow matching the task:

| Task | Operational guide |
| --- | --- |
| Inspect an exact character, convert body tracks, publish a reviewed character or existing converted effect | [Character and skill import standard](character-import-workflow.md) |
| Select a complete static scene, copy it with provenance, register it and review its floor/formation | [Background import workflow](background-import-workflow.md) |
| Resolve and decode original skill components, prepare the current three-skill comparison, investigate unsupported rendering | [Original skill reconstruction workflow](skill-reconstruction-workflow.md) |
| Adjust actor/target placement or UI against the current arenas | [Battle layout](battle-layout.md) |
| Design skill acquisition and rewards after visuals are ready | [Skill pipeline foundation](research/skill-pipeline-foundation.md) — design, not implemented behavior |

The workflows describe current commands and limitations. Research documents are
revision-specific evidence: an old “next step,” test total, port, or unsupported
feature may have been superseded. Follow their links to later work and the status
here. Do not copy an old manual angle or importer shortcut into the new path.
If code and documentation disagree, inspect the implementation and report the
discrepancy; do not force the data to match prose.

## Data ownership and interpretation

| Location / format | Meaning and handling |
| --- | --- |
| `rawdata/ffbe_asset_dump/` | Local art inventory: exact unit/monster atlases and CGG/CGS, icons, background companions and previews. Naming is a discovery aid, not proof of identity or completeness. |
| `rawdata/assets/static_data/ffbe-data.db` | Read-only source records: exact form to series, acquisitions, ability/magic, groups and effect references. Preserve region/version and database hash. |
| `rawdata/ffbe_data/` | Separate GL/JP metadata for descriptions and cross-checks. Do not silently join versions by name or presumed numeric equivalence. |
| `rawdata/android-global/files/` | Original CPK archive source. Use indexed exact members; do not bulk-extract the backup or include preferences/account data in reports. |
| Original `.bmb` / `IBMB` | Runtime effect binary with version-specific, partially decoded node structure and resources. Known type/layout checks fail closed; unknown fields are not zeros. |
| Original `.m3r` / `BR3M` | Model geometry/resource data. Preserve positions, normals, UVs, triangles and packed vertex colors; reading a field does not prove shader support. |
| `rawdata/assets/battle_effect/*.bmsln` | Optional authoring XML. Supplement only explicitly matched BMBs after existing comparison succeeds. Stored curves may be inactive. |
| `rawdata/assets/battle_effect/*.efkefc`, `rawdata/assets/effect_resource/` | Converted counterparts and resources for the existing bake path. Conversion can omit original semantics; it is not a fidelity oracle. |
| `tools/characters/`, `tools/effects/` | Reviewed offline recipes. Gameplay adaptations, source variant and bake transforms remain explicit. |
| `tools/data/` | Ignored staging, reports, plans, extracted resources, receipts and review screenshots. Recreate them from commands and source hashes on each PC. |
| `public/assets/` | Selected prepared runtime sheets/images and clean JSON only. No raw-format parsers or raw dumps belong in the Phaser game. |

The root `assets/` source package and `public/assets/` runtime outputs are
different layers. Tools and raw sources are ignored by Git; inspect `.gitignore`
before introducing a new cache. Do not stage an entire dump to make a missing
local fixture available on the other PC.

## Rules for reading source data

1. **Resolve identity before geometry.** Use exact sprite form and database
   series/acquisition records. `effectFrames` references effect groups, which
   then reference effects; group/effect IDs can collide. Preserve all member
   fields and process associations, including unknowns and alternate references.
2. **Select the active mode before evaluating values.** A serialized curve is
   not evidence that Curve mode is selected. Constant, NewtonDynamics, CurveValue
   and CurveSpeed have different meanings. This applies to movement, UVs, color,
   alpha and deformation. Do not “fix” appearance by activating dormant data.
3. **Keep coordinate layers separate.** Body crop/pivot, effect-local geometry,
   parent inheritance, texture UV transform, member transform and arena anchor
   are distinct. A UV quarter-turn must not also rotate a model or trajectory.
   Pixel size does not establish native physical units or placement conventions.
4. **Preserve clocks.** FFBE effect/impact source ticks are 60 Hz; they are not
   character sheet indices. Body tracks have their own frame delays. Snapshot
   inheritance at the actual (possibly fractional) birth time and keep seeking
   deterministic for review.
5. **Keep evidence status separate from playback status.** A value can be read
   correctly while its equation remains experimental. An unsupported component
   must remain visible in the report even if the rest of the animation plays.
6. **Prove shared changes with controls.** Use affected and unchanged cases,
   retain source hashes, inspect the whole animation and compare the same frame
   before/after. No per-skill angle/offset stack or substitute effect hides an
   unresolved source rule.

The current importer conservatively labels later `@` segments as conditional.
The composition audit shows that `@` can separate parallel process groups; the
separator alone does not establish a condition. Do not flatten those groups,
assume they are optional, or treat the present parser label as the native rule.

## Current shared-renderer priority

**Current result:** the [native-export feasibility attempt](research/native-export-feasibility.md)
did not establish isolated loading: both reviewed names returned null through the
tested game-factory invocation. No frames/PNGs or compositing result were obtained.
The experiment is stopped and FFBE Trace was restored to validated revision 14.
The next bounded shared-renderer step is now implemented as an opt-in
[zero-roll Particle geometry experiment](research/particle-geometry-subset.md).
Its source-property gate admits one of four Brave Slash Particle nodes; Blade
Beam (0/2) and Climhazzard (0/7) remain negative controls. It reproduces the
measured white-flash extents, preserves the unresolved evaluator center and
explicitly labels unsupported geometry as legacy comparison. The visible F29
boundary remains; native locator/projection and variant dispatch are not solved.
No production effects were replaced. The subsequent
[locator/projection audit](research/particle-locator-projection.md) reuses the
same revision-14 session for all six native vertex samples and camera/root data.
It establishes the analytical native viewport conversion and isolates a center
residual consistent with the evaluator rotating the local 125-unit offset by
25 degrees. This is not a proven no-rotation rule. The named remaining input is
the active ancestor locator/update path and its transforms at nodes 1/33;
node-34-only observations cannot establish the general selection rule.
The [ancestor capture result](research/ancestor-locator-result.md) now identifies
the missing source Null/Billboard locator path: pink node 1 executes ZScreen,
then Standard node 33 produces the untilted offset, matching both native white
vertex centers. The full revision-18 scope capture was rejected because descendant
callbacks leaked into parent scopes; only validated direct prefixes are retained.
FFBE Trace is restored to calibrated revision 14. Revision 19 instrumentation
fixes are source-only. The next bounded work is an opt-in shared Null/Billboard
locator subset, preserving source mode and Standard controls; no global removal
of parent rotations or additional capture round is needed to prepare it.
That [opt-in Null locator subset](research/null-locator-subset.md) is now
implemented and browser-tested. Its source/property gate admits the pink
Billboard ancestor, preserves Standard controls and reproduces the measured
white center within float precision. Blade Beam and Climhazzard remain unchanged
negative controls because their Null variants fall outside the gate. Rotated
cameras, Z roll, other scales/compatibility and source-less modes remain open.
The broad preview's white boundary still remains; no game effect was published.
The subsequent [current native-viewport comparison](research/native-viewport-current.md)
connects both geometry subsets to the recorded camera/root without another
capture. The isolated plane's projected lower edge matches browser output within
one CSS pixel, and its side edges are outside the native viewport. The bottom
edge remains inside the full viewport. The diagnostic now shows that full view
and uses an opaque neutral background so additive color is not lost through a
transparent canvas. This is geometry/display validation, not native material,
timing, scissor or publication approval; remaining capabilities stay separate.

The [combined revision-14 measurement and backend decision](research/renderer-backend-decision.md)
previously prioritized that feasibility milestone. Native alpha
and vertex output were captured successfully; decoded numeric fields match the
staged source, but geometry differs from the current unit-plane evaluator. Full
loaded-file equality, general Particle semantics and shader binding remain open.
Keep the existing local renderer for comparison. No native exporter is proven
and no runtime rendering support was added by this measurement.

The [current renderer coverage inventory](research/renderer-coverage-priorities.md)
re-evaluates the three actual plans against current runtime predicates and
verified original model data. It separates missing inputs, withheld geometry,
unverified equations, unknown source controls and already implemented subsets.
The opt-in shared model vertex-RGBA A/B path is now implemented and browser-tested:
six affected Brave Slash nodes and two Climhazzard nodes, with opaque-white Blade
Beam models as unchanged controls. This is not a per-skill size adjustment.
Power Geyser's 30 nodes lack matched authoring controls; general binary-only
support and an original-data export/publication bridge remain open. The linked
review defines priorities, evidence, acceptance and the native-export fallback
decision gate. The [RGBA experiment](research/model-vertex-rgba.md) records the new shader path,
three-skill controls and reproduction commands. Native combination semantics remain
unverified; the next bounded question is nonzero parent-alpha/compatibility behavior.
The [frame-29 white rectangle diagnosis](research/brave-slash-white-flash.md)
identifies a textured Particle source layer, not a missing asset. The new
read-only node inspector records source state for this and other staged effects;
native primitive/material semantics remain open and no layer was removed.
The subsequent [native particle/material inspection](research/native-particle-material-evidence.md)
recovers named internal module boundaries and 360 shader-source entries from the
pinned APK. Alpha context instructions are checked; source-rate/compatibility
mapping and the actually selected node shader/vertex path remain unverified.
This is source recovery, not new rendered support or a native export command.
The [revision-13 scoped Particle capture](research/native-particle-node34-capture.md)
records eight node states and 36 calls across six selected callbacks. Attribution
uses filename/offset/byte windows; the full memory hash differs. Alpha values
were not captured because of a reserved-context-property defect. Source revision
14 fixes that defect with local regression coverage but is not yet installed.
Shader selection, complete source equality and the white rectangle remain open.
That installation status describes revision 13's handoff. The linked revision-14
decision supersedes it: revision 14 is installed and the combined capture is
validated, including six alpha/vertex samples and a reconstructed memory snapshot.

## Latest skill findings and open work

A 2026-10-24 [Memorial client feasibility check](research/memorial-client-access.md)
found a local community APK with native Bishamon wrapper exports and an existing
Frida script. The follow-up verified ADB access, installed build 208 and the
native library identity. A sampled Memorial CPK opens with the existing reader;
three Cloud effect payloads match current research inputs byte-for-byte. Private
app files remain inaccessible to the shell. A signed diagnostic prototype is now
installed only in the user-approved `FFBE Trace` clone (`emulator-5574`), with
3127 external asset-pack paths restored from backup. Its observer requires
native function fingerprints and a floating-point register calibration before
attaching game hooks. Observer revision 2 passed its runtime calibration with
three known float values and reported 14 active hooks after a clone-only update.
The download reached the main menu after the shell-owned restored asset tree was
moved aside and the app created its own tree. The first user-reported Blade Beam
test produced no skill records: the revision-2 command gate did not open.
Revision 3 now has independent hook counters and a manually armed 60-second
capture window; startup calibration and manual arming passed in the clone.
The manually armed user-reported Blade Beam test captured 35 native setter
records across five objects, confirming battle-hook reachability. File names,
effect-group IDs and the ability/form identity were not captured, so these
records are not yet a verified per-skill composition trace. Native coordinate
semantics, rendering capture and a working export interface remain unresolved.
Revision 4 adds an exact-build, getter-fingerprinted filename-field read at the
reached setters. Its controlled test joined seven effect names to 49 native
setter records, including both expected Blade Beam component keys with source-
matching scales (3x wave, 1x blue slash). This establishes filename-to-input
observation in this build; skill/form IDs, target ownership, scheduling and
native particle rendering remain unverified. `tools/memorial/summarize_trace.py`
reproduces the bounded object/source comparison from a captured arm token.
No original-data preview or runtime effect was changed.
See the linked research note for measurements, source hashes and limitations.

The subsequent preview comparison confirmed existing scale/zero-rotation inputs
and a +2 native-wait versus plan-start difference for both observed components;
scheduling equivalence remains unproven. A source-marker parser bug was fixed
(`-`-separated hit entries were dropped). Blade Beam's separate regenerated
`plan-native-comparison.json` now retains F4/F8 source markers. Its browser
playback and seeking were checked on port 3122; source member placement fields
remain unevaluated, and no native-fidelity approval or runtime publication was
made. `summarize_trace.py --plan` reproduces the parameter comparison.

The [native placement investigation](research/native-effect-placement.md) found
an ordinary member path using independent rectangle-axis modes, additive member
offsets and optional scatter. Its exact source fields and native instruction
locations are recorded. Observer revision 5 adds the group/rectangle input hook;
startup calibration and 15 hooks passed, but that caller's live reachability
and rectangle-to-preview mapping still await a controlled test. No placement
correction has been published or silently enabled in the preview.
The revision-5 battle window reached setters but **not** that rectangle hook;
the candidate caller is unproven for this path. Revision 6 now observes actual
setter return addresses, factory filename/result associations and alternate
group wrappers; calibration and 18 startup hooks passed. Live callsites and
the placement formula still require validation before preview integration.
The revision-6 controlled capture subsequently reached the alternate
`playBattleEffectWithGroupID` -> `playEffectWithGroupID` path and joined both
Blade Beam component groups with native rectangles and setters. Center + member
offset explains both positions with integer scatter residuals (+8/0, -4/+4);
captured caller wait + member delay explains waits 2/7. The live caller selects
a side field rectangle for source anchor mode 2, rather than a target centroid.
The comparison script reproduces this ordinary, unflipped-member validation.
Preview integration still needs an explicit coordinate/rectangle bridge; the
capture's dimensions must not become universal constants.
An opt-in preview bridge is now implemented with `--rectangle-placement`:
source axis/offset evaluation, dynamic arena-half rectangles and adapted unit
frame boxes, uniform coordinate conversion and zero scatter. All 15 player
checks pass. Browser review exercised both arenas and target selections; impact
effects render by enemies, but the green wave is outside the inspected frames.
This exposes a remaining effect-geometry/camera conversion gap; the separate
`plan-rectangle-placement.json` candidate on port 3123 is not approved or
published. No per-character compensating translation/scale was introduced.
The [native renderer-scale follow-up](research/native-renderer-scale.md) found
the separate global geometry multiplier `1136 / min(screenWidth, screenHeight)`
and measured 1.775 in the reference build (640x1100). An explicit
`--renderer-reference` receipt now supplies that multiplier to the shared
preview, preserving source offsets and positions. All 16 player checks pass;
the wave is visible at F20 in both arenas on port 3124. The new separate
`plan-renderer-reference.json` remains unapproved: native layer scale, camera
mapping and particle/material semantics are still incomplete.
The same path now prepares Brave Slash and Climhazzard, served with Blade Beam
on port 3125. A shared screen-rectangle mode (native source mode 4) was added;
source-placement and cover-fit modes cannot be combined. All 16 player checks
pass. Brave Slash's pink impact is visible by its target; Climhazzard shows the
slash and purple/rock burst but remains incomplete (57 renderer limitations and
a visible early strobe edge). These are research candidates, not new published
game skills or native-fidelity approvals. Reproduction is in the skill workflow.
The developer subsequently reported both new candidates as too large and
incomplete. A [focused Brave Slash native review](research/brave-slash-native-review.md)
now has a controlled video/native capture: 28 post-startup samples confirm
renderer factor 1.775 and layer factor 1. The video and native events also show
a green standard hit before the pink impact, absent from the skill-source-only
preview. Generic hit-profile mapping and matched screen-space size remain
unresolved; no scale patch or publication approval follows from this capture. The
[next native master investigation](research/native-hit-profiles.md) recovered
33 hit profiles and 173 process mappings. Its neutral profile is not the observed
green group, so no universal extra slash was added. Revision 10 directly compared the loaded
three-ability master: all six effect/attack-frame fields match local sources.
The green group's execution/assembly origin remains unresolved; differing values
of those ability fields do not explain it. Revision 11 now observes
command-frame snapshots and actual effect-input calls with thread-local joins;
clone installation/startup passed, and the new controlled battle capture is
completed for Brave Slash: skill 214800 and character 207000117 joined to
`2:1000520:1&6:5008050:1:1:0`. The recovered motion-1 assembly prepends unit
attack effects and shifts skill effects by their maximum start frame. A bounded
`compose_skill_effects.py` inspector matches the trace and predicts the existing
5-star form's own effect group. The subsequent
[composed Brave Slash preview](research/brave-slash-composed-preview.md) stages
its own white standard hit and shifted pink impact through the common resolver,
with component starts F3/F6 and origin metadata. Three-field groups now use the
verified native target anchor default. A stored but Constant-selected texture
alpha curve is explicitly reported as dormant rather than treated as active.
The separate plan on port 3126 was played through F210, reviewed in two arenas
and retains nine limitations; size/fidelity are unapproved. Existing source-only
plans, gameplay assets and the character form remain unchanged.
See the native hit-profile review for scope, evidence and commands.
The [native camera investigation](research/native-camera-comparison.md) now
shows Bishamon copying the first Cocos camera's view/projection matrices, while
the preview uses a fixed orthographic camera. Revision 12 adds read-only
before-draw matrix/viewport samples; clone installation and startup passed.
The controlled camera capture now has 16 before-draw samples: the actual
projection is orthographic, logical extent 640x1136, viewport 1080x1920. The
projected effect root approximately matches the recorded beam height. A separate
native-viewport comparison on port 3127 uses captured matrices/root and explicit
video frames; effect ages remain manually selected. Coverage/transparency differ,
so no size correction or fidelity approval follows yet. Native animation-age
alignment is the next bounded check; the composed port-3126 plan is unchanged.

The current reproducible research candidate is `plan-basic-uv.json` for the three
Cloud skills. The [skill workflow](skill-reconstruction-workflow.md) contains its
full preparation commands. Preview port 3121 is a convenience, not stored asset
state or a substitute for preparing the plans.

| Finding / capability | Current status and evidence |
| --- | --- |
| Active color/alpha selection | Bounded source-mode implementation prevents dormant curves from changing constant appearance; source-less Particle color remains unresolved. [Appearance review](research/original-appearance-review.md) |
| Rate-zero parent alpha; translation at birth | Implemented for explicitly supported cases, with fractional-time/deterministic-seek checks. Other inheritance/rate combinations remain open. [Inheritance review](research/original-inheritance-review.md) |
| Single-texture UV rotation and pivot | Source inputs restored under opt-in `--basic-uv`, using the shared experimental inverse-TRS policy. Blade Beam's three crescent layers contain -90 degrees; no new artwork angle or geometry correction was added. [Blade Beam audit](research/blade-beam-source-geometry.md) |
| Two-texture operations / distortion | Selected experimental material paths exist. The native shader equation, background-dependent behavior and transparent-sheet export are not generally solved. [Playback](research/original-skill-playback.md), [rectangle investigation](research/climhazzard-rectangle-investigation.md) |
| Particle and Model billboarding | Source camera-facing behavior is not fully implemented; simulation transforms and render orientation must be separated. [Particle geometry audit](research/original-particle-geometry-audit.md) |
| Model vertex colors | Original M3R RGBA can be multiplied into material RGBA under opt-in `--model-vertex-rgba`; GPU interpolation and three-skill A/B tested. Native combination remains unverified. [RGBA experiment](research/model-vertex-rgba.md) |
| Emission shape / untextured primitives | Blade Beam Model-surface emitter is withheld; source-less Power Geyser untextured Particle remains unresolved. Do not substitute point emission or a white rectangle. [Shared import](research/shared-skill-import-review.md), [rectangle investigation](research/climhazzard-rectangle-investigation.md) |
| Member placement / rotation conventions | Raw offsets, alternate-side selection, Euler/compatibility order and arena mapping remain unresolved. Blade Beam's -1100 is retained, not applied. The two-times-275 compensation hypothesis was rejected because one curve is dormant. [Composition audit](research/original-composition-audit.md), [Blade Beam audit](research/blade-beam-source-geometry.md) |
| Native fidelity / publication | No complete native-frame comparison has approved these research candidates. The player is an offline experiment; the existing game still uses its reviewed converted effects/adaptations. |

These are concrete work items, not requirements to reverse-engineer the entire
original engine before importing another supported skill. Pick one shared
capability, verify it on appropriate fixtures, and retain explicit limits.

## Verification

Work happens on the main PC only (raw data lives there); there is no second-PC setup any more.

Run commands from the repository root in PowerShell. The character workflow
describes Node.js 24, Python/Pillow, `FFROGUE_PYTHON`, ffbetool and the local effect
SDK prerequisites. Use the actual installed Python path on each machine; do not
hardcode another user's runtime directory into a recipe or shared command.

Check which sources, SDKs and ignored fixtures exist before running a command.
Tests that skip missing local source pairs do not prove those source paths work.
Do not assume `tools/data/` or a running preview server survives Git sync.

Choose checks according to the change:

- **Character/import or existing effect publication:** recipe inspection, the
  pipeline tests, relevant combat checks, build and real game motion/timing review
  described in the character workflow.
- **Original decoding/rendering:** relevant Python/Node source tests, inspect the
  generated reports, finite/deterministic playback and same-frame A/B. List
  remaining unknowns and whether an original-game reference was compared.
- **Background:** real image decode and visual review, source/output hash,
  dimensions, floor and actor extents. Code/registration changes additionally
  need the relevant build/browser checks.
- **Documentation only:** check commands/options against the current tools and
  local links against files. Do not report game behavior as retested.

The latest UV milestone recorded 15 Python and 26 Node tests passing with no
skips, plus full F0–F210 playback of all three skills and eight GPU blend checks
per preview without returned warning/error logs. These are dated observations,
not expected test-count assertions or proof of original fidelity. Its ignored
receipt is `tools/data/shared-skill-review/basic-uv-review-verification.json`.

For each import/reconstruction handoff, retain this information in a tracked
review note (and a detailed ignored machine-readable receipt when appropriate):

```text
Task and scope:
Source identity: region/version, exact form/skill/group/effect IDs
Inputs: repository-relative files, SHA-256, tool/recipe versions
Interpretation: active modes, supported fields, inferred rules, unknowns
Commands: inspection -> preparation -> preview -> publication, only steps used
Outputs: files/keys, dimensions/pivots/timing, checksums
Visual review: arena/target, seed/frames, reference URL/time if actually compared
Adaptations: explicit game choices; separate visual timing from damage events
Unsupported or withheld components:
Checks actually run: commands, results, skipped checks and limitations
Publication state: research-only / reviewed adaptation / runtime-checked
Next bounded task and relevant workflow/evidence links:
```

The terms in this handoff template are documentation labels, not new runtime
enums or a currently implemented approval database. A useful source or successful
preview does not automatically make a skill reward-eligible.

## Detailed evidence index

Use these when changing a specific decoder or rule; do not rederive field
offsets from image appearance:

| Topic | Reference |
| --- | --- |
| IBMB header, node lengths, hierarchy, scalar keys | [Structural reader](research/bmb-structural-reader.md) |
| Vector channels, float32 comparisons, active/dormant keys | [Vector channels](research/bmb-vector-channels.md), [shared skill additions](research/shared-skill-import-review.md) |
| Fixed transforms, mode slots, typed resource bindings | [Fixed parameters](research/bmb-fixed-parameters.md) |
| Materials, M3R layout, converted model differences | [Materials and models](research/bmb-materials-models.md) |
| Source appearance, field ambiguity and verification | [Appearance review](research/original-appearance-review.md) |
| Inheritance, billboards and source feature gaps | [Inheritance](research/original-inheritance-review.md), [particle geometry](research/original-particle-geometry-audit.md), [renderer audit](research/original-renderer-feature-audit.md) |
| Group tuple meanings, parallel processes, offsets | [Composition audit](research/original-composition-audit.md) |
| Latest UV correction and unresolved Blade Beam proportions | [Blade Beam source geometry](research/blade-beam-source-geometry.md) |
| Source-less effects and rejected searches | [Missing effect sources](research/missing-effect-sources.md), [Climhazzard feasibility](research/climhazzard-original-feasibility.md), [rectangle investigation](research/climhazzard-rectangle-investigation.md) |
| Body state/pivot behavior | [Character animation audit](research/character-animation-audit.md) and current character workflow |
| Earlier converted-effect adaptations | [Brave Slash](research/brave-slash-integration.md), [Cross Slash UV repair](research/cross-slash-uv-repair.md), [artwork orientation](research/effect-orientation.md), [Satellite Beam](research/satellite-beam-import.md) |
| Character identity and available skill catalog | [Cloud versions](research/cloud-version-comparison.md), [MVP skill audit](research/mvp-skill-audit.md) |
| Existing batch baker | [Batch workflow](research/skill-batch.md) — converted-effect path, not automatic original-data export |

When a future milestone changes a status above, update this handbook and its
operational workflow in the same change. Keep old receipts as historical
evidence and link the successor result; never rewrite a failed or unperformed
comparison as a success.

The reviewed Mainline arena batch and gallery build on the same strict SSPB export contract. See [the background workflow](background-import-workflow.md#reviewed-mainline-batch-and-gallery) for the catalog, soundtrack provenance, and preview route.

The Arena gallery now separates encounter roles from source provenance. The
local FFVII Remake Ex-SOLDIER bank supplies normal Reactor encounters. The
existing Guard Scorpion bank is explicitly bound to the boss. See the
[background workflow](background-import-workflow.md#battle-music-roles) for
loop points, hashes, fallback behavior and unavailable classical banks.
