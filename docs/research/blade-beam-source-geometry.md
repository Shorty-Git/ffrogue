# Blade Beam source geometry and texture mapping audit

This targeted audit follows the report that Blade Beam's green wave has incorrect
proportions and placement. It inspects `atk_aerialslash_001_green.bmb`, its matching
BMSLN, the original M3R resources and the prepared research plan. It does not
approve the animation or recover FFBE's world-to-screen placement convention.

## Confirmed omission: rotation on single-texture materials

The three crescent layers, source nodes 5, 7 and 8, bind `glowring_022` to
`model_glow_004`. Their active source texture settings are identical:

| Property | Source value |
| --- | --- |
| Texture combination / mapping | Basic / Basic |
| Translation | `(-0.1, 0, 0)` |
| Rotation | `(0, 0, -90)` degrees |
| Scale | `(1, 1, 1)` |
| Pivot | `(0.5, 0.5, 0.5)` |
| Translation, rotation and scale modes | NewtonDynamics |
| Transform speeds, acceleration and random ranges | Zero |
| Animation | Crop, 1x1, one cell |
| X/Y reversal | Off |

These are active settings, not dormant curve keys. In the preceding research
player, only the two-texture shader branch used the shared texture matrix.
Ordinary single-texture materials applied `map.repeat` and `map.offset`, losing
the source rotation and the pivot contribution to scaling. `glowring_022.png`
itself depicts an upward arch, so losing its quarter-turn changes the visible
crescent's orientation without changing any mesh or movement coordinates.

The converted Effekseer EDIT data also omits these layers' UV rotation and
translation. Its `RendererCommonValues` contain texture/blend settings without
the original UV transforms. The converted effect is therefore not an independent
reference for resolving the original crescent orientation.

The manufacturer documents [texture pivots][texture-settings] and
[texture rotation][texture-rotation]. Those pages establish that the controls
affect rendering, but do not specify the exact matrix/sign/order convention.
The shared inverse-TRS texture matrix remains an explicit experimental policy;
restoring a previously unused source input is not proof of native pixel fidelity.

## Scope and negative controls for the UV experiment

A read-only numeric probe compared the legacy repeat/offset matrix with the
existing shared `textureMatrix` at ages 0, 5 and 20 for the first instance of
each single-texture node. Nine nodes with matching authoring sources differ:

| Effect | Nodes | Reason |
| --- | --- | --- |
| Blade Beam green wave | 5, 7, 8 | Source Z rotation of -90 degrees |
| Brave Slash | 15, 16, 18, 20, 22 | Scale X of 0.5 around a 0.5 pivot changes U offset by -0.5 |
| Brave Slash | 28 | Scale `(0.125, 3)` changes the pivot contribution by `(-3.5, +1/3)` |

Blade Beam's blue hit and Climhazzard's blow, slash and strobe are unchanged
controls under this matrix comparison. Power Geyser has six additional candidate
pivot differences, at nodes 11, 19, 20, 22, 28 and 29, but no matching authoring
project. Those source-less nodes remain outside the new supported UV branch.

The later `plan-basic-uv.json` plans expose this through the shared optional
single-texture capability and an A/B toggle. A separate read-only check on those
plans exercised `updateBasicTextureMap` at age 10 for all 34 tagged nodes:

- Supported nodes: Brave Slash 14, Blade Beam 5, Climhazzard 5.
- Unsupported nodes: 10 in Climhazzard's source-less Power Geyser.
- All matrices were finite; toggling back restored the exact legacy matrix.
- Exactly the nine supported nodes listed above changed their UV matrix.
- Member records matched the preceding appearance plans. Every evaluated
  geometry matrix at frame 24 also matched, with source inheritance and appearance
  enabled in both plans.

These checks validate the bounded experiment's isolation, not the native UV
equation. No browser or original-video comparison was performed by this audit.

## Original mesh data is preserved

The prepared vertices and triangles exactly match the reread staged M3R files.
The local converted model counterparts preserve positions, normals and packed
colors; their known differences are V-coordinate and triangle-winding reversal.

