// Actual production Source commands, isolated Chrome, existing authored review page.
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const args=process.argv.slice(2),arg=(k,f)=>args.includes(k)?args[args.indexOf(k)+1]:f;
const {chromium}=createRequire(import.meta.url)(arg('--playwright','playwright'));
const output=arg('--output','tools/data/stage-loading-20261102/source'),sink=arg('--capture-origin','http://127.0.0.1:3163');
await fs.mkdir(output,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});
const summary=[];
try{for(const reserve of [null,'cloud_of_darkness','cloud_ac','delita','jack'].filter(r=>!arg('--only')||arg('--only').split(',').includes(r??'default'))){
 const page=await browser.newPage({viewport:{width:1300,height:900}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const query=new URLSearchParams({captureOrigin:sink});if(reserve){query.set('reserve',reserve);query.set('reviewUnit',reserve);}
 await page.goto('http://127.0.0.1:3001/tools/test-source-scene.html?'+query);
 await page.locator('#run:not([disabled])').waitFor({timeout:90000});
 async function check(id,name){await page.locator('#report').evaluate(e=>e.textContent='RUNNING');await page.locator('#'+id).click();
  await page.waitForFunction(()=>/^(PASS|FAIL)/.test(document.querySelector('#report').textContent),{},{timeout:180000});
  const report=await page.locator('#report').textContent();if(!report.startsWith('PASS'))throw Error(report);
  await fs.copyFile('tools/data/visual-preservation/product-review/receipt.json',output+'/'+name+'.json');console.log('PASS',name);
 }
 await check('run',reserve??'default');if(!reserve)await check('baseline','cloud-baselines');
 if(errors.length)throw Error(errors.join(';'));summary.push({reserve,passed:true,errors});await page.close();
 }await fs.writeFile(output+'/summary.json',JSON.stringify(summary,null,2));}finally{await browser.close();}
