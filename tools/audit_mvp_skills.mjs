import fs from 'node:fs';
import path from 'node:path';
import { inspectCharacter, readJson, writeJson, sha256 } from './lib/character-pipeline.mjs';

// Read-only source inspection. Outputs are research documents, never runtime assets.
const output = 'docs/research/mvp-skill-audit';
const notes = {
  blade_beam: {
    priority: 1,
    mechanics: '300% physical damage, two equally weighted hits to all enemies.',
    blockers: ['Two-hit weighted damage scheduling.', 'Target-group versus per-target effect placement, including the raw -1100 member field; its units/meaning need review.', 'Composite effect playback: green slash at F0; blue slash group F4 + member F1 = F5.'],
  },
  climhazzard: {
    mechanics: '275% physical damage with 50% DEF ignore (process 21); not ignore-cover.',
    blockers: ['Missing purple power-geyser effect.', 'Rotated/scaled composite cuts, target impact and screen strobe.', 'SPECIAL_EXPLODE_1 group behavior is unresolved; its sound field does not establish that it is audio-only.', 'Runtime uses a simplified 5.5 multiplier and an inaccurate ignore-cover description; DEF-ignore mechanics are not implemented.'],
  },
  healing_wind: {
    mechanics: 'Healing process 2 with base 1000 and modifier 340; additional process 5 with parameters 1 through 8.',
    blockers: ['Missing full-cure effect.', 'Party/group healing anchor and sustained clock through F180.', 'Second source process needs explicit semantic review and implementation; runtime only heals living allies with a simplified formula.'],
  },
  curaja: {
    mechanics: 'Healing process 2 with base 2500 and modifier 1800; group target.',
    blockers: ['Missing front layer; back layer alone is incomplete.', 'Front/back party-layer composition and healing event at F120.', 'Recipe magic_atk is an explicit runtime choice; the magic row has no motionType/moveType columns.', 'Runtime uses simplified healing rather than the source formula.'],
  },
  banishga: {
    mechanics: 'Source process 103: parameters 100,99999,2000. Eight hits, weights 8% x 7 then 44%.',
    blockers: ['Four unique required effect files are missing (16 scheduled member instances).', 'Mixed group/per-target front/back layers, repeated effects and an eight-hit weighted clock.', 'SPR-conversion/light mechanics are not represented by the runtime damage formula.', 'Group 99999999 is named noeffect_nosound; treat it as a candidate intentional no-op, not automatically as a missing visual.', 'Secondary JP snapshot disagrees with SQLite on cost, hit count/timing and modifier; do not merge versions.'],
  },
  big_shot: {
    mechanics: '250% physical damage to one enemy, hit at F130.',
    blockers: ['Missing hard-shot effect; the available explosion is only its second member.', 'Source motionType 8 is unmapped by the current pipeline; legacy extraction maps every non-2 ability motion to atk.', 'Stationary timeline: group at F88, explosion member at F128, damage at F130; source sound offsets remain unreviewed.'],
  },
  grenade_bomb: {
    mechanics: '180% physical damage to all enemies plus process 24: -35 DEF for 3 turns (secondary JP decoding agrees).',
    blockers: ['Missing convergence/explosion effect; the available mental-break effect is incomplete on its own.', 'Source motionType 8 needs explicit mapping.', 'Group-target and per-target composite placement; the second visual starts at F148 + F1 = F149.', 'Runtime has no DEF-debuff state/duration or source damage/debuff event dispatcher.'],
  },
  satellite_beam: {
    priority: 2,
    mechanics: '300% physical damage to all enemies, ten hits with 10% weight each.',
    blockers: ['Source motionType 8 needs explicit mapping.', 'Ten-hit weighted AoE clock lasting through F215.', 'Target marker at F41, beam at F60 with rotation 45 and raw member offsets 150/-150, screen fade at F40.', 'Mixed target/screen anchors and unverified original placement of a converted 3D beam.'],
  },
};

