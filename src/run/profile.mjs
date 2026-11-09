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
const drawable=catalog=>Object.keys(catalog).filter(key=>catalog[key].canonicalIdentity&&catalog[key].skills.length);
export function newProfile(catalog){
 return {version:1,unlocked:STARTER_HEROES.filter(key=>catalog[key]),crystals:0,record:{won:0,lost:0},settled:[]};
}
/** Unknown keys (characters removed from the build) are dropped; never fewer than three identities. */
export function normalizeProfile(input,catalog){
 const p=input?.version===1?structuredClone(input):newProfile(catalog);
 p.unlocked=[...new Set((Array.isArray(p.unlocked)?p.unlocked:[]).filter(key=>catalog[key]))];
 p.crystals=Number.isInteger(p.crystals)&&p.crystals>=0?p.crystals:0;
 p.record={won:p.record?.won|0,lost:p.record?.lost|0};
 p.settled=Array.isArray(p.settled)?p.settled.slice(-20):[];
 // Top up from the starters, then from the whole roster, until the Fate Engine can draw three heroes.
 for(const key of [...STARTER_HEROES,...drawable(catalog)]){
  if(identities(p,catalog)>=3)break;
  if(catalog[key]&&!p.unlocked.includes(key))p.unlocked.push(key);
 }
 return p;
}
const identities=(p,catalog)=>new Set(p.unlocked.filter(key=>drawable(catalog).includes(key)).map(key=>catalog[key].canonicalIdentity)).size;
export const lockedHeroes=(p,catalog)=>drawable(catalog).filter(key=>!p.unlocked.includes(key));
/** The catalog slice the slot machine draws from. Saved runs keep validating against the full catalog. */
export function drawCatalog(p,catalog){
 return Object.fromEntries(Object.entries(catalog).filter(([key])=>p.unlocked.includes(key)));
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
/** Spends SUMMON_COST crystals on one locked hero. */
export function summonHero(input,catalog,salt){
 const p=structuredClone(input);
 if(p.crystals<SUMMON_COST)throw Error('Not enough crystals');
 if(!lockedHeroes(p,catalog).length)throw Error('Every hero has already answered the call');
 p.crystals-=SUMMON_COST;
 return {profile:p,unlocked:unlockRandom(p,catalog,salt)};
}
export class ProfileStore{
 constructor(storage,catalog){this.storage=storage;this.catalog=catalog;}
 load(){let raw=null;try{raw=JSON.parse(this.storage.getItem(PROFILE_KEY)??'null');}catch{/* corrupt: start fresh */}
  return normalizeProfile(raw,this.catalog);}
 save(profile){try{this.storage.setItem(PROFILE_KEY,JSON.stringify(profile));}catch{/* private mode: progress lasts this session */}return profile;}
}
