import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { inspectCharacter, inspectEffect, resolveEffects, assertKey } from './lib/character-pipeline.mjs';

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
CREATE TABLE ability(abilityId INTEGER,name TEXT,abilityType INTEGER,cost INTEGER,effectFrames TEXT,attackFrames TEXT);
CREATE TABLE magic(magicId INTEGER,name TEXT,cost INTEGER,effectFrames TEXT,attackFrames TEXT);
CREATE TABLE effect_group(effectGroupId INTEGER,name TEXT,effectData TEXT,"1fVZ3rKd" TEXT,rPHs9p8F TEXT);
CREATE TABLE effect(effectId INTEGER,fileInfo TEXT,avX1k34K INTEGER);
INSERT INTO unit VALUES(123,120,'Test','6:100:2:2',1,NULL);
INSERT INTO unit_series_lv_acquire VALUES(1,120,5,1,0,0,0,'7',NULL),(2,120,6,20,0,0,0,'7','8');
INSERT INTO ability VALUES(7,'Strike',2,18,'4:10:1:1:0','6:100:2:2');
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
