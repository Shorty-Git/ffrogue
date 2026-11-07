# Character and skill import standard

## Original class-up admission

Use the master DB `unit_class_up` edge and matching `unit.unitSeries` for every
published `awakensFrom` edge. The runtime accepts only a connected chain with
matching prepared manifest IDs and the required combat and Source clips.
`tools/inspect_original_forms.py --output tools/data/original-awakening/verified-graph.json`
cross-checks the published graph against the local DB and inventories raw assets.
The reviewed body-only recipes retain the original atlas, CGG parts and CGS timing.

| Unit and canonical identity | Original class-up IDs in order |
| --- | --- |
| Classic Cloud, ff7:cloud-strife | 5★ 207000105 → 6★ 207000106 → 7★ 207000107 → NV 207000117 |
| Aerith, ff7:aerith-gainsborough | 5★ 207000405 → 6★ 207000406 → 7★ 207000407 |
| Barret, ff7:barret-wallace | 4★ 207000204 → 5★ 207000205 → 6★ 207000206 |
| Cloud of Darkness, ff3:cloud-of-darkness | 3★ 203000803 → 4★ 203000804 → 5★ 203000805 → 6★ 203000806 |
| Cloud AC, ff7:cloud-strife | 5★ 207001605 → 6★ 207001606 → 7★ 207001607 |
| Delita, fft:delita-heiral | 5★ 253000205 → 6★ 253000206 → 7★ 253000207 → NV 253000227 |
| Jack, type0:jack | 3★ 254000603 → 4★ 254000604 → 5★ 254000605 |

Barret's current body remains 207000205. His series is inventoried and excluded
from the run catalog because it lacks an admitted Source skill. All listed
ordinary and NV base bodies have local atlases and tracks. Cloud 207000127 and
Delita 253000237 are separately linked Brave Shift bodies with local assets.
Their battle switch and form-specific skills remain unverified. The master
data has EX-dependent skill rows. EX progression, shared-body EX states and
NV+ need separate reviewed contracts before publication.

NV Cloud and NV Delita still have raw rarity 7. The NV flag is independent.
Their aura parts use original CGG records and atlas pixels. A controlled
ffbetool probe with source RGBA (32,140,200,128) produced (16,70,100,124)
for a standalone mode-1 part. The flattened texture applies alpha again
and cannot add to the actual stage behind the actor. A two-part overlap
probe established that the first record draws on top in this exporter.

The shared body import now calls
`tools/prepare_cgg_body_layers.py --raw <raw> --prepared <body> --output <staging>`
uses the same ffbetool and NumPy/Pillow to assemble neutral isolated
parts. The source-over pass keeps normal coverage. The light pass sums
mode-1 RGB weighted by source alpha and CGG opacity, attenuating emission
where subsequent normal parts cover it. It encodes the resulting RGB for
Phaser's premultiplied upload and an additive pass over the opaque stage.
Clip rectangles, frame order, source tick durations and pivots are checked
against the admitted export. Unsupported record layouts, atlas pages and
blend values fail the preparation. A clip whose parts exceed the existing
frame rectangle retains its baked sheet and records a `bodyLayerIssues`
entry. Fully transparent emission strips are omitted. Content-hashed
layer names make each revised export independently cacheable. The original
PNG files remain available for Canvas or CSS implementations without the
required compositing support.

WebGL battle, stopped reels, member details, result/party cards and both
Awakening forms use the same prepared strips. The DOM uses CSS
`plus-lighter` for the emission layer at the same size and crop as its
coverage layer. Fading groups, browser compositing and the background can
change apparent intensity. Spinning reels and reward thumbnails retain
their existing portrait icons. Body clips are still requested by encounter.

The additive CGG rule is a reviewed FFRogue representation of the observed
turquoise and violet/orange glow. Trace Home confirms the visible pattern,
with a different camera and idle phase. The source pixels, opacity, coverage
and order are retained. Exact native blend factors and intermediate GPU
clamping are unverified. See tools/data/aura-review/comparison.png for
the reference and matched dark/light before/after crops.

### Published roster aura audit

Run `tools/audit_character_auras.py --output tools/data/aura-roster/receipt.json`
with the same Python environment as the body layer preparer. The report
reads the production character and form registries and records original
atlas and CGG SHA-256 hashes, per-clip nonzero mode-1 coverage, source
timing checks and the published layer status.

The 22 bodies cover 282 clips, of which 169 reference visible mode-1
parts and 14 bodies use them in idle. In addition to the two reviewed NV
bodies, idle candidates are Cloud 6★/7★, Aerith 6★/7★, Barret 5★, Cloud
of Darkness 6★, Cloud AC 6★/7★, Delita 6★/7★ and Jack 4★/5★. The eight
remaining bodies have mode-1 parts in clips outside idle. A part with
light in its source texture is an audit candidate. It can be covered by
other parts, and attack flashes should be reviewed separately from idle.

The first offline audit completed for 21 bodies. Cloud 6★ has an isolated
part outside the admitted rectangle at `limit_atk/116`. The current
preparer records that clip as an explicit fallback and publishes the
other valid clips. In total 168 layered clips are admitted. Audit artifacts include
`tools/data/aura-roster/idle-comparison.png` and `action-comparison.png`.
The strongest non-NV idle differences include Cloud, Cloud AC, Jack and
Delita 7★. These are offline FFRogue comparisons, with no matching native
reference for those forms in that audit. The same mode-0/1 profile is now
used across the roster as a FFRogue rendering rule. Separate native blend
state validation would be needed to claim exact original parity.

New runs follow one class-up edge at each boss. Existing saved prototype
rules retain their original behavior. Form keys and original IDs remain
authoritative, and saved stats are retained as stored. Central rarity weights
3★/4★/5★/6★/7★/NV are 180/125/80/17/3/0.3, normalized over the admitted
forms after the unit is drawn. A dedicated seeded stream separates rarity
from roster and skill draws. New saves use the exact-path override
`5/6/7/NV` = 65/23/9/3. Every other supported path uses its own normalized
rank weights, and existing saves retain their snapshotted policy.
New balancing adds 5% HP, 3% MP and 3.5% attack,
magic and defense rating per original rank step relative to the base. Awakening
adds the difference and keeps earned bonuses. This is FFRogue tuning.

`bodyTextureFilter` in `public/assets/run-rules.json` controls run hero body
sheets. Linear sampling stays inside the edge texel centers of each frame
to prevent neighboring-frame bleed. Original PNGs, materials, Phaser alpha
processing, enemy sheets and Source VFX use their existing paths.

