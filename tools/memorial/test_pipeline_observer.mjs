import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('tools/memorial/pipeline_observer.js','utf8');
class Pointer {
  constructor(value,memory){this.value=value;this.memory=memory;}
  add(n){return new Pointer(this.value+n,this.memory);}
  sub(p){return new Pointer(this.value-(p instanceof Pointer?p.value:p),this.memory);}
  equals(p){return this.value===p.value;}
  isNull(){return this.value===0;}
  toString(){return '0x'+this.value.toString(16);}
  toUInt32(){return this.value;}
  toInt32(){return this.value|0;}
  readPointer(){return this.memory.get(this.value)??new Pointer(0,this.memory);}
  readU32(){return this.memory.get(this.value)??0;}
  readS32(){return this.memory.get(this.value)??0;}
  readFloat(){return this.memory.get(this.value)??0;}
}
function fixture(withGpu=false,options={}){
  let activeWindow=true;
  const memory=new Map(),pointer=n=>new Pointer(n,memory),registered=new Map(),messages=[];
  const emitter=pointer(0x2000),parameter=pointer(0x3000),context=pointer(0x6000),record=pointer(0x5000);
  for(const [at,value] of [[0x20f0,parameter],[0x2030,pointer(0x4000)],[0x4000,pointer(0x4100)],[0x4008,1],[0x4100,pointer(0x1100)],
    [0x6010,parameter],[0x6000,record],[0x6030,pointer(0x2130)],[0x6040,.25],[0x6050,.5],[0x5000,1]])memory.set(at,value);
  let allocation=0x9000,currentGpuContext=true;
  const gpuQueries=[],gpuExports=new Map(['glGetIntegerv','glIsEnabled','glGetString','glDrawArrays','glDrawElements'].map((name,i)=>[name,pointer(0x8000+i*8)]));
  const gl={getExportByName:name=>{if(!gpuExports.has(name))throw Error('Unexpected GL API '+name);return gpuExports.get(name);}};
  const gpuFunctions=new Map([
    [0x8000,(key,out)=>{gpuQueries.push(key);const values=key===0xba2?[0,0,1080,1920]:key===0xc10?[10,20,800,900]:key===0x8ca6?[7]:key===0x8b8d?[42]:null;
      if(!values)throw Error('Unexpected GL query');values.forEach((v,i)=>memory.set(out.value+i*4,v));}],
    [0x8008,()=>1],[0x8010,()=>pointer(currentGpuContext?0x8888:0)]
  ]);
  const env={Process:{getCurrentThreadId:()=>7,findModuleByName:()=>withGpu?gl:null},
    NativeFunction:function(p){return gpuFunctions.get(p.value);},Memory:{alloc:bytes=>{const p=pointer(allocation);allocation+=bytes;return p;}},
    Interceptor:{attach:(p,handlers)=>{
    if(options.failAttach&&p.value===0x1100)throw Error('unhookable fixture');
    const handle={handlers,detached:false,detach(){this.detached=true;}};registered.set(p.value,handle);return handle;
  }}};
  const input={spec:{modules:[{offset:0x100,head:'head',name:'ConstX',recordBytes:4}],nodes:[{file:'fx',node:3,nodeOffset:0x100,header:'header',sourceSha256:'source',windows:[{offset:0,hex:'abcd'}]}],
    emitterHooks:[{stage:'update',offset:0x200,head:'head',tableOffset:0x30}]},game:{base:pointer(0x1000)},roots:{listeners:[]},
    emit:(type,data)=>messages.push({type,...data}),active:()=>activeWindow,
    hexBytes:(p,size)=>p.value===0x2f00?'header':p.value===0x3000?'abcd':p.value===0x5000?'record':'head',
    rendererScopes:new Map([[7,[{file:'fx',phase:'renderer-update',object:'wrapper'}]]])};
  if(options.delegate)input.spec.modules[0].hook={offset:0x180,head:options.badHead?'wrong':'head',name:'reviewed-implementation'};
  if(options.nativeSubmit)input.spec.submissions=[{kind:'auto-index',offset:0x400,head:'head'}];
  if(options.ambiguous){
    input.spec.modules.push({...input.spec.modules[0],offset:0x110,name:'second-selected-wrapper'});
    memory.set(0x4008,2);memory.set(0x4108,pointer(0x1110));
  }
  const observer=vm.runInNewContext('('+source+')',env)(input);observer.begin(['fx'],true,options.nativeSubmit===true);
  const outer=registered.get(0x1200).handlers;
  function enter(){const invocation={};outer.onEnter.call(invocation,[emitter]);return invocation;}
  function run(){memory.set(0x6008,0);const frame=enter(),call={};Object.defineProperty(call,'context',{value:Object.freeze({pc:'native'}),writable:false});
    const inner=registered.get(options.delegate?0x1180:0x1100).handlers;inner.onEnter.call(call,[context]);memory.set(0x6008,4);memory.set(0x5000,2);inner.onLeave.call(call);outer.onLeave.call(frame);return call;}
  return {observer,input,memory,messages,registered,pointer,outer,enter,run,context,gpuQueries,
    noGpuContext:()=>{currentGpuContext=false;},expire:()=>{activeWindow=false;}};
}

