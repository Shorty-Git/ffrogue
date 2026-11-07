# Native framebuffer blending and global color-scale evidence

Date: 2026-10-24. Research preview only, approved false. No new game recording,
emulator modification or publication. Extends the [Model/Basic material block](native-model-basic-material.md).

## Concrete result

`prepare_original_preview.py --native-blend` enables the pinned native blend
table in the common renderer. It requires native shader selection and scene
composition. Original BMB blend IDs are preserved; no character/skill-name
dispatch is used. Legacy plans keep their Three.js presets.

The native factors apply to both RGB and alpha. The legacy normal preset was
different in alpha, while the legacy additive preset already matches the native
SemiAdd state in the bundled Three.js revision 130. This was established by
actual GPU comparison, not inferred from preset names.

For source S and destination D, with FUNC_ADD:

```text
Semitrans RGB = S.rgb * S.a + D.rgb * (1 - S.a)
Semitrans A   = S.a * S.a   + D.a   * (1 - S.a)
SemiAdd RGB  = S.rgb * S.a + D.rgb
SemiAdd A    = S.a * S.a   + D.a
```

Three's normal preset instead uses source factor ONE for alpha. At source alpha
0.25 and destination alpha 0.4, native normal produces approximately 0.3625;
the legacy preset produces 0.55. RGB is the same in this isolated comparison.

Source inventories: Brave Slash has 18 SemiAdd /3 Semitrans nodes, Blade Beam
9 /1, Climhazzard 21 /4. All 56 source nodes have known native blend IDs.
Independently withheld geometry remains withheld. Correct factors do not approve
the fragment shader, node simulation, original ordering or entire skill.

## Native source path and table

Source APK/native/package identities are pinned as in
[initial material selection](native-material-selection.md). All new native
disassembly commands verify those hashes before reading executable bytes.

The original InitDrawData constructors copy BMB uint32 blend parameters to
draw-state offset 0: Quad source +0x720, Particle +0x690, Model +0x6d0.
`Animation::Draw` transfers that word to RenderContext +0xb4 at `0x15c4840`
(ordinary particle path) /`0x15c491c` (Model path). The EGL state updater reads
that index at `0x15c6d34`, selects the table at `0x255ab8c` and calls
`glBlendFunc` at `0x15c7228` or `0x15c738c`. These are single-function blend
factors, so their component-wise effect includes alpha.

The table has seven reviewed rows of three uint32 values:

| ID | Enabled | Source factor | Destination factor |
| --- | --- | --- | --- |
| 0 | 0 | ONE | ZERO |
| 1 | 1 | SRC_ALPHA | ONE_MINUS_SRC_ALPHA |
| 2 | 1 | SRC_ALPHA | ONE |
| 3 | 1 | ZERO | ONE_MINUS_SRC_ALPHA |
| 4 | 1 | ONE | ONE |
| 5 | 1 | ZERO | ONE_MINUS_SRC_COLOR |
| 6 | 1 | ONE_MINUS_DST_COLOR | ONE_MINUS_SRC_COLOR |

Only IDs 1/2 have the existing reviewed authoring names Semitrans/SemiAdd.
No semantic names are invented for the other raw IDs. The following bytes are
not treated as an eighth state. Unknown IDs remain unsupported, with an explicit
legacy-comparison warning. Altered equations/unknown factors fail rather than
becoming an additive default.

`RenderContext::Begin` explicitly loads 0x8006 (FUNC_ADD) at `0x15c6914` and
calls glBlendEquation at `0x15c6918`. `BishamonData::onDraw` wraps DrawBegin,
Animation::Draw and DrawEnd in ScopedStateCache. Consequently this equation is
established for the reached native effect pass; it is not an assumption about
OpenGL defaults or unrelated scene rendering. The caller inventory finds only
three direct calls to the two blend-equation PLT entries in this pinned binary;
indirect calls are not ruled out by that inventory.

The importer checks and records the exact seven-row table and native identity.
Table SHA-256: `1c0282c137455fdc03d413a9ba966e1da51cd170b1f5ffa34beb6b8201dbf072`.
The shared renderer uses CustomBlending with equal component-wise factors.
Inverse-color factors use their mathematically equivalent alpha factors in the
separate-alpha API. ID 0 disables blending. Depth, culling and unsupported
primitive behavior are not changed by this block.

## Preserve alpha internally, present RGB opaquely

Rendering native alpha straight into a transparent browser canvas and drawing
it over the scene would apply alpha again to RGB that already contains the
background. The native mode therefore renders a preview effect pass into an
RGBA render target. Its alpha survives between draw calls. A final fullscreen
copy presents the stored RGB with alpha 1 to the 2D canvas. This does not force
intermediate particle alpha to 1.

The back/front preview phases still cross a 2D presentation boundary; their
alpha is not a single continuous native scene framebuffer. None of the seven
ported rows uses destination alpha as an RGB factor. Do not infer support for
future framebuffer-reading shaders, native depth effects or a complete original
render graph from this preview compositor. The existing transparent-intermediate
A/B option remains an explicitly non-native diagnostic.

