import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { inspectCharacter, inspectEffect, resolveEffects, assertKey, sha256 } from './lib/character-pipeline.mjs';
import { artworkTransform } from './lib/effect-artwork.mjs';
import { isEffectBakeCurrent, planSkillBatch } from './lib/skill-batch.mjs';

const base = path.resolve('tools/data');
fs.mkdirSync(base, { recursive: true });
const root = fs.mkdtempSync(path.join(base, 'pipeline-tests-'));
test.after(() => {
  db.close();
  const resolved = path.resolve(root);
  assert.ok(resolved.startsWith(base + path.sep + 'pipeline-tests-'));
  fs.rmSync(resolved, { recursive: true });
});

const assets = path.join(root, 'assets');
const dump = path.join(root, 'dump');
for (const dir of ['static_data', 'battle_effect', 'effect_resource']) fs.mkdirSync(path.join(assets, dir), { recursive: true });
fs.mkdirSync(path.join(dump, 'unit_animated_csv'), { recursive: true });
fs.mkdirSync(path.join(dump, 'unit_animated'));
const db = new DatabaseSync(path.join(assets, 'static_data/ffbe-data.db'));
db.exec(`CREATE TABLE unit(unitId INTEGER, unitSeries INTEGER, unitName TEXT, attackFrames TEXT, attackMoveType INTEGER, effectFrames TEXT);
CREATE TABLE unit_series_lv_acquire(seriesLvAcquireId INTEGER,unitSeriesId INTEGER,rarity INTEGER,level INTEGER,nvLvl INTEGER,unlockType INTEGER,braveAbility INTEGER,abilityId TEXT,magicId TEXT);
CREATE TABLE ability(abilityId INTEGER,name TEXT,abilityType INTEGER,cost INTEGER,effectFrames TEXT,attackFrames TEXT,motionType INTEGER);
CREATE TABLE magic(magicId INTEGER,name TEXT,cost INTEGER,effectFrames TEXT,attackFrames TEXT);
CREATE TABLE effect_group(effectGroupId INTEGER,name TEXT,effectData TEXT,"1fVZ3rKd" TEXT,rPHs9p8F TEXT);
CREATE TABLE effect(effectId INTEGER,fileInfo TEXT,avX1k34K INTEGER);
INSERT INTO unit VALUES(123,120,'Test','6:100:2:2',1,NULL);
INSERT INTO unit_series_lv_acquire VALUES(1,120,5,1,0,0,0,'7',NULL),(2,120,6,20,0,0,0,'7','8');
INSERT INTO ability VALUES(7,'Strike',2,18,'4:10:1:1:0','6:100:2:2',1);
INSERT INTO magic VALUES(8,'Magic',5,NULL,NULL);
INSERT INTO effect_group VALUES(10,'Impact','0:11:1:1:2:2:0:0',NULL,NULL);
INSERT INTO effect VALUES(10,'wrong.bmb',100),(11,'impact.bmb',100);`);
const tracks = ['idle', 'atk', 'move', 'dead', 'dying', 'win', 'win_before'];
for (const track of tracks) fs.writeFileSync(path.join(dump, 'unit_animated_csv', `unit_${track}_cgs_123.csv`), 'test');
fs.writeFileSync(path.join(dump, 'unit_animated_csv', 'unit_cgg_123.csv'), 'test');
fs.writeFileSync(path.join(dump, 'unit_animated', 'unit_anime_123.png'), 'test');
const recipe = { key: 'test', spriteUnitId: '123', scale: 2.5,
  battle: { heroName: 'TEST', heroRole: 'HERO', attackType: 'melee', attackAnim: 'atk', targetOffsetX: 90, hitFrameIndex: 2, maxHp: 100, maxMp: 20 },
  skills: [{ id: 'strike', ffbeId: 7, type: 'ABILITY', name: 'Strike', desc: 'Test strike', motion: 'atk', mpCost: 18,
    scope: 'single_enemy', moveType: 'dash', damageMultiplier: 2, hitCount: 1, attackFrames: [6], execution: 'legacy' }] };