test('native context, record start and RNG owner stay joined across callback execution',()=>{
  const f=fixture(),call=f.run(),event=f.messages.find(e=>e.type==='pipeline-module');
  assert.equal(event.before.cursor,0);assert.equal(event.after.cursor,4);assert.equal(event.after.recordOffset,0);
  assert.deepEqual([...event.before.recordFloats],[1]);assert.deepEqual([...event.after.recordFloats],[2]);
  assert.equal(event.before.delta40,.25);assert.equal(event.rngMatchesEmitter,true);assert.equal(call.context.pc,'native');
});

test('descendant callbacks with a different parameter are rejected rather than attributed to the parent',()=>{
  const f=fixture();f.memory.set(0x6010,f.pointer(0x9999));f.run();
  assert.equal(f.messages.filter(e=>e.type==='pipeline-module').length,0);
  assert.equal(f.messages.filter(e=>e.type==='pipeline-sample').length,0);
});

test('per-node-stage sampling is bounded and hooks detach at the end of a window',()=>{
  const f=fixture();for(let i=0;i<10;i++)f.run();
  assert.equal(f.messages.filter(e=>e.type==='pipeline-module').length,6);
  f.expire();f.observer.tick();assert.equal(f.registered.get(0x1100).detached,true);
});

test('unknown selected callbacks remain unverified in the inventory',()=>{
  const f=fixture();f.memory.set(0x4100,f.pointer(0x1777));const frame=f.enter();f.outer.onLeave.call(frame);
  const inventory=f.messages.find(e=>e.type==='pipeline-stage-inventory');
  assert.equal(inventory.callbacks[0].verified,false);assert.equal(f.registered.has(0x1777),false);
});

test('GL evidence requires a selected draw scope and retains the actual surface state',()=>{
  const f=fixture(true),draw=f.registered.get(0x8018).handlers;
  const args=[f.pointer(4),f.pointer(0),f.pointer(6)];
  draw.onEnter(args);assert.equal(f.gpuQueries.length,0);
  f.input.rendererScopes.set(7,[{file:'fx',phase:'renderer-draw',object:'wrapper',drawId:12}]);
  const scope=f.input.rendererScopes.get(7)[0];
  f.observer.drawContext(scope,()=>({animationScale:[2,2,2]}));
  for(let i=0;i<10;i++){scope.drawId=12+i;draw.onEnter(args);draw.onEnter(args);}
  const records=f.messages.filter(e=>e.type==='pipeline-gpu-draw');assert.equal(records.length,6);
  assert.deepEqual([...records[0].viewport],[0,0,1080,1920]);
  assert.deepEqual([...records[0].scissorBox],[10,20,800,900]);
  assert.equal(records[0].scissorEnabled,true);assert.equal(records[0].framebuffer,7);
  assert.equal(records[0].program,42);assert.equal(records[0].drawId,12);assert.equal(records[0].count,6);
  assert.deepEqual([...new Set(f.gpuQueries)],[0xba2,0xc10,0x8ca6,0x8b8d]);
  const contexts=f.messages.filter(e=>e.type==='pipeline-draw-context');assert.equal(contexts.length,6);
  assert.ok(records.every(r=>contexts.filter(c=>c.drawId===r.drawId&&c.wrapper===r.wrapper).length===1));
  f.expire();f.observer.tick();assert.equal(f.registered.get(0x8018).detached,true);
});

test('a missing current GL context consumes a bounded failure slot without inventing viewport data',()=>{
  const f=fixture(true),draw=f.registered.get(0x8018).handlers;
  f.input.rendererScopes.set(7,[{file:'fx',phase:'renderer-draw',object:'wrapper',drawId:1}]);
  f.noGpuContext();for(let i=0;i<10;i++){f.input.rendererScopes.get(7)[0].drawId=i;draw.onEnter([f.pointer(4),f.pointer(0),f.pointer(6)]);}
  assert.equal(f.messages.filter(e=>e.type==='pipeline-gpu-unreadable').length,6);
  assert.equal(f.messages.filter(e=>e.type==='pipeline-gpu-draw').length,0);assert.equal(f.gpuQueries.length,0);
});

