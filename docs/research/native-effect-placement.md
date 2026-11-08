# Native effect placement investigation

## Self/caster rectangle: bounded Store reference (2026-11-01)

Reused installed observer35 in FFBE Trace127.0.0.1:5575; no rebuild, install,
data deletion, asset replacement or security-setting change. A fresh armed-token
event and matching execution establish working hooks, independently of ADB.
Previous arm{} was saved and restored after the12-second recording.

Evidence tools/data/control-groups-20261101/store-events.json,
store-reference.mp4,store-reference-recording.json and store-reference.log.
Host video timestamps are NOT effect-age/native-frame identifiers.
Native library remains6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77.

Original execution17861 / ability200210 / native form253000227:
- command-frame-source seq2306:40:5000090:1:3:0.
- battle-effect-input seq2308: caster and target are the SAME object0x70542d851240.
- contexts23/24 seq2309/2310: category3, group5000090, Rect
  [380.6000061,402.7999878,69,94], baseWait40, layer2029.
- factory seq2314: sp_20020_tameru.bmb object0x7053cdb0bcd0; position setter
  seq2311 [421.1000061,457.7999878]. Rectangle center[415.1000061,449.7999878]
  gives residual[6,8], not a new fixed offset. Existing placement scatter remains
  outside the deterministic zero-scatter host policy.
- source scale1, XY scale[1,1], member wait41, rotation[0,0,0], renderer unit scale.

This supports preparation rectangle mode3 with SELF scope reusing target-unit:
its sole target is the caster. It does not establish mode3 for enemy/party skills.
Other scopes explicitly fail rectangle_for_group. Native form227 differs from
runtime205; no exact whole-body selection equivalence is claimed. Complete
Store publication remains blocked by non-flat Quad colors and model Billboard.
Do not change its particles or publish a partial effect to bypass those gates.

## Live Delita placement reference and bounded integration (2026-11-01)

The original static evidence below now has a real live validation. Scope remains
native library SHA6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77.
Installed revision35/56 hooks and float calibration were verified. ADB endpoint
127.0.0.1:5575 is the Trace clone; com.square_enix.ffbejpn. No APK, app-data,
asset, root or security-setting change. Native party was reversibly changed from
Cloud alone to Cloud+Delita. Diagnostic arm was returned to {} after recording.

All paths in this section are relative to tools/data/delita-placement-20261101/.
placement-measurements.json joins command ID, factory object identity, context
rectangle and actual position setter. Raw chant-events.json/sword-events.json,
startup.log and the action logs are retained, not replaced by inferred positions.

| Skill / source | Native rectangle and source placement | Direct observations |
| --- | --- | --- |
| Chant210550, groups3000010/3000011 | right-side Rect[320,0,320,666]; axes2/2, offset[0,240] => API[480,573] before scatter | front[488,570], back[480,572]; renderer positions[488,530,0]/[480,528,0] |
| Cunning Hero's Sword1323010, group61606500 | target-unit Rect[1,240,282,261]; center[142,370.5], axes2/2, zero offset | nine atk_slash6_rand_orange.bmb factories/setters; each residual within8 units |

Original API Y is screen-down; Bishamon converts it with engineHeight1100.
The captured orthographic height1136 is separate: zero-scatter Chant renderer
Y527 projects to logical top-leftY609, not573. Native view is identity, framebuffer
1080x1920, geometryScale1.774999976. Do not apply this recording's dimensions as
runtime constants or equate FFRogue's host arena with this native rectangle.
The shared host now evaluates axes/offsets in API space and converts only the
final position into its Y-up scene. In current1000x1100 FFRogue host, Chant's
root changes from Y366 to-114 (canvas184 to664); this follows source+240 and is
NOT an authored480px correction. Target member zero-offset centers do not move.

Static unit-rect-code.json plus exact vtable slot#a00 confirm the command caller
uses BattleUnit::getEffectDispRect(bool)0x1372b6c. touch-rect-code.json and exact
unit-symbols-bb8.json identify BattleCharacter::getTargetTouchRect() reading its
stored Rect(+0x430); native effect bounds are not the current exported frame box.
The FFRogue sprite-footprint contract remains a declared host approximation.

