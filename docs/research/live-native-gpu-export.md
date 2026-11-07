# Live original-renderer GPU export: first isolated pixels

## Current: live FFBE frames, native upload semantics and bounded pixel comparison (2026-10-28)

This supersedes the earlier wallpaper/startup-blocked and missing-runJ entries.
Diagnostic35/build-r4/export revision7 is restored and actually executes the
original battle. Windows capture remains stale; direct Android framebuffer and
ADB touch/swipe show a working title, menu and Golden Bomb Rush. No uninstall,
data clear, root or asset removal occurred; UID10107 and original Vulkan/OpenGL
configuration are retained. Do not infer an app hang from a Windows capture.

RunJ supplies actual isolated original GPU outputs for visible source frames1..12
on black/white/transparent, empty frames13..17, and a complete21-frame CPU trace.
Pixel frames18..21 were NOT captured. The shared simulator still reproduces
180/182 writer packets exactly; the same2 tiny inherited position differences
remain. A controlled white-effect substitution and measured scene/seeds are
explicit: this is NOT a whole unmodified Brave Slash reference.

The SAME common player now supports optional measured GL_LINEAR sampling and
offline-prepared Cocos integer-premultiplied RGBA8 uploads, admitted only by the
partial native packet profile. Ordinary Cloud plans and Legacy are unchanged.
Native integer alpha code agrees for2560 synthetic pixels; the prepared path is
also exercised in actual BattleScene. Black signal-union mean RGB error falls
from16.688 to1.923 atF1 and15.201 to0.453 atF6; NOT pixel-identical. All3 frozen
Cloud checks retain0 changed pixels; full Source/Legacy combat review passes.

Main remaining image blocker: original GPU order is2,4,3,6,8, versus source DFS
2,3,4,6,8. An experimental stable-blend-bucket order reducesF1 mean error to0.273
but is NOT integrated or accepted as original semantics. Reconstruct the original
command sorting rule next; preserve actual blend/depth/texture alias behavior.
Evidence, reproduction and detailed limits are in the map's newest entry and
tools/data/memorial-audit/diagnostic-v35-render-context/pixel-comparison-summary-j.json.
Full nine-node acceptance remains0/9; no automatic skill migration was enabled.

This dated26-October document below describes the earlier pink single-state
export. The current J result is the controlled white nine-node source sequence;
keep their identities and frame ordinals separate. The native exporter remains
a reference oracle; FFRogue's common simulator/player is the target runtime.

## Historical entries (superseded where noted above)
Evidence date: 2026-10-26. **A normally loaded Brave Slash effect produced
isolated native-rendered pixel outputs on transparent, black and white targets.**
This is a successful single-state GPU export, not isolated effect creation,
automatic skill execution, a complete animation, or a published importer.

The user declined pursuing a manufacturer SDK inquiry and authorized this
different native-runtime path. No inquiry was sent. Further phase-by-phase
renderer reconstruction is not the current priority.

## What executed and why this path differs

The prior [native factory experiment](native-export-feasibility.md) returned null
nodes. Here the game creates/loads the effect normally during battle. We do not
call the failed factory, construct effect resources or emulate its simulation.

`live_effect_export.js` identifies the reviewed Bishamon wrapper by its verified
filename field at +0x4a8 and intercepts its original onDraw scope. Runtime names
omit the source `.bmb` suffix; only that exact normalization is accepted.

During one selected scope, real original `glDrawArrays`/`glDrawElements` calls are
mirrored, in their original order, into three isolated RGBA/depth framebuffers.
The same live vertex/index buffers, shader programs, uniforms, textures and blend
state are used. Each original game draw still executes on its normal target.
No second simulation, random sequence, CPU geometry reconstruction or recursive
wrapper rendering is needed. Injected GL calls use Frida traps:none and a busy
guard. Sample requests are bounded and expire after90 seconds.

FBO initialization restores the active texture/renderbuffer and clear/mask state
before mirrored commands. Each command restores the game FBO, viewport, scissor,
texture and other explicitly changed state afterward. Readback also restores
state and deletes only the generated GL objects. Active stencil dependencies and
changing viewport dimensions reject rather than silently dropping them.

## Actual successful sample

- Effect: `atk_impact_001_pink.bmb`, Brave Slash's main pink impact.
- Token: `live-pink-20261026-c`; wrapper draw ordinal30.
- **Ordinal30 is not proven to equal source animation frame30.**
-13 original GPU commands (both indexed and array triangle draws), captured
  within the matched effect wrapper; no additional simulation step was issued.
- Three complete FBOs, status36053 / GL_FRAMEBUFFER_COMPLETE.
- Three RGBA8 outputs, each1080x1917 /8,281,440 bytes. No GL error was reported
  by the mirror/readback checks. Original viewport[0,1,1080,1917], scissor
  enabled[0,1,1080,1856], game FBO0, stencil disabled.
- Readback uses the actual viewport dimensions and an explicit viewport/scissor
  origin adjustment for the isolated target, not a skill-specific size fit.
- Black/white PNGs were actually inspected. They show the pink shockwave/impact
  without Cloud, enemy, environment or HUD.

Raw readback SHA256 identities:

| Target | SHA256 |
| --- | --- |
| Transparent | f6aef4775c1130896c5fcd6b5408e80042006cc0aa3b6eb3495dff9121cde888 |
| Black | aa510a36bdf1e43dbbb935b97ed4a36a1c48d19dbbadba124cfbfded124c2946 |
| White | f46e5dad267b577c33b50191e2618cc4bdec4f76baea127cffb8196b856c8f9f |

Transparent target alpha spans0..255. Transparent and black RGB match exactly.
This proves isolated pixels exist, not that the transparent image is a normal
straight-alpha sprite ready for arbitrary backgrounds.

