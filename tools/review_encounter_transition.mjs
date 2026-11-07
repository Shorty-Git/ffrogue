import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';

const {chromium}=createRequire(import.meta.url)(process.argv[2]??'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const output='tools/data/encounter-fold';
await fs.mkdir(output,{recursive:true});
const summary=[];
try {
 for(const mode of ['mosaic','vortex','fold','skip','skip-fold','skip-loading','skip-reveal','reduced','reload']){
  const context=await browser.newContext({viewport:{width:1080,height:1000},reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  try {
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(String(error)));
   await page.addInitScript(()=>{
    const start=AudioBufferSourceNode.prototype.start;
    window.entryAudio=[];
    AudioBufferSourceNode.prototype.start=function(...args){
     if(this.buffer&&(this.loop||[.84,.44,.52].some(length=>Math.abs(this.buffer.duration-length)<.001)))
      window.entryAudio.push({loop:this.loop,loopStart:this.loopStart,duration:this.buffer.duration});
     return start.apply(this,args);
    };
    window.entryPhases=[];
    new MutationObserver(records=>{
     for(const record of records){
      const el=record.target;
      if(el.classList?.contains('encounter-transition')&&record.attributeName==='data-phase')
       window.entryPhases.push(el.dataset.phase);
     }
    }).observe(document,{subtree:true,attributes:true,attributeFilter:['data-phase']});
   });
   const style=mode==='vortex'?'vortex':['mosaic','skip-loading'].includes(mode)?'mosaic':'fold';
   await page.goto('http://127.0.0.1:3001/tools/test-themed-stages.html?encounter='+style);
   await page.locator('#review:not([disabled])').waitFor();
   await page.locator('#qa').evaluate(e=>e.hidden=true);
   await page.locator('#run-seed').fill('combat-audio-20');
   await page.locator('[data-action=play]').click();
   await page.locator('.slot-lever').click();
   const confirm=page.locator('[data-action=confirm]:enabled');
   await confirm.waitFor();
   const frames=[];
   const recording=['mosaic','vortex','fold'].includes(mode);
   const cdp=recording?await context.newCDPSession(page):null;
   if(cdp){
    cdp.on('Page.screencastFrame',({data,metadata,sessionId})=>{
     frames.push({data,time:metadata.timestamp});
     void cdp.send('Page.screencastFrameAck',{sessionId}).catch(()=>{});
    });
    await cdp.send('Page.startScreencast',{format:'jpeg',quality:84,maxWidth:720,maxHeight:720});
   }
   await confirm.evaluate(button=>{button.click();button.click();});
   const overlay=page.locator('.encounter-transition');
   const partialReveal=()=>page.waitForFunction(()=>{
    const canvas=document.querySelector('.encounter-transition[data-phase=reveal] canvas');
    if(!canvas)return false;
    const bytes=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    let open=0,closed=0;
    for(let i=3;i<bytes.length;i+=67*4){if(bytes[i]<16)open++;if(bytes[i]>240)closed++;}
    return open>bytes.length/(67*4)*.32&&closed>0;
   });
   if(mode==='reload'){
    await overlay.waitFor();
    await page.reload();
    await page.locator('[data-action=continue]').click();
   } else if(mode.startsWith('skip')){
    if(mode!=='skip')await page.waitForFunction(phase=>document.querySelector('.encounter-transition')?.dataset.phase===phase,
      mode.slice(5));
    if(mode==='skip-loading')await page.keyboard.press('Escape');
    else await overlay.getByRole('button',{name:'Skip transition'}).click();
   } else if(mode!=='reduced'){
    if(mode==='fold'){
     await page.waitForFunction(()=>document.querySelector('.encounter-transition')?.dataset.phase==='fold');
     await page.screenshot({path:output+'/fold-outgoing.png'});
    }
    await page.waitForFunction(()=>document.querySelector('.encounter-transition')?.dataset.phase==='reveal');
    assert.equal(await overlay.getAttribute('data-style'),style);
    if(mode!=='fold')await partialReveal();
    await page.screenshot({path:output+'/'+style+'-reveal.png'});
   }
   const ready=async()=>{
    await overlay.waitFor({state:'detached'});
    await page.waitForFunction(()=>window.themedReviewGame.scene.getScene('BattleScene').isRunCommandWindow());
   };
   await ready();
   if(cdp){
    await page.screenshot({path:output+'/'+style+'-ready.png'});
    await cdp.send('Page.stopScreencast');
    assert.ok(frames.length>5,style);
    await fs.writeFile(output+'/'+style+'-frames.json',JSON.stringify(frames));
   }
   await page.waitForFunction(()=>window.entryAudio.some(cue=>cue.loop&&Math.abs(cue.loopStart-370898/44100)<.01));
   const count=()=>page.evaluate(()=>window.entryAudio.filter(cue=>!cue.loop).length);
   if(mode.startsWith('skip'))assert.ok(await count()>=1&&await count()<=3);
   else assert.equal(await count(),['reload','reduced'].includes(mode)?0:3);
   const phases=()=>page.evaluate(()=>[...window.entryPhases]);
   const initial=await phases();
   if(mode==='reduced'||mode==='skip'||mode==='reload')assert.ok(!initial.includes('reveal'),mode);
   if(mode==='fold'){
    const win=async()=>{
     await page.evaluate(async()=>{
      const game=window.themedReviewGame,flow=game.registry.get('runFlow'),scene=game.scene.getScene('BattleScene');
      const actor=scene.turnOrder.find(hero=>hero.unitKey==='cloud');
      scene.enemies[0].currentHp=1;
      scene.openHeroCommands(actor);
      scene.cmdAttackBtnBg.emit('pointerdown');
      scene.cmdExecuteBtnBg.emit('pointerdown');
      const until=performance.now()+15000;
      while(flow.state.phase==='battle'&&performance.now()<until)await new Promise(r=>setTimeout(r,30));
      if(flow.state.phase!=='rewards')throw Error('Victory did not settle');
     });
     await page.locator('.victory-overlay[data-phase=rewards]').waitFor();
     await page.locator('[data-action=reward-0]').click();
     const skip=page.locator('[data-action=awakening-skip]');
     if(await skip.count())await skip.click();
    };
    await win();
    await ready();
    assert.deepEqual(await phases(),[...initial,'loading','reveal']);
    assert.equal(await count(),3);
    await win();
    await page.waitForFunction(()=>document.querySelector('.encounter-transition')?.dataset.phase==='fold');
    await page.screenshot({path:output+'/reactor-outgoing.png'});
    await page.waitForFunction(()=>document.querySelector('.encounter-transition')?.dataset.phase==='reveal');
    await page.screenshot({path:output+'/reactor-reveal.png'});
    await ready();
    const area=await page.evaluate(()=>window.themedReviewGame.scene.getScene('BattleScene').arenaKey);
    assert.equal(area,'reactor');
    assert.equal(await count(),6);
    const tracks=await page.evaluate(()=>window.entryAudio.filter(cue=>cue.loop));
    assert.equal(tracks.filter(cue=>Math.abs(cue.loopStart-370898/44100)<.01).length,1);
   }
   assert.deepEqual(errors,[]);
   summary.push({mode,phases:await phases(),encounterCues:await count()});
   console.log('PASS',mode);
  } finally {await context.close();}
 }
 await fs.writeFile(output+'/transition.json',JSON.stringify(summary,null,2));
} finally {await browser.close();}
