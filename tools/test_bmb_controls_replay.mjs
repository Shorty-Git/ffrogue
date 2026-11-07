import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createEffectPlayer,presentationMembers} from './original_effect_player.mjs';
import {scenePresentationAnchor} from '../src/effects/PreparedSceneBridge.mjs';

test('binary-control preparation preserves lifecycle, matrices, geometry and material-state snapshots',async t=>{
  const rebuilt='tools/data/bmb-controls-20261028/seal-reprepared.json';
  if(!fs.existsSync(rebuilt)){t.skip('Optional preserved binary-control preparation missing');return;}
  const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
  const old=read('tools/data/skill-expansion-20261028/seal-source/plan.json'),next=read(rebuilt);
  const context=vm.createContext({console});vm.runInContext(fs.readFileSync('public/vendor/three-preview.js','utf8'),context);
  const THREE=context.THREE;
  THREE.TextureLoader=class{load(url,done){const texture=new THREE.Texture({width:1,height:1});queueMicrotask(()=>done(texture));return texture;}};
  const keys=['target0','target1'];
  const host={width:1000,height:1100,arena:{x:0,y:48,width:1000,height:752},caster:{x:800,y:500},
    targets:{target0:{x:190,y:500},target1:{x:260,y:640}},
    units:Object.fromEntries(keys.map(key=>[key,{frameWidth:66,frameHeight:68,pivotX:.5,pivotY:.8,scale:2}]))};
  const players=await Promise.all([old,next].map(plan=>createEffectPlayer(THREE,new THREE.Scene(),
    {...plan,members:presentationMembers(plan.members,keys,plan.presentation.scope)})));
  let frames=0;
  try{
    // Full finite horizon, including creation, hits, tail and natural extinction.
    for(let frame=0;frame<=286;frame++){
      players.forEach((player,i)=>player.update(frame,member=>scenePresentationAnchor(member,host,[old,next][i]),
        {x:-500,y:-250,width:1000,height:752}));
      assert.deepEqual(players[1].traceSnapshot(),players[0].traceSnapshot(),'Output differs at F'+frame);
      frames++;
    }
  }finally{players.forEach(player=>player.dispose());}
  t.diagnostic(JSON.stringify({frames,nativePixelsCompared:false,newlyPlayableSkills:0}));
});
