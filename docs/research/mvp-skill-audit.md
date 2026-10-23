# Remaining MVP skill audit

Historical source-inventory snapshot before the Blade Beam and Satellite Beam
imports. Current prepared coverage and remaining missing files are recorded in
[the Satellite Beam import review](satellite-beam-import.md).

Scope: eight existing legacy commands. Source: local read-only SQLite inspection and the three reviewed character recipes. This is an availability and execution audit, not a visual approval or publication.

## Decision

Both Blade Beam effect files and all their direct dependencies are available. It reuses an existing source motion 1/atk, has two rather than ten damage events, and has no screen-wide effect. It still requires composite/group placement review and a multi-hit AoE executor.

**Recommended next milestone:** render and inspect Blade Beam's two source effects offline, review their combined placement, then specify its two-hit AoE timeline. Do not mark it supported or publish it before those checks.

## End-to-end sequence for the next skill

This is the proposed implementation/verification sequence, not newly implemented runtime support. It extends [the existing import standard](../character-import-workflow.md).

1. Resolve exact sprite form to learning series; confirm skill kind + ID and every acquisition condition. Freeze the chosen SQLite snapshot and keep secondary-version evidence separate.
2. Review source motion/movement and mechanics against the recipe. Keep deliberate roguelike balance changes explicit. Unknown motion codes, missing resources and unresolved processes remain blockers.
3. Inspect the complete source composition offline: every effect member, absolute start tick, layer, anchor, scale, rotation, offset and dependency. Render individual effects before reviewing the combined choreography. A visible individual effect is not approval of the combined skill.
4. Define action phases: selected/prepared pose; optional magic readiness cycle; optional approach to selected target using the existing foot pivots; body-pose start and zero point of the 60 Hz skill clock. Spell readiness is separate from that clock.
5. Schedule visual members at group-start + member-offset and damage at source hit ticks with source weights. Define per-target versus target-group placement using reviewed semantics. Account for all living targets and skip defeated targets without duplicating events. Do not interpret opaque group fields as guessed screen pixels.
6. Complete after the body motion, final hit and required effect tail, with reviewed hit-stop behavior. Then return to the exact home foot position, choose the correct resting pose, and release the action lock once. The fixed legacy 900 ms return is not a valid duration for every skill; Barret's prepared atk sheet alone lasts 2133.32 ms.
7. Bake approved composition into standard sheets/metadata with provenance. Validate recipe/source/resource/sheet hashes and dimensions, then publish through the shared catalog. Avoid per-character loaders and never substitute unrelated effects for missing members.
8. Check one and three enemies, every target row, both arena floors, target death during a timeline, MP charged once, healing/low-HP transitions, cancellation/reset and repeated actions. Compare against an original reference when claiming original-game fidelity.

## Eight-skill overview

| Character / skill | Source ID; unlock | Source hit ticks (weight) | Local effect files | Primary work remaining |
| --- | --- | --- | --- | --- |
| cloud / Blade Beam | ABILITY 214810; 5★ L57 | 4 (50%), 8 (50%) | All direct files/resources available; unreviewed | Two-hit weighted damage scheduling. |
| cloud / Climhazzard | ABILITY 214820; 6★ L28 | 4 (100%) | 1 unique required file(s) missing | Missing purple power-geyser effect. |
| aerith / Healing Wind | ABILITY 229750; 5★ L7 | 180 (100%) | 1 unique required file(s) missing | Missing full-cure effect. |
| aerith / Curaja | MAGIC 10290; 5★ L77 | 120 (100%) | 1 unique required file(s) missing | Missing front layer; back layer alone is incomplete. |
| aerith / Banishga | MAGIC 10170; 5★ L36 | 42 (8%), 62 (8%), 82 (8%), 102 (8%), 122 (8%), 142 (8%), 162 (8%), 182 (44%) | 4 unique required file(s) missing | Four unique required effect files are missing (16 scheduled member instances). |
| barret / Big Shot | ABILITY 227870; 4★ L1 | 130 (100%) | 1 unique required file(s) missing | Missing hard-shot effect; the available explosion is only its second member. |
| barret / Grenade Bomb | ABILITY 227872; 4★ L60 | 150 (100%) | 1 unique required file(s) missing | Missing convergence/explosion effect; the available mental-break effect is incomplete on its own. |
| barret / Satellite Beam | ABILITY 227874; 6★ L73 | 125 (10%), 135 (10%), 145 (10%), 155 (10%), 165 (10%), 175 (10%), 185 (10%), 195 (10%), 205 (10%), 215 (10%) | All direct files/resources available; unreviewed | Source motionType 8 needs explicit mapping. |

