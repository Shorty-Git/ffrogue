import test from 'node:test';
import assert from 'node:assert/strict';
import {enemyTargetIndex} from '../src/run/enemyTargeting.mjs';
const party=(...alive)=>alive.map(a=>({alive:a,hp:a?100:0,maxHp:100}));
test('single-target enemy attacks spread over every standing hero, never a K.O. one',()=>{
 assert.equal(enemyTargetIndex(party(true,true,true),()=>0),0);
 assert.equal(enemyTargetIndex(party(true,true,true),()=>.5),1);
 assert.equal(enemyTargetIndex(party(true,true,true),()=>.999999),2);
 assert.equal(enemyTargetIndex(party(false,true,true),()=>0),1,'The first slot is not special');
 assert.equal(enemyTargetIndex(party(true,false,true),()=>.9),2);
 assert.equal(enemyTargetIndex(party(false,false,false),()=>.3),-1);
 const hits=[0,0,0];for(let i=0;i<300;i++)hits[enemyTargetIndex(party(true,true,true),()=>i/300)]++;
 assert.deepEqual(hits,[100,100,100]);
});
