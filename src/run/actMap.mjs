// Act maps (loop v2, docs/game-design.md "Run structure"): three acts plus the final boss room. Each act is a
// small seeded branching map in the spirit of Slay the Spire (docs/research/roguelike-loop-references.md):
// paths climb row by row to the act boss, edges never cross, and node types follow fixed row rules so every
// path holds a similar number of fights. Pure rules: no RNG streams, only seed hashes, so a map can always be
// recomputed from the seed for save validation and is never stored.

/** Node types the player sees on the map. */
export const NODE_TYPES=['battle','elite','event','merchant','campfire','treasure','boss'];
export const COMBAT_NODES=new Set(['battle','elite','boss']);
export const NODE_LABELS={battle:'Battle',elite:'Elite',event:'Event',merchant:'Moogle Merchant',campfire:'Campfire',treasure:'Treasure',boss:'Boss'};
/** Rows below the boss row and the map width (columns). */
export const ACT_ROWS=6,ACT_COLUMNS=4;
/** Paths drawn per act; overlapping paths merge, so a map has 3–4 nodes per row. */
export const ACT_PATHS=4;
/** Node type weights per row (row 0 is the bottom). A single-type row is fixed for every node. */
export const ROW_TYPES=[
 {battle:1},
 {battle:3,event:2},
 {battle:3,elite:2,event:1,merchant:1},
 {treasure:1},
 {battle:3,elite:2,event:1,merchant:1},
 {campfire:1},
];
/** Combat nodes (battle or elite) every path holds below the boss: with the boss, 3–4 fights per act and
 * 10–13 per run including the final boss room. */
export const PATH_FIGHTS={min:2,max:3};
/** Elites a single path may hold, by act (the first act is gentler). */
export const PATH_ELITES=[1,2,2];
const GENERATION_ATTEMPTS=64;

function hash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
const nodeId=(act,row,col)=>`a${act}r${row}c${col}`;
export const bossNodeId=act=>`a${act}boss`;
function weighted(weights,roll){
 const entries=Object.entries(weights),total=entries.reduce((sum,[,w])=>sum+w,0);
 let at=roll%total;
 for(const [type,w] of entries){if(at<w)return type;at-=w;}
 return entries.at(-1)[0];
}
/** Two edges between the same rows cross when their columns swap order. */
const crosses=(a,b)=>(a.from-b.from)*(a.to-b.to)<0;
function drawPaths(salt){
 const edges=[];// per row: [{from,to}]
 const paths=[];
 for(let p=0;p<ACT_PATHS;p++){
  // The first two paths start in different columns so every map branches from the start.
  let col=hash(salt+':start:'+p)%ACT_COLUMNS;
  if(p===1&&col===paths[0][0])col=(col+1+hash(salt+':shift')%(ACT_COLUMNS-1))%ACT_COLUMNS;
  const path=[col];
  for(let row=0;row<ACT_ROWS-1;row++){
   const options=[col-1,col,col+1].filter(c=>c>=0&&c<ACT_COLUMNS);
   const start=hash(salt+':step:'+p+':'+row)%options.length;
   let next=col;
   for(let i=0;i<options.length;i++){
    const candidate=options[(start+i)%options.length];
    if(!(edges[row]??[]).some(e=>crosses(e,{from:col,to:candidate}))){next=candidate;break;}
   }
   (edges[row]??=[]).push({from:col,to:next});
   col=next;path.push(col);
  }
  paths.push(path);
 }
 return paths;
}
/** Rows after `row` whose types include a fight (battle or elite). */
const fightRowsAfter=row=>ROW_TYPES.slice(row+1).filter(types=>types.battle||types.elite).length;
/** Types the node may take so that every path through it can still end with PATH_FIGHTS fights and no more
 * elites than the act allows (constructive typing: far fewer rejected maps than drawing freely). */
