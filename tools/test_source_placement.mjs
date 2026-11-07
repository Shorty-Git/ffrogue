import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {scenePresentationAnchor,scenePresentationMembers,casterStrikeOffset} from '../src/effects/PreparedSceneBridge.mjs';
import {sourceRectanglePoint,instances} from '../src/effects/originalEffectPlayer.mjs';
import {memberSamplingSeed} from '../src/effects/previewRandomStreams.mjs';
import {validateImportPlacement} from './lib/character-pipeline.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));

test('measured Chant source placement adds positive Y in API screen space',()=>{
 const placement={rectangle:'target-side',axisModes:[2,2],offset:[0,240]};
 const p=sourceRectanglePoint(placement,{x:320,y:0,width:320,height:666});
 assert.deepEqual(p,{x:480,y:573});
 // Actual setters in chant-events: front488,570; back480,572. No RNG draw is guessed.
 for(const [x,y]of [[488,570],[480,572]])assert.ok(Math.abs(x-p.x)<=8&&Math.abs(y-p.y)<=8);
 // Captured engine1100 and orthographic projection height1136 remain separate.
 assert.equal(1136-(1100-p.y),609);
});

test('source API axes, uniform units and translated arenas remain independent of allegiance/count',()=>{
 for(const [width,height]of [[1000,1100],[1280,720],[640,1136]])for(const u of [1,2]){
  const host={width,height,arena:{x:25,y:48,width:width-50,height:height-348},caster:{x:800,y:600},
    targets:{a:{x:300,y:400}},units:{a:{frameWidth:80,frameHeight:100,pivotX:.5,pivotY:1,scale:2}}};
  const member={anchor:'target-group',placement:{rectangle:'target-side',axisModes:[2,2],offset:[0,240]}};
  const plan={members:[member],presentation:{scope:'party'},rectanglePlacement:{coordinateSystem:'ffbe-screen-api',unitsPerPixel:u,scatter:[0,0]}};
  const anchor=scenePresentationAnchor(member,host,plan);
  assert.equal(anchor.y,height/2-(host.arena.y+host.arena.height/2+240/u));
  assert.equal(anchor.x,host.arena.x+host.arena.width*.75-width/2);
  const withMore={...host,targets:{...host.targets,b:{x:500,y:650}},units:{...host.units,b:host.units.a}};
  assert.deepEqual(scenePresentationAnchor(member,withMore,plan),anchor);
  const unit={anchor:'target',targetKey:'a',placement:{rectangle:'target-unit',axisModes:[2,2],offset:[0,0]}};
  const centered=scenePresentationAnchor(unit,host,plan);assert.equal(centered.x,300-width/2);assert.equal(centered.y,height/2-300);
  for(let mode=1;mode<=6;mode++){
   const m={...unit,placement:{...unit.placement,axisModes:[mode,mode],offset:[10,20]}};
   const at=scenePresentationAnchor(m,host,plan),fraction=((mode-1)%3)/2;
   assert.equal(at.x,220+160*fraction+10/u-width/2);assert.equal(at.y,height/2-(200+200*fraction+20/u));
  }
 }
});

test('reviewed member streams remove cloned orbit samples without moving original target anchors',()=>{
 const plan=read('public/assets/presentations/delita_cunning_hero_sword/manifest.json').plan;
 const members=scenePresentationMembers(plan,['target0','target1']);
 assert.equal(members.length,18);
 const seeds=members.map(m=>memberSamplingSeed(plan,m));assert.equal(new Set(seeds).size,18);
 assert.deepEqual(members.map(m=>memberSamplingSeed(plan,m)),seeds);
 const angles=members.map((m,i)=>instances(plan.effects[m.effect],seeds[i],plan.effectHorizon).find(p=>p.node===1).sampled.transform.rotation.value[2]);
 assert.equal(new Set(angles).size,18);assert.ok(Math.max(...angles)-Math.min(...angles)>180);
 assert.deepEqual(plan.effects[0].nodes[2].staticVectors.transform.translation.valueInitial,[50,0,0]);
 assert.ok(plan.members.every(m=>JSON.stringify(m.placement.offset)==='[0,0]'));
 assert.equal(memberSamplingSeed({seed:1},{}),1);assert.throws(()=>memberSamplingSeed({...plan,memberRandomness:'unknown'},members[0]));
});

test('new import placement admission is independent of VFX/choreography success',()=>{
 const skill={id:'review',ffbeId:123,type:'ABILITY',scenePresentation:'review_scene'};
 const explicit={plan:{rectanglePlacement:{coordinateSystem:'ffbe-screen-api',coordinateReview:'Measured source axes; declared host rectangle'}}};
 assert.doesNotThrow(()=>validateImportPlacement(skill,explicit));
 const historical={plan:{rectanglePlacement:{unitsPerPixel:1,scatter:[0,0]}}};
 assert.throws(()=>validateImportPlacement(skill,historical),/placement coordinate contract/);
 const published={...skill,importStatus:'imported'};
 assert.doesNotThrow(()=>validateImportPlacement(skill,historical,[published]));
 for(const change of [{id:'different'},{ffbeId:124},{type:'MAGIC'},{scenePresentation:'other'},{importStatus:'not-imported'}])
  assert.throws(()=>validateImportPlacement(skill,historical,[{...published,...change}]),/placement coordinate contract/);
});

test('caster-unit placement follows the caster and aligns its strike with the target',()=>{
 const casterUnit={frameWidth:100,frameHeight:120,pivotX:.5,pivotY:1,scale:2};
 const placement={rectangle:'caster-unit',axisModes:[2,2],offset:[-280,40]};
 const plan={rectanglePlacement:{coordinateSystem:'ffbe-screen-api',unitsPerPixel:1,scatter:[0,0]},presentation:{scope:'single_enemy'},
  members:[{placement:{rectangle:'screen',axisModes:[2,2],offset:[0,100]}},...Array.from({length:3},()=>({placement}))]};
 // Rectangle centre of the caster (0,-120) plus the source offset.
 assert.deepEqual(casterStrikeOffset(plan,casterUnit),{x:-280,y:-80});
 const host={width:1000,height:1100,arena:{x:0,y:0,width:1000,height:700},caster:{x:600,y:500},casterUnit,
  targets:{target0:{x:200,y:500}},units:{target0:{frameWidth:80,frameHeight:80,pivotX:.5,pivotY:1,scale:2}}};
 const anchor=scenePresentationAnchor({placement},host,plan);
 assert.equal(anchor.x+host.width/2,600-280,'Placed from the caster, not from the target');
 assert.throws(()=>scenePresentationAnchor({placement},{...host,casterUnit:undefined},plan),/caster footprint/);
 // Published presentations without caster-unit members keep the reviewed approach offset.
 for(const key of read('public/assets/content.json').scenePresentations.filter(k=>k!=='cloud_omnislash'))
  assert.equal(casterStrikeOffset(read('public/assets/presentations/'+key+'/manifest.json').plan,casterUnit),null,key);
});
