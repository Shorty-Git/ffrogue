# Source-gated Particle alpha preview integration

Body/effect checkpoint: Climhazzard now returns around1238ms after effect start,
while its201-frame scene runs independently.52MP/reviewed damage and all prepared
alpha/X eligibility limits are unchanged. Recovery screenshot/actual action traces
are preserved in tools/data/choreography/; this adds no native alpha/RNG claim.

Current product migration (2026-10-26): Climhazzard's preserved native-alpha plan
now also executes in real combat through the same player and explicit
experimental scene profile. Its5/7 scalar-alpha and1/7 native-X eligibility limits
remain unchanged; other nodes retain declared preview policies. F35 front-pass
product pixels match the retained compositor under the same host outside game
overlays. No full original-frame match or source-wide native simulation is claimed.
Legacy/no-VFX remains available; MP52 and the reviewed damage event are preserved.

Visual preservation (2026-10-26): Climhazzard's native-X/native-alpha plan and
existing bound-host A/B screenshots are archived with code/SDK/resource hashes.
The saved plan replays in an isolated copy; bound-host F35 readies with5 GPU checks
and5 declared anchors. Ordinary F53 is skill F35 and has a new hashed capture.
The product command remains legacy/no-VFX; scalar alpha is integrated only in the
bounded controlled Particle program, not as full Climhazzard playback. Native
reference corpus is exclusively the three Cloud skills; Satellite is not evidence.
See SKILL_RECONSTRUCTION_MAP.md visual checkpoint for the retained states and gaps.

## Implemented boundary (2026-10-25)

The [verified scalar evaluator](native-scalar-alpha.md) now has an explicit
research-plan switch and per-node eligibility checks. It changes only eligible
local Particle alpha. The existing scalar/vector evaluator, other node families,
parent-alpha combination, source geometry and material equations are unchanged.
No runtime effect was published, and no new recording/emulator use was needed.

`tools/memorial/prepare_scalar_alpha_plan.py` creates a separate unpublished
candidate. It checks original effect hashes, node identities and exact decoded
alpha keys against the input plan, then invokes original module assignment.
Only nonempty curves selecting original InitCurve0x20025ec and UpdateCurve
0x2002af4 receive metadata with the pinned native hash, source hash and keys.
The original candidate plan is not overwritten or modified in memory.

The player requires plan.nativeScalarAlpha, active source appearance, Particle
type3, IBMB Curve alpha, matching source/native evidence and unchanged valid
keys. Unknown wrappers, stale keys/hashes, other types and unsupported keys do
not qualify. Existing nonqualifying nodes keep their declared old path; this is
not an expanded native support claim. The renderer exposes setNativeScalarAlpha
for an independent A/B switch, bounded by the candidate plan flag.

## Actual preview review

Climhazzard's separate plan-native-alpha.json qualifies5/7 Particle nodes.
The bound-host page has a labeled checkbox and reports eligibility plus sampled
old/native local alpha values. Its receipt preserves the active switch and
numerical samples. The independent untextured-primitive gate remains off by
default and is not enabled by native alpha.

Actual in-app browser checks:

- F12 with untextured comparison explicitly enabled in both A/B states renders
  the strobe with visibly different brightness. A screenshot pixel in the observed
  flat flash region (250,550) is RGB147,156,153 native vs136,145,142 old. This
  proves a changed render path, not original geometry/material fidelity.
- Largest sampled local alpha difference is0.092028385 (strobe normalized age
  0.25: old0.335778391 vs native0.427806776). Some linear curves are unchanged.
- F35 readies/renders with native alpha on and untextured comparison off.
- All five GPU host checks pass. The original plan on3141 still readies with
  its49 existing GPU checks and83 retained limitations.

Screenshots native-alpha-on.png / native-alpha-off.png record F12 A/B;
native-alpha-f35.png records the final default-gate view. These and the updated
bound-host-result.json remain ignored in the Climhazzard research folder.
The renderer is still an incomplete source simulation; no whole-skill approval
or universal import success is inferred.

## Reproduction and checks

```powershell
$env:PYTHONPATH=(Resolve-Path tools/data/native-locator-emulation/python-deps).Path
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' tools/memorial/prepare_scalar_alpha_plan.py --apk tools/data/memorial-audit/installed-base-v208.apk --plan tools/data/shared-skill-review/climhazzard/plan-native-x.json --originals tools/data/shared-skill-review/climhazzard/originals --output tools/data/shared-skill-review/climhazzard/plan-native-alpha.json
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/climhazzard/plan-native-alpha.json --port 3142 --host-view game --host-reference tools/data/memorial-audit/pipeline-v23-20261025/effect-host-context.json --host-bindings tools/data/memorial-audit/pipeline-v23-20261025/declared-host-bindings.json
node --test tools/test_native_scalar_alpha.mjs tools/test_original_effect_player.mjs tools/test_effect_host_context.mjs tools/test_preview_host_view.mjs
& 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -m unittest discover -s tools/memorial -p test_scalar_alpha_plan.py -v
```

Server3142, exec session67740. Open `/bound-host.html?skill=214820&frame=35`;
`native-alpha=off` selects the old path. `white=on` is only an explicit unverified
geometry comparison. Existing3141 remains an independent baseline.

Executed35 Node tests (including576 native samples and actual Three transform
evaluation) and3 Python exporter tests, no skips. Tests reject tampered source,
keys/wrappers, published inputs and other node families, verify unchanged
matrices, and confirm the source plan remains untouched. Source/native identities
are those pinned in the preceding scalar report. No full game build was run.

Remaining gates: native birth/traversal/module-resource integration, unexplained
work-budget reservations, make-vertex/geometry and remaining material rules.
This closes a local-alpha integration gap, not those separate capabilities.
