import assert from 'node:assert/strict';
import test from 'node:test';
import { scalar, vectorCurve, instances, textureMatrix, displacementUv, coverScreenBounds, quadCornerColors, isUntexturedParticle, presentationPose, presentationMembers, presentationAnchor, parameters } from './original_effect_player.mjs';

const key = (frame, value, type = 'Linear', slopeLeft = 0, slopeRight = 0) =>
  ({ frame, value, type, slopeLeft, slopeRight });

test('reviewed movement keeps stationary casts at home and aligns dash body/effect clocks', () => {
  const home={x:800,y:450},enemy={x:200,y:500};
  const dash={movement:'dash',approachFrames:18,returnFrames:12,targetOffsetX:90};
  assert.deepEqual(presentationPose(0,home,enemy,30,dash).actor,home);
  assert.equal(presentationPose(17,home,enemy,30,dash).skillFrame,-1);
  assert.deepEqual(presentationPose(18,home,enemy,30,dash),{actor:{x:290,y:500},motion:'body',motionTime:0,skillFrame:0});
  assert.equal(presentationPose(48,home,enemy,30,dash).motion,'move');
  assert.deepEqual(presentationPose(60,home,enemy,30,dash).actor,home);
  const stationary={...dash,movement:'stationary',approachFrames:0};
  for(const frame of [0,10,30,60])assert.deepEqual(presentationPose(frame,home,enemy,30,stationary).actor,home);
  assert.equal(presentationPose(0,home,enemy,30,stationary).motion,'body');
  assert.throws(()=>presentationPose(0,home,enemy,30,{...dash,movement:'unknown'}),/Unsupported/);
});

test('area presentations repeat target impacts but keep one stable group effect', () => {
  const enemies={top:{x:200,y:300},center:{x:300,y:500},bottom:{x:250,y:700}};
  const members=[{anchor:'target-group',startFrame:0},{anchor:'target',startFrame:5}];
  const area=presentationMembers(members,Object.keys(enemies),'all_enemies');
  assert.equal(area.length,4);assert.equal(members.length,2);
  assert.deepEqual(area.slice(1).map(m=>m.targetKey),Object.keys(enemies));
  assert.deepEqual(presentationAnchor(area[0],{},enemies,'top'),{x:-250,y:-50});
  assert.deepEqual(presentationAnchor(area[0],{},enemies,'bottom'),{x:-250,y:-50});
  assert.deepEqual(presentationAnchor(area[3],{},enemies,'top'),{x:-250,y:-250});
  assert.equal(presentationMembers(members,Object.keys(enemies),'single_enemy').length,2);
  assert.throws(()=>presentationAnchor({anchor:'unknown'},{},enemies,'top'),/Unsupported/);
});

test('active translation curves move the quad; dormant UV curves do not override Newton motion', () => {
  const curve={keys:[0,1].map(frame=>({frame,types:['Linear','Linear','Linear'],slopeLeft:[0,0,0],slopeRight:[0,0,0],value:[frame*20,0,0]}))};
  const fixed={value:[10,0,0],speed:[2,0,0],acceleration:[0,0,0]};
  const instance={life:10,sampled:{transform:{translation:fixed},texture1:{translation:{...fixed,speed:[3,0,0]}}}};
  const node={motionModes:{translation:{name:'CurveValue'},texture1Translation:{name:'NewtonDynamics'}},vectorCurves:{translationValue:curve,translationSpeed:curve,texture1TranslationSpeed:curve}};
  assert.deepEqual(parameters(node,instance,'transform','translation',5),[10,0,0]);
  node.motionModes.translation.name='CurveSpeed';
  assert.deepEqual(parameters(node,instance,'transform','translation',3),[16,0,0]);
  assert.deepEqual(parameters(node,instance,'texture1','translation',3),[19,0,0]);
  node.motionModes.texture1Translation.name='Constant';
  assert.deepEqual(parameters(node,instance,'texture1','translation',3),[10,0,0]);
});

test('constant quad colors retain the source vertical fade and flat mode', () => {
  const source={mode:'Constant',flat:false,corners:Object.fromEntries(['leftTop','rightTop','leftBottom','rightBottom'].map((n,i)=>[n,{value:i<2?[0,0,0,1]:[1,1,1,1],range:[0,0,0,0]}]))};
  assert.deepEqual(quadCornerColors(source),[[0,0,0,1],[0,0,0,1],[1,1,1,1],[1,1,1,1]]);
  assert.deepEqual(quadCornerColors({...source,flat:true}),Array.from({length:4},()=>[0,0,0,1]));
  assert.throws(()=>quadCornerColors({...source,mode:'Curve'}),/Unsupported/);
  source.corners.rightBottom.range[3]=1;
  assert.throws(()=>quadCornerColors(source),/Random/);
});

test('untextured particle capability does not conflate quads, models or textured sprites', () => {
  const resourceBindings={texture1:null,texture2:null};
  assert.equal(isUntexturedParticle({typeId:3,resourceBindings}),true);
  assert.equal(isUntexturedParticle({typeId:2,resourceBindings}),false);
  assert.equal(isUntexturedParticle({typeId:6,resourceBindings}),false);
  assert.equal(isUntexturedParticle({typeId:3,resourceBindings:{...resourceBindings,texture2:{name:'mask'}}}),false);
});

