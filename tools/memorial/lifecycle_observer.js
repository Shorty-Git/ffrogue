// Exact-source lifecycle extension of the existing observer and arm-file channel.
function createLifecycleObserver({spec,game,emit,hexBytes,roots,verifiedOffsets=new Map()}) {
  const directory='/sdcard/Android/data/com.square_enix.ffbejpn/files/ffrogue-lifecycle-v27/';
  const mkdir=new NativeFunction(Process.getModuleByName('libc.so').getExportByName('mkdir'),'int',['pointer','uint']);
  mkdir(Memory.allocUtf8String(directory),0o770);
  const emitters=new Map(),parameterOwners=new Map(),trees=new Map(),joints=new Map(),stacks=new Map(),wrappers=new Map();
  let session=null,serial=0,entitySerial=0,controlledFrame=null,moduleInstallStarted=false;
  const failures=[];
  const key=p=>p.toString();
  const safe=(fn)=>{try{return fn();}catch(error){return {unreadable:String(error)};}};
  const floats=(p,n)=>Array.from({length:n},(_,i)=>{const x=p.add(i*4).readFloat();return Number.isFinite(x)?x:null;});
  const words=p=>Array.from({length:4},(_,i)=>p.add(i*4).readU32());
  const stack=()=>stacks.get(Process.getCurrentThreadId())??[];
  const top=()=>stack().slice(-1)[0];
  function flush(){if(session?.buffer.length){session.file.write(session.buffer.join(''));session.file.flush();session.buffer=[];}}
  function record(type,data={}) {
    if(!session)return;
    const row={seq:++serial,type,ms:Date.now()-session.started,frame:controlledFrame,thread:Process.getCurrentThreadId(),parentCall:top()?.call??null,...data};
    const line=JSON.stringify(row)+'\n';session.bytes+=line.length;session.events++;
    if(type!=='capture-end'&&(session.events>100000||session.bytes>48*1024*1024)){finish('truncated-limit');return;}
    session.buffer.push(line);if(session.buffer.length>=128)flush();
  }
  function source(root){
    try{return hexBytes(root,8)===spec.header&&spec.strings.every(w=>hexBytes(root.add(w.offset),w.hex.length/2)===w.hex);}catch(_){return false;}
  }
  function identify(parameter,trait=null){
    try{
      for(const n of spec.nodes){
        if(trait!==null&&n.typeId!==trait)continue;
        if(parameter.readU32()!==n.typeId||parameter.add(4).readU32()!==n.bytes)continue;
        const root=parameter.sub(n.nodeOffset);if(!source(root))continue;
        if(parameter.add(n.lifeOffset).readU32()!==n.life)continue;
        return {node:n,parameter,source:root};
      }
    }catch(_){}return null;
  }
  function emitter(object,trait,initializing=false,parameter=null){
    const k=key(object);if(emitters.has(k)&&!initializing)return emitters.get(k);
    // Reject cached/unrelated emitters: a connected run must include Initialize.
    if(!initializing)return null;
    const ref=identify(parameter??object.add(trait===0?0x10:0xf0).readPointer(),trait);if(!ref)return null;
    const e={id:'e'+(++entitySerial),object,node:ref.node,parameter:ref.parameter,source:ref.source,
      initialized:false,parentJoint:null,prior:emitters.get(k)?.id??null};emitters.set(k,e);parameterOwners.set(key(ref.parameter),e);return e;
  }
  function joint(p,owner=null,newGeneration=false,birthCall=null){
    if(p.isNull())return null;let j=joints.get(key(p));
    if(!j||newGeneration||birthCall&&j.birthCall!==birthCall){j={id:'j'+(++entitySerial),pointer:key(p),owner:owner?.id??null,birthCall,prior:j?.id??null};joints.set(key(p),j);}
    return {...j,...safe(()=>({lifeTicks:p.add(0x60).readS32(),ageTicks:p.add(0x64).readS32(),flags:hexBytes(p.add(0x68),8),raw:hexBytes(p,j.owner?0x90:0x98)}))};
  }
  function emitterState(e){
    const p=e.object,isNull=e.node.typeId===0,gen=p.add(isNull?0x80:0x108).readPointer();
    const value={id:e.id,node:e.node.index,typeId:e.node.typeId,object:key(p),parameter:key(e.parameter),source:key(e.source),
      initialized:e.initialized,parentJoint:e.parentJoint,rngOwner:key(p.add(isNull?0x40:0x130)),
      rng:words(p.add(isNull?0x40:0x130)),raw:hexBytes(p,isNull?0xa0:0x150),generatorPointer:key(gen)};
    if(!gen.isNull())value.generator=safe(()=>({raw:hexBytes(gen,isNull?0x40:0x50),mode:gen.readS32(),durationTicks:gen.add(4).readS32(),
      intervalTicks:gen.add(8).readS32(),remainingTicks:gen.add(12).readS32(),emitted:gen.add(16).readS32(),limit:gen.add(24).readS32(),delayTicks:gen.add(0x28).readS32()}));
    value.generatorRecords=safe(()=>{
      const count=p.add(isNull?0x98:0x140).readU32();if(count>128)throw Error('Generator record bound');
      return {count,layout:'Original64-byte generator records; raw storage before activation is not initialized state',
        records:Array.from({length:count},(_,i)=>({slot:i,pointer:key(gen.add(i*64)),raw:hexBytes(gen.add(i*64),64)}))};
    });
    if(isNull)value.jointStorage=safe(()=>{
      const base=p.add(0x88).readPointer(),capacity=p.add(0x9c).readU32();if(capacity>128)throw Error('Null joint bound');
      return {capacity,layout:'Allocated144-byte Null slots; validity requires a recorded birth',slots:Array.from({length:capacity},(_,i)=>{
        const at=base.add(i*0x90);return {slot:i,pointer:key(at),lifeCandidate:at.add(0x60).readS32(),ageCandidate:at.add(0x64).readS32(),raw:hexBytes(at,0x90)};
      })};
    });
    if(!isNull&&!gen.isNull())value.cells=safe(()=>{
      const buffer=p.add(0x110).readPointer(),capacity=p.add(0x144).readU32(),count=capacity;
      if(capacity>512||count>100000||buffer.isNull())return {capacity,count,unavailable:true};
      return {capacity,count,layoutEvidence:e.node.typeId===3?'Existing original Particle scheduler':'Raw Quad slots; lifecycle field equivalence must be checked',
        slots:Array.from({length:Math.min(capacity,count)},(_,i)=>{const cell=buffer.add(i*32);return {slot:i,pointer:key(cell),raw:hexBytes(cell,32),
          lifeCandidate:cell.readS32(),ageCandidate:cell.add(4).readS32(),moduleRecord:key(cell.add(24).readPointer())};})};
    });
    return value;
  }
  function treeState(t){
    const p=t.object,j=p.readPointer(),table=p.add(8).readPointer();
    const state={id:t.id,object:key(p),joint:safe(()=>joint(j)),flags:hexBytes(p.add(0x14),8),tablePointer:key(table)};
    if(!table.isNull())state.entries=safe(()=>{
      const count=table.add(8).readU32(),base=table.readPointer();if(count>128)throw Error('Unbounded tree table');
      return Array.from({length:count},(_,i)=>{const at=base.add(i*24),param=at.readPointer(),object=at.add(8).readPointer(),ref=identify(param);
        return {ordinal:i,parameter:key(param),object:key(object),node:ref?.node.index??null,emitter:emitters.get(key(object))?.id??null,vtable:key(at.add(16).readPointer())};});
    });return state;
  }
  function initContext(p){return {pointer:key(p),...safe(()=>({raw:hexBytes(p,0x78),source:key(p.readPointer()),
    flags5c:p.add(0x5c).readU16(),auxiliary60:p.add(0x60).readU8(),cursor18:p.add(0x18).readU32()}))};}
  function updateContext(p){return {pointer:key(p),...safe(()=>({raw:hexBytes(p,0xa0),delta:p.add(8).readFloat(),flags:hexBytes(p.add(0x9c),4)}))};}
  function moduleState({context,ref,candidates}){
    const cursor=context.add(8).readU32(),p=context.readPointer();if(cursor>4096)throw Error('Module cursor bound');
    if(!Number.isInteger(ref.node.workBytes)||ref.node.workBytes<0||ref.node.workBytes>256)throw Error('Module work record bound');
    const bytes=Math.min(16,Math.max(0,ref.node.workBytes-cursor));
    const value={context:key(context),record:key(p),cursor,recordHex:bytes?safe(()=>hexBytes(p.add(cursor),bytes)):null,contextRaw:hexBytes(context,0x40)};
    value.recordSnapshot={base:key(p),bytes:ref.node.workBytes,
      raw:ref.node.workBytes?safe(()=>hexBytes(p,ref.node.workBytes)):'',
      boundary:'Declared allocation span; reserved/uninitialized bytes are raw observations'};
    if(ref.node.typeId===0&&candidates.some(c=>c.stage==='init'))value.initInputs=safe(()=>({
      offset:floats(context.add(0x5c),3),velocityMultiplier:floats(context.add(0x68),3)}));
    if(ref.node.typeId===0&&candidates.some(c=>c.stage==='update'||c.stage==='fourth'))value.parentInputs=safe(()=>{
      const basis=context.add(0x80).readPointer(),origin=context.add(0x68).readPointer(),scale=context.add(0x78).readPointer();
      return {basisPointer:key(basis),originPointer:key(origin),scalePointer:key(scale),
        basis:floats(basis,9),origin:floats(origin,3),scale:floats(scale,3),boundary:'Actual referenced data at this module boundary'};
    });
    if(candidates.some(c=>c.stage==='init'||c.stage==='update'||c.stage==='fourth')){
      const rng=context.add(0x30).readPointer();value.rngOwner=key(rng);value.rng=words(rng);
      value.emitterOwners=[...emitters.values()].filter(e=>key(e.object.add(e.node.typeId===0?0x40:0x130))===key(rng)).map(e=>e.id);
    }
    if(candidates.some(c=>c.stage==='update'||c.stage==='fourth'))value.update=safe(()=>({delta40:context.add(0x40).readFloat(),fraction50:context.add(0x50).readFloat(),raw:hexBytes(context,0x100)}));
    if(candidates.some(c=>c.stage==='make')){
      value.make=safe(()=>({center:floats(context.add(0x98),3),raw:hexBytes(context,0x168)}));
      if(candidates.some(c=>c.name?.includes('6color411make_vertex9ConstFlat')||c.name?.includes('6color111make_vertex5Const')))
        value.renderInputs=safe(()=>renderInputs(context));
    }
    return value;
  }
  function renderInputs(context){
    const draw=context.add(0x30).readPointer(),basis=draw.add(0x20).readPointer();
    return {draw:key(draw),basisPointer:key(basis),drawBasis:floats(basis,16),
      trim1:floats(context.add(0x188),4),trim2:floats(context.add(0x214),4),
      uv1:floats(context.add(0x198),6),uv2:floats(context.add(0x224),6),
      color:floats(context.add(0x104),3),alpha:context.add(0x164).readFloat(),
      textureTint:floats(context.add(0x144),4),textureTint2:floats(context.add(0x154),4),
      raw:hexBytes(context,0x240),boundary:'Actual make context and drawData referenced basis; not GPU uniforms'};
  }
  function push(scope){const id=Process.getCurrentThreadId(),s=stacks.get(id)??[];s.push(scope);stacks.set(id,s);}
  function pop(scope){const s=stacks.get(Process.getCurrentThreadId());if(s?.slice(-1)[0]!==scope){record('stack-mismatch',{call:scope.call});return;}s.pop();}
  function finish(reason='stopped'){
    if(!session)return;
    record('capture-end',{reason,initializedNodes:[...new Set([...emitters.values()].filter(e=>e.initialized).map(e=>e.node.index))],
      emitterCount:emitters.size,treeCount:trees.size,missingHooks:failures,completeNativeNodes:0,
      boundary:'Raw connected observations; acceptance requires independent event/ownership/lifetime validation'});
    flush();session.file.close();const old=session;session=null;emit('lifecycle-complete',{token:old.token,events:old.events,bytes:old.bytes,reason,path:old.path});
  }
  function begin(config){
    if(!/^[a-zA-Z0-9_-]{1,64}$/.test(config.token))throw Error('Bounded lifecycle token required');
    finish('rearmed');emitters.clear();parameterOwners.clear();trees.clear();joints.clear();wrappers.clear();stacks.clear();serial=0;entitySerial=0;
    const path=directory+config.token+'.jsonl';
    session={token:config.token,path,file:new File(path,'w'),buffer:[],started:Date.now(),events:0,bytes:0};
    record('capture-start',{moduleStateProfile:'bounded-record-parent-render-snapshots-v2',source:spec.file,sourceSha256:spec.sourceSha256,expectedNodes:spec.nodes,missingHooks:failures,
      policy:'Observe source-native execution; raw/unverified fields remain labelled. Controlled factory inputs are separate from battle evidence.'});
    flush();emit('lifecycle-armed',{token:config.token,path,hooksFailed:failures});
  }
  for(const h of spec.hooks){
    try{
      const address=game.base.add(h.offset);if(hexBytes(address,16)!==h.head&&verifiedOffsets.get(h.offset)!==h.head)throw Error('Fingerprint mismatch');
      roots.listeners.push(Interceptor.attach(address,{
        onEnter(args){
          this.scope=null;if(!session)return;
          const kind=h.kind,s={kind,call:++entitySerial};
          try{
            if(kind==='factory'){
              const p=args[1],flag=p.readU8(),len=flag&1?p.add(8).readU64().toNumber():flag>>>1;
              if(len<1||len>128)return;
              const name=(flag&1?p.add(16).readPointer():p.add(1)).readUtf8String(len);
              if(name!==spec.file&&name!==spec.file.replace(/\.bmb$/,''))return;
              s.file=name;
            }else if(kind==='wrapper-destroy'){
              if(!wrappers.has(key(args[0])))return;s.wrapper=key(args[0]);
            }else if(kind==='root-life'){
              if(!source(args[0]))return;s.source=key(args[0]);
            }else if(kind.startsWith('tree-')){
              let t=trees.get(key(args[0]));
              if(kind==='tree-init'){
                if(!source(args[1].readPointer()))return;
                t={id:'t'+(++entitySerial),object:args[0]};trees.set(key(args[0]),t);s.context=args[1];
              }
              if(!t)return;s.tree=t;
              if(kind==='tree-update'||kind==='tree-post')s.context=args[1];
              if(kind==='tree-activate'){
                const owner=[...stack()].reverse().find(v=>v.kind==='birth')?.emitter;
                s.newJoint=safe(()=>joint(args[0].readPointer(),owner,true));
              }
            }else{
              const e=emitter(args[0],h.trait,kind==='init',kind==='init'?args[1]:null);if(!e)return;s.emitter=e;
              if(kind==='init')s.context=args[2];
              else if(kind==='update'||kind==='post')s.context=args[1];
              else if(kind==='birth'){s.context=args[2];s.requested=args[3].toUInt32();s.generatorArg=key(args[1]);}
              else if(kind==='activate'){
                const birth=[...stack()].reverse().find(v=>v.kind==='birth');
                s.parent=safe(()=>joint(args[1],birth?.emitter,false,birth?.call??null));e.parentJoint=s.parent?.id??null;
              }
            }
            this.scope=s;
            if(kind==='tree-init'||kind==='init')installModules();
            record(kind+'-enter',{call:s.call,node:s.emitter?.node.index??null,emitter:s.emitter?.id??null,
              state:s.emitter&&kind!=='init'?safe(()=>emitterState(s.emitter)):null,tree:s.tree?safe(()=>treeState(s.tree)):null,
              context:s.context?(kind.endsWith('init')?initContext(s.context):updateContext(s.context)):null,
              newJoint:s.newJoint??null,parent:s.parent??null,requested:s.requested??null,generatorArg:s.generatorArg??null,file:s.file??null});
            push(s);
            if(kind==='factory'||kind==='tree-init'||kind==='init')flush();
          }catch(error){record('hook-error',{hook:h.name,reason:String(error)});}
        },
        onLeave(result){
          const s=this.scope;if(!s||!session)return;
          if(s.kind==='init')s.emitter.initialized=(result.toInt32()&1)!==0;
          if(s.kind==='factory'){wrappers.set(key(result),{file:s.file});s.wrapper=key(result);}
          record(s.kind+'-leave',{call:s.call,node:s.emitter?.node.index??null,emitter:s.emitter?.id??null,wrapper:s.wrapper??null,
            state:s.emitter?safe(()=>emitterState(s.emitter)):null,tree:s.tree?safe(()=>treeState(s.tree)):null,
            context:s.context?(s.kind.endsWith('init')?initContext(s.context):updateContext(s.context)):null,result:result.toInt32()});
          pop(s);if(s.kind==='tree-update'||s.kind==='factory'||s.kind==='tree-init'||s.kind==='init')flush();
          if(s.kind==='wrapper-destroy')finish('native-wrapper-destroy');
        },
      }));
    }catch(error){failures.push({name:h.name,reason:String(error)});}
  }
  const moduleGroups=new Map();
  for(const m of spec.modules){const at=m.hook?.offset??m.offset;const list=moduleGroups.get(at)??[];list.push(m);moduleGroups.set(at,list);}
  function installModules(){
    if(moduleInstallStarted)return;moduleInstallStarted=true;
    for(const [at,modules]of moduleGroups){
    try{
      const target=modules[0].hook??modules[0];if(hexBytes(game.base.add(at),16)!==target.head&&verifiedOffsets.get(at)!==target.head)throw Error('Module fingerprint mismatch');
      roots.listeners.push(Interceptor.attach(game.base.add(at),{
        onEnter(args){
          this.selected=null;if(!session||!emitters.size)return;
          try{
            const context=args[0],owner=parameterOwners.get(key(context.add(0x10).readPointer()));if(!owner)return;
            const ref={node:owner.node};
            const candidates=modules.flatMap(m=>m.selections.filter(s=>s.node===ref.node.index).map(s=>({module:m.offset,stage:s.stage,name:m.name})));
            if(!candidates.length)return;
            const enclosing=[...stack()].reverse().find(s=>s.emitter?.node.index===ref.node.index);
            this.selected={context,ref,candidates,call:++entitySerial,enclosing:enclosing?.emitter??owner};
            this.before=moduleState(this.selected);record('module-enter',{call:this.selected.call,node:ref.node.index,emitter:this.selected.enclosing?.id??null,candidates,before:this.before});
          }catch(error){record('module-error',{offset:at,reason:String(error)});}
        },
        onLeave(){if(!this.selected||!session)return;record('module-leave',{call:this.selected.call,node:this.selected.ref.node.index,candidates:this.selected.candidates,after:safe(()=>moduleState(this.selected))});},
      }));
    }catch(error){failures.push({module:at,names:modules.map(m=>m.name),reason:String(error)});}
    }
    for(const w of spec.writers??[])try{
      if(hexBytes(game.base.add(w.offset),16)!==w.head)throw Error('Writer fingerprint mismatch');
      roots.listeners.push(Interceptor.attach(game.base.add(w.offset),{
        onEnter(args){
          this.sample=null;if(!session)return;
          try{
            const context=args[0],owner=parameterOwners.get(key(context.add(0x10).readPointer()));
            if(!owner||owner.node.typeId!==w.typeId)return;
            const stride=args[2].toUInt32();if(stride!==w.stride)throw Error('Unexpected original writer stride');
            this.sample={call:++entitySerial,node:owner.node.index,context,output:args[1],record:key(context.readPointer()),writer:w.offset,stride};
            record('writer-enter',{call:this.sample.call,node:owner.node.index,record:this.sample.record,writer:w.offset,stride,renderInputs:renderInputs(context)});
          }catch(error){record('writer-error',{writer:w.offset,reason:String(error)});}
        },
        onLeave(){
          const v=this.sample;if(!v||!session)return;
          record('writer-leave',{call:v.call,node:v.node,record:v.record,writer:v.writer,stride:v.stride,
            packed:safe(()=>hexBytes(v.output,6*v.stride)),renderInputs:safe(()=>renderInputs(v.context))});
        }
      }));
    }catch(error){failures.push({writer:w.offset,reason:String(error)});}
    Interceptor.flush();record('module-hooks-installed',{count:moduleGroups.size,writerHooks:spec.writers?.length??0,failures});flush();
  }
  const api={begin,finish,mark:(type,data)=>{if(data.frame!==undefined)controlledFrame=data.frame;record(type,data);flush();},
    bindWrapper:(p,details)=>{wrappers.set(key(p),details);record('controlled-wrapper-bind',{wrapper:key(p),...details});flush();},
    snapshot:()=>({active:!!session,events:session?.events??0,failures})};
  globalThis.__ffrogueLifecycle=api;
  let ioVerified=false;
  try{const file=new File(directory+'probe-ready.json','w');file.write(JSON.stringify({source:spec.file,readOnlyEngineObserver:true}));file.flush();file.close();ioVerified=true;}
  catch(error){failures.push({name:'output-directory',reason:String(error)});}
  emit('lifecycle-ready',{source:spec.file,sourceSha256:spec.sourceSha256,engineHooks:spec.hooks.length,moduleHooks:moduleGroups.size,moduleHookPolicy:'Install after exact-source Initialize entry',ioVerified,directory,failures});
  return api;
}
