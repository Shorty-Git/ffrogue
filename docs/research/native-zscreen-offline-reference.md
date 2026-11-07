# Offline native ZScreen reference and shared locator extension

Date: 2026-10-25. Research candidate, approved false. No new recording,
BlueStacks interaction, APK change, publication or skill reward change.
The user resumed remotely from a phone and needed no manual action.

## Result and scope

`--native-null-locator` extends the previous Null/Billboard subset with sampled
constant local Z roll and positive constant nonuniform scales. The native
ZScreen function ignores local X/Y rotation and applies inherited scale after
facing. Under the bounded identity-view conditions the implemented basis is:

```text
Rz(sampled local roll) * diagonal(local scale * inherited scale)
```

This differs from generic `parentScale * Rz * localScale` for a nonuniform
parent. The already-resolved position is retained. No character/skill-name
dispatch, correction angle, new texture or fitted offset is introduced.

| Skill | Earlier eligible Billboard controls | New eligible controls |
| --- | --- | --- |
| Brave Slash, composed | 1/1 | 1/1 |
| Blade Beam | 0/1 | 1/1 |
| Climhazzard | 0/2 | 2/2 |

Newly covered: blue slash node 9, purple blow node 8 and white strobe node 1.
The first two have rotation ranges and an ancestor scaled 1.2 on X; the strobe
has local X scale 1.5 and X tilt 25 degrees. These are ControlNull locators,
not Model billboards or final Particle facing/size. Those geometry limitations,
emission/untextured withholding and the 17 source-less Power Geyser controls
remain. The earlier narrow subset stays available for comparison.

## Source dispatch

Pinned native SHA:
`6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77`.
APK SHA:
`9d21fc8b61c9900eaacb1c2ddef2cabcad1e97d2dc720be16ac09b06fc0086b4`.

NullSetupper::AssignModule reads raw Null parameter +0x2b4. Kind 0 branches
at 0x1fc0ea4 to 0x1fc15b8 and unconditionally selects module index 3.
ModuleTable::UpdateModuleOf reads the table at 0x2d927d0. Its index-3 slot
is zero-filled on disk, with an AArch64 ABS64 relocation to
transform_locator::update::ZScreen at 0x1fc04b0, size 1412 bytes.
The catalog validates the relocation and function hash before preparation.
All four matched Billboard controls have raw kind 0. Other kinds are not
assigned guessed identities by this feature.

Function SHA:
`8788174e86964bd11e97f55521d4606fe86af3798cd8f5ac9e920b5802f8f20d`.
The existing compatibility gate remains: node V16 true, node V15 false,
root V16/V15 false. This does not establish a general compatibility mapping.

## Offline original-instruction reference

`tools/memorial/emulate_zscreen_locator.py` uses optional Unicorn 2.1.4 to
execute only the pinned function with controlled memory. No Android process,
APK entry point, full native renderer, JNI or game framework runs. Execution
is limited to 20,000 instructions and the function plus two explicit math hooks.
Unexpected code paths fail.

The fixtures supply identity view, rotation, local/inherited scales and an
already-resolved position. Original loads/stores and arithmetic execute from
the ARM64 bytes. External sinf/cosf use Python math rounded to float32; native
libc is not executed. The initial BSS zero for predication::constant_zero is
supplied through its resolved GOT location. These assumptions are in the
receipt; they are not observations of runtime caller state.

Sixteen cases cover roll 0, 37, 90, 137, 180, -45, -179 and 360 degrees with
two scale combinations, including nonuniform local/inherited scale. Nonzero
X/Y inputs remain to check their omission. The JavaScript basis agrees within
2e-5 per component and preserves position. This validates a controlled rule,
not random sampling, timing, every camera or complete native quaternion APIs.

