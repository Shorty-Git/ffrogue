# Shared Add material from a pinned native shader family

Follow-up: [initial native selection](native-material-selection.md) now verifies
the initial Quad/Particle fragment choice for all 16 source Add nodes in this
corpus and gates the new plans by that identity. Live overrides/global uniforms
remain open. The unverified-binding statements below describe this earlier
family-only experiment.

Date: 2026-10-24. Offline candidate only; `approved: false`. This autonomous
block includes actual renderer work, not only consistency checks. No new game
recording, emulator change, published effect or src/public change.

## Concrete renderer difference

The old two-texture path multiplies vertex/node RGBA by the clamped sum of both
texture layers. The recovered native Add fragment instead computes, with layer
tints included and default global colorScale 1:

```text
base = vertex/node RGBA * texture1 * layer1Tint
secondary = texture2 * layer2Tint
RGB = clamp(base.RGB + secondary.RGB * secondary.A, 0, 1)
A = base.A
```

The secondary contribution is not multiplied by vertex RGBA a second time.
The old RGBA summation changes alpha and produces demonstrably different GPU
values. Source: bmshaderpack.bin fragment at package byte offset 176976,
SHA-256 `b54945426716fdc4ae4678cc85de7acd658d5259f23d5b2b187eb782a748a687`.
This offset identifies recovered source, not a shader-permutation ID. Native
library/package hashes and extraction are recorded in
[the material evidence](native-particle-material-evidence.md).

## Implemented candidate

`prepare_original_preview.py --shader-add-reference PATH` checks that exact
fragment hash, requires source appearance, and embeds the reference in an
unapproved research plan. Unknown references fail; no substitute is selected.
The common layered material gains a separate uniform-controlled A/B path.
It applies only to source Add materials with both textures and matched layer
metadata. Legacy RGBA summation remains the default without the opt-in reference.
Basic materials and the Distortion program do not enter this Add path.

The addition runs after model/quad vertex-color multiplication. The shader cache
key is updated, and runtime toggling does not change source timing, geometry or
resource discovery. There is no character/skill-name dispatch.

Current source-node coverage: Brave Slash 4, Blade Beam 5, Climhazzard 7. One
Blade Beam node is independently withheld for model-surface emission, leaving
15 draw-candidate nodes affected across the three skills. It stays withheld.

**Still unverified:** per-node native shader binding, population of global
colorScale, native framebuffer blend state, other material families and overall
skill fidelity. Porting a recovered family correctly does not establish that
every source Add node uses precisely that permutation. Coverage keeps this
status explicit rather than marking native support complete.

## Actual GPU validation

`verifyShaderAdd` renders the real common material hook and compares RGBA8
render-target pixels against the **unedited pinned native fragment shader**.
A small fixture vertex shader supplies known varyings; this does not reuse the
native vertex/simulation pipeline. Tolerance is two byte values per channel.

All six checks passed in each of the three real browser candidates: partial
secondary alpha, transparent secondary, zero vertex RGBA, opaque secondary,
second-layer bypass, and a negative control proving the legacy path differs.
The zero-vertex case checks the ordering of secondary RGB versus model RGBA.
These are shader-output tests, not source-age or original-scene comparisons.

Browser inspections: Brave Slash F29 on/off, Blade Beam F20 and Climhazzard F50.
Each candidate also passed the existing 8 blend and 8 model-RGBA GPU checks.
Screenshots and JSON receipts remain under tools/data; all retain approved false.

## Reproduce

Use the three preparation commands in [the Null locator review](null-locator-subset.md).
Retain their source/authoring/geometry flags, add this argument and use separate
`plan-shader-add.json` outputs:

```powershell
--shader-add-reference tools/data/particle-native-audit/reproducible/bmshaderpack.bin/176976.fragment.glsl
```

The argument above is a fragment of the preparation command, not a standalone
shell command. Regenerate the pinned shader extraction first if it is absent on
another PC. Actual server/check commands:

```powershell
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/brave-slash-composed/plan-shader-add.json --plan tools/data/shared-skill-review/blade-beam/plan-shader-add.json --plan tools/data/shared-skill-review/climhazzard/plan-shader-add.json --port 3132
node --test tools/test_shader_add.mjs
node tools/audit_material_alpha.mjs --plan tools/data/shared-skill-review/brave-slash-composed/plan-null-locator.json --plan tools/data/shared-skill-review/blade-beam/plan-null-locator.json --plan tools/data/shared-skill-review/climhazzard/plan-null-locator.json --output tools/data/autonomous-audit/material-alpha.json
```

Fresh source/coverage receipts for the new plans are in tools/data/shader-add.
The native shader reference's presence is not a production publication command.

## Autonomous check results and remaining direction

The final full suites passed: **76 Node tests and 72 Python tests**, zero skipped.
The TypeScript/Vite game build also passed earlier in the same block; its single
bundle exceeds the 500 kB warning threshold. No warning was suppressed and no
bundle architecture was changed.

The reusable read-only `audit_material_alpha.mjs` verified 30 bound texture
files and 20,117 active instance-frame samples in the preceding candidates.
No nonfinite alpha/color/matrix values or alpha outside 0..1 were found. A
tampered bound-texture hash was rejected without a passing receipt. These checks
do not establish native equations or visible completeness. All 360 extracted
shader files matched recorded lengths/hashes; only the pinned fragment above
was newly GPU-compiled/tested, not all shader permutations.

The coverage audit's sampler now honors the Null locator flag/wrapper gate,
and its material findings record this new candidate without clearing native
binding uncertainty. Model billboards, model-surface emission, missing Power
Geyser controls, distortion/ordering and other inheritance variants remain
separate gaps. Future work should close one concrete renderer capability at a
time; routine green tests alone are not completion of the import path.
