// Loop v2 run skeleton rules (src/run/actMap.mjs, src/run/encounterRules.mjs): act maps, elites, boss rules, scaling.
import test from 'node:test';import assert from 'node:assert/strict';
import {actMap,mapPaths,mapProblems,nextNodes,validTrail,bossNodeId,ACT_ROWS,ACT_COLUMNS,ROW_TYPES,PATH_FIGHTS,PATH_ELITES,NODE_TYPES,COMBAT_NODES} from '../src/run/actMap.mjs';
import {actScaling,ACT_SCALING,eliteAffix,ELITE_AFFIXES,bossRule,BOSS_RULES,ruleMpCost,ruleRegen,doomFalls} from '../src/run/encounterRules.mjs';
const SEEDS=Array.from({length:400},(_,i)=>'map-'+i);
test('act maps are deterministic per seed and act and differ between acts and seeds',()=>{
 assert.deepEqual(actMap('same',0),actMap('same',0));
 assert.notDeepEqual(actMap('same',0).nodes.map(n=>n.type),actMap('same',1).nodes.map(n=>n.type));
 assert.ok(new Set(SEEDS.slice(0,40).map(s=>JSON.stringify(actMap(s,0)))).size>30,'seeds give different maps');
});
test('every act map: rows of 2-4 nodes, edges to the next row only and never crossing, one boss',()=>{
 for(const seed of SEEDS)for(const act of [0,1,2]){
  const map=actMap(seed,act),byId=new Map(map.nodes.map(n=>[n.id,n]));
  assert.equal(map.nodes.filter(n=>n.type==='boss').length,1);assert.equal(map.nodes.at(-1).id,bossNodeId(act));
  assert.ok(map.nodes.filter(n=>n.row===0).length>=2,'branches from the start');
  for(let row=0;row<ACT_ROWS;row++){const width=map.nodes.filter(n=>n.row===row).length;assert.ok(width>=1&&width<=ACT_COLUMNS);}
  for(const n of map.nodes){
   assert.ok(n.col>=0&&n.col<ACT_COLUMNS);
   if(n.type!=='boss')assert.ok(n.next.length>=1);
   for(const id of n.next){const m=byId.get(id);assert.ok(m,'edge target exists');assert.equal(m.row,n.row+1);if(m.type!=='boss')assert.ok(Math.abs(m.col-n.col)<=1,'neighbouring column');}
   if(n.row>0)assert.ok(map.nodes.some(p=>p.next.includes(n.id)),'every node is reachable');
  }
  const edges=map.nodes.flatMap(n=>n.next.filter(id=>byId.get(id).type!=='boss').map(id=>({row:n.row,from:n.col,to:byId.get(id).col})));
  for(const a of edges)for(const b of edges)if(a.row===b.row)assert.ok((a.from-b.from)*(a.to-b.to)>=0,`${seed} act ${act}: crossing edges`);
 }
});
test('node types follow the row rules; every path holds 2-3 fights and few elites, no elite twice in a row',()=>{
 const counts=Object.fromEntries(NODE_TYPES.map(t=>[t,0]));
 for(const seed of SEEDS)for(const act of [0,1,2]){
  const map=actMap(seed,act);
  assert.deepEqual(mapProblems(map,act),[]);
  for(const n of map.nodes){counts[n.type]++;if(n.type!=='boss')assert.ok(Object.hasOwn(ROW_TYPES[n.row],n.type),`${n.type} on row ${n.row}`);}
  for(const path of mapPaths(map)){
   const below=path.slice(0,-1),fights=below.filter(n=>COMBAT_NODES.has(n.type)).length;
   assert.ok(fights>=PATH_FIGHTS.min&&fights<=PATH_FIGHTS.max);
   assert.ok(below.filter(n=>n.type==='elite').length<=PATH_ELITES[act]);
   assert.equal(path.at(-1).type,'boss');assert.equal(path.length,ACT_ROWS+1);
   assert.equal(below.at(-1).type,'campfire','a campfire waits before every boss');
   assert.equal(below[0].type,'battle','every act opens with a fight');
  }
  assert.ok(map.nodes.some(n=>n.type==='elite')&&map.nodes.some(n=>n.type==='merchant')&&map.nodes.some(n=>n.type==='event'));
 }
 assert.ok(Object.values(counts).every(c=>c>0),JSON.stringify(counts));
 // 3 acts x (2..3 fights + boss) + final boss = 10..13 fights per run.
 assert.equal(3*(PATH_FIGHTS.min+1)+1,10);assert.equal(3*(PATH_FIGHTS.max+1)+1,13);
});
test('the final boss room is a single boss node; trails follow edges only',()=>{
 const final=actMap('room',3,true);assert.deepEqual(final.nodes.map(n=>n.type),['boss']);assert.deepEqual(nextNodes(final,null).map(n=>n.id),[bossNodeId(3)]);
 const map=actMap('trail',0),[path]=mapPaths(map);
 assert.ok(validTrail(map,path.map(n=>n.id)));assert.ok(validTrail(map,[]));
 assert.ok(!validTrail(map,path.slice(1).map(n=>n.id)),'must start in row 0');
 assert.ok(!validTrail(map,[path[0].id,path[2].id]),'no row skipped');
 assert.throws(()=>nextNodes(map,'nowhere'),/Unknown map node/);assert.throws(()=>actMap('x',-1));
});
test('enemy scaling grows per act and per row; elites get one seeded affix, bosses one rule per act',()=>{
 for(let act=1;act<ACT_SCALING.length;act++){assert.ok(actScaling(act).hp>actScaling(act-1).hp);assert.ok(actScaling(act).damage>actScaling(act-1).damage);}
 assert.ok(actScaling(0,5).hp>actScaling(0,0).hp);assert.deepEqual(actScaling(0,0),{hp:1,damage:1});assert.deepEqual(actScaling(9),actScaling(3));
 const affixes=new Set();
 for(const seed of SEEDS){const a=eliteAffix(seed,'a0r2c1');assert.deepEqual(eliteAffix(seed,'a0r2c1'),a);assert.ok(ELITE_AFFIXES[a.id]);affixes.add(a.id);
  const rules=[0,1,2,3].map(act=>bossRule(seed,act).id);rules.slice(1).forEach((r,i)=>assert.notEqual(r,rules[i],'consecutive bosses differ'));}
 assert.equal(affixes.size,Object.keys(ELITE_AFFIXES).length);
 for(const m of [...Object.values(ELITE_AFFIXES),...Object.values(BOSS_RULES)]){assert.ok(m.name&&m.text&&m.text.length<80,'one tooltip line');}
});
test('rule hooks: MP cost doubles under Silence, regeneration rounds, Doom falls after its limit',()=>{
 assert.equal(ruleMpCost(25,BOSS_RULES.silence),50);assert.equal(ruleMpCost(25,BOSS_RULES.doom),25);assert.equal(ruleMpCost(7,undefined),7);
 assert.equal(ruleRegen(10000,ELITE_AFFIXES.regenerating),600);assert.equal(ruleRegen(10000,ELITE_AFFIXES.enraged),0);
 assert.ok(!doomFalls(12,BOSS_RULES.doom));assert.ok(doomFalls(13,BOSS_RULES.doom));assert.ok(!doomFalls(99,BOSS_RULES.silence));
});
