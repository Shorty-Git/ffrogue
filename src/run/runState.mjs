// Serializable roguelike rules. Visual animations never consume these streams.
import {STAGE_CONTENT,stageForArea,stageElementProfile} from './stageContent.mjs';
import {ELEMENTS} from './elements.mjs';
import {skillElements} from './elementRules.mjs';
import {memberPower,validWeapon,weaponsForTier} from './weapons.mjs';
import {awakeningPath,formAt,formForLevel,levelOf,MAX_LEVEL} from './unitForms.mjs';
import {carriedLimit,LB_MAX} from './limitGauge.mjs';
export const RUN_VERSION=4;
export const SAVE_KEY='ffrogue.run.v1';
/** Share of base max HP a 'revive' reward restores. */
export const REVIVE_HP_SHARE=.5;
/** Share of max HP / MP living members recover when the run enters a new area (camp). */
export const AREA_CAMP={hp:.3,mp:.3};
export const PROTOTYPE_AREAS=Object.values(STAGE_CONTENT).map(s=>({stageId:s.id,name:s.name,arena:s.arena,normals:s.normalFights}));
export const FULL_AREAS=[{name:'Whisperwood',arena:'forest',normals:5},{name:'Mako Outskirts',arena:'reactor',normals:5},{name:'Final Rift',arena:'forest',normals:5}];
export function seedHash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
/** Seeded areas before the final one; the seed picks which stages and the route climbs in difficulty. */
export const COURSE_LENGTH=2;
/** Developer decision 2026-11-10: every run ends in the final boss room, Nibelheim (Sephiroth). */
export const FINAL_STAGE='nibelheim';
/** Run structure: each seeded area ends in an elite fight, the final area in the boss fight. */
export function courseAreas(seed){
 const pool=Object.values(STAGE_CONTENT).filter(s=>s.id!==FINAL_STAGE);
 const picked=[...pool].sort((a,b)=>seedHash(seed+':course:'+a.id)-seedHash(seed+':course:'+b.id)).slice(0,COURSE_LENGTH);
 const final=STAGE_CONTENT[FINAL_STAGE];
 return [...picked.sort((a,b)=>a.difficulty-b.difficulty||a.id.localeCompare(b.id))
  .map(s=>({stageId:s.id,name:s.name,arena:s.arena,normals:s.normalFights})),
  ...(final?[{stageId:final.id,name:final.name,arena:final.arena,normals:final.normalFights,final:true}]:[])];
}
export function variantAreas(seed){
 return courseAreas(seed).map(area=>{
  const variants=[area.arena,...(STAGE_CONTENT[area.stageId].variants??[])];
  return {...area,arena:variants[seedHash(seed+':arena:'+area.stageId)%variants.length]};
 });
}
export function nextRandom(run,stream){let x=run.rng[stream]>>>0;x=(x+0x6d2b79f5)>>>0;run.rng[stream]=x;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
const clone=value=>JSON.parse(JSON.stringify(value));
const pick=(run,stream,values)=>{if(!values.length)throw Error('No valid content');return values[Math.floor(nextRandom(run,stream)*values.length)];};
/** Hero draw: uniform unless a Bond perk sets drawWeight (profile.mjs drawCatalog); one RNG draw either way. */
function pickHero(run,keys,catalog){
 if(!keys.some(key=>catalog[key].drawWeight))return pick(run,'roster',keys);
 if(!keys.length)throw Error('No valid content');
 const weights=keys.map(key=>catalog[key].drawWeight??1),total=weights.reduce((a,b)=>a+b,0);
 let roll=nextRandom(run,'roster')*total;
 for(const [index,weight] of weights.entries()){roll-=weight;if(roll<0)return keys[index];}
 return keys.at(-1);
}
function validFormPolicy(policy){
 if(policy===undefined)return true;
 return !!policy?.weights&&['3','4','5','6','7','NV'].every(rank=>Number.isFinite(policy.weights[rank])&&policy.weights[rank]>0)
  &&Object.entries(policy.pathWeights??{}).every(([path,weights])=>Array.isArray(weights)
   &&weights.length===path.split('/').length&&weights.every(w=>Number.isFinite(w)&&w>0)
   &&Number.isFinite(weights.reduce((sum,w)=>sum+w,0)))
  &&['hpPerRank','mpPerRank','powerPerRank','defensePerRank'].every(key=>Number.isFinite(policy[key])&&policy[key]>=0&&policy[key]<=.2);
}
/** `boss` marks an area's closing fight (relic rewards, single strong enemy); `kind` names it for the
 * player: 'normal', 'elite' (closing fight of a seeded area) or 'boss' (closing fight of the final area). */
export function encounters(areas){return areas.flatMap((area,index)=>Array.from({length:area.normals+1},(_,wave)=>{const last=wave===area.normals;
 return {area:index,name:area.name,arena:area.arena,boss:last,kind:last?(area.final?'boss':'elite'):'normal',wave};}));}
export const ENCOUNTER_LABELS={normal:'Battle',elite:'Elite',boss:'Boss'};
export function createRun(seed,catalog,areas=courseAreas(seed),rules){
 areas.forEach(stageForArea);
 if(new Set(Object.values(catalog).filter(c=>c.canonicalIdentity&&c.skills.length).map(c=>c.canonicalIdentity)).size<3)throw Error('Three reviewed canonical character identities required');
 if(!String(seed).trim()||String(seed).length>64)throw Error('Seed must contain 1–64 characters');
 const run={version:RUN_VERSION,seed:String(seed),phase:'setup',party:[],rerolls:3,encounter:0,offers:[],history:[],areas:clone(areas),rng:{}};
 if(rules){if(!['sequential','highest-reviewed'].includes(rules.awakeningMode)||!validFormPolicy(rules.originalForms))throw Error('Unsupported run policy');run.rules=clone(rules);}
 for(const s of ['roster','skills','rewards','combat'])run.rng[s]=seedHash(seed+':'+s);
 return run;
}
/** Start-level roll: one table for every hero (run-rules weights by original rank: 3★..NV = Lv 1..6).
 * newMember raises it to the hero's base level, so the original rarity sets the floor (developer
 * decision 2026-11-09: a 5★ base unit never starts below Lv 3). Without a policy: the base level. */
const LEVEL_KEYS=['3','4','5','6','7','NV'];
function drawStartLevel(run,character){
 const policy=run.rules?.originalForms;
 if(!policy)return levelOf(character);
 const weights=LEVEL_KEYS.map(key=>policy.weights[key]),total=weights.reduce((sum,w)=>sum+w,0);
 run.rng.forms??=seedHash(run.seed+':forms');
 let roll=nextRandom(run,'forms')*total;
 for(const [index,weight] of weights.entries()){roll-=weight;if(roll<0)return index+1;}
 return 1;
}
export const memberMaxMp=(character,member)=>Math.round(character.maxMp*(member.stats.mp??1));
/** Stat multipliers for level steps; Lv 1 is 1.0, every level adds the per-rank growth. */
function formStats(policy,steps){
 return {hp:1+steps*policy.hpPerRank,mp:1+steps*policy.mpPerRank,
  attack:1+steps*policy.powerPerRank,magic:1+steps*policy.powerPerRank,defense:1+steps*policy.defensePerRank};
}
function newMember(run,key,catalog){
 // The original base rarity is the start-level floor (3★ = Lv 1, 5★ = Lv 3, NV = Lv 6); Bond 3
 // (profile.mjs) adds its own floor. The roll can only lift a hero above them.
 const character=catalog[key],level=Math.max(drawStartLevel(run,character),levelOf(character),character.minStartLevel??1),form=formForLevel(character,level);
 const policy=run.rules?.originalForms;
 const stats=policy?formStats(policy,level-1):{attack:1,magic:1,defense:1,hp:1};
 return {key,identity:character.identity,canonicalIdentity:character.canonicalIdentity,level,
  form:form.form,unitId:form.unitId,rarity:form.rarity,...(form.rank?{rank:form.rank}:{}),
  skills:[{id:pick(run,'skills',character.skills).id,level:1}],
  stats,hp:Math.round(character.maxHp*stats.hp),mp:Math.round(character.maxMp*(stats.mp??1))};
}
export function rollParty(input,catalog){
 if(arguments.length>2)throw Error('Only full team draws are supported');
 if(input.phase!=='setup')throw Error('Party is locked');
 if(!validFormPolicy(input.rules?.originalForms))throw Error('Unsupported original form policy');
 const reroll=input.party.length>0;
 if(reroll&&input.rerolls<=0)throw Error('No reroll available');

 const run=clone(input);
 const pool=Object.keys(catalog).filter(key=>catalog[key].canonicalIdentity&&catalog[key].skills.length);
 const identity=key=>catalog[key].canonicalIdentity;
 const keys=[];
 const drawn=new Set();
 for(let i=0;i<3;i++){
  const key=pickHero(run,pool.filter(key=>!drawn.has(identity(key))),catalog);
  keys.push(key);
  drawn.add(identity(key));
 }
 if(reroll&&input.party.every(member=>drawn.has(member.canonicalIdentity))){
  // Treat a reshuffle of the same identities as a repeat, even across variants.
  const alternatives=pool.filter(key=>!drawn.has(identity(key)));
  if(alternatives.length)keys[pick(run,'roster',[0,1,2])]=pickHero(run,alternatives,catalog);
 }
 run.party=keys.map(key=>newMember(run,key,catalog));
 if(reroll)run.rerolls--;
 run.history.push({kind:reroll?'reroll':'initial-party',slot:null,party:keys,remaining:run.rerolls});
 return run;
}
/** Bond 2 (profile.mjs startSkillChoice): before setting out, the starting skill may be chosen freely. */
export function chooseStartSkill(input,key,skillId,catalog){
 const run=clone(input),m=run.party.find(p=>p.key===key),c=catalog[key];
 if(run.phase!=='setup'||!m||!c?.startSkillChoice||!c.skills.some(s=>s.id===skillId))throw Error('No starting skill choice');
 m.skills=[{id:skillId,level:1}];
 run.history.push({kind:'start-skill',member:key,skill:skillId});
 return run;
}
export function confirmParty(input){const run=clone(input);if(run.phase!=='setup'||run.party.length!==3||new Set(run.party.map(m=>m.canonicalIdentity)).size!==3||run.party.some(m=>!m.canonicalIdentity))throw Error('Roll three distinct canonical characters first');run.phase='battle';return run;}
export function skillForRun(source,member){
 const skill=clone(source),level=member.skills.find(s=>s.id===source.id)?.level??1,boost=1+.2*(level-1);
 skill.damageMultiplier*=boost*memberPower(member,skill.damageType==='holy'?'magic':'attack');
 for(const e of skill.allyEvents??[])for(const f of e.effects)if(f.kind==='heal')f.amount=Math.round(f.amount*boost*memberPower(member,'magic'));
  else if(f.kind==='limit-fill')f.amount=Math.min(LB_MAX,f.amount+10*(level-1));
  else if(f.kind==='raise')f.hpFraction=Math.min(1,Math.round((f.hpFraction+.1*(level-1))*100)/100);
  else if(f.kind==='cleanse'){/* no strength to scale */}
  else if(f.kind==='guard'){f.reduction=Math.min(.6,Math.round((f.reduction+.05*(level-1))*100)/100);f.turns=Math.min(9,f.turns+level-1);}
  else if(f.kind==='auto-revive'){f.hpFraction=Math.min(1,Math.round((f.hpFraction+.1*(level-1))*100)/100);f.turns=Math.min(9,f.turns+level-1);}
  else {f.multiplier=Math.min(3,f.multiplier+.1*(level-1));f.turns=Math.min(9,f.turns+level-1);}
 for(const e of skill.supportEvents??[])for(const f of e.effects)if(f.kind==='execute-or-damage')f.fallbackDamage=Math.min(99999,Math.round(f.fallbackDamage*boost*memberPower(member,'attack')));
  else f.phases=Math.min(9,f.phases+level-1);
 return skill;
}
/** Stage of the fight after the current one (the current stage after the last fight). */
export function upcomingStage(run){
 const list=encounters(run.areas),next=list[run.encounter+1]??list[run.encounter];
 return stageForArea(run.areas[next.area]);
}
/** Reward weights (one RNG draw per pick either way): skills whose element hits a weakness of the
 * next stage's enemies and wards against elements they use are offered more often. */
export const REWARD_WEIGHTS={learnOnWeakness:3,ward:2,weapon:1,weaponOnWeakness:2,default:1};
function rewardWeight(run,catalog,reward,profile){
 if(reward.type==='ward')return REWARD_WEIGHTS.ward;
 if(reward.type==='weapon')return reward.weapon.elements.some(e=>profile.weak.includes(e))?REWARD_WEIGHTS.weaponOnWeakness:REWARD_WEIGHTS.weapon;
 if(reward.type==='learn'){const skill=catalog[reward.member]?.skills.find(s=>s.id===reward.skill);
  if(skill&&skillElements(skill).some(e=>profile.weak.includes(e)))return REWARD_WEIGHTS.learnOnWeakness;}
 return REWARD_WEIGHTS.default;
}
function pickWeighted(run,stream,values,weight){
 if(!values.length)throw Error('No valid content');
 const weights=values.map(weight),total=weights.reduce((a,b)=>a+b,0);
 let roll=nextRandom(run,stream)*total;
 for(const [i,w] of weights.entries()){roll-=w;if(roll<0)return values[i];}
 return values.at(-1);
}
/** Card kinds of the reward screen, in display order. */
export const REWARD_KINDS=['skill','upgrade','weapon'];
export function rewardKind(reward){return reward.type==='learn'||reward.type==='skill'?'skill':reward.type==='weapon'?'weapon':'upgrade';}
export function rewardPool(run,catalog){
 const pool=[],e=encounters(run.areas)[run.encounter];
 for(const m of run.party){const c=catalog[m.key];
  for(const s of c.skills)if(!m.skills.some(a=>a.id===s.id))pool.push({type:'learn',member:m.key,skill:s.id});
  for(const s of m.skills)if(s.level<3)pool.push({type:'skill',member:m.key,skill:s.id});
  for(const stat of ['attack','magic','defense','hp'])if(m.stats[stat]<3&&(stat!=='magic'||c.magicAvailable||c.skills.some(s=>s.damageType==='holy'||s.allyEvents?.some(e=>e.effects.some(f=>f.kind==='heal')))))pool.push({type:'stat',member:m.key,stat});
  // Boss relic: one level up to MAX_LEVEL for every hero; the body changes where an original form exists.
  if(e.boss&&m.level<MAX_LEVEL)pool.push({type:'evolve',member:m.key,level:m.level+1});
  // K.O. persists between battles; only an explicit revival reward brings a member back.
  if(m.hp<=0)pool.push({type:'revive',member:m.key});
 }
 // Weapons: one candidate per hero from the next area's rarity tier, chosen by seed hash (no RNG draw),
 // so the pool can be recomputed for save validation. Half the heroes look first at weapons whose
 // element hits a weakness of the next stage.
 const next=encounters(run.areas)[run.encounter+1]??e,profile=stageElementProfile(upcomingStage(run));
 for(const m of run.party){
  const candidates=weaponsForTier(next.area).filter(w=>w.id!==m.weapon?.id);if(!candidates.length)continue;
  const h=seedHash(`${run.seed}:${run.encounter}:${m.key}:weapon`),weak=candidates.filter(w=>w.elements.some(x=>profile.weak.includes(x)));
  const list=h%2===0&&weak.length?weak:candidates;
  pool.push({type:'weapon',member:m.key,weapon:list[(h>>>1)%list.length]});
 }
 // Ward relics: elements the next stage's enemies really attack with, once per run each.
 for(const element of stageElementProfile(upcomingStage(run)).attack)if(!(run.wards??[]).includes(element))pool.push({type:'ward',element});
 pool.push({type:'rest'});return pool;
}
export function completeBattle(input,catalog,snapshot,won){
 const run=clone(input);if(run.phase!=='battle'||run.pendingAwakening)throw Error('Battle already settled or awaiting presentation');
 if(snapshot.length!==3||snapshot.some((s,i)=>s.key!==run.party[i].key))throw Error('Fixed party snapshot required');
 run.party.forEach((m,i)=>{m.hp=Math.max(0,Math.min(Math.round(catalog[m.key].maxHp*m.stats.hp),snapshot[i].hp));m.mp=Math.max(0,Math.min(memberMaxMp(catalog[m.key],m),snapshot[i].mp));
  // The Limit gauge carries to the next battle for heroes who end it standing (src/run/limitGauge.mjs).
  const gauge=carriedLimit(catalog[m.key],m.hp,snapshot[i].limit);if(gauge>0)m.limit=gauge;else delete m.limit;});
 if(!won){run.phase='lost';return run;}
 run.phase='rewards';const pool=rewardPool(run,catalog),boss=encounters(run.areas)[run.encounter].boss;
 const evolution=pool.filter(r=>r.type==='evolve'),revival=pool.filter(r=>r.type==='revive');
 const profile=stageElementProfile(upcomingStage(run)),weigh=r=>rewardWeight(run,catalog,r,profile);
 // Reward mix (cloud night 2026-11-10): one card per kind, always in this order: a skill, an upgrade,
 // a weapon. The elite relic (awakening) takes the upgrade card; a revival (guaranteed while anyone is
 // K.O.) takes the upgrade card, or the weapon card when the relic holds it. An empty kind falls back
 // to any remaining reward, so three cards always remain.
 const slots=REWARD_KINDS.map(kind=>({kind,offer:null}));
 if(boss&&evolution.length)slots[1].offer=pick(run,'rewards',evolution);
 if(revival.length)slots[slots[1].offer?2:1].offer=pick(run,'rewards',revival);
 const taken=()=>slots.flatMap(slot=>slot.offer?[JSON.stringify(slot.offer)]:[]);
 for(const slot of slots){
  if(slot.offer)continue;
  const free=pool.filter(r=>!taken().includes(JSON.stringify(r))),own=free.filter(r=>rewardKind(r)===slot.kind);
  slot.offer=clone(pickWeighted(run,'rewards',own.length?own:free,weigh));
 }
 run.offers=slots.map(slot=>slot.offer);
 return run;
}
export function chooseReward(input,index,catalog,replace){
 const run=clone(input);if(run.phase!=='rewards'||!Number.isInteger(index)||!run.offers[index])throw Error('No pending reward');
 const r=run.offers[index],m=run.party.find(m=>m.key===r.member);
 if(r.type==='learn'){
  if(!catalog[m.key].skills.some(s=>s.id===r.skill)||m.skills.some(s=>s.id===r.skill))throw Error('Invalid skill offer');
  if(m.skills.length===3){const at=m.skills.findIndex(s=>s.id===replace);if(at<0)throw Error('Choose a skill to replace');m.skills.splice(at,1);}
  m.skills.push({id:r.skill,level:1});
 }else if(r.type==='skill'){const s=m.skills.find(s=>s.id===r.skill);if(!s||s.level>=3)throw Error('Invalid skill upgrade');s.level++;}
 else if(r.type==='stat'){if(!Object.hasOwn(m.stats,r.stat))throw Error('Unsupported stat');m.stats[r.stat]=Math.min(3,m.stats[r.stat]+.2);if(r.stat==='hp'&&m.hp>0)m.hp+=Math.round(catalog[m.key].maxHp*.2);}
 else if(r.type==='evolve'){
  if(r.level!==m.level+1||r.level>MAX_LEVEL)throw Error('Unverified evolution');
  const character=catalog[m.key],oldHp=Math.round(character.maxHp*m.stats.hp),oldMp=memberMaxMp(character,m),e=formForLevel(character,r.level);
  const policy=run.rules?.originalForms;
  if(policy){
   const growth=formStats(policy,1);
   for(const stat of Object.keys(growth))m.stats[stat]=Math.min(3.2,(m.stats[stat]??1)+growth[stat]-1);
  }else m.stats.hp=Math.min(3.2,m.stats.hp+.15);
  m.level=r.level;
  if(e.form!==m.form){
   run.pendingAwakening={id:`${run.seed}:${run.encounter}:${m.key}:${e.form}`,member:m.key,encounter:run.encounter,
    from:{form:m.form,unitId:m.unitId,rarity:m.rarity},to:{form:e.form,unitId:e.unitId,rarity:e.rarity}};
   m.form=e.form;m.unitId=e.unitId;m.rarity=e.rarity;
   if(e.rank)m.rank=e.rank;else delete m.rank;
  }
  if(m.hp>0){m.hp+=Math.round(character.maxHp*m.stats.hp)-oldHp;m.mp+=memberMaxMp(character,m)-oldMp;}}
 else if(r.type==='revive'){if(m.hp>0)throw Error('Revival needs a K.O. member');
  m.hp=Math.max(1,Math.round(catalog[m.key].maxHp*m.stats.hp*REVIVE_HP_SHARE));}
 else if(r.type==='weapon'){if(!validWeapon(r.weapon))throw Error('Invalid weapon');m.weapon=clone(r.weapon);}
 else if(r.type==='ward'){if(!ELEMENTS.includes(r.element)||(run.wards??[]).includes(r.element))throw Error('Invalid ward');run.wards=[...(run.wards??[]),r.element];}
 else if(r.type==='rest'){for(const a of run.party)if(a.hp>0){const c=catalog[a.key];a.hp=Math.min(Math.round(c.maxHp*a.stats.hp),a.hp+Math.round(c.maxHp*.4));a.mp=Math.min(memberMaxMp(c,a),a.mp+Math.round(c.maxMp*.4));}}
 else throw Error('Unknown reward');
 run.history.push({kind:'reward',encounter:run.encounter,reward:r,replace:replace??null});run.encounter++;run.offers=[];
 // Camp between areas (cloud night 2026-11-10): entering a new area restores a share of base HP and
 // max MP to living members; K.O. stays K.O. No RNG.
 const list=encounters(run.areas);
 if(list[run.encounter]&&list[run.encounter].area!==list[run.encounter-1].area)for(const a of run.party)if(a.hp>0){const c=catalog[a.key];
  a.hp=Math.min(Math.round(c.maxHp*a.stats.hp),a.hp+Math.round(c.maxHp*a.stats.hp*AREA_CAMP.hp));a.mp=Math.min(memberMaxMp(c,a),a.mp+Math.round(memberMaxMp(c,a)*AREA_CAMP.mp));}
 run.phase=run.encounter===encounters(run.areas).length?'won':'battle';return run;
}
/** Presentation acknowledgement never reapplies a reward or consumes RNG. */
export function acknowledgeAwakening(input,id){const run=clone(input);if(run.pendingAwakening?.id!==id)throw Error('No matching saved awakening');delete run.pendingAwakening;return run;}
/** v2 -> v3: members gain their level from the saved form; pending boss relics name the next level. */
function upgradeToLevels(run,catalog){
 for(const m of run.party??[])if(m&&!Number.isInteger(m.level))m.level=levelOf(m);
 for(const offer of run.offers??[])if(offer?.type==='evolve'&&!Number.isInteger(offer.level)){
  const m=run.party.find(p=>p.key===offer.member);delete offer.form;offer.level=(m?.level??0)+1;
 }
 for(const h of run.history??[])if(h?.reward?.type==='evolve'&&!Number.isInteger(h.reward.level)){
  const c=catalog[h.reward.member],f=c&&formAt(c,h.reward.form);if(f)h.reward.level=levelOf(f);
 }
 run.version=RUN_VERSION;
 return run;
}
export function migrateRun(input,catalog){
 const obsolete=['stance','meleeStance','rangedStance','stanceSwitch'];
 const hasLegacy=row=>row&&typeof row==='object'&&obsolete.some(key=>Object.hasOwn(row,key));
 const legacy=hasLegacy(input)||(Array.isArray(input?.party)&&input.party.some(hasLegacy));
 // v3 -> v4 (2026-11-10): weapons and wards are optional fields; nothing to convert.
 if(input?.version===3&&!legacy)return validateRun({...clone(input),version:RUN_VERSION},catalog);
 if(input?.version===2&&!legacy)return validateRun(upgradeToLevels(clone(input),catalog),catalog);
 if(input?.version!==1&&!legacy)return validateRun(input,catalog);
 const run=clone(input);
 for(const row of [run,...(Array.isArray(run.party)?run.party:[])])if(hasLegacy(row))for(const key of obsolete)delete row[key];
 if(run.version===2)return validateRun(upgradeToLevels(run,catalog),catalog);
 if(run.version!==1)return validateRun(run,catalog);
 run.version=RUN_VERSION;
 for(const m of run.party??[]){const c=catalog[m.key];if(!c||m.identity!==c.identity||!c.canonicalIdentity)throw Error('Saved unit has no reviewed canonical identity');m.canonicalIdentity=c.canonicalIdentity;}
 return validateRun(upgradeToLevels(run,catalog),catalog);
}
export function validateRun(run,catalog){
 if(run?.version!==RUN_VERSION||typeof run.seed!=='string'||!['setup','battle','rewards','won','lost'].includes(run.phase)
  ||!Number.isInteger(run.rerolls)||run.rerolls<0||run.rerolls>3||!Array.isArray(run.party)
  ||(run.phase==='setup'?![0,3].includes(run.party.length):run.party.length!==3)
  ||!Array.isArray(run.areas)||!run.areas.length||run.areas.length>3||run.areas.some(a=>!Number.isInteger(a.normals)||a.normals<1||a.normals>5||(a.final!==undefined&&a.final!==true))
  ||run.areas.some((a,i)=>a.final&&i!==run.areas.length-1)
  ||!Number.isInteger(run.encounter)||run.encounter<0||run.encounter>encounters(run.areas).length
  ||!Array.isArray(run.offers)||!Array.isArray(run.history)||!run.rng||['roster','skills','rewards','combat'].some(k=>!Number.isInteger(run.rng[k])||run.rng[k]<0||run.rng[k]>0xffffffff))throw Error('Invalid or incompatible run save');
 run.areas.forEach(stageForArea);
 if(run.rules&&(!['sequential','highest-reviewed'].includes(run.rules.awakeningMode)||!validFormPolicy(run.rules.originalForms)))throw Error('Unsupported saved run rules');
 if(run.wards!==undefined&&(!Array.isArray(run.wards)||run.wards.some(e=>!ELEMENTS.includes(e))||new Set(run.wards).size!==run.wards.length))throw Error('Invalid saved wards');
 if(Object.hasOwn(run.rng,'forms')&&(!Number.isInteger(run.rng.forms)||run.rng.forms<0||run.rng.forms>0xffffffff))throw Error('Invalid saved form RNG');
 if(run.pendingAwakening){const p=run.pendingAwakening,c=catalog[p.member],m=run.party.find(m=>m.key===p.member),last=run.history.at(-1);
  const from=c&&formAt(c,p.from?.form),to=c&&formAt(c,p.to?.form);
  if(!['battle','won'].includes(run.phase)||p.encounter!==run.encounter-1||p.id!==`${run.seed}:${p.encounter}:${p.member}:${p.to?.form}`
   ||!from||!to||!(c.forms?.some(f=>f.awakensFrom)?awakeningPath(c,from).includes(to):to.rarity>from.rarity)||m?.form!==to.form||p.from.unitId!==from.unitId||p.from.rarity!==from.rarity
   ||p.to?.form!==m.form||p.to.unitId!==m.unitId||p.to.rarity!==m.rarity||last?.kind!=='reward'||last.encounter!==p.encounter
   ||last.reward?.type!=='evolve'||last.reward.member!==p.member||formForLevel(c,last.reward.level)?.form!==p.to.form)throw Error('Invalid saved awakening presentation');
 }
 if(new Set(run.party.map(m=>m.canonicalIdentity)).size!==run.party.length)throw Error('Saved party contains duplicate canonical characters. Start a new journey; original save is retained until discarded.');
 for(const m of run.party){const c=catalog[m.key],form=c&&formAt(c,m.form);if(!c||m.identity!==c.identity||!c.canonicalIdentity||m.canonicalIdentity!==c.canonicalIdentity||!c.skills.length||!form
   ||m.unitId!==form.unitId||m.rarity!==form.rarity||m.rank!==form.rank
   ||!Number.isInteger(m.level)||m.level<1||m.level>MAX_LEVEL||formForLevel(c,m.level).form!==m.form
   ||!Array.isArray(m.skills)||m.skills.length<1||m.skills.length>3||new Set(m.skills.map(s=>s.id)).size!==m.skills.length
   ||m.skills.some(s=>!c.skills.some(a=>a.id===s.id)||!Number.isInteger(s.level)||s.level<1||s.level>3)
   ||['attack','magic','defense','hp'].some(k=>!Number.isFinite(m.stats?.[k])||m.stats[k]<1||m.stats[k]>3.2)
   ||(m.stats.mp!==undefined&&(!Number.isFinite(m.stats.mp)||m.stats.mp<1||m.stats.mp>3.2))
   ||(m.limit!==undefined&&(!Number.isInteger(m.limit)||m.limit<1||m.limit>LB_MAX||!c.limitBurst))
   ||(m.weapon!==undefined&&!validWeapon(m.weapon))
   ||!Number.isFinite(m.hp)||m.hp<0||m.hp>Math.ceil(c.maxHp*m.stats.hp)||!Number.isFinite(m.mp)||m.mp<0||m.mp>memberMaxMp(c,m))throw Error('Unsupported saved party/skill/form');}
 if(run.phase==='rewards'&&(run.offers.length!==3||run.offers.some(r=>!rewardPool(run,catalog).some(p=>JSON.stringify(p)===JSON.stringify(r)))))throw Error('Invalid saved rewards');
 if(run.phase==='won'?run.encounter!==encounters(run.areas).length:run.encounter>=encounters(run.areas).length)throw Error('Invalid encounter checkpoint');
 return run;
}
export class RunStore{
 constructor(storage,catalog){this.storage=storage;this.catalog=catalog;this.expected=storage.getItem(SAVE_KEY);}
 load(){const raw=this.storage.getItem(SAVE_KEY);this.expected=raw;return raw===null?null:migrateRun(JSON.parse(raw),this.catalog);}
 save(run){validateRun(run,this.catalog);if(this.storage.getItem(SAVE_KEY)!==this.expected)throw Error('Run changed in another tab. Reload to continue.');
  const raw=JSON.stringify(run);this.storage.setItem(SAVE_KEY,raw);this.expected=raw;return run;}
 clear(){if(this.storage.getItem(SAVE_KEY)!==this.expected)throw Error('Run changed in another tab. Reload first.');this.storage.removeItem(SAVE_KEY);this.expected=null;}
}
