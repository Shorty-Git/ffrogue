# Roguelike foundation and content boundaries

## Audio contexts

GameFlow owns one audio manager backed by Phaser Web Audio. Title and slot
setup share Home resource 400003. Battle and reward routing use the area's
music resource and preserve the active source within that area. Awakening
keeps the previous area until the player continues. The unmapped Reactor
and expedition results use silence after a 240 ms fade. Returning to title
requests Home again. Web Audio handles tab suspension. Page hide records
loop position for the active context and Continue can restore it after a
reload and browser unlock. The run position is separate from Home and is
cleared when starting a new run.

Music and sound effects have separate local volume and mute preferences.
The UI tone registry uses FFRogue-authored synthesis. Lever audio follows
the committed draw, rolling and stops follow animation events, and the
reveal uses the already committed rarity. Skipping or reduced motion drops
the sounds attached to animations that did not run. Skill and target
selection tones are interface feedback. They do not represent FFBE skill
audio or share the gameplay clock.

## Current: restored crystal, mechanical lever and reviewed 7-star forms (2026-11-02)

The original title diamond is restored (U+25C6, now encoded as `&#x25C6;`).
The prior RunUI edit decoded UTF-8 using Windows-1252 and rewrote the resulting
mojibake as UTF-8. Comparison with a64b45c/6552b60 proves this was text corruption,
not a missing SVG, asset, font or shader. All affected RunUI punctuation is repaired.
Always use explicit UTF-8 when reading AND writing source. Existing glyph/shape,
blue/silver layout and shadow remain. Presentation adds +/-7px floating over6s,
a7s halo and three tiny5s glints via CSS transforms/opacity only; reduced motion
stops all three animations. No texture/dependency or gameplay timer is added.

`SlotLever.ts` owns ONLY pointer/keyboard input and mechanical presentation. Chrome
rod/red ball are CSS elements beside the existing machine. Click pulls down190ms;
drag follows the pointer and commits at86px. The existing GameFlow.spin remains
the sole owner of rollParty, saved results and RNG. Bottom triggers once; busy/
existing-party disables the lever; partial/cancelled drags consume nothing. WAAPI
is cancelled on detach and after finishing so its fill cannot mask later drags.
Re-rendered busy UI springs back300ms; Skip/reduced motion bypass presentation.
Native button semantics preserve keyboard use. Individual reel rerolls stay intact.
No role filter, extra draw, new RNG stream or modification to identity rules.

Original unit/class-up rows establish Cloud207000105->106->107 (5/6/7-star) and
Aerith207000405->406->407 (5/6/7-star). Both7-star bodies are prepared/reviewed
in separate asset namespaces, with all common and published Source body phases.
Their poses/costumes remain similar: the original aura/particles/details change,
not the character variant. Cloud207000117 is another same-rarity class-up row,
NOT another star tier; it remains unreviewed/unpublished. No AC/Remake swap.

The catalog now carries admitted `forms`; `evolution` retains the FIRST normal
step as a compatibility alias. `unitForms.mjs` resolves form IDs and progression.
Separate `public/assets/run-rules.json` configures NEW prototype runs with
`awakeningMode: highest-reviewed` (currently5->7 for both units). Switch to
`sequential` for normal5->6->7 progression. Rules are snapshotted in each run;
existing schema2 saves with no rules remain sequential, including existing6-star
rewards/pending notices. No data migration or original rarity edit. Unknown policy,
unit variant, unavailable clip or unreviewed form is not offered. Gameplay HP gain
remains up to15% base per chosen reward, with the existing3.2 stat ceiling.

Awakening's saved one-shot contract is unchanged. Its2.4s blue/gold presentation
now emphasizes the star transition, alternating sparks and a LOCAL soft finish
glow. Both original foot-aligned sprites are used unchanged; Skip/reload cannot
cancel or repeat the committed form/HP/history. This is FFRogue presentation, not
an original FFBE cutscene. Reduced motion remains minimal. Existing Mako isolated
linear-sampling adaptation and all240 frames/30FPS are preserved.

Reproduce current QA with review_slot_lever.mjs, review_form_skills.mjs,
review_awakening.mjs --rarity7 (or --rarity6 --fixtures-only), and
inspect_form_appearance.py. Receipts/screenshots under
`tools/data/crystal-forms-lever-20261102/`; current handoff lists executed checks,
failed harness coverage and honest limits. No new skills, stages or research.

## Current: meaningful Awakening and soft stage layers (2026-11-02)

The short expedition remains2 areas/4 fights with15 Source skills. Evolve rewards
now have an explicit saved presentation lifecycle rather than immediately replacing
the BattleScene. chooseReward applies the same original form/HP gain ONCE, advances
the encounter, appends the reward history and saves a pendingAwakening notice in
the same RunStore write. Notice.from/to preserve original form/unit/rarity and are
validated against the catalog, upgraded member and last reward. No combat/RNG can
advance while this notice is pending. Existing version2 saves without a notice
remain valid; version1 canonical migration is unchanged.

