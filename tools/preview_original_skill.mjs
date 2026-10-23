import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
const args=process.argv.slice(2),value=n=>args[args.indexOf(n)+1];
if(!args.includes('--plan'))throw Error('Usage: node tools/preview_original_skill.mjs --plan tools/data/.../plan.json [--port 3113]');
const stage=path.resolve('tools/data'),plans=new Map(),allowed=new Map();
for(let i=0;i<args.length;i++)if(args[i]==='--plan'){
const file=path.resolve(args[i+1]);
if(!file.startsWith(stage+path.sep))throw Error('Plan must be inside tools/data');
const cfg=JSON.parse(fs.readFileSync(file,'utf8'));
if(plans.has(String(cfg.sourceId)))throw Error('Duplicate skill identity');
for(const [url,asset] of Object.entries(cfg.files)) {
 const absolute=path.resolve(asset.path);
 if(!absolute.startsWith(process.cwd()+path.sep)||createHash('sha256').update(fs.readFileSync(absolute)).digest('hex')!==asset.sha256)throw Error('Stale research image');
 allowed.set(url,absolute);
}
delete cfg.files;
plans.set(String(cfg.sourceId),{cfg,output:path.dirname(file)});
}
const modules=new Map();function load(file){if(modules.has(file))return modules.get(file);const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:n=>load(`src/${n.replace('../','')}.ts`)});modules.set(file,exports);return exports;}
const {BATTLE_ARENAS}=load('src/data/battleArenas.ts'),{getBattleLayout}=load('src/ui/battleLayout.ts');
for(const {cfg}of plans.values()){
cfg.arenas=Object.fromEntries(Object.entries(BATTLE_ARENAS).map(([key,a])=>[key,{...a,layout:getBattleLayout(1000,1100,a),url:cfg.backgrounds[key]}]));
cfg.previewSkills=[...plans].map(([id,p])=>({id,name:p.cfg.name}));
}
allowed.set('/three.js',path.resolve('tools/bin/effekseer-webgl-1.80.7/Sample/three.min.js'));
allowed.set('/player.mjs',path.resolve('tools/original_effect_player.mjs'));
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1');
 const selected=plans.get(url.searchParams.get('skill')??plans.keys().next().value);
 if(!selected){res.writeHead(404).end('Unknown skill');return;}
 const {cfg,output}=selected;
 if(req.method==='POST'&&url.pathname==='/review-result') {
  let body='';for await(const chunk of req){body+=chunk;if(body.length>65536)throw Error('Result too large');}
  const result=JSON.parse(body);fs.writeFileSync(path.join(output,'browser-result.json'),JSON.stringify(result,null,2));res.end('saved');return;
 }
 if(req.method!=='GET'){res.writeHead(405).end();return;}
 if(url.pathname==='/config.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(cfg));return;}
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end(fs.readFileSync('tools/preview_original_skill.html'));return;}
 const target=allowed.get(url.pathname);if(!target){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',target.endsWith('.js')||target.endsWith('.mjs')?'text/javascript':'image/png');fs.createReadStream(target).pipe(res);
}catch(e){res.writeHead(500).end(String(e));}});
const port=Number(args.includes('--port')?value('--port'):3113);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid port');
server.listen(port,'127.0.0.1',()=>console.log(`Original-data research preview: http://127.0.0.1:${port}/`));
