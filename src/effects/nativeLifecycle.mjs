// Shared source-generation primitives. Whole-tree traversal is deliberately separate.
export const GENERATION_PROFILE = 'native-constant-activation-v1';

export class NativeRandom {
  constructor(words) {
    if (!Array.isArray(words) || words.length !== 4 || words.some(v => !Number.isInteger(v) || v < 0 || v > 0xffffffff) || !words.some(Boolean))
      throw Error('Explicit nonzero four-word native RNG state required');
    this.words = [...words]; this.draws = 0;
  }
  nextWord() {
    const [a, b, c, d] = this.words, t = (a ^ (a << 11)) >>> 0;
    const word = (d ^ (d >>> 19) ^ t ^ (t >>> 8)) >>> 0;
    this.words = [b, c, d, word]; this.draws++; return word;
  }
  uniform() { return (this.nextWord() >>> 9) / 8388608; }
  snapshot() { return { words: [...this.words], draws: this.draws }; }
}

export function nativeStartDelay(start, range, word) {
  if (![start,range,word].every(Number.isInteger) || start<0 || range<0 || start>10000 || range>10000 || word<0 || word>0xffffffff)
    throw Error('Invalid bounded native delay input');
  return Math.max(0,start-range+(range?word%(2*range):0));
}

export function activateConstantGenerator(input, rng) {
  if (!(rng instanceof NativeRandom)) throw Error('Native emitter RNG owner required');
  if (input.profile !== GENERATION_PROFILE || input.mode !== 0 || ![0, 2, 3].includes(input.typeId))
    throw Error('Unadmitted native generator profile');
  if (input.typeId !== 0 && input.childCount !== 0) throw Error('Child-bearing particle activation requires a separate native contract');
  const { start, startRange, count, duration, repeatCount, interval } = input;
  if ([start, startRange, count, duration, repeatCount].some(v => !Number.isInteger(v) || v < 0 || v > 10000)
      || Math.min(count, duration, repeatCount) < 1 || !Number.isFinite(interval) || interval < .001 || interval > 10000)
    throw Error('Generator input outside the measured bounded profile');
  // Null's caller controls activation; Quad/Particle also test their enabled byte.
  if (typeof input.enabled !== 'boolean') throw Error('Explicit activation enabled state required');
  const before = rng.snapshot();
  if (!input.enabled) return { active: false, rngBefore: before, rngAfter: rng.snapshot() };
  const limit = count * repeatCount * Math.max(1, Math.ceil(Math.fround(Math.fround(duration) / Math.fround(interval))));
  if (!Number.isSafeInteger(limit) || limit > 0x7fffffff || duration * 10000 > 0x7fffffff)
    throw Error('Overflow is outside the measured generator profile');
  const word = rng.nextWord();
  const delay = nativeStartDelay(start, startRange, word);
  return { active: true, mode: 0, durationTicks: duration * 10000,
    intervalTicks: Math.trunc(Math.fround(Math.fround(interval) * 10000)), remainingTicks: 0,
    emitted: 0, cycleEmitted: 0, limit, delayTicks: delay ? -delay * 10000 : 0,
    rngBefore: before, rngAfter: rng.snapshot() };
}

export function nativeActivationTrace(effect, states) {
  // Independent initial states are test inputs, not an invented NodeTree seed policy.
  if (!Array.isArray(states) || states.length !== effect.nodes.length) throw Error('One explicit RNG fixture per source emitter required');
  return effect.nodes.map((node, index) => ({ node: node.index, typeId: node.typeId, parentNode: node.parentIndex,
    activation: activateConstantGenerator(node.nativeGeneration, new NativeRandom(states[index])) }));
}

