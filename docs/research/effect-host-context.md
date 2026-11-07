# Shared effect host coordinate contract

Follow-up: [compositor integration](effect-host-compositor.md) now consumes this
contract through explicit layer.hostContext. Five actual GPU fixtures pass,
including the measured framebuffer and alpha preservation. The ordinary skill
view still requires explicit native-world anchor/rectangle binding before it
can opt in; no source or game promotion is implied.

## Implemented boundary (2026-10-25)

`original_effect_player.mjs` now exposes shared host validation, source-placement
conversion, projection and raster-intersection helpers. They do not choose a
skill-specific offset, fit a plane to the screen or reinterpret a missing field.
The exporter writes clean scene metadata separately from imported skill/effect
data. Current preview camera/composition and published game effects are unchanged.

| Input | Meaning |
| --- | --- |
| engineScreen.width/height | Engine/API coordinate domain, measured640x1100 here |
| engineScreen.geometryScale | Independent measured source geometry multiplier |
| camera.viewMatrix/projectionMatrix | Actual camera projection;640x1136 logical extent here |
| framebuffer.width/height | Physical default-framebuffer extent,1080x1920 here |
| framebuffer.viewport | GL bottom-left viewport, measured[0,1,1080,1917] |
| framebuffer.scissorEnabled/scissorBox | Separate physical GL clip state |
| Caller-supplied source rectangle | Placement input to a member, not a clipping rectangle |
| Caller-supplied scatter | Explicit host randomness input for source axis modes1–3 |

The current validator supports identity view and axis-aligned orthographic
projection only. Unknown conventions, perspective and translated/rotated views
are rejected. Scissor may be disabled or empty; signed GL origins are retained
and intersected with the framebuffer/viewport. No native foreground/UI is inferred.

## Coordinate and geometry rules

`effectHostPlacement(context, placement, rectangle, scatter)` reuses the existing
source axis evaluator. API X remains world X; world Y is **engine height minus
API Y**, not camera height or physical framebuffer height. Member offsets remain
in API units. Geometry scale is returned separately and never multiplies the
placement offset. Modes1–3 require explicit scatter; deterministic modes4–6 do
not consume an invented random input. A caller can explicitly choose zero scatter
for an adaptation, but it is not labeled as recovered FFBE random scheduling.

`effectHostProject` projects a finite world point through the supplied matrix,
then the supplied GL viewport, then converts GL bottom-left Y to canvas top-left
Y exactly once. Depth, viewport, scissor and framebuffer membership are returned
separately. Membership does not prove fragment visibility, alpha, depth testing
or a matching final pixel.

`effectHostRaster` computes framebuffer ∩ viewport ∩ enabled scissor. It never
clips to the member's placement rectangle. In the measured scene its canvas
clip is `{x:0,y:63,width:1080,height:1856}`;640x666 remains a placement input.

## Reproducible export

First regenerate the validated revision23 audit using the command in
[native submission result](native-draw-submission.md#live-revision23-result-observation-gap-closed).
The audit now retains renderer-reference startup records, with no guessed values
for old receipts. Then run:

```powershell
node tools/memorial/export_effect_host.mjs --audit tools/data/memorial-audit/pipeline-v23-20261025/clim-audit.json --file eff_strobe_white_a50_f30 --output tools/data/memorial-audit/pipeline-v23-20261025/effect-host-context.json
```

This command was executed. The generic `--file` selector chooses an observed
calibration sample; no character or skill ID is used by the coordinate helpers.
Export requires a clean pinned native submission audit, a measured renderer
reference, actual GL events, exact camera/root joins and a stable host state
across the selected samples. Mixed states and absent observations reject.
Only the measured default framebuffer is supported: an offscreen FBO's extent
cannot be inferred from the camera and is rejected.

Output contains schemaVersion1, coordinateSystem `ffbe-screen-api`, engine,
camera, framebuffer, and separate evidence hashes/draw IDs. Observed placement
inputs retain group/category identity as evidence, not automatic semantic aliases.
Callers must explicitly supply the appropriate rectangle per source member.
No zero-rectangle, half-screen target or full-canvas screen fallback is invented.
Inputs and outputs remain in ignored tools/data; no raw source or trace is copied
to public/assets.

## Executed validation

```powershell
node --test tools/test_effect_host_context.mjs tools/test_preview_host_view.mjs tools/test_original_effect_player.mjs
& '<bundled-python>' tools/memorial/test_pipeline_context.py
```

Twenty-eight Node and nine Python tests pass (37, no skips). They include the
actual local capture: source axes[2,2], offset[0,150], rectangle[0,0,640,666],
and measured-run scatter[-4,-7] reproduce API[316,476] and world[316,624,0],
matching all six captured roots exactly. That scatter is a fixture for this run,
not a fitted or generalized RNG rule. Changing camera/framebuffer height does
not alter API-to-world conversion; geometry scale does not move the anchor.
Other cases cover viewport offsets, Y conversion, half-open clip bounds, empty/
disabled scissor, unsupported cameras, mixed export states and missing joins.
The original-code initializer/six-update audit was regenerated and still passes.

This block performed no computer-control or ADB operations. No browser visual
check or full game build was run because no visible playback path changed.
Next bounded integration must explicitly consume camera/viewport/scissor in the
preview compositor and keep background/foreground composition separate. These
helpers alone do not make the old preview a native scene replay or publish
VelocityX/birth scheduling support.
