import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {nativePriorityOrder,validateNativeSubmission,nativeSubmissionRanks} from '../src/effects/nativeDrawSubmission.mjs';
import {createEffectPlayer} from '../src/effects/originalEffectPlayer.mjs';
const folder='tools/data/memorial-audit/diagnostic-v35-render-context/';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));

test('original non-full-Z sort matches independent synthetic instruction controls including near ties and disabled sorting',()=>{
  const ref=read(folder+'priority-native-controls.json');
  assert.equal(ref.identity.sha256,'b13ed36367925370f63fe89f10fcd8ce7de322e90e4bb7af316ec3882d7dad69');
  assert.equal(ref.cases.length,134);
  for(const c of ref.cases){
    assert.deepEqual(nativePriorityOrder(c.priorities,c.enabled),c.order,JSON.stringify(c));
    assert.deepEqual(c.callbackOrder,c.priorities.map((_,i)=>i),'Original generation order stays separate');
  }
});
test('source priorities control submission independently of blend, texture and arbitrary depth',()=>{
  const priorities=[.8,.2,.7,.1],blends=[1,2,1,2];
  assert.deepEqual(nativePriorityOrder(priorities),[3,1,2,0]);
  assert.notDeepEqual(nativePriorityOrder(priorities),[0,2,1,3]);
  assert.deepEqual(blends,[1,2,1,2]);
  assert.deepEqual(nativePriorityOrder([.5,.5,.5]),[0,1,2]);
  assert.throws(()=>nativePriorityOrder([NaN]));
  const program=read(folder+'program-j-ordered.json'),slots=program.branches.map(program=>({program}));
  validateNativeSubmission(program.drawSubmission,slots,program.sourceSha256);
  assert.throws(()=>validateNativeSubmission({...program.drawSubmission,fullZSort:true},slots,program.sourceSha256));
  assert.throws(()=>validateNativeSubmission({...program.drawSubmission,sourceSha256:'other'},slots,program.sourceSha256));
  assert.throws(()=>validateNativeSubmission({...program.drawSubmission,priorities:{}},slots,program.sourceSha256));
});
test('native metadata sorting groups all live primitives by emitter, including zero-alpha packets',()=>{
  const ref=read(folder+'priority-native-controls.json');
  for(const c of ref.cases.filter(c=>c.priorities.length<=32)){
    const slots=[],packets=[],indices=[],priorities={};
    for(const [i,p]of c.priorities.entries()){
      const program={node:{index:i}};priorities[i]=p;indices[i]=[];
      for(let j=0;j<1+i%4;j++){
        indices[i].push(slots.length);slots.push({program});packets.push({packet:{visible:j%2===0}});
      }
    }
    const ranks=nativeSubmissionRanks({priorities,prioritySort:c.enabled},slots,packets);
    const actual=ranks.map((rank,i)=>({rank,i})).sort((a,b)=>a.rank-b.rank).map(r=>r.i);
    assert.deepEqual(actual,c.order.flatMap(i=>indices[i]));
  }
});
test('common source player changes only GPU submission and retains every packet, material and lifecycle output',async()=>{
  const context=vm.createContext({console});vm.runInContext(fs.readFileSync('public/vendor/three-preview.js','utf8'),context);
  const THREE=context.THREE;
  THREE.TextureLoader=class{load(url,done){const t=new THREE.Texture({width:1,height:1});queueMicrotask(()=>done(t));return t;}};
  const fixture=read(folder+'pixel-fixture-j.json'),before=fixture.plan,after=structuredClone(before);
  after.nativeQuadBranches=read(folder+'program-j-ordered.json');
  const scenes=[new THREE.Scene(),new THREE.Scene()],players=[];
  try{
    for(const [i,plan]of [before,after].entries())players.push(await createEffectPlayer(THREE,scenes[i],plan));
    for(let frame=0;frame<=21;frame++){
      for(const p of players)p.update(frame,()=>({x:149,y:736,rootScale:[1.775,1.775,1.775]}));
      assert.deepEqual(players[1].traceSnapshot(),players[0].traceSnapshot(),'Packet/simulation identity F'+frame);
      const trace=players[1].traceSnapshot();
      const ordered=Array.from(scenes[1].children[0].children,(m,i)=>({m,i})).filter(x=>x.m.visible).sort((a,b)=>a.m.renderOrder-b.m.renderOrder);
      const nodes=ordered.map(({i})=>trace[i].node);
      assert.deepEqual(nodes,[2,4,3,6,8].flatMap(node=>nodes.filter(n=>n===node)));
      const particles=ordered.filter(({i})=>trace[i].node===8).map(({i})=>trace[i].instance);
      assert.deepEqual(particles,[...particles].sort((a,b)=>a-b));
      for(let i=0;i<scenes[0].children[0].children.length;i++){
        const a=scenes[0].children[0].children[i].material,b=scenes[1].children[0].children[i].material;
        for(const key of ['blendSrc','blendDst','blendEquation','depthTest','depthWrite','side'])assert.equal(a[key],b[key]);
      }
    }
  }finally{for(const p of players)p.dispose();}
  assert.ok(scenes.every(s=>s.children.length===0));
});
