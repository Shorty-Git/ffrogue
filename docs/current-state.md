# FFRogue – current state and how to work on it

Single entry point for any developer or AI picking up the project. Read this first, then
`docs/vision.md` (goals), `AGENTS.md` (rules) and the specialised docs linked below.
Last consolidated: 2026-11-07.

## Product state

- Playable PC roguelike prototype: title → slot-machine team draw (3 heroes, rerolls) →
  expedition (2 areas, 4 encounters, Ochu and Guard Scorpion bosses) → rewards / awakening →
  result. Saves locally. Roster since 2026-11-09: 51 units (26 characters plus 25 variants, 49 drawable) with 346 Source skills and 49 Limit
  Bursts (253 before the pipeline-gate fixes of 2026-11-09 evening: zero-prefix motions 3/5/6, `@` branches,
  empty 99999999 rows, raise) (variants: `tools/characters/roster-variants.json`); before the variants: 26 characters, 161 skills, an LB each (`tools/import_character_wave.mjs`). The original seven (Cloud, Aerith, Barret, Cloud of Darkness,
  Cloud AC, Delita, Jack) plus Squall, Tifa and 18 wave characters (Warrior of Light … Cidolfus, FFI–FFXVI,
  FFT, Type-0). Awakened forms go up to 7★ / NV; FFXVI units are NV-only. New profiles unlock heroes
  gradually (see Meta-progression).
- Rewards (`src/run/runState.mjs`): learn skill, skill rank, stat, awakening (boss), Field Rest
  and Phoenix Down (`revive`, 2026-11-08). K.O. persists between battles; while a member is
  K.O., one revival offer (50% base HP, `REVIVE_HP_SHARE`) is guaranteed among the three, next
  to the guaranteed boss awakening. A K.O. member enters the next battle in its dead pose; a
  revived member starts with an empty Limit gauge (a K.O. empties it).
- 47 Source skills (original FFBE effect data rendered in real time). Authoring-free imports
  2026-11-07/08 include Meteor Rain, Banish, Holy, Fury Brand, Healing Wind, Curaja, Earthly
  Healing, Prayer of the Cetra, Northswain's Strike, Northern Sky Apprentice, Meditate, Big Shot,
  Ungarmax, Grenade Bomb, Satellite Beam, Cheer, Call of the Void, Fusion Sword 1st/3rd, Spin Drive,
  Reraise (auto-revive), Thundaga Blade (first type 7 lightning), Thundara, Thundaga, Sonic Impact, Buster End,
  Finishing Touch (both Clouds), Fusion Sword 2nd/4th, Pulse of Life, Warring Slash. Approximation mode plays
  repeated generation cycles once and falls back to the authoring-free stand-in when matched
  authoring disagrees with the binary (both listed in plan.approximations).
  Approximation mode also treats empty selected alpha curves as constant and skips engine-only
  effect groups without files (e.g. 99999999), each listed in plan.approximations. Members starting before frame 0 are clamped to 0 in approximation mode.
  + 2 Limit Bursts
  (Cloud's Omnislash; Cloud AC's Omnislash Version 5, the first authoring-free import, 2026-11-07).
- Battle UI (DOM `CombatHud` over Phaser): target-first (enemies clickable any time, crystal
  cursor), Attack + up to 3 skills + Limit Burst as one-click commands, original FFBE UI parts
  (window frame, HP/MP/LIMIT gauges, enemy gauge, skill icons), animated HP drain with damage
  trail, buff/debuff status badges with remaining rounds. All menus use the same FFBE window style (`src/ui/ffbeTheme.css`).
  Details: `docs/battle-layout.md`.
- Limit Burst gauge: `src/run/limitGauge.mjs` (+25 per action, damage taken fills, LB empties
  it). Only heroes with a published `type: LIMIT` skill have one. Since 2026-11-08 the gauge
  carries to the next battle (`member.limit` in the run save) for heroes who end a battle
  standing; a K.O. empties it.
- Enemy single-target attacks hit a random standing hero (`src/run/enemyTargeting.mjs`,
  combat RNG stream); before 2026-11-08 they always hit party slot 1.
- Friendly effect kinds (`allyEvents`, stationary `self`/`party` skills): `heal`, `physical-boost`,
  `auto-revive` (Reraise-style: `hpFraction`, `turns`; the next K.O. in the window revives once)
  `limit-fill` (`amount` 1–100 on the Limit gauge) and `raise` (2026-11-09: revives K.O. allies with
  `hpFraction`; only with `allyTargeting` `fallen-ally`/`fallen-allies`). Validated in `reviewedSkillEvents`,
  scaled by skill level in `skillForRun`, described in the HUD by `skillDescription`. The last two
  are data model + battle handling only (2026-11-08); no published skill uses them yet.

## Battle start prepares only this battle's scenes (2026-11-09)

