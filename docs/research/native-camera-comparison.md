# Native camera and size comparison preparation

Current successor: [current geometry under the native viewport](native-viewport-current.md).
That review uses the revision-14 camera/root with the later geometry subsets,
full viewport and measured CPU reference. The old alpha-transparent and top-1200
comparison below is historical evidence, not the current display policy.

Milestone dated 2026-10-24. Scope: determine the final geometry-to-screen
conversion for Brave Slash before changing the composed preview's size.
The [composed preview](brave-slash-composed-preview.md) remains unchanged.

## Static finding: the native renderer shares the Cocos camera

Pinned native SHA-256:
`6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77`.

`BishamonDataList::update(float)` at 0x15bef44 obtains the current Cocos scene's
camera vector and selects its first camera. At 0x15bef84-0x15befc8 it copies:

- Camera +0x420/+0x424 values to Bishamon scene +0x88/+0x8c.
- Camera::getViewMatrix's 16 floats to scene +0x00.
- Camera::getProjectionMatrix's 16 floats to scene +0x40.

`BishamonDataList::Initialize` gets the GL view dimensions and stores integer
viewport width/height at scene +0x80/+0x84 (0x15be064-0x15be098).
`ml::bmfw::DrawBegin` copies those dimensions into RenderContext::Begin.
`ml::bmfw::Scene` returns the global scene address through its GOT slot.
`BishamonData::onDraw` calls DrawBegin -> Animation::Draw -> DrawEnd.
Animation::Draw reads scene view/projection data before constructing draw state;
its remaining transformations and shader path are not fully decoded here.

Offline bounded disassembly receipts under ignored `tools/data/memorial-audit/`:
`bishamon-list-camera-update.json`, `bishamon-draw-projection.json`,
`bishamon-draw-begin.json`, plus discovery list `render-projection-symbols.json`.
Reproduce with `tools/memorial/inspect_native_calls.py`, the pinned
`installed-base-v208.apk` and the named exported functions above.

The browser currently uses a fixed THREE.OrthographicCamera with
[-500,500] x [-400,400], z=1000. The native code copies live Cocos matrices.
This difference in setup is established; it does not yet prove that the actual
native projection is perspective or that it requires any particular shrink factor.
The previously measured global geometry factor 1.775 remains valid as a wrapper
input, distinct from projection and final screen size.

The original recording has a large Soulcage target while the browser has small
training targets. Reviewing original-t6.625.png confirms that both the boss and
the pink effect occupy substantial screen space. Size impressions across those
scenes cannot establish a numeric correction. No pixel-size estimate was promoted
to a renderer constant.

## Observer revision 12 (prepared; capture results below)

The observer fingerprints the exact exported `ml::bmfw::Scene` accessor. Selected
renderer samples now include the live view/projection matrices, viewport and
near/far fields in the `before-draw` phase. Existing after-update samples retain
`camera: null`; the camera is read immediately before the observed draw call.
Matrices must be finite and projection nonzero, with positive bounded viewport
dimensions. Unreadable data is reported, not replaced with an identity matrix.
Matrix storage/order and final pixel projection still need validation against
actual captured positions and the video.

An arm JSON may also request `"cameraSnapshot":true` for a one-shot
`camera-reference` record. A menu snapshot is not a substitute for the before-draw
battle sample. Select `"sampleFiles":["atk_impact_001_pink"]` for the controlled
Brave Slash capture. Existing command, unit-form, effect-input/group joins remain
available; no skill is executed by the observer.

Clone-only same-key `pm install -r` succeeded with data preserved. Installed APK
matched host SHA-256:
`8fad67e9923f36f4d4e6c00347aff6d108555fede49e4339ad9f45fc3e290b53`.
JS syntax, Python compilation, APK signature v1/v2/v3, 16 KB alignment,
startup float calibration and 25 hook registrations passed. Installation/startup
receipts are in ignored `diagnostic-v12/`. Root remains disabled and the primary
instance was not changed.

`summarize_trace.py` preserves one-shot `cameraReferences` and camera fields
inside renderer-state records. Reprocessing the actual revision-11 capture
preserved all 22 execution records and event counts, and returned no invented
camera records. An initial ad hoc assertion incorrectly expected 18 records;
comparison against the saved baseline corrected the check without changing the
capture or summarizer logic.

Next: prepare Brave Slash without executing it, start a uniquely named bounded
video/tag capture, arm the selected renderer and confirm the marker. Then request
one execution. Validate projection of captured effect anchors and local unit-axis
increments into the recorded viewport before considering preview changes. An
orthographic/perspective classification alone is not a complete camera mapping.
No new battle/camera measurement, browser scale patch or native-size approval
has been completed in this preparation milestone.


## Controlled camera capture and projection audit

The developer executed Brave Slash once after arm confirmation. Ignored capture
directory/token: `tools/data/memorial-audit/brave-slash-camera-20261024-135323/`.
The actual command is ability 214800 from unit 207000117, execution 744,
effect-input 1, composed string `2:1000520:1&6:5008050:1:1:0`.
There are 32 renderer-state records, including 16 before-draw camera samples;
14 before-draw samples have steady renderer scale 1.774999976158142, wrapper 1,
cached layer scale 1 and follow-layer flag 0. The camera is unchanged across all
16 samples. No unreadable renderer/camera record was returned.

Measured camera:

- View matrix: identity.
- Projection diagonal: `[0.0031250000465661287, 0.0017605633474886417, -0.00009999999747378752, 1]`.
- Projection translation: `[-1,-1,0]`; homogeneous W is constant 1.
- Logical extent: approximately 640 x 1136; viewport 1080 x 1920.
- Near/far: -10000 / 10000.

