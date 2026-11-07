import fs from 'node:fs/promises';import{createRequire}from'node:module';
const args=process.argv.slice(2),arg=(k,f)=>args.includes(k)?args[args.indexOf(k)+1]:f;
const{chromium}=createRequire(import.meta.url)(arg('--playwright','playwright'));
const output=arg('--output','tools/data/crystal-forms-lever-20261102/lever');await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
async function measureLayout(page){
 return page.evaluate(()=>{
  const rect=selector=>document.querySelector(selector).getBoundingClientRect();
  const housing=rect('.slot-machine'),lever=rect('.slot-lever'),ball=rect('.lever-ball');
  const reels=[...document.querySelectorAll('.reel')].map(e=>e.getBoundingClientRect());
  const centerX=r=>r.left+r.width/2;
  return {
   housingOffset:centerX(housing)-innerWidth/2,
   reelOffset:(centerX(reels[0])+centerX(reels[2]))/2-centerX(housing),
   leverFits:lever.left>=0&&lever.right<=innerWidth&&lever.top>=0&&lever.bottom<=innerHeight,
   clearsReels:lever.left>=reels[2].right,
   ballX:centerX(ball),ballY:ball.top+ball.height/2,gripHeight:ball.top+ball.height/2-lever.top
  };
 });
}
function assertLayout(layout){
 if(Math.abs(layout.housingOffset)>.5||Math.abs(layout.reelOffset)>.5||!layout.leverFits||!layout.clearsReels)
  throw Error('Slot layout is off-center, clipped or overlaps reels: '+JSON.stringify(layout));
}
try{for(const mode of ['click','drag','partial-drag','keyboard','skip','reduced']){
 const p=await browser.newPage({viewport:{width:900,height:1100},reducedMotion:mode==='reduced'?'reduce':'no-preference'}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:3001/tools/test-themed-stages.html');await p.locator('#review:not([disabled])').waitFor();await p.locator('#qa').evaluate(e=>e.hidden=true);
 if(await p.locator('.crystal-sigil').textContent()!==String.fromCodePoint(0x25c6))throw Error('Original crystal glyph corrupted');
 const crystal=await p.locator('.crystal-sigil').evaluate(e=>[
  getComputedStyle(e).animationName,getComputedStyle(e,'::before').animationName
 ]);
 const expectedCrystal=mode==='reduced'?['none','none']:['crystal-hover','crystal-aura'];
 if(JSON.stringify(crystal)!==JSON.stringify(expectedCrystal))throw Error('Crystal animation/reduced motion mismatch');
 const sparkLayer=await p.locator('.crystal-sparks').elementHandle();
 if(mode==='click'){
  const frames=[];
  for(let index=0;index<12;index++){
   frames.push(await sparkLayer.evaluate(layer=>Array.from(layer.children,spark=>({
    position:spark.style.getPropertyValue('--spark-x')+' / '+spark.style.getPropertyValue('--spark-y'),
    opacity:Number(getComputedStyle(spark).opacity)
   }))));
   await p.locator('.crystal-stage').screenshot({path:output+`/crystal-${String(index+1).padStart(2,'0')}.png`});
   await p.waitForTimeout(420);
  }
  const positions=new Set(frames.flat().map(spark=>spark.position));
  if(positions.size<3||frames.some(frame=>frame.length>2)||!frames.flat().some(spark=>spark.opacity>.6))
   throw Error('Crystal sparkles did not vary over time');
  await fs.writeFile(output+'/crystal-timeline.json',JSON.stringify(frames,null,2));
  await p.emulateMedia({reducedMotion:'reduce'});
  await p.waitForFunction(()=>!document.querySelector('.crystal-sparks').children.length);
  await p.emulateMedia({reducedMotion:'no-preference'});
  await p.locator('.crystal-sparks i').first().waitFor({state:'attached'});
  await p.screenshot({path:output+'/title-repaired.png'});
 }
 if(mode==='reduced'&&await sparkLayer.evaluate(layer=>layer.children.length||getComputedStyle(layer).display!=='none'))
  throw Error('Crystal sparkles enabled in reduced motion');
 await p.locator('#run-seed').fill('lever-repeatable');await p.locator('[data-action=play]').click();
 if(await sparkLayer.evaluate(layer=>layer.isConnected||layer.children.length))throw Error('Crystal sparkles survived leaving the menu');
 const placeholders=await p.locator('.reel b').allTextContents();
 const pulses=await p.locator('.unknown-crystal').evaluateAll(nodes=>nodes.map(e=>getComputedStyle(e).animationName));
 if(placeholders.length!==3||placeholders.some(label=>label!=='???')||pulses.length!==3||
    pulses.some(name=>name!==(mode==='reduced'?'none':'slot-crystal-pulse'))||
    await p.locator('.reroll-count.is-revealed').count())
  throw Error('Unexpected presentation before the first draw');
 const rest=await measureLayout(p);assertLayout(rest);
 if(mode==='click'){
  await p.screenshot({path:output+'/lever-before.png'});
  for(const viewport of [{width:1280,height:800},{width:520,height:900}]){
   await p.setViewportSize(viewport);assertLayout(await measureLayout(p));
   await p.screenshot({path:output+`/centered-${viewport.width}.png`});
  }
  await p.setViewportSize({width:900,height:1100});
 }
 let expected=await p.evaluate(async()=>{const f=window.themedReviewGame.registry.get('runFlow'),{rollParty}=await import('/src/run/runState.mjs');return rollParty(f.state,f.catalog);});
 const read=()=>p.evaluate(()=>{const f=window.themedReviewGame.registry.get('runFlow');return {state:structuredClone(f.state),busy:f.snapshot().busy};});
 const before=await read();let dragTransform;
 async function drag(distance){
  const {ballX:x,ballY:y}=await measureLayout(p);
  await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x,y+distance/2,{steps:6});
  const pulled=await measureLayout(p);assertLayout(pulled);
  dragTransform={x:pulled.ballX-x,y:pulled.ballY-y};
  if(Math.abs(dragTransform.x)>.5||dragTransform.y<=0||(await read()).state.party.length)
   throw Error('Lever did not move straight down before the draw');
  await p.mouse.move(x,y+distance,{steps:6});await p.mouse.up();
 }
 if(mode==='partial-drag'){
  await drag(35);
  await p.waitForFunction(()=>document.querySelector('.lever-arm').style.getPropertyValue('--lever-pull')==='0');
  if(JSON.stringify((await read()).state)!==JSON.stringify(before.state))throw Error('Partial drag consumed roster RNG');
  await drag(105);
 }
 else if(mode==='drag')await drag(105);
 else if(mode==='keyboard'){await p.locator('.slot-lever').focus();await p.keyboard.press('Enter');}
 else if(mode==='skip')await p.evaluate(()=>{document.querySelector('.slot-lever').click();document.querySelector('[data-action=lever-skip]').click();});
 else await p.locator('.slot-lever').dblclick();
 await p.waitForFunction(()=>window.themedReviewGame.registry.get('runFlow').state.party.length===3);
 if(mode==='click'){
  const delays=await p.locator('.is-drawing .machine-lights i').evaluateAll(nodes=>nodes.map(e=>getComputedStyle(e).animationDelay));
  if(delays.join(',')!=='0s,0.08s,0.16s,0.24s,0.32s'||await p.locator('.reroll-count.is-revealed').count())
   throw Error('First draw should sweep the lights and keep rerolls muted');
  const arm=p.locator('.is-returning .lever-arm');
  await arm.evaluate(e=>{const spring=e.getAnimations()[0];spring.pause();spring.currentTime=0;});
  const bottom=await measureLayout(p);assertLayout(bottom);
  if(Math.abs(bottom.ballX-rest.ballX)>.5||bottom.gripHeight-rest.gripHeight<130)throw Error('Wrong lower stop');
  await p.screenshot({path:output+'/lever-down.png'});
  await arm.evaluate(e=>e.getAnimations()[0].play());
  await p.waitForFunction(()=>Math.abs(Number(getComputedStyle(document.querySelector('.lever-arm')).getPropertyValue('--lever-pull')))<.001);
 }
 if((await read()).busy)await p.locator('[data-action=skip]').click();
 if(!await p.locator('.reroll-count.is-revealed').isVisible())throw Error('Rerolls not highlighted after reveal');
 if(JSON.stringify((await read()).state)!==JSON.stringify(expected))throw Error('Lever changed committed results/RNG: '+mode);
 if((await read()).state.rerolls!==3||await p.locator('.slot-lever').isDisabled())throw Error('First draw was not free');
 if(await p.locator('button.reel,[data-action^="reroll-"]').count())throw Error('Individual reel controls remain');
 await p.locator('.reel').first().click();
 if(JSON.stringify((await read()).state)!==JSON.stringify(expected))throw Error('A reel click changed the team');
 const rerolls={click:3,drag:2,'partial-drag':1,keyboard:0,skip:3,reduced:3}[mode];
 for(let i=0;i<rerolls;i++){
  expected=await p.evaluate(async state=>{const{rollParty}=await import('/src/run/runState.mjs');return rollParty(state,window.themedReviewGame.registry.get('runFlow').catalog);},expected);
  await p.locator('.slot-lever').dblclick();
  await p.waitForFunction(remaining=>window.themedReviewGame.registry.get('runFlow').state.rerolls===remaining,2-i);
  if(mode!=='reduced'){
   if(await p.locator('.reel.is-spinning .reel-tape').count()!==3)throw Error('A team reroll did not spin all three reels');
   if(mode==='click'&&i===0)await p.locator('.reel.is-spinning').first().waitFor({state:'detached'});
   else await p.locator('[data-action=skip]').click();
  }
  if(JSON.stringify((await read()).state)!==JSON.stringify(expected))throw Error('Reroll sequence mismatch');
 }
 await p.reload();await p.locator('#review:not([disabled])').waitFor();await p.locator('[data-action=continue]').click();const restored=await read();
 if(JSON.stringify(restored.state)!==JSON.stringify(expected)||restored.state.rerolls!==3-rerolls||new Set(restored.state.party.map(m=>m.canonicalIdentity)).size!==3||errors.length)throw Error('Restored lever/party invalid');
 if(await p.locator('.slot-lever').isDisabled()!==(rerolls===3))throw Error('Restored lever availability does not match remaining rerolls');
 if(mode==='click'){
  await p.locator('#qa').evaluate(e=>e.hidden=true);
  await p.screenshot({path:output+'/lever-final-party.png'});
 }
 await p.locator('[data-action=confirm]').click();
 const active=await read();
 if(active.state.phase!=='battle'||JSON.stringify(active.state.party)!==JSON.stringify(expected.party))throw Error('Team confirmation failed');
 if(mode==='click'){
  await p.reload();await p.locator('#review:not([disabled])').waitFor();await p.locator('[data-action=continue]').click();
  if(JSON.stringify((await read()).state)!==JSON.stringify(active.state))throw Error('Resuming battle changed the saved run');
 }
 results.push({mode,rerolls,passed:true,crystal,dragTransform,state:restored.state,errors});console.log('PASS lever',mode);await p.close();
}await fs.writeFile(output+'/receipt.json',JSON.stringify({passed:true,scope:'Actual title/setup UI. Full team draws, double-click protection, reload and team confirmation after zero to three rerolls.',results},null,2));}finally{await browser.close();}
