import type Phaser from 'phaser';
import type {UnitManifest} from '../types/manifest';
import type {CharacterDefinition,ContentRegistry} from '../types/content';
import type {UnitSkillsData,SkillConfig} from '../types/skills';
import type {RunCatalog} from './runState.mjs';
import {rankValue} from './unitForms.mjs';
import {validateSceneAction} from '../effects/sceneProfile.mjs';
export interface RunContent{schemaVersion:1;units:Record<string,{identity:string;unitId:string;rarity:number;rank?:'NV';canonicalIdentity:string;variantLabel?:string}>;canonicalCharacters:Record<string,{label:string}>;
 forms:{key:string;identityKey:string;identity:string;unitId:string;rarity:number;rank?:'NV';assetPath:string;awakensFrom:string}[];}
export function runCatalog(scene:Phaser.Scene,manifests:Record<string,UnitManifest>):RunCatalog{
 const registry=scene.cache.json.get('content_registry')as ContentRegistry,content=scene.cache.json.get('run_content')as RunContent,result:RunCatalog={};
 if(content?.schemaVersion!==1)throw Error('Prepared run content required');
 for(const key of registry.characters){const def=scene.cache.json.get('character_'+key)as CharacterDefinition,meta=content.units[key];
  const published=((scene.cache.json.get('skills_'+key)as UnitSkillsData)?.skills??[]).filter(s=>s.importStatus==='imported'&&s.requiresSourceScene&&s.scenePresentation);
  // Limit Bursts use the LB gauge; they never enter starter draws, rewards or the three skill slots.
  const skills=published.filter(s=>s.type!=='LIMIT'),limitBurst=published.find(s=>s.type==='LIMIT');
  if(!skills.length)continue;
  if(!meta||meta.unitId!==String(manifests[key].unitId))throw Error('Run character form mismatch: '+key);
  if(!meta.canonicalIdentity||!content.canonicalCharacters?.[meta.canonicalIdentity])throw Error('Reviewed canonical character identity required: '+key);
  published.forEach(s=>validateSceneAction(scene.cache.json.get('scene_'+s.scenePresentation+'_manifest'),s));
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
 const target={single_enemy:'One enemy',all_enemies:'All enemies',single_ally:'One ally',party:s.allyTargeting==='other-living-allies'?'Other living allies':s.allyTargeting==='fallen-ally'?'One fallen ally':s.allyTargeting==='fallen-allies'?'Fallen allies':'Living party',self:'Self'}[s.scope];
 const parts=[`${s.mpCost} MP`,target];
 if(s.damageEvents)parts.push(`${Number(s.damageMultiplier.toFixed(2))}× ${s.damageType==='holy'?'magic':'physical'} power · ${s.damageEvents.length} hit${s.damageEvents.length===1?'':'s'}`);
 for(const e of s.allyEvents??[])for(const f of e.effects)parts.push(f.kind==='heal'?`Restore ${f.amount} HP (no revival)`
  :f.kind==='limit-fill'?`Limit gauge +${f.amount}`
  :f.kind==='raise'?`Revive with ${Math.round(f.hpFraction*100)}% HP`
  :f.kind==='auto-revive'?`Auto-revive with ${Math.round(f.hpFraction*100)}% HP if K.O. within ${f.turns} rounds`
  :`Physical power +${Math.round((f.multiplier-1)*100)}% for ${f.turns} rounds`);
 for(const e of s.supportEvents??[])for(const f of e.effects){
  if(f.kind==='execute-or-damage')parts.push(`${Math.round(f.chance*100)}% instant KO; otherwise ${f.fallbackDamage} unmitigated damage${f.bossImmune?' · bosses resist KO':''}`);
  else parts.push(`${f.kind.replaceAll('-',' ')} ${f.multiplier?Math.round(Math.abs(f.multiplier-1)*100)+'% ':''}(${Math.round(f.chance*100)}% chance, ${f.phases} enemy phases)`);
 }
 if(s.hpCost)parts.push(`Caster cost: ${s.hpCost} HP; must survive`);return parts.join(' • ');
}