// Generator records share their emitter RNG, not a cloned seed per parent.
export class NativeGeneratorOwner {
  constructor(words, {capacity=128}={}) {
    if(!Number.isInteger(capacity)||capacity<1||capacity>128)throw Error('Bounded generator owner capacity required');
    this.rng=new NativeRandom(words);this.capacity=capacity;this.records=[];this.programs=new Map();
  }
  activate(generation,parent) {
    if(!(Number.isSafeInteger(parent)&&parent>=0||typeof parent==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(parent)))throw Error('Explicit parent generation identity required');
    if(this.records.length>=this.capacity||this.records.some(r=>r.parent===parent))throw Error('Generator slot reuse requires a separate lifecycle contract');
    const activation=activateConstantGenerator(generation,this.rng);
    const state=Object.fromEntries(['mode','durationTicks','intervalTicks','remainingTicks','emitted','cycleEmitted','limit','delayTicks']
      .map(k=>[k,activation[k]??0]));
    const record=activation.active?{index:this.records.length,parent,state}:null;
    if(record){this.records.push(record);this.programs.set(record.index,{generation:{...generation},next:0});}
    return {activation,state,record};
  }
  update(delta,{parentState,onBirth}={}) {
    if(!Number.isFinite(delta)||delta<0||delta>100||typeof parentState!=='function'||typeof onBirth!=='function')
      throw Error('Explicit parent resolver and birth callback required');
    if([...this.programs.values()].some(p=>p.generation.repeatCount!==1||(![0,3].includes(p.generation.typeId)&&!(p.generation.typeId===2&&p.generation.count===1&&p.generation.duration===1&&p.generation.interval===1&&p.generation.start===0&&p.generation.startRange===0))))
      throw Error('Unadmitted generator scheduling profile');
    const total=ticks(delta);
    // Activation order is the record traversal order; all callbacks share this.rng.
    // No implicit callback draw: Null and Particle callbacks have different rules.
    for(const record of this.records){
      const s=record.state,p=this.programs.get(record.index),g=p.generation;
      if(!nativeParentActive(parentState(record.parent))||s.emitted>=s.limit)continue;
      let remaining=Math.max(0,total+Math.min(0,s.delayTicks)),offset=0;
      while(remaining>0){
        if(s.remainingTicks>0){const spent=Math.min(remaining,s.remainingTicks);s.remainingTicks-=spent;remaining-=spent;offset+=spent;if(!remaining)break;}
        const window=Math.min(remaining,s.durationTicks);
        while(p.next<window&&s.emitted<s.limit){
          onBirth({record,offset:Math.fround((offset+p.next)/10000),offsetTicks:offset+p.next,count:g.count,rng:this.rng});
          s.emitted+=g.count;s.cycleEmitted+=g.count;p.next+=ticks(g.interval);
        }
        p.next-=window;s.intervalTicks=p.next;s.durationTicks-=window;remaining-=window;offset+=window;
        if(!remaining)break;
        this.rng.nextWord();s.durationTicks=g.duration*10000;s.intervalTicks=ticks(g.interval);
        s.cycleEmitted=0;p.next=0;
        if(s.emitted>=s.limit)break;
      }
    }
    return this.snapshot();
  }
  post(delta,{parentState,onRecord}={}) {
    if(!Number.isFinite(delta)||delta<0||delta>100||typeof parentState!=='function'||typeof onRecord!=='function')
      throw Error('Explicit parent resolver and post callback required');
    if([...this.programs.values()].some(p=>p.generation.repeatCount!==1||(![0,3].includes(p.generation.typeId)&&!(p.generation.typeId===2&&p.generation.count===1&&p.generation.duration===1&&p.generation.interval===1&&p.generation.start===0&&p.generation.startRange===0))))
      throw Error('Unadmitted generator scheduling profile');
    const total=ticks(delta);
    for(const record of this.records){
      // Parent expiry freezes the retained record and its existing cells. It is
      // not an allocator release, and does not move or reseed the shared stream.
      if(!nativeParentActive(parentState(record.parent)))continue;
      const s=record.state,active=Math.max(0,total+Math.min(0,s.delayTicks));
      if(s.delayTicks<0)s.delayTicks+=total;
      if(active>0)onRecord({record,activeTicks:active,rng:this.rng});
    }
    return this.snapshot();
  }
  snapshot() {
    return {rng:this.rng.snapshot(),records:this.records.map(r=>({...r,state:{...r.state}}))};
  }
}

export const PHASE_PROFILE = 'native-node-tree-clock-v1';

