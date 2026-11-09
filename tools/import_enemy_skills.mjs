// Imports the original damaging skills of published enemies as prepared scenes cast from the enemy
// side, with their original sounds, and regenerates src/run/enemySkills.mjs for the battle.
//
//   node tools/import_enemy_skills.mjs [--monsters sweeper,guard_scorpion] [--python <python.exe>]
//
// Per enemy (body tools/monsters/<key>.json, skills tools/monsters/skills/<key>.json): monster_skill_set (of skillMonsterId when a same-dictionary
// variant owns the set) -> damaging skills (a process 1 physical or 15 magic; extra processes noted) -> stage the
// original BMB -> prepare with the monster as caster (--approximate-unverified) -> publish -> admit
// sounds. The recipe keeps the reviewed gameplay entry (scope, provisional multiplier, damage split
// over the source hit frames). Skills that fail at any step are dropped with the reason in the receipt.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {inspectEnemySkills} from './lib/enemy-skill-pipeline.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const python = arg('--python', process.env.FFROGUE_PYTHON ?? 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
const env = {...process.env, PYTHONUTF8: '1', PYTHONPATH: 'tools;tools/memorial'};
const step = (command, parameters) => spawnSync(command, parameters, {encoding: 'utf8', maxBuffer: 256 << 20, env});
const snake = name => name.toLowerCase().replace(/\+/g, '_plus').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const DAMAGE_PROCESSES = new Set(['1', '15']);
const wanted = arg('--monsters')?.split(',');
const keys = fs.readdirSync('tools/monsters').filter(f => f.endsWith('.json')).map(f => f.slice(0, -5))
  .filter(k => fs.existsSync(`public/assets/monsters/${k}`) && (!wanted || wanted.includes(k)));
const receipt = {schemaVersion: 1, at: new Date().toISOString(), monsters: {}};

