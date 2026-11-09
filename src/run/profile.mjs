// Meta-progression between runs: which heroes the Fate Engine may draw, and the crystals that summon more.
// Pure functions over a JSON profile; GameFlow persists it under PROFILE_KEY. Runs themselves stay
// self-contained (runState.mjs): the profile only narrows the roster pool before a draw.
import {seedHash} from './runState.mjs';
export const PROFILE_KEY='ffrogue.profile.v1';
/** Heroes every new profile starts with (the first reviewed roster). Missing keys are ignored. */
export const STARTER_HEROES=['cloud','aerith','barret','squall','delita','jack','cloud_of_darkness'];
export const SUMMON_COST=100;
/** Crystals per battle won, and the bonus for finishing an expedition. */
export const CRYSTALS_PER_BATTLE=10,CRYSTALS_PER_EXPEDITION=60;
/** Duplicates give Bond (docs/progression-design.md), capped so the Fate Engine keeps its tension:
 * 1 = drawn more often, 2 = choose the starting skill, 3 = never starts below Lv 2.
 * A duplicate at maximum Bond returns BOND_REFUND crystals. */
export const MAX_BOND=3,BOND_DRAW_WEIGHT=1.5,BOND_MIN_START_LEVEL=2,BOND_REFUND=40;
const drawable=catalog=>Object.keys(catalog).filter(key=>catalog[key].canonicalIdentity&&catalog[key].skills.length);
export function newProfile(catalog){
 return {version:1,unlocked:STARTER_HEROES.filter(key=>catalog[key]),crystals:0,record:{won:0,lost:0},settled:[],bond:{}};
}
/** Unknown keys (characters removed from the build) are dropped; never fewer than three identities. */
export function normalizeProfile(input,catalog){
 const p=input?.version===1?structuredClone(input):newProfile(catalog);
 p.unlocked=[...new Set((Array.isArray(p.unlocked)?p.unlocked:[]).filter(key=>catalog[key]))];
 p.crystals=Number.isInteger(p.crystals)&&p.crystals>=0?p.crystals:0;
 p.record={won:p.record?.won|0,lost:p.record?.lost|0};
 p.settled=Array.isArray(p.settled)?p.settled.slice(-20):[];
 p.bond=Object.fromEntries(Object.entries(p.bond??{}).filter(([key,n])=>p.unlocked.includes(key)&&Number.isInteger(n)&&n>0).map(([key,n])=>[key,Math.min(MAX_BOND,n)]));
 // Top up from the starters, then from the whole roster, until the Fate Engine can draw three heroes.
 for(const key of [...STARTER_HEROES,...drawable(catalog)]){
  if(identities(p,catalog)>=3)break;
  if(catalog[key]&&!p.unlocked.includes(key))p.unlocked.push(key);
 }
 return p;
}
const identities=(p,catalog)=>new Set(p.unlocked.filter(key=>drawable(catalog).includes(key)).map(key=>catalog[key].canonicalIdentity)).size;
export const lockedHeroes=(p,catalog)=>drawable(catalog).filter(key=>!p.unlocked.includes(key));
/** The catalog slice the slot machine draws from, with Bond perks attached (drawWeight, startSkillChoice,
 * minStartLevel; read by runState.rollParty). Saved runs keep validating against the full catalog. */
export function drawCatalog(p,catalog){
 return Object.fromEntries(Object.entries(catalog).filter(([key])=>p.unlocked.includes(key)).map(([key,character])=>{
  const bond=p.bond?.[key]??0;
  return [key,bond?{...character,bond,...(bond>=1?{drawWeight:BOND_DRAW_WEIGHT}:{}),...(bond>=2?{startSkillChoice:true}:{}),
   ...(bond>=3?{minStartLevel:BOND_MIN_START_LEVEL}:{})}:character];
 }));
}
function unlockRandom(p,catalog,salt){
 const locked=lockedHeroes(p,catalog);
 if(!locked.length)return null;
 const key=locked[seedHash(salt)%locked.length];
 p.unlocked.push(key);
 return key;
}
/** Settles a finished run once (keyed by seed): crystals for every won battle, a new hero for a won expedition. */
export function settleRun(input,run,catalog){
 const p=structuredClone(input),id=run.seed+':'+run.history.length;
 if(!['won','lost'].includes(run.phase)||p.settled.includes(id))return {profile:p,crystals:0,unlocked:null};
 const battles=run.history.filter(h=>h.kind==='reward').length,won=run.phase==='won';
 const crystals=battles*CRYSTALS_PER_BATTLE+(won?CRYSTALS_PER_EXPEDITION:0);
 p.crystals+=crystals;p.record[won?'won':'lost']++;p.settled.push(id);p.settled=p.settled.slice(-20);
 const unlocked=won?unlockRandom(p,catalog,id+':unlock'):null;
 return {profile:p,crystals,unlocked};
}
/** Spends SUMMON_COST crystals on one hero from the whole drawable roster. A new hero is unlocked; a
 * duplicate raises its Bond, and a duplicate at MAX_BOND refunds BOND_REFUND crystals. */
export function summonHero(input,catalog,salt){
 const p=structuredClone(input);
 if(p.crystals<SUMMON_COST)throw Error('Not enough crystals');
 const pool=drawable(catalog);
 p.crystals-=SUMMON_COST;
 const key=pool[seedHash(salt)%pool.length];
 if(!p.unlocked.includes(key)){p.unlocked.push(key);return {profile:p,unlocked:key,hero:key,bond:0,refund:0};}
 const bond=p.bond[key]??0;
 if(bond>=MAX_BOND){p.crystals+=BOND_REFUND;return {profile:p,unlocked:null,hero:key,bond,refund:BOND_REFUND};}
 p.bond[key]=bond+1;
 return {profile:p,unlocked:null,hero:key,bond:bond+1,refund:0};
}
export class ProfileStore{
 constructor(storage,catalog){this.storage=storage;this.catalog=catalog;}
 load(){let raw=null;try{raw=JSON.parse(this.storage.getItem(PROFILE_KEY)??'null');}catch{/* corrupt: start fresh */}
  return normalizeProfile(raw,this.catalog);}
 save(profile){try{this.storage.setItem(PROFILE_KEY,JSON.stringify(profile));}catch{/* private mode: progress lasts this session */}return profile;}
}