Valid videos: chant-reference.mp4 (12s, recorded action with host timestamp JSON),
sword-reference.mp4 (12s). Reference stills chant-reference-08.png (~1.75s video)
and sword-reference-16.png (~1.875s video) show the fountain around the group and
slashes around the target. Native video time is NOT exact effect age. Cunning's
loaded effectCSV starts40, local source plan group starts38: recorded version
mismatch, NOT silently corrected by+2. Exact whole-action timing unverified.
Early Sword renderer samples precede its wait and remain zero/default; they
cannot serve as active matrices or internal RNG values.

Excluded evidence: chant-native.mp4/its extracted stills ended before execution;
after-*.png/stale-before-reload.json were generated by stale Vite3000 transforms.
They do not prove corrected placement. before-placement.json is the deliberate
old-code baseline; final-placement.json is the current3001 capture and records
coordinate policy, new player hash and distinct actual member/target seeds.
comparison-chant.png/comparison-cunning_hero_sword.png document native/before/after
field crops with explicit non-matched-time labels. No pixel-fidelity metric.

Original random scatter is observed but not reproduced by exact source RNG draws.
The authored slash hierarchy has a random full-turn rotation and child offset50.
Replaying plan.seed1 per object previously cloned all nine orbits. Explicit
reviewed-member-streams-v1 separates replay samples without moving target anchors;
this is a reviewed game policy, NOT recovered native RNG initialization. Original
RNG seeds, native per-unit touch bounds and effect-age-aligned full-body playback
remain open. Both corrected skills await Daniel's personal spatial acceptance.

Scope: exact Memorial native library SHA-256
`6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77`.
This is static evidence plus a prepared validation observer, not an approved
preview placement implementation. See [the diagnostic history](memorial-client-access.md).

## Static evidence (2026-10-24)

`BishamonData::setPosition(float,float)` is exported at `0x15bd058`. No direct
ARM64 BL reference was found in the executable sections. Its dynamic relocation
is at `0x2b69250`, inside `_ZTV12BishamonData` at `0x2b69178`: entry offset
`0xd8`, corresponding to `0xc8` from the usual vtable address point after the
two header entries. Direct-call-only discovery is insufficient here.

`BattleFieldEffect::createEffect` calls
`GameUtils::playAreaEffectWithGroupID`. Further symbol inspection located
`GameUtils::playCmdEffectWithGroupID` at `0x149746c` (3780 bytes) and its call
to `GameUtils::playEffectBishamon` at `0x1497d84`.
The actual executed caller still needs live confirmation.

In `playCmdEffectWithGroupID`, the ordinary eight-field effect-member path
parses a vector of 24-byte C++ strings:

| Zero-based member field | Observed use / evidence |
| --- | --- |
| 1 | Effect ID, parsed into w23 at `0x1497a64` |
| 4 | X anchor mode, parsed into w28 at `0x1497a90` |
| 5 | Y anchor mode, parsed into w22 at `0x1497aa0` |
| 6 | X offset, parsed into w25 at `0x1497ab0` |
| 7 | Y offset, parsed into w21 at `0x1497ac0` |

The axis calculation in `0x1497c70..0x1497d30` is:

| Axis mode | Rectangle term | Additional scatter |
| --- | --- | --- |
| 1 | Origin | Random input |
| 2 | Origin + extent / 2 | Random input |
| 3 | Origin + extent | Random input |
| 4 | Origin | Zero |
| 5 | Origin + extent / 2 | Zero |
| 6 | Origin + extent | Zero |

The half factor is explicitly loaded at `0x14978a8`. The rectangle is copied
from the pointer saved from argument x2, then its floats at offsets 0/4/8/12
are used as X/Y origins and X/Y extents. Two `CommonUtils::getRandom(-8,8)`
calls occur at `0x1497c4c` and `0x1497c5c`; their exact endpoint convention has
not been inspected. Scatter is suppressed independently when the axis mode
is greater than 3. Unknown modes are not a supported fallback.

For the ordinary path, final coordinates are rectangle term + member offset
+ enabled scatter. Member offsets are added at `0x1497d2c` and `0x1497d30`;
scatter is added at `0x1497d5c` / `0x1497d60` before the Bishamon call. The
effect scale is applied separately downstream from `EffectMst` offset `0x2c`
divided by 100 (`0x14903dc..0x14903f4`). Thus the member offset is not multiplied
by that wrapper scale in this path. Extended member fields and caller flags can
select alternate offsets; they are outside this ordinary-path interpretation.