RunUI displays a common blue/gold Awakening over the actual old Victory arena.
Both prepared original idle sprites are foot-pivot aligned, with a brief crossfade,
rings/sparks, name and5->6-star display. These are declared FFRogue presentation,
not imported FFBE cutscenes. It applies no gameplay and makes no costume-change
claim if original art is identical/subtle. New form images must decode before the
animation begins; assets are not replaced with a substitute. A2.2-second CSS
animation-end event or Skip acknowledges the saved notice, then starts the next
real battle. Reduced motion uses a minimal presentation. Skip/stale callbacks
are one-shot; modal accessibility attributes are cleared when returning to combat.

Reload/Continue acknowledges an unfinished presentation and resumes AFTER the
already saved upgrade, without replaying it or applying HP twice. The acknowledged
state retains the same party/skills/reward history/RNG; the loader admits the new
form before actors exist. On asset/storage error the committed upgrade remains in
the save. Actual browser coverage includes Cloud/Aerith real boss rewards and
Source casts next battle; both6-star texture namespaces/IDs are checked. Additional
saved-boss-reward fixtures check Skip twice, reload during/after and reduced motion.
These fixtures are not claimed as additional fought bosses.

Aerith207000405->207000406 is a real same-series5->6 change. Aligned pixels differ,
but pose/costume is very similar, with subtle detail/aura changes. No cache error
was reproduced and no original sheet was edited. Cloud207000105->207000106 also
retains exact original art. inspect_form_appearance.py creates independent aligned
comparisons over black/white and checks original unitSeries/rarity metadata.

Reactor fog sampling is an explicitly bounded FFRogue material policy. Three
unchanged soft cells (80x40 fog/fog2 and20x32 gradient) get exact cropped textures
with2-pixel clamped gutters and linear filtering. The original hard atlas stays
nearest; Source/hero/enemy textures stay untouched. All240 frames/30FPS,7,451
packets and cells are identical to parenta64b45c. No original GPU sampler claim.
See background-import-workflow.md for recipe, matched frames and future area intake.

Twelve selected original stage profiles were examined;8 back animations are
exportable without new renderer mechanics, not automatically published. Dollet
(FFVIII), a reviewed Nibelheim manor candidate and Reactor05(FFVII) are the future
shortlist. The current forest is kept. Original music/encounter joins remain
separate from reviewed proposals. No new skill reconstruction, area or boss enabled.

Current reproduction: review_awakening.mjs (optional --fixtures-only),
review_stage_sampling.mjs, inventory_stage_candidates.py, inspect_form_appearance.py.
Use configured Python/Pillow and installed Playwright/Chrome, fresh3001 plus a
current receipt server. Output tools/data/awakening-polish-20261102 contains actual
proofs/screenshots. Initial general expedition run missed its party-burst coverage
assertion; no complete failure trace existed to identify a cause retrospectively.
The harness now retains action/impact/choice telemetry. Instrumented full rerun
passed both boss bursts/phases and final victory. This does not claim a gameplay
bug was fixed by telemetry; the initial failed receipt is retained explicitly.

## Current: bounded loading and living reactor (2026-11-02)

No encounter/hero gameplay expansion: still2 areas/4 fights,15 unchanged Source
skills. Normal title/slots only need idles/portraits. BattleScene.preload now
resolves current party/form clips from published choreography, common combat
states, and current enemy idle/declared attack. Actor construction waits for the
Phaser loader barrier. Missing required texture blocks commands before HP/MP/RNG
can change. Registration/playback also require admitted textures. Already loaded
textures are reused without eviction or a separate cache manager. Bosses/forms
load at their encounter boundary, never during a Source action. No timing edits.

Three isolated installed-Chrome contexts per variant, HTTP cache disabled,
localhost Vite development server3001, same qa-themes-78 party. Median values:

| Phase | Eager baseline | Demand loading | Demand + animated reactor |
| --- | ---: | ---: | ---: |
| Cold title ready |1051ms|421ms|426ms|
| New run roll/skip |66ms|68ms|70ms|
| First battle ready |648ms|678ms|677ms|
| First Source gameplay completion |1740ms|1742ms|1735ms|
| Ochu entry fixture |1451ms|1468ms|1456ms|
| Reactor entry fixture |597ms|602ms|610ms|
| Guard Scorpion entry fixture |1441ms|1441ms|1445ms|
| Title body PNG requests |124|7|7|
| Title RGBA8 texel estimate |465.37MiB|8.66MiB|8.66MiB|
| First battle RGBA8 estimate |465.37MiB|15.67MiB|15.67MiB|
| After four entry fixtures, RGBA8 estimate |465.37MiB|20.54MiB|22.45MiB|
| Title encoded response bodies, entire page |42.58MiB|20.02MiB|20.69MiB|

First Source was actual execution with MP/notice checks. Later timed entries are
explicit encounter-entry fixtures, not additional played fights. Full expedition
QA separately played every battle. Entry times include unchanged materialization/
boss announcement; startup improvement is not a claimed attack speedup. No extra
body requests occur at first Source use. Body requests total127 before versus45
after all four fixtures. Texture dimensions come from actual Phaser textures;
RGBA8 is NOT live VRAM/total process memory. CDP JS used heap is also recorded:
title14.71->13.64MiB, first battle82.89->78.61MiB for final variant. No forced GC;
these fluctuating JS values do not demonstrate a leak or native/GPU allocation.
Historical baseline ResourceTiming reaches its default250-entry cap after the
first battle; subsequent ENTIRE-page encoded-byte values are lower bounds and
must not be compared as totals. Title totals and texture/body counts are complete.
The reusable benchmark now enlarges the buffer to5000 for future measurements.

