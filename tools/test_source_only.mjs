import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateSceneAction} from '../src/effects/sceneProfile.mjs';
import {reviewedSkillEvents} from '../src/effects/skillDamageTimeline.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
test('all eleven accepted commands have explicit Source clocks; one unavailable entry remains data only',()=>{
 const accepted=new Set(['214800','214810','214820','214790','227151','229751','201150','203280','233930','202180','203050']);
 let unavailable=0;
 for(const key of read('public/assets/content.json').characters)for(const skill of read(`public/assets/units/${key}/skills.json`).skills){
  assert.equal(skill.presentation,undefined);assert.equal(skill.visualEffect,undefined);
  if(skill.scenePresentation){
   const m=read(`public/assets/presentations/${skill.scenePresentation}/manifest.json`);
   validateSceneAction(m,skill);assert.ok(reviewedSkillEvents(skill,m.durationFrames).length);accepted.delete(String(skill.ffbeId));
  }else{assert.equal(skill.importStatus,'not-imported');assert.ok(skill.unavailableReason);unavailable++;}
 }
 assert.equal(accepted.size,0,'Previously accepted commands must remain playable');assert.equal(unavailable,1);
});
test('the accepted Cloud impact clocks are explicit reviewed gameplay, independent of historical sheets',()=>{
 const skills=read('public/assets/units/cloud/skills.json').skills;
 assert.deepEqual(skills.slice(0,3).map(s=>reviewedSkillEvents(s).map(e=>e.frame)),[[6],[30],[4]]);
 for(const s of skills)assert.ok(s.originalCommand.raw);
});
test('productive sources contain no alternate skill engine, switch or baked loader',()=>{
 const battle=fs.readFileSync('src/scenes/BattleScene.ts','utf8');
 for(const name of ['setSkillVisualMode','skillVisualMode','schedulePresentationEffects','playSkillEffectAt','playParticleProgram'])assert.equal(battle.includes(name),false,name);
 assert.equal('effects' in read('public/assets/content.json'),false);
 for(const p of ['src/effects/PreparedParticleEffect.ts','src/types/effects.ts','src/effects/sheetSampling.ts'])assert.equal(fs.existsSync(p),false,p);
 for(const p of ['src/scenes/BootScene.ts','src/scenes/PreloadScene.ts'])assert.equal(fs.readFileSync(p,'utf8').includes('registry.effects'),false);
});