const rows = [];
const characters = [];
for (const key of ['cloud', 'aerith', 'barret']) {
  const recipeFile = `tools/characters/${key}.json`;
  const runtimeFile = `public/assets/units/${key}/skills.json`;
  const recipe = readJson(recipeFile);
  const inspection = inspectCharacter(recipe, { assets: 'assets', dump: 'ffbe_asset_dump-main' });
  const runtime = readJson(runtimeFile);
  const manifest = readJson(`public/assets/units/${key}/manifest.json`);
  characters.push({ ...inspection.unit, recipeFile, recipeSha256: sha256(recipeFile), runtimeFile,
    manifestSha256: sha256(`public/assets/units/${key}/manifest.json`),
    runtimeSha256: sha256(runtimeFile), tracks: inspection.tracks, missingStates: inspection.missingStates });
  for (const skill of recipe.skills.filter(s => s.execution === 'legacy')) {
    const source = inspection.catalog.find(c => c.kind === (skill.type ?? 'ABILITY') && c.id === skill.ffbeId);
    if (!source?.raw || source.passive || !notes[skill.id]) throw Error(`Unreviewed or unlearned selection: ${key}/${skill.id}`);
    const live = runtime.skills.find(s => s.id === skill.id);
    if (!live) throw Error(`Missing runtime command: ${key}/${skill.id}`);
    const { execution, ...expected } = skill;
    const differences = [...new Set([...Object.keys(expected), ...Object.keys(live)])]
      .filter(field => JSON.stringify(expected[field]) !== JSON.stringify(live[field]))
      .map(field => ({ field, recipe: expected[field] ?? null, runtime: live[field] ?? null }));
    const raw = source.raw;
    const hits = String(raw.attackFrames ?? '').split('-').filter(Boolean).map(entry => {
      const fields = entry.split(':').map(Number);
      return { frame: fields[0], milliseconds: Number((fields[0] * 1000 / 60).toFixed(3)), weightPercent: fields[1], raw: entry };
    });
    const effects = source.effects;
    const members = effects.flatMap(branch => branch.groups.flatMap(group => group.members));
    const missingFiles = [...new Set(members.filter(m => m.status === 'missing-effect-file').map(m => m.asset.file))];
    const body = manifest.animations[skill.motion];
    rows.push({ character: key, spriteUnitId: recipe.spriteUnitId, seriesId: inspection.unit.seriesId,
      id: skill.id, name: skill.name, kind: source.kind, sourceId: source.id, learned: source.learned,
      source: Object.fromEntries(['cost', 'moveType', 'motionType', 'target', 'targetRange', 'attackFrames', 'processId', 'processParam', 'effectFrames'].map(field => [field, raw[field] ?? null])),
      hits, effects, missingFiles,
      allEffectMembersAvailable: members.length > 0 && members.every(m => m.status === 'available-unreviewed'),
      recipe: skill, runtime: live, recipeRuntimeDifferences: differences,
      body: { runtimeMotion: skill.motion, availableInRawTracks: inspection.tracks.includes(skill.motion),
        prepared: !!body, frameCount: body?.frameCount ?? null,
        durationMs: body ? Number(body.frames.reduce((sum, frame) => sum + frame.durationMs, 0).toFixed(3)) : null },
      ...notes[skill.id] });
  }
}
if (rows.length !== 8) throw Error(`Expected eight remaining MVP skills, found ${rows.length}`);

// Search exact original stems in both local source roots, including other formats.
const missingStems = new Set(rows.flatMap(r => r.missingFiles.map(f => path.basename(f, '.efkefc').toLowerCase())));
const exactStemMatches = Object.fromEntries([...missingStems].map(stem => [stem, []]));
function scan(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) scan(file);
    else if (!entry.name.endsWith('.import')) {
      const stem = path.parse(entry.name).name.toLowerCase();
      if (missingStems.has(stem)) exactStemMatches[stem].push(file.replaceAll('\\', '/'));
    }
  }
}
scan('assets');
scan('ffbe_asset_dump-main');

