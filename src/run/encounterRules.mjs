// Encounter rules of loop v2 (docs/game-design.md "Run structure"): enemy scaling per act and map depth,
// elite affixes and boss rules. Pure data and seeded picks (seed hashes, no RNG streams); BattleScene applies
// the hooks (MP cost, round limit, regeneration). All numbers are first guesses for the balancing pass.

/** Enemy HP and damage multipliers by act index (the final boss room is the act after the last one). */
export const ACT_SCALING=[{hp:1,damage:1},{hp:1.4,damage:1.2},{hp:1.85,damage:1.42},{hp:2.3,damage:1.65}];
/** Extra HP and damage per map row inside an act (deeper nodes are harder). */
export const DEPTH_SCALING=.03;
export function actScaling(act,row=0){
 const base=ACT_SCALING[Math.min(Math.max(0,act),ACT_SCALING.length-1)],depth=1+DEPTH_SCALING*Math.max(0,row);
 return {hp:base.hp*depth,damage:base.damage*depth};
}
/** Elites: optional, clearly harder single foes with one affix. Each affix is one tooltip line. */
export const ELITE_AFFIXES={
 enraged:{id:'enraged',name:'Enraged',text:'Deals 35% more damage.',damage:1.35},
 armored:{id:'armored',name:'Armored',text:'Has 60% more HP.',hp:1.6},
 regenerating:{id:'regenerating',name:'Regenerating',text:'Recovers 6% of its max HP at the end of every round.',regen:.06},
};
/** Bosses (act bosses and the final boss) carry one rule in the spirit of Balatro's boss blinds. */
export const BOSS_RULES={
 silence:{id:'silence',name:'Silence',text:'Skills cost twice their MP.',mpCostMultiplier:2},
 doom:{id:'doom',name:'Doom',text:'Win within 12 rounds or the party falls.',roundLimit:12},
 endurance:{id:'endurance',name:'Endurance',text:'The boss recovers 5% of its max HP at the end of every round.',regen:.05},
};
function hash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
const pickKey=(table,salt)=>{const keys=Object.keys(table);return table[keys[hash(salt)%keys.length]];};
/** The affix of an elite node, fixed by seed and node id. */
export const eliteAffix=(seed,nodeId)=>pickKey(ELITE_AFFIXES,`${seed}:affix:${nodeId}`);
/** The rule of an act's boss, fixed by seed and act; consecutive bosses of a run never share a rule. */
export function bossRule(seed,act){
 const keys=Object.keys(BOSS_RULES),first=hash(`${seed}:boss-rules`)%keys.length;
 return BOSS_RULES[keys[(first+act)%keys.length]];
}
/** Skill MP cost under a boss rule (rounded up, never below the original). */
export const ruleMpCost=(cost,rule)=>Math.ceil(cost*(rule?.mpCostMultiplier??1));
/** HP an enemy regenerates at the end of a round under an affix or rule. */
export const ruleRegen=(maxHp,modifier)=>modifier?.regen?Math.round(maxHp*modifier.regen):0;
/** True when a round limit has run out: the party falls once round `round` would start beyond the limit. */
export const doomFalls=(round,rule)=>!!rule?.roundLimit&&round>rule.roundLimit;
