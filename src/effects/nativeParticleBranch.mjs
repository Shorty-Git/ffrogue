// Parent-owned Null/Particle traversal under a reviewed finite module contract.
import {NativeGeneratorOwner,initializeNativeScalar,initializeNativeVector,updateNativeScalar,
  updateNativeTranslation,advanceNativeJoint,nativeParentActive,updateRetainedNativeRecords} from './nativeLifecycle.mjs';
import {nativeQuadParents} from './nativeQuadGraph.mjs';
import {nativeDefaultTransform,nativeParticleXMakeInputs} from './nativeTransform.mjs';
import {nativeParticleXPacket,validateNativeParticlePacket} from './nativeParticlePacket.mjs';

export function validateNativeParticleBranch(p) {
  validateNativeParticlePacket(p);
  const n=p.node,parent=p.parent?.node,g=p.parent?.generation,c=p.generation;
  const zero=v=>Object.values(v).flat().every(x=>x===0);
  const neutral=t=>zero(t.rotation)&&t.scale.valueInitial.every(x=>x===1)
    &&Object.entries(t.scale).every(([key,v])=>key==='valueInitial'||v.every(x=>x===0));
  if(parent?.typeId!==0||n.parentIndex!==parent.index||!neutral(parent.staticVectors.transform)
    ||JSON.stringify(parent.children)!==JSON.stringify([n.index])||p.ancestors?.at(-1)?.node.index!==parent.parentIndex
    ||!zero(n.staticVectors.transform.rotation)||!zero(n.staticVectors.transform.translation)
    ||n.children.length||n.lifeRangeParameter||parent.lifeRangeParameter
    ||![n.lifeParameter,parent.lifeParameter,p.hostLife].every(x=>Number.isInteger(x)&&x>0&&x<=600)
    ||p.hostLife<parent.lifeParameter||p.parent.color.value.some(x=>x!==1)||p.parent.color.range.some(Boolean)
    ||Object.values(n.vectorCurves).some(v=>v.keys.length)||Object.values(parent.vectorCurves).some(v=>v.keys.length)
    ||n.staticVectors.texture1.scale.valueInitial.some(x=>x!==1)
    ||n.materialAlpha.value!==1||n.alphaCurve.keys.length||p.activationAgeTicks!==0)
    throw Error('Unadmitted parent/Particle lifecycle or modulation');
  for(const node of [n,parent])if(['translation','rotation','scale','matrix'].some(k=>node.authoringInheritance[k]!=='On')
    ||node.authoringInheritance.alphaRate!==0||node.authoringInheritance.colorRate!==0)
    throw Error('Unadmitted Particle inheritance');
  for(const key of ['texture1','texture2']){
    const t=n.staticVectors[key];
    if(!zero(t.rotation)||!zero(t.translation)||n.texturePivots[key].some(x=>x!==.5)
      ||Object.entries(t.scale).some(([k,v])=>k!=='valueInitial'&&v.some(Boolean))||t.scale.valueInitial.some(x=>x<=0))
      throw Error('Unadmitted Particle UV profile');
  }
  if(g?.typeId!==0||g.start||g.startRange||g.repeatCount!==1||g.interval!==1
    ||!Number.isInteger(g.duration)||g.duration<1||g.duration>600||!Number.isInteger(g.count)||g.count<1||g.count*g.duration>128
    ||c?.typeId!==3||c.start||c.startRange||c.repeatCount!==1||c.interval!==1||c.count!==1||c.duration!==1)
    throw Error('Unadmitted finite parent/child schedules');
}