## Concrete compositing gate

`analyze_live_export.py` validates pinned provenance, dimensions, complete-FBO
status and raw byte sizes, flips the GLES lower-left row order for review PNGs,
computes hashes and compares backgrounds. The review pair is a downscaled
analysis image only; no game texture or animation scale is changed.

Compositing the transparent PNG as ordinary straight-alpha over white differs
from the actual native white-target result by up to220/255 per channel;
1,289,258 pixels exceed a two-level tolerance. White-minus-black channel spread
also exceeds two levels in1,219,534 pixels. This rejects publishing the raw
transparent PNG as a proven standard alpha overlay. It does not uniquely identify
the required blend decomposition: additive saturation, premultiplication and
the sequence of material passes require a preserved-layer or otherwise verified
compositing solution. No guessed alpha correction is applied.

Next milestone: obtain a short native-rendered sequence with preserved/verified
blend composition on more than one background, then repeat the same mechanism
on a second source effect. Whole-skill member scheduling, character body timing,
repeatability/seed control and automatic starting remain separate acceptance gates.

## Earlier attempts in this resumed milestone

| Attempt | Result |
| --- | --- |
| Revision1 | Prepared/installed on Trace; user stopped Computer Use with Escape before export; unarmed |
| Revision2 white normal-attack request | Expired without output; does not prove whether that filename loaded or had six draws |
| Revision2 pink wrapper redraw at ordinal6 | FBO creation/readback code reached; no observed GPU calls, no outputs |
| Revision3 mirror at ordinal6 | No actual GPU commands in that selected original wrapper scope, no outputs |
| Revision3 mirror at ordinal30 |13 original GPU commands, three validated outputs and review PNGs |

The successful later sample shows that choosing an empty early scope mattered.
Do not conclude that all wrapper redrawing is impossible from the ordinal6
attempt. The successful implementation now avoids wrapper redrawing entirely.

## Exact build, device and cleanup

Only FFBE Trace / emulator-5574 (also exposed as127.0.0.1:5575) was an install
target. The main emulator instance was not modified. Updates used pm install-r
with the existing diagnostic key; no uninstall, app-data clearing or root command.

Pinned source APK SHA256:
`9d21fc8b61c9900eaacb1c2ddef2cabcad1e97d2dc720be16ac09b06fc0086b4`.
Native SHA256:
`6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77`.
Installed final diagnostic APK SHA256:
`600ebf612b1280df9628d7cc2d9d9116a838a808f0b789407bcf925c9b8f5efe`.
Device and host hashes agree. Original community script is preserved as an exact
prefix; all other non-signature entries are verified unchanged by preparation.
Final signed build passes v1/v2/v3 signature checks and16KiB alignment.

The dedicated generated export directory needed app/shell write access during
the experiment. An initially app-owned inaccessible empty directory was renamed
to `ffrogue-live-export-v2-app-owned`; no application asset directory was moved.
The shell-created `ffrogue-live-export-v2` was temporarily2777 for the app to
write readbacks and is now restored to2770. The older generated v1 directory is
also2770. The ordinary app files parent was not chmodded. No unrelated data
was copied. Generated outputs and APKs remain ignored.

The successful request completed and was replaced by `{}`. No export remains
armed. Revision3 stays installed in Trace, idle. User manually prepared Brave
Slash; Computer Use executed it. The isolated capture can stall that diagnostic
frame during GPU readback; uninstrumented performance is not established.

## Reproduction

Review/sign/install only into the same explicitly authorized Trace clone using
the established signing workflow. The new mode is separate from the observer
and the old failed factory exporter, avoiding double instrumentation.

```powershell
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' tools/memorial/prepare_diagnostic.py --apk tools/data/memorial-audit/installed-base-v208.apk --output tools/data/memorial-audit/<new-live-directory> --mode live-export
```

The actual final build directory is diagnostic-v24-gpu-mirror. While a reviewed
effect is prepared but not executing, send a new bounded request into the
generated Trace export directory, then verify live-export-armed before execution:

```json
{"token":"unique-review-token","file":"atk_impact_001_pink.bmb","draws":[30]}
```

Current allowlist: white slash, pink impact, green aerial slash. This is a bounded
research allowlist, not approved runtime support. Max3 ascending ordinals1..60.
An effect factory or a battle activation API is not called by the probe.

Actual ignored artifacts:

- tools/data/live-effect-export/runtime-log.txt
- tools/data/live-effect-export/capture-20261026/live-pink-20261026-c-d30.json and .rgba files
- tools/data/live-effect-export/review-20261026/analysis.json and review-pair.png

```powershell
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' tools/memorial/analyze_live_export.py --manifest tools/data/live-effect-export/capture-20261026/live-pink-20261026-c-d30.json --output tools/data/live-effect-export/review-20261026
node --test tools/memorial/test_live_effect_export.mjs tools/memorial/test_native_export_probe.mjs tools/memorial/test_particle_observer.mjs
```

The actual analysis, visual inspection, signature/alignment/hash checks and all9
listed Node checks passed, with no skips. Whitespace check passed. These tests
cover request bounds/name normalization and retained observer/export controls;
the device capture, not unit-test counts, establishes actual GPU output. The
86 prior CPU-reference checks were not rerun for this independent native path.
No Phaser/game build or browser animation integration was performed.

GLES readback/FBO semantics were checked against the
[Khronos ES2 reference](https://registry.khronos.org/OpenGL-Refpages/es2.0/xhtml/)
and [ES2 specification](https://registry.khronos.org/OpenGL/specs/es/2.0/es_full_spec_2.0.pdf).
