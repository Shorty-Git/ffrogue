# Renderer session handoff

## Current: FFBE style across all menus (2026-11-07)

src/ui/ffbeTheme.css brings the battle HUD's FFBE window frame, button plate,
silver titles and gauges to title, team draw, party, rewards, results, dialogs
and awakening; reviewed animations are untouched. The locked battle HUD now stays
under reward/replacement/awakening popups. See docs/battle-layout.md.

## Current: FFBE-styled battle HUD (2026-11-07)

UI milestone 2: the DOM CombatHud now uses original FFBE parts (window frame,
party-unit base, HP/MP gauges, enemy HP gauge, command icons) exported with
provenance by tools/export_battle_ui.py. Details, measured gauge tracks and open
items (per-skill icons, animated HP drain): docs/battle-layout.md.

## Current: target-first battle ribbon (2026-11-07)

UI milestone 1 from docs/vision.md: enemies are clickable at any time during
command selection; the current target carries a crystal cursor; Attack and
single-enemy skills commit with one click. Only single-ally skills still wait
for an ally choice. The hidden Phaser target marker, the unused battle UI image
preloads and `battleArenaKey` were removed. Contract and checks:
docs/battle-layout.md. Next: milestone 2, the visual redesign of dock, party
cards and enemy plates in the blue/silver direction.

## Current: debug battle path removed (2026-11-07)

BattleScene requires a run context and always uses the DOM CombatHud.
`?debug=battle`, `?hud=legacy`, the Phaser legacy HUD, debug waves, skill
paging, EnemyTargetPanel, BossEncounterPanel and the dead
tools/test-source-presentation.html are removed. The arena gallery and
/tools/test-source-scene.html run on `createTrainingRun`
(src/run/trainingRun.ts); details in docs/roguelike-foundation.md.
Checks executed: `npx tsc --noEmit`, production build, 60 Node test
scripts (59 pass; test_scene_migration still fails only on the pre-existing
Brave Slash manifest hash alarm), combat regressions 51/51 (5 tests for
removed debug/paging/panel code dropped, panel-input tests moved to the
ribbon paths). Complete Source review page run (default + cloud_of_darkness,
cloud_ac, delita, jack; 8 checks each) against the pre-cleanup baseline:
0 regressions, all 19 applicable checks pass, no page errors; the removed
`paging` check is the only one missing. Remaining FAILs are the
not-applicable checks also recorded in the baseline. Gallery start/reset
and title entry were smoke-checked in the browser; a full normal run was
not replayed. Reproduce with Vite on 3001, the receipt server on 3163 and
`node tools/data/cleanup-20261107/review_all.mjs <out.json>`; receipts are
under ignored tools/data/cleanup-20261107/.

## Current: Mako Reactor music

The area uses archived FFBE resource 400993, FF7R Guard Scorpion, as a
provisional FFRogue thematic selection. No original assignment to
background 120142 was established. Source bank, encoded asset, loop sample
points and the two comparison tracks are in `docs/background-import-workflow.md`.
The existing music manager primes the next buffer during area entry and
crossfades on reveal. Candidate excerpts and receipts are under ignored
`tools/data/reactor-music/`.
Production build, 15 targeted Node tests and the complete four-fight Chrome
review passed. An offline Chrome render started 100 ms before the Reactor
loop end and wrapped to the authored start with zero sample error in the
checked window.

## Current: classic Cloud Source audio

Brave Slash and Cross Slash bring the admitted effect-group sound count
to 12 of 15. Their prepared Motion 1 picture already uses the composed
clock. The publisher recovers reviewed missing audio groups and verifies
the visual clock fingerprint. Blade Beam and Climhazzard lack the
composed white slash in the published picture. Trigger Smash has no
verified cue for its current wrapper. Cue 81 belongs to the separate
unlocked follow-up. Exact evidence is in
`docs/research/source-combat-audio.md`.

Build, eight targeted Node tests (including the 56 combat regression
checks), five Python tests and the master/bank audit passed. Chrome
verified all 12 sound timelines with Whisperwood, Cross Slash early K.O.
and next-scene cleanup, and the frozen Cloud effect comparisons. Browser
audio captures use seeds `skill-sfx-20` and `skill-sfx-5` for Brave Slash
and Cross Slash respectively, under ignored `tools/data/combat-sfx/skill-review/`.

## Current: Crystal Encounter and selectable audio

Crystal is the default area entrance. `encounter=mosaic|vortex|fold`
selects an older visual treatment. The independent `encounterSound`
parameter accepts `arcane` (provisional default), `impact`, or `classic`.
All three cues are authored for FFRogue and use the existing effects bus.

The stereo rise begins with the cover. The Crystal impact uses the
renderer’s pulse maximum at progress .81, nominally 721 ms into the
gather. The separate reveal chord plays on the first reveal frame after
formation readiness, so loading cannot pull it ahead of the arena.
Escape fades active cue layers and prevents later ones. Reduced motion
uses the plain loading cover with no encounter cue.

The browser review and comparison recordings are under ignored
`tools/data/crystal-sound/`.
Build and 26 targeted Node tests passed, including the 56 combat checks.
Chrome verified both entrances with all three profiles, normal and muted
music, skip in each sound phase, reduced motion, double confirmation and
reload. The full four-fight music review passed with Crystal.

## Current: Crystal Encounter preview

`?encounter=crystal` selects the new optional prototype. Mosaic remains the
default. Vortex and Fold remain available. Crystal fades the real slot UI or
the outgoing arena in place, then draws a blue-silver crystal, perspective
orbits and inward light fragments on one Canvas 2D overlay. The next battle
boots once the cover is opaque. The rendered formation gate still owns the
incoming frame, which a soft radial opening reveals. The nominal animation
budget is 890 ms gather plus 620 ms reveal. Slow asset loading can extend
the covered interval. The FFRogue-authored cue peaks near the crystal
collapse. Scoped music starts on
reveal. Same-area cut and combat audio are unchanged.

Build and 26 targeted Node tests passed. `review_crystal_encounter.mjs`
recorded production browser frames and live audio for the expedition and
Reactor entrances and verified formation readiness, one Whisperwood loop,
double confirmation, Escape and reduced motion. The review assets are in
ignored `tools/data/crystal-encounter/`.

## Current: battle cursor profiles and outgoing-picture fold

Battle Audio now offers Felt (default FFRogue sound), Battle Decide and Ability
Select. The two FFBE comparisons use rate 1 with a 110–140 ms release window
for navigation. Attack, skill opening/selection, available skill pages, enemy
targeting and ally changes share the same battle-only event. Confirm, Back and
the main-menu cursor retain their prior samples.

The YouTube Gilgamesh clip `_XS2md1yWrM` was inspected with paused frame steps.
At 43 s the hall and characters are in dialogue. Around 46.31–46.48 s the
outgoing view pushes in and tilts. By 46.64 s scattered outlined squares
appear, around 46.81 s dark cells spread, and around 46.98–47.14 s the old
image shrinks to disconnected squares and points. Around 47.94 s the picture
is black. At 48.21 s the same hall reappears from the battle angle with
Gilgamesh and the party already visible, followed by boss-specific dialogue.
The clip does not establish the engine's capture mechanism or whether other
encounters share it. Reference audio timing was not measured.

`?encounter=fold` captures the live FFRogue UI with lazy html2canvas and
copies the live WebGL arena at postrender when one exists. The outgoing
image pushes in and fragments over 700 ms. A separate fixed visual hash
staggers tile contraction. The next BattleScene boots behind the snapshot
and reports a rendered, spawned formation. A 320 ms fade reveals that frame
with its HUD. A slow/unsupported snapshot falls back to the normal cover.
`?encounter=mosaic` (default pending comparison) and `?encounter=vortex`
retain their reveal treatments. Same-area advances use a brief cover/fade
without encounter audio. The music request keeps its existing run/area scope.

The checked Memorial System.acb (SHA-256
`d743912a1151a4e6f929f3f2e443bab32ad78485aa441facbda51c4db0818818`)
contains cue 42 `se_battle_decide_1` (stream 5), cue 86
`se_system_select_abirity` (stream 116), and cue 12
`se_field_encount_1` (stream 49). The fold starts cue 12 as fragmentation
begins; that synchronization is FFRogue presentation. Original banks and
the accepted combat audio remain untouched.

Decode with `vgmstream-cli.exe -i -s <stream> -o <wav> <System.acb>`
(r2168). Published WAV SHA-256 values are
`1fdb86b98ff626f8c3e0da463d5564595d794f4c1e7d096345af417e2d2591fd`
(decide), `c7788bcaeeb0e87bca138d8f4e3c4e5f36470ff584d8f19539aa20963652749e`
(ability), and `704b98d4546ab343a2c526af734d0359b094ce7d5d90c8ccbd14f8f364be8201`
(encounter).

Review drivers: `review_encounter_transition.mjs`, `review_battle_ui_audio.mjs`
with profile felt/decide/ability, and `review_battle_music.mjs --complete
--encounter fold`. Browser frames, GIF comparisons and navigation mixes are
under ignored `tools/data/encounter-fold/`.
Production build and 26 targeted Node tests passed, including the combat
script's 56 checks. Chrome passed the three cursor profiles, all ten Source
sound timelines, the three reveal variants, both area paths, skip before
capture/during fold/loading/reveal, reduced motion, reload and the full
four-fight Fold music run.

## Current: softer battle cursor and area entry previews

Battle commands used the original System cursor sample at rate 1 and zero
detune, with one source per selection. The bright tone is in the sample.
Battle selection uses the same PCM at rate .82 and 80% of its previous cue
gain, a FFRogue mix choice. The longer selection cooldown accounts for the
slower rate. Confirm, Back and menu cursor retain their settings.

Normal entry uses the mosaic preview. Use `?encounter=vortex` or
`?encounter=mosaic` on the game URL, then start a new expedition to compare.
The shared overlay covers the outgoing view before starting BattleScene
and waits for the new scene's first rendered frame before opening the mask.
It triggers on party confirmation and after a reward advances to another
area. Continuing a saved encounter does not replay entry. The Skip button
and Escape skip the reveal; reduced motion keeps only the loading cover.
The transition sound is FFRogue-authored and uses the existing effects bus.
Music stays run-scoped; the Reactor still has no assigned original track.

Run `node tools/review_battle_ui_audio.mjs <Playwright module path>` and
`node tools/review_encounter_transition.mjs <Playwright module path>`
against Vite 3001. Browser mix recordings, reveal frames and receipts
are in the ignored `tools/data/encounter-entry/` directory.
Build and 26 targeted Node tests passed, including the 56 combat checks
inside the regression script. Chrome passed both reveals, area change,
double confirmation, skip, reduced motion, reload and all ten reviewed
Source sound timelines.

## Current: reviewed effect-group audio for ten Source skills

Nine skills join Seal Evil. See [Source combat audio](research/source-combat-audio.md)
for all 15 original IDs, timelines, bank and stream evidence, admitted composition
limits and reproducible browser recordings. Vite 3001 serves the checked code.
The publication gate pins complete reviewed group records and decoded WAV hashes.
Standard attack rules are preserved pending original-to-condensed body mapping.
Reactor background 120142 still has no linked BGM in the checked master.
Build, 19 targeted Node tests including the 56 combat checks, five
Python composition tests and the 15-skill master/bank audit passed.
Chrome played all 15 Source commands. The three frozen Cloud effect
comparisons reported zero changed pixels in their comparison scope.
The ten recorded skill cases and the combat-audio expedition passed.
The complete four-fight music regression also passed, including the
single Whisperwood loop, Reactor fade, saved SFX settings and reload.

## Current: original combat cues and Seal Evil

Eight decoded cues are published from SE.acb and System.acb. The native
group dispatcher and the banks' CueTable/CueNameTable establish the numeric
IDs. See asset_structure.md for exact stream ordinals and source hashes.
Standard hero profiles use unanimous reviewed source attack cues, played
at the actual FFRogue impact. The original critical cue is separate.
Microchu uses native death selector 0, and Ochu, Sweeper and Guard Scorpion
use selector 1. Their sound starts at the guarded visual fade, with at
most one dissolve event per defeated actor.

Seal Evil is the first reviewed skill cue timeline. The original common
bank cues 600/100/100 play at composed Source frames 40/61/81, outside the
damage clock. GameAudio shares the effects bus, caches decoded PCM and
stops battle voices at scene shutdown. Existing music scopes remain.
The Mako music join, enemy attack cues, independent hit/hero K.O. cues
and condensed multi-cue hero profiles remain open.

Use seed `combat-audio-20` in the main menu to draw classic Cloud with
Cross Slash alongside Aerith. A basic attack and Seal Evil exercise both
audio paths. `tools/review_combat_sfx.mjs` exercises real commands with
controlled early-K.O. HP, boss victory and mute after the area transition.
Evidence is in `tools/data/combat-sfx/`.
The browser recorded `whisperwood-mix.webm` from the live Web Audio mix.
Cloud's first impact and damage share the same scene clock value.
The early multi-hit K.O. plays the normal dissolve once, the Ochu
fixture plays the special dissolve once, and transition stops the
remaining voice. Muted combat dispatches the expected event without
starting another audio source. The same browser fixture checks both
Sweeper dissolves, Guard Scorpion's dissolve and the melee strike cue.
The Source review passed across the default and reserve runs, including
the three frozen Cloud baselines. The complete four-encounter audio review,
18 Node tests (including 56 combat checks), Python bank/PCM/selector
checks and production build passed. Iai Strike's single SE cue 1 at F41
is the next bounded review candidate.

## Previous: roster-wide CGG body and preview layers

Shared body preparation emits hashed coverage and emission strips for
168 clips across 22 published bodies. Original body sheets, clip timing,
rectangles and pivots remain intact. Cloud 6★ `limit_atk/116` remains a
declared baked fallback. Zero-emission clips keep their ordinary path.
The same data feeds battle and DOM body previews. Slot tape portraits
remain icons. See character-import-workflow.md for exact parity limits.

The browser review tool is `tools/review_aura_views.mjs`. Capture pairs
for the four reference forms and the 21 run forms' slot/clip checks are
under `tools/data/aura-universal/`. Barret 5★ is prepared but remains
outside the run draw pool.

Desktop Chrome loaded all 21 draw-eligible forms, checked their stopped
reels and sampled admitted idle/move/attack/victory frames in BattleScene.
The four reference forms also used real Source commands after reload.
The Awakening fixture checked the layered target preview, skip, reload
during/after and reduced motion. The separate Source review executed all
15 commands and passed the three frozen effect comparisons with the
original baked body fixture. The current layered battle frame also
matched its independently rendered effect over the same body background.
Build, 21 targeted Node tests, the Python blend test and Aerith 7★
body-only import passed.

Native FFBE Trace captured the Home party (Cloud NV and Delita NV) and
the unit picker (classic Aerith and Cloud FFVII: AC). The picker confirms
the subtle Aerith foliage and saturated AC blue light, with the original
picker pedestal visible as separate UI. The browser montage and Cloud
idle GIF are in the artifact directory. Native and browser captures use
different cameras/backgrounds. Exact native pixel parity is unverified.

## Previous: published character aura inventory

All 22 published bodies, including non-run Barret, were checked against
their CGG, atlas and CGS. 169 of 282 clips reference visible mode-1 parts,
including idle on 14 bodies. Offline layered comparison plates cover
idle and action frames on dark and light backdrops. Preparation passed
for 21 bodies. Cloud 6★ fails the existing frame bounds check at
`limit_atk/116`. The report and plates are in `tools/data/aura-roster/`.
See character-import-workflow.md for the audit command and review
candidates. No runtime layer admissions changed in this audit.

## Previous: NV body emission, original command cues and rare reel polish

The flat ffbetool mode-1 path darkens RGB before the final alpha composite.
Cloud 207000117 and Delita 253000227 now have prepared normal and emissive
strips on 14 and 10 clips respectively. The optional shared WebGL path
draws emission after the synchronized body frame, with the same linear UV
insets, pivot and transform. See character-import-workflow.md for the probe,
reproduction and native parity limits. Other published body manifests
retain their previous path.

Combat command planning, targeting, confirmation, cancel and failure use
the archived System.acb UI cues via GameAudio. Original bindings wait for
their decoded buffer. Mixer defaults for new users are 18% music and 34%
effects, with existing stored preferences retained. The silver reel has a
short highlight, gold has a 140 ms 3 px housing accent, and NV has a 185 ms
7 px accent synchronized to the one highest-rank reveal cue. The position
returns to center. The existing opt-out and reduced-motion policy apply.

Artifacts are under `tools/data/aura-review/`. Reproduce the browser
checks with `review_start_forms.mjs --nv --finish-battle`,
`review_slot_audio.mjs`, `review_battle_ui_audio.mjs`, the full
`review_battle_music.mjs --complete` and the default Source baseline
case in `review_source_party.mjs`.

Build, 24 Node tests and the Python CGG compositing test passed. The
default Source case and all three frozen Cloud effect comparisons passed
with zero changed pixels in their effect scope. Browser NV runs exercised
Climhazzard, Cunning Hero's Sword, movement, attacks and Victory. Browser
command audio produced one decoded FFBE sample per tested command, with
a peak of 0.160 full scale in the sampled mix. The four-encounter audio
regression and ordinary, silver, gold, NV, skip, motion and mute fixtures
passed. The comparison GIF repeats the four prepared Cloud idle frames
beside a still Trace reference.

## Previous: FFBE menu cues and slot sound presentation

Verified cursor, OK, NO and bump streams from the archived FFBE System.acb
replace the synthesized default menu cues. Audio on the title offers original,
Crystal and Soft previews through the same effects bus, and a persistent NV
housing shake preference. See asset_structure.md for the stream indices and
source hash. Original music and the area lifecycle are unchanged.

The lever input reports movement independently from the existing draw commit.
The roller loop starts on CSS animation start and fades on the last actual
reel stop or cleanup. Each reel stop has a small pitch variation. The first
reel of the highest pulled rank gets a single added 7-star or NV sound.
NV can move only the machine housing by -3/+2 pixels for 92 ms. Reduced
motion and skipped reels suppress the corresponding animation cues.
Reward, preview and slot-specific cues are FFRogue synthesis and have no
connection to Source skill timing or RNG.

Use `tools/review_slot_audio.mjs`, `tools/review_slot_lever.mjs` and
`tools/review_battle_music.mjs --complete` against port 3001 with Chrome
and Playwright. Review artifacts are under `tools/data/ui-sound-review/`.
First-draw review seeds are `ui-sound-0` (ordinary), `ui-sound-5`
(7-star) and `ui-sound-26` (NV). Chrome measured three reel stops around
0.64, 0.99 and 1.39 seconds from roll audio start and a zero-pixel housing
center offset after each draw. The single dry NV cue peaks at about 0.35
before mixer gain. At default effects volume its contribution is about
0.071 full scale. This is a signal check. The title's comparison buttons
are available for listening in the music mix.

## Previous: continuous area audio and the original Home track

GameFlow, rather than BattleScene, now owns music. Whisperwood keeps the
same source across Victory, rewards, boss entry and Awakening. Unmapped
Reactor and result screens fade out. The original Home music (400003)
continues through the Slot Machine and returns with the title. See
background-import-workflow.md for the original Home native code reference,
bank/export hashes and sample-exact loop points.

The audio menu stores independent music/effects volume and mute. The
manager records position on visibility loss and page hide, then resumes
the saved context after browser initialization. Slot and command sounds
are authored FFRogue tones and use no gameplay RNG. Seal Evil's F40/F61/F81
events are known. The group-to-CRI cue mapping remains unpublished.

Reproduce with `tools/review_battle_music.mjs --complete` on port 3001
with Chrome and Playwright. The four-encounter test checks Web Audio source
identity through both Whisperwood victories, lever/reel events, the Mako
fade, expedition victory, retreat and reload position. The test persists
separate music and effects preferences. Results are under
`tools/data/audio-continuity/final/`. The build and the 23 targeted Node
tests passed. The offline inventory is reproducible with
`tools/audit_audio_inventory.py`.

## Previous: NV balance and first original battle music

The supported 5★/6★/7★/NV path now uses 65/23/9/3 in newly created runs.
The remaining paths and saved rules retain their existing weights. The
four-draw comparison used 12,000 identical seeds per policy. At least one
NV appeared in 145 previous runs and 1,298 new runs. At least one form above
its unit base appeared in 11,925 and 11,959 runs respectively. Roster and
start skill results matched across policies on each of the four draws.

Desktop Chrome verified both NV starts through a Source action, Victory,
a reward and a basic attack in the next encounter. Separate real Ochu
reward runs verified both 7★ → NV transitions and Source actions in the
next encounter. The combined Awakening run timed out on Delita and the
isolated Delita run passed. The original NV atlases and body filtering
remain the same as in the previous checkpoint.

Whisperwood uses FFBE resource 400005. The master joins it to the source
forest backgrounds and the bank provides the original loop markers.
The lazy music channel uses Phaser's audio context and has its own mute.
The browser confirmed a nonzero signal, exact loop parameters, mute,
retreat cleanup and no playback in the unmapped Reactor.
See background-import-workflow.md for the export and hashes.

EX progression, Brave Shift and NV+ stay outside this milestone. Source
sound tuples, hit and enemy cue associations remain separate review work.
Local artifacts are in tools/data/audio-vertical/.

## Current: original class-up graph and base Neo Vision bodies

The current gameplay graph uses direct original class-up edges and verified
same-series body manifests. It covers the star chains for all six playable
units and the NV base forms Cloud 207000117 and Delita 253000227.
Barret remains outside the Source roster. EX and Brave Shift require a
separate battle contract. See character-import-workflow.md.

Form draws use original rarity weights. The numeric 7 field on the two NV
rows is retained alongside the separate NV rank. Existing saves keep their
stored stats and prototype policy. New runs use the sequential class-up graph.
Linear sampling is confined to run hero body textures, with per-frame UV
insets and `bodyTextureFilter` in run-rules.json. The asset PNGs and Source
VFX remain unchanged.

Reproduce via `tools/inspect_original_forms.py`, `review_form_skills.mjs
--new-original-forms`, `review_start_forms.mjs --nv`, and
`review_awakening.mjs --nv`. Evidence lives in tools/data/original-awakening/.
The offline graph verified 15 published edges. Chrome verified 29 Source casts
on the 11 added bodies, both NV draws and reloads, and both real 7★ to NV
boss awakenings. All 15 existing Source commands and all three Cloud effect
comparisons passed. The body filter comparison changes only the selected hero
region in the matched Cloud and Delita frames.

## Previous: weighted original start forms

New team draws use the optional start-form policy from
`public/assets/run-rules.json`. Cloud and Aerith can start in their reviewed
5/6/7-star bodies. The other four admitted characters use their base form.
Team and skill seeds are unchanged by form draws. Saved units use the same
form key and HP fields as before, and an existing setup adopts the new policy
only if the player requests another draw. See character-import-workflow.md
for the weights, HP-only balancing and future Neo Vision admission rules.

Validation artifacts are in `tools/data/weighted-start-forms/`. The start
browser review draws all six Cloud and Aerith levels through the actual
lever and casts their assigned Source skills in the first fight. It also
reloads both level-three starts before casting. The existing all-Source
browser review and the frozen Cloud comparisons are in `source/`.
The 12,000 seeded team samples measured 79.73/17.31/2.96% across the two
three-level units. Chrome also passed three team rerolls, two real 6-to-7-star
boss awakenings, and a complete four-encounter run with reward reloads.

## Current: centered slot machine and front-mounted lever

Parent checkpoint `53176db`. Local ref `codex/centered-slot-lever`.
The housing is centered independently of its absolutely positioned lever. A
symmetric viewport allowance keeps the lever inside narrow layouts. The grip
travels vertically through the hub, with a foreshortened metal rod and a slight
increase in grip size. Pointer, keyboard, and skip use the existing draw path.

Chrome review passed at 900×1100, 1280×800, and 520×900. It checks housing and
reel alignment, lever clearance, the lower stop, spring return, six input modes,
three rerolls, exact saved state and RNG, and restoration after reload. Screenshots
and the receipt are in `tools/data/centered-slot-lever/`. Production build passed.

## CURRENT RESUME: crystal, slot lever and original 7-star forms (2026-11-02)

Parent55ed188b5665eaeed2d374bec3f03c344d8f5776. Current checkpoint/ref/archive:
tools/data/crystal-forms-lever-20261102/{checkpoint,preservation,validation}.json;
ref codex/crystal-forms-lever-20261102. Keep the predecessor archive chain.
Protected shared HEAD63977b0296d0bc5ef77911f60dcd3469e6db36c3; index SHA256
72fe85975697e59e357ef726de6bd0fbc4e19c838e5401668ccc81d85dbda6f9.
Many dirty/untracked paths are previous checkpoint work. Use an alternate index,
read-tree parent, explicit owned files, write-tree/commit-tree and a new ref.
No shared HEAD/index movement, reset/stash/add-all, foreign overwrite or push.

COMPLETED / CRYSTAL:
- The previous RunUI edit decoded UTF-8 with Windows-1252, then wrote mojibake as
  UTF-8. Git a64b45c/6552b60 has U+25C6;55ed188 contains three wrong code points.
  No missing SVG/asset/font/shader. Restored all affected punctuation, stars and
  arrows. The SAME title glyph now uses numeric entity &#x25C6;, with its original
  shape/layout/shadow. Explicit UTF-8 is mandatory on BOTH source reads/writes.
- Float +/-7px/6s, slow7s halo, three tiny5s glints: CSS transforms/opacity only.
  Reduced motion stops all three. Before/after title images and crystal-history.json
  retained; latest actual screenshot in lever-final/title-repaired.png.

COMPLETED / LEVER:
- SlotLever.ts is presentation-only: CSS chrome rod/red ball, native button.
  Click pulls190ms, drag follows pointer,86px bottom invokes existing spin ONCE.
  Partial/cancelled drags consume nothing; busy/existing party disables lever.
  Finished/detached WAAPI is cancelled to prevent stale fill masking later drags.
  Return300ms; Skip/reduced motion bypass presentation. Roster/RNG stays GameFlow's.
- Final review_slot_lever.mjs covers actual click plus duplicates, full drag,
  partial then full drag, keyboard, Skip and reduced motion. Each exact committed
  state/RNG equals pure rollParty;3 rerolls on one reel and actual reload match.
  Title glyph and all3 animation/reduced-motion states checked. lever-final/receipt.json.

COMPLETED / FORMS AND POLICY:
- Original unit AND unit_class_up prove same-unit5/6/7 chains:
  Cloud207000105->207000106->207000107;
  Aerith207000405->207000406->207000407. Aerith DOES have this7-star form.
  Cloud207000117 is another same-rarity class-up, NOT another star tier; it stays
  unreviewed/unpublished. No AC/Remake/other Aerith substitution.
- Reviewed form7 recipes prepare12/13 original tracks in separate namespaces.
  Staging manifest gains runtime assetKey; run-content records FINAL manifest SHA,
  not staging SHA. Catalog admits all common and published Source body phases.
  Unreferenced limit sheets stay on disk, not preloaded/enabled as new skills.
- catalog.forms holds admitted steps; evolution retains first normal step.
  unitForms resolves exact IDs/progression. Separate run-rules.json configures NEW
  short runs highest-reviewed5->7. Sequential5->6->7 remains available by config.
  Rules are saved per run; existing schema2/no-rule saves remain sequential.
  Existing6-star rewards/notices work; no migration. Unknown policy/forms rejected.
- Saved one-shot reward/notice contract retained, now admits6->7 too. HP gain is
  up to15% base per reward under3.2 ceiling; no revival or extra RNG. Brief2.4s
  blue/gold presentation adds clear star step/sparks and LOCAL soft finish glow.
  Original sprites/aura untouched. End/Skip acknowledge only; reload preserves
  committed IDs/HP/history and loads correct body, never repeats reward.
- Costumes/poses remain similar. Aligned first-idle5/7 differences: Cloud1,838,
  Aerith444 visible pixels over black/white (5/6:1,411/325). Counts do not prove a
  redesign. Review original-form-appearance and form-skills same-position browser
  pairs (identical stage frame90/camera/pivots). New aura/motes remain subtle.

ACTUALLY EXECUTED CHECKS:
-84 Node runner tests pass, including the file with56 direct combat assertions;
  plus5 writer/submission tests pass, retaining182 draw windows.11 Python tests:
  test_stage_animation, test_source_import_staging, test_source_prepare_profile.
  Explicit subset, NOT every historical research suite. TypeScript/Vite build
  passes; existing bundle-size warning remains.31 served modules match3001.
- All15 actual Source actions pass in source/. Three frozen Cloud EFFECT regions
  remain0 changed pixels. Strict frames retain the known1,000-pixel old HUD border
  difference separately. No baseline replaced.266 protected Source/5-6-form hashes
  unchanged. Reactor240 frames/30FPS/7,451 packets/three fog textures, registry,
  StageAnimation and future area recipes unchanged (git text CRLF normalized).
  All9 previous pose gates equal; two new form gates added. No skill/area added.
- Real Cloud AND Aerith two-battle5->7 boss reward reviews pass, with next-battle
  Source casts/exact207000107/407/form7 texture. awakening7/ real receipts.
  First full driver then hit QA-only missing tier closure variable in fixtures;
  corrected binding. Final independent7-star AND retained6-star fixtures PASS
  Skip/reload-during/reload-after/reduced-motion. These are controlled saved boss
  checkpoints, not additional fought bosses. Receipts awakening7-fixtures/ and
  sequential6-fixtures/. form-skills/ separately passes all5 Cloud+1 Aerith actual
  7-star Source casts using explicit <=3-skill loadouts/high-HP target fixtures:
  MP/hits/single player call/return-home/cleanup checked, no renderer errors.
- rewards/: complete four-fight run, both bosses, Cloud5->7, rewards/overlay,
  two actual reward reloads, reduced motion and result. No forced victory calls.
- defeat/: controlled1HP boss checkpoint, real basic commands and original attack
  body, actual party wipe, live/loss reload and clean restart all pass. It is an
  explicit low-HP fixture, not a naturally balanced additional played expedition.
- expedition/ broad boss-coverage attempt FAILED at Ochu party-burst assertion.
  Retained telemetry proves4 Seal Evil rounds, MP exhaustion, Ochu prepared at
  181HP, then died to next real basic attack BEFORE burst. No product change made
  to force coverage. Keep failure/log. Future harness needs a party/command plan
  that cannot kill before this coverage point; do not rerun identical conditions
  or claim telemetry fixed gameplay. Separate full-run/reward proofs passed.

REPRODUCTION / NEXT:
- Current Vite3001, receipt server3165,31 modules. Check_dev_server.mjs verifies
  served source; never use stale3000. Receipt server if needed:
  node tools/preview_original_skill.mjs --plan tools/data/braver-20261101/source/plan.json --port 3165 --game-origin http://127.0.0.1:3001
- Installed Playwright: C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright.
  Drivers use --playwright <path>, channel chrome/headless and isolated profiles.
  Python C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe;
  PYTHONUTF8=1; PYTHONPATH tools/data/memorial-audit/python-deps;tools;tools/memorial.
- Drivers review_slot_lever, review_form_skills, review_awakening --rarity7 (or6,
  optional --fixtures-only), review_source_party, review_reward_popup, all .mjs.
  Use fresh --output tools/data/<review>. Receipt-copy drivers run SEQUENTIALLY:
  all receipt servers share ONE file. Static authored pages export their game;
  do not dynamically re-import main.ts. Asset reproduction in character workflow.
- No incomplete product changes remain. User can visually review title, lever and
  7-star forms. Start a NEW run for highest-reviewed policy; old saves intentionally
  keep sequential progression. Future Dollet intake remains prepared only. No new
  world/fight/skill, audio work or engine reconstruction in this block.

## CURRENT RESUME: Awakening presentation, Aerith appearance and soft reactor cells (2026-11-02)

Parenta64b45c6638de9d62080beaebd10efbbda1f8b09. Current checkpoint/ref/archive
receipts: tools/data/awakening-polish-20261102/{checkpoint,preservation,validation}.json.
Protected shared HEAD63977b0296d0bc5ef77911f60dcd3469e6db36c3 and index SHA
72fe85975697e59e357ef726de6bd0fbc4e19c838e5401668ccc81d85dbda6f9 remain unchanged.
Use explicit owned paths + alternate index + commit-tree. No reset/stash/add-all,
shared HEAD/index movement, original deletion, foreign overwrite or remote push.
Still2 areas/4 fights,15 Source skills, same source-only engine and original assets.
Enemy/hero reconstruction remains paused; no new area, boss, skill or audio player.

COMPLETED / FORM TRUTH:
- Original Cloud207000105->207000106 and Aerith207000405->207000406 are same-series
  5->6-star forms. inspect_form_appearance.py checks DB unitSeries/rare and compares
  prepared idle pixels around foot pivots over black AND white, excluding invisible
  RGB. Aligned first-idle differences: Cloud1,411 pixels, Aerith325. Both differ;
  Aerith's main pose/costume remains very similar, with subtle detail/aura changes.
  No original sprite was edited/enlarged/replaced to manufacture a difference.
- No cache failure reproduced. Two real boss-awakening reviews each proceed to
  a real Source cast using cloud_form6_idle/207000106 and
  aerith_form6_idle/207000406. Final fixtures also verify correct form after reload.
  Earlier form switch was immediate and visually quiet; do not promise a dramatic
  Aerith costume redesign. Durable comparison: forms/original-form-appearance.png
  and .json, browser/{cloud,aerith}-real-battles.json and next-battle.png.

COMPLETED / SAVED AWAKENING:
- chooseReward commits the new original form and existing+15% base HP once, plus a
  validated optional pendingAwakening notice (from/to IDs/form/rarity, member and
  consumed encounter). Run schema remains2; old saves without a notice remain valid.
  Notice must match catalog/upgraded member/last original reward history. Gameplay
  settlement while pending is rejected, no hidden RNG consumption.
- RunUI reuses the active BattleScene/Victory arena and existing blue/silver panels.
  Generic blue/gold rings/sparks and foot-aligned original idle sprites crossfade
  over2.2s; name and star progression shown. This is FFRogue presentation, not an
  imported FFBE cutscene or claim of a redesigned costume. Original pixels unchanged.
- Original form images decode before presentation starts. Natural CSS animation-end
  or Skip acknowledges the notice exactly once and starts the next battle. Upgrade
  is already saved; Skip cannot cancel it. Reduced motion is minimal. Modal ARIA
  attributes clear on combat resume. Old Victory scene remains input-locked.
- Reload/Continue resumes AFTER the committed awakening, acknowledges pending
  presentation and loads the next encounter; no replay or second HP reward.
  Saved party/history/RNG are retained. Failures preserve the committed save.

COMPLETED / REACTOR SAMPLING:
- Original fog/fog2 cells80x40 have26/14 alpha levels and about14x source-space
  texel magnification;20x32 add_grad reaches50x. All previously used nearest.
- tools/stages/reactor-sampling.json explicitly reviews those THREE soft cells.
  prepare_stage_sampling.py copies exact original RGBA cell pixels with2px edge
  extrusion into isolated tiny textures. Only those use linear filtering; original
  hard atlas remains nearest. No blur/rescale/color/alpha edit, atlas bleed or
  global texture state change.3 PNGs4,386 bytes /33,024 RGBA8 estimated bytes.
- Native FFBE GPU sampler was NOT captured. This is a declared FFRogue display
  adaptation. All240 frames/30FPS,7,451 packets, cells, transformations, opacities,
  blends and order are byte-equivalent in parsed data to parenta64b45c. Hero/enemy/
  Source resources and samplers unchanged. sampling/ has matched paused BattleScene
  before/after frames30/90/150, same camera/actors/packets and original sampler.
- IMPORTANT reproduction now requires BOTH base preparation and sampling recipe;
  plain prepare_stage_animation.py alone intentionally exports unsampled packets.
  See current background-import-workflow.md. Five Python stage tests reproduce
  the final publication and verify exact cropped center/gutter/source atlas hashes.

FUTURE MAINLINE INTAKE / NO AREA PUBLISHED:
- inventory_stage_candidates.py checks1,286 original BG rows:1,262 exact image
  rows locally present,1,181 referenced animation rows. Disk1,351 JPG/1,266 SSBP.
  Counts are NOT unique/published mainline stages. FFI–XVI title records exist,
  but battle_bg has no original gameTitleId/world join. Never infer from numeric
  filename or monster dictionary's default100022 background.
-12 selected full animation profiles inspected, all actual atlases present:
  8 exportable backs,4 blocked. Only2013_06 needs deformation (1,440 records);
  2013_08/2013_16/2006_01 need independent instance clocks. This limited sample
  does not justify a broad forest/deformation research effort now.
- Reviewed future proposals in tools/stages/mainline-candidates.json:
  1) FFVIII Dollet120173/2016_03:600frames30FPS,3 light/neon instances, supported.
     Original image Nautilus shop/car + independent Dollet location reference;
     dictionary descriptions confirm Galbadia/Dollet body candidates G-Soldier
     2058610,Elite Soldier2058710,Elvoret2041910,Galbadia X-ATM0925060020.
     Do NOT use5060010 X-ATM092: original description identifies Zoldaad.
  2) FFVII Nibelheim/Shinra-manor candidate120144/2013_04:600frames30FPS,6 nested
     instances, supported back (master selects back only). Original descriptions
     locate Ghirofelgo2058210/Yin & Yang2058310/Lost Number3011510 in Nibelheim manor.
  3) FFVII Reactor05 /120141/2013_01:240frames30FPS/shared supported atlas; existing
     Sweeper/Guard Scorpion and prospective Air Buster4060910 body files.