function effectBuffer(reference) {
  const text = Buffer.from(reference + '\0', 'utf16le');
  const info = Buffer.alloc(20);
  info.writeInt32LE(1810, 0); info.writeInt32LE(1, 4);
  info.writeInt32LE(1, 8); info.writeInt32LE(1, 12); info.writeInt32LE(text.length / 2, 16);
  const header = Buffer.alloc(16); header.write('EFKE'); header.write('INFO', 8); header.writeUInt32LE(info.length + text.length, 12);
  return Buffer.concat([header, info, text]);
}
const effectFile = path.join(assets, 'battle_effect/impact.efkefc');
fs.writeFileSync(effectFile, effectBuffer('../effect_resource/glow.png'));

test('batch cache invalidates changed recipes, source, resources and sheets', () => {
  const effectsRoot = path.join(root, 'effects');
  const output = path.join(effectsRoot, 'cache_test');
  fs.mkdirSync(output, { recursive: true });
  const source = path.join(assets, 'battle_effect/cache_test.efkefc');
  const resource = path.join(assets, 'effect_resource/cache_test.png');
  fs.writeFileSync(source, effectBuffer('../effect_resource/cache_test.png'));
  fs.writeFileSync(resource, 'resource');
  const recipeFile = path.join(root, 'cache-test.json');
  fs.writeFileSync(recipeFile, JSON.stringify({ key: 'cache_test', source: 'battle_effect/cache_test.efkefc', review: { approved: true } }));
  const sheet = path.join(output, 'impact.png');
  fs.writeFileSync(sheet, 'sheet');
  const inspected = inspectEffect(source, assets);
  fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify({
    recipeSha256: sha256(recipeFile), sourceSha256: sha256(source), sheetSha256: sha256(sheet),
    resources: inspected.resources.map(r => ({ file: r.file, sha256: r.sha256 })),
  }));
  const current = () => isEffectBakeCurrent(recipeFile, { assets, effectsRoot });
  assert.equal(current(), true);
  for (const file of [recipeFile, source, resource, sheet]) {
    const original = fs.readFileSync(file);
    fs.appendFileSync(file, ' ');
    assert.equal(current(), false, `Changed input/output must invalidate: ${file}`);
    fs.writeFileSync(file, original);
    assert.equal(current(), true);
  }
  fs.unlinkSync(resource);
  assert.equal(current(), false, 'A missing dependency must invalidate a cached sheet');
});

test('group indirection ignores a colliding effect ID and preserves conditions', () => {
  const timeline = resolveEffects(db, assets, '4:10:1:1:0@20:10:2:4:0');
  assert.equal(timeline[0].groups[0].members[0].effectId, 11);
  assert.equal(timeline[0].groups[0].anchor, 'target');
  assert.equal(timeline[1].conditional, true);
  assert.equal(timeline[1].groups[0].anchor, 'screen');
  assert.equal(timeline[0].groups[0].members[0].status, 'missing-dependencies');
});
test('resource parser records dependencies and rejects paths outside the asset root', () => {
  const result = inspectEffect(effectFile, assets);
  assert.equal(result.resources.length, 1);
  assert.equal(result.resources[0].exists, false);
  const unsafe = path.join(assets, 'battle_effect/unsafe.efkefc');
  fs.writeFileSync(unsafe, effectBuffer('../../outside.png'));
  assert.throws(() => inspectEffect(unsafe, assets), /outside asset root/);
  fs.writeFileSync(unsafe, Buffer.from('EFKE'));
  assert.throws(() => inspectEffect(unsafe, assets), /Missing EFKE resource/);
});
test('form resolves to series, duplicate unlocks remain and magic is cataloged', () => {
  const report = inspectCharacter(recipe, { assets, dump });
  assert.equal(report.unit.seriesId, 120);
  assert.equal(report.catalog.length, 2);
  assert.equal(report.catalog[0].learned.length, 2);
  assert.equal(report.catalog[1].kind, 'MAGIC');
  assert.equal(report.selected[0].visualStatus, 'no-runtime-vfx');
  assert.equal(report.publishable, true); // Explicit legacy opt-in is preserved, not called complete.
});

