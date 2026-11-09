// Re-derives the statuses of published friendly stat-buff skills from their original processes
// (lib/source-buffs.mjs) and republishes the affected characters' skill metadata only.
// Earlier drafts turned every pure process-3 buff into a physical boost; DEF/SPR parts were lost.
//   node tools/refresh_source_buffs.mjs [--check] [--python <python.exe>]
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {sourceFriendlyBuffs, buffDescription} from './lib/source-buffs.mjs';

const args = process.argv.slice(2), check = args.includes('--check');
const python = args.includes('--python') ? args[args.indexOf('--python') + 1] : process.env.FFROGUE_PYTHON ?? 'python';
const changed = [];
for (const file of fs.readdirSync('tools/characters').filter(f => f.endsWith('.json'))) {
  const path = `tools/characters/${file}`, recipe = JSON.parse(fs.readFileSync(path, 'utf8'));
  const reportFile = `tools/data/characters/${recipe.key}/report.json`;
  if (!recipe.skills || !fs.existsSync(reportFile)) continue;
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  let dirty = false;
  for (const skill of recipe.skills) {
    if (skill.execution !== 'prepared-friendly' || skill.allyEvents?.length !== 1) continue;
    const raw = report.catalog.find(c => c.id === skill.ffbeId && c.kind === skill.type)?.raw;
    const effects = sourceFriendlyBuffs(raw);
    if (!effects || JSON.stringify(skill.allyEvents[0].effects) === JSON.stringify(effects)) continue;
    skill.allyEvents[0].effects = effects;
    skill.desc = buffDescription(effects);
    skill.friendlyTargetReview.note = `Original target ${raw.target} / range ${raw.targetRange} (process ${raw.processId}); statuses from the original stat-buff processes (${raw.processParam}): `
      + effects.map(e => e.kind === 'guard' ? `${e.damageType} guard -${e.reduction}` : `physical-boost x${e.multiplier}`).join(' + ') + ` for ${effects[0].turns} rounds on all living allies.`;
    changed.push(`${recipe.key}/${skill.id}: ${effects.map(e => e.kind === 'guard' ? 'guard-' + e.damageType : e.kind).join(' + ')}`);
    dirty = true;
  }
  if (!dirty || check) continue;
  fs.writeFileSync(path, JSON.stringify(recipe, null, 2) + '\n');
  const result = spawnSync('node', ['tools/import_character.mjs', '--recipe', path, '--publish-skills-only', '--python', python], {stdio: 'inherit'});
  if (result.status !== 0) throw Error(`Skill metadata publish failed for ${recipe.key}`);
}
console.log(changed.join('\n') || 'nothing to refresh');
if (check && changed.length) process.exit(1);
