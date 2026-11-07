import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.argv[2]??'playwright');
const output=process.argv[3];
const all=process.argv.includes('--all');
const base=process.argv.includes('--base');
const layered=process.argv.includes('--layered');
const motion=process.argv.includes('--motion');
const cast=process.argv.includes('--cast');
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try {
 const page=await browser.newPage({viewport:{width:900,height:1100}});
 const errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 await page.goto('http://127.0.0.1:3001/tools/test-themed-stages.html');
 await page.locator('#review:not([disabled])').waitFor();
 const cases=await page.evaluate(async ({all,base})=>{
  const {createRun,rollParty}=await import('/src/run/runState.mjs');
  const flow=window.themedReviewGame.registry.get('runFlow');
  const targets=base?Object.keys(flow.catalog):all?Object.values(flow.catalog).flatMap(c=>[c.form,...c.forms.map(f=>f.form)])
   :['cloud_nv','delita_nv','aerith_form7','cloud_ac_form7'];
  const pending=new Set(targets), results={};
  for(let i=0;pending.size&&i<30000;i++){
   const seed='aura-roster-'+i;
   const state=rollParty(createRun(seed,flow.catalog,undefined,flow.rules),flow.catalog);
   state.party.forEach((member,slot)=>{
    if(pending.delete(member.form))results[member.form]={seed,slot};
   });
  }
  if(pending.size)throw Error('Missing reproducible form seeds '+Array.from(pending).join(', '));
  return targets.map(form=>({form,...results[form]}));
 },{all,base});
 await page.close();
 for(const entry of cases){
  const {form,seed,slot}=entry;
  const p=await browser.newPage({viewport:{width:900,height:1100},reducedMotion:'reduce'});
  p.on('pageerror',error=>errors.push(String(error)));
  await p.goto('http://127.0.0.1:3001/tools/test-themed-stages.html');
  await p.locator('#review:not([disabled])').waitFor();
  await p.locator('#qa').evaluate(e=>e.hidden=true);
  await p.locator('#run-seed').fill(seed);
  await p.locator('[data-action=play]').click();
  await p.locator('[data-action=spin]').click();
  await p.locator('[data-action=confirm]:enabled').waitFor();
  const reel=p.locator('.reel').nth(slot);
  const preview=await reel.locator('.reel-sprite').evaluate(async element=>{
   const emission=element.querySelector('.body-emission');
   const get=async node=>{
    const css=getComputedStyle(node).backgroundImage;
    const image=new Image();
    image.src=css.slice(5,-2);
    await image.decode();
    return image.src;
   };
   return {body:await get(element),light:emission?await get(emission):null,blend:emission?getComputedStyle(emission).mixBlendMode:null};
  });
  assert.ok(preview.body.includes('/'+form+'/'));
  if(preview.light)assert.equal(preview.blend,'plus-lighter');
  const selected=['cloud_nv','delita_nv','aerith_form7','cloud_ac_form7'].includes(form);
  if(selected)await p.screenshot({path:output+'/'+form+'-reels.png'});
  if(selected&&motion){
   const light=await p.addStyleTag({content:'.reel-window{background:#8e9caa}'});
   await p.screenshot({path:output+'/'+form+'-reels-light.png'});
   await light.evaluate(element=>element.remove());
  }
  await p.locator('[data-action=confirm]').click();
  if(selected&&layered){
   await p.reload();
   await p.locator('#review:not([disabled])').waitFor();
   await p.locator('[data-action=continue]').click();
  }
  await p.waitForFunction(()=>window.themedReviewGame.scene.getScene('BattleScene').isRunCommandWindow());
  await p.locator('#qa').evaluate(e=>e.hidden=true);
  const battle=await p.evaluate(async ({slot,form})=>{
   const scene=window.themedReviewGame.scene.getScene('BattleScene');
   const actor=scene.turnOrder.find(h=>h.visualKey===form);
   const sample=async clip=>{
    actor.playAnimation(clip);
    await new Promise(resolve=>scene.events.once('postupdate',()=>resolve()));
    const overlay=scene.children.list.find(item=>item.texture?.key===actor.texture.key+'_emission'&&item.visible&&item.x===actor.x&&item.y===actor.y);
    if(overlay&&(overlay.frame.name!==actor.frame.name||overlay.originX!==actor.originX||overlay.originY!==actor.originY||overlay.scaleX!==actor.scaleX||overlay.blendMode!==1))throw Error('Emission misaligned');
    return {clip,expected:Boolean(actor.manifest.animations[clip].bodyLayers),overlay:Boolean(overlay)};
   };
   const clips=[];
   for(const clip of ['idle','move','atk','win_before'])if(actor.manifest.animations[clip])clips.push(await sample(clip));
   await sample('idle');
   actor.anims.pause();
   return {form:actor.visualKey,slot,clips};
  },{slot,form});
  for(const clip of battle.clips)assert.equal(clip.overlay,clip.expected,form+' '+clip.clip);
  if(layered)assert.equal(Boolean(preview.light),battle.clips[0].expected);
  if(selected)await p.screenshot({path:output+'/'+form+'-battle.png'});
  if(motion&&form==='cloud_nv'){
   for(let i=0;i<4;i++){
    await p.evaluate(async ({form,index})=>{
     const scene=window.themedReviewGame.scene.getScene('BattleScene');
     const actor=scene.turnOrder.find(h=>h.visualKey===form);
     actor.setFrame(index);
     await new Promise(resolve=>scene.events.once('postupdate',resolve));
    },{form,index:i});
    await p.screenshot({path:output+'/cloud-motion-'+i+'.png'});
   }
  }
  if(cast){
   battle.action=await p.evaluate(async form=>{
    const scene=window.themedReviewGame.scene.getScene('BattleScene');
    const actor=scene.turnOrder.find(h=>h.visualKey===form);
    await scene.preparedScenes.ready;
    actor.anims.resume();
    scene.openHeroCommands(actor);
    const skill=scene.unitSkills[actor.unitKey][0],before=actor.currentMp;
    scene.skillButtons[0].bg.emit('pointerdown');
    scene.cmdExecuteBtnBg.emit('pointerdown');
    const end=performance.now()+30000;
    while(!actor.hasActed&&performance.now()<end)await new Promise(resolve=>setTimeout(resolve,20));
    if(!actor.hasActed||before-actor.currentMp!==skill.mpCost||scene.preparedScenes.snapshot().errors.length)
     throw Error('Source action failed in '+form);
    return {skill:skill.id,mp:before-actor.currentMp};
   },form);
  }
  results.push({...entry,preview,battle});
  console.log('PASS',form,preview.light?'layered preview':'flat preview',battle.clips.map(x=>x.clip+':'+x.overlay).join(','));
  await p.close();
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(output+'/receipt.json',JSON.stringify(results,null,2)+'\n');
}finally{await browser.close();}
