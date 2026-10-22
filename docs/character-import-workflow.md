# Character and skill import standard

This is the canonical workflow for contributors and coding agents. It covers local
discovery, sprite conversion, skill ownership, reviewed effect baking, publication,
and runtime loading. Cloud / Brave Slash is the working reference. All tools run
from the repository root and use local data; the standard workflow does not fetch
new assets or call the original game's servers.

## Source of truth and file ownership

| Layer | Location | Purpose |
| --- | --- | --- |
| Raw unit art | `ffbe_asset_dump-main/unit_animated/`, `unit_animated_csv/` | Atlas, CGG parts and every CGS track for an exact sprite form |
| Master data | `assets/static_data/ffbe-data.db` | Form-to-series relationship, acquisition conditions, motions and effect timelines; read-only |
| Raw effects | `assets/battle_effect/`, `effect_resource/` | Converted Effekseer files, textures, models and optional authoring data |
| Secondary metadata | `ffbe_data-master/` | DanUgore GL/JP descriptions and decoded mechanics for manual cross-checks; not automatically joined to a different game version |
| Character recipe | `tools/characters/<key>.json` | Exact sprite form, reviewed game stats, selected commands and supported execution mode |
| Effect recipe | `tools/effects/<key>.json` | Reviewed source/variant, camera, sheet settings, blend and review reason; shared across characters |
| Inspection report | `tools/data/characters/<key>/report.json` and `.md` | Full acquisition catalog and raw mechanics, per-skill effects/dependencies, issues and provenance |
| Prepared character | `public/assets/units/<key>/` | Sheets, manifest, selected `skills.json`, game-facing `character.json` |
| Prepared effect | `public/assets/effects/<key>/` | Sheet and manifest, including source/dependency/recipe/sheet checksums |
| Runtime catalog | `public/assets/content.json` | Registered character, monster and effect keys |

Raw dumps, stage folders, SDKs and reports stay Git-ignored. Recipes, this standard,
prepared runtime assets and the runtime catalog are tracked. An import must never
make Phaser parse CGG/CGS, SQLite, `.bmb` or `.efkefc` at runtime.

## 1. Inspect an exact form

Requirements: Node.js 24 (`node:sqlite`), the local folders above, and for publication
`tools/bin/ffbetool.exe` plus Python with Pillow. Configure Python once in PowerShell:

```powershell
$env:FFROGUE_PYTHON = 'C:\path\to\python.exe'
```

Alternatively pass `--python 'C:\path\to\python.exe'` on publication. Missing tools
or source files fail the operation. No download fallback is attempted.

Start with an existing recipe:

```powershell
npm run character:import -- --recipe tools/characters/cloud.json
```

Inspection writes only ignored reports. It hashes source data and directly
referenced resources, enumerates all raw animation tracks, and follows:

```text
exact sprite form -> unit.unitSeries
                 -> unit_series_lv_acquire (abilityId and magicId)
                 -> ability / magic (raw mechanics and timelines)
                 -> effect_group.effectData
                 -> effect.fileInfo -> converted asset -> textures / models
```

Never resolve a group ID directly against `effect`: overlapping IDs refer to
different objects. Preserve repeated acquisition rows, rarity, level, NV level,
unlock type and brave-ability markers. A series catalog can include later forms;
it is not a claim that every form has every skill at level one. Passive skills
and magic are cataloged separately. Missing records are visible rather than dropped.

The catalog covers level acquisition for that series. Equipment-granted skills,
enhancements, quest unlocks, cooldown child skills and limit bursts require
additional discovery and implementation. Do not call this a complete list of
every skill a character could ever use.

For a new character, copy a recipe, change `key` and `spriteUnitId`, and initially
set `skills` to `[]`. Run inspection to discover the original learning list.
Then select commands by both ID and kind (`ABILITY` / `MAGIC`), give each a unique
English key, and review gameplay parameters. An empty selection blocks publication.
The importer does not guess damage formulas from names or invent missing animations.

`spriteUnitId` and the learning-series ID may differ. For example, Barret's current
sprite form is 207000205 but its series is 207000204. The importer resolves this
relationship from the database instead of truncating digits.

## 2. Review the character recipe

Required top-level fields: `schemaVersion: 1`, `key`, numeric-string `spriteUnitId`,
`game`, `battle`, `scale`, and `skills`. See `tools/characters/cloud.json` for the
complete executable example.

`battle` contains `heroName`, `heroRole`, `maxHp`, `maxMp`, `attackType`
(`melee`/`ranged`), `targetOffsetX`, `attackAnim` and `hitFrameIndex`. These are
reviewed roguelike settings, not automatically copied from max-level FFBE stats.
`hitFrameIndex` is a **zero-based body-sheet index** for the basic attack; inspect
the character's motion to select it. Sprite scale and target approach distance
also need visual review per character.

