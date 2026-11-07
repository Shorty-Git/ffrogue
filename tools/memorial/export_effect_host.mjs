// Export a measured scene contract, not a skill-specific placement override.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {validateEffectHostContext,rendererGeometryScale} from '../original_effect_player.mjs';

const nativeSha='6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function exportEffectHost(audit,file,auditSha256){
  if(audit.boot?.nativeSha256!==nativeSha||audit.boot.observerRevision<23||audit.arm?.pipelineNativeSubmit!==true
    ||!Array.isArray(audit.errors)||audit.errors.length||!/^[a-f0-9]{64}$/.test(audit.logSha256??''))throw Error('A clean pinned native submission audit is required');
  const refs=audit.rendererReferences;
  if(!Array.isArray(refs)||refs.length!==1)throw Error('One measured renderer reference required');
  const reference=refs[0],geometryScale=rendererGeometryScale(reference);
  const selected=audit.nativeSubmissions.filter(s=>s.returned.file===file&&s.returned.kind==='auto-index'&&s.observedGpuCalls.length);
  if(!selected.length)throw Error('No observed native/GL pairs for requested file');
  let context=null;
  const drawIds=[];
  for(const submission of selected){
    const {enter,returned,observedGpuCalls}=submission;
    if(observedGpuCalls.length!==1)throw Error('Ambiguous native/GL submission');
    const gpu=observedGpuCalls[0],camera=returned.rootAfterReturn?.camera;
    if(gpu.framebuffer!==0||!camera?.viewport||camera.viewport.length!==2)throw Error('Default framebuffer dimensions must be measured');
    if(!['file','wrapper','drawId'].every(k=>enter[k]===returned[k]&&gpu[k]===returned[k])||!(enter.seq<gpu.seq&&gpu.seq<returned.seq))throw Error('Native/GL identity or sequence mismatch');
    const joins=audit.gpu.filter(row=>row.draw.seq===gpu.seq&&row.exactContextMatches===1);
    const roots=audit.drawContexts.filter(row=>row.file===gpu.file&&row.wrapper===gpu.wrapper&&row.drawId===gpu.drawId&&row.capturePoint==='actual-gpu-call');
    if(joins.length!==1||roots.length!==1||JSON.stringify(roots[0].camera)!==JSON.stringify(camera))throw Error('Exact GPU/root camera join required');
    const next={schemaVersion:1,coordinateSystem:'ffbe-screen-api',
      engineScreen:{width:reference.screenWidth,height:reference.screenHeight,geometryScale},
      camera:{viewMatrix:camera.viewMatrix,projectionMatrix:camera.projectionMatrix},
      framebuffer:{width:camera.viewport[0],height:camera.viewport[1],viewport:gpu.viewport,
        scissorEnabled:gpu.scissorEnabled,scissorBox:gpu.scissorBox}};
    validateEffectHostContext(next);
    if(context&&JSON.stringify(context)!==JSON.stringify(next))throw Error('Mixed host states require separate contracts');
    context=next;drawIds.push(gpu.drawId);
  }
  return {...context,evidence:{nativeSha256:nativeSha,auditSha256,sourceLogSha256:audit.logSha256,
    observerRevision:audit.boot.observerRevision,token:audit.arm.token,file,drawIds,
    observedPlacements:audit.placement.filter(r=>r.executionId!==undefined).map(r=>({groupId:r.groupId,category:r.categoryInput,rectangle:r.rectangle})),
    limits:['Scene inputs only; source rectangles must be explicitly bound by the caller.',
      'No original foreground, random scheduling, source geometry or pixel fidelity is inferred.']}};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const args=process.argv.slice(2),value=flag=>args[args.indexOf(flag)+1];
  if(!['--audit','--file','--output'].every(f=>args.includes(f)&&value(f)))throw Error('Usage: --audit receipt.json --file effect-basename --output host.json');
  const stage=path.resolve('tools/data');
  const resolve=file=>{const full=path.resolve(file),rel=path.relative(stage,full);if(rel.startsWith('..')||path.isAbsolute(rel))throw Error('Host research files must stay in tools/data');return full;};
  const bytes=fs.readFileSync(resolve(value('--audit'))),result=exportEffectHost(JSON.parse(bytes),value('--file'),digest(bytes));
  fs.writeFileSync(resolve(value('--output')),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({engineScreen:result.engineScreen,framebuffer:result.framebuffer,draws:result.evidence.drawIds.length}));
}