For Blade Beam's observed source member `0:5006511:99999999:1:2:2:-1100:0`,
this predicts a rectangle-center anchor, X offset -1100, Y offset 0, with
scatter enabled on both axes. This is stronger evidence than guessing from
one captured coordinate, but rectangle ownership, live branch selection and
mapping into the preview arena still need verification.

## Reproduction

The offline tool requires Capstone (this inspection used 5.0.9, installed only
under ignored `tools/data/memorial-audit/python-deps`). It checks the source APK
and native hashes, resolves ELF dynamic symbols and PLT relocation labels and
writes bounded function disassembly into ignored staging. It does not attach
to a process or search unrelated app files.

```powershell
$env:PYTHONPATH = Join-Path (Get-Location) 'tools/data/memorial-audit/python-deps'
& $env:FFROGUE_PYTHON tools/memorial/inspect_native_calls.py --apk tools/data/memorial-audit/installed-base-v208.apk --function _ZN9GameUtils24playCmdEffectWithGroupIDEiiN7cocos2d4RectEiibbbbPNS0_7__ArrayEP10BattleUnitbi --function _ZN9GameUtils18playEffectBishamonEiiffiibP15AnimeMoveParamsbb --function _ZN9GameUtils21playEffectWithGroupIDEiiN7cocos2d4RectEiibP15AnimeMoveParamsbb --output tools/data/memorial-audit/placement-gameutils.json
```

This command was executed. The other retained receipt is `placement-static.json`
for `BattleFieldEffect::createEffect` and `BattleUnit::createEffectFrameCsv`.
The latter formats a CSV string and was not used as placement evidence.

## Prepared live validation: observer revision 5

The observer now also fingerprints/hooks `playCmdEffectWithGroupID` and captures
its group ID (x1), four rectangle floats through x2, base-wait input (x3), layer
input (x4), and raw flags input (x5). The pointer convention is established by
the function's prologue (`0x14974a0`) and its later `Rect` copy call. It does not
invoke the function or mutate rectangle/offset values.

Nested, thread-scoped context IDs are intended to join these records to existing
setter/filename events. `summarize_trace.py` preserves context records and the
per-object raw context IDs. That association must be checked against a real
trace before treating it as verified target/group ownership.

The clone-only update passed expanded JavaScript syntax, APK v1/v2/v3 signature
verification and 16 KB ZIP alignment. Installed APK hash verified on device:
`8ea68d8d3ea39e0c4b9a305994a1423e280e229b28f5addc8625f378336d97cb`.
Revision 5 startup logged the exact calibration values and `ready` with 15 hooks.
No new live placement-context capture has yet been validated. Downloaded app
data was preserved by `pm install -r`; root and the main instance were unchanged.

Next: prepare Blade Beam, arm a fresh 60-second window, execute once, then compare
the captured rectangle/group and per-object inputs against the axis formula.
If this hook is not reached, preserve that result rather than claiming that the
static function is the active path. Do not apply a global -1100 translation or
infer the preview's target rectangle from captured coordinates alone.

## Revision 5 result and revision 6 caller tracing

The user executed after token `blade-beam-placement-20261024-032140` was
acknowledged. The saved window contains 49 setters and seven filename records,
including the expected wave/blue slash. It contains **zero** placement-context
records and the `command-group` counter did not increment. Thus the inspected
`playCmdEffectWithGroupID` is not established as this test's executed path;
the static formula remains unvalidated against live rectangle inputs. No
preview placement change was made. Receipts are `diagnostic-v5/`'s
`blade-beam-placement-log.txt` and `blade-beam-placement-summary.json`.

Revision 6 records the actual return address at reached float setters from
`GumCpuContext.lr`, plus return addresses from integer setters. Raw addresses
and candidate libgame-relative offsets are retained; confirm they lie inside
the pinned module before resolving a containing function. It also observes
`BishamonDataList::addAnime` input filename/result pointer and two alternate
group wrappers. The alternate rectangle pointer convention was inspected in
`placement-alternate.json` / `placement-gameutils.json`; wrapper reachability
still requires a live test. These hooks are observations, not native calls.

The CModule callback now forwards LR as an additional pointer argument. Its
object/float calibration passed again with exact values. Clone-only update
and installed APK hash verification succeeded:
`e8988f57c645061e579abde39c47179c5948a24b20548b417886cac53612b5cc`.
Syntax, signature v1/v2/v3 and ZIP alignment checks passed; startup reported
revision 6 and 18 hooks. Caller addresses/factory results have not yet been
collected in a controlled battle. Prepare a fresh token before another test;
use the observed callsite to select further disassembly rather than guessing
more function names. Main instance, root and published game assets are unchanged.

