import fs from 'node:fs';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';
const [video,out,step='0.25',from='0',to='999']=process.argv.slice(2);
const {chromium}=createRequire(import.meta.url)('C:/Users/Daniel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage({viewport:{width:360,height:640}});
fs.mkdirSync(out,{recursive:true});
await p.goto(pathToFileURL(video).href.replace(/[^/]+$/,'')+'blank.html');
await p.setContent(`<style>body{margin:0}video{width:360px;height:640px;display:block}</style><video id=v muted src="${pathToFileURL(video).href}"></video>`);
await p.waitForFunction(()=>document.getElementById('v').readyState>=1,{}, {timeout:30000});
const dur=await p.evaluate(()=>document.getElementById('v').duration);console.log('duration',dur);
for(let t=Number(from),i=0;t<Math.min(dur,Number(to));t+=Number(step),i++){
 await p.evaluate(async t=>{const v=document.getElementById('v');v.currentTime=t;await new Promise(r=>v.addEventListener('seeked',r,{once:true}));},t);
 await p.locator('#v').screenshot({path:`${out}/t${String(Math.round(t*100)).padStart(4,'0')}.jpg`,type:'jpeg',quality:75});}
await b.close();
