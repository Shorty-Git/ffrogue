# Bounded native pipeline context observer

## Revision22 live result: current checkpoint

Token `pipeline-v22-clim-20261025-a` passes the exact-build calibrated audit with
25 completed scopes/25 callback returns and no unreadable, unavailable or
ambiguous events. The source-selected VelocityX update wrapper and reviewed
implementation are now observed successfully. Its captured initializer and six
consecutive updates replay through the unchanged original ARM64 reference using
the measured initial RNG state, raw parameters `[30,0,-2,0]` and each actual
delta. Record bytes and UpdateContext scale match exactly at all six steps;
RNG state is unchanged during each update. Size values are
27.5715599060,25.5884399414,23.6676006317,21.7483215332,19.7539215088,17.7848415375.
No time step or random seed was fitted. This validates one observed contiguous
source-derived VelocityX prefix, not universal emitter scheduling or RNG seeding.

The blow effect has six actual GPU draws with exact camera/root joins. The
strobe still has sampled make/update contexts but no observed GL draw within
its own wrapper scope; that gap remains open. The measured category2 placement
rectangle640x666 is an upstream engine input, not proof of a strobe GL clip.
No masking, resizing or per-skill adjustment was applied.

Runtime identity: revision22, calibration `[1.25,-2.5,3.75]`, ready32, installed
APK SHA256 independently read back as
`eaaf30f5a6748a002a449427f0f4d7ca09540223a3bc48aa7e973e4979e9947d`.
Only FFBE Trace was operated. After capture, the user was told control had
ended; Final Fantasy Resonance received no input. No further capture is needed
to review this bounded result.

Receipt: ignored `pipeline-v22-20261025/clim-log.txt`, `complete-log.txt`,
`clim-audit.json` under tools/data/memorial-audit. Reproduce with the audit command
below, substituting the22 paths/token/spec and both source BMBs:

```powershell
$env:PYTHONPATH='tools/data/native-locator-emulation/python-deps'
& '<bundled-python>' tools/memorial/audit_pipeline_context.py --log tools/data/memorial-audit/pipeline-v22-20261025/clim-log.txt --token pipeline-v22-clim-20261025-a --spec tools/data/memorial-audit/diagnostic-v22-pipeline/pipeline-spec.json --source tools/data/shared-skill-review/climhazzard/originals/atk_blow1_purple.bmb --source tools/data/shared-skill-review/climhazzard/originals/eff_strobe_white_a50_f30.bmb --replay-x tools/data/memorial-audit/installed-base-v208.apk --output tools/data/memorial-audit/pipeline-v22-20261025/clim-audit.json
```

Latest checks:19 Node observer tests,8 context/delegate/trajectory guard tests,
8 native X-reference tests and6 dispatch tests pass (41 total, no skips).
The two trajectory guards distinguish a missing/disjoint prefix from an exact
native replay and reject a contiguous prefix with wrong output. Those guard
fixtures do not claim native arithmetic validation; the local original-code
reference and actual capture provide that separate evidence. No full game build
was run for this diagnostic-only milestone.

Next work: retain source-selected init/update/make identity in shared simulation;
separately resolve native time-base/birth traversal and strobe draw submission/
material visibility. Do not infer whole-skill fidelity or publish these research
effects from the successful scalar prefix alone.

## Live follow-up: revisions21 and22

Revision21 was installed only in FFBE Trace via same-key install-r and passed
startup calibration. Brave token `pipeline-v21-brave-20261025-a` captures30
completed sample scopes and47 callback returns with no unreadable/unavailable
events. All six distinct actual GPU draws have exactly one camera/root snapshot
with matching file, wrapper and draw ID. ConstX's selected wrapper0x1fc7a54 and
observed implementation0x1fc7a30 are retained separately in six successful update
observations. The five randomized source/RNG initializer replays still match.
Thus revision20's early-snapshot and ConstX attachment gaps are live-verified.

