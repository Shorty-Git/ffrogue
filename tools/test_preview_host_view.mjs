import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {previewHostView,hostForegroundRegions,presentationAnchor} from './original_effect_player.mjs';

for(const path of ['tools/preview_original_skill.html','tools/preview_bound_effect_host.html','tools/preview_connected_effect.html','tools/test-source-scene.html'])test(`${path} inline module parses`,()=>{
  const html=fs.readFileSync(path,'utf8');
  const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:script,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});

test('host coordinate conversions retain actor pixels under different camera centers',()=>{
  const actor={x:310,y:440},enemies={center:{x:120,y:390}};
  for(const view of [previewHostView('legacy'),previewHostView('game'),previewHostView('game',{width:640,height:1136})]){
    const point=presentationAnchor({anchor:'target'},actor,enemies,'center',undefined,view);
    assert.equal(point.x+view.width/2,enemies.center.x);
    assert.equal(view.height/2-point.y,enemies.center.y-50);
  }
  assert.deepEqual(presentationAnchor({anchor:'caster'},actor,enemies,'center'),{x:-190,y:10});
});

test('game host declares foreground separately from the unchanged world view',()=>{
  const game=previewHostView('game'),before=structuredClone(game);
  const regions=hostForegroundRegions(game,{arena:{y:48},partyTop:800});
  assert.deepEqual(regions,[{role:'header',x:0,y:0,width:1000,height:48},{role:'dock',x:0,y:800,width:1000,height:300}]);
  assert.deepEqual(game,before);
  assert.deepEqual(hostForegroundRegions(previewHostView('legacy'),{}),[]);
  assert.throws(()=>hostForegroundRegions(game,{arena:{y:48},partyTop:1200}),/Invalid/);
});

test('native logical proportions are derived from the pinned projection, not a guessed HUD crop',t=>{
  const path='tools/data/particle-native-audit/locator-camera-audit.json';
  if(!fs.existsSync(path)){t.skip('Existing captured camera required');return;}
  const audit=JSON.parse(fs.readFileSync(path)),view=previewHostView('native-proportions',undefined,audit);
  assert.equal(view.width,640);assert.equal(view.height,1136);
  assert.match(view.origin,/adapted anchors/);
  const physicalChanged=structuredClone(audit);physicalChanged.camera.viewport=[2160,3840];
  assert.deepEqual(previewHostView('native-proportions',undefined,physicalChanged),view);
  const bad=structuredClone(audit);bad.camera.viewMatrix[12]=1;
  assert.throws(()=>previewHostView('native-proportions',undefined,bad),/Unsupported/);
  assert.throws(()=>previewHostView('native-proportions'),/Unsupported/);
});

test('unknown host modes and invalid dimensions are rejected',()=>{
  assert.throws(()=>previewHostView('crop-to-hide-flash'),/Unknown/);
  assert.throws(()=>previewHostView('game',{width:1000,height:0}),/Invalid/);
});

test('screen anchor uses an explicitly supplied viewport while target anchors keep arena coordinates',()=>{
  const placement={rectangle:'screen',axisModes:[2,2],offset:[0,150]},member={placement};
  const view=previewHostView('game'),bridge={arena:{x:0,y:48,width:1000,height:752},unitsPerPixel:1,scatter:[0,0]};
  const old=presentationAnchor(member,{}, {},'center',bridge,view);
  const full=presentationAnchor(member,{}, {},'center',{...bridge,screen:{x:0,y:0,width:1000,height:1100}},view);
  assert.deepEqual(old,{x:0,y:276,unitsToPixels:1});
  assert.deepEqual(full,{x:0,y:150,unitsToPixels:1});
  const side={placement:{...placement,rectangle:'target-side'}};
  assert.deepEqual(presentationAnchor(side,{}, {},'center',bridge,view),presentationAnchor(side,{}, {},'center',{...bridge,screen:{x:0,y:0,width:1000,height:1100}},view));
  assert.throws(()=>presentationAnchor(member,{}, {},'center',{...bridge,screen:{x:0,y:0,width:0,height:1100}},view),/Invalid host/);
});
