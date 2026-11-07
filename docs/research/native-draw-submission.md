# Native draw submission frontier

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
## Live revision23 result: observation gap closed

Token `pipeline-v23-clim-20261025-a` is positively armed with both pipelineCapture
and pipelineNativeSubmit. The calibrated capture passes the pinned-source audit:
25 completed Particle scopes/25 module returns,16 paired native submissions,
12 actual GL calls and12 exact GPU/root joins; no unreadable/unavailable/ambiguous
events. The retained original-code initializer/six-update replay still matches.

| Effect | Native method | Completed samples | Actual GL calls inside those exact scopes |
| --- | --- | --- | --- |
| atk_blow1_purple | auto-index | 6 | 6 glDrawArrays |
| atk_blow1_purple | indexed | 4 | 0; the draw was already sampled by the auto-index path |
| eff_strobe_white_a50_f30 | auto-index | 6 | 6 glDrawArrays |

For each strobe sample, native vertex count is6 and raw topology selector1;
the observed GL call has mode4(GL_TRIANGLES) and count6. It is strictly between
the matching native entry/return and has the same file/wrapper/draw ID. Its GL
budget is available on entry in all six cases. This is a positive observation
of submission and actual GL execution, not an inference from native return.
The four missing indexed GL samples have alreadySampledDraw=true; do not label
those sampling omissions as missing rendering.

The first strobe pair is nativeSubmitId3/draw958; later draws966,974,982,990,998.
All have actual viewport `[0,1,1080,1917]`, scissor enabled with box
`[0,1,1080,1856]`, FBO0 and runtime program117. Actual-call camera/root snapshots
join once per draw. Root position is `[316,624,0]`, scale is the captured float32
global multiplier `[1.774999976,1.774999976,1.774999976]`, color scale `[1,1,1,1]`.
These also match the separate snapshots after native return.

The strobe is therefore submitted and reaches the observed GL API in this run.
Revision21/22's missing observation cannot justify suppressing it. The precise
reason the older probe did not see these calls remains unproved; adding native
hooks may affect observation/translation, so do not claim a source-material bug
or a controlled A/B explanation. No shader/pixel-readback, per-vertex final alpha
or exhaustive source-primitive ownership is established by program117 alone.

Keep host inputs separate: the source group placement rectangle is640x666 in
this scene; the engine coordinate height is1100; the camera projects640x1136;
viewport and scissor are the physical GL values above. The strobe scissor is not
the640x666 placement rectangle. None becomes a universal constant for another
host or a substitute for source-driven geometry and foreground composition.

Receipt paths are ignored under tools/data/memorial-audit/pipeline-v23-20261025:
arm-clim.json, startup-log.txt, clim-log.txt, complete-log.txt, clim-audit.json.
Reproduce the executed audit with optional Unicorn on PYTHONPATH:

```powershell
$env:PYTHONPATH='tools/data/native-locator-emulation/python-deps'
& '<bundled-python>' tools/memorial/audit_pipeline_context.py --log tools/data/memorial-audit/pipeline-v23-20261025/clim-log.txt --token pipeline-v23-clim-20261025-a --spec tools/data/memorial-audit/diagnostic-v23-submit-r2/pipeline-spec.json --source tools/data/shared-skill-review/climhazzard/originals/atk_blow1_purple.bmb --source tools/data/shared-skill-review/climhazzard/originals/eff_strobe_white_a50_f30.bmb --replay-x tools/data/memorial-audit/installed-base-v208.apk --output tools/data/memorial-audit/pipeline-v23-20261025/clim-audit.json
```

Additional executed assertions check six strobe native/GL pairs, native and GL
counts6, GL_TRIANGLES, available sampling budgets, and all12 exact GPU/root
joins. Twenty-one Node observer tests and nine Python context/audit tests pass,
no skips. No preview/game code or geometry was changed and no full game build
was needed/run. Control stopped after the capture, as announced to the user.
Next milestone can use the recovered host/submission contract in shared renderer
work; time-base/birth scheduling and arbitrary-effect support remain separate.

## Installation checkpoint

The user freed the PC and authorized the live measurement. Revision23-r2 was
installed only in FFBE Trace using same-key install-r. Installed APK hash read
back matches bb3b4ca069d365d76cd0c6890e7dccc746d26c146837f9948480a72cef6afa91.
First launch calibration returned null and was rejected. One clone-app restart
then passes `[1.25,-2.5,3.75]`, revision23, ready32. The native submission mode is
was off during navigation; the capture is now completed as recorded above.

## Offline finding (2026-10-25)

This investigates why the calibrated revision22 trace contains strobe Particle
make/update contexts but no GL call in the strobe's own wrapper scope. Absence
of that observation is not proof of invisibility, batching or a material rule.
No game/preview effect is changed here.

Pinned native SHA256:
`6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77`.
Source APK SHA256:
`9d21fc8b61c9900eaacb1c2ddef2cabcad1e97d2dc720be16ac09b06fc0086b4`.

`Animation::Draw` has separate auto-index and indexed submission paths. Its
model path calls m3r part/buffer-count getters before `DrawIndex`; the other
path submits through `DrawAutoIndex`. The two public methods are four-byte
branches into adjacent implementation bodies, not suitable hook entries.

