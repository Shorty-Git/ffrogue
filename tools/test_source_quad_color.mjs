import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {NativeRandom} from '../src/effects/nativeLifecycle.mjs';
import {initializeFlatQuadColor,sampleFlatQuadColor,validateFlatQuadColor} from '../src/effects/sourceQuadColor.mjs';
import {validateSceneManifest} from '../src/effects/sceneProfile.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));
const input=(value,range)=>({profile:'native-flat-quad-rgb-v1',flat:true,mode:'Constant',value,range});

test('RGB-only Quad initialization reproduces retained original InitConstFlat records',()=>{
 const reference=read('tools/data/memorial-audit/quad-render-integration/native-quad-writers.json');
 const programs=read('tools/data/connected-effect/quad-branch-program.json');
 for(const row of reference.cases){
  const program=programs.branches.find(b=>b.node.index===row.node);
  const chain=row.result.chain,target=chain.rngAfterInit;
  // Locate the independently recorded color-entry RNG from the known native
  // chain's first-module state and final state, retaining the preceding draws.
  const rng=new NativeRandom(row.firstModuleSeed),history=[rng.snapshot().words];
  while(JSON.stringify(rng.words)!==JSON.stringify(target)&&history.length<100){rng.nextWord();history.push(rng.snapshot().words);}
  assert.deepEqual(rng.words,target);
  const colorRng=new NativeRandom(history.at(-4));
  const actual=initializeFlatQuadColor(input(program.color.value,program.color.range),colorRng);
  const raw=Buffer.from(chain.initialRecordHex,'hex');
  const expected=[0,1,2].map(i=>raw.readFloatLE(chain.initCursors.at(-1)-12+4*i));
  assert.deepEqual(actual,expected);assert.deepEqual(colorRng.words,target);
  assert.equal(colorRng.draws,3);
 }
});

test('source RGB samples vary per instance without consuming the transform RNG or multiplying alpha',()=>{
 const source=input([1,.4,.05],[.17,.17,.17]),before=JSON.stringify(source);
 const colors=Array.from({length:9},(_,i)=>sampleFlatQuadColor(source,123,i));
 assert.equal(new Set(colors.map(c=>c.join(','))).size,9);
 assert.deepEqual(sampleFlatQuadColor(source,123,3),colors[3]);
 assert.notDeepEqual(sampleFlatQuadColor(source,124,3),colors[3]);
 assert.equal(JSON.stringify(source),before);
 assert.ok(colors.flat().every(v=>v>=0&&v<=1));
 assert.deepEqual(sampleFlatQuadColor(input([1,.4065420627593994,0],[0,0,0]),123,1),[1,.4065420627593994,0]);
 for(const change of [{mode:'Curve'},{flat:false},{profile:'unknown'},{range:[-1,0,0]},{value:[1,NaN,0]}])
  assert.throws(()=>validateFlatQuadColor({...source,...change}));
});

test('published color admission rejects missing policy, curves and competing RGBA paths',()=>{
 const manifest=read('public/assets/presentations/delita_cunning_hero_sword/manifest.json');
 validateSceneManifest(manifest);
 const node=m=>m.plan.effects[0].nodes.find(n=>n.flatQuadColor);
 for(const mutate of [m=>delete m.plan.flatQuadColors,m=>m.plan.flatQuadColors.randomness='guessed-native-seed',
   m=>node(m).flatQuadColor.mode='Curve',m=>node(m).quadColors={}]){
  const bad=structuredClone(manifest);mutate(bad);assert.throws(()=>validateSceneManifest(bad));
 }
 assert.equal(manifest.plan.flatQuadColors.randomness,'reviewed-color-streams-v1');
 assert.ok(manifest.plan.effects[0].nodes.filter(n=>n.flatQuadColor).every(n=>n.appearance.color.supported));
});
