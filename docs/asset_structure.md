# FFBE Asset Dump Atlas & Structure Guide

## Raw-data layout (since 2026-11-08) - read first

All raw FFBE sources live in one git-ignored folder, each source exactly once:

| Folder | Former location | Content |
|---|---|---|
| `rawdata/assets/` | `assets/` | Godot dump: battle_effect authoring, static_data DB, unit/monster spritesheets, town_data, ui, icons |
| `rawdata/ffbe_asset_dump/` | `ffbe_asset_dump-main/` | GitHub decoded dump: unit/monster animated CSV+PNG, items, illustrations, battle_bg |
| `rawdata/ffbe_data/` | `ffbe_data-master/` | GitHub master-data JSON |
| `rawdata/android-global/` | `com.square_enix.android_googleplay.FFBEWW/` | Global Android client (VerN_ BGM/SE banks, encrypted mst) |
| `rawdata/memorial-packs/` | `tools/data/memorial-audit/trace-clone-backup/assetpacks/` | JP Memorial on-demand asset packs |
| `rawdata/memorial-downloads/` | `tools/data/memorial-side-stories/` | JP Memorial download cache (most BGM, see below) |

Rules:
- Byte-identical copies are stored once as NTFS hard links. Run
  `<python> -I tools/audit_raw_duplicates.py --hardlink` after adding sources. The first run linked
  94,490 files and saved 2.3 GB. Treat rawdata as read-only: a tool must never rewrite an existing
  raw file in place, because hard-linked twins share the bytes. Write new files instead.
- Receipts, plans and provenance written before the move record the old locations. Code that reads such
  recorded paths goes through `resolveRawPath` (`tools/lib/raw-paths.mjs`) or `resolve_raw_path`
  (`tools/raw_paths.py`), a deterministic prefix rename. Hashed receipts are not rewritten.
- Same-name pairs that are NOT byte-identical stay. They are different encodings needed by different
  tools (for example dump CSV/PNG versus Godot rawpng spritesheets).
- What used space beyond the raw sources was old research data in `tools/data`; see the cleanup below.

## Raw-data sources and duplicate audit (2026-11-08)

Five local raw sources exist; all are git-ignored. `tools/audit_raw_duplicates.py` (read-only,
size-grouped SHA-256) inventories them. Receipts: `tools/data/raw-dedup/summary.json` and
`duplicate-groups.json`.

| Source id | Path | Files | Size | Content |
|---|---|---|---|---|
| android-global | `rawdata/android-global/` | 1,357 | 5.6 GB | Global Android client: `VerN_` BGM/SE `.acb`, encrypted `mst/*.dat` |
| jp-assetpacks | `rawdata/memorial-packs/` | 4,126 | 7.0 GB | JP Memorial on-demand packs (252 `.acb`, CPK, battle_effect sources) |
| github-asset-dump | `rawdata/ffbe_asset_dump/` | 148,132 | 3.4 GB | Decoded PNG/CSV/GIF dump (units, monsters, items, battle_bg) |
| github-data | `rawdata/ffbe_data/` | 37 | 0.1 GB | Master-data JSON |
| godot-assets | `assets/` | 175,171 | 13.5 GB | Second decoded dump with Godot `.import` sidecars (sprites, town_data, battle_effect, 6 BGM `.wav`) |

Findings:
- Byte-identical redundancy is only 2.2 GB of 30 GB. The sources mostly complement each other:
  - 1.46 GB is reuse inside `assets/` (identical mapchips across towns, identical idle/atk sheets of placeholder units);
  - 0.34 GB is reuse inside the GitHub dump (GIFs/CSVs of placeholder units);
  - 0.29 GB is shared between the GitHub dump and `assets/` (15,777 groups: items, illustrations, icons, battle_bg);
  - 90 MB is shared between android-global and jp-assetpacks (37 BGM `.acb`). A `VerN_` prefix in the global client does not change the bytes.
