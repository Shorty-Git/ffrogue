// Offline Monte-Carlo balance report for the roguelike run (no Phaser, no raw FFBE data).
// Reuses the game's own rule modules (run state, encounters, enemy patterns, statuses,
// buffs, Limit gauge, skill scaling) and re-implements only BattleScene's damage formulas
// in a few lines (marked below). It plays every run with a simple greedy policy, so the
// numbers describe pacing trends, not how a skilled player fares.
//
// Usage: node tools/simulate_run_balance.mjs [--runs 400] [--seed-prefix sim] [--json out.json] [--roster all|starters] [--ablate a,b]
// --ablate switches mechanics off to measure their weight: elements, guard, boost, break, blind, cleanse, debuff, lb, heal, raise, weapons.
// --roster starters draws only a fresh profile's starter heroes (src/run/profile.mjs), as a new player does.
import fs from 'node:fs';
import {runCatalog} from '../src/run/catalog.ts';
import {createRun,rollParty,confirmParty,completeBattle,chooseReward,acknowledgeAwakening,encounters,skillForRun,memberMaxMp,nextRandom} from '../src/run/runState.mjs';
import {runEncounter} from '../src/run/runBalance.mjs';
import {ENEMY_CONTENT,enemyAction} from '../src/run/stageContent.mjs';
import * as limit from '../src/run/limitGauge.mjs';
import {applyEnemyStatuses,statusDamageMultiplier,enemyAttackMultiplier,isEnemyActionBlocked,ageEnemyStatuses} from '../src/effects/enemyStatus.mjs';
import {applyHeroBuffs,heroPhysicalMultiplier,heroMagicMultiplier,heroDamageTakenMultiplier,cleanseHeroDebuffs,isHeroBlind,BLIND_MISS_CHANCE} from '../src/effects/heroBuffs.mjs';
import {drawCatalog,newProfile} from '../src/run/profile.mjs';
import {resolveEnemyInstant} from '../src/effects/enemyInstant.mjs';
import {skillDamageType} from '../src/effects/skillDamageTimeline.mjs';
import {enemyTargetIndex} from '../src/run/enemyTargeting.mjs';
import {enemyElementMultiplier,heroElementMultiplier,actionElements} from '../src/run/elementRules.mjs';
import {setWeaponData,memberPower} from '../src/run/weapons.mjs';

const args=process.argv.slice(2),flag=(name,fallback)=>{const i=args.indexOf('--'+name);return i<0?fallback:args[i+1];};
const RUNS=Number(flag('runs',400)),PREFIX=flag('seed-prefix','sim'),JSON_OUT=flag('json',null),ROSTER=flag('roster','all');
const ABLATE=new Set(String(flag('ablate','')).split(',').filter(Boolean)),on=m=>!ABLATE.has(m);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));

function loadCatalog(){
 const registry=read('public/assets/content.json'),content=read('public/assets/run-content.json');
 const values={content_registry:registry,run_content:content},manifests={};
 for(const key of registry.characters){
  values['character_'+key]=read(`public/assets/units/${key}/character.json`);
  values['skills_'+key]=read(`public/assets/units/${key}/skills.json`);
  manifests[key]=read(`public/assets/units/${key}/manifest.json`);
 }
 for(const key of registry.scenePresentations)values['scene_'+key+'_manifest']=read(`public/assets/presentations/${key}/manifest.json`);
 for(const f of content.forms)manifests[f.key]=read(`public/${f.assetPath}/manifest.json`);
 return runCatalog({cache:{json:{get:k=>values[k]}}},manifests);
}
const catalog=loadCatalog(),rules=read('public/assets/run-rules.json');
if(on('weapons'))setWeaponData(read('public/assets/items/weapons.json'));

