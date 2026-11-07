// Reviewed roguelike execution/fallback rules; source process formulas stay metadata.
export function resolveEnemyInstant(effect,target,random=Math.random){
  if(effect.kind!=='execute-or-damage'||!Number.isFinite(effect.chance)||effect.chance<0||effect.chance>1
    ||!Number.isInteger(effect.fallbackDamage)||effect.fallbackDamage<1||effect.fallbackDamage>99999
    ||typeof effect.bossImmune!=='boolean'||!Number.isFinite(target.currentHp))throw Error('Explicit bounded instant-enemy rule required');
  if(target.currentHp<=0)return {amount:0,executed:false,immune:false};
  const immune=effect.bossImmune&&target.isBoss===true;
  const executed=!immune&&effect.chance>0&&(effect.chance===1||random()<effect.chance);
  return {amount:executed?target.currentHp:effect.fallbackDamage,executed,immune};
}