## Global colorScale: verified default and write path

The previous default value RGBA 1 is now constructor-verified:

- Animation constructor loads four float ones and stores them at object +0x44
  (`0x15c1c30`).
- Draw copies object +0x44 to its pixel constant buffer +0x10 (`0x15c46dc` /
  `0x15c46e4`). That is the second constant, `colorScale`, in the native
  SetPixelShaderConstants table at 0x2551aa8.
- That table orders alphaTestParam, colorScale, fogColor, fogArea, invProjMat,
  specular, softParam, distDMapMid and projUnitRotZ. Four vector constants precede
  the matrix; total buffer size is 0xc0 bytes.
- `BishamonData::setAlpha` loads its Animation pointer from wrapper +0x460 and
  writes the supplied float to Animation +0x50 (`0x15bc7b0`), the alpha component
  of that same global colorScale vector.

Thus the parameter is not a per-particle alpha curve and its default is not a
guessed value. **Invocation values/timing and other caller writes are still
unobserved.** The preview retains default 1, records this boundary, and does not
invent global fade curves. Other global uniforms remain outside this milestone.

## Actual checks

`verifyNativeBlend` compares the real material configuration against direct GL
draws using the recovered glBlendEquation/glBlendFunc arguments. Its flat-color
reference isolates framebuffer state from texture/simulation questions. Raw GL
and Three geometry state are reset separately so the reference cannot overwrite
Three's cached VAOs.

Fifteen GPU checks cover all seven rows, alpha 0/1 for states 1/2, the normal
preset difference, the additive-preset match, opaque presentation with preserved
internal alpha, and a normal-then-additive stack within one effect pass.
For the stack the RGBA target retains alpha approximately 207/255 while the
presented canvas has alpha 255 and the expected RGB. Two byte values per channel
are allowed. Existing Basic/Add/Distortion and blend/model tests remain active.
All three browser candidates actually completed the 15 new framebuffer checks,
the 18 Basic/Add/Distortion checks and the existing 8 scene-blend /8 model-RGBA
checks each, ready true and approved false. Source/coverage and material audit
receipts refer to the final player revision in tools/data/native-blend.
The Climhazzard blend A/B switch was exercised off/on and restored to the native
candidate. The final screenshot is tools/data/native-blend/climhazzard-verified.png.

All 83 Node tests and 84 Python tests passed, zero skipped. The source/coverage
audit and material audit were regenerated. Thirty texture files and 20,117
active instance-frame samples passed the latter, with finite matrices/colors and
alpha in 0..1. Those samples audit evaluator consistency, not framebuffer alpha
or original-game fidelity; the separate GPU checks cover the new framebuffer path.

## Reproduce

Use the three preparation commands from the preceding Model/Basic block, retain
their native selection, source appearance, geometry and authoring arguments,
add `--native-blend`, and write `plan-native-blend.json` in each skill stage.
Then:

```powershell
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/brave-slash-composed/plan-native-blend.json --plan tools/data/shared-skill-review/blade-beam/plan-native-blend.json --plan tools/data/shared-skill-review/climhazzard/plan-native-blend.json --port 3135
node --test tools/test_native_blend.mjs
```

For the read-only static evidence, use the same pinned source and the existing
local Capstone dependency:

```powershell
$env:PYTHONPATH=(Resolve-Path tools/data/memorial-audit/python-deps).Path
python tools/memorial/inspect_native_calls.py --apk tools/data/memorial-audit/installed-base-v208.apk --function _ZN2ml4bmfw13RenderContext5BeginEv --function _ZNK2ml4bmfw9Animation4DrawEv --function _ZN2ml4bmfw23SetPixelShaderConstantsERNS0_14ShaderMetaData9ConstantsE --output tools/data/native-blend/state-evidence.json
python tools/memorial/inspect_native_calls.py --apk tools/data/memorial-audit/installed-base-v208.apk --range 0x15c6c94:0x900 --output tools/data/native-blend/egl-evidence.json
python tools/memorial/inspect_native_calls.py --apk tools/data/memorial-audit/installed-base-v208.apk --function _ZN2ml4bmfw9AnimationC1Ev --function _ZN12BishamonData8setAlphaEf --function _ZN12BishamonData6onDrawERKN7cocos2d4Mat4Ej --output tools/data/native-blend/global-evidence.json
python tools/memorial/inspect_native_calls.py --apk tools/data/memorial-audit/installed-base-v208.apk --caller-of glBlendEquation --caller-of glBlendEquationSeparate --output tools/data/native-blend/equation-callers.json
```

Explicit executable ranges are bounded to 16,384 bytes and labeled as ranges,
not inferred function boundaries. Direct B/BL inventories do not claim indirect
call coverage. All receipts and screenshots remain in ignored tools/data;
the new disassembly options do not execute or modify the APK.