## Revision 6: live context and placement verified for Blade Beam

Token `blade-beam-callers-20261024-032519` was acknowledged before the user
reported execution. The window contains 13 effect objects, 91 setters, 13
filename/factory results, and 24 paired context enter/end records. It includes
other battle actions; those are not imported as Blade Beam components.

The actual path is `BattleUnit::playBattleEffect` ->
`GameUtils::playBattleEffectWithGroupID` -> `GameUtils::playEffectWithGroupID` ->
`GameUtils::playEffectBishamon` -> `BishamonDataList::addAnime`. Setter return
offsets `0x15becfc`, `0x14903f8`, `0x149040c` and `0x1490460` lie in the pinned
library's inspected functions. Both expected filenames are joined to the exact
source group IDs through thread-scoped object context records. Ability/form IDs
are still not captured, so this proves component/group identity, not the entire
character acquisition record.

| Measurement | Green wave / group 5003901 | Blue slash / group 1000660 |
| --- | --- | --- |
| Native rectangle (x,y,width,height) | 0, 0, 320, 666 | 5.800003, 155.600037, 339, 409 |
| Source axis modes | 2, 2 | 2, 2 |
| Source offset | -1100, 0 | 0, 0 |
| Center + offset | -940, 333 | 175.300003, 360.100037 |
| Captured position | -932, 333 | 171.300003, 364.100037 |
| Residual scatter | +8, 0 | -4, +4 |
| Captured base wait + member delay | 2 + 0 | 6 + 1 |
| Captured setter wait | 2 | 7 |

Both residuals are integer-valued within the observed `getRandom(-8,8)` call
range, consistent with the statically recovered mode-2 scatter path. This does
not independently identify the RNG draws or validate every mode/flag branch.
The delays are explained by the captured caller base plus source member delay;
the shared +2 relative to the preview starts comes from caller inputs in this
test, not a constant to add to every imported skill.

The reached caller was resolved using ELF function bounds:
`BattleUnit::playBattleEffect` begins at `0x1331298` (2160 bytes); its call to
`playBattleEffectWithGroupID` is at `0x1331854`, return `0x1331858`.
The disassembly is retained in `placement-live-caller.json`. It obtains the
field rectangle, chooses a player/enemy side field rectangle earlier in the
function (`0x1331454`, `0x1331470`), then copies that side rectangle for source
anchor mode **2** at `0x1331654..0x1331668`. Mode **1** selects a unit rectangle
through a virtual call at `0x1331694..0x13316b4`. The live values align with those
two distinct paths. The old staging label `target-group` must therefore not be
interpreted as the mean of living target positions: this native path uses a
side field rectangle. Other modes and unit-rectangle bounds remain separate
questions.

`summarize_trace.py` now emits `placementVerification` for exact matching group,
ordinary eight-field, unflipped members with one observed object context. It
checks placement residuals and caller-base/member-delay composition; unsupported
or ambiguous contexts are reported instead of silently validated. Uncalibrated
captures are rejected as validation evidence. The following command and explicit
assertions on both expected component results were executed successfully:

```powershell
& $env:FFROGUE_PYTHON tools/memorial/summarize_trace.py --log tools/data/memorial-audit/diagnostic-v6/blade-beam-callers-log.txt --token blade-beam-callers-20261024-032519 --source tools/data/shared-skill-review/blade-beam/skill-source.json --output tools/data/memorial-audit/diagnostic-v6/blade-beam-callers-summary.json
```

No new emulator test is needed to establish these two component measurements.
The next preview task is an explicit bridge from native side/unit rectangles
and coordinate units to the preview arena. Preserve that adaptation boundary:
do not hardcode `[0,0,320,666]` or the captured target rectangle as every arena's
geometry, and do not claim native particle-renderer fidelity. The preview still
uses its earlier placement pending that bounded implementation/review.

## Shared preview bridge implemented (opt-in research mode)

`prepare_original_preview.py --rectangle-placement` now retains an explicit
placement record per ordinary eight-field member with source anchor 1/2:
rectangle source, independent axis modes and additive offsets. Unknown anchors,
extended tuples and unknown axis modes fail preparation. Old plans stay on
their previous point-anchor policy; no runtime/public asset is changed.

