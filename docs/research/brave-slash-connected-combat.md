# Connected combat target: Brave Slash attack-prefix effect

## Current: original source-priority submission integrated (2026-10-28)

Continuation of scoped1b40a19. The experimental blend-bucket explanation is
superseded: this BMB enables priority sorting, with original priorities0.4 for
the two leading Quad branches and0.5 for the others. The non-full-Z original
NodeTree sorts metadata by Float32 priority, with an epsilon tie rule and original
metadata-index tie-break. It sorts EMITTER packets, not individual particles.
Zero-alpha live primitives remain part of a metadata packet. Simulation, RNG,
geometry and original material/blend descriptors are not reordered or rewritten.

The common player admits explicit native-priority-nonfullz-v1 metadata prepared
from verified IBMB fields by tools/prepare_draw_submission.py. Full-Z, unknown
layouts/flags and missing/nonfinite priorities fail closed. Ordinary Cloud
previews and Legacy retain their existing path. No arbitrary depth offsets or
skill checks were added. Native sorting matches134 synthetic original-instruction
controls; seven available authoring pairs verify25 raw priority fields. An eighth
source decodes5 further fields but lacks its authoring file; no extra verification
is claimed for that missing pair.

Final before/after pixel receipts19/23 cover all12 visible J frames under identical
measured source/time/host/resources. Signal-weighted black RGB mean0.5433->0.1789;
maximum79->5. Frame1 mean1.9227->0.2661; late frames unchanged. Maximum framebuffer
alpha difference across all backgrounds61->6. NOT pixel-identical or full-skill
approval. Original packet regression remains182 outputs/180 exact/SAME2 tiny
position differences. Actual BattleScene submission is observed in receipt22;
frozen Cloud receipt24 and final combat receipt25 are the final regression records.
See the newest map/handoff for actual final checks and input limits.

The shared-sampler experiment changes no pixels here. Native-world placement
changes only negligible early pixels; neither hypothesis is enabled in production.
Next compare actual native texture upload format/bytes and remaining framebuffer
state against prepared RGBA8. Existing shader sources declare highp; do not assume
mediump or guess quantization to force the residuals to zero. No new emulator
capture or APK change was needed in this block.

## Historical entries (superseded where noted above)
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

## Historical entries (superseded where noted above)
Current live writer verification (2026-10-28): diagnostic35/runI measures all182
actual writer buffers across21 frames, including draw-basis/UV-trim pointees.
Shared simulation reproduces180 exactly and retains SAME2 tiny center residuals;
UVs/RGBA/tints exact. Native computed matrices are not runtime inputs. Seeds/root
pose remain explicit external conditions. GPU images are still missing because
controlled source identity differed from the outer wrapper filename. Exact wrapper
binding is fixed/tested/installed (r4/revision7), awaiting one prepared skill to
exercise. User is away; autonomous app/Trace-VM restart completed, but the game
view remains on wallpaper. RunJ is disarmed until a usable game view exists.
No new runtime renderer change/native pixel claim in this continuation.
See map newest entry and tools/compare_native_writer_trace.mjs.


Current render-context extension (2026-10-28, after6ab0858): bounded Particle
packets support finite affine draw axes and independent atlas rectangles for
UV1/UV2.12 synthetic original-instruction controls match exactly. Shared packet
materials now consume a separate UV2 vertex attribute; a cropped-UV1 GPU control
matches the unchanged native Add fragment exactly, while the former UV1-derived
path fails it. Ordinary Cloud previews/Legacy are unchanged; frozen frames have
0 changed pixels. The182-window/180-exact baseline remains intact. Diagnostic35
is installed/calibrated with render-context/writer hooks and GPU export ready,
but a NEW live measurement is still pending the user's prepared Brave Slash.
Boot readiness is NOT proof that deferred writer hooks have fired. See the map
and diagnostic-v35-render-context receipts; full-effect native pixels unverified.

Current connected Particle packet integration (2026-10-28): the existing shared
player now admits a prepared finite Null -> VelocityX Particle two-texture branch
alongside the four Quad branches. All 182 CPU make windows retain source-child /
creation order. Original instruction replay verifies 150 Particle writer outputs;
independent parents produce 148 exact packets plus the SAME two tiny inherited
center residuals. UVs/RGBA/tints are exact in all150. Actual BattleScene review
checks six frames,67 packets,1206 world-buffer values and natural cleanup. Cloud
frozen frames remain0 changed pixels; ordinary skills/Legacy are unchanged.
Full trim, identity Particle draw basis, neutral tints, alpha1/global color1,
measured initial seeds and reviewed dispatch are explicit conditional inputs.
No full nine-node/native-pixel approval or automatic skill migration. See the
map's newest entry and particle-packet-integration receipts.

