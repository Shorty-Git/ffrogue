import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync('tools/memorial/lifecycle_observer.js','utf8');
const spec=JSON.parse(fs.readFileSync('tools/data/memorial-audit/diagnostic-v27-lifecycle/lifecycle-spec.json','utf8'));
function setup(badOffset=null,eventLimit=null){
  const heads=new Map([...spec.hooks,...spec.modules.map(m=>m.hook??m)].map(h=>[h.offset,h.head]));
  const hooks=[],files=[],messages=[];
  const context=vm.createContext({console,Process:{getCurrentThreadId:()=>7,getModuleByName:()=>({getExportByName:()=>0})},
    Memory:{allocUtf8String:value=>value},NativeFunction:function(){return ()=>0;},
    Interceptor:{attach(address,callbacks){hooks.push({address,callbacks});return {detach(){}};}},
    File:class{constructor(path){this.path=path;this.text='';files.push(this);}write(text){this.text+=text;}flush(){}close(){this.closed=true;}}});
  // Reduce only the resource ceiling; execute the actual recorder shutdown path.
  const fixtureCode=eventLimit===null?code:code.replace('session.events>100000','session.events>'+eventLimit);
  const create=vm.runInContext(fixtureCode+'\ncreateLifecycleObserver',context);
  const api=create({spec,game:{base:{add:offset=>({offset})}},emit:(...args)=>messages.push(args),
    hexBytes:address=>address.offset===badOffset?'0'.repeat(32):heads.get(address.offset),roots:{listeners:[]}});
  return {api,hooks,files,messages};
}
test('lifecycle recorder writes ordered controlled inputs and never certifies an empty source run',()=>{
  const {api,files,messages}=setup();
  assert.equal(api.snapshot().failures.length,0);
  api.begin({token:'fixture'});api.mark('controlled-step',{frame:0,delta:0});api.finish('fixture-end');
  const rows=files[1].text.trim().split('\n').map(JSON.parse);
  assert.deepEqual(rows.map(r=>r.seq),[1,2,3]);assert.equal(rows[0].expectedNodes.length,9);
  assert.equal(rows[1].frame,0);assert.equal(rows[2].completeNativeNodes,0);
  assert.equal(rows[2].initializedNodes.length,0);assert.ok(files[1].closed);
  assert.equal(messages.at(-1)[0],'lifecycle-complete');assert.equal(api.snapshot().active,false);
});
test('lifecycle recorder retains missing hooks and rejects unsafe output tokens',()=>{
  const {api,files}=setup(spec.hooks[0].offset);
  assert.equal(api.snapshot().failures.length,1);
  assert.throws(()=>api.begin({token:'../escape'}),/token/);assert.equal(files.length,1);
  api.begin({token:'bounded'});api.finish();
  assert.equal(JSON.parse(files[1].text.split('\n')[0]).missingHooks.length,1);
});
test('lifecycle observer has no engine-state write API; stepping belongs to the declared controller',()=>{
  assert.doesNotMatch(code,/\.(writeFloat|writePointer|writeU\d+|writeS\d+|writeByteArray)\(/);
});
test('lifecycle truncation writes one terminal record without recursive shutdown',()=>{
 const {api,files}=setup(null,3);api.begin({token:'limited'});
 api.mark('fixture',{frame:1});api.mark('fixture',{frame:2});api.mark('fixture',{frame:3});
 assert.equal(api.snapshot().active,false);
 const rows=files[1].text.trim().split('\n').map(JSON.parse);
 assert.equal(rows.filter(r=>r.type==='capture-end').length,1);assert.equal(rows.at(-1).reason,'truncated-limit');
});

test('module observation reads full declared work records and actual parent pointees without engine writes',()=>{
 const memory=Buffer.alloc(8192),pointer=at=>({add:n=>pointer(at+n),toString:()=>`0x${at.toString(16)}`,
   readPointer:()=>pointer(Number(memory.readBigUInt64LE(at))),readU32:()=>memory.readUInt32LE(at),readFloat:()=>memory.readFloatLE(at)});
 const context=128,record=1024,basis=4096,origin=4200,scale=4300,rng=4400;
 memory.writeBigUInt64LE(BigInt(record),context);memory.writeUInt32LE(24,context+8);
 for(const [at,value]of [[0x80,basis],[0x68,origin],[0x78,scale],[0x30,rng]])memory.writeBigUInt64LE(BigInt(value),context+at);
 for(let i=0;i<9;i++)memory.writeFloatLE(i+1,basis+4*i);
 for(let i=0;i<3;i++){memory.writeFloatLE(10+i,origin+4*i);memory.writeFloatLE(2+i,scale+4*i);}
 memory.fill(0x5a,record,record+36);
 const roots={listeners:[]};
 const sandbox=vm.createContext({Process:{getCurrentThreadId:()=>7,getModuleByName:()=>({getExportByName:()=>0})},
   Memory:{allocUtf8String:v=>v},NativeFunction:function(){return ()=>0;},File:class{},Interceptor:{attach(){return {detach(){}};}}});
 const instrumented=code.replace('  const api={begin,finish,mark:', '  roots.inspectModule=moduleState;\n  const api={begin,finish,mark:');
 const create=vm.runInContext(instrumented+'\ncreateLifecycleObserver',sandbox);
 create({spec:{hooks:[],modules:[]},roots,game:{base:{}},emit:()=>{},hexBytes:(p,n)=>memory.subarray(Number(p.toString()),Number(p.toString())+n).toString('hex')});
 const args={context:pointer(context),ref:{node:{typeId:0,workBytes:36}},candidates:[{stage:'update'}]};
 const s=JSON.parse(JSON.stringify(roots.inspectModule(args)));
 assert.equal(s.recordSnapshot.raw,'5a'.repeat(36));assert.equal(s.recordHex,'5a'.repeat(12));
 assert.deepEqual(s.parentInputs.basis,[1,2,3,4,5,6,7,8,9]);assert.deepEqual(s.parentInputs.origin,[10,11,12]);
 assert.deepEqual(s.parentInputs.scale,[2,3,4]);
 memory.writeFloatLE(99,basis);const after=roots.inspectModule(args);assert.equal(after.parentInputs.basis[0],99);
 assert.throws(()=>roots.inspectModule({...args,ref:{node:{typeId:0,workBytes:257}}}),/bound/);
 assert.doesNotMatch(code,/\.(writeFloat|writePointer|writeU\d+|writeS\d+|writeByteArray)\(/);
});

test('render snapshot follows the live draw basis and preserves both UV trims without writing engine state',()=>{
 const memory=Buffer.alloc(8192),pointer=at=>({add:n=>pointer(at+n),toString:()=>`0x${at.toString(16)}`,
  readPointer:()=>pointer(Number(memory.readBigUInt64LE(at))),readFloat:()=>memory.readFloatLE(at)});
 const context=128,draw=2048,basis=4096;
 memory.writeBigUInt64LE(BigInt(draw),context+0x30);memory.writeBigUInt64LE(BigInt(basis),draw+0x20);
 for(let i=0;i<16;i++)memory.writeFloatLE(i+.25,basis+4*i);
 for(const [offset,values]of [[0x188,[.1,.2,.3,.4]],[0x214,[.5,.6,.7,.8]],[0x198,[1,2,3,4,5,6]],[0x224,[7,8,9,10,11,12]]])
  values.forEach((v,i)=>memory.writeFloatLE(v,context+offset+4*i));
 const roots={listeners:[]},sandbox=vm.createContext({Process:{getCurrentThreadId:()=>7,getModuleByName:()=>({getExportByName:()=>0})},
  NativeFunction:function(){return ()=>0;},Memory:{allocUtf8String:v=>v},File:class{},Interceptor:{attach(){}}});
 const create=vm.runInContext(code.replace('  const api={begin,finish,mark:','  roots.inspectRender=renderInputs;\n  const api={begin,finish,mark:')+'\ncreateLifecycleObserver',sandbox);
 create({spec:{hooks:[],modules:[]},roots,game:{base:{}},emit:()=>{},hexBytes:(p,n)=>memory.subarray(Number(p.toString()),Number(p.toString())+n).toString('hex')});
 const value=JSON.parse(JSON.stringify(roots.inspectRender(pointer(context))));
 assert.deepEqual(value.drawBasis,Array.from({length:16},(_,i)=>i+.25));
 assert.deepEqual(value.trim2,[.5,.6,.7,.8].map(Math.fround));assert.deepEqual(value.uv2,[7,8,9,10,11,12]);
 assert.equal(value.raw.length,0x240*2);memory.writeFloatLE(99,basis);assert.equal(roots.inspectRender(pointer(context)).drawBasis[0],99);
 assert.doesNotMatch(code,/\.(writeFloat|writePointer|writeU\d+|writeS\d+|writeByteArray)\(/);
});
