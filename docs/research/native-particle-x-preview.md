# Deterministic native Particle X preview

Remaining artifact: [white-plane boundary follow-up](brave-slash-white-flash.md).
The user confirmed that Brave Slash and Climhazzard still show white boundaries;
Blade Beam does not. The geometry integration below did not fix that issue.
Shared camera/viewport/placement/clipping is now the priority diagnostic.

2026-10-25. First shared playback integration of the
[offline X-scale reference](native-particle-x-scale.md). No new emulator capture,
game asset publication or Phaser game code change.

## Result and active boundary

`prepare_original_preview.py --native-particle-x` attaches pinned source
selections and enables a separately switchable deterministic display experiment.
It requires native material selection, Particle geometry and native Null locator
metadata. Existing plans remain on their previous paths.

The shared predicate accepts source-selected OneX and nonrandom, positive ConstX
only. VelocityX and randomized ConstX are explicitly rejected. The current
Climhazzard plan has **one of seven Particle nodes eligible**: the white strobe
Particle node3. All other components retain their previous comparison or withheld
state. No complete-skill fidelity claim follows from this one admitted node.

The node is selected by fields/capabilities, not a skill ID or filename branch.
The same path is available to future imports meeting the contract. No matching
current ConstX case passes all gates; its display helper is nevertheless compared
against original ConstX instruction outputs in the differential test.

## Eligibility and dataflow

- Exact pinned native identity, matching make-consumer hash, expected ConstX
  initializer address or absent OneX initializer.
- The source parent-coordinate make callback must be absent: raw index0,
  inspected zero table entry at `0x2d92dc0`. Other indices remain unresolved in
  this bounded lookup. No implicit no-op is assigned to unknown values.
- Absent or constant local rotation consumer, deterministic local angles;
  no active rotation/scale curves. Absent rotation requires zero authored angles.
- Verified Point emission, texture1 only, no model and matched single-texture
  native material selection. Other emission/material variants remain outside.
- Matched Null ancestry, full live transform inheritance, positive constant
  ancestor scales. Standard ancestors must be unrotated; Billboard ancestors
  must pass the existing pinned ZScreen predicate. Missing source controls fail.
- Positive uniform unrotated member wrapper; native Null, Null locator,
  inheritance and Particle geometry switches must all be active at runtime.

Simulation matrices, centers, trajectories, children and alpha are unchanged.
For the admitted display plane, the evaluator supplies the current parent
matrix; its positive first-column length gives Joint X within the bounded
ancestry. Member/global uniform scale is applied once. OneX uses scalar1;
ConstX uses its verified deterministic positive initial scalar. The displayed
unit plane is recomposed about its existing world center with equal half extents
`scalar * JointX * wrapperScale` and the local Z roll. Local X/Y tilt is ignored
by this writer. The inverse simulation-world matrix places the display beneath
the existing hierarchy without rewriting that hierarchy.

For the current strobe, the parent-scale X is `1.5 * 275 = 412.5`. Display width
and height are both 825 before the existing uniform wrapper/global multiplier.
The prior transformed unit plane had different X/Y extents. This explains the
specific geometric A/B difference, not all remaining visual discrepancies.

Random sampling and native time integration are not replaced. Native source
positions, global camera equivalence, broader Joint producers and actual runtime
age remain unverified. Do not enable VelocityX by passing fixture deltas to the
game or silently treating the preview's frame-age integration as native time.

## UI and actual review

The new diagnostic checkbox is `Use deterministic native Particle X geometry`.
Its label lists the required switches. Turning it off restores the preceding
geometry; disabling a dependency also restores the existing comparison path.
The browser receipt records static eligibility separately from source support.
The coverage tool now recognizes the enabled bounded X subset.

Current plan: `tools/data/shared-skill-review/climhazzard/plan-native-x.json`.
Server port3137, skill214820. At preview F30 (skill F12), the admitted strobe
covers a square view-facing region rather than the preceding narrow rectangle.
This was inspected with the switch off/on and screenshots saved as
`tools/data/native-x-preview/climhazzard-f30-{off,on}.png`.

The browser reported all 49 GPU fixture checks passing (8 scene blend, 8 model
RGBA, 6 Add, 6 Distortion, 6 Basic, 15 native blend). Warning/error log query
returned no entries. These remain fixture/preview checks, not a same-frame
original FFBE comparison. The browser receipt stays `approved: false`.

## Reproduction

Use the three preparation recipes from the Null/native-material/native-blend
milestones, retaining their authoring sources and flags. Add both
`--native-null-locator` and `--native-particle-x`; write a new plan rather than
overwriting its baseline. The exact Climhazzard command arguments are:

```powershell
$previewArgs = @('--unit','cloud','--recipe','tools/characters/cloud.json','--scene-composite','--withhold-untextured','--inheritance','--source-appearance','--basic-uv','--rectangle-placement','--renderer-reference','tools/data/memorial-audit/diagnostic-v7/renderer-reference.json','--model-vertex-rgba','--particle-geometry','--null-locator','--shader-add-reference','tools/data/particle-native-audit/reproducible/bmshaderpack.bin/176976.fragment.glsl','--native-shaders-apk','tools/data/memorial-audit/installed-base-v208.apk','--native-shader-package','tools/data/particle-native-audit/bmshaderpack.bin','--native-shader-package','tools/data/particle-native-audit/bmshaderpack_gl2.bin','--native-basic-material','--native-blend','--native-null-locator','--native-particle-x')
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' tools/prepare_original_preview.py @previewArgs --source tools/data/shared-skill-review/climhazzard/skill-source.json --authoring assets/battle_effect/atk_slash7_side_purple.bmsln --authoring assets/battle_effect/atk_blow1_purple.bmsln --authoring assets/battle_effect/eff_strobe_white_a50_f30.bmsln --distortion --quad-colors --output tools/data/shared-skill-review/climhazzard/plan-native-x.json
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/climhazzard/plan-native-x.json --port 3137
```

Executed checks:

```powershell
node --test tools/test_*.mjs
python -m unittest discover -s tools -p 'test_*.py' -q
```

The Node runner reported 78 passing tests and no skips, alongside existing
script-style checks. The Python pipeline suite reported 77 passing tests and no
skips. Targeted X/coverage tests were rerun after updating the coverage predicate:
9 passed. New tests compare the common display helper against original ARM64
OneX/ConstX outputs, check unchanged simulation centers/matrices and reject
unsupported dynamic/random/source/ancestor variants. `git diff --check` passed.
No game build was run for this tools-only milestone.

Changed pipeline files: native dispatch reader (bounded parent-coordinate slot),
preview preparation, shared effect player, preview diagnostic UI, coverage audit
and `tools/test_native_particle_x.mjs`. Native sources/receipts/plans/screenshots
remain ignored. Next gate is native delta-time scheduling for VelocityX or
source-backed random-state ownership, not manually enlarging other particles.
