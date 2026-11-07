import {repackPublishedEffect} from './lib/effect-sampling.mjs';
const args=process.argv.slice(2),get=key=>args.includes(key)?args[args.indexOf(key)+1]:undefined;
if(!get('--recipe'))throw Error('Usage: node tools/repack_effect_sampling.mjs --recipe tools/effects/key.json --python python.exe');
console.log(JSON.stringify(repackPublishedEffect(get('--recipe'),get('--python')??process.env.FFROGUE_PYTHON??'python')));
