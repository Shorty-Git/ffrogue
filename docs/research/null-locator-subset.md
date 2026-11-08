# Opt-in Null/Billboard locator subset

Follow-up: [offline native ZScreen reference](native-zscreen-offline-reference.md)
adds the opt-in source-dispatched constant-roll/nonuniform-scale subset. The
restrictions and counts below retain the earlier unit-scale revision.

Status: 2026-10-24. Shared offline research playback, `approved: false`.
No emulator update or new capture was needed. FFBE Trace remains on revision 14;
revision-19 instrumentation remains uninstalled. No `src/` or `public/` change.

## Implemented boundary

The [ancestor measurement](ancestor-locator-result.md) established that pink
impact's Billboard control node executes native ZScreen despite its local X
tilt, and its Standard child produces the untilted translation. This is distinct
from Particle plane facing and model billboards.

`original_null_locator.py` preserves the exact matched authoring Null type,
rotation/scale selectors and BMSLN SHA-256 after `compare_project` succeeds.
These are explicit authoring supplements, not newly decoded binary fields.
`prepare_original_preview.py --null-locator` enables the experiment and requires
`--inheritance`; screen fitting is rejected. Baseline plans remain unchanged.

`nullLocatorEligibility` admits only:

- ControlNull with the matched `Billboard` selector and Newton rotation/scale.
- Constant local XY rotation, zero local Z/ranges/speeds/acceleration and no
  populated rotation/scale curves.
- Constant local scale `[1,1,1]`, and a chain of matched Standard Null ancestors
  with zero rotation and unit constant scale.
- Explicit On transform inheritance and the observed compatibility combination:
  node V16 true, node V15 false, root V16/V15 false.
- An unrotated positive-scale member wrapper in the fixed identity-view preview.

For that subset the common evaluator composes the eligible control node with
identity local orientation. Source position, translation curves, alpha, clocks
and child transforms remain in the common evaluator. Standard control nodes
keep their original TRS composition. Unsupported modes retain explicitly
labeled legacy comparison behavior; source-less controls do not gain support.
The flag also requires source inheritance at execution, so its A/B-off path is
the existing evaluator. No character, skill ID, node ID or fitted offset chooses
the equation. The source gate is intentionally narrower than native ZScreen.

Nonzero Z rotation, moving/nonuniform scales, rotated ancestors/cameras,
other compatibility combinations, other Null types and binary-only source
selection remain unsupported. Do not promote this to a universal billboard rule.

## Actual corpus and native comparison

| Candidate | Eligible non-Standard Null nodes | Outcome |
| --- | --- | --- |
| Composed Brave Slash | 1/1 | Pink ancestor changes; coverage reports `rendered-experimental` |
| Blade Beam | 0/1 | Source rotation/scale outside subset; remains `missing` |
| Climhazzard | 0/2 | Source rotation/scale outside subset; remains `missing`; 17 Power Geyser controls additionally lack locator selectors |

The regression against the recovered ancestor capture reproduces Standard node
33 and white Particle center `[194,864.875,0]` from the recorded root/scale.
The separate revision-14 six-vertex audit with root `[188,636,0]` now has center
residual `[0,-0.00000298023224,0]`, instead of the prior
`[0,-20.78796245,93.76842556]`. With the independent Particle display experiment,
the white rectangle's width/height also reproduce 1278/1136.

These are geometry checks, not synchronized animation or shader/pixel approval.
Native age was not captured. The regular preview still has an adapted broad
arena/camera: the visible white boundary remains. Do not conceal it or claim the
whole skill is now identical to FFBE. Other material, emission, ordering and
source-less capability limitations remain explicit.

## Reproduce

Use a real Python executable in `FFROGUE_PYTHON`. The current candidate keeps
the earlier RGBA/Particle experiments enabled and adds only the locator flag.