// --- BattleScene formulas (src/scenes/BattleScene.ts: skillBaseDamage, applyHeroMeleeDamage, enemy turn) ---
const between=(run,min,max)=>min+Math.floor(nextRandom(run,'combat')*(max-min+1));
function attackDamage(run,hero,round){
 // BattleScene.blindMiss: a blind hero's basic hit misses with BLIND_MISS_CHANCE.
 if(isHeroBlind(hero.buffs,round)&&nextRandom(run,'combat')<BLIND_MISS_CHANCE)return 0;
 let dmg=between(run,300,380)*memberPower(hero.member,'attack');
 dmg=Math.round(dmg*heroPhysicalMultiplier(hero.buffs,round));
 if(nextRandom(run,'combat')<.15)dmg=Math.round(dmg*1.5);
 return dmg;
}
const skillBase=(run,hero,skill,round)=>between(run,300,380)*(skillDamageType(skill)==='holy'?heroMagicMultiplier(hero.buffs,round):heroPhysicalMultiplier(hero.buffs,round));
// TargetDummy.applyDamage: statuses and the enemy's original element resistances (src/run/elementRules.mjs).
const hit=(enemy,amount,type,elements=[])=>{const d=Math.round(amount*statusDamageMultiplier(enemy.statuses,type)*(on('elements')?enemyElementMultiplier(enemy.key,elements):1));enemy.hp=Math.max(0,enemy.hp-d);return d;};
const heroElements=(hero,s)=>actionElements(s,hero.member);
// ---------------------------------------------------------------------------------------

const expected=(hero,skill,target)=>skill.damageMultiplier*340*(skill.basicRepeat?(skill.basicRepeat.minHits+skill.basicRepeat.maxHits)/2:1)*(target&&on('elements')?enemyElementMultiplier(target.key,heroElements(hero,skill)):1);
const has=(s,kind)=>s.allyEvents?.some(e=>e.effects.some(f=>f.kind===kind));
const isHeal=s=>has(s,'heal');
const isBuff=s=>has(s,'physical-boost');
const guardTypes=s=>(s.allyEvents??[]).flatMap(e=>e.effects.filter(f=>f.kind==='guard').map(f=>f.damageType));
const isDebuff=s=>s.supportEvents?.some(e=>e.effects.some(f=>!['execute-or-damage'].includes(f.kind)));
const guarded=(h,type,round)=>h.buffs.some(b=>b.kind==='guard'&&b.damageType===type&&b.expiresAfterRound>=round);

function chooseAction(state,hero){
 const {enemies,heroes,round}=state,living=enemies.filter(e=>e.hp>0),target=living.find(e=>e.boss)??living.slice().sort((a,b)=>a.hp-b.hp)[0];
 const lb=catalog[hero.key].limitBurst;
 if(on('lb')&&lb&&limit.isFull(hero.limit))return {skill:lb,target};
 const usable=hero.skills.filter(s=>hero.mp>=s.mpCost&&(!s.hpCost||hero.hp>s.hpCost));
 const fallen=heroes.filter(h=>h.hp<=0);
 const raise=on('raise')&&usable.find(s=>has(s,'raise'));if(raise&&fallen.length)return {skill:raise};
 const hurt=heroes.filter(h=>h.hp>0&&h.hp<h.maxHp*.45);
 const heal=on('heal')&&usable.find(isHeal);if(heal&&hurt.length)return {skill:heal};
 const totalHp=living.reduce((a,e)=>a+e.hp,0);
 const cleanse=on('cleanse')&&usable.find(s=>has(s,'cleanse'));
 if(cleanse&&heroes.filter(h=>h.hp>0&&h.buffs.some(b=>(b.kind==='break'||b.kind==='blind')&&b.expiresAfterRound>round)).length>=(cleanse.scope==='self'?1:2))return {skill:cleanse};
 // Protect/Shell early in a long fight, when no ally already holds that guard.
 const guard=on('guard')&&usable.find(s=>{const types=guardTypes(s);return types.length&&types.some(t=>!heroes.some(h=>h.hp>0&&guarded(h,t,round+1)));});
 if(guard&&totalHp>3000)return {skill:guard};
 const buff=on('boost')&&usable.find(isBuff);
 if(buff&&totalHp>2500&&heroPhysicalMultiplier(hero.buffs,round)<=1)return {skill:buff};
 const debuff=on('debuff')&&usable.find(s=>isDebuff(s)&&!s.damageEvents);
 if(debuff&&target.boss&&!target.statuses.length)return {skill:debuff,target};
 const attack=340*memberPower(hero.member,'attack')*heroPhysicalMultiplier(hero.buffs,round)*1.075*(on('elements')?enemyElementMultiplier(target.key,heroElements(hero)):1);
 let best={skill:null,target,value:attack};
 if(attack<target.hp){
  for(const s of usable){
   if(!s.damageEvents&&!s.basicRepeat&&!s.supportEvents?.some(e=>e.effects.some(f=>f.kind==='execute-or-damage')))continue;
   const value=s.scope==='all_enemies'?(s.damageEvents?living.reduce((sum,e)=>sum+expected(hero,s,e),0):700*living.length):expected(hero,s,target);
   if(value>best.value)best={skill:s,target,value};
  }
 }
 return best;
}

