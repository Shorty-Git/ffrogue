"""Python twin of tools/lib/raw-paths.mjs: map pre-2026-11-08 raw-source paths to rawdata/."""
from pathlib import Path

LEGACY = [
    ('tools/data/memorial-audit/trace-clone-backup/assetpacks/', 'rawdata/memorial-packs/'),
    ('tools/data/memorial-side-stories/', 'rawdata/memorial-downloads/'),
    ('com.square_enix.android_googleplay.FFBEWW/', 'rawdata/android-global/'),
    ('ffbe_asset_dump-main/', 'rawdata/ffbe_asset_dump/'),
    ('ffbe_data-master/', 'rawdata/ffbe_data/'),
    ('assets/', 'rawdata/assets/'),
]
RAW_ASSET_DIRS = {'abilities', 'audio', 'battle_bg', 'battle_effect', 'chocobo', 'effect_resource', 'equip', 'esper',
                  'icons', 'items', 'map_common', 'map_effect', 'map_icons', 'maps', 'materia', 'models', 'monster_icon',
                  'monster_spritesheets', 'npc1', 'npc2', 'spdungeon', 'static_data', 'town', 'town_data', 'ui',
                  'unit_icons', 'unit_illustrations', 'unit_spritesheets', 'world'}


def resolve_raw_path(file):
    if file is None:
        return file
    text = str(file).replace(chr(92), '/')
    for old, new in LEGACY:
        if not text.startswith(old):
            continue
        if old == 'assets/' and text[len(old):].split('/')[0] not in RAW_ASSET_DIRS:
            return file
        resolved = new + text[len(old):]
        return Path(resolved) if isinstance(file, Path) else resolved
    return file
