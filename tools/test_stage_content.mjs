import {resolveRawPath} from './lib/raw-paths.mjs';
import {recommendMusic} from '../src/audio/musicProfiles.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {ENEMY_CONTENT,STAGE_CONTENT,stageForArea,enemyAction} from '../src/run/stageContent.mjs';
import {runEncounter} from '../src/run/runBalance.mjs';
import {createRun,validateRun,rollParty,confirmParty,variantAreas,PROTOTYPE_AREAS,FINAL_STAGES,courseAreas,routeOptions,chooseRoute,stageFamily,COURSE_LENGTH} from '../src/run/runState.mjs';
import {toFight,win} from './run_walk.mjs';
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
 const catalog=Object.fromEntries(['a','b','c','d'].map(key=>[key,{key,identity:key,canonicalIdentity:key,unitId:key,rarity:5,form:key,maxHp:100,maxMp:50,skills:[{id:key+'-skill'}]}]));
 // Fixed course (forest, reactor) without route choice: act 1 Whisperwood, act 2 Mako Reactor.
 const areas=['whisperwood','mako_reactor'].map(id=>PROTOTYPE_AREAS.find(a=>a.stageId===id));
 let r=confirmParty(rollParty(createRun('stage-restore',catalog,areas),catalog));r.routes=['whisperwood','mako_reactor'];
 r=toFight(r,catalog,['battle']);
 const before=JSON.stringify(r);assert.equal(runEncounter(r).enemies[0].key,'microchu');assert.equal(JSON.stringify(r),before);
 r=toFight(win(r,catalog),catalog,['boss']);assert.equal(runEncounter(r).enemies[0].key,'ochu');
 r=toFight(win(r,catalog),catalog,['battle']);assert.deepEqual(runEncounter(r).enemies.map(e=>e.key),['sweeper','sweeper']);
 const old=structuredClone(r);old.areas.forEach(a=>delete a.stageId);delete old.routes;validateRun(old,catalog);assert.equal(runEncounter(old).stageId,'mako_reactor');
 r=toFight(win(r,catalog),catalog,['boss']);assert.equal(runEncounter(r).enemies[0].key,'guard_scorpion');
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

// Run structure since 2026-11-10: two seeded areas (normal fight, then elite) and always the final
// Nibelheim area (normal fight, then the boss Sephiroth).
test('each seed picks three stages by difficulty, then the final boss room, with seeded reactor variants',()=>{
 const variants=new Set(),stages=new Set();
 for(let i=0;i<64;i++){
  const seed='arena-'+i;
  const areas=variantAreas(seed);
  assert.deepEqual(areas,variantAreas(seed));
  assert.equal(areas.length,COURSE_LENGTH+1);assert.equal(areas.at(-1).stageId,'nibelheim');assert.equal(areas.at(-1).final,true);
  const acts=areas.slice(0,-1);
  assert.equal(new Set(acts.map(a=>stageFamily(a.stageId))).size,COURSE_LENGTH);assert.ok(!acts.some(a=>a.stageId==='nibelheim'||a.final));
  const difficulty=acts.map(a=>STAGE_CONTENT[a.stageId].difficulty);
  assert.ok(difficulty.every((d,i)=>i===0||difficulty[i-1]<=d),'acts climb in difficulty');
  areas.forEach(a=>stages.add(a.stageId));
  for(const a of areas)if(a.stageId==='mako_reactor')variants.add(a.arena);
 }
 // Every stage appears: route stages by seed, Nibelheim as the default final room; other final rooms
 // (Vector) only when the player picks them (see the route/boss choice test below).
 // Whisperwood is retired from runs (2026-11-11); the reactor family never appears twice in one course.
 assert.deepEqual(stages,new Set(Object.keys(STAGE_CONTENT).filter(id=>id!=='whisperwood'&&(id==='nibelheim'||!FINAL_STAGES.includes(id)))));
 assert.deepEqual(variants,new Set(['reactor','reactor_05']));
});

test('music recommendations separate normal, boss and special roles',()=>{
 assert.equal(recommendMusic('FFVII','normal'),400842);
 assert.equal(recommendMusic('FFVII','boss',400993),400993);
 assert.equal(recommendMusic('FFVII','boss',4000711),4000711); // Air Buster (reactor_05) uses it as its boss theme since 2026-11-10
 assert.equal(recommendMusic('FFVIII','normal'),400867);
 assert.equal(recommendMusic('FFVIII','boss'),400867);
 assert.equal(recommendMusic('FFVIII','boss',400868),400868);
 assert.equal(recommendMusic('FFVIII','event'),4001101);
 assert.equal(recommendMusic('FFVII','area'),null);
});

test('the player picks the final boss room and, before each act, one of two routes',()=>{
 assert.deepEqual(FINAL_STAGES,['nibelheim','vector','big_bridge','castle_exdeath','deling_city','chaos_shrine']);
 const kefka=courseAreas('pick-1','vector');assert.equal(kefka.at(-1).stageId,'vector');assert.equal(kefka.at(-1).final,true);
 assert.ok(kefka.slice(0,-1).every(a=>!FINAL_STAGES.includes(a.stageId)));assert.throws(()=>courseAreas('x','besaid'),/final boss room/);
 const catalog=JSON.parse(JSON.stringify({}));
 let run={phase:'map',seed:'pick-1',encounter:0,areas:kefka,map:{act:0,at:null,trail:[]}};
 const first=routeOptions(run);assert.equal(first.area,0);assert.equal(first.options.length,2);
 assert.deepEqual(routeOptions(run),first,'same options for the same save');
 assert.ok(first.options.every(o=>!FINAL_STAGES.includes(o.stageId)));
 run=chooseRoute(run,first.options[1].stageId);assert.equal(run.areas[0].stageId,first.options[1].stageId);assert.equal(routeOptions(run),null);
 assert.throws(()=>chooseRoute({...run,routes:[]},'vector'),/route option/);
 assert.equal(routeOptions({...run,map:{act:0,at:'a0r0c0',trail:['a0r0c0']}}),null,'only at the start of an act');
 run.map={act:1,at:null,trail:[]};
 const second=routeOptions(run);assert.equal(second.area,1);assert.ok(second.options.every(o=>stageFamily(o.stageId)!==stageFamily(run.routes[0])),'a chosen stage (or its family) is not offered again');
 for(let i=0;i<40;i++){const r={phase:'map',seed:'fam-'+i,encounter:0,areas:courseAreas('fam-'+i),map:{act:0,at:null,trail:[]}};const o=routeOptions(r).options.map(a=>stageFamily(a.stageId));assert.equal(new Set(o).size,o.length);assert.ok(!o.includes('whisperwood'));}
 run=chooseRoute(run,second.options[0].stageId);
 run.map={act:2,at:null,trail:[]};const third=routeOptions(run);assert.equal(third.area,2);run=chooseRoute(run,third.options[0].stageId);
 run.map={act:3,at:null,trail:[]};assert.equal(routeOptions(run),null,'the final room is fixed');
 void catalog;
});
