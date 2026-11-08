// One-command stage import: arena (background + its animation), original normal and boss music with
// their native loops, the enemy and boss bodies, and the stage entry the run can choose.
//
//   node tools/import_stage.mjs --recipe tools/stages/dollet.json [--python <python.exe>]
//
// The recipe (schema stage-recipe-v1) is the reviewed part: which battle_bg, which music resource IDs,
// which monster dictionary IDs and the FFRogue boss pattern. Everything else is derived from the master
// data and raw sources and checked by the existing tools. Generated outputs:
//   src/run/importedStages.mjs  (all stage-recipe-v1 recipes in tools/stages)
//   src/audio/importedMusic.mjs (their decoded tracks and music profiles)
// Original monster skills are not imported yet (docs/enemy-import-workflow.md); enemies use the
// recipe's FFRogue pattern, labelled as such.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const python = arg('--python', process.env.FFROGUE_PYTHON ?? 'C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
const recipeFile = arg('--recipe');
if (!recipeFile) throw Error('Usage: node tools/import_stage.mjs --recipe tools/stages/<key>.json');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
const run = (label, command, parameters) => {
  const result = spawnSync(command, parameters, {encoding: 'utf8', maxBuffer: 256 << 20, env: {...process.env, PYTHONUTF8: '1', PYTHONPATH: 'tools'}});
  console.log(`${result.status === 0 ? 'OK  ' : 'FAIL'} ${label}`);
  if (result.status !== 0) throw Error(`${label} failed:\n${(result.stderr || result.stdout).slice(-2000)}`);
  return result.stdout;
};
const db = new DatabaseSync('rawdata/assets/static_data/ffbe-data.db', {readOnly: true});
const VGM = 'tools/data/audio-vertical/decoder/vgmstream-cli.exe';
const recipe = readJson(recipeFile);
if (recipe.schema !== 'stage-recipe-v1' || !/^[a-z][a-z0-9_]*$/.test(recipe.key)) throw Error('stage-recipe-v1 required');

// 1. Arena: reviewed entry, then the shared arena preparation (image + SSPB animation, music bank check).
const arenasFile = 'tools/stages/reviewed-arenas.json', arenas = readJson(arenasFile);
arenas[recipe.arena.key] = {...arenas[recipe.arena.key], id: recipe.arena.battleBgId, title: recipe.arena.title,
  name: recipe.arena.label, floor: recipe.arena.floor, encounter: recipe.key, music: recipe.music.normal.resourceId};
writeJson(arenasFile, arenas);
run('prepare arena', python, ['tools/prepare_reviewed_arenas.py']);

// 2. Music: resource_map -> bank -> vgmstream decode with the native loop.
const bankRoots = ['rawdata/memorial-downloads', 'rawdata/memorial-packs', 'rawdata/android-global'];
const findBank = name => {
  for (const root of bankRoots) {
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (entry.name.toLowerCase() === name.toLowerCase() || entry.name.toLowerCase().replace(/^ver\d+_/, '') === name.toLowerCase()) return full;
      }
    }
  }
  return null;
};
const decodeTrack = (role, music) => {
  const row = db.prepare('select fileName from resource_map where resourceId=? and resourceType=400').get(music.resourceId);
  if (!row?.fileName) throw Error(`No BGM resource ${music.resourceId}`);
  const bank = findBank(row.fileName);
  if (!bank) throw Error(`BGM bank ${row.fileName} is not in rawdata (play it once in the Memorial client, then run tools/extract_memorial_side_stories.py)`);
  const meta = run(`read ${row.fileName}`, VGM, ['-m', bank]);
  const rate = Number(meta.match(/sample rate: (\d+)/)?.[1]);
  const loopStart = Number(meta.match(/loop start: (\d+) samples/)?.[1]), loopEnd = Number(meta.match(/loop end: (\d+) samples/)?.[1]);
  if (!rate || !Number.isFinite(loopStart) || !Number.isFinite(loopEnd)) throw Error(`${row.fileName}: no native loop`);
  const file = `${row.fileName.replace(/\.acb$/i, '')}.wav`;
  if (!fs.existsSync(`public/assets/audio/${file}`)) run(`decode ${row.fileName}`, VGM, ['-i', '-o', `public/assets/audio/${file}`, bank]);
  return {id: music.resourceId, url: `assets/audio/${file}`, loopStart: loopStart / rate, loopEnd: loopEnd / rate,
    profile: {id: music.resourceId, title: music.title, game: music.game, series: recipe.series, role, available: true}};
};
const tracks = [decodeTrack('normal', recipe.music.normal), decodeTrack('boss', recipe.music.boss)];

