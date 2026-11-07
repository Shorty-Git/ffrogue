// Production scene fixtures for stage lifetime/cache/failure, independent of save QA.
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const args=process.argv.slice(2),arg=(k,f)=>args.includes(k)?args[args.indexOf(k)+1]:f;
const {chromium}=createRequire(import.meta.url)(arg('--playwright','playwright'));
const output=arg('--output','tools/data/stage-loading-20261102/stage-runtime');await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
async function entry(page,encounter){return page.evaluate(async encounter=>{
 const game=window.themedReviewGame,flow=game.registry.get('runFlow');game.scene.stop('BattleScene');
 const {createRun,rollParty,confirmParty}=await import('/src/run/runState.mjs');const state=confirmParty(rollParty(createRun('qa-themes-78',flow.catalog),flow.catalog));
 state.encounter=encounter;flow.state=state;flow.store.save(state);flow.route();return structuredClone(state);
},encounter);}
try{
 const page=await browser.newPage({viewport:{width:900,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:3001/tools/test-themed-stages.html');await page.locator('#review:not([disabled])').waitFor();
 const saved=await entry(page,2);await page.waitForFunction(()=>window.themedReviewGame.scene.getScene('BattleScene').isRunCommandWindow());
 await page.locator('#qa').evaluate(e=>e.hidden=true);await page.screenshot({path:output+'/reactor-animated-a.png'});
 const timeline=await page.evaluate(async()=>{
  const s=window.themedReviewGame.scene.getScene('BattleScene'),frames=[];const start=performance.now();
  while(performance.now()-start<8500){frames.push({...s.stageAnimationSnapshot(),time:performance.now()-start});await new Promise(r=>setTimeout(r,25));}
  if(!frames.some((f,i)=>i&&f.frame<frames[i-1].frame))throw Error('Original stage loop never wrapped');
  return frames;
 });await page.screenshot({path:output+'/reactor-animated-b.png'});
 const beforeReload=await page.evaluate(()=>{const g=window.themedReviewGame;return {saved:JSON.parse(localStorage.getItem('ffrogue.run.v1')),textures:g.textures.getTextureKeys().length};});
 if(JSON.stringify(saved)!==JSON.stringify(beforeReload.saved))throw Error('Decorative stage consumed gameplay RNG/state');
 await page.reload();await page.locator('[data-action=continue]').click();await page.waitForFunction(()=>window.themedReviewGame?.scene.getScene('BattleScene').isRunCommandWindow());
 const resumed=await page.evaluate(()=>({saved:JSON.parse(localStorage.getItem('ffrogue.run.v1')),stage:window.themedReviewGame.scene.getScene('BattleScene').stageAnimationSnapshot()}));
 if(JSON.stringify(resumed.saved)!==JSON.stringify(saved)||!resumed.stage)throw Error('Arena reload changed run');
 const requests=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>new URL(r.name).pathname.startsWith('/assets/')).length);
 await entry(page,3);await page.waitForFunction(()=>{const s=window.themedReviewGame.scene.getScene('BattleScene');return s.isRunCommandWindow()&&s.runContext.state.encounter===3;});
 const cached=await page.evaluate(()=>({requests:performance.getEntriesByType('resource').filter(r=>new URL(r.name).pathname.startsWith('/assets/')).length,stage:window.themedReviewGame.scene.getScene('BattleScene').stageAnimationSnapshot()}));
 // Only the new boss idle/atk sheets may be added; the stage atlas is reused.
 if(cached.requests-requests!==2)throw Error('Unexpected repeated arena/body loading: '+(cached.requests-requests));
 results.push({kind:'stage-loop-reload-cache',timeline,resumed,cached,addedAssetRequests:cached.requests-requests,errors});await page.close();
 const blocked=await browser.newPage({viewport:{width:900,height:1100}});await blocked.route('**/assets/units/jack/atk.png',r=>r.abort());
 await blocked.goto('http://127.0.0.1:3001/tools/test-themed-stages.html');await blocked.locator('#review:not([disabled])').waitFor();const checkpoint=await entry(blocked,0);
 await blocked.waitForFunction(()=>window.themedReviewGame.scene.getScene('BattleScene').children.list.some(o=>o.text?.startsWith('Battle assets unavailable.')));
 const failure=await blocked.evaluate(()=>{const s=window.themedReviewGame.scene.getScene('BattleScene');return {commandWindow:s.isRunCommandWindow(),actors:s.turnOrder.length,state:JSON.parse(localStorage.getItem('ffrogue.run.v1'))};});
 if(failure.commandWindow||failure.actors||JSON.stringify(failure.state)!==JSON.stringify(checkpoint))throw Error('Missing body clip allowed battle or changed saved resources');
 await blocked.screenshot({path:output+'/missing-clip-blocked.png'});results.push({kind:'missing-body-fails-closed',failure});await blocked.close();
 if(errors.length)throw Error(errors.join(';'));await fs.writeFile(output+'/receipt.json',JSON.stringify({passed:true,conditions:'Controlled encounter-entry fixtures and one intentionally aborted body PNG. Full gameplay is validated by the separate expedition/Source reviews.',results},null,2));console.log('PASS original stage loop, reload, reuse and missing-body admission barrier');
}finally{await browser.close();}
