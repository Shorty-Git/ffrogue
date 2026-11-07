# Experimental zero-roll Particle display geometry

Status: 2026-10-24. Offline research only; `approved: false`. This implements a
bounded shared-renderer experiment after the unsuccessful isolated native-export
attempt. No Phaser assets, effects or reward offers are published by this work.

## Evidence and boundary

The [revision-14 measurement](renderer-backend-decision.md) captured Particle node
34 of `atk_impact_001_pink.bmb` with an identity draw basis. Its native width was
1278 and height 1136: twice the local half-extents 360 and 320, multiplied by
1.775. Its textured white flash is not a missing texture.

Pinned sources:

- Original BMB SHA-256: `89c3cb5e7c16df69bf8d1c538622afdd42e30942240141a8147dd55da4de690f`.
- Matching BMSLN SHA-256: `074d71c0a4b531db1ac97806eb82292ee588744cfc136efaf21df66a9977398a`.
- White 8x8 texture SHA-256: `3b03488b361554f606c86d64c5b745640bdc722370361d78516ec2818864ed7d`.

One captured writer/basis does **not** identify every native Particle variant.
The shared experiment is therefore opt-in and conservatively restricted. It
does not fit a skill-specific angle, size, center or timing correction.

`original_particle_geometry.py` supplements explicitly matched authoring controls
after `compare_project` succeeds. These rotation/scale selectors are authoring
evidence, not newly decoded binary fields. The shared eligibility predicate
requires:

- Textured Particle, Point emission and Basic/Add material.
- Zero member rotation and positive member scale.
- Verified NewtonDynamics rotation and scale controls throughout the ancestors.
- Zero local rotation, no ancestor Z rotation/ranges/speeds/acceleration.
- Positive constant scales, uniform ancestor scales and no populated geometry curves.
- Explicit supported matrix/rotation/scale inheritance.

The mesh display plane uses radius-one extents and the preview's fixed view
basis. Simulation matrices, trajectories and world center remain unchanged.
The display compensation affects only eligible meshes. Quads and models retain
their previous geometry. Unsupported Particles retain **labeled legacy comparison
geometry**, not claimed native support; existing emission/untextured withholding
still applies. The A/B switch restores the legacy mesh matrix.

`--particle-geometry` requires `--inheritance` and rejects `--fit-screen` because
screen fitting would subsequently modify the compensated root transform.
Rotated cameras, native roll, dynamic size, nonuniform ancestor scale and general
variant dispatch remain outside this experiment.

## Actual corpus result

| Plan | Eligible Particle nodes | Result |
| --- | --- | --- |
| Composed Brave Slash | 1/4 | Pink impact node 34 changes; random rotation/dynamic-scale nodes remain legacy comparisons |
| Blade Beam | 0/2 | Negative control; model-surface emission remains withheld |
| Climhazzard | 0/7 | Negative control; includes dynamic/nonuniform scales and missing Power Geyser controls |

These are source-node counts, not emitted instances or complete-skill approvals.
Other skills are negative controls, not additional native validations.

The white flash changes at preview F29, but a visible boundary **remains**.
The native center was `(188,857.875,0)` while the evaluator under the measured
root produced approximately `(188,837.087,93.768)`. This change deliberately
preserves that unresolved center. The adapted preview camera/arena also differs
from the native portrait projection. Reproducing the measured extents alone
does not close locator, clipping or full-screen-composition behavior. Do not
hide the layer or add a per-skill correction to claim the rectangle is fixed.

## Reproduce

Use the composed/three-skill source preparation commands in the workflow and
[RGBA experiment](model-vertex-rgba.md). Retain their flags and exact authoring
members, add `--particle-geometry`, and choose a separate output filename
`plan-particle-geometry.json`. Do not overwrite reviewed/baseline plans.

The three generated plans in this session were served with:

```powershell
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/brave-slash-composed/plan-particle-geometry.json --plan tools/data/shared-skill-review/blade-beam/plan-particle-geometry.json --plan tools/data/shared-skill-review/climhazzard/plan-particle-geometry.json --port 3129
& $env:FFROGUE_PYTHON tools/audit_original_skill_features.py --plan tools/data/shared-skill-review/brave-slash-composed/plan-particle-geometry.json --plan tools/data/shared-skill-review/blade-beam/plan-particle-geometry.json --plan tools/data/shared-skill-review/climhazzard/plan-particle-geometry.json --output tools/data/particle-geometry/source-features.json
node tools/audit_renderer_coverage.mjs tools/data/particle-geometry/source-features.json tools/data/particle-geometry/coverage.json
node --test tools/test_original_effect_player.mjs tools/test_original_appearance.mjs tools/test_original_inheritance.mjs tools/test_model_vertex_rgba.mjs tools/test_renderer_coverage.mjs tools/test_particle_geometry.mjs
& $env:FFROGUE_PYTHON -m unittest discover -s tools -p 'test_original*.py'
& $env:FFROGUE_PYTHON -m unittest discover -s tools -p test_m3r.py
```

Set `FFROGUE_PYTHON` to the installed Python executable. Generated plans, resource
hashes, browser receipts, screenshots and coverage remain ignored in `tools/data`.

## Checks actually performed

- All three candidate preparations and fresh source/renderer coverage audits completed.
- 37 Node tests passed (including the added coverage gate); 15 Python source tests
  and 5 M3R tests passed. Geometry tests reproduce native width/height independently
  of center, test XY tilts, unchanged simulation matrices, invalid bases and rejection gates.
- All three real browser previews became ready, each with 8 GPU blend checks and
  8 model-RGBA checks passing; all receipts retain `approved: false`.
- Brave Slash was inspected at F29 with the switch on and off. The source white
  layer remains visible; geometry changes do not establish native fidelity.
- Blade Beam F20 and Climhazzard F50 were compared on/off. Visible arena crops
  were byte-identical: Blade `(335,195,914,630)`, Climhazzard `(335,502,914,700)`
  in the saved 1265x712 screenshots. Climhazzard's crop covers only the visible
  upper arena portion; this is not a whole-animation pixel-equivalence claim.
- No emulator modification, game build, production publication or native-fidelity
  approval was performed in this milestone.

Next bounded question: determine a shared locator/projection rule using the
existing measured native root, center and vertices. Keep that separate from
unknown roll/material variants. Only pursue another capture if those existing
receipts cannot answer a named missing input.

Subsequent result: the [locator/projection audit](particle-locator-projection.md)
reuses those receipts and isolates the pre-projection center residual. The
analytical camera conversion is reproduced; the active ancestor selection rule
is still unknown. See that review before planning another capture or changing
the hierarchy evaluator.