test('batch never promotes preserved legacy commands to reviewed exports', () => {
  fs.writeFileSync(path.join(root, 'test.json'), JSON.stringify(recipe));
  const report = planSkillBatch({ characters: ['test'], recipesRoot: root, assets, dump });
  assert.equal(report.skills.length, 1);
  assert.equal(report.skills[0].status, 'blocked');
  assert.ok(report.skills[0].blockers.includes('execution-and-composition-review-required'));
  assert.equal(report.effects.length, 0);
});
test('unlearned skills and unsupported timeline mechanics block publication', () => {
  const changed = structuredClone(recipe);
  changed.skills[0].ffbeId = 999;
  assert.equal(inspectCharacter(changed, { assets, dump }).publishable, false);
  changed.skills[0].ffbeId = 7;
  changed.skills[0].execution = 'timeline-single-hit';
  changed.skills[0].hitCount = 5;
  const report = inspectCharacter(changed, { assets, dump });
  assert.ok(report.selected[0].issues.includes('unsupported-timeline-execution'));
  assert.equal(report.publishable, false);
});
test('duplicate keys and missing state animations cannot silently enter an import', () => {
  assert.throws(() => assertKey('../outside'), /Invalid content key/);
  const changed = structuredClone(recipe);
  changed.skills.push(changed.skills[0]);
  assert.throws(() => inspectCharacter(changed, { assets, dump }), /Duplicate skill/);
  const file = path.join(dump, 'unit_animated_csv/unit_win_before_cgs_123.csv');
  fs.renameSync(file, file + '.hidden');
  try {
    const report = inspectCharacter(recipe, { assets, dump });
    assert.deepEqual(report.missingStates, ['win_before']);
    assert.equal(report.publishable, false);
  } finally { fs.renameSync(file + '.hidden', file); }
});

test('unsupported effect formats remain visible in the catalog without losing skill ownership', () => {
  const original = fs.readFileSync(effectFile);
  fs.writeFileSync(effectFile, 'unsupported');
  try {
    const report = inspectCharacter(recipe, { assets, dump });
    const member = report.catalog[0].effects[0].groups[0].members[0];
    assert.equal(member.status, 'unsupported-effect-format');
    assert.match(member.asset.parseError, /Invalid EFKE header/);
    assert.equal(report.catalog[0].learned.length, 2);
  } finally { fs.writeFileSync(effectFile, original); }
});

