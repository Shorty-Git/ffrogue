# Native-renderer export feasibility: bounded attempt result

2026-10-26 successor: [live game-loaded GPU mirroring](live-native-gpu-export.md)
produced isolated pink-impact pixels on three targets. It bypasses the failed
factory by observing a normally loaded battle effect. Single-state success does
not resolve automatic creation, sequence export or correct sprite composition.

2026-10-25 successor: the user reopened full reuse specifically for browser
deployment. See [the browser SDK audit](browser-original-renderer-feasibility.md).
It found primary evidence for a separately compiled BISHAMON WebGL SDK, while
matching SDK access/legacy compatibility remain unresolved. The failed Android
factory attempts below were not repeated and do not rule out that SDK route.

Evidence date: 2026-10-24. **Isolated native effect loading was not established;
zero PNGs were exported. Stop this milestone here.** This does not establish
that native export is impossible. It establishes that the reviewed entry paths
in this prototype did not provide a usable exporter without further investigation.

## Scope and source

This implements the bounded experiment from the
[backend decision](renderer-backend-decision.md). It uses only FFBE Trace,
Tiramisu64_2 / emulator-5574 / port 5575, with root disabled. The main emulator
instance was not an installation target.

Source APK SHA-256:
`9d21fc8b61c9900eaacb1c2ddef2cabcad1e97d2dc720be16ac09b06fc0086b4`.
ARM64 library SHA-256:
`6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77`.
The community script remains an exact prefix. Preparation checks every other
non-signature APK entry for equality. Signed updates used the same diagnostic
certificate, passed v1/v2/v3 and alignment checks, and were installed without
uninstalling or clearing app data.

## What was built

`tools/memorial/native_export_probe.js` is an experimental in-app adapter, not a
game importer. It accepts a bounded JSON request for two explicitly reviewed
effect filenames, at most five ascending frames up to 90, and one or two repeats.
The intended common path uses native effect creation, manual animation stepping,
Cocos RenderTexture, native image readback and PNG writing. Planned transparent,
black and white backgrounds were intended to test subsequent compositing.

The reviewed native factory strips `.bmb` before constructing its CreateParam.
The direct-parameter path reproduces its observed 32-byte initialization. The
second path calls `BishamonDataList::addAnime` with a native-constructed libc++
string instead of reproducing that parameter. These are explicit request modes,
not a silent fallback. The adapter would unschedule/detach its own node and
retain/release native objects. An explicit orthographic export camera is restored
after each attempted output step. These code paths beyond failed creation are
not validated by the existence of the prototype.

`prepare_diagnostic.py --mode observe` remains the default observation build.
`--mode native-export` appends only the export adapter, without the older observer.
This separation is necessary: revision 16's combined diagnostic hit a fingerprint
mismatch on the factory already instrumented by the old observer. That attempt
was blocked before the factory test; it is not evidence of a native loading
failure. No fingerprint guard was bypassed. Standalone revision 17 passed its
startup fingerprints and emitted `native-export-ready`.

## Actual attempts and gate result

| Attempt | Path | Effect | Actual outcome |
| --- | --- | --- | --- |
| Revision 15 smoke | Direct reviewed CreateParam | Pink impact | Null animation node; failed manifest, zero outputs |
| Revision 15 loaded-state retry | Same direct path | Pink impact | Same null-node result |
| Revision 16 | Combined observers | Not executed | Fingerprint guard stopped startup |
| Revision 17 standalone | Game factory | Pink impact | Null animation node; failed manifest, zero outputs |
| Revision 17 control | Same game factory | Green aerial slash | Same null-node result |

The game-factory requests used the same implementation and one requested frame
(F18). The second effect was attempted as a loading control; this is not a
successful second-effect render test. Requests/failed manifests/runtime logs are
ignored under `tools/data/native-export-feasibility/`.

The render-thread hook ran, and the native RenderTexture call returned an object.
That is not proof that its framebuffer, pixels or transparency work. Loading
failed before animation stepping or image readback. The prepared internal
DrawNode/CreateAnimation stage hooks did not produce observations that locate
the failure within the factory. Possible resource setup, invocation context or
ABI issues remain unclassified. Do not claim a confirmed missing resource,
unsupported native SDK, working offscreen renderer or impossible native export.

| Acceptance gate | Result |
| --- | --- |
| Automatically instantiate isolated effect | Not established: reviewed calls returned null |
| Controlled stepping / repeatable frames | Not tested after loading failure |
| Usable transparent / layered export | Not tested; zero PNG files |
| Repeat same rendering mechanism on second effect | Loading attempted; rendering not established |

An initial host-created staging-directory ownership issue prevented reading a
request. Access was corrected only for the generated child directory under the
app's existing private external-files parent; its original mode 2770 was restored
afterward. This was separate from the subsequent confirmed null-node results.
Computer Use inspected the FFBE Trace window to distinguish a loaded game scene
from a startup-state assumption; no battle skill was manually triggered for this
prototype and no account/security setting was changed through the UI.

## Cleanup and current emulator state

The export request was replaced with an invalid empty request to prevent replay.
The device inventory confirmed zero `.png` files in the export staging directory.
The previously validated revision-14 signed APK was restored with `pm install -r`.
Its installed SHA-256 again matches
`9ae842eb89f442a845965d6199ec51707436edaf14aa4d1e05ce224a38f71557`.
Startup reported observer revision 14, calibration-pass and ready with 27 hooks.
The old observation arm is idle. Export experiments are not active in the restored
build. Host APKs, signatures, keys, raw logs and request receipts remain ignored.

## Reproduction and checks executed

Do not install the prototype into another instance. Reproduction requires the
same source APK, resources and explicitly selected Trace clone, using the
existing signing workflow and reviewing the new signed artifact first.

```powershell
& $env:FFROGUE_PYTHON tools/memorial/prepare_diagnostic.py --apk tools/data/memorial-audit/installed-base-v208.apk --output tools/data/memorial-audit/<new-review-directory> --mode native-export
node --check tools/data/memorial-audit/<new-review-directory>/native-export-expanded.js
node --test tools/memorial/test_native_export_probe.mjs tools/memorial/test_particle_observer.mjs
& $env:FFROGUE_PYTHON -m unittest discover -s tools/memorial -p test_particle_trace.py
git diff --check
```

The preparation/syntax commands ran using actual directories diagnostic-v15,
diagnostic-v16 and diagnostic-v17; the final isolated mode is v17. A separate
`diagnostic-observe-mode-check` build verified the default mode. APK suffix checks
confirmed that each mode contains only its intended diagnostic addition and
preserves the exact community prefix. Six Node tests and five Python tests passed.
Device package hashes, startup logs, failed manifests, no-output inventory and
rollback were checked. No successful native animation creation, stepped frame,
GLSL compilation, compositing comparison or game build was performed.

## Decision after the stop boundary

Do not append another native context/ABI reverse-engineering task to this failed
feasibility milestone. Native reuse has not demonstrated a time-saving export
path here. Retain the source inventories, alpha samples and generated-vertex
evidence as reference for the existing shared renderer.

The recommended next implementation is a deliberately limited, reviewed renderer
capability subset with an explicit import gate: support named source modes only,
test common primitive behavior across affected fixtures and unchanged controls,
and reject or report unsupported effects. The measured Particle geometry is a
candidate for that work, not authorization for a universal size/facing correction.
Character body import and supported skill recipes remain reusable. Complete FFBE
effect coverage is still open; neither backend has been shown to provide it.
