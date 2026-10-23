import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { inspectCharacter, readJson, writeJson, sha256 } from './lib/character-pipeline.mjs';

const args = process.argv.slice(2);
const value = flag => { const i = args.indexOf(flag); if (i < 0) return undefined; if (!args[i + 1] || args[i + 1].startsWith('--')) throw Error(`Missing value for ${flag}`); return args[i + 1]; };
if (args.includes('--help') || !value('--recipe')) {
  console.log('Usage: node tools/import_character.mjs --recipe tools/characters/cloud.json [--publish] [--python <python.exe>] [--assets assets] [--dump ffbe_asset_dump-main]');
  console.log('Default: local read-only inspection, reports in tools/data/characters/<key>/. --publish stages all sprites and validates selected skills/effects before copying prepared content and registering it.');
  process.exit(args.includes('--help') ? 0 : 1);
}
const recipe = readJson(value('--recipe'));
if (recipe.schemaVersion !== 1) throw Error('Unsupported character recipe version');
const assets = value('--assets') ?? 'assets';
const dump = value('--dump') ?? 'ffbe_asset_dump-main';
const report = inspectCharacter(recipe, { assets, dump });
const work = `tools/data/characters/${recipe.key}`;
writeJson(`${work}/report.json`, report);
const lines = ['# Character import report', '', `${recipe.key}: sprite ${report.unit.spriteUnitId}, series ${report.unit.seriesId}`, '',
  `Raw animations: ${report.tracks.length}; missing states: ${report.missingStates.join(', ') || 'none'}.`,
  `Catalog: ${report.catalog.length} acquisition records, including passives and magic.`,
  `Publishable metadata: ${report.publishable}.`, '', report.coverage, '',
  '| Selected skill | Execution | Issues | Visuals |', '| --- | --- | --- | --- |',
  ...report.selected.map(s => `| ${s.id} | ${s.execution} | ${s.issues.join(', ') || 'none'} | ${s.visualStatus} |`)];
fs.writeFileSync(`${work}/report.md`, lines.join('\n') + '\n');
console.log(`${recipe.key}: ${report.tracks.length} animations, ${report.catalog.length} learned entries; report: ${work}/report.md`);
for (const selected of report.selected) console.log(`  ${selected.id}: ${selected.issues.join(', ') || selected.execution}; ${selected.visualStatus}`);
if (!args.includes('--publish')) process.exit(0);
if (!report.publishable) throw Error('Import blocked. Resolve report issues before publishing. No game files were changed.');
const run = (command, parameters) => {
  const result = spawnSync(command, parameters, { stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(`${command} failed (${result.status})`);
};
// Use fresh staging folders; stale tracks must never enter a new import.
const stage = fs.mkdtempSync(path.join(path.resolve(work), 'stage-'));
const input = path.join(stage, 'raw');
const assembled = path.join(stage, 'assembled');
const prepared = path.join(stage, 'prepared');
fs.mkdirSync(input);
for (const file of report.files) fs.copyFileSync(file.file, path.join(input, path.basename(file.file)));
run(path.resolve('tools/bin/ffbetool.exe'), [recipe.spriteUnitId, '-i', input, '-o', assembled, '--json']);
const python = value('--python') ?? process.env.FFROGUE_PYTHON ?? 'python';
run(python, ['tools/export_unit.py', '--id', recipe.spriteUnitId, '--name', recipe.key, '--input', assembled, '--output', prepared]);
const output = path.join(prepared, recipe.key);
const manifest = readJson(path.join(output, 'manifest.json'));
if (JSON.stringify(Object.keys(manifest.animations).sort()) !== JSON.stringify(report.tracks)) throw Error('Sprite export omitted raw tracks');
if (recipe.battle.hitFrameIndex >= manifest.animations[recipe.battle.attackAnim]?.frameCount) throw Error('Basic attack hit frame outside body animation');
const effects = [...new Set(recipe.skills.flatMap(s => [
  ...(s.visualEffect ? [s.visualEffect.key] : []), ...(s.presentation?.effects.map(e => e.key) ?? []),
]))];
for (const key of effects) {
  const definition = readJson(`tools/effects/${key}.json`);
  const baked = readJson(`public/assets/effects/${key}/manifest.json`);
  if (baked.recipeSha256 !== sha256(`tools/effects/${key}.json`)) throw Error(`Changed effect recipe: ${key}; bake again`);
  if (baked.sourceSha256 !== sha256(path.join(assets, definition.source))) throw Error(`Stale effect bake: ${key}`);
  if (!Array.isArray(baked.resources) || baked.resources.some(r => !fs.existsSync(r.file) || r.sha256 !== sha256(r.file))) throw Error(`Changed effect resources: ${key}`);
  if (baked.sheetSha256 !== sha256(`public/assets/effects/${key}/${baked.file}`)) throw Error(`Changed effect sheet: ${key}`);
  const values = ['frameWidth', 'frameHeight', 'frameCount', 'frameRate', 'originX', 'originY', 'scale', 'blend', 'contentBounds'];
  if (values.some(k => JSON.stringify(baked[k]) !== JSON.stringify(definition[k]))) throw Error(`Effect bake settings differ: ${key}`);
  if ((baked.artworkRotationDegrees ?? 0) !== (definition.artworkRotationDegrees ?? 0)
    || (baked.artworkPivot ?? 'origin') !== (definition.artworkPivot ?? 'origin')) throw Error(`Effect artwork settings differ: ${key}`);
  const png = fs.readFileSync(`public/assets/effects/${key}/${baked.file}`);
  const width = definition.frameWidth * definition.columns;
  const height = definition.frameHeight * Math.ceil(definition.frameCount / definition.columns);
  if (png.toString('hex', 0, 8) !== '89504e470d0a1a0a' || png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== height) throw Error(`Invalid effect sheet: ${key}`);
}
const skills = recipe.skills.map(({ execution, ...skill }) => skill);
if (report.portrait) fs.copyFileSync(report.portrait.file, path.join(output, 'portrait.png'));
writeJson(path.join(output, 'skills.json'), { unitId: String(report.unit.seriesId), unitName: recipe.battle.heroName,
  game: recipe.game, skills });
writeJson(path.join(output, 'character.json'), { schemaVersion: 1, key: recipe.key, battle: recipe.battle, scale: recipe.scale,
  ...(report.portrait ? { portrait: 'portrait.png' } : {}),
  provenance: { spriteUnitId: recipe.spriteUnitId, seriesId: report.unit.seriesId, recipeSha256: sha256(value('--recipe')) } });
// Pillow validates the full sprite geometry before publication, not just PNG headers.
run(python, ['tools/validate_character.py', output]);
const destination = `public/assets/units/${recipe.key}`;
fs.mkdirSync(destination, { recursive: true });
for (const file of fs.readdirSync(output)) fs.copyFileSync(path.join(output, file), path.join(destination, file));
const registry = readJson('public/assets/content.json');
registry.characters = [...new Set([...registry.characters, recipe.key])];
registry.effects = [...new Set([...registry.effects, ...effects])];
writeJson('public/assets/content.json', registry);
report.publication = { output: destination, exportedAnimations: Object.keys(manifest.animations), effects,
  files: fs.readdirSync(output).sort().map(file => ({ file, sha256: sha256(path.join(destination, file)) })) };
writeJson(`${work}/report.json`, report);
fs.appendFileSync(`${work}/report.md`, `\nPublished: ${destination}. Validated ${report.publication.exportedAnimations.length} animations and ${effects.length} baked effects.\n`);
console.log(`Published ${recipe.key} and registered its prepared assets. Party composition remains configured in BattleScene.`);
