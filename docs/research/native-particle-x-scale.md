# Native Particle X-scale chains

2026-10-25. Follow-up to [source dispatch and the Joint bridge](native-particle-source-dispatch.md).
No new capture, BlueStacks action, playback patch or asset publication.

## Result

The optional ARM64 reference now exercises OneX, ConstX and VelocityX consumers,
the scalar Const/Velocity initializers and the scalar Velocity updater. It runs
36 controlled fixtures and 11 source-parameter cases from the existing corpus.
The targeted suite has 26 passing methods (20 native references and 6 dispatch),
zero skips. The original preview and its eligibility gates remain unchanged.

All eleven X-selected nodes now have an executable scale reference, including
two Power Geyser particles without an authoring supplement. This is scale-chain
coverage under explicit inputs, not complete rendering of those eleven nodes.
Other geometry modules, their rotations, emission, camera, real group scale,
native time deltas and global RNG ownership are not replayed by these cases.

## Recovered consumer rules

Let `g` be the first float of the supplied Joint/group vector and `s` the current
scalar value in the particle record:

| Consumer | Local scale written to +0xbc/+0xc0/+0xc4 | Group factors written to +0xc8/+0xcc/+0xd0 | Record bytes consumed |
| --- | --- | --- | --- |
| OneX | [1,1,1] | [g,g,g] | 0 |
| ConstX | [s,s,s] | [g,g,g] | 4 |
| VelocityX | [s,s,s] | [g,g,g] | 8 |

**Both** the local scalar and group X are replicated. Group Y/Z are ignored by
these consumers, even for nonuniform vectors. Replacing this with ordinary
component-wise inherited scale is not the native equation. This also differs
from the previously inspected non-X Const consumer, which copies all three
group components independently.

The observed writer consumes local/group X/Y products. Under identity view and
zero roll, these X variants therefore produce half-width and half-height equal
to `s*g` (or `g` for OneX). Texture dimensions are not multiplied in again.
The common writer still handles supplied roll through its recovered draw-basis
equation; these scale tests do not recover other modules' roll production.

## Initialization and update

Scalar Const init samples one range using the recovered native RNG and clamps
the resulting size to zero. Scalar Velocity init samples size and speed using
two successive RNG draws, clamps initial size, and stores `[size, speed]`.
Zero ranges still consume those draws. OneX has no init callback in the inspected
index-15 path and consumes no scale RNG values in this isolated reference.

For the scalar Velocity updater:

```text
size = max(0, size + speed * delta)
record = [size, speed]
UpdateContext scale = [size, size, size]
record cursor advances by 8 bytes
```

`delta` is read from UpdateContext+0x40. The original instruction uses float32
fused multiply-add. Tests compare with a separately computed equation within
0.00001 on these fixtures. They check per-step clamping and that the make-vertex
consumer does not integrate the value a second time. Delta units, substeps,
birth catch-up and full traversal scheduling remain outside this experiment.

## Source dispatch and parameter bridge

The binary dispatch reader now also resolves scale init/update tables:

| Stage | Table address | Selection source |
| --- | --- | --- |
| init | 0x2d94cc0 | same raw Particle +0x12c index |
| update | 0x2d94790 | same raw Particle +0x12c index |
| make | 0x2d92f40 | same raw Particle +0x12c index |

The init/update tables are reached in AssignModule through GOT slots
`0x2e11bb0` and `0x2e129a0`; their symbols declare 232 bytes each. Relocations
resolve to Particle-specific parameter wrappers rather than guessed consumers.

Index 16 selects `InitConstX` at `0x2001fe8`; index 17 selects `InitVelocityX`
at `0x2001ff8`. These wrappers read value, range, speed and speed-range vectors
from Particle offsets `0x30c`, `0x318`, `0x324`, `0x330`. The following X adapters
load only each vector's first float, then tail-call the scalar functions below.
Index 17's update adapter at `0x1fc7a9c` tail-calls the scalar Velocity updater.
Index 15's init slot is null. The 36 fixtures execute the scalar functions
directly; the wrapper links above are statically inspected, not a full emulated
AssignModule/traversal run.

