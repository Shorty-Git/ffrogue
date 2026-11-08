// Preserve structural sound references without guessing cue-bank dispatch or media files.
export function sourceAudioPlan(groups = [], coverage='legacy-partial-groups') {
  const events=[],issues=[];
  for(const group of groups){
    for(const raw of String(group.soundsRaw??'').split(',').filter(Boolean)){
      const fields=raw.split(':');
      if(!Number.isInteger(group.frame)||fields.length<2||!/^\d+$/.test(fields[0])||!/^\d+$/.test(fields[1])){
        issues.push({group:group.group,raw,reason:'Uninterpreted source sound record'});continue;
      }
      // A group that starts before the scene (negative frame) plays its sound at frame 0, the same clamp
      // the visual approximation applies to negative member starts; the raw frame stays recorded.
      const frame=group.frame+Number(fields[0]);
      events.push({frame:Math.max(0,frame),sourceGroupId:group.group,sourceSoundId:Number(fields[1]),
        rawParameters:fields.slice(2),resource:null,...(frame<0?{clampedFromFrame:frame}:{})});
    }
  }
  events.sort((a,b)=>a.frame-b.frame);
  return {schema:'ffbe-audio-source-v1',playbackSupported:false,bus:'skill-sfx',frameRate:60,coverage,
    timingBasis:'Serialized effect-group offsets; native sound dispatch not measured',events,issues,sourceGroups:groups};
}