Climhazzard token `pipeline-v21-clim-20261025-a` captures19 scopes/19 returns.
Its one VelocityX initializer replays bit-exactly from raw source `[30,0,-2,0]`
and measured RNG-before, including RNG-after. Its selected update wrapper at
0x1fc7a9c cannot be intercepted; no live dynamic-update claim is made from this
revision. Six blow-effect GL draws have exact context joins. **No actual GL draw
was observed inside the strobe wrapper scope**, despite six sampled OneX make
calls. Do not assign the blow's clip state to the strobe or assert batching,
instancing or invisibility as the cause. Native string inventory contains only
glDrawArrays/glDrawElements; strobe draw submission/material filtering remains
unresolved. Static onDraw calls DrawBegin -> Animation::Draw -> DrawEnd.

### Original screen-effect input

The executed Climhazzard group5002080, category2, receives rectangle
`[0,0,640,666]`, and its joined factory creates the white strobe. This is the
engine placement rectangle, **not** a recovered GL scissor. Source member is
`1:5002110:99999999:2:2:2:0:150` with scale100%. The API records position
`[314,482]`, wrapper scale1, wait3 and layer2. Center anchoring to the captured
rectangle gives `[320,483]` before the allowed per-axis random scatter; observed
offsets[-6,-1] fall within the statically inspected scatter bounds. No random
sequence or endpoint convention for that host scatter is proved here.

The captured make context center is `[314,839.875,0]`, local scale `[1,1,1]`,
group scale `[488.125,488.125,488.125]`. This agrees numerically with
`1100 - 482 + 125*1.775` and `275*1.775`;1100 is the measured engine screen
height, distinct from the camera's logical1136. The first six renderer-state
snapshots were still before effective initialization, so zero roots from them
must not replace these measured later context values.

This replaces the assumption that original screen effects necessarily use the
whole canvas. The host must supply its explicit placement/battle rectangle;
neither640x666 nor the current preview full-host adaptation is a universal
hardcoded rule. No preview change is made in this measurement milestone.

### Revision22 continuation

Static pinned ELF evidence resolves the VelocityX wrapper's four bytes
`b131c517`, SHA256
`4e3f25b75e582b74eacaf9542444b4e37afd1528dc05e5aea23b267552b79830`,
through PLT0x1114160/GOT0x2df4b58, JUMP_SLOT1026, to
`ml::bm::module::scaling_x::update::Velocity` at0x1fc7a58,68 bytes. This is the
same original body already exercised by the bounded offline X reference.
The preparator now verifies both reviewed forwarding ABIs; other addresses are
not implicitly forwarded. Six context/delegate tests pass after this change.

Revision22 was built, syntax-checked, aligned and signed; v1/v2/v3 verification
and16KiB alignment pass. Signed SHA256:
`eaaf30f5a6748a002a449427f0f4d7ca09540223a3bc48aa7e973e4979e9947d`.
Installed with same-key install-r only on FFBE Trace and passed calibration
`[1.25,-2.5,3.75]`, ready32. User stopped computer control using Escape before
the new capture; all input stopped immediately. User then explicitly authorized
resuming FFBE Trace while playing Final Fantasy Resonance; that game is outside
the control scope. The pending capture at that checkpoint is now completed;
see the current revision22 live result above.

Ignored receipts: `pipeline-v21-20261025/brave-log.txt`, `brave-audit.json`,
`clim-log.txt`, `clim-audit.json`, `complete-log.txt`, `ondraw-static.json` under
tools/data/memorial-audit. The audit now also supports replay of a contiguous
VelocityX update prefix from a captured initializer and actual deltas, with
record-pointer/offset identity and captured-rebirth boundaries. Missing/disjoint
prefixes remain unproved; no fixture time base or fitted seed is substituted.

## Purpose and scope (2026-10-25)

Revision20 measures missing engine inputs rather than changing a skill preview.
Source identity, native callback selection and observed outputs must remain
separate from playback support. No game asset or preview geometry is changed by
this milestone.

The existing observer sampled make-vertex callbacks for one Brave Slash node.
That does not establish initialization, random-state ownership, update scheduling
or the actual GPU clip surface. The new observer follows selected source nodes
through init/update/make and samples the GL state inside their named wrapper's
draw scope. Wrapper membership alone does not identify an individual GL primitive.

