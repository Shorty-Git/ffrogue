# Native Model selection and constant Basic texture material

Follow-up: [native framebuffer blending and global uniform evidence](native-blend-global-uniforms.md)
implements the optional native blend-factor path and verifies the default
colorScale and alpha-setter link. Earlier unverified-boundary statements below
describe the Model/Basic revision, not a replacement of that later evidence.

Date: 2026-10-24. Extends [initial material selection](native-material-selection.md).
Research preview only, approved false. No new recording or emulator change.

## Implemented boundary

The shared selector now supports the verified single-submesh, UV-bearing BR3M
Model subset. All 26 previously unsupported Model nodes in the three-skill
corpus select descriptor 1344, vertex slot 44 and fragment slot 224. Together
with the previous Quad/Particle path, 56 source nodes have initial selections.
This does not authorize drawing independently withheld nodes, nor prove live
resource bindings, global uniforms or complete skill fidelity.

The importer also has an opt-in `--native-basic-material` path. For the pinned
Basic fragment it attaches matching-authoring, constant, non-random first-layer
RGBA and the shared renderer multiplies it into the sampled texture. Final
clamping follows model/quad vertex-color multiplication. Legacy plans retain
their previous material. Missing authoring and unsupported tint controls remain
explicit; there is no implicit white-tint replacement in this candidate.

Current tint boundary:

| Skill | Initial Model selections | Basic selections | Constant tint candidates |
| --- | --- | --- | --- |
| Brave Slash, composed | 12 | 17 | 17 |
| Blade Beam | 5 | 5 | 5 |
| Climhazzard | 9 | 15 | 4 |

The 26 accepted constant tints are all neutral white in this corpus. This block
therefore provides a verified reusable material path, not a claimed visible
color improvement to these skills. Of the remaining 11 Basic selections, 10
Power Geyser nodes lack matching authoring and one purple-slash node has random
texture color. Their legacy comparison remains labeled. Random sampling and
animated layer color are not inferred from constant controls.

## Native source evidence

Source APK, library and shader hashes are unchanged from the preceding report.
`ModelSetupper::InitDrawData` initializes resource type 4 at `0x1ffe78c`, source
parameter pointer at resource +8, original model at +0x10, submesh index at
+0x18 and clears the special flag at +0x1c (`0x1ffe79c`).

Native `m3r::GetChunksInfo` returns source +0x10. `GetSubmeshInfo` reads submesh
count from header byte +0x30 and addresses a record of size 0x58 from the
header's +0x14 table offset. For the already supported single-record BR3M
versions 34/35, `HasUV` is exactly the vertex-stride comparison against 0x24.
`GetTextureName` reads material +0x14/+0x18, treats uint32 0xffffffff as a null
pointer, and otherwise resolves the offset relative to the names section.

`inspect_m3r.py` now preserves these two actual texture-slot references and
pointer-presence flags in `nativeMaterial`, separately from the older first-string
inventory label `embeddedTextureName`. A non-null pointer to an empty string is
still non-null in the native selector. It does not become a usable runtime
texture. Invalid offsets/terminators fail. Other submesh counts remain explicitly
unsupported for native selection. No embedded textures are newly loaded or
published by this change; rendering still requires the reviewed explicit BMB
binding.

For the supported UV Model branch, selector mask bits are derived from raw
source bytes +0x111/+0x118/+0x114/+0x117, nonzero float +0x1fc sets bit 4,
and uint32 +0x6f4 equal to 1 sets bit 6. Texture operation is uint32 +0x6e0.
Textured presence first tests the explicit BMB names (+0x50/+0x60), with the
native embedded first-slot pointer as the selector's fallback. The descriptor
index is:

```text
448 + mask + (textured ? 896 + 4 * operationOffset : 0)
operationOffset for IDs 0..6 = 0, 96, 32, 64, 128, 160, 192
```

The native Model operation jump table at 0x255179a is now checked as well.
The no-UV native branch is not implemented: the existing geometry reader only
supports the observed UV stride. Unknown operations, missing models and absent
verified material metadata cannot select a guessed shader.

Vertex slot 44 explicitly computes `ipo_color = in_color * diffuseColor` and
passes texture color scale separately. Fragment slot 224 multiplies vertex
RGBA, base texture and first-layer RGBA, then clamps the product with global
colorScale. Fragment slots 8 and 224 have identical source hashes in this
package; their slot identities remain separate.

- Vertex 44 SHA: `f41d379d2ee21af1a2de4ae30eaaec079eb99d77d85779b7782958814eba389f`
- Fragment 224 SHA: `8ae381afc9f95ab42caafc2c03266ddc08500489623d2e16d39d89737b7d1fb4`

## GPU and source validation

`verifyShaderBasic` compares the real common material hook plus model-RGBA hook
against a RawShaderMaterial using the **unedited native vertex 44 and fragment
224 sources**. Native attributes use actual normalized byte colors. Identity
world/view/projection and texture transforms, zero offsets and global colorScale
1 are fixture inputs; their population in a real battle is not tested here.

Five equality cases cover colored/partial-alpha tint, zero layer alpha, zero
model RGBA, overbright tint clamped after model RGBA, and white-layer baseline.
A sixth negative control proves the legacy path ignores tint. All permit two
byte values per channel. Add and Distortion retain their existing native-fragment
tests. These controlled GPU comparisons do not verify native particle simulation,
source-age sampling, UV animation or source runtime state changes.
All three browser candidates actually completed 6 Basic, 6 Add, 6 Distortion,
8 scene-blend and 8 model-RGBA checks each. Climhazzard's Basic A/B toggle was
exercised off/on and restored to the native candidate. Its F50 screenshot is
saved under tools/data/native-basic.

All 80 Node tests and 84 Python tests (71 pipeline +13 Memorial) passed with
zero skips. Targeted regressions cover all seven Model texture-operation
branches, all supported selector flags, embedded-pointer/no-texture branches,
unsupported UV layout, bad material references, random/animated tint rejection,
missing source, nonfinite tint and source-transform mismatch. Twenty staged
original model files were actually decoded with the new material metadata.
The refreshed material audit verified 30 texture files and 20,117 active
instance-frame samples with finite matrices/colors and alpha in 0..1.

## Reproduce

Use the preparation commands in [the previous material report](native-material-selection.md),
retain all authoring/placement/geometry/Add flags, add `--native-basic-material`,
and write `plan-native-basic.json` in each skill's existing stage. The flag
requires native shader selection and source appearance. No new input files or
emulator hooks are required.

```powershell
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/brave-slash-composed/plan-native-basic.json --plan tools/data/shared-skill-review/blade-beam/plan-native-basic.json --plan tools/data/shared-skill-review/climhazzard/plan-native-basic.json --port 3134
python -m unittest discover -s tools -p test_native_material_selection.py
python -m unittest discover -s tools -p test_m3r.py
python -m unittest discover -s tools -p test_original_basic_material.py
node --test tools/test_native_basic_material.mjs
```

The diagnostic checkbox switches native Basic tint on/off for A/B review.
Each browser result remains approved false. Fresh source/coverage receipts,
material audit and Node log stay under ignored `tools/data/native-basic`;
per-skill GPU receipts stay in their existing staging directories. The Phaser
game's published effects remain unchanged. Framebuffer blend state, global
uniforms, unsupported geometry and source-less playback controls remain open.