- All listed PNG/CGG/idle/atk candidates exist/hash recorded, but new bodies have
  NOT been assembled/validated/published. Location labels are reviewed visual/theme
  proposals, not authenticated original encounter lists/world joins. Music unknown;
  existing32 sound references/8 tuples remain untouched.2006_01 factory origin is
  unresolved and not relabeled FFVI from appearance alone. No arbitrary music join.
- Best next visible milestone: prepare/review Dollet framing/floor and one original
  Galbadia enemy/boss body, then consider replacing Whisperwood while retaining
  four fights. Keep current forest until full area validation. No third world/18
  fights, no new hero/Hardshot research. Native enemy skills remain separate gates.

NEWLY EXECUTED CHECKS / HONEST LIMITS:
-82 Node runner tests (including the file with56 direct combat checks), plus16
  writer/draw tests: all pass.182 original draw windows retained.15 Python subset
  tests pass, including5 stage export/sampling tests. Build passes; existing large
  bundle warning remains. Not a rerun of every historic research test.
- All15 actual Source actions pass via review_source_party.mjs;3 Cloud frozen effect
  regions0 pixels changed. Strict frames retain known1000-pixel old HUD-border
  difference; no baseline image replaced.266 old Source/form files checked unchanged.
- Real Cloud AND Aerith awakening reviews each fight two encounters, choose actual
  boss reward and execute a Source skill in next battle with exact6-star texture/ID.
  browser/ also checks skip/reload-during/reload-after/reduced-motion via clearly
  labeled saved-boss-reward fixtures; final browser-final-fixtures/ repeats them
  after modal cleanup and proves no stale modal state. No duplicate HP/history.
- Full four-fight final expedition, both bosses' warning/burst/HP phases, Aerith
  awakening, Victory/rewards, actual low-HP defeat fixture and reload/restart pass
  in expedition-traced/. First expedition/ attempt missed party-burst coverage;
  no complete failure event trace existed to identify its cause retrospectively.
  Harness now retains action/impact/choice telemetry; instrumented full rerun passed.
  Do NOT claim telemetry fixed a gameplay bug or erase that failed receipt.
- rewards/ is a separate complete Cloud expedition with Cloud awakening, both boss
  rewards,2 actual reward reloads and existing short-view/reduced-motion checks.
- stage-runtime/ observes all240 frames/loop and actual light pixels, reload/save
  invariance, stage texture reuse (only2 new boss body requests), and intentionally
  missing Jack atk file blocking commands before state/resources change.
- Original source art/metadata/archives, audio tuples and paused research preserved.
  No mass cleanup/deletion or production enemy-skill publication occurred.

RESUME COMMANDS / SERVERS:
- Current Vite3001; receipt service3164,29 source modules. Always check served code:
  node tools/check_dev_server.mjs. If needed start:
  node tools/preview_original_skill.mjs --plan tools/data/braver-20261101/source/plan.json --port 3164 --game-origin http://127.0.0.1:3001
- Installed Playwright path:
  C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright;
  channel chrome/headless, isolated profiles, no personal save/profile interaction.
- Python executable:
  C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe;
  PYTHONPATH tools/data/memorial-audit/python-deps;tools;tools/memorial.
- Drivers review_awakening.mjs [--fixtures-only], review_stage_sampling.mjs,
  review_source_party.mjs, review_themed_expedition.mjs, review_reward_popup.mjs.
  Capture-origin3164; always use fresh output under tools/data. Source review uses
  reviewUnit for reserves to avoid32MB receipt cap. Do not run global receipt-copy
  drivers concurrently. Use static authored page exports, not dynamic main imports.
- No half-applied product changes pending. Resume with Dollet intake after user
  review of Awakening/fog; do not mistake candidate exportability for publication.

## CURRENT RESUME: demand-loaded bodies and animated Mako Reactor (2026-11-02)

Parent checkpoint226e904d3142275343c063f67cae32c9ac50cc89. This block retains
2 areas/4 fights,15 personally accepted Source skills, both awakenings, source-only
engine, action banners and fast pose-gated Victory. No new hero/BMB research.
Current checkpoint/ref/archive and full validation receipts are recorded under
tools/data/stage-loading-20261102/{checkpoint,preservation,validation}.json.
Shared HEAD63977b0296d0bc5ef77911f60dcd3469e6db36c3 and index SHA
72fe85975697e59e357ef726de6bd0fbc4e19c838e5401668ccc81d85dbda6f9 stay protected.
Use explicit owned paths + alternate index + commit-tree; never reset/stash/add-all,
move shared HEAD/index, delete original assets or push. Preserve existing work.

COMPLETED / LOADING:
- tools/measure_body_loading.mjs records three fresh isolated Chrome contexts per
  variant, cache disabled, same qa-themes-78 party: cold title, roll/skip, first
  battle, actual Source action, then explicit three encounter-entry fixtures.
- Original measured title1051ms,124 body PNG requests,465.37MiB actual-texture
  RGBA8 estimate. Demand-only421ms/7/8.66MiB; final with stage426ms/7/8.66MiB.
  First battle648->677ms, first skill1740->1735ms (no speed/timing edit). Final
  first battle15.67MiB, all four entry fixtures22.45MiB versus465.37MiB before.
  All values/JS heap/network samples: measurement-summary.json and before.json,
  after.json, after-with-stage.json. Read caveats in roguelike-foundation.md:
  estimates are NOT VRAM, JS heap is unforced-GC; old baseline ResourceTiming
  caps at250 after first battle. Its later total-byte values are lower bounds;
  title totals/texture/body counts remain valid. Tool now sets buffer5000.
- bodyAssets.mjs resolves namespace/path/requirements from prepared manifests,
  reviewed choreography and current party/form/enemy definitions. Title idles;
  BattleScene.preload admits all required combat sheets before create. No runtime
  source parsing, clip retiming, eviction or custom cache. Missing file blocks
  actor construction/commands before resources change. Existing textures reused.
  Unreferenced huge limit sheets remain preserved but unloaded/unregistered.

COMPLETED / ANIMATED STAGE:
- tools/ssbp_v1.py verified exact historical v1 structures and optional frame
  stream against official ssbpLib commit2a80bf76d9077275f301b89d604624eac420d168,
  not current v4. Both originals fully bounded: reactor14 cells/5 packs, forest28/
  3. tools/prepare_stage_animation.py exports clean original quads and atlas.
- Productive assets/stages/reactor: back/anime240 frames at30FPS,8-second repeat,
  7,451 visible packets, exact original shared atlas. Parent2-D transforms,
  signed position/10, anchors/explicit size, inherited opacity, UV flips,
  normal/add blends, frame-record order and nested instance clocks supported.
  Independent clocks/3-D/deformation/color shader/animated UV/other blends blocked.
- src/stages/StageAnimation.ts uses existing Phaser Rope quad pipeline behind
  actors, same cover crop and arena mask. Static JPG remains unchanged underneath.
  Master back/anime,0,216 placement matches eight original atlas/JPG regions;
  origin(480,728) on960x1024. Camera/crop/layer/continuous-repeat/reset policy is
  declared FFRogue presentation. Original authored movement is preserved, but
  native FFBE camera/filtering/instance visibility/pixel parity NOT certified.
- Original reactor SSBP SHA6a7f9dd42f9025499ea883918cff98a29ad4980ec07a8ee9df10507b860982e1;
  atlas SHAb0ced167581f14b651d4efefc5dd95a2d75fa27118d158dc8d4ab334a8ae12e0.
  Background workflow contains exact reproduction command/SDK links and limits.
- Actual browser observed all240 frames+wrap and39,251 changing pixels in a
  character/UI-free light ROI. Pause/shutdown lifetime and cached texture reuse
  are scene-owned, no gameplay RNG change. Reload restores the same encounter;
  decorative animation phase restarts. Forest remains static: its back/front
  have active vertex deformation, refused instead of omitted. No fake movement.

ENEMY DECISION / OPEN:
- Original enemy skills still0. Newly staged MONSTER_SKILL166960 Locked On Target
  has all5 dependencies, missing0, but wm_1001_libra is44 nodes:28 Null,8 Quad,
  7 Model,1 Particle. It is not a cheap single-quad alternative.
- Existing Ochu Dance12+10 nodes is the shorter no-type7 VFX path. Tail Laser28
  nodes still has unknown TYPE7 at13/24. Source files/staging remain preserved.
- Concrete instrumentation blocker: observer.js unitIdentity checks ONLY the
  player vtable; body_observer.watch requires playerClassMatched. Monster IDs
  cannot activate this hero observer. Next useful work: verify/fingerprint a
  monster identity/accessor/update/command path, then ONE Ochu Dance cast linking
  monsterSkillId/body CGS+frames/VFX root/recipient anchors. Do not remove the
  player safety filter, infer hero motion0, or collect broad GPU video instead.
- No new native capture, emulator change or original enemy publication occurred.
  Existing FFRogue patterns remain explicit adaptations. Audio32 references/8
  raw tuples preserved; no decoding/playback. No skill-count increase claimed.

NEWLY EXECUTED CHECKS:
-81 Node runner tests, including a file with56 direct combat checks;16 additional
  writer/draw tests pass, preserving182 draw windows and original packet rules.
  This is the relevant subset, NOT a newly repeated full earlier307-test suite.
-15 Python subset tests including5 new stage tests pass; production build passes
  with existing large-bundle warning. Freshness29 modules on3001.
- All15 Source skills executed in actual debug BattleScene; MP/events/home/Source
  finish/banners checked. Three frozen Cloud EFFECT regions0 changed pixels;
  strict frames still have the known1000-pixel old HUD-border difference. Original
  baseline PNGs were not replaced. Receipts source/{default,cloud_of_darkness,
  cloud_ac,delita,jack,cloud-baselines}.json. Reserve reviews use reviewUnit to
  stay below server32MB cap; initial aggregate Delita request failed that harness
  cap, scoped rerun passed. Initial stale test mocks were updated for textures.
- Full four-fight expedition passed twice (loading-only and final animated build),
  both bosses' warning/burst/HP phases, Aerith awakening, Source actions, Victory,
  rewards, actual low-HP defeat fixture/encounter+loss reload/restart. Final
  animated-browser/ contains real fight screenshots and receipts.
- Existing centered-reward QA passed a separate complete four-fight Cloud run,
  Cloud awakening,2 actual reward reloads, descriptions, normal/boss cards and
  existing short-view tests. rewards/ contains receipts; no new mobile design work.
- stage-runtime/ separately proves all240 frames/wrap, visible light change,
  saved encounter reload, only2 new body requests at reactor boss (atlas cached),
  and an intentionally aborted Jack atk PNG blocking battle with unchanged save.
- Bounded audit now449 hashes/37 groups/64 source modules. No asset/tool/archive
  deleted. New atlas duplicate is required productive provenance. Unused limit
  sheets remain in public/dist; browser residency optimization != smaller package.
  Source assets/recipes/plans/form hashes are checked again by validation.json.

SERVERS / REPRODUCTION:
- Current Vite3001. Current receipt service3163 (29 modules); earlier3161/3162
  were prior checkpoints. Always run node tools/check_dev_server.mjs first.
- Start receipt service if needed:
  node tools/preview_original_skill.mjs --plan tools/data/braver-20261101/source/plan.json --port 3163 --game-origin http://127.0.0.1:3001
- Installed Playwright: C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright;
  Chrome channel chrome/headless; use isolated profiles. Existing reviewed pages
  expect29 freshness modules. Do not dynamically import main from a polling
  context; use existing static-page exports/window.themedReviewGame.
- Python: C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe.
  PYTHONPATH tools/data/memorial-audit/python-deps;tools;tools/memorial.
- Drivers: measure_body_loading.mjs; review_stage_runtime.mjs;
  review_source_party.mjs [--only delita,jack]; review_themed_expedition.mjs;
  review_reward_popup.mjs. Capture-origin3163; output under ignored tools/data.

NEXT CONCRETE STEP:
The visible milestone is delivered: inspect the animated Mako Reactor in fights3/4.
Do not expand areas/run length or resume hero Hardshot. Next original-enemy work
should first implement the bounded, fingerprinted monster observer described above
and assess complete Ochu Dance render admission; otherwise keep current patterns.
Whisperwood requires full vertex-deformed quad export plus front-layer/nested
composition before publication. Bundle size and package duplication remain
separate measured future tasks, not permission for mass deletion. No pending
half-applied product changes; no unverified original enemy skill enabled.

## CURRENT RESUME: battle presentation and original-content intake (2026-11-02)

USER PRIORITY OVERRIDE: stay2 areas/4 fights. No third world/18-fight expansion,
no major hero reconstruction. Parentacab88a502e9c42f4d2b12b004b291756d19b661.
Entry comparison found no scoped changes. Local checkpoint/ref/archive receipts:
tools/data/battle-polish-20261102/{checkpoint,preservation,validation}.json;
ref codex/battle-presentation-20261102. Shared HEAD63977b0296d0bc5ef77911f60dcd3469e6db36c3
and index SHA72fe85975697e59e357ef726de6bd0fbc4e19c838e5401668ccc81d85dbda6f9
are protected. Alternate index + explicit files + commit-tree only; no reset,
stash/add-all/HEAD move/push. Preserve large pre-existing dirty/untracked work.

A / PRODUCT COMPLETE:
- One ActionBanner component, common committed combat-action event for hero
  basic/Source/heal/support and enemy attacks/preparation. Actor/ability IDs/names
  come from actual admission/actions, not parsing status strings. FIFO, sequence
  deduplication,85ms fade-in/480ms hold/120ms fade-out, reduced-motion path; no
  gameplay wait or RNG draw. Scene-owned, clears before celebration/shutdown.
  FFRogue enemy ability labels and boss-panel provenance prevent false originals.
- prepare_victory_poses.py compares exact prepared RGBA around original pivots.
  public/assets/victory-poses.json has9 hash-bound unit/form gates. A trailing
  win_before suffix already matching resting win poses releases rewards; otherwise
  full intro -> first win pose. Original sheets/delays/animation continuation stay
  unchanged. Unknown/mismatched metadata keeps conservative old full-cycle logic.
- Actual frame/start events drive ready flags, all living heroes participate.
  Already reached reviewed poses do not wait another cycle. On lethal Source in
  RUN mode, the acting hero now waits at rest for the common VFX/fade barrier
  instead of starting victory during its decorative tail. Debug behavior retained.
- Same Jack/Delita/Cloud QA run: about4.67s ->2.07s celebration-to-cards on comparable
  normal/boss encounters. Final4 fights each2.068s (rewards-reviewed receipt); see
  victory-comparison.json. Prepared Cloud gate2.067s/Aerith3.133s. No fixed victory
  timeout, speedup or native FFBE scheduler claim. Reward layout uses the equivalent
  resting win-frame bounds when an intro canvas still contains empty sword-swing
  space; actor geometry/pivot/position never changes. Existing centered overlay saved
  offers/one reward, both same-unit awakenings and15 Source skills preserved.

B/C / ORIGINAL ENEMY INTAKE, NOT PUBLICATION:
- inspect_enemy_skills.mjs joins exact monsterId -> monster_skill_set ->
  monster_skill, preserving raw target/range/process/motion/hits/effect groups and
  sound references. Four owners,11 original records,0 admitted original skills.
  Existing resolveEffects + CPK stager reused. stage_original_skill.py now accepts
  MONSTER_SKILL; no hero motion fallback or second enemy engine. Admission blocks
  until real executable body/anchor/render/gameplay contracts exist, even if
  someone manually toggles intake availability booleans.
- Guard406081000:166950 Tail Laser;166960 Locked On Target;166970 Focused Fire;
  166980 Scorpion Tail;166990 raises-tail;167130 lowers-tail.
  Ochu311001000:150200 Ochu Dance. Microchu111031000:195520 Guardian Ivy.
  Sweeper206131000:166920 Smoke Shot;166930 Double Barrel;166940 Machine Gun.
- Tail Laser original sp_20103_madoulaser.bmb(28 nodes) and all5 dependency files
  staged/hash-verified. Independent hard blocker: two unknown TYPE7 nodes13/24.
  Ochu Dance atk_blow3_orange.bmb(12 nodes)+eff_shockwave1_orange_S.bmb(10 nodes),
  all dependencies staged (resource receipts4/7). Their complete dynamic model/
  particle/control profiles, monster command/body dispatch and relative recipient
  anchors are not admitted. Raw resources exist; they are not ready original casts.
- Existing Vine Lash/Bramble Surge/Arm Cannon/Suppressive Burst are deliberate
  FFRogue names, not original aliases. None was renamed to claim an original skill.
  No new native/BlueStacks capture; a useful next original observation must pair
  monsterSkillId/body changes/VFX root/recipient anchors in one cast. Do not repeat
  broad GPU or isolated parameter research. See enemy-import-workflow.md.

D / STAGE RESOURCES, NO ANIMATED BACKGROUND PUBLISHED:
- inspect_stage_animation.py confirms both .ssbp files are SSPB v1, created by
  Ss5Converter v1.0.0. Readable atlas references ALL exist: forest0003_01_1.png and
  _2.png(1024x1024 each); reactor2013_02 references2013_01.png(514x974), not its
  transparent same-stem PNG. Their hashes/alpha/master rows are in the intake.
- Front/back and nested mako/light/fog names exist; original frames/FPS/part
  hierarchy/UV/blends/instance timing remain undecoded.0 productive animated
  stages; no invented scroll/glow. Old version1 layout must not be guessed from
  current SpriteStudio headers. Official reference linked in background workflow.
  Both accepted static arenas/camera/Source/Victory overlays remain unchanged.

E/F / BOUNDED CLEANUP AND AUDIO:
- audit_game_foundation.py --output .../architecture:60 source modules,447 selected
  file hashes,36 identical-content groups.249 public files41,170,989 disk bytes.
  All prepared PNGs estimate820.3MiB RGBA8 texels, NOT measured live GPU memory.
  One unused limit sheet39342px wide; eager body loading is a concrete performance
  follow-up. Do not delete sprites or assume every audited PNG is loaded in VRAM.
- Removed ONLY unused normalHpPerArea/chargedEvery/chargedMultiplier balance
  fields after reference search; current stage/pattern values unchanged. No manual
  original/asset/research/cache deletion. Old import_unit/find_clean_backgrounds
  retained as documented historical tools; export_unit shared by current imports;
  particleProgram.ts is still used by offline prepare_particle_program.mjs.
- Enemy group joins preserve32 sound-reference occurrences/eight distinct raw
  tuples (e.g.1:104:1, group5000450 at40). Not decoded cue/stream mappings. Existing
  8WAV/252ACB inventory and original banks preserved, no playback/codec work.
  Common action IDs, Source event clock and separate stage audio slots allow a
  future subscriber/mixer without coupling skill SFX to arena/music filenames.

ACTUAL VALIDATION:
- node-verified.log:307 Node tests pass,0 skipped; includes56 direct combat checks
  plus enemy intake/admission and hash-bound victory gates. build-verified.log:
  TypeScript/Vite PASS, existing chunk advisory. python.log:15 relevant prepare/
  staging/native-context tests PASS, not every historical Python suite.
- browser/themed-browser.json: actual4 fought encounters, both bosses/warnings/
  phases/party impacts, ordered hero/enemy notices, actor pose clocks, Aerith6 and
  final victory. ~3.135s for the Aerith party. This preceded only the later RUN-only
  lethal-Source rest-barrier correction; its last hits were basic actions.
- rewards-reviewed/: final code, actual4 encounters/11 Source actions, Cloud6,
  normal/boss rewards, two ACTUAL reloads (celebration/reward selection), unchanged
  saved gains, layouts/Details/reduced motion retained. All4 waits~2.068s.
- early-source-victory.json: FINAL run-only1HP enemy fixture, real lethal Blade
  Beam, Source alive at hit, fully ended before group celebration, observed2.068s
  vs expected2.06668s to cards. One action notice/MP. Clips continue behind cards.
  Before-common-celebration receipt documents earlier actor starting inside tail.
- source-{default,cod,ac,delita,jack}.json: all15 full Source commands pass, one
  notice each including9-hit/heal/status. Per-action actual banner frames retained;
  run-action-banner.png is actual production RUN Blade Beam in the early-KO fixture,
  not a mockup. These full Source cases use debug context, unchanged by final
  RUN-only rest-barrier branch; no need to replay identical cases.
- cloud-baselines-browser.json:3 frozen effect comparisons0 changed pixels;
  strict1000px known old HUD border/frame remains. No reference PNG replaced.
  source-preservation.json:239 prior Source files +27 form files unchanged; registry
  identical to acab88a. New public asset is prepared victory JSON only.
- Current Vite3001 verified26 modules (freshness-final). Receipt server3161 has
  current26-module gate;3160/3159/3158 have older cached lists. Review pages demand
  current ActionBanner/target/stage modules. Installed Chrome/Playwright isolated
  contexts only, no package installs or personal browser profile.
- Resolved harness issues retained in logs: a mixed damage+debuff was mistakenly
  chosen as a support-only test action; boolean Source-active compared with0.
  Both assertions/fixture selection corrected, not product workaround rules.

NEXT: keep2 areas/4 fights. Small safe architecture cycle: required-body-clip
preloading from admitted gameplay/choreography, retaining full original assets,
forms and debug research access; validate all15 Source clips/awakenings before
omitting oversized unused limit textures. Original-content next gates are measured
monster body/recipient dispatch and a verified SSPB-v1 decoder. No third area,
no blind type7 or Hardshot field campaign. All original research below is resumable.

## PREVIOUS RESUME: original-backed bosses and themed stages (2026-11-02)

Parent93f84d22907c5a9437bd4662a7a4f294a7453515 (Aerith), with b055272 overlay
retained. Entry comparison found NO changes in their scoped files. This milestone
uses ref codex/themed-bosses-20261102; exact commit/archive/readback receipts:
tools/data/themed-stages-20261102/{checkpoint,preservation,validation}.json.
Shared HEAD63977b0296d0bc5ef77911f60dcd3469e6db36c3/index SHA
72fe85975697e59e357ef726de6bd0fbc4e19c838e5401668ccc81d85dbda6f9 preserved.
Use alternate index/explicit files/commit-tree, never reset/stash/add-all/move HEAD
or push. Large prior dirty/untracked work is intentional and preserved.

COMPLETE PRODUCT:
- Same4-fight expedition, different original-backed lineups: Whisperwood forest
  Microchu1110310 -> Ochu3110010; Mako Reactor Sweeper2061310 pair -> Guard
  Scorpion4060810. Full original monster IDs are sprite/dictionaryID +00; master
  names/joins and selected original skill sets are archived. No substitute sprite.
- Existing ffbetool/export_unit/validator reused through reviewed tools/monsters
  recipes and tools/import_monster.py. Four atlases/CGG/CGS families: idle6(Microchu),12(Ochu),4(Sweeper),
  4(Guard), and2 atk frames each. All assembled frames visually reviewed. source.json records
  identities and source/prepared SHA256. No raw parser or per-boss loader in src.
- TargetDummy remains the one enemy actor. New prepared-key/scale/attack options,
  per-clip pivots, frame-derived hit/end, stationary/approach staging. Debug Dire
  Rat body/timing unchanged. Generic scale fit keeps the formation anchor and
  respects all clip extents PLUS the existing Back.Out spawn overshoot. Its peak
  is derived from Phaser's polynomial (s=1.70158), not a guessed extra scale.
- stageContent.mjs separates original IDs/assets from reviewed stage/AI rules.
  Explicit stageId in new runs; old forest/reactor areas resolve without changing
  saved bytes, party, RNG, resources or reward offers. Unknown/mismatch fails.
  Stable wave/slot pool selection adds no RNG draws. No save-version bump.
- Boss cursor: single hit, harmless charge warning, party burst. Stop holds cursor.
  Below50%HP: Wild Growth1.2x(Ochu), Reactor Overdrive1.25x(Guard). These action
  names/timing/power/targets, HP2600/3800, spawn/hit/KO fades and movement are
  FFRogue adaptations. Original named monster skills/AI/VFX are NOT published.
- Blue/silver boss name/HP/intent/phase panel, short skippable entry before command
  unlock. Existing fast player turns, Source tails/victory cycles, centered cards,
  common boss rewards and both original same-unit awakenings preserved.
- No new background conversion: both accepted hash-verified static images reused.
  Exact battle_bg rows/SSBP companion hashes inventoried. FFVII/Lapis themes and
  lineups are reviewed composition, not a proven native world-stage join. No SSBP
  animation, original music mapping, Tail Laser VFX or original Ochu Dance support.
  Future stage audio slots are empty; original skill/audio evidence preserved.

ACTUALLY EXECUTED / RECEIPTS:
- node-verified.log:304 Node tests PASS,0 skipped, including54 direct combat method
  checks (charge/burst/stop/per-hero defense/K.O., body timing/pivots, spawn bounds).
- python.log:15 relevant prepare/staging/native-context tests PASS (subset, not all
  historical suites). Four body publications each passed2-clip Pillow validation.
- build-verified.log: TypeScript/Vite PASS, existing chunk advisory. Freshness-final:
 25 served source modules match Vite3001. Current receipt server3160. Older3158/
 3159 gates have cached21/22-module lists; Source review now explicitly rejects
 receipt gates without the enemy/stage/BossPanel modules. No package install.
- themed-browser.json: real seeded4-fight expedition, both native bodies/arenas,
 actual warnings, low-HP phases and3-living-hero bursts, boss reward, Aerith6,
 next-area entry and final win. Observer callbacks are detached per encounter;
 event arrays do not accumulate later encounters. No forced HP/victory in this run.
- reward-regression/: separate naturally fought4 encounters/11 Source actions,
 two actual reloads, normal/boss cards and Cloud6;375x667/560, Details/reduced motion,
 no measured party overlap. This preceded only the later enemy spawn-fit refinement.
- source-{default,cod,ac,delita,jack}.json: all15 full Source actions/MP/events/home/
 cleanup PASS. This preceded only final new-profile spawn-fit refinement; no player
 definitions/assets/plans changed. Final frozen Cloud checks rerun after refinement:
 cloud-baselines-browser.json,0 effect pixels, strict1000px known prior HUD border
 per frame; original reference PNGs unchanged. No native pixel-fidelity claims.
- spawn-bounds-browser.json: final code sampled all4 bodies during the complete
 materialization bounce and command unlock; all within8px arena inset, proportional
 scale, final desktop entry screenshots +375x560 Guard Scorpion screenshot.
 These are production encounter-entry fixtures, NOT extra naturally played fights.
- defeat-fixture.json: final code, explicit encounter3/all-party1HP checkpoint,
 real basic commands, real Guard body, single and party impacts. Party burst
 excludes already-K.O. hero; actual game loss saves0HP. Two ACTUAL reloads (active
 boss entry, then loss), clean new-run clear. Controlled loss, not balance evidence.
- source-preservation.json:239 previous raw Source hashes exact; only the former
 240th file content.json intentionally appends4 monster keys, character/Source
 arrays unchanged.27 prior Cloud/Aerith prepared form files retained (PNG exact,
 JSON Git-normalized plus original raw form hashes). No original assets deleted.
- Earlier failed harness attempts are retained: stale/consecutive pause labels,
 empty reserve query, wrong Python module path, and dynamic-import game access.
 Browser clipping led to the general fit fix; Back.Out peak sampling refined it.
 Final validations use the named passing receipts, not those failed attempts.
 The final full run completed before a separate fixture helper error; only that
 helper was corrected/retested, avoiding another identical full4-fight replay.

REPRODUCE:
node tools/check_dev_server.mjs --origin http://127.0.0.1:3001
node tools/review_themed_expedition.mjs --playwright PLAYWRIGHT_MODULE_PATH --capture-origin http://127.0.0.1:3160
Targeted follow-ups: same driver --entries-only or --defeat-only.
Read docs/enemy-import-workflow.md for preparation/publication and explicit limits.
Use installed Chrome/isolated Playwright contexts; never a personal profile. No
BlueStacks/native capture was needed for this original-body/static-arena step.

NEXT SMALL PLAYABLE MILESTONE: review a third complete static arena and a matching
original normal/boss body, then register one short third stage through stageContent.
Only then expand normal-fight count/variety toward5 per area. FULL_AREAS' current
third forest entry is a placeholder, not an authenticated third theme. Original
SSBP layers/music remain future work; DO NOT restart Hardshot/Store or hero skill
reconstruction. All15 accepted Source skills, source-only engine, slots/canonical
identities/rewards/awakening, and historical research below remain the baseline.

## PREVIOUS RESUME: floating rewards and Aerith awakening (2026-11-02)

UI checkpoint b055272433d08e2b253a7b29f44f9ef744f33559 is preserved under
codex/centered-rewards-20261102. Archive receipt:
tools/data/reward-overlay-20261102/preservation.json (readback verified).
This follow-up parent is b055272; checkpoint/ref/archive receipts live in
tools/data/aerith-awakening-20261102/{checkpoint,preservation,validation}.json,
ref codex/aerith-awakening-20261102. Shared HEAD and index are still untouched;
use explicit alternate-index checkpoints, never reset/add-all/stash/push.

COMPLETE: centered floating rewards over the actual BattleScene, no opaque dock,
18% canvas dim, original500ms Back-style popup,3 columns at375px, full Details,
reduced motion and visible disabled HUD. Victory barriers and exactly-once saved
rewards unchanged. UI browser evidence: actual4 fights/2 reloads/2 bosses,0 measured
party overlap at900x1100,375x667,375x560. Before/after/short/boss PNGs in UI directory.

ADDITIONAL BOUNDED CONTENT: Aerith207000405(5-star)->207000406(6-star), SAME original
series207000405/canonical ff7:aerith-gainsborough. Existing body-only importer,
reviewed tools/characters/aerith_form6.json;13 validated animations including
limit_move. Published public/assets/forms/aerith_form6; manifest SHA256
3f44b979136ef215aafc6a13bcadb79c6157c2586901047cc253de434c14f945.
Existing generic form catalog/reward/actor assetKey handles it; no runtime hack,
new identity or new skill. Same pink dress with original golden foot glow, not a
new costume. Original master/raw hashes in source-identity.json. Own reviewed
roguelike awakening HP bonus remains separate from source data. Personal visual
acceptance of this new form is pending.

TESTS EXECUTED AFTER FORM: all300 Node tests pass (including51 direct combat
method checks),15 Python prepare/staging/context tests pass, TypeScript/Vite build
passes with existing chunk-size advisory. Actual browser2 fought encounters,
real Aerith awakening offer selected, next encounter uses aerith_form6_idle and
Seal Evil exactly once:48 MP, original identity retained, statuses and home/cleanup
checked. Browser receipt/captured source-action PNG in follow-up directory.
Frozen three Cloud checks rerun:0 effect pixels changed with measured game/header
overlays excluded. Strict full-frame differences retain the intentional earlier
HUD border difference; original reference images were not replaced. All240 prior
Source hashes rechecked unchanged.15 skills remain; no new native captures/BMB.

SERVERS: current Vite3001; receipt3159 verifies22 actual served modules.3158 has
an older cached21-module gate and should not be used for current checks. Browser
QA uses installed Chrome through Playwright in isolated contexts, never personal
profiles. No package installation. Actual reusable checks:
node tools/review_reward_popup.mjs --playwright PLAYWRIGHT_MODULE_PATH --capture-origin http://127.0.0.1:3159
/tools/test-run-awakening.html?unit=aerith&form=aerith_form6&captureOrigin=http://127.0.0.1:3159

NEXT SMALL PLAYABLE MILESTONE: give the two existing boss encounters verified
content identities/visible encounter information using current assets. Consult
asset_structure.md and handbook before inventory/import. Keep original resources,
15 accepted skills and paused Hardshot/Store/Motion8 evidence below. Full three
areas/18 fights, additional backgrounds/audio remain future work; do not resume
skill reconstruction as part of this UI/content step.

## PREVIOUS RESUME: centered reward popup (2026-11-02)

Parent6552b603dafaf2a8489018b529ea73e8d60b5125. No changes since its27 scoped files
at entry. User accepted prior menu/crystal/slots/technical victory, rejected dock.
Current checkpoint/ref/archive receipts: tools/data/reward-overlay-20261102/
{checkpoint,preservation,validation}.json, codex/centered-rewards-20261102.
Shared HEAD63977b0296d0bc5ef77911f60dcd3469e6db36c3/index SHA
72fe85975697e59e357ef726de6bd0fbc4e19c838e5401668ccc81d85dbda6f9 are protected.
Use alternate index/commit-tree with explicit paths; no HEAD/index reset or push.

COMPLETE: opaque lower dock removed, centered translucent cards/title pop over
18% canvas dim. UI lifts above measured party where needed. Real HUD remains in
place, visible and locked (including command surface), with restored HP/MP/status.
Original500ms Back-style popup reused in CSS.3 compact cards on375px, full copy in
Details; reduced motion supported. GameFlow/Scene scale resize updates positions.
Effect completion, original win clips, persistent offers and exactly-once rewards
are preserved. No Source assets/skills/actor animation rules modified.

TESTS:300 Node tests,51 direct combat method checks, TypeScript/Vite pass.
Browser: actual installed Chrome via Playwright, isolated contexts;4 real fights,
2 real reloads, normal+boss offers, special awakening, short375x560/667, Details,
reduced motion and untouched saves during presentation. All3 cards fit;0 measured
party overlap. Screenshots and browser-review.json in evidence directory.240 raw
Source hashes preserved. Prior Python and frozen Source results reused unchanged.
Current3001 freshly started (was not running at turn entry); receipt service3159
covers22 modules. Earlier3158 process has cached21-module gate. No package install.
Read docs/roguelike-foundation.md's centered-popup section for reproduction.

NEXT: bounded Aerith5->6-star form import via existing body importer. Master/raw
availability is already inventoried, but no runtime activation until prepared
clips and actual awakened Seal Evil are checked. Broader areas/bosses/audio later.
Skill reconstruction/BigShot/Hardshot/Store remains paused and preserved below.

## PREVIOUS RESUME: roguelike polish / live victory (2026-11-02)

Parent9d8fb335a7aa7f247142b66c9d4771a19c9e7f3e. No foreign changes found in its43
scoped files at entry. Research and all15 Source skills/assets/plans remain paused/
preserved; NO new skill import, native capture, asset cleanup or gameplay rebalance.
Current local checkpoint/archive receipts: tools/data/roguelike-polish-20261102/
{checkpoint,preservation,validation}.json. Ref codex/roguelike-polish-20261102.
Shared HEAD63977b0296d0bc5ef77911f60dcd3469e6db36c3/index SHA
72fe85975697e59e357ef726de6bd0fbc4e19c838e5401668ccc81d85dbda6f9 retained.
Use scoped alternate index/commit-tree; no reset/stash/add-all/HEAD move/push.

COMPLETE PRODUCT CHANGES:
- Title crystal: CSS-only +/-4px hover,5.6s ease-in-out, equal endpoints, no rotation.
  Reduced-motion rule disables it. Browser observed differing translation matrices;
  OS reduced-motion preference was NOT changed/emulated. No persistent JS timer.
- Explicit run-content canonicalCharacters + canonicalIdentity mappings. Classic/
  AC Cloud share ff7:cloud-strife; Cloud of Darkness is a different figure. Six
  eligible unit versions/five canonical figures. Unit-series identity, unitId,
  original rarity and visual form are retained. Unknown canonical mappings fail
  admission, names/roles are never filters. No healer/tank/damage composition rule.
- Initial draws/rerolls exclude occupied canonical families, including own old
  family for a useful reroll. No valid alternative => disabled/no cost/no RNG draw.
  Fewer than3 figures disables Play with explanation. Max3 shared rerolls unchanged.
- Save schema2 uses EXISTING ffrogue.run.v1 key. Valid schema1 saves gain reviewed
  canonical mappings without changes to party/RNG/resources/rerolls/rewards/forms.
  An old Cloud+CloudAC party is rejected; bytes retained until explicit discard.
  Never silently swap locked characters, reset rerolls or downgrade the schema.
- Victory state machine: lock input once -> gameplay/impact barrier -> persist
  resources/offers once -> wait natural Source tails + enemy fade -> play actual
  win_before and one full win cycle for each living unit -> rewards over live arena.
  UnitActor listens to generic animationrepeat and filters animation.key. The win
  loops continue behind cards. No350ms scene stop. First win cycle determines timing,
  not an arbitrary global delay. New scene stops only AFTER reward commit.
- Reload during saved victory restores SAME BattleScene/arena/final party, no
  enemies/actions/damage/MP; replays celebration and shows same saved offers.
  Reload after selection resumes next encounter once. Duplicate detached reward
  clicks ignored. Replacement uses same transparent dock below measured party.
- Shared designTokens.ts installs CSS palette and supplies Phaser colors;
  rpgPanel.ts caches one2x128 gradient texture. Existing HUD input/formation retained:
  navy/silver party/command/target panels, portraits, HP/MP, active selections,
  area/boss labeling, actual buff/debuff copy, skill descriptions. Status-only
  changes preserve ongoing HP-chip tween. Old textures retained, no cleanup.

