// Reviewed roguelike durations; original FFBE stat/cooldown formulas stay separate.
export function applyHeroBuffs(current=[],effects,round) {
  if(!Number.isInteger(round)||round<1)throw Error('Explicit combat round required');
  const result=current.filter(b=>b.expiresAfterRound>=round).map(b=>({...b}));
  for(const effect of effects){
    const previous=result.find(b=>b.kind===effect.kind),expiresAfterRound=round+effect.turns;
    if(previous){previous.multiplier=Math.max(previous.multiplier,effect.multiplier);previous.expiresAfterRound=Math.max(previous.expiresAfterRound,expiresAfterRound);}
    else result.push({kind:effect.kind,multiplier:effect.multiplier,expiresAfterRound});
  }
  return result;
}
export function heroPhysicalMultiplier(current=[],round){
  return Math.max(1,...current.filter(b=>b.kind==='physical-boost'&&b.expiresAfterRound>=round).map(b=>b.multiplier));
}
