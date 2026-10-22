import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

// Read only the relevant database rows and directly referenced effect files.
const root = path.resolve(process.argv[2] ?? 'assets');
const database = path.join(root, 'static_data/ffbe-data.db');
const db = new DatabaseSync(database, { readOnly: true });
const selected = JSON.parse(fs.readFileSync('public/assets/units/cloud/skills.json', 'utf8'));
const unit = db.prepare('SELECT unitId, unitName, unitSeries FROM unit WHERE unitId = ?').get(Number(selected.unitId));
if (!unit) throw new Error('Cloud is missing from the unit table');
const acquisitions = db.prepare('SELECT * FROM unit_series_lv_acquire WHERE unitSeriesId = ?').all(unit.unitSeries);
const relative = (file) => path.relative(process.cwd(), file).replaceAll('\\', '/');

function inspectFile(file) {
  if (!fs.existsSync(file)) return null;
  const buffer = fs.readFileSync(file);
  const result = {
    file: relative(file), bytes: buffer.length,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
  };
  if (path.extname(file) !== '.efkefc') return result;
  if (buffer.toString('ascii', 0, 4) !== 'EFKE') throw new Error(`Invalid EFKE header: ${file}`);
  for (let offset = 8; offset + 8 <= buffer.length;) {
    const tag = buffer.toString('ascii', offset, offset + 4);
    const length = buffer.readUInt32LE(offset + 4);
    if (offset + 8 + length > buffer.length) throw new Error(`Truncated EFKE chunk: ${file}`);
    if (tag === 'INFO') {
      const info = buffer.subarray(offset + 8, offset + 8 + length);
      result.infoVersion = info.readInt32LE(0);
      // Paths are null-terminated UTF-16LE strings in the INFO resource table.
      const paths = [...info.toString('utf16le').matchAll(/\.\.\/[\x20-\x7e]+?\.(?:png|wav|efkmodel|efkmat|efkcurve)(?=\0)/g)].map(m => m[0]);
      result.resources = [...new Set(paths)].map(resource => {
        const resolved = path.resolve(path.dirname(file), resource);
        return { reference: resource, file: relative(resolved), exists: fs.existsSync(resolved) };
      });
    }
    offset += 8 + length;
  }
  return result;
}

function resolveGroup(raw) {
  const fields = raw.split(':').map(Number);
  const [startFrame, effectGroupId] = fields;
  const group = db.prepare('SELECT * FROM effect_group WHERE effectGroupId = ?').get(effectGroupId);
  const result = { raw, startFrame, effectGroupId, placementFieldsRaw: fields.slice(2), group: group ?? null };
  if (!group) return { ...result, status: 'missing-group', members: [] };
  const members = (group.effectData ?? '').split(',').filter(Boolean).map(rawMember => {
    const fields = rawMember.split(':').map(Number);
    const effectId = fields[1];
    const effect = db.prepare('SELECT * FROM effect WHERE effectId = ?').get(effectId);
    if (!effect) return { raw: rawMember, effectId, status: 'missing-effect-record' };
    const [filename, ...transformFields] = effect.fileInfo.split(':');
    const stem = filename.replace(/\.bmb$/i, '');
    const converted = inspectFile(path.join(root, 'battle_effect', stem + '.efkefc'));
    const authoring = inspectFile(path.join(root, 'battle_effect', stem + '.bmsln'));
    return {
      raw: rawMember, effectId, groupFieldsRaw: fields, effect, transformFieldsRaw: transformFields,
      status: converted ? 'converted-asset-found-not-render-verified' : 'missing-effect-file',
      converted, authoring,
    };
  });
  return { ...result, status: members.length ? 'resolved-group' : 'engine-group-unresolved', members };
}

const report = {
  unit,
  source: relative(database),
  resolverReference: 'https://github.com/Hirurawa/ExviusReborn/blob/main/godot/core/services/game_database.gd',
  notes: [
    'Resolution follows ExviusReborn game_database.gd: effectFrames -> effect_group.effectData -> effect.fileInfo.',
    'These are local master-data associations, not proof of visual fidelity of converted files.',
    'Placement fields and engine groups must be decoded from original engine behavior before faithful playback.',
    'Attack/effect frames are preserved as source timeline values, not sprite frame indices.',
  ],
  learnedActiveAbilities: acquisitions.flatMap(row => (row.abilityId ?? '').split(',').filter(Boolean).map(Number).map(id => {
    const ability = db.prepare('SELECT abilityId, name, abilityType FROM ability WHERE abilityId = ?').get(id);
    return ability?.abilityType === 2 ? { id, name: ability.name, rarity: row.rarity, level: row.level } : null;
  })).filter(Boolean),
  skills: selected.skills.map(skill => {
    const ability = db.prepare('SELECT * FROM ability WHERE abilityId = ?').get(skill.ffbeId);
    if (!ability) throw new Error(`Missing ability ${skill.ffbeId}`);
    const learned = acquisitions.filter(row => (row.abilityId ?? '').split(',').includes(String(skill.ffbeId)));
    if (!learned.length) throw new Error(`${skill.name} is not learned by this unit series`);
    return {
      id: skill.id, abilityId: skill.ffbeId, name: ability.name,
      learned: learned.map(row => ({ rarity: row.rarity, level: row.level })),
      mpCost: ability.cost, moveTypeRaw: ability.moveType, motionTypeRaw: ability.motionType,
      attackFramesRaw: ability.attackFrames,
      effects: (ability.effectFrames ?? '').split('@').flatMap(group => group.split('&')).filter(Boolean).map(resolveGroup),
    };
  }),
};
db.close();
fs.mkdirSync('docs/research', { recursive: true });
fs.writeFileSync('docs/research/cloud-skill-effects.json', `${JSON.stringify(report, null, 2)}\n`);
for (const skill of report.skills) {
  console.log(`${skill.name} (${skill.abilityId}): ${skill.effects.map(e => `${e.effectGroupId}=${e.status}`).join(', ')}`);
}