// This schedules original phase calls. It does not manufacture emitter state.
export class NativePhaseClock {
  constructor({profile,nodeCount=1,lifeTicks=0,ageTicks=0,continueFlag=false,loop=false,rootDisabled=false,
    paused=false,auxiliary=false,contextAuxiliary=false,fullSort=false,countA=0,countB=0,initialAge=0,splitInitial=false}={}) {
    if(profile!==PHASE_PROFILE||![nodeCount,lifeTicks,ageTicks,countA,countB,initialAge].every(v=>Number.isInteger(v)&&v>=0)
      ||nodeCount>128||Math.max(lifeTicks,ageTicks,countA,countB,initialAge)>10000000||loop&&lifeTicks===0)
      throw Error('Explicit admitted NodeTree clock inputs required');
    const flags={continueFlag,loop,rootDisabled,paused,auxiliary,contextAuxiliary,fullSort,splitInitial};
    if(Object.values(flags).some(v=>typeof v!=='boolean'))throw Error('Explicit boolean NodeTree flags required');
    Object.assign(this,{nodeCount,lifeTicks,ageTicks,countA,countB,initialAge,...flags});
    this.phaseFlag=0;this.touched=0;this.contextZero=0;this.contextSuspended=0;
  }
  step(delta,{call='update',post=true,onPhase}={}) {
    if(!Number.isFinite(delta)||delta<0||delta>100||!['update','post'].includes(call)||typeof post!=='boolean'
      ||onPhase!==undefined&&typeof onPhase!=='function')throw Error('Unsupported NodeTree clock step');
    delta=Math.fround(delta);
    const events=[],epsilon=Math.fround(.000001);
    let remaining=delta,returned=call==='post'?null:0,zero=0;
    const emit=(phase,dt,z)=>{
      zero=z;this.contextZero=z;this.contextSuspended=+this.paused;
      for(let node=0;node<this.nodeCount;node++){
        const event={node,phase,delta:dt,suspended:+this.paused,zero:z,phaseFlag:this.phaseFlag};
        events.push(event);onPhase?.(event);
      }
    };
    const postPass=(dt,z)=>{
      this.phaseFlag=+(this.countA!==this.countB||!z);
      this.touched|=this.phaseFlag||+(this.contextAuxiliary&&this.fullSort);
      emit('post',dt,z);
    };
    const allowed=age=>!this.lifeTicks||(age>0&&!this.rootDisabled&&(this.continueFlag||this.loop||age<=this.lifeTicks));
    if(call==='post') {
      if(this.ageTicks!==0&&allowed(this.ageTicks))postPass(delta,+(delta<epsilon));
    } else {
      const before=this.ageTicks;
      if(before<=this.lifeTicks){
        this.ageTicks=(before+Math.trunc(Math.fround(delta*10000)))|0;
        if(this.loop&&this.ageTicks>this.lifeTicks)this.ageTicks-=Math.ceil((this.ageTicks-this.lifeTicks)/this.lifeTicks)*this.lifeTicks;
      }
      if(allowed(this.ageTicks)) {
        const whole=Math.trunc(delta),warmup=before===0?this.initialAge+whole:0;
        if(warmup>0) {
          this.phaseFlag=1;this.touched=1;
          const pair=dt=>{emit('update',dt,0);emit('post',dt,0);};
          if(this.splitInitial){for(let i=0;i<warmup;i++)pair(1);remaining=Math.fround(delta-whole);if(remaining>0)pair(remaining);}
          else {if(warmup>1)pair(warmup-1);remaining=Math.fround(Math.fround(delta+1)-whole);pair(remaining);}
          returned=0;
        } else {
          const z=+(delta<epsilon);
          if(!z&&this.auxiliary&&this.contextAuxiliary){this.phaseFlag=0;emit('post',0,1);}
          emit('update',delta,z);
          if(post)postPass(delta,z);
          returned=1;
        }
      }
    }
    return {events,returned,ageTicks:this.ageTicks,remainingDelta:remaining,
      treeState:[+this.paused,0,+this.auxiliary,0,this.touched],
      contextFlags:[this.contextSuspended,this.contextZero,+this.contextAuxiliary,this.phaseFlag]};
  }
}

// null is an explicit neutral host boundary, not a missing-parent fallback.
export function nativeParentActive(parent) {
  if(parent===null)return true;
  if(!parent||![parent.lifeTicks,parent.ageTicks].every(Number.isSafeInteger)||parent.lifeTicks<1||parent.lifeTicks>100000000||Math.abs(parent.ageTicks)>100000000)
    throw Error('Explicit bounded parent joint state required');
  return parent.ageTicks<=parent.lifeTicks;
}

