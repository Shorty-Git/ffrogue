# Cloud night brief (2026-11-10)

Autonomous overnight session. Read `AGENTS.md`, `docs/current-state.md` (newest sections first) and
`docs/vision.md` before starting. Work on branch `claude/night-2026-11-10` (from `main`).

## Hard rules

- **Push exactly once, at the very end** (the developer's GitHub account was banned before for pushing
  too often). Commit locally at milestones; never force-push; never push `main`.
- No raw FFBE data exists in the cloud (`rawdata/`, `tools/data/`, `tools/bin` are ignored). Do not run
  character/skill/enemy importers or asset pipelines. Everything needed is published in the repo:
  skills carry `originalCommand.raw` (incl. `element`), `src/run/elements.mjs` holds monster/hero
  resistances and enemy skill elements, `src/run/enemySkills.mjs` holds enemy skills with
  `damageType` and `heroEffects`.
- Do not edit `src/effects/originalEffectPlayer.mjs` (frozen baseline, hash-pinned by tests).
- Keep `npm`-free checks green before every commit: `node --test tools/test_*.mjs`,
  `npx tsc --noEmit -p .`, `npx vite build`. Python tests that need raw data may skip.
- In-game strings and code in English; write the final report for the developer in German.

## Tasks (in this order)

### 1. Elements in combat
- Hero skill element: `skill.originalCommand.raw.element` (8 flags, FFBE order fire, ice, lightning,
  water, wind, earth, light, dark; first `@` branch). Enemy skill elements: `ENEMY_SKILL_ELEMENTS`.
- Damage multiplier from resistance percent r (negative = weakness): `1 - r/100`, held to a reviewed
  range (suggestion 0.25-2.0; resist > 100 % means "absorb" in FFBE: treat as strong resist, no healing).
  Several elements on one skill: average of their multipliers.
- Enemy resistances: `ENEMY_ELEMENT_RESIST`; hero resistances: `HERO_ELEMENT_RESIST` (by unit key).
- Readability: tint or tag damage numbers (WEAK / RESIST), element icon or name in the skill tooltip
  and description (`src/run/catalog.ts skillDescription`), and show an enemy's weaknesses somewhere
  unobtrusive (e.g. enemy name plate tooltip). Keep the tiefblau/silver UI style.
- Mirror the rule in `tools/simulate_run_balance.mjs` (it re-implements damage formulas) and add tests.

### 2. Balance: buffs, debuffs, elements, rewards
- Use `node tools/simulate_run_balance.mjs --runs 400` and `--roster starters`. Target stays the
  developer-approved feel: ~99.5 % run wins, ~50 % party HP after the final boss.
- Tune strengths of guard/boost/break/blind/cleanse/elements so each matters without dominating.
  Limit Bursts per run are 5.2 (1.5 on 2026-11-08): check whether the gauge fills too fast.
- Integrate into the post-battle reward choice (`src/run/runState.mjs` reward pool): e.g. offers that
  favour skills effective against the next area's weaknesses, element/debuff resistance relics,
  stronger guards. Keep offers readable and the pool deterministic per seed (existing RNG streams).
- Record every changed value with before/after numbers in `docs/current-state.md`.

### 3. Battle placement across all arenas
- The developer finds unit/enemy placement sometimes off (noticed in Altissia; placement was set by
  hand earlier). Analyse the backgrounds (`public/assets/backgrounds/`, arena list in
  `src/data/battleArenas.ts`, layout in `src/ui/battleLayout.ts`) and find one layout (party right, enemies left, FFBE
  style) that sits on the walkable ground in all arenas, with per-arena overrides only where needed.
- Then re-check approach/strike distances (`targetOffsetX`, `approachX`, enemy approach) so melee
  skills still hit the target, and Limit Bursts stay on screen.
- Prove it with headless screenshots of every arena (Playwright is available via npx) and keep them
  out of git; describe the result in the report.

### 4. Optional, if time is left
- Squall's Flame Barret runs ~18 ms/frame (others 6 ms): find what makes it expensive in the bridge or
  lightning layer, without changing the frozen player.

## Finish
- Update `docs/current-state.md` (new top section) and this brief's status.
- One final push of the branch, then a short German report: what changed, measured numbers, what was
  tested (and what not), open questions.
