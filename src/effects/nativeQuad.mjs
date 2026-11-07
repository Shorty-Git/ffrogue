// Admitted SimpleSquare/Default Quad packet generation, not whole-tree support.
import {NativeGeneratorOwner,initializeNativeVector,updateNativeTranslation,nativeScalarAlpha,projectNativeTranslation} from './nativeLifecycle.mjs';
const f=Math.fround;
const flat=v=>Object.values(v).flat();
export function validateNativeQuad(program) {
  if(program?.profile!=='native-quad-branch-v1'||program.node?.typeId!==2||program.node.lifeRangeParameter
    ||program.node.children.length||!program.color||!program.node.alphaCurve.keys.length
    ||![0,2].includes(program.node.nativeMaterialSelection?.operation)||!program.node.nativeMaterialSelection.supported
    ||program.textureTints?.some(v=>v.length!==4||v.some(x=>x!==1))||program.textureTints?.length!==2)
    throw Error('Explicit admitted Quad branch required');
  const n=program.node,t=n.staticVectors.transform;
  if(['translation','rotation','scale','matrix'].some(k=>n.authoringInheritance?.[k]!=='On')
    ||n.authoringInheritance.alphaRate!==0||n.authoringInheritance.colorRate!==0)
    throw Error('Partial transform or color inheritance requires a separate profile');
  if(n.alphaCurve.keys.some(k=>k.type!=='Linear')||program.color.range.some(v=>!Number.isFinite(v)||v<0||v>1)
    ||program.color.value.some(v=>!Number.isFinite(v)||v<0||v>1)||n.lifeParameter<1||n.lifeParameter>600)
    throw Error('Only measured linear alpha/bounded flat color/finite life is admitted');
  const fragment=n.nativeMaterialSelection.fragmentSha256;
  if(fragment!==(n.nativeMaterialSelection.operation===0?'8ae381afc9f95ab42caafc2c03266ddc08500489623d2e16d39d89737b7d1fb4':'b54945426716fdc4ae4678cc85de7acd658d5259f23d5b2b187eb782a748a687')
    ||![1,2].includes(program.blend?.id)||program.blend.equation!==32774
    ||JSON.stringify(program.blend.row)!==JSON.stringify([1,770,program.blend.id===1?771:1])
    ||program.dispatch?.scale!=='Velocity'||program.dispatch.geometry!=='SimpleSquare'||program.dispatch.transform!=='Default'
    ||program.dispatch.completeOrderedProfile!=='quad-velocity-flat-curve-v1'
    ||program.dispatch.alpha!=='Curve'||program.dispatch.color!=='ConstFlat'
    ||!['Zero','Velocity'].includes(program.dispatch.translation)
    ||program.dispatch.translation==='Zero'&&flat(t.translation).some(Boolean)
    ||JSON.stringify(program.textureTrims)!=='[[0,0,1,1],[0,0,1,1]]'||JSON.stringify(program.globalColorScale)!=='[1,1,1,1]'
    ||n.nativeMaterialSelection.operation===2&&!n.resourceBindings.texture2
    ||Object.entries(n.vectorCurves).some(([k,v])=>v.keys.length&&!(k==='translationValue'&&program.dispatch.translation==='Velocity')))
    throw Error('Unadmitted fragment, blend, selected module or vector curve');
  if(flat(t.rotation).some(Boolean)||n.texturePivots.texture1.some(v=>v!==.5)||n.texturePivots.texture2.some(v=>v!==.5)
    ||n.staticVectors.texture1.scale.valueInitial.some(v=>v!==1))
    throw Error('Quad rotation/texture transform profile is unsupported');
  for(const key of ['texture1','texture2']){
    const v=n.staticVectors[key];
    if(flat(v.rotation).some(Boolean)||flat(v.translation).some(Boolean)
      ||Object.entries(v.scale).some(([k,v])=>k!=='valueInitial'&&v.some(Boolean))||v.scale.valueInitial.some(v=>v<=0))
      throw Error('Animated/rotated/degenerate UV input is outside this profile');
  }
  if(!n.nativeMaterialSelection.basicCandidateCompatible&&n.nativeMaterialSelection.operation===0
    ||n.nativeMaterialSelection.operation===2&&!n.nativeMaterialSelection.addCandidateCompatible)
    throw Error('Unverified source material selection');
  const g=program.generation;
  if(g?.typeId!==2||g.count!==1||g.duration!==1||g.repeatCount!==1||g.start||g.startRange||g.interval!==1)
    throw Error('Only measured single-burst Quad generation is admitted');
}

