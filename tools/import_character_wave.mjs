// Imports every character of a wave file with tools/import_full_character.mjs, one after another,
// and keeps going when one fails (its receipt says why).
//   node tools/import_character_wave.mjs [--wave tools/characters/roster-wave.json] [--only key,key]
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const wave = JSON.parse(fs.readFileSync(arg('--wave', 'tools/characters/roster-wave.json'), 'utf8')).characters;
const only = arg('--only')?.split(',');
const results = [];
for (const c of wave.filter(c => !only || only.includes(c.key))) {
  const started = Date.now();
  const r = spawnSync('node', ['tools/import_full_character.mjs', '--key', c.key, '--unit', String(c.unit), '--name', c.name,
    '--canonical', c.canonical, '--label', c.label, '--game', c.game], {encoding: 'utf8', maxBuffer: 256 << 20});
  const summary = (() => { try { return JSON.parse(fs.readFileSync(`tools/data/full-import/${c.key}/receipt.json`, 'utf8')).summary; } catch { return null; } })();
  results.push({key: c.key, status: r.status, minutes: +((Date.now() - started) / 60000).toFixed(1), imported: summary?.imported ?? [],
    failed: summary?.failed ?? [], error: r.status ? (r.stderr || r.stdout).slice(-600) : undefined});
  console.log(`${r.status === 0 ? 'OK  ' : 'FAIL'} ${c.key} (${results.at(-1).minutes} min): ${(summary?.imported ?? []).join(', ')}`);
  fs.writeFileSync('tools/data/full-import/wave-receipt.json', JSON.stringify(results, null, 2) + '\n');
}
