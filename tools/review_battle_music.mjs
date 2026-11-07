import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';

const args=process.argv.slice(2);
const arg=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const {chromium}=createRequire(import.meta.url)(arg('--playwright','playwright'));
const browser=await chromium.launch({channel:'chrome',headless:true});
const output=arg('--output','tools/data/audio-continuity');
await fs.mkdir(output,{recursive:true});
try {
 const page=await browser.newPage({viewport:{width:900,height:1100}});
 const errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 await page.addInitScript(()=>{
  const start=AudioBufferSourceNode.prototype.start;
  const stop=AudioBufferSourceNode.prototype.stop;
  window.musicReview=[];
  window.toneReview=[];
  AudioBufferSourceNode.prototype.start=function(...args){
   if(this.loop && this.loopEnd>0){
    const analyser=this.context.createAnalyser();
    this.connect(analyser);
    window.musicReview.push({source:this,analyser,offset:args[1],stopped:false});
   }else window.toneReview.push(this.buffer.duration);
   return start.apply(this,args);
  };
  AudioBufferSourceNode.prototype.stop=function(...args){
   const record=window.musicReview.find(row=>row.source===this);
   if(record){record.stopped=true;record.stopDelay=args[0]-this.context.currentTime;record.analyser.disconnect();}
   return stop.apply(this,args);
  };
 });
 const complete=args.includes('--complete');
 await page.goto('http://127.0.0.1:3001/tools/test-themed-stages.html?encounter='+encodeURIComponent(arg('--encounter','crystal')));
 await page.locator('#review:not([disabled])').waitFor();
 await page.locator('#qa').evaluate(e=>e.hidden=true);
 await page.locator('#run-seed').fill('audio-review');
 await page.locator('[data-action=play]').click();
 await page.locator('[data-action=spin]').dblclick({delay:20});
 await page.locator('[data-action=confirm]:enabled').waitFor();
 await page.waitForFunction(()=>window.musicReview.length===1);
 assert.equal(await page.evaluate(()=>window.musicReview[0].source.loopStart),215038/44100);
 assert.equal(await page.evaluate(()=>window.musicReview[0].stopped),false);
 const tones=await page.evaluate(()=>window.toneReview);
 const countCue=duration=>tones.filter(seconds=>Math.abs(seconds-duration)<.0001).length;
 assert.equal(countCue(.105),1);
 assert.equal(countCue(.116),3);
 const [response]=await Promise.all([
  page.waitForResponse(r=>r.url().endsWith('/assets/audio/la005_battle1.wav')),
  page.locator('[data-action=confirm]:enabled').click(),
 ]);
 assert.ok(response.ok());
 await page.waitForFunction(()=>{
  const row=window.musicReview[1];
  if(!row||row.source.context.state!=='running')return false;
  const signal=new Float32Array(row.analyser.fftSize);
  row.analyser.getFloatTimeDomainData(signal);
  return signal.some(sample=>Math.abs(sample)>.001);
 });
 const loop=await page.evaluate(()=>{
  const {source}=window.musicReview[1];
  return {start:source.loopStart,end:source.loopEnd,decodedSeconds:source.buffer.duration};
 });
 assert.equal(loop.start,370898/44100);
 assert.equal(loop.end,3816914/44100);
 await page.locator('.combat-settings > summary').click();
 const control=page.locator('[data-action=music]');
 await control.click();
 assert.equal(await control.getAttribute('aria-pressed'),'false');
 await page.locator('.audio-controls summary').click();
 await page.locator('[data-muted=effects]').check();
 await page.locator('[data-volume=effects]').evaluate(input=>{input.value='.17';input.dispatchEvent(new Event('input'));});
 await page.locator('.audio-controls summary').click();
 await control.click();
 assert.equal(await control.getAttribute('aria-pressed'),'true');
 await page.locator('.combat-settings > summary').click();
 const command=async()=>{
  await page.locator('.encounter-transition').waitFor({state:'detached'});
  await page.waitForFunction(()=>window.themedReviewGame.scene.getScene('BattleScene').isRunCommandWindow());
 };
 const live=()=>page.evaluate(()=>window.musicReview.slice(1).map(row=>({stopped:row.stopped,stopDelay:row.stopDelay,offset:row.offset})));
 const playFight=async()=>{
  await command();
  await page.evaluate(async()=>{
   const game=window.themedReviewGame,flow=game.registry.get('runFlow');
   const battle=game.scene.getScene('BattleScene');
   const wait=async(test)=>{
    const end=performance.now()+30000;
    while(!test()){
     if(performance.now()>end)throw Error('Combat command timed out');
     await new Promise(resolve=>setTimeout(resolve,30));
    }
   };
   for(let turns=0;flow.state.phase==='battle'&&turns<80;turns++){
    await wait(()=>battle.isRunCommandWindow()||flow.state.phase!=='battle');
    if(flow.state.phase!=='battle')break;
    const hero=battle.turnOrder.find(actor=>!actor.isDead&&!actor.hasActed);
    const index=battle.turnOrder.indexOf(hero);
    await wait(()=>document.querySelector('[data-command=ability][data-index="0"]:not(:disabled)'));
    document.querySelector('[data-command=hero][data-index="'+index+'"]').click();
    document.querySelector('[data-command=ability][data-index="0"]').click();
    await wait(()=>document.querySelector('.arena-hit'));
    document.querySelector('.arena-hit').click();
    await wait(()=>hero.hasActed||flow.state.phase!=='battle');
   }
   if(flow.state.phase!=='rewards')throw Error('Combat did not reach rewards');
  });
  await page.locator('.victory-overlay[data-phase=rewards]').waitFor();
 };
 const chooseReward=async()=>{
  await page.locator('[data-action=reward-0]').click();
  const replace=page.locator('[data-action=replace-0]');
  if(await replace.count())await replace.click();
  const skip=page.locator('[data-action=awakening-skip]');
  if(await skip.count())await skip.click();
 };
 await playFight();
 assert.deepEqual(await live(),[{stopped:false,offset:0,stopDelay:undefined}]);
 await page.screenshot({path:output+'/whisperwood-reward.png'});
 await chooseReward();
 await command();
 assert.deepEqual(await live(),[{stopped:false,offset:0,stopDelay:undefined}]);
 await playFight();
 assert.deepEqual(await live(),[{stopped:false,offset:0,stopDelay:undefined}]);
 await chooseReward();
 await command();
 await page.waitForFunction(()=>window.musicReview.some(row=>row.source.loopStart===1239453/44100));
 const after=await live();
 assert.equal(after.length,2);
 assert.ok(after[0].stopped&&after[0].stopDelay>.15);
 const reactor=await page.evaluate(()=>window.musicReview.find(row=>row.source.loopStart===1239453/44100).source.loopEnd);
 assert.equal(reactor,2619933/44100);
 assert.equal(await page.evaluate(()=>window.themedReviewGame.scene.getScene('BattleScene').arenaKey),'reactor');
 if(complete){
  await playFight();
  assert.deepEqual((await live())[1],{stopped:false,offset:0,stopDelay:undefined});
  await chooseReward();
  await page.waitForFunction(()=>window.musicReview.some(row=>row.source.loopStart===13261697/44100));
  assert.ok((await live())[1].stopped);
  await page.screenshot({path:output+'/boss.png'});
  await playFight();
  await page.screenshot({path:output+'/boss-reward.png'});
  assert.deepEqual((await live())[2],{stopped:false,offset:0,stopDelay:undefined});
  await chooseReward();
  assert.equal(await page.evaluate(()=>window.themedReviewGame.registry.get('runFlow').state.phase),'won');
 }else{
  await page.locator('.combat-settings > summary').click();
  await page.locator('[data-action=retreat]').click();
  await page.locator('[data-action=accept]').click();
 }
 await page.waitForFunction(()=>window.musicReview.every(row=>row.stopped));
 const expectedTracks=complete?3:2;
 assert.equal(await live().then(rows=>rows.length),expectedTracks);
 await page.locator('[data-action=new]').click();
 await page.waitForFunction(count=>window.musicReview.length===count,expectedTracks+2);
 assert.equal(await page.evaluate(()=>window.musicReview.filter(row=>!row.stopped).length),1);
 await page.locator('.audio-controls summary').click();
 assert.equal(await page.locator('[data-volume=effects]').inputValue(),'0.17');
 assert.ok(await page.locator('[data-muted=effects]').isChecked());
 await page.locator('.audio-controls summary').click();
 await page.locator('#run-seed').fill('audio-reload');
 await page.locator('[data-action=play]').click();
 await page.locator('[data-action=spin]').click();
 await page.locator('[data-action=confirm]:enabled').click();
 await page.waitForFunction(count=>window.musicReview.length===count,expectedTracks+3);
 await page.waitForFunction(()=>{
  const source=window.musicReview.at(-1).source;
  return source.context.state==='running'&&source.context.currentTime>1;
 });
 await page.waitForTimeout(350);
 await page.reload();
 await page.locator('#qa').evaluate(e=>e.hidden=true);
 await page.locator('[data-action=continue]').click();
 await page.waitForFunction(()=>window.musicReview.some(row=>row.source.loopStart===370898/44100));
 const restored=await page.evaluate(()=>window.musicReview.filter(row=>row.source.loopStart===370898/44100).map(row=>row.offset));
 assert.equal(restored.length,1);
 assert.ok(restored[0]>.2);
 await command();
 await page.locator('.combat-settings > summary').click();
 await page.locator('[data-action=retreat]').click();
 await page.locator('[data-action=accept]').click();
 await page.waitForFunction(()=>window.musicReview.every(row=>row.stopped));
 assert.deepEqual(errors,[]);
 await fs.writeFile(output+'/receipt.json',JSON.stringify({passed:true,completedExpedition:args.includes('--complete'),loop,tones,after,restored,errors},null,2));
 console.log('PASS continuous area music, explicit Reactor boss change, retreat, preferences and reload position');
} finally {
 await browser.close();
}
