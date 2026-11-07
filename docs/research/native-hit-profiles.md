# Native hit profiles and loaded ability reference

## Current actual body trace: Big Shot Motion8 and independent Store Motion2

Observer36-r2 in the pinned Memorial v208 clone, native library SHA
6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77.
Evidence root tools/data/full-import-path-20261101/. Source/rollback hashes in
diagnostic-final.json. Same-signature update, no uninstall/data clear.

Big Shot227870: actual native form207000206, pointer0x70542d809df0.
reserveSpecialAction -> requested standbyCGS11; atkCGS3 request268038ms;
command getter268039ms is the relative timing reference; first observed actual
atk268066ms (F0). Actual indices0..27, unchanged local[449,571]. Idle reservation
270188ms (wait-1), idle request270204ms, observed idle270205ms (+2166ms).
Hardshot waits88, explosion128; source hitF130. The getter is NOT proven engine
frame0; no direct damage-applied hook or gameplay commit/release timer measured.
No universal Motion8 body or native world-transform immobility claim.

Original getAnimeActionName table proves CGS3=atk,5=magic_atk,11=standby.
BattleUnitSkill vtable slot0xc0 resolves getMotionType; changeActionAnime maps
Motion2 toCGS5 in the measured path, with Motion8 falling through toCGS3.
Receipts: cgs-name-map.json,action-motion-vtable.json,body-action-names.json,
body-routes.json,body-getters.json. Names alone were NOT used to infer semantics.

Independent Store200210 actual Delita253000227: command563806ms, bodyCGS5
request563805ms, actual first563825ms; idle564488ms, approximately682ms.
This independently confirms stationary standby11 -> magic5 -> idle, with body
completion independent of later sourceF130. It does not provide Jack's body
clock; Iai uses Jack's exported body and a declared reviewed contract.

Hook events distinguish requests from actual EdgeAnime state. Capture identity,
shared eventseq and capture token retained. r2 deduplicates repeating reservations;
600-event bounded body budget, unit filtering, no original-state mutation.
Canonical bigshot-body-r2-events.json has463 events; original mixed PID log is
retained but is NOT one execution. store-body-actual-events.json has155 events;
store-body-events.json was an outside-battle attempt and proves no body action.
A first r2 cold-start calibration failed; only startup-r2-cold.log PASS was used.
The earlier image-template evidence below is superseded by these scoped records.

---

Earlier revision notes (historical; current resume above takes precedence):

## Big Shot Motion8: bounded pose comparison, no clip inference (2026-11-01)

Reused native bigshot-reference.mp4/ref07,09,10,11,12,13,16 under
tools/data/big-shot-20261101/. No new Big Shot recording or diagnostic install.
tools/data/control-groups-20261101/match_body.py and match_body_sequence.py
compare masked exported body frames against the original image at the measured
scale3, native crop[580,700,960,1120]. Receipts body-template-candidates.json and
body-sequence-comparison.json retain errors/positions, not just chosen clips.

Some native poses match atk better than limit (ref10 atk13 maskedMSE181.43 vs
limit1222; ref12 atk13~286 vs limit1012). Other frames tie because clips share
poses; best matches are nonmonotonic. These are IMAGE similarities, not original
animation IDs, frame clocks, reservations or hold/release transitions. They do
not prove Motion8 means atk, limit or a complete action. No body adapter or fallback
was added. Original205/206 CGS equality remains separate from texture identity.

Next useful measurement is the actual animation reservation/clip-frame phase
transition in ability227870's execution scope, joined to effect start/hit marker.
Another ordinary video cannot disambiguate shared body poses. Hardshot controls
remain an independent release gate even if this body trace succeeds. Store's
new self-placement measurement uses native form253000227, not a new exact-body
rule for the runtime Delita205 form.

Investigation dated 2026-10-24. This is static/runtime metadata evidence for the
pinned Memorial v208 ARM64 build, not a complete automatic visual import rule.

## Why the observed green slash needs a source check

