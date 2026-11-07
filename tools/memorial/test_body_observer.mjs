import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function fixture(){
 const hooks=new Map(),events=[],types=new Map(),names=new Map();let active=true,index=0,cgs=3;
 const pointer=n=>({value:n,toString:()=>`0x${n.toString(16)}`,toInt32:()=>n,isNull:()=>n===0,
   sub:p=>pointer(n-p.value),readByteArray:()=>new Uint8Array(16).buffer});
 const list=['unit-edge','active-cgs','frame-index','anime-counter','anime-ended','anime-x','anime-y',
  'reserve-special','reserve-anime','change-anime','active-unit','active-edge','update-unit'];
 const spec={functions:list.map((name,i)=>{names.set(i+1,name);return {name,symbol:name,head:'00'.repeat(16)};})};
 const make=vm.runInNewContext(fs.readFileSync('tools/memorial/body_observer.js','utf8')+';createBodyObserver',{
  NativeFunction:function(p,type){const name=names.get(p.value);types.set(name,type);return ()=>({
   'unit-edge':pointer(10),'active-cgs':cgs,'frame-index':index,'anime-counter':.25,
   'anime-ended':false,'anime-x':100,'anime-y':200})[name];},
  Interceptor:{attach(p,cb){hooks.set(names.get(p.value),cb);return {};}}
 });
 const observer=make({spec,game:{base:pointer(0),getExportByName:name=>pointer(list.indexOf(name)+1)},
  roots:{listeners:[]},emit:(type,data)=>events.push({type,...JSON.parse(JSON.stringify(data))}),
  active:()=>active,unitIdentity:u=>({object:u.toString(),playerClassMatched:true,unitId:u.value})});
 const update=()=>{const cb=hooks.get('update-unit'),ctx={};cb.onEnter.call(ctx,[pointer(207000206)]);cb.onLeave.call(ctx);};
 return {observer,events,hooks,pointer,types,update,next(){index++;},setCgs(n){cgs=n;},disable(){active=false;}};
}

test('body observer is opt-in, filtered, bounded and records actual states independently of requests',()=>{
 const f=fixture();f.update();assert.equal(f.events.filter(e=>e.type==='body-state').length,0);
 f.observer.begin({bodyCapture:true,bodyUnitIds:[207000206],token:'test'});f.update();f.update();
 assert.equal(f.events.filter(e=>e.type==='body-state').length,1);
 f.hooks.get('active-edge').onEnter.call({returnAddress:f.pointer(100)},[f.pointer(10),f.pointer(13),f.pointer(1),f.pointer(0)]);
 assert.equal(f.events.at(-1).type,'body-cgs-request');assert.equal(f.events.at(-1).cgsId,13);
 const count=f.events.length;
 for(let i=0;i<3000;i++)f.hooks.get('active-edge').onEnter.call({returnAddress:f.pointer(100)},[f.pointer(10),f.pointer(13),f.pointer(1),f.pointer(0)]);
 assert.equal(f.events.length,count,'Repeated idle reservations must not exhaust the trace budget');
 f.next();f.update();assert.equal(f.events.at(-1).cgsId,3);assert.equal(f.events.at(-1).frameIndex,1);
 f.observer.command(f.pointer(207000206),{skillId:227870},99);
 assert.equal(f.events.at(-1).command.skillId,227870);assert.equal(f.events.at(-1).executionId,99);
 f.disable();const before=f.events.length;f.next();f.update();assert.equal(f.events.length,before);
 assert.equal(f.types.get('anime-counter'),'float');
});

test('body capture rejects absent unit filters and clears previous observed state on rearm',()=>{
 const f=fixture();assert.throws(()=>f.observer.begin({bodyCapture:true,bodyUnitIds:[]}));
 f.observer.begin({bodyCapture:true,bodyUnitIds:[2]});f.update();assert.equal(f.events.filter(e=>e.type==='body-state').length,0);
 f.observer.begin({bodyCapture:true,bodyUnitIds:[207000206]});f.update();
 f.observer.begin({bodyCapture:false});f.update();
 assert.equal(f.events.filter(e=>e.type==='body-state').length,1);
});