function resolveHeroAction(run,state,hero,action){
 const {enemies,heroes,round}=state,living=enemies.filter(e=>e.hp>0);
 const s=action.skill;
 if(!s){hit(action.target,attackDamage(run,hero,round),'physical',heroElements(hero));hero.limit=limit.gainFromAction(hero.limit);state.stats.attacks++;return;}
 if(s.type==='LIMIT'){hero.limit=0;state.stats.limitBursts++;}
 else{hero.mp-=s.mpCost;if(s.hpCost)hero.hp-=s.hpCost;state.stats.skills++;}
 if(s.allyEvents){
  const raising=s.allyTargeting==='fallen-ally'||s.allyTargeting==='fallen-allies';
  const targets=raising?heroes.filter(h=>h.hp<=0).slice(0,s.allyTargeting==='fallen-ally'?1:3):s.scope==='self'?[hero]:heroes.filter(h=>h.hp>0);
  for(const e of s.allyEvents)for(const f of e.effects)for(const t of targets){
   if(f.kind==='heal'){if(t.hp>0)t.hp=Math.min(t.maxHp,t.hp+f.amount);}
   else if(f.kind==='raise'){if(t.hp<=0){t.hp=Math.max(1,Math.round(t.maxHp*f.hpFraction));t.buffs=[];t.limit=0;}}
   else if(f.kind==='cleanse')t.buffs=cleanseHeroDebuffs(t.buffs);
   else if(f.kind==='limit-fill')t.limit=limit.gainFromSupport(t.limit,f.amount);
   else if((f.kind!=='guard'||on('guard'))&&(f.kind!=='physical-boost'||on('boost')))t.buffs=applyHeroBuffs(t.buffs,[f],round);
  }
 }
 const targets=s.scope==='all_enemies'?living:s.scope==='single_enemy'?[action.target]:[];
 // Barrage-type repeats (BattleScene.executeBasicRepeat): N basic attacks, random living target each.
 if(s.basicRepeat){const r=s.basicRepeat,count=r.minHits+Math.floor(nextRandom(run,'combat')*(r.maxHits-r.minHits+1));
  for(let k=0;k<count;k++){const pool=enemies.filter(e=>e.hp>0);if(!pool.length)break;const base=skillBase(run,hero,s,round);
   for(const t of r.targeting==='all'?pool:[r.targeting==='random'?pool[Math.floor(nextRandom(run,'combat')*pool.length)]:(action.target.hp>0?action.target:pool[0])])hit(t,base*s.damageMultiplier,'physical',heroElements(hero,s));}}
 if(s.damageEvents){const base=skillBase(run,hero,s,round);for(const e of s.damageEvents)for(const t of targets)if(t.hp>0)hit(t,base*s.damageMultiplier*e.weight,skillDamageType(s),heroElements(hero,s));}
 for(const e of s.supportEvents??[])for(const t of targets){
  if(t.hp<=0)continue;
  for(const f of e.effects)if(f.kind==='execute-or-damage'){const o=resolveEnemyInstant(f,{currentHp:t.hp,isBoss:t.boss},()=>nextRandom(run,'combat'));t.hp=Math.max(0,t.hp-o.amount);}
  const statuses=e.effects.filter(f=>f.kind!=='execute-or-damage');
  if(statuses.length&&t.hp>0)t.statuses=applyEnemyStatuses(t.statuses,statuses,()=>nextRandom(run,'combat'));
 }
 if(s.type!=='LIMIT')hero.limit=limit.gainFromAction(hero.limit);
}