export class NativeQuadEmitter {
  constructor(program) {
    validateNativeQuad(program);this.program=program;this.owner=new NativeGeneratorOwner(program.words,{capacity:1});
    this.owner.activate(program.generation,0);this.record=null;this.ageTicks=0;this.frame=0;
  }
  initialize(rng) {
    const n=this.program.node,t=n.staticVectors.transform;
    const vector=(v,kind)=>initializeNativeVector({kind,arithmetic:'captured-separate-f32',value:v.valueInitial,range:v.valueRange,
      velocity:v.speedInitial,velocityRange:v.speedRange,offset:[0,0,0],multiplier:[1,1,1]},rng);
    const scale=vector(t.scale,'TranslationVelocity');for(let i=0;i<3;i++)scale[i]=Math.max(0,scale[i]);
    const moving=this.program.dispatch.translation==='Velocity',translation=moving?vector(t.translation,'TranslationVelocity'):[0,0,0];
    const uv=this.program.node.nativeMaterialSelection.operation===2?vector(n.staticVectors.texture2.scale,'UVConst'):null;
    const color=initializeNativeVector({kind:'ColorConst',arithmetic:'captured-separate-f32',...this.program.color},rng);
    this.record={scale,translation,uv,color,alpha:f(nativeScalarAlpha(n.alphaCurve.keys,0,'captured-separate-f32'))};
  }
  step(delta,parent,parentState=null) {
    if(delta!==1)throw Error('Quad source replay currently requires explicit unit steps');
    this.frame++;
    this.owner.update(delta,{parentState:()=>parentState,onBirth:({rng})=>{
      rng.nextWord();rng.nextWord();this.initialize(rng); // Callback draw, then zero-range life draw.
    }});
    this.owner.post(delta,{parentState:()=>parentState,onRecord:()=>{
      if(!this.record||this.ageTicks>this.program.node.lifeParameter*10000)return;
      this.ageTicks+=10000;if(this.ageTicks>this.program.node.lifeParameter*10000)return;
      updateNativeTranslation(this.record.scale,1,'captured-separate-f32');
      for(let i=0;i<3;i++)this.record.scale[i]=Math.max(0,this.record.scale[i]);
      if(this.record.translation.length===6)updateNativeTranslation(this.record.translation,1,'captured-separate-f32');
      this.record.alpha=f(nativeScalarAlpha(this.program.node.alphaCurve.keys,f(this.ageTicks/(this.program.node.lifeParameter*10000)),'captured-separate-f32'));
    }});
    return this.packet(parent);
  }
  recordValues() {
    if(!this.record)return [];
    const r=this.record;return [...r.scale,...r.translation,...(r.uv??[]),r.alpha,...r.color];
  }
  packet(parent) {
    const n=this.program.node,r=this.record;
    if(!r||this.ageTicks>n.lifeParameter*10000)return null;
    const center=projectNativeTranslation(r.translation.slice(0,3),parent,'captured-separate-f32');
    const signs=[[-1,1],[-1,-1],[1,-1],[1,1],[-1,1],[1,-1]],uvs=[[0,0],[0,1],[1,1],[1,0],[0,0],[1,1]];
    const rgba=[...r.color,r.alpha].map(v=>Math.trunc(f(Math.max(0,Math.min(1,v))*255)));
    const vertices=signs.map(([x,y],i)=>{
      const local=[f(x*r.scale[0]),f(y*r.scale[1]),0];
      const position=projectNativeTranslation(local,{basis:parent.basis,origin:center},'captured-separate-f32');
      const uv=uvs[i],vertex={position,rgba:[...rgba],uv:[...uv],textureTint:[...this.program.textureTints[0]]};
      if(r.uv)vertex.uv2=uv.map((v,j)=>f(f(f(1/r.uv[j])*f(v-.5))+.5)),vertex.textureTint2=[...this.program.textureTints[1]];
      return vertex;
    });
    return {node:n.index,frame:this.frame,visible:r.alpha>0,vertices,textures:n.resourceBindings,
      material:n.nativeMaterialSelection,blend:this.program.blend,order:this.program.order,
      boundary:'Source-selected packed Quad inputs; explicit neutral texture tints and initial material selection; GPU order/global uniforms not certified'};
  }
}
