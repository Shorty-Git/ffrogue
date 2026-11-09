// Compile existing prepared JSON/models/textures; no raw BMB parsing in the game.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {sourceAudioPlan} from './lib/source-audio-events.mjs';
import {admitSourceAudio} from './lib/admit-source-audio.mjs';
import {instances, POLICIES} from './original_effect_player.mjs';
import {SCENE_PROFILE, MAX_SCENE_FRAMES, validateSceneManifest, validateSceneAction} from '../src/effects/sceneProfile.mjs';
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => { fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, JSON.stringify(value, null, 2)+'\n'); };
const args = process.argv.slice(2), recipeFile = args[args.indexOf('--recipe')+1];
if (!args.includes('--recipe')) throw Error('Use --recipe tools/presentations/review.json');
const recipe = read(recipeFile);
if (recipe.schemaVersion !== 1 || recipe.quality !== 'experimental-preview' || !recipe.reviewNote) throw Error('Reviewed experimental transfer required');
const staged = [];
for (const binding of recipe.bindings) {
  if(binding.standalone!==undefined&&typeof binding.standalone!=='boolean')throw Error('Standalone admission must be explicit boolean');
  for (const key of binding.standalone===true ? [binding.key] : [binding.key,binding.character,binding.skill])
    if (typeof key!=='string'||!/^[a-z][a-z0-9_]*$/.test(key)) throw Error('Invalid publication key');
  if(binding.standalone===true&&(binding.character||binding.skill))throw Error('Standalone review must not modify a character binding');
  const plan = read(binding.plan);
  if (plan.sourceId !== binding.sourceId || plan.approved !== false) throw Error('Plan source/quality mismatch');
  if(binding.placementCoordinates!==undefined){
    if(binding.placementCoordinates!=='ffbe-screen-api'||!binding.placementReview?.trim())throw Error('Explicit reviewed placement coordinates required');
    plan.rectanglePlacement.coordinateSystem=binding.placementCoordinates;
    plan.rectanglePlacement.coordinateReview=binding.placementReview;
  }
  if(binding.memberRandomness!==undefined){
    if(binding.memberRandomness!=='reviewed-member-streams-v1'||!binding.randomnessReview?.trim())throw Error('Explicit reviewed randomness policy required');
    plan.memberRandomness=binding.memberRandomness;
    plan.randomnessReview=binding.randomnessReview;
    plan.members=plan.members.map((m,index)=>({...m,randomStreamKey:'member'+index}));
  }
  // Generic rule for the FFBE screen API import path: full-screen backdrops fit the battlefield.
  const screenBackdrops=binding.placementCoordinates==='ffbe-screen-api';
  if(binding.screenFlashPolicy!==undefined || binding.arenaSurfaces!==undefined || screenBackdrops){
    if(binding.screenFlashPolicy!==undefined && binding.screenFlashPolicy!=='uniform-opaque-particle-arena')throw Error('Unsupported reviewed flash policy');
    if(binding.arenaSurfaces!==undefined && !Array.isArray(binding.arenaSurfaces))throw Error('Explicit reviewed arena surface list required');
    const python=args.includes('--python')?args[args.indexOf('--python')+1]:process.env.FFROGUE_PYTHON??'python';
    const result=spawnSync(python,['tools/prepare_scene_flashes.py','--plan',binding.plan,
      ...(binding.screenFlashPolicy?[]:['--skip-particles']),
      ...(binding.arenaSurfaces?['--arena-surfaces',JSON.stringify(binding.arenaSurfaces)]:[]),
      ...(screenBackdrops?['--screen-backdrops']:[])],{encoding:'utf8',maxBuffer:32*1024*1024});
    if(result.status!==0)throw Error('Flash preparation failed: '+result.stderr);
    // Only effect node annotations come back; placement/randomness bindings applied above stay.
    const prepared=JSON.parse(result.stdout);plan.effects=prepared.plan.effects;
  }
  const resources = new Map();
  for (const effect of plan.effects) for (const [name, url] of Object.entries(effect.textures)) {
    const resource = plan.files[url];
    if (!resource || hash(resource.path) !== resource.sha256) throw Error('Missing or stale prepared texture '+url);
    const destination = `public/assets/presentations/resources/${resource.sha256}.png`;
    resources.set(destination, resource.path);
    effect.textures[name] = '/'+destination.replace(/^public\//, '');
  }
  let durationFrames = 1+Math.ceil(Math.max(...plan.members.flatMap(member =>
    instances(plan.effects[member.effect], plan.seed, plan.effectHorizon).map(instance => member.startFrame+instance.birth+instance.life))));
  // Approximation plans: instances outliving the scene limit (e.g. Auron's Tornado, 1385 frames) end at
  // the plan's own effect horizon; recorded with the other approximations.
  if (durationFrames > MAX_SCENE_FRAMES && plan.approximations?.curves) {
    plan.approximations.curves.push({treatment: 'scene-capped-at-effect-horizon', computedFrames: durationFrames, cappedFrames: Math.min(MAX_SCENE_FRAMES, plan.effectHorizon)});
    durationFrames = Math.min(MAX_SCENE_FRAMES, plan.effectHorizon);
  }
  // Remove preview-only scene/body resources. Source identities remain provenance, not runtime paths.
  for (const key of ['actor','rat','backgrounds','files','audioGroupsNotPlayed']) delete plan[key];
  const manifest = {schemaVersion:1, profile:SCENE_PROFILE, key:binding.key, sourceId:binding.sourceId,
    quality:'experimental-preview', originalFidelityVerified:false, durationFrames,
    provenance:{planFile:binding.plan, planSha256:hash(binding.plan), playerSha256:hash('src/effects/originalEffectPlayer.mjs'),
      threeSha256:hash('public/vendor/three-preview.js'), recipeSha256:hash(recipeFile)},
    limitations:POLICIES, plan};
  const audioInput=read(binding.plan);
  manifest.audioSource=sourceAudioPlan(audioInput.audioGroupsNotPlayed??[],audioInput.audioGroupCoverage);
  admitSourceAudio(manifest);
  validateSceneManifest(manifest);
  const characterFile=binding.standalone?null:`tools/characters/${binding.character}.json`, publishedFile=binding.standalone?null:`public/assets/units/${binding.character}/skills.json`;
  if(!binding.standalone){
    const character=read(characterFile), published=read(publishedFile);
    for (const skill of [character.skills.find(s=>s.id===binding.skill),published.skills.find(s=>s.id===binding.skill)])
      if (!skill || skill.ffbeId!==binding.sourceId) throw Error('Character/skill identity mismatch');
      else validateSceneAction(manifest,skill);
  }
  staged.push({binding, manifest, resources, characterFile, publishedFile});
}
for (const entry of staged) {
  for (const [destination, source] of entry.resources) { fs.mkdirSync(path.dirname(destination),{recursive:true}); fs.copyFileSync(source,destination); }
  write(`public/assets/presentations/${entry.binding.key}/manifest.json`,entry.manifest);
  for (const file of [entry.characterFile,entry.publishedFile]) {
    if(!file)continue;
    const data=read(file);data.skills.find(s=>s.id===entry.binding.skill).scenePresentation=entry.binding.key;write(file,data);
  }
}
for (const character of new Set(staged.map(entry=>entry.binding.character).filter(Boolean))) {
  const file=`public/assets/units/${character}/character.json`,data=read(file);
  data.provenance.recipeSha256=hash(`tools/characters/${character}.json`);write(file,data);
}
const registry=read('public/assets/content.json');
registry.scenePresentations=[...new Set([...(registry.scenePresentations??[]),...staged.map(e=>e.binding.key)])];
write('public/assets/content.json',registry);
console.log(JSON.stringify(staged.map(e=>({key:e.binding.key,sourceId:e.binding.sourceId,durationFrames:e.manifest.durationFrames,textures:e.resources.size,quality:e.manifest.quality}))));
