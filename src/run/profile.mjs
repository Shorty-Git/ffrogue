// Meta-progression between runs: which heroes the Fate Engine may draw, and the crystals that summon more.
// Pure functions over a JSON profile; GameFlow persists it under PROFILE_KEY. Runs themselves stay
// self-contained (runState.mjs): the profile only narrows the roster pool before a draw.
import {seedHash} from './runState.mjs';
import {summonWeight} from './unitForms.mjs';
export const PROFILE_KEY='ffrogue.profile.v1';
/** Heroes every new profile starts with (the first reviewed roster). Missing keys are ignored. */
export const STARTER_HEROES=['cloud','aerith','barret','squall','delita','jack','cloud_of_darkness'];
export const SUMMON_COST=100;
/** Favourite game (2026-11-11): the player's favourite Final Fantasy shapes the starting roster. Keys are the
 * canonicalIdentity prefixes of run-content.json, in series order. */
export const FAVORITE_GAMES=[['ff1','FINAL FANTASY I'],['ff2','FINAL FANTASY II'],['ff3','FINAL FANTASY III'],['ff4','FINAL FANTASY IV'],
 ['ff5','FINAL FANTASY V'],['ff6','FINAL FANTASY VI'],['ff7','FINAL FANTASY VII'],['ff8','FINAL FANTASY VIII'],['ff9','FINAL FANTASY IX'],
 ['ff10','FINAL FANTASY X'],['ff12','FINAL FANTASY XII'],['ff13','FINAL FANTASY XIII'],['ff15','FINAL FANTASY XV'],['ff16','FINAL FANTASY XVI'],
 ['type0','FINAL FANTASY TYPE-0'],['fft','FINAL FANTASY TACTICS']];
/** A favourite roster always offers at least this many different heroes, topped up from STARTER_HEROES. */
export const FAVORITE_MIN_IDENTITIES=4;
const FAVORITE_FILL=['cloud','squall','delita','jack','cloud_of_darkness','aerith','barret'];
const gameOf=character=>String(character.canonicalIdentity??'').split(':')[0];
/** Heroes a favourite game grants: every base form up to 5 stars; a hero with only higher forms gets its lowest. */
export function favoriteHeroes(catalog,game){
 const keys=drawable(catalog).filter(key=>gameOf(catalog[key])===game);
 const byIdentity=new Map();for(const key of keys)(byIdentity.get(catalog[key].canonicalIdentity)??byIdentity.set(catalog[key].canonicalIdentity,[]).get(catalog[key].canonicalIdentity)).push(key);
 return [...byIdentity.values()].flatMap(list=>{const low=list.filter(key=>(catalog[key].rarity??5)<=5);
  return low.length?low:[list.reduce((a,b)=>(catalog[a].rarity??9)<=(catalog[b].rarity??9)?a:b)];});
}
/** Games with at least one drawable hero, with the heroes a pick would grant. */
export function favoriteChoices(catalog){return FAVORITE_GAMES.map(([game,label])=>({game,label,heroes:favoriteHeroes(catalog,game)})).filter(c=>c.heroes.length);}
/** Records the favourite. A fresh profile (no finished run) starts from that game's heroes, topped up from the
 * starters; a profile with progress keeps everything and gains the game's heroes. */
export function chooseFavorite(input,catalog,game){
 const p=structuredClone(input),heroes=favoriteHeroes(catalog,game);
 if(!heroes.length)throw Error('Unknown favourite game: '+game);
 const fresh=p.record.won+p.record.lost===0;
 const unlocked=fresh?[...heroes]:[...new Set([...p.unlocked,...heroes])];
 // Top-up mixes games (one hero per series first) so no single game fills every favourite roster.
 for(const key of FAVORITE_FILL){if(!catalog[key]||unlocked.includes(key)||unlocked.some(k=>catalog[k]&&catalog[k].canonicalIdentity===catalog[key].canonicalIdentity))continue;
  if(new Set(unlocked.filter(k=>catalog[k]).map(k=>catalog[k].canonicalIdentity)).size>=FAVORITE_MIN_IDENTITIES)break;unlocked.push(key);}
 p.unlocked=unlocked;p.favorite=game;p.bond=Object.fromEntries(Object.entries(p.bond).filter(([key])=>unlocked.includes(key)));
 return normalizeProfile(p,catalog);
}
/** Crystals per battle won, and the bonus for finishing an expedition. */
export const CRYSTALS_PER_BATTLE=10,CRYSTALS_PER_EXPEDITION=60;
/** Duplicates give Bond (docs/progression-design.md), capped so the Fate Engine keeps its tension:
 * 1 = drawn more often, 2 = choose the starting skill, 3 = never starts below Lv 2.
 * A duplicate at maximum Bond returns BOND_REFUND crystals. */
