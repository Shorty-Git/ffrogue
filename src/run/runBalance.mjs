import {currentFight,FINAL_STAGES,seedHash,stageFamily} from './runState.mjs';
import {stageForArea,STAGE_CONTENT,ENEMY_CONTENT} from './stageContent.mjs';
import {actScaling,eliteAffix,bossRule} from './encounterRules.mjs';
/** Base numbers before act and depth scaling (src/run/encounterRules.mjs); first guesses for the balancing pass.
 * Elites are single foes with eliteHp x the stage's normal HP; bosses start at bossHp. */
export const RUN_BALANCE={normalHp:2000,eliteHp:2.2,bossHp:5000,damage:390};
/** Elite foe of a node (loop v2): the boss of a route stage this run does not visit, seeded per node, so
 * elites differ from the act boss; the act's own boss stands in when no other stage is left. */
export function eliteEnemyKey(run,node,stage){
 const visited=new Set(run.areas.map(a=>stageFamily(a.stageId??'')));
 const pool=Object.values(STAGE_CONTENT).filter(s=>!FINAL_STAGES.includes(s.id)&&s.id!=='whisperwood'&&!visited.has(stageFamily(s.id))&&ENEMY_CONTENT[s.bossId])
  .map(s=>s.bossId).sort();
 return pool.length?pool[seedHash(`${run.seed}:elite:${node}`)%pool.length]:stage.bossId;
}
export function runEncounter(run){const e=currentFight(run);if(!e)throw Error('No current encounter');
 const stage=stageForArea(run.areas[e.area]),scale=actScaling(e.area,e.wave);
 const affix=e.kind==='elite'?eliteAffix(run.seed,e.node):null,rule=e.kind==='boss'?bossRule(run.seed,e.area):null;
 const base=e.kind==='boss'?RUN_BALANCE.bossHp:RUN_BALANCE.normalHp*stage.difficulty*(e.kind==='elite'?RUN_BALANCE.eliteHp:1);
 const hp=Math.round(base*scale.hp*(affix?.hp??1));
 const slots=e.boss?['center']:stage.formations[e.wave%stage.formations.length];
 const eliteKey=e.kind==='elite'?eliteEnemyKey(run,e.node,stage):null;
 return {arena:e.arena,title:stage.name,theme:stage.theme,stageId:stage.id,rewardCategory:stage.rewardCategory,boss:e.boss,kind:e.kind,
  ...(affix?{affix}:{}),...(rule?{rule}:{}),enemies:slots.map((slot,i)=>{
   // Stable encounter selection needs no extra draw from persisted combat RNG.
   const key=eliteKey??(e.boss?stage.bossId:stage.enemyPool[(e.wave+i)%stage.enemyPool.length]),definition=ENEMY_CONTENT[key];
   if(!definition)throw Error('Unpublished enemy: '+key);
   return {slot,hp,key,nameTag:definition.name+(slots.length>1?' '+String.fromCharCode(65+i):''),isBoss:e.boss};}),
  damage:Math.round(RUN_BALANCE.damage*scale.damage*(affix?.damage??1))};
}
