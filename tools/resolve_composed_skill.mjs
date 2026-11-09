// Resolve an inspected composition through the common group resolver for research staging.
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { readJson, writeJson, sha256, resolveEffects, composeEffectFrames } from './lib/character-pipeline.mjs';

const args = process.argv.slice(2);
const value = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const compositionPath = value('--composition'), reportPath = value('--report'), output = value('--output');
if (!compositionPath || !reportPath || !output) throw Error('Required: --composition --report --output');
const stage = path.resolve('tools/data') + path.sep;
if (![compositionPath, reportPath, output].every(file => path.resolve(file).startsWith(stage))) {
  throw Error('Research inputs and output must stay inside tools/data');
}
const composition = readJson(compositionPath), report = readJson(reportPath);
if (composition.approved !== false || String(report.unit.spriteUnitId) !== String(composition.unit.unitId)) {
  throw Error('Composition must be research-only and match the inspected character form');
}
const skills = report.catalog.filter(skill => skill.kind === 'ABILITY' && skill.id === composition.skill.abilityId);
if (skills.length !== 1) throw Error('Expected one inspected ability');
const skill = structuredClone(skills[0]);
if (skill.raw.effectFrames !== composition.skill.effectFrames || skill.raw.motionType !== composition.skill.motionType) {
  throw Error('Composition differs from inspected raw ability');
}
const assets = path.resolve(value('--assets') ?? 'rawdata/assets');
const database = path.join(assets, 'static_data/ffbe-data.db');
if (sha256(database) !== composition.source.sha256) throw Error('Composition database hash mismatch');
const db = new DatabaseSync(database, { readOnly: true });
try {
  const unit = db.prepare('SELECT effectFrames FROM unit WHERE unitId=?').get(composition.unit.unitId);
  if (unit?.effectFrames !== composition.unit.effectFrames) throw Error('Unit attack timeline changed');
  if (composeEffectFrames(unit.effectFrames, skill.raw.effectFrames, skill.raw.motionType).effectFrames !== composition.effectFrames)
    throw Error('Composition differs from the shared native-rule compiler');
  skill.effects = resolveEffects(db, assets, composition.effectFrames);
} finally { db.close(); }
const groups = skill.effects.flatMap(branch => branch.groups);
const prefixCount = composition.skill.motionType === 1 ? composition.unit.effectFrames.split('&').length : 0;
for (const [index, group] of groups.entries()) {
  group.compositionOrigin = index < prefixCount ? 'unit-attack' : 'skill';
  if(!group.members?.length && group.status==='sound-only-unreviewed' && group.soundsRaw && !group.extraRaw) continue;
  // Effect group 99999999 is the master data's 'no effect' placeholder for a process branch.
  // Some database revisions hold it as an empty row ('unresolved-group'), others omit it ('missing-group').
  if(['missing-group','unresolved-group'].includes(group.status) && !group.members?.length && /^-?\d+:99999999:/.test(group.raw)) continue;
  if (!group.members?.length || group.members.some(member => !member.originalFile)) {
    throw Error('Composed group lacks resolved original members: ' + group.raw);
  }
}
skill.composition = { ...composition, compositionSha256: sha256(compositionPath),
  inspectionSha256: sha256(reportPath), origin: 'Explicit composed research inspection; raw ability retained' };
writeJson(output, { ...report, catalog: [skill], researchOnly: true });
console.log(JSON.stringify({ unitId: report.unit.spriteUnitId, skillId: skill.id,
  groups: groups.map(group => ({ raw: group.raw, origin: group.compositionOrigin, anchor: group.anchor })) }, null, 2));
