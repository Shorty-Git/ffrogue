# Initial native material selection and Distortion alpha

Follow-up: [native Model and Basic material](native-model-basic-material.md)
adds the verified UV single-submesh Model selector and an optional constant
Basic layer-tint path. The remaining Model-selection boundary below describes
this preceding Quad/Particle-only revision.

Date: 2026-10-24. Offline research candidates only; all plans remain
`approved: false`. No new emulator recording, APK update or game publication.

## Reusable import advance

The importer can now follow original Quad/Particle parameters through the native
shader selector to a concrete descriptor, vertex slot and fragment source hash.
This is shared format logic, with no character or skill-name dispatch.
It establishes **initial ordinary-constructor selection**, not a captured live
GPU binding. Later resource mutations, global uniforms and framebuffer blend
state remain unverified.

`tools/native_material_selection.py` verifies the pinned APK, native library and
shader package hashes before reading their tables. It rejects unknown source
versions/packages. `prepare_original_preview.py --native-shaders-apk ...
--native-shader-package ...` attaches the resulting per-node metadata to an
isolated research plan. Existing source SHA checks still apply to every BMB.

The shared Add material now requires an exact fragment-hash match when this
native-selection mode is active. Different permutations, unsupported node types
and absent metadata cannot enable the Add candidate through the A/B toggle.
They retain the explicitly labeled legacy comparison. Older plans without the
new mode preserve their earlier family-only experiment.

## Shader table recovery

Each package contains a vertex block followed by a fragment block. A block has
four little-endian uint32 header words: count, source-data relative offset,
source-data span and reserved zero. The table starts after the 16-byte header;
each entry contains slot ID, source-data offset and string length including NUL.
Source data starts at block + 16 + relative offset. The next block starts after
the declared source span. The reader validates ranges, slot order, terminators,
UTF-8, main functions and final zero padding.

| Package | Vertex slots / distinct sources | Fragment slots / distinct sources |
| --- | --- | --- |
| bmshaderpack.bin | 126 / 39 | 444 / 250 |
| bmshaderpack_gl2.bin | 126 / 39 | 444 / 125 |

Distinct sources are counted by exact SHA-256 without the terminal NUL. Slots
with duplicate source text remain separate slots. Earlier regex extraction of
complete fragment strings was incomplete; its small source count was not the
package's shader count. A source byte offset is still not a permutation ID.

The pinned native `CreateMetaShaderData` at `0x15c0238` uses descriptor table
`0x2551c10`: 2,280 rows of four uint32 words. The first two words select the
vertex/fragment slots. Remaining words are preserved without invented semantics.
All rows fit both package tables. Resource-type dispatch at `0x2551794` and the
two operation jump tables at `0x25517a6`/`0x25517ac` are checked explicitly.

Source identity:

- APK: `9d21fc8b61c9900eaacb1c2ddef2cabcad1e97d2dc720be16ac09b06fc0086b4`
- libgame.so: `6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77`
- bmshaderpack.bin: `2f36d1839cad4ede93764b4237a05d4cbe4085392a9a2b6f93c5833e14d7dd0b`
- bmshaderpack_gl2.bin: `90cdbdee63950026ba9031f9a04fed98dbefbb199610a32a438003b119ee2f6c`

## Bounded selector implementation

Native resource type 0 is Quad and type 1 is Particle; these differ from BMB
node type IDs 2 and 3. Their InitDrawData constructors set the resource's special
flag at +0x1c to zero. Particle stores resource type 1 at `0x2002ee8` and clears
that flag at `0x2002ef0`; Quad stores type 0 at `0x201227c` and clears the flag
at `0x2012284`. The source parameter pointer is stored at resource +8.

The selector's raw source offsets are retained without speculative field names:

| Input | Quad | Particle |
| --- | --- | --- |
| Initial mask byte | 0x145 | 0xe1 |
| Nonzero byte sets bit 1 | 0x14a | 0xe6 |
| Nonzero float sets bit 2 | 0x22c | 0x1c8 |
| uint32 equal to 1 sets bit 3 | 0x748 | 0x6b8 |
| uint32 equal to 1 adds bit 4 | 0x744 | 0x6b4 |
| Texture operation | 0x730 | 0x6a0 |

Texture names come from the previously verified BMB bindings at +0x40/+0x50.
Basic requires the first nonempty name; other operations require both. For the
textured branch the descriptor index is mask +224 + operation offset, where
operation IDs 0..6 map to offsets 0,96,32,64,128,160,192. The untextured branch
uses the mask. Unknown operations and unsupported node types are explicit
unsupported results. No Model/Stripe selector is guessed from similar offsets.

