// Bounded source-context observations. No simulation or GL state is modified.
function createPipelineObserver({spec,game,emit,active,hexBytes,rendererScopes,roots}) {
  const modules=new Map(spec.modules.map(m=>[m.offset,m])),scopes=new Map(),handles=[],installed=new Set(),failed=new Set(),budgets=new Map(),gpuBudgets=new Map(),gpuSeen=new Set(),inventories=new Set(),ambiguous=new Set();
  let enabled=false,files=new Set(),serial=0,submitSerial=0;
  const submitBudgets=new Map(),submitSeen=new Set();
  for(const m of modules.values()){
    if(hexBytes(game.base.add(m.offset),16)!==m.head)throw Error('Pipeline callback fingerprint mismatch: '+m.name);
    if(m.hook&&hexBytes(game.base.add(m.hook.offset),16)!==m.hook.head)throw Error('Pipeline delegate fingerprint mismatch: '+m.name);
  }
  const floats=(address,count)=>Array.from({length:count},(_,i)=>{const v=address.add(i*4).readFloat();return Number.isFinite(v)?v:null;});

  function identify(object,file){
    const parameter=object.add(0xf0).readPointer();
    for(const ref of spec.nodes){
      if(ref.file!==file||hexBytes(parameter.sub(ref.nodeOffset),8)!==ref.header)continue;
      if(ref.windows.some(w=>hexBytes(parameter.add(w.offset),w.hex.length/2)!==w.hex))continue;
      return {ref,parameter};
    }
    return null;
  }

  function snapshot(context,stage,recordBytes,recordOffset=null){
    const cursor=context.add(8).readU32(),record=context.readPointer();
    if(cursor>4096)throw Error('Pipeline record cursor outside bounded window');
    const offset=recordOffset??cursor;
    const data={cursor,record:record.toString(),recordOffset:offset};
    if(recordBytes){
      if(record.isNull()||offset>4096||recordBytes>24)throw Error('Invalid pipeline record span');
      data.recordHex=hexBytes(record.add(offset),recordBytes);
      data.recordFloats=floats(record.add(offset),recordBytes/4);
    }
    if(stage==='init'||stage==='update'){
      const rng=context.add(0x30).readPointer();
      data.rngPointer=rng.toString();
      data.rngWords=Array.from({length:4},(_,i)=>rng.add(i*4).readU32());
    }
    if(stage==='update'){
      data.delta40=context.add(0x40).readFloat();
      data.lifeFraction50=context.add(0x50).readFloat();
      data.scaleE8=floats(context.add(0xe8),3);
      data.translationF4=floats(context.add(0xf4),3);
      if(!Number.isFinite(data.delta40)||!Number.isFinite(data.lifeFraction50))throw Error('Invalid native update fields');
    }
    if(stage==='make'){
      data.center98=floats(context.add(0x98),3);data.rotationB0=floats(context.add(0xb0),3);
      data.scaleBC=floats(context.add(0xbc),3);data.groupScaleC8=floats(context.add(0xc8),3);
      data.alpha164=context.add(0x164).readFloat();
    }
    return data;
  }

  function callback(m){
    const hook=m.hook??m,hookOffset=hook.offset;
    if(installed.has(hookOffset))return true;
    if(failed.has(hookOffset))return false;
    try{handles.push(Interceptor.attach(game.base.add(hookOffset),{
      onEnter(args){
        this.enabled=false;
        const scope=scopes.get(Process.getCurrentThreadId())?.slice(-1)[0];
        if(!enabled||!active()||!scope)return;
        const candidates=[...modules.values()].filter(candidate=>(candidate.hook?.offset??candidate.offset)===hookOffset&&scope.allowed.has(candidate.offset));
        if(candidates.length!==1){
          if(candidates.length>1&&!ambiguous.has(scope.key+':'+hookOffset)){
            ambiguous.add(scope.key+':'+hookOffset);emit('pipeline-hook-ambiguous',{file:scope.ref.file,node:scope.ref.node,stage:scope.stage,hookOffset});
          }
          return;
        }
        const selected=candidates[0];
        try{
          // Unlike a nearest stack scope, this rejects callbacks of descendants.
          if(!args[0].add(0x10).readPointer().equals(scope.parameter))return;
          const record=args[0].readPointer().toString(),context=args[0].toString();
          if(scope.record!==undefined&&(scope.record!==record||scope.context!==context))return;
          if(scope.record===undefined){
            if((budgets.get(scope.key)||0)>=6)return;
            budgets.set(scope.key,(budgets.get(scope.key)||0)+1);scope.record=record;scope.context=context;scope.id=++serial;
            emit('pipeline-sample',{sampleId:scope.id,file:scope.ref.file,node:scope.ref.node,stage:scope.stage,
              emitter:scope.object.toString(),parameter:scope.parameter.toString(),wrapper:scope.wrapper,
              sourceSha256:scope.ref.sourceSha256,callbacks:scope.callbacks,
              identity:'Pinned source windows, named wrapper scope and exact context parameter equality'});
          }
          this.selected=selected;this.scope=scope;this.pointer=args[0];this.before=snapshot(args[0],scope.stage,selected.recordBytes);
          this.enabled=true;
        }catch(error){emit('pipeline-unreadable',{stage:scope.stage,file:scope.ref.file,node:scope.ref.node,reason:String(error)});}
      },
      onLeave(){
        if(!this.enabled||!active())return;
        try{
          const s=this.scope,m=this.selected,after=snapshot(this.pointer,s.stage,m.recordBytes,this.before.recordOffset);
          emit('pipeline-module',{sampleId:s.id,file:s.ref.file,node:s.ref.node,stage:s.stage,
            offset:m.offset,symbol:m.name,fingerprintVerified:true,hookOffset,hookSymbol:hook.name,hookFingerprintVerified:true,before:this.before,after,
            rngMatchesEmitter:this.before.rngPointer===s.object.add(0x130).toString()});
        }catch(error){emit('pipeline-unreadable',{sampleId:this.scope.id,reason:String(error)});}
      }
    }));installed.add(hookOffset);return true;
    }catch(error){failed.add(hookOffset);emit('pipeline-hook-unavailable',{offset:m.offset,hookOffset,reason:String(error)});return false;}
  }

  for(const hook of spec.emitterHooks){
    const address=game.base.add(hook.offset);
    if(hexBytes(address,16)!==hook.head)throw Error('Pipeline emitter fingerprint mismatch');
    roots.listeners.push(Interceptor.attach(address,{
      onEnter(args){
        this.enabled=false;
        if(!enabled||!active())return;
        const thread=Process.getCurrentThreadId(),renderer=rendererScopes.get(thread)?.slice(-1)[0];
        if(!renderer||!files.has(renderer.file))return;
        try{
          const identity=identify(args[0],renderer.file);if(!identity)return;
          const {ref,parameter}=identity,key=args[0].toString()+':'+hook.stage;
          if((budgets.get(key)||0)>=6)return;
          const table=args[0].add(hook.tableOffset).readPointer(),count=table.add(8).readU32(),array=table.readPointer();
          if(count>96||(count&&array.isNull()))throw Error('Invalid pipeline module array');
          const allowed=new Set(),callbacks=[];
          for(let i=0;i<count;i++){
            const fn=array.add(i*8).readPointer(),offset=fn.sub(game.base).toUInt32(),m=modules.get(offset);
            const hookInstalled=m?callback(m):false;
            callbacks.push({offset,verified:!!m,hookOffset:m?(m.hook?.offset??offset):null,hookInstalled});
            if(hookInstalled)allowed.add(offset);
          }
          const scope={ref,parameter,key,stage:hook.stage,object:args[0],wrapper:renderer.object,allowed,callbacks};
          if(!inventories.has(key)){inventories.add(key);emit('pipeline-stage-inventory',{file:ref.file,node:ref.node,stage:hook.stage,emitter:args[0].toString(),wrapper:renderer.object,callbacks});}
          const stack=scopes.get(thread)||[];stack.push(scope);scopes.set(thread,stack);this.thread=thread;this.enabled=true;
        }catch(error){emit('pipeline-unreadable',{stage:hook.stage,file:renderer.file,reason:String(error)});}
      },
      onLeave(){
        if(!this.enabled)return;
        const stack=scopes.get(this.thread),scope=stack.pop();if(!stack.length)scopes.delete(this.thread);
        if(scope.id)emit('pipeline-sample-end',{sampleId:scope.id,stage:scope.stage});
      }
    }));
  }

  let gpuModule=null;
  function readGpu(){
    if(!gpuModule||gpuModule.version(0x1f02).isNull())throw Error('No current GLES context');
    const read=(key,count)=>{const p=Memory.alloc(count*4);gpuModule.get(key,p);return Array.from({length:count},(_,i)=>p.add(i*4).readS32());};
    return {viewport:read(0x0ba2,4),scissorEnabled:!!gpuModule.isEnabled(0x0c11),scissorBox:read(0x0c10,4),
      framebuffer:read(0x8ca6,1)[0],program:read(0x8b8d,1)[0]};
  }
  function installSubmissions(){
    for(const entry of spec.submissions??[]){
      if(hexBytes(game.base.add(entry.offset),16)!==entry.head)throw Error('Native submission fingerprint mismatch');
      handles.push(Interceptor.attach(game.base.add(entry.offset),{
        onEnter(args){
          this.enabled=false;
          const scope=rendererScopes.get(Process.getCurrentThreadId())?.slice(-1)[0];
          if(!enabled||!active()||scope?.phase!=='renderer-draw'||!files.has(scope.file))return;
          const key=scope.file+':'+entry.kind,drawKey=key+':'+scope.object+':'+scope.drawId;
          if((submitBudgets.get(key)||0)>=6||submitSeen.has(drawKey))return;
          submitSeen.add(drawKey);submitBudgets.set(key,(submitBudgets.get(key)||0)+1);
          this.id=++submitSerial;this.scope=scope;
          try{
            const context=args[0];
            this.inputs={context:context.toString(),vertexCount7C:context.add(0x7c).readU32(),
              indexCount80:context.add(0x80).readU32(),indexType84:context.add(0x84).readU32(),
              indexByteOffset88:context.add(0x88).readU32(),topologyB8:context.add(0xb8).readU32()};
            this.gpuObservationAtEntry={fileSamplesUsed:gpuBudgets.get(scope.file)||0,maxFileSamples:6,
              alreadySampledDraw:gpuSeen.has(scope.file+':'+scope.object+':'+scope.drawId)};
            emit('pipeline-native-submit-enter',{nativeSubmitId:this.id,file:scope.file,wrapper:scope.object,
              drawId:scope.drawId,kind:entry.kind,offset:entry.offset,fingerprintVerified:true,inputs:this.inputs,
              gpuObservationAtEntry:this.gpuObservationAtEntry});
            this.enabled=true;
          }catch(error){emit('pipeline-submit-unreadable',{nativeSubmitId:this.id,file:scope.file,kind:entry.kind,reason:String(error)});}
        },
        onLeave(){
          if(!this.enabled||!active())return;
          const scope=this.scope,data={nativeSubmitId:this.id,file:scope.file,wrapper:scope.object,drawId:scope.drawId,
            kind:entry.kind,offset:entry.offset,fingerprintVerified:true,inputs:this.inputs,gpuObservationAtEntry:this.gpuObservationAtEntry,
            note:'Native submission returned; GPU call execution and source primitive ownership are not inferred'};
          try{data.gpuStateAfterReturn=readGpu();}catch(error){data.gpuUnavailable=String(error);}
          try{
            if(typeof scope.pipelineReadContext!=='function')throw Error('Exact native-submit context reader absent');
            data.rootAfterReturn=scope.pipelineReadContext();
          }catch(error){data.rootUnavailable=String(error);}
          emit('pipeline-native-submit',data);
        }
      }));
    }
  }
  function installGpu(){
    if(gpuModule)return;
    const gl=Process.findModuleByName('libGLESv2.so');
    if(!gl){emit('pipeline-gpu-unavailable',{reason:'libGLESv2.so absent'});return;}
    const get=new NativeFunction(gl.getExportByName('glGetIntegerv'),'void',['uint','pointer']);
    const isEnabled=new NativeFunction(gl.getExportByName('glIsEnabled'),'uchar',['uint']);
    const version=new NativeFunction(gl.getExportByName('glGetString'),'pointer',['uint']);
    gpuModule={gl,get,isEnabled,version};
    for(const name of ['glDrawArrays','glDrawElements'])handles.push(Interceptor.attach(gl.getExportByName(name),{onEnter(args){
      if(!enabled||!active())return;
      const scope=rendererScopes.get(Process.getCurrentThreadId())?.slice(-1)[0];
      if(scope?.phase!=='renderer-draw'||!files.has(scope.file)||(gpuBudgets.get(scope.file)||0)>=6)return;
      const drawKey=scope.file+':'+scope.object+':'+scope.drawId;
      if(gpuSeen.has(drawKey))return;
      gpuSeen.add(drawKey);
      gpuBudgets.set(scope.file,(gpuBudgets.get(scope.file)||0)+1);
      try{
        if(version(0x1f02).isNull())throw Error('No current GLES context');
        try{
          if(typeof scope.pipelineReadContext!=='function')throw Error('No context reader for this exact wrapper draw');
          emit('pipeline-draw-context',{drawId:scope.drawId,file:scope.file,wrapper:scope.object,capturePoint:'actual-gpu-call',...scope.pipelineReadContext()});
        }catch(error){emit('pipeline-draw-unreadable',{drawId:scope.drawId,file:scope.file,reason:String(error)});}
        emit('pipeline-gpu-draw',{file:scope.file,wrapper:scope.object,drawId:scope.drawId,api:name,
          mode:args[0].toUInt32(),count:args[name==='glDrawArrays'?2:1].toInt32(),
          ...readGpu(),
          note:'Actual GLES call within selected wrapper draw; primitive/source-node ownership is not inferred'});
      }catch(error){emit('pipeline-gpu-unreadable',{file:scope.file,drawId:scope.drawId,reason:String(error)});}
    }}));
  }

  function stop(){
    if(scopes.size)return;
    for(const handle of handles.splice(0))handle.detach();installed.clear();failed.clear();gpuModule=null;
    if(enabled)emit('pipeline-stopped',{reason:'capture window ended',samples:[...budgets],gpuSamples:[...gpuBudgets]});
    enabled=false;
  }
  return {
    begin(requested,on,nativeSubmissions=false){if(scopes.size)throw Error('Cannot rearm inside a native emitter scope');stop();budgets.clear();gpuBudgets.clear();gpuSeen.clear();submitBudgets.clear();submitSeen.clear();inventories.clear();ambiguous.clear();files=new Set(requested);enabled=on===true;
      if(enabled){installGpu();if(nativeSubmissions)installSubmissions();emit('pipeline-armed',{files:[...files],maxSamplesPerNodeStage:6,maxGpuSamplesPerFile:6,gpuBudgetUnit:'distinct-wrapper-draw',nativeSubmissions:nativeSubmissions===true,
        note:'First bounded record per emitter invocation; delta/RNG under observation, not uninstrumented performance'});}},
    tick(){if(!active())stop();},snapshot,
    drawContext(scope,read){
      if(enabled&&active()&&files.has(scope.file)&&scope.phase==='renderer-draw')scope.pipelineReadContext=read;
    },
  };
}
