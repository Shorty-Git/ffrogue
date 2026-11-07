# Brave Slash native size/composition review

Controlled capture reviewed 2026-10-24. The developer judged Brave Slash and Climhazzard
too large and visually incomplete in the shared reference-based preview. Do not
respond with per-skill shrink factors. Start with Brave Slash (ability 214800,
requested original Cloud sprite form 207000105) and preserve that observation as
review feedback, not an established cause.

The source expects group 5008050 / `atk_impact_001_pink.bmb`, source scale 100%,
member delay 0 and group start F4. The capture below verifies the observed renderer/layer scale for this effect,
but not final screen-space bounds or every engine-driven effect rule. See [global-scale evidence](native-renderer-scale.md).

## Prepared observer revision 8

The exact-build observer additionally fingerprints/hooks:

```text
_ZN12BishamonData6updateEf
_ZN12BishamonData6onDrawERKN7cocos2d4Mat4Ej
```

Selected effects can now be sampled after update and before draw. Read-only
fields are based on the statically inspected wrapper paths:

- Wrapper scale: object offset `0x480` (three floats).
- Animation pointer: object offset `0x460`; renderer position at animation +8,
  renderer scale at animation +`0x20` (three floats each).
- Cached layer scale at object +`0x4c8`, follow-layer-scale flag at +`0x4f5`.

These are raw native fields, not final screen bounds or a recovered camera.
Sampling is disabled unless a JSON arm request provides effect filename keys:

```json
{"token":"unique-brave-slash-review-token","sampleFiles":["atk_impact_001_pink"]}
```

Write the request to the existing `files/ffrogue-trace-arm.txt` in the diagnostic
clone and make it app-readable (mode 644 for an ADB-created file). Plain-token
requests still work for previous setter-only captures. A fresh token resets
object/name/phase counters. Sampling is limited to 30 records per object/file/
phase, at least 50 ms apart; the global 2500-record/60-second window bounds stay.
Other battle effects retain normal filename/setter observation so missing or
additional composition members can be identified without sampling every effect
each frame. `summarize_trace.py` retains `rendererStates` in the selected window.

Revision 8 passed JS syntax, Python compilation, APK signature v1/v2/v3 and
16 KB ZIP alignment checks. Clone-only `pm install -r` succeeded, installed APK
hash matched `08c95c3dfd45ce55f9071df890f078942b166adac86368629e217fe22c01eba1`.
Startup confirmed revision 8, exact object/float calibration, 20 hooks and the
unchanged global reference (640x1100, 1.775). Per-effect renderer-state sampling was subsequently verified in the controlled
battle capture below. No preview size was changed.

## Video comparison preparation

The emulator's `screenrecord --help` confirms bounded MP4 recording support.
A three-second 4 Mbps probe under `/sdcard/Movies/ffrogue-encoder-check-v8.mp4`
was recorded and pulled to ignored `diagnostic-v8/video-probe.mp4` (821765 bytes).
Its MP4 boxes were checked with proper extended-size support. An initial
32-bit-only box check failed; using the format's extended-size headers resolved
that checker limitation without changing the video.

`imageio-ffmpeg` 0.6.0 was installed only into ignored
`tools/data/memorial-audit/python-deps`. Its bundled FFmpeg decoded a frame at
1 second into `video-probe-frame.png`: 1080x1920, nonconstant RGB values. This
verifies the recording/decoding path, not a skill comparison. The probe is not
used as evidence of Brave Slash's appearance or timing.

## Controlled Brave Slash capture

Local evidence directory (ignored):
`tools/data/memorial-audit/brave-slash-review-20261024-035305/`.
The arm token matches that directory name. `capture.json`, `summary.json` and
`review-receipt.json` retain capture identity, decoded events and media hashes.
The user reported one execution; the video visibly names Brave Slash and the
expected group/file appears. The observer did not capture an ability ID, so this
is not a trace-only verification of ability 214800.