// 3. Enemy and boss bodies through the reviewed monster importer.
const registry = readJson('public/assets/content.json');
for (const enemy of [...recipe.enemies, recipe.boss]) {
  const monster = db.prepare('select monsterId from monster where dictionaryId=? order by monsterId limit 1').get(enemy.dictionaryId);
  const dictionary = db.prepare('select name from monster_dictionary where dictionaryId=?').get(enemy.dictionaryId);
  if (!monster || dictionary?.name !== enemy.name) throw Error(`${enemy.key}: dictionary ${enemy.dictionaryId} is not "${enemy.name}"`);
  enemy.monsterId = String(monster.monsterId);
  const monsterRecipe = `tools/monsters/${enemy.key}.json`;
  if (!fs.existsSync(monsterRecipe)) writeJson(monsterRecipe, {schemaVersion: 1, key: enemy.key, spriteId: String(enemy.dictionaryId),
    dictionaryId: enemy.dictionaryId, monsterId: monster.monsterId, displayName: enemy.name,
    review: {purpose: `Original body for stage ${recipe.key} (tools/import_stage.mjs); FFRogue actions are reviewed separately.`, requiredAnimations: ['idle', 'atk']}});
  if (!fs.existsSync(`public/assets/monsters/${enemy.key}`)) run(`publish ${enemy.key} body`, python, ['tools/import_monster.py', '--recipe', monsterRecipe, '--publish']);
  registry.monsters = [...new Set([...registry.monsters, enemy.key])];
}
writeJson('public/assets/content.json', registry);
writeJson(recipeFile, recipe);

// 4. Generated registers from every stage recipe.
const recipes = fs.readdirSync('tools/stages').filter(f => f.endsWith('.json')).map(f => readJson(`tools/stages/${f}`))
  .filter(r => r.schema === 'stage-recipe-v1' && r.enemies.every(e => e.monsterId) && r.boss.monsterId);
const enemies = {}, stages = {};
for (const r of recipes) {
  for (const e of [...r.enemies, r.boss]) enemies[e.key] = {key: e.key, name: e.name, spriteId: String(e.dictionaryId), monsterId: e.monsterId,
    dictionaryId: e.dictionaryId, scale: e.scale, attack: {clip: 'atk', impactFrame: 1, movement: e.movement}, audio: [],
    ...(e.behavior ? {behavior: e.behavior} : {})};
  stages[r.key] = {id: r.key, name: r.name, theme: r.theme, arena: r.arena.key,
    source: {battleBgId: r.arena.battleBgId, file: readJson('public/assets/stages/reviewed.json')[r.arena.key].file, worldIdentity: r.arena.worldIdentity},
    enemyPool: r.enemies.map(e => e.key), formations: r.formations, bossId: r.boss.key, difficulty: r.difficulty,
    rewardCategory: r.rewardCategory, normalFights: r.normalFights,
    audio: {musicResourceId: r.music.normal.resourceId, musicSeries: r.series, bossMusicResourceId: r.music.boss.resourceId,
      musicAssignment: 'Original series battle and boss themes (tools/import_stage.mjs)', soundCues: []}};
}
fs.writeFileSync('src/run/importedStages.mjs', '// Generated by tools/import_stage.mjs from tools/stages/<key>.json recipes. Do not edit by hand.\n'
  + `export const IMPORTED_ENEMIES = ${JSON.stringify(enemies, null, 2)};\nexport const IMPORTED_STAGES = ${JSON.stringify(stages, null, 2)};\n`);
const music = new Map();
for (const r of recipes) for (const role of ['normal', 'boss']) if (r.key === recipe.key) for (const t of tracks) music.set(t.id, t);
const previous = fs.readFileSync('src/audio/importedMusic.mjs', 'utf8').match(/importedTracks = (\[[\s\S]*?\]);\nexport const importedProfiles = (\[[\s\S]*?\]);/);
if (previous) {
  const oldTracks = JSON.parse(previous[1]), oldProfiles = JSON.parse(previous[2]);
  for (const [id, track] of oldTracks) if (!music.has(id)) music.set(id, {...track, id, profile: oldProfiles.find(p => p.id === id)});
}
const all = [...music.values()];
fs.writeFileSync('src/audio/importedMusic.mjs', '// Generated by tools/import_stage.mjs (original BGM banks decoded with their native loop). Do not edit by hand.\n'
  + `export const importedTracks = ${JSON.stringify(all.map(t => [t.id, {url: t.url, loopStart: t.loopStart, loopEnd: t.loopEnd}]))};\n`
  + `export const importedProfiles = ${JSON.stringify(all.map(t => t.profile))};\n`);
console.log(JSON.stringify({stage: recipe.key, arena: recipe.arena.key, music: tracks.map(t => `${t.profile.title} (${t.id})`),
  enemies: recipe.enemies.map(e => e.key), boss: recipe.boss.key}, null, 1));
