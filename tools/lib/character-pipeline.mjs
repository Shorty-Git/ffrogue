import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

export const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
export const writeJson = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
};
export const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const relative = file => path.relative(process.cwd(), file).replaceAll('\\', '/');
export function assertKey(key) {
  if (!/^[a-z][a-z0-9_]*$/.test(key ?? '')) throw Error(`Invalid content key: ${key}`);
}
export function assetInfo(file) {
  if (!fs.existsSync(file)) return { file: relative(file), exists: false };
  return { file: relative(file), exists: true, sha256: sha256(file) };
}
export function inspectEffect(file, root) {
  const result = assetInfo(file);
  if (!result.exists) return { ...result, resources: [] };
  const buffer = fs.readFileSync(file);
  if (buffer.toString('ascii', 0, 4) !== 'EFKE') throw Error(`Invalid EFKE header: ${file}`);
  let resources;
  for (let offset = 8; offset + 8 <= buffer.length;) {
    const tag = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (offset + 8 + size > buffer.length) throw Error(`Truncated EFKE chunk: ${file}`);
    if (tag === 'INFO') {
      const info = buffer.subarray(offset + 8, offset + 8 + size);
      // Decode the counted resource table, including non-ASCII paths.
      if (info.readInt32LE(0) !== 1810) throw Error(`Unsupported EFKE INFO version: ${file}`);
      let cursor = 8;
      resources = [];
      const count = info.readInt32LE(4);
      if (count < 0 || count > 10000) throw Error(`Invalid EFKE resource count: ${file}`);
      for (let i = 0; i < count; i++) {
          if (cursor + 12 > info.length) throw Error(`Truncated EFKE resource: ${file}`);
          const type = info.readInt32LE(cursor);
          const flags = info.readInt32LE(cursor + 4);
          cursor += 8;
          const length = info.readInt32LE(cursor); cursor += 4;
          if (length < 1 || cursor + length * 2 > info.length) throw Error(`Invalid EFKE resource path: ${file}`);
          const reference = info.subarray(cursor, cursor + length * 2).toString('utf16le').replace(/\0+$/, '');
          cursor += length * 2;
          const resolved = path.resolve(path.dirname(file), reference);
          const inside = path.relative(path.resolve(root), resolved);
          if (inside.startsWith('..') || path.isAbsolute(inside)) throw Error(`Resource outside asset root: ${reference}`);
          resources.push({ reference, type, flags, ...assetInfo(resolved) });
      }
      if (cursor !== info.length) throw Error(`Unexpected EFKE resource table tail: ${file}`);
    }
    offset += 8 + size;
  }
  if (!resources) throw Error(`Missing EFKE resource table: ${file}`);
  return { ...result, resources };
}

export function parseTimeline(raw, separator = /[&,]/) {
  return (raw ?? '').split(separator).filter(Boolean).map(entry => ({ raw: entry, fields: entry.split(':') }));
}
export function resolveEffects(db, root, raw) {
  // Conditions are preserved, never flattened into unconditional spawns.
  return (raw ?? '').split('@').map((branch, branchIndex) => ({ branchIndex,
    conditional: branchIndex > 0,
    groups: parseTimeline(branch).map(({ raw, fields }) => {
      const [frame, id, layer, anchor, ...flags] = fields;
      const group = db.prepare('SELECT * FROM effect_group WHERE effectGroupId = ?').get(Number(id));
      if (!group) return { raw, status: 'missing-group', members: [] };
      const members = parseTimeline(group.effectData).map(({ raw, fields }) => {
        const effect = db.prepare('SELECT * FROM effect WHERE effectId = ?').get(Number(fields[1]));
        if (!effect?.fileInfo) return { raw, status: 'missing-effect-record' };
        const [name, ...transform] = effect.fileInfo.split(':');
        const stem = path.basename(name, '.bmb');
        const file = path.join(root, 'battle_effect', stem + '.efkefc');
        let asset;
        try { asset = inspectEffect(file, root); }
        catch (error) { asset = { ...assetInfo(file), resources: [], parseError: error.message }; }
        return { raw, frame: Number(fields[0]), effectId: effect.effectId, scalePercent: effect.avX1k34K,
          groupFields: fields.slice(2), transform, originalFile: name, asset,
          status: !asset.exists ? 'missing-effect-file' : asset.parseError ? 'unsupported-effect-format' : asset.resources.some(r => !r.exists)
            ? 'missing-dependencies' : 'available-unreviewed' };
      });
      return { raw, startFrame: Number(frame), groupId: Number(id), name: group.name,
        layer: layer === '2' ? 'back' : layer === '1' ? 'front' : 'unknown',
        anchor: ({ 1: 'target', 2: 'target-group', 3: 'caster', 4: 'screen' })[anchor] ?? 'unknown',
        flags, soundsRaw: group['1fVZ3rKd'], extraRaw: group.rPHs9p8F,
        status: members.length ? 'resolved' : group['1fVZ3rKd'] ? 'sound-only-unreviewed' : 'unresolved-group', members };
    }),
  }));
}

