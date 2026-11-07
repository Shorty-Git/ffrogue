# Offline constant Particle generator scheduling

Follow-up: [initialized callback/PostUpdate reference](native-particle-phases.md)
now executes delayed starts and an optional real ConstX chain under controlled
parent helpers. The request-only boundary below remains available; it does not
describe the newer explicit initialized mode.

## Result (2026-10-25)

`tools/memorial/emulate_particle_scheduler.py` executes two bounded original
ARM64 functions to inspect generator activation and requested particle births.
No Android process, emulator control, new recording, preview change or runtime
publication is involved. This is a reusable simulation reference, not a renderer
completion claim or a replacement for the existing preview scheduler.

The reference uses `LocatorReference` to reject any APK/native identity other
than the pinned build:

- APK SHA256 `9d21fc8b61c9900eaacb1c2ddef2cabcad1e97d2dc720be16ac09b06fc0086b4`.
- Native SHA256 `6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77`.

| ParticleTraits function | Entry | Symbol bytes | SHA256 |
| --- | --- | --- | --- |
| ActivateGenerator | 0x1fee474 | 488 | 564ab3dd9c109686d002874a9e77d162616e834831803bf881f299955e47657e |
| Update | 0x1fefea4 | 1436 | 6e34a88fc5ae6dfcb1e3c298da29f38cd008b685fa11cf55c3d77f9fdfbf9eca |

The exact activation callback PLT address0x11328a0 is intercepted. Its emitter,
record and context arguments are checked; the requested count and temporary
context delta are recorded. Callback initialization, RNG consumption, capacity
rejection and child activation are deliberately not executed. Memory contains
one controlled live parent Joint and one generator slot. Instruction escape,
excessive requests or incomplete execution fail.

## Source-backed rules established in this boundary

For the constant generation branch (`Particle+0x208 == 0`):

1. Activation advances the emitter's four-word xorshift state even when the
   start range is zero. This is different from the preview's independent LCG.
2. With start S, range R and next random word W, delay is
   `max(0, S - R + (R ? W % (2*R) : 0))`. The upper modulo endpoint is excluded;
   clamping can concentrate values at zero. It is not `S + random(0..R)`.
3. Delay is stored as negative ticks at generator+0x28. Duration and interval
   use10000 ticks per source time unit. The controlled burst limit is
   `max(1, count * repeats * max(1, ceil(duration / interval)))` in the inspected
   nonoverflow fixtures. Interval is float32, converted to integer ticks.
4. `Update` truncates each supplied float32 delta into ticks. It can request
   several births within one update and temporarily sets context+8 to the
   within-update offset for each callback, then restores the original delta.
5. A birth exactly at the interval's end waits until the next positive update.
   Controlled duration4/interval0.5 requests offsets0..3.5, not4. A single
   delta5 and split deltas1/0.5/0.25 produce the same eight absolute requests.
6. Subtick deltas are not accumulated as continuous float time:200 deltas
   0.00005 produce no request, while one delta0.01 produces the initial request.
7. Duration, particle lifetime and generator restart delay are distinct. A
   controlled duration2/repeats2/restart1 fixture requests at0,1,3,4.
8. Disabled activation does not consume RNG. A suspended update does not request
   births, while the preceding enabled activation still consumed RNG.

These are outputs of original instructions under declared inputs. They do not
establish whether one time unit equals a displayed frame throughout the engine.
The partial reference's callback offsets are not final draw times.

## Source corpus and missing phase

The tool reads the existing eight BMB files in the three Cloud skill research
folders, without new asset searches or authoring supplements. All13 Particle
nodes select constant generation in this corpus. Inputs retain source hashes
and node indices. Eleven zero-start nodes execute controlled updates; the two
start2 nodes are activation-only fixtures. Blade Beam's aerialslash node10
(duration25/interval0.5) makes50 callback requests, last at step24 offset0.5.
Power Geyser's three Particle nodes can be inspected without BMSLN metadata.
These counts are requests under controlled conditions, not proof that all
particles are visible, supported or accepted by the original allocator.

`Update` reads negative delay but does not persist its advancement. Static
inspection finds the persistent write in `PostUpdate` at0x1fef784..0x1fef7a0:
delta is multiplied by10000, truncated and added to generator+0x28. The full
PostUpdate symbol is0x1fef2f8,1908 bytes and includes module callbacks and other
state. This reference does not execute it. Delayed update fixtures therefore
fail explicitly; zero count/duration/repeats and curve generation are also
outside this subset. The initial count0 fixture hit the bounded request guard;
zero-count behavior is not classified from a stubbed callback experiment.

Next gate: recover the shared Update/PostUpdate traversal and callback/Joint
time inputs, then join generator requests to actual initialization and its RNG
ownership. Do not insert synthetic delay advancement or feed the callback stub
outputs directly into the preview as if this were complete native scheduling.
Model, Quad, Null generators and nested emitters need their own verified paths.

## Reproduce and checks actually executed

```powershell
$env:PYTHONPATH=(Resolve-Path tools/data/native-locator-emulation/python-deps).Path
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' tools/memorial/emulate_particle_scheduler.py --apk tools/data/memorial-audit/installed-base-v208.apk --output tools/data/native-locator-emulation/particle-scheduling-fixtures.json
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -m unittest discover -s tools/memorial -p 'test_particle_*reference.py' -v
```

Executed13 controlled cases (33 callback requests),13 raw-source cases and31
passing tests, no skips. Ten tests cover the new scheduler; the existing21
module/writer/X tests still pass. No browser or game build was run because this
milestone changes only offline research tools and documentation.

Static inspection uses `inspect_native_calls.py` with the pinned APK and exact
symbols:

```text
_ZN2ml2bm19ParticleEmitterNodeINS0_14ParticleTraitsEE17ActivateGeneratorEPKNS0_5JointE
_ZN2ml2bm19ParticleEmitterNodeINS0_14ParticleTraitsEE6UpdateERNS0_13UpdateContextE
_ZN2ml2bm19ParticleEmitterNodeINS0_14ParticleTraitsEE10PostUpdateERNS0_13UpdateContextE
```

The Capstone dependency path is `tools/data/memorial-audit/python-deps`.
Receipts `particle-scheduling-static.json`, `particle-postupdate-static.json`
and `particle-scheduling-fixtures.json` remain under ignored
`tools/data/native-locator-emulation/`. Research output is always approved:false.