The Brave Slash video/native capture contains group 1000520 / `atk_slash3_green`
before group 5008050 / `atk_impact_001_pink`. The local ability record lists only
the latter. Do not infer from this alone that every physical skill needs the
same extra slash. Character, equipment, version-specific master data and native
assembly must remain distinguishable.

## Static master layout and observed rows

Native SHA-256:
`6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77`.
The exact-build `HitTypeMstResponse::readParam` stores its current row pointer
at response +0x28. Completed rows contain ID +0x24, effect-group ID +0x28 and
effect delay +0x2c, verified against parser writes and exported getters.
`ProcessTypeMstResponse::readParam` uses the same response pointer offset;
its row ID and hit type are at +0x24/+0x28, verified against getters.

Observer revision 9 added bounded, read-only hooks on these two parsers. It
records completed static rows, including startup before an armed window;
per-parser deduplication is limited to 512 IDs. No account records are read.
Clone-only same-key `pm install -r` succeeded; startup calibration and 22 hooks
passed. Entering the menu produced 33 hit profiles and 173 process profiles,
retained in ignored `tools/data/memorial-audit/diagnostic-v9/master-profiles.json`.

Selected actual rows:

| Profile | Group | Delay |
| --- | --- | --- |
| 1 | 0 | 0 |
| 2 | 0 | 0 |
| 101 | 2000030 | 8 |
| 102 | 2000080 | 8 |
| 103 | 2000132 | 8 |
| 104 | 2000180 | 8 |
| 105 | 2000230 | 8 |
| 106 | 2000280 | 8 |
| 107 | 2000422 | 8 |
| 108 | 2000510 | 8 |
| 109 | 9000220 | 8 |
| 110 | 9000230 | 8 |

Process 1 maps to hit type 2; process 2 maps to hit type 3. These are loaded
master values, not invented physical/magic enums for the game.

## Bounded static control flow

`HitTypeMstList::getSimpleEffectFrameInfo` at 0x1c68e64 reads the command process
and its process master hit type. Positive direct profile groups form a simple
visual effect entry. Hit type 2 can branch to `getSimpleEffectFrameDamage` at
0x1c69294. That function combines eight skill, attack and added-element slots,
counts positive totals, selects 101-108 for one positive slot, 109 for several,
or 110 for none, and reads group/delay from that profile.

This simplified-effect path is called from `BattleUnit::procSkill` at
0x133c5e0 with attack elements and buff-added elements. Its presence does not
prove that path supplied a particular ordinary skill execution. In particular,
profile 110 resolves to group 9000230, not observed group 1000520. No green-slash
fallback has been introduced from this analysis.

Reproduction artifacts under ignored `tools/data/memorial-audit/`:
`hit-profile-static.json`, `process-profile-static.json`, `proc-skill-static.json`,
`skill-source-getters.json`. Use `tools/memorial/inspect_native_calls.py` against
`installed-base-v208.apk` to regenerate bounded disassembly by the named exports.

## Direct loaded-ability comparison

Observer revision 10 additionally accepts an optional `skillIds` array (up to
16 positive IDs) in the JSON arm request. It uses fingerprinted static ability
list/dictionary/getter functions to read the loaded ID, effect frames and attack
frames. It never executes a skill. Getter layouts are ID +0x24, effect string
+0xf0 and damage-frame string +0x108; C++ strings remain bounded to 2048 bytes.
A missing row, ID mismatch or unreadable value is reported explicitly.

`tools/memorial/export_master_reference.py` exports the selected arm window with
same-session profiles and compares exact strings against supplied source JSON.
It requires one arm token, the pinned build, observer >=10 and startup float
calibration. A new boot or arm closes the snapshot window, preventing accidental
joins to earlier attempts. Research outputs stay under ignored `tools/data`.
Revision 10 startup, calibration and 22 hooks passed. The installed APK hash
matched the locally signed APK:
`052cf8bbe923e4f6884b77dac3a9eaf6e480c636140932478609a5be093b1935`.
After menu entry, snapshot token `cloud-master-20261024-021707` returned all three
requested ability IDs. `diagnostic-v10/master-reference.json` retains exact
values and hashes of the tagged log and local comparison sources. It also
retains the 33 hit / 173 process profiles from this same observer session.

