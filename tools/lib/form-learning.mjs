// Ordinary series acquisition at the selected form's maximum native level.
// This is neither account eligibility nor renderer/choreography approval.
export function formLearning(learned,form){
  const bounded=Number.isSafeInteger(form?.unitId)&&Number.isSafeInteger(form?.rare)&&form.rare>0
    &&Number.isSafeInteger(form?.maxLv)&&form.maxLv>0;
  const requirements=Array.isArray(learned)?learned:[];
  const paths=requirements.map(row=>{
    if(!bounded||!Number.isSafeInteger(row.rarity)||row.rarity<1||!Number.isSafeInteger(row.level)||row.level<1
      ||!['nvLevel','unlockType','braveAbility'].every(k=>Number.isSafeInteger(row[k])&&row[k]>=0))return 'unknown';
    if(row.nvLevel!==0||row.unlockType!==0||row.braveAbility!==0)return 'conditional';
    return row.rarity>form.rare||row.level>form.maxLv?'later-form':'current-form';
  });
  const status=paths.includes('current-form')?'current-form':paths.length&&paths.every(p=>p==='later-form')?'later-form'
    :paths.includes('conditional')?'conditional':'unknown';
  return {status,ordinaryAtFormMax:status==='current-form',unitId:form?.unitId??null,
    rarity:form?.rare??null,maxLevel:form?.maxLv??null,paths,
    boundary:'Ordinary maximum-level series acquisition only; equipment, account, enhancement and conditional unlocks are not inferred'};
}