Current bounded Quad packet integration (2026-10-27): prepared nativeQuadBranches
profiles now connect independently computed parents1/5 to drawable2/3/4/6 in the
SAME player/scene bridge.32 full packets match original instruction replay and
32 live record/RNG/primitive-center states match H. Product frames/natural end
pass; ordinary Cloud baselines remain0 changed pixels. Texture trim/global color
are EXPLICIT conditional inputs. CPU order derives from source-child DFS and
passes H comparisons; live GPU order/pixels remain unverified. The
Particle7->8 branch and full graph remain gated. Use map's newest entry and the
quad-render-integration receipts; no new skill/reward binding was published.

Latest parent extension: [source Null chains and Quad handoff](native-null-parent-chains.md).
Four Null init/update chains now execute source random rotation, native uniform
scale and motion under declared fixtures; an integration check feeds their
matrices to Quad output. The fourth delta_zero_update module array is discovered,
retained and explicitly blocked pending its phase/context connection. Source
births/lifecycle/inheritance and complete nine-node output remain open.86 Python
tests pass. The motion/geometry checkpoints below remain useful evidence.

## Latest extension: native motion-to-geometry handoff

The opt-in geometry host field `placementFromUpdate:true` now connects the
original translation update to the actual packed Quad output. `center` in this
mode is the explicit **parent origin**, not a replacement primitive center.
The native translation functions multiply the evolving local position by the
declared parent basis and add that origin. The final center comes from their
UpdateContext +0xf4/+0xf8/+0xfc output.

Two straight-line original code blocks transfer this result:

- Quad PostUpdate `0x1fed0e8`, 28 bytes: UpdateContext world position to primitive
  metadata +0x0c/+0x10/+0x14. SHA256
  `1072292b765f065fcfe1e104cef68c7eba40d5ad1004b804047518133e418639`.
- Quad VertexMaker `0x2020c70`, 36 bytes: primitive record pointer and world
  position to MakeVertexContext +0/+0x98/+0x9c/+0xa0. SHA256
  `58bacc5d4fce50bb2a720f7e485a3cbcd6c5acfacb7ce1427bf7fcfb8e7a1c89`.

Both blocks execute with explicit register/memory inputs and verified end PCs.
They are bounded transfers, **not full PostUpdate or VertexMaker execution**.
The existing complete make arrays and source-selected writers run afterward.
No Python position equation or manually fitted primitive center replaces them.

This step also fixed a real harness defect: InitContext and UpdateContext
reuse offsets with different layouts. Original translation InitVelocity reads
the inline velocity multiplier at InitContext +0x68/+0x6c/+0x70. The initial
probe left it zero, suppressing source velocity. Original Quad callback code at
0x1fed644..0x1fed64c initializes that vector to one (relative context base at
stack+0xa0). The harness now initializes it explicitly to [1,1,1], runs init,
then installs UpdateContext's origin pointer at +0x68 and basis pointer at +0x80.
These are declared neutral fixtures; inherited initialization values remain
outside this harness. Null pointers no longer accidentally address mapped ELF
header bytes when translation updates read their parent inputs.

With source local position -40 and velocity10 at Quad parameter +0x2dc/+0x2f4,
nodes4/6 now yield centers -30,-20,-10,0,10 across five unit-delta updates;
nodes2/3 remain at zero under the identity/zero-origin fixture. A separate
velocity3 mutation and rotated/translated parent control proves the motion
reaches all six packed vertices. The explicit-center geometry mode remains
available for independent comparison. Earlier zero-velocity probe records
are superseded; they were not published game effects.

Reproduce after the Python path setup below:

```powershell
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' tools/memorial/emulate_quad_assignment.py --apk tools/data/memorial-audit/installed-base-v208.apk --source tools/data/shared-skill-review/brave-slash-composed/originals/atk_slash1_white.bmb --geometry-host tools/data/connected-effect/quad-motion-host.json --output tools/data/connected-effect/brave-slash-quad-motion.json
```

The ignored host fixture uses zero parent origin, identity basis, unit scale,
neutral texture tints and `placementFromUpdate:true`. The receipt retains all
nine nodes and `wholeEffectExported:false`; samples are controlled updates,
not source-timed frames. Parent bases/origins are not yet derived from source
Null initialization, nested births or inheritance. Source material context,
two-texture GPU submission and whole-source acceptance remain open.