| Ability | Effect frames | Attack frames |
| --- | --- | --- |
| 214800 Brave Slash | Exact local/native match | Exact local/native match |
| 214810 Blade Beam | Exact local/native match | Exact local/native match |
| 214820 Climhazzard | Exact local/native match | Exact local/native match |

In particular, loaded Brave Slash still has only
`effectFrames=4:5008050:1:1:0` and `attackFrames=6:100:2:2`. The green group
1000520 is absent from that loaded ability's raw effect list as well. Thus the
observed discrepancy is not caused by a different value of these two master
fields. This snapshot does not identify the executing command, selected unit
form or equipment; it does not prove which assembly path emitted the green hit.

Reproduce the comparison from the saved capture:

```powershell
& $env:FFROGUE_PYTHON tools/memorial/export_master_reference.py --log tools/data/memorial-audit/diagnostic-v10/master-snapshot-log.txt --token cloud-master-20261024-021707 --source tools/data/shared-skill-review/brave-slash/skill-source.json --source tools/data/shared-skill-review/blade-beam/skill-source.json --source tools/data/shared-skill-review/climhazzard/skill-source.json --output tools/data/memorial-audit/diagnostic-v10/master-reference.json
```

Next bounded investigation: observe the actual effect-frame string and caller
at `BattleUnit::playBattleEffect` during one identified Brave Slash execution,
then follow the caller that supplies group 1000520. Join command ID/unit form
before deciding whether this is a reusable skill supplement, body/default attack
effect or another action. Do not treat the existence of generic profiles as
proof they generated this observed group. See the revision 11 preparation below; its new battle observation is not yet verified.

Checks executed: JS syntax, Python compilation, revision 9 actual master reads,
revision 9/10 APK signature v1/v2/v3 and 16 KB alignment, clone-only preserved-data
updates, actual three-ability snapshot export with six matching fields, and five exporter checks covering differing source fields, missing
calibration, wrong build, duplicate token and a subsequent boot. No gameplay
assets changed and no full game build or browser animation review was rerun.


## Revision 11: command and effect-input provenance

The clone-only preserved-data update was installed and its APK hash verified:
`052807d233d614cc9d8ccdb611966dad752730d6af03f18326feb768e707c781`.
JS syntax, Python compilation, APK signature v1/v2/v3, 16 KB ZIP alignment,
startup calibration and 25 hook registrations passed. Evidence is retained in
ignored `tools/data/memorial-audit/diagnostic-v11/`. The subsequent controlled battle capture is reviewed below.

Three additional exact-build hooks observe:

- `BattleUnit::procSkill(bool)`: thread-local execution scope. It emits a start
  only when an actual effect-input call occurs, rather than flooding idle frames.
- `BattleCommandSkill::getEffectFrame()`: bounded command snapshot; the exact
  ID getter reads +0x30, while the frame getter copies the string from +0x38.
- `BattleUnit::playBattleEffect(...)`: actual incoming effect CSV (argument 4),
  caller offset, source/target pointers and current execution context.

Each effect-input call has its own ID, propagated to nested effect-group events;
execution scopes also have IDs. The attached command is explicitly the most
recent frame getter within that scope, not a guaranteed semantic ownership
relationship. Caller and string contents must corroborate it. Calls outside a
procSkill scope retain effect input/caller evidence without an inferred skill ID.
Input calls and unique command snapshots are bounded to 128 per arm window.

Player-unit identity is read only when the object's primary vtable equals the
exported PlayerUnit vtable address point (+16). A nonmatching object remains
unidentified. The fingerprinted PlayerUnit::getUnitMst getter handles active NV
shift master selection; UnitMst::getUnitID reads that returned master's ID.
This is a master form ID, not an account's user-unit ID. Other subclasses and
skin/display overrides remain outside this identity claim. No equipment IDs or
account state are exported by these new hooks.