Every selected command contains the `SkillConfig` fields used by the game and an
offline-only `execution` field:

| Execution | Current meaning |
| --- | --- |
| `timeline-single-hit` | Reviewed single-target melee dash, one damage frame, one target-centered baked effect. Source attack frames and effect association are checked. |
| `legacy` | Explicitly retain an existing MVP command with the previous gameplay executor. It does not claim complete original mechanics, multi-hit timing or VFX. |

Only Brave Slash currently uses the reviewed timeline path. The other eight MVP
commands are explicitly retained as legacy. New commands should not be marked
legacy merely to bypass unsupported behavior. Document intentional balance
changes in `reviewNote`; reports show source and game MP costs separately.

Publication blocks unlearned/passive commands, missing body motions, unsupported
motion/scope/movement, invalid values, mismatched timelines and unreviewed effects.
The engine currently supports `atk` and `magic_atk` skill motions. `single_ally`,
revival, buffs, status effects, elemental/resistance formulas, jumps, limit bursts,
multi-hit distributions and composite VFX require further executor work before
their original behavior can be claimed. Availability in the catalog alone does
not enable these mechanics.

## 3. Character animation contract

The importer converts **every** local CGS track of the exact sprite form and checks
that no track was omitted. The runtime contract currently requires these names:

| Situation | Body animation and behavior |
| --- | --- |
| Normal rest | `idle`, looping |
| Preparing physical command | `standby`, looping until executed or canceled |
| Preparing magic command | `magic_standby`, looping until executed or canceled; one preparation cycle before casting |
| HP <= 25%, alive | `dying`, looping (a one-frame pose is valid) |
| HP = 0 | `dead`, once; skipped in turn order and victory |
| Approach / return | `move`, looping; melee action returns home |
| Basic physical motion | `atk`, once; damage uses the reviewed body-frame index |
| Magic skill | `magic_atk`, once when selected by that skill |
| Victory | `win_before` once, then `win` looping |
| New wave / action ends / healing | Re-evaluate HP and choose `idle` or `dying` |

Heroes can each hold a prepared action. Preparing a command does not spend MP or
the turn. Tap an unprepared party row or an actor to open commands and choose
Attack or Skill. Tap a prepared row to commit; swipe right or use its chevron to
edit instead. Execute/Space also commits the selected hero. Execution is sequential
and globally locked while an action runs. Other heroes' prepared commands persist.
Escape/Backspace returns from skills, closes commands, then clears the selected
plan when commands are closed. New rounds/reset clear plans.
Missing readiness tracks fall back to the available standby/rest pose; original
action motions still require explicit validation.

Resting-pose refreshes must not interrupt prepared commands, actions or victory. Interrupted victory
entrances remove their completion listener. Pivots use the ffbetool internal
1000/1000 origin: `(1000 - frameRect.x) / width`, equivalently for Y. Preserve
existing ranged recoil compensation. Do not align sheets using guessed offsets.

Other exported tracks (`jump`, `limit_atk`, etc.) are
available but exporting them does not automatically assign combat choreography.
Some limit sheets include original cinematic backgrounds. Preview before use.
If a form uses alternate track names or lacks required tracks, inspection blocks
publication; implement an explicit reviewed mapping/fallback before importing it.

## 4. Resolve and bake skill visuals

`attackFrames` and effect start frames are FFBE timeline ticks at **60 Hz**, not
body-sheet indices. Frame 4 = 66.67 ms, frame 6 = 100 ms. The skill clock begins
when the attack pose starts after approach; preserve the existing hit-stop.

Reports retain group timing, front/back layer, target/caster/screen anchor,
member timing/offset fields, scale, file transforms and raw sound references.
Conditional branches separated by `@` remain conditional; never flatten them into
unconditional spawns. Missing groups, effect files, resources and unresolved
behavior stay visible. The current baker supports the local EFKE INFO version
1810 and fails closed on unknown resource formats. Inspection records unknown
formats as `unsupported-effect-format` while preserving the rest of the catalog.

Create a shared effect recipe only after checking the source and its dependencies.
The Brave Slash recipe explicitly names the provided `flashcut` variant and why
it was selected. Never select similarly named effects automatically. No arbitrary
unit atlases or geometric placeholder spells are permitted.

```powershell
npm run effect:bake -- --recipe tools/effects/brave_slash.json
```

