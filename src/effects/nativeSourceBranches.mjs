// Shared bounded packet traversal; ordinary preview playback remains unchanged.
import {evaluateNativeQuadBranches} from './nativeQuadGraph.mjs';
import {NativeParticleBranch,validateNativeParticleBranch} from './nativeParticleBranch.mjs';
import {evaluateStaticBasicBranch,validateStaticBasicBranch} from './nativeStaticBasicBranch.mjs';
export function nativeBranchSlots(program) {
  const slots=program.branches.map(p=>({program:p,instance:0,kind:'Quad'}));
  for(const p of program.particleBranches??[]){
    validateNativeParticleBranch(p);
    const capacity=p.parent.generation.count*p.parent.generation.duration;
    for(let instance=0;instance<capacity;instance++)slots.push({program:p,instance,kind:'Particle'});
  }
  for(const p of program.staticBasicBranches??[]){validateStaticBasicBranch(p);slots.push({program:p,instance:0,kind:'StaticBasic'});}
  return slots;
}
export function evaluateNativeSourceBranches(program,frame,scene) {
  const result=evaluateNativeQuadBranches(program,frame,scene);
  for(const p of program.particleBranches??[]){
    const branch=new NativeParticleBranch(p,scene);let output=[];
    for(let i=0;i<frame;i++)output=branch.step();
    const capacity=p.parent.generation.count*p.parent.generation.duration;
    for(let instance=0;instance<capacity;instance++)result.push(output[instance]??{packet:null});
  }
  for(const p of program.staticBasicBranches??[])result.push(evaluateStaticBasicBranch(p,frame,scene));
  return result;
}
