import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {createHash} from 'node:crypto';
const args=process.argv.slice(2),get=name=>args[args.indexOf(name)+1];
if(!args.includes('--clip'))throw Error('Usage: node tools/memorial/serve_live_clip.mjs --clip tools/data/.../clip.json [--port 3145]');
const file=path.resolve(get('--clip')),root=path.dirname(file),data=path.resolve('tools/data');
if(!file.startsWith(data+path.sep))throw Error('Research clip must remain in tools/data');
const clip=JSON.parse(fs.readFileSync(file,'utf8'));if(clip.approved!==false||clip.schemaVersion!==1)throw Error('Unpublished clip required');
const files=new Map([['/clip.json',file],['/',path.resolve('tools/memorial/preview_live_clip.html')]]);
for(const frame of clip.frames){for(const layer of frame.layers){
 if(!/^[\w-]+\.rgba$/.test(layer.file))throw Error('Unsafe asset path');const asset=path.join(root,layer.file);
 if(createHash('sha256').update(fs.readFileSync(asset)).digest('hex')!==layer.sha256)throw Error('Pixel layer hash differs');files.set('/'+layer.file,asset);
 }for(const bg of ['black','white']){const name=`f${frame.tick}-native-${bg}.png`;if(fs.existsSync(path.join(root,name)))files.set('/'+name,path.join(root,name));}}
const port=Number(args.includes('--port')?get('--port'):3145);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid port');
http.createServer((req,res)=>{const asset=files.get(new URL(req.url,'http://localhost').pathname);if(!asset){res.writeHead(404).end();return;}res.setHeader('Content-Type',asset.endsWith('.json')?'application/json':asset.endsWith('.rgba')?'application/octet-stream':asset.endsWith('.png')?'image/png':'text/html');fs.createReadStream(asset).pipe(res);}).listen(port,'127.0.0.1',()=>console.log(`Native pixel review: http://127.0.0.1:${port}/`));