function fight(run){
 const profile=runEncounter(run);
 const heroes=run.party.map((m,i)=>{const c=catalog[m.key];const maxHp=Math.round(c.maxHp*m.stats.hp);
  return {key:m.key,member:m,maxHp,hp:m.hp,mp:m.mp,maxMp:memberMaxMp(c,m),buffs:[],limit:m.limit??0,
   skills:c.skills.filter(s=>m.skills.some(a=>a.id===s.id)).map(s=>skillForRun(s,m))};});
 const enemies=profile.enemies.map(e=>({...e,maxHp:e.hp,statuses:[],cursor:0,boss:e.isBoss}));
 const state={heroes,enemies,round:1,stats:{attacks:0,skills:0,limitBursts:0}};
 const startHp=heroes.reduce((a,h)=>a+h.hp,0);
 while(state.round<60){
  for(const hero of heroes){if(hero.hp<=0||enemies.every(e=>e.hp<=0))continue;resolveHeroAction(run,state,hero,chooseAction(state,hero));}
  if(enemies.every(e=>e.hp<=0))break;
  for(const enemy of enemies.filter(e=>e.hp>0)){
   const alive=heroes.filter(h=>h.hp>0);if(!alive.length)break;
   const blocked=isEnemyActionBlocked(enemy.statuses,'physical'),mult=enemyAttackMultiplier(enemy.statuses);
   enemy.statuses=ageEnemyStatuses(enemy.statuses);if(blocked)continue;
   const def=ENEMY_CONTENT[enemy.key],action=enemyAction(def,enemy.cursor,enemy.hp/enemy.maxHp);enemy.cursor++;
   if(action.kind==='prepare')continue;
   const pick=heroes[enemyTargetIndex(heroes.map(h=>({alive:h.hp>0,hp:h.hp,maxHp:h.maxHp})),()=>nextRandom(run,'combat'))];
   for(const t of action.scope==='party'?alive:[pick]){
    const dmg=Math.round(profile.damage*action.multiplier*mult/(t.member.stats.defense??1)*heroDamageTakenMultiplier(t.buffs,state.round,action.damageType??'physical')*(on('elements')?heroElementMultiplier(t.key,action.elements,run.wards,t.member.weapon):1));
    t.hp=Math.max(0,t.hp-dmg);if(t.hp>0)t.limit=limit.gainFromDamage(t.limit,dmg,t.maxHp);
    if(t.hp>0&&action.heroEffects){const applied=action.heroEffects.filter(e=>nextRandom(run,'combat')<(e.chance??1)&&on(e.kind)).map(({chance:_c,...e})=>e);if(applied.length)t.buffs=applyHeroBuffs(t.buffs,applied,state.round);}
   }
  }
  if(heroes.every(h=>h.hp<=0))break;
  state.round++;
 }
 const won=enemies.every(e=>e.hp<=0);
 return {won,rounds:state.round,boss:profile.boss,enemyHp:enemies.reduce((a,e)=>a+e.maxHp,0),
  hpLost:startHp-heroes.reduce((a,h)=>a+h.hp,0),kos:heroes.filter(h=>h.hp<=0).length,...state.stats,
  snapshot:heroes.map(h=>({key:h.key,hp:h.hp,mp:h.mp,limit:h.limit})),
  hpLeft:heroes.reduce((a,h)=>a+h.hp,0)/heroes.reduce((a,h)=>a+h.maxHp,0),mpLeft:heroes.reduce((a,h)=>a+h.mp,0)/heroes.reduce((a,h)=>a+h.maxMp,0)};
}

function chooseOffer(run){
 const score=r=>{const m=run.party.find(m=>m.key===r.member);
  if(r.type==='evolve')return 100;
  if(r.type==='rest')return run.party.reduce((a,m)=>a+m.hp/(catalog[m.key].maxHp*m.stats.hp),0)/3<.55?90:5;
  if(r.type==='learn')return m.skills.length<3?60:20;
  if(r.type==='skill')return 40;
  if(r.type==='ward')return 30;
  if(r.type==='weapon')return m.weapon?(r.weapon.attack>m.weapon.attack?28:4):32;
  return r.stat==='attack'?35:r.stat==='hp'?25:15;};
 let best=0;run.offers.forEach((r,i)=>{if(score(r)>score(run.offers[best]))best=i;});
 const r=run.offers[best],m=run.party.find(m=>m.key===r.member);
 const replace=r.type==='learn'&&m.skills.length===3?m.skills.slice().sort((a,b)=>a.level-b.level)[0].id:undefined;
 return chooseReward(run,best,catalog,replace);
}

