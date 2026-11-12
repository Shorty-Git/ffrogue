// Experiment helper: captures scenes with a modified copy of their published manifest (nothing is
// published) next to the unmodified capture, for a quick before/after look at a plan switch.
//   node tools/experiment_scene_variant.mjs --out <dir> --keys a,b --set withholdUntexturedParticles=false
import fs from 'node:fs';
import {captureScenes, boxScore, effectEnergy, writeFile, PRESENTATIONS} from './lib/scene-frames.mjs';
const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const out = arg('--out'), keys = arg('--keys').split(','), [field, value] = arg('--set').split('=');
const variant = key => { const manifest = JSON.parse(fs.readFileSync(`${PRESENTATIONS}/${key}/manifest.json`, 'utf8')); manifest.plan[field] = JSON.parse(value); return manifest; };
for (const [name, manifestFor] of [['before', undefined], ['after', variant]])
  await captureScenes(keys, result => {
    if (result.sheet) writeFile(`${out}/${result.key}.${name}.jpg`, result.sheet);
    console.log(name, result.key, JSON.stringify({score: boxScore(result).score, energy: Number(effectEnergy(result).toFixed(2)), errors: result.errors}));
  }, {manifestFor});