test('experimental displacement preserves neutral values and zero strength', () => {
  assert.deepEqual(displacementUv([.2,.8],[128/255,128/255],[128,128],[.35,.35]),[.2,.8]);
  assert.deepEqual(displacementUv([.2,.8],[0,1],[128,128],[0,0]),[.2,.8]);
  const [u,v]=displacementUv([.5,.5],[1,0],[128,128],[.35,.35]);
  assert.ok(u>.5&&v<.5);
});

test('screen adaptation covers the arena and centers an offset source rectangle', () => {
  const bounds={width:400,height:300,centerX:0,centerY:180},arena={x:-500,y:-400,width:1000,height:752};
  const fit=coverScreenBounds(bounds,arena);
  assert.equal(fit.scale,752/300);
  assert.equal(fit.x+bounds.centerX*fit.scale,arena.x+arena.width/2);
  assert.equal(fit.y+bounds.centerY*fit.scale,arena.y+arena.height/2);
  assert.ok(bounds.width*fit.scale>=arena.width);
  assert.throws(()=>coverScreenBounds({...bounds,width:0},arena),/Invalid/);
});

test('independent texture transforms preserve the pivot and invert scale, rotation and translation', () => {
  const apply=(m,p)=>[m[0]*p[0]+m[3]*p[1]+m[6],m[1]*p[0]+m[4]*p[1]+m[7]];
  const m=textureMatrix([.5,.25,1],[.1,.2,0],[0,0,0],[.5,.5,0]);
  assert.deepEqual(apply(m,[.6,.7]).map(v=>Math.round(v*1e6)/1e6),[.5,.5]);
  assert.deepEqual(apply(m,[.85,.95]).map(v=>Math.round(v*1e6)/1e6),[1,1.5]);
  const r=textureMatrix([1,1,1],[0,0,0],[0,0,90],[.5,.5,0]);
  assert.deepEqual(apply(r,[1,.5]).map(v=>Math.round(v*1e6)/1e6),[.5,0]);
  assert.throws(()=>textureMatrix([0,1],[0,0],[0,0,0],[0,0]),/Singular/);
});

test('scalar evaluation clamps endpoints and respects constant and linear segments', () => {
  const keys = [key(0, 2, 'Constant'), key(.5, 6), key(1, 10)];
  assert.equal(scalar(keys, -1), 2);
  assert.equal(scalar(keys, .25), 2);
  assert.equal(scalar(keys, .5), 6);
  assert.equal(scalar(keys, .75), 8);
  assert.equal(scalar(keys, 2), 10);
  assert.throws(() => scalar([], 0), /empty/);
  assert.throws(() => scalar([key(0, 0, 'Unknown'), key(1, 1)], .5), /Unknown/);
});

test('experimental Hermite interpolation uses interval-scaled tangents', () => {
  assert.equal(scalar([key(0, 0, 'Spline', 0, 1), key(2, 2, 'Spline', 1)], .5), .5);
  const curve = { keys: [0, 1].map(frame => ({ frame, types: ['Linear','Linear','Linear'],
    value: [frame, frame*2, frame*3], slopeLeft: [0,0,0], slopeRight: [0,0,0] })) };
  assert.deepEqual(vectorCurve(curve, .5), [.5, 1, 1.5]);
});

function node(children = [], generation = {}) {
  return { children, generation: { start: 0, startRange: 0, count: 1, duration: 1,
    repeatCount: 1, interval: null, ...generation }, staticVectors: {},
    lifeParameter: 100, lifeRangeParameter: 0 };
}

test('delayed child batches are relative to each parent birth', () => {
  const effect = { nodes: [node([1], { start: 3, count: 2 }),
    node([], { start: 2, duration: 5, interval: 2 })] };
  const result = instances(effect);
  assert.deepEqual(result.filter(i => i.node === 0).map(i => i.birth), [3,3]);
  assert.deepEqual(result.filter(i => i.node === 1).map(i => i.birth), [5,7,9,5,7,9]);
  assert.deepEqual(result.filter(i => i.node === 1).map(i => i.parent), [0,0,0,4,4,4]);
});

test('random ranges are repeatable and unsupported generation fails visibly', () => {
  const effect = { nodes: [node([], { startRange: 10, count: 5 })] };
  assert.deepEqual(instances(effect, 42), instances(effect, 42));
  assert.notDeepEqual(instances(effect, 42), instances(effect, 99));
  assert.throws(() => instances({ nodes: [node([], { repeatCount: 2 })] }), /Repeated/);
  assert.throws(() => instances({ nodes: [node([], { duration: 3 })] }), /interval/);
  assert.throws(() => instances({ nodes: [node([], { count: 4097 })] }), /limit/);
});

test('fractional generator intervals retain distinct source birth times', () => {
  const effect={nodes:[node([], {duration:2,interval:.5})]};
  assert.deepEqual(instances(effect).map(i=>i.birth),[0,.5,1,1.5]);
});