BattleScene used to prepare every registered skill scene (about 400, each in 1-3 target variants)
one after another at battle start, so late registry entries (e.g. Aerith's Full-Life) stayed
unplayable for minutes and the cost grew with every import. It now prepares only the party's chosen
skills and Limit Bursts plus every `presentation` the encounter's enemies reference
(`ENEMY_CONTENT`/`ENEMY_SKILLS`). BootScene still loads all manifest JSONs (cheap).

## Enemy debuffs on heroes and Esuna (2026-11-10)

- Hero statuses gain enemy debuffs (`src/effects/heroBuffs.mjs`): `break` per stat (ATK/MAG lower
  dealt damage, DEF/SPR raise taken damage of that type, alongside Protect/Shell) and `blind` (each
  basic-attack hit misses with 50 %, "MISS"). Original ailment icons (break_atk/def/mag/spr, blind).
- import_enemy_skills.mjs decodes the extra processes of damaging monster skills: 24 (negative stat
  changes -> breaks, strength held to 10-40 %, 1-5 rounds) and 6 (blind chance). Current carriers:
  Condor Beak (DEF -30 %), Sweeper Smoke Shot (blind), X-ATM092 Arm Crush+ (all stats -40 %, party).
  Debuffs land once per hit hero with their chance; floating "... BREAK" / "BLIND".
- Esuna-type cleanse (process 5 whose ailment list includes blind): friendly effect `cleanse` removes
  breaks and blind (adaptation: original Esuna clears ailments only). Imported: Esunaga (Aerith, Unsung
  Hero Ramza), Esuna (Wondrous Flash Lightning), Medicate (Delita, Ramza), Return (Cloud of Darkness),
  Ray of Hope (Terra). Poisona waits for poison. Dispel (59) waits for enemy buffs.
- Browser check: Arm Crush+ broke all four stats on the party, Esunaga cleared them
  (tools/data/debuff-check/). Roster: 379 skills. Tests: `tools/test_hero_debuffs.mjs`.

## Barrage-type commands (process 42, 2026-11-10)

- Process 42 ("0,0,minHits,maxHits,power%", no effect or hit frames) repeats the unit's basic attack.
  New execution `basic-attack-repeat` (`src/effects/basicRepeat.mjs`, shared by importer and battle):
  the hero dashes in and plays the attack clip N times (rolled from min..max) with the original
  basic-attack hit frames; range 3 picks a random living enemy per repetition, 1 the target, 2 all.
  No scene: `canUseSourceSkill`, `runCatalog`, `heroBodyClips` and the pipeline report admit it
  explicitly; import_character keeps `execution` only for this type. Per-hit power is the source
  percentage held to 50-100 % (Barrage rows carry 1500). The importer drafts these outside --max-skills.
- Imported: Barrage (Bartz, Cloud of Darkness, Delita), Gale Barrage (Bartz), Lightning Flash (Jack);
  the same wave also published Delita's Karma Blade. Roster: 372 skills. Browser check: Gale Barrage
  and Lightning Flash land every repetition. Tests: `tools/test_basic_repeat.mjs`.

## Cooldown commands and periodic Null activations (2026-11-09)

- Process 130 ("cast ability X, every a turns, first after b") is a wrapper. inspectCharacter already adds
  the wrapped ability to the catalog and imports it; the wrapper itself is reported as "not supported"
  but has no content of its own. Of 86 such wrappers in the roster, 24 wrap damage skills and 18 of those
  were already published (Limit Raid, Seventh Heaven, Boiling Point, ...). FFBE cooldowns are not
  modelled; wrapped skills cost MP like any other.
- `bmb_playback_fields.py`: a ControlNull with generation mode 1, count 1, duration > 1 and interval > 0
  (periodic activation) plays the decoded mode-0 schedule in approximation mode and is recorded as
  `periodic-null-activation-as-mode-0`. Unblocked "Unknown native generation delay profile" for
  Ancient Holy, Flames of Rebirth, Cherry Blossom, Focused Shot and Burst; Ace Vermilion's wave also
  added Burst++, Support Hand+, Jackpot Triad, Shining Card, Spark Card and Card Showdown. Roster: 366
  skills. Visual check: tools/data/delay-profile-check/ (Ancient Holy, Cherry Blossom hit the target).

## Protect, Shell and source-derived stat buffs (2026-11-09)

- New hero status `guard` ({damageType: physical|magical, reduction, turns}; `src/effects/heroBuffs.mjs`
  `heroDamageTakenMultiplier`). Enemy damage of that type is reduced; guards of both types stack.
  Badges use the original DEF-up / SPR-up icons (`export_status_icons.py`: guard-physical,
  guard-magical); floating text PROTECT / SHELL. Level scaling: +0.05 reduction and +1 turn per level.
- Enemy skills carry `damageType` from their original damage process (15 magical, 1 physical;
  import_enemy_skills.mjs): 11 magical, 17 physical. Basic and FFRogue enemy actions are physical.
- Friendly stat buffs come from the source (`tools/lib/source-buffs.mjs`): process 3 "ATK,DEF,MAG,SPR"
  plus 18/19 mitigation. ATK or MAG -> physical-boost x1.3, DEF or 18 -> physical guard 0.3, SPR or
  19 -> magical guard 0.3, 3 rounds (reviewed defaults; FFBE percentages are not copied). The importer
  drafts them with `--source-buff`; `node tools/refresh_source_buffs.mjs [--check]` re-derived the 8
  earlier physical-boost-only drafts (Cheer x3 and Embolden gained Protect; Focus x2, Meditate and
  Magical Activation gained Shell). Tests: `tools/test_guard_buffs.mjs`.
- Imported with the new rule: Protect/Shell (Cecil, Ramza), Protect/Protectga (Cloud of Darkness),
  Protectga/Shellga (Aerith Cetra) and Protectga (Avalanche's Barret, now drawable). Roster: 355 skills,
  50 of 51 units drawable (Red Wings Cecil still needs barrier/cover mechanics). Browser check:
  Protect cut a 290 hit to 203.

## Playtest round 2026-11-09 (developer feedback)

- Enemy turns: an original monster skill ends after its last hit plus 400 ms
  (`ENEMY_SKILL_SETTLE_MS`); the scene's decorative tail fades on its own, as for heroes. Average
  enemy skill 4.0 s -> 1.7 s over the 28 imported monster skills; a real turn with Bite + Beak took
  3.2 s in a browser run.
- Basic attacks hit on the original frames: `character.battle.hitFrames` comes from the unit row
  `attackFrames` (frame on the attack clip's 60 fps clock, damage share). import_character.mjs writes it
  on every publish; `node tools/backfill_basic_hits.mjs [--check]` refreshed all 51 published
  characters. Cloud of Darkness now hits with her beam (frame 75) instead of sprite frame 2.
  Multi-hit rows split one damage roll by their shares. Tests: `tools/test_basic_hits.mjs`.
- Screen surfaces: two more generic import rules (see Pipelines). Squall's Lion Heart darkening now
  covers the whole canvas and its end flash is a battlefield flash instead of a white box. A dry run
  over all 416 screen-API plans matched only Lion Heart.
- Rarity: the original base rarity is the start-level floor (3★ Lv 1, 4★ Lv 2, 5★ Lv 3, 7★ Lv 5,
  NV Lv 6); the weight table can only lift a hero above it. Summons and expedition unlocks are weighted
  by base rarity (`SUMMON_WEIGHTS` 50/35/25/15/10/6 for Lv 1..6).
- Summon roulette: "Summon a hero" plays a case-style strip of hero heads (real summon weights, Fate
  Engine tier colours) that stops on the summoned hero, then the result card. Skip and reduced motion
  land at once.

## Levels Lv 1-6 and Bond (2026-11-09)

One power scale for every variant (3★=Lv1 … 7★=Lv5, NV=Lv6). Start levels roll one weight table with
the base rarity as the floor (see above), boss relics give +1 level, and the body follows the original forms. Cards and reels show the level
(a star per level, NV at Lv 6). Run saves are version 3; v2 saves migrate. Design, the duplicate
economy proposal (Bond) and variant import: `docs/progression-design.md`.

## Meta-progression v1 (2026-11-09)

`src/run/profile.mjs` (tests: `tools/test_profile.mjs`) holds a profile in localStorage
(`ffrogue.profile.v1`), separate from the run save:
- Unlocked heroes: a new profile starts with the first reviewed roster (`STARTER_HEROES`: Cloud,
  Aerith, Barret, Squall, Delita, Jack, Cloud of Darkness). The Fate Engine draws only unlocked heroes
  (`drawCatalog`). Saved runs still validate against the full catalog. The profile is always topped up
  to three canonical identities.
- Crystals: 10 per won battle and 60 for a finished expedition. Each finished run settles once, keyed
  by seed and history length.
- A won expedition unlocks one random locked hero, shown on the result screen.
- Summon on the title screen: 100 crystals summon one hero, weighted by base rarity; duplicates give
  Bond. A case-style roulette shows the draw.
- Power split stays with the run rules: start forms are drawn by rank weights (3★…7★/NV,
  `originalForms`), and higher ranks give `powerPerRank` stat growth. NV-only units (FFXVI) start at
  their NV base.
- Developer direction for later: more influence over starting heroes and their level between runs.
  Candidates are duplicates raising a hero's minimum start rank, and a "favoured hero" slot.

## Balance (2026-11-08, overnight cloud session)

Evidence tool: `node tools/simulate_run_balance.mjs [--runs 400] [--json out.json]` plays
seeded runs with a greedy policy through the game's own rule modules (run state, encounters,
enemy patterns, statuses, buffs, Limit gauge, skill scaling); only BattleScene's damage
formulas are re-implemented there (kept next to the code they mirror — update both). It reports
pacing trends, not skilled play. Rerun it after any balance change.

| | before | after |
| --- | --- | --- |
| `RUN_BALANCE` (normal HP / boss HP / +per area / damage / +per encounter) | 950 / 2600 / 1200 / 140 / 25 | 2000 / 5000 / 2200 / 300 / 70 |
| Simulated run win rate | 100 % | 99.5 % |
| Rounds per encounter 1–4 | 1.0 / 1.7 / 2.1 / 3.0 | 1.2 / 2.7 / 3.6 / 5.0 |
| Party HP after final boss | 92 % | 51 % |
| Limit Bursts per run | 0.01 | 1.54 |

Skill gameplay fields (recipe and published `skills.json`; visuals untouched): Brave Slash
18→12 MP; Trigger Smash 55→40 MP; Meteor Rain 2→3.5×; Ungarmax 2→4.2×; Holy 2.5→3.5×;
Northswain's Strike 20→18 MP, 2.2→2.6×; Northern Sky Apprentice 2.8→3.4×; Omnislash Version 5
15.2→8× (desc keeps the original 15.2× as provenance); Iai Strike 12→20 MP. Reason: each was
dominated by a sibling skill (e.g. Meteor Rain 2×/45 MP vs Blade Beam 3×/30 MP) or ended
fights alone. Not touched: Chant, buffs/debuffs, enemy patterns, reward pool, MP economy
(no MP regeneration; ~23 % party MP left after the final boss in the simulator).

## Decisions that shape all work (from the developer)

- Skill fidelity bar: looks convincing, hits the target, impact on the enemy. Not pixel parity.
- Import must scale (FF I–XVI roster, 10–20 skills per character): data-driven importer, no
  per-skill manual tweaks, no recordings. Reverse engineering is time-boxed; generic rules
  beat exact single-skill reconstruction. Approximations are explicit and listed.
- Work autonomously in small verified milestones, commit + push to `main`, report afterwards.
- Accepted visuals (15 skills, crystal encounter, slot lever, awakening) must not change
  without reason; the frozen Cloud baseline guards this.

## Pipelines (all in `tools/`, game loads only prepared files)

| Content | Entry | Doc |
| --- | --- | --- |
| New character (all-in-one) | `node tools/import_full_character.mjs --key <k> --unit <id> ...` | character-import-workflow.md (top) |
| Characters / bodies | `node tools/import_character.mjs --recipe tools/characters/<key>.json` | character-import-workflow.md |
| Skills / Limit Bursts | plan → stage → prepare → publish (see below) | skill-reconstruction-workflow.md (top entry) |
| Skill icons | `node tools/export_skill_icons.mjs` after any skill publication | character-import-workflow.md §5 |
| Battle UI parts | `<python> tools/export_battle_ui.py` | battle-layout.md |
| Long body sheets | `<python> tools/wrap_wide_sheets.py` (grid > 16384 px) | skill-reconstruction-workflow.md |
| New stage (all-in-one) | `node tools/import_stage.mjs --recipe tools/stages/<key>.json` | background-import-workflow.md (top) |
| Backgrounds / music | see background-import-workflow.md | |

Abilities (ABILITY rows) need the composed path first (unit attack prefix / zero-prefix Motion 2):
`compose_skill_effects.py --unit-id <unit> --skill-id <id>` → `resolve_composed_skill.mjs` →
`stage_original_skill.py` (see skill-reconstruction-workflow.md). MAGIC and LIMIT rows carry no
motionType: plan → stage as below; their hits are the row's attackFrames at offset 0.
Fire any skill for a phone GIF: `node tools/capture_battle_screencast.mjs <dir> --hero <i> --skill <id>`.

Skill / Limit Burst import (example Omnislash; replace character and source id):
```powershell
node tools/plan_source_imports.mjs --select cloud:207000105 --output tools/data/<run>/intake
<python> tools/stage_source_imports.py --selection tools/data/<run>/intake/selection.json
<python> tools/prepare_original_preview.py --source tools/data/<run>/intake/cloud-207000105/skill-source.json --unit cloud --motion atk --recipe tools/characters/cloud.json --profile source-preview-v1 --authoring-directory rawdata/assets/battle_effect --native-shaders-apk tools/data/memorial-audit/installed-base-v208.apk --native-shader-package tools/data/particle-native-audit/bmshaderpack.bin --renderer-reference tools/data/memorial-audit/diagnostic-v7/renderer-reference.json --approximate-unverified --output tools/data/<run>/intake/cloud-207000105/plan.json
node tools/publish_scene_presentations.mjs --recipe tools/presentations/<recipe>.json
node tools/import_character.mjs --recipe tools/characters/cloud.json --publish-skills-only --python <python>
node tools/export_skill_icons.mjs
```
The recipe skill entry needs `type` (ABILITY/MAGIC/LIMIT), `ffbeId`, scope, moveType,
`execution: prepared-source`, original `damageEvents` (the pipeline re-derives and compares
them), `scenePresentation`, `preparedSourceReceipt` and `actionChoreography`. The
presentation recipe needs `placementCoordinates: ffbe-screen-api` + `placementReview`.

Generic rules added 2026-11-07 (no per-skill exceptions):
- `--approximate-unverified`: unverified curves held constant, unknown enums take the
  authoring value, all listed in `plan.approximations`.
- Anchor mode 3 = caster unit rectangle (`caster-unit`); the host moves the caster so the
  source strike point lands on the target (`casterStrikeOffset`).
- Limit Bursts: catalog kind `LIMIT`, hits from `limitburst.attackFrames`, body `limit_atk`.
- Source scenes own the clock: no hit-stop pauses the caster's body during a prepared Source
  action (it drifted Omnislash's body >1 s behind its hits). Check any Limit Burst with
  `node tools/review_limit_burst_sync.mjs` (body drift per hit must stay ≤ 1 frame).
- Screen backdrops (automatic for `placementCoordinates: ffbe-screen-api` bindings): a static,
  uniform unit-XY Model in a screen-anchored effect whose authored width is ≥ the FFBE logical
  width 640 (e.g. Omnislash's black dimming quad) gets `presentationCoverage` via
  `prepare_scene_flashes.py --screen-backdrops` and is stretched over the whole canvas
  (`host.view`); FFBE's field is smaller than ours, so source size left undimmed strips.
  Colour/alpha curves stay source data. Accepted particle flashes keep the arena clip.
  Second form: an opaque constant-colour uniform Quad (width ≥ 200) on screen for ≥ 80 % of
  the effect's longest node life is a background replacement (`unit-quad`, e.g. Cloud AC).
- Impact flashes (prepare_scene_flashes.py `annotate_white_flashes`, applied with the screen
  backdrops): a short (<= 30 frames), uniform-scale Quad of plain opaque white with constant white
  colour, an alpha curve that rises from 0 to at least 0.8 and back, and an effective width >= 200
  units covers the visible battlefield (`unit-quad`) instead of showing as a hard-edged white box.
  Alpha, blend and timing stay source data. Matches only Cloud AC's Omnislash V5 node 62 today.
  Particle form (2026-11-09): a plain white Particle (white texture and constant colour, same alpha
  shape, <= 60 frames, >= 200 units on both axes) on any anchor gets `screen-particle` coverage
  (Squall's Lion Heart front node 3, 360 x 320, 40 frames).
- Original draw order (approximation imports): `tools/bmb_draw_priority.py` reads the header
  priority-sort flag (0x4d) and emitter SortPriority (Quad +508, Particle +408, Model +460;
  verified on 92 matched pairs) into `plan.drawOrder`; `PreparedSceneBridge.applyOriginalDrawOrder`
  sets `renderOrder` (priority, then node index) instead of three.js depth sorting. Done in the
  bridge because `originalEffectPlayer.mjs` is a frozen baseline identity (test_scene_migration):
  never edit the player casually — republishing all presentations then rewrites accepted
  manifests. Meteor Rain's glow was hidden under its smoke until this.
- Texture tint (Texture1 colour scale) is decoded from IBMB (`tools/bmb_texture_tint.py`).
- Spawn horizon (approximation mode): `effectHorizon` reaches the last original hit + 60
  (Holy hits at 450; the fixed 180 cut its late explosion). Recorded in plan.approximations.
- Screen backdrops also cover uniform Basic Particles held on screen-anchored effects for
  ≥ 80 % of the longest life (`screen-particle`, e.g. Holy's fade). Colour/alpha curves do not
  count as movement for any backdrop rule. Screen-sized form (2026-11-09): a static opaque Basic
  Particle authored at >= 300 units on both axes on a screen-anchored effect is a backdrop whatever
  its life (helper ControlNull nodes can outlive it); the texture may be a gradient (Lion Heart back
  nodes 3 and 4). Tests: `tools/test_scene_flashes.py`.
- Limit clips stay on screen: `tools/annotate_clip_extents.py` (also run by export_unit.py)
  stores `extentX` [left, right] (frame px from pivot, 2nd/98th percentile) on every
  `limit_*` clip; `BattleScene.approachX` first aligns the strike, then clamps the caster so
  the whole clip fits the canvas. Cloud's Omnislash keeps x 494; Cloud AC moves from 206 to
  694. Trade-off: FFBE clips are authored for a narrower screen, so caster-attached effects of
  a clamped LB land between caster and target (damage/flash on the target stay in sync).
  After manifest changes rerun `<python> tools/prepare_victory_poses.py --output public/assets/victory-poses.json`.
- Authoring-free import (approximation mode only): most effects in the dump have no matched
  `.bmsln` (the dominant roster blocker). `prepare_original_preview.py` then uses
  `tools/authoring_sources.py`: decoded IBMB controls first, otherwise the BMSLN corpus mode per
  node type/field from `tools/effects/authoring-defaults.json` (rebuild with
  `<python> tools/build_authoring_defaults.py`, 3957 projects). Also in approximation mode:
  binary ConstFlat Quad RGB is evaluated (`--flat-quad-rgb` on), constant opaque corner
  gradients use their mean RGB, single-shot generation modes ≠ 0 read as mode 0. Each
  substitution is listed in `plan.approximations`. Staging still reports
  `missing-matched-authoring`; that is information, not a stop, in approximation mode.

## Skill sound (2026-11-08)

Original skill sounds come from the common SE bank (SE.acb). `node tools/admit_skill_audio.mjs --python <python>`
admits every published presentation whose effect-group cues are all common-bank cues: cue ID →
name (`tools/read_acb_cues.py`) → vgmstream stream (`tools/data/audio-vertical/se-streams.tsv`,
built by looping `vgmstream-cli -m -s N SE.acb`) → `public/assets/audio/combat/<name>.wav`,
pinned in `tools/presentations/source-audio-review.json`; it republishes the presentation and
regenerates `src/audio/skillCueRegistry.ts`, which `src/audio/combatCues.ts` merges with the
hand-mixed cues (default gain 0.23). Run it (then import_character per character) after every
skill import. 48 of 49 presentations play original sounds; only Trigger Smash is silent (its source
has no sound record). Fixed 2026-11-08: vgmstream names a waveform shared by several cues
"cue_a; cue_b", so the tool now maps every cue name in that list (this was the "alias" gap of Big Shot,
Northern Sky Apprentice, Thundaga Blade and Sonic Impact). A sound group that starts before the scene
(Reraise, raw frame -54) plays at frame 0 and keeps `clampedFromFrame`. The generator had literal line
breaks inside its strings since 5e73b50 and did not run; restored. Blade Beam and Climhazzard got their
master sounds recovered into their legacy manifests (audio only, visual data unchanged).

Next: music transitions (menu → battle → victory) are not smooth yet (developer feedback).

## Environment and tools

- Original reference (developer's BlueStacks "FFBE Trace" Memorial instance): adb via
  `C:/Program Files/BlueStacks_nxt/HD-Adb.exe connect 127.0.0.1:5575` (instance port from
  `C:/ProgramData/BlueStacks_nxt/bluestacks.conf`), screen 1080x1920. Battles: Memories → left
  season arrow → "JP Memories" event list → e.g. Chamber of Crystals BGN → Depart. Swipe right on
  a unit card for abilities; tap the card to act. Record with `shell screenrecord` (set
  `MSYS_NO_PATHCONV=1` in Git Bash), pull, extract frames with
  `tools/extract_video_frames.mjs <video> <outDir> [step] [from] [to]` (needs a blank.html next to the video) (Chrome element screenshots, no ffmpeg).
  Party there: Cloud (NV), Delita, Barret, Jack. Compare before claiming colours/placement.

- Python: plain `python`/`py` are not installed. Use
  `C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`.
- Playwright (headless Chrome) for scripted checks:
  `C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`.
- Dev server: `npm run dev` (port 3000). Review servers: Vite on 3001
  (`npx vite --host 127.0.0.1 --port 3001 --strictPort`) + receipt server 3163
  (`node tools/preview_original_skill.mjs --plan tools/data/braver-20261101/source/plan.json --port 3163 --game-origin http://127.0.0.1:3001`);
  restart the receipt server after code changes; `node tools/check_dev_server.mjs` checks freshness.
- Dev hooks: `window.__ffrogueGame` (dev builds); `createTrainingRun` (`src/run/trainingRun.ts`)
  for fixed training battles (encounter 1 = boss dummy, 2 = two dummies).
- Phone review (developer often remote): `node tools/capture_battle_screencast.mjs tools/data/<run>/frames`
  then `<python> tools/screencast_to_gif.py tools/data/<run>/frames out.gif` and send the GIF
  (CDP screencast, no ffmpeg download needed).
- Manual pages: `/tools/test-source-scene.html` (Source review checks),
  `/tools/test-source-limit-burst.html` (Limit Burst playground), `?gallery=arenas`.

## Verification routine (what "done" means)

1. `npx tsc --noEmit`, `npm run build`.
2. All `tools/test_*.mjs` (node) and `tools/test_*.py` (project Python, run from repo root).
   All tests are expected to pass (since 2026-11-08). `test_scene_migration.mjs` pins the VISUAL
   data of the accepted Cloud manifests (JSON without audioSource) and the effect player bytes, so
   sound can improve freely; a visual change there must be deliberate and noted next to the pin.
3. Source review: Vite 3001 + receipt 3163, then
   `node tools/data/cleanup-20261107/review_all.mjs <out.json>`; compare with
   `tools/data/cleanup-20261107/baseline.json` (FAILs saying "requires", "needs an imported",
   "needs its registered", "default party" are not-applicable). Expect 19 applicable PASS.
4. Visual: headless screenshots / video of the changed flow; technical checks are not visual
   acceptance – the developer accepts visuals.

## Next steps (handoff, 2026-11-08 evening)

GitHub account is suspended (appeal pending / maybe a new account): commit locally only, push later.
DONE (2026-11-08): all raw sources moved into rawdata/ (one folder per source; identical files hard-linked,
legacy recorded paths resolved by tools/lib/raw-paths.mjs). See asset_structure.md "Raw-data layout".
DONE (2026-11-08): raw-data audit plus a sixth source (Memorial download cache, holds la842 and ~286 BGM banks).
There is little byte duplication (2.2 of 30 GB), so the sources were not moved; source priority rules apply instead.
Details: docs/asset_structure.md "Raw-data sources and duplicate audit". Cleanup (developer-approved):
tools/data shrank from 92 to 37 GB; all 92 tests and tsc pass afterwards.
Then, in order (scene transition DONE; one-command character importer DONE 2026-11-08 with Squall, see character-import-workflow.md top; one-command stage importer DONE with Dollet/FFVIII, see background-import-workflow.md top; original monster skills DONE 2026-11-09, see enemy-import-workflow.md top; six stages since 2026-11-09: Whisperwood, Mako Reactor, Dollet, Besaid, Altissia, Fabul; NEXT: enemy support skills/debuffs, jump, FFIX once its battle theme is downloaded, run twists) →
complete character importer (one command: body, poses, all skills via import_skill_batch +
admit_skill_audio + icons + LB + forms; test on a new character, e.g. Tifa AC) → stage importer
(stage + SSPB animations + original music + world enemies/bosses with their skills, mainline FF I–XVI
and Tactics only) → run twists. Remaining skill gaps: type 7 ribbons without FieldGoal, Banishga/Dispelga
(BR3M mesh), support skills without mechanics (Esunaga, Protect, Blind, Store, Speed Drink).

## Basic attack sounds and Limit Burst placement (2026-11-08)

- Basic attacks: `node tools/export_basic_attack_cues.mjs` regenerates src/audio/basicAttackCues.ts for
  every published body. It follows unit.effectFrames → effect_group sound field → the first bank-1 cue.
  The importer runs it, so new characters (Squall was missing) get their swing sound. The 18
  existing entries are unchanged.
- LB placement (BattleScene.approachX): the extent clamp that keeps a travelling LB body on screen
  now lets the body leave the screen by up to a third of its travel before shifting the whole
  performance, because a full clamp moved every hit off the target (Lion Heart +107 px, Omnislash V5
  +480 px). Omnislash is unchanged. Hits on target take priority over full body visibility at the
  clip's widest frames.

## Training grounds (2026-11-08)

Main menu → "Training grounds" (src/ui/TrainingSetup.ts, GameFlow.training/startTraining,
src/run/trainingRun.ts options `party`, `opponent`, `unlimitedMp`, `fullLimit`, `onSettle`).
- Setup: pick 1-3 heroes, each with a form (base, 6★, 7★, NV as admitted by the run catalog)
  and up to three skills; then an arena (every BATTLE_ARENAS entry) and an opponent (one or two
  training dummies, or any ENEMY_CONTENT enemy).
- Opponents have 999,999 HP. Unlimited MP sets MP to 999; a full Limit gauge starts at LB_MAX.
- Never saved as a run; only the last setup is remembered in localStorage.
- In battle: Change setup / Restart / Title. A finished fight returns to the setup.
- Verified headless: Squall 7★ form, MP 999, full LB, Lion Heart against Guard Scorpion in Reactor 05.

## Developer playtest feedback (2026-11-08)

Difficulty after the overnight rebalance feels right (a real challenge, healing matters, debuff
badges read well; skill visuals and sounds approved). Polish before the next character import:
1. DONE (interim): heroes hit by enemies get an impact burst, knockback, strike cue and, for heavy
   hits, a camera shake (`playHeroHitFeedback`). Real monster attack effects come with the enemy importer.
2. DONE: original FFBE skill banners (blue party / red enemy, `skill_banner_*` from the battle UI atlas)
   with the ability name large. Root cause of the tiny text everywhere: the unquoted "Source Sans 3"
   family made every Phaser font shorthand invalid (10 px fallback) — RPG_FONT is now quoted.
3. DONE: enemies use the same body sampling rule as heroes (run_rules bodyTextureFilter, linear).
4. DONE: Mako Reactor plays classic FFVII "Let the Battles Begin!" (400842, loop [143152, 3230640)).
   Source: JP Memorial download cache on the VM disk (tools/extract_memorial_side_stories.py),
   which also holds ~286 BGM banks for the stage importer (asset_structure.md).
5. More variety: enemies, stages, music.
6. DONE: music crossfade lengthened (1.2 s in / 0.9 s out). New default battle entry "shatter"
   (src/ui/paintShatterEncounter.ts): the outgoing screen cracks from the centre, breaks into glass
   shards with FFBE's own se_ev_glass_break (SE.acb stream 274), with a white flash
   (cover 980 ms; then the arena fades up from the dark over 900 ms while the camera eases in and the
   command HUD rises; skippable, reduced motion respected). Old styles deleted. Verified with headless frames
   (tools/data/shatter-transition/shatter.gif).
7. DONE (start sequence polish, 2026-11-08): the party slot machine is the "Fate Engine"
   (src/ui/fateEngine.ts + fateEngine.css). Tiers: bronze 3★, silver 4★, gold 5★, rainbow 6-7★, NV.
   Each tier has its own frame, landing burst, popping stars and FFBE summon sound (System.acb
   se_menu_get_unit1-4; reel slide, fireworks, limit open and result cues in public/assets/audio/fate).
   Rainbow/NV reels slow down with a glow first. A team verdict (Humble/Bright/Golden/Rainbow/Unbound)
   scores the whole draw, because most base units are 5★. Reels decelerate and bounce. The lever has a
   crystal handle, and ratchet/brake sounds were re-synthesised. Title crystal: faceted SVG FF crystal
   (src/ui/titleCrystal.css) cycling blue, silver, bronze, gold and rainbow. GIFs: tools/data/start-sequence/.
8. DONE (playtest follow-up 2026-11-08):
   a) Title crystal is a hexagonal bipyramid drawn live in SVG (src/ui/TitleCrystal.ts) that turns about
      its axis with per-facet shading; colour cycling stays in titleCrystal.css.
   b) Tiers split: 6★ = rainbow (subtle), 7★ = prism. Tease, machine flash, shake and fireworks only for
      prism/NV (fateEngine.isShowTier); 5★/6★ get frame, stars and a soft glow.
   c) Shatter only at run start (GameFlow.battle('start')); between fights a 320 ms dip to dark
      ('fade' mode), then the same fade-up. Root cause of the missing run-start shatter: html2canvas
      cannot parse color-mix(), which the verdict banner used, so the snapshot failed. Rule: no
      color-mix()/color() in UI CSS.
   d) Menu and Fate Engine texts rewritten (FATE SEED, "Begin the journey", "Set out", "SPENT").
   e) Page jump fixed: the reel results, verdict and skills panel reserve their space before the first
      draw (the centred layout changed height by ~110 px before).

## Open items

- More Limit Bursts (limit_atk bodies exist for Barret, Aerith, Jack, CoD) and the remaining
  abilities blocked only by missing authoring (ROSTER_SKILL_COVERAGE.md); other gates are
  unknown node types 4/7/15, non-file groups and conditional branches.
- Banish, Holy and Northswain's Strike await the developer's acceptance (GIFs sent 2026-11-07);
  only Meteor Rain was compared with the BlueStacks original so far.
- Motion 8 (Barret's ranged commands) = stationary atk body, zero-prefix timing, from the native
  body observer (SKILL_RECONSTRUCTION_MAP). Big Shot compared with the BlueStacks original
  (charge flash, orange blast/explosion on the target) — matches.
- Open import gates (roster scan 2026-11-08, tools/data/wave2-20261107/stage.json): BMB node
  type 7 (1856-byte records, NOT a Particle variant: Particle offsets read garbage; no BMSLN
  name in the 3957-project corpus) blocks ~25 roster skills and is the biggest next lever;
  type 4 = EmitterSimpleParticle (592 bytes, verified on 163 CPK pairs, no decoder yet);
  type 15 = FieldGoal (208 bytes, particle attractor). Type 7 = lightning emitter, drawn as approximate bolts by
  src/effects/lightningLayer.mjs when it has FieldGoal children (docs/research/bmb-node-type-7-lightning.md). Also: Warring Slash needs repeated
  generation in the frozen player; commands without effect timelines (Limit Braver etc.).
- Batch import: `sh tools/import_skill_batch.sh <batch.txt> tools/data/<run>` (lines:
  `character skillId id key [--heal N|--buff X|--mult X|--mp N]`) composes/stages, drafts the
  recipe entry (`tools/draft_skill_entry.mjs`, provisional gameplay values), prepares in
  approximation mode, publishes and runs import_character per character. Review GIFs after.
- Unsupported node types 7/4/15 are omitted with their subtrees in approximation mode
  (`tools/bmb_prune.py`, listed in plan.approximations). Type 7 + FieldGoal children = lightning/
  line emitters: lightning-centred skills (Thundara/Thundaga/Thundaga Blade) stay unimported.
  Multi-process hit strings ("@", e.g. Spin Drive) split weights per process. Still open: another generation mode
  (Ancient Holy), authoring-comparison mismatches (Finishing Touch, Fusion Sword 2nd/4th).
- Party buffs (Fury Brand, Cheer) reuse the existing physical-boost status (x1.3, 3 rounds,
  allyTargeting living-allies) and need a `friendlyTargetReview` with the source target/range.
  Support skills without a game mechanic (Speed Drink, Store, Return) stay unimported. Reraise now
  has a game mechanic (`auto-revive`, see Product state) but still needs single-ally scope in the
  presentation pipeline and its own Source review before import.
- Balance values from 2026-11-08 are simulator-based and await play-testing by the developer.
- All Cloud forms use the 5★ Omnislash.
- Several node tests pin manifest SHA-256 values of Windows (CRLF) checkouts
  (test_body_assets, test_stage_content, test_victory_poses); on a Linux/LF checkout they fail
  without any content change (verified for test_body_assets: every mismatch matches after CRLF
  conversion).
- Cinzel name font: developer mildly unsure, kept for now.