export class NativeParticleBranch {
  constructor(program,scene) {
    validateNativeParticleBranch(program);this.program=program;
    this.hostTransform=nativeQuadParents(program,scene);
    this.host={lifeTicks:program.hostLife*10000,ageTicks:program.activationAgeTicks};
    this.parent=new NativeGeneratorOwner(program.parent.words,{capacity:128});
    this.child=new NativeGeneratorOwner(program.words,{capacity:128});
    this.parent.activate(program.parent.generation,'host');
    this.joints=[];this.translations=[];this.transforms=[];this.cells=[];
    this.scalars=[];this.uv=[];this.colors=[];this.frame=0;this.expired=false;this.parentModulesExpired=false;
  }
  step(delta=1) {
    if(delta!==1||this.frame>=600)throw Error('Explicit bounded unit Particle step required');
    this.frame++;const p=this.program,resolve=id=>this.joints[id];
    this.parent.update(1,{parentState:()=>this.host,onBirth:({offset,count,rng})=>{
      for(let i=0;i<count;i++){
        rng.nextWord();const joint={lifeTicks:p.parent.node.lifeParameter*10000,ageTicks:-Math.trunc(offset*10000)||0};
        const slot=this.joints.length;this.joints.push(joint);this.child.activate(p.generation,slot);
        const t=p.parent.node.staticVectors.transform.translation;
        this.translations.push(initializeNativeVector({kind:'TranslationVelocity',arithmetic:'captured-separate-f32',value:t.valueInitial,
          range:t.valueRange,velocity:t.speedInitial,velocityRange:t.speedRange,offset:[0,0,0],multiplier:[1,1,1]},rng));
        initializeNativeVector({kind:'ColorConst',arithmetic:'captured-separate-f32',...p.parent.color},rng);
      }
    }});
    if(!this.expired)this.child.update(1,{parentState:resolve,onBirth:({record,offset,count,rng})=>{
      rng.nextWord();
      for(let i=0;i<count;i++){
        rng.nextWord();const t=p.node.staticVectors.transform.scale;
        this.scalars.push(initializeNativeScalar({kind:'VelocityX',value:t.valueInitial[0],range:t.valueRange[0],
          velocity:t.speedInitial[0],velocityRange:t.speedRange[0]},rng));
        this.uv.push(initializeNativeVector({kind:'UVConst',arithmetic:'captured-separate-f32',...p.uvScale},rng));
        this.colors.push(initializeNativeVector({kind:'ColorConst',arithmetic:'captured-separate-f32',...p.color},rng));
        this.cells.push({parent:record.parent,lifeTicks:p.node.lifeParameter*10000,ageTicks:-Math.trunc(offset*10000)||0});
      }
    }});
    advanceNativeJoint(this.host,1,null);
    this.parent.post(1,{parentState:()=>this.host,onRecord:({activeTicks})=>{
      for(const joint of this.joints)advanceNativeJoint(joint,activeTicks/10000,this.host);
      updateRetainedNativeRecords(this.translations,activeTicks/10000,{parent:this.host,expired:this.parentModulesExpired,
        onRecord:(record,slot,dt)=>{
          updateNativeTranslation(record,dt,'captured-separate-f32');
          this.transforms[slot]=nativeDefaultTransform({rotation:[0,0,0],scale:[1,1,1],translation:record.slice(0,3)},this.hostTransform,'captured-separate-f32');
        }});
    }});
    if(!this.expired){
      this.child.post(1,{parentState:resolve,onRecord:({record,activeTicks})=>{
        const cell=this.cells[record.index];if(cell&&cell.ageTicks<=cell.lifeTicks){
          updateNativeScalar(this.scalars[record.index],Math.fround((activeTicks+Math.min(0,cell.ageTicks))/10000));cell.ageTicks+=activeTicks;
        }
      }});
      this.expired=this.child.records.length>0&&this.child.records.every(r=>!nativeParentActive(resolve(r.parent)));
    }
    this.parentModulesExpired=this.expired&&this.joints.every(j=>!nativeParentActive(j));
    return this.cells.map((cell,instance)=>{
      if(!nativeParentActive(resolve(cell.parent))||cell.ageTicks>cell.lifeTicks)return {packet:null};
      const joint=this.transforms[cell.parent];
      const state={...nativeParticleXMakeInputs({scalar:this.scalars[instance][0],center:joint.origin,groupScale:joint.scale,rotationMode:'Absent'}),
        uvScale:this.uv[instance],color:this.colors[instance],alpha:1,frame:this.frame,instance};
      return {packet:nativeParticleXPacket(p,state),state,parentState:joint,rng:[...this.child.rng.words]};
    });
  }
}
