// Writes the original basic-attack hit frames (unit row `attackFrames`) into every published
// character.json without re-importing bodies. New imports get the same data from import_character.mjs.
// Usage: node tools/backfill_basic_hits.mjs [--assets rawdata/assets] [--check]
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { readJson, writeJson, sourceBasicHits } from './lib/character-pipeline.mjs';

const args = process.argv.slice(2);
const assets = args.includes('--assets') ? args[args.indexOf('--assets') + 1] : 'rawdata/assets';
const check = args.includes('--check');
const db = new DatabaseSync(path.join(assets, 'static_data/ffbe-data.db'), { readOnly: true });
const registry = readJson('public/assets/content.json');
let changed = 0, missing = [];
for (const key of registry.characters) {
  const dir = `public/assets/units/${key}`, character = readJson(`${dir}/character.json`), body = readJson(`${dir}/manifest.json`);
  const unitId = Number(character.provenance?.spriteUnitId ?? body.unitId);
  const row = db.prepare('SELECT attackFrames FROM unit WHERE unitId = ?').get(unitId);
  const hits = sourceBasicHits(row?.attackFrames, body.animations[character.battle.attackAnim]);
  if (!hits) { missing.push(`${key} (${row?.attackFrames ?? 'no unit row'})`); continue; }
  if (JSON.stringify(character.battle.hitFrames) === JSON.stringify(hits)) continue;
  changed++;
  if (!check) writeJson(`${dir}/character.json`, { ...character, battle: { ...character.battle, hitFrames: hits } });
  console.log(`${key}: ${hits.map(h => `${h.frame}f x${h.weight}`).join(', ')}`);
}
console.log(`${check ? 'would change' : 'changed'} ${changed}; without source hits: ${missing.join(', ') || 'none'}`);
if (check && changed) process.exit(1);