Across the three prepared skill definitions:

- 30 Quad/Particle nodes have initial selections; 26 Model nodes remain outside
  this selector implementation. This is inventory, not a draw-count assertion.
- All 16 Add nodes select descriptor 256, vertex slot 12, fragment slot 24.
  Fragment SHA is `b54945426716fdc4ae4678cc85de7acd658d5259f23d5b2b187eb782a748a687`,
  matching the previously GPU-tested Add candidate. One Blade Beam node remains
  independently withheld for model-surface emission; 15 remain draw candidates.
- Both Power Geyser distortion quads select descriptor 416, vertex slot 12,
  fragment slot 184. The remaining selections include Basic and one withheld
  untextured Particle. Selection does not authorize drawing that primitive.

## Concrete Distortion renderer correction

Fragment slot 184 is package offset 413264, SHA
`f4cef6ffc96d8f8fc66d33fec28619c18390ce445dd06bb2b01d204bbbbea990`.
Its unedited source computes:

```text
offset = texture2(uv2)
offset.rgb -= displacementMidpoint.rgb
offset *= layer2Tint
offset.rgb *= offset.a
uv1 += offset.xy
output = vertexRGBA * texture1(uv1) * layer1Tint
output.a *= offset.a
output = clamp(output * globalColorScale, 0, 1)
```

The previous experimental shader omitted both uses of offset alpha. The new
shared candidate implements them only when the prepared initial selection has
the exact reference hash. Legacy plans retain their former path. The diagnostic
checkbox compares native alpha on/off without hiding the whole effect.

**Remaining:** source per-layer alpha controls are not yet decoded for these
distortion quads; existing prepared defaults remain explicit. Texture motion,
source-age evaluation, midpoint unit conversion, native vertex varyings and
global colorScale population are not validated by the shader fixture. The
correction does not establish complete Power Geyser or Climhazzard fidelity.

## Reproduction and actual validation

Run from the repository root with a real Python executable on PATH:

```powershell
python tools/memorial/catalog_native_materials.py --apk tools/data/memorial-audit/installed-base-v208.apk --package tools/data/particle-native-audit/bmshaderpack.bin --package tools/data/particle-native-audit/bmshaderpack_gl2.bin --output tools/data/native-material/catalog.json
```

Use the three commands in [the Null locator review](null-locator-subset.md),
retain their existing flags and authoring sources, and add:

```powershell
--shader-add-reference tools/data/particle-native-audit/reproducible/bmshaderpack.bin/176976.fragment.glsl
--native-shaders-apk tools/data/memorial-audit/installed-base-v208.apk
--native-shader-package tools/data/particle-native-audit/bmshaderpack.bin
--native-shader-package tools/data/particle-native-audit/bmshaderpack_gl2.bin
```

These are arguments, not standalone commands. Write each output as
`plan-native-material.json` in its original skill stage. Then:

```powershell
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/brave-slash-composed/plan-native-material.json --plan tools/data/shared-skill-review/blade-beam/plan-native-material.json --plan tools/data/shared-skill-review/climhazzard/plan-native-material.json --port 3133
python -m unittest discover -s tools -p test_native_material_selection.py
node --test tools/test_shader_add.mjs
```

The Distortion GPU fixture renders the actual common material hook against the
unedited pinned fragment with a gradient base texture and controlled varyings.
Five equality cases cover partial/zero/opaque mask alpha and partial/zero layer
alpha; a sixth negative control proves the legacy path differs. Two byte values
per channel are allowed. These are fragment-output checks, not native vertex or
whole-scene comparisons. Browser result receipts, catalog and test logs stay in
ignored `tools/data/native-material` and the existing skill staging directories.

Executed results for this block: all three browser candidates reported ready,
with 6 Add, 6 Distortion, 8 scene-blend and 8 model-RGBA GPU checks passing each.
The Climhazzard native-alpha A/B control was exercised off and on, returning
to the native candidate; the F50 screenshot is stored in tools/data/native-material.
All 78 Node tests and 78 Python tests (65 pipeline +13 Memorial) passed, with
zero skips. `npm run build` passed; the existing 500 kB chunk warning remains
(main bundle 1,543.74 kB minified). The source/coverage audit was regenerated
after the final player change. The material/alpha audit verified 30 texture
files and 20,117 active instance-frame samples, with finite matrices/colors and
alpha within 0..1. These checks are not a whole-skill fidelity approval.