## Reviewed 7-star forms and configurable prototype progression (2026-11-02)

Original DB `unit` AND `unit_class_up` confirm same-unit chains:
Cloud207000105 (5-star) ->207000106 (6-star) ->207000107 (7-star),
Aerith207000405 ->207000406 ->207000407 with the same rarities. Aerith DOES have
this7-star form; do not infer its absence from subtle5/6-star visual differences.
The NV extension to Cloud207000117 is documented in the current admission section.
No Cloud AC/Remake or other Aerith unit is substituted. Original7-star atlas SHA256:
Cloud df7b07767609908473c51ec6f50d6cc77946580e3cdd322d29d2822b88484a1f;
Aerith ff562a5828c4178d3f3f2b6d440998d16f267b409b46d2fbb2994c6ff5fdc5d6.

Reproduce with configured Python/Pillow (explicit UTF-8):
`node tools/import_character.mjs --recipe tools/characters/cloud_form7.json --prepare-body-only --python <python>`
and the equivalent aerith_form7 recipe. Inspect staging body-preparation.json and
all sheets BEFORE copying into the distinct public/assets/forms/<key> namespace.
The staging manifest lacks its runtime assetKey: add that key, then record the
FINAL manifest SHA in run-content.json. Do not use the staging SHA as publication
identity. No sheet pixels/timings are edited; no limit skill is enabled by a sheet.
Cloud12 and Aerith13 original tracks were prepared; unreferenced large limit sheets
remain demand-unloaded. Regenerate prepared pose metadata using
`python tools/prepare_victory_poses.py --output public/assets/victory-poses.json`.
The9 pre-existing pose gates must remain equal; two new form gates are added.

`runCatalog` admits each same-identity form only with all required common and
published Source choreography clips. `forms` holds admitted original forms;
`evolution` remains the first normal step. Policy belongs to run-rules.json, NOT
to original form metadata: highest-reviewed is the short-run test policy;
sequential remains5->6->7. Old saves without policy remain sequential; saved
form IDs and pending notices validate against the complete admitted catalog.

All5 Cloud and1 Aerith actual Source actions were exercised with7-star bodies;
real two-battle boss paths independently verify both5->7 rewards and next-battle
textures. Fixtures separately verify skip, reload during/after and reduced motion
for7-star and retained6-star paths. Original first-idle5/7 aligned differences are
Cloud1,838 and Aerith444 visible pixels over black/white (5/6:1,411/325). These
counts do not imply a redesigned costume. Review same-position browser pairs and
original-form-appearance.png. Source/VFX plans and original aura remain unmodified.

## Awakening appearance and saved presentation (2026-11-02)

Original identities remain Cloud207000105->207000106 and Aerith207000405->207000406,
same-series5->6 stars. inspect_form_appearance.py compares actual prepared pixels
around their foot pivots and verifies original unitSeries/rarity from the DB.
Both idle forms differ visibly, but Aerith's pose/costume remains very similar;
the6-star differences are subtle details/aura, not a new costume. No cache error
was reproduced: actual post-boss Source casts and reload fixtures use
aerith_form6_idle/207000406 and cloud_form6_idle/207000106. Original art, sheets,
body timelines,15 Source skills and both form manifests are unchanged.

An evolve reward now saves the new form/HP gain and a validated optional
pendingAwakening notice in the SAME RunStore write. The short reusable UI uses
only the two prepared original idle sprites, aligned to their pivots; blue/gold
light and particles are FFRogue presentation. It never mutates combat RNG or
applies gameplay. Natural animation end/Skip acknowledges the notice once.
Reload/Continue resumes AFTER the saved upgrade without replaying/reapplying it.
Unknown/forged notice/form combinations fail validation. Identical future original
art can use the same presentation without claiming a changed costume. Read
roguelike-foundation.md for the lifecycle and current browser receipts.

Reproduce: python tools/inspect_form_appearance.py (configured Python/Pillow).

## Runtime body requirements (2026-11-02)

Prepared sheets/manifests remain intact. Title loads hero idles; BattleScene's
preload barrier admits current party/form and enemy clips before actors exist.
Shared idle/move/dying/dead/basic attack are required. Existing optional standby,
magic and victory states plus EVERY published actionChoreography.body phase are
admitted explicitly. Requirements use prepared assetKey, never canonical family.
Awakening loads its separate form namespace before the next battle. Missing sheets
block actor construction/commands; UnitActor registers loaded clips only and rejects
unadmitted playback. Unreferenced limit sheets are preserved, not eagerly loaded.
Future body phase kinds must enter this requirement path, not assume all manifest
clips are resident. The15 accepted skill definitions/plans/timings are unchanged.
Measured before/after commands and limits: roguelike-foundation.md/current handoff.

## Prepared victory presentation gates (2026-11-02)

tools/prepare_victory_poses.py reads only already prepared body sheets/manifests.
It compares exact RGBA poses aligned by their original integer pivot and derives
the trailing intro suffix already present in win. That suffix can continue behind
the reward cards. Where no exact suffix exists, the full intro finishes before
the first win pose releases rewards. No original frames/delays are rewritten.
The resulting public/assets/victory-poses.json binds9 unit/form entries to original
unit IDs, manifest/sheet hashes and frame counts. Runtime listens to real frame/
start events; missing/mismatched gates keep the older conservative full-cycle
behavior. This is an explicit FFRogue presentation policy, not measured native
victory timing. New/changed bodies require regenerated/reviewed gate evidence.
Body/VFX/gameplay choreography admission and15 published Source skills are unchanged.

## Canonical starter identity is separate from original unit identity (2026-11-02)

Maintain explicit canonicalCharacters / units[*].canonicalIdentity in the reviewed
run-content registry. Different FFBE versions of one figure share this key;
original unitId, unit-series identity and prepared star forms stay distinct.
No name/substring/role inference. Unknown grouping blocks starter admission until
reviewed. No party role quota. Future forms must preserve BOTH canonical figure
and original unit series; an awakening must not switch to another version.
No source data or15 published skill definitions changed in this UI milestone.

## Run eligibility and prepared visual forms (2026-11-02)

Starter reels admit published skills with valid Source/choreography/placement
contracts. Characters without a Source command are preserved but excluded from
draws (Barret). Runs select three original identities and one own supported skill
each. Classic Cloud and Cloud AC remain separate original series.