```powershell
$locatorPreviewArgs = @('--unit','cloud','--recipe','tools/characters/cloud.json','--scene-composite','--withhold-untextured','--inheritance','--source-appearance','--basic-uv','--rectangle-placement','--renderer-reference','tools/data/memorial-audit/diagnostic-v7/renderer-reference.json','--model-vertex-rgba','--particle-geometry','--null-locator')
& $env:FFROGUE_PYTHON tools/prepare_original_preview.py @locatorPreviewArgs --source tools/data/shared-skill-review/brave-slash-composed/skill-source.json --authoring rawdata/assets/battle_effect/atk_slash1_white.bmsln --authoring rawdata/assets/battle_effect/atk_impact_001_pink.bmsln --output tools/data/shared-skill-review/brave-slash-composed/plan-null-locator.json
& $env:FFROGUE_PYTHON tools/prepare_original_preview.py @locatorPreviewArgs --source tools/data/shared-skill-review/blade-beam/skill-source.json --authoring rawdata/assets/battle_effect/atk_aerialslash_001_green.bmsln --authoring rawdata/assets/battle_effect/atk_slash5_blue.bmsln --output tools/data/shared-skill-review/blade-beam/plan-null-locator.json
& $env:FFROGUE_PYTHON tools/prepare_original_preview.py @locatorPreviewArgs --source tools/data/shared-skill-review/climhazzard/skill-source.json --authoring rawdata/assets/battle_effect/atk_slash7_side_purple.bmsln --authoring rawdata/assets/battle_effect/atk_blow1_purple.bmsln --authoring rawdata/assets/battle_effect/eff_strobe_white_a50_f30.bmsln --distortion --quad-colors --output tools/data/shared-skill-review/climhazzard/plan-null-locator.json
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/brave-slash-composed/plan-null-locator.json --plan tools/data/shared-skill-review/blade-beam/plan-null-locator.json --plan tools/data/shared-skill-review/climhazzard/plan-null-locator.json --port 3130
& $env:FFROGUE_PYTHON tools/audit_original_skill_features.py --plan tools/data/shared-skill-review/brave-slash-composed/plan-null-locator.json --plan tools/data/shared-skill-review/blade-beam/plan-null-locator.json --plan tools/data/shared-skill-review/climhazzard/plan-null-locator.json --output tools/data/null-locator/source-features.json
node tools/audit_renderer_coverage.mjs tools/data/null-locator/source-features.json tools/data/null-locator/coverage.json
node tools/audit_particle_locator.mjs --plan tools/data/shared-skill-review/brave-slash-composed/plan-null-locator.json --trace tools/data/particle-native-audit/locator-trace-summary.json --particles tools/data/particle-native-audit/combined-node34-summary.json --effect atk_impact_001_pink.bmb --node 34 --effect-frame 5 --output tools/data/null-locator/native-audit.json
node --test tools/test_null_locator.mjs
```

Prior reviews retain original BMB/native hashes. The matched pink BMSLN hash is
`074d71c0a4b531db1ac97806eb82292ee588744cfc136efaf21df66a9977398a`.
Prepared metadata preserves each supplement hash. Inputs/resources, generated
plans, current coverage, browser receipts and screenshots remain ignored under
`tools/data`. `inspect_preview_node.mjs` and `audit_particle_locator.mjs` now
honor the plan's locator flag when inspecting candidate evaluator state.

## Checks actually executed

- All three preparations, fresh source/coverage audits and actual native geometry
  audit completed. CLI rejected missing inheritance before reading source inputs.
- 56 relevant Node tests passed, including five new source-gate, Standard-control,
  seek/toggle/alpha, actual-native-chain and full candidate-frame tests; zero tests skipped locally.
  Fifteen Python original-source tests passed. No game build was run.
- All three browser candidates became ready with 8 blend and 8 model-RGBA GPU
  checks passing each. Receipts retain `approved: false`.
- Brave F29 changed visibly on/off. Blade F20 and Climhazzard F50 arena crops
  were byte-identical on/off. Saved screenshot crop boxes: Blade and Brave
  `(335,195,914,630)`; Climhazzard `(335,175,914,610)` in 1265x712 images.
  These are inspected frames, not exhaustive animation equivalence.
- Standard source control nodes retain baseline rotation in tests. Invalid
  modes, parent tilt, roll, scale and compatibility fail the gate. No native
  performance test or broader locator fidelity approval occurred.
- Every integer frame through each candidate's effect horizon was checked for
  finite matrices. Effects with no eligible locator were matrix-identical on/off
  at every checked frame; this is evaluator equivalence, not full native-pixel validation.

Next review should assess this geometry candidate and then choose a separate
remaining shared capability, rather than extending the gate just to affect
more skills. Source unknowns and native-fidelity approval remain distinct from
an experimental feature being implemented.

The subsequent [native-viewport comparison](native-viewport-current.md) now
checks the candidate against its recorded camera/root and measured projected
bounds. It confirms the inspected geometry while retaining material/timing and
other source limitations.
