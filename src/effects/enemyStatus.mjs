/** Roguelike status rules; original FFBE stat formulas are not reproduced here. */
export function applyEnemyStatuses(current = [], effects, random = Math.random) {
  const result=current.map(s=>({...s}));
  for(const effect of effects){
    if(effect.chance===0 || (effect.chance<1 && random()>=effect.chance))continue;
    const previous=result.find(s=>s.kind===effect.kind);
    if(previous){previous.phases=Math.max(previous.phases,effect.phases);
      if(effect.multiplier)previous.multiplier=(effect.kind==='attack-down'?Math.min:Math.max)(previous.multiplier??1,effect.multiplier);
    }else result.push({...effect});
  }
  return result;
}
export function statusDamageMultiplier(statuses = [], damageType){
  const kind=damageType==='holy'?'magic-weakness':damageType==='physical'?'physical-weakness':null;
  return Math.max(1,...statuses.filter(s=>s.kind===kind).map(s=>s.multiplier??1));
}
export function enemyAttackMultiplier(statuses = []){
  return Math.min(1,...statuses.filter(s=>s.kind==='attack-down').map(s=>s.multiplier??1));
}
export function isEnemyActionBlocked(statuses = [], actionType='physical'){
  return statuses.some(s=>s.kind==='stop'||s.kind==='silence'&&actionType==='magic');
}
export function ageEnemyStatuses(statuses = []){return statuses.map(s=>({...s,phases:s.phases-1})).filter(s=>s.phases>0);}
