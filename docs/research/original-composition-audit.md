# Original skill composition audit

Date: 2026-10-22. This is a read-only audit of source composition, followed by
this documentation change. No runtime correction was implemented here. These
are broader open issues; the current implementation milestone concerns dormant
source color/alpha modes, not a claim of complete skill reconstruction.

## Evidence and confidence

The database inspected was `assets/static_data/ffbe-data.db`, SHA-256
`ab176368d6a8faa9319f471f3f0138ec4c578cf131c759a593479dac9487183f`.
Queries used SQLite read-only mode. A full scan of non-null
`effect_group.effectData` split on commas found **70,724 member tuples; every
tuple had eight colon-separated fields**. Field indices below are zero-based.

“Verified” below means directly observed in the data or cited implementation.
It does not mean the original game's interpretation has been recovered.

| Finding | Evidence | Interpretation and remaining uncertainty |
| --- | --- | --- |
| Member field `[2]` sometimes references a second effect | Group `8005440`: `0:8002350:8002355:2:2:2:0:150`. Effect `8002350` uses `lb_207000805_vincent5_back.bmb`; `8002355` uses `lb_207000805_vincent5_back_rev.bmb`. Group `8005441` similarly pairs the front and front-reverse assets. | **Verified references; inferred purpose:** an alternate orientation/side asset. The original selection condition and sentinel behavior are unknown. |
| The second effect is not restricted to one character | Group `5000125`, `auracanon4way_New(enemy)`, uses primary effect `5000070` (`sp_200XX_auracannon.bmb`) and field `[2]` = `5025772` (`sp_200XX_auracannon_r.bmb`). | Supports the alternate-side interpretation. Do not assume that every non-default value resolves to an effect: some scanned values did not. |
| Final member fields form a spatial pattern | Group `1900012`, `HA16_hardshot1(5wayfeald)`, repeats effect `1900012` at frames `0,10,20,30,40`, with fields `[6],[7]` equal to `(-40,-30)`, `(40,-30)`, `(-40,150)`, `(40,150)`, `(0,0)`. | **Verified pattern; inferred meaning:** two-dimensional displacement. Units, signs, origin, scaling order, and coordinate space remain unknown. This is a useful controlled calibration case. |
| Scale values agree with same-file variant names | Effects `1001210`, `1001211`, `1001212`, `1001213` share `atk_slash7_side_purple.bmb`. Their names indicate normal, `purple200`, and two `purple50` variants; `avX1k34K` is respectively `100,200,50,50`. Effects `5006510/5006511` similarly use the same aerial-slash file with values `100/300`. | **Strong inference:** percentage scale. The original transform application order is not established. |
| File suffixes distinguish angled variants | Effects `1001212/1001213` are named with `SR60` / `SL60`; their `fileInfo` suffixes are `:0:0:330` / `:0:0:210`. | **Strong inference:** rotational variants. Axis, handedness, and interaction with side mirroring still need validation. |

For the three current skills, the placement values are already present upstream:

- Blade Beam, group `5003901`: `0:5006511:99999999:1:2:2:-1100:0`.
- Climhazzard geyser, group `5007070`: `0:5004170:99999999:2:2:2:0:40`.
- Climhazzard strobe, group `5002080`: `1:5002110:99999999:2:2:2:0:150`.

`tools/prepare_original_preview.py` retains these in `rawGroupFields`; retaining
a field is not equivalent to rendering its original meaning. Member placement
mode `[3]`, orientation modes `[4]/[5]`, and the interaction with the outer
ability anchor are not established by this audit. The labels “placement” and
“orientation” are hypotheses, not decoded enum names.

## Parallel process groups must not be called conditional by default

`tools/lib/character-pipeline.mjs` currently sets `conditional: branchIndex > 0`
for `effectFrames` segments separated by `@`. The separator alone does not
establish a condition:

