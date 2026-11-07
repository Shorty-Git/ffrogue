# Original Particle module-chain assignment

Follow-up: [opt-in complete init/update chain probes](native-particle-chains.md)
execute a gated subset with explicit scalar alpha relocation and preserve the
unresolved difference between profile budget and actual record consumption.

## Result (2026-10-25)

`tools/memorial/emulate_particle_assignment.py` executes original module
assignment, module counting and work-size profiling on existing raw Particle
parameter blocks. It produces ordered native function identities for init,
update and make-vertex. This extends the preceding
[isolated phase reference](native-particle-phases.md); the selected functions
are not executed by the new tool or promoted into preview support.

All13 Particle nodes in the existing eight-effect Cloud corpus resolve with an
explicit empty field context. Across these nodes the arrays contain67 init,
67 update and95 make-vertex entries (references, not distinct functions).
Original module counts match the actual arrays for every node. Reported native
work sizes range60..100 bytes. This is not yet a verified allocator stride or
per-module record-offset map.

No Android process, emulator control, recording, new asset search, browser test,
game build or runtime publication was needed. The ordinary preview is unchanged.

## Original identity and execution boundary

APK/native identity is checked by `LocatorReference`, using the same hashes as
[the scheduling report](native-particle-scheduling.md). The additional functions:

| Function | Entry / bytes | SHA256 |
| --- | --- | --- |
| ParticleSetupper::AssignModule | 0x2003b10 /4548 | ce72085ae68d63d474a03438d970d4673aad424caac8e0cb87ca71920a0b7006 |
| ParticleSetupper::GetModuleCount | 0x20031ac /2096 | d9e605aa123cc221b9c0d4e0ea62fdee9e538515878de5a20a2b0868cc029f47 |
| ParticleSetupper::GetModuleWorkSize | 0x20039e0 /304 | f7171f14b534af21c1412cd98c18dedf98aa722f8bf745ab585fff9336c3bd15 |

The harness loads allocated sections of the pinned ELF and resolves defined
ABS64/GLOB_DAT/JUMP_SLOT and RELATIVE relocations. Original PLT stubs and module
getter functions run. A synthetic stack guard supports non-rendering execution;
unresolved external functions are not given generic success/no-op substitutes.
Instruction execution is restricted to the three listed routines, module-table
getters, field-assignment/profile helpers and PLT. Unexpected execution or
incomplete calls fail. Tests confirm no selected module callback executes.

Three64-entry output arrays are preallocated. Native non-null assignment outputs
are read contiguously; holes or unknown function identities fail. A separate
original GetModuleCount call must agree with the first three array lengths.
Its fourth count is retained without assigning it a capability meaning (zero
throughout this corpus). Work-size output is retained separately.

The AssignContext has an explicitly empty field list. Original field helpers
execute that empty branch; actual parent/child fields are not reconstructed.
The raw Particle parameter bytes drive the remaining selectors. This makes the
result independent of BMSLN authoring, but does not prove arbitrary enum values,
other traits, arbitrary effect formats or field-dependent arrays are supported.

## Concrete findings and controls

| Source / node | Init / update / make entries | Work bytes |
| --- | --- | --- |
| atk_impact_001_pink /8 | 7 /7 /9 | 92 |
| atk_impact_001_pink /24 | 5 /5 /7 | 88 |
| atk_impact_001_pink /34 | 4 /4 /6 | 72 |
| atk_slash1_white /8 | 4 /4 /6 | 76 |
| atk_aerialslash_001_green /10 | 9 /8 /10 | 100 |
| atk_slash5_blue /8 | 5 /5 /7 | 80 |
| atk_blow1_purple /3 | 4 /4 /6 | 68 |
| atk_blow1_purple /4 | 4 /4 /6 | 68 |
| atk_blow1_purple /7 | 6 /6 /8 | 80 |
| atk_powergeyser_001_purple /15 | 4 /4 /6 | 72 |
| atk_powergeyser_001_purple /20 | 6 /6 /9 | 88 |
| atk_powergeyser_001_purple /29 | 6 /6 /9 | 88 |
| eff_strobe_white_a50_f30 /3 | 3 /4 /6 | 60 |

All scale/rotation entries match the independently inspected relocation tables
in `native_particle_dispatch.py`, including null selections. Strobe OneX has no
scale initializer, but does have a One update and OneX make callback. Therefore
init/update/make lists must not be assumed to have matching positions or lengths.

The aerialslash surface-emitter init order starts with parent coordinates,
model-surface generation, ConstX scale, then velocity translation. Its known
surface-emission support gap is retained; selection does not make it playable.

Power Geyser20/29 select alpha-blend Mod only in make-vertex, after alpha and
before final color. Their init/update lists omit that callback. Selection is
now obtained from binary/native inputs without an authoring supplement; the
full alpha operand producers and final pixel result are not established here.

A controlled change of only strobe's scale selector from OneX to ConstX adds
one init entry and4 native work bytes (60->64), with update/make counts unchanged.
This independently confirms a record-size consequence already expected from
the scalar ConstX reference. It does not locate every module's byte range.

## Reproduction and checks executed

```powershell
$env:PYTHONPATH=(Resolve-Path tools/data/native-locator-emulation/python-deps).Path
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' tools/memorial/emulate_particle_assignment.py --apk tools/data/memorial-audit/installed-base-v208.apk --output tools/data/native-locator-emulation/particle-module-assignment.json
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -m unittest discover -s tools/memorial -p 'test_particle_*reference.py' -q
```

Actual result:48 passing tests, no skips (9 new assignment checks and39 preceding
references). Checks cover the13 source nodes, count/assignment agreement,
independent scale/rotation tables, representative ordering, binary-only alpha
selection, no callback execution, repeatability, work-size delta and malformed
parameter rejection. A bytearray input incompatibility in Unicorn was found by
the mutation test and corrected by converting the validated block to bytes.
Git whitespace check passes.

The ignored JSON receipt retains source hashes/node indices, ordered symbols,
addresses, executed helper identities, counts and work sizes; approved:false.
Static profiling receipt is
`tools/data/native-locator-emulation/particle-module-profile-static.json`.
Regenerate with `inspect_native_calls.py`, the pinned APK and the exact symbols:

```text
_ZN2ml2bm16ParticleSetupper12AssignModuleERNS0_6module11ModuleArrayERNS2_13AssignContextERKNS0_3bmb5param8ParticleE
_ZN2ml2bm16ParticleSetupper14GetModuleCountERA4_jRNS0_6module13AssignContextERKNS0_3bmb5param8ParticleE
_ZN2ml2bm16ParticleSetupper17GetModuleWorkSizeERNS0_6module13AssignContextERKNS0_3bmb5param8ParticleE
```

## Next gate

Use these explicit selected lists to drive bounded init/update chains with
correct relocated curve/resource inputs and measured record cursors, comparing
their consumed bytes with the native profile. Do not execute raw relative
curve/resource offsets as pointers or retain the previous ConstX-only record
layout for larger chains. Field-dependent lists and actual parent/child context
construction remain separate missing inputs. A selected callback needs its
dataflow/geometry/material capability before the skill can be promoted.
