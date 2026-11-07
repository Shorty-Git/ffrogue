# Existing roster skill coverage

## Active project: run roster, not a new skill-import wave (2026-11-01)

All15 Source definitions and published VFX are preserved. Six eligible original
identities participate in seeded runs: Cloud, Aerith, Cloud of Darkness, Cloud AC,
Delita and Jack. Barret stays in content/debug but cannot enter starter draws
without a published Source skill. Research gates below remain paused/intact.

Run catalog separates identity/current original form/visual asset key/stats/skills.
Only classic Cloud's prepared original6-star207000106 awakening is enabled; raw
same-series forms are recorded in tools/data/roguelike-foundation-20261101/unit-forms.json.
Those inventory entries are not publication approvals. No AC/Remake identity swap.
No new FFBE mechanics or16th Source skill are claimed.

## Current: exact Barret form and full release paths (2026-11-01)

Iai Strike is now personally visually accepted by the user.15 Source commands
remain published. This block releases ZERO new skills and changes no runtime,
VFX, existing recipe or gameplay definition. Parent fadd8bb1392f2309620fe9aa86c0edba333e3fce.

### Which Barret is actually installed?

Runtime/recipe207000205, classic FFVII Barret, series207000204, rarity5,maxLv80.
The ordinary maximum-level acquisition list has FOUR active abilities, not seven.
Series4-star207000204 and6-star207000206 are separately recorded. Their idle,
standby and atk CGS CSVs205/206 are byte-identical (classic-body-forms.json), but
this does not establish other commands' full native phase contracts.
Remake series207002105/207002127 and Avalanche series207003207/207003217 are
different characters, NOT extra skills for the current Barret. Equipment/quests,
account state, enhancements and conditional unlocks are not inferred by this list.

| Original command | Ordinary acquisition / variant | Original BMBs; matching projects | Body and event evidence | Full release blockers / decision |
| --- | --- | --- | --- | --- |
| Big Shot227870 | Classic4-star Lv1; available to current5-star |2/2 BMBs,1 exact project; explosion10nodes, Hardshot38nodes |Motion8/move4; native206 standby11->atk3->idle1, constant local position; source hitF130. Damage, MP and single-enemy gameplay already supported |Hardshot19Null/1Quad/10Model/8Particle complete controls, parent/matrix/emission/material semantics; constant nonflat Quad profile; explicit bounded Motion8 choreography admission and whole battle proof. Explosion/target anchor already checked. BEST documented Barret overall path, still not publishable |
| Mindblow227871 | Classic4-star Lv39; current5-star |5/5 BMBs,4 exact projects; missing aspir_enemy project covers12nodes of55 total |Motion8/move4 selector evidence, exact command phases unmeasured; hitF170; MP drain + SPR reduction |Missing12-node control semantics is not the only gate: movement anchor6 in88:2000311:1:6:40 unresolved; caster effect on enemy-target action requires mixed-anchor placement; four nonflat Quads; MP-drain/restore event semantics. Existing magic weakness can represent reviewed SPR debuff, but drain is not ordinary damage. NOT shorter than Big Shot |
| Grenade Bomb227872 | Classic4-star Lv60; current5-star |2/2 BMBs,1 exact project; explosion44nodes + break23nodes |Motion8/move4, hitF150, all-enemy damage + DEF reduction; gameplay supported |Two unknown type7 nodes, missing explosion controls, four nonflat break Quads, exact action/area-anchor contract. Multiple independent gates |
| Hammerblow227873 | Classic5-star Lv56; current5-star |1/1 BMB,0 projects;22nodes |Motion5/move6 unresolved; hitF10; instant KO OR damage, not generic physical damage |Unknown type4, missing full controls, one genuinely varying nonflat color Quad, body/movement/anchor review. Existing instant/fallback event engine can be reused AFTER these gates; no standard attack fallback |
| Speed Drink227876 | Classic6-star Lv35; NOT current5-star |3/3 BMBs,2 projects |Motion2/move4; enables double-limit temporarily |Missing front-effect controls, double-limit command-selection/duration profile; do not call it a generic speed buff or current-form skill |
| Satellite Beam227874 | Classic6-star Lv73; NOT current5-star |3/3 BMBs,1 project |Motion8/move4; ten source hitsF125..215; area multihit engine exists |Missing beam/fade controls, unknown type4 and complete body/placement profile. Archived old converted presentation is NOT Source approval |
| Ungarmax227875 | Classic6-star Lv100; NOT current5-star |3/3 BMBs,1 project |Motion8/move4; eighteen source hitsF90..175; partial unmitigated damage |Missing hammer/fade controls, body/placement/profile validation and reviewed event definition; no guaranteed release |
| Catastrophe207000205 | Current5-star Limit Burst;4/6-star LB IDs differ |3/3 indexed BMBs,1 named project in census |Original all-enemy partial unmitigated LB;20 hit markersF230..350 |No productive LB cost/gauge/command/choreography profile; master/group/resource linkage needs independent validation. Census resolves a Cloud-named member; filename neither proves wrong ownership nor authorizes substituting a Cloud animation |