Cloud207000105->207000106 and Aerith207000405->207000406 are prepared run
awakenings. Use the existing body-only importer with the matching reviewed
tools/characters/{cloud,aerith}_form6.json recipe; validate all clips,
publish under public/assets/forms/{cloud,aerith}_form6, record reviewed identity/rarity/
assetPath and manifest hash in run-content.json. UnitActor.assetKey separates
visual animation names while unitKey, Source skills and original identity stay
unchanged. Additional raw star atlases do not authorize form publication.

Aerith6-star has13 validated clips, including limit_move. Its source master rows
confirm one original series207000405 at rarities5/6. Manifest SHA256:
3f44b979136ef215aafc6a13bcadb79c6157c2586901047cc253de434c14f945.
It preserves the dress/identity, with the original golden foot glow; it does not
add skills or promise a costume change. Real normal/boss fights, awakening reward
and subsequent Seal Evil were checked. Reproduction/evidence: current handoff and
tools/data/aerith-awakening-20261102. Personal visual acceptance is still pending.

Run ranks/stats are reviewed roguelike state, not edits to original skill JSON.
Research expansion is paused; see docs/roguelike-foundation.md and current handoff.

## Current form versus series acquisition (2026-11-01)

Iai Strike personally accepted;15 commands retained. New skills0 in this block.
Use --current-form with plan_source_imports.mjs when expanding an existing form:
published body must match recipe; ordinary acquisition must fit original master
rarity/maxLv. Missing/NV/conditional paths remain unconfirmed; no account/equipment/
quest eligibility is inferred. Series-only shortlisting cannot grant this check.
Existing reviewed FFRogue cross-rarity skills are not retroactively disabled.

Example --select barret:* --current-form yields227870/227871/227872/227873 for
classic5-star207000205, excluding6-star227876/227874/227875. Remake236220 is
rejected as another series. Inventory retains all series entries plus separate
formLearning status/evidence. Skill recipe rarity/level remains host balance.
Unknown spatial dispatch is independently blocked: Mindblow mode6 is not resolved
by fixing missing authoring. No target/caster substitution or incomplete release.

See current ROSTER_SKILL_COVERAGE.md for full paths and source identities. Existing
15 definitions/plans/resources/body contracts are unchanged. This does not solve
Hardshot, node4/7, mixed anchors or Billboard geometry.11 targeted tool tests pass.

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

New imports must separately review source target/range AND process semantics.
A body/effect/timing pass cannot establish damage or targeting correctness.
The opt-in prepared-events profile requires sourceScopeReview. Keep original
process values and descriptions/version evidence; store balance in the recipe.
Existing14 accepted commands were not retroactively rewritten. Unknown motion,
unknown profile or missing authoring still blocks; never add a default body clip.

---

Earlier revision notes (historical; current resume above takes precedence):

## Flat RGB preparation hint (2026-11-01)

14 Source commands remain playable. Current Delita body/position feedback is
accepted; Sword color correction is implemented and awaits personal recheck.
No skill or body is added in this block. Existing command definitions are intact.

The shared intake emits colorPreparation for Quad RGB: Constant/flat nonwhite or
random inputs require the opt-in --flat-quad-rgb preparation capability. This
checks exact binary/project data and keeps independent alpha. Active color
curves/non-flat colors cannot use this capability. Missing controls/unknown
mechanics remain blocked; do not replace color with a white default or skill tint.
The Source profile and choreography/position/gameplay reviews remain mandatory.
See the current handbook and skill workflow for evidence/commands and seed limits.


## Current main-party intake boundary (2026-11-01)

13 published Source skills/11 personally accepted remain unchanged. The current
handbook/skill workflow documents two new scale-curve slots, explicit dormant
texture-color selectors and hash-checked --control-audit reuse. These do not grant
choreography, gameplay or visual approval. Reraise is source-prepared only; no
revival/MAGIC fallback is published. New imports retain explicit position and
body/VFX/gameplay contracts. Browser QA uses game3001/sink3154 with mandatory
current-source preflight; old long-running receipt sinks lack that endpoint.

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

## Current: eleven technical Source skills; nine personally accepted (2026-11-01)

Daniel accepts corrected Braver in full; all9 prior skills are personally accepted.
New Delita253000205 Shield Break202180 and Jack254000603 Piercing Gleam203050 use
the common Source engine with complete composed unit prefixes and checked12-track
bodies.11 technically playable,9 accepted; new2 await personal visual review.
Play /?reserve=delita or /?reserve=jack. Default party/previous9 remain unchanged.

Mandatory actionChoreography remains; reviewed-adaptation is an explicit developer
review of coherent gameplay/body presentation, not native body-semantics evidence
or personal acceptance. No implicit atk, unknown-motion substitute or VFX-only
whole-skill approval. Source raw processes remain separate from reviewed balance.

Prefer --compose-unit-effects during batch planning so source-unit attack effects
cannot disappear from the dependency audit. Composition failures remain blocked
per item before staging; other candidates continue. No skills are published by
selection/staging. Fencer fails missing unit-prefix authoring; Warrior of Light's
idle duration0 fails body validation. No guessed normalization or partial import.
See skill workflow/handoff and tools/data/import-wave-20261101/validation.json.

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

## Current: Braver and shared Source import profile (2026-11-01)

Nine technically playable Source skills, eight personally accepted. New Cloud AC
207001605 Braver233930 is available at /?reserve=cloud_ac, using the same registry,
roster binding/player/event clock. Its original command is separate from reviewed
MP36/4.5x physical/F6 hit/+20% vulnerability3 enemy phases. No hero-specific loader.
All8 prior visual manifests remain unchanged. Personal approval of Braver pending.

Use prepare_original_preview.py --profile source-preview-v1 with an explicit
--authoring-directory plus recipe/body/native evidence to reuse accepted common
preparation settings. Exact missing or mismatched projects remain blockers. This
profile is experimental, not native certification or automatic publication.
See the skill runbook for commands and tools/data/braver-20261101/validation.json
for9-skill functional evidence/unchanged frozen Cloud images. The existing census
can be shortlisted with plan_source_imports --shortlist-catalog;51 names overlap,
but no additional uninspected command is thereby playable or fully importable.

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

