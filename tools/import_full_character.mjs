// One-command character import: body, poses, every usable active skill and the Limit Burst with
// their original visuals and sounds, skill icons, the 6★/7★ forms and the run roster entry.
//
//   node tools/import_full_character.mjs --key squall --unit 208000105 --name SQUALL \
//     --canonical ff8:squall-leonhart --label "Squall Leonhart" --game FFVIII [--max-skills 8]
//     [--skills 226621,226622] [--python <python.exe>] [--plan-only]
//
// It only chains the reviewed pipeline steps (docs/character-import-workflow.md,
// docs/current-state.md "Pipelines"); every step keeps its own checks. Gameplay values are the
// drafter's provisional defaults for later balancing. A run receipt with imported and skipped skills
// (and why) is written to tools/data/full-import/<key>/receipt.json.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';

const args = process.argv.slice(2);
const arg = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const key = arg('--key'), unit = arg('--unit');
if (!key || !unit || !/^[a-z][a-z0-9_]*$/.test(key) || !/^\d{9}$/.test(unit))
  throw Error('Usage: --key <snake_case> --unit <9-digit sprite unit id> --name <HERO NAME> --canonical <series:name> --label <label> --game <title>');
const python = arg('--python', process.env.FFROGUE_PYTHON ?? 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
const maxSkills = Number(arg('--max-skills', 8)), planOnly = args.includes('--plan-only');
const work = `tools/data/full-import/${key}`;
fs.mkdirSync(work, {recursive: true});
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const receipt = {schemaVersion: 1, key, unit, startedAt: new Date().toISOString(), steps: [], skills: [], forms: []};
const run = (label, command, parameters, {allowFail = false} = {}) => {
  const started = Date.now();
  const result = spawnSync(command, parameters, {encoding: 'utf8', maxBuffer: 256 << 20, env: {...process.env, FFROGUE_PYTHON: python, PYTHONUTF8: '1'}});
  const step = {label, status: result.status, seconds: Math.round((Date.now() - started) / 100) / 10};
  receipt.steps.push(step);
  console.log(`${result.status === 0 ? 'OK  ' : 'FAIL'} ${label} (${step.seconds}s)`);
  if (result.status !== 0 && !allowFail) {
    writeJson(`${work}/receipt.json`, receipt);
    throw Error(`${label} failed:\n${(result.stderr || result.stdout).slice(-2000)}`);
  }
  return result.stdout;
};
const db = new DatabaseSync('rawdata/assets/static_data/ffbe-data.db', {readOnly: true});
const unitRow = db.prepare('select unitId,unitName,rare,unitSeries,isNv from unit where unitId=?').get(Number(unit));
if (!unitRow) throw Error('Unknown unit ' + unit);

// 1. Recipe (created once from the shared template; existing reviewed recipes are kept).
const recipeFile = `tools/characters/${key}.json`;
const template = (spriteUnitId, formKey, note) => ({schemaVersion: 1, key: formKey, spriteUnitId: String(spriteUnitId),
  game: arg('--game', 'FF'), battle: {maxHp: 3200, maxMp: 100, heroName: arg('--name', unitRow.unitName.toUpperCase()),
    heroRole: 'VANGUARD', attackType: 'melee', targetOffsetX: 90, attackAnim: 'atk', hitFrameIndex: 2},
  scale: 2.5, reviewNote: note, skills: [], portraitSource: `unit_icons/unit_icon_${unit}.png`});
if (!fs.existsSync(recipeFile)) writeJson(recipeFile, template(unit, key,
  'Created by tools/import_full_character.mjs; battle values are provisional defaults for balancing.'));

// 2. Inspect and 3. publish the body before the skills (their previews need it).
run('inspect', 'node', ['tools/import_character.mjs', '--recipe', recipeFile]);
const report = readJson(`tools/data/characters/${key}/report.json`);
const bodyAtk = () => readJson(`public/assets/units/${key}/manifest.json`).animations.atk;
if (!planOnly && !fs.existsSync(`public/assets/units/${key}/manifest.json`)) {
  run('publish body', 'node', ['tools/import_character.mjs', '--recipe', recipeFile, '--publish', '--body-first', '--python', python]);
  run('wrap wide sheets', python, ['tools/wrap_wide_sheets.py']);
}

// An interrupted earlier run can leave a drafted entry without its published scene; such entries are
// removed here so this run selects and imports them again instead of skipping them as existing.
{
  const current = readJson(recipeFile);
  const stale = current.skills.filter(s => s.importStatus === 'imported' && s.scenePresentation
    && !fs.existsSync(`public/assets/presentations/${s.scenePresentation}/manifest.json`));
  if (stale.length) {
    current.skills = current.skills.filter(s => !stale.includes(s));
    writeJson(recipeFile, current);
    receipt.removedStale = stale.map(s => s.id);
    console.log(`Removed ${stale.length} unpublished recipe entr${stale.length === 1 ? 'y' : 'ies'}: ${stale.map(s => s.id).join(', ')}`);
  }
}
// 4. Skill selection: active, damaging, with resolvable source effects; plus the Limit Burst.
const recipe = readJson(recipeFile);
const members = skill => (skill.effects ?? []).flatMap(branch => branch.groups.flatMap(group => group.members));
const coverage = skill => { const all = members(skill); return all.length ? all.filter(m => m.status !== 'missing-effect-file').length / all.length : 0; };
const wanted = arg('--skills')?.split(',').map(Number);
const snake = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const candidates = report.catalog.filter(skill => !skill.passive && ['ABILITY', 'MAGIC', 'LIMIT'].includes(skill.kind)
  && (wanted ? wanted.includes(skill.id) : true)
  && !recipe.skills.some(s => s.ffbeId === skill.id && s.type === skill.kind));
// Original process IDs (first '@' process decides support kinds): damage processes become attacks,
// 2 (cure) a party heal and 3 (stat up) a party physical boost through the reviewed friendly path.
// Everything else (raise, dispel, libra, entrust, debuff-only, ...) waits for its own mechanic.
const DAMAGE_PROCESSES = new Set(['1', '15', '21', '25', '40', '43', '70', '103', '112', '126', '157', '169']);
const roleOf = skill => {
  if (skill.kind === 'LIMIT') return 'damage';
  const processes = String(skill.raw?.processId ?? '').split('@');
  if (processes.some(p => DAMAGE_PROCESSES.has(p))) return 'damage';
  // Pure stat-up (3 alone) only: protect/shell (3@18, 3@19) raise defence, which the friendly path does not model.
  if (processes.length === 1 && processes[0] === '3') return 'buff';
  return processes[0] === '2' ? 'heal' : null;
};
const DRAFT_OPTIONS = {damage: '', heal: '--heal 900', buff: '--buff 1.3'};
const decide = skill => {
  const role = roleOf(skill);
  if (!role) return `process ${skill.raw?.processId} is not a supported damage, heal or buff mechanic`;
  const range = String(skill.raw?.targetRange ?? skill.raw?.target ?? '').split('@')[0];
  if (role === 'damage' && skill.kind !== 'LIMIT' && !['1', '2'].includes(range)) return 'damage skill without an enemy target range';
  // Delayed or conditional damage (e.g. Tidus' Delay Attack) has no hit timeline to play.
  if (role === 'damage' && !skill.raw?.attackFrames) return 'damage process without attack frames (delayed or conditional damage)';
  // Source motions the action choreography supports: 1 physical, 2 magic/stationary, 8 stationary atk.
  if (skill.kind === 'ABILITY' && ![1, 2, 3, 5, 6, 8, undefined].includes(skill.raw?.motionType))
    return `source motion ${skill.raw.motionType} has no reviewed choreography yet`;
  if (!members(skill).length) return 'no source effect groups';
  // Converted-file coverage is not a gate: the authoring-free path stages the original BMBs from the
  // archives and fails visibly (receipt) when one is missing.
  return null;
};
const actives = candidates.filter(s => s.kind !== 'LIMIT').map(s => ({s, reason: decide(s)}));
const chosen = actives.filter(x => !x.reason).sort((a, b) => coverage(b.s) - coverage(a.s)).slice(0, maxSkills).map(x => x.s);
const limit = candidates.find(s => s.kind === 'LIMIT');
if (limit && !decide(limit)) chosen.push(limit);
for (const {s, reason} of actives) if (reason || !chosen.includes(s)) receipt.skills.push({ffbeId: s.id, name: s.name, status: 'not selected', reason: reason ?? `beyond --max-skills ${maxSkills}`});
if (limit && decide(limit)) receipt.skills.push({ffbeId: limit.id, name: limit.name, status: 'not selected', reason: decide(limit)});
// One entry per skill id: same-named variants (e.g. two "Fira" rows) would collide on the key.
const batch = chosen.map(s => { const id = snake(s.name); return {s, id, presentation: `${key}_${id}`}; })
  .filter((b, i, all) => all.findIndex(x => x.id === b.id) === i);
fs.writeFileSync(`${work}/batch.txt`, batch.map(b => `${key} ${b.s.id} ${b.id} ${b.presentation} ${DRAFT_OPTIONS[roleOf(b.s)]}`.trimEnd()).join('\n') + '\n');
console.log(`Selected ${batch.length}: ${batch.map(b => b.s.name).join(', ')}`);
if (planOnly) { writeJson(`${work}/receipt.json`, receipt); process.exit(0); }

// 5. Skills through the authoring-free batch path, then 6. their original sounds.
const batchLog = run('import skills', 'sh', ['tools/import_skill_batch.sh', `${work}/batch.txt`, `${work}/skills`], {allowFail: true});
fs.writeFileSync(`${work}/skills.log`, batchLog);
for (const b of batch) {
  const ok = batchLog.includes(`OK ${key} ${b.id}`);
  const skip = batchLog.split('\n').find(line => line.startsWith(`SKIP ${b.id}:`));
  receipt.skills.push({ffbeId: b.s.id, name: b.s.name, kind: b.s.kind, id: b.id, presentation: b.presentation,
    status: ok ? 'imported' : 'failed', ...(skip ? {reason: skip.slice(`SKIP ${b.id}: `.length)} : {})});
}
// A failed skill must not stay behind: drop its recipe entry, presentation and registry entry.
const dropSkill = (id, presentation) => {
  const current = readJson(recipeFile);
  current.skills = current.skills.filter(s => s.id !== id);
  writeJson(recipeFile, current);
  fs.rmSync(`public/assets/presentations/${presentation}`, {recursive: true, force: true});
  fs.rmSync(`tools/presentations/${presentation.replaceAll('_', '-')}.json`, {force: true});
  const registry = readJson('public/assets/content.json');
  registry.scenePresentations = registry.scenePresentations.filter(k => k !== presentation);
  writeJson('public/assets/content.json', registry);
};
for (const s of receipt.skills.filter(s => s.status === 'failed')) dropSkill(s.id, s.presentation);
// The character report names per-skill publication blockers; drop those skills too, with the reason.
run('re-inspect', 'node', ['tools/import_character.mjs', '--recipe', recipeFile]);
for (const selected of readJson(`tools/data/characters/${key}/report.json`).selected.filter(s => s.issues.length)) {
  const entry = receipt.skills.find(s => s.id === selected.id);
  // Only skills imported by this run are dropped; earlier (reviewed) skills stay and keep their report issue.
  if (!entry) { receipt.keptWithIssues = [...(receipt.keptWithIssues ?? []), {id: selected.id, issues: selected.issues}]; continue; }
  Object.assign(entry, {status: 'failed', reason: selected.issues[0]});
  dropSkill(selected.id, entry.presentation ?? `${key}_${selected.id}`);
}
const finalRecipe = readJson(recipeFile);
run('publish skill metadata', 'node', ['tools/import_character.mjs', '--recipe', recipeFile, '--publish-skills-only', '--python', python]);
const audio = run('admit original sounds', 'node', ['tools/admit_skill_audio.mjs', '--python', python], {allowFail: true});
receipt.audio = (() => { try { return JSON.parse(audio.slice(audio.indexOf('{'))); } catch { return audio.slice(-500); } })();

// 7. Same-series 6★/7★ forms (not NV) as prepared bodies in public/assets/forms.
const runContent = readJson('public/assets/run-content.json');
let previous = key;
for (const row of db.prepare('select unitId,rare from unit where unitSeries=? and isNv=0 and rare>? order by rare').all(unitRow.unitSeries, unitRow.rare)) {
  const formKey = `${key}_form${row.rare}`, formRecipe = `tools/characters/${formKey}.json`;
  // Re-runs keep published (possibly reviewed) form bodies; delete the folder to re-prepare one.
  if (fs.existsSync(`public/assets/forms/${formKey}/manifest.json`) && runContent.forms.some(f => f.key === formKey)) {
    previous = formKey; continue;
  }
  if (!fs.existsSync(formRecipe)) writeJson(formRecipe, {...template(row.unitId, formKey, 'Same-series original class-up body preparation.'), battle: finalRecipe.battle, scale: finalRecipe.scale});
  run(`prepare ${formKey} body`, 'node', ['tools/import_character.mjs', '--recipe', formRecipe, '--prepare-body-only', '--python', python]);
  const prepared = readJson(`tools/data/characters/${formKey}/body-preparation.json`).directory;
  const destination = `public/assets/forms/${formKey}`;
  fs.rmSync(destination, {recursive: true, force: true});
  fs.mkdirSync(destination, {recursive: true});
  for (const file of fs.readdirSync(prepared)) fs.copyFileSync(path.join(prepared, file), path.join(destination, file));
  const manifest = readJson(`${destination}/manifest.json`);
  writeJson(`${destination}/manifest.json`, {...manifest, assetKey: formKey});
  const entry = {key: formKey, identityKey: key, identity: unit, unitId: String(row.unitId), rarity: row.rare, awakensFrom: previous,
    assetPath: `assets/forms/${formKey}`, source: {recipe: formRecipe, manifestSha256: sha256(`${destination}/manifest.json`)}};
  runContent.forms = [...runContent.forms.filter(f => f.key !== formKey), entry];
  receipt.forms.push({key: formKey, unitId: String(row.unitId), rarity: row.rare});
  previous = formKey;
}

// 8. Roster: run identity, canonical character, published registry.
// Existing reviewed entries keep their label and canonical identity unless the arguments name new ones.
const existingUnit = runContent.units[key], canonical = arg('--canonical', existingUnit?.canonicalIdentity ?? `ff:${key}`);
runContent.units[key] = {variantLabel: existingUnit?.variantLabel ?? `${arg('--game', 'FF')} · ${arg('--variant', 'Base Unit')}`,
  identity: unit, unitId: unit, rarity: unitRow.rare,
  // NV-only units (late FFBE, e.g. FFXVI) start at their NV base; the Fate Engine shows them as NV.
  ...(unitRow.isNv ? {rank: 'NV'} : {}), canonicalIdentity: canonical};
runContent.canonicalCharacters[canonical] = {label: arg('--label', runContent.canonicalCharacters[canonical]?.label ?? unitRow.unitName)};
writeJson('public/assets/run-content.json', runContent);

// 9. Shared post-processing passes (each is idempotent for already published content).
run('wrap wide sheets', python, ['tools/wrap_wide_sheets.py']);
run('annotate Limit Burst extents', python, ['tools/annotate_clip_extents.py']);
run('export skill icons', 'node', ['tools/export_skill_icons.mjs']);
run('basic attack sounds', 'node', ['tools/export_basic_attack_cues.mjs']);
run('victory poses', python, ['tools/prepare_victory_poses.py', '--output', 'public/assets/victory-poses.json']);

receipt.finishedAt = new Date().toISOString();
receipt.summary = {imported: receipt.skills.filter(s => s.status === 'imported').map(s => s.name),
  failed: receipt.skills.filter(s => s.status === 'failed').map(s => `${s.name}: ${s.reason ?? 'see skills.log'}`),
  notSelected: receipt.skills.filter(s => s.status === 'not selected').map(s => `${s.name}: ${s.reason}`),
  forms: receipt.forms.map(f => f.key), hitFrameCheck: bodyAtk()?.frameCount > finalRecipe.battle.hitFrameIndex};
writeJson(`${work}/receipt.json`, receipt);
console.log(JSON.stringify(receipt.summary, null, 2));
