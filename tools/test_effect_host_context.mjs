import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateEffectHostContext,effectHostPlacement,effectHostProject,effectHostRaster,effectHostMemberAnchor} from './original_effect_player.mjs';
import {exportEffectHost} from './memorial/export_effect_host.mjs';

function fixture(){return {schemaVersion:1,coordinateSystem:'ffbe-screen-api',
  engineScreen:{width:8,height:8,geometryScale:2},
  camera:{viewMatrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],projectionMatrix:[.25,0,0,0,0,.25,0,0,0,0,-1,0,-1,-1,0,1]},
  framebuffer:{width:10,height:10,viewport:[1,2,4,4],scissorEnabled:true,scissorBox:[2,3,2,2]}};}

test('engine Y conversion is independent of camera and framebuffer dimensions',()=>{
  const context=fixture(),placement={axisModes:[2,2],offset:[0,1]},rect={x:0,y:0,width:8,height:4};
  const point=effectHostPlacement(context,placement,rect,[0,0]);
  assert.deepEqual(point,{api:{x:4,y:3},world:{x:4,y:5,z:0},geometryScale:2});
  const changed=structuredClone(context);changed.framebuffer.height=20;changed.camera.projectionMatrix[5]=.125;
  assert.deepEqual(effectHostPlacement(changed,placement,rect,[0,0]),point);
  changed.engineScreen.geometryScale=3;
  assert.deepEqual(effectHostPlacement(changed,placement,rect,[0,0]).world,point.world);
});

test('randomized source axes require explicit scatter rather than silently inventing native randomness',()=>{
  const c=fixture(),rect={x:0,y:0,width:8,height:4};
  assert.throws(()=>effectHostPlacement(c,{axisModes:[2,2],offset:[0,0]},rect),/Explicit host scatter/);
  assert.deepEqual(effectHostPlacement(c,{axisModes:[5,6],offset:[0,0]},rect).api,{x:4,y:4});
  assert.throws(()=>effectHostPlacement(c,{axisModes:[0,2],offset:[0,0]},rect,[0,0]),/Unsupported source/);
});

test('physical viewport projection and canvas Y conversion each happen once',()=>{
  const c=fixture(),p=effectHostProject(c,{x:2,y:2,z:0});
  assert.deepEqual(p.gl,{x:2,y:3});assert.deepEqual(p.canvas,{x:2,y:7});
  assert.equal(p.insideViewport,true);assert.equal(p.insideScissor,true);assert.equal(p.insideDepthClip,true);
  assert.equal(effectHostProject(c,{x:0,y:0,z:0}).insideScissor,false);
  assert.equal(effectHostProject(c,{x:8,y:8,z:0}).insideViewport,false);
  assert.equal(effectHostProject(c,{x:2,y:2,z:2}).insideDepthClip,false);
});

test('scissor intersects viewport/framebuffer and remains separate from placement',()=>{
  const c=fixture();assert.deepEqual(effectHostRaster(c).clipCanvas,{x:2,y:5,width:2,height:2});
  c.framebuffer.scissorEnabled=false;
  assert.deepEqual(effectHostRaster(c).clipGL,{x:1,y:2,width:4,height:4});
  c.framebuffer.scissorEnabled=true;c.framebuffer.scissorBox=[-5,-5,20,20];
  assert.deepEqual(effectHostRaster(c).clipGL,{x:1,y:2,width:4,height:4});
  c.framebuffer.scissorBox=[0,0,0,0];
  assert.equal(effectHostRaster(c).clipCanvas.width,0);
});

test('unsupported camera conventions and invalid host fields fail explicitly',()=>{
  for(const mutate of [c=>c.camera.viewMatrix[12]=1,c=>c.camera.projectionMatrix[11]=-1,
    c=>c.camera.projectionMatrix[5]=NaN,c=>c.engineScreen.height=0,
    c=>c.framebuffer.viewport[2]=0,c=>c.framebuffer.scissorEnabled=undefined]){
    const c=fixture();mutate(c);assert.throws(()=>validateEffectHostContext(c));
  }
});

test('bound member anchors use explicit native rectangles and XY-only member scale without double global scaling',()=>{
  const context=fixture(),member={scalePercent:200,placement:{rectangle:'screen',axisModes:[2,2],offset:[0,1]}};
  const bindings={schemaVersion:1,memberScaleAxes:'xy',rectangles:{screen:{x:0,y:0,width:8,height:4}},scatter:[0,0]};
  assert.deepEqual(effectHostMemberAnchor(context,member,bindings),{x:4,y:5,z:0,rootScale:[4,4,2]});
  const scaled=effectHostMemberAnchor(context,{...member,scalePercent:50},bindings);
  assert.deepEqual([scaled.x,scaled.y],[4,5]);assert.deepEqual(scaled.rootScale,[1,1,2]);
  assert.throws(()=>effectHostMemberAnchor(context,{...member,placement:{...member.placement,rectangle:'target-unit'}},bindings),/Missing host rectangle/);
  assert.throws(()=>effectHostMemberAnchor(context,member,{...bindings,scatter:undefined}),/Explicit host scatter/);
  assert.throws(()=>effectHostMemberAnchor(context,member,{...bindings,memberScaleAxes:'guess'}),/supported effect host bindings/);
});

test('measured host export reproduces captured placement/root while retaining all three height domains',t=>{
  const file='tools/data/memorial-audit/pipeline-v23-20261025/clim-audit.json';
  if(!fs.existsSync(file)){t.skip('Optional calibrated local capture required');return;}
  const audit=JSON.parse(fs.readFileSync(file)),name='eff_strobe_white_a50_f30';
  const context=exportEffectHost(audit,name,'0'.repeat(64));
  assert.equal(context.engineScreen.height,1100);assert.equal(context.framebuffer.height,1920);
  assert.ok(Math.abs(2/context.camera.projectionMatrix[5]-1136)<.001);
  const root=effectHostPlacement(context,{axisModes:[2,2],offset:[0,150]},
    {x:0,y:0,width:640,height:666},[-4,-7]);
  const captured=audit.drawContexts.filter(r=>r.file===name);
  assert.equal(captured.length,6);
  for(const row of captured)assert.deepEqual([root.world.x,root.world.y,root.world.z],row.animationPosition);
  assert.deepEqual(effectHostRaster(context).clipCanvas,{x:0,y:63,width:1080,height:1856});
  const before=JSON.stringify(audit);effectHostProject(context,root.world);assert.equal(JSON.stringify(audit),before);
  const mixed=structuredClone(audit);mixed.nativeSubmissions.filter(s=>s.returned.file===name)[1].observedGpuCalls[0].scissorBox[3]--;
  assert.throws(()=>exportEffectHost(mixed,name,'0'.repeat(64)),/Mixed host/);
  const missing=structuredClone(audit);missing.drawContexts=missing.drawContexts.filter(r=>r.file!==name);
  assert.throws(()=>exportEffectHost(missing,name,'0'.repeat(64)),/Exact GPU/);
  assert.throws(()=>exportEffectHost(audit,'unknown-effect','0'.repeat(64)),/No observed/);
});