Mako Reactor has source-authored30FPS/240-frame SSPB-v1 motion, prepared offline
with historical SDK-backed structures and played as normal/additive quads on the
existing Phaser pipeline. Background workflow defines all supported/blocked
semantics and source hashes. Static JPG, floor mapping, characters, Source engine,
boss UI and rewards retain one camera/arena. Arena clock pauses/shuts down with
the scene; no combat RNG/state changes. All240 frames and loop wrap were observed
in-browser, plus actual light-region pixel changes, both bosses, Source effects,
rewards and reload. No native camera/GPU pixel-parity certification is claimed.

Current audit449 selected hashes/37 identical groups/64 source modules. New atlas
copy is required runtime provenance, not disposable duplication. No original,
tool, archive, prepared limit sheet or cache was deleted. Vite still copies public
assets into dist; this optimization reduces browser loading/residency, not full
distribution size. The existing oversized JS bundle warning remains open.
Original enemy publication0; Ochu Dance needs a verified monster body/anchor path,
Tail Laser additionally unknown type7. Audio32 occurrences/8 tuples preserved.

Reproduce from root (installed Playwright path required, no browser installation):

```powershell
node tools/measure_body_loading.mjs --playwright INSTALLED_PLAYWRIGHT_PATH --output tools/data/NEW_MEASUREMENT.json
node tools/review_source_party.mjs --playwright INSTALLED_PLAYWRIGHT_PATH --capture-origin http://127.0.0.1:3163
node tools/review_themed_expedition.mjs --playwright INSTALLED_PLAYWRIGHT_PATH --capture-origin http://127.0.0.1:3163 --output tools/data/NEW_EXPEDITION
node tools/review_stage_runtime.mjs --playwright INSTALLED_PLAYWRIGHT_PATH
```

Freshness requires29 modules. Start a current receipt server as documented in the
handoff first. Browser drivers use isolated profiles and preserve personal saves.
Source reserve review uses reviewUnit to avoid exceeding the receipt server32MB
limit; the initial aggregate Delita review hit that harness cap, then the scoped
Delita/Jack runs passed. No product renderer failure was inferred from that cap.

## Current scope: presentation quality, no area expansion (2026-11-02)

The prototype stays2 areas/4 fights with Ochu and Guard Scorpion. Third-world and
18-fight expansion are explicitly deferred. All15 hero Source commands/forms,
slot rules, saved fixed party and centered live-arena rewards remain the baseline.

ActionBanner consumes one typed combat-action event at a committed action. Actor
and ability IDs/names come from the actual hero skill or enemy action descriptor.
Failed admission/MP checks and stopped enemy turns do not invent uses. Hero/basic/
support/heal/enemy/preparation share one FIFO panel; duplicate sequence notices
are ignored. Presentation tween85ms in/480ms hold/120ms out never gates damage or
turns. Scene shutdown/celebration clears pending presentation safely. Boss pattern
names are labeled FFRogue, not relabeled Tail Laser or Ochu Dance. There is no
second action executor, audio player, RNG draw or changed Source hit clock.

Victory readiness no longer requires an extra resting win loop. Offline
prepare_victory_poses.py fingerprints exact RGBA poses around original pivots,
finds a trailing intro suffix already in win, or conservatively waits for the
complete intro and first win pose. Prepared hash-bound gates are loaded by Boot;
the actor signals readiness on actual animation start/frame events and keeps
playing the unchanged full clips. Reward placement uses equivalent resting-frame
bounds instead of an intro canvas's empty margins, keeping the accepted centered
layout without changing actor geometry/anchors. Unreviewed/stale metadata retains the old
full-cycle wait. A run's lethal Source caster now rests until the shared VFX/
enemy-fade barrier, so its sword sequence is not partly hidden inside a long tail.
Already reached reviewed poses do not wait for another loop. The group still waits
for every living actor; saves/offers settle once and reload uses the same path.

Same seeded Jack/Delita/Cloud browser run: celebration -> cards measured about
4.67s before versus2.07s now on normal/boss encounters. Native intro/gate metadata
Cloud4.667->2.067s, Aerith5.667->3.133s (presentation policy, not original engine
timing measurements). Final lethal Blade Beam fixture confirms Source active at
the last hit, fully inactive before group celebration, then2.068s to cards.
See battle-polish-20261102/victory-comparison.json and early-source-victory.json.

Original-enemy intake, SSPB-v1 atlas discovery and audio references are offline
preparation only; no new original enemy skill or animated stage is admitted. See
enemy-import-workflow.md/background-import-workflow.md for exact data and blockers.
Body/VFX/anchors/gameplay/audio remain separate contracts. Existing generic
FFRogue patterns continue to work. No major BMB or hero reconstruction restarted.

Bounded cleanup: unused RUN_BALANCE.normalHpPerArea/chargedEvery/chargedMultiplier
removed after reference search; current stage difficulty/cursor patterns own these
rules. No gameplay values changed.447 files hashed,36 identical-content groups;
original/processed/generated/cache/archive categories are explicit. No files were
deleted. Old import_unit.py and find_clean_backgrounds.mjs are historical tools,
not canonical publication. export_unit.py remains shared, particleProgram.ts remains
an offline compiler dependency. Do not delete based on static main reachability.

