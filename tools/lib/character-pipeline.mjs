import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { validateSceneAction } from '../../src/effects/sceneProfile.mjs';
import {sourceDamageEvents} from './source-damage-events.mjs';
import {validateActionChoreography} from '../../src/effects/actionChoreography.mjs';

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

/** Report unresolved original spatial dispatch without guessing a target/caster fallback. */
export function unresolvedEffectAnchors(skill) {
  return (skill.effects??[]).flatMap(branch=>(branch.groups??[])
    .filter(group=>group.anchor==='unknown')
    .map(group=>({groupId:group.groupId,raw:group.raw,flags:group.flags,
      reason:'Original effect anchor has no supported mapping'})));
}
/** Native motion-1 composition: shift skill groups by the last unit-group start. */
export function composeEffectFrames(unitFrames, skillFrames, motionType) {
  // '@' separates per-process branches (same rule as tools/compose_skill_effects.py); empty entries drop.
  const entries = raw => {
    const list = typeof raw === 'string' ? raw.split('&').filter(Boolean) : [];
    if (!list.length || list.some(v => !/^-?\d+:\d+(?::-?\d+){1,3}$/.test(v)))
      throw Error('Only ordinary effect timelines are supported');
    const parsed = list.map(v => v.split(':'));
    if (parsed.some(v => v.some(field => !Number.isSafeInteger(Number(field))))) throw Error('Invalid effect timeline integer');
    return parsed;
  };
  const skill = String(skillFrames ?? '').split('@').map(entries);
  if (motionType !== 1) return { effectFrames: skillFrames, skillFrameOffset: 0 };
  const unit = entries(unitFrames);
  if (unit.some(v => Number(v[0]) < 0)) throw Error('Unit attack effects cannot start before frame 0');
  if (String(unitFrames).includes('@')) throw Error('Unit attack timelines have no branches');
  const offset = Math.max(...unit.map(v => Number(v[0])));
  const shifted = skill.map(branch => branch.map(v => [String(Number(v[0]) + offset), ...v.slice(1)]));
  shifted[0] = [...unit, ...shifted[0]];
  return { effectFrames: shifted.map(branch => branch.map(v => v.join(':')).join('&')).join('@'), skillFrameOffset: offset };
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
        anchor: ({ 1: 'target', 2: 'target-group', 3: 'caster', 4: 'screen' })[anchor ?? (fields.length === 3 ? '1' : undefined)] ?? 'unknown',
        flags, soundsRaw: group['1fVZ3rKd'], extraRaw: group.rPHs9p8F,
        status: members.length ? 'resolved' : group['1fVZ3rKd'] ? 'sound-only-unreviewed' : 'unresolved-group', members };
    }),
  }));
}

/** Reuse a complete matched-source comparison only while every input is unchanged. */
export function loadControlAudit(file) {
  const audit = readJson(file);
  const required = ['tools/inspect_bmb.py','tools/bmb_channels.py','tools/bmb_parameters.py',
    'tools/bmb_materials.py','tools/bmb_source_controls.py'];
  if (audit.schema !== 'bmb-source-control-comparison-v1' || !Array.isArray(audit.results)
    || !Array.isArray(audit.differences) || audit.differences.length
    || required.some(p => audit.parserInputs?.[p] !== sha256(p)))
    throw Error('Control audit is incomplete or parser evidence is stale');
  for (const row of audit.results) {
    if (!row.projectComparison?.hierarchyMatches || sha256(row.binary) !== row.sha256
      || sha256(row.authoring) !== row.authoringSha256) throw Error('Control audit source identity changed');
  }
  return audit.results;
}

/** Clear only obsolete authoring-comparison errors, never renderer/resource/gameplay gates. */
export function refineAuthoringBlockers(blockers, effects, comparisons) {
  const confirmed = new Set();
  for (const row of comparisons) {
    const name = path.basename(row.binary);
    const versions = new Set(effects.filter(e => e.name === name).map(e => e.sha256));
    if (versions.size === 1 && versions.has(row.sha256) && row.projectComparison?.hierarchyMatches)
      confirmed.add(name);
  }
  const superseded = blockers.filter(b => [...confirmed].some(name => b.startsWith(name + ':authoring-comparison:')));
  return {blockers: blockers.filter(b => !superseded.includes(b)), superseded};
}

