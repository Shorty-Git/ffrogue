import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { inspectCharacter, readJson, writeJson, sha256, sourceBasicHits } from './lib/character-pipeline.mjs';
import { sourceCommandMetadata } from './lib/source-command-metadata.mjs';

const args = process.argv.slice(2);
const value = flag => { const i = args.indexOf(flag); if (i < 0) return undefined; if (!args[i + 1] || args[i + 1].startsWith('--')) throw Error(`Missing value for ${flag}`); return args[i + 1]; };
if (args.includes('--help') || !value('--recipe')) {
  console.log('Usage: node tools/import_character.mjs --recipe tools/characters/cloud.json [--publish | --publish-skills-only | --prepare-body-only] [--python <python.exe>] [--assets assets] [--dump rawdata/ffbe_asset_dump]');
  console.log('Default: local read-only inspection, reports in tools/data/characters/<key>/. --publish stages all sprites and validates selected skills/effects before copying prepared content and registering it.');
  process.exit(args.includes('--help') ? 0 : 1);
}
const recipe = readJson(value('--recipe'));
if (recipe.schemaVersion !== 1) throw Error('Unsupported character recipe version');
const assets = value('--assets') ?? 'rawdata/assets';
const dump = value('--dump') ?? 'rawdata/ffbe_asset_dump';
const report = inspectCharacter(recipe, { assets, dump });
const skills = recipe.skills.map(({ execution, sourcePresentation, ...skill }) => {
  const source = report.catalog.find(entry => entry.id === skill.ffbeId && entry.kind === skill.type);
  // Scene skills drop the importer-only execution label; scene-free basic-attack repeats keep it,
  // because the battle picks their path from it (src/effects/basicRepeat.mjs).
  return { ...skill, ...(execution === 'basic-attack-repeat' ? { execution } : {}),
    ...sourceCommandMetadata({ ...skill, execution }, source, report.source) };
});
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
if (!args.includes('--publish') && !args.includes('--publish-skills-only') && !args.includes('--prepare-body-only')) process.exit(0);
if(args.includes('--prepare-body-only') && (args.includes('--publish')||args.includes('--publish-skills-only')))
  throw Error('Offline body preparation cannot publish assets');
// --body-first publishes a new character's body before its skills exist (import_full_character.mjs); the run
// catalog ignores characters without published skills, so the roster is unaffected until skills land.
const bodyOnly=args.includes('--prepare-body-only')||args.includes('--body-first');
if(bodyOnly ? report.missingStates.length || report.files.some(f=>!f.exists) : !report.publishable)
  throw Error('Import blocked. Resolve report issues before publishing. No game files were changed.');
const run = (command, parameters) => {
  const result = spawnSync(command, parameters, { stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(`${command} failed (${result.status})`);
};
// Use fresh staging folders; stale tracks must never enter a new import.
if (args.includes('--publish-skills-only')) {
  const destination=`public/assets/units/${recipe.key}`,character=readJson(`${destination}/character.json`);
  const body=readJson(`${destination}/manifest.json`);
  if(String(character.provenance?.spriteUnitId ?? body.unitId)!==recipe.spriteUnitId
    || String(body.unitId)!==recipe.spriteUnitId || body.name!==recipe.key)throw Error('Existing body identity mismatch');
  character.provenance ??= {spriteUnitId:recipe.spriteUnitId,seriesId:report.unit.seriesId,adoptedExistingBody:true};
  const old=readJson(`${destination}/skills.json`);
  if(old.skills.some(s=>!skills.some(next=>next.id===s.id&&next.ffbeId===s.ffbeId)))throw Error('Metadata import must preserve existing commands');
  run(value('--python') ?? process.env.FFROGUE_PYTHON ?? 'python',['tools/validate_character.py',destination]);
  writeJson(`${destination}/skills.json`,{...old,skills});
  character.provenance.recipeSha256=sha256(value('--recipe'));
  // Original basic-attack hit frames follow the source unit row on every metadata publish.
  const hits=sourceBasicHits(report.basicAttackRaw.frames,body.animations[character.battle.attackAnim]);
  if(hits)character.battle.hitFrames=hits;else delete character.battle.hitFrames;
  writeJson(`${destination}/character.json`,character);
  console.log(`Published ${skills.length} checked commands; existing body/effect assets preserved.`);
  process.exit(0);
}
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
run(python, ['tools/prepare_cgg_body_layers.py', '--raw', input, '--prepared', output, '--output', output]);
const manifest = readJson(path.join(output, 'manifest.json'));
if (JSON.stringify(Object.keys(manifest.animations).sort()) !== JSON.stringify(report.tracks)) throw Error('Sprite export omitted raw tracks');
if (recipe.battle.hitFrameIndex >= manifest.animations[recipe.battle.attackAnim]?.frameCount) throw Error('Basic attack hit frame outside body animation');
if(args.includes('--prepare-body-only')){
  run(python,['tools/validate_character.py',output]);
  writeJson(`${work}/body-preparation.json`,{schemaVersion:1,unitId:recipe.spriteUnitId,key:recipe.key,
    directory:output,manifestSha256:sha256(path.join(output,'manifest.json')),published:false,
    files:fs.readdirSync(output).sort().map(file=>({file,sha256:sha256(path.join(output,file))}))});
  console.log(`Prepared checked offline body: ${output}. Use --unit-assets with prepare_original_preview.py; nothing published.`);
  process.exit(0);
}
if (report.portrait) fs.copyFileSync(report.portrait.file, path.join(output, 'portrait.png'));
writeJson(path.join(output, 'skills.json'), { unitId: String(report.unit.seriesId), unitName: recipe.battle.heroName,
  game: recipe.game, skills });
const basicHits = sourceBasicHits(report.basicAttackRaw.frames, manifest.animations[recipe.battle.attackAnim]);
writeJson(path.join(output, 'character.json'), { schemaVersion: 1, key: recipe.key,
  battle: { ...recipe.battle, ...(basicHits ? { hitFrames: basicHits } : {}) }, scale: recipe.scale,
  ...(report.portrait ? { portrait: 'portrait.png' } : {}),
  provenance: { spriteUnitId: recipe.spriteUnitId, seriesId: report.unit.seriesId, recipeSha256: sha256(value('--recipe')),
    executionProfile: 'source-only' } });
// Pillow validates the full sprite geometry before publication, not just PNG headers.
run(python, ['tools/validate_character.py', output]);
const destination = `public/assets/units/${recipe.key}`;
fs.mkdirSync(destination, { recursive: true });
for (const file of fs.readdirSync(output)) fs.copyFileSync(path.join(output, file), path.join(destination, file));
const registry = readJson('public/assets/content.json');
registry.characters = [...new Set([...registry.characters, recipe.key])];
writeJson('public/assets/content.json', registry);
report.publication = { output: destination, exportedAnimations: Object.keys(manifest.animations),
  files: fs.readdirSync(output).sort().map(file => ({ file, sha256: sha256(path.join(destination, file)) })) };
writeJson(`${work}/report.json`, report);
fs.appendFileSync(`${work}/report.md`, `\nPublished: ${destination}. Validated ${report.publication.exportedAnimations.length} animations and Source-only command metadata.\n`);
console.log(`Published ${recipe.key} and registered its prepared assets. Party composition remains configured in BattleScene.`);
