import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';

const args = process.argv.slice(2);
const arg = (name, fallback) => args.includes(name) ? args[args.indexOf(name)+1] : fallback;
const {chromium} = createRequire(import.meta.url)(arg('--playwright', 'playwright'));
const output = arg('--output', 'tools/data/weighted-start-forms/battles');
await fs.mkdir(output, {recursive:true});
const browser = await chromium.launch({channel:'chrome',headless:true});
const results = [];

try {
 for (const unit of args.includes('--nv')?['cloud','delita']:['cloud','aerith']) {
  for (const level of args.includes('--nv')?[4]:[1,2,3]) {
   const page = await browser.newPage({viewport:{width:900,height:1100}});
   const errors = [];
   page.on('pageerror', error => errors.push(String(error)));
   await page.goto('http://127.0.0.1:3001/tools/test-themed-stages.html');
   await page.locator('#review:not([disabled])').waitFor();
   await page.locator('#qa').evaluate(e => e.hidden=true);
   const expected = await page.evaluate(async ({unit,level}) => {
    const flow = window.themedReviewGame.registry.get('runFlow');
    const {createRun,rollParty} = await import('/src/run/runState.mjs');
    const form = level===1 ? unit : flow.catalog[unit].forms.find(f=>level===4?f.rank==='NV':f.rarity===level+4).form;
    for(let i=0;i<30000;i++){
     const seed='start-form-browser-'+i;
     const run=rollParty(createRun(seed,flow.catalog,undefined,flow.rules),flow.catalog);
     const slot=run.party.findIndex(m=>m.form===form);
     if(slot>=0)return {seed,slot,member:run.party[slot]};
    }
    throw Error('Seed for the requested form was not found');
   },{unit,level});
   await page.locator('#run-seed').fill(expected.seed);
   await page.locator('[data-action=play]').click();
   await page.locator('[data-action=spin]').click();
   await page.locator('[data-action=confirm]:enabled').waitFor();
   const reel=page.locator('.reel').nth(expected.slot);
   assert.equal(await reel.locator('.reel-form').textContent(),expected.member.rank??`${expected.member.rarity}★`);
   assert.equal(await reel.locator('.reel-variant').getAttribute('title'),`Original Unit ${expected.member.unitId}`);
   assert.match(await reel.locator('.reel-sprite').getAttribute('style'),new RegExp('/'+expected.member.form+'/'));
   await page.screenshot({path:`${output}/${unit}-level-${level}-reels.png`});
   await page.locator('[data-action=confirm]').click();
   if(level>=3){
    await page.reload();
    await page.locator('#review:not([disabled])').waitFor();
    await page.locator('#qa').evaluate(e => e.hidden=true);
    await page.locator('[data-action=continue]').click();
   }
   await page.waitForFunction(()=>window.themedReviewGame.scene.getScene('BattleScene').isRunCommandWindow());
   await page.screenshot({path:`${output}/${unit}-level-${level}-battle.png`});
   const action=await page.evaluate(async ({member,finishBattle})=>{
    const game=window.themedReviewGame,flow=game.registry.get('runFlow'),scene=game.scene.getScene('BattleScene');
    const actor=scene.turnOrder.find(hero=>hero.unitKey===member.key);
    const skill=scene.unitSkills[member.key][0];
    const saved=flow.store.load().party.find(m=>m.key===member.key);
    if(JSON.stringify(saved)!==JSON.stringify(member)||actor.visualKey!==member.form||
       String(actor.manifest.unitId)!==member.unitId||actor.currentHp!==member.hp||
       actor.maxHp!==member.hp||skill.id!==member.skills[0].id)
     throw Error('Saved form, actor, health or Source skill differs from the draw');
    await scene.preparedScenes.ready;
    const clips=new Set([actor.anims.currentAnim?.key]);
    const layeredClips=new Set();
    const checkLayers=()=>{
     if(!actor.manifest.animations[actor.currentAnimKey]?.bodyLayers)return;
     const layer=scene.children.list.find(item=>item.texture?.key===actor.texture.key+'_emission'
      &&item.visible&&item.x===actor.x&&item.y===actor.y&&item.frame.name===actor.frame.name);
     if(layer&&layer.originX===actor.originX&&layer.originY===actor.originY&&layer.flipX===actor.flipX&&layer.blendMode===1)
      layeredClips.add(actor.currentAnimKey);
    };
    scene.events.on('postupdate',checkLayers);
    checkLayers();
    actor.on('animationstart',animation=>clips.add(animation.key));
    const mp=actor.currentMp;
    scene.selectHero(actor);
    scene.openHeroCommands(actor);
    scene.skillButtons[0].bg.emit('pointerdown');
    scene.cmdExecuteBtnBg.emit('pointerdown');
    const deadline=performance.now()+30000;
    while((!actor.hasActed||scene.preparedScenes.snapshot().active)&&performance.now()<deadline)
     await new Promise(resolve=>setTimeout(resolve,25));
    if(!actor.hasActed||mp-actor.currentMp!==skill.mpCost||scene.preparedScenes.snapshot().errors.length)
     throw Error('Drawn Source skill did not complete correctly');
    const mpSpent=mp-actor.currentMp;
    if(finishBattle){
     const until=async predicate=>{
      const end=performance.now()+30000;
      while(!predicate()){
       if(performance.now()>end)throw Error('Timed out waiting for NV battle state');
       await new Promise(resolve=>setTimeout(resolve,25));
      }
     };
     for(let i=0;i<20&&flow.state.phase==='battle';i++){
      await until(()=>scene.isRunCommandWindow()||flow.state.phase!=='battle');
      if(flow.state.phase!=='battle')break;
      const next=scene.turnOrder.find(hero=>!hero.isDead&&!hero.hasActed);
      scene.selectHero(next);scene.openHeroCommands(next);
      scene.cmdAttackBtnBg.emit('pointerdown');scene.cmdExecuteBtnBg.emit('pointerdown');
      await until(()=>next.hasActed||flow.state.phase!=='battle');
     }
     await until(()=>document.querySelector('[data-phase=rewards]'));
     if(!actor.hasVictoryPose||!actor.texture.key.startsWith(member.form+'_'))
      throw Error('The drawn NV body did not retain its victory pose');
    }
    scene.events.off('postupdate',checkLayers);
    if(actor.manifest.animations.idle.bodyLayers&&!layeredClips.has('idle'))throw Error('Missing synchronized NV idle emission');
    return {form:actor.visualKey,unitId:actor.manifest.unitId,maxHp:actor.maxHp,skill:skill.id,mpSpent,clips:[...clips],layeredClips:[...layeredClips]};
   },{member:expected.member,finishBattle:args.includes('--finish-battle')});
   if(args.includes('--finish-battle'))await page.screenshot({path:`${output}/${unit}-victory.png`});
   if(args.includes('--finish-battle')){
    await page.locator('[data-action^="reward-"]').first().click();
    await page.waitForFunction(()=>window.themedReviewGame.scene.getScene('BattleScene').isRunCommandWindow());
    action.basicClips=await page.evaluate(async member=>{
     const scene=window.themedReviewGame.scene.getScene('BattleScene');
     const actor=scene.turnOrder.find(hero=>hero.unitKey===member.key);
     const clips=new Set();
     actor.on('animationstart',animation=>clips.add(animation.key));
     scene.selectHero(actor);scene.openHeroCommands(actor);
     scene.cmdAttackBtnBg.emit('pointerdown');scene.cmdExecuteBtnBg.emit('pointerdown');
     const end=performance.now()+20000;
     while(!actor.hasActed&&performance.now()<end)await new Promise(resolve=>setTimeout(resolve,25));
     if(!actor.hasActed||!clips.has(member.form+'_move')||!clips.has(member.form+'_atk')||
        Math.hypot(actor.x-actor.homeSlot.x,actor.y-actor.homeSlot.y)>.01)
      throw Error('NV basic attack did not play its own movement/attack and return home');
     return [...clips];
    },expected.member);
   }
   assert.deepEqual(errors,[]);
   results.push({unit,level,seed:expected.seed,reloaded:level>=3,...action});
   console.log('PASS drawn start',unit,level,action.skill);
   await page.close();
  }
 }
 await fs.writeFile(output+'/receipt.json',JSON.stringify({passed:true,results},null,2));
}finally{await browser.close();}
