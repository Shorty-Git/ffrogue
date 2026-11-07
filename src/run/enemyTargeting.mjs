/** Single-target enemy attacks always hit the first party slot while it stands (current rule). */
export function enemyTargetIndex(heroes,random){
  const first=heroes.findIndex(h=>h.alive);
  return heroes[0]?.alive?0:first;
}