Potential next safe performance task: metadata-driven required-body-clip preload.
The current eager loader still queues unused large limit sheets (one39342px wide).
All prepared PNGs sum to820.3MiB RGBA8 texels, NOT measured live VRAM; some are not
runtime-loaded at all. Preserve original assets/provenance and review every
required clip/form/Source command before reducing loading. Do not blindly dedupe
URL namespaces or start a new renderer. Original enemy body/anchor measurements
and a verified SSPB-v1 cell/instance/frame decoder are subsequent content blockers.

## Scope and preservation

Active milestone: a production vertical slice, not more skill reconstruction.
The Source-only15-skill baseline is checkpoint d18fb3f6a2d3a7f79def3f1af5d21178c90be120,
also pinned as codex/roguelike-baseline-20261101. No BMB/Hardshot/Store rules are
changed. Original research, indexed sources and the verified preservation archive
chain remain intact. The reconstruction map and old handoff retain the exact
Barret/Store/Motion8/Aerith gates. Audio and backgrounds remain separate future
content systems; no new audio extraction or skill substitution.

## Architecture and pre-existing behavior

Before this milestone Boot/Preload entered BattleScene directly. A fixed
Cloud/Aerith/Barret party, optional reserve, two explicit encounters with a generic
six-fight progression and three hard-coded rewards existed. Progress was not
persisted; rewards and damage were coupled to named slots. Dynamic Source menus,
status/heal/multihit events, clean action barriers and the shared player already
worked. They are reused, not replaced.

New boundaries:
- `run/runState.mjs`: pure serializable transitions, independent roster/skill/
  reward/combat random streams, three rerolls, fixed identities, active skills,
  rewards, resources, terminal states and validation. No Phaser or raw asset reads.
- `run/runBalance.mjs`: stage-based encounter values and simple charged boss
  behavior. Reward strength never feeds enemy scaling.
- `run/catalog.ts`: admitted published skills plus prepared original form metadata;
  one shared description formatter from actual reviewed gameplay definitions.
- `run/GameFlow.ts`: storage/UI/battle coordination. The sole BattleScene receives
  a typed run context; debug continues using its previous contracts.
- `ui/RunUI.ts` and `ui/roguelike.css`: shared blue/silver panels, buttons,
  character/skill/reward cards, dialogs and responsive keyboard/touch focus states.
- `public/assets/run-content.json`: prepared unit identities/form metadata. It does
  not create more registered character identities or claim raw-form eligibility.

The old BattleScene slot aliases remain to preserve accepted/debug behavior.
Run actors use their own keys/configuration, and damage stats are run-owned.
Extracting the remaining debug reward/HUD/basic-attack code from this large scene
is a future bounded refactor, not a hidden claim of a complete architecture cleanup.

Cleanup 2026-11-07: the debug battle path is removed. BattleScene requires a
RunBattleContext and always renders the DOM CombatHud. Removed: `?debug=battle`,
`?hud=legacy`, the Phaser header/dock HUD, debug reward cards and buff
multipliers, debug waves, skill paging, the debug defeat banner, the
`describe` context hook (CombatHud shows skill copy itself), EnemyTargetPanel,
BossEncounterPanel and the dead tools/test-source-presentation.html.
Non-run battles use `createTrainingRun` (src/run/trainingRun.ts): Cloud, Aerith
and a registered reserve with every registered skill, neutral stats, the seeded
`training` combat stream and the fixed TRAINING_ENCOUNTERS (boss dummy 5000 HP;
two 3500 HP dummies). The arena gallery and /tools/test-source-scene.html start
BattleScene with it; optional `focus`, `carry` (next wave), `arena` and
`bodyTextureFilter` keep the review checks deterministic. The frozen Cloud
baseline matches with 0 changed pixels only under bodyTextureFilter `nearest`;
its header exclusion is the recorded bounds `{x:-1,y:-1,width:1002,height:50}`.
Skill rolls share skillBaseDamage and draw once per impact, so seeded run
streams are unchanged.

## Run rules and save behavior

Normal `/` opens the title. There is no debug battle entry; development battles
use `?gallery=arenas` or `/tools/test-source-scene.html?reserve=<key>`, both on a
training run. `reserve` alone does not bypass the title. No second skill renderer
is added.

The draw pool contains6 currently supported identities: Cloud, Aerith, Cloud of
Darkness, Cloud AC, Delita and Jack. Barret remains in debug/content, excluded from
draws because he has no published Source skill. Each starts with one seeded own
skill. Classic/AC remain distinct original series, but the starter-party uniqueness rule
now uses their shared canonical Cloud identity; at most one can be drawn.

Results commit BEFORE reel presentation. Three single-slot rerolls share one
counter; all can target the same slot. Visual tapes do not draw gameplay RNG.
Reloading retains results and remaining rerolls; confirmation permanently locks
the party. No stakes, currency, gacha collection or purchases exist.