## Runtime and version limits

- All eight selections are present in their series learning lists. Barret uses sprite 207000205 but series 207000204. Unlock rarity comes from acquisition rows, not ability.rarity.
- All eight recipe body motions exist in both raw tracks and prepared sheets. That does not validate an unmapped source motion 8 as atk.
- Recipe/runtime metadata differences: 0. Matching metadata still describes simplified legacy behavior.
- The stationary runtime applies one impact at 200 ms and schedules return after 900 ms. It does not execute the listed source hit weights, counts or composite effects. Legacy dashes use one 160 ms impact. Only the reviewed Brave Slash visual path uses a source tick for its hit.
- Physical source motion 1 corresponds to the reviewed atk path; motion 8 requires investigation. The magic rows do not specify moveType/motionType, so the recipe magic_atk choice is separate evidence.
- Secondary JP magic 10170 has MP 20, one hit at F65 and modifier 180; the local SQLite has MP 30, eight hits and process parameters 100,99999,2000. These are different snapshots. Curaja JP agrees on base heal 2500/modifier 18 and F120. SQLite remains the selected audit source.
- No original-game fidelity is established by this audit. The current damage/healing formulas remain MVP balance rules.

A general importer report with publishable metadata does not mean these legacy skills have complete effects or original behavior. Its legacy compatibility path accepts the existing commands; the audit above records the separate source/executor blockers.

## Per-skill evidence

### cloud: Blade Beam

300% physical damage, two equally weighted hits to all enemies.

Source MP 30; game MP 30. Runtime body atk: 12 frames, 950.01 ms. Source moveType 4, motionType 1.

- Two-hit weighted damage scheduling.
- Target-group versus per-target effect placement, including the raw -1100 member field; its units/meaning need review.
- Composite effect playback: green slash at F0; blue slash group F4 + member F1 = F5.

| Group start / group | Anchor; layer | Member absolute tick / effect | File and status |
| --- | --- | --- | --- |
| F0 / 5003901 aerialslash_001_green(300) | target-group; front | F0 / 5006511 | atk_aerialslash_001_green.bmb: available-unreviewed |
| F4 / 1000660 slash5(blue) | target; front | F5 / 1000660 | atk_slash5_blue.bmb: available-unreviewed |

Source attackFrames: `4:50:2:2-8:50:2:2`. Source processId: `1`; processParam: `0,0,0,0,0,0,300,0`.

### cloud: Climhazzard

275% physical damage with 50% DEF ignore (process 21); not ignore-cover.

Source MP 52; game MP 52. Runtime body atk: 12 frames, 950.01 ms. Source moveType 1, motionType 1.

- Missing purple power-geyser effect.
- Rotated/scaled composite cuts, target impact and screen strobe.
- SPECIAL_EXPLODE_1 group behavior is unresolved; its sound field does not establish that it is audio-only.
- Runtime uses a simplified 5.5 multiplier and an inaccurate ignore-cover description; DEF-ignore mechanics are not implemented.

| Group start / group | Anchor; layer | Member absolute tick / effect | File and status |
| --- | --- | --- | --- |
| F0 / 5014250 crossslash(50) | target; front | F0 / 1001212 | atk_slash7_side_purple.bmb: available-unreviewed |
| F0 / 5014250 crossslash(50) | target; front | F0 / 1001213 | atk_slash7_side_purple.bmb: available-unreviewed |
| F0 / 5014250 crossslash(50) | target; front | F0 / 1001702 | atk_blow1_purple.bmb: available-unreviewed |
| F20 / 5007070 powergeyser1(purple) | target; front | F20 / 5004170 | atk_powergeyser_001_purple.bmb: missing-effect-file |
| F20 / 7000970 SPECIAL_EXPLODE_1 | target; front | No effectData | sound-only-unreviewed; semantics require review |
| F0 / 5002080 strobe50(white)30F | screen; back | F1 / 5002110 | eff_strobe_white_a50_f30.bmb: available-unreviewed |

Source attackFrames: `4:100:2:2`. Source processId: `21`; processParam: `0,0,275,-50`.

### aerith: Healing Wind

Healing process 2 with base 1000 and modifier 340; additional process 5 with parameters 1 through 8.

Source MP 26; game MP 26. Runtime body magic_atk: 4 frames, 266.68 ms. Source moveType 4, motionType 2.

- Missing full-cure effect.
- Party/group healing anchor and sustained clock through F180.
- Second source process needs explicit semantic review and implementation; runtime only heals living allies with a simplified formula.