| Model | Vertices / triangles | Original bounds |
| --- | --- | --- |
| `model_glow_004` | 8 / 6 | X and Y approximately +/-0.9238796; Z approximately +/-0.000000044 |
| `model_glow_003` | 96 / 48 | X -0.2588189..0.2588192; Y -0.1868956..0.8131038; Z -0.9999990..1 |

The first model is effectively a flat XY octagon. The second is genuinely
three-dimensional; flattening it or swapping its axes would discard source data.
Both models have opaque white vertex colors, so missing model vertex-color
support cannot explain this wave's remaining geometry discrepancy.

## Unresolved: rotation order on the curved model

Model node 6 uses `model_glow_003`, local rotation `(90, 0, 90)` degrees and
nonuniform scale `(0.375, 0.975, 0.725)`. Its model mode is Standard, not Billboard.
Ancestor node 4 provides uniform scale 60; ancestor node 3 contributes a random
X rotation. Seed 1 in the current generator selects `29.876033524` degrees.

The player currently uses Three.js's default Euler order, XYZ. A read-only probe
changed only node 6's local Euler order, retaining its source values, ancestor
matrix, member scale of 300 percent and position. At effect frame 20:

| Three.js order | Projected width | Projected height | Z extent |
| --- | ---: | ---: | ---: |
| XYZ, XZY, YXZ | 175.4999023 | 236.0076525 | 155.8777337 |
| YZX, ZXY, ZYX | 260.9998764 | 114.7392601 | 164.3963565 |