Open the printed local URL (default `http://127.0.0.1:3102/`). The page uses the
offline SDK in `tools/bin/effekseer-webgl-1.80.7/`, renders a deterministic seed at
60 FPS, and saves a standard sheet plus provenance manifest. Wait for
`Export complete`, inspect the frames, then stop the tool server. This browser
step is currently required; the CLI does not automate browser rendering.

The current bake is against black and must use Phaser **ADD**. It is not a normal
alpha-composited image. The recipe defines camera width, frame size/count, columns,
origin and final scale. Check clipping, tail duration, flash planes, placement and
size. The current single-effect baker does not reconstruct arbitrary original
composite, rotated, offset or screen-space skill choreography.

Reviewed single-hit skills reference `visualEffect: { key, startFrame }`. The
importer verifies the original effect ID, file and target anchor. On publication
it verifies source, resource, recipe and sheet hashes and sheet dimensions. Changes
to any input require rebaking; they must not silently reuse an old sheet.

## 5. Publish prepared content

```powershell
npm run character:import -- --recipe tools/characters/cloud.json --publish
```

`--assets <folder>` and `--dump <folder>` select different local source roots.
Publication runs ffbetool and the existing Pillow exporter in a fresh staging
directory under `tools/data/characters/<key>/`. It checks track coverage, basic
attack frame bounds, sheet dimensions, frame counts, timing and effect hashes
before copying prepared files to `public/assets/units/<key>/`. The recipe's
offline `execution` field is not emitted into runtime skill data.
The report records a publication receipt with the exported animation list,
effect keys and SHA-256 of each published character file.

The importer registers the character and referenced effects in `content.json`.
It copies files only after validation; final filesystem copy is not transactional,
so inspect/restore Git changes if an external disk error interrupts publication.
Old unreferenced prepared files may remain on disk but are absent from the newly
generated manifest and are not loaded.

## 6. Runtime loading and party placement

1. `BootScene` loads `content.json`, then every registered manifest and character
   definition. No new per-character or per-effect loader should be added.
2. `PreloadScene` loads the manifest-declared sheets and each character's selected
   skills. Raw data stays outside the game.
3. `BattleScene` reads stats/combat configuration from cached `character_<key>`,
   commands from `skills_<key>`, and uses the shared `UnitActor` state behavior.
4. Effects load once per shared key; each cast creates a transient sprite with
   ADD blending, target world-space placement and completion cleanup.

Optional `portraitSource` in a character recipe names a reviewed file relative to
the unit dump (for example `unit_icons/unit_icon_207000105.png`). Publication copies
it to `portrait.png` and adds its prepared path to `character.json`. PreloadScene
loads it under `portrait_<key>` for the party row. Raw icon paths never enter
runtime loading. Viewport formation and the shared art-scale factor are defined
in `src/ui/battleLayout.ts`; recipe scales and source pivots stay asset metadata.

**Registration does not change the active party.** The current battle still has
three fixed actors, formation slots and Cloud/Aerith/Barret-specific balance
branches. To make another imported character playable, a separate reviewed party
integration must replace/add the relevant actor references, turn-order/HUD entries
and any identity-specific damage rules. Do not merely rename a key and assume all
roles, targeting and balance have changed. A general roster/party selection system
is outside this import milestone.

## 7. Required verification

```powershell
npm run test:pipeline
node tools/test_combat_regressions.mjs
npm run build
```

Pipeline tests use synthetic local fixtures: they verify group-ID collisions,
resource boundaries, form/series acquisition, repeated unlocks, magic discovery,
missing states and unsupported skill rejection. They do not require a full dump.

Then visually check the real Phaser game: loading, idle/dying/healing, attack
movement and hit timing, victory entrance/loop, MP cost, target damage and turn
progression, plus repeated actions/reset for cleanup. The shared state preview is
`/tools/preview-character-states.html`. Record what actually ran. Original-game
fidelity needs an original reference or explicit developer visual acceptance;
passing a build or finding an asset does not establish it.

## Migration and current verification

The older `import_unit.py`, `extract_unit_skills.mjs`, `analyze_cloud_effects.mjs`
and research previews remain available for research. Their outputs are not the
canonical reviewed recipe. The compatibility command `export_brave_slash.mjs`
now delegates to the general effect baker. Edit recipes and use this workflow
for future changes, rather than regenerating approved data with the older scripts.

This milestone inspected all three MVP recipes, rebaked Brave Slash through the
general exporter, and published Cloud through the complete staged local import.
Aerith and Barret recipes preserve their existing gameplay settings; their new
recipes were inspected but were not republished in this milestone.
Repeating Cloud publication produced byte-identical prepared character files.
The real game loaded through the new catalog and Brave Slash's effect, 18 MP
cost, damage popup, home return and advancement to Aerith were checked in-browser.
A full run and a newly playable fourth character were not tested.
