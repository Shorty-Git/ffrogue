import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {createEffectPlayer,presentationMembers,instances} from './original_effect_player.mjs';
import {scenePresentationAnchor,createPreparedSceneBridge} from '../src/effects/PreparedSceneBridge.mjs';
import {validateSceneManifest,validateSceneAction} from '../src/effects/sceneProfile.mjs';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const recipe={bindings:[...read('tools/presentations/cloud-review.json').bindings,...read('tools/presentations/cross-slash-import-test.json').bindings]};
const runtime=vm.createContext({console});vm.runInContext(fs.readFileSync('public/vendor/three-preview.js','utf8'),runtime);
const THREE=runtime.THREE;
THREE.TextureLoader=class{load(url,done){const texture=new THREE.Texture({width:1,height:1});queueMicrotask(()=>done(texture));return texture;}};
test('confirmed Cloud visual data identities require an explicit baseline review when changed',()=>{
 // Identity alarm complements frozen GPU frames, not native fidelity.
 // sword-color-20261101/baseline-browser.json: opt-in flat RGB, all3 frames unchanged.
 // delita-placement-20261101/baseline-browser.json: reviewed opt-in member RNG, all3 frames unchanged.
 const baseline={
  'src/effects/nativeDrawSubmission.mjs':'784bebcb4e37964a02f02bd04b1e18eabd3cf86aaea608986cbbf1b5e37b665d',
  // 2026-11-12: an untextured Particle with reviewed screen coverage is drawn (dimming/flash planes).
  // Review: tools/rebaseline_scenes.mjs over all 545 scenes; the three Cloud manifests below carry no
  // such coverage, their frames compare unchanged or ok against the baseline of e4e4f09f….
  'src/effects/originalEffectPlayer.mjs':'9070c7347f857bdda11c4b725bd9dbb330eaa026f2d29f4ab9656244ae6fb5e9',
  // Connected Particle packets: all three frozen GPU frames retain zero changed pixels.
  // Receipt: diagnostic-v35-render-context/browser-review-37.json; OneX admission preserves the Cloud frames.
  'src/effects/nativeLifecycle.mjs':'a72df9ee85e0c11e4cecc2d12208b462fcd5cd310ff83433dfe2a796fe0e00e2',
  // Accepted Cloud manifests pin their VISUAL data only (canonical JSON without audioSource, see
  // visualHash): sound can be admitted without touching the accepted picture. Brave Slash is the
  // composed/native-null variant approved on 2026-11-08; Blade Beam and Climhazzard gained their
  // recovered master sounds on 2026-11-08 with unchanged visual data. 2026-11-12: only
  // provenance.playerSha256 changed (player 103046af...); plans and effect data are byte-identical.
  'public/assets/presentations/cloud_brave_slash/manifest.json':'aa9f4a90cc9458bf164805cbbfa8ac94febc1c1e464567318c71864d2cec3d6a',
  'public/assets/presentations/cloud_blade_beam/manifest.json':'2df661c035ba64f244b5d8d485ada94f0cd17be7b0012ab42e2908740a0055b5',
  'public/assets/presentations/cloud_climhazzard/manifest.json':'41edfcff0dee8948159839390a65ee1a7e81551eab0d64f8ac57016e016f94cb',
 };
 const visualHash=file=>{const m=JSON.parse(fs.readFileSync(file,'utf8'));delete m.audioSource;return createHash('sha256').update(JSON.stringify(m)).digest('hex');};
 for(const [file,expected]of Object.entries(baseline))assert.equal(file.endsWith('manifest.json')?visualHash(file):hash(file),expected,
  'Visual baseline changed: review the frozen GPU comparison and document approval before updating identities: '+file);
});
for(const binding of recipe.bindings)test(binding.key+': published data and shared geometry retain the preserved preview',async()=>{
 const original=read(binding.plan),manifest=read(`public/assets/presentations/${binding.key}/manifest.json`);
 validateSceneManifest(manifest);
 validateSceneAction(manifest,{scope:original.presentation.scope,moveType:original.presentation.movement});
 assert.equal(manifest.provenance.planSha256,hash(binding.plan));
 assert.equal(manifest.provenance.playerSha256,hash('src/effects/originalEffectPlayer.mjs'));
 assert.equal(manifest.provenance.threeSha256,hash('public/vendor/three-preview.js'));
 const normalized=structuredClone(manifest.plan.effects);
 for(let i=0;i<normalized.length;i++){
  normalized[i].textures=original.effects[i].textures;
  for(const node of normalized[i].nodes)delete node.presentationCoverage;
  for(const url of Object.values(manifest.plan.effects[i].textures))assert.equal(hash('public'+url),url.match(/([a-f0-9]{64})\.png$/)[1]);
 }
 assert.deepEqual(normalized,original.effects,'Models, source modules, materials and transforms must not be selectively rewritten');
 assert.deepEqual(manifest.plan.members,original.members,'Motion-1 member starts and all source member parameters are retained');
 const counts=original.presentation.scope==='all_enemies'?[1,2,3]:[1];
 for(const count of counts){
  const keys=Array.from({length:count},(_,i)=>'target'+i),host={width:1000,height:1100,arena:{x:0,y:48,width:1000,height:752},caster:{x:270,y:566},
   targets:Object.fromEntries(keys.map((key,i)=>[key,{x:190+i*65,y:560+i*90}])),
   units:Object.fromEntries(keys.map(key=>[key,{frameWidth:160,frameHeight:180,pivotX:.5,pivotY:.85,scale:2}]))};
  const prepare=plan=>({...plan,members:presentationMembers(plan.members,keys,plan.presentation.scope)});
  const roles=prepare(manifest.plan).members.flatMap(member=>instances(manifest.plan.effects[member.effect],manifest.plan.seed,manifest.plan.effectHorizon)
    .map(item=>manifest.plan.effects[member.effect].nodes[item.node].presentationCoverage));
  const expectedScene=new THREE.Scene(),actualScene=new THREE.Scene();
  const expected=await createEffectPlayer(THREE,expectedScene,prepare(original)),actual=await createEffectPlayer(THREE,actualScene,prepare(manifest.plan));
  for(const frame of [0,3,6,24,30,35,60,120,180,200]){
   for(const [player,plan]of [[expected,original],[actual,manifest.plan]])player.update(frame,
    member=>scenePresentationAnchor(member,host,plan),{x:-500,y:-250,width:1000,height:752});
   const before=expected.traceSnapshot(),after=actual.traceSnapshot();
   after.forEach((row,i)=>{
    if(!roles[i])return;
    if(row.visible){
     const xs=row.worldVertices.map(v=>v[0]),ys=row.worldVertices.map(v=>v[1]);
     assert.ok(Math.abs(Math.min(...xs)+500)<.001&&Math.abs(Math.max(...xs)-500)<.001);
     assert.ok(Math.abs(Math.min(...ys)+250)<.001&&Math.abs(Math.max(...ys)-502)<.001);
    }
    row.worldVertices=before[i].worldVertices;
   });
   assert.deepEqual(after,before,`Non-flash state/geometry remains unchanged: frame${frame}, targets${count}`);
  }
  expected.dispose();actual.dispose();assert.equal(expectedScene.children.length,0);assert.equal(actualScene.children.length,0);
 }
});

