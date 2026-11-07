import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=ts.createSourceFile('observer.js',fs.readFileSync(new URL('./observer.js',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
let declaration,writerDeclaration;
function find(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='watchParticleModule')declaration=node;if(ts.isFunctionDeclaration(node)&&node.name?.text==='watchParticleWriter')writerDeclaration=node;ts.forEachChild(node,find);}
find(source);
assert.ok(declaration,'Actual observer callback installer exists');
class Pointer {
  constructor(value,memory){this.value=value;this.memory=memory;}
  sub(other){return new Pointer(this.value-other.value,this.memory);}
  add(offset){return new Pointer(this.value+offset,this.memory);}
  toUInt32(){return this.value;}
  readFloat(){return this.memory.get(this.value);}
  readPointer(){return this.memory.get(this.value);}
}
function fixture(){
  const memory=new Map(),messages=[],registered=[];
  const contextPointer=new Pointer(0x2000,memory),address=new Pointer(0x1080,memory);
  const module={name:'_ZN2ml2bm6module5alpha11make_vertex5ConstERNS1_17MakeVertexContextE',head:'original'};
  const environment={selectedFunction:()=>({offset:'0x80',pointer:'0x1080'}),game:{base:new Pointer(0x1000,memory)},
    particleModules:new Map([['128',module]]),particleModuleListeners:new Set(),hexBytes:()=> 'original',
    roots:{listeners:[]},Interceptor:{attach:(_,handlers)=>{registered.push(handlers);return {}; }},
    particleScopes:new Map([[7,[{file:'fixture',node:34,sample:1}]]]),Process:{getCurrentThreadId:()=>7},
    active:()=>true,emit:(type,data)=>messages.push({type,...data})};
  const install=vm.runInNewContext('('+declaration.getText(source)+')',environment);
  return {environment,install,address,contextPointer,memory,messages,registered};
}

test('alpha callback preserves Frida read-only CPU context and reads the explicit vertex pointer',()=>{
  const f=fixture();f.install(f.address);
  const registers=Object.freeze({pc:'native'}),invocation={};
  Object.defineProperty(invocation,'context',{value:registers,writable:false});
  f.memory.set(0x2164,.2);
  f.registered[0].onEnter.call(invocation,[f.contextPointer]);
  f.memory.set(0x2164,.6);
  f.registered[0].onLeave.call(invocation);
  assert.equal(invocation.context,registers);
  assert.equal(f.messages[0].contextAlphaBefore,.2);
  assert.equal(f.messages[0].contextAlphaAfter,.6);
});

test('an installed module can be reused after instrumentation changes its code bytes',()=>{
  const f=fixture();f.install(f.address);f.environment.hexBytes=()=> 'patched by Interceptor';
  assert.equal(f.install(f.address).fingerprintVerified,true);
  assert.equal(f.registered.length,1);
  f.environment.active=()=>false;
  const invocation={};f.registered[0].onEnter.call(invocation,[f.contextPointer]);f.registered[0].onLeave.call(invocation);
  assert.equal(f.messages.length,0);
});

test('unknown callbacks remain explicitly unverified and mismatched known callbacks reject',()=>{
  const f=fixture();f.environment.hexBytes=()=> 'wrong';
  assert.throws(()=>f.install(f.address),/fingerprint mismatch/);
  assert.equal(f.registered.length,0);
  f.environment.particleModules.clear();
  assert.equal(f.install(f.address).executionObserved,false);
  assert.equal(f.registered.length,0);
});

test('native vertex writer reads six bounded outputs without replacing the CPU context',()=>{
  const f=fixture(),e=f.environment;
  Object.assign(e,{particleVerticesEnabled:true,particleWriterInstalled:false,
    spec:{particleReference:{bufferWriter:{offset:128,head:'00'.repeat(16)}}},
    hexBytes:(_,size)=>'00'.repeat(size)});
  const install=vm.runInNewContext('('+writerDeclaration.getText(source)+')',e);
  install(f.address);
  const output=new Pointer(0x5000,f.memory);
  f.memory.set(0x2030,new Pointer(0x3000,f.memory));f.memory.set(0x3020,new Pointer(0x4000,f.memory));
  for(let i=0;i<16;i++)f.memory.set(0x4000+i*4,i%5===0?1:0);
  for(let i=0;i<6;i++)for(let axis=0;axis<3;axis++)f.memory.set(0x5000+i*24+axis*4,i+axis);
  f.memory.set(0x2164,.25);
  const invocation={};Object.defineProperty(invocation,'context',{value:Object.freeze({pc:'native'}),writable:false});
  f.registered[0].onEnter.call(invocation,[f.contextPointer,output,new Pointer(24)]);
  f.registered[0].onLeave.call(invocation);
  assert.equal(f.messages[0].type,'particle-vertices');
  assert.equal(f.messages[0].positions.length,6);
  assert.equal(f.messages[0].positions[5][2],7);
  assert.equal(f.messages[0].contextAlpha,.25);
  assert.equal(f.messages[0].rawHex.length,24*6*2);
  const invalid={};f.registered[0].onEnter.call(invalid,[f.contextPointer,output,new Pointer(1024)]);
  f.registered[0].onLeave.call(invalid);
  assert.equal(f.messages[1].type,'particle-vertex-unreadable');
});
