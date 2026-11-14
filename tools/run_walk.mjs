// Test helper (not a test file): walks a loop v2 run across its act maps with deterministic choices.
import {chooseNode,chooseRoute,routeOptions,mapOptions,completeBattle,chooseReward,currentNode} from '../src/run/runState.mjs';
import {chooseEvent} from '../src/run/runEvents.mjs';

/** Leaves the current event with its safe action. */
export function settleEvent(run,catalog){
 const kind=run.event.kind;
 return chooseEvent(run,kind==='camp'?'rest':'leave',catalog);
}
/** From phase 'map': takes the route choice (first option) and enters one reachable node, preferring the
 * listed node types in order (default: a normal battle). */
export function step(run,prefer=['battle','elite','boss']){
 if(run.phase!=='map')throw Error('step needs phase map, got '+run.phase);
 const route=routeOptions(run);
 if(route)run=chooseRoute(run,route.options[0].stageId);
 const options=mapOptions(run);
 const pick=prefer.map(type=>options.find(n=>n.type===type)).find(Boolean)??options[0];
 return chooseNode(run,pick.id);
}
/** Walks until a fight of one of the given kinds opens (other fights are won and events settled on the way). */
export function toFight(run,catalog,types=['battle','elite','boss']){
 for(let guard=0;guard<40;guard++){
  if(run.phase==='battle'&&types.includes(currentNode(run).type))return run;
  if(run.phase==='event'){run=settleEvent(run,catalog);continue;}
  if(run.phase==='battle'){run=win(run,catalog);continue;}
  run=step(run,[...types,'campfire','treasure','event','merchant','battle','elite','boss']);
 }
 throw Error('No fight reached');
}
export const snapshot=run=>run.party.map(m=>({key:m.key,hp:m.hp,mp:m.mp}));
/** Wins the current fight and takes the first reward that needs no skill replacement. */
export function win(run,catalog){
 run=completeBattle(run,catalog,snapshot(run),true);
 const index=run.offers.findIndex(r=>r.type!=='learn'||run.party.find(m=>m.key===r.member).skills.length<3);
 run=chooseReward(run,index,catalog);
 if(run.pendingAwakening)delete run.pendingAwakening;
 return run;
}
/** Plays a whole run to the end, winning every fight; returns every visited state. */
export function playThrough(run,catalog,prefer){
 const states=[run];
 for(let guard=0;guard<200&&run.phase!=='won';guard++){
  if(run.phase==='map')run=step(run,prefer);
  else if(run.phase==='event')run=settleEvent(run,catalog);
  else if(run.phase==='battle')run=win(run,catalog);
  else throw Error('Unexpected phase '+run.phase);
  states.push(run);
 }
 if(run.phase!=='won')throw Error('Run did not finish');
 return states;
}
