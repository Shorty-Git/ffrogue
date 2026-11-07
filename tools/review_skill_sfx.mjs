import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';

const {chromium}=createRequire(import.meta.url)(process.argv[2]??'playwright');
const origin=process.argv[3]??'http://127.0.0.1:3001';
const output='tools/data/combat-sfx/skill-review';
const basicComparison=process.argv.includes('--basic-comparison');
const browser=await chromium.launch({channel:'chrome',headless:true});
const review=JSON.parse(await fs.readFile('tools/presentations/source-audio-review.json','utf8'));
const cases=Object.keys(review.presentations).filter(key=>!process.argv[4]||key===process.argv[4]);
await fs.mkdir(output,{recursive:true});
try {
 for (const key of cases) {
  const context=await browser.newContext();
  try {
   const page=await context.newPage(), errors=[];
   page.on('pageerror',error=>errors.push(String(error)));
   await page.goto(origin+'/tools/test-themed-stages.html');
   await page.locator('#review:not([disabled])').waitFor();
   await page.locator('#qa').evaluate(node=>node.hidden=true);
   const selection=await page.evaluate(async key=>{
    const {createRun,rollParty}=await import('/src/run/runState.mjs');
    const {catalog,rules}=window.themedReviewGame.registry.get('runFlow');
    for(let i=0;i<5000;i++){
     const seed='skill-sfx-'+i, state=rollParty(createRun(seed,catalog,undefined,rules),catalog);
     const hero=state.party.find(member=>catalog[member.key].skills.find(skill=>skill.id===member.skills[0].id)?.scenePresentation===key);
     if(hero)return {seed,actor:hero.key,form:hero.form};
    }
    throw Error('No seeded draw for '+key);
   },key);
   await page.locator('#run-seed').fill(selection.seed);
   await page.locator('[data-action=play]').click();
   await page.locator('.slot-lever').click();
   await page.locator('[data-action=confirm]:enabled').click();
   await page.locator('.encounter-transition').waitFor({state:'detached'});
   await page.waitForFunction(()=>window.themedReviewGame.scene.getScene('BattleScene').isRunCommandWindow());
   const manifest=JSON.parse(await fs.readFile('public/assets/presentations/'+key+'/manifest.json','utf8'));
   const expected=basicComparison?[[null,'SE:1']]:manifest.audioSource.events.map(event=>[event.frame,event.resource.key]);
   const result=await page.evaluate(async ({selection,expected,key,basicComparison})=>{
    const game=window.themedReviewGame,scene=game.scene.getScene('BattleScene');
    const flow=game.registry.get('runFlow'), audio=flow.audio;
    const wait=async predicate=>{
     const deadline=performance.now()+25000;
     while(!predicate()){
      if(performance.now()>deadline)throw Error('Timeout: '+key);
      await new Promise(resolve=>setTimeout(resolve,20));
     }
    };
    await scene.preparedScenes.ready;
    await wait(()=>expected.every(([,cue])=>audio.combatBuffers.has(cue))&&audio.context.state==='running');
    await wait(()=>audio.current?.resource===400005);
    const mix=game.sound.context.createMediaStreamDestination();
    game.sound.masterMuteNode.connect(mix);
    const recorder=new MediaRecorder(mix.stream),chunks=[];
    recorder.ondataavailable=event=>chunks.push(event.data);
    const recording=new Promise(resolve=>recorder.onstop=async()=>resolve(
     [...new Uint8Array(await new Blob(chunks,{type:recorder.mimeType}).arrayBuffer())]));
    const events=[],started=[],hits=[];
    scene.events.on('combat-sfx',row=>events.push({...row,time:scene.time.now}));
    const enemy=scene.enemies[0],applyDamage=enemy.applyDamage;
    enemy.applyDamage=function(...args){hits.push(scene.time.now);return applyDamage.apply(this,args);};
    const start=AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start=function(...args){
     const cue=[...audio.combatBuffers].find(([,buffer])=>buffer===this.buffer)?.[0];
     if(cue)started.push(cue);
     return start.apply(this,args);
    };
    const actor=scene.turnOrder.find(hero=>hero.unitKey===selection.actor);
    const earlyKo=['delita_cunning_hero_sword','cross_slash_import_test'].includes(key);
    if(earlyKo)scene.enemies[0].currentHp=1;
    recorder.start();
    scene.openHeroCommands(actor);
    (basicComparison?scene.cmdAttackBtnBg:scene.skillButtons[0].bg).emit('pointerdown');
    scene.cmdExecuteBtnBg.emit('pointerdown');
    await wait(()=>events.filter(event=>event.event===(basicComparison?'basic-impact':'source')).length===expected.length);
    await wait(()=>actor.hasActed||flow.state.phase==='rewards');
    if(earlyKo)await wait(()=>flow.state.phase==='rewards');
    await new Promise(resolve=>setTimeout(resolve,450));
    recorder.stop();
    const recorded=await recording;
    game.sound.masterMuteNode.disconnect(mix);
    mix.stream.getTracks().forEach(track=>track.stop());
    return {events,started,hits,phase:flow.state.phase,recorded};
   },{selection,expected,key,basicComparison});
   assert.deepEqual(result.events.filter(event=>event.event===(basicComparison?'basic-impact':'source')).map(event=>[event.sourceFrame??null,event.cue]),expected,key);
   assert.deepEqual(result.started.filter(cue=>cue.startsWith('SE:')),expected.map(([,cue])=>cue),key);
   assert.equal(result.events.some(event=>event.event==='basic-impact'),basicComparison,key);
   if(['delita_cunning_hero_sword','cross_slash_import_test'].includes(key)){
    assert.equal(result.events.filter(event=>event.event==='enemy-dissolve').length,1);
    assert.equal(result.phase,'rewards');
   }
   if(key==='cross_slash_import_test'){
    await page.locator('.victory-overlay[data-phase=rewards]').waitFor();
    await page.locator('[data-action=reward-0]').click();
    await page.locator('.encounter-transition').waitFor({state:'detached'});
    await page.waitForFunction(()=>{
     const flow=window.themedReviewGame.registry.get('runFlow');
     return flow.state.encounter===1&&flow.audio.combatVoices.size===0&&flow.audio.current?.resource===400005;
    });
   }
   if(key==='jack_iai_strike'){
    await page.reload();
    await page.locator('[data-action=continue]').click();
    await page.waitForFunction(()=>window.themedReviewGame.scene.getScene('BattleScene').isRunCommandWindow());
    result.standardAttack=await page.evaluate(async ()=>{
     const scene=window.themedReviewGame.scene.getScene('BattleScene');
     const jack=scene.turnOrder.find(hero=>hero.unitKey==='jack'),events=[];
     scene.events.on('combat-sfx',event=>events.push(event));
     scene.openHeroCommands(jack);
     scene.cmdAttackBtnBg.emit('pointerdown');
     scene.cmdExecuteBtnBg.emit('pointerdown');
     const deadline=performance.now()+10000;
     while(!jack.hasActed&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,20));
     if(!jack.hasActed)throw Error('Jack basic attack did not complete');
     return events;
    });
    assert.deepEqual(result.standardAttack.filter(event=>event.event==='basic-impact').map(event=>event.cue),['SE:1']);
   }
   assert.deepEqual(errors,[]);
   const outputKey=basicComparison?key+'-standard-attack':key;
   await fs.writeFile(output+'/'+outputKey+'.webm',Buffer.from(result.recorded));
   delete result.recorded;
   await fs.writeFile(output+'/'+outputKey+'.json',JSON.stringify({selection,...result},null,2));
   console.log('PASS',key,selection.seed,result.started);
  } finally { await context.close(); }
 }
} finally { await browser.close(); }
