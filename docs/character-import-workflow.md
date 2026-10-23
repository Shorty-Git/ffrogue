# Character and skill import standard

This is the canonical **character publication** workflow for contributors and
coding agents. Start with the [asset pipeline handbook](asset-pipeline-handbook.md)
and [asset structure guide](asset_structure.md). This document covers local
discovery, sprite conversion, skill ownership, reviewed converted-effect baking,
publication, and runtime loading. Cloud / Brave Slash is the working publication
reference, not proof of original-game visual fidelity. All tools run
from the repository root and use local data; the standard workflow does not fetch
new assets or call the original game's servers.

For new skill reconstruction, use the
[original-data skill workflow](skill-reconstruction-workflow.md). That research
player reads prepared BMB-derived plans and is separate from the converted EFKE
sheet baker described here. Its latest preview improvements have not replaced
the game's published skill sheets. Do not publish a research plan as a character
recipe or stack an old artwork correction on a newly corrected source renderer.

The [skill pipeline foundation](research/skill-pipeline-foundation.md) records the
import/progression target and visible-reference gate. We reuse skill identity and
animation, **not FFBE's chaining system**. Damage, MP costs, reward availability
and wave progression are roguelike balance decisions. Source hit metadata is
provenance; retaining it does not require reproducing the original combat rules.

## Source of truth and file ownership

| Layer | Location | Purpose |
| --- | --- | --- |
| Raw unit art | `ffbe_asset_dump-main/unit_animated/`, `unit_animated_csv/` | Atlas, CGG parts and every CGS track for an exact sprite form |
| Master data | `assets/static_data/ffbe-data.db` | Form-to-series relationship, acquisition conditions, motions and effect timelines; read-only |
| Converted effects | `assets/battle_effect/`, `assets/effect_resource/` | Effekseer files, textures, models and optional authoring data for the current sheet publication path |
| Original effects | `com.square_enix.android_googleplay.FFBEWW/files/` | Ignored CPK backup; selectively staged original BMB/texture/model resources for the separate reconstruction workflow |
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

Implementation entry points are [import_character.mjs](../tools/import_character.mjs),
[character-pipeline.mjs](../tools/lib/character-pipeline.mjs),
[export_unit.py](../tools/export_unit.py), and
[validate_character.py](../tools/validate_character.py). Do not infer capabilities
from a recipe alone; inspection and publication have different checks.

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
referenced resources, enumerates the matching standard animation tracks, and follows:

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

The current source discovery is narrower than the entire dump: it selects exactly
`unit_anime_<ID>.png`, `unit_cgg_<ID>.csv` and
`unit_<track>_cgs_<ID>.csv`. It does not gather numbered atlas pages, `_OD` or `ef`
variants, alternate CGG families, or choose between recovered GL/JP identity
collisions. A “publishable” report checks the selected files, not those omitted
families. Check the dump's identity/variant catalogs when those cases occur and
add an explicit reviewed source mapping before importing them. Do not mix atlas,
CGG and CGS from different forms, resolutions or regional versions.

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
| `timeline-area` | Reviewed stationary area presentation: prepared effects at target/group anchors and one combined total-damage event. Source hit metadata remains separate; a review note must explain the adaptation. |
| `legacy` | Explicitly retain an existing MVP command with the previous gameplay executor. It does not claim complete original mechanics, multi-hit timing or VFX. |

Brave Slash uses the single-hit timeline. Blade Beam and Satellite Beam use area
presentations; the other six MVP commands remain legacy. New commands should not be marked
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

The importer converts every CGS track matching its exact standard naming rule
above and checks the exported track list against that discovery result. It does
not prove that all alternate animation families were discovered. Inspection
requires `idle`, `atk`, `move`, `dead`, `dying`, `win` and `win_before`, plus the
selected skill's motion. `standby` and `magic_standby` are optional readiness
tracks with runtime fallbacks. The runtime uses these names as follows:

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
the turn. The desktop dock shows Attack and all three selected skills directly.
Select a party card or actor to choose a hero; selection never executes an action.
Click a command to prepare it, then Execute or Space/Enter to commit it. Keys 1–3
select heroes; Q selects Attack and W/E/R select their skills. Hover skills for
descriptions. Clear cancels only the selected hero's plan. Execution is sequential
and globally locked while an action runs. Other heroes' prepared commands persist.
New rounds/reset clear plans. Legacy submenu methods remain for compatibility;
the desktop UI does not expose a modal command menu.
Missing readiness tracks fall back to the available standby/rest pose; original
action motions still require explicit validation.

Resting-pose refreshes must not interrupt prepared commands, actions or victory.
Interrupted victory entrances remove their completion listener. Preserve the
source pivot contract and existing ranged recoil compensation described below.
Do not align sheets using guessed offsets.

Other exported tracks (`jump`, `limit_atk`, etc.) are
available but exporting them does not automatically assign combat choreography.
Some limit sheets include original cinematic backgrounds. Preview before use.
If a form uses alternate track names or lacks required tracks, inspection blocks
publication; implement an explicit reviewed mapping/fallback before importing it.

