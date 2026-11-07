import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {moduleBody,servedBody,checkDevServer} from './check_dev_server.mjs';
const encoded=source=>'//# sourceMappingURL=data:application/json;base64,'+Buffer.from(JSON.stringify({sourcesContent:[source]})).toString('base64');
test('development freshness ignores Vite URL rewrites while preserving bindings and executable logic',()=>{
 const local="import {x} from './effects/one.mjs'; export {y} from './two.mjs'; export const damage=3;";
 const served='import {x} from "/src/effects/one.mjs?t=123"; export {y} from "/src/two.mjs"; export const damage=3;';
 assert.equal(moduleBody(local),servedBody(encoded(served)));
 assert.notEqual(moduleBody(local),servedBody(encoded(served.replace('damage=3','damage=4'))));
 assert.notEqual(moduleBody(local),servedBody(encoded(served.replace('{x}','{z}'))));
});
test('missing or ambiguous source maps cannot certify a current development server',()=>{
 assert.throws(()=>servedBody('export const current=true;'),/source map required/);
 const multiple='//# sourceMappingURL=data:application/json;base64,'+Buffer.from(JSON.stringify({sourcesContent:['a','b']})).toString('base64');
 assert.throws(()=>servedBody(multiple),/Single-source/);
});
test('freshness preflight detects a stale served placement implementation and reports the affected module',async()=>{
 const respond=stale=>async url=>{
  const file=new URL(url).pathname.slice(1);let source=fs.readFileSync(file,'utf8');
  if(stale&&file.endsWith('PreparedSceneBridge.mjs'))source=source.replaceAll('ffbe-screen-api','previous-preview');
  return {ok:true,text:async()=>encoded(source)};
 };
 assert.equal((await checkDevServer(undefined,respond(false))).passed,true);
 const report=await checkDevServer(undefined,respond(true));
 assert.equal(report.passed,false);assert.deepEqual(report.results.filter(r=>!r.matched).map(r=>r.file),['src/effects/PreparedSceneBridge.mjs']);
 await assert.rejects(checkDevServer('https://example.com'),/Loopback/);
});
