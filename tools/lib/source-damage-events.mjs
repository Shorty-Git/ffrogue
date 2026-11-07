/** Source timing for reviewed Motion-1 and zero-prefix Motion-2 profiles; no damage formula import. */
export function sourceDamageEvents(source, plan, unit = plan.composition?.unit) {
  // Limit Bursts have no unit attack prefix: their hits are limitburst.attackFrames at offset 0.
  if(source?.kind==='LIMIT')return sourceHitDistribution(source,plan,0);
  const composition=plan.composition,offset=composition?.skillFrameOffset;
  const motion=source?.raw?.motionType;
  if(![1,2].includes(motion) || !Number.isSafeInteger(offset) || offset<0
    || composition?.skill?.abilityId!==source.id || composition.skill.motionType!==motion
    || composition.skill.effectFrames!==source.raw.effectFrames)
    throw Error('Matching supported source composition required for damage timing');
  if(!unit || !composition.unit || String(unit.unitId)!==String(composition.unit.unitId)
    || unit.effectFrames!==composition.unit.effectFrames)
    throw Error('Exact source unit context required');
  const prefix=motion===1?String(unit.effectFrames).split('&'):[];
  if(!prefix.every(entry=>/^\d+:\d+(?::-?\d+){1,3}$/.test(entry))
    || offset!==(motion===1?Math.max(...prefix.map(entry=>Number(entry.split(':')[0]))):0))
    throw Error('Prepared offset differs from the exact source unit attack prefix');
  const entries=String(source.raw.effectFrames).split('&');
  if(!entries.every(entry=>/^\d+:\d+(?::-?\d+){1,3}$/.test(entry)))
    throw Error('Ordinary complete source effect timeline required');
  const expected=motion===1?[...prefix,...entries.map(entry=>{
    const fields=entry.split(':');fields[0]=String(Number(fields[0])+offset);return fields.join(':');
  })].join('&'):source.raw.effectFrames;
  if(composition.effectFrames!==expected)throw Error('Prepared effect timeline differs from source composition');
  return sourceHitDistribution(source,plan,offset);
}

/** Every serialized source hit with a complete 100 % distribution, shifted by the composed offset. */
function sourceHitDistribution(source,plan,offset){
  const hits=String(source.raw.attackFrames).split('-').map(token=>{
    const fields=token.split(':').map(Number);
    if(!/^\d+:\d+:\d+:\d+$/.test(token) || fields.length!==4 || fields.some(v=>!Number.isSafeInteger(v)) || fields[0]<0 || fields[1]<=0)
      throw Error('Unverified source attack-frame entry');
    return {frame:fields[0],weight:fields[1]};
  });
  if(JSON.stringify(hits)!==JSON.stringify(plan.sourceHits) || hits.reduce((sum,h)=>sum+h.weight,0)!==100)
    throw Error('Matching complete 100-percent source hit distribution required');
  return hits.map(hit=>({frame:hit.frame+offset,weight:hit.weight/100}));
}
