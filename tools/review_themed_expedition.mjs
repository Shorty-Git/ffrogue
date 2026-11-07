// Isolated installed-browser QA; never uses a personal profile or forces victory.
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const args=process.argv.slice(2),arg=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const {chromium}=createRequire(import.meta.url)(arg('--playwright','playwright'));
const origin=arg('--origin','http://127.0.0.1:3001'),sink=arg('--capture-origin','http://127.0.0.1:3160'),output=arg('--output','tools/data/themed-stages-20261102');
await fs.mkdir(output,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});const records=[],errors=[];try{
 if(args.includes('--defeat-only')){await defeatFixture(browser);return;}
 if(args.includes('--entries-only')){await entryReview(browser);return;}
 const page=await browser.newPage({viewport:{width:900,height:1100}});page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(origin+'/tools/test-themed-stages.html?captureOrigin='+sink);await page.locator('#review:not([disabled])').waitFor({timeout:45000});await page.locator('#review').click();
 while(true){await page.waitForFunction(()=>window.reviewCheckpoint || /^(PASS|FAIL)/.test(document.querySelector('#report').textContent),{},{timeout:180000});let report=await page.locator('#report').textContent();if(report.startsWith('FAIL'))throw Error(report);if(report.startsWith('PASS')){console.log(report);break;}
 const label=await page.evaluate(()=>window.reviewCheckpoint);await page.locator('#qa').evaluate(e=>e.hidden=true);await page.screenshot({path:output+'/'+label+'.png'});records.push(label);console.log('CAPTURE',label);
 if(label==='mako_reactor-boss'){await page.setViewportSize({width:375,height:560});await page.waitForTimeout(300);await page.screenshot({path:output+'/reactor-boss-375x560.png'});await page.setViewportSize({width:900,height:1100});}
 await page.locator('#qa').evaluate(e=>e.hidden=false);await page.locator('#advance').click();await page.waitForFunction(previous=>window.reviewCheckpoint!==previous,label,{timeout:5000});
 }
 await fs.copyFile('tools/data/visual-preservation/product-review/receipt.json',output+'/themed-browser.json');if(errors.length)throw Error(errors.join(';'));await page.close();await defeatFixture(browser);await fs.writeFile(output+'/themed-browser-summary.json',JSON.stringify({passed:true,records,pageErrors:errors},null,2));
 }catch(e){const pages=browser.contexts().flatMap(c=>c.pages());const partial=await pages[0]?.evaluate(()=>window.themedReviewTrace??null).catch(()=>null);await fs.writeFile(output+'/themed-browser-failed.json',JSON.stringify({error:String(e),records,pageErrors:errors,partial},null,2));throw e;}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});

async function defeatFixture(browser){
 const page=await browser.newPage({viewport:{width:375,height:560}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(origin+'/tools/test-themed-stages.html');
 await page.locator('#review:not([disabled])').waitFor({timeout:45000});
 const entryState=await page.evaluate(async()=>{
  const game=window.themedReviewGame,flow=game.registry.get('runFlow');
  const {createRun,rollParty,confirmParty}=await import('/src/run/runState.mjs');
  // Explicit low-HP checkpoint fixture, not a claim of a naturally balanced defeat.
  const state=confirmParty(rollParty(createRun('qa-themes-78',flow.catalog),flow.catalog));
  state.encounter=3;state.party.forEach(m=>m.hp=1);flow.store.save(state);flow.state=state;flow.route();
  return state;
 });
 await page.waitForFunction(()=>window.themedReviewGame.scene.getScene('BattleScene').isRunCommandWindow(),{},{timeout:45000});
 await page.reload();await page.locator('[data-action=continue]').click();
 const result=await page.evaluate(async expected=>{
  const game=window.themedReviewGame,flow=game.registry.get('runFlow');
  const delay=ms=>new Promise(r=>setTimeout(r,ms)),check=(v,m)=>{if(!v)throw Error(m);};
  async function until(test,label){const end=performance.now()+90000;while(!test()){if(performance.now()>end)throw Error('Timeout: '+label);await delay(25);}}
  await until(()=>game.scene.isActive('BattleScene')&&game.scene.getScene('BattleScene').isRunCommandWindow(),'restored boss');
  const scene=game.scene.getScene('BattleScene'),actions=[],impacts=[];
  check(JSON.stringify(flow.state)===JSON.stringify(expected),'Live encounter checkpoint changed on actual reload');
  check(scene.enemies[0].assetKey==='guard_scorpion'&&scene.enemies[0].manifest.unitId==='4060810'&&scene.enemies[0].actionCursor===0,'Wrong restored original boss');
  scene.events.on('enemy-action',e=>actions.push(structuredClone(e)));scene.events.on('enemy-impact',e=>impacts.push(structuredClone(e)));
  for(let i=0;flow.state.phase==='battle'&&i<30;i++){
   await until(()=>scene.isRunCommandWindow()||flow.state.phase!=='battle','low-HP player turn');if(flow.state.phase!=='battle')break;
   const actor=scene.turnOrder.find(h=>!h.isDead&&!h.hasActed);check(actor,'Ready hero missing');scene.selectHero(actor);scene.openHeroCommands(actor);
   scene.cmdAttackBtnBg.emit('pointerdown');scene.cmdExecuteBtnBg.emit('pointerdown');await until(()=>actor.hasActed||flow.state.phase!=='battle','normal attack');
  }
  await until(()=>flow.state.phase==='lost'&&document.querySelector('[data-phase=result]'),'actual boss defeat');
  check(flow.state.party.every(m=>m.hp===0),'Party wipe snapshot not saved');check(impacts.some(i=>i.action.scope==='party'&&i.impacts.length===2),'Party burst did not exclude already-K.O. hero');
  return {passed:true,kind:'controlled-low-hp-boss-defeat',conditions:'Encounter3 checkpoint, all heroes1HP; actual basic commands and original boss attack body; no forced damage/victory/defeat call',actualReloads:1,actions,impacts,state:structuredClone(flow.state)};
 },entryState);
 await page.screenshot({path:output+'/controlled-boss-defeat.png'});
 await page.reload();await page.locator('[data-action=continue]').click();
 await page.locator('[data-phase=result]').waitFor();
 const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('ffrogue.run.v1')));
 if(JSON.stringify(persisted)!==JSON.stringify(result.state)||errors.length)throw Error('Defeat reload or browser error');
 await page.locator('[data-action=new]').click();await page.locator('[data-phase=menu]').waitFor();
 if(await page.evaluate(()=>localStorage.getItem('ffrogue.run.v1'))!==null)throw Error('Restart kept retired run');
 await fs.writeFile(output+'/defeat-fixture.json',JSON.stringify({...result,actualReloads:2,restartCleared:true,pageErrors:errors},null,2));
 console.log('PASS controlled boss defeat, live encounter reload, loss reload and clean restart');await page.close();
}