test('empty wait draws spend no context budget and the snapshot is read at the actual GPU call',()=>{
  const f=fixture(true),draw=f.registered.get(0x8018).handlers;
  let reads=0,rootScale=1;
  for(let i=0;i<100;i++)f.observer.drawContext({file:'fx',phase:'renderer-draw',object:'wrapper',drawId:i},()=>{reads++;return {};});
  assert.equal(reads,0);assert.equal(f.messages.filter(e=>e.type==='pipeline-draw-context').length,0);
  const scope={file:'fx',phase:'renderer-draw',object:'wrapper',drawId:101};
  f.input.rendererScopes.set(7,[scope]);f.observer.drawContext(scope,()=>{reads++;return {rootScale};});
  rootScale=3;draw.onEnter([f.pointer(4),f.pointer(0),f.pointer(6)]);
  const receipt=f.messages.find(e=>e.type==='pipeline-draw-context');
  assert.equal(reads,1);assert.equal(receipt.rootScale,3);assert.equal(receipt.drawId,101);
  assert.equal(receipt.capturePoint,'actual-gpu-call');
});

test('reviewed forwarding implementation retains selected wrapper identity',()=>{
  const f=fixture(false,{delegate:true});f.run();
  const receipt=f.messages.find(e=>e.type==='pipeline-module');
  assert.equal(receipt.offset,0x100);assert.equal(receipt.symbol,'ConstX');
  assert.equal(receipt.hookOffset,0x180);assert.equal(receipt.hookSymbol,'reviewed-implementation');
  assert.equal(f.registered.has(0x1100),false);assert.equal(receipt.hookFingerprintVerified,true);
  assert.throws(()=>fixture(false,{delegate:true,badHead:true}),/delegate fingerprint/);
});

test('failed attachments stay explicit, preserve inventory and are not retried every frame',()=>{
  const f=fixture(false,{failAttach:true});for(let i=0;i<10;i++){const frame=f.enter();f.outer.onLeave.call(frame);}
  assert.equal(f.messages.filter(e=>e.type==='pipeline-hook-unavailable').length,1);
  const inventory=f.messages.find(e=>e.type==='pipeline-stage-inventory');
  assert.equal(inventory.callbacks[0].verified,true);assert.equal(inventory.callbacks[0].hookInstalled,false);
  assert.equal(f.messages.filter(e=>e.type==='pipeline-sample').length,0);
});

test('two selected wrappers sharing one implementation remain ambiguous',()=>{
  const f=fixture(false,{delegate:true,ambiguous:true});for(let i=0;i<3;i++)f.run();
  assert.equal(f.messages.filter(e=>e.type==='pipeline-hook-ambiguous').length,1);
  assert.equal(f.messages.filter(e=>e.type==='pipeline-module').length,0);
});

test('native submission remains separate evidence when no GL call is observed',()=>{
  const f=fixture(true,{nativeSubmit:true}),native=f.registered.get(0x1400).handlers;
  const scope={file:'fx',phase:'renderer-draw',object:'wrapper',drawId:20};
  f.input.rendererScopes.set(7,[scope]);f.observer.drawContext(scope,()=>({animationScale:[2,2,2]}));
  f.memory.set(0x207c,6);f.memory.set(0x2080,42);f.memory.set(0x20b8,2);
  const call={};native.onEnter.call(call,[f.pointer(0x2000)]);native.onLeave.call(call);
  const start=f.messages.find(e=>e.type==='pipeline-native-submit-enter');
  const end=f.messages.find(e=>e.type==='pipeline-native-submit');
  assert.equal(start.nativeSubmitId,end.nativeSubmitId);assert.equal(end.inputs.vertexCount7C,6);
  assert.equal(end.gpuObservationAtEntry.fileSamplesUsed,0);assert.equal(end.gpuObservationAtEntry.alreadySampledDraw,false);
  assert.equal(end.inputs.indexCount80,42);assert.equal(end.inputs.topologyB8,2);
  assert.equal(end.gpuStateAfterReturn.program,42);assert.deepEqual([...end.rootAfterReturn.animationScale],[2,2,2]);
  assert.equal(f.messages.filter(e=>e.type==='pipeline-gpu-draw').length,0);
  assert.equal(f.messages.filter(e=>e.type==='pipeline-draw-context').length,0);
});

test('native submission budgets ignore unrelated scopes and repeated calls in the same draw',()=>{
  const f=fixture(false,{nativeSubmit:true}),native=f.registered.get(0x1400).handlers;
  const call=()=>{const invocation={};native.onEnter.call(invocation,[f.pointer(0x2000)]);native.onLeave.call(invocation);};
  call();assert.equal(f.messages.filter(e=>e.type==='pipeline-native-submit').length,0);
  const scope={file:'fx',phase:'renderer-draw',object:'wrapper',drawId:1};f.input.rendererScopes.set(7,[scope]);
  for(let i=0;i<10;i++){scope.drawId=i;call();call();}
  const receipts=f.messages.filter(e=>e.type==='pipeline-native-submit');assert.equal(receipts.length,6);
  assert.ok(receipts.every(r=>r.gpuUnavailable&&r.rootUnavailable));
  f.expire();f.observer.tick();assert.equal(f.registered.get(0x1400).detached,true);
});