All19 staged BMB originals across the seven ordinary series abilities and their
PNG/M3R resource payloads were hash-checked via existing staging verification.
This is source presence, NOT full support. Missing BMSLN means missing semantic
authoring evidence, not missing raw BMB. Bounded alternative-author search rejected
all five attempted pairs by node-count mismatch; no similar-name substitution.

### Store: bounded alternative, with a corrected diagnosis

Exact binary/project comparison confirms nodes4/6/9 are Constant, flat=false,
but ALL four corners are white RGBA with ZERO range. There is no authored visible
gradient to reconstruct in this effect. Current flat-only admission still rejects
them; do not secretly flip the original flag or activate the old distortion RGBA
path (its alpha behavior differs). A bounded neutral-uniform source profile would
be sufficient for these values, once independently admitted.

The actual remaining visual work is Billboard models11/12/13, inherited X tilt25
degrees and nonuniform parent scale[75,1,1], plus source priorities. Models12/13
have priority0.2 vs model11's0.5; prioritySort=true, wholeZSort=false. Existing
native-priority sorting is reusable but currently integrated only in packet
branches, not this ordinary model path. Store's body/self-placement is measured;
the charge/risk gameplay draft remains archived, NOT installed.

Next smallest useful ORIGINAL measurement: model-Billboard output positions/RGBA
and view basis with the actual tilted/nonuniform parent, alongside identity and
uniform-scale controls. Ordinary video cannot establish the matrix rule. Only
after that proof, integrate facing + existing priority order + bounded neutral
color admission and the archived charge events, then run the full battle gate.
Store is not yet a certified short import and no further skill is promised.

### Automatic checks added

formLearning separately reports current-form/later-form/conditional/unknown at
the form's maximum native level. Unknown NV/unlock metadata fails closed. The
opt-in planner --current-form checks published body vs recipe identity, excludes
later forms and rejects explicit wrong-form/wrong-series requests. Existing
reviewed cross-rarity FFRogue skills are preserved, not retroactively disabled.
Unresolved effect anchors are now independent intake blockers; Mindblow's mode6
cannot masquerade as a control-only problem. No unknown anchor becomes a target
or caster fallback. A census shortlist cannot claim current-form eligibility.

Evidence root tools/data/barret-path-20261101/: barret-resources.json,
effect-path-audit.json,bounded-authoring-search.json,classic-body-forms.json,
store-decision.json,form-selection/selection.json,coverage/{inventory.json,coverage.md}.
11 targeted Node tests passed; previous82 Node/15 Python/build and frozen visual
receipts are reused only because all productive files remain unchanged. No new
battle/native recording or new visual fidelity claim in this block.

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

Current generated inventory:7 registered characters,87 active series acquisition
entries,15 published,0 certified fully importable unpublished. Acquisition entries
are not per-form loadouts. Full table/source identity remains in
full-import-path-20261101/coverage/{coverage.md,inventory.json}.
Cloud5; Aerith1; Barret0; Cloud of Darkness2; Cloud AC1; Delita4; Jack2.
Main party remains Cloud/Aerith/Barret; other four are preserved reserve choices.

No additional Aerith/Barret command was falsely released. Reraise still requires
MAGIC/negative-time/body, explicit single-ally selection and auto-revive plus
remaining profile checks. Healing Wind/Prayer/Overflowing Life/Earthly Healing
still include unknown node7; other candidates include node4/missing controls.
Mindblow227871 is BARRET, not Aerith. Big Shot now has measured body evidence,
but its Hardshot branch remains incomplete despite the checked explosion.
Store remains unpublished due to nonflat Quad/Billboard/render-order gates.
Iai Strike adds tactical all-enemy instant/fallback behavior on an EXISTING
reserve character. Common functions do not guarantee another immediate release.

---

Earlier revision notes (historical; current resume above takes precedence):

## Current: grouped control coverage and import decisions (2026-11-01)

Still14 published commands; no new body, skill or visual release. All14 command
objects and published plans match98091bb. Sword colors and Delita placement are
preserved; their latest personal visual recheck remains separate.

The common intake now decodes4 additional fields (Quad colorRate, Particle
rotation, Model translation/scale). Strict27-pair comparison confirms1823 values;
the separate48-pair structural/intake comparison confirms812. No full
48-project validation or authoring-free preparation is claimed.

Existing staging was rerun for13 Aerith/Barret abilities plus Reraise. All14
receive new input coverage, ZERO complete skills are freed. Big Shot receives
9 rotation,13 Model translation,13 Model scale and1 Quad color-rate values;
remaining selectors across other node types and compatibility/emission/tint
are still unknown. Missing authoring is not a missing resource: the raw Hardshot
BMB is present, but its complete interpretation and Motion8 body are not proven.
Mindblow227871 is Barret's command, not Aerith's.

Reraise10230 has prepared original resources but not a release contract:
MAGIC negative-time/body, single-ally targeting and auto-revive remain. Healing
Wind/Prayer/Overflowing Life/Earthly Healing additionally use unknown node7;
Esunaga/Ancient Holy/Miracle of Life have further independent mechanics.
No generalized parent/matrix decoder or node7 implementation is inferred here.

