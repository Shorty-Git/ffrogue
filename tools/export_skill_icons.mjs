// Publishes the original FFBE icon of every published skill.
//
// Each skill's `type:ffbeId` is resolved through `ability.iconId` / `magic.iconId` in the master
// database (iconId 7000000NN -> abilities/ability_NN[_HD].png in the asset dump). Icons are copied
// unchanged; the HD variant is preferred. Output: public/assets/icons/skills/ plus index.json
// (runtime lookup and provenance). A skill without a resolvable icon fails the export instead of
// silently borrowing another image.
//
// Run from the repository root after publishing skills:
//   node tools/export_skill_icons.mjs [--assets assets] [--dump ffbe_asset_dump-main]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';

const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const assets = arg('--assets') ?? 'assets';
const dump = arg('--dump') ?? 'ffbe_asset_dump-main';
const output = 'public/assets/icons/skills';
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const ICON_BASE = 700000000;

const db = new DatabaseSync(path.join(assets, 'static_data/ffbe-data.db'), {readOnly: true});
const unitsRoot = 'public/assets/units';
const skills = [];
for (const unit of fs.readdirSync(unitsRoot).sort()) {
  const file = path.join(unitsRoot, unit, 'skills.json');
  if (!fs.existsSync(file)) continue;
  for (const skill of JSON.parse(fs.readFileSync(file, 'utf8')).skills ?? []) skills.push({unit, skill});
}

fs.mkdirSync(output, {recursive: true});
const index = {source: 'assets/static_data/ffbe-data.db (ability/magic.iconId) + ' + dump + '/abilities', skills: {}, icons: {}};
const failures = [];
for (const {unit, skill} of skills) {
  const type = (skill.type ?? 'ABILITY') === 'MAGIC' ? 'MAGIC' : 'ABILITY';
  const table = type === 'MAGIC' ? 'magic' : 'ability';
  const row = db.prepare(`SELECT iconId FROM ${table} WHERE ${table}Id = ?`).get(Number(skill.ffbeId));
  const number = row ? Number(row.iconId) - ICON_BASE : NaN;
  if (!Number.isInteger(number) || number < 0) { failures.push(`${unit}/${skill.id}: no ${table}.iconId for ${skill.ffbeId}`); continue; }
  const candidates = [`ability_${number}_HD.png`, `ability_${number}.png`].map(name => path.join(dump, 'abilities', name));
  const source = candidates.find(file => fs.existsSync(file));
  if (!source) { failures.push(`${unit}/${skill.id}: icon ${row.iconId} missing in ${dump}/abilities`); continue; }
  const name = `ability_${number}.png`;
  if (!index.icons[name]) {
    fs.copyFileSync(source, path.join(output, name));
    index.icons[name] = {iconId: Number(row.iconId), source: source.replaceAll('\\', '/'), sha256: sha256(source)};
  }
  index.skills[`${type}:${skill.ffbeId}`] = name;
}
db.close();
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
for (const file of fs.readdirSync(output)) if (file.endsWith('.png') && !index.icons[file]) fs.rmSync(path.join(output, file));
fs.writeFileSync(path.join(output, 'index.json'), JSON.stringify(index, null, 2) + '\n');
console.log(`Published ${Object.keys(index.icons).length} icons for ${Object.keys(index.skills).length} skills to ${output}`);
