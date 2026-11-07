/** Reviewed host replay policy, not a reconstruction of FFBE seed construction. */
export function memberSamplingSeed(plan,member) {
  if(plan.memberRandomness===undefined)return plan.seed;
  if(plan.memberRandomness!=='reviewed-member-streams-v1'||!Number.isInteger(plan.seed)
    ||typeof member.randomStreamKey!=='string'||!member.randomStreamKey.length)
    throw Error('Explicit reviewed member random stream required');
  let state=plan.seed>>>0;
  for(const character of `${member.randomStreamKey}:${member.targetKey??'target0'}`)
    state=Math.imul(state^character.charCodeAt(0),16777619)>>>0;
  return state;
}