- 17,690 logical names exist in both decoded dumps. Rule: when both have the resource, pipelines read the
  decoded `rawdata/ffbe_asset_dump/` copy; `assets/` stays the source for what only it has (battle_effect
  authoring, town_data, unit/monster spritesheets). Audio rule: raw `.acb` from jp-assetpacks first,
  android-global second (it alone has several FF7R/FFX/FFXII tracks such as `la00713`).
- Not deduplicated physically: moving files would break the recorded source paths and hashes in
  workflows and receipts for little gain. Space is dominated by research data, not by raw sources:
  `tools/data` is 92 GB, of which `memorial-audit/lifecycle-v27-backup/engine` (44 GB) is a cold copy of
  the BlueStacks VM disks and `visual-preservation` 9.8 GB / `memorial-audit/diagnostic-v*` ~10 GB
  were old receipts. Cleanup 2026-11-08 (developer: "keep only what is still needed"): deleted the
  VM disk copy (`lifecycle-v27-backup/engine`; the live BlueStacks instances remain the source), the
  45 archived snapshot zips in `visual-preservation/`, and `diagnostic-v8/v13/v14`. Every diagnostic
  folder still read by a test or tool was kept. `tools/data` went from 92 to 37 GB, and all tests still pass.

Correction (same day): the classic tracks DO exist, in a sixth source. After the developer played
a Mako Reactor battle in the JP Memorial client, `la842_bgm_ff7_tatakaumono` was found on the
BlueStacks VM disk: on-demand downloads live in app-internal storage
`/data/data/com.square_enix.ffbejpn/files/side_stories/<sha256 of file>/<original name>`, which adb
cannot read without root.

| Source id | Path | Files | Size | Content |
|---|---|---|---|---|
| memorial-side-stories | `rawdata/memorial-downloads/` | 1,856 | 2.8 GB | JP Memorial download cache: 286 BGM `.acb` (classic and remake battle/boss themes across FF I-XVI, FFT, Type-0, crossovers), 1,479 `.cpk`, 18 `.usm`, scenes |

Reproduce (read-only; the VM may keep running):
`<python> -I tools/extract_memorial_side_stories.py --pylib tools/data/pylib --disk C:/ProgramData/BlueStacks_nxt/Engine/Tiramisu64_2/Data.vhdx --out rawdata/memorial-downloads`
(`tools/data/pylib` = `pip install --target tools/data/pylib dissect.hypervisor dissect.extfs dissect.volume`).
`index.json` records name, bucket and SHA-256 per file. Re-run it after playing new content in the
Memorial client: the game downloads tracks on first use, so files appear only after they were needed.
Notable music for the stage importer: FFVII `la842` Let the Battles Begin!, `la843` Those Who Fight
Further, `la866` One-Winged Angel, `la890` jukai; FFVIII `la867` Don't Be Afraid, `la868` Force Your
Way; battle themes FF1 `la01501`, FF2 `la822`/`la01506`, FF3 `la813`/`la814`, FF4 `la807`/`la863`,
FF5 `la898`/`la816`, FF6 `la826`/`la827`, FF9 `la853`/`la937`, FF10 `la829`/`la833`, FF12 `la836`,
FF13, FF14, FF15, FF16 and FFT (`bgm_fft_*`).

## Reviewed higher same-unit forms (2026-11-02)

