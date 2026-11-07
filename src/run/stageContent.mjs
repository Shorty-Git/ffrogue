// Reviewed FFRogue encounters; source identity is not a claim of original FFBE AI.
export const ENEMY_CONTENT = {
  microchu: {key:'microchu',name:'Microchu',spriteId:'1110310',monsterId:'111031000',dictionaryId:1110310,
    scale:2,attack:{clip:'atk',impactFrame:1,movement:'approach'},audio:[]},
  ochu: {key:'ochu',name:'Ochu',spriteId:'3110010',monsterId:'311001000',dictionaryId:3110010,
    scale:1.4,attack:{clip:'atk',impactFrame:1,movement:'stationary'},audio:[],
    behavior:{phaseAt:.5,phaseName:'Wild Growth',phaseMultiplier:1.2,pattern:[
      {kind:'attack',name:'Vine Lash',multiplier:1,scope:'single'},
      {kind:'prepare',name:'Roots gather strength',next:'Bramble Surge'},
      {kind:'attack',name:'Bramble Surge',multiplier:1.15,scope:'party'}]}},
  sweeper: {key:'sweeper',name:'Sweeper',spriteId:'2061310',monsterId:'206131000',dictionaryId:2061310,
    scale:2,attack:{clip:'atk',impactFrame:1,movement:'stationary'},audio:[]},
  guard_scorpion: {key:'guard_scorpion',name:'Guard Scorpion',spriteId:'4060810',monsterId:'406081000',dictionaryId:4060810,
    scale:1.9,attack:{clip:'atk',impactFrame:1,movement:'stationary'},audio:[],
    behavior:{phaseAt:.5,phaseName:'Reactor Overdrive',phaseMultiplier:1.25,pattern:[
      {kind:'attack',name:'Arm Cannon',multiplier:1,scope:'single'},
      {kind:'prepare',name:'Power banks charging',next:'Suppressive Burst'},
      {kind:'attack',name:'Suppressive Burst',multiplier:1.3,scope:'party'}]}},
};

export const STAGE_CONTENT = {
  whisperwood: {id:'whisperwood',name:'Whisperwood',theme:'FFBE · Lapis Wilderness',arena:'forest',
    source:{battleBgId:100031,file:'battle_bg_0003_01.jpg',worldIdentity:'FFRogue wilderness adaptation; not an original stage reconstruction'},
    enemyPool:['microchu'],formations:[['center']],bossId:'ochu',difficulty:1,rewardCategory:'forest-relic',normalFights:1,
    audio:{musicResourceId:400005,soundCues:[]}},
  mako_reactor: {id:'mako_reactor',name:'Mako Reactor',theme:'FINAL FANTASY VII',arena:'reactor',
    variants:['reactor_05'],
    source:{battleBgId:120142,file:'battle_bg_2013_02.jpg',worldIdentity:'Reviewed FFVII reactor theme; original stage-to-world join not established'},
    enemyPool:['sweeper'],formations:[['top','bottom']],bossId:'guard_scorpion',difficulty:1.45,rewardCategory:'reactor-relic',normalFights:1,
    audio:{musicResourceId:4000713,musicSeries:'FFVII',bossMusicResourceId:400993,musicAssignment:'FFRogue thematic selection',soundCues:[]}},
};

export function stageForArea(area){
  const id=area.stageId??(area.arena==='forest'?'whisperwood':area.arena==='reactor'?'mako_reactor':null);
  const stage=STAGE_CONTENT[id];
  if(!stage||(stage.arena!==area.arena&&!stage.variants?.includes(area.arena)))throw Error('Unsupported or mismatched stage: '+id);
  return stage;
}

/** Cursor advances only on executed actions: stop never skips a warning into a burst. */
export function enemyAction(definition,cursor,hpRatio){
  if(!Number.isInteger(cursor)||cursor<0||!Number.isFinite(hpRatio))throw Error('Invalid enemy action state');
  const b=definition.behavior,phase=!!b&&hpRatio<=b.phaseAt;
  const action=b?b.pattern[cursor%b.pattern.length]:{kind:'attack',name:'Attack',multiplier:1,scope:'single'};
  return {...action,phase:phase?b.phaseName:'',multiplier:(action.multiplier??0)*(phase?b.phaseMultiplier:1)};
}