ACTUAL VALIDATION / EVIDENCE:
- node-final.log:297 tests PASS,0 skips, incl50 direct combat method checks,
 1000 canonical-seed trials, small pools/all-healer-policy fixture, schema1 migration,
 duplicate reward callback, victory phases/events/shutdown and unchanged Source tests.
- python.log:15 prepare/staging/context tests PASS. These are a relevant subset,
  not a claim to rerun every historic Python/native suite. No new original trace.
- build-final.log: TypeScript/Vite PASS, existing chunk-size advisory remains.
- run-loop-browser.json: four genuinely fought encounters,11 Source actions,
 two bosses, Source/body/fade/celebration barriers, same-slot3 rerolls, real rewards,
 Cloud6 in next scenes, final win/new run/retreat. No forced HP/victory. Later
 border-box/status-cache/stale-click refinements were covered by targeted final
 tests/current browser cases; complete4-fight run was not needlessly repeated.
- victory-reloads-browser.json: two ACTUAL page reloads, during celebrating and
 after reward commit. Same offers/resources/RNG/upgrades; active arena and all
 living units in win loops; dock below measured group; completed battle rejects input.
- Final default/delita/jack/cod/ac Source and responsive receipts are required
 by validation.json. reviewUnit filters Source test cases only, not product content.
- cloud-baselines-browser.json preserves old original PNGs. Strict frames differ
 by exactly1000px at y48 (intentional header border). Second comparison excludes
 measured header bounds and has0 effect pixels changed for all3 Cloud frames.
 baseline-ui-difference.json records this classification. Do not claim entire old
 frame pixel identity or replace references to hide a HUD change.
- preserved-source-baseline.json: all240 prior asset/player/recipe raw hashes remain
 EXACT. Only run-content metadata intentionally changes. Source VFX geometry/colors/
 positions/timing and form graphics are untouched.
- Browser QA first found a wrong Phaser repeat event. browser-repeat-before-fix.txt
 retains timeout; actual-repeat-regression.log reproduces it; corrected event passes.
 This was an implementation error corrected before acceptance, not missing FFBE data.
- Current development server3001, served-module gate now21 modules including shared
 theme/target panel. New receipt service3158;3157 keeps prior18-module process.

REPRODUCTION / RESUME:
node --test tools/test_run_state.mjs tools/test_run_catalog.mjs tools/test_combat_regressions.mjs
npm run build
node tools/check_dev_server.mjs --origin http://127.0.0.1:3001
node tools/preview_original_skill.mjs --plan tools/data/braver-20261101/source/plan.json --port 3158 --game-origin http://127.0.0.1:3001
Open /tools/test-run-loop.html?captureOrigin=http://127.0.0.1:3158 (pause after first
victory for inspection). /tools/test-run-victory.html uses sessionStorage QA state
for two actual reloads; finish/cleanup restores prior local save. If interrupted,
resume that same tab. /tools/test-run-ui.html uses375x812 iframe/presentation fixtures
and does NOT save them. Source page /tools/test-source-scene.html accepts reserve,
reviewUnit and captureOrigin. Copy POST receipt after each run; sink overwrites it.
Normal root /, explicit debug ?debug=battle&reserve=... . No legacy engine.

NEXT VISIBLE STEP / LIMITS:
- User should review crystal subtlety, victory pacing, card dock/scrolling and
  HUD legibility. Long card descriptions scroll in the dock on short windows,
  preserving the group above. Do not cover the party just to fit every card.
- Battle saves BEFORE logical completion still use encounter-entry checkpoints;
  completed gameplay persists rewards before the visible celebration. No mid-turn
  suspend protocol or offline/cloud syncing was added.
- No natural full-party browser wipe replayed in this block; loss/cleanup method
  regressions and real retreat remain tested. OS reduced-motion condition unaltered.
-18-fight content, new bosses, further forms/audio and preload budget remain future
  work, not implemented here. Main/menu/Source-only architecture remains unchanged.
- Original research resume (BigShot/Hardshot, scoped Motion8, Store/Reraise etc.)
  follows below. Do not restart it or add new skill imports during this polish.

## PREVIOUS RESUME: playable roguelike vertical slice (2026-11-02)

SKILL RECONSTRUCTION IS PAUSED by user priority. Preserve15 productive Source
skills, no new skill import/BMB/Hardshot/Store research. Previous exact research
resume information follows below unchanged. Parent checkpoint d18fb3f6a2d3a7f79def3f1af5d21178c90be120,
also pinned codex/roguelike-baseline-20261101. New scoped checkpoint/archive receipts (archive readback and member hashes verified):
tools/data/roguelike-foundation-20261101/{checkpoint,preservation}.json; local ref
codex/roguelike-foundation-20261102. Do not confuse old shared HEAD with this ref.

Shared HEAD63977b0296d0bc5ef77911f60dcd3469e6db36c3/index SHA
72fe85975697e59e357ef726de6bd0fbc4e19c838e5401668ccc81d85dbda6f9 remain protected.
Original worktree had257 dirty/untracked entries. Use alternate index/read-tree/
commit-tree with an explicit owned file list; no reset/stash/add-all/HEAD move/push.

IMPLEMENTED IN THE REAL GAME:
- Normal root opens a blue/silver title and seeded3-reel party draw. Mouse/touch,
  staggered stops, original sprites/portraits, skip,3 shared individual rerolls,
  fixed3 identities, one own Source skill each. Only6 supported identities eligible;
  Barret retained/excluded until a real Source skill exists. No new gacha economy.
- Pure runState/runBalance, admitted catalog, GameFlow adapter and shared RunUI/CSS.
  No second renderer or battle engine. Existing BattleScene handles run context and
  all old Source contracts; debug retains its previous deterministic test contracts.
- Local save ffrogue.run.v1 commits outcomes before visual reels; fixed results,
  RNG streams, skills, forms, resources, offers/choices. Stale tabs fail closed.
  Battle saves resume at ENCOUNTER ENTRY, not mid-turn; title warns explicitly.
  Saved rewards do not reroll. Invalid saves require explicit discard. No cloud sync.
- Two prototype areas (forest/reactor), each1normal+1boss =4 encounters. Same prepared
  Dire Rat sprites; Riftfang Alpha is reviewed roguelike balance, not an imported
  FFBE boss. Charged attack every second round; scaling uses stage, not reward gain.
- Three seeded reward cards: learn an own supported skill, improve rank, stat gain,
  living-party recovery, boss awakening where prepared. Max3 active slots, explicit
  replacement dialog. Changes apply to cloned run definitions; original metadata/
  Source plans are unchanged. Actual gameplay descriptions and party/skill panel.
- Classic Cloud5-star207000105->6-star207000106 prepared through existing body importer,
  all12 clips validated. Separate assetKey avoids overwriting accepted base sprites;
  source identity/skills remain Cloud. Available as boss reward, used next battle.
- Clean victory/rewards/next battle/final victory/new run and defeat/retreat paths.
  Action/impact barrier waits for gameplay, then stops decorative renderer at scene
  transition; no double MP/damage and no leaked previous-scene VFX.
- Current normal URL http://127.0.0.1:3001/ . Explicit debug
  http://127.0.0.1:3001/?debug=battle&reserve=jack ; reserve alone opens title.
  /tools/test-source-*.html remains an explicit review entry, no legacy renderer.

AUDIT / PRESERVATION:
- tools/audit_game_foundation.py:52 src files,378 hashed inputs,23 equal-hash groups.
  Initial receipt45/364/23 retained. Scope public/static DB/audio/recipe raw sprites
  and CSVs; other raw tree only enumerated by extension. Not entire CPK integrity.
- No files deleted. particleProgram.ts unreachable from main but required by
  offline prepare_particle_program.mjs/research. Existing large BattleScene and
  debug reward/HUD aliases identified, not rewritten. No new packages.
- Seven original identity/form inventories in unit-forms.json. Raw atlases/atk for
  higher forms are availability only. OnlyCloud6 published as a run evolution.
- preserved-source-baseline.json:240 exact prior raw hashes retained,202 scoped
  Git-tree units/presentations/effect files retained (normal text checkout line
  endings explicitly distinguished from raw hash identity).15 skill JSONs/plans
  unchanged. Existing verified archive chain remains required.

ACTUALLY EXECUTED:
- node-final.log:290 tests pass,0 skips. Catalog later adds3 independent admission/
  same-unit-form/choreography checks. final-additions.log reruns those plus combat
  (47 direct method checks incl natural all-dead loss). No repeated broad run.
- python-corrected.log:15 prepare/staging/pipeline-context tests pass. Initial
  python-final.log failed because test_asset_pipeline_context does not exist;
  corrected exact module tools.memorial.test_pipeline_context. Error retained.
- build-final.log: TypeScript+Vite pass; existing large-chunk advisory remains.
- run-loop-browser.json: REAL production UI +4 fought encounters,11 Source actions,
 3 rerolls on same slot, fixed party, real rewards/stats, Cloud6 in encounters3/4,
  final win/restart/cancelled+confirmed retreat. No forced enemyHP/victory. A natural
  browser full-party wipe was NOT replayed; defeat adapter is covered numerically.
- Manual slot reload retained characters and2 remaining rerolls. Automated harness
  validates reconstructed RunStore and restores prior local save after QA.
- cloud-baselines-browser.json:3 frozen Cloud comparisons,0 changed pixels.
  guards-browser.json: unavailable/MP/victory/wave/shutdown checks pass.
- All15 distinct published Source skills re-executed successfully across default,
  Delita, Jack, CoD and CloudAC browser receipts; complete Source tails checked.
- Shared menu/reels/rewards at375x812 pass without horizontal overflow in an
  actual iframe of the product. Presentation fixtures do not alter the saved run.
  Desktop menus also inspected at1280x720 and898x1122. Browser viewport override
  did not change actual dimensions, so no mobile result is claimed from that call.
  The iframe test originally imported the wrong Vite module timestamp; corrected
  to the exact loaded script before passing.
- Final per-party skill and responsive UI receipts are listed in validation.json
  in this same evidence folder. Freshness gate now covers18 served modules on3001.
- Source skill baseline protection is preview parity; no new FFBE pixel claim.

REPRODUCTION:
node --test tools/test_run_state.mjs tools/test_run_catalog.mjs tools/test_combat_regressions.mjs
npm run build
node tools/check_dev_server.mjs --origin http://127.0.0.1:3001
node tools/preview_original_skill.mjs --plan tools/data/braver-20261101/source/plan.json --port 3157 --game-origin http://127.0.0.1:3001
Open http://127.0.0.1:3001/tools/test-run-loop.html?captureOrigin=http://127.0.0.1:3157
and Review complete prototype. It pauses after first victory for card inspection;
Continue review finishes all four fights. Normal /tools/test-source-scene.html
with captureOrigin3157 checks existing actions and frozen frames; reserve selects
Delita/Jack/CoD/CloudAC. POST receipt is overwritten; copy after each completed case.

KNOWN LIMITS / NEXT VISIBLE STEP:
- First ask user to play the new four-fight expedition and assess pacing/UI/balance.
  Do not restart skill research. Next engineering slice: battle HUD into shared
  design system, broader encounters/distinct bosses and actual balance sessions.
- FULL_AREAS encodes3x(5normal+boss)=18 but is not the populated production profile.
  Third theme/enemy/boss diversity, original music/SFX, animated layers, broader
  passive rewards and other verified form evolutions remain future content.
- All original registered sheets preload before title. Defer body/VFX loading
  and texture-budget optimization in a bounded follow-up. Existing build bundle
  advisory unchanged. No claim that all architecture/asset debt is removed.
- Saves are local/version1; current encounter replays from entry on reload; no
  midcombat suspend. No active run migrations/cloud/account/tamper protection.
- Originalforms DB7-star variants do not prove an allowed awakening graph. Additional
  metadata/render/gameplay validation required before adding each form.
- No completed work or source files are pending a risky cleanup. New files listed
  in checkpoint-files.json; exact checkpoint/archive hashes in local receipts.

## PREVIOUS RESEARCH RESUME: exact Barret release paths;15 skills preserved (2026-11-01)

Parent fadd8bb1392f2309620fe9aa86c0edba333e3fce. User explicitly accepted Iai Strike
visually. No new skill or renderer change in this block. Do not claim Barret has
a Source skill. Current checkpoint/archive receipts under
tools/data/barret-path-20261101/{checkpoint,preservation}.json.
Shared HEAD63977b0296d0bc5ef77911f60dcd3469e6db36c3 and index SHA
72fe85975697e59e357ef726de6bd0fbc4e19c838e5401668ccc81d85dbda6f9 preserved.
Use alternate index/read-tree/commit-tree; no reset/stash/add-all/HEAD move/push.

COMPLETED / ACTUAL TOOLING IMPROVEMENTS:
- form-learning.mjs reports ordinary maximum-native-level acquisition at exact
 master rarity/maxLv: current-form/later-form/conditional/unknown. Missing/NV/
 unlock requirements fail closed, with alternative ordinary paths retained.
- plan_source_imports --current-form requires published body/recipe identity;
 selects current-form ordinary skills only, rejects explicit wrong-form requests
 and refuses census-only shortlists. Existing reviewed cross-rarity host skills
 are NOT unimported. Inventory keeps full series list plus separate formLearning.
- unresolvedEffectAnchors in the shared importer reports unknown spatial dispatch
 independently in planner/inventory. Mindblow's mode6 is an explicit gate, not
 a target/caster fallback. No new mode6 renderer or gameplay behavior added.
- Existing Iai import left Jack character.json recipeSha256 provenance outside
 the prior scoped checkpoint. Current value matches the unchanged reviewed recipe;
 ONLY that field differs. Preserve as found and checkpoint this verified prior
 own spillover; do not restore stale provenance or treat it as a new body change.

BARRET / FULL DECISION:
- Actual runtime/recipe207000205 = classic5-star Barret, series207000204,maxLv80.
 Four ordinary active commands: Big Shot227870,Mindblow227871,Grenade Bomb227872,
 Hammerblow227873. Speed Drink227876,Satellite Beam227874,Ungarmax227875 are
6-star207000206 acquisition, not current-form alternatives. Catastrophe207000205
 is current LB but no LB command/gauge profile exists. Remake/Avalanche series
 separate. Do not infer equipment/quest/account/conditional loadouts.
- Big Shot still shortest DOCUMENTED complete Barret path, not a one-step release:
 explosion/anchor and scoped Motion8 body measured; Hardshot38nodes (19Null,
1Quad,10Model,8Particle) needs complete parent/matrix, generation/compatibility,
 material/tint/control semantics and validated output. General nonflat/uniform
 Quad admission, bounded Motion8 contract admission and whole-battle proof follow.
 No arbitrary next field series, omitted Hardshot or substitute animation.
- Mindblow has only12 nodes lacking matching authoring, but ALSO movement anchor6,
 mixed caster/enemy placement, MP drain/restoration, uniform-nonflat Quad admission
 and exact phases. Thus not easier overall. Source SPR debuff can use reviewed
 weakness, but MP drain is not ordinary HP damage. Grenade adds unknown type7;
 Hammerblow adds unknown type4,genuinely varying corner color and Motion5/move6.
- All19 staged BMB originals/resources across seven series abilities hash-checked.
 Five bounded alternative-project comparisons rejected by node count. Missing
 authoring means unproven semantics, not absent raw resources.205/206 idle/standby/
 atk CGS files byte-identical; this does not prove every command phase/clip hold.
- Full row-by-row table and minimal prerequisite chains are current
 ROSTER_SKILL_COVERAGE.md; artifacts barret-resources.json,effect-path-audit.json,
 bounded-authoring-search.json,classic-body-forms.json,coverage/inventory.json.

STORE / BOUNDED ALTERNATIVE, NO PUBLICATION:
- Exact source/project confirms Quad4/6/9 flat=false yet Constant all-white RGBA
 and zero ranges at all corners. No authored visible gradient is missing. Current
 flat-only gate still rejects; don't secretly flip flags/use distortion RGBA.
- Billboard Model11/12/13 inherits X tilt25deg and nonuniform scale75/1/1. Existing
 ordinary model path doesn't reproduce verified facing semantics. Priorities:
 model11 .5,model12/13 .2,prioritySort=true,wholeZSort=false. Known native sorter
 is packet-branch-only; common model integration remains. No full release after
 merely admitting white colors. Native body/self-placement and charge gameplay
 draft remain preserved; draft inactive. No guarantee of another freed skill.
- NEXT CONCRETE USEFUL STEP if proceeding with fallback: bounded pinned native
 Model Billboard writer/reference using actual tilted/nonuniform parent and view
 basis, alongside identity/uniform controls. Capture positions/RGBA, not another
 generic video. Then integrate proven facing + native priority + explicit neutral
 Quad profile + archived charge events and test whole action. First identify
 exact Model Billboard dispatch/inputs; existing particle/Null facing tests do
 NOT establish it. Do not launch a broader renderer reconstruction campaign.
- Main-party priority remains; if returning to Barret, target a COMPLETE Hardshot
 semantic plan, not isolated selectors. Aerith Reraise/MAGIC/negative-time/single-
 ally/revive and node7 gates remain independent. Audio/environment work deferred.

TESTS / WHAT WAS AND WAS NOT RUN:
- node-final.log:11 targeted Node tests PASS (five new form/anchor tests plus six
 importer/source metadata/composition regressions). Original real DB used across
 Barret4/5/6, Aerith,Delita,Jack; explicit6-star and Remake236220 requests reject.
 Current roster inventory:7 characters,87 active SERIES entries,15 published,
0 certified fully importable unpublished. Selection and resource presence are NOT
 choreography/render/gameplay approval.
-10 served modules match3001 (freshness.json). ADB reachable at127.0.0.1:5575;
 FFBE process inactive at inspection. No restart/install/data mutation or new
 native recording; existing measurements sufficient to establish these gates.
- No productive code/animation/definition changed. Reuse prior82 Node/15 Python/
36-module build and battle/frozen-frame results from full-import-path-20261101;
 not newly executed and NOT the entire historical suite. Previous three frozen
 Cloud crops were0changed pixels; this block makes no new pixel comparison.
- preservation-check.json checks src/public/recipes against parent, except the
 verified prior Jack provenance spillover. Original plans/materials/colors/anchors,
 game rules and all15 definitions remain unchanged. No new skill to personally
 inspect; existing Iai acceptance recorded. Preserve latest Delita feedback.

REPRODUCE:
node tools/plan_source_imports.mjs --select barret:* --current-form --output tools/data/barret-path-20261101/form-selection
node tools/inventory_roster_skills.mjs --control-audit tools/data/control-groups-20261101/control-comparison.json --output tools/data/barret-path-20261101/coverage
node --test tools/test_form_learning.mjs tools/test_source_import_profiles.mjs tools/test_import_wave.mjs tools/test_source_command_metadata.mjs
Use3001 after module freshness check. Native body observer36-r2/install/rollback/
navigation details remain in previous section below; no new APK built. Preserve
the existing archive chain. This checkpoint carries only own tooling/docs and
verified previous Iai provenance, never shared index or unrelated changes.

---

Earlier revision notes (historical; current resume above takes precedence):

## CURRENT RESUME: measured body phases;15 Source skills (2026-11-01)

Parent ff9fdb066dc2b05e947c544f93272e13b514f1c7. New checkpoint/ref and checked
archive receipts: tools/data/full-import-path-20261101/{checkpoint,preservation}.json.
Shared HEAD63977b0296d0bc5ef77911f60dcd3469e6db36c3 and index SHA
72fe85975697e59e357ef726de6bd0fbc4e19c838e5401668ccc81d85dbda6f9 MUST stay
intact.253 pre-existing status entries preserved. Never reset/checkout/stash,
add-all, move HEAD or push. Use the existing alternate-index/commit-tree pattern.

COMPLETED / PRODUCTIVE:
-15 commands: previous14 definitions/plans unchanged, plus Jack Iai Strike200300
 on an existing reserve. Roster unchanged. Personal Iai visual acceptance pending.
 Sword colors/Delita anchors and their pending latest personal recheck preserved.
- Iai source explicitly says ALL ENEMIES, instant KO OR partial unmitigated damage.
 Current process112/1400,70,100,0 retained.30% chance,700 fallback and boss immunity
 are reviewed FFRogue balance, NOT the decoded native formula. MP12/sourceF45;
 complete3-node effect/startF41/scale250/target-side/+80 retained.
- Optional commandPose separates prepared UI pose/readiness/body. Iai uses standby,
 no extra readiness cycle, magic_atk atF0 and Jack's own exported body clock.
 Native Motion2 dispatch plus independent Store measurement supports the selector;
 no standard-attack fallback or use of Delita's duration for Jack.
- Shared execute-or-damage events use existing Source clock/target lock/cleanup.
 Explicit unmitigated fallback, per-target boss policy, separate gameplay-event
 input (default Math.random); visual streams/Phaser IDs unchanged. Import prepared-events requires exact
 source clock, original target/range review and no ordinary damageEvents.
- Earlier single-target physical Iai draft was CAUGHT by checking original text,
 withdrawn, corrected and final tests rerun. reserve-browser.json,
 reserve-reviewed-browser.json and iai-F6/21/45/80/120.png are SUPERSEDED wrong-
 gameplay evidence. Use instant-browser.json,party-release-browser.json and
 iai-final-F45/F65.png. No full-action native pixel or personal approval claim.

NATIVE BODY DIAGNOSIS / ACTUAL HOOK ACTIVATION:
- tools/memorial/body_observer.js, observer36-r2:13 fingerprinted getters/hooks;
 opt-in bodyCapture/bodyUnitIds, requests separated from actual CGS/frame/counter/
 end/local position, shared eventseq/MS, dedup and600-event budget. Read-only.
- Same-signer update in FFBE Trace only; rollback-installed.apk verified first.
 No uninstall/data clearing or lost downloads. Private run-as backup unavailable;
 existing external assetpack backup retained. Only assets/frida_script.js changed.
 Final APK SHA1383a29af8c5a93e6362370b94dd53c738faa3f2a599145f57b1cc8b0a239514.
 Rollback SHA561ff22035fe68c2a91b72e92aae1078dc41e1a42059902747399f5054c4be95.
 diagnostic-final.json records identities/calibration. First r2 calibration failed;
 ordinary force-stop/relaunch passed startup-r2-cold.log. Failed boot NOT admitted.
 Real canonical clip records, not just ADB/VM tests, prove hook activation.
- Big Shot227870 native Barret207000206: standby11 -> atk3 indices0..27 at constant
 local[449,571] -> idle1 at+2166ms relative command getter. First actualatk+27ms,
 requestedatk-1ms. Hardshot waits88/explosion128/sourcehit130. This scoped body
 is now understood; no universal Motion8 fallback. No direct damage-applied/
 action-commit hook, proven engine tick0 or full world immobility assertion.
 Canonical bigshot-body-r2-events.json463 events; mixed PID logs are NOT one run.
- Independent Store200210 native Delita253000227: standby11 -> magic5 -> idle1
 around682ms, no local movement. store-body-actual-events.json155 events;
 store-body-events.json was outside battle and proves no body sequence.
 Static CGS names/dispatch/getter evidence: body-*.json,cgs-name-map.json,
 action-motion-vtable.json. Native library SHA
 6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77.
 Prior arm{} restored. No root/security changes.

EXPLICIT IMPORT DECISION / NEXT CONCRETE STEP:
- Big Shot remains UNPUBLISHED: Hardshot38nodes (19Null/1Quad/10Model/8Particle)
 still lacks complete Null/matrix/compatibility/emission/tint/model controls and
 full render admission. Explosion/anchor checked; body now measured. These are
 independent gates, not one remaining field. Do not resume arbitrary parameters.
- Aerith Reraise81-node prepared plan retained; MAGIC negative-time/body,
 single-ally selection, auto-revive and profile gates remain. Other Aerith node7/
 node4/missing-authoring candidates unchanged. Mindblow227871 is BARRET.
- Store remains the bounded existing-roster render follow-up:3 nonflat Quad corner
 colors,3 Billboard models and ordering. Assess color/writer AND Billboard/order
 together using existing evidence; implement only with a short complete-release
 path. Charge draft stays archived/inactive. No other immediate unlock promised.
- Updated inventory:7 characters/87 active SERIES acquisition entries/15 published,
 0 certified fully importable unpublished. Not per-form eligibility. Read
 coverage/{coverage.md,inventory.json}. Cloud5/Aerith1/Barret0/CoD2/CloudAC1/
 Delita4/Jack2. Main party and reserve registry unchanged.

ACTUALLY EXECUTED CHECKS:
- node-release.log:82 tests PASS, incl44 actual-method combat checks, observer VM,
 import/choreography/events/source-only/placement/color/friendly/player/freshness.
 python-release.log:15 PASS (source prepare profile, staging,pipeline context).
 build-release.log:36 modules PASS, existing chunk-size advisory. Targeted broad
 subset; NOT entire historical/native suite. No new Unicorn run.
- instant-browser.json: real BattleScene fallback,execute-wave,boss,dead-target,
 restart; MP once, all-target event~752ms, no atk/movement, magic body/fast return,
 tail cleanup. Global RNG override initially collided with Phaser object IDs;
 fixed seam controls scene.enemyEventRandom ONLY. Failed logs preserved.
- party-release-browser.json:8 full actual menu/MP/event/body/effect actions,
 Cloud5/Aerith1/Jack2. baseline-release-browser.json:3 frozen Cloud frames,
 ZERO changed pixels. guards-release-browser.json: unavailable/basic Barret4shot,
 victory/wave/shutdown/fail-closed. delita-area-release-browser.json confirms
 Sword's9hits/earlyK.O./victory-wave/restart; delita-friendly-release-browser.json
 confirms Chant healing/caps/HPcost/MP/K.O.exclusion/restart. Both PASS.
- preservation-check.json: all previous14 command objects,58 existing published
 reference/runtime files unchanged (JSON/text normalized; binaries exact), roster
 unchanged. Renderer/Source plans/visual random streams unchanged.

REPRODUCTION / SAFE RESUME:
- Current game3001 checked against10 served module source maps, including new
 enemyInstant helper;3000 not trusted. Receipt server command:
 node tools/preview_original_skill.mjs --plan tools/data/braver-20261101/source/plan.json --port3156 --game-origin http://127.0.0.1:3001
 Open /tools/test-source-scene.html?reserve=jack&captureOrigin=http://127.0.0.1:3156
 and Check enemy instant event lifecycle / Check Source party skills. No-reserve
 frozen baseline/guards; Delita reserve friendly/area checks. Copy product-review
 receipt before another test overwrites it. Normal play /?reserve=jack.
- Preparation commands/source hashes/profile limits in current skill workflow,
 native-hit-profiles.md,iai-intake/,iai-features.json,iai-coverage.json,
 iai-gameplay-source.json. Previous good previews/plans retained.
- ADB C:/Program Files/BlueStacks_nxt/HD-Adb.exe -s127.0.0.1:5575 targets Trace
 ONLY (emulator5574 alias also listed). Screenshot before navigation. Memories
 (460,1845)->Season1->left arrow(100,305) TWICE->EventBattles->GoldenBombRush
 (530,1060)->Chapter1(530,360)->INT(530,925)->Depart(540,1690). PRO varies by view.
 Barret menu swipe170,1660->490,1660/350ms; BigShot row2left270,1450; execute
 270,1650. Delita swipe170,1470->490,1470; Store row2right765,1450; execute270,1465.
 Fight can end after BigShot: inspect first. Last native screen PRO after Store.
 adb_action.py preserves actual Android screenshots; do not trust old Windows view.
- Arm bodyCapture:true,bodyUnitIds:[exact native form] before selecting/executing;
 restore{}. Existing prepare_diagnostic.py/build/install procedure reused. Rollback
 and final signed APKs, expanded scripts, canonical traces, Iai originals and
 runtime receipts are in checked archive. No new recording needed for Store review.

---

Earlier revision notes (historical; current resume above takes precedence):

## CURRENT RESUME: grouped controls verified;14 skills preserved (2026-11-01)

Parent98091bb43a2ed7c3cbfb27696504bff1f5cbf460. This session adds OFFLINE
intake/preparation capabilities only. No new productive skill, runtime module,
body, cost, gameplay event, published plan or resource changed. The14 commands
and Sword color/Delita placement state are intact. Personal color recheck pending.

Checkpoint/backup receipts: tools/data/control-groups-20261101/checkpoint.json,
preservation.json; new scoped ref codex/grouped-controls-20261101. Read receipts
for the final hash. Shared HEAD63977b0296d0bc5ef77911f60dcd3469e6db36c3 and shared
index SHA72fe85975697e59e357ef726de6bd0fbc4e19c838e5401668ccc81d85dbda6f9 must
remain intact.253 pre-existing status entries preserved. Never reset/checkout,
stash/add-all, move HEAD or push. Use the same alternate-index/checkpoint method.

COMPLETED / ACTUALLY INTEGRATED:
- bmb_source_controls.read_intake_controls adds4 typed-layout inputs: Quad
  colorRate516 float[0,1]; Particle rotation508 (1On/2OnGenerateTime); Model
  translation568 (0On/1OnGenerateTime) and scale576 (0Off/1On). Other enum codes
  remain unknown. Rates reject nonfinite/out-of-range input. No stable Prepared
  node metadata rewrite or new inheritance equation. Existing staging automatically
  includes fields through coverage and hash-checked reuse; no parallel importer.
- Strict27-pair/469-node comparison:1823 values/0 differences,320 additional
  checks vs1503. Current parser hashes are in control-comparison.json. Corpus is
  strict-corpus.json copied from previous Big Shot result identities, NOT the
  old22-pair discovery or control-discovery.json (that is selector analysis).
- audit_bmb_controls --intake-only provides a DIFFERENT receipt schema and a
  reproducible bounded48-pair comparison:1151nodes/812 intake values/0 differences,
  including21 held-out pairs. Validates node order/type,life,parent and typed
  resources. Does NOT validate all materials/active curves or replace strict audit.
  Full48 compare_project stops at an active texture-color curve (audit.log).
  Twelve other held-out enum observations stay unknown. Quad scale0 occurred on
  two nodes of one held-out source only: evidence retained, enum NOT admitted.
- Existing named batch selections restaged13 Aerith/Barret abilities +Reraise.
  candidate-control-impact.json:14 benefit from additional inputs,0 whole skills
  unlocked. All original selection/audit receipts remain. New coverage inventory:
  7characters/87 active series entries/14published/70known-blocker/3intake-only,
  0 certified fully importable unpublished commands. Mindblow is BARRET227871.
- prepare_original_preview.rectangle_for_group admits mode3 ONLY with self scope.
  Original Store200210 native execution17861 proves identical caster/target unit
  rectangle. Other mode3 scopes reject, existing1/2/4 semantics untouched. Uses
  existing host target-unit geometry; zero scatter and sprite footprint are host
  adaptations, not recovered native RNG or exact native dimensions.

BIG SHOT / EXPLICIT DECISION:
- Hardshot38nodes:19Null,1Quad,10Model,8Particle. New input occurrences across
  Big Shot members:9rotation,13Modeltranslation,13Modelscale,1QuadcolorRate.
  Other parent/matrix/compatibility,emission,tint/geometry inputs still missing.
- Reused old native video; compared available body frames with masked-image
  templates. Some atk matches beat limit, others tie/shared; matches are nonmonotonic.
  body-sequence-comparison.json is NOT a clip/phase reservation trace. Do not map
  Motion8 to atk or limit from this. Original205/206 CGS equality is separate.
- Needed next: read actual original body animation reservation/clip/frame/hold
  transitions in ability227870 scope, linked to VFX/hit. Another ordinary video
  alone will not resolve the ambiguity. Complete Hardshot interpretation remains
  an INDEPENDENT blocker. No Big Shot release or claimed original body mapping.

BOUNDED FALLBACK / UNFINISHED WORK PRESERVED:
- Tried existing-roster Store200210 (Delita), not a new one-skill character.
  Complete exact source plan exists in store/plan.json; draft Store recipe is
  store-recipe.json. Nothing published or added to a reward/menu catalog.
- Existing observer35 actually used in Trace; fresh armed token and execution
  events confirm hooks, not just ADB. Native form253000227 (runtime205 differs),
  self target object0x70542d851240; group5000090,category3,rect
  [380.6000061,402.7999878,69,94]; actual setter[421.1000061,457.7999878],center
  residual[6,8]. Member wait41,scale1,rotation0. store-events.json and
  store-reference.mp4/log/-recording.json retain exact data. No APK install,
  app-data/asset deletion or root/security changes. Previous arm{} restored.
- Full renderer audit:3 active non-flat Quad corners,3 active Billboard models
  plus other experimental material/order boundaries. FlatRGB profile rejects
  these, so Store is UNPUBLISHED. Do not add a white/default color or omit nodes.
- A general normal-attack charge +incoming-damage risk draft was implemented and
  tested (4 Node tests incl43 combat checks; build passed), then DEFERRED because
  render gates failed. charge-draft/ has six full changed files, test file, patch,
  hashes. Product runtime/test files restored parent-equivalent, not left half
  activated. Draft1.8 nonstacking charge/1.5risk/one future round are REVIEWED
  roguelike choices, not native formula/stacking claims. Do not count as integration.
- Aerith Reraise81-node plan remains intact; MAGIC negative-time/body, single-ally
  selection and auto-revive still independent gates. Other candidates have type7,
  type4 and/or original-format issues. No new large Reraise investigation.

VALIDATION / UNCHANGED BASELINES:
- python-controls-final.log8 tests, python-staging-final.log7:15pass/no skips.
  Includes unknown enums/bad rates,48-pair intake mutation rejection, bounded self
  anchor and3 old preparation profiles reproducing exactly.
- node-final.log23pass/no skips: source profile/control replay/scene migration,
  Source-only/choreography/position/RGB checks. build-final.log passes35 modules;
  existing Vite chunk advisory only. Earlier draft checks are NOT new live features.
- preservation-check.json:250 src/public/character-recipe files parent-equivalent;
  all14 commands/plans/resources preserved. Existing sword-color baseline/area/
  party/replay receipts reused because inputs unchanged; no redundant browser run
  or new visual-fidelity claim. freshness.json confirms9 current modules on3001.
- Old normal gameplay tests remain applicable; no live combat code changed after
  the deferred draft was removed. No new skill is called technically playable.

REPRODUCE / RESUME:
- Python C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe
  with PYTHONUTF8=1 and PYTHONPATH=tools/data/memorial-audit/python-deps;tools;tools/memorial.
- See skill-reconstruction-workflow.md grouped-intake commands. Strict audit
  required for inventory --control-audit; do not supply the partial48-pair receipt.
- Game3001 is current; sink3155 stays usable (existing preview_original_skill
  server,9-module freshness list). Old3000/3154 not for current QA. No new tabs
  were needed or left behind. Shared QA receipt not overwritten this session.
- ADB C:/Program Files/BlueStacks_nxt/HD-Adb.exe -s127.0.0.1:5575; Trace clone only.
  PartyCloud/Delita/Barret, Golden Bomb Rush after Store; arm restored{}. Native
  main instance/data untouched. Direct Android screenshots reliable; no Windows
  stale capture dependency. Confirm current state before any further action.
- NEXT CONCRETE STEP: scoped native227870 body reservation/clip-transition hook
  plus coherent remaining Hardshot control/Null/matrix evidence, not another
  unbounded selector scan. If that cannot be obtained in one bounded cycle,
  preserve Big Shot block and assess the separately prepared Reraise action
  contract. Store requires non-flat RGB and Billboard before revival of its draft;
  a gameplay-only charge does not make the source effect complete.

## CURRENT RESUME: Sword original RGB fixed,14 commands preserved (2026-11-01)

Parent8abef8e09daf95294f3b313d5abded3c52efde40. User personally reviewed the new
Delita skills including Helm Break; their positioning/animation quality is now
accepted. Sword's original-color discrepancy is corrected technically and visibly,
but the updated colors still await personal recheck.14 technical skills remain;
no new skill/body, costs, events, action choreography or balance changes.

Local scoped checkpoint and archive receipts: tools/data/sword-color-20261101/
checkpoint.json,preservation.json; ref codex/sword-color-20261101. Shared HEAD
63977b0296d0bc5ef77911f60dcd3469e6db36c3 and index SHA
72fe85975697e59e357ef726de6bd0fbc4e19c838e5401668ccc81d85dbda6f9 must remain
intact. Existing dirty work is preserved. No checkout/reset/add-all or push.

CAUSE / SOURCE PROOF:
- Original atk_slash6_rand_orange.bmb SHA f9500dc32a4900a13d15e16d33cbbd78bc6b7715b4b00cf25cf9cbafada2bb91
 matches its exact authoring. All6 drawable Quads select Constant/flat RGB;
 four distinct initial colors and node11 RGB range are verified. Old exporter
 only passed corners to Distortion. Ordinary Add nodes retained white initialColor
 from the unrelated center slot. No active RGB curve was made dormant here.
- Native InitConstFlat reads RGB at+0x68/+0x78, samples three values, clampsRGB;
 update retains color. Existing ColorConst initializer/native init records reused.
 Corner A=0 is NOT alpha: the independent alpha module/curve remains active.
- Actual original warm slashes are visible in archived sword-reference.mp4 and
 frame16 under tools/data/delita-placement-20261101/. No new original recording
 needed. Attempted new emulate_quad_assignment could not run because Unicorn
 is absent in current Python; it is not cited as successful evidence. Do not
 install/rebuild diagnostics merely to repeat these retained successful references.