Storage key `ffrogue.run.v1` (schema2, with validated schema1 migration) includes original identity, current prepared form,
active skills/ranks, stats, resources, encounter, RNG state, already generated
offers and choices. Invalid/unsupported saves require explicit discard. Stale
tabs cannot overwrite newer saves. Storage failure must not grant an unrecorded
reroll. Saves are local to the browser/device; no cloud sync or tamper resistance.

Battles resume from the saved ENCOUNTER ENTRY checkpoint, not mid-animation or
mid-turn. The same seed/actions reproduce combat draws. Victory persists resource
snapshots and three offers atomically, after gameplay/body/impact barriers. Reward
selection applies once, locks the choice and advances the encounter. Reloading
cannot re-roll offers or double-apply an upgrade. Returning to title during battle
deliberately returns to the encounter checkpoint; this limitation must be visible.

## First playable content profile

Prototype:2 short areas, each1 normal fight plus1 boss =4 encounters. Whisperwood
now uses original Microchu/Ochu bodies; Mako Reactor uses Sweeper/Guard Scorpion.
The two existing static arenas remain byte-identical. Original-backed body clips
are separate from reviewed FFRogue boss patterns/stats. The initial Dire Rat /
Riftfang names and every-second-round charge were the prior prototype, superseded
by stageContent.mjs (2026-11-02); the old debug Source review body is preserved.
The full3-area5-normal-plus-boss layout has18 entries in `FULL_AREAS`, but is not
the default release: third theme, roster, boss diversity/music and balance remain.

Run-only rewards: learned supported skill, ranked skill, attack/magic/defense/HP
bonus or living-party recovery. Active slots cap at3; learning a fourth requires
explicit replacement. Skill upgrades scale damage/healing/fallback power and/or
status duration; original published JSON and VFX timelines are immutable. Skill
copy displays real MP, target, hit count, damage mechanic, heal, statuses, HP cost
and special KO rules. Wider passive families remain future work.

Boss offers can include verified same-identity evolution. Classic Cloud5-star
207000105 ->6-star207000106 is prepared through the existing importer, all12
animations validated. Its distinct texture/animation namespace prevents overwriting
the accepted5-star sprite. Skills and identity remain Cloud; no AC/Remake swap.
The6-star sprite is used by the NEXT battle, not merely a card portrait. Other
same-series raw forms are inventoried but not published/approved as evolutions.

## Architecture/asset audit

`python tools/audit_game_foundation.py` writes an ignored dependency/hash receipt.
Initial audit:45 source files,364 hashed inputs,23 duplicate groups.
After integration:52 source files,378 hashed inputs,23 duplicate groups; only
particleProgram.ts is unreachable from main and retained for offline callers. The audit
covers public assets, static DB/audio and recipe unit raw sprites/CSVs; it only
enumerates the remaining large original tree. It is NOT a full CPK/map integrity
audit. Hash-equal files are not deleted: logical URLs, source identities and
archive references may need separate copies.

`particleProgram.ts` is unreachable from main but imported by the offline
`prepare_particle_program.mjs` and referenced by research; it is retained. Native
packet/geometry modules are dependencies of the current common player. Legacy
Source/Legacy switching was already removed; no repeat cleanup or asset purge.
All three package dependencies/toolchain entries remain required. No new package.
The baseline preloads all registered sheets; demand-loading after title and tighter
texture budgets remain performance work. New prepared form textures load once;
they are hash-distinct from Cloud5-star, not redundant conversions of one image.

## Validation and next steps

Artifacts live in `tools/data/roguelike-foundation-20261101/`. Domain tests cover
100 seeds, same-slot rerolls, reload/stale tabs, immutable source definitions,
one-shot rewards, replacement, evolution/identity, win/loss and stage-only scaling.
Actual BattleScene regression tests protect old action barriers and namespace
isolation. Browser full-loop checks are recorded separately from unit tests and
FFBE visual fidelity. Final executed counts/checkpoints belong in the handoff.

Commands:
```powershell
node --test tools/test_run_state.mjs tools/test_combat_regressions.mjs tools/test_dev_server.mjs
npm run build
node tools/check_dev_server.mjs --origin http://127.0.0.1:3001
```
The development freshness gate now covers18 modules including flow/menu/domain.
Existing frozen Cloud comparisons use the explicit source review page.
`tools/test-run-loop.html?captureOrigin=http://127.0.0.1:3157` drives real menu
buttons/Source and basic combat, waits for rewards and verifies evolution in the
next scene. It backs up/restores the previous local save. Retreat loss is labeled
separately from a naturally fought full-party wipe. No forced enemy HP/victory.

Next visible milestones after this slice: tune difficulty with real play sessions,
expand boss/encounter content, bring battle HUD into the common design system,
then enable a properly populated3-area profile. Audio decoding/cue binding remains
its own pipeline task; do not restart general skill research without user direction.

## Verified original forms available locally

Unit master series plus atlas/atk CSV existence are recorded, not inferred from
similar filenames. Additional7-star IDs do not imply a sequential awakening path.

