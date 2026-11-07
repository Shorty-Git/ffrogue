import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';

const args=process.argv.slice(2);
const arg=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const {chromium}=createRequire(import.meta.url)(arg('--playwright','playwright'));
const output=arg('--output','tools/data/ui-sound-review/browser');
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try {
 for(const mode of ['ordinary','silver','gold','nv','skip','reduced','shake-off','muted']){
  const page=await browser.newPage({viewport:{width:900,height:1100},reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  await page.addInitScript(()=>{
   const start=AudioBufferSourceNode.prototype.start;
   const stop=AudioBufferSourceNode.prototype.stop;
   const animate=Element.prototype.animate;
   const loops=new WeakMap();
   window.uiReview={sounds:[],shakes:[]};
   AudioBufferSourceNode.prototype.start=function(...args){
    if(this.buffer&&this.loopEnd===0){
     const peak=this.buffer.getChannelData(0).reduce((max,sample)=>Math.max(max,Math.abs(sample)),0);
     const record={duration:this.buffer.duration,loop:this.loop,rate:this.playbackRate.value,time:performance.now(),peak};
     window.uiReview.sounds.push(record);
     if(this.loop)loops.set(this,record);
    }
    return start.apply(this,args);
   };
   AudioBufferSourceNode.prototype.stop=function(...args){
    const record=loops.get(this);
    if(record)record.stopped=performance.now();
    return stop.apply(this,args);
   };
   Element.prototype.animate=function(...args){
    if(this.classList.contains('slot-machine'))window.uiReview.shakes.push({duration:args[1].duration,keyframes:args[0],time:performance.now()});
    return animate.apply(this,args);
   };
  });
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto('http://127.0.0.1:3001/tools/test-themed-stages.html');
  await page.locator('#review:not([disabled])').waitFor();
  await page.locator('#qa').evaluate(e=>e.hidden=true);
  const rank=['ordinary','silver','gold'].includes(mode)?mode:'nv';
  const seed=await page.evaluate(async rank=>{
   const {createRun,rollParty}=await import('/src/run/runState.mjs');
   const flow=window.themedReviewGame.registry.get('runFlow');
   for(let i=0;i<1000;i++){
    const seed='ui-sound-'+i;
    const {party}=rollParty(createRun(seed,flow.catalog,undefined,flow.rules),flow.catalog);
    const highest=party.some(member=>member.rank==='NV')?'nv':party.some(member=>member.rarity===7)?'gold'
     :party.some(member=>member.rarity===6)?'silver':'ordinary';
    if(highest===rank)return seed;
   }
   throw Error('No draw with rank '+rank);
  },rank);
  await page.locator('.audio-controls summary').click();
  if(mode==='ordinary'){
   for(const label of ['Cursor · FFBE','Cursor · Crystal','Cursor · Soft']){
    await page.getByRole('button',{name:label,exact:true}).click();
    await page.waitForTimeout(170);
   }
   const durations=await page.evaluate(()=>window.uiReview.sounds.map(sound=>sound.duration));
   for(const expected of [14994/44100,.092,.105])assert.ok(durations.some(actual=>Math.abs(actual-expected)<.0001),JSON.stringify(durations));
   await page.screenshot({path:output+'/comparison.png'});
  }
  if(mode==='muted')await page.locator('[data-muted=effects]').check();
  if(mode==='shake-off')await page.getByLabel('Rare housing shake').uncheck();
  await page.locator('.audio-controls summary').click();
  await page.locator('#run-seed').fill(seed);
  await page.locator('[data-action=play]').click();
  await page.evaluate(()=>{window.uiReview.sounds.length=0;});
  await page.locator('.slot-lever').click();
  if(mode==='silver'){
   await page.locator('.is-spinning.reel-silver').first().waitFor();
   assert.equal(await page.locator('.is-spinning.reel-silver').first().evaluate(reel=>getComputedStyle(reel,'::after').animationName),'silver-reel-reveal');
  }
  if(mode==='skip'){
   await page.locator('.is-drawing').waitFor();
   await page.locator('[data-action=skip]').click();
  }
  await page.locator('[data-action=confirm]:enabled').waitFor();
  await page.waitForTimeout(150);
  const report=await page.evaluate(()=>({
   ...window.uiReview,
   center:document.querySelector('.slot-machine').getBoundingClientRect().left+document.querySelector('.slot-machine').offsetWidth/2-innerWidth/2,
   rerolls:window.themedReviewGame.registry.get('runFlow').state.rerolls,
  }));
  assert.ok(Math.abs(report.center)<.6);
  assert.equal(report.rerolls,3);
  const count=duration=>report.sounds.filter(sound=>Math.abs(sound.duration-duration)<.0001).length;
  if(mode==='muted')assert.equal(report.sounds.length,0);
  else {
   assert.equal(count(.17),1);
   assert.equal(count(.105),1);
   assert.equal(count(.116),['skip','reduced'].includes(mode)?0:3);
   assert.equal(count(.31),mode==='gold'?1:0);
   assert.equal(count(.42),['nv','shake-off'].includes(mode)?1:0);
  }
  assert.equal(report.shakes.length,['gold','nv','muted'].includes(mode)?1:0);
  for(const loop of report.sounds.filter(sound=>sound.loop))assert.ok(loop.stopped>loop.time);
  if(!['muted','skip','reduced'].includes(mode)){
   const running=report.sounds.find(sound=>sound.loop);
   const stops=report.sounds.filter(sound=>Math.abs(sound.duration-.116)<.0001);
   assert.deepEqual(stops.map(sound=>Math.round(sound.rate*100)),[92,100,109]);
   stops.forEach((sound,index)=>assert.ok(Math.abs(sound.time-running.time-[650,1000,1400][index])<150));
   assert.ok(Math.abs(running.stopped-stops[2].time)<35);
  }
  if(report.shakes.length){
   assert.equal(report.shakes[0].duration,mode==='gold'?140:185);
   assert.deepEqual(report.shakes[0].keyframes.map(frame=>frame.transform),
    mode==='gold'?['translateX(0)','translateX(-3px)','translateX(2px)','translateX(-1px)','translateX(0)']
     :['translateX(0)','translateX(-7px)','translateX(4px)','translateX(-2px)','translateX(0)']);
  }
  if(['nv','gold','silver','ordinary'].includes(mode))await page.screenshot({path:output+'/'+mode+'.png'});
  assert.deepEqual(errors,[]);
  results.push({mode,seed,...report});
  await page.close();
 }
 await fs.writeFile(output+'/receipt.json',JSON.stringify(results,null,2));
 console.log('PASS FFBE and authored previews, ordinary/7-star/NV, muted, skip, reduced motion and shake opt-out');
} finally { await browser.close(); }
