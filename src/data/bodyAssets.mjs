/** Prepared body admission. No source parsing, eviction or animation retiming. */
export function bodyAssets(manifests, requests, forms=[]) {
 const assets=new Map();
 for(const {key,clips} of requests){
  const m=manifests[key];if(!m)throw Error('Unknown prepared body: '+key);
  const root=forms.find(f=>f.key===key)?.assetPath??`assets/${m.type==='monster'?'monsters':'units'}/${key}`;
  for(const clip of clips){const meta=m.animations[clip];if(!meta)throw Error(`Missing prepared clip: ${key}/${clip}`);
   const texture=`${m.assetKey??key}_${clip}`;assets.set(texture,{texture,url:`${root}/${meta.file}`,meta});
  }
 }
 return [...assets.values()];
}
export function heroBodyClips(manifest, skills, attackClip='atk') {
 const required=['idle','move','dying','dead',attackClip];
 const optional=['win_before','win','standby','magic_standby','magic_atk'];
 for(const skill of skills.filter(s=>s.importStatus==='imported')){
  if(!skill.actionChoreography)throw Error('Reviewed body choreography required: '+skill.id);
  required.push(...(skill.actionChoreography.body.phases??[]).map(p=>p.clip));
 }
 for(const clip of required)if(!manifest.animations[clip])throw Error('Required body clip unavailable: '+clip);
 return [...new Set([...required,...optional.filter(c=>manifest.animations[c])])];
}
