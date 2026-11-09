import {resolveRawPath} from './lib/raw-paths.mjs';
import {recommendMusic} from '../src/audio/musicProfiles.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {ENEMY_CONTENT,STAGE_CONTENT,stageForArea,enemyAction} from '../src/run/stageContent.mjs';
import {runEncounter} from '../src/run/runBalance.mjs';
import {createRun,validateRun,rollParty,confirmParty,variantAreas,encounters,PROTOTYPE_AREAS} from '../src/run/runState.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');

test('all stage actors bind reviewed original identities and full validated body resources',()=>{
 const registry=read('public/assets/content.json');
 for(const [key,d]of Object.entries(ENEMY_CONTENT)){
  assert.ok(registry.monsters.includes(key));
  const p=`public/assets/monsters/${key}`,s=read(p+'/source.json'),m=read(p+'/manifest.json');
  assert.equal(s.monster.monsterId,String(d.monsterId)*1);assert.equal(s.monster.dictionaryId,d.dictionaryId);
  assert.equal(s.dictionary.name,d.name);assert.equal(String(m.unitId),d.spriteId);assert.equal(m.type,'monster');
  assert.equal(hash(p+'/manifest.json'),s.manifestSha256);assert.equal(hash(s.recipe),s.recipeSha256);
  s.files.forEach(f=>assert.equal(hash(resolveRawPath(f.path)),f.sha256));s.preparedFiles.forEach(f=>assert.equal(hash(p+'/'+f.file),f.sha256));
  assert.ok(m.animations.idle);const attack=m.animations[d.attack.clip];assert.ok(attack.frames[d.attack.impactFrame]);
  assert.ok(attack.frames.slice(0,d.attack.impactFrame).reduce((t,f)=>t+f.durationMs,0)<attack.frames.reduce((t,f)=>t+f.durationMs,0));
  assert.ok(Number.isFinite(attack.pivotX)&&Number.isFinite(attack.pivotY));
 }
});

test('two original-backed lineups use different arenas, bosses and declared future audio boundaries',()=>{
 assert.notEqual(STAGE_CONTENT.whisperwood.arena,STAGE_CONTENT.mako_reactor.arena);
 assert.notEqual(STAGE_CONTENT.whisperwood.bossId,STAGE_CONTENT.mako_reactor.bossId);
 for(const s of Object.values(STAGE_CONTENT)){
  for(const key of [s.bossId,...s.enemyPool])assert.ok(ENEMY_CONTENT[key]);
  assert.ok(s.normalFights>=1);
  assert.equal(stageForArea({stageId:s.id,arena:s.arena}),s);
 }
 assert.equal(STAGE_CONTENT.whisperwood.audio.musicResourceId,400005);
 assert.equal(STAGE_CONTENT.mako_reactor.audio.musicResourceId,400842);
 assert.equal(STAGE_CONTENT.mako_reactor.audio.bossMusicResourceId,400993);
 assert.equal(STAGE_CONTENT.mako_reactor.audio.musicAssignment,'Original FFVII battle theme (Memorial client download)');
 assert.throws(()=>stageForArea({stageId:'unimported',arena:'forest'}));
 assert.throws(()=>stageForArea({stageId:'mako_reactor',arena:'forest'}));
});

test('encounter selection is pure, independent of upgrades, keeps old saved areas/RNG intact',()=>{
 const catalog=Object.fromEntries(['a','b','c'].map(key=>[key,{key,identity:key,canonicalIdentity:key,unitId:key,rarity:5,form:key,maxHp:100,maxMp:50,skills:[{id:key+'-skill'}]}]));
 // Fixed course (forest, reactor): seeds pick two of all stages, so the route is given explicitly.
 const areas=['whisperwood','mako_reactor'].map(id=>PROTOTYPE_AREAS.find(a=>a.stageId===id));
 let r=confirmParty(rollParty(createRun('stage-restore',catalog,areas),catalog));
 const before=JSON.stringify(r);assert.equal(runEncounter(r).enemies[0].key,'microchu');assert.equal(JSON.stringify(r),before);
 r.encounter=1;assert.equal(runEncounter(r).enemies[0].key,'ochu');
 r.encounter=2;assert.deepEqual(runEncounter(r).enemies.map(e=>e.key),['sweeper','sweeper']);
 r.encounter=3;assert.equal(runEncounter(r).enemies[0].key,'guard_scorpion');
 const old=structuredClone(r);old.areas.forEach(a=>delete a.stageId);const serialized=JSON.stringify(old);validateRun(old,catalog);assert.equal(runEncounter(old).stageId,'mako_reactor');assert.equal(JSON.stringify(old),serialized);
 r.areas[0].stageId='unpublished';assert.throws(()=>validateRun(r,catalog));
});

test('boss warning and party burst stay ordered across stopped phases; low HP changes power, not cursor',()=>{
 for(const d of Object.values(ENEMY_CONTENT).filter(d=>d.behavior)){
  assert.equal(enemyAction(d,0,1).scope,'single');assert.equal(enemyAction(d,1,1).kind,'prepare');
  const cursor=1;assert.deepEqual(enemyAction(d,cursor,1),enemyAction(d,cursor,1));
  assert.equal(enemyAction(d,2,1).scope,'party');const low=enemyAction(d,2,.5);
  assert.equal(low.phase,d.behavior.phaseName);assert.ok(low.multiplier>enemyAction(d,2,.51).multiplier);
  assert.equal(enemyAction(d,3,1).scope,'single');assert.throws(()=>enemyAction(d,-1,1));
 }
 assert.equal(enemyAction(ENEMY_CONTENT.sweeper,99,.1).phase,'');
});

test('each seed picks two stages, ordered by difficulty, with seeded reactor variants',()=>{
 const variants=new Set(),stages=new Set();
 for(let i=0;i<64;i++){
  const seed='arena-'+i;
  const areas=variantAreas(seed);
  assert.deepEqual(areas,variantAreas(seed));
  assert.equal(new Set(areas.map(a=>a.stageId)).size,2);
  const difficulty=areas.map(a=>STAGE_CONTENT[a.stageId].difficulty);
  assert.ok(difficulty[0]<=difficulty[1]);
  const fights=encounters(areas);
  assert.equal(fights.length,4);
  assert.deepEqual(fights.map(fight=>fight.boss),[false,true,false,true]);
  areas.forEach(a=>stages.add(a.stageId));
  for(const a of areas)if(a.stageId==='mako_reactor')variants.add(a.arena);
 }
 assert.deepEqual(stages,new Set(Object.keys(STAGE_CONTENT)));
 assert.deepEqual(variants,new Set(['reactor','reactor_05']));
});

test('music recommendations separate normal, boss and special roles',()=>{
 assert.equal(recommendMusic('FFVII','normal'),400842);
 assert.equal(recommendMusic('FFVII','boss',400993),400993);
 assert.equal(recommendMusic('FFVII','boss',4000711),400842);
 assert.equal(recommendMusic('FFVIII','normal'),400867);
 assert.equal(recommendMusic('FFVIII','boss'),400867);
 assert.equal(recommendMusic('FFVIII','boss',400868),400868);
 assert.equal(recommendMusic('FFVIII','event'),4001101);
 assert.equal(recommendMusic('FFVII','area'),null);
});
