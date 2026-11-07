import fs from 'node:fs/promises';import{createRequire}from'node:module';
const args=process.argv.slice(2),arg=(k,f)=>args.includes(k)?args[args.indexOf(k)+1]:f;
const{chromium}=createRequire(import.meta.url)(arg('--playwright','playwright'));
const output=arg('--output','tools/data/crystal-forms-lever-20261102/form-skills');await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
try{const p=await browser.newPage({viewport:{width:900,height:1100}}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:3001/tools/test-themed-stages.html');await p.locator('#review:not([disabled])').waitFor();await p.locator('#qa').evaluate(e=>e.hidden=true);
 const expanded=args.includes('--new-original-forms');
 const cases=expanded?await p.evaluate(()=>Object.values(window.themedReviewGame.registry.get('runFlow').catalog)
  .flatMap(c=>c.forms.filter(f=>f.rank==='NV'||!['cloud','aerith'].includes(c.key)).map(f=>({unit:c.key,form:f.form,batches:Math.ceil(c.skills.length/3)}))))
  :['cloud','aerith'].flatMap(unit=>[unit,unit+'_form7'].map(form=>({unit,form,batches:unit==='cloud'&&form.endsWith('form7')?2:1})));
 for(const {unit,form,batches} of cases){
  for(let batch=0;batch<batches;batch++){
   await p.evaluate(async({unit,form,batch,expanded})=>{
    const g=window.themedReviewGame,f=g.registry.get('runFlow'),{createRun,rollParty,confirmParty}=await import('/src/run/runState.mjs');g.scene.stop('BattleScene');
    let r;for(let i=0;i<1000;i++){r=confirmParty(rollParty(createRun('form-source-'+i,f.catalog),f.catalog));if(r.party.some(m=>m.key===unit))break;}
    r.encounter=expanded?3:2;const m=r.party.find(m=>m.key===unit);
    const target=f.catalog[unit].forms.find(x=>x.form===form);
    if(target)Object.assign(m,{form:target.form,unitId:target.unitId,rarity:target.rarity,rank:target.rank});
    m.skills=f.catalog[unit].skills.slice(batch*3,batch*3+3).map(s=>({id:s.id,level:1}));f.store.save(r);f.state=r;f.route();
   },{unit,form,batch,expanded});
   await p.waitForFunction(()=>{const g=window.themedReviewGame,s=g.scene.getScene('BattleScene');return s.isRunCommandWindow()&&s.runContext.state===g.registry.get('runFlow').state;});
   if(batch===0){
    await p.evaluate(()=>{const s=window.themedReviewGame.scene.getScene('BattleScene');s.scene.pause();s.stageAnimation.frame=-1;s.stageAnimation.draw(90);for(const h of s.turnOrder){h.playRestPose();h.anims.pause();h.setFrame(0);}});
    await p.screenshot({path:`${output}/${form}-linear.png`});
    if(form.endsWith('_nv')){
     await p.evaluate(async form=>{const {setBodySampling}=await import('/src/scenes/bodyLoading.ts');setBodySampling(window.themedReviewGame.scene.getScene('BattleScene'),form+'_idle',false);},form);
     await p.screenshot({path:`${output}/${form}-nearest.png`});
     await p.evaluate(async form=>{const {setBodySampling}=await import('/src/scenes/bodyLoading.ts');setBodySampling(window.themedReviewGame.scene.getScene('BattleScene'),form+'_idle',true);},form);
    }
    await p.evaluate(()=>{const s=window.themedReviewGame.scene.getScene('BattleScene');s.turnOrder.forEach(h=>h.anims.resume());s.scene.resume();});
   }
   if(expanded||form.endsWith('form7'))results.push(...await p.evaluate(async ({unit,form})=>{
    const s=window.themedReviewGame.scene.getScene('BattleScene'),h=s.turnOrder.find(h=>h.unitKey===unit),out=[];await s.preparedScenes.ready;
    for(const skill of s.unitSkills[unit]){
     while(s.preparedScenes.snapshot().active)await new Promise(r=>setTimeout(r,20));s.combatState='PLAYER_TURN';s.turnOrder.forEach(a=>{a.hasActed=false;a.currentMp=a.maxMp;a.currentHp=a.maxHp;});s.enemies.forEach(e=>{e.currentHp=99999;e.maxHp=99999;e.statusEffects=[];});
     let done=false,calls=0,hits=0;const finish=s.concludeHeroSkill,play=s.playPreparedScene,originals=s.enemies.map(e=>e.applyDamage);
     s.concludeHeroSkill=function(a){if(a===h)done=true;return finish.call(this,a);};s.playPreparedScene=function(...a){calls++;return play.apply(this,a);};s.enemies.forEach((e,i)=>e.applyDamage=function(...a){hits++;return originals[i].apply(this,a);});
     try{s.selectHero(h);s.openHeroCommands(h);const ix=s.unitSkills[unit].indexOf(skill);s.changeSkillPage(Math.floor(ix/3));s.skillButtons[ix%3].bg.emit('pointerdown');const mp=h.currentMp;s.cmdExecuteBtnBg.emit('pointerdown');const t=performance.now();while(!done&&performance.now()-t<30000)await new Promise(r=>setTimeout(r,20));
      if(!done||calls!==1||mp-h.currentMp!==skill.mpCost||Math.hypot(h.x-h.homeSlot.x,h.y-h.homeSlot.y)>.01||h.visualKey!==form)throw Error('New form Source lifecycle failed');
      const expected=(skill.damageEvents?.length??0)*(skill.scope==='all_enemies'?s.enemies.length:1);if(skill.damageEvents&&hits!==expected)throw Error('New form hit count mismatch');
      while(s.preparedScenes.snapshot().active)await new Promise(r=>setTimeout(r,20));if(s.preparedScenes.snapshot().errors.length)throw Error('Source renderer error');out.push({unit,skill:skill.id,visualKey:h.visualKey,unitId:h.manifest.unitId,mpSpent:mp-h.currentMp,hits,calls,position:{x:h.x,y:h.y}});
     }finally{s.concludeHeroSkill=finish;s.playPreparedScene=play;s.enemies.forEach((e,i)=>e.applyDamage=originals[i]);}
    }return out;
   },{unit,form}));
   console.log('PASS original body',form,batch);
  }
 }
 if(results.length!==(expanded?29:6)||errors.length)throw Error('Missing new-form Source coverage '+results.length+' '+errors);
 await fs.writeFile(output+'/receipt.json',JSON.stringify({passed:true,conditions:'Controlled valid run snapshots, supported skill loadouts and high-HP targets for real Source casts.',results,errors},null,2));
}finally{await browser.close();}
