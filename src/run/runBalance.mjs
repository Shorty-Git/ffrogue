import {encounters} from './runState.mjs';
import {stageForArea,ENEMY_CONTENT} from './stageContent.mjs';
export const RUN_BALANCE={normalHp:950,bossHp:2600,bossHpPerArea:1200,damage:140,damagePerEncounter:25};
export function runEncounter(run){const e=encounters(run.areas)[run.encounter];if(!e)throw Error('No current encounter');
 const stage=stageForArea(run.areas[e.area]);
 const hp=e.boss?RUN_BALANCE.bossHp+e.area*RUN_BALANCE.bossHpPerArea:Math.round(RUN_BALANCE.normalHp*stage.difficulty);
 const slots=e.boss?['center']:stage.formations[e.wave%stage.formations.length];
 return {arena:e.arena,title:stage.name,theme:stage.theme,stageId:stage.id,rewardCategory:stage.rewardCategory,boss:e.boss,enemies:slots.map((slot,i)=>{
   // Stable encounter selection needs no extra draw from persisted combat RNG.
   const key=e.boss?stage.bossId:stage.enemyPool[(e.wave+i)%stage.enemyPool.length],definition=ENEMY_CONTENT[key];
   if(!definition)throw Error('Unpublished enemy: '+key);
   return {slot,hp,key,nameTag:definition.name+(slots.length>1?' '+String.fromCharCode(65+i):''),isBoss:e.boss};}),
  damage:RUN_BALANCE.damage+run.encounter*RUN_BALANCE.damagePerEncounter};
}