The bounded recording was stopped with SIGINT after checking the recorder's
command line against the unique output filename. The MP4 was pulled and decoded;
the owned tag-capture process was also stopped. `original.mp4` is 1080x1920,
31,997,277 bytes. `brave-slash-original-clip.mp4` preserves seconds 5.5-8.5;
`original-effect-sequence.png` shows original frames at 6.375, 6.500, 6.625 and
6.750 seconds. These are video timestamps, not source animation frame numbers.

### Scale findings

All 32 sampled states belong to `atk_impact_001_pink`, object
`0x7bdd3b1efd80`. Four initial samples have renderer scale `[1,1,1]` and position
zero during startup/wait. The remaining 28 samples (14 after-update and 14
before-draw) have renderer scale `[1.774999976158142]` on all three axes.
Every sample has wrapper scale `[1,1,1]`, cached layer scale 1 and follow-layer
flag 0. This confirms the global factor 1.775 after startup and rules out an
additional layer shrink factor for this observed effect. It does not establish
final screen-space bounds or camera equivalence with the browser.

Group 5008050 used target rectangle `[15.600006,93.200012,268,421]`, base wait 6,
layer input 2010 and flags 0. Observed placement `[145.600006,303.700012]` differs
from the rectangle center by `[-4,0]`, consistent with the previously recovered
integer jitter rule. The source member scale is 100%; observed wrapper scale is
1. No arbitrary skill-specific scale correction was introduced.

### Composition findings

The original video shows a green slash followed by the pink impact. The same
native action window emits group 1000520 / `atk_slash3_green` on the same target
rectangle, base wait 2, shortly before group 5008050 / `atk_impact_001_pink` with
base wait 6. The skill-source effect list and current preview contain only the
pink component. Thus the skill-source effect list alone is insufficient to
reconstruct the visible original sequence.

Activation effects also appear in the window. A later yellow explosion belongs
to the subsequent battle sequence and is not added to Brave Slash. The generic
hit-profile selection rule has not been resolved; do not hardcode the green
slash into every skill or infer a universal mapping from this capture.

### Review limits and next bounded step

The original target is the large Soulcage boss; the browser uses a small training
target and an adapted arena. Target rectangles, viewport and camera transforms
are not matched. The user's oversized-preview feedback remains unresolved;
this capture does not approve the browser's final size. A visual comparison
against different targets cannot establish an exact pixel correction.

Next resolve the engine-driven standard hit-effect selection from existing
source/native evidence, then include it explicitly in the common composition
plan. Compare size using matched actor/target bounds before changing the shared
coordinate conversion. Climhazzard needs its own composition review; this result
does not validate its missing layers. Plans remain `approved: false`; no public
assets or gameplay files changed during this capture review.

Checks actually run: trace summarization completed; 32 sampled states and their
scale/layer distributions were asserted; original MP4 and selected frames were
decoded and visually inspected; local evidence hashes were written. No game
build or browser playback was rerun for this documentation/evidence milestone.


## Follow-up: loaded master comparison

The [native hit-profile review](native-hit-profiles.md) subsequently recovered
33 hit profiles and 173 process mappings, then directly read loaded abilities
214800/214810/214820. All six effect/attack-frame fields match the local sources.
Loaded Brave Slash likewise omits group 1000520. This rules out a difference in
those raw ability fields, but does not identify the command/unit-specific
assembly path that emitted the observed green group. The neutral simplified-hit
profile resolves to 9000230, so it must not be used as proof of a green-slash rule.


## Follow-up: additional effect origin resolved

The [controlled revision-11 execution](native-hit-profiles.md#controlled-execution-character-attack-effects-precede-motion-1-abilities)
now identifies ability 214800, unit master 207000117 and their combined execution
input. The green slash is the unit's standard attack effect prepended by the
motion-1 assembly path; the skill effect follows with its start shifted by the
unit's latest effect start. This resolves the missing-list origin for this
capture, not final screen-space scaling or the remaining particle renderer gaps.
The project's 5-star form stays selected and the skill identity remains the same.
