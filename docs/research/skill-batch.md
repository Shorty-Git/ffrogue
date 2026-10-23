# Reviewed skill batch

The batch runner inspects the three MVP character recipes together, resolves
their selected skills through the canonical source inspector, and deduplicates
reviewed effect recipes. It reuses `export_effect.mjs` without a second renderer.
Effects render sequentially through one local browser page. This avoids multiple
large WebGL exports competing for memory while still using one batch command.

```powershell
# Inspect the six remaining legacy commands without changing runtime assets.
npm run skills:batch

# Include the three already reviewed commands in the availability report.
npm run skills:batch -- --all

# Export every ready effect, skipping current sheets verified by hashes.
npm run skills:batch -- --all --bake

# Rebuild two reviewed skills in one queue, even if their sheets are current.
npm run skills:batch -- --skills cloud/brave_slash,cloud/blade_beam --bake --force
```

When rendering is necessary, open the printed loopback URL (default port 3110)
and keep that page open until all effects show `EXPORTED`. A cache-only batch
needs no browser. Input recipe, source, resource and output-sheet hashes determine
whether a sheet is current. Renderer errors or a 120-second per-effect timeout
stop the remaining queue; they do not count as completed exports. Ctrl+C stops
the local server and its active exporter.

The latest machine-readable report is `tools/data/skill-batch/report.json`
(ignored local output). A report records each selected skill's readiness,
blockers, exact missing files, effect ownership and export status. Legacy
preservation in the character importer does **not** establish batch readiness.
Unknown skill IDs fail instead of silently disappearing from the selection.

Baking does not publish new character commands or implement mechanics. After a
new skill's missing files and semantics are resolved, review its complete
composition, create approved recipes, and follow the publication and game-review
steps in [the import standard](../character-import-workflow.md). Shared character
registry publication must remain sequential.

## Remaining source blockers

All six remaining commands are currently blocked, with nine unique missing
converted effect files under `assets/battle_effect/`:

| Character / skill | Missing `.efkefc` stems |
| --- | --- |
| Cloud / Climhazzard | `atk_powergeyser_001_purple` |
| Barret / Big Shot | `sp_20108_hardshot` |
| Barret / Grenade Bomb | `eff_convergence_explosion_orange` |
| Aerith / Healing Wind | `eff_fullcure_white` |
| Aerith / Curaja | `wm_1029_cure5_front` |
| Aerith / Banishga | `wm_1017_banish2_back`, `wm_1017_banish2_front`, `wm_1006_banish_back`, `wm_1006_banish_front` |

Finding these files alone will not finish the imports. Climhazzard needs DEF-ignore
and unresolved group review; Grenade Bomb needs debuff semantics; healing needs
party composition and explicit formula choices; Banishga needs its weighted
timeline/version decision; Barret's two legacy abilities need motion review.
The earlier [source audit](mvp-skill-audit.md) contains the detailed findings.
Partial available members are never silently used as complete skills.

## Verification

The real browser batch forcibly exported Brave Slash and Blade Beam together:
three distinct sheets, one exporter at a time. The dashboard reached `EXPORTED`
for all three; input/output provenance hashes were validated after every export.
The all-skill preflight found three ready commands, six blocked commands, six
unique reviewed effects and nine missing source effect files. Automated pipeline
checks include cache invalidation when recipe, source, dependency or output
changes, and rejection of missing dependencies.

No remaining legacy command was newly published or visually approved by this
batch milestone. Existing reviewed visual placement remains governed by its
individual recipe and prior game review.
