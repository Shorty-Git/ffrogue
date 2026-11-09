// Barrage-type commands (FFBE process 42, "0,0,minHits,maxHits,power%"): the unit repeats its own
// basic attack. They carry no effect or hit frames of their own; every repetition plays the attack clip
// with the unit's original basic-attack hit frames (character.battle.hitFrames). Shared by the importer
// (tools/lib/character-pipeline.mjs) and the battle (BattleScene.executeBasicRepeat).
const TARGETING = {'1': 'target', '2': 'all', '3': 'random'};

/** Original fields of a pure process-42 enemy-target ability, or null. */
export function basicRepeatFromSource(raw) {
  if (String(raw?.processId) !== '42' || String(raw?.target) !== '1') return null;
  const [, , minHits, maxHits, power] = String(raw.processParam).split(',').map(Number);
  const targeting = TARGETING[String(raw.targetRange)];
  if (!targeting || !Number.isInteger(minHits) || !Number.isInteger(maxHits) || minHits < 1 || maxHits < minHits || maxHits > 10 || !(power > 0)) return null;
  return {minHits, maxHits, power, targeting};
}

/** Throws unless the reviewed entry is a well-formed basic-attack repeat. */
export function validateBasicRepeat(skill) {
  const r = skill?.basicRepeat;
  if (skill?.execution !== 'basic-attack-repeat' || !r || !Number.isInteger(r.minHits) || !Number.isInteger(r.maxHits)
    || r.minHits < 1 || r.maxHits < r.minHits || r.maxHits > 10 || !['target', 'all', 'random'].includes(r.targeting))
    throw Error('Invalid reviewed basic-attack repeat');
  if (skill.scenePresentation || skill.requiresSourceScene || skill.motion !== 'atk' || skill.moveType !== 'dash'
    || !(skill.damageMultiplier > 0) || skill.damageMultiplier > 5 || skill.type === 'LIMIT'
    || skill.scope !== (r.targeting === 'target' ? 'single_enemy' : 'all_enemies'))
    throw Error('Basic-attack repeats play the attack clip at the target without a scene');
  return r;
}
