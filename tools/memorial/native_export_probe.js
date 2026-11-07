/* Bounded exact-build native export experiment, independent of battle commands. */
(() => {
  'use strict';
  const spec = __NATIVE_EXPORT_SPEC__;
  const directory = '/sdcard/Android/data/com.square_enix.ffbejpn/files/ffrogue-native-export-v3/';
  const requestPath = directory + 'request.json';
  const roots = { listeners: [], functions: {}, job: null };
  globalThis.__ffrogueNativeExport = roots;
  const tag = Memory.allocUtf8String('FFBE-Trace');
  const writeLog = new NativeFunction(Process.getModuleByName('liblog.so').getExportByName('__android_log_write'), 'int', ['int', 'pointer', 'pointer']);
  let count = 0, lastToken = '', pending = null, busy = false;
  function emit(type, data = {}) {
    if (++count > 300) return;
    writeLog(4, tag, Memory.allocUtf8String(JSON.stringify({ type, nativeExportRevision: 3, ...data })));
  }
  function validate(config) {
    if (!config || !/^[a-zA-Z0-9_-]{1,64}$/.test(config.token)
        || !['direct-parameter', 'game-factory','live-source'].includes(config.creationMode)
        || !Array.isArray(config.files) || config.files.length < 1 || config.files.length > 2
        || config.files.some(file => !['atk_impact_001_pink.bmb', 'atk_aerialslash_001_green.bmb',...(config.stateOnly===true?['atk_slash1_white.bmb']:[])].includes(file))
        || !Array.isArray(config.frames) || config.frames.length < 1 || config.frames.length > 5
        || config.frames.some((frame, i) => !Number.isInteger(frame) || frame < 0 || frame > (config.stateOnly===true?600:90) || (i && frame <= config.frames[i - 1]))
        || !Number.isInteger(config.repeats) || config.repeats < 1 || config.repeats > 2)
      throw Error('Invalid bounded native export request');
    if(config.stateOnly!==undefined&&typeof config.stateOnly!=='boolean')throw Error('Explicit state-only mode required');
    if(config.stateOnly&&(!['game-factory','live-source'].includes(config.creationMode)||config.files.length!==1||config.repeats!==1))throw Error('State mode uses one original factory effect per request');
    if(config.creationMode==='live-source'&&(!config.stateOnly||config.files[0]!=='atk_slash1_white.bmb'||config.from!=='atk_slash3_green'))throw Error('Bounded live-source diagnostic inputs required');
    if(config.fixedDelta!==undefined&&(config.creationMode!=='live-source'||config.fixedDelta!==1))throw Error('Only explicit live unit-step measurement is admitted');
    return config;
  }
  function writeJson(path, value) {
    const file = new File(path, 'w');
    try { file.write(JSON.stringify(value, null, 2));file.flush(); } finally { file.close(); }
  }
  function cppStringReference(text) {
    // const std::string& only: the callee must not take ownership of this storage.
    const bytes = Memory.allocUtf8String(text), value = Memory.alloc(24);
    value.writeByteArray(new Uint8Array(24));value.writeU64((text.length + 1) | 1);
    value.add(8).writeU64(text.length);value.add(16).writePointer(bytes);
    return { value, bytes };
  }
  let attempts = 0;
  const timer = setInterval(() => {
    const game = Process.findModuleByName('libgame.so');
    if (!game) { if (++attempts > 240) { clearInterval(timer);emit('native-export-blocked', { reason: 'Native library timeout' }); } return; }
    clearInterval(timer);
    try {
      if (Process.arch !== 'arm64') throw Error('ARM64 required');
      const mkdir=new NativeFunction(Process.getModuleByName('libc.so').getExportByName('mkdir'),'int',['pointer','uint']);
      mkdir(Memory.allocUtf8String(directory),0o770);
      const addresses = {};
      for (const [name, item] of Object.entries(spec.functions)) {
        const address = game.getExportByName(item.symbol);
        const head = Array.from(new Uint8Array(address.readByteArray(16)), byte => byte.toString(16).padStart(2, '0')).join('');
        if (head !== item.head&&globalThis.__ffrogueVerifiedNativeHeads?.get(item.symbol)!==item.head) throw Error('Native export fingerprint mismatch: ' + name);
        addresses[name] = address;
      }
      const signatures = {
        create: ['pointer', ['pointer']], unschedule: ['void', ['pointer']],
        retain: ['void', ['pointer']], release: ['void', ['pointer']],
        reset: ['void', ['pointer']], step: ['void', ['pointer']],expired:['uint8',['pointer']],
        texture: ['pointer', ['int', 'int']], begin: ['void', ['pointer', 'float', 'float', 'float', 'float']],
        end: ['void', ['pointer']], visit: ['void', ['pointer']],
        director: ['pointer', []], render: ['void', ['pointer']],
        image: ['pointer', ['pointer', 'uint8']], save: ['uint8', ['pointer', 'pointer', 'uint8']],
        scene: ['pointer', []],
        list: ['pointer', []],
        stringCreate: ['void', ['pointer', 'pointer']], stringDestroy: ['void', ['pointer']],
        factory: ['pointer', ['pointer', 'pointer', 'int', 'float', 'float', 'int', 'uint8', 'uint8']],
        arrayRemove: ['void', ['pointer', 'pointer', 'uint8']], detach: ['void', ['pointer', 'uint8']],
      };
      for (const [name, signature] of Object.entries(signatures)) roots.functions[name] = new NativeFunction(addresses[name], ...signature, {traps:'all'});
      const api = roots.functions;
      function cleanup(job) {
        if (job.node) { api.release(job.node);job.node = null; }
        if (job.texture) { api.release(job.texture);job.texture = null; }
      }
      function saveManifest(job, status, reason) {
        const manifest = { token: job.config.token, status, reason: reason || null,
          nativeSha256: spec.nativeSha256, requestedSize: [640, 1136],
          creationMode: job.config.creationMode,
          nativeDeltaPerStep: 1, initialDelta:0, root: [320, 568, 0], scale: job.config.stateOnly?null:1.775,
          cameraPolicy: job.config.stateOnly?'Existing game host; no camera writes and no rendering':'Explicit identity view and 640x1136 orthographic projection; shared native scene restored after each output step',
          createParamPolicy: job.config.stateOnly?'Original game factory, x320/y568/layer0/flags0; measured engine initialization, not battle provenance':'32-byte zeroed factory-equivalent parameter, filename at 0 and uint64 1 at 24; remaining semantics unverified',
          scene: job.scene, results: job.results, approved: false,
          limitations: ['A PNG alone does not establish additive/layer compositing fidelity.',
            'Native seed/reset determinism is measured by repeated outputs, not assumed.',
            'Distortion and skill member scheduling are outside this isolated-effect experiment.'] };
        writeJson(directory + job.config.token + '-manifest.json', manifest);
      }
      function start(config) {
        api.list();
        const scene = api.scene();
        if (scene.isNull()) throw Error('Native scene unavailable');
        const floats = (offset, length) => Array.from({ length }, (_, i) => scene.add(offset + i * 4).readFloat());
        const sceneState = { view: floats(0, 16), projection: floats(0x40, 16), viewport: [scene.add(0x80).readU32(), scene.add(0x84).readU32()] };
        if (![...sceneState.view, ...sceneState.projection].every(Number.isFinite)) throw Error('Invalid host native camera');
        const job = { config, fileIndex: 0, repeat: 0, frameIndex: 0, node: null, texture: null, scene: sceneState, results: [], strings: [] };
        roots.job = job;
        if(!config.stateOnly){job.texture = api.texture(640, 1136);
          if (job.texture.isNull()) { job.texture = null;throw Error('Native RenderTexture creation failed'); }
          api.retain(job.texture);}
        emit('native-export-start', { token: config.token, files: config.files, frames: config.frames, repeats: config.repeats });
        return job;
      }
      function createEffect(job) {
        if(job.config.stateOnly&&!globalThis.__ffrogueLifecycle?.snapshot().active)throw Error('Lifecycle recorder must be armed before factory creation');
        globalThis.__ffrogueLifecycle?.mark('controlled-create-start',{frame:-1,mode:job.config.creationMode});
        const filename = job.config.files[job.fileIndex], text = Memory.allocUtf8String(filename.replace(/\.bmb$/, '')), parameter = Memory.alloc(32);
        parameter.writeByteArray(new Uint8Array(32));parameter.writePointer(text);parameter.add(24).writeU64(1);
        job.strings = [text, parameter];
        let node;
        if (job.config.creationMode === 'game-factory') {
          const name = Memory.alloc(24), input = Memory.allocUtf8String(filename);
          api.stringCreate(name, input);
          const stringFlag=name.readU8(),stringLength=stringFlag&1?name.add(8).readU64().toNumber():stringFlag>>>1;
          const actualName=(stringFlag&1?name.add(16).readPointer():name.add(1)).readUtf8String(Math.min(stringLength,128));
          const list=api.list();
          globalThis.__ffrogueLifecycle?.mark('controlled-factory-input',{frame:-1,list:list.toString(),name:actualName,stringLength,flags:[0,0],position:[320,568]});
          if(actualName!==filename||list.isNull())throw Error('Native factory input validation failed');
          try { node = api.factory(list, name, 0, 320, 568, 0, 0, 0); }
          finally { api.stringDestroy(name); }
        } else node = api.create(parameter);
        if (node.isNull()) throw Error('Named native effect creation returned null: ' + filename);
        job.node = node;api.retain(node);api.unschedule(node);
        if (job.config.creationMode === 'game-factory') {
          api.detach(node, 0);
          api.arrayRemove(api.list().add(0x28).readPointer(), node, 1);
        }
        job.animation = node.add(0x460).readPointer();
        if (job.animation.isNull()) throw Error('Created node lacks native animation');
        globalThis.__ffrogueLifecycle?.mark('controlled-reset',{frame:-1});api.reset(job.animation);job.frame = 0;
        if(job.config.stateOnly){
          globalThis.__ffrogueLifecycle.mark('controlled-step',{frame:0,delta:0});job.animation.add(4).writeFloat(0);api.step(job.animation);
          return;
        }
        for (const [offset, values] of [[8, [320, 568, 0]], [0x20, [1.775, 1.775, 1.775]]])
          values.forEach((value, i) => job.animation.add(offset + i * 4).writeFloat(value));
        job.animation.add(4).writeFloat(0);api.step(job.animation);
        emit('native-export-created', { token: job.config.token, file: filename, repeat: job.repeat,
          node: node.toString(), animation: job.animation.toString() });
      }
      function advance(job) {
        if (!job.node) createEffect(job);
        const frame = job.config.frames[job.frameIndex];
        if(job.config.stateOnly){
          while(job.frame<frame&&!api.expired(job.animation)){
            job.frame++;globalThis.__ffrogueLifecycle.mark('controlled-step',{frame:job.frame,delta:1});
            job.animation.add(4).writeFloat(1);api.step(job.animation);
            globalThis.__ffrogueLifecycle.mark('controlled-step-end',{frame:job.frame,expired:!!api.expired(job.animation)});
          }
          const expired=!!api.expired(job.animation);job.results.push({frame:job.frame,expired,scope:'Original source simulation via factory; explicit deltas, no render pass'});
          job.frameIndex++;
          if(expired||job.frameIndex===job.config.frames.length){
            globalThis.__ffrogueLifecycle.mark('controlled-release',{frame:job.frame,expired});cleanup(job);
            saveManifest(job,expired?'state-complete':'state-truncated');roots.job=null;
            globalThis.__ffrogueLifecycle.finish(expired?'native-expired':'controlled-step-cap');
            emit('native-export-state-complete',{token:job.config.token,expired,frame:job.frame});
          }
          return;
        }
        while (job.frame < frame) { job.animation.add(4).writeFloat(1);api.step(job.animation);job.frame++; }
        const director = api.director(), renderer = director.add(0x1d0).readPointer();
        if (renderer.isNull()) throw Error('Native renderer unavailable');
        for (const [background, rgba] of [['transparent', [0, 0, 0, 0]], ['black', [0, 0, 0, 1]], ['white', [1, 1, 1, 1]]]) {
          api.begin(job.texture, ...rgba);api.visit(job.node);api.end(job.texture);api.render(renderer);
          const image = api.image(job.texture, 1);
          if (image.isNull()) throw Error('Native framebuffer image read failed');
          const file = job.config.token + '-' + job.fileIndex + '-r' + job.repeat + '-f' + frame + '-' + background + '.png';
          try {
            const path = cppStringReference(directory + file);
            if (!api.save(image, path.value, 0)) throw Error('Native PNG save failed');
          } finally { api.release(image); }
          job.results.push({ file, effect: job.config.files[job.fileIndex], repeat: job.repeat, frame, background });
        }
        emit('native-export-frame', { token: job.config.token, effect: job.config.files[job.fileIndex], repeat: job.repeat, frame });
        job.frameIndex++;
        if (job.frameIndex === job.config.frames.length) {
          api.release(job.node);job.node = null;job.frameIndex = 0;job.repeat++;
          if (job.repeat === job.config.repeats) { job.repeat = 0;job.fileIndex++; }
        }
        if (job.fileIndex === job.config.files.length) {
          saveManifest(job, 'complete');cleanup(job);roots.job = null;
          emit('native-export-complete', { token: job.config.token, images: job.results.length });
        }
      }
      for (const name of ['drawNodeInit', 'createAnimation']) roots.listeners.push(Interceptor.attach(addresses[name], {
        onEnter(args) {
          this.probeActive = busy && !!roots.job;
          if (!this.probeActive) return;
          this.probeToken = roots.job.config.token;
          if (name === 'createAnimation') {
            const data = args[0];
            emit('native-export-create-parameter', { token: this.probeToken,
              file: data.readPointer().readUtf8String().slice(0, 128), dataPointer: data.add(8).readPointer().toString(),
              flag16: data.add(16).readU8(), value24: data.add(24).readU64().toString() });
          }
        },
        onLeave(result) {
          if (this.probeActive) emit('native-export-create-stage', { token: this.probeToken, stage: name,
            result: name === 'drawNodeInit' ? result.toInt32() : result.toString() });
        },
      }));
      // One controlled resource substitution inside a real game-owned constructor.
      // Never retain, step, detach or release this node: the original caller owns it.
      roots.listeners.push(Interceptor.attach(addresses.create,{
        onEnter(args){
          this.live=null;
          if(!pending||pending.creationMode!=='live-source')return;
          try{
            const parameter=args[0],original=parameter.readPointer();
            if(original.isNull()||original.add(pending.from.length).readU8()!==0||original.readUtf8String(pending.from.length)!==pending.from)return;
            if(!globalThis.__ffrogueLifecycle?.snapshot().active)throw Error('Arm lifecycle before live substitution');
            const config=pending;pending=null;
            const replacement=Memory.allocUtf8String(config.files[0].replace(/\.bmb$/,''));
            this.live={config,parameter,original,replacement};roots.live=this.live;
            globalThis.__ffrogueLifecycle.mark('controlled-source-substitution',{frame:null,from:config.from,to:config.files[0],
              parameter:parameter.toString(),createParamRaw:Array.from(new Uint8Array(parameter.readByteArray(32))),
              policy:'Original game caller and scheduler; one resource-name input changed, not an unmodified skill reference'});
            parameter.writePointer(replacement);
          }catch(error){emit('native-live-source-failed',{reason:String(error)});globalThis.__ffrogueLifecycle?.finish('live-source-failed');}
        },
        onLeave(result){
          if(!this.live)return;
          const live=this.live;live.parameter.writePointer(live.original);roots.live=null;
          globalThis.__ffrogueLifecycle.mark('controlled-source-return',{wrapper:result.toString(),restored:true});
          if(result.isNull())globalThis.__ffrogueLifecycle.finish('live-source-returned-null');
          else globalThis.__ffrogueLifecycle.bindWrapper(result,{controlledSource:live.config.files[0],originalRequestedSource:live.config.from});
          if(!result.isNull())globalThis.__ffrogueLiveExport?.bindControlledSource(result,live.config);
          if(!result.isNull()&&live.config.fixedDelta===1)roots.liveAnimation={pointer:result.add(0x460).readPointer(),frame:0,token:live.config.token};
          emit('native-live-source-return',{token:live.config.token,wrapper:result.toString()});
        },
      }));
      roots.listeners.push(Interceptor.attach(addresses.step,{
        onEnter(args){
          this.stepped=null;const selected=roots.liveAnimation;
          if(!selected||!args[0].equals(selected.pointer)||!globalThis.__ffrogueLifecycle?.snapshot().active)return;
          if(selected.frame>=600){globalThis.__ffrogueLifecycle.finish('controlled-step-cap');roots.liveAnimation=null;return;}
          const originalDelta=args[0].add(4).readFloat();this.stepped={selected,originalDelta};selected.frame++;
          globalThis.__ffrogueLifecycle.mark('controlled-step',{frame:selected.frame,delta:1,originalDelta,policy:'Declared unit-step measurement; original game remains caller'});
          args[0].add(4).writeFloat(1);
        },
        onLeave(){if(!this.stepped)return;const {selected,originalDelta}=this.stepped;selected.pointer.add(4).writeFloat(originalDelta);
          globalThis.__ffrogueLifecycle.mark('controlled-step-end',{frame:selected.frame,restoredDelta:originalDelta});},
      }));
      roots.listeners.push(Interceptor.attach(addresses.pump, {
        onLeave() {
          if(pending?.creationMode==='live-source')return;
          if (busy || (!pending && !roots.job)) return;
          busy = true;
          try {
            if (pending && !roots.job) { const config = pending;pending = null;start(config); }
            if (roots.job) {
              if(roots.job.config.stateOnly){advance(roots.job);return;}
              const scene = api.scene(), saved = scene.readByteArray(0x90);
              try {
                const view = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
                const projection = [2/640,0,0,0,0,2/1136,0,0,0,0,-.0001,0,-1,-1,0,1];
                view.forEach((value, i) => scene.add(i * 4).writeFloat(value));
                projection.forEach((value, i) => scene.add(0x40 + i * 4).writeFloat(value));
                scene.add(0x80).writeU32(640);scene.add(0x84).writeU32(1136);
                scene.add(0x88).writeFloat(-10000);scene.add(0x8c).writeFloat(10000);
                advance(roots.job);
              } finally { scene.writeByteArray(saved); }
            }
          } catch (error) {
            const job = roots.job;
            if (job) { try { saveManifest(job, 'failed', String(error));cleanup(job); } catch (_) {} }
            roots.job = null;pending = null;emit('native-export-failed', { reason: String(error) });
            globalThis.__ffrogueLifecycle?.finish('controller-failed: '+String(error));
          } finally { busy = false; }
        },
      }));
      roots.requestTimer = setInterval(() => {
        if(pending?.creationMode==='live-source'){
          try{if(JSON.parse(File.readAllText(requestPath)).token!==pending.token){emit('native-live-source-cancelled',{token:pending.token});pending=null;}}catch(_){}
          return;
        }
        if (roots.job || pending) return;
        try {
          const config = validate(JSON.parse(File.readAllText(requestPath)));
          if (config.token === lastToken) return;
          lastToken = config.token;pending = config;
        } catch (_) { /* Missing or invalid requests never execute native calls. */ }
      }, 500);
      emit('native-export-ready', { nativeSha256: spec.nativeSha256, requestPath, automaticBattleSkillRequired: false });
    } catch (error) { emit('native-export-blocked', { reason: String(error) }); }
  }, 250);
})();
