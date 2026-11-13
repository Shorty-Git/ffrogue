// Rewrites the identity pins in tools/test_scene_migration.mjs after a reviewed player change:
// the player file hash and the visual hashes of the three accepted Cloud manifests (their only change
// after a re-baseline is provenance.playerSha256). Run it only after `rebaseline_scenes.mjs compare`
// shows these three scenes unchanged or ok; it prints what it changed.
//   node tools/update_scene_pins.mjs
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const file = 'tools/test_scene_migration.mjs', sha = data => createHash('sha256').update(data).digest('hex');
let text = fs.readFileSync(file, 'utf8');
const pins = {'src/effects/originalEffectPlayer.mjs': sha(fs.readFileSync('src/effects/originalEffectPlayer.mjs'))};
for (const key of ['cloud_brave_slash', 'cloud_blade_beam', 'cloud_climhazzard']) {
  const manifest = JSON.parse(fs.readFileSync(`public/assets/presentations/${key}/manifest.json`, 'utf8'));
  delete manifest.audioSource;
  pins[`public/assets/presentations/${key}/manifest.json`] = sha(JSON.stringify(manifest));
}
for (const [path, hash] of Object.entries(pins)) {
  const pattern = new RegExp(`('${path.replace(/[.\/]/g, '\\$&')}':')[a-f0-9]{64}(')`);
  if (!pattern.test(text)) throw Error('Pin not found: ' + path);
  const before = text.match(pattern)[0];
  text = text.replace(pattern, `$1${hash}$2`);
  console.log(before.includes(hash) ? 'unchanged' : 'updated  ', path, hash.slice(0, 12));
}
fs.writeFileSync(file, text);