INTEGRATED:
- original_flat_quad_color.py + --flat-quad-rgb preparation opt-in retain checked
 Constant/flat RGB/ranges. sourceQuadColor.mjs reuses nativeLifecycle ColorConst
 arithmetic; Source player applies sampled materialRGB once per instance while
 preserving alpha/lifetime. Unknown/Curve/non-flat profiles reject explicitly.
- Original seed ownership for this effect remains unknown. Color seeds use
 declared reviewed-color-streams-v1, independent of accepted member/transform
 streams. Do not label this host mixer native. No skillspecific color constants.
- Only Sword's plan opts in, via tools/presentations/existing-roster-support.json
 pointing at tools/data/sword-color-20261101/plan.json. Both original target anchors
 and all9 member stream keys/start frames remain unchanged. Other13 plans match
 the parent except player provenance (Chant also publication recipe provenance).
 All14 published command objects/character data/registry match parent exactly.
- sceneProfile rejects missing/unreviewed color policies and conflicting RGBA
 paths before admission. Source audit now reports6 implemented-subset flatRGB
 nodes. The older distortion RGBA path is not rewritten or globally activated.
- stage_source_imports emits raw colorPreparation hints: flatRgbNodes,
 preparationArguments and outsideFlatRgbProfile, wholeEffectAdmitted=false.
 This is automatic feature discovery, not automatic full skill certification.

VALIDATION / ARTIFACTS:
- node-final.log initially77/78: the deliberate old player-hash alarm failed.
 After actual frozen GPU proof, identity hashes were reviewed in
 test_scene_migration.mjs. node-reviewed.log17/17 passes. node-validation.json
 combines latest states for84 distinct passing tests (not95 independent tests).
 Includes native Quad writer packets, Add/materialRGBA,14 skill contracts,
 body/placement,combat,status,MP,heal,buff,source-only and freshness checks.
- python-final.log22 tests +flash-python.log2, all pass/no skips. Build35 modules
 PASS with pre-existing chunk advisory.3 unchanged presets reproduce exactly.
- before/after-browser.json: same sourceF42/54/90 and two-targetF54, hosts,
 anchors, positions and member samples match. Chant3 frames pixel-identical.
 color-comparison.png shows native / before / after; different native formation,
 camera and age explicitly prevent pixel-fidelity claims. RGB already varies
 by source node; random node11 remains instance-dependent, not pulsing RGB curves.
- area-browser.json:9 hits on both living enemies, first-target K.O., victory/wave,
 restart all pass. party-browser.json:6 Cloud/Aerith actions,correct MP/damage,
 debuffs/buffs and quick release with decoration independent. No gameplay changed.
- baseline-browser.json:9 current served modules checked,3 frozen Cloud frames
 with0 changed pixels. Updated identity alarm only follows this proof. See
 preservation-check.json for unchanged14 commands/13 other visual plans.
-replay-browser.json: all4 Sword reference frames reproduce pixel-identically
 after restarting from the completed area test. Three Chant replays differ only
 in the animated TARGET marker at[163,454,200,481], not effect colors.
 The initial before/after Chant comparison was fully pixel-identical. Retain
 color-replay-check.json/diff images; do not claim7 identical complete replays.

REPRODUCE / SERVERS:
- Game3001 remains current. New receipt sink3155/session74800:
 node tools/preview_original_skill.mjs --plan tools/data/braver-20261101/source/plan.json --port 3155 --game-origin http://127.0.0.1:3001
 Old3154 has an8-module freshness list cached in its process; do not use it for
 the new helper. check_dev_server now covers9 modules including sourceQuadColor.
 Reload QA tabs after changes; save each shared receipt before another check.
- QA /tools/test-source-scene.html?reserve=delita&captureOrigin=http://127.0.0.1:3155
 placement/area checks. Omit reserve for frozen baseline/party checks. Fresh user
 review: http://127.0.0.1:3001/?reserve=delita (reload old game tabs).
- Prepare with working Python tools/prepare_original_preview.py --source tools/data/roster-expansion-20261101/follow-up/delita-1323010/skill-source.json --unit delita --unit-assets public/assets/units/delita --recipe tools/characters/delita.json --motion atk --profile source-preview-v1 --authoring-directory assets/battle_effect --native-shaders-apk tools/data/memorial-audit/installed-base-v208.apk --native-shader-package tools/data/particle-native-audit/bmshaderpack.bin --renderer-reference tools/data/memorial-audit/diagnostic-v7/renderer-reference.json --flat-quad-rgb --output tools/data/sword-color-20261101/plan.json
- Publish node tools/publish_scene_presentations.mjs --recipe tools/presentations/existing-roster-support.json; refresh all manifest playerSha256 after shared code changes without altering their plans. No character importer/body rebuild is needed.
- Working Python C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe;
 PYTHONUTF8=1; PYTHONPATH=tools/data/memorial-audit/python-deps;tools;tools/memorial.

IMPORT CONTINUATION / NEXT CONCRETE STEP:
main-party-color-intake.json inspects13 already staged commands, no new global
survey. Relevant flatRGB found in Ancient Holy229762,Miracle of Life229763,
Mindblow227871. Ancient Holy/Mindblow include outside-profile Quads; other missing
controls/nodes/choreography still block. No additional playable skill is claimed.
Big Shot227870 has no required colored flatRGB node and remains blocked on
Hardshot controls plus scoped Motion8 body selection. Reraise81-node effect-only
plan is untouched. Do not substitute atk,limit_atk,projectiles or a guessed seed.
Next high-reuse prerequisite is proven raw control/selector/compatibility and
emission/texture data, then scoped body/action selection for existing main-party
skills. Prior candidate counts are potential overlapping coverage, not unlocks.
Use existing source/trace evidence first and measure only the missing selector
or body transition; no further pixel-perfect/color research is needed now.


## CURRENT RESUME: Big Shot decision / Helm Break publication (2026-11-01)

Parent3a939e1601446c4913daba6b5c9ccdf9bd49b453.14 technical Source skills,
11 personally accepted. New Delita Helm Break202190 awaits personal visual review;
Chant/Sword renewed spatial review also remains pending. No src/player changes.
All existing13 published command objects, Source manifests and body resources
are preserved. Source-only remains the only productive engine.

Checkpoint and archive receipts: tools/data/big-shot-20261101/checkpoint.json and
preservation.json. New scoped ref codex/big-shot-decision-20261101. Shared HEAD
63977b0296d0bc5ef77911f60dcd3469e6db36c3 and index SHA
72fe85975697e59e357ef726de6bd0fbc4e19c838e5401668ccc81d85dbda6f9 remain intact;
do not checkout/reset/add-all or overwrite the unrelated dirty working tree.
Prior archives remain prerequisites. Nothing pushed.

COMPLETED / ORIGINAL EVIDENCE:
- Particle3 parent-translation selector at504 is read only by intake/audit.
 0=On,1=OnGenerateTime; unknown enum fails comparison.27 matched pairs/469 nodes
 /1503 values pass, including58 additional checks. No stable Prepared node rewrite,
 authoring-free playback admission or new inheritance equation.
- FFBE Trace reached via existing ADB127.0.0.1:5575, observer35 verified active
 with fresh events. No install, data deletion or security/root change. Barret was
 added to an empty third party slot; party now Cloud/Delita/Barret, reversible.
 Big Shot227870 was executed in Golden Bomb Rush INT and recorded12 seconds.
 Native unit207000206 is explicit; exported205/206 CGS tracks compare identical.
 Do not infer native clip selection from this comparison.
- Actual skill input88:5027690:1:1:0 and target rect[1,240,282,261] captured,
 baseWait88/layer2023. Hardshot position141,376.5 scale1; explosion148,367.5
 scale3. Existing target-unit rectangle semantics fit; no positional hack added.
- Motion8 exact body clip remains UNRESOLVED. Video shows the action but is not
 an internal clip trace. Getter at0x131a474 merely reads field0x174. Inspected
 procSkill and direct callers do not prove atk or limit_atk. No guessed clip.
- Big Shot remains NOT published after the requested bounded decision point:
 missing Hardshot controls/compatibility/emission/tint inputs plus Motion8 body.
 Particle translation helps8 Hardshot nodes but does not resolve the whole38.
 Native video/log/events and source identities are preserved, arm now disarmed.

FALLBACK IMPORT COMPLETED:
- Delita Helm Break202190 uses exact composed unit slash+mentalbreak originals,
 existing source-preview-v1, matched authoring, explicit reviewed Motion1/body
 contract and screen-API target-unit placement. No new renderer or individual
 offsets. Source hit40 +prefix40 produces damage/status80, MP12.
- Reviewed2x physical/+20% magic vulnerability for3 phases is separated from
 raw modifier7000 and SPR-60%/5turns in originalCommand. No native damage-formula
 or original whole-action fidelity claim. Known preview uncertainties remain in
 helm-break/source-features.json and renderer-coverage.json.
- Runtime presentation delita_helm_break, recipe tools/presentations/helm-break-import.json,
 character tools/characters/delita.json. No body re-export. Dynamic second page
 shows Helm Break; all4 Delita commands are selectable without spending MP.

ACTUAL VALIDATION:
-65 Node tests PASS, including42 direct combat assertions;19 Python tests PASS,
 no skips. Build34 modules PASS, existing Vite chunk-size advisory only.
-reserve-browser.json: Shield Break+Helm Break single-target full execution,
 MP rejection, missing choreography rejection before spending, selected second
 enemy only, one hit/debuff, early target K.O. no spillover, victory/wave persistent
 MP88, decoration cleanup and restart. Helm gameplay~1393ms from VFX start;
 body returns independently of decorative tail. Captures atF6/21/45/80/120.
-menu-browser.json: actual command-button bindings, two pages/wrap/all4 commands,
 MP unchanged. Read from successful DOM result because simultaneous baseline
 subsequently overwrote the shared sink; provenance explicitly recorded.
-friendly-browser.json: Chant7 cases; area-browser.json: Sword4 cases,9 hits on
 each enemy, early K.O./victory/restart. Existing position/random policy unchanged.
-baseline-browser.json:8/8 current module hashes on3001, default-party3 Cloud
 frames0 changed pixels. Initial accidental reserve=delita baseline was INVALID
 due different ally pixels; fixed QA now requires the default party and the valid
 comparison passes. No renderer changed to hide the invalid comparison.
-preservation-check.json: previous13 commands/plans/src unchanged against parent.
 New inventory7 characters/87 active entries:14published,70blocked,3intake-only,
 zero certified fully-importable unpublished. This is not a full FFBE support count.

REPRODUCE / RESUME:
- Use3001, existing freshness sink3154; server was not restarted/killed. Check
 tools/check_dev_server.mjs first. QA URLs: /tools/test-source-scene.html?reserve=delita&captureOrigin=http://127.0.0.1:3154
 for reserve/menu/friendly/area; omit reserve for frozen Cloud baseline. Save each
 shared product-review/receipt.json before running another test. Do not run saves
 concurrently if independent receipts are required.
- Live user review: http://127.0.0.1:3001/?reserve=delita ; choose Delita and page2
 via X or arrow. Helm Break is complete technically; Daniel must judge its quality.
- Original reproduction scripts/commands: tools/data/big-shot-20261101/
 record_action.py,adb_action.py,inspect_recording.py,discover_controls.py,
 compare_tracks.py. bigshot-reference-recording.json documents host timestamps;
 video time is NOT native effect age. Existing native package/hash info is retained
 in the archive. Trace package com.square_enix.ffbejpn; main instance untouched.
- Audit: working Python tools/audit_bmb_controls.py --corpus tools/data/main-party-import-20261101/extended-corpus.json --output tools/data/big-shot-20261101/control-comparison.json
- Inventory: node tools/inventory_roster_skills.mjs --control-audit tools/data/big-shot-20261101/control-comparison.json --output tools/data/big-shot-20261101/coverage
- Prepare Helm: working Python tools/prepare_original_preview.py --source tools/data/roster-expansion-20261101/follow-up/delita-202190/skill-source.json --unit delita --unit-assets public/assets/units/delita --recipe tools/characters/delita.json --motion atk --profile source-preview-v1 --authoring-directory assets/battle_effect --native-shaders-apk tools/data/memorial-audit/installed-base-v208.apk --native-shader-package tools/data/particle-native-audit/bmshaderpack.bin --renderer-reference tools/data/memorial-audit/diagnostic-v7/renderer-reference.json --output tools/data/big-shot-20261101/helm-break/plan.json
- Publish: node tools/publish_scene_presentations.mjs --recipe tools/presentations/helm-break-import.json ; node tools/import_character.mjs --recipe tools/characters/delita.json --publish-skills-only --python WORKING_PYTHON
- WORKING_PYTHON=C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe
 PYTHONUTF8=1; PYTHONPATH=tools/data/memorial-audit/python-deps;tools;tools/memorial.

NEXT CONCRETE STEP / UNFINISHED:
Do not republish Big Shot or declare Motion8 solved. If resuming Barret, instrument
actual body reservation/clip transitions in ability227870 scope, using the current
unchanged diagnostic as the backed-up baseline. A second video alone is not the
missing evidence. Separately, Hardshot still needs proven raw control layouts,
including emission and compatibility; no exact matching project was found.
Reraise's81-node effect-only plan is untouched and unpublished. MAGIC negative
start/timing/body, friendly single-unit selection, auto-revive and render findings
remain. The census certifies no guaranteed next unpublished import. Compare other
existing-character candidates before starting another large research branch.
No incomplete runtime changes remain from this block; only those documented
research gates are open. Do not restart Legacy cleanup or pixel-perfect research.


## CURRENT RESUME: main-party intake improved, no new publication (2026-11-01)

Parent checkpoint bc6238562ccad4771a531956e3d35a4700161e96. Still13 technically
playable/11 personally accepted. Delita spatial review remains pending. All src,
published assets and character recipes are unchanged. No Legacy or emulator work.

Local checkpoint/archival receipts: tools/data/main-party-import-20261101/
checkpoint.json and preservation.json; scoped ref codex/main-party-intake-20261101.
Shared HEAD63977b0 and index SHA
72fe85975697e59e357ef726de6bd0fbc4e19c838e5401668ccc81d85dbda6f9 must stay intact.
Preserve unrelated dirty work and prior archives. No remote push.

COMPLETED:
- Particle3 scaleValue slot1392 and Model6 scaleSpeed slot1472 decode through the
  existing52-byte vector-key reader. Seven serialized curves/26 keys match four
  independent originals/projects; one curve is dormant NewtonDynamics. Empty new
  slots stay sparse to preserve existing plan serialization. No new native time
  equation or runtime profile is claimed.
- Saved texture1/2 RGB/alpha value curves with explicit Constant selectors are
  dormant, rather than falsely active. Other/absent/unknown selectors stay gated.
- Five whole original/project comparisons now pass: explosion_normal,blow4_blue,
  shockwave1_blue_S,regen_front,reraise. Extended audit27 pairs/469 nodes/1445
  already-known parent-control values, no mismatch. These aren't1445 new fields.
- audit_bmb_controls.py retains projectComparison and parserInputs. Roster
  --control-audit rehashes all parser/binary/project inputs and retires only exact,
  unambiguous source authoring-comparison errors. Historical errors are retained
  as supersededAuthoringBlockers. Other resources/nodes/gameplay gates remain.
- Nine stale diagnostics retired for eight main-party skills: Breath of the
  Earth,Reraise,Overflowing Life,Lifestream,Big Shot,Mindblow,Speed Drink,Ungarmax.
  ZERO complete new imports. Inventory without the optional checked audit remains
  historical/conservative. With it:13 published,70 intake-blocked,4 intake-only.

ACTUAL ATTEMPTS / REMAINING BLOCKERS:
- Big Shot227870 source-profile attempt stops at missing exact
  sp_20108_hardshot.bmsln. Its38-node original BMB exists; controls and Motion8
  body choreography remain unapproved. No projectile replacement.
- Reraise10230 now prepares an81-node effect-only plan. Original effect start-55
  and marker120 are retained. MAGIC timing/body, friendly single-unit selection
  and auto-revive process27 are not implemented/approved. Research magic_atk is
  only an overlay, NOT a choreography contract. Coverage still flags12 unverified
  Particle-facing nodes,8 ordering findings and6 parent-transform findings.
- Existing source audit assumes originals/ and effects/resources.json beside
  the plan. Checked copies of the110336-byte BMB and original resource receipt
  were added only to the ignored session folder; subsequent audit passed.
- Pulse of Life's differently named regen file was NOT fully compared here.
  White Materia still has actual selected texture2 curves/versions and cure5
  unknowns. Curaja/Banish and Barret's other independent blockers remain.

VALIDATION:
-64 Node tests PASS including42 combat assertions and3 devserver checks.
-21 Python tests PASS, no skips; existing3 preserved presets regenerate exactly.
-27-pair comparison PASS; build34 modules PASS, existing Vite chunk advisory.
-baseline-browser.json: freshness8/8 on3001 and3 Cloud frames0 changed pixels.
  Prior unchanged combat/Delita receipts reused, no fresh13-skill acceptance claim.
- Raw discoveries, comparisons and exact commands are in curve-layout-discovery,
  curve-pair-comparison,extended-comparison,preparation-attempts,import-decision
  JSON files under tools/data/main-party-import-20261101/.

SERVER SAFETY / REPRODUCTION:
- Use game3001. No process was terminated. A read-only probe now finds placement
  code on3000 too, but no combat tests ran there. A marker alone is not freshness.
- tools/check_dev_server.mjs compares8 served source bodies to disk via Vite maps.
  Import URL rewrites normalize while basename/bindings remain checked. This
  does NOT certify previously cached browser instances; reload the QA page.
- Browser QA now requires a current product-freshness receipt endpoint BEFORE
  combat. Old sinks3152/3153 lack it. Current sink3154/session66521:
  node tools/preview_original_skill.mjs --plan tools/data/braver-20261101/source/plan.json --port 3154 --game-origin http://127.0.0.1:3001
- QA: http://127.0.0.1:3001/tools/test-source-scene.html?captureOrigin=http://127.0.0.1:3154
  Add reserve=delita for friendly/area checks. Copy the shared receipt after each.
- node tools/check_dev_server.mjs --origin http://127.0.0.1:3001 --output tools/data/main-party-import-20261101/server-freshness.json
- node tools/inventory_roster_skills.mjs --control-audit tools/data/main-party-import-20261101/extended-comparison.json --output tools/data/main-party-import-20261101/coverage
- Working Python: C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe;
  PYTHONUTF8=1; PYTHONPATH='tools/data/memorial-audit/python-deps;tools;tools/memorial'.
  attempt_preparation.py records exact attempts; extended-corpus.json plus existing
  audit_bmb_controls.py reproduces the comparison. No new native recording needed.

NEXT: prioritize Big Shot's exact hardshot control decoding, then targeted Motion8
body/anchor evidence. Known node families and explosion comparison now pass, but
this is not a guaranteed import. Reraise has several independent remaining gates;
defer rather than invent revival, body clips or negative timeline offsets. Keep
13 existing skills, Delita placement policy and audio/event separation unchanged.

## CURRENT RESUME: Delita native placement validated and shared contracts integrated (2026-11-01)

Supersedes the earlier CURRENT RESUME section below.13 technical Source skills,
11 personally accepted. Daniel likes Chant/Sword optics; placement remains pending
his renewed acceptance. No new skill/character, no Legacy work, no APK/data changes.

LOCAL CHECKPOINT: tools/data/delita-placement-20261101/checkpoint.json, scoped ref
codex/source-placement-20261101, parentdb296e9fb806764b55dab781df3e3fd4d4b17e25.
Shared HEAD63977b0 and real indexSHA72fe85975697e59e357ef726de6bd0fbc4e19c838e5401668ccc81d85dbda6f9
stay untouched. Other dirty work predates this task. Do not reset/stash/add-all,
move HEAD or push. The new scoped ref and prior archives form the resume chain.

COMPLETED / EVIDENCE:
- Native existing revision35/56 hooks/float calibration worked over ADB
  C:/Program Files/BlueStacks_nxt/HD-Adb.exe, serial127.0.0.1:5575, package
  com.square_enix.ffbejpn. Direct Android screenshots are reliable. No new
  diagnosis build/install, root setting, data deletion or heavy GPU capture.
- Autonomously selected Delita and entered Golden Bomb Rush. Native party now
  Cloud+Delita (reversible slot2 addition), main instance untouched. Arm restored
  to{}; previous-arm.txt saved. Cloud normal attack unexpectedly executed during
  attempted guard gesture; do not assume swipe-down defends. No data lost.
- Skills menu gesture DOES work: ADB swipe95,1460->470,1460 over450ms for Delita.
  Select Chant after one list scroll; Sword Lv1 after two430px scrolls plus250.
  Last native state may be battle/results after Sword; get a fresh screencap.
- Chant210550 two real factories, side rect[320,0,320,666], modes2/2,offset0,240.
  API base480,573; measured setters488,570 and480,572 (scatter). Engine1100 and
  ortho1136 are distinct; do not inject these measurement dimensions at runtime.
- Sword1323010 nine real factories, per-target rect[1,240,282,261], setter residual
  within8 of142,370.5. Exact native getEffectDispRect != current-frame sprite box.
  No fixed enemy/group offset correction. Loaded native source group starts40;
  local version starts38; no timing rewrite. Early captured renderer snapshots
  were pre-wait defaults, NOT useful active matrices/RNG seeds.
- Shared bridge opt-in ffbe-screen-api computes source point in API Y-down then
  converts once to Three Y-up. Fixes Chant's reversed+240 without altering
  geometry/material/UV/timing. Current root canvasY664 instead of184.
- Sword authored node1 full-turn rotation/node2 translation50 had been sampled
  identically nine times. Opt-in reviewed-member-streams-v1 separates stable
  member/target streams. This is a declared FFRogue replay policy; native internal
  seed construction remains unknown. No native lifecycle module change.
- New imports now need a placement-coordinate review independently of VFX/body
  gates; only exact already-published command IDs/kinds/bindings retain historical
  contracts. Two Delita binding recipes declare coordinates; only Sword declares
  new sampling. All13 manifests refresh shared player provenance; previous11
  effect-plan/command/body data unchanged. No frozen resource replaced.

VALIDATION ACTUALLY EXECUTED:
-60 Node tests PASS including42 direct actual combat assertions;10 Python
 preparation/composition/staging tests PASS; build34 modules PASS with preexisting
 Vite chunk advisory. node-final.log/python-final.log/build.log.
- baseline-browser.json current3001: all3 frozen Cloud frames0 changed pixels.
 Identity alarm updated ONLY after this real GPU check. originalEffectPlayer raw
 SHA12a7d2d80ab46d58d83bfdac756e9f5f4a0ee36f2023620dde88c4d24419a56c.
- friendly-browser.json:7 Chant modes, actual heal/HP cap/K.O. exclusion,
100HP+12MP once, no-target/HP/MP rejection, restart. Gameplay~1667ms vs222f VFX.
- area-browser.json:9+9,earlyK.O.1+9,all-dead1+1,victory/waveMP52,active restart;
 normal gameplay~1503ms vs267f VFX. No implicit atk/magic body. No renderer error.
- guards-browser.json: default Barret unavailable commands, normal attack,
 Source fail-closed,victory,wave,shutdown. Immutable prior accepted combat receipts
 reused; no claim of fresh original video validation of all13 skills.
- final-placement.json/current metadata: source policy/playerSHA/member-target
 seeds, Chant frames60/85/110, Sword42/54/90 and2-target54. Paused production
 rendering; not alternative preview. Numeric axes tests use3 host dimensions,
 units1/2,translated arenas,1/2 target sets; arbitrary camera zoom unsupported.

REFERENCE PRESERVATION / CAVEATS:
- valid chant-reference.mp4 and sword-reference.mp4 (12s each), respective
 recording timestamps/logs, native event JSON, placement-measurements.json,
 native stills Chant08/Sword16 and comparison PNGs preserved in the new archive.
- before-placement.json is the deliberate old implementation. final-placement.json
 is verified current3001. after-*.png/stale-before-reload.json reflect stale3000
 transforms and MUST NOT prove improvement. chant-native.mp4/its extracted stills
 ended BEFORE action; exclude. Exact native effect-age alignment, touch-box
 reconstruction and native seed initialization remain open, no pixel claim.
- preserve_comparison.py reproduces screenshot montages and raw event/context
 joins. Native/game camera/formation/effect ages differ and labels say so.

IMPORTANT SERVER STATE:
- Old Vite3000 process4812 serves stale transformed modules, even though public
 JSON is fresh. Automatic approval review rejected the guarded stop/restart
 action with 'blocked by policy'. Old process remains untouched. Do not silently
 bypass this restriction or use port3000 results as the corrected-code evidence.
- Correct fresh Vite3001 running in exec session96954. User review:
 http://127.0.0.1:3001/?reserve=delita (deliverable tab).
- Receipt sink3153/session29239: node tools/preview_original_skill.mjs --plan
 tools/data/braver-20261101/source/plan.json --port 3153 --game-origin http://127.0.0.1:3001
 loopback-only; old sink3152 remains default3000. Shared product-review receipt
 is overwritten by each check: copy it immediately to this session directory.

NEXT CONCRETE STEP:
1. Daniel later reviews both positions on3001; don't ask him for captures while
 remote. Fountain should surround the party; random Sword arcs should use each
 individual enemy footprint.11 accepted remains the count until his approval.
2. Main-party import decision refreshed from existing census: Aerith/Barret28
 unpublished,25 missing authoring,15 node7,10 active curves (overlap, not promises).
 main-party-decision.json has exact IDs and blockers. No new complete candidate.
3. Prefer a concrete authoring-independent control pair such as Aerith Banish
10060 front/back (both indexed,neither matched authoring), using decoded original
 pairs first. MAGIC choreography is a separate unproved gate. Curaja additionally
 needs4/7; Big Shot needs RGBcurve+hardshot+Motion8. Do not invent replacement
 effects or new standard body clips. Keep scope tied to one realistic import.

New files/behavior are described in the current handbook/workflow/map/native
placement note. secure.py in this session directory prepares only the allowlisted
changes againstdb296e9; checkpoint/preservation receipts are the exact resume IDs.

## CURRENT RESUME: existing roster expanded; thirteen technical Source skills (2026-11-01)

Daniel personally accepted Shield Break and Piercing Gleam; all previous11 are
accepted. This session adds Delita Chant210550 and Cunning Hero's Sword1323010,
both fully battle-tested and awaiting Daniel's own visual acceptance. No new
characters or native research. Source-only remains complete; DO NOT redo Legacy
cleanup. New roster coverage: docs/research/ROSTER_SKILL_COVERAGE.md.

Checkpoint: see tools/data/roster-expansion-20261101/checkpoint.json (scoped ref
codex/existing-roster-support-20261101, parent0666f6a8b2978885f74022e55a9f800edce835a2).
Shared HEAD63977b0 and real indexSHA72fe85975697e59e357ef726de6bd0fbc4e19c838e5401668ccc81d85dbda6f9
are deliberately preserved. Do not reset, stash, add-all or move HEAD. Other dirty
work predates this task. No push. The scoped checkpoint contains the final
handoff/map and publication. Its archive receipt is preservation.json beside it.

COMPLETED:
- Actual default party Cloud/Aerith/Barret; other4 are optional slot3 reserves.
  Runtime Barret207000205 matches recipe, series207000204; old mismatch note stale.
- Read-only inventory_roster_skills.mjs: seven bodies,87 ABILITY/MAGIC series
  entries; exact current-form LB master references plus other series variants.
  13 published,71 known-blocked,3 intake-only; no certified unpublished skill.
  Preserve original eligibility requirements. No account/equipment/quest claim.
- Main-party heal candidates were investigated FIRST: Curaja10290,Full-Life10180,
  Pulse of Life229755,Stop Detach213920 and existing Healing Wind all have multiple
  independent VFX/authoring/node blockers. Barret's7 also remain blocked. Then
  inspected Delita/Jack support and fifteen previously unassessed roster entries;
  reused previous intake evidence instead of a new global/native survey.
- Chant uses complete cure2 front/back source members,5 textures,F100 heal,
  MP12+nonlethal own HP100,heal1000 for other living allies. Fixed heal/cost/body
  are explicit balance/presentation adaptations. Raw41@2 source and exact JP
  ability210550 are retained (source-semantics.json hashes the JP file/entry).
  Do NOT name-match GL Chant200930. Prepared plan duration222 frames.
- General stationary party events, explicit living recipient selection, capped
  healing via existing UnitActor.restoreHp, once-only nonlethal HP cost, no-target
  rejection BEFORE spending resources, prepared-friendly import target review.
  Bridge warms1/2/3 recipients and maps party target-side to the right arena
  half. Original player/geometry/material/UV/offsets unchanged.
- Cunning Hero's Sword is a complete all-enemy9-hit original slash plan,1 texture,
  sourceF42,48,54,60,66,72,78,84,90 and weights7%*8+44%. Reviewed MP48/total3x
  replace source120/12000 only in gameplay. Explicit stationary/rest body means
  no guessed atk/magic clip. It is a reviewed adaptation, not native body proof.
  Source series brave-acquisition metadata remains, no original 5-star claim.

CHECKS ACTUALLY RUN:
- 56 Node tests PASS incl42 direct actual BattleScene/UnitActor combat checks;
  10 Python preparation/composition/staging tests PASS; build33 modules PASS
  (existing Vite large-chunk advisory). Logs node-final.log/python-final.log/build-final.log.
- friendly-browser-final.json: normal healing2 allies,HP cap,K.O. skip,no other
  living recipient,insufficientHP,insufficientMP,restart. Cost exactly100HP+12MP,
  own HP never healed; gameplay ends around1668ms independently of222-frame VFX.
- area-browser.json:9+9 hits; early death1+9; all-dead1+1 immediate victory,
  next-wave MP52 preserved; active-scene restart disposes player. Normal action
  about1510ms vs267-frame tail. Only standby/idle body calls, no implicit attack.
- delita-party-browser.json: full Cloud5/AerithSealEvil/DelitaShield/Chant actions
  through real menu/Source bridge. Earlier immutable remaining accepted command
  battle receipts are reused. No false claim of new native reference recordings.
- baseline-browser.json: all3 frozen Cloud images0 changed pixels. Existing
  eleven command objects and all old presentation manifests unchanged vs0666f6a;
  preserved-identities.json. Shared originalEffectPlayer remains a9482f...6bc.
- Default-party guard receipt is saved as guards-browser.json after completion.

OPEN / NOT PUBLISHED:
- Store200210 passed resource intake but plan fails on placement mode3/caster.
  Need an independently justified caster rectangle/host contract; do not alias
  blindly. Also implement reviewed next-NORMAL-attack charge plus DEF-risk,
  not an all-skills physical buff. No Store implementation was added.
- Meditate/Cheer/Medicate and Hero's Encouragement fail authoring/node/curve or
  version checks. Negative Full-Life timeline and standalone MAGIC body semantics
  remain separate gaps. None may silently substitute a Legacy animation.
- Helm Break202190 complete intake, not prepared/battle-approved. Existing
  physical damage+magic vulnerability support makes it a low-effort candidate,
  but avoid more simple breaks as the default. Jack Iai Strike needs reviewed
  death gameplay/choreography. Their inventory I state is NOT import approval.
- Long-term authoring-free controls, node7, active curves, conditional lanes,
  standalone magic/unknown motions, some resources/models and Limit Bursts remain
  explicit blockers. Nine-knot native reconstruction/status unchanged.

NEXT CONCRETE STEP:
1. Review Daniel's feedback on the two Delita skills (/?reserve=delita).
2. For support variety, resolve Store's single caster-placement contract using
   existing decoder/native placement evidence before any new measurements, then
   scoped normal-attack charge/risk behavior. If still semantically unknown,
   leave blocked; do not invent bounds or standard attack animations.
3. Main-party expansion requires exact matched cure/esuna authoring/control/node
   support plus explicit magic choreography. Select ONE capability tied to a
   concrete heal import; do not restart broad research or add another single-skill
   reserve. Helm Break is available as a small fallback import only after review.

REPRODUCTION:
node tools/inventory_roster_skills.mjs
node --test tools/test_friendly_skills.mjs tools/test_import_wave.mjs tools/test_action_choreography.mjs tools/test_character_pipeline.mjs tools/test_combat_regressions.mjs tools/test_scene_migration.mjs tools/test_enemy_event_tracks.mjs tools/test_hero_buffs.mjs tools/test_skill_support.mjs tools/test_skill_damage_timeline.mjs tools/test_source_command_metadata.mjs tools/test_null_initialization_flags.mjs tools/test_source_only.mjs tools/test_source_import_profiles.mjs
Use working Python C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe
with PYTHONUTF8=1 and PYTHONPATH=tools;tools/memorial for the existing three Python
test modules. PowerShell quote semicolon-containing env values.
Browser: existing Vite3000; receipt sink3152 is preview_original_skill.mjs using
tools/data/braver-20261101/source/plan.json. Run friendly/area checks in the Delita
reserve test page; frozen and guards in the default-party page. Native/APK stays
untouched. Audio IDs/cue times preserved, no playback/background coupling.

PRESERVATION:
New raw staged receipts/plans/review screenshots live in
tools/data/roster-expansion-20261101/. Its secure.py uses an alternate index and
explicit allowlist, read-tree0666f6a, commit-tree and a new scoped ref. It is
non-idempotent after --save: inspect checkpoint.json; do NOT blindly rerun.
Prior source-import-wave/braver/source-only archives remain prerequisites for a
new PC. No pending product edits are intentionally left half-implemented.

## CURRENT RESUME: import wave resumed; eleven technical Source skills (2026-11-01)

Daniel personally accepts corrected Braver's choreography/VFX/completion. All9
previous Source skills are accepted; import pause revoked. New2 are technically
complete and battle-tested but awaiting Daniel's personal visual review. Latest
scoped ref codex/source-import-wave-20261101; exact commit in
tools/data/import-wave-20261101/checkpoint.json, parentacad5e8. Shared HEAD63977b0
and real index72fe85975697e59e357ef726de6bd0fbc4e19c838e5401668ccc81d85dbda6f9
remain untouched. Preserve unrelated dirty work. No push. Source-only is complete.

COMPLETED:
- Delita253000205/FFT Shield Break202180: full orange unit slash+armorbreak,
  2 members/30 nodes/9 textures;F80 (=raw40+prefix40),MP12,reviewed2x physical
  then+20% physical vulnerability3 enemy phases. Original7000/-60%5turns preserved.
- Jack254000603/FFTYPE0 Piercing Gleam203050:2 white unit slashes+armorbreak,
  3 members/30 nodes/9 textures;F91 (=raw40+prefix51),MP11,1.4x physical then
  +15% vulnerability3 phases. Original140/-40%3turns preserved.12 checked body
  tracks+portraits each; play /?reserve=delita or /?reserve=jack. No special loader.
- Explicit mandatory choreography for both: target approach,one exported atk,
  return. New reviewed-adaptation basis is honest developer review of the complete
  physical Motion1/move1 profile; NOT personal/native whole-action verification.
  Nothing maps Motion2 to a default body. Existing9 contracts/assets stay unchanged.
- plan_source_imports --compose-unit-effects composes exact form prefixes with
  existing common compiler/resolver before stage. Failures become per-candidate
  intakeBlockers; stage rejects BEFORE extraction instead of using only raw skill
  effects. Valid siblings continue. Selection/staging still grant no publication.
- Generic browser reserve check now asserts exact target-only status as well as
  hit/MP/body/cleanup; no per-skill harness branches were introduced.

ACTUALLY CHECKED / tools/data/import-wave-20261101:
- node-final.log:53 Node tests/no skips,41 combat assertions. New tests check exact
  source prefixes/events/raw metadata and mandatory body review on both new units,
  plus mixed success/blocked composition batching. python-final.log:10 tests;
  blocked composition cannot call the skill-only extraction function. Build passes
  33 modules, existing chunk advisory. Common original player/motion adapter and
  BattleScene code unchanged. Previous9 body/skill/VFX identities checked.
- delita-battle.json / jack-battle.json: full actual action/effect duration,explicit
  clip sequence,second target,MP shortage/unresolved choreography rejection,one hit
  and exact target-only status,lethal no spillover,victory/wave MP88/89,restart0
  variants. Five animation samples per skill preserved; inspected here.
- frozen-cloud.json:3 original default-party frozen frames0 changed pixels.
  battle-guards.json:6 unavailable reject,Barret4hits/4bullets,Cross victory/wave80,
  shutdown and source-error fail closed. Older unchanged9 full-action and182/180
  native writer results reused; no need to repeat native research.
- validation.json pins results; preserved-identities.json pins unchanged prior
  unit/skill/VFX files and player. No new original semantic/native pixel claim.

BLOCKED / NO PUBLICATION:
- Fencer Manastrike202700 needs atk_slash3_yellow.bmb matched authoring/controls
  in the composed UNIT prefix. Skill-only known resource names were insufficient.
- Warrior of Light201000104 Armor Eraser206510: complete BMB resources staged,
  but offline body at tools/data/characters/warrior_of_light/stage-Tar3bb/prepared/
  warrior_of_light has idle duration0 and failed validation. No successful body
  receipt, tracked recipe, published character or skill. No guessed timing fix.
  Zero source timing could be a static-pose convention; semantics not established.
  Separately, pure Motion1 non-damage support markers remain blocked by the common
  importer Motion2-only support gate. No code for that gate was changed this turn.