| Group start / group | Anchor; layer | Member absolute tick / effect | File and status |
| --- | --- | --- | --- |
| F40 / 5016610 fullcure_white | target-group; front | F40 / 5014960 | eff_fullcure_white.bmb: missing-effect-file |

Source attackFrames: `180:100:2:2`. Source processId: `2@5`; processParam: `0,0,1000,340,100@1,2,3,4,5,6,7,8`.

### aerith: Curaja

Healing process 2 with base 2500 and modifier 1800; group target.

Source MP 30; game MP 30. Runtime body magic_atk: 4 frames, 266.68 ms. Source moveType not provided, motionType not provided.

- Missing front layer; back layer alone is incomplete.
- Front/back party-layer composition and healing event at F120.
- Recipe magic_atk is an explicit runtime choice; the magic row has no motionType/moveType columns.
- Runtime uses simplified healing rather than the source formula.

| Group start / group | Anchor; layer | Member absolute tick / effect | File and status |
| --- | --- | --- | --- |
| F40 / 3000750 cure5_F | target-group; front | F40 / 3000760 | wm_1029_cure5_front.bmb: missing-effect-file |
| F40 / 3000760 cure5_R | target-group; back | F40 / 3000770 | wm_1029_cure5_back.bmb: available-unreviewed |

Source attackFrames: `120:100:2:2`. Source processId: `2`; processParam: `0,0,2500,1800,100`.

### aerith: Banishga

Source process 103: parameters 100,99999,2000. Eight hits, weights 8% x 7 then 44%.

Source MP 30; game MP 30. Runtime body magic_atk: 4 frames, 266.68 ms. Source moveType not provided, motionType not provided.

- Four unique required effect files are missing (16 scheduled member instances).
- Mixed group/per-target front/back layers, repeated effects and an eight-hit weighted clock.
- SPR-conversion/light mechanics are not represented by the runtime damage formula.
- Group 99999999 is named noeffect_nosound; treat it as a candidate intentional no-op, not automatically as a missing visual.
- Secondary JP snapshot disagrees with SQLite on cost, hit count/timing and modifier; do not merge versions.

| Group start / group | Anchor; layer | Member absolute tick / effect | File and status |
| --- | --- | --- | --- |
| F76 / 99999999 noeffect_nosound | screen; front | No effectData | unresolved-group; semantics require review |
| F40 / 5041363 Lvup_banish2_RR | target-group; back | F40 / 3000081 | wm_1017_banish2_back.bmb: missing-effect-file |
| F40 / 5041362 Lvup_banish2_RF | target-group; front | F40 / 3000080 | wm_1017_banish2_front.bmb: missing-effect-file |
| F40 / 5041361 Lvup_banish1_R | target; back | F60 / 3000071 | wm_1006_banish_back.bmb: missing-effect-file |
| F40 / 5041361 Lvup_banish1_R | target; back | F80 / 3000071 | wm_1006_banish_back.bmb: missing-effect-file |
| F40 / 5041361 Lvup_banish1_R | target; back | F100 / 3000071 | wm_1006_banish_back.bmb: missing-effect-file |
| F40 / 5041361 Lvup_banish1_R | target; back | F120 / 3000071 | wm_1006_banish_back.bmb: missing-effect-file |
| F40 / 5041361 Lvup_banish1_R | target; back | F140 / 3000071 | wm_1006_banish_back.bmb: missing-effect-file |
| F40 / 5041361 Lvup_banish1_R | target; back | F160 / 3000071 | wm_1006_banish_back.bmb: missing-effect-file |
| F40 / 5041361 Lvup_banish1_R | target; back | F180 / 3000071 | wm_1006_banish_back.bmb: missing-effect-file |
| F40 / 5041360 Lvup_banish1_F | target; front | F60 / 3000070 | wm_1006_banish_front.bmb: missing-effect-file |
| F40 / 5041360 Lvup_banish1_F | target; front | F80 / 3000070 | wm_1006_banish_front.bmb: missing-effect-file |
| F40 / 5041360 Lvup_banish1_F | target; front | F100 / 3000070 | wm_1006_banish_front.bmb: missing-effect-file |
| F40 / 5041360 Lvup_banish1_F | target; front | F120 / 3000070 | wm_1006_banish_front.bmb: missing-effect-file |
| F40 / 5041360 Lvup_banish1_F | target; front | F140 / 3000070 | wm_1006_banish_front.bmb: missing-effect-file |
| F40 / 5041360 Lvup_banish1_F | target; front | F160 / 3000070 | wm_1006_banish_front.bmb: missing-effect-file |
| F40 / 5041360 Lvup_banish1_F | target; front | F180 / 3000070 | wm_1006_banish_front.bmb: missing-effect-file |