Static getter evidence: `command-identity-static.json` and
`unit-identity-static.json` under ignored `tools/data/memorial-audit/`.
The source APK/native hashes remain unchanged from the pinned v208 reference.

`summarize_trace.py` now retains `executionRecords` and
`capturedCommandSkillIds`, while leaving `identityVerifiedByTrace` false until a
separate review establishes the relationship. An actual regression run over the
previous Brave Slash capture preserved its 32 renderer states and produced empty
execution/command lists; it did not invent identity for older captures.

Next operation: the developer prepares Brave Slash in a battle without executing
it. Start a uniquely named bounded log/video capture, arm only after readiness,
confirm the arm marker, then request one execution. Inspect actual input strings,
caller offsets, command IDs and nested group IDs before adding any supplement.
The current capture preparation does not change browser plans or game assets.


## Controlled execution: character attack effects precede motion-1 abilities

Capture directory/token:
`tools/data/memorial-audit/brave-slash-command-20261024-042357/`.
The user executed Brave Slash once. The actual command snapshot reports ability
214800; the matched PlayerUnit master is 207000117. Execution 1008, effect-input
1 carries the exact string `2:1000520:1&6:5008050:1:1:0`. The command-frame getter
and actual effect-input strings match. Nested group calls share those same two
context IDs and report group 1000520 with wait 2 and group 5008050 with wait 6.
Thus this is a command-specific join, not an attribution based only on timing.
Later enemy actions and player follow-up commands remain separate and are not
included in this comparison.

The developer clarified that the upgraded Cloud uses the same Brave Slash as the
5-star form. The loaded raw ability fields indeed match. The observed unit form
matters here only for the standard attack visual used by the assembly step:

| Unit master | Unit effect frames | Raw Brave Slash effect frames |
| --- | --- | --- |
| 207000117 (captured) | `2:1000520:1` (slash3 green) | `4:5008050:1:1:0` |
| 207000105 (project recipe) | `2:1000290:1` (slash1 white) | `4:5008050:1:1:0` |

This does not change Brave Slash's identity or its raw skill effect. Do not switch
the project's character form or copy the green group into every skill.

### Static assembly rule

`BattleCharacter::reserveSpecialAction(int)` begins at 0x13c4088. At 0x13c4174
it checks the skill motion type against 1. The getter/setter vtable slots
+0xc0/+0xc8 resolve to BattleUnitSkill::getMotionType/setMotionType; the getter
reads +0x174. This corroborates the source field used by the composition helper.
The motion-1 path obtains the unit's standard damage/effect timelines through
virtual slots +0xf70/+0xf78; the PlayerUnit vtable resolves these to
BattleCharacter::getDamageFrame/getEffectFrame. The latter reads the selected
unit master's effect string (+0x188).

For each supported effect branch, the path finds the unit's maximum effect start
(`getMaxEffectFrame`, call at 0x13c4a94), adds that offset to the corresponding
skill branch (`addEffectFrame`, 0x13c4b40), then concatenates the unit effects and
shifted skill effects (`combineEffectParams`, 0x13c4c68). The addition changes
entry start fields, not particle duration, geometry, offsets or shader settings.
The native separators are `@` between branches, `&` between entries and `:`
between fields. This is not a universal hardcoded +2 delay.

Static evidence files under ignored `tools/data/memorial-audit/`:
`character-effect-assembly-static.json`, `add-effect-frame-static.json`,
`character-assembly-getters.json`, `character-assembly-vtable.json`,
`effect-combination-callers.json`. These use the same pinned APK/native build.
The neutral simplified-hit profile investigated earlier is a separate path; it
is not the explanation for this captured green slash.

### Reusable bounded composition inspector

`tools/compose_skill_effects.py` reads the exact unit/ability from read-only SQLite,
applies the motion-1 rule and writes an ignored research receipt. It supports
ordinary single-branch 3-5-field entries and rejects missing, malformed or branched
effect input rather than guessing. Other motion types preserve the raw skill
effect list. No equipment or skin overrides, extraction, damage reconstruction,
preview mutation or runtime publication are performed.

