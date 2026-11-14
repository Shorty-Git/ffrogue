# Brief: overnight cloud session, loop v2 groundwork (2026-11-15 early morning)

Read first: `AGENTS.md`, `docs/game-design.md` (binding), `docs/current-state.md` "Start here".
Work on branch `claude/loop-v2-night`. Commit in small verified steps. Do not deploy, do not push other
branches. The cloud has no `rawdata/` and no `tools/data/`: no asset imports, only game code, tests, docs.

## Goals, in order
1. **Party of four with roles.** Add a role per hero (damage, healer, tank, support) to the run catalog,
   derived from its published skills (heal/raise -> healer, buff/guard/provoke -> tank or support,
   otherwise damage), with an override table for reviewed exceptions. Party size 4 everywhere: run state,
   validation, battle formation (`src/ui/battleLayout.ts`, four feet points, no overlap with the HUD), HUD
   (2x2 hero grid already fits), rewards/events. Keep saves of older runs readable or reject them clearly.
2. **Run skeleton (game-design.md "Run structure").** Three acts plus the final boss room; per act a small
   branching map (seeded) with node types battle, elite, event, merchant, campfire, treasure and an act boss;
   about 10-12 fights per run. Save after every node. Elites with one affix; bosses with one special rule.
   Enemy scaling per act. Pure rules in `src/run/` with node tests first (pattern: `tools/test_run_events.mjs`).
3. **Map screen** in the "FF Graphite" style (`src/ui/graphiteTheme.css`, layout from the mockup
   https://claude.ai/artifact/Pcs8wi5GWMvkPNxXwJMnDW "B · Act map": map left, side panel right).
4. **Research note** `docs/research/roguelike-loop-references.md`: concrete, sourced patterns from Slay the
   Spire (map generation rules, elite/rest ratios), Hades (boons/duo boons), Balatro (boss blinds, economy
   with interest), Across the Obelisk (4-role party balance), each with what FFRogue takes and why.

## Acceptance
- `npm test`, `npx tsc --noEmit`, `npm run build` green (Python tests need no rawdata except where they
  skip; report skips). Screenshots of the map and a four-hero battle if a browser is available.
- `docs/current-state.md` changelog entry and an updated "Open items"; game-design.md only where a decision
  had to be made (mark it as proposed).
- Final report: what is done, what is not, how to review (branch, commits).