This is the canonical **character publication** workflow for contributors and
coding agents. Start with the [asset pipeline handbook](asset-pipeline-handbook.md)
and [asset structure guide](asset_structure.md). This document covers local
discovery, sprite conversion, skill ownership, reviewed converted-effect baking,
publication, and runtime loading. Cloud / Brave Slash is the working publication
reference, not proof of original-game visual fidelity. All tools run
from the repository root and use local data; the standard workflow does not fetch
new assets or call the original game's servers.

For new skill reconstruction, use the
[original-data skill workflow](skill-reconstruction-workflow.md). That research
player reads prepared BMB-derived plans and is separate from the converted EFKE
sheet baker described here. Its latest preview improvements have not replaced
the game's published skill sheets. Do not publish a research plan as a character
recipe or stack an old artwork correction on a newly corrected source renderer.

Current user-authorized exception to historical preview-only publication: reviewed
experimental plans can be compiled with`tools/publish_scene_presentations.mjs`.
The generic `scenePresentation` binding is additive: retain every Legacy effect,
operation and recipe. Explicit`bmb-preview-scene-v1`/`experimental-preview` status
is mandatory, never native-fidelity approval. The game and research server share
`src/effects/originalEffectPlayer.mjs`. The publisher hash-checks resources,
rewrites texture URLs, retains model/curve/material/member data, records the
shared player/Three hashes and computes duration from instance ends. Import
inspection checks binding identity and rejects stale player hashes. Normal game
defaults to Source preview; the header or`?skillVisuals=legacy` restores Legacy.
Scope, damage events, MP and reward eligibility remain separate reviewed data.
Current Cloud publication, comparisons and restrictions are in the map.

The shared scene-action admission additionally requires the command's reviewed
scope/moveType to match the prepared presentation scope/movement. Publisher,
import inspection and runtime pre-MP validation use this same contract. Prepared
approachFrames/returnFrames drive the source action movement durations; they are
reviewed adaptations. Body recovery begins on the imported clip's completion,
while effect end and reviewed damage independently gate action completion. Do not
extend body hold to an effect lifetime or bypass unsupported-profile diagnostics.

Standalone checks use the same publisher with an explicit`standalone:true`
binding. They register a prepared resource, never a character command or reward.
Cross Slash's staged inputs/composed inspection/test recipe are retained under
`tools/data/scene-migration/cross-slash/` and in the migration archive. Reproduce
from those preserved inputs without fitting any source node:

```powershell
$scenePython = $env:FFROGUE_PYTHON
node tools/resolve_composed_skill.mjs --composition tools/data/scene-migration/cross-slash/composition.json --report tools/data/characters/cloud/report.json --output tools/data/scene-migration/cross-slash/composed-report.json
& $scenePython tools/stage_original_skill.py --report tools/data/scene-migration/cross-slash/composed-report.json --skill-id 214790 --output tools/data/scene-migration/cross-slash
& $scenePython tools/prepare_original_preview.py --source tools/data/scene-migration/cross-slash/skill-source.json --unit cloud --recipe tools/data/scene-migration/cross-slash/recipe.json --authoring assets/battle_effect/sp_20157_kyogiri_back.bmsln --authoring assets/battle_effect/sp_20157_kyogiri_front.bmsln --authoring assets/battle_effect/atk_slash1_white.bmsln --scene-composite --withhold-untextured --inheritance --source-appearance --basic-uv --model-vertex-rgba --particle-geometry --null-locator --rectangle-placement --renderer-reference tools/data/memorial-audit/diagnostic-v7/renderer-reference.json --output tools/data/scene-migration/cross-slash/plan.json
node tools/publish_scene_presentations.mjs --recipe tools/presentations/cross-slash-import-test.json
```

Raw re-extraction requires the ignored database/CPK/authoring inputs; ordinary
gameplay and already prepared replay do not. The test uses original member
timings with reviewed neutral gameplay damage. It does not adopt the historical
converted Cross Slash atlas repair. Finishing Touch is a separate, untouched
negative import test: unknown node family7 blocks the complete source rather
than guessing child counts. The seven model and two shared-source tests cover
the newly admitted empty-name-table layout and preflight rejection, respectively.

The [skill pipeline foundation](research/skill-pipeline-foundation.md) records the
import/progression target and visible-reference gate. We reuse skill identity and
animation, **not FFBE's chaining system**. Damage, MP costs, reward availability
and wave progression are roguelike balance decisions. Source hit metadata is
provenance; retaining it does not require reproducing the original combat rules.

## Bounded dynamic Particle programs

Visual references must survive renderer changes. Follow the current visual
preservation entry in the reconstruction map; `tools/preserve_skill_previews.py`
archives prepared dependencies plus current player/SDK/code identities before
integration. Native reconstruction references are the three Cloud skills, not
Satellite Beam. `preview_skill.mjs --prepared-plan ... --output ...` can replay
old converted configs without re-inspecting SQLite; never overwrite their source
receipt directory. New BMB preview captures retain frame/control/renderer identity.

Reviewed sheet recipes can declare `sampling: {filter: "linear", gutter: 1}` with
`review.samplingAdaptation`. The default remains nearest without gutters. Linear
requires extruded borders; `pack_effect_sheet.py` preserves every frame pixel and
duplicates edge texels. Baker, cache validation, character publication and Preload
share this metadata. Source body pivots/timing/scale remain unchanged. Do not apply
a native BMB geometry multiplier to converted artwork that was already baked.
Use `node tools/repack_effect_sampling.mjs --recipe ... --python ...` only for an
otherwise unchanged, hash-verified published sheet; the source is backed up in
ignored `tools/data/effect-sampling/`. It is not a way to reapprove other edits.
Fresh `export_effect.mjs` bakes use the same packer (`--python` or FFROGUE_PYTHON).
Future Windows checkouts pin effect recipe JSON to LF to preserve byte hashes.