export function advanceNativeJoint(joint,delta,parent) {
  if(!Number.isFinite(delta)||delta<0||delta>100)throw Error('Unsupported joint delta');
  if(nativeParentActive(joint)&&nativeParentActive(parent))joint.ageTicks+=ticks(delta);
  return {...joint};
}

export const PARTICLE_PROFILE='native-particle-lifecycle-v1';
const ticks=delta=>Math.trunc(Math.fround(Math.fround(delta)*10000));

function validateScalarModule(m) {
  if(m?.kind==='OneX'&&m.value===1&&m.range===0&&m.velocity===undefined&&m.velocityRange===undefined)return;
  if(!m||!['ConstX','VelocityX'].includes(m.kind)||![m.value,m.range].every(Number.isFinite)||m.range<0||Math.max(Math.abs(m.value),m.range)>10000
      ||m.kind==='VelocityX'&&(![m.velocity,m.velocityRange].every(Number.isFinite)||m.velocityRange<0||Math.max(Math.abs(m.velocity),m.velocityRange)>10000))
      throw Error('Unadmitted Particle initializer');
}

// Shared record arithmetic; calling this consumes the emitter-owned stream.
export function initializeNativeScalar(m,rng) {
  validateScalarModule(m);
  if(!(rng instanceof NativeRandom))throw Error('Native emitter RNG owner required');
  // OneX has no initializer/work slot and consumes no random sample.
  if(m.kind==='OneX')return [];
  const uniform=rng.uniform(),value=Math.fround(m.value),range=Math.fround(m.range);
  const size=Math.max(0,Math.fround(Math.fround(value-range)+Math.fround(2*range)*uniform));
  if(m.kind==='ConstX')return [size];
  const speed=Math.fround(m.velocity),spread=Math.fround(m.velocityRange),next=rng.uniform();
  return [size,Math.fround(Math.fround(speed-spread)+Math.fround(2*spread)*next)];
}

export function updateNativeScalar(record,delta) {
  if(!Array.isArray(record)||record.length!==2||!record.every(Number.isFinite)||!Number.isFinite(delta)||delta<0||delta>100)
    throw Error('Explicit finite VelocityX record and delta required');
  record[0]=Math.max(0,Math.fround(record[0]+record[1]*Math.fround(delta)));
  return record;
}

// Raw vec3 parameters are compiled offline; dispatch and context are explicit.
function validateNativeVector(module) {
  const vector=v=>Array.isArray(v)&&v.length===3&&v.every(x=>Number.isFinite(x)&&Math.abs(x)<=10000);
  if(!module||!['UVConst','ColorConst','TranslationVelocity'].includes(module.kind)||!vector(module.value)||!vector(module.range)
    ||module.range.some(v=>v<0)||module.arithmetic!=='captured-separate-f32')throw Error('Explicit bounded vector initializer required');
  if(module.kind==='TranslationVelocity'){
    if(!vector(module.velocity)||!vector(module.velocityRange)||module.velocityRange.some(v=>v<0)
      ||!vector(module.offset)||!vector(module.multiplier))throw Error('Explicit translation init context required');
  }
}

export function initializeNativeVector(module,rng) {
  validateNativeVector(module);
  if(!(rng instanceof NativeRandom))throw Error('Native emitter RNG owner required');
  const f=Math.fround,sample=(value,range)=>f(f(f(f(range)+f(range))*rng.uniform())+f(f(value)-f(range)));
  if(module.kind==='TranslationVelocity'){
    const position=module.value.map((v,i)=>f(sample(v,module.range[i])+f(module.offset[i])));
    const velocity=module.velocity.map((v,i)=>{
      const range=f(module.velocityRange[i]),base=f(f(f(v)*f(module.multiplier[i]))-range);
      return f(f(f(range+range)*rng.uniform())+base);
    });
    return [...position,...velocity];
  }
  const values=module.value.map((v,i)=>sample(v,module.range[i]));
  return module.kind==='ColorConst'?values.map(v=>Math.max(0,Math.min(1,v))):values;
}