### Reading raw frames and prepared geometry

The atlas is a collection of parts, not an already ordered animation sheet. A CGG
row describes an assembled pose; a CGS sequence references those rows in playback
order and supplies delays. A referenced CGG row number, an exported body-sheet
index and a 60 Hz effect tick are three different coordinates.

The dump validators (`ffbe_asset_dump-main/tools/validate_unit_identities.py` and
`validate_recovery.py`, local ignored sources) establish this structural subset:

- CGS column 0 is a zero-based CGG row reference. Preserve sequence order and
  repeated references; do not deduplicate poses or sort by the reference.
- CGG column 1 is the part count. Following values form equal-size part records;
  require a consistent stride rather than treating every row as fixed-length.
  Within a part, zero-based fields 6 through 9 are atlas `x, y, width, height`;
  field 10, when present, is the atlas page. Validate referenced page and bounds.
- The remaining pose/part transform fields are delegated to `ffbetool.exe` in
  this repository's normal import. The workflow is not a complete independent
  CGG renderer specification; do not guess blend/flip/rotation enums when adding
  a parser. Keep the raw tuples and validate the new interpretation against
  assembled frames before using it.

`ffbetool.exe --json` produces one horizontal PNG strip and one JSON file per
track. The exporter consumes `animName`, `frameRect` and `frameDelays`; it does not
parse CGG/CGS itself. For example, the local Cloud attack CGS begins
`33,0,0,2,` then `23,0,0,4,`; the assembled attack JSON begins with delays `[2,4]`.
The first output body frame is index 0, even though it references CGG row 33.
Other CGS columns are not interpreted by the Python exporter.

The common virtual assembly origin is `(1000, 1000)` on a 2000-square canvas.
`frameRect` is the track's shared crop, not a separate crop for each pose. The
exporter preserves that anchor as:

```text
pivotX = (1000 - frameRect.x) / frameRect.width
pivotY = (1000 - frameRect.y) / frameRect.height
durationMs[index] = round(frameDelays[index] * 1000 / 60, 2)
sheetWidth = frameRect.width * frameDelays.length
sheetHeight = frameRect.height
```

Do not clamp pivots to `[0,1]` or recenter each image around its visible pixels:
the source origin can lie outside the visible crop. [UnitActor](../src/entities/UnitActor.ts)
applies each track's pivot on playback and uses `1 - pivotX` when flipped.
`delayTicks` and `durationMs` remain per-frame values in the prepared manifest.
Validate animation timing in the actual player, including transitions and holds.

`recoilOffsetX` is an exporter heuristic, not a decoded FFBE movement track: it
compares the bottom visible pixels of idle frame 0 and the track's last frame
(alpha above 50, bottom three-pixel band). Runtime currently uses a measurable
offset only for ranged returns. Check this visually when a weapon, shadow or
effect reaches below the feet. Mathematical pivot consistency does not guarantee
that every raw pose is visually stationary or that recoil detection is correct.

## 4. Resolve and bake converted skill visuals

This section describes the **existing EFKE-to-sheet publication path**. It is
useful for preserving/reproducing reviewed runtime assets, not a substitute for
decoding original BMB behavior. New fidelity work belongs in the
[skill reconstruction workflow](skill-reconstruction-workflow.md).

`attackFrames` and effect start frames are FFBE timeline ticks at **60 Hz**, not
body-sheet indices. Frame 4 = 66.67 ms, frame 6 = 100 ms. The skill clock begins
when the attack pose starts after approach; preserve the existing hit-stop.

Reports retain group timing, front/back layer, target/caster/screen anchor,
member timing/offset fields, scale, file transforms and raw sound references.
Preserve `@` segments and their process/target association. The current importer
labels every later segment `conditional` and blocks non-legacy publication; that
is a conservative implementation limitation, **not a decoded meaning of `@`**.
Parallel process groups can also use this separator. Do not flatten them into a
single target or assume a condition without evidence; see the
[composition audit](research/original-composition-audit.md).
Missing groups, effect files, resources and unresolved behavior stay visible.
The current baker supports the local EFKE INFO version
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

An **ADD** bake is against black and must use Phaser ADD. Reviewed **NORMAL** recipes
preserve alpha for effects such as black screen fades. The recipe defines camera width, frame size/count, columns,
origin and final scale. Check clipping, tail duration, flash planes, placement and
size. The single-effect baker does not recover unknown original spatial transforms
or arbitrary composite choreography.

Reviewed area presentations reference `presentation: { impactFrame, durationFrames,
effects: [{ key, startFrame, anchor, layer?, fit? }] }`. Anchors support `target`,
`target-group` and `screen` for stationary `all_enemies` commands. Layers are
`front` (default) or `back`. Every source member must be
covered exactly once, with its original start tick, anchor and scale; unsupported
layers/transforms and additional `@` segments remain blocked. Duration must include
every baked effect. `impactFrame` intentionally controls one combined gameplay
hit and requires an explicit adaptation note. No per-skill code is needed for
another skill within this supported presentation contract.

