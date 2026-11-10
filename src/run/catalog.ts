import type Phaser from 'phaser';
import type {UnitManifest} from '../types/manifest';
import type {CharacterDefinition,ContentRegistry} from '../types/content';
import type {UnitSkillsData,SkillConfig} from '../types/skills';
import type {RunCatalog} from './runState.mjs';
import {rankValue} from './unitForms.mjs';
import {validateSceneAction} from '../effects/sceneProfile.mjs';
import {validateBasicRepeat} from '../effects/basicRepeat.mjs';
import {skillElements,elementNames} from './elementRules.mjs';
export interface RunContent{schemaVersion:1;units:Record<string,{identity:string;unitId:string;rarity:number;rank?:'NV';canonicalIdentity:string;variantLabel?:string}>;canonicalCharacters:Record<string,{label:string}>;
 forms:{key:string;identityKey:string;identity:string;unitId:string;rarity:number;rank?:'NV';assetPath:string;awakensFrom:string}[];}
export function runCatalog(scene:Phaser.Scene,manifests:Record<string,UnitManifest>):RunCatalog{
 const registry=scene.cache.json.get('content_registry')as ContentRegistry,content=scene.cache.json.get('run_content')as RunContent,result:RunCatalog={};
 if(content?.schemaVersion!==1)throw Error('Prepared run content required');
 for(const key of registry.characters){const def=scene.cache.json.get('character_'+key)as CharacterDefinition,meta=content.units[key];
  // Barrage-type commands repeat the basic attack and have no scene (src/effects/basicRepeat.mjs).
  const published=((scene.cache.json.get('skills_'+key)as UnitSkillsData)?.skills??[]).filter(s=>s.importStatus==='imported'&&(s.requiresSourceScene&&s.scenePresentation||s.execution==='basic-attack-repeat'));
  // Limit Bursts use the LB gauge; they never enter starter draws, rewards or the three skill slots.
  const skills=published.filter(s=>s.type!=='LIMIT'),limitBurst=published.find(s=>s.type==='LIMIT');
  if(!skills.length)continue;
  if(!meta||meta.unitId!==String(manifests[key].unitId))throw Error('Run character form mismatch: '+key);
  if(!meta.canonicalIdentity||!content.canonicalCharacters?.[meta.canonicalIdentity])throw Error('Reviewed canonical character identity required: '+key);
  published.forEach(s=>s.execution==='basic-attack-repeat'?validateBasicRepeat(s):validateSceneAction(scene.cache.json.get('scene_'+s.scenePresentation+'_manifest'),s));
  result[key]={key,name:def.battle.heroName??key,variantLabel:meta.variantLabel,identity:meta.identity,canonicalIdentity:meta.canonicalIdentity,unitId:meta.unitId,rarity:meta.rarity,...(meta.rank?{rank:meta.rank}:{}),form:key,
   maxHp:def.battle.maxHp??3000,maxMp:def.battle.maxMp??100,skills,...(limitBurst?{limitBurst}:{}),magicAvailable:def.battle.attackType==='ranged',portrait:`/assets/units/${key}/${def.portrait??'portrait.png'}`};
  const candidates=content.forms.filter(f=>f.identityKey===key&&f.identity===meta.identity&&rankValue(f)>meta.rarity).sort((a,b)=>rankValue(a)-rankValue(b));
  const admitted=candidates.filter(form=>manifests[form.key]&&String(manifests[form.key].unitId)===form.unitId
    &&['idle','move','atk','dead','dying','win','win_before',...published.flatMap(s=>s.actionChoreography?.body.phases?.map(p=>p.clip)??[])].every(c=>!!manifests[form.key].animations[c]));
  const reachable=new Set([key]);
  result[key].forms=admitted.filter(form=>{
   if(!reachable.has(form.awakensFrom))return false;
   reachable.add(form.key);
   return true;
  }).map(form=>({form:form.key,identity:meta.identity,unitId:form.unitId,rarity:form.rarity,rank:form.rank,awakensFrom:form.awakensFrom}));
  result[key].evolution=result[key].forms?.find(f=>f.awakensFrom===key);
 }
 return result;
}
export function skillDescription(s:SkillConfig):string{
 // Plain player-facing copy (2026-11-11 first-impression pass): what it hits, how hard, what it leaves behind.
 const target={single_enemy:'one enemy',all_enemies:'all enemies',single_ally:'one ally',party:s.allyTargeting==='other-living-allies'?'the other allies':s.allyTargeting==='fallen-ally'?'one fallen ally':s.allyTargeting==='fallen-allies'?'fallen allies':'the party',self:'yourself'}[s.scope];
 // Power is relative to a basic attack (1×); magic and physical skills share the scale.
 const power=Number(s.damageMultiplier.toFixed(2));
 const elements=skillElements(s),element=elements.length?` ${elementNames(elements)}`:'';
 const rounds=(n:number)=>`${n} round${n===1?'':'s'}`;
 const parts=[`${s.mpCost} MP`];
 if(s.basicRepeat){const r=s.basicRepeat;parts.push(`${r.minHits===r.maxHits?r.minHits:r.minHits+'–'+r.maxHits}${element} weapon strikes at ${r.targeting==='random'?'random enemies':target} (power ${power}× each)`);}
 else if(s.damageEvents){const hits=s.damageEvents.length;parts.push(`${element.trim()||'Hits'}${element?' damage to':''} ${target}, power ${power}×${hits>1?` over ${hits} hits`:''}`);}
 else parts.push(target[0].toUpperCase()+target.slice(1));
 for(const e of s.allyEvents??[])for(const f of e.effects)parts.push(f.kind==='heal'?`Heals ${f.amount} HP`
  :f.kind==='limit-fill'?`Limit gauge +${f.amount}%`
  :f.kind==='raise'?`Revives with ${Math.round(f.hpFraction*100)}% HP`
  :f.kind==='cleanse'?'Cures blind and stat breaks'
  :f.kind==='guard'?`Takes ${Math.round(f.reduction*100)}% less ${f.damageType==='physical'?'physical':'magic'} damage for ${rounds(f.turns)}`
  :f.kind==='auto-revive'?`Revives with ${Math.round(f.hpFraction*100)}% HP if knocked out within ${rounds(f.turns)}`
  :`Attack +${Math.round((f.multiplier-1)*100)}% for ${rounds(f.turns)}`);
 for(const e of s.supportEvents??[])for(const f of e.effects){
  const chance=f.chance<1?` (${Math.round(f.chance*100)}% chance)`:'';
  if(f.kind==='execute-or-damage'){parts.push(`${Math.round(f.chance*100)}% chance to defeat instantly${f.bossImmune?' (not bosses)':''}, otherwise ${f.fallbackDamage} damage`);continue;}
  const pct=f.multiplier?Math.round(Math.abs(f.multiplier-1)*100):0;
  parts.push(({'physical-weakness':`Target takes +${pct}% physical damage`,'magic-weakness':`Target takes +${pct}% magic damage`,'attack-down':`Target deals ${pct}% less damage`,
   silence:'Silences the target (no magic)',stop:'Stops the target (cannot act)'} as Record<string,string>)[f.kind]??f.kind.replaceAll('-',' '));
  parts[parts.length-1]+=` for ${rounds(f.phases)}${chance}`;
 }
 if(s.hpCost)parts.push(`Also costs ${s.hpCost} HP (needs more HP than that)`);return parts.join(' · ');
}
