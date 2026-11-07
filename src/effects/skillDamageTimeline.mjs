/** Reviewed gameplay events, separate from source metadata and decorative lifetime. */
export function skillDamageType(skill) {
  if(skill.damageType!==undefined&&!['physical','holy'].includes(skill.damageType))throw Error('Unsupported reviewed damage lane');
  return skill.damageType ?? (skill.motion==='magic_atk'?'holy':'physical');
}
export function validateDamageEvents(skill, durationFrames = Infinity) {
  skillDamageType(skill);
  if (skill.damageEvents === undefined) {
    if (skill.requiresSourceScene && skill.supportEvents===undefined && skill.allyEvents===undefined) throw Error('Source-only action requires reviewed gameplay events');
    return null;
  }
  const events = skill.damageEvents;
  if (!skill.requiresSourceScene || !skill.scenePresentation || !Array.isArray(events)
    || !events.length || events.length > 100 || !['single_enemy','all_enemies'].includes(skill.scope))
    throw Error('Explicit source-backed enemy damage timeline required');
  let previous = -1, total = 0;
  for (const event of events) {
    if (!Number.isInteger(event.frame) || event.frame < previous || event.frame < 0 || event.frame >= durationFrames
      || !Number.isFinite(event.weight) || event.weight <= 0 || event.weight > 1)
      throw Error('Invalid ordered damage event');
    previous = event.frame; total += event.weight;
  }
  if (Math.abs(total - 1) > 1e-9) throw Error('Damage weights must sum to one action total');
  return events;
}

export function reviewedSkillEvents(skill,durationFrames=Infinity){
  if((skill.hpCost!==undefined||skill.allyTargeting!==undefined)&&!skill.allyEvents)throw Error('Friendly cost/target fields require a friendly track');
  const damage=validateDamageEvents(skill,durationFrames);
  if(skill.allyEvents!==undefined){
    const events=skill.allyEvents;
    if(damage||skill.supportEvents||!skill.requiresSourceScene||!skill.scenePresentation||!['self','party'].includes(skill.scope)||skill.moveType!=='stationary'
      ||!Array.isArray(events)||!events.length||events.length>32)throw Error('Reviewed stationary friendly-event track required');
    if(skill.scope==='party'&&!['living-allies','other-living-allies'].includes(skill.allyTargeting))throw Error('Explicit friendly target contract required');
    if(skill.scope==='self'&&skill.allyTargeting!==undefined)throw Error('Party recipient filters cannot be attached to self actions');
    if(skill.hpCost!==undefined&&(!Number.isInteger(skill.hpCost)||skill.hpCost<1||skill.hpCost>99999))throw Error('Invalid nonlethal HP cost');
    let previous=-1;
    for(const event of events){
      if(!Number.isInteger(event.frame)||event.frame<0||event.frame<previous||event.frame>=durationFrames
        ||!Array.isArray(event.effects)||!event.effects.length||event.effects.length>3)throw Error('Invalid friendly event');
      previous=event.frame;
      for(const e of event.effects){
        if(e.kind==='heal'){
          if(!Number.isInteger(e.amount)||e.amount<1||e.amount>99999)throw Error('Invalid reviewed healing amount');
        }else if(e.kind==='limit-fill'){
          if(!Number.isInteger(e.amount)||e.amount<1||e.amount>100)throw Error('Invalid reviewed Limit fill');
        }else if(e.kind==='auto-revive'){
          if(!Number.isFinite(e.hpFraction)||e.hpFraction<=0||e.hpFraction>1
            ||!Number.isInteger(e.turns)||e.turns<1||e.turns>9)throw Error('Invalid reviewed auto-revive');
        }else if(e.kind!=='physical-boost'||!Number.isFinite(e.multiplier)||e.multiplier<=1||e.multiplier>3
          ||!Number.isInteger(e.turns)||e.turns<1||e.turns>9)throw Error('Unsupported friendly status');
      }
    }
    return events.map(e=>({frame:e.frame,allyEffects:e.effects}));
  }
  if(skill.supportEvents===undefined)return damage;
  const events=skill.supportEvents;
  if(damage && skill.hitCount!==damage.length)throw Error('Mixed enemy track requires an explicit matching hit count');
  if(!skill.requiresSourceScene || !skill.scenePresentation || !['single_enemy','all_enemies'].includes(skill.scope)
    ||!Array.isArray(events)||!events.length||events.length>32)throw Error('Explicit Source enemy support track required');
  let previous=-1;
  for(const event of events){
    if(!Number.isInteger(event.frame)||event.frame<0||event.frame<previous||event.frame>=durationFrames
      ||!Array.isArray(event.effects)||!event.effects.length||event.effects.length>3)throw Error('Invalid support event');
    previous=event.frame;
    for(const effect of event.effects){
      if(effect.kind==='execute-or-damage'){
        if(damage||event.effects.length!==1||!Number.isFinite(effect.chance)||effect.chance<0||effect.chance>1
          ||!Number.isInteger(effect.fallbackDamage)||effect.fallbackDamage<1||effect.fallbackDamage>99999
          ||typeof effect.bossImmune!=='boolean'||effect.phases!==undefined||effect.multiplier!==undefined)
          throw Error('Explicit bounded instant-enemy event required');
        continue;
      }
      const vulnerability=['magic-weakness','physical-weakness'].includes(effect.kind);
      if(!['magic-weakness','physical-weakness','attack-down','silence','stop'].includes(effect.kind)||!Number.isInteger(effect.phases)||effect.phases<1||effect.phases>9
        ||!Number.isFinite(effect.chance)||effect.chance<0||effect.chance>1
        ||(vulnerability ? !Number.isFinite(effect.multiplier)||effect.multiplier<=1||effect.multiplier>3
          : effect.kind==='attack-down' ? !Number.isFinite(effect.multiplier)||effect.multiplier<=0||effect.multiplier>=1 : effect.multiplier!==undefined))
        throw Error('Unsupported reviewed enemy status');
    }
  }
  // Stable order: all damage events precede support at an equal frame. A dead
  // locked target cannot receive a later status or transfer it to another enemy.
  return damage ? [...damage,...events].sort((a,b)=>a.frame-b.frame) : events;
}
