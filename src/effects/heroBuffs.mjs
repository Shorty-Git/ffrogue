// Reviewed roguelike durations; original FFBE stat/cooldown formulas stay separate.
// Battle-scoped hero statuses: 'physical-boost' (multiplier) and 'auto-revive'
// (Reraise-style: a K.O. consumes it and the hero stands up with hpFraction of max HP).
const strength=status=>status.kind==='auto-revive'?status.hpFraction:status.multiplier;
export function applyHeroBuffs(current=[],effects,round) {
  if(!Number.isInteger(round)||round<1)throw Error('Explicit combat round required');
  const result=current.filter(b=>b.expiresAfterRound>=round).map(b=>({...b}));
  for(const effect of effects){
    if(!['physical-boost','auto-revive'].includes(effect.kind))throw Error('Unsupported hero status: '+effect.kind);
    const previous=result.find(b=>b.kind===effect.kind),expiresAfterRound=round+effect.turns;
    const key=effect.kind==='auto-revive'?'hpFraction':'multiplier';
    if(previous){previous[key]=Math.max(strength(previous),effect[key]);previous.expiresAfterRound=Math.max(previous.expiresAfterRound,expiresAfterRound);}
    else result.push({kind:effect.kind,[key]:effect[key],expiresAfterRound});
  }
  return result;
}
export function heroPhysicalMultiplier(current=[],round){
  return Math.max(1,...current.filter(b=>b.kind==='physical-boost'&&b.expiresAfterRound>=round).map(b=>b.multiplier));
}
/** A K.O. consumes an active auto-revive once; expired statuses never revive. */
export function consumeAutoRevive(current=[],round){
  const revive=current.find(b=>b.kind==='auto-revive'&&b.expiresAfterRound>=round);
  if(!revive)return null;
  return {hpFraction:revive.hpFraction,buffs:current.filter(b=>b!==revive).map(b=>({...b}))};
}