NEXT EXACT STEP:
1. Reuse current checkpoint/receipts, don't rerun unchanged intakes/native tests.
2. remaining/candidate-shortlist.json has49 resource-NAME overlap candidates,
   derived from the saved51 minus2 published commands. NOT49 importable skills.
   The global census stays its historical snapshot; no full rescan was needed.
3. Promising bounded next profile is Armor Eraser206510 via another actual owner
   (Loren100009105,Shatal100016304,Basch212000905) or Defense Kill211020. Neither is
   approved. Inspect exact form/body and composed prefix first. Only after those
   gates pass, extend the shared non-damaging Motion1 marker compiler using the
   existing verified offset rule; do not add damage or guess original timing.
4. Preserve mandatory choreography, corrected Braver and accepted9 baselines.
   Original body dispatch beyond reviewed profiles remains partial. New2 need
   personal approval, not more pixel-perfect work. Audio references remain opaque,
   preserved/non-playing; background/music untouched.
5. Session scripts under this folder already ran; preparation/publication and
   document/checkpoint/archive helpers are not blindly idempotent. Inspect first.

Preservation supplement: tools/data/visual-preservation/source-import-wave-20261101.zip,
verified SHA/read-back receipt in preservation.json. Keep earlier supplements too.

## CURRENT RESUME: Braver corrected; import wave paused (2026-11-01)

Local scoped checkpoint: codex/braver-choreography-20261101, exact commit in
tools/data/braver-choreography-20261101/checkpoint.json, parent50950e6. Active
shared HEAD63977b0/real index72fe85975697e59e357ef726de6bd0fbc4e19c838e5401668ccc81d85dbda6f9
are preserved. Do not reset/checkout/add-all/push. Unrelated dirty work remains.
Session helper scripts have already run; do not blindly rerun metadata snapshots,
documentation prepends or exclusive checkpoint/archive creation.

USER CORRECTION / ROOT CAUSE:
Daniel personally confirmed Braver BLUE VFX but rejected its normal atk clip.
Our recipe had guessed atk + full target dash. The executor then unconditionally
played that1.68s clip;F6 damage occurred independently near its beginning. There
was no extra damage or a timing-adapter-generated body request. The unchanged
sourceDamageEvents helper only maps hit frames. Existing native motion1 evidence
is effect composition, not body selection. Never infer a body clip from motion2.

IMPLEMENTED / PRODUCTIVE:
- actionChoreography (source-action-v1) is mandatory for Source admission/import.
  Explicit target/step/stationary movement; prepared or source move-cycle travel;
  explicit readiness; clips with independently timed phases OR rest body. Clip
  presence/duration/nonoverlap and raw motion/move provenance are checked. Unknown
  modes/missing review reject before MP. No implicit atk or clip replacement.
- Eight accepted skills now explicitly retain their SAME clips/readiness/travel.
  Braver uses step/rest with no attack clip. Half scaled idle height travel (72px)
  and move clip cycle66.67ms per direction are transparent reviewed adaptations,
  not a native measurement or a skill-specific timing constant. No universal
  Motion2-to-step rule was introduced. The recipe records Daniel's observation.
- Gameplay/VFX/body/recovery clocks remain separate. Rest recovery begins after
  last relevant gameplay event; clip mode after final clip. Independent phase
  timers are cancelled on shutdown and not prematurely by early hit completion.
- Nine VFX manifests/all used textures unchanged (46 pinned identities), original
  player/native simulation and hit adapter unchanged. No new parser/GPU/native
  investigation, new skill, original data deletion or renderer hack.
- Character import validates against actual checked body when present; offline
  body receipt may be used before publication. Multi-phase/step requires a checked
  body; incomplete reviews can't use a good VFX plan as whole-action approval.

ACTUALLY CHECKED / tools/data/braver-choreography-20261101:
- node-final.log:50 Node tests/no skips,41 direct combat assertions. New tests
  verify no attack clip for rest mode, same-frame hit/support barrier, independent
  multi-phase playback after early damage, shutdown cancellation and import gate.
- python-final.log:9 tests. Preserved VFX plans compare unchanged except current
  recipe provenance hash, independently verified against the actual recipe.
- build.log:33 modules/pass; preexisting chunk-size advisory only.
- battle-reserve.json: no atk or magic_atk requests during full Braver duration;
  sequence standby/move/idle/move/idle; second target,one hit/MP36,debuff,insufficient
  MP/unresolved choreography rejected,lethal no spillover,wave MP64,restart cleanup.
  Gameplay release~218ms from VFX start (old observed example~1965ms); source travel
  also occurs before VFX. Hardware/polling samples, not native measured timings.
- battle-eight-regression.json: all8 accepted old Source actions complete.
- frozen-cloud.json: all3 original default-party Cloud frames0 changed pixels.
- battle-guards.json:6 unavailable skills reject, Barret4hits/4bullets, Cross
  victory/wave80, shutdown variants0 and Source error fails closed.
- Five corrected Braver animation samples F6/21/45/80/120 are preserved PNGs.
  validation.json pins receipts and boundaries. Visual-identities.json pins all
  unchanged VFX resources. No full native character-motion trace was required.

LIMITS / NEXT EXACT STEP:
1. There are9 published Source skills,8 personally accepted WHOLE actions. Braver
   VFX is personally accepted; corrected whole choreography awaits Daniel review.
2. Larger automatic import wave remains PAUSED per latest request. Do not resume
   the51-name shortlist automatically before correcting/accepting choreography.
3. Native precise step distance/duration, body selector dispatch for arbitrary
   motion IDs and more complex action transitions are NOT reconstructed. Current
   step dimensions are explicit adaptations. If these become a concrete blocker,
   observe body clip IDs/transitions plus movement endpoints/timestamps linked to
   the same skill clock. Ordinary videos alone do not prove internal dispatch.
4. Preserve existing Prepared plans as VFX references. Braver's old atk/dash
   preview is NOT a valid full-action reference anymore. Do not republish it over
   the corrected runtime metadata. The current choreography contract is the
   authority for body/readiness/travel; plan.presentation is historical preview
   placement/adaptation data, not evidence of original body selection.
5. Corrected runtime is at /?reserve=cloud_ac. Reproduce via
   /tools/test-source-scene.html?reserve=cloud_ac&captureOrigin=http://127.0.0.1:3152
   -> Check imported reserve lifecycle. Default party for frozen Cloud checks.

Prior pre-fix checkpoints/archives remain. New supplement:
tools/data/visual-preservation/braver-choreography-20261101.zip; verified SHA and
read-back receipt in this session's preservation.json. Keep prior archives too.

## CURRENT RESUME: Braver published; nine Source commands (2026-11-01)

Continue from the local ref codex/braver-source-20261101 and the exact commit in
tools/data/braver-20261101/checkpoint.json (parent2f5a7ab). Shared active HEAD63977b0
and real index72fe85975697e59e357ef726de6bd0fbc4e19c838e5401668ccc81d85dbda6f9
remain intentionally untouched; preserve the unrelated dirty work. No remote push.
Source-only is DONE. Do not restart Legacy removal or the global census.

COMPLETED:
- Cloud AC207001605 Braver233930,14 body tracks/portrait and complete two-member
  visual plan published. Play /?reserve=cloud_ac; default party remains unchanged.
  Nine technically playable Source skills, previous8 personally accepted;
  Daniel still needs to review Braver. Source player/old8 manifests unchanged.
- Shared Motion2 zero-prefix event compiler preserves F6 without unit prefix;
  strict source/composition identity,100-percent hit distribution, malformed hit
  rejection. Motion1/Cross/Armor timing preserved. No skill-ID rendering branches.
- Reviewed Braver cost36,4.5x physical,F6 one hit followed by +20% physical
  vulnerability3 enemy phases. Raw original DEF-60%/5turns preserved separately.
- Shared --profile source-preview-v1 automatically resolves matched projects and
  accepted preparation switches; required shader/renderer/body/recipe checks stay.
  Three preserved plans reproduce exactly. Missing authoring stays a blocker.
- Existing battle harness now enumerates current party Source skills dynamically,
  plus a reusable single-target reserve lifecycle check; no per-character loader.
- Census shortlist mode ranks51 new commands with already-known effect NAMES.
  This is NOT51 unlocked skills. No version/form/whole-command approval inferred.

ACTUALLY CHECKED / tools/data/braver-20261101:
- node-final.log:48 Node tests/no skips, including38 direct combat assertions.
- python-final.log:9 tests, including exact profile reproduction for Braver,
  Armor Break/Aura Ball and absent-project rejection. build.log passes32 modules;
  existing bundle-size advisory only. Later changes are offline tooling/tests/docs.
- battle-party.json: five old Cloud + Seal Evil + Braver complete actual actions.
  Braver one MP36/one hit, gameplay~1965ms after cast starts, independent effect
  tail, body home. battle-eight-regression.json: ALL8 prior commands pass.
- battle-reserve.json: Braver second-enemy selection, MP shortage rejection,
  locked-target lethal without spillover/status on dead, victory/wave MP64 and
  restart cleanup. Five actual animation samples F6/21/45/80/120 saved PNGs.
- frozen-cloud.json: three original default-party comparison frames0 changed
  pixels. battle-guards.json:6 unavailable entries reject, Barret4hits/4bullets,
  Cross lethal/wave MP80, restart variants0, source errors fail closed.
- validation.json pins receipts and unchanged8 manifests/player/native files.
  182/180 original writer evidence is reused, not rerun. No emulator changes.
- Initial failed checks were audit folder placement, SQLite-row prototype test,
  test clicking wrong interactive object, and missing Python import path; corrected
  causes only, no geometry/renderer adjustments to make tests green.

ACTIVE INPUTS / LIMITS:
- source/plan.json (not the earlier unused root plan.json), source/skill-source.json,
  composition.json,composed-report.json; recipe tools/characters/cloud_ac.json,
  presentation tools/presentations/cloud-ac.json. Original hashes: impact
  18adfa7d8e479e73e3b855bfb0ef93c4177e9a4365e9030f8a7a50a5df229a9a;
  armorbreak6e38587d6ecaad59bb19a08c3c9be539bd00ce2944d6c30ba49eeafa3da86933.
- Two visual members startF4/F5; two source sound events remain metadata-only.
  All56 nodes/15 textures/7 models resolved, no omitted drawable/emission.
  coverage.json explicitly records accepted-profile approximations, notably model
  billboard with tilted ancestor, broader parents, materials and ordering. They
  were NOT newly reconstructed/certified. All geometry still comes from sources.
- Known source-only rules, source-preview integration, flash coverage and quick
  action completion preserved. Braver body runs its full existing attack; no fixed
  artificial speedup added. No claim that its body/camera matches native FFBE.

NEXT EXACT STEP:
1. Reuse validation/checkpoint/archive, don't rerun unchanged native/pixel tests.
2. For further imports use shortlist/candidate-shortlist.json (51 ranking-only
   candidates) generated from the existing census, not a new global rescan.
   Prefer an owned simple damage/break command with an already supported complete
   effect profile; inspect its exact form and composed prefix before body export.
   Armor Eraser206510 / Warrior of Light201000104 or Shield Break202180 are
   resource-overlap candidates only, not inspected/published new characters.
3. AC follow-up intake is already in next-candidates/candidate-audit.json.
   Do NOT redo it unchanged: Blade Beam233931 needs process lanes/non-point
   emission/missing front project; Finishing Touch233935 needs missing slash
   project and matching vortex alphaTest version; Spin Drive233936 needs type7
   and missing authoring/controls. Defer these rather than inventing substitutes.
4. Use the new shared prepare profile, exact hashes and ordinary publish/battle
   gates. Keep old8 baselines and Braver's sample/metadata regressions. No further
   pixel-perfect work is requested. Audio IDs/times remain preserved/non-playing.

Recovery: retain tools/data/visual-preservation/braver-source-20261101.zip AND the
previous Source-only/eight-source supplements. The new local archive includes
staged originals/prepared plans, exact projects/body, new receipts/screenshots and
the scoped checkpoint; preservation.json records its verified SHA/contents.

## CURRENT RESUME: Source-only migration secured; quota conservation stop (2026-10-28)

Daniel personally accepts ALL8 Source skills. User requested saving progress at
approximately4% quota. No further integration was started after that instruction.
Latest checked Source-only checkpoint: refs/heads/codex/source-only-20261028;
tools/data/source-only-20261028/checkpoint.json records its exact commit.
Pre-removal baseline71e23a4 (parent d15a00f) remains separately recoverable.
Active shared HEAD63977b0 and real index SHA72fe85975697e59e357ef726de6bd0fbc4e19c838e5401668ccc81d85dbda6f9
are intentionally untouched. Preserve the many unrelated dirty files. No push.

COMPLETED / PRODUCTIVE:
- Removed Source/Legacy switch, preference/query/fallback state and mode setter.
  Source readiness/error failure disables skills before MP; normal attacks remain.
- Removed baked skill spawning, sheet/particle effect adapter, old area/melee/cast
  substitute paths and fixed old damage delays. Source is the sole skill engine.
  Boot/Preload no longer load registry.effects; that registry property is removed.
- Deleted src/effects/PreparedParticleEffect.ts and src/types/effects.ts. Moved
  src/effects/sheetSampling.ts to tools/lib/sheetSampling.ts for retained OFFLINE
  archive/export tools. Old prepared public effect files are cold, unreferenced
  data and were NOT deleted because existing resources/foreign changes must survive.
- Retained normal attacks/projectiles, impact barriers, pivots/recoil, standby,
  body/effect separation, damage/MP/buffs/debuffs, victory/wave/restart/cleanup.
  Internal historical comparison policies in originalEffectPlayer are part of
  the ONE Source player, not the retired game fallback. That file and all8 scene
  manifests remain byte-identical to the accepted baseline.
- All8 Source commands now have explicit reviewed gameplay events. Early Cloud
  single hits remainF6/F30/F4; Cross keeps5 hits. Old Blade2-hit provenance stays
  in originalCommand, reviewed hitCount is1 (same accepted actual gameplay).
  Hash-pinned preserved source receipts validate older non-composed preview plans;
  no new geometry or timing reconstruction was silently inferred.
- Aerith Healing Wind/Curaja/Banishga and Barret Big Shot/Grenade Bomb/Satellite
  Beam remain original metadata with NOT IMPORTED status. They cannot execute or
  spend MP. Imported commands sort first in menus; normal Barret burst still works.
- Source-only character importer rejects old execution/bake bindings; preserves
  exact original command data for unavailable entries. Historical research/bake
  tools and original resources remain. Seven obsolete combat-renderer tests and
  two old publication tests retired; shared gameplay coverage retained/adapted.

ACTUALLY CHECKED:
-45 Node tests pass, no skips, including38 direct combat assertions. Log:
  tools/data/source-only-20261028/node-secured.log. Build passes32 modules;
  only the existing chunk-size advisory (build-second.log).
-Browser receipt68: ALL8 full actions through Source only, expected damage/hits,
  once-only MP/Source, statuses/self buff, body home and independent decorative tail.
-69: original default Cloud/Aerith/Barret party, all3 frozen Cloud frames0 changed
  pixels. First attempt used CoD reserve and changed the background character;
  that mismatched-condition result is NOT a renderer regression or acceptance.
-70: all6 unavailable commands reject without MP/state mutation; default Barret
  still4 hits/4 bullets; Cross lethal victory/wave MP80 persistence; pending-action
  restart destroys old variants; renderer-error notification fails closed.
-Earlier27 Python BMB/native results reused: those implementations/data unchanged.
  New census identities and category arithmetic independently checked. No new
  native recording, emulator modification, audio/background work or pixel research.
-Initial test failures referred to removed adapters, deleted fixture helper and
  now-unavailable fake skills; repaired fixtures/assertions, final logs pass.

GLOBAL READ-ONLY CENSUS (not a full renderer certification):
tools/inventory_source_catalog.py -> tools/data/source-only-20261028/catalog.
3311 master forms /1573 unit series, all3311 have local source PNGs (not a claim
of fully validated animation tracks).10052 unique learned active abilities/magic;
3141 linked limit bursts separately;13193 unique original commands total.
21008 series/command pairs:8 playable,0 confirmed fully-importable unpublished,
9 partly prepared,10345 known-mechanism blocked,10646 not reliably assessed.
Unique-command categories differ because a shared command can have multiple owners.
Only49 existing bounded intake cases were reused for BMB capability conclusions.
Archive/authoring presence alone is NOT support; uninspected PNG/model dependencies,
resource versions, equipment/enhancements/quest/cooldown-child ownership remain
unverified. LB command execution is not implemented. See summary.json limits.

INCOMPLETE / NO PUBLICATION:
The next bounded candidate is Cloud(FFVII:AC) Braver233930. Existing tools staged
all referenced originals/resources; wave-selection-audit.json reports NO explicit
visual intake blocker. Its14 body tracks were prepared OFFLINE only. Nothing was
added to tools/characters or public registry/assets for this candidate.
Inspection: tools/data/characters/cloud_ac/report.json; body-preparation.json
points to tools/data/characters/cloud_ac/stage-kmzFMC/prepared/cloud_ac.
Candidate recipe: tools/data/source-only-20261028/cloud-ac-recipe.json (skills empty).
Original command: motion2,move1,MP36,oneF6 hit,process1@24; full wave-source data
under tools/data/source-only-20261028/cloud_ac-233930. No Prepared plan, gameplay
review, productive cast or visual approval exists. It does NOT count as skill9.

NEXT EXACT STEP after reset:
1. Read this section + secured-validation.json; use the Source-only checkpoint,
   not active HEAD. Do NOT rerun unchanged tests/native research just to resume.
2. Compose Braver233930 with existing compose_skill_effects/resolve_composed_skill,
   then prepare it from the existing staged originals and offline body with exact
   matched authoring; inspect capability/omission report BEFORE publication.
3. sourceDamageEvents currently admits Motion1 only. If the prepared profile is
   complete, add the general evidenced non-Motion1/zero-prefix event adapter,
   requiring exact composition/source IDs/raw frames and zero offset; keep existing
   Cross/Motion1 checks. This adapter is NOT implemented yet. Raw DEF-break values
   must stay separate from reviewed roguelike physical-vulnerability balance.
4. Only after full preparation/review publish Source-only body/skill, test actual
   battle and all8 baseline regressions. Otherwise document and defer candidate.
5. The global census was generated BEFORE the final Braver intake, which is a
   separate additional case; don't call it a fully-importable count or invent
   unlock estimates. Improve candidate ranking/coverage incrementally.

Other known limitations: Barret's old recipe names sprite207000205 while the
adopted runtime body is207000204. Body was intentionally NOT replaced/rebaked.
Unavailable metadata was preserved using its existing inspected source catalog;
resolve form identity before any future Barret Source/body publication.
Meteor/Lifestream/unknown node7/type15/active curves/materials/versions remain
bounded blockers, not substitutes. Audio IDs/events remain intact and non-playing.

Local archive: tools/data/visual-preservation/source-only-20261028.zip, checked
against its internal SHA manifest; preservation receipt sits beside checkpoint.json.
Keep this supplement AND previous eight-source archives when moving PCs. The
original pre-migration code is in baseline71e23a4 and before/ in the supplement.

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

## Current: eight playable Source skills; optional Cloud of Darkness reserve (2026-10-28)

Resume from refs/heads/codex/eight-source-skills-20261028 and the exact commit in
tools/data/autonomous/eight-source-skills-20261028-checkpoint.json. Parent is
4cdea84484f682e9d3390fde5769b1813dc7687c. Feature checkpoint59e4bb6;
latest child corrects the new character game tag to FFIII (no rendering change).
ACTIVE shared HEAD remains63977b0;
real index SHA72fe85975697e59e357ef726de6bd0fbc4e19c838e5401668ccc81d85dbda6f9
and unrelated dirty work are preserved. Do NOT reset/checkout/add-all/push.

Daniel PERSONALLY ACCEPTS all prior6, including Seal Evil/Trigger Smash. NEW:
Cloud of Darkness203000803 Armor Break201150 and Aura Ball203280. Total8 technically
playable,6 personally accepted,2 ready for Daniel's review. Both new full actual
battle animations were inspected here. No native whole-skill fidelity claim.

Play: http://127.0.0.1:3000/?reserve=cloud_of_darkness (slot3, select3 then W/E).
Default URL retains Cloud/Aerith/Barret. No removed hero/Legacy skill or new loader.
Reserve validates registered identity and uses actual battle config; generic melee
does not inherit Barret burst. New body's13 tracks/pivots/portraits are published.

Implemented:
- Shared Source clock combines damage/status tracks, stable damage-before-status
  at equal frames. Locked death cancels later events; no target spillover or MP
  duplication. Mixed hitCount must match damage events; self mixed remains blocked.
- Physical vulnerability and outgoing attack reduction, strongest refresh/no
  stacking, finite enemy-phase expiry. Capture attack multiplier BEFORE aging so
  the final eligible attack remains reduced. Old statuses/default damage unchanged.
- Armor: complete unit prefix +73,2 members atF74,33 supported nodes/9 textures;
  F113 one1.2x physical hit, then x1.15 physical vulnerability3 phases; MP7 once.
  Aura:1 target member atF41,5 nodes/2model branches/1texture; sound-only group
  retained. F120 x0.8 attack3 phases +40% Silence1 phase, no HP damage; MP30 once.
- Source raw original processes/acquisitions preserved separately from reviewed
  roguelike balance. Accurate learning labels Armor4/14, Aura6/38; visual preview
  recipe remains frozen, metadata-only final publication did not rebake body/VFX.
- --prepare-body-only validates offline sprites without publication;
  prepare_original_preview.py --unit-assets consumes identity-checked staging.
  This removes the new-character body/presentation bootstrap dependency.
- plan_source_imports.mjs --select 'character:*' enumerates owned active commands,
  deduplicates selections, grants no playback approval.11 actual CoD commands,
 2 playable/9 blocked. Named staging selections now preserve separate audit names
  instead of overwriting one candidate-audit.json. Cached receipts were restored.

Validation (tools/data/skill-seven-eight-20261028/session-validation.json):
-44 Node tests, including45 custom combat assertions;27 Python, no skips.
-Build passes35 modules; only existing bundle-size advisory.
-Actual browser receipt64 FINAL: both skills, once-only MP/damage/status, actor
  recovery/decorative tails, two target copies, actual enemy attacks480 instead
  of600, final-phase expiry, stale-event cancellation, lethal victory/wave MP93
  persistence, reserve basic attack1 hit/0 bullets/0MP.60 is provisional before
  the longer-name UI fix/basic-attack check, not the final acceptance receipt.
-61 all13Source/Legacy scenarios;62 Trigger plus boosted Cross5hits450 and expiry;
 63 Seal;65 full Cross/locked death/victory/shutdown;66 Flash/resizing/camera controls;
 67 frozen Cloud all3 frames0 changed pixels. Preview baseline, NOT native pixels.
-59 prior runtime/body/data identities preserved;5 old JSON checkouts differ from
  Git blobs only by CRLF. Six visual manifests/raw player/native code unchanged.
  Reuse existing182/180 writer result; no repeated identical native recordings.
-Initial missing-body preparation, test member count, optional-hero compile guard,
  nonexistent test reward helper and strict CRLF comparison failures were resolved;
  failed attempts are not acceptance. See session-validation.json.

Sources/plans: tools/data/skill-seven-eight-20261028/{armor-source,aura-source},
prepare-armor.py,prepare-aura.py,cod-preview-recipe.json,body-prepared,feature/
coverage reports and actual screenshots. Recipes: tools/characters/cloud_of_darkness.json,
tools/presentations/cloud-of-darkness.json. New effects use the SAME accepted
experimental player policies. Coverage still labels broader particle facing,
parent alpha, source priority/global/material semantics;0 missing/withheld drawables.
No new native pixels for these2. Sound IDs/groups remain non-playing metadata.

Preservation receipt/archive: tools/data/autonomous/eight-source-skills-20261028-preservation.json
and tools/data/visual-preservation/eight-source-skills-20261028.zip; final game-tag
metadata is retained in eight-source-skills-metadata-20261028.zip. Prior archives
remain intact. Reproduction commands are in the skill workflow. Keep ignored
resources/plans/receipts with the project when moving PCs.

NEXT: Daniel reviews the2 new skills. The functional8-command target is reached;
do not claim8 personal acceptances. Next content cycle should run character:*
intake for a selected additional character and rank COMPLETE resolved/prepared
graphs before new research. Mixed physical-debuff tracks and generic reserve/
body bootstrap are reusable; no further complete unlock count is established.
Meteor/Lifestream stay deferred; CoD's other9 and surveyed Cloud/Tifa/Sephiroth
commands retain explicit authoring/curve/type7/type15/enum/material/hierarchy/
process-lane gates. Source-only wrappers and Barrage need their execution rules,
not invented visual replacements. Original nine-node/native work is preserved,
not declared universally complete. No new recordings needed for immediate review;
no emulator change occurred. No pixel-perfect, audio, music or background work.

## Current: Source Trigger Smash sixth command; Meteor deferred (2026-10-28)

Resume from scoped6a98de3 plus checkpoint receipt
`tools/data/autonomous/source-self-buff-20261028-checkpoint.json`, not active HEAD.
Six technical Source skills:4 accepted Cloud attacks+Seal Evil+NEW Trigger Smash.
Seal/Trigger await Daniel's personal review. No native whole-skill fidelity claim.

Completed:
- Null source initialization+0xc8/+0xcc/locator exported with explicit mandatory
  parent/child contexts; existing160 native blocks and11 source records in two
  sources agree. No compatibility or missing context defaults;0 skill unlocks.
- Reviewed allyEvents SELF/stationary profile in the SAME action clock/player.
  Actor host dimensions/scale used once. Source-only admission/menu paging,
  once-only MP, action completion and shutdown preserved. No new renderer/hack.
- Generic timed physical boost strongest refresh, no stacking, expires after3
  future rounds, clears on wave/restart. Basic and Source multi-hit use it.
- Optional reviewed damageType decouples damage lane from animation pose; old
  defaults remain identical. Original/gameplay metadata remains separated.
- Trigger227151 original two membersF40/F70,7nodes,2PNG/model; no omitted drawable.
  MP55,no damage,eventF120,x1.5 physical. Original130->507650/cooldown/stat/break
  parameters preserved; those FFBE formulas/systems are not silently implemented.
- Measured28-candidate decision:26 remain blocked after Seal/Trigger; authoring
  inputs affect24,type7 affects11,curves9,type4 seven. Counts overlap and do NOT
  guarantee playable yield. New self track unlocks ONE actual Source command.

Meteor DEFERRED: all38nodes/12resources present, independent parameter/context,
inheritance/appearance/emission/texture/geometry gaps remain. No partial import.
Lifestream is next bounded candidate: selected scale curve PLUS process-indexed
second effect branch PLUS friendly party/reraise/barrier rules. Batch now detects
that process-lane gate. Do not claim it only needs a curve. Buster End has unknown
node15/type4 and version gaps; also deferred. Other candidate evidence in
`tools/data/import-decision-20261028/import-decision-final.json`.

Tests/evidence root: tools/data/import-decision-20261028.
39 Node tests incl45 custom combat assertions;28 Python, no skips; build passes
(existing chunk advisory).54 final Trigger+boosted Cross5hits450/MP20;55 Seal;
56 Cross;58 all13Source/Legacy scenarios;59 frozen Cloud0 changed for all3frames.
53/57 are earlier provisional successful blocks; do not replace final references.
Native182/180 writer result reused; its inputs/player/simulator are unchanged.
Initial scope-error and test UUID/RNG failure are documented, not acceptance.

NEXT: bounded Lifestream scale-curve/process-lane preparation using existing
source/pairs before introducing party mechanics. If that reveals broad new work,
re-rank candidates. No new original recording currently required. Preserve all six
Source definitions, frozen visual baselines, Legacy and audio metadata. Do not
return to pixel-perfect optimization or insist on Meteor as the next import.

Reproduce: preserved prepare-trigger.py, scene publication recipe and metadata-only
Cloud import; test-source-scene.html -> Check playable self buff. Immutable
source-self-buff supplement retains originals/resources/plans/receipts and own code;
prior archives remain intact. Active shared HEAD/index preserved; no push.

## Current: verified binary control subset and original-command metadata (2026-10-28)

Resume from scoped00384c3 plus the checkpoint recorded in
`tools/data/autonomous/bmb-source-controls-checkpoint-20261028.json`, not active HEAD.
Five playable Source commands retained, Seal personal approval pending. NEW playable
skills:0; Meteor remains blocked. No new recording/emulator change or pixel research.

Completed:
- bmb_source_controls.py:13 layout slots across Null/Quad/Particle/Model are read
  directly from BMB, including parent selectors/rates and Null type. Unknown values
  and missing fields remain explicit. No compatibility/default guessing.
- Common parser, matched-inheritance preparation and Null locator consume these
  checked fields; unresolved selectors still need exact authoring. Batch intake now
  retains per-node field/offset/missing-input reports even for authoring-less BMBs.
-22 matching original/project pairs,343nodes,1102 field values agree. Four of nine
  additional candidates passed full comparison; rejected files are NOT evidence.
  Corpus and original hashes are frozen in the new supplement; do not rescan all XML.
- Separate rebuilt Seal plan reproduces old shared-player traced output for all287
  frames/two targets. Preserved/published visual plans are unchanged, no new fidelity.
- Original Source commands are preserved under originalCommand (exact raw row+DB
  identity), separately from gameplayReview/recipe balance. Seal was metadata-only
  republished; prior Legacy commands/gameplay fields and all five visual manifests
  are unchanged. Audio metadata retained, no audio playback work.

Evidence: tools/data/bmb-controls-20261028/{comparison.json,meteor-control-status.json,
python-final.log,product-regressions.log,replay-tests.log,session-validation.json}.
26 Python tests pass without skips;32 product Node tests include45 custom combat
checks; separate replay/Null controls pass. Build passes (existing chunk warning).
Actual-game receipts49Seal/50Cross/51all13cases/52frozenCloud pass; three baseline
frames remain0 changed pixels.182/180 writer result reused because its code/inputs
are unchanged. One earlier nonexistent-test invocation failed; do not count it.

Meteor has109 directly decoded field values for38 nodes, but root translation
selection plus other parent/compatibility/emission/texture/geometry inputs remain
unresolved. All three candidate batches were rechecked; zero new skills admitted.
No unknown node4/7, curve, resource ambiguity or source-only requirement was waived.

NEXT concrete step: use existing native setupper/construction code and traces to
map Null root's missing translation/matrix/context flags from its raw BMB record.
The authoring nodeV16 label has no established direct single-bit mapping in this
corpus; do not assume it is absent/constant or derive a default. Add verified slots,
validate the frozen22-pair corpus and a fully authoring-free known effect, THEN
attempt Comet. Native input-state gaps must be named before another diagnostic.
No user interaction is required to begin the existing-reference analysis.

Preservation: bmb-source-controls supplement plus prior Seal/Cross/verified-texture
archives. No push, no unrelated changes overwritten, shared HEAD/index preserved.

## Current: Seal Evil fifth Source command; Meteor intake and audio inventory (2026-10-28)

Final receipts:45 Seal,46 Cross,47 all13 existing cases,48 frozen Cloud (all three0 changed pixels). Final plan/coverage: seal-features-final.json and seal-coverage-final.json in the evidence root.

Resume from scoped e972731 plus the new checkpoint recorded in
`tools/data/autonomous/skill-expansion-checkpoint-20261028.json` (not active HEAD).
Daniel now accepts all four Cloud commands. Aerith Seal Evil229751 is the fifth
Source command, tested/visually inspected here, awaiting Daniel's own review.
5/8 playable, no full-original-fidelity claim. All previous dirty work, active
HEAD and real index preserved. No push; no new recording/reinstall/hooks.

Completed:
- Generic Source supportEvents reuse the reviewed prepared clock/action barrier.
  Source-only admission precedes MP; admitted key survives magic-readiness fallback.
  Status helper supports weakness/Silence/Stop, probabilities, refresh and expiry.
- Seal complete three-member animation (two originals/25supported nodes), MP48,
  no HP damage; reviewed F80 event. Roguelike weakness x1.25 magic/3phases,30%
  Silence3phases/Stop1phase. Current enemies physical, so Silence does not block
  them. This is coherent adaptation, not FFBE's original SPR formula or immunity.
- Hash-reviewed uniform colored Model backdrop fits arena via existing coverage;
  no geometry changes to spiral/cloud, no original-player edit. Four old Source
  manifests/plans remain unchanged. Aerith old sprites/three Legacy commands kept.
- Generic duplicate-original resource resolution checks all candidate bytes first;
  equal aliases accepted with provenance, different hashes still fail.
- Sound-bearing source groups retained in audioSource (metadata only, no playback).
  Eight WAVs;252 .acb paths (250UTF candidates,2XML unknown);126.dat unclassified.
  SE.acb matches live ADB external checksum. Internal cue/codec mapping unknown.

Tests: FINAL Seal receipt45 includes full motion/status/MP/body/tail/shutdown and
actual magic/physical damage controls. Final Cross,13-case regression and frozen
Cloud receipts are summarized in tools/data/skill-expansion-20261028/session-validation.json.
79 Node tests/45custom combat checks, four Python tests and native182/180 writer
regression pass. Build passes with existing chunk advisory. Final F85 screenshot:
`tools/data/skill-expansion-20261028/seal-final--results-3-capture.png`.

Meteor Rain's original38-node BMB and all12resources exist. Exact authoring project
absent; parser still relies on authoring for influence/compatibility/appearance/
emission selectors. Do not invent values or publish partial Meteor. Seven other
candidates have recorded authoring/active-curve/type4/7/resource-version gates.
Trigger Smash is cooldown unlock of a cleanse/ATK buff, not a direct attack.
See the reconstruction map's latest entry for the full candidate table/evidence.

NEXT concrete step: use already matched BMB/BMSLN pairs to inventory and decode
required constant-field selectors (first parent influence/appearance), validate
an authoring-free profile against known plans, then retest Comet preparation.
No broad native research unless this cannot answer a specific missing field.
Audio work is deliberately paused at inventory/structured references. No need
for Daniel or a fresh recording to start this bounded next step. Do not pursue
RGB polishing or count Capsule as another playable command.

Restore/reproduce: use immutable skill-expansion preservation supplement together
with prior Cross/gameplay/verified-texture archives. Original data/large banks stay
ignored. Workflow commands and limitations are in docs/skill-reconstruction-workflow.md.

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

## Latest: verified texture sources and bounded pixel acceptance (2026-10-28)

Scoped parent421c41d; active HEAD63977b0 and real index remain untouched. See the
latest SKILL_RECONSTRUCTION_MAP.md section for all12-frame metrics, criteria and
source hashes. New local checkpoint/ref is recorded in
tools/data/autonomous/verified-texture-checkpoint-20261028.json. No push.

Evidence: tools/data/memorial-audit/diagnostic-v36-texture-state. Current installed
diagnostic r6/revision9 APK SHA561ff22035fe68c2a91b72e92aae1078dc41e1a42059902747399f5054c4be95;
same signing certificate, UID10107. No uninstall, app-data clearing or settings
change. Previous installed r5 and r4 rollback APKs are retained/hashed. Full cold
backup six files was checked for presence/size, not rehashed this session.
ADB127.0.0.1:5575 via C:/Program Files/BlueStacks_nxt/HD-Adb.exe; package
com.square_enix.ffbejpn/.Lapis. Guest screenshots are authoritative; desktop
window images may be stale. All three request files are disarmed.

RunK: actual GPU format/readback and late empty calls. RunL: INVALID/no exports;
ordinary observer calibration captured null. A cold process restart of the SAME
APK passed calibration; runM then captured original CPU upload bytes and GPU
texels, identical for all three textures. Do not reuse the failed run as evidence.
No further emulator work is needed for the current white texture question.

Cause: tutorial-CPK palette texture versions differ from the game. Exact local
PNGs in assets/effect_resource generate the native bytes with the existing Cocos
formula. tools/effects/verified_native_textures.json pins file/upload hashes;
prepare_texture_upload.py --resource-bindings fails incomplete/mismatched
selection. No native intermediate matrices/vertices/texels feed the new replay.
No new runtime shader or precision workaround. Ordinary Cloud assets unchanged.

Receipts in diagnostic-v35-render-context:26 old texture metrics,27 verified
sources,28 actual controlled BattleScene,29 frozen Cloud,30 full13-case combat.
Black mean0.178946270 ->0.000357365; maxRGB5 ->2; alpha max6 ->1.
Nine of12 frames exact RGBA on all3 backgrounds. Zero pixels above2; largest
nonzero black residual component6 pixels/max1. Remaining code-level edges are
consistent with backend raster precision, not uniquely explained. Original
SUBPIXEL_BITS8 vs browser4; all other newly observed relevant states agree.
The controlled data profile is sufficient for transfer testing; not full-skill,
automatic seed/host, arbitrary graph or9/9 acceptance. Keep whole nodes0/9.

