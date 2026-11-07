/**
 * Single-target enemy attacks pick a random standing hero (FFRogue rule, not original FFBE AI).
 * Uses the persisted combat stream, so a reloaded encounter replays the same choices.
 * Party-wide attacks do not call this.
 */
export function enemyTargetIndex(heroes,random){
  const living=heroes.flatMap((hero,index)=>hero.alive?[index]:[]);
  if(!living.length)return -1;
  return living[Math.min(living.length-1,Math.floor(random()*living.length))];
}