Existing-character fallback Store200210 has native self-placement proof and a
complete prepared source plan; source coverage finds3 active non-flat Quads and
3 Billboard models. It is UNPUBLISHED. Its proposed charge/risk gameplay was
saved as a passing isolated draft and removed from productive code, not silently
replaced with an all-skill buff. No new tactical feature is active.

Fresh inventory:7 registered characters,87 active series entries,14published,
70known-blocker,3intake-only,0 certified fully importable unpublished commands.
Use --control-audit tools/data/control-groups-20261101/control-comparison.json.
Raw tables below are refreshed from coverage/inventory.json in that directory;
historical notes below this section retain their recorded dates only.

Next practical gates: scoped Big Shot body reservation/clip transitions plus
complete Hardshot controls, or a separately bounded MAGIC/friendly-revive
contract for the preserved Reraise plan. Non-flat Quad RGB benefits Store and
other candidates but is not a guaranteed standalone skill unlock. No new import
wave should bypass choreography, placement, source-color or runtime battle gates.

## Current color correction / acceptance feedback (2026-11-01)

Still14 technical Source commands; no new skill. Daniel reviewed Helm Break and
the new Delita positioning/animation positively. Sword's corrected original
yellow-orange RGB awaits a color recheck; earlier spatial-pending notes below are
historical. All14 command objects are preserved exactly.

The shared Constant/flat Quad RGB profile is now productive for Sword. Exact
source colors/ranges and independent alpha are retained, with host-policy color
seeds separated from native arithmetic and existing transform streams. The common
intake emits colorPreparation feature hints without granting publication.
Thirteen already staged main-party candidates were checked: Ancient Holy229762,
Miracle of Life229763 and Mindblow227871 have colored flatRGB inputs. This does
not resolve their remaining controls, other node profiles or body/skill contracts.
Big Shot has no newly required flatRGB input and remains Hardshot/Motion8 blocked.
Reraise's prepared effect remains unpublished. No new fully importable skill is
certified. See current handoff and original-appearance-review.md for source/test
evidence. Game3001/current receipt sink3155; frozen Cloud pixels unchanged.


## Current: Big Shot deferred; Helm Break playable (2026-11-01)

14 technically playable Source skills;11 personally accepted. New Delita Helm
Break202190 is pending personal visual review. Chant/Sword spatial acceptance
also remains pending. Exact source, reviewed choreography, target-unit screen
placement, damage/status80,MP12 and actual BattleScene lifecycle pass. Original
SPR parameters remain separate from reviewed magic-weakness balance. All previous
13 command objects and Source manifests are unchanged; no new character/body.

Big Shot227870 was measured in native Trace: target-unit rect and both factories
are proven, but Motion8 exact body clip remains unresolved. Hardshot38-node
controls/compatibility/tint/emission remain incomplete. It is NOT published.
Particle3 translation selector504 adds58 checked values across the27-pair corpus
(1503 total), not a complete authoring-free profile. Reraise effect-only plan is
preserved; MAGIC/body/targeting/auto-revive remain open. No large Reraise branch.

Current generated inventory uses --control-audit tools/data/big-shot-20261101/
control-comparison.json:7 registered characters/87 active series entries,
14published/70known-blocker/3intake-only. Zero unpublished commands are certified
fully importable. Historical receipts remain evidence; parser hashes must match.
Evidence and next bounded diagnostic are in the current handoff and
native-hit-profiles.md. Playable review on3001/?reserve=delita, page2 for Helm.

## Current intake refinement (2026-11-01)

Still13 published/11 personally accepted; Delita placement review is pending.
This table now uses the hash-checked extended-comparison.json under
tools/data/main-party-import-20261101/ with --control-audit. Nine obsolete parser
diagnostics are retired for eight main-party commands, not eight full unlocks.
All older errors remain in supersededAuthoringBlockers in coverage/inventory.json.
Without this optional current evidence, the inventory is historical/conservative.

Reraise's new I status means intake/effect preparation only: negative-55 MAGIC
timing/body, single-ally selection, auto-revive gameplay and render findings remain.
No new skill is published. Current counts:70 intake-blocked,4 intake-only,zero
certified fully importable unpublished commands. See import-decision.json and
the current handoff. Big Shot's exact hardshot controls then Motion8/body proof
are the next priority. Browser QA uses game3001/sink3154 with source freshness.

## Placement review update (2026-11-01)

Thirteen technical publications; eleven personally accepted. Chant and Cunning
Hero's Sword have good optical feedback but await renewed personal spatial
acceptance. Native rect/setter measurements now support screen-down source-axis
placement for Chant and target-unit anchoring for Sword. Sword's distinct member
random streams are an explicit reviewed FFRogue replay policy, not recovered
native seeds. See native-effect-placement.md and the reconstruction map.

A fresh read-only inventory is saved in tools/data/delita-placement-20261101/coverage/.
That earlier intake snapshot had28 unpublished entries:25 listed missing
authoring,15 node7,10 curve diagnostics (overlap, not guaranteed unlocks). The
current checked comparison above supersedes nine diagnostics for eight commands.
No new fully importable unpublished command or new playable skill was certified.
Future new imports additionally require an explicit coordinate-review contract.
Original source identities/acquisition requirements and all previous body/command
data are preserved. Positions and new samples use shared functions, no skill-ID
renderer branch. Daniel should review both skills again at http://127.0.0.1:3001/?reserve=delita.

