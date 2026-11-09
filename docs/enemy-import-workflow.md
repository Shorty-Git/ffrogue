# Prepared enemy and encounter workflow

## Original monster skills in battle (2026-11-09) - start here

```powershell
node tools/import_enemy_skills.mjs [--monsters sweeper,x_atm092]
```

For every published enemy, the tool reads the body recipe (`tools/monsters/<key>.json`, hash-pinned by
its publication, never edited) and the skill recipe (`tools/monsters/skills/<key>.json`, optional
`skillMonsterId` for a same-dictionary variant that owns the skill set, e.g. X-ATM092 506002006).
Then:
1. It takes monster_skill_set and selects the skills with a damage process (1 physical, 15 magic).
   Extra processes (debuffs, blind, self effects) are noted in the entry, not reconstructed.
2. It stages the original BMB (`stage_original_skill.py --kind MONSTER_SKILL`).
3. It prepares the scene with the monster as caster (`prepare_original_preview.py`: monster recipes
   set `presentation.caster='enemy'`; monster bodies without a move clip use idle).
4. It publishes the scene and admits the original sounds.
5. It regenerates `src/run/enemySkills.mjs`.

Runtime:
- `enemyAction` resolves a pattern step with `skill:'<id>'` to the imported skill. The step's
  multiplier wins and the skill's name, scope, scene and damage events apply.
- Enemies without a reviewed pattern alternate their basic attack with each imported skill.
- `BattleScene.executeEnemySkill` plays the scene from the enemy at the party, plays the atk body once,
  and splits the action damage over the source hit frames on every target.
- The bridge places `target-side` on the party half for enemy casters. A very early enemy turn waits
  for the background scene preparation (`preparedScenes.ready`).
- A missing scene keeps the labelled FFRogue attack (tested fallback).

Imported (12):
- Sweeper: Machine Gun, Double Barrel, Smoke Shot (blind not reconstructed).
- Guard Scorpion: Tail Laser, Focused Fire, Scorpion Tail.
- Ochu: Ochu Dance.
- G-Soldier: Fire.
- Elite Soldier: Charge.
- X-ATM092: Clash, Arm Crush+ (debuff not reconstructed), Ray-Bomb.

Boss patterns now name the originals: Guard Scorpion → Focused Fire / Tail Laser, Ochu → Ochu Dance,
X-ATM092 → Ray-Bomb. Arm Hook stays the single-target opener.

Skipped (no damage process): Protect, Shell, Aura, Locked On Target, tail raise/lower, Guardian Ivy,
stat-down, Repairing, debuff removal. Receipt: tools/data/enemy-skills/receipt.json.
Multipliers are provisional (single 1.2, party 0.9).


## Bounded next-import decision (2026-11-02)

No new original monster skill is admitted. A real MONSTER_SKILL166960 staging of
Locked On Target resolves wm_1001_libra.bmb plus all5 resources (missing0), but
its effect is44 nodes:28 ControlNull,8 Quad,7 Model,1 Particle. It is not a simple
single-quad alternative. Receipt: tools/data/stage-loading-20261102/locked-on/.
Ochu Dance's12+10-node corpus is currently the shorter no-type7 render path;
Tail Laser retains unknown type7 nodes13/24 among28 nodes. Availability is not
admission and no generic notDecoded list alone establishes missing semantics.

Concrete observation limit found in existing code: observer.js unitIdentity
requires spec.combatIdentity.playerVtableSymbol equality; body_observer.js watch
requires playerClassMatched. The functioning hero observer CANNOT record/certify
monster clip transitions just by passing a monster ID. Next useful instrumentation
needs a fingerprinted monster identity/accessor/update dispatch path, linked to
monsterSkillId, actual CGS/frame transitions, VFX root and recipient anchors on the
SAME Ochu Dance cast. Do not remove the player filter or infer hero motion0.
No emulator reinstall, native modification or ordinary video substitute was made.
Existing FFRogue boss patterns are unchanged and explicitly labeled adaptations.
The32 sound-reference occurrences/eight raw tuples remain preserved and unplayed.

## Current original-skill intake (2026-11-02)

The enemy importer now has a separate MONSTER_SKILL intake, reusing the existing
hero effect-group resolver and original CPK dependency stager. It joins the EXACT
monsterId -> monster_skill_set -> monster_skill, never unit learns or names.
Original process/target/motion fields, conditional/composite @ records, hit-marker
weights, effect members and group sound references survive unchanged. Admission
remains blocked until an executable enemy choreography/placement/render/gameplay
contract exists; checked availability flags alone cannot authorize publication.