The six orders collapse into two groups here because the local Y rotation is
zero. This demonstrates sensitivity, not which group is correct. The
[manufacturer's root settings manual][root-settings] states that Version 1.5
compatibility changes rotation order, and Version 1.6 changes nonuniform scale
inheritance among other behaviors. Node 6 carries node V1.5/V1.6 flags while the
root flags are false. Their precedence and exact rotation equations remain
unresolved; the inspected documentation and converted assets do not settle them.

Do not select an Euler order because it looks preferable. A future experiment
needs an authoritative rotation/compatibility rule or a clearly labeled A/B
fixture. This question is independent of the confirmed single-texture omission.

## Scale, trajectory and placement remain separate questions

Nodes 5, 7 and 8 retain full mesh extents of approximately
`332.5966644 x 288.3962782` after their source scales and the seed-1 parent tilt.
Their visible texture coverage can change while these mesh extents stay fixed.

The moving ancestor's decoded X curve runs from 275 to -100 source units. The
current scale-300 interpretation makes its endpoint displacement run from +825
to -300 relative to the effect anchor. At frame 20 its X position is approximately
+705; at frame 30 it is approximately +235.17. This explains why a wave can be
far to the right of the target anchor even when its visible crescent orientation
is corrected. It does not prove the current arena anchor is native.

The source member retains `99999999:1:2:2:-1100:0`. Its nonzero final fields are
not evaluated. The research presentation also uses an adapted target-group
anchor and a 50-pixel body offset. No offset, member scale, actor geometry or
trajectory was adjusted in this audit. The native meaning of those member fields
and the FFBE integration's coordinate convention must be established separately.

Model node 12 is a later billboard flash with identity rotations throughout its
ancestors. Adding billboard handling to that node would not correct the moving
ring's orientation under the current camera. The known withheld Model-surface
Particle node 10 is likewise a separate missing component.

## Local sources and reproduction inputs

- `assets/battle_effect/atk_aerialslash_001_green.bmsln`
- `assets/battle_effect/atk_aerialslash_001_green.efkefc`
- `tools/data/shared-skill-review/blade-beam/originals/atk_aerialslash_001_green.bmb`
- `tools/data/shared-skill-review/blade-beam/effects/atk_aerialslash_001_green/resources.json`
- `tools/data/shared-skill-review/blade-beam/plan-appearance.json`
- `tools/data/shared-skill-review/{brave-slash,blade-beam,climhazzard}/plan-basic-uv.json`
- `tools/inspect_m3r.py`: `read_m3r` and `compare_effekseer`
- `tools/inspect_effect_project.py`: `decode_project`
- `tools/original_effect_player.mjs`: `instances`, `createTransformEvaluator`,
  `parameters`, `textureMatrix`, `updateBasicTextureMap`

Numeric probes use the bundled Three.js library, seed 1 and the plans' effect
horizon of 180. All source inspection and numeric comparisons described here
were actually executed; no runtime content was published by this audit.

## Placement negative control

`tools/audit_member_offsets.py` records the green, blue and white aerial-slash
variants and their database group records. Scale 300 and the raw final member
value -1100 recur across variants and abilities. This is evidence of a shared
convention, but does not establish its units or where it belongs in the transform.

The proposed explanation that -1100 compensates two initial translations of 275
is rejected: node 4 stores the same curve as node 3, but selects NewtonDynamics
with zero initial translation. Only node 3's curve is active. The audit preserves
this dormant-curve negative control and makes no placement correction.

```powershell
python tools/audit_member_offsets.py --output tools/data/member-offset-audit.json
```

## Implemented experiment and executed validation

Preparation adds `--basic-uv` to the previous `--source-appearance` commands,
using the same explicit matching `--authoring` projects and writing separate
`plan-basic-uv.json` outputs. Only source-confirmed Basic mapping, active Crop
1x1, no reversal and supported motion modes enter the new UV branch. Source-less,
Pattern, unknown and unsupported rotation-curve cases remain explicit limitations.
The matrices reuse the existing two-texture inverse-TRS policy. They do not
introduce a Blade Beam-specific angle or change source geometry.

```powershell
python -m unittest discover -s tools -p 'test_original_*.py'
node --test tools/test_original_effect_player.mjs tools/test_original_inheritance.mjs tools/test_original_appearance.mjs tools/test_original_texture_mapping.mjs
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/brave-slash/plan-basic-uv.json --plan tools/data/shared-skill-review/blade-beam/plan-basic-uv.json --plan tools/data/shared-skill-review/climhazzard/plan-basic-uv.json --port 3121
```

Executed on 2026-10-22:

- Python: 15 original-source tests passed, none skipped.
- Node: 26 player/inheritance/appearance/texture-mapping tests passed, none skipped.
- A separate final review found no actionable regressions and reran the focused
  four Python and three Node texture-mapping tests successfully.
- All three previews loaded with eight GPU blend checks passing each. Blade Beam
  in Reactor/middle, Brave Slash in Forest/lower and Climhazzard in Reactor/middle
  played from F0 to F210 without returned warning/error console entries.
- Same-frame A/B screenshots were saved at Blade Beam F24 and Brave Slash F42.
  Blade Beam's upward arch becomes a left-facing crescent. Climhazzard F34 was
  visually inspected after playback. These are comparisons within our player,
  not comparisons with native FFBE frames.
- All member records, mesh data and source nodes (apart from added capability
  metadata) remain identical to the previous appearance plans. Recomputed
  capability reports for all seven effects match the prepared plans.
- The ignored receipt is `tools/data/shared-skill-review/basic-uv-review-verification.json`.

Use the checkbox **Apply single-texture UV rotation and pivot (experimental
matrix)** under Rendering diagnostics for the same-frame comparison. Earlier
manually rotated exported artwork must not be combined with this source UV
rotation when a later publication path is developed. The research player loads
the original staged textures, not those repaired exports.

No native-game frame comparison or application build was performed for this
tools-only milestone. Original fidelity and final placement remain unapproved.

[texture-settings]: https://www.matchlock.co.jp/manual/bishamonツールオンラインマニュアル/bishamon詳細/ビュー/インスペクタ/テクスチャ１、２/
[texture-rotation]: https://www.matchlock.co.jp/manual/bishamonツールオンラインマニュアル/bishamon詳細/ビュー/インスペクタ/テクスチャ１、２回転/
[root-settings]: https://www.matchlock.co.jp/manual/bishamonツールオンラインマニュアル/bishamon詳細/ビュー/ルート設定/