## Measurement contract

`tools/memorial/prepare_diagnostic.py` derives scale and rotation callbacks from
the pinned native dispatch tables and the raw IBMB selectors. It embeds exact
native fingerprints and source windows for pink nodes24/34, blue node8, purple
blow node3 and white strobe node3. These are representative measurement probes,
not per-skill rendering rules or an exhaustive effect inventory.

`pipeline_observer.js` requires the context's parameter pointer at+0x10 to equal
the selected emitter's parameter pointer. Descendant callbacks cannot inherit a
parent's identity merely because they run inside its stack scope. Samples retain
the same record start across cursor changes, with raw bytes alongside floats.

- Init/update: record, cursor, RNG pointer and four RNG words; compare RNG ownership
  against emitter+0x130.
- Update: native delta+0x40, life fraction+0x50 and available parent transforms.
- Make: center, rotation, local/group scale and alpha context.
- Draw: camera and animation root position/scale/color, joined by wrapper/draw ID.
- GPU: actual viewport, scissor enable/box, framebuffer and program at a selected
  wrapper's `glDrawArrays`/`glDrawElements` call. No GL setters are called.

The limit is six first-record samples per emitter/stage and six GL samples per
file. Unknown callbacks stay unverified; unavailable values are reported rather
than replaced. Dynamic callbacks and GPU hooks detach after the60-second arm
window unwinds. Instrumented deltas are evidence of the observed run, not proof
of uninstrumented performance or a universal fixed time step.

Arm with `pipelineCapture:true`, named `sampleFiles`, a unique `token`, and legacy
`particleNode`, `particleSourceMemory`, `particleVertices`, `locatorNodes` disabled.
Verify a matching `armed` receipt, valid startup calibration and no blocking
error before executing. Do not rearm during an active measurement.

## Build and startup evidence

Pinned source APK SHA256:
`9d21fc8b61c9900eaacb1c2ddef2cabcad1e97d2dc720be16ac09b06fc0086b4`.
Native SHA256:
`6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77`.
Revision20 signed APK SHA256:
`36d9a89757cbfe9c7e02c80a52f460fab2e9b0e05dc7d8613af3c433f833d38e`.

Built with `prepare_diagnostic.py`, zipalign16KiB, and the existing diagnostic
key; apksigner verification passes v1/v2/v3, alignment check exits0. Same-key
`adb -s 127.0.0.1:5575 install -r --abi arm64-v8a` returned `Success`, exclusively
on the configured FFBE Trace clone. No uninstall, data clear or root operation.

First launch reported `calibration-failed` with null capture. No data from that
launch is accepted. One explicit clone-app restart then reported revision20,
`calibration-pass` `[1.25,-2.5,3.75]`, and `ready` with32 retained hooks. The cause
of the first failed calibration is not established. A bootstrap arm with no
selected files succeeded and returned camera data without a GPU-unavailable
event; it is not a skill or GL-draw capture.

Local receipts stay under ignored
`tools/data/memorial-audit/pipeline-v20-20261025/`; build under
`diagnostic-v20-pipeline/`. Never track the APK, signing material or raw trace.

## Executed checks

```powershell
node --test tools/memorial/test_pipeline_observer.mjs tools/memorial/test_particle_observer.mjs tools/memorial/test_locator_observer.mjs
& '<bundled-python>' tools/test_native_particle_dispatch.py
node --check tools/memorial/observer.js
node --check tools/memorial/pipeline_observer.js
```

Fifteen observer tests and six dispatch tests pass, with no skips. The GL tests
also reject non-draw scopes and absent current contexts, and verify surface-state
joins and failure budgets. Their first fixture run lacked the mock pointer's
`toInt32`; completing that mock fixed the test without changing production code.
The initial
`python -m unittest tools/test_native_particle_dispatch.py` invocation failed
because that invocation did not put tools on the import path; the direct command
above passed. GPU values and skill replay require a live selected draw; mocks
and successful arming alone do not validate them. Full game tests are outside
this diagnostic-only change and have not been rerun for this block.

