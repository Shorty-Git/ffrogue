# FFBE Asset Dump Atlas & Structure Guide

This document is the source-location and naming reference for the local
`ffbe_asset_dump-main/` inventory and additional raw packages. Counts and naming
examples describe the cataloged snapshot; they are not current availability or
format-support guarantees. Consult [the asset pipeline handbook](asset-pipeline-handbook.md)
for the current support boundary and task-specific workflows.

> [!IMPORTANT]
> Always consult this guide before searching for or importing units, monsters, battle backgrounds, or visual effects.

---

## 1. High-Level Summary

For characters and existing converted-effect publication, follow
[the character import standard](character-import-workflow.md). For original
skill reconstruction, follow [the skill workflow](skill-reconstruction-workflow.md).
For backgrounds, follow [the background workflow](background-import-workflow.md).
Do not treat historical direct-import commands as the reviewed publication path.

### Additional local ExviusReborn assets

`com.square_enix.android_googleplay.FFBEWW/` is an additional local Android
application backup supplied on 2026-10-22. Its `files/` directory contains original
CPK archives. The entire backup is Git-ignored and excluded from Vite watching.
Inspect archive member indexes before extracting selected assets into ignored
`tools/data/` storage. Keep application preferences, caches and account data out of
asset reports and runtime inputs. Archive presence alone does not establish
effect availability, payload readability or rendering support.

`ffbe_data-master/` is a separate ignored DanUgore datamining checkout. Treat it
as offline metadata, not a runtime asset folder; Vite must not watch it.

