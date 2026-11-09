import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {assetInfo,resolveEffects,parseTimeline} from './character-pipeline.mjs';

/** Enemy ownership is monster_skill_set, never unit learns/ability or name matching. */
export function inspectEnemySkills(recipe,{assets='rawdata/assets'}={}){
 const database=path.join(assets,'static_data/ffbe-data.db'),db=new DatabaseSync(database,{readOnly:true});
 try{
  // skillMonsterId: a same-dictionary variant that owns the skill set (X-ATM092 506002006); the body stays recipe.monsterId.
  const skillOwner=recipe.skillMonsterId??recipe.monsterId;
  const monster=db.prepare('SELECT * FROM monster WHERE monsterId=?').get(skillOwner);
  if(!monster||monster.dictionaryId!==recipe.dictionaryId)throw Error('Original enemy ownership mismatch');
  const sets=db.prepare('SELECT * FROM monster_skill_set WHERE monsterId=?').all(skillOwner);
  const ids=[...new Set(sets.flatMap(s=>(s.skillId??'').split(',').filter(Boolean).map(Number)))];
  const body=JSON.parse(fs.readFileSync(`public/assets/monsters/${recipe.key}/manifest.json`,'utf8'));
  if(String(body.unitId)!==recipe.spriteId)throw Error('Prepared enemy body mismatch');
  return {schema:'enemy-skill-intake-v1',unit:{spriteUnitId:recipe.spriteId,monsterId:recipe.monsterId,dictionaryId:recipe.dictionaryId},
   source:assetInfo(database),monster,skillSets:sets,bodyClips:Object.keys(body.animations),
   catalog:ids.map(id=>{
    const raw=db.prepare('SELECT * FROM monster_skill WHERE monsterSkillId=?').get(id);
    if(!raw)return {kind:'MONSTER_SKILL',id,name:null,status:'missing-original-record',blockers:['Original skill row missing']};
    const effects=resolveEffects(db,assets,raw.effectFrames),members=effects.flatMap(b=>b.groups.flatMap(g=>g.members));
    return {kind:'MONSTER_SKILL',id,name:raw.name,raw,effects,
     sourceHitMarkers:parseTimeline(raw.attackFrames,/[-&]/).map(e=>({frame:Number(e.fields[0]),weight:Number(e.fields[1]),extraFields:e.fields.slice(2),raw:e.raw})),
     sourceBodyControls:{moveType:raw.moveType,motionRaw:raw.rtw4F6hn,extraRaw:raw.LBye01Wi},
     sourceGameplay:{targetRaw:raw.target,rangeRaw:raw.targetRange,processIdRaw:raw.processId,processParamRaw:raw.processParam},
     soundReferences:effects.flatMap(b=>b.groups.filter(g=>g.soundsRaw).map(g=>({groupId:g.groupId,groupStartFrame:g.startFrame,soundsRaw:g.soundsRaw}))),
     status:'original-known-incomplete',published:false,
     reuse:{groupResolver:true,originalArchiveStager:true,renderer:'Candidate only; compiled supported profile required',gameplay:'Reviewed FFRogue event contract required'},
     evidence:{originalIdentity:true,sourceTimelines:true,convertedResources:members.length>0&&members.every(m=>m.status==='available-unreviewed'),
       bodyChoreography:false,enemyRelativeAnchors:false,originalVfxProfile:false,gameplayContract:false,originalAiConditions:false},
     blockers:[...(!members.length?['No complete visual group']:[]),...new Set(members.filter(m=>m.status!=='available-unreviewed').map(m=>m.status)),
       'Monster command-to-body dispatch has not been measured; hero motion adapters are not inferred',
       'Enemy-relative caster/recipient anchor and direction contract unreviewed',
       'Original VFX graph/control admission and gameplay event contract required'],
    };
   }),limits:['Source hit markers are visual evidence, not automatic FFRogue damage formulas.',
    'Converted EFKE availability is not original BMB support.',
    'No ordinary atk fallback, target reversal or original skill publication is inferred.']};
 }finally{db.close();}
}

/** Intake never promotes source availability into an executable skill. */
export function assertEnemySkillReady(skill){
 const required=['originalIdentity','sourceTimelines','bodyChoreography','enemyRelativeAnchors','originalVfxProfile','gameplayContract'];
 const reasons=skill.blockers??required.filter(k=>skill.evidence?.[k]!==true);
 // Even completed intake booleans cannot substitute for a validated executable contract.
 throw Error('Enemy skill admission blocked: '+reasons.join('; ')+'; reviewed executable enemy-skill contract not implemented');
}
