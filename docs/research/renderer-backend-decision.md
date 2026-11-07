# Renderer backend decision after the combined Particle measurement

Decision date: 2026-10-24. **Prioritize one bounded native-renderer export
feasibility milestone.** Keep the current local renderer as the comparison tool.
**Subsequent result:** the [bounded attempt](native-export-feasibility.md) did not
establish isolated loading for either tested effect and produced zero PNGs. It
has stopped; the recommendation is now the bounded shared-renderer subset
described there. The rationale and acceptance criteria below record the decision
before that attempt, not current exporter support.
Do not extend the own-renderer path with more individual skill corrections or
replace published game effects on the basis of this measurement.

## Why this decision now

The user authorized completing the prepared measurement and then deciding
between more shared renderer work and direct original-renderer reuse. The
revision-14 capture closes the observer alpha defect and provides source memory
plus actual native CPU vertices for the previously attributed white Particle.
It is useful general pipeline evidence, but not a complete import implementation.

There is now a measured geometry mismatch rather than a missing-artwork problem.
The checked numeric inputs survive loading unchanged, while the native writer
produces a different primitive from the current transformed unit XY plane.
Reconstructing all roll, hierarchy, compatibility, emission, shader-selection and
blend variants still requires substantial work. One measured writer under an
identity draw basis is insufficient to turn a two-times-size adjustment or
billboard equation into universal Particle support.

Native reuse could avoid reimplementing those CPU/GPU rules together. It is
still **unproven** that this build can instantiate isolated effects automatically,
step them repeatably, render to an export target and retain useful compositing.
This decision authorizes a feasibility check, not a backend migration or a claim
that direct native export works.

## Combined capture: actual results

Clone only: FFBE Trace / Tiramisu64_2 / emulator-5574 / port 5575, root disabled.
Revision 14 was installed as an update using the existing diagnostic certificate.
The signed APK passed syntax, alignment and v1/v2/v3 signature checks, matched the
installed hash, and reported calibration-pass / ready with 27 fixed hooks.
Installed APK SHA-256:
`9ae842eb89f442a845965d6199ec51707436edaf14aa4d1e05ce224a38f71557`.

Capture token: `particle-decision-20261024-154201`. The user prepared and executed
Brave Slash. The bounded window contains eight source-node states, 36 callback
calls, six valid vertex-output samples and six alpha samples. No node/vertex
unreadable event occurred. The log recorder was stopped after collection.

### Source identity and memory differences

All 131 chunks were reconstructed into exactly 50,144 bytes and checked against
the captured SHA-256:
`eacfd060f3503a3de537f88d3af0ac2e6fed0382af167b4e0a9b4ae9f581a398`.
The original hash remains
`89c3cb5e7c16df69bf8d1c538622afdd42e30942240141a8147dd55da4de690f`.

There are 6,772 changed bytes in 772 spans. All 35 nodes have byte/value-equivalent
decoded static vectors, UV pivots, decoded motion modes and scalar alpha keys.
The white node's lifetime and checked material bytes also match. The header flags
change from `0x41` to `0x141`: static inspection of the pinned native
`bmb::Initialize` shows it sets bit 0 of header byte 9; `IsInitializedData` checks
that bit. The initializer also maps resource/parameter pointers and invokes child
mapping. That explains why full byte equality cannot be assumed for loaded BMBs.
The entire set of 6,772 changes has **not** been semantically normalized or proven
to be only relocations. The analysis retains 150 aligned in-buffer-pointer
candidates as candidates, not verified relocations. No decoder ignores arbitrary
differences and no missing field receives a fallback.

### Alpha and geometry

Actual alpha values after the observed alpha work-buffer module, and at the
selected vertex writer, agree sample by sample:

```text
0.4039907455, 0.4996474981, 0.4157207906,
0.2469189912, 0.0807514787, 0.0004302192
```

This is an animated fade, not constant opacity. The original scalar keys remain
unchanged. Native emitter age was not captured, so this does not establish exact
time alignment or approve the preview's interpolation implementation.

The pinned writer at `0x20016bc` produced six vertices with stride 40 in each
sample. Positions read from the native buffer match the recorded raw bytes. All
six samples have these bounds:

| Axis | Minimum | Maximum |
| --- | ---: | ---: |
| X | -451 | 827 |
| Y | 289.875 | 1425.875 |
| Z | 0 | 0 |

