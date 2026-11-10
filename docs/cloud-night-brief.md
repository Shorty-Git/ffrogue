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

## Developer decisions for this night (2026-11-10)

- **Run structure:** normal enemies -> elite enemies -> a final boss. Rename the current stage bosses
  (Guard Scorpion, Ochu, X-ATM092, Leviathan, Kain, Air Buster, ...) to **elite** enemies. Every run
  ends in the **final boss room**: the Nibelheim stage (Shinra Mansion: its normal fights, then
  Sephiroth) is always the last area. The earlier areas stay seeded from the other stages. Terms in the
  UI: normal, elite, boss. Sephiroth must be the hardest fight of the run.
- **Skill swap:** when a hero with three skills takes a new skill, the player chooses which one to drop
  (or declines). `chooseReward` already accepts a `replace` id (the simulator uses it); the reward UI
  does not offer it yet.
- **Reward structure:** decide (with the simulator and readability in mind) whether a won fight offers
  one of each kind (skill / upgrade / weapon), more or fewer cards. Treat it as part of balancing.
- **UI pass:** with skills, upgrades, awakenings, weapons, elements and statuses the reward screen and
  the battle HUD are getting crowded. Improve layout and readability (tiefblau/silver style, PC
  portrait). Screenshots before/after, outside git.

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

### 3. Weapons (new reward type)
- Data: `public/assets/items/weapons.json` (984 original FFBE weapons: name, category, rarity 1-8,
  stats, elements, ailment chances, resistances, short description; exported by tools/export_weapons.mjs).
  No icons yet (their file names do not match iconId); use a small glyph per category.
- Developer idea: weapons as rewards after a won fight (and/or found/unlocked between runs, chosen
  before a run). They need not work like FFBE: design what fits FFRogue. Suggested core: one weapon
  slot per hero; a weapon adds a bounded stat bonus and, if it has elements, gives that hero's basic
  attacks (and maybe physical skills) its element; rarity sets the tier. Pick a curated pool that fits
  the run length (not all 984), weighted by rarity and the current area.
- Show the equipped weapon on the hero card/HUD, include it in saves (run version bump + migration),
  the simulator and tests. Keep the reward screen readable.

### 4. Run structure, skill swap, rewards, UI
- Implement the decisions above (run structure with final boss room, elite naming, skill swap in the
  reward UI, reward card mix) and the UI pass. Run saves need a version bump and migration if the
  structure changes; keep old saves loadable or clearly reset them.

### 5. Balance the whole system
- After elements and weapons exist, rerun the balance targets from task 2 with everything active,
  including the new stage Nibelheim (FFVII, boss Sephiroth with Octaslash / Quad Strike / Heartless
  Angel; 20 enemies now, incl. new stage Mako Reactor 05 with elite Air Buster). Sephiroth should feel
  like the strongest boss.

### 6. Battle placement across all arenas
- The developer finds unit/enemy placement sometimes off (noticed in Altissia; placement was set by
  hand earlier). Analyse the backgrounds (`public/assets/backgrounds/`, arena list in
  `src/data/battleArenas.ts`, layout in `src/ui/battleLayout.ts`) and find one layout (party right, enemies left, FFBE
  style) that sits on the walkable ground in all arenas, with per-arena overrides only where needed.
- Then re-check approach/strike distances (`targetOffsetX`, `approachX`, enemy approach) so melee
  skills still hit the target, and Limit Bursts stay on screen.
- Prove it with headless screenshots of every arena (Playwright is available via npx) and keep them
  out of git; describe the result in the report.

### 7. Optional, if time is left
- Squall's Flame Barret runs ~18 ms/frame (others 6 ms): find what makes it expensive in the bridge or
  lightning layer, without changing the frozen player.

## Finish
- Update `docs/current-state.md` (new top section) and this brief's status.
- One final push of the branch, then a short German report: what changed, measured numbers, what was
  tested (and what not), open questions.