export function updateNativeTranslation(record,delta,arithmetic) {
  if(!Array.isArray(record)||record.length!==6||!record.every(Number.isFinite)||!Number.isFinite(delta)||delta<0||delta>100||arithmetic!=='captured-separate-f32')
    throw Error('Explicit translation velocity record, delta and arithmetic profile required');
  for(let i=0;i<3;i++)record[i]=Math.fround(record[i]+Math.fround(record[i+3]*Math.fround(delta)));
  return record;
}

// Column-major parent basis; captured arithmetic rounds each multiply/add.
export function projectNativeTranslation(position,parent,arithmetic) {
  if(!Array.isArray(position)||position.length!==3||!position.every(Number.isFinite)
    ||!parent||!Array.isArray(parent.basis)||parent.basis.length!==9||!parent.basis.every(Number.isFinite)
    ||!Array.isArray(parent.origin)||parent.origin.length!==3||!parent.origin.every(Number.isFinite)
    ||arithmetic!=='captured-separate-f32')throw Error('Explicit parent projection and arithmetic required');
  const f=Math.fround;
  return parent.origin.map((origin,i)=>{
    let v=f(f(position[1])*f(parent.basis[3+i]));
    v=f(f(f(parent.basis[i])*f(position[0]))+v);
    v=f(f(f(parent.basis[6+i])*f(position[2]))+v);
    return f(v+f(origin));
  });
}

// A retained Null module pass is distinct from per-joint age advancement.
// The caller supplies the admitted retained range and emitter-expired flag.
export function updateRetainedNativeRecords(records,delta,{parent,expired,onRecord}={}) {
  if(!Array.isArray(records)||records.length>128||typeof expired!=='boolean'||typeof onRecord!=='function'
    ||!Number.isFinite(delta)||delta<0||delta>100)throw Error('Explicit retained-record pass required');
  if(expired||!nativeParentActive(parent))return;
  records.forEach((record,index)=>onRecord(record,index,Math.fround(delta)));
}

// Finite constant generator + explicit init program. No implicit parent adapters.
export class NativeParticleEmitter {
  constructor({profile,generation,words,life,lifeRange=0,capacity=128,modules}={}) {
    if(profile!==PARTICLE_PROFILE||generation?.typeId!==3||generation.repeatCount!==1
      ||!Number.isInteger(life)||!Number.isInteger(lifeRange)||Math.min(life,lifeRange)<0||Math.max(life,lifeRange)>10000
      ||!Number.isInteger(capacity)||capacity<1||capacity>128||!Array.isArray(modules)||modules.length>2)
      throw Error('Explicit finite Particle lifecycle contract required');
    if(modules.length===2&&modules[1]?.kind!=='ColorConst')throw Error('Only an explicit trailing color module is admitted');
    for(const [i,m]of modules.entries()){
      if(i===1)validateNativeVector(m);
      else validateScalarModule(m);
    }
    this.owner=new NativeGeneratorOwner(words,{capacity:1});this.rng=this.owner.rng;this.generation={...generation};
    const {activation:activated,state}=this.owner.activate(generation,0);
    if(activated.active&&activated.limit>capacity)throw Error('Ring overwrite requires a separate allocator contract');
    this.active=activated.active;this.life=life;this.lifeRange=lifeRange;this.capacity=capacity;this.modules=modules;
    this.state=state;
    this.interval=ticks(generation.interval);this.duration=generation.duration*10000;this.next=0;
    this.particles=[];this.requests=[];this.expired=false;this.currentStep=0;
    this.initial=this.snapshot();
  }
  snapshot(includeParticles=false) {
    return {...this.state,rng:[...this.rng.words],...(includeParticles?{particles:this.particles.map(p=>({slot:p.slot,lifeTicks:p.lifeTicks,ageTicks:p.ageTicks,moduleRecord:[...p.moduleRecord]}))}:{})};
  }
  color(particle) {
    if(this.modules[1]?.kind!=='ColorConst')return null;
    const at=this.modules[0].kind==='OneX'?0:this.modules[0].kind==='VelocityX'?2:1;
    return particle.moduleRecord.slice(at,at+3);
  }
  update(delta,{suspended=false}={}) {
    if(!Number.isFinite(delta)||delta<0||delta>100||typeof suspended!=='boolean')throw Error('Unsupported Particle update');
    if(!this.active||suspended)return this.snapshot(true);
    this.owner.update(delta,{parentState:()=>null,onBirth:({offset,offsetTicks:when,count})=>{
        this.requests.push({step:this.currentStep,offset,count});
        this.rng.nextWord(); // Callback-level draw precedes its per-particle loop.
        for(let batch=0;batch<count;batch++){
          const word=this.rng.nextWord(),spread=this.lifeRange;
          const duration=Math.max(1,this.life-spread+(spread?word%(2*spread):0))*10000;
          const moduleRecord=this.modules.flatMap(m=>m.kind==='ColorConst'?initializeNativeVector(m,this.rng):initializeNativeScalar(m,this.rng));
          this.particles.push({slot:this.particles.length,lifeTicks:duration,ageTicks:when?-when:0,moduleRecord});
        }
    }});
    return this.snapshot(true);
  }
  post(delta,{suspended=false}={}) {
    if(!Number.isFinite(delta)||delta<0||delta>100||typeof suspended!=='boolean')throw Error('Unsupported Particle post-update');
    if(!this.active)return this.snapshot(true);
    this.owner.post(delta,{parentState:()=>null,onRecord:({activeTicks:active})=>{
      for(const particle of this.particles)if(particle.ageTicks<=particle.lifeTicks){
        if(this.modules[0]?.kind==='VelocityX'){
          const dt=Math.fround((active+Math.min(0,particle.ageTicks))/10000);
          const scalar=updateNativeScalar(particle.moduleRecord.slice(0,2),dt);particle.moduleRecord[0]=scalar[0];
        }
        particle.ageTicks+=active;
      }
      this.expired=!this.particles.some(p=>p.ageTicks<=p.lifeTicks);
    }});
    return this.snapshot(true);
  }
  step(delta,{suspended=false}={}) {
    delta=Math.fround(delta);
    const afterUpdate=this.update(delta,{suspended});this.post(delta,{suspended});this.currentStep++;
    return {delta,restoredDelta:delta,...this.snapshot(),afterUpdate,expired:this.expired,particles:this.snapshot(true).particles};
  }
}