182 writer packets /180 exact /same2tiny positions preserved.39 Node regressions,
21 final targeted tests,2 Python source-selection tests and build passed (old
chunk advisory). Cloud frozen frames all0 pixels changed; Source/Legacy MP,
hits, recovery, effect completion, victory/waves and cleanup pass. Satellite Beam
remains a product control only, no BlueStacks fidelity evidence.

NEXT: eff_capsule_001.bmb, retained5nodes/123 isolated native states, nonuniform
texture, ordinary Basic blending, OneX and constant tilted Default parents.
Current connected live branch is neutral-parent/VelocityX/two-texture Add only;
implement the evidenced OneX/Basic + tilted constant-parent profile generally,
then compare the123 old states. Do not claim current Capsule live admission or
native GPU pixels. Use the existing connected-second-effect.md, request/export,
nativeDefaultTransform, native Particle scheduler/material helpers. Only after
state-level admission extend the existing source observation for a native pixel
reference. No new parallel engine or white-effect pixel polishing.

## Current: original source-priority submission integrated (2026-10-28)

Verified archive: tools/data/visual-preservation/priority-submission-20261028.zip,
955598254 bytes /1987 files /45 plans, SHA256
119bbd21565f9448992ce91c514540d7bee5c1feefc3d2521a16b171483f3000.
It precedes only this checkpoint metadata and the new Git raw-byte checkout guard
for nativeDrawSubmission.mjs; source bytes and verified image results are identical.
The scoped checkpoint tests a separate Windows CRLF checkout of both pinned
runtime files. Keep the real dirty checkout/index; no push authorized.

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

### Exact continuation inputs and current code

Scoped parent1b40a1924184abcdb6d4e2657e24cde83995bb90; active HEAD remains63977b0
and the real Git index must be preserved. New checkpoint ref is
codex/priority-submission-20261028; receipt with exact commit/guards:
tools/data/autonomous/priority-submission-checkpoint-20261028.json. No push.

Code: src/effects/nativeDrawSubmission.mjs + originalEffectPlayer.mjs; offline
tools/prepare_draw_submission.py; original control tools/memorial/emulate_draw_priority.py.
New source inputs: header0x4c=full-Z (unsupported),0x4d=priority enable; Quad
parameter+508 and Particle+408 are priority floats. Groups correspond to emitter
metadata; do NOT sort individual particle meshes or remove alpha-zero live packets
before grouping. Native metadata combsort/ties are tested independently.

Evidence root: tools/data/memorial-audit/diagnostic-v35-render-context.
priority-native-controls.json =134 original instruction cases; old
priority-controls-overlap-invalid.json is discarded/labelled. Program input:
program-j-ordered.json. Actual game final submission receipt22 (F13 empty);
receipt21 has a mutated late F13 observer array and must not be used for that join.
Final pixel before19 /after23, all12 frames and3 backgrounds. Receipts13/20 are
intermediate per-mesh sorting and do not supersede final emitter grouping.
Final Cloud frozen24 (0 changed pixels), full combat25. Keep all old receipts.

Pixel report/images: priority-pixel-comparison-final-j.json/.png/.webp.
The final PNGs preserve opaque raw RGB; alpha metrics remain original RGBA.
Run tools/compare_native_pixels.py with --fixture pixel-fixture-j.json,
--before browser-review-19.json, --after browser-review-23.json, --output,
--image and optional --animation (full paths relative to the evidence root).
The tool verifies that PNG RGB sums/maxima match measured receipt statistics.
Animation is12 visible controlled steps,50ms/step, NOT a full original skill.

Shared sampler hypothesis15 has exact identical black PNGs and all metrics;
world placement18 has only negligible early changes. Both are test-only and
must not be enabled based on these results. First next useful gap is actual GPU
texture format/upload bytes and dithering/color precision. Relevant original
Texture2D format getter/init code is saved; a conversion branch exists but its
live selection is unknown. No supported reason to guess RGBA4444/mediump/etc.

Extend the existing35/r4/export7 GPU observer, with current backups and same-key
procedures, only for a bounded upload/state observation. Correlate GL texture
identity with source resources; no hardcoded old GL IDs. Capture actual formats,
types, dimensions, uploaded bytes/hash and DITHER/color-bit states. Compare the
three prepared Cocos RGBA8 uploads. Do not repeat ordinary recordings or the
134 unchanged controls. Existing J remains the animation geometry/time oracle.

No BlueStacks work was done in this block. Last verified access/build and the
ADB screenshot/touch route below remain historical, not a current connection
check. Windows capture may be stale; do not infer an app hang from it. Before a
new diagnostic update, verify current app state/backups as already documented.
No user interaction is currently pending.


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
## Current restart point: native pixels captured, prepared upload integrated (2026-10-28)

Verified preservation snapshot: tools/data/visual-preservation/native-pixels-20261028.zip,
812791680 bytes /1842 files /45 plans, SHA256
c81ebac0e483175bd2b3558b0b1e0e536336e64834da235c0f6a1a4708af90d1.
It includes new native pixels, metadata, prepared uploads, code, Cloud baselines
and receipts; APK/private emulator configuration backups remain separate.
Checkpoint ref: codex/native-pixels-20261028; exact commit and guards are in
tools/data/autonomous/native-pixels-checkpoint-20261028.json. The archive was
verified before this checkpoint-metadata paragraph was added.

Latest work continues scoped8bd5379 /6ab0858. NEW native runJ completed; no user
preparation is pending. The apparent app hang was stale Windows capture, NOT an
established guest startup failure. Current35/r4 actually reaches menus/battle
through direct Android framebuffer/input. Preserve this finding; do not repeat
blind reinstalls, disable hooks or change graphics because of stale host images.
Original vlcn graphics and35/r4 restored; UID10107, App data and assets retained.
No uninstall/clear/root. Windows capture itself remains unresolved.

ADB: C:/Program Files/BlueStacks_nxt/HD-Adb.exe, serial127.0.0.1:5575,
packagecom.square_enix.ffbejpn. Latest observed PID3359 is historical; re-query.
Installed r4 APK SHA256e2a48522a5a08ab5554d8552673a1346f73b09b4c1eacdf2d48a3b20c7aa2f27,
liveExportRevision7. All3 diagnostic requests disarmed afterJ. No new APK needed.
Rollback APKs and signed original-community control retained locally. Recovery
configuration backups contain private host settings: do not publish them.

### Proven autonomous guest route

The user expressly authorized ADB/emulator control. Prefer adb shell screencap
followed by pull and view_image over stale sky/Windows images for this instance.
Use fresh guest screenshots before actions. At1080x1920, the verified route is:
title tap540,1600 -> main Memories455,1825 -> Season1 left95,300 -> wait for
transition -> JP Memories left95,300 -> Event Battles -> Golden Bomb520,1055 ->
chapter1 520,360 -> INT510,930 -> Depart535,1690. Battle load takes about10s.
Cloud swipe95,1260 to470,1260 over450ms opens skills. Brave Slash800,1630;
prepared execute255,1290. These coordinates are recorded evidence, not a license
to execute blindly on a changed view. Route screenshots are in diagnostic-v35-recovery.

### Completed evidence and integration

RunJ: tools/data/memorial-audit/diagnostic-v35-render-context/run-j.jsonl,
SHAab050c69b1df2e4eeac6c73bef2cf99d5417d9d26220c5f6740ca0d64fd3c15b,
7250events/21frames/182writers,180exact with SAME2 tiny parent-center residuals.
Actual GPU output native-j/render-v35-j-* covers nonempty frames1..12 plus empty
tail13..17. Frames18..21 have no pixel capture. Controlled white-source-for-green
substitution, initial seeds, root[149,736,0], scale1.775 and measured camera/scissor
are explicit inputs. It is not unmodified whole Brave Slash or source-independent
seeding. program-j/pixel-fixture-j retain input boundaries; native parent/output
matrices/vertices are NOT runtime inputs.

Common player now optionally consumes measured GL_LINEAR sampling and offline
prepared Cocos RGBA8 bytes. Formula RGB=(RGB*(A+1))>>8 preserves alpha, proven
against144 original ARM bytes/2560 synthetic pixels. src only loads prepared
bytes; source decoding remains tools/. Scope limited to admitted native packet
profile; all ordinary Cloud/Legacy plans unchanged. Four manifest differences
are player provenance only. tools/test_scene_migration baseline identities were
updated AFTER actual frozen GPU review10 confirmed0 changed pixels for all3.

Pixel baseline review4 versus integrated9: black signal-union meanRGB F1
16.6883->1.9227 (max79),F6 15.2011->0.4526(max4),F12 18.8107->0.4167(max2).
Not pixel identical. White union includes full background; do not use diluted
means as fidelity proof. Review8 stable-blend-bucket HYPOTHESIS dropsF1 to0.2733,
but ordering is NOT integrated/proven general. Review6 is invalid cached-helper
upload evidence; preserved and explicitly excluded. Full numbers and image:
pixel-comparison-summary-j.json, native-pixels-j-comparison.png.

Actual product receipt11:6frames/67packets/1206worldvalues/natural completion1.
Receipt12 full existing combat migration PASS. Node command in newest map passes
27 tests including40 combat checks; build passes with old chunk-size warning.
Complete original nodes remain0/9. No whole-skill or universal fidelity approval.

### Next exact blocker; no new capture initially required

GPU submission is2,4,3,6,8, unlike CPU source DFS2,3,4,6,8. Reconstruct the actual
command sort key/priority enablement/stable ties from retained original
DrawMetaData::MakeDrawCommandList and bmfw::Animation::Draw. Existing bounded
draw-order-original.json/symbols locate relevant code and BMBflag+0x4d. Do not
replace lifecycle traversal with visual sorting or promote one observed blend
order to a universal law. Need independent sort controls before runtime change.
Also investigate original shared texture919 sampler aliasing between node6's
layers versus independently cloned address modes. Then classify small raster/
blend precision residuals. Do not chase the two tiny parent positions first.

### Reproduction and preservation

Vite3000 and receipt sink3152 were running; do not restart the existing sink and
overwrite numbered receipts. Check current ports/processes before using them.
Canonical browser entry /tools/test-native-pixels.html; prepared button uses
shared player, not a second renderer. Actual product tool
/tools/test-source-scene.html has Check prepared native texture upload.
Frozen versioned pixel-review-j-v5.html/pixel-engine-j-v4.mjs and product-pixels-j-v1.html
preserve the exact executed helpers in the evidence folder. Vite excludes tools
from watcher; reload/version carefully when a helper changes.

Python: C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe
PYTHONPATH for original instruction control:
tools/data/native-locator-emulation/python-deps;tools/data/memorial-audit/python-deps;tools;tools/memorial
Use tools/memorial/prepare_texture_upload.py as documented in newest map.

Active HEAD remains63977b0 with preexisting dirty/untracked work. Scoped checkpoints
use an alternate Git index; preserve the real index and never reset/stash foreign
work. Latest new checkpoint/archive receipt will be recorded under
tools/data/autonomous/native-pixels-checkpoint-20261028.json. No push authorized.

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



## Latest: render-context rules and diagnostic35 awaiting one prepared skill (2026-10-28)

Continued6ab0858; active HEAD63977b0/index and other workspace changes preserved.
Integrated: bounded Particle draw axes/independent atlas rectangles, explicit
float32 trim ABI, separate UV2 vertex stream in the SAME packet player. Default
Cloud/Legacy shader path unchanged.12 synthetic original instruction controls
match; GPU cropped-UV control matches native fragment [8,42,0,42], former path
[8,8,0,42]. This is NOT a complete Android native-pixel comparison.

Evidence: tools/data/memorial-audit/diagnostic-v35-render-context.
22 numeric/product tests +40 combat assertions,11 diagnostic observer tests,
4 existing material regression cases, build and actual BattleScene packet check
pass. Frozen Cloud0 changed pixels. Source H182 windows/180 exact packets and
SAME2 center residuals preserved. No full reconstructed node approval.
Browser receipts1=UV GPU,2=frozen Cloud,3=mixed branch/natural cleanup.

Diagnostic35/build-r3 is INSTALLED and actually calibrated/ready on ADB
127.0.0.1:5575, package com.square_enix.ffbejpn, UID10107 unchanged.
Read-back installed APK hash55a380d64ddf20f036ae5a2904837b072774a7624dd372093bf6ba29326be54f.
Same-key install-r only, signatures/alignment checked. rollback-installed.apk is
verified diagnostic34; previous source copies and VM backup receipt are retained.
No app-data clear/uninstall. First35 build hit an already-hooked draw fingerprint;
r3 uses the prior verified native head map. New module render snapshots and three
packed writer hooks remain DEFERRED until source Initialize: not yet proven fired.
GPU mirror now reads uniforms/sampler/filter/root/camera and isolated pixels.
All requests are still{}; NO new live reference has been captured.

Pending async user action: Memories opened Season Selection without Event Battles.
Asked user to enter Golden Bomb Rush, prepare Brave Slash WITHOUT execution and
reply ready. Do not send emulator inputs while the user may be preparing it.
When ready, push these retained files in order, verify acknowledgements, execute
Cloud once and pull the trace/GPU outputs:
- arm-i.json -> /sdcard/Android/data/com.square_enix.ffbejpn/files/ffrogue-trace-arm.txt
- request-i.json -> .../files/ffrogue-native-export-v3/request.json
- gpu-request-i.json -> .../files/ffrogue-live-export-v2/request.json
Token render-v35-i; source substitutiongreen->white; explicit unit delta1;
GPU draws1/3/5/8/10/12. Trace file .../files/ffrogue-lifecycle-v27/render-v35-i.jsonl.
Join GPU drawIndex to lifecycle gpu-reference-draw.frame; nativeTick may reflect
restored caller delta. Check actual hook firing/completeness before any fidelity
claim. Compare first actual basis/trim/sampler/projection deviation, not tiny centers.
Full capture plan and safeguards are in the map's newest entry.

Scoped local checkpoint ref codex/render-context-20261028; exact commit/files in
tools/data/autonomous/render-context-checkpoint-20261028.json. No push. Reference
archive target tools/data/visual-preservation/render-context-20261028.zip; consult
its verified receipt after creation. Review browser uses tools/data/.../review-context-v1.html
with captureOrigin3152; Vite3000 remains running. Baseline packets in6ab0858 remain
recoverable independently. Current shared player fields are conditional, not a
universal raw selector, seed-construction or unrestricted camera/projection claim.

## Latest: connected Particle writer and actual mixed-branch rendering (2026-10-28)

Resumed scoped checkpoint713a2f2 with active HEAD63977b0 and pre-existing changes
untouched. No BlueStacks changes or new original recording. Trace34/H reused.
Completed: generic nativeParticlePacket/nativeParticleBranch/nativeSourceBranches;
source-selected two-texture Particle writer; independent parent/child lifecycle,
RNG/UV/RGB; all five drawable branch definitions in the SAME opt-in shared player.
Ordinary Cloud Source plans, Motion1/body recovery, gameplay and Legacy preserved.

Use docs/research/SKILL_RECONSTRUCTION_MAP.md newest entry for commands/boundaries.
Prepared profile: tools/data/connected-effect/particle-packet-branch-program.json.
Original reference and receipts: tools/data/memorial-audit/particle-packet-integration.
150 writer-boundary packets exact; independent output148/150 exact plus SAME2
inherited center residuals (max0.00006103515625). Full joined output182 packets:
180 exact,2 retained differences. All182 CPU make windows and per-frame owner RNG
agree.2094/3210 and1734/600 baselines remain unchanged. Complete original nodes0/9.

Actual product browser-review-1.json: six frames,67 packets,1206 world values,
natural frame14 cleanup/callback1. browser-review-2.json: frozen Cloud frames0
changed pixels. browser-review-3.json:9 casts/MP/hits/recovery/Legacy/multitarget/
victory/wave/holdout pass.78 numerical tests,14 scene/observer checks,40 combat
assertions,6 original chain regression methods and build pass. Existing Vite
chunk warning. No native GPU/pixel-fidelity approval. The initial UI test expected
opaque Quads at F8 incorrectly; corrected page-v2 reflects their final alpha0.

The successful QA snapshot is review-20261028-v2.html. Vite tools/ cache note
below still applies. New source packets are CONTROLLED tests, not a replacement
for published user-approved Cloud skills. Publication refreshed player hashes only.

Next: inspect retained original receipts for source8 draw-context fields; if
missing, extend existing observer to capture drawData+0x20 basis16, layer trims
+0x188/+0x214, alpha+0x164/global modulation and actual sampler/writer/submission
state in ONE targeted trace. Do not repeat ordinary videos or selector audits.
Identity draw basis/full trims/neutral tints/alpha1 remain explicit fixtures.
Source seed creation/initial flags/work reservation/free remain later gates.

Local scoped checkpoint ref codex/particle-packets-20261028 and exact receipt
are under tools/data/autonomous/particle-checkpoint-20261028.json. Reference
archive target: tools/data/visual-preservation/particle-packets-20261028.zip;
trust its .receipt.json verified flag after creation. Active index/HEAD stay intact;
no push. Vite3000 and temporary receipt server3151 were started for this review.

## Shutdown handoff (2026-10-27)

Development stopped at the user's request. No additional implementation or original
recording is in progress. Resume in this same chat from this file and the map's
connected Quad entry; do not repeat the completed tests below without changed inputs.

Verified reference archive: tools/data/visual-preservation/quad-packets-20261027.zip
(605779095 bytes, 1416 files, 45 plans). Receipt verified=true; SHA256:
68e5f38c3550df630333cfe33a9ad25a81086f2d242a0b68ed1099cc2617f488.
It contains the checked runtime, plans, references and browser receipts. This final
shutdown note is saved separately in the targeted Git checkpoint.

Own-change checkpoint ref: codex/quad-render-shutdown-20261027, based on 7c50ab3.
Exact commit and allowlist: tools/data/autonomous/shutdown-checkpoint-20261027.json.
Only the 24 reviewed files from this work block are included in its new diff.
Active HEAD remains 63977b0; the real index, other existing changes and untracked
files are preserved. No push. Earlier whole-workspace snapshots remain available;
they are not a substitute for the scoped shutdown checkpoint.

Completed: guarded shared Quad packets for branches 2/3/4/6, independent constant
ancestors 1/5, source-child DFS CPU order, two-texture output, optional captured
Float32 alpha arithmetic and controlled actual BattleScene rendering. Existing
Cloud default visuals and Legacy remain unchanged. Evidence and executed tests
are listed below; final product-packet-check.json passes 4 frames / 12 packets /
216 world-buffer values. Full native fidelity is not claimed; complete nodes 0/9.

Remaining: Particle branch 7->8, full graph join, raw module selector compilation,
seed construction and live GPU trim/filter/uniform/order validation. Two known
Null7 precision residuals remain explicit in the strict comparison. The new Quad
profile is opt-in; do not globally activate incomplete nine-node support.

Next concrete step: connect 7->8 to the original two-texture Particle writer,
starting with the retained H 150 make contexts and existing Particle X/UV/RGB
references. Preserve the Cloud baselines; no new recording is initially required.
Trace APK34 and emulator data were not changed in this work block. The temporary
local review receipt server on port 3151 has been stopped; all receipts are saved.
Vite and BlueStacks can close normally when the PC shuts down. Restart Vite using
its existing package script when resuming; see the tooling and cache note below.

## Latest: connected Quad packets and actual product rendering (2026-10-27)

Implementation checkpoint525a700 preserves the first verified packet/product integration.
Latest subsequent snapshot is recorded in tools/data/autonomous/checkpoint-*.json;
active HEAD/index and pre-existing work remain preserved. Reference archive target:
tools/data/visual-preservation/quad-packets-20261027.zip; its receipt records
verification and SHA256 after creation. No remote push.

Continued from7c50ab3; use the newest map entry. Original Trace APK34/old G/H,
backups and user-confirmed Cloud baselines remain intact. No new emulator capture.
New nativeQuad/nativeQuadGraph shared functions plus explicit nativeQuadBranches
player profile connect computed ancestors1/5 to drawable2/3/4/6. The renderer is
still originalEffectPlayer + existing Basic/Add/blend helpers + PreparedSceneBridge.
No new skill/reward binding or global graph activation. Unsupported7/8 explicit.

quad-render-integration/native-quad-writers.json is ORIGINAL INSTRUCTION REPLAY,
not live GPU output:32 actual ages, H first-module seeds/parents, full-trim and
neutral-tint fixtures, explicit Python float32 sin/cos adapters. JS instead takes
emitter initial seeds/source parameters/scene pose, never native intermediates.
All32 packets/192 vertices agree exactly, including node6 second UV/tint.32 H
record/RNG/primitive-center observations agree; H parent constancy is checked.
Type2 generator support is SINGLE burst only; other schedules fail closed.
Captured-separate-f32 Linear alpha is optional; legacy/default arithmetic intact.
Dormant4/6 translation curves remain data, selected Velocity drives simulation.

Actual product receipt browser-review-9.json verifies F1/4/8/9 and natural
frame10 completion/one callback. product-packet-check.json verifies12 packets/
216 world-buffer values. browser-review-4.json has0 changed Cloud baseline pixels;
browser-review-3.json has9 actions, proper MP/hits/body/FX/wave/Legacy/holdout.
71 numerical tests,13 scene/observer,40 combat checks,2 raw input checks and build
pass. Main strict connected comparison still retains the SAME2 Null7 origin
residuals; record-only2094/3210 and prior1734/600 remain exact. Full nodes0/9.

Reproduce compile_bmb_module_inputs.py -> prepare_quad_branch.mjs -> existing
writer receipt/test_quad_render_packets.mjs. Full commands and explicit input
boundaries in map. Seeds are measured initial states; seed construction unknown.
Scene pose, reviewed module-selection metadata, full-texture trim, colorScale1
and neutral tints are explicit inputs. CPU order comes from source-child DFS,
validated against H, never supplied native ordinals. Live GPU trim/filter/uniform/
order/pixel agreement remains unmeasured.
Only refresh original instruction outputs when implementation/conditions change.

Vite deliberately ignores tools/ watching: changing an inline tool HTML script
can leave a stale html-proxy module. Copy current tools/test-source-scene.html to
a NEW ignored HTML path before browser QA; final snapshot review-final.html has
SHA2566d1b5977b6dcf570234ca8fd58aefa56b0d1ac0d841a72b56e38f52a11c00820.
Use its Quad button; it temporarily swaps the scene bridge and restores it.

Windows tooling for reproduction:
```powershell
$pipelinePython='C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
$env:PYTHONPATH='tools/data/native-locator-emulation/python-deps;tools/data/memorial-audit/python-deps;tools'
```
Use `& $pipelinePython` for the map's Python commands. Node/npm.cmd are available.
No new original execution is needed to reuse the retained writer receipt.

Next:7->8 original TWO-TEXTURE Particle writer/UV/color packet (not Quad writer),
using H's150 make contexts + existing X/Particle/native writer evidence. Then
join source material/order across branches; capture only concrete missing writer/
trim/global-state fields. No general research restart or ordinary video.
The new partial branches are visible in-game, but no new native pixel-fidelity
claim is justified. Ordinary Cloud visuals are preserved; manifests only refresh
shared player provenance. Latest local checkpoint/verified archive in receipts.

## Previous: independent parent transform and make-input handoff (2026-10-26)

Checked implementation checkpoint:9ebda0cad922fe697568208e5b8cf3023e65848e.
Active HEAD/index are preserved; snapshots include the pre-existing workspace.
Verified archive:tools/data/visual-preservation/independent-parent-20261026-v34.zip,
469896729 bytes,1357 files/45 plans, SHA256
38206206d02359c46f76099722ecb31d78f7ab44a74f3d18fc44a25895ef1f57.
It preserves the new H/old G references and unchanged visual baselines; APK/VM
rollback backups remain separate. Current checks:62 numerical tests,13 scene/VM
checks,40 combat checks, build and final typecheck pass. Strict source comparison
still intentionally fails on the2 precision residuals. No new native pixel claim.

Diagnostic34 is installed in emulator-5574 only, UID10107 preserved via same-key
update. Actual module hooks captured run H:21 steps/6866 events/966 states,
5836 full-record snapshots/1810 direct-parent snapshots, no missing hooks/audit
issues. It is disarmed. APK/rollback and prior cold backup remain available;
no uninstall/data clear. See diagnostic-v34-lifecycle/measurement-receipt.json.
H SHA256:7d88e452bbeffe2bc359fda872c9a0bc0450c8d47946e9dc866fc311fb35fd74.

Use trace_bmb_lifecycle.mjs with the previous arguments plus --independent-parent.
The new src/effects/nativeTransform.mjs supplies constant Null initialization,
Default composition and Particle X make inputs through the existing replay.
Node1 full40-byte init/RNG and21 transforms match exactly from raw parameters,
initial seed and external scene-root scale/origin. Its basis is rebuilt; rotated
roots are explicitly rejected. No computed native node1 matrix is
used. Mutation tests prove output/reference independence. G also passes the
same21 transforms, explicitly lacking full init-record evidence.

Node7:15 records/180 transforms,2880 basis/scale/quaternion values exact;
178 complete observations match,2 origins retain known precision residuals.
Node8:150 make inputs now derive current parent center/group X;148 complete
matches and the same2 center residuals. Writer/UV/material outputs are NOT done.
2094 order/record/RNG events and3210 numeric records remain exact; strict full
compare still exits1 for the original2 world coordinates (4 and1 float32 ULP).
Default16 offline controls + existing alternate-seed chain expose bounded
arithmetic differences, never hidden by a fidelity claim. Full graph0/9.

No Cloud/player/approved asset changes. The last actual GPU0-pixel and9-cast
receipts remain valid for unchanged productive inputs; identity, combat/build
regressions are recorded under v34. Next: actual two-texture source8 writer/UV/
color/material joins from H make contexts plus existing writer/native references.
Do not substitute the single-texture writer or globally activate full BMB graph.
For new measurements capture writer output/selected material with same lifecycle
identities; no ordinary video. Preserve old G/H/preview archives.

## Previous observation preparation (2026-10-26)

Functional module/color checkpoint:176e5326. Full Cloud action review now passes
9 casts, correct MP/hits/body/FX/wave cleanup; module-cloud-actions.json retained.
The latest snapshot additionally extends lifecycle_observer.js with bounded full
recordSnapshot plus Null initInputs and actual referenced parentInputs at module
boundaries.5 VM checks pass. Previous observer source backed up in the G folder.
This extension is SOURCE/VM ONLY: not built/installed/native-tested, install32
and VM/app data unchanged. No new original measurements. Source record/color
comparison remains exact;2 world-coordinate mismatches remain (seq295/727,
F1/2, instances1/7), so full graph remains unapproved. See the map for matrix,
commands, hashes, input boundaries and exact proposed next measurement.

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


## Current: connected vector records and productive RGB (2026-10-26)

Continue from the map's newest entry and nine-node N/S/P matrix. Older entries
are historical. Started from b4a8ec3/bb65aa7; latest local snapshot is identified
by tools/data/autonomous/checkpoint-*.json. Active HEAD/index are unchanged.

New common functions: initializeNativeVector, updateNativeTranslation,
updateRetainedNativeRecords and an uncertified projectNativeTranslation.
Null module passes use retained ranges despite individual ages freezing; source7
has180 velocity calls (its first record13) through F13. Existing joint aging,
15 generators/shared RNG and Motion1/body return remain intact.

Retained G only, no new original calls. Extended comparison:2094 record/order/RNG
events and3210 numeric record/context values exact, baseline1734/600 exact.
World projection remains partial:2/540 coordinates differ at seq295/F1/instance1
and seq727/F2/instance7; max0.00006103515625. Native parent1 basis/origin are supplied
inputs, not independently generated. Neutral init offset0/multiplier1 and measured
dispatch/seeds are explicit. Source Color sampling matches separate-f32 captured
rounding, not a globally proven ARM FMADD rule. Two arithmetic controls are saved/
documented; do not rerun them unchanged. Complete reconstructed nodes remain0/9.

Reproduce: compile_bmb_module_inputs.py --source <preserved original white BMB>
--output .../source-module-inputs.json; then trace_bmb_lifecycle.mjs --native-run
.../run-g.jsonl --plan <preserved plan> --reference <activation receipt>
--compare-generators --module-inputs .../source-module-inputs.json --output
.../module-world-comparison.json. Full compare currently exits1 for two remaining
world coordinates; recordComparison and baselineComparison both have0 differences.

Evidence folder: tools/data/memorial-audit/diagnostic-v32-lifecycle. Static native
module wrappers/arithmetic and Null PostUpdate loops are retained alongside the
first color divergence and final comparison. Raw parameters decode in tools only;
approved plans/public assets are not regenerated. Unknown modules remain gated.

Product finite Particle playback admits a trailing ColorConst, shared RNG/helper,
and8-bit Phaser tint. Actual product control passes15 captured color states;
this is a neutral assembly, not complete original source8 rendering. Standard
13 samples/2 independent native frames pass.56 Node module/lifecycle tests,
8 scene checks,40 combat methods,9 Python format/input checks and build pass.
Frozen three Cloud frames remain0 changed pixels. See module-*.json/log receipts.
Runtime SHA256:60a9f13630ef692128682653234fa3400c3f6cf7a615d946b4259f24257bb61f.

Next dependency: source1's independent seeded transform/context -> source7 world
projection -> source8 group vectors/UV transforms/writers/material submission.
Reuse G plus existing null-chains/locator/writer references first. If a required
field is absent, extend the SAME observer with bounded work-record-base and
referenced-parent snapshots at the module call, then exact writer buffer/material
bytes. No ordinary video/new renderer. No current complete-effect combat admission.
BlueStacks/diagnostic install32/backups unchanged; observer33 remains uninstalled.

## Current: parent scheduler and scalar records (2026-10-26)

Read the two newest map entries, not the historical next-step recommendations.
Two bounded cycles completed from d69672b. First checkpoint:b4a8ec3; the latest
tools/data/autonomous/checkpoint-*.json records the final scalar continuation.
Active HEAD/index remain unchanged; snapshots include pre-existing work, no push.

Common NativeGeneratorOwner now runs per-parent records in activation order with
one emitter RNG, Update/Post gating and retained state after parent expiry.
NativeParticleEmitter uses this scheduler and shared initializeNativeScalar/
updateNativeScalar in the bounded productive program. Mixed graph stays gated.

Retained run G:21 frames/6866 events/966 states. Source7/8 projection matches1734
selected ordered events,15 records,21 parent-slot snapshots and600 scalar values
from300 Update/Make observations exactly. Two initial seeds, observed module
dispatch and host activation/lifetime are supplied inputs; other module bodies
are RNG-only. Complete source nodes:0/9, not a full original rendering result.

Reproduce: map's --compare-generators command -> diagnostic-v32-lifecycle/
parent-scalar-comparison.json. JSON diff includes first/all differences, original
sequence position, both payloads, instance, parent/RNG context and likely cause.
Deliberate --comparison-control no-parent-gate fails frame11/slot0;
--comparison-control reset-child-seed fails seq142/frame1 (expected exit1).

Evidence folder: tools/data/memorial-audit/diagnostic-v32-lifecycle.
parent-integration-identity.json pins code/input hashes and checks; final receipts:
scalar-frozen-baseline-check.json (all3 Cloud frames0 changed pixels),
scalar-product-review.json, scalar-product-comparison.json (13 product samples
through F14 match common simulation;2 stored native frames match independently),
parent-combat-review.json (9 casts, MP/hits/body/FX/multiple targets/Legacy/wave),
final-parent-node-tests.log (53), final-parent-build.log (pass, known chunk warning).
8 final scene checks pass; unchanged30 clock/40 combat-method checks passed in
the first cycle. Runtime SHA256:
2d70e9f9bff2e468ee46a2bab6414cf573b4183bdf7da71f7f1b4b437110a020.

Next: join complete module/inherited-transform outputs to this verified traversal.
Reuse G's UV/color cursor windows and existing Null/Particle chains first.
The observer stores16 bytes at current cursor, not a full pre/post work record.
Only if those windows cannot answer a required field, extend the same observer
with bounded record-base/workBytes snapshots and keep call/frame/instance/RNG
joins. No ordinary video or new parallel renderer. Initial seed derivation,
complete writer/material outputs and allocation release/reuse remain unknown.

No emulator/diagnostic/source assets were modified in these cycles. Install32 and
the saved backups remain intact; observer33 source is still not installed. Cloud
live player/plans/Motion1/body recovery and Legacy remain unchanged. Reference
archive/checkpoint receipts are local and ignored; copy them when changing PCs.

## Historical checkpoint details

## Current: connected native lifecycle and generator ownership (2026-10-26)

Read the map's first connected-run section and its completed G continuation.
Real progress: F recorded914 events/232 states; G recorded21 controlled unit steps,
6866 events/966 states with source Initialize, parent callbacks, RNG, phases,
make calls, IsExpired and wrapper destruction. All9 source roles are linked;
node0 is a host joint, not a ninth emitter. Complete reconstruction remains0/9.

Current install is diagnostic32, APK SHA256
23deeb6bf389eda2ec409a6810c9f3c4ea1523d58c2313385be708680f9156bc,
independently read back; UID10107 unchanged. The full cold backup was verified in
tools/data/memorial-audit/lifecycle-v27-backup/disk-backup.json (six VM/config files).
No uninstall, app-data clear or main-instance change occurred. First process
after31/32 install failed float calibration; a fresh process passed. Always inspect
the latest process's boot/calibration/lifecycle-ready events before capturing.

Both accepted runs use one live CreateParam filename substitution from
atk_slash3_green to atk_slash1_white, restored on return. G additionally replaces
only that animation's Update delta with1, then restores it. This is controlled
original simulation, not an unchanged Cloud battle/pixel reference. The old direct
factory still returns null and is not a useful unchanged retry path.

Run G folder: tools/data/memorial-audit/diagnostic-v32-lifecycle.
run-g.jsonl is immutable; run-g-audit.json joins22 actual parent activations,
17 Null slot tracks and19 make-record tracks. Null slots are144 bytes, host152;
32's raw windows used152 but cover contiguous bytes and are safely re-sliced by
the auditor. Source observer33 fixes the layout, Initialize result flag and
terminal truncation recursion; it is VM-tested but NOT built/installed. No new
capture is needed to correct G's retained raw storage. Module record/geometry
outputs and final allocator release joins still need validation.

Shared NativeGeneratorOwner is implemented in src/effects/nativeLifecycle.mjs,
used by productive NativeParticleEmitter. It owns one RNG and separate activation
states keyed by parent-generation identity; no cloned child seeds. G's15 Particle
activations match all8 generator fields, parent pointers/order and RNG-after;
intervening draws are measured inputs, not a full scheduler claim. Slot reuse and
overflow reject before RNG consumption. P15's explicit-state primitive is now
INTEGRIERT; P14 remains partial. Thirty-core tally:5 integrated/0 understood/
25 partial/0 wholly unknown, with many explicitly unknown sub-capabilities.

34 Particle lifecycle/phase regression tests pass. Actual Phaser product controls
pass, including13 dynamic-Particle samples and legacy controls. Frozen Cloud
frames F24/F24/F35 retain0 changed pixels outside recorded UI bounds. Receipts:
owner-product-review.json, owner-frozen-baseline-check.json, owner-<skill>-f<frame>.png
in the32 folder. nativeLifecycle new SHA256
a5d4c0915e9e9560d583a349e591ca483ebe4ab85013d0f3ef3efd5882f959f6;
the tracked identity alarm was advanced only after GPU parity. Other player/
Cloud manifest hashes are unchanged; body/effect decoupling/Motion1/Legacy remain.
Build passes with the existing chunk-size warning. Old native fixtures were reused.

RootLife at header0x50 is newly retained by inspect_bmb.py and new prepared plans,
separate from node0 life. Eight structural/two staged-source tests pass. Existing
plans/assets were not republished. New audit rejects missing sequences/returns/
source ownership and never treats partial observations as a complete effect.

Next bounded work: drive the source-backed multi-record scheduler from G, with
parent-gated Update/Post/make. Native node5 stops at age20 when parent1 expires
on frame21 despite its nominal120 life. Node7's three batches gate the15 Particle
records; make spans are1..10,2..11,3..12. Compare earliest numeric differences
before touching accepted Cloud graph/visual mappings. Initial seeds are measured;
their original derivation and general mixed-module traversal remain open. No
additional user interaction/recording is currently needed for that step.

ADB emulator-5574 is Trace/port5575. Windows CUA returned a stale launcher image;
authorized ADB screenshots/input worked. Route: Memories, left category twice,
Golden Bomb Rush, Chapter1, INT, Depart. At1080x1920 swipe95,1260->470,1260/450ms
opens Cloud skills; Brave Slash is right third row. Inspect the current screen.
Request.json is{} and arm is idle after G; no substitution is pending. Keep raw
references ignored. Preview preserver now includes lifecycle JSON/JSONL without
APKs, CPKs or private keys. Copy the reference archive for another PC. Local
checkpoint refs preserve the entire workspace without changing active HEAD/index;
no remote push. Initial pre-existing-work checkpoint was f0b022ab4df9a3eaf9ebaf0570126ec386b236bc.

## Current: connected reference readiness (2026-10-26)

Start in the map's new connected-nine-node entry. No productive renderer/body/
Legacy data was changed. New original connected states:0; complete source nodes:0/9.
The confirmed Cloud byte-identity guard still passes. Do not start more ordinary
movies or isolated module replays to fill a missing whole-tree reference.

