# Ordered Particle init/update chains and scalar alpha relocation

Follow-up: [native scalar alpha modes/helper](native-scalar-alpha.md) verifies
576 original outputs and provides a separate shared evaluator. Active preview
plans and the work-reservation question remain unchanged.

## Implemented boundary (2026-10-25)

The explicit `--probe-chains` option in `emulate_particle_assignment.py` now
executes the complete selected init and update lists for a bounded input subset.
It retains [original assignment/profile](native-particle-assignment.md), but
allows original module functions and Curve routines to execute under a checked
native symbol-range gate. No make-vertex, render, emitter callback or NodeTree
traversal is executed in this standalone chain probe.

Eleven of the13 source Particle nodes qualify. The other two return an explicit
blocked result: impact node8 first needs unreviewed translation AddValueCurve
inputs; aerialslash node10 first needs parent-coordinate inputs (and also has
the previously known model-surface resource requirement). No module is silently
removed from an executed init/update list. Only constant/resource-free motion,
UV, tint and the decoded scalar alpha-curve subset is admitted. This is not a
general binary loader or an arbitrary-module execution guarantee.

APK/native identities and assignment/profile function hashes remain pinned as
documented in the preceding report. No preview/game code, public asset,
BlueStacks state or live capture changed. No browser or full game build ran.

## Explicit relocation and controlled inputs

The source inspector validates scalar alpha keys using their original20-byte
layout. The probe copies those bytes into its declared memory region, preserving
key types, times, values and both stored tangents. Particle+0x220 retains key
count, while its pointer at+0x228 is replaced with the mapped key address.
This field is independently established by the original Alpha InitCurve and
UpdateCurve parameter wrappers (0x20025ec/12 and0x2002af4/12). Raw relative
offsets are never passed as pointers for this curve. Empty decoded curves are
explicitly represented as count0; missing or malformed payloads fail.

Other resource/curve inputs remain gated out. The fixture uses one declared
parameter pointer, separate module record and four-word RNG, empty field context,
normalized ages0,0.25,0.5,0.75,1 and delta1 per update. These are controlled
module inputs, not the source's actual birth ages or scheduler deltas. Curves
are not resampled or converted into invented key formats.

Each original init module runs in selected order with a shared record cursor.
Before each complete update list, the cursor resets to0; its final consumption
must equal that complete initializer's consumption. A guard after the native
work-size budget must remain unchanged. Original module functions execute via
the pinned relocated ELF and original PLT, without reimplementing their math.
The default assignment-only mode retains its previous execution restriction.

## Work-profile comparison: unresolved reservation, no offset patch

All eleven qualifying chains execute without exceeding the native budget and
their update consumption matches init consumption. However, the original
GetModuleWorkSize value is **not** equal to the observed cursor:

- Ten chains leave32 bytes of the reported budget unconsumed.
- Blow node7 leaves20 bytes unconsumed (60 consumed,80 reported).
- The strobe's three initializers advance12,16,28 bytes, against60 reported.

The receipt preserves reported size, actual cursor and unconsumed difference.
It labels the profile as an upper bound with unresolved reservation. No fixed
32-byte header, corrected pointer or universal stride is inferred. Allocation
and make-vertex consumers must explain these differences before a record layout
is promoted. The difference does not authorize skipping selected modules.

## Native scalar Spline finding

The strobe source alpha has Spline keys at0,0.5,1. Executing the original update
produces alpha values0,0.427806765,0.487500012,0.226530299,0 at the five fixture
ages. The existing JS scalar evaluator multiplies tangents by interval length;
that equation disagrees at the two midpoints.

Two-key synthetic controls using the same original chain isolate the rule:

1. Key intervals0..0.5 and0..1 give the same midpoint result when their values
   and stored tangents are held constant. There is no interval-length multiplier
   in this tested native scalar Spline branch.
2. Setting the earlier key's first stored tangent to2 and the later key's second
   stored tangent to-1 gives midpoint0.875 for values0->1. Setting the opposite
   stored tangent fields instead gives0.5.

For this branch, the observed equation is the cubic Hermite basis with the
earlier key's float at+4 and later key's float at+8, without multiplying either
by the key interval. The inspector currently calls those fields slopeLeft and
slopeRight, while JS selects the opposite pair. Do not globally rename fields
or change every curve family from this bounded scalar result. Vector curves,
BreakSpline, compatibility modes and other active interpolation branches still
need their own checks. The strobe's original left/right tangent pairs are equal;
only the asymmetric synthetic controls distinguish their selection.

The original initializer/update chain provides a differential reference for a
future shared curve fix. No skill-specific alpha factor or visual adjustment
was introduced, and the JS evaluator has not been silently changed.

## Reproduction and actual checks

```powershell
$env:PYTHONPATH=(Resolve-Path tools/data/native-locator-emulation/python-deps).Path
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' tools/memorial/emulate_particle_assignment.py --apk tools/data/memorial-audit/installed-base-v208.apk --probe-chains --output tools/data/native-locator-emulation/particle-module-chains.json
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -m unittest discover -s tools/memorial -p 'test_particle_*reference.py' -q
```

Actual result:54 tests pass, no skips (6 new chain checks +48 existing). They
check11 executed/2 blocked cases, matching init/update cursors, retained native
budget differences, original-source alpha, asymmetric tangent/interval controls,
and malformed/missing relocation inputs. The first exact-size assertion failed
and was replaced by an explicit budget comparison with the mismatch retained.
The first asymmetric-tangent expectation also failed; the opposite-field
control established the narrower native rule recorded above. No passing claim
rests on either original assumption.

Ignored receipt `particle-module-chains.json` retains source hashes, node IDs,
selected arrays, per-module init cursors, five update records, active probe mode,
blockers and approved:false. The optional mode's executed-helper list includes
the selected callbacks actually executed. Static wrapper receipt:
`tools/data/native-locator-emulation/alpha-curve-wrappers-static.json`.
All generated research data remains under ignored tools/data; whitespace check
passes. No runtime capability or reviewed effect is published.

Next bounded work: validate scalar interpolation modes against these native
controls and inspect allocation/make consumers of the work reservation. Preserve
separate blockers for vector/resource relocation and parent/child construction.
