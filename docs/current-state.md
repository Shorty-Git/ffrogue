# FFRogue – current state and how to work on it

Single entry point for any developer or AI picking up the project. Read this first, then
`docs/vision.md` (goals), `AGENTS.md` (rules) and the specialised docs linked below.
Last consolidated: 2026-11-07.

## Product state

- Playable PC roguelike prototype: title → slot-machine team draw (3 heroes, rerolls) →
  expedition (2 areas, 4 encounters, Ochu and Guard Scorpion bosses) → rewards / awakening →
  result. Saves locally. Roster: Cloud, Aerith, Barret, Cloud of Darkness, Cloud AC, Delita,
  Jack (+ awakened forms up to 7★ / NV).
- 24 Source skills (original FFBE effect data rendered in real time; authoring-free imports
  2026-11-07/08: Cloud's Meteor Rain, Aerith's Banish, Holy and Fury Brand, Delita's
  Northswain's Strike and Northern Sky Apprentice, Barret's Big Shot and Ungarmax, Jack's Cheer)
  + 2 Limit Bursts
  (Cloud's Omnislash; Cloud AC's Omnislash Version 5, the first authoring-free import, 2026-11-07).
- Battle UI (DOM `CombatHud` over Phaser): target-first (enemies clickable any time, crystal
  cursor), Attack + up to 3 skills + Limit Burst as one-click commands, original FFBE UI parts
  (window frame, HP/MP/LIMIT gauges, enemy gauge, skill icons), animated HP drain with damage
  trail. All menus use the same FFBE window style (`src/ui/ffbeTheme.css`).
  Details: `docs/battle-layout.md`.
- Limit Burst gauge: `src/run/limitGauge.mjs` (+25 per action, damage taken fills, LB empties
  it). Only heroes with a published `type: LIMIT` skill have one. Since 2026-11-08 the gauge
  carries to the next battle (`member.limit` in the run save) for heroes who end a battle
  standing; a K.O. empties it.
- Enemy single-target attacks hit a random standing hero (`src/run/enemyTargeting.mjs`,
  combat RNG stream); before 2026-11-08 they always hit party slot 1.

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
   Known pre-existing failure: `test_scene_migration.mjs` Brave Slash manifest hash alarm
   (awaiting developer decision).
3. Source review: Vite 3001 + receipt 3163, then
   `node tools/data/cleanup-20261107/review_all.mjs <out.json>`; compare with
   `tools/data/cleanup-20261107/baseline.json` (FAILs saying "requires", "needs an imported",
   "needs its registered", "default party" are not-applicable). Expect 19 applicable PASS.
4. Visual: headless screenshots / video of the changed flow; technical checks are not visual
   acceptance – the developer accepts visuals.

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
  type 15 = FieldGoal (208 bytes, particle attractor). Also: Warring Slash needs repeated
  generation in the frozen player; commands without effect timelines (Limit Braver etc.).
- Party buffs (Fury Brand, Cheer) reuse the existing physical-boost status (x1.3, 3 rounds,
  allyTargeting living-allies) and need a `friendlyTargetReview` with the source target/range.
  Support skills without a game mechanic (Reraise, Speed Drink, Store, Return) stay unimported.
- Balance values from 2026-11-08 are simulator-based and await play-testing by the developer.
- All Cloud forms use the 5★ Omnislash.
- Several node tests pin manifest SHA-256 values of Windows (CRLF) checkouts
  (test_body_assets, test_stage_content, test_victory_poses); on a Linux/LF checkout they fail
  without any content change (verified for test_body_assets: every mismatch matches after CRLF
  conversion).
- Cinzel name font: developer mildly unsure, kept for now.
- Brave Slash manifest hash alarm decision.
