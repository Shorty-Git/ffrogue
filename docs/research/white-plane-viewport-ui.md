# White-plane boundaries: viewport and original UI context

2026-10-25. Follow-up to the [remaining white-plane issue](brave-slash-white-flash.md).
This is a read-only diagnosis using existing local evidence, not a rendering fix.
The user confirmed that Blade Beam has no corresponding white box.

## Result

The recorded Brave Slash white Particle is a large source plane. Reprojecting
its actual recorded vertices through the recorded camera again gives:

| Bound | Pixels | Relation to the captured 1080x1920 viewport |
| --- | ---: | --- |
| left | -761.0625 | outside |
| right | 1395.5625 | outside |
| top | -489.9295 | outside |
| bottom | 1430.0704 | inside the full viewport |

The regular research arena uses a different camera and adapted placement. It
can expose source-plane side boundaries that the original projection excludes.
Camera projection alone does **not** remove the measured lower boundary.

An inspected existing original Brave Slash video frame shows the opaque party
command panels starting around screenshot Y1190. The projected lower edge at
Y1430 lies in that screen band. Thus ordinary foreground UI occlusion is a
concrete explanation to test before changing a source plane's size or texture.
The source plane's lower edge may have been invisible in the complete original
composition even though it lies inside the full framebuffer.

**Evidence boundary:** the video frame and the revision-14 CPU/camera sample are
different captures. Their dimensions match, but their effect ages, world anchors
and draw ordering are not synchronized. Y1190 is a manual visual annotation of
that screenshot, not a decoded native layout constant or scissor measurement.
This comparison supports the scene-context explanation; it does not prove an
exact same-frame occlusion result. No Y1190/top-1200 mask was added to playback.

The comparable Climhazzard white strobe also has an opaque-white source texture,
but its original root/camera/clip context has not been measured here. Do not
assign Brave Slash's recorded anchor or a video-panel measurement to that skill.

## Existing inputs and new receipts

- Camera: `tools/data/particle-native-audit/locator-camera-audit.json`.
- Vertices: `tools/data/particle-native-audit/combined-node34-summary.json`,
  recorded node34 six-position buffer, not reconstructed vertex positions.
- Video image inspected visually:
  `tools/data/memorial-audit/brave-slash-camera-20261024-135323/original-t7.625.png`,
  1080x1920. It shows original damage/effect artwork and the opaque bottom panels.
- New ignored receipt:
  `tools/data/native-x-preview/white-plane-viewport-ui.json`, including input
  hashes, the reprojected bounds and explicitly manual/cross-capture annotation.

The numerical projection uses the existing
`tools/memorial/audit_camera_projection.py::project(camera, point)` independently
for each recorded position. It does not add the root or global scale again:
those vertices are already in the recorded writer's world space.

## Native viewport/scissor inventory

The pinned native image's direct B/BL inventory finds nine call sites targeting
the imported `glViewport`/`glScissor` PLT entries. The only direct glScissor site
is `0x2127bb4`, inside `cocos2d::GLView::setScissorInPoints` (entry `0x2127b84`,
52 bytes). Viewport sites belong to Cocos Camera, GLView, RenderTexture and GridBase
functions. No direct Bishamon-local scissor site was found by this inventory.

This does not establish a disabled/full scissor state at effect draw time.
Caller clipping can be inherited; indirect calls, dynamic state and framebuffer
ownership are outside a direct-call inventory. It would be incorrect to claim
that this static search proves no clipping occurs.

Reproduce:

```powershell
$env:PYTHONPATH=(Resolve-Path tools/data/memorial-audit/python-deps).Path
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' tools/memorial/inspect_native_calls.py --apk tools/data/memorial-audit/installed-base-v208.apk --caller-of glScissor --caller-of glViewport --output tools/data/native-x-preview/native-viewport-callers.json
```

The native/APK identities are checked by the tool. Function owners were resolved
using defined ELF dynamic symbols whose address/size actually contain each call;
they were not guessed from the nearest label.

## What follows for the pipeline

Keep effect simulation/geometry separate from host scene composition. A reusable
renderer must preserve the intended camera/viewport and receive a declared battle
surface and foreground-UI ordering from the host. The standalone effect-only arena
is not evidence that the original plane should cover every pixel of a redesigned
battlefield. Different HUD space can expose source boundaries previously covered.

The next implementation should make the preview's scene/view contract explicit
and compare the same world geometry under the native view. Do not silently turn
all white textures into fullscreen postprocessing, enlarge them until edges leave
the image, suppress them, or crop to a guessed HUD line. A changed lighting
treatment for the roguelike is a reviewed adaptation, separate from recovering
the source renderer.

If a new original measurement is needed, request the selected white-layer draw's
actual GL viewport, scissor enabled/box, framebuffer and frame correlation. These
are the missing values; another general video of the same skill alone would not
establish them. No new capture or emulator modification was performed here.

Actual checks: original video image viewed; recorded vertices reprojected; output
dimensions and bounds inspected; direct native-call inventory and symbol owners
inspected. No browser rendering or game build was changed/retested in this block.
