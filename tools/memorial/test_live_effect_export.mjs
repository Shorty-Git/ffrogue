import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=ts.createSourceFile('live_effect_export.js',fs.readFileSync(new URL('./live_effect_export.js',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
let validate,matchesFile,programStateSource;
function find(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='validate')validate=vm.runInNewContext('('+node.getText(source)+')');if(ts.isFunctionDeclaration(node)&&node.name?.text==='matchesFile')matchesFile=vm.runInNewContext('('+node.getText(source)+')');ts.forEachChild(node,find);}
find(source);
function findProgram(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='programState')programStateSource=node.getText(source);ts.forEachChild(node,findProgram);}
findProgram(source);
const request=()=>({token:'live-proof-1',file:'atk_slash1_white.bmb',draws:[6]});
test('live redraw requests select one reviewed file and bounded ascending draw samples',()=>{
  const config=request();assert.equal(validate(config),config);
  assert.doesNotThrow(()=>validate({...config,file:'atk_impact_001_pink.bmb',draws:[6,12,18]}));
});
test('paths, unknown effects and unbounded sampling fail before rendering',()=>{
  for(const patch of [{token:'../bad'},{file:'../atk_slash1_white.bmb'},{file:'unknown.bmb'},
    {draws:[]},{draws:[0]},{draws:[121]},{draws:[6,6]},{draws:[12,6]},{draws:Array.from({length:61},(_,i)=>i+1)}])
    assert.throws(()=>validate({...request(),...patch}),/Invalid bounded live/);
});
test('reviewed wrapper names omit the BMB suffix, without accepting other resources',()=>{
  assert.equal(matchesFile('atk_slash1_white','atk_slash1_white.bmb'),true);
  assert.equal(matchesFile('atk_slash1_white.bmb','atk_slash1_white.bmb'),true);
  assert.equal(matchesFile('other/atk_slash1_white','atk_slash1_white.bmb'),false);
  assert.equal(matchesFile('atk_slash1_white_extra','atk_slash1_white.bmb'),false);
});

test('fixed-step live sampling is bounded and does not admit failed manual replay requests',()=>{
  assert.doesNotThrow(()=>validate({...request(),fixedStep:true,draws:Array.from({length:45},(_,i)=>1+i*2)}));
  assert.throws(()=>validate({...request(),fixedStep:1}));
  assert.throws(()=>validate({...request(),frames:[0,4]}));
  assert.doesNotThrow(()=>validate({...request(),textureAudit:true}));
  assert.throws(()=>validate({...request(),textureAudit:1}));
});

test('GPU state capture reads each uniform-array element and restores the active texture unit',()=>{
 const pointer=b=>({b,readS32:()=>b.readInt32LE(),readU32:()=>b.readUInt32LE(),readFloat:()=>b.readFloatLE(),
  readUtf8String:n=>b.subarray(0,n).toString(),add:n=>pointer(b.subarray(n))});
 const write=(p,v)=>p.b.writeInt32LE(v),calls=[];let active=0x84c3;
 const api={glGetProgramiv:(p,k,out)=>write(out,2),
  glGetActiveUniform:(p,i,max,length,size,type,name)=>{const text=i?'image':'matrix[0]';name.b.write(text);write(length,text.length);write(size,i?1:2);write(type,i?35678:35676);},
  glGetUniformLocation:(p,key)=>{calls.push(key);return key==='image'?2:key==='matrix[0]'?0:1;},
  glGetUniformfv:(p,index,out)=>{for(let i=0;i<16;i++)out.b.writeFloatLE(index*16+i,i*4);},
  glGetUniformiv:(p,index,out)=>write(out,1),glActiveTexture:v=>{active=v;},glGetTexParameteriv:(t,key,out)=>write(out,9729),glIsEnabled:()=>0};
 const capture=vm.runInNewContext('('+programStateSource+')',{api,ints:key=>[key===0x84e0?active:7],
  Memory:{alloc:n=>pointer(Buffer.alloc(n)),allocUtf8String:v=>v}});
 const result=JSON.parse(JSON.stringify(capture()));
 assert.deepEqual(calls,['matrix[0]','matrix[1]','image']);assert.equal(result.uniforms[0].values[1][15],31);
 assert.equal(result.textures[0].unit,1);assert.equal(result.textures[0].parameters.magFilter,9729);assert.equal(active,0x84c3);
});

test('controlled resource identity binds only the matching request and exact wrapper',()=>{
 const functions={};
 function collect(n){if(ts.isFunctionDeclaration(n)&&['bindControlledSource','selectWrapper'].includes(n.name?.text))functions[n.name.text]=n.getText(source);ts.forEachChild(n,collect);}
 collect(source);
 const roots={request:request(),target:null},events=[];
 const context=vm.createContext({roots,spec:{filenameOffset:0},emit:(...e)=>events.push(e),matchesFile,
  cppString:()=>{throw Error('A proven controlled wrapper must not be reselected by its stale filename');}});
 vm.runInContext(functions.bindControlledSource+';'+functions.selectWrapper,context);
 const wrapper={isNull:()=>false,toString:()=> '0x123'},config={creationMode:'live-source',token:request().token,files:[request().file],from:'original'};
 for(const patch of [{token:'wrong'},{files:['unknown.bmb']},{creationMode:'factory'},{files:[request().file,'extra']}])
  assert.equal(context.bindControlledSource(wrapper,{...config,...patch}),false);
 assert.equal(context.bindControlledSource({...wrapper,isNull:()=>true},config),false);
 assert.equal(roots.target,null);
 assert.equal(context.bindControlledSource(wrapper,config),true);
 assert.equal(context.selectWrapper(wrapper),true);
 assert.equal(context.selectWrapper({...wrapper,toString:()=> '0x456'}),false);
 assert.equal(context.bindControlledSource({...wrapper,toString:()=> '0x456'},config),false);
 assert.equal(events.length,1);assert.equal(events[0][0],'live-export-source-bound');
});

test('texture audit reads a bound texture without rewriting/deleting it and restores state on failure',()=>{
 let declaration;
 function collect(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='auditBoundTextures')declaration=n.getText(source);ts.forEachChild(n,collect);}
 collect(source);
 const roots={uploads:new Map([['ctx/12',{width:8,height:4,format:6408,type:5121}]]),audited:new Set(),uploadPixels:new Map()},receipts=[],calls=[];
 let status=0x8cd5;
 const api={glGenFramebuffers:(n,p)=>p.writeU32(99),glBindFramebuffer:(t,id)=>calls.push(['bind',id]),
  glFramebufferTexture2D:(a,b,c,id)=>calls.push(['attach-original',id]),glCheckFramebufferStatus:()=>status,
  glDeleteFramebuffers:(n,p)=>calls.push(['delete-fbo',p.readU32()])};
 const context=vm.createContext({roots,api,currentContext:()=> 'ctx',saveState:()=>({framebuffer:7}),
  restore:s=>calls.push(['restore',s.framebuffer]),Memory:{alloc:()=>({value:0,readU32(){return this.value;},writeU32(v){this.value=v;}})},
  errors:()=>[],outputPixels:(job)=>{calls.push(['read',job.width,job.height]);return {file:'readback'};},
  writeJson:(name,r)=>receipts.push(r),emit:()=>{}});
 vm.runInContext(declaration,context);
 const job={config:{token:'test',textureAudit:true}},state={textures:[{texture:12},{texture:12}]};
 context.auditBoundTextures(job,state);
 assert.equal(receipts.length,1);assert.equal(receipts[0].output.file,'readback');
 assert.deepEqual(calls,[['bind',99],['attach-original',12],['read',8,4],['restore',7],['delete-fbo',99]]);
 roots.audited.clear();calls.length=0;status=0;
 context.auditBoundTextures(job,state);
 assert.ok(receipts[1].unavailable.includes('not color-renderable'));
 assert.ok(!calls.some(r=>r[0]==='read'));assert.deepEqual(calls.slice(-2),[['restore',7],['delete-fbo',99]]);
});