export function nativeScalarAlpha(keys, time, arithmetic) {
  if(arithmetic!==undefined&&arithmetic!=='captured-separate-f32')throw Error('Unsupported alpha arithmetic profile');
  const f=Math.fround,epsilon=f(1e-6),types=['Constant','Linear','Spline','BreakSpline'];
  if(!keys.length||!Number.isFinite(f(time)))throw Error('Expected finite native alpha keys and time');
  const prepared=keys.map(k=>{
    if(!types.includes(k.type)||![k.frame,k.value,k.slopeLeft,k.slopeRight].every(v=>Number.isFinite(v)&&Number.isFinite(f(v))))
      throw Error('Unsupported native scalar alpha key');
    return {...k,frame:f(k.frame),value:f(k.value),slopeLeft:f(k.slopeLeft),slopeRight:f(k.slopeRight)};
  });
  for(let i=1;i<prepared.length;i++)if(f(prepared[i].frame-prepared[i-1].frame)<epsilon)
    throw Error('Native alpha near-duplicate or unordered key times are outside the verified subset');
  const clamp=v=>Math.max(0,Math.min(1,v)),t=f(time);
  if(t<=prepared[0].frame)return clamp(prepared[0].value);
  if(t>=prepared.at(-1).frame)return clamp(prepared.at(-1).value);
  const i=prepared.findIndex(k=>k.frame>=t),a=prepared[i-1],b=prepared[i];
  const u=f(f(t-a.frame)/f(b.frame-a.frame));
  if(a.type==='Constant')return clamp(Math.abs(f(u-1))<epsilon?b.value:a.value);
  if(a.type==='Linear')return arithmetic==='captured-separate-f32'?clamp(f(a.value+f(u*f(b.value-a.value)))):clamp(a.value+u*(b.value-a.value));
  return clamp((2*u**3-3*u*u+1)*a.value+(-2*u**3+3*u*u)*b.value
    +(u**3-2*u*u+u)*a.slopeLeft+(u**3-u*u)*b.slopeRight);
}