The repository-root `assets/` directory is a separate, Git-ignored source package
from [ExviusReborn](https://github.com/Hirurawa/ExviusReborn). It is not the game's
`public/assets/` directory. Vite must not watch this raw package.

- `assets/static_data/ffbe-data.db`: SQLite master data; open read-only.
- `assets/battle_effect/`: converted Effekseer `.efkefc` particle effects and some
  original Matchlock/Bishamon `.bmsln` authoring files.
- `assets/effect_resource/`: referenced textures and models.
- Resolve skill visuals through `ability.effectFrames -> effect_group.effectData
  -> effect.fileInfo`. **Do not join effectFrames directly to effect.effectId.**
  Group IDs and effect IDs overlap but can identify unrelated visuals.
- `effect.fileInfo` can contain colon-separated transform values after the file
  name. `.bmb` master references may have `.efkefc` converted counterparts, but
  the original BMB must be resolved from the CPK backup for original-data research.
  A conversion is not proof of the original shader, UV, geometry or placement.
- Some groups describe engine behavior without `effectData`; some referenced
  files are missing. Do not silently replace either with unrelated effects.
- Runtime code must continue loading only processed sheets and clean JSON.

See [Cloud effect research](research/cloud-skill-effects.md) for the first verified
mapping and offline preview procedure. These converted effects have not yet been
validated as pixel-identical reproductions of the original FFBE renderer.

- **Total Directories:** 39
- **Total Cataloged Files:** 147.752 files
- **Primary Resource Types:**
  - **Characters (Sprites & Animation CSVs):** `unit_animated/` (4.035 sheets) & `unit_animated_csv/` (53.450 CSV tracks)
  - **Monsters (Sprites & Animation CSVs):** `monster_animated/` (3.729 sheets) & `monster_animated_csv/` (13.604 CSV tracks)
  - **Animated Preview GIFs:** `animated_gifs/` (37.968 preview GIFs)
  - **Battle Backgrounds:** `battle_bg/` (4.007 arena textures)
  - **UI / Particle Materials:** `ui_effect/` (46 beam, ring, and aura textures)
  - **Skill & Ability Icons:** `abilities/` (480 icons)

---

## 2. Complete Directory Map

| Folder | File Count | Primary Extensions | Primary Prefixes / Contents | Description & Role |
| :--- | :---: | :--- | :--- | :--- |
| `abilities/` | 480 | .png (447), .bmb (31), .ssbp (2) | ability (269), global_ability (136) | Active skill & ability square icons (PNG) |
| `animated_gifs/` | 37.968 | .gif (37968) | unit (37968) | Pre-rendered animated GIF previews for units, monsters & effects |
| `battle_bg/` | 4.007 | .png (1389), .jpg (1351), .ssbp (1266) | battle_bg (3930), sg_battle (72) | Background images, layered/atlas textures and SSBP animation data; inspect composition before use |
| `catalog/` | 9 | .json (9) | unit_identity (2), legacy_unit (1) | Game dump JSON catalogs and index manifests |
| `chain_ability/` | 61 | .png (61) | chain_ability (61) | Chaining family icons and badges |
| `emblems/` | 472 | .png (472) | emblem (383), global_emblem (89) | Player profile rank emblems and badges |
| `equip/` | 2.968 | .png (2968) | item (2276), global_equip (521) | Weapon, armor, and accessory item sprites |
| `ex_gambit_icons/` | 30 | .png (30) | ex_gambit (30) | Gambit and action condition icons |
| `gallery/` | 10 | .png (10) | fina (1), hyou (1) | Cutscene stills and promotional artwork |
| `global_abilities/` | 273 | .png (273) | global_ability (273) | Global-exclusive ability icons |
| `global_emblems/` | 262 | .png (262) | global_emblem (262) | Global-exclusive player emblems |
| `global_equipment/` | 1.135 | .png (1135) | global_equip (1135) | Global-exclusive weapon and equipment icons |
| `global_items/` | 1.038 | .png (1038) | global_item (1037), icon_cow (1) | Global-exclusive consumable icons |
| `global_materia/` | 26 | .png (26) | global_materia (26) | Global-exclusive materia icons |
| `items/` | 9.826 | .png (9822), .plist (4) | item (8787), global_equip (521) | Consumable item and material icons |
| `materia/` | 272 | .png (272) | global_ability (135), ability (109) | Standard materia equipment icons |
| `misc/` | 15 | .png (15) | Expedition_tme (1), icon_arena (1) | Miscellaneous game textures (recipes, banners) |
| `monster_animated/` | 3.729 | .png (3718), .bmb (11) | monster_anime (3729) | Raw monster sprite atlas sheets (PNG) |
| `monster_animated_csv/` | 13.604 | .csv (13604) | monster_atk (3720), monster_cgg (3712) | Monster part coordinates (CGG) & animation tracks (CGS) |
| `monster_assets/` | 113 | .png (113) | monster_ills (113) | Monster SSBP files and frame pieces |
| `monster_icon/` | 3.599 | .png (3599) | monster_icon (3599) | Monster bestiary portrait icons |
| `regional_units/` | 2 | [none] (2) | gl (1), jp (1) | Region-specific unit variants |
| `reports/` | 4 | [none] (4) | Varied | Asset update and compilation reports |
| `tools/` | 18 | .py (16), .md (1), .txt (1) | build_unit (2), test_build (2) | Dump maintenance scripts |
| `town/` | 93 | .png (92), .jpg (1) | town_thumbnail (69), map_character (10) | Town exploration map textures and tiles |
| `ui_effect/` | 46 | .png (46) | lapis_eff (9), deffuse_aura (4) | Standalone spell, laser, aura, and beam particle textures |
| `unit_animated/` | 4.035 | .png (4035) | unit_anime (4035) | Raw character unit sprite atlas sheets (PNG) |
| `unit_animated_csv/` | 53.450 | .csv (53450) | unit_magic (7912), unit_win (7371) | Unit part coordinates (CGG) & animation tracks (CGS) |
| `unit_assets/` | 415 | .png (381), .fnt (17), .plist (11) | unit_atk (251), unit_idle (48) | Character SSBP animation binaries and individual frames |
| `unit_bundles/` | 1 | .zip (1) | identity (1) | Promotional bundle images |
| `unit_icons/` | 3.953 | .png (3953) | unit_icon (3953) | Character portrait icons (party select / compendium) |
| `unit_illustrations/` | 3.952 | .png (3952) | unit_ills (3952) | Full-body character official illustrations (PNG) |
| `vc_animated_csv/` | 720 | .csv (720) | vc_cgg (360), vc_cgs (360) | Vision Card animated CSV files |
| `vc_bg/` | 6 | .png (6) | vc_bg (6) | Vision Card background art |
| `vc_frame/` | 6 | .png (6) | vc_frame (6) | Vision Card frame borders |
| `vc_vignette_animated/` | 360 | .png (360) | vc_vignette (360) | Vision Card animated vignette sheets |
| `vc_vignette_icon/` | 361 | .png (361) | vc_vignette (361) | Vision Card vignette icons |
| `vc_vignette_item/` | 395 | .png (395) | vc_vignette (395) | Vision Card item representations |
| `world/` | 33 | .png (25), .jpg (8) | world_icon (12), world_map (8) | World map exploration node textures |

---

## 3. Naming Conventions & Patterns

### A. Character Assets (`unit_*`)
Character assets share a 9-digit unit identifier (e.g. `207000105` for Cloud):
- **Raw Atlas Texture:** `unit_animated/unit_anime_<UNIT_ID>.png`
- **Part Coordinate Definition (CGG):** `unit_animated_csv/unit_cgg_<UNIT_ID>.csv`
- **Animation Track (CGS):** `unit_animated_csv/unit_<ANIM>_cgs_<UNIT_ID>.csv`
  - Common animations: `idle`, `move`, `atk`, `standby`, `magic_atk`, `magic_standby`, `limit_atk`, `dead`, `dying`, `jump`, `win`, `win_before`.
  - Multi-attack units (e.g. NV units): `atk1`, `atk2`, `atk3`, `limit_move`, `brave_shift`.
- **UI Icons:** `unit_icons/unit_icon_<UNIT_ID>.png`
- **Illustrations:** `unit_illustrations/unit_ills_<UNIT_ID>.png`

### B. Monster Assets (`monster_*`)
Monster assets share a 4-to-6 digit monster identifier (e.g. `10001` for Dire Rat):
- **Raw Atlas Texture:** `monster_animated/monster_anime_<MONSTER_ID>.png`
- **Part Coordinate Definition (CGG):** `monster_animated_csv/monster_cgg_<MONSTER_ID>.csv`
- **Animation Track (CGS):** `monster_animated_csv/monster_<ANIM>_cgs_<MONSTER_ID>.csv`
  - Common animations: `idle`, `move`, `atk`, `die`, `damage`.
- **Monster Icons:** `monster_icon/monster_icon_<MONSTER_ID>.png`

### C. Animated GIFs (`animated_gifs/`)
The `animated_gifs/` folder contains 37.968 pre-rendered GIF files:
- **Unit Previews:** 37.923 files (Pattern: `unit_<ID>_<ANIM>_opac.gif`, e.g. `unit_207000105_1idle_opac.gif`)
- **Monster Previews:** 0 files (Pattern: `monster_<ID>_<ANIM>_opac.gif`)
- **Attack Effect Overlays:** 45 files (Pattern: `unit_<ID>_atkeff_opac.gif` or `unit_<ID>_limitatkeff_opac.gif`)
  - Samples: `unit_100004403_atkeff_opac.gif`, `unit_100004404_atkeff_opac.gif`, `unit_100004405_atkeff_opac.gif`, `unit_100011203_atkeff_opac.gif`

### D. UI & Particle Effect Materials (`ui_effect/`)
Contains 46 standalone texture assets used for spells, beams, lasers, and summon auras:
- **Beams & Lasers:** `beam_003.png`, `beam_005.png`, `deffuse_laser_002.png`
- **Auras & Glows:** `deffuse_aura_001.png`, `glow_001.png`, `glow_008.png`
- **Rings & Particles:** `eff_material_33_0016_ring18.png`, `lapis_eff_material_003_0016_cross2.png`, `thunder1_1_128_128.png`

### E. Battle Backgrounds (`battle_bg/`)
The inventory contains 4.007 background-related files, not 4.007 verified complete scenes.
- **Naming Pattern:** `battle_bg_<BG_ID>.<extension>`; stems can have numbered
  suffixes and multiple JPG/PNG/SSBP companions.
- **Interpretation:** A JPG can be the complete static scene while a same-stem PNG
  contains atlas pieces or overlays. Inspect actual pixels, dimensions and alpha.
  SSBP playback and original layered animation are not implemented by the current
  background path. Do not interpret companion files as an ordered frame sequence.
- **Current workflow:** [Background selection, provenance and arena fit](background-import-workflow.md).

---

## 4. 9-Digit Unit ID Deciphering Table

Many observed 9-digit unit IDs resemble `GSS0000RR`. The table below is a naming
aid for the cataloged forms, not a general decoding or identity-join algorithm.
Resolve the exact form and `unit.unitSeries` in the selected database; do not
truncate digits, infer missing forms, or merge GL/JP rows by name.
- **`G` (1st digit):** Game Category
  - `1`: FFBE Original (e.g. `100000102` Rain, `100000202` Lasswell, `100000302` Fina)
  - `2`: Mainline Final Fantasy
  - `3`: Crossover / Collaboration
- **`SS` (2nd & 3rd digits):** Specific Final Fantasy Series

| Series Code | Game Title | Notable Characters & IDs |
| :---: | :--- | :--- |
| `201` | Final Fantasy I | Warrior of Light (`201000105`), Garland (`201000205`) |
| `202` | Final Fantasy II | Firion (`202000105`), The Emperor (`202000205`) |
| `203` | Final Fantasy III | Luneth (`203000105`), Cloud of Darkness (`203000803`) |
| `204` | Final Fantasy IV | Cecil (`204000103`), Kain (`204000204`), Rydia (`204000303`) |
| `205` | Final Fantasy V | Bartz (`205000103`), Exdeath (`205000203`), Gilgamesh (`205000805`) |
| `206` | Final Fantasy VI | Terra (`206000103`), Locke (`206000203`), Celes (`206000304`), Kefka (`206000403`) |
| `207` | Final Fantasy VII | Cloud (`207000105`), Barret (`207000204`), Tifa (`207000304`), Aerith (`207000405`), Sephiroth (`207000505`) |
| `208` | Final Fantasy VIII | Squall (`208000105`), Rinoa (`208000205`) |
| `209` | Final Fantasy IX | Zidane (`209000103`), Garnet (`209000204`), Vivi (`209000303`) |
| `210` | Final Fantasy X | Tidus (`210000105`), Yuna (`210000205`), Auron (`210000705`), Lulu (`210002507`) |
| `211` | Final Fantasy XI | Shantotto (`211000104`) |
| `212` | Final Fantasy XII | Vaan (`212000103`), Balthier (`212000405`) |
| `213` | Final Fantasy XIII | Lightning (`213000105`) |
| `214` | Final Fantasy XIV | Y'shtola (`214000104`) |
| `215` | Final Fantasy XV | Noctis (`215000105`), Gladiolus (`215000205`), Prompto (`215000305`) |
| `216` | Final Fantasy Tactics | Ramza (`216000105`), Agrias (`216000204`) |
| `254` | Type-0 | Ace (`254000105`), Trey (`254000403`), Rem (`254000905`) |
| `313` | Bravely Default | Edea (`313000404`), Agnes (`313000105`) |
| `322` | NieR: Automata | 2B (`322000105`), 9S (`322000204`), A2 (`322000305`) |
| `331` | Xenogears | Fei (`331000105`), Elly (`331000205`) |
| `335` | Kingdom Hearts | Sora (`335000105`), Cloud KH (`335000205`) |

- **Observed suffix examples (not a universal rarity/NV rule):**
  - `03`: 3★ Base Form
  - `04`: 4★ Base Form
  - `05`: 5★ Base Form
  - `06`: 6★ Awakening Form
  - `07`: 7★ Awakening Form
  - `17` / `27`: Neo Vision (NV) & Brave Shift Form

---

## 5. Standard Import Workflows

### Inspect before publishing

Confirm exact local filenames first. Unit preview GIFs can help compare body
poses, but are not the source of a full composited skill. The catalog records
no monster GIFs; do not assume a fabricated monster preview path exists.
Read the atlas together with its matching CGG and CGS tracks.

### Characters and existing converted effects

Use the [recipe-based character workflow](character-import-workflow.md), starting
with an inspection-only command:

```powershell
npm run character:import -- --recipe tools/characters/cloud.json
```

The older `tools/import_unit.py` is a lower-level/legacy path, including monster
sheet conversion. It does not supply the reviewed character/skill catalog and
publication contract. No `tools/import_unit.mjs` exists in this checkout.
Importing enemy art does not configure enemy abilities, AI, boss behavior or a
generic monster-recipe pipeline. Review those integrations separately.

### Backgrounds and original skills

Use [the background workflow](background-import-workflow.md) for the exact
Reactor/Forest sources, static copying, fit, ground plane and runtime integration.
There is no general animated-background exporter or background catalog loader.

Use [the original skill workflow](skill-reconstruction-workflow.md) for indexed
CPK extraction, BMB/M3R decoding, matched BMSLN supplements, preview preparation,
capability checks and unresolved renderer semantics. It produces research plans;
it is not a replacement publication command for the current game's spritesheets.