async function entryReview(browser){
 const page=await browser.newPage({viewport:{width:900,height:1100}}),records=[],errors=[];
 page.on('pageerror',e=>errors.push(String(e)));await page.goto(origin+'/tools/test-themed-stages.html');
 await page.locator('#review:not([disabled])').waitFor({timeout:45000});
 for(let encounter=0;encounter<4;encounter++){
  const record=await page.evaluate(async encounter=>{
   const game=window.themedReviewGame,flow=game.registry.get('runFlow');
   const {createRun,rollParty,confirmParty}=await import('/src/run/runState.mjs');
   game.scene.stop('BattleScene');const state=confirmParty(rollParty(createRun('qa-themes-78',flow.catalog),flow.catalog));state.encounter=encounter;
   flow.store.save(state);flow.state=state;flow.route();
   const delay=ms=>new Promise(r=>setTimeout(r,ms)),samples=[];let scene;
   for(let n=0;n<250;n++){
    scene=game.scene.getScene('BattleScene');if(scene.sys.isActive()&&scene.runContext.state===state&&scene.enemies.length){
     samples.push(scene.enemies.map(e=>({key:e.assetKey,bounds:e.sprite.getBounds(),scale:e.sprite.scaleX})));
     if(scene.isRunCommandWindow())break;
    }await delay(10);
   }
   if(!scene.isRunCommandWindow())throw Error('Entry did not unlock');
   for(const frame of samples)for(const e of frame)if(e.bounds.left<7.9||e.bounds.right>992.1||e.bounds.top<55.9||e.bounds.bottom>792.1)throw Error('Spawn body clipped: '+JSON.stringify(e));
   return {encounter,arena:scene.arenaKey,samples,settled:scene.enemies.map(e=>({key:e.assetKey,unitId:e.manifest.unitId,clip:e.sprite.anims.currentAnim.key}))};
  },encounter);
  const label=['whisperwood-normal','whisperwood-boss','mako_reactor-normal','mako_reactor-boss'][encounter];
  await page.locator('#qa').evaluate(e=>e.hidden=true);await page.screenshot({path:output+'/'+label+'.png'});
  if(encounter===3){await page.setViewportSize({width:375,height:560});await page.waitForTimeout(200);await page.screenshot({path:output+'/reactor-boss-375x560.png'});}
  records.push(record);
 }
 if(errors.length)throw Error(errors.join(';'));await fs.writeFile(output+'/spawn-bounds-browser.json',JSON.stringify({passed:true,conditions:'Production encounter-entry fixtures; samples cover original idle plus full materialization bounce, not additional played fights',records,pageErrors:errors},null,2));
 console.log('PASS all four original bodies through spawn bounce and final entry, desktop and short mobile');await page.close();
}