Confirmed current install: v26 live-export APK b90b252fb0a8ec38e87caac5f64307755a83eca0cf24b348db66674b50a2b2fb
matches the local signed artifact. It packages GPU export5, not the full observer.
ADB sees trace5574/127.0.0.1:5575 and PID3584. Its request is still{}. Current
FFBE-Trace tag output is empty, so current private-script/hook startup is unverified.
Gadget is script-only/private/on_change=ignore; run-as fails setegid. ADB does not
provide the missing NodeTree lifecycle API. No install/restart/capture was done.

Old v20-v23 specs only target selected pink/blue/purple/strobe Particles, no
atk_slash1_white nodes. Retained raw logs have0 white-prefix pipeline samples.
The offline NodeTree harness has opaque callbacks, and connected export only
supports linear constant parents; neither initializes this branched mixed source.

Existing data is now joined, not rerun: trace_bmb_lifecycle.mjs --audit-existing
collects cases/sourceCases/sourceInitializedCases/sourceFields with source/native/
plan/node checks. Output tools/data/reconstruction-map/connected-reference-audit.json
has all9 partial nodes and separate fixture scopes. Node8 scheduler groups were
not in the old trace summary; they already had common Particle regression coverage.
They omit complete source modules and cannot inherit the separate chain's RNG.
Historical cached player hashes stay explicit; no new current geometry was claimed.

Same folder: connected-reference-access.json, connected-reference-log-inventory.json,
connected-measurement-symbols.json. New targeted join/identity guards pass; all
unchanged native engine tests reused. No game build needed for tools/docs-only work.
Existing preserver now also retains connected-effect JSON receipts.
Verified bundle: tools/data/visual-preservation/connected-reference-readiness-20261026.zip
plus sibling receipt. It includes old visual baselines and the exact reused
receipts, not the APK/CPK. Keep previous archives immutable; no remote push.

Next bounded work: extend the existing observe-mode diagnostic (not a parallel
recorder service), then same-key update ONLY the Trace clone when that scope is
authorized. Need source-scoped pre-Initialize + ordered child/emitter/joint mapping,
typed contexts, per-owner RNG transitions, all phases and stop/release with no
silent event drops. Native Null parameter/RNG offsets10/40 differ from Particle
f0/130. The map defines the exact event/identity/termination contract and pinned
symbols. Missing initial construction due to caches must reject the recording.
Do not ask for Brave Slash preparation until these lifecycle hooks are present
and their startup/source identities verified. No ordinary video can replace them.

## Current: body/effect separation and action admission (2026-10-26)

User has confirmed the3 Cloud source presentations visually; preserve them as
the minimum baseline. The map's newest entry supersedes the prior next-step note.
`BattleScene.executePreparedSkill` uses keyed body animation completion to start
recovery, then joins body return, bridge effect-end callback and reviewed damage.
The clip remains subject to existing melee hit-stop. Source approach18/return12
come from the prepared recipe; movement/offset/easing remain adaptations, not new
native measurements. Shared player/lifecycle/manifests/resources are unchanged.

Brave/Climhazzard recover around1230ms after effect start instead of waiting for
3100/3350ms. Blade returns to rest around950ms. Costs/damage remain18/30/52MP and
one reviewed hit per target. Active skill actors finish/return before victory.
Action/reward locks stay until all independent tracks end. Shutdown removes keyed
listeners and cancels old callbacks, and actual camera-profile render rejection
selects Legacy without stranding the action. Context/device loss remains untested.

`validateSceneAction` is shared by publisher/importer/pre-MP game admission:
scope/movement mismatch rejects, never guesses a binding or spends MP. Actual
negative controls and a normal Climhazzard pass after this addition.

Current checks:92 regression Node tests +1 new identity test (40 combat assertions), build, actual9 casts plus
victory/wave boundary, three preview-parity frames still0 changed pixels, mid-cast
restart, lethal-pose recovery and real render rejection. Numeric bridge clock
test uses real prepared geometry with a replaced GPU boundary: not pixel evidence.
No repeated native/Python decoder checks; old results reused.

Receipts: tools/data/choreography/{product-cycle1,interruption-cycle2,admission-cycle3}.json.
Framewise real action states, hit times, MP/HP and recovered actor screenshot are
retained. Baseline: confirmed-visual-baseline.json + baseline-identities.json.
Canonical frozen-visual-baseline.json adds fixed actor frames and actual game
PNGs. Check frozen visual baseline passes0 changed pixels for all3 skills against
saved PNGs, with both captures' measured UI bounds excluded (bouncing marker).
frozen-baseline-check.json retains exact counts/rectangles. Tracked identity test
fails on player/lifecycle/Cloud-plan changes until a baseline review is recorded.
Verified archive: tools/data/visual-preservation/body-effect-decoupling-20261026.zip
and its sibling receipt; copy for another PC. Older archives remain immutable.
QA page has separate migration/interruption/admission/frozen-baseline buttons; capture sink remains
the existing3117 preview server, normal game3000. No remote push/index reset.

Next original question: source-connected NodeTree Initialize/child return and
parent/context/RNG ownership for root0/Null1/Quad2. Existing Null controls do not
derive the actual selector; do not replace source RNG with equal seeds.0/9 full
nodes accepted. Unknown type7 still blocks Finishing Touch and lacks its local
authoring pair. ADB sees trace5574/127.0.0.1:5575; no emulator mutation/capture was
performed. Need the exact initialization/allocation/context/RNG join described in
the map, not another unsynchronized screenshot or manual skill correction.

## Current: controlled live Cloud migration (2026-10-26)

The next session must start here and in the map's live-scene migration entry.
User changed priority to integrating preserved visual previews. Normal game now
uses Source preview for Brave Slash/Blade Beam/Climhazzard; header toggle or
`?skillVisuals=legacy` preserves all old presentations. Other characters stay
Legacy. No skill/reward was removed or implicitly certified native.

Shared player is now src/effects/originalEffectPlayer.mjs; tools entry re-exports
it. PreparedSceneBridge.mjs renders its live meshes/materials into Phaser Extern
back/front layers, with clipping/state restoration. Profile bmb-preview-scene-v1
is explicitly experimental. NativeLifecycle remains byte-identical;0/9 complete
native prefix nodes. The old visual archives are immutable and still usable.

Reproduce: node tools/publish_scene_presentations.mjs --recipe tools/presentations/cloud-review.json
Optional standalone control: same command with tools/presentations/cross-slash-import-test.json.
Normal game: npm run dev -- --host 127.0.0.1 --port 3000.
Product check: /tools/test-source-scene.html; old sheet/Particle regression page
explicitly selects Legacy. Latest receipt: tools/data/scene-migration/final-product-review.json.
Nine casts plus early victory/next-wave control pass; restart frees all variants
and preserves5 update listeners. Three selected Cloud front-pass frames match
the existing compositor pixel-for-pixel outside measured game overlays. Legacy
six-group product check,90 Node tests,37 combat checks,7 model +2 source Python
tests and build pass. Vite's existing chunk-size advisory remains. No native capture.
Separate targeted Source-to-Legacy failure-notification control passes:
tools/data/scene-migration/source-fallback-review.json. It begins in Source and
ends in Legacy; no physical GPU/device failure was induced.

Cross Slash plays as a standalone control with source Motion-1 composition and
no converted atlas repair. Its new empty-name-table model decoding matches100
vertices/128 triangles against the existing converted counterpart. Because Cross
Slash had historical converted-asset work, it is not a wholly untouched skill.
Finishing Touch was attempted next: dependencies resolve, but unknown BMB type7
at nodes7/8 blocks hierarchy/preparation. No nodes were omitted or published.
New preflight produces an explicit unsupported-family error rather than KeyError.
The source native-reference corpus remains the original three Cloud skills only.

Longer source effects exposed an early-reward transition race. activeSkillActions
now blocks reward selection until action completion; spawnEncounter stops the old
scene. The tested next wave retains HP3200/MP82 after Brave Slash and has0 old
active actions/effects. Legacy choice survives scene restart.

Next bounded visual work: separate body return from effect lifetime; current game
holds the melee pose through the full scene, while research returns after the body
track. Do not claim choreography/native parity from the frozen pixel tests.
Broader import blocker: unknown type7; original fidelity blockers remain connected
Initialize/parents/RNG and complete material/pass/native-frame references. Do not
resume broad native research before considering existing integration evidence.

Final local archive: tools/data/visual-preservation/live-cloud-migration-20261026-final.zip
(verified identity in sibling .receipt.json). Includes ready public assets and
ignored reference receipts; copy archives for a second PC. Code/public resources
are also secured in local codex/workspace-checkpoint refs; no push. The older
sections below are history, not current next-step instructions.

## Latest bounded follow-up: Null initialization flags (2026-10-26)

Visual snapshot/checkpoint below remains intact. Subsequently the existing
NodeTree reference gained `--null-flags`:160 original block controls match the
tools-only generic flag equation.11 source Null field records are inventoried;
the four white-prefix Nulls cannot select their fourth module phase from source
fields alone. Actual parent/child context words remain null in the joined trace.
Static NodeTree Initialize sends InitContext5c bit15 to Tree15, but InitContext60
to Tree16 (clock auxiliary): never conflate them. The inspected Null child-call
branch targets Quad Particle Initialize. This is no new product/pixel support.
See the map's follow-up for hashes, commands, exact missing measurement and tests.
Executed:160 original block controls,9 targeted Node tests pass/no skips and
source-joined181-frame trace produced (9 activation matches,0 complete nodes).
Log:tools/data/visual-preservation/null-flags-tests.log. Original player/runtime
lifecycle hashes remain equal to the visual snapshot; unchanged native tests reused.
Next: source-connected constructor/context/RNG reference, not another visual fit.
0/9 complete native source nodes; runtime Motion-1/Particle implementation unchanged.

## Visual preservation checkpoint (2026-10-26)

User correction: native corpus is **Brave Slash / Blade Beam / Climhazzard only**.
Satellite was never checked in BlueStacks. Retain it as unchanged game regression,
never evidence for original renderer semantics. Its brief sampling experiment
was removed; source sheet/manifest and Barret metadata match the initial snapshot.

Before edits: checkpoint3564c09c10ee65aa1de8497db9e364d5ff0cf866,
codex/workspace-checkpoint-20261026-125924. Verified ignored archive:
tools/data/visual-preservation/before-integration-20261026.zip,862 files/44 plans,
SHA256c7765ae76b694c213f049a404295939e622efff4f841e8359ca45d0ac194543e.
All44 prepared resource closures pass. Initial archive has the original code; the
final bundle also retains the new prepared replay/capture helpers. These archives
must be copied for another PC; they are not pushed to Git. Do not reset checkout.

Isolated replay directory: tools/data/visual-preservation/replay-before, with a
node_modules junction to the installed dependencies. Current own-player SHA
65e169c3e2692c2f2a363b5a6c95fd79f9d4db739127d94a771af50cdf09a642 and lifecycle
module are unchanged. Current replays:3113 three Cloud plans (game host),3115
Climhazzard bound host F35. Converted-history3114 and isolated-exporter3116
servers were stopped after checks. Exact commands and capture paths are in the central map.
Old exact code/UI/frame identities are not always recoverable; do not claim old
pixel equality. All earlier plans/screenshots remain preserved.

Integrated: optional reviewed sheet sampling/gutter metadata in baker/cache/
publication/Preload; Brave pink + Blade wave use linear with one extruded texel.
All180 frame interiors and all body PNGs/command definitions are unchanged.
Actual product6-group check passes; matched sampler A/B is saved under
tools/data/visual-preservation/recovered/product-review.json and
sampler-comparison.png. This modest visible smoothing is a reviewed display
adaptation, not a proof of FFBE sampling or a full BMB import. Nearest remains the
default for units/other assets. Existing native clock/Particle receipts are reused.

Remaining: missing source graph Initialize/child/parent/RNG contract, complete
model/Quad/UV2/material pass profiles and synchronization to original pixels.
Do not replace the reviewed sheets with approximate whole BMB previews or apply
their geometry calibration twice. Climhazzard remains legacy/no-VFX.0/9 complete
prefix nodes accepted. Next work must connect the native initial source tree,
then admit complete prepared effects while preserving these visual baselines.
No new emulator operation/recording in this checkpoint; current tests/bundle receipt
are in the map. Technical results and visible skill changes must stay separate.

Final verified bundle: tools/data/visual-preservation/secured-cloud-previews-20261026.zip,
929 files/44 plans/66,920,544bytes, SHA256
59be0ca6980607aa285c2e8f91877dcccc0491148ab6c5cabe1ffed7e5fccea8.
48 targeted Node tests (including16 import tests and35 combat assertions),3 Pillow
tests and full build pass;6 real-product groups pass. All7 published effect cache/
source/recipe/resource checks pass after actual LF normalization. Prior unchanged
native clock/Particle tests are reused. Fresh isolated Brave baking completes but
differs in44/90 historical frames (max30/channel); cause unproven. Never substitute
those pixels for the preserved old sheet. Active180 frame interiors remain exact.

## Previous autonomous shared-runtime checkpoint (2026-10-26)

Read the current autonomous section of research/SKILL_RECONSTRUCTION_MAP.md first.
Completed: original NodeTree Update/Post clock (29 controls/891 events), bounded
finite Particle callback/lifetime/RNG/Post simulation (33 controls), ConstX and
VelocityX newborn catch-up, and actual Phaser prepared-program loading/playback.
Pure implementation lives in src/effects/nativeLifecycle.mjs, shared through the
tools shim; nativeScalarAlpha was moved unchanged there. Typed program validation
rejects unsupported profiles/fields. The registered native_particle_control is a
controlled neutral-parent assembly, not a new published original skill. Raw BMB
still stays in tools. Motion-1 and existing skill/reward mappings stay intact.

Final:125 Node tests pass, including14 import tests and a35-assertion combat suite;
no skips. Build/Python compile/diff checks pass. Actual WebGL five-case check passes
(four existing cases + dynamic control); receipt/proof in tools/data/autonomous/
native-program-product.json and native-particle-product.png.
The saved-product comparator matches both available original frame states/RNG
exactly and width residual0px; later product frames have no original baseline.
See native-program-comparison.json and tools/check_particle_product_receipt.mjs.
0/9 full nodes remain accepted. Next original gap: Initialize -> ordered emitter table ->
child allocation/RNG/parent selector for root0/Null1/Quad2, then remaining modules.
Do not replace the source preview's LCG with arbitrary equal per-emitter seeds.
No synchronized original source-wide geometry/material/pixel acceptance exists.

ADB: installed C:/Program Files/BlueStacks_nxt/HD-Adb.exe, trace serial
127.0.0.1:5575 (Tiramisu64_2), package com.square_enix.ffbejpn11.1.1/code208.
External data readable; private run-as setegid fails. Diagnostic v26 request is
disarmed `{}`; no app install/data/settings changes or new game recording.
Initial workspace safety snapshot: codex/workspace-checkpoint-20261026-114953,
commit1ef5d4d2e91f084ad31759010ffd66bf0db87fb2. Active branch/index untouched;
includes pre-existing uncommitted research. Integration safety snapshot:
codex/workspace-checkpoint-20261026-124851,
commita5280b81ef360cefe545b47c37b4e83aebd0a2f1. No remote push.
Newest checkpoint receipts remain in ignored tools/data/autonomous/checkpoint-*.json.

## Previous nine-node lifecycle checkpoint (2026-10-26)

Read the current lifecycle section in research/SKILL_RECONSTRUCTION_MAP.md first.
0/9 nodes are fully accepted. All9 activation records match original functions;
51 controls include an independent eight-node green source and three RNG seeds.
The original symmetric/exclusive delay mapping and disabled Quad/Particle rule
are integrated for source-admitted metadata in the common player. The four-word
primitive is implemented for explicit activation inputs, not guessed as the
legacy preview's complete emitter/child/module RNG policy. Its LCG remains labeled
experimental. No product src, recipe or published image changed this checkpoint.

The common-player numeric trace includes181 frames/37 preview instances, parent
matrices, birth/end events, initialization RNG and geometry/material requests.
Original instance/RNG histories remain null; zero-life root horizon is still an
approximation. Null lifetime mode is0 for all four source Null nodes; do not enable
the child-derived mode1 branch. The target's fourth phase/selector remains gated.

31 Node tests,14 import tests,34 combat assertions, shared-source Python and build
pass; exact commands/receipts are in the map. Reuse unchanged native chain results.
Next requires a connected original NodeTree trace with per-emitter state, actual
phase order, child activations, parent selector/basis and death through source
removal. Prefer an explicit offline original-code fixture when feasible; an
ordinary video is insufficient. No new recording/manual skill preparation asked.
Do not resume isolated fixes or call the whole effect complete from this trace.

## Bounded product integration completed (2026-10-26)

User authorized exactly one common improvement and then a report/stop. Completed:
ordinary motion-1 source composition -> strict reviewed-sheet bindings -> clean
runtime presentation -> shared melee/area scheduler. Brave Slash's exact-form
prefix starts F3, pink F6, duration96 sheet frames, one reviewed F6 hit/18MP.
See research/SKILL_RECONSTRUCTION_MAP.md current checkpoint for source/code
identities and the three-skill comparison.14 import tests/34 combat assertions,
build and four actual product browser cases pass. Receipt/proof images are in
ignored tools/data/reconstruction-map/source-presentation-product.json and
attack_slash_white-product.png / brave_slash-product.png. Converted pixels remain
adaptations; no complete native effect/skill milestone has been accepted. Next:
complete-source lifecycle/parent/RNG contract/integration for the nine-node prefix,
reusing native evidence. No new capture required yet; no native export resumed.
The earlier paused-review/next-step entries below retain historical context.

## Central map checkpoint (2026-10-26)

Read research/SKILL_RECONSTRUCTION_MAP.md for the current complete status and
critical path. It maps30 core components (4 INTEGRIERT,1 VERSTANDEN,25 TEILWEISE,
0 UNBEKANNT at bounded-component level) and three separate extensions/alternatives.
Unknown subrules remain inside partial components; counts are not completion
percentages. All82 pre-existing research files,57 test-source files and44 plan
snapshots were inventoried. No tests, new captures or renderer/importer changes
were made for the map. PC is primary; no mobile work or layout change.

Next recommended development milestone after review: M1 exact first-skill
source/plan/reference contract. Then connect the complete9-node prefix graph,
its rendering, the full35-node impact and finally the complete skill. Do not
resume isolated function investigations or unfinished native export by default.
The map includes success definitions, reference/skip/no-repeat rules and update
requirements. Older sections below retain their dated evidence, not current tasks.

## Active checkpoint: architecture review requested, implementation paused

Read research/skill-pipeline-architecture-audit.md first. User explicitly requested
architecture/root-cause analysis before further corrections. Audit changed only
documentation, read existing code/results, and resolved the interrupted install
with read-only ADB queries; no new tests/builds/battles/captures were run.

The preceding native work did obtain one composited pink-impact sample: one
source-over and13 additive commands; offline and actual WebGL/native comparisons
max2 black/max3 white, zero pixels above3. It is original-pixel transfer, NOT a
differential validation of our BMB simulator or a complete animation. Ignored
clip-review-20261026/clip.json records this; the localhost3145 viewer has one state.
Manual wrapper redraw control returned0 GPU commands. Later live d24/d30 samples
exist; d36 was not obtained and the request expired. Do not claim a short clip.

The interrupted command DID complete install/startup of diagnostic-v26-live-fixed-step
(liveExportRevision5). Host/device APK hash matches:
b90b252fb0a8ec38e87caac5f64307755a83eca0cf24b348db66674b50a2b2fb.
Request file is{}; no capture is armed. Fixed-step behavior has not been measured.
Source/tools remain unfinished research work. Do not automatically resume them.

Current own player hash897fde4c... differs from cached coverage a3b10c44....
Current coverage tool also omits nativeScalarAlpha sampling mode. Historical
test counts and coverage reports are not a fresh acceptance status. Proposed
next milestone and no-repeat/reference requirements are in the architecture audit.
The sections below record earlier directions, not the current implementation task.

## Active direction: native game-loaded GPU export; first pixels succeeded

Read research/live-native-gpu-export.md FIRST. User rejected manufacturer inquiry
and approved exploiting normally loaded effects. No external message was sent.
prepare_diagnostic.py new --mode live-export appends standalone live_effect_export.js,
not observer/factory prototype. Final folder diagnostic-v24-gpu-mirror. Installed
Trace APK hash600ebf612b1280df9628d7cc2d9d9116a838a808f0b789407bcf925c9b8f5efe
matches device; v1/v2/v3/alignment verified. Only emulator-5574/port5575 clone.

SUCCESS token live-pink-20261026-c, actual Brave Slash prepared by user/executed
via Computer Use. Source atk_impact_001_pink.bmb, wrapper draw ordinal30 (NOT
sourceF30).13 GL commands mirrored in-order from real wrapper scope to three
complete color/depth FBOs; same live shaders/uniforms/textures/buffers, original
draw also proceeds. No CPU reimplementation or second simulation. Actual three
1080x1917 RGBA8 readbacks/8,281,440 bytes each. Black and white PNGs inspected:
isolated pink ring/impact, no character/enemy/HUD/background. Evidence/analysis
under ignored tools/data/live-effect-export/capture-20261026 and review-20261026.
Final review-pair.png exists; black-rgb.png preserves RGB without alpha hiding Add.

IMPORTANT composition remains unsolved: naÃ¯ve straight-alpha PNG over white
differs from native white by max220;1,289,258 pixels >2. Transparent RGB equals
black exactly, alpha0..255. Do NOT publish an ordinary transparent spritesheet.
Next short native-rendered sequence with layer/blend-preserving or otherwise
verified composition, then second source; automatic activation/seed/reset and
whole-skill scheduling remain separate. No new phase reconstruction meanwhile.

Earlier resumed attempts: rev2 redraw scope6 no GPU/no images; rev3 original
scope6 likewise empty; rev3 scope30 succeeded. Don't infer wrapper redrawing
impossible from an empty early sample. Current probe uses GPU mirroring only.
Normal-attack white request expired; no inference on exact name/loading.
Name field4a8 omits.bmb; normalization now exact either name form. Requests
max3 ordinals1..60,90s expiry, reviewed 3-source allowlist. No factory call.

Cleanup: request completed, replaced with{}; generated remote ffrogue-live-export-v2
and old ffrogue-live-export directories restored2770. Only generated export
child was temporarily2777, not app files parent. Earlier empty app-owned v2
directory retained as ffrogue-live-export-v2-app-owned. No root/uninstall/data
clear. Current rev3 remains installed/idle. Do not touch main instance.

UI route now confirmed: Home->Memories->Season Selection, LEFT arrow twice from
Season1 goes JP Memories then Event Battles->Golden Bomb Rush->Chapter1->INT->
Depart. Skill swipe remains manual; ask user prepare Brave Slash, then agent
clicks Cloud's card. Two skill preparations used for rev3 scopes6 and30. Do not
use ADB UI input; Computer Use @oai/sky skill was read/applied and Escape stop
was obeyed in preceding turn; user subsequently reauthorized control.

9 Node checks passed/no skips; real device readbacks and analyzer executed,
whitespace passed. No game build or browser integration. Prior86 CPU tests not
rerun for native-only path. The sections below are historical directions.

## Current priority: full browser-renderer feasibility, not more phase probes

User explicitly questioned the reconstruction approach and authorized testing
full original-renderer reuse. Read research/browser-original-renderer-feasibility.md.
Important correction: native-export-feasibility.md already recorded failed
isolated Android factory loading (zero PNGs). Do not claim it had never been
tested or repeat it unchanged. No emulator was touched in the new audit.

New primary finding: ICS CEDEC2018 report https://ics.media/entry/18881/ explicitly
used Emscripten-built BISHAMON WebGL SDK with Babylon.js. Manufacturer lists web
browsers as deployment platform; public Personal store lists DirectX11, not a
confirmed matching Web SDK download. Access and old-data compatibility open.
No BISHAMON SDK/source found in inspected project roots; only Effekseer WASM.

New tools audit_renderer_browser.py and probe_renderer_wasm.mjs ran on pinned
APK/native hashes. Actual libgame48,413,928 bytes is ELF64 AArch64 machine183,
DT_NEEDED includesAndroid/EGL/GLES/log/audio/C++ etc,503 whole-game imports.
These are not the isolated renderer's proven dependency closure. Actual ELF
rejected by V8 WebAssembly.compile at magic; valid minimal Wasm control ran.
No renderer started/frames, no browser or SDK build. Receipts/extractedSO ignored
under tools/data/browser-renderer-feasibility. Do not call this a full native
startup attempt, or infer an SDK port impossible from format rejection.

Reviewable vendor inquiry research/bishamon-web-sdk-inquiry.md prepared, NOT SENT.
No registration/license purchase/external message. Next obtain/confirm compatible
WebGL evaluation SDK or core source, then actual browser load/render one source
and second control. Do not spend another phase-reconstruction block before user
assesses this route. Docs/whitespace updated; prior86 tests not rerun for audit.
The remaining sections record earlier reconstruction milestones.

## Active target: complete mapped combat component

Latest parent extension: read research/native-null-parent-chains.md first.
New emulate_null_assignment.py runs original Null AssignModule1fc0e4c/1920,
GetCount1fc0a88/820,GetWork1fc0dbc/144. Explicit --auxiliary-flag REQUIRED.
Flag0: source Null0/1/5/7 complete init/update+Default locator run, work/consumed
24/40/24/36. Native outputs include basis/quaternion/scale/world position and
RNG-after-init/update. Null1 has actual random rotation, native ConstX uniform1.5;
Null7 moves with source random velocity. Integration test source Null1->Null5->
Quad6 proves generated parent matrix reaches packed Quad motion. Not full births.
Context defaults remain explicit neutral fixtures, not source inheritance.

Important discovered phase: flag1 selects FOURTH ModuleArray at+18, actual
delta_zero_update callbacks counts3/4/3/3. Shared harness now allocates four
descriptors and validates all four native counts, retains auxiliaryModules;
probe execution blocks if nonempty. Initial native capacity assertion1fc15b4
was due to the missing fourth descriptor, fixed rather than suppressed. Flag
origin is original Initialize inherited flag >>15 (1fbd094), full derivation
not reconstructed. Do not call it a verified compatibility mode or choose0
silently. Next connect delta-zero phase + Null scheduling/callback RNG/lifetime
and inherited selector. Source nine-node export still intentionally rejected.
86 Python tests pass/no skips:7 Null+14 Quad+54 Particle+11 connected. No browser,
game build/emulator/new capture/publication. Receipts ignored connected-effect/
brave-slash-null-chains.json and brave-slash-null-auxiliary.json; reproduction
commands in report. No new user input or recording currently needed.

Latest motion extension: geometry host placementFromUpdate:true treats center as
parent origin. Original translation outputs f4/f8/fc; original bounded PostUpdate
block1fed0e8/28 copies to primitive c/10/14, VertexMaker2020c70/36 copies to make
98/9c/a0. Then original complete Quad make/writers run. Not full phase execution.
Important harness fix: InitContext68 is inline velocity multiplier (neutral1),
UpdateContext68 is parent origin pointer and80 is basis pointer. Set pointers
AFTER init, never overwrite multiplier with a pointer or leave null references
to mapped ELF data. Original Quad callback1fed644..64c proves neutral vector.
Source nodes4/6 actually move10/update from-40; old zero-velocity probe records
were wrong/are superseded, never published. World centers now-30,-20,-10,0,10.
Receipt brave-slash-quad-motion.json; ignored host quad-motion-host.json. Still
all9 nodes/wholeEffectExported:false. Parent values are explicit fixtures, not
source Null initialization/inheritance. Next derive random/dynamic Null parents
and nested births, then material/GPU submission for this same source.
79 Python tests pass/no skips (14 Quad +54 Particle +11 connected), whitespace
passes. No browser/build/emulator/new capture; no user action currently needed.
The paragraphs below record preceding checkpoints.

Latest extension: --geometry-host executes ALL four Quad make arrays and actual
source-selected Quad writers0x2005180/892/stride40 and0x2005500/1156/stride64.
Receipt brave-slash-quad-geometry.json:20 controlled samples/120 vertices,
all9 source nodes inventoried, wholeEffectExported:false. Not source-timed frames.
Full Quad Default transform/geometry/flat RGBA/alpha/UV1/UV2 preserved; sin/cos
remain explicit float32 Python adapters. Native UV layer stride is0x8c, trim
188/214, outputUV2 at224, tint1/2 at144/154. Source UV2 span -3/14..17/14.
Host fixture explicitly supplies center, basis, groupScale, neutral tints. It
does NOT derive moving primitive center, random parent rotation or source tints;
do not promote to a full-effect export. Next resolve original primitive/parent
placement and nested births/RNG/inheritance, then actual material/submission.
76 Python tests pass/no skips (11 Quad +54 Particle +11 connected). No browser,
build, emulator or capture. Source mutation/parent controls/material selector
switch prove dataflow; no per-effect constants or Particle writer substitution.
The paragraphs below record the preceding init/update-only checkpoint.

Read research/brave-slash-connected-combat.md first. User approved returning to
an actual Brave Slash source after Capsule's unrelated technical fixture caused
confusion. Stay on atk_slash1_white.bmb (nine nodes), the verified unit-attack
prefix, until whole-source acceptance or a concrete backend decision. It is not
the pink main impact and not the complete skill.

New emulate_quad_assignment.py uses pinned original Quad assignment/profile
functions and complete selected init/update chains for nodes2/3/4/6. Work budgets
84/84/96/108, consumed52/52/64/76; unused32 retained. Source alpha relocation640,
flat colors inline104/120. Source scale mutation changes native records.
Particle loader now has explicit per-reference parameter/profile fields; its
admission is unchanged. Quad writer requests fail, never substitute Particle.

Receipt tools/data/connected-effect/brave-slash-quad-chains.json includes all
nine source nodes, wholeEffectExported:false, approved:false. Current blockers:
Quad make/context/writer; random/branched Null parent lifecycle and nested
generation count5/duration3; two-texture Add/UV submission. Keep all nodes.
Next connect Quad output within this same target, not another standalone asset.
71 Python tests pass/no skips (6 Quad +54 Particle +11 full-effect acceptance).
No browser/game build/emulator/new capture or publication; no user action needed
for these remaining offline gaps. Existing3143/3144 baseline servers unchanged.

## Latest milestone: second complete textured source

Read research/connected-second-effect.md. Same exporter/viewer now handles
eff_capsule_001.bmb:5 nodes/123 states, constant-one alpha, nonuniform source PNG,
source Semitrans blend vs flash SemiAdd. No filename/skill branch or fit values.
Original Default locator0x1fbef00/1144 preserves -25-degree X tilt/native basis;
rotated parents require reviewed full-inheritance/non-V15 evidence. Sin/cos remain
explicit Python float32 stubs as before. Max finite life240, age samples256.
Init/update/make24 bytes/native budget56;32-byte reservation remains unconsumed.

New prepare_connected_fixture.py verifies BMB/BMSLN and pinned native Basic
shader selection/tint. Source/capsule_001.png extracted only from indexed CPK
members; exact archive paths/hashes and reproduction are in the report. No
Cloud skill mapping or game publication; Capsule is a standalone acceptance
fixture. Viewer samples real UV/texture/packed color/tint, checks Repeat, flipY
false for native top UV origin; filtering fidelity remains experimental.

11 acceptance +54 reference +15 Node tests pass, no skips. Browser Capsule F30
upright/six vertices/alpha255, F122 empty; refreshed flash F8 six/alpha112. Five
GPU host checks per page pass. Server3144 exec76877 Capsule,3143 exec97025 flash;
earlier server sessions were restarted for the new texture route. Screenshot
ignored connected-effect/capsule-f30.png; requests/exports remain approved:false.
No game build/emulator/new capture. Next target: a combat effect through SAME
whole-source path with only its blocking shared capability added; preserve both
baselines and explicit unsupported cases.

## Latest milestone: connected complete-effect acceptance path

Read research/connected-effect-export.md first. New export_connected_effect.mjs
and memorial/export_connected_effect.py connect one complete admitted BMB to
native init/update/make/writer vertex JSON and preview_connected_effect.html.
Strobe source4 nodes/32 states. All parents checked; native ZScreen + explicit
constant Standard composition, declared host/scatter. This is an adapter-based
complete-effect subset, NOT full original NodeTree execution or a whole skill.

Actual texture is128x128 opaque white, not absent. First exploratory untextured
call was rejected; final source binding selects0x20016bc/stride40. Neutral tint
requires reviewed Basic evidence; native blend row2 [1,770,1] checked from bytes.
Source textures/hashes retained; other textures/modules/hierarchies reject.
Original emission/lifetime RNG hands off to full selected init/update/make.
Make cursor28 matches init/update28 within allocated native budget60; remaining
reservation unresolved without a fake header/offset. All packed RGBA/UV/tint
exported. Actual viewer plays JSON only, using white-texture shader equivalence.

Server3143 exec88450, /connected-effect.html?frame=8, marked deliverable. F8 six
vertices/alpha112, F31 empty; five host GPU checks pass.6 complete-effect tests,
54 previous Particle reference and20 Node tests pass, no skips. Receipt/request
and screenshot ignored tools/data/connected-effect/strobe*.json/connected-f8.png.
No game build, emulator/new capture or runtime publication.3142 unchanged.

Next acceptance target: a second differently structured/textured effect through
this SAME export/view path, fixing only its blocking shared capability. No more
isolated-success loops or per-effect tuning; reassess backend if that becomes
necessary. Details, exact commands, hashes and adapter limits are in the report.

## Latest milestone: source-gated native alpha A/B

See research/native-scalar-alpha-preview.md. New prepare_scalar_alpha_plan.py
checks original hashes/nodes/keys and real assignment before attaching selected
InitCurve0x20025ec/UpdateCurve0x2002af4 evidence. Separate plan-native-alpha.json,
plan flag + player setNativeScalarAlpha; actual evaluator changes only eligible
local Particle alpha under source appearance. Stale evidence/other types reject.

Server3142 exec67740 uses Climhazzard native-alpha plan with previous host context/
bindings.5/7 Particle nodes qualify. Bound-host checkbox gives independent A/B;
untextured comparison remains off by default. F12 A/B explicitly white-on shows
native flash pixel147,156,153 vs old136,145,142 at screenshot250,550; largest
sample local delta.092028385. F35 native-on/white-off inspected. Five GPU host
checks pass; old3141 ordinary plan49 GPU checks/83 limitations still passes.
35 Node +3 Python exporter tests pass, no skips. No game build/emulator/capture.

Ignored screenshots native-alpha-on/off.png, native-alpha-f35.png and updated
bound-host-result.json in shared-skill-review/climhazzard. New tab3142 F35 is
deliverable. Other curves/materials/parent-alpha rules unchanged; no publication.
Native traversal/resource chains, work reservation and geometry/material gates
remain open. Source-gated local alpha integration is now implemented.

## Latest milestone: native scalar alpha helper and mode controls

See research/native-scalar-alpha.md. Added nativeScalarAlpha(keys,time) to the
shared player as a separate pure function; old scalar/vector and active plans
are unchanged. Original alpha UpdateCurve0x1fcd3b4/568 dispatches Constant0,
Linear1 and common Spline2/BreakSpline3 from the earlier key. Spline uses keyA+4
and keyB+8 tangents without dt factor; alpha clamps0..1. Constant snaps at its
near-end normalized epsilon (float32~1e-6). New helper rejects near-duplicate
key times, unknown modes and nonfinite inputs rather than guessing.

New export_scalar_alpha_controls.py runs complete original chains with64
synthetic scalar controls/576 samples. Actual JS differential max residual
4.768376715702516e-8.33 Node +54 Python tests pass, no skips. Ignored receipt
native-locator-emulation/scalar-alpha-controls.json; static function receipt
scalar-alpha-update-static.json. Chain probe accepts bounded explicit ages.

No browser/game build/emulator/new capture.3141 unchanged. Work-budget20/32-byte
reservations remain unresolved. Next: source-verified Particle alpha-only plan
switch and numerical/visible A/B; do not globally replace model/quad alpha,
vector or parent rules. Source record/traversal/material gates remain intact.

## Latest milestone: selected init/update chains and native alpha controls

See research/native-particle-chains.md. --probe-chains in assignment tool runs11
of13 complete selected init/update lists; impact8 AddValueCurve and aerialslash10
parent/resource inputs block. Explicit scalar alpha relocation at Particle+0x220/
+0x228 uses decoded original20-byte keys. Controlled RNG, normalized ages and
delta1; no emitter/NodeTree/make/render traversal. Default assignment unchanged.

Actual cursor is <= native work budget and update matches init, but ten chains
leave32 bytes, blow7 leaves20. Strobe consumes28 vs60 reported. Do not invent a
header/stride/offset adjustment; allocation/make reservation remains unresolved.
Native scalar Spline alpha yields0,.427806765,.487500012,.226530299,0 at five
strobe fixture ages. Synthetic unequal-tangent controls show earlier key+4 and
later key+8 tangents without multiplying by interval length. Current JS uses
opposite fields and dt multiplier; no JS change yet. Other modes/vector curves
need verification before general promotion. No per-skill fitting.

