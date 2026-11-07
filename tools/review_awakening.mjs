import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const args=process.argv.slice(2),arg=(k,f)=>args.includes(k)?args[args.indexOf(k)+1]:f;
const {chromium}=createRequire(import.meta.url)(arg('--playwright','playwright'));
const output=arg('--output','tools/data/awakening-polish-20261102/browser'),sink=arg('--capture-origin','http://127.0.0.1:3164');
await fs.mkdir(output,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[],tier=arg('--rarity','7');
try{
 const nv=args.includes('--nv');
 if(!args.includes('--fixtures-only'))for(const unit of (nv?['cloud','delita']:['cloud','aerith']).filter(unit=>!arg('--unit')||arg('--unit')===unit)){
  const page=await browser.newPage({viewport:{width:900,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const target=nv?unit+'_nv':unit+'_form'+tier;
  const policy=!nv&&tier==='7'?'highest-reviewed':'sequential';
  await page.goto(`http://127.0.0.1:3001/tools/test-run-awakening.html?unit=${unit}&form=${target}&policy=${policy}&startLevel=${nv?'3':arg('--start-level','1')}&captureOrigin=${sink}`);
  await page.locator('#review:not([disabled])').waitFor();await page.locator('#review').click();
  await page.locator('.awakening-overlay.is-ready').waitFor({timeout:180000});await page.waitForTimeout(900);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ffrogue.run.v1')));
  if(saved.party.find(m=>m.key===unit).form!==target||!saved.pendingAwakening)throw Error('Upgrade not committed before animation');
  if(nv&&await page.locator('.awakening-stars strong').textContent()!=='NV')throw Error('Awakening labels NV as a star rank');
  await page.locator('#qa').evaluate(e=>e.hidden=true);await page.screenshot({path:output+'/'+unit+'-awakening.png'});
  await page.waitForFunction(()=>/^(PASS|FAIL)/.test(document.querySelector('#report').textContent),{},{timeout:120000});
  const report=await page.locator('#report').textContent();if(!report.startsWith('PASS')||errors.length)throw Error(report+errors);
  const receipt=JSON.parse(await fs.readFile('tools/data/visual-preservation/product-review/receipt.json','utf8'));
  const action=receipt.results.find(r=>r.kind==='awakened-source-action');await fs.writeFile(output+'/'+unit+'-next-battle.png',Buffer.from(action.capture.split(',')[1],'base64'));
  delete action.capture;await fs.writeFile(output+'/'+unit+'-real-battles.json',JSON.stringify({...receipt,errors},null,2));results.push({unit,mode:'two-real-battles',passed:true});await page.close();console.log('PASS real awakening and next Source',unit);
 }
 for(const mode of nv?[]:['skip','reload-during','reload-after','reduced-motion']){
  const unit=mode==='reload-after'?'cloud':'aerith',page=await browser.newPage({viewport:{width:900,height:1100},reducedMotion:mode==='reduced-motion'?'reduce':'no-preference'}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:3001/tools/test-run-awakening.html');await page.locator('#review:not([disabled])').waitFor();
  const expected=await page.evaluate(async({unit,tier})=>{
   const game=window.awakeningReviewGame,flow=game.registry.get('runFlow'),{createRun,rollParty,confirmParty,completeBattle,chooseReward}=await import('/src/run/runState.mjs');
   for(let i=0;i<2000;i++){
    let state=confirmParty(rollParty(createRun('wake-fixture-'+i,flow.catalog,undefined,flow.rules),flow.catalog));
    if(!state.party.some(m=>m.key===unit))continue;
    // Controlled saved boss-reward checkpoint using the same draw and reward rules.
    state.encounter=1;state=completeBattle(state,flow.catalog,state.party.map(m=>({key:m.key,hp:m.hp,mp:m.mp})),true);
    const index=state.offers.findIndex(o=>o.type==='evolve'&&o.member===unit&&o.form===unit+'_form'+tier);
    if(index<0)continue;
    const evolved=chooseReward(state,index,flow.catalog).party.find(m=>m.key===unit);
    flow.store.save(state);flow.state=state;flow.route();
    return {index,stats:evolved.stats};
   }
   throw Error('No matching Awakening reward from the published catalog');
  },{unit,tier});
  await page.locator('.victory-overlay[data-phase=rewards]').waitFor({timeout:30000});
  await page.locator(`[data-action=reward-${expected.index}]`).click();
  if(mode!=='reduced-motion')await page.locator('.awakening-overlay.is-ready').waitFor();
  if(mode!=='reduced-motion'){
   const layers=await page.locator('.awakening-form').evaluateAll(forms=>forms.map(form=>({
    key:form.dataset.form,
    emission:form.querySelector('.body-emission')?.style.backgroundImage,
   })));
   if(layers.length!==2||!layers[1].emission?.includes('/'+layers[1].key+'/idle.emission.'))throw Error('Awakening did not use the updated idle light layer');
   if(mode==='skip')await page.screenshot({path:output+'/layered-awakening.png'});
  }
  if(mode==='skip'){const skip=page.locator('[data-action=awakening-skip]');await skip.evaluate(e=>{const stale=e.onclick;stale();stale();});}
  if(mode==='reload-during'){await page.reload();await page.locator('[data-action=continue]').click();}
  await page.waitForFunction(()=>{const s=window.awakeningReviewGame?.scene.getScene('BattleScene');return s?.isRunCommandWindow()&&s.runContext.state.encounter===2;},{},{timeout:30000});
  if(mode==='reload-after'){await page.reload();await page.locator('[data-action=continue]').click();await page.waitForFunction(()=>window.awakeningReviewGame?.scene.getScene('BattleScene').isRunCommandWindow());}
  const proof=await page.evaluate(unit=>{
   const g=window.awakeningReviewGame,f=g.registry.get('runFlow'),s=g.scene.getScene('BattleScene'),member=f.state.party.find(m=>m.key===unit),actor=s.turnOrder.find(a=>a.unitKey===unit);
   return {member,visualKey:actor.visualKey,texture:actor.texture.key,unitId:actor.manifest.unitId,pending:f.state.pendingAwakening??null,encounter:f.state.encounter,rewards:f.state.history.filter(h=>h.kind==='reward'),saved:JSON.parse(localStorage.getItem('ffrogue.run.v1')),uiModal:document.querySelector('#run-ui').getAttribute('aria-modal')};
  },unit);
  if(proof.visualKey!==unit+'_form'+tier||proof.texture!==unit+'_form'+tier+'_idle'||JSON.stringify(proof.member.stats)!==JSON.stringify(expected.stats)||proof.pending||proof.rewards.length!==1||proof.uiModal!==null||errors.length)throw Error('Awakening persistence/texture mismatch '+JSON.stringify({mode,proof,errors}));
  results.push({unit,mode,conditions:'Controlled saved boss reward checkpoint, real reward click/scene/render lifecycle',proof,errors,passed:true});await page.close();console.log('PASS',mode);
 }
 await fs.writeFile(output+'/awakening-summary.json',JSON.stringify({passed:true,results},null,2));
}finally{await browser.close();}