test('area presentation validates complete source mapping and preserves multi-hit provenance', () => {
  const key = `pipeline_area_fixture_${process.pid}`, file = `tools/effects/${key}.json`;
  const resource = path.join(assets, 'effect_resource/glow.png');
  fs.writeFileSync(resource, 'test');
  fs.writeFileSync(file, JSON.stringify({ effectId: 11, masterFile: 'impact.bmb', emitterScale: 1,
    frameCount: 90, review: { approved: true, reason: 'Synthetic test fixture' } }));
  db.prepare('UPDATE ability SET attackFrames = ? WHERE abilityId = 7').run('4:50:2:2-8:50:2:2');
  try {
    const changed = structuredClone(recipe), skill = changed.skills[0];
    Object.assign(skill, { execution: 'timeline-area', scope: 'all_enemies', moveType: 'stationary',
      attackFrames: [4, 8], hitCount: 2, reviewNote: 'Combine source hits for the adapted presentation',
      presentation: { impactFrame: 30, durationFrames: 96, effects: [{ key, startFrame: 4, anchor: 'target' }] } });
    assert.equal(inspectCharacter(changed, { assets, dump }).publishable, true);
    db.prepare('UPDATE ability SET motionType = 8 WHERE abilityId = 7').run();
    assert.ok(inspectCharacter(changed, { assets, dump }).selected[0].issues.includes('source-motion-needs-review'));
    skill.motionReview = { sourceCode: 8, prepared: 'atk', reason: 'Explicit adapted test motion' };
    assert.equal(inspectCharacter(changed, { assets, dump }).publishable, true);
    skill.presentation.effects[0].startFrame = 5;
    assert.ok(inspectCharacter(changed, { assets, dump }).selected[0].issues.includes('effect-mapping-mismatch'));
    skill.presentation.effects[0].startFrame = 4;
    skill.presentation.durationFrames = 93;
    assert.ok(inspectCharacter(changed, { assets, dump }).selected[0].issues.includes('invalid-effect-timeline'));
    skill.presentation.durationFrames = 96;
    skill.presentation.effects[0].layer = 'back';
    assert.ok(inspectCharacter(changed, { assets, dump }).selected[0].issues.includes('unsupported-effect-transform'));
    delete skill.presentation.effects[0].layer;
    const effectRecipe = JSON.parse(fs.readFileSync(file));
    effectRecipe.artworkRotationDegrees = 90;
    fs.writeFileSync(file, JSON.stringify(effectRecipe));
    assert.ok(inspectCharacter(changed, { assets, dump }).selected[0].issues.includes('effect-artwork-adaptation-needs-review'));
    effectRecipe.review.presentationAdaptation = 'Clockwise artwork presentation without changing source rotation';
    fs.writeFileSync(file, JSON.stringify(effectRecipe));
    assert.equal(inspectCharacter(changed, { assets, dump }).publishable, true);
    effectRecipe.emitterRotation = [0, 0, 45];
    fs.writeFileSync(file, JSON.stringify(effectRecipe));
    assert.ok(inspectCharacter(changed, { assets, dump }).selected[0].issues.includes('unsupported-effect-transform'));
    skill.presentation.effects = [];
    assert.equal(inspectCharacter(changed, { assets, dump }).publishable, false);
  } finally {
    db.prepare('UPDATE ability SET attackFrames = ? WHERE abilityId = 7').run('6:100:2:2');
    db.prepare('UPDATE ability SET motionType = 1 WHERE abilityId = 7').run();
    fs.rmSync(file);
    fs.rmSync(resource);
  }
});

test('clockwise crescent rotation preserves horizontal travel instead of rotating its path', () => {
  const positions = [];
  for (const left of [4, 20]) {
    const pixels = new Uint8ClampedArray(32 * 32 * 4);
    for (let y = 12; y < 20; y++) for (let x = left; x < left + 8; x++) pixels.set([0, 255, 0, 255], (y * 32 + x) * 4);
    const p = artworkTransform(pixels, 32, 32, 90, 'visible-bounds');
    positions.push([p.x, p.y]);
    const lowerEdge = { x: p.x - Math.sin(p.radians) * 4, y: p.y + Math.cos(p.radians) * 4 };
    assert.ok(Math.abs(lowerEdge.x - (p.x - 4)) < 1e-9);
    assert.ok(Math.abs(lowerEdge.y - p.y) < 1e-9);
    pixels.set([255, 255, 255, 255], 0);
    const body = artworkTransform(pixels, 32, 32, 90, 'bright-body');
    assert.deepEqual([body.x, body.y], [p.x, p.y]);
  }
  assert.deepEqual(positions, [[8, 16], [24, 16]]);
});

test('clockwise beam rotation turns a down-left ray left while retaining the target origin', () => {
  const p = artworkTransform(new Uint8ClampedArray(32 * 32 * 4), 32, 32, 45, 'origin');
  const x = -Math.cos(p.radians) - Math.sin(p.radians), y = -Math.sin(p.radians) + Math.cos(p.radians);
  assert.ok(x < 0);
  assert.ok(Math.abs(y) < 1e-9);
  assert.deepEqual([p.x, p.y], [16, 16]);
  assert.throws(() => artworkTransform([], 32, 32, NaN, 'origin'), /Invalid artwork/);
  assert.throws(() => artworkTransform([], 32, 32, 90, 'guessed-pivot'), /Invalid artwork/);
});
