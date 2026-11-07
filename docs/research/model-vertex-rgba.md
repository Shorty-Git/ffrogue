# Shared model vertex RGBA experiment

Evidence date: 2026-10-24. Research only; no game assets or runtime skills published.
This is the first bounded implementation from the [coverage inventory](renderer-coverage-priorities.md).

## Implemented boundary

`prepare_original_preview.py --model-vertex-rgba` explicitly enables a shared
model shader path in `original_effect_player.mjs`. All model instances use the
same rule: normalized original RGBA bytes, interpolated by the GPU, multiply
material RGBA. Existing texture-layer shader hooks remain installed. A uniform
bypasses the multiplication for same-frame A/B inspection. Plans without the
flag retain the previous path. Invalid vertex counts or non-byte colors reject
rather than defaulting to white. Source vertices are not mutated.

This addresses six model nodes in Brave Slash's pink impact and two in
Climhazzard's Power Geyser. Blade Beam's models are opaque white, so the operation
is an identity there. No skill-specific scale, color, timing or anchor was added.
The experiment does **not** verify the native color multiplication/order,
compatibility selectors, nonzero parent-alpha equation, or color space. A GPU
check establishes what this shader computes, not what FFBE computes.

## Source identity

The existing staged BMB/M3R payloads and matching authoring supplements were reused.
The source audit retains BMB, authoring and mesh SHA-256 identities. Its historical
finding descriptions are explicitly not current capability status; use the paired
coverage report for current statuses (`rendered-experimental` for the eight nodes).
The nonwhite M3R source identities are:

| Model | SHA-256 |
| --- | --- |
| model_aura_024 | `47e519dd3a26fcf80ea00007c7f49011dee3a12ee99cdc25ccb73de138e91a1c` |
| model_fire_001 | `0b62676c8aa73e8f657ecbae26d277733a9454d73e5b595d97fc9df645e005c8` |
| model_aura_025 | `df305bbc501550b02ea25f4489d641d51b0e3fabb4efd6f9abca8f06be2e5c4f` |
| model_fire_002 | `23a58dc0c5f5d86c506186ca0e4668a37dc468b0f9cefb63af1b752f7c1cb89a` |
| model_aura_041 | `ab5d7ed1d7d7ff7000558508c43c5158550af60882d394032eb141bcfe6ed62b` |

## Reproduction

Use the Python runtime recorded in the handbook as `FFROGUE_PYTHON`. These commands
require the existing original-source staging; no raw data is committed. All three
candidate plans remain `approved: false`. Baseline plan files are not overwritten.

```powershell
& $env:FFROGUE_PYTHON tools/prepare_original_preview.py --source tools/data/shared-skill-review/brave-slash-composed/skill-source.json --unit cloud --recipe tools/characters/cloud.json --authoring assets/battle_effect/atk_slash1_white.bmsln --authoring assets/battle_effect/atk_impact_001_pink.bmsln --scene-composite --withhold-untextured --inheritance --source-appearance --basic-uv --rectangle-placement --renderer-reference tools/data/memorial-audit/diagnostic-v7/renderer-reference.json --model-vertex-rgba --output tools/data/shared-skill-review/brave-slash-composed/plan-model-vertex-rgba.json
& $env:FFROGUE_PYTHON tools/prepare_original_preview.py --source tools/data/shared-skill-review/blade-beam/skill-source.json --unit cloud --recipe tools/characters/cloud.json --authoring assets/battle_effect/atk_aerialslash_001_green.bmsln --authoring assets/battle_effect/atk_slash5_blue.bmsln --scene-composite --withhold-untextured --inheritance --source-appearance --basic-uv --rectangle-placement --renderer-reference tools/data/memorial-audit/diagnostic-v7/renderer-reference.json --model-vertex-rgba --output tools/data/shared-skill-review/blade-beam/plan-model-vertex-rgba.json
& $env:FFROGUE_PYTHON tools/prepare_original_preview.py --source tools/data/shared-skill-review/climhazzard/skill-source.json --unit cloud --recipe tools/characters/cloud.json --authoring assets/battle_effect/atk_slash7_side_purple.bmsln --authoring assets/battle_effect/atk_blow1_purple.bmsln --authoring assets/battle_effect/eff_strobe_white_a50_f30.bmsln --scene-composite --withhold-untextured --inheritance --source-appearance --basic-uv --rectangle-placement --renderer-reference tools/data/memorial-audit/diagnostic-v7/renderer-reference.json --model-vertex-rgba --distortion --quad-colors --output tools/data/shared-skill-review/climhazzard/plan-model-vertex-rgba.json
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/brave-slash-composed/plan-model-vertex-rgba.json --plan tools/data/shared-skill-review/blade-beam/plan-model-vertex-rgba.json --plan tools/data/shared-skill-review/climhazzard/plan-model-vertex-rgba.json --port 3128
```

