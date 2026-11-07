import test from 'node:test';
import assert from 'node:assert/strict';
import {comparePixelBuffers} from './lib/native-pixel-review.mjs';
import {connectedErrorRegions} from './lib/pixel-error-regions.mjs';

test('pixel comparison keeps RGB error separate from framebuffer alpha error',()=>{
 const original=Uint8Array.from([0,0,0,255,10,20,30,40]);
 const exact=comparePixelBuffers(original,original,2);assert.equal(exact.changedRgba,0);
 const alpha=original.slice();alpha[3]=0;
 const result=comparePixelBuffers(original,alpha,2);assert.equal(result.changedRgb,0);
 assert.equal(result.changedRgba,1);assert.equal(result.maximumAlpha,255);
});
test('visual error is measured on the signal union instead of diluted by background',()=>{
 const original=Uint8Array.from([0,0,0,255,10,20,30,40]),actual=original.slice();actual[6]=36;
 const result=comparePixelBuffers(original,actual,2);assert.equal(result.unionPixels,1);
 assert.equal(result.above2,1);assert.equal(result.maximumRgb,6);assert.equal(result.meanAbsoluteRgbOnUnion,2);
 assert.deepEqual(result.bounds,{left:1,right:1,bottom:0,top:0});assert.equal(result.p95MaximumRgbOnUnion,6);
});
test('incomplete pixel buffers fail before comparison',()=>{
 assert.throws(()=>comparePixelBuffers(new Uint8Array(4),new Uint8Array(8),1));
 assert.throws(()=>comparePixelBuffers(new Uint8Array(3),new Uint8Array(3),1));
 assert.throws(()=>comparePixelBuffers(new Uint8Array(12),new Uint8Array(12),2));
 assert.throws(()=>comparePixelBuffers(new Uint8Array(4),new Uint8Array(4),0));
 assert.throws(()=>comparePixelBuffers(new Uint8Array(4),new Uint8Array(4),1,{backgroundRgb:[1]}));
});
test('white clear pixels do not dilute signal statistics and channel maxima remain separate',()=>{
 const original=Uint8Array.from([255,255,255,255,100,110,120,200]),actual=original.slice();actual[4]=103;actual[6]=125;
 const r=comparePixelBuffers(original,actual,2,{backgroundRgb:[255,255,255],regions:true});
 assert.equal(r.unionPixels,1);assert.equal(r.meanAbsoluteRgbOnUnion,8/3);
 assert.deepEqual(r.maximumChannels,[3,0,5,0]);assert.equal(r.errorRegions[4].pixels,1);
});
test('connected error areas join diagonals, keep separated islands and reject row wrapping',()=>{
 const r=connectedErrorRegions(Uint8Array.from([9,0,0,0,8,0,0,0,0,0,0,9]),4,4);
 assert.equal(r.pixels,3);assert.equal(r.components,2);assert.equal(r.largest[0].pixels,2);
 assert.deepEqual(r.largest[0].bounds,{left:0,right:0,bottom:0,top:1});
 const diagonal=connectedErrorRegions(Uint8Array.from([9,0,0,9]),2,4);assert.equal(diagonal.components,1);
 assert.throws(()=>connectedErrorRegions(new Uint8Array(3),2,4));
});