Original `unit`/`unit_class_up` rows confirm Cloud207000105->106->107 and
Aerith207000405->406->407 (5/6/7-star). Complete original atlas/CGG/CGS resources
for107/407 are prepared by reviewed tools/characters/*_form7.json recipes into
public/assets/forms/{cloud,aerith}_form7 (12/13 tracks). run-content.json records
published manifest SHA; no change to base units, source art, aura or15 Source plans.
Cloud207000117 retains raw rarity 7 but is marked NV in the master DB.
The current form graph also includes Delita253000227. See the character workflow.
No variant swap or fabricated star tier. The previous6-star forms remain available.

`inspect_form_appearance.py` now compares all four admitted forms to their5-star
base, aligned at original foot pivots over black/white. Differences remain subtle,
particularly Aerith. Browser same-position pairs and source receipts are in
 tools/data/crystal-forms-lever-20261102/. Raw7-star source atlas hashes are in
character-import-workflow.md; staging/publication manifests have different SHAs
because runtime assetKey is added during review. Do not confuse them.

Stage sampling resources,240-frame reactor packets, existing mainline inventory,
original archives and all research remain preserved. No new area/skill inventory
or native capture is needed for this block. New lever/crystal polish is CSS/markup,
not an imported graphic asset. Explicit UTF-8 prevents the previous glyph corruption.

## Form and future-stage evidence (2026-11-02)

inspect_form_appearance.py verifies both prepared same-unit5->6 forms against
original unitSeries/rare records and aligned visible pixels. Aerith's sprites are
similar, not identical; source atlases/sheets remain unchanged. Actual6-star texture
names and reloads are verified by review_awakening.mjs, not inferred from rarity.

inventory_stage_candidates.py now records1,286 original battle_bg rows, exact local
JPG availability1,262 rows and animation availability1,181 rows. The disk has1,351
JPGs/1,266 SSBPs. These are NOT mainline/publication counts. Original world ownership
joins are absent; reviewed proposals remain separate in tools/stages/mainline-candidates.json.
Twelve full profile probes found8 supported backs; only2013_06 has deformation.
Dollet120173, manor120144 and reactor05 /120141 are the current future shortlist;
see background-import-workflow.md for evidence boundaries/body candidates/music gaps.
No current arena replaced; no assets/research purged. The new three small reactor
soft-cell textures are generated exact crops with gutters, not new original data.

## Runtime loading and reactor preparation (2026-11-02)

Existing447-file audit remains historical; current bounded audit has449 selected
hashes/37 identical groups and64 source modules. No assets/tools/archives deleted.
The extra exact atlas copy in public/assets/stages/reactor is a required productive
reference, not an unreferenced cache. Disk/build inventory is distinct from browser
residency. Unused large limit sheets remain on disk but no longer preload.
Receipts: tools/data/stage-loading-20261102/architecture/architecture-assets.json.
Runtime measurements and memory caveats are in roguelike-foundation.md.

Reactor back/anime now has a bounded SSPB-v1 decoder/prepared quad exporter and
productive Phaser playback. Forest streams also decode, but active deformation
blocks publication in this profile. Exact shared atlas sources are unchanged;
read background-import-workflow.md for hashes, SDK revision and support limits.

## Current bounded discoveries (2026-11-02)

Original monster-skill ownership: exact monster_skill_set joins yield11 records
across Ochu/Guard Scorpion/Microchu/Sweeper. Existing CPK stager now accepts the
MONSTER_SKILL catalog type. Tail Laser's1 and Ochu Dance's2 original BMBs plus
dependencies were actually staged/hash-checked; zero original enemy skills are
admitted. See enemy-import-workflow.md for exact IDs and independent blockers.

Stage binaries are SSPB v1. Their image references are NOT necessarily same-stem:
forest0003_01 uses0003_01_1/0003_01_2.png, reactor2013_02 uses2013_01.png. Those
three atlases exist and have visible alpha data. The empty2013_02.png is not the
selected binary's atlas. No decoded original frame timing or animated stage is
claimed; see background-import-workflow.md and inspect_stage_animation.py.

Current bounded dependency/hash audit command:
python tools/audit_game_foundation.py --output tools/data/battle-polish-20261102/architecture
447 selected files hashed;36 identical-byte groups retained with their paths and
provenance.249 public files total41,170,989 disk bytes. All prepared PNG headers
sum to820.3MiB RGBA8 texels; this is not actual live VRAM or a loading benchmark.
Large unused limit sheets (one39342px wide) remain original prepared evidence;
the current eager body loader is a concrete next optimization, not a deletion
authorization. Source/research/raw/caches are classified separately in the receipt.

## Bounded battle-content addition (2026-11-02)

Selected and prepared original monster bodies: Microchu1110310, Ochu3110010,
Sweeper2061310, Guard Scorpion4060810; each has a local atlas, CGG, idle CGS and
atk CGS. All exported clips were validated/visually reviewed. Master identities,
original skill references and source hashes are in
tools/data/themed-stages-20261102/inventory.json and prepared monster source.json.
Reproduce: python tools/inventory_battle_content.py. Snapshot master counts:
16,937 monster rows,2,947 dictionary rows,6 worlds,769 dungeons,1,286 background
rows. These are metadata counts, NOT numbers of usable/published enemies/stages.
Only four bodies/two previously verified static arenas were admitted in this block.
Original dictionary fileName=test1 and default background/BGM values do not resolve
sprite identity or thematic music. Explicit reviewed recipes bind the local IDs.
See [enemy-import-workflow.md](enemy-import-workflow.md) for current support limits.
SSBP companion files are inventoried, not animated runtime content.

## Bounded audio source inventory (2026-10-28)

### Reviewed combat and Source cues

`tools/read_acb_cues.py <bank> --contains <name>` reads the ACB CueTable
and CueNameTable. Cue IDs are separate from decoder stream ordinals.
The assetpack 3 archives are SHA-256
`22d3f4bd8cae9c2a4ae7485f47b583d662563bb84489bd5db100f4668867565f` (SE)
and `d743912a1151a4e6f929f3f2e443bab32ad78485aa441facbda51c4db0818818` (System).
For the checked PCM exports use vgmstream r2168
`vgmstream-cli.exe -i -s <stream> -o <file> <bank>`.

| Bank | Cue ID | Stream | Cue name | Runtime file |
| --- | ---: | ---: | --- | --- |
| SE | 1 | 181 | se_attack_sword_slash_1 | sword.wav |
| SE | 7 | 24 | se_attack_hammer_strike_1 | strike.wav |
| SE | 12 | 859 | se_attack_gun_shot_1 | gun.wav |
| SE | 100 | 823 | se_special_flash_1 | flash.wav |
| SE | 600 | 234 | se_bg_vortex_90f_1 | vortex.wav |
| System | 47 | 9 | se_battle_extinct_1 | dissolve.wav |
| System | 48 | 17 | se_battle_special_extinct_1 | special-dissolve.wav |
| System | 69 | 4 | se_battle_critical | critical.wav |

The sword cue has multiple enumerated waves. FFRogue uses one checked
variant without touching gameplay RNG. Stream 24 has a second cue name
alias on the same wave. The decoded cue plays on the impact that FFRogue
actually executes, preserving its gameplay timeline and target rules.

The pinned Memorial ARM64 binary proves the event routing:
`GameUtils::playSEWithGroupID` at 0x14918a0 reads offset and Cue ID, then
uses the common bank if field 3 equals 1 (or is absent). Other third
values take the system-bank path. The respective bank loaders resolve
`SE.acb` and `System.acb`. `BattleUnit::setDamage` calls System 69 in
its critical branch (0x13358dc). `MonsterUnit::deadFadeOut` dispatches
47 after the normal fade call (0x1308cb8) and 48 on the special branch
(0x1308ce0). The jump table at 0x253ce83 maps original
`battle_group.deadEffect` 0 to 47 and 1 to 48. All ten Microchu rows use
0. The rows for Sweeper, Ochu and Guard Scorpion use 1. The runtime
therefore uses 48 for Sweeper as well as the two current bosses.

Published basic profiles require a single common cue across all original
attack groups for the form. Composite original attacks such as Cloud AC
and Delita NV need a separate mapping to the condensed FFRogue attack.
The alternative Aerith ranged action and FFRogue enemy attacks have no
approved standard cue. No independent universal hit or hero K.O. sample
was verified. See `tools/data/combat-sfx/` for disassembly and receipts.

UI review update. The Memorial `System.acb` under the preserved assetpack 3
archive has SHA-256
`d743912a1151a4e6f929f3f2e443bab32ad78485aa441facbda51c4db0818818`.
vgmstream r2168 lists 118 CRI HCA streams. The following named FFBE system
streams were exported to PCM using `vgmstream-cli.exe -i -s <index> -o <wav> <bank>`.
These are one-based stream indices. FFRogue owns the input-to-sound bindings.

| Index | Archived name | Published WAV |
| --- | --- | --- |
| 1 | `se_system_common_bump_1` | `system-bump.wav` |
| 107 | `se_system_common_no_1` | `system-back.wav` |
| 108 | `se_system_common_ok_1` | `system-confirm.wav` |
| 110 | `se_system_cursor_1` | `system-cursor.wav` |

An archived `se_system_select_abirity` stream also exists at index 116.
The shorter cursor cue is used for FFRogue skill and target selections.
The two historical system WAVs were not used as source. This supplies
FFBE UI audio. No Final Fantasy VII UI asset or original skill cue was
assigned. The slot mechanisms and reward chimes are FFRogue-authored.

Update 2026-11-03. The archived `la005_battle1.acb` decodes as CRI HCA and
its original forest background association is verified through resource
400005. The bounded Whisperwood playback path is in background-import-workflow.md.
The archived SE.acb also enumerates 876 streams through vgmstream. The first
stream is named `se_attack_kh_cloud`. This identifies an archive stream, not a
published hero or skill mapping. Skill and enemy tuples still need a native
dispatch-to-cue join and timing confirmation.

`rawdata/assets/audio/` currently has8 WAVs (6 background tracks and2 system SFX), not
skill mappings. Preserved Memorial assetpacks under
`rawdata/memorial-packs/` include252 .acb paths:
250 @UTF-header bank candidates and2 XML-header unvalidated files.126 adjacent
.dat files are UNCLASSIFIED, not confirmed audio streams. SE.acb under
on_demand_asset3/199/199/assets is32,641,440bytes and matches the running Trace
external-storage hash. Unreviewed cue/sample joins remain open. Inventory command:
`python tools/audit_audio_inventory.py --output tools/data/audio-review/inventory.json`.
Sound IDs/times come from resolved effect-group records, never basename guesses.
The initial audit predates the verified Whisperwood playback path described above.

This document is the source-location and naming reference for the local
`rawdata/ffbe_asset_dump/` inventory and additional raw packages. Counts and naming
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

`rawdata/android-global/` is an additional local Android
application backup supplied on 2026-10-22. Its `files/` directory contains original
CPK archives. The entire backup is Git-ignored and excluded from Vite watching.
Inspect archive member indexes before extracting selected assets into ignored
`tools/data/` storage. Keep application preferences, caches and account data out of
asset reports and runtime inputs. Archive presence alone does not establish
effect availability, payload readability or rendering support.

`rawdata/ffbe_data/` is a separate ignored DanUgore datamining checkout. Treat it
as offline metadata, not a runtime asset folder; Vite must not watch it.

The repository-root `assets/` directory is a separate, Git-ignored source package
from [ExviusReborn](https://github.com/Hirurawa/ExviusReborn). It is not the game's
`public/assets/` directory. Vite must not watch this raw package.

- `rawdata/assets/static_data/ffbe-data.db`: SQLite master data; open read-only.
- `rawdata/assets/battle_effect/`: converted Effekseer `.efkefc` particle effects and some
  original Matchlock/Bishamon `.bmsln` authoring files.
- `rawdata/assets/effect_resource/`: referenced textures and models.
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