| Identity | Current original unit | Same-series raw forms with atlas/atk | Newly prepared evolution |
|---|---|---|---|
| Cloud |207000105 /5-star |105(5),106(6),107(7),117(7), prefix207000 |207000106 /6-star |
| Aerith |207000405 /5-star |405(5),406(6),407(7), prefix207000 |None |
| Barret |207000205 /5-star |204(4),205(5),206(6), prefix207000 |None |
| Cloud of Darkness |203000803 /3-star |803(3),804(4),805(5),806(6), prefix203000 |None |
| Cloud AC |207001605 /5-star |605(5),606(6),607(7), prefix207001 |None |
| Delita |253000205 /5-star |205(5),206(6),207(7),227(7), prefix253000 |None |
| Jack |254000603 /3-star |603(3),604(4),605(5), prefix254000 |None |

## Executed acceptance evidence

- node-final.log:290 Node tests pass,0 skips. After adding catalog acceptance gates,
  catalog-tests.log:3 more pass; final-additions.log rechecks the combat harness
  (47 direct method assertions, including natural defeat) and those3 catalog tests.
- python-corrected.log:15 existing prepare/staging/pipeline-context tests pass.
  python-final.log retains the initial command failure: a nonexistent module
  was named. Corrected module: tools.memorial.test_pipeline_context.
- build-final.log: TypeScript and Vite pass. Existing large-chunk advisory remains.
- run-loop-browser.json: four actually fought encounters,11 Source actions,
  one-shot rewards, fixed roster, all3 rerolls on one slot, Cloud6 visible in
  encounters3/4, final victory, fresh restart and confirmed/cancelled retreat.
  No forced HP/victory. Natural party-wipe settlement is a method regression,
  not a newly recorded full natural browser wipe.
- cloud-baselines-browser.json: all3 frozen frames0 changed pixels; only the
  previously measured HUD exclusions are excluded. This protects accepted preview
  parity, not a new claim of native FFBE fidelity.
- preserved-source-baseline.json:240 prior raw hashes unchanged;202 scoped Git-tree
  units/presentations/effect files match, allowing normal text checkout line endings.
- guards-browser.json: unavailable-source, MP, victory/wave/shutdown gates pass.

Screenshots: slot-machine.png, reward-cards.png and actual run-*-capture.png in
that same evidence directory. Final skill/responsive receipts are listed in handoff.

Final browser acceptance: all15 distinct published skills pass full action or
reserve choreography/lifecycle checks (default-source,delita-source,jack-source,
cod-source,ac-source-browser.json). The responsive-ui.json receipt covers actual
375x812 iframe rendering of menu/reels/three reward cards; no horizontal overflow,
no storage mutation. This is shared UI presentation validation, separate from the
real four-encounter gameplay receipt. Desktop1280x720/898x1122 also inspected.

The original viewport capability did not change actual dimensions. The fixed-size
iframe provides measured real375px layout instead. An initial test-only import
used a different Vite timestamp and failed to find runFlow; the test now imports
the exact loaded entry script. No product fallback was added to mask the issue.

## Roguelike polish: canonical figures, live victory and shared HUD (2026-11-02)

Original unit-series `identity`, exact `unitId`/rarity, prepared visual `form` and
`canonicalIdentity` are separate fields. run-content.json explicitly maps reviewed
versions to canonicalCharacters, e.g. classic/AC Cloud -> ff7:cloud-strife. Cloud of
Darkness remains ff3:cloud-of-darkness. This is reviewed FFRogue content policy,
not a newly inferred FFBE engine field. Names/substrings/roles are never used to
merge or filter units. Unknown canonical mappings fail admission explicitly.

The six published unit versions represent five canonical figures. Initial draws
and all rerolls exclude occupied canonical figures. A reroll also excludes its
old figure; if there is no different valid choice, controls disable and the domain
refuses without consuming a reroll. Fewer than three figures disables Play with an
explanation. There is no healer/tank/damage quota, including for future variants.

Schema1 saves migrate canonical fields from reviewed unit metadata without RNG,
party, resource, form, reroll or reward changes. Invalid old Cloud+CloudAC parties
are rejected explicitly; original bytes remain until the player discards them.
No automatic replacement, refunded reroll or silent reset. New saves are schema2
under the existing key; older software must not write them.

Victory is a terminal BattleScene presentation, not a new scene:
1. Lock commands once; wait for character gameplay and outstanding impacts.
2. Persist resources and three offers once. Rendering is independent of this save.
3. Allow the actual Source VFX and enemy defeat fades to finish naturally.
4. All living actors play win_before and a complete first win cycle, using actual
   animation-complete and animation-repeat events. Win loops keep playing.
5. Present a transparent DOM reward dock below measured party bounds in the STILL
   ACTIVE BattleScene. Original arena/group remain visible; no global opaque blue.
6. Commit the selected reward once, stop the old scene, then enter the next scene.

A page reload during steps2-5 restores the same arena/party in the existing
BattleScene with no live enemies or combat actions, replays its celebration and
shows the SAME saved offers. It does not rerun damage, MP or offer generation.
Reload after selection resumes the next encounter with the selected improvement.
Replacement uses the same dock. Stale duplicate clicks are harmless. A final boss
still has its arena celebration/reward before the full run result.

RPG colors live in ui/designTokens.ts, installed as CSS variables and used directly
by Phaser. ui/rpgPanel.ts caches one2x128 gradient texture (1024RGBA bytes) for all
canvas panels. Existing commands, portraits, target selection, HP/MP, keyboard
bindings and formation stay intact. Blue panels/buttons, silver borders, selected
states, area/boss labels and actual buff/debuff readouts replace the green/brown
HUD colors. Status-only changes do not cancel HP chip tweens. This does not add a
second input/combat engine. Existing unused UI assets are retained, not purged.