Source attackFrames: `42:8:2:2-62:8:2:2-82:8:2:2-102:8:2:2-122:8:2:2-142:8:2:2-162:8:2:2-182:44:2:2`. Source processId: `103`; processParam: `100,99999,2000`.

### barret: Big Shot

250% physical damage to one enemy, hit at F130.

Source MP 16; game MP 16. Runtime body atk: 28 frames, 2133.32 ms. Source moveType 4, motionType 8.

- Missing hard-shot effect; the available explosion is only its second member.
- Source motionType 8 is unmapped by the current pipeline; legacy extraction maps every non-2 ability motion to atk.
- Stationary timeline: group at F88, explosion member at F128, damage at F130; source sound offsets remain unreviewed.

| Group start / group | Anchor; layer | Member absolute tick / effect | File and status |
| --- | --- | --- | --- |
| F88 / 5027690 hardshotFF7 | target; front | F88 / 5000480 | sp_20108_hardshot.bmb: missing-effect-file |
| F88 / 5027690 hardshotFF7 | target; front | F128 / 5000545 | eff_explosion_normal.bmb: available-unreviewed |

Source attackFrames: `130:100:2:2`. Source processId: `1`; processParam: `0,0,0,0,0,0,250,0`.

### barret: Grenade Bomb

180% physical damage to all enemies plus process 24: -35 DEF for 3 turns (secondary JP decoding agrees).

Source MP 36; game MP 36. Runtime body atk: 28 frames, 2133.32 ms. Source moveType 4, motionType 8.

- Missing convergence/explosion effect; the available mental-break effect is incomplete on its own.
- Source motionType 8 needs explicit mapping.
- Group-target and per-target composite placement; the second visual starts at F148 + F1 = F149.
- Runtime has no DEF-debuff state/duration or source damage/debuff event dispatcher.

| Group start / group | Anchor; layer | Member absolute tick / effect | File and status |
| --- | --- | --- | --- |
| F88 / 5027710 grenedbomb1 | target-group; front | F88 / 5021840 | eff_convergence_explosion_orange.bmb: missing-effect-file |
| F148 / 5000350 mentalbreak1 | target; front | F149 / 5000320 | sp_20093_mentalbreak.bmb: available-unreviewed |

Source attackFrames: `150:100:2:2`. Source processId: `1@24`; processParam: `0,0,0,0,0,0,180,0@0,-35,0,0,3,1`.

### barret: Satellite Beam

300% physical damage to all enemies, ten hits with 10% weight each.

Source MP 45; game MP 45. Runtime body atk: 28 frames, 2133.32 ms. Source moveType 4, motionType 8.

- Source motionType 8 needs explicit mapping.
- Ten-hit weighted AoE clock lasting through F215.
- Target marker at F41, beam at F60 with rotation 45 and raw member offsets 150/-150, screen fade at F40.
- Mixed target/screen anchors and unverified original placement of a converted 3D beam.

| Group start / group | Anchor; layer | Member absolute tick / effect | File and status |
| --- | --- | --- | --- |
| F40 / 5000190 nerau1 | target; front | F41 / 5000140 | sp_20029_nerau.bmb: available-unreviewed |
| F60 / 5027730 sateraitbeam1 | target; front | F60 / 5022081 | eff_large_beam_blue.bmb: available-unreviewed |
| F40 / 5003690 fadeblack_a50_f120 | screen; back | F40 / 5006355 | eff_fadeblack_a50_f120.bmb: available-unreviewed |

Source attackFrames: `125:10:2:2-135:10:2:2-145:10:2:2-155:10:2:2-165:10:2:2-175:10:2:2-185:10:2:2-195:10:2:2-205:10:2:2-215:10:2:2`. Source processId: `1`; processParam: `0,0,0,0,0,0,300,0`.

## Asset search and reproducibility

9 unique required stems have no usable converted effect in the directly resolved path. Exact-stem results across assets/ and ffbe_asset_dump-main/ are retained in the JSON. No same-named alternative file was found in this inspection. Renamed or similar effects were not substituted.

Re-run from the repository root with Node 24:

```powershell
node tools/audit_mvp_skills.mjs
```

The adjacent JSON retains database/recipe/runtime/code hashes, acquisition records, source mechanics, member transforms, raw placement fields, resource hashes and exact-stem search results. Larger general importer reports are ignored under tools/data/characters/.

Verification: all three CLI character inspections and this audit executed locally; generated JSON and Markdown were checked. No new effect playback, visual comparison, game build or gameplay test is claimed for this documentation-only milestone.