function allowedTypes(row,incoming,eliteLimit){
 const remaining=fightRowsAfter(row);
 return Object.keys(ROW_TYPES[row]).filter(type=>{
  const fight=type==='battle'||type==='elite'?1:0;
  if(incoming.hi+fight>PATH_FIGHTS.max||incoming.lo+fight+remaining<PATH_FIGHTS.min)return false;
  if(type==='elite'&&(incoming.elites+1>eliteLimit||incoming.eliteParent))return false;
  return true;
 });
}
function buildNodes(act,paths,salt){
 const nodes=new Map(),eliteLimit=PATH_ELITES[Math.min(act,PATH_ELITES.length-1)];
 for(const path of paths)path.forEach((col,row)=>{
  const id=nodeId(act,row,col);
  if(!nodes.has(id))nodes.set(id,{id,row,col,type:null,next:[]});
  const node=nodes.get(id),next=row<ACT_ROWS-1?nodeId(act,row+1,path[row+1]):bossNodeId(act);
  if(!node.next.includes(next))node.next.push(next);
 });
 // Type the rows bottom-up; each node knows the fight range of the paths that reach it.
 const reach=new Map();// id -> {lo,hi,elites,eliteParent}
 const ordered=[...nodes.values()].sort((a,b)=>a.row-b.row||a.col-b.col);
 for(const node of ordered){
  const incoming=reach.get(node.id)??{lo:0,hi:0,elites:0,eliteParent:false};
  const allowed=allowedTypes(node.row,incoming,eliteLimit);
  const weights=Object.fromEntries(allowed.map(type=>[type,ROW_TYPES[node.row][type]]));
  node.type=allowed.length?weighted(weights,hash(salt+':type:'+node.id)):weighted(ROW_TYPES[node.row],hash(salt+':type:'+node.id));
  const fight=node.type==='battle'||node.type==='elite'?1:0,elite=node.type==='elite'?1:0;
  for(const id of node.next){
   const out={lo:incoming.lo+fight,hi:incoming.hi+fight,elites:incoming.elites+elite,eliteParent:node.type==='elite'};
   const prior=reach.get(id);
   reach.set(id,prior?{lo:Math.min(prior.lo,out.lo),hi:Math.max(prior.hi,out.hi),elites:Math.max(prior.elites,out.elites),eliteParent:prior.eliteParent||out.eliteParent}:out);
  }
  node.next.sort();
 }
 const boss={id:bossNodeId(act),row:ACT_ROWS,col:Math.floor((ACT_COLUMNS-1)/2),type:'boss',next:[]};
 return [...ordered,boss];
}
/** Every path from a start node to the boss, as node lists. */
export function mapPaths(map){
 const byId=new Map(map.nodes.map(n=>[n.id,n])),result=[];
 const walk=(node,trail)=>{const path=[...trail,node];if(!node.next.length){result.push(path);return;}for(const id of node.next)walk(byId.get(id),path);};
 for(const node of map.nodes.filter(n=>n.row===0))walk(node,[]);
 return result;
}
/** Map rules every generated act must satisfy (also checked by tools/test_act_map.mjs). */
export function mapProblems(map,act){
 const problems=[],types=map.nodes.map(n=>n.type);
 for(const path of mapPaths(map)){
  const below=path.filter(n=>n.type!=='boss'),fights=below.filter(n=>n.type==='battle'||n.type==='elite').length;
  const elites=below.filter(n=>n.type==='elite').length;
  if(fights<PATH_FIGHTS.min||fights>PATH_FIGHTS.max)problems.push('path fights '+fights);
  if(elites>PATH_ELITES[Math.min(act,PATH_ELITES.length-1)])problems.push('path elites '+elites);
  if(below.some((n,i)=>i>0&&n.type==='elite'&&below[i-1].type==='elite'))problems.push('consecutive elites');
 }
 for(const type of ['elite','event','merchant'])if(!types.includes(type))problems.push('no '+type);
 if(map.nodes.filter(n=>n.row===0).length<2)problems.push('single start');
 return problems;
}
/** The act map of a run: deterministic per seed and act. The final boss room is a single boss node. */
export function actMap(seed,act,final=false){
 if(!Number.isInteger(act)||act<0)throw Error('Invalid act: '+act);
 if(final)return {act,final:true,nodes:[{id:bossNodeId(act),row:0,col:Math.floor((ACT_COLUMNS-1)/2),type:'boss',next:[]}]};
 for(let attempt=0;attempt<GENERATION_ATTEMPTS;attempt++){
  const salt=`${seed}:act:${act}:${attempt}`;
  const map={act,nodes:buildNodes(act,drawPaths(salt),salt)};
  if(!mapProblems(map,act).length)return map;
 }
 throw Error('No valid act map for seed '+seed+', act '+act);
}
export const mapNode=(map,id)=>map.nodes.find(n=>n.id===id)??null;
/** Nodes the party may enter next: the start row before the first node, else the current node's successors. */
export function nextNodes(map,at){
 if(at==null)return map.nodes.filter(n=>n.row===0);
 const node=mapNode(map,at);
 if(!node)throw Error('Unknown map node: '+at);
 return node.next.map(id=>mapNode(map,id));
}
/** A visited trail is valid when it starts in row 0 and follows edges. */
export function validTrail(map,trail){
 if(!Array.isArray(trail))return false;
 let at=null;
 for(const id of trail){if(!nextNodes(map,at).some(n=>n.id===id))return false;at=id;}
 return true;
}
