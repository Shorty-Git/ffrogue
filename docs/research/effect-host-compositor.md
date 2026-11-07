# Effect host compositor integration

Follow-up: [explicit member bindings](bound-effect-host.md) now opt into this
compositor in a separate research view. The original skill view remains unchanged.

## Implemented boundary (2026-10-25)

The shared `composeSceneLayer` now accepts an opt-in `layer.hostContext`, using
the [validated host contract](effect-host-context.md). Existing layers without
that field keep their previous path. This milestone implements composition and
GPU verification; it does not automatically bind a skill's source rectangles,
move actors into native coordinates or publish effects in the game.

The new `composeEffectHostLayer`:

1. Requires the exact declared framebuffer dimensions and pixel ratio1.
2. Uses an identity-view camera with the supplied projection matrix for effect
   geometry already expressed in native world coordinates.
3. Copies the complete existing host canvas into a separate RGBA target before
   applying the effect viewport/scissor. Source geometry is not resized to fit.
4. Renders effects with the supplied physical GL viewport and scissor state.
5. Presents the complete target over the canvas. With scene composition enabled,
   RGB is copied once with opaque output; intermediate target alpha is retained.
6. Restores the previous target, public viewport/scissor state, auto-clear and
   background visibility. The caller's ordinary camera is not modified.

Thus clipping an effect cannot erase the host background or apply alpha a
second time. Foreground remains the caller's later composition step. The
compositor does not manufacture a party-HUD mask from a placement rectangle.

`layer.nativeBlendThree` supplies the explicit Three runtime. Shader materials,
source init/update/make, timing and geometry support remain independently gated.
The contract is not silently enabled on the current skill preview, whose actor
and anchor bindings still use declared host adaptations. A measured-skill view
must supply matching native-world anchors and explicit rectangle/scatter inputs
before opting in; this is the next bounded integration.

## Executed GPU verification

New `preview_effect_host.html` runs the actual compositor in the in-app browser;
these colored planes are test fixtures, not replacement skill assets. The
preview server accepts `--host-reference` for the diagnostic page and writes its
result separately via `/host-review-result`, preserving ordinary skill receipts.

```powershell
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/climhazzard/plan-native-x.json --port 3140 --host-view game --host-reference tools/data/memorial-audit/pipeline-v23-20261025/effect-host-context.json
```

Opened `http://127.0.0.1:3140/host-compositor.html?review=2` in the in-app browser.
All five GPU checks pass:

| Check | Actual result |
| --- | --- |
| 8x8 framebuffer,6x6 viewport,4x4 scissor | 16 effect pixels,48 preserved background pixels |
| Scissor disabled, same viewport | 36 effect pixels,28 background pixels |
| Empty effect scene | All64 background pixels preserved |
| Native straight-alpha blend | Intermediate RGBA[128,0,128,191], presented[128,0,128,255] |
| Exported measured1080x1920 context | 2,004,480 effect pixels,69,120 background pixels |

The first checks also verify viewport/scissor restoration. The measured red
fixture is a camera-covering test plane; these pixel counts do not claim the
shape or final pixels of the original strobe. Source placement/geometry remains
separate from the raster rectangle under test.

Receipt: ignored
`tools/data/shared-skill-review/climhazzard/host-compositor-result.json`.
Also opened the ordinary Climhazzard preview on3140: readiness reports the
existing49 GPU fixtures passing (8 scene,8 model,6 Distortion,6 Add,6 Basic,
15 framebuffer checks) and retains its declared83 source/rendering limitations.
No original-game fidelity is inferred from that readiness report.

```powershell
node --test tools/test_effect_host_context.mjs tools/test_preview_host_view.mjs tools/test_original_effect_player.mjs
```

All28 Node tests pass, no skips; git whitespace check passes. The browser
actually executed both pages, rather than relying on syntax/tests alone. No full
game build was run: no src/game, public asset or published capability changed.
No ADB or BlueStacks operation was performed. Server3140 remains available
(exec session29728); earlier research servers remain independent comparisons.
