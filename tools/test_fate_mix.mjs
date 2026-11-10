// Fate Engine sample mix (src/ui/fateEngine.ts FATE_GAIN): levels measured from the published WAVs.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {FATE_GAIN,FATE_SOUND,fateSoundUrl} from '../src/ui/fateEngine.ts';
/** Loudest 400 ms RMS window of a 16-bit PCM WAV, in dBFS. */
function loudest(path){
  const b=fs.readFileSync(path);let o=12,fmt,data;
  while(o<b.length){const id=b.toString('ascii',o,o+4),n=b.readUInt32LE(o+4);if(id==='fmt ')fmt={ch:b.readUInt16LE(o+10),sr:b.readUInt32LE(o+12),bits:b.readUInt16LE(o+22)};if(id==='data')data=b.subarray(o+8,o+8+n);o+=8+n+(n&1);}
  assert.equal(fmt.bits,16);const s=new Int16Array(data.buffer,data.byteOffset,data.length>>1),win=Math.floor(fmt.sr*.4)*fmt.ch;let best=0;
  for(let i=0;i+win<=s.length;i+=win>>2){let sum=0;for(let j=i;j<i+win;j++)sum+=s[j]*s[j];best=Math.max(best,Math.sqrt(sum/win)/32768);}
  return 20*Math.log10(best);
}
test('rarer reels land louder, the NV awaken cue no longer tops the tier cues, verdict is audible',()=>{
  const level=key=>loudest('public/'+fateSoundUrl(FATE_SOUND[key]))+20*Math.log10(FATE_GAIN[key]);
  const tiers=['bronze','silver','gold','rainbow','prism','nv'].map(level);
  for(let i=1;i<tiers.length;i++)assert.ok(tiers[i]>=tiers[i-1]-.5,`tier ${i} not quieter than ${i-1}: ${tiers.map(v=>v.toFixed(1))}`);
  assert.ok(level('awaken')<=level('nv'),'limit-open sits under the NV cue');
  assert.ok(level('verdict')>=level('bronze'),'verdict above the quietest tier');
  assert.ok(level('slide')<=level('gold')+.5);
});
