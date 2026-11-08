import {importedProfiles} from './importedMusic.mjs';
export const musicProfiles = [
  ...importedProfiles,
  {id:400005,title:'Battle 1',game:'FFBE',series:'FFBE',role:'normal',available:true},
  {id:400842,title:'Let the Battles Begin!',game:'FFVII',series:'FFVII',role:'normal',available:true},
  {id:4000713,title:'Let the Battles Begin! – Ex-SOLDIER',game:'FFVII Remake',series:'FFVII',role:'normal',available:true},
  {id:400993,title:'Guard Scorpion',game:'FFVII Remake',series:'FFVII',role:'boss',available:true},
  {id:4000711,title:'Kikaitou no Kessen',game:'FFVII Remake',series:'FFVII',role:'event',available:true},
  {id:4001101,title:'Dead End',game:'FFVIII',series:'FFVIII',role:'event',available:true},
  {id:400843,title:'Those Who Fight Further',game:'FFVII',series:'FFVII',role:'boss',available:false},
  {id:400844,title:'Mako Reactor',game:'FFVII',series:'FFVII',role:'area',available:false},
  {id:400867,title:"Don't Be Afraid",game:'FFVIII',series:'FFVIII',role:'normal',available:false},
  {id:400868,title:'Force Your Way',game:'FFVIII',series:'FFVIII',role:'boss',available:false},
  {id:400989,title:'Those Who Fight (alternate bank)',game:'FFVII Remake',series:'FFVII',role:'normal',available:false},
  {id:401038,title:'Those Who Fight (alternate bank)',game:'FFVII Remake',series:'FFVII',role:'normal',available:false},
];

export function recommendMusic(series,role,explicitBoss){
  if(role==='boss'&&explicitBoss){
    const track=musicProfiles.find(track=>track.id===explicitBoss&&track.available&&track.series===series&&track.role==='boss');
    if(track)return track.id;
  }
  const track=musicProfiles.find(track=>track.series===series&&track.available&&track.role===role);
  if(track&&role!=='boss')return track.id;
  if(role==='normal')return 400005;
  if(role==='boss')return recommendMusic(series,'normal');
  return null;
}
