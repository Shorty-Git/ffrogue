import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const args=process.argv.slice(2),arg=(k,f)=>args.includes(k)?args[args.indexOf(k)+1]:f;
const {chromium}=createRequire(import.meta.url)(arg('--playwright','playwright'));
const output=arg('--output','tools/data/awakening-polish-20261102/sampling');await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{const page=await browser.newPage({viewport:{width:900,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:3001/tools/test-themed-stages.html');await page.locator('#review:not([disabled])').waitFor();
 await page.evaluate(async()=>{
  const g=window.themedReviewGame,f=g.registry.get('runFlow'),{createRun,rollParty,confirmParty}=await import('/src/run/runState.mjs');
  const state=confirmParty(rollParty(createRun('qa-themes-78',f.catalog),f.catalog));state.encounter=2;f.store.save(state);f.state=state;f.route();
 });await page.waitForFunction(()=>window.themedReviewGame.scene.getScene('BattleScene').isRunCommandWindow());await page.locator('#qa').evaluate(e=>e.hidden=true);
 await page.evaluate(()=>{const s=window.themedReviewGame.scene.getScene('BattleScene');s.scene.pause();window.samplingSaved=s.stageAnimation.data.sampling;});
 const results=[];
 for(const frame of [30,90,150]){
  for(const mode of ['before','after']){
   const state=await page.evaluate(({frame,mode})=>{
    const g=window.themedReviewGame,s=g.scene.getScene('BattleScene'),stage=s.stageAnimation,d=stage.data;
    d.sampling=mode==='before'?undefined:window.samplingSaved;stage.frame=-1;stage.draw(frame);
    return {mode,...stage.snapshot(),packets:JSON.stringify(d.frames[frame]),originalSampler:g.textures.get('stage_reactor_0').source[0].scaleMode,
     softSamplers:d.textures.slice(1).map((_,i)=>g.textures.get('stage_reactor_'+(i+1)).source[0].scaleMode),
     bounds:s.runArenaBounds(),characters:s.turnOrder.map(h=>({form:h.visualKey,texture:h.texture.key,x:h.x,y:h.y}))};
   },{frame,mode});await page.screenshot({path:`${output}/${mode}-frame-${frame}.png`});results.push(state);
  }
  const [a,b]=results.slice(-2);if(a.packets!==b.packets||a.originalSampler!==b.originalSampler||b.softSamplers.some(x=>x!==0))throw Error('Geometry or hard-atlas sampler changed');
 }
 await page.evaluate(()=>{const s=window.themedReviewGame.scene.getScene('BattleScene');s.scene.resume();});
 if(errors.length)throw Error(errors.join(';'));await fs.writeFile(output+'/comparison.json',JSON.stringify({passed:true,conditions:'Actual production BattleScene at identical paused frame/camera/actors. Before disables only declared sampling overrides; packets and original atlas remain identical. FFRogue display adaptation, not native GPU evidence.',results,errors},null,2));console.log('PASS matched stage sampling frames30/90/150; exact packets and hard sampler preserved');
}finally{await browser.close();}
