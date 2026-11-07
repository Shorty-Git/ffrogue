import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.argv[2]??'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const output='tools/data/crystal-sound';
await fs.mkdir(output,{recursive:true});
const url='http://127.0.0.1:3001/tools/test-themed-stages.html';
try {
 for(const profile of ['arcane','impact','classic'])for(const mode of
  (process.argv[3]?.split(',')??['capture','muted-music','skip','skip-impact','skip-reveal','reduced','reload'])){
  const context=await browser.newContext({viewport:{width:900,height:1100},reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  try {
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(String(error)));
   await page.addInitScript(({profile,mode})=>{
    const start=AudioBufferSourceNode.prototype.start,stop=AudioBufferSourceNode.prototype.stop;
    const lengths={arcane:[.84,.44,.52],impact:[.85,.47,.39],classic:[.82,.31,.32]}[profile];
    window.crystalAudio=[];
    window.crystalStops=[];
    AudioBufferSourceNode.prototype.start=function(...args){
     const cue=lengths.findIndex(length=>Math.abs(length-(this.buffer?.duration??0))<.001);
     if(this.loop&&this.loopEnd||cue>=0)
      window.crystalAudio.push({loop:this.loop,cue,offset:this.loopStart,time:this.context.currentTime,phase:document.querySelector('.encounter-transition')?.dataset.phase});
     return start.apply(this,args);
    };
    AudioBufferSourceNode.prototype.stop=function(...args){
     if(lengths.some(length=>Math.abs(length-(this.buffer?.duration??0))<.001))window.crystalStops.push(args[0]-this.context.currentTime);
     return stop.apply(this,args);
    };
    if(mode==='muted-music')localStorage.setItem('ffrogue.audio.v1',JSON.stringify({music:{volume:.18,muted:true}}));
   },{profile,mode});
   await page.goto(url+'?encounterSound='+profile);
   await page.locator('#review:not([disabled])').waitFor();
   await page.locator('#qa').evaluate(element=>element.hidden=true);
   await page.locator('#run-seed').fill('combat-audio-20');
   await page.locator('[data-action=play]').click();
   await page.locator('.slot-lever').click();
   const confirm=page.locator('[data-action=confirm]:enabled');
   await confirm.waitFor();
   const overlay=page.locator('.encounter-transition');
   const ready=async()=>{
    await overlay.waitFor({state:'detached'});
    await page.waitForFunction(()=>window.themedReviewGame.scene.getScene('BattleScene').isRunCommandWindow());
   };
   const capture=async(name,action)=>{
    const frames=[],cdp=await context.newCDPSession(page);
    cdp.on('Page.screencastFrame',({data,metadata,sessionId})=>{
     frames.push({data,time:metadata.timestamp});
     void cdp.send('Page.screencastFrameAck',{sessionId}).catch(()=>{});
    });
    await cdp.send('Page.startScreencast',{format:'jpeg',quality:88,maxWidth:810,maxHeight:990});
    const audioAt=await page.evaluate(()=>{
     const game=window.themedReviewGame;
     const mix=game.sound.context.createMediaStreamDestination();
     game.sound.masterMuteNode.connect(mix);
     const recorder=new MediaRecorder(mix.stream),chunks=[];
     recorder.ondataavailable=event=>chunks.push(event.data);
     const recording=new Promise(resolve=>recorder.onstop=async()=>resolve(
      [...new Uint8Array(await new Blob(chunks,{type:recorder.mimeType}).arrayBuffer())]));
     window.finishCrystalCapture=async()=>{
      recorder.stop();
      const bytes=await recording;
      game.sound.masterMuteNode.disconnect(mix);
      mix.stream.getTracks().forEach(track=>track.stop());
      return bytes;
     };
     recorder.start();
     return (performance.timeOrigin+performance.now())/1000;
    });
    await action();
    await page.waitForFunction(()=>document.querySelector('.encounter-transition')?.dataset.phase==='gather');
    assert.equal(await page.locator('#run-ui').evaluate(root=>root.inert),true);
    await page.waitForFunction(()=>document.querySelector('.encounter-transition')?.dataset.phase==='reveal');
    assert.ok(await page.evaluate(()=>window.themedReviewGame.scene.getScene('BattleScene').enemies.every(enemy=>enemy.sprite.alpha===1)));
    await ready();
    await page.screenshot({path:output+'/'+name+'-ready.png'});
    await page.waitForTimeout(650);
    const audio=await page.evaluate(()=>window.finishCrystalCapture());
    await cdp.send('Page.stopScreencast');
    await cdp.detach();
    assert.ok(frames.length>20);
    await fs.writeFile(output+'/'+name+'-frames.json',JSON.stringify({audioAt,frames}));
    await fs.writeFile(output+'/'+name+'-audio.webm',Buffer.from(audio));
   };
   const begin=()=>confirm.evaluate(button=>{button.click();button.click();});
   const sounds=()=>page.evaluate(()=>window.crystalAudio);
   if(mode==='capture'||mode==='muted-music'){
    if(mode==='capture')await capture(profile+'-expedition',begin);
    else{await begin();await ready();}
    assert.equal(await page.evaluate(()=>window.themedReviewGame.registry.get('runFlow').audio.getPreference('music').muted),
     mode==='muted-music');
    const win=async()=>page.evaluate(async()=>{
     const game=window.themedReviewGame,flow=game.registry.get('runFlow'),scene=game.scene.getScene('BattleScene');
     scene.enemies[0].currentHp=1;
     scene.openHeroCommands(scene.turnOrder.find(hero=>hero.unitKey==='cloud'));
     scene.cmdAttackBtnBg.emit('pointerdown');
     scene.cmdExecuteBtnBg.emit('pointerdown');
     const deadline=performance.now()+15000;
     while(flow.state.phase==='battle'&&performance.now()<deadline)await new Promise(r=>setTimeout(r,30));
     if(flow.state.phase!=='rewards')throw Error('Victory did not settle');
    });
    const reward=async()=>{
     await page.locator('[data-action=reward-0]').click();
     const skip=page.locator('[data-action=awakening-skip]');
     if(await skip.count())await skip.click();
    };
    await win();await reward();await ready();
    assert.deepEqual((await sounds()).filter(c=>!c.loop).map(c=>c.cue),[0,1,2]);
    await win();
    if(mode==='capture')await capture(profile+'-reactor',reward);
    else{await reward();await ready();}
    assert.equal(await page.evaluate(()=>window.themedReviewGame.scene.getScene('BattleScene').arenaKey),'reactor');
    const audio=await sounds();
    const cues=audio.filter(c=>!c.loop);
    assert.deepEqual(cues.map(c=>c.cue),[0,1,2,0,1,2]);
    assert.equal(cues.filter(c=>c.cue===1&&c.phase==='gather').length,2);
    assert.equal(audio.filter(c=>c.loop&&Math.abs(c.offset-370898/44100)<.01).length,1);
    await fs.writeFile(output+'/'+profile+'-'+mode+'.json',JSON.stringify(audio,null,2));
   }else{
    await begin();
    if(mode.startsWith('skip')){
     await page.waitForFunction(()=>document.querySelector('.encounter-transition')?.dataset.phase==='gather');
     if(mode!=='skip')await page.waitForFunction(cue=>window.crystalAudio.some(event=>!event.loop&&event.cue===cue),
      mode==='skip-impact'?1:2);
     await page.keyboard.press('Escape');
     assert.ok(await page.evaluate(()=>window.crystalStops.some(delay=>delay>0&&delay<.05)));
    }else if(mode==='reload'){
     await overlay.waitFor();
     await page.reload();
     await page.locator('[data-action=continue]').click();
    }
    await ready();
    const cues=(await sounds()).filter(c=>!c.loop);
    const expected={skip:[0],'skip-impact':[0,1],'skip-reveal':[0,1,2]}[mode]??[];
    assert.deepEqual(cues.map(c=>c.cue),expected);
   }
   assert.deepEqual(errors,[]);
   console.log('PASS Crystal',profile,mode);
  } finally {await context.close();}
 }
} finally {await browser.close();}
