// The FFBE battle-end fanfare is published with loop points inside the decoded file and plays on a won run.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('la009 fanfare covers its loop and is requested on the won result screen', () => {
  const wav = fs.readFileSync('public/assets/audio/la009_battleend.wav');
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  const channels = wav.readUInt16LE(22), rate = wav.readUInt32LE(24), bits = wav.readUInt16LE(34);
  const dataAt = wav.indexOf('data', 12), samples = wav.readUInt32LE(dataAt + 4) / (channels * bits / 8);
  assert.equal(rate, 44100);
  assert.ok(samples >= 829072, `decoded ${samples} samples must reach loop end 829072`);
  const music = fs.readFileSync('src/audio/battleMusic.ts', 'utf8');
  assert.match(music, /\[400009, \{ url: 'assets\/audio\/la009_battleend\.wav', loopStart: 167696 \/ 44100, loopEnd: 829072 \/ 44100 \}\]/);
  assert.match(fs.readFileSync('src/run/GameFlow.ts', 'utf8'), /setMusic\(this\.state\?\.phase==='won'\?VICTORY_FANFARE_RESOURCE:null/);
});