Open `/?skill=214800`, `/?skill=214810` or `/?skill=214820`. In rendering diagnostics,
toggle **Multiply source model vertex RGBA**. Compare the same paused frame, arena
and target, with other controls unchanged. Current review uses Reactor / Middle
target / seed 1, frame 42 for Brave Slash, 20 for Blade Beam and 50 for Climhazzard.

```powershell
& $env:FFROGUE_PYTHON tools/audit_original_skill_features.py --plan tools/data/shared-skill-review/brave-slash-composed/plan-model-vertex-rgba.json --plan tools/data/shared-skill-review/blade-beam/plan-model-vertex-rgba.json --plan tools/data/shared-skill-review/climhazzard/plan-model-vertex-rgba.json --output tools/data/model-vertex-rgba/source-features.json
node tools/audit_renderer_coverage.mjs tools/data/model-vertex-rgba/source-features.json tools/data/model-vertex-rgba/coverage.json
node --test tools/test_model_vertex_rgba.mjs tools/test_renderer_coverage.mjs tools/test_original_effect_player.mjs tools/test_original_inheritance.mjs tools/test_original_appearance.mjs
& $env:FFROGUE_PYTHON -m unittest discover -s tools -p 'test_original_*.py'
& $env:FFROGUE_PYTHON tools/test_m3r.py
```

## Checks actually executed

- All three candidate preparation commands, current source audit and coverage generation completed.
- 32 Node tests, 15 original-source Python tests and five M3R tests passed, no skips.
- Each candidate loaded in the in-app browser and passed eight GPU blending checks
  plus eight model checks: normalized RGBA product, bypass, RGB/alpha interpolation
  at two positions and opaque-white identity. Browser receipts are written into
  each stage's `browser-result.json` and retain `approved: false`.
- Same-frame on/off screenshots were saved under ignored `tools/data/model-vertex-rgba/`.
  Equal 579 by 463 pixel arena crops differ at 158,897 pixels for Brave Slash and
  70,281 for Climhazzard. Blade Beam's crop is byte-identical (zero differing pixels).
  This is a rendered-viewport comparison, not an original-game error metric or a
  full-animation identity claim. Crop coordinates/hashes are in `screenshot-comparison.json`.
- Brave Slash's hard radial model faces become faded ribbons. Climhazzard's plume
  changes in the shared path. Both observations establish relevance, not fidelity.
- Git whitespace checks passed. No game build, new native capture, native-export
  experiment, game publication or emulator modification was performed in this step.

## Next decision

The experiment provides a shared improvement without per-skill correction. Keep
it opt-in until native material semantics are verified. Next, isolate the nonzero
parent-alpha/compatibility equation with a controlled native test, then reassess
the backend as described in the coverage inventory. Original-renderer reuse may
save substantial work, but repeatable isolated playback and an export preserving
alpha, additive layers and background-dependent distortion are still unproven.
Do not extend this into indefinite hand-tuning or label the general import complete.