`source_cases()` requires exact make-consumer identity for indices 15/16/17,
reads these raw parameters through the checked IBMB layout and executes each
selected scale chain with explicit seed, group `[1.775,1.775,1.775]` and, for
VelocityX, update deltas `[0.25,0.5]`. Those deltas are controlled values, not
timestamps recovered from the game. Rotation and all other selected modules
are deliberately outside these isolated source-scale cases.

## Pinned original code

APK/native hashes are checked against the preceding reports' exact build.
Every call is confined to its declared symbol range with an instruction limit.
The final geometry uses the already pinned writer reference and its documented
float32-rounded sin/cos stubs. Original libc/game entry points are not executed.

| Function | Address | Bytes | SHA-256 |
| --- | --- | --- | --- |
| make OneX | 0x1fc213c | 40 | 549644baf3d7082741d320b6184e226f1b37d009bd46cac9321fc2b90971dfbe |
| make ConstX | 0x1fc21b8 | 56 | 1ded555d2f7d221b0a0e972c054489cd29e3d0b7a3339ea55d4de6832b493624 |
| make VelocityX | 0x1fc2248 | 60 | 04686a98ac56eaeb5bf1161cfd6f1f00590dfdca144b1d1578b4521f4e8d9545 |
| scalar init Const | 0x1fc75ec | 116 | 2837ffa683474729aa24b67af725bb21ee4f9eaa7687b2e5114862acc166fa59 |
| scalar init Velocity | 0x1fc766c | 168 | af8867f3bd3375bc4a19af8ab61d8429b11d31700adfe94e5e8ed9fb944a0eb7 |
| scalar update Velocity | 0x1fc7a58 | 68 | 6804f16e3f7185e26e2518b8288a1405c55befb3e083d54166384075085823e8 |

## Reproduction and checks actually executed

```powershell
$effectFiles = Get-ChildItem tools/data/shared-skill-review/brave-slash-composed/originals,tools/data/shared-skill-review/blade-beam/originals,tools/data/shared-skill-review/climhazzard/originals -Filter *.bmb
$xArgs = @('tools/memorial/emulate_particle_x.py','--apk','tools/data/memorial-audit/installed-base-v208.apk','--output','tools/data/native-locator-emulation/particle-x-fixtures.json')
foreach ($effectFile in $effectFiles) { $xArgs += @('--effect',$effectFile.FullName) }
$env:PYTHONPATH=(Resolve-Path tools/data/native-locator-emulation/python-deps).Path
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' @xArgs
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -m unittest discover -s tools/memorial -p 'test_particle_*reference.py' -v
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -m unittest discover -s tools -p test_native_particle_dispatch.py -v
```

Executed: 36 synthetic chains and 11 raw-source cases; 26 targeted tests pass.
Tests cover source-less X inputs, stage selection, record sizes, initialization,
RNG consumption, ignored group Y/Z, per-step clamp and no second integration.
The updated source dispatch inventory was regenerated (8 effects / 13 Particle
nodes). Receipts/source hashes remain ignored; tools and this report are tracked.
No browser review or game build was run for these research-only tools changes.

For static reproduction use `inspect_native_calls.py` with functions under
`ml::bm::module::scaling::make_vertex::{OneX,ConstX,VelocityX}`, the corresponding
`scaling_x::{init::Const,init::Velocity,update::Velocity}` functions and the
Particle `InitConstX`/`InitVelocityX` parameter wrappers. Exact mangled symbols
and instruction receipts are retained under ignored
`tools/data/native-locator-emulation/particle-x-*.json`; use the documented
Capstone dependency directory, separate from optional Unicorn.

## Next bounded gate

Carry the source-selected X equation into a shared, opt-in geometry path only
where the group-vector producer and sampled local scale are supported. Do not
silently replace the preview's simulation with fixture deltas or RNG seeds.
OneX/ConstX and VelocityX need separate eligibility decisions; resolving their
consumer equations does not resolve arbitrary time, inheritance or emission.
