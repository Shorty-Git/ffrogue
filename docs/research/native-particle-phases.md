# Offline Particle initialization and PostUpdate bridge

Follow-up: [original module assignment/profile](native-particle-assignment.md)
now recovers ordered module lists and native work sizes under an empty field
context. It does not yet execute those full lists in this phase harness.

## Implemented boundary (2026-10-25)

The `initialized` mode in `tools/memorial/emulate_particle_scheduler.py` extends
the [request-only reference](native-particle-scheduling.md). It executes the
original activation callback, PostUpdate and IsExpired after the existing
generator Update. Optional ConstX init/update modules execute through their real
parameter wrappers and delegates. This closes the delayed-start gap for the
controlled Particle constant-generator subset, not complete native traversal.

The default `requests` mode is retained. No preview/game code, published assets,
Android process or BlueStacks state changed; no new recording was needed.

The APK/native hashes remain those pinned in the preceding report. Additional
original function identities are:

| Role | Entry / symbol bytes | SHA256 |
| --- | --- | --- |
| CallbackActivatePrimitive | 0x1fefae4 /956 | 7c6f06e03290df30d582be6e658308ba4331a63f8f1934c8d6ec68bef2b5c8d3 |
| PostUpdate | 0x1fef2f8 /1908 | 74c32678a08ce972671aa3ede38fa1772c9f091d74ce4cba65c943f6b797a229 |
| IsExpired | 0x1fef234 /196 | 40e5e53e4ef709f626918fe791ec4ef128d148514e2e4d98c352e2c1e78f1a11 |
| ConstX parameter init wrapper | 0x2001fe8 /16 | 62453c5dc9d8dbfac4aaa71b991dcab47e57c4a8f468c1adc0ba581fada3fcd0 |
| ConstX vector argument wrapper | 0x1fc7660 /12 | b005c47ff8b5e5c852f79838da24aa64de76a522d57eee9fae3a325ccdb25626 |
| ConstX scalar init | 0x1fc75ec /116 | 2837ffa683474729aa24b67af725bb21ee4f9eaa7687b2e5114862acc166fa59 |
| ConstX update wrapper | 0x1fc7a54 /4 | b089fce2b222509c7ac4bcc8544a72ea3f937e64b5fbb912b7805110eb235a33 |
| ConstX scalar update | 0x1fc7a30 /36 | 0ac538d8d49491f41619160ff6fa3f27ef288d05ce4542ca33aa525fbada6370 |

## What runs and what is supplied

The callback PLT0x11328a0 is recorded and forwarded to the original function.
IsExpired PLT0x10e1060 likewise forwards to its original function. ConstX PLTs
0x10d8cd0 -> vector wrapper,0x111ff30 -> scalar initializer, and0x10de4f0 ->
scalar update are explicitly resolved from inspected symbols. Instruction escape
and incomplete execution fail. The initial attempted init resolution skipped
the vector wrapper and produced incorrect scale inputs; static inspection
identified that missing argument-load stage. The final chain and tests include it.

Three parent-transform function pointers use declared no-op fixtures. The init
callback already supplies neutral translation/scale defaults; no inherited
geometry is inferred from those fixtures. Synthetic stack-cookie/global pointers
allow non-rendering execution; they are not live engine values. The controlled
ring has1..128 slots, each with a separate module record. Other geometry, color,
rotation, UV, emission-shape and child modules are omitted. Only ConstX may be
selected in the optional module arrays; unknown requested modules fail.

The harness calls Update then PostUpdate. Static inspection of
`NodeTree::Update` (0x1fb8878/1332) shows a normal pass over callback-table slot0
then, when requested, slot8. `NodeTree::PostUpdate` (0x1fb8db4/304) dispatches
slot8 separately. Their first-update, zero-delta, catch-up and control branches
also exist. Those full NodeTree routines and their constructed callback tables
are not executed by this harness; the explicit two-call fixture must not be
advertised as recovered whole-engine traversal.

