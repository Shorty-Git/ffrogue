import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { inspectCharacter, readJson, writeJson, sha256 } from './lib/character-pipeline.mjs';

// Read-only comparison of exact forms. Available art does not imply skill support.
const master = readJson('ffbe_asset_dump-main/catalog/unit_master.json');
const ids = ['207000105', '207001607', '207002007', '207002017', '207003107', '207003117', '207003407', '207003427'];
const db = new DatabaseSync('assets/static_data/ffbe-data.db', { readOnly: true });
const rows = [];
try {
  for (const id of ids) {
    const identity = master.units.find(u => u.original_id === id);
    const suffix = `_cgs_${id}.csv`;
    const tracks = fs.readdirSync('ffbe_asset_dump-main/unit_animated_csv')
      .filter(f => f.startsWith('unit_') && f.endsWith(suffix)).map(f => f.slice(5, -suffix.length)).sort();
    const row = { id, name: identity?.name ?? null, tracks };
    if (!db.prepare('SELECT unitId FROM unit WHERE unitId = ?').get(Number(id))) {
      rows.push({ ...row, metadataStatus: 'absent-from-current-sqlite', active: [], complete: [] });
      continue;
    }
    const recipe = readJson('tools/characters/cloud.json');
    recipe.spriteUnitId = id;
    recipe.skills = [];
    const inspected = inspectCharacter(recipe);
    const active = inspected.catalog.filter(s => !s.passive && s.raw).map(s => {
      const groups = s.effects.flatMap(b => b.groups);
      const members = groups.flatMap(g => g.members);
      return {
        id: s.id, kind: s.kind, name: s.name, learned: s.learned,
        motionType: s.raw.motionType ?? null, processId: s.raw.processId,
        attackFrames: s.raw.attackFrames, cost: s.raw.cost,
        completeDirectEffects: groups.length > 0 && !s.effects.some(b => b.conditional)
          && groups.every(g => g.members.length > 0 && g.members.every(m => m.status === 'available-unreviewed')),
        files: [...new Set(members.map(m => m.asset.file))],
        missing: [...new Set(members.filter(m => m.status !== 'available-unreviewed').map(m => m.asset.file))],
        unresolvedGroups: groups.filter(g => !g.members.length).map(g => ({ id: g.groupId, name: g.name, status: g.status })),
      };
    });
    const complete = active.filter(s => s.completeDirectEffects);
    rows.push({ ...row, metadataStatus: 'available', seriesId: inspected.unit.seriesId,
      missingStates: inspected.missingStates, missingFiles: inspected.files.filter(f => !f.exists),
      activeCount: active.length, completeCount: complete.length, complete, active });
  }
} finally { db.close(); }
const secondarySnapshots = ['gl', 'jp'].map(region => {
  const files = ['unit', 'ability', 'learns', 'limits'].map(kind => {
    const file = `ffbe_data-master/${region}/${kind}.json`, data = readJson(file);
    const checks = kind === 'ability' ? ['236010', '236027', '236032', '236034', '236045'] : ['207002007', '207002017'];
    return { kind, file, sha256: sha256(file), recordCount: Object.keys(data).length,
      requestedIds: Object.fromEntries(checks.map(id => [id, Object.hasOwn(data, id)])) };
  });
  const marker = `ffbe_data-master/${region}/lastmodified.txt`;
  return { region, files, lastmodifiedMarker: fs.existsSync(marker) ? fs.readFileSync(marker, 'utf8').trim() : null };
});
writeJson('tools/data/cloud-versions/availability.json', {
  scope: 'Level-acquisition catalog only; not a complete list of limit bursts, unlock/child skills or equipment commands.',
  limits: ['Complete direct effect files are unreviewed; conversion fidelity and runtime mechanics remain separate.',
    'Alternate atk/limit tracks are not automatically associated with skill IDs.'],
  secondarySnapshots, forms: rows,
});
for (const row of rows) console.log(JSON.stringify({ ...row, active: undefined }));
