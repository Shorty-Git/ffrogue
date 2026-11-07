# Particle source dispatch and Joint-scale bridge

2026-10-25. Follow-up to [constant module dataflow](native-particle-module-dataflow.md).
No new recording, emulator interaction, playback patch or published asset change.

## Result

`tools/native_particle_dispatch.py` resolves initial scale/rotation make-vertex
module pointers directly from original IBMB fields and pinned native relocation
tables. It needs neither Unicorn nor a matching BMSLN. All 13 Particle nodes in
the existing eight-effect corpus have resolved selections, including the three
Power Geyser particles with no authoring supplement. This is pointer-selection
coverage, not complete simulation or rendering support.

The supplied vector consumed by scaling::make_vertex is now connected statically
to a `Joint` pointer. For the inspected Null PostUpdate producer, Joint scale is
copied from the locator's computed scale. A controlled native ZScreen-to-Particle
test exercises those compatible outputs/inputs, without claiming a complete
native traversal or real-game RNG/time replay.

## Exact source selection

Pinned APK/native identities are unchanged from the preceding reports. The new
reader verifies both before reading ELF sections, symbols and relocations.
`ParticleSetupper::AssignModule`, address `0x2003b10`, size 4548, loads:

| Role | Raw Particle field | Transfer | Make-vertex selector call |
| --- | --- | --- | --- |
| scale | +0x12c | loaded at 0x2003b48, kept in s9 | 0x200479c |
| rotation | +0x128 | loaded at 0x2003b58, kept in s10 | 0x20047cc |

The selector functions at `0x1fc368c` (scale) and `0x1fc3678` (rotation) perform
indexed pointer loads from `0x2d92f40` and `0x2d92ed0` respectively. The reader
inspects bounded windows of indices 0..28 and 0..13. It does not claim the native
function checks these bounds, or assign meanings to indices beyond the windows.
Target slots use verified `R_AARCH64_ABS64` (257) relocations with zero addends.
Resolved function address, name, size and SHA-256 are retained for each target.
A zero slot with no relocation is an absent callback; an uninspected index is
explicitly unresolved, never silently replaced by an absent/default module.

The source fields select functions, not authoring labels. Several distinct
indices share a Const make-vertex consumer while their initialization/update
rules can differ. Do not treat all such indices as constant-time simulation.

## Current source corpus

| Effect | Particle nodes | Scale selection | Rotation selection |
| --- | --- | --- | --- |
| atk_impact_001_pink | 8 / 24 / 34 | 17 VelocityX / 16 ConstX / 2 Const | absent / 1 Const / absent |
| atk_slash1_white | 8 | 17 VelocityX | absent |
| atk_aerialslash_001_green | 10 | 16 ConstX | absent |
| atk_slash5_blue | 8 | 17 VelocityX | absent |
| atk_blow1_purple | 3 / 4 / 7 | 17 VelocityX each | absent each |
| atk_powergeyser_001_purple | 15 / 20 / 29 | 2 Const / 16 ConstX / 16 ConstX | absent each |
| eff_strobe_white_a50_f30 | 3 | 15 OneX | absent |
| atk_slash7_side_purple | none | no Particle node | no Particle node |

Eleven of thirteen particles select X variants: six VelocityX, four ConstX,
one OneX. These are the next common consumers to exercise offline. The previous
Const reference cannot automatically be substituted for them.

Pink node34's source selection (scale 2 -> `0x1fc2164`, rotation 0 -> absent)
agrees with the existing revision-14 callback observation. This is the concrete
source/runtime cross-check; the other twelve selections are static initial
selections and were not newly observed at runtime.

## Joint dataflow

The inspected named emitter function establishes the argument type:
`ParticleEmitterNode<ParticleTraits>::ActivateGenerator(const Joint*)`,
entry `0x1fee474`, size 488. Its store at `0x1fee550` writes the supplied Joint
pointer into group slot `+0x20`.

The observed traversal `0x2021718` obtains that group slot through the emitter's
group list. At `0x20218c8` it loads the pointer from slot +0x20; at `0x2021948`
it stores it in MakeVertexContext+0x58. The scaling consumer reads the first
three floats from this pointer into context +0xc8/+0xcc/+0xd0. Consequently the
writer's two extent factors come from Joint scale, separately from its local
record scale. No texture dimensions or guessed world Euler decomposition enter
this consumer path.

For the inspected `NullEmitterNode::PostUpdate` producer:

```text
0x1fbe2d4..0x1fbe2f8:
    UpdateContext scale +0xe8/+0xec/+0xf0 -> Joint +0/+4/+8
0x1fbe670..0x1fbe694:
    second update branch performs the same scale copy
```

These copies follow execution of the selected update modules. The preceding
ZScreen reference establishes one bounded way of computing those scale values.
The bridge test feeds its result to the constant Particle consumer and writer,
checks the expected nonuniform extents, and shows that changing parent roll
changes the parent basis without changing these scale-vector inputs.

This does not establish every possible Joint producer or lifetime. Initial
Joint creation, root/member transforms, other parent primitives and compatibility
paths still require their own tracing. The test does not execute ActivateGenerator
or the complete Null PostUpdate function, nor prove that no other selected
make-vertex module affects geometry in an arbitrary effect.

## Reproduction and actual checks

```powershell
$effectFiles = Get-ChildItem tools/data/shared-skill-review/brave-slash-composed/originals,tools/data/shared-skill-review/blade-beam/originals,tools/data/shared-skill-review/climhazzard/originals -Filter *.bmb
$dispatchArgs = @('tools/native_particle_dispatch.py','--apk','tools/data/memorial-audit/installed-base-v208.apk','--output','tools/data/native-locator-emulation/source-particle-dispatch.json')
foreach ($effectFile in $effectFiles) { $dispatchArgs += @('--effect',$effectFile.FullName) }
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' @dispatchArgs
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -m unittest discover -s tools -p test_native_particle_dispatch.py -v
$env:PYTHONPATH=(Resolve-Path tools/data/native-locator-emulation/python-deps).Path
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -m unittest discover -s tools/memorial -p 'test_particle_*reference.py' -v
```

Executed: inventory of eight original effects / thirteen particles; five new
dispatch tests and thirteen native reference tests, all passing, zero skipped.
The new dispatch tests check unresolved vs absent states, Const target hashes,
nonnull relocation identities, the observed pink control and source-less Power
Geyser pointer selection. No browser/game build was run for these tools-only changes.

Receipts contain source hashes and stay ignored. Static disassembly can be
regenerated with `tools/memorial/inspect_native_calls.py`, the pinned APK, and:

```text
_ZN2ml2bm6module7scaling11ModuleTable18MakeVertexModuleOfEj
_ZN2ml2bm6module8rotation11ModuleTable18MakeVertexModuleOfEj
_ZN2ml2bm16ParticleSetupper12AssignModuleERNS0_6module11ModuleArrayERNS2_13AssignContextERKNS0_3bmb5param8ParticleE
_ZN2ml2bm19ParticleEmitterNodeINS0_14ParticleTraitsEE17ActivateGeneratorEPKNS0_5JointE
_ZN2ml2bm15NullEmitterNode10PostUpdateERNS0_13UpdateContextE
```

Use the separate Capstone dependency directory for static inspection. The
optional Unicorn dependency is only for executing the native reference tests.

Next bounded block: execute the source-selected OneX/ConstX/VelocityX consumers,
then recover their initialization/update semantics as needed. Preserve the
distinction between a resolved module, a tested consumer and supported playback.
