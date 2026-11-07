import fs from 'node:fs';
import assert from 'node:assert/strict';
import {evaluateNativeSourceBranches,nativeBranchSlots} from '../src/effects/nativeSourceBranches.mjs';
import {scenePresentationAnchor} from '../src/effects/PreparedSceneBridge.mjs';
import {rendererGeometryScale} from '../src/effects/originalEffectPlayer.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const connected=process.argv.includes('--connected'),receipt=read(process.argv[2]);
const program=read(connected?'tools/data/connected-effect/particle-packet-branch-program.json':'tools/data/connected-effect/quad-branch-program.json');
const manifest=read('public/assets/presentations/cloud_brave_slash/manifest.json');
const effect=manifest.plan.effects.findIndex(e=>e.sha256===program.sourceSha256),member=manifest.plan.members.find(m=>m.effect===effect);
let frames=0,packets=0,worldValues=0;
for(const sample of receipt.results.filter(r=>r.kind===(connected?'native-source-branches-product':'native-quad-product'))){
 assert.deepEqual(sample.snapshot.errors,[]);frames++;
 const expected=evaluateNativeSourceBranches(program,sample.frame,{scale:[1,1,1],origin:[0,0,0]});
 const nodes=Object.values(sample.snapshot.layers).flat();assert.equal(nodes.length,nativeBranchSlots(program).length);
 const anchor=scenePresentationAnchor({...member,startFrame:0},sample.snapshot.host,manifest.plan);
 const scalar=member.scalePercent/100*(anchor.unitsToPixels??1)*rendererGeometryScale(manifest.plan.rendererReference);
 const scale=anchor.rootScale??[scalar,scalar,scalar];
 for(const [i,n]of nodes.entries()){
  assert.deepEqual(n.packet,expected[i].packet);if(!n.packet)continue;packets++;
  for(let j=0;j<6;j++)for(let d=0;d<3;d++){
   const v=n.packet.vertices[j].position[d]*scale[d]+(d===0?anchor.x:d===1?anchor.y:0);
   assert.ok(Math.abs(n.worldVertices[j][d]-v)<1e-10);worldValues++;
  }
 }
}
assert.equal(frames,connected?6:4);assert.equal(packets,connected?67:12);
const ended=receipt.results.find(r=>r.kind===(connected?'native-source-branches-natural-completion':'native-quad-natural-completion'));
assert.equal(ended.completed,1);assert.equal(ended.active,false);
console.log(JSON.stringify({passed:true,frames,packets,worldValues,scope:'Actual BattleScene/PreparedSceneBridge/shared-player packet and world-buffer parity; no original GPU pixel claim'}));