The title crystal moves +/-4px over5.6s with ease-in-out and equal loop endpoints,
no rotation/layout timer. The element is removed outside the menu. Reduced-motion
CSS disables it; the OS preference was not changed during browser review.

## Polish validation and baseline boundary

Evidence: tools/data/roguelike-polish-20261102/.297 Node tests,50 direct combat
method checks,15 prepare/staging/context Python tests and TypeScript/Vite build
pass. Existing chunk-size advisory remains. The initial bad animation event was
caught by the actual browser timeout and then a regression test: Phaser only
emits generic animationrepeat with animation.key, not animationrepeat-<key>.
The corrected handler filters the actual key and unregisters on readiness/shutdown.

run-loop-browser.json records four actual fights,11 Source actions, two bosses,
full scene celebrations, rewards, Cloud6, win/restart/retreat. Existing Source
skills are rechecked separately by default/reserve receipts; reviewUnit filters
only the test corpus to avoid repeating unchanged Cloud actions in every party.
victory-reloads-browser.json records TWO ACTUAL page reloads, during celebration
and after selection. Offers/RNG/resources/upgrades survive without double rewards;
completed battle input is rejected and the dock is below measured party bounds.

Frozen original images are NOT regenerated. Strict comparisons report1000 changed
pixels: exactly the new header-frame row y48, across1000px. This intentional HUD
change is separate from effects. Baseline review retains strict metrics AND a
second comparison excluding measured header bounds; all three effect comparisons
then have0 changed pixels. No arbitrary effect mask, texture/pivot/timeline/color
change or native fidelity claim.240 prior Source asset/player/recipe hashes remain
exactly unchanged; run-content canonical metadata is intentionally updated.

Responsive review measures375x812 in an actual product iframe. Menu/reels/cards,
small canonical pools and real BattleScene hero selection/skill planning/clear
are checked without saving fixtures or doing damage. Its mobile reward rendering
is explicitly a presentation fixture, separate from real desktop victory tests.
Snapshots/receipts identify these scopes. The complete4-fight run was not repeated
for later UI-only border-box, status-cache and stale-click refinements; their
current code is covered by final Node/build/browser checks.

Next visible work: user review of victory pacing/dock density and the restyled
HUD. Do not add more skill research or content until this polish is reviewed.
The18-fight campaign, audio, additional bosses/forms and preload budgets remain
in the previous roadmap, outside this block.


## Centered rewards over the live arena (2026-11-02)

User rejected the prior lower reward dock. Its almost opaque rpg-shell gradient,
fixed --dock-top anchoring and the300px HUD exit tween caused the dark/empty strip.
The product now has a transparent shell over the actual BattleScene, an18% dim
limited to canvas bounds, and individual translucent blue/silver cards. The HUD
stays at y0, alpha.7, with its commands disabled and visible. Final HP/MP are
refreshed on restored victory and living rows show VICTORY, not SELECT.

rewardLayout.mjs is pure viewport/arena/party geometry. It prefers the arena
center and lifts the popup only to avoid covering actors; it never moves sprites,
changes camera or consumes RNG. Actual Phaser scale resize AND window resize
reposition it. The card entry reuses the previous500ms Back.easeOut character as
CSS cubic-bezier(.175,.885,.32,1.275),24px lift and .96->1 scale. A short title
fade precedes cards; no gameplay timers/delays were added. Reduced motion disables
these CSS animations. The complete existing effect/impact/victory-cycle barriers,
reward save/restore and one-shot selection remain unchanged.

All3 cards stay in a row, including375px. Short views use compact previews with
minimum12px description text. Details opens the COMPLETE existing gameplay copy,
with a44px Close button. Source values are not truncated or rewritten in data.
The wrapper has no permanent panel/black background; exceptional scrolling is
transparent and bounded to the viewport. Card details are presentation-only and
never commit a reward. No new UI/gameplay or renderer engine was introduced.

Evidence: tools/data/reward-overlay-20261102/ . before-dock.png is an actual won
fight at the old checkpoint; after-centered.png, after-375x667.png,
after-short-375x560.png and boss-special-reward.png show the new product. Real
Chrome/Playwright contexts are isolated, never the user's browser profile. The
previous in-app browser connector was unavailable; no emulator/native UI work.
Browser test:2 actual reloads, four fought encounters, boss awakening reward,
unchanged saved state during resize/details, real Details/Close, reduced-motion
emulation,3 on-screen buttons and0 covered party pixels in tested viewports.
300 Node tests (51 direct combat checks) and TypeScript/Vite build pass.240 prior
Source raw asset/player/recipe hashes remain exact. Python/parser and prior
frozen Source comparisons are reused because those components are unchanged;
no new FFBE reference or pixel-perfect research. Existing chunk advisory remains.

Reproduce with installed Chrome and the already installed Playwright library:
node tools/preview_original_skill.mjs --plan tools/data/braver-20261101/source/plan.json --port 3159 --game-origin http://127.0.0.1:3001
node tools/review_reward_popup.mjs --playwright PATH_TO_INSTALLED_PLAYWRIGHT --capture-origin http://127.0.0.1:3159
Current dev3001, freshness22 modules. The runner does not install packages or
modify user saves. It exits Chrome and restores QA-local save backups.