79 Python tests pass, no skips (14 Quad,54 Particle,11 connected). The three
added checks cover original transfer, mutated velocity through a rotated parent,
and nonfinite parent rejection. Existing baseline exports remain tested. No
browser, game build, emulator operation, new recording or publication occurred.
`git diff --check` passes. The sections below describe the preceding geometry
checkpoint; use this extension for current placement capability.

## Target and current result

The next whole-source acceptance target is `atk_slash1_white.bmb`, not another
unrelated fixture. This is the source-verified **unit-attack prefix** of Brave
Slash (214800), group `2:1000290:1`, not the complete skill. The pink main impact
remains a separate 35-node source. See [composition evidence](brave-slash-composed-preview.md).

Source SHA256: `32c66c01d93f64f2fb67a5c0580bb62f2622b1a56a1e36e55210594e10b07de9`.
The staged original is under `tools/data/shared-skill-review/brave-slash-composed/originals/`.
No new assets, APK installation or recording were needed.

`emulate_quad_assignment.py` now runs original Quad AssignModule/GetModuleCount/
GetModuleWorkSize and the **complete selected init/update arrays** for all four
Quad nodes. It shares the pinned ELF loader and controlled age/delta/RNG harness
with Particle, while using Quad's actual parameter layout and original wrappers.
It does not use Particle callbacks as Quad substitutes. Source alpha keys are
relocated at Quad +0x280, confirmed by its original InitCurve wrapper.

| Source node | Native init/update/make counts | Allocated / consumed bytes |
| --- | --- | --- |
| 2 | 4 / 4 / 8 | 84 / 52 |
| 3 | 4 / 4 / 8 | 84 / 52 |
| 4 | 4 / 4 / 8 | 96 / 64 |
| 6 | 5 / 5 / 9 | 108 / 76 |

In init/update mode the make arrays are selected only. The explicit geometry
mode below now executes all of them and the source-selected Quad writer.
All four complete init/update lists execute with matching cursors and intact guards. The unused
32-byte work reservation is retained, not interpreted as an invented header.
InitConstFlat reads inline color vectors +0x68/+0x78; ConstFlat advances twelve
record bytes. A source scale mutation reaches the original initialized record
and its subsequent updates, demonstrating that output is not a fixed fixture.

## Connected Quad geometry and packed output

`--geometry-host` now connects those same four complete chains to original
geometry/make/transform/UV/color/alpha code and original packed-output writers.
It produces 120 vertices across twenty controlled samples (five ages per node).
This is local geometry evidence, **not twenty source-timed animation frames**.
Each update and make consumes the same complete record, with guards retained.

The source selects `GetSetupVertexBufferFunction` at `0x2014d80` (136 bytes),
SHA256 `51571ede957cabd56c089f54a9d83c6110ddf09f55a4e67ea7182b2781268a04`.
It reads actual source texture names and the source operation at Quad +0x730.

- Nodes 2/3/4 select original writer `0x2005180`, 892 code bytes, stride40,
  SHA256 `edb5867260fa9d62c9df8a878a43fa1c54c0fe7402ded400470e3ea71ddb4b22`.
- Node 6 selects original two-texture writer `0x2005500`, 1156 code bytes,
  stride64, SHA256 `fdb96e29f1bc40cdce2525000f24e190f6815db55dd2ef21a592edf658d27718`.

Packed output retains position, byte RGBA, first UV/tint and second UV/tint
where selected. The original Quad Default transform executes, including six
explicit float32 Python sin/cos adapters per sample, as in the locator reference;
native libc is not executed. Both writers run through their return instructions.
No Particle writer, replacement square builder or visual fit constants are used.

Static instruction inspection confirms texture tints at MakeContext +0x144/
+0x154. UV layer indexing is **35 floats/0x8c bytes**, not 31 floats: first trim
at +0x188, second at +0x214, second output origin at +0x224. With the declared
full-texture trim fixture, node6's source second-layer scaling produces UVs
approximately -0.214286 to1.214286, distinct from layer1's0..1. Initial exploratory
context values exposed zero second-layer UV/tint; these were corrected from
the original load/store addresses, before acceptance, rather than hiding the layer.

