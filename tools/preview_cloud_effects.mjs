import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// Local-only diagnostic renderer. Never serves the whole asset dump.
const report = JSON.parse(fs.readFileSync('docs/research/cloud-skill-effects.json', 'utf8'));
const effects = report.skills.flatMap(s => s.effects).flatMap(group => group.members).filter(e => e.converted);
const output = 'tools/data/cloud-effects/previews';
fs.mkdirSync(output, { recursive: true });
const allowed = new Set(effects.flatMap(e => [e.converted.file, ...e.converted.resources.map(r => r.file)]));
const sdk = 'tools/bin/effekseer-webgl-1.80.7';
for (const file of ['effekseer.js', 'effekseer.wasm', 'Sample/three.min.js']) allowed.add(`${sdk}/${file}`);
const html = `<!doctype html><meta charset="utf-8"><title>Cloud effect diagnostics</title>
<style>body{background:#10182a;color:white;font:16px monospace}canvas{width:384px;height:384px}</style>
<h1>Cloud effect diagnostics</h1><p id="status">Loading renderer...</p><canvas id="preview" width="384" height="384"></canvas>
<script src="/${sdk}/Sample/three.min.js"></script><script src="/${sdk}/effekseer.js"></script>
<script>
const effects=${JSON.stringify(effects.map(e => ({ id: e.effectId, file: e.converted.file })))};
const status=document.getElementById('status');
const canvas=document.getElementById('preview');
const renderer=new THREE.WebGLRenderer({canvas,alpha:false,preserveDrawingBuffer:true});
renderer.setClearColor(0x182033,1);
const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-384,384,384,-384,0.1,5000);
camera.position.set(0,0,1000);camera.lookAt(new THREE.Vector3(0,0,0));camera.updateMatrixWorld();
const results=[];
const summary=document.createElement('canvas');summary.width=800;summary.height=effects.length*170;
const summaryContext=summary.getContext('2d');summaryContext.fillStyle='#182033';summaryContext.fillRect(0,0,summary.width,summary.height);
const save=async(name,body)=>{const r=await fetch('/output/'+name,{method:'POST',body});if(!r.ok)throw Error(await r.text());};
effekseer.initRuntime('/${sdk}/effekseer.wasm',async()=>{
 try{
  const context=effekseer.createContext();context.init(renderer.getContext());
  context.setProjectionMatrix(camera.projectionMatrix.elements);context.setCameraMatrix(camera.matrixWorldInverse.elements);
  for(const [row,item] of effects.entries()){
   status.textContent='Rendering '+item.id;
   let effect;const errors=[];
   await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('Effect load timed out')),20000);
    effect=context.loadEffect('/'+item.file,1,()=>{clearTimeout(timeout);resolve();},(message,url)=>{errors.push({message,url});clearTimeout(timeout);reject(Error(message+' '+url));});
   });
   const sheet=document.createElement('canvas');sheet.width=384*8;sheet.height=384*5;
   const ctx=sheet.getContext('2d');
   const handle=context.play(effect,0,0,0);handle.setRandomSeed(1);
   for(let i=0;i<40;i++){
    context.update(i===0?1:3);renderer.render(scene,camera);context.draw();renderer.resetState();
    ctx.drawImage(canvas,(i%8)*384,Math.floor(i/8)*384);
   }
   await save(item.id+'.png',await new Promise(resolve=>sheet.toBlob(resolve)));
   summaryContext.fillStyle='#ffffff';summaryContext.font='13px monospace';
   summaryContext.fillText(item.id+' - '+item.file.split('/').pop(),10,row*170+18);
   for(const [column,frame] of [2,5,10,16].entries()){
    summaryContext.drawImage(sheet,(frame%8)*384,Math.floor(frame/8)*384,384,384,column*200,row*170+24,146,146);
   }
   results.push({id:item.id,file:item.file,renderedFrames:40,frameStep:3,errors});
   context.stopAll();context.releaseEffect(effect);
   await new Promise(requestAnimationFrame);
  }
  status.textContent='Done: '+results.length+' effect contact sheets';
  await save('summary.png',await new Promise(resolve=>summary.toBlob(resolve)));
  await save('results.json',JSON.stringify({results}));
 }catch(error){status.textContent='ERROR: '+error.message;await save('results.json',JSON.stringify({results,error:String(error)}));}
},()=>{status.textContent='Runtime initialization failed';});
</script>`;
const mime = { '.js': 'text/javascript', '.wasm': 'application/wasm', '.png': 'image/png', '.efkefc': 'application/octet-stream' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:3101');
  if (req.method === 'POST' && /^\/output\/(?:\d+\.png|summary\.png|results\.json)$/.test(url.pathname)) {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 32 * 1024 * 1024) { res.writeHead(413).end(); return; }
      chunks.push(chunk);
    }
    const file = path.join(output, path.basename(url.pathname));
    fs.writeFileSync(file, Buffer.concat(chunks));
    console.log(`Saved ${file}`);
    res.end('OK');
    return;
  }
  if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end(html); return; }
  const file = decodeURIComponent(url.pathname.slice(1));
  if (!allowed.has(file) || !fs.existsSync(file)) { res.writeHead(404).end('Not available'); return; }
  res.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(3101, '127.0.0.1', () => console.log('Cloud effect diagnostics: http://127.0.0.1:3101/'));
