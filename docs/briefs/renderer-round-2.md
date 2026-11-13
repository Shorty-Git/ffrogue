# Brief: renderer round 2 - native gaps first, then visual triage (2026-11-13)

Goal: close the remaining renderer gaps so that most published skills look convincing (bar from
`docs/vision.md`: convincing and visibly on target; pixel fidelity is not a goal). Builds on round 1
(`docs/briefs/renderer-completion.md`, `docs/current-state.md` section "Renderer completion session").
Small verified steps, commit at milestones. Do not push, do not deploy the website.

Read first: `AGENTS.md`, `docs/current-state.md` (renderer completion session), `docs/asset-pipeline-handbook.md`,
`docs/research/player-issue-inventory.md`, `docs/research/box-detector-report.md`,
`docs/research/renderer-coverage-priorities.md`, `docs/research/SKILL_RECONSTRUCTION_MAP.md`.

## Usage limit: work so that someone else can finish
The session may stop at any time (usage limit). Another agent (Claude Opus) continues from your notes.
- Order: the hardest source-format research first (phase A), the diligent but simpler work last (phase C).
- Keep `docs/research/renderer-round-2-log.md` current after every step: done, findings with evidence
  (file, node, value, scene), dead ends, and the exact next step. Write findings down before implementing them.
- Commit every finished step; never leave a half-done player change uncommitted at the end of a step.
- Every player change goes through `tools/rebaseline_scenes.mjs` (before/after, keep only at least as good).

## Phase A - native gaps (hardest first)
Use `tools/inventory_player_issues.mjs` to rank; prefer causes with many affected scenes and a visible effect.
1. Particle geometry and native X: rotation / ancestor Z roll, non-uniform and animated ancestor scale,
   dynamic X timing (currently 70-86 % of scenes on approximations). Goal: particles keep their size,
   spread and orientation instead of looking flat or uniform.
2. Parent alpha influence and unsupported parent transform combinations (64 % / 25 %).
3. Particle facing / selected model Billboard.
4. Emitters with an extent (model-surface emission, currently withheld - e.g. Blade Beam).
5. Source sort priority (draw order) and node type 7 (lightning) if it is still only approximated.
6. RGB random range and random texture tint (currently base colour only) where it changes the look.
For each: write down what the source data means and how it was verified; never turn an unknown enum or
dormant curve into an implicit fallback (AGENTS.md rule 10).

## Phase B - known visible bugs
7. The 6 scenes without a visible effect in the box-detector samples (`baron_marine_hack`, `garuda_skyfall`,
   `guard_scorpion_scorpion_tail`, `magitek_axeman_spin_kick`, `tifa_avalanche_chi_trap`,
   `vampire_thorn_vine_whip`): cause, then fix.
8. `edea_blizzaga` box (subdivided cloud models), `aerith_holy` cloud edge, `chaos_tsunami` /
   `leviathan_tidal_wave` striped water rectangle, `cloud_ac_finishing_touch` tornado edge,
   `onion_knight_awakened` speed-line boards. Fix by cause, not per scene.

## Phase C - triage and unlock
9. Look at every box-detector candidate (161 with rectangle corners): real bug or false positive (beams,
   cards, panels). Record the verdict table in the log; group real bugs by cause, fix the biggest groups.
10. Edea Blizzaga back into `tools/stages/deling_city.json` if it looks right; re-check other blocked enemy
    moves and roster skills; publish what now looks right (no reward offers for unreviewed skills).

## Acceptance
- All tests green: `node --test --experimental-strip-types tools/test_*.mjs`,
  `PYTHONPATH=tools python tools/test_scene_flashes.py`.
- Re-baseline of all scenes after the last player change; box-detector and issue inventory regenerated, counts
  before/after in the log and in `docs/current-state.md`.
- Every changed scene checked by screenshot; docs, handbook and reconstruction map updated.

## Environment
Same as round 1: dev server via launch config `ffrogue-review` (port 3001), `rawdata` only on this PC,
Playwright from the codex runtime, `window.__ffrogueGame` in dev mode. `tools/data/scene-baseline` is local
and ignored.
