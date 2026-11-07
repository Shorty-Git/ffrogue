// Compare actual live writer buffers with independently evaluated prepared branches.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {evaluateNativeSourceBranches} from '../src/effects/nativeSourceBranches.mjs';
import {compareLifecycleEvents} from './lib/lifecycle-comparison.mjs';

const [tracePath,programPath,outputPath]=process.argv.slice(2);
if(!outputPath)throw Error('Usage: node tools/compare_native_writer_trace.mjs TRACE PROGRAM OUTPUT');
const traceBytes=fs.readFileSync(tracePath),programBytes=fs.readFileSync(programPath);
const rows=traceBytes.toString().trim().split('\n').map(JSON.parse),program=JSON.parse(programBytes);
const start=rows.find(r=>r.type==='capture-start'),end=rows.findLast(r=>r.type==='capture-end');
if(start?.sourceSha256!==program.sourceSha256||!end||end.reason!=='native-wrapper-destroy'||end.missingHooks?.length)
 throw Error('Source mismatch or incomplete native reference');
const writers=rows.filter(r=>r.type==='writer-leave');
if(!writers.length)throw Error('No actual live writer outputs');
const root=program.branches[0]?.ancestors[0]?.node.index;
const hostRows=rows.filter(r=>r.type==='module-enter'&&r.node===root&&r.before?.parentInputs);
if(!hostRows.length)throw Error('Missing external root pose observations');
const hosts=hostRows.map(r=>({scale:r.before.parentInputs.scale,origin:r.before.parentInputs.origin}));
if(hosts.some(h=>JSON.stringify(h)!==JSON.stringify(hosts[0])))throw Error('This comparator requires a constant measured external root pose');
const scene=hosts[0],records=new Map(),particles=new Set((program.particleBranches??[]).map(p=>p.node.index));
for(const r of rows)if(r.type==='module-enter'&&particles.has(r.node)&&r.candidates?.[0]?.stage==='init'){
 const key=r.node+':'+r.before.record;if(!records.has(key))records.set(key,[...records.keys()].filter(k=>k.startsWith(r.node+':')).length);
}
function instance(r){
 if(!particles.has(r.node))return 0;
 const key=r.node+':'+r.record;if(!records.has(key))throw Error('Writer record has no captured initialization');
 return records.get(key);
}
const original=writers.map(r=>{
 if(![40,64].includes(r.stride))throw Error('Unsupported packed vertex stride');
 const b=Buffer.from(r.packed,'hex');if(b.length!==6*r.stride)throw Error('Incomplete writer buffer');
 const vertices=Array.from({length:6},(_,i)=>{
  const at=i*r.stride,f=(offset,count)=>Array.from({length:count},(_,j)=>b.readFloatLE(at+offset+4*j));
  return {position:f(0,3),rgba:[...b.subarray(at+12,at+16)],uv:f(16,2),textureTint:f(24,4),
   ...(r.stride===64?{uv2:f(40,2),textureTint2:f(48,4)}:{})};
 });
 return {seq:r.seq,frame:r.frame,node:r.node,instance:instance(r),type:'render-packet',vertices,
  context:{parentState:r.renderInputs,record:r.record,writer:r.writer}};
});
const lastFrame=Math.max(...rows.map(r=>r.frame??0)),simulated=[];
for(let frame=1;frame<=lastFrame;frame++)for(const r of evaluateNativeSourceBranches(program,frame,scene))if(r.packet)
 simulated.push({frame,node:r.packet.node,instance:r.packet.instance??0,type:'render-packet',vertices:r.packet.vertices,
  context:{parentState:r.parentState??null,rng:r.rng??null}});
const comparison=compareLifecycleEvents(original,simulated);
for(const d of comparison.differences)d.probableCause=d.fields.length&&d.fields.every(f=>/^vertices\.\d\.position\.[012]$/.test(f.field))?
 'Position arithmetic residual; inspect strict float32 ULP and absolute deltas, not a visual-fidelity approval':d.probableCause;
const distinct=key=>[...new Map(writers.map(r=>[JSON.stringify(r.renderInputs[key]),r.renderInputs[key]])).values()];
const result={schema:'ffrogue-live-writer-comparison-v1',
 source:{tracePath,traceSha256:createHash('sha256').update(traceBytes).digest('hex'),programPath,
  programSha256:createHash('sha256').update(programBytes).digest('hex'),sourceSha256:program.sourceSha256},
 externalInputs:{scene,initialSeeds:'Prepared from measured emitter initial RNG states; seed construction is not reconstructed',
  renderContext:'Prepared draw basis/full trims/neutral layer tints compared below, not injected from native intermediate matrices'},
 observations:{frames:lastFrame,writerCalls:writers.length,particleRecords:records.size,
  byNode:Object.fromEntries([...new Set(writers.map(r=>r.node))].map(n=>[n,writers.filter(r=>r.node===n).length])),
  drawBases:distinct('drawBasis'),trim1:distinct('trim1'),trim2:distinct('trim2'),textureTint:distinct('textureTint'),textureTint2:distinct('textureTint2'),
  writerOrder:original.map(r=>[r.frame,r.node,r.instance])},
 comparison,nativeComputedIntermediatesSupplied:false,nativePixelsCompared:false,completeSourceSupported:false};
fs.writeFileSync(outputPath,JSON.stringify(result,null,2));
console.log(JSON.stringify({outputPath,frames:lastFrame,actualWriters:writers.length,exactPackets:comparison.matchedEvents,
 differences:comparison.differences.map(d=>({frame:d.frame,node:d.originalEvent?.node,instance:d.instance,fields:d.fields.length,
  maxAbsolute:Math.max(...d.fields.map(f=>f.numericPrecision?.absoluteDifference??0))}))},null,2));
if(comparison.differences.some(d=>!d.fields.length||d.fields.some(f=>!/^vertices\.\d\.position\.[012]$/.test(f.field)||f.numericPrecision?.absoluteDifference>.00006103515625)))process.exitCode=1;
