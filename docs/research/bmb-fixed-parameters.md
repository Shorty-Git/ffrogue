# Legacy IBMB fixed parameters and per-node bindings

Checked on 2026-10-22. Offline inspection only. No runtime asset, game engine,
original input, SDK installation or purchase changed in this milestone.

This extends [vector-key inspection](bmb-vector-channels.md) with
`tools/bmb_parameters.py`. The main reader now outputs `staticVectors`,
`texturePivots`, selected `motionModes` and `resourceBindings` on known node types.

## Verified scope

All seven existing original/project comparisons pass with these extra checks:

- 8,722 fixed XYZ vectors, including texture pivots, match exact float32
  conversions of authoring values.
- 716 selected motion-mode fields match their authoring enum names.
- 294 per-emitter binding slots match, including absent slots; 203 are nonempty.
- Previous lifetime, hierarchy, scalar-alpha and vector-key comparisons still
  pass. Source/project hashes and counts are in the seven `*-verified.json`
  receipts under ignored `tools/data/bmb-format/`.

Two additional pairs were inspected specifically to disambiguate second-layer
bindings with different first/second textures:

| Additional pair | Nodes | Fixed vectors | Modes | Binding slots / nonempty |
| --- | ---: | ---: | ---: | ---: |
| `AG17_Glam5_heal` | 12 | 368 | 34 | 10 / 8 |
| `ev_advent_parade_whirlpool` | 28 | 884 | 79 | 25 / 17 |

Those **partial** parameter comparisons pass. Full comparison deliberately
rejects them because of active, still-unmapped texture color/alpha curves:
`Texture2_Color_Scale_Alpha_Value_Curve` and
`Texture1_Color_Scale_Rgb_Value_Curve`, respectively. They are not counted as two
additional fully supported effects. `--parameters-project` is an explicit partial
comparison mode; its receipt uses `parameterComparison`, not `projectComparison`.
The CLI prevents combining it with `--project`.

## Fixed vectors

Three transform groups occur consecutively: translation, rotation, scale. Each
group has six XYZ vectors: initial value, value range, initial speed, speed range,
initial acceleration, acceleration range. Each XYZ vector is three float32s.
One group occupies 72 bytes; all three occupy 216 bytes.

The same layout applies to the two texture layers. Bases below are relative to
the node block. Each texture pivot is the XYZ vector 12 bytes before its base.

| Node type | Transform base | Texture 1 base | Texture 2 base |
| --- | ---: | ---: | ---: |
| ControlNull | 340 | — | — |
| EmitterQuad | 732 | 972 | 1200 |
| EmitterParticle | 636 | 876 | 1104 |
| EmitterModel | 700 | 940 | 1168 |

Values retain their authoring representation. Ranges are not randomly sampled,
velocities are not integrated and angles/units are not converted. Effective
inheritance, per-axis/uniform scale behavior and other control flags remain
unimplemented. Finite-vector checks reject corrupt float data.

## Selected motion modes

Verified raw IDs 0/1/2/3 match `Constant`, `NewtonDynamics`, `CurveValue`,
`CurveSpeed`. Enabled slots were identified using variation across source nodes,
then all observed values were compared. Other slots remain unverified.

| Type | Enabled field offsets |
| --- | --- |
| ControlNull | Translation 556, rotation 656, scale 660 |
| EmitterQuad | Scale 1716 |
| EmitterParticle | Translation 1320 |
| EmitterModel | Translation 1384, scale 1684, texture 1 translation 1864, texture 1 scale 1872 |

Unknown IDs stay `Unknown` and fail project comparison; no motion-mode fallback
is applied. Reading a mode name does not implement its behavior.

## Resource bindings

Each verified slot is a uint64 string-section-relative name reference. All-one
bits mean no binding. Other references must resolve uniquely in the matching
typed resource table; dangling or ambiguous references fail.

| Node type | Model slot | Texture 1 slot | Texture 2 slot |
| --- | ---: | ---: | ---: |
| ControlNull | — | — | — |
| EmitterQuad | — | 64 | 80 |
| EmitterParticle | — | 64 | 80 |
| EmitterModel | 64 | 80 | 96 |

The comparison checks each source property in its own role, not just resource
name sets. A mesh name cannot satisfy a texture slot.

## Climhazzard result

The original power-geyser binary now exposes fixed values for all 30 known
blocks and explicit bindings for its 13 emitter blocks. All five model names
and all nine texture names in its tables occur in resolved emitter slots.

- Two quad emitters use `distortion_003` as texture 2. Their first textures are
  `glow_006` and `glow_022`, respectively. This establishes two texture inputs,
  not the unknown material operation that combines them.
- Eight model emitters resolve to five distinct models, including repeated glow
  and stone models. Model geometry is still unread.
- One particle emitter has no texture in either verified slot. This absence is
  preserved, not filled with a substitute image or classified as missing data.
- The selected mode slots yield 82 `NewtonDynamics`, three `CurveSpeed`, two
  `CurveValue` and one `Constant` values. Other mode slots remain unverified.

Climhazzard has no local BMSLN counterpart. Its output uses the layout validated
on the other effects; it is not a direct project comparison or rendered proof.

## Reproduction and validation

```powershell
& $env:FFROGUE_PYTHON -m unittest discover -s tools -p 'test_bmb*.py'
& $env:FFROGUE_PYTHON tools/inspect_bmb.py tools/data/bmb-format/sp_20157_kyogiri_front.bmb --project assets/battle_effect/sp_20157_kyogiri_front.bmsln --output tools/data/bmb-format/sp_20157_kyogiri_front-verified.json
& $env:FFROGUE_PYTHON tools/inspect_bmb.py tools/data/bmb-format/AG17_Glam5_heal.bmb --parameters-project assets/battle_effect/AG17_Glam5_heal.bmsln --output tools/data/bmb-format/AG17_Glam5_heal-parameters.json
& $env:FFROGUE_PYTHON tools/inspect_bmb.py tools/data/climhazzard-source/originals/atk_powergeyser_001_purple.bmb --output tools/data/bmb-format/climhazzard-structure.json
```

All seventeen tests pass. New checks cover fixed component ordering, input
preservation, mode IDs, separate texture-layer values/pivots, typed binding
resolution, explicit absent slots, dangling/wrong-role references, source-role
mismatches, nonfinite values and unverified node layouts. The seven full and two
partial comparisons and the actual Climhazzard inspection were executed. No game
build or effect animation was tested; this milestone changes offline Python only.

## Next bounded milestone

Follow-up: [selected material controls and original M3R geometry](bmb-materials-models.md)
are now decoded and checked. Missing evaluation and generation/inheritance
semantics remain the next boundary. The current reader
still does not produce an original Climhazzard animation or a runtime import.
