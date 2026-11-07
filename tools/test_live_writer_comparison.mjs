import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

test('live writer comparison preserves actual differences and rejects missing reference boundaries',t=>{
 const base='tools/data/memorial-audit/diagnostic-v35-render-context/';
 if(!fs.existsSync(base+'run-i.jsonl')){t.skip('Optional controlled native runI not available');return;}
 const rows=fs.readFileSync(base+'run-i.jsonl','utf8').trim().split('\n').map(JSON.parse);
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'ffrogue-writer-'));
 try{
  const trace=path.join(temporary,'trace.jsonl'),output=path.join(temporary,'diff.json');
  function compare(input){
   fs.writeFileSync(trace,input.map(r=>JSON.stringify(r)).join('\n'));
   return spawnSync(process.execPath,['tools/compare_native_writer_trace.mjs',trace,base+'program-i.json',output],{encoding:'utf8'});
  }
  const valid=compare(rows);assert.equal(valid.status,0,valid.stderr);
  const receipt=JSON.parse(fs.readFileSync(output));assert.equal(receipt.comparison.matchedEvents,180);
  assert.deepEqual(receipt.comparison.differences.map(d=>[d.frame,d.instance]),[[1,1],[2,7]]);
  assert.equal(receipt.nativeComputedIntermediatesSupplied,false);assert.equal(receipt.nativePixelsCompared,false);
  const incomplete=compare(rows.filter(r=>r.type!=='capture-end'));
  assert.notEqual(incomplete.status,0);assert.match(incomplete.stderr,/incomplete native reference/);
  const changed=structuredClone(rows),writer=changed.find(r=>r.type==='writer-leave');
  const packed=Buffer.from(writer.packed,'hex');packed.writeFloatLE(.25,16);writer.packed=packed.toString('hex');
  const badUv=compare(changed);assert.equal(badUv.status,1);
  const difference=JSON.parse(fs.readFileSync(output)).comparison.firstDivergence;
  assert.equal(difference.originalEvent.node,2);assert.equal(difference.fields[0].field,'vertices.0.uv.0');
  assert.equal(difference.originalEvent.vertices[0].uv[0],.25);assert.equal(difference.simulatorEvent.vertices[0].uv[0],0);
 }finally{fs.rmSync(temporary,{recursive:true,force:true});}
});