The shared `sourceRectanglePoint` evaluator applies the recovered axis/offset
rule. `presentationAnchor` bridges it into the preview only when explicit
rectangle metadata and bridge settings are supplied. The chosen adaptation is:

- Target-side rectangle: left half of the current arena, independent of target
  count/selection, rather than a centroid of enemy feet.
- Target-unit rectangle: the prepared sprite frame box positioned by its pivot
  and scale. This is not the original unit's native symbol bounding rectangle.
- One source unit per preview pixel and zero scatter for stable review. The
  helper also supports a uniform units-per-pixel bridge; the same conversion
  scales both placement offsets and effect geometry, independently of member
  scale. This is a coordinate adaptation, not a recovered native camera scale.
- Arena top-left canvas coordinates are converted to local bottom-left source
  coordinates and then to the existing WebGL world. The legacy +50 point-anchor
  adjustment is not used by this opt-in path.

The UI displays this adaptation policy explicitly. The previous "fields not
evaluated" warning remains on legacy plans; the opt-in path reports adapted
bounds/zero scatter instead. Existing source starts and effect scales are kept;
no global native +2 lead or per-character correction was introduced.

```powershell
& $env:FFROGUE_PYTHON tools/prepare_original_preview.py --source tools/data/shared-skill-review/blade-beam/skill-source.json --unit cloud --recipe tools/characters/cloud.json --authoring rawdata/assets/battle_effect/atk_aerialslash_001_green.bmsln --authoring rawdata/assets/battle_effect/atk_slash5_blue.bmsln --scene-composite --withhold-untextured --inheritance --source-appearance --basic-uv --rectangle-placement --output tools/data/shared-skill-review/blade-beam/plan-rectangle-placement.json
node tools/preview_original_skill.mjs --plan tools/data/shared-skill-review/blade-beam/plan-rectangle-placement.json --port 3123
node --test tools/test_original_effect_player.mjs
```

These commands were executed. All 15 player checks passed, including captured
native coordinates, mode-dependent scatter suppression, unknown-mode rejection,
target-independent field placement, unit movement and consistent coordinate
scaling. Legacy movement/anchor/rendering checks still pass.

Browser verification loaded the opt-in plan, reported eight passing GPU blend
checks, exercised both reactor and forest arenas and upper/lower target choices,
and sought to F10/F14/F20. Hit effects appeared by the enemy sprites. **The green
wave was outside the visible scene in these inspected frames.** The correct
member offset exposes the remaining effect-geometry/camera mapping limitation;
the bridge is not accepted as a complete visual reconstruction. No guessed
translation, rotation or scale was added to bring the wave back into view.
Screenshots are retained in ignored `diagnostic-v6/rectangle-*.png`.

The next bounded work is to compare the original effect's local geometry and
camera/unit conversion with this explicit bridge. Mathematical placement tests
do not establish visible native fidelity. Keep the opt-in candidate separate
from the legacy comparison and published Phaser effects until that review.

The subsequent [native renderer-scale investigation](native-renderer-scale.md)
identified and measured a missing global geometry multiplier (1.775 at the
reference client's 640x1100). Its explicit shared-player candidate on port 3124
makes the wave visible while preserving this placement/offset calculation.
That later result supersedes the out-of-view observation for the unscaled
rectangle candidate; it does not establish complete renderer fidelity.
# Big Shot target rectangle, 2026-11-01

Native revision35 existing observer, execution16880/ability227870, group5027690:
getEffectDispRect input[1,240,282,261], baseWait88, layer2023. Linked factory
objects are sp_20108_hardshot at[141,376.5],scale1,rotation0 and
eff_explosion_normal at[148,367.5],scale3,rotation0. Target center[142,370.5]
places both samples within the existing bounded scatter, not an enemy-group
centroid. Caster activation groups9000110/9000120 use a different rectangle
[402.2,457.6,101,111] and must not be confused with the skill's target VFX.

Evidence: tools/data/big-shot-20261101/bigshot-events.json, seq1895..1919,
paired video and host timestamps. Source unit207000206 is explicit. This supports
the existing general target-unit rectangle convention; no new target offset or
renderer change was introduced. No seed/RNG value is inferred from scatter.
Big Shot remains blocked on controls and body selection, not placement alone.
