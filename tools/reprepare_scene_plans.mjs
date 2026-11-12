// Re-prepares the staged plan.json of published scenes from their staged source
// (skill-source.json + originals) with the current decoders, using the same command line the import
// tools use (source-preview-v1, --approximate-unverified). Needed when a decoder or enum table in
// tools/ changes: published scenes are compiled from these plans by publish_scene_presentations.
//
//   node tools/reprepare_scene_plans.mjs --check [--keys a,b | --match text]   prepare next to the plan, report differences
//   node tools/reprepare_scene_plans.mjs [--keys a,b | --match text]            replace plan.json where preparation succeeds
// Afterwards: node tools/rebaseline_scenes.mjs run   (republish + before/after frames).
//
// Only approximation-mode plans with a staged skill-source.json are touched; reviewed legacy plans
// (the first Cloud/Aerith/Barret skills, prepared with explicit authoring) are listed as skipped.
// The plan records its recipe hash; that field is ignored when comparing.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const check = process.argv.includes('--check');
const python = arg('--python') ?? process.env.FFROGUE_PYTHON ?? 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const normalized = plan => { const copy = structuredClone(plan); delete copy.presentation?.recipeSha256; return JSON.stringify(copy); };
const wanted = arg('--keys')?.split(','), match = arg('--match');
const rows = [], started = Date.now();
for (const file of fs.readdirSync('tools/presentations').filter(name => name.endsWith('.json')).sort()) {
  for (const binding of read('tools/presentations/' + file).bindings ?? []) {
    const key = binding.key;
    if (wanted && !wanted.includes(key) || match && !key.includes(match)) continue;
    if (!fs.existsSync(`public/assets/presentations/${key}/manifest.json`)) continue;
    const planFile = binding.plan, dir = path.dirname(planFile), source = `${dir}/skill-source.json`;
    if (!fs.existsSync(planFile) || !fs.existsSync(source)) { rows.push({key, status: 'skipped', reason: 'no staged plan or skill-source.json'}); continue; }
    const plan = read(planFile);
    if (!plan.approximations) { rows.push({key, status: 'skipped', reason: 'not an approximation-mode plan'}); continue; }
    if (plan.sourceId !== binding.sourceId) { rows.push({key, status: 'skipped', reason: `staged plan is source ${plan.sourceId}, published ${binding.sourceId}`}); continue; }
    const unit = plan.unit, hero = `tools/characters/${unit}.json`, monster = `tools/monsters/skills/${unit}.json`;
    const recipe = fs.existsSync(hero) ? hero : fs.existsSync(monster) ? monster : null;
    if (!recipe) { rows.push({key, status: 'skipped', reason: 'no recipe for unit ' + unit}); continue; }
    const skill = read(recipe).skills?.find(entry => entry.ffbeId === plan.sourceId && (entry.scenePresentation ?? key) === key)
      ?? read(recipe).skills?.find(entry => entry.ffbeId === plan.sourceId);
    const motion = recipe === hero ? skill?.motion ?? 'atk' : 'atk', output = check ? `${dir}/plan.check.json` : `${dir}/plan.next.json`;
    const result = spawnSync(python, ['tools/prepare_original_preview.py', '--source', source, '--unit', unit, '--motion', motion, '--recipe', recipe,
      '--profile', 'source-preview-v1', '--authoring-directory', 'rawdata/assets/battle_effect',
      '--native-shaders-apk', 'tools/data/memorial-audit/installed-base-v208.apk', '--native-shader-package', 'tools/data/particle-native-audit/bmshaderpack.bin',
      '--renderer-reference', 'tools/data/memorial-audit/diagnostic-v7/renderer-reference.json', '--approximate-unverified', '--output', output], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
    if (result.status !== 0) { fs.rmSync(output, {force: true}); rows.push({key, status: 'failed', reason: (result.stderr.trim().split('\n').pop() ?? '').slice(0, 300)}); }
    else {
      const next = read(output), same = normalized(next) === normalized(plan);
      const kept = next.presentation.scope === plan.presentation.scope && next.presentation.movement === plan.presentation.movement;
      if (!kept) { fs.rmSync(output, {force: true}); rows.push({key, status: 'failed', reason: 'scope/movement differs from the published plan (recipe changed?)'}); }
      else {
        if (check || same) fs.rmSync(output, {force: true}); else fs.renameSync(output, planFile);
        rows.push({key, status: same ? 'identical' : check ? 'differs' : 'updated'});
      }
    }
    if (rows.length % 25 === 0) console.log(`${rows.length} plans ${((Date.now() - started) / 1000).toFixed(0)} s`);
  }
}
const tally = {}; for (const row of rows) tally[row.status] = (tally[row.status] ?? 0) + 1;
fs.mkdirSync('tools/data/scene-baseline', {recursive: true});
fs.writeFileSync('tools/data/scene-baseline/reprepare.json', JSON.stringify({check, tally, rows}, null, 1) + '\n');
const reasons = {}; for (const row of rows) if (row.reason) (reasons[row.status + ': ' + row.reason] ??= []).push(row.key);
console.log(JSON.stringify({tally, changed: rows.filter(row => ['differs', 'updated'].includes(row.status)).map(row => row.key).slice(0, 60),
  reasons: Object.entries(reasons).map(([reason, keys]) => [reason, keys.length, keys.slice(0, 4)])}, null, 1));
