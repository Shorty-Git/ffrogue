# Constant Particle module dataflow reference

2026-10-25. Follow-up to the [offline buffer-writer reference](native-particle-writer-offline-reference.md).
Only existing local native/source files were used. No new capture, BlueStacks
interaction, preview change or publication.

## What is now established

The optional offline reference now executes original constant scale/rotation
initializers, their make-vertex modules, constant translation consumption, and
the previously verified buffer writer. Sixteen controlled end-to-end fixtures
and six new test methods pass. Together with the six preceding writer tests,
the targeted Particle reference suite has twelve passing methods.

This closes the local constant-data bridge between an initialized Particle
record and the writer's roll/scale inputs. It does not close the producer of
the supplied group vector, dispatch for arbitrary nodes, or whole-game simulation.

| Stage | Recovered behavior | Still outside the reference |
| --- | --- | --- |
| Constant rotation init | Sample three ranges, convert degrees to radians, store local XYZ in the record | Which module is selected for every node; actual game RNG seed/call schedule |
| Constant scale init | Sample three ranges, clamp each result to zero, store XYZ | Other scale modes, curves and compatibility paths |
| Make rotation | Copy local record XYZ to context +0xb0/+0xb4/+0xb8 | Other modules may affect context in other dispatch paths |
| Make scale | Copy record XYZ to +0xbc/+0xc0/+0xc4 and the vector pointed to by +0x58 to +0xc8/+0xcc/+0xd0 | How the caller produces that group vector across arbitrary hierarchies |
| Const translation | Advance the record cursor by 12 bytes; do not add translation to the center again | Center simulation and generation shapes |
| Observed single-texture writer | Use local Z roll only; multiply X/Y record scale by X/Y group vector; build view-facing six vertices | Other writer variants and general draw-basis provenance |

In the inspected traversal at `0x2021718`, the center comes from the existing
particle slot before the modules run. Context `+0x58` points to the start of
the group record obtained through the emitter's group list. The context is
reset per particle. This is distinct from reading Euler angles from a composed
world transform. Controlled local X/Y changes leave this writer's geometry
unchanged when local Z, scale and basis are fixed.

The existing node34 observation has no rotation callback. The fixture chain
with a rotation callback is deliberately controlled and must not be described
as its recorded dispatch. An omitted rotation module retains the traversal's
zero-initialized roll; selecting modules remains a separate gate.

## Initialization and random state

Both Const initializers draw three successive values from their supplied
four-word state, including when every range is zero. The recovered recurrence
is the 32-bit xorshift sequence:

```text
t = (a XOR (a << 11)) modulo 2^32
w = d XOR (d >> 19) XOR t XOR (t >> 8)
state = [b, c, d, w]
u = float32_bits(0x3f800000 OR (w >> 9)) - 1
sample = initial - range + 2 * range * u
rotation record = sample * native float32 degrees-to-radians constant
scale record = max(sample, 0)
```

Native arithmetic includes float32 operations and fused multiply-add. Independent
tests compare within 0.00005 for the selected init fixtures, not bitwise equality
with Python double arithmetic. Native output is retained in the receipt.
The reference executes scale init followed by rotation init from an explicit
four-word seed; six random values are consumed. Actual native call ordering and
shared-stream ownership are not inferred from this chosen fixture order.
Do not replace the player's random scheduling on this evidence alone.

The earlier writer comparison used scale 1.775 and half extents 360/320 as
reconstructed inputs. The writer multiplies these factors, so that comparison
could not identify their roles. The module dataflow now separates record scale
from the group vector: the prepared pink node34 source scale is 360/320/1;
the matching example uses a supplied group vector of 1.775 in each axis.
The native caller's producer of this vector remains to be traced. Neither the
old agreement nor the new controlled fixture is a full context-memory replay.

## Source identity

The reference rejects any APK/native hash differing from the pinned build in
the preceding report. No original game entry point or Android process runs.
Each call has a bounded original symbol range; escaped execution or an
instruction-limit exit fails. The make-vertex result feeds the writer reference
as explicit computed inputs, not through a simulated complete engine traversal.

| Symbol role | Address | Bytes | SHA-256 |
| --- | --- | --- | --- |
| scaling::init::Const | 0x1fc5f68 | 252 | 88fbab486ef4f1c28f7e4e4ca7479092118dbb5e0f75e82b9a90f85f32a7a24f |
| rotation::init::Const | 0x1fc5694 | 252 | 8de42b29d12c64f8e7a57e7e916111ff80352cbf33517539a70050aab77b94fe |
| scaling::make_vertex::Const | 0x1fc2164 | 84 | d74dd972964de8d2ec1ad894ab232e058c564eb6accad2b742f42e695ff6a2ac |
| rotation::make_vertex::Const | 0x1fc2060 | 56 | 484853a98927c994a0fadf78af6c079f25145bf26ba41b692cba26c9949339cb |
| translation::make_vertex::Const | 0x1fc2020 | 16 | 7c6b322b858b40a8cc778c7ff234d4941b226a6f90c32e2b437f79ac7462e667 |

Velocity/AccelVelocity rotation make-vertex functions were also statically
inspected: they copy the current record XYZ with 24/36-byte cursor advances.
Their initialization/update/time semantics were not emulated or added to support.

## Reproduction and actual checks

```powershell
$env:PYTHONPATH=(Resolve-Path tools/data/native-locator-emulation/python-deps).Path
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' tools/memorial/emulate_particle_modules.py --apk tools/data/memorial-audit/installed-base-v208.apk --output tools/data/native-locator-emulation/particle-module-fixtures.json
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -m unittest discover -s tools/memorial -p 'test_particle_*reference.py' -v
```

Optional Unicorn remains in ignored research dependencies; no game or normal
preparation dependency was added. New tracked tools are the emulator above and
`tools/memorial/test_particle_modules_reference.py`. Generated receipts and
static inspection outputs remain in ignored `tools/data/native-locator-emulation`.

Actually executed: sixteen module-chain cases, the new independent initializer/
RNG/cursor/geometry tests and the preceding writer reference tests. No browser
review or game build was run because playback and game code are unchanged.

The static receipts can be regenerated with `inspect_native_calls.py` and the
pinned APK, selecting these exact mangled symbols:

```text
_ZN2ml2bm6module8rotation4init5ConstERNS1_11InitContextERKNS_4vec3ES8_
_ZN2ml2bm6module7scaling4init5ConstERNS1_11InitContextERKNS_4vec3ES8_
_ZN2ml2bm16ParticleSetupper12AssignModuleERNS0_6module11ModuleArrayERNS2_13AssignContextERKNS0_3bmb5param8ParticleE
_ZN2ml2bm6module8rotation11make_vertex5ConstERNS1_17MakeVertexContextE
_ZN2ml2bm6module7scaling11make_vertex5ConstERNS1_17MakeVertexContextE
_ZN2ml2bm6module11translation11make_vertex5ConstERNS1_17MakeVertexContextE
```

Use `--range 0x2021718:0x800` only as a bounded traversal inspection; it includes
the beginning of the next routine and is not a symbol boundary. Capstone needs
the separate ignored dependency directory documented in the preceding report.

## Next bounded gate

Trace the group vector's writer and source dispatch for constant Particle
scale/rotation. The current evidence establishes the consumer, not full
inheritance. No new recording is required to start this static investigation.
Keep arbitrary member rotations, camera state, additional geometry modules,
source-less controls and time/random scheduling explicitly unresolved. Only
after dispatch and inputs are established should the shared preview gates expand.
