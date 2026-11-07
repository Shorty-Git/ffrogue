# Particle locator and projection diagnosis

Status: 2026-10-24. Offline audit of existing revision-14 receipts. No new
capture, emulator modification, playback rule, game asset or publication.

## Result

The camera conversion can be reproduced for the captured CPU vertices. The
remaining center discrepancy is **before projection**, in hierarchy/locator
evaluation. A general rule deciding when the native runtime applies parent
rotation has not been established.

The same armed session `particle-decision-20261024-154201` contains all six
native node-34 vertex samples and preceding before-draw camera states. Reusing
that session avoids combining the older camera/root `(186,638,0)` with this
capture's root `(188,636,0)`. The pinned native SHA-256 remains
`6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77`;
the original pink BMB SHA-256 remains
`89c3cb5e7c16df69bf8d1c538622afdd42e30942240141a8147dd55da4de690f`.

The camera audit found 14 before-draw states, 12 at steady scale. View is
identity, projection is orthographic, logical extent approximately 640x1136,
viewport 1080x1920, and scale approximately 1.775. Actual float values remain
in the receipts; calculations do not force the slightly different X/Y pixel
ratios to be isotropic.

| Quantity | Captured native CPU geometry | Current experimental display geometry |
| --- | ---: | ---: |
| Width | 1278 | approximately 1278 |
| Height | 1136 | approximately 1136 |
| Center X | 188 | 188 |
| Center Y | 857.875 | 837.08703755 |
| Center Z | 0 | 93.76842556 |

Native bounds are constant across the six samples. Native age was not captured;
evaluator F5 is a coordinate diagnostic, not a synchronized animation match.

The hierarchy path is `0 -> 1 -> 2 -> 33 -> 34`. Node 1 has X rotation 25 degrees;
node 33 has local Y translation 125. The current matrix composition produces:

```text
Y = 636 + 125 * 1.775 * cos(25 degrees)
Z =       125 * 1.775 * sin(25 degrees)
```

The observed native center instead matches `Y = 636 + 125 * 1.775`, `Z = 0`.
In an audit-only counterfactual, zeroing ancestor sampled rotations reproduces
that center within 0.000003 world units. Source and playback matrices are not
modified. This demonstrates a sufficient explanation for this static offset;
it does **not** prove a universal no-rotation rule or which source compatibility
flag/native stage selects the behavior.

## Why the boundary appears in the adapted arena

Applying the same capture's view/projection to the six CPU vertices yields
approximately these top-left viewport pixel bounds:

```text
X: -761.063 .. 1395.563   (viewport 0 .. 1080)
Y: -489.930 .. 1430.070  (viewport 0 .. 1920)
```

Thus the measured rectangle extends beyond both side edges and the top in the
native coordinate domain. Its lower edge remains inside the full portrait
viewport. The wider adapted research arena can reveal side boundaries that the
native viewport would clip. This is a geometry/projection explanation, not a
verified reconstruction of final native pixels: shader transforms, viewport/
scissor state, alpha, background and timing still matter. Do not stretch/crop
the flash independently or conceal it to make the regular preview look fixed.

## Reusable audit

`tools/audit_particle_locator.mjs` accepts an exact prepared effect/node and
existing capture summaries. It verifies same build, arm token/sequence,
calibration, original source hash, an unambiguous particle/wrapper, a preceding
camera per vertex sample and stable root/camera. It reports baseline and
experimental world bounds, projected bounds, residuals, the ancestor path and
the explicitly unapproved rotation counterfactual. Ambiguous data and geometry
outside the existing display subset are rejected. Source-less and unsupported
variants are not silently enabled. Input, player and audit-tool hashes are saved.

```powershell
& $env:FFROGUE_PYTHON tools/memorial/summarize_trace.py --log tools/data/memorial-audit/diagnostic-v14/particle-capture-log.txt --token particle-decision-20261024-154201 --source tools/data/shared-skill-review/brave-slash-composed/skill-source.json --output tools/data/particle-native-audit/locator-trace-summary.json
& $env:FFROGUE_PYTHON tools/memorial/audit_camera_projection.py --summary tools/data/particle-native-audit/locator-trace-summary.json --output tools/data/particle-native-audit/locator-camera-audit.json
node tools/audit_particle_locator.mjs --plan tools/data/shared-skill-review/brave-slash-composed/plan-particle-geometry.json --trace tools/data/particle-native-audit/locator-trace-summary.json --particles tools/data/particle-native-audit/combined-node34-summary.json --effect atk_impact_001_pink.bmb --node 34 --effect-frame 5 --output tools/data/particle-native-audit/locator-projection-audit.json
node --test tools/test_particle_locator.mjs
```

Set `FFROGUE_PYTHON` to the installed Python executable. The preceding
[display experiment](particle-geometry-subset.md) and
[revision-14 measurement](renderer-backend-decision.md) document preparation of
the candidate and particle summary. All generated receipts stay in ignored
`tools/data`; tracked tests skip the real-capture case explicitly when these
local files are unavailable on another computer.

A bounded static inspection of the exact-build functions
`SelectSetupComputedLocatorFunction`, `transform_locator::ModuleTable::UpdateModuleOf`,
`transform_locator::update::Default` and `transform_locator::update::ZScreen`
was also performed with `inspect_native_calls.py`. It confirms separate locator
helper/variant dispatch, but does not establish the active ancestor variant or
selection inputs for nodes 1/33 in this capture. Their equations must not be
chosen just because a symbol has a suggestive name. Reproduce using the function
names in `tools/data/particle-native-audit/locator-projection-static.json` and the
pinned APK as in the existing native inspection workflow.

## Checks actually executed and next boundary

The actual trace summary, camera audit and new six-sample locator audit completed.
All 41 relevant Node tests passed, including four new projection/provenance/
capture tests (zero skipped locally), and the four existing Python camera tests
passed. `git diff --check` passed. No browser comparison, game build or complete
native-pixel validation was performed in this milestone.

The named missing input is now **the active ancestor locator/update path and
its input/output transform for nodes 1 and 33**, not another screenshot of this
skill. Existing node-34 vertex/module observations do not contain that information.
Any next native observation should be bounded to that question and joined to
the existing source identity. Do not change all parent rotations or compatibility
flags based on this one constant offset. A rule needs the active dispatch evidence
and an independent transform/control case before entering common playback.