const total=encounters(createRun('x',catalog).areas).length;
const perEncounter=Array.from({length:total},()=>({fights:0,won:0,rounds:0,hpLost:0,hpLeft:0,mpLeft:0,kos:0,limitBursts:0,enemyHp:0}));
let wins=0,limitUses=0;const runLengths=[],byLevel={};
const drawPool=ROSTER==='starters'?drawCatalog(newProfile(catalog),catalog):catalog;
for(let i=0;i<RUNS;i++){
 let run=confirmParty(rollParty(createRun(`${PREFIX}-${i}`,catalog,undefined,rules),drawPool));
 const levelSum=run.party.reduce((sum,m)=>sum+m.level,0);let lastHp=0;
 while(run.phase==='battle'){
  const index=run.encounter,result=fight(run),row=perEncounter[index];
  row.fights++;row.won+=result.won;row.rounds+=result.rounds;row.hpLost+=result.hpLost;row.hpLeft+=result.hpLeft;row.mpLeft+=result.mpLeft;row.kos+=result.kos;row.limitBursts+=result.limitBursts;row.enemyHp+=result.enemyHp;
  limitUses+=result.limitBursts;lastHp=result.hpLeft;
  run=completeBattle(run,catalog,result.snapshot,result.won);
  if(run.phase!=='rewards')break;
  run=chooseOffer(run);if(run.pendingAwakening)run=acknowledgeAwakening(run,run.pendingAwakening.id);
 }
 if(run.phase==='won')wins++;runLengths.push(run.encounter);
 const bucket=byLevel[levelSum]??={runs:0,wins:0,finalHp:0};bucket.runs++;if(run.phase==='won'){bucket.wins++;bucket.finalHp+=lastHp;}
}
const f=(n,d=1)=>Number.isFinite(n)?n.toFixed(d):'-';
const rows=perEncounter.map((r,i)=>({encounter:i+1,fights:r.fights,winRate:r.won/r.fights,avgRounds:r.rounds/r.fights,avgEnemyHp:r.enemyHp/r.fights,avgHpLost:r.hpLost/r.fights,partyHpLeft:r.hpLeft/r.fights,partyMpLeft:r.mpLeft/r.fights,kosPerFight:r.kos/r.fights,limitBurstsPerFight:r.limitBursts/r.fights}));
console.log(`${ABLATE.size?'Ablated: '+[...ABLATE].join(',')+'  ':''}Runs: ${RUNS}  run win rate: ${f(100*wins/RUNS)}%  Limit Bursts per run: ${f(limitUses/RUNS,2)}`);
console.log('enc  fights  win%  rounds  enemyHP  hpLost  partyHP%  partyMP%  KO/fight  LB/fight');
for(const r of rows)console.log([r.encounter,r.fights,f(100*r.winRate),f(r.avgRounds,2),f(r.avgEnemyHp,0),f(r.avgHpLost,0),f(100*r.partyHpLeft),f(100*r.partyMpLeft),f(r.kosPerFight,2),f(r.limitBurstsPerFight,2)].map(v=>String(v).padStart(7)).join(' '));
console.log('team start level (sum of 3)  runs  win%  party HP% after final fight');
for(const [sum,b] of Object.entries(byLevel).sort((a,b)=>a[0]-b[0]))console.log(String(sum).padStart(10),String(b.runs).padStart(13),f(100*b.wins/b.runs).padStart(6),f(b.wins?100*b.finalHp/b.wins:NaN).padStart(9));
if(JSON_OUT)fs.writeFileSync(JSON_OUT,JSON.stringify({runs:RUNS,winRate:wins/RUNS,limitBurstsPerRun:limitUses/RUNS,encounters:rows},null,1));
