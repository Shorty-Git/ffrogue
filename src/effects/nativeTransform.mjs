// Bounded Default locator semantics; explicit contexts, never a source-node override.
import {initializeNativeScalar, initializeNativeVector, NativeRandom, projectNativeTranslation} from './nativeLifecycle.mjs';

const f=Math.fround;
const vector=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(Number.isFinite);
const mul=(a,b)=>f(f(a)*f(b)),add=(a,b)=>f(f(a)+f(b)),sub=(a,b)=>f(f(a)-f(b));
const mad=(a,b,c)=>add(mul(a,b),c);

export function initializeNativeConstTransform(program,rng) {
  if(program?.profile!=='null-const-transform-v1'||program.arithmetic!=='captured-separate-f32'
    ||!(rng instanceof NativeRandom)||program.scale?.kind!=='ConstX'
    ||!vector(program.rotation?.value,3)||!vector(program.rotation?.range,3)
    ||program.rotation.range.some(v=>v<0)||program.translation!=='Zero'
    ||!vector(program.color?.value,3)||!vector(program.color?.range,3)||program.color.range.some(v=>v<0)
    ||![program.scale.value,program.scale.range].every(Number.isFinite)||program.scale.range<0)throw Error('Explicit admitted constant Null program required');
  const scale=initializeNativeScalar(program.scale,rng)[0];
  const rotation=initializeNativeVector({kind:'UVConst',value:program.rotation.value,range:program.rotation.range,arithmetic:program.arithmetic},rng)
    .map(v=>mul(v,f(Math.PI/180)));
  const color=initializeNativeVector({kind:'ColorConst',...program.color,arithmetic:program.arithmetic},rng);
  return {scale:[scale,scale,scale],rotation,translation:[0,0,0],color};
}

// Composite of the preceding translation module and Default locator. The locator
// itself leaves world translation intact. Column-major parent multiplication and
// quaternion use the native transposed convention; no parent quaternion is sampled.
export function nativeDefaultTransform(local,parent,arithmetic) {
  if(arithmetic!=='captured-separate-f32'||!vector(local?.rotation,3)||!vector(local?.scale,3)
    ||local.scale.some(v=>v<0)||!vector(local?.translation,3)||!vector(parent?.basis,9)||!vector(parent?.origin,3))
    throw Error('Explicit Default locator inputs and arithmetic required');
  const [sx,sy,sz]=local.rotation.map(v=>f(Math.sin(f(v))));
  const [cx,cy,cz]=local.rotation.map(v=>f(Math.cos(f(v))));
  const [x,y,z]=local.scale;
  const columns=[
    [mul(mad(mul(sz,sx),sy,mul(cz,cy)),x),mul(mul(cx,sz),x),mul(sub(mul(mul(sz,sx),cy),mul(sy,cz)),x)],
    [mul(sub(mul(mul(cz,sx),sy),mul(sz,cy)),y),mul(mul(cx,cz),y),mul(mad(mul(cz,sx),cy,mul(sz,sy)),y)],
    [mul(mul(cx,sy),z),mul(-sx,z),mul(mul(cx,cy),z)],
  ];
  const basis=columns.flatMap(c=>[0,1,2].map(i=>mad(c[1],parent.basis[3+i],mad(c[0],parent.basis[i],mul(c[2],parent.basis[6+i])))));
  const scale=[0,3,6].map(i=>f(Math.sqrt(mad(basis[i+2],basis[i+2],mad(basis[i],basis[i],mul(basis[i+1],basis[i+1]))))));
  if(scale.some(v=>v<=0))throw Error('Degenerate Default basis requires a separate contract');
  const normalized=basis.map((v,i)=>{
    const norm=scale[Math.floor(i/3)];return Math.abs(f(norm-1))<f(.000001)||Math.abs(norm)<f(.000001)?v:mul(v,f(1/norm));
  });
  const m=normalized,trace=add(add(m[4],m[0]),m[8]);let quaternion;
  if(trace>2**-23){
    const k=f(.5/f(Math.sqrt(add(trace,1))));
    quaternion=[mul(k,sub(m[7],m[5])),mul(k,sub(m[2],m[6])),mul(k,sub(m[3],m[1])),f(.25/k)];
  }else{
    const i=m[0]>=m[4]&&m[0]>=m[8]?0:m[4]>=m[8]?1:2,j=(i+1)%3,k=(i+2)%3;
    const root=add(f(Math.sqrt(sub(sub(add(1,m[i*3+i]),m[j*3+j]),m[k*3+k]))),0);
    const s=add(root,root),inv=f(1/s);quaternion=[0,0,0,0];
    quaternion[i]=mul(s,.25);quaternion[j]=mul(inv,add(m[i*3+j],m[j*3+i]));
    quaternion[k]=mul(inv,add(m[i*3+k],m[k*3+i]));quaternion[3]=mul(inv,sub(m[k*3+j],m[j*3+k]));
  }
  return {basis,scale,quaternion,origin:projectNativeTranslation(local.translation,parent,arithmetic)};
}

// Verified X make-consumers broadcast the first joint scale, not all three axes.
// This is a writer-input boundary, not admission of any texture/material writer.
export function nativeParticleXMakeInputs({scalar,center,groupScale,rotationMode}={}) {
  if(!Number.isFinite(scalar)||scalar<0||!vector(center,3)||!vector(groupScale,3)
    ||groupScale.some(v=>v<=0)||rotationMode!=='Absent')throw Error('Explicit admitted Particle X make inputs required');
  return {center:[...center],localScale:[scalar,scalar,scalar],groupScale:[groupScale[0],groupScale[0],groupScale[0]],rotation:[0,0,0]};
}