test('CPU upload capture accepts only bounded contiguous RGBA8 client data with explicit unpack state',()=>{
 let declaration;
 function collect(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='captureUploadInput')declaration=n.getText(source);ts.forEachChild(n,collect);}
 collect(source);
 const roots={uploadBytes:0};let buffer=0;
 const context=vm.createContext({roots,api:{glGetString:()=>({readUtf8String:()=> 'OpenGL ES 3.0 test'})},
  ints:key=>[key===0x0cf5?4:key===0x88ef?buffer:0]});
 vm.runInContext(declaration,context);
 const upload={width:8,height:4,format:6408,type:5121},pointer={isNull:()=>false,readByteArray:n=>new ArrayBuffer(n)};
 assert.equal(context.captureUploadInput(upload,pointer).byteLength,128);
 assert.equal(upload.cpuInput.unpack.alignment,4);assert.equal(roots.uploadBytes,128);
 buffer=1;assert.throws(()=>context.captureUploadInput(upload,pointer),/unpack layout/);
 buffer=0;assert.throws(()=>context.captureUploadInput({...upload,type:5123},pointer),/Unsupported/);
 assert.throws(()=>context.captureUploadInput({...upload,width:2048,height:2048},pointer),/bounded/);
 assert.throws(()=>context.captureUploadInput(upload,{isNull:()=>true}),/Unsupported/);
});
