/** Reviewed same-unit forms; original variants are never inferred from names. */
export function reviewedForms(character){return [character,...(character.forms??(character.evolution?[character.evolution]:[]))];}
export function formAt(character,key){return reviewedForms(character).find(f=>f.form===key);}
export const rankValue=form=>form.rank==='NV'?8:form.rarity;
export const rankLabel=form=>form.rank??form.rarity+'★';
export function awakeningPath(character,from){
 const forms=reviewedForms(character).filter(f=>f.identity===character.identity);
 const path=[];
 let current=from;
 while(true){
  const next=forms.find(f=>f.awakensFrom===current.form&&rankValue(f)>rankValue(current));
  if(!next)return path;
  path.push(next);
  current=next;
 }
}
export function nextAwakening(run,character,member){
 if(character.forms?.some(f=>f.awakensFrom)){
  const path=awakeningPath(character,member);
  // Existing prototype saves retain their recorded direct-awakening policy.
  if(run.rules?.awakeningMode==='highest-reviewed'){
   return path.filter(form=>form.rank!=='NV').at(-1)??path[0];
  }
  return path[0];
 }
 const available=reviewedForms(character).filter(f=>f.identity===member.identity&&f.rarity>member.rarity).sort((a,b)=>a.rarity-b.rarity);
 if(run.rules?.awakeningMode==='highest-reviewed')return available.at(-1);
 // Preserve a blocked first step instead of silently jumping over it.
 if(member.form===character.form)return character.evolution;
 return available[0];
}