/** New imports must review placement independently of VFX and body choreography. */
export function validateImportPlacement(skill, manifest, publishedSkills = []) {
  const placement = manifest.plan?.rectanglePlacement;
  if (placement?.coordinateSystem === 'ffbe-screen-api' && placement.coordinateReview?.trim()) return;
  // Preserve historical accepted presentations, without admitting a new binding by name.
  const existing = publishedSkills.some(previous => previous.importStatus === 'imported'
    && previous.id === skill.id && previous.ffbeId === skill.ffbeId
    && (previous.type ?? 'ABILITY') === (skill.type ?? 'ABILITY')
    && previous.scenePresentation === skill.scenePresentation);
  if (!existing) throw Error('New Source import requires an explicit reviewed placement coordinate contract');
}

export function inspectCharacter(recipe, { assets = 'rawdata/assets', dump = 'rawdata/ffbe_asset_dump', effectsRoot = 'tools/effects' } = {}) {
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
    // The form's own Limit Burst (unit.limitBurstId). Its effect timeline uses the same group
    // format as abilities; `effectFrame` is mirrored as `effectFrames` for shared consumers.
    if (unit.limitBurstId) {
      const raw = db.prepare('SELECT * FROM limitburst WHERE limitBurstId = ?').get(Number(unit.limitBurstId));
      if (raw) byId.set(`LIMIT:${raw.limitBurstId}`, { kind: 'LIMIT', id: Number(raw.limitBurstId), name: raw.name, passive: false,
        raw: { ...raw, effectFrames: raw.effectFrame }, learned: [{ rarity: unit.rare, level: 1, source: 'unit.limitBurstId' }],
        effects: resolveEffects(db, assets, raw.effectFrame) });
    }
    const catalog = [...byId.values()];
    for(const skill of catalog)if(String(skill.raw?.processId)==='130'){
      // 'abilityId,count,a:b' plus optional trailing fields (3183 of 3210 rows end in ',0').
      const match=/^(\d+) ?,(\d+),(\d+):(\d+)(?:[:,][-\d,]*)?$/.exec(String(skill.raw.processParam));
      if(match){
        const raw=db.prepare('SELECT * FROM ability WHERE abilityId=?').get(Number(match[1]));
        skill.commandReferences=raw?[{role:'referenced-ability',id:Number(match[1]),dispatchRaw:skill.raw.processParam,raw}]:[];
        // Process 130 casts the referenced ability (NV-era commands such as Jill's Hailstorm). The cast
        // ability joins the catalog as an active skill learned with its command, so the ordinary
        // ability path (compose, stage, preview) imports what the command actually plays.
        if(raw&&!byId.has(`ABILITY:${raw.abilityId}`))byId.set(`ABILITY:${raw.abilityId}`,{kind:'ABILITY',id:Number(raw.abilityId),
          name:raw.name,passive:false,raw,learned:skill.learned,referencedBy:skill.id,effects:resolveEffects(db,assets,raw.effectFrames)});
      }
    }
    catalog.push(...[...byId.values()].filter(skill=>skill.referencedBy&&!catalog.includes(skill)));
    const suffix = `_cgs_${recipe.spriteUnitId}.csv`;
    const csvDir = path.join(dump, 'unit_animated_csv');
    const names = fs.readdirSync(csvDir).filter(f => f.startsWith('unit_') && f.endsWith(suffix));
    const tracks = names.map(f => f.slice(5, -suffix.length)).sort();
    const required = ['idle', 'atk', 'move', 'dead', 'dying', 'win', 'win_before'];
    const missingStates = required.filter(state => !tracks.includes(state));
    const publishedFile = `public/assets/units/${recipe.key}/skills.json`;
    const publishedSkills = fs.existsSync(publishedFile) ? readJson(publishedFile).skills ?? [] : [];
    const selected = (recipe.skills ?? []).map(skill => {
      const source = byId.get(`${skill.type ?? 'ABILITY'}:${skill.ffbeId}`);
      const issues = [];
      if (skill.scenePresentation) {
        try {
          assertKey(skill.scenePresentation);
          const manifest = validateSceneAction(readJson(`public/assets/presentations/${skill.scenePresentation}/manifest.json`), skill);
          validateImportPlacement(skill, manifest, publishedSkills);
          if (manifest.sourceId !== skill.ffbeId || manifest.provenance.playerSha256 !== sha256('src/effects/originalEffectPlayer.mjs'))
            throw Error('Experimental presentation source/player identity mismatch');
        } catch (error) { issues.push(`scene-presentation-blocked: ${error.message}`); }
      }
      if (!source?.raw) issues.push('not-in-series-learning-list');
      if (source?.passive) issues.push('passive-cannot-be-an-active-command');
      if(skill.sourceScopeReview){
        const r=skill.sourceScopeReview;
        const scope=source?.kind==='ABILITY'&&source.raw?.target==='1'
          ?{'1':'single_enemy','2':'all_enemies'}[source.raw.targetRange]:undefined;
        if(!r.note||!scope||r.scope!==scope||r.scope!==skill.scope||r.target!==source?.raw?.target||r.targetRange!==source?.raw?.targetRange)
          issues.push('original-target-scope-review-mismatch');
      }
      if (!Number.isFinite(skill.mpCost) || skill.mpCost < 0) issues.push('invalid-mp-cost');
      if (skill.importStatus === 'not-imported') {
        if(skill.execution !== 'not-imported' || skill.scenePresentation || !skill.unavailableReason)
          issues.push('unavailable-command-must-not-have-an-execution-binding');
      } else {
        if (!tracks.includes(skill.motion) || !['atk','magic_atk'].includes(skill.motion)) issues.push('missing-or-unsupported-body-motion');
        if (skill.importStatus !== 'imported' || !skill.requiresSourceScene || !skill.scenePresentation || !skill.reviewNote)
          issues.push('reviewed-source-import-required');
        if (skill.presentation || skill.visualEffect || skill.sourcePresentation) issues.push('obsolete-render-binding');
        if (!['dash','stationary'].includes(skill.moveType) || !Number.isFinite(skill.damageMultiplier)
          || (skill.execution==='prepared-events'?skill.damageMultiplier!==0:skill.damageMultiplier<=0))
          issues.push('invalid-reviewed-action');
        try {
          const manifest=validateSceneAction(readJson(`public/assets/presentations/${skill.scenePresentation}/manifest.json`),skill);
          const publicBody=path.resolve(`public/assets/units/${recipe.key}/manifest.json`);
          const bodyReceiptFile=`tools/data/characters/${recipe.key}/body-preparation.json`;
          let body=fs.existsSync(publicBody)?readJson(publicBody):undefined;
          if(!body&&fs.existsSync(bodyReceiptFile)){
            const receipt=readJson(bodyReceiptFile),file=path.resolve(receipt.directory,'manifest.json');
            if(!file.startsWith(path.resolve('tools/data')+path.sep)||sha256(file)!==receipt.manifestSha256)
              throw Error('Checked body receipt is stale or outside staging');
            body=readJson(file);
          }
          if(body&&String(body.unitId)!==recipe.spriteUnitId)throw Error('Character choreography body identity mismatch');
          const choreography=validateActionChoreography({...skill,originalCommand:{raw:source.raw}},manifest.durationFrames,body?.animations);
          if(!body&&(choreography.travelTiming==='move-cycle'||choreography.body.phases?.length>1))
            throw Error('Prepare a checked body before multi-phase or step choreography');
          if(choreography.body.mode==='clips'&&choreography.body.phases.some(p=>!tracks.includes(p.clip)))
            throw Error('Reviewed body clip missing from source tracks');
          const composition=manifest.plan.composition;
          if(composition){
            if(composition.skill.abilityId!==source.id || composition.skill.effectFrames!==source.raw.effectFrames)
              throw Error('Prepared composition must match the original command');
          }else{
            const evidence=skill.preparedSourceReceipt,file=path.resolve(evidence?.file??'');
            if(!file.startsWith(path.resolve('tools/data')+path.sep) || !evidence?.sha256
              ||sha256(file)!==evidence.sha256 ||manifest.plan.sourceSha256!==evidence.sha256)
              throw Error('Preserved non-composed preview requires its exact hashed original receipt');
            const receipt=readJson(file);
            if(receipt.skill.id!==source.id ||receipt.skill.kind!==source.kind
              ||receipt.skill.raw.effectFrames!==source.raw.effectFrames ||receipt.skill.raw.attackFrames!==source.raw.attackFrames)
              throw Error('Original receipt differs from the selected skill');
          }
          if(skill.execution==='prepared-source'){
            if(!skill.damageEvents?.length)throw Error('Reviewed damage events required');
            if(skill.damageTimingReview){
              if(skill.damageTimingReview.basis!=='accepted-gameplay' || !skill.damageTimingReview.reason
                || skill.hitCount!==skill.damageEvents.length)throw Error('Explicit reviewed gameplay timing required');
            }else{
              const expected=sourceDamageEvents(source,manifest.plan,unit);
              if(JSON.stringify(expected)!==JSON.stringify(skill.damageEvents)||skill.hitCount!==expected.length
                ||JSON.stringify(skill.attackFrames)!==JSON.stringify(manifest.plan.sourceHits.map(h=>h.frame)))
                throw Error('Reviewed events differ from composed original hit data');
            }
          }else if(skill.execution==='prepared-events'){
            const frames=parseTimeline(source.raw.attackFrames,/[-&,]/).map(f=>Number(f.fields[0]));
            if(skill.damageEvents||source.raw.motionType!==2||composition.skillFrameOffset!==0
              ||skill.hitCount!==frames.length||skill.supportEvents?.length!==frames.length
              ||JSON.stringify(frames)!==JSON.stringify(skill.attackFrames)||!skill.sourceScopeReview
              ||skill.supportEvents.some((e,i)=>e.frame!==frames[i]||e.effects.length!==1||e.effects[0].kind!=='execute-or-damage'))
              throw Error('Exact original instant-event clocks and scope review required');
          }else if(['prepared-support','prepared-self','prepared-friendly'].includes(skill.execution)){
            const frames=parseTimeline(source.raw.attackFrames,/[-&,]/).map(f=>Number(f.fields[0]));
            const events=skill.execution==='prepared-support'?skill.supportEvents:skill.allyEvents;
            // Magic rows carry no motionType and no composition: same zero-prefix cast profile as Motion 2.
            if(skill.hitCount!==0 || skill.damageEvents || !events?.length || (source.raw.motionType??2)!==2
              ||(composition?.skillFrameOffset??0)!==0 || events.some(e=>!frames.includes(e.frame))
              ||JSON.stringify(frames)!==JSON.stringify(skill.attackFrames))throw Error('Reviewed non-damaging source markers required');
            if(skill.execution==='prepared-self'&&(skill.scope!=='self'||source.raw.target!=='3'||source.raw.moveType!==4))
              throw Error('Source self target and stationary profile required');
            if(skill.execution==='prepared-friendly'&&(skill.scope!=='party'||(source.raw.moveType??4)!==4||!skill.allyTargeting
              ||!skill.friendlyTargetReview?.note||skill.friendlyTargetReview.sourceTarget!==source.raw.target
              ||skill.friendlyTargetReview.sourceRange!==source.raw.targetRange))
              throw Error('Explicit original friendly-target review required');
          }else throw Error('Only the Source skill execution profile can publish');
          if(source.effects.some(b=>b.conditional))throw Error('Unresolved process-indexed timeline');
        }catch(error){issues.push(`source-import-blocked: ${error.message}`);}
      }
      return { id: skill.id, ffbeId: skill.ffbeId, execution: skill.execution, issues,
        visualStatus: skill.importStatus==='not-imported'?'not-imported':skill.scenePresentation?'source-scene':'not-imported',
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
