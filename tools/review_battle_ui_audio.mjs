import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';

const {chromium}=createRequire(import.meta.url)(process.argv[2]??'playwright');
const profile=process.argv[3]??'felt';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:900,height:1100}});
 await page.addInitScript(()=>{
  const start=AudioBufferSourceNode.prototype.start;
  window.commandCues=[];
  AudioBufferSourceNode.prototype.start=function(...args){
   if(this.buffer&&!this.loop)window.commandCues.push({duration:this.buffer.duration,rate:this.playbackRate.value,detune:this.detune.value});
   return start.apply(this,args);
  };
 });
 await page.goto('http://127.0.0.1:3001/tools/test-themed-stages.html');
 await page.locator('#review:not([disabled])').waitFor();
 await page.locator('#qa').evaluate(element=>element.hidden=true);
 await page.locator('.audio-controls summary').click();
 assert.equal(await page.locator('[data-volume=music]').inputValue(),'0.18');
 assert.equal(await page.locator('[data-volume=effects]').inputValue(),'0.34');
 await page.locator('#run-seed').fill('ui-sound-26');
 await page.locator('[data-action=play]').click();
 await page.locator('.slot-lever').click();
 await page.locator('[data-action=confirm]:enabled').click();
 await page.locator('.encounter-transition').waitFor({state:'detached'});
 await page.waitForFunction(()=>window.themedReviewGame.scene.getScene('BattleScene').isRunCommandWindow());
 await page.locator('.audio-controls summary').click();
 await page.getByLabel('Battle cursor').selectOption(profile);
 await page.locator('.audio-controls summary').click();
 const {cues,mixPeak,recording}=await page.evaluate(async()=>{
  const game=window.themedReviewGame;
  const battle=game.scene.getScene('BattleScene');
  const hero=battle.turnOrder.find(hero=>hero.unitKey==='cloud');
  await battle.preparedScenes.ready;
  const analyser=game.sound.context.createAnalyser();
  game.sound.masterMuteNode.connect(analyser);
  const signal=new Float32Array(analyser.fftSize);
  let mixPeak=0;
  const monitor=setInterval(()=>{
   analyser.getFloatTimeDomainData(signal);
   for(const sample of signal)mixPeak=Math.max(mixPeak,Math.abs(sample));
  },12);
  const mix=game.sound.context.createMediaStreamDestination(), chunks=[];
  game.sound.masterMuteNode.connect(mix);
  const recorder=new MediaRecorder(mix.stream);
  recorder.ondataavailable=event=>chunks.push(event.data);
  const recorded=new Promise(resolve=>recorder.onstop=async()=>resolve(
   [...new Uint8Array(await new Blob(chunks,{type:recorder.mimeType}).arrayBuffer())]));
  recorder.start();
  battle.openHeroCommands(hero);
  const ally=battle.turnOrder.find(candidate=>candidate!==hero);
  const check=async action=>{
   window.commandCues.length=0;
   action();
   await new Promise(resolve=>setTimeout(resolve,350));
   return [...window.commandCues];
  };
  const cues={
   invalid:await check(()=>battle.executePlannedAction()),
   ally:await check(()=>battle.openHeroCommands(ally)),
   hero:await check(()=>battle.openHeroCommands(hero)),
   submenu:await check(()=>battle.openSkillSubMenu()),
   skill:await check(()=>battle.skillButtons[0].bg.emit('pointerdown')),
   back:await check(()=>battle.cancelPlannedAction()),
   target:await check(()=>battle.events.emit('enemy_clicked',battle.enemies[0])),
   rapid:await check(()=>{for(let i=0;i<6;i++)battle.events.emit('enemy_clicked',battle.enemies[0]);}),
   attack:await check(()=>battle.planHeroAttack()),
   confirm:await (async()=>{battle.planHeroAttack();return check(()=>battle.cmdExecuteBtnBg.emit('pointerdown'));})(),
  };
  clearInterval(monitor);
  game.sound.masterMuteNode.disconnect(analyser);
  recorder.stop();
  const recording=await recorded;
  game.sound.masterMuteNode.disconnect(mix);
  mix.stream.getTracks().forEach(track=>track.stop());
  return {cues,mixPeak,recording};
 });
 const cursorDuration={felt:.115,decide:26244/44100,ability:57330/44100}[profile];
 for(const [event,duration] of Object.entries({invalid:14592/44100,ally:cursorDuration,hero:cursorDuration,submenu:cursorDuration,
  skill:cursorDuration,back:44382/44100,target:cursorDuration,rapid:cursorDuration,attack:cursorDuration,confirm:59524/44100})){
  assert.equal(cues[event].length,1,event);
  assert.equal(cues[event][0].rate,1,event);
  assert.equal(cues[event][0].detune,0,event);
  assert.ok(Math.abs(cues[event][0].duration-duration)<.0001,event);
 }
 const output='tools/data/encounter-fold';
 await fs.mkdir(output,{recursive:true});
 assert.ok(mixPeak>.001&&mixPeak<.95,mixPeak);
 const name=output+'/battle-ui-'+profile;
 await fs.writeFile(name+'.json',JSON.stringify({cues,mixPeak},null,2));
 await fs.writeFile(name+'.webm',Buffer.from(recording));
 console.log('PASS battle cursor profile',profile);
}finally{await browser.close();}
