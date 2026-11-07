# Connected source-to-vertex effect export

Follow-up: [second complete textured source](connected-second-effect.md) now
uses the same path with original Default parent bases, constant alpha and actual
nonuniform Basic texture sampling. The white-only limit below records the first
milestone and is superseded within the newer explicit subset.

## Reviewable result (2026-10-25)

There is now one repeatable admitted complete-effect path, with its own playback
page. It connects the existing pieces instead of testing another independent
equation:

```text
raw BMB + verified texture + explicit host
  -> whole-source eligibility check
  -> native emission/lifetime and RNG handoff
  -> complete selected init/update/make module chains
  -> original source-selected vertex writer
  -> packed positions/RGBA/UV/tint exported as JSON
  -> browser display of that stream
```

The first input is `eff_strobe_white_a50_f30.bmb`, SHA256
`8ec831b855f1febdb7701a00fdb8c1c6784256e7cc3abdc98192e3de0903335f`.
All four nodes are inspected: three constant Null parents and one Particle.
The export contains32 states, including empty beginning/end,30 six-vertex
states and original packed alpha. At state15 the packed RGBA is255,255,255,124;
state30 alpha is0; state31 is expired and empty. No Cloud/skill ID, effect-name
branch, fitted geometry or manually adjusted effect constant appears in the
export path. The CLI selects a member explicitly, like other research tools.

**This is a bounded adapter-based result, not full original NodeTree execution.**
Original Particle module/writer code executes, while host placement and the
validated constant-parent chain are explicit adapters. It is not a completed
Cloud skill, arbitrary-resource renderer or general import approval.

## What is native and what is adapted

- `export_connected_effect.mjs` reuses the shared validated host placement math
  and checks source/texture hashes. Root center/scale remain declared host
  inputs, including the existing zero-scatter adaptation.
- `export_connected_effect.py` checks the complete BMB hierarchy. Only a linear
  Null chain followed by one Particle is admitted. All nodes must have zero-delay
  single-burst generation, deterministic constant parameters and compatible
  finite lifetimes. Unsupported branches, dynamics, random ranges, parent
  interpolation/alpha or other locators fail the export; nodes are not omitted.
- The original ZScreen locator computes that parent's scale. Axis-aligned
  Standard parent composition is a source-driven float32 adapter. This does not
  execute original Null emitters or their child dispatch tables. The fixture
  admits only zero-roll positive scales and constant parent transforms.
- The original Particle generator/callback/PostUpdate supplies the single birth,
  lifetime progression, expiration and RNG state after lifetime initialization.
  This RNG state feeds the complete selected initializer chain. The scheduler's
  neutral parent helper fixture remains explicit; admitted constant parents
  provide the separate geometry context.
- Original AssignModule, all admitted init/update/make functions, and the
  original writer selector execute from the pinned library. Make consumption28
  matches init/update28. The native work budget60 is allocated and guarded; its
  unconsumed32-byte reservation remains unexplained, without an inserted offset.

The source has an actual texture binding to
`lapis_eff_material_012_0053_white`, not an absent texture. Its128x128 PNG is
verified opaque white at every pixel, hash
`604579b0eb5f9746902bce701719bcebd2ffe22e4b601faef1799e2b3aff66cb`.
The first exploratory vertex call had omitted that binding and selected the
untextured writer. It was rejected as an end-to-end result and replaced by real
source-string binding. The final selector returns textured writer0x20016bc,
40-byte stride. Its executed892-byte code range hashes to
`d874e3aa9d76143c588fee179304e755156955ce0a0bf1b2738fe9ebe317cc3a`;
this is a bounded writer range, not an inferred symbol size.

Neutral Basic texture tint is required from the reviewed matching authoring
evidence in the prepared plan. The exporter retains that evidence and rejects
non-neutral/unverified tint or non-Basic shader selection. It initializes the
declared identity UV rectangle and neutral tint context, then runs original UV
make modules. All six native UVs and texture-tint attributes are exported.
Uniform white sampling is equivalent for this actual verified texture; it is
not a replacement asset. The display uses the corresponding color-only shader
equivalence and the actual native blend factors. The source blend selector2
must match the original table row `[1,770,1]`, checked against native bytes.
Other textures/materials fail instead of being silently flattened.

APK/native identities remain pinned to the preceding reports. No original app,
emulator interaction, new live recording or runtime publication occurred.

## Reproduction

```powershell
node tools/export_connected_effect.mjs --plan tools/data/shared-skill-review/climhazzard/plan-native-alpha.json --member 4 --host-reference tools/data/memorial-audit/pipeline-v23-20261025/effect-host-context.json --host-bindings tools/data/memorial-audit/pipeline-v23-20261025/declared-host-bindings.json --apk tools/data/memorial-audit/installed-base-v208.apk --python C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe --output tools/data/connected-effect/strobe.json
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/climhazzard/plan-native-alpha.json --port 3143 --connected-effect tools/data/connected-effect/strobe.json
```

Open `/connected-effect.html?frame=8`. The page reads exported vertex arrays
only; it does not invoke the experimental particle evaluator or regenerate
geometry/alpha. Play advances the exported states;60fps is a declared preview
clock, not proof of original wall-clock timing. The source host camera,
viewport/scissor and compositor are reused over a diagnostic checkerboard.

The ignored request/receipt are `tools/data/connected-effect/strobe-request.json`
and `strobe.json`; both retain explicit inputs and approved:false. New scripts
remain under tools/. Nothing was written into src/ or published game assets.
The new server is3143, exec session88450. Previous3142 remains independent.

## Actual acceptance checks

```powershell
$env:PYTHONPATH=(Resolve-Path tools/data/native-locator-emulation/python-deps).Path
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -m unittest discover -s tools/memorial -p test_connected_effect.py -v
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -m unittest discover -s tools/memorial -p 'test_particle_*reference.py' -q
node --test tools/test_native_scalar_alpha.mjs tools/test_effect_host_context.mjs tools/test_preview_host_view.mjs
```

- Six complete-effect acceptance tests pass: all source nodes, native packed
  stream, equal cursor consumption, lifetime end, byte-for-byte repeatability,
  declared host translation, stale-source/blend rejection and explicit rejection
  of a multi-Particle effect rather than omitting its other nodes.
- All54 preceding Particle reference tests and20 targeted Node tests pass,
  no skips. The latter includes parsing the new viewer module.
- Actual browser F8 shows six vertices/alpha112 and five passing host GPU checks;
  F31 shows zero vertices/alpha0. Screenshot `connected-f8.png` is retained in
  ignored tools/data/connected-effect/. Whitespace check passes. No full game
  build was run for this tools-only addition.

## Decision and next acceptance target

This proves that the available native CPU routines can produce a repeatable
renderable stream for one complete admitted effect under explicit adapters.
It does not yet prove a general original-renderer exporter. The next meaningful
acceptance target is a second source effect requiring a different module or a
nonuniform texture through this same export/display path, with no per-effect
constants. Expand only the input/resource capability that blocks that case.
If it requires individual geometry/timing corrections, stop and reassess the
backend instead of extending the isolated-preview tuning loop.
