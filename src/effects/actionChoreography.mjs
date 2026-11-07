/** Body, travel and gameplay are independently reviewed; a motion ID is not a body clip. */
export function validateActionChoreography(skill, durationFrames=Infinity, animations) {
  const c=skill.actionChoreography,r=c?.review;
  if(c?.schema!=='source-action-v1'||!['target','step','stationary'].includes(c.movement)
    ||!['prepared','move-cycle'].includes(c.travelTiming)||!['none','magic-standby'].includes(c.readiness)
    ||!['accepted-gameplay','user-original-observation','reviewed-adaptation'].includes(r?.basis)||typeof r.note!=='string'||!r.note.trim()
    ||![1,2,8].includes(r.sourceMotionType)||![1,4].includes(r.sourceMoveType))
    throw Error('Reviewed Source character choreography required; motion semantics are unresolved');
  if(c.commandPose!==undefined&&(!['standby','magic-standby'].includes(c.commandPose)
    ||animations&&!animations[c.commandPose==='standby'?'standby':'magic_standby']?.frames?.length))
    throw Error('Explicit available command pose required');
  // Limit Burst and magic rows carry no motionType/moveType, so their reviewed values cannot be cross-checked.
  if(skill.originalCommand&&skill.originalCommand.raw.motionType!==undefined&&(skill.originalCommand.raw.motionType!==r.sourceMotionType
    ||skill.originalCommand.raw.moveType!==r.sourceMoveType))throw Error('Choreography source identity changed');
  if(c.movement==='target'&&skill.moveType!=='dash'||c.movement==='stationary'&&skill.moveType!=='stationary'
    ||c.movement==='step'&&(c.travelTiming!=='move-cycle'||c.stepDistance!=='half-idle-height'))
    throw Error('Unsupported reviewed movement contract');
  if(c.body?.mode==='clips'){
    if(!Array.isArray(c.body.phases)||!c.body.phases.length||c.body.phases.length>16)
      throw Error('Explicit body phases required');
    let previous=-1,previousEnd=0;
    for(const phase of c.body.phases){
      if(!Number.isInteger(phase.frame)||phase.frame<0||phase.frame<=previous||phase.frame>=durationFrames
        ||!['atk','magic_atk','limit_atk'].includes(phase.clip))throw Error('Unsupported ordered body phase');
      if(animations){
        const clip=animations[phase.clip];
        if(!clip?.frames?.length||!clip.frames.every(f=>Number.isFinite(f.durationMs)&&f.durationMs>0)
          ||phase.frame<previousEnd)throw Error('Missing or overlapping character clip');
        previousEnd=phase.frame+clip.frames.reduce((s,f)=>s+f.durationMs,0)*60/1000;
      }
      previous=phase.frame;
    }
  }else if(c.body?.mode!=='rest'||c.body.phases!==undefined)throw Error('Unknown body mode; no standard attack fallback');
  if(animations&&c.travelTiming==='move-cycle'){
    const move=animations.move,idle=animations.idle;
    if(!move?.frames?.length||!Number.isFinite(idle?.frameHeight)||idle.frameHeight<=0
      ||!move.frames.every(f=>Number.isFinite(f.durationMs)&&f.durationMs>0))throw Error('Source move cycle/idle footprint required');
  }
  return c;
}

export function actionTravel(choreography, prepared, hero) {
  if(choreography.travelTiming==='prepared')return {approachMs:prepared.approachFrames*1000/60,returnMs:prepared.returnFrames*1000/60};
  const duration=hero.manifest.animations.move.frames.reduce((sum,f)=>sum+f.durationMs,0);
  return {approachMs:duration,returnMs:duration,stepDistance:hero.manifest.animations.idle.frameHeight*Math.abs(hero.scaleY)/2};
}