| Owner | Original skills (master IDs) | Current classification |
| --- | --- | --- |
| Ochu311001000 | Ochu Dance150200 | Original known; representation/contract incomplete |
| Guard Scorpion406081000 | Tail Laser166950; Locked On Target166960; Focused Fire166970; Scorpion Tail166980; raises-tail166990; lowers-tail167130 | Original known; representation/contract incomplete |
| Microchu111031000 | Guardian Ivy195520 | Original known; composite process3@101 not admitted |
| Sweeper206131000 | Smoke Shot166920; Double Barrel166930; Machine Gun166940 | Original known; representation/contract incomplete |

Zero original monster skills are fully admitted. Vine Lash/Bramble Surge and Arm
Cannon/Suppressive Burst are DELIBERATE FFRogue names in stageContent, not aliases
of the original skills. The common action banner and boss panel label them as
FFRogue abilities/patterns. Do not rename the current burst Tail Laser/Ochu Dance.

Reproduce:

```powershell
node tools/inspect_enemy_skills.mjs
& $env:FFROGUE_PYTHON tools/stage_original_skill.py --report tools/data/battle-polish-20261102/enemy-skills/guard_scorpion.json --skill-id 166950 --kind MONSTER_SKILL --output tools/data/battle-polish-20261102/tail-laser
& $env:FFROGUE_PYTHON tools/stage_original_skill.py --report tools/data/battle-polish-20261102/enemy-skills/ochu.json --skill-id 150200 --kind MONSTER_SKILL --output tools/data/battle-polish-20261102/ochu-dance
```

These probes were actually staged with full source/member hash checks and no
missing texture/model candidates. Tail Laser sp_20103_madoulaser.bmb has28 nodes,
including TWO unknown type7 nodes (not node number7). Ochu Dance uses
atk_blow3_orange.bmb(12 nodes) and eff_shockwave1_orange_S.bmb(10 nodes), with
particle/model/quad branches needing a fully admitted control/render profile.
Raw files are present; availability is not a validated dynamic render profile.
The source hit markers are Tail Laser80, Ochu Dance42/52/82/92/102. They are visual
evidence, not automatic FFRogue formulas. Enemy-relative anchors/direction and
command-to-body/phase dispatch remain unmeasured; hero motion0/other adapters are
not inferred. Original AI/script conditions are not reconstructed by skill-set
membership. No standard-attack replacement is authorized.

Smallest next original measurement: selected monsterSkillId, body clip changes,
effect-group/root start and recipient/caster anchors on the SAME cast. Prefer a
small single-target candidate such as Locked On Target before unknown type7 work.
Ochu Dance additionally needs its two complete VFX profiles admitted; Tail Laser
retains independent type7 support. No ordinary videos or guessed motion mapping
were substituted in this milestone.

Audio intake preserves32 group-level sound-reference occurrences/eight distinct
serialized tuples, including Tail Laser group5000450,start40,raw1:104:1. These are
not decoded stream bindings. Reuse existing bank inventory; keep audio cues,
reviewed gameplay events and stage music separate. No playback implemented.

Read asset_structure.md and asset-pipeline-handbook.md first. Raw data processing
stays in tools; runtime reads only prepared sheets/manifests and reviewed content.
The existing TargetDummy actor is now namespaced for multiple monster bodies;
there is no second enemy engine. Its historical class name is not a sprite binding.

## Verified bodies (2026-11-02)

| Key | Original name | Monster master ID | Dictionary / sprite ID | Clips |
| --- | --- | --- | --- | --- |
| microchu | Microchu | 111031000 | 1110310 | idle6, atk2 |
| ochu | Ochu | 311001000 | 3110010 | idle12, atk2 |
| sweeper | Sweeper | 206131000 | 2061310 | idle4, atk2 |
| guard_scorpion | Guard Scorpion | 406081000 | 4060810 | idle4, atk2 |

Exact sources: rawdata/ffbe_asset_dump/monster_animated/monster_anime_ID.png and
monster_animated_csv/monster_cgg_ID.csv, monster_{idle,atk}_cgs_ID.csv. Explicit
reviewed bindings live under tools/monsters/. The master monster.dictionaryId join
proves the original name/identity; dictionary.fileName=test1 does NOT resolve an
atlas. Recipe bindings and all assembled frames were visually inspected. Separate
original variants are not merged. Per-file hashes and original monster/skill-set
records are retained in source.json and the ignored bounded inventory receipt.