Satellite Beam uses the same executor with an explicitly reviewed adapted `atk`
motion for unmapped source motion code 8. Original ten-hit metadata stays separate
from its combined F165 damage event. The baker's `emitterRotation` tuple is XYZ
degrees and must match source file transforms. Its black fade uses the original
NORMAL alpha effect. Recipe/manifest `contentBounds` describe measured union alpha
bounds; `fit: "arena"` fits them to the field without guessing screen offsets or
replacing the effect with a placeholder rectangle. Prepared effects are clipped
to the arena and clean up masks on destruction/reset. See the
[Satellite Beam review](research/satellite-beam-import.md).

Blade Beam keeps the source green emitter at scale 300% and blue at 100%,
starting at F0/F5. The accepted simplified presentation applies the total 3x
damage once at F30 to all captured living targets, without extra tint, recoil or
camera shake. Source F4/F8 and hitCount 2 are retained as provenance; this is not
an implementation of the original two-hit distribution. Green's raw -1100 field
remains unapplied. `emitterScale` in an effect recipe is an offline bake transform
(default 1), separate from the runtime sheet scale. Recipes and hashes cover it.

Reviewed `artworkRotationDegrees` rotates the rendered artwork clockwise without
altering source XYZ metadata. A nonzero value requires
`review.presentationAdaptation`. `artworkPivot: "origin"` keeps the target anchor
fixed; `"bright-body"` tracks the largest connected bright component per frame,
so detached flashes do not steer moving projectiles. The bake clips each rotated
frame to its own cell. Artwork angle/pivot are also checked against the manifest
on publication. The currently published converted Blade Beam recipe uses +90
degrees around its bright body; Satellite Beam uses +45 degrees around its target
origin. See
[the orientation correction review](research/effect-orientation.md).

These are documented presentation adaptations, not recovered native transforms.
The newer original-source player now evaluates the stored Blade Beam single-texture
rotation/pivot, as described in the
[source geometry review](research/blade-beam-source-geometry.md). Do not carry the
converted recipe's +90-degree correction into that player or a later export of
it. Native member placement, some transform conventions and unsupported emitters
still need work; a successful original-source preview does not make a complete
replacement publication pipeline available.

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
4. Effects load once per shared key; each cast creates transient sprites using
   the manifest's `NORMAL` or `ADD` blend, reviewed target/group/screen placement,
   layer and completion cleanup.

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

## 7. Required verification for publication changes

```powershell
npm run test:pipeline
node tools/test_combat_regressions.mjs
npm run build
```

Run checks appropriate to changed code and published assets; a documentation-only
update does not require rebaking, publication or gameplay tests. Pipeline tests
use synthetic local fixtures: they verify group-ID collisions,
resource boundaries, form/series acquisition, repeated unlocks, magic discovery,
missing states and unsupported skill rejection. They do not require a full dump.

Then visually check the real Phaser game: loading, idle/dying/healing, attack
movement and hit timing, victory entrance/loop, MP cost, target damage and turn
progression, plus repeated actions/reset for cleanup. The shared state preview is
`/tools/preview-character-states.html`. Record what actually ran. Original-game
fidelity needs an original reference or explicit developer visual acceptance;
passing a build or finding an asset does not establish it.

## Migration and historical verification

For several skills, use the [reviewed batch workflow](research/skill-batch.md):
`npm run skills:batch -- --all` inspects every selected MVP command, and
`--bake` queues only ready, approved effects through the existing baker.
It reports incomplete legacy commands separately and does not publish them.

The older `import_unit.py`, `extract_unit_skills.mjs` and
`analyze_cloud_effects.mjs` remain available for research. Their outputs are not
the canonical reviewed recipe. `import_unit.py` fetches by default, uses shared
`tools/test_input` / `test_output` folders and writes directly into `public/`;
even `--skip-fetch` does not provide the current importer's staging, validation or
registration guarantees. Do not use it to republish a reviewed character.
The original BMB research previews follow their own explicit capability report
and are not an obsolete equivalent of this converted-sheet baker.
The compatibility command `export_brave_slash.mjs`
now delegates to the general effect baker. Edit recipes and use this workflow
for future changes, rather than regenerating approved data with the older scripts.

The earlier character-import milestone inspected all three MVP recipes, rebaked
Brave Slash through the general exporter, and published Cloud through the complete
staged local import.
Aerith and Barret recipes preserve their existing gameplay settings; their new
recipes were inspected but were not republished in this milestone.
Repeating Cloud publication produced byte-identical prepared character files.
The real game loaded through the new catalog and Brave Slash's effect, 18 MP
cost, damage popup, home return and advancement to Aerith were checked in-browser.
A full run and a newly playable fourth character were not tested.

Those observations are a historical receipt, not a statement that later work
reran them or that all skills now use original-source rendering. On each new
publication, record the exact recipe/source hashes, commands, prepared files,
runtime checks, visual reference and unresolved deviations. See the handbook
for the current evidence and handoff rules.
