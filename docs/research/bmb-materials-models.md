# Selected material controls and original BR3M geometry

Checked on 2026-10-22. Offline tools only; no runtime publication, engine switch,
purchase, SDK installation or full original-effect rendering.

## Material controls

`tools/bmb_materials.py` reads a deliberately limited set of controls identified
by varying authoring values and binary fields. The seven existing original/
BMSLN comparisons still pass, now including 585 enum-control checks and 88
constant-alpha checks. Reading enum labels does not implement shader behavior.

| Type | Verified block-relative controls |
| --- | --- |
| ControlNull | Alpha mode 688 |
| EmitterQuad | Blend 1824, texture combination 1840, texture address 1/2 at 1844/1848 |
| EmitterParticle | Blend 1680, texture combination 1696, texture address 1/2 at 1700/1704; constant alpha 444 |
| EmitterModel | Blend 1744, alpha mode 1748, alpha test 1752, texture address 1 at 1764; constant alpha 496 |

Observed labels: blend IDs 1/2 are `Semitrans`/`SemiAdd`; alpha-mode IDs 0/1 are
`Constant`/`Curve`; alpha-test IDs 0/2 are `Less`/`Greater`; texture-address IDs
0/1/2 are `Clamp`/`Repeat`/`Mirror`; texture-combination IDs 0/2 are `Basic`/`Add`.
These are observed source labels, not a complete enum or blend-equation spec.
Unmapped fields and unknown IDs are not silently assigned defaults.

An additional targeted comparison identified quad texture-combination ID 6 as
`Distortion`: four quad emitters in
`ability_eff_hieroglyphaquarium_back.bmb` match the corresponding BMSLN source
property and their other decoded material controls. This mapping is enabled
only for the verified quad layout, not assumed for particle/model layouts.
Provenance and checks are in ignored
`tools/data/bmb-format/distortion-material-proof.json`.

Climhazzard quad nodes 7 and 9 both have texture-combination ID 6 and an explicit
second texture `distortion_003`. This establishes a source `Distortion` mode,
not its sampling equation, strength, background capture or final visual output.
Their address modes differ: node 7 uses Clamp/Repeat, node 9 Mirror/Repeat.
Two stone model nodes use `Semitrans`; other visible emitter nodes use `SemiAdd`.
This data must not be flattened to one uniform blend recipe.

## Original model geometry

`tools/inspect_m3r.py` reads the observed single-material `BR3M` subset, versions
34 and 35, with 36-byte vertices and uint16 triangle indices. The five inputs
were taken from the CPK-extracted Climhazzard resources, not inferred from PNGs.
Each also hashes identically to its local raw M3R counterpart in `assets/`.

| Model | Vertices | Triangles | Embedded texture name |
| --- | ---: | ---: | --- |
| `model_aura_001` | 64 | 32 | `deffuse_aura_001` |
| `model_aura_041` | 297 | 512 | `checker` |
| `model_fire_002` | 230 | 330 | `flame_003` |
| `model_glow_004` | 8 | 6 | `glow_001` |
| `model_stone_002` | 114 | 72 | `deff_stone_001` |
| **Total** | **713** | **952** | |

Vertex layout: XYZ position, four packed color bytes, XYZ normal, two UV floats.
Packed white color bytes must not be interpreted as a NaN float. Index and
vertex payload lengths are each padded to a multiple of 16 bytes; the padding
is relative to payload length, not absolute file position. Header bounds,
record sizes, supported versions, finite attributes and index ranges are checked.
Other material counts/layouts fail instead of guessing.

Every decoded position, normal, packed color, UV and triangle was compared with
the corresponding local converted Effekseer version-6 model. Positions, normals
and colors match exactly. Converted UVs reverse V (`1 - original V`) and triangle
orders are reversed. The reader and OBJ exports preserve original coordinates,
UVs and winding; no conversion reversal is silently applied to original output.
Generated tangents/binormals, second UV coordinates and renderer fidelity are
not part of this comparison.

The embedded texture defaults are not sufficient for effect composition:
Climhazzard assigns `aura_015` to the model whose embedded name is `checker`, and
`deff_stone_004` to a model embedding `deff_stone_001`. Both source layers are
preserved; runtime override semantics have not been implemented or tested.

Ignored JSON/OBJ outputs are under `tools/data/bmb-format/models/`. The generated
`wireframes.png` was visually inspected. It shows XY and oblique projections,
fitting each mesh independently; it is a geometry diagnostic, not an effect
frame, material render or animation. JSON retains packed colors; OBJ exports
positions, UVs, normals and faces without material simulation.

## Reproduction and validation

```powershell
& $env:FFROGUE_PYTHON -m unittest discover -s tools -p 'test_bmb*.py'
& $env:FFROGUE_PYTHON tools/test_m3r.py
& $env:FFROGUE_PYTHON tools/inspect_m3r.py assets/effect_resource/model_glow_004.m3r --compare-effekseer assets/effect_resource/model_glow_004.efkmodel --output tools/data/bmb-format/models/model_glow_004.json --obj
```

Twenty-one BMB tests and five M3R tests pass. New coverage includes source-label
mismatch, explicit unknown material IDs, nonfinite alpha, type-specific
distortion support, geometry attributes/padding, source preservation, truncated
or unsupported models, invalid indices, finite coordinates, counterpart UV/
winding differences and original-order OBJ output. All five real mesh
comparisons, seven full BMB source comparisons and the four-emitter targeted
distortion comparison were executed. No game build or Climhazzard animation
was tested.

## Remaining boundary

The next milestone is generation timing and parent influence, then a minimal
verified evaluator for transforms/curves and the required material operations.
Source labels alone do not define blend, alpha-test or distortion equations.
Other material controls, missing channels, effect/body synchronization and
original-game fidelity remain unverified. A complete original Climhazzard
animation has not been produced.
