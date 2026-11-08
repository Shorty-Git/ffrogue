// Raw FFBE sources live under rawdata/ since 2026-11-08 (docs/asset_structure.md). Receipts, plans and
// provenance written before that record the old top-level locations; resolveRawPath renames those
// prefixes deterministically so recorded evidence stays valid without rewriting hashed files.
const LEGACY = [
  ['tools/data/memorial-audit/trace-clone-backup/assetpacks/', 'rawdata/memorial-packs/'],
  ['tools/data/memorial-side-stories/', 'rawdata/memorial-downloads/'],
  ['com.square_enix.android_googleplay.FFBEWW/', 'rawdata/android-global/'],
  ['ffbe_asset_dump-main/', 'rawdata/ffbe_asset_dump/'],
  ['ffbe_data-master/', 'rawdata/ffbe_data/'],
  ['assets/', 'rawdata/assets/'],
];
const RAW_ASSET_DIRS = new Set(['abilities','audio','battle_bg','battle_effect','chocobo','effect_resource','equip','esper','icons','items','map_common','map_effect','map_icons','maps','materia','models','monster_icon','monster_spritesheets','npc1','npc2','spdungeon','static_data','town','town_data','ui','unit_icons','unit_illustrations','unit_spritesheets','world']);

export function resolveRawPath(file) {
  if (typeof file !== 'string') return file;
  const normalized = file.replaceAll(String.fromCharCode(92), '/');
  for (const [from, to] of LEGACY) {
    if (!normalized.startsWith(from)) continue;
    if (from === 'assets/' && !RAW_ASSET_DIRS.has(normalized.slice(from.length).split('/')[0])) return file;
    return to + normalized.slice(from.length);
  }
  return file;
}
