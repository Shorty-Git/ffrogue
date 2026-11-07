/* Exact-build experiment: mirror actual game effect GPU draws to isolated FBOs. */
(() => {
  'use strict';
  const spec = __LIVE_EXPORT_SPEC__;
  const directory='/sdcard/Android/data/com.square_enix.ffbejpn/files/ffrogue-live-export-v2/';
  const roots={listeners:[],busy:false,request:null,target:null,scope:null,uploads:new Map(),audited:new Set(),uploadPixels:new Map(),uploadBytes:0};
  globalThis.__ffrogueLiveExport=roots;
  const log=new NativeFunction(Process.getModuleByName('liblog.so').getExportByName('__android_log_write'),'int',['int','pointer','pointer']);
  const tag=Memory.allocUtf8String('FFBE-Trace');
  function emit(type,data={}){log(4,tag,Memory.allocUtf8String(JSON.stringify({type,liveExportRevision:9,...data})));}
  function writeJson(file,data){const out=new File(directory+file,'w');try{out.write(JSON.stringify(data,null,2));out.flush();}finally{out.close();}}
  function matchesFile(runtimeName,sourceName){return runtimeName===sourceName||runtimeName===sourceName.replace(/\.bmb$/,'');}
  function bindControlledSource(wrapper,config){
    const request=roots.request;
    if(!request||config.creationMode!=='live-source'||config.token!==request.token
      ||config.files?.length!==1||config.files[0]!==request.file||wrapper.isNull())return false;
    const object=wrapper.toString();
    if(roots.target&&roots.target.object!==object)return false;
    roots.target={object,draws:0,nativeTick:0,sourceIdentity:{controlledSource:config.files[0],originalRequestedSource:config.from}};
    emit('live-export-source-bound',{token:request.token,object,...roots.target.sourceIdentity});
    return true;
  }
  roots.bindControlledSource=bindControlledSource;
  function selectWrapper(wrapper){
    if(roots.target)return roots.target.object===wrapper.toString();
    if(!matchesFile(cppString(wrapper.add(spec.filenameOffset)),roots.request.file))return false;
    roots.target={object:wrapper.toString(),draws:0,nativeTick:0};
    return true;
  }
  function validate(request){
    if(!request||!/^[a-zA-Z0-9_-]{1,64}$/.test(request.token)
      ||!['atk_slash1_white.bmb','atk_impact_001_pink.bmb','atk_aerialslash_001_green.bmb'].includes(request.file)
      ||!Array.isArray(request.draws)||!request.draws.length||request.draws.length>60
      ||request.draws.some((v,i)=>!Number.isInteger(v)||v<1||v>120||(i&&v<=request.draws[i-1])))
      throw Error('Invalid bounded live-export request');
    if(request.frames!==undefined||request.fixedStep!==undefined&&typeof request.fixedStep!=='boolean')throw Error('Unsupported live-export mode');
    if(request.textureAudit!==undefined&&typeof request.textureAudit!=='boolean')throw Error('Explicit texture-audit mode required');
    return request;
  }
  function cppString(address){
    const flag=address.readU8(),length=flag&1?address.add(8).readU64().toNumber():flag>>>1;
    if(length<1||length>128)throw Error('Invalid effect name length');
    return (flag&1?address.add(16).readPointer():address.add(1)).readUtf8String(length);
  }
  let attempts=0,lastToken='';
  const timer=setInterval(()=>{
    const game=Process.findModuleByName('libgame.so');
    if(!game){if(++attempts>240){clearInterval(timer);emit('live-export-blocked',{reason:'Native library timeout'});}return;}
    clearInterval(timer);
    try{
      if(Process.arch!=='arm64')throw Error('ARM64 required');
      const mkdir=new NativeFunction(Process.getModuleByName('libc.so').getExportByName('mkdir'),'int',['pointer','uint']);
      mkdir(Memory.allocUtf8String(directory),0o770);
      const addresses={};
      for(const [name,item]of Object.entries(spec.functions)){
        const address=game.getExportByName(item.symbol);
        const head=Array.from(new Uint8Array(address.readByteArray(16)),v=>v.toString(16).padStart(2,'0')).join('');
        if(head!==item.head&&globalThis.__ffrogueVerifiedNativeHeads?.get(item.symbol)!==item.head)throw Error('Native fingerprint mismatch: '+name);
        addresses[name]=address;
      }
      const gl=Process.getModuleByName('libGLESv2.so'),api={};
      const currentContext=new NativeFunction(Process.getModuleByName('libEGL.so').getExportByName('eglGetCurrentContext'),'pointer',[],{traps:'none'});
      const compress=new NativeFunction(addresses.compress,'int',['pointer','pointer','pointer','ulong','int']);
      const compressBound=new NativeFunction(addresses.compressBound,'ulong',['ulong']);
      const signatures={
        glGetString:['pointer',['uint']],
        glGetIntegerv:['void',['uint','pointer']],glGetFloatv:['void',['uint','pointer']],
        glGetProgramiv:['void',['uint','uint','pointer']],
        glGetActiveUniform:['void',['uint','uint','int','pointer','pointer','pointer','pointer']],
        glGetUniformLocation:['int',['uint','pointer']],glGetUniformfv:['void',['uint','int','pointer']],
        glGetUniformiv:['void',['uint','int','pointer']],glGetTexParameteriv:['void',['uint','uint','pointer']],
        glIsEnabled:['uint8',['uint']],glEnable:['void',['uint']],glDisable:['void',['uint']],
        glGenFramebuffers:['void',['int','pointer']],glBindFramebuffer:['void',['uint','uint']],
        glDeleteFramebuffers:['void',['int','pointer']],glCheckFramebufferStatus:['uint',['uint']],
        glGenTextures:['void',['int','pointer']],glBindTexture:['void',['uint','uint']],glDeleteTextures:['void',['int','pointer']],
        glTexParameteri:['void',['uint','uint','int']],glTexImage2D:['void',['uint','int','int','int','int','int','uint','uint','pointer']],
        glFramebufferTexture2D:['void',['uint','uint','uint','uint','int']],
        glGenRenderbuffers:['void',['int','pointer']],glBindRenderbuffer:['void',['uint','uint']],glDeleteRenderbuffers:['void',['int','pointer']],
        glRenderbufferStorage:['void',['uint','uint','int','int']],glFramebufferRenderbuffer:['void',['uint','uint','uint','uint']],
        glViewport:['void',['int','int','int','int']],glScissor:['void',['int','int','int','int']],
        glClearColor:['void',['float','float','float','float']],glClearDepthf:['void',['float']],glDepthMask:['void',['uint8']],
        glColorMask:['void',['uint8','uint8','uint8','uint8']],glClear:['void',['uint']],
        glReadPixels:['void',['int','int','int','int','uint','uint','pointer']],glGetError:['uint',[]],
        glPixelStorei:['void',['uint','int']],glActiveTexture:['void',['uint']],
        glDrawArrays:['void',['uint','int','int']],glDrawElements:['void',['uint','int','uint','pointer']],
      };
      // Mirrored API calls must not recursively enter their own interceptors.
      for(const [name,[ret,args]]of Object.entries(signatures))api[name]=new NativeFunction(gl.getExportByName(name),ret,args,{traps:'none'});
      function ints(name,count=1){const p=Memory.alloc(count*4);api.glGetIntegerv(name,p);return Array.from({length:count},(_,i)=>p.add(i*4).readS32());}
      function floats(name,count=1){const p=Memory.alloc(count*4);api.glGetFloatv(name,p);return Array.from({length:count},(_,i)=>p.add(i*4).readFloat());}
      function errors(){const out=[];for(let i=0;i<8;i++){const code=api.glGetError();if(!code)break;out.push(code);}return out;}
      for(const name of ['glTexImage2D','glCompressedTexImage2D']){
        const address=gl.findExportByName(name);if(!address)continue;
        roots.listeners.push(Interceptor.attach(address,{onEnter(args){
          if(roots.busy||args[0].toUInt32()!==0x0de1||args[1].toInt32()!==0)return;
          try{
            const context=currentContext().toString(),texture=ints(0x8069)[0];if(!texture)return;
            const key=context+'/'+texture,compressed=name==='glCompressedTexImage2D';
            if(!roots.uploads.has(key)&&roots.uploads.size>=512)roots.uploads.delete(roots.uploads.keys().next().value);
            const upload={context,texture,api:name,internalFormat:args[2].toUInt32(),
              width:args[3].toInt32(),height:args[4].toInt32(),
              ...(compressed?{compressedBytes:args[6].toInt32()}:{format:args[6].toUInt32(),type:args[7].toUInt32()}),
              observedAtMs:Date.now()};
            roots.uploads.set(key,upload);
            roots.uploadPixels.delete(key);
            if(roots.request?.textureAudit&&!compressed){
              try{const bytes=captureUploadInput(upload,args[8]);roots.uploadPixels.set(key,bytes);}
              catch(error){upload.inputUnavailable=String(error);}
            }
          }catch(error){emit('texture-upload-observer-error',{reason:String(error)});}
        }}));
      }
      function captureUploadInput(upload,pointer){
        const size=upload.width*upload.height*4;
        if(upload.format!==0x1908||upload.type!==0x1401||upload.width<1||upload.height<1
          ||size>1024*1024||roots.uploadBytes+size>4*1024*1024||pointer.isNull())throw Error('Unsupported/bounded CPU upload');
        const version=api.glGetString(0x1f02).readUtf8String();
        if(!/^OpenGL ES 3\./.test(version))throw Error('Explicit ES3 unpack-state evidence required');
        const unpack={alignment:ints(0x0cf5)[0],buffer:ints(0x88ef)[0],rowLength:ints(0x0cf2)[0],
          skipRows:ints(0x0cf3)[0],skipPixels:ints(0x0cf4)[0]};
        if(unpack.buffer||unpack.rowLength||unpack.skipRows||unpack.skipPixels
          ||![1,2,4,8].includes(unpack.alignment)||upload.width*4%unpack.alignment)throw Error('Non-contiguous CPU unpack layout');
        const bytes=pointer.readByteArray(size);roots.uploadBytes+=size;
        upload.cpuInput={version,unpack,bytes:size,scope:'Original client bytes at glTexImage2D entry, before driver upload'};
        return bytes;
      }
      function saveState(){return {
        framebuffer:ints(0x8ca6)[0],viewport:ints(0x0ba2,4),scissor:ints(0x0c10,4),
        scissorEnabled:api.glIsEnabled(0x0c11),stencilEnabled:api.glIsEnabled(0x0b90),
        texture:ints(0x8069)[0],activeTexture:ints(0x84e0)[0],renderbuffer:ints(0x8ca7)[0],
        clearColor:floats(0x0c22,4),clearDepth:floats(0x0b73)[0],depthMask:ints(0x0b72)[0],
        colorMask:ints(0x0c23,4),pack:ints(0x0d05)[0]};}
      function blendState(){return {enabled:!!api.glIsEnabled(0x0be2),srcRgb:ints(0x80c9)[0],dstRgb:ints(0x80c8)[0],
        srcAlpha:ints(0x80cb)[0],dstAlpha:ints(0x80ca)[0],equationRgb:ints(0x8009)[0],equationAlpha:ints(0x883d)[0],
        constant:floats(0x8005,4),depthTest:!!api.glIsEnabled(0x0b71),depthMask:ints(0x0b72)[0],colorMask:ints(0x0c23,4)};}
      function programState(){
        const program=ints(0x8b8d)[0],count=Memory.alloc(4);api.glGetProgramiv(program,0x8b86,count);
        const n=count.readS32();if(n<0||n>64)throw Error('Uniform count outside capture bound');
        const uniforms=[],units=new Set();
        for(let i=0;i<n;i++){
          const length=Memory.alloc(4),size=Memory.alloc(4),type=Memory.alloc(4),nameBuffer=Memory.alloc(256);
          api.glGetActiveUniform(program,i,256,length,size,type,nameBuffer);
          const name=nameBuffer.readUtf8String(length.readS32()),kind=type.readU32(),elements=size.readS32();
          const components=({5126:1,35664:2,35665:3,35666:4,35674:4,35675:9,35676:16,35678:1})[kind];
          if(!components||elements<1||elements>64){uniforms.push({name,type:kind,elements,unavailable:'Unsupported bounded uniform layout'});continue;}
          const values=[];
          for(let j=0;j<elements;j++){
            const key=elements===1?name:name.replace(/\[0\]$/, '['+j+']'),location=api.glGetUniformLocation(program,Memory.allocUtf8String(key));
            if(location<0){values.push(null);continue;}
            const output=Memory.alloc(components*4);
            if(kind===35678){api.glGetUniformiv(program,location,output);values.push([output.readS32()]);units.add(output.readS32());}
            else {api.glGetUniformfv(program,location,output);values.push(Array.from({length:components},(_,k)=>output.add(k*4).readFloat()));}
          }
          uniforms.push({name,type:kind,elements,values});
        }
        const active=ints(0x84e0)[0],textures=[];
        try{for(const unit of units){if(unit<0||unit>7)throw Error('Sampler unit outside capture bound');
          api.glActiveTexture(0x84c0+unit);const parameters={};
          for(const [name,key]of [['minFilter',0x2801],['magFilter',0x2800],['wrapS',0x2802],['wrapT',0x2803]]){
            const out=Memory.alloc(4);api.glGetTexParameteriv(0x0de1,key,out);parameters[name]=out.readS32();}
          textures.push({unit,texture:ints(0x8069)[0],parameters});
        }}finally{api.glActiveTexture(active);}
        return {program,uniforms,textures,cullEnabled:!!api.glIsEnabled(0x0b44),cullMode:ints(0x0b45)[0],frontFace:ints(0x0b46)[0],depthFunc:ints(0x0b74)[0],
          ditherEnabled:!!api.glIsEnabled(0x0bd0),sampleAlphaToCoverage:!!api.glIsEnabled(0x809e),
          framebufferBits:{red:ints(0x0d52)[0],green:ints(0x0d53)[0],blue:ints(0x0d54)[0],alpha:ints(0x0d55)[0],
            depth:ints(0x0d56)[0],stencil:ints(0x0d57)[0],subpixel:ints(0x0d50)[0],samples:ints(0x80a9)[0]}};
      }
      function auditBoundTextures(job,state){
        if(!job.config.textureAudit)return;
        const context=currentContext().toString();
        for(const binding of state.textures){
          const key=context+'/'+binding.texture,identity=job.config.token+'/'+key;
          if(roots.audited.has(identity)||roots.audited.size>=32)continue;
          roots.audited.add(identity);
          const upload=roots.uploads.get(key),receipt={token:job.config.token,context,texture:binding.texture,upload:upload??null,
            scope:'Read-only normalized texel readback from a bound original texture; not replacement upload bytes'};
          const saved=saveState(),fbo=Memory.alloc(4);fbo.writeU32(0);
          try{
            const input=roots.uploadPixels.get(key);
            if(input){const file=job.config.token+'-tex'+binding.texture+'-cpu.rgba';
              const out=new File(directory+file,'wb');try{out.write(input);out.flush();}finally{out.close();}
              receipt.cpuInputFile=file;}
            if(!upload||upload.width<1||upload.height<1||upload.width>2048||upload.height>2048)throw Error('Missing/bounded upload dimensions');
            receipt.preexistingErrors=errors();api.glGenFramebuffers(1,fbo);api.glBindFramebuffer(0x8d40,fbo.readU32());
            api.glFramebufferTexture2D(0x8d40,0x8ce0,0x0de1,binding.texture,0);
            receipt.framebufferStatus=api.glCheckFramebufferStatus(0x8d40);
            if(receipt.framebufferStatus!==0x8cd5)throw Error('Original texture is not color-renderable');
            receipt.output=outputPixels({width:upload.width,height:upload.height,prefix:job.config.token+'-tex'+binding.texture},
              {fbo,background:'original-texture',framebufferStatus:receipt.framebufferStatus},'normalized');
          }catch(error){receipt.unavailable=String(error);}
          finally{restore(saved);if(fbo.readU32())api.glDeleteFramebuffers(1,fbo);}
          writeJson(job.config.token+'-tex'+binding.texture+'.json',receipt);
          emit('live-texture-audit',receipt);
        }
      }
      function outputPixels(job,t,label){
        const size=job.width*job.height*4;
        if(!roots.buffers||roots.buffers.size!==size){const bound=Number(compressBound(size));
          roots.buffers={size,bound,pixels:Memory.alloc(size),packed:Memory.alloc(bound),length:Memory.alloc(8)};}
        const {pixels,packed,length,bound}=roots.buffers;
        api.glBindFramebuffer(0x8d40,t.fbo.readU32());api.glPixelStorei(0x0d05,1);
        api.glReadPixels(0,0,job.width,job.height,0x1908,0x1401,pixels);
        const codes=errors();if(codes.length)throw Error('Readback GL errors: '+JSON.stringify(codes));
        length.writeU64(bound);
        if(compress(packed,length,pixels,size,1)!==0)throw Error('Native compression failed');
        const bytes=length.readU64().toNumber(),file=job.prefix+'-'+label+'.rgba.zlib';
        const out=new File(directory+file,'wb');try{out.write(packed.readByteArray(bytes));out.flush();}finally{out.close();}
        return {background:t.background,file,bytes,rawBytes:size,encoding:'zlib-rgba8',framebufferStatus:t.framebufferStatus};
      }
      function finishRun(job){
        if(!job.run)return;
        const run=job.run;run.outputs=run.targets.filter(t=>t.background!=='transparent').map(t=>outputPixels(job,t,'run'+job.runs.length+'-'+t.background));
        destroy(run);job.runs.push(run);job.run=null;
      }
      function restore(s){
        api.glBindFramebuffer(0x8d40,s.framebuffer);api.glViewport(...s.viewport);
        api.glActiveTexture(s.activeTexture);api.glBindTexture(0x0de1,s.texture);api.glBindRenderbuffer(0x8d41,s.renderbuffer);
        api.glScissor(...s.scissor);(s.scissorEnabled?api.glEnable:api.glDisable)(0x0c11);
        api.glColorMask(...s.colorMask);api.glDepthMask(s.depthMask);api.glClearColor(...s.clearColor);api.glClearDepthf(s.clearDepth);
        api.glPixelStorei(0x0d05,s.pack);
      }
      function destroy(job){for(const t of job.targets||[]){
        if(t.fbo.readU32())api.glDeleteFramebuffers(1,t.fbo);
        if(t.texture.readU32())api.glDeleteTextures(1,t.texture);
        if(t.depth.readU32())api.glDeleteRenderbuffers(1,t.depth);
      }job.targets=[];}
      function initializeTargets(job,saved){
        const [, ,width,height]=saved.viewport;
        if(width<1||height<1||width>2560||height>2560)throw Error('Viewport exceeds bounded export size');
        if(saved.stencilEnabled)throw Error('Active stencil dependency unsupported');
        job.width=width;job.height=height;job.originalState=saved;job.targets=[];
        job.preexistingErrors=errors();
        for(const [background,rgba]of [['transparent',[0,0,0,0]],['black',[0,0,0,1]],['white',[1,1,1,1]]]){
          const t={background,fbo:Memory.alloc(4),texture:Memory.alloc(4),depth:Memory.alloc(4)};
          t.fbo.writeU32(0);t.texture.writeU32(0);t.depth.writeU32(0);job.targets.push(t);
          api.glGenTextures(1,t.texture);api.glBindTexture(0x0de1,t.texture.readU32());
          for(const [key,value]of [[0x2801,0x2600],[0x2800,0x2600],[0x2802,0x812f],[0x2803,0x812f]])api.glTexParameteri(0x0de1,key,value);
          api.glTexImage2D(0x0de1,0,0x1908,width,height,0,0x1908,0x1401,ptr(0));
          api.glGenFramebuffers(1,t.fbo);api.glBindFramebuffer(0x8d40,t.fbo.readU32());
          api.glFramebufferTexture2D(0x8d40,0x8ce0,0x0de1,t.texture.readU32(),0);
          api.glGenRenderbuffers(1,t.depth);api.glBindRenderbuffer(0x8d41,t.depth.readU32());
          api.glRenderbufferStorage(0x8d41,0x81a5,width,height);api.glFramebufferRenderbuffer(0x8d40,0x8d00,0x8d41,t.depth.readU32());
          t.framebufferStatus=api.glCheckFramebufferStatus(0x8d40);
          if(t.framebufferStatus!==0x8cd5)throw Error('Incomplete export framebuffer');
          api.glDisable(0x0c11);api.glColorMask(1,1,1,1);api.glDepthMask(1);api.glClearDepthf(1);
          api.glClearColor(...rgba);api.glClear(0x4000|0x0100);
        }
      }
      function mirror(job,name,args){
        const saved=saveState();
        try{
          if(!job.targets)initializeTargets(job,saved);
          restore(saved);
          if(saved.viewport[2]!==job.width||saved.viewport[3]!==job.height||saved.stencilEnabled)throw Error('Viewport/stencil changed within effect');
          const callArgs=name==='glDrawArrays'?[args[0].toUInt32(),args[1].toInt32(),args[2].toInt32()]
            :[args[0].toUInt32(),args[1].toInt32(),args[2].toUInt32(),args[3]];
          const count=name==='glDrawArrays'?callArgs[2]:callArgs[1];
          if(count<0||count>1000000)throw Error('Draw count outside bounded capture');
          const blend=blendState(),key=JSON.stringify(blend);
          if(!job.run||job.run.key!==key){
            finishRun(job);
            if(job.runs.length>=32)throw Error('Too many material runs');
            job.run={key,blend,commands:0};initializeTargets(job.run,saved);
          }
          // FBO construction may change texture/clear state; restore before
          // replaying the original command with its live uniforms/buffers.
          restore(saved);
          const renderState=programState();
          for(const t of [...job.targets,...job.run.targets]){
            api.glBindFramebuffer(0x8d40,t.fbo.readU32());api.glViewport(0,0,job.width,job.height);
            if(saved.scissorEnabled)api.glScissor(saved.scissor[0]-saved.viewport[0],saved.scissor[1]-saved.viewport[1],saved.scissor[2],saved.scissor[3]);
            api[name](...callArgs);
          }
          const glErrors=errors();if(glErrors.length)throw Error('Mirror GL errors: '+JSON.stringify(glErrors));
          job.run.commands++;
          auditBoundTextures(job,renderState);
          job.commands.push({renderState,name,mode:callArgs[0],count:name==='glDrawArrays'?callArgs[2]:callArgs[1],program:ints(0x8b8d)[0],blend});
        }finally{restore(saved);}
      }
      function finish(job){
        const saved=saveState();
        try{
          if(job.failure)throw Error(job.failure);
          finishRun(job);
          job.outputs=(job.targets||[]).map(t=>outputPixels(job,t,t.background));
          const receipt={token:job.config.token,file:job.config.file,drawIndex:job.drawIndex,width:job.width,height:job.height,
            nativeSha256:spec.nativeSha256,commands:job.commands,runs:job.runs,outputs:job.outputs,originalState:job.originalState,
            renderContext:job.renderContext??null,
            tick:job.nativeTick??null,nativeDelta:job.nativeDelta??null,fixedStep:job.config.fixedStep===true,empty:!job.commands.length,
            approved:false,status:'gpu-mirrored',scope:'Actual ordered GL draws mirrored during one normally loaded effect wrapper; no extra simulation or wrapper redraw'};
          writeJson(job.prefix+'.json',receipt);
          emit('live-export-frame',{token:job.config.token,drawIndex:job.drawIndex,gpuCommands:job.commands.length,outputs:job.outputs});
        }finally{restore(saved);destroy(job);if(job.run)destroy(job.run);}
      }
      for(const name of ['glDrawArrays','glDrawElements'])roots.listeners.push(Interceptor.attach(gl.getExportByName(name),{
        onEnter(args){
          const job=roots.scope;if(!job||roots.busy||job.failure||this.threadId!==job.thread)return;
          roots.busy=true;try{mirror(job,name,args);}catch(error){job.failure=String(error);}finally{roots.busy=false;}
          // The original game command still executes normally after this hook.
        },
      }));
      roots.listeners.push(Interceptor.attach(addresses.update,{
        onEnter(args){
          this.track=false;this.fixedOriginal=undefined;this.wrapper=args[0];
          try{
            if(!roots.request)return;
            if(!selectWrapper(args[0]))return;
            if(roots.request.fixedStep){
              this.fixedOriginal=args[0].add(0x4f6).readU8();args[0].add(0x4f6).writeU8(1);
              if(roots.target.fixedOriginal===undefined){roots.target.fixedOriginal=this.fixedOriginal;
                emit('live-export-fixed-step',{token:roots.request.token,originalFlag:this.fixedOriginal,speedMultiplier:args[0].add(0x4f0).readFloat()});}
            }
            this.wrapper=args[0];this.track=args[0].add(0x4e4).readS32()<=0&&!args[0].add(0x4ec).readU8();
          }catch(error){emit('live-export-failed',{reason:String(error)});roots.request=null;}
        },
        onLeave(){if(this.fixedOriginal!==undefined)this.wrapper.add(0x4f6).writeU8(this.fixedOriginal);if(this.track&&roots.target){const a=this.wrapper.add(0x460).readPointer();if(!a.isNull())roots.target.nativeTick+=a.add(4).readFloat();}},
      }));
      roots.listeners.push(Interceptor.attach(addresses.draw,{
        onEnter(args){
          this.capture=null;this.previous=roots.scope;this.wrapper=args[0];
          if(roots.busy||!roots.request)return;
          try{
            if(!selectWrapper(args[0]))return;
            const index=++roots.target.draws;if(!roots.request.draws.includes(index))return;
            this.capture={config:roots.request,drawIndex:index,thread:this.threadId,commands:[],runs:[],prefix:roots.request.token+'-d'+index,nativeTick:roots.target.nativeTick,nativeDelta:args[0].add(0x460).readPointer().add(4).readFloat()};
            try{
              const animation=args[0].add(0x460).readPointer(),scenePointer=new NativeFunction(addresses.scene,'pointer',[])();
              const read=(p,n)=>Array.from({length:n},(_,i)=>p.add(i*4).readFloat());
              this.capture.renderContext={incomingModelView:read(args[1],16),position:read(animation.add(8),3),scale:read(animation.add(0x20),3),
                colorScale:read(animation.add(0x44),4),view:read(scenePointer,16),projection:read(scenePointer.add(0x40),16),
                viewport:[scenePointer.add(0x80).readU32(),scenePointer.add(0x84).readU32()]};
            }catch(error){this.capture.renderContext={unavailable:String(error)};}
            globalThis.__ffrogueLifecycle?.mark('gpu-reference-draw',{drawIndex:index,tick:this.capture.nativeTick,renderContext:this.capture.renderContext});
            roots.scope=this.capture;
          }catch(error){emit('live-export-failed',{reason:String(error)});roots.request=null;}
        },
        onLeave(){
          const job=this.capture;if(!job)return;roots.scope=this.previous;roots.busy=true;
          try{finish(job);
          }catch(error){emit('live-export-failed',{token:job.config.token,drawIndex:job.drawIndex,reason:String(error)});roots.request=null;}
          finally{roots.busy=false;}
          if(roots.request&&job.drawIndex===job.config.draws[job.config.draws.length-1]){emit('live-export-complete',{token:job.config.token});roots.request=null;}
        },
      }));
      roots.requestTimer=setInterval(()=>{
        if(roots.request&&Date.now()>roots.request.expiresAt){emit('live-export-expired',{token:roots.request.token});roots.request=null;}
        if(roots.busy||roots.request)return;
        try{const request=validate(JSON.parse(File.readAllText(directory+'request.json')));if(request.token===lastToken)return;
          lastToken=request.token;request.expiresAt=Date.now()+90000;roots.request=request;roots.target=null;
          roots.audited.clear();roots.uploadPixels.clear();roots.uploadBytes=0;emit('live-export-armed',request);
        }catch(_){/* Missing/invalid requests never execute GPU calls. */}
      },500);
      emit('live-export-ready',{nativeSha256:spec.nativeSha256,requestPath:directory+'request.json',creationMode:'Actual GPU command mirror; no isolated factory'});
    }catch(error){emit('live-export-blocked',{reason:String(error)});}
  },250);
})();