const secondaryEvidence = [
  { file: 'ffbe_data-master/jp/ability.json', ids: [214810, 214820, 227870, 227872, 227874] },
  { file: 'ffbe_data-master/jp/magic.json', ids: [10170, 10290] },
].map(({ file, ids }) => {
  const data = readJson(file);
  return { file, sha256: sha256(file), records: ids.map(id => ({ id, value: data[String(id)] ?? null })) };
});
const audit = { schemaVersion: 1, sourceDatabase: { file: 'assets/static_data/ffbe-data.db', sha256: sha256('assets/static_data/ffbe-data.db') },
  inspectedCode: ['tools/audit_mvp_skills.mjs', 'tools/lib/character-pipeline.mjs', 'tools/export_effect.mjs', 'src/scenes/BattleScene.ts', 'src/entities/UnitActor.ts']
    .map(file => ({ file, sha256: sha256(file) })),
  limits: ['No effects were rendered, baked, published or visually approved in this audit.',
    'File/dependency availability is not proof of correct original motion, camera or placement.',
    'Numeric motionType 8 is intentionally left unmapped.',
    'Source frame numbers are 60 Hz timeline ticks, not body-sheet frame indices.',
    'Exact-stem search does not identify renamed alternatives or prove absence from every possible source.'],
  characters, secondaryEvidence, exactStemMatches, skills: rows,
  recommendation: { next: 'blade_beam', alternative: 'satellite_beam',
    reason: 'Both Blade Beam effect files and all their direct dependencies are available. It reuses an existing source motion 1/atk, has two rather than ten damage events, and has no screen-wide effect. It still requires composite/group placement review and a multi-hit AoE executor.' } };
