# Scoped native Particle callback capture

Evidence date: 2026-10-24. Diagnostic observer revision 13, installed only in
`FFBE Trace` / `Tiramisu64_2` / `emulator-5574`, port 5575, root disabled.
This is a bounded live follow-up to [the native material inventory](native-particle-material-evidence.md).

## Installation and capture provenance

The source APK and native library remain pinned to the hashes in the inventory.
`prepare_diagnostic.py` preserves the community script prefix and verifies that
only `assets/frida_script.js` changes, excluding removed signature entries.
The revision-13 APK passed JavaScript syntax, zipalign and v1/v2/v3 signature
verification, and was installed with `pm install -r --abi arm64-v8a` using the
existing diagnostic certificate. No uninstall or data clearing occurred.
Installed APK SHA-256 matched the signed host file:
`b5da1e3a8be06fb3900748501895f790405d272dad4fbfa31254e1dad737ad0e`.
Startup reported revision 13, calibration-pass and ready with 27 fixed hooks.

The user prepared and executed Brave Slash. Capture token:
`white-particle-20261024-152443`. The arm requested only
`atk_impact_001_pink` with `particleNode: true`. The trace includes a command
source with skill ID 214800. Other battle actions occurred in the same window;
they do not become evidence for this Particle. The background log recorder was
stopped after collection. All APKs, keys and raw receipts remain ignored.

## What was actually observed

The observer reads cached selection state from a Particle object only inside
a named wrapper update/draw scope. It requires the expected filename, an IBMB
version header at `parameter - 42128`, and exact node-header, lifetime and material
byte windows matching node 34. Those windows were independently checked against
the staged effect: they uniquely match Particle node 34 among its Particle nodes.

One native object produced eight state samples; six had a positive live count.
There were 36 scoped module-call records, six calls for each selected callback.
No `particle-node-unreadable` event occurred.

| Observed selection | Native relative address |
| --- | --- |
| Vertex-maker entry | `0x2021718` |
| Vertex-buffer writer | `0x20016bc` |
| scaling::make_vertex::Const | `0x1fc2164` |
| translation::make_vertex::Const | `0x1fc2020` |
| texture 1 UV identity module | `0x1fcc0b4` |
| texture 2 UV identity module | `0x1fcc0bc` |
| alpha::make_vertex::Const | `0x1fc2474` |
| color1::make_vertex::Const | `0x1fc24d8` |

Callbacks are matched to exact-build relative addresses and code fingerprints
before attaching a scoped observer. The summary distinguishes cached selection
from recorded execution. The texture-2 UV callback being present is not evidence
that a second texture is bound. No alpha_blend callback appears in this selected
list; this agrees with the zero-rate case, but does not prove nonzero inheritance
or a complete compatibility equation.

## Two material limits remain

The complete in-memory BMB hash is
`97acf8995832d2b44a8cd1aec15c34acf2d0d658ec25dfd3687425896e374485`,
which differs from the staged raw-file hash
`89c3cb5e7c16df69bf8d1c538622afdd42e30942240141a8147dd55da4de690f`.
Filename/offset/window attribution is confirmed, **not complete source equality**.
Pointer fixups are a possible explanation, not verified by this capture. A raw
memory/file comparison is still required before declaring every field identical.

Revision 13 attempted to store a pointer in Frida's reserved InvocationContext
`context` property. The scoped call records exist, but the extra alpha fields
are absent. The source now uses `vertexContextPointer` and reports revision 14.
This correction passed a local regression using a read-only CPU context and
mutable vertex-memory values. **Revision 14 is not installed or live-validated
by this milestone.** No alpha samples may be inferred from the revision-13 log.
The follow-up device log query did not recover a corresponding JavaScript error
line; the code defect and local reproduction explain the missing fields without
claiming an error stack was captured on-device.

Further static inspection of the observed `alpha::make_vertex::Const` shows that
it copies one float-sized work-buffer word into context offset `0x164`, advancing
the work cursor by four bytes. Its name does **not** establish that the source
alpha curve is dormant: the work-buffer value may have been computed earlier.
Do not replace Curve with Constant based on this callback name. The selected
buffer writer was inspected in a bounded address range, but its pointer types
and full geometry equation remain unverified; no billboard/size patch was made.

Raw draw-data bytes were retained as uninterpreted bytes. They do not identify
a shader permutation, GPU program or active blend state. The white rectangle
and published game assets remain unchanged.

## Reproduction and checks

```powershell
& $env:FFROGUE_PYTHON tools/memorial/summarize_particle_trace.py --log tools/data/memorial-audit/diagnostic-v13/particle-capture-log.txt --token white-particle-20261024-152443 --output tools/data/particle-native-audit/live-node34-summary.json
node --test tools/memorial/test_particle_observer.mjs
& $env:FFROGUE_PYTHON -m unittest discover -s tools/memorial -p test_particle_trace.py
node --check tools/memorial/observer.js
git diff --check
```

All commands above ran. Three callback regression tests and four summary tests
passed. The summary requires pinned boot provenance, calibration, one matching
arm token, an enabled Particle capture, a bounded session window and consistent
fingerprinted selection/call joins. It retains missing alpha/shader evidence and
false full-source equality explicitly. Installed hash, preparation, startup,
arm, capture and installation receipts are under `diagnostic-v13/`.

The next bounded measurement should combine revision 14's corrected alpha read
with a source-memory comparison and verified buffer-writer/shader binding fields.
Do not spend another manual execution merely to repeat these already captured
callback names. Native source equality and material selection must stay separate
from eventual shared renderer implementation and visual approval.