The geometry host must explicitly declare center, full parent basis, group
scale and neutral texture-tint fixtures for both layers. Missing context fails.
Source color and alpha come through the original complete chains, while these
parent/center/tint inputs are controlled fixtures. In particular, **source
primitive translation, random parent rotation and parent inheritance are not
reconstructed by setting a center of zero**. Their eventual traversal must
supply this context. Texture sampling, Add shader/blending and timed whole-source
submission are not established by packed two-texture output alone.

## Complete source inventory and remaining gates

The receipt inventories all nine nodes, including the five not handled by this
Quad reference. It records `wholeEffectExported:false` and `approved:false`.

| Nodes | Required whole-source behavior | Current connected export gate |
| --- | --- | --- |
| 0, 1 | Root and shared parent; parent rotation has source randomness | Constant parent adapter cannot reproduce this initialization |
| 2, 3, 4 | Quad geometry, source Default transform, velocity scaling/translation, alpha, flat color | Full module/writer chain executes with controlled center/basis; primitive/parent placement still requires traversal |
| 5, 6 | Independent parent lifetime and Quad with two-texture Add/second UV scale | Packed second UV/tint now executes; traversal, source tint and two-texture material/submission not connected |
| 7, 8 | Null generator count 5 over duration 3, moving/random parent and child Particle | Nested births/RNG/inheritance not connected; cannot reuse a single stationary Particle |

These gates are shared renderer capabilities, not missing filename mappings or
reasons to tune this skill manually. Keep this same target until all nine nodes
pass through the connected exporter. Do not replace it with the three Basic
Quads, silently discard the Add layer/child particles, or call it a complete
Brave Slash import. The existing exporter intentionally continues to reject it.

The next implementation boundary is source primitive/parent/generation traversal,
then source material context and two-texture submission in that same
whole-effect path. Existing recordings can be used for comparison once output
exists. No new recording is justified by the current offline gaps alone.

## Pinned identities and reproduction

APK/native hashes remain those of the [connected export reference](connected-effect-export.md).
Quad functions, verified against defined ELF symbol addresses/sizes:

- AssignModule: `0x20136b4`, 5832 bytes, SHA256
  `e4bdc530e14d7e9c28398c5cae2dce50cf45f88c1b275faa132249a906599f95`.
- GetModuleCount: `0x2012570`, 3208 bytes, SHA256
  `461a9b1dd5da50bcce7750ba1c6687d4b75ee96c8c13c7eca569acb46e4c6e70`.
- GetModuleWorkSize: `0x20131fc`, 1204 bytes, SHA256
  `807e71e4cf62e22abcc0b80ea783997ba2c6c35b321ec026d8f7209f91d59100`.

```powershell
$env:PYTHONPATH=(Resolve-Path tools/data/native-locator-emulation/python-deps).Path
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' tools/memorial/emulate_quad_assignment.py --apk tools/data/memorial-audit/installed-base-v208.apk --source tools/data/shared-skill-review/brave-slash-composed/originals/atk_slash1_white.bmb --probe-chains --output tools/data/connected-effect/brave-slash-quad-chains.json
```

Omit `--probe-chains` for selection/profile only. For local geometry, create
an explicit host fixture under ignored tools/data with fields center[3],
groupScale[3], parentBasis[9], textureTint[4] and textureTint2[4]. Current receipt
uses zero center, identity basis/unit group scale and neutral tints; none are
claimed as reconstructed parent or material values.

```powershell
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' tools/memorial/emulate_quad_assignment.py --apk tools/data/memorial-audit/installed-base-v208.apk --source tools/data/shared-skill-review/brave-slash-composed/originals/atk_slash1_white.bmb --geometry-host tools/data/connected-effect/quad-geometry-host.json --output tools/data/connected-effect/brave-slash-quad-geometry.json
```

All modes inventory every source node; none exports a playable effect.
Generated host/receipts stay ignored. The whole-source connected exporter
continues to reject this nine-node source instead of exporting four Quads alone.

## Actual checks

76 Python tests pass with no skips: eleven Quad checks, 54 preceding Particle
reference checks and eleven connected acceptance checks for both full baseline
effects. Tests cover source mutation, deterministic execution, native profile
agreement/guards, complete make execution, native writer choice, second-layer UVs,
parent-basis/center controls, source-color mutation and source-operation writer
switching. Missing parent context and Particle layouts reject. `git diff --check` passes.

No browser preview, game build, live emulator operation or new capture was run
for this CPU-reference change. The existing connected viewer and published
game effects are unchanged. This resolves local Quad geometry/output as well as initialization/update, not
completed combat-effect acceptance or general skill support.