export function inspectCharacter(recipe, { assets = 'assets', dump = 'ffbe_asset_dump-main' } = {}) {
  assertKey(recipe.key);
  if (!/^\d+$/.test(recipe.spriteUnitId)) throw Error('spriteUnitId must be a numeric string');
  if (!Number.isFinite(recipe.scale) || recipe.scale <= 0) throw Error('Invalid character scale');
  const battle = recipe.battle;
  if (!battle || !battle.heroName || !battle.heroRole || !['melee', 'ranged'].includes(battle.attackType)
    || !['atk', 'magic_atk'].includes(battle.attackAnim)
    || !Number.isFinite(battle.targetOffsetX) || !Number.isInteger(battle.hitFrameIndex) || battle.hitFrameIndex < 0
    || !Number.isFinite(battle.maxHp) || battle.maxHp <= 0 || !Number.isFinite(battle.maxMp) || battle.maxMp < 0) throw Error('Invalid reviewed battle configuration');
  const ids = new Set();
  for (const skill of recipe.skills ?? []) {
    assertKey(skill.id);
    if (ids.has(skill.id)) throw Error(`Duplicate skill key: ${skill.id}`);
    ids.add(skill.id);
    if (!skill.name || !skill.desc || !Array.isArray(skill.attackFrames)
      || !skill.attackFrames.every(f => Number.isInteger(f) && f >= 0)) throw Error(`Invalid skill metadata: ${skill.id}`);
  }
  const dbPath = path.join(assets, 'static_data/ffbe-data.db');
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const unit = db.prepare('SELECT * FROM unit WHERE unitId = ?').get(Number(recipe.spriteUnitId));
    if (!unit) throw Error(`Unknown unit form ${recipe.spriteUnitId}`);
    const acquisitions = db.prepare('SELECT * FROM unit_series_lv_acquire WHERE unitSeriesId = ? ORDER BY rarity, level, seriesLvAcquireId').all(unit.unitSeries);
    const byId = new Map();
    for (const row of acquisitions) {
      for (const [kind, field, table, idField] of [['ABILITY', 'abilityId', 'ability', 'abilityId'], ['MAGIC', 'magicId', 'magic', 'magicId']]) {
        for (const id of String(row[field] ?? '').split(',').filter(Boolean)) {
          const key = `${kind}:${id}`;
          let skill = byId.get(key);
          if (!skill) {
            const raw = db.prepare(`SELECT * FROM ${table} WHERE ${idField} = ?`).get(Number(id));
            skill = { kind, id: Number(id), name: raw?.name ?? null, passive: kind === 'ABILITY' && raw?.abilityType !== 2,
              raw: raw ?? null, learned: [], effects: raw ? resolveEffects(db, assets, raw.effectFrames) : [] };
            byId.set(key, skill);
          }
          skill.learned.push({ rarity: row.rarity, level: row.level, nvLevel: row.nvLvl, unlockType: row.unlockType, braveAbility: row.braveAbility });
        }
      }
    }
    const catalog = [...byId.values()];
    const suffix = `_cgs_${recipe.spriteUnitId}.csv`;
    const csvDir = path.join(dump, 'unit_animated_csv');
    const names = fs.readdirSync(csvDir).filter(f => f.startsWith('unit_') && f.endsWith(suffix));
    const tracks = names.map(f => f.slice(5, -suffix.length)).sort();
    const required = ['idle', 'atk', 'move', 'dead', 'dying', 'win', 'win_before'];
    const missingStates = required.filter(state => !tracks.includes(state));
    const selected = (recipe.skills ?? []).map(skill => {
      const source = byId.get(`${skill.type ?? 'ABILITY'}:${skill.ffbeId}`);
      const issues = [];
      if (!source?.raw) issues.push('not-in-series-learning-list');
      if (source?.passive) issues.push('passive-cannot-be-an-active-command');
      if (!tracks.includes(skill.motion)) issues.push('missing-body-motion');
      if (!['atk', 'magic_atk'].includes(skill.motion)) issues.push('unsupported-runtime-motion');
      if (!Number.isFinite(skill.mpCost) || skill.mpCost < 0) issues.push('invalid-mp-cost');
      if (!['single_enemy', 'all_enemies', 'party'].includes(skill.scope)) issues.push('unsupported-target-scope');
      if (!['dash', 'stationary'].includes(skill.moveType)) issues.push('unsupported-movement');
      if (!Number.isFinite(skill.damageMultiplier) || skill.damageMultiplier <= 0) issues.push('invalid-damage-multiplier');
      if (skill.execution === 'timeline-single-hit') {
        if (skill.hitCount !== 1 || skill.attackFrames?.length !== 1 || skill.scope !== 'single_enemy' || skill.moveType !== 'dash') issues.push('unsupported-timeline-execution');
        const sourceFrames = parseTimeline(source?.raw?.attackFrames).map(f => Number(f.fields[0]));
        if (JSON.stringify(sourceFrames) !== JSON.stringify(skill.attackFrames)) issues.push('attack-frame-mismatch');
        if (!skill.visualEffect) issues.push('missing-reviewed-effect');
      } else if (skill.execution !== 'legacy') issues.push('execution-needs-review');
      if (source?.effects.some(branch => branch.conditional) && skill.execution !== 'legacy') issues.push('conditional-timeline-needs-review');
      const effectRecipe = skill.visualEffect ? `tools/effects/${skill.visualEffect.key}.json` : null;
      if (effectRecipe) {
        assertKey(skill.visualEffect.key);
        if (!fs.existsSync(effectRecipe)) issues.push('missing-effect-recipe');
        else {
          const effect = readJson(effectRecipe);
          const members = source?.effects.flatMap(b => b.groups.flatMap(g => g.members.map(m => ({ ...m, group: g })))) ?? [];
          const matches = members.filter(m => m.effectId === effect.effectId && m.originalFile === effect.masterFile);
          if (!matches.some(m => m.group.startFrame + m.frame === skill.visualEffect.startFrame && m.group.anchor === 'target')) issues.push('effect-mapping-mismatch');
          if (members.length !== 1) issues.push('composite-timeline-needs-review');
          if (!effect.review?.approved || !effect.review?.reason) issues.push('effect-needs-visual-review');
        }
      }
      return { id: skill.id, ffbeId: skill.ffbeId, execution: skill.execution, issues,
        visualStatus: skill.visualEffect ? 'reviewed-recipe-requires-sheet-validation' : 'no-runtime-vfx',
        sourceCost: source?.raw?.cost ?? null, gameplayCost: skill.mpCost };
    });
    const files = [path.join(dump, 'unit_animated', `unit_anime_${recipe.spriteUnitId}.png`),
      path.join(csvDir, `unit_cgg_${recipe.spriteUnitId}.csv`), ...names.map(n => path.join(csvDir, n))].map(assetInfo);
    const portrait = recipe.portraitSource ? assetInfo(path.join(dump, recipe.portraitSource)) : null;
    return { schemaVersion: 1, key: recipe.key, unit: { spriteUnitId: recipe.spriteUnitId, seriesId: unit.unitSeries, name: unit.unitName },
      source: assetInfo(dbPath), basicAttackRaw: { frames: unit.attackFrames, moveType: unit.attackMoveType, effects: unit.effectFrames },
      animationPolicy: { lowHpRatio: 0.25, lowHp: 'dying', defeat: 'dead', victory: ['win_before', 'win'] },
      tracks, missingStates, files, portrait, catalog, selected,
      publishable: !missingStates.length && files.every(f => f.exists) && (!portrait || portrait.exists) && selected.length > 0 && selected.every(s => !s.issues.length),
      coverage: 'Series level acquisition only; equipment, enhancements, quest unlocks, cooldown children and limit bursts require separate review.' };
  } finally { db.close(); }
}
