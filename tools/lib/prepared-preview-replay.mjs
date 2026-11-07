// Replay an existing converted preview without re-inspecting master data or rebaking it.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');

export function convertedReplay(planFile) {
  const root=process.cwd(),file=path.resolve(planFile),stage=path.resolve('tools/data');
  if(!file.startsWith(stage+path.sep))throw Error('Preserved plan must stay inside tools/data');
  const config=JSON.parse(fs.readFileSync(file,'utf8')),allowed=new Map();
  if(config.approved!==false||!Array.isArray(config.effects)||!config.actor||!config.rat||!config.arenas)
    throw Error('An explicit preserved converted research plan is required');
  const allow=(url,input,sha)=>{
    const absolute=path.resolve(input);
    if(!absolute.startsWith(root+path.sep)||!fs.statSync(absolute).isFile()||sha&&hash(absolute)!==sha)
      throw Error('Missing, stale or external replay resource: '+input);
    allowed.set(url,absolute);
  };
  for(const member of config.effects)for(const asset of [member.asset,...member.asset.resources])
    allow('/raw/'+path.relative('assets',asset.file).replaceAll('\\','/'),asset.file,asset.sha256);
  for(const url of [config.actor.bodyUrl,config.actor.idleUrl,config.rat.url,...Object.values(config.arenas).map(a=>a.url)]){
    if(!url.startsWith('/prepared/')||url.includes('..'))throw Error('Unexpected preserved image URL');
    allow(url,'public/assets/'+url.slice('/prepared/'.length));
  }
  for(const name of ['effekseer.js','effekseer.wasm','Sample/three.min.js'])
    allow('/sdk/'+name,'tools/bin/effekseer-webgl-1.80.7/'+name);
  const identity={plan:planFile,planSha256:hash(file),pageSha256:hash('tools/preview_skill.html'),
    resourceHashes:Object.fromEntries([...allowed].map(([url,file])=>[url,hash(file)])),
    boundary:'Prepared converted replay; no master database, original extraction, publication or fidelity approval'};
  return {config,allowed,identity};
}

export function serveConvertedReplay(planFile,output,port) {
  const replay=convertedReplay(planFile),folder=path.resolve(output);
  if(!folder.startsWith(path.resolve('tools/data')+path.sep)||folder===path.dirname(path.resolve(planFile)))
    throw Error('Use a separate ignored output folder, never the preserved source directory');
  if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local port');
  fs.mkdirSync(folder,{recursive:true});
  fs.writeFileSync(path.join(folder,'replay-identity.json'),JSON.stringify(replay.identity,null,2));
  const server=http.createServer(async(req,res)=>{try{
    const url=new URL(req.url,'http://127.0.0.1');
    if(req.method==='POST'&&/^\/output\/[a-z0-9_-]+\.(json|png)$/.test(url.pathname)){
      const chunks=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>32e6)throw Error('Replay output too large');chunks.push(chunk);}
      const data=Buffer.concat(chunks),name=url.pathname.slice('/output/'.length);
      if(name.endsWith('.json'))JSON.parse(data.toString());
      else if(data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Expected PNG capture');
      fs.writeFileSync(path.join(folder,name),data);res.end('saved');return;
    }
    if(req.method!=='GET'){res.writeHead(405).end();return;}
    if(url.pathname==='/config.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(replay.config));return;}
    if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end(fs.readFileSync('tools/preview_skill.html'));return;}
    const file=replay.allowed.get(decodeURIComponent(url.pathname));
    if(!file){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',({'.js':'text/javascript','.wasm':'application/wasm','.png':'image/png','.jpg':'image/jpeg'})[path.extname(file)]??'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  }catch(error){res.writeHead(500).end(String(error));}});
  server.listen(port,'127.0.0.1',()=>console.log(`Preserved ${replay.config.name} replay: http://127.0.0.1:${port}/`));
  return server;
}