54 reference tests pass, no skips (6 new +48 existing). Receipt ignored
native-locator-emulation/particle-module-chains.json; wrapper static receipt
alpha-curve-wrappers-static.json. No browser/game build/emulator/new capture;
3141 view unchanged. Next bounded gate: scalar mode differential controls and
native allocation/make consumers of the unconsumed budget; preserve resource,
vector-curve and parent/child blockers.

## Latest milestone: original Particle module arrays/profile

See research/native-particle-assignment.md. New emulate_particle_assignment.py
executes AssignModule0x2003b10/4548, GetModuleCount0x20031ac/2096 and
GetModuleWorkSize0x20039e0/304 from the pinned ELF. Defined relocations/PLT are
resolved; execution stays inside assignment/getter/field-profile helper ranges.
No selected callbacks run. Empty field context is explicit, not recovered
parent/child input. Preallocated arrays hold64 entries each.

All13 source Particle nodes resolve:67 init/67 update/95 make references.
Native counts agree; fourth count retained uninterpreted (all0); work60..100
bytes is not yet verified allocator stride/per-module offsets. Independent
scale/rotation dispatch tables agree. Strobe OneX lacks scale init but has
update/make; source order and asymmetric lists must be preserved. Power Geyser
20/29 select alpha-blend Mod only in make, without BMSLN. This is not proof of
final alpha producers/pixels or supported complete playback.

48 tests pass, no skips (9 new +39 preceding). Receipt ignored
native-locator-emulation/particle-module-assignment.json; profiling static
receipt particle-module-profile-static.json. No browser, game build, emulator
or capture;3141 unchanged. Next: relocate curve/resource inputs and validate
full selected init/update chain record cursors against native profiling, while
recovering field/parent-child context. Do not use ConstX-only storage for all
nodes or mark selection itself as runtime support.

## Latest milestone: original callback/PostUpdate bridge

See research/native-particle-phases.md. emulate_particle_scheduler.py now has
explicit phase_mode='initialized' while default requests mode remains intact.
Original callback0x1fefae4/956, PostUpdate0x1fef2f8/1908 and IsExpired0x1fef234/196
run with a controlled ring and three neutral parent-transform helper stubs.
Optional ConstX uses real parameter->vector->scalar init and update chains;
init/update context RNG ownership is checked against emitter+0x130. Other
modules are omitted; this is not complete inherited geometry or NodeTree replay.

Negative generator delay now persists through PostUpdate. Newborn ages start
at negative within-update offsets then catch up only by their active remainder.
Lifetime RNG and ConstX share the emitter sequence. Two-particle finite ConstX
burst consumes6 words total, no extra restart draw after reaching its limit.
Thirteen source nodes run (62 requests), including both delayed nodes and4
source-selected ConstX chains.9 initialized fixtures +13 previous request-only
fixtures;39 tests pass, no skips. Static NodeTree slot0->slot8 normal dispatch
was inspected but its branches/table construction are not executed. Source
identity, addresses/hashes and no-op fixture boundaries are in the report.

Receipt ignored native-locator-emulation/particle-scheduling-phases.json.
No browser, game build, emulator/ADB or new capture;3141 view remains unchanged.
Next: source-driven module-array layout/order and parent/child callback tables,
then a capability-gated preview integration. Do not copy ConstX-only records
into arbitrary nodes or tune a skill's timing by eye.

## Latest milestone: offline constant Particle request scheduling

See research/native-particle-scheduling.md. New emulate_particle_scheduler.py
executes pinned ActivateGenerator0x1fee474/488 and Update0x1fefea4/1436 with one
controlled live Joint. The activation callback PLT0x11328a0 only records requests;
it does not initialize particles or consume callback RNG. Native source hashes
are unchanged.13 fixtures/33 requests and13 raw Particle nodes execute;31
particle-reference tests pass, no skips (10 scheduler +21 existing).

Confirmed10000 integer ticks, symmetric modulo start jitter with clamp, xorshift
consumption even for zero range, within-update callback offsets, strict end
boundary and restart gap. Preview instances() still uses an adapted LCG and
precomputed births; no playback implementation was changed. Two raw delayed
nodes are activation-only: Update does not store delay progression. That write
is in PostUpdate0x1fef784..0x1fef7a0; full symbol0x1fef2f8/1908 needs traversal
and module/callback ownership before offline whole-scheduler replay. No synthetic
delay patch or runtime promotion. Zero/curve generation stays unsupported.

Receipts in ignored native-locator-emulation/particle-scheduling-fixtures.json,
particle-scheduling-static.json and particle-postupdate-static.json. No browser,
game build, BlueStacks/ADB or new capture. Existing3141 preview remains unchanged.
Next: shared Update/PostUpdate traversal plus callback time/RNG handoff; do not
calibrate a single skill visually or claim all generator traits are covered.

## Latest milestone: explicit native-world member binding

See research/bound-effect-host.md. Added effectHostMemberAnchor and explicit
three-axis root scale consumption. Source member XY percentages and global Z
scale are declared via memberScaleAxes:"xy"; missing rectangles/scatter reject.
Fixed NativeX's obsolete local scale reference found by actual browser execution.
No per-skill tuning, game publication, ADB or BlueStacks use.

Separate tools/preview_bound_effect_host.html on /bound-host.html consumes both
--host-reference and --host-bindings. Server3141 exec25058 uses Climhazzard's
plan-native-x, revision23 clean context and declared-host-bindings.json under
pipeline-v23-20261025. Bindings use captured rectangles and adapted zero scatter.
Five anchors are valid; strobe zero-scatter root320,617 differs deliberately
from measured316,624 with scatter-4,-7. Untextured comparison remains off by
default. No actor/HUD reconstruction or native RNG/birth scheduling claim.

Actual browser F12/F35 and five GPU fixtures pass; ordinary preview49 GPU checks
still pass with83 retained limitations. Targeted Node30 pass, no skips. No game
build. Separate ignored bound-host-result.json records approved:false. Screenshots
bound-host-f12.png (white comparison on) and bound-host-f35.png (off) are in
tools/data/shared-skill-review/climhazzard/. Next block should resolve shared
simulation/material semantics, not fit this skill by eye. Trace remains23.

## Latest compositor milestone: opt-in layer.hostContext

No ADB/BlueStacks calls. composeSceneLayer now branches only when layer.hostContext
is explicit. composeEffectHostLayer validates context/dimensions/pixelRatio1,
copies full host snapshot into RGBA target, renders native-world geometry with
private supplied-projection camera and physical viewport/scissor, then presents
complete RGB once (opaque when scene composition enabled). It restores target,
viewport/scissor/test, autoClear and background visibility. No geometry fitting.

GPU fixture page tools/preview_effect_host.html via /host-compositor.html passes5
actual GPU checks: background retention, viewport separation, empty scene,
intermediateRGBA[128,0,128,191] vs presented alpha255, and measured1080x1920
effect pixels2,004,480/background69,120. Separate /host-review-result saves
ignored host-compositor-result.json. Old Climhazzard page still readies with49
GPU checks and83 limitations. Node28 pass; diff check passes. No game build.

Active new server3140, exec29728, Climhazzard plan-native-x, --host-view game,
--host-reference tools/data/memorial-audit/pipeline-v23-20261025/effect-host-context.json.
Two browser pages were opened: fixture and ordinary skill regression. Old servers
remain independent. See research/effect-host-compositor.md for exact command.

Important: hostContext has NOT been automatically enabled on ordinary skill
layers, whose anchors are still adapted/centered. Next step is explicit matching
native-world anchor/rectangle/scatter bindings and a separately labeled measured
host view. Do not pretend current3140 skill page is native scene replay. No game
or published support changed; Trace remains23 and is untouched this block.

## Latest offline milestone: shared host math/export

No ADB/UI calls. Added validateEffectHostContext/effectHostPlacement/
effectHostProject/effectHostRaster to original_effect_player.mjs. Clean schema1
ffbe-screen-api keeps engineScreen, camera and framebuffer separate; only
identity-view axis-aligned orthographic is supported. API Y flips with engine
height1100, not logical camera1136 or framebuffer1920; source offsets are never
scaled. Explicit scatter required for randomized axis modes. GL raster clip is
framebuffer âˆ© viewport âˆ© scissor, independent of placement rectangle.

New generic tools/memorial/export_effect_host.mjs requires clean pinned audit,
measured renderer reference, exact native/GPU/root joins, default framebuffer
and stable sample state. No per-skill/character mapping. Audit now retains
rendererReferences from calibrated startup. Re-ran23 audit and source/actual
RNG/delta replay passes; exported ignored pipeline-v23-20261025/effect-host-context.json.
28 Node +9 Python tests pass, no skips; actual six roots match source placement
with measured-run scatter[-4,-7]. Mixed states/missing joins reject. See
research/effect-host-context.md for commands and limitations.

No visible playback path, current preview camera/compositor or published game
effect changed. No browser QA/game build for this math/export-only milestone.
Next step is explicit viewport/scissor/camera consumption in the shared preview
compositor, preserving full background/foreground and separating host adaptation
from original evidence. Do not claim these helpers already render the native
scene or solve time-base/birth scheduling. Trace remains23.

## Latest live checkpoint: revision23 strobe submission verified

User freed PC for this capture. Installed only Trace23-r2, read-back APK hash
bb3b4ca069d365d76cd0c6890e7dccc746d26c146837f9948480a72cef6afa91.
First calibration null was rejected; one clone-app restart passes, ready32.
User prepared Climhazzard; we positively armed pipeline-v23-clim-20261025-a
with pipelineNativeSubmit:true and executed once. No other app controlled.

Capture:25 scopes/25 module returns,16 paired native submissions,12 actual GL
calls/12 exact root joins, no errors. Strobe has6 auto-index native submissions,
each exact glDrawArrays(GL_TRIANGLES,count6), available budget, root[316,624,0],
scale1.774999976 on all axes. GL viewport[0,1,1080,1917], scissor enabled
[0,1,1080,1856], FBO0/program117. Blow has6 auto-index actual calls and4 indexed
submissions whose GL samples are deliberately deduplicated. Original VelocityX
initializer/6-step source+captured-RNG/delta replay still matches exactly.

Missing strobe GL observation from21/22 is now superseded by positive evidence;
do not suppress flash or claim the older absence's precise cause is proved.
Native hooks may change observation/translation; no controlled A/B cause test.
Final pixels/vertex alpha and arbitrary-effect support are not proved. Placement
rectangle640x666 is distinct from engine1100, camera1136 and physical GL scissor.
See research/native-draw-submission.md for exact commands, IDs and limitations.

Receipts under ignored tools/data/memorial-audit/pipeline-v23-20261025/. Latest
21 Node +9 Python targeted tests pass, no skips; additional assertions verify6
strobe native/GPU pairs and12 root joins. No renderer/preview change or game
build in this block. Control has ended as announced; no more immediate recording
needed for review. Next milestone: use recovered source/host/submission contract
in shared renderer; time-base/birth traversal remains its own gate.

## Latest offline milestone: revision23 submission candidate

No ADB/UI/asset-dump calls this block. Trace remains22. Investigated why strobe
has CPU contexts but no selected GL event. Static native Animation::Draw has
auto-index vs m3r/indexed paths. Public DrawAutoIndex0x15c6c30 branches to
0x15c6c34(92bytes), tail glDrawArrays; DrawIndex0x15c6c90 branches to
0x15c6c94(104bytes), tail glDrawElements. This narrows the probe, not a visibility
conclusion. See research/native-draw-submission.md for exact identities/commands.

Candidate23 includes opt-in pipelineNativeSubmit (also pipelineCapture true),
six distinct draws/file/kind. Paired native entry/return records counts/selectors,
exact wrapper/draw identity, root and GL state after return, plus GL-budget
eligibility at entry. Auditor requires explicit23 arm and strict paired scope;
native return never proves GPU execution. Sampling/dedup gaps stay explicit.
Existing native22 initializer/6-update replay still passes with revised auditor.
21 Node +9 Python context/audit tests pass; syntax/diff checks pass.

Signed/aligned current candidate:
tools/data/memorial-audit/diagnostic-v23-submit-r2/ffbe-trace-signed.apk
SHA256 bb3b4ca069d365d76cd0c6890e7dccc746d26c146837f9948480a72cef6afa91.
The earlier diagnostic-v23-submit folder is superseded; neither is installed.
Next live gate is announced clone-only update/calibration, positive arm and one
Climhazzard native-submission capture. User may be playing Resonance: only target
FFBE Trace; the skill swipe still needs manual help unless control improves.
Do not claim material/visibility/batching solved or change preview geometry.

## Current checkpoint: live revision22 complete

Installed FFBE Trace22, verified on-device APK SHA256
eaaf30f5a6748a002a449427f0f4d7ca09540223a3bc48aa7e973e4979e9947d;
calibration passes, ready32. Previous turn was interrupted with physical Escape;
all control stopped. User explicitly resumed permission; controlled only Trace,
never Final Fantasy Resonance. After the successful capture we told the user
control had ended. Do not start controlling the PC again without announcing it.

Brave21:30 scopes/47 callback returns, no errors; six exact GPU/root joins;
ConstX selected wrapper and implementation observed successfully. Climhazzard21:
VelocityX init exact but update4-byte wrapper unhookable. Added second reviewed
PLT/JUMP_SLOT mapping for VelocityX and built/signed/installed22 (source/native
unchanged). Native original implementation is the already exercised reference.
Climhazzard22 token pipeline-v22-clim-20261025-a:25 scopes/25 returns, no errors;
one initializer and six contiguous updates replay bit-exactly from raw source
[30,0,-2,0], captured RNG-before and real deltas. Record/scale outputs match and
RNG remains unchanged through updates. Actual data and complete log/audit are
ignored under tools/data/memorial-audit/pipeline-v22-20261025/.

Important screen finding: source group5002080 receives rectangle[0,0,640,666],
not full canvas; strobe position API[314,482], scale1, wait3, layer2. Context
center[314,839.875,0], groupScale488.125. Engine screen height1100 differs from
camera logical1136. Do not hardcode666 or infer strobe GL scissor from this.
Six exact GL/root joins belong to atk_blow1_purple; no actual GL draw was observed
inside strobe's own scope. Batching/visibility/material cause remains unresolved.
No preview/game change or publication in this block. See current result in
research/native-pipeline-context-observer.md for commands and limits.

Auditor now verifies selected+implementation identity for>=21 and can replay
contiguous VelocityX prefixes, preserving record identity and captured rebirth
boundaries. Latest19 Node +8 context/guard +8 native X +6 dispatch =41 tests pass,
no skips. Next meaningful work is shared source-selected simulation plus native
time-base/birth scheduling and strobe submission/visibility; no more per-skill
size tuning. Do not claim arbitrary skills or original-scene replay supported.

## Latest offline block: revision21 candidate

The user authorized continued offline work while using the PC. No ADB/UI calls
were made in this block. Installed clone remains20. Candidate21 is ready under
tools/data/memorial-audit/diagnostic-v21-pipeline/, signed SHA256
c560dc26ab8e742434bb2b5fc9c23cf71836f8bff8f7275126490cfd32ee8943,
signature/alignment pass. Source observer revision is21. Preparator now emits
pipeline-spec.json directly. See the revision21 section of the context-observer
research note for source identities, exact commands and limits.

Changes: camera/root snapshot reader runs inside actual GL callback; six slots
now cover distinct actual wrapper draws, not empty waits or repeated GL calls
within one frame. Reviewed ConstX4-byte wrapper -> PLT -> JUMP_SLOT ->36-byte
scaling_x update implementation is preflighted; records keep both identities.
Failed attach is explicit and preserves inventory; ambiguous selected wrappers
sharing an implementation are withheld. Evidence auditor enforces21 hook IDs.
Original ConstX update body executes offline for12 controlled updates, copying
size into scaleE8 without modifying record or RNG. Node19 + Python6 context,
6 dispatch,8 native X tests pass (39 total, no skips); syntax/diff checks pass.
No preview or src game changes. New live calibration/context/delegate capture
is pending; announce PC control before using it. No need to ask user to execute
another skill until the probe is installed and positively armed.

## Latest live result: 2026-10-25

Brave Slash combined context capture is secured; see
[native context observer](research/native-pipeline-context-observer.md#live-brave-slash-result).
30 completed scopes/41 callback returns,23 RNG-owner checks match. Five randomized
ConstX initializations match the original ARM64 reference bit-exactly, including
RNG-after, using raw source40/range10 and captured RNG-before. Six actual GPU
draws have viewport[0,1,1080,1917], scissor enabled[0,1,1080,1856], FBO0/program132.
Their drawID1145 has no exact context snapshot: early empty draws spent that
budget1121â€“1126. Do not substitute nearby timestamps. One update interception
failed: selectedConstX0x1fc7a54 is a4-byte B through PLT0x10de4f0/GOT0x2dd9d20
to reviewed scaling_x::update::Const0x1fc7a30(36bytes). No alias hook installed.
Next instrumentation should join context at actual GL calls and preserve native
wrapper/delegate identity; later probe Climhazzard screen and VelocityX timing.
Do not tune preview geometry. New audit_pipeline_context.py receipt is ignored
brave-audit.json beside brave-complete-log.txt; audit guards4 pass, prior Node15
and dispatch6 pass. No game build/preview changes in this diagnostic milestone.

User said they want to use their PC concurrently: **do not operate BlueStacks
without announcing the next targeted measurement first**. No immediate new
recording is needed; work from local receipts. Last UI operation clicked the
prepared Cloud card in Golden Bomb Rush INT, killing the boss. Navigation is
Memories -> category left twice fromSeason1 -> Event Battles -> Golden Bomb Rush
-> Chapter1 -> INT -> Depart. User prepared Brave Slash because Sky swipes did
not open skills. Existing computer-control permission remains, but honor the
concurrent-use coordination above.

## Native context measurement: 2026-10-25

See [observer contract and receipts](research/native-pipeline-context-observer.md).
Revision20 is installed exclusively on FFBE Trace endpoint127.0.0.1:5575 using
same-key install-r. Signed hash36d9a89757cbfe9c7e02c80a52f460fab2e9b0e05dc7d8613af3c433f833d38e.
First launch calibration failed (null); one clone-app restart passes, ready32.
Bootstrap token pipeline-v20-bootstrap-20261025-a arms and stops with no samples
as intended. No selected skill capture yet. Current user question pending:
which menu opens their community-build test battle? Do not spend effort tuning
previews; next actual gate is live source-linked context/prediction evidence.
Legacy particle/locator modes should stay off in the new capture. Prepared
arm-brave.json and startup-log.txt are in ignored
tools/data/memorial-audit/pipeline-v20-20261025/. Node15 and dispatchPython6 pass;
APK signature/alignment pass. Main instance untouched.

## Resumed state: 2026-10-25

Current user priority: stop presentation tuning that does not close original
renderer semantics. The full-host screen change is a declared host adaptation,
not native FFBE evidence. Next milestone must consolidate existing captures,
identify absent fields, then instrument a bounded combined sample of native
screen/target rectangles, root/member transforms, actual update deltas, RNG
ownership/state and relevant draw viewport/scissor/FBO context. Avoid another
unsynchronized video or skill-specific size/offset adjustment. Validate source
prediction against captured native outputs before expanding renderer support.
ADB was reconnected read-only to the configured FFBE Trace port127.0.0.1:5575;
devices lists that endpoint and emulator-5574 (same clone). Main instances were
not controlled. No capture or APK update performed during this status audit.

Latest user issue: Climhazzard flash still has incomplete coverage. See
`research/screen-anchor-host-reference.md`. Added explicit bridge.screen and a
separate full-host screen-reference checkbox, default on for new host contexts
and off for legacy. The unchanged1464.375-square strobe moves down126 pixels:
game bottom gap126.625 ->0.625; native-proportion gap144.625 ->18.625 remains
explicit because its game dock is adapted. Do not enlarge/hide the remaining
edge or claim native Climhazzard screen bounds. Node84 pass; source/game assets
unchanged. Port3138 remains current. Native screen rectangle/context is the next
original-fidelity measurement if needed.

Latest implementation: [preview host-scene contract](research/preview-host-scene-contract.md).
Source inconsistency found: preview used getBattleLayout(1000,1100) but canvas
1000x800, so the 300-pixel game dock never appeared. Added shared legacy/game/
native-proportion contexts; camera/anchors/canvases resize together and a
switchable diagnostic foreground uses actual getBattleLayout bounds. No source
effect resizing/alpha change/plane omission. Port3138 has Brave plan-native-null
and Clim plan-native-x; `?view=native-proportions`. Inspected BraveF29 foreground
off/on and ClimF30; no earlier freestanding white box in these adapted views.
Node82 pass; 49 GPU checks per inspected skill pass, no warning/error log entries.
No capture or game publication. Native projection proportions are measured, but
anchors and dock layout remain host adaptations. Do not call this original scene
replay or proof of native UI/scissor/timing. Older ports/views remain comparisons.

Latest diagnosis: [white-plane viewport/UI context](research/white-plane-viewport-ui.md).
Actual recorded Brave vertices reproject to X[-761.0625,1395.5625],
Y[-489.9295,1430.0704] in1080x1920. A separately inspected original video has
opaque party panels from roughlyY1190: the remaining bottom edge is in that
screen band. Cross-capture UI occlusion is a supported hypothesis, not exact
same-frame proof. No mask/size/rendering patch. Direct GL-call inventory finds
one scissor site in Cocos GLView, not a direct Bishamon-local site; this does not
establish live clip state. Next: explicit host camera/battle-surface/foreground
composition contract; if needed measure actual viewport/scissor/FBO at draw.

Latest user steering: white boxes still appear in Brave Slash and Climhazzard;
the user explicitly corrected that Blade Beam has none. See the new follow-up
in `research/brave-slash-white-flash.md`. Fresh staged texture inventory confirms
exactly one fully opaque white texture in each affected skill, none in Blade.
Prioritize shared camera/viewport/placement/clipping for those layers, rather
than claiming the X integration fixed their boundaries. Native pixel projection
already puts Particle34 beyond both side edges but not the bottom of the full
viewport; UI occlusion/scissor/timing remain unverified. No new capture or
playback modification in this follow-up. Current Climhazzard candidate remains3137.

Latest integration: [deterministic native Particle X preview](research/native-particle-x-preview.md).
`--native-particle-x` prepares source metadata and enables a bounded shared
OneX/nonrandom ConstX display gate. Current candidate is Climhazzard
plan-native-x.json, port3137, preview F30 / skill F12, switch on. One strobe
Particle qualifies (1/7); random/dynamic and source-less cases retain preceding
comparison/withheld states. Off/on screenshots in tools/data/native-x-preview.
Browser: 49 GPU fixtures pass, no warning/error logs returned. Node runner78,
Python pipeline77 pass; targeted X/coverage9 rerun pass. No new capture or game
publication. Other skills remain at their plan-native-null baseline on3136.
Next gate: real VelocityX delta-time scheduling or native random-state ownership.

Latest block: [native Particle X-scale chains](research/native-particle-x-scale.md).
`emulate_particle_x.py` executes OneX/ConstX/VelocityX plus scalar init/update,
36 fixtures and eleven raw-source scale cases. X consumers replicate local
scalar AND group X across all axes, unlike the non-X consumer. Velocity performs
max(0,size+speed*delta) per update and no second integration during drawing.
`native_particle_dispatch.py` now also resolves scaleInit/scaleUpdate tables.
Tests: 20 native reference +6 dispatch pass, zero skips. No new capture, emulator
action, preview change or game build. Next: bounded shared geometry integration
using these exact selections where group/local-scale producers are supported;
actual native time/RNG scheduling remains open. Receipts stay ignored.

Latest block: [Particle source dispatch and Joint scale](research/native-particle-source-dispatch.md).
`tools/native_particle_dispatch.py` resolves all 13 corpus Particle scale/rotation
make-vertex selections from raw fields +0x12c/+0x128 and native relocation tables.
Pink node34 matches the existing observed callback; Power Geyser's three Particle
selections no longer need authoring. Joint pointer store/consumer and the Null
PostUpdate scale copy are traced. An additional native ZScreen-to-Particle fixture
checks their compatible scale inputs. Tests: five dispatch plus thirteen native
reference tests pass. No runtime gate changed. Next: source-selected X consumers
(six VelocityX, four ConstX, one OneX), their init/update and other Joint producers.

Latest continuation: [constant Particle module dataflow](research/native-particle-module-dataflow.md).
`emulate_particle_modules.py` executes Const scale/rotation init and make modules
plus translation consumption, then feeds the observed writer. Sixteen controlled
chains confirm local Z roll, record/group scale multiplication, range sampling,
scale clamp and RNG advancement even for zero ranges. Six new tests plus the six
writer tests pass. Do not equate fixture order with game RNG scheduling.
Next offline gate is the producer of the vector at MakeVertexContext+0x58 and
constant-module dispatch. No runtime/preview gate or published asset changed.

Follow-up under the user's no-new-recordings constraint:
[offline Particle writer reference](research/native-particle-writer-offline-reference.md).
New research tools: `tools/memorial/emulate_particle_writer.py` and
`test_particle_writer_reference.py`. Forty-eight controlled ARM64 cases agree
with the recovered geometry equation; reconstructed node34 inputs reproduce its
existing six-position output exactly. Six targeted tests pass, zero skips.
Preview/runtime are unchanged. Next offline gate: trace computed context fields
`+0xb8/+0xbc/+0xc0/+0xc8/+0xcc` through the traversal at `0x2021718` and its
modules. Do not assume world Euler Z provides native roll. No new capture,
emulator control, commit, push or publication occurred in this block.

The user resumed remotely from a phone. FFBE Trace was listed as open but was
not controlled or modified. No manual action or new capture was needed.
Latest milestone: [offline native ZScreen reference and shared locator](research/native-zscreen-offline-reference.md).
New plans: plan-native-null.json, port 3136. All four matched Billboard control
nodes are eligible under the constant-roll/positive-constant-scale/identity-view
gate. Model/Particle facing and broader simulation remain open. Sixteen offline
instruction fixtures and six existing sample agreements are documented with
their assumptions. Tests: 86 Node /84 Python, zero skipped.

Next questions: Particle display geometry/roll, Model billboards, source-less
Power Geyser controls, general inheritance/time/random evaluation and ordering.
Do not repeat shader/blend/default-colorScale recovery. Optional Unicorn is
inside ignored tools/data; game and preparation do not require it. No commit,
push or publication occurred. The sections below retain the previous snapshot.

Saved at the user's request on 2026-10-24. Work stops here for the night.
Start with this file and [the pipeline handbook](asset-pipeline-handbook.md).

## Objective and working agreement

Build a reusable original-data skill renderer/import pipeline, then resume game
design. Prioritize shared rendering semantics over character-specific visual
corrections. Existing recordings and local sources should be used first. The
user authorized autonomous bounded blocks when no manual recording is required,
and wants some account quota left to review results. No new manual recording
was needed for the latest material/blend blocks. Do not request another capture
without identifying the specific unresolved runtime value it would establish.

Communication is German; code, comments, documentation and game strings are
English. Read the handbook and relevant workflows before pipeline changes.
Keep unsupported behavior explicit and raw research data ignored.

## Latest completed milestone

The exact report is [native framebuffer blending and global uniforms](research/native-blend-global-uniforms.md).
Earlier supporting reports are [initial shader selection](research/native-material-selection.md),
[Model/Basic materials](research/native-model-basic-material.md), and
[Add material](research/shader-add-material.md).

- All 56 source Quad/Particle/Model nodes in the three-skill corpus have initial
  shader selections. This is not arbitrary-skill support or live GPU binding.
- The verified Model subset is UV-bearing single-submesh BR3M. Native vertex
  color multiplication is checked against the original shader pair.
- Add preserves base alpha and adds secondary RGB weighted by secondary alpha.
- Distortion weights displacement and output alpha by the sampled secondary
  alpha. Source layer-alpha controls and other playback details remain open.
- Constant Basic layer tint is supported only with matching authoring and exact
  shader identity. All 26 accepted tints happen to be neutral white here.
  Ten Power Geyser Basic nodes lack authoring and one slash node has random tint.
- New `--native-blend` mode uses native FUNC_ADD and the seven recovered GL
  factor rows. The corpus uses 48 SemiAdd and 8 Semitrans source nodes.
  Semitrans alpha differs from the legacy Three normal preset; SemiAdd already
  matched. Do not claim both presets needed correction.
- RGBA is preserved inside each preview effect pass, then RGB is presented with
  alpha 1 to avoid a second browser blend. Back/front phases still cross a 2D
  presentation boundary; this is not a complete original render graph.
- Global colorScale defaults to RGBA 1 in the native Animation constructor.
  Draw copies it into pixel constants, and BishamonData::setAlpha writes its
  alpha component. Invocation values/timing and other caller writes remain
  unobserved; no global fade curve was invented.

These are isolated research candidates, approved false. The Phaser game still
uses its previously published effects. Do not publish a preview or enable skill
rewards merely because a shader fixture passes.

## Reopen the current candidate

Latest preview: `http://127.0.0.1:3135/?skill=214820`. Ports 3133/3134 describe
preceding material milestones. Server availability must be checked after restart;
a remembered URL does not prove the server is running.

```powershell
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/brave-slash-composed/plan-native-blend.json --plan tools/data/shared-skill-review/blade-beam/plan-native-blend.json --plan tools/data/shared-skill-review/climhazzard/plan-native-blend.json --port 3135
```

Skill IDs: Brave Slash 214800, Blade Beam 214810, Climhazzard 214820. The last
candidate was left at Climhazzard F50, native blend enabled after an off/on A/B
check. Screenshot: `tools/data/native-blend/climhazzard-verified.png`.
Existing source/authoring arguments and preparation flags are linked
from the latest report. Retain them when generating a new comparison plan;
do not silently replace the current baseline.

Actual final checks:

- 83 Node tests and 84 Python tests (71 pipeline +13 Memorial), zero skips.
- Each of the three browser candidates completed 15 native framebuffer checks,
  18 Basic/Add/Distortion checks, 8 scene-blend and 8 model-RGBA checks.
- Source/coverage and material/alpha receipts refreshed in tools/data/native-blend.
  The latter verified 30 texture files and 20,117 active instance-frame samples,
  finite matrices/colors and alpha 0..1. Those samples do not prove source-time
  or native framebuffer fidelity.
- The game build passed in a preceding material block with the existing bundle
  size warning; it was not rerun for the final tools-only blend block.

## Remaining work and next bounded block

1. Inspect the current coverage receipt for active geometry/facing or parent-
   transform mismatches. Choose one source-backed shared subset with concrete
   visible impact, validate against existing native evidence, and implement it.
   Unsupported Particle rolls/scales, Model billboards and Null/parent variants
   still have legacy or experimental behavior. Avoid another broad inventory
   without a rendering question it resolves.
2. Complete parameter evaluation where it affects active nodes: random sampling,
   source-age/timeline conventions, selected curves, parent color/alpha/transform
   influences, texture motion and distortion layer alpha. Power Geyser remains
   an important source-less control/authoring gap. Asset presence is not evidence
   for a guessed control mode or default.
3. Apply verified source draw ordering/priorities. Depth/cull behavior, other
   primitive layouts and global runtime overrides are not closed by blend tests.
4. When those boundaries permit it, validate a different skill family through
   the common path. Three Cloud skills do not demonstrate universal support.
5. Design the reviewed publication bridge into Phaser only after the supported
   renderer subset is explicit. Preserve deliberate roguelike damage/MP/targeting
   definitions; original chaining and damage formulas are not prerequisites.

Do not repeat shader slot recovery, the default-colorScale question, or the
legacy SemiAdd comparison as if they were unknown. For global alpha specifically,
the setter is now understood; the missing evidence is invocation values/timing.
Prefer existing logs/static code until an actual need for a new capture is clear.

## Local evidence and sync caution

Key tools: native_material_selection.py, original_effect_player.mjs,
prepare_original_preview.py, original_basic_material.py, inspect_m3r.py,
audit_renderer_coverage.mjs, and memorial/inspect_native_calls.py. The last tool
now supports bounded executable ranges and direct B/BL caller inventories;
neither claims indirect-call coverage or inferred function boundaries.

Pinned source APK is tools/data/memorial-audit/installed-base-v208.apk. Native
library SHA-256 is 6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77.
The exact APK/package hashes and GL table hash are in the research reports and
generated plans. Raw sources, prepared research plans, receipts and screenshots
remain ignored. Preserve tools/data as well as the large local source folders
when moving PCs; see [the two-PC guide](two-pc-handoff.md).

The working tree contains substantial accumulated modified/untracked files
(65 status entries before this handoff was added). No commit or push was performed for these latest
blocks. Do not assume GitHub contains this state, reset it, or discard earlier
work. The user asked only to save the handoff tonight.

The last documented emulator baseline is the stable observer14 in the FFBE Trace
clone, with the main instance untouched and root disabled. Revision19 source
was not installed. Emulator connectivity/current screen was not rechecked during
this closing handoff; do not trigger another APK update as a routine first step.

## Mainline arena gallery and interface theme

The reviewed batch workflow is described in [Background import workflow](background-import-workflow.md). Its generated catalog distinguishes master references, known unavailable banks, and reviewed thematic choices. Only reviewed and successfully prepared arenas are offered in the gallery.

The interface uses locally hosted Cinzel for display headings and Source Sans 3 for controls, reading copy and battle labels. Both are bundled under their OFL licenses. The DOM typography scale, panel styles and focus treatment live in `src/ui/interfaceTheme.css`. Shared colors live in `src/ui/designTokens.ts`. Phaser retains the existing battle coordinates and sprite sampling. The battle toolbar uses the rendered canvas rectangle so it does not cover the title control. The reward cards remain translucent over the battle scene.

Chrome verification used the production battle renderer in the gallery and the existing browser review harnesses. The three new stage timelines advanced, and their three selected music files loaded. The original four-fight route reached the win state, and its audio test restored the Whisperwood track offset after reload. The review panel needed to be hidden again after reload so it would not overlap the Retreat button. The default and four reserve Source reviews passed, including the frozen Cloud effect comparisons. Desktop screenshots are under ignored `tools/data/arena-ui/`.

## Combat HUD and music roles

Every battle uses the DOM CombatHud; the `?hud=classic` and `?hud=legacy`
comparison modes no longer exist (legacy HUD removed 2026-11-07). Phaser keeps actors, live markers, effects and action banners.
The new DOM layer draws the current combat state in CSS pixels, tracks the canvas
rectangle, and stays under the Encounter and reward overlays. At 900 x 720 the
legacy 13 logical px text measured approximately 8.5 CSS px, while the old
104 logical px command plate measured 68 px. The new Attack label is 16 CSS px
in a 32 px button. The dock scrolls at short viewport heights.

Read the [battle music roles](background-import-workflow.md#battle-music-roles)
for bank identity, loop markers, and role-aware recommendations. The Rebirth
and Remake archive labels must be kept distinct from classic FFVII tracks.

Chrome checked legacy/Classic/Compact at 1440 × 1000, 1100 × 760, 900 × 720
and 840 × 620. Compact controls measured 16 CSS px and 32 px high in all four
sizes. Mouse and Space execution passed. The actual four-fight browser run used
the DOM dock to issue attacks and confirmed the normal/boss crossfade, music
continuity through rewards, saved audio preferences and reload position.
A separate reviewed save fixture exercised the Awakening UI and its skip,
Reactor 05, direct selection of the second enemy, insufficient MP and the
defeat presentation. Gallery snapshots checked all three animated stage clocks.
Default and reserve Source reviews and the frozen Cloud pixel comparisons passed.
Local screenshots and receipts are under ignored `tools/data/combat-redesign/`.

## Arena First Battle Ribbon

The normal expedition and the gallery now use one Battle Ribbon. Party portraits
use the registered unit portrait files. HP and MP are separate meters. Available
equipped Source commands are visible without opening a submenu. Choose a command
with 1–4 or a click. An individual target is selected in the arena, or with
arrow keys/Tab and Enter. Escape cancels. Fixed-recipient commands start
immediately and highlight their reviewed recipients. Actor bounds and the
current camera project the overlay targets independently of emission layers.

Aerith's former toggle, ranged Holy Light fallback, and its test were removed.
Aerith's published atk clip, move-to-target, impact frame and imported cue are
used by her ordinary attack. Barret still dispatches the Gatling projectiles.
Legacy canvas command controls remain for the original Source inspection routes
and the explicit legacy UI comparison, with no attack-mode switch. Old
experimental stance keys on a run or member are discarded during load without
changing combat resources, form data, rewards or RNG.

Validation: build, 25 Node test entries and five stage Python tests passed.
Desktop Chrome checked 1440 x 1000, 1100 x 760, 900 x 720 and 840 x 620.
A full run issued commands through the ribbon and clicked the arena targets.
The same run checked continuous area music, the Reactor boss cue, retreat and
reload. Browser attack traces verified Cloud, Aerith, Jack, Delita, Cloud of
Darkness and the Barret debug reserve. Aerith reached impact at frame 19 of
aerith_atk and emitted SE:7. Barret dealt four projectile impacts. The Source
party suites and frozen Cloud effect comparisons passed.

The fixture review covered three equipped skills, legacy stance data in a
reload, Ochu, Awakening, two simultaneous Reactor targets, 0 MP and the defeat
presentation. Chant healed its marked allies without confirmation. No published
Source skill currently admits a single-ally healing action, so the targeting
UI has no productive single-heal screenshot. Screenshots and browser receipts
are under ignored tools/data/battle-ribbon/.