- Ability `214120`, Heat Gem: `processId=40@33`, `target=1@2`,
  `targetRange=2@2`, and separate fire/buff visual groups.
- Ability `209050`, Lightning Rod: `processId=1@33`, `target=1@1`, and
  `effectFrames=38:5041588:1:1:0@40:5028102:2:1:0&40:5028111:1:1:0`.

The pinned reference implementation describes parallel `@` fields indexed by
process, with broadcasting for shorter fields. Preserve their association with
process and target groups; neither treating every later segment as conditional
nor flattening all segments into one target is justified. The three current
Cloud skills have no such additional segments, so this is a future-import issue.

## What ExviusReborn actually verifies

Inspected commit:
[`1033846325c50a27511bd1f27dc197a974ae10f2`](https://github.com/Hirurawa/ExviusReborn/tree/1033846325c50a27511bd1f27dc197a974ae10f2).

- [`get_effect_data`, lines 1458–1470](https://github.com/Hirurawa/ExviusReborn/blob/1033846325c50a27511bd1f27dc197a974ae10f2/godot/core/services/game_database.gd#L1458)
  reads only member field `[1]` to look up `effect.fileInfo`. It does not decode
  the other member fields.
- [`_decode_effect_frames`, lines 1968–1979](https://github.com/Hirurawa/ExviusReborn/blob/1033846325c50a27511bd1f27dc197a974ae10f2/godot/core/services/game_database.gd#L1968)
  retains only the outer start frame and group ID. The
  [parallel-field comment at line 2000](https://github.com/Hirurawa/ExviusReborn/blob/1033846325c50a27511bd1f27dc197a974ae10f2/godot/core/services/game_database.gd#L2000)
  documents process-index association and broadcasting.
- [`effect_spawner.gd`](https://github.com/Hirurawa/ExviusReborn/blob/1033846325c50a27511bd1f27dc197a974ae10f2/godot/features/battle/ui/effect_spawner.gd)
  converts the outer start frame at 60 FPS, iterates all groups, and centers each
  wrapper in its container. It omits member delay, scale, placement, layers, and
  file-suffix transforms. This is evidence of that implementation's behavior,
  not an original-engine specification.

No original movement trajectory, coordinate conversion, or 18-frame approach
duration was established. The current preview's approach duration and anchors
must remain identified as presentation choices.

## Minimal contract for later imports

Every active source component should carry:

1. **Provenance:** database hash, ability/group/effect IDs, complete raw tuple,
   original filename, asset hash, and applicable process/target-group index.
2. **Interpretation:** each decoded field's meaning and evidence status
   (`verified`, `inferred`, `unknown`), with evidence references.
3. **Execution coverage:** `rendered`, `unsupported`, or intentionally `adapted`
   for timing, alternate assets, transforms, placement, actor motion, layer,
   resource/material features, and extra group channels.
4. **Validation:** reference source and timestamps, reviewed features, unresolved
   differences, and explicit separation of asset availability, renderer support,
   and visual fidelity.

An unknown or unsupported active component must keep the composition marked
partial. A successful lookup or available asset must not imply original fidelity.
The invariant eight-field member shape can be checked immediately; unknown enum
values and unmatched alternate references should remain visible rather than
being silently accepted.

Groups without effect members also need their full source record preserved.
Currently `prepare_original_preview.py` adds every such group to
`audioGroupsNotPlayed`, retaining only ID, start frame, and `soundsRaw`.
Climhazzard group `7000970`, `SPECIAL_EXPLODE_1`, has null `effectData`,
`1fVZ3rKd=1:98:1`, and null `rPHs9p8F`. The audio interpretation is plausible,
but this audit did not verify the referenced sound mapping; the generic rule
must not discard names or other channels from future groups.

The next composition-specific investigation should use the five-position group
and explicit reverse-asset pairs to test one coordinate convention at a time.
No guessed offsets or revised runtime choreography were introduced by this audit.
