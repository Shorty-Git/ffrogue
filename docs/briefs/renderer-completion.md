# Brief: renderer completion and scene re-baseline (2026-11-11)

> **Completed brief (2026-11-11/12); results in the current-state changelog. Current state: [docs/current-state.md](../current-state.md) "Start here".**

Goal: make the FFRogue effect renderer as complete as possible, fix known display bugs generically, find
further bugs on its own, then re-publish and re-accept every published scene. Small verified steps, commit at
milestones. Do not push, do not deploy the website.

Read first: `AGENTS.md`, `docs/current-state.md` (sections "Playtest round 5", "Six final bosses", "Two new
route stages"), `docs/asset-pipeline-handbook.md`, `docs/research/renderer-coverage-priorities.md`,
`docs/research/SKILL_RECONSTRUCTION_MAP.md`, `docs/research/ROSTER_SKILL_COVERAGE.md`.

## Phase 0 - tools that make progress measurable
1. Issue inventory: run the player (`src/effects/originalEffectPlayer.mjs`) headless over every
   `public/assets/presentations/*/manifest.json`, collect its `issues`, group by cause, rank by number of
   affected scenes. Table in the docs.
2. Box detector: play every scene headless in the training grounds, capture several frames, detect hard
   rectangular edges / large uniform planes; contact sheets plus a ranked report. Finds unseen bugs.
3. Re-baseline tool: the player hash is pinned in every manifest (`provenance.playerSha256`). Script that
   re-publishes all scenes after a player change, puts before/after frames side by side, and updates baselines
   only where the new rendering is at least as good.

## Phase 1 - known, observed bugs
4. Particle draw type 6 (`textureCombination` id 6 "Unknown", texture 2 = soft mask) renders as a square:
   `chaos_flare`, `chaos_firaga`, `beatrix_stock_break`, `tifa_limit_reels` and more. Texture 2 as alphaMap
   looked right on 2026-11-11; it was reverted only because of the pinned player hash.
5. Screen layers with hard edges: `edea_blizzaga` (sky plane box), `edea_maelstrom` (edge at the start),
   `chaos_firaga` (small white square, node 24 `light_burst1`). Rules: `tools/prepare_scene_flashes.py`.
6. First playback jumps: Cloud Remake's Ascension starts at about frame 400 of 543 on first play, almost
   nothing shows; elapsed time probably accumulates during shader preparation (`src/effects/PreparedSceneBridge.mjs`).
   Must start at frame 0; then judge whether Ascension looks good (no CGI movie may be linked).
7. Tifa's Limit Reels: the reel symbols sit in the middle above the arena instead of their expected place.

## Phase 2 - documented renderer gaps (renderer-coverage-priorities.md, by impact)
8. Model vertex RGBA complete; parent alpha and parent transform combinations.
9. Particle facing / billboard, billboard for selected models.
10. Non-point emission shapes (model-surface emitters), currently withheld.
11. Untextured primitives (e.g. Power Geyser node 15) rendered correctly instead of withheld.
12. Quad corner handling; experimental two-texture materials (Add / Distortion).
13. Source draw order (sort priority), node type 7 (lightning, approximated), type 4/15.

## Phase 3 - unlock
14. Re-check blocked skills from `ROSTER_SKILL_COVERAGE.md` with the improved renderer; publish what now looks right.
15. Put repaired enemy moves back into the boss patterns: Chaos Flare/Firaga, Edea Blizzaga, Beatrix Stock
    Break (`tools/stages/chaos_shrine.json`, `deling_city.json`, `alexandria.json`; regenerate with
    `node tools/import_stage.mjs --recipe ...`).

## Acceptance
- All tests green: `node --test --experimental-strip-types tools/test_*.mjs`,
  `PYTHONPATH=tools python tools/test_scene_flashes.py`.
- Every changed scene checked by screenshot; bar from `docs/vision.md`: convincing and visibly on target,
  pixel fidelity is not a goal.
- Docs, handbook and reconstruction map updated.

## Environment
Dev server via launch config `ffrogue-review` (port 3001). `rawdata` exists only on this PC, so work locally.
Python with Pillow/soundfile: see `docs/current-state.md`. Headless browser: Playwright from the codex runtime
(see existing test scripts' `createRequire` pattern); the game exposes `window.__ffrogueGame` in dev mode.