The shared runtime also accepts the explicit `native-particle-basic-v1` manifest
profile. Compile it with `tools/prepare_particle_program.mjs` using pinned native
controls, supported scalar-alpha keys and a verified original PNG. This is not
automatic BMB/character publication. The current `native_particle_control` is a
controlled assembly, not a character skill or reward. Fixed60Hz, neutral parent,
finite no-overwrite single-cycle generation, one ConstX/VelocityX module and
quarter-grid intervals are required; unknown fields fail rather than fall back.
Native phases, RNG, births and live geometry run in the product's shared scene
path; no sheet baking is used for this profile. Existing sheets and Motion-1
remain supported. Full source/parent/material/pixel admission is still required
before binding an original skill to this profile. Current evidence and commands:
[reconstruction map](research/SKILL_RECONSTRUCTION_MAP.md#current-autonomous-checkpoint-original-clock-and-bounded-particle-program-integrated).

## Source of truth and file ownership

| Layer | Location | Purpose |
| --- | --- | --- |
| Raw unit art | `ffbe_asset_dump-main/unit_animated/`, `unit_animated_csv/` | Atlas, CGG parts and every CGS track for an exact sprite form |
| Master data | `assets/static_data/ffbe-data.db` | Form-to-series relationship, acquisition conditions, motions and effect timelines; read-only |
| Converted effects | `assets/battle_effect/`, `assets/effect_resource/` | Effekseer files, textures, models and optional authoring data for the current sheet publication path |
| Original effects | `com.square_enix.android_googleplay.FFBEWW/files/` | Ignored CPK backup; selectively staged original BMB/texture/model resources for the separate reconstruction workflow |
| Secondary metadata | `ffbe_data-master/` | DanUgore GL/JP descriptions and decoded mechanics for manual cross-checks; not automatically joined to a different game version |
| Character recipe | `tools/characters/<key>.json` | Exact sprite form, reviewed game stats, selected commands and supported execution mode |
| Effect recipe | `tools/effects/<key>.json` | Reviewed source/variant, camera, sheet settings, blend and review reason; shared across characters |
| Inspection report | `tools/data/characters/<key>/report.json` and `.md` | Full acquisition catalog and raw mechanics, per-skill effects/dependencies, issues and provenance |
| Prepared character | `public/assets/units/<key>/` | Sheets, manifest, selected `skills.json`, game-facing `character.json` |
| Prepared effect | `public/assets/effects/<key>/` | Sheet and manifest, including source/dependency/recipe/sheet checksums |
| Runtime catalog | `public/assets/content.json` | Registered character, monster and effect keys |

Raw dumps, stage folders, SDKs and reports stay Git-ignored. Recipes, this standard,
prepared runtime assets and the runtime catalog are tracked. An import must never
make Phaser parse CGG/CGS, SQLite, `.bmb` or `.efkefc` at runtime.

Implementation entry points are [import_character.mjs](../tools/import_character.mjs),
[character-pipeline.mjs](../tools/lib/character-pipeline.mjs),
[export_unit.py](../tools/export_unit.py), and
[validate_character.py](../tools/validate_character.py). Do not infer capabilities
from a recipe alone; inspection and publication have different checks.

## 1. Inspect an exact form

Requirements: Node.js 24 (`node:sqlite`), the local folders above, and for publication
`tools/bin/ffbetool.exe` plus Python with Pillow. Configure Python once in PowerShell:

```powershell
$env:FFROGUE_PYTHON = 'C:\path\to\python.exe'
```

Alternatively pass `--python 'C:\path\to\python.exe'` on publication. Missing tools
or source files fail the operation. No download fallback is attempted.

Start with an existing recipe:

```powershell
npm run character:import -- --recipe tools/characters/cloud.json
```

Inspection writes only ignored reports. It hashes source data and directly
referenced resources, enumerates the matching standard animation tracks, and follows:

```text
exact sprite form -> unit.unitSeries
                 -> unit_series_lv_acquire (abilityId and magicId)
                 -> ability / magic (raw mechanics and timelines)
                 -> effect_group.effectData
                 -> effect.fileInfo -> converted asset -> textures / models
```

Never resolve a group ID directly against `effect`: overlapping IDs refer to
different objects. Preserve repeated acquisition rows, rarity, level, NV level,
unlock type and brave-ability markers. A series catalog can include later forms;
it is not a claim that every form has every skill at level one. Passive skills
and magic are cataloged separately. Missing records are visible rather than dropped.

The catalog covers level acquisition for that series. Equipment-granted skills,
enhancements, quest unlocks, cooldown child skills and limit bursts require
additional discovery and implementation. Do not call this a complete list of
every skill a character could ever use.

For a new character, copy a recipe, change `key` and `spriteUnitId`, and initially
set `skills` to `[]`. Run inspection to discover the original learning list.
Then select commands by both ID and kind (`ABILITY` / `MAGIC`), give each a unique
English key, and review gameplay parameters. An empty selection blocks publication.
The importer does not guess damage formulas from names or invent missing animations.

`spriteUnitId` and the learning-series ID may differ. For example, Barret's current
sprite form is 207000205 but its series is 207000204. The importer resolves this
relationship from the database instead of truncating digits.

The current source discovery is narrower than the entire dump: it selects exactly
`unit_anime_<ID>.png`, `unit_cgg_<ID>.csv` and
`unit_<track>_cgs_<ID>.csv`. It does not gather numbered atlas pages, `_OD` or `ef`
variants, alternate CGG families, or choose between recovered GL/JP identity
collisions. A “publishable” report checks the selected files, not those omitted
families. Check the dump's identity/variant catalogs when those cases occur and
add an explicit reviewed source mapping before importing them. Do not mix atlas,
CGG and CGS from different forms, resolutions or regional versions.

## 2. Review the character recipe

Required top-level fields: `schemaVersion: 1`, `key`, numeric-string `spriteUnitId`,
`game`, `battle`, `scale`, and `skills`. See `tools/characters/cloud.json` for the
complete executable example.

`battle` contains `heroName`, `heroRole`, `maxHp`, `maxMp`, `attackType`
(`melee`/`ranged`), `targetOffsetX`, `attackAnim` and `hitFrameIndex`. These are
reviewed roguelike settings, not automatically copied from max-level FFBE stats.
`hitFrameIndex` is a **zero-based body-sheet index** for the basic attack; inspect
the character's motion to select it. Sprite scale and target approach distance
also need visual review per character.

Every selected command contains the `SkillConfig` fields used by the game and an
offline-only `execution` field:

| Execution | Current meaning |
| --- | --- |
| `timeline-single-hit` | Reviewed single-target melee dash, one damage frame; either a legacy single effect or strict source-composed visual tracks. Source attack frames and effect associations are checked. |
| `timeline-area` | Reviewed stationary area presentation: prepared effects at target/group anchors and one combined total-damage event. Source hit metadata remains separate; a review note must explain the adaptation. |
| `legacy` | Explicitly retain an existing MVP command with the previous gameplay executor. It does not claim complete original mechanics, multi-hit timing or VFX. |

Brave Slash uses the single-hit timeline. Blade Beam and Satellite Beam use area
presentations; the other six MVP commands remain legacy. New commands should not be marked
legacy merely to bypass unsupported behavior. Document intentional balance
changes in `reviewNote`; reports show source and game MP costs separately.

Publication blocks unlearned/passive commands, missing body motions, unsupported
motion/scope/movement, invalid values, mismatched timelines and unreviewed effects.
The engine currently supports `atk` and `magic_atk` skill motions. `single_ally`,
revival, buffs, status effects, elemental/resistance formulas, jumps, limit bursts,
multi-hit distributions and composite VFX require further executor work before
their original behavior can be claimed. Availability in the catalog alone does
not enable these mechanics.

## 3. Character animation contract

The importer converts every CGS track matching its exact standard naming rule
above and checks the exported track list against that discovery result. It does
not prove that all alternate animation families were discovered. Inspection
requires `idle`, `atk`, `move`, `dead`, `dying`, `win` and `win_before`, plus the
selected skill's motion. `standby` and `magic_standby` are optional readiness
tracks with runtime fallbacks. The runtime uses these names as follows:

| Situation | Body animation and behavior |
| --- | --- |
| Normal rest | `idle`, looping |
| Preparing physical command | `standby`, looping until executed or canceled |
| Preparing magic command | `magic_standby`, looping until executed or canceled; one preparation cycle before casting |
| HP <= 25%, alive | `dying`, looping (a one-frame pose is valid) |
| HP = 0 | `dead`, once; skipped in turn order and victory |
| Approach / return | `move`, looping; melee action returns home |
| Basic physical motion | `atk`, once; damage uses the reviewed body-frame index |
| Magic skill | `magic_atk`, once when selected by that skill |
| Victory | `win_before` once, then `win` looping |
| New wave / action ends / healing | Re-evaluate HP and choose `idle` or `dying` |

Heroes can each hold a prepared action. Preparing a command does not spend MP or
the turn. The desktop dock shows Attack and all three selected skills directly.
Select a party card or actor to choose a hero; selection never executes an action.
Click a command to prepare it, then Execute or Space/Enter to commit it. Keys 1–3
select heroes; Q selects Attack and W/E/R select their skills. Hover skills for
descriptions. Clear cancels only the selected hero's plan. Execution is sequential
and globally locked while an action runs. Other heroes' prepared commands persist.
New rounds/reset clear plans. Legacy submenu methods remain for compatibility;
the desktop UI does not expose a modal command menu.
Missing readiness tracks fall back to the available standby/rest pose; original
action motions still require explicit validation.

Resting-pose refreshes must not interrupt prepared commands, actions or victory.
Interrupted victory entrances remove their completion listener. Preserve the
source pivot contract and existing ranged recoil compensation described below.
Do not align sheets using guessed offsets.

Other exported tracks (`jump`, `limit_atk`, etc.) are
available but exporting them does not automatically assign combat choreography.
Some limit sheets include original cinematic backgrounds. Preview before use.
If a form uses alternate track names or lacks required tracks, inspection blocks
publication; implement an explicit reviewed mapping/fallback before importing it.

### Reading raw frames and prepared geometry

The atlas is a collection of parts, not an already ordered animation sheet. A CGG
row describes an assembled pose; a CGS sequence references those rows in playback
order and supplies delays. A referenced CGG row number, an exported body-sheet
index and a 60 Hz effect tick are three different coordinates.

The dump validators (`ffbe_asset_dump-main/tools/validate_unit_identities.py` and
`validate_recovery.py`, local ignored sources) establish this structural subset:

- CGS column 0 is a zero-based CGG row reference. Preserve sequence order and
  repeated references; do not deduplicate poses or sort by the reference.
- CGG column 1 is the part count. Following values form equal-size part records;
  require a consistent stride rather than treating every row as fixed-length.
  Within a part, zero-based fields 6 through 9 are atlas `x, y, width, height`;
  field 10, when present, is the atlas page. Validate referenced page and bounds.
- The remaining pose/part transform fields are delegated to `ffbetool.exe` in
  this repository's normal import. The workflow is not a complete independent
  CGG renderer specification; do not guess blend/flip/rotation enums when adding
  a parser. Keep the raw tuples and validate the new interpretation against
  assembled frames before using it.

`ffbetool.exe --json` produces one horizontal PNG strip and one JSON file per
track. The exporter consumes `animName`, `frameRect` and `frameDelays`; it does not
parse CGG/CGS itself. For example, the local Cloud attack CGS begins
`33,0,0,2,` then `23,0,0,4,`; the assembled attack JSON begins with delays `[2,4]`.
The first output body frame is index 0, even though it references CGG row 33.
Other CGS columns are not interpreted by the Python exporter.

The common virtual assembly origin is `(1000, 1000)` on a 2000-square canvas.
`frameRect` is the track's shared crop, not a separate crop for each pose. The
exporter preserves that anchor as:

```text
pivotX = (1000 - frameRect.x) / frameRect.width
pivotY = (1000 - frameRect.y) / frameRect.height
durationMs[index] = round(frameDelays[index] * 1000 / 60, 2)
sheetWidth = frameRect.width * frameDelays.length
sheetHeight = frameRect.height
```

Do not clamp pivots to `[0,1]` or recenter each image around its visible pixels:
the source origin can lie outside the visible crop. [UnitActor](../src/entities/UnitActor.ts)
applies each track's pivot on playback and uses `1 - pivotX` when flipped.
`delayTicks` and `durationMs` remain per-frame values in the prepared manifest.
Validate animation timing in the actual player, including transitions and holds.

`recoilOffsetX` is an exporter heuristic, not a decoded FFBE movement track: it
compares the bottom visible pixels of idle frame 0 and the track's last frame
(alpha above 50, bottom three-pixel band). Runtime currently uses a measurable
offset only for ranged returns. Check this visually when a weapon, shadow or
effect reaches below the feet. Mathematical pivot consistency does not guarantee
that every raw pose is visually stationary or that recoil detection is correct.

## 4. Resolve and bake converted skill visuals

This section describes the **existing EFKE-to-sheet publication path**. It is
useful for preserving/reproducing reviewed runtime assets, not a substitute for
decoding original BMB behavior. New fidelity work belongs in the
[skill reconstruction workflow](skill-reconstruction-workflow.md).

`attackFrames` and effect start frames are FFBE timeline ticks at **60 Hz**, not
body-sheet indices. Frame 4 = 66.67 ms, frame 6 = 100 ms. The skill clock begins
when the attack pose starts after approach; preserve the existing hit-stop.

Reports retain group timing, front/back layer, target/caster/screen anchor,
member timing/offset fields, scale, file transforms and raw sound references.
Preserve `@` segments and their process/target association. The current importer
labels every later segment `conditional` and blocks non-legacy publication; that
is a conservative implementation limitation, **not a decoded meaning of `@`**.
Parallel process groups can also use this separator. Do not flatten them into a
single target or assume a condition without evidence; see the
[composition audit](research/original-composition-audit.md).
Missing groups, effect files, resources and unresolved behavior stay visible.
The current baker supports the local EFKE INFO version
1810 and fails closed on unknown resource formats. Inspection records unknown
formats as `unsupported-effect-format` while preserving the rest of the catalog.

Create a shared effect recipe only after checking the source and its dependencies.
The Brave Slash recipe explicitly names the provided `flashcut` variant and why
it was selected. Never select similarly named effects automatically. No arbitrary
unit atlases or geometric placeholder spells are permitted.

```powershell
npm run effect:bake -- --recipe tools/effects/brave_slash.json
```

Open the printed local URL (default `http://127.0.0.1:3102/`). The page uses the
offline SDK in `tools/bin/effekseer-webgl-1.80.7/`, renders a deterministic seed at
60 FPS, and saves a standard sheet plus provenance manifest. Wait for
`Export complete`, inspect the frames, then stop the tool server. This browser
step is currently required; the CLI does not automate browser rendering.

An **ADD** bake is against black and must use Phaser ADD. Reviewed **NORMAL** recipes
preserve alpha for effects such as black screen fades. The recipe defines camera width, frame size/count, columns,
origin and final scale. Check clipping, tail duration, flash planes, placement and
size. The single-effect baker does not recover unknown original spatial transforms
or arbitrary composite choreography.

Reviewed area presentations reference `presentation: { impactFrame, durationFrames,
effects: [{ key, startFrame, anchor, layer?, fit? }] }`. Anchors support `target`,
`target-group` and `screen` for stationary `all_enemies` commands. Layers are
`front` (default) or `back`. Every source member must be
covered exactly once, with its original start tick, anchor and scale; unsupported
layers/transforms and additional `@` segments remain blocked. Duration must include
every baked effect. `impactFrame` intentionally controls one combined gameplay
hit and requires an explicit adaptation note. No per-skill code is needed for
another skill within this supported presentation contract.

Satellite Beam uses the same executor with an explicitly reviewed adapted `atk`
motion for unmapped source motion code 8. Original ten-hit metadata stays separate
from its combined F165 damage event. The baker's `emitterRotation` tuple is XYZ
degrees and must match source file transforms. Its black fade uses the original
NORMAL alpha effect. Recipe/manifest `contentBounds` describe measured union alpha
bounds; `fit: "arena"` fits them to the field without guessing screen offsets or
replacing the effect with a placeholder rectangle. Prepared effects are clipped
to the arena and clean up masks on destruction/reset. See the
[Satellite Beam review](research/satellite-beam-import.md).

Blade Beam keeps the source green emitter at scale 300% and blue at 100%,
starting at F0/F5. The accepted simplified presentation applies the total 3x
damage once at F30 to all captured living targets, without extra tint, recoil or
camera shake. Source F4/F8 and hitCount 2 are retained as provenance; this is not
an implementation of the original two-hit distribution. Green's raw -1100 field
remains unapplied. `emitterScale` in an effect recipe is an offline bake transform
(default 1), separate from the runtime sheet scale. Recipes and hashes cover it.

Reviewed `artworkRotationDegrees` rotates the rendered artwork clockwise without
altering source XYZ metadata. A nonzero value requires
`review.presentationAdaptation`. `artworkPivot: "origin"` keeps the target anchor
fixed; `"bright-body"` tracks the largest connected bright component per frame,
so detached flashes do not steer moving projectiles. The bake clips each rotated
frame to its own cell. Artwork angle/pivot are also checked against the manifest
on publication. The currently published converted Blade Beam recipe uses +90
degrees around its bright body; Satellite Beam uses +45 degrees around its target
origin. See
[the orientation correction review](research/effect-orientation.md).

These are documented presentation adaptations, not recovered native transforms.
The newer original-source player now evaluates the stored Blade Beam single-texture
rotation/pivot, as described in the
[source geometry review](research/blade-beam-source-geometry.md). Do not carry the
converted recipe's +90-degree correction into that player or a later export of
it. Native member placement, some transform conventions and unsupported emitters
still need work; a successful original-source preview does not make a complete
replacement publication pipeline available.

Existing single-hit recipes may reference `visualEffect: { key, startFrame }`.
For admitted ordinary motion-1 abilities, prefer the offline source-derived form:

```json
"sourcePresentation": {
  "composition": "unit-attack",
  "effectKeys": ["attack_slash_white", "brave_slash"],
  "impactFrame": 6
}
```

This example belongs to Cloud's reviewed recipe; other forms bind their own exact
unit effects, never Cloud's by default. The compiler combines `unit.effectFrames`
with skill groups shifted by the latest unit-group start, then adds each member's
delay. It derives start/anchor/layer from source and duration from the reviewed
60Hz sheet budgets. `impactFrame` remains a reviewed roguelike damage event.
Complete exact effectId/masterFile bindings are required. Ordinary unambiguous
groups with known anchors/layers, zero extra flags and member tail
`99999999:1:2:2:0:0` are the current admitted profile. Other motions, branches,
transforms, missing dependencies/bindings or malformed times block publication.
No original graph completeness or pixel fidelity follows from this profile.

`sourcePresentation` and `execution` are stripped from runtime skill data. The
existing `presentation` field carries compiled visual tracks; `character.json`
records raw timelines, offset and rule under `provenance.visualCompositions`.
Do not also supply `visualEffect` or a manual `presentation`. A `reviewNote` and
`timeline-single-hit` execution are required. Product melee and area use the same
visual scheduler; single-target anchors include parent-container world transforms.
The action holds through the longest visual track before its return movement.
This does not change the existing reviewed area recipes or gameplay balancing.

The importer verifies original effect IDs, files and anchors. On publication
it verifies source, resource, recipe and sheet hashes and sheet dimensions. Changes
to any input require rebaking; they must not silently reuse an old sheet.

Regression commands: `node --test tools/test_character_pipeline.mjs
tools/test_combat_regressions.mjs` (one command), then `npm run build`. With the
normal Vite server running, open `/tools/test-source-presentation.html` and click
Run integration check for actual product Boot/Preload/BattleScene playback,
old/new Brave comparison and Blade/Satellite controls. Download its receipt and
proof images; no original pixel comparison is performed by this product test.

## 5. Publish prepared content

```powershell
npm run character:import -- --recipe tools/characters/cloud.json --publish
```

`--assets <folder>` and `--dump <folder>` select different local source roots.
Publication runs ffbetool and the existing Pillow exporter in a fresh staging
directory under `tools/data/characters/<key>/`. It checks track coverage, basic
attack frame bounds, sheet dimensions, frame counts, timing and effect hashes
before copying prepared files to `public/assets/units/<key>/`. The recipe's
offline `execution` field is not emitted into runtime skill data.
The report records a publication receipt with the exported animation list,
effect keys and SHA-256 of each published character file.

The importer registers the character and referenced effects in `content.json`.
It copies files only after validation; final filesystem copy is not transactional,
so inspect/restore Git changes if an external disk error interrupts publication.
Old unreferenced prepared files may remain on disk but are absent from the newly
generated manifest and are not loaded.

### Skill icons (after every skill publication)

```powershell
node tools/export_skill_icons.mjs
```

Resolves each published skill's `type:ffbeId` through `ability.iconId` /
`magic.iconId` in `assets/static_data/ffbe-data.db` (iconId 7000000NN →
`<dump>/abilities/ability_NN_HD.png`, else the SD file), copies the icons unchanged
to `public/assets/icons/skills/` and writes `index.json` (lookup + source and
SHA-256). FFBE shares icons between skills (Cloud's sword techniques all use 54).
The export fails when a skill has no resolvable icon; the runtime then shows the
generic attack/magic/ability command icon only for skills missing from the index.
2026-11-07: 21 published skills → 8 icons.

### Limit Bursts

A recipe skill with `type: "LIMIT"` and the form's `limitBurstId` as `ffbeId` publishes the
Limit Burst like any Source skill (see skill-reconstruction-workflow.md). At runtime the
catalog moves it to `limitBurst`: it never enters starter draws, rewards or the three
skill slots and is used through the LB gauge. Its body clip (`limit_atk`) must exist on
every admitted higher form. 2026-11-07: Cloud → Omnislash.

## 6. Runtime loading and party placement

1. `BootScene` loads `content.json`, then every registered manifest and character
   definition. No new per-character or per-effect loader should be added.
2. `PreloadScene` loads the manifest-declared sheets and each character's selected
   skills. Raw data stays outside the game.
3. `BattleScene` reads stats/combat configuration from cached `character_<key>`,
   commands from `skills_<key>`, and uses the shared `UnitActor` state behavior.
4. Effects load once per shared key; each cast creates transient sprites using
   the manifest's `NORMAL` or `ADD` blend, reviewed target/group/screen placement,
   layer and completion cleanup.

Optional `portraitSource` in a character recipe names a reviewed file relative to
the unit dump (for example `unit_icons/unit_icon_207000105.png`). Publication copies
it to `portrait.png` and adds its prepared path to `character.json`. PreloadScene
loads it under `portrait_<key>` for the party row. Raw icon paths never enter
runtime loading. Viewport formation and the shared art-scale factor are defined
in `src/ui/battleLayout.ts`; recipe scales and source pivots stay asset metadata.

**Registration does not change the active party.** The current battle still has
three fixed actors, formation slots and Cloud/Aerith/Barret-specific balance
branches. To make another imported character playable, a separate reviewed party
integration must replace/add the relevant actor references, turn-order/HUD entries
and any identity-specific damage rules. Do not merely rename a key and assume all
roles, targeting and balance have changed. A general roster/party selection system
is outside this import milestone.

## 7. Required verification for publication changes

```powershell
npm run test:pipeline
node tools/test_combat_regressions.mjs
npm run build
```

Run checks appropriate to changed code and published assets; a documentation-only
update does not require rebaking, publication or gameplay tests. Pipeline tests
use synthetic local fixtures: they verify group-ID collisions,
resource boundaries, form/series acquisition, repeated unlocks, magic discovery,
missing states and unsupported skill rejection. They do not require a full dump.

Then visually check the real Phaser game: loading, idle/dying/healing, attack
movement and hit timing, victory entrance/loop, MP cost, target damage and turn
progression, plus repeated actions/reset for cleanup. The shared state preview is
`/tools/preview-character-states.html`. Record what actually ran. Original-game
fidelity needs an original reference or explicit developer visual acceptance;
passing a build or finding an asset does not establish it.

## Migration and historical verification

For several skills, use the [reviewed batch workflow](research/skill-batch.md):
`npm run skills:batch -- --all` inspects every selected MVP command, and
`--bake` queues only ready, approved effects through the existing baker.
It reports incomplete legacy commands separately and does not publish them.

The older `import_unit.py`, `extract_unit_skills.mjs` and
`analyze_cloud_effects.mjs` remain available for research. Their outputs are not
the canonical reviewed recipe. `import_unit.py` fetches by default, uses shared
`tools/test_input` / `test_output` folders and writes directly into `public/`;
even `--skip-fetch` does not provide the current importer's staging, validation or
registration guarantees. Do not use it to republish a reviewed character.
The original BMB research previews follow their own explicit capability report
and are not an obsolete equivalent of this converted-sheet baker.
The compatibility command `export_brave_slash.mjs`
now delegates to the general effect baker. Edit recipes and use this workflow
for future changes, rather than regenerating approved data with the older scripts.

The earlier character-import milestone inspected all three MVP recipes, rebaked
Brave Slash through the general exporter, and published Cloud through the complete
staged local import.
Aerith and Barret recipes preserve their existing gameplay settings; their new
recipes were inspected but were not republished in this milestone.
Repeating Cloud publication produced byte-identical prepared character files.
The real game loaded through the new catalog and Brave Slash's effect, 18 MP
cost, damage popup, home return and advancement to Aerith were checked in-browser.
A full run and a newly playable fourth character were not tested.

Those observations are a historical receipt, not a statement that later work
reran them or that all skills now use original-source rendering. On each new
publication, record the exact recipe/source hashes, commands, prepared files,
runtime checks, visual reference and unresolved deviations. See the handbook
for the current evidence and handoff rules.
