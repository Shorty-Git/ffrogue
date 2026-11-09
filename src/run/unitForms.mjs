/** Reviewed same-unit forms; original variants are never inferred from names. */
export function reviewedForms(character){return [character,...(character.forms??(character.evolution?[character.evolution]:[]))];}
export function formAt(character,key){return reviewedForms(character).find(f=>f.form===key);}
export const rankValue=form=>form.rank==='NV'?8:form.rarity;
export const rankLabel=form=>form.rank??form.rarity+'★';
/** FFRogue level scale (docs/progression-design.md): 3★=1, 4★=2, 5★=3, 6★=4, 7★=5, NV=6.
 * Level is the power axis for every variant alike; the form is the body shown at that level. */
export const MAX_LEVEL=6;
export const levelOf=form=>form.rank==='NV'?MAX_LEVEL:Math.max(1,Math.min(MAX_LEVEL-1,form.rarity-2));
export const levelLabel=level=>'Lv '+level;
/** Summon weight by a hero's base level (its original base rarity), so rarer variants are summoned
 * less often: a 3★ base unit (Lv 1) ~8× as often as an NV unit (Lv 6). Colours are the Fate Engine tiers. */
export const SUMMON_WEIGHTS={1:50,2:35,3:25,4:15,5:10,6:6};
export const summonWeight=form=>SUMMON_WEIGHTS[levelOf(form)];
/** Body at a level: the highest reviewed same-identity form at or below it, else the base form
 * (an NV-only unit at Lv 3 keeps its NV body; a 5★-max unit at Lv 6 keeps its 5★ body). */
export function formForLevel(character,level){
 const forms=reviewedForms(character).filter(f=>f.identity===character.identity&&levelOf(f)<=level);
 return forms.sort((a,b)=>levelOf(a)-levelOf(b)).at(-1)??character;
}
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
