import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nullInitializationFlags,nullFlagsFromSource} from './lib/null-initialization.mjs';
const reference=JSON.parse(fs.readFileSync('tools/data/reconstruction-map/null-initialization-flags.json','utf8'));

test('successful-child Null initialization flag arithmetic matches 160 original block controls',()=>{
  assert.equal(reference.nativeSha256,'6c7e501c98939581528df3d712ff1f58afcfd392160f1e71ef1f903d49926b77');
  assert.equal(reference.cases.length,160);
  assert.equal(reference.staticDataflow.initContext5cBit15,'NodeTree+0x15');
  assert.equal(reference.staticDataflow.initContext60Byte,'NodeTree+0x16');
  assert.ok(reference.staticDataflow.quadChildBranch.targets.some(s=>s.name.includes('QuadTraits')));
  for(const c of reference.cases)assert.deepEqual(nullInitializationFlags(c.inputs),c.result);
});

test('original BMB initialization inputs bind to explicit parent/child context without defaults',()=>{
  for(const file of ['white-inputs.json','blade-inputs.json']){
  const input=JSON.parse(fs.readFileSync('tools/data/import-decision-20261028/'+file,'utf8'));
  const rows=reference.sourceFields.filter(n=>n.sourceSha256===input.sourceSha256);
  assert.equal(rows.length,file==='white-inputs.json'?4:7);
  for(const row of rows){
    const original=input.nodes.find(n=>n.index===row.node).initialization;
    assert.deepEqual(original.parameters,row.fields);
    const cases=reference.cases.filter(c=>Object.entries(row.fields).every(([k,v])=>c.inputs[k]===v));
    assert.ok(cases.length>0);
    for(const c of cases)
      assert.deepEqual(nullFlagsFromSource(original,c.inputs),c.result);
    assert.throws(()=>nullFlagsFromSource(original),/Explicit bounded/);
    assert.notEqual(nullFlagsFromSource(original,{parent_flags:0,child_flags:0}).auxiliaryFlag,
      nullFlagsFromSource(original,{parent_flags:0,child_flags:0x8000}).auxiliaryFlag);
  }
  }
  assert.throws(()=>nullFlagsFromSource({profile:'native-null-init-inputs-v1',status:'unsupported-inputs'}));
});

test('the exact source locator and inheritance fields do not determine auxiliary selection without child context',()=>{
  const nodes=reference.sourceFields.filter(n=>n.sourceSha256==='32c66c01d93f64f2fb67a5c0580bb62f2622b1a56a1e36e55210594e10b07de9');
  assert.equal(nodes.length,4);
  for(const n of nodes){
    assert.equal(n.actualParentFlags,null);assert.equal(n.actualChildFlags,null);
    assert.equal(nullInitializationFlags({...n.fields,parent_flags:0,child_flags:0}).auxiliaryFlag,0);
    assert.equal(nullInitializationFlags({...n.fields,parent_flags:0,child_flags:0x8000}).auxiliaryFlag,1);
  }
  for(const input of [{},{locator_index:1,field_c8:0,field_cc:1,parent_flags:0,child_flags:-1}])
    assert.throws(()=>nullInitializationFlags(input));
});
