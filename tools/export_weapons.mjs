// Exports original FFBE weapon data (equip_item, equipType 1) to public/assets/items/weapons.json so a
// session without the raw database (cloud) can build weapon rewards. Only source fields; how weapons
// work in FFRogue (stat share, element imbue, rarity tiers) is a reviewed game decision made later.
// Icons: the icon table maps iconId -> iconFile (e.g. Buster Sword item_10303.png); copied from the dump's
// equip folders to public/assets/items/icons/<file>.
// Usage: node tools/export_weapons.mjs [--assets rawdata/assets]
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';

const ELEMENTS = ['fire', 'ice', 'lightning', 'water', 'wind', 'earth', 'light', 'dark'];
const AILMENTS = ['poison', 'blind', 'sleep', 'silence', 'paralysis', 'confusion', 'disease', 'petrification'];
const CATEGORIES = {1: 'dagger', 2: 'sword', 3: 'great sword', 4: 'katana', 5: 'staff', 6: 'rod', 7: 'bow', 8: 'axe',
  9: 'hammer', 10: 'spear', 11: 'harp', 12: 'whip', 13: 'throwing', 14: 'gun', 15: 'mace', 16: 'fist'};
const args = process.argv.slice(2);
const assets = args.includes('--assets') ? args[args.indexOf('--assets') + 1] : 'rawdata/assets';
const dbPath = path.join(assets, 'static_data/ffbe-data.db'), db = new DatabaseSync(dbPath, {readOnly: true});
const flags = (raw, names) => names.filter((_, i) => Number(String(raw ?? '').split(',')[i]) > 0);
const percents = (raw, names) => Object.fromEntries(names.map((n, i) => [n, Number(String(raw ?? '').split(',')[i]) || 0]).filter(([, v]) => v));
const rows = db.prepare(`SELECT e.*, x.explainShort FROM equip_item e LEFT JOIN equip_item_explain x ON x.equipId = e.equipId
  WHERE e.equipType = 1 AND e.rarity BETWEEN 1 AND 8 ORDER BY e.rarity, e.equipId`).all();
const iconOf = db.prepare('SELECT iconFile FROM icon WHERE iconId = ?');
const ICON_DIRS = ['rawdata/assets/equip', 'rawdata/ffbe_asset_dump/equip', 'rawdata/ffbe_asset_dump/items', 'rawdata/assets/items'];
fs.mkdirSync('public/assets/items/icons', {recursive: true});
const icon = iconId => {
  const file = iconOf.get(iconId)?.iconFile, dir = file && ICON_DIRS.find(d => fs.existsSync(path.join(d, file)));
  if (!dir) return undefined;
  const target = `public/assets/items/icons/${file}`;
  if (!fs.existsSync(target)) fs.copyFileSync(path.join(dir, file), target);
  return `/assets/items/icons/${file}`;
};
const seen = new Set(), weapons = [];
for (const r of rows) {
  if (!r.name || seen.has(r.name)) continue; // same-name reissues (+1/+2 variants keep their own name)
  seen.add(r.name);
  weapons.push({id: r.equipId, name: r.name, category: CATEGORIES[r.equipCategory] ?? `category ${r.equipCategory}`, rarity: r.rarity,
    stats: Object.fromEntries(['hp', 'mp', 'atk', 'def', 'mag', 'spr'].map(k => [k, r[k] ?? 0]).filter(([, v]) => v)),
    elements: flags(r.elementInflict, ELEMENTS), ailments: percents(r.ailmentInflict, AILMENTS),
    resist: percents(r.elemResistValue, ELEMENTS), ...(icon(r.iconId) ? {icon: icon(r.iconId)} : {}),
    ...(r.explainShort ? {description: String(r.explainShort).replace(/\s+/g, ' ').trim()} : {})});
}
// Signature weapons: a hero's own trust rewards (unit.trustMasterReward / superTrustMasterReward, "type:equipId")
// that are weapons. They always join the list (some sit outside the rarity filter or lost a same-name dedupe).
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const byId = new Map(weapons.map(w => [w.id, w]));
for (const key of read('public/assets/content.json').characters) {
  const unitId = Number(read(`public/assets/units/${key}/character.json`).provenance?.spriteUnitId);
  const row = db.prepare('SELECT trustMasterReward t, superTrustMasterReward s FROM unit WHERE unitId = ?').get(unitId);
  for (const reward of [row?.t, row?.s].filter(Boolean)) {
    const equipId = Number(String(reward).split(':')[1]);
    const r = db.prepare(`SELECT e.*, x.explainShort FROM equip_item e LEFT JOIN equip_item_explain x ON x.equipId = e.equipId
      WHERE e.equipId = ? AND e.equipType = 1`).get(equipId);
    if (!r) continue;
    if (!byId.has(r.equipId)) {
      const weapon = {id: r.equipId, name: r.name, category: CATEGORIES[r.equipCategory] ?? `category ${r.equipCategory}`, rarity: r.rarity,
        stats: Object.fromEntries(['hp', 'mp', 'atk', 'def', 'mag', 'spr'].map(k => [k, r[k] ?? 0]).filter(([, v]) => v)),
        elements: flags(r.elementInflict, ELEMENTS), ailments: percents(r.ailmentInflict, AILMENTS),
        resist: percents(r.elemResistValue, ELEMENTS), ...(icon(r.iconId) ? {icon: icon(r.iconId)} : {}),
        ...(r.explainShort ? {description: String(r.explainShort).replace(/s+/g, ' ').trim()} : {})};
      weapons.push(weapon); byId.set(r.equipId, weapon);
    }
    const weapon = byId.get(r.equipId);
    weapon.signatureOf = [...new Set([...(weapon.signatureOf ?? []), key])];
    // Every variant of the same character shares it (run-content canonicalIdentity, e.g. ff7:cloud-strife).
    const canonical = read('public/assets/run-content.json').units[key]?.canonicalIdentity;
    if (canonical) weapon.signatureFor = [...new Set([...(weapon.signatureFor ?? []), canonical])];
  }
}
fs.mkdirSync('public/assets/items', {recursive: true});
const digest = (await import('node:crypto')).createHash('sha256').update(fs.readFileSync(dbPath)).digest('hex');
fs.writeFileSync('public/assets/items/weapons.json', JSON.stringify({schema: 'ffbe-weapons-v1',
  source: {database: 'static_data/ffbe-data.db', sha256: digest, table: 'equip_item (equipType 1)'},
  elements: ELEMENTS, ailments: AILMENTS, weapons}) + '\n');
console.log(`signature weapons ${weapons.filter(w => w.signatureOf).length}; weapons ${weapons.length}; with icon ${weapons.filter(w => w.icon).length}; with element ${weapons.filter(w => w.elements.length).length}; by rarity ${JSON.stringify(Object.fromEntries([...new Set(weapons.map(w => w.rarity))].map(r => [r, weapons.filter(w => w.rarity === r).length])))}`);
