# Brave Slash effect integration

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


Current render-context extension after6ab0858: ordinary Cloud/Legacy visuals
retain0 changed frozen pixels. The opt-in source packet profile now carries UV2
independently and admits bounded Particle draw bases/atlas rectangles. Original
instruction and controlled GPU shader checks pass; complete Android effect pixels
are NOT yet captured. Diagnostic35 is installed/calibrated; manual Brave Slash
preparation is pending. Use the newest map entry and diagnostic-v35-render-context
receipts; deferred writer hooks must still be observed firing.

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

Current2026-10-27: the published user-confirmed Cloud scene remains unchanged.
A separate explicit partial-data profile now calculates attack-prefix Quad2/3/4/6
from source/RNG/computed parents and consumes full packets in the SAME product
player.32 packets match original writer instructions; live records/centers and
product buffers/natural end are checked. It does not replace the complete skill:
7->8 Particle output, live trim/global uniforms/GPU order and native pixel approval
remain open. See the newest reconstruction-map entry; no new reward/skill binding.

Body/effect checkpoint: user-confirmed visual baseline is retained. The exact
body clip now starts return independently of the187-frame scene; the game joins
body recovery/effect end/reviewed damage before advancing. Recovery was observed
around1233ms after effect start. Movement/hit-stop remain reviewed adaptations;
see the central map and tools/data/choreography/product-cycle1.json.

Current live-scene migration (2026-10-26): normal Source preview mode now plays
the preserved composed/native-null plan through the same player in the actual
game. Models/layers/native-blend candidates are retained; Legacy flashcut sheets
remain selectable. Product versus matched preview compositor at source F24 has
zero pixel differences outside measured game overlays. This is preview parity,
not native fidelity; nine-node whole-source acceptance remains0/9. MP18 and the
reviewed F6 damage event remain unchanged. See the central map for commands,
profiles, pixel receipts and remaining approximation policies.

## Visual recovery and display transfer (2026-10-26)

Both older calibrated and later composed/native-null plans, source resources and
screenshots are frozen before edits; all dependencies validate and isolated replay
renders F42. The larger pink-ring source preview is preserved, not replaced by
the current flashcut sheet. The product now uses reviewed linear sampling with
extruded gutters for that sheet; all90 historical frame interiors are unchanged.
This is a modest display adaptation, not adoption of the complete35-node impact
or nine-node prefix. Source starts F3/F6,18MP/body pivots remain unchanged.
An isolated fresh bake differs from historical pixels; those new pixels were not
published. See the map's visual checkpoint for exact repro limits and A/B receipts.

## Autonomous shared-runtime checkpoint (2026-10-26)

Native phase clock and bounded Particle lifecycle/ConstX/VelocityX/scalar alpha
now share actual product code.125 Node tests and the five-case real WebGL check
pass, including unchanged Motion-1 Brave. This does not replace the nine-node
white prefix:0/9 full source nodes accepted; source Initialize/child/RNG/parent
ownership and remaining modules are still blocking. The new dynamic control
is not mapped to Brave or any skill. See the map's current autonomous section for
exact native receipts, supported profile and next dependency; no new game capture.

## Previous lifecycle checkpoint (2026-10-26)

The published Motion-1 composition below is unchanged. The original nine-node
prefix now has a reproducible numeric trace from the common player and matching
native activation for all9 nodes. This is not a whole-effect reconstruction:
0 nodes have complete native-matched birth/parent/module/RNG/death histories.
Known source delay-window and disabled-emitter rules are integrated offline;
full native RNG ownership and source lifecycle still block replacement publication.
See SKILL_RECONSTRUCTION_MAP.md current lifecycle checkpoint for per-node evidence,
31 player/lifecycle checks and the exact required original NodeTree measurement.
The in-game white/pink spritesheets, F3/F6 composition and18MP remain intact.

## Current source-composition checkpoint (2026-10-26)