Generated read-only with `node tools/inventory_roster_skills.mjs`. Counts describe the current registered roster, not all FFBE.

- Series acquisition list, not original per-form eligibility. Rarity/level/NV/unlock metadata is retained.
- Equipment, quests, enhancement chains and dispatch eligibility require separate joins; this is not a complete original account loadout.
- Intake success only certifies resource preparation; placement, choreography, gameplay, publication and actual battle tests remain independent gates.
- Global historical blockers and old-form intake receipts are evidence, not guaranteed current-body failure; exact composition is mandatory before publication.
- No unpublished entry is certified fully importable by this inventory alone. Limit Bursts have no productive command profile.

Registered characters: 7. Active series entries: 87. Published Source skills: 14.

Local columns count archive-indexed originals / referenced originals, then exact matched authoring files. These counts are not runtime certification.
P = published; B = concrete known blocker; I = intake prepared only; U = not assessed. Original source rows and acquisition requirements are in the ignored inventory JSON.

## cloud

Runtime form 207000105; series 207000105; default-party.

| Original active command | Kind / ID | Local originals; authoring | Status | Evidence / next gate |
| --- | --- | --- | --- | --- |
| Brave Slash | ABILITY 214800 | 1/1; 1 | P | cloud_brave_slash |
| Cross Slash | ABILITY 214790 | 2/2; 2 | P | cross_slash_import_test |
| Blade Beam | ABILITY 214810 | 2/2; 2 | P | cloud_blade_beam |
| Limit Braver | ABILITY 800530 | 0/0; 0 | B | command-without-effect-timeline:dispatch-not-reconstructed; staging:No original visual members resolved |
| Climhazzard | ABILITY 214820 | 4/4; 3 | P | cloud_climhazzard |
| Meteor Rain | ABILITY 214830 | 1/1; 0 | B | bm_2017_comet.bmb:missing-matched-authoring; bm_2017_comet.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Finishing Touch | ABILITY 214840 | 2/2; 1 | B | atk_aero1_black_blue.bmb:missing-matched-authoring; atk_aero1_black_blue.bmb:unsupported-node-type:7; atk_aero1_black_blue.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; atk_vortex_blue.bmb:authoring-comparison:BMB/BMSLN material control differs: alphaTest |
| Trigger Smash | ABILITY 227151 | 1/1; 1 | P | cloud_trigger_smash |
| Sonic Impact | ABILITY 236480 | 4/4; 1 | B | atk_cut3_side_orange.bmb:authoring-comparison:Unverified active source curve channel: Rotate_Value_Curve; atk_slash3_orange.bmb:missing-matched-authoring; atk_slash3_orange.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_fadeblack_a75_f180.bmb:missing-matched-authoring; eff_fadeblack_a75_f180.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_slash_trace_orange.bmb:missing-matched-authoring; eff_slash_trace_orange.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Limit Raid | ABILITY 236486 | 0/0; 0 | B | command-without-effect-timeline:dispatch-not-reconstructed |
| Buster End | ABILITY 236488 | 5/5; 3 | B | atk_slash9_f060_red.bmb:missing-matched-authoring; atk_slash9_f060_red.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_wave_charge_red.bmb:ambiguous-source-resource-versions; eff_wave_charge_red.bmb:missing-matched-authoring; eff_wave_charge_red.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_wave_charge_red.bmb:unsupported-node-type:15; eff_wave_charge_red.bmb:unsupported-node-type:4 |
| Blade Guard | ABILITY 236493 | 0/0; 0 | B | command-without-effect-timeline:dispatch-not-reconstructed |
| Rapid Break | ABILITY 236494 | 0/0; 0 | B | command-without-effect-timeline:dispatch-not-reconstructed |

Current-form Limit Burst: Omnislash (207000105); 5/5 indexed originals; blocked by missing Limit Burst command profile.
Other series Limit Burst variants: Omnislash (207000106), Omnislash (207000107).

## aerith

Runtime form 207000405; series 207000405; default-party.

