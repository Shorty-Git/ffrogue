# Cloud skill effect research

## Scope and result

Source unit: Cloud `207000105`, unit series `207000105`. The three currently equipped
skills are confirmed in the local `unit_series_lv_acquire` table:

| Skill | Ability ID | Unlock | MP | Damage frames |
| --- | --- | --- | --- | --- |
| Brave Slash | 214800 | 5-star, level 1 | 18 | 6 |
| Blade Beam | 214810 | 5-star, level 57 | 30 | 4, 8 (50% each) |
| Climhazzard | 214820 | 6-star, level 28 | 52 | 4 |

The `ability.rarity` field is not the acquisition rarity. Acquisition rows are the
source of unlock levels. Climhazzard's process is damage with 50% DEF ignore, not
ignore-cover; the existing gameplay description is inaccurate in that respect.
No balancing or gameplay metadata has been changed during this research.

## Essential indirection

`effectFrames` references **effect groups**, which reference individual effects:

`ability -> effect_group -> effect -> fileInfo -> .efkefc -> textures/models`

This is confirmed by ExviusReborn's
[get_effect_data implementation](https://github.com/Hirurawa/ExviusReborn/blob/main/godot/core/services/game_database.gd).
Directly looking up group `5008050` in `effect` incorrectly returns a green
full-screen fade. Correct resolution returns pink impact effect `5006440`.
That failed hypothesis was rejected before touching gameplay assets.

## Resolved composition

Frame offsets below are the skill's `effectFrames` offsets. The reference
[effect spawner](https://github.com/Hirurawa/ExviusReborn/blob/main/godot/features/battle/ui/effect_spawner.gd)
interprets these at 60 frames per second. They are not indices into Cloud's body
spritesheet. Raw group-member fields are preserved without guessing their semantics.

| Skill / start frame | Group | Effect IDs | Converted files / status |
| --- | --- | --- | --- |
| Brave Slash / 4 | 5008050 | 5006440 | `atk_impact_001_pink.efkefc` |
| Blade Beam / 0 | 5003901 | 5006511 | `atk_aerialslash_001_green.efkefc`; scale field 300 |
| Blade Beam / 4 | 1000660 | 1000660 | `atk_slash5_blue.efkefc` |
| Climhazzard / 0 | 5014250 | 1001212, 1001213, 1001702 | `atk_slash7_side_purple.efkefc` twice, rotations 330/210 and scale fields 50; `atk_blow1_purple.efkefc`, scale field 200 |
| Climhazzard / 20 | 5007070 | 5004170 | **Missing:** `atk_powergeyser_001_purple.bmb/.bmsln/.efkefc` |
| Climhazzard / 20 | 7000970 | — | `SPECIAL_EXPLODE_1`, no effectData, special field `1:98:1` |
| Climhazzard / 0 | 5002080 | 5002110 | `eff_strobe_white_a50_f30.efkefc` |

ExviusReborn returns an empty list for groups without `effectData`; its spawner also
centers wrappers and does not decode all placement/transform fields. It is useful
evidence for the lookup chain, but not a complete original-engine specification.
The `SPECIAL_EXPLODE_1` behavior is therefore still unresolved, not reconstructed.

## Actual verification

- Indexed filenames only: 136,129 files excluding `.import` sidecars. The inventory
  stays in ignored `tools/data/cloud-effects/asset-paths.txt`.
- Read only relevant SQLite rows and their directly referenced effect files.
- All resource paths extracted from the seven available effect instances exist.
- Rendered seven instances (six unique effect files) with official Effekseer
  WebGL 1.80.7: 40 sampled frames each, one sample every three simulation frames.
- Contact sheets are in `tools/data/cloud-effects/previews/`; renderer results
  are in `results.json`. The inspection summary is `summary.png`.
- Visual checks confirm the pink impact, green moving crescent and purple cuts.
  Some converted effects include rectangular flash planes. Their composition,
  camera, clipping, original scale and placement need validation before runtime use.
- Diagnostic previews use a fixed orthographic camera and neutral background;
  they are individual effects, not final composites or game-ready spritesheets.
  They deliberately do not apply the master-data group transforms.
- No new runtime assets or skill VFX were installed. The three gameplay skills
  still use the existing behavior. This avoids presenting an incomplete or
  incorrectly positioned composite as an authentic FFBE animation.

## Reproduce

Requires Node.js 24 with built-in `node:sqlite` and the local asset package.

```powershell
node tools/analyze_cloud_effects.mjs
```

This writes [cloud-skill-effects.json](cloud-skill-effects.json), including every
raw group field, asset checksum, dependency and unresolved reference. Only this
compact report is tracked; raw assets and SDK binaries remain ignored.

For diagnostics, extract the official
[Effekseer WebGL 1.80.7 release](https://github.com/effekseer/Effekseer/releases/download/1807/EffekseerForWebGL1.80.7.zip)
into `tools/bin/effekseer-webgl-1.80.7`, then run:

```powershell
node tools/preview_cloud_effects.mjs
```

Open `http://127.0.0.1:3101/`. The local-only server serves an explicit allowlist
of the selected effects and dependencies and saves diagnostic PNGs into the
ignored preview directory. Stop it after use.

## Additional sources and next implementation boundary

- [ExviusReborn assets provenance](https://github.com/Hirurawa/ExviusReborn#assets):
  modified FFBE dump, with the large package distributed separately from Git.
- [DanUgore JP ability data](https://github.com/DanUgore/ffbe_data/blob/master/jp/ability.json):
  confirms the three IDs, MP costs and damage frames; does not supply the missing
  visual effect resources or the engine-group behavior. Its GL ability dataset
  does not contain these three IDs.

Next work is offline compositing/export with decoded placement and blend behavior,
followed by runtime integration of standard sheets. Exact Climhazzard reproduction
also needs the missing powergeyser asset and the special-group behavior. Do not
substitute another spell or a geometric placeholder without explicitly changing
the authenticity requirement.
