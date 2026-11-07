// Isolated browser acceptance for the actual game and existing run review pages.
// Use an already installed Playwright module and Chrome; never a user's profile.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const args=process.argv.slice(2),arg=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const require=createRequire(import.meta.url),{chromium}=require(arg('--playwright','playwright'));
const origin=arg('--origin','http://127.0.0.1:3001'),sink=arg('--capture-origin','http://127.0.0.1:3159');
const output=arg('--output','tools/data/reward-overlay-20261102');await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:arg('--channel','chrome'),headless:true});
const records=[],errors=[];
const assert=(v,message)=>{if(!v)throw Error(message);};
async function animationEnd(page){await page.waitForFunction(()=>[...document.querySelectorAll('.reward-option')].flatMap(e=>e.getAnimations()).every(a=>a.playState==='finished'),{},{timeout:5000});}
async function snapshot(page,label){
 await animationEnd(page);
 const data=await page.evaluate(async()=>{
  const entry=performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/main.ts').name;
  const {game}=await import(entry),scene=game.scene.getScene('BattleScene'),canvas=game.canvas.getBoundingClientRect();
  const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
  const cards=[...document.querySelectorAll('.reward-card')].map(e=>({...rect(e),font:parseFloat(getComputedStyle(e.querySelector('p')).fontSize)}));
  const party=scene.runPartyBounds().map(b=>({left:canvas.left+b.left*canvas.width/scene.scale.width,right:canvas.left+b.right*canvas.width/scene.scale.width,top:canvas.top+b.top*canvas.height/scene.scale.height,bottom:canvas.top+b.bottom*canvas.height/scene.scale.height}));
  const cover=party.map(p=>cards.reduce((sum,c)=>sum+Math.max(0,Math.min(p.right,c.right)-Math.max(p.left,c.left))*Math.max(0,Math.min(p.bottom,c.bottom)-Math.max(p.top,c.top)),0)/Math.max(1,(p.right-p.left)*(p.bottom-p.top)));
  const root=document.querySelector('.victory-overlay'),shell=root.querySelector('.rpg-shell');
  return {viewport:{width:innerWidth,height:innerHeight},cards,party,partyCoveredFraction:cover,shell:rect(shell),rootBackground:getComputedStyle(root).backgroundColor,shellBackground:getComputedStyle(shell).backgroundImage,dim:getComputedStyle(root,'::before').backgroundColor,hud:{y:scene.bottomHudContainer.y,alpha:scene.bottomHudContainer.alpha,commandsVisible:scene.commandPanel.visible},sceneActive:scene.sys.isActive(),state:scene.combatState,poses:scene.turnOrder.map(h=>h.currentAnimKey),saved:JSON.parse(localStorage.getItem('ffrogue.run.v1')),horizontalOverflow:document.documentElement.scrollWidth>innerWidth};
 });
 assert(data.sceneActive&&data.state==='VICTORY','Real victory scene missing');assert(data.hud.y===0&&data.hud.alpha>0,'HUD replaced by empty space');
 assert(data.hud.commandsVisible,'Command surface left blank');
 assert(data.shellBackground==='none'&&data.rootBackground==='rgba(0, 0, 0, 0)','Opaque reward container returned');
 assert(data.cards.length===3&&!data.horizontalOverflow,'Three cards/viewport overflow');
 for(const c of data.cards)assert(c.left>=0&&c.right<=data.viewport.width&&c.top>=0&&c.bottom<=data.viewport.height&&c.font>=12,'Card/button clipped or text reduced below12px');
 assert(data.partyCoveredFraction.every(f=>f<.25),'Cards unnecessarily obscure the party');
 await page.screenshot({path:path.join(output,label+'.png')});records.push({label,...data});console.log('CAPTURE',label,JSON.stringify({viewport:data.viewport,partyCoveredFraction:data.partyCoveredFraction}));return data;
}
async function resize(page,width,height){await page.setViewportSize({width,height});await page.waitForFunction(()=>{const c=document.querySelector('canvas').getBoundingClientRect(),p=document.querySelector('.victory-overlay .rpg-shell').getBoundingClientRect();return c.width<=innerWidth+.5&&c.height<=innerHeight+.5&&p.right<=innerWidth&&p.bottom<=innerHeight;},{},{timeout:10000});}
try{
 const context=await browser.newContext({viewport:{width:900,height:1100}}),page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(origin+'/tools/test-run-victory.html?captureOrigin='+sink);
 await page.locator('#review:not([disabled])').waitFor({timeout:45000});await page.locator('#review').click();
 await page.locator('#advance:not([hidden])').waitFor({timeout:120000});await page.locator('#qa').evaluate(e=>e.hidden=true);
 const before=await snapshot(page,'after-centered');
 await resize(page,375,667);await snapshot(page,'after-375x667');await resize(page,375,560);await snapshot(page,'after-short-375x560');
 await page.locator('.reward-details summary').first().click();await page.locator('.reward-details[open] .reward-explanation').waitFor();
 assert(await page.locator('.reward-details[open] .reward-explanation p').isVisible(),'Full description missing');await page.getByRole('button',{name:'Close details'}).first().click();
 await page.emulateMedia({reducedMotion:'reduce'});assert(await page.locator('.reward-option').first().evaluate(e=>getComputedStyle(e).animationName)==='none','Reduced motion ignored');
 await page.emulateMedia({reducedMotion:'no-preference'});await resize(page,900,1100);await animationEnd(page);
 assert(JSON.stringify(before.saved)===JSON.stringify(await page.evaluate(()=>JSON.parse(localStorage.getItem('ffrogue.run.v1')))),'Presentation consumed run state/RNG');
 await page.locator('#qa').evaluate(e=>e.hidden=false);await page.locator('#advance').click();await page.locator('#report').filter({hasText:'PASS:'}).waitFor({timeout:45000});
 await fs.copyFile('tools/data/visual-preservation/product-review/receipt.json',path.join(output,'victory-reloads-browser.json'));
 await context.close();
 const runContext=await browser.newContext({viewport:{width:900,height:1100}}),run=await runContext.newPage();run.on('pageerror',e=>errors.push(String(e)));
 await run.goto(origin+'/tools/test-run-loop.html?captureOrigin='+sink+'&inspect=all');await run.locator('#review:not([disabled])').waitFor({timeout:45000});await run.locator('#review').click();
 for(let i=0;i<4;i++){
  await run.locator('#advance:not([hidden])').waitFor({timeout:120000});await run.locator('#qa').evaluate(e=>e.hidden=true);
  if(i===1){const boss=await snapshot(run,'boss-special-reward');assert(boss.saved.offers.some(r=>r.type==='evolve'),'Special boss reward absent');}
  await run.locator('#qa').evaluate(e=>e.hidden=false);await run.locator('#advance').click();
 }
 await run.locator('#qa-report').filter({hasText:/^(PASS|FAIL)/}).waitFor({timeout:45000});
 const runReport=await run.locator('#qa-report').textContent();
 assert(runReport.startsWith('PASS'),runReport);
 await fs.copyFile('tools/data/visual-preservation/product-review/receipt.json',path.join(output,'run-loop-browser.json'));
 await runContext.close();assert(errors.length===0,'Browser runtime errors: '+errors.join('; '));
 await fs.writeFile(path.join(output,'browser-review.json'),JSON.stringify({passed:true,browser:'isolated installed Chrome via Playwright',records,actualReloads:2,foughtEncounters:4,reducedMotionEmulated:true,fullDescriptionsChecked:true,pageErrors:errors},null,2));
 console.log('PASS: centered rewards, short viewports, real reloads and complete run');
}catch(error){await fs.writeFile(path.join(output,'browser-review-failed.json'),JSON.stringify({error:String(error),records,pageErrors:errors},null,2));throw error;}
finally{await browser.close();}
