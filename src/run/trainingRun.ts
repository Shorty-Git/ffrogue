import type Phaser from 'phaser';
import type {RunBattleContext} from './battleContext';
import type {RunCatalog,RunState} from './runState.mjs';
import type {BattleArenaKey} from '../data/battleArenas';
import type {CharacterDefinition,ContentRegistry} from '../types/content';
import type {SkillConfig,UnitSkillsData} from '../types/skills';
import {partyReserve} from '../data/partyReserve.mjs';

// Fixed training encounters for the arena gallery and the Source review pages.
// FFRogue fixtures, not original FFBE data. HP and slots match the frozen Cloud baseline
// (tools/data/choreography/frozen-visual-baseline.json).
export const TRAINING_ENCOUNTERS={
  1:{boss:true,enemies:[{slot:'center' as const,hp:5000,key:'training_dummy',nameTag:'DIRE RAT (BOSS)',isBoss:true}]},
  2:{boss:false,enemies:[
    {slot:'top' as const,hp:3500,key:'training_dummy',nameTag:'DIRE RAT A',isBoss:false},
    {slot:'bottom' as const,hp:3500,key:'training_dummy',nameTag:'DIRE RAT B',isBoss:false},
  ]},
};
export interface TrainingRunOptions{
  reserve?:string|null;
  encounter?:keyof typeof TRAINING_ENCOUNTERS;
  arena?:BattleArenaKey;
  /** Moves one skill into the first command slot. */
  focus?:{unit:string;skill:string};
  /** HP/MP settled by the previous wave. */
  carry?:{key:string;hp:number;mp:number}[];
  bodyTextureFilter?:RunBattleContext['bodyTextureFilter'];
}
export interface TrainingRun{context:RunBattleContext;settled:{won:boolean;party:{key:string;hp:number;mp:number}[]}[]}
const sourceFirst=(a:SkillConfig,b:SkillConfig)=>Number(!!b.scenePresentation)-Number(!!a.scenePresentation);

/** Cloud, Aerith and a registered reserve with every registered skill and neutral stats. */
export function createTrainingRun(cache:Phaser.Cache.CacheManager,options:TrainingRunOptions={}):TrainingRun{
  const encounter=options.encounter??1,fixture=TRAINING_ENCOUNTERS[encounter];
  if(!fixture)throw Error('Unknown training encounter: '+encounter);
  const registry=cache.json.get('content_registry') as ContentRegistry;
  const keys=['cloud','aerith',partyReserve(registry.characters,options.reserve??null)];
  const catalog:RunCatalog={},party:RunState['party']=[];
  for(const key of keys){
    const def=cache.json.get('character_'+key) as CharacterDefinition;
    const skills=[...((cache.json.get('skills_'+key) as UnitSkillsData)?.skills??[])].sort(sourceFirst);
    if(options.focus?.unit===key){
      const index=skills.findIndex(s=>s.id===options.focus!.skill);
      if(index<0)throw Error('Focus skill missing: '+options.focus.skill);
      skills.unshift(...skills.splice(index,1));
    }
    const maxHp=def.battle.maxHp??3000,maxMp=def.battle.maxMp??100;
    catalog[key]={key,name:def.battle.heroName??key,form:key,maxHp,maxMp,skills,magicAvailable:def.battle.attackType==='ranged'} as RunCatalog[string];
    const prior=options.carry?.find(m=>m.key===key);
    party.push({key,form:key,stats:{attack:1,magic:1,defense:1,hp:1,mp:1},skills:skills.map(s=>({id:s.id,level:1})),
      hp:prior?.hp??maxHp,mp:prior?.mp??maxMp} as RunState['party'][number]);
  }
  const settled:TrainingRun['settled']=[];
  const state={version:2,seed:'training',phase:'battle',party,rerolls:0,encounter:encounter-1,offers:[],history:[],
    areas:[{name:'Training',arena:options.arena??'forest',normals:1}],rng:{combat:1,rewards:1,roster:1,skills:1}} as unknown as RunState;
  const context:RunBattleContext={
    state,catalog,bodyTextureFilter:options.bodyTextureFilter,
    encounter:{arena:options.arena??'forest',title:'Training encounter',theme:'Training',stageId:'training',rewardCategory:'training',
      boss:fixture.boss,enemies:fixture.enemies.map(e=>({...e})),damage:290},
    settle:(actors,won)=>{settled.push({won,party:actors.map(a=>({key:a.unitKey,hp:a.currentHp,mp:a.currentMp}))});},
    menu:()=>{},party:()=>{},rewardsReady:()=>{},
  };
  return {context,settled};
}