The historical single-effect behavior below has been superseded. The shared
character importer now derives ordinary motion-1 composition from exact-form
unit207000105 plus ability214800, resolves all members and binds reviewed recipes.
Compiled presentation: white attack1000260 at F3 (group F2 + member1), pink impact
5006440 at F6 (raw skill F4 + latest unit group F2). Gameplay remains one reviewed
F6 hit/18MP; action duration covers the96-frame prepared visual budget plus return.
Single-target melee and area use the same scheduler. No Cloud-specific renderer
branch was added. Full provenance is in public/assets/units/cloud/character.json.

Product WebGL check tools/test-source-presentation.html passes: white50.5ms,
pink101.5ms at the target world center, action1960ms, one hit/18MP, no effects
remaining. Legacy comparison leaves pink active at action completion1398.3ms.
Blade/Satellite controls pass.14 import tests,34 combat checks and build pass.
Ignored proof/receipt: tools/data/reconstruction-map/source-presentation-product.json,
attack_slash_white-product.png and brave_slash-product.png. Central evidence and
next blocker: SKILL_RECONSTRUCTION_MAP.md current checkpoint.

This integrates the native-proven composition rule, not complete native pixels.
White uses the existing converted orthographic profile; pink retains its reviewed
flashcut adaptation. Complete BMB lifecycle/parents/RNG/material behavior and a
synchronized exact-form original whole-skill reference remain missing. Historical
sections below describe the earlier implementation and are not current timing.

## Asset and reproduction

Master mapping: ability 214800 -> group 5008050 -> effect 5006440 ->
`atk_impact_001_pink.bmb`. The local ExviusReborn package supplies a converted
`atk_impact_001_pink.efkefc` and a companion `atk_impact_001_pink_flashcut.efkefc`.
The first bake visibly produced a large white rectangular flash in battle.
The companion variant has no white.png dependency and omits that flash plane;
it was baked and checked again in battle. Other model edges remain part of the
converted effect. This is not a claim of pixel-identical original playback.

Run `node tools/export_brave_slash.mjs`, then open `http://127.0.0.1:3102/`.
Requires the local assets package and previously installed offline Effekseer SDK.
The server serves only allowlisted dependencies and writes the prepared sheet
and provenance manifest to `public/assets/effects/brave_slash/`. Stop after use.
The source SHA-256 and original master file are recorded in the manifest.

The 256-pixel frames are baked against black for additive blending (not normal
alpha compositing), 90 frames at 60 FPS, with an orthographic width of 768 source
units. The frame center anchors to the target sprite's world-space bounds center.
Runtime uses Phaser ADD, depth 1100, and destroys the effect on completion.
Scene shutdown/restart destroys remaining scene objects and timers.

## Runtime changes

- BootScene loads the effect manifest; PreloadScene loads only its prepared sheet.
- Cloud skills.json declares the visual effect and source start frame 4. The
  extraction script preserves this association when regenerating skill data.
- BattleScene starts the effect at frame 4 (66.67 ms), damage at the first
  attackFrames entry, frame 6 (100 ms), relative to the attack pose after arrival.
- The attack pose runs for its exported duration plus the existing 80 ms hit-stop
  before the return movement. Other skills retain their previous timing.
- Delayed effect playback checks battle state and target HP before spawning.
- `rawdata/ffbe_data/` is ignored by Git and Vite's file watcher.

## Verification

- Browser export completed, Pillow checked sheet dimensions 2560 x 2304 and
  inspected sampled frames of the flashcut variant.
- Actual game UI: selected Cloud -> Skill -> Brave Slash. Confirmed pink effect
  over the rat, no large white flash rectangle, one damage popup, MP 100 -> 82,
  return to home position and advancement to Aerith.
- `npm run build` passed, with the existing Vite large-chunk advisory.
- `node tools/test_combat_regressions.mjs`: 17 checks passed, including source
  frame scheduling and suppression of a delayed effect on a defeated target.
- No full run, original-game fidelity comparison, or multi-hit skill verification.

Browser proof: `tools/data/cloud-effects/brave-slash-in-game.png` (ignored).
