// Admits original skill sounds for published Source presentations that carry common-bank cues
// (SE.acb) but no reviewed audio yet. Local only: needs the SE bank and vgmstream under tools/data.
//   node tools/admit_skill_audio.mjs [--python <python>] [--dry-run]
// Per presentation: every effect-group cue must be a native common-bank cue (bank class 1);
// cue IDs resolve to names via tools/read_acb_cues.py, names to vgmstream streams via
// tools/data/audio-vertical/se-streams.tsv (built by looping `vgmstream-cli -m -s N SE.acb`).
// Each cue is decoded once to public/assets/audio/combat/<name>.wav and pinned by SHA-256 in
// tools/presentations/source-audio-review.json together with the presentation's audio
// fingerprint; then the presentation is republished so admitSourceAudio sets playbackSupported.
// Frozen accepted manifests (test_scene_migration) are never touched.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {audioFingerprint} from './lib/admit-source-audio.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const python = arg('--python', process.env.FFROGUE_PYTHON ?? 'python'), dry = process.argv.includes('--dry-run');
const BANK = 'tools/data/memorial-audit/trace-clone-backup/assetpacks/on_demand_asset3/199/199/assets/SE.acb';
const VGM = 'tools/data/audio-vertical/decoder/vgmstream-cli.exe', STREAMS = 'tools/data/audio-vertical/se-streams.tsv';
const REVIEW = 'tools/presentations/source-audio-review.json';
const FROZEN = new Set(['cloud_brave_slash', 'cloud_blade_beam', 'cloud_climhazzard']);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha256 = data => createHash('sha256').update(data).digest('hex');

const review = read(REVIEW);
if (sha256(fs.readFileSync(BANK)) !== review.bankSha256) throw Error('Unexpected SE bank bytes');
const cues = JSON.parse(spawnSync(python, ['tools/read_acb_cues.py', BANK], {encoding: 'utf8', maxBuffer: 64 << 20}).stdout);
const cueName = new Map(cues.map(c => [c.cueId, c.name]));
const streamOf = new Map(fs.readFileSync(STREAMS, 'utf8').trim().split('\n').map(l => l.split('\t')).map(([i, n]) => [n.trim(), Number(i)]));
const recipes = fs.readdirSync('tools/presentations').filter(f => f.endsWith('.json') && f !== 'source-audio-review.json')
  .map(f => ({file: 'tools/presentations/' + f, data: read('tools/presentations/' + f)}));

const admitted = [], skipped = [];
for (const key of read('public/assets/content.json').scenePresentations) {
  if (FROZEN.has(key) || review.presentations[key]) continue;
  const manifest = read(`public/assets/presentations/${key}/manifest.json`), audio = manifest.audioSource;
  if (!audio?.events?.length || audio.playbackSupported) continue;
  const reason = audio.issues?.length ? 'audio issues: ' + audio.issues.join('; ')
    : audio.events.find(e => e.rawParameters.length > 1 || (e.rawParameters[0] !== undefined && e.rawParameters[0] !== '1')) ? 'non-common-bank cue'
    : audio.events.find(e => e.frame >= manifest.durationFrames) ? 'cue after scene end'
    : audio.events.map(e => cueName.get(e.sourceSoundId)).find(n => !n || !streamOf.has(n)) === undefined ? null : 'cue without decodable stream';
  if (reason) { skipped.push({key, reason}); continue; }
  for (const event of audio.events) {
    const name = cueName.get(event.sourceSoundId), stream = streamOf.get(name), out = `public/assets/audio/combat/${name}.wav`;
    if (!fs.existsSync(out) && !dry) {
      const result = spawnSync(VGM, ['-s', String(stream), '-o', out, BANK], {encoding: 'utf8'});
      if (result.status !== 0 || !fs.existsSync(out)) throw Error('vgmstream failed for ' + name);
    }
    if (!dry) review.cues['SE:' + event.sourceSoundId] ??= {file: name, stream, name, sha256: sha256(fs.readFileSync(out))};
  }
  review.presentations[key] = {sourceId: manifest.sourceId, sha256: audioFingerprint(audio),
    origin: 'Auto-admitted by tools/admit_skill_audio.mjs: native common-bank effect-group cues, decoded with vgmstream'};
  admitted.push(key);
}
if (!dry && admitted.length) {
  fs.writeFileSync(REVIEW, JSON.stringify(review, null, 2) + '\n');
  for (const key of admitted) {
    const recipe = recipes.find(r => r.data.bindings?.some(b => b.key === key));
    if (!recipe) { skipped.push({key, reason: 'no presentation recipe to republish'}); continue; }
    const result = spawnSync('node', ['tools/publish_scene_presentations.mjs', '--recipe', recipe.file, '--python', python], {encoding: 'utf8'});
    if (result.status !== 0) skipped.push({key, reason: 'republish failed: ' + (result.stderr.match(/Error: .*/)?.[0] ?? 'unknown')});
  }
}
if (!dry) {
  // Runtime cue registry: every reviewed Source cue the battle may play (src/audio/combatCues.ts merges it).
  const entries = Object.entries(review.cues).sort(([x], [y]) => Number(x.split(':')[1]) - Number(y.split(':')[1]))
    .map(([key, cue]) => `  '${key}': '${cue.file}',`).join('
');
  fs.writeFileSync('src/audio/skillCueRegistry.ts', '// Generated by tools/admit_skill_audio.mjs from tools/presentations/source-audio-review.json.
'
    + 'export const skillCueFiles = {
' + entries + '
} as const;
');
}
console.log(JSON.stringify({admitted, skipped}, null, 1));
