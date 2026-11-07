// Original non-full-Z metadata sorting. This never reorders simulation or RNG.
const EPSILON=Math.fround(1e-6);
export function nativePriorityOrder(priorities,enabled=true) {
  if(typeof enabled!=='boolean'||priorities.some(p=>!Number.isFinite(p)||!Number.isFinite(Math.fround(p))))
    throw Error('Finite native draw priorities and explicit enablement required');
  const values=priorities.map(Math.fround),order=values.map((_,i)=>i);
  if(!enabled)return order;
  let gap=order.length,swapped;
  do{
    gap=Math.floor(gap*10/13);if(gap===9||gap===10)gap=11;if(gap===0)gap=1;
    swapped=false;
    for(let i=0;i+gap<order.length;i++){
      const a=order[i+gap],b=order[i],difference=Math.fround(values[a]-values[b]);
      const equal=Math.fround(Math.abs(difference)-EPSILON)<0;
      if(equal?a<b:difference<0){[order[i],order[i+gap]]=[a,b];swapped=true;}
    }
  }while(gap>1||swapped);
  return order;
}

export function validateNativeSubmission(profile,slots,sourceSha256) {
  if(!profile)return;
  if(profile.profile!=='native-priority-nonfullz-v1'||profile.fullZSort!==false
    ||typeof profile.prioritySort!=='boolean'||profile.sourceSha256!==sourceSha256)
    throw Error('Unsupported native submission profile');
  if(!profile.priorities||slots.some(s=>!Number.isFinite(profile.priorities[s.program.node.index])))
    throw Error('Missing original draw priority');
  nativePriorityOrder(slots.map(s=>profile.priorities[s.program.node.index]),profile.prioritySort);
}

export function nativeSubmissionRanks(profile,slots,packets) {
  const groups=[],byEmitter=new Map(),ranks=Array(slots.length).fill(null);
  for(let i=0;i<slots.length;i++)if(packets[i]?.packet){
    const emitter=slots[i].program;
    if(!byEmitter.has(emitter)){byEmitter.set(emitter,groups.length);groups.push({emitter,indices:[]});}
    groups[byEmitter.get(emitter)].indices.push(i);
  }
  // Native non-full-Z metadata includes an emitter's live primitives even when
  // alpha/area is zero. Filtering individual meshes must not change sort inputs.
  const order=nativePriorityOrder(groups.map(g=>profile.priorities[g.emitter.node.index]),profile.prioritySort);
  let rank=0;for(const group of order)for(const index of groups[group].indices)ranks[index]=rank++;
  return ranks;
}