Next bounded content milestone: prepare/validate Aerith's original6-star207000406
within series207000405, using existing body-only importer, then verify awakening
and Seal Evil in battle before activation. No new skill or BMB research required.


## Prepared Aerith awakening (2026-11-02)

The existing general form pipeline now admits Aerith5-star207000405 ->6-star
207000406, master-confirmed original series207000405. Source identities/hashes:
tools/data/aerith-awakening-20261102/source-identity.json. Reviewed recipe:
tools/characters/aerith_form6.json. Prepare with the same documented body-only
importer command;13 validated clips are published under assets/forms/aerith_form6
and admitted through run-content.json's manifest hash. No custom actor/skill path.
Original dress is retained, with golden foot glow; raw atlas availability alone
was not treated as runtime support. It remains the same unit/canonical figure and
keeps its learned skills, ranks and portrait. The existing reviewed awakening HP
bonus is a roguelike rule, not a reconstructed FFBE growth formula.

Reproduce actual production QA on the fresh3001 server:
/tools/test-run-awakening.html?unit=aerith&form=aerith_form6&captureOrigin=http://127.0.0.1:3159
The check finds a suitable seed, fights normal+boss encounters without forcing
victory/HP, selects the real awakening reward, enters the next fight and executes
Seal Evil. It verifies the prepared body namespace, unchanged series/canonical
identity, one Source invocation,48 MP, statuses, return position and cleanup.
Actual browser.json and awakened-source-action.png are retained with the receipts.
300 Node,15 Python and build checks passed; frozen Cloud effect pixels unchanged.
15 Source skills remain. Personal review of the new form is still pending.


## Themed enemies and boss encounters (2026-11-02)

The default run is still four fights, not18. src/run/stageContent.mjs owns plain
reviewed enemy/stage definitions: original monster/dictionary/sprite IDs, prepared
keys, supported body attack profile, desired uniform scale, individual boss
patterns/HP phase, theme, arena, enemy pool/formations, normal count, difficulty,
reward-category metadata and empty future audio slots. New run area snapshots
include stageId. Old schema2 areas without that ID resolve by the existing arena;
validation does not rewrite the saved party/RNG/resources/offers. Unknown stages
or arena mismatches fail closed. Encounter composition is deterministic by wave/
slot and does not consume combat or presentation RNG. Saved in-battle reloads
still restart the encounter from its saved entry, not from a mid-turn snapshot.

Whisperwood: FFBE/Lapis wilderness adaptation, one Microchu, then Ochu2600HP.
Mako Reactor: reviewed FFVII theme, two Sweepers, then Guard Scorpion3800HP.
Normal HP950 /1378; enemy base attack rises140+25 per encounter. Reward upgrades
never feed enemy scaling. Source body identity/geometry is verified; exact native
stage formations/world joins and original AI/stats are not claimed. The common
boss reward pool is retained; reward-category tags are metadata for later pools.

TargetDummy remains the only enemy actor. Namespace/body/scale/attack parameters
now select prepared monster content. Boot/Preload already load registry monsters;
no new per-boss loader. Clip pivots and frame delays remain source-derived.
Uniform scale fits the complete idle/atk frame extents and the real Phaser
Back.Out spawn overshoot around the same formation anchor, with8px arena inset. This fixed the first browser finding: larger original
bosses otherwise crossed the left boundary. Original sheets are never cropped,
stretched or shifted to hide this. Accepted debug Dire Rat timing is unchanged.

Boss cursor: single attack -> harmless preparation -> warned party burst. Stop
holds the cursor, preserving preparation order. Below50%HP the declared phase
multiplies power1.2(Ochu)/1.25(Guard Scorpion). Living heroes receive one hit each
on a party impact, own defense applies; K.O. heroes are excluded. Movement modes,
impact frame1, pattern names/power/targeting are explicit FFRogue rules. Only the
original generic atk body is used; original named monster skills, lasers or
external VFX are inventoried but not published. A blue/silver boss HUD shows name,
HP, phase and next intent; a skippable short entry finishes before command unlock.
Victory continues through the unchanged effect/fade/celebration barriers and
floating cards. No new skill renderer or hero reconstruction.

Reproduce/inventory/publication: docs/enemy-import-workflow.md. Authored browser
acceptance: /tools/test-themed-stages.html?captureOrigin=http://127.0.0.1:3160 on
checked Vite3001. Evidence lives in tools/data/themed-stages-20261102. The full
expedition is naturally fought through both boss patterns/phases and actual
party impacts, takes Aerith's same-unit awakening and ends in victory. Additional
controlled low-HP defeat and live/reward reload evidence are separately classified
in the current handoff. Static arenas/SSBP/audio support limits are unchanged.

Next bounded content step: inventory and review a third complete static arena
and matching original enemy/boss body, then add one stage through this registry.
Do not enable FULL_AREAS' provisional third forest placeholder as a finished world.
Expand the existing normal count toward5 only after encounter diversity/balance
is tested. Animated SSBP layers/music remain separate later pipeline work.