Six existing fingerprint-verified ZScreen calls from the old observer18 direct
prefixes also agreed with zero residual for basis, quaternion, scale and
translation. Inputs use recorded local fields and inherited scale reconstructed
from the recorded positive diagonal inherited basis, with identity view. This
is agreement under explicit reconstruction assumptions, not full context-memory
replay or a new capture. Prefix audit SHA:
`d47a674b7da5fc13aab5e2b42452d6b51dc7a376eeca3b13a069a78072d2cd65`.
Do not reinstall observer18; its descendant-tail leakage remains excluded as
documented in [the recovery report](ancestor-locator-result.md).

## Gate and limits

The shared predicate requires exact native selector/hash metadata, matched
Billboard authoring, declared compatibility flags, Newton rotation/scale modes,
no geometry curves, sampled constant local rotation, positive constant scales
and unrotated matched Standard Null ancestors. Matrix/translation/rotation/scale
inheritance must use the supported On combination. Member wrappers need positive
scale and zero rotation.

Dynamic scales, moving roll, negative/zero scale, rotated ancestors, nonidentity
view orientation, other Null kinds, Model billboards and other compatibility
combinations remain unsupported. Random distribution, source-time convention,
general parenting and Particle display remain the evaluator's existing policies.
Only the compared basis/matrix is implemented; native quaternion conventions
are not exposed as a new general runtime quaternion API.

The new flag requires native selection and the existing `--null-locator`
metadata path. Source inheritance and the Null locator toggle must be active.
The new A/B switch returns to the earlier narrow subset when disabled.
Preparation/playback, coverage, material auditing, node inspection and particle-
locator auditing now pass the same native-mode flag.

## Checks actually executed

- 86 Node and 84 Python tests (71 pipeline +13 Memorial), zero skips locally.
  New tests check original-instruction fixtures, basis order and center in a
  prepared hierarchy, and unsupported variants/scales/ancestors/input shapes.
- The native tool actually executed 16 synthetic cases and compared the six
  existing samples above. Missing local receipts cause explicit skips on
  another PC, not invented native passes.
- All three browser candidates completed 6 Basic, 6 Add, 6 Distortion,
  15 framebuffer, 8 scene-blend and 8 model-RGBA GPU checks each.
- Blade Beam's new switch was exercised off/on at F12 and restored on. Saved
  screenshots differ; this is preview-path comparison, not original-game pixel
  validation.
- Fresh source/coverage and material receipts are in tools/data/native-null.
  Thirty textures and 20,117 active instance-frame samples retained finite
  matrices/colors and alpha 0..1. These are consistency checks, not timeline
  or whole-skill fidelity proof.

No game build was run for this tools-only block. Published game assets and
source game files were unchanged. Current research preview: port 3136.

## Reproduce

Unicorn is isolated in ignored research storage, not a game dependency. Use a
real Python executable instead of the Windows Store alias:

```powershell
python -m pip install --target tools/data/native-locator-emulation/python-deps unicorn==2.1.4
$env:PYTHONPATH=(Resolve-Path tools/data/native-locator-emulation/python-deps).Path
python tools/memorial/emulate_zscreen_locator.py --apk tools/data/memorial-audit/installed-base-v208.apk --live-prefix-audit tools/data/memorial-audit/diagnostic-v18-locator/direct-prefix-audit.json --output tools/data/native-locator-emulation/zscreen-fixtures.json
```

The live-prefix argument is optional when that audit is unavailable; that run
only establishes synthetic cases. Source hashes are checked before execution.
Preparation and playback do not require Unicorn.

Retain the three preparation commands/flags from the preceding native-blend
milestone, add `--native-null-locator`, and write `plan-native-null.json` in
each existing skill stage. Then:

```powershell
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/brave-slash-composed/plan-native-null.json --plan tools/data/shared-skill-review/blade-beam/plan-native-null.json --plan tools/data/shared-skill-review/climhazzard/plan-native-null.json --port 3136
node --test tools/test_native_zscreen.mjs
```

Pinned dispatch disassembly is reproducible with inspect_native_calls.py using
the mangled AssignModule/ModuleTable names in
tools/data/native-locator-emulation/null-dispatch-static.json. Raw receipts,
screenshots, plans and the optional dependency remain ignored. Durable findings
and commands are recorded here.
