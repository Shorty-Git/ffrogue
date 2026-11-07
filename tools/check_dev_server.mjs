import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';

const hash=value=>createHash('sha256').update(value).digest('hex');
const modules=['src/scenes/BattleScene.ts','src/entities/UnitActor.ts','src/effects/PreparedSceneBridge.mjs',
 'src/effects/originalEffectPlayer.mjs','src/effects/sceneProfile.mjs','src/effects/previewRandomStreams.mjs',
 'src/effects/actionChoreography.mjs','src/effects/skillDamageTimeline.mjs','src/effects/sourceQuadColor.mjs','src/effects/enemyInstant.mjs','src/run/runState.mjs','src/run/runBalance.mjs','src/run/catalog.ts','src/run/GameFlow.ts','src/ui/RunUI.ts','src/scenes/BootScene.ts','src/scenes/PreloadScene.ts','src/main.ts','src/ui/designTokens.ts','src/ui/rpgPanel.ts','src/ui/rewardLayout.mjs',
 'src/entities/TargetDummy.ts','src/run/stageContent.mjs','src/run/trainingRun.ts','src/ui/ActionBanner.ts',
 'src/data/bodyAssets.mjs','src/scenes/bodyLoading.ts','src/stages/StageAnimation.ts','src/ui/SlotLever.ts','src/run/unitForms.mjs'];
export function moduleBody(source) {
 const file=ts.createSourceFile('module.ts',source.replaceAll('\r',''),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 const transform=ts.transform(file,[context=>root=>ts.visitNode(root,function visit(node){
  if(ts.isImportDeclaration(node))return ts.factory.updateImportDeclaration(node,node.modifiers,node.importClause,
    ts.factory.createStringLiteral(path.posix.basename(node.moduleSpecifier.text.split('?')[0]).replace(/\.(?:mjs|js|ts)$/,'')),node.attributes);
  if(ts.isExportDeclaration(node)&&node.moduleSpecifier)return ts.factory.updateExportDeclaration(node,node.modifiers,node.isTypeOnly,node.exportClause,
    ts.factory.createStringLiteral(path.posix.basename(node.moduleSpecifier.text.split('?')[0]).replace(/\.(?:mjs|js|ts)$/, '')),node.attributes);
  return ts.visitEachChild(node,visit,context);
 })]);
 try{return ts.createPrinter({removeComments:true,newLine:ts.NewLineKind.LineFeed}).printFile(transform.transformed[0]);}
 finally{transform.dispose();}
}
export function servedBody(response) {
 const match=response.match(/sourceMappingURL=data:application\/json[^,]*;base64,([A-Za-z0-9+/=]+)/);
 if(!match)throw Error('Vite source map required; this is not a checked development module');
 const map=JSON.parse(Buffer.from(match[1],'base64').toString('utf8'));
 if(map.sourcesContent?.length!==1||typeof map.sourcesContent[0]!=='string')throw Error('Single-source development map required');
 return moduleBody(map.sourcesContent[0]);
}
export async function checkDevServer(origin='http://127.0.0.1:3001',fetcher=fetch) {
 if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))throw Error('Loopback origin required');
 const results=[];
 for(const file of modules){
  const response=await fetcher(origin+'/'+file,{cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error(`Missing served module: ${file} (${response.status})`);
  const expected=hash(moduleBody(fs.readFileSync(file,'utf8'))),actual=hash(servedBody(await response.text()));
  results.push({file,expected,actual,matched:expected===actual});
 }
 return {schema:'development-module-freshness-v1',origin,passed:results.every(r=>r.matched),results,
  limits:['Checks served source logic, not already-cached browser module instances.',
   'Import URL prefixes/query/extension rewrites are normalized; basename and bindings retained.',
   'Browser manifest identity and frozen/corrected-frame checks remain separate.']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args=process.argv.slice(2),value=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
 const result=await checkDevServer(value('--origin','http://127.0.0.1:3001'));
 const output=value('--output');
 if(output){if(!path.resolve(output).startsWith(path.resolve('tools/data')+path.sep))throw Error('Ignored receipt directory required');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');}
 console.log(JSON.stringify({origin:result.origin,passed:result.passed,checked:result.results.length,differences:result.results.filter(r=>!r.matched)}));
 if(!result.passed)process.exitCode=1;
}