export const MAX_BOND=3,BOND_DRAW_WEIGHT=1.5,BOND_MIN_START_LEVEL=2,BOND_REFUND=40;
const drawable=catalog=>Object.keys(catalog).filter(key=>catalog[key].canonicalIdentity&&catalog[key].skills.length);
export function newProfile(catalog){
 return {version:1,unlocked:STARTER_HEROES.filter(key=>catalog[key]),crystals:0,record:{won:0,lost:0},settled:[],bond:{},bosses:[]};
}
/** Unknown keys (characters removed from the build) are dropped; never fewer than three identities. */
export function normalizeProfile(input,catalog){
 const p=input?.version===1?structuredClone(input):newProfile(catalog);
 p.unlocked=[...new Set((Array.isArray(p.unlocked)?p.unlocked:[]).filter(key=>catalog[key]))];
 p.crystals=Number.isInteger(p.crystals)&&p.crystals>=0?p.crystals:0;
 p.record={won:p.record?.won|0,lost:p.record?.lost|0};
 p.settled=Array.isArray(p.settled)?p.settled.slice(-20):[];
 p.bond=Object.fromEntries(Object.entries(p.bond??{}).filter(([key,n])=>p.unlocked.includes(key)&&Number.isInteger(n)&&n>0).map(([key,n])=>[key,Math.min(MAX_BOND,n)]));
 p.favorite=typeof p.favorite==='string'?p.favorite:undefined;if(p.favorite===undefined)delete p.favorite;
 // Final boss rooms already won: their boss is shown on the boss choice (2026-11-11), unknown ones as ???.
 p.bosses=[...new Set((Array.isArray(p.bosses)?p.bosses:[]).filter(id=>typeof id==='string'))];
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
/** Summon weights by base rarity (unitForms SUMMON_WEIGHTS): a 3★ base unit is drawn ~8× as often as an NV unit. */
export const summonPool=(catalog,keys=drawable(catalog))=>keys.map(key=>{
 const weight=summonWeight(catalog[key]);
 if(!(weight>0))throw Error(`Summon weight needs the base rarity of ${key}`);
 return {key,weight};
});
function weightedPick(pool,salt){
 const total=pool.reduce((sum,entry)=>sum+entry.weight,0);
 let roll=seedHash(salt)%(total*1000)/1000;
 for(const entry of pool){roll-=entry.weight;if(roll<0)return entry.key;}
 return pool.at(-1).key;
}
function unlockRandom(p,catalog,salt){
 const locked=lockedHeroes(p,catalog);
 if(!locked.length)return null;
 const key=weightedPick(summonPool(catalog,locked),salt);
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
 const finalRoom=run.areas?.at(-1)?.stageId;if(won&&finalRoom&&!p.bosses.includes(finalRoom))p.bosses.push(finalRoom);
 const unlocked=won?unlockRandom(p,catalog,id+':unlock'):null;
 return {profile:p,crystals,unlocked};
}
/** Spends SUMMON_COST crystals on one hero from the whole drawable roster. A new hero is unlocked; a
 * duplicate raises its Bond, and a duplicate at MAX_BOND refunds BOND_REFUND crystals. */
export function summonHero(input,catalog,salt){
 const p=structuredClone(input);
 if(p.crystals<SUMMON_COST)throw Error('Not enough crystals');
 p.crystals-=SUMMON_COST;
 const key=weightedPick(summonPool(catalog),salt);
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
