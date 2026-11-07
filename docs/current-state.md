# FFRogue – current state and how to work on it

Single entry point for any developer or AI picking up the project. Read this first, then
`docs/vision.md` (goals), `AGENTS.md` (rules) and the specialised docs linked below.
Last consolidated: 2026-11-07.

## Product state

- Playable PC roguelike prototype: title → slot-machine team draw (3 heroes, rerolls) →
  expedition (2 areas, 4 encounters, Ochu and Guard Scorpion bosses) → rewards / awakening →
  result. Saves locally. Roster: Cloud, Aerith, Barret, Cloud of Darkness, Cloud AC, Delita,
  Jack (+ awakened forms up to 7★ / NV).
- 15 Source skills (original FFBE effect data rendered in real time) + 1 Limit Burst
  (Cloud's Omnislash, 2026-11-07).
- Battle UI (DOM `CombatHud` over Phaser): target-first (enemies clickable any time, crystal
  cursor), Attack + up to 3 skills + Limit Burst as one-click commands, original FFBE UI parts
  (window frame, HP/MP/LIMIT gauges, enemy gauge, skill icons), animated HP drain with damage
  trail. All menus use the same FFBE window style (`src/ui/ffbeTheme.css`).
  Details: `docs/battle-layout.md`.
- Limit Burst gauge: `src/run/limitGauge.mjs` (battle-scoped; +25 per action, damage taken
  fills, LB empties it). Only heroes with a published `type: LIMIT` skill have one.

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

## Environment and tools

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

- More Limit Bursts (limit_atk bodies exist for Cloud AC, Barret, Aerith, Jack, CoD).
- LB gauge does not carry between battles; all Cloud forms use the 5★ Omnislash.
- Cinzel name font: developer mildly unsure, kept for now.
- Brave Slash manifest hash alarm decision.
