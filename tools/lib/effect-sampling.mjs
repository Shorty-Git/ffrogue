import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {sheetSampling} from './sheetSampling.ts';
export {sheetSampling};
export const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export function packEffectSheet(input,output,recipe,python) {
  const {gutter}=sheetSampling(recipe.sampling);
  if(!gutter)throw Error('Packing requires explicit sampling gutters');
  const run=spawnSync(python,['tools/pack_effect_sheet.py','--input',input,'--output',output,
    '--width',String(recipe.frameWidth),'--height',String(recipe.frameHeight),'--count',String(recipe.frameCount),
    '--columns',String(recipe.columns),'--gutter',String(gutter)],{encoding:'utf8'});
  if(run.error||run.status!==0)throw Error(run.error?.message??run.stderr);
  return {...JSON.parse(run.stdout),packerSha256:hash('tools/pack_effect_sheet.py'),
    note:'Frame pixels preserved; extruded gutters support reviewed display sampling, not original FFBE sampler certification'};
}
export function repackPublishedEffect(recipeFile,python) {
  const read=file=>JSON.parse(fs.readFileSync(file,'utf8')),recipe=read(recipeFile);
  if(!/^[a-z][a-z0-9_]*$/.test(recipe.key)||!recipe.review?.approved||!recipe.review?.samplingAdaptation)
    throw Error('Reviewed effect sampling adaptation required');
  sheetSampling(recipe.sampling);
  const folder='public/assets/effects/'+recipe.key,file=folder+'/manifest.json',manifest=read(file),sheet=folder+'/'+manifest.file;
  if(manifest.sampling||hash(sheet)!==manifest.sheetSha256||hash('assets/'+recipe.source)!==manifest.sourceSha256
    ||manifest.resources.some(r=>hash(r.file)!==r.sha256))throw Error('Expected an unchanged unpadded published source');
  for(const key of ['frameWidth','frameHeight','frameCount','frameRate','originX','originY','scale','blend','contentBounds'])
    if(JSON.stringify(manifest[key])!==JSON.stringify(recipe[key]))throw Error('Non-sampling setting changed: '+key);
  if((manifest.artworkRotationDegrees??0)!==(recipe.artworkRotationDegrees??0)||(manifest.artworkPivot??'origin')!==(recipe.artworkPivot??'origin'))
    throw Error('Artwork change is outside repacking');
  const backup='tools/data/effect-sampling/'+recipe.key+'-before.png';fs.mkdirSync(path.dirname(backup),{recursive:true});
  if(fs.existsSync(backup)&&hash(backup)!==manifest.sheetSha256)throw Error('Existing source backup differs');
  fs.copyFileSync(sheet,backup);
  const receipt=packEffectSheet(backup,sheet,recipe,python);
  Object.assign(manifest,{sampling:recipe.sampling,samplingProvenance:{inputSheetSha256:hash(backup),...receipt},
    recipeSha256:hash(recipeFile),sheetSha256:hash(sheet)});
  fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n');return {key:recipe.key,...receipt};
}