The sampled draw basis is identity. The nearest preceding renderer state for
this sole observed pink wrapper has root `(188, 636, 0)` and global scale
`1.774999976158142`. Native width/height are 1278 / 1136, exactly consistent with
twice the source local scale 360 / 320 times that global multiplier. Its center
is `(188, 857.875, 0)`. This is observed CPU output, before shader processing.

For a coordinate-normalized control, the **current evaluator** at effect F5 was
evaluated using the same measured root and multiplier and its existing unit XY
plane. Its width/height are approximately 639 / 514.783, with nonzero Z extent
and a different Y center because of inherited rotation. This comparison is
recorded in `current-node34-geometry-control.json`; it does not authorize
changing all effect scale values or source placement fields.

The measured native rectangle extends beyond the captured logical viewport.
Its original appearance therefore depends on native geometry, placement and
clipping together. A unit-plane rectangle visible inside the adapted research
arena is not sufficient evidence to remove the white source layer. Shader
permutation, GPU blend state, nonidentity basis/roll rules and other writer
variants remain unverified. No game or preview rendering was changed here.

## Native-export feasibility: acceptance and stopping boundary

The next milestone should attempt exactly this reusable path:

1. Resolve and instantiate a named staged original effect inside the existing
   native runtime without manually issuing a battle skill for every export.
2. Step a bounded sequence and produce reproducible frame outputs with declared
   seed/time/camera/anchor behavior. Missing deterministic controls stay explicit.
3. Export a usable result with transparency and declared blend/layer behavior.
   Background-dependent distortion must retain its dependency or be declared
   unsupported; an opaque screenshot is not a successful exporter.
4. Repeat the same mechanism on a second distinct effect, such as Blade Beam's
   green wave, without a new per-effect execution implementation.

Keep raw native resources and exported research receipts ignored. Do not alter
the main emulator instance. Do not create a game publication bridge until the
feasibility output and its support limits have been reviewed.

Stop the milestone with an explicit result if isolated playback, stepping or
usable export cannot be established with available entry points. Record the
specific blocker and compare a deliberately limited supported own-renderer
subset against the cost of deeper native work. Do not keep adding capture rounds
without a named question, or assume either approach will cover every FFBE skill.

## Reproduction and checks actually executed

Later result: the [native-export feasibility attempt](native-export-feasibility.md)
did not establish isolated loading. The bounded successor is the opt-in
[Particle display subset](particle-geometry-subset.md); it reproduces measured
extents but does not solve native center/projection or general Particle semantics.
The checks below describe this earlier measurement revision only.

```powershell
$env:PYTHONPATH = (Resolve-Path tools/data/memorial-audit/python-deps).Path
& $env:FFROGUE_PYTHON tools/memorial/inspect_native_calls.py --apk tools/data/memorial-audit/installed-base-v208.apk --function _ZN2ml2bm3bmb10InitializeEPv --function _ZN2ml2bm3bmb17IsInitializedDataEPKv --output tools/data/particle-native-audit/bmb-runtime-initialize.json
& $env:FFROGUE_PYTHON tools/memorial/summarize_particle_trace.py --log tools/data/memorial-audit/diagnostic-v14/particle-capture-log.txt --token particle-decision-20261024-154201 --output tools/data/particle-native-audit/combined-node34-summary.json
& $env:FFROGUE_PYTHON tools/memorial/analyze_particle_memory.py --summary tools/data/particle-native-audit/combined-node34-summary.json --source tools/data/shared-skill-review/brave-slash-composed/originals/atk_impact_001_pink.bmb --plan tools/data/shared-skill-review/brave-slash-composed/plan-model-vertex-rgba.json --output tools/data/particle-native-audit/combined-node34-analysis.json
node --test tools/memorial/test_particle_observer.mjs
& $env:FFROGUE_PYTHON -m unittest discover -s tools/memorial -p test_particle_trace.py
git diff --check
```

The capture and both analysis commands completed on the actual inputs. Four Node
regressions and five Python tests passed; they cover reserved-context safety,
bounded vertex reads, fingerprint handling, session/callback provenance and
missing/duplicate/tampered memory chunks. Preparation preserves all non-script,
non-signature APK entries. No game build, native export prototype, shader
compilation, new renderer equation or original-fidelity approval was performed.