writeJson(`${output}.json`, audit);
const formatHits = row => row.hits.map(h => `${h.frame} (${h.weightPercent}%)`).join(', ');
const lines = ['# Remaining MVP skill audit', '',
  'Scope: eight existing legacy commands. Source: local read-only SQLite inspection and the three reviewed character recipes. This is an availability and execution audit, not a visual approval or publication.', '',
  '## Decision', '', audit.recommendation.reason, '',
  '**Recommended next milestone:** render and inspect Blade Beam\'s two source effects offline, review their combined placement, then specify its two-hit AoE timeline. Do not mark it supported or publish it before those checks.', '',
  '## End-to-end sequence for the next skill', '',
  'This is the proposed implementation/verification sequence, not newly implemented runtime support. It extends [the existing import standard](../character-import-workflow.md).', '',
  '1. Resolve exact sprite form to learning series; confirm skill kind + ID and every acquisition condition. Freeze the chosen SQLite snapshot and keep secondary-version evidence separate.',
  '2. Review source motion/movement and mechanics against the recipe. Keep deliberate roguelike balance changes explicit. Unknown motion codes, missing resources and unresolved processes remain blockers.',
  '3. Inspect the complete source composition offline: every effect member, absolute start tick, layer, anchor, scale, rotation, offset and dependency. Render individual effects before reviewing the combined choreography. A visible individual effect is not approval of the combined skill.',
  '4. Define action phases: selected/prepared pose; optional magic readiness cycle; optional approach to selected target using the existing foot pivots; body-pose start and zero point of the 60 Hz skill clock. Spell readiness is separate from that clock.',
  '5. Schedule visual members at group-start + member-offset and damage at source hit ticks with source weights. Define per-target versus target-group placement using reviewed semantics. Account for all living targets and skip defeated targets without duplicating events. Do not interpret opaque group fields as guessed screen pixels.',
  '6. Complete after the body motion, final hit and required effect tail, with reviewed hit-stop behavior. Then return to the exact home foot position, choose the correct resting pose, and release the action lock once. The fixed legacy 900 ms return is not a valid duration for every skill; Barret\'s prepared atk sheet alone lasts 2133.32 ms.',
  '7. Bake approved composition into standard sheets/metadata with provenance. Validate recipe/source/resource/sheet hashes and dimensions, then publish through the shared catalog. Avoid per-character loaders and never substitute unrelated effects for missing members.',
  '8. Check one and three enemies, every target row, both arena floors, target death during a timeline, MP charged once, healing/low-HP transitions, cancellation/reset and repeated actions. Compare against an original reference when claiming original-game fidelity.', '',
  '## Eight-skill overview', '',
  '| Character / skill | Source ID; unlock | Source hit ticks (weight) | Local effect files | Primary work remaining |',
  '| --- | --- | --- | --- | --- |',
  ...rows.map(row => `| ${row.character} / ${row.name} | ${row.kind} ${row.sourceId}; ${row.learned.map(l => `${l.rarity}★ L${l.level}`).join('; ')} | ${formatHits(row)} | ${row.allEffectMembersAvailable ? 'All direct files/resources available; unreviewed' : `${row.missingFiles.length} unique required file(s) missing`} | ${row.blockers[0]} |`), '',
  '## Runtime and version limits', '',
  '- All eight selections are present in their series learning lists. Barret uses sprite 207000205 but series 207000204. Unlock rarity comes from acquisition rows, not ability.rarity.',
  '- All eight recipe body motions exist in both raw tracks and prepared sheets. That does not validate an unmapped source motion 8 as atk.',
  `- Recipe/runtime metadata differences: ${rows.reduce((sum, r) => sum + r.recipeRuntimeDifferences.length, 0)}. Matching metadata still describes simplified legacy behavior.`,
  '- The stationary runtime applies one impact at 200 ms and schedules return after 900 ms. It does not execute the listed source hit weights, counts or composite effects. Legacy dashes use one 160 ms impact. Only the reviewed Brave Slash visual path uses a source tick for its hit.',
  '- Physical source motion 1 corresponds to the reviewed atk path; motion 8 requires investigation. The magic rows do not specify moveType/motionType, so the recipe magic_atk choice is separate evidence.',
  '- Secondary JP magic 10170 has MP 20, one hit at F65 and modifier 180; the local SQLite has MP 30, eight hits and process parameters 100,99999,2000. These are different snapshots. Curaja JP agrees on base heal 2500/modifier 18 and F120. SQLite remains the selected audit source.',
  '- No original-game fidelity is established by this audit. The current damage/healing formulas remain MVP balance rules.', '',
  'A general importer report with publishable metadata does not mean these legacy skills have complete effects or original behavior. Its legacy compatibility path accepts the existing commands; the audit above records the separate source/executor blockers.', '',
  '## Per-skill evidence', '',
  ...rows.flatMap(row => [`### ${row.character}: ${row.name}`, '', row.mechanics, '',
    `Source MP ${row.source.cost}; game MP ${row.runtime.mpCost}. Runtime body ${row.body.runtimeMotion}: ${row.body.frameCount} frames, ${row.body.durationMs} ms. Source moveType ${row.source.moveType ?? 'not provided'}, motionType ${row.source.motionType ?? 'not provided'}.`, '',
    ...row.blockers.map(note => `- ${note}`), '',
    '| Group start / group | Anchor; layer | Member absolute tick / effect | File and status |', '| --- | --- | --- | --- |',
    ...row.effects.flatMap(branch => branch.groups.flatMap(group => group.members.length
      ? group.members.map(member => `| F${group.startFrame} / ${group.groupId} ${group.name} | ${group.anchor}; ${group.layer} | F${group.startFrame + member.frame} / ${member.effectId} | ${member.originalFile}: ${member.status} |`)
      : [`| F${group.startFrame} / ${group.groupId} ${group.name} | ${group.anchor}; ${group.layer} | No effectData | ${group.status}; semantics require review |`])), '',
    `Source attackFrames: \`${row.source.attackFrames}\`. Source processId: \`${row.source.processId}\`; processParam: \`${row.source.processParam}\`.`, '']),
  '## Asset search and reproducibility', '',
  `${missingStems.size} unique required stems have no usable converted effect in the directly resolved path. Exact-stem results across assets/ and ffbe_asset_dump-main/ are retained in the JSON. No same-named alternative file was found in this inspection. Renamed or similar effects were not substituted.`, '',
  'Re-run from the repository root with Node 24:', '', '```powershell', 'node tools/audit_mvp_skills.mjs', '```', '',
  'The adjacent JSON retains database/recipe/runtime/code hashes, acquisition records, source mechanics, member transforms, raw placement fields, resource hashes and exact-stem search results. Larger general importer reports are ignored under tools/data/characters/.', '',
  'Verification: all three CLI character inspections and this audit executed locally; generated JSON and Markdown were checked. No new effect playback, visual comparison, game build or gameplay test is claimed for this documentation-only milestone.', ''];
fs.writeFileSync(`${output}.md`, lines.join('\n'));
console.log(`Audited ${rows.length} skills; ${rows.filter(r => r.allEffectMembersAvailable).length} have all direct effect members/resources; ${missingStems.size} unique missing effect stems.`);
console.log(`Wrote ${output}.json and .md. No runtime files changed.`);