Reproduce from repository root using a configured Python with Pillow:

```powershell
& $env:FFROGUE_PYTHON tools/inventory_battle_content.py
& $env:FFROGUE_PYTHON tools/import_monster.py --recipe tools/monsters/guard_scorpion.json
```

Preparation uses a fresh tools/data/monsters/KEY/stage-* directory, the existing
ffbetool.exe --unit_type monster --json, export_unit.py and validate_character.py.
Every raw CGS track must survive export. Inspect all frames, not only the atlas or
first idle. After review, --publish prepares/validates again and writes a NEW
public/assets/monsters/KEY directory. It refuses existing publications; do not
delete/overwrite them to bypass this gate. It does not auto-register unreviewed
actors: add the exact key to content.json.monsters and reviewed stageContent.mjs.
Publication identity/source/prepared hashes are checked by test_stage_content.mjs.

Only original idle/atk body clips are available for these four profiles. Original
named monster skills, external attack effects, original AI, original damage,
hurt/dead/win clips and original encounter formations are NOT imported. Spawn,
damage flash/fade, movement mode, impact frame1, scaling, names of boss actions,
phase modifiers and targeting are explicit FFRogue adaptations. Never label these
as a reconstruction of Guard Scorpion's original laser/AI or Ochu's original AI.
No unknown original VFX is silently replaced: these are reviewed body-only enemy
actions, not published FFBE skill imports. Player Source requirements are unchanged.

Runtime clip switches apply each original pivot. A single uniform scale fits all
supported clip extents and the actual Phaser Back.Out spawn overshoot around the
existing formation anchor with8px arena inset;
no per-boss offset, crop or axis stretch. Impact/end use the prepared frame delays.
Stationary profiles stay at their anchor; approach uses the existing FFRogue glide.
The old debug Dire Rat body/timing remains unchanged for accepted Source reviews.

## Stage and boss rules

src/run/stageContent.mjs is the reviewed content registry: separate original IDs,
prepared keys, arena, theme, enemy pool/formations, boss, difficulty, normal count,
reward category and future audio references. runBalance derives HP/attack values;
this is roguelike balance, not a decoded original stat block. There is no new raw
data parser or per-enemy loader in src. New runs copy stage IDs into their saved
areas. Old forest/reactor saves resolve deterministically without mutating their
party, areas, RNG, resources or offers. Unknown/mismatched stages fail validation.
Encounter lineups are stable by wave/slot; visual loading consumes no gameplay RNG.

Boss patterns use an individual action cursor: single attack -> preparation with
no damage -> warned party attack. Stop consumes its status phase but does not
advance the cursor, so it cannot silently skip preparation. Below50% HP, a declared
phase increases power without changing the order. Living targets are captured at
impact and receive one hit each, with their own defense. K.O. targets are excluded.
The boss panel displays HP, phase and next intent; brief entry is skippable and
scene-owned. Existing Source-tail/victory/reward barriers remain authoritative.

Current two-stage4-fight run: FFBE/Lapis-themed Whisperwood (Microchu/Ochu), then
FFVII-themed Mako Reactor (Sweepers/Guard Scorpion). Both existing hash-verified
static arenas are reused; see background-import-workflow.md. The world/theme and
lineups are reviewed FFRogue composition. An exact native original stage-to-world
join, animated SSBP layers and authenticated music mapping are not established.
Dictionary background/BGM defaults must not be presented as such a mapping.

Checks: node --test tools/test_stage_content.mjs tools/test_combat_regressions.mjs;
npm run build. Production review: /tools/test-themed-stages.html?captureOrigin=SINK
on the checked3001 server, plus existing victory/reload and Source review pages.
Receipts/screenshots: tools/data/themed-stages-20261102. The test harness pauses
only for captures; no production HP/victory is forced in the full expedition.


Automated isolated-browser driver:
node tools/review_themed_expedition.mjs --playwright PLAYWRIGHT_MODULE_PATH --capture-origin http://127.0.0.1:3160
Use --entries-only for final spawn-bounds sampling; --defeat-only for the explicit
1HP checkpoint, actual boss attacks, two reloads and restart. Full expedition
uses normal commands/support actions; the low-HP fixture is separate and never
presented as a naturally balanced loss. Existing original skill regression page
now rejects older receipt services missing current enemy/stage freshness modules.