## Live Brave Slash result

User supplied navigation: Memories -> left category arrow twice from Season1
(`JP Memories`, then `Event Battles`) -> Golden Bomb Rush -> Chapter1 -> INT ->
Depart. Cloud207000117 was already selected in Party1. The unit-card swipe via
the Windows control helper did not open the command menu, so the user prepared
Brave Slash once. The agent verified the arm receipt, then clicked Cloud's
prepared card. No other user action or video was needed for this capture.

Token `pipeline-v20-brave-20261025-a`, execution1097, original ability214800,
group5008050, pink source SHA256
`89c3cb5e7c16df69bf8d1c538622afdd42e30942240141a8147dd55da4de690f`.
The validated window contains30 completed samples,41 observed callback returns,
six actual GL draws, and23 init/update RNG-owner pointer checks, all matching
emitter+0x130. Five node24 ConstX initializations replay **bit-exactly** through
the previously reviewed original ARM64 scalar initializer with raw source
`initial=40, range=10` and each captured RNG-before state. Both the generated
record bytes and all four RNG-after words match in all five cases. These states
were measured, not selected to fit the output. Rotation and non-X initialization
are not included in those five replay claims.

The observed update-context+0x40 values range from0.8288800120 to1.0284600258.
Those are real instrumented inputs, not evidence for seconds, fixed steps,
birth catch-up or native traversal scheduling. Do not feed them into the game
as an assumed universal time base.

All six GPU observations have viewport `[0,1,1080,1917]`, scissor enabled with
box `[0,1,1080,1856]`, framebuffer0, program132, GL_TRIANGLES and42 indices. They
share wrapper drawID1145. This is actual GL state, distinct from the Cocos camera
reference's1080x1920 viewport. It does not establish the clip state of node34's
later white plane or a party-HUD mask. Primitive/node ownership is unresolved.

**Exact-join gap:** the first six wrapper context snapshots were consumed by
pre-effect/wait draws1121–1126; the first actual GPU draws occur at1145. Therefore
all six GPU/context exact joins are missing. Nearby timestamps are deliberately
not substituted. The next observer must capture root/camera context at the
selected actual GL call, and budget by relevant draw rather than empty wrapper
entries. This is an instrumentation gap, not a reason to adjust skill geometry.

**Update interception gap:** the one unreadable callback is source-selected
scaling `update::ConstX` at0x1fc7a54. Static pinned ELF inspection identifies a
four-byte unconditional branch (`0x17c45aa7`) to PLT0x10de4f0, then GOT0x2dd9d20.
The ELF JUMP_SLOT relocation1026 names
`ml::bm::module::scaling_x::update::Const` at0x1fc7a30,36 bytes. Frida could not
attach to the four-byte wrapper. The next probe can preflight and observe this
reviewed implementation while retaining the selected wrapper identity; it must
not silently treat arbitrary branches or aliases as supported callbacks. No new
APK, alias hook or playback path has been installed for that follow-up yet.

Reproduce the receipt with optional Unicorn dependencies on PYTHONPATH:

```powershell
$env:PYTHONPATH='tools/data/native-locator-emulation/python-deps'
& '<bundled-python>' tools/memorial/audit_pipeline_context.py --log tools/data/memorial-audit/pipeline-v20-20261025/brave-complete-log.txt --token pipeline-v20-brave-20261025-a --spec tools/data/memorial-audit/diagnostic-v20-pipeline/pipeline-spec.json --source tools/data/shared-skill-review/brave-slash-composed/originals/atk_impact_001_pink.bmb --replay-x tools/data/memorial-audit/installed-base-v208.apk --output tools/data/memorial-audit/pipeline-v20-20261025/brave-audit.json
& '<bundled-python>' tools/memorial/test_pipeline_context.py
```

The four additional audit-guard tests pass. They reject mixed sample identity,
changed sources/cursors and invalid calibration, and keep a GPU/context join
missing despite a nearby timestamp. Initial raw-record validation was corrected
to preserve the observer's null representation for nonfinite pre-init storage;
raw bytes are retained and no initialized output was replaced. The live audit
and all five original-code replays subsequently pass.

