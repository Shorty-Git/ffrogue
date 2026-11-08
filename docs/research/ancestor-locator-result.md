# Ancestor locator capture: result and observer rollback

Subsequent implementation: the [opt-in Null locator subset](null-locator-subset.md)
now preserves the matched source selector and reproduces this measured chain.
It remains an unapproved offline candidate with narrower source/property gates.

Date: 2026-10-24. This supersedes the preparation-only status in
[revision 18](ancestor-locator-observer.md). Current installed observer: **14**.
Revision 19 corrections exist in source and passed offline tests; they are not
installed or performance-verified. No game renderer/assets were changed.

## Capture defect and safe recovery boundary

The user executed Brave Slash under token `ancestor-locator-20261024-191133`
and reported stuttering. Revision 18 recorded 1349 locator calls. A parent scope
remained active while native PostUpdate traversed descendants; their callbacks
were incorrectly attributed to that parent. Dynamic module hooks also remained
attached after their sample budget. This is a plausible instrumentation cause
of stuttering, not a measured frame-time diagnosis.

The strict full-scope summarizer correctly rejected the recording with
`Locator call does not match selected fingerprinted callback`. Its validation
has not been relaxed. The raw recording remains unchanged.

For this exact revision/build, `audit_ancestor_locator.py` retains only the
initial ordered computed-helper/own-module prefix through the first locator
callback. The pinned `NullEmitterNode::PostUpdate` disassembly calls those modules
before traversing children. The audit checks callback order and fingerprints,
session/calibration and source identity. It explicitly excludes 1307 later
calls and marks recovery in the output. Of 12 ancestor samples, nine prefixes
are complete (six for node 1, three for node 33); three empty samples provide
no execution evidence. This does not approve the faulty full recording.

The tag recorder is stopped. Revision 14 was restored using the known same-key
APK and `pm install -r`; no uninstall occurred. Installed hash verified:
`9ae842eb89f442a845965d6199ec51707436edaf14aa4d1e05ce224a38f71557`.
Restored startup reported revision 14, calibration-pass and 27 hooks. The old
arm file was renamed to a capture-specific completed filename to prevent replay
on startup. Main instance was not changed. No subsequent smoothness test was
performed by the agent.

## Actual finding: missing Null/Billboard locator semantics

Source BMB and matching authoring were re-compared successfully. Source identity
remains the pinned pink BMB and native library documented in the preceding audit.

| Source ancestor | Authoring `Detail_Basic_NullType` | Executed native module | Result in retained prefixes |
| --- | --- | --- | --- |
| 1 | Billboard | `transform_locator::update::ZScreen` | Local rotation `[0.4363323152,0,0]` radians is present, but the output basis is diagonal 1.775 and quaternion is identity |
| 33 | Standard | `transform_locator::update::Default` | Translation becomes `[194,864.875,0]` with the same diagonal basis |

The measured root in this capture is `[194,643,0]`. The descendant offset is
`125 * 1.775 = 221.875`, without the inherited X tilt. Both captured white
Particle vertex samples have center `[194,864.875,0]`, consistent with that chain.
The static ZScreen implementation reads local Z rotation, not local X/Y, for its
rotation construction. This explains the previously isolated center discrepancy
without inventing a per-skill correction or disabling every parent rotation.

The shared evaluator currently treats all ControlNull nodes through the same
TRS composition; it has no dispatch for this Null/Billboard source mode. This
is distinct from model billboards and from the Particle display-plane experiment.
`audit_renderer_coverage.mjs` now reports `null-locator / missing` for selected
non-Standard control ancestors, including when they have no drawable mesh.
Fresh coverage finds one such source node in Brave Slash, one in Blade Beam
and two in Climhazzard; all feed draw candidates. Only the above pink chain has
native validation here. Other effects/modes are not thereby approved.

Nonidentity camera behavior, nonzero local Z, other Null variants, compatibility
selection and dynamic/nonuniform scale still need explicit bounds. The next
implementation should preserve the source Null type and add an opt-in shared
locator subset with Standard controls; never a Cloud-only offset or global
parent-rotation suppression. No further recording is required before preparing
that bounded candidate from the existing evidence.

## Observer source correction

Revision 19 now gates calls against the selected module/computed helper and one
own context pointer; it closes the sample after its own locator callback.
Repeated computed calls and descendant tails are excluded. Dynamic listeners
detach outside native scopes when their budget/window ends and their retained
handles are released. These corrections are offline-tested only. Do not install
revision 18 again or claim revision 19's native performance is verified.

## Reproduction and actual checks

```powershell
& $env:FFROGUE_PYTHON tools/memorial/audit_ancestor_locator.py --log tools/data/memorial-audit/diagnostic-v18-locator/ancestor-locator-20261024-191133-log.txt --token ancestor-locator-20261024-191133 --source tools/data/shared-skill-review/brave-slash-composed/originals/atk_impact_001_pink.bmb --authoring rawdata/assets/battle_effect/atk_impact_001_pink.bmsln --output tools/data/memorial-audit/diagnostic-v18-locator/direct-prefix-audit.json
node tools/audit_renderer_coverage.mjs tools/data/particle-geometry/source-features.json tools/data/particle-geometry/coverage-after-locator.json
node --test tools/memorial/test_locator_observer.mjs tools/memorial/test_particle_observer.mjs tools/test_renderer_coverage.mjs
& $env:FFROGUE_PYTHON -m unittest discover -s tools/memorial -p test_ancestor_locator.py
& $env:FFROGUE_PYTHON -m unittest discover -s tools/memorial -p test_particle_trace.py
```

The actual prefix/source audit, fresh three-skill coverage and clone restoration
completed. Offline tests cover prefix rejection/recovery, descendant/context
exclusion, listener detach, existing Particle observation and ancestor coverage.
No game build, new preview publication or whole-animation/timing fidelity test
was performed. Stuttering makes wall-clock timings from this capture unsuitable
for animation timing calibration.