| Original active command | Kind / ID | Local originals; authoring | Status | Evidence / next gate |
| --- | --- | --- | --- | --- |
| Banish | MAGIC 10060 | 2/2; 0 | B | wm_1006_banish_back.bmb:missing-matched-authoring; wm_1006_banish_back.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; wm_1006_banish_front.bmb:missing-matched-authoring; wm_1006_banish_front.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Healing Wind | ABILITY 229750 | 1/1; 0 | B | eff_fullcure_white.bmb:missing-matched-authoring; eff_fullcure_white.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_fullcure_white.bmb:unsupported-node-type:7 |
| Esunaga | MAGIC 10190 | 1/1; 0 | B | wm_1019_esunaga.bmb:missing-matched-authoring; wm_1019_esunaga.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; wm_1019_esunaga.bmb:unsupported-node-type:4; wm_1019_esunaga.bmb:unsupported-node-type:7 |
| Seal Evil | ABILITY 229751 | 2/2; 2 | P | aerith_seal_evil |
| Banishga | MAGIC 10170 | 4/4; 0 | B | non-file-group:dispatch-not-reconstructed |
| Dispelga | MAGIC 10200 | 2/2; 1 | B | wm_1020_dispel2_front.bmb:missing-matched-authoring; wm_1020_dispel2_front.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; wm_1020_dispel2_front.bmb:unsupported-mesh:Unverified BR3M vertex/index layout; wm_1020_dispel2_front.bmb:unsupported-node-type:7 |
| Breath of the Earth | ABILITY 229752 | 4/4; 3 | B | eff_fadeblack_a75_f120.bmb:missing-matched-authoring; eff_fadeblack_a75_f120.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Full-Life | MAGIC 10180 | 2/2; 0 | B | wm_1018_araise_back.bmb:missing-matched-authoring; wm_1018_araise_back.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; wm_1018_araise_front.bmb:missing-matched-authoring; wm_1018_araise_front.bmb:unsupported-node-type:7; wm_1018_araise_front.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Fury Brand | ABILITY 229753 | 3/3; 1 | B | eff_fadeblack_a50_f90.bmb:missing-matched-authoring; eff_fadeblack_a50_f90.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; sp_20127_raizin2.bmb:missing-matched-authoring; sp_20127_raizin2.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Curaja | MAGIC 10290 | 2/2; 1 | B | wm_1029_cure5_front.bmb:missing-matched-authoring; wm_1029_cure5_front.bmb:unsupported-node-type:4; wm_1029_cure5_front.bmb:unsupported-node-type:7; wm_1029_cure5_front.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Planet Protector | ABILITY 229754 | 3/3; 0 | B | atk_barrier_yellow.bmb:missing-matched-authoring; atk_barrier_yellow.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; atk_barrier_yellow.bmb:unsupported-node-type:7; eff_fadeblack_a50_f90.bmb:missing-matched-authoring; eff_fadeblack_a50_f90.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_twincle_whole_002_yellow.bmb:missing-matched-authoring; eff_twincle_whole_002_yellow.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Holy | MAGIC 10210 | 2/2; 1 | B | wm_1021_holy_front.bmb:missing-matched-authoring; wm_1021_holy_front.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Pulse of Life | ABILITY 229755 | 4/4; 2 | B | eff_fadeblack_a50_f90.bmb:missing-matched-authoring; eff_fadeblack_a50_f90.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_raise_white.bmb:missing-matched-authoring; eff_raise_white.bmb:unsupported-node-type:7; eff_raise_white.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_regen_front_white.bmb:authoring-comparison:Unverified active source curve channel: Scale_Value_Curve |
| Reraise | MAGIC 10230 | 1/1; 1 | I | No full battle/choreography approval; inspect exact current-form composition |
| White Materia | ABILITY 229756 | 3/3; 2 | B | eff_lighteff01_white.bmb:ambiguous-source-resource-versions; eff_lighteff01_white.bmb:authoring-comparison:Unverified active source curve channel: Texture2_Scale_Value_Curve; wm_1029_cure5_front.bmb:missing-matched-authoring; wm_1029_cure5_front.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; wm_1029_cure5_front.bmb:unsupported-node-type:4; wm_1029_cure5_front.bmb:unsupported-node-type:7 |
| Stop Detach | ABILITY 213920 | 3/3; 2 | B | wm_1011_esuna_front.bmb:missing-matched-authoring; wm_1011_esuna_front.bmb:unsupported-node-type:7; wm_1011_esuna_front.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Prayer of the Cetra | ABILITY 229757 | 2/2; 1 | B | wm_1016_cure4_front.bmb:missing-matched-authoring; wm_1016_cure4_front.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; wm_1016_cure4_front.bmb:unsupported-node-type:7 |
| Overflowing Life | ABILITY 229758 | 3/3; 2 | B | eff_esuna_front_white.bmb:missing-matched-authoring; eff_esuna_front_white.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_esuna_front_white.bmb:unsupported-node-type:7 |
| Lifestream | ABILITY 229759 | 2/2; 2 | B | command:unresolved-process-indexed-effects; process-indexed-effect-lanes |
| Miracle of Life | ABILITY 229763 | 3/3; 1 | B | eff_fadeblack_a25_f240_green.bmb:missing-matched-authoring; eff_fadeblack_a25_f240_green.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; wm_1027_gadia.bmb:missing-matched-authoring; wm_1027_gadia.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; wm_1027_gadia.bmb:unsupported-node-type:4; wm_1027_gadia.bmb:unsupported-node-type:7; eff_fadeblack_a25_f240_green.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Ancient Holy | ABILITY 229762 | 3/3; 0 | B | atk_beam_001_bluegreen.bmb:missing-matched-authoring; atk_beam_001_bluegreen.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; atk_fire4_green.bmb:missing-matched-authoring; atk_fire4_green.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; atk_fire4_green.bmb:unsupported-node-type:4; atk_fire4_green.bmb:unsupported-node-type:7; eff_fadeblack_a75_f240.bmb:missing-matched-authoring; eff_fadeblack_a75_f240.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_fadeblack_a75_f240.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Earthly Healing | ABILITY 229761 | 2/2; 0 | B | eff_fadeblack_a75_f180.bmb:missing-matched-authoring; eff_fadeblack_a75_f180.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_fullcure_green.bmb:missing-matched-authoring; eff_fullcure_green.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_fullcure_green.bmb:unsupported-node-type:7; eff_fadeblack_a75_f180.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |

