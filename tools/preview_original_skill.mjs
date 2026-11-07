import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import {previewHostView,validateEffectHostContext,effectHostMemberAnchor} from './original_effect_player.mjs';
import {checkDevServer} from './check_dev_server.mjs';
const args=process.argv.slice(2),value=n=>args[args.indexOf(n)+1];
const gameOrigin=args.includes('--game-origin')?value('--game-origin'):'http://127.0.0.1:3000';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(gameOrigin))throw Error('Explicit loopback game origin required');
if(!args.includes('--plan'))throw Error('Usage: node tools/preview_original_skill.mjs --plan tools/data/.../plan.json [--port 3113]');
const stage=path.resolve('tools/data'),plans=new Map(),allowed=new Map();
let connectedEffect=null;
if(args.includes('--connected-effect')){
 const file=path.resolve(value('--connected-effect'));if(!file.startsWith(stage+path.sep))throw Error('Connected export must remain under tools/data');
 const receipt=JSON.parse(fs.readFileSync(file,'utf8'));if(receipt.approved!==false||receipt.schemaVersion!==1)throw Error('Unpublished connected export required');
 for(const asset of Object.values(receipt.textures)){
  const texture=path.resolve(asset.path);if(!texture.startsWith(stage+path.sep)||createHash('sha256').update(fs.readFileSync(texture)).digest('hex')!==asset.sha256)throw Error('Connected source texture hash mismatch');
  asset.url='/connected-texture/'+asset.sha256+'.png';allowed.set(asset.url,texture);
 }
 connectedEffect=receipt;
 allowed.set('/connected-effect.json',file);
}
for(let i=0;i<args.length;i++)if(args[i]==='--plan'){
const file=path.resolve(args[i+1]);
if(!file.startsWith(stage+path.sep))throw Error('Plan must be inside tools/data');
const cfg=JSON.parse(fs.readFileSync(file,'utf8'));
cfg.replayIdentity={planFile:path.relative(process.cwd(),file).replaceAll('\\','/'),planSha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
 playerSha256:createHash('sha256').update(fs.readFileSync('src/effects/originalEffectPlayer.mjs')).digest('hex'),
 lifecycleSha256:createHash('sha256').update(fs.readFileSync('src/effects/nativeLifecycle.mjs')).digest('hex'),
 pageSha256:createHash('sha256').update(fs.readFileSync('tools/preview_original_skill.html')).digest('hex'),
 threeSha256:createHash('sha256').update(fs.readFileSync('tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js')).digest('hex')};
if(plans.has(String(cfg.sourceId)))throw Error('Duplicate skill identity');
for(const [url,asset] of Object.entries(cfg.files)) {
 const absolute=path.resolve(asset.path);
 if(!absolute.startsWith(process.cwd()+path.sep)||createHash('sha256').update(fs.readFileSync(absolute)).digest('hex')!==asset.sha256)throw Error('Stale research image');
 allowed.set(url,absolute);
}
delete cfg.files;
plans.set(String(cfg.sourceId),{cfg,output:path.dirname(file)});
}
const modules=new Map();function load(file){if(modules.has(file))return modules.get(file);const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:n=>n.endsWith('.json')?{default:JSON.parse(fs.readFileSync(path.resolve(path.dirname(file),n),'utf8'))}:load(`src/${n.replace('../','')}.ts`)});modules.set(file,exports);return exports;}
const {BATTLE_ARENAS}=load('src/data/battleArenas.ts'),{getBattleLayout,BATTLE_VIEW}=load('src/ui/battleLayout.ts');
let effectHostContext=null;
if(args.includes('--host-reference')){
 const file=path.resolve(value('--host-reference'));if(!file.startsWith(stage+path.sep))throw Error('Host reference must stay in research storage');
 effectHostContext=validateEffectHostContext(JSON.parse(fs.readFileSync(file,'utf8')));
}
let effectHostBindings=null;
if(args.includes('--host-bindings')){
 const file=path.resolve(value('--host-bindings'));if(!file.startsWith(stage+path.sep))throw Error('Host bindings must stay in research storage');
 if(!effectHostContext)throw Error('Host bindings require --host-reference');
 effectHostBindings=JSON.parse(fs.readFileSync(file,'utf8'));
 for(const {cfg}of plans.values())for(const member of cfg.members)effectHostMemberAnchor(effectHostContext,member,effectHostBindings);
}
let nativeHostAudit=null,nativeHostHash=null;
if(args.includes('--camera-reference')){
 const reference=path.resolve(value('--camera-reference'));
 if(!reference.startsWith(stage+path.sep))throw Error('Camera reference must stay in research storage');
 const bytes=fs.readFileSync(reference);nativeHostAudit=JSON.parse(bytes);nativeHostHash=createHash('sha256').update(bytes).digest('hex');
}
const hostViews=Object.fromEntries(['legacy','game',...(nativeHostAudit?['native-proportions']:[])].map(mode=>[mode,previewHostView(mode,BATTLE_VIEW,nativeHostAudit)]));
const defaultHostView=args.includes('--host-view')?value('--host-view'):'legacy';
if(!hostViews[defaultHostView])throw Error('Host view unavailable; native-proportions requires --camera-reference');
for(const {cfg}of plans.values()){
cfg.arenas=Object.fromEntries(Object.entries(BATTLE_ARENAS).map(([key,a])=>[key,{...a,layout:getBattleLayout(1000,1100,a),url:cfg.backgrounds[key]}]));
cfg.hostViews=hostViews;cfg.defaultHostView=defaultHostView;cfg.hostCameraReferenceSha256=nativeHostHash;
cfg.effectHostContext=effectHostContext;
cfg.effectHostBindings=effectHostBindings;
for(const arena of Object.values(cfg.arenas))arena.hostLayouts=Object.fromEntries(Object.entries(hostViews).map(([key,view])=>[key,key==='legacy'?arena.layout:getBattleLayout(view.width,view.height,arena)]));
cfg.previewSkills=[...plans].map(([id,p])=>({id,name:p.cfg.name}));
}
allowed.set('/three.js',path.resolve('tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js'));
allowed.set('/player.mjs',path.resolve('src/effects/originalEffectPlayer.mjs'));
allowed.set('/nativeLifecycle.mjs',path.resolve('src/effects/nativeLifecycle.mjs'));
allowed.set('/native-projection.html',path.resolve('tools/preview_native_projection.html'));
allowed.set('/host-compositor.html',path.resolve('tools/preview_effect_host.html'));
allowed.set('/bound-host.html',path.resolve('tools/preview_bound_effect_host.html'));
allowed.set('/connected-effect.html',path.resolve('tools/preview_connected_effect.html'));
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1');
 if(req.method==='GET'&&url.pathname==='/connected-effect.json'&&connectedEffect){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(connectedEffect));return;}
 const selected=plans.get(url.searchParams.get('skill')??plans.keys().next().value);
 if(!selected){res.writeHead(404).end('Unknown skill');return;}
 const {cfg,output}=selected;
 if(req.method==='GET'&&url.pathname==='/product-freshness'){
  if(req.headers.origin!==gameOrigin){res.writeHead(403).end();return;}
  const result=await checkDevServer(gameOrigin);
  res.setHeader('Content-Type','application/json');res.setHeader('Access-Control-Allow-Origin',gameOrigin);
  res.end(JSON.stringify(result));return;
 }
 if(req.method==='POST'&&url.pathname==='/product-review'){
  if(req.headers.origin!==gameOrigin){res.writeHead(403).end();return;}
  let body='';for await(const chunk of req){body+=chunk;if(body.length>32e6)throw Error('Product receipt too large');}
  const receipt=JSON.parse(body);if(receipt.passed!==true||!Array.isArray(receipt.results))throw Error('Expected completed product check');
  const folder=path.resolve('tools/data/visual-preservation/product-review');fs.mkdirSync(folder,{recursive:true});
  fs.writeFileSync(path.join(folder,'receipt.json'),JSON.stringify(receipt));
  res.setHeader('Access-Control-Allow-Origin',gameOrigin);res.end('saved');return;
 }
 if(req.method==='POST'&&url.pathname==='/capture-frame'){
  let body='';for await(const chunk of req){body+=chunk;if(body.length>16e6)throw Error('Frame capture too large');}
  const {receipt,png}=JSON.parse(body);
  if(receipt?.identity?.planSha256!==cfg.replayIdentity.planSha256||receipt.skill!==cfg.sourceId
   ||!Number.isInteger(receipt.frame)||receipt.frame<0||receipt.frame>cfg.endFrame||typeof png!=='string'||!png.startsWith('data:image/png;base64,'))throw Error('Invalid frame capture identity');
  const bytes=Buffer.from(png.slice('data:image/png;base64,'.length),'base64');
  if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Expected PNG');
  const sha256=createHash('sha256').update(bytes).digest('hex'),name=cfg.sourceId+'-f'+receipt.frame+'-'+sha256.slice(0,12),folder=path.join(output,'recovered-captures');
  fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,name+'.png'),bytes);
  fs.writeFileSync(path.join(folder,name+'.json'),JSON.stringify({...receipt,pngSha256:sha256},null,2));
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({saved:path.relative(process.cwd(),path.join(folder,name+'.png')).replaceAll('\\','/')}));return;
 }
 if(req.method==='POST'&&['/review-result','/host-review-result','/bound-host-review-result'].includes(url.pathname)) {
  let body='';for await(const chunk of req){body+=chunk;if(body.length>65536)throw Error('Result too large');}
  const result=JSON.parse(body),receipt=url.pathname==='/host-review-result'?'host-compositor-result.json':url.pathname==='/bound-host-review-result'?'bound-host-result.json':'browser-result.json';fs.writeFileSync(path.join(output,receipt),JSON.stringify(result,null,2));res.end('saved');return;
 }
 if(req.method!=='GET'){res.writeHead(405).end();return;}
 if(url.pathname==='/config.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(cfg));return;}
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end(fs.readFileSync('tools/preview_original_skill.html'));return;}
 const target=allowed.get(url.pathname);if(!target){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',target.endsWith('.json')?'application/json':target.endsWith('.html')?'text/html':target.endsWith('.js')||target.endsWith('.mjs')?'text/javascript':'image/png');fs.createReadStream(target).pipe(res);
}catch(e){res.writeHead(500).end(String(e));}});
const port=Number(args.includes('--port')?value('--port'):3113);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid port');
server.listen(port,'127.0.0.1',()=>console.log(`Original-data research preview: http://127.0.0.1:${port}/`));
