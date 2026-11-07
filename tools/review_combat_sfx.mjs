import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';

const {chromium}=createRequire(import.meta.url)(process.argv[2]??'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:900,height:1100}});
 const errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 await page.addInitScript(()=>{
  const start=AudioBufferSourceNode.prototype.start,stop=AudioBufferSourceNode.prototype.stop;
  window.audioProof=[];
  AudioBufferSourceNode.prototype.start=function(...args){
   window.audioProof.push({source:this,loop:this.loop,duration:this.buffer?.duration,time:performance.now()});
   return start.apply(this,args);
  };
  AudioBufferSourceNode.prototype.stop=function(...args){
   const proof=window.audioProof.find(row=>row.source===this);
   if(proof)proof.stopped=performance.now();
   return stop.apply(this,args);
  };
 });
 await page.goto('http://127.0.0.1:3001/tools/test-themed-stages.html');
 await page.locator('#review:not([disabled])').waitFor();
 await page.locator('#qa').evaluate(e=>e.hidden=true);
 const seed=await page.evaluate(async()=>{
  const {createRun,rollParty}=await import('/src/run/runState.mjs');
  const flow=window.themedReviewGame.registry.get('runFlow');
  for(let i=0;i<4000;i++){
   const seed='combat-audio-'+i,r=rollParty(createRun(seed,flow.catalog,undefined,flow.rules),flow.catalog);
   if(r.party.some(m=>m.key==='cloud'&&m.skills[0].id==='cross_slash')&&r.party.some(m=>m.key==='aerith'))return seed;
  }
  throw Error('Audio review seed unavailable');
 });
 await page.locator('#run-seed').fill(seed);
 await page.locator('[data-action=play]').click();
 await page.locator('.slot-lever').click();
 await page.locator('[data-action=confirm]:enabled').click();
 await page.waitForFunction(()=>window.themedReviewGame.scene.getScene('BattleScene').isRunCommandWindow());
 const receipt=await page.evaluate(async()=>{
  const game=window.themedReviewGame,flow=game.registry.get('runFlow'),scene=game.scene.getScene('BattleScene');
  const log=[];
  scene.events.on('combat-sfx',row=>log.push({...row,time:scene.time.now}));
  const wait=async predicate=>{
   const until=performance.now()+35000;
   while(!predicate()){
    if(performance.now()>until)throw Error('Audio review timeout');
    await new Promise(resolve=>setTimeout(resolve,20));
   }
  };
  await scene.preparedScenes.ready;
  const mix=game.sound.context.createMediaStreamDestination();
  game.sound.masterMuteNode.connect(mix);
  const recorder=new MediaRecorder(mix.stream),chunks=[];
  recorder.ondataavailable=event=>chunks.push(event.data);
  const recorded=new Promise(resolve=>{recorder.onstop=async()=>{
   const blob=new Blob(chunks,{type:recorder.mimeType});
   resolve([...new Uint8Array(await blob.arrayBuffer())]);
  };});
  recorder.start();
  const actor=scene.turnOrder.find(h=>h.unitKey==='cloud'),aerith=scene.turnOrder.find(h=>h.unitKey==='aerith');
  const enemy=scene.enemies[0];
  let hits=0;
  const hitTimes=[];
  const apply=enemy.applyDamage;
  enemy.applyDamage=function(...args){
   if(this.currentHp>0){hits++;hitTimes.push(scene.time.now);}
   return apply.apply(this,args);
  };
  const act=async (hero,skill)=>{
   scene.openHeroCommands(hero);
   if(skill)scene.skillButtons[0].bg.emit('pointerdown');
   else scene.cmdAttackBtnBg.emit('pointerdown');
   scene.cmdExecuteBtnBg.emit('pointerdown');
   await wait(()=>hero.hasActed||flow.state.phase!=='battle');
  };
  await act(actor,false);
  if(hits!==1||!log.some(e=>e.cue==='SE:1'))throw Error('Basic attack did not hit with original cue');
  await act(aerith,true);
  await wait(()=>!scene.preparedScenes.snapshot().active);
  if(hits!==1)throw Error('Support action damaged the enemy');
  // The fixture lowers HP to exercise early K.O. inside the real multi-hit action.
  const third=scene.turnOrder.find(h=>h!==actor&&h!==aerith);
  enemy.currentHp=enemy.maxHp;
  await act(third,false);
  await wait(()=>scene.isRunCommandWindow()&&!actor.hasActed);
  enemy.currentHp=1;
  const beforeCross=hits;
  await act(actor,true);
  await wait(()=>flow.state.phase==='rewards');
  if(hits-beforeCross!==1)throw Error('Defeated enemy accepted more damage');
  const samples=window.audioProof.filter(row=>!row.loop).map(({duration})=>duration);
  const music=window.audioProof.filter(row=>row.loop&&Math.abs(row.duration-86.5558)<.03&&!row.stopped);
  recorder.stop();
  const recording=await recorded;
  game.sound.masterMuteNode.disconnect(mix);
  mix.stream.getTracks().forEach(track=>track.stop());
  return {log,hitTimes,samples,musicInstances:music.length,seed:flow.state.seed,recording};
 });
 assert.equal(receipt.musicInstances,1);
 assert.equal(receipt.log.find(row=>row.event==='basic-impact').time,receipt.hitTimes[0]);
 assert.deepEqual(receipt.log.filter(row=>row.event==='source').map(row=>[row.sourceFrame,row.cue]),[[40,'SE:600'],[61,'SE:100'],[81,'SE:100']]);
 assert.equal(receipt.log.filter(row=>row.cue==='System:47').length,1);
 const count=frames=>receipt.samples.filter(sec=>Math.abs(sec-frames/44100)<.0001).length;
 assert.ok(count(60040)>=1);
 assert.equal(count(110690),1);
 assert.equal(count(104078),1);
 assert.equal(count(65776),2);
 await page.locator('.victory-overlay[data-phase=rewards]').waitFor();
 await page.locator('[data-action=reward-0]').click();
 await page.waitForFunction(()=>window.themedReviewGame.scene.getScene('BattleScene').isRunCommandWindow());
 receipt.boss=await page.evaluate(async()=>{
  const game=window.themedReviewGame,scene=game.scene.getScene('BattleScene');
  const flow=game.registry.get('runFlow');
  const cues=[];
  scene.events.on('combat-sfx',row=>cues.push(row.cue));
  if(scene.enemies[0].assetKey!=='ochu')throw Error('Expected actual Ochu encounter');
  scene.enemies[0].currentHp=1;
  const hero=scene.turnOrder.find(h=>h.unitKey==='cloud');
  scene.openHeroCommands(hero);
  scene.cmdAttackBtnBg.emit('pointerdown');scene.cmdExecuteBtnBg.emit('pointerdown');
  const deadline=performance.now()+30000;
  while(flow.state.phase!=='rewards'&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,25));
  if(flow.state.phase!=='rewards')throw Error('Boss victory did not settle');
  return {cues,samples:window.audioProof.filter(row=>!row.loop).map(row=>row.duration)};
 });
 assert.equal(receipt.boss.cues.filter(cue=>cue==='System:48').length,1);
 assert.equal(receipt.boss.samples.filter(sec=>Math.abs(sec-301642/44100)<.0001).length,1);
 await page.locator('.victory-overlay[data-phase=rewards]').waitFor();
 await page.locator('[data-action=reward-0]').click();
 const skip=page.locator('[data-action=awakening-skip]');
 if(await skip.count())await skip.click();
 await page.waitForFunction(()=>window.themedReviewGame.scene.getScene('BattleScene').isRunCommandWindow());
 await page.locator('.audio-controls summary').click();
 await page.locator('[data-muted=effects]').check();
 receipt.mute=await page.evaluate(async()=>{
  const scene=window.themedReviewGame.scene.getScene('BattleScene');
  const hero=scene.turnOrder.find(h=>h.unitKey==='cloud'),before=window.audioProof.length;
  const cues=[];
  scene.events.on('combat-sfx',row=>cues.push(row.cue));
  scene.openHeroCommands(hero);
  scene.cmdAttackBtnBg.emit('pointerdown');scene.cmdExecuteBtnBg.emit('pointerdown');
  const deadline=performance.now()+10000;
  while(!hero.hasActed&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,25));
  const boss=window.audioProof.find(row=>Math.abs(row.duration-301642/44100)<.0001);
  return {cues,started:window.audioProof.length-before,bossStopped:Boolean(boss?.stopped)};
 });
 assert.ok(receipt.mute.cues.includes('SE:1'));
 assert.equal(receipt.mute.started,0);
 assert.equal(receipt.mute.bossStopped,true);
 await page.locator('[data-muted=effects]').uncheck();
 const finishEncounter=async keys=>page.evaluate(async expected=>{
  const game=window.themedReviewGame,flow=game.registry.get('runFlow');
  const scene=game.scene.getScene('BattleScene');
  if(JSON.stringify(scene.enemies.map(enemy=>enemy.assetKey))!==JSON.stringify(expected))throw Error('Unexpected encounter');
  const cues=[];
  scene.events.on('combat-sfx',row=>cues.push(row.cue));
  const wait=async predicate=>{
   const deadline=performance.now()+30000;
   while(!predicate()){
    if(performance.now()>deadline)throw Error('Timed out waiting for encounter');
    await new Promise(resolve=>setTimeout(resolve,20));
   }
  };
  for(const enemy of scene.enemies)enemy.currentHp=1;
  for(let i=0;i<expected.length;i++){
   const actor=scene.turnOrder.find(hero=>!hero.isDead&&!hero.hasActed);
   scene.openHeroCommands(actor);
   scene.cmdAttackBtnBg.emit('pointerdown');scene.cmdExecuteBtnBg.emit('pointerdown');
   await wait(()=>actor.hasActed||flow.state.phase==='rewards');
  }
  await wait(()=>flow.state.phase==='rewards');
  return cues;
 },keys);
 receipt.sweeper=await finishEncounter(['sweeper','sweeper']);
 assert.equal(receipt.sweeper.filter(cue=>cue==='System:48').length,2);
 assert.ok(receipt.sweeper.includes('SE:7'));
 await page.locator('.victory-overlay[data-phase=rewards]').waitFor();
 await page.locator('[data-action=reward-0]').click();
 if(await skip.count())await skip.click();
 await page.waitForFunction(()=>window.themedReviewGame.scene.getScene('BattleScene').isRunCommandWindow());
 receipt.guardScorpion=await finishEncounter(['guard_scorpion']);
 assert.equal(receipt.guardScorpion.filter(cue=>cue==='System:48').length,1);
 assert.deepEqual(errors,[]);
 await fs.mkdir('tools/data/combat-sfx',{recursive:true});
 assert.ok(receipt.recording.length>5000);
 await fs.writeFile('tools/data/combat-sfx/whisperwood-mix.webm',Buffer.from(receipt.recording));
 delete receipt.recording;
 await fs.writeFile('tools/data/combat-sfx/browser.json',JSON.stringify(receipt,null,2));
 console.log('PASS basic impact, Seal Evil frames, single early-KO dissolve and continuous music; seed',seed);
}finally{await browser.close();}