Current-form Limit Burst: Great Gospel (207000405); 4/4 indexed originals; blocked by missing Limit Burst command profile.
Other series Limit Burst variants: Great Gospel (207000406), Great Gospel (207000407).

## barret

Runtime form 207000205; series 207000204; default-party.

| Original active command | Kind / ID | Local originals; authoring | Status | Evidence / next gate |
| --- | --- | --- | --- | --- |
| Big Shot | ABILITY 227870 | 2/2; 1 | B | sp_20108_hardshot.bmb:missing-matched-authoring; sp_20108_hardshot.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Mindblow | ABILITY 227871 | 5/5; 4 | B | bm_2019_aspir_enemy.bmb:missing-matched-authoring; bm_2019_aspir_enemy.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Grenade Bomb | ABILITY 227872 | 2/2; 1 | B | eff_convergence_explosion_orange.bmb:missing-matched-authoring; eff_convergence_explosion_orange.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_convergence_explosion_orange.bmb:unsupported-node-type:7 |
| Hammerblow | ABILITY 227873 | 1/1; 0 | B | eff_godspeed_purple.bmb:missing-matched-authoring; eff_godspeed_purple.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_godspeed_purple.bmb:unsupported-node-type:4 |
| Speed Drink | ABILITY 227876 | 3/3; 2 | B | eff_3030_brave_blue_front.bmb:missing-matched-authoring; eff_3030_brave_blue_front.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Satellite Beam | ABILITY 227874 | 3/3; 1 | B | eff_fadeblack_a50_f120.bmb:missing-matched-authoring; eff_fadeblack_a50_f120.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_large_beam_blue.bmb:missing-matched-authoring; eff_large_beam_blue.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_large_beam_blue.bmb:unsupported-node-type:4 |
| Ungarmax | ABILITY 227875 | 3/3; 1 | B | atk_hammer001_f60_orange.bmb:missing-matched-authoring; atk_hammer001_f60_orange.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_fadeblack_a50_f120.bmb:missing-matched-authoring; eff_fadeblack_a50_f120.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |

Current-form Limit Burst: Catastrophe (207000205); 3/3 indexed originals; blocked by missing Limit Burst command profile.
Other series Limit Burst variants: Catastrophe (207000204), Catastrophe (207000206).

## cloud_of_darkness

Runtime form 203000803; series 203000803; optional-third-slot-reserve.

| Original active command | Kind / ID | Local originals; authoring | Status | Evidence / next gate |
| --- | --- | --- | --- | --- |
| Blind | MAGIC 30020 | 1/1; 0 | B | gm_3002_blind.bmb:missing-matched-authoring; gm_3002_blind.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; gm_3002_blind.bmb:unsupported-node-type:7 |
| Protect | MAGIC 30090 | 2/2; 1 | B | gm_3008_protes_front.bmb:missing-matched-authoring; gm_3008_protes_front.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; gm_3008_protes_front.bmb:unsupported-node-type:7 |
| Thundara | MAGIC 20100 | 2/2; 0 | B | bm_2003_thunder1.bmb:missing-matched-authoring; bm_2003_thunder1.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; bm_2003_thunder1.bmb:unsupported-node-type:15; bm_2003_thunder1.bmb:unsupported-node-type:7; bm_2010_thunder2.bmb:missing-matched-authoring; bm_2010_thunder2.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; bm_2010_thunder2.bmb:unsupported-node-type:15; bm_2010_thunder2.bmb:unsupported-node-type:7 |
| Armor Break | ABILITY 201150 | 1/1; 1 | P | cod_armor_break |
| Protectga | MAGIC 30320 | 3/3; 1 | B | gm_3038_protega_back_02.bmb:missing-matched-authoring; gm_3038_protega_back_02.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; gm_3038_protega_front.bmb:missing-matched-authoring; gm_3038_protega_front.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; gm_3038_protega_front.bmb:unsupported-node-type:7 |
| Thundaga | MAGIC 20220 | 2/2; 0 | B | bm_2003_thunder1.bmb:missing-matched-authoring; bm_2003_thunder1.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; bm_2003_thunder1.bmb:unsupported-node-type:15; bm_2003_thunder1.bmb:unsupported-node-type:7; bm_2022_thunder3.bmb:missing-matched-authoring; bm_2022_thunder3.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; non-file-group:dispatch-not-reconstructed |
| Barrage | ABILITY 200310 | 0/0; 0 | B | command-without-effect-timeline:dispatch-not-reconstructed; staging:No original visual members resolved |
| Aura Ball | ABILITY 203280 | 1/1; 1 | P | cod_aura_ball |
| Omni-Veil | ABILITY 203290 | 3/3; 1 | B | gm_3038_protega_back_02.bmb:missing-matched-authoring; gm_3038_protega_back_02.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; gm_3038_protega_front.bmb:missing-matched-authoring; gm_3038_protega_front.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; gm_3038_protega_front.bmb:unsupported-node-type:7 |
| Return | ABILITY 203300 | 2/2; 0 | B | battle_generic_smoke1_purple.bmb:missing-matched-authoring; battle_generic_smoke1_purple.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_twincle_whole_002_purple.bmb:missing-matched-authoring; eff_twincle_whole_002_purple.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Call of the Void | ABILITY 203270 | 2/2; 0 | B | atk_aero2_black_purple.bmb:missing-matched-authoring; atk_aero2_black_purple.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; atk_aero2_black_purple.bmb:unsupported-node-type:7; eff_fadeblack_a25_f90.bmb:missing-matched-authoring; eff_fadeblack_a25_f90.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |

