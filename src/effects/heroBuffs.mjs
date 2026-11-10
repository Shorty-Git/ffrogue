// Reviewed roguelike durations; original FFBE stat/cooldown formulas stay separate.
// Battle-scoped hero statuses: 'physical-boost' (multiplier), 'auto-revive' (Reraise-style: a K.O.
// consumes it and the hero stands up with hpFraction of max HP) and 'guard' (Protect/Shell: enemy
// damage of one type is reduced). Guards of different damage types stack side by side.
// Enemy debuffs live in the same list: 'break' (one stat lowered by `amount`) and 'blind' (basic
// attacks may miss). Esuna-type cleanses remove both (cleanseHeroDebuffs).
const strength=status=>status.kind==='auto-revive'?status.hpFraction:status.kind==='guard'?status.reduction:status.kind==='break'?status.amount:status.multiplier;
const strengthKey=kind=>kind==='auto-revive'?'hpFraction':kind==='guard'?'reduction':kind==='break'?'amount':'multiplier';
const sameStatus=(a,b)=>a.kind===b.kind&&(a.kind!=='guard'||a.damageType===b.damageType)&&(a.kind!=='break'||a.stat===b.stat);
const STATS=['attack','defense','magic','spirit'];
export const DEBUFF_KINDS=['break','blind'];
/** Blind: each basic-attack hit misses with this chance (BattleScene.blindMiss, simulator). */
export const BLIND_MISS_CHANCE=.5;
export function applyHeroBuffs(current=[],effects,round) {
  if(!Number.isInteger(round)||round<1)throw Error('Explicit combat round required');
  const result=current.filter(b=>b.expiresAfterRound>=round).map(b=>({...b}));
  for(const effect of effects){
    if(!['physical-boost','auto-revive','guard','break','blind'].includes(effect.kind))throw Error('Unsupported hero status: '+effect.kind);
    if(effect.kind==='guard'&&(!['physical','magical'].includes(effect.damageType)||!(effect.reduction>0&&effect.reduction<1)))throw Error('Invalid guard status');
    if(effect.kind==='break'&&(!STATS.includes(effect.stat)||!(effect.amount>0&&effect.amount<1)))throw Error('Invalid break status');
    if(!Number.isInteger(effect.turns)||effect.turns<1||effect.turns>9)throw Error('Invalid status duration');
    const previous=result.find(b=>sameStatus(b,effect)),expiresAfterRound=round+effect.turns;
    if(effect.kind==='blind'){
      if(previous)previous.expiresAfterRound=Math.max(previous.expiresAfterRound,expiresAfterRound);else result.push({kind:'blind',expiresAfterRound});
      continue;
    }
    const key=strengthKey(effect.kind);
    if(previous){previous[key]=Math.max(strength(previous),effect[key]);previous.expiresAfterRound=Math.max(previous.expiresAfterRound,expiresAfterRound);}
    else result.push({kind:effect.kind,...(effect.kind==='guard'?{damageType:effect.damageType}:{}),...(effect.kind==='break'?{stat:effect.stat}:{}),[key]:effect[key],expiresAfterRound});
  }
  return result;
}
const breakOf=(current,round,stat)=>Math.max(0,...current.filter(b=>b.kind==='break'&&b.stat===stat&&b.expiresAfterRound>=round).map(b=>b.amount));
/** Physical damage the hero deals: the strongest boost, lowered by an ATK break. */
export function heroPhysicalMultiplier(current=[],round){
  return Math.max(1,...current.filter(b=>b.kind==='physical-boost'&&b.expiresAfterRound>=round).map(b=>b.multiplier))*(1-breakOf(current,round,'attack'));
}
/** Magic (holy lane) damage the hero deals, lowered by a MAG break. */
export function heroMagicMultiplier(current=[],round){
  return 1-breakOf(current,round,'magic');
}
/** Share of enemy damage of one type that reaches the hero: guards lower it, DEF/SPR breaks raise it. */
export function heroDamageTakenMultiplier(current=[],round,damageType){
  const guard=Math.max(0,...current.filter(b=>b.kind==='guard'&&b.damageType===damageType&&b.expiresAfterRound>=round).map(b=>b.reduction));
  return (1-guard)*(1+breakOf(current,round,damageType==='physical'?'defense':'spirit'));
}
export function isHeroBlind(current=[],round){
  return current.some(b=>b.kind==='blind'&&b.expiresAfterRound>=round);
}
/** Esuna-type cleanse: removes every enemy debuff, keeps buffs. */
export function cleanseHeroDebuffs(current=[]){
  return current.filter(b=>!DEBUFF_KINDS.includes(b.kind)).map(b=>({...b}));
}
/** A K.O. consumes an active auto-revive once; expired statuses never revive. */
export function consumeAutoRevive(current=[],round){
  const revive=current.find(b=>b.kind==='auto-revive'&&b.expiresAfterRound>=round);
  if(!revive)return null;
  return {hpFraction:revive.hpFraction,buffs:current.filter(b=>b!==revive).map(b=>({...b}))};
}