## Remaining gate

Close the exact GPU/root join and reviewed ConstX delegate observation, then
measure the Climhazzard screen layer and a dynamic VelocityX case. This capture
does not close generalized scheduling, all random-state producers, emitter
types, materials, or source primitive ownership. No immediate new recording is
required while evaluating these local receipts. Do not promote this observer to
universal skill support or compensate with per-skill scale/offset overrides.

## Revision21 offline candidate

The two revision20 probe gaps have implementation changes, tested offline only:

- `drawContext` now retains a reader on the current wrapper scope without
  sampling it. At the first actual GL call for that exact scope, the observer
  reads camera/root and GPU state together. Empty/wait draws consume no budget;
  multiple GL calls within a draw consume one slot, leaving six distinct actual
  wrapper draws per file. A failed context read remains an explicit missing join.
- The preparator checks the reviewed ConstX four-byte instruction, PLT bytes and
  exact ELF JUMP_SLOT tuple, then embeds the36-byte implementation identity/hash.
  Both wrapper and implementation fingerprints must pass startup preflight.
  Records preserve selected wrapper offset/symbol separately from observed
  implementation offset/symbol. This is a native ABI mapping, not a skill alias
  or arbitrary forwarding fallback.
- Failed attachment is now inventoried explicitly once and does not discard the
  remaining stage's inventory. If multiple selected wrappers share a hooked
  implementation in one stage, the observation is ambiguous and withheld.
  Descendant/context guards and first-record limits remain in place.
- The audit requires implementation identity for revision21 records; revision20
  receipts remain inspectable without inventing fields absent from that schema.

The original `scaling_x::update::Const` body at0x1fc7a30 was also executed under
the pinned ARM64 reference, extending `emulate_particle_x.py` with controlled
ConstX update steps. Four initial values (with source-like random range10) and
three supplied deltas each verify12 updates: record is unchanged, cursor advances
four bytes, UpdateContext scale is `[size,size,size]`, RNG is unchanged after
initialization, and subsequent writer output equals the no-update baseline.
These are controlled original-code executions, not live scheduling evidence.

Executed checks:19 observer Node tests,6 context/delegate Python tests,6 dispatch
tests and8 ARM64 X-reference tests pass, no skips. New regressions cover100 empty
draws before the first real GL call, lazy reading of changed root state, exact
draw joins, duplicate draw budgeting, unhookable callbacks, delegate fingerprint
rejection and ambiguous aliases. One initial Python test run misplaced its
source-mutation assertions in the new test class; moving them back fixed the
fixture without changing production logic. JavaScript syntax checks on source
and expanded observer pass; `git diff --check` passes.

Reproduce the targeted tests using the commands above plus:

```powershell
& '<bundled-python>' tools/memorial/test_particle_x_reference.py
& '<bundled-python>' tools/memorial/prepare_diagnostic.py --apk tools/data/memorial-audit/installed-base-v208.apk --output tools/data/memorial-audit/diagnostic-v21-pipeline
```

The output path must be new for rebuilding (the preparator never overwrites an
APK). Revision21 build changed only the appended script entry; original native
and resource entries were byte-checked. Unsigned SHA256:
`022cca62df3afc41d36b7c8600d15b3119ed6fbc294d40f36761a28bae1b127a`.
Aligned/signed candidate SHA256:
`c560dc26ab8e742434bb2b5fc9c23cf71836f8bff8f7275126490cfd32ee8943`.
Signature v1/v2/v3 and16KiB alignment checks pass. APK, key and generated specs
remain ignored. `pipeline-spec.json` is now emitted directly by the preparator.

**Not installed or live-verified.** FFBE Trace remains on revision20. No ADB or
Windows UI operation was performed during this offline block, honoring the
user's concurrent PC use. No preview, game effect or runtime gate changed.
Next live gate is startup calibration and exact context/delegate capture with
revision21, followed by the Climhazzard screen layer and dynamic VelocityX.
