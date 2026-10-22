import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readJson, assertKey, inspectEffect } from './lib/character-pipeline.mjs';

// Bake a reviewed single effect; composite skills need their own reviewed recipe/executor.
const args = process.argv.slice(2);
const value = flag => args[args.indexOf(flag) + 1];
if (args.includes('--help') || !args.includes('--recipe')) {
  console.log('Usage: node tools/export_effect.mjs --recipe tools/effects/brave_slash.json [--assets assets] [--port 3102]');
  process.exit(args.includes('--help') ? 0 : 1);
}
const recipe = readJson(value('--recipe'));
assertKey(recipe.key);
if (recipe.schemaVersion !== 1 || !recipe.review?.approved || recipe.blend !== 'ADD') throw Error('Only reviewed version 1 ADD recipes can be baked');
for (const key of ['frameWidth', 'frameHeight', 'frameCount', 'columns', 'frameRate', 'cameraWidth', 'scale']) {
  if (!Number.isFinite(recipe[key]) || recipe[key] <= 0) throw Error(`Invalid bake setting: ${key}`);
}
if (recipe.frameRate !== 60) throw Error('Source effect simulation currently requires 60 FPS');
if (![recipe.frameWidth, recipe.frameHeight, recipe.frameCount, recipe.columns].every(Number.isInteger)) throw Error('Sheet geometry must use integer values');
if (recipe.frameWidth * recipe.columns > 8192 || recipe.frameHeight * Math.ceil(recipe.frameCount / recipe.columns) > 8192) throw Error('Sheet exceeds 8192px texture budget');
const assets = args.includes('--assets') ? value('--assets') : 'assets';
const source = path.join(assets, recipe.source).replaceAll('\\', '/');
const inspected = inspectEffect(source, assets);
if (!inspected.exists || inspected.resources.some(r => !r.exists)) throw Error('Effect or dependency missing');
const sdk = 'tools/bin/effekseer-webgl-1.80.7';
const rawUrl = file => '/raw/' + path.relative(path.resolve(assets), path.resolve(file)).replaceAll('\\', '/');
const allowed = new Map([source, ...inspected.resources.map(r => r.file)].map(file => [rawUrl(file), file]));
for (const name of ['effekseer.js', 'effekseer.wasm', 'Sample/three.min.js']) {
  const file = `${sdk}/${name}`;
  if (!fs.existsSync(file)) throw Error(`Missing local SDK file: ${file}`);
  allowed.set('/' + file, file);
}
const out = `public/assets/effects/${recipe.key}`;
fs.mkdirSync(out, { recursive: true });
const meta = { file: 'impact.png', frameWidth: recipe.frameWidth, frameHeight: recipe.frameHeight, frameCount: recipe.frameCount,
  frameRate: recipe.frameRate, originX: recipe.originX, originY: recipe.originY, scale: recipe.scale, blend: recipe.blend,
  source, masterSource: recipe.masterFile, effectId: recipe.effectId,
  sourceSha256: createHash('sha256').update(fs.readFileSync(source)).digest('hex'),
  recipeSha256: createHash('sha256').update(fs.readFileSync(value('--recipe'))).digest('hex'),
  resources: inspected.resources.map(r => ({ file: r.file, sha256: r.sha256 })),
  note: 'Converted ExviusReborn effect; orthographic bake, not verified against original FFBE playback.' };
const html = `<!doctype html><meta charset="utf-8"><title>Effect export: ${recipe.key}</title>
<p id="status">Rendering ${recipe.key}...</p><canvas id="preview" width="${recipe.frameWidth}" height="${recipe.frameHeight}"></canvas>
<script src="/${sdk}/Sample/three.min.js"></script><script src="/${sdk}/effekseer.js"></script><script>
const canvas=document.querySelector('canvas');
const renderer=new THREE.WebGLRenderer({canvas,alpha:false,preserveDrawingBuffer:true});
renderer.setClearColor(0,1);
const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-${recipe.cameraWidth / 2},${recipe.cameraWidth / 2},${recipe.cameraWidth * recipe.frameHeight / recipe.frameWidth / 2},-${recipe.cameraWidth * recipe.frameHeight / recipe.frameWidth / 2},0.1,5000);
camera.position.set(0,0,1000);camera.lookAt(new THREE.Vector3());camera.updateMatrixWorld();
effekseer.initRuntime('/${sdk}/effekseer.wasm',async()=>{
try {
 const context=effekseer.createContext();context.init(renderer.getContext());
 context.setProjectionMatrix(camera.projectionMatrix.elements);context.setCameraMatrix(camera.matrixWorldInverse.elements);
 let effect;await new Promise((resolve,reject)=>{effect=context.loadEffect('${rawUrl(source)}',1,resolve,(m,u)=>reject(Error(m+' '+u)));});
 const sheet=document.createElement('canvas');sheet.width=${recipe.frameWidth * recipe.columns};sheet.height=${recipe.frameHeight * Math.ceil(recipe.frameCount / recipe.columns)};
 const ctx=sheet.getContext('2d');const handle=context.play(effect,0,0,0);handle.setRandomSeed(1);
 for(let i=0;i<${recipe.frameCount};i++) {context.update(1);renderer.render(scene,camera);context.draw();renderer.resetState();ctx.drawImage(canvas,i%${recipe.columns}*${recipe.frameWidth},Math.floor(i/${recipe.columns})*${recipe.frameHeight});}
 const response=await fetch('/export',{method:'POST',body:await new Promise(resolve=>sheet.toBlob(resolve))});
 if(!response.ok) throw Error(await response.text());
 context.stopAll();context.releaseEffect(effect);document.querySelector('#status').textContent='Export complete: ${recipe.frameCount} frames at ${recipe.frameRate} FPS';
} catch(error) {document.querySelector('#status').textContent='ERROR: '+error.message;}
},()=>document.querySelector('#status').textContent='ERROR: SDK initialization failed');
</script>`;
http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/export') {
    const chunks = []; let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > 16e6) { res.writeHead(413).end(); return; } chunks.push(chunk); }
    const png = Buffer.concat(chunks);
    if (png.length < 24 || png.toString('hex', 0, 8) !== '89504e470d0a1a0a' || png.readUInt32BE(16) !== recipe.frameWidth * recipe.columns
      || png.readUInt32BE(20) !== recipe.frameHeight * Math.ceil(recipe.frameCount / recipe.columns)) {
      res.writeHead(400).end('Invalid PNG sheet'); return;
    }
    meta.sheetSha256 = createHash('sha256').update(png).digest('hex');
    fs.writeFileSync(`${out}/impact.png`, png);
    fs.writeFileSync(`${out}/manifest.json`, JSON.stringify(meta, null, 2) + '\n');
    console.log(`Exported ${out}`); res.end('OK'); return;
  }
  if (req.url === '/') { res.setHeader('Content-Type', 'text/html'); res.end(html); return; }
  const file = allowed.get(decodeURIComponent(req.url ?? ''));
  if (!file) { res.writeHead(404).end(); return; }
  const mime = { '.js': 'text/javascript', '.wasm': 'application/wasm', '.png': 'image/png' };
  res.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(Number(args.includes('--port') ? value('--port') : 3102), '127.0.0.1', function () {
  console.log(`Open http://127.0.0.1:${this.address().port}/ to export ${recipe.key}`);
});