test('prepared action admission rejects scope/movement mismatch independently of skill identity',()=>{
 const manifest=read('public/assets/presentations/cloud_brave_slash/manifest.json');
 for(const action of [{scope:'party',moveType:'dash'},{scope:'all_enemies',moveType:'dash'},
   {scope:'single_enemy',moveType:'stationary'}])assert.throws(()=>validateSceneAction(manifest,action),/scope\/movement/);
});

test('bridge completion follows its effect clock once; stop/shutdown never complete an obsolete action',async()=>{
 const previous=globalThis.THREE;let externs=0;
 // Real prepared player/geometry, with only the GPU boundary replaced. No pixel claim.
 let warmed=0;
 globalThis.THREE={...THREE,WebGLRenderer:class{dispose(){}resetState(){}initTexture(){}compile(){warmed++;}setRenderTarget(){}setViewport(){}setScissor(){}setScissorTest(){}render(){}}};
 const gl={getParameter:()=>[0,0,0,0],isEnabled:()=>false,bindFramebuffer(){},viewport(){},scissor(){},enable(){},disable(){}};
 const events=new EventEmitter(),scene={events,scale:{width:1000,height:1100},time:{timeScale:.5},
  game:{canvas:{},renderer:{gl,width:1000,height:1100}},add:{extern:()=>{const e={setDepth(){return this;},destroy(){externs++;}};layers.push(e);return e;}}};
 const layers=[],renderPass=()=>{for(const layer of layers)layer.render(null,{zoom:1,rotation:0},{tx:0,ty:0});};
 let bridge;
 try{
  const manifest=read('public/assets/presentations/cloud_brave_slash/manifest.json');
  bridge=createPreparedSceneBridge(scene,[manifest]);await bridge.ready;
  const host={width:1000,height:1100,arena:{x:0,y:48,width:1000,height:752},caster:{x:800,y:500},
   targets:{target0:{x:190,y:500}},units:{target0:{frameWidth:66,frameHeight:68,pivotX:.5,pivotY:.8,scale:2}}};
  let completed=0;bridge.play(manifest.key,host,()=>completed++);
  const duration=manifest.durationFrames*1000/60;
  // A first play holds its clock until its first render pass has warmed the variant (both layers).
  events.emit('update',0,16);assert.equal(bridge.snapshot().frame,0);assert.equal(warmed,0);
  renderPass();assert.equal(warmed,2);assert.deepEqual(bridge.snapshot().errors,[]);
  // One update never advances the scene clock by more than 100 ms (x timeScale .5 = 3 frames).
  events.emit('update',0,5000);assert.equal(bridge.snapshot().frame,3);
  for(let t=100;t<2*(duration-1);t+=100)events.emit('update',0,Math.min(100,2*(duration-1)-t));
  assert.equal(completed,0);assert.equal(bridge.snapshot().active,true);
  events.emit('update',0,4);assert.equal(completed,1);assert.equal(bridge.snapshot().active,false);
  events.emit('update',0,duration*2);assert.equal(completed,1);
  bridge.play(manifest.key,host,()=>completed++);renderPass();assert.equal(warmed,2,'a warmed variant is not compiled again');bridge.stop();events.emit('update',0,duration*2);assert.equal(completed,1);
  bridge.play(manifest.key,host,()=>completed++);events.emit('shutdown');events.emit('update',0,duration*2);
  assert.equal(completed,1);assert.equal(bridge.snapshot().variants,0);assert.equal(externs,2);
  assert.equal(events.listenerCount('update'),0);assert.equal(events.listenerCount('shutdown'),0);
 }finally{bridge?.destroy();globalThis.THREE=previous;}
});
test('experimental admission never converts unverified data into a fidelity claim',()=>{
 const original=read('public/assets/presentations/cloud_brave_slash/manifest.json');
 for(const changes of [{quality:'native'},{originalFidelityVerified:true},{profile:'future-unknown'},{durationFrames:0}])
  assert.throws(()=>validateSceneManifest({...original,...changes}));
 const modified=structuredClone(original);modified.plan.effects[0].textures.any='http://unreviewed.example/image.png';
 assert.throws(()=>validateSceneManifest(modified));
 const unknownNode=structuredClone(original);unknownNode.plan.effects[0].nodes[0].typeId=99;
 assert.throws(()=>validateSceneManifest(unknownNode),/node family/);
 const model=structuredClone(original);model.plan.effects[0].meshes={};
 assert.throws(()=>validateSceneManifest(model),/model geometry/);
 for(const change of [{approachFrames:-1},{approachFrames:0},{returnFrames:0},{targetOffsetX:null}]){
  const bad=structuredClone(original);Object.assign(bad.plan.presentation,change);
  assert.throws(()=>validateSceneManifest(bad),/choreography/);
 }
});
