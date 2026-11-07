import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=ts.createSourceFile('observer.js',fs.readFileSync(new URL('./observer.js',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const functions=new Map();
function visit(n){if(ts.isFunctionDeclaration(n)&&n.name)functions.set(n.name.text,n.getText(source));ts.forEachChild(n,visit);}visit(source);
class Pointer{
  constructor(value,memory){this.value=value;this.memory=memory;}
  add(n){return new Pointer(this.value+n,this.memory);}sub(n){return new Pointer(this.value-(n.value??n),this.memory);}
  toUInt32(){return this.value;}readFloat(){const v=this.memory.get(this.value);if(v===undefined)throw Error('Unreadable');return v;}
  toString(){return '0x'+this.value.toString(16);}
  readPointer(){const v=this.memory.get(this.value);if(!(v instanceof Pointer))throw Error('Unreadable pointer');return v;}
}
test('context snapshots preserve unavailable fields as null with reasons, never identity/zero substitutes',()=>{
  const memory=new Map(),scope={Number,locatorFloats:null};
  scope.locatorFloats=vm.runInNewContext('('+functions.get('locatorFloats')+')',scope);
  const snapshot=vm.runInNewContext('('+functions.get('locatorContextSnapshot')+')',scope),pointer=new Pointer(0x1000,memory);
  for(let i=0;i<9;i++)memory.set(0x1088+i*4,i);
  for(let i=0;i<3;i++)memory.set(0x10f4+i*4,10+i);
  const result=snapshot(pointer);
  assert.deepEqual([...result.translationF4],[10,11,12]);
  assert.equal(result.rotationD0,null);assert.ok(result.unreadable.rotationD0);
  assert.deepEqual([...result.basis88],[0,1,2,3,4,5,6,7,8]);
});
test('locator callback is bounded by an active scope and preserves Frida CPU context across enter/leave',()=>{
  const memory=new Map(),messages=[],registered=[],address=new Pointer(0x1100,memory);
  let current=1,active=true;
  const environment={game:{base:new Pointer(0x1000,memory)},
    spec:{locatorReference:{modules:[{offset:256,name:'fixture',head:'source'}],computedHelpers:[]}},
    locatorListeners:new Set(),hexBytes:()=> 'source',roots:{listeners:[]},
    Interceptor:{attach:(_,handlers)=>{registered.push(handlers);return {};}},
    locatorScopes:new Map([[7,[{file:'fixture',node:33,sample:1,capture:{allowedOffsets:new Set([256]),completed:false,context:null}}]]]),Process:{getCurrentThreadId:()=>7},
    locatorCaptureEnabled:true,active:()=>active,locatorContextSnapshot:()=>({translationF4:[current,0,0]}),emit:(type,data)=>messages.push({type,...data})};
  environment.locatorCallAllowed=vm.runInNewContext('('+functions.get('locatorCallAllowed')+')',environment);
  environment.locatorHookHandles=[];
  const install=vm.runInNewContext('('+functions.get('watchLocatorFunction')+')',environment);
  install(address);environment.hexBytes=()=> 'patched';install(address);assert.equal(registered.length,1);
  const invocation={};Object.defineProperty(invocation,'context',{value:Object.freeze({pc:'native'}),writable:false});
  registered[0].onEnter.call(invocation,[new Pointer(0x2000,memory)]);current=2;registered[0].onLeave.call(invocation);
  assert.equal(messages[0].before.translationF4[0],1);assert.equal(messages[0].after.translationF4[0],2);
  assert.equal(messages[0].node,33);assert.equal(invocation.context.pc,'native');
  active=false;const idle={};registered[0].onEnter.call(idle,[]);registered[0].onLeave.call(idle);assert.equal(messages.length,1);
  active=true;environment.locatorScopes.clear();const foreign={};registered[0].onEnter.call(foreign,[]);registered[0].onLeave.call(foreign);assert.equal(messages.length,1);
});
test('unknown locator functions are not attached and bad known fingerprints reject',()=>{
  const environment={game:{base:new Pointer(0x1000)},spec:{locatorReference:{modules:[],computedHelpers:[]}},locatorListeners:new Set()};
  const install=vm.runInNewContext('('+functions.get('watchLocatorFunction')+')',environment);
  assert.equal(install(new Pointer(0x1100)).fingerprintVerified,false);
  environment.spec.locatorReference.modules=[{offset:256,head:'expected'}];environment.hexBytes=()=> 'different';
  assert.throws(()=>install(new Pointer(0x1100)),/fingerprint mismatch/);
});
test('completed own-module prefixes exclude descendant calls, unselected modules and reused callbacks on another context',()=>{
  const allowed=vm.runInNewContext('('+functions.get('locatorCallAllowed')+')',{});
  const scope={capture:{allowedOffsets:new Set([10,20]),computedOffset:30,computedSeen:false,completed:false,context:null}};
  assert.equal(allowed(scope,30,true,new Pointer(0x1000)),true);
  assert.equal(allowed(scope,30,true,new Pointer(0x2000)),false);
  assert.equal(allowed(scope,99,false,new Pointer(0x1000)),false);
  assert.equal(allowed(scope,10,false,new Pointer(0x1000)),true);
  assert.equal(allowed(scope,20,false,new Pointer(0x2000)),false);
  scope.capture.completed=true;
  assert.equal(allowed(scope,10,false,new Pointer(0x1000)),false);
});
test('expired locator instrumentation detaches outside native scopes and releases its retained handles',()=>{
  let detached=0;const handles=[{detach:()=>detached++},{detach:()=>detached++}],unrelated={};
  const environment={locatorHookHandles:[...handles],locatorScopes:new Map([[1,[{}]]]),active:()=>false,
    locatorSamples:new Map(),spec:{locatorReference:{nodes:[1,33]}},roots:{listeners:[unrelated,...handles]},
    locatorListeners:new Set(['one']),locatorCaptureEnabled:true,emit:()=>{}};
  const cleanup=vm.runInNewContext('('+functions.get('cleanupLocatorObservers')+')',environment);
  cleanup();assert.equal(detached,0);
  environment.locatorScopes.clear();cleanup();assert.equal(detached,2);
  assert.equal(environment.locatorHookHandles.length,0);assert.equal(environment.locatorListeners.size,0);
  assert.equal(environment.roots.listeners.length,1);assert.equal(environment.roots.listeners[0],unrelated);
  assert.equal(environment.locatorCaptureEnabled,false);cleanup();assert.equal(detached,2);
});