Current-form Limit Burst: Wave Cannon (203000803); 1/1 indexed originals; blocked by missing Limit Burst command profile.
Other series Limit Burst variants: Particle Beam (203000804), Perfect Void (203000805), Perfect Void (203000806).

## cloud_ac

Runtime form 207001605; series 207001605; optional-third-slot-reserve.

| Original active command | Kind / ID | Local originals; authoring | Status | Evidence / next gate |
| --- | --- | --- | --- | --- |
| Braver (FFVII: AC) | ABILITY 233930 | 2/2; 2 | P | cloud_ac_braver |
| Blade Beam (FFVII: AC) | ABILITY 233931 | 5/5; 4 | B | process-indexed-effect-lanes; command:unresolved-process-indexed-effects; atk_aerialslash_001_green.bmb:unsupported-emission-shape-nodes:10; eff_3030_brave_yellow_front.bmb:missing-matched-authoring; eff_3030_brave_yellow_front.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Gaia Break | ABILITY 233932 | 6/6; 1 | B | staging:Non-finite IBMB scalar keyframe |
| Helios Break | ABILITY 233933 | 6/6; 1 | B | staging:Non-finite IBMB scalar keyframe |
| Climhazzard (FFVII: AC) | ABILITY 233934 | 5/5; 4 | B | process-indexed-effect-lanes |
| Finishing Touch (FFVII: AC) | ABILITY 233935 | 2/2; 1 | B | atk_slash3_blue.bmb:missing-matched-authoring; atk_slash3_blue.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; atk_vortex_blue.bmb:authoring-comparison:BMB/BMSLN material control differs: alphaTest |
| Spin Drive | ABILITY 233936 | 3/3; 1 | B | atk_aero2_white.bmb:missing-matched-authoring; atk_aero2_white.bmb:unsupported-node-type:7; atk_aero2_white.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_fadeblack_a50_f180.bmb:missing-matched-authoring; eff_fadeblack_a50_f180.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Fenrir: Full Throttle | ABILITY 233938 | 0/0; 0 | B | command-without-effect-timeline:dispatch-not-reconstructed |
| -1st- Fusion Sword | ABILITY 233940 | 3/3; 1 | B | atk_aero2_blue.bmb:missing-matched-authoring; atk_aero2_blue.bmb:unsupported-node-type:7; atk_aero2_blue.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_fadeblack_a50_f180.bmb:missing-matched-authoring; eff_fadeblack_a50_f180.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| -2nd- Fusion Sword | ABILITY 233941 | 3/3; 1 | B | atk_slash3_blue.bmb:missing-matched-authoring; atk_slash3_blue.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; atk_vortex_green.bmb:authoring-comparison:BMB/BMSLN material control differs: alphaTest; eff_fadeblack_a50_f180.bmb:missing-matched-authoring; eff_fadeblack_a50_f180.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Cherry Blossom (FFVII: AC) | ABILITY 233939 | 0/0; 0 | B | command-without-effect-timeline:dispatch-not-reconstructed |
| -3rd- Fusion Sword | ABILITY 233942 | 3/3; 1 | B | atk_aero2_yellow.bmb:missing-matched-authoring; atk_aero2_yellow.bmb:unsupported-node-type:7; atk_aero2_yellow.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_fadeblack_a50_f180.bmb:missing-matched-authoring; eff_fadeblack_a50_f180.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| -4th- Fusion Sword | ABILITY 233943 | 3/3; 1 | B | atk_vortex_orange.bmb:authoring-comparison:BMB/BMSLN material control differs: alphaTest; eff_fadeblack_a50_f180.bmb:missing-matched-authoring; eff_fadeblack_a50_f180.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_slide_slash_v03_red.bmb:missing-matched-authoring; eff_slide_slash_v03_red.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |

Current-form Limit Burst: Omnislash Version 5 (207001605); 3/3 indexed originals; blocked by missing Limit Burst command profile.
Other series Limit Burst variants: Omnislash Version 5 (207001606), Omnislash Version 5 (207001607).

## delita

Runtime form 253000205; series 253000205; optional-third-slot-reserve.