```powershell
& $env:FFROGUE_PYTHON tools/compose_skill_effects.py --unit-id 207000117 --skill-id 214800 --trace tools/data/memorial-audit/brave-slash-command-20261024-042357/summary.json --output tools/data/memorial-audit/brave-slash-command-20261024-042357/composition-verified.json
& $env:FFROGUE_PYTHON tools/compose_skill_effects.py --unit-id 207000105 --skill-id 214800 --output tools/data/shared-skill-review/brave-slash/composition-five-star.json
& $env:FFROGUE_PYTHON tools/test_compose_skill_effects.py
```

The first command matched actual execution input exactly and has
`traceVerified: true`. The second predicts
`2:1000290:1&6:5008050:1:1:0` for the existing project form using the same native
rule, with `traceVerified: false`: that form was not executed in this capture.
Both retain `approved: false`. Source database SHA-256:
`ab176368d6a8faa9319f471f3f0138ec4c578cf131c759a593479dac9487183f`.

Checks executed: five composition tests (including actual native command output,
nonconstant offsets, nonattack motion and rejected unsupported inputs), Python
compilation, trace summarization, exact command/unit/group/wait joins, both CLI
inspections and `git diff --check`. The 16,584,883-byte original MP4 was pulled and
one frame decoded with FFmpeg. The recorder was stopped with SIGINT only after
checking its unique output filename; the owned host log process was stopped.
No new browser playback, game build, final scale calibration or fidelity approval
was performed. The source-only browser plans and public assets remain unchanged.

Next bounded publication-independent task: resolve/stage the composed source
members for the existing 5-star recipe and feed their shifted visual timeline
into the common research preview. Preserve each member's unit-vs-skill origin;
keep body pivots, renderer scaling and game damage events independent. This is
one recovered assembly rule, not a claim that all skill families are complete.


The next bounded task above is now implemented for Brave Slash in the separate
[composed preview review](brave-slash-composed-preview.md). It uses the existing
5-star form, staged exact original members, explicit origins and shifted starts.
Source-only baselines and public gameplay assets remain separate.
# Big Shot Motion-8 decision, 2026-11-01

Existing revision35 observer was used without rebuilding or reinstalling. ADB
127.0.0.1:5575 reached FFBE Trace, package com.square_enix.ffbejpn. New token,
command-frame-source227870, executionId16880 and associated placement/factory
events verify actual hook activation. Native unit207000206 was observed; runtime
Barret is207000205. Their atk,limit_atk,move,standby,magic_atk CGS files compare
byte-identically, but this is NOT proof of native clip selection.

Original input: Motion8,Move4,effect88:5027690:1:1:0,hit130:100:2:2,MP16.
The12-second screenrecord shows preparation, a small forward/reposition sequence,
a ranged shot and the target explosion/hit. Video timestamps are not effect ages.
Neither atk nor limit_atk has been positively linked to the native action.
getMotionType reads the raw field at0x174; inspected procSkill/call sites do not
resolve its body-selector semantics. Motion8 must remain unapproved, rather than
receiving a guessed normal attack or limit clip. Two bounded code routes were
inconclusive; no broad disassembly loop was continued.

Evidence tools/data/big-shot-20261101/: bigshot-reference.mp4 and .log,
bigshot-events.json, bigshot-reference-recording.json, bigshot-motion-contact.png,
barret-track-comparison.json, proc-skill-code.json, motion-type-callers.json.
Native206 form is explicit; no native whole-action fidelity claim for205.
Party addition to the empty third slot is reversible; app data/assets/install
were preserved. Recording arm was disarmed after capture.

Big Shot is NOT published. Remaining independent gates: missing Hardshot
controls/compatibility/material-emission selectors and exact Motion8 body/timing.
Placement is now measured separately, see native-effect-placement.md. Next small
body diagnostic would observe reserveAnime/clip transitions in this exact skill
scope; an ordinary second video cannot prove clip identity. No new installation
was needed or attempted in this block.
