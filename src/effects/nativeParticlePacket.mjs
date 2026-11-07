// Bounded source-selected zero-roll VelocityX two-texture Particle writer.
// Inputs are computed module state, never native vertex buffers or matrices.
const f=Math.fround;
const vector=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(Number.isFinite);
export function validateNativeParticlePacket(program) {
  const n=program?.node;
  if(program?.profile!=='native-particle-x-two-texture-v1'||n?.typeId!==3
    ||!n.nativeMaterialSelection?.supported||!n.nativeMaterialSelection.addCandidateCompatible
    ||n.nativeMaterialSelection.operation!==2
    ||n.nativeMaterialSelection.fragmentSha256!=='b54945426716fdc4ae4678cc85de7acd658d5259f23d5b2b187eb782a748a687'
    ||!n.resourceBindings.texture1||!n.resourceBindings.texture2
    ||program.dispatch!=='velocity-x-zero-translation-uv2-const-color-v1'
    ||JSON.stringify(program.textureTints)!=='[[1,1,1,1],[1,1,1,1]]'
    ||!Array.isArray(program.textureTrims)||program.textureTrims.length!==2
    ||program.textureTrims.some(t=>!vector(t,4)||t.some(x=>x<0||x>1)||t[2]<=0||t[3]<=0||f(t[0]+t[2])>1||f(t[1]+t[3])>1)
    ||!vector(program.drawBasis,16)||[3,7,11].some(i=>program.drawBasis[i]!==0)||program.drawBasis[15]!==1
    ||[0,4].some(i=>program.drawBasis.slice(i,i+3).every(x=>x===0))
    ||JSON.stringify(program.globalColorScale)!=='[1,1,1,1]'
    ||program.blend?.id!==2||program.blend.equation!==32774
    ||JSON.stringify(program.blend.row)!=='[1,770,1]')throw Error('Explicit admitted two-texture Particle packet profile required');
}

export function nativeParticleBillboardCorners(state,drawBasis) {
  if(!vector(state?.center,3)||!vector(state.localScale,3)||!vector(state.groupScale,3)||!vector(drawBasis,16))
    throw Error('Finite computed Particle billboard inputs required');
  const x=f(state.localScale[0]*state.groupScale[0]),y=f(state.localScale[1]*state.groupScale[1]);
  const horizontal=[0,1,2].map(i=>f(x*f(drawBasis[i]))),vertical=[0,1,2].map(i=>f(y*f(drawBasis[4+i])));
  // Retain the original writer's separate float32 operation order.
  return [0,1,2,3].map(corner=>state.center.map((center,i)=>{
    const a=horizontal[i],b=vertical[i];
    return corner===0?f(f(b+center)-a):corner===1?f(center-f(a+b)):
      corner===2?f(f(a+center)-b):f(f(a+b)+center);
  }));
}
export function nativeParticleXPacket(program,state) {
  validateNativeParticlePacket(program);
  if(!vector(state?.center,3)||!vector(state.localScale,3)||state.localScale.some(x=>x<0)
    ||!vector(state.groupScale,3)||state.groupScale.some(x=>x<=0)
    ||!vector(state.uvScale,3)||state.uvScale.some(x=>x<=0)
    ||!vector(state.color,3)||state.color.some(x=>x<0||x>1)
    ||!vector(state.rotation,3)||state.rotation.some(Boolean)||state.alpha!==1)
    throw Error('Explicit computed finite Particle state/zero rotation/alpha1 required');
  const corners=nativeParticleBillboardCorners(state,program.drawBasis);
  const uvs=[[0,0],[0,1],[1,1],[1,0]],indices=[0,1,2,3,0,2];
  const rgba=[...state.color,state.alpha].map(v=>Math.trunc(f(v*255)));
  const rect=(uv,trim)=>uv.map((v,i)=>f(f(v*f(trim[2+i]))+f(trim[i])));
  const vertices=indices.map(index=>({position:corners[index],rgba:[...rgba],uv:rect(uvs[index],program.textureTrims[0]),
    textureTint:[...program.textureTints[0]],
    uv2:rect(uvs[index].map((v,i)=>f(f(f(1/state.uvScale[i])*f(v-.5))+.5)),program.textureTrims[1]),
    textureTint2:[...program.textureTints[1]]}));
  return {node:program.node.index,instance:state.instance,frame:state.frame,visible:true,vertices,
    textures:program.node.resourceBindings,material:program.node.nativeMaterialSelection,
    blend:program.blend,order:program.order,
    boundary:'Computed zero-roll Particle X two-texture packet; affine draw basis/atlas rectangles/neutral tints/alpha1 explicit; no live GPU pixel claim'};
}
