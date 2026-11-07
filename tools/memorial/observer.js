/* Offline diagnostic addition for the exact reviewed Memorial native library. */
(() => {
  'use strict';
  const spec = __TRACE_SPEC__;
  const roots = { listeners: [] };
  globalThis.__ffrogueTrace = roots;
  const tag = Memory.allocUtf8String('FFBE-Trace');
  const writeLog = new NativeFunction(Process.getModuleByName('liblog.so').getExportByName('__android_log_write'), 'int', ['int', 'pointer', 'pointer']);
  let emitted = 0, action = 0, activeUntil = 0, start = Date.now();
  const calls = {};
  const armPath = '/sdcard/Android/data/com.square_enix.ffbejpn/files/ffrogue-trace-arm.txt';
  let lastArm = '';
  const filenames = new Map();
  const contexts = new Map();
  let contextSerial = 0, executionSerial = 0, effectInputSerial = 0, rendererDrawSerial = 0;
  const executionContexts = new Map(), effectInputContexts = new Map();
  const commandSnapshots = new Set();
  let sampleFiles = new Set();
  const rendererSamples = new Map();
  const rendererScopes = new Map(), particleScopes = new Map(), particleSamples = new Map();
  const particleModuleListeners = new Set(), particleSourceChecks = new Map();
  const particleSourceDumped = new Set();
  let particleCaptureEnabled = false;
  let particleMemoryEnabled = false, particleVerticesEnabled = false;
  let locatorCaptureEnabled = false;
  const locatorScopes = new Map(), locatorSamples = new Map(), locatorListeners = new Set();
  const locatorHookHandles = [];
  function count(name) { calls[name] = (calls[name] || 0) + 1; }
  function emit(type, data = {}) {
    if (emitted >= 2500) return;
    const threadId = Process.getCurrentThreadId();
    const contextId = contexts.get(threadId)?.slice(-1)[0];
    const executionId = executionContexts.get(threadId)?.slice(-1)[0]?.id;
    const effectInputId = effectInputContexts.get(threadId)?.slice(-1)[0];
    writeLog(4, tag, Memory.allocUtf8String(JSON.stringify({ type, seq: emitted++, ms: Date.now() - start, action,
      ...(contextId === undefined ? {} : { contextId }),
      ...(executionId === undefined ? {} : { executionId }),
      ...(effectInputId === undefined ? {} : { effectInputId }), ...data })));
  }
  function active() { return Date.now() < activeUntil && emitted < 2490; }
  function cppString(address) {
    const flag = address.readU8();
    const length = flag & 1 ? address.add(8).readU64().toNumber() : flag >>> 1;
    if (length > 2048) throw Error('String exceeds diagnostic bound');
    return length ? ((flag & 1) ? address.add(16).readPointer() : address.add(1)).readUtf8String(length) : '';
  }
  function identify(object) {
    const key = object.toString();
    try {
      const file = cppString(object.add(spec.objectFilename.offset));
      if (!file || !/^[\x20-\x7e]+$/.test(file)) return;
      if (filenames.get(key) === file) return;
      filenames.set(key, file);
      emit('effect-file', { object: key, file, method: 'Exact-build getter field; bounded libc++ string read' });
    } catch (_) { /* A missing or unreadable name never changes effect execution. */ }
  }
  emit('boot', { schemaVersion: 1, observerRevision: 36, nativeSha256: spec.nativeSha256, arch: Process.arch, limit: 2500 });
  if (Process.arch !== 'arm64') { emit('blocked', { reason: 'ARM64 required' }); return; }
  let attempts = 0;
  const timer = setInterval(() => {
    const game = Process.findModuleByName('libgame.so');
    if (!game) { if (++attempts >= 240) { clearInterval(timer); emit('blocked', { reason: 'Native library load timeout' }); } return; }
    clearInterval(timer);
    try {
      const addresses = new Map();
      const verifiedHeads = new Map();
      globalThis.__ffrogueVerifiedNativeHeads = verifiedHeads;
      for (const hook of [...spec.hooks, spec.objectFilename, ...spec.rendererReference.getters, ...spec.skillSource.getters, ...spec.combatIdentity.getters, ...spec.cameraReference.getters]) {
        const address = game.getExportByName(hook.symbol);
        const actual = Array.from(new Uint8Array(address.readByteArray(16)), value => value.toString(16).padStart(2, '0')).join('');
        if (actual !== hook.head) throw Error('Native fingerprint mismatch: ' + hook.name);
        addresses.set(hook.name, address);
        verifiedHeads.set(hook.symbol,hook.head);
      }
      let calibration = null;
      function callerInfo(address) {
        return { caller: address.toString(), callerOffset: address.sub(game.base).toString() };
      }
      const particleModules = new Map(spec.particleReference.modules.map(module => [String(module.offset), module]));
      const hexBytes = (address, size) => Array.from(new Uint8Array(address.readByteArray(size)), value => value.toString(16).padStart(2, '0')).join('');
      function locatorFloats(address, count) {
        const values = Array.from({ length: count }, (_, i) => address.add(i * 4).readFloat());
        if (!values.every(Number.isFinite)) throw Error('Nonfinite locator fields');
        return values;
      }
      const verifiedOffsets=new Map();
      for(const entry of [...spec.lifecycleReference.hooks,...spec.lifecycleReference.modules.map(m=>m.hook??m)]){
        if(hexBytes(game.base.add(entry.offset),16)!==entry.head)throw Error('Lifecycle pre-install fingerprint mismatch: '+entry.offset);
        verifiedOffsets.set(entry.offset,entry.head);
      }
      const pipeline = (__PIPELINE_OBSERVER__)({spec:spec.pipelineReference,game,emit,active,hexBytes,rendererScopes,roots});
      const lifecycle = (__LIFECYCLE_OBSERVER__)({spec:spec.lifecycleReference,game,emit,hexBytes,roots,verifiedOffsets});
      function locatorContextSnapshot(address) {
        const fields = {}, unreadable = {};
        for (const [name, offset, count, indirect] of [
          ['basis88', 0x88, 9, false], ['rotationD0', 0xd0, 3, true],
          ['quaternionD8', 0xd8, 4, false], ['scaleE8', 0xe8, 3, false],
          ['translationF4', 0xf4, 3, false], ['inheritedBasis80', 0x80, 9, true]]) {
          try { const pointer = address.add(offset); fields[name] = locatorFloats(indirect ? pointer.readPointer() : pointer, count); }
          catch (error) { fields[name] = null; unreadable[name] = String(error); }
        }
        return { ...fields, unreadable };
      }
      function locatorCallAllowed(scope, offset, computed, pointer) {
        const capture = scope.capture;
        if (!capture || capture.completed) return false;
        if (computed) {
          if (offset !== capture.computedOffset || capture.computedSeen) return false;
          capture.computedSeen = true;
          return true;
        }
        if (!capture.allowedOffsets.has(offset)) return false;
        const context = pointer.toString();
        if (capture.context && capture.context !== context) return false;
        capture.context = context;
        return true;
      }
      function cleanupLocatorObservers() {
        if (!locatorHookHandles.length || locatorScopes.size ||
            (active() && [...locatorSamples.values()].filter(s => s.count >= 6).length < spec.locatorReference.nodes.length)) return;
        const detached = locatorHookHandles.splice(0);
        for (const handle of detached) handle.detach();
        roots.listeners = roots.listeners.filter(handle => !detached.includes(handle));
        locatorListeners.clear(); locatorCaptureEnabled = false;
        emit('locator-observation-stopped', { reason: active() ? 'sample budget reached' : 'window ended' });
      }
      function watchLocatorFunction(address, computed = false) {
        const offset = address.sub(game.base).toUInt32(), key = String(offset);
        const reference = computed ? spec.locatorReference.computedHelpers.find(r => r.offset === offset)
          : spec.locatorReference.modules.find(r => r.offset === offset);
        if (!reference) return { offset, symbol: null, fingerprintVerified: false };
        if (locatorListeners.has(key)) return { offset, symbol: reference.name || null, fingerprintVerified: true };
        if (hexBytes(address, 16) !== reference.head) throw Error('Locator callback fingerprint mismatch');
        locatorListeners.add(key);
        const handle = Interceptor.attach(address, {
          onEnter(args) {
            this.enabled = false;
            const scope = locatorScopes.get(Process.getCurrentThreadId())?.slice(-1)[0];
            if (!scope || !active() || !locatorCaptureEnabled || !locatorCallAllowed(scope, offset, computed, args[0])) return;
            this.scope = scope; this.locatorPointer = args[0];
            try {
              this.before = computed ? { scale: locatorFloats(args[1], 3), quaternion: locatorFloats(args[2], 4), basis: locatorFloats(args[3], 9) }
                : locatorContextSnapshot(args[0]);
              this.enabled = true;
            } catch (error) { emit('locator-unreadable', { ...scope, offset, phase: 'before', reason: String(error) }); }
          },
          onLeave(result) {
            if (!this.enabled || !active()) return;
            try {
              const after = computed ? { returnedBasis: locatorFloats(result, 9) } : locatorContextSnapshot(this.locatorPointer);
              const { capture, ...identity } = this.scope;
              emit('locator-call', { ...identity, offset, symbol: reference.name || null, computed,
                fingerprintVerified: true, before: this.before, after,
                note: 'Exact-build bounded context fields; semantic mapping and active variant require analysis' });
              if (!computed && reference.name?.includes('transform_locator')) capture.completed = true;
            } catch (error) { emit('locator-unreadable', { ...this.scope, offset, phase: 'after', reason: String(error) }); }
          },
        });
        locatorHookHandles.push(handle); roots.listeners.push(handle);
        return { offset, symbol: reference.name || null, fingerprintVerified: true };
      }
      function identifyLocator(header) {
        for (const reference of spec.locatorReference.nodes) {
          if (hexBytes(header.sub(reference.offset), 8) !== spec.locatorReference.header) continue;
          if (reference.windows.some(w => hexBytes(header.add(w.offset), w.hex.length / 2) !== w.hex)) continue;
          return reference;
        }
        return null;
      }
      function selectedFunction(address) {
        if (address.isNull() || address.compare(game.base) < 0 || address.compare(game.base.add(game.size)) >= 0)
          throw Error('Particle function outside pinned module');
        return { pointer: address.toString(), offset: address.sub(game.base).toString() };
      }
      function watchParticleModule(address) {
        const info = selectedFunction(address), key = info.offset;
        const module = particleModules.get(String(address.sub(game.base).toUInt32()));
        if (!module) return { ...info, symbol: null, fingerprintVerified: false, executionObserved: false };
        info.symbol = module.name;
        info.fingerprintVerified = true;
        if (particleModuleListeners.has(key)) return info;
        if (hexBytes(address, 16) !== module.head) throw Error('Particle callback fingerprint mismatch: ' + key);
        particleModuleListeners.add(key);
        roots.listeners.push(Interceptor.attach(address, {
          onEnter(args) {
            const scope = particleScopes.get(Process.getCurrentThreadId())?.slice(-1)[0];
            this.enabled = !!scope && active();
            if (!this.enabled) return;
            this.scope = scope;this.vertexContextPointer = args[0];
            this.alphaModule = /module(?:5alpha|11alpha_blend)/.test(module.name);
            if (this.alphaModule) this.before = this.vertexContextPointer.add(0x164).readFloat();
          },
          onLeave() {
            if (!this.enabled || !active()) return;
            const data = { ...this.scope, ...info, symbol: module.name };
            if (this.alphaModule) {
              data.contextAlphaBefore = this.before;
              data.contextAlphaAfter = this.vertexContextPointer.add(0x164).readFloat();
              if (module.name.includes('alpha_blend')) data.contextCoefficients = [0x17c, 0x180].map(offset => this.vertexContextPointer.add(offset).readFloat());
            }
            emit('particle-module-call', data);
          },
        }));
        return info;
      }
      function inspectParticle(object, scope) {
        const reference = spec.particleReference;
        if (scope.file !== reference.file) return null;
        const parameter = object.add(0xf0).readPointer();
        if (parameter.isNull()) return null;
        if (reference.windows.some(window => hexBytes(parameter.add(window.offset), window.hex.length / 2) !== window.hex)) return null;
        const source = parameter.sub(reference.nodeOffset);
        if (hexBytes(source, 8) !== reference.header) return null;
        const root = source.toString();
        if (!particleSourceChecks.has(root)) particleSourceChecks.set(root, Checksum.compute('sha256', source.readByteArray(reference.sourceBytes)));
        if (particleMemoryEnabled && !particleSourceDumped.has(root)) {
          const bytes = source.readByteArray(reference.sourceBytes), hex = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
          const chunkChars = 768, chunks = Math.ceil(hex.length / chunkChars);
          particleSourceDumped.add(root);
          emit('particle-source-memory', { file: scope.file, node: reference.node, source: root,
            bytes: reference.sourceBytes, sha256: Checksum.compute('sha256', bytes), chunks });
          for (let index = 0; index < chunks; index++) emit('particle-source-chunk', { source: root, index,
            hex: hex.slice(index * chunkChars, (index + 1) * chunkChars) });
        }
        watchParticleWriter(object.readPointer());
        const metadata = object.add(0x38).readPointer();
        if (metadata.isNull()) throw Error('Missing Particle vertex module array');
        const count = metadata.add(8).readU32(), functions = metadata.readPointer();
        if (count < 1 || count > 96 || functions.isNull()) throw Error('Invalid Particle module array bounds');
        const modules = Array.from({ length: count }, (_, i) => watchParticleModule(functions.add(i * 8).readPointer()));
        return { object: object.toString(), parameter: parameter.toString(), file: scope.file,
          node: reference.node, sourceOffset: reference.nodeOffset, originalSha256: reference.sourceSha256,
          memorySha256: particleSourceChecks.get(root), fullSourceHashMatches: particleSourceChecks.get(root) === reference.sourceSha256,
          identityMethod: 'Named wrapper scope + IBMB/version + exact node offset + header/life/material byte windows',
          vertexEntry: selectedFunction(object.add(0x20).readPointer()), bufferWriter: selectedFunction(object.readPointer()),
          rawLiveCount14c: object.add(0x14c).readU32(), modules,
          drawDataHex: hexBytes(object.add(0x48), 128), drawDataDecoded: false };
      }
      let particleWriterInstalled = false;
      function watchParticleWriter(address) {
        if (!particleVerticesEnabled || particleWriterInstalled) return;
        const reference = spec.particleReference.bufferWriter, info = selectedFunction(address);
        if (address.sub(game.base).toUInt32() !== reference.offset || hexBytes(address, 16) !== reference.head)
          throw Error('Unexpected native Particle buffer writer');
        roots.listeners.push(Interceptor.attach(address, {
          onEnter(args) {
            const scope = particleScopes.get(Process.getCurrentThreadId())?.slice(-1)[0];
            this.enabled = !!scope && active() && particleVerticesEnabled;
            if (!this.enabled) return;
            this.sourceScope = scope;this.vertexOutput = args[1];this.vertexStride = args[2].toUInt32();
            this.writerContext = args[0];
            if (this.vertexStride < 16 || this.vertexStride > 128) { this.enabled = false;emit('particle-vertex-unreadable', { reason: 'Unsupported native vertex stride' }); }
          },
          onLeave() {
            if (!this.enabled || !active()) return;
            try {
              const bytes = hexBytes(this.vertexOutput, this.vertexStride * 6);
              const positions = Array.from({ length: 6 }, (_, i) => [0, 4, 8].map(offset => this.vertexOutput.add(i * this.vertexStride + offset).readFloat()));
              const alpha = this.writerContext.add(0x164).readFloat();
              if (![alpha, ...positions.flat()].every(Number.isFinite)) throw Error('Nonfinite Particle vertex output');
              const draw = this.writerContext.add(0x30).readPointer(), basis = draw.add(0x20).readPointer();
              const basisFloats = Array.from({ length: 16 }, (_, i) => basis.add(i * 4).readFloat());
              emit('particle-vertices', { ...this.sourceScope, writer: info, stride: this.vertexStride,
                vertexCount: 6, positions, rawHex: bytes, contextAlpha: alpha,
                drawBasisFloats: basisFloats.every(Number.isFinite) ? basisFloats : null,
                note: 'Position offsets 0/4/8 and six output vertices follow the pinned writer; other attributes and draw basis semantics remain undecoded' });
            } catch (error) { emit('particle-vertex-unreadable', { ...this.sourceScope, reason: String(error) }); }
          },
        }));
        particleWriterInstalled = true;
      }
      const bishamonScene = new NativeFunction(addresses.get('bishamonScene'), 'pointer', []);
      function cameraSnapshot() {
        const scene = bishamonScene();
        if (scene.isNull()) throw Error('Bishamon scene unavailable');
        const matrix = offset => Array.from({ length: 16 }, (_, i) => scene.add(offset + i * 4).readFloat());
        const viewMatrix = matrix(0), projectionMatrix = matrix(0x40);
        const viewport = [scene.add(0x80).readU32(), scene.add(0x84).readU32()];
        const nearFar = [scene.add(0x88).readFloat(), scene.add(0x8c).readFloat()];
        if (![...viewMatrix, ...projectionMatrix, ...nearFar].every(Number.isFinite)
            || viewport.some(v => v <= 0 || v > 32768) || !projectionMatrix.some(v => v !== 0))
          throw Error('Invalid scene camera fields');
        return { viewMatrix, projectionMatrix, viewport, nearFar,
          note: 'Scene matrices copied from first Cocos camera by BishamonDataList::update; matrix ordering still requires projection validation' };
      }
      function sampleRenderer(object, phase) {
        if (!active() || !sampleFiles.size) return;
        const key = object.toString(), file = filenames.get(key);
        if (!file || !sampleFiles.has(file)) return;
        const sampleKey = key + ':' + file + ':' + phase;
        const previous = rendererSamples.get(sampleKey);
        if (previous && (previous.count >= 30 || Date.now() - previous.at < 50)) return;
        rendererSamples.set(sampleKey, { count: (previous?.count || 0) + 1, at: Date.now() });
        try {
          const animation = object.add(0x460).readPointer();
          if (animation.isNull()) return;
          const vector = (address, offset) => [0, 4, 8].map(i => address.add(offset + i).readFloat());
          const wrapperScale = vector(object, 0x480), animationScale = vector(animation, 0x20);
          const animationPosition = vector(animation, 8), cachedLayerScale = object.add(0x4c8).readFloat();
          if (![...wrapperScale, ...animationScale, ...animationPosition, cachedLayerScale].every(Number.isFinite))
            throw Error('Nonfinite renderer fields');
          emit('renderer-state', { object: key, file, phase, wrapperScale, animationScale,
            animationPosition, cachedLayerScale, followLayerScale: object.add(0x4f5).readU8(),
            camera: phase === 'before-draw' ? cameraSnapshot() : null,
            note: 'Exact-build wrapper and animation fields; not final screen-space bounds' });
        } catch (error) { emit('renderer-state-unreadable', { object: key, phase, reason: String(error) }); }
      }
      const report = new NativeCallback((code, object, caller, a, b, c) => {
        if (code === 0) { calibration = { object: object.toString(), values: [a, b, c] }; return; }
        const hook = spec.hooks.find(item => item.code === code);
        count(hook.name);
        if (!active()) return;
        identify(object);
        const values = [a, b, c].slice(0, hook.count);
        if (!values.every(Number.isFinite)) { emit('invalid-float', { name: hook.name }); return; }
        emit('transform', { name: hook.name, object: object.toString(), values, ...callerInfo(caller) });
      }, 'void', ['uint', 'pointer', 'pointer', 'float', 'float', 'float']);
      roots.report = report;
      const module = new CModule(`
        #include <gum/guminterceptor.h>
        extern void report(unsigned int code, void * object, void * caller, float a, float b, float c);
        void on_enter(GumInvocationContext * ic) {
          GumCpuContext * ctx = ic->cpu_context;
          unsigned int code = (unsigned int) (gsize) gum_invocation_context_get_listener_function_data(ic);
          report(code, (void *) ctx->x[0], (void *) ctx->lr, ctx->v[0].s, ctx->v[1].s, ctx->v[2].s);
        }
        volatile float sink;
        void calibration(void * object, float a, float b, float c) { sink = a + b + c; }
      `, { report });
      roots.module = module;
      const check = Interceptor.attach(module.calibration, { onEnter: module.on_enter }, ptr(0));
      Interceptor.flush();
      new NativeFunction(module.calibration, 'void', ['pointer', 'float', 'float', 'float'])(ptr(0x1234), 1.25, -2.5, 3.75);
      check.detach();
      if (!calibration || calibration.object !== '0x1234' || calibration.values.some((v, i) => v !== [1.25, -2.5, 3.75][i])) {
        emit('calibration-failed', { captured: calibration }); return;
      }
      emit('calibration-pass', calibration);
      const playerVtable = game.getExportByName(spec.combatIdentity.playerVtableSymbol).add(16);
      const playerMaster = new NativeFunction(addresses.get('playerMaster'), 'pointer', ['pointer']);
      const masterUnitId = new NativeFunction(addresses.get('masterUnitId'), 'int', ['pointer']);
      function unitIdentity(unit) {
        const identity = { object: unit.toString(), playerClassMatched: false };
        try {
          if (unit.isNull() || !unit.readPointer().equals(playerVtable)) return identity;
          identity.playerClassMatched = true;
          const master = playerMaster(unit);
          if (!master.isNull()) identity.unitId = masterUnitId(master);
        } catch (error) { identity.error = String(error); }
        return identity;
      }
      const body = (__BODY_OBSERVER__)({spec:spec.bodyReference,game,emit,active,unitIdentity,roots});
      for (const hook of spec.hooks) {
        const address = addresses.get(hook.name);
        if (hook.kind === 'execution-scope') {
          roots.listeners.push(Interceptor.attach(address, {
            onEnter(args) {
              this.enabled = active();
              if (!this.enabled) return;
              this.traceThread = this.threadId;
              this.scope = { id: ++executionSerial, unit: args[0], command: null, marked: false };
              const stack = executionContexts.get(this.traceThread) || [];
              stack.push(this.scope);
              executionContexts.set(this.traceThread, stack);
            },
            onLeave() {
              if (!this.enabled) return;
              if (this.scope.marked) emit('skill-execution-end', { executionId: this.scope.id });
              const stack = executionContexts.get(this.traceThread);
              stack.pop();
              if (!stack.length) executionContexts.delete(this.traceThread);
            },
          }));
        } else if (hook.kind === 'command-frames') {
          roots.listeners.push(Interceptor.attach(address, { onEnter(args) {
            if (!active()) return;
            try {
              // Exact-build getters verify ID +0x30 and the string field +0x38.
              const command = { object: args[0].toString(), skillId: args[0].add(0x30).readS32(),
                effectFrames: cppString(args[0].add(0x38)) };
              const scope = executionContexts.get(this.threadId)?.slice(-1)[0];
              if (scope) scope.command = command;
              if (scope) body.command(scope.unit,command,scope.id);
              const key = JSON.stringify(command);
              if (!commandSnapshots.has(key) && commandSnapshots.size < 128) {
                commandSnapshots.add(key);
                emit('command-frame-source', { ...command, ...callerInfo(this.returnAddress) });
              }
            } catch (error) { emit('command-frame-unreadable', { reason: String(error) }); }
          } }));
        } else if (hook.kind === 'effect-input') {
          roots.listeners.push(Interceptor.attach(address, {
            onEnter(args) {
              this.enabled = active() && effectInputSerial < 128;
              if (!this.enabled) return;
              this.traceThread = this.threadId;
              const scope = executionContexts.get(this.threadId)?.slice(-1)[0];
              if (scope && !scope.marked) {
                scope.marked = true;
                emit('skill-execution-start', { unit: unitIdentity(scope.unit) });
              }
              this.inputId = ++effectInputSerial;
              const stack = effectInputContexts.get(this.traceThread) || [];
              stack.push(this.inputId);
              effectInputContexts.set(this.traceThread, stack);
              try {
                emit('battle-effect-input', { effectFrames: cppString(args[4]),
                  sourceUnit: unitIdentity(args[1]), targetUnit: unitIdentity(args[2]),
                  command: scope?.command || null, ...callerInfo(this.returnAddress),
                  note: 'Command is the most recent frame getter in this procSkill scope; verify against input and caller' });
              } catch (error) { emit('battle-effect-input-unreadable', { reason: String(error) }); }
            },
            onLeave() {
              if (!this.enabled) return;
              emit('battle-effect-input-end', { effectInputId: this.inputId });
              const stack = effectInputContexts.get(this.traceThread);
              stack.pop();
              if (!stack.length) effectInputContexts.delete(this.traceThread);
            },
          }));
        } else if (hook.kind === 'locator-parent') {
          roots.listeners.push(Interceptor.attach(address, {
            onEnter(args) {
              this.enabled = false;
              if (!active() || !locatorCaptureEnabled) return;
              const thread = Process.getCurrentThreadId(), renderer = rendererScopes.get(thread)?.slice(-1)[0];
              if (renderer?.file !== spec.locatorReference.file) return;
              try {
                const reference = identifyLocator(args[1]);
                if (!reference) return;
                const key = args[0].toString(), previous = locatorSamples.get(key);
                if (previous && (previous.count >= 6 || Date.now() - previous.at < 25)) return;
                const sample = (previous?.count || 0) + 1;
                locatorSamples.set(key, { count: sample, at: Date.now() });
                const computed = watchLocatorFunction(args[0].add(8).readPointer(), true);
                const table = args[0].add(0x28).readPointer(), count = table.add(8).readU32(), functions = table.readPointer();
                if (count > 96 || (count && functions.isNull())) throw Error('Invalid locator module table');
                const modules = Array.from({ length: count }, (_, i) => watchLocatorFunction(functions.add(i * 8).readPointer()));
                const scope = { file: renderer.file, node: reference.node, object: key, sample,
                  sourceOffset: reference.offset, originalSha256: spec.locatorReference.sourceSha256 };
                emit('locator-node', { ...scope, modules, computed,
                  identityMethod: 'Named wrapper + trampoline NodeHeader argument + exact source offset/header/windows' });
                scope.capture = { computedOffset: computed.offset, computedSeen: false, completed: false,
                  allowedOffsets: new Set(modules.filter(m => m.fingerprintVerified).map(m => m.offset)), context: null };
                const stack = locatorScopes.get(thread) || []; stack.push(scope); locatorScopes.set(thread, stack);
                this.thread = thread; this.enabled = true;
              } catch (error) { emit('locator-unreadable', { phase: 'identify', reason: String(error) }); }
            },
            onLeave() {
              if (!this.enabled) return;
              const stack = locatorScopes.get(this.thread); stack.pop(); if (!stack.length) locatorScopes.delete(this.thread);
            },
          }));
        } else if (hook.kind === 'particle-vertex') {
          roots.listeners.push(Interceptor.attach(address, {
            onEnter(args) {
              this.enabled = false;
              if (!active() || !particleCaptureEnabled) return;
              const thread = Process.getCurrentThreadId(), scope = rendererScopes.get(thread)?.slice(-1)[0];
              if (!scope || scope.file !== spec.particleReference.file) return;
              try {
                const key = args[0].toString(), previous = particleSamples.get(key);
                if (previous && (previous.count >= 8 || Date.now() - previous.at < 25)) return;
                const sample = inspectParticle(args[0], scope);
                if (!sample) return;
                particleSamples.set(key, { count: (previous?.count || 0) + 1, at: Date.now() });
                emit('particle-node-state', sample);
                this.thread = thread;this.enabled = true;
                const stack = particleScopes.get(thread) || [];
                stack.push({ file: sample.file, node: sample.node, object: key, sample: (previous?.count || 0) + 1 });
                particleScopes.set(thread, stack);
              } catch (error) { emit('particle-node-unreadable', { reason: String(error) }); }
            },
            onLeave() {
              if (!this.enabled) return;
              const stack = particleScopes.get(this.thread);stack.pop();
              if (!stack.length) particleScopes.delete(this.thread);
            },
          }));
        } else if (hook.kind === 'renderer-update' || hook.kind === 'renderer-draw') {
          roots.listeners.push(Interceptor.attach(address, {
            onEnter(args) {
              this.enabled = active() && sampleFiles.size > 0;
              if (!this.enabled) return;
              this.object = args[0];
              identify(this.object);
              this.thread = Process.getCurrentThreadId();
              const stack = rendererScopes.get(this.thread) || [];
              const rendererScope={file:filenames.get(this.object.toString()),phase:hook.kind,object:this.object.toString(),drawId:hook.kind==='renderer-draw'?++rendererDrawSerial:null};
              stack.push(rendererScope);
              rendererScopes.set(this.thread, stack);
              if(hook.kind==='renderer-draw')pipeline.drawContext(rendererScope,()=>{
                const animation=this.object.add(0x460).readPointer();
                return {camera:cameraSnapshot(),animationPosition:locatorFloats(animation.add(8),3),
                  animationScale:locatorFloats(animation.add(0x20),3),animationColorScale44:locatorFloats(animation.add(0x44),4)};
              });
              if (hook.kind === 'renderer-draw') sampleRenderer(this.object, 'before-draw');
            },
            onLeave() {
              if (this.enabled && hook.kind === 'renderer-update') sampleRenderer(this.object, 'after-update');
              if (this.enabled) {
                const stack = rendererScopes.get(this.thread);stack.pop();
                if (!stack.length) rendererScopes.delete(this.thread);
              }
            },
          }));
        } else if (hook.kind === 'master-row') {
          // Observe only completed static master rows, including startup before arming.
          const seen = new Set();
          roots.listeners.push(Interceptor.attach(address, {
            onEnter(args) {
              this.completedRow = (args[5].toInt32() & 1) !== 0;
              this.response = args[0];
            },
            onLeave(result) {
              if (!this.completedRow || !result.toInt32() || seen.size >= 512) return;
              try {
                const row = this.response.add(0x28).readPointer();
                if (row.isNull()) return;
                const id = row.add(0x24).readS32();
                if (id < 0 || id > 100000 || seen.has(id)) return;
                seen.add(id);
                if (hook.name === 'hit-profile-row') {
                  emit('hit-profile-row', { id, effectGroupId: row.add(0x28).readS32(),
                    effectDelayFrame: row.add(0x2c).readS32(),
                    note: 'Completed static master row; exact-build parser/getter layouts' });
                } else {
                  emit('process-profile-row', { id, hitType: row.add(0x28).readS32(),
                    note: 'Completed static master row; exact-build parser/getter layouts' });
                }
              } catch (error) { emit('master-row-unreadable', { name: hook.name, reason: String(error) }); }
            },
          }));
        } else if (hook.kind === 'factory-source') {
          roots.listeners.push(Interceptor.attach(address, {
            onEnter(args) {
              count(hook.name);
              this.enabled = active();
              if (!this.enabled) return;
              this.factoryCaller = callerInfo(this.returnAddress);
              try { this.effectFile = cppString(args[1]); } catch (_) { this.effectFile = null; }
            },
            onLeave(result) {
              if (this.enabled) emit('factory-result', { object: result.toString(),
                file: this.effectFile, ...this.factoryCaller });
            },
          }));
        } else if (hook.kind === 'placement-context') {
          roots.listeners.push(Interceptor.attach(address, {
            onEnter(args) {
              count(hook.name);
              this.enabled = active();
              if (!this.enabled) return;
              this.contextThread = this.threadId;
              this.contextId = ++contextSerial;
              const stack = contexts.get(this.contextThread) || [];
              stack.push(this.contextId);
              contexts.set(this.contextThread, stack);
              try {
                const rectangle = [0, 4, 8, 12].map(offset => args[2].add(offset).readFloat());
                if (!rectangle.every(Number.isFinite)) throw Error('Nonfinite rectangle');
                emit('placement-context', { contextId: this.contextId, threadId: this.threadId,
                  name: hook.name, ...callerInfo(this.returnAddress),
                  categoryInput: args[0].toInt32(), groupId: args[1].toInt32(),
                  rectangle, baseWaitInput: args[3].toInt32(), layerInput: args[4].toInt32(),
                  flagsInput: args[5].toInt32() });
              } catch (error) { emit('unreadable-placement-context', { reason: String(error) }); }
            },
            onLeave() {
              if (!this.enabled) return;
              emit('placement-context-end', { contextId: this.contextId, threadId: this.threadId });
              const stack = contexts.get(this.contextThread);
              if (stack) { stack.pop(); if (!stack.length) contexts.delete(this.contextThread); }
            },
          }));
        } else if (hook.kind === 'float') {
          roots.listeners.push(Interceptor.attach(address, { onEnter: module.on_enter }, ptr(hook.code)));
        } else if (hook.kind === 'action') {
          roots.listeners.push(Interceptor.attach(address, { onEnter(args) {
            count(hook.name);
            if (!active()) return;
            action++;
            emit('action-boundary', { object: args[0].toString(), firstInt: args[1].toInt32(), unit: args[2].toString(), note: 'Engine command boundary; not a verified skill ID' });
          } }));
        } else if (hook.kind === 'integer') {
          roots.listeners.push(Interceptor.attach(address, { onEnter(args) {
            count(hook.name);
            if (active()) {
              if (hook.name === 'layer-id' || hook.name === 'wait-frame') identify(args[0]);
              emit('integer', { name: hook.name, object: args[0].toString(), value: args[1].toInt32(),
                ...callerInfo(this.returnAddress) });
            }
          } }));
        } else if (hook.kind === 'create') {
          roots.listeners.push(Interceptor.attach(address, {
            onEnter(args) { count(hook.name); this.enabled = active(); this.object = args[0].toString(); },
            onLeave(result) { if (this.enabled && active()) emit('effect-init', { object: this.object, result: result.toInt32() }); },
          }));
        } else if (hook.kind === 'file') {
          roots.listeners.push(Interceptor.attach(address, { onEnter(args) {
            count(hook.name);
            if (!active()) return;
            try { const file = cppString(args[1]); if (/\.(bmb|m3r|cpk|png)$/i.test(file)) emit('resource-request', { file, hook: hook.name }); }
            catch (_) { emit('unreadable-resource-name', { hook: hook.name }); }
          } }));
        }
      }
      Interceptor.flush();
      const scaleAddress = game.getExportByName(spec.rendererReference.scaleSymbol);
      const screenGetters = Object.fromEntries(spec.rendererReference.getters.map(getter =>
        [getter.name, new NativeFunction(addresses.get(getter.name), 'int', [])]));
      let referenceAttempts = 0;
      roots.referenceTimer = setInterval(() => {
        if (++referenceAttempts > 120) { clearInterval(roots.referenceTimer); emit('renderer-reference-unavailable'); return; }
        const globalScale = scaleAddress.readFloat();
        if (!(Number.isFinite(globalScale) && globalScale > 0)) return;
        // Initialize computes this global only after the screen getters are usable.
        const screenWidth = screenGetters.screenWidth(), screenHeight = screenGetters.screenHeight();
        if (!(screenWidth > 0 && screenHeight > 0)) return;
        clearInterval(roots.referenceTimer);
        const formulaScale = 1136 / Math.min(screenWidth, screenHeight);
        emit('renderer-reference', { globalScale, screenWidth, screenHeight, formulaScale,
          formulaMatches: Math.abs(globalScale - formulaScale) < 0.00001,
          note: 'Global geometry multiplier; distinct from member scale, layer scale and placement coordinates' });
      }, 500);
      // Static master getters and dictionary lookup only; never execute a skill here.
      const skillSource = {
        list: new NativeFunction(addresses.get('abilityList'), 'pointer', []),
        lookup: new NativeFunction(addresses.get('dictionaryLookup'), 'pointer', ['pointer', 'int64']),
        id: new NativeFunction(addresses.get('skillId'), 'int', ['pointer']),
        effects: new NativeFunction(addresses.get('skillEffects'), 'pointer', ['pointer']),
        hits: new NativeFunction(addresses.get('skillHits'), 'pointer', ['pointer']),
      };
      roots.armTimer = setInterval(() => {
        cleanupLocatorObservers();
        pipeline.tick();
        try {
          const text = File.readAllText(armPath).trim();
          const config = text.startsWith('{') ? JSON.parse(text) : { token: text };
          const token = config.token;
          const requested = config.sampleFiles || [];
          const skillIds = config.skillIds || [];
          if (!Array.isArray(skillIds) || skillIds.length > 16
              || skillIds.some(id => !Number.isSafeInteger(id) || id <= 0 || id > 2147483647)
              || typeof token !== 'string' || !Array.isArray(requested) || requested.length > 16
              || requested.some(file => typeof file !== 'string' || file.length > 256)) return;
          if (token && token !== lastArm) {
            lastArm = token;
            sampleFiles = new Set(requested.map(file => file.replace(/\.bmb$/i, '')));
            rendererSamples.clear();
            particleCaptureEnabled = config.particleNode === true;
            particleMemoryEnabled = config.particleSourceMemory === true;
            particleVerticesEnabled = config.particleVertices === true;
            locatorCaptureEnabled = config.locatorNodes === true;
            locatorSamples.clear();
            particleSamples.clear();particleSourceChecks.clear();particleSourceDumped.clear();
            commandSnapshots.clear();
            body.begin(config);
            effectInputSerial = 0;
            rendererDrawSerial = 0;
            filenames.clear();
            activeUntil = Date.now() + 60000;
            pipeline.begin(sampleFiles,config.pipelineCapture===true,config.pipelineNativeSubmit===true);
            if(config.lifecycleCapture===true){try{lifecycle.begin(config);}catch(error){emit('lifecycle-arm-failed',{token,reason:String(error)});}}
            emit('armed', { token, windowMs: 60000, sampleFiles: [...sampleFiles], particleNode: particleCaptureEnabled,
              particleSourceMemory: particleMemoryEnabled, particleVertices: particleVerticesEnabled,
              locatorNodes: locatorCaptureEnabled, pipelineCapture:config.pipelineCapture===true,pipelineNativeSubmit:config.pipelineNativeSubmit===true,calls: { ...calls } });
            if (config.cameraSnapshot === true) {
              try { emit('camera-reference', cameraSnapshot()); }
              catch (error) { emit('camera-reference-unreadable', { reason: String(error) }); }
            }

            for (const requestedId of new Set(skillIds)) {
              try {
                const row = skillSource.lookup(skillSource.list(), requestedId);
                if (row.isNull()) { emit('skill-source-missing', { requestedId }); continue; }
                const id = skillSource.id(row);
                if (id !== requestedId) throw Error('Dictionary skill ID mismatch');
                emit('skill-source-row', { id, effectFrames: cppString(skillSource.effects(row)),
                  attackFrames: cppString(skillSource.hits(row)),
                  note: 'Loaded ability master via exact-build read-only getters; not an executed skill' });
              } catch (error) { emit('skill-source-unreadable', { requestedId, reason: String(error) }); }
            }

          }
        } catch (_) { /* An absent arm file leaves capture disabled. */ }
      }, 500);
      roots.censusTimer = setInterval(() => emit('hook-census', { calls: { ...calls }, active: active() }), 30000);
      emit('ready', { hookCount: roots.listeners.length, windowMs: 60000, armPath, valuesAre: 'Native API inputs; not decoded coordinate conventions' });
    } catch (error) {
      roots.listeners.forEach(listener => listener.detach());
      emit('blocked', { reason: String(error) });
    }
  }, 250);
})();