| Entry | Implementation | Span | Actual API tail branch |
| --- | --- | --- | --- |
| DrawAutoIndex0x15c6c30 | 0x15c6c34 | 92 bytes | 0x15c6c8c -> glDrawArrays PLT0x10fa1d0 |
| DrawIndex0x15c6c90 | 0x15c6c94 | 104 bytes | 0x15c6cf8 -> glDrawElements PLT0x10cfe00 |

Implementation SHA256 respectively:
`a667b4b53df3ae0faf28a74981ba1ec5a6d3b65d3e1c0ffedcbcb49cea3d3ad3`,
`e30b406c783da3a614314462a5f995d65a4608a79e41e3651f729b36d07563a1`.

Both call a shared preparation routine at0x15c6cfc. Auto-index then loads the
vertex count from RenderContext+0x7c, sets first vertex0, and chooses a GL mode
through a table indexed by+0xb8. Indexed loads count/type selectors at+0x80/+0x84,
then offset+0x88 before its GL tail branch. The type selector is a table index,
not an already interpreted GL enum. Unknown selectors must remain raw.

All current observed GL samples in the selected traces use glDrawElements.
That does not establish whether glDrawArrays was reached for the strobe. The
next narrow boundary is therefore native submission versus observed GL entry;
there is no evidence authorizing a visual workaround.

## Revision23 observer candidate

Opt in with `pipelineCapture:true` and `pipelineNativeSubmit:true`, explicit
sampleFiles and a unique token. It is off by default. The existing preparator
checks public wrapper identity/branch bytes and embeds implementation hashes
and heads; the observer preflights those heads before attaching the opt-in mode.

The observer records a paired native entry/return with file, wrapper, draw ID,
submission ID/kind, context pointer and the five bounded context fields above.
After return it reads current GL state and camera/root through that exact draw's
reader, explicitly labeled as **after native return**, not actual GL-call proof.
No graphics or simulation state is modified.

Sampling is limited to six distinct wrapper draws per file/submission kind.
The separate GL budget still has six draws per file; receipts include its used
count and whether that draw was already sampled at native entry. Missing GL
events caused by exhausted/deduplicated sampling cannot be treated as missing
rendering. Dynamic hooks detach with the existing capture-window cleanup.

`audit_pipeline_context.py` requires revision23, explicit opt-in, exact paired
native identity/fingerprints, and strict sequence containment when associating
actual GL events. A nearby GL event, another wrapper or an earlier event in the
same draw is not an observed call inside that submission. Native return alone
never upgrades to proof of GPU execution or source-node ownership.

This probe distinguishes the next useful branches:

1. No selected native submission: inspect the earlier animation draw filter.
2. Native submission observed but no eligible GL sample: inspect API observation
   and preserve sampling limitations before inferring visibility.
3. Exact GL sample observed: use its actual count/state and shared source data
   to investigate material/geometry, without guessed masks or offsets.

## Reproduction and checks

With optional Capstone dependencies:

```powershell
$env:PYTHONPATH='tools/data/memorial-audit/python-deps'
& '<bundled-python>' tools/memorial/inspect_native_calls.py --apk tools/data/memorial-audit/installed-base-v208.apk --function _ZN2ml4bmfw13RenderContext13DrawAutoIndexEPNS0_18DrawProfilerResultE --function _ZN2ml4bmfw13RenderContext9DrawIndexEPNS0_18DrawProfilerResultE --function _ZNK2ml4bmfw9Animation4DrawEv --function _ZN2ml4bmfw7DrawEndEv --output tools/data/memorial-audit/pipeline-v22-20261025/draw-path-static.json
& '<bundled-python>' tools/memorial/inspect_native_calls.py --apk tools/data/memorial-audit/installed-base-v208.apk --range 0x15c6c34:92 --range 0x15c6c94:128 --output tools/data/memorial-audit/pipeline-v22-20261025/draw-submit-static.json
node --test tools/memorial/test_pipeline_observer.mjs tools/memorial/test_particle_observer.mjs tools/memorial/test_locator_observer.mjs
& '<bundled-python>' tools/memorial/test_pipeline_context.py
```

The128-byte inspection window intentionally includes the start of preparation;
the indexed implementation identity in the candidate covers only104 bytes.
The commands above were executed. Twenty-one Node observer tests and nine
Python audit/delegate tests pass, no skips. Source and expanded JS syntax checks
pass, as does git whitespace checking. The revised auditor was also rerun
against the retained revision22 capture with optional Unicorn: its original
initializer/six-update replay remains exact. No new live capture was collected.

Current build: ignored `tools/data/memorial-audit/diagnostic-v23-submit-r2/`.
Unsigned SHA256:
`df37e415142d11c641a416a0c12755ca9dc7c3b659fa9456274225564c8e5ce1`.
Signed candidate SHA256:
`bb3b4ca069d365d76cd0c6890e7dccc746d26c146837f9948480a72cef6afa91`.
Original native/resources were byte-checked; only the appended diagnostic script
entry changed. v1/v2/v3 signature and16KiB alignment checks pass. The older
diagnostic-v23-submit folder is a superseded local draft; neither23 build was
installed. FFBE Trace remains22.

No ADB, computer-control or asset-dump operation was performed in this offline
block. Next live gate is startup calibration, positive arm receipt, and one
selected Climhazzard submission capture. This is diagnostic capability only;
universal skill fidelity and published runtime support remain unclaimed.
