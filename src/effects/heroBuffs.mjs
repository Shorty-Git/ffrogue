// Reviewed roguelike durations; original FFBE stat/cooldown formulas stay separate.
// Battle-scoped hero statuses: 'physical-boost' (multiplier), 'auto-revive' (Reraise-style: a K.O.
// consumes it and the hero stands up with hpFraction of max HP) and 'guard' (Protect/Shell: enemy
// damage of one type is reduced). Guards of different damage types stack side by side.
const strength=status=>status.kind==='auto-revive'?status.hpFraction:status.kind==='guard'?status.reduction:status.multiplier;
const strengthKey=kind=>kind==='auto-revive'?'hpFraction':kind==='guard'?'reduction':'multiplier';
const sameStatus=(a,b)=>a.kind===b.kind&&(a.kind!=='guard'||a.damageType===b.damageType);
export function applyHeroBuffs(current=[],effects,round) {
  if(!Number.isInteger(round)||round<1)throw Error('Explicit combat round required');
  const result=current.filter(b=>b.expiresAfterRound>=round).map(b=>({...b}));
  for(const effect of effects){
    if(!['physical-boost','auto-revive','guard'].includes(effect.kind))throw Error('Unsupported hero status: '+effect.kind);
    if(effect.kind==='guard'&&(!['physical','magical'].includes(effect.damageType)||!(effect.reduction>0&&effect.reduction<1)))throw Error('Invalid guard status');
    const previous=result.find(b=>sameStatus(b,effect)),expiresAfterRound=round+effect.turns,key=strengthKey(effect.kind);
    if(previous){previous[key]=Math.max(strength(previous),effect[key]);previous.expiresAfterRound=Math.max(previous.expiresAfterRound,expiresAfterRound);}
    else result.push({kind:effect.kind,...(effect.kind==='guard'?{damageType:effect.damageType}:{}),[key]:effect[key],expiresAfterRound});
  }
  return result;
}
export function heroPhysicalMultiplier(current=[],round){
  return Math.max(1,...current.filter(b=>b.kind==='physical-boost'&&b.expiresAfterRound>=round).map(b=>b.multiplier));
}
/** Share of enemy damage of one type that still reaches the hero (1 without an active guard). */
export function heroDamageTakenMultiplier(current=[],round,damageType){
  return 1-Math.max(0,...current.filter(b=>b.kind==='guard'&&b.damageType===damageType&&b.expiresAfterRound>=round).map(b=>b.reduction));
}
/** A K.O. consumes an active auto-revive once; expired statuses never revive. */
export function consumeAutoRevive(current=[],round){
  const revive=current.find(b=>b.kind==='auto-revive'&&b.expiresAfterRound>=round);
  if(!revive)return null;
  return {hpFraction:revive.hpFraction,buffs:current.filter(b=>b!==revive).map(b=>({...b}))};
}
