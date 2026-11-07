import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=ts.createSourceFile('native_export_probe.js',fs.readFileSync(new URL('./native_export_probe.js',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
let validate;
function find(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='validate')validate=vm.runInNewContext('('+node.getText(source)+')');ts.forEachChild(node,find);}
find(source);
const request=()=>({token:'native-proof-1',creationMode:'game-factory',files:['atk_impact_001_pink.bmb','atk_aerialslash_001_green.bmb'],frames:[6,18,36],repeats:2});

test('two distinct native effects use the same bounded request contract',()=>{
  const config=request();assert.equal(validate(config),config);
});

test('unsafe paths, unknown sources and unbounded or unordered stepping reject before native execution',()=>{
  for(const patch of [{token:'../escape'},{files:['unknown.bmb']},{frames:[18,6]},{frames:[6,6]},
    {frames:[91]},{frames:[]},{frames:[0,1,2,3,4,5]},{repeats:3},{repeats:0},{creationMode:'implicit-fallback'}])
    assert.throws(()=>validate({...request(),...patch}),/Invalid bounded/);
});

test('controlled live source mode requires an explicit one-shot state-only substitution',()=>{
 const input={token:'live-source',creationMode:'live-source',files:['atk_slash1_white.bmb'],frames:[0],repeats:1,stateOnly:true,from:'atk_slash3_green'};
 assert.equal(validate(input),input);
 assert.equal(validate({...input,fixedDelta:1}).fixedDelta,1);
 assert.throws(()=>validate({...input,fixedDelta:.5}),/unit-step/);
 for(const patch of [{from:'arbitrary'},{stateOnly:false},{repeats:2},{files:['atk_impact_001_pink.bmb']}])assert.throws(()=>validate({...input,...patch}));
});