for (const key of keys) {
  // Body recipes (tools/monsters/<key>.json) are hash-pinned by their publication; skills live apart.
  const body = readJson(`tools/monsters/${key}.json`), recipeFile = `tools/monsters/skills/${key}.json`;
  const recipe = fs.existsSync(recipeFile) ? readJson(recipeFile)
    : {schema: 'enemy-skills-v1', key, monsterId: body.monsterId, dictionaryId: body.dictionaryId, skills: []};
  const report = inspectEnemySkills({...body, ...(recipe.skillMonsterId ? {skillMonsterId: recipe.skillMonsterId} : {})});
  const reportFile = `tools/data/enemy-skills/${key}.json`;
  fs.mkdirSync('tools/data/enemy-skills', {recursive: true});
  writeJson(reportFile, report);
  const results = receipt.monsters[key] = [];
  recipe.skills ??= [];
  for (const skill of report.catalog) {
    const raw = skill.raw;
    if (!raw) continue;
    const processes = String(raw.processId).split('@');
    // Damage is imported; extra processes (debuffs, blind, self effects) are not reconstructed yet and are noted.
    if (!processes.some(p => DAMAGE_PROCESSES.has(p))) { results.push({id: skill.id, name: skill.name, status: 'skipped', reason: `processes ${raw.processId} deal no damage`}); continue; }
    const ignored = processes.filter(p => !DAMAGE_PROCESSES.has(p));
    const id = snake(skill.name), presentation = `${key}_${id}`;
    if (recipe.skills.some(s => s.ffbeId === skill.id) && fs.existsSync(`public/assets/presentations/${presentation}`)) {
      results.push({id: skill.id, name: skill.name, status: 'present'}); continue;
    }
    const dir = `tools/data/enemy-skills/${key}-${skill.id}`;
    const fail = reason => { results.push({id: skill.id, name: skill.name, status: 'failed', reason}); recipe.skills = recipe.skills.filter(s => s.ffbeId !== skill.id); };
    let r = step(python, ['tools/stage_original_skill.py', '--report', reportFile, '--skill-id', String(skill.id), '--kind', 'MONSTER_SKILL', '--output', `${dir}/source`]);
    if (r.status !== 0) { fail('stage: ' + (r.stderr.trim().split('\n').pop() ?? '')); continue; }
    const hits = String(raw.attackFrames).split(/[-@]/).map(t => t.split(':').map(Number)).filter(h => Number.isFinite(h[0]) && h[1] > 0);
    const groups = String(raw.attackFrames).split('@').length;
    if (!hits.length) { fail('no source hit frames'); continue; }
    const range = String(raw.targetRange).split('@')[0];
    const entry = {id, ffbeId: skill.id, type: 'MONSTER_SKILL', name: skill.name, scope: range === '2' ? 'all_enemies' : 'single_enemy',
      moveType: 'stationary', multiplier: range === '2' ? 0.9 : 1.2,
      damageEvents: hits.map(([frame, weight]) => ({frame, weight: weight / (100 * groups)})).sort((a, b) => a.frame - b.frame),
      scenePresentation: presentation,
      reviewNote: 'Original monster skill (tools/import_enemy_skills.mjs): source visuals, timing and sounds; multiplier is a provisional FFRogue value.'
        + (ignored.length ? ` Not reconstructed: original process(es) ${ignored.join(', ')} beyond the damage.` : '')};
    recipe.skills = [...recipe.skills.filter(s => s.ffbeId !== skill.id), entry];
    writeJson(recipeFile, recipe);
    r = step(python, ['tools/prepare_original_preview.py', '--source', `${dir}/source/skill-source.json`, '--unit', key, '--motion', 'atk',
      '--recipe', recipeFile, '--profile', 'source-preview-v1', '--authoring-directory', 'rawdata/assets/battle_effect',
      '--native-shaders-apk', 'tools/data/memorial-audit/installed-base-v208.apk', '--native-shader-package', 'tools/data/particle-native-audit/bmshaderpack.bin',
      '--renderer-reference', 'tools/data/memorial-audit/diagnostic-v7/renderer-reference.json', '--approximate-unverified', '--output', `${dir}/source/plan.json`]);
    if (r.status !== 0) { fail('prepare: ' + (r.stderr.trim().split('\n').pop() ?? '')); writeJson(recipeFile, recipe); continue; }
    const presentationRecipe = `tools/presentations/${presentation.replaceAll('_', '-')}.json`;
    writeJson(presentationRecipe, {schemaVersion: 1, quality: 'experimental-preview',
      reviewNote: 'Enemy skill import (monster caster): authoring-free approximation; visual acceptance bar per docs/vision.md.',
      bindings: [{key: presentation, standalone: true, sourceId: skill.id, plan: `${dir}/source/plan.json`, placementCoordinates: 'ffbe-screen-api',
        placementReview: 'Exact source group anchors through shared native screen-down semantics; the caster is the enemy and the recipients are party members.'}]});
    r = step('node', ['tools/publish_scene_presentations.mjs', '--recipe', presentationRecipe, '--python', python]);
    if (r.status !== 0) { fail('publish: ' + ((r.stderr.match(/Error: .*/) ?? [''])[0])); fs.rmSync(presentationRecipe, {force: true}); writeJson(recipeFile, recipe); continue; }
    results.push({id: skill.id, name: skill.name, status: 'imported', presentation, scope: entry.scope, hits: hits.length});
    console.log(`OK ${key} ${skill.name}`);
  }
  writeJson(recipeFile, recipe);
}
const audio = step('node', ['tools/admit_skill_audio.mjs', '--python', python]);
receipt.audio = audio.stdout.slice(audio.stdout.indexOf('{'));

// Runtime registry: every published enemy skill, keyed by enemy and skill id.
const registry = {};
for (const file of fs.readdirSync('tools/monsters/skills').filter(f => f.endsWith('.json'))) {
  const recipe = readJson(`tools/monsters/skills/${file}`);
  for (const s of recipe.skills ?? []) {
    if (!fs.existsSync(`public/assets/presentations/${s.scenePresentation}/manifest.json`)) continue;
    (registry[recipe.key] ??= {})[s.id] = {name: s.name, scope: s.scope === 'all_enemies' ? 'party' : 'single', multiplier: s.multiplier,
      origin: 'source', presentation: s.scenePresentation, damageEvents: s.damageEvents};
  }
}
fs.writeFileSync('src/run/enemySkills.mjs', '// Generated by tools/import_enemy_skills.mjs from tools/monsters/<key>.json. Do not edit by hand.\n'
  + `export const ENEMY_SKILLS = ${JSON.stringify(registry, null, 2)};\n`);
fs.mkdirSync('tools/data/enemy-skills', {recursive: true});
writeJson('tools/data/enemy-skills/receipt.json', receipt);
for (const [key, list] of Object.entries(receipt.monsters)) for (const s of list) console.log(`${key.padEnd(15)} ${s.status.padEnd(9)} ${s.name}${s.reason ? ' - ' + s.reason : ''}`);