Thus this capture is orthographic. The previous suggestion that a perspective
camera might explain apparent oversizing is rejected for this capture. Changing
Z does not resize projected XY points. The global 1.775 scale remains a separate
verified animation input, not a newly recovered shrink factor.

`tools/memorial/audit_camera_projection.py` performs finite column-major
view/projection evaluation and rejects unsupported projection/extent assumptions.
It requires the pinned native build, revision >=12 and calibration. It projects
the sampled effect root `[186,638,0]` to `[313.875,841.690]` top-left viewport
pixels. Measured per-world-unit screen increments are 1.6875000 in X and
1.6901408 in Y; do not silently force these to an exactly isotropic ratio.

An independent video Y check used frame 7.750s, scanning X600-800/Y790-890. The
horizontal beam's maximum mean RGB-sum row is 846, about 4.31 pixels from the
projected root Y. This supports the coordinate domain approximately; the beam
texture is not an exact root marker and the damage text obscures X. It is not a
subpixel anchor proof or an effect-radius measurement. Video time is not effect
age. Original MP4: 18,728,489 bytes, SHA-256
`84aa1bd6839938f78c25ee56880e634ffd41505326bb20adfd8cdc8e9fe4de28`.

The recorder was stopped with SIGINT only after checking its command line against
the unique filename; the owned host tag process was stopped. The video was pulled
and decoded with bundled FFmpeg. Capture metadata, summary, `projection-audit.json`,
contact sheet, selected PNGs and `review-receipt.json` retain the evidence.

## Isolated native-viewport comparison

`tools/prepare_native_projection.py` selects the existing pink-impact member from
the composed plan, retains its source scale/rotation and original member metadata,
and sets only its diagnostic local start to zero. It attaches the actual audited
camera/root, explicit original reference frames and an optional pre-effect video
backdrop with image hashes. This produces an unapproved separate plan, never
modifying the composed plan or public assets.

The common preview server serves `/native-projection.html` for the diagnostic.
`tools/preview_native_projection.html` renders with the captured matrices and
1080x1920 viewport. Its panels show the top 1200 pixels at the same CSS scale.
An initial layout error let renderer.setSize write a fixed inline 1080px width;
visual inspection caught unequal panel scales. It was corrected with
setSize(..., false) and CSS width 100%/height auto before retaining the final
screenshots. No effect geometry factor was changed to compensate for that UI bug.

The frame selector and effect-age slider are deliberately independent. The
pre-effect backdrop is from the same video at 6.750s, not a reconstructed original
scene; body poses/background animation do not match the selected attack frame.
The renderer's adapted rectangle-placement warning is replaced on this page by
an explicit captured-world-anchor policy because that bridge is bypassed. Three
actual rendering limitations remain: quad corner colors, unsupported parent
transform combinations and nonzero parent alpha influence.

At manually selected effect ages 18/30 against original frame 7.750s, visible
coverage/transparency still differ. These are not synchronized native/evaluator
ages and therefore cannot establish a scalar size correction. The comparison
makes camera scale and source anchor explicit so the remaining timing/material/
hierarchy issues can be isolated. No final radius match or native fidelity was
approved, and the regular composed preview on port 3126 remains unchanged.

Reproduction after the retained original PNGs have been decoded:

```powershell
& $env:FFROGUE_PYTHON tools/memorial/audit_camera_projection.py --summary tools/data/memorial-audit/brave-slash-camera-20261024-135323/summary.json --output tools/data/memorial-audit/brave-slash-camera-20261024-135323/projection-audit.json
& $env:FFROGUE_PYTHON tools/prepare_native_projection.py --plan tools/data/shared-skill-review/brave-slash-composed/plan.json --audit tools/data/memorial-audit/brave-slash-camera-20261024-135323/projection-audit.json --reference-frame tools/data/memorial-audit/brave-slash-camera-20261024-135323/original-t7.500.png --reference-frame tools/data/memorial-audit/brave-slash-camera-20261024-135323/original-t7.625.png --reference-frame tools/data/memorial-audit/brave-slash-camera-20261024-135323/original-t7.750.png --reference-frame tools/data/memorial-audit/brave-slash-camera-20261024-135323/original-t7.875.png --background-frame tools/data/memorial-audit/brave-slash-camera-20261024-135323/original-before-effect.png --output tools/data/memorial-audit/brave-slash-camera-20261024-135323/comparison-plan.json
node tools/preview_original_skill.mjs --plan tools/data/memorial-audit/brave-slash-camera-20261024-135323/comparison-plan.json --port 3127
```

Open `http://127.0.0.1:3127/native-projection.html`. Final screenshots include
`comparison-f18.png`, `comparison-backdrop-f18.png`, `comparison-backdrop-f30.png`.

Checks actually run: calibrated trace summarization, one steady sampled camera,
exact command identity, four analytical projection tests (corners/center, Z
invariance, view translation and invalid W), real projection audit, video decode,
approximate beam-row measurement, comparison preparation and browser inspection
at ages 18/30 with/without the explicit backdrop. Python compilation, JS module
syntax and git diff checks passed. Browser console was not separately inspected.
No src/public files, global effect scale, body scale or composed preview were
changed; no full game build was run.

Next bounded work: recover/observe actual native animation age and compare the
same particle time before classifying the remaining size/coverage discrepancy.
Then isolate the known alpha/hierarchy differences with shared A/B controls.
Do not choose a per-skill shrink factor from an unsynchronized comparison.
