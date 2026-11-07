import test from 'node:test';
import assert from 'node:assert/strict';
import {rewardPopupLayout} from '../src/ui/rewardLayout.mjs';

test('popup prefers the arena center when the party is clear',()=>{
 const r=rewardPopupLayout({viewport:{width:900,height:1100},canvas:{left:0,top:55,width:900,height:990},arena:{top:98,height:677},party:[],panel:{width:840,height:260}});
 assert.equal(r.left,30);assert.equal(r.top+130,436.5);assert.equal(r.partyOverlap,0);
});
test('popup lifts above actors rather than turning into a lower dock',()=>{
 const r=rewardPopupLayout({viewport:{width:900,height:1100},canvas:{left:0,top:55,width:900,height:990},arena:{top:98,height:677},party:[{left:560,right:760,top:425,bottom:700}],panel:{width:840,height:280}});
 assert.equal(r.top+r.height,413);assert.equal(r.partyOverlap,0);
});
test('compact and exceptional scroll layouts stay bounded at short viewport heights',()=>{
 for(const width of [375,600,900])for(const height of [420,560,667,812,1100]){
  const r=rewardPopupLayout({viewport:{width,height},canvas:{left:0,top:0,width,height},arena:{top:20,height:height*.7},party:[{left:width*.65,right:width*.9,top:height*.45,bottom:height*.7}],panel:{width:Math.min(840,width-24),height:height<600?190:280}});
  assert.ok(r.left>=12&&r.left+r.width<=width-12);assert.ok(r.top>=12&&r.top+r.height<=height-12);assert.ok(Number.isFinite(r.partyOverlap));
 }
 assert.throws(()=>rewardPopupLayout({viewport:{width:NaN,height:500},canvas:{left:0,top:0,width:1,height:1},arena:{top:0,height:1},party:[],panel:{width:1,height:1}}),/Finite/);
});