| Original active command | Kind / ID | Local originals; authoring | Status | Evidence / next gate |
| --- | --- | --- | --- | --- |
| Fill LB | ABILITY 150300 | 0/0; 0 | B | command-without-effect-timeline:dispatch-not-reconstructed |
| Chant | ABILITY 210550 | 2/2; 2 | P | delita_chant |
| Cunning Hero's Sword | ABILITY 1323010 | 1/1; 1 | P | delita_cunning_hero_sword |
| Hero's Encouragement | ABILITY 1323060 | 2/2; 1 | B | eff_strength_up_back_orange.bmb:authoring-comparison:Unverified active source curve channel: Scale_Speed_Curve; eff_strength_up_back_orange.bmb:ambiguous-source-resource-versions; eff_strength_up_front_orange.bmb:missing-matched-authoring; eff_strength_up_front_orange.bmb:unsupported-node-type:4; eff_strength_up_front_orange.bmb:ambiguous-source-resource-versions; eff_strength_up_front_orange.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| I'll build Ovelia's kingdom. | ABILITY 1323090 | 0/0; 0 | B | command-without-effect-timeline:dispatch-not-reconstructed |
| Store | ABILITY 200210 | 1/1; 1 | I | No full battle/choreography approval; inspect exact current-form composition |
| Helm Break | ABILITY 202190 | 1/1; 1 | P | delita_helm_break |
| Medicate | ABILITY 202210 | 2/2; 1 | B | wm_1011_esuna_front.bmb:missing-matched-authoring; wm_1011_esuna_front.bmb:unsupported-node-type:7; wm_1011_esuna_front.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Barrage | ABILITY 200310 | 0/0; 0 | B | command-without-effect-timeline:dispatch-not-reconstructed; staging:No original visual members resolved |
| Thundaga Blade | ABILITY 200720 | 3/3; 0 | B | atk_thunder1_yellow.bmb:missing-matched-authoring; atk_thunder1_yellow.bmb:unsupported-node-type:7; atk_thunder1_yellow.bmb:unsupported-node-type:15; atk_thunder1_yellow.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_fadeblack_a50_f180.bmb:missing-matched-authoring; eff_fadeblack_a50_f180.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_slide_slash_v03_white.bmb:missing-matched-authoring; eff_slide_slash_v03_white.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Warring Slash | ABILITY 800606 | 1/1; 0 | B | atk_slash9_f010_orange.bmb:missing-matched-authoring; atk_slash9_f010_orange.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Shield Break | ABILITY 202180 | 1/1; 1 | P | delita_shield_break |
| Northswain's Strike | ABILITY 202250 | 2/2; 0 | B | wm_1006_banish_back.bmb:missing-matched-authoring; wm_1006_banish_back.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; wm_1006_banish_front.bmb:missing-matched-authoring; wm_1006_banish_front.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Meditate | ABILITY 202260 | 2/2; 1 | B | gm_3019_shell_front.bmb:missing-matched-authoring; gm_3019_shell_front.bmb:unsupported-node-type:7; gm_3019_shell_front.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Northern Sky Apprentice | ABILITY 226693 | 3/3; 0 | B | eff_fadeblack_a50_f90.bmb:missing-matched-authoring; eff_fadeblack_a50_f90.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_slide_slash_v03_white.bmb:missing-matched-authoring; eff_slide_slash_v03_white.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; wm_1006_banish_front.bmb:missing-matched-authoring; wm_1006_banish_front.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Karma Blade | ABILITY 226701 | 8/8; 4 | B | eff_3029_weak_purple_front.bmb:missing-matched-authoring; eff_3029_weak_purple_front.bmb:unsupported-node-type:9; eff_3029_weak_purple_front.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_3029_weak_yellow_front.bmb:missing-matched-authoring; eff_3029_weak_yellow_front.bmb:unsupported-node-type:9; eff_3029_weak_yellow_front.bmb:unresolved-binary-controls:alphaMode,alphaRate,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_fadeblack_a50_f90.bmb:missing-matched-authoring; eff_fadeblack_a50_f90.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors; eff_lighteff01_purple.bmb:authoring-comparison:Unverified active source curve channel: Texture2_Scale_Value_Curve; eff_lighteff01_purple.bmb:ambiguous-source-resource-versions; eff_slash_trace_purple.bmb:missing-matched-authoring; eff_slash_trace_purple.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |

Current-form Limit Burst: Hallowed Bolt (253000205); 3/3 indexed originals; blocked by missing Limit Burst command profile.
Other series Limit Burst variants: Hallowed Bolt (253000206), Hallowed Bolt (253000207), Hallowed Bolt (253000227).

## jack

Runtime form 254000603; series 254000603; optional-third-slot-reserve.

| Original active command | Kind / ID | Local originals; authoring | Status | Evidence / next gate |
| --- | --- | --- | --- | --- |
| Iai Strike | ABILITY 200300 | 1/1; 1 | I | No full battle/choreography approval; inspect exact current-form composition |
| Bladeblitz | ABILITY 200440 | 0/0; 0 | B | command-without-effect-timeline:dispatch-not-reconstructed |
| Lightning Flash | ABILITY 203040 | 0/0; 0 | B | command-without-effect-timeline:dispatch-not-reconstructed |
| Cheer | ABILITY 200450 | 2/2; 1 | B | gm_3030_brave_front.bmb:missing-matched-authoring; gm_3030_brave_front.bmb:unresolved-binary-controls:alphaMode,colorRate,matrix,rotation,scale,translation,compatibility,emission,texture-tint/mapping,geometry-selectors |
| Piercing Gleam | ABILITY 203050 | 1/1; 1 | P | jack_piercing_gleam |

Current-form Limit Burst: Transience (254000603); 2/2 indexed originals; blocked by missing Limit Burst command profile.
Other series Limit Burst variants: Transience (254000604), Transience (254000605).
