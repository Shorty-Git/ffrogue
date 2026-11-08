# FFRogue – current state and how to work on it

Single entry point for any developer or AI picking up the project. Read this first, then
`docs/vision.md` (goals), `AGENTS.md` (rules) and the specialised docs linked below.
Last consolidated: 2026-11-07.

## Product state

- Playable PC roguelike prototype: title → slot-machine team draw (3 heroes, rerolls) →
  expedition (2 areas, 4 encounters, Ochu and Guard Scorpion bosses) → rewards / awakening →
  result. Saves locally. Roster: Cloud, Aerith, Barret, Cloud of Darkness, Cloud AC, Delita,
  Jack (+ awakened forms up to 7★ / NV).
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
  and `limit-fill` (`amount` 1–100 on the Limit gauge). Validated in `reviewedSkillEvents`,
  scaled by skill level in `skillForRun`, described in the HUD by `skillDescription`. The last two
  are data model + battle handling only (2026-11-08); no published skill uses them yet.

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
| Characters / bodies | `node tools/import_character.mjs --recipe tools/characters/<key>.json` | character-import-workflow.md |
| Skills / Limit Bursts | plan → stage → prepare → publish (see below) | skill-reconstruction-workflow.md (top entry) |
| Skill icons | `node tools/export_skill_icons.mjs` after any skill publication | character-import-workflow.md §5 |
| Battle UI parts | `<python> tools/export_battle_ui.py` | battle-layout.md |
| Long body sheets | `<python> tools/wrap_wide_sheets.py` (grid > 16384 px) | skill-reconstruction-workflow.md |
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
<python> tools/prepare_original_preview.py --source tools/data/<run>/intake/cloud-207000105/skill-source.json --unit cloud --motion atk --recipe tools/characters/cloud.json --profile source-preview-v1 --authoring-directory assets/battle_effect --native-shaders-apk tools/data/memorial-audit/installed-base-v208.apk --native-shader-package tools/data/particle-native-audit/bmshaderpack.bin --renderer-reference tools/data/memorial-audit/diagnostic-v7/renderer-reference.json --approximate-unverified --output tools/data/<run>/intake/cloud-207000105/plan.json
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
  count as movement for any backdrop rule.
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
skill import. 43 of 49 presentations play original sounds. Still silent: Big Shot, Northern Sky
Apprentice, Thundaga Blade, Sonic Impact (cue names are bank aliases that vgmstream lists under
another name — resolve via the ACB waveform chain, see research/source-combat-audio.md), Trigger
Smash and Reraise (no cues). Blade Beam and Climhazzard got their master sounds recovered into
their legacy manifests (audio only, visual data unchanged).

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
In progress: (a) search ALL raw data sources for classic FFVII "Let the Battles Begin!"
(`la842_bgm_ff7_tatakaumono.acb`, master resource 400842) — so far only checked tools/data, the
Android backup and the BlueStacks device; still to check: `assets/` (14 GB), `ffbe_asset_dump-main/`,
`ffbe_data-master/`, `com.square_enix.android_googleplay.FFBEWW/` by name and by .acb/.awb/.hca/.ogg
content. (b) The developer extracted raw data three times (Android version, two GitHub dumps:
`ffbe_asset_dump-main`, `ffbe_data-master`, plus `assets/`): inventory them, find duplicates
(hash-based), and propose/implement one deduplicated raw-data layout with a single source per file;
update docs/asset_structure.md and every tool path accordingly.
Then, in order: new scene transition (replace Codex placeholder; immersive FF-style battle intro) →
complete character importer (one command: body, poses, all skills via import_skill_batch +
admit_skill_audio + icons + LB + forms; test on a new character, e.g. Tifa AC) → stage importer
(stage + SSPB animations + original music + world enemies/bosses with their skills, mainline FF I–XVI
and Tactics only) → run twists. Remaining skill gaps: 4 alias cues without sound (Big Shot, Northern
Sky Apprentice, Thundaga Blade, Sonic Impact), type 7 ribbons without FieldGoal, Banishga/Dispelga
(BR3M mesh), support skills without mechanics (Esunaga, Protect, Blind, Store, Speed Drink).

## Developer playtest feedback (2026-11-08)

Difficulty after the overnight rebalance feels right (a real challenge, healing matters, debuff
badges read well; skill visuals and sounds approved). Polish before the next character import:
1. DONE (interim): heroes hit by enemies get an impact burst, knockback, strike cue and, for heavy
   hits, a camera shake (`playHeroHitFeedback`). Real monster attack effects come with the enemy importer.
2. DONE: original FFBE skill banners (blue party / red enemy, `skill_banner_*` from the battle UI atlas)
   with the ability name large. Root cause of the tiny text everywhere: the unquoted "Source Sans 3"
   family made every Phaser font shorthand invalid (10 px fallback) — RPG_FONT is now quoted.
3. DONE: enemies use the same body sampling rule as heroes (run_rules bodyTextureFilter, linear).
4. OPEN: Mako Reactor should play classic FFVII "Let the Battles Begin!" (master resource 400842,
   la842_bgm_ff7_tatakaumono.acb) — not shipped in any local archive nor on the Memorial device; needs
   a source from the developer.
5. More variety: enemies, stages, music.
6. PARTLY: music crossfade lengthened (1.2 s in / 0.9 s out). Scene transitions are still the Codex
   placeholder and will be redesigned.

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