## Confirmed timing and RNG handoff

- PostUpdate persists negative generator delay advancement. With start2 and
  delta1, stored delay progresses-20000,-10000,0; the first request is in step2
  (zero-based). Update alone does not perform that persistent write.
- When a delta2.5 crosses start2, only the active0.5 remainder ages the new
  particle. The original context delta2.5 is restored afterward.
- The callback initializes particle age to the negative within-update offset.
  For interval0.5/delta1, ages before PostUpdate are0,-5000 and afterward
  10000,5000. This is not a second full-delta integration for every newborn.
- The callback consumes one emitter RNG word before its per-particle loop.
  Each particle then consumes a lifetime word, including at zero range. With
  lifetime L and range R, the controlled result is
  `max(1, L - R + (R ? nextWord % (2*R) : 0)) * 10000` ticks.
- ConstX module contexts point to that same emitter RNG. The parameter wrapper
  loads value/range from Particle+0x30c/+0x318, the vector wrapper loads scalar
  arguments, then the original scalar initializer consumes the next word.
- For an isolated two-particle burst with ConstX, init module entries see RNG
  after3 and5 advances from the fixture seed. Total consumption is6 advances:
  generator activation1, callback1, two lifetimes and two ConstX initializers.
  Reaching the finite burst limit exits before sampling a restart delay. The
  first test expectations incorrectly included that extra draw and were corrected
  after checking the Update finite-limit branch.
- ConstX PostUpdate uses the current stored scale and does not advance RNG.
  A lifetime1 particle remains at the exact boundary in the first delta1 step;
  IsExpired returns true after the following step in the isolated fixture.

These are controlled outputs of original instructions and independent expected
equations. They do not prove native wall-clock/frame conversion or final pixels.
Snapshot particle records can include expired or overwritten slots; they are not
a claim of current draw visibility or a complete allocator model.

## Source cases and reproduction

The existing eight BMB files produce13 initialized Particle cases,62 requests.
The two start2 nodes now execute rather than stopping at activation:
`atk_slash5_blue.bmb` node8 and `atk_blow1_purple.bmb` node7 both first request
in step2. Four source nodes select ConstX via the original selector16; their
source value/range feeds the real wrapper chain. Other module modes remain
omitted in this research fixture. Source generation, lifetime and hashes are
retained, without an authoring supplement or new dump search.

```powershell
$env:PYTHONPATH=(Resolve-Path tools/data/native-locator-emulation/python-deps).Path
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' tools/memorial/emulate_particle_scheduler.py --apk tools/data/memorial-audit/installed-base-v208.apk --output tools/data/native-locator-emulation/particle-scheduling-phases.json
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -m unittest discover -s tools/memorial -p 'test_particle_*reference.py' -v
```

Executed:13 retained request-only fixtures,9 new initialized fixtures,13 source
cases in each mode, and39 passing tests with no skips (8 new phase checks plus31
existing checks). Git whitespace check passes. No browser or full game build
was run for this offline-only change. The receipt remains ignored and approved:false.

Static receipts under `tools/data/native-locator-emulation/` retain callback,
NodeTree, generation-phase and ConstX wrapper/delegate inspection. Regenerate
with `inspect_native_calls.py`, pinned APK, and the exact mangled symbols in the
receipts; Capstone uses `tools/data/memorial-audit/python-deps`. Durable addresses,
hashes, active modes and reproduction commands are recorded above.

## Next bounded gate

Recover source-driven module-array construction and the parent/child callback
tables before promoting simulation into the shared preview. A complete module
list changes both record layout and RNG order; ConstX-only agreement does not
authorize copying these records into arbitrary nodes. Validate remaining
source-selected initialization/update modules and the relevant traversal branch
against this reference. Keep rendering materials/alpha and other generator
traits as separate capability gates. No per-skill timing correction is warranted.
