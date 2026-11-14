// Party roles (loop v2, docs/game-design.md "Party"): every hero carries one of four roles, derived from
// its published skills and corrected by a reviewed override table. Pure rules, no Phaser.
export const ROLES=['damage','healer','tank','support'];
export const ROLE_LABELS={damage:'Damage',healer:'Healer',tank:'Tank',support:'Support'};
/** A skill kind counts for a role when at least this share of the hero's skills carries it. */
export const ROLE_SHARE=.25;
/** Reviewed exceptions (proposed 2026-11-15, awaiting developer review). Keys are catalog keys. */
export const ROLE_OVERRIDES={
 // Paladin: Protect, Shell and Focus outweigh his Cure line; FF IV's defender.
 cecil:'tank',
 // Warrior of Light: the shield-bearing front line of FF I rather than a white mage.
 warrior_of_light:'tank',
 // Ancient barrier caster (Protectga, Shellga): she shields the party, she does not draw blows.
 aerith_cetra:'support',
 // Comeback (raise) is a single utility skill on an attacker.
 noctis_true_king:'damage',
};
const TANK_KINDS=new Set(['guard','provoke','cover']);
const SUPPORT_KINDS=new Set(['physical-boost','auto-revive','cleanse','limit-fill']);
/** What one skill contributes: 'healer', 'tank', 'support' or 'damage'. */
export function skillRole(skill){
 const ally=(skill.allyEvents??[]).flatMap(e=>e.effects.map(f=>f.kind));
 if(ally.some(k=>k==='heal'||k==='raise'))return 'healer';
 // Focus/Cheer-style skills grant a guard together with an attack boost: they support, they do not tank.
 if(ally.some(k=>TANK_KINDS.has(k))&&!ally.includes('physical-boost'))return 'tank';
 if(ally.some(k=>SUPPORT_KINDS.has(k)||TANK_KINDS.has(k))||(skill.supportEvents?.length&&!skill.damageEvents))return 'support';
 return 'damage';
}
/** Derived role before overrides: healer by skill share, then tank or support (a tie goes to support),
 * otherwise damage. */
export function deriveRole(character){
 const skills=character.skills??[];
 if(!skills.length)return 'damage';
 const count={damage:0,healer:0,tank:0,support:0};
 for(const s of skills)count[skillRole(s)]++;
 const share=role=>count[role]/skills.length;
 if(share('healer')>=ROLE_SHARE)return 'healer';
 if(share('tank')+share('support')>=ROLE_SHARE)return count.tank>count.support?'tank':'support';
 return 'damage';
}
export function roleOf(character){
 const override=ROLE_OVERRIDES[character.key];
 if(override!==undefined&&!ROLES.includes(override))throw Error('Unknown role override: '+character.key);
 return override??deriveRole(character);
}
