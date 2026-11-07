// Isolated Chrome measurements; texture bytes are an estimate, not live VRAM.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const args=process.argv.slice(2),arg=(k,f)=>args.includes(k)?args[args.indexOf(k)+1]:f;
const {chromium}=createRequire(import.meta.url)(arg('--playwright','playwright'));
const output=arg('--output','tools/data/stage-loading-20261102/before.json'),records=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(let sample=0;sample<3;sample++){
 const context=await browser.newContext({viewport:{width:900,height:1100}}),page=await context.newPage(),errors=[];
 await page.addInitScript(()=>performance.setResourceTimingBufferSize(5000));
 page.on('pageerror',e=>errors.push(String(e)));
 const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
 const started=Date.now();await page.goto('http://127.0.0.1:3001/tools/test-themed-stages.html');
 await page.locator('#review:not([disabled])').waitFor({timeout:90000});
 async function snapshot(label,elapsed){const state=await page.evaluate(()=>{
  const game=window.themedReviewGame,rows=game.textures.getTextureKeys().flatMap(key=>game.textures.get(key).source.map(s=>({key,width:s.width,height:s.height,rgba8:s.width*s.height*4})));
  const resources=performance.getEntriesByType('resource').map(r=>({name:new URL(r.name).pathname,bytes:r.encodedBodySize,duration:r.duration}));
  return {textures:rows,textureRgba8Estimate:rows.reduce((a,r)=>a+r.rgba8,0),resources,encodedBytes:resources.reduce((a,r)=>a+r.bytes,0),bodyPngRequests:resources.filter(r=>/\/assets\/(?:units|monsters|forms)\/.*\.png$/.test(r.name)&&!r.name.includes('portrait')).length};
 });return {label,elapsedMs:elapsed,...state,jsHeap:await cdp.send('Runtime.getHeapUsage')};}
 const stages=[await snapshot('cold-title-ready',Date.now()-started)];
 const setup=Date.now();await page.locator('#run-seed').fill('qa-themes-78');await page.locator('[data-action=play]').click();await page.locator('[data-action=spin]').click();await page.locator('[data-action=skip]').click();
 stages.push(await snapshot('new-run-rolled',Date.now()-setup));const battle=Date.now();await page.locator('[data-action=confirm]').click();
 await page.waitForFunction(()=>window.themedReviewGame.scene.getScene('BattleScene').isRunCommandWindow(),{},{timeout:90000});
 stages.push(await snapshot('first-battle-ready',Date.now()-battle));
 const action=await page.evaluate(async()=>{
  const s=window.themedReviewGame.scene.getScene('BattleScene'),h=s.turnOrder.find(h=>!h.isDead&&!h.hasActed),f=window.themedReviewGame.registry.get('runFlow');
  const skill=f.catalog[h.unitKey].skills.find(x=>x.id===f.state.party.find(m=>m.key===h.unitKey).skills[0].id);
  s.selectHero(h);s.openHeroCommands(h);const t=performance.now(),mp=h.currentMp;
  s.events.once('combat-action',e=>window.measuredFirstAction=e);s.changeSkillPage(0);s.skillButtons[0].bg.emit('pointerdown');s.cmdExecuteBtnBg.emit('pointerdown');
  while(!h.hasActed&&performance.now()-t<30000)await new Promise(r=>setTimeout(r,10));
  if(!h.hasActed||mp-h.currentMp!==skill.mpCost||!window.measuredFirstAction)throw Error('First Source action failed');
  return {skill:skill.id,mpSpent:mp-h.currentMp,committed:window.measuredFirstAction,gameplayMs:performance.now()-t};
 });stages.push(await snapshot('first-source-gameplay-complete',action.gameplayMs));
 // Explicit entry fixtures measure asset readiness; the separate expedition QA plays every fight.
 for(const encounter of [1,2,3]){const t=Date.now();await page.evaluate(async encounter=>{
  const g=window.themedReviewGame,f=g.registry.get('runFlow');g.scene.stop('BattleScene');
  const {createRun,rollParty,confirmParty}=await import('/src/run/runState.mjs');const r=confirmParty(rollParty(createRun('qa-themes-78',f.catalog),f.catalog));r.encounter=encounter;f.state=r;f.store.save(r);f.route();
 },encounter);await page.waitForFunction(n=>{const s=window.themedReviewGame.scene.getScene('BattleScene');return s.isRunCommandWindow()&&s.runContext.state.encounter===n;},encounter,{timeout:90000});stages.push(await snapshot('entry-fixture-'+encounter,Date.now()-t));}
 if(errors.length)throw Error(errors.join(';'));records.push({sample,stages,action,errors});await context.close();console.log('Measured sample',sample);
 }
 await fs.mkdir(path.dirname(output),{recursive:true});
 await fs.writeFile(output,JSON.stringify({schema:'body-loading-measurement-v1',conditions:'Three fresh isolated Chrome contexts, HTTP cache disabled, localhost Vite development modules; no personal save. Entry fixtures are not additional played fights. JS heap excludes GPU/native image memory; RGBA8 is texel estimate, not VRAM.',records},null,2));
}finally{await browser.close();}
